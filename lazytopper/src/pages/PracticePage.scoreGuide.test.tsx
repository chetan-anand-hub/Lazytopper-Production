// GUIDE-SCORE-1 — Byte's in-page actions on the REAL Quick Practice page (PracticePage → the
// Universal scorecard → back to the set → PracticeQuestionCard). Owner ruling 23 Oct 17:57: Quick
// Practice never sends a student to /check-improve.
// QP-WORKING-AFTER-1 (owner ruling 23 Oct 23:11 "B"): after the scorecard, written working is not
// graded, so Byte no longer opens a working box:
//   missed taps  → "Show me the first one I missed →"  opens the FIRST MISSED question's SOLUTION;
//   all right    → a forward-looking line and the next practice link (no box).
// Marks never change.
//
// ★ The harness of PracticePage.moments.test.tsx.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

const { authUser, cloudHas, localRows, writtenCloud } = vi.hoisted(() => ({
  writtenCloud: vi.fn(),
  authUser: { current: null as null | { uid: string; isLocalSession: boolean; email?: string } },
  cloudHas: vi.fn(),
  localRows: vi.fn(),
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: authUser.current, loading: false, getToken: async () => "tok" }),
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
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return {
    ...actual,
    loadLocalSessionRecords: (...a: unknown[]) => localRows(...a),
    cloudHasAnySessionRecord: (...a: unknown[]) => cloudHas(...a),
    writeSessionRecord: () => "recorded",
    writeSessionPerQuestion: () => {},
  };
});
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, gradeWorksheet: vi.fn(), checkSolutionImage: vi.fn() };
});
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return { ...actual, sessionRotationOffset: () => 0 };
});
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn() };
});
// MOMENTS-1 M11's server read: this student HAS had written work graded → no M11 (it would own
// the card, and the scorecard's character would rightly yield to it).
vi.mock("../components/guide/moments/writtenGradedCloud", async (importActual) => {
  const actual = await importActual<typeof import("../components/guide/moments/writtenGradedCloud")>();
  return { ...actual, cloudHasWrittenGraded: (...a: unknown[]) => writtenCloud(...a) };
});

import PracticePage from "./PracticePage";
import { __resetM11ForTests } from "../components/guide/moments/moments";
import { resetWrittenGradedForTests } from "../components/guide/moments/writtenGraded";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";
import { askCloudOnce, resetZeroGradedCacheForTests } from "../components/startHere/zeroGraded";
import { __setGuideAbForTests } from "../components/guide/guideVariant";
import { __resetMascotsForTests } from "../components/guide/mascotsMute";
import { __resetStageForTests } from "../components/guide/scoreGuideStage";

const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;
const UID = "qp-score-guide";

/** An MCQ (correct = option 0). */
function mkMcq(n: number): PQ {
  return {
    id: `q-${n}`,
    questionText: `Question ${n}: solve it.`,
    marks: 1,
    section: "A",
    format: "mcq",
    difficulty: "Hard",
    subtopic: "seed",
    topicKey: "real-numbers",
    solutionSteps: [`Bank step one of question ${n}.`],
    finalAnswer: `answer-${n}`,
    options: [`q${n}-correct`, `q${n}-wrong`, `q${n}-c`, `q${n}-d`],
    answer: `q${n}-correct`,
  } as unknown as PQ;
}
const FIVE = [1, 2, 3, 4, 5].map(mkMcq);

function mount() {
  setMatchMediaMatches(false);
  render(
    <MemoryRouter initialEntries={["/practice/10/maths?topic=real-numbers&count=5"]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Tap every MCQ (the `wrong` ones on their wrong option), Finish, wait for the scorecard. */
async function finishTaps(wrong: number[]) {
  mockBuild.mockResolvedValue(FIVE);
  mount();
  await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
  for (let n = 1; n <= 5; n += 1) fireEvent.click(screen.getByText(wrong.includes(n) ? `q${n}-wrong` : `q${n}-correct`));
  const finish = screen.queryByRole("button", { name: /Finish session/i });
  if (finish) fireEvent.click(finish);
  await screen.findByRole("dialog", {}, { timeout: 10000 });
}

/** Byte's button on the scorecard (after Ziggy's beat). */
async function byteButton() {
  return screen.findByTestId("score-guide-cta", {}, { timeout: 8000 });
}

const card = (id: string) => document.querySelector(`[data-question-id="${id}"]`) as HTMLElement;
const checkerIn = (id: string) => card(id)?.querySelector('[data-testid="practice-checker"]') as HTMLElement | null;

beforeEach(async () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetMascotsForTests();
  __resetStageForTests();
  resetZeroGradedCacheForTests();
  authUser.current = { uid: UID, isLocalSession: false, email: "s@x.com" };
  cloudHas.mockReset().mockResolvedValue(true);
  localRows.mockReset().mockReturnValue([]);
  await askCloudOnce(UID);
  writtenCloud.mockReset().mockResolvedValue(true);
  resetWrittenGradedForTests();
  __resetM11ForTests();
  __setGuideAbForTests(true, "guide");
});
afterEach(() => {
  cleanup();
  mockBuild.mockReset();
  setMatchMediaMatches(false);
  __setGuideAbForTests(null);
});

describe("GUIDE-SCORE-1 · Byte opens THIS set's working box (Quick Practice, real page)", () => {
  it("★★ missed taps: 'Show me the first one I missed →' opens Q2's SOLUTION (no working box), focused", async () => {
    await finishTaps([2, 4]);
    const cta = await byteButton();
    expect(cta.textContent).toBe("Show me the first one I missed →");
    expect(cta.tagName).toBe("BUTTON"); // in-page: never a link to another page
    expect(screen.getByTestId("score-guide-line").textContent).toMatch(/2 questions wrong/);
    fireEvent.click(cta);
    await waitFor(() => expect(card("q-2")?.textContent).toContain("Bank step one of question 2."), { timeout: 5000 });
    // The solution only: no working box anywhere, and only Q2's steps opened.
    expect(document.querySelectorAll('[data-testid="practice-checker"]').length).toBe(0);
    expect(card("q-4")?.textContent).not.toContain("Bank step one of question 4.");
    await waitFor(() => expect(document.activeElement).toBe(card("q-2")), { timeout: 3000 });
  }, 60_000);

  it("★★ all taps right: a forward-looking line and the next-practice link — no working box", async () => {
    await finishTaps([]);
    const cta = await byteButton();
    expect(cta.textContent).not.toMatch(/Add working/);
    expect(screen.getByTestId("score-guide-line").textContent).toMatch(/Next time/);
    expect(cta.getAttribute("href")).not.toBe("/check-improve");
  }, 60_000);

  it("★ never a /check-improve link on the Quick Practice scorecard", async () => {
    await finishTaps([3]);
    await byteButton();
    for (const a of Array.from(document.querySelectorAll('[data-testid="score-guide"] a'))) {
      expect(a.getAttribute("href")).not.toBe("/check-improve");
    }
  }, 60_000);
});
