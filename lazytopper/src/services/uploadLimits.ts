// src/services/uploadLimits.ts
//
// THE ONE PLACE answer-upload size limits are defined — for every surface and every
// path (desktop file picker, QR phone handoff), so the number and the words a student
// reads can never drift apart again.
//
// ── WHY THESE NUMBERS, AND WHY "5 MB" WAS ALWAYS FALSE ───────────────────────────
// An upload does not travel as bytes. It travels as base64 inside a JSON body, and
// base64 inflates by ~4/3. The grade request also carries the whole questions array
// alongside the image. The backend caps the WHOLE body at 5 MB
// (`server/services/httpUtils.cjs` readJson, default maxBytes = 5 * 1024 * 1024) and
// on excess it destroys the request: "Request body too large".
//
//   a 5.00 MB PDF -> 6.67 MB of base64  ->  ALREADY over a 5 MB body cap, alone.
//
// So the old "PDF up to 5 MB" was arithmetically unspendable on EVERY path. A student
// who attached a 4-5 MB PDF passed the picker's check and then died at the grader —
// the exact "uploaded, then dead" failure the product forbids. This was live on the
// desktop path long before the QR handoff existed.
//
// MEASURED (against the assembled 8,584-row bank, transpile-then-require — not a text
// scan): the questions array is small — 0.10 MB for the heaviest 38-question draw,
// median row ~1,005 bytes. That puts the true ceiling at ~3.68 MB of raw file.
//
//   3.50 MB PDF -> 4.67 MB base64 + 0.10 MB questions = 4.76 MB  ✅ fits, ~0.5 MB spare
//
// 3.5 MB is therefore the honest PDF ceiling, with headroom left deliberately: the
// questions payload varies per paper and must never be the thing that silently pushes
// a real student over. `scripts/ops/qr_upload_channel_acceptance.mjs` asserts this
// arithmetic on every PR — if someone raises these, the matrix goes red rather than
// students hitting a wall at the grader.
//
// The server keeps its own, looser backstop (mentorImageSupport.cjs: 5 MB PDF / 3 MB
// image). That is deliberate and is NOT the contract: it is a last-ditch guard the
// client never reaches. The limits below are what the product promises, and what the
// copy must say.

/** The image ceiling the SERVER enforces (mentorImageSupport.cjs, 3 MB decoded).
 *
 *  UPLOAD-2 made the old comment here true. It used to claim images "are downscaled to
 *  fit this" — false on every direct path (Check & Improve, SolutionChecker, worksheet
 *  and Chapter Test / Full Mock grading), which checked the size FIRST and refused any
 *  phone photo over 3 MB. Now every photo goes through `preparePhoto` (the one shared
 *  step: upright, crop, rotate, downscale to a 2,000 px long edge, JPEG ladder) BEFORE
 *  `checkUploadFile` runs, so a photo is compressed to PHOTO_TARGET_BYTES and a student
 *  never meets this number. [FU-UPLOAD-LIMIT-COMMENT-FALSE] */
export const MAX_UPLOAD_IMAGE_BYTES = 3 * 1024 * 1024;

/** What `preparePhoto` compresses a photo to: the image ceiling less 0.5 MB of
 *  headroom, so a compressed photo is never the thing that brushes the server cap. */
export const PHOTO_TARGET_BYTES = 2.5 * 1024 * 1024;

/** A PDF CANNOT be downscaled the way an image can (there is no canvas for it), so this
 *  IS a wall — and it must therefore be enforced early and refused honestly, in the
 *  picker or on the phone, never after the student believes they are done. */
export const MAX_UPLOAD_PDF_BYTES = 3.5 * 1024 * 1024;

/** Several photos of one answer are assembled ON THE DEVICE into one PDF (UPLOAD-2 R6).
 *  The assembled PDF aims under this — the PDF ceiling less 0.3 MB of headroom — so a
 *  photo-built PDF never lands on the wall that a scanned PDF is refused at. */
export const PAGES_PDF_TARGET_BYTES = 3.2 * 1024 * 1024;

/** At most this many photos make one upload (R6). */
export const MAX_UPLOAD_PAGES = 8;

/** What a student reads when they try to add a 9th page. */
export const TOO_MANY_PAGES_MESSAGE = "That's a lot — check these 8 first, then the rest";

/** Copy helper — so every surface says the same number as the constant it enforces.
 *  Whole numbers stay whole ("3 MB"), halves keep one decimal ("3.5 MB"). */
