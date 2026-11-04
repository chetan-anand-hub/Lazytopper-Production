import { isFirestoreEnabled, withFirestore } from "./firestoreSdk";

export type SubscriptionTier = "free" | "trial" | "premium";

export type SubscriptionPlan =
  | "none"
  | "trial_7day"
  | "premium_monthly"
  | "premium_yearly"
  /** STORED-RATE-1 — a paid pass, written only by the server (passGrant.cjs). */
  | "pass_month"
  | "pass_till_boards"
  /**
   * ADMIN-EXTEND-1 — a free admin extension (e.g. the feedback-call reward) on an account
   * that held no pass. Written only by the server (premiumExtension.cjs); it carries a
   * server-written `passEnd`, so `applyPassExpiry` ends it exactly like a paid pass.
   */
  | "pass_extension";

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  plan: SubscriptionPlan;
  /**
   * The trial START. Authoritatively a SERVER timestamp: firestore.rules pins it to
   * `request.time` on first set and refuses to let it move afterwards, so a client
   * cannot choose it. Normalised to ISO on read so the in-memory shape stays a string.
   */
  trialStartDate: string | null;
  /**
   * @deprecated FORGEABLE — never read, never written. This was the whole defect:
   * a client-supplied ISO string that `applyExpiry` trusted, which let a student write
   * `{tier:"trial", trialEndDate:"3000-01-01"}` and hold a permanent, premium-equivalent
   * trial. The trial END is now DERIVED (start + TRIAL_DAYS) and never stored. The field
   * survives on the type only so pre-existing callers still compile; reading it anywhere
   * re-opens the hole.
   */
  trialEndDate: string | null;
  premiumSince: string | null;
  /**
   * STORED-RATE-1 R5 — when a PAID PASS ends (ISO). Written ONLY by the server through
   * the Admin SDK (firestore.rules refuse every client write of it). A premium status
   * whose passEnd is at or before now is FREE; a premium status with NO passEnd is a
   * legacy owner-granted premium and stays premium. Optional so the many call sites
   * that build a status literal need not name it.
   */
  passEnd?: string | null;
  /**
   * PRICING-1 — the STICKY founding-rate flag, written only by the server's grant. DISPLAY ONLY:
   * it picks which price a label quotes; the server decides what is charged. Present only when
   * true, so every status literal and equality check that predates it is unchanged. Never
   * written back (saveCloud builds its own payload).
   */
  foundingMember?: boolean;
}

const STORAGE_KEY = "lazytopper.subscription.v1";

/**
 * The trial DURATION, single-sourced here.
 *
 * Deliberately NOT moved to `src/config/pricing.ts`: that module is the pricing
 * *display* surface (rupee amounts, labels, JSON-LD strings) and is pinned by
 * `pricing.guard.test.ts`. The trial length is an entitlement constant, not a price,
 * and it belongs beside the only code that derives an expiry from it. Its security
 * property is simply that it is a CONSTANT IN CODE rather than a stored, writable field.
 */
export const TRIAL_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_MS = TRIAL_DAYS * DAY_MS;
const FIRESTORE_COLLECTION = "subscriptions";

/**
 * What a cloud read actually told us. The old code returned `null` for BOTH "there is
 * no document" and "the read threw", and collapsing those is what let a forged
 * localStorage entitlement survive: the two cases need opposite responses.
 */
type CloudResult =
  | {
      kind: "found";
      data: SubscriptionStatus;
      /**
       * True only when the stored `trialStartDate` arrived as a Firestore Timestamp —
       * the shape a SERVER write produces. firestore.rules pins that field to
       * `request.time`, so a Timestamp in this document is server-set by construction.
       * A plain ISO *string* is the shape a client could have written (and is what a
       * legacy pre-SEC-2 document carries), so it never counts as proof.
       *
       * ★ This flag is the whole security boundary of the repair below. It is
       * deliberately NOT part of `SubscriptionStatus`: the cached copy is client-side
       * and must never be able to assert it.
       */
      startIsServerPinned: boolean;
    }
  | { kind: "absent" }
  | { kind: "error" };

function defaultStatus(): SubscriptionStatus {
  return { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null };
}

