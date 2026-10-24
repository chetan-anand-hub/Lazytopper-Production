/**
 * feedbackBudget - the ONE place FEEDBACK-2's card talks to the mascot director
 * (`components/guide/mascotBudget.ts`, MOMENTS-3; owner H3: at most 3 UNPROMPTED mascot appearances
 * per browser session).
 *
 * The "Was this useful?" card is an UNPROMPTED appearance at SCORECARD priority. The budget limits the
 * CHARACTER, never the QUESTION: with no slot left the same card, words and buttons show PLAIN.
 *
 *   useFeedbackAppearance(wanted)  reserves a slot while `wanted` (before paint) and gives it back on
 *                                  unmount or when no longer wanted. Returns the appearance KEY once the
 *                                  reservation is confirmed (draw Ziggy only then), else null. Hidden
 *                                  mascots -> always null, nothing counted. StrictMode's double mount
 *                                  keeps ONE occurrence, so it never counts twice.
 *   FeedbackShownNote              render-nothing sibling placed INSIDE the Suspense around Ziggy's
 *                                  drawing: its effect runs only once he has actually committed, and it
 *                                  spends the slot the key holds (a refused door can never spend).
 */
import { APPEARANCE_PRIORITY, NoteShown, useAppearance } from "../guide/mascotBudget";

/** The kind recorded in this tab's budget list (a kind name only - no uid, no mark). */
export const FEEDBACK_APPEARANCE_KIND = "feedback:graded";

export function useFeedbackAppearance(wanted: boolean): string | null {
  return useAppearance(wanted ? FEEDBACK_APPEARANCE_KIND : null, APPEARANCE_PRIORITY.scorecard);
}

export const FeedbackShownNote = NoteShown;
