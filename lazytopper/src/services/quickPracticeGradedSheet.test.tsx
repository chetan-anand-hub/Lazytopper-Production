// QP-GRADED-SHEET-1 — the Quick Practice graded sheet: the SHARED WorksheetGradedPrintDoc fed with
// the QP grade response the scorecard shows (marks, picks, step feedback, the scorecard's own note),
// and NOTHING when nothing was graded. The print doc's only change is the "Your answer" line, which
// renders solely for a result that carries a stored pick — every other surface's sheet is unchanged.
import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import {
  buildQuickPracticeGradedSheet,
  quickPracticeHasGradedSheet,
  withQuickPracticeUngradedRows,
} from "./quickPracticeGradedSheet";
import {
  buildQuickPracticeResponse,
  withStoredPicks as withQuickPracticePicks,
  type QuickPracticeEntry,
} from "./quickPracticeSessionService";
import { WorksheetGradedPrintDoc } from "../components/worksheet/WorksheetGradedPrintDoc";
import { UNTYPED_MARKS_LABEL, UNTYPED_MARKS_NOTE } from "../lib/mistakeDisplay";
import type { CheckSolutionResponse, WorksheetGradeResponse } from "../ai/aiClient";

afterEach(cleanup);

const q = (n: number, marks = 1, section = "A") => ({
  id: `q-${n}`,
  questionText: `Question ${n} text`,
  marks,
  section,
  topicKey: "real-numbers",
  options: [`q${n}-a`, `q${n}-b`],
  solutionSteps: [`Bank step for ${n}.`],
  finalAnswer: `final-${n}`,
});

const written: CheckSolutionResponse = {
  ok: true,
  totalMarks: 3,
  marksAwarded: 2,
  percentage: 67,
  teacherNote: "Good method, one slip.",
  mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
  annotatedSteps: [
    { stepNumber: 1, status: "correct", marksAwarded: 1, marksDeducted: 0, studentWork: "x = 2", teacherAnnotation: "Right start." },
    { stepNumber: 2, status: "incorrect", mistakeType: "calculation", marksAwarded: 0, marksDeducted: 1, studentWork: "x^2 = 5", teacherAnnotation: "2 squared is 4." },
  ],
} as unknown as CheckSolutionResponse;

const entries: QuickPracticeEntry[] = [
  { questionId: "q-1", marks: 1, mcq: "wrong", pickedOption: "q1-b" },
  { questionId: "q-2", marks: 1, mcq: "correct", pickedOption: "q2-a" },
  { questionId: "q-3", marks: 3, graded: written },
  { questionId: "q-4", marks: 1 }, // not attempted — omitted, never a 0
];
const questions = [q(1), q(2), q(3, 3, "C"), q(4)];

function sheet(note: string | null = null) {
  return buildQuickPracticeGradedSheet({
    questions,
    response: withQuickPracticePicks(buildQuickPracticeResponse(entries), entries),
    name: "Real Numbers · Practice set",
    code: "QP-M-REAL-abc12345",
    subject: "Maths",
    createdAt: "2026-10-17T05:00:00.000Z",
    note,
  });
}

