// GATE-QP-1 F1 - on a walled account (answerBoxOff) a wrong MCQ tap must NOT show the "type/upload your working" nudge.
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" } }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ tier: "free", isPremium: false, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0, status: { tier: "free" }, startTrial: () => {}, upgradeToPremium: () => {} }),
}));
vi.mock("../../services/practiceInsights", () => ({ recordAttempt: () => "logged" }));
vi.mock("../../services/mistakeIntelligence", () => ({ recordMistake: async () => ({ outcome: "logged", bridged: false }), isSavedOutcome: () => true }));
vi.mock("../qr/QrAnswerHandoff", () => ({ default: () => null }));
vi.mock("../question/QuestionVisualAid", () => ({ QuestionVisualAid: () => null }));
vi.mock("../guide/saveNudge/saveNudge", () => ({
  WrongTapNudge: () => <div data-testid="wrong-tap-nudge" />,
  SaveNudge: () => null,
}));

import { PracticeQuestionCard } from "./PracticeQuestionCard";
import type { PracticeQuestion } from "../../data/predictionDataService";

afterEach(cleanup);

const MCQ = { id: "M1", marks: 1, section: "A", format: "MCQ", difficulty: "Easy", questionText: "The HCF of 6 and 9 is", options: ["2", "3", "6", "9"], answer: "3", subject: "Maths", topicKey: "real-numbers" } as unknown as PracticeQuestion;

function renderWrongTap(answerBoxOff: boolean) {
  render(
    <MemoryRouter>
      <PracticeQuestionCard
        q={MCQ} idx={0} subjectKey="Maths" topicLabel="Real Numbers" isOpen={false} solutionLoading={false}
        solutionError={undefined} solutionData={undefined} mcqSelection={2} mcqResult="wrong"
        onSetActiveQuestion={() => {}} onToggleAnswer={() => {}} onMcqSelect={() => {}} onMcqResult={() => {}}
        collectMode saveNudgeUid="u1" answerBoxOff={answerBoxOff} writtenLocked={answerBoxOff}
      />
    </MemoryRouter>,
  );
}

describe("GATE-QP-1 · wrong-tap nudge on a walled account", () => {
  it("CONTROL: with the answer box on, the nudge shows", () => {
    renderWrongTap(false);
    expect(screen.queryByTestId("wrong-tap-nudge")).not.toBeNull();
  });
  it("walled (answerBoxOff): no nudge, no dead buttons; the MCQ result still shows", () => {
    renderWrongTap(true);
    expect(screen.queryByTestId("wrong-tap-nudge")).toBeNull();
    expect(screen.getByText(/Not quite/)).toBeInTheDocument();
  });
});
