/**
 * ACT-FIRST-1 — measurement for the first-action card (the one-minute ladder on Answer Checker,
 * the Start-here card on Home). `shown` fires once per surface per page load, with the reason the
 * card showed (the server's zero-graded answer, or a new-account signal on the device); `tap`
 * carries the reason the card was last shown with. Memory only: nothing is stored or sent but
 * the surface and the reason (no uid, no answer).
 */
import { trackFirstAction } from "../../analytics/analytics";
import { accountIsNew } from "./zeroGraded";
import type { FirstActionReason } from "./firstActionRead";
import { wasTrialStartedAtSignUp } from "../../services/newAccountTrial";

export type FirstActionSurface = "answer_checker" | "home";

const shown = new Map<FirstActionSurface, FirstActionReason>();

/** Tests only. */
export function resetFirstActionForTests(): void {
  shown.clear();
}

export function reportFirstActionShown(surface: FirstActionSurface, reason: FirstActionReason | null): void {
  if (!reason || shown.has(surface)) return;
  shown.set(surface, reason);
  try {
    trackFirstAction("first_action_shown", { surface, reason });
  } catch {
    /* analytics must never break the page */
  }
}

/** A tap on the card's action. Only a card that was shown (with its reason) is counted; default surface = Home's. */
export function reportFirstActionTap(surface: FirstActionSurface = "home"): void {
  const reason = shown.get(surface);
  if (!reason) return;
  try {
    trackFirstAction("first_action_tap", { surface, reason });
  } catch {
    /* analytics must never break the page */
  }
}

/** A signed-in account created in the last day, or whose trial this tab started at sign-up: Home must not say "Welcome back". */
export function isBrandNewAccount(uid: string | null | undefined): boolean {
  if (!uid) return false;
  return wasTrialStartedAtSignUp(uid) || accountIsNew(uid, Date.now(), 1);
}
