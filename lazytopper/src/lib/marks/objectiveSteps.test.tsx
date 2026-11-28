/**
 * OBJ-NO-STEPMARK-1 - an objective question shows ONE "1 mark" chip and no half-mark text, in the answer-key PDF HTML
 * and in every in-app view that prints a bank step; a 3-mark question keeps its step chips.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { isObjectiveSteps, stripStepMarks, displaySteps } from "./objectiveSteps";
import { WorksheetPrintDoc } from "../../components/worksheet/WorksheetPrintDoc";
import { ModelSolutionCard } from "../../components/results/ModelSolutionCard";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

afterEach(cleanup);

const HALVES = ["[0.5 mark] Since 2 is a root, 4 + 2a + b = 0, so a = -8.", "[0.5 mark] For equal roots, D = 0, so q = 16. Answer: (A)"];

function ws(q: Record<string, unknown>): PersistedWorksheet {
  return {
    id: "w1", subject: "Maths", chapter: "Polynomials", createdAt: 0,
    questions: [{ id: "q1", qNumber: 1, section: "A", marks: 1, questionText: "Q?", answer: "(A)", finalAnswer: "(A)", ...q }],
  } as unknown as PersistedWorksheet;
}

describe("objectiveSteps helper", () => {
  it("detects MCQ by options, format or 1 mark; a 3-mark written row is not objective", () => {
    expect(isObjectiveSteps({ options: ["a", "b"], marks: 2 })).toBe(true);
    expect(isObjectiveSteps({ format: "Assertion-Reasoning", marks: 1 })).toBe(true);
    expect(isObjectiveSteps({ marks: 1 })).toBe(true);
    expect(isObjectiveSteps({ marks: 3, format: "Short" })).toBe(false);
  });
  it("strips leading and trailing step marks only on objective rows", () => {
    expect(stripStepMarks("[0.5 mark] a = -8")).toBe("a = -8");
    expect(stripStepMarks("LCM = 60 [1]")).toBe("LCM = 60");
    expect(stripStepMarks("keep a[1] as it is")).toBe("keep a[1] as it is");
    expect(displaySteps({ marks: 1 }, HALVES).join(" ")).not.toMatch(/mark\]/);
    expect(displaySteps({ marks: 3 }, HALVES)).toEqual(HALVES);
  });
});

describe("answer-key PDF HTML", () => {
  it("the 0.5 + 0.5 objective example renders ONE '1 mark' chip and no half-mark text", () => {
    const { container } = render(<WorksheetPrintDoc ws={ws({ options: ["1", "2", "3", "4"], solutionSteps: HALVES })} kind="answers" />);
    const chips = Array.from(container.querySelectorAll(".lt-wsp__chip")).map((c) => c.textContent).filter(Boolean);
    expect(chips).toEqual(["1 mark"]);
    expect(container.textContent).not.toMatch(/0\.5 mark|½|\[0\.5/);
    expect(container.textContent).toContain("a = -8");
  });
  it("a 1-mark row with no options (format only) gets the same single chip", () => {
    const { container } = render(<WorksheetPrintDoc ws={ws({ solutionSteps: HALVES })} kind="answers" />);
    expect(Array.from(container.querySelectorAll(".lt-wsp__chip")).map((c) => c.textContent).filter(Boolean)).toEqual(["1 mark"]);
  });
  it("a 3-mark question keeps its step chips", () => {
    const { container } = render(<WorksheetPrintDoc ws={ws({ marks: 3, section: "C", solutionSteps: ["[1 mark] a", "[1 mark] b", "[1 mark] c"] })} kind="answers" />);
    expect(Array.from(container.querySelectorAll(".lt-wsp__chip")).map((c) => c.textContent).filter(Boolean)).toEqual(["1 mark", "1 mark", "1 mark"]);
  });
});

describe("Answer Checker ModelSolutionCard", () => {
  const SOL = { steps: [{ description: "Root", working: "a = -8", marks: 0.5 }, { description: "D = 0", working: "q = 16", marks: 0.5 }], totalMarks: 1 };
  it("an objective model solution shows the steps and ONE total, no per-step marks", () => {
    render(<ModelSolutionCard modelSolution={SOL} question={{ totalMarks: 1, marksAwarded: 0, format: "MCQ" }} />);
    expect(screen.getAllByTestId("model-solution-step")).toHaveLength(2);
    expect(screen.getByText(/Total: 1 mark/)).toBeTruthy();
    expect(screen.queryByText(/0\.5 mark/)).toBeNull();
  });
  it("a 3-mark model solution keeps per-step marks", () => {
    const three = { steps: [{ working: "a", marks: 1 }, { working: "b", marks: 1 }, { working: "c", marks: 1 }], totalMarks: 3 };
    render(<ModelSolutionCard modelSolution={three} question={{ totalMarks: 3, marksAwarded: 1 }} />);
    expect(screen.getAllByText(/\[1 mark\]/)).toHaveLength(3);
  });
});

describe("answer-key layout (owner defects A and B)", () => {
  const long = "(d) P and S, because the displaced metal is more reactive than the salt it leaves";
  const opts = ["P and Q", "Q and R", "R and S", "P and S"];
  it("lists the options with the correct one marked, one chip, all explanation lines in one block", () => {
    const { container } = render(<WorksheetPrintDoc ws={ws({ options: opts, finalAnswer: long, answer: long, solutionSteps: ["[0.5 mark] P line", "[0.5 mark] Q line", "R line", "S line"] })} kind="answers" />);
    const items = container.querySelectorAll("[data-testid=key-options] li");
    expect(items).toHaveLength(4);
    expect(container.querySelectorAll("[data-correct=true]")).toHaveLength(1);
    expect(items[3].getAttribute("data-correct")).toBe("true");
    expect(container.querySelectorAll(".lt-wsp__chip")).toHaveLength(1);
    expect(container.querySelectorAll(".lt-wsp__step")).toHaveLength(1);
    expect(container.querySelectorAll(".lt-wsp__step .lt-wsp__expl")).toHaveLength(4);
  });
  it("the header and a long answer are two rows, the answer not inside the header row", () => {
    const { container } = render(<WorksheetPrintDoc ws={ws({ options: opts, finalAnswer: long, solutionSteps: ["x"] })} kind="answers" />);
    const head = container.querySelector(".lt-wsp__solhead")!;
    const line = container.querySelector("[data-testid=key-answer-line]")!;
    expect(head.contains(line)).toBe(false);
    expect(head.textContent).toMatch(/Q1 \u00b7 Section A/);
    expect(head.textContent).not.toContain("Answer:");
    expect(line.textContent).toContain("Answer:");
  });
});
