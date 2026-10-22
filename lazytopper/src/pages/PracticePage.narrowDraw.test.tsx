// PracticePage — MLT-MUTE-2 · narrow filters over the REAL bank, through the REAL page.
//
// The bug lives in the bank undercount, so this file mounts the real PracticePage with the real
// engine and the real Real Numbers chapter (no builder mock). Expected counts are derived from the
// chapter's whole served pool with the page's own predicate (questionMatchesFilters), never
// hardcoded.
//
// RED on trunk:
//   · style=proof count=30 rendered 6 cards (a 30-question blueprint SAMPLE, then filtered) and
//     the end-of-bank note, while the chapter holds well over 30 proofs.
//   · proof+PYQ (genuinely short): the hero said "30 questions in this set".
//   · proof+PYQ+Hard (genuinely empty): the end-of-bank note, not a filters-empty state.
// CONTROL: the default board set is unchanged (10 cards, no note, no empty state).

import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "student-1", isLocalSession: false, email: "s@x.com" },
    loading: false,
    getToken: async () => "tok",
  }),
}));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: true, status: { tier: "premium" }, loading: false }),
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
  recordAttempt: () => "recorded",
}));
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return { ...actual, sessionRotationOffset: () => 0 };
});

import PracticePage, { questionMatchesFilters } from "./PracticePage";
import { buildChapterServedPool } from "../components/practice/practiceQuestionBuilder";
import { practiceTopicLabel } from "../components/practice/cbqAvailability";
import { ensureBankChapters } from "../data/bankChapters/loader";
import { FILTERS_EMPTY_TITLE } from "../components/practice/PracticeQuestionList";

let fullCount: (style: string, source: string, diff: string) => number = () => -1;

beforeAll(async () => {
  const label = practiceTopicLabel("Maths", "real-numbers");
  await ensureBankChapters([label]);
  const served = buildChapterServedPool({ subjectKey: "Maths", topicKey: label });
  fullCount = (style, source, diff) =>
    served.filter((q) => questionMatchesFilters(q, "all", style, source, diff, null)).length;
}, 90000);

afterEach(() => cleanup());

async function openReal(query: string) {
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[`/practice/10/maths?topic=real-numbers&${query}`]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

const heroText = () => screen.getByText(/in this set\./).textContent ?? "";

describe("MLT-MUTE-2 · real bank: a narrow filter draws from the whole chapter", () => {
  it("★★ RED on trunk: Real Numbers + proof + count 30 gives 30 proofs and no end-of-bank note", async () => {
    expect(fullCount("proof", "all", "all")).toBeGreaterThanOrEqual(30);
    await openReal("count=30&style=proof");
    await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    expect(screen.getAllByTestId("practice-question-card")).toHaveLength(30);
    expect(screen.queryByTestId("qp-bank-end")).toBeNull();
    expect(heroText()).toContain("30 questions in this set.");
    expect(screen.getByTestId("qp-chip-count")).toHaveTextContent("30 questions");
  }, 90000);

  it("★★ RED on trunk: a filter genuinely short in the bank (proof + PYQ) serves all of them, says so, and the header counts them", async () => {
    const n = fullCount("proof", "pyq", "all");
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(30);
    await openReal("count=30&style=proof&source=pyq");
    await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    expect(screen.getAllByTestId("practice-question-card")).toHaveLength(n);
    expect(await screen.findByTestId("qp-bank-end")).toBeInTheDocument();
    expect(heroText()).toContain(`${n} question${n === 1 ? "" : "s"} in this set.`);
    expect(heroText()).not.toContain("30 questions");
    expect(screen.getByTestId("qp-chip-count")).toHaveTextContent(`${n} question${n === 1 ? "" : "s"}`);
  }, 90000);

  it("★★ RED on trunk: 0 matches (proof + PYQ + Hard) gives the filters-empty state, not the end-of-bank note", async () => {
    expect(fullCount("proof", "pyq", "Hard")).toBe(0);
    await openReal("count=30&style=proof&diff=Hard&source=pyq");
    const empty = await screen.findByTestId("qp-filters-empty", {}, { timeout: 60000 });
    expect(empty).toHaveTextContent(FILTERS_EMPTY_TITLE);
    expect(screen.getByTestId("qp-filters-empty-edit")).toHaveTextContent("Edit filters");
    expect(screen.queryByTestId("qp-bank-end")).toBeNull();
    expect(screen.queryAllByTestId("practice-question-card")).toHaveLength(0);
    expect(heroText()).toContain("0 questions in this set.");
  }, 90000);

  it("★ CONTROL: the default board set is unchanged — 10 questions, no note, no empty state", async () => {
    await openReal("count=10");
    await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    expect(screen.getAllByTestId("practice-question-card")).toHaveLength(10);
    expect(screen.queryByTestId("qp-bank-end")).toBeNull();
    expect(screen.queryByTestId("qp-filters-empty")).toBeNull();
    expect(heroText()).toContain("10 questions in this set.");
  }, 90000);
});
