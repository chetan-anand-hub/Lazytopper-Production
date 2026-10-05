// CBQ-ENTRY-1 (E3) — `/practice/10/<Subject>?topic=<slug>&preset=comp`, the landing of the
// Practice Hub's "Competency-based questions" chooser.
//
// Mounts the REAL PracticePage with the REAL engine and the REAL bank. Pin (c): with no
// taps the page selects the Competency preset and builds a set whose every question is a
// Section-E row of THAT chapter. Pin (d): a chapter with no real CBQs says so plainly and
// offers "Practise this chapter" — never an empty set. The no-CBQ chapter is made by
// emptying ONLY the Section-E engine draw (the competency check's own input); everything
// else stays real.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

const flags = vi.hoisted(() => ({ noSectionE: false, events: [] as Array<Record<string, unknown>> }));

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
    buildPracticeQuestionsFromEngine: (args: Parameters<typeof real.buildPracticeQuestionsFromEngine>[0]) =>
      flags.noSectionE && args.boardPattern === "E" ? [] : real.buildPracticeQuestionsFromEngine(args),
  };
});

import PracticePage, { deriveArrivedTargeted } from "./PracticePage";
import { __resetBankChaptersForTest, ensureBankChapters, getBankRows } from "../data/bankChapters/loader";

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
  flags.noSectionE = false;
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
  it("★ (c) Maths → Triangles: Competency auto-selected and built, every question a Section-E Triangles row", async () => {
    renderAt("/practice/10/Maths?topic=triangles&preset=comp");

    const cards = await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });

    await ensureBankChapters(["triangles"]);
    const byId = new Map(getBankRows(["triangles"]).map((q) => [String(q.id), q]));
    const ids = cards.map((c) => c.getAttribute("data-question-id") ?? "");
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const row = byId.get(id);
      expect(row, `question ${id} is not a Triangles bank row`).toBeDefined();
      expect(String(row!.section).toUpperCase(), `question ${id} is not Section E`).toBe("E");
    }
    expect(ids.length, "more questions than the Competency preset's 5").toBeLessThanOrEqual(5);
    // The Competency preset was applied — by the page, with no tap.
    const builds = flags.events.filter((e) => e.action === "build_set").map((e) => e.preset);
    expect(builds, "the page did not build the Competency preset").toEqual(["comp"]);
    // The preset chooser never stands between the student and the set.
    expect(screen.queryByText("What shall we practise?")).toBeNull();
    expect(screen.queryByText("No CBQs for this chapter yet")).toBeNull();
  }, 90000);

  it("★ (d) a chapter with no real CBQs says so and offers 'Practise this chapter' — no empty set", async () => {
    flags.noSectionE = true;
    renderAt("/practice/10/Maths?topic=triangles&preset=comp");

    expect(await screen.findByText("No CBQs for this chapter yet", {}, { timeout: 60000 })).toBeInTheDocument();
    expect(screen.getByText(/Triangles has no competency-based \(Section E\) questions yet\./)).toBeInTheDocument();
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
