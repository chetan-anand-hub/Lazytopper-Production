// src/pages/QrAnswerUploadPage.crop.test.tsx
//
// The phone capture page's FIRST assertions. What matters here is not that a crop box
// renders — it is that the selection the student made is the selection handed to
// `prepareQrImage`, and that a student who makes NO selection travels the pre-crop path
// byte for byte.
//
// The page is always mounted inside the app's router (App.tsx registers /u/:token), and
// `useParams` is how it gets its token, so the test mounts a real router rather than
// asserting around the missing one.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Only the I/O is replaced. The crop GEOMETRY (isFullFrameCrop, moveCropFraction,
// resizeCropFraction, FULL_FRAME_CROP) stays REAL — mocking it would leave these tests
// asserting against a stub of the very maths under test.
vi.mock("../services/qrUploadService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/qrUploadService")>();
  return {
    ...actual,
    peekQrSlot: vi.fn(),
    prepareQrImage: vi.fn(),
    sendQrImage: vi.fn(),
    readQrPreviewUrl: vi.fn(),
  };
});

import QrAnswerUploadPage from "./QrAnswerUploadPage";
import {
  peekQrSlot,
  prepareQrImage,
  readQrPreviewUrl,
  sendQrImage,
} from "../services/qrUploadService";

const FRAME = { left: 0, top: 0, width: 300, height: 400 };

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/u/tok123"]}>
      <Routes>
        <Route path="/u/:token" element={<QrAnswerUploadPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function pick(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  expect(input).toBeTruthy();
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

/** jsdom gives every element a 0x0 box, which would make every fraction meaningless.
 *  Pin the crop surface to a known rectangle so a pointer at x=150 is genuinely the
 *  horizontal midpoint. */
function pinFrame() {
  const frame = document.querySelector(".lt-qru__crop") as HTMLElement;
  expect(frame).toBeTruthy();
  frame.getBoundingClientRect = () =>
    ({ ...FRAME, right: FRAME.width, bottom: FRAME.height, x: 0, y: 0, toJSON: () => "" }) as DOMRect;
  return frame;
}

const jpeg = () => new File(["x"], "answer.jpg", { type: "image/jpeg" });

beforeEach(() => {
  vi.mocked(peekQrSlot).mockResolvedValue({ state: "pending", mode: "photo" });
  vi.mocked(readQrPreviewUrl).mockResolvedValue("data:image/jpeg;base64,PREVIEW");
  vi.mocked(prepareQrImage).mockResolvedValue({
    imageBase64: "PAYLOAD",
    imageMimeType: "image/jpeg",
  });
  vi.mocked(sendQrImage).mockResolvedValue({ ok: true });
  vi.clearAllMocks?.();
  vi.mocked(peekQrSlot).mockResolvedValue({ state: "pending", mode: "photo" });
  vi.mocked(readQrPreviewUrl).mockResolvedValue("data:image/jpeg;base64,PREVIEW");
  vi.mocked(prepareQrImage).mockResolvedValue({
    imageBase64: "PAYLOAD",
    imageMimeType: "image/jpeg",
  });
  vi.mocked(sendQrImage).mockResolvedValue({ ok: true });
});

describe("QrAnswerUploadPage — crop step", () => {
  it("CONTROL: a live slot still opens on the unchanged capture screen", async () => {
    renderPage();
    // Proves the probe runs at all, and that the crop phase has not hijacked the entry
    // screen. "Take a photo" is the pre-existing photo-mode CTA.
    expect(await screen.findByRole("button", { name: "Take a photo" })).toBeTruthy();
    expect(document.querySelector(".lt-qru__crop")).toBeNull();
  });

  it("an image opens the crop step, defaulting to the WHOLE page", async () => {
    const { container } = renderPage();
    await screen.findByRole("button", { name: "Take a photo" });
    await pick(container, jpeg());

    expect(await screen.findByText("Choose what to send")).toBeTruthy();
    // ★ Q2: the default selection is the whole image, and the button says so.
    expect(screen.getByRole("button", { name: "Send the whole page" })).toBeTruthy();
    expect(prepareQrImage).not.toHaveBeenCalled();
  });

  it("SKIP: confirming without dragging sends the original image, uncropped", async () => {
    const file = jpeg();
    const { container } = renderPage();
    await screen.findByRole("button", { name: "Take a photo" });
    await pick(container, file);

    fireEvent.click(await screen.findByRole("button", { name: "Send the whole page" }));

    await waitFor(() => expect(prepareQrImage).toHaveBeenCalled());
    // `undefined`, NOT a full-frame rectangle: the skip path must be the old path.
    expect(vi.mocked(prepareQrImage).mock.calls[0]).toEqual([file, undefined]);
    expect(await screen.findByText("Sent")).toBeTruthy();
  });

  it("CROP: the dragged region is what reaches prepareQrImage", async () => {
    const file = jpeg();
    const { container } = renderPage();
    await screen.findByRole("button", { name: "Take a photo" });
    await pick(container, file);
    await screen.findByText("Choose what to send");

    const frame = pinFrame();
    const se = screen.getByTestId("qru-grab-se");

    // Pull the bottom-right corner to the middle of the frame: 150/300 = 0.5 across,
    // 200/400 = 0.5 down.
    fireEvent.pointerDown(se, { clientX: 300, clientY: 400, pointerId: 1, bubbles: true });
    fireEvent.pointerMove(frame, { clientX: 150, clientY: 200, pointerId: 1, bubbles: true });
    fireEvent.pointerUp(frame, { clientX: 150, clientY: 200, pointerId: 1, bubbles: true });

    // The button's words change, which is how the student knows the drag registered.
    const send = await screen.findByRole("button", { name: "Send this part" });
    fireEvent.click(send);

    await waitFor(() => expect(prepareQrImage).toHaveBeenCalled());
    const [sentFile, rect] = vi.mocked(prepareQrImage).mock.calls[0];
    expect(sentFile).toBe(file);
    expect(rect).toBeDefined();
    expect(rect!.left).toBeCloseTo(0);
    expect(rect!.top).toBeCloseTo(0);
    expect(rect!.right).toBeCloseTo(0.5);
    expect(rect!.bottom).toBeCloseTo(0.5);
  });

  it("the whole box can be dragged, and the selection follows it", async () => {
    const file = jpeg();
    const { container } = renderPage();
    await screen.findByRole("button", { name: "Take a photo" });
    await pick(container, file);
    await screen.findByText("Choose what to send");

    const frame = pinFrame();
    // Shrink first, otherwise a full-frame box has nowhere to move.
    const se = screen.getByTestId("qru-grab-se");
    fireEvent.pointerDown(se, { clientX: 300, clientY: 400, pointerId: 1, bubbles: true });
    fireEvent.pointerMove(frame, { clientX: 150, clientY: 200, pointerId: 1, bubbles: true });
    fireEvent.pointerUp(frame, { clientX: 150, clientY: 200, pointerId: 1, bubbles: true });

    const box = screen.getByTestId("qru-crop-box");
    fireEvent.pointerDown(box, { clientX: 30, clientY: 40, pointerId: 2, bubbles: true });
    fireEvent.pointerMove(frame, { clientX: 90, clientY: 120, pointerId: 2, bubbles: true });
    fireEvent.pointerUp(frame, { clientX: 90, clientY: 120, pointerId: 2, bubbles: true });

    fireEvent.click(await screen.findByRole("button", { name: "Send this part" }));
    await waitFor(() => expect(prepareQrImage).toHaveBeenCalled());
    const rect = vi.mocked(prepareQrImage).mock.calls[0][1]!;
    // Moved by 0.2 of the width and 0.2 of the height; the size is preserved.
    expect(rect.left).toBeCloseTo(0.2);
    expect(rect.top).toBeCloseTo(0.2);
    expect(rect.right - rect.left).toBeCloseTo(0.5);
    expect(rect.bottom - rect.top).toBeCloseTo(0.5);
  });

  it("RESET: restores the whole page, and the send reverts to uncropped", async () => {
    const file = jpeg();
    const { container } = renderPage();
    await screen.findByRole("button", { name: "Take a photo" });
    await pick(container, file);
    await screen.findByText("Choose what to send");

    const frame = pinFrame();
    const se = screen.getByTestId("qru-grab-se");
    fireEvent.pointerDown(se, { clientX: 300, clientY: 400, pointerId: 1, bubbles: true });
    fireEvent.pointerMove(frame, { clientX: 150, clientY: 200, pointerId: 1, bubbles: true });
    fireEvent.pointerUp(frame, { clientX: 150, clientY: 200, pointerId: 1, bubbles: true });
    await screen.findByRole("button", { name: "Send this part" });

    fireEvent.click(screen.getByRole("button", { name: "Reset to the whole page" }));

    // Reversible: back to the default without re-picking the photo.
    fireEvent.click(await screen.findByRole("button", { name: "Send the whole page" }));
    await waitFor(() => expect(prepareQrImage).toHaveBeenCalled());
    expect(vi.mocked(prepareQrImage).mock.calls[0]).toEqual([file, undefined]);
  });

  it("CONTROL: a PDF skips the crop step entirely and sends as before", async () => {
    const pdf = new File(["x"], "answers.pdf", { type: "application/pdf" });
    const { container } = renderPage();
    await screen.findByRole("button", { name: "Take a photo" });
    await pick(container, pdf);

    await waitFor(() => expect(prepareQrImage).toHaveBeenCalled());
    expect(vi.mocked(prepareQrImage).mock.calls[0]).toEqual([pdf, undefined]);
    expect(screen.queryByText("Choose what to send")).toBeNull();
  });

  it("a preview that cannot be read does NOT dead-end the student", async () => {
    const file = jpeg();
    vi.mocked(readQrPreviewUrl).mockRejectedValueOnce(new Error("unreadable"));
    const { container } = renderPage();
    await screen.findByRole("button", { name: "Take a photo" });
    await pick(container, file);

    // Falls through to the pre-crop path rather than showing an empty crop screen.
    await waitFor(() => expect(prepareQrImage).toHaveBeenCalled());
    expect(vi.mocked(prepareQrImage).mock.calls[0]).toEqual([file, undefined]);
  });
});
