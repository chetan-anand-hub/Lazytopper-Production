/**
 * gradedAnswerAssembly - the ONE place a `ScorecardGradedAnswer` is built.
 *
 * WHY THIS MODULE EXISTS (Wave MI-INTEGRITY-8, lane U1 / GRADED-STEP-BLOCK).
 * Until this file, the only assembly of `ScorecardGradedAnswer[]` in the product lived
 * inside `pages/PracticePage.tsx`. That made the graded answer sheet a Quick-Practice-only
 * surface: `chapterTestScorecardVariant` and `fullMockScorecardVariant` never emitted
 * `gradedAnswers` at all, so the shell's `GradedSheetBlock` could not mount for Chapter
 * Test or Full Mock however the shell was written.
 *
 * The assembly was LIFTED here rather than copied. A page component is not an import
 * target for two other pages - the next lane reads that as accidental coupling and is
 * right to. `PracticePage.tsx` is now a CALL SITE of this module, exactly like Chapter
 * Test and Full Mock.
 *
 * ONE SHAPE, NOT TWO. Per-step data is carried as `CheckSolutionAnnotatedStep`
 * (`src/ai/aiClient.ts`), the shape the two existing per-step renderers already consume -
 * `StepRow` (components/worksheet/WorksheetGradePanel.tsx) and `AnnotatedStepRow`
 * (pages/desktop/DesktopCheckImprovePage.tsx). No parallel step type is defined here, and
 * none should be.
 */
import type {
  CheckSolutionAnnotatedStep,
  CheckSolutionMistakeSummary,
  WorksheetGradeResponse,
  WorksheetQuestionGrade,
} from "../ai/aiClient";
import type { ScorecardGradedAnswer, ScorecardMistakeKind } from "../components/results/scorecardVariants";

/** The student-facing chip text for a mistake kind. */
export const MISTAKE_KIND_LABEL: Record<ScorecardMistakeKind, string> = {
  conceptual: "Concept gap",
  calculation: "Calculation",
  silly: "Silly slip",
  presentation: "Presentation",
};

/** PURE. The single mistake kind to badge one answer with: the one the grader counted
 *  most. Ties resolve in CBSE severity order (a concept gap outranks a slip). Returns
 *  null when the grader reported NO mistakes - honest silence, never a default chip. */
export const dominantMistakeKind = (
  summary: CheckSolutionMistakeSummary | null | undefined,
): ScorecardMistakeKind | null => {
  if (!summary) return null;
  const order: ScorecardMistakeKind[] = ["conceptual", "calculation", "silly", "presentation"];
  let best: ScorecardMistakeKind | null = null;
  let bestN = 0;
  for (const kind of order) {
    const n = Number(summary[kind]) || 0;
    if (n > bestN) { best = kind; bestN = n; }
  }
  return best;
};

/** PURE. The teacher's line for where the mark went: the annotation on the FIRST step
 *  that lost something. Null when every step was clean - the shell then renders no
 *  "where the mark went" block at all rather than an empty one. */
export const firstMistakeDetail = (
  steps: CheckSolutionAnnotatedStep[] | null | undefined,
): string | null => {
  if (!Array.isArray(steps)) return null;
  for (const step of steps) {
    const lost = (Number(step?.marksDeducted) || 0) > 0 || step?.status === "incorrect" || step?.status === "partial" || step?.status === "missing";
    const note = String(step?.teacherAnnotation || "").trim();
    if (lost && note) return note;
  }
  return null;
};

/** PURE. Sort key for a graded-sheet row, from its "Question N" label - so the sheet
 *  reads in DISPLAYED order even though the ungraded rows are appended last. */
export const gradedAnswerOrder = (label: string): number => {
  const m = /(\d+)/.exec(String(label || ""));
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
};

/** PURE. The option LETTER for a piece of option text ("b"), or null when the text is
 *  not one of the options. Never guesses - an unresolvable pick renders no letter. */
export const optionLetter = (
  options: readonly string[] | null | undefined,
  text: string | null | undefined,
): string | null => {
  if (!Array.isArray(options) || options.length === 0) return null;
  const want = String(text ?? "").trim().toLowerCase();
  if (!want) return null;
  const idx = options.findIndex((o) => String(o ?? "").trim().toLowerCase() === want);
  return idx >= 0 ? String.fromCharCode(97 + idx) : null;
};

/** PURE. Displayed order, ungraded rows included. */
export const sortGradedAnswers = (answers: ScorecardGradedAnswer[]): ScorecardGradedAnswer[] =>
  answers.sort((x, y) => gradedAnswerOrder(x.label) - gradedAnswerOrder(y.label));

/** The honest ungraded row. A question the batch could not grade carries NO mark -
 *  rendering a 0 would be the fabrication (CLAUDE.md section 5). */
export const ungradedAnswer = (
  label: string,
  descriptor: string | null,
  reason: string,
  title: string,
  detail: string,
): ScorecardGradedAnswer => ({ label, descriptor, ungraded: { reason, title, detail } });

/** What one graded answer needs, independent of which surface produced it. */
export interface GradedAnswerSource {
  label: string;
  descriptor?: string | null;
  objective: boolean;
  marksAwarded: number | null | undefined;
  totalMarks: number | null | undefined;
  teacherNote?: string | null;
  mistakeSummary?: CheckSolutionMistakeSummary | null;
  annotatedSteps?: CheckSolutionAnnotatedStep[] | null;
  /** Opt-in per surface. When false the row carries NO steps and the shell renders
   *  exactly what it renders today - the regression guard for Quick Practice, which
   *  shipped this sheet before a step block existed. */
  includeSteps?: boolean;
  /** "Where the mark went" must describe a mark that actually WENT somewhere.
   *
   *  WHY THIS EXISTS: `lostDetail` otherwise falls back to the teacher's overall note, and
   *  that note is ALREADY rendered as the row's `verdict`. On a full-marks answer that
   *  produces the nonsense line "Where the mark went: Fully correct.", and on any answer it
   *  prints the same sentence twice under two different labels. A 1440px screenshot of the
   *  chapter-test sheet is what caught it.
   *
   *  Set by the Chapter Test / Full Mock builder, where this sheet is NEW. Quick Practice
   *  deliberately leaves it unset so its shipped output is byte-identical.
   *  [FU-QP-LOSTDETAIL-DUPLICATES-VERDICT] */
  lostFromStepsOnly?: boolean;
}

