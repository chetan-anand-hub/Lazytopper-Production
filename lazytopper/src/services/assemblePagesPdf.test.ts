// src/services/assemblePagesPdf.test.ts
//
// SEVERAL PAGES, ONE PDF (UPLOAD-2 R6). Pins (g) and (i), with the REAL jspdf.
//
// The pages are real JPEG byte streams (SOI + a COM tag naming the page + SOF0 + EOI),
// so jspdf parses their size exactly as it parses a camera JPEG, and the tag lets the
// assertions read the PAGE ORDER straight out of the PDF bytes. The re-encoder is a fake
// (jsdom has no canvas): it reports the size a real canvas re-encode would produce.

import { describe, it, expect } from "vitest";
import {
  PDF_RUNGS,
  PagesTooLargeError,
  assemblePagesPdf,
  type PageReencoder,
  type PdfPageInput,
} from "./assemblePagesPdf";
import { PHOTO_MIN_LONG_EDGE, base64ToBytes, bytesToBase64 } from "./preparePhoto";
import { MAX_UPLOAD_PDF_BYTES, PAGES_PDF_TARGET_BYTES, checkUploadFile } from "./uploadLimits";

/** A real (header-complete) JPEG of `bytes` total, tagged `tag`, sized w×h. */
function jpeg(tag: string, w: number, h: number, bytes: number): string {
  const com = Array.from(new TextEncoder().encode(`PAGE:${tag};`));
  const comLen = com.length + 2;
  const head = [
    0xff, 0xd8,
    0xff, 0xfe, comLen >> 8, comLen & 0xff, ...com,
    0xff, 0xc0, 0, 17, 8, h >> 8, h & 0xff, w >> 8, w & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
  ];
  const out = new Uint8Array(Math.max(bytes, head.length + 2));
  out.set(head, 0);
  out[out.length - 2] = 0xff;
  out[out.length - 1] = 0xd9;
  return bytesToBase64(out);
}

function page(tag: string, w = 2000, h = 1500, bytes = 900 * 1024): PdfPageInput {
  return { base64: jpeg(tag, w, h, bytes), mimeType: "image/jpeg", width: w, height: h };
}

/** Tag of each page, in the order the PDF embeds them. */
function pageOrder(pdfB64: string): string[] {
  const text = new TextDecoder("latin1").decode(base64ToBytes(pdfB64));
  return Array.from(text.matchAll(/PAGE:([A-Za-z0-9]+);/g)).map((m) => m[1]);
}

function embeddedSizes(pdfB64: string): Array<{ w: number; h: number }> {
  const text = new TextDecoder("latin1").decode(base64ToBytes(pdfB64));
  return Array.from(text.matchAll(/\/Width (\d+)\s*\/Height (\d+)/g)).map((m) => ({ w: +m[1], h: +m[2] }));
}

function pageCount(pdfB64: string): number {
  const text = new TextDecoder("latin1").decode(base64ToBytes(pdfB64));
  return (text.match(/\/Type \/Page\b(?!s)/g) || []).length;
}

/** A re-encoder whose output size follows (long edge, quality) like a real JPEG does. */
function fakeReencoder(bytesPerPixelAt: (q: number) => number): PageReencoder & { calls: Array<[number, number]> } {
  const calls: Array<[number, number]> = [];
  const fn = (async (p: PdfPageInput, longEdge: number, quality: number) => {
    calls.push([longEdge, quality]);
    const scale = Math.min(1, longEdge / Math.max(p.width, p.height));
    const w = Math.round(p.width * scale);
    const h = Math.round(p.height * scale);
    const tag = new TextDecoder("latin1").decode(base64ToBytes(p.base64)).match(/PAGE:([A-Za-z0-9]+);/)![1];
    return { base64: jpeg(tag, w, h, Math.round(w * h * bytesPerPixelAt(quality))), width: w, height: h };
  }) as PageReencoder & { calls: Array<[number, number]> };
  fn.calls = calls;
  return fn;
}

