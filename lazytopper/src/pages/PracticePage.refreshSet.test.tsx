// PracticePage — the toolbar's "Refresh set" must actually REFRESH
// ([FU-PRACTICE-CONTROLS-REFRESH-STALE]).
//
// THE DEFECT: `PracticeControls.tsx`'s "Refresh set" button called the page's BARE
// `regenerateQuestions()`. That re-runs the fetch with BOTH selection inputs unmoved:
//
//   · `rotationOffset` = sessionRotationOffset(topic, filterSignature, sessionStartedAt)
//     (+ freshSetNonce). Tapping "Refresh set" changes none of those — `sessionStartedAt`
//     is a mount-once useState and the committed filters did not move — so the rebuild
//     re-derives the IDENTICAL offset.
//   · `seenQuestionIds` is loaded once per topic/mount; its effect has no
//     `regenerationKey` dependency, so it does not re-read on a rebuild either.
//
// …which is the exact staleness #509 fixed for the scorecard's "Build a fresh set"
// (`PracticePage.freshSet.test.tsx`). Every OTHER caller of the bare regenerate
// (`applyPreset`, `onBuildSet`) commits new filters first, which moves `filterSignature`
// and therefore the seed — "Refresh set" was the sole trigger that moved nothing.
//
// THE CONTROL that makes this evidence rather than shape-assertion: the engine mock
// returns the SAME over-fetched pool on every call and ignores `seenQuestionIds`, so the
// pool is a constant and the ONLY thing that can make set #2 differ is the page's own
// selection. `NO ATTEMPTS ARE MADE` before the tap — the student simply does not like the
// set — which is the honest mid-session case and the one the bare regenerate handled
// worst (an empty seen-set means the unseen-first draw is a pure re-derivation).
//
// MUTATION-TESTED: reverting `refreshSet()` back to `regenerateQuestions()` at the
// `onRegenerate` call site turns BOTH cases in this file red.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

/** Runtime trace, hoisted so the vi.mock factories below can write to it. */
const trace = vi.hoisted(() => ({
  /** Every SESSION SEED the page derived (sessionRotationOffset's own return), in order.
   *  This is the input that CANNOT move in-session — the reason a bare regenerate is a
   *  no-op. The fresh-set advance rides ON TOP of it and is observable only in the draw. */
  seeds: [] as Array<{ sig: string; startedAt: number; value: number }>,
  attempts: [] as Array<{ questionId: string; topicKey: string; topicName?: string }>,
}));

// ── Mocks: keep the heavy data/network/Firebase surface out; keep the pure logic real ──
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => trace.attempts,
  getAttemptsFromCloud: async () => [],
  recordAttempt: (_user: unknown, ctx: { questionId?: string; topic?: string; topicKey?: string }) => {
    trace.attempts.push({
      questionId: String(ctx.questionId || ""),
      topicKey: String(ctx.topicKey || ctx.topic || ""),
      topicName: ctx.topic,
    });
  },
}));
vi.mock("../services/adaptivePracticeEngine", () => ({
  computeAdaptiveDifficultyMix: () => undefined,
  getWrongConceptsForTopic: () => [],
}));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));

// Keep the real service EXCEPT: TRACE every rotation-offset derivation and no-op the
// persistence write (§1a: QP writes no counting record).
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return {
    ...actual,
    sessionRotationOffset: (topic: string, sig: string, startedAt: number) => {
      const value = actual.sessionRotationOffset(topic, sig, startedAt);
      trace.seeds.push({ sig, startedAt, value });
      return value;
    },
    persistQuickPracticeSession: () => {},
  };
});

// The engine: override ONLY the set builder so the POOL is a CONSTANT.
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn() };
});

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";

const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);

type PQ = import("../data/predictionDataService").PracticeQuestion;

/** A 1-mark Section-A MCQ whose correct answer is option 0 (`q<n>-correct`). */
function mkItem(n: number): PQ {
  return {
    id: `q-${n}`,
    questionText: `Question ${n}: solve it.`,
    marks: 1,
    section: "A",
    format: "mcq",
    difficulty: "Easy",
    subtopic: "seed",
    topicKey: "real-numbers",
    options: [`q${n}-correct`, `q${n}-wrong`, `q${n}-c`, `q${n}-d`],
    answer: `q${n}-correct`,
  } as unknown as PQ;
}

