// @vitest-environment node
//
// PRACTICE-REVIEW-HONEST-1 (DECISION 27a / 30b) — an answer graded AFTER the student
// has seen the steps (review mode) is not a real attempt. `record: false` on the batch
// grade still returns the grade, but feeds Mistake Intelligence NOTHING.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../ai/aiClient";
import type * as MistakeIntelligenceModule from "./mistakeIntelligence";
import type * as PracticeInsightsModule from "./practiceInsights";

const recordMistake = vi.fn<typeof MistakeIntelligenceModule.recordMistake>(async () => ({
  outcome: "logged" as const,
  bridged: false,
}));
const recordAttempt = vi.fn<typeof PracticeInsightsModule.recordAttempt>(() => "recorded" as const);

vi.mock("./mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mistakeIntelligence")>();
  return { ...actual, recordMistake };
});
vi.mock("./practiceInsights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./practiceInsights")>();
  return { ...actual, recordAttempt };
});

const { gradeQuickPracticeBatch } = await import("./quickPracticeSessionService");

type Args = Parameters<typeof gradeQuickPracticeBatch>[0];
type SavedAnswer = Args["answers"][number];
type Grader = NonNullable<Args["grade"]>;

const USER = { uid: "student-1", isLocalSession: false } as unknown as NonNullable<Args["user"]>;

const q = (qNumber: number): SavedAnswer => ({
  questionId: `bank-${qNumber}`,
  qNumber,
  marks: 3,
  questionText: `Question ${qNumber}`,
  topicLabel: "Arithmetic Progressions",
  topicKey: "arithmetic-progressions",
  textAnswer: "a = 2, d = 3, so a10 = 29",
});

const row = (qNumber: number): WorksheetQuestionGrade => ({
  qNumber,
  couldNotRead: false,
  ok: true,
  totalMarks: 3,
  marksAwarded: 2,
  percentage: 67,
  annotatedSteps: [],
  mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
  teacherNote: "Method right, arithmetic slipped.",
});

const okResponse = (results: WorksheetQuestionGrade[]): WorksheetGradeResponse => ({
  ok: true,
  results,
  totalQuestions: results.length,
  gradedCount: results.length,
  pendingCount: 0,
  gradedMarksAwarded: results.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0),
  gradedMarksTotal: results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0),
  worksheetTotalMarks: results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0),
});

beforeEach(() => {
  recordMistake.mockClear();
  recordAttempt.mockClear();
});

describe("PRACTICE-REVIEW-HONEST-1 · batch grade `record` flag", () => {
  const cases: Array<{ name: string; record: boolean | undefined; recorded: boolean }> = [
    { name: "default (omitted) → recorded (CONTROL)", record: undefined, recorded: true },
    { name: "record: true → recorded", record: true, recorded: true },
    { name: "record: false → graded, returned, NOT recorded", record: false, recorded: false },
  ];
  it.each(cases)("$name", async ({ record, recorded }) => {
    const grader = vi.fn<Grader>(async () => okResponse([row(2)]));
    const out = await gradeQuickPracticeBatch({
      worksheetId: "qp-review",
      subject: "maths",
      user: USER,
      grade: grader,
      answers: [q(2)],
      ...(record === undefined ? {} : { record }),
    });
    // The grade itself always comes back.
    expect(out.outcome).toBe("graded");
    expect(grader).toHaveBeenCalledTimes(1);
    expect(out.entries[0].graded).toMatchObject({ marksAwarded: 2, totalMarks: 3 });
    expect(recordMistake).toHaveBeenCalledTimes(recorded ? 1 : 0);
    expect(recordAttempt).toHaveBeenCalledTimes(recorded ? 1 : 0);
    expect(out.miOutcomes).toHaveLength(recorded ? 1 : 0);
  });

  it("a per-answer predicate (mixed batch): only the answers it accepts are recorded; every grade returns", async () => {
    const grader = vi.fn<Grader>(async () => okResponse([row(2), row(5)]));
    const out = await gradeQuickPracticeBatch({
      worksheetId: "qp-mixed",
      subject: "maths",
      user: USER,
      grade: grader,
      answers: [q(2), q(5)],
      record: (a) => a.qNumber === 2,
    });
    expect(out.entries[0].graded).toBeDefined();
    expect(out.entries[1].graded).toBeDefined();
    expect(recordMistake.mock.calls.map((c) => c[2].questionId)).toEqual(["bank-2"]);
    expect(recordAttempt.mock.calls.map((c) => c[1].questionId)).toEqual(["bank-2"]);
    expect(out.miOutcomes.map((m) => m.questionId)).toEqual(["bank-2"]);
  });
});
