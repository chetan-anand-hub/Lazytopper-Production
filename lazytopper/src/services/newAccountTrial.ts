import { getAdditionalUserInfo, type UserCredential } from "firebase/auth";
import { activateTrial, loadSubscription } from "./subscriptionService";
import { trackNamedEvent } from "../analytics/analytics";

/**
 * TRIAL-ON-SIGNUP-1 — owner ruling (Option A, 2026-09-30): a BRAND-NEW account's 7-day
 * trial starts AT SIGN-UP, ONCE. Existing accounts and logins never start one.
 *
 * This module only CALLS the existing `activateTrial(uid)`. Its own guards (premium, or a
 * trial already started) stay the final word on eligibility — nothing here widens or
 * narrows them.
 *
 * ── WHERE IT IS CALLED ─────────────────────────────────────────────────────
 * Only from AuthContext's three account-CREATING doors, directly after the Firebase call
 * resolves: Google `signInWithPopup` and phone `confirm()` through
 * `startTrialIfNewAccount` (both are one call for a new AND a returning student, so they
 * are gated on `isNewUser`), and email `createUserWithEmailAndPassword` through
 * `startTrialForNewAccount` (that call creates the account or throws, so reaching it IS
 * the sign-up). Never from `onAuthStateChanged`, the hydration effect, email sign-in,
 * phone LINKING, re-auth or a mount.
 *
 * ── WHY RIGHT THERE, BEFORE ANY AWAIT (the hydration race, D6) ─────────────
 * `activateTrial` writes the local cache and queues the Firestore `setDoc` synchronously
 * (fire-and-forget). Firebase notifies `onAuthStateChanged` in a microtask; React renders
 * the new uid — and only then can any `hydrateSubscriptionFromCloud(uid)` be issued — in a
 * LATER task. So for a new uid the trial write is always queued on the Firestore client
 * before the first read of that uid, and the read sees it (a pending local write is visible
 * to a later read). Moving this call behind an `await` (e.g. after `updateProfile`) would
 * break that ordering.
 *
 * ── ONCE ───────────────────────────────────────────────────────────────────
 * One attempt per uid per page session (`attempted`). A reload never reaches here (no
 * sign-in call runs), and if it did, `activateTrial` refuses a record that already carries
 * a `trialStartDate`.
 *
 * ── NEVER BLOCKS SIGN-IN ───────────────────────────────────────────────────
 * Everything is synchronous and inside try/catch; the cloud write is not awaited. A throw
 * (or an offline write) leaves the sign-in untouched and simply starts no trial.
 */

const attempted = new Set<string>();
const startedAtSignUp = new Set<string>();

/**
 * FRICTION-FIX-1 · F5 (FU-SIGNUP-CONFIRMATION-SESSION-ONLY) — the "started at sign-up"
 * marker is MIRRORED to this tab's sessionStorage, keyed by uid, so the Check & Improve
 * confirmation survives a reload of the page the student lands on after signing up. It
 * is cleared when the student continues past the confirmation.
 *
 * ★ DISPLAY-ONLY. The marker decides which PANEL Check & Improve shows (the T2
 * confirmation instead of the R9 offer) and nothing else: it never starts, grants or
 * extends a trial, and no entitlement code reads it — the confirmation still requires the
 * HYDRATED subscription record to say the trial is active. Every storage access is inside
 * try/catch: a blocked or full storage simply means the marker is in-memory only, as before.
 */
export const SIGNUP_TRIAL_MARKER_PREFIX = "lazytopper.trialStartedAtSignUp:";

function writeSignUpMarker(uid: string): void {
  try {
    window.sessionStorage.setItem(`${SIGNUP_TRIAL_MARKER_PREFIX}${uid}`, "1");
  } catch {
    /* storage unavailable — the in-memory marker still serves this page session */
  }
}

function readSignUpMarker(uid: string): boolean {
  try {
    return window.sessionStorage.getItem(`${SIGNUP_TRIAL_MARKER_PREFIX}${uid}`) === "1";
  } catch {
    return false;
  }
}

/**
 * Start the trial for a uid that has JUST been created. Returns true only when
 * `activateTrial` actually started one.
 *
 * "Started" is derived from `activateTrial`'s own code: it refuses (returns the existing
 * status unchanged) when the cached status is premium or already has a `trialStartDate`,
 * and otherwise writes `{ tier: "trial", plan: "trial_7day", trialStartDate: <now> }`.
 * So a start is exactly: BEFORE not premium and no `trialStartDate`, AFTER tier "trial"
 * with a `trialStartDate`. `trial_start` fires on that and nothing else.
 */
export function startTrialForNewAccount(uid: string | null | undefined): boolean {
  try {
    if (!uid || attempted.has(uid)) return false;
    attempted.add(uid);
    const before = loadSubscription(uid);
    const after = activateTrial(uid);
    const started =
      before.tier !== "premium" &&
      !before.trialStartDate &&
      after.tier === "trial" &&
      Boolean(after.trialStartDate);
    if (!started) return false;
    startedAtSignUp.add(uid);
    writeSignUpMarker(uid);
    trackNamedEvent("trial_start");
    return true;
  } catch {
    // A trial is never worth a failed sign-in.
    return false;
  }
}

/** Google / phone: the same call serves a new and a returning student — gate on isNewUser. */
export function startTrialIfNewAccount(credential: UserCredential): boolean {
  try {
    if (!getAdditionalUserInfo(credential)?.isNewUser) return false;
    return startTrialForNewAccount(credential.user?.uid);
  } catch {
    return false;
  }
}

/**
 * True when THIS tab started `uid`'s trial at sign-up — in memory, or (F5) from the
 * sessionStorage mirror, read when Check & Improve mounts, so a reload keeps the
 * confirmation. Check & Improve reads it to show the confirmation instead of the offer
 * (T2). A UI hint, never entitlement — entitlement is only ever the hydrated subscription
 * record.
 */
export function wasTrialStartedAtSignUp(uid: string | null | undefined): boolean {
  if (!uid) return false;
  return startedAtSignUp.has(uid) || readSignUpMarker(uid);
}

/**
 * F5 — the student continued past the confirmation: forget the marker, in memory and in
 * this tab's sessionStorage, so a later reload shows Check & Improve fresh. The
 * confirmation panel has no uid (one tab holds one signed-in student), so every marker
 * this tab holds is cleared. Never throws.
 */
export function clearTrialStartedAtSignUp(): void {
  startedAtSignUp.clear();
  try {
    const store = window.sessionStorage;
    const keys: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key && key.startsWith(SIGNUP_TRIAL_MARKER_PREFIX)) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
  } catch {
    /* storage unavailable — nothing persisted to clear */
  }
}
