// PracticePage — "Build a fresh set" must actually be FRESH ([FU-PRACTICE-FRESH-SET-NOT-FRESH]).
//
// THE OWNER'S BUG: finish a Quick Practice set, tap the scorecard's "Build a fresh set",
// and the SAME questions come back. The machinery (rotation offset + unseen-first draw)
// exists and is wired — the TRIGGER never moved either input:
//
//   · `rotationOffset` = sessionRotationOffset(topic, filterSignature, sessionStartedAt).
//     A fresh set changes NONE of those three (`sessionStartedAt` is a mount-once
//     useState), so the rebuild re-derives the IDENTICAL offset.
//   · `seenQuestionIds` is loaded ONCE per topic/mount from the attempts blob. The
//     questions the student just answered ARE in that blob by the time they tap, but the
//     loader never re-runs — so the set the student just worked is still "unseen" and the
//     unseen-first draw hands it straight back.
//
// This test drives the REAL PracticePage on the full-page preset path (source=practice →
// the preset chooser, NOT the tutor overlay's arrivedTargeted bypass), answers every
// question so the scorecard AUTO-offers (allDone), taps the real "Build a fresh set"
// menu item, and compares the two DISPLAYED sets.
//
// THE CONTROL that makes this evidence rather than shape-assertion: the engine mock
// returns the SAME over-fetched pool on every call and ignores `seenQuestionIds`. So the
// pool is a constant and the ONLY thing that can make set #2 differ is the page's own
// selection (rotation + the seen partition). On trunk the two sets are byte-identical and
// the assertion fails; with the fix set #2 is disjoint.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

/** Runtime trace, hoisted so the vi.mock factories below can write to it. */
const trace = vi.hoisted(() => ({
  /** Every SESSION SEED the page derived (sessionRotationOffset's own return), in order.
   *  This is the value that CANNOT move in-session — root cause A. The page's effective
   *  rotation offset is this seed plus the fresh-set advance, which is observable only in
   *  the draw (see the scarcity test's exact one-step rotation). */
  seeds: [] as Array<{ sig: string; startedAt: number; value: number }>,
  /** The attempts blob a signed-in student would have on disk. */
  attempts: [] as Array<{ questionId: string; topicKey: string; topicName?: string }>,
}));

