import { useEffect, useMemo, useState } from "react";
import type { SubscriptionStatus } from "../../services/subscriptionService";
import { isFirestoreEnabled, withFirestore } from "../../services/firestoreSdk";
import { getAttempts } from "../../services/practiceInsights";
import { useZeroGraded } from "./zeroGraded";

/**
 * PASS-START-1 (owner "go ahead", 28 Nov 2026) - the pass-holder variant of the Home Start-here card.
 *
 * Audience: signed in AND an active Board Pass AND no graded record AND no practice attempt. The card ends by itself the
 * moment there is activity (derived from the activity data: no new write anywhere). "Not now" is remembered per account on
 * this device in localStorage (not premium / trial state). Everyone else keeps today's card exactly.
 * Kill switch: VITE_PASS_START_DISABLED=1 turns the variant off (the generic card is then exactly today's).
 * No grading change: this file reads, it grades nothing (CLAUDE.md 4a is not triggered).
 */

export const PASS_START_DISMISS_KEY_PREFIX = "lazytopper.passStart.dismissed.v1:";

export function isPassStartDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_PASS_START_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

/** A PAID pass that has not ended: premium with a readable, future `passEnd`. A legacy premium with no passEnd is not a pass. PURE. */
export function isActivePassHolder(status: SubscriptionStatus | null | undefined, nowMs: number = Date.now()): boolean {
  if (!status || status.tier !== "premium" || typeof status.passEnd !== "string") return false;
  const end = Date.parse(status.passEnd);
  return Number.isFinite(end) && end > nowMs;
}

export function isPassStartDismissed(uid: string): boolean {
  try {
    return !!uid && window.localStorage.getItem(PASS_START_DISMISS_KEY_PREFIX + uid) === "1";
  } catch {
    return false;
  }
}

export function dismissPassStart(uid: string): void {
  try {
    if (uid) window.localStorage.setItem(PASS_START_DISMISS_KEY_PREFIX + uid, "1");
  } catch {
    /* blocked storage: the card returns on the next visit */
  }
}

/** Does `practiceInsights/{uid}/attempts` hold ONE document? true / false = the SERVER's answer, null = could not tell. */
export async function cloudHasAnyPracticeAttempt(uid: string): Promise<boolean | null> {
  if (!uid || !isFirestoreEnabled()) return null;
  try {
    const snap = await withFirestore(({ fs, db }) => fs.getDocs(fs.query(fs.collection(db, "practiceInsights", uid, "attempts"), fs.limit(1))));
    if (snap.metadata?.fromCache) return null;
    return !snap.empty;
  } catch {
    return null;
  }
}

export type PracticeSeen = "loading" | "none" | "some";

/** uid -> a SERVER "has attempts" answer, kept for the tab (an attempt can never un-happen). "none" is re-asked on every mount. */
const keptSome = new Set<string>();

export function resetPassStartCacheForTests(): void {
  keptSome.clear();
}

/**
 * Tri-state "has this student tapped any practice card?". Local attempts first (no network), then ONE cloud read.
 * Never guesses "none": an unreadable answer stays "some" (the card is only shown on a proven empty record).
 */
export function usePracticeSeen(uid: string | null | undefined, enabled: boolean): PracticeSeen {
  const local = useMemo(() => (enabled && uid ? getAttempts().length > 0 || keptSome.has(uid) : false), [enabled, uid]);
  const [asked, setAsked] = useState<{ uid: string; seen: PracticeSeen } | null>(null);
  useEffect(() => {
    if (!enabled || !uid || local) return undefined;
    let cancelled = false;
    void cloudHasAnyPracticeAttempt(uid).then((has) => {
      if (has === true) keptSome.add(uid);
      if (!cancelled) setAsked({ uid, seen: has === false ? "none" : "some" });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, uid, local]);
  if (!enabled || !uid) return "loading";
  if (local) return "some";
  return asked && asked.uid === uid ? asked.seen : "loading";
}

export interface PassStartState {
  /** The pass-holder variant is the card for this account (visible unless dismissed). */
  variant: boolean;
  dismissed: boolean;
  dismiss: () => void;
}

/** The audience read for useStartHere. `graded` is the shared zero-graded read the caller already made. */
export function usePassStart(uid: string | null | undefined, status: SubscriptionStatus | null | undefined, graded: ReturnType<typeof useZeroGraded>): PassStartState {
  const holder = !!uid && !isPassStartDisabled() && isActivePassHolder(status);
  const seen = usePracticeSeen(uid, holder && graded === "none");
  // The device memory is read each render (one localStorage key); `dismissedFor` makes the tap take effect at once.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const dismissed = !!uid && (dismissedFor === uid || isPassStartDismissed(uid));
  return {
    variant: holder && graded === "none" && seen === "none",
    dismissed,
    dismiss: () => {
      if (uid) {
        dismissPassStart(uid);
        setDismissedFor(uid);
      }
    },
  };
}
