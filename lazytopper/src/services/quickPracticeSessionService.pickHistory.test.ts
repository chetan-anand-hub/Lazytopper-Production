// @vitest-environment node
//
// TUTOR-MEM-1 - Quick Practice (the one surface that records the tap) hands the wrong option to the MI
// front door and the attempt; a right pick, or no pick, hands nothing.

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


const OPTS = ["3", "7", "9", "11"];
const mcq = (pick: string | undefined): SavedAnswer => ({
  ...q(4),
  marks: 1,
  objective: true,
  options: OPTS,
  answer: "9",
  textAnswer: "working",
  ...(pick ? { pickedOption: pick } : {}),
});
const objRow = (marksAwarded: number): WorksheetQuestionGrade => ({ ...row(4), totalMarks: 1, marksAwarded, percentage: marksAwarded * 100 });

describe("TUTOR-MEM-1 - QP carries the wrong tap", () => {
  const run = async (pick: string | undefined, marksAwarded: number) => {
    await gradeQuickPracticeBatch({
      worksheetId: "qp-pick",
      subject: "maths",
      user: USER,
      grade: vi.fn<Grader>(async () => okResponse([objRow(marksAwarded)])),
      answers: [mcq(pick)],
    });
  };
  it("a wrong pick reaches recordMistake and recordAttempt", async () => {
    await run("7", 0);
    expect(recordMistake.mock.calls[0][2]).toMatchObject({ pickedOption: "(b) 7", keyOption: "(c) 9" });
    expect(recordAttempt.mock.calls[0][1]).toMatchObject({ pickedOption: "(b) 7", keyOption: "(c) 9" });
  });
  it("a right pick carries nothing", async () => {
    await run("9", 1);
    expect(recordMistake.mock.calls[0]?.[2]).not.toHaveProperty("pickedOption");
    expect(recordAttempt.mock.calls[0]?.[1]).not.toHaveProperty("pickedOption");
  });
  it("no pick carries nothing", async () => {
    // An objective question with a key and no pick has no grade to record (honest: nothing is written).
    await run(undefined, 0);
    expect(recordMistake.mock.calls.some((c) => "pickedOption" in c[2])).toBe(false);
    expect(recordAttempt.mock.calls.some((c) => "pickedOption" in c[1])).toBe(false);
  });
});
