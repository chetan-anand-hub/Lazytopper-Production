// TUTOR-IMAGE-1 - attach a photo to a Tutor message. Session hook mocked; the real upload step (usePageTray)
// runs in its honest-degrade path (jsdom cannot decode photos), which hands the original file through the guard.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { TutorTurn } from "../../ai/tutorClient";

const H = vi.hoisted(() => ({ messages: [] as TutorTurn[], send: vi.fn() }));

vi.mock("./useTutorSession", () => ({
  useTutorSession: () => ({
    opener: { text: "Opener text", forks: [] },
    messages: H.messages,
    status: "idle",
    error: null,
    started: H.messages.length > 0,
    canRoundTrip: true,
    pending: null,
    returnFollow: null,
    send: H.send,
    retry: () => {},
    openCheckImproveOverlay: () => {},
    checkImproveOverlayOpen: false,
    closeCheckImprove: () => {},
    openQuickPracticeOverlay: () => {},
    quickPracticeOverlayOpen: false,
    closeQuickPractice: () => {},
    quickPracticeHref: "",
    recheckPending: () => {},
    dismissPending: () => {},
  }),
}));
// The price tag reads the clock (GST-EXCL-1); this file is about the composer, so pin it and keep the CI clock manifest untouched.
vi.mock("../../lib/packs/packEntry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/packs/packEntry")>()),
  chapterPackPriceTag: () => "\u20b949",
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
import TutorPage from "./TutorPage";

const mount = () =>
  render(
    <MemoryRouter initialEntries={["/tutor/10/science/light-reflection-and-refraction"]}>
      <Routes>
        <Route path="/tutor/:grade/:subject/:topicKey" element={<TutorPage />} />
      </Routes>
    </MemoryRouter>,
  );

const jpeg = () => new File([new Uint8Array([255, 216, 255, 224, 1, 2, 3, 4])], "q.jpg", { type: "image/jpeg" });
async function attach(file: File) {
  const input = screen.getByTestId("tutor-attach-input") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  await screen.findByTestId("tutor-photo-preview");
}

