import type { MentorImageMimeType } from "../types/mentor";

export type MentorImageAttachment = {
  base64: string;
  mimeType: MentorImageMimeType;
  name: string;
  previewUrl: string;
};

export const MAX_MENTOR_IMAGE_BYTES = 3 * 1024 * 1024;

function extensionToMimeType(name: string): MentorImageMimeType | null {
  const trimmed = String(name || "").trim().toLowerCase();
  if (trimmed.endsWith(".png")) return "image/png";
  if (trimmed.endsWith(".jpg") || trimmed.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

function resolveMentorImageMimeType(file: File): MentorImageMimeType | null {
  if (file.type === "image/png" || file.type === "image/jpeg") {
    return file.type;
  }
  return extensionToMimeType(file.name);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read that image. Please try another JPG or PNG."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read that image. Please try another JPG or PNG."));
    reader.readAsDataURL(file);
  });
}

export function revokeMentorImagePreview(previewUrl?: string | null) {
  if (!previewUrl || typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") {
    return;
  }
  URL.revokeObjectURL(previewUrl);
}

export async function createMentorImageAttachment(file: File): Promise<MentorImageAttachment> {
  const mimeType = resolveMentorImageMimeType(file);
  if (!mimeType) {
    throw new Error("Only JPG and PNG files are allowed.");
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error("The selected image is empty.");
  }
  if (file.size > MAX_MENTOR_IMAGE_BYTES) {
    throw new Error("Image is too large. Use JPG or PNG up to 3 MB.");
  }

  const previewUrl =
    typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
      ? URL.createObjectURL(file)
      : "";
  try {
    const dataUrl = await readFileAsDataUrl(file);
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error("Could not read that image. Please try another JPG or PNG.");
    }
    const rawBase64 = String(match[2] || "").trim();
    if (!rawBase64) {
      throw new Error("Could not read that image. Please try another JPG or PNG.");
    }
    return {
      base64: rawBase64,
      mimeType,
      name: String(file.name || "solution-image").trim() || "solution-image",
      previewUrl,
    };
  } catch (error) {
    revokeMentorImagePreview(previewUrl);
    throw error instanceof Error
      ? error
      : new Error("Could not read that image. Please try another JPG or PNG.");
  }
}

export function getMentorImageErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "Could not read that image. Use JPG or PNG up to 3 MB.";
}