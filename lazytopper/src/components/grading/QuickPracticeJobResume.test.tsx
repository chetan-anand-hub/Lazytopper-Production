/**
 * GRADING-JOBS-1 J2 — Quick Practice's resume after a reload (contract v1.0 §11: "persist jobId —
 * answers are React state only"). The stored job is polled (resumeOnly — never re-submitted), and
 * at done the ONE session record is written from the final entries; a job that is gone says so.
 *
 * Scoped run:
 *   pnpm exec vitest run src/components/grading/QuickPracticeJobResume.test.tsx
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";

const gradeQuickPracticeBatch = vi.fn();
const persistQuickPracticeSession = vi.fn();
vi.mock("../../services/quickPracticeSessionService", () => ({
  gradeQuickPracticeBatch: (...a: unknown[]) => gradeQuickPracticeBatch(...a),
  persistQuickPracticeSession: (...a: unknown[]) => persistQuickPracticeSession(...a),
}));

import QuickPracticeJobResume, {
  QP_JOB_SLOT,
  STORED_PHOTO_MARKER,
  storableAnswers,
  type QuickPracticeJobContext,
} from "./QuickPracticeJobResume";
import { __setGradingJobTimersForTests, type StoredGradingJob } from "../../ai/gradingJobs";

const USER = { uid: "u-1", isLocalSession: false } as never;
const JOB_ID = "d".repeat(40);
const CTX: QuickPracticeJobContext = {
  worksheetId: "qp-1",
  subject: "maths",
  answers: storableAnswers([
    { questionId: "b1", qNumber: 1, marks: 3, questionText: "Q1", imageBase64: "IMAGE", imageMimeType: "image/jpeg" },
    { questionId: "b2", qNumber: 2, marks: 3, questionText: "Q2", textAnswer: "typed" },
  ]),
  persist: { title: "AP · Practice set", subject: "maths", topicSlug: "arithmetic-progressions", filterSignature: "sig", startedAt: 7 },
};
const seed = (ctx: unknown = CTX) => {
  const rec: StoredGradingJob = { v: 1, jobId: JOB_ID, idempotencyKey: "k-1", pollPath: `/api/grade-worksheet/jobs/${JOB_ID}`, total: 2, submittedAt: 4_000, paperKey: "qp-1", context: ctx };
  window.sessionStorage.setItem(`lazytopper.gradingJob.v1.${QP_JOB_SLOT}`, JSON.stringify(rec));
};

beforeEach(() => {
  window.sessionStorage.clear();
  gradeQuickPracticeBatch.mockReset();
  persistQuickPracticeSession.mockReset();
  __setGradingJobTimersForTests({ now: () => 5_000 });
});
afterEach(() => {
  cleanup();
  __setGradingJobTimersForTests({ now: null });
  window.sessionStorage.clear();
});

describe("J2 · Quick Practice resume after a reload", () => {
  it("the stored copy of an answer never keeps the photo", () => {
    expect(CTX.answers[0].imageBase64).toBe(STORED_PHOTO_MARKER);
    expect(JSON.stringify(CTX)).not.toContain("IMAGE");
  });

  it("★ polls the SAME stored job (resumeOnly) and, at done, writes the one record from the final entries", async () => {
    seed();
    const entries = [{ questionId: "b1", marks: 3, graded: { ok: true } }];
    gradeQuickPracticeBatch.mockResolvedValue({ outcome: "graded", entries, miOutcomes: [] });
    render(<QuickPracticeJobResume user={USER} />);
    await waitFor(() => expect(persistQuickPracticeSession).toHaveBeenCalledTimes(1));
    const args = gradeQuickPracticeBatch.mock.calls[0][0] as { job: { resumeOnly: boolean; paperKey: string; store: { read: () => StoredGradingJob | null } }; answers: unknown };
    expect(args.job.resumeOnly).toBe(true);
    expect(args.job.paperKey).toBe("qp-1");
    expect(args.job.store.read()?.jobId).toBe(JOB_ID);
    expect(args.answers).toEqual(CTX.answers);
    expect(persistQuickPracticeSession).toHaveBeenCalledWith({ user: USER, ...CTX.persist, entries });
    expect(await screen.findByText(/Your last practice set is graded/)).toBeTruthy();
  });

  it("a job that is gone says so honestly and writes nothing", async () => {
    seed();
    gradeQuickPracticeBatch.mockResolvedValue({
      outcome: "skipped-error",
      entries: [],
      miOutcomes: [],
      errorName: "GradingJobGoneError",
      error: "This check is no longer available — please upload your answers and grade again. You have not been charged twice.",
    });
    render(<QuickPracticeJobResume user={USER} />);
    expect(await screen.findByText(/This check is no longer available/)).toBeTruthy();
    expect(persistQuickPracticeSession).not.toHaveBeenCalled();
  });

  it("CONTROL: nothing stored → renders nothing and grades nothing", async () => {
    const { container } = render(<QuickPracticeJobResume user={USER} />);
    await act(async () => {});
    expect(container.textContent).toBe("");
    expect(gradeQuickPracticeBatch).not.toHaveBeenCalled();
  });

  it("CONTROL: a stored job with an unreadable context is never resumed", async () => {
    seed({ junk: true });
    render(<QuickPracticeJobResume user={USER} />);
    await act(async () => {});
    expect(gradeQuickPracticeBatch).not.toHaveBeenCalled();
  });
});
