/**
 * LIVE-FIX-1 #5 (owner ruling 23 Nov 2026, 23:05 IST; review rulings B2 / S3 / NIT4, 24 Nov) - on a Chapter Test / Full Mock a
 * written question NOT FOUND on the uploaded pages is "Not attempted · 0" (like a CBSE board paper) - graded, in the paper's total,
 * never a mistake - ONLY when the server COUNTED the check: the share of written questions it could not support is below its
 * TS-RECHECK-1 UNREADABLE_SHARE and real written work was graded. Otherwise nothing converts (not marked yet, record partial, the
 * free re-check note). The helper line asks for ALL the pages (a new upload replaces the last check). Pins the shared builder
 * (buildChapterTestResponse -> buildFullMockResponse), the SessionRecord status the board trend / estimate read, the scorecard
 * (live + re-open), the result-card line and the graded PDF.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../ai/aiClient";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "../services/worksheetSessionStore";

vi.mock("../components/packs/PackPromoLazy", () => ({ default: () => null }));
vi.mock("../components/results/ScorecardUpgradeLine", () => ({ default: () => null }));

import { buildChapterTestResponse, scoreObjectiveSection } from "../services/chapterTestGradeService";
import { buildFullMockResponse } from "../services/fullMockGradeService";
import { buildChapterTestSessionRecord, buildFullMockSessionRecord } from "../services/sessionRecords";
import { isFullyGradedFullPaper, buildBoardScoreView } from "./fullmock/boardEstimate";
import { gradeStateOf, isGradedQuestion, isLossOnlyNotAttempted, paperMarksLost } from "./mistakeDisplay";
import {
  ADD_PAGES_UPLOAD_BANNER,
  NOT_FOUND_ADD_PAGE_ACTION,
  NOT_FOUND_NOT_ATTEMPTED_NOTE,
  UNREADABLE_SHARE,
  isNotFoundNotAttempted,
  notCountedReasonOf,
  notFoundAddPageLine,
  notFoundNotAttemptedQNumbers,
  notFoundSummary,
} from "./notFoundNotAttempted";
import { checkNotCountedLine } from "../services/packs";
import { paperGradeStatus, paperMarksScore, resultCardParts } from "../components/results/scoreTotals";
import { boardScoreFor, fullMockChapterLensNote, deriveFullMockChapterLens, fullMockScorecardVariant } from "../components/results/scorecardVariants";
import { chapterTestScorecardVariant, storedChapterTestScorecardVariant, storedFullMockScorecardVariant } from "../components/results/scorecardBankLenses";
import ResultsScorecard from "../components/results/ResultsScorecard";
import NotFoundAddPageLine from "../components/chaptertest/NotFoundAddPageLine";
import { WorksheetGradedPrintDoc } from "../components/worksheet/WorksheetGradedPrintDoc";

afterEach(() => cleanup());

const NOT_FOUND_SERVER =
  "We couldn't find your answer to this question on the uploaded pages, so it has not been marked — if you answered it, add that page (with the question number beside it) and check again.";

const mcq = (qNumber: number): PersistedWorksheetQuestion => ({
  qNumber, id: `nf-${qNumber}`, subject: "Maths", topicKey: "triangles", topicLabel: "Triangles", section: "A", marks: 1,
  questionText: `MCQ ${qNumber}`, options: ["(a) 1", "(b) 2", "(c) 3", "(d) 4"], answer: "(b)",
} as unknown as PersistedWorksheetQuestion);
const written = (qNumber: number, marks: number): PersistedWorksheetQuestion => ({
  qNumber, id: `nf-${qNumber}`, subject: "Maths", topicKey: "triangles", topicLabel: "Triangles", section: marks >= 4 ? "E" : "C", marks,
  questionText: `Written ${qNumber}`,
} as unknown as PersistedWorksheetQuestion);

// An 80-mark full-length paper like the live run's: 20 MCQs (Q1-Q20) + 18 written questions (Q21-Q38: 12 x 3 + 6 x 4 = 60 marks).
const WRITTEN = Array.from({ length: 18 }, (_, i) => written(21 + i, i < 12 ? 3 : 4));
const MARKS = new Map(WRITTEN.map((q) => [q.qNumber, Number(q.marks)]));
const PAPER = {
  worksheetId: "fm-ts1-m1--live-fix-1", subject: "Maths", totalMarks: 80, createdAt: "2026-11-23T17:30:00.000Z",
  questions: [...Array.from({ length: 20 }, (_, i) => mcq(i + 1)), ...WRITTEN],
} as unknown as PersistedWorksheet;
const OBJECTIVE = scoreObjectiveSection(PAPER.questions.filter((q) => q.section === "A"), { 1: "(b)" }); // Q1 right, Q2-Q20 blank

const graded = (q: number, awarded: number): WorksheetQuestionGrade => {
  const total = MARKS.get(q) ?? 3;
  return {
    qNumber: q, couldNotRead: false, ok: true, totalMarks: total, marksAwarded: awarded, percentage: Math.round((awarded / total) * 100),
    annotatedSteps: [{ stepNumber: 1, description: "x", status: awarded === total ? "correct" : "partial", marksAwarded: awarded, marksDeducted: total - awarded } as never],
    mistakeSummary: { conceptual: awarded === total ? 0 : 1, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "",
  };
};
const blank = (q: number): WorksheetQuestionGrade => {
  const total = MARKS.get(q) ?? 3;
  return { qNumber: q, couldNotRead: false, ok: true, totalMarks: total, marksAwarded: 0, annotatedSteps: [], marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: total, untyped: 0 } };
};
const notFound = (q: number): WorksheetQuestionGrade =>
  ({ qNumber: q, couldNotRead: true, totalMarks: MARKS.get(q) ?? 3, marksAwarded: 0, note: NOT_FOUND_SERVER, notGraded: "unreadable", _reason: "notInInventory" } as unknown as WorksheetQuestionGrade);
const unreadable = (q: number): WorksheetQuestionGrade =>
  ({ qNumber: q, couldNotRead: true, totalMarks: MARKS.get(q) ?? 3, marksAwarded: 0, note: "The photo is too blurry to read", notGraded: "unreadable" } as WorksheetQuestionGrade);
const mismatch = (q: number): WorksheetQuestionGrade => ({ ...graded(q, 0), answerMismatch: true } as WorksheetQuestionGrade);

/** The 18 written rows: `pick(q)` decides each one (default: graded full marks). */
const sheet = (pick: (q: number) => WorksheetQuestionGrade | null = () => null): WorksheetQuestionGrade[] =>
  WRITTEN.map((w) => pick(w.qNumber) ?? graded(w.qNumber, MARKS.get(w.qNumber)!));
