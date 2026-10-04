// src/components/upload/PageTray.test.tsx
//
// THE SHARED UPLOAD STEP (UPLOAD-2). Pins (a) at the hook, (h), (i), (j), (l), (m), plus
// the honest-degrade fallback and the PDF / wrong-type routes, through a tiny host that
// mounts `usePageTray` + <PageTray> exactly as the five real hosts do.
//
// The canvas half is replaced through the hook's seams (jsdom has none); the GUARD is the
// real `checkUploadFile`, so "compress BEFORE the size check" is asserted against the
// real 3 MB wall, not a stub of it.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import PageTray, { usePageTray, type TrayPayload, type UsePageTrayOptions } from "./PageTray";
import {
  MAX_UPLOAD_IMAGE_BYTES,
  MAX_UPLOAD_PDF_BYTES,
  TOO_MANY_PAGES_MESSAGE,
  checkUploadFile,
} from "../../services/uploadLimits";
import type { DecodedPhoto, PreparedPhoto } from "../../services/preparePhoto";
import type { AssembledPdf, PdfPageInput } from "../../services/assemblePagesPdf";

const SIX_MB = 6 * 1024 * 1024;
const photo = (name: string, size = SIX_MB) =>
  new File([new Uint8Array(size)], name, { type: "image/jpeg" });

function fakeDecoded(file: File): DecodedPhoto {
  return {
    file,
    source: {} as CanvasImageSource,
    geometry: { sourceWidth: 4000, sourceHeight: 3000, orientation: 1 },
    fileOrientation: 1,
    release: vi.fn(),
  };
}

/** A prepared photo whose base64 decodes to `bytes` and names its source file. */
function fakePrepared(file: File, opts: { crop?: unknown; rotation?: number } = {}): PreparedPhoto {
  // 48 plain chars -> exactly 64 base64 chars, no padding, so the filler that follows
  // keeps the whole string valid base64 (the guard decodes it).
  const tag = btoa(`${file.name}|r${opts.rotation ?? 0}|${opts.crop ? "crop" : "whole"}|`.padEnd(48, "."));
  const bytes = 700 * 1024;
  const pad = "A".repeat(Math.ceil(bytes / 3) * 4 - tag.length);
  return {
    base64: tag + pad,
    mimeType: "image/jpeg",
    width: opts.rotation === 90 ? 1500 : 2000,
    height: opts.rotation === 90 ? 2000 : 1500,
    bytes,
    quality: 0.85,
    passthrough: false,
  };
}

const sourceName = (b64: string) => atob(b64.slice(0, 64)).split("|")[0];

let seams: Required<Pick<UsePageTrayOptions, "decode" | "prepare" | "thumb" | "assemble" | "renderPreview">>;
let assembled: PdfPageInput[][];

beforeEach(() => {
  assembled = [];
  seams = {
    decode: vi.fn(async (f: File) => fakeDecoded(f)),
    prepare: vi.fn(async (p: DecodedPhoto, o) => fakePrepared(p.file, o as never)),
    thumb: vi.fn((p: DecodedPhoto) => `data:image/jpeg;base64,THUMB-${p.file.name}`),
    assemble: vi.fn(async (pages: PdfPageInput[]): Promise<AssembledPdf> => {
      assembled.push(pages);
      const names = pages.map((p) => sourceName(p.base64)).join(",");
      const b64 = btoa(`%PDF-1.3 ${names}`);
      return { base64: b64, bytes: atob(b64).length, pageCount: pages.length, pages: [] };
    }),
    renderPreview: vi.fn(() => ({ url: "data:image/jpeg;base64,PREVIEW" })),
  };
});

const payloads: Array<TrayPayload | null> = [];
const errors: Array<string | null> = [];
const checked: File[] = [];

function Host({ allowMultiPage = true, failDecode = false }: { allowMultiPage?: boolean; failDecode?: boolean }) {
  const [last, setLast] = useState<TrayPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const tray = usePageTray({
    check: (file) => {
      checked.push(file);
      return checkUploadFile(file, "answers");
    },
    onPayload: (p) => {
      payloads.push(p);
      setLast(p);
    },
    onError: (m) => {
      errors.push(m);
      setErr(m);
    },
    allowMultiPage,
    ...seams,
    ...(failDecode ? { decode: async () => Promise.reject(new Error("no canvas")) } : {}),
  });
  return (
    <div>
      <input
        data-testid="host-input"
        type="file"
        multiple
        onChange={(e) => tray.addFiles(e.target.files ? Array.from(e.target.files) : [])}
      />
      <PageTray tray={tray} />
      <output data-testid="host-payload">{last ? `${last.imageMimeType}|${last.pageCount}|${last.name}` : "none"}</output>
      <output data-testid="host-error">{err ?? ""}</output>
    </div>
  );
}

