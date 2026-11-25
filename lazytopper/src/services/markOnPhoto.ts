/**
 * MARK-ON-PHOTO-1 (owner, 25 Nov 2026) — "mark it on your photo".
 *
 * A question of a whole-paper grade that the grader could not place on the student's pages (not found / could not
 * read) or matched to the wrong answer can be fixed WITHOUT re-uploading the paper: the student drags a box around
 * that answer on the photo they already sent (or picks a photo of just that answer), and ONLY that question is
 * graded — as its own answer image (the per-question upload transport, so the grader never has to find a number) —
 * and slotted back into the same paper.
 *
 * This module is the pure half: which rows may be marked, and how a newly graded row replaces the old one with the
 * paper's totals recomputed the SERVER's way (gradingJobs.ts totalsOf). Never invents a mark: a row that comes back
 * not graded again replaces nothing.
 */
import { MARK_LIMIT_COPY, type WorksheetGradeResponse, type WorksheetQuestionGrade } from "../ai/aiClient";
import { gradeStateOf, isGradedQuestion, withEffectiveCounts } from "../lib/mistakeDisplay";
import { isNotFoundNotAttempted } from "../lib/notFoundNotAttempted";

export const MARK_ON_PHOTO_ACTION = "Mark it on your photo";
/** A mark that came back still not graded: the paper is left exactly as it was. */
export const MARK_STILL_UNREAD_COPY =
  "We still couldn't mark this answer from that part of the photo. Try a tighter box, or a clearer photo of just this answer.";
export const MARK_FAILED_COPY = "Marking didn't go through — please try again.";

/** A row the student may point to: its answer was not found, could not be read, or belongs to another question. */
export function isMarkableRow(row: WorksheetQuestionGrade | null | undefined): boolean {
  const s = gradeStateOf(row);
  return s === "could-not-read" || s === "answer-mismatch";
}

/** Fields of the old row that describe the QUESTION (chapter, section, type), not its grade — kept on the new row
 *  when the new grade does not carry its own. */
const QUESTION_FIELDS = ["topicSlug", "topicLabel", "topicSubject", "section", "sectionBasis", "format"] as const;

const half = (n: number) => Math.round(n * 2) / 2;

/**
 * The paper with row `index` replaced by `graded` (when — and only when — `graded` is a graded question), and its
 * counts and mark totals recomputed from the rows. Pure: returns `response` itself when nothing changes.
 */
export function mergeMarkedRow(
  response: WorksheetGradeResponse,
  index: number,
  graded: WorksheetQuestionGrade | null | undefined,
): WorksheetGradeResponse {
  const old = response.results[index];
  if (!old || !graded || !isGradedQuestion(graded)) return response;
  const next = { ...graded, qNumber: old.qNumber } as WorksheetQuestionGrade;
  const rec = next as unknown as Record<string, unknown>;
  const was = old as unknown as Record<string, unknown>;
  for (const k of QUESTION_FIELDS) {
    if ((rec[k] === undefined || rec[k] === null || rec[k] === "") && was[k] !== undefined) rec[k] = was[k];
  }
  const results = response.results.map((r, i) => (i === index ? next : r));
  const done = results.filter((r) => isGradedQuestion(r));
  return {
    ...response,
    // The first reading's paper summary can say this answer was not found; it is now marked, so the summary is dropped
    // (the GRADE-SECOND-LOOK-1b rule, #1871: never a summary that contradicts the rows under it).
    summary: "",
    results,
    totalQuestions: results.length,
    gradedCount: done.length,
    pendingCount: results.length - done.length,
    gradedMarksAwarded: half(done.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0)),
    gradedMarksTotal: half(done.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0)),
    worksheetTotalMarks: half(results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0)),
  };
}

