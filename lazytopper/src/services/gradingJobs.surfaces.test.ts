/**
 * GRADING-JOBS-1 J2 — the five job surfaces thread ONE `job` option to the shared client, and
 * nothing else changes (contract v1.0 §11):
 *   · Worksheets / Chapter Test / Full Mock services pass `opts.job` through to gradeWorksheet,
 *     and WITHOUT it their call options are exactly today's;
 *   · Quick Practice batch opts in ONLY for a batch of MORE than one question, and carries an
 *     interruption out as `jobInterrupted` (read by name).
 *
 * Scoped run:
 *   pnpm exec vitest run src/services/gradingJobs.surfaces.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const gradeWorksheetMock = vi.fn();
vi.mock("../ai/aiClient", () => ({ gradeWorksheet: (...a: unknown[]) => gradeWorksheetMock(...a) }));
vi.mock("./mistakeIntelligence", () => ({ recordMistake: vi.fn() }));
vi.mock("./practiceInsights", () => ({ recordAttempt: vi.fn() }));
vi.mock("./sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sessionRecords")>()),
  writeSessionRecord: vi.fn(),
  writeSessionPerQuestion: vi.fn(),
}));

import { gradeWorksheetAndRecord } from "./worksheetGradeService";
import { gradeChapterTestUpload } from "./chapterTestGradeService";
import { gradeFullMockUpload } from "./fullMockGradeService";
import { gradeQuickPracticeBatch } from "./quickPracticeSessionService";
import { GradingJobInterruptedError, type GradingJobOptions } from "../ai/gradingJobs";
import type { PersistedWorksheet } from "./worksheetSessionStore";

const STOP = new Error("stop-after-the-call");
const PAPER = {
  worksheetId: "ct-1",
  createdAt: "2026-10-06T00:00:00.000Z",
  title: "Paper",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 6,
  questions: [1, 2].map((n) => ({
    qNumber: n,
    id: `q${n}`,
    subject: "Maths",
    topicKey: "arithmetic-progressions",
    topicLabel: "AP",
    section: "C",
    marks: 3,
    questionText: `Q${n} text`,
  })),
} as PersistedWorksheet;
const UPLOAD = { imageBase64: "JVBERi0=", imageMimeType: "application/pdf" };
const OBJ = { awarded: 0, total: 0, perQuestion: [] } as never;
const job = (): GradingJobOptions => ({ store: { read: () => null, write: () => {}, clear: () => {} }, paperKey: "ct-1" });
const optsOfLastCall = () => gradeWorksheetMock.mock.calls.at(-1)?.[1] as Record<string, unknown>;

beforeEach(() => {
  gradeWorksheetMock.mockReset().mockRejectedValue(STOP);
});

describe("Worksheets / Chapter Test / Full Mock — the job option is threaded, and only when given", () => {
  it("worksheet: without a job the options are today's; with one, it reaches gradeWorksheet", async () => {
    await expect(gradeWorksheetAndRecord(null, PAPER, UPLOAD)).rejects.toBe(STOP);
    expect(optsOfLastCall()).toEqual({ surface: "worksheet", paperKey: "ct-1" });
    const j = job();
    await expect(gradeWorksheetAndRecord(null, PAPER, UPLOAD, { job: j })).rejects.toBe(STOP);
    expect(optsOfLastCall()).toEqual({ surface: "worksheet", paperKey: "ct-1", job: j });
  });

  it("chapter test: same", async () => {
    const base = { user: null, paper: PAPER, code: "CT-1", subject: "maths" as const, topicKey: "ap", objective: OBJ, subjectiveQuestions: PAPER.questions, upload: UPLOAD };
    await expect(gradeChapterTestUpload(base)).rejects.toBe(STOP);
    expect(optsOfLastCall()).toEqual({ surface: "chapter-test", paperKey: "ct-1" });
    const j = job();
    await expect(gradeChapterTestUpload({ ...base, job: j })).rejects.toBe(STOP);
    expect(optsOfLastCall()).toEqual({ surface: "chapter-test", paperKey: "ct-1", job: j });
  });

  it("full mock: same", async () => {
    const base = { user: null, paper: PAPER, code: "FM-1", subject: "maths" as const, objective: OBJ, subjectiveQuestions: PAPER.questions, upload: UPLOAD };
    await expect(gradeFullMockUpload(base)).rejects.toBe(STOP);
    expect(optsOfLastCall()).toEqual({ surface: "full-mock", paperKey: "ct-1" });
    const j = job();
    await expect(gradeFullMockUpload({ ...base, job: j })).rejects.toBe(STOP);
    expect(optsOfLastCall()).toEqual({ surface: "full-mock", paperKey: "ct-1", job: j });
  });
});

describe("Quick Practice batch — a job ONLY for more than one question", () => {
  const SIGNED_IN = { uid: "u-1", isLocalSession: false } as never;
  const ans = (n: number) => ({ questionId: `b${n}`, qNumber: n, marks: 3, questionText: `Q${n}`, textAnswer: "working" });

  it("two answers carry the job; one answer is graded exactly as today", async () => {
    const grade = vi.fn().mockRejectedValue(STOP);
    const j = job();
    await gradeQuickPracticeBatch({ worksheetId: "qp-1", answers: [ans(1), ans(2)], user: SIGNED_IN, grade, job: j });
    expect(grade.mock.calls[0][1]).toEqual({ surface: "quick-practice", job: j });
    await gradeQuickPracticeBatch({ worksheetId: "qp-1", answers: [ans(1)], user: SIGNED_IN, grade, job: j });
    expect(grade.mock.calls[1][1]).toEqual({ surface: "quick-practice" });
  });

  it("an interruption comes out as `jobInterrupted` (rows + remaining), never as a grade", async () => {
    const err = new GradingJobInterruptedError(
      [{ index: 0, final: true, qNumber: 1, totalMarks: 3, marksAwarded: 2, percentage: 67, couldNotRead: false }, { index: 1, final: true, qNumber: 2, totalMarks: 3, marksAwarded: 0, percentage: 0, couldNotRead: true, notGraded: "interrupted" as never }],
      "qp-1",
    );
    const grade = vi.fn().mockRejectedValue(err);
    const out = await gradeQuickPracticeBatch({ worksheetId: "qp-1", answers: [ans(1), ans(2)], user: SIGNED_IN, grade, job: job() });
    expect(out.outcome).toBe("skipped-error");
    expect(out.jobInterrupted?.remaining).toEqual([1]);
    expect(out.miOutcomes).toEqual([]);
  });
});