const subjective = (results: WorksheetQuestionGrade[]): WorksheetGradeResponse => ({
  ok: true, worksheetId: PAPER.worksheetId, results, totalQuestions: results.length,
  gradedCount: results.filter((r) => isGradedQuestion(r)).length, pendingCount: results.filter((r) => !isGradedQuestion(r)).length,
  gradedMarksAwarded: 0, gradedMarksTotal: 0, worksheetTotalMarks: 80,
});
const fm = (rows: WorksheetQuestionGrade[]) =>
  buildFullMockResponse({ paper: PAPER, objective: OBJECTIVE, subjectiveQuestions: WRITTEN, subjectiveResponse: subjective(rows) });
const ct = (rows: WorksheetQuestionGrade[]) =>
  buildChapterTestResponse({ paper: PAPER, objective: OBJECTIVE, subjectiveQuestions: WRITTEN, subjectiveResponse: subjective(rows) });

// 2 / 18 not found (Q33, Q34: 4 marks each), Q21 part-marked 1 / 3, the rest full marks.
const TWO = () => fm(sheet((q) => (q === 33 || q === 34 ? notFound(q) : q === 21 ? graded(21, 1) : null)));
// The live run: only Q21 on the page (2 / 3), 17 / 18 not found.
const SEVENTEEN = () => fm(sheet((q) => (q === 21 ? graded(21, 2) : notFound(q))));

