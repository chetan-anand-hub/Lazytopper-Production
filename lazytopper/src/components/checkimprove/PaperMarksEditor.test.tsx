/**
 * GRADE-MARKS-1 — the whole-paper confirm step: every question's marks are editable before grading,
 * a guessed mark is flagged, and the total is the sum of what will be sent.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import PaperMarksEditor, { parsePaperMarks } from "./PaperMarksEditor";
import type { DetectedQuestion } from "../../ai/aiClient";

afterEach(() => cleanup());

const QS: DetectedQuestion[] = [
  { questionNumber: 19, questionText: "Q19", marks: 3, marksSource: "section" },
  { questionNumber: 20, questionText: "Q20", marks: 5, marksSource: "inferred" },
  { questionNumber: 21, questionText: "Q21", marks: 4, marksSource: "printed" },
];

describe("PaperMarksEditor", () => {
  it("flags ONLY the guessed mark, shows the total, and commits a valid edit", () => {
    const onChange = vi.fn();
    render(<PaperMarksEditor questions={QS} onMarksChange={onChange} />);
    expect(screen.getByText("Check: we guessed 5")).toBeTruthy();
    expect(screen.queryByText(/we guessed 3|we guessed 4/)).toBeNull();
    expect(screen.getByTestId("paper-marks-editor").textContent).toContain("Total: 12 marks");
    fireEvent.change(screen.getByLabelText("Marks for Q20"), { target: { value: "3" } });
    expect(onChange).toHaveBeenCalledWith(1, 3);
  });

  it("an out-of-range or empty value is never committed", () => {
    const onChange = vi.fn();
    render(<PaperMarksEditor questions={QS} onMarksChange={onChange} />);
    for (const v of ["", "0", "11", "2.5", "-1"]) fireEvent.change(screen.getByLabelText("Marks for Q19"), { target: { value: v } });
    expect(onChange).not.toHaveBeenCalled();
    expect(parsePaperMarks("10")).toBe(10);
    expect(parsePaperMarks("1")).toBe(1);
  });

  it("F1 (§13) · an objective (MCQ) row is read-only: no input, no guess flag, nothing to commit", () => {
    const onChange = vi.fn();
    const mcq: DetectedQuestion = { questionNumber: 1, questionText: "MCQ (a) 1 (b) 2", marks: 1, marksSource: "inferred", objective: true };
    render(<PaperMarksEditor questions={[mcq, ...QS]} onMarksChange={onChange} />);
    expect(screen.queryByLabelText("Marks for Q1")).toBeNull();
    expect(screen.getByTestId("paper-marks-fixed-0").textContent).toBe("1");
    expect(screen.queryByText("Check: we guessed 1")).toBeNull();
    expect(screen.getByTestId("paper-marks-editor").textContent).toContain("Total: 13 marks");
  });
});
