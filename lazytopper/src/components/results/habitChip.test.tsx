// @vitest-environment jsdom
/**
 * MCQ-TYPE-2 — the 0-MARK HABIT chip (owner copy ruling 23 Oct 2026, 23:50 IST).
 *
 * A RIGHT MCQ with flawed working shows its type AND that the mark was kept:
 *   "1/1 · Silly slip — mark kept, fix the habit"
 * on the scorecard, the worksheet PDF, the Check & Improve PDF, the C&I single summary line and
 * the Quick Practice "diagnosed" row (all through ONE helper, `questionChipText`). It must wrap
 * cleanly at 320 px: no chip carries `white-space: nowrap`, and each chip rule allows wrapping.
 * CONTROLS: a question that LOST its mark keeps the plain type label; a right bare pick shows nothing.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HABIT_KEPT_COPY, questionChipText } from "../../lib/mistakeDisplay";
import { buildGradedAnswer } from "../../services/gradedAnswerAssembly";
import { WorksheetGradedPrintDoc } from "../worksheet/WorksheetGradedPrintDoc";
import { CheckImproveGradedPrintDoc } from "../checkimprove/CheckImproveGradedPrintDoc";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";

const HABIT_TEXT = "1/1 · Silly slip — mark kept, fix the habit";

const step = (o: Record<string, unknown> = {}) => ({
  stepNumber: 1, description: "Working", studentWork: "copied 3 as 8: 8 + 2 = 10", status: "incorrect",
  marksAwarded: 0, marksDeducted: 0, teacherAnnotation: "× 3 was copied as 8", mistakeType: "silly", correctedWorking: null, ...o,
});
const answerStep = (status: "correct" | "incorrect") => step({ stepNumber: 2, description: "Option chosen", studentWork: "(b)", status, mistakeType: null, teacherAnnotation: "" });
const ZERO = { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0 };

/** A right MCQ with flawed working, as the server returns it after MCQ-TYPE-2. */
const habitQ = (o: Record<string, unknown> = {}) => ({
  qNumber: 1, couldNotRead: false, objective: true, totalMarks: 1, marksAwarded: 1, percentage: 100,
  annotatedSteps: [step(), answerStep("correct")], mistakeSummary: { conceptual: 0, calculation: 0, silly: 1, presentation: 0 },
  marksLostByType: ZERO, objectiveResolved: true, teacherNote: "Right option; watch the copying.", ...o,
});
/** CONTROL: the same working on a WRONG option — a real loss. */
const lostQ = () => habitQ({ marksAwarded: 0, percentage: 0, annotatedSteps: [step(), answerStep("incorrect")], marksLostByType: { ...ZERO, silly: 1 } });
/** CONTROL: a right bare pick — nothing to show. */
const bareQ = () => habitQ({ annotatedSteps: [answerStep("correct")], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 } });

describe("MCQ-TYPE-2 · the habit chip copy", () => {
  it("★ the copy table: the type, the kept mark and the habit — one helper", () => {
    expect(HABIT_KEPT_COPY).toBe("mark kept, fix the habit");
    expect(questionChipText(habitQ())).toBe(HABIT_TEXT);
    expect(questionChipText(lostQ())).toBe("Silly slip");
    expect(questionChipText(bareQ())).toBeNull();
  });

  it("★ scorecard (buildGradedAnswer): the habit chip; CONTROL a lost mark keeps the plain label", () => {
    const habit = buildGradedAnswer({ label: "Q1", ...habitQ() } as never);
    expect(habit.mistakeType).toBe(HABIT_TEXT);
    expect(habit.mistakeKind).toBe("silly");
    expect(buildGradedAnswer({ label: "Q1", ...lostQ() } as never).mistakeType).toBe("Silly slip");
    expect(buildGradedAnswer({ label: "Q1", ...bareQ() } as never).mistakeType).toBeNull();
  });

  it("★ worksheet PDF: the question tag reads the habit chip", () => {
    const ws = {
      questions: [{ qNumber: 1, section: "A", marks: 1, questionText: "Pick the right option.", options: ["7", "10", "12", "15"], answer: "10", solutionSteps: ["(b) 10"], finalAnswer: "10" }],
      totalMarks: 1, createdAt: "2026-10-23T00:00:00.000Z",
    } as unknown as PersistedWorksheet;
    const resp = (r: unknown): WorksheetGradeResponse => ({ ok: true, results: [r as WorksheetQuestionGrade], totalQuestions: 1, gradedCount: 1, pendingCount: 0, gradedMarksAwarded: 1, gradedMarksTotal: 1, worksheetTotalMarks: 1 });
    const { unmount } = render(<WorksheetGradedPrintDoc ws={ws} response={resp(habitQ())} name="S" code="WS-H" coaching="" />);
    expect([...document.querySelectorAll(".lt-gp__tag")].map((e) => e.textContent)).toContain(HABIT_TEXT);
    unmount();
    render(<WorksheetGradedPrintDoc ws={ws} response={resp(bareQ())} name="S" code="WS-H" coaching="" />);
    expect(document.querySelectorAll(".lt-gp__tag")).toHaveLength(0);
  });

  it("★ Check & Improve PDF: a habit line under the question; CONTROL none on a lost mark", () => {
    const paint = (q: unknown) => render(
      <CheckImproveGradedPrintDoc code="CI-H" name="Habit" questions={[q as never]} gradedMarksAwarded={1} gradedMarksTotal={1} pendingCount={0} coaching="" />,
    );
    const { unmount } = paint({ ...habitQ(), questionText: "Pick the right option." });
    expect(document.querySelector(".lt-cigp__habit")?.textContent).toBe(HABIT_TEXT);
    unmount();
    paint({ ...lostQ(), questionText: "Pick the right option." });
    expect(document.querySelector(".lt-cigp__habit")).toBeNull();
  });

  it("★ 320 px: every habit chip rule wraps (white-space normal, overflow-wrap anywhere, max-width 100%) — no horizontal scroll", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const rule = (file: string, sel: string): string => {
      const src = readFileSync(path.join(here, file), "utf8");
      const i = src.indexOf(sel + " {");
      expect(i, sel + " rule exists").toBeGreaterThan(-1);
      return src.slice(i, src.indexOf("}", i));
    };
    for (const [file, sel] of [
      ["ResultsScorecard.tsx", ".lt-sc__ga-mtype"],
      ["../worksheet/WorksheetGradedPrintDoc.tsx", ".lt-gp__tag"],
      ["../checkimprove/CheckImproveGradedPrintDoc.tsx", ".lt-cigp__habit"],
    ] as const) {
      const r = rule(file, sel);
      expect(r, sel).toMatch(/white-space:\s*normal/);
      expect(r, sel).toMatch(/overflow-wrap:\s*anywhere/);
      expect(r, sel).toMatch(/max-width:\s*100%/);
      expect(r, sel).not.toMatch(/nowrap/);
    }
  });
});
