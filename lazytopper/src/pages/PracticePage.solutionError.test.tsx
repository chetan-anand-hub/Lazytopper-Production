// PracticePage — BUGFIX-1 · B2: the step-solution error speaks to the student.
//
// A signed-in student whose ID token could not be confirmed is thrown a
// `SignInAgainError` (ai/paidCallHeaders.ts) whose message asks for the one thing that
// fixes it. "Show steps" used to swallow EVERY error behind the same generic line.
// Detection is by `err.name`, never `instanceof`; every other error keeps today's copy.
//
// ★ ONE router — the same seed-location harness as PracticePage.batchGrading.test.tsx.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
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

const { fetchStepSolution } = vi.hoisted(() => ({ fetchStepSolution: vi.fn() }));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, fetchStepSolution };
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

const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;

/** A written question with NO pre-written steps, so "Show steps" goes to the network. */
function written(n: number): PQ {
  return {
    id: `q-${n}`,
    questionText: `Question ${n}: solve it.`,
    marks: 3,
    section: "C",
    format: "vsa",
    difficulty: "Easy",
    subtopic: "seed",
    topicKey: "real-numbers",
  } as unknown as PQ;
}

const SIGN_IN_COPY = "We couldn't confirm you're signed in. Please sign in again, then try once more.";
const GENERIC_COPY = "Solution steps are unavailable right now. You can still check your work or try again.";

function signInAgainError(): Error {
  const e = new Error(SIGN_IN_COPY);
  e.name = "SignInAgainError";
  return e;
}

afterEach(() => {
  cleanup();
  mockBuild.mockReset();
  fetchStepSolution.mockReset();
});

async function openStepsOnFirstQuestion() {
  mockBuild.mockResolvedValue([written(1), written(2), written(3)]);
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={["/practice/10/maths?topic=real-numbers&count=3"]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findAllByText(/^Question \d+: solve it\.$/);
  fireEvent.click(screen.getAllByRole("button", { name: /Show steps/i })[0]);
}

describe("BUGFIX-1 · B2 · Practice step-solution error copy", () => {
  it("★★ a SignInAgainError renders its own message — the student is told to sign in again", async () => {
    fetchStepSolution.mockRejectedValue(signInAgainError());
    await openStepsOnFirstQuestion();
    expect(await screen.findByText(SIGN_IN_COPY)).toBeInTheDocument();
    expect(screen.queryByText(GENERIC_COPY)).toBeNull();
    expect(fetchStepSolution).toHaveBeenCalledTimes(1);
  });

  it("★ CONTROL: any other error keeps today's copy — and never leaks the raw message", async () => {
    fetchStepSolution.mockRejectedValue(new Error("premium_required"));
    await openStepsOnFirstQuestion();
    expect(await screen.findByText(GENERIC_COPY)).toBeInTheDocument();
    expect(screen.queryByText(/premium_required/)).toBeNull();
    expect(screen.queryByText(SIGN_IN_COPY)).toBeNull();
  });
});
