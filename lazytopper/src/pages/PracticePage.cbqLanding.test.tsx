// CBQ-ENTRY-1 (E3) — `/practice/10/<Subject>?topic=<slug>&preset=comp`, the landing of the
// Practice Hub's "Competency-based questions" chooser.
//
// Mounts the REAL PracticePage with the REAL engine and the REAL bank. Pin (c): with no
// taps the page selects the Competency preset and builds a set whose every question is a
// CBQ (`isCbq`, CBQ-1 PR-1 — every mark value, not only Section E) of THAT chapter, each
// card showing the visible "CBQ" label. Pin (d): a chapter with no real CBQs says so
// plainly and offers "Practise this chapter" — never an empty set. The no-CBQ chapter is
// made by emptying ONLY the CBQ pool (the competency check's own input); everything else
// stays real. Pin (e): the CBQ FILTER on a chapter-practice arrival (`?topic=&style=cbq`).
//
// ★ NO HARDCODED CBQ COUNTS OR CHAPTERS: the chapter under test is DERIVED from the bank
// (the first Science chapter whose served rows hold CBQs of >= 2 mark values), so the
// content lane tagging more rows moves no pin.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

const flags = vi.hoisted(() => ({ noCbq: false, events: [] as Array<Record<string, unknown>> }));

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: false, status: { tier: "free" } }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({
  trackUxEvent: (_name: string, _area: string, payload: Record<string, unknown>) => {
    flags.events.push(payload ?? {});
  },
}));
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
vi.mock("../components/practice/practiceQuestionBuilder", async (importOriginal) => {
  const real = await importOriginal<typeof import("../components/practice/practiceQuestionBuilder")>();
  return {
    ...real,
    buildCbqPracticePool: (args: Parameters<typeof real.buildCbqPracticePool>[0]) =>
      flags.noCbq ? [] : real.buildCbqPracticePool(args),
  };
});

import PracticePage, { deriveArrivedTargeted } from "./PracticePage";
import { __resetBankChaptersForTest, ensureBankSubject } from "../data/bankChapters/loader";
import { PredictionCore } from "../data/predictionCore";
import { desktopTopicsBySubject } from "../lib/desktop/topics";
import { practiceTopicLabel } from "../components/practice/cbqAvailability";
import { cbqMarks, isCbq } from "../lib/cbq/cbqClassification";

