/**
 * GRADING-JOBS-1 J2b (controller decision D30-2) — an INTERRUPTED background grade records what
 * it really marked. Its FINAL graded rows (final:true, graded — never notGraded, never
 * provisional) go to Mistake Intelligence + progress at once, through each surface's normal
 * per-question path; a later "grade the remaining N" (continueFrom) adds ONLY the new rows.
 *
 * MUTATIONS (one at a time, scoped run, restore verified — see the J2 report):
 *   R1  drop the interrupted-row recording in a service catch  -> "3 final graded rows → 3 recorded" RED
 *   R2  drop the already-recorded skip on the continued grade  -> "…only the new row is added" RED
 *
 * Scoped run:
 *   pnpm exec vitest run src/services/gradingJobs.interruptedRecords.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const H = vi.hoisted(() => ({
  grade: vi.fn(),
  recordMistake: vi.fn(),
  recordAttempt: vi.fn(),
}));
vi.mock("../ai/aiClient", () => ({ gradeWorksheet: (...a: unknown[]) => H.grade(...a) }));
vi.mock("./mistakeIntelligence", () => ({ recordMistake: (...a: unknown[]) => H.recordMistake(...a) }));
vi.mock("./practiceInsights", () => ({ recordAttempt: (...a: unknown[]) => H.recordAttempt(...a) }));
vi.mock("./worksheetSessionStore", () => ({
  saveWorksheetGrade: () => {},
  getWorksheetGrade: () => null,
  listStoredWorksheetsLite: () => [],
}));
vi.mock("./sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sessionRecords")>()),
  ensureWorksheetSessionCode: async () => ({ code: "WS-M-AP-01", name: "AP · Worksheet 1" }),
  writeSessionRecord: () => "recorded",
  writeSessionPerQuestion: () => {},
}));

import { gradeWorksheetAndRecord } from "./worksheetGradeService";
import { gradeChapterTestUpload } from "./chapterTestGradeService";
import { gradeFullMockUpload } from "./fullMockGradeService";
import { gradeQuickPracticeBatch } from "./quickPracticeSessionService";
import { GradingJobInterruptedError, type GradingJobOptions, type GradingJobRow } from "../ai/gradingJobs";
import type { PersistedWorksheet } from "./worksheetSessionStore";

const graded = (qNumber: number, marksAwarded = 2) => ({
  qNumber,
  totalMarks: 3,
  marksAwarded,
  percentage: Math.round((marksAwarded / 3) * 100),
  couldNotRead: false,
  annotatedSteps: [],
  mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: "",
});
const row = (index: number): GradingJobRow => ({ index, final: true, ...graded(index + 1) }) as GradingJobRow;
const interruptedRow = (index: number): GradingJobRow =>
  ({ index, final: true, qNumber: index + 1, totalMarks: 3, marksAwarded: 0, percentage: 0, couldNotRead: true, notGraded: "interrupted" }) as unknown as GradingJobRow;
const provisionalRow = (index: number): GradingJobRow => ({ ...row(index), final: false }) as GradingJobRow;

/** 3 final graded rows + 1 interrupted row (Q4). */
const interruption = () => new GradingJobInterruptedError([row(0), row(1), row(2), interruptedRow(3)], "p-1");
const merged = () => ({
  ok: true,
  worksheetId: "p-1",
  results: [graded(1), graded(2), graded(3), graded(4, 1)],
  totalQuestions: 4,
  gradedCount: 4,
  pendingCount: 0,
  gradedMarksAwarded: 7,
  gradedMarksTotal: 12,
  worksheetTotalMarks: 12,
  summary: "",
});
const job = (continueFrom?: GradingJobInterruptedError): GradingJobOptions => ({
  store: { read: () => null, write: () => {}, clear: () => {} },
  paperKey: "p-1",
  ...(continueFrom ? { continueFrom } : {}),
});
const recordedIds = () => H.recordMistake.mock.calls.map((c) => (c[2] as { questionId: string }).questionId);

const PAPER = {
  worksheetId: "p-1",
  createdAt: "2026-10-06T00:00:00.000Z",
  title: "Paper",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 12,
  questions: [1, 2, 3, 4].map((n) => ({
    qNumber: n, id: `q${n}`, subject: "Maths", topicKey: "arithmetic-progressions", topicLabel: "AP",
    section: "C", marks: 3, questionText: `Q${n} text`,
  })),
} as PersistedWorksheet;
const UPLOAD = { imageBase64: "JVBERi0=", imageMimeType: "application/pdf" };
const OBJ = { results: [], awarded: 0, total: 0, answeredCount: 0, totalQuestions: 0 };