/** The engine over-fetches count*5 (capped 100) for a section filter — 25 for a chosen 5. */
const POOL: PQ[] = Array.from({ length: 25 }, (_, i) => mkItem(i));

afterEach(() => {
  cleanup();
  mockBuild.mockReset();
  trace.seeds.length = 0;
  trace.attempts.length = 0;
});

/** The question numbers currently on screen, in render order — the DISPLAYED set. */
function displayedSet(): string[] {
  return screen
    .getAllByText(/^Question \d+: solve it\.$/)
    .map((el) => (el.textContent || "").replace(/^Question (\d+).*$/, "$1"));
}

/** Drive the REAL page to a built set on the full-page preset path (source=practice). */
async function buildFirstSet() {
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={["/practice/10/maths?source=practice&topic=real-numbers"]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="*" element={<div data-testid="elsewhere" />} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole("button", { name: /Quick drill/i }));
  fireEvent.click(screen.getByRole("button", { name: /Start practising/i }));
  await screen.findAllByText(/^Question \d+: solve it\.$/);
  return displayedSet();
}

/** Wait for a rebuild fetch to land and the new set to render. */
async function awaitRebuild(callsBefore: number) {
  await waitFor(() => {
    if (mockBuild.mock.calls.length <= callsBefore) throw new Error("no rebuild fetch yet");
  });
  await screen.findAllByText(/^Question \d+: solve it\.$/);
}

