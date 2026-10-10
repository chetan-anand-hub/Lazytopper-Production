// TUTOR-FIX-1 — a tutor turn the model stopped at its token limit shows ONE honest note under
// the reply ("This answer was cut short. Ask me to continue."); a complete turn shows none.
// The session hook is mocked so the test drives the renderer with exact turns.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { TutorTurn } from "../../ai/tutorClient";

const H = vi.hoisted(() => ({ messages: [] as TutorTurn[] }));

vi.mock("./useTutorSession", () => ({
  useTutorSession: () => ({
    opener: { text: "Hi", forks: [] },
    messages: H.messages,
    status: "idle",
    error: null,
    started: H.messages.length > 0,
    canRoundTrip: true,
    pending: null,
    returnFollow: null,
    send: () => {},
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

const NOTE = "This answer was cut short. Ask me to continue.";
const mount = () =>
  render(
    <MemoryRouter initialEntries={["/tutor/10/science/electricity"]}>
      <Routes>
        <Route path="/tutor/:grade/:subject/:topicKey" element={<TutorPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  H.messages = [];
});

describe("TUTOR-FIX-1 — honest cut-off note", () => {
  it("a truncated tutor turn renders the note once, under that reply", () => {
    H.messages = [
      { role: "user", content: "Why does R double?" },
      { role: "tutor", content: "Resistance depends on length because", truncated: true },
    ];
    mount();
    const notes = screen.getAllByText(NOTE);
    expect(notes).toHaveLength(1);
    expect(notes[0].closest(".lt-tutor__t")?.textContent).toContain("Resistance depends on length because");
  });

  it("a complete tutor turn renders no note", () => {
    H.messages = [
      { role: "user", content: "Why does R double?" },
      { role: "tutor", content: "Because R = ρl/A, so doubling l doubles R." },
    ];
    mount();
    expect(screen.queryByText(NOTE)).toBeNull();
  });
});
