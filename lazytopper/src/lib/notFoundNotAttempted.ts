/**
 * LIVE-FIX-1 #5 - OWNER RULING (23 Nov 2026, 23:05 IST): on a Chapter Test and a Full Mock (Test Series full-length papers
 * included - they are Full Mocks), a written question whose answer was NOT FOUND on the uploaded pages counts as
 * "Not attempted · 0", like a CBSE board paper - not "not marked yet / add the missing page". It stays in the paper's total
 * (so the score is final, X / 80), and the result shows ONE helper line: "If you answered these, upload all your pages again, including
 * the missing one" (REVIEW B2: a new upload replaces the last check). Only when the server COUNTED the check (REVIEW S3, below).
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
import { gradeStateOf, isGradedQuestion, isNotFoundOnPages, isQuestionNotAttempted, objectiveMarksLost } from "./mistakeDisplay";

/**
 * REVIEW S3 (coordinator ruling 24 Nov 2026) - the SERVER's unreadable rule decides. TS-RECHECK-1 (server/services/testSeriesChecks.cjs
 * `UNREADABLE_SHARE`, reasons in server/grading/charge.cjs `UNREADABLE_REASONS`: not read / not on the pages / first line not in the
 * work / an answer to another question) does NOT count a check when at least this share of its written questions are like that.
 * Mirrored here - a test pins it equal to the server's constant - so the page never calls a paper final ("Not attempted · 0") on a
 * check the server did not count.
 */
export const UNREADABLE_SHARE = 0.5;

/** The per-question line on the scorecard's graded sheet and the PDF. */
export const NOT_FOUND_NOT_ATTEMPTED_NOTE = "Not attempted · 0 — your answer to this question was not found on the pages you uploaded.";

/**
 * The ONE helper line. REVIEW B2: a new upload REPLACES the last check (grades are not merged), so it asks for ALL the pages -
 * a student who uploaded only the missing page would see every other question come back "not found".
 */
export function notFoundAddPageLine(count: number): string {
  return `If you answered ${count === 1 ? "this" : "these"}, upload all your pages again, including the missing one`;
}

/** The action's label (REVIEW B2). */
export const NOT_FOUND_ADD_PAGE_ACTION = "Upload all pages again";

/** REVIEW B2 - the banner on the upload step that action opens. */
export const ADD_PAGES_UPLOAD_BANNER = "Upload every page of this paper, not just the missing one — this check replaces the last one.";
/** ...and, on a Test Series paper without the Board Pass (an owner's paper or the free test), what it costs. RE-REVIEW SF2: said
 *  plainly - the page cannot tell whether this paper's one free re-check is still unused, so it promises none. */
export const ADD_PAGES_USES_CHECK_LINE = "It uses one of this paper's checks.";

/** The lead of the block, the result card and the PDF: converted ("Not attempted · 0") or still not marked. PURE. */
export function notFoundLead(mode: "not-attempted" | "not-marked", qNumbers: ReadonlyArray<number>): string {
  const qs = qNumbers.map((n) => `Q${n}`).join(", ");
  return mode === "not-attempted"
    ? `${qs}: Not attempted · 0 — not found on the pages you uploaded.`
    : `${qs}: not found on the pages you uploaded — not marked yet.`;
}

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
 * RE-REVIEW SF1 - the server's `R.NO_ANSWER_ON_PAGE_NOTE` (server/grading/rules.cjs), the teacherNote of a row graded 0 "unattempted"
 * because the page inventory had no answer for it: `firstLineNotInWork` (which TS-RECHECK-1 COUNTS as unsupported) or a blank slot
 * (which it does not). The server does not send `_reason`, so the client cannot tell them apart and counts BOTH - the safe
 * direction: the client's share can only be higher than the server's, never lower, so it never calls a paper final on a check the
 * server did not count. A MIRROR, not an import: rules.cjs is the grader's whole prompt rulebook and must not ship to the browser;
 * a test pins this string equal to the server's export.
 */
