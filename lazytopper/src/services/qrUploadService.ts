// src/services/qrUploadService.ts
//
// Client half of the QR answer handoff: the desktop mints a slot and polls it;
// the phone checks the code is live and sends ONE photo.
//
// DELIVERY ONLY. Nothing here grades. The desktop drops the delivered image into
// the same state its file input fills, and the existing grade call runs unchanged.
//
// The two tokens are NOT interchangeable (see server/services/qrUploadChannel.cjs):
//   uploadToken — goes in the QR, write-only, the phone's capability
//   pickupToken — never leaves this browser, reads the slot once and destroys it
// Never put a pickupToken in a URL, a QR, or anything that leaves the desktop.

const API_BASE = "/api"; // same origin; Vercel rewrites /api/* to the Railway backend

// The single source of truth for what a student may send — shared with every upload
// affordance so the enforced number and the promised number can never diverge.
// See uploadLimits.ts for the base64 arithmetic that makes "5 MB" impossible.
import {
  MAX_UPLOAD_IMAGE_BYTES,
  MAX_UPLOAD_PDF_BYTES,
  formatUploadLimit,
} from "./uploadLimits";

/** Long edge to downscale a camera photo to. Comfortably legible handwriting at
 *  a fraction of a modern phone's 2-8MB full-res output. */
const TARGET_LONG_EDGE = 1600;

/**
 * A crop selection, held as NORMALISED FRACTIONS of the source image (0..1, origin
 * top-left) — never pixels.
 *
 * WHY FRACTIONS. The student drags on a CSS-scaled preview whose on-screen size differs
 * on every phone, so a pixel measured there means nothing against a 4000px original.
 * Fractions are resolution-independent: the same selection means the same region whether
 * it was drawn on a 360px Android or a 430px iPhone, and the conversion to source pixels
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

/**
 * ★ THE DEFAULT SELECTION IS THE WHOLE IMAGE (owner ruling Q2).
 * Crop is OPTIONAL and SKIPPABLE. A student who just wants to send the page confirms
 * this untouched and never thinks about cropping at all. Nothing in this module may
 * ever require a selection smaller than this.
 */
export const FULL_FRAME_CROP: CropFraction = { left: 0, top: 0, right: 1, bottom: 1 };

/** Smallest selection a drag may produce, as a fraction of each edge. A student who
 *  accidentally collapses the box to a sliver has no route back except reset, so the
 *  floor is enforced in the geometry rather than left to the UI. */
export const MIN_CROP_FRACTION = 0.1;

/** Tolerance for "the student did not really crop". A pointer drag of one or two
 *  pixels must not turn the skip path into a crop path, because the two behave
 *  differently downstream (see `isFullFrameCrop`'s callers). */
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

/** Is this selection still (effectively) the whole page? Drives BOTH the button's
 *  words and whether a crop is passed to `prepareQrImage` at all. */
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

/** Drag one corner. The OPPOSITE corner is the anchor and must not move — clamping the
 *  moving edge against it here (rather than leaving it to `clampCropFraction`) is what
 *  stops a hard inward drag from shoving the anchored edge outwards instead of stopping. */
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

/** Resolve a fractional selection into a source rectangle in the image's own pixels,
 *  ready for the 9-argument `drawImage`. */
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

/**
 * Read a picked file to a data URL so the crop step can SHOW the photo before it is
 * prepared. Exported only for that: the crop UI cannot ask a student to choose part of
 * an image it has not displayed. Deliberately does NOT decode the image — the crop is
 * expressed in fractions, so the page never needs the natural dimensions, and a second
 * full decode of an 8MB photo is real cost on the cheap Android most students carry.
 */
export async function readQrPreviewUrl(file: File): Promise<string> {
  return readAsDataUrl(file);
}

/**
 * What the HOST SURFACE wants — decides the words on BOTH the desktop affordance and
 * the phone page, and whether the phone defaults to the camera.
 *
 *   "document" — Chapter Test / Full Mock / Worksheet: ONE multi-page PDF of a paper.
 *                One photo is ONE page, so camera-first copy here misleads.
 *   "photo"    — a single handwritten answer, where one photo IS the whole answer.
 *   "question" — the C&I QUESTION-side handoff: a saved/screenshotted QUESTION paper.
 *                Same file types as "document" (PDF or photo) but question-voice copy —
 *                a student sending a QUESTION must never read "your answers".
 *
 * The value is MINTED, PERSISTED and ROUND-TRIPPED through the server
 * (server/services/qrUploadChannel.cjs validates it against its own allowlist), so a new
 * value must be added THERE too or it is silently coerced back to "document" on the wire.
 */
