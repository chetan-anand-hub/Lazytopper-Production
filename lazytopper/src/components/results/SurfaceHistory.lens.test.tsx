/**
 * SCORECARD-SECTION-TYPE-1 - a re-opened history entry shows the section / type lens from the record's own
 * stored grade. The device cache is keyed by worksheet id, so it may hold a DIFFERENT grade than this record;
 * it is used only when its totals match the record's.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import type { SessionRecord } from "../../services/sessionRecords";

const h = vi.hoisted(() => ({ records: [] as unknown[], grade: null as unknown }));
vi.mock("../../services/progressStore", () => ({
  getSurfaceHistory: () => h.records,
  getSubjectProgress: () => null,
}));
vi.mock("../../services/worksheetSessionStore", () => ({
  getWorksheetSession: () => null,
  getWorksheetGrade: () => h.grade,
}));
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return { ...actual, getSessionPerQuestion: () => Promise.resolve(null) };
});
vi.mock("../worksheet/worksheetPdfExport", () => ({ exportGradedWorksheetPdf: async () => "f.pdf" }));

import SurfaceHistory from "./SurfaceHistory";

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
  fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  sectionBreakdown: null,
  gradedAt: Date.UTC(2026, 9, 1),
  perQuestionRef: "ws-1",
  dedupKey: "u::WS-M-REAL-01",
} as unknown as SessionRecord;

const row = (qNumber: number, total: number, awarded: number, section: string) => ({
  qNumber, couldNotRead: false, ok: true, totalMarks: total, marksAwarded: awarded, section, sectionBasis: "bank", annotatedSteps: [],
});
const grade = (awarded: number, total: number) => ({
  ok: true,
  results: [row(1, 4, 1, "C"), row(2, total - 4, awarded - 1, "D")],
  totalQuestions: 2, gradedCount: 2, pendingCount: 0,
  gradedMarksAwarded: awarded, gradedMarksTotal: total, worksheetTotalMarks: total,
});

beforeEach(() => {
  h.records = [RECORD];
});
afterEach(() => cleanup());

async function open() {
  render(<SurfaceHistory surface="worksheet" uid="u1" />);
  fireEvent.click(screen.getByRole("button", { name: /Re-open the Real Numbers/ }));
}

describe("SurfaceHistory reopen lens", () => {
  it("a cached grade whose totals MATCH the record gives the restored card its section lens", async () => {
    h.grade = grade(4, 10);
    await open();
    const lens = await screen.findByTestId("sc-section-lens");
    expect(lens.querySelector('[data-row="C"]')!.textContent).toContain("C · Short");
    expect(lens.querySelector('[data-row="D"]')).not.toBeNull();
  });

  it("a cached grade of a DIFFERENT result (totals differ from the record) is not used: no lens", async () => {
    h.grade = grade(9, 10); // a later re-grade of the same worksheet id
    await open();
    await screen.findByRole("button", { name: /Done/ });
    await waitFor(() => expect(screen.queryByTestId("sc-section-lens")).toBeNull());
  });
});
