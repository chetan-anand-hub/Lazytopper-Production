// CBQ-1 PR-1 (ruling 2) — the SHARED question card shows the visible "CBQ" label iff
// isCbq(q). Every surface that renders PracticeQuestionCard (Practice / Quick Practice /
// chapter practice / the tutor's QP overlay, which mounts the real PracticePage) shows it.
// The legacy-flag row is the CONTROL: the label follows the one classifier, nothing else.

import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free",
    isPremium: false,
    isTrialActive: false,
    isTrialExpired: false,
    daysLeftInTrial: 0,
    status: { tier: "free" },
    startTrial: () => {},
    upgradeToPremium: () => {},
  }),
}));
vi.mock("../../services/practiceInsights", () => ({ recordAttempt: () => "logged" }));
vi.mock("../../services/mistakeIntelligence", () => ({
  recordMistake: async () => ({ outcome: "logged", bridged: false }),
  isSavedOutcome: () => true,
}));
vi.mock("../qr/QrAnswerHandoff", () => ({ default: () => null }));
vi.mock("../question/QuestionVisualAid", () => ({ QuestionVisualAid: () => null }));

import { PracticeQuestionCard } from "./PracticeQuestionCard";
import type { PracticeQuestion } from "../../data/predictionDataService";

afterEach(cleanup);

const mk = (extra: Record<string, unknown>): PracticeQuestion =>
  ({
    id: "Q1",
    marks: 2,
    section: "B",
    difficulty: "Medium",
    questionText: "A shopkeeper's bill shows ... Find the total.",
    solutionSteps: [],
    subject: "Maths",
    topicKey: "real-numbers",
    ...extra,
  }) as unknown as PracticeQuestion;

function renderCard(q: PracticeQuestion) {
  return render(
    <MemoryRouter>
      <PracticeQuestionCard
        q={q}
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
        onMcqSelect={() => {}}
        onMcqResult={() => {}}
      />
    </MemoryRouter>,
  );
}

describe("PracticeQuestionCard — the visible CBQ label", () => {
  it("★ a verified CBQ shows 'CBQ' with the accessible name", () => {
    renderCard(mk({ competencyVerified: true }));
    const label = screen.getByLabelText("Competency-based question");
    expect(label.textContent).toBe("CBQ");
  });

  it("CONTROL — a legacy isCompetencyBased Section-E row shows no CBQ label", () => {
    renderCard(mk({ isCompetencyBased: true, section: "E", marks: 4, format: "case-based" }));
    expect(screen.getByTestId("practice-question-card")).toBeTruthy(); // the card DID render
    expect(screen.queryByTestId("cbq-label")).toBeNull();
  });
});
