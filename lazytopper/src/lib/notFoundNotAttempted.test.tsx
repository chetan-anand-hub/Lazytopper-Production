/**
 * LIVE-FIX-1 #5 (owner ruling 23 Nov 2026, 23:05 IST) - on a Chapter Test / Full Mock a written question NOT FOUND on the uploaded
 * pages is "Not attempted · 0" (like a CBSE board paper): graded, in the paper's total, never a mistake, with ONE helper line
 * ("If you answered these, add the page") and the page's own upload step. Unreadable pages / options and an answer to a different
 * question stay "not marked yet". Pins the shared builder (buildChapterTestResponse -> buildFullMockResponse), the SessionRecord
 * status the board trend / estimate read, the scorecard (live + re-open), the result-card line and the graded PDF.
 */
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
import { NOT_FOUND_NOT_ATTEMPTED_NOTE, isNotFoundNotAttempted, notCountedReasonOf, notFoundAddPageLine, notFoundAsNotAttempted, notFoundNotAttemptedQNumbers } from "./notFoundNotAttempted";
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
  qNumber,
  id: `nf-${qNumber}`,
  subject: "Maths",
  topicKey: "triangles",
  topicLabel: "Triangles",
  section: "A",
  marks: 1,
  questionText: `MCQ ${qNumber}`,
  options: ["(a) 1", "(b) 2", "(c) 3", "(d) 4"],
  answer: "(b)",
} as unknown as PersistedWorksheetQuestion);
const written = (qNumber: number, marks: number, section: string): PersistedWorksheetQuestion => ({
  qNumber,
  id: `nf-${qNumber}`,
  subject: "Maths",
  topicKey: "triangles",
  topicLabel: "Triangles",
  section,
  marks,
  questionText: `Written ${qNumber}`,
} as unknown as PersistedWorksheetQuestion);

// An 80-mark full-length paper: 20 MCQs (Section A) + Q21 (20 marks, answered) + Q22, Q23 (15 marks each, not on the pages) + Q24 (10).
const WRITTEN = [written(21, 20, "C"), written(22, 15, "D"), written(23, 15, "D"), written(24, 10, "E")];
const PAPER = {
  worksheetId: "fm-ts1-m1--live-fix-1",
  subject: "Maths",
  totalMarks: 80,
  createdAt: "2026-11-23T17:30:00.000Z",
  questions: [...Array.from({ length: 20 }, (_, i) => mcq(i + 1)), ...WRITTEN],
} as unknown as PersistedWorksheet;
// Q1 right, every other MCQ unanswered.
const OBJECTIVE = scoreObjectiveSection(PAPER.questions.filter((q) => q.section === "A"), { 1: "(b)" });

