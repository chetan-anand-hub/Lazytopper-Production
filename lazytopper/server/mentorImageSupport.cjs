const MAX_MENTOR_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const DATA_URL_PREFIX_RE = /^data:/i;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function hasOwn(obj, key) {
  return Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, key);
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

  const estimatedBytes = estimateBytesFromBase64(base64);
  if (estimatedBytes <= 0) {
    return { ok: false, error: "Image base64 is malformed." };
  }
  if (estimatedBytes > MAX_MENTOR_IMAGE_BYTES) {
    return { ok: false, error: "Image is too large. Max size is 3 MB." };
  }

  let decoded;
  try {
    decoded = Buffer.from(base64, "base64");
  } catch {
    return { ok: false, error: "Image base64 is malformed." };
  }

  if (!decoded || !decoded.length) {
    return { ok: false, error: "Image base64 is malformed." };
  }
  if (decoded.length > MAX_MENTOR_IMAGE_BYTES) {
    return { ok: false, error: "Image is too large. Max size is 3 MB." };
  }

  const normalizedInput = base64.replace(/=+$/g, "");
  const normalizedDecoded = decoded.toString("base64").replace(/=+$/g, "");
  if (normalizedInput !== normalizedDecoded) {
    return { ok: false, error: "Image base64 is malformed." };
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
};