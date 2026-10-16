// WEAK-AREA-DIRECT - a weak concept's Practise lands IN a Quick Practice set of EXACTLY that concept.
//
//   1. The concept URL (resolved at click time by conceptSetPath's `resolveConceptSetPath`, the
//      Topic Hub's focusBankIds + strictFocus path) makes the REAL page serve only rows Me counts
//      under that concept; Back reads "Back to Me / Progress" from the `?backLabel=` query.
//   2. The "My weak areas" card is ON the Quick Practice page, so its click is a SAME-ROUTE arrival:
//      the page must open the new set, not keep the chooser it was on (the page initialises from
//      the URL once per mount, so a new arrival remounts it - `practiceArrivalKey`).
//
// Mounts the REAL page with the REAL engine and reads the set it DISPLAYS through its own
// "copy a shareable link to this exact question set" control (as PracticePage.strictFocusExact).

import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
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

import PracticePage, { practiceArrivalKey } from "./PracticePage";
import { ensureBankChapters } from "../data/bankChapters/loader";
import { bankIndexEntries } from "../data/bankChapters/bankIdIndex";
import { conceptForSubtopic } from "../data/concepts/conceptLabelMap";
import { conceptSetClick, conceptSetPath, resolveConceptSetPath } from "../lib/desktop/conceptSetPath";

const CHAPTER = "real-numbers";
const CONCEPT = "Fundamental Theorem of Arithmetic";
const ME_BACK = "Back to Me / Progress";
const FIXED_NOW = new Date("2026-10-16T00:00:00Z");
const COPY_TITLE = "Copy a shareable link to this exact question set";

let copied: string[] = [];

/** True when Me files this bank row under CONCEPT in CHAPTER (the same lookup Me counts with). */
const isConcept = (() => {
  let map: Map<string, { topicKey: string; subtopic: string }> | null = null;
  return (id: string): boolean => {
    map ??= new Map([...bankIndexEntries()]);
    const m = map.get(id);
    if (!m || m.topicKey !== CHAPTER) return false;
    return conceptForSubtopic(CHAPTER, m.subtopic.trim()) === CONCEPT;
  };
})();

async function copiedIds(): Promise<string[]> {
  const copy = await screen.findByTitle(COPY_TITLE, undefined, { timeout: 60000 });
  fireEvent.click(copy);
  await waitFor(() => expect(copied.length).toBeGreaterThan(0));
  const link = new URL(copied[copied.length - 1]);
  return (link.searchParams.get("focusBankIds") ?? "").split(",").filter(Boolean);
}

async function displayedIds(url: string): Promise<string[]> {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
      </Routes>
    </MemoryRouter>,
  );
  return copiedIds();
}

beforeAll(async () => {
  await ensureBankChapters([CHAPTER]);
});
beforeEach(() => {
  setMatchMediaMatches(true);
  window.localStorage.clear();
  copied = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FIXED_NOW);
  let seed = 20261016;
  vi.spyOn(Math, "random").mockImplementation(() => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: async (s: string) => { copied.push(s); } },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("practiceArrivalKey - what makes a new arrival", () => {
  it("ignores the page's own history markers (built, review); a new topic/focus is a new arrival", () => {
    const base = "?topic=real-numbers&focus=FTA";
    expect(practiceArrivalKey(`${base}&built=1`)).toBe(practiceArrivalKey(base));
    expect(practiceArrivalKey(`${base}&review=abc`)).toBe(practiceArrivalKey(base));
    expect(practiceArrivalKey("?focus=FTA&topic=real-numbers")).toBe(practiceArrivalKey(base));
    expect(practiceArrivalKey("")).not.toBe(practiceArrivalKey(base));
    expect(practiceArrivalKey("?topic=real-numbers")).not.toBe(practiceArrivalKey(base));
  });
});

describe("the concept URL serves EXACTLY the concept on the real page", () => {
  it("every served question is the concept (mapped FTA in Real Numbers); Back reads Me", async () => {
    const url = await resolveConceptSetPath(
      "Maths",
      { label: CONCEPT, chapter: CHAPTER },
      { source: "me", returnTo: "/me", backLabel: ME_BACK },
    );
    const served = await displayedIds(url);
    expect(served.length).toBeGreaterThan(0);
    expect(served.filter((id) => !isConcept(id)), `served ids outside ${CONCEPT}`).toEqual([]);
    expect(screen.getAllByText(ME_BACK, { exact: false }).length).toBeGreaterThan(0);
  }, 180000);
});

function ConceptLink({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <Link
      to={to}
      data-testid="weak-link"
      onClick={conceptSetClick(navigate, "Maths", { label: CONCEPT, chapter: CHAPTER }, { returnTo: "/practice/10/Maths" })}
    >
      My weak areas
    </Link>
  );
}

describe("the 'My weak areas' card is a same-route arrival", () => {
  it("from the chooser, the card's click opens the concept's exact set (not the chooser it was on)", async () => {
    const href = conceptSetPath("Maths", { label: CONCEPT, chapter: CHAPTER }, { returnTo: "/practice/10/Maths" });
    render(
      <MemoryRouter initialEntries={["/practice/10/Maths"]}>
        <ConceptLink to={href} />
        <Routes>
          <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        </Routes>
      </MemoryRouter>,
    );
    // The direct visit is the preset chooser: no set yet.
    expect(screen.queryByTitle(COPY_TITLE)).toBeNull();
    fireEvent.click(screen.getByTestId("weak-link"));
    const served = await copiedIds();
    expect(served.length).toBeGreaterThan(0);
    expect(served.filter((id) => !isConcept(id))).toEqual([]);
  }, 180000);
});
