// GUIDE-FILTER-1 — LIVE DEFECT (23 Oct 2026): a link with a preset style the chosen chapter holds
// NONE of landed on "0 questions / No questions match" with that chip active, although the panel
// hides the Proof / Derivation chip for that chapter:
//   /practice/10/Science?topic=magnetic-effects-of-electric-current&count=10&style=proof
// FILTER-FIX-1's "a preset Proof resets to all" lived only in the filter PANEL, which a targeted
// link (explicit topic) never shows: it auto-builds. RED on trunk 6fe85765: the built set shows the
// "Proof / Derivation" badge and the filters-empty state.

import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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

import PracticePage from "./PracticePage";
import { buildChapterServedPool } from "../components/practice/practiceQuestionBuilder";
import { practiceTopicLabel } from "../components/practice/cbqAvailability";
import { ensureBankChapters } from "../data/bankChapters/loader";
import { filtersTheChapterLacks, isProofOrDerivation } from "../components/practice/practiceFilters";
import type { PracticeQuestion } from "../data/predictionDataService";

let magProofs = -1;
let elecProofs = -1;

beforeAll(async () => {
  const mag = practiceTopicLabel("Science", "magnetic-effects-of-electric-current");
  const elec = practiceTopicLabel("Science", "electricity");
  await ensureBankChapters([mag, elec]);
  magProofs = buildChapterServedPool({ subjectKey: "Science", topicKey: mag }).filter(isProofOrDerivation).length;
  elecProofs = buildChapterServedPool({ subjectKey: "Science", topicKey: elec }).filter(isProofOrDerivation).length;
}, 90000);

afterEach(() => cleanup());

function Loc() {
  const l = useLocation();
  return <output data-testid="loc">{l.search}</output>;
}

function open(url: string) {
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="*" element={null} />
      </Routes>
      <Loc />
    </MemoryRouter>,
  );
}

describe("GUIDE-FILTER-1 · a URL / preset filter the chapter holds none of falls back to All", () => {
  it("★★ RED on trunk: Magnetic Effects + style=proof → a real set, no Proof badge, no filters-empty, URL cleaned", async () => {
    expect(magProofs).toBe(0); // the premise: the panel hides the Proof chip on this chapter
    open("/practice/10/Science?topic=magnetic-effects-of-electric-current&count=10&style=proof");
    const cards = await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    expect(cards.length).toBeGreaterThan(0);
    expect(screen.queryByTestId("qp-chip-style")).toBeNull();
    expect(screen.queryByTestId("qp-filters-empty")).toBeNull();
    const search = screen.getByTestId("loc").textContent ?? "";
    expect(search).not.toMatch(/style=/);
    expect(search).toMatch(/topic=magnetic-effects-of-electric-current/);
    expect(search).toMatch(/count=10/);
  }, 120000);

  it("★ CONTROL: Electricity + style=proof keeps the Proof / Derivation filter (the chapter has them)", async () => {
    expect(elecProofs).toBeGreaterThan(0);
    open("/practice/10/Science?topic=electricity&count=5&style=proof");
    await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    expect(screen.getByTestId("qp-chip-style")).toHaveTextContent("Proof / Derivation");
    expect(screen.getByTestId("loc").textContent ?? "").toMatch(/style=proof/);
  }, 120000);
});

describe("GUIDE-FILTER-1 · filtersTheChapterLacks — only what the chapter holds NONE of", () => {
  const q = (o: Record<string, unknown>) => ({ id: "gen-1", subject: "Maths", ...o }) as unknown as PracticeQuestion;
  const pool = [q({ difficulty: "Easy", pyqYear: 2023, section: "B" }), q({ id: "rn-n-2", difficulty: "Hard", bloomSkill: "Analysing", section: "C" })];

  it("a value with no row at all resets; one the chapter holds does not", () => {
    expect(filtersTheChapterLacks(pool, { style: "proof", source: "others", diff: "Medium" })).toEqual({ style: true, source: true, diff: true });
    expect(filtersTheChapterLacks(pool, { style: "hots", source: "pyq", diff: "Easy" })).toEqual({ style: false, source: false, diff: false });
  });

  it("an empty COMBINATION is not reset (that is the honest filters-empty state)", () => {
    // PYQ exists, Hard exists, but no Hard PYQ: each row on its own is held, so nothing resets.
    expect(filtersTheChapterLacks(pool, { style: "all", source: "pyq", diff: "Hard" })).toEqual({ style: false, source: false, diff: false });
  });

  it("CBQ is exempt (its own honest landing); 'all' and an unloaded (empty) pool never reset", () => {
    expect(filtersTheChapterLacks(pool, { style: "cbq", source: "all", diff: "all" }).style).toBe(false);
    expect(filtersTheChapterLacks([], { style: "proof", source: "pyq", diff: "Hard" })).toEqual({ style: false, source: false, diff: false });
  });
});
