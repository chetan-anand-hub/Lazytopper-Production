// src/services/preparePhoto.ts
//
// THE ONE PHOTO STEP (UPLOAD-2, owner ruling R1). Every surface where a student
// uploads a photo for grading runs it through here BEFORE any size check:
//
//   decode once -> upright (EXIF honoured) -> rotate (90° steps) -> crop ->
//   downscale (long edge 2,000 px, never below 1,600 px) -> JPEG first-fit
//   quality ladder starting at 0.85 -> size check
//
// so a phone photo (3-8 MB straight off the camera) never meets a size error.
// PDFs are NOT touched here: there is no canvas for a PDF, so its limit stays a
// hard wall (uploadLimits.ts `checkUploadFile`).
//
// Before this file there were two compressors and four size walls: the QR phone
// page had a 1,600 px compressor (qrUploadService `prepareQrImage`), while Check &
// Improve, SolutionChecker, WorksheetGradePanel and ChapterTestUploadPanel refused
// anything over 3 MB with no way to shrink it. `prepareQrImage` is now a thin call
// into `preparePhoto` — one compressor, not two.
//
// ── WHY THE GEOMETRY IS A PLAIN MATRIX ──────────────────────────────────────────
// Upright + rotate + crop + scale compose into ONE affine transform, drawn with ONE
// `drawImage`. No intermediate full-resolution canvas is ever made: a 12 MP photo
// is 48 MB of RGBA, and the cheap Android most students carry cannot afford two of
// them. It also makes the geometry testable without a canvas (jsdom has none):
// `planPhotoDraw` is pure, and the tests check exactly which source pixels land in
// the output rectangle.

import { MAX_UPLOAD_IMAGE_BYTES, PHOTO_TARGET_BYTES } from "./uploadLimits";

// ── Size policy ──────────────────────────────────────────────────────────────────

/** Long edge a photo is downscaled to. Handwriting stays crisp at this size. */
export const PHOTO_MAX_LONG_EDGE = 2000;
/** The floor: never shrink a page below this (unless the source itself is smaller).
 *  Below ~1,600 px a phone photo of a full A4 page stops being reliably legible. */
export const PHOTO_MIN_LONG_EDGE = 1600;
/** First-fit JPEG quality ladder, best first. It returns on the first rung that fits,
 *  so a typical photo is encoded once at 0.85 and never stepped down at all. */
export const PHOTO_QUALITY_LADDER: readonly number[] = [0.85, 0.75, 0.65, 0.55, 0.45];

/** What a student reads when even the floor cannot fit (pathological — a 2,000 px
 *  JPEG at 0.45 is a few hundred KB). Says what to DO, in a student's words. */
export const PHOTO_TOO_LARGE_MESSAGE =
  "This photo is too detailed to send. Try a closer photo of just your answer.";

/** What a student reads when the device cannot open the photo at all. */
export const PHOTO_UNREADABLE_MESSAGE =
  "We couldn't open that photo on this device. Try taking it again, or choose another image.";

// ── Crop selection (normalised fractions) ───────────────────────────────────────

/**
 * A crop selection, held as NORMALISED FRACTIONS of the displayed (upright, rotated)
 * photo (0..1, origin top-left) — never pixels.
 *
 * WHY FRACTIONS. The student drags on a CSS-scaled preview whose on-screen size differs
 * on every phone, so a pixel measured there means nothing against a 4000px original.
 * Fractions are resolution-independent: the same selection means the same region whether
 * it was drawn on a 360px Android or a 1440px desktop, and the conversion to source pixels
 * happens once, here, against the image's real dimensions.
 */
