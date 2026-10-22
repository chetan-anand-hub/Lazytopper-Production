// PracticePage — MLT-MUTE-2 review follow-ups (#1297).
//
// 1. TARGETING ORDER. On the full-pool route the pool is the engine DRAW + the chapter's served
//    TAIL. The draw's order carries Mistake Intelligence's wrong-concept priority (and an HPQ
//    focus list), so its matching rows must LEAD the set; the per-session rotation reorders only
//    the tail. RED on the first #1297 head: the rotation ran over draw + tail together, so with a
//    chip on, the priority rows were rotated out of the set.
//    "Refresh set" must still give a different set.
// 2. ONE-FRAME FLASH. A Build that flips the filters must not paint the OLD pool through the NEW
//    filters ("0 questions" / the filters-empty state) in the render before the rebuild effect.
//    RED on the first #1297 head: that render committed the filters-empty state to the DOM.
//
// ★ ONE router — the same seed-location harness as PracticePage.bankEnd.test.tsx.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
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
// A NON-ZERO session rotation: the case where rotating draw + tail together displaced the draw.
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return { ...actual, sessionRotationOffset: () => 5 };
});
const { tail } = vi.hoisted(() => ({ tail: { rows: [] as unknown[] } }));
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn(), buildChapterServedPool: () => tail.rows };
});

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";

const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;

function row(id: string, text: string): PQ {
  return {
    id, questionText: text, marks: 3, section: "C", format: "vsa", difficulty: "Medium",
    subtopic: "seed", topicKey: "real-numbers",
  } as unknown as PQ;
}
// The engine draw: MI's priority-concept proofs first (the engine put them there), plus one
// non-proof row the chip filters out.
const PRIORITY = [row("pri-1", "Prove that priority 1 holds."), row("pri-2", "Prove that priority 2 holds.")];
const DRAW = [...PRIORITY, row("calc-1", "Find the value of calc 1.")];
const TAIL = Array.from({ length: 8 }, (_, i) => row(`tail-${i + 1}`, `Prove that tail ${i + 1} holds.`));

afterEach(() => {
  cleanup();
  mockBuild.mockReset();
  tail.rows = [];
});

function mount(query: string) {
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[`/practice/10/maths?${query}`]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

const shown = () =>
  screen.getAllByTestId("practice-question-card").map((c) => /Prove that (\w+ \d+)|Find the value of (\w+ \d+)/.exec(c.textContent ?? "")?.slice(1).find(Boolean) ?? "?");

describe("MLT-MUTE-2 follow-up · the engine draw's order survives a filter", () => {
  it("★★ RED on the first #1297 head: with a chip on, MI's priority rows lead the set; the rotated tail fills the rest", async () => {
    mockBuild.mockResolvedValue(DRAW);
    tail.rows = TAIL;
    mount("topic=real-numbers&count=5&style=proof");
    await screen.findAllByTestId("practice-question-card", {}, { timeout: 30000 });
    const first = shown();
    expect(first).toHaveLength(5);
    expect(first.slice(0, 2)).toEqual(["priority 1", "priority 2"]);
    expect(first).not.toContain("calc 1"); // the chip still filters the draw
    expect(first.slice(2).every((s) => s.startsWith("tail "))).toBe(true);

    // Refresh set still gives a DIFFERENT set: what was on screen is now seen and sinks.
    fireEvent.click(screen.getByRole("button", { name: /^Refresh set$/ }));
    await screen.findAllByTestId("practice-question-card", {}, { timeout: 30000 });
    await vi.waitFor(() => expect(shown()).not.toEqual(first));
    const second = shown();
    expect(second).toHaveLength(5);
    expect(second.filter((s) => first.includes(s))).toEqual([]);
  });
});

describe("MLT-MUTE-2 follow-up · no one-frame flash of an empty state on a filter change", () => {
  it("★★ RED on the first #1297 head: Build with a new chip never commits the filters-empty state before the new pool settles", async () => {
    // First set: the board/default set, no proofs in it.
    const PLAIN = Array.from({ length: 5 }, (_, i) => row(`calc-${i + 1}`, `Find the value of calc ${i + 1}.`));
    mockBuild.mockResolvedValue(PLAIN);
    mount("topic=real-numbers&count=5");
    await screen.findAllByTestId("practice-question-card", {}, { timeout: 30000 });

    // The rebuild for the new chip is held open, so the only renders are the ones before it lands.
    // ONE deferred shared by every per-section engine call of the rebuild.
    let release: (rows: PQ[]) => void = () => {};
    const held = new Promise<PQ[]>((resolve) => { release = resolve; });
    mockBuild.mockImplementation(() => held);
    tail.rows = TAIL;
    fireEvent.click(screen.getByRole("button", { name: /^Edit filters$/ }));
    fireEvent.click(screen.getByRole("button", { name: /Proof \/ Derivation/ }));

    // Watch every node the Build commits to the DOM — including one a LATER render in the same act
    // removes again (a one-frame flash is exactly that: added by the stale render, removed by the
    // rebuild's), so both added and removed nodes are checked.
    const touched: Node[] = [];
    const collect = (records: MutationRecord[]) =>
      records.forEach((r) => {
        r.addedNodes.forEach((n) => touched.push(n));
        r.removedNodes.forEach((n) => touched.push(n));
      });
    const observer = new MutationObserver(collect);
    observer.observe(document.body, { childList: true, subtree: true });
    fireEvent.click(screen.getByRole("button", { name: /^Build new set$/ }));
    collect(observer.takeRecords());
    observer.disconnect();
    const flashed = touched.some(
      (n) => n instanceof HTMLElement && (n.matches('[data-testid="qp-filters-empty"]') || !!n.querySelector('[data-testid="qp-filters-empty"]')),
    );
    expect(flashed).toBe(false);
    expect(screen.queryByTestId("qp-filters-empty")).toBeNull();

    // And the new pool does land: proofs, no empty state.
    await act(async () => { release(DRAW); });
    await screen.findAllByText(/^Prove that /, {}, { timeout: 30000 });
    expect(screen.queryByTestId("qp-filters-empty")).toBeNull();
  });
});