describe("the server's rule decides (REVIEW S3)", () => {
  it("UNREADABLE_SHARE mirrors the server's TS-RECHECK-1 constant; the reasons it counts are the ones charge.cjs lists", () => {
    const server = resolve(__dirname, "../../server");
    const checks = readFileSync(resolve(server, "services/testSeriesChecks.cjs"), "utf8");
    expect(checks).toContain(`const UNREADABLE_SHARE = ${UNREADABLE_SHARE};`);
    const charge = readFileSync(resolve(server, "grading/charge.cjs"), "utf8");
    expect(charge).toContain("const UNREADABLE_REASONS = new Set(['couldNotRead', 'notInInventory', 'firstLineNotInWork', 'answerMismatch']);");
  });

  it("2 / 18 not found -> those 2 are GRADED 'Not attempted · 0' in the total: X / 80 final, nothing pending", () => {
    const r = TWO();
    for (const n of [33, 34]) {
      const row = r.results.find((x) => x.qNumber === n)!;
      expect(isNotFoundNotAttempted(row)).toBe(true);
      expect(row.marksAwarded).toBe(0);
      expect(row.marksLostByType?.unattempted).toBe(4);
      expect(isLossOnlyNotAttempted(row)).toBe(true); // never a mistake
      expect(row.teacherNote).toBe(NOT_FOUND_NOT_ATTEMPTED_NOTE);
    }
    expect(r.pendingCount).toBe(0);
    expect(r.gradedMarksTotal).toBe(80);
    expect(r.gradedMarksAwarded).toBe(51); // Q1 (1) + Q21 (1) + the other 15 written at full marks (49)
    expect(paperMarksScore(r).notMarked).toBeNull();
    expect(paperGradeStatus(r)).toBe("fully graded");
    expect(resultCardParts(r)).toEqual({ status: "fully graded", score: "51 / 80", tail: "" });
    expect(notFoundSummary(r.results)).toEqual({ mode: "not-attempted", qNumbers: [33, 34] });
    const pm = paperMarksLost(r.results)!;
    expect(pm.byType.unattempted).toBe(19 + 8); // the blank MCQs + the two missing answers: not attempted, never a mistake type
  });

  it("17 / 18 not found (the live run) -> NOTHING converts: not marked yet, record partial, out of the estimate; the note says not counted", () => {
    const r = SEVENTEEN();
    expect(r.results.some((x) => isNotFoundNotAttempted(x))).toBe(false);
    expect(r.pendingCount).toBe(17);
    expect(paperGradeStatus(r)).toBe("graded");
    expect(paperMarksScore(r).notMarked?.marks).toBe(57);
    const rec = buildFullMockSessionRecord({ paper: PAPER, code: "FM-M-01", subject: "maths", response: r, uid: "u1" });
    expect(rec.status).toBe("partial");
    expect(isFullyGradedFullPaper(rec as never)).toBe(false);
    expect(notFoundSummary(r.results)?.mode).toBe("not-marked");
    expect(notCountedReasonOf(r.results)).toBe("not-found");
    expect(checkNotCountedLine(notCountedReasonOf(r.results))).toBe("This check wasn't counted — most answers weren't on the pages. Add all your pages and check again free.");
  });

  it("missing + unreadable + another question's answer reaching half -> nothing converts (the server's combined share)", () => {
    const r = fm(sheet((q) => (q <= 25 ? notFound(q) : q <= 28 ? unreadable(q) : q === 29 ? mismatch(q) : null))); // 5 + 3 + 1 = 9 / 18
    expect(r.results.some((x) => isNotFoundNotAttempted(x))).toBe(false);
    const below = fm(sheet((q) => (q <= 25 ? notFound(q) : q <= 27 ? unreadable(q) : q === 29 ? mismatch(q) : null))); // 8 / 18
    expect(notFoundNotAttemptedQNumbers(below.results)).toEqual([21, 22, 23, 24, 25]);
    expect(gradeStateOf(below.results.find((x) => x.qNumber === 26)!)).toBe("could-not-read"); // unreadable stays not marked
    expect(gradeStateOf(below.results.find((x) => x.qNumber === 29)!)).toBe("answer-mismatch"); // and the mismatch too
    expect(below.pendingCount).toBe(3);
    expect(paperGradeStatus(below)).toBe("graded");
  });

  it("an all-blank sheet (nothing really written was graded) -> nothing converts", () => {
    const r = fm(sheet((q) => (q === 38 ? notFound(q) : blank(q))));
    expect(r.results.some((x) => isNotFoundNotAttempted(x))).toBe(false);
    expect(r.pendingCount).toBe(1);
  });

  it("Chapter Test: the same builder, the same rule, and its record is 'graded'", () => {
    const r = ct(sheet((q) => (q === 33 ? notFound(q) : null)));
    expect(r.pendingCount).toBe(0);
    expect(notFoundNotAttemptedQNumbers(r.results)).toEqual([33]);
    expect(buildChapterTestSessionRecord({ paper: PAPER, code: "CT-M-TRI-01", subject: "maths", topicKey: "triangles", response: r, uid: "u1" }).status).toBe("graded");
  });
});

describe("the saved record and the board view", () => {
  it("a counted check with missing answers -> status graded, 80-mark total -> eligible for the trend / estimate", () => {
    const rec = buildFullMockSessionRecord({ paper: PAPER, code: "FM-M-01", subject: "maths", response: TWO(), uid: "u1" });
    expect(rec).toMatchObject({ status: "graded", marksTotal: 80, marksAwarded: 51 });
    expect(isFullyGradedFullPaper(rec as never)).toBe(true);
    const view = buildBoardScoreView({ paper: { awarded: 51, total: 80, pendingCount: TWO().pendingCount, notMarkedMarks: 0 }, scores: [{ id: "a", score: 40, gradedAt: 1 }, { id: "FM-M-01", score: 51, gradedAt: 2 }] });
    expect(view?.scoreLine).toBe("You scored 51 / 80 on a full CBSE-pattern paper.");
    expect(view?.estimate).not.toBeNull();
  });
});

describe("the scorecard (live + re-open), the result card and the PDF - copy asks for ALL the pages (REVIEW B2)", () => {
  const view = { scoreLine: "You scored 51 / 80 on a full CBSE-pattern paper.", trend: { points: [40, 51], changeLine: "x" }, estimate: { line: "e", smallPrint: "s" }, estimateHint: null };
  const LINE = "If you answered these, upload all your pages again, including the missing one";

  it("Full Mock live: fully graded, final X / 80, the board view kept whole, the block + 'Upload all pages again'", () => {
    const onAddPage = vi.fn();
    const v = fullMockScorecardVariant({ name: "Maths · Full-Length Test 1", code: "FM-M-01", phase: "full", response: TWO(), questions: PAPER.questions, boardScore: view, onAddPage });
    expect(v.subtitle).toBe("FM-M-01 · fully graded · saved to your progress");
    expect(v.score).toMatchObject({ kind: "marks", awarded: 51, total: 80 });
    expect((v.score as { notMarked?: unknown }).notMarked).toBeUndefined();
    expect(v.boardScore).toEqual(boardScoreFor(view, false));
    expect(v.notFoundNotAttempted).toMatchObject({ mode: "not-attempted", questions: ["Q33", "Q34"], line: LINE });
    render(<ResultsScorecard variant={v} onClose={() => {}} />);
    const block = screen.getByTestId("sc-not-found-not-attempted");
    expect(block.textContent).toContain("Q33, Q34: Not attempted · 0 — not found on the pages you uploaded.");
    expect(block.textContent).toContain(`${LINE}.`);
    expect(screen.getByTestId("sc-add-page").textContent).toBe(NOT_FOUND_ADD_PAGE_ACTION);
    expect(NOT_FOUND_ADD_PAGE_ACTION).toBe("Upload all pages again");
    fireEvent.click(screen.getByTestId("sc-add-page"));
    expect(onAddPage).toHaveBeenCalledTimes(1);
  });

  it("the live run's sheet (not counted): 'not marked yet' with the same line, the strip's own not-found line not repeated", () => {
    const v = fullMockScorecardVariant({ name: "M", code: "FM-M-01", phase: "full", response: SEVENTEEN(), questions: PAPER.questions, onAddPage: () => {} });
    expect(v.subtitle).toBe("FM-M-01 · graded · saved to your progress");
    expect(v.notFoundNotAttempted?.mode).toBe("not-marked");
    render(<ResultsScorecard variant={v} onClose={() => {}} />);
    expect(screen.getByTestId("sc-not-found-not-attempted").textContent).toContain("not found on the pages you uploaded — not marked yet.");
    expect(document.querySelector('[data-grade-state="not-found"]')).toBeNull();
  });

  it("the biggest-loss line ignores the not-found marks (not attempted)", () => {
    const lens = deriveFullMockChapterLens(fm(sheet((q) => (q === 33 ? notFound(q) : null))), PAPER.questions);
    expect(lens?.[0].lost).toBeGreaterThan(0);
    expect(fullMockChapterLensNote(lens)).toBeNull();
  });

  it("re-opened Full Mock / Chapter Test records read the stored payload the same way; no handler -> no button", () => {
    const r = TWO();
    const rec = buildFullMockSessionRecord({ paper: PAPER, code: "FM-M-01", subject: "maths", response: r, uid: "u1" });
    const fmStored = storedFullMockScorecardVariant(rec, { gradedDateLabel: "23 Nov 2026", response: r, onDone: () => {} });
    expect(fmStored.notFoundNotAttempted).toMatchObject({ questions: ["Q33", "Q34"] });
    expect(fmStored.notFoundNotAttempted?.onAddPage).toBeUndefined();
    expect(fmStored.score).toMatchObject({ awarded: 51, total: 80 });
    const c = ct(sheet((q) => (q === 33 ? notFound(q) : null)));
    const ctRec = buildChapterTestSessionRecord({ paper: PAPER, code: "CT-M-TRI-01", subject: "maths", topicKey: "triangles", response: c, uid: "u1" });
    const ctStored = storedChapterTestScorecardVariant(ctRec, { gradedDateLabel: "23 Nov 2026", response: c, onDone: () => {} });
    expect(ctStored.notFoundNotAttempted).toMatchObject({ questions: ["Q33"], line: "If you answered this, upload all your pages again, including the missing one" });
    const ctLive = chapterTestScorecardVariant({ name: "Triangles · Test #1", code: "CT-M-TRI-01", phase: "full", response: c });
    expect(ctLive.subtitle).toBe("CT-M-TRI-01 · fully graded");
  });

  it("the result card's line, and nothing on a paper with no missing answer", () => {
    const onAddPage = vi.fn();
    render(<NotFoundAddPageLine response={TWO()} onAddPage={onAddPage} />);
    expect(screen.getByTestId("ct-not-found-not-attempted").textContent).toBe(
      `Q33, Q34: Not attempted · 0 — not found on the pages you uploaded. ${LINE}.Upload all pages again`,
    );
    fireEvent.click(screen.getByTestId("ct-add-page"));
    expect(onAddPage).toHaveBeenCalled();
    cleanup();
    const { container } = render(<NotFoundAddPageLine response={fm(sheet())} />);
    expect(container.textContent).toBe("");
    expect(notFoundAddPageLine(1)).toBe("If you answered this, upload all your pages again, including the missing one");
    expect(ADD_PAGES_UPLOAD_BANNER).toBe("Upload every page of this paper, not just the missing one — this check replaces the last one.");
  });

  it("the graded PDF lists them 'Not attempted · 0' with the helper line; no 'not marked yet'", () => {
    render(<WorksheetGradedPrintDoc ws={PAPER} response={TWO()} name="Maths · Full-Length Test 1" code="FM-M-01" coaching="" kindLabel="Full Mock" />);
    expect(screen.getByTestId("gp-not-found-not-attempted").textContent).toBe(`Q33, Q34: Not attempted · 0 — not found on the pages you uploaded. ${LINE}.`);
    expect(screen.queryByTestId("gp-not-marked")).toBeNull();
    expect(document.body.textContent).toContain(NOT_FOUND_NOT_ATTEMPTED_NOTE);
  });
});

describe("the not-counted note's reason (TS-RECHECK-1 copy)", () => {
  it("missing answers only -> not-found; an unreadable page only -> unreadable; both / mismatch / no check -> null (neutral)", () => {
    expect(notCountedReasonOf(SEVENTEEN().results)).toBe("not-found");
    expect(notCountedReasonOf(fm(sheet((q) => (q <= 30 ? unreadable(q) : null))).results)).toBe("unreadable");
    expect(notCountedReasonOf(fm(sheet((q) => (q <= 25 ? notFound(q) : q <= 30 ? unreadable(q) : null))).results)).toBeNull();
    expect(notCountedReasonOf(fm(sheet((q) => (q <= 30 ? mismatch(q) : null))).results)).toBeNull();
    expect(notCountedReasonOf(null)).toBeNull();
    expect(checkNotCountedLine(null)).toBe("This check wasn't counted — add any missing or unclear pages and check again free.");
  });
});
