// src/pages/QrAnswerUploadPage.crop.test.tsx
//
// The phone capture page. What matters here is not that a crop box renders — it is that
// the selection the student made is the selection handed to the shared photo step
// (`preparePhoto`), that a student who makes NO selection sends the whole photo, and —
// since UPLOAD-2 R8 — that several photos leave the phone as ONE application/pdf through
// the EXISTING channel, with the pages kept if the network drops.
//
// The page is always mounted inside the app's router (App.tsx registers /u/:token), and
// `useParams` is how it gets its token, so the test mounts a real router.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Only the I/O is replaced. The crop GEOMETRY stays REAL — mocking it would leave these
// tests asserting against a stub of the very maths under test. jsdom has no canvas, so
// the decode / encode / preview are fakes; the PDF assembly (and jspdf) is REAL.
vi.mock("../services/qrUploadService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/qrUploadService")>();
  return { ...actual, peekQrSlot: vi.fn(), sendQrImage: vi.fn() };
});
vi.mock("../services/preparePhoto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/preparePhoto")>();
  return {
    ...actual,
    decodePhoto: vi.fn(),
    preparePhoto: vi.fn(),
    renderPhotoPreview: vi.fn(() => ({ url: "data:image/jpeg;base64,PREVIEW", width: 300, height: 400 })),
    renderPhotoThumb: vi.fn(() => "data:image/jpeg;base64,THUMB"),
  };
});

import QrAnswerUploadPage from "./QrAnswerUploadPage";
import { peekQrSlot, pollQrPickup, sendQrImage } from "../services/qrUploadService";
import { base64ToBytes, bytesToBase64, decodePhoto, preparePhoto, type DecodedPhoto } from "../services/preparePhoto";

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
  const input = container.querySelector('input.lt-qru__file[type="file"]') as HTMLInputElement;
  expect(input).toBeTruthy();
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

/** The tray's own "Add another page" input. */
function addPage(file: File) {
  const input = document.querySelector("input.lt-pt__file") as HTMLInputElement;
  expect(input).toBeTruthy();
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

/** jsdom gives every element a 0x0 box; pin the crop surface to a known rectangle. */
function pinFrame() {
  const frame = document.querySelector(".lt-pcs__crop") as HTMLElement;
  expect(frame).toBeTruthy();
  frame.getBoundingClientRect = () =>
    ({ ...FRAME, right: FRAME.width, bottom: FRAME.height, x: 0, y: 0, toJSON: () => "" }) as DOMRect;
  return frame;
}

const jpeg = (name = "answer.jpg") => new File([new Uint8Array(6 * 1024 * 1024)], name, { type: "image/jpeg" });

/** A header-complete JPEG tagged with its page, so jspdf can embed it for real. */
function taggedJpeg(tag: string, bytes = 300 * 1024): string {
  const com = Array.from(new TextEncoder().encode(`PAGE:${tag};`));
  const head = [
    0xff, 0xd8, 0xff, 0xfe, 0, com.length + 2, ...com,
    0xff, 0xc0, 0, 17, 8, 1500 >> 8, 1500 & 0xff, 2000 >> 8, 2000 & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
  ];
  const out = new Uint8Array(bytes);
  out.set(head, 0);
  out[bytes - 2] = 0xff;
  out[bytes - 1] = 0xd9;
  return bytesToBase64(out);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(peekQrSlot).mockResolvedValue({ state: "pending", mode: "photo" });
  vi.mocked(sendQrImage).mockResolvedValue({ ok: true });
  vi.mocked(decodePhoto).mockImplementation(async (file: File) => ({
    file,
    source: {} as CanvasImageSource,
    geometry: { sourceWidth: 4000, sourceHeight: 3000, orientation: 1 },
    fileOrientation: 1,
    release: vi.fn(),
  }));
  vi.mocked(preparePhoto).mockImplementation(async (input) => ({
    base64: taggedJpeg((input as DecodedPhoto).file.name.replace(/\W/g, "")),
    mimeType: "image/jpeg",
    width: 2000,
    height: 1500,
    bytes: 300 * 1024,
    quality: 0.85,
    passthrough: false,
  }));
});

async function openCrop(file = jpeg()) {
  const view = renderPage();
  await screen.findByRole("button", { name: "Take a photo" });
  await pick(view.container, file);
  await screen.findByText("Choose what to send");
  return view;
}

