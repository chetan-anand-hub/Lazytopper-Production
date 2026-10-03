// src/services/qrUploadService.ts
//
// Client half of the QR answer handoff: the desktop mints a slot and polls it;
// the phone checks the code is live and sends ONE file (a photo, or — since UPLOAD-2
// R8 — several photos assembled on the phone into ONE PDF).
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
import { MAX_UPLOAD_PDF_BYTES, formatUploadLimit } from "./uploadLimits";

// The crop geometry and the compressor moved to the ONE shared photo step
// (preparePhoto.ts, UPLOAD-2 R1). Re-exported here so every existing import of the
// QR module keeps working — there is one implementation, not two.
import { preparePhoto, type CropFraction } from "./preparePhoto";
export {
  FULL_FRAME_CROP,
  MIN_CROP_FRACTION,
  clampCropFraction,
  cropToPixels,
  isFullFrameCrop,
  moveCropFraction,
  resizeCropFraction,
  type CropFraction,
  type CropHandle,
} from "./preparePhoto";

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
): Promise<{ ok: true } | { ok: false; reason: QrSlotState | "invalid" | "offline"; error?: string }> {
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
    // The request never reached the server (a network drop). NOT an expiry: the slot is
    // probably still alive, and the phone keeps its pages so a retry costs one tap.
    return { ok: false, reason: "offline" };
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

/**
 * Prepare a file for sending from the phone. A thin call into the shared step: a photo
 * goes through `preparePhoto` (upright, crop, downscale to a 2,000 px long edge, JPEG
 * ladder — always under the cap), a PDF through the hard wall it has always had.
 *
 * `crop` is OPTIONAL (owner ruling Q2). Omitted — the skip path — the whole photo goes.
 */
export async function prepareQrImage(file: File, crop?: CropFraction): Promise<QrImagePayload> {
  if (file.type === "application/pdf") {
    // A PDF CANNOT be downscaled — there is no canvas for it. So this is a hard wall,
    // and it must be refused HERE, on the phone, while the student is still holding it
    // — never after they have walked back to the laptop believing they are done.
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

  const prepared = await preparePhoto(file, { crop });
  return { imageBase64: prepared.base64, imageMimeType: prepared.mimeType };
}
