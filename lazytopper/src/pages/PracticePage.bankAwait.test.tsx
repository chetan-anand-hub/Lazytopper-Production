// BANK-SPLIT-1 PR-2 (L4) — route await guard: Practice.
//
// Practice reads the chosen topic's chapter from the per-chapter cache: the build effect
// awaits ensureBankChapters before it draws, and the two render-time previews wait for
// the chapter to land. This mounts the REAL page with the REAL engine on a cold cache and
// requires a real built set. Remove the build's await and the draw throws
// BankChapterNotLoadedError (the page shows its error, no questions); remove the preview
// gate and the render throws. Either is RED.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: false, status: { tier: "free" } }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/adaptivePracticeEngine", () => ({
  computeAdaptiveDifficultyMix: () => undefined,
  getWrongConceptsForTopic: () => [],
}));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: () => {},
}));

import PracticePage from "./PracticePage";
import { __resetBankChaptersForTest, isBankChapterLoaded } from "../data/bankChapters/loader";

beforeEach(() => {
  window.localStorage.clear();
  __resetBankChaptersForTest();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("L4 route await — Practice", () => {
  it("★ a cold topic visit loads the chapter, then builds a real set (no error, no throw)", async () => {
    setMatchMediaMatches(true);
    render(
      <MemoryRouter initialEntries={["/practice/10/maths?topic=triangles&count=5"]}>
        <Routes>
          <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(isBankChapterLoaded("triangles")).toBe(false);
    const triggers = await screen.findAllByRole(
      "button",
      { name: /^(Answer this question|Hide answer box)$/ },
      { timeout: 60000 },
    );
    expect(triggers.length).toBeGreaterThan(0);
    expect(screen.queryByText(/Could not generate practice questions/)).toBeNull();
    expect(isBankChapterLoaded("triangles")).toBe(true);
    // Exact slug + per-chapter: only the chapter the topic names.
    expect(isBankChapterLoaded("trigonometry")).toBe(false);
  }, 90000);
});
