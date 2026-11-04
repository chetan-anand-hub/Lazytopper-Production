// src/services/storedPaperGradedSheet.ts
//
// TUTOR-RETURN-SHEET-1 — the "Download graded answer sheet" on a RESTORED Chapter Test / Full Mock
// scorecard (the card the tutor's back arrow reopens from `?review=<record id>`).
//
// The page re-mounts on that trip, so the live paper + grade state is gone. The sheet is rebuilt
// from what is durable: the stored grade payload (`response`) and the record's own `questionIds`
// (paper order), mapped through the served bank exactly as the Quick Practice reopen does. It is
// printed by the SAME shared `exportGradedWorksheetPdf` / `WorksheetGradedPrintDoc` as the live
// download, with the SAME `coachingLine`.
//
// ★ DISPLAY / EXPORT ONLY. Nothing here grades, scores, types a mistake or writes anything: every
//   number is the stored response, a snapshot, never a re-grade.
// ★ HONEST-OR-ABSENT. A question the bank no longer serves prints its stored result WITHOUT text
//   (never an invented one); a response with nothing graded has no sheet (`hasStoredPaperSheet`).
// ★ BANK-LEAN-1: the bank lookups load on click (dynamic), never with the page chunk.

import type { WorksheetGradeResponse } from "../ai/aiClient";
import type { SessionRecord } from "./sessionRecords";
import type { CanonicalQuestion } from "../data/predictionTypes";
import { buildQuickPracticeGradedSheet, quickPracticeHasGradedSheet } from "./quickPracticeGradedSheet";
import {
  coachingLine,
  effectivePaperCounts,
  gradeStateOf,
  isQuestionNotAttempted,
  paperMarksLost,
  pendingBreakdown,
} from "../lib/mistakeDisplay";

/** The live Chapter Test / Full Mock coaching footer, input for input (each page's own `coachingLine`). */
function storedCoaching(record: SessionRecord, resp: WorksheetGradeResponse): string {
  return coachingLine({
    marksAwarded: resp.gradedMarksAwarded,
    marksTotal: resp.gradedMarksTotal,
    counts: effectivePaperCounts(resp.results),
    marks: paperMarksLost(resp.results)?.byType ?? null,
    mismatchCount: resp.results.filter((r) => gradeStateOf(r) === "answer-mismatch").length,
    notGradedCount: pendingBreakdown(resp.results, resp.pendingCount).notGraded,
    pendingCount: resp.pendingCount,
    notAttemptedCount: resp.results.filter((r) => isQuestionNotAttempted(r)).length,
    practiseWhat: record.surface === "full-mock" ? "the chapters that cost you marks" : "this chapter",
  });
}

/** Whether a stored response has a graded sheet at all (the live pages' own `gradedCount > 0` gate). */
export function hasStoredPaperSheet(response: WorksheetGradeResponse | null | undefined): boolean {
  return quickPracticeHasGradedSheet(response);
}

/** The served bank rows of a record's questions, by id. A row that is no longer served is simply absent. */
async function servedRowsFor(record: SessionRecord): Promise<Map<string, CanonicalQuestion>> {
  const byId = new Map<string, CanonicalQuestion>();
  const ids = Array.isArray(record.questionIds) ? record.questionIds.map(String) : [];
  if (ids.length === 0) return byId;
  try {
    const [{ bankRowMeta }, loader] = await Promise.all([
      import("../data/bankChapters/bankIdIndex"),
      import("../data/bankChapters/loader"),
    ]);
    const topicKeys = [...new Set(ids.map((id) => bankRowMeta(id)?.topicKey).filter((k): k is string => !!k))];
    if (topicKeys.length === 0) return byId;
    await loader.ensureBankChapters(topicKeys);
    for (const q of loader.getBankRows(loader.bankChaptersFor(topicKeys))) byId.set(String(q.id), q);
  } catch {
    /* the bank could not load (offline, not cached): the sheet prints the stored results without text */
  }
  return byId;
}

/** Download the restored Chapter Test / Full Mock's graded sheet. Resolves quietly when there is no sheet. */
export async function downloadStoredPaperGradedSheet(
  record: SessionRecord,
  response: WorksheetGradeResponse | null | undefined,
): Promise<void> {
  if (!response || !hasStoredPaperSheet(response)) return;
  const rows = await servedRowsFor(record);
  const ids = Array.isArray(record.questionIds) ? record.questionIds.map(String) : [];
  const sheet = buildQuickPracticeGradedSheet({
    questions: ids.map((id) => rows.get(id) ?? { id }),
    response,
    name: record.title,
    code: record.id,
    subject: record.subject === "science" ? "Science" : "Maths",
    grade: "10",
    createdAt: new Date(record.gradedAt).toISOString(),
  });
  if (!sheet) return;
  const { exportGradedWorksheetPdf } = await import("../components/worksheet/worksheetPdfExport");
  await exportGradedWorksheetPdf({
    ws: sheet.ws,
    response: sheet.response,
    name: sheet.name,
    code: sheet.code,
    // The live Chapter Test / Full Mock download prints the shared coaching line of the response.
    coaching: storedCoaching(record, response),
  });
}