/** The first Science chapter whose SERVED rows hold CBQs of >= 2 mark values (derived). */
async function deriveCbqChapter(): Promise<{ slug: string; label: string; cbqIds: Set<string>; marks: Map<string, number> }> {
  await ensureBankSubject("Science");
  for (const { slug } of desktopTopicsBySubject("Science")) {
    const label = practiceTopicLabel("Science", slug);
    const cbqs = PredictionCore.getLikelyQuestionsForConcept(label)
      .filter((q) => String(q.subject ?? "").toLowerCase() === "science")
      .filter((q) => isCbq(q));
    const marks = new Map(cbqs.map((q) => [String(q.id), cbqMarks(q) ?? 0]));
    if (new Set(marks.values()).size >= 2) return { slug, label, cbqIds: new Set(marks.keys()), marks };
  }
  throw new Error("precondition: no Science chapter has CBQs of >= 2 mark values");
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  __resetBankChaptersForTest();
  flags.noCbq = false;
  flags.events = [];
  setMatchMediaMatches(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("deriveArrivedTargeted — preset=comp takes the preset path", () => {
  it("preset=comp → the preset path (the page builds Competency itself); targeted=1 still wins", () => {
    expect(deriveArrivedTargeted("triangles", false, null, "comp")).toBe(false);
    expect(deriveArrivedTargeted("triangles", true, null, "comp")).toBe(true);
    // Every existing arrival is unchanged.
    expect(deriveArrivedTargeted("triangles", false, null)).toBe(true);
    expect(deriveArrivedTargeted("triangles", false, null, null)).toBe(true);
    expect(deriveArrivedTargeted("triangles", false, null, "board")).toBe(true);
    expect(deriveArrivedTargeted("triangles", false, "practice", null)).toBe(false);
  });
});

describe("CBQ-ENTRY-1 (E3) — the preset=comp landing", () => {
  it("★ (c) a CBQ chapter: Competency auto-selected and built, every question an isCbq row of THAT chapter, labelled CBQ, mixed marks", async () => {
    const ch = await deriveCbqChapter();
    __resetBankChaptersForTest();
    renderAt(`/practice/10/Science?topic=${ch.slug}&preset=comp`);

    const cards = await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    const ids = cards.map((c) => c.getAttribute("data-question-id") ?? "");
    expect(ids.length).toBeGreaterThan(0);
    for (const [i, id] of ids.entries()) {
      expect(ch.cbqIds.has(id), `question ${id} is not a CBQ of ${ch.slug}`).toBe(true);
      expect(cards[i].querySelector('[data-testid="cbq-label"]'), `question ${id} has no CBQ label`).not.toBeNull();
    }
    expect(ids.length, "more questions than the Competency preset's 5").toBeLessThanOrEqual(5);
    if (ids.length >= 2) {
      // Mixed marks — not the 4-mark case study only (FU-CBQ-CHOOSER-ALL-MARKS).
      expect(new Set(ids.map((id) => ch.marks.get(id))).size).toBeGreaterThanOrEqual(2);
    }
    // The Competency preset was applied — by the page, with no tap.
    const builds = flags.events.filter((e) => e.action === "build_set").map((e) => e.preset);
    expect(builds, "the page did not build the Competency preset").toEqual(["comp"]);
    // The preset chooser never stands between the student and the set.
    expect(screen.queryByText("What shall we practise?")).toBeNull();
    expect(screen.queryByText("No CBQs for this chapter yet")).toBeNull();
  }, 120000);

  it("★ (e) the CBQ FILTER on chapter practice (?topic=&style=cbq): ONLY CBQ-labelled isCbq rows, mixed marks", async () => {
    const ch = await deriveCbqChapter();
    __resetBankChaptersForTest();
    renderAt(`/practice/10/Science?topic=${ch.slug}&style=cbq`);

    const cards = await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    const ids = cards.map((c) => c.getAttribute("data-question-id") ?? "");
    expect(ids.length).toBe(Math.min(10, ch.cbqIds.size)); // the default count of 10, or every CBQ
    for (const [i, id] of ids.entries()) {
      expect(ch.cbqIds.has(id), `question ${id} is not a CBQ of ${ch.slug}`).toBe(true);
      expect(cards[i].querySelector('[data-testid="cbq-label"]')).not.toBeNull();
    }
    expect(new Set(ids.map((id) => ch.marks.get(id))).size).toBeGreaterThanOrEqual(2);
  }, 120000);

  it("★ (d) a chapter with no real CBQs says so and offers 'Practise this chapter' — no empty set", async () => {
    flags.noCbq = true;
    renderAt("/practice/10/Maths?topic=triangles&preset=comp");

    expect(await screen.findByText("No CBQs for this chapter yet", {}, { timeout: 60000 })).toBeInTheDocument();
    expect(screen.getByText(/Triangles has no competency-based questions \(CBQs\) yet\./)).toBeInTheDocument();
    expect(screen.queryAllByTestId("practice-question-card")).toHaveLength(0);
    expect(flags.events.some((e) => e.preset === "comp")).toBe(false);

    // "Practise this chapter" → this chapter's own practice chooser; Competency is gated there.
    fireEvent.click(screen.getByRole("button", { name: "Practise this chapter" }));
    await waitFor(() => expect(screen.getByText("What shall we practise?")).toBeInTheDocument());
    expect(screen.queryByText("No CBQs for this chapter yet")).toBeNull();
    expect(screen.getByText("Competency questions coming soon for this chapter.")).toBeInTheDocument();
    expect(screen.queryAllByTestId("practice-question-card")).toHaveLength(0);
  }, 90000);
});
