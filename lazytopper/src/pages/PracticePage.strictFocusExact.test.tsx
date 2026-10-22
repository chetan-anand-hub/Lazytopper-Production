// CONCEPT-MAP-FILL-1 PR-2 (#1076, cofounder D92a) — strict focus is EXACT on the REAL page path.
//
// The Topic Hub's concept Practise and Weak Area's targeted session send `focusBankIds` +
// `strictFocus=true` + a `count` the ids cover, and NO `marks`. On that URL PracticePage used to run
// its marks="all" BLUEPRINT branch (one builder call per section, then takeBlueprintShare) and the
// display step's seen-first rotation, so the served set was NOT the requested set (probe on b9edc2ce:
// Alloys 26 requested -> 22 served, 4 outside the concept) and the concept did not reliably lead.
// The builder-only proof (practiceQuestionBuilder.conceptExact.test.ts) could not see either.
//
// These tests mount the REAL page with the REAL engine and read the set the page DISPLAYS through
// its own "copy a shareable link to this exact question set" control (the displayed ids, in order).
//   1. Hub URL shape: served == requested, as a set.
//   2. Weak Area URL shape: the first served question belongs to the chosen concept (D85a).
//   3. CONTROL: the ordinary chapter draw (no strictFocus) is unchanged — same seed (Date + Math.random),
//      pinned ids recorded on trunk 11e7614c.

import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
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
import { ensureBankChapters } from "../data/bankChapters/loader";
import { bankIndexEntries } from "../data/bankChapters/bankIdIndex";
import { conceptBankIds, CONCEPT_PRACTISE_MAX_COUNT } from "../lib/desktop/conceptPractice";
import { buildDesktopConceptPracticePath } from "../lib/desktop/navigation";
import { loadExamConceptResolvers } from "../services/mistakeConcept";
import { pickTargetedIds, TARGETED_SESSION_COUNT, targetedSessionLabel } from "./WeakAreaPracticePage";
import { isExactFocusSet } from "./PracticePage";

const CHAPTER = "metals-and-non-metals";
const FIXED_NOW = new Date("2026-10-11T00:00:00Z");

let copied: string[] = [];

/** Mounts the page at `url` and returns the ids it DISPLAYS, in order (via its own copy-link control). */
async function displayedIds(url: string): Promise<string[]> {
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
      </Routes>
    </MemoryRouter>,
  );
  const copy = await screen.findByTitle("Copy a shareable link to this exact question set", undefined, { timeout: 60000 });
  fireEvent.click(copy);
  await waitFor(() => expect(copied.length).toBeGreaterThan(0));
  const link = new URL(copied[copied.length - 1]);
  return (link.searchParams.get("focusBankIds") ?? "").split(",").filter(Boolean);
}

