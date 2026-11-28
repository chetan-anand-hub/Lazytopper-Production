/**
 * LIVE-FIX-1 (live run 23 Nov 2026, ~23:05 IST, fresh trial account, Maths Full-Length Test 1):
 *   #1 the scorecard header said "fully graded" while its hero said "58 marks not marked yet (17 questions)";
 *   #3 the fair-use panel on a Test Series paper offered the Board Pass only (the Test Series beside it now, trial refusals only);
 *   #4 "Triangles cost you 3 marks — the single biggest loss" on a paper with no mistakes (the 3 marks were unattempted).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";
import { zeroMarksLost } from "../../lib/mistakeDisplay";
import { paperGradeStatus, resultCardParts } from "./scoreTotals";
import { biggestMistakeLossRow, deriveFullMockChapterLens, fullMockChapterLensNote, fullMockScorecardVariant } from "./scorecardVariants";
import { chapterTestScorecardVariant } from "./scorecardBankLenses";
import FairUseLimitPanel from "../usage/FairUseLimitPanel";
import { SeriesOfferButtons } from "../testSeries/WrittenCheckGate";

vi.mock("../packs/OffersBlock", () => ({ default: () => null }));
vi.mock("../pricing/PaywallActions", () => ({ default: () => <span data-testid="paywall-actions" /> }));

afterEach(() => cleanup());

const row = (q: number, awarded: number, total: number, over: Partial<WorksheetQuestionGrade> = {}): WorksheetQuestionGrade => ({
  qNumber: q, couldNotRead: false, ok: true, totalMarks: total, marksAwarded: awarded, annotatedSteps: [], ...over,
});
const unreadable = (q: number, total: number): WorksheetQuestionGrade => ({ qNumber: q, couldNotRead: true, totalMarks: total, note: "The photo is too blurry to read" });
const resp = (results: WorksheetQuestionGrade[], paperTotal = 80): WorksheetGradeResponse => {
  const graded = results.filter((r) => !r.couldNotRead);
  return {
    ok: true, results, totalQuestions: results.length, gradedCount: graded.length, pendingCount: results.length - graded.length,
    gradedMarksAwarded: graded.reduce((s, r) => s + (r.marksAwarded ?? 0), 0), gradedMarksTotal: graded.reduce((s, r) => s + r.totalMarks, 0),
    worksheetTotalMarks: paperTotal,
  };
};

describe("#1 - 'graded', never 'fully graded', while any mark is not marked yet", () => {
  // The live shape: 3 / 80 with 58 marks not marked yet (17 questions).
  const LIVE = resp([row(1, 1, 1), row(2, 2, 21), ...Array.from({ length: 17 }, (_, i) => unreadable(3 + i, i < 16 ? 3 : 10))]);

  it("Full Mock header, Chapter Test header and the result card agree (one helper)", () => {
    expect(paperGradeStatus(LIVE)).toBe("graded");
    const fm = fullMockScorecardVariant({ name: "Maths · Full-Length Test 1", code: "FM-M-01", phase: "full", response: LIVE });
    expect(fm.subtitle).toBe("FM-M-01 · graded · saved to your progress");
    expect(fm.subtitle).not.toContain("fully graded");
    const ct = chapterTestScorecardVariant({ name: "Triangles · Test #1", code: "CT-M-TRI-01", phase: "full", response: LIVE });
    expect(ct.subtitle).toBe("CT-M-TRI-01 · graded");
    expect(resultCardParts(LIVE)).toEqual({ status: "graded", score: "3 / 80", tail: " · 58 marks not marked yet" });
  });

  it("pages still pending with no marks unaccounted for -> 'graded' too; everything marked -> 'fully graded'", () => {
    const pendingOnly = { ...resp([row(1, 1, 1)], 1), pendingCount: 1 };
    expect(paperGradeStatus(pendingOnly)).toBe("graded");
    const clean = resp([row(1, 1, 1), row(2, 50, 79)]);
    expect(paperGradeStatus(clean)).toBe("fully graded");
    expect(fullMockScorecardVariant({ name: "M", code: "FM-M-02", phase: "full", response: clean }).subtitle).toBe("FM-M-02 · fully graded · saved to your progress");
    expect(chapterTestScorecardVariant({ name: "C", code: "CT-02", phase: "full", response: clean }).subtitle).toBe("CT-02 · fully graded");
  });
});

describe("#4 - 'the single biggest loss' counts only marks lost to mistakes", () => {
  const Q = [
    { qNumber: 1, topicKey: "triangles", topicLabel: "Triangles" },
    { qNumber: 2, topicKey: "triangles", topicLabel: "Triangles" },
    { qNumber: 3, topicKey: "triangles", topicLabel: "Triangles" },
    { qNumber: 4, topicKey: "real-numbers", topicLabel: "Real Numbers" },
    { qNumber: 5, topicKey: "real-numbers", topicLabel: "Real Numbers" },
  ];
  const unattemptedMcq = (q: number) => row(q, 0, 1, { marksLostByType: { ...zeroMarksLost(), unattempted: 1 } });

  it("the live case: 3 unattempted Triangles marks and no mistakes -> no line, no 'your biggest loss' action", () => {
    const r = resp([unattemptedMcq(1), unattemptedMcq(2), unattemptedMcq(3), row(4, 1, 1), row(5, 1, 1)], 5);
    const lens = deriveFullMockChapterLens(r, Q);
    expect(lens?.[0]).toMatchObject({ label: "Triangles", lost: 3, mistakeLost: 0 });
    expect(fullMockChapterLensNote(lens)).toBeNull();
    expect(biggestMistakeLossRow(lens)).toBeNull();
    const v = fullMockScorecardVariant({ name: "M", code: "FM-M-01", phase: "full", response: r, questions: Q, onPractiseChapter: () => {} });
    expect(v.chapterLensNote).toBeNull();
    expect(v.actions?.some((a) => /your biggest loss/.test(a.label))).toBe(false);
  });

  it("a real mistake loss names ITS chapter, even when another chapter lost more to blanks; not-marked questions never count", () => {
    const r = resp([
      unattemptedMcq(1), unattemptedMcq(2), unattemptedMcq(3), // Triangles: 3 lost, all not attempted
      row(4, 0, 1, { marksLostByType: { ...zeroMarksLost(), calculation: 1 } }), // Real Numbers: 1 lost to a calculation slip
      unreadable(5, 1),
    ], 5);
    const lens = deriveFullMockChapterLens(r, Q);
    expect(fullMockChapterLensNote(lens)).toBe("Real Numbers cost you 1 mark — the single biggest loss on this paper.");
    const v = fullMockScorecardVariant({ name: "M", code: "FM-M-01", phase: "full", response: r, questions: Q, onPractiseChapter: () => {} });
    expect(v.actions?.some((a) => a.label === "Worksheet on Real Numbers — your biggest loss")).toBe(true);
  });

  it("a wrong answer with no reason recorded is still a loss to the student's work (not 'not attempted')", () => {
    const r = resp([row(1, 0, 1, { marksLostByType: { ...zeroMarksLost(), untyped: 1 } }), row(4, 1, 1)], 2);
    expect(fullMockChapterLensNote(deriveFullMockChapterLens(r, Q))).toBe("Triangles cost you 1 mark — the single biggest loss on this paper.");
  });
});

describe("#3 - the fair-use panel on a Test Series paper offers the Test Series beside the Board Pass", () => {
  const limit = { tier: "trial" as const, scope: "full-mock" as const, resetAt: "2026-11-29T18:30:00.000Z", window: "week" as const };
  const offer = <SeriesOfferButtons testIdPrefix="fair-use" only="test-series" showTotal />;

  it("a TRIAL refusal draws it, with the amount charged on the button; the Board Pass line stays", () => {
    render(<MemoryRouter><FairUseLimitPanel limit={limit} seriesOffer={offer} /></MemoryRouter>);
    expect(screen.getByTestId("fair-use-board-pass")).toBeTruthy();
    expect(screen.getByTestId("fair-use-test-series")).toBeTruthy();
    expect(screen.getByTestId("fair-use-ts").getAttribute("href")).toBe("/packs?buy=test_series");
    expect(screen.getByTestId("fair-use-ts-pay").textContent).toMatch(/^Pay ₹[\d,]+ \+ GST \(₹[\d,]+ total\)$/);
    expect(screen.queryByTestId("fair-use-bp")).toBeNull(); // the panel's own Board Pass offer is not repeated
  });

  it("a paid-Premium (Board Pass) refusal never shows an offer; without the prop the panel is as before", () => {
    render(<MemoryRouter><FairUseLimitPanel limit={{ ...limit, tier: "premium", window: "thirtyDay" }} seriesOffer={offer} /></MemoryRouter>);
    expect(screen.queryByTestId("fair-use-test-series")).toBeNull();
    cleanup();
    render(<MemoryRouter><FairUseLimitPanel limit={limit} /></MemoryRouter>);
    expect(screen.queryByTestId("fair-use-test-series")).toBeNull();
  });
});
