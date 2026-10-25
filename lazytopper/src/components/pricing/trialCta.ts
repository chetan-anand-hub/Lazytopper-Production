/**
 * trialCta — ASK-COPY-1. The trial-first lead on the "make the ask" surfaces (the tutor card, the
 * upgrade sheet, the scorecard upgrade line). Owner ruling 25 Oct 2026 [FU-TRIAL-CTA-ON-ASK]:
 * where the student can still start the free week, "Start your free 7-day trial" leads and the
 * Board Pass is second. Never a second trial: eligibility is the one /pricing uses (`trialEligible`
 * in PricingPage.tsx) and the server still decides - a refused write never extends anything.
 *
 * Nothing here runs on mount: the trial starts only inside `startTrialFromTap`, which a button's
 * onClick calls.
 */
import { useAuth } from "../../context/AuthContext";
import { trackNamedEvent } from "../../analytics/analytics";
import { activateTrial, type SubscriptionStatus } from "../../services/subscriptionService";

export const START_TRIAL_LABEL = "Start your free 7-day trial";
export const TRIAL_STARTED_LINE = "Your 7-day trial has started.";
/** The signed-out tutor gate note (replaces "Log in to open your tutor"). */
export const SIGNUP_TUTOR_LEAD = "Sign up free — 7 days of the tutor and step marking.";

/**
 * Same rule as PricingPage's `trialEligible`: the record is KNOWN (hydrated - an empty cache on a
 * fresh device would otherwise look like "never had a trial"), not Premium, and has no trial start.
 */
export function isTrialEligible(hydrated: boolean, status: Pick<SubscriptionStatus, "tier" | "trialStartDate">): boolean {
  return hydrated && status.tier !== "premium" && !status.trialStartDate;
}

/** `/login` for a signed-out visitor who taps the trial; returns to the page they were on. */
export function trialLoginHref(returnTo: string): string {
  return `/login?reason=start-trial&redirect=${encodeURIComponent(returnTo)}`;
}

/** The explicit tap: start the trial for this uid (the server pins the start) and record it. */
export function startTrialFromTap(uid: string): SubscriptionStatus {
  const next = activateTrial(uid);
  trackNamedEvent("trial_start");
  return next;
}

/** The signed-in uid, or "" when signed out or when there is no AuthProvider (a bare render). */
export function useOptionalUid(): string {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { user } = useAuth();
    return user && !user.isLocalSession ? user.uid : "";
  } catch {
    return "";
  }
}

/** "The AI tutor" -> "the AI tutor"; "AI tutor" and "Step-by-step" stay as they are. */
export function lowerFirst(label: string): string {
  return /^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
}
