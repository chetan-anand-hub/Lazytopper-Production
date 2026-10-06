/**
 * GRADING-JOBS-1 J2 — Check & Improve PAPER (multi-question) resume after a reload, on the REAL
 * page (contract v1.0 §11). A stored background grade restores the confirmed read, the detected
 * questions and the session code, and polls the SAME job (resumeOnly — the answer image is gone,
 * nothing is re-sent). Controls: nothing stored → nothing graded; signed out → nothing resumed.
 *
 * Scoped run:
 *   pnpm exec vitest run src/pages/desktop/DesktopCheckImprovePage.gradingJobs.test.tsx
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const H = vi.hoisted(() => ({
  auth: { user: null as null | Record<string, unknown>, loading: false },
  sub: {
    isPremium: true,
    isTrialExpired: false,
    hydrated: true,
    tier: "premium",
    isTrialActive: false,
    daysLeftInTrial: 0,
    startTrial: (() => {}) as () => void,
    upgradeToPremium: () => {},
    status: { tier: "premium", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
  },
  detectQuestion: vi.fn(),
  checkSolutionImage: vi.fn(),
  gradeWorksheet: vi.fn(),
  track: vi.fn(),
  recordMistake: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => H.auth,
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => H.sub,
}));
vi.mock("../../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
vi.mock("../../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/aiClient")>();
  return {
    ...actual,
    detectQuestion: (...a: unknown[]) => H.detectQuestion(...a),
    checkSolutionImage: (...a: unknown[]) => H.checkSolutionImage(...a),
    gradeWorksheet: (...a: unknown[]) => H.gradeWorksheet(...a),
  };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: (...a: unknown[]) => H.track(...a) };
});
// The account writes a SIGNED-IN grade makes — stubbed so no Firestore is reached.
vi.mock("../../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/mistakeIntelligence")>();
  return { ...actual, recordMistake: (...a: unknown[]) => H.recordMistake(...a) };
});
vi.mock("../../services/practiceInsights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/practiceInsights")>();
  return { ...actual, recordAttempt: () => "recorded" };
});
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    ensureCheckImproveSessionCode: (...a: unknown[]) => {
      const user = a[3] as { uid?: string } | null | undefined;
      if (!user?.uid) return (actual.ensureCheckImproveSessionCode as (...b: unknown[]) => unknown)(...a);
      return Promise.resolve({ code: "CI-M-REAL-02", name: "Real Numbers · Paper #2", sequence: 2 });
    },
    getSessionRecordsFromCloud: () => Promise.resolve([]),
  };
});
vi.mock("../../services/checkImproveGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/checkImproveGradeService")>();
  return {
    ...actual,
    persistCheckImproveSession: (args: { user?: { uid?: string } | null }) =>
      args.user?.uid ? "recorded" : actual.persistCheckImproveSession(args as never),
  };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";

const SIGNED_IN = { uid: "u1", email: null, phoneNumber: "+919000000000", displayName: null };
const READ = "check_question_read";
const ADDED = "check_answer_added";
const GRADED_EVENT = "check_graded";
const FUNNEL = [READ, ADDED, GRADED_EVENT];

const DETECTED = {
  ok: true,
  detectedMarks: 3,
  detectedSubject: "Maths",
  detectedTopic: "real-numbers",
  marksSource: "stated",
  questions: [{ questionNumber: 1, questionText: "Prove that root 2 is irrational.", marks: 3, marksSource: "stated" }],
};
const GRADED = {
  ok: true,
  totalMarks: 3,
  marksAwarded: 2,
  percentage: 67,
  annotatedSteps: [
    {
      stepNumber: 1,
      description: "Assume rational",
      studentWork: "Let root 2 = p/q",
      status: "partial",
      marksAwarded: 1,
      marksDeducted: 1,
      teacherAnnotation: "State co-prime.",
      mistakeType: "presentation",
      correctedWorking: null,
    },
  ],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 1 },
  teacherNote: "Nearly there.",
};
const TWO_QUESTIONS = {
  ...DETECTED,
  questions: [
    { questionNumber: 1, questionText: "Q-A", marks: 2, marksSource: "stated" },
    { questionNumber: 2, questionText: "Q-B", marks: 3, marksSource: "stated" },
  ],
};
const PAPER_GRADED = {
  ok: true,
  results: [
    { qNumber: 1, couldNotRead: false, totalMarks: 2, ok: true, marksAwarded: 1, percentage: 50, annotatedSteps: [], mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "" },
    { qNumber: 2, couldNotRead: false, totalMarks: 3, ok: true, marksAwarded: 3, percentage: 100, annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "" },
  ],
  totalQuestions: 2,
  gradedCount: 2,
  pendingCount: 0,
  gradedMarksAwarded: 4,
  gradedMarksTotal: 5,
  worksheetTotalMarks: 5,
};

function page(props: { overlay?: { onClose: () => void } } = {}) {
  return (
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage {...props} />} />
        <Route path="/login" element={<div data-testid="login-probe" />} />
      </Routes>
    </MemoryRouter>
  );
}


import { __setGradingJobTimersForTests, GradingJobGoneError, GradingJobInterruptedError, type GradingJobRow, type StoredGradingJob } from "../../ai/gradingJobs";

const JOB_ID = "f".repeat(40);
const SLOT = "lazytopper.gradingJob.v1.check-improve-paper";
const CONTEXT = {
  confirmed: { marks: 5, subject: "Maths", topicSlug: "real-numbers", topicName: "Real Numbers", marksSource: "stated" },
  detectedQuestions: [
    { questionNumber: 1, questionText: "Prove that root 2 is irrational.", marks: 2, marksSource: "stated" },
    { questionNumber: 2, questionText: "Find the HCF of 96 and 404.", marks: 3, marksSource: "stated" },
  ],
  ciCode: "CI-M-REAL-07",
  ciName: "Real Numbers · Paper #7",
  topicTouched: false,
  limitTo: null,
  imageMime: "image/jpeg",
};
const seed = () => {
  const rec: StoredGradingJob = { v: 1, jobId: JOB_ID, idempotencyKey: "k-1", pollPath: `/api/grade-worksheet/jobs/${JOB_ID}`, total: 2, submittedAt: 4_000, paperKey: "ci:CI-M-REAL-07", context: CONTEXT };
  window.sessionStorage.setItem(SLOT, JSON.stringify(rec));
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  H.auth = { user: SIGNED_IN, loading: false };
  H.sub.isPremium = true;
  H.detectQuestion.mockReset().mockResolvedValue({ ok: true, questions: [] });
  H.checkSolutionImage.mockReset();
  H.gradeWorksheet.mockReset().mockResolvedValue(PAPER_GRADED);
  H.track.mockReset();
  H.recordMistake.mockReset().mockResolvedValue({ outcome: "logged", bridged: false });
  __setGradingJobTimersForTests({ now: () => 5_000 });
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  __setGradingJobTimersForTests({ now: null });
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("J2 · C&I paper — resume after a reload", () => {
  it("★ restores the session and polls the SAME job (resumeOnly), under the stored code", async () => {
    seed();
    render(page());
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    const [req, opts] = H.gradeWorksheet.mock.calls[0] as [{ worksheetId: string; questions: unknown[] }, { job?: { resumeOnly?: boolean; paperKey: string; store: { read: () => StoredGradingJob | null } }; freeCheck?: boolean }];
    expect(req.worksheetId).toBe("ci:CI-M-REAL-07");
    expect(req.questions).toHaveLength(2);
    expect(opts.freeCheck).toBeUndefined();
    expect(opts.job?.resumeOnly).toBe(true);
    expect(opts.job?.paperKey).toBe("ci:CI-M-REAL-07");
    expect(opts.job?.store.read()?.jobId).toBe(JOB_ID);
    // the graded paper is shown from the resumed job's final body
    expect(await screen.findByText("CI-M-REAL-07 · 2/2 graded")).toBeTruthy();
  });

  it("CONTROL: nothing stored → nothing is graded on mount", async () => {
    render(page());
    await act(async () => { await new Promise((r) => setTimeout(r, 200)); });
    expect(H.gradeWorksheet).not.toHaveBeenCalled();
  });

  it("CONTROL: signed out → a stored job is never resumed (jobs need a verified uid)", async () => {
    seed();
    H.auth = { user: null, loading: false };
    render(page());
    await act(async () => { await new Promise((r) => setTimeout(r, 200)); });
    expect(H.gradeWorksheet).not.toHaveBeenCalled();
  });

  it("★ D30-2: an interrupted paper records its FINAL graded rows only (not the interrupted one)", async () => {
    seed();
    const r = (index: number, extra: Record<string, unknown> = {}) =>
      ({ index, final: true, qNumber: index + 1, totalMarks: 2, marksAwarded: 1, percentage: 50, couldNotRead: false, annotatedSteps: [], ...extra }) as unknown as GradingJobRow;
    H.gradeWorksheet.mockReset().mockRejectedValue(
      new GradingJobInterruptedError([r(0), r(1, { couldNotRead: true, marksAwarded: 0, notGraded: "interrupted" })], "ci:CI-M-REAL-07"),
    );
    render(page());
    await waitFor(() => expect(H.recordMistake).toHaveBeenCalledTimes(1));
    expect((H.recordMistake.mock.calls[0][2] as { submissionId: string }).submissionId).toBe("CI-M-REAL-07");
    expect(await screen.findByRole("button", { name: "Grade the remaining 1 question" }).catch(() => null)).toBeNull(); // no photo after a reload
    expect(screen.getByText("Upload your answers again to grade the remaining 1.")).toBeTruthy();
  });

  it("N2: a job that is gone after a reload shows the honest sentence, not 'Grading unavailable'", async () => {
    seed();
    H.gradeWorksheet.mockReset().mockRejectedValue(new GradingJobGoneError());
    render(page());
    expect(await screen.findByText(/This check is no longer available/)).toBeTruthy();
    expect(screen.queryByText("Grading unavailable — please try again.")).toBeNull();
  });
});
