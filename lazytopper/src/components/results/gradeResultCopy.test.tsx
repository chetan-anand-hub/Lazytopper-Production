// GRADE-RESULT-COPY-1 — honest copy for a question with NO answer on the uploaded pages, the surface's own
// noun in the "worth N marks" line, the not-attempted exclusion from the retry list, and the slow-retry
// stage forwarded by the three paper services. DISPLAY + PLUMBING ONLY: no mark, type or prompt is touched.
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";
import {
  COULD_NOT_READ_COPY,
  NOT_FOUND_ON_PAGES_COPY,
  gradeStateCopy,
  gradeStateOf,
  isNotFoundOnPages,
  pendingBreakdown,
} from "../../lib/mistakeDisplay";
import ResultsScorecard from "./ResultsScorecard";
import { fullMockScorecardVariant, worksheetScorecardVariant } from "./scorecardVariants";
import { chapterTestScorecardVariant } from "./scorecardBankLenses";
import { analyseTest, buildRetryPlan } from "../testAnalysis/testAnalysisModel";

// Promo / upsell lines read the clock for their prices; they are not under test, so they are stubbed
// (keeps this file out of the clock-sensitive list).
vi.mock("../packs/PackPromoLazy", () => ({ default: () => null }));
vi.mock("./ScorecardUpgradeLine", () => ({ default: () => null }));

const NOT_FOUND_MODEL = "not found on the uploaded pages";
const NOT_FOUND_SERVER =
  "We couldn't find your answer to this question on the uploaded pages, so it has not been marked — if you answered it, add that page (with the question number beside it) and check again.";

const gradedRow = (q: number, awarded: number, total: number): WorksheetQuestionGrade => ({
  qNumber: q,
  couldNotRead: false,
  ok: true,
  totalMarks: total,
  marksAwarded: awarded,
  annotatedSteps: [{ stepNumber: 1, step: "x", status: awarded > 0 ? "correct" : "incorrect" } as never],
});
const pendingRow = (q: number, total: number, note?: string): WorksheetQuestionGrade => ({
  qNumber: q,
  couldNotRead: true,
  totalMarks: total,
  marksAwarded: 0,
  ...(note !== undefined ? { note } : {}),
});

function resp(results: WorksheetQuestionGrade[], total = 20): WorksheetGradeResponse {
  const pend = results.filter((r) => r.couldNotRead).length;
  return {
    ok: true,
    results,
    totalQuestions: results.length,
    gradedCount: results.length - pend,
    pendingCount: pend,
    gradedMarksAwarded: 2,
    gradedMarksTotal: 4,
    worksheetTotalMarks: total,
  };
}

describe("isNotFoundOnPages — one predicate", () => {
  it("not found (model note and server note) vs unreadable vs graded", () => {
    expect(isNotFoundOnPages(pendingRow(1, 2, NOT_FOUND_MODEL))).toBe(true);
    expect(isNotFoundOnPages(pendingRow(1, 2, NOT_FOUND_SERVER))).toBe(true);
    expect(isNotFoundOnPages(pendingRow(1, 2, "Not found on the uploaded page"))).toBe(true);
    // unreadable: a note about the photo, no note at all, the generic pending note
    expect(isNotFoundOnPages(pendingRow(1, 2, "pending"))).toBe(false);
    // review nit: an unreadable note that merely mentions "not found on the page" stays unreadable
    expect(isNotFoundOnPages(pendingRow(1, 2, "question number not found on the page"))).toBe(false);
    expect(isNotFoundOnPages(pendingRow(1, 2, "The photo is too blurry to read"))).toBe(false);
    expect(isNotFoundOnPages(pendingRow(1, 2))).toBe(false);
    // graded rows are never "not found", whatever a stray note says
    expect(isNotFoundOnPages({ ...gradedRow(1, 1, 2), note: NOT_FOUND_MODEL })).toBe(false);
    expect(isNotFoundOnPages(null)).toBe(false);
  });

  it("the row copy: not found says so; unreadable keeps 'retake the photo'; the STATE is unchanged", () => {
    const nf = pendingRow(1, 2, NOT_FOUND_MODEL);
    const un = pendingRow(2, 2, "pending");
    expect(gradeStateCopy(nf)).toBe(NOT_FOUND_ON_PAGES_COPY);
    expect(NOT_FOUND_ON_PAGES_COPY).not.toMatch(/retake|photo|\bAI\b|answer key/i);
    expect(gradeStateCopy(un)).toBe(COULD_NOT_READ_COPY);
    expect(gradeStateOf(nf)).toBe("could-not-read");
    expect(gradeStateOf(un)).toBe("could-not-read");
  });

  it("pendingBreakdown splits the count and the parts add back to pendingCount", () => {
    const rows = [gradedRow(1, 1, 1), pendingRow(2, 2, NOT_FOUND_MODEL), pendingRow(3, 2, NOT_FOUND_SERVER), pendingRow(4, 2, "pending")];
    expect(pendingBreakdown(rows, 3)).toEqual({ unread: 1, mismatch: 0, notGraded: 0, notFound: 2 });
  });
});