describe("QrAnswerUploadPage — crop step", () => {
  it("CONTROL: a live slot still opens on the unchanged capture screen", async () => {
    renderPage();
    expect(await screen.findByRole("button", { name: "Take a photo" })).toBeTruthy();
    expect(document.querySelector(".lt-pcs__crop")).toBeNull();
  });

  it("an image opens the crop step, defaulting to the WHOLE photo (one tap to skip)", async () => {
    await openCrop();
    expect(screen.getByRole("button", { name: "Use whole photo" })).toBeTruthy();
    expect(preparePhoto).not.toHaveBeenCalled();
  });

  it("SKIP: 'Use whole photo' prepares the photo uncropped, then sends one JPEG", async () => {
    const file = jpeg();
    await openCrop(file);
    fireEvent.click(screen.getByRole("button", { name: "Use whole photo" }));

    await waitFor(() => expect(preparePhoto).toHaveBeenCalled());
    // `undefined`, NOT a full-frame rectangle: the skip path is the plain whole-photo path.
    expect(vi.mocked(preparePhoto).mock.calls[0][1]).toEqual({ crop: undefined, rotation: 0 });
    expect((vi.mocked(preparePhoto).mock.calls[0][0] as DecodedPhoto).file).toBe(file);

    const send = await screen.findByRole("button", { name: "Send to your laptop" });
    await waitFor(() => expect(send).not.toBeDisabled());
    fireEvent.click(send);
    await waitFor(() => expect(sendQrImage).toHaveBeenCalled());
    expect(vi.mocked(sendQrImage).mock.calls[0][1].imageMimeType).toBe("image/jpeg");
    expect(await screen.findByText("Sent")).toBeTruthy();
  });

  it("CROP: the dragged region is what reaches preparePhoto", async () => {
    await openCrop();
    const frame = pinFrame();
    const se = screen.getByTestId("pcs-grab-se");
    fireEvent.pointerDown(se, { clientX: 300, clientY: 400, pointerId: 1, bubbles: true });
    fireEvent.pointerMove(frame, { clientX: 150, clientY: 200, pointerId: 1, bubbles: true });
    fireEvent.pointerUp(frame, { clientX: 150, clientY: 200, pointerId: 1, bubbles: true });

    // The button's words change, which is how the student knows the drag registered.
    fireEvent.click(await screen.findByRole("button", { name: "Use this part" }));
    await waitFor(() => expect(preparePhoto).toHaveBeenCalled());
    const { crop } = vi.mocked(preparePhoto).mock.calls[0][1]!;
    expect(crop!.left).toBeCloseTo(0);
    expect(crop!.top).toBeCloseTo(0);
    expect(crop!.right).toBeCloseTo(0.5);
    expect(crop!.bottom).toBeCloseTo(0.5);
  });

  it("the whole box can be dragged, and the selection follows it", async () => {
    await openCrop();
    const frame = pinFrame();
    const se = screen.getByTestId("pcs-grab-se");
    fireEvent.pointerDown(se, { clientX: 300, clientY: 400, pointerId: 1, bubbles: true });
    fireEvent.pointerMove(frame, { clientX: 150, clientY: 200, pointerId: 1, bubbles: true });
    fireEvent.pointerUp(frame, { clientX: 150, clientY: 200, pointerId: 1, bubbles: true });

    const box = screen.getByTestId("pcs-box");
    fireEvent.pointerDown(box, { clientX: 30, clientY: 40, pointerId: 2, bubbles: true });
    fireEvent.pointerMove(frame, { clientX: 90, clientY: 120, pointerId: 2, bubbles: true });
    fireEvent.pointerUp(frame, { clientX: 90, clientY: 120, pointerId: 2, bubbles: true });

    fireEvent.click(await screen.findByRole("button", { name: "Use this part" }));
    await waitFor(() => expect(preparePhoto).toHaveBeenCalled());
    const { crop } = vi.mocked(preparePhoto).mock.calls[0][1]!;
    expect(crop!.left).toBeCloseTo(0.2);
    expect(crop!.top).toBeCloseTo(0.2);
    expect(crop!.right - crop!.left).toBeCloseTo(0.5);
    expect(crop!.bottom - crop!.top).toBeCloseTo(0.5);
  });

  it("RESET restores the whole photo; the send reverts to uncropped", async () => {
    await openCrop();
    const frame = pinFrame();
    fireEvent.pointerDown(screen.getByTestId("pcs-grab-se"), { clientX: 300, clientY: 400, pointerId: 1, bubbles: true });
    fireEvent.pointerMove(frame, { clientX: 150, clientY: 200, pointerId: 1, bubbles: true });
    fireEvent.pointerUp(frame, { clientX: 150, clientY: 200, pointerId: 1, bubbles: true });
    await screen.findByRole("button", { name: "Use this part" });

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    fireEvent.click(await screen.findByTestId("pcs-confirm"));
    await waitFor(() => expect(preparePhoto).toHaveBeenCalled());
    expect(vi.mocked(preparePhoto).mock.calls[0][1]).toEqual({ crop: undefined, rotation: 0 });
  });

  it("ROTATE: a sideways page is turned in 90° steps before it is encoded", async () => {
    await openCrop();
    fireEvent.click(screen.getByRole("button", { name: /Rotate/ }));
    fireEvent.click(screen.getByRole("button", { name: /Rotate/ }));
    fireEvent.click(screen.getByRole("button", { name: "Use whole photo" }));
    await waitFor(() => expect(preparePhoto).toHaveBeenCalled());
    expect(vi.mocked(preparePhoto).mock.calls[0][1]).toEqual({ crop: undefined, rotation: 180 });
  });

  it("CONTROL: a PDF skips the crop step entirely and sends straight away", async () => {
    const pdf = new File(["%PDF-1.4"], "answers.pdf", { type: "application/pdf" });
    const { container } = renderPage();
    await screen.findByRole("button", { name: "Take a photo" });
    await pick(container, pdf);

    await waitFor(() => expect(sendQrImage).toHaveBeenCalled());
    expect(vi.mocked(sendQrImage).mock.calls[0][1].imageMimeType).toBe("application/pdf");
    expect(screen.queryByText("Choose what to send")).toBeNull();
    expect(preparePhoto).not.toHaveBeenCalled();
  });

  it("a photo this device cannot open does NOT dead-end the student", async () => {
    vi.mocked(decodePhoto).mockRejectedValueOnce(new Error("unreadable"));
    const small = new File([new Uint8Array(1024)], "small.jpg", { type: "image/jpeg" });
    const { container } = renderPage();
    await screen.findByRole("button", { name: "Take a photo" });
    await pick(container, small);

    // Falls through to the plain path (the original, through the same guard).
    await waitFor(() => expect(sendQrImage).toHaveBeenCalled());
    expect(vi.mocked(sendQrImage).mock.calls[0][1].imageMimeType).toBe("image/jpeg");
  });
});