describe('QP toolbar "Refresh set" — the refreshed set must not be the set on screen', () => {
  it("THE DEFECT: a built set → Refresh set (no attempts) → a DIFFERENT set of questions", async () => {
    mockBuild.mockResolvedValue(POOL); // constant pool: only the PAGE can make set #2 differ
    const first = await buildFirstSet();
    expect(first).toHaveLength(5);
    const seedBefore = trace.seeds[trace.seeds.length - 1]?.value;
    const seenAtFirstFetch = mockBuild.mock.calls[mockBuild.mock.calls.length - 1][0].seenQuestionIds;

    // The student attempts NOTHING — they just do not want these five. This is the case
    // the bare regenerate handled worst: the seen-set is empty, so the unseen-first draw
    // is a pure re-derivation of the identical offset over the identical pool.
    expect(trace.attempts).toHaveLength(0);

    const callsBefore = mockBuild.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /^Refresh set$/i }));
    await awaitRebuild(callsBefore);
    const second = displayedSet();
    const seedAfter = trace.seeds[trace.seeds.length - 1]?.value;
    const seenAtRefreshFetch = mockBuild.mock.calls[mockBuild.mock.calls.length - 1][0].seenQuestionIds;

    /* eslint-disable no-console */
    console.log(
      [
        "[TRACE · refresh-set]",
        `  pool                        = ${POOL.length} questions, constant on every fetch`,
        `  set #1 (displayed)          = [${first.join(", ")}]`,
        `  session seed @ set #1       = ${seedBefore}`,
        `  attempts blob before tap    = ${trace.attempts.length} (the student answered nothing)`,
        `  seenQuestionIds @ fetch #1  = ${seenAtFirstFetch ? seenAtFirstFetch.size : "undefined"}`,
        `  --- tap "Refresh set" ---`,
        `  set #2 (displayed)          = [${second.join(", ")}]`,
        `  session seed @ set #2       = ${seedAfter}`,
        `  seenQuestionIds @ fetch #2  = ${seenAtRefreshFetch ? seenAtRefreshFetch.size : "undefined"}`,
        `  session seed moved?         = ${seedBefore !== seedAfter} (ALWAYS false — mount-once by design)`,
        `  sets identical?             = ${first.join(",") === second.join(",")}`,
      ].join("\n"),
    );
    /* eslint-enable no-console */

    expect(second).toHaveLength(5);
    // ROOT CAUSE A, pinned as a FACT about the page and NOT as the fix: the session seed
    // cannot move in-session, so any trigger that leans on it alone is doomed.
    expect(seedAfter).toBe(seedBefore);
    // ROOT CAUSE B — the set on screen must be carried into the seen-set so the
    // unseen-first draw stops handing it straight back. Bare regenerate: still 0 → FAIL.
    expect(seenAtRefreshFetch && seenAtRefreshFetch.size).toBeGreaterThanOrEqual(5);
    // THE DEFECT ITSELF. Bare regenerate: byte-identical → FAIL.
    expect(second.join(",")).not.toBe(first.join(","));
    // With 25 in the pool and 5 refreshed away, the new set is fully NEW — no overlap.
    expect(second.filter((n) => first.includes(n))).toEqual([]);
  }, 30000);

  it("SCARCITY: when the pool is exhausted Refresh RECOMBINES (rotated), never an identical repeat", async () => {
    // Exactly as many questions as the set needs — the honest thin-bank case. There is
    // nothing new to serve, so the promise degrades to "a different arrangement of real
    // bank questions", never a fabricated one and never a byte-identical repeat.
    mockBuild.mockResolvedValue(POOL.slice(0, 5));
    const first = await buildFirstSet();
    expect(first).toHaveLength(5);

    const callsBefore = mockBuild.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /^Refresh set$/i }));
    await awaitRebuild(callsBefore);
    const second = displayedSet();

    /* eslint-disable no-console */
    console.log(
      `[TRACE · refresh scarcity] pool=5 · set #1 = [${first.join(", ")}] · set #2 = [${second.join(", ")}]`,
    );
    /* eslint-enable no-console */

    // Same five real questions (nothing invented, the pool has no more)…
    expect([...second].sort()).toEqual([...first].sort());
    // …but a genuinely different ORDER. Bare regenerate: identical order → FAIL.
    expect(second.join(",")).not.toBe(first.join(","));
    // The effective rotation advanced by EXACTLY ONE — n and n+1 differ modulo every
    // pool size >= 2, so the exhausted case can never repeat identically.
    expect(second).toEqual([...first.slice(1), first[0]]);
  }, 30000);

  it("NO-REGRESSION: the NORMAL build paths still call the bare regenerate (nothing marked seen)", async () => {
    // `onBuildSet` (Edit filters → Build new set) and `applyPreset` commit the pending
    // filters, so when the student actually changes something `filterSignature` — and
    // therefore the seed — moves on its own. They never needed, and must not acquire,
    // the fresh-set advance. What is pinned here is the OBSERVABLE no-regression fact:
    // going round the Edit-filters → Build-new-set loop WITHOUT changing a filter
    // reproduces the IDENTICAL set, exactly as it did before this change. That is the
    // pre-existing behaviour of the bare-regenerate path (nothing moved, so nothing
    // changes) and it is deliberately left alone. It is also the sensitive assertion:
    // if the fresh-set advance had been applied globally, `freshSetNonce` would tick
    // here too and set #2 would differ — this test goes RED (verified by mutation).
    mockBuild.mockResolvedValue(POOL);
    const first = await buildFirstSet();
    expect(first).toHaveLength(5);
    const seedBefore = trace.seeds[trace.seeds.length - 1]?.value;

    const callsBefore = mockBuild.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /Edit filters/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Build new set$/i }));
    await awaitRebuild(callsBefore);

    const second = displayedSet();
    const seedAfter = trace.seeds[trace.seeds.length - 1]?.value;
    const seenAtBuildFetch = mockBuild.mock.calls[mockBuild.mock.calls.length - 1][0].seenQuestionIds;

    /* eslint-disable no-console */
    console.log(
      `[TRACE · normal build] seed #1 = ${seedBefore} · seed #2 = ${seedAfter} · seen @ fetch = ${
        seenAtBuildFetch ? seenAtBuildFetch.size : "undefined"
      } · set #1 = [${first.join(", ")}] · set #2 = [${second.join(", ")}]`,
    );
    /* eslint-enable no-console */

    // The bare-regenerate path is untouched: no set was swept into the seen partition…
    expect(seenAtBuildFetch ? seenAtBuildFetch.size : 0).toBe(0);
    // …the seed is re-derived unchanged (the filters did not move)…
    expect(seedAfter).toBe(seedBefore);
    // …and the rebuild therefore reproduces the SAME set, byte-for-byte, as before.
    expect(second.join(",")).toBe(first.join(","));
  }, 30000);
});