export interface CropFraction {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Which corner a drag is pulling. Corners only — edge handles are too small to aim
 *  with a thumb, and four targets are all a one-handed student can hit reliably. */
export type CropHandle = "nw" | "ne" | "sw" | "se";

/** Clockwise quarter turns the student asked for with the Rotate button. */
export type PhotoRotation = 0 | 90 | 180 | 270;

/**
 * ★ THE DEFAULT SELECTION IS THE WHOLE IMAGE (owner ruling Q2 / R4).
 * Crop is OPTIONAL and SKIPPABLE. A student who just wants to send the page confirms
 * this untouched and never thinks about cropping at all.
 */
export const FULL_FRAME_CROP: CropFraction = { left: 0, top: 0, right: 1, bottom: 1 };

/** Smallest selection a drag may produce, as a fraction of each edge. */
export const MIN_CROP_FRACTION = 0.1;

/** Tolerance for "the student did not really crop" — a one-pixel drag is not a crop. */
const FULL_FRAME_EPSILON = 0.005;

/** Keep a rectangle inside the image and no smaller than MIN_CROP_FRACTION. */
export function clampCropFraction(rect: CropFraction): CropFraction {
  const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
  // A drag can pull a handle clean past the opposite edge. Swap rather than refuse —
  // that is what every native crop tool does, and what a thumb expects.
  let left = clamp01(Math.min(rect.left, rect.right));
  let right = clamp01(Math.max(rect.left, rect.right));
  let top = clamp01(Math.min(rect.top, rect.bottom));
  let bottom = clamp01(Math.max(rect.top, rect.bottom));

  if (right - left < MIN_CROP_FRACTION) {
    if (left + MIN_CROP_FRACTION <= 1) right = left + MIN_CROP_FRACTION;
    else {
      right = 1;
      left = 1 - MIN_CROP_FRACTION;
    }
  }
  if (bottom - top < MIN_CROP_FRACTION) {
    if (top + MIN_CROP_FRACTION <= 1) bottom = top + MIN_CROP_FRACTION;
    else {
      bottom = 1;
      top = 1 - MIN_CROP_FRACTION;
    }
  }
  return { left, top, right, bottom };
}

/** Is this selection still (effectively) the whole page? */
export function isFullFrameCrop(rect: CropFraction): boolean {
  return (
    rect.left <= FULL_FRAME_EPSILON &&
    rect.top <= FULL_FRAME_EPSILON &&
    rect.right >= 1 - FULL_FRAME_EPSILON &&
    rect.bottom >= 1 - FULL_FRAME_EPSILON
  );
}

/** Drag the whole box without resizing it — it keeps its size and stays in bounds. */
export function moveCropFraction(rect: CropFraction, dx: number, dy: number): CropFraction {
  const w = rect.right - rect.left;
  const h = rect.bottom - rect.top;
  const left = Math.min(1 - w, Math.max(0, rect.left + dx));
  const top = Math.min(1 - h, Math.max(0, rect.top + dy));
  return { left, top, right: left + w, bottom: top + h };
}

/** Drag one corner. The OPPOSITE corner is the anchor and must not move. */
export function resizeCropFraction(
  rect: CropFraction,
  handle: CropHandle,
  x: number,
  y: number,
): CropFraction {
  const cx = Math.min(1, Math.max(0, x));
  const cy = Math.min(1, Math.max(0, y));
  const next = { ...rect };
  if (handle === "nw" || handle === "sw") next.left = Math.min(cx, rect.right - MIN_CROP_FRACTION);
  else next.right = Math.max(cx, rect.left + MIN_CROP_FRACTION);
  if (handle === "nw" || handle === "ne") next.top = Math.min(cy, rect.bottom - MIN_CROP_FRACTION);
  else next.bottom = Math.max(cy, rect.top + MIN_CROP_FRACTION);
  return clampCropFraction(next);
}

/** Resolve a fractional selection into a pixel rectangle of a `width`×`height` frame. */
export function cropToPixels(
  rect: CropFraction,
  naturalWidth: number,
  naturalHeight: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const r = clampCropFraction(rect);
  const sw = Math.max(1, Math.round((r.right - r.left) * naturalWidth));
  const sh = Math.max(1, Math.round((r.bottom - r.top) * naturalHeight));
  return {
    // Rounding width and origin independently can push the rectangle one pixel off the
    // right/bottom edge; pull it back rather than hand drawImage an out-of-bounds source.
    sx: Math.min(Math.round(r.left * naturalWidth), Math.max(0, naturalWidth - sw)),
    sy: Math.min(Math.round(r.top * naturalHeight), Math.max(0, naturalHeight - sh)),
    sw,
    sh,
  };
}

/** One more clockwise quarter turn. */
export function nextRotation(r: PhotoRotation): PhotoRotation {
  return ((r + 90) % 360) as PhotoRotation;
}

// ── EXIF orientation (P11) ──────────────────────────────────────────────────────

export interface JpegHeaderInfo {
  /** EXIF orientation tag 1..8 (1 = already upright / absent). */
  orientation: number;
  /** Stored (un-oriented) pixel size from the SOF marker, when found. */
  width: number | null;
  height: number | null;
}

/**
 * Read the EXIF orientation tag and the stored pixel size out of a JPEG's header.
 * Pure — takes the first bytes of the file — so it runs (and is tested) without a
 * browser. Anything unparseable reads as orientation 1: a malformed header must never
 * stop a student sending a photo.
 */
export function readJpegHeader(bytes: Uint8Array): JpegHeaderInfo {
  const out: JpegHeaderInfo = { orientation: 1, width: null, height: null };
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return out;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    // Fill bytes / standalone markers carry no length.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break; // EOI / start of scan: header is over
    const length = view.getUint16(offset + 2);
    if (length < 2) break;
    const segStart = offset + 4;
    if (marker === 0xe1 && out.orientation === 1 && segStart + 6 <= bytes.length) {
      out.orientation = readExifOrientation(view, segStart, Math.min(bytes.length, offset + 2 + length));
    }
    // SOF0..SOF15 except DHT (C4), JPG (C8), DAC (CC) carry the frame size.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (segStart + 5 <= bytes.length) {
        out.height = view.getUint16(segStart + 1);
        out.width = view.getUint16(segStart + 3);
      }
    }
    offset += 2 + length;
  }
  return out;
}