export type QrHandoffMode = "document" | "photo" | "question";

export interface QrSlot {
  uploadToken: string;
  pickupToken: string;
  expiresAt: number;
  variant: QrHandoffMode;
}

export interface QrImagePayload {
  imageBase64: string;
  imageMimeType: string;
}

export type QrPickupResult =
  | { status: "waiting" }
  | { status: "ready"; imageBase64: string; imageMimeType: string }
  | { status: "expired" }
  | { status: "unavailable" };

export type QrSlotState = "pending" | "used" | "expired" | "unavailable";

/**
 * The URL encoded into the QR. Uses BASE_URL (vite `base: "/app/"`) because the
 * router's basename is derived from it — hardcoding "/app/" here would rot if the
 * base ever changed. Resolves to e.g. https://lazytopper.com/app/u/<uploadToken>
 */
export function buildQrUploadUrl(uploadToken: string): string {
  const base = String(import.meta.env.BASE_URL || "/");
  const origin = window.location.origin;
  return `${origin}${base.endsWith("/") ? base : `${base}/`}u/${uploadToken}`;
}

/**
 * Mint a slot. Requires a signed-in desktop student: every slot is tied to a real
 * uid so caps are per-UID (an IP cap would throttle a whole school behind one NAT).
 */
export async function mintQrSlot(idToken: string, mode: QrHandoffMode): Promise<QrSlot | null> {
  try {
    const res = await fetch(`${API_BASE}/qr-upload/new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      // The host's shape travels with the slot, so the phone can lead with the right
      // words — it is reached by token alone and cannot otherwise know.
      body: JSON.stringify({ variant: mode }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok || !data.uploadToken || !data.pickupToken) return null;
    return {
      uploadToken: String(data.uploadToken),
      pickupToken: String(data.pickupToken),
      expiresAt: Number(data.expiresAt) || 0,
      variant:
        data.variant === "photo" ? "photo" : data.variant === "question" ? "question" : "document",
    };
  } catch {
    return null;
  }
}

/** Phone-side liveness check, so an expired code is reported BEFORE the student
 *  photographs several MB. Returns no student content — only liveness and which
 *  words to lead with. */
export async function peekQrSlot(
  uploadToken: string,
): Promise<{ state: QrSlotState; mode: QrHandoffMode }> {
  try {
    const res = await fetch(`${API_BASE}/qr-upload/${encodeURIComponent(uploadToken)}/status`);
    const data = await res.json().catch(() => null);
    // Absent/unknown -> "document": the safer wording (it never tells a student that
    // one photo is enough when the paper needs a PDF). "question" is an explicit branch —
    // the server persists it, so it must survive the read-back or the phone shows answer copy.
    const mode: QrHandoffMode =
      data?.variant === "photo" ? "photo" : data?.variant === "question" ? "question" : "document";
    if (res.status === 503) return { state: "unavailable", mode };
    if (!res.ok) return { state: data?.reason === "used" ? "used" : "expired", mode };
    return { state: data?.state === "pending" ? "pending" : "used", mode };
  } catch {
    return { state: "expired", mode: "document" };
  }
}

/** Phone-side send. Token-as-capability — no login on this device, by design. */
export async function sendQrImage(
  uploadToken: string,
  payload: QrImagePayload,
): Promise<{ ok: true } | { ok: false; reason: QrSlotState | "invalid"; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/qr-upload/${encodeURIComponent(uploadToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return { ok: true };
    if (res.status === 503) return { ok: false, reason: "unavailable" };
    const data = await res.json().catch(() => null);
    const reason = data?.reason === "used" ? "used" : data?.reason === "invalid" ? "invalid" : "expired";
    return { ok: false, reason, error: data?.error ? String(data.error) : undefined };
  } catch {
    return { ok: false, reason: "expired" };
  }
}

/** Desktop-side poll. A successful 'ready' DESTROYS the slot server-side, so this
 *  must only be called by the surface that will actually consume the image. */
export async function pollQrPickup(pickupToken: string): Promise<QrPickupResult> {
  try {
    const res = await fetch(`${API_BASE}/qr-upload/pickup/${encodeURIComponent(pickupToken)}`);
    if (res.status === 503) return { status: "unavailable" };
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return { status: "expired" };
    if (data.status === "ready" && data.imageBase64) {
      return {
        status: "ready",
        imageBase64: String(data.imageBase64),
        imageMimeType: String(data.imageMimeType || "image/jpeg"),
      };
    }
    return { status: "waiting" };
  } catch {
    // A transient network blip must not be reported as expiry — the caller keeps
    // waiting and the real TTL decides. Never a fake success, never a false death.
    return { status: "waiting" };
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file is not a readable image."));
    img.src = dataUrl;
  });
}

/**
 * Prepare a camera photo for sending. This is REQUIRED, not cosmetic: a modern
 * phone emits 2-8MB JPEGs, the server rejects anything over 3MB decoded, and the
 * request body itself is capped at 5MB. Un-resized, a real photo would simply fail.
 *
 * Downscales to TARGET_LONG_EDGE and steps quality down until it fits, so the
 * student never has to think about file size.
 *
 * `crop` is OPTIONAL (owner ruling Q2). Omitted — which is what the skip path passes —
 * this behaves exactly as it did before the crop step existed.
 */
export async function prepareQrImage(file: File, crop?: CropFraction): Promise<QrImagePayload> {
  if (file.type === "application/pdf") {
    // A PDF CANNOT be downscaled — there is no canvas for it. So this is a hard wall,
    // and it must be refused HERE, on the phone, while the student is still holding it
    // — never after they have walked back to the laptop believing they are done.
    // A PDF is also the one thing a crop cannot apply to, for the same reason it cannot
    // be downscaled: there is no canvas. `crop` is ignored here rather than refused —
    // the phone page never offers the crop step for a PDF in the first place.
    if (file.size > MAX_UPLOAD_PDF_BYTES) {
      throw new Error(
        `That PDF is ${formatUploadLimit(file.size)} — the limit is ${formatUploadLimit(MAX_UPLOAD_PDF_BYTES)}. ` +
          `Try scanning at a lower quality, or split it into two.`,
      );
    }
    const dataUrl = await readAsDataUrl(file);
    return { imageBase64: dataUrl.split(",")[1] || "", imageMimeType: "application/pdf" };
  }

  if (file.type !== "image/jpeg" && file.type !== "image/png") {
    throw new Error("Please send a photo (JPG or PNG) or a PDF.");
  }

  const img = await loadImage(await readAsDataUrl(file));

  // ★ CROP BEFORE COMPRESS (owner ruling Q3), and the order is not arbitrary.
  //
  // The source rectangle is resolved HERE — ahead of the downscale, ahead of the
  // quality ladder below. The ladder is FIRST-FIT (it returns on the first rung that
  // fits), so starting from fewer pixels means it begins smaller and, in the common
  // case, never steps down at all. Compress-then-crop would spend the quality budget
  // on pixels the student had already thrown away.
  //
  // The scale is taken from the CROP's long edge, not the photo's: a student who keeps
  // one third of a page gets that third rendered at up to TARGET_LONG_EDGE, which is
  // the resolution the grader actually reads the handwriting at.
  const source = crop
    ? cropToPixels(crop, img.width, img.height)
    : { sx: 0, sy: 0, sw: img.width, sh: img.height };

  const scale = Math.min(1, TARGET_LONG_EDGE / Math.max(source.sw, source.sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.sw * scale));
  canvas.height = Math.max(1, Math.round(source.sh * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that photo on this device.");
  ctx.drawImage(img, source.sx, source.sy, source.sw, source.sh, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.82, 0.7, 0.6, 0.5]) {
    const encoded = canvas.toDataURL("image/jpeg", quality).split(",")[1] || "";
    // base64 -> decoded byte estimate, mirroring the server's own check
    // (mentorImageSupport.cjs rejects on `> maxBytes`, so `<=` is the exact boundary).
    if (Math.floor((encoded.length * 3) / 4) <= MAX_UPLOAD_IMAGE_BYTES) {
      return { imageBase64: encoded, imageMimeType: "image/jpeg" };
    }
  }
  throw new Error("That photo is too large to send. Try again with less of the page in frame.");
}
