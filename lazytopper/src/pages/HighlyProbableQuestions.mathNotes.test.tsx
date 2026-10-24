// @vitest-environment jsdom
/**
 * GUARD — STEPS-CLEAN-1: the Important Questions "Show steps" panel no longer renders the generic
 * "Examiner notes" (`commonMistakes`) or "Marking note" (`examTip`) boxes, whatever the source
 * (server reply included). Steps themselves still render.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { fetchStepSolution } = vi.hoisted(() => ({ fetchStepSolution: vi.fn() }));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, fetchStepSolution };
});
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../data/highlyProbableQuestions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../data/highlyProbableQuestions")>();
  return {
    ...actual,
    getHighlyProbableQuestions: () => [
      {
        topic: "Real Numbers",
        subject: "Maths",
        questions: [
          {
            id: "hpq-m1",
            subject: "Maths",
            topic: "Real Numbers",
            section: "C",
            type: "Short",
            marks: 3,
            likelihood: "High",
            question: "Prove that the square root of 5 is irrational.",
          },
        ],
      },
    ],
  };
});

import HighlyProbableQuestions from "./HighlyProbableQuestions";

afterEach(() => {
  cleanup();
  fetchStepSolution.mockReset();
});

describe("STEPS-CLEAN-1 — Important Questions steps carry no Examiner notes / Marking note", () => {
  it("a server-style reply WITH commonMistakes + examTip renders the steps but neither box", async () => {
    fetchStepSolution.mockResolvedValue({
      totalMarks: 3,
      steps: [{ stepNumber: 1, description: "Assume the root is rational", working: "p/q in lowest terms", marks: 1 }],
      commonMistakes: ["Forgetting to state the contradiction"],
      examTip: "Always finish with the conclusion",
    });
    const { container } = render(
      <MemoryRouter initialEntries={["/hpq?subject=maths"]}>
        <HighlyProbableQuestions />
      </MemoryRouter>,
    );
    await screen.findByText(/square root of 5 is irrational/);
    fireEvent.click(screen.getByTestId("hpq-show-all-solutions"));
    fireEvent.click(screen.getByRole("button", { name: /Show steps/i }));
    await screen.findByText(/Assume the root is rational/);
    const text = container.textContent ?? "";
    expect(text).not.toContain("Examiner notes");
    expect(text).not.toContain("Marking note");
    expect(text).not.toContain("Exam tip");
    expect(text).not.toContain("Forgetting to state the contradiction");
    expect(text).not.toContain("Always finish with the conclusion");
  });
});