describe("(g) 4 × 6 MB photos -> ONE PDF under the cap, 4 pages in tray order, each ≥ 1,600 px", () => {
  it("★ the pages fit only after stepping down TOGETHER — and never below the floor", async () => {
    // Prepared pages arrive at ~0.9 MB each (2000x1500 at 0.85): 3.6 MB — over the cap.
    const pages = ["P1", "P2", "P3", "P4"].map((t) => page(t));
    // A detailed hand (0.6 bytes/pixel at q=1): even 2000 px @ 0.55 is 4 x 1.98 MB — over;
    // the first rung that fits is the 1,600 px floor @ 0.65 (4 x 0.75 MB).
    const reencode = fakeReencoder((q) => q * 0.6);
    const pdf = await assemblePagesPdf(pages, { reencode });

    expect(pdf.pageCount).toBe(4);
    expect(pageCount(pdf.base64)).toBe(4);
    expect(pageOrder(pdf.base64)).toEqual(["P1", "P2", "P3", "P4"]);
    expect(pdf.bytes).toBeLessThanOrEqual(PAGES_PDF_TARGET_BYTES);
    expect(pdf.pages[0].quality).toBe(0.65);
    expect(pdf.bytes).toBeLessThan(MAX_UPLOAD_PDF_BYTES);
    for (const p of pdf.pages) expect(Math.max(p.width, p.height)).toBeGreaterThanOrEqual(PHOTO_MIN_LONG_EDGE);
    for (const s of embeddedSizes(pdf.base64)) expect(Math.max(s.w, s.h)).toBeGreaterThanOrEqual(PHOTO_MIN_LONG_EDGE);
    // Every page at the SAME rung (stepped down together).
    const rungs = new Set(reencode.calls.slice(-4).map(([e, q]) => `${e}@${q}`));
    expect(rungs.size).toBe(1);
    // The guard accepts it as a PDF.
    const file = new File([base64ToBytes(pdf.base64)], "4 pages.pdf", { type: "application/pdf" });
    expect(checkUploadFile(file, "answers").ok).toBe(true);
  }, 60_000); // megabyte fixtures through the real jspdf, under a loaded CI runner

  it("CONTROL: pages that already fit go in exactly as prepared — no second encode", async () => {
    const pages = ["A", "B", "C"].map((t) => page(t, 2000, 1500, 500 * 1024));
    const reencode = fakeReencoder((q) => q);
    const pdf = await assemblePagesPdf(pages, { reencode });
    expect(reencode.calls).toHaveLength(0);
    expect(pdf.pages.every((p) => p.quality === null)).toBe(true);
    expect(embeddedSizes(pdf.base64)).toEqual([
      { w: 2000, h: 1500 },
      { w: 2000, h: 1500 },
      { w: 2000, h: 1500 },
    ]);
  });

  it("every rung keeps the 1,600 px floor (the ladder itself never goes lower)", () => {
    for (const [edge] of PDF_RUNGS) expect(edge).toBeGreaterThanOrEqual(PHOTO_MIN_LONG_EDGE);
  });

  it("nothing fits even at the floor -> a student-worded refusal suggesting fewer pages", async () => {
    // Small pages against a tiny cap: the same exhaustion, without megabytes of fixtures.
    const pages = Array.from({ length: 8 }, (_, i) => page(`X${i}`, 200, 150, 2048));
    const opts = { reencode: fakeReencoder(() => 1), capBytes: 4096 };
    await expect(assemblePagesPdf(pages, opts)).rejects.toBeInstanceOf(PagesTooLargeError);
    await expect(assemblePagesPdf(pages, opts)).rejects.toThrow(/Try fewer pages/);
  });

  it("a portrait page stays portrait in the PDF (no stitching, no squashing)", async () => {
    const pdf = await assemblePagesPdf([page("T", 1500, 2000, 400 * 1024), page("U", 2000, 1500, 400 * 1024)], {
      reencode: fakeReencoder((q) => q),
    });
    expect(embeddedSizes(pdf.base64)).toEqual([
      { w: 1500, h: 2000 },
      { w: 2000, h: 1500 },
    ]);
  });
});

describe("(i) reorder and delete change the PDF's page order", () => {
  it("the PDF follows the tray order it is given", async () => {
    const [a, b, c] = ["A", "B", "C"].map((t) => page(t, 2000, 1500, 300 * 1024));
    const reencode = fakeReencoder((q) => q);
    expect(pageOrder((await assemblePagesPdf([a, b, c], { reencode })).base64)).toEqual(["A", "B", "C"]);
    expect(pageOrder((await assemblePagesPdf([c, a, b], { reencode })).base64)).toEqual(["C", "A", "B"]);
    expect(pageOrder((await assemblePagesPdf([a, c], { reencode })).base64)).toEqual(["A", "C"]);
  });

  it("jspdf is loaded lazily — only when a PDF is actually built", async () => {
    let loads = 0;
    const loadJsPdf = async () => {
      loads += 1;
      return import("jspdf");
    };
    await assemblePagesPdf([page("A", 2000, 1500, 100 * 1024), page("B", 2000, 1500, 100 * 1024)], {
      loadJsPdf,
      reencode: fakeReencoder((q) => q),
    });
    expect(loads).toBe(1);
  });
});