/** Firestore Timestamp | ISO string | {seconds} -> ISO string. */
function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const candidate = value as { toDate?: () => Date; seconds?: number };
    if (typeof candidate.toDate === "function") {
      const asDate = candidate.toDate();
      const ms = asDate instanceof Date ? asDate.getTime() : NaN;
      return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
    }
    if (typeof candidate.seconds === "number" && Number.isFinite(candidate.seconds)) {
      return new Date(candidate.seconds * 1000).toISOString();
    }
  }
  return null;
}

/** Is this raw Firestore value a Timestamp, i.e. server-written? */
function isFirestoreTimestamp(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { toDate?: unknown; seconds?: unknown };
  return typeof candidate.toDate === "function" || typeof candidate.seconds === "number";
}

/**
 * How far AHEAD of the device clock a server-pinned start may sit and still be believed.
 *
 * ★ P0-TRIAL — this is the second, quieter half of the activation defect. The start is
 * `request.time` from Google's clock; the device's clock is whatever the phone says. A
 * server start is ROUTINELY a few hundred ms ahead of the device, and on a handset with
 * no time sync it can be minutes. Rejecting every future start therefore downgraded a
 * live trial for exactly the students whose clocks drift — never on the owner's desktop,
 * which is why it went unseen.
 */
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * TRIAL-CLOCK-1 — how far AHEAD of the device clock a SERVER-PINNED start may sit and still
 * be read as "the trial began just now on this device's clock".
 *
 * ★ THE DEFECT (live, 3 Nov 2026). A student whose phone clock ran about a day slow signed up,
 * got a real server-pinned start (`request.time`), and on day 1 this module read that start
 * as "in the future" (beyond CLOCK_SKEW_TOLERANCE_MS), failed it closed to FREE, showed the
 * trial-ended screen, locked every client Premium gate — and hydration wrote `tier:"free"`
 * back to Firestore. The server (entitlement.cjs deriveEffectiveTier) still said
 * "Trial · 7 days left".
 *
 * ★ WHY THIS IS NOT A GRANT. It applies ONLY to a start that arrived from the CLOUD as a
 * Firestore Timestamp (`startIsServerPinned`) — firestore.rules pin that field to
 * `request.time` and refuse to move it, so a client cannot choose its value. The start is
 * CLAMPED to the device's now, never trusted forward, so the window this client derives can
 * run at most this many ms past the server's own end, and only for a device whose clock is
 * set back. Server-metered features are decided by the server either way. Beyond the bound
 * the start is unprovable and fails closed exactly as before.
 *
 * The local cache and any client-shaped (ISO string) start keep CLOCK_SKEW_TOLERANCE_MS,
 * unchanged.
 */
const SERVER_PINNED_AHEAD_LIMIT_MS = 2 * DAY_MS;

interface StartOptions {
  /** True only for a start read from the cloud as a Firestore Timestamp. Never from the cache. */
  serverPinned?: boolean;
}

function aheadLimitMs(opts: StartOptions): number {
  return opts.serverPinned ? SERVER_PINNED_AHEAD_LIMIT_MS : CLOCK_SKEW_TOLERANCE_MS;
}

/**
 * The instant the trial began, or null if it cannot be established.
 *
 * A start beyond the ahead-limit is not a start — that is the shape a legacy forged
 * value takes, and honouring it would buy the forger extra days. Treated as unprovable,
 * i.e. expired.
 *
 * ★ Within the limit the value is CLAMPED to now rather than trusted forward. The
 * clamp is what keeps the tolerance from being a grant: a start that is ahead of the
 * device can never extend the window past `now + TRIAL_MS`, so the loosened bound buys
 * a forger exactly zero extra time while a skewed clock costs a real student nothing.
 */
function trialStartMs(status: SubscriptionStatus, opts: StartOptions = {}): number | null {
  if (!status.trialStartDate) return null;
  const ms = new Date(status.trialStartDate).getTime();
  if (!Number.isFinite(ms)) return null;
  const now = Date.now();
  if (ms > now + aheadLimitMs(opts)) return null;
  return Math.min(ms, now);
}

/**
 * TRIAL-CLOCK-1 — is the recorded start AHEAD of the device clock by more than the limit?
 * That is a statement about THIS DEVICE's clock, not evidence the trial ended, so a tier
 * change made for this reason alone is never written to the cloud.
 */
