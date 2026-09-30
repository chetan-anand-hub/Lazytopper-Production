/**
 * FUNNEL-EVENTS-1 — the three Check & Improve funnel counts, on the REAL page.
 *
 *   check_question_read  — a read of the question succeeded (setConfirmed)
 *   check_answer_added   — an accepted answer file, or a typed answer becoming non-empty
 *   check_graded         — a result is shown (single: setResult; whole paper: setWsResult)
 *
 * Each at most ONCE per question attempt; a successful read of DIFFERENT question input
 * starts a new attempt. The only thing sent is the bare event name, through
 * `trackNamedEvent` (spied here — every other analytics export is the real one).
 *
 * Only the network edges are stubbed: the three grading calls (spies on the real aiClient
 * module), the account writes a signed-in grade makes, and /api/usage/me (a 404 → no
 * fair-use snapshot → grading is not metered).
 *
 * Mutations this file turns RED (applied one at a time, seen red, restored — lane report):
 *   M1 `check_graded` fired on every render
 *   M2 a payload sent with the event name
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

/** Every funnel event sent so far, in order (other named events are not ours). */
const funnelSent = () =>
  H.track.mock.calls.map((c) => c[0] as string).filter((n) => FUNNEL.includes(n));
const count = (name: string) => funnelSent().filter((n) => n === name).length;

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

const ANSWER = "Let root 2 = p/q in lowest terms, then 2q^2 = p^2 ...";