function readExifOrientation(view: DataView, start: number, end: number): number {
  // "Exif\0\0"
  if (end - start < 14) return 1;
  if (view.getUint32(start) !== 0x45786966 || view.getUint16(start + 4) !== 0) return 1;
  const tiff = start + 6;
  const order = view.getUint16(tiff);
  const little = order === 0x4949;
  if (!little && order !== 0x4d4d) return 1;
  if (tiff + 8 > end) return 1;
  const ifd0 = tiff + view.getUint32(tiff + 4, little);
  if (ifd0 + 2 > end) return 1;
  const entries = view.getUint16(ifd0, little);
  for (let i = 0; i < entries; i++) {
    const entry = ifd0 + 2 + i * 12;
    if (entry + 12 > end) return 1;
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

/** Does EXIF orientation `o` swap width and height (a quarter turn or a transpose)? */
export function orientationSwapsAxes(o: number): boolean {
  return o >= 5 && o <= 8;
}

// ── The draw plan (pure geometry) ───────────────────────────────────────────────

/** Canvas affine transform, as `setTransform(a, b, c, d, e, f)` takes it:
 *  x' = a·x + c·y + e,  y' = b·x + d·y + f. */
export type Affine = [number, number, number, number, number, number];

const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

/** `m1 ∘ m2` — apply m2 first, then m1. */
export function composeAffine(m1: Affine, m2: Affine): Affine {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export function applyAffine(m: Affine, x: number, y: number): { x: number; y: number } {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}

/** Map a W×H stored image into its upright frame for EXIF orientation `o`. */
function exifAffine(o: number, w: number, h: number): Affine {
  switch (o) {
    case 2: return [-1, 0, 0, 1, w, 0]; //            mirror horizontally
    case 3: return [-1, 0, 0, -1, w, h]; //           rotate 180
    case 4: return [1, 0, 0, -1, 0, h]; //            mirror vertically
    case 5: return [0, 1, 1, 0, 0, 0]; //             transpose
    case 6: return [0, 1, -1, 0, h, 0]; //            rotate 90 clockwise
    case 7: return [0, -1, -1, 0, h, w]; //           transverse
    case 8: return [0, -1, 1, 0, 0, w]; //            rotate 90 counter-clockwise
    default: return IDENTITY;
  }
}

/** Map a W×H upright frame through `r` clockwise degrees. */
function rotationAffine(r: PhotoRotation, w: number, h: number): Affine {
  switch (r) {
    case 90: return [0, 1, -1, 0, h, 0];
    case 180: return [-1, 0, 0, -1, w, h];
    case 270: return [0, -1, 1, 0, 0, w];
    default: return IDENTITY;
  }
}

export interface PhotoGeometry {
  /** Size of the image as `drawImage(source, 0, 0)` draws it. */
  sourceWidth: number;
  sourceHeight: number;
  /** EXIF orientation still to be applied by US (1 when the browser already did). */
  orientation: number;
}

export interface PhotoDrawPlan {
  /** Output canvas size. */
  width: number;
  height: number;
  /** `setTransform` for a single `drawImage(source, 0, 0)`. */
  transform: Affine;
  /** Upright+rotated frame size (what the crop step displays). */
  frameWidth: number;
  frameHeight: number;
}

/**
 * THE GEOMETRY. Upright (EXIF) -> rotate -> crop -> scale, as one transform.
 *
 * `maxLongEdge` caps the OUTPUT's long edge; the output is never upscaled. The crop is
 * resolved in the upright+rotated frame — exactly the frame the crop step showed the
 * student — and the scale is taken from the CROP's long edge, so a student who keeps a
 * third of the page gets that third at full legibility.
 */
export function planPhotoDraw(
  geo: PhotoGeometry,
  opts: { crop?: CropFraction; rotation?: PhotoRotation; maxLongEdge: number },
): PhotoDrawPlan {
  const { sourceWidth: w, sourceHeight: h, orientation } = geo;
  const rotation = opts.rotation ?? 0;

  const exif = exifAffine(orientation, w, h);
  const uprightW = orientationSwapsAxes(orientation) ? h : w;
  const uprightH = orientationSwapsAxes(orientation) ? w : h;

  const rot = rotationAffine(rotation, uprightW, uprightH);
  const frameW = rotation === 90 || rotation === 270 ? uprightH : uprightW;
  const frameH = rotation === 90 || rotation === 270 ? uprightW : uprightH;

  const crop = opts.crop && !isFullFrameCrop(opts.crop)
    ? cropToPixels(opts.crop, frameW, frameH)
    : { sx: 0, sy: 0, sw: frameW, sh: frameH };

  const scale = Math.min(1, opts.maxLongEdge / Math.max(crop.sw, crop.sh));
  const width = Math.max(1, Math.round(crop.sw * scale));
  const height = Math.max(1, Math.round(crop.sh * scale));
  // Per-axis scale from the ROUNDED output, so the crop fills the canvas edge to edge.
  const kx = width / crop.sw;
  const ky = height / crop.sh;

  let m = composeAffine(rot, exif);
  m = composeAffine([1, 0, 0, 1, -crop.sx, -crop.sy], m);
  m = composeAffine([kx, 0, 0, ky, 0, 0], m);
  return { width, height, transform: m, frameWidth: frameW, frameHeight: frameH };
}

/** The long edge to render a photo at: 2,000 px, or the source's own if it is smaller. */
export function targetLongEdge(cropLongEdge: number): number {
  return Math.min(PHOTO_MAX_LONG_EDGE, Math.max(1, Math.round(cropLongEdge)));
}

// ── Base64 helpers ───────────────────────────────────────────────────────────────

/** Decoded byte count of a raw base64 string — the server's own estimate
 *  (mentorImageSupport.cjs `estimateBytesFromBase64`). */
export function base64ByteLength(b64: string): number {
  const clean = b64.trim();
  if (!clean) return 0;
  const pad = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - pad);
}

export function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

// ── Decode (the browser half) ───────────────────────────────────────────────────

/** A photo decoded ONCE, kept for the crop preview, the rotate button and the final
 *  encode — so the file is read and decoded a single time (FU-QR-CROP-DOUBLE-READ). */
export interface DecodedPhoto {
  file: File;
  source: CanvasImageSource;
  geometry: PhotoGeometry;
  /** EXIF orientation as stored in the file (before any browser handling). */
  fileOrientation: number;
  /** Release the decoded pixels. Safe to call twice. */
  release: () => void;
}

/**
 * Does this browser already apply EXIF orientation when it decodes an <img> (and when
 * it draws one onto a canvas)? Every evergreen engine has since 2020 (Chrome 81,
 * Safari 13.1 / iOS 13.4, Firefox 77 — CSS `image-orientation: from-image` is the
 * default). Older ones hand us the stored, sideways pixels, and WE must turn them.
 */
function browserAppliesExif(): boolean {
  try {
    return typeof CSS !== "undefined" && typeof CSS.supports === "function"
      ? CSS.supports("image-orientation", "from-image")
      : false;
  } catch {
    return false;
  }
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(PHOTO_UNREADABLE_MESSAGE));
    img.src = url;
  });
}

