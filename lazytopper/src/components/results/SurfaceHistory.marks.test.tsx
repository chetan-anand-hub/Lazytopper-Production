/**
 * SCORECARD-MI-1 PR-2 (B7) — the re-downloaded graded worksheet PDF's coaching line speaks in
 * MARKS when the locally cached grade response carries GRADER-CORE-1 v2 `marksLostByType`, and
 * keeps today's record COUNTS otherwise (an old cached grade is never converted). The DotStrip
 * stays record-based counts (the SessionRecord shape is gate-frozen).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { SessionRecord } from "../../services/sessionRecords";
import type { WorksheetGradeResponse } from "../../ai/aiClient";

const h = vi.hoisted(() => ({
  records: [] as unknown[],
  grade: null as unknown,
  exportPdf: vi.fn(async (_args: { coaching: string }) => "file.pdf"),
}));
vi.mock("../../services/progressStore", () => ({
  getSurfaceHistory: () => h.records,
  getSubjectProgress: () => null,
}));
vi.mock("../../services/worksheetSessionStore", () => ({
  getWorksheetSession: () => ({ worksheetId: "ws-1", title: "Sheet", questions: [] }),
  getWorksheetGrade: () => h.grade,
}));
vi.mock("../worksheet/worksheetPdfExport", () => ({
  exportGradedWorksheetPdf: (args: { coaching: string }) => h.exportPdf(args),
}));

import SurfaceHistory, { storedCoaching } from "./SurfaceHistory";
import { zeroMarksLost } from "../../lib/mistakeDisplay";

const RECORD = {
  id: "WS-M-REAL-01",
  worksheetId: "ws-1",
  surface: "worksheet",
  title: "Real Numbers · Worksheet",
  subject: "maths",
  topicKeys: ["real-numbers"],
  questionIds: ["q1", "q2"],
  marksAwarded: 4,
  marksTotal: 10,
  status: "graded",
  // the record's COUNTS: one silly slip, two concept gaps
  fourType: { conceptual: 2, calculation: 0, silly: 1, presentation: 0 },
  sectionBreakdown: null,
  gradedAt: Date.UTC(2026, 9, 1),
  perQuestionRef: "ws-1",
  dedupKey: "u::WS-M-REAL-01",
} as unknown as SessionRecord;

const q = (n: number, total: number, awarded: number, marks?: Partial<ReturnType<typeof zeroMarksLost>>) => ({
  qNumber: n,
  couldNotRead: false,
  totalMarks: total,
  marksAwarded: awarded,
  annotatedSteps: [],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: "",
  ...(marks ? { marksLostByType: { ...zeroMarksLost(), ...marks } } : {}),
});
const gradeOf = (results: unknown[], pendingCount = 0): WorksheetGradeResponse =>
  ({
    ok: true,
    results,
    totalQuestions: results.length,
    gradedCount: results.length,
    pendingCount,
    gradedMarksAwarded: 4,
    gradedMarksTotal: 10,
    worksheetTotalMarks: 10,
  }) as unknown as WorksheetGradeResponse;

/** v2: Q1 lost 5 (conceptual 3, silly 0.5, unattempted 1.5), Q2 lost 1 (untyped). */
const V2_GRADE = gradeOf([q(1, 5, 0, { conceptual: 3, silly: 0.5, unattempted: 1.5 }), q(2, 5, 4, { untyped: 1 })], 1);
/** The same paper as an OLD cached grade — no marksLostByType anywhere. */
const V1_GRADE = gradeOf([q(1, 5, 0), q(2, 5, 4)], 1);

beforeEach(() => {
  h.records = [RECORD];
  h.grade = null;
  h.exportPdf.mockClear();
});
afterEach(() => cleanup());

describe("storedCoaching — marks when the cached grade carries them, counts otherwise", () => {
  it("★ v2 cached grade → the line speaks in MARKS, groups from lib/mistakeDisplay", () => {
    const line = storedCoaching(RECORD, V2_GRADE);
    expect(line).toContain("Learn this: 3 marks to gain");
    expect(line).toContain("You already know this: 0.5 marks to gain");
    expect(line).toContain("1.5 marks not attempted — not counted as a mistake.");
    expect(line).toContain("1 mark lost, reason not recorded.");
    expect(line).toContain("Re-upload the 1 pending page");
    // never the record's counts in a marks line
    expect(line).not.toMatch(/knowledge gaps?\b|careless slip/);
  });

  it("CONTROL — an old cached grade (no marksLostByType) keeps today's COUNTS line, byte-identical", () => {
    const today = storedCoaching(RECORD);
    expect(storedCoaching(RECORD, V1_GRADE)).toBe(today);
    expect(storedCoaching(RECORD, null)).toBe(today);
    expect(today).toContain("2 knowledge gaps");
    expect(today).toContain("1 careless slip");
    expect(today).not.toMatch(/\d marks? to gain/);
  });

  it("a not-ok cached grade is never read for marks", () => {
    expect(storedCoaching(RECORD, { ...V2_GRADE, ok: false })).toBe(storedCoaching(RECORD));
  });
});

describe("the real download path passes the cached grade into the coaching", () => {
  async function downloadFromHistory() {
    render(<SurfaceHistory surface="worksheet" uid="u-1" />);
    fireEvent.click(screen.getByRole("button", { name: /Re-open the Real Numbers · Worksheet scorecard/ }));
    const download = await screen.findByRole("button", { name: /Download graded sheet/ });
    // the export resolves and the busy flag clears inside act (no stray state update)
    await act(async () => {
      fireEvent.click(download);
    });
    expect(h.exportPdf).toHaveBeenCalledTimes(1);
    return h.exportPdf.mock.calls[0][0].coaching;
  }

  it("★ v2 cached grade → the exported PDF's coaching is in marks", async () => {
    h.grade = V2_GRADE;
    const coaching = await downloadFromHistory();
    expect(coaching).toContain("Learn this: 3 marks to gain");
  });

  it("CONTROL — old cached grade → the exported PDF's coaching is the record's counts", async () => {
    h.grade = V1_GRADE;
    const coaching = await downloadFromHistory();
    expect(coaching).toContain("2 knowledge gaps");
    expect(coaching).not.toMatch(/marks to gain/);
  });
});