describe("QP-GRADED-SHEET-1 · buildQuickPracticeGradedSheet", () => {
  it("★ null when nothing is graded (no sheet is ever promised)", () => {
    const none = buildQuickPracticeResponse([{ questionId: "q-1", marks: 1 }]);
    expect(quickPracticeHasGradedSheet(none)).toBe(false);
    expect(buildQuickPracticeGradedSheet({
      questions: [q(1)], response: none, name: "n", code: "c", subject: "Maths", createdAt: "2026-10-17T00:00:00Z",
    })).toBeNull();
    expect(buildQuickPracticeGradedSheet({
      questions: [q(1)], response: null, name: "n", code: "c", subject: "Maths", createdAt: "2026-10-17T00:00:00Z",
    })).toBeNull();
  });

  it("★ the response is the scorecard's own (marks untouched) with each pick beside its result", () => {
    const s = sheet()!;
    const plain = buildQuickPracticeResponse(entries);
    expect(s.response.gradedMarksAwarded).toBe(plain.gradedMarksAwarded);
    expect(s.response.gradedMarksTotal).toBe(plain.gradedMarksTotal);
    expect(s.response.gradedCount).toBe(3);
    expect(s.response.results.map((r) => [r.qNumber, r.marksAwarded, (r as { pickedOption?: string }).pickedOption])).toEqual([
      [1, 0, "q1-b"],
      [2, 1, "q2-a"],
      [3, 2, undefined],
    ]);
    expect(s.name).toBe("Real Numbers · Practice set");
    expect(s.code).toBe("QP-M-REAL-abc12345");
  });

  it("★ the questions are the ones ON the sheet (the unattempted Q4 is not), with the bank's text and steps", () => {
    const s = sheet()!;
    expect(s.ws.questions.map((x) => [x.qNumber, x.id, x.marks, x.section])).toEqual([
      [1, "q-1", 1, "A"], [2, "q-2", 1, "A"], [3, "q-3", 3, "C"],
    ]);
    expect(s.ws.questions[2].solutionSteps).toEqual(["Bank step for 3."]);
    expect(s.ws.totalMarks).toBe(5);
    expect(s.kindLabel).toBe("Quick Practice");
  });

  it("a reopened row whose bank row could not load keeps its stored marks, with no invented text", () => {
    const s = buildQuickPracticeGradedSheet({
      questions: [{ id: "q-1" }, { id: "q-2" }, { id: "q-3" }, { id: "q-4" }],
      response: buildQuickPracticeResponse(entries),
      name: "n", code: "c", subject: "Maths", createdAt: "2026-10-17T00:00:00Z",
    })!;
    expect(s.ws.questions[2]).toMatchObject({ id: "q-3", marks: 3, questionText: "" });
    expect(s.ws.questions[2].solutionSteps).toBeUndefined();
  });

  it("★ review fix 1 — not-graded answers join as NON-SCORED rows; totals and gradedCount untouched", () => {
    const base = buildQuickPracticeResponse(entries);
    const out = withQuickPracticeUngradedRows(base, [
      { qNumber: 4, totalMarks: 1, state: "could-not-read" },
      { qNumber: 5, totalMarks: 3, state: "not-graded", reason: "timeout" },
      { qNumber: 6, totalMarks: 1, state: "unread-option" },
      { qNumber: 7, totalMarks: 3, state: "answer-mismatch" },
      { qNumber: 3, totalMarks: 3, state: "could-not-read" }, // Q3 already graded: kept as graded
    ]);
    expect(out.gradedMarksAwarded).toBe(base.gradedMarksAwarded);
    expect(out.gradedMarksTotal).toBe(base.gradedMarksTotal);
    expect(out.gradedCount).toBe(base.gradedCount);
    expect(out.pendingCount).toBe(4);
    expect(out.results.map((r) => r.qNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const by = (n: number) => out.results.find((r) => r.qNumber === n)!;
    expect(by(3).marksAwarded).toBe(2);
    expect(by(4)).toMatchObject({ couldNotRead: true });
    expect(by(5)).toMatchObject({ notGraded: "timeout" });
    expect(by(6)).toMatchObject({ objectiveResolved: false });
    expect(by(7)).toMatchObject({ answerMismatch: true });
    for (const n of [4, 5, 6, 7]) expect(by(n).marksAwarded).toBeUndefined();
    expect(withQuickPracticeUngradedRows(base, [])).toBe(base);
  });

  it("★ the coaching footer is the shared coaching line plus the scorecard's OWN note, verbatim", () => {
    expect(sheet(UNTYPED_MARKS_NOTE)!.coaching.endsWith(UNTYPED_MARKS_NOTE)).toBe(true);
    expect(sheet(null)!.coaching).not.toContain(UNTYPED_MARKS_NOTE);
    expect(sheet(null)!.coaching.length).toBeGreaterThan(0);
  });
});

describe("QP-GRADED-SHEET-1 · the shared print doc renders the QP sheet", () => {
  it("★ each graded question, the pick, the marks, the step feedback, the untyped-marks chip and the note", () => {
    const s = sheet(UNTYPED_MARKS_NOTE)!;
    const { container } = render(<WorksheetGradedPrintDoc {...s} />);
    expect(screen.getByText("Question 1 text")).toBeInTheDocument();
    expect(screen.getByText("Question 3 text")).toBeInTheDocument();
    // Q4 was not attempted: never on the sheet, never a 0.
    expect(screen.queryByText("Question 4 text")).toBeNull();
    const picks = screen.getAllByTestId("gp-picked").map((p) => p.textContent);
    expect(picks).toEqual(["Your answer: q1-b", "Your answer: q2-a"]);
    expect(container.textContent).toContain("Not correct");
    expect(container.textContent).toContain("2 squared is 4.");
    expect(container.textContent).toContain(UNTYPED_MARKS_LABEL);
    expect(container.textContent).toContain(UNTYPED_MARKS_NOTE);
    expect(container.textContent).toContain("QP-M-REAL-abc12345");
  });

  it("★ review fix 2 — the header reads 'Quick Practice' with the sheet's own count and marks", () => {
    const { container } = render(<WorksheetGradedPrintDoc {...sheet()!} />);
    expect(container.querySelector(".lt-gp__meta")!.textContent).toContain("Quick Practice · 3 questions · 5 marks");
    expect(container.querySelector(".lt-gp__meta")!.textContent).not.toContain("Worksheet");
  });

  it("CONTROL (review fix 2): without kindLabel the header is exactly today's 'Worksheet · N questions · M marks'", () => {
    const s = sheet()!;
    const { container } = render(<WorksheetGradedPrintDoc ws={s.ws} response={s.response} name={s.name} code={s.code} coaching={s.coaching} />);
    expect(container.querySelector(".lt-gp__meta")!.textContent).toContain("Worksheet · 3 questions · 5 marks");
  });

  it("★ review fix 1 — with a not-graded row the doc prints the pending line, never 'All N read and graded'", () => {
    const s = sheet()!;
    const clean = render(<WorksheetGradedPrintDoc {...s} />);
    expect(clean.container.textContent).toContain("All 3 questions read and graded.");
    cleanup();
    const response = withQuickPracticeUngradedRows(s.response, [{ qNumber: 4, totalMarks: 1, state: "could-not-read" }]);
    const { container } = render(<WorksheetGradedPrintDoc {...s} response={response} ws={{ ...s.ws, questions: [...s.ws.questions] }} />);
    expect(container.textContent).not.toMatch(/read and graded/);
    expect(container.textContent).toContain("1 question pending");
    expect(container.textContent).toContain("not graded, not scored 0");
  });

  it("★ re-review — the pending line's 'worth N marks' is the SHEET's total (= header), not the set's", () => {
    // Set: Q1-Q4 + an unattempted Q5 (3 marks) ⇒ set total 9; Q4 unreadable ⇒ on the sheet; Q5 not.
    const setEntries: QuickPracticeEntry[] = [...entries, { questionId: "q-5", marks: 3 }];
    expect(buildQuickPracticeResponse(setEntries).worksheetTotalMarks).toBe(9);
    const s = buildQuickPracticeGradedSheet({
      questions: [...questions, q(5, 3, "C")],
      response: withQuickPracticeUngradedRows(buildQuickPracticeResponse(setEntries), [
        { qNumber: 4, totalMarks: 1, state: "could-not-read" },
      ]),
      name: "n", code: "c", subject: "Maths", createdAt: "2026-10-17T00:00:00Z",
    })!;
    expect(s.ws.totalMarks).toBe(6);
    expect(s.response.worksheetTotalMarks).toBe(6);
    const { container } = render(<WorksheetGradedPrintDoc {...s} />);
    expect(container.querySelector(".lt-gp__meta")!.textContent).toContain("Quick Practice · 4 questions · 6 marks");
    expect(container.textContent).toContain("Quick Practice is worth 6 marks in total.");
    expect(container.textContent).not.toContain("worth 9 marks");
  });

  it("CONTROL: a result with no stored pick (every other surface) renders no 'Your answer' line", () => {
    const s = sheet()!;
    const response: WorksheetGradeResponse = buildQuickPracticeResponse(entries); // no picks joined
    render(<WorksheetGradedPrintDoc {...s} response={response} />);
    expect(screen.queryAllByTestId("gp-picked")).toHaveLength(0);
  });
});
