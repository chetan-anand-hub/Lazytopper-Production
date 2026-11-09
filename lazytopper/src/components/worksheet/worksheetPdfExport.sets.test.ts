/**
 * BRIDGE-CODES-1 round 3 (owner 8 Nov 2026 21:20, "One pdf per chapter") - exportWorksheetSetsPdf puts several papers (a CBQ Pack
 * chapter's sets) in ONE file: each set is rendered on its own (its own print doc with its own printed code), starts on a NEW page,
 * and every one of its question pages carries ITS OWN QR. The file names no single paper code in its metadata. A free sample is
 * the first set's first page only. html2canvas / jsPDF are mocked (scaffold as worksheetPdfExport.paperCode.test.ts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

const events: string[] = [];
const propsMock = vi.fn();
const saveMock = vi.fn();
const captured: string[] = [];

vi.mock("jspdf", () => ({
  jsPDF: function jsPDF(this: unknown) {
    return {
      addPage: () => events.push("PAGE"),
      addImage: vi.fn(),
      save: saveMock,
      setDrawColor: vi.fn(), setLineWidth: vi.fn(), line: vi.fn(), setFont: vi.fn(), setFontSize: vi.fn(), setTextColor: vi.fn(),
      setFillColor: vi.fn(), rect: vi.fn(), roundedRect: vi.fn(), text: vi.fn(), getTextWidth: () => 10,
      setProperties: propsMock,
    };
  },
}));
vi.mock("html2canvas", () => ({
  default: async (el: HTMLElement) => {
    // What was captured AT CAPTURE TIME: the printed code of the print doc (cover captures have none).
    const code = el.querySelector(".lt-wsp__code")?.textContent ?? "";
    captured.push(code || "(cover)");
    // A tall raster: several A4 pages per set.
    return { width: 1520, height: 5000, toDataURL: () => "data:image/jpeg;base64,AAA" };
  },
}));
vi.mock("./paperQr", () => ({
  PAPER_QR_MM: 18,
  buildPaperQrMatrix: async (code: string) => Object.assign([[true]], { code }),
  drawPaperQr: (_pdf: unknown, rows: { code?: string }) => events.push(`QR:${rows.code}`),
}));

import { exportWorksheetSetsPdf } from "./worksheetPdfExport";

const set = (n: number, code: string): { ws: PersistedWorksheet; code: string } => ({
  code,
  ws: {
    worksheetId: `pack-cbq-real-numbers-set-${n}`,
    createdAt: "2026-11-08T00:00:00Z",
    title: `Real Numbers · Board CBQs · Set ${n} of 3`,
    subject: "Maths",
    grade: "10",
    sectionFilter: "Competency-based",
    totalMarks: 2,
    questions: [
      { qNumber: 1, id: `s${n}q1`, subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", questionText: `Set ${n}: prove 2√5 irrational.`, marks: 1 },
      { qNumber: 2, id: `s${n}q2`, subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "B", questionText: `Set ${n}: find the HCF.`, marks: 1, solutionSteps: ["x"], finalAnswer: "6" },
    ],
  },
});
const SETS = [set(1, "PK-M-RN-CBQ1"), set(2, "PK-M-RN-CBQ2"), set(3, "PK-M-RN-CBQ3")];
const licensee = { name: "Asha", email: "asha@example.in", orderId: "order_1" };

beforeEach(() => {
  events.length = 0;
  captured.length = 0;
  propsMock.mockClear();
  saveMock.mockClear();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,AAA");
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); })); // brand images: falls back to the plain word
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** The QR code drawn on each body page, in page order (one entry per page). */
function qrPerPage(): string[] {
  const out: string[] = [];
  let cur: string | null = null;
  for (const e of events) {
    if (e === "PAGE") {
      if (cur !== null) out.push(cur);
      cur = "";
    } else if (e.startsWith("QR:")) cur = e.slice(3);
  }
  if (cur !== null) out.push(cur);
  return out;
}

describe("exportWorksheetSetsPdf - one file, every set on its own pages with its own code and QR", () => {
  it("questions: each set rendered on its own with its printed code; its pages carry its QR; sets never share a page", async () => {
    await exportWorksheetSetsPdf(SETS, "questions", { licensee, cover: { kicker: "MATHS CBQ PACK", title: "Real Numbers · Board CBQs", subtitle: "x", stats: [] }, filename: "f.pdf" });
    expect(captured).toEqual(["(cover)", "PK-M-RN-CBQ1", "PK-M-RN-CBQ2", "PK-M-RN-CBQ3"]);
    const pages = qrPerPage(); // body pages only (the cover is page 1, before the first addPage)
    expect(pages.length).toBeGreaterThanOrEqual(SETS.length * 2);
    // contiguous runs: CBQ1..., then CBQ2..., then CBQ3... - a set's first page is a NEW page right after the last page of the set before
    const runs = pages.filter((c, i) => i === 0 || pages[i - 1] !== c);
    expect(runs).toEqual(["PK-M-RN-CBQ1", "PK-M-RN-CBQ2", "PK-M-RN-CBQ3"]);
    expect(pages.every((c) => c.startsWith("PK-M-RN-CBQ"))).toBe(true);
    const per = SETS.map((s) => pages.filter((c) => c === s.code).length);
    expect(new Set(per).size).toBe(1); // same raster per set -> same page count per set
    // no single paper code in the file's metadata (it would route every upload to one set)
    expect(propsMock).not.toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalledWith("f.pdf");
  });

  it("answer key: same structure, every set on its own pages, no QR", async () => {
    await exportWorksheetSetsPdf(SETS, "answers", { licensee, filename: "k.pdf" });
    expect(captured).toEqual(["PK-M-RN-CBQ1", "PK-M-RN-CBQ2", "PK-M-RN-CBQ3"]);
    expect(events.some((e) => e.startsWith("QR:"))).toBe(false);
    expect(events.filter((e) => e === "PAGE").length).toBeGreaterThanOrEqual(SETS.length * 2 - 1);
  });

  it("free sample: only the FIRST set is rendered, one page, no QR", async () => {
    await exportWorksheetSetsPdf(SETS, "questions", { sample: { line: "Sample line" }, filename: "s.pdf" });
    expect(captured).toEqual(["PK-M-RN-CBQ1"]);
    expect(events.filter((e) => e === "PAGE")).toHaveLength(0);
    expect(events.some((e) => e.startsWith("QR:"))).toBe(false);
  });

  it("no sets: refuses (never an empty PDF)", async () => {
    await expect(exportWorksheetSetsPdf([], "questions")).rejects.toThrow("no_paper_sets");
  });
});
