import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

// SERVER-PDF-1 PR-A - the TEMPLATE render: buyer-specific text is left blank, and where it goes is recorded.
// jsPDF and html2canvas are mocked (as in worksheetPdfExport.rebrand.test.ts); the print documents are the real ones.

const addImageMock = vi.fn();
const addPageMock = vi.fn();
const textMock = vi.fn();
const html2canvasMock = vi.fn();

vi.mock("jspdf", () => ({
  jsPDF: function jsPDF() {
    return {
      addPage: addPageMock,
      addImage: addImageMock,
      save: vi.fn(),
      setProperties: vi.fn(),
      setDrawColor: vi.fn(),
      setLineWidth: vi.fn(),
      line: vi.fn(),
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      setFillColor: vi.fn(),
      rect: vi.fn(),
      text: textMock,
      link: vi.fn(),
      getTextWidth: (t: string) => t.length * 1.5,
    };
  },
}));
vi.mock("html2canvas", () => ({ default: (...a: unknown[]) => html2canvasMock(...a) }));
// the bridge pages are not under test here; a template must not even ask for them
vi.mock("./PrintBridgePages", () => {
  throw new Error("a template must not render the bridge pages");
});

import { exportWorksheetPdf, exportWorksheetSetsPdf, newPackTemplateMarks, PRINT_GEOMETRY, PACK_QR_GEOMETRY, TEMPLATE_BRIDGE_PAGES } from "./worksheetPdfExport";
import { PrintCover } from "./PrintCover";
import { WorksheetPrintDoc } from "./WorksheetPrintDoc";
import { STAMP_ATTR, TEMPLATE_PLACEHOLDER } from "./pdfTemplateMarks";

