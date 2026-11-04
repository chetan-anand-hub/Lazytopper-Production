/**
 * TUTOR-RETURN-SHEET-1 - the whole-paper Answer Checker grade persists the detected question texts
 * WITH its per-question payload (additive `questionTexts`, one per result row, aligned), through the
 * REAL persist path (DesktopCheckImprovePage -> persistCheckImproveSession -> writeSessionPerQuestion).
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
  return { ...actual, recordMistake: () => Promise.resolve({ outcome: "logged", bridged: false }) };
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
import DesktopCheckImprovePage from "./DesktopCheckImprovePage";

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


import { getSessionPerQuestion } from "../../services/sessionRecords";

async function typeAndReadQuestion(text = "Prove that root 2 is irrational.") {
  fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: text } });
  const before = H.detectQuestion.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: /(Re-read|Read) the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(before + 1));
  await act(async () => {});
}

function typeAnswer(value: string) {
  fireEvent.click(screen.getByRole("button", { name: "Type answer" }));
  fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value } });
}

async function clickGrade() {
  const grade = await screen.findByRole("button", { name: /Grade my answer|Retry grading/ });
  await waitFor(() => expect(grade).not.toBeDisabled());
  fireEvent.click(grade);
}


beforeEach(() => {
  window.localStorage.clear();
  H.auth = { user: SIGNED_IN, loading: false };
  H.sub.isPremium = true;
  H.detectQuestion.mockReset().mockResolvedValue(DETECTED);
  H.checkSolutionImage.mockReset().mockResolvedValue(GRADED);
  H.gradeWorksheet.mockReset().mockResolvedValue(PAPER_GRADED);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TUTOR-RETURN-SHEET-1 - the persisted Answer Checker payload carries the question texts", () => {
  it("a 2-question paper stores two aligned texts", async () => {
    H.detectQuestion.mockImplementation(async (req: { question?: string }) =>
      req.question === "Q-A" || req.question === "Q-B"
        ? { ok: true, detectedTopic: null, detectedSubject: null }
        : TWO_QUESTIONS,
    );
    const { container } = render(page());
    await typeAndReadQuestion("Two questions");
    const answerInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(answerInput, { target: { files: [new File(["png-bytes"], "answers.png", { type: "image/png" })] } });
    await clickGrade();
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    await waitFor(async () => {
      const payload = await getSessionPerQuestion("u1", "ci:CI-M-REAL-02");
      expect(payload?.questionTexts).toEqual(["Q-A", "Q-B"]);
      expect(payload?.response.results).toHaveLength(2);
    });
  });
});
