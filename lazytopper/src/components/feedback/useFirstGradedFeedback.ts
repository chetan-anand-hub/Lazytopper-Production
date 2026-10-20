/**
 * useFirstGradedFeedback — FIRST-FEEDBACK-1's moment (owner ruling 20 Oct 2026): ask
 * "Was this useful?" right after a student's first graded scorecard is on screen.
 *
 * Mounted by the ONE shared <ResultsScorecard> shell, so every graded surface reaches it
 * through the same line. A host opts in with `askFirstFeedback` ONLY on its LIVE,
 * just-graded scorecard — never on a stored re-open (history), never inside the tutor
 * overlay — and the shell passes the variant's score here.
 *
 * ★ NEVER BLOCKS OR DELAYS THE SCORECARD. The scorecard renders first and is untouched;
 * this effect only schedules a fire-and-forget request after a fixed pause (a constant,
 * never random) so the student sees their score before the card appears. The card has
 * no scrim and closes with one tap.
 *
 * ★ ONCE EVER, SIGNED-IN ONLY. The host resolves the uid from Firebase Auth (signed-out /
 * anonymous -> nothing) and `claimFeedbackMoment` records `first_graded` on the device
 * BEFORE the card renders, so it is never asked twice for that student on that device.
 */
import { useEffect } from "react";
import type { ScorecardScore } from "../results/scorecardVariants";
import { notifyFirstGradedResult } from "./feedbackPromptHost";

/** The pause between the scorecard appearing and the question appearing. */
export const FIRST_GRADED_DELAY_MS = 1500;

export interface FirstGradedInput {
  /** The host opted in (a LIVE, just-graded scorecard outside the tutor overlay). */
  ask: boolean | undefined;
  /** The variant is a deferred stub or every question is still pending. */
  deferred: boolean | undefined;
  allPending: boolean;
  score: ScorecardScore;
}

/**
 * Pure: is this a REAL graded result worth asking about? A marks score with a positive
 * total, or an attempts score with at least one checked MCQ. A 0-attempted session, an
 * all-pending paper and a deferred stub are not results, so nothing is asked.
 */
export function isFirstGradedEligible(input: FirstGradedInput): boolean {
  if (input.ask !== true || input.deferred || input.allPending) return false;
  const s = input.score;
  if (s.kind === "marks") return Number.isFinite(s.total) && s.total > 0 && Number.isFinite(s.awarded) && s.awarded >= 0;
  return Number.isFinite(s.mcqAnswered) && s.mcqAnswered > 0;
}

export function useFirstGradedFeedback(input: FirstGradedInput): void {
  const eligible = isFirstGradedEligible(input);
  useEffect(() => {
    if (!eligible) return;
    const t = setTimeout(notifyFirstGradedResult, FIRST_GRADED_DELAY_MS);
    return () => clearTimeout(t);
  }, [eligible]);
}
