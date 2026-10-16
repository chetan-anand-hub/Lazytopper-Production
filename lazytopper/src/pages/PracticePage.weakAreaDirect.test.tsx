// WEAK-AREA-DIRECT — a weak concept's Practise lands IN a Quick Practice set on that concept.
//
//   1. The concept URL (Me's / the card's builder, conceptSetPath) narrows the REAL page's served
//      set to the concept: the set leads with, and carries more of, the concept's questions than
//      the same chapter without the focus (the tutor's subtopicHint path, read as-is).
//   2. The "My weak areas" card is ON the Quick Practice page, so its link is a SAME-ROUTE arrival:
//      the page must open the new set, not keep the chooser it was on (the page initialises from
//      the URL once per mount, so a new arrival remounts it - `practiceArrivalKey`).
//
// Mounts the REAL page with the REAL engine and reads the set it DISPLAYS through its own
// "copy a shareable link to this exact question set" control (as PracticePage.strictFocusExact).

import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
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
import { conceptSetPath } from "../lib/desktop/conceptSetPath";

const CHAPTER = "real-numbers";
const CONCEPT = "Fundamental Theorem of Arithmetic";
const FIXED_NOW = new Date("2026-10-16T00:00:00Z");
const COPY_TITLE = "Copy a shareable link to this exact question set";

let copied: string[] = [];

const subtopicOf = (() => {
  let map: Map<string, string> | null = null;
  return (id: string): string => {
    map ??= new Map([...bankIndexEntries()].map(([k, m]) => [k, String(m.subtopic ?? "")]));
    return map.get(id) ?? "";
  };
})();
const isConcept = (id: string) => subtopicOf(id).toLowerCase().includes(CONCEPT.toLowerCase());

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

describe("practiceArrivalKey — what makes a new arrival", () => {
  it("ignores the page's own history markers (built, review); a new topic/focus is a new arrival", () => {
    const base = "?topic=real-numbers&focus=FTA";
    expect(practiceArrivalKey(`${base}&built=1`)).toBe(practiceArrivalKey(base));
    expect(practiceArrivalKey(`${base}&review=abc`)).toBe(practiceArrivalKey(base));
    expect(practiceArrivalKey("?focus=FTA&topic=real-numbers")).toBe(practiceArrivalKey(base));
    expect(practiceArrivalKey("")).not.toBe(practiceArrivalKey(base));
    expect(practiceArrivalKey("?topic=real-numbers")).not.toBe(practiceArrivalKey(base));
  });
});

describe("the concept URL narrows the real page's set", () => {
  it("★ leads with the concept and serves more of it than the plain chapter", async () => {
    const url = conceptSetPath("Maths", { label: CONCEPT, chapter: CHAPTER }, { source: "me", returnTo: "/me" });
    const served = await displayedIds(url);
    cleanup();
    copied = [];
    const control = await displayedIds(`/practice/10/Maths?topic=${CHAPTER}&source=me&returnTo=%2Fme`);
    expect(served.length).toBeGreaterThan(0);
    expect(isConcept(served[0]), `first served ${served[0]} is ${CONCEPT}`).toBe(true);
    expect(served.filter(isConcept).length).toBeGreaterThan(control.filter(isConcept).length);
  }, 180000);
});

describe("the 'My weak areas' card is a same-route arrival", () => {
  it("★ from the chooser, the card's link opens the concept's set (not the chooser it was on)", async () => {
    const href = conceptSetPath("Maths", { label: CONCEPT, chapter: CHAPTER }, { returnTo: "/practice/10/Maths" });
    render(
      <MemoryRouter initialEntries={["/practice/10/Maths"]}>
        <Link to={href} data-testid="weak-link">My weak areas</Link>
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
    expect(isConcept(served[0])).toBe(true);
  }, 180000);
});
