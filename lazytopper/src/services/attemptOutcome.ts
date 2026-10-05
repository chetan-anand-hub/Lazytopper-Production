/*
 * attemptOutcome — what ONE stored attempt says about a chapter's weak-area accuracy.
 *
 * SCORECARD-MI-1 PR-2 (H7, GA-21) — superseded by owner ruling 2026-10-05 (taxonomy and
 * wording; marks not counts): only KNOWLEDGE-GAP marks lower a chapter's accuracy toward a weak
 * area. A careless-only (calculation + silly) or exam-technique-only (presentation) loss means
 * the student knows the topic; it never pushes the chapter toward "weak". Before this, the
 * weak-area accuracy read `correct = scored >= available`, so half a mark lost to a slip counted
 * exactly like a concept the student did not know.
 *
 * Pure and dependency-free apart from lib/mistakeDisplay (itself pure), so the CI ops matrix
 * proves the rule by transpiling and calling THIS function (check_improve_convergence
 * acceptance), never by re-deriving it.
 */
import { entryMarksLost } from "../lib/mistakeDisplay";

/** The stored-attempt fields the rule reads (PracticeAttempt is structurally compatible). */
export interface WeakAreaAttemptLike {
  /** Full marks — the legacy binary view, kept for every attempt. */
  correct?: boolean;
  marksScored?: number;
  marksAvailable?: number;
  /** H11 — every lost mark was "not attempted" (the MI front door's own decision). */
  notAttempted?: boolean;
  /** v2 marks per bucket — read ONLY with the version below (an old attempt is never given marks). */
  marksLostByType?: unknown;
  marksLostByTypeVersion?: unknown;
}

/**
 * - "gap"   — counts against the chapter (a knowledge-gap mark was lost);
 * - "knows" — counts FOR it (full marks, or the only losses were careless / exam technique);
 * - "skip"  — not evidence either way (nothing was attempted, or the loss has no recorded reason):
 *             left out of the accuracy, never guessed into a gap or a strength.
 */
export type WeakAreaOutcome = "gap" | "knows" | "skip";

export function attemptWeakAreaOutcome(a: WeakAreaAttemptLike): WeakAreaOutcome {
  const scored = Number(a.marksScored) || 0;
  // Nothing written: not a mistake and not a strength.
  if (a.notAttempted === true && scored <= 0) return "skip";
  const marks = entryMarksLost(a);
  if (marks) {
    if (marks.conceptual > 0) return "gap";
    // A loss with no recorded reason is unknown — never assumed careless, never assumed a gap.
    if (marks.untyped > 0) return "skip";
    return "knows";
  }
  // Count-only (every attempt written before PR-2, and every v1 grade): unchanged — never
  // converted, never given invented marks.
  return a.correct ? "knows" : "gap";
}
