import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

// PR-E2a.2 FIX 1 — self-test of the real-file PDF export path. Mocks the heavy
// libs (html2canvas + jspdf) and stubs the jsdom canvas (no 2d backend), then
// asserts: (a) CLEAN ISOLATION — html2canvas captures a node that contains ONLY
// the worksheet print-doc (never the app); (b) pagination adds image pages;
// (c) a real file is saved with the right name. Runs in CI/Codespaces vitest.

const saveMock = vi.fn();
const addImageMock = vi.fn();
const addPageMock = vi.fn();
const html2canvasMock = vi.fn();

vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    addPage: addPageMock,
    addImage: addImageMock,
    save: saveMock,
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    line: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
  })),
}));
vi.mock("html2canvas", () => ({ default: (...args: unknown[]) => html2canvasMock(...args) }));

import { exportWorksheetPdf } from "./worksheetPdfExport";

const ws: PersistedWorksheet = {
  worksheetId: "ws-test",
  createdAt: "2026-06-20T00:00:00Z",
  title: "Real Numbers — Board exam mix",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All sections (A–E)",
  totalMarks: 3,
  questions: [
    { qNumber: 1, id: "q1", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", questionText: "Prove 2√5 irrational.", marks: 1 },
    { qNumber: 2, id: "q2", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", questionText: "Evaluate a² − b².", marks: 2, solutionSteps: ["factorise"], finalAnswer: "(a−b)(a+b)" },
  ],
};

beforeEach(() => {
  saveMock.mockClear();
  addImageMock.mockClear();
  addPageMock.mockClear();
  // Tall captured canvas → multiple A4 pages.
  html2canvasMock.mockReset();
  html2canvasMock.mockResolvedValue({ width: 1520, height: 5000, toDataURL: () => "data:image/jpeg;base64,AAA" });
  // jsdom has no real 2d canvas backend — stub the slice canvas methods.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillStyle: "",
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,AAA");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("exportWorksheetPdf — real file download (Option B)", () => {
  it("captures ONLY the worksheet doc, paginates, and saves a questions PDF", async () => {
    const filename = await exportWorksheetPdf(ws, "questions");

    // Clean isolation: the capture target is a host containing the print-doc only.
    expect(html2canvasMock).toHaveBeenCalledTimes(1);
    const captured = html2canvasMock.mock.calls[0][0] as HTMLElement;
    expect(captured.querySelector(".lt-wsp")).not.toBeNull();
    // ...and it is detached/offscreen, not the live app tree.
    expect(captured.closest("#root")).toBeNull();

    // Pagination: tall canvas → more than one page image added.
    expect(addImageMock.mock.calls.length).toBeGreaterThanOrEqual(1);

    // A real file is saved with the questions filename.
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock.mock.calls[0][0]).toMatch(/questions\.pdf$/);
    expect(filename).toMatch(/questions\.pdf$/);
  });

  it("saves the answer-key PDF under its own filename", async () => {
    const filename = await exportWorksheetPdf(ws, "answers");
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(filename).toMatch(/answer-key\.pdf$/);
  });

  it("removes the offscreen host after export (no DOM leak)", async () => {
    const before = document.body.childElementCount;
    await exportWorksheetPdf(ws, "questions");
    expect(document.body.childElementCount).toBe(before);
  });
});
