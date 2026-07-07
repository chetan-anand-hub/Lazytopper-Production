import { describe, it, expect } from "vitest";
import type { WorksheetGradeResponse } from "../../ai/aiClient";
import {
  aggregateFourType,
  worksheetScorecardVariant,
  quickPracticeScorecardVariant,
  chapterTestScorecardVariantStub,
  fullMockScorecardVariantStub,
} from "./scorecardVariants";

// A minimal grade-response fixture. `couldNotRead` questions carry NO grade and must
// never be folded into the four-type or a 0 (honest-failure contract).
function response(over: Partial<WorksheetGradeResponse> = {}): WorksheetGradeResponse {
  return {
    ok: true,
    results: [
      {
        qNumber: 1,
        couldNotRead: false,
        totalMarks: 5,
        marksAwarded: 3,
        mistakeSummary: { conceptual: 1, calculation: 1, silly: 0, presentation: 0 },
      },
      {
        qNumber: 2,
        couldNotRead: false,
        totalMarks: 5,
        marksAwarded: 5,
        mistakeSummary: { conceptual: 0, calculation: 0, silly: 1, presentation: 2 },
      },
      // couldNotRead — must be skipped by the aggregation.
      { qNumber: 3, couldNotRead: true, totalMarks: 5, note: "re-upload" },
    ],
    totalQuestions: 3,
    gradedCount: 2,
    pendingCount: 1,
    gradedMarksAwarded: 8,
    gradedMarksTotal: 10,
    worksheetTotalMarks: 15,
    ...over,
  };
}

const noop = () => {};

describe("aggregateFourType", () => {
  it("sums mistakeSummary over legible questions and skips couldNotRead", () => {
    expect(aggregateFourType(response())).toEqual({
      conceptual: 1,
      calculation: 1,
      silly: 1,
      presentation: 2,
    });
  });
});

describe("worksheetScorecardVariant", () => {
  it("builds the marks score model + four-type + pending strip", () => {
    const v = worksheetScorecardVariant({
      name: "Quadratic Equations — Mixed Worksheet",
      code: "WS-M-QE-03",
      response: response(),
      downloading: false,
      onRead: noop,
      onDownload: noop,
    });
    expect(v.surface).toBe("worksheet");
    expect(v.subtitle).toBe("WS-M-QE-03 · graded just now");
    expect(v.score).toEqual({ kind: "marks", awarded: 8, total: 10, gradedCount: 2, totalQuestions: 3 });
    expect(v.fourType).toEqual({ conceptual: 1, calculation: 1, silly: 1, presentation: 2 });
    expect(v.pending).toEqual({ count: 1, worksheetTotalMarks: 15 });
    expect(v.allPending).toBeNull();
    // Read (ghost) + Download (primary), in that DOM order.
    expect(v.actions.map((a) => a.tone)).toEqual(["ghost", "primary"]);
    expect(v.actions[1].label).toBe("Download graded sheet");
  });

  it("all-pending (gradedCount 0) hides four-type, disables actions, shows honest message", () => {
    const v = worksheetScorecardVariant({
      name: "WS",
      code: "WS-M-QE-04",
      response: response({ gradedCount: 0, pendingCount: 3, gradedMarksAwarded: 0, gradedMarksTotal: 0 }),
      downloading: false,
      onRead: noop,
      onDownload: noop,
    });
    expect(v.fourType).toBeNull();
    expect(v.pending).toBeNull();
    expect(v.allPending?.title).toBe("We couldn’t read any answers");
    expect(v.actions.every((a) => a.disabled)).toBe(true);
  });

  it("marks the Download action busy while a PDF is exporting", () => {
    const v = worksheetScorecardVariant({
      name: "WS",
      code: "WS-M-QE-03",
      response: response(),
      downloading: true,
      onRead: noop,
      onDownload: noop,
    });
    const download = v.actions[1];
    expect(download.busy).toBe(true);
    expect(download.busyLabel).toBe("Preparing PDF…");
    expect(download.disabled).toBe(true);
  });

  it("omits the pending strip when nothing is pending", () => {
    const v = worksheetScorecardVariant({
      name: "WS",
      code: "WS-M-QE-03",
      response: response({ pendingCount: 0, results: response().results.slice(0, 2), totalQuestions: 2, gradedCount: 2 }),
      downloading: false,
      onRead: noop,
      onDownload: noop,
    });
    expect(v.pending).toBeNull();
  });
});

