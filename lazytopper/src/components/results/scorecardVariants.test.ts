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
  deriveFullMockSectionLens,
  deriveFullMockChapterLens,
  fullMockChapterLensNote,
  fullMockFocusLine,
  fullMockScorecardVariant,
  storedFullMockScorecardVariant,
  checkImproveScorecardVariant,
  storedCheckImproveScorecardVariant,
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

// ── FULL MOCK live variant (Full Mock build — fills the PR-2 seam) ────────────────

describe("deriveFullMockSectionLens", () => {
  it("is EXACT from the paper's sections when questions are supplied", () => {
    const resp = response({
      results: [
        { qNumber: 1, couldNotRead: false, totalMarks: 1, marksAwarded: 1 },
        { qNumber: 2, couldNotRead: false, totalMarks: 4, marksAwarded: 2 },
      ],
    });
    const rows = deriveFullMockSectionLens(resp, [
      { qNumber: 1, section: "A" },
      { qNumber: 2, section: "E" },
    ])!;
    expect(rows.map((r) => r.section)).toEqual(["A", "E"]);
    expect(rows[1]).toMatchObject({ awarded: 2, total: 4 });
  });

  it("falls back to the CBSE band proxy without questions (exact for FM bands) and skips pending", () => {
    const resp = response({
      results: [
        { qNumber: 1, couldNotRead: false, totalMarks: 2, marksAwarded: 2 }, // → B
        { qNumber: 2, couldNotRead: false, totalMarks: 5, marksAwarded: 3 }, // → D
        { qNumber: 3, couldNotRead: true, totalMarks: 3 }, // pending — excluded
      ],
    });
    const rows = deriveFullMockSectionLens(resp)!;
    expect(rows.map((r) => r.section)).toEqual(["B", "D"]);
  });
});

describe("deriveFullMockChapterLens + note", () => {
  const questions = [
    { qNumber: 1, topicKey: "trigonometry", topicLabel: "Trigonometry" },
    { qNumber: 2, topicKey: "trigonometry", topicLabel: "Trigonometry" },
    { qNumber: 3, topicKey: "real-numbers", topicLabel: "Real Numbers" },
    { qNumber: 4 }, // no chapter — honest unknown, must not appear
  ];
  const resp = response({
    results: [
      { qNumber: 1, couldNotRead: false, totalMarks: 5, marksAwarded: 1 },
      { qNumber: 2, couldNotRead: false, totalMarks: 4, marksAwarded: 2 },
      { qNumber: 3, couldNotRead: false, totalMarks: 3, marksAwarded: 3 },
      { qNumber: 4, couldNotRead: false, totalMarks: 2, marksAwarded: 0 },
    ],
  });

  it("rolls up per chapter, sorts by marks LOST, skips unknowns (never fabricated)", () => {
    const rows = deriveFullMockChapterLens(resp, questions)!;
    expect(rows).toHaveLength(2); // q4's unknown chapter is absent
    expect(rows[0]).toMatchObject({ label: "Trigonometry", awarded: 3, total: 9, lost: 6 });
    expect(rows[1]).toMatchObject({ label: "Real Numbers", awarded: 3, total: 3, lost: 0 });
  });

  it("the note names the single biggest loss — and is SILENT on a clean paper", () => {
    const rows = deriveFullMockChapterLens(resp, questions)!;
    expect(fullMockChapterLensNote(rows)).toBe(
      "Trigonometry cost you 6 marks — the single biggest loss on this paper.",
    );
    const clean = deriveFullMockChapterLens(
      response({
        results: [{ qNumber: 3, couldNotRead: false, totalMarks: 3, marksAwarded: 3 }],
      }),
      questions,
    );
    expect(fullMockChapterLensNote(clean)).toBeNull();
  });
});

describe("fullMockFocusLine (§8b — measurement, neutral, aggregates only)", () => {
  it("formats active/away/breaks; null when unmeasured", () => {
    expect(
      fullMockFocusLine({ activeMs: 161 * 60000, awayMs: 19 * 60000, awayEventCount: 4 }),
    ).toBe("Focus time (on-screen) · 2h 41m of 3h 0m · away 19m across 4 breaks.");
    expect(fullMockFocusLine({ activeMs: 0, awayMs: 0, awayEventCount: 0 })).toBeNull();
    expect(fullMockFocusLine({ activeMs: 30 * 60000, awayMs: 0, awayEventCount: 0 })).toBe(
      "Focus time (on-screen) · 30m — you never left the exam screen.",
    );
  });
});

