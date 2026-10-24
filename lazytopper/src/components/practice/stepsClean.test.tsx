// @vitest-environment jsdom
/**
 * GUARD — STEPS-CLEAN-1: (a) local step solutions carry no generic commonMistakes / examTip;
 * (b) PracticeQuestionCard renders neither "Examiner notes" nor "Exam tip" even when a
 * server-style solutionData has them; (c) the tutor link shows a real arrow, not the
 * six characters of a unicode escape.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free", isPremium: false, isTrialActive: false, isTrialExpired: false,
    daysLeftInTrial: 0, status: { tier: "free" }, startTrial: () => {}, upgradeToPremium: () => {},
  }),
}));
vi.mock("../../services/practiceInsights", () => ({ recordAttempt: () => "logged" }));
vi.mock("../../services/mistakeIntelligence", () => ({
  recordMistake: async () => ({ outcome: "logged", bridged: false }),
  isSavedOutcome: () => true,
}));
vi.mock("../qr/QrAnswerHandoff", () => ({ default: () => null }));
vi.mock("../question/QuestionVisualAid", () => ({ QuestionVisualAid: () => null }));
vi.mock("../../diagrams/SolutionFigure", () => ({ default: () => null }));

import { PracticeQuestionCard } from "./PracticeQuestionCard";
import { fetchStepSolution, type StepSolutionResponse } from "../../ai/aiClient";
import type { PracticeQuestion } from "../../data/predictionDataService";

const PQ = {
  id: "Q1", marks: 3, section: "C", difficulty: "Medium",
  questionText: "Solve x^2 - 5x + 6 = 0.", solutionSteps: ["Factorise."], finalAnswer: "2, 3",
  subject: "Maths", topicKey: "quadratic-equations",
} as unknown as PracticeQuestion;

describe("STEPS-CLEAN-1", () => {
  it("(a) fetchStepSolution with stored solutionSteps returns no commonMistakes / examTip", async () => {
    for (const type of ["MCQ", "Short"]) {
      const sol = await fetchStepSolution({
        subject: "Maths", topic: "t", question: "q", marks: 3, type,
        solutionSteps: ["a", "b", "c"], finalAnswer: "2",
      });
      expect(sol.steps.length).toBe(3);
      expect(sol).not.toHaveProperty("commonMistakes");
      expect(sol).not.toHaveProperty("examTip");
    }
  });

  function paint() {
    const solutionData = {
      totalMarks: 3,
      steps: [{ stepNumber: 1, description: "Factorise.", working: "(x - 2)(x - 3) = 0", marks: 3 }],
      commonMistakes: ["Sign error in the discriminant"],
      examTip: "Show the discriminant computation as its own step.",
    } as unknown as StepSolutionResponse;
    return render(
      <MemoryRouter>
        <PracticeQuestionCard
          q={PQ} idx={0} subjectKey="Maths" topicLabel="Quadratic Equations"
          isOpen solutionLoading={false} solutionError={undefined} solutionData={solutionData}
          mcqSelection={undefined} mcqResult={undefined}
          onSetActiveQuestion={() => {}} onToggleAnswer={() => {}} onMcqSelect={() => {}} onMcqResult={() => {}}
          onAskTutor={() => {}}
          stepsLocked={false}
        />
      </MemoryRouter>,
    );
  }

  it("(b) card renders neither Examiner notes nor Exam tip from a server-style reply", () => {
    const { container } = paint();
    const text = container.textContent ?? "";
    expect(text).toContain("Factorise.");
    expect(text).not.toContain("Examiner notes");
    expect(text).not.toContain("Exam tip");
    expect(text).not.toContain("Sign error in the discriminant");
  });

  it("(c) tutor link shows a real arrow, not a literal unicode escape", () => {
    paint();
    const btn = screen.getByRole("button", { name: /Ask the tutor about this concept/ });
    expect(btn.textContent).toContain("→");
    expect(btn.textContent).not.toContain("\\u2192");
    expect(btn.textContent).toBe("Ask the tutor about this concept →");
  });
});
