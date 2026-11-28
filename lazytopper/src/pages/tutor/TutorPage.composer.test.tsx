// TUTOR-INPUT-1 - the composer is an auto-growing textarea; the student bubble is a block that
// never paints a line over the previous one. Session hook mocked (same pattern as conceptArrival).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { TutorTurn } from "../../ai/tutorClient";
import { setMatchMediaMatches } from "../../test/setup";

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
// The price tag reads the clock (GST-EXCL-1); this file is about the composer, so pin it and leave the CI clock manifest alone.
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

beforeEach(() => {
  H.messages = [];
  H.send.mockClear();
});
afterEach(() => {
  cleanup();
  setMatchMediaMatches(false);
});

describe("TUTOR-INPUT-1", () => {
  it("composer is a textarea with the short placeholder", () => {
    mount();
    const box = screen.getByRole("textbox");
    expect(box.tagName).toBe("TEXTAREA");
    expect((box as HTMLTextAreaElement).placeholder).toBe("Ask a doubt — English, Hindi or Hinglish");
    expect(box.getAttribute("aria-label")).toMatch(/^Ask about /);
  });

  it("desktop (fine pointer): Enter sends, Shift+Enter does not", () => {
    setMatchMediaMatches((q) => q.includes("pointer: fine"));
    mount();
    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "What is refraction?" } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(H.send).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(H.send).toHaveBeenCalledWith("What is refraction?");
  });

  it("touch device: Enter does not send (newline); the Send button sends", () => {
    setMatchMediaMatches(false);
    mount();
    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "line one\nline two" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(H.send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(H.send).toHaveBeenCalledWith("line one\nline two");
  });

  it("student bubble is a block bubble and shows trimmed text", () => {
    H.messages = [
      { role: "user", content: "  first line\nsecond line  \n" },
      { role: "tutor", content: "ok" },
    ];
    mount();
    const span = document.querySelector(".lt-tutor__s span") as HTMLElement;
    expect(span.textContent).toBe("first line\nsecond line");
    const css = Array.from(document.querySelectorAll("style")).map((s) => s.textContent).join("\n");
    expect(css).toMatch(/\.lt-tutor__s span \{[^}]*display: block;/);
    expect(css).toMatch(/\.lt-tutor__s span \{[^}]*max-width: 82%;/);
    expect(css).toMatch(/\.lt-tutor__s span \{[^}]*white-space: pre-wrap;/);
  });
});