describe("fullMockScorecardVariant", () => {
  it("PARTIAL: objective marks only, NO four-type, no lenses, upload-led actions", () => {
    const v = fullMockScorecardVariant({
      name: "Maths · Mock #4",
      code: "FM-M-04",
      phase: "partial",
      response: response({
        gradedMarksAwarded: 17,
        gradedMarksTotal: 20,
        worksheetTotalMarks: 80,
      }),
      onUpload: noop,
      onUploadLater: noop,
    });
    expect(v.surface).toBe("full-mock");
    expect(v.deferred).toBeUndefined();
    expect(v.fourType).toBeNull();
    expect(v.sectionLens).toBeNull();
    expect(v.chapterLens).toBeNull();
    expect(v.message).toContain("Sections B–E, 60 marks");
    expect(v.actions[0].label).toContain("Upload answer sheet");
  });

  it("FULL: section + chapter lenses + four-type + honest delta passthrough + MI-led practise label", () => {
    const resp = response({
      results: [
        {
          qNumber: 1,
          couldNotRead: false,
          totalMarks: 5,
          marksAwarded: 1,
          mistakeSummary: { conceptual: 2, calculation: 0, silly: 0, presentation: 0 },
        },
        { qNumber: 2, couldNotRead: false, totalMarks: 3, marksAwarded: 3 },
      ],
      gradedCount: 2,
      pendingCount: 0,
      gradedMarksAwarded: 4,
      gradedMarksTotal: 8,
    });
    const v = fullMockScorecardVariant({
      name: "Maths · Mock #4",
      code: "FM-M-04",
      phase: "full",
      response: resp,
      questions: [
        { qNumber: 1, section: "D", topicKey: "trigonometry", topicLabel: "Trigonometry" },
        { qNumber: 2, section: "C", topicKey: "real-numbers", topicLabel: "Real Numbers" },
      ],
      deltaLine: "▲ 9 marks vs Maths · Mock #3",
      onReadSheet: noop,
      onPractiseChapter: noop,
      onDownloadGraded: noop,
      onDownloadSolution: noop,
    });
    expect(v.sectionLens!.map((r) => r.section)).toEqual(["C", "D"]);
    expect(v.chapterLens![0].label).toBe("Trigonometry");
    expect(v.chapterLensNote).toContain("Trigonometry cost you 4 marks");
    expect(v.message).toBe("▲ 9 marks vs Maths · Mock #3");
    expect(v.fourType).toEqual({ conceptual: 2, calculation: 0, silly: 0, presentation: 0 });
    expect(v.actions[1].label).toBe("Worksheet on Trigonometry — your biggest loss");
    // NO board-readiness projection anywhere (spec §5).
    const allText = JSON.stringify(v);
    expect(allText).not.toMatch(/readiness|projected/i);
  });
});

describe("storedFullMockScorecardVariant", () => {
  const record = (over: Partial<SessionRecord> = {}): SessionRecord => ({
    id: "FM-M-03",
    worksheetId: "fm-x",
    surface: "full-mock",
    title: "Maths · Mock #3",
    subject: "maths",
    topicKeys: ["trigonometry"],
    questionIds: [],
    marksAwarded: 17,
    marksTotal: 20,
    status: "partial",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: 1,
    perQuestionRef: "fm:FM-M-03",
    dedupKey: "u::FM-M-03",
    ...over,
  });

  it("awaiting-sheet re-open: real objective score + honest upload state, never a 0", () => {
    const v = storedFullMockScorecardVariant(record(), {
      gradedDateLabel: "12 Jul 2026",
      onDone: noop,
    });
    expect(v.score).toMatchObject({ kind: "marks", awarded: 17, total: 20 });
    expect(v.message).toContain("upload your written answers");
    expect(v.fourType).toBeNull();
  });

  it("cross-device awaiting re-open: the honest override line renders, nothing fabricated", () => {
    const v = storedFullMockScorecardVariant(record(), {
      gradedDateLabel: "12 Jul 2026",
      awaitingDetail: "This mock was sat on another device — open LazyTopper there.",
      onDone: noop,
    });
    expect(v.message).toContain("another device");
    expect(v.chapterLens).toBeNull();
  });

  it("graded re-open surfaces the stored §8b focus aggregates as the neutral line", () => {
    const v = storedFullMockScorecardVariant(
      record({
        status: "graded",
        focus: { activeMs: 60 * 60000, awayMs: 10 * 60000, awayEventCount: 2, longestAwayMs: 6 * 60000 },
      }),
      { gradedDateLabel: "12 Jul 2026", onDone: noop },
    );
    expect(v.note).toBe("Focus time (on-screen) · 1h 0m of 1h 10m · away 10m across 2 breaks.");
  });
});

// ── CHECK & IMPROVE — the 5th surface (C&I PR-1) ────────────────────────────────