function startAheadOfDevice(status: SubscriptionStatus, opts: StartOptions = {}): boolean {
  if (!status.trialStartDate) return false;
  const ms = new Date(status.trialStartDate).getTime();
  return Number.isFinite(ms) && ms > Date.now() + aheadLimitMs(opts);
}

/**
 * TRIAL-CLOCK-1 — a server-pinned start that is ahead of the device (within the limit) is
 * stored in memory and in the cache as the device's NOW, so every later reader — the cache
 * path, `getDaysLeftInTrial`, the trial-ended screen — sees a start that has happened. The
 * cloud value is untouched (saveCloud never sends trialStartDate outside activation), and the
 * next hydration re-reads the real pinned instant.
 */
function clampPinnedStartToDevice(status: SubscriptionStatus, serverPinned: boolean): SubscriptionStatus {
  if (!serverPinned || !status.trialStartDate) return status;
  const ms = new Date(status.trialStartDate).getTime();
  const now = Date.now();
  if (!Number.isFinite(ms) || ms <= now || ms > now + SERVER_PINNED_AHEAD_LIMIT_MS) return status;
  return { ...status, trialStartDate: new Date(now).toISOString() };
}

/**
 * TRIAL-CLOCK-1 — has the trial run its full TRIAL_DAYS by this device's clock? The
 * trial-ended screen and the trial-end feedback card ask this, on top of `tier === "free"`:
 * a start that is in the future or unreadable is NOT evidence that a week has passed.
 */
export function trialHasRunItsCourse(trialStartDate: string | null | undefined, now: number = Date.now()): boolean {
  if (!trialStartDate) return false;
  const ms = new Date(trialStartDate).getTime();
  return Number.isFinite(ms) && ms + TRIAL_MS <= now;
}

/**
 * Derive the trial's state. `trialEndDate` is deliberately NOT consulted.
 *
 * ★ Fails closed: a `trial` that cannot prove when it began has NOT begun.
 */
function applyExpiry(status: SubscriptionStatus, opts: StartOptions = {}): SubscriptionStatus {
  if (status.tier === "premium") return applyPassExpiry(status);
  if (status.tier !== "trial") return status;
  const start = trialStartMs(status, opts);
  if (start === null) return { ...status, tier: "free" };
  if (start + TRIAL_MS < Date.now()) return { ...status, tier: "free" };
  return status;
}

/**
 * STORED-RATE-1 R5 — a paid pass is premium only until its `passEnd`. Mirror of the
 * server's pass-expiry branch in `server/services/entitlement.cjs` deriveEffectiveTier.
 *
 *   no passEnd (absent / null)      legacy owner-granted premium -> stays premium
 *   passEnd at or before now        -> free
 *   passEnd present but unreadable  -> free (fails closed: it cannot prove the pass runs)
 */
function applyPassExpiry(status: SubscriptionStatus): SubscriptionStatus {
  if (status.passEnd === undefined || status.passEnd === null) return status;
  const endMs = new Date(status.passEnd).getTime();
  if (!Number.isFinite(endMs) || endMs <= Date.now()) return { ...status, tier: "free" };
  return status;
}

/**
 * The tier/plan pairs firestore.rules let a BROWSER write (clientWritableEntitlement).
 * Anything else — premium, or a pass plan — is server-written, and a client write of
 * it is refused by rules, so it is not attempted at all.
 */
function isClientWritable(status: SubscriptionStatus): boolean {
  return (
    (status.tier === "free" || status.tier === "trial") &&
    (status.plan === "none" || status.plan === "trial_7day")
  );
}