beforeEach(() => {
  H.messages = [];
  H.send.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("TUTOR-IMAGE-1 composer", () => {
  it("attach shows a removable preview; Remove clears it and disables Send again", async () => {
    mount();
    expect(screen.getByRole("button", { name: "Send" })).toHaveProperty("disabled", true);
    await attach(jpeg());
    expect(screen.getByRole("button", { name: "Send" })).toHaveProperty("disabled", false);
    fireEvent.click(screen.getByTestId("tutor-photo-remove"));
    expect(screen.queryByTestId("tutor-photo-preview")).toBeNull();
    expect(screen.getByRole("button", { name: "Send" })).toHaveProperty("disabled", true);
  });

  it("photo with no text sends 'Please explain this question.' with the image; preview clears", async () => {
    mount();
    await attach(jpeg());
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(H.send).toHaveBeenCalledTimes(1);
    const [text, image] = H.send.mock.calls[0];
    expect(text).toBe("Please explain this question.");
    expect(image.imageMimeType).toBe("image/jpeg");
    expect(typeof image.imageBase64).toBe("string");
    expect(image.imageBase64.length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByTestId("tutor-photo-preview")).toBeNull());
  });

  it("photo with typed text sends that text", async () => {
    mount();
    await attach(jpeg());
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Which step is wrong?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(H.send.mock.calls[0][0]).toBe("Which step is wrong?");
    expect(H.send.mock.calls[0][1]).toBeTruthy();
  });

  it("a PDF is refused with a message and nothing attaches", async () => {
    mount();
    const pdf = new File([new Uint8Array([37, 80, 68, 70])], "q.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByTestId("tutor-attach-input"), { target: { files: [pdf] } });
    expect((await screen.findByTestId("tutor-photo-error")).textContent).toMatch(/photo \(JPG or PNG\)/);
    expect(screen.queryByTestId("tutor-photo-preview")).toBeNull();
  });

  it("the student's bubble shows the thumbnail after sending", () => {
    H.messages = [
      { role: "user", content: "Solve this", image: { imageBase64: "AAAA", imageMimeType: "image/jpeg" } },
      { role: "tutor", content: "ok" },
    ];
    mount();
    const img = document.querySelector(".lt-tutor__s img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("data:image/jpeg;base64,AAAA");
  });

  it("a restored thread (flag only, no bytes) shows 'Photo attached'", () => {
    H.messages = [
      { role: "user", content: "Solve this", hasImage: true },
      { role: "tutor", content: "ok" },
    ];
    mount();
    expect(document.querySelector(".lt-tutor__s img")).toBeNull();
    expect(screen.getByText("Photo attached")).toBeTruthy();
  });

  it("kill switch VITE_TUTOR_IMAGE_DISABLED=1 hides the attach button", () => {
    vi.stubEnv("VITE_TUTOR_IMAGE_DISABLED", "1");
    mount();
    expect(screen.queryByTestId("tutor-attach")).toBeNull();
    expect(screen.queryByTestId("tutor-attach-input")).toBeNull();
  });

  it("without the kill switch the attach button is there", () => {
    mount();
    expect(screen.getByTestId("tutor-attach")).toBeTruthy();
  });

  it("a message the session does not accept keeps the photo and the draft (no silent drop)", async () => {
    mount();
    await attach(jpeg());
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "still here" } });
    H.send.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(H.send).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("tutor-photo-preview")).toBeTruthy();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("still here");
  });

  it("the picker takes JPG and PNG only, like Answer Checker", () => {
    mount();
    expect(screen.getByTestId("tutor-attach-input").getAttribute("accept")).toBe("image/jpeg,image/png");
  });

  describe("TUTOR-PASTE-1 paste a screenshot", () => {
    const form = () => screen.getByTestId("tutor-attach").closest("form") as HTMLFormElement;
    const paste = (files: File[], text = "") =>
      fireEvent.paste(form(), { clipboardData: { files, getData: () => text, items: [] } });

    it("an image on the clipboard attaches through the tray and is intercepted", async () => {
      mount();
      const ev = new Event("paste", { bubbles: true, cancelable: true }) as Event & { clipboardData?: unknown };
      ev.clipboardData = { files: [jpeg()], getData: () => "", items: [] };
      form().dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
      await screen.findByTestId("tutor-photo-preview");
    });

    it("a second paste replaces the first photo", async () => {
      mount();
      paste([jpeg()]);
      await screen.findByTestId("tutor-photo-preview");
      paste([new File([new Uint8Array([255, 216, 255, 224, 9, 9])], "second.jpg", { type: "image/jpeg" })]);
      await waitFor(() => expect(screen.getAllByTestId("tutor-photo-preview").length).toBe(1));
    });

    it("text paste is not intercepted", () => {
      mount();
      const ev = new Event("paste", { bubbles: true, cancelable: true }) as Event & { clipboardData?: unknown };
      ev.clipboardData = { files: [], getData: () => "hello", items: [] };
      form().dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(false);
      expect(screen.queryByTestId("tutor-photo-preview")).toBeNull();
    });

    it("kill switch disables image paste", () => {
      vi.stubEnv("VITE_TUTOR_IMAGE_DISABLED", "1");
      mount();
      const f = document.querySelector("form.lt-tutor__composer") as HTMLFormElement;
      const ev = new Event("paste", { bubbles: true, cancelable: true }) as Event & { clipboardData?: unknown };
      ev.clipboardData = { files: [jpeg()], getData: () => "", items: [] };
      f.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(false);
      expect(screen.queryByTestId("tutor-photo-preview")).toBeNull();
    });

    it("short hint shows on every device, sits outside the Send row, and goes once a photo is attached", async () => {
      mount();
      const hint = screen.getByTestId("tutor-paste-hint");
      expect(hint.textContent).toBe("Photo or paste a screenshot");
      expect(hint.closest(".lt-tutor__cbar")).toBeNull();
      const css = Array.from(document.querySelectorAll("style")).map((n) => n.textContent).join("");
      expect(css).toMatch(/\.lt-tutor__phint \{[^}]*white-space: nowrap/);
      paste([jpeg()]);
      await screen.findByTestId("tutor-photo-preview");
      expect(screen.queryByTestId("tutor-paste-hint")).toBeNull();
    });

    it("kill switch hides the hint", () => {
      vi.stubEnv("VITE_TUTOR_IMAGE_DISABLED", "1");
      mount();
      expect(screen.queryByTestId("tutor-paste-hint")).toBeNull();
    });

    it("Android: an image exposed only as a clipboard ITEM still attaches", async () => {
      mount();
      const file = jpeg();
      const ev = new Event("paste", { bubbles: true, cancelable: true }) as Event & { clipboardData?: unknown };
      ev.clipboardData = { files: [], getData: () => "", items: [{ kind: "file", type: "image/jpeg", getAsFile: () => file }] };
      form().dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
      await screen.findByTestId("tutor-photo-preview");
    });

    it("a pasted image sends exactly what an attached one sends (same wire payload)", async () => {
      mount();
      await attach(jpeg());
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
      await waitFor(() => expect(screen.queryByTestId("tutor-photo-preview")).toBeNull());
      paste([jpeg()]);
      await screen.findByTestId("tutor-photo-preview");
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
      expect(H.send).toHaveBeenCalledTimes(2);
      expect(H.send.mock.calls[1]).toEqual(H.send.mock.calls[0]);
    });
  });
});