/** "3 marks" / "MCQ · 1 mark". */
export const marksDescriptor = (marks: number, objective: boolean): string => {
  const n = Number(marks) || 0;
  const tail = `${n} mark${n === 1 ? "" : "s"}`;
  return objective ? `MCQ · ${tail}` : tail;
};

/**
 * Build ONE graded answer, including the objective binary clamp.
 *
 * THE OBJECTIVE BINARY RULE, ENFORCED BEFORE THE BUILDER SEES IT.
 * `quickPracticeGradedScorecardVariant` THROWS on a fractional objective mark -
 * deliberately. But a throw inside a page render is an ERROR PAGE for the student
 * (App.tsx wraps <Routes> in an ErrorBoundary), so the anomaly is converted here into the
 * honest ungraded state rather than rendered as partial credit OR taken out on the
 * student. [FU-QP-OBJECTIVE-NONBINARY-FROM-SERVER]
 */
export function buildGradedAnswer(src: GradedAnswerSource): ScorecardGradedAnswer {
  const descriptor = src.descriptor ?? null;
  const kind = dominantMistakeKind(src.mistakeSummary);
  const stepDetail = firstMistakeDetail(src.annotatedSteps);
  const detail = src.lostFromStepsOnly ? stepDetail : (stepDetail || src.teacherNote || null);
  const awarded = typeof src.marksAwarded === "number" ? src.marksAwarded : null;
  const available = typeof src.totalMarks === "number" ? src.totalMarks : null;

  if (
    src.objective &&
    typeof awarded === "number" && typeof available === "number" &&
    awarded !== 0 && awarded !== available
  ) {
    return ungradedAnswer(
      src.label, descriptor,
      "objective-mark-not-binary",
      "We could not mark this one reliably",
      "An MCQ is whole mark or nothing, and this came back part-marked. Nothing has been scored for it.",
    );
  }

  // HONEST EMPTY STATE. Steps are attached ONLY when the surface opted in AND the grader
  // actually returned some. An empty array is never attached: `steps: []` and `steps: null`
  // must be indistinguishable to the shell, so "no steps" renders nothing extra rather
  // than an empty panel.
  const steps =
    src.includeSteps && Array.isArray(src.annotatedSteps) && src.annotatedSteps.length > 0
      ? src.annotatedSteps
      : null;

  return {
    label: src.label,
    descriptor,
    awarded,
    available,
    objective: src.objective === true,
    verdict: src.objective
      ? "Whole mark or nothing — MCQs are never step-marked."
      : src.teacherNote || null,
    lostLabel: detail ? (src.objective ? "What your working shows:" : "Where the mark went:") : null,
    lostDetail: detail,
    mistakeType: kind ? MISTAKE_KIND_LABEL[kind] : null,
    mistakeKind: kind,
    steps,
  };
}

/** One question of a Chapter Test / Full Mock paper, as the sheet needs it. */
export interface PaperQuestionForSheet {
  qNumber: number;
  marks?: number | null;
  objective?: boolean | null;
}

/**
 * Build the graded answer sheet for a CHAPTER TEST or FULL MOCK from the unified
 * `WorksheetGradeResponse` both surfaces already carry (`buildChapterTestResponse`, which
 * `fullMockGradeService` re-exports unchanged).
 *
 * This is what makes the sheet reachable on those two surfaces at all - before this lane
 * neither builder emitted `gradedAnswers`, so the shell had nothing to render.
 *
 * `couldNotRead` rows stay honest: no mark, a named reason, never a 0.
 */
export function buildGradedAnswersFromWorksheetResponse(
  response: WorksheetGradeResponse | null | undefined,
  questions?: readonly PaperQuestionForSheet[] | null,
): ScorecardGradedAnswer[] {
  const results: WorksheetQuestionGrade[] = Array.isArray(response?.results) ? response.results : [];
  if (results.length === 0) return [];

  const byNumber = new Map<number, PaperQuestionForSheet>();
  for (const q of questions ?? []) {
    if (q && typeof q.qNumber === "number") byNumber.set(q.qNumber, q);
  }

  const answers: ScorecardGradedAnswer[] = [];
  for (const r of results) {
    const meta = byNumber.get(r.qNumber);
    const objective = (r.objective ?? meta?.objective ?? false) === true;
    const marks = Number(meta?.marks ?? r.totalMarks) || 0;
    const label = `Question ${r.qNumber}`;
    const descriptor = marksDescriptor(marks, objective);

    if (r.couldNotRead) {
      answers.push(ungradedAnswer(
        label, descriptor,
        "could-not-read",
        "We could not read this one",
        r.note || "Your working did not come back readable. Nothing has been scored 0 for it.",
      ));
      continue;
    }

    answers.push(buildGradedAnswer({
      label,
      descriptor,
      objective,
      marksAwarded: r.marksAwarded,
      totalMarks: r.totalMarks,
      teacherNote: r.teacherNote,
      mistakeSummary: r.mistakeSummary,
      annotatedSteps: r.annotatedSteps,
      includeSteps: true,
      lostFromStepsOnly: true,
    }));
  }
  return sortGradedAnswers(answers);
}
