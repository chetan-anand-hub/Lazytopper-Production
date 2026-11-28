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
});