export const SERVER_NO_ANSWER_ON_PAGE_NOTE =
  "No answer to this question was found on your page, so it earns no marks — if you did answer it, check that the page is included and the question number is written beside it.";

/** A graded 0 row the server filed as "no answer on the page" (firstLineNotInWork, or a blank slot). */
function noAnswerOnPage(r: WorksheetQuestionGrade): boolean {
  return isGradedQuestion(r) && r.teacherNote === SERVER_NO_ANSWER_ON_PAGE_NOTE;
}

/** A written row the server's TS-RECHECK-1 may count as "could not support" (charge.cjs UNREADABLE_REASONS, as the client sees
 *  them - never fewer than the server counts; see SERVER_NO_ANSWER_ON_PAGE_NOTE). */
function unreadableLike(r: WorksheetQuestionGrade): boolean {
  const state = gradeStateOf(r);
  return isNotFoundOnPages(r) || noAnswerOnPage(r) || state === "could-not-read" || state === "answer-mismatch";
}

/** Real written work was graded from the sheet: a graded row that is not a blank / not-attempted 0 (REVIEW S3). */
function hasRealWork(r: WorksheetQuestionGrade): boolean {
  return isGradedQuestion(r) && !isQuestionNotAttempted(r);
}

/**
 * The written rows of ONE upload, with every not-found row counted as "Not attempted · 0" - ONLY when the server COUNTED this
 * check (REVIEW S3): the share of written questions it could not support (not found, unreadable, another question's answer) is
 * BELOW UNREADABLE_SHARE, and at least one question with real written work was graded. Otherwise nothing converts: the questions
 * stay "not marked yet", the record stays partial, and the free re-check note says the check was not counted. PURE.
 */
export function notFoundAsNotAttempted(rows: ReadonlyArray<WorksheetQuestionGrade>): WorksheetQuestionGrade[] {
  if (rows.length === 0 || !rows.some(hasRealWork)) return [...rows];
  if (rows.filter(unreadableLike).length / rows.length >= UNREADABLE_SHARE) return [...rows];
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

/**
 * What the result shows about answers missing from the pages: the converted questions ("not-attempted"), else the ones still not
 * marked because the check was not counted ("not-marked"), else null. PURE.
 */
export function notFoundSummary(
  rows: ReadonlyArray<WorksheetQuestionGrade> | null | undefined,
): { mode: "not-attempted" | "not-marked"; qNumbers: number[] } | null {
  const converted = notFoundNotAttemptedQNumbers(rows);
  if (converted.length > 0) return { mode: "not-attempted", qNumbers: converted };
  const pending = (rows ?? []).filter((r) => isNotFoundOnPages(r)).map((r) => r.qNumber).sort((a, b) => a - b);
  return pending.length > 0 ? { mode: "not-marked", qNumbers: pending } : null;
}

/**
 * LIVE-FIX-1 - why the check on screen may not have been counted (the server's TS-RECHECK-1 free re-check), as far as THIS
 * check's rows say: "not-found" when answers were missing from the pages and nothing was unreadable; "unreadable" when a page or
 * option could not be read and nothing was missing; null otherwise (both, neither, an answer to a different question, or no
 * check on screen) - the caller then shows the neutral line. PURE.
 */
export function notCountedReasonOf(rows: ReadonlyArray<WorksheetQuestionGrade> | null | undefined): "not-found" | "unreadable" | null {
  const list = rows ?? [];
  const missing = list.some((r) => isNotFoundNotAttempted(r) || isNotFoundOnPages(r) || noAnswerOnPage(r));
  const unread = list.some((r) => !isNotFoundOnPages(r) && (gradeStateOf(r) === "could-not-read" || gradeStateOf(r) === "unread-option"));
  if (missing && !unread) return "not-found";
  if (unread && !missing) return "unreadable";
  return null;
}
