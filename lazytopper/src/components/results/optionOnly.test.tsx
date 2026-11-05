// SCORECARD-SECTION-TYPE-1 (owner copy ruling, 5 Nov 2026) - a wrong MCQ / Assertion-Reason with no working says
// "Option only - no working to diagnose" instead of "Marks lost, reason not recorded". Copy only: no mark moves.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { WorksheetQuestionGrade } from "../../ai/aiClient";
import { OPTION_ONLY_LABEL, UNTYPED_MARKS_LABEL, isOptionPickQuestion, paperMarksLost } from "../../lib/mistakeDisplay";
import ResultsScorecard from "./ResultsScorecard";
import { aggregateMarksLost, type ScorecardVariant } from "./scorecardVariants";

afterEach(() => cleanup());

const zero = { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0 };
const q = (qNumber: number, total: number, awarded: number, byType: Partial<typeof zero>, extra: Partial<WorksheetQuestionGrade> = {}): WorksheetQuestionGrade => ({
  qNumber,
  couldNotRead: false,
  ok: true,
  totalMarks: total,
  marksAwarded: awarded,
  marksLostByType: { ...zero, ...byType },
  ...extra,
});

describe("paperMarksLost.optionOnly", () => {
  it("counts the untyped marks of wrong option picks (objective echo or stamped type), and only those", () => {
    const pm = paperMarksLost([
      q(1, 1, 0, { untyped: 1 }, { objective: true }), // grader-echoed objective
      q(2, 1, 0, { untyped: 1 }, { format: "Assertion-Reasoning" }), // stamped bank type
      q(3, 1, 0, { untyped: 1 }, { format: "objective" }), // Answer Checker read
      q(4, 3, 2, { untyped: 1 }, { format: "Short" }), // a written answer: stays "reason not recorded"
      q(5, 2, 1, { presentation: 1 }),
    ])!;
    expect(pm.byType.untyped).toBe(4);
    expect(pm.optionOnly).toBe(3);
    expect(pm.lost).toBe(5);
  });

  it("absent when no option pick lost marks untyped, or when the rows carry no objective flag (nothing is guessed)", () => {
    expect(paperMarksLost([q(1, 1, 0, { untyped: 1 })])!.optionOnly).toBeUndefined();
    expect(paperMarksLost([q(1, 1, 0, { conceptual: 1 }, { objective: true })])!.optionOnly).toBeUndefined();
  });

  it("an option pick with a typed loss is not 'option only'", () => {
    expect(isOptionPickQuestion({ objective: true })).toBe(true);
    expect(isOptionPickQuestion({ format: "Short" })).toBe(false);
    expect(isOptionPickQuestion(null)).toBe(false);
  });
});

describe("the scorecard's 'Where your marks went'", () => {
  const variant = (pm: ReturnType<typeof aggregateMarksLost>): ScorecardVariant => ({
    surface: "worksheet",
    title: "T",
    subtitle: "S",
    score: { kind: "marks", awarded: 4, total: 10 },
    marksLost: pm,
    actions: [],
  });

  it("shows 'Option only - no working to diagnose' for option picks and keeps 'reason not recorded' for the rest; the parts still sum to the loss", () => {
    const pm = aggregateMarksLost({
      ok: true,
      results: [q(1, 1, 0, { untyped: 1 }, { objective: true }), q(2, 1, 0, { untyped: 1 }, { objective: true }), q(3, 3, 2, { untyped: 1 })],
      totalQuestions: 3,
      gradedCount: 3,
      pendingCount: 0,
      gradedMarksAwarded: 2,
      gradedMarksTotal: 5,
      worksheetTotalMarks: 5,
    });
    render(<ResultsScorecard variant={variant(pm)} onClose={() => {}} />);
    const opt = document.querySelector('[data-group="option-only"]')!;
    const rest = document.querySelector('[data-group="untyped"]')!;
    expect(opt.textContent).toContain(OPTION_ONLY_LABEL);
    expect(opt.getAttribute("data-marks")).toBe("2");
    expect(rest.textContent).toContain(UNTYPED_MARKS_LABEL);
    expect(rest.getAttribute("data-marks")).toBe("1");
    expect(Number(opt.getAttribute("data-marks")) + Number(rest.getAttribute("data-marks"))).toBe(pm!.byType.untyped);
  });

  it("all untyped marks are option picks: only the new label shows", () => {
    const pm = aggregateMarksLost({
      ok: true,
      results: [q(1, 1, 0, { untyped: 1 }, { objective: true })],
      totalQuestions: 1,
      gradedCount: 1,
      pendingCount: 0,
      gradedMarksAwarded: 0,
      gradedMarksTotal: 1,
      worksheetTotalMarks: 1,
    });
    render(<ResultsScorecard variant={variant(pm)} onClose={() => {}} />);
    expect(screen.getByText(OPTION_ONLY_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(UNTYPED_MARKS_LABEL)).toBeNull();
    expect(document.querySelector('[data-group="untyped"]')).toBeNull();
  });

  it("a card whose rows carry no objective flag is byte-for-byte the old copy", () => {
    const pm = aggregateMarksLost({
      ok: true,
      results: [q(1, 1, 0, { untyped: 1 })],
      totalQuestions: 1,
      gradedCount: 1,
      pendingCount: 0,
      gradedMarksAwarded: 0,
      gradedMarksTotal: 1,
      worksheetTotalMarks: 1,
    });
    render(<ResultsScorecard variant={variant(pm)} onClose={() => {}} />);
    expect(screen.getByText(UNTYPED_MARKS_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(OPTION_ONLY_LABEL)).toBeNull();
  });
});