beforeEach(() => {
  window.localStorage.clear();
  H.auth = { user: SIGNED_IN, loading: false };
  H.sub.isPremium = true;
  H.detectQuestion.mockReset().mockResolvedValue(DETECTED);
  H.checkSolutionImage.mockReset().mockResolvedValue(GRADED);
  H.gradeWorksheet.mockReset().mockResolvedValue(PAPER_GRADED);
  H.track.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FUNNEL-EVENTS-1 — signed-in check, single question", () => {
  it("each event fires ONCE on its own step, in order, with the bare name as the whole payload", async () => {
    render(page());
    expect(funnelSent()).toEqual([]);

    await typeAndReadQuestion();
    expect(funnelSent()).toEqual([READ]);

    typeAnswer("L");
    await waitFor(() => expect(funnelSent()).toEqual([READ, ADDED]));
    typeAnswer(ANSWER); // more typing is the same answer, not a new one
    await act(async () => {});
    expect(funnelSent()).toEqual([READ, ADDED]);

    await clickGrade();
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(funnelSent()).toEqual([READ, ADDED, GRADED_EVENT]));

    // E1/E3 — every call is trackNamedEvent(name): one argument, nothing else.
    const ours = H.track.mock.calls.filter((c) => FUNNEL.includes(c[0] as string));
    expect(ours).toEqual([[READ], [ADDED], [GRADED_EVENT]]);
  });

  it("no double-count: re-renders, a re-read of the SAME question, and a re-grade send nothing new", async () => {
    const view = render(page());
    await typeAndReadQuestion();
    typeAnswer(ANSWER);
    await clickGrade();
    await waitFor(() => expect(count(GRADED_EVENT)).toBe(1));

    // Re-render the same tree several times.
    for (let i = 0; i < 3; i += 1) view.rerender(page());
    await act(async () => {});
    expect(funnelSent()).toEqual([READ, ADDED, GRADED_EVENT]);

    // Re-grade: back to the form, a different answer, grade again (same question).
    fireEvent.click(screen.getAllByRole("button", { name: /Grade another/ })[0]);
    typeAnswer(`${ANSWER} therefore p is even.`);
    await clickGrade();
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(2));
    await act(async () => {});

    // Back to the form again, and re-read the SAME question text.
    fireEvent.click(screen.getAllByRole("button", { name: /Grade another/ })[0]);
    await typeAndReadQuestion();
    expect(H.detectQuestion).toHaveBeenCalledTimes(2);
    expect(funnelSent()).toEqual([READ, ADDED, GRADED_EVENT]);
  });

  it("a NEW question resets the counters: its read, answer and grade each count once more", async () => {
    render(page());
    await typeAndReadQuestion();
    typeAnswer(ANSWER);
    await clickGrade();
    await waitFor(() => expect(count(GRADED_EVENT)).toBe(1));

    fireEvent.click(screen.getAllByRole("button", { name: /Grade another/ })[0]);
    await typeAndReadQuestion("Show that 5 - root 3 is irrational.");
    // The answer is already on the page, so the new attempt's answer counts at its read.
    await waitFor(() => expect(funnelSent()).toEqual([READ, ADDED, GRADED_EVENT, READ, ADDED]));
    await clickGrade();
    await waitFor(() =>
      expect(funnelSent()).toEqual([READ, ADDED, GRADED_EVENT, READ, ADDED, GRADED_EVENT]),
    );
  });

  it("an answer given BEFORE the read counts at the read, so the steps stay in order", async () => {
    render(page());
    typeAnswer(ANSWER);
    await act(async () => {});
    expect(funnelSent()).toEqual([]);
    await typeAndReadQuestion();
    await waitFor(() => expect(funnelSent()).toEqual([READ, ADDED]));
  });

  it("failures send nothing: a read the grader could not do, a thrown read, a failed grade", async () => {
    render(page());
    H.detectQuestion.mockResolvedValueOnce({ ok: false, error: "unreadable" });
    await typeAndReadQuestion();
    await waitFor(() => expect(document.body.textContent).toContain("unreadable"));
    H.detectQuestion.mockRejectedValueOnce(new Error("network"));
    await typeAndReadQuestion();
    await waitFor(() =>
      expect(document.body.textContent).toContain("We couldn't read the question — please try again."),
    );
    typeAnswer(ANSWER);
    await act(async () => {});
    expect(funnelSent()).toEqual([]); // no read yet → no attempt → nothing

    await typeAndReadQuestion(); // succeeds
    await waitFor(() => expect(funnelSent()).toEqual([READ, ADDED]));

    H.checkSolutionImage.mockResolvedValueOnce({ ok: false, error: "blurry" });
    await clickGrade();
    await waitFor(() => expect(document.body.textContent).toContain("Grading unavailable — blurry"));
    H.checkSolutionImage.mockRejectedValueOnce(new Error("network"));
    await clickGrade();
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(2));
    await act(async () => {});
    expect(funnelSent()).toEqual([READ, ADDED]); // no result shown → no check_graded

    await clickGrade(); // the retry succeeds
    await waitFor(() => expect(funnelSent()).toEqual([READ, ADDED, GRADED_EVENT]));
  });

  it("an answer FILE counts once it is accepted; a refused file sends nothing", async () => {
    const { container } = render(page());
    await typeAndReadQuestion();
    const answerInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;

    fireEvent.change(answerInput, {
      target: { files: [new File(["gif"], "answer.gif", { type: "image/gif" })] },
    });
    await act(async () => {});
    expect(funnelSent()).toEqual([READ]);

    fireEvent.change(answerInput, {
      target: { files: [new File(["png-bytes"], "answer.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(funnelSent()).toEqual([READ, ADDED]));
  });
});

describe("FUNNEL-EVENTS-1 — whole paper (the multi-question grade)", () => {
  it("read → added → graded, once each, when the paper's result is shown", async () => {
    H.detectQuestion.mockImplementation(async (req: { question?: string }) =>
      req.question === "Q-A" || req.question === "Q-B"
        ? { ok: true, detectedTopic: null, detectedSubject: null }
        : TWO_QUESTIONS,
    );
    const { container } = render(page());
    await typeAndReadQuestion("Two questions");
    const answerInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(answerInput, {
      target: { files: [new File(["png-bytes"], "answers.png", { type: "image/png" })] },
    });
    await clickGrade();
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(funnelSent()).toEqual([READ, ADDED, GRADED_EVENT]));
  });
});

describe("FUNNEL-EVENTS-1 — the signed-out free check", () => {
  it("fires all three, once each, bare names only", async () => {
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    H.auth = { user: null, loading: false };
    H.sub.isPremium = false;
    render(page());
    await typeAndReadQuestion();
    expect(H.detectQuestion.mock.calls[0][1]).toEqual({ freeCheck: true });
    typeAnswer(ANSWER);
    await clickGrade();
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(funnelSent()).toEqual([READ, ADDED, GRADED_EVENT]));
    const ours = H.track.mock.calls.filter((c) => FUNNEL.includes(c[0] as string));
    expect(ours).toEqual([[READ], [ADDED], [GRADED_EVENT]]);
  });
});

describe("FUNNEL-EVENTS-1 — out of scope surfaces send nothing", () => {
  it("the tutor overlay (same component, another surface) sends none of the three", async () => {
    render(page({ overlay: { onClose: vi.fn() } }));
    await typeAndReadQuestion();
    typeAnswer(ANSWER);
    await clickGrade();
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(funnelSent()).toEqual([]);
  });
});
