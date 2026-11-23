// TS-BOARDSCORE-1 - OWNER RULING (23 Nov 2026, 19:59 IST): full-paper scores are out of the paper's FULL marks; marks that could
// not be marked are listed apart ("N marks not marked yet"), never scored 0, never counted lost - on the hero, the guide and the
// share image alike.
import { describe, expect, it } from "vitest";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";
import { gradedTotalOf, notMarkedLine, paperMarksScore, resultCardParts } from "./scoreTotals";
import { ziggyReactionFor } from "../guide/ziggyModel";
import { buildShareCardModel, canShareScore } from "./share/shareCardModel";
import { fullMockScorecardVariant } from "./scorecardVariants";
import { chapterTestScorecardVariant } from "./scorecardBankLenses";

const q = (over: Partial<WorksheetQuestionGrade>): WorksheetQuestionGrade => ({ qNumber: 1, couldNotRead: false, totalMarks: 5, marksAwarded: 3, ...over });
const resp = (results: WorksheetQuestionGrade[], over: Partial<WorksheetGradeResponse> = {}): WorksheetGradeResponse => ({
  ok: true,
  results,
  totalQuestions: results.length,
  gradedCount: results.length,
  pendingCount: 0,
  gradedMarksAwarded: 52,
  gradedMarksTotal: 80,
  worksheetTotalMarks: 80,
  ...over,
});

describe("paperMarksScore", () => {
  it("all marked: X / 80, nothing listed apart", () => {
    expect(paperMarksScore(resp([q({})]))).toEqual({ awarded: 52, total: 80, notMarked: null });
  });

  it("a blank question is GRADED (0), so it is never 'not marked'", () => {
    const blank = q({ qNumber: 2, marksAwarded: 0 });
    expect(paperMarksScore(resp([q({}), blank])).notMarked).toBeNull();
  });

  it("unreadable pages: out of 80, the marks and questions listed, a clearer photo asked for", () => {
    const r = resp([q({}), q({ qNumber: 2, couldNotRead: true, totalMarks: 3 }), q({ qNumber: 3, couldNotRead: true, totalMarks: 3 })], {
      gradedMarksTotal: 74,
      pendingCount: 2,
      gradedCount: 1,
    });
    expect(paperMarksScore(r)).toEqual({
      awarded: 52,
      total: 80,
      notMarked: { marks: 6, questions: 2, line: "6 marks not marked yet (2 questions) — upload a clearer photo to complete" },
    });
  });

  it("the ending names what to do: missing page / mixed states", () => {
    const notFound = q({ qNumber: 2, couldNotRead: true, totalMarks: 3, note: "Not found on the uploaded pages" } as Partial<WorksheetQuestionGrade>);
    expect(paperMarksScore(resp([q({}), notFound], { gradedMarksTotal: 77, pendingCount: 1 })).notMarked?.line).toBe(
      "3 marks not marked yet (1 question) — add the missing page to complete",
    );
    const mismatch = q({ qNumber: 3, totalMarks: 2, answerMismatch: true } as Partial<WorksheetQuestionGrade>);
    const unread = q({ qNumber: 4, couldNotRead: true, totalMarks: 1 });
    expect(paperMarksScore(resp([q({}), mismatch, unread], { gradedMarksTotal: 77, pendingCount: 2 })).notMarked?.line).toBe(
      "3 marks not marked yet (2 questions) — see the list below to complete",
    );
  });

  it("unknown paper total: falls back to the graded total (never smaller)", () => {
    expect(paperMarksScore(resp([q({})], { worksheetTotalMarks: 0, gradedMarksTotal: 74 }))).toEqual({ awarded: 52, total: 74, notMarked: null });
  });

  it("singular wording and half marks", () => {
    expect(notMarkedLine(1, 1, "x")).toBe("1 mark not marked yet (1 question) — x");
    expect(notMarkedLine(2.5, 2, "x")).toBe("2.5 marks not marked yet (2 questions) — x");
  });

  it("gradedTotalOf: the shown total minus the not-marked marks", () => {
    expect(gradedTotalOf({ total: 80, notMarked: { marks: 6 } })).toBe(74);
    expect(gradedTotalOf({ total: 80 })).toBe(80);
  });
});

