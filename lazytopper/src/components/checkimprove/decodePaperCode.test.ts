/**
 * GRADE-ROUTE-2 B3 - the decoder reads OUR footer QR at phone-photo scale.
 * The page is rasterised from the SAME drawing calls the PDF export makes (`drawPaperQr`, 18 mm on an A4 page) at
 * 1000 px wide - roughly a phone photo of the sheet - then decoded with the real jsQR.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { buildPaperQrMatrix, drawPaperQr } from "../worksheet/paperQr";
import { decodePaperCodeFromImage, decodeQrFromPixels } from "./decodePaperCode";

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;

/** An A4 page raster (white) with the footer QR drawn exactly where the export draws it. */
async function renderPage(code: string, widthPx: number): Promise<{ data: Uint8ClampedArray; w: number; h: number }> {
  const w = widthPx;
  const h = Math.round((widthPx * PAGE_H_MM) / PAGE_W_MM);
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

afterEach(() => vi.unstubAllGlobals());

describe("decodeQrFromPixels - our footer QR, phone-photo scale", () => {
  for (const code of ["WS-M-MIX-02", "WS-S-FULL-01", "CT-M-RN-02", "FM-M-04"]) {
    it(`${code}: a 1000 px wide render of the page decodes to the code`, async () => {
      const { data, w, h } = await renderPage(code, 1000);
      expect(await decodeQrFromPixels(data, w, h)).toBe(code);
    });
  }
  it("a page with no QR decodes to null", async () => {
    const data = new Uint8ClampedArray(400 * 400 * 4).fill(255);
    expect(await decodeQrFromPixels(data, 400, 400)).toBeNull();
  });
});

describe("decodePaperCodeFromImage - engines and fall-backs", () => {
  it("not an image / bad input / no createImageBitmap: null, never throws", async () => {
    expect(await decodePaperCodeFromImage({ base64: "AAAA", mime: "application/pdf" })).toBeNull();
    expect(await decodePaperCodeFromImage({ base64: null, mime: "image/jpeg" })).toBeNull();
    expect(await decodePaperCodeFromImage(new Blob(["x"], { type: "image/png" }))).toBeNull(); // jsdom: no createImageBitmap
  });

  it("uses the native BarcodeDetector first when the browser has one", async () => {
    const detect = vi.fn(async () => [{ rawValue: "WS-M-MIX-02" }]);
    vi.stubGlobal("BarcodeDetector", function BarcodeDetector() { return { detect }; });
    vi.stubGlobal("createImageBitmap", async () => ({ width: 10, height: 10, close: () => {} }));
    expect(await decodePaperCodeFromImage({ base64: btoa("x"), mime: "image/jpeg" })).toBe("WS-M-MIX-02");
    expect(detect).toHaveBeenCalledTimes(1);
  });

  it("a native detector that finds nothing or throws falls through to jsQR (here: a blank bitmap -> null)", async () => {
    vi.stubGlobal("BarcodeDetector", function BarcodeDetector() { return { detect: async () => { throw new Error("nope"); } }; });
    vi.stubGlobal("createImageBitmap", async () => ({ width: 10, height: 10, close: () => {} }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(10 * 10 * 4).fill(255) }),
    } as unknown as CanvasRenderingContext2D);
    expect(await decodePaperCodeFromImage({ base64: btoa("x"), mime: "image/png" })).toBeNull();
  });
});