/**
 * Decode a picked image once. Throws (with words a student can act on) when this device
 * cannot decode it — callers fall back to the original file, never dead-end.
 */
export async function decodePhoto(file: File): Promise<DecodedPhoto> {
  if (file.type !== "image/jpeg" && file.type !== "image/png") {
    throw new Error("Please choose a JPG or PNG photo.");
  }
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new Error(PHOTO_UNREADABLE_MESSAGE);
  }

  let header: JpegHeaderInfo = { orientation: 1, width: null, height: null };
  if (file.type === "image/jpeg") {
    try {
      // The EXIF block lives in the first few KB; never read the whole photo for it.
      const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
      header = readJpegHeader(head);
    } catch {
      /* unreadable header -> treat as upright */
    }
  }

  const url = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImageElement(url);
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) {
    URL.revokeObjectURL(url);
    throw new Error(PHOTO_UNREADABLE_MESSAGE);
  }

  // Decide who turns the photo upright. For a quarter turn the answer is MEASURED: if
  // the decoded size is the stored size swapped, the browser already did it. For the
  // other orientations the size cannot tell, and the engine's documented default does.
  let browserDidIt: boolean;
  if (orientationSwapsAxes(header.orientation) && header.width && header.height) {
    browserDidIt = w === header.height && h === header.width && w !== h;
  } else {
    browserDidIt = browserAppliesExif();
  }

  let released = false;
  return {
    file,
    source: img,
    geometry: {
      sourceWidth: w,
      sourceHeight: h,
      orientation: browserDidIt ? 1 : header.orientation,
    },
    fileOrientation: header.orientation,
    release: () => {
      if (released) return;
      released = true;
      URL.revokeObjectURL(url);
    },
  };
}