const ws: PersistedWorksheet = {
  worksheetId: "ws-tpl",
  createdAt: "2026-06-20T00:00:00Z",
  title: "Real Numbers",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 3,
  questions: [{ qNumber: 1, id: "q1", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", questionText: "Prove 2√5 irrational.", marks: 1 }],
};
const placeholder = { name: "Template", email: "template@lazytopper.com", orderId: "TEMPLATE" };
const cover = { kicker: "CHAPTER QUESTION BANK", title: "Real Numbers", subtitle: "Class 10 CBSE", stats: [{ value: "1", label: "questions" }] };
const bridge = { packLabel: "Real Numbers · Chapter Pack", exampleCode: "PK-M-RN-CT1", ownCode: true, boardPassCard: false };
const texts = () => textMock.mock.calls.map((c) => String(c[0]));

beforeEach(() => {
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(10);
  for (const m of [addImageMock, addPageMock, textMock]) m.mockClear();
  document.body.innerHTML = `<div id="root"></div>`;
  html2canvasMock.mockReset();
  html2canvasMock.mockResolvedValue({ width: 1520, height: 5000, toDataURL: () => "data:image/jpeg;base64,AAA" });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,AAA");
});
afterEach(() => vi.restoreAllMocks());

describe("PrintCover / WorksheetPrintDoc - the template markup", () => {
  const props = { ...cover, licenseeLine: "Licensed to A", edition: "1 Jan 2026", paidAtMs: 0 };

  it("a real render carries no template marker and no template style (markup unchanged)", () => {
    const html = renderToStaticMarkup(<PrintCover {...props} />);
    expect(html).not.toContain(STAMP_ATTR);
    expect(html).not.toContain("lt-cover--tpl");
    const doc = renderToStaticMarkup(<WorksheetPrintDoc ws={ws} kind="questions" />);
    expect(doc).not.toContain(STAMP_ATTR);
  });

  it("a template cover tags the box, its text column, the licence line, the re-download date, the label and the edition, and hides only the three buyer texts", () => {
    const html = renderToStaticMarkup(<PrintCover {...props} templateMode />);
    for (const name of ["box", "textcol", "licence", "redownload", "boxlabel", "edition"]) expect(html).toContain(`${STAMP_ATTR}="${name}"`);
    expect(html).toContain("lt-cover--tpl");
    expect(html).toContain(`.lt-cover--tpl [${STAMP_ATTR}="licence"]`);
    expect(html).not.toMatch(/\[data-pdf-stamp="(box|textcol|boxlabel)"\][^}]*visibility/);
  });

  it("a template paper tags its 'Generated' date", () => {
    const html = renderToStaticMarkup(<WorksheetPrintDoc ws={ws} kind="questions" code="PK-M-RN-CT1" templateMode />);
    expect(html).toContain(`${STAMP_ATTR}="generated"`);
    expect(html).toContain(`.lt-wsp [${STAMP_ATTR}="generated"] { visibility: hidden; }`);
  });
});

describe("exportWorksheetPdf - template option", () => {
  it("draws no licence line, keeps 'Page N of M', reserves the two bridge pages and records the geometry", async () => {
    const marks = newPackTemplateMarks();
    await exportWorksheetPdf(ws, "questions", "PK-M-RN-CT1", { licensee: placeholder, cover, bridge, template: { marks } });
    expect(texts().some((t) => t.startsWith("Licensed to"))).toBe(false);
    const pages = marks.pages;
    const firstBody = 1 + TEMPLATE_BRIDGE_PAGES + 1;
    expect(pages).toBeGreaterThanOrEqual(firstBody);
    for (let p = firstBody; p <= pages; p += 1) expect(texts()).toContain(`Page ${p} of ${pages}`);
    // cover + 2 blank bridge placeholders + body pages; only the cover and the body slices carry an image
    expect(addPageMock.mock.calls.length).toBe(pages - 1 + 1); // + the two-line cover, appended as the last page
    expect(addImageMock.mock.calls.length).toBe(pages - TEMPLATE_BRIDGE_PAGES + 1);
    // a question paper prints the paper QR: its narrower licence row and its own baseline
    expect(marks.footer).toMatchObject({ xMm: 12, baselineYMm: PACK_QR_GEOMETRY.licY, withQr: true, firstPage: firstBody, lastPage: pages, font: "Helvetica" });
    expect(marks.footer?.maxWidthMm).toBeCloseTo(210 - 24 - 18 - 4, 5);
    expect(marks.cover?.stamps.map((s) => s.name).sort()).toEqual(["box", "boxlabel", "edition", "licence", "redownload", "textcol"]);
    expect(marks.cover?.licenceFit).toEqual({ maxLines: 2, shorten: "fitLicensee" });
    expect(marks.cover2?.stamps.map((s) => s.name).sort()).toEqual(["box", "boxlabel", "edition", "licence", "redownload", "textcol"]);
    expect(marks.cover?.stamps.find((s) => s.name === "edition")).toMatchObject({ anchor: "right" });
    expect(marks.body.map((b) => b.name)).toEqual(["generated"]);
    expect(marks.body[0].page).toBe(firstBody);
  });

  it("an answer key has no QR: the licence row is the full width at today's baseline", async () => {
    const marks = newPackTemplateMarks();
    await exportWorksheetPdf(ws, "answers", "PK-M-RN-CT1", { licensee: placeholder, cover, template: { marks } });
    expect(marks.footer).toMatchObject({ baselineYMm: PRINT_GEOMETRY.licY, withQr: false, maxWidthMm: 186, firstPage: 2 });
  });

  it("a several-paper file records one 'Generated' mark per paper, on that paper's own first page", async () => {
    const marks = newPackTemplateMarks();
    await exportWorksheetSetsPdf([{ ws, code: "PK-M-RN-CBQ1" }, { ws: { ...ws, title: "Two" }, code: "PK-M-RN-CBQ2" }], "questions", { licensee: placeholder, cover, template: { marks } });
    const gen = marks.body.filter((b) => b.name === "generated");
    expect(gen.map((g) => g.set)).toEqual([0, 1]);
    expect(gen[1].page).toBeGreaterThan(gen[0].page);
    expect(texts().some((t) => t.startsWith("Licensed to"))).toBe(false);
  });

  it("the placeholder texts are the ones the cover was laid out with", () => {
    expect(TEMPLATE_PLACEHOLDER.licence.startsWith("Licensed to ")).toBe(true);
    expect(TEMPLATE_PLACEHOLDER.licence.endsWith("personal use only")).toBe(true);
    expect(TEMPLATE_PLACEHOLDER.licence2.startsWith("Licensed to ")).toBe(true);
    expect(TEMPLATE_PLACEHOLDER.licence2.length).toBeGreaterThan(TEMPLATE_PLACEHOLDER.licence.length);
  });
});