beforeAll(async () => {
  await ensureBankChapters([CHAPTER]);
});
beforeEach(() => {
  window.localStorage.clear();
  copied = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FIXED_NOW);
  // The engine draws with Math.random; a fixed LCG makes the ordinary draw repeatable (same seed).
  let seed = 20261011;
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

describe("strict focus on the real page path (no marks param)", () => {
  it("★ Hub concept Practise (Alloys): the page serves EXACTLY the requested ids", async () => {
    const ids = conceptBankIds(CHAPTER, ["Alloys"]);
    expect(ids.length).toBeGreaterThanOrEqual(8);
    const count = Math.min(ids.length, CONCEPT_PRACTISE_MAX_COUNT);
    const url = buildDesktopConceptPracticePath({
      subject: "Science",
      topic: CHAPTER,
      focus: "Alloys",
      subtopicHint: "Alloys",
      focusBankIds: ids,
      count,
    });
    expect(url).not.toMatch(/[?&]marks=/);
    const served = await displayedIds(url);
    expect(served.filter((id) => !ids.includes(id)), "served ids outside the concept").toEqual([]);
    expect(new Set(served), "every requested id is served").toEqual(new Set(ids.slice(0, count)));
  }, 120000);

  it("★ Weak Area targeted session: the first served question belongs to the chosen concept (D85a)", async () => {
    const { conceptRowForBankQuestionId } = await loadExamConceptResolvers();
    const entries = [...bankIndexEntries()];
    // The chapter's concept rows (sorted, so the choice is stable); the first with >= 3 served rows.
    // Before the fix the page's blueprint (Section A first) and its display rotation decided what led.
    const rowKeys = [...new Set(
      entries
        .map(([id]) => conceptRowForBankQuestionId(id)?.key)
        .filter((k): k is string => !!k && k.startsWith(`${CHAPTER}|`)),
    )].sort();
    const chosen = rowKeys.find(
      (key) => entries.filter(([id]) => conceptRowForBankQuestionId(id)?.key === key).length >= 3,
    );
    expect(chosen, "a concept row with >= 3 served rows").toBeDefined();
    const ids = pickTargetedIds(entries, CHAPTER, chosen!, conceptRowForBankQuestionId);
    expect(ids.length).toBe(TARGETED_SESSION_COUNT);
    const params = new URLSearchParams({
      topic: CHAPTER,
      count: String(TARGETED_SESSION_COUNT),
      weakMode: "1",
      focusBankIds: ids.join(","),
      strictFocus: "true",
    });
    const served = await displayedIds(`/practice/10/Science?${params.toString()}`);
    expect(served.length).toBeGreaterThan(0);
    expect(conceptRowForBankQuestionId(served[0])?.key).toBe(chosen);
    expect(served).toEqual(ids);
  }, 120000);
});

describe("the promise follows the path (D85a, D92a)", () => {
  it("names the concept only when it leads; otherwise the chapter only", () => {
    expect(targetedSessionLabel("Arithmetic Progression", "nth term", true)).toBe("Practise Arithmetic Progression, starting with nth term");
    expect(targetedSessionLabel("Arithmetic Progression", "nth term", false)).toBe("Practise Arithmetic Progression");
    expect(targetedSessionLabel("Arithmetic Progression", null, true)).toBe("Practise Arithmetic Progression");
  });
  it("the exact path is taken ONLY for strictFocus + ids covering the count + no marks filter", () => {
    const ids = Array.from({ length: 15 }, (_, i) => `id-${i}`);
    expect(isExactFocusSet(true, ids, 15, "all", null)).toBe(true);
    expect(isExactFocusSet(false, ids, 15, "all", null)).toBe(false);
    expect(isExactFocusSet(true, ids.slice(0, 14), 15, "all", null)).toBe(false);
    expect(isExactFocusSet(true, ids, 15, "1", null)).toBe(false);
    expect(isExactFocusSet(true, ids, 15, "all", { min: 3, max: 5 })).toBe(false);
    expect(isExactFocusSet(true, undefined, 15, "all", null)).toBe(false);
  });
});

describe("CONTROL — the ordinary chapter draw is unchanged", () => {
  it("★ no strictFocus: same seed -> the same ids as trunk 11e7614c", async () => {
    const served = await displayedIds(`/practice/10/science?topic=${CHAPTER}&count=10`);
    expect(served).toEqual(TRUNK_CONTROL_IDS);
  }, 120000);
});

// Recorded 2026-10-11 by running this CONTROL test on trunk 11e7614c (same FIXED_NOW, same LCG seed, no
// attempts; repeated twice, identical). A later bank change to this chapter may move it: re-record on trunk.
//
// RE-RECORDED 2026-10-22 (MLT-MUTE-2). The draw did not change; the LCG stream did. The pre-build
// "N available" hint used to run an engine draw (generatePracticeSet, count 200) on every render
// with the chapter loaded, and that draw consumed Math.random BEFORE the set's own draw. The hint
// now counts the chapter's served pool (no draw, no randomness), so the set's draw starts at an
// earlier point of the same seeded stream. Proven on the lane branch: re-adding the old hint's
// engine call (and nothing else) reproduced the 11e7614c ids exactly.
const TRUNK_CONTROL_IDS: string[] = [
  "BX-MNM-EX-A-017", "LTG-S-METAL-268", "METAL-NCERT-3-VSA-015", "LTG-S-METAL-291", "METAL-NCERT-3-SA-002",
  "LTG-S-METAL-298", "LTG-S-METAL-237", "BX-MNM-E-019", "LTG-S-METAL-224", "LTG-S-METAL-226",
];