// ── Render + encode ─────────────────────────────────────────────────────────────

/** Draw a decoded photo through a plan onto a fresh canvas. */
export function renderPhoto(photo: DecodedPhoto, plan: PhotoDrawPlan): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(PHOTO_UNREADABLE_MESSAGE);
  // White under the page: a PNG with transparency must not turn black as a JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, plan.width, plan.height);
  ctx.imageSmoothingEnabled = true;
  try {
    ctx.imageSmoothingQuality = "high";
  } catch {
    /* not supported everywhere */
  }
  ctx.setTransform(...plan.transform);
  ctx.drawImage(photo.source, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}

function canvasJpegBase64(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL("image/jpeg", quality).split(",")[1] || "";
}

export interface PhotoEncodeAttempt {
  longEdge: number;
  quality: number;
  bytes: number;
}

/**
 * The first-fit ladder, pure: given a way to encode at (long edge, quality), return the
 * first rung under `capBytes`. Tries every quality at the full long edge, then every
 * quality again at the 1,600 px floor — and never goes below the floor (unless the
 * source itself is smaller). Returns null when nothing fits.
 */
export function firstFitEncode<T extends { base64: string }>(
  longEdges: readonly number[],
  encode: (longEdge: number, quality: number) => T,
  capBytes: number,
  tried?: PhotoEncodeAttempt[],
): (T & { longEdge: number; quality: number }) | null {
  for (const longEdge of longEdges) {
    for (const quality of PHOTO_QUALITY_LADDER) {
      const out = encode(longEdge, quality);
      const bytes = base64ByteLength(out.base64);
      tried?.push({ longEdge, quality, bytes });
      if (bytes <= capBytes) return { ...out, longEdge, quality };
    }
  }
  return null;
}

/** The long edges the ladder may use for a crop whose own long edge is `cropLong`. */
export function ladderLongEdges(cropLong: number): number[] {
  const top = targetLongEdge(cropLong);
  if (top <= PHOTO_MIN_LONG_EDGE) return [top];
  return [top, PHOTO_MIN_LONG_EDGE];
}

export interface PreparePhotoOptions {
  crop?: CropFraction;
  rotation?: PhotoRotation;
  /** Decoded-byte ceiling for the output. Defaults to the photo target, which sits
   *  under the server's 3 MB image cap with headroom (uploadLimits.ts). */
  capBytes?: number;
}

export interface PreparedPhoto {
  /** Raw base64, no data: prefix — exactly what the grader request carries. */
  base64: string;
  mimeType: "image/jpeg" | "image/png";
  width: number;
  height: number;
  bytes: number;
  /** JPEG quality used (null when the original bytes were sent untouched). */
  quality: number | null;
  /** True when the original file was small, upright and uncropped and went as-is. */
  passthrough: boolean;
}

