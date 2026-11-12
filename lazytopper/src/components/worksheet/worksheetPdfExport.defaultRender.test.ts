import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

// SERVER-PDF-1 PR-A - DEFAULT RENDER IS UNCHANGED. The template option added in this PR must not alter what a buyer's browser
// produces. This test records, for a paid pack file (single-paper and several-paper), every jsPDF call and the exact HTML handed
// to html2canvas, and compares them with a golden log captured from the code BEFORE the template option existed
// (worksheetPdfExport.defaultRender.golden.json). A change to any of it fails here. Regenerate ONLY deliberately:
//   UPDATE_DEFAULT_RENDER_GOLDEN=1 pnpm exec vitest run src/components/worksheet/worksheetPdfExport.defaultRender.test.ts

const calls: unknown[] = [];
const rec = (name: string) => (...args: unknown[]) => {
  calls.push([name, ...args.map((a) => (typeof a === "string" && a.length > 80 ? `${a.slice(0, 40)}...(${a.length})` : a))]);
};

vi.mock("jspdf", () => ({
  jsPDF: function jsPDF() {
    return {
      addPage: rec("addPage"),
      addImage: rec("addImage"),
      save: rec("save"),
      setProperties: rec("setProperties"),
      setDrawColor: rec("setDrawColor"),
      setLineWidth: rec("setLineWidth"),
      line: rec("line"),
      setFont: rec("setFont"),
      setFontSize: rec("setFontSize"),
      setTextColor: rec("setTextColor"),
      setFillColor: rec("setFillColor"),
      rect: rec("rect"),
      text: rec("text"),
      link: rec("link"),
      getTextWidth: (t: string) => t.length * 1.5,
    };
  },
}));
vi.mock("html2canvas", () => ({
  default: (el: HTMLElement) => {
    calls.push(["html2canvas", el.outerHTML.replace(/\s+/g, " ")]);
    return Promise.resolve({ width: 1520, height: 5000, toDataURL: () => "data:image/jpeg;base64,AAA" });
  },
}));

import { exportWorksheetPdf, exportWorksheetSetsPdf } from "./worksheetPdfExport";

const ws: PersistedWorksheet = {
  worksheetId: "ws-golden",
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
const opts = {
  licensee: { name: "Aarav Sharma", email: "aarav@example.com", orderId: "order_123" },
  cover: { kicker: "CHAPTER QUESTION BANK", title: "Real Numbers", subtitle: "Class 10 CBSE", stats: [{ value: "2", label: "questions" }, { value: "3", label: "marks" }] },
  paidAtMs: 1794249000000,
  filename: "golden.pdf",
};
const GOLDEN = path.join(__dirname, "worksheetPdfExport.defaultRender.golden.json");

beforeEach(() => {
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(10);
  calls.length = 0;
  document.body.innerHTML = `<div id="root"></div>`;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,AAA");
});
afterEach(() => vi.restoreAllMocks());

describe("worksheetPdfExport - the default (buyer-browser) render is unchanged by the template option", () => {
  it("matches the golden call log for a licensed pack file, one paper and several papers", async () => {
    await exportWorksheetPdf(ws, "questions", "PK-M-RN-CT1", opts);
    const single = calls.splice(0);
    await exportWorksheetSetsPdf([{ ws, code: "PK-M-RN-CBQ1" }, { ws: { ...ws, title: "Real Numbers 2" }, code: "PK-M-RN-CBQ2" }], "questions", opts);
    const sets = calls.splice(0);
    const actual = JSON.parse(JSON.stringify({ single, sets }));
    if (process.env.UPDATE_DEFAULT_RENDER_GOLDEN === "1") {
      fs.writeFileSync(GOLDEN, `${JSON.stringify(actual, null, 1)}\n`);
      return;
    }
    expect(actual).toEqual(JSON.parse(fs.readFileSync(GOLDEN, "utf8")));
  });
});
