import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import {
  EDGE_MAX_BODY_BYTES,
  MAX_UPLOAD_IMAGE_BYTES,
  MAX_UPLOAD_PDF_BYTES,
  NON_FILE_PAYLOAD_ALLOWANCE_BYTES,
  UPLOAD_LIMIT_SENTENCE,
  checkUploadFile,
  formatUploadLimit,
} from "./uploadLimits";

/**
 * UPLOAD-READ-1 PR-B (D138) — the PDF ceiling must always FIT the wall that stands in front of the app.
 *
 * ★ THE WALL IS MEASURED, NOT ASSUMED. On 13 Oct 2026 POSTs of 'A' bytes to www /api/health (a route that never
 * reads its body) were answered by the app up to exactly 10,485,760 bytes (10 MiB) and refused with 413 by the
 * edge at 10,485,761. A PDF travels as base64 (raw x 4/3) inside a JSON body with the questions payload, so a
 * ceiling that does not fit under 10 MiB is a promise the product cannot keep: a student passes the picker and
 * then dies at the edge with an opaque 413. An 8 MB ceiling was asked for and is arithmetically impossible
 * (11.18 MB of base64). This file fails the build if anyone raises the ceiling past what fits.
 *
 * CONTROLS: the same arithmetic is run on 8 MB and 7.5 MB and MUST fail, so a test that could never fail is
 * impossible here.
 */

const requireCjs = createRequire(import.meta.url);
const SERVER = resolve(process.cwd(), "server"); // vitest runs with cwd = lazytopper/
const mentor = requireCjs(resolve(SERVER, "mentorImageSupport.cjs")) as {
  FILE_ROUTE_MAX_BODY_BYTES: number;
  MAX_MENTOR_PDF_BYTES: number;
  MAX_MENTOR_IMAGE_BYTES: number;
  validateMentorImagePayload: (p: Record<string, unknown>) => { ok: boolean; error?: string };
};

const b64Len = (raw: number) => Math.ceil(raw / 3) * 4;
const MiB = 1024 * 1024;

describe("PDF ceiling vs the measured 10 MiB wall", () => {
  it("the wall is exactly 10 MiB, the ceiling is exactly 7 MB, and the copy says so", () => {
    expect(EDGE_MAX_BODY_BYTES).toBe(10 * MiB);
    expect(MAX_UPLOAD_PDF_BYTES).toBe(7 * MiB);
    expect(UPLOAD_LIMIT_SENTENCE).toContain("PDF up to 7 MB");
    expect(formatUploadLimit(MAX_UPLOAD_PDF_BYTES)).toBe("7 MB");
  });

  it("★ the largest allowed PDF, as base64 plus the non-file payload, fits under the wall", () => {
    const wire = b64Len(MAX_UPLOAD_PDF_BYTES) + NON_FILE_PAYLOAD_ALLOWANCE_BYTES;
    expect(wire, `a max-size PDF would be ${wire} bytes on the wire against a ${EDGE_MAX_BODY_BYTES}-byte wall`).toBeLessThan(EDGE_MAX_BODY_BYTES);
    // and a max-size image too
    expect(b64Len(MAX_UPLOAD_IMAGE_BYTES) + NON_FILE_PAYLOAD_ALLOWANCE_BYTES).toBeLessThan(EDGE_MAX_BODY_BYTES);
    // the headroom is real, not 3 bytes
    expect(EDGE_MAX_BODY_BYTES - wire).toBeGreaterThan(256 * 1024);
  });

  it("CONTROL: the same arithmetic REFUSES 8 MB and 7.5 MB (so this guard can fail)", () => {
    expect(b64Len(8 * MiB) + NON_FILE_PAYLOAD_ALLOWANCE_BYTES).toBeGreaterThan(EDGE_MAX_BODY_BYTES);
    expect(b64Len(7.5 * MiB) + NON_FILE_PAYLOAD_ALLOWANCE_BYTES).toBeGreaterThan(EDGE_MAX_BODY_BYTES);
    // and the historical 5 MB-on-a-5 MB-cap promise was unspendable too
    expect(b64Len(5 * MiB)).toBeGreaterThan(5 * MiB);
  });

  it("client and server agree: same wall, same PDF ceiling, same image ceiling", () => {
    expect(mentor.FILE_ROUTE_MAX_BODY_BYTES).toBe(EDGE_MAX_BODY_BYTES);
    expect(mentor.MAX_MENTOR_PDF_BYTES).toBe(MAX_UPLOAD_PDF_BYTES);
    expect(mentor.MAX_MENTOR_IMAGE_BYTES).toBe(MAX_UPLOAD_IMAGE_BYTES);
  });
});

describe("the picker and the server gate at the new ceiling", () => {
  const pdf = (bytes: number) => new File([new Uint8Array(bytes)], "paper.pdf", { type: "application/pdf" });

  it("a 7 MB PDF passes the picker; one byte over is refused with the 7 MB message", () => {
    expect(checkUploadFile(pdf(MAX_UPLOAD_PDF_BYTES), "answers").ok).toBe(true);
    const over = checkUploadFile(pdf(MAX_UPLOAD_PDF_BYTES + 1), "answers");
    expect(over.ok).toBe(false);
    expect(!over.ok && over.message).toMatch(/the limit is 7 MB/);
    // the student's original ~6 MB paper (refused at 3.5 MB before this change) now passes
    expect(checkUploadFile(pdf(6 * MiB), "question").ok).toBe(true);
  });

  it("the server's own gate: a 7 MB PDF passes validateMentorImagePayload, one byte over is refused, and the message says 7 MB", () => {
    const at = Buffer.alloc(MAX_UPLOAD_PDF_BYTES, 1).toString("base64");
    expect(mentor.validateMentorImagePayload({ imageBase64: at, imageMimeType: "application/pdf" }).ok).toBe(true);
    const over = Buffer.alloc(MAX_UPLOAD_PDF_BYTES + 1, 1).toString("base64");
    const refused = mentor.validateMentorImagePayload({ imageBase64: over, imageMimeType: "application/pdf" });
    expect(refused.ok).toBe(false);
    expect(refused.error).toBe("PDF is too large. Max size is 7 MB.");
  });
});
