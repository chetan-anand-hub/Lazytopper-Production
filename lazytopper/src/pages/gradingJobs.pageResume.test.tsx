/**
 * GRADING-JOBS-1 J2 — resume after a reload on the REAL Chapter Test and Full Mock pages
 * (contract v1.0 §11). Each page finds its stored background grade on mount, re-opens the
 * upload step on the STORED paper (never a fresh draw) and polls the SAME job — `resumeOnly`,
 * no file. Controls: nothing stored → nothing graded.
 *
 * Scoped run:
 *   pnpm exec vitest run src/pages/gradingJobs.pageResume.test.tsx
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const gradeChapterTestUpload = vi.fn();
const gradeFullMockUpload = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../components/usage/useFairUse", () => ({
  useFairUse: () => ({
    limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false,
    blockPaperStart: () => false, planGrade: () => ({ action: "go" }), showLimit: () => {},
  }),
}));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => [] };
});
vi.mock("../services/chapterTestGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/chapterTestGradeService")>();
  return { ...actual, gradeChapterTestUpload: (...a: unknown[]) => gradeChapterTestUpload(...a) };
});
vi.mock("../services/fullMockGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/fullMockGradeService")>();
  return { ...actual, gradeFullMockUpload: (...a: unknown[]) => gradeFullMockUpload(...a) };
});

import ChapterTestPage from "./ChapterTestPage";
import FullMockPage from "./FullMockPage";
import { __setGradingJobTimersForTests, type StoredGradingJob } from "../ai/gradingJobs";
import type { PersistedWorksheet } from "../services/worksheetSessionStore";

const JOB_ID = "e".repeat(40);
const PAPER = {
  worksheetId: "ct-stored-1",
  createdAt: "2026-10-06T00:00:00.000Z",
  title: "Stored paper",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 3,
  questions: [{ qNumber: 1, id: "q1", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "Prove that √2 is irrational." }],
} as PersistedWorksheet;
const OBJ = { awarded: 1, total: 1, perQuestion: [] };
const job = (paperKey: string, context?: unknown): StoredGradingJob => ({
  v: 1, jobId: JOB_ID, idempotencyKey: "k-1", pollPath: `/api/grade-worksheet/jobs/${JOB_ID}`, total: 1, submittedAt: 4_000, paperKey, ...(context ? { context } : {}),
});
const never = () => new Promise(() => {});

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  gradeChapterTestUpload.mockReset().mockImplementation(never);
  gradeFullMockUpload.mockReset().mockImplementation(never);
  __setGradingJobTimersForTests({ now: () => 5_000 });
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  __setGradingJobTimersForTests({ now: null });
  window.sessionStorage.clear();
  window.localStorage.clear();
});

const mountCt = () =>
  render(
    <MemoryRouter initialEntries={["/chapter-test/10/maths/real-numbers"]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
      </Routes>
    </MemoryRouter>,
  );
const mountFm = () =>
  render(
    <MemoryRouter initialEntries={["/full-mock/10/maths"]}>
      <Routes>
        <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("J2 · Chapter Test — resume after a reload", () => {
  it("★ re-opens the STORED paper and polls the SAME job (resumeOnly) under the stored code", async () => {
    window.sessionStorage.setItem(
      "lazytopper.gradingJob.v1.chapter-test:real-numbers",
      JSON.stringify(job(PAPER.worksheetId, { paper: PAPER, objective: OBJ, code: "CT-M-RN-07", name: "Real Numbers · Test 7" })),
    );
    mountCt();
    await waitFor(() => expect(gradeChapterTestUpload).toHaveBeenCalledTimes(1), { timeout: 8000 });
    const args = gradeChapterTestUpload.mock.calls[0][0] as { paper: PersistedWorksheet; code: string; job: { resumeOnly?: boolean; store: { read: () => StoredGradingJob | null } } };
    expect(args.job.resumeOnly).toBe(true);
    expect(args.paper.worksheetId).toBe("ct-stored-1");
    expect(args.code).toBe("CT-M-RN-07");
    expect(args.job.store.read()?.jobId).toBe(JOB_ID);
  });

  it("CONTROL: nothing stored → the page grades nothing on mount", async () => {
    mountCt();
    await act(async () => { await new Promise((r) => setTimeout(r, 300)); });
    expect(gradeChapterTestUpload).not.toHaveBeenCalled();
  });
});

describe("J2 · Full Mock — resume after a reload (job on the awaiting-upload session)", () => {
  it("★ re-opens the awaiting-upload mock and polls the SAME job (resumeOnly)", async () => {
    window.localStorage.setItem(
      "lazytopper.fm.session.v1.student-1.FM-M-03",
      JSON.stringify({
        code: "FM-M-03", name: "Maths Mock 3", subject: "Maths", grade: "10", paper: { ...PAPER, worksheetId: "fm-stored-3" },
        startedAt: 1, durationMs: 1, answers: {}, flags: [], currentQNumber: 1, focus: {}, phase: "awaiting-upload",
        objective: OBJ, updatedAt: 1, gradingJob: job("fm-stored-3"),
      }),
    );
    mountFm();
    await waitFor(() => expect(gradeFullMockUpload).toHaveBeenCalledTimes(1), { timeout: 8000 });
    const args = gradeFullMockUpload.mock.calls[0][0] as { paper: PersistedWorksheet; code: string; job: { resumeOnly?: boolean; store: { read: () => StoredGradingJob | null } } };
    expect(args.job.resumeOnly).toBe(true);
    expect(args.code).toBe("FM-M-03");
    expect(args.paper.worksheetId).toBe("fm-stored-3");
    expect(args.job.store.read()?.jobId).toBe(JOB_ID);
  });

  it("CONTROL: an awaiting-upload mock with NO job is not graded on mount", async () => {
    window.localStorage.setItem(
      "lazytopper.fm.session.v1.student-1.FM-M-03",
      JSON.stringify({
        code: "FM-M-03", name: "Maths Mock 3", subject: "Maths", grade: "10", paper: { ...PAPER, worksheetId: "fm-stored-3" },
        startedAt: 1, durationMs: 1, answers: {}, flags: [], currentQNumber: 1, focus: {}, phase: "awaiting-upload",
        objective: OBJ, updatedAt: 1,
      }),
    );
    mountFm();
    await act(async () => { await new Promise((r) => setTimeout(r, 300)); });
    expect(gradeFullMockUpload).not.toHaveBeenCalled();
  });
});
