// @vitest-environment node
/**
 * UPLOAD-READ-1 PR-B (D141 F1) — the TOTAL request body is checked on the device. One 7 MB PDF plus a photo in one
 * grading request is ~13 MB, over the edge's 10 MiB wall, and used to die as a bare 413. It is now a friendly
 * sentence, no request is sent, and every batch that was accepted before still goes through.
 * Asserted at the fetch boundary through the REAL aiClient, with only Firebase stubbed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const H = vi.hoisted(() => ({ currentUser: null as null | { uid: string; getIdToken: () => Promise<string> } }));
vi.mock("../services/firebaseClient", () => ({
  get authClient() { return { currentUser: H.currentUser }; },
  get app() { return {}; },
  firebaseConfigured: true,
}));
vi.mock("firebase/app-check", () => ({
  initializeAppCheck: () => ({}),
  getLimitedUseToken: async () => ({ token: "t" }),
  getToken: async () => ({ token: "t" }),
  ReCaptchaEnterpriseProvider: class {},
}));

import { checkSolutionImage, gradeWorksheet } from "./aiClient";
import { gradingErrorMessage } from "./gradingTransport";
import {
  EDGE_MAX_BODY_BYTES,
  FILES_TOO_LARGE_TOGETHER_MESSAGE,
  MAX_UPLOAD_IMAGE_BYTES,
  MAX_UPLOAD_PDF_BYTES,
  REQUEST_BODY_BUDGET_BYTES,
  requestBodyTooLarge,
} from "../services/uploadLimits";

const b64Len = (raw: number) => Math.ceil(raw / 3) * 4;
const file = (raw: number) => "A".repeat(b64Len(raw));
let sent = 0;

beforeEach(() => {
  sent = 0;
  H.currentUser = { uid: "stu-1", getIdToken: async () => "tok" };
  vi.stubGlobal("fetch", async () => {
    sent += 1;
    return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true, results: [], totalQuestions: 0, gradedCount: 0, pendingCount: 0, totalMarks: 1, marksAwarded: 1, percentage: 100, annotatedSteps: [] }) };
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("requestBodyTooLarge — the boundary", () => {
  it("the budget is the measured edge less a margin", () => {
    expect(REQUEST_BODY_BUDGET_BYTES).toBeLessThan(EDGE_MAX_BODY_BYTES);
    expect(EDGE_MAX_BODY_BYTES - REQUEST_BODY_BUDGET_BYTES).toBeGreaterThanOrEqual(128 * 1024);
  });
  it("exactly the budget passes; one byte over is refused", () => {
    expect(requestBodyTooLarge("a".repeat(REQUEST_BODY_BUDGET_BYTES))).toBe(false);
    expect(requestBodyTooLarge("a".repeat(REQUEST_BODY_BUDGET_BYTES + 1))).toBe(true);
  });
  it("counts UTF-8 bytes, not characters (multi-byte text near the wall is not under-counted)", () => {
    const chars = Math.floor(REQUEST_BODY_BUDGET_BYTES / 2) + 10; // 2 bytes each => over the budget in bytes, under in chars
    expect(requestBodyTooLarge("é".repeat(chars))).toBe(true);
    expect(requestBodyTooLarge("é".repeat(1000))).toBe(false);
  });
});

describe("the grading transport refuses an oversized TOTAL before sending", () => {
  it("★ a 7 MB PDF + a max photo in one worksheet request: friendly sentence, NOTHING sent", async () => {
    const req = {
      worksheetId: "w", questions: [{ qNumber: 1, marks: 2, questionText: "Q" }],
      uploads: [
        { qNumber: 1, imageBase64: file(MAX_UPLOAD_PDF_BYTES), imageMimeType: "application/pdf" },
        { qNumber: 2, imageBase64: file(2.5 * 1024 * 1024), imageMimeType: "image/jpeg" },
      ],
    };
    const err = await gradeWorksheet(req as never, { surface: "worksheet" }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("UploadTooLargeError");
    expect(err.message).toBe(FILES_TOO_LARGE_TOGETHER_MESSAGE);
    expect(gradingErrorMessage(err, "fallback")).toBe(FILES_TOO_LARGE_TOGETHER_MESSAGE);
    expect(sent).toBe(0);
  });

  it("★ CONTROL: a single max-size PDF still goes (9.79 MB of base64 + questions)", async () => {
    const out = await checkSolutionImage({ question: "Q", imageBase64: file(MAX_UPLOAD_PDF_BYTES), imageMimeType: "application/pdf" });
    expect(out.ok).toBe(true);
    expect(sent).toBe(1);
  });

  it("★ CONTROL: a batch that passed before still passes (4.67 MB PDF + 3.33 MB photo ≈ 8.0 MB, the old worksheet cap)", async () => {
    const req = {
      worksheetId: "w", questions: [],
      uploads: [
        { qNumber: 1, imageBase64: file(3.5 * 1024 * 1024), imageMimeType: "application/pdf" },
        { qNumber: 2, imageBase64: file(MAX_UPLOAD_IMAGE_BYTES), imageMimeType: "image/jpeg" },
      ],
    };
    await gradeWorksheet(req as never, { surface: "worksheet" });
    expect(sent).toBe(1);
  });
});
