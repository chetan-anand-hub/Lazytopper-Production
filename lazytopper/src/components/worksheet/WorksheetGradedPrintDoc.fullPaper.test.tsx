// TS-BOARDSCORE-1 - OWNER RULING (23 Nov 2026, 19:59 IST): the full-paper graded answer sheets (Full Mock, incl. Test Series
// full-length, and Chapter Test) print the total out of the paper's FULL marks; a blank question stays graded "Not attempted" at 0;
// a question that could not be marked reads "Not marked yet" and is listed apart, never scored 0. Worksheet sheets are unchanged.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GRADED_SHEET_KIND, WorksheetGradedPrintDoc, isFullPaperKind } from "./WorksheetGradedPrintDoc";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";

afterEach(cleanup);

const paper = {
  questions: [
    { qNumber: 1, section: "D", marks: 5, questionText: "Answered question", solutionSteps: ["s"], finalAnswer: "1" },
    { qNumber: 2, section: "D", marks: 5, questionText: "Blank question", solutionSteps: ["s"], finalAnswer: "2" },
    { qNumber: 3, section: "C", marks: 3, questionText: "Unreadable question", solutionSteps: ["s"], finalAnswer: "3" },
  ],
  totalMarks: 80,
  createdAt: "2026-11-23T00:00:00.000Z",
  subject: "Maths",
} as unknown as PersistedWorksheet;

const answered: WorksheetQuestionGrade = { qNumber: 1, couldNotRead: false, totalMarks: 5, marksAwarded: 4 };
const blank: WorksheetQuestionGrade = {
  qNumber: 2,
  couldNotRead: false,
  totalMarks: 5,
  marksAwarded: 0,
  marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 5, untyped: 0 },
} as WorksheetQuestionGrade;
const unread: WorksheetQuestionGrade = { qNumber: 3, couldNotRead: true, totalMarks: 3, marksAwarded: 0 };

function resp(results: WorksheetQuestionGrade[], awarded: number, gradedTotal: number, pendingCount: number): WorksheetGradeResponse {
  return {
    ok: true,
    results,
    totalQuestions: results.length,
    gradedCount: results.length - pendingCount,
    pendingCount,
    gradedMarksAwarded: awarded,
    gradedMarksTotal: gradedTotal,
    worksheetTotalMarks: 80,
  };
}

function paint(response: WorksheetGradeResponse, kindLabel?: string) {
  return render(
    <WorksheetGradedPrintDoc ws={paper} response={response} name="Maths · Mock #2" code="FM-M-02" coaching="c" {...(kindLabel ? { kindLabel } : {})} />,
  );
}
const heroText = () => document.querySelector(".lt-gp__scoren")?.textContent ?? "";
const pillOf = (q: number) =>
  Array.from(document.querySelectorAll(".lt-gp__q")).find((el) => el.querySelector(".lt-gp__qn")?.textContent === String(q))?.querySelector(".lt-gp__qmk")
    ?.textContent;

describe("graded sheet - full-paper totals (TS-BOARDSCORE-1)", () => {
  it("the full-paper kinds are Full Mock and Chapter Test only", () => {
    expect(isFullPaperKind(GRADED_SHEET_KIND["full-mock"])).toBe(true);
    expect(isFullPaperKind(GRADED_SHEET_KIND["chapter-test"])).toBe(true);
    expect(isFullPaperKind(GRADED_SHEET_KIND.worksheet)).toBe(false);
    expect(isFullPaperKind(GRADED_SHEET_KIND["quick-practice"])).toBe(false);
    expect(isFullPaperKind(undefined)).toBe(false);
  });

  it("all marked (a blank question included): X / 80, the blank row graded 0 and Not attempted, nothing listed apart", () => {
    paint(resp([answered, blank], 61, 80, 0), GRADED_SHEET_KIND["full-mock"]);
    expect(heroText()).toBe("61 / 80");
    expect(screen.getByText("MARKS")).toBeTruthy();
    expect(pillOf(2)).toBe("0 / 5");
    expect(document.body.textContent).toContain("Not attempted");
    expect(screen.queryByTestId("gp-not-marked")).toBeNull();
    expect(screen.queryByText("Not marked yet")).toBeNull();
  });

  it("some unmarked: X / 80 + 'N marks not marked yet', the row reads Not marked yet (never 0)", () => {
    paint(resp([answered, blank, unread], 52, 77, 1), GRADED_SHEET_KIND["full-mock"]);
    expect(heroText()).toBe("52 / 80");
    expect(screen.getByTestId("gp-not-marked").textContent).toBe(
      "3 marks not marked yet (1 question) — upload a clearer photo to complete",
    );
    expect(pillOf(3)).toBe("Not marked yet");
    expect(pillOf(2)).toBe("0 / 5");
  });

  it("Chapter Test gets the same treatment", () => {
    paint(resp([answered, unread], 30, 77, 1), GRADED_SHEET_KIND["chapter-test"]);
    expect(heroText()).toBe("30 / 80");
    expect(pillOf(3)).toBe("Not marked yet");
  });

  it("a Worksheet sheet prints exactly as before: out of the graded total, MARKS GRADED, 'pending'", () => {
    paint(resp([answered, unread], 4, 77, 1));
    expect(heroText()).toBe("4 / 77");
    expect(screen.getByText("MARKS GRADED")).toBeTruthy();
    expect(pillOf(3)).toBe("pending");
    expect(screen.queryByTestId("gp-not-marked")).toBeNull();
  });
});
