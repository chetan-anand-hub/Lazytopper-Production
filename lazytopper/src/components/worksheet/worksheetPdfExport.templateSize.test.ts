/**
 * PACK-PDF-SIZE-1 - a pack TEMPLATE page is rasterised smaller (150 dpi-ish, quality 0.62) and its PDF streams are Flate-compressed;
 * every browser-built (non-template) path keeps its own scale and quality.
 */
import { describe, expect, it } from "vitest";
import { pdfCtorOptions, rasterTuning, TEMPLATE_JPEG_QUALITY, TEMPLATE_RASTER_SCALE, TEMPLATE_SIZE_TUNING } from "./worksheetPdfExport";

describe("rasterTuning", () => {
  it("leaves a non-template render exactly as the caller asked", () => {
    expect(rasterTuning(false, 2, 0.95)).toEqual({ scale: 2, quality: 0.95 });
    expect(rasterTuning(false, 1.5, 0.8)).toEqual({ scale: 1.5, quality: 0.8 });
  });
  it("caps a template render at the tuned scale/quality, never raising a lower request", () => {
    expect(TEMPLATE_SIZE_TUNING).toBe(true);
    expect(rasterTuning(true, 2, 0.95)).toEqual({ scale: TEMPLATE_RASTER_SCALE, quality: TEMPLATE_JPEG_QUALITY });
    expect(rasterTuning(true, 1.5, 0.8)).toEqual({ scale: 1.5, quality: TEMPLATE_JPEG_QUALITY });
    expect(rasterTuning(true, 1.2, 0.5)).toEqual({ scale: 1.2, quality: 0.5 });
  });
  it("a 794 px page at the template scale is ~1240 px (150 dpi on A4), not 1588", () => {
    expect(Math.round(794 * TEMPLATE_RASTER_SCALE)).toBeGreaterThanOrEqual(1230);
    expect(Math.round(794 * TEMPLATE_RASTER_SCALE)).toBeLessThanOrEqual(1250);
  });
});

describe("pdfCtorOptions", () => {
  it("compresses only a template", () => {
    expect(pdfCtorOptions(true)).toEqual({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    expect(pdfCtorOptions(false)).toEqual({ orientation: "portrait", unit: "mm", format: "a4" });
  });
});
