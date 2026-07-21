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
    text: vi.fn(),
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
  captures.length = 0;
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

describe("exportWorksheetPdf — real file download (Option B)", () => {
  it("captures ONLY the worksheet doc, paginates, and saves a questions PDF", async () => {
    const filename = await exportWorksheetPdf(ws, "questions");

    // Clean isolation: the capture target is a host containing the print-doc only.
    expect(html2canvasMock).toHaveBeenCalledTimes(1);
    expect(captures).toHaveLength(1);
    const [cap] = captures;
    expect(cap.hasPrintDoc).toBe(true);
    // ...and THIS worksheet's doc, in questions form.
    expect(cap.kind).toBe("questions");
    expect(cap.questionCount).toBe(String(ws.questions.length));
    // Nothing else is in the frame: exactly one child (the print doc), no app chrome,
    // and the host is offscreen/outside the live app tree.
    expect(cap.childCount).toBe(1);
    expect(cap.containsAppChrome).toBe(false);
    expect(cap.insideAppTree).toBe(false);

    // Pagination: the 5000px-tall canvas really spans several A4 pages, and one
    // addPage is issued per page AFTER the first.
    const pages = addImageMock.mock.calls.length;
    expect(pages).toBeGreaterThan(1);
    expect(addPageMock).toHaveBeenCalledTimes(pages - 1);

    // A real file is saved with the questions filename.
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock.mock.calls[0][0]).toMatch(/questions\.pdf$/);
    expect(filename).toMatch(/questions\.pdf$/);
  });

  it("saves the answer-key PDF under its own filename", async () => {
    const filename = await exportWorksheetPdf(ws, "answers");
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(filename).toMatch(/answer-key\.pdf$/);
    // The captured doc is the answer-key variant, not the questions sheet.
    expect(captures[0].kind).toBe("answers");
  });

  it("FIX D — carries the unique CODE in the filename so worksheets don't collide", async () => {
    const a = await exportWorksheetPdf(ws, "questions", "WS-M-RN-03");
    const b = await exportWorksheetPdf(ws, "questions", "WS-M-RN-04");
    // Same topic/title, but the code makes the two downloads distinct (the bug fixed).
    expect(a).toContain("WS-M-RN-03");
    expect(b).toContain("WS-M-RN-04");
    expect(a).not.toBe(b);
    expect(a).toMatch(/questions\.pdf$/);
  });

  it("FIX D — falls back to the code-less name when no code is supplied (never crashes)", async () => {
    const filename = await exportWorksheetPdf(ws, "questions");
    expect(filename).toMatch(/^lazytopper-.*-questions\.pdf$/);
    expect(filename).not.toMatch(/WS-/);
  });

  it("removes the offscreen host after export (no DOM leak)", async () => {
    const before = document.body.childElementCount;
    await exportWorksheetPdf(ws, "questions");
    expect(document.body.childElementCount).toBe(before);
  });
});
