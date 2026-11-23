/**
 * LIVE-FIX-1 #5 - OWNER RULING (23 Nov 2026, 23:05 IST): on a Chapter Test and a Full Mock (Test Series full-length papers
 * included - they are Full Mocks), a written question whose answer was NOT FOUND on the uploaded pages counts as
 * "Not attempted · 0", like a CBSE board paper - not "not marked yet / add the missing page". It stays in the paper's total
 * (so the score is final, X / 80), and the result shows ONE helper line: "If you answered these, add the page".
 *
 * ONLY "not found on the pages" moves. A page or option that could not be READ, an answer to a different question
 * (answer-mismatch) and a question the server did not grade stay "not marked yet", exactly as before.
 *
 * WHERE: applied ONCE, in `buildChapterTestResponse` (services/chapterTestGradeService.ts) - the one builder of the unified
 * response that Chapter Test and Full Mock (`buildFullMockResponse`) share. Everything downstream reads that response: the
 * scorecard, the graded-sheet PDF, the device cache, the stored per-question payload a re-open reads, and the SessionRecord
 * (`buildChapterTestSessionRecord` / `buildFullMockSessionRecord` decide status from `gradedCount` / `pendingCount`, so the
 * record is "graded" when nothing else is unmarked, and the board trend / estimate count it). The grader, its prompts, the
 * server's counts and charges, and the Worksheet / Quick Practice / Answer Checker surfaces are untouched.
 *
 * Mistake Intelligence: the row is not attempted (its whole loss is in the `unattempted` bucket), never a mistake; the grade
 * service feeds MI from the grader's own rows, where it is still not graded, so no entry and no attempt is written for it.
 */
import type { WorksheetQuestionGrade } from "../ai/aiClient";
import { isGradedQuestion, isNotFoundOnPages, objectiveMarksLost } from "./mistakeDisplay";

/** The per-question line on the scorecard's graded sheet and the PDF. */
export const NOT_FOUND_NOT_ATTEMPTED_NOTE = "Not attempted · 0 — your answer to this question was not found on the pages you uploaded.";

/** The ONE helper line (owner copy). One question reads "this" instead of "these". */
export function notFoundAddPageLine(count: number): string {
  return count === 1 ? "If you answered this, add the page" : "If you answered these, add the page";
}

/** The add-page action's label. */
export const NOT_FOUND_ADD_PAGE_ACTION = "Add the page";

/** One not-found row as a GRADED "Not attempted · 0" row. Anything else is returned unchanged. PURE. */
export function asNotFoundNotAttempted(row: WorksheetQuestionGrade): WorksheetQuestionGrade {
  if (!isNotFoundOnPages(row)) return row;
  const total = Number(row.totalMarks) || 0;
  // Drop every not-graded marker; keep the row's identity and its client stamps (section, format, topic).
  const { couldNotRead: _c, notGraded: _n, note: _note, answerMismatch: _a, objectiveResolved: _o, ...rest } = row as WorksheetQuestionGrade & Record<string, unknown>;
  const { _reason: _r, ...keep } = rest as Record<string, unknown>;
  return {
    ...(keep as Omit<WorksheetQuestionGrade, "couldNotRead">),
    qNumber: row.qNumber,
    couldNotRead: false,
    ok: true,
    totalMarks: total,
    marksAwarded: 0,
    percentage: 0,
    annotatedSteps: [],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: NOT_FOUND_NOT_ATTEMPTED_NOTE,
    marksLostByType: objectiveMarksLost({ totalMarks: total, marksAwarded: 0, attempted: false }),
    notFoundOnPages: true,
  };
}

/**
 * The written rows of one upload, with every not-found row counted as "Not attempted · 0" - but ONLY when the sheet was really
 * read: at least one written question was graded from it. When NOTHING was found or graded (the wrong pages, say), every row
 * stays "not marked yet" so a wrong upload is never turned into a final 0. PURE.
 */
export function notFoundAsNotAttempted(rows: ReadonlyArray<WorksheetQuestionGrade>): WorksheetQuestionGrade[] {
  if (!rows.some((r) => isGradedQuestion(r))) return [...rows];
  return rows.map(asNotFoundNotAttempted);
}

/** A row this rule counted as "Not attempted · 0". */
export function isNotFoundNotAttempted(row: { notFoundOnPages?: unknown } | null | undefined): boolean {
  return !!row && row.notFoundOnPages === true && isGradedQuestion(row as WorksheetQuestionGrade);
}

/** The question numbers this rule counted as "Not attempted · 0", in paper order. PURE. */
export function notFoundNotAttemptedQNumbers(rows: ReadonlyArray<WorksheetQuestionGrade> | null | undefined): number[] {
  return (rows ?? []).filter((r) => isNotFoundNotAttempted(r)).map((r) => r.qNumber).sort((a, b) => a - b);
}
