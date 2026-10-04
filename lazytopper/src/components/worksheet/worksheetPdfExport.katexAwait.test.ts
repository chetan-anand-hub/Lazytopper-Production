// LOW-END-1 PR-1 rework (owner ruling 2) — a PDF export ALWAYS waits for KaTeX.
//
// MathText fetches KaTeX on demand, and renderElementToPdf rasterises the print doc only ~2
// frames + 120 ms after rendering it. Without an explicit wait, a student who presses
// "Download PDF" before KaTeX has arrived would get MathText's plain-text stand-in in the
// file instead of the maths.
//
// Here KaTeX's module is made SLOW (its import resolves after 600 ms — far longer than the
// export's own render wait), nothing has loaded it yet, and the worksheet carries maths that
// needs KaTeX. The captured print doc must contain KaTeX's markup and no stand-in.
// Mutation (LOW-END-1 rework): drop the `await loadKatex()` -> red here.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

const captured: Array<{ katexNodes: number; text: string }> = [];

vi.mock("katex", async (importOriginal) => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return importOriginal();
});
vi.mock("jspdf", () => ({
  jsPDF: function jsPDF() {
    return {
      addPage: vi.fn(),
      addImage: vi.fn(),
      save: vi.fn(),
      setDrawColor: vi.fn(),
      setLineWidth: vi.fn(),
      line: vi.fn(),
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      text: vi.fn(),
    };
  },
}));
vi.mock("html2canvas", () => ({
  default: async (el: HTMLElement) => {
    captured.push({ katexNodes: el.querySelectorAll(".katex").length, text: el.textContent ?? "" });
    return { width: 1520, height: 1000, toDataURL: () => "data:image/jpeg;base64,AAA" };
  },
}));

import { exportWorksheetPdf } from "./worksheetPdfExport";
import { isKatexLoaded } from "../question/MathText";

const ws: PersistedWorksheet = {
  worksheetId: "ws-katex",
  createdAt: "2026-10-04T00:00:00Z",
  title: "Quadratic Equations — maths in the sheet",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All sections (A–E)",
  totalMarks: 2,
  questions: [
    {
      qNumber: 1,
      id: "q1",
      subject: "Maths",
      topicKey: "quadratic-equations",
      topicLabel: "Quadratic Equations",
      section: "B",
      questionText: "Solve \\frac{x^2}{4} = 9 for x.",
      marks: 2,
    },
  ],
};

beforeEach(() => {
  captured.length = 0;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillStyle: "",
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,AAA");
});
afterEach(() => vi.restoreAllMocks());

describe("PDF export waits for KaTeX (LOW-END-1 rework, ruling 2)", () => {
  it("★ KaTeX not loaded and slow to arrive: the captured doc still holds KaTeX markup, not the stand-in", async () => {
    expect(isKatexLoaded()).toBe(false); // precondition: nothing loaded it
    await exportWorksheetPdf(ws, "questions");
    expect(captured).toHaveLength(1);
    expect(captured[0].katexNodes).toBeGreaterThan(0);
    // The stand-in would show the raw command; the KaTeX render never does.
    expect(captured[0].text).not.toContain("\\frac");
    expect(isKatexLoaded()).toBe(true);
  }, 20_000);
});
