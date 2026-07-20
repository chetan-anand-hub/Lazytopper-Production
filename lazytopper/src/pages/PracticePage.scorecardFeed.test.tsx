// PracticePage — QP SCORECARD DENOMINATOR regression ([FU-QP-SCORECARD-ATTEMPTS-WIPED]).
//
// THE OWNER'S BUG (verified against a screenshot): a full-page 5-MCQ Quick Practice showed
// "5 of 75 attempted · 1/5 MCQs correct". The attempts were counted CORRECTLY (5 of 5) — the
// DENOMINATOR was wrong: it read `questions.length`, the OVER-FETCHED engine pool (75 here),
// instead of `filteredQuestions.length`, the DISPLAYED set the student works (5).
//
// The over-fetch is by design: any marks/section filter fetches engineCount = count*5 (cap
// 100), so the pool varies (50, 75, 100…) but the student only ever sees + answers the chosen
// count. This pins the scorecard denominator to the DISPLAYED set, so it is "of 5" regardless
// of pool size. On trunk the hero reads "of <pool>" and FAILS; after the fix it reads "of 5".
//
// This test drives the REAL PracticePage on the FULL-PAGE preset path (source=practice → the
// preset chooser — NOT the tutor overlay's arrivedTargeted bypass, the path a prior agent's
// "does not reproduce" mistakenly tested).

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

// ── Mocks: keep the heavy data/network/Firebase surface out; keep the pure logic real ──
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: () => {},
}));
vi.mock("../services/adaptivePracticeEngine", () => ({
  computeAdaptiveDifficultyMix: () => undefined,
  getWrongConceptsForTopic: () => [],
}));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));

// Keep the real service EXCEPT: force rotation to 0 (deterministic displayed slice) and
// no-op the persistence write (§1a: QP writes no record; this just avoids storage I/O).
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return { ...actual, sessionRotationOffset: () => 0, persistQuickPracticeSession: () => {} };
});

// The engine: override ONLY the set builder so we control the returned POOL. Everything
// else (MIN/MAX counts, parsers, normaliseSubject) stays real so the page behaves exactly.
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn() };
});

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";

const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);

type PQ = import("../data/predictionDataService").PracticeQuestion;

/** A 1-mark Section-A item. With `options`, it renders as a clickable MCQ whose correct
 *  answer is option 0 (`q<n>-correct`) — so clicking `q<n>-wrong` is a WRONG attempt.
 *  Without `options`, it renders as a written question with no clickable attempt signal. */
function mkItem(n: number, withOptions: boolean): PQ {
  const base = {
    id: `q-${n}`,
    questionText: `Question ${n}: solve it.`,
    marks: 1,
    section: "A",
    format: withOptions ? "mcq" : "vsa",
    difficulty: "Easy",
    subtopic: "seed",
    topicKey: "real-numbers",
  };
  return (withOptions
    ? { ...base, options: [`q${n}-correct`, `q${n}-wrong`, `q${n}-c`, `q${n}-d`], answer: `q${n}-correct` }
    : base) as unknown as PQ;
}

afterEach(() => {
  cleanup();
  mockBuild.mockReset();
});

/** Mount the full-page path, build the "Quick drill" preset (marks=1, chosen count), and
 *  return once the built set has rendered its DISPLAYED questions. */
async function buildQuickDrill(pool: PQ[]) {
  mockBuild.mockResolvedValue(pool);
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={["/practice/10/maths?source=practice"]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="*" element={<div data-testid="elsewhere" />} />
      </Routes>
    </MemoryRouter>,
  );
  // Preset chooser (full-page, source=practice → NOT arrivedTargeted).
  fireEvent.click(await screen.findByRole("button", { name: /Quick drill/i }));
  fireEvent.click(screen.getByRole("button", { name: /Start practising/i }));
  // The built set renders the DISPLAYED questions (filteredQuestions), sliced to the count.
  return screen.findAllByText(/^Question \d+: solve it\.$/);
}

/** Surface the scorecard and return its root element (for hero + MCQ-line reads). When
 *  every displayed question is attempted the scorecard AUTO-offers (allDone) and the Finish
 *  button is gone — so tap Finish only if it is still present (a partial set). */
async function finishAndScorecard() {
  const finish = screen.queryByRole("button", { name: /Finish session/i });
  if (finish) fireEvent.click(finish);
  return waitFor(() => {
    const hero = document.querySelector<HTMLElement>(".lt-sc__big");
    if (!hero) throw new Error("scorecard hero not rendered yet");
    return hero.closest("[aria-label]") as HTMLElement ?? hero.parentElement!;
  });
}

describe("QP scorecard denominator — full-page path", () => {
  it("THE OWNER'S BUG: a chosen-5 MCQ set reads '5 of 5', NOT '5 of 75' (over-fetched pool)", async () => {
    // Engine over-fetches a 75-question pool for the chosen 5 — the owner's exact screenshot.
    const cards = await buildQuickDrill(Array.from({ length: 75 }, (_, i) => mkItem(i, true)));
    expect(cards).toHaveLength(5); // the student SEES 5, not 75

    // Answer all 5 (1 correct + 4 wrong) — the screenshot's "5 of 75 · 1/5 MCQs correct".
    fireEvent.click(screen.getByRole("button", { name: /q0-correct/ }));
    for (let i = 1; i < 5; i++) fireEvent.click(screen.getByRole("button", { name: new RegExp(`q${i}-wrong`) }));

    const card = await finishAndScorecard();
    const hero = card.querySelector(".lt-sc__big")?.textContent?.replace(/\s+/g, " ").trim();
    const mcqLine = card.querySelector(".lt-sc__mcq")?.textContent?.replace(/\s+/g, " ").trim();
    // eslint-disable-next-line no-console
    console.log(`[REPRO · owner MCQ] hero = "${hero}" · mcq = "${mcqLine}" (pool=75, displayed=5)`);

    // Attempts were ALWAYS counted correctly (5 of 5, 1/5 correct) — the DENOMINATOR was the bug.
    expect(mcqLine).toMatch(/^1\/5 MCQs correct/);
    // THE FIX: denominator is the DISPLAYED 5, not the pool 75. Trunk: "5 of 75" → FAIL.
    expect(hero).toBe("5 of 5");
  }, 20000);

  it("denominator is displayed-independent of attempt count: a no-attempt-signal set reads 'of 5', not 'of 75'", async () => {
    // NOTE: this is a CONSTRUCTED case, NOT the owner's bug. Optionless (written) items have no
    // clickable attempt signal, so attempted=0 — it isolates the DENOMINATOR (which is fixed to
    // the displayed set regardless of how many were attempted). The absent attempt signal for
    // written/subjective responses is a SEPARATE product lane: [FU-QP-WRITTEN-BINARY-CHECK].
    const cards = await buildQuickDrill(Array.from({ length: 75 }, (_, i) => mkItem(i, false)));
    expect(cards).toHaveLength(5);

    const card = await finishAndScorecard();
    const hero = card.querySelector(".lt-sc__big")?.textContent?.replace(/\s+/g, " ").trim();
    // eslint-disable-next-line no-console
    console.log(`[REPRO · written control] hero = "${hero}" (pool=75, displayed=5, no attempt signal)`);

    // Denominator is the DISPLAYED 5, not the over-fetched 75, even at 0 attempted. Trunk: "0 of 75".
    expect(hero).toBe("0 of 5");
  }, 20000);
});