function pick(files: File[]) {
  const input = screen.getByTestId("host-input");
  Object.defineProperty(input, "files", { value: files, configurable: true });
  fireEvent.change(input);
}

async function confirmWhole() {
  fireEvent.click(await screen.findByTestId("pcs-confirm"));
}

beforeEach(() => {
  payloads.length = 0;
  errors.length = 0;
  checked.length = 0;
});

describe("(a)(j) one photo: crop step -> compressed -> the guard -> a single JPEG", () => {
  it("★ a 6 MB photo opens the crop step, 'Use whole photo' is ONE tap, and the upload is a JPEG under the cap", async () => {
    render(<Host />);
    pick([photo("answer.jpg")]);
    const confirm = await screen.findByTestId("pcs-confirm");
    expect(confirm.textContent).toBe("Use whole photo");
    fireEvent.click(confirm);

    await waitFor(() => expect(screen.getByTestId("host-payload").textContent).toBe("image/jpeg|1|answer.jpg"));
    // The guard ran on the COMPRESSED bytes, not the 6 MB original.
    const sent = checked[checked.length - 1];
    expect(sent.size).toBeLessThan(MAX_UPLOAD_IMAGE_BYTES);
    expect(checked.some((f) => f.size === SIX_MB)).toBe(false);
    // (j) one page never builds a PDF — jspdf is not even loaded.
    expect(seams.assemble).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("page-tray-item")).toHaveLength(1);
  });

  it("Rotate + crop reach the prepare step (the crop step's selection is what is encoded)", async () => {
    render(<Host />);
    pick([photo("sideways.jpg")]);
    await screen.findByTestId("pcs-confirm");
    fireEvent.click(screen.getByRole("button", { name: /Rotate/ }));
    await confirmWhole();
    await waitFor(() => expect(seams.prepare).toHaveBeenCalled());
    expect(vi.mocked(seams.prepare).mock.calls[0][1]).toEqual({ crop: undefined, rotation: 90 });
  });

  it("re-crop from the tray reopens the step with the page's rotation kept", async () => {
    render(<Host />);
    pick([photo("p.jpg")]);
    await screen.findByTestId("pcs-confirm");
    fireEvent.click(screen.getByRole("button", { name: /Rotate/ }));
    await confirmWhole();
    await screen.findByTestId("page-tray");
    fireEvent.click(screen.getByRole("button", { name: /Page 1 — tap to crop or rotate/ }));
    await screen.findByText("Adjust this page");
    await confirmWhole();
    await waitFor(() => expect(seams.prepare).toHaveBeenCalledTimes(2));
    expect(vi.mocked(seams.prepare).mock.calls[1][1]).toEqual({ crop: undefined, rotation: 90 });
    expect(screen.getAllByTestId("page-tray-item")).toHaveLength(1);
  });
});

