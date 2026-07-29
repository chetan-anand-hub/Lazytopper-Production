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
  | { kind: "found"; data: SubscriptionStatus }
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

/**
 * The instant the trial began, or null if it cannot be established.
 *
 * A start in the FUTURE is not a start — it is the shape a legacy forged value takes,
 * and honouring it would buy the forger extra days. Treated as unprovable, i.e. expired.
 */
function trialStartMs(status: SubscriptionStatus): number | null {
  if (!status.trialStartDate) return null;
  const ms = new Date(status.trialStartDate).getTime();
  if (!Number.isFinite(ms)) return null;
  if (ms > Date.now()) return null;
  return ms;
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
    const raw = (snap.data() ?? {}) as Record<string, unknown>;
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
    return { kind: "found", data };
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
    const resolved = applyExpiry(cloud.data);
    saveLocal(uid, resolved);
    if (resolved.tier !== cloud.data.tier) {
      // Persist the derived downgrade so the record stops claiming an ended trial.
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
