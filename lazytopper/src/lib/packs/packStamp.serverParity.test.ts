// SERVER-PDF-1 PR-B - the server's stamp (server/services/packStamp.cjs, pdf-lib) puts back what the browser build (jsPDF) would have
// drawn. Pinned here, against the REAL client code and the REAL jsPDF: the licence WORDING, the footer's fit ladder with Helvetica
// metrics, the re-download sentence, and the fonts the cover is stamped with.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { jsPDF } from "jspdf";
import { describe, expect, it } from "vitest";
import { licenseeLine } from "../../components/worksheet/worksheetPdfExport";
import { redownloadCopyFor } from "./packLabels";
import { PINNED_FONTS } from "./packTemplateFonts";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const server = require("../../../server/services/packStamp.cjs") as {
  licenseeLine: (l: { name: string; email: string; orderId: string }, ascii?: boolean) => string;
  fitFooter: (l: { name: string; email: string; orderId: string }, maxW: number, sizes: number[], width: (t: string, size: number) => number) => { text: string; size: number };
  redownloadCopy: (paidAtMs: number | undefined) => string;
  loadFonts: (fonts: unknown[]) => Record<string, Buffer>;
  jspdfWidthMm: (text: string, sizePt: number) => number;
};

const PEOPLE = [
  { name: "Asha Rao", email: "asha@example.in", orderId: "order_Abc123" },
  { name: "Venkata Subramanian Raghunathan Iyer", email: "venkata.subramanian.raghunathan.iyer@example-school.edu.in", orderId: "order_PlaceholderOrder0000" },
  { name: "", email: "+91 98•••••948", orderId: "order_Phone9" },
  { name: "Zoë नमस्ते José", email: "zoe@x.in", orderId: "o" },
  { name: "N".repeat(90), email: `${"e".repeat(90)}@x.in`, orderId: "order_1" },
];

/** The client's fitLicensee (worksheetPdfExport.ts), driven by a REAL jsPDF's metrics. */
function clientFit(l: { name: string; email: string; orderId: string }, maxW: number): { text: string; size: number } {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setFont("helvetica", "normal");
  const latin1 = (t: string) => t.replace(/•/g, "*").replace(/[^ -~ -ÿ]/g, "").replace(/\s+/g, " ").trim();
  const base = { name: latin1(l.name), email: latin1(l.email), orderId: latin1(l.orderId) };
  const shorten = (v: string, drop: number) => (drop <= 0 ? v : `${v.slice(0, Math.max(1, v.length - drop))}...`);
  for (let drop = 0; drop <= base.name.length + base.email.length; drop += 1) {
    const nameDrop = Math.min(drop, Math.max(0, base.name.length - 1));
    const emailDrop = drop - nameDrop;
    const text = licenseeLine({ name: shorten(base.name, nameDrop), email: shorten(base.email, emailDrop), orderId: base.orderId }, true);
    for (let size = 10; size >= 9; size -= 0.5) {
      pdf.setFontSize(size);
      if (pdf.getTextWidth(text) <= maxW) return { text, size };
    }
  }
  return { text: licenseeLine({ name: "", email: "", orderId: base.orderId }, true), size: 9 };
}

describe("SERVER-PDF-1 - the stamp is the browser build's licence, not a lookalike", () => {
  it("the licence line wording is the client's, with and without the Latin-1 filter", () => {
    for (const p of PEOPLE) {
      expect(server.licenseeLine(p)).toBe(licenseeLine(p));
      expect(server.licenseeLine(p, true)).toBe(licenseeLine(p, true));
    }
    expect(server.licenseeLine(PEOPLE[0])).toBe("Licensed to Asha Rao · asha@example.in · Order order_Abc123 — personal use only");
  });

  it("the server measures with jsPDF's own Helvetica metrics (pdf-lib's AFM widths differ by ~1% and would cut other lines)", () => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFont("helvetica", "normal");
    for (const p of PEOPLE) {
      const text = licenseeLine(p, true);
      for (const size of [10, 9.5, 9]) {
        pdf.setFontSize(size);
        expect(server.jspdfWidthMm(text, size)).toBe(pdf.getTextWidth(text));
      }
    }
  });

  it("the footer ladder picks the SAME text and size as the client, for both recorded widths (with and without the QR)", () => {
    for (const maxW of [186, 164]) {
      for (const p of PEOPLE) expect(server.fitFooter(p, maxW, [10, 9.5, 9], server.jspdfWidthMm), `${maxW} ${p.name.slice(0, 12)}`).toEqual(clientFit(p, maxW));
    }
  });

  it("the client still has the ladder this mirrors (a change there must change the server's stamp too)", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../components/worksheet/worksheetPdfExport.ts"), "utf8");
    expect(src).toContain("for (let size = 10; size >= 9; size -= 0.5)");
    expect(src).toContain("const shorten = (v: string, drop: number): string => (drop <= 0 ? v : `${v.slice(0, Math.max(1, v.length - drop))}...`);");
    expect(src).toContain('return text.replace(/\\u2022/g, "*")');
  });

  it("the re-download sentence is the client's, for every kind of paid time", () => {
    for (const paid of [undefined, 0, 1_790_829_000_000, 1_795_000_000_000, 1_806_517_800_000]) {
      expect(server.redownloadCopy(paid)).toBe(redownloadCopyFor(paid as number));
    }
  });

  it("the pinned fonts load from the repo and verify against their recorded sha256", () => {
    const fonts = server.loadFonts([...PINNED_FONTS]);
    expect(Object.keys(fonts).sort()).toEqual(["Fraunces-700", "Inter-400", "Inter-500", "Inter-600", "Inter-700", "Inter-800"]);
    expect(() => server.loadFonts([{ ...PINNED_FONTS[0], sha256: "0".repeat(64) }])).toThrow(/font_mismatch/);
  });
});