describe("several pages -> ONE PDF", () => {
  async function addPages(names: string[]) {
    for (const n of names) {
      if (screen.queryByTestId("page-tray-add")) {
        // The tray's own "Add another page" input (no capture: camera OR gallery).
        const addInput = document.querySelector(".lt-pt__file") as HTMLInputElement;
        Object.defineProperty(addInput, "files", { value: [photo(n)], configurable: true });
        fireEvent.change(addInput);
      } else {
        pick([photo(n)]);
      }
      await confirmWhole();
      await waitFor(() => expect(screen.queryByTestId("photo-crop-step")).toBeNull());
    }
  }

  it("2+ pages are assembled into ONE application/pdf, in tray order", async () => {
    render(<Host />);
    await addPages(["p1.jpg", "p2.jpg", "p3.jpg"]);
    await waitFor(() =>
      expect(screen.getByTestId("host-payload").textContent).toBe("application/pdf|3|3 pages (one PDF)"),
    );
    const last = assembled[assembled.length - 1];
    expect(last.map((p) => sourceName(p.base64))).toEqual(["p1.jpg", "p2.jpg", "p3.jpg"]);
  });

  it("(i) reorder and delete change the order the PDF is built in", async () => {
    render(<Host />);
    await addPages(["a.jpg", "b.jpg", "c.jpg"]);
    await waitFor(() => expect(screen.getByTestId("host-payload").textContent).toMatch(/application\/pdf\|3/));

    fireEvent.click(screen.getByRole("button", { name: "Move page 3 earlier" }));
    await waitFor(() =>
      expect(assembled[assembled.length - 1].map((p) => sourceName(p.base64))).toEqual(["a.jpg", "c.jpg", "b.jpg"]),
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove page 1" }));
    await waitFor(() =>
      expect(assembled[assembled.length - 1].map((p) => sourceName(p.base64))).toEqual(["c.jpg", "b.jpg"]),
    );
    await waitFor(() => expect(screen.getByTestId("host-payload").textContent).toBe("application/pdf|2|2 pages (one PDF)"));

    // Back to one page -> back to a single JPEG (j).
    fireEvent.click(screen.getByRole("button", { name: "Remove page 2" }));
    await waitFor(() => expect(screen.getByTestId("host-payload").textContent).toBe("image/jpeg|1|c.jpg"));
  });

  it("(h) at most 8 pages: the 9th is refused with the message", async () => {
    render(<Host />);
    // 8 at once (a desktop multi-select), then one more tap.
    await act(async () => {
      pick(Array.from({ length: 8 }, (_, i) => photo(`p${i + 1}.jpg`)));
    });
    await waitFor(() => expect(screen.getAllByTestId("page-tray-item")).toHaveLength(8));
    fireEvent.click(screen.getByTestId("page-tray-add"));
    expect(await screen.findByText(TOO_MANY_PAGES_MESSAGE)).toBeTruthy();
    expect(TOO_MANY_PAGES_MESSAGE).toBe("That's a lot — check these 8 first, then the rest");
    expect(screen.getAllByTestId("page-tray-item")).toHaveLength(8);
  });

  it("(h) picking 10 at once keeps the first 8 and says so", async () => {
    render(<Host />);
    await act(async () => {
      pick(Array.from({ length: 10 }, (_, i) => photo(`q${i + 1}.jpg`)));
    });
    await waitFor(() => expect(screen.getAllByTestId("page-tray-item")).toHaveLength(8));
    expect(screen.getByText(TOO_MANY_PAGES_MESSAGE)).toBeTruthy();
  });

  it("(l) a 3-image desktop multi-select becomes 3 tray pages in selection order", async () => {
    render(<Host />);
    await act(async () => {
      pick([photo("first.jpg"), photo("second.jpg"), photo("third.jpg")]);
    });
    await waitFor(() => expect(screen.getAllByTestId("page-tray-item")).toHaveLength(3));
    const thumbs = Array.from(document.querySelectorAll(".lt-pt__thumb img")).map((i) => i.getAttribute("src"));
    expect(thumbs).toEqual([
      "data:image/jpeg;base64,THUMB-first.jpg",
      "data:image/jpeg;base64,THUMB-second.jpg",
      "data:image/jpeg;base64,THUMB-third.jpg",
    ]);
    // No crop step for a multi-select — every page stays re-croppable from the tray.
    expect(screen.queryByTestId("photo-crop-step")).toBeNull();
    await waitFor(() =>
      expect(assembled[assembled.length - 1].map((p) => sourceName(p.base64))).toEqual([
        "first.jpg",
        "second.jpg",
        "third.jpg",
      ]),
    );
  });

  it("a path that cannot take a PDF (collect mode) never offers 'Add another page'", async () => {
    render(<Host allowMultiPage={false} />);
    pick([photo("only.jpg")]);
    await confirmWhole();
    await screen.findByTestId("page-tray");
    expect(screen.queryByTestId("page-tray-add")).toBeNull();
  });
});

describe("(b)(c) PDFs and wrong types; the honest degrade", () => {
  it("(b) an oversized PDF is still refused with its message", async () => {
    render(<Host />);
    pick([new File([new Uint8Array(MAX_UPLOAD_PDF_BYTES + 10)], "big.pdf", { type: "application/pdf" })]);
    await waitFor(() => expect(screen.getByTestId("host-error").textContent).toMatch(/the limit is 3\.5 MB/));
    expect(screen.getByTestId("host-payload").textContent).toBe("none");
  });

  it("a PDF within the limit goes as-is (no crop, no tray)", async () => {
    render(<Host />);
    pick([new File([new Uint8Array(1024)], "scan.pdf", { type: "application/pdf" })]);
    await waitFor(() => expect(screen.getByTestId("host-payload").textContent).toBe("application/pdf|0|scan.pdf"));
    expect(screen.queryByTestId("photo-crop-step")).toBeNull();
  });

  it("(c) a non-image, non-PDF gets the type message", async () => {
    render(<Host />);
    pick([new File(["x"], "notes.txt", { type: "text/plain" })]);
    await waitFor(() =>
      expect(screen.getByTestId("host-error").textContent).toBe(
        "Upload a PDF (recommended) or a JPG/PNG image of your answers.",
      ),
    );
  });

  it("a device that cannot decode the photo falls back to the original through the same guard", async () => {
    render(<Host failDecode />);
    pick([photo("small.jpg", 200 * 1024)]);
    await waitFor(() => expect(screen.getByTestId("host-payload").textContent).toBe("image/jpeg|0|small.jpg"));
  });

  it("…and a big photo it cannot decode is refused in a student's words", async () => {
    render(<Host failDecode />);
    pick([photo("huge.jpg")]);
    await waitFor(() =>
      expect(screen.getByTestId("host-error").textContent).toMatch(/Try a closer photo of just your answer/),
    );
  });
});

describe("(m) the crop step and the tray render at 360 and 1440 px", () => {
  for (const width of [360, 1440]) {
    it(`at ${width}px: every crop control and every tray control is present`, async () => {
      window.innerWidth = width;
      window.dispatchEvent(new Event("resize"));
      render(<Host />);
      pick([photo("a.jpg")]);
      await screen.findByTestId("photo-crop-step");
      for (const h of ["nw", "ne", "sw", "se"]) expect(screen.getByTestId(`pcs-grab-${h}`)).toBeTruthy();
      expect(screen.getByRole("button", { name: /Rotate/ })).toBeTruthy();
      expect(screen.getByTestId("pcs-confirm")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
      // The modal is a dialog over the host page.
      expect(screen.getByRole("dialog", { name: "Crop your photo" })).toBeTruthy();
      // The drag surface claims the gesture from the page scroll on a phone.
      expect(Array.from(document.querySelectorAll("style")).map((s) => s.textContent).join("\n")).toMatch(
        /\.lt-pcs__crop \{[^}]*touch-action: none/,
      );
      await confirmWhole();
      await screen.findByTestId("page-tray");
      expect(screen.getByTestId("page-tray-add")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Remove page 1" })).toBeTruthy();
      // The strip scrolls sideways on a phone; the sheet goes full-screen under 480px.
      const css = Array.from(document.querySelectorAll("style")).map((s) => s.textContent).join("\n");
      expect(css).toMatch(/\.lt-pt__strip \{[^}]*overflow-x: auto/);
      expect(css).toMatch(/@media \(max-width: 480px\)/);
    });
  }
});

// ── UPLOAD-2-FIX-1 — "Add another page" must offer the camera on a phone ─────────────
//
// On Android Chrome an input with `multiple` opens a picker with NO camera. So a coarse
// pointer gets TWO inputs, one job each; a fine pointer keeps the one `multiple` input.
// jsdom has no matchMedia, so each case stubs the pointer it is about.

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

function feed(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, "files", { value: files, configurable: true });
  fireEvent.change(input);
}

async function onePage() {
  pick([photo("p1.jpg")]);
  await confirmWhole();
  await screen.findByTestId("page-tray");
  await waitFor(() => expect(screen.queryByTestId("photo-crop-step")).toBeNull());
}

describe("UPLOAD-2-FIX-1 — camera OR gallery for the next page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("★ (a) coarse pointer: a camera input (capture=environment, NO multiple) AND a gallery input WITH multiple", async () => {
    stubPointer(true);
    render(<Host />);
    await onePage();

    expect(screen.queryByTestId("page-tray-add")).toBeNull();
    expect(screen.getByRole("button", { name: "Take photo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose from gallery" })).toBeTruthy();

    const camera = screen.getByTestId("page-tray-camera-input") as HTMLInputElement;
    expect(camera.getAttribute("type")).toBe("file");
    expect(camera.getAttribute("accept")).toBe("image/*");
    expect(camera.getAttribute("capture")).toBe("environment");
    expect(camera.hasAttribute("multiple")).toBe(false);
    expect(camera.multiple).toBe(false);

    const gallery = screen.getByTestId("page-tray-add-input") as HTMLInputElement;
    expect(gallery.getAttribute("accept")).toBe("image/jpeg,image/png");
    expect(gallery.multiple).toBe(true);
    expect(gallery.hasAttribute("capture")).toBe(false);

    // Each button opens ITS input — never the other one.
    const clicked: string[] = [];
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) {
      clicked.push(this.getAttribute("data-testid") ?? "?");
    });
    fireEvent.click(screen.getByTestId("page-tray-camera"));
    fireEvent.click(screen.getByTestId("page-tray-gallery"));
    expect(clicked).toEqual(["page-tray-camera-input", "page-tray-add-input"]);
  });

  it("★ (b) fine pointer (desktop) is unchanged: ONE button, ONE input, multiple, no capture", async () => {
    stubPointer(false);
    render(<Host />);
    await onePage();

    expect(screen.getByTestId("page-tray-add").textContent).toBe("+ Add another page");
    expect(screen.queryByTestId("page-tray-camera")).toBeNull();
    expect(screen.queryByTestId("page-tray-gallery")).toBeNull();
    expect(screen.queryByTestId("page-tray-camera-input")).toBeNull();
    const tray = screen.getByTestId("page-tray");
    const inputs = tray.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(1);
    const only = inputs[0] as HTMLInputElement;
    expect(only.multiple).toBe(true);
    expect(only.hasAttribute("capture")).toBe(false);
  });

  it("★ (c) a photo from EITHER input lands in the tray through the crop step", async () => {
    stubPointer(true);
    render(<Host />);
    await onePage();

    feed(screen.getByTestId("page-tray-camera-input") as HTMLInputElement, [photo("cam.jpg")]);
    expect(await screen.findByTestId("photo-crop-step")).toBeTruthy();
    await confirmWhole();
    await waitFor(() => expect(screen.getAllByTestId("page-tray-item")).toHaveLength(2));

    feed(screen.getByTestId("page-tray-add-input") as HTMLInputElement, [photo("gal.jpg")]);
    expect(await screen.findByTestId("photo-crop-step")).toBeTruthy();
    await confirmWhole();
    await waitFor(() => expect(screen.getAllByTestId("page-tray-item")).toHaveLength(3));

    await waitFor(() =>
      expect(assembled[assembled.length - 1].map((p) => sourceName(p.base64))).toEqual(["p1.jpg", "cam.jpg", "gal.jpg"]),
    );
  });

  it("★ (d) the 8-page cap holds on BOTH choices", async () => {
    stubPointer(true);
    render(<Host />);
    await act(async () => {
      pick(Array.from({ length: 8 }, (_, i) => photo(`p${i + 1}.jpg`)));
    });
    await waitFor(() => expect(screen.getAllByTestId("page-tray-item")).toHaveLength(8));

    const clicked: string[] = [];
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) {
      clicked.push(this.getAttribute("data-testid") ?? "?");
    });
    fireEvent.click(screen.getByTestId("page-tray-camera"));
    expect(await screen.findByText(TOO_MANY_PAGES_MESSAGE)).toBeTruthy();
    fireEvent.click(screen.getByTestId("page-tray-gallery"));
    expect(clicked).toEqual([]); // neither picker opened at the cap

    // And a file that arrives anyway (either input) is refused, the 8 kept.
    feed(screen.getByTestId("page-tray-camera-input") as HTMLInputElement, [photo("ninth.jpg")]);
    feed(screen.getByTestId("page-tray-add-input") as HTMLInputElement, [photo("tenth.jpg")]);
    expect(screen.queryByTestId("photo-crop-step")).toBeNull();
    expect(screen.getAllByTestId("page-tray-item")).toHaveLength(8);
    expect(screen.getByText(TOO_MANY_PAGES_MESSAGE)).toBeTruthy();
  });
});
