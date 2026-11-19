// TS-UX-SCORE-1 - TestAnalysisPanel copy: "Target time", the over-time rows first with the rest behind "Show all N questions",
// and "N questions can't be retried here yet." Display only.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";
import { bankIndexEntries } from "../../data/bankChapters/bankIdIndex";

vi.mock("../../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: vi.fn(async () => []),
  getAllSessionPerQuestionFromCloud: vi.fn(async () => []),
}));

import TestAnalysisPanel from "./TestAnalysisPanel";
import { QUESTION_TIMES_KEY } from "./questionTimes";

const TRI: string[] = [];
for (const [id, m] of bankIndexEntries()) {
  if (m.topicKey === "triangles") TRI.push(id);
  if (TRI.length === 8) break;
}
const g = (qNumber: number, awarded: number, total: number): WorksheetQuestionGrade => ({
  qNumber, couldNotRead: false, ok: true, totalMarks: total, marksAwarded: awarded,
  annotatedSteps: [{ step: "x", status: awarded > 0 ? "correct" : "incorrect" } as never],
});
const resp = (results: WorksheetQuestionGrade[]): WorksheetGradeResponse => ({
  ok: true, results, totalQuestions: results.length, gradedCount: results.length, pendingCount: 0,
  gradedMarksAwarded: 0, gradedMarksTotal: 0, worksheetTotalMarks: 0,
});
function panel(response: WorksheetGradeResponse, ids: string[]) {
  return render(
    <MemoryRouter>
      <TestAnalysisPanel
        surface="chapter-test" subject="Maths" uid={null}
        current={{ worksheetId: "ws-now", title: "Triangles #3", response, questionIds: ids, chapterTopicKey: "triangles" }}
        secondsPerMark={90} returnTo="/chapter-test/10/Maths/triangles"
      />
    </MemoryRouter>,
  );
}
beforeEach(() => localStorage.clear());

describe("TS-UX-SCORE-1 - TestAnalysisPanel", () => {
  it("says 'Target time', never 'Budget'", () => {
    localStorage.setItem(QUESTION_TIMES_KEY, JSON.stringify({ "ws-now": { at: 1, ms: { "1": 10_000, "2": 400_000, "3": 10_000, "4": 10_000, "5": 10_000 } } }));
    panel(resp([1, 2, 3, 4, 5].map((n) => g(n, 1, 1))), TRI.slice(0, 5));
    expect(document.body.textContent).toContain("Target time: 1:30 min per mark.");
    expect(document.body.textContent).not.toMatch(/Budget/);
  });

  it("opens on the over-time rows; 'Show all N questions' reveals the rest, 'Show fewer' folds them again", () => {
    localStorage.setItem(QUESTION_TIMES_KEY, JSON.stringify({ "ws-now": { at: 1, ms: { "1": 10_000, "2": 400_000, "3": 10_000, "4": 10_000, "5": 10_000 } } }));
    panel(resp([1, 2, 3, 4, 5].map((n) => g(n, 1, 1))), TRI.slice(0, 5));
    expect(screen.getByText("Q2")).toBeTruthy();
    expect(screen.queryByText("Q1")).toBeNull();
    expect(screen.queryByText("Q5")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show all 5 questions" }));
    for (const n of [1, 2, 3, 4, 5]) expect(screen.getByText(`Q${n}`)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(screen.queryByText("Q1")).toBeNull();
  });

  it("nothing over time: the first rows show and the toggle still reveals all", () => {
    localStorage.setItem(QUESTION_TIMES_KEY, JSON.stringify({ "ws-now": { at: 1, ms: { "1": 1000, "2": 1000, "3": 1000, "4": 1000, "5": 1000 } } }));
    panel(resp([1, 2, 3, 4, 5].map((n) => g(n, 1, 1))), TRI.slice(0, 5));
    expect(screen.getByText("Q1")).toBeTruthy();
    expect(screen.queryByText("Q5")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show all 5 questions" }));
    expect(screen.getByText("Q5")).toBeTruthy();
  });

  it("a short table has no toggle", () => {
    localStorage.setItem(QUESTION_TIMES_KEY, JSON.stringify({ "ws-now": { at: 1, ms: { "1": 1000, "2": 1000 } } }));
    panel(resp([g(1, 1, 1), g(2, 1, 1)]), TRI.slice(0, 2));
    expect(screen.queryByTestId("tsa-time-toggle")).toBeNull();
  });

  it("questions outside the bank: \"N questions can't be retried here yet.\"", () => {
    panel(resp([g(1, 0, 1), g(2, 0, 1)]), ["", ""]);
    expect(document.body.textContent).toContain("2 questions can’t be retried here yet.");
    expect(document.body.textContent).not.toMatch(/could not be reopened|question bank/);
  });
});
