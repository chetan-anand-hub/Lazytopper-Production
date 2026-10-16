// FOLLOWUPS-1 C1-C3 [FU-QP-REOPEN-PICK] — the Quick Practice pick is STORED (an additive optional
// `pickedOption` on the perQuestion payload's result), shown on the reopened scorecard, and quoted
// in the tutor's scorecard opener. ★ Stored only: the SessionRecord, every mark, the mistake data
// and the grade response's counts are byte-identical with and without picks (asserted below).

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CheckSolutionResponse, WorksheetQuestionGrade } from "../ai/aiClient";
import type * as SessionRecordsModule from "./sessionRecords";

const writeSessionRecord = vi.fn<typeof SessionRecordsModule.writeSessionRecord>(() => "recorded");
const writeSessionPerQuestion = vi.fn<typeof SessionRecordsModule.writeSessionPerQuestion>();
vi.mock("./sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sessionRecords")>();
  return { ...actual, writeSessionRecord, writeSessionPerQuestion };
});

const { persistQuickPracticeSession, buildQuickPracticeResponse, gradeQuickPracticeBatch } = await import(
  "./quickPracticeSessionService"
);
const { storedPickedOption } = await import("../components/results/scorecardVariants");
const { composeScorecardQuestionOpener } = await import("../pages/tutor/tutorRoundTrip");

type PersistArgs = Parameters<typeof persistQuickPracticeSession>[0];
type Entry = PersistArgs["entries"][number];
const USER = { uid: "u-real", isLocalSession: false } as unknown as PersistArgs["user"];

const graded = (over: Partial<CheckSolutionResponse> = {}): CheckSolutionResponse =>
  ({
    ok: true,
    totalMarks: 3,
    marksAwarded: 2,
    percentage: 67,
    annotatedSteps: [],
    mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
    teacherNote: "",
    ...over,
  }) as CheckSolutionResponse;

const WITHOUT: Entry[] = [
  { questionId: "b-1", marks: 1, mcq: "wrong" },
  { questionId: "b-2", marks: 3, graded: graded() }, // written working, no pick
  { questionId: "b-3", marks: 1 }, // unattempted
  { questionId: "b-4", marks: 1, mcq: "correct" },
];
const WITH: Entry[] = [
  { ...WITHOUT[0], pickedOption: "x = 3" },
  WITHOUT[1],
  WITHOUT[2],
  { ...WITHOUT[3], pickedOption: "48" },
];
const ARGS = (entries: Entry[]): PersistArgs => ({
  user: USER,
  title: "Real Numbers · Practice set",
  subject: "maths",
  topicSlug: "real-numbers",
  filterSignature: "f|4q",
  startedAt: 1_700_000_000_000,
  entries,
});
const strip = (results: WorksheetQuestionGrade[]) =>
  results.map((r) => {
    const { pickedOption: _drop, ...rest } = r as WorksheetQuestionGrade & { pickedOption?: string };
    return rest;
  });

beforeEach(() => {
  writeSessionRecord.mockReset();
  writeSessionRecord.mockImplementation(() => "recorded");
  writeSessionPerQuestion.mockReset();
});

describe("C1 · persistQuickPracticeSession stores the pick — additive only", () => {
  it("writes pickedOption beside each PICKED MCQ result, nothing new on written/unpicked results", () => {
    expect(persistQuickPracticeSession(ARGS(WITH))).toBe("recorded");
    const results = writeSessionPerQuestion.mock.calls.at(-1)![1].response.results as (WorksheetQuestionGrade & {
      pickedOption?: string;
    })[];
    expect(results.map((r) => [r.qNumber, r.pickedOption])).toEqual([
      [1, "x = 3"],
      [2, undefined],
      [4, "48"],
    ]);
    expect("pickedOption" in results[1]).toBe(false);
  });

  it("the SessionRecord, the marks and the response's counts are IDENTICAL with and without picks", () => {
    persistQuickPracticeSession(ARGS(WITHOUT));
    const recordA = writeSessionRecord.mock.calls.at(-1)![1];
    const payloadA = writeSessionPerQuestion.mock.calls.at(-1)![1];
    persistQuickPracticeSession(ARGS(WITH));
    const recordB = writeSessionRecord.mock.calls.at(-1)![1];
    const payloadB = writeSessionPerQuestion.mock.calls.at(-1)![1];
    // `gradedAt` is the write's own wall-clock stamp (it differs by the ms between the two writes);
    // every other field of the record must be identical.
    expect({ ...recordB, gradedAt: 0 }).toEqual({ ...recordA, gradedAt: 0 });
    expect(payloadA.response).toEqual(buildQuickPracticeResponse(WITHOUT));
    expect({ ...payloadB.response, results: strip(payloadB.response.results) }).toEqual(payloadA.response);
    expect(writeSessionRecord).toHaveBeenCalledTimes(2);
    expect(writeSessionPerQuestion).toHaveBeenCalledTimes(2);
  });

  it("CONTROL: no picks at all → the payload response is exactly the built response", () => {
    persistQuickPracticeSession(ARGS(WITHOUT));
    const results = writeSessionPerQuestion.mock.calls.at(-1)![1].response.results;
    expect(results.some((r) => "pickedOption" in r)).toBe(false);
  });

  it("gradeQuickPracticeBatch carries the pick on its entry (bare pick: no API call), mcq unchanged", async () => {
    const grade = vi.fn();
    const res = await gradeQuickPracticeBatch({
      worksheetId: "w",
      grade,
      answers: [
        { questionId: "b-1", qNumber: 1, marks: 1, questionText: "Q1", pickedOption: " x = 3 ", pickedCorrect: false },
        { questionId: "b-2", qNumber: 2, marks: 1, questionText: "Q2" },
      ],
    });
    expect(grade).not.toHaveBeenCalled();
    expect(res.entries[0]).toEqual({ questionId: "b-1", marks: 1, mcq: "wrong", pickedOption: "x = 3" });
    expect(res.entries[1]).toEqual({ questionId: "b-2", marks: 1 });
  });
});

describe("C2 · storedPickedOption (the reopened scorecard's 'Your answer')", () => {
  it("reads a stored pick; null for an old result with none (never guessed)", () => {
    expect(storedPickedOption({ qNumber: 1, pickedOption: "x = 3" })).toBe("x = 3");
    expect(storedPickedOption({ qNumber: 1 })).toBeNull();
    expect(storedPickedOption({ qNumber: 1, pickedOption: "  " })).toBeNull();
    expect(storedPickedOption(null)).toBeNull();
  });
});

describe("C3 · the tutor's scorecard opener names the stored pick", () => {
  const lostMcq = { qNumber: 3, couldNotRead: false, ok: true, totalMarks: 1, marksAwarded: 0, percentage: 0 } as WorksheetQuestionGrade;
  it("with a stored pick, the opener says what the student chose", () => {
    const opener = composeScorecardQuestionOpener(3, { ...lostMcq, pickedOption: "x = 3" } as WorksheetQuestionGrade, "Real Numbers");
    expect(opener.text).toBe(
      'Q3 on that Real Numbers set cost you 1 mark. You chose "x = 3". Want to go through why the right answer is right, and where the trap is?',
    );
  });
  it("CONTROL: an old record without a pick keeps the unchanged opener", () => {
    expect(composeScorecardQuestionOpener(3, lostMcq, "Real Numbers").text).toBe(
      "Q3 on that Real Numbers set cost you 1 mark. Want to go through why the right answer is right, and where the trap is?",
    );
  });
});