export class PhotoTooLargeError extends Error {
  constructor() {
    super(PHOTO_TOO_LARGE_MESSAGE);
    this.name = "PhotoTooLargeError";
  }
}

async function readFileBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  return bytesToBase64(buf);
}

/**
 * THE SHARED STEP. Image in, upload-ready image out — always under the cap, or a
 * PhotoTooLargeError whose message tells the student what to do.
 *
 * A small photo that is already upright, uncropped, unrotated, within 2,000 px and
 * under the cap goes AS-IS (unchanged behaviour for a small image, and a typed-text PNG
 * screenshot stays a PNG).
 */
export async function preparePhoto(
  input: File | DecodedPhoto,
  opts: PreparePhotoOptions = {},
): Promise<PreparedPhoto> {
  const capBytes = Math.min(opts.capBytes ?? PHOTO_TARGET_BYTES, MAX_UPLOAD_IMAGE_BYTES);
  const owned = input instanceof File ? await decodePhoto(input) : null;
  const photo = owned ?? (input as DecodedPhoto);
  try {
    const file = photo.file;
    const rotation = opts.rotation ?? 0;
    const cropped = Boolean(opts.crop && !isFullFrameCrop(opts.crop));
    const geo = photo.geometry;
    const longEdge = Math.max(geo.sourceWidth, geo.sourceHeight);

    if (
      !cropped &&
      rotation === 0 &&
      photo.fileOrientation === 1 &&
      longEdge <= PHOTO_MAX_LONG_EDGE &&
      file.size <= capBytes
    ) {
      return {
        base64: await readFileBase64(file),
        mimeType: file.type === "image/png" ? "image/png" : "image/jpeg",
        width: geo.sourceWidth,
        height: geo.sourceHeight,
        bytes: file.size,
        quality: null,
        passthrough: true,
      };
    }

    const probe = planPhotoDraw(geo, { crop: opts.crop, rotation, maxLongEdge: Number.MAX_SAFE_INTEGER });
    const cropLong = Math.max(probe.width, probe.height);
    let lastCanvasEdge = -1;
    let canvas: HTMLCanvasElement | null = null;
    let plan: PhotoDrawPlan | null = null;
    const result = firstFitEncode(
      ladderLongEdges(cropLong),
      (edge, quality) => {
        if (edge !== lastCanvasEdge || !canvas || !plan) {
          plan = planPhotoDraw(geo, { crop: opts.crop, rotation, maxLongEdge: edge });
          canvas = renderPhoto(photo, plan);
          lastCanvasEdge = edge;
        }
        return { base64: canvasJpegBase64(canvas, quality), width: plan.width, height: plan.height };
      },
      capBytes,
    );
    if (!result) throw new PhotoTooLargeError();
    return {
      base64: result.base64,
      mimeType: "image/jpeg",
      width: result.width,
      height: result.height,
      bytes: base64ByteLength(result.base64),
      quality: result.quality,
      passthrough: false,
    };
  } finally {
    owned?.release();
  }
}

/** A small, upright preview of the photo as the crop step will show it (rotated). */
export function renderPhotoPreview(
  photo: DecodedPhoto,
  rotation: PhotoRotation,
  maxLongEdge = 1200,
): { url: string; width: number; height: number } {
  const plan = planPhotoDraw(photo.geometry, { rotation, maxLongEdge });
  const canvas = renderPhoto(photo, plan);
  return { url: canvas.toDataURL("image/jpeg", 0.8), width: plan.width, height: plan.height };
}

/** A tiny thumbnail (for the page tray) of exactly what will be sent. */
export function renderPhotoThumb(
  photo: DecodedPhoto,
  opts: { crop?: CropFraction; rotation?: PhotoRotation },
  maxLongEdge = 240,
): string {
  const plan = planPhotoDraw(photo.geometry, { ...opts, maxLongEdge });
  return renderPhoto(photo, plan).toDataURL("image/jpeg", 0.7);
}

/** Turn a prepared photo back into a File, so the ONE guard (`checkUploadFile`) can
 *  run on what will actually be sent — compress BEFORE the size check (R2). */
export function preparedToFile(p: { base64: string; mimeType: string }, name: string): File {
  return new File([base64ToBytes(p.base64)], name, { type: p.mimeType });
}