/**
 * MARK-ON-PHOTO-2 — a row of a Chapter Test / Full Mock / Worksheet the student may point to: one whose answer could not be read
 * or belongs to another question (isMarkableRow), or one counted "Not attempted · 0" because it was NOT FOUND on the pages
 * (lib/notFoundNotAttempted). A Chapter Test / Full Mock Section A row is scored in the app and is always graded, so it never
 * qualifies; a Worksheet's Section A row is graded from the photo and CAN be one — the server still scores it 0 or full on the
 * answer alone (the objective clamp), so marking it changes nothing about how it is marked.
 */
export function isBankMarkableRow(row: WorksheetQuestionGrade | null | undefined): boolean {
  return isMarkableRow(row) || isNotFoundNotAttempted(row);
}

/** The markable rows of a bank result, in paper order: their index in `results` and their question number. */
export function bankMarkableRows(response: WorksheetGradeResponse | null | undefined): Array<{ index: number; qNumber: number }> {
  if (!response || !Array.isArray(response.results)) return [];
  return response.results.flatMap((r, index) => (isBankMarkableRow(r) ? [{ index, qNumber: r.qNumber }] : []));
}

/**
 * The bank paper with row `index` replaced by the ONE graded row of a mark's reply (`reply.results[0]`), or null when the mark
 * did not grade it (the paper then stays exactly as it was). The paper's own full marks are kept (a Chapter Test's / Full
 * Mock's total is the paper's, not a sum the grader returned).
 */
export function adoptBankMark(
  response: WorksheetGradeResponse,
  index: number,
  reply: WorksheetGradeResponse | null | undefined,
): WorksheetGradeResponse | null {
  const one = reply && reply.ok !== false && Array.isArray(reply.results) && reply.results[0] ? withEffectiveCounts(reply).results[0] : null;
  if (!one || !isGradedQuestion(one) || !response.results[index] || one.qNumber !== response.results[index].qNumber) return null;
  const merged = mergeMarkedRow(response, index, one);
  if (merged === response) return null;
  return withEffectiveCounts({ ...merged, worksheetTotalMarks: response.worksheetTotalMarks });
}

/** Errors whose own sentence is written for the student (a paid-access or pass refusal, sign in again, the network, a too-large
 *  photo, the 4th mark of one question): shown as they are. */
const OWN_SENTENCE_ERRORS = new Set(["PremiumRequiredError", "FairUseLimitError", "DailyLimitError", "SignInAgainError", "GradingNetworkError", "UploadTooLargeError"]);

/** MARK-ON-PHOTO-2 - what the dialog says when a mark did not go through (after the page's fair-use panel had its turn). A
 *  refusal reads its own words - never "try again" for something a retry cannot fix. PURE. */
export function markErrorMessage(e: unknown): string {
  const err = e as { name?: unknown; message?: unknown } | null;
  const message = err && typeof err.message === "string" ? err.message : "";
  if (message && (message === MARK_LIMIT_COPY || (typeof err?.name === "string" && OWN_SENTENCE_ERRORS.has(err.name)))) return message;
  return MARK_FAILED_COPY;
}

/**
 * MARK-ON-PHOTO-2 - the page a Chapter Test / Full Mock sent, as a page the dialog can show (MarkOnPhoto.tsx MarkablePage): only
 * when the upload was ONE photo (several photos are assembled into one PDF on the device, and a PDF has no page to box). Else
 * none, and the dialog asks for a photo of just this answer. PURE.
 */
export function uploadedPhotoPages(
  upload: { imageBase64: string; imageMimeType: string } | null | undefined,
): Array<{ id: string; prepared: { base64: string; mimeType: "image/jpeg" | "image/png" }; thumbUrl: string }> {
  const mime = upload ? upload.imageMimeType : "";
  if (!upload || !upload.imageBase64 || (mime !== "image/jpeg" && mime !== "image/png")) return [];
  return [{
    id: "uploaded-page",
    prepared: { base64: upload.imageBase64, mimeType: mime },
    thumbUrl: `data:${upload.imageMimeType};base64,${upload.imageBase64}`,
  }];
}
