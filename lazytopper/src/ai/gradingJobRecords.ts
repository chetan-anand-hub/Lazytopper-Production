// src/ai/gradingJobRecords.ts
//
// GRADING-JOBS-1 J2b (controller decision D30-2) — an INTERRUPTED background grade still records
// what it really marked. When a job ends `interrupted` (contract v1.0 §6) its `final: true`,
// GRADED rows are charged (§7) and will not change (§4), so each surface feeds exactly those rows
// to Mistake Intelligence / progress through its OWN normal per-question path, at once — whether
// or not the student ever presses "Grade the remaining N". Not-graded rows (interrupted, timeout,
// unreadable, …) and provisional rows record nothing, as everywhere else.
//
// "Grade the remaining N" then records ONLY the new rows: the rows already recorded from the
// interruption it continues are skipped (the same identities would be replaced idempotently
// anyway; skipping makes "never double-records" literal).
//
// Read by NAME, never `instanceof` (several suites mock aiClient whole). No runtime import of
// gradingJobs.ts, so a suite that mocks the grade call needs nothing else.

import type { WorksheetQuestionGrade } from "./aiClient";
import { isGradedQuestion, withEffectiveCounts } from "../lib/mistakeDisplay";

interface InterruptedLike {
  name: string;
  rows: Array<WorksheetQuestionGrade & { index: number; final: boolean }>;
}

/** True for a GradingJobInterruptedError (by name; carries `rows`). */
export function isInterruptedJobError(err: unknown): err is InterruptedLike {
  return (
    !!err &&
    typeof err === "object" &&
    (err as { name?: unknown }).name === "GradingJobInterruptedError" &&
    Array.isArray((err as { rows?: unknown }).rows)
  );
}

/**
 * The rows of an interruption that are recorded as graded: `final: true` AND graded (never a
 * not-graded or provisional row). Returned in index order, `index`/`final` stripped, with the
 * same effective counts every reader of a normal grade gets (SCORECARD-MI-1).
 */
export function recordableInterruptedRows(err: unknown): Array<{ index: number; row: WorksheetQuestionGrade }> {
  if (!isInterruptedJobError(err)) return [];
  const picked = err.rows
    .filter((r) => r.final === true && isGradedQuestion(r))
    .sort((a, b) => a.index - b.index);
  const rows = picked.map(({ index: _i, final: _f, ...rest }) => {
    void _i;
    void _f;
    return rest as WorksheetQuestionGrade;
  });
  const effective = withEffectiveCounts({ results: rows }).results;
  return picked.map((r, i) => ({ index: r.index, row: effective[i] }));
}

/** qNumbers already recorded from the interruption a "grade the remaining N" continues. */
export function recordedQNumbersOf(continueFrom: unknown): Set<number> {
  return new Set(recordableInterruptedRows(continueFrom).map((r) => r.row.qNumber));
}

/** 0-based indices already recorded from that interruption (for surfaces whose qNumbers repeat). */
export function recordedIndicesOf(continueFrom: unknown): Set<number> {
  return new Set(recordableInterruptedRows(continueFrom).map((r) => r.index));
}
