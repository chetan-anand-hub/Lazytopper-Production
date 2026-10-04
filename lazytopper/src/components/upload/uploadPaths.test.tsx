// src/components/upload/uploadPaths.test.tsx
//
// UPLOAD-2 pin (a) on the OTHER grading paths, each rendered for real:
//   · SolutionChecker  — "Check my answer" in Practice / Predicted Questions (P4)
//   · ChapterTestUploadPanel — Chapter Test + Full Mock paper grading (P9)
//   · WorksheetGradePanel — worksheet grading (P7)
// (Check & Improve has its own file: DesktopCheckImprovePage.upload2.test.tsx. The QR
//  phone page: QrAnswerUploadPage.crop.test.tsx.)
//
// A 6 MB, 4000×3000 JPEG is ACCEPTED on each — before UPLOAD-2 every one of these
// refused it at the picker — and what reaches the grader is under the cap with a long
// edge between 1,600 and 2,000. Plus, per path: a 2-page upload arrives as ONE PDF where
// the path takes one, and SolutionChecker's collect mode offers no second page.
//
// jsdom has no canvas: the browser half is a FAKE (a 4000×3000 decode; a canvas that
// encodes a header-complete JPEG sized by the canvas). Everything else is real.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const checkSolutionImage = vi.fn();
const gradeWorksheetAndRecord = vi.fn();

vi.mock("../../ai/aiClient", () => ({
  checkSolutionImage: (...args: unknown[]) => checkSolutionImage(...args),
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "test-uid", isLocalSession: false } }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "premium",
    isPremium: true,
    isTrialActive: false,
    isTrialExpired: false,
    daysLeftInTrial: 0,
    status: { tier: "premium" },
    startTrial: () => {},
    upgradeToPremium: () => {},
  }),
}));
vi.mock("../../services/mistakeIntelligence", () => ({
  recordMistake: vi.fn(async () => ({ outcome: "skipped-clean" })),
  isSavedOutcome: () => false,
}));
vi.mock("../../services/practiceInsights", () => ({ recordAttempt: vi.fn() }));
vi.mock("../qr/QrAnswerHandoff", () => ({ default: () => null }));
vi.mock("../usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false }),
}));
vi.mock("../../services/worksheetGradeService", () => ({
  gradeWorksheetAndRecord: (...args: unknown[]) => gradeWorksheetAndRecord(...args),
}));
vi.mock("../../services/worksheetSessionStore", () => ({
  getWorksheetGrade: () => null,
  listStoredWorksheetsLite: () => [],
}));

import { SolutionChecker } from "../question/SolutionChecker";
import ChapterTestUploadPanel from "../chaptertest/ChapterTestUploadPanel";
import WorksheetGradePanel from "../worksheet/WorksheetGradePanel";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import { PHOTO_MAX_LONG_EDGE, PHOTO_MIN_LONG_EDGE, base64ByteLength, base64ToBytes } from "../../services/preparePhoto";
import { MAX_UPLOAD_IMAGE_BYTES, PHOTO_TARGET_BYTES } from "../../services/uploadLimits";

// ── The fake browser ────────────────────────────────────────────────────────────
let biggestCanvas = { width: 0, height: 0 };

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
  biggestCanvas = { width: 0, height: 0 };
  checkSolutionImage.mockReset().mockResolvedValue({
    ok: true,
    totalMarks: 3,
    marksAwarded: 2,
    percentage: 67,
    annotatedSteps: [],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "",
  });
  gradeWorksheetAndRecord.mockReset().mockResolvedValue({ response: { ok: false, error: "stop here" } });
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
        if (canvas.width * canvas.height > biggestCanvas.width * biggestCanvas.height) {
          biggestCanvas = { width: canvas.width, height: canvas.height };
        }
      },
    } as unknown as CanvasRenderingContext2D;
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(function (this: HTMLCanvasElement, _t?: string, q?: number) {
    const bytes = Math.round(this.width * this.height * 0.3 * (q ?? 0.9));
    return `data:image/jpeg;base64,${jpegBase64(this.width, this.height, bytes)}`;
  } as never);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const sixMbPhoto = (name = "answer.jpg") => new File([new Uint8Array(6 * 1024 * 1024)], name, { type: "image/jpeg" });

function choose(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, "files", { value: files, configurable: true });
  fireEvent.change(input);
}