/**
 * ★★ THE REPAIR — for accounts already broken by the activation defect.
 *
 * Between SEC-2 shipping and this fix, every new signup was written to Firestore as
 * `{tier:"free", plan:"trial_7day", trialStartDate:<server timestamp>}`: a trial that
 * had genuinely begun, recorded as free. Those students will never report it — they
 * find things locked and assume the trial ran out. Fixing activation alone leaves all
 * of them behind, so the record is re-derived on every cloud read.
 *
 * ★ WHY THIS CANNOT BE CLIENT-FORGED, which is the same property SEC-2 exists to
 * enforce and must not be reopened while repairing it:
 *   - it runs ONLY on `loadCloud`'s result, never on the localStorage cache;
 *   - it requires `startIsServerPinned`, i.e. the start arrived as a Firestore
 *     Timestamp, which firestore.rules pin to `request.time` — a client-supplied ISO
 *     string is refused, so a forged cache or a legacy hand-written start repairs
 *     nothing;
 *   - it re-derives the window from that same pinned start, so it can only restore a
 *     trial that is genuinely still running. An elapsed one stays free.
 *
 * It is deliberately narrow: only `free` + `trial_7day` + no `premiumSince`, which is
 * exactly the broken shape. It never invents a plan and never touches premium.
 */
function repairInterruptedTrial(
  status: SubscriptionStatus,
  startIsServerPinned: boolean,
): SubscriptionStatus {
  if (!startIsServerPinned) return status;
  if (status.tier !== "free") return status;
  if (status.plan !== "trial_7day") return status;
  if (status.premiumSince) return status;
  const start = trialStartMs(status, { serverPinned: true });
  if (start === null) return status;
  if (start + TRIAL_MS < Date.now()) return status;
  return { ...status, tier: "trial" };
}

