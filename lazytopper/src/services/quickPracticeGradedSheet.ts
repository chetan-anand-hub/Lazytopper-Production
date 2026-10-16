// src/services/quickPracticeGradedSheet.ts
//
// QP-GRADED-SHEET-1 — the Quick Practice "Download graded answer sheet" (owner ask, 17 Oct 2026:
// "the product behaviour will be uniform"). Quick Practice follows the SAME pattern Chapter Test
// and Full Mock already use: the scorecard's grade response, plus the set's own questions as a
// `PersistedWorksheet`, rendered by the SHARED `WorksheetGradedPrintDoc` through the SHARED
// `exportGradedWorksheetPdf` (worksheetPdfExport.ts). No new print doc, no new PDF path.
//
// ★ DISPLAY / EXPORT ONLY. Nothing here grades, scores, types a mistake or records anything. Every
//   number in the sheet is the response the scorecard already shows (a snapshot, never a re-grade).
// ★ HONEST-OR-ABSENT. A response with nothing graded has no sheet (`null`), so the host offers no
//   download — the affordance never promises a sheet it cannot produce.

import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../ai/aiClient";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "./worksheetSessionStore";
import {
  type GradeState,
  type NotGradedReason,
  coachingLine,
  effectivePaperCounts,
  gradeStateOf,
  isQuestionNotAttempted,
  paperMarksLost,
  pendingBreakdown,
} from "../lib/mistakeDisplay";

/** One question of the DISPLAYED set, in displayed order (index i ⇒ qNumber i + 1). A bank row or a
 *  live PracticeQuestion satisfies it structurally; a reopened set whose bank row could not load
 *  passes just `{ id }` (the sheet then shows the stored result without the question text). */
export interface QuickPracticeSheetQuestion {
  id: string | number;
  marks?: number | string | null;
  questionText?: string | null;
  section?: string | null;
  topicKey?: string | null;
  topicLabel?: string | null;
  options?: unknown;
  solutionSteps?: unknown;
  finalAnswer?: unknown;
  answer?: unknown;
}

/** Exactly the arguments `exportGradedWorksheetPdf` takes. */
export interface QuickPracticeGradedSheet {
  ws: PersistedWorksheet;
  response: WorksheetGradeResponse;
  name: string;
  code: string;
  coaching: string;
  /** The sheet header's surface word (the shared doc defaults to "Worksheet"). */
  kindLabel: string;
}

/** The header word on a Quick Practice sheet. */
export const QUICK_PRACTICE_SHEET_KIND = "Quick Practice";

/** QP-GRADED-SHEET-1 — whether a QP grade response has a graded sheet at all: at least one
 *  question came back graded (a tapped MCQ or a checked written answer). */
export function quickPracticeHasGradedSheet(response: WorksheetGradeResponse | null | undefined): boolean {
  return !!response && response.ok === true && Array.isArray(response.results) && response.results.length > 0
    && (Number(response.gradedCount) || 0) >= 1;
}

/** One answer the written-answer scorecard lists as NOT graded (it has no mark). `state` is the
 *  scorecard's own grade state; `reason` the server's notGraded reason for a "not-graded" row. */
export interface QuickPracticeUngradedRow {
  qNumber: number;
  totalMarks: number;
  state: Exclude<GradeState, "graded">;
  reason?: NotGradedReason | null;
}

/**
 * QP-GRADED-SHEET-1 (review fix 1) — the written-answer scorecard lists answers the grader did NOT
 * grade (could not read, unread option, answer does not match, not graded this time, over the
 * photo cap). `buildQuickPracticeResponse` omits them (they are never scored and never recorded),
 * so the sheet adds them back as NON-SCORED rows in the flags the shared print doc already reads:
 * no mark, no mistake type, counted in `pendingCount` (as the server counts every not-graded
 * answer), so the doc prints its pending lines and never "All N questions read and graded".
 * DISPLAY ONLY: the totals and `gradedCount` are untouched; a qNumber that already has a result
 * keeps it. Never written anywhere.
 */
export function withQuickPracticeUngradedRows(
  response: WorksheetGradeResponse,
  rows: ReadonlyArray<QuickPracticeUngradedRow>,
): WorksheetGradeResponse {
  const have = new Set(response.results.map((r) => r.qNumber));
  const added: WorksheetQuestionGrade[] = [];
  for (const row of rows) {
    if (have.has(row.qNumber)) continue;
    have.add(row.qNumber);
    const base: WorksheetQuestionGrade = { qNumber: row.qNumber, couldNotRead: false, totalMarks: Number(row.totalMarks) || 0 };
    if (row.state === "could-not-read") added.push({ ...base, couldNotRead: true });
    else if (row.state === "unread-option") added.push({ ...base, objectiveResolved: false });
    else if (row.state === "answer-mismatch") added.push({ ...base, answerMismatch: true });
    // The server's own reason, as the scorecard shows it (`notGradedReasonOf` reads every reason,
    // "interrupted" included, which the wire type predates).
    else added.push({ ...base, notGraded: (row.reason ?? "error") as WorksheetQuestionGrade["notGraded"] });
  }
  if (added.length === 0) return response;
  return {
    ...response,
    results: [...response.results, ...added].sort((a, b) => a.qNumber - b.qNumber),
    pendingCount: (Number(response.pendingCount) || 0) + added.length,
  };
}

