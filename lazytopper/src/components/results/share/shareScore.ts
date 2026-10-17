import { whatsAppShareUrl } from "./shareCardModel";

/**
 * SHARE-SCORE-1 - the share flow, browser-API side, with every browser object injected so
 * the choice is testable.
 *
 *   native         navigator.canShare({ files }) -> navigator.share({ files: [png], text })
 *                  (Android / iOS: the OS sheet - WhatsApp status, groups, parents)
 *   whatsapp_link  desktop: the PNG is downloaded and wa.me opens with the text + link
 */

export type ShareMethod = "native" | "whatsapp_link";
export type NativeShareOutcome = "shared" | "cancelled" | "needs-tap" | "failed";

export interface ShareNavigator {
  canShare?: (data: { files?: File[]; text?: string }) => boolean;
  share?: (data: { files?: File[]; text?: string }) => Promise<void>;
}

export const SHARE_FILENAME = "lazytopper-score.png";

/** Native only when the browser says it can share THIS file; anything doubtful -> link. */
export function pickShareMethod(nav: ShareNavigator | undefined, file: File): ShareMethod {
  try {
    if (nav && typeof nav.canShare === "function" && typeof nav.share === "function" && nav.canShare({ files: [file] })) {
      return "native";
    }
  } catch {
    /* a throwing canShare means no */
  }
  return "whatsapp_link";
}

function errorName(e: unknown): string {
  return e && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "";
}

/**
 * Open the OS share sheet with the PNG. A dismissed sheet is a cancel. NotAllowedError means
 * the tap's user activation expired while the image was drawn: the caller keeps the image and
 * asks for one more tap (a fresh activation), never a silent failure.
 */
export async function shareNative(nav: ShareNavigator, file: File, text: string): Promise<NativeShareOutcome> {
  if (typeof nav.share !== "function") return "failed";
  try {
    await nav.share({ files: [file], text });
    return "shared";
  } catch (e) {
    const name = errorName(e);
    if (name === "AbortError") return "cancelled";
    if (name === "NotAllowedError") return "needs-tap";
    return "failed";
  }
}

type OpenFn = (url: string, target: string, features: string) => unknown;

/** Open wa.me with the text pre-filled, in a new tab. */
export function openWhatsAppLink(text: string, open: OpenFn): void {
  open(whatsAppShareUrl(text), "_blank", "noopener,noreferrer");
}

/** Save the PNG on desktop (an object-URL anchor; revoked straight after). */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
