import { describe, it, expect } from "vitest";
import type { WorksheetGradeResponse } from "../../ai/aiClient";
import type { SessionRecord } from "../../services/sessionRecords";
import { canonicalQuestionBank } from "../../data/canonicalQuestionBank";
import {
  aggregateFourType,
  worksheetScorecardVariant,
  quickPracticeScorecardVariant,
  storedWorksheetScorecardVariant,
  chapterTestScorecardVariantStub,
  fullMockScorecardVariantStub,
  chapterTestScorecardVariant,
  deriveChapterTestConceptLens,
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

describe("storedWorksheetScorecardVariant (PR-3 read-only re-open)", () => {
  function record(over: Partial<SessionRecord> = {}): SessionRecord {
    return {
      id: "WS-M-QE-03",
      worksheetId: "ws-abc",
      surface: "worksheet",
      title: "Quadratic Equations — Mixed Worksheet",
      subject: "maths",
      topicKeys: ["quadratic-equations"],
      questionIds: ["q1", "q2", "q3", "q4"],
      marksAwarded: 12,
      marksTotal: 20,
      status: "graded",
      fourType: { conceptual: 1, calculation: 0, silly: 2, presentation: 0 },
      sectionBreakdown: null,
      gradedAt: 1751500000000,
      perQuestionRef: "ws:WS-M-QE-03",
      dedupKey: "uid::WS-M-QE-03",
      ...over,
    };
  }
  const noop = () => {};

  it("rebuilds a graded record: marks from the stored record, four-type, code+date subtitle", () => {
    const v = storedWorksheetScorecardVariant(record(), { gradedDateLabel: "3 Jul 2026", onDone: noop });
    expect(v.surface).toBe("worksheet");
    expect(v.subtitle).toBe("WS-M-QE-03 · graded 3 Jul 2026");
    expect(v.score).toEqual({ kind: "marks", awarded: 12, total: 20, gradedCount: 4, totalQuestions: 4 });
    expect(v.fourType).toEqual({ conceptual: 1, calculation: 0, silly: 2, presentation: 0 });
    expect(v.allPending).toBeNull();
    // Only a "Done" action when no graded sheet is resolvable.
    expect(v.actions.map((a) => a.label)).toEqual(["Done"]);
  });

  it("adds a Download action (busy-aware) only when onDownload is supplied", () => {
    const v = storedWorksheetScorecardVariant(record(), {
      gradedDateLabel: "3 Jul 2026",
      onDone: noop,
      onDownload: noop,
      downloading: true,
    });
    expect(v.actions.map((a) => a.tone)).toEqual(["primary", "ghost"]);
    const download = v.actions[0];
    expect(download.label).toBe("Download graded sheet");
    expect(download.busy).toBe(true);
    expect(download.disabled).toBe(true);
  });

  it("a partial record shows its real graded portion WITHOUT a fabricated graded-count", () => {
    const v = storedWorksheetScorecardVariant(record({ status: "partial", marksAwarded: 6, marksTotal: 10 }), {
      gradedDateLabel: "3 Jul 2026",
      onDone: noop,
    });
    expect(v.score).toEqual({ kind: "marks", awarded: 6, total: 10 });
    expect(v.score).not.toHaveProperty("gradedCount");
    expect(v.message).toMatch(/some pages were pending/i);
  });

  it("a pending-upload record shows the honest 'couldn't read' state, never a fake 0", () => {
    const v = storedWorksheetScorecardVariant(
      record({ status: "pending-upload", marksAwarded: 0, marksTotal: 0, fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 } }),
      { gradedDateLabel: "3 Jul 2026", onDone: noop },
    );
    expect(v.allPending?.title).toMatch(/couldn’t read any answers/);
    expect(v.fourType).toBeNull();
    expect(v.subtitle).not.toMatch(/graded/);
  });

  it("a pending-upload record NEVER offers a Download (no graded sheet exists) even if onDownload is passed", () => {
    const v = storedWorksheetScorecardVariant(
      record({ status: "pending-upload", marksAwarded: 0, marksTotal: 0 }),
      { gradedDateLabel: "3 Jul 2026", onDone: noop, onDownload: noop },
    );
    // Done only — no "Download graded sheet" on an all-unreadable session.
    expect(v.actions.map((a) => a.label)).toEqual(["Done"]);
  });

  it("omits the graded-count when questionIds is empty (older record) — no fabricated count", () => {
    const v = storedWorksheetScorecardVariant(record({ questionIds: [] }), {
      gradedDateLabel: "3 Jul 2026",
      onDone: noop,
    });
    expect(v.score).toEqual({ kind: "marks", awarded: 12, total: 20 });
  });
});

