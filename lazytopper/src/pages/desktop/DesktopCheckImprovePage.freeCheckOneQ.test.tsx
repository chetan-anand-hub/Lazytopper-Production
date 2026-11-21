/**
 * FREECHECK-ONEQ-1 - the signed-out free check marks ONLY the first question of a multi-question page.
 *
 * The gate is stubbed through `useSubscription` (the blast-radius guard in
 * entitlementGating.test.ts), and auth through `useAuth` — both mutable per test. The
 * grading calls are spies on the REAL aiClient module (every other export kept), so
 * what the page hands them — the free-check opt-in — is what is asserted.
 *
 * Mutations this file turns RED (applied, seen red, reverted — see the lane report):
 *   B1 the flag check removed (the free branch shows with the flag off)
 *   B3 the R1 mark set before the result arrives
 *   B4 a sign-in link pointed at /sign-up
 *   B6 the trial auto-started
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const H = vi.hoisted(() => ({
  auth: { user: null as null | Record<string, unknown>, loading: false },
  sub: {
    isPremium: false,
    isTrialExpired: false,
    hydrated: true,
    tier: "free",
    isTrialActive: false,
    daysLeftInTrial: 0,
    startTrial: vi.fn(),
    upgradeToPremium: vi.fn(),
    status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
  },
  phase: "none" as "none" | "saving" | "saved",
  detectQuestion: vi.fn(),
  checkSolutionImage: vi.fn(),
  gradeWorksheet: vi.fn(),
  track: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => H.auth,
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => H.sub,
}));
vi.mock("../../hooks/useFreeCheckReturn", () => ({
  useFreeCheckReturn: (user: unknown, enabled: boolean) => (user && enabled ? H.phase : "none"),
}));
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

// The signed-in test grades a whole paper, which writes MI + attempt records after the grade; stub the writers
// (the same way the other signed-in page tests do) so nothing is still running when the test ends.
vi.mock("../../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/mistakeIntelligence")>();
  return { ...actual, recordMistake: () => Promise.resolve({ outcome: "logged", bridged: false }) };
});
vi.mock("../../services/practiceInsights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/practiceInsights")>();
  return { ...actual, recordAttempt: () => "recorded" };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import { PremiumRequiredError } from "../../ai/aiClient";
import { SIGN_IN_AGAIN_MESSAGE, SignInAgainError } from "../../ai/paidCallHeaders";
import {
  FREE_CHECK_PENDING_KEY,
  FREE_CHECK_USED_KEY,
  FreeCheckRefusedError,
  type FreeCheckRefusalReason,
} from "../../services/freeCheckClient";

const SIGNED_IN = { uid: "u1", email: null, phoneNumber: "+919000000000", displayName: null };

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

function LoginProbe() {
  const loc = useLocation();
  return <div data-testid="login-probe">{`LOGIN from=${String((loc.state as { from?: string } | null)?.from)}`}</div>;
}

function renderPage(props: { overlay?: { onClose: () => void } } = {}) {
  return render(
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage {...props} />} />
        <Route path="/login" element={<LoginProbe />} />
        <Route path="/" element={<div data-testid="home-probe">HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  H.auth = { user: null, loading: false };
  H.sub.isPremium = false;
  H.sub.isTrialExpired = false;
  H.sub.hydrated = true;
  H.sub.startTrial = vi.fn();
  H.phase = "none";
  H.detectQuestion.mockReset().mockResolvedValue(DETECTED);
  H.checkSolutionImage.mockReset().mockResolvedValue(GRADED);
  H.gradeWorksheet.mockReset();
  H.track.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const flagOn = () => vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
const flagOff = () => vi.stubEnv("VITE_FREE_CHECK_ENABLED", "");


const THREE = {
  ...DETECTED,
  questions: [
    { questionNumber: 1, questionText: "Q-A first question", marks: 2, marksSource: "stated" },
    { questionNumber: 2, questionText: "Q-B second question", marks: 3, marksSource: "stated" },
    { questionNumber: 3, questionText: "Q-C third question", marks: 1, marksSource: "stated" },
  ],
};
const ONE_RESULT = {
  ok: true,
  results: [{ qNumber: 1, couldNotRead: false, totalMarks: 2, ok: true, marksAwarded: 1, percentage: 50, annotatedSteps: [], mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "" }],
  totalQuestions: 1, gradedCount: 1, pendingCount: 0, gradedMarksAwarded: 1, gradedMarksTotal: 2, worksheetTotalMarks: 2,
};

async function readQuestion() {
  fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: "Q-A first question" } });
  fireEvent.click(screen.getByRole("button", { name: /Read the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
}

async function uploadAnswerSheet(container: HTMLElement) {
  const answerInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
  fireEvent.change(answerInput, { target: { files: [new File(["png-bytes"], "answers.png", { type: "image/png" })] } });
  return screen.findByRole("button", { name: /Grade my answer/ });
}

function detectThree() {
  H.detectQuestion.mockImplementation(async (req: { question?: string }) =>
    /^Q-[ABC]/.test(req.question ?? "") && req.question !== "Q-A first question"
      ? { ok: true, detectedTopic: null, detectedSubject: null }
      : THREE,
  );
}

describe("FREECHECK-ONEQ-1 - signed out, a page with several questions", () => {
  it("before grading: the one-line notice sits by the Grade button", async () => {
    flagOn();
    detectThree();
    const { container } = renderPage();
    await readQuestion();
    await uploadAnswerSheet(container);
    expect(screen.getByTestId("free-check-oneq-line").textContent).toBe(
      "Your free check marks question 1. Sign up for a 7-day free trial to mark the whole page.",
    );
  });

  it("grading sends ONLY question 1; the result shows its grade and Q2-Q3 as locked rows with the sign-up action", async () => {
    flagOn();
    detectThree();
    H.gradeWorksheet.mockResolvedValue(ONE_RESULT);
    const { container } = renderPage();
    await readQuestion();
    const grade = await uploadAnswerSheet(container);
    await waitFor(() => expect(grade).not.toBeDisabled());
    fireEvent.click(grade);

    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    const sent = H.gradeWorksheet.mock.calls[0][0].questions as Array<{ qNumber: number }>;
    expect(sent.map((q) => q.qNumber)).toEqual([1]);

    const locked = await screen.findByTestId("free-check-locked");
    expect(screen.getAllByTestId("free-check-locked-row").map((r) => r.textContent)).toEqual([
      "Q2Q-B second questionLocked",
      "Q3Q-C third questionLocked",
    ]);
    expect(screen.getByTestId("free-check-locked-line").textContent).toBe(
      "Start your 7-day free trial to get marks for questions 2\u20133.",
    );
    expect(screen.getByTestId("free-check-locked-signup").getAttribute("href")).toBe("/login?redirect=%2Fcheck-improve");
    expect(locked.textContent).not.toMatch(/\bAI\b|answer key/i);
    // The trial note meant for a signed-in student is NOT what a signed-out visitor sees.
    expect(screen.queryByTestId("trial-paper-note")).toBeNull();

    // The saved result carries 1 graded result but ALL the questions, so a sign-up can restore the locked rows.
    await waitFor(() => expect(window.localStorage.getItem(FREE_CHECK_PENDING_KEY)).not.toBeNull());
    const pending = JSON.parse(window.localStorage.getItem(FREE_CHECK_PENDING_KEY) ?? "null");
    expect(pending.questions.map((q: { questionNumber: number }) => q.questionNumber)).toEqual([1, 2, 3]);
    expect(pending.response.results).toHaveLength(1);
  });

  it("KILL SWITCH VITE_FREE_CHECK_ONE_QUESTION_DISABLED: no notice, every question is sent, as before", async () => {
    flagOn();
    vi.stubEnv("VITE_FREE_CHECK_ONE_QUESTION_DISABLED", "1");
    detectThree();
    H.gradeWorksheet.mockResolvedValue({ ...ONE_RESULT, results: THREE.questions.map((q) => ({ ...ONE_RESULT.results[0], qNumber: q.questionNumber })), totalQuestions: 3, gradedCount: 3 });
    const { container } = renderPage();
    await readQuestion();
    const grade = await uploadAnswerSheet(container);
    expect(screen.queryByTestId("free-check-oneq-line")).toBeNull();
    await waitFor(() => expect(grade).not.toBeDisabled());
    fireEvent.click(grade);
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    expect((H.gradeWorksheet.mock.calls[0][0].questions as unknown[]).length).toBe(3);
    await waitFor(() => expect(window.localStorage.getItem(FREE_CHECK_USED_KEY)).not.toBeNull());
    expect(screen.queryByTestId("free-check-locked")).toBeNull();
  });

  it("a single-question page has no notice and no locked rows", async () => {
    flagOn();
    const { container } = renderPage();
    await readQuestion();
    fireEvent.click(screen.getByRole("tab", { name: "Type answer" }));
    expect(screen.queryByTestId("free-check-oneq-line")).toBeNull();
    expect(container.querySelector('[data-testid="free-check-locked"]')).toBeNull();
  });

  it("a server that cut the paper (old client / kill switch here) is still shown as 1 graded + the rest locked", async () => {
    flagOn();
    vi.stubEnv("VITE_FREE_CHECK_ONE_QUESTION_DISABLED", "1");
    detectThree();
    H.gradeWorksheet.mockResolvedValue({ ...ONE_RESULT, freeCheckGradedOf: { graded: 1, total: 3 } });
    const { container } = renderPage();
    await readQuestion();
    const grade = await uploadAnswerSheet(container);
    await waitFor(() => expect(grade).not.toBeDisabled());
    fireEvent.click(grade);
    expect(await screen.findByTestId("free-check-locked")).toBeTruthy();
  });
});

function detectRows(rows: Array<{ questionNumber: number; questionText: string }>) {
  H.detectQuestion.mockImplementation(async (req: { question?: string }) =>
    req.question === "Q-A first question"
      ? { ...DETECTED, questions: rows.map((r) => ({ ...r, marks: 2, marksSource: "stated" })) }
      : { ok: true, detectedTopic: null, detectedSubject: null },
  );
}
const oneResult = (qNumber: number) => ({ ...ONE_RESULT, results: [{ ...ONE_RESULT.results[0], qNumber }] });

describe("FREECHECK-ONEQ-1 - which question is 'the first'", () => {
  it("a page detected as Q5-Q8 says question 5, sends only Q5, and locks questions 6-8", async () => {
    flagOn();
    detectRows([5, 6, 7, 8].map((n) => ({ questionNumber: n, questionText: `Row ${n} text` })));
    H.gradeWorksheet.mockResolvedValue(oneResult(5));
    const { container } = renderPage();
    await readQuestion();
    const grade = await uploadAnswerSheet(container);
    expect(screen.getByTestId("free-check-oneq-line").textContent).toContain("marks question 5.");
    await waitFor(() => expect(grade).not.toBeDisabled());
    fireEvent.click(grade);
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    expect((H.gradeWorksheet.mock.calls[0][0].questions as Array<{ qNumber: number }>).map((q) => q.qNumber)).toEqual([5]);
    await screen.findByTestId("free-check-locked");
    expect(screen.getByTestId("free-check-locked-line").textContent).toBe("Start your 7-day free trial to get marks for questions 6\u20138.");
    expect(screen.getAllByTestId("free-check-locked-row")).toHaveLength(3);
  });

  it("a blank first row is skipped like the server does: the first GRADABLE row is sent and the blank one is never listed", async () => {
    flagOn();
    detectRows([
      { questionNumber: 1, questionText: "   " },
      { questionNumber: 2, questionText: "Second real question" },
      { questionNumber: 3, questionText: "Third real question" },
    ]);
    H.gradeWorksheet.mockResolvedValue(oneResult(2));
    const { container } = renderPage();
    await readQuestion();
    const grade = await uploadAnswerSheet(container);
    expect(screen.getByTestId("free-check-oneq-line").textContent).toContain("marks question 2.");
    await waitFor(() => expect(grade).not.toBeDisabled());
    fireEvent.click(grade);
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    expect((H.gradeWorksheet.mock.calls[0][0].questions as Array<{ qNumber: number }>).map((q) => q.qNumber)).toEqual([2]);
    await screen.findByTestId("free-check-locked");
    expect(screen.getAllByTestId("free-check-locked-row").map((r) => r.textContent)).toEqual(["Q3Third real questionLocked"]);
  });

  it("old client / kill switch: a server cut to Q2 never lists the graded question as locked", async () => {
    flagOn();
    vi.stubEnv("VITE_FREE_CHECK_ONE_QUESTION_DISABLED", "1");
    detectRows([1, 2, 3].map((n) => ({ questionNumber: n, questionText: `Row ${n} text` })));
    H.gradeWorksheet.mockResolvedValue({ ...oneResult(2), freeCheckGradedOf: { graded: 1, total: 3 } });
    const { container } = renderPage();
    await readQuestion();
    const grade = await uploadAnswerSheet(container);
    await waitFor(() => expect(grade).not.toBeDisabled());
    fireEvent.click(grade);
    await screen.findByTestId("free-check-locked");
    expect(screen.getAllByTestId("free-check-locked-row").map((r) => r.textContent)).toEqual(["Q1Row 1 textLocked", "Q3Row 3 textLocked"]);
  });
});

describe("FREECHECK-ONEQ-1 - a SIGNED-IN multi-question upload is unchanged", () => {
  it("sends all 3 questions, shows no locked rows and no pre-grade notice", async () => {
    flagOff();
    H.auth = { user: SIGNED_IN, loading: false };
    H.sub.isPremium = true;
    detectThree();
    H.gradeWorksheet.mockResolvedValue({
      ...ONE_RESULT,
      results: [1, 2, 3].map((n) => ({ ...ONE_RESULT.results[0], qNumber: n })),
      totalQuestions: 3, gradedCount: 3,
    });
    const { container } = renderPage();
    await readQuestion();
    const grade = await uploadAnswerSheet(container);
    expect(screen.queryByTestId("free-check-oneq-line")).toBeNull();
    await waitFor(() => expect(grade).not.toBeDisabled());
    fireEvent.click(grade);
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    expect((H.gradeWorksheet.mock.calls[0][0].questions as unknown[]).length).toBe(3);
    await waitFor(() => expect(container.textContent).toMatch(/3\/3 graded/));
    expect(screen.queryByTestId("free-check-locked")).toBeNull();
  });
});
