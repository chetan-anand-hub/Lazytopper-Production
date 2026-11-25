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
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../ai/aiClient";
import { gradeStateOf, isGradedQuestion } from "../lib/mistakeDisplay";

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
