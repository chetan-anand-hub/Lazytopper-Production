/**
 * BRIDGE-CODES-1 - pack papers carry the same footer QR (payload = the printed code, nothing else; BRIDGE-PDF-1 turns it on for
 * every pack paper). Every pinned pack code - and a future versioned CBQ code (QR version 2) - decodes from a 1000 px photo-scale
 * render of the page, drawn with the export's own calls, to exactly the code findPaperCodes reads.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildPaperQrMatrix, drawPaperQr } from "../worksheet/paperQr";
import { decodeQrFromPixels, footerBand } from "./decodePaperCode";
import { findPaperCodes } from "./paperCodeMatch";

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;

async function renderPage(code: string, w: number): Promise<{ data: Uint8ClampedArray; w: number; h: number }> {
  const h = Math.round((w * PAGE_H_MM) / PAGE_W_MM);
  const px = w / PAGE_W_MM;
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  let fill = 255;
  const stub = {
    setFillColor: (c: number) => { fill = c; },
    rect: (x: number, y: number, rw: number, rh: number) => {
      const x0 = Math.round(x * px), y0 = Math.round(y * px), x1 = Math.round((x + rw) * px), y1 = Math.round((y + rh) * px);
      for (let yy = y0; yy < y1; yy += 1) for (let xx = x0; xx < x1; xx += 1) {
        const i = (yy * w + xx) * 4;
        data[i] = data[i + 1] = data[i + 2] = fill;
      }
    },
  };
  drawPaperQr(stub, (await buildPaperQrMatrix(code))!, 42, PAGE_H_MM - 23.5);
  return { data, w, h };
}

const pinned = Object.keys(JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../lib/packs/packPaperCodes.pin.json"), "utf8")));
const longest = [...pinned].sort((a, b) => b.length - a.length).slice(0, 2);
const sample = ["PK-M-RN-CT1", "PK-S-FULL-M8", "PK-M-RN-CBQ1", pinned.filter((c) => c.includes("-CBQ")).pop()!, ...longest, "PK-S-MEOE-CBQ12-V2"];

describe("pack paper QR -> code (photo scale)", () => {
  for (const code of sample) {
    it(`${code}: decodes to the code, and the Answer Checker reads it as that code`, async () => {
      const { data, w, h } = await renderPage(code, 1000);
      const decoded = await decodeQrFromPixels(data, w, h);
      expect(decoded).toBe(code);
      expect(findPaperCodes([decoded])).toEqual([code]);
    });
  }
});

describe("footer band pass (review 1643: a small whole page can miss the QR; the bottom band alone reads it)", () => {
  it("the band is the bottom quarter, and the pack QR position (11-29 mm from the bottom of 297 mm) is inside it", () => {
    const h = 1170; // A4 at 100 dpi
    const b = footerBand(h);
    expect(b.y + b.h).toBe(h);
    expect(b.h).toBeGreaterThanOrEqual(Math.round(h * 0.25) - 1);
    const qrTopPx = ((297 - 29) / 297) * h;
    expect(qrTopPx).toBeGreaterThan(b.y);
  });

  it("decodes a pack code from the band alone at 100 dpi (827 px page width)", async () => {
    const { data, w, h } = await renderPage("PK-S-LP-CBQ3", 827);
    const b = footerBand(h);
    const band = data.slice(b.y * w * 4, (b.y + b.h) * w * 4);
    expect(await decodeQrFromPixels(band, w, b.h)).toBe("PK-S-LP-CBQ3");
  });
});