describe("quickPracticeScorecardVariant", () => {
  const base = {
    onFreshSet: noop,
    onChapterTest: noop,
    onPredicted: noop,
    onStudy: noop,
    onKeepPracticing: noop,
  };

  it("uses the attempts score model, never marks/total", () => {
    const v = quickPracticeScorecardVariant({ ...base, attempted: 4, totalInSet: 8, mcqAnswered: 3, mcqCorrect: 2, allDone: false });
    expect(v.score).toEqual({ kind: "attempts", attempted: 4, ofN: 8, mcqAnswered: 3, mcqCorrect: 2 });
    expect(v.stackActions).toBe(true);
    expect(v.footnote).toMatch(/saved to your progress/);
  });

  it("0-attempted shows the honest empty state and the floor menu (no-signal → keep)", () => {
    const v = quickPracticeScorecardVariant({ ...base, attempted: 0, totalInSet: 6, mcqAnswered: 0, mcqCorrect: 0, allDone: false });
    expect(v.message).toMatch(/nothing is counted against you/);
    expect(v.note).toBeNull();
    expect(v.fourType).toBeNull();
    // No-signal → floor default primary = keep practicing.
    expect(v.actions[0].tone).toBe("primary");
    expect(v.actions[0].label).toBe("Keep practicing this set");
  });

  it("partial session shows the 'didn't reach' framing + MCQ nudge", () => {
    const v = quickPracticeScorecardVariant({ ...base, attempted: 3, totalInSet: 10, mcqAnswered: 2, mcqCorrect: 1, allDone: false });
    expect(v.message).toMatch(/The 7 you didn't reach aren't counted/);
    expect(v.note).toMatch(/You missed 1 MCQ/);
  });

  it("strong session (≥3 MCQs, ≥80%) elevates the Chapter Test to primary; keep omitted when allDone", () => {
    const v = quickPracticeScorecardVariant({ ...base, attempted: 5, totalInSet: 5, mcqAnswered: 4, mcqCorrect: 4, allDone: true });
    expect(v.actions[0].label).toBe("Chapter Test");
    expect(v.actions[0].tone).toBe("primary");
    expect(v.note).toMatch(/All 4 MCQs correct/);
    // allDone → the "Keep practicing this set" floor item is not present.
    expect(v.actions.some((a) => a.label === "Keep practicing this set")).toBe(false);
  });

  it("dipping session (≥3 MCQs, <50%) elevates Study this chapter to primary", () => {
    const v = quickPracticeScorecardVariant({ ...base, attempted: 5, totalInSet: 5, mcqAnswered: 4, mcqCorrect: 1, allDone: true });
    expect(v.actions[0].label).toBe("Study this chapter");
    expect(v.actions[0].tone).toBe("primary");
  });

  it("renders an MI four-type block ONLY when typed mistakes are supplied", () => {
    const withNone = quickPracticeScorecardVariant({ ...base, attempted: 5, totalInSet: 5, mcqAnswered: 0, mcqCorrect: 0, allDone: true });
    expect(withNone.fourType).toBeNull();
    const withMistakes = quickPracticeScorecardVariant({
      ...base,
      attempted: 5,
      totalInSet: 5,
      mcqAnswered: 0,
      mcqCorrect: 0,
      allDone: true,
      fourType: { conceptual: 2, calculation: 0, silly: 0, presentation: 0 },
    });
    expect(withMistakes.fourType).toEqual({ conceptual: 2, calculation: 0, silly: 0, presentation: 0 });
    // An all-zero four-type is treated as "no typed mistakes" → silent.
    const withZero = quickPracticeScorecardVariant({
      ...base,
      attempted: 5,
      totalInSet: 5,
      mcqAnswered: 0,
      mcqCorrect: 0,
      allDone: true,
      fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    });
    expect(withZero.fourType).toBeNull();
  });
});

describe("deferred config seams", () => {
  it("chapter-test + full-mock are defined-but-deferred (never rendered live)", () => {
    expect(chapterTestScorecardVariantStub({ title: "CT" }).deferred).toBe(true);
    expect(fullMockScorecardVariantStub({ title: "FM" }).deferred).toBe(true);
    expect(chapterTestScorecardVariantStub({ title: "CT" }).surface).toBe("chapter-test");
    expect(fullMockScorecardVariantStub({ title: "FM" }).surface).toBe("full-mock");
  });
});
