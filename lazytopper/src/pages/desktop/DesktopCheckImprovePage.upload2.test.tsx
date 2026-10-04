/**
 * UPLOAD-2 — Check & Improve, rendered: a phone photo through BOTH upload handlers
 * (answer + question), end to end into the grader call.
 *
 * Pin (a) on these two paths: a 6 MB, 4000×3000 JPEG is ACCEPTED, the bytes that reach
 * the grader are under the cap, and the long edge is between 1,600 and 2,000. Before
 * UPLOAD-2 the same file was refused at the picker ("the limit is 3 MB").
 * Pin (g/R6) on the answer path: two pages leave as ONE application/pdf.
 *
 * jsdom has no canvas and decodes no images: the browser half is a FAKE that reports a
 * 4000×3000 photo and encodes a header-complete JPEG whose size follows the canvas — so
 * the real decode -> crop step -> preparePhoto -> guard -> (jspdf) pipeline runs.
 * The grader calls are spies on the REAL aiClient module, so what the page hands them is
 * what is asserted. Signed-in premium, flag off: the ordinary paid path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const H = vi.hoisted(() => ({
  auth: { user: { uid: "u1", email: null, phoneNumber: "+919000000000", displayName: null } as Record<string, unknown>, loading: false },
  sub: {
    isPremium: true,
    isTrialExpired: false,
    hydrated: true,
    tier: "premium",
    isTrialActive: false,
    daysLeftInTrial: 0,
    startTrial: vi.fn(),
    upgradeToPremium: vi.fn(),
    status: { tier: "premium", plan: "monthly", trialStartDate: null, trialEndDate: null, premiumSince: null },
  },
  detectQuestion: vi.fn(),
  checkSolutionImage: vi.fn(),
  gradeWorksheet: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
vi.mock("../../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/aiClient")>();
  return {
    ...actual,
    detectQuestion: (...a: unknown[]) => H.detectQuestion(...a),
    checkSolutionImage: (...a: unknown[]) => H.checkSolutionImage(...a),
    gradeWorksheet: (...a: unknown[]) => H.gradeWorksheet(...a),
  };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import { PHOTO_MAX_LONG_EDGE, PHOTO_MIN_LONG_EDGE, base64ByteLength, base64ToBytes } from "../../services/preparePhoto";
import { MAX_UPLOAD_IMAGE_BYTES, PHOTO_TARGET_BYTES } from "../../services/uploadLimits";

const DETECTED = {
  ok: true,
  detectedMarks: 3,
  detectedSubject: "Maths",
  detectedTopic: "real-numbers",
  marksSource: "stated",
  questions: [{ questionNumber: 1, questionText: "Prove that root 2 is irrational.", marks: 3, marksSource: "stated" }],
};
const GRADED = {
  ok: true,
  totalMarks: 3,
  marksAwarded: 2,
  percentage: 67,
  annotatedSteps: [],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 1 },
  teacherNote: "Nearly there.",
};

// ── The fake browser: a 4000×3000 photo, a canvas that encodes a real JPEG header ──
/** The largest canvas drawn — the upload encode (previews and thumbnails are smaller). */
let lastCanvas = { width: 0, height: 0 };

function jpegBase64(w: number, h: number, bytes: number): string {
  const head = [0xff, 0xd8, 0xff, 0xfe, 0, 6, 0x55, 0x32, 0x2d, 0x31, 0xff, 0xc0, 0, 17, 8, h >> 8, h & 0xff, w >> 8, w & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  const out = new Uint8Array(Math.max(bytes, head.length + 2));
  out.set(head, 0);
  out[out.length - 2] = 0xff;
  out[out.length - 1] = 0xd9;
  let bin = "";
  for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode(...out.subarray(i, i + 0x8000));
  return btoa(bin);
}

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 4000;
  naturalHeight = 3000;
  width = 4000;
  height = 3000;
  decoding = "auto";
  set src(_v: string) {
    queueMicrotask(() => this.onload?.());
  }
}