describe("checkImproveScorecardVariant", () => {
  const base = {
    topicName: "Real Numbers",
    code: "CI-M-REAL-03",
    topicSource: "inferred" as const,
    response: response(),
    saved: true,
    onReadSheet: noop,
    onDownloadGraded: noop,
    onPractiseTopic: noop,
  };

  it("builds the marks hero + four-type + pending strip + the honest saved subtitle", () => {
    const v = checkImproveScorecardVariant(base);
    expect(v.surface).toBe("check-improve");
    expect(v.title).toBe("Check & Improve paper");
    expect(v.subtitle).toBe(
      "Real Numbers · CI-M-REAL-03 · graded just now · saved to your progress",
    );
    expect(v.score).toEqual({ kind: "marks", awarded: 8, total: 10, gradedCount: 2, totalQuestions: 3 });
    expect(v.fourType).toEqual({ conceptual: 1, calculation: 1, silly: 1, presentation: 2 });
    expect(v.pending).toEqual({ count: 1, worksheetTotalMarks: 15 });
    expect(v.note).toBe("Topic detected automatically"); // quiet provenance line
    expect(v.actions[0].label).toBe("Read my graded answer sheet");
    expect(v.actions[1].label).toBe("Practise Real Numbers");
  });

  it("confirmed provenance shows on the quiet line", () => {
    const v = checkImproveScorecardVariant({ ...base, topicSource: "confirmed" });
    expect(v.note).toBe("Topic confirmed by you");
  });

  it("a MIXED paper: honest header, the §4.1 statement, and NO Practise action (no honest target)", () => {
    const v = checkImproveScorecardVariant({
      ...base,
      topicName: "",
      code: "CI-M-MIX-01",
      topicSource: "mixed",
    });
    expect(v.subtitle).toContain("Uploaded paper · CI-M-MIX-01 · mixed topics");
    expect(v.message).toContain("no single topic's progress is guessed");
    expect(v.note).toBeNull();
    expect(v.actions.map((a) => a.label)).not.toContainEqual(expect.stringContaining("Practise"));
  });

  it("a signed-out grade never claims saving", () => {
    const v = checkImproveScorecardVariant({ ...base, saved: false });
    expect(v.subtitle).not.toContain("saved to your progress");
    expect(v.footnote).toContain("Not saved");
  });

  it("all-pending: the honest couldn't-read state, never a 0", () => {
    const v = checkImproveScorecardVariant({
      ...base,
      response: response({ gradedCount: 0, pendingCount: 3, gradedMarksAwarded: 0, gradedMarksTotal: 0 }),
    });
    expect(v.allPending?.title).toBe("We couldn’t read any answers");
    expect(v.fourType).toBeNull();
  });

  it("NO board-readiness projection and NO solution key (the questions are the student's own)", () => {
    const v = checkImproveScorecardVariant(base);
    const allText = JSON.stringify(v);
    expect(allText).not.toMatch(/readiness|projected/i);
    expect(v.actions.map((a) => a.label)).not.toContainEqual(expect.stringContaining("solution key"));
  });
});

describe("storedCheckImproveScorecardVariant", () => {
  const ciRecord = (over: Partial<SessionRecord> = {}): SessionRecord => ({
    id: "CI-M-REAL-03",
    worksheetId: "ci:CI-M-REAL-03",
    surface: "check-improve",
    title: "Real Numbers · Paper #3",
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: [],
    marksAwarded: 8,
    marksTotal: 10,
    status: "graded",
    fourType: { conceptual: 1, calculation: 1, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: 1,
    perQuestionRef: "ci:CI-M-REAL-03",
    dedupKey: "u::CI-M-REAL-03",
    topicSource: "confirmed",
    ...over,
  });

  it("read-only re-open: stored score + four-type + provenance, Done only", () => {
    const v = storedCheckImproveScorecardVariant(ciRecord(), {
      gradedDateLabel: "13 Jul 2026",
      onDone: noop,
    });
    expect(v.surface).toBe("check-improve");
    expect(v.subtitle).toBe("CI-M-REAL-03 · graded 13 Jul 2026");
    // No graded-count claim: questionIds is honestly [] for external uploads.
    expect(v.score).toEqual({ kind: "marks", awarded: 8, total: 10 });
    expect(v.fourType).toEqual({ conceptual: 1, calculation: 1, silly: 0, presentation: 0 });
    expect(v.note).toBe("Topic confirmed by you");
    expect(v.actions).toHaveLength(1);
    expect(v.actions[0].label).toBe("Done");
  });

  it("absent provenance stays absent — never backfilled into a claim (spec §4.3)", () => {
    const v = storedCheckImproveScorecardVariant(ciRecord({ topicSource: undefined }), {
      gradedDateLabel: "13 Jul 2026",
      onDone: noop,
    });
    expect(v.note).toBeNull();
  });

  it("a stored MIXED paper carries the §4.1 statement; partial adds the honest pending line", () => {
    const v = storedCheckImproveScorecardVariant(
      ciRecord({ topicSource: "mixed", topicKeys: [], status: "partial" }),
      { gradedDateLabel: "13 Jul 2026", onDone: noop },
    );
    expect(v.message).toContain("no single topic's progress is guessed");
    expect(v.message).toContain("Graded portion shown");
  });
});
