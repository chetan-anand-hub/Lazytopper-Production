// @vitest-environment jsdom
/**
 * GUARD — MATHTEXT-HPQ-1 (D235): the step solution's "Examiner notes" (`commonMistakes`) and "Marking note" (`examTip`) render
 * through MathText like the steps do, so maths in them shows as maths, not as plain text (`x^2`, `sqrt(5)`).
 *
 *   (a) a commonMistakes line and the examTip carry a `.katex` node (rendered maths);
 *   (b) the literal shorthand ("x^2", "sqrt(") is no longer in the notes' text as plain text;
 *   (c) CONTROL: a note with no maths still renders as plain text (no katex node, text intact), and an objective question shows neither block.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
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

const solution = (over: Record<string, unknown>) => ({
  totalMarks: 3,
  steps: [{ stepNumber: 1, description: "Assume sqrt(5) is rational", working: "sqrt(5) = p/q", marks: 1 }],
  ...over,
});

async function openSteps() {
  render(
    <MemoryRouter initialEntries={["/hpq?subject=maths"]}>
      <HighlyProbableQuestions />
    </MemoryRouter>,
  );
  await screen.findByText(/square root of 5 is irrational/);
  fireEvent.click(screen.getByTestId("hpq-show-all-solutions"));
  fireEvent.click(screen.getByRole("button", { name: /Show steps/i }));
  await screen.findByText("Examiner notes");
}

const notesBlock = () => screen.getByText("Examiner notes").parentElement as HTMLElement;
const markingBlock = () => screen.getByText("Marking note:").parentElement as HTMLElement;

describe("MATHTEXT-HPQ-1 — Examiner notes and Marking note render maths", () => {
  it("(a)(b) maths in a commonMistakes line and in the examTip is rendered, not shown as plain shorthand", async () => {
    fetchStepSolution.mockResolvedValue(
      solution({ commonMistakes: ["Writing x^2 = 5 and stopping at x = sqrt(5)"], examTip: "State that sqrt(5) is irrational before concluding" }),
    );
    await openSteps();
    await waitFor(() => expect(notesBlock().querySelector(".katex")).not.toBeNull());
    await waitFor(() => expect(markingBlock().querySelector(".katex")).not.toBeNull());
    expect(notesBlock().textContent).not.toMatch(/x\^2|sqrt\(/);
    expect(markingBlock().textContent).not.toMatch(/sqrt\(/);
  });

  it("(c) CONTROL: a note with no maths is plain text, intact", async () => {
    fetchStepSolution.mockResolvedValue(solution({ commonMistakes: ["Forgetting to state the contradiction"], examTip: "Always finish with the conclusion" }));
    await openSteps();
    expect(notesBlock().textContent).toContain("Forgetting to state the contradiction");
    expect(notesBlock().querySelector(".katex")).toBeNull();
    expect(markingBlock().textContent).toContain("Always finish with the conclusion");
    expect(markingBlock().querySelector(".katex")).toBeNull();
  });
});