function saveLocal(uid: string, status: SubscriptionStatus): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}:${uid}`, JSON.stringify(status));
  } catch {}
}

function loadLocal(uid: string): SubscriptionStatus | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.plan) parsed.plan = parsed.tier === "trial" ? "trial_7day" : parsed.tier === "premium" ? "premium_monthly" : "none";
    return parsed as SubscriptionStatus;
  } catch {
    return null;
  }
}

/**
 * Write the client-writable half of the document.
 *
 * ★ The payload is built FIELD BY FIELD rather than spread from `status`, and that is
 * load-bearing twice over. Spreading would send `trialEndDate` (which firestore.rules
 * refuses to let a client introduce) and would send a client-chosen `trialStartDate`
 * (which rules refuse unless it equals `request.time`) — so a spread would make every
 * write fail, silently, inside the catch below.
 *
 * `trialStartDate` is omitted on every write except the one that starts the trial. With
 * `merge: true`, an omitted field leaves the merged `request.resource.data` carrying the
 * value already stored, which is exactly what the rules' immutability clause requires.
 */
async function saveCloud(
  uid: string,
  status: SubscriptionStatus,
  opts: { pinTrialStart?: boolean } = {},
): Promise<SaveCloudOutcome> {
  // Nothing to write is not a failure: there is no cloud, or the record is server-owned.
  if (!isFirestoreEnabled()) return { ok: true };
  // A pass (or legacy premium) record is SERVER-owned. Its expiry is DERIVED on every
  // read, never written back: the write would carry plan "pass_*", which rules refuse,
  // and the stored pass must survive so a later grant can see it.
  if (!isClientWritable(status)) return { ok: true };
  const payload: Record<string, unknown> = {
    tier: status.tier,
    plan: status.plan,
    premiumSince: status.premiumSince,
    updatedAt: new Date().toISOString(),
  };
  try {
    await withFirestore(({ fs, db }) => {
      const ref = fs.doc(db, FIRESTORE_COLLECTION, uid);
      if (opts.pinTrialStart) payload.trialStartDate = fs.serverTimestamp();
      return fs.setDoc(ref, payload, { merge: true });
    });
    return { ok: true };
  } catch (e) {
    // Ordinary write-backs stay best-effort and silent. The sign-up trial write READS this
    // outcome (TRIAL-SAVE-1) so a failure is no longer invisible to it.
    const code = (e as { code?: unknown } | null)?.code;
    return { ok: false, permanent: code === "permission-denied" };
  }
}

/** TRIAL-SAVE-1 - what `saveCloud` reports. `permanent`: rules refused it, so retrying cannot help. */
type SaveCloudOutcome = { ok: true } | { ok: false; permanent: boolean };

async function loadCloud(uid: string): Promise<CloudResult> {
  // No Firestore configured means no read happened, so we know NOTHING — that is the
  // `error` case, not the `absent` case. `absent` is a positive statement ("the read
  // succeeded and there is no document") and must never be inferred from a read that
  // never ran.
  if (!isFirestoreEnabled()) return { kind: "error" };
  try {
    const snap = await withFirestore(({ fs, db }) => fs.getDoc(fs.doc(db, FIRESTORE_COLLECTION, uid)));
    if (!snap.exists()) return { kind: "absent" };
    // ★★ P0-TRIAL — `{serverTimestamps:"estimate"}` IS THE FIX, and the default was the
    // bug. `snap.data()` defaults to `serverTimestamps:"none"`, which materialises an
    // UNACKNOWLEDGED `serverTimestamp()` as **null** — indistinguishable, downstream,
    // from a document that never had a start. `activateTrial` writes the start as
    // exactly such a sentinel and this same mount reads the document straight back, so
    // the trial arrived here with a null start and `applyExpiry` correctly failed it
    // closed. The trial downgraded during its own activation, and hydration then wrote
    // that downgrade to Firestore.
    //
    // "estimate" resolves a still-pending server timestamp to the SDK's local estimate,
    // which is the point: a PENDING start is distinguishable from an ABSENT one, and the
    // client itself just requested it. It is not a grant — the estimate exists only
    // until the server acknowledges, after which the real `request.time` replaces it,
    // and the trial WINDOW is still derived from that pinned value. A document with no
    // start still yields nothing here, so the Route C fail-closed guarantee is untouched.
    const raw = (snap.data({ serverTimestamps: "estimate" }) ?? {}) as Record<string, unknown>;
    const startIsServerPinned = isFirestoreTimestamp(raw.trialStartDate);
    const tier = (raw.tier as SubscriptionTier) ?? "free";
    const data: SubscriptionStatus = {
      tier,
      plan:
        (raw.plan as SubscriptionPlan) ??
        (tier === "trial" ? "trial_7day" : tier === "premium" ? "premium_monthly" : "none"),
      trialStartDate: toIso(raw.trialStartDate),
      // Never carried forward from the cloud: nothing may read it.
      trialEndDate: null,
      premiumSince: (raw.premiumSince as string | null) ?? null,
      // Server-written only (rules refuse a client write), so safe to carry. Read
      // through toIso: the Admin SDK stores it as a Firestore Timestamp. A value that is
      // PRESENT but unreadable must not collapse to null — null means "legacy premium,
      // no end" — so it is kept as an unparseable marker and applyPassExpiry fails it
      // closed, exactly as the server does.
      passEnd:
        raw.passEnd === undefined || raw.passEnd === null ? null : (toIso(raw.passEnd) ?? "unreadable"),
      ...(raw.foundingMember === true ? { foundingMember: true } : {}),
    };
    // PAY-PHONE-1 (review fix 1) - mirror of entitlement.cjs: a stored TRIAL that also carries a complete server grant
    // record (pass type, running passEnd, payment ref, price) is the trial-write-after-claim race: it is the paid pass.
    if (
      data.tier === "trial" &&
      (raw.passType === "month" || raw.passType === "till_boards") &&
      typeof raw.lastPaymentRef === "string" &&
      raw.lastPaymentRef !== "" &&
      typeof raw.pricePaidInr === "number" &&
      raw.pricePaidInr > 0 &&
      data.passEnd &&
      Date.parse(data.passEnd) > Date.now()
    ) {
      data.tier = "premium";
      data.plan = raw.passType === "month" ? "pass_month" : "pass_till_boards";
    }
    return { kind: "found", data, startIsServerPinned };
  } catch {
    return { kind: "error" };
  }
}

/**
 * Synchronous, cache-first read.
 *
 * ★ ORDERING — the cache is a CACHE, never a grant. This returns whatever is cached so
 * a returning student is not blanked on every mount, but it is authoritative for
 * nothing: `hydrateSubscriptionFromCloud` runs on the same mount and overrides it. See
 * that function for what each cloud outcome does to a forged cache.
 */
export function loadSubscription(uid: string): SubscriptionStatus {
  const local = loadLocal(uid);
  if (!local) return defaultStatus();
  const resolved = applyExpiry(local);
  if (resolved.tier !== local.tier) {
    // TRIAL-CLOCK-1 — a cached start ahead of this device's clock proves nothing about the
    // record; keep the downgrade local and let the cloud hydration on this mount decide.
    if (startAheadOfDevice(local)) saveLocal(uid, resolved);
    else saveSubscription(uid, resolved);
  }
  return resolved;
}

export function saveSubscription(uid: string, status: SubscriptionStatus): void {
  saveLocal(uid, status);
  void saveCloud(uid, status);
}

/* ── PAY-RECOVER-1 · in-tab hydration emitter ─────────────────────────────────
 * Every `useSubscription` instance (the shell chrome, the page, the buy area) holds its own
 * copy of the status. Without this, a hydration run by ONE instance — e.g. after a payment —
 * refreshed only that instance and the cache, and the others stayed stale until remount.
 * Emits ONLY a cloud-reconciled status (found / absent), never a cache read or an error,
 * and only from the async hydration path, so no listener runs during a render.
 */
export type SubscriptionHydratedListener = (uid: string, status: SubscriptionStatus) => void;

const hydratedListeners = new Set<SubscriptionHydratedListener>();

export function onSubscriptionHydrated(listener: SubscriptionHydratedListener): () => void {
  hydratedListeners.add(listener);
  return () => {
    hydratedListeners.delete(listener);
  };
}

function emitHydrated(uid: string, status: SubscriptionStatus): void {
  for (const listener of Array.from(hydratedListeners)) {
    try {
      listener(uid, status);
    } catch {
      /* one bad listener must not starve the others */
    }
  }
}

/**
 * Resolve entitlement against the cloud. The three outcomes need three responses:
 *
 *   found   the cloud WINS outright and the cache is overwritten with it.
 *   absent  the read SUCCEEDED and nobody issued this student anything -> FREE.
 *           This is the branch that kills a hand-written localStorage entitlement.
 *   error   we learned nothing; KEEP the cache, or an offline student loses access
 *           they really have.
 */
export async function hydrateSubscriptionFromCloud(uid: string): Promise<SubscriptionStatus> {
  let cloud = await loadCloud(uid);

  if (cloud.kind === "absent") {
    // TRIAL-SAVE-1 - a brand-new account whose sign-up trial write was LOST. Strictly: this
    // device holds a trial for THIS uid (the per-uid cache key), the signed-in Auth account
    // is < 24 h old, and the read SUCCEEDED with no document. Then the server (not the
    // browser: rules accept only request.time) is asked to restore the sign-up trial, once
    // per call and capped per page session. It refuses an older account and never touches an
    // existing document, so an account older than a day, or one with any record, cannot get
    // a trial from here. ONLY a transient failure (network, timeout, 5xx, 429) keeps the local
    // trial for the next load; a refusal (401/403/409) or a still-absent re-read wipes it.
    const local = loadLocal(uid);
    if (local && local.tier !== "premium" && !local.passEnd && local.trialStartDate && (await isSignedInNewAccount(uid))) {
      const ensured = await ensureSignupTrial(uid);
      if (ensured === "transient") return applyExpiry(local);
      if (ensured === "ok") {
        const again = await loadCloud(uid);
        if (again.kind === "found") cloud = again;
        else if (again.kind === "error") return applyExpiry(local);
        // still absent after a 200: fall through to the free default, exactly as trunk did
      }
      // "refused" (401/403/409 ...): fall through - a local-only trial is wiped as on trunk
    }
  }

  if (cloud.kind === "found") {
    const pinned = cloud.startIsServerPinned;
    const resolved = clampPinnedStartToDevice(
      applyExpiry(repairInterruptedTrial(cloud.data, pinned), { serverPinned: pinned }),
      pinned,
    );
    saveLocal(uid, resolved);
    // TRIAL-CLOCK-1 - a server-pinned start beyond even the pinned limit is THIS DEVICE's
    // clock being wrong, not the trial ending: the local view fails closed, but that
    // downgrade is never written over the server's record.
    const deviceClockOnly = pinned && resolved.tier === "free" && startAheadOfDevice(cloud.data, { serverPinned: true });
    if (resolved.tier !== cloud.data.tier && !deviceClockOnly) {
      // Persist the derived change - a downgrade, so the record stops claiming an ended
      // trial, or a repair, so the record stops denying a live one. The write omits
      // trialStartDate, so the merge preserves the pinned start either way.
      void saveCloud(uid, resolved);
    }
    emitHydrated(uid, resolved);
    return resolved;
  }

  if (cloud.kind === "absent") {
    const free = defaultStatus();
    saveLocal(uid, free);
    // Deliberately no cloud write: a cache with no cloud record is not evidence of
    // anything, and uploading it would launder a forgery into the record of truth.
    emitHydrated(uid, free);
    return free;
  }

  const local = loadLocal(uid);
  return local ? applyExpiry(local) : defaultStatus();
}

export function activateTrial(uid: string): SubscriptionStatus {
  const existing = loadSubscription(uid);
  if (existing.tier === "premium") return existing;
  // PAY-PHONE-1 (review fix 1) - a trial is never written onto a record that carries a paid pass (even an expired-looking
  // one): the pass is server-owned. No extra read here on purpose - the trial write must stay queued BEFORE the first
  // cloud read (P0-TRIAL D6); the claim instead WAITS for this write (whenTrialWriteSettled), and both tier derivations
  // rank a running paid pass above a trial for any write that still lands late.
  if (existing.passEnd) return existing;
  if (existing.trialStartDate) return existing;

  const status: SubscriptionStatus = {
    tier: "trial",
    plan: "trial_7day",
    // OPTIMISTIC LOCAL VALUE ONLY, so the UI can show the trial immediately. The
    // AUTHORITATIVE start is the serverTimestamp() written below and pinned by rules;
    // the next hydration replaces this with it.
    //
    // ★ A student who clears localStorage to re-trigger this gets nowhere: the cloud
    // write is then an UPDATE that would MOVE trialStartDate, which firestore.rules
    // denies, so the original server-pinned start survives and the next hydration
    // expires them. Deleting the document to reset the clock is denied too.
    trialStartDate: new Date().toISOString(),
    trialEndDate: null,
    premiumSince: null,
  };
  saveLocal(uid, status);
  // PAY-PHONE-1 (review fix 1): remembered so a purchase claim waits for the trial write to settle first.
  const write = saveTrialWithRetry(uid, status);
  pendingTrialWrites.set(uid, write);
  void write.finally(() => {
    if (pendingTrialWrites.get(uid) === write) pendingTrialWrites.delete(uid);
  });
  return status;
}

/**
 * TRIAL-SAVE-1 - the sign-up trial's cloud write used to be fire-and-forget with every error
 * swallowed: one transient failure left the student with a local trial the cloud never heard
 * of, and the next load read "absent" and wiped it. Now: bounded retry in this session
 * (TRIAL_WRITE_ATTEMPTS, backoff), and if the browser still cannot land it the SERVER does,
 * via `ensureSignupTrial`. firestore.rules forbid a client from re-issuing "the same date"
 * (only `request.time` is accepted), so the server restoring the sign-up instant is the one
 * route that keeps the trial the SAME trial. Never rejects.
 */
const TRIAL_WRITE_ATTEMPTS = 3;
const TRIAL_WRITE_BACKOFF_MS = [400, 1200];

async function saveTrialWithRetry(uid: string, status: SubscriptionStatus): Promise<void> {
  for (let attempt = 0; attempt < TRIAL_WRITE_ATTEMPTS; attempt += 1) {
    const outcome = await saveCloud(uid, status, { pinTrialStart: true });
    if (outcome.ok) return;
    // Rules refusal is deterministic (typically "already pinned" after a lost ack): skip the
    // wait and let the server settle it.
    if (outcome.permanent) break;
    if (attempt < TRIAL_WRITE_ATTEMPTS - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, TRIAL_WRITE_BACKOFF_MS[attempt] ?? 1200));
    }
  }
  await ensureSignupTrial(uid);
}

/** TRIAL-SAVE-1 - server restore (POST /api/trial/ensure-signup). */
const ENSURE_SIGNUP_ENDPOINT = "/api/trial/ensure-signup";
const ENSURE_MAX_ATTEMPTS_PER_UID = 3;
const NEW_ACCOUNT_WINDOW_MS = DAY_MS;
const ENSURE_TIMEOUT_MS = 8000;
const ensureAttempts = new Map<string, number>();
const ensureInflight = new Map<string, Promise<EnsureOutcome>>();

/**
 * "ok" = the document exists afterwards. "transient" = could not be decided (network error,
 * timeout, 5xx, 429, no token): keep what we have and try again later. "refused" = the server
 * (or the Auth state) said no (401/403/409 ...): the account is not entitled to a restore.
 */
type EnsureOutcome = "ok" | "transient" | "refused";

/**
 * Ask the server to create THIS signed-in student's sign-up trial if, and only if, the account
 * is < 24 h old and has no subscription document at all (the server decides both; nothing here
 * is trusted). "ok" = the document exists afterwards (created now, or already there).
 * Single-flight per uid and at most ENSURE_MAX_ATTEMPTS_PER_UID calls per page session.
 */
function ensureSignupTrial(uid: string): Promise<EnsureOutcome> {
  const running = ensureInflight.get(uid);
  if (running) return running;
  const used = ensureAttempts.get(uid) ?? 0;
  if (used >= ENSURE_MAX_ATTEMPTS_PER_UID) return Promise.resolve("transient");
  ensureAttempts.set(uid, used + 1);
  const run = (async (): Promise<EnsureOutcome> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const { authClient } = await import("./firebaseClient");
      const current = authClient?.currentUser ?? null;
      if (!current || current.uid !== uid) return "refused";
      const token = await current.getIdToken().catch(() => null);
      if (!token) return "transient";
      const controller = new AbortController();
      timer = setTimeout(() => controller.abort(), ENSURE_TIMEOUT_MS);
      const res = await fetch(ENSURE_SIGNUP_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (res.ok) return "ok";
      return res.status >= 500 || res.status === 429 ? "transient" : "refused";
    } catch {
      return "transient";
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  })().finally(() => {
    ensureInflight.delete(uid);
  });
  ensureInflight.set(uid, run);
  return run;
}

/** Is the signed-in Firebase Auth account `uid` less than 24 h old? (a cheap client precheck; the server re-checks) */
async function isSignedInNewAccount(uid: string): Promise<boolean> {
  try {
    const { authClient } = await import("./firebaseClient");
    const current = authClient?.currentUser ?? null;
    if (!current || current.uid !== uid) return false;
    const created = Date.parse(current.metadata?.creationTime ?? "");
    const age = Date.now() - created;
    return Number.isFinite(age) && age <= NEW_ACCOUNT_WINDOW_MS;
  } catch {
    return false;
  }
}

/** In-flight sign-up trial writes, by uid (memory only). */
const pendingTrialWrites = new Map<string, Promise<void>>();

/** Resolves once this uid's sign-up trial write (if any is in flight) has settled. Never rejects. */
export function whenTrialWriteSettled(uid: string): Promise<void> {
  const p = pendingTrialWrites.get(uid);
  if (!p) return Promise.resolve();
  // TRIAL-SAVE-1: never make a purchase claim wait longer than the server-restore timeout.
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ENSURE_TIMEOUT_MS);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    p.then(done, done);
  });
}

export function activatePremium(uid: string): SubscriptionStatus {
  // Payment/admin-only helper. Normal client UI must route to pricing and
  // must not call this directly unless a verified payment/admin path exists.
  //
  // The cloud write this triggers is REFUSED by firestore.rules (premium is Admin-SDK
  // only), and the local cache it leaves is overwritten by the next hydration, so this
  // cannot mint premium. Premium is activated by the owner via the Firebase Console.
  const existing = loadSubscription(uid);
  const status: SubscriptionStatus = {
    ...existing,
    tier: "premium",
    plan: "premium_monthly",
    premiumSince: new Date().toISOString(),
  };
  saveSubscription(uid, status);
  return status;
}

/** Days remaining, DERIVED from the server-pinned start plus the TRIAL_DAYS constant. */
export function getDaysLeftInTrial(status: SubscriptionStatus): number {
  const start = trialStartMs(status);
  if (start === null) return 0;
  const diff = start + TRIAL_MS - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

export function isPremiumAccess(status: SubscriptionStatus): boolean {
  return status.tier === "premium" || status.tier === "trial";
}

/**
 * PAID Premium only (a verified Razorpay pass or an admin grant). A trial is NOT paid: LIMITS-1
 * meters new-cohort trial students, so the limits client must ask the server for them.
 */
export function isPaidPremium(status: SubscriptionStatus | null | undefined): boolean {
  return status?.tier === "premium";
}
