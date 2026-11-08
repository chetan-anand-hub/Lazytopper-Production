// SHEET-HEADER-1 — the Worksheet panel's graded-sheet download names its kind ("Worksheet") and
// passes the moment the answers were MARKED. A grade restored from this device's cache carries no
// marking time on this panel, so the sheet prints NO date (never the paper's own createdAt).
//
// MUTATION: drop `gradedAt:` from WorksheetGradePanel's export call -> "fresh grade" RED;
// pass `ws.createdAt` instead -> both RED.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({
  cached: null as unknown,
  grade: vi.fn(),
  exportPdf: vi.fn(async (_args: Record<string, unknown>) => "f.pdf"),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "test-uid", isLocalSession: false } }),
}));
vi.mock("../usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false }),
}));
vi.mock("../../services/worksheetGradeService", () => ({
  gradeWorksheetAndRecord: (...args: unknown[]) => h.grade(...args),
}));
vi.mock("../../services/worksheetSessionStore", () => ({
  getWorksheetGrade: () => h.cached,
  listStoredWorksheetsLite: () => [],
}));
vi.mock("./worksheetPdfExport", () => ({
  exportGradedWorksheetPdf: (args: Record<string, unknown>) => h.exportPdf(args),
}));
vi.mock("../qr/QrAnswerHandoff", () => ({
  default: ({ onImageReceived }: { onImageReceived: (v: { imageBase64: string; imageMimeType: string }) => void }) => (
    <button type="button" onClick={() => onImageReceived({ imageBase64: "JVBERi0xLjQ=", imageMimeType: "application/pdf" })}>
      qr-deliver
    </button>
  ),
}));

import WorksheetGradePanel from "./WorksheetGradePanel";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

const WS = {
  worksheetId: "ws-1",
  createdAt: "2026-10-04T00:00:00.000Z",
  title: "AP worksheet",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 3,
  questions: [
    { qNumber: 1, id: "q1", subject: "Maths", topicKey: "arithmetic-progressions", topicLabel: "AP", section: "C", marks: 3, questionText: "Find the 10th term" },
  ],
} as PersistedWorksheet;

const GRADED = {
  ok: true,
  results: [
    {
      qNumber: 1, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 2, percentage: 66,
      annotatedSteps: [{ stepNumber: 1, studentWork: "a=3", status: "correct", marksAwarded: 1, marksDeducted: 0 }],
      mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
    },
  ],
  totalQuestions: 1, gradedCount: 1, pendingCount: 0, gradedMarksAwarded: 2, gradedMarksTotal: 3, worksheetTotalMarks: 3,
};

function mount() {
  render(<MemoryRouter><WorksheetGradePanel ws={WS} /></MemoryRouter>);
}
async function clickDownload() {
  const btns = await screen.findAllByRole("button", { name: /Download graded sheet/ });
  fireEvent.click(btns[0]);
  await waitFor(() => expect(h.exportPdf).toHaveBeenCalledTimes(1));
  return h.exportPdf.mock.calls[0][0] as { kindLabel?: string; gradedAt?: number | string | null };
}

beforeEach(() => {
  h.cached = null;
  h.grade.mockReset();
  h.exportPdf.mockClear();
});
afterEach(() => cleanup());

describe("SHEET-HEADER-1 · Worksheet graded sheet header", () => {
  it("★ fresh grade -> kindLabel 'Worksheet' + the marking time (not the paper's createdAt)", async () => {
    h.grade.mockResolvedValue({ response: GRADED, miOutcomes: [] });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "qr-deliver" }));
    const before = Date.now();
    fireEvent.click(screen.getByRole("button", { name: /Grade my answers/ }));
    await waitFor(() => expect(h.grade).toHaveBeenCalledTimes(1));
    const args = await clickDownload();
    expect(args.kindLabel).toBe("Worksheet");
    expect(typeof args.gradedAt).toBe("number");
    expect(args.gradedAt as number).toBeGreaterThanOrEqual(before);
    expect(args.gradedAt as number).toBeLessThanOrEqual(Date.now());
  });

  it("★ a grade restored from the cache has no marking time here -> gradedAt null (no date printed)", async () => {
    h.cached = GRADED;
    mount();
    const args = await clickDownload();
    expect(args.kindLabel).toBe("Worksheet");
    expect(args.gradedAt).toBeNull();
  });
});
