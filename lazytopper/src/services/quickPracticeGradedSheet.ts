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

import type { WorksheetGradeResponse } from "../ai/aiClient";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "./worksheetSessionStore";
import {
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
}

/** The pick a QP result carries, or null. Only Quick Practice results ever carry one. */
function pickOf(entry: unknown): string | null {
  const raw = entry && typeof entry === "object" ? (entry as { pickedOption?: unknown }).pickedOption : null;
  const text = typeof raw === "string" ? raw.trim() : "";
  return text ? text : null;
}

/** QP-GRADED-SHEET-1 — whether a QP grade response has a graded sheet at all: at least one
 *  question came back graded (a tapped MCQ or a checked written answer). */
export function quickPracticeHasGradedSheet(response: WorksheetGradeResponse | null | undefined): boolean {
  return !!response && response.ok === true && Array.isArray(response.results) && response.results.length > 0
    && (Number(response.gradedCount) || 0) >= 1;
}

/** The live set's picks beside their results (the SAME join `persistQuickPracticeSession` writes
 *  to the stored payload), so the live sheet and a reopened one say "Your answer" alike. Pure;
 *  marks and mistake data pass through untouched; a result with no pick is the same object. */
export function withQuickPracticePicks(
  response: WorksheetGradeResponse,
  entries: ReadonlyArray<{ pickedOption?: string } | null | undefined>,
): WorksheetGradeResponse {
  if (!entries.some((e) => pickOf(e))) return response;
  return {
    ...response,
    results: response.results.map((r) => {
      if (pickOf(r)) return r;
      const pick = pickOf(entries[r.qNumber - 1]);
      return pick ? { ...r, pickedOption: pick } : r;
    }),
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
  const wsQuestions: PersistedWorksheetQuestion[] = questions.map((q, i) => {
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

  return {
    ws: {
      worksheetId: `qp:${code}`,
      createdAt,
      title: name,
      subject,
      grade,
      sectionFilter: "All",
      totalMarks: Number(response.worksheetTotalMarks) || wsQuestions.reduce((s, q) => s + q.marks, 0),
      questions: wsQuestions,
      code,
      name,
    },
    response,
    name,
    code,
    coaching,
  };
}

/** Download it through the SHARED graded-sheet export (imported on click, as Check & Improve does,
 *  so the PDF libraries never load with the practice page). */
export async function downloadQuickPracticeGradedSheet(sheet: QuickPracticeGradedSheet): Promise<string> {
  const { exportGradedWorksheetPdf } = await import("../components/worksheet/worksheetPdfExport");
  return exportGradedWorksheetPdf(sheet);
}