describe("(k) QR multi-page — 3 photos leave the phone as ONE application/pdf", () => {
  async function threePages() {
    await openCrop(jpeg("page1.jpg"));
    fireEvent.click(screen.getByRole("button", { name: "Use whole photo" }));
    await screen.findByTestId("page-tray-add");
    for (const name of ["page2.jpg", "page3.jpg"]) {
      addPage(jpeg(name));
      fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
      await waitFor(() => expect(screen.queryByTestId("photo-crop-step")).toBeNull());
    }
    return screen.findByRole("button", { name: "Send 3 pages to your laptop" }, { timeout: 15_000 });
  }

  it("★ the phone sends ONE PDF of 3 pages in order, and the desktop pickup returns it as application/pdf", async () => {
    const send = await threePages();
    await waitFor(() => expect(send).not.toBeDisabled(), { timeout: 15_000 });
    fireEvent.click(send);
    await waitFor(() => expect(sendQrImage).toHaveBeenCalled());

    const payload = vi.mocked(sendQrImage).mock.calls[0][1];
    expect(payload.imageMimeType).toBe("application/pdf");
    const text = new TextDecoder("latin1").decode(base64ToBytes(payload.imageBase64));
    expect(text.startsWith("%PDF-")).toBe(true);
    expect((text.match(/\/Type \/Page\b(?!s)/g) || []).length).toBe(3);
    expect(Array.from(text.matchAll(/PAGE:(\w+);/g)).map((m) => m[1])).toEqual(["page1jpg", "page2jpg", "page3jpg"]);
    expect(await screen.findByText("Sent")).toBeTruthy();

    // The desktop half reads the SAME bytes back through the pickup, as application/pdf.
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, status: "ready", imageBase64: payload.imageBase64, imageMimeType: "application/pdf" }),
        { status: 200 },
      ),
    );
    const picked = await pollQrPickup("pickup-token");
    expect(picked.status).toBe("ready");
    if (picked.status === "ready") {
      expect(picked.imageMimeType).toBe("application/pdf");
      expect(picked.imageBase64).toBe(payload.imageBase64);
    }
    fetchSpy.mockRestore();
  }, 60_000);

  it("★ a network drop keeps every page: 'Try again' re-sends the same PDF without re-taking photos", async () => {
    vi.mocked(sendQrImage).mockResolvedValueOnce({ ok: false, reason: "offline" });
    const send = await threePages();
    await waitFor(() => expect(send).not.toBeDisabled(), { timeout: 15_000 });
    fireEvent.click(send);

    expect(await screen.findByText(/Your pages are kept/)).toBeTruthy();
    expect(screen.getAllByTestId("page-tray-item")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(sendQrImage).toHaveBeenCalledTimes(2));
    expect(vi.mocked(sendQrImage).mock.calls[1][1]).toEqual(vi.mocked(sendQrImage).mock.calls[0][1]);
    expect(await screen.findByText("Sent")).toBeTruthy();
  }, 60_000);
});