describe("deriveChapterTestConceptLens ([FU-CT-CONCEPT-LENS])", () => {
  // Two real bank questions with DISTINCT subtopics, taken live from the bank so the
  // test exercises the true questionId → subtopic join (not a hardcoded id).
  const bySubtopic = new Map<string, (typeof canonicalQuestionBank)[number]>();
  for (const q of canonicalQuestionBank) {
    if (q.id && typeof q.subtopic === "string" && q.subtopic.trim() && !bySubtopic.has(q.subtopic)) {
      bySubtopic.set(q.subtopic, q);
    }
  }
  const [qA, qB] = [...bySubtopic.values()];

  it("aggregates awarded/total per subtopic and sorts by marks LOST (worst first)", () => {
    const resp = response({
      results: [
        { qNumber: 1, couldNotRead: false, totalMarks: 5, marksAwarded: 2 }, // subtopic A
        { qNumber: 2, couldNotRead: false, totalMarks: 5, marksAwarded: 5 }, // subtopic B (clean)
        { qNumber: 3, couldNotRead: false, totalMarks: 3, marksAwarded: 1 }, // subtopic A
      ],
    });
    const rows = deriveChapterTestConceptLens(resp, [
      { qNumber: 1, id: qA.id },
      { qNumber: 2, id: qB.id },
      { qNumber: 3, id: qA.id },
    ]);
    expect(rows).not.toBeNull();
    // A: awarded 3 / total 8 (lost 5); B: awarded 5 / total 5 (lost 0). Worst first → A, then B.
    expect(rows!.map((r) => r.key)).toEqual([qA.subtopic, qB.subtopic]);
    expect(rows![0]).toMatchObject({ key: qA.subtopic, awarded: 3, total: 8, lost: 5 });
    expect(rows![1]).toMatchObject({ key: qB.subtopic, awarded: 5, total: 5, lost: 0 });
  });

  it("includes ALL resolved concepts, even full-mark ones (owner decision — mirror by-section)", () => {
    const resp = response({
      results: [
        { qNumber: 1, couldNotRead: false, totalMarks: 5, marksAwarded: 5 },
        { qNumber: 2, couldNotRead: false, totalMarks: 5, marksAwarded: 5 },
      ],
    });
    const rows = deriveChapterTestConceptLens(resp, [
      { qNumber: 1, id: qA.id },
      { qNumber: 2, id: qB.id },
    ]);
    expect(rows).not.toBeNull();
    expect(rows!.length).toBe(2);
    expect(rows!.every((r) => r.lost === 0)).toBe(true);
  });

  it("HONEST unknown: an unresolvable id + couldNotRead form no concept row", () => {
    const resp = response({
      results: [
        { qNumber: 1, couldNotRead: false, totalMarks: 5, marksAwarded: 2 }, // resolves
        { qNumber: 2, couldNotRead: false, totalMarks: 5, marksAwarded: 0 }, // id not in bank
        { qNumber: 3, couldNotRead: true, totalMarks: 5 }, // illegible — never counted
      ],
    });
    const rows = deriveChapterTestConceptLens(resp, [
      { qNumber: 1, id: qA.id },
      { qNumber: 2, id: "not-a-real-question-id-xyz" },
      { qNumber: 3, id: qB.id },
    ]);
    expect(rows).not.toBeNull();
    // Only the one resolvable, legible question forms a row (no fabricated concept).
    expect(rows!.map((r) => r.key)).toEqual([qA.subtopic]);
    expect(rows![0]).toMatchObject({ awarded: 2, total: 5 });
  });

  it("returns null when NO question resolves to a subtopic (honest absence → shell omits)", () => {
    const resp = response({
      results: [{ qNumber: 1, couldNotRead: false, totalMarks: 5, marksAwarded: 3 }],
    });
    const rows = deriveChapterTestConceptLens(resp, [{ qNumber: 1, id: "nope-not-in-bank" }]);
    expect(rows).toBeNull();
  });
});

describe("chapterTestScorecardVariant — concept lens wiring", () => {
  const firstReal = canonicalQuestionBank.find((q) => q.id && typeof q.subtopic === "string" && q.subtopic.trim())!;

  it("FULL: derives conceptLens when questions are supplied; partial never has one", () => {
    const resp = response({
      results: [{ qNumber: 1, couldNotRead: false, totalMarks: 5, marksAwarded: 3 }],
      totalQuestions: 1,
      gradedCount: 1,
      pendingCount: 0,
      gradedMarksAwarded: 3,
      gradedMarksTotal: 5,
    });
    const full = chapterTestScorecardVariant({
      name: "Light · Test #1",
      code: "CT-S-LIGHT-01",
      phase: "full",
      response: resp,
      questions: [{ qNumber: 1, id: firstReal.id }],
    });
    expect(full.conceptLens).not.toBeNull();
    expect(full.conceptLens![0].key).toBe(firstReal.subtopic);

    const partial = chapterTestScorecardVariant({
      name: "Light · Test #1",
      code: "CT-S-LIGHT-01",
      phase: "partial",
      response: resp,
    });
    expect(partial.conceptLens).toBeNull();
  });

  it("FULL without questions → conceptLens null (host didn't pass the paper)", () => {
    const resp = response({
      results: [{ qNumber: 1, couldNotRead: false, totalMarks: 5, marksAwarded: 3 }],
    });
    const full = chapterTestScorecardVariant({
      name: "Light · Test #1",
      code: "CT-S-LIGHT-01",
      phase: "full",
      response: resp,
    });
    expect(full.conceptLens).toBeNull();
  });
});
