// src/services/preparePhoto.test.ts
//
// THE SHARED PHOTO STEP (UPLOAD-2 R1–R3). Pins (a), (d), (e), (f) at the service level.
//
// ⚠ WHAT THIS CANNOT DO. jsdom has no canvas and decodes no images, so the browser half
// is replaced by a FAKE that records what the real canvas would be asked to do (its size,
// its transform, the qualities tried). The GEOMETRY is real — `planPhotoDraw` is pure —
// and the assertions read which SOURCE pixels land in the output rectangle by inverting
// the very transform the canvas is handed. How it LOOKS on a real phone is OR-LIVE.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PHOTO_MAX_LONG_EDGE,
  PHOTO_MIN_LONG_EDGE,
  PHOTO_TOO_LARGE_MESSAGE,
  applyAffine,
  base64ByteLength,
  decodePhoto,
  planPhotoDraw,
  preparePhoto,
  readJpegHeader,
  type Affine,
} from "./preparePhoto";
import { MAX_UPLOAD_IMAGE_BYTES, PHOTO_TARGET_BYTES, checkUploadFile, MAX_UPLOAD_PDF_BYTES } from "./uploadLimits";

// ── Fixtures: real JPEG HEADERS (EXIF + SOF), padded to a real size ──────────────

function exifApp1(orientation: number, little: boolean): number[] {
  const u16 = (n: number) => (little ? [n & 0xff, n >> 8] : [n >> 8, n & 0xff]);
  const u32 = (n: number) =>
    little ? [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24] : [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  const tiff = [
    ...(little ? [0x49, 0x49] : [0x4d, 0x4d]),
    ...u16(42),
    ...u32(8),
    ...u16(1), // one IFD entry
    ...u16(0x0112), // Orientation
    ...u16(3), // SHORT
    ...u32(1),
    ...u16(orientation),
    0,
    0,
    ...u32(0),
  ];
  const body = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = body.length + 2;
  return [0xff, 0xe1, len >> 8, len & 0xff, ...body];
}

function sof0(width: number, height: number): number[] {
  return [0xff, 0xc0, 0, 17, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
}

/** A file whose header is a real JPEG header and whose size is the real size. */
function jpegFile(opts: { width: number; height: number; orientation?: number; little?: boolean; size: number; name?: string }) {
  const head = [0xff, 0xd8, ...(opts.orientation ? exifApp1(opts.orientation, Boolean(opts.little)) : []), ...sof0(opts.width, opts.height)];
  const bytes = new Uint8Array(Math.max(opts.size, head.length + 2));
  bytes.set(head, 0);
  bytes[bytes.length - 2] = 0xff;
  bytes[bytes.length - 1] = 0xd9;
  return new File([bytes], opts.name ?? "photo.jpg", { type: "image/jpeg" });
}

// ── The fake browser ────────────────────────────────────────────────────────────

interface CanvasRecord {
  width: number;
  height: number;
  transform: Affine | null;
  qualities: number[];
}
let canvases: CanvasRecord[] = [];
/** What the decoder reports as the image's natural size, per object URL. */
let decodedSize: { width: number; height: number } = { width: 4000, height: 3000 };
/** Bytes-per-pixel the fake JPEG encoder produces at quality q (a "detail" knob). */
let bytesPerPixelAt: (q: number) => number = (q) => 0.35 * q;
let exifApplied = true;

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  width = 0;
  height = 0;
  decoding = "auto";
  set src(_v: string) {
    this.naturalWidth = this.width = decodedSize.width;
    this.naturalHeight = this.height = decodedSize.height;
    queueMicrotask(() => this.onload?.());
  }
}

beforeEach(() => {
  canvases = [];
  decodedSize = { width: 4000, height: 3000 };
  bytesPerPixelAt = (q) => 0.35 * q;
  exifApplied = true;
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("CSS", { supports: () => exifApplied });
  URL.createObjectURL = vi.fn(() => "blob:fake");
  URL.revokeObjectURL = vi.fn();

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    const canvas = this;
    const rec: CanvasRecord = { width: canvas.width, height: canvas.height, transform: null, qualities: [] };
    canvases.push(rec);
    (canvas as unknown as { __rec: CanvasRecord }).__rec = rec;
    return {
      fillStyle: "",
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "low",
      fillRect: () => {},
      setTransform: (...m: number[]) => {
        if (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0) return;
        rec.transform = m as Affine;
      },
      drawImage: () => {},
    } as unknown as CanvasRenderingContext2D;
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(function (
    this: HTMLCanvasElement,
    _type?: string,
    quality?: number,
  ) {
    const rec = (this as unknown as { __rec: CanvasRecord }).__rec;
    const q = quality ?? 0.92;
    rec.qualities.push(q);
    const bytes = Math.round(this.width * this.height * bytesPerPixelAt(q));
    // base64 of `bytes` decoded bytes
    return `data:image/jpeg;base64,${"A".repeat(Math.ceil(bytes / 3) * 4)}`;
  } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Which SOURCE rectangle the output canvas shows: invert the transform at its corners. */
function sourceRectOf(t: Affine, outW: number, outH: number) {
  const [a, b, c, d, e, f] = t;
  const det = a * d - b * c;
  const inv = (x: number, y: number) => ({
    x: (d * (x - e) - c * (y - f)) / det,
    y: (-b * (x - e) + a * (y - f)) / det,
  });
  const pts = [inv(0, 0), inv(outW, 0), inv(0, outH), inv(outW, outH)];
  // `+ 0` folds -0 into 0 (a mirrored axis rounds to -0).
  const xs = pts.map((p) => Math.round(p.x) + 0);
  const ys = pts.map((p) => Math.round(p.y) + 0);
  return { x0: Math.min(...xs) + 0, y0: Math.min(...ys) + 0, x1: Math.max(...xs) + 0, y1: Math.max(...ys) + 0 };
}

// ── EXIF header reading (P11) ───────────────────────────────────────────────────

describe("readJpegHeader — EXIF orientation and the stored size", () => {
  it("reads orientation 6 (big-endian, the iPhone layout) and the SOF size", async () => {
    const f = jpegFile({ width: 4000, height: 3000, orientation: 6, size: 4096 });
    const h = readJpegHeader(new Uint8Array(await f.arrayBuffer()));
    expect(h).toEqual({ orientation: 6, width: 4000, height: 3000 });
  });

  it("reads orientation 8 (little-endian, a common Android layout)", async () => {
    const f = jpegFile({ width: 4000, height: 3000, orientation: 8, little: true, size: 4096 });
    expect(readJpegHeader(new Uint8Array(await f.arrayBuffer())).orientation).toBe(8);
  });

  it("no EXIF -> orientation 1; garbage -> orientation 1, never a throw", async () => {
    const f = jpegFile({ width: 800, height: 600, size: 2048 });
    expect(readJpegHeader(new Uint8Array(await f.arrayBuffer())).orientation).toBe(1);
    expect(readJpegHeader(new Uint8Array([1, 2, 3, 4, 5])).orientation).toBe(1);
  });
});

// ── (f) crop + rotate produce the expected pixel rectangle ──────────────────────

describe("(f) planPhotoDraw — crop and rotate land on the expected source pixels", () => {
  const geo = { sourceWidth: 4000, sourceHeight: 3000, orientation: 1 };

  it("CONTROL: no crop, no rotation -> the whole source, scaled to a 2,000 px long edge", () => {
    const p = planPhotoDraw(geo, { maxLongEdge: PHOTO_MAX_LONG_EDGE });
    expect([p.width, p.height]).toEqual([2000, 1500]);
    expect(sourceRectOf(p.transform, p.width, p.height)).toEqual({ x0: 0, y0: 0, x1: 4000, y1: 3000 });
  });

  it("a crop selects exactly that region of the source", () => {
    const p = planPhotoDraw(geo, { crop: { left: 0.25, top: 0.5, right: 0.75, bottom: 1 }, maxLongEdge: 2000 });
    expect([p.width, p.height]).toEqual([2000, 1500]); // the crop's own 2000x1500, not upscaled
    expect(sourceRectOf(p.transform, p.width, p.height)).toEqual({ x0: 1000, y0: 1500, x1: 3000, y1: 3000 });
  });

  it("rotate 90° clockwise: the frame turns portrait and a top-left crop is the source's bottom-left", () => {
    const p = planPhotoDraw(geo, {
      rotation: 90,
      crop: { left: 0, top: 0, right: 0.5, bottom: 0.5 },
      maxLongEdge: 4000,
    });
    expect([p.frameWidth, p.frameHeight]).toEqual([3000, 4000]);
    expect([p.width, p.height]).toEqual([1500, 2000]);
    // Rotated (x', y') = (H - y, x): the top-left quarter of the turned frame is
    // source x in [0, 2000], y in [1500, 3000].
    expect(sourceRectOf(p.transform, p.width, p.height)).toEqual({ x0: 0, y0: 1500, x1: 2000, y1: 3000 });
  });

  it("rotate 90° maps the source's top-left pixel to the output's top-right corner", () => {
    const p = planPhotoDraw(geo, { rotation: 90, maxLongEdge: 2000 });
    const tl = applyAffine(p.transform, 0, 0);
    expect(Math.round(tl.x)).toBe(p.width);
    expect(Math.round(tl.y)).toBe(0);
  });

  it("180° and 270° keep every source pixel inside the output", () => {
    for (const rotation of [180, 270] as const) {
      const p = planPhotoDraw(geo, { rotation, maxLongEdge: 2000 });
      const r = sourceRectOf(p.transform, p.width, p.height);
      expect(r).toEqual({ x0: 0, y0: 0, x1: 4000, y1: 3000 });
    }
  });
});

// ── (e) an EXIF-rotated photo comes out upright ─────────────────────────────────

describe("(e) EXIF orientation is honoured — the photo comes out upright", () => {
  it("★ a browser that does NOT apply EXIF: orientation 6 is turned by US -> portrait output", async () => {
    exifApplied = false;
    decodedSize = { width: 4000, height: 3000 }; // the stored, sideways pixels
    const file = jpegFile({ width: 4000, height: 3000, orientation: 6, size: 6 * 1024 * 1024 });
    const out = await preparePhoto(file);
    expect(out.width).toBe(1500);
    expect(out.height).toBe(2000); // upright portrait page
    // The source's top-left (the page's top-right once turned) lands top-right.
    const rec = canvases[canvases.length - 1];
    const tl = applyAffine(rec.transform!, 0, 0);
    expect([Math.round(tl.x), Math.round(tl.y)]).toEqual([1500, 0]);
  });

  it("★ a modern browser that DID apply EXIF (decoded size is the stored size swapped) is not turned twice", async () => {
    exifApplied = true;
    decodedSize = { width: 3000, height: 4000 };
    const file = jpegFile({ width: 4000, height: 3000, orientation: 6, size: 6 * 1024 * 1024 });
    const photo = await decodePhoto(file);
    expect(photo.geometry.orientation).toBe(1);
    expect(photo.fileOrientation).toBe(6);
    const out = await preparePhoto(photo);
    expect([out.width, out.height]).toEqual([1500, 2000]);
    photo.release();
  });

  it("an EXIF-rotated photo is never sent as-is, however small (its bytes are still sideways)", async () => {
    exifApplied = false;
    decodedSize = { width: 800, height: 600 };
    const file = jpegFile({ width: 800, height: 600, orientation: 6, size: 120 * 1024 });
    const out = await preparePhoto(file);
    expect(out.passthrough).toBe(false);
    expect([out.width, out.height]).toEqual([600, 800]);
  });
});

// ── (a) a 6 MB 4000×3000 camera photo ───────────────────────────────────────────

describe("(a) a 6 MB, 4000×3000 phone photo is compressed BEFORE the guard", () => {
  it("★ accepted: bytes under the cap, long edge between 1,600 and 2,000", async () => {
    const file = jpegFile({ width: 4000, height: 3000, size: 6 * 1024 * 1024 });
    expect(checkUploadFile(file, "answers").ok).toBe(false); // the raw photo WOULD be refused
    const out = await preparePhoto(file);
    const longEdge = Math.max(out.width, out.height);
    expect(longEdge).toBeGreaterThanOrEqual(PHOTO_MIN_LONG_EDGE);
    expect(longEdge).toBeLessThanOrEqual(PHOTO_MAX_LONG_EDGE);
    expect(out.bytes).toBeLessThanOrEqual(PHOTO_TARGET_BYTES);
    expect(out.bytes).toBeLessThan(MAX_UPLOAD_IMAGE_BYTES);
    expect(out.mimeType).toBe("image/jpeg");
    expect(out.quality).toBe(0.85); // first rung fits for an ordinary photo
  });

  it("a very detailed photo steps DOWN the ladder at 2,000 px before it touches the floor", async () => {
    // 2000x1500 = 3.0 MP. At 0.85 -> 2.68 MB (over the 2.5 MiB target); at 0.75 -> 2.36 MB.
    bytesPerPixelAt = (q) => q * 1.05;
    const out = await preparePhoto(jpegFile({ width: 4000, height: 3000, size: 6 * 1024 * 1024 }));
    expect(Math.max(out.width, out.height)).toBe(2000);
    expect(out.quality).toBe(0.75);
    expect(canvases[0].qualities).toEqual([0.85, 0.75]);
  });

  it("only when nothing fits at 2,000 px does it drop to the 1,600 px floor — never below", async () => {
    // At 2000 px even q=0.45 is 3.0 MP * 0.9 = 2.7 MB; at 1600 px (1.92 MP) q=0.85 -> 2.45 MB.
    bytesPerPixelAt = (q) => (q * 2) / 1;
    const out = await preparePhoto(jpegFile({ width: 4000, height: 3000, size: 6 * 1024 * 1024 }));
    expect(Math.max(out.width, out.height)).toBe(PHOTO_MIN_LONG_EDGE);
    expect(out.bytes).toBeLessThanOrEqual(PHOTO_TARGET_BYTES);
  });

  it("pathological: nothing fits even at the floor -> a message in a student's words", async () => {
    bytesPerPixelAt = () => 10;
    await expect(preparePhoto(jpegFile({ width: 4000, height: 3000, size: 6 * 1024 * 1024 }))).rejects.toThrow(
      PHOTO_TOO_LARGE_MESSAGE,
    );
    expect(PHOTO_TOO_LARGE_MESSAGE).toMatch(/Try a closer photo of just your answer/);
  });

  it("the object URL is always released", async () => {
    await preparePhoto(jpegFile({ width: 4000, height: 3000, size: 6 * 1024 * 1024 }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });
});

// ── (d) a small image: unchanged behaviour ──────────────────────────────────────

describe("(d) a small, upright, uncropped image goes as-is", () => {
  it("a 200 KB 1200×900 JPEG is sent byte-for-byte (no re-encode)", async () => {
    decodedSize = { width: 1200, height: 900 };
    const file = jpegFile({ width: 1200, height: 900, size: 200 * 1024 });
    const out = await preparePhoto(file);
    expect(out.passthrough).toBe(true);
    expect(out.bytes).toBe(file.size);
    expect(base64ByteLength(out.base64)).toBe(file.size);
    expect(canvases).toHaveLength(0);
  });

  it("a typed-text PNG screenshot under the cap stays a PNG", async () => {
    decodedSize = { width: 1080, height: 1920 };
    const png = new File([new Uint8Array(300 * 1024)], "shot.png", { type: "image/png" });
    const out = await preparePhoto(png);
    expect(out.mimeType).toBe("image/png");
    expect(out.passthrough).toBe(true);
  });

  it("but the SAME small image, cropped, is re-encoded (the crop must reach the bytes)", async () => {
    decodedSize = { width: 1200, height: 900 };
    const out = await preparePhoto(jpegFile({ width: 1200, height: 900, size: 200 * 1024 }), {
      crop: { left: 0, top: 0, right: 0.5, bottom: 1 },
    });
    expect(out.passthrough).toBe(false);
    expect([out.width, out.height]).toEqual([600, 900]);
  });
});

// ── (b) / (c) the guard on what is NOT a photo ──────────────────────────────────

describe("(b)(c) PDFs keep their hard wall; a wrong type gets the type message", () => {
  it("(b) an oversized PDF is still refused, with its message", () => {
    const big = new File([new Uint8Array(MAX_UPLOAD_PDF_BYTES + 1)], "scan.pdf", { type: "application/pdf" });
    const c = checkUploadFile(big, "answers");
    expect(c.ok).toBe(false);
    expect(!c.ok && c.message).toMatch(/the limit is 3\.5 MB\. Try scanning at a lower quality/);
  });

  it("(c) a non-image, non-PDF gets the type message", () => {
    const c = checkUploadFile(new File(["x"], "notes.docx", { type: "application/msword" }), "answers");
    expect(!c.ok && c.message).toBe("Upload a PDF (recommended) or a JPG/PNG image of your answers.");
  });

  it("preparePhoto refuses a non-photo outright", async () => {
    await expect(preparePhoto(new File(["x"], "a.heic", { type: "image/heic" }))).rejects.toThrow(/JPG or PNG/);
  });
});
