// TUTOR-FIX-2 (v3 small) — the Quick Practice scorecard INSIDE the tutor's overlay shows the same
// "Where marks slipped" rows as standalone Quick Practice, so the tutor's "Go through them" matches
// what the student saw. DISPLAY ONLY: no tutor hop inside the overlay (that would leave the
// thread), and nothing about recording changes.
//
// Harness: PracticePage.startHere.test.tsx (one router, the REAL page), mounted with `overlay`.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

const { authUser } = vi.hoisted(() => ({
  authUser: { current: null as null | { uid: string; isLocalSession: boolean; email?: string } },
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
const { written } = vi.hoisted(() => ({ written: [] as Array<{ id: string }> }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return {
    ...actual,
    writeSessionRecord: (_u: unknown, r: { id: string }) => {
      written.push({ id: r.id });
      return "recorded";
    },
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

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";

authUser.current = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;

function mkItem(n: number): PQ {
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

beforeEach(() => {
  written.length = 0;
});
afterEach(() => {
  cleanup();
  mockBuild.mockReset();
});

async function buildSet(overlay: boolean, pool: PQ[]) {
  mockBuild.mockResolvedValue(pool);
  setMatchMediaMatches(true);
  const onClose = vi.fn();
  render(
    <MemoryRouter initialEntries={[`/practice/10/maths?topic=real-numbers&count=${pool.length}&source=tutor&backLabel=Back+to+your+tutor`]}>
      <Routes>
        <Route
          path="/practice/:grade/:subject"
          element={overlay ? <PracticePage overlay={{ onClose }} /> : <PracticePage />}
        />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
  return onClose;
}

describe("v3 · the QP overlay scorecard shows the wrong-answer rows", () => {
  it("★★ inside the tutor overlay: the same 'Where marks slipped' rows, with no tutor hop", async () => {
    await buildSet(true, [mkItem(1), mkItem(2)]);
    fireEvent.click(screen.getByText("q1-wrong"));
    fireEvent.click(screen.getByText("q2-correct"));
    const rows = await screen.findAllByTestId("sc-wrong-answer");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Question 1");
    expect(rows[0].textContent).toContain("Your answer: q1-wrong");
    expect(rows[0].textContent).toContain("Correct answer: q1-correct");
    expect(screen.getByTestId("sc-wrong-heading")).toBeInTheDocument();
    expect(screen.queryByTestId("sc-tutor-ask")).toBeNull(); // never leaves the thread
  });

  it("CONTROL: standalone Quick Practice shows the same rows (unchanged)", async () => {
    await buildSet(false, [mkItem(1), mkItem(2)]);
    fireEvent.click(screen.getByText("q1-wrong"));
    fireEvent.click(screen.getByText("q2-correct"));
    const rows = await screen.findAllByTestId("sc-wrong-answer");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Your answer: q1-wrong");
  });
});