// ── Mocks: keep the heavy data/network/Firebase surface out; keep the pure logic real ──
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
// A STATEFUL attempts store. The real `recordAttempt` skips signed-out users, so this
// models a signed-in student's on-disk blob without dragging Firebase in: PracticeQuestionCard
// calls it on every MCQ click, and the page's seen-set loader reads it back via getAttempts().
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => trace.attempts,
  getAttemptsFromCloud: async () => [],
  recordAttempt: (_user: unknown, ctx: { questionId?: string; topic?: string; topicKey?: string }) => {
    trace.attempts.push({
      questionId: String(ctx.questionId || ""),
      // Mirrors the real service: the KEY is canonicalised, the LABEL kept verbatim.
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

// Keep the real service EXCEPT: TRACE every rotation-offset derivation (the runtime proof of
// root cause A) and no-op the persistence write (§1a: QP writes no counting record).
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

// The engine: override ONLY the set builder so the POOL is a CONSTANT. Everything else
// (MIN/MAX counts, parsers, normaliseSubject) stays real so the page behaves exactly.
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

describe('QP "Build a fresh set" — the second set must not be the first set', () => {
  it("THE OWNER'S BUG: a finished set → Build a fresh set → a DIFFERENT set of questions", async () => {
    mockBuild.mockResolvedValue(POOL); // constant pool: only the PAGE can make set #2 differ
    setMatchMediaMatches(true);
    render(
      <MemoryRouter initialEntries={["/practice/10/maths?source=practice&topic=real-numbers"]}>
        <Routes>
          <Route path="/practice/:grade/:subject" element={<PracticePage />} />
          <Route path="*" element={<div data-testid="elsewhere" />} />
        </Routes>
      </MemoryRouter>,
    );

    // ── Set #1: the "Quick drill" preset (marks=1, count=5) on the full-page path ──
    fireEvent.click(await screen.findByRole("button", { name: /Quick drill/i }));
    fireEvent.click(screen.getByRole("button", { name: /Start practising/i }));
    await screen.findAllByText(/^Question \d+: solve it\.$/);
    const first = displayedSet();
    expect(first).toHaveLength(5);
    const seedBefore = trace.seeds[trace.seeds.length - 1]?.value;

    // Answer all five → every displayed question attempted → the scorecard AUTO-offers.
    // The option button's accessible name is "<letter> <option text>" ("A q10-correct").
    for (const n of first) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`\\sq${n}-correct$`) }));
    }
    await waitFor(() => {
      if (!document.querySelector(".lt-sc__big")) throw new Error("scorecard not rendered yet");
    });
    const attemptsAtFinish = trace.attempts.length;
    const seenAtLastFetch = mockBuild.mock.calls[mockBuild.mock.calls.length - 1][0].seenQuestionIds;

    // ── Set #2: the real scorecard CTA ──
    const callsBefore = mockBuild.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /Build a fresh set/i }));
    await waitFor(() => {
      if (mockBuild.mock.calls.length <= callsBefore) throw new Error("no rebuild fetch yet");
      if (document.querySelector(".lt-sc__big")) throw new Error("scorecard still up");
    });
    await screen.findAllByText(/^Question \d+: solve it\.$/);
    const second = displayedSet();
    const seedAfter = trace.seeds[trace.seeds.length - 1]?.value;
    const seenAtFreshFetch = mockBuild.mock.calls[mockBuild.mock.calls.length - 1][0].seenQuestionIds;

    /* eslint-disable no-console */
    console.log(
      [
        "[TRACE · fresh-set]",
        `  pool                       = ${POOL.length} questions, constant on every fetch`,
        `  set #1 (displayed)         = [${first.join(", ")}]`,
        `  session seed @ set #1      = ${seedBefore}`,
        `  attempts blob @ finish     = ${attemptsAtFinish} (ids: ${trace.attempts.map((a) => a.questionId).join(", ")})`,
        `  seenQuestionIds @ fetch #1 = ${seenAtLastFetch ? seenAtLastFetch.size : "undefined"}`,
        `  --- tap "Build a fresh set" ---`,
        `  set #2 (displayed)         = [${second.join(", ")}]`,
        `  session seed @ set #2      = ${seedAfter}`,
        `  seenQuestionIds @ fetch #2 = ${seenAtFreshFetch ? seenAtFreshFetch.size : "undefined"}`,
        `  session seed moved?        = ${seedBefore !== seedAfter} (ALWAYS false — it is mount-once by design)`,
        `  sets identical?            = ${first.join(",") === second.join(",")}`,
      ].join("\n"),
    );
    /* eslint-enable no-console */

    expect(second).toHaveLength(5);
    // ROOT CAUSE A, pinned as a FACT about the page, not as the fix: the session seed can
    // never move in-session, so a fresh set that relies on it alone is doomed. The advance
    // therefore has to be applied ON TOP of the seed — proven observably by the SCARCITY
    // test below, where the draw rotates by exactly one step.
    expect(seedAfter).toBe(seedBefore);
    // ROOT CAUSE B — the set the student just worked must be carried into the seen-set, so
    // the unseen-first draw stops handing it back. Trunk: still 0 at the rebuild → FAIL.
    expect(seenAtFreshFetch && seenAtFreshFetch.size).toBeGreaterThanOrEqual(5);
    // THE BUG ITSELF — a fresh set is not the set you just finished. Trunk: identical → FAIL.
    expect(second.join(",")).not.toBe(first.join(","));
    // With 25 in the pool and 5 seen, the fresh set is fully NEW — no overlap at all.
    expect(second.filter((n) => first.includes(n))).toEqual([]);
  }, 30000);

  it("SCARCITY: when the pool is exhausted the set RECOMBINES (rotated), never an identical repeat", async () => {
    // Exactly as many questions as the set needs — the honest thin-bank case. There is
    // nothing new to serve, so the promise degrades to "a different arrangement of real
    // bank questions", never a fabricated one and never a byte-identical repeat.
    const tiny = POOL.slice(0, 5);
    mockBuild.mockResolvedValue(tiny);
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
    const first = displayedSet();

    for (const n of first) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`\\sq${n}-correct$`) }));
    }
    await waitFor(() => {
      if (!document.querySelector(".lt-sc__big")) throw new Error("scorecard not rendered yet");
    });

    const callsBefore = mockBuild.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /Build a fresh set/i }));
    await waitFor(() => {
      if (mockBuild.mock.calls.length <= callsBefore) throw new Error("no rebuild fetch yet");
      if (document.querySelector(".lt-sc__big")) throw new Error("scorecard still up");
    });
    await screen.findAllByText(/^Question \d+: solve it\.$/);
    const second = displayedSet();

    /* eslint-disable no-console */
    console.log(
      `[TRACE · scarcity] pool=5 · set #1 = [${first.join(", ")}] · set #2 = [${second.join(", ")}]`,
    );
    /* eslint-enable no-console */

    // Same five real questions (nothing invented, the pool has no more)…
    expect([...second].sort()).toEqual([...first].sort());
    // …but a genuinely different ORDER. Trunk: identical order → FAIL.
    expect(second.join(",")).not.toBe(first.join(","));
    // ROOT CAUSE A's fix, OBSERVED: the effective rotation offset advanced by EXACTLY ONE
    // — the whole seen partition rotates one step. This is the property that makes the
    // exhausted case safe for ANY pool size (n and n+1 differ modulo every N ≥ 2), so it
    // is pinned exactly rather than as "some difference".
    expect(second).toEqual([...first.slice(1), first[0]]);
  }, 30000);
});
