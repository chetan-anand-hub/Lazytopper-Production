// PRACTICE-HONESTY-1 §1 — "applies everywhere the card is used: Practice, Quick Practice,
// chapter, Topic Hub, CBQ sets". Every one of those surfaces routes into the ONE PracticePage
// (`/practice/:grade/:subject`), and the tutor's Quick Practice overlay mounts the same page.
// This suite enters the REAL page with the REAL bank through each surface's own URL and
// requires a built set whose EVERY card is locked (no "Show steps", the lock note shown).
//
// ★ CONTROL per entry: the set really built (cards > 0) — a page that rendered nothing would
// otherwise pass "no Show steps" vacuously.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within, waitFor } from "@testing-library/react";
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
  recordWrongAnswer: () => {},
}));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: () => {},
}));

import PracticePage from "./PracticePage";
import { __resetBankChaptersForTest } from "../data/bankChapters/loader";
import { buildDesktopConceptPracticePath } from "../lib/desktop/navigation";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetBankChaptersForTest();
  setMatchMediaMatches(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mount(url: string, overlay?: () => void) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/practice/:grade/:subject"
          element={overlay ? <PracticePage overlay={{ onClose: overlay }} /> : <PracticePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

async function expectEveryCardLocked() {
  await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
  // Re-query inside waitFor: a set can re-render (e.g. a top-up) after the first paint, and
  // a stale node reference would read "not in the document".
  await waitFor(() => {
    const cards = screen.getAllByTestId("practice-question-card");
    expect(cards.length).toBeGreaterThan(0); // CONTROL — a real set was built
    for (const c of cards) {
      expect(within(c).queryByTestId("steps-locked-note")).not.toBeNull();
      expect(within(c).queryByTestId("practice-mentor-cta")).toBeNull();
    }
  });
}

describe("PRACTICE-HONESTY-1 §1 · every practice host locks the steps", () => {
  it("★ chapter practice (?topic=)", async () => {
    mount("/practice/10/maths?topic=real-numbers");
    await expectEveryCardLocked();
  }, 120000);

  it("★ Quick Practice (preset chooser → Quick drill)", async () => {
    mount("/practice/10/maths?source=practice&topic=real-numbers");
    fireEvent.click(await screen.findByRole("button", { name: /Quick drill/i }, { timeout: 60000 }));
    fireEvent.click(screen.getByRole("button", { name: /Start practising/i }));
    await expectEveryCardLocked();
  }, 120000);

  it("★ Topic Hub (the concept-row practice path)", async () => {
    mount(
      buildDesktopConceptPracticePath({
        subject: "Maths",
        topic: "real-numbers",
        source: "topicHub",
        returnTo: "/topic-hub/maths/real-numbers",
        backLabel: "Back to Real Numbers",
      }),
    );
    await expectEveryCardLocked();
  }, 120000);

  it("★ CBQ sets (?style=cbq)", async () => {
    mount("/practice/10/maths?topic=surface-areas-and-volumes&style=cbq");
    await expectEveryCardLocked();
  }, 120000);

  it("★ the tutor's Quick Practice overlay (same page, overlay prop)", async () => {
    mount("/practice/10/maths?topic=real-numbers", () => {});
    await expectEveryCardLocked();
  }, 120000);
});