beforeEach(() => {
  H.grade.mockReset();
  H.recordMistake.mockReset().mockResolvedValue({ outcome: "logged", bridged: false });
  H.recordAttempt.mockReset().mockReturnValue("recorded");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

type Surface = { name: string; idPrefix: string; run: (j: GradingJobOptions) => Promise<unknown> };
const SURFACES: Surface[] = [
  { name: "worksheet", idPrefix: "ws:p-1:q", run: (j) => gradeWorksheetAndRecord(null, PAPER, UPLOAD, { job: j }) },
  {
    name: "chapter test",
    idPrefix: "ct:p-1:q",
    run: (j) =>
      gradeChapterTestUpload({ user: null, paper: PAPER, code: "CT-1", subject: "maths", topicKey: "ap", objective: OBJ, subjectiveQuestions: PAPER.questions, upload: UPLOAD, job: j }),
  },
  {
    name: "full mock",
    idPrefix: "fm:p-1:q",
    run: (j) =>
      gradeFullMockUpload({ user: null, paper: PAPER, code: "FM-1", subject: "maths", objective: OBJ, subjectiveQuestions: PAPER.questions, upload: UPLOAD, job: j }),
  },
];

describe.each(SURFACES)("$name — interrupted rows are recorded once", ({ run, idPrefix }) => {
  it("★ interrupted with 3 final graded rows → exactly 3 recorded (MI + attempt); the interruption still reaches the page", async () => {
    const err = interruption();
    H.grade.mockRejectedValueOnce(err);
    await expect(run(job())).rejects.toBe(err);
    expect(H.recordMistake).toHaveBeenCalledTimes(3);
    expect(H.recordAttempt).toHaveBeenCalledTimes(3);
    expect(recordedIds()).toEqual([1, 2, 3].map((n) => `${idPrefix}${n}`));
  });

  it("★ then 'grade the remaining' → only the new row is added (never double-recorded)", async () => {
    const err = interruption();
    H.grade.mockRejectedValueOnce(err).mockResolvedValueOnce(merged());
    await expect(run(job())).rejects.toBe(err);
    H.recordMistake.mockClear();
    H.recordAttempt.mockClear();
    await run(job(err));
    expect(recordedIds()).toEqual([`${idPrefix}4`]);
    expect(H.recordAttempt).toHaveBeenCalledTimes(1);
  });

  it("a provisional row is never recorded", async () => {
    H.grade.mockRejectedValueOnce(new GradingJobInterruptedError([row(0), provisionalRow(1), interruptedRow(2)], "p-1"));
    await expect(run(job())).rejects.toBeInstanceOf(GradingJobInterruptedError);
    expect(recordedIds()).toEqual([`${idPrefix}1`]);
  });

  it("CONTROL: a finished grade records every graded row", async () => {
    H.grade.mockResolvedValueOnce(merged());
    await run(job());
    expect(H.recordMistake).toHaveBeenCalledTimes(4);
  });
});

describe("Quick Practice batch — interrupted rows are recorded once", () => {
  const SIGNED_IN = { uid: "u-1", isLocalSession: false } as never;
  const answers = [1, 2, 3, 4].map((n) => ({ questionId: `bank-${n}`, qNumber: n, marks: 3, questionText: `Q${n}`, textAnswer: "working" }));

  it("★ 3 final graded rows → 3 recorded; the outcome stays skipped-error with jobInterrupted", async () => {
    const err = interruption();
    H.grade.mockRejectedValueOnce(err);
    const out = await gradeQuickPracticeBatch({ worksheetId: "qp-1", answers, user: SIGNED_IN, grade: H.grade, job: job() });
    expect(out.outcome).toBe("skipped-error");
    expect(out.jobInterrupted).toBe(err);
    expect(recordedIds()).toEqual(["bank-1", "bank-2", "bank-3"]);
    expect(out.miOutcomes.map((m) => m.qNumber)).toEqual([1, 2, 3]);
  });

  it("★ then 'grade the remaining' → only the new row is added", async () => {
    const err = interruption();
    H.grade.mockRejectedValueOnce(err).mockResolvedValueOnce(merged());
    await gradeQuickPracticeBatch({ worksheetId: "qp-1", answers, user: SIGNED_IN, grade: H.grade, job: job() });
    H.recordMistake.mockClear();
    const out = await gradeQuickPracticeBatch({ worksheetId: "qp-1", answers, user: SIGNED_IN, grade: H.grade, job: job(err) });
    expect(out.outcome).toBe("graded");
    expect(recordedIds()).toEqual(["bank-4"]);
  });
});
