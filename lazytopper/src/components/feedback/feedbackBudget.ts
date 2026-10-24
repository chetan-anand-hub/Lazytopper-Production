/**
 * feedbackBudget — the ONE place FEEDBACK-2 asks "may a mascot appear for this card right now?".
 *
 * The owner's H3 rule (mascot guide, approved 23 Oct 2026): at most 3 UNPROMPTED mascot appearances
 * per session. The director that counts them is MOMENTS-3's `components/guide/mascotBudget.ts`
 * (`requestAppearance` / `noteShown`), which is not on this branch's trunk yet. Rather than wait for
 * it or build a second counter, the card talks to THIS tiny adapter only, so wiring the real budget
 * later is a five-line change in this file and nothing else moves.
 *
 *   feedbackMayAppear()  — may the card appear (with Ziggy) now? Called BEFORE the device record is
 *                          claimed, so a "no" costs the student nothing (the ask can come later).
 *   noteFeedbackShown()  — the card appeared WITH Ziggy. Called once, after it rendered. A card shown
 *                          plain (mascots hidden, or another mascot already on screen) is not a mascot
 *                          appearance and is never noted.
 *
 * TODO(MOMENTS-3): replace the two bodies with `requestAppearance(...)` / `noteShown(...)` from
 * ../guide/mascotBudget once PR #1341 has merged (feedback card = an UNPROMPTED appearance at
 * scorecard priority). Until then the budget is not enforced here: both functions are no-ops.
 */

/** TODO(MOMENTS-3): ask the shared director. Today: always yes. */
export function feedbackMayAppear(): boolean {
  return true;
}

/** TODO(MOMENTS-3): tell the shared director a mascot appeared. Today: nothing. */
export function noteFeedbackShown(): void {
  /* intentionally empty until MOMENTS-3 lands */
}
