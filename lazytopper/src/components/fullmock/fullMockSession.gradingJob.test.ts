/**
 * GRADING-JOBS-1 J2 (contract v1.0 §11) — Full Mock keeps `{jobId, idempotencyKey, …}` on its
 * persisted awaiting-upload session, so a reload resumes the SAME job. Reads the clock only
 * through saveFullMockSession (updatedAt) — listed in the CI clock manifest.
 *
 * Scoped run:
 *   pnpm exec vitest run src/components/fullmock/fullMockSession.gradingJob.test.ts
 */
import { describe, it, expect } from "vitest";
import type { StoredGradingJob } from "../../ai/gradingJobs";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import { fullMockJobStore, loadFullMockSession, saveFullMockSession } from "./fullMockSession";

const PAPER = {
  worksheetId: "ct-1",
  createdAt: "2026-10-06T00:00:00.000Z",
  title: "Paper",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 6,
  questions: [{ qNumber: 1, id: "q1", subject: "Maths", topicKey: "ap", topicLabel: "AP", section: "C", marks: 3, questionText: "Q1" }],
} as PersistedWorksheet;
const OBJ = { awarded: 0, total: 0, perQuestion: [] } as never;

describe("Full Mock — the job lives on the persisted awaiting-upload session", () => {
  it("write / read / clear round-trip on the session (resume after a reload)", () => {
    saveFullMockSession("u-1", {
      code: "FM-M-01",
      name: "Mock 1",
      subject: "Maths",
      grade: "10",
      paper: PAPER,
      startedAt: 1,
      durationMs: 1,
      answers: {},
      flags: [],
      currentQNumber: 1,
      focus: {} as never,
      phase: "awaiting-upload",
      objective: OBJ,
      updatedAt: 1,
    });
    const store = fullMockJobStore("u-1", "FM-M-01");
    expect(store.read()).toBeNull();
    const rec: StoredGradingJob = { v: 1, jobId: "b".repeat(40), idempotencyKey: "k-1", pollPath: `/api/grade-worksheet/jobs/${"b".repeat(40)}`, total: 2, submittedAt: 5, paperKey: "ct-1" };
    store.write(rec);
    expect(loadFullMockSession("u-1", "FM-M-01")?.gradingJob).toEqual(rec);
    expect(store.read()).toEqual(rec);
    store.clear();
    expect(store.read()).toBeNull();
    expect(loadFullMockSession("u-1", "FM-M-01")?.phase).toBe("awaiting-upload");
  });
});