function strings(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.map((s) => String(s ?? "")).filter((s) => s.trim()) : undefined;
}
function text(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

/**
 * Build the graded-sheet arguments for a Quick Practice set, or null when nothing was graded.
 *
 * `note` is the scorecard's OWN note (`variant.note` — e.g. the tap-the-answer sentence), passed
 * through verbatim and appended to the coaching footer, so the sheet says what the scorecard said
 * and nothing more. The coaching line itself is the ONE shared `coachingLine` every other surface's
 * graded sheet prints.
 */
export function buildQuickPracticeGradedSheet(args: {
  questions: ReadonlyArray<QuickPracticeSheetQuestion | null | undefined>;
  response: WorksheetGradeResponse | null | undefined;
  name: string;
  code: string;
  subject: string;
  grade?: string;
  /** ISO date printed on the sheet (the grade time for a live set, `gradedAt` for a reopen). */
  createdAt: string;
  note?: string | null;
}): QuickPracticeGradedSheet | null {
  const { questions, response, name, code, subject, grade = "10", createdAt, note } = args;
  if (!response || !quickPracticeHasGradedSheet(response)) return null;

  const totalByQ = new Map<number, number>(response.results.map((r) => [r.qNumber, Number(r.totalMarks) || 0]));
  // Review fix 2 — the sheet's questions are the ones ON the sheet (a row in the response), so the
  // header's count and marks describe what the student is reading, never the unattempted rest.
  const allQuestions: PersistedWorksheetQuestion[] = questions.map((q, i) => {
    const qNumber = i + 1;
    const marks = Number(q?.marks);
    return {
      qNumber,
      id: String(q?.id ?? ""),
      subject,
      topicKey: String(q?.topicKey ?? ""),
      topicLabel: String(q?.topicLabel ?? ""),
      section: String(q?.section ?? ""),
      marks: Number.isFinite(marks) && marks > 0 ? marks : totalByQ.get(qNumber) ?? 0,
      questionText: String(q?.questionText ?? ""),
      ...(strings(q?.options) ? { options: strings(q?.options) } : {}),
      ...(strings(q?.solutionSteps) ? { solutionSteps: strings(q?.solutionSteps) } : {}),
      ...(text(q?.finalAnswer) ? { finalAnswer: text(q?.finalAnswer) } : {}),
      ...(text(q?.answer) ? { answer: text(q?.answer) } : {}),
    };
  });
  const wsQuestions = allQuestions.filter((q) => totalByQ.has(q.qNumber));

  const coaching = [
    coachingLine({
      marksAwarded: response.gradedMarksAwarded,
      marksTotal: response.gradedMarksTotal,
      counts: effectivePaperCounts(response.results),
      marks: paperMarksLost(response.results)?.byType ?? null,
      mismatchCount: response.results.filter((r) => gradeStateOf(r) === "answer-mismatch").length,
      notGradedCount: pendingBreakdown(response.results, response.pendingCount).notGraded,
      pendingCount: response.pendingCount,
      notAttemptedCount: response.results.filter((r) => isQuestionNotAttempted(r)).length,
    }),
    note ?? "",
  ].filter((s) => s.trim()).join(" ");

  // Re-review nit — ONE total for the sheet: the header and the pending line's "worth N marks"
  // both use the marks of the questions ON the sheet, never the whole displayed set's.
  const sheetTotalMarks = wsQuestions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  return {
    ws: {
      worksheetId: `qp:${code}`,
      createdAt,
      title: name,
      subject,
      grade,
      sectionFilter: "All",
      totalMarks: sheetTotalMarks,
      questions: wsQuestions,
      code,
      name,
    },
    response: { ...response, worksheetTotalMarks: sheetTotalMarks },
    name,
    code,
    coaching,
    kindLabel: QUICK_PRACTICE_SHEET_KIND,
  };
}

/** Download it through the SHARED graded-sheet export (imported on click, as Check & Improve does,
 *  so the PDF libraries never load with the practice page). */
export async function downloadQuickPracticeGradedSheet(sheet: QuickPracticeGradedSheet): Promise<string> {
  const { exportGradedWorksheetPdf } = await import("../components/worksheet/worksheetPdfExport");
  return exportGradedWorksheetPdf(sheet);
}
