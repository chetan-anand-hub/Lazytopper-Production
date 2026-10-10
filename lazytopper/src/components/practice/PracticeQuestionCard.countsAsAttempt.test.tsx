// PRACTICE-REVIEW-HONEST-1 (DECISION 27a / 30b) — the SHARED card's `countsAsAttempt` prop.
// An MCQ picked after the student has seen the steps (Quick Practice review mode) still
// shows right/wrong (onMcqSelect + onMcqResult fire) but is NOT a real attempt, so it never
// reaches `recordAttempt`. Omitted / true ⇒ the shipped behaviour for every other host.

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const recordAttempt = vi.fn(() => "logged");
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" } }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free", isPremium: false, isTrialActive: false, isTrialExpired: false,
    daysLeftInTrial: 0, status: { tier: "free" }, startTrial: () => {}, upgradeToPremium: () => {},
  }),
}));
vi.mock("../../services/practiceInsights", () => ({
  recordAttempt: (...args: unknown[]) => (recordAttempt as unknown as (...a: unknown[]) => unknown)(...args),
}));
vi.mock("../../services/mistakeIntelligence", () => ({
  recordMistake: async () => ({ outcome: "logged", bridged: false }),
  isSavedOutcome: () => true,
}));
vi.mock("../qr/QrAnswerHandoff", () => ({ default: () => null }));
vi.mock("../question/QuestionVisualAid", () => ({ QuestionVisualAid: () => null }));

import { PracticeQuestionCard, PracticeAttemptCountingProvider } from "./PracticeQuestionCard";
import type { PracticeQuestion } from "../../data/predictionDataService";

afterEach(cleanup);
beforeEach(() => recordAttempt.mockClear());

const MCQ = {
  id: "M1",
  marks: 1,
  section: "A",
  format: "MCQ",
  difficulty: "Easy",
  questionText: "The HCF of 6 and 9 is",
  options: ["2", "3", "6", "9"],
  answer: "3",
  subject: "Maths",
  topicKey: "real-numbers",
} as unknown as PracticeQuestion;

function renderCard(countsAsAttempt: boolean | undefined, provider?: boolean) {
  const onMcqSelect = vi.fn();
  const onMcqResult = vi.fn();
  const card = (
      <PracticeQuestionCard
        q={MCQ}
        idx={0}
        subjectKey="Maths"
        topicLabel="Real Numbers"
        isOpen={false}
        solutionLoading={false}
        solutionError={undefined}
        solutionData={undefined}
        mcqSelection={undefined}
        mcqResult={undefined}
        onSetActiveQuestion={() => {}}
        onToggleAnswer={() => {}}
        onMcqSelect={onMcqSelect}
        onMcqResult={onMcqResult}
        {...(countsAsAttempt === undefined ? {} : { countsAsAttempt })}
      />
  );
  render(
    <MemoryRouter>
      {provider === undefined
        ? card
        : <PracticeAttemptCountingProvider value={provider}>{card}</PracticeAttemptCountingProvider>}
    </MemoryRouter>,
  );
  return { onMcqSelect, onMcqResult };
}

describe("PracticeQuestionCard · countsAsAttempt", () => {
  const cases: Array<{ name: string; prop: boolean | undefined; provider?: boolean; records: number }> = [
    { name: "omitted (CONTROL) → recordAttempt once", prop: undefined, records: 1 },
    { name: "true → recordAttempt once", prop: true, records: 1 },
    { name: "false (review mode) → right/wrong still reported, recordAttempt NOT called", prop: false, records: 0 },
    { name: "omitted under a host provider=false (PracticePage review mode) → NOT recorded", prop: undefined, provider: false, records: 0 },
    { name: "provider=true (PracticePage before Finish) → recordAttempt once", prop: undefined, provider: true, records: 1 },
  ];
  it.each(cases)("$name", ({ prop, provider, records }) => {
    const { onMcqSelect, onMcqResult } = renderCard(prop, provider);
    fireEvent.click(screen.getByRole("button", { name: /\b3\b/ }));
    expect(onMcqSelect).toHaveBeenCalledWith("M1", 1);
    expect(onMcqResult).toHaveBeenCalledWith("M1", "correct");
    expect(recordAttempt).toHaveBeenCalledTimes(records);
  });
});