describe("the score's readers never count not-marked marks as lost", () => {
  const unmarked = resp(
    [
      q({ marksAwarded: 2, marksLostByType: { conceptual: 3, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0 } } as Partial<WorksheetQuestionGrade>),
      q({ qNumber: 2, couldNotRead: true, totalMarks: 6 }),
    ],
    { gradedMarksAwarded: 70, gradedMarksTotal: 74, pendingCount: 1, gradedCount: 1 },
  );

  it("Ziggy waits for the complete result", () => {
    const v = fullMockScorecardVariant({ name: "M", code: "FM-M-01", phase: "full", response: unmarked });
    expect(v.score).toMatchObject({ awarded: 70, total: 80 });
    expect(ziggyReactionFor(v.score)).toBeNull();
    expect(ziggyReactionFor({ kind: "marks", awarded: 70, total: 80 })?.line).toBe("70 out of 80. 10 marks to fix. I've got this.");
  });

  it("review B1: a FULL card with marks not marked yet cannot be shared as an image (no '70 / 80' without its caveat)", () => {
    const v = fullMockScorecardVariant({ name: "M", code: "FM-M-01", phase: "full", response: unmarked });
    expect(canShareScore(v)).toBe(false);
    expect(buildShareCardModel(v, { dateLabel: "23 Nov 2026" })).toBeNull();
  });

  it("review B1: a fully marked FULL card still shares, out of 80", () => {
    const done = resp([q({ marksAwarded: 5 })], { gradedMarksAwarded: 70, gradedMarksTotal: 80 });
    const v = fullMockScorecardVariant({ name: "M", code: "FM-M-01", phase: "full", response: done });
    expect(canShareScore(v)).toBe(true);
    expect(buildShareCardModel(v, { dateLabel: "23 Nov 2026" })).toMatchObject({ awarded: 70, total: 80 });
  });

  it("Chapter Test: the same paper score (shared hero)", () => {
    const v = chapterTestScorecardVariant({ name: "CT", code: "CT-01", phase: "full", response: { ...unmarked, worksheetTotalMarks: 80 } });
    expect(v.score).toMatchObject({ awarded: 70, total: 80 });
    expect(v.score.kind === "marks" && v.score.notMarked?.marks).toBe(6);
  });
});

describe("awaiting-sheet (PARTIAL) phase - out of full marks, written marks WAITING for the answer sheet", () => {
  const partialResp = (over: Partial<WorksheetGradeResponse> = {}): WorksheetGradeResponse =>
    resp([q({ qNumber: 1, totalMarks: 1, marksAwarded: 1 })], {
      totalQuestions: 38,
      gradedCount: 20,
      gradedMarksAwarded: 17,
      gradedMarksTotal: 20,
      worksheetTotalMarks: 80,
      ...over,
    });

  it("Full Mock: 17 / 80 + '60 marks waiting for your answer sheet — upload it to complete'; upload prompt kept", () => {
    const v = fullMockScorecardVariant({ name: "M", code: "FM-M-04", phase: "partial", response: partialResp(), onUpload: () => {}, onUploadLater: () => {} });
    expect(v.score).toMatchObject({ kind: "marks", awarded: 17, total: 80 });
    expect(v.score.kind === "marks" && v.score.notMarked).toEqual({
      marks: 60,
      questions: 18,
      line: "60 marks waiting for your answer sheet — upload it to complete",
    });
    expect(v.score.kind === "marks" && v.score.notMarked?.line).not.toMatch(/not marked/);
    expect(v.awaitingSheet).toBe(true);
    expect(v.actions[0].label).toContain("Upload answer sheet");
    expect(v.boardScore).toBeUndefined();
  });

  it("Chapter Test: X / its full marks, same waiting line", () => {
    const v = chapterTestScorecardVariant({
      name: "CT",
      code: "CT-01",
      phase: "partial",
      response: partialResp({ gradedMarksAwarded: 4, gradedMarksTotal: 5, worksheetTotalMarks: 32, totalQuestions: 12, gradedCount: 5 }),
    });
    expect(v.score).toMatchObject({ awarded: 4, total: 32 });
    expect(v.score.kind === "marks" && v.score.notMarked?.line).toBe("27 marks waiting for your answer sheet — upload it to complete");
  });

  it("an account that may not upload: the line names no upload it cannot make", () => {
    const fm = fullMockScorecardVariant({ name: "M", code: "FM-M-04", phase: "partial", response: partialResp(), uploadNotAllowed: true });
    expect(fm.score.kind === "marks" && fm.score.notMarked?.line).toBe("60 marks waiting for your answer sheet");
    const ct = chapterTestScorecardVariant({ name: "CT", code: "CT-01", phase: "partial", response: partialResp({ worksheetTotalMarks: 32 }), uploadNotAllowed: true });
    expect(ct.score.kind === "marks" && ct.score.notMarked?.line).toBe("12 marks waiting for your answer sheet");
  });

  it("Ziggy stays silent; review B1: no share image while the sheet is awaited (never '17 / 80 · Board-ready vibes')", () => {
    const v = fullMockScorecardVariant({ name: "M", code: "FM-M-04", phase: "partial", response: partialResp(), onUpload: () => {}, onUploadLater: () => {} });
    expect(ziggyReactionFor(v.score)).toBeNull();
    expect(canShareScore(v)).toBe(false);
    expect(buildShareCardModel(v, { dateLabel: "23 Nov 2026" })).toBeNull();
    const ct = chapterTestScorecardVariant({ name: "CT", code: "CT-01", phase: "partial", response: partialResp({ worksheetTotalMarks: 32 }) });
    expect(canShareScore(ct)).toBe(false);
  });

  it("review nit: the result card behind the scorecard matches the hero", () => {
    expect(resultCardParts(partialResp({ gradedMarksAwarded: 61, gradedMarksTotal: 80 }))).toEqual({ status: "fully graded", score: "61 / 80", tail: "" });
    expect(
      resultCardParts(
        resp([q({}), q({ qNumber: 2, couldNotRead: true, totalMarks: 6 })], { gradedMarksAwarded: 52, gradedMarksTotal: 74, pendingCount: 1 }),
      ),
    ).toEqual({ status: "graded", score: "52 / 80", tail: " \u00b7 6 marks not marked yet" });
  });
});
