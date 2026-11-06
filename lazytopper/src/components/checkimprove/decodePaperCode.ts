/**
 * GRADE-ROUTE-2 (B3) - read the small QR printed in the footer of our worksheet / Chapter Test / Full Mock sheets from a
 * photo or scan, in the browser, so the Answer Checker can match it to the student's own paper (same ownership check as
 * GRADE-ROUTE-1). No model call, no network, nothing leaves the device.
 *
 * ENGINES (both lazy: nothing here is in the entry chunk, and jsQR is fetched only if the native detector is missing or
 * finds nothing):
 *   1. the browser's native `BarcodeDetector` (Chrome / Android), when present;
 *   2. jsQR (pure JS) on the decoded pixels, at two sizes (<= 1600 px and <= 1000 px wide: a smaller copy often reads
 *      a noisy full-size photo).
 * Any failure (not an image, decode error, no QR) resolves null: the Answer Checker is unchanged.
 */
export type ImageInput = Blob | { base64: string | null | undefined; mime: string | null | undefined };

const SIZES = [1600, 1000];

function toBlob(input: ImageInput): Blob | null {
  if (typeof Blob !== "undefined" && input instanceof Blob) return input.type.startsWith("image/") ? input : null;
  const { base64, mime } = input as { base64?: string | null; mime?: string | null };
  if (!base64 || !mime || !mime.startsWith("image/")) return null;
  try {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

/** jsQR on raw RGBA pixels. Exported for tests. */
export async function decodeQrFromPixels(data: Uint8ClampedArray, width: number, height: number): Promise<string | null> {
  const { default: jsQR } = await import("jsqr");
  const r = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  return r && typeof r.data === "string" && r.data ? r.data : null;
}

type NativeDetector = { detect: (src: ImageBitmap) => Promise<Array<{ rawValue?: string }>> };

async function nativeDecode(bitmap: ImageBitmap): Promise<string | null> {
  const Ctor = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => NativeDetector }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const found = await new Ctor({ formats: ["qr_code"] }).detect(bitmap);
    return found.map((f) => f.rawValue).find((v): v is string => typeof v === "string" && v.length > 0) ?? null;
  } catch {
    return null;
  }
}

export async function decodePaperCodeFromImage(input: ImageInput): Promise<string | null> {
  try {
    const blob = toBlob(input);
    if (!blob || typeof createImageBitmap !== "function") return null;
    const bitmap = await createImageBitmap(blob);
    try {
      const native = await nativeDecode(bitmap);
      if (native) return native;
      for (const maxW of SIZES) {
        const scale = Math.min(1, maxW / bitmap.width);
        const w = Math.max(1, Math.round(bitmap.width * scale));
        const h = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0, w, h);
        const hit = await decodeQrFromPixels(ctx.getImageData(0, 0, w, h).data, w, h);
        if (hit) return hit;
      }
      return null;
    } finally {
      bitmap.close?.();
    }
  } catch {
    return null;
  }
}