describe("the scorecard header splits not-answered from unreadable, with the surface's own noun", () => {
  const rows = [gradedRow(1, 2, 4), pendingRow(2, 2, NOT_FOUND_MODEL), pendingRow(3, 2, NOT_FOUND_SERVER), pendingRow(4, 2, "pending")];
  const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

  const cases: Array<[string, () => ReturnType<typeof chapterTestScorecardVariant>, string]> = [
    ["Chapter Test", () => chapterTestScorecardVariant({ name: "Quadratic Equations · Test #4", code: "CT-M-QE-04", response: resp(rows, 33), phase: "full" }), "The test is worth 33 marks in total."],
    ["Full Mock", () => fullMockScorecardVariant({ name: "Science · Mock #2", code: "FM-S-02", response: resp(rows, 33), phase: "full" }), "The mock paper is worth 33 marks in total."],
  ];
  for (const [label, build, worth] of cases) {
    it(`${label}: '2 not answered on your pages' + '1 couldn't be read', never 'Worksheet'`, () => {
      const { baseElement } = render(<ResultsScorecard variant={build()} onClose={() => {}} />);
      const nf = baseElement.querySelector('[data-grade-state="not-found"].lt-sc__pend');
      expect(text(nf)).toContain("2 questions not answered on your pages");
      expect(text(nf)).not.toMatch(/couldn.t be read|retake/i);
      const pends = Array.from(baseElement.querySelectorAll(".lt-sc__pend")).filter((e) => !e.classList.contains("lt-sc__pend--item"));
      const unread = pends.find((e) => /couldn.t be read/.test(text(e)));
      expect(text(unread ?? null)).toContain("1 question couldn’t be read — re-upload those pages to complete your score.");
      expect(text(unread ?? null)).toContain(worth);
      expect(baseElement.textContent).not.toMatch(/Worksheet is worth/);
      // the per-row copy: the two not-found rows, and the one unreadable row, each in its own words
      const items = Array.from(baseElement.querySelectorAll(".lt-sc__pend--item")).map((e) => text(e));
      expect(items.filter((t) => t.includes(NOT_FOUND_ON_PAGES_COPY))).toHaveLength(2);
      expect(items.filter((t) => t.includes(COULD_NOT_READ_COPY))).toHaveLength(1);
    });
  }

  it("only not-found rows: one honest line carrying the total; no 'couldn't be read' claim", () => {
    const only = resp([gradedRow(1, 2, 4), pendingRow(2, 2, NOT_FOUND_MODEL)], 6);
    const { baseElement } = render(<ResultsScorecard variant={chapterTestScorecardVariant({ name: "N", code: "CT-M-QE-04", response: only, phase: "full" })} onClose={() => {}} />);
    const nf = baseElement.querySelector('[data-grade-state="not-found"].lt-sc__pend');
    expect(text(nf)).toContain("1 question not answered on your pages");
    expect(text(nf)).toContain("The test is worth 6 marks in total.");
    expect(Array.from(baseElement.querySelectorAll(".lt-sc__pend")).some((e) => /couldn.t be read/.test(text(e)) && !e.classList.contains("lt-sc__pend--item"))).toBe(false);
  });

  it("worksheet keeps its own noun", () => {
    const v = worksheetScorecardVariant({ name: "W", code: "WS-M-FULL-02", response: resp(rows, 33), downloading: false, onRead: () => {}, onDownload: () => {} });
    const { baseElement } = render(<ResultsScorecard variant={v} onClose={() => {}} />);
    expect(baseElement.textContent).toContain("The worksheet is worth 33 marks in total.");
  });
});

describe("the retry list counts only questions the student attempted and lost marks on", () => {
  it("an unanswered question (not attempted) is excluded from missedCount and the re-attempt ids", () => {
    const notAttempted: WorksheetQuestionGrade = {
      qNumber: 3,
      couldNotRead: false,
      ok: true,
      totalMarks: 1,
      marksAwarded: 0,
      marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 1, untyped: 0 },
      annotatedSteps: [],
    } as never;
    const rows = analyseTest({
      worksheetId: "w",
      title: "T",
      surface: "chapter-test",
      subject: "maths",
      gradedAt: 1,
      response: resp([gradedRow(1, 1, 1), gradedRow(2, 0, 2), notAttempted, pendingRow(4, 2, NOT_FOUND_MODEL)]),
      questionIds: [],
    });
    expect(rows.find((r) => r.qNumber === 3)?.miss).toBe("not-attempted"); // control: it IS a miss row
    const plan = buildRetryPlan(rows, "/x");
    expect(plan.missedCount).toBe(1); // q2 only
    expect(plan.notAttemptedCount).toBe(1);
  });
});
