// GUIDE-FILTER-1 — LIVE DEFECT (23 Oct 2026): a link with a preset style the chosen chapter holds
// NONE of landed on "0 questions / No questions match" with that chip active, although the panel
// hides the Proof / Derivation chip for that chapter:
//   /practice/10/Science?topic=magnetic-effects-of-electric-current&count=10&style=proof
// FILTER-FIX-1's "a preset Proof resets to all" lived only in the filter PANEL, which a targeted
// link (explicit topic) never shows: it auto-builds. RED on trunk 6fe85765: the built set shows the
// "Proof / Derivation" badge and the filters-empty state.

import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, act, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useNavigationType } from "react-router-dom";
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
import { droppedFilterNote } from "../components/practice/PracticeControls";
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
  const nav = useNavigationType();
  return <output data-testid="loc" data-nav={nav}>{l.search}</output>;
}

/** #1302 review: records whether the filters-empty state (or Ziggy) EVER reached the DOM. */
function watchForEmptyFlash() {
  const seen = { empty: false };
  const check = () => {
    if (document.querySelector('[data-testid="qp-filters-empty"], [data-testid="filter-empty-ziggy-slot"]')) seen.empty = true;
  };
  const mo = new MutationObserver(check);
  mo.observe(document.body, { childList: true, subtree: true });
  return { seen, stop: () => mo.disconnect() };
}

/** A link to the ORIGINAL url, tapped again from the fallen-back page (a new PUSH navigation). */
function TapLink({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" data-testid="tap-link" onClick={() => navigate(to)}>
      again
    </button>
  );
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
      <TapLink to={url} />
    </MemoryRouter>,
  );
}

describe("GUIDE-FILTER-1 · a URL / preset filter the chapter holds none of falls back to All", () => {
  it("★★ RED on trunk: Magnetic Effects + style=proof → a real set, no Proof badge, no filters-empty, URL cleaned", async () => {
    expect(magProofs).toBe(0); // the premise: the panel hides the Proof chip on this chapter
    const flash = watchForEmptyFlash();
    open("/practice/10/Science?topic=magnetic-effects-of-electric-current&count=10&style=proof");
    const cards = await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    flash.stop();
    expect(cards.length).toBeGreaterThan(0);
    expect(screen.queryByTestId("qp-chip-style")).toBeNull();
    expect(screen.queryByTestId("qp-filters-empty")).toBeNull();
    // #1302 review: no one-build flash of "No questions match" / Ziggy before the fallback lands.
    expect(flash.seen.empty).toBe(false);
    const loc = screen.getByTestId("loc");
    // #1302 review: the URL clean-up REPLACES the entry (no extra history step for back).
    expect(loc.getAttribute("data-nav")).toBe("REPLACE");
    const search = loc.textContent ?? "";
    expect(search).not.toMatch(/style=/);
    expect(search).toMatch(/topic=magnetic-effects-of-electric-current/);
    expect(search).toMatch(/count=10/);
    // #1302 review: the honest line says what was dropped.
    expect(screen.getByTestId("qp-filter-dropped").textContent).toBe(
      "No Proof / Derivation questions in this chapter — showing a mixed set.",
    );
  }, 120000);

  it("★★ #1302 re-review: marks=1&style=proof — the line says 'all question types', not 'a mixed set' (the set is still 1-mark)", async () => {
    open("/practice/10/Science?topic=magnetic-effects-of-electric-current&count=10&marks=1&style=proof");
    await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    expect(screen.getByTestId("qp-chip-marks")).toHaveTextContent("1 mark");
    expect(screen.getByTestId("qp-filter-dropped").textContent).toBe(
      "No Proof / Derivation questions in this chapter — showing all question types.",
    );
  }, 120000);

  it("★★ #1302 re-review: tapping the SAME link again on the fallen-back page builds a fresh set and cleans the URL again", async () => {
    const LINK = "/practice/10/Science?topic=magnetic-effects-of-electric-current&count=10&style=proof";
    open(LINK);
    const first = await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    const firstCard = first[0];
    expect(screen.getByTestId("loc").textContent ?? "").not.toMatch(/style=/);
    // The student taps the original link again (a new PUSH navigation to the same URL).
    act(() => {
      fireEvent.click(screen.getByTestId("tap-link"));
    });
    // A fresh mount: the first card node is gone, a new set is built, and the URL is cleaned again.
    await waitFor(() => expect(firstCard.isConnected).toBe(false), { timeout: 60000 });
    const again = await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    expect(again[0]).not.toBe(firstCard);
    await waitFor(() => expect(screen.getByTestId("loc").textContent ?? "").not.toMatch(/style=/), { timeout: 60000 });
    expect(screen.getByTestId("qp-filter-dropped").textContent).toBe(
      "No Proof / Derivation questions in this chapter — showing a mixed set.",
    );
    // …and the clean-up itself still does not remount (the line survives; one more check after settle).
    const settled = screen.getAllByTestId("practice-question-card")[0];
    await new Promise((r) => setTimeout(r, 300));
    expect(settled.isConnected).toBe(true);
  }, 180000);

  it("★ CONTROL: Electricity + style=proof keeps the Proof / Derivation filter (the chapter has them)", async () => {
    expect(elecProofs).toBeGreaterThan(0);
    open("/practice/10/Science?topic=electricity&count=5&style=proof");
    await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    expect(screen.getByTestId("qp-chip-style")).toHaveTextContent("Proof / Derivation");
    expect(screen.getByTestId("loc").textContent ?? "").toMatch(/style=proof/);
    expect(screen.queryByTestId("qp-filter-dropped")).toBeNull();
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

  // The Difficulty fallback (engine difficulty reset) is a RENDERED test: PracticePage.diffFallback.test.tsx.

  it("#1302 review: the dropped-filter line names every dropped filter, and is true for the set built", () => {
    const proof = { row: "style" as const, label: "Proof / Derivation" };
    const pyq = { row: "source" as const, label: "Board exam (PYQ)" };
    expect(droppedFilterNote([])).toBeNull();
    // Nothing else narrows the set → a mixed set.
    expect(droppedFilterNote([proof])).toBe("No Proof / Derivation questions in this chapter — showing a mixed set.");
    expect(droppedFilterNote([proof, pyq], { multiChapter: true })).toBe(
      "No Proof / Derivation or Board exam (PYQ) questions in these chapters — showing a mixed set.",
    );
    // #1302 re-review: another filter still applies (e.g. marks=1) → only the dropped row widened.
    expect(droppedFilterNote([proof], { othersApply: true })).toBe(
      "No Proof / Derivation questions in this chapter — showing all question types.",
    );
    expect(droppedFilterNote([proof, pyq], { othersApply: true })).toBe(
      "No Proof / Derivation or Board exam (PYQ) questions in this chapter — showing all question types and sources.",
    );
    expect(droppedFilterNote([{ row: "diff", label: "Hard" }], { othersApply: true })).toBe(
      "No Hard questions in this chapter — showing all levels.",
    );
  });

  it("CBQ is exempt (its own honest landing); 'all' and an unloaded (empty) pool never reset", () => {
    expect(filtersTheChapterLacks(pool, { style: "cbq", source: "all", diff: "all" }).style).toBe(false);
    expect(filtersTheChapterLacks([], { style: "proof", source: "pyq", diff: "Hard" })).toEqual({ style: false, source: false, diff: false });
  });
});
