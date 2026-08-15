// src/services/qrUploadService.crop.test.ts
//
// ★ THE FIRST ASSERTIONS THE QR UPLOAD PATH HAS EVER HAD.
//
// Before this file, `prepareQrImage` — the function that decides what a grader
// actually receives from a student's phone — had ZERO test coverage. Every claim about
// it in the handoff docs was a claim about code nothing executed in CI.
//
// ⚠ WHAT THIS FILE CANNOT DO. It cannot show that a rectangle is draggable with a
// thumb, that the handles are reachable one-handed, or that the dimmed area reads as
// "outside". Those are §5 live-verify items on a real phone. Assertions here prove the
// GEOMETRY and the PLUMBING — that the region the student chose is the region that
// reaches the encoder — and nothing about how it feels to use.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  FULL_FRAME_CROP,
  MIN_CROP_FRACTION,
  clampCropFraction,
  cropToPixels,
  isFullFrameCrop,
  moveCropFraction,
  prepareQrImage,
  resizeCropFraction,
} from "./qrUploadService";

// ── Test doubles ────────────────────────────────────────────────────────────────
// jsdom has no canvas 2D context: the real `getContext("2d")` returns null and
// prepareQrImage would throw "Could not process that photo on this device." before any
// crop maths ran. Stubbing the canvas is not a convenience here, it is the only way to
// observe drawImage's SOURCE RECTANGLE — which is the whole assertion.

let drawArgs: number[] | null = null;
let canvasSize: { width: number; height: number } | null = null;
let qualitiesTried: number[] = [];
let encodedFor: (quality: number) => string = () => "AAAA";
let imageSize = { width: 4000, height: 3000 };

class FakeFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL() {
    this.result = "data:image/jpeg;base64,SOURCE";
    queueMicrotask(() => this.onload?.());
  }
}

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 0;
  height = 0;
  set src(_value: string) {
    this.width = imageSize.width;
    this.height = imageSize.height;
    queueMicrotask(() => this.onload?.());
  }
}

let restoreCreateElement: (() => void) | null = null;

/** Clearing through a function, not an inline `drawArgs = null`, on purpose: an inline
 *  assignment lets TypeScript's control-flow analysis narrow `drawArgs` to `null` for
 *  the rest of the test, and the next read then fails `typecheck:test` — which the app
 *  tsconfig does not even look at. */
function resetDraw() {
  drawArgs = null;
}

beforeEach(() => {
  drawArgs = null;
  canvasSize = null;
  qualitiesTried = [];
  encodedFor = () => "AAAA";
  imageSize = { width: 4000, height: 3000 };

  vi.stubGlobal("FileReader", FakeFileReader);
  vi.stubGlobal("Image", FakeImage);

  const original = document.createElement.bind(document);
  const spy = vi
    .spyOn(document, "createElement")
    .mockImplementation(((tag: string, ...rest: unknown[]) => {
      if (tag !== "canvas") return original(tag, ...(rest as []));
      const canvas = {
        width: 0,
        height: 0,
        getContext: (kind: string) =>
          kind === "2d"
            ? {
                drawImage: (_img: unknown, ...args: number[]) => {
                  drawArgs = args;
                  canvasSize = { width: canvas.width, height: canvas.height };
                },
              }
            : null,
        toDataURL: (_type: string, quality: number) => {
          qualitiesTried.push(quality);
          return `data:image/jpeg;base64,${encodedFor(quality)}`;
        },
      };
      return canvas as unknown as HTMLElement;
    }) as typeof document.createElement);
  restoreCreateElement = () => spy.mockRestore();
});

afterEach(() => {
  restoreCreateElement?.();
  vi.unstubAllGlobals();
});

const jpeg = () => new File(["x"], "answer.jpg", { type: "image/jpeg" });

// ── Geometry ────────────────────────────────────────────────────────────────────

describe("crop geometry", () => {
  it("the DEFAULT selection is the whole image, and reads as un-cropped", () => {
    expect(FULL_FRAME_CROP).toEqual({ left: 0, top: 0, right: 1, bottom: 1 });
    expect(isFullFrameCrop(FULL_FRAME_CROP)).toBe(true);
  });

  it("a real crop does NOT read as full-frame", () => {
    expect(isFullFrameCrop({ left: 0.2, top: 0.1, right: 0.8, bottom: 0.6 })).toBe(false);
  });

  it("a one-pixel wobble still counts as the whole page (skip must not become a crop)", () => {
    expect(isFullFrameCrop({ left: 0.002, top: 0, right: 0.999, bottom: 1 })).toBe(true);
  });

  it("clamps out of bounds, swaps inverted edges, and enforces the thumb-sized floor", () => {
    const clamped = clampCropFraction({ left: -0.5, top: 1.4, right: 1.9, bottom: 0.2 });
    expect(clamped.left).toBeGreaterThanOrEqual(0);
    expect(clamped.right).toBeLessThanOrEqual(1);
    expect(clamped.top).toBeLessThan(clamped.bottom);
    expect(clamped.bottom - clamped.top).toBeGreaterThanOrEqual(MIN_CROP_FRACTION - 1e-9);
  });

  it("a corner drag keeps the OPPOSITE corner anchored", () => {
    const start = { left: 0.1, top: 0.1, right: 0.9, bottom: 0.9 };
    const resized = resizeCropFraction(start, "se", 0.5, 0.4);
    expect(resized.left).toBeCloseTo(0.1);
    expect(resized.top).toBeCloseTo(0.1);
    expect(resized.right).toBeCloseTo(0.5);
    expect(resized.bottom).toBeCloseTo(0.4);
  });

  it("a corner dragged past the anchor stops at the floor instead of inverting", () => {
    const resized = resizeCropFraction({ left: 0.1, top: 0.1, right: 0.9, bottom: 0.9 }, "se", 0, 0);
    expect(resized.right - resized.left).toBeCloseTo(MIN_CROP_FRACTION);
    expect(resized.left).toBeCloseTo(0.1);
  });

  it("moving the box preserves its size and cannot push it off the image", () => {
    const moved = moveCropFraction({ left: 0.6, top: 0.6, right: 0.8, bottom: 0.8 }, 0.9, 0.9);
    expect(moved.right - moved.left).toBeCloseTo(0.2);
    expect(moved.right).toBeLessThanOrEqual(1);
    expect(moved.bottom).toBeLessThanOrEqual(1);
  });

  it("resolves fractions against the image's REAL pixels, not the preview's", () => {
    expect(cropToPixels({ left: 0.25, top: 0.5, right: 0.75, bottom: 1 }, 4000, 3000)).toEqual({
      sx: 1000,
      sy: 1500,
      sw: 2000,
      sh: 1500,
    });
  });

  it("never hands drawImage a source rectangle that runs off the edge", () => {
    const r = cropToPixels({ left: 0.9999, top: 0.9999, right: 1, bottom: 1 }, 1001, 999);
    expect(r.sx + r.sw).toBeLessThanOrEqual(1001);
    expect(r.sy + r.sh).toBeLessThanOrEqual(999);
  });
});