export function formatUploadLimit(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

/** The one sentence describing what a student may send. Used by every upload
 *  affordance so the promise is identical everywhere.
 *
 *  NOUN — "image", not "photo" (D4, 2026-07-17). A student can send a screenshot, a
 *  scan, or an exported page; "photo" told them to point a camera at it, which is
 *  wrong for three of those four and needlessly narrow. The noun changes HERE rather
 *  than per-surface precisely because this file's mandate is that the number and the
 *  words a student reads can never drift apart — and a noun is part of the promise.
 *  This is one line and it propagates to every surface that renders the sentence
 *  (WorksheetGradePanel, SolutionChecker, ChapterTestUploadPanel), which is the point. */
export const UPLOAD_LIMIT_SENTENCE = `PDF up to ${formatUploadLimit(MAX_UPLOAD_PDF_BYTES)} · or a JPG/PNG image up to ${formatUploadLimit(MAX_UPLOAD_IMAGE_BYTES)}`;

// ── THE PICKER GUARD ─────────────────────────────────────────────────────────────
//
// The server accepts EXACTLY {image/jpeg, image/png, application/pdf}
// (`server/mentorImageSupport.cjs` ALLOWED_MIME_TYPES) and caps the body at 5 MB.
// Every picker in the product must therefore refuse the same two things — a wrong
// TYPE and an oversized FILE — *before* the student believes they are done.
//
// This lives here rather than inline at each call site because this file's whole
// mandate is that "the number and the words a student reads can never drift apart".
// A guard copy-pasted per surface is exactly how they drift. (The repo already
// carries [FU-STEPMARKCHIP-EXTRACTION] as the standing lament for that pattern.)
//
// UPLOAD-2 converged the copies: ChapterTestUploadPanel, WorksheetGradePanel and
// SolutionChecker used to inline their own walls. Every picker now runs a photo
// through `preparePhoto` FIRST and then this ONE guard on what will actually be sent
// (components/upload/PageTray.tsx `usePageTray`). [FU-UPLOAD-GUARD-CONVERGE]

/** What the student is being asked for. **REQUIRED, no default** — deliberately
 *  mirroring `QrAnswerHandoff`'s `mode` contract, and for the same reason: a host
 *  that silently inherits the wrong noun tells a student to photograph the wrong
 *  thing. "answers" = their written working; "question" = the printed question. */
export type UploadSubject = "answers" | "question";

export type UploadCheck =
  | { ok: true; isPdf: boolean; mimeType: "image/jpeg" | "image/png" | "application/pdf" }
  | { ok: false; message: string };

/**
 * Refuse — honestly, at the picker — anything the grader would reject anyway.
 *
 * Both refusals name what is wrong AND what to do about it. That is the whole point:
 * a student who cannot act on a refusal has been told "no" twice (once here, once by
 * the grader) and helped zero times.
 *
 * The picker's own `accept` attribute is a HINT, not a guard — every OS file dialog
 * offers an "All files" escape, and `accept="image/*"` matches WEBP/GIF/BMP that the
 * server does not take. So this check must exist independently of `accept`.
 */
export function checkUploadFile(file: File, subject: UploadSubject): UploadCheck {
  const isPdf = file.type === "application/pdf";
  const isImage = file.type === "image/jpeg" || file.type === "image/png";

  if (!isPdf && !isImage) {
    return {
      ok: false,
      message:
        subject === "answers"
          ? "Upload a PDF (recommended) or a JPG/PNG image of your answers."
          : "Upload a JPG/PNG image of your question, or a PDF.",
    };
  }

  const max = isPdf ? MAX_UPLOAD_PDF_BYTES : MAX_UPLOAD_IMAGE_BYTES;
  if (file.size > max) {
    // A photo reaches this only when the device could not compress it (preparePhoto
    // runs first everywhere) — so say what to DO with a camera, not with a scanner.
    return {
      ok: false,
      message: isPdf
        ? `That file is ${formatUploadLimit(file.size)} — the limit is ${formatUploadLimit(max)}. ` +
          `Try scanning at a lower quality, or split it into two.`
        : `That photo is ${formatUploadLimit(file.size)} and couldn't be shrunk on this device. ` +
          `Try a closer photo of just your answer.`,
    };
  }

  return {
    ok: true,
    isPdf,
    mimeType: isPdf ? "application/pdf" : file.type === "image/png" ? "image/png" : "image/jpeg",
  };
}
