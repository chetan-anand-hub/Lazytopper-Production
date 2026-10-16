// @vitest-environment node
//
// QP-UPLOAD-LATER — Quick Practice gets Chapter Test's "upload written answers later".
//   1. "Upload later" writes the session record NOW (outcomes so far) + a snapshot of the
//      written questions still waiting.
//   2. A later grade sends ONLY the waiting questions, under the SAME worksheetId (the MI
//      submission id, so a re-grade replaces — never a duplicate mistake), records them
//      (owner ruling 16 Oct 22:20: record:true for a later upload), merges onto the earlier
//      outcomes and re-writes the SAME record id; the snapshot is cleared when nothing waits.
//   3. Signed-out / local: nothing is kept, and the caller is told so.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../ai/aiClient";
import type * as SessionRecordsModule from "./sessionRecords";
import type * as MistakeIntelligenceModule from "./mistakeIntelligence";
import type * as PracticeInsightsModule from "./practiceInsights";
import type * as PaperStoreModule from "./quickPracticePaperStore";

const writeSessionRecord = vi.fn<typeof SessionRecordsModule.writeSessionRecord>(() => "recorded");
const writeSessionPerQuestion = vi.fn<typeof SessionRecordsModule.writeSessionPerQuestion>();
vi.mock("./sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sessionRecords")>();
  return { ...actual, writeSessionRecord, writeSessionPerQuestion };
});
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
const saveQuickPracticePaper = vi.fn<typeof PaperStoreModule.saveQuickPracticePaper>(() => true);
const deleteQuickPracticePaper = vi.fn<typeof PaperStoreModule.deleteQuickPracticePaper>();
vi.mock("./quickPracticePaperStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./quickPracticePaperStore")>();
  return { ...actual, saveQuickPracticePaper, deleteQuickPracticePaper };
});

const later = await import("./quickPracticeUploadLater");
const { quickPracticeCode } = await import("./sessionRecords");

type Answer = Parameters<typeof later.pendingWrittenAnswers>[0][number];
type Entry = Parameters<typeof later.pendingWrittenAnswers>[1][number];
type User = Parameters<typeof later.saveQuickPracticeUploadLater>[0]["user"];
type Grader = NonNullable<Parameters<typeof later.gradeQuickPracticeLater>[0]["grade"]>;

const USER = { uid: "student-1", isLocalSession: false } as unknown as User;
const PERSIST = {
  title: "Arithmetic Progressions · Practice set",
  subject: "maths" as const,
  topicSlug: "arithmetic-progressions",
  filterSignature: "sig",
  startedAt: 1_700_000_000_000,
};
const WS = "qp-ws-1";

const ans = (qNumber: number, extra: Partial<Answer> = {}): Answer => ({
  questionId: `b${qNumber}`,
  qNumber,
  marks: qNumber === 1 ? 1 : 3,
  questionText: `Question ${qNumber}`,
  topicLabel: "Arithmetic Progressions",
  topicKey: "arithmetic-progressions",
  objective: qNumber === 1,
  ...extra,
});
// Q1 an MCQ (clicked, correct), Q2 + Q3 written with nothing saved.
const ANSWERS: Answer[] = [ans(1, { pickedOption: "29", pickedCorrect: true }), ans(2), ans(3)];
const ENTRIES: Entry[] = [
  { questionId: "b1", marks: 1, mcq: "correct", pickedOption: "29" },
  { questionId: "b2", marks: 3 },
  { questionId: "b3", marks: 3 },
];
const CODE = quickPracticeCode("maths", {
  topicSlug: PERSIST.topicSlug,
  filterSignature: PERSIST.filterSignature,
  questionIds: ["b1", "b2", "b3"],
  startedAt: PERSIST.startedAt,
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
const ok = (results: WorksheetQuestionGrade[]): WorksheetGradeResponse => ({
  ok: true,
  results,
  totalQuestions: results.length,
  gradedCount: results.length,
  pendingCount: 0,
  gradedMarksAwarded: 2 * results.length,
  gradedMarksTotal: 3 * results.length,
  worksheetTotalMarks: 3 * results.length,
});

beforeEach(() => {
  for (const m of [writeSessionRecord, writeSessionPerQuestion, recordMistake, recordAttempt, saveQuickPracticePaper, deleteQuickPracticePaper]) {
    m.mockClear();
  }
});

describe("pendingWrittenAnswers", () => {
  it("lists written questions with no graded outcome; never an MCQ", () => {
    expect(later.pendingWrittenAnswers(ANSWERS, ENTRIES).map((a) => a.qNumber)).toEqual([2, 3]);
    const graded: Entry[] = [ENTRIES[0], { ...ENTRIES[1], graded: { ok: true, totalMarks: 3, marksAwarded: 3, percentage: 100 } as Entry["graded"] }, ENTRIES[2]];
    expect(later.pendingWrittenAnswers(ANSWERS, graded).map((a) => a.qNumber)).toEqual([3]);
  });
});

describe("saveQuickPracticeUploadLater", () => {
  it("writes the record NOW with the outcomes so far, and a snapshot of what is waiting", () => {
    const out = later.saveQuickPracticeUploadLater({ user: USER, worksheetId: WS, subject: "Maths", persist: PERSIST, answers: ANSWERS, entries: ENTRIES });
    expect(out).toEqual({ outcome: "saved", code: CODE, pendingCount: 2, recorded: true });
    expect(writeSessionRecord).toHaveBeenCalledTimes(1);
    expect(writeSessionRecord.mock.calls[0][1].id).toBe(CODE);
    expect(saveQuickPracticePaper).toHaveBeenCalledTimes(1);
    const snap = saveQuickPracticePaper.mock.calls[0][1];
    expect(snap.code).toBe(CODE);
    expect(snap.worksheetId).toBe(WS);
    expect(snap.pending.map((p) => p.qNumber)).toEqual([2, 3]);
    expect(snap.entries).toEqual(ENTRIES);
  });

  it("nothing scored yet: the snapshot is kept but `recorded` is false (no record was written)", () => {
    const entries: Entry[] = [{ questionId: "b1", marks: 1 }, ENTRIES[1], ENTRIES[2]];
    const out = later.saveQuickPracticeUploadLater({ user: USER, worksheetId: WS, subject: "Maths", persist: PERSIST, answers: ANSWERS, entries });
    expect(out).toEqual({ outcome: "saved", code: CODE, pendingCount: 2, recorded: false });
    expect(writeSessionRecord).not.toHaveBeenCalled();
    expect(saveQuickPracticePaper).toHaveBeenCalledTimes(1);
  });

  it("signed out / local session: nothing kept, honest outcome", () => {
    for (const user of [null, { uid: "x", isLocalSession: true } as unknown as User]) {
      const out = later.saveQuickPracticeUploadLater({ user, worksheetId: WS, subject: "Maths", persist: PERSIST, answers: ANSWERS, entries: ENTRIES });
      expect(out.outcome).toBe("signed-out");
    }
    expect(saveQuickPracticePaper).not.toHaveBeenCalled();
    expect(writeSessionRecord).not.toHaveBeenCalled();
  });

  it("nothing written waiting → nothing saved", () => {
    const out = later.saveQuickPracticeUploadLater({ user: USER, worksheetId: WS, subject: "Maths", persist: PERSIST, answers: [ANSWERS[0]], entries: [ENTRIES[0]] });
    expect(out.outcome).toBe("nothing-pending");
    expect(saveQuickPracticePaper).not.toHaveBeenCalled();
  });
});

describe("gradeQuickPracticeLater", () => {
  const snapshot = () => ({
    code: CODE,
    worksheetId: WS,
    subject: "Maths",
    persist: PERSIST,
    entries: ENTRIES,
    pending: [ans(2), ans(3)],
    savedAt: 1,
  });

  it("sends ONLY the waiting answers with working, same worksheetId, records them, replaces the SAME record id", async () => {
    const grader = vi.fn<Grader>(async () => ok([row(2), row(3)]));
    const out = await later.gradeQuickPracticeLater({
      user: USER,
      snapshot: snapshot(),
      working: { b2: { textAnswer: "a10 = 29" }, b3: { textAnswer: "S10 = 155" } },
      grade: grader,
    });
    expect(out.result.outcome).toBe("graded");
    expect(grader).toHaveBeenCalledTimes(1);
    const req = grader.mock.calls[0][0];
    expect(req.worksheetId).toBe(WS);
    expect(req.questions.map((q) => q.qNumber)).toEqual([2, 3]);
    // Recorded to Mistake Intelligence under the FIRST grade's submission id (replace, no double count).
    expect(recordMistake).toHaveBeenCalledTimes(2);
    for (const call of recordMistake.mock.calls) expect(call[2].submissionId).toBe(WS);
    expect(recordAttempt).toHaveBeenCalledTimes(2);
    // The SAME record id, now carrying the MCQ + both written grades.
    expect(writeSessionRecord).toHaveBeenCalledTimes(1);
    expect(writeSessionRecord.mock.calls[0][1].id).toBe(CODE);
    const payload = writeSessionPerQuestion.mock.calls[0][1];
    expect(payload.response.results.map((r) => r.qNumber)).toEqual([1, 2, 3]);
    // Nothing waits any more → the snapshot is cleared.
    expect(deleteQuickPracticePaper).toHaveBeenCalledWith(USER, CODE);
    expect(saveQuickPracticePaper).not.toHaveBeenCalled();
    expect(out.stillPending).toEqual([]);
  });

  it("a question still without working stays waiting (snapshot replaced, not cleared)", async () => {
    const grader = vi.fn<Grader>(async () => ok([row(2)]));
    const out = await later.gradeQuickPracticeLater({
      user: USER,
      snapshot: snapshot(),
      working: { b2: { textAnswer: "a10 = 29" } },
      grade: grader,
    });
    expect(out.stillPending.map((a) => a.qNumber)).toEqual([3]);
    expect(deleteQuickPracticePaper).not.toHaveBeenCalled();
    const resaved = saveQuickPracticePaper.mock.calls[0][1];
    expect(resaved.pending.map((p) => p.qNumber)).toEqual([3]);
    expect(resaved.entries[1].graded?.marksAwarded).toBe(2);
  });

  it("a failed grade writes nothing and keeps the snapshot", async () => {
    const grader = vi.fn<Grader>(async () => {
      throw new Error("boom");
    });
    const out = await later.gradeQuickPracticeLater({
      user: USER,
      snapshot: snapshot(),
      working: { b2: { textAnswer: "a10 = 29" } },
      grade: grader,
    });
    expect(out.result.outcome).toBe("skipped-error");
    expect(writeSessionRecord).not.toHaveBeenCalled();
    expect(deleteQuickPracticePaper).not.toHaveBeenCalled();
    expect(saveQuickPracticePaper).not.toHaveBeenCalled();
  });
});
