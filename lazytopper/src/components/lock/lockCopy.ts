/**
 * lockCopy - LOCK-SELL-1 (owner, 4 Nov 2026, 07:48): the full-page Premium lock (RequirePremium: Answer Checker, Worksheet
 * marking, "Ask the tutor", ...) sells the Board Pass and its star features; Basic shrinks to one quiet "Continue with Basic".
 *
 * ★ NO PRICE OR DATE IS TYPED HERE. The figures come from config/pricing.ts through boardPassOffer / tillBoardsQuote at render.
 * ★ TRUE TO THE PRODUCT. Premium grading has fair-use caps (server/services/fairUse.cjs), so no tick says "unlimited grading";
 *   the one "Unlimited" tick is the open/download claim config/pricingCompare.ts already makes (PREMIUM_PLUS "papers").
 * ★ The tutor tick does not use the word "ask": PaywallActions.surfaces.test pins that no "ask ... parent" phrase appears on a lock
 *   other than the action's own label.
 * ★ NO REFUND WORDING, ever. One product name in visible copy: the Board Pass.
 * ★ PURE: no React, no services - RequireAuth sits near the entry chunk.
 */
import { BOARD_PASS_NAME } from "../../config/pricing";

/** The labels the tutor gates pass (App.tsx, TutorPage, the Chapter Hub) all read as one feature on the lock. */
const TUTOR_LABELS: ReadonlySet<string> = new Set(["Ask the tutor", "The AI tutor", "Tutor"]);

/** The name the headline gives the feature behind the lock. */
export function lockFeatureName(featureLabel?: string): string {
  const label = (featureLabel || "").trim();
  if (!label) return "This feature";
  if (TUTOR_LABELS.has(label)) return "The AI tutor";
  return label;
}

/** "Answer Checker comes with the Board Pass" - the lock's headline. */
export function lockHeadline(featureLabel?: string): string {
  return `${lockFeatureName(featureLabel)} comes with the ${BOARD_PASS_NAME}`;
}

/** The Board Pass's star features, Answer Checker FIRST. The name before the dash is bold (`strong`). */
export const LOCK_TICKS: ReadonlyArray<{ id: string; strong?: string; text: string }> = [
  { id: "checker", strong: "Answer Checker", text: " — every written answer marked step by step, like a CBSE examiner" },
  { id: "mi", strong: "Mistake Intelligence", text: " — see exactly why you lose marks, topic by topic" },
  { id: "tutor", strong: "AI tutor", text: " — clears your doubts on any question, any time" },
  { id: "graded", text: "Chapter tests, worksheets and full board mocks graded, not just downloaded" },
  { id: "papers", text: "Unlimited chapter tests and mocks to open or download" },
];

/** The card's name. */
export const LOCK_CARD_TITLE = BOARD_PASS_NAME;

/** The word in front of "till your boards (Feb 2027)" beside the price (the same word /pricing uses). */
export const LOCK_ONCE = "once";

/** Under the headline, only for a student who can still start the free week (the trial button shows below, as before). */
export const LOCK_TRIAL_LINE = `Try the ${BOARD_PASS_NAME} free for 7 days.`;

/** The one quiet way out. */
export const CONTINUE_WITH_BASIC = "Continue with Basic";
