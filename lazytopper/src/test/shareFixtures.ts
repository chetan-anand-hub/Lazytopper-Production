import type { ScorecardVariant } from "../components/results/scorecardVariants";

/**
 * SHARE-CARD-1 - synthetic scorecard variants for the share-image tests (TYPES-only import of
 * scorecardVariants). Each mirrors the shape a real builder emits for its surface; the numbers
 * are invented test data, never a student's.
 */
const base = (over: Partial<ScorecardVariant>): ScorecardVariant => ({
  surface: "worksheet",
  title: "Real Numbers · Worksheet 3",
  subtitle: "WS-M-RN-03 · graded just now",
  score: { kind: "marks", awarded: 14, total: 20, gradedCount: 8, totalQuestions: 8 },
  actions: [{ label: "Read my graded answer sheet", tag: "Sheet", tone: "primary", onClick: () => {} }],
  ...over,
});

const ml = (b: { conceptual: number; calculation: number; silly: number; presentation: number; unattempted: number; untyped: number }) => ({
  byType: b,
  lost: Math.round(Object.values(b).reduce((s, v) => s + v, 0) * 100) / 100,
  unsplitCount: 0,
});

/** All four types lost marks; silly slips are the biggest loss (3 marks). 14/20 -> mixed. */
export const FX_FOUR_TYPES = base({
  fourType: { conceptual: 2, calculation: 1, silly: 3, presentation: 1 },
  marksLost: ml({ conceptual: 1.5, calculation: 0.5, silly: 3, presentation: 0.5, unattempted: 0.5, untyped: 0 }),
});

/** Full marks: every count and every mark lost is 0 (shown as 0). 40/40 -> great. */
export const FX_ALL_ZERO = base({
  surface: "chapter-test",
  title: "Light · Test #2",
  subtitle: "CT-S-LI-02 · graded just now",
  score: { kind: "marks", awarded: 40, total: 40, gradedCount: 12, totalQuestions: 12 },
  fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  marksLost: ml({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0 }),
});

/** Quick Practice MCQ-only: one mark per MCQ, no typed mistakes (tap answers record no why). */
export const FX_OBJECTIVE_ONLY = base({
  surface: "quick-practice",
  title: "Session scorecard",
  subtitle: "Quick practice",
  score: { kind: "marks", awarded: 3, total: 5, gradedCount: 5, totalQuestions: 6 },
  fourType: null,
  marksLost: null,
  wrongAnswers: [
    { label: "Question 2", yourAnswer: "SECRET-PICK", correctAnswer: "(b)", steps: ["SECRET-STEP"] },
    { label: "Question 4", yourAnswer: "SECRET-PICK", correctAnswer: "(d)", steps: [] },
  ],
});

/** Check & Improve multi-question upload with 2 questions NOT graded (pending): the score and
 *  the MI figures are over the GRADED questions only. */
export const FX_PENDING = base({
  surface: "check-improve",
  title: "Check & Improve paper",
  subtitle: "Triangles · CI-M-TR-01 · graded just now",
  score: { kind: "marks", awarded: 6, total: 10, gradedCount: 3, totalQuestions: 5 },
  pending: { count: 2, worksheetTotalMarks: 17 },
  fourType: { conceptual: 0, calculation: 2, silly: 0, presentation: 0 },
  marksLost: ml({ conceptual: 0, calculation: 2, silly: 0, presentation: 0, unattempted: 0, untyped: 2 }),
});

/** A great result: 38/40, a silly slip and a presentation slip. */
export const FX_GREAT = base({
  surface: "chapter-test",
  title: "Light · Test #2",
  subtitle: "CT-S-LI-02 · graded just now",
  score: { kind: "marks", awarded: 38, total: 40, gradedCount: 12, totalQuestions: 12 },
  fourType: { conceptual: 0, calculation: 0, silly: 1, presentation: 1 },
  marksLost: ml({ conceptual: 0, calculation: 0, silly: 1, presentation: 1, unattempted: 0, untyped: 0 }),
});