// ── The plumbing: does the chosen region reach the encoder? ──────────────────────

describe("prepareQrImage — crop reaches the encoder", () => {
  it("CONTROL: with NO crop, the whole image is the source rectangle", async () => {
    await prepareQrImage(jpeg());
    expect(drawArgs?.slice(0, 4)).toEqual([0, 0, 4000, 3000]);
  });

  it("with a crop, ONLY the chosen region is drawn", async () => {
    await prepareQrImage(jpeg(), { left: 0.25, top: 0.5, right: 0.75, bottom: 1 });
    expect(drawArgs?.slice(0, 4)).toEqual([1000, 1500, 2000, 1500]);
  });

  it("★ CROP BEFORE COMPRESS — the canvas is sized from the CROP's long edge (Q3)", async () => {
    // Uncropped, a 4000px long edge scales to the 1600px target. A half-width crop has a
    // 2000px long edge, so it scales to 1600 as well — but its HEIGHT must follow the
    // crop's aspect, not the photo's. If compression ran first this could not hold.
    await prepareQrImage(jpeg(), { left: 0.25, top: 0.5, right: 0.75, bottom: 1 });
    expect(canvasSize).toEqual({ width: 1600, height: 1200 });

    resetDraw();
    await prepareQrImage(jpeg());
    expect(canvasSize).toEqual({ width: 1600, height: 1200 });
    expect(drawArgs?.slice(0, 4)).toEqual([0, 0, 4000, 3000]);
  });

  it("a small crop is NOT upscaled past its own pixels", async () => {
    await prepareQrImage(jpeg(), { left: 0, top: 0, right: 0.2, bottom: 0.2 });
    // 20% of 4000 = 800px long edge, already under the 1600 target.
    expect(canvasSize).toEqual({ width: 800, height: 600 });
  });

  it("the quality ladder still returns on the FIRST rung that fits", async () => {
    await prepareQrImage(jpeg(), { left: 0.1, top: 0.1, right: 0.9, bottom: 0.9 });
    expect(qualitiesTried).toEqual([0.82]);
  });

  it("steps down the ladder when the first rung is too big, and still crops", async () => {
    const tooBig = "A".repeat(4_200_000); // > 3MB decoded
    encodedFor = (q) => (q === 0.82 ? tooBig : "AAAA");
    await prepareQrImage(jpeg(), { left: 0.5, top: 0, right: 1, bottom: 0.5 });
    expect(qualitiesTried).toEqual([0.82, 0.7]);
    expect(drawArgs?.slice(0, 4)).toEqual([2000, 0, 2000, 1500]);
  });

  it("a PDF is untouched by the crop step — no canvas is ever created", async () => {
    const pdf = new File(["x"], "answers.pdf", { type: "application/pdf" });
    const payload = await prepareQrImage(pdf, { left: 0.2, top: 0.2, right: 0.5, bottom: 0.5 });
    expect(payload.imageMimeType).toBe("application/pdf");
    expect(drawArgs).toBeNull();
  });
});

// ── Evidence for [FU-QR-UPLOAD-REFUSAL-UNREPRODUCED] — DOCUMENTED, NOT FIXED ─────
//
// This describes the type check EXACTLY AS IT IS ON TRUNK. It is a CONTROL that pins
// current behaviour so the open investigation has a fixed reference point; it is not a
// fix and it must not be read as endorsing the behaviour. A phone camera can emit
// HEIC/HEIF, and this is what happens when it does. Widening the check is explicitly
// out of scope for this lane.

describe("[FU-QR-UPLOAD-REFUSAL-UNREPRODUCED] current type-check behaviour (pinned, not fixed)", () => {
  it("HEIC is refused BEFORE the canvas, and the message never mentions a size", async () => {
    const heic = new File(["x"], "IMG_0001.HEIC", { type: "image/heic" });
    await expect(prepareQrImage(heic)).rejects.toThrow("Please send a photo (JPG or PNG) or a PDF.");
    // The refusal happens ahead of any compression, so no crop or downscale can rescue it.
    expect(drawArgs).toBeNull();
  });
});
