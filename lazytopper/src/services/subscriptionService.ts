import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";

export type SubscriptionTier = "free" | "trial" | "premium";

export type SubscriptionPlan = "none" | "trial_7day" | "premium_monthly" | "premium_yearly";

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
 * The instant the trial began, or null if it cannot be established.
 *
 * A start beyond the skew tolerance is not a start — that is the shape a legacy forged
 * value takes, and honouring it would buy the forger extra days. Treated as unprovable,
 * i.e. expired.
 *
 * ★ Within the tolerance the value is CLAMPED to now rather than trusted forward. The
 * clamp is what keeps the tolerance from being a grant: a start that is ahead of the
 * device can never extend the window past `now + TRIAL_MS`, so the loosened bound buys
 * a forger exactly zero extra time while a skewed clock costs a real student nothing.
 */
function trialStartMs(status: SubscriptionStatus): number | null {
  if (!status.trialStartDate) return null;
  const ms = new Date(status.trialStartDate).getTime();
  if (!Number.isFinite(ms)) return null;
  const now = Date.now();
  if (ms > now + CLOCK_SKEW_TOLERANCE_MS) return null;
  return Math.min(ms, now);
}

/**
 * Derive the trial's state. `trialEndDate` is deliberately NOT consulted.
 *
 * ★ Fails closed: a `trial` that cannot prove when it began has NOT begun.
 */
function applyExpiry(status: SubscriptionStatus): SubscriptionStatus {
  if (status.tier !== "trial") return status;
  const start = trialStartMs(status);
  if (start === null) return { ...status, tier: "free" };
  if (start + TRIAL_MS < Date.now()) return { ...status, tier: "free" };
  return status;
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
  const start = trialStartMs(status);
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
): Promise<void> {
  if (!firestoreDb) return;
  try {
    const ref = doc(firestoreDb, FIRESTORE_COLLECTION, uid);
    const payload: Record<string, unknown> = {
      tier: status.tier,
      plan: status.plan,
      premiumSince: status.premiumSince,
      updatedAt: new Date().toISOString(),
    };
    if (opts.pinTrialStart) payload.trialStartDate = serverTimestamp();
    await setDoc(ref, payload, { merge: true });
  } catch {}
}

async function loadCloud(uid: string): Promise<CloudResult> {
  // No Firestore configured means no read happened, so we know NOTHING — that is the
  // `error` case, not the `absent` case. `absent` is a positive statement ("the read
  // succeeded and there is no document") and must never be inferred from a read that
  // never ran.
  if (!firestoreDb) return { kind: "error" };
  try {
    const ref = doc(firestoreDb, FIRESTORE_COLLECTION, uid);
    const snap = await getDoc(ref);
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
    };
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
    saveSubscription(uid, resolved);
  }
  return resolved;
}

export function saveSubscription(uid: string, status: SubscriptionStatus): void {
  saveLocal(uid, status);
  void saveCloud(uid, status);
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
  const cloud = await loadCloud(uid);

  if (cloud.kind === "found") {
    const resolved = applyExpiry(repairInterruptedTrial(cloud.data, cloud.startIsServerPinned));
    saveLocal(uid, resolved);
    if (resolved.tier !== cloud.data.tier) {
      // Persist the derived change — a downgrade, so the record stops claiming an ended
      // trial, or a repair, so the record stops denying a live one. The write omits
      // trialStartDate, so the merge preserves the pinned start either way.
      void saveCloud(uid, resolved);
    }
    return resolved;
  }

  if (cloud.kind === "absent") {
    const free = defaultStatus();
    saveLocal(uid, free);
    // Deliberately no cloud write: a cache with no cloud record is not evidence of
    // anything, and uploading it would launder a forgery into the record of truth.
    return free;
  }

  const local = loadLocal(uid);
  return local ? applyExpiry(local) : defaultStatus();
}

export function activateTrial(uid: string): SubscriptionStatus {
  const existing = loadSubscription(uid);
  if (existing.tier === "premium") return existing;
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
  void saveCloud(uid, status, { pinTrialStart: true });
  return status;
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