/** A low result: 30/80 on a full mock, concept gaps the biggest loss. */
export const FX_LOW = base({
  surface: "full-mock",
  title: "Maths · Mock #4",
  subtitle: "FM-M-04 · fully graded",
  score: { kind: "marks", awarded: 30, total: 80, gradedCount: 38, totalQuestions: 38 },
  fourType: { conceptual: 9, calculation: 4, silly: 5, presentation: 6 },
  marksLost: ml({ conceptual: 30, calculation: 8, silly: 6, presentation: 6, unattempted: 0, untyped: 0 }),
});

/** Blank answers are the biggest loss: Ziggy hides. */
export const FX_HIDE = base({
  surface: "full-mock",
  title: "Science · Mock #2",
  subtitle: "FM-S-02 · fully graded",
  score: { kind: "marks", awarded: 30, total: 80, gradedCount: 39, totalQuestions: 39 },
  fourType: { conceptual: 3, calculation: 2, silly: 2, presentation: 2 },
  marksLost: ml({ conceptual: 10, calculation: 5, silly: 3, presentation: 2, unattempted: 30, untyped: 0 }),
});

/** A count-only (older) grade: types counted, no marks per type. */
export const FX_COUNT_ONLY = base({
  fourType: { conceptual: 1, calculation: 0, silly: 2, presentation: 0 },
  marksLost: null,
});

/** Check & Improve SINGLE question (the single-question path's variant). */
export const FX_CI_SINGLE = base({
  surface: "check-improve",
  title: "Check & Improve paper",
  subtitle: "Quadratic Equations · CI-M-QE-01 · graded just now",
  score: { kind: "marks", awarded: 2, total: 3, gradedCount: 1, totalQuestions: 1 },
  fourType: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
  marksLost: ml({ conceptual: 0, calculation: 1, silly: 0, presentation: 0, unattempted: 0, untyped: 0 }),
});

/** Quick Practice, 3 of 10 MCQs answered, all 3 right: the app shows "3 / 3 across 3 of 10
 *  questions graded". The image must not read as a whole, board-ready result. */
export const FX_PARTIAL_QP = base({
  surface: "quick-practice",
  title: "Session scorecard",
  subtitle: "Quick practice",
  score: { kind: "marks", awarded: 3, total: 3, gradedCount: 3, totalQuestions: 10 },
  fourType: null,
  marksLost: null,
});

/** Most marks lost with NO recorded reason (a v2 paper with locally scored rows). */
export const FX_UNTYPED_BIGGEST = base({
  surface: "chapter-test",
  title: "Light · Test #2",
  subtitle: "CT-S-LI-02 · graded just now",
  score: { kind: "marks", awarded: 30, total: 40, gradedCount: 12, totalQuestions: 12 },
  fourType: { conceptual: 1, calculation: 0, silly: 1, presentation: 0 },
  marksLost: ml({ conceptual: 2, calculation: 0, silly: 1, presentation: 0, unattempted: 0, untyped: 7 }),
});

export const ALL_SHARE_FIXTURES: Record<string, ScorecardVariant> = {
  FX_PARTIAL_QP,
  FX_UNTYPED_BIGGEST,
  FX_FOUR_TYPES,
  FX_ALL_ZERO,
  FX_OBJECTIVE_ONLY,
  FX_PENDING,
  FX_GREAT,
  FX_LOW,
  FX_HIDE,
  FX_COUNT_ONLY,
  FX_CI_SINGLE,
};

/** Every number a variant itself carries (score, counts, marks, derived right/wrong). */
export function numbersCarriedBy(v: ScorecardVariant): Set<number> {
  const out = new Set<number>();
  if (v.score.kind === "marks") {
    out.add(v.score.awarded);
    out.add(v.score.total);
    out.add(v.score.total - v.score.awarded);
    if (v.score.gradedCount != null) out.add(v.score.gradedCount);
    if (v.score.totalQuestions != null) out.add(v.score.totalQuestions);
  }
  for (const n of Object.values(v.fourType ?? {})) out.add(Number(n));
  for (const n of Object.values(v.marksLost?.byType ?? {})) out.add(Number(n));
  return out;
}
