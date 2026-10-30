// TUTOR-UX-1 (B) — a concept param on a RESTORED thread adds a display-only divider + two starter
// chips that fill (never send) the composer. Fresh-thread and no-concept paths are unchanged.
// The session hook is mocked so the test drives the renderer with exact turns.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

const OLD: TutorTurn[] = [
  { role: "user", content: "Explain refraction" },
  { role: "tutor", content: "Refraction is the bending of light as it changes medium." },
];
const mount = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/tutor/10/science/light-reflection-and-refraction${search}`]}>
      <Routes>
        <Route path="/tutor/:grade/:subject/:topicKey" element={<TutorPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  H.messages = [];
  H.send.mockClear();
});

describe("TUTOR-UX-1 (B) concept arrival", () => {
  it("restored thread + concept: divider after the old turns, two chips, tap fills the composer without sending", () => {
    H.messages = OLD;
    mount("?concept=Mirror%20formula&source=topicHub");
    const divider = screen.getByTestId("tutor-concept-divider");
    expect(divider.textContent).toBe("Now on: Mirror formula");
    // the divider sits after the last old turn
    const stream = divider.parentElement!;
    expect(stream.lastElementChild).toBe(divider);

    const chip = screen.getByRole("button", { name: "Explain Mirror formula simply" });
    expect(screen.getByRole("button", { name: "Where am I losing marks here?" })).toBeTruthy();
    fireEvent.click(chip);
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("Explain Mirror formula simply");
    expect(H.send).not.toHaveBeenCalled();
  });

  it("restored thread whose last turn is already about the concept: no divider, no chips", () => {
    H.messages = [...OLD, { role: "tutor", content: "The mirror formula is 1/v + 1/u = 1/f." }];
    mount("?concept=Mirror%20formula");
    expect(screen.queryByTestId("tutor-concept-divider")).toBeNull();
    expect(screen.queryByTestId("tutor-concept-starters")).toBeNull();
  });

  it("restored thread without a concept: nothing added", () => {
    H.messages = OLD;
    mount("");
    expect(screen.queryByTestId("tutor-concept-divider")).toBeNull();
    expect(screen.queryByTestId("tutor-concept-starters")).toBeNull();
  });

  it("fresh thread + concept keeps today's behaviour: the concept opener, no divider, no chips", () => {
    H.messages = [];
    mount("?concept=Mirror%20formula");
    expect(screen.getByText("Opener text")).toBeTruthy();
    expect(screen.queryByTestId("tutor-concept-divider")).toBeNull();
    expect(screen.queryByTestId("tutor-concept-starters")).toBeNull();
  });
});
