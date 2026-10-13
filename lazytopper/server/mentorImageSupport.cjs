const MAX_MENTOR_IMAGE_BYTES = 3 * 1024 * 1024;
// UPLOAD-READ-1 PR-B (D138): the ONE PDF ceiling, 7 MB raw, for question AND answer/solution uploads on every
// file route. Mirrors `MAX_UPLOAD_PDF_BYTES` in src/services/uploadLimits.ts (pinned equal by a test).
const MAX_MENTOR_PDF_BYTES = 7 * 1024 * 1024;
// UPLOAD-READ-1 PR-B: the largest request BODY that reaches the app at all. MEASURED against production
// on 13 Oct (POSTs of 'A' bytes to www /api/health): exactly 10,485,760 bytes (10 MiB) is answered by the
// app (400), 10,485,761 gets 413 from the edge in front of it. A PDF rides as base64 (raw x 4/3) inside a JSON
// body with the questions payload, so an 8 MB PDF (11.18 MB of base64) can never arrive; 7 MB (9.79 MB) can,
// with ~0.6 MB to spare. The file routes read their body with this cap; every other route keeps the 5 MB default.
const FILE_ROUTE_MAX_BODY_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const DATA_URL_PREFIX_RE = /^data:/i;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function hasOwn(obj, key) {
  return Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, key);
}

/** "7 MB" / "3 MB" / "3.5 MB": whole numbers stay whole, halves keep one decimal (same as the client's formatUploadLimit). */
function formatLimitMb(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

function estimateBytesFromBase64(b64) {
  const clean = String(b64 || "").trim();
  if (!clean) return 0;
  const paddingMatch = clean.match(/=+$/);
  const padding = paddingMatch ? paddingMatch[0].length : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function validateMentorImagePayload(payload) {
  const hasImageFields =
    hasOwn(payload, "imageBase64") ||
    hasOwn(payload, "imageMimeType") ||
    hasOwn(payload, "imageName");

  if (!hasImageFields) {
    return { ok: false, error: "NO_IMAGE" };
  }

  const mimeType = String(payload?.imageMimeType || "").trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: "Only JPG and PNG images are allowed." };
  }

  const base64 = String(payload?.imageBase64 || "").trim();
  if (!base64) {
    return { ok: false, error: "Image data is empty." };
  }
  if (DATA_URL_PREFIX_RE.test(base64) || /;base64,/i.test(base64)) {
    return { ok: false, error: "Send raw base64 only, without a data URL prefix." };
  }
  if (/\s/.test(base64)) {
    return { ok: false, error: "Image base64 is malformed." };
  }
  if (base64.length % 4 !== 0 || !BASE64_RE.test(base64)) {
    return { ok: false, error: "Image base64 is malformed." };
  }

  const isPdf = mimeType === "application/pdf";
  const maxBytes = isPdf ? MAX_MENTOR_PDF_BYTES : MAX_MENTOR_IMAGE_BYTES;

  const estimatedBytes = estimateBytesFromBase64(base64);
  if (estimatedBytes <= 0) {
    return { ok: false, error: isPdf ? "PDF data is malformed." : "Image base64 is malformed." };
  }
  if (estimatedBytes > maxBytes) {
    return { ok: false, error: isPdf ? `PDF is too large. Max size is ${formatLimitMb(MAX_MENTOR_PDF_BYTES)}.` : "Image is too large. Max size is 3 MB." };
  }

  let decoded;
  try {
    decoded = Buffer.from(base64, "base64");
  } catch {
    return { ok: false, error: isPdf ? "PDF data is malformed." : "Image base64 is malformed." };
  }

  if (!decoded || !decoded.length) {
    return { ok: false, error: isPdf ? "PDF data is malformed." : "Image base64 is malformed." };
  }
  if (decoded.length > maxBytes) {
    return { ok: false, error: isPdf ? `PDF is too large. Max size is ${formatLimitMb(MAX_MENTOR_PDF_BYTES)}.` : "Image is too large. Max size is 3 MB." };
  }

  // For PDFs, skip the round-trip normalisation check (binary data can differ slightly)
  if (!isPdf) {
    const normalizedInput = base64.replace(/=+$/g, "");
    const normalizedDecoded = decoded.toString("base64").replace(/=+$/g, "");
    if (normalizedInput !== normalizedDecoded) {
      return { ok: false, error: "Image base64 is malformed." };
    }
  }

  return { ok: true, mimeType, base64 };
}

function buildGeminiImagePart({ mimeType, base64 }) {
  return {
    inline_data: {
      mime_type: mimeType,
      data: base64,
    },
  };
}

module.exports = {
  estimateBytesFromBase64,
  validateMentorImagePayload,
  buildGeminiImagePart,
  MAX_MENTOR_IMAGE_BYTES,
  MAX_MENTOR_PDF_BYTES,
  FILE_ROUTE_MAX_BODY_BYTES,
  formatLimitMb,
};