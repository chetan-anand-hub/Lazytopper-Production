import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

// PDF-REBRAND-1 - the buyer line, the watermark switch, the cover page and the file name of exportWorksheetPdf.
// jsPDF and html2canvas are mocked (as in worksheetPdfExport.test.ts); the print doc itself is the real one.

const saveMock = vi.fn();
const addImageMock = vi.fn();
const addPageMock = vi.fn();
const textMock = vi.fn();
const rectMock = vi.fn();
const html2canvasMock = vi.fn();
interface Capture { watermark: boolean; cta: boolean; cover: boolean; coverText: string }
const captures: Capture[] = [];

vi.mock("jspdf", () => ({
  jsPDF: function jsPDF() {
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
      text: textMock,
      // a fixed width per character, so "fits the page" is decidable without the real font metrics
      getTextWidth: (t: string) => t.length * 1.5,
    };
  },
}));
vi.mock("html2canvas", () => ({
  default: (el: HTMLElement, ...rest: unknown[]) => {
    captures.push({
      watermark: el.querySelector(".lt-wsp__wm") !== null,
      cta: el.querySelector(".lt-wsp__cta") !== null,
      cover: el.querySelector(".lt-cover") !== null,
      coverText: el.querySelector(".lt-cover")?.textContent ?? "",
    });
    return html2canvasMock(el, ...rest);
  },
}));

import { exportWorksheetPdf, licenseeLine, pageGeometry, PRINT_GEOMETRY } from "./worksheetPdfExport";

