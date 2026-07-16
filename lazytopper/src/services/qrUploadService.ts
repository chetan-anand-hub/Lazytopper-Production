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
 * What the HOST SURFACE wants — decides the words on BOTH the desktop affordance and
 * the phone page, and whether the phone defaults to the camera.
 *
 *   "document" — Chapter Test / Full Mock / Worksheet: ONE multi-page PDF of a paper.
 *                One photo is ONE page, so camera-first copy here misleads.
 *   "photo"    — a single handwritten answer, where one photo IS the whole answer.
 */
export type QrHandoffMode = "document" | "photo";

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
      variant: data.variant === "photo" ? "photo" : "document",
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
    // one photo is enough when the paper needs a PDF).
    const mode: QrHandoffMode = data?.variant === "photo" ? "photo" : "document";
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
 */
export async function prepareQrImage(file: File): Promise<QrImagePayload> {
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

  const img = await loadImage(await readAsDataUrl(file));
  const scale = Math.min(1, TARGET_LONG_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that photo on this device.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

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