beforeEach(() => {
  window.localStorage.clear();
  lastCanvas = { width: 0, height: 0 };
  H.detectQuestion.mockReset().mockResolvedValue(DETECTED);
  H.checkSolutionImage.mockReset().mockResolvedValue(GRADED);
  H.gradeWorksheet.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("CSS", { supports: () => true });
  URL.createObjectURL = vi.fn(() => "blob:photo");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    const canvas = this;
    return {
      fillStyle: "",
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "low",
      fillRect: () => {},
      setTransform: () => {},
      drawImage: () => {
        if (canvas.width * canvas.height > lastCanvas.width * lastCanvas.height) {
          lastCanvas = { width: canvas.width, height: canvas.height };
        }
      },
    } as unknown as CanvasRenderingContext2D;
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(function (this: HTMLCanvasElement, _t?: string, q?: number) {
    // Previews and thumbnails are small; the upload encode follows the canvas size.
    const bytes = Math.round(this.width * this.height * 0.3 * (q ?? 0.9));
    return `data:image/jpeg;base64,${jpegBase64(this.width, this.height, bytes)}`;
  } as never);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const sixMbPhoto = (name: string) => new File([new Uint8Array(6 * 1024 * 1024)], name, { type: "image/jpeg" });

function choose(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, "files", { value: files, configurable: true });
  fireEvent.change(input);
}

async function readTypedQuestion() {
  fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: "Prove that root 2 is irrational." } });
  fireEvent.click(screen.getByRole("button", { name: /Read the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
}

describe("(a) C&I ANSWER path — a 6 MB phone photo", () => {
  it("★ is accepted: crop step -> 'Use whole photo' -> the grader gets a JPEG under the cap, long edge 1,600–2,000", async () => {
    const { container } = renderPage();
    await readTypedQuestion();
    const answerInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    expect(answerInput.multiple).toBe(true); // R7 — several images at once on a desktop
    choose(answerInput, [sixMbPhoto("answer.jpg")]);

    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    const grade = await screen.findByRole("button", { name: /Grade my answer/ });
    await waitFor(() => expect(grade).not.toBeDisabled());
    // No refusal was shown — the picker no longer checks the RAW size.
    expect(container.textContent).not.toMatch(/the limit is 3 MB/);
    fireEvent.click(grade);

    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    const req = H.checkSolutionImage.mock.calls[0][0] as { imageBase64: string; imageMimeType: string };
    expect(req.imageMimeType).toBe("image/jpeg");
    const bytes = base64ByteLength(req.imageBase64);
    expect(bytes).toBeLessThanOrEqual(PHOTO_TARGET_BYTES);
    expect(bytes).toBeLessThan(MAX_UPLOAD_IMAGE_BYTES);
    const longEdge = Math.max(lastCanvas.width, lastCanvas.height);
    expect(longEdge).toBeGreaterThanOrEqual(PHOTO_MIN_LONG_EDGE);
    expect(longEdge).toBeLessThanOrEqual(PHOTO_MAX_LONG_EDGE);
    // The bytes sent are the JPEG the canvas encoded at that size.
    const sent = base64ToBytes(req.imageBase64);
    expect([sent[0], sent[1]]).toEqual([0xff, 0xd8]);
  });

  it("★ R6: two photos (Add another page) reach the grader as ONE application/pdf", async () => {
    const { container } = renderPage();
    await readTypedQuestion();
    const answerInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    choose(answerInput, [sixMbPhoto("p1.jpg")]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    await screen.findByTestId("page-tray-add");

    choose(document.querySelector("input.lt-pt__file") as HTMLInputElement, [sixMbPhoto("p2.jpg")]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));

    await waitFor(() => expect(screen.getAllByTestId("page-tray-item")).toHaveLength(2));
    const grade = await screen.findByRole("button", { name: /Grade my answer/ });
    await waitFor(() => expect(grade).not.toBeDisabled(), { timeout: 20_000 });
    fireEvent.click(grade);

    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    const req = H.checkSolutionImage.mock.calls[0][0] as { imageBase64: string; imageMimeType: string };
    expect(req.imageMimeType).toBe("application/pdf");
    const text = new TextDecoder("latin1").decode(base64ToBytes(req.imageBase64));
    expect(text.startsWith("%PDF-")).toBe(true);
    expect((text.match(/\/Type \/Page\b(?!s)/g) || []).length).toBe(2);
  }, 60_000);
});

describe("(a) C&I QUESTION path — a 6 MB phone photo of the question", () => {
  it("★ is accepted and read: the detect call gets a JPEG under the cap", async () => {
    const { container } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Upload question(s)" }));
    const inputs = container.querySelectorAll('input[type="file"]');
    const questionInput = inputs[0] as HTMLInputElement;
    choose(questionInput, [sixMbPhoto("question.jpg")]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));

    const read = await screen.findByRole("button", { name: /Read the question/ });
    await waitFor(() => expect(read).not.toBeDisabled());
    fireEvent.click(read);
    await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
    const req = H.detectQuestion.mock.calls[0][0] as { imageBase64: string; imageMimeType: string };
    expect(req.imageMimeType).toBe("image/jpeg");
    expect(base64ByteLength(req.imageBase64)).toBeLessThanOrEqual(PHOTO_TARGET_BYTES);
  });
});

// ── UPLOAD-2-FIX-1 (F4) — on a phone, "Take photo" is its OWN input ──────────────────
// The old "Camera" button set `capture` on an input that carries `multiple` and a PDF in
// `accept` — on Android Chrome either one keeps the camera away. A coarse pointer now gets
// "Take photo" (image/*, capture=environment, never `multiple`) beside "Choose from
// gallery" (the page's own input, unchanged).

function stubPointer(coarse: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(pointer: coarse)" ? coarse : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

function expectCameraInput(testId: string) {
  const camera = screen.getByTestId(testId) as HTMLInputElement;
  expect(camera.getAttribute("accept")).toBe("image/*");
  expect(camera.getAttribute("capture")).toBe("environment");
  expect(camera.multiple).toBe(false);
  return camera;
}

describe("(F4) C&I on a phone — Take photo / Choose from gallery", () => {
  it("★ ANSWER: a camera photo goes crop step -> grader; gallery opens the page's own input", async () => {
    stubPointer(true);
    const { container } = renderPage();
    await readTypedQuestion();
    expect(screen.getByRole("button", { name: "Take photo" })).toBeTruthy();
    const gallery = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    expect(gallery.multiple).toBe(true);
    const spy = vi.spyOn(gallery, "click").mockImplementation(() => {});
    fireEvent.click(screen.getByTestId("ci-answer-photo-gallery"));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(gallery.hasAttribute("capture")).toBe(false);

    choose(expectCameraInput("ci-answer-photo-camera-input"), [sixMbPhoto("answer.jpg")]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    // The next page offers the camera too.
    expect(await screen.findByTestId("page-tray-camera")).toBeTruthy();
    const grade = await screen.findByRole("button", { name: /Grade my answer/ });
    await waitFor(() => expect(grade).not.toBeDisabled());
    fireEvent.click(grade);
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    const req = H.checkSolutionImage.mock.calls[0][0] as { imageBase64: string; imageMimeType: string };
    expect(req.imageMimeType).toBe("image/jpeg");
    expect(base64ByteLength(req.imageBase64)).toBeLessThanOrEqual(PHOTO_TARGET_BYTES);
  });

  it("★ QUESTION: a camera photo of the question is read", async () => {
    stubPointer(true);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Upload question(s)" }));
    choose(expectCameraInput("ci-question-photo-camera-input"), [sixMbPhoto("question.jpg")]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    const read = await screen.findByRole("button", { name: /Read the question/ });
    await waitFor(() => expect(read).not.toBeDisabled());
    fireEvent.click(read);
    await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
    const req = H.detectQuestion.mock.calls[0][0] as { imageBase64: string; imageMimeType: string };
    expect(req.imageMimeType).toBe("image/jpeg");
  });

  it("CONTROL: a fine pointer gets no camera input and no Take photo button", async () => {
    stubPointer(false);
    renderPage();
    await readTypedQuestion();
    expect(screen.queryByRole("button", { name: "Take photo" })).toBeNull();
    expect(document.querySelector("input[capture]")).toBeNull();
  });
});

// ── LOW-END-1 PR-2 — the owner's three copy fixes, on this page ─────────────────────
// (1) a picker whose input ALSO takes a PDF says "Gallery or files" (FU-PICKER-LABEL-PDF);
// (2) the multi-page tip names the page tray, not the phone's scan feature
//     (FU-CI-MULTIPAGE-TIP-COPY); (3) a phone is TAPPED — "Tap to choose a different
//     file" on a coarse pointer, "Click…" on a desktop (useCoarsePointer, UPLOAD-2-FIX-1).
describe("LOW-END-1 PR-2 · C&I copy", () => {
  it("★ coarse pointer: both PDF-taking pickers say 'Gallery or files'; the tip names the page tray; a loaded photo says 'Tap'", async () => {
    stubPointer(true);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Upload question(s)" }));
    expect(screen.getByTestId("ci-question-photo-gallery").textContent).toContain("Gallery or files");
    cleanup();
    stubPointer(true);
    renderPage();
    await readTypedQuestion();
    expect(screen.getByTestId("ci-answer-photo-gallery").textContent).toContain("Gallery or files");
    expect(screen.queryByText(/Choose from gallery/)).toBeNull();
    expect(screen.getByText(/More than one page\? Tap Add another page after your first photo\./)).toBeTruthy();
    expect(screen.queryByText(/scan feature/)).toBeNull();
    choose(expectCameraInput("ci-answer-photo-camera-input"), [sixMbPhoto("answer.jpg")]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    expect(await screen.findByText("Tap to choose a different file")).toBeTruthy();
    expect(screen.queryByText("Click to choose a different file")).toBeNull();
    // The tray's OWN "add a page" input is images only, so it keeps "Choose from gallery".
    expect(screen.getByTestId("page-tray-gallery").textContent).toContain("Choose from gallery");
  });

  it("CONTROL: a fine pointer (desktop) keeps 'Click to choose a different file'", async () => {
    stubPointer(false);
    const { container } = renderPage();
    await readTypedQuestion();
    const answerInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    choose(answerInput, [sixMbPhoto("answer.jpg")]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    expect(await screen.findByText("Click to choose a different file")).toBeTruthy();
    expect(screen.queryByText("Tap to choose a different file")).toBeNull();
  });
});