function expectPhotoUnderCap(req: { imageBase64: string; imageMimeType: string }) {
  expect(req.imageMimeType).toBe("image/jpeg");
  const bytes = base64ByteLength(req.imageBase64);
  expect(bytes).toBeLessThanOrEqual(PHOTO_TARGET_BYTES);
  expect(bytes).toBeLessThan(MAX_UPLOAD_IMAGE_BYTES);
  const longEdge = Math.max(biggestCanvas.width, biggestCanvas.height);
  expect(longEdge).toBeGreaterThanOrEqual(PHOTO_MIN_LONG_EDGE);
  expect(longEdge).toBeLessThanOrEqual(PHOTO_MAX_LONG_EDGE);
}

function pdfPages(b64: string): number {
  const text = new TextDecoder("latin1").decode(base64ToBytes(b64));
  expect(text.startsWith("%PDF-")).toBe(true);
  return (text.match(/\/Type \/Page\b(?!s)/g) || []).length;
}

async function addSecondPage() {
  await screen.findByTestId("page-tray-add");
  choose(document.querySelector("input.lt-pt__file") as HTMLInputElement, [sixMbPhoto("p2.jpg")]);
  fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
  await waitFor(() => expect(screen.getAllByTestId("page-tray-item")).toHaveLength(2));
}

// ── SolutionChecker (P4) ─────────────────────────────────────────────────────────

const SC_PROPS = { question: "Find the 10th term of the AP 3, 7, 11, …", marks: 3, subject: "Maths", topic: "arithmetic-progressions" };