const graded = (q: number, awarded: number, total: number): WorksheetQuestionGrade => ({
  qNumber: q,
  couldNotRead: false,
  ok: true,
  totalMarks: total,
  marksAwarded: awarded,
  percentage: Math.round((awarded / total) * 100),
  annotatedSteps: [{ stepNumber: 1, description: "x", status: awarded === total ? "correct" : "partial", marksAwarded: awarded, marksDeducted: total - awarded } as never],
  mistakeSummary: { conceptual: awarded === total ? 0 : 1, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: "",
});
const notFound = (q: number, total: number): WorksheetQuestionGrade =>
  ({ qNumber: q, couldNotRead: true, totalMarks: total, marksAwarded: 0, note: NOT_FOUND_SERVER, notGraded: "unreadable", _reason: "notInInventory" } as unknown as WorksheetQuestionGrade);
const unreadable = (q: number, total: number): WorksheetQuestionGrade =>
  ({ qNumber: q, couldNotRead: true, totalMarks: total, marksAwarded: 0, note: "The photo is too blurry to read", notGraded: "unreadable" } as WorksheetQuestionGrade);
const mismatch = (q: number, total: number): WorksheetQuestionGrade =>
  ({ ...graded(q, 0, total), answerMismatch: true } as WorksheetQuestionGrade);

const subjective = (results: WorksheetQuestionGrade[]): WorksheetGradeResponse => ({
  ok: true,
  worksheetId: PAPER.worksheetId,
  results,
  totalQuestions: results.length,
  gradedCount: results.filter((r) => isGradedQuestion(r)).length,
  pendingCount: results.filter((r) => !isGradedQuestion(r)).length,
  gradedMarksAwarded: 0,
  gradedMarksTotal: 0,
  worksheetTotalMarks: 80,
});
const fm = (rows: WorksheetQuestionGrade[]) =>
  buildFullMockResponse({ paper: PAPER, objective: OBJECTIVE, subjectiveQuestions: WRITTEN, subjectiveResponse: subjective(rows) });

const LIVE = () => fm([graded(21, 12, 20), notFound(22, 15), notFound(23, 15), graded(24, 0, 10)]);

describe("the shared builder (Chapter Test + Full Mock)", () => {
  it("not-found questions are GRADED 'Not attempted · 0' in the paper's total: X / 80 final, nothing pending", () => {
    const r = LIVE();
    const row = (n: number) => r.results.find((x) => x.qNumber === n)!;
    for (const n of [22, 23]) {
      expect(isGradedQuestion(row(n))).toBe(true);
      expect(isNotFoundNotAttempted(row(n))).toBe(true);
      expect(row(n).marksAwarded).toBe(0);
      expect(row(n).marksLostByType?.unattempted).toBe(15);
      expect(isLossOnlyNotAttempted(row(n))).toBe(true); // never a mistake
      expect(row(n).teacherNote).toBe(NOT_FOUND_NOT_ATTEMPTED_NOTE);
    }
    expect(r.pendingCount).toBe(0);
    expect(r.gradedMarksTotal).toBe(80);
    expect(r.gradedMarksAwarded).toBe(13); // Q1 (1) + Q21 (12)
    expect(paperMarksScore(r).notMarked).toBeNull();
    expect(paperGradeStatus(r)).toBe("fully graded");
    expect(resultCardParts(r)).toEqual({ status: "fully graded", score: "13 / 80", tail: "" });
    expect(notFoundNotAttemptedQNumbers(r.results)).toEqual([22, 23]);
    // Mistake Intelligence: the not-found marks are NOT ATTEMPTED (with the unanswered MCQs), never a mistake type.
    const pm = paperMarksLost(r.results)!;
    expect(pm.byType.unattempted).toBe(19 + 30);
    expect(pm.byType.untyped).toBe(18); // Q21 lost 8, Q24 lost 10 - real losses, never "not attempted"
  });

  it("an UNREADABLE page and an answer to a DIFFERENT question stay 'not marked yet'", () => {
    const r = fm([graded(21, 12, 20), notFound(22, 15), unreadable(23, 15), mismatch(24, 10)]);
    const row = (n: number) => r.results.find((x) => x.qNumber === n)!;
    expect(isNotFoundNotAttempted(row(22))).toBe(true);
    expect(gradeStateOf(row(23))).toBe("could-not-read");
    expect(gradeStateOf(row(24))).toBe("answer-mismatch");
    expect(r.pendingCount).toBe(2);
    expect(paperMarksScore(r).notMarked?.marks).toBe(25);
    expect(paperGradeStatus(r)).toBe("graded");
  });

  it("nothing read from the sheet at all (every written answer missing) -> nothing becomes a final 0", () => {
    const r = fm([notFound(21, 20), notFound(22, 15), notFound(23, 15), notFound(24, 10)]);
    expect(r.results.some((x) => isNotFoundNotAttempted(x))).toBe(false);
    expect(r.pendingCount).toBe(4);
    expect(notFoundAsNotAttempted([notFound(1, 2)])[0].couldNotRead).toBe(true);
  });

  it("Chapter Test: the same builder, the same rule", () => {
    const r = buildChapterTestResponse({ paper: PAPER, objective: OBJECTIVE, subjectiveQuestions: WRITTEN, subjectiveResponse: subjective([graded(21, 20, 20), notFound(22, 15), graded(23, 15, 15), graded(24, 10, 10)]) });
    expect(r.pendingCount).toBe(0);
    expect(notFoundNotAttemptedQNumbers(r.results)).toEqual([22]);
  });
});

describe("the saved record: 'graded', so the board trend and estimate count it", () => {
  it("Full Mock record -> status graded, 80-mark total -> eligible for the trend / estimate", () => {
    const rec = buildFullMockSessionRecord({ paper: PAPER, code: "FM-M-01", subject: "maths", response: LIVE(), uid: "u1" });
    expect(rec.status).toBe("graded");
    expect(rec.marksTotal).toBe(80);
    expect(rec.marksAwarded).toBe(13);
    expect(isFullyGradedFullPaper(rec as never)).toBe(true);
    const view = buildBoardScoreView({ paper: { awarded: 13, total: 80, pendingCount: LIVE().pendingCount, notMarkedMarks: 0 }, scores: [{ id: "a", score: 40, gradedAt: 1 }, { id: "FM-M-01", score: 13, gradedAt: 2 }] });
    expect(view?.scoreLine).toBe("You scored 13 / 80 on a full CBSE-pattern paper.");
    expect(view?.estimate).not.toBeNull();
  });

  it("an unreadable page keeps the record 'partial' (unchanged)", () => {
    const r = fm([graded(21, 12, 20), notFound(22, 15), unreadable(23, 15), graded(24, 0, 10)]);
    expect(buildFullMockSessionRecord({ paper: PAPER, code: "FM-M-02", subject: "maths", response: r, uid: "u1" }).status).toBe("partial");
  });

  it("Chapter Test record -> status graded", () => {
    const r = buildChapterTestResponse({ paper: PAPER, objective: OBJECTIVE, subjectiveQuestions: WRITTEN, subjectiveResponse: subjective([graded(21, 20, 20), notFound(22, 15), graded(23, 15, 15), graded(24, 10, 10)]) });
    expect(buildChapterTestSessionRecord({ paper: PAPER, code: "CT-M-TRI-01", subject: "maths", topicKey: "triangles", response: r, uid: "u1" }).status).toBe("graded");
  });
});

describe("the scorecard (live + re-open), the result card and the PDF", () => {
  const view = { scoreLine: "You scored 13 / 80 on a full CBSE-pattern paper.", trend: { points: [40, 13], changeLine: "x" }, estimate: { line: "e", smallPrint: "s" }, estimateHint: null };

  it("Full Mock live: fully graded, final X / 80, the board view kept whole, the block + add-page action", () => {
    const onAddPage = vi.fn();
    const v = fullMockScorecardVariant({ name: "Maths · Full-Length Test 1", code: "FM-M-01", phase: "full", response: LIVE(), questions: PAPER.questions, boardScore: view, onAddPage });
    expect(v.subtitle).toBe("FM-M-01 · fully graded · saved to your progress");
    expect(v.score).toMatchObject({ kind: "marks", awarded: 13, total: 80 });
    expect((v.score as { notMarked?: unknown }).notMarked).toBeUndefined();
    expect(v.boardScore).toEqual(boardScoreFor(view, false));
    expect(v.notFoundNotAttempted).toMatchObject({ questions: ["Q22", "Q23"], line: "If you answered these, add the page" });
    render(<ResultsScorecard variant={v} onClose={() => {}} />);
    const block = screen.getByTestId("sc-not-found-not-attempted");
    expect(block.textContent).toContain("Q22, Q23: Not attempted · 0");
    expect(block.textContent).toContain("If you answered these, add the page.");
    fireEvent.click(screen.getByTestId("sc-add-page"));
    expect(onAddPage).toHaveBeenCalledTimes(1);
  });

  it("the biggest-loss line ignores the not-found marks (not attempted)", () => {
    const lens = deriveFullMockChapterLens(fm([graded(21, 20, 20), notFound(22, 15), notFound(23, 15), graded(24, 10, 10)]), PAPER.questions);
    expect(lens?.[0].lost).toBeGreaterThan(0);
    expect(fullMockChapterLensNote(lens)).toBeNull();
  });

  it("re-opened Full Mock / Chapter Test records read the stored payload the same way", () => {
    const r = LIVE();
    const rec = buildFullMockSessionRecord({ paper: PAPER, code: "FM-M-01", subject: "maths", response: r, uid: "u1" });
    const fmStored = storedFullMockScorecardVariant(rec, { gradedDateLabel: "23 Nov 2026", response: r, onDone: () => {}, onAddPage: () => {} });
    expect(fmStored.notFoundNotAttempted?.questions).toEqual(["Q22", "Q23"]);
    expect(fmStored.score).toMatchObject({ awarded: 13, total: 80 });
    const ct = buildChapterTestResponse({ paper: PAPER, objective: OBJECTIVE, subjectiveQuestions: WRITTEN, subjectiveResponse: subjective([graded(21, 20, 20), notFound(22, 15), graded(23, 15, 15), graded(24, 10, 10)]) });
    const ctRec = buildChapterTestSessionRecord({ paper: PAPER, code: "CT-M-TRI-01", subject: "maths", topicKey: "triangles", response: ct, uid: "u1" });
    const ctStored = storedChapterTestScorecardVariant(ctRec, { gradedDateLabel: "23 Nov 2026", response: ct, onDone: () => {} });
    expect(ctStored.notFoundNotAttempted).toMatchObject({ questions: ["Q22"], line: "If you answered this, add the page" });
    const ctLive = chapterTestScorecardVariant({ name: "Triangles · Test #1", code: "CT-M-TRI-01", phase: "full", response: ct });
    expect(ctLive.subtitle).toBe("CT-M-TRI-01 · fully graded");
    expect(ctLive.notFoundNotAttempted?.questions).toEqual(["Q22"]);
  });

  it("the result card's line, and nothing on a paper with no not-found question", () => {
    const onAddPage = vi.fn();
    render(<NotFoundAddPageLine response={LIVE()} onAddPage={onAddPage} />);
    expect(screen.getByTestId("ct-not-found-not-attempted").textContent).toBe(
      "Q22, Q23: Not attempted · 0 — not found on the pages you uploaded. If you answered these, add the page.Add the page",
    );
    fireEvent.click(screen.getByTestId("ct-add-page"));
    expect(onAddPage).toHaveBeenCalled();
    cleanup();
    const { container } = render(<NotFoundAddPageLine response={fm([graded(21, 20, 20), graded(22, 15, 15), graded(23, 15, 15), graded(24, 10, 10)])} />);
    expect(container.textContent).toBe("");
    expect(notFoundAddPageLine(1)).toBe("If you answered this, add the page");
  });

  it("the graded PDF lists them 'Not attempted · 0' with the helper line; no 'not marked yet'", () => {
    render(<WorksheetGradedPrintDoc ws={PAPER} response={LIVE()} name="Maths · Full-Length Test 1" code="FM-M-01" coaching="" kindLabel="Full Mock" />);
    expect(screen.getByTestId("gp-not-found-not-attempted").textContent).toBe(
      "Q22, Q23: Not attempted · 0 — not found on the pages you uploaded. If you answered these, add the page.",
    );
    expect(screen.queryByTestId("gp-not-marked")).toBeNull();
    expect(document.body.textContent).toContain(NOT_FOUND_NOT_ATTEMPTED_NOTE);
  });
});

describe("the not-counted note's reason (TS-RECHECK-1 copy, coordinator ruling 24 Nov 2026)", () => {
  it("missing answers only -> not-found; an unreadable page only -> unreadable; both / mismatch / no check -> null (neutral)", () => {
    expect(notCountedReasonOf(LIVE().results)).toBe("not-found");
    expect(notCountedReasonOf(fm([notFound(21, 20), notFound(22, 15), notFound(23, 15), notFound(24, 10)]).results)).toBe("not-found");
    expect(notCountedReasonOf(fm([graded(21, 12, 20), unreadable(22, 15), graded(23, 15, 15), graded(24, 10, 10)]).results)).toBe("unreadable");
    expect(notCountedReasonOf(fm([graded(21, 12, 20), notFound(22, 15), unreadable(23, 15), graded(24, 10, 10)]).results)).toBeNull();
    expect(notCountedReasonOf(fm([graded(21, 12, 20), mismatch(22, 15), graded(23, 15, 15), graded(24, 10, 10)]).results)).toBeNull();
    expect(notCountedReasonOf(null)).toBeNull();
  });
});
