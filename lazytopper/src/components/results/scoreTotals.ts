/**
 * TS-BOARDSCORE-1 - OWNER RULING (23 Nov 2026, 19:59 IST): the full-length test scorecard and its graded answer sheet always
 * show marks out of the paper's FULL marks (80 on a full-length paper), like a real CBSE result. Applied to the Chapter Test as
 * well, which shares the same hero and the same graded-sheet PDF.
 *
 * - A blank question stays GRADED ("Not attempted" at 0) - it is part of the score, exactly as before.
 * - A question that could NOT be marked (unreadable, not found on the pages, an answer to a different question, an unread option,
 *   not graded by the server) is NOT scored 0: its marks are listed apart as "N marks not marked yet (Q questions)".
 * - The graded subtotal stays honest: "lost" = graded marks - awarded; the not-marked marks are never lost and never earned.
 *
 * Tiny on purpose (the scoreNumber.ts pattern): the guide models read `gradedTotalOf` without pulling the variant builders.
 */
import { gradeStateOf, isNotFoundOnPages, type GradedQuestionLike } from "../../lib/mistakeDisplay";
import { formatScoreNumber } from "./scoreNumber";

/** Marks on the paper that could not be marked yet, and how many questions carry them. */
export interface ScoreNotMarked {
  marks: number;
  questions: number;
  /** The scorecard's line: "6 marks not marked yet (2 questions) — upload a clearer photo to complete". */
  line: string;
}

interface ResponseLike {
  results: ReadonlyArray<GradedQuestionLike & { qNumber?: number }>;
  gradedMarksAwarded: number;
  gradedMarksTotal: number;
  worksheetTotalMarks?: number | null;
  pendingCount?: number | null;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/** "6 marks" / "1 mark" / "2.5 marks". */
function marksPhrase(m: number): string {
  return `${formatScoreNumber(m)} mark${m === 1 ? "" : "s"}`;
}

/**
 * The not-marked line's ending, from the states of the questions that were not marked: a clearer photo when every one was an
 * unreadable page or option; the missing page when every one was not found on the pages; otherwise the list below names each.
 */
function notMarkedAction(results: ResponseLike["results"]): string {
  const unmarked = results.filter((r) => gradeStateOf(r) !== "graded");
  if (unmarked.length === 0) return "see the list below to complete";
  if (unmarked.every((r) => isNotFoundOnPages(r))) return "add the missing page to complete";
  if (unmarked.every((r) => (gradeStateOf(r) === "could-not-read" && !isNotFoundOnPages(r)) || gradeStateOf(r) === "unread-option")) {
    return "upload a clearer photo to complete";
  }
  return "see the list below to complete";
}

export function notMarkedLine(marks: number, questions: number, action: string): string {
  const q = questions > 0 ? ` (${questions} question${questions === 1 ? "" : "s"})` : "";
  return `${marksPhrase(marks)} not marked yet${q} — ${action}`;
}

/**
 * The paper-level score for a full-paper surface (Full Mock / Chapter Test, FULL phase): awarded out of the paper's FULL marks,
 * plus the not-marked-yet marks when some questions could not be marked. Falls back to the graded total when the paper total is
 * unknown (never smaller than the graded total).
 */
export function paperMarksScore(response: ResponseLike): { awarded: number; total: number; notMarked: ScoreNotMarked | null } {
  const graded = Number(response.gradedMarksTotal) || 0;
  const paper = Number(response.worksheetTotalMarks) || 0;
  const total = Math.max(paper, graded);
  const marks = round2(Math.max(0, total - graded));
  if (marks <= 0) return { awarded: response.gradedMarksAwarded, total, notMarked: null };
  const counted = response.results.filter((r) => gradeStateOf(r) !== "graded").length;
  const questions = counted > 0 ? counted : Math.max(0, Number(response.pendingCount) || 0);
  return {
    awarded: response.gradedMarksAwarded,
    total,
    notMarked: { marks, questions, line: notMarkedLine(marks, questions, notMarkedAction(response.results)) },
  };
}

/**
 * The AWAITING-SHEET (partial) score: the objective section is marked and the written sections wait for the student's upload. Out of
 * the paper's FULL marks too (coordinator ruling on the owner's "always out of full marks", 23 Nov 2026), with the written marks named
 * as WAITING FOR THE ANSWER SHEET - not "not marked yet": nothing was tried and failed, the student has not uploaded yet.
 * `canUpload` false (an account the card offers the Test Series / Board Pass instead) -> the line names no upload it cannot make.
 * The shape is the same `notMarked` (marks neither lost nor earned), so every reader stays silent or uses the marked subtotal.
 */
export function awaitingSheetScore(
  input: { awarded: number; gradedTotal: number; paperTotal?: number | null; writtenQuestions?: number },
  canUpload = true,
): { awarded: number; total: number; notMarked: ScoreNotMarked | null } {
  const graded = Number(input.gradedTotal) || 0;
  const total = Math.max(Number(input.paperTotal) || 0, graded);
  const marks = round2(Math.max(0, total - graded));
  if (marks <= 0) return { awarded: input.awarded, total, notMarked: null };
  const line = `${marksPhrase(marks)} waiting for your answer sheet${canUpload ? " \u2014 upload it to complete" : ""}`;
  return { awarded: input.awarded, total, notMarked: { marks, questions: Math.max(0, Number(input.writtenQuestions) || 0), line } };
}

/** The marks actually GRADED on a marks score: the shown total minus any not-marked-yet marks. "Lost" is measured against this. */
export function gradedTotalOf(score: { total: number; notMarked?: { marks: number } | null }): number {
  const nm = Number(score.notMarked?.marks) || 0;
  return round2(Math.max(0, score.total - Math.max(0, nm)));
}

/**
 * LIVE-FIX-1 (live run 23 Nov 2026) - the ONE status word for a full-paper result (Full Mock / Chapter Test, FULL phase): the
 * scorecard header, the result card behind it and every other reader agree. "fully graded" ONLY when every mark on the paper
 * was marked: any marks not marked yet, or any pages / questions still pending, read "graded". Before this the scorecard header
 * said "fully graded" while its own hero showed "58 marks not marked yet (17 questions)".
 */
export function paperGradeStatus(response: ResponseLike): "graded" | "fully graded" {
  const ps = paperMarksScore(response);
  return ps.notMarked || (Number(response.pendingCount) || 0) > 0 ? "graded" : "fully graded";
}

/**
 * TS-BOARDSCORE-1 (review nit) - the result card behind the scorecard (Full Mock / Chapter Test, FULL phase), consistent with the
 * hero: "fully graded" only when everything was marked; the score out of the paper's FULL marks; the marks not marked yet named.
 */
export function resultCardParts(response: ResponseLike): { status: string; score: string; tail: string } {
  const ps = paperMarksScore(response);
  return {
    status: paperGradeStatus(response),
    score: `${formatScoreNumber(ps.awarded)} / ${formatScoreNumber(ps.total)}`,
    tail: ps.notMarked ? ` \u00b7 ${marksPhrase(ps.notMarked.marks)} not marked yet` : "",
  };
}