describe("(a) SolutionChecker — 'Check my answer'", () => {
  it("★ a 6 MB phone photo is accepted and the grader gets a JPEG under the cap", async () => {
    const { container } = render(<MemoryRouter><SolutionChecker {...SC_PROPS} /></MemoryRouter>);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.multiple).toBe(true);
    choose(input, [sixMbPhoto()]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    const check = await screen.findByRole("button", { name: /Check my answer|Check answer|Check/ });
    await waitFor(() => expect(checkSolutionImage).not.toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByTestId("page-tray-item")).toHaveLength(1));
    expect(container.textContent).not.toMatch(/File must be under/);
    fireEvent.click(check);
    await waitFor(() => expect(checkSolutionImage).toHaveBeenCalledTimes(1));
    expectPhotoUnderCap(checkSolutionImage.mock.calls[0][0]);
  });

  it("★ two pages reach the grader as ONE application/pdf", async () => {
    const { container } = render(<MemoryRouter><SolutionChecker {...SC_PROPS} /></MemoryRouter>);
    choose(container.querySelector('input[type="file"]') as HTMLInputElement, [sixMbPhoto("p1.jpg")]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    await addSecondPage();
    await waitFor(() => expect(container.textContent).toMatch(/2 pages \(one PDF\)/), { timeout: 20_000 });
    fireEvent.click(screen.getByRole("button", { name: /Check my answer|Check answer|Check/ }));
    await waitFor(() => expect(checkSolutionImage).toHaveBeenCalledTimes(1));
    const req = checkSolutionImage.mock.calls[0][0];
    expect(req.imageMimeType).toBe("application/pdf");
    expect(pdfPages(req.imageBase64)).toBe(2);
  }, 60_000);

  it("collect mode (a shared batch body) takes one photo per answer — no 'Add another page'", async () => {
    const { container } = render(
      <MemoryRouter>
        <SolutionChecker {...SC_PROPS} collectMode onSaveAnswer={() => {}} />
      </MemoryRouter>,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.multiple).toBe(false);
    choose(input, [sixMbPhoto()]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    await screen.findByTestId("page-tray");
    expect(screen.queryByTestId("page-tray-add")).toBeNull();
  });
});

// ── ChapterTestUploadPanel (Chapter Test + Full Mock) ────────────────────────────

describe("(a) ChapterTestUploadPanel — Chapter Test / Full Mock paper grading", () => {
  function renderPanel(onGrade = vi.fn()) {
    const view = render(
      <ChapterTestUploadPanel
        name="Real Numbers"
        code="CT-1"
        objective={{ awarded: 3, total: 5 }}
        grading={false}
        error={null}
        isSignedIn
        onGrade={onGrade}
        onSkip={() => {}}
      />,
    );
    return { ...view, onGrade };
  }

  it("★ a 6 MB phone photo is accepted and the grade gets a JPEG under the cap", async () => {
    const { container, onGrade } = renderPanel();
    choose(container.querySelector('input[type="file"]') as HTMLInputElement, [sixMbPhoto()]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    fireEvent.click(await screen.findByRole("button", { name: /Grade my written answers/ }));
    expect(onGrade).toHaveBeenCalledTimes(1);
    expectPhotoUnderCap(onGrade.mock.calls[0][0]);
  });

  it("★ a photo of each page arrives as ONE application/pdf", async () => {
    const { container, onGrade } = renderPanel();
    choose(container.querySelector('input[type="file"]') as HTMLInputElement, [sixMbPhoto("p1.jpg")]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    await addSecondPage();
    await waitFor(() => expect(container.textContent).toMatch(/2 pages \(one PDF\)/), { timeout: 20_000 });
    fireEvent.click(screen.getByRole("button", { name: /Grade my written answers/ }));
    const req = onGrade.mock.calls[0][0];
    expect(req.imageMimeType).toBe("application/pdf");
    expect(pdfPages(req.imageBase64)).toBe(2);
  }, 60_000);
});

// ── WorksheetGradePanel (P7) ─────────────────────────────────────────────────────

const WS: PersistedWorksheet = {
  worksheetId: "ws-1",
  createdAt: "2026-10-04T00:00:00.000Z",
  title: "AP worksheet",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 3,
  questions: [
    {
      qNumber: 1,
      id: "q1",
      subject: "Maths",
      topicKey: "arithmetic-progressions",
      topicLabel: "Arithmetic Progressions",
      section: "C",
      marks: 3,
      questionText: "Find the 10th term of the AP 3, 7, 11, …",
    },
  ],
} as PersistedWorksheet;

describe("(a) WorksheetGradePanel — worksheet grading", () => {
  it("★ a 6 MB phone photo is accepted and the grade gets a JPEG under the cap", async () => {
    const { container } = render(<MemoryRouter><WorksheetGradePanel ws={WS} /></MemoryRouter>);
    choose(container.querySelector('input[type="file"]') as HTMLInputElement, [sixMbPhoto()]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    fireEvent.click(await screen.findByRole("button", { name: /Grade my answers/ }));
    await waitFor(() => expect(gradeWorksheetAndRecord).toHaveBeenCalledTimes(1));
    expectPhotoUnderCap(gradeWorksheetAndRecord.mock.calls[0][2]);
  });

  it("★ a photo of each page arrives as ONE application/pdf", async () => {
    const { container } = render(<MemoryRouter><WorksheetGradePanel ws={WS} /></MemoryRouter>);
    choose(container.querySelector('input[type="file"]') as HTMLInputElement, [sixMbPhoto("p1.jpg")]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    await addSecondPage();
    await waitFor(() => expect(container.textContent).toMatch(/2 pages \(one PDF\)/), { timeout: 20_000 });
    fireEvent.click(screen.getByRole("button", { name: /Grade my answers/ }));
    await waitFor(() => expect(gradeWorksheetAndRecord).toHaveBeenCalledTimes(1));
    const req = gradeWorksheetAndRecord.mock.calls[0][2];
    expect(req.imageMimeType).toBe("application/pdf");
    expect(pdfPages(req.imageBase64)).toBe(2);
  }, 60_000);
});

// ── UPLOAD-2-FIX-1 (F4) — the FIRST photo on a phone can reach the camera ─────────────
//
// Each host's own picker carries `multiple` (and a PDF in `accept`); on Android Chrome
// either one keeps the camera away. A coarse pointer therefore gets "Take photo" (its own
// image/*, capture=environment input, never `multiple`) beside "Choose from gallery" (the
// host's input, unchanged). A fine pointer keeps the single dropzone.

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

function expectCameraInput(prefix: string) {
  const camera = screen.getByTestId(`${prefix}-camera-input`) as HTMLInputElement;
  expect(camera.getAttribute("accept")).toBe("image/*");
  expect(camera.getAttribute("capture")).toBe("environment");
  expect(camera.multiple).toBe(false);
  return camera;
}

/** "Choose from gallery" opens the host's OWN input — the one without `capture`. */
function expectGalleryOpensHostInput(prefix: string, container: HTMLElement, multiple: boolean) {
  const hostInput = Array.from(container.querySelectorAll('input[type="file"]')).find(
    (i) => !i.hasAttribute("capture"),
  ) as HTMLInputElement;
  expect(hostInput.multiple).toBe(multiple);
  expect(hostInput.getAttribute("accept")).toBe("image/jpeg,image/png,application/pdf");
  const spy = vi.spyOn(hostInput, "click").mockImplementation(() => {});
  fireEvent.click(screen.getByTestId(`${prefix}-gallery`));
  expect(spy).toHaveBeenCalledTimes(1);
}

describe("(F4) the first photo on a phone — Take photo / Choose from gallery", () => {
  it("★ SolutionChecker ('Check my answer'): a camera photo goes through the crop step to the grader", async () => {
    stubPointer(true);
    const { container } = render(<MemoryRouter><SolutionChecker {...SC_PROPS} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("tab", { name: "Upload a photo" }));
    expect(screen.getByRole("button", { name: "Take photo" })).toBeTruthy();
    expectGalleryOpensHostInput("sc-photo", container, true);
    choose(expectCameraInput("sc-photo"), [sixMbPhoto()]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    await waitFor(() => expect(screen.getAllByTestId("page-tray-item")).toHaveLength(1));
    fireEvent.click(await screen.findByRole("button", { name: /Check my answer|Check answer|Check/ }));
    await waitFor(() => expect(checkSolutionImage).toHaveBeenCalledTimes(1));
    expectPhotoUnderCap(checkSolutionImage.mock.calls[0][0]);
  });

  it("SolutionChecker collect mode (Practice): the same two choices; the gallery stays single-file", async () => {
    stubPointer(true);
    const { container } = render(
      <MemoryRouter>
        <SolutionChecker {...SC_PROPS} collectMode onSaveAnswer={() => {}} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Upload a photo" }));
    expectGalleryOpensHostInput("sc-photo", container, false);
    choose(expectCameraInput("sc-photo"), [sixMbPhoto()]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    await screen.findByTestId("page-tray");
    // Collect mode still takes one photo per answer.
    expect(screen.queryByTestId("page-tray-camera")).toBeNull();
    expect(screen.queryByTestId("page-tray-add")).toBeNull();
  });

  it("★ ChapterTestUploadPanel (Chapter Test / Full Mock): a camera photo reaches the grade", async () => {
    stubPointer(true);
    const onGrade = vi.fn();
    const { container } = render(
      <ChapterTestUploadPanel
        name="Real Numbers"
        code="CT-1"
        objective={{ awarded: 3, total: 5 }}
        grading={false}
        error={null}
        isSignedIn
        onGrade={onGrade}
        onSkip={() => {}}
      />,
    );
    expectGalleryOpensHostInput("ct-photo", container, true);
    choose(expectCameraInput("ct-photo"), [sixMbPhoto()]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    // The next page offers the camera too.
    expect(await screen.findByTestId("page-tray-camera")).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: /Grade my written answers/ }));
    expect(onGrade).toHaveBeenCalledTimes(1);
    expectPhotoUnderCap(onGrade.mock.calls[0][0]);
  });

  it("★ WorksheetGradePanel: a camera photo reaches the grade", async () => {
    stubPointer(true);
    const { container } = render(<MemoryRouter><WorksheetGradePanel ws={WS} /></MemoryRouter>);
    expectGalleryOpensHostInput("wg-photo", container, true);
    choose(expectCameraInput("wg-photo"), [sixMbPhoto()]);
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    fireEvent.click(await screen.findByRole("button", { name: /Grade my answers/ }));
    await waitFor(() => expect(gradeWorksheetAndRecord).toHaveBeenCalledTimes(1));
    expectPhotoUnderCap(gradeWorksheetAndRecord.mock.calls[0][2]);
  });

  it("CONTROL: a fine pointer (desktop) keeps each host's single dropzone and no camera input", () => {
    stubPointer(false);
    render(<MemoryRouter><SolutionChecker {...SC_PROPS} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("tab", { name: "Upload a photo" }));
    expect(screen.getByRole("button", { name: /Upload a photo or PDF of your answer/ })).toBeTruthy();
    cleanup();
    render(<MemoryRouter><WorksheetGradePanel ws={WS} /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /Upload your answers/ })).toBeTruthy();
    cleanup();
    render(
      <ChapterTestUploadPanel
        name="Real Numbers"
        code="CT-1"
        objective={{ awarded: 3, total: 5 }}
        grading={false}
        error={null}
        isSignedIn
        onGrade={vi.fn()}
        onSkip={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Upload your written answers/ })).toBeTruthy();
    expect(document.querySelector("input[capture]")).toBeNull();
    expect(screen.queryByRole("button", { name: "Take photo" })).toBeNull();
  });
});
