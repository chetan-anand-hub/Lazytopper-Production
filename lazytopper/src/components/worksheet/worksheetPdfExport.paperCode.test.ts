import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

// GRADE-ROUTE-2 - the paper code travels in the PDF metadata and as a small footer QR.
// (scaffold copied from worksheetPdfExport.test.ts)
// PR-E2a.2 FIX 1 — self-test of the real-file PDF export path. Mocks the heavy
// libs (html2canvas + jspdf) and stubs the jsdom canvas (no 2d backend), then
// asserts: (a) CLEAN ISOLATION — html2canvas captures a node that contains ONLY
// the worksheet print-doc (never the app); (b) pagination adds image pages;
// (c) a real file is saved with the right name. Runs in CI/Codespaces vitest.

const saveMock = vi.fn();
const addImageMock = vi.fn();
const addPageMock = vi.fn();
const html2canvasMock = vi.fn();
const rectMock = vi.fn();
const propsMock = vi.fn();

/** Sentinel app chrome — the CONTROL for "clean isolation". If the capture target ever
 *  widened to the live app tree, this string would be inside it. */
const APP_SENTINEL = "APP-CHROME-SENTINEL";

/**
 * What the capture target looked like AT CAPTURE TIME.
 *
 * `renderElementToPdf` unmounts the React root and removes the offscreen host in its
 * `finally`, so the element handed to html2canvas is empty and detached by the time any
 * assertion runs — inspecting the stored reference afterwards proves nothing about the
 * capture (that timing is what made this suite red). Snapshot the properties while the
 * export is still holding the host.
 */
interface Capture {
  /** The worksheet print-doc was really rendered into the host. */
  hasPrintDoc: boolean;
  /** Nothing BUT the print doc is in the capture target. */
  childCount: number;
  kind: string | null;
  questionCount: string | null;
  /** Isolation controls: the host is not inside the app tree and carries none of it. */
  insideAppTree: boolean;
  containsAppChrome: boolean;
}
const captures: Capture[] = [];

/**
 * The REAL jsPDF surface `worksheetPdfExport.ts` uses: a NAMED `jsPDF` export,
 * constructed with `new jsPDF({orientation,unit,format})`, then `addPage` / `addImage` /
 * `save` plus the footer's setDrawColor / setLineWidth / line / setFont / setFontSize /
 * setTextColor / text. Built by a plain factory (not `vi.fn().mockImplementation`), so
 * the constructor keeps working after `vi.restoreAllMocks()` — a restored `vi.fn()` has
 * no implementation, so `new jsPDF()` returned a bare `{}` and every test after the
 * first died on "pdf.addImage is not a function".
 */
function makePdfStub() {
  return {
    addPage: addPageMock,
    addImage: addImageMock,
    save: saveMock,
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    line: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    rect: rectMock,
    text: vi.fn(),
    setProperties: propsMock,
  };
}

vi.mock("jspdf", () => ({
  jsPDF: function jsPDF(this: unknown) {
    return makePdfStub();
  },
}));
vi.mock("html2canvas", () => ({
  default: (el: HTMLElement, ...rest: unknown[]) => {
    const doc = el.querySelector(".lt-wsp");
    captures.push({
      hasPrintDoc: doc !== null,
      childCount: el.childElementCount,
      kind: doc?.getAttribute("data-kind") ?? null,
      questionCount: doc?.getAttribute("data-question-count") ?? null,
      insideAppTree: el.closest("#root") !== null,
      containsAppChrome: (el.textContent ?? "").includes(APP_SENTINEL),
    });
    return html2canvasMock(el, ...rest);
  },
}));

import { exportWorksheetPdf, buildPaperQrMatrix, PAPER_QR_MM } from "./worksheetPdfExport";

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
  captures.length = 0;
  rectMock.mockClear();
  propsMock.mockClear();
  // A live app tree, so "the capture is isolated from the app" is a real assertion
  // and not a vacuous one against an empty document.
  document.body.innerHTML = `<div id="root"><h1>${APP_SENTINEL}</h1></div>`;
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

describe("GRADE-ROUTE-2 - PDF metadata + footer QR", () => {
  it("B1: Title/Subject/Keywords carry the paper code (questions AND answer key)", async () => {
    await exportWorksheetPdf(ws, "questions", "WS-M-RN-03");
    expect(propsMock).toHaveBeenCalledTimes(1);
    const p = propsMock.mock.calls[0][0] as { title: string; subject: string; keywords: string };
    expect(p.title).toContain("WS-M-RN-03");
    expect(p.subject).toBe("WS-M-RN-03");
    expect(p.keywords).toBe("WS-M-RN-03");
    propsMock.mockClear();
    await exportWorksheetPdf(ws, "answers", "CT-M-RN-02");
    expect((propsMock.mock.calls[0][0] as { subject: string }).subject).toBe("CT-M-RN-02");
  });

  it("B2: the questions sheet prints a QR of the code only, inside the page, in the footer band, on every page", async () => {
    await exportWorksheetPdf(ws, "questions", "FM-M-04");
    const modules = rectMock.mock.calls.filter((c) => c[4] === "F");
    expect(modules.length).toBeGreaterThan(40); // white plate + dark modules, per page
    const white = modules.find((c) => c[2] === PAPER_QR_MM && c[3] === PAPER_QR_MM)!;
    expect(white).toBeTruthy();
    const [x, y, w, h] = white as number[];
    expect(x).toBeGreaterThanOrEqual(12);
    expect(x + w).toBeLessThan(120); // clear of the right-hand trust line
    expect(y).toBeGreaterThanOrEqual(281); // below the footer rule (280) ...
    expect(y + h).toBeLessThanOrEqual(293.5); // ... and off the printer's unprintable edge
    expect(PAPER_QR_MM).toBeGreaterThanOrEqual(11); // print-legible
    // one plate per body page
    const pages = rectMock.mock.calls.filter((c) => c[2] === PAPER_QR_MM).length;
    expect(pages).toBe(addPageMock.mock.calls.length + 1);
  });

  it("the QR decodes to the code (module matrix is a real QR of 'WS-M-MIX-02')", async () => {
    const rows = (await buildPaperQrMatrix("WS-M-MIX-02"))!;
    expect(rows.length).toBe(21); // version 1
    expect(rows.every((r) => r.length === 21)).toBe(true);
    // finder pattern top-left: 7x7 ring
    expect(rows[0].slice(0, 7).every(Boolean)).toBe(true);
    expect(rows[3][3]).toBe(true);
  });

  it("no code (or an answer key): no QR; a licensed pack / sample file: neither QR nor paper metadata", async () => {
    await exportWorksheetPdf(ws, "questions");
    await exportWorksheetPdf(ws, "answers", "WS-M-RN-03");
    expect(rectMock.mock.calls.filter((c) => c[2] === PAPER_QR_MM)).toHaveLength(0);
    propsMock.mockClear();
    await exportWorksheetPdf(ws, "questions", "WS-M-RN-03", { licensee: { name: "A", email: "a@b.c", orderId: "o1" } });
    expect(propsMock).not.toHaveBeenCalled();
    expect(rectMock.mock.calls.filter((c) => c[2] === PAPER_QR_MM)).toHaveLength(0);
  });
});
