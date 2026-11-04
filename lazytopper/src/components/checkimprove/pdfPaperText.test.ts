import { describe, it, expect } from "vitest";
import { readPdfPaperText } from "./pdfPaperText";

describe("readPdfPaperText (GRADE-ROUTE-1 A3)", () => {
  it("returns the metadata strings then the page text of a PDF, via the injected loader", async () => {
    const seen: number[] = [];
    const out = await readPdfPaperText(btoa("%PDF-1.4"), "application/pdf", async (bytes) => {
      seen.push(bytes.length);
      return { meta: ["WS-M-MIX-02 Worksheet", null, ""], pages: ["Page one WS-M-MIX-02", ""] };
    });
    expect(seen).toEqual([8]);
    expect(out).toEqual(["WS-M-MIX-02 Worksheet", "Page one WS-M-MIX-02"]);
  });
  it("not a PDF, empty, or a loader failure: [] (never throws)", async () => {
    const boom = async () => { throw new Error("worker blocked"); };
    expect(await readPdfPaperText(btoa("x"), "image/jpeg", boom)).toEqual([]);
    expect(await readPdfPaperText(null, "application/pdf", boom)).toEqual([]);
    expect(await readPdfPaperText(btoa("x"), "application/pdf", boom)).toEqual([]);
  });
});
