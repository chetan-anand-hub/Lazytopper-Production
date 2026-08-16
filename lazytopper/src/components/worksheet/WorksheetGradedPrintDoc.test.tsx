import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorksheetGradedPrintDoc } from "./WorksheetGradedPrintDoc";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";

/**
 * SHEET-1v4 — the graded answer sheet renders the student's OWN marked working, and
 * renders an objective (MCQ / 1-mark) question BINARY rather than step-marked.
 *
 * FULL DISCIPLINE (standing rules): every case here pins a DECISION — the owner's CBSE
 * ruling that a 1-marker earns no method marks, and the product promise that we never
 * imply a student failed to do something CBSE never asked of them.
 */

function ws(marks: number): PersistedWorksheet {
  return {
    questions: [
      {
        qNumber: 1,
        section: marks === 1 ? "A" : "C",
        marks,
        questionText: "Question text here",
        solutionSteps: ["Model step one"],
        finalAnswer: "42",
      },
    ],
    totalMarks: marks,
    createdAt: "2026-08-16T00:00:00.000Z",
  } as unknown as PersistedWorksheet;
}

function resp(result: WorksheetQuestionGrade, total: number): WorksheetGradeResponse {
  return {
    ok: true,
    results: [result],
    totalQuestions: 1,
    gradedCount: 1,
    pendingCount: 0,
    gradedMarksAwarded: Number(result.marksAwarded) || 0,
    gradedMarksTotal: total,
    worksheetTotalMarks: total,
  };
}

const step = (over: Partial<Record<string, unknown>> = {}) => ({
  stepNumber: 1,
  description: "Find the discriminant",
  studentWork: "c = -3",
  status: "incorrect" as const,
  marksAwarded: 0,
  marksDeducted: 1,
  teacherAnnotation: "the equation gives +3",
  mistakeType: "calculation" as const,
  correctedWorking: "c = +3",
  ...over,
});

/** The verdict block only — the header mark pill renders the same "0 / 1" string, so a
 *  bare getByText would be ambiguous. */
function verdict(): string {
  return document.querySelector(".lt-gp__bin")?.textContent ?? "";
}

function paint(r: WorksheetQuestionGrade, marks: number) {
  render(
    <WorksheetGradedPrintDoc
      ws={ws(marks)}
      response={resp(r, marks)}
      name="Test Student"
      code="WS-01"
      coaching="Coaching line."
    />,
  );
}

describe("WorksheetGradedPrintDoc — rendering 1: written response WITH steps", () => {
  it("renders the student's own working, the annotation and the corrected working", () => {
    paint(
      { qNumber: 1, couldNotRead: false, totalMarks: 3, marksAwarded: 1, annotatedSteps: [step()] as never },
      3,
    );
    // The student's OWN writing — the thing that never appeared before this lane.
    expect(screen.getByText("c = -3")).toBeInTheDocument();
    expect(screen.getByText(/the equation gives \+3/)).toBeInTheDocument();
    expect(screen.getByText(/c = \+3/)).toBeInTheDocument();
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    // CONTROL: the old teacher-note-only fallback must NOT be what we rendered.
    expect(screen.queryByText("Graded against the marking scheme.")).not.toBeInTheDocument();
  });

  it("renders a FRACTIONAL step mark rather than rounding or throwing", () => {
    paint(
      {
        qNumber: 1,
        couldNotRead: false,
        totalMarks: 3,
        marksAwarded: 0.5,
        annotatedSteps: [step({ marksAwarded: 0.5, marksDeducted: 0, status: "partial" })] as never,
      },
      3,
    );
    expect(screen.getByText("+0.5")).toBeInTheDocument();
  });
});

describe("WorksheetGradedPrintDoc — rendering 2: objective, NO working uploaded", () => {
  const bare: WorksheetQuestionGrade = {
    qNumber: 1,
    couldNotRead: false,
    totalMarks: 1,
    marksAwarded: 0,
    objective: true,
  };

  it("shows a binary verdict", () => {
    paint(bare, 1);
    expect(verdict()).toContain("Not correct");
    expect(verdict()).toContain("0 / 1");
  });

  it("shows NO step block and NO placeholder implying working was expected", () => {
    paint(bare, 1);
    expect(screen.queryByText("Step 1")).not.toBeInTheDocument();
    expect(screen.queryByText(/What went wrong in your working/)).not.toBeInTheDocument();
    // The exact dishonest strings this ruling forbids.
    expect(screen.queryByText(/no working/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/not shown/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No step-level annotation/i)).not.toBeInTheDocument();
  });

  it("marks a correct objective answer as correct", () => {
    paint({ ...bare, marksAwarded: 1 }, 1);
    expect(verdict()).toContain("Correct");
    expect(verdict()).toContain("1 / 1");
  });
});

describe("WorksheetGradedPrintDoc — rendering 3: objective WITH uploaded working", () => {
  const withWork: WorksheetQuestionGrade = {
    qNumber: 1,
    couldNotRead: false,
    totalMarks: 1,
    marksAwarded: 0,
    objective: true,
    annotatedSteps: [step()] as never,
  };

  it("shows the diagnosis so the student learns what went wrong", () => {
    paint(withWork, 1);
    expect(screen.getByText(/What went wrong in your working/)).toBeInTheDocument();
    expect(screen.getByText("c = -3")).toBeInTheDocument();
    expect(screen.getByText(/the equation gives \+3/)).toBeInTheDocument();
  });

  it("keeps the mark BINARY and never renders a per-step mark tally", () => {
    paint(withWork, 1);
    expect(verdict()).toContain("Not correct");
    expect(verdict()).toContain("0 / 1");
    // A step tally on a 1-marker is the precise thing CBSE does not award.
    expect(screen.queryByText("Step 1")).not.toBeInTheDocument();
    expect(screen.queryByText(/^\+0$/)).not.toBeInTheDocument();
    expect(screen.queryByText("Incorrect")).not.toBeInTheDocument();
  });

  it("treats a 1-mark question as binary even when `objective` is absent", () => {
    paint({ qNumber: 1, couldNotRead: false, totalMarks: 1, marksAwarded: 0, annotatedSteps: [step()] as never }, 1);
    expect(verdict()).toContain("Not correct");
    expect(screen.queryByText("Step 1")).not.toBeInTheDocument();
  });
});

describe("WorksheetGradedPrintDoc — backwards compatibility", () => {
  it("a written response with NO stored steps keeps the old teacher-note fallback", () => {
    paint({ qNumber: 1, couldNotRead: false, totalMarks: 3, marksAwarded: 2 }, 3);
    expect(screen.getByText("Graded against the marking scheme.")).toBeInTheDocument();
  });
});
