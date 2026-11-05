/** UNIT-LABEL-1 - the honest unit note on the Universal ResultsScorecard (the shell every
 *  grading surface shares). Each positive is paired with a control. */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ResultsScorecard from "./ResultsScorecard";
import type { ScorecardGradedAnswer, ScorecardVariant } from "./scorecardVariants";
import type { CheckSolutionAnnotatedStep } from "../../ai/aiClient";
import { UNIT_DEDUCTION_NOTE } from "./unitDeduction";

const UNIT_LINE = "−½: write the unit (cm³) with your final answer.";
const step = (over: Partial<CheckSolutionAnnotatedStep> = {}): CheckSolutionAnnotatedStep => ({
  stepNumber: 1, description: "Final answer", studentWork: "V = 462", status: "partial",
  marksAwarded: 0.5, marksDeducted: 0.5, teacherAnnotation: UNIT_LINE, mistakeType: "presentation",
  correctedWorking: null, ...over,
});
const variant = (a: Partial<ScorecardGradedAnswer>): ScorecardVariant => ({
  surface: "chapter-test", title: "T", subtitle: "S",
  score: { kind: "marks", awarded: 2.5, total: 3, gradedCount: 1, totalQuestions: 1 },
  actions: [],
  gradedAnswers: [{ label: "Question 1", descriptor: "3 marks", awarded: 2.5, available: 3, ...a }],
});

describe("unit note on the scorecard", () => {
  it("shows once beside a unit-deduction step", () => {
    render(<ResultsScorecard variant={variant({ steps: [step()], lostDetail: UNIT_LINE })} onClose={() => {}} />);
    expect(screen.getAllByText(UNIT_DEDUCTION_NOTE)).toHaveLength(1);
  });
  it("shows on the answer-level line when no step block is shown", () => {
    render(<ResultsScorecard variant={variant({ lostDetail: UNIT_LINE })} onClose={() => {}} />);
    expect(screen.getAllByText(UNIT_DEDUCTION_NOTE)).toHaveLength(1);
  });
  it("CONTROL - another deduction shows no unit note", () => {
    render(<ResultsScorecard variant={variant({ steps: [step({ teacherAnnotation: "Used 3 s instead of 2 s." })], lostDetail: "Used 3 s instead of 2 s." })} onClose={() => {}} />);
    expect(screen.queryByText(UNIT_DEDUCTION_NOTE)).not.toBeInTheDocument();
  });
});
