/**
 * TS-BOARDSCORE-1 - the board view's pure helper (owner ruling 23 Nov 2026, 19:04 IST): which papers count, the estimate formula
 * (weights 1..5, spread, rounding, clipping) and the exact copy for 0 / 1 / 2 / 5 / 7 full tests.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BOARD_ESTIMATE_HINT,
  boardEstimate,
  boardEstimateSmallPrint,
  buildBoardScoreView,
  fullTestScores,
  isFullyGradedFullPaper,
  type FullTestRecordLike,
  type FullTestScore,
} from "./boardEstimate";
import { boardEstimateDisabled } from "./boardEstimateFlag";

const rec = (over: Partial<FullTestRecordLike>): FullTestRecordLike => ({
  id: "FM-M-01",
  surface: "full-mock",
  subject: "maths",
  status: "graded",
  marksAwarded: 50,
  marksTotal: 80,
  gradedAt: 1000,
  ...over,
});
const sc = (scores: number[]): FullTestScore[] => scores.map((score, i) => ({ id: `FM-M-${i + 1}`, score, gradedAt: i + 1 }));
const view = (scores: number[], over: { pendingCount?: number; total?: number; estimateDisabled?: boolean } = {}) =>
  buildBoardScoreView({
    paper: { awarded: scores[scores.length - 1] ?? 0, total: over.total ?? 80, pendingCount: over.pendingCount ?? 0 },
    scores: sc(scores),
    estimateDisabled: over.estimateDisabled,
  });

describe("isFullyGradedFullPaper", () => {
  it("counts only a fully graded 80-mark full-length record", () => {
    expect(isFullyGradedFullPaper(rec({}))).toBe(true);
    expect(isFullyGradedFullPaper(rec({ status: "partial" }))).toBe(false); // a pending page: never extrapolated
    expect(isFullyGradedFullPaper(rec({ status: "pending-upload", marksTotal: 20 }))).toBe(false); // Section A only
    expect(isFullyGradedFullPaper(rec({ marksTotal: 75 }))).toBe(false);
    expect(isFullyGradedFullPaper(rec({ surface: "chapter-test" }))).toBe(false);
    expect(isFullyGradedFullPaper(rec({ marksAwarded: Number.NaN }))).toBe(false);
  });
});

describe("fullTestScores", () => {
  const records = [
    rec({ id: "FM-M-03", marksAwarded: 60, gradedAt: 3000 }),
    rec({ id: "FM-M-01", marksAwarded: 40, gradedAt: 1000 }),
    rec({ id: "FM-S-01", subject: "science", marksAwarded: 70, gradedAt: 1500 }), // other subject
    rec({ id: "FM-M-02", marksAwarded: 55, gradedAt: 2000, status: "partial", marksTotal: 75 }), // partial paper
    rec({ id: "FM-M-04", marksAwarded: 58, gradedAt: 4000 }),
  ];

  it("same subject only, fully graded only, oldest -> newest", () => {
    expect(fullTestScores(records, "maths").map((s) => s.score)).toEqual([40, 60, 58]);
    expect(fullTestScores(records, "science").map((s) => s.score)).toEqual([70]);
  });

  it("the live paper is the newest point and its saved record is not counted twice", () => {
    const out = fullTestScores(records, "maths", { current: { id: "FM-M-04", score: 61, gradedAt: 5000 } });
    expect(out.map((s) => `${s.id}:${s.score}`)).toEqual(["FM-M-01:40", "FM-M-03:60", "FM-M-04:61"]);
  });

  it("a re-open reads as of its own record: later papers are left out", () => {
    const out = fullTestScores(records, "maths", { asOf: { id: "FM-M-03", gradedAt: 3000 } });
    expect(out.map((s) => s.id)).toEqual(["FM-M-01", "FM-M-03"]);
  });

  it("a re-opened record that does not itself qualify yields nothing", () => {
    expect(fullTestScores(records, "maths", { asOf: { id: "FM-M-02", gradedAt: 2000 } })).toEqual([]);
  });
});

describe("boardEstimate - the formula", () => {
  it("0 or 1 test: no estimate", () => {
    expect(boardEstimate([])).toBeNull();
    expect(boardEstimate([52])).toBeNull();
  });

  it("2 tests: weights 1,2; spread = max(6, |s2 - s1|)", () => {
    // centre (50*1 + 54*2)/3 = 52.667; spread max(6, 4) = 6 -> [46.667, 58.667] -> 47..59
    expect(boardEstimate([50, 54])).toMatchObject({ low: 47, high: 59, n: 2, spread: 6 });
    // centre (40 + 2*60)/3 = 53.333; spread max(6, 20) = 20 -> [33.333, 73.333] -> 33..73
    expect(boardEstimate([40, 60])).toMatchObject({ low: 33, high: 73, spread: 20 });
  });

  it("5 tests: weights 1..5 (recent counts most); spread = max(4, round(sample SD))", () => {
    // centre (40 + 90 + 150 + 220 + 300)/15 = 53.333; sample SD of 40,45,50,55,60 = 7.906 -> 8 -> 45.333..61.333 -> 45..61
    const e = boardEstimate([40, 45, 50, 55, 60])!;
    expect(e.centre).toBeCloseTo(53.333, 3);
    expect(e).toMatchObject({ low: 45, high: 61, n: 5, spread: 8 });
  });

  it("the weights put the centre nearer the recent scores than a plain mean would", () => {
    const e = boardEstimate([30, 30, 30, 30, 70])!; // plain mean 38, weighted (30*10 + 70*5)/15 = 43.333
    expect(e.centre).toBeCloseTo(43.333, 3);
  });

  it("the spread never drops below 4 with 3+ steady tests", () => {
    expect(boardEstimate([60, 60, 60])).toMatchObject({ low: 56, high: 64, spread: 4 });
  });

  it("7 tests: only the last 5 count", () => {
    expect(boardEstimate([0, 0, 40, 45, 50, 55, 60])).toEqual(boardEstimate([40, 45, 50, 55, 60]));
    expect(boardEstimate([0, 0, 40, 45, 50, 55, 60])!.n).toBe(5);
  });

  it("clipped to 0..80", () => {
    expect(boardEstimate([78, 80])).toMatchObject({ low: 73, high: 80 }); // 79.333 +- 6 -> 73.333..85.333
    expect(boardEstimate([2, 0])).toMatchObject({ low: 0, high: 7 }); // 0.667 +- 6 -> -5.333..6.667
  });

  it("rounds each end to the nearest whole mark (half marks allowed in scores)", () => {
    // centre (50.5 + 2*51.5)/3 = 51.1667; spread 6 -> 45.1667..57.1667 -> 45..57
    expect(boardEstimate([50.5, 51.5])).toMatchObject({ low: 45, high: 57 });
  });
});

describe("buildBoardScoreView - the copy", () => {
  it("not fully graded out of 80: nothing (never extrapolated)", () => {
    expect(view([52], { pendingCount: 1 })).toBeNull();
    expect(view([52], { total: 75 })).toBeNull();
    expect(view([17], { total: 20 })).toBeNull(); // Section A only
  });

  it("owner ruling 19:59 - marks not marked yet: 'So far: X / 80 · N marks not marked yet', never the trend or the estimate", () => {
    const v = buildBoardScoreView({
      paper: { awarded: 52, total: 80, pendingCount: 2, notMarkedMarks: 6 },
      scores: sc([50, 52]),
    });
    expect(v).toEqual({ scoreLine: "So far: 52 / 80 \u00b7 6 marks not marked yet", trend: null, estimate: null, estimateHint: null });
    expect(buildBoardScoreView({ paper: { awarded: 52, total: 80, pendingCount: 1, notMarkedMarks: 1 }, scores: [] })!.scoreLine).toBe(
      "So far: 52 / 80 \u00b7 1 mark not marked yet",
    );
  });

  it("0 tests in history (defensive): just the score line", () => {
    const v = buildBoardScoreView({ paper: { awarded: 52, total: 80, pendingCount: 0 }, scores: [] })!;
    expect(v).toEqual({ scoreLine: "You scored 52 / 80 on a full CBSE-pattern paper.", trend: null, estimate: null, estimateHint: null });
  });

  it("1 test: the score line + the honest one-more-test line; no trend, no estimate", () => {
    const v = view([52])!;
    expect(v.scoreLine).toBe("You scored 52 / 80 on a full CBSE-pattern paper.");
    expect(v.trend).toBeNull();
    expect(v.estimate).toBeNull();
    expect(v.estimateHint).toBe("Take one more full test to see your board estimate.");
    expect(BOARD_ESTIMATE_HINT).toBe(v.estimateHint);
  });

  it("2 tests: trend + estimate with N = 2", () => {
    const v = view([50, 54])!;
    expect(v.trend).toEqual({ points: [50, 54], changeLine: "Up 4 since your first full test" });
    expect(v.estimate).toEqual({
      line: "Board estimate (theory): 47–59 / 80",
      smallPrint:
        "From your last 2 full tests on CBSE-pattern papers, recent tests weighted more. An estimate, not a promise — it moves " +
        "as you take more tests. The 20 internal-assessment marks are not included.",
    });
    expect(v.estimateHint).toBeNull();
  });

  it("5 tests: all five chips, Down line, N = 5", () => {
    const v = view([60, 58, 55, 57, 57])!;
    expect(v.trend).toEqual({ points: [60, 58, 55, 57, 57], changeLine: "Down 3 since your first full test" });
    expect(v.estimate!.smallPrint).toBe(boardEstimateSmallPrint(5));
  });

  it("7 tests: the last five chips; the change is against the OLDEST chip shown, worded over the last 5; N = 5", () => {
    const v = view([40, 44, 50, 52, 55, 58, 61])!;
    expect(v.trend!.points).toEqual([50, 52, 55, 58, 61]);
    expect(v.trend!.changeLine).toBe("Up 11 over your last 5 full tests");
    expect(v.estimate!.smallPrint).toContain("From your last 5 full tests");
  });

  it("6 tests: Down / Level over the last 5 (never against a test that is not on screen)", () => {
    expect(view([20, 60, 58, 55, 57, 57])!.trend).toEqual({ points: [60, 58, 55, 57, 57], changeLine: "Down 3 over your last 5 full tests" });
    expect(view([20, 50, 52, 49, 51, 50])!.trend!.changeLine).toBe("Level over your last 5 full tests");
  });

  it("exactly 5 tests: the oldest chip is the first full test", () => {
    expect(view([50, 52, 55, 58, 61])!.trend!.changeLine).toBe("Up 11 since your first full test");
  });

  it("no change: level, never 'Up 0'", () => {
    expect(view([50, 50])!.trend!.changeLine).toBe("Level with your first full test");
  });

  it("half marks print without float noise", () => {
    expect(view([50, 57.5])!.scoreLine).toBe("You scored 57.5 / 80 on a full CBSE-pattern paper.");
    expect(view([50, 57.5])!.trend!.changeLine).toBe("Up 7.5 since your first full test");
  });

  it("kill switch: trend and estimate hidden, the score line stays", () => {
    expect(view([50, 54], { estimateDisabled: true })).toEqual({
      scoreLine: "You scored 54 / 80 on a full CBSE-pattern paper.",
      trend: null,
      estimate: null,
      estimateHint: null,
    });
    expect(view([54], { estimateDisabled: true })!.estimateHint).toBeNull();
  });
});

describe("boardEstimateDisabled (VITE_BOARD_ESTIMATE_DISABLED)", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("off by default and for '', '0', 'false'; on for any other value", () => {
    expect(boardEstimateDisabled()).toBe(false);
    for (const off of ["", "0", "false", " FALSE "]) {
      vi.stubEnv("VITE_BOARD_ESTIMATE_DISABLED", off);
      expect(boardEstimateDisabled()).toBe(false);
    }
    for (const on of ["1", "true", "yes"]) {
      vi.stubEnv("VITE_BOARD_ESTIMATE_DISABLED", on);
      expect(boardEstimateDisabled()).toBe(true);
    }
  });
});