const ws: PersistedWorksheet = {
  worksheetId: "ws-test",
  createdAt: "2026-06-20T00:00:00Z",
  title: "Real Numbers",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 3,
  questions: [
    { qNumber: 1, id: "q1", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", questionText: "Prove 2√5 irrational.", marks: 1 },
    { qNumber: 2, id: "q2", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", questionText: "Evaluate a² − b².", marks: 2, solutionSteps: ["factorise"], finalAnswer: "(a−b)(a+b)" },
  ],
};
const licensee = { name: "Aarav Sharma", email: "aarav@example.com", orderId: "order_123" };
const LINE = "Licensed to Aarav Sharma · aarav@example.com · Order order_123 — personal use only";

const texts = () => textMock.mock.calls.map((c) => String(c[0]));

beforeEach(() => {
  // jsdom never loads an <img>, and the export waits (up to 8 s) for every image: report them as loaded.
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(10);
  for (const m of [saveMock, addImageMock, addPageMock, textMock, rectMock]) m.mockClear();
  captures.length = 0;
  document.body.innerHTML = `<div id="root"></div>`;
  html2canvasMock.mockReset();
  html2canvasMock.mockResolvedValue({ width: 1520, height: 5000, toDataURL: () => "data:image/jpeg;base64,AAA" });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,AAA");
});
afterEach(() => vi.restoreAllMocks());

describe("exportWorksheetPdf - licensee", () => {
  it("prints the buyer line in the footer of EVERY page and keeps 'Page N of M'", async () => {
    await exportWorksheetPdf(ws, "questions", undefined, { licensee });
    const pages = addImageMock.mock.calls.length;
    expect(pages).toBeGreaterThan(1);
    expect(texts().filter((t) => t === LINE)).toHaveLength(pages);
    for (let p = 1; p <= pages; p += 1) expect(texts()).toContain(`Page ${p} of ${pages}`);
  });

  it("both footer branches (licensed and unlicensed) carry the exact IITian trust line on every page", async () => {
    const PHRASE = "Made by an IITian (IIT Kanpur)";
    for (const opts of [{ licensee }, {}]) {
      textMock.mockClear();
      await exportWorksheetPdf(ws, "questions", undefined, opts);
      const pages = addImageMock.mock.calls.length;
      expect(texts().filter((t) => t === `${PHRASE} \u00b7 lazytopper.com`)).toHaveLength(pages);
      expect(texts().some((t) => t.includes("\u00a9 LazyTopper"))).toBe(false);
      addImageMock.mockClear();
    }
  });

  it("does not draw the tiled watermark for a licensed copy; draws it without a licensee", async () => {
    await exportWorksheetPdf(ws, "questions", undefined, { licensee });
    await exportWorksheetPdf(ws, "answers");
    expect(captures[0].watermark).toBe(false);
    expect(captures[1].watermark).toBe(true);
  });

  it("without a licensee the footer carries no buyer line and keeps today's page numbering", async () => {
    await exportWorksheetPdf(ws, "questions");
    const pages = addImageMock.mock.calls.length;
    expect(texts().some((t) => t.startsWith("Licensed to"))).toBe(false);
    expect(texts()).toContain(`Page 1 of ${pages}`);
  });

  it("a very long name and e-mail are shortened to fit one footer row, the order id is kept", async () => {
    const long = { name: "N".repeat(90), email: `${"e".repeat(60)}@example.com`, orderId: "order_999" };
    await exportWorksheetPdf(ws, "questions", undefined, { licensee: long });
    const line = texts().find((t) => t.startsWith("Licensed to")) ?? "";
    expect(line.length * 1.5).toBeLessThanOrEqual(186);
    expect(line).toContain("Order order_999");
  });

  it("PAY-PHONE-1 (print): a PAID file keeps all chrome >= 10 mm inside every A4 edge and puts no ink on the edge", () => {
    const g = pageGeometry({ licensee: { name: "A", email: "a@b.in", orderId: "o" } });
    expect(g).toBe(PRINT_GEOMETRY);
    expect(g.bar).toBe(false);
    expect(g.headerImgY).toBeGreaterThanOrEqual(10);
    expect(297 - g.pageY).toBeGreaterThanOrEqual(10 + 3); // the page-number baseline, plus its text height
    expect(g.top).toBeGreaterThan(g.headerRuleY);
    expect(297 - g.footerH).toBeLessThan(g.footLineY);
    // A free sample and an unlicensed worksheet keep their layout.
    expect(pageGeometry({ sample: {} }).bar).toBe(true);
    expect(pageGeometry({}).top).toBe(15);
  });

  it("PAY-PHONE-1: a masked phone stays MASKED in the PDF footer (bullets -> *), never collapses to a short number", () => {
    const l = { name: "Asha", email: "+91 98\u2022\u2022\u2022\u2022\u2022948", orderId: "o1" };
    expect(licenseeLine(l)).toBe("Licensed to Asha · +91 98\u2022\u2022\u2022\u2022\u2022948 · Order o1 — personal use only");
    expect(licenseeLine(l, true)).toBe("Licensed to Asha · +91 98*****948 · Order o1 — personal use only");
    expect(licenseeLine({ name: "", email: l.email, orderId: "o1" }, true)).toBe("Licensed to +91 98*****948 · Order o1 — personal use only");
  });

  it("a name the PDF font cannot print is left out of the PDF line, not garbled", () => {
    expect(licenseeLine({ name: "आरव", email: "a@b.in", orderId: "o1" }, true)).toBe("Licensed to a@b.in · Order o1 — personal use only");
    expect(licenseeLine({ name: "आरव", email: "a@b.in", orderId: "o1" })).toContain("आरव");
  });
});

describe("exportWorksheetPdf - cover and filename", () => {
  const cover = { kicker: "Maths · Chapter Pack", title: "Real Numbers", subtitle: "Every question.", stats: [{ value: "37", label: "questions" }, { value: "2", label: "tests" }] };

  it("page 1 is the cover (full-bleed), the document follows, and the numbering counts the cover", async () => {
    await exportWorksheetPdf(ws, "answers", undefined, { licensee, cover });
    const cap = captures.find((c) => c.cover);
    expect(cap?.coverText).toContain("Real Numbers");
    expect(cap?.coverText).toContain("37");
    expect(cap?.coverText).toContain(LINE);
    expect(cap?.coverText).toContain("Edition 20 Jun 2026"); // the sheet's own date (ws.createdAt), never the clock
    expect(addImageMock.mock.calls[0].slice(1, 6)).toEqual(["JPEG", 0, 0, 210, 297]);
    const total = addImageMock.mock.calls.length; // cover + body pages
    expect(total).toBeGreaterThan(2);
    expect(addPageMock).toHaveBeenCalledTimes(total - 1);
    expect(texts()).toContain(`Page 2 of ${total}`);
    expect(texts()).not.toContain(`Page 1 of ${total}`);
  });

  it("without a cover the document starts on page 1", async () => {
    await exportWorksheetPdf(ws, "answers");
    expect(captures.some((c) => c.cover)).toBe(false);
    expect(addImageMock.mock.calls[0].slice(2, 3)).toEqual([12]);
  });

  it("the answer key ends with the 'check your own answer' box", async () => {
    await exportWorksheetPdf(ws, "answers");
    await exportWorksheetPdf(ws, "questions");
    expect(captures[0].cta).toBe(true);
    expect(captures[1].cta).toBe(false);
  });

  it("opts.filename overrides the default name", async () => {
    const f = await exportWorksheetPdf(ws, "questions", "WS-1", { filename: "chapter-real-numbers-test-1.pdf" });
    expect(f).toBe("chapter-real-numbers-test-1.pdf");
    expect(saveMock.mock.calls[0][0]).toBe("chapter-real-numbers-test-1.pdf");
  });

  it("draws the green top rule on every page", async () => {
    await exportWorksheetPdf(ws, "questions");
    expect(rectMock).toHaveBeenCalledTimes(addImageMock.mock.calls.length);
  });
});
