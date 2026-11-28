/**
 * AC-SOLUTION-1 — the "Complete correct solution" card. Display only; honest empty.
 * Every positive assertion has a control.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { ModelSolutionCard } from "./ModelSolutionCard";

const SOL = {
  steps: [
    { description: "Sum of exterior angles", working: "n/2[2(8)+(n-1)4] = 360", marks: 1 },
    { description: "Solve", working: "n^2 + 3n - 180 = 0", marks: 1 },
    { description: "Conclude", working: "n = 12", marks: 1 },
  ],
  totalMarks: 3,
};
const LOST = { totalMarks: 3, marksAwarded: 1, annotatedSteps: [] };
const FULL = { totalMarks: 3, marksAwarded: 3, annotatedSteps: [] };
const LOST_STEPS = [
  { stepNumber: 1, description: "Sets up the sum", status: "correct", marksDeducted: 0, teacherAnnotation: "ok" },
  { stepNumber: 2, description: "Solves the quadratic", status: "incorrect", marksDeducted: 2, teacherAnnotation: "Roots wrong." },
];

describe("ModelSolutionCard", () => {
  it("is OPEN when marks were lost, with every step, its marks and the total", () => {
    render(<ModelSolutionCard modelSolution={SOL} question={LOST} steps={LOST_STEPS} />);
    const card = screen.getByTestId("model-solution") as HTMLDetailsElement;
    expect(card.open).toBe(true);
    expect(screen.getByText("Complete correct solution")).toBeTruthy();
    expect(screen.getAllByTestId("model-solution-step")).toHaveLength(3);
    expect(screen.getByText(/Total: 3 marks/)).toBeTruthy();
    expect(screen.getAllByText(/\[1 mark\]/)).toHaveLength(3);
  });

  it("is COLLAPSED on full marks (control for the open case)", () => {
    render(<ModelSolutionCard modelSolution={SOL} question={FULL} steps={[]} />);
    const card = screen.getByTestId("model-solution") as HTMLDetailsElement;
    expect(card.open).toBe(false);
    expect(screen.getByText("See the full solution")).toBeTruthy();
    expect(screen.queryByTestId("model-solution-vs")).toBeNull();
  });

  it("renders NOTHING without data — no placeholder (control: renders with data)", () => {
    for (const m of [undefined, null, { steps: [], totalMarks: 0 }, { steps: [{ description: "", working: "", marks: 1 }], totalMarks: 1 }]) {
      const { container, unmount } = render(<ModelSolutionCard modelSolution={m as never} question={LOST} steps={LOST_STEPS} />);
      expect(container.querySelector("[data-testid=model-solution]")).toBeNull();
      expect(container.textContent).toBe("");
      unmount();
    }
    const { container } = render(<ModelSolutionCard modelSolution={SOL} question={LOST} steps={[]} />);
    expect(container.querySelector("[data-testid=model-solution]")).not.toBeNull();
  });

  it("with no verifiable link, shows 'Your answer vs the full solution' from the grader's own non-correct steps and never a tick or cross per solution step", () => {
    render(<ModelSolutionCard modelSolution={SOL} question={LOST} steps={LOST_STEPS} />);
    const vs = screen.getByTestId("model-solution-vs");
    expect(vs.textContent).toContain("Your answer vs the full solution");
    expect(vs.textContent).toContain("Roots wrong.");
    expect(vs.textContent).not.toContain("Sets up the sum"); // a correct step is not a loss
    const steps = screen.getAllByTestId("model-solution-step");
    for (const s of steps) expect(s.textContent).not.toMatch(/[✓✗✔✘]/);
  });

  it("an answer that was not graded is not 'lost marks': collapsed, no summary", () => {
    render(<ModelSolutionCard modelSolution={SOL} question={{ ...LOST, couldNotRead: true }} steps={LOST_STEPS} />);
    expect((screen.getByTestId("model-solution") as HTMLDetailsElement).open).toBe(false);
    expect(screen.queryByTestId("model-solution-vs")).toBeNull();
  });

  it("renders maths through MathText (source pin, with a control)", () => {
    const src = readFileSync(resolve(__dirname, "ModelSolutionCard.tsx"), "utf8");
    expect(src).toMatch(/import \{ MathText \} from "..\/question\/MathText"/);
    expect((src.match(/<MathText /g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(src).not.toMatch(/style=\{\{/);
  });
});
