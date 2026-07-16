// Shared session-stats shape for a Quick Practice set.
//
// The mid-session progress *bar* that used to live here (the "This session only ·
// N/M tried · MCQ answers: 0/5" footer) was retired in favour of the deliberate
// end-of-session scorecard rendered on set completion in PracticePage. The bar's
// "MCQ answers" label was correct-count mislabeled as answered, so it was removed
// rather than kept. Only the shared type remains.

export interface SessionStats {
  total: number;
  /** Questions the student actually ANSWERED — an MCQ click OR a graded written answer.
   *  Both count; neither is inferred. */
  attemptedInSet: number;
  localMcqAnswered: number;
  localMcqCorrect: number;
}
// `markedUnderstood` / `needsAnotherLook` were removed with the self-assess mechanic
// (2026-07-15). They were computed from `selfAssessments` and read by NOTHING — already
// dead fields on a dead mechanic. See [FU-DELETE-DEAD-SELF-ASSESS] in the handoff.
