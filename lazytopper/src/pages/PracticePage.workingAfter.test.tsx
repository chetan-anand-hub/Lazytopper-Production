// QP-WORKING-AFTER-1 — working a student adds AROUND Finish on the REAL Quick Practice page.
//
// Owner live test (23 Oct, prod 190d8271): all-MCQ set, 2 wrong → scorecard → "Show me the first
// one I missed" → working typed in Q2's box → "Finish session" → the SAME scorecard came back. The
// working was typed but never saved, so Finish silently dropped it: never graded, no mistake type.
//
// Cofounder ruling (23 Oct, consistent with PRACTICE-REVIEW-HONEST-1 / decision 27a):
//   • unsaved working at Finish is SAVED and goes through the normal session grading; on a
//     question whose steps / answer were NOT yet seen it is recorded to MI as usual;
//   • working entered after the scorecard showed the answer (review) is graded and SHOWN
//     ("Checked after you saw the answer …"), NEVER recorded (no MI, no attempt), mark unchanged;
//   • after a graded set, "Check this working" grades that ONE answer through the same path,
//     under the same show-not-record rule; the same working is never graded twice.
//
// ★ The harness of PracticePage.finishReview.test.tsx (real page, real services, the grader mocked).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

const { authUser } = vi.hoisted(() => ({
  authUser: { current: null as null | { uid: string; isLocalSession: boolean; email?: string } },
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: authUser.current, loading: false, getToken: async () => "tok" }),
}));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: true, status: { tier: "premium" }, loading: false }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/adaptivePracticeEngine", () => ({
  computeAdaptiveDifficultyMix: () => undefined,
  getWrongConceptsForTopic: () => [],
  recordWrongAnswer: () => {},
}));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));
const { recordAttemptSpy } = vi.hoisted(() => ({ recordAttemptSpy: vi.fn(() => "recorded") }));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: recordAttemptSpy,
}));
// The Mistake Intelligence front door — a spy (nothing is stored in a test).
const { recordMistakeSpy } = vi.hoisted(() => ({
  recordMistakeSpy: vi.fn(async () => ({ outcome: "saved", bridged: false })),
}));
vi.mock("../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/mistakeIntelligence")>();
  return { ...actual, recordMistake: recordMistakeSpy };
});
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, writeSessionRecord: () => "recorded", writeSessionPerQuestion: () => {} };
});
const { gradeWorksheet } = vi.hoisted(() => ({ gradeWorksheet: vi.fn() }));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, gradeWorksheet, checkSolutionImage: vi.fn() };
});
const { batchSpy } = vi.hoisted(() => ({ batchSpy: vi.fn() }));
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  batchSpy.mockImplementation(actual.gradeQuickPracticeBatch);
  return { ...actual, sessionRotationOffset: () => 0, gradeQuickPracticeBatch: batchSpy };
});
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn() };
});

import PracticePage, { QP_REVIEW_NOTE } from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";

const STUDENT = { uid: "student-wa", isLocalSession: false, email: "s@x.com" };
const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;
type QpService = typeof import("../services/quickPracticeSessionService");
type BatchArgs = Parameters<QpService["gradeQuickPracticeBatch"]>[0];

/** An MCQ (correct = option 0) or a written question; pre-written steps (no network). */
function mkItem(n: number, mcq: boolean): PQ {
  const base = {
    id: `q-${n}`,
    questionText: `Question ${n}: solve it.`,
    marks: mcq ? 1 : 3,
    section: mcq ? "A" : "C",
    format: mcq ? "mcq" : "vsa",
    difficulty: "Easy",
    subtopic: "seed",
    topicKey: "real-numbers",
    solutionSteps: [`Step one of question ${n}.`, `Step two of question ${n}.`],
    finalAnswer: `answer-${n}`,
  };
  return (mcq ? { ...base, options: [`q${n}-correct`, `q${n}-wrong`, `q${n}-c`, `q${n}-d`], answer: `q${n}-correct` } : base) as unknown as PQ;
}

/** A graded row; `total` 1 = an MCQ (the grader even says FULL marks: the local pick must win). */
const grade = (qNumber: number, total: number, awarded: number, type: "silly" | "calculation") => ({
  qNumber, couldNotRead: false, ok: true, totalMarks: total, marksAwarded: awarded,
  percentage: Math.round((awarded / total) * 100),
  annotatedSteps: [{
    stepNumber: 1, description: "Working", studentWork: "x", status: "incorrect", marksAwarded: 0,
    marksDeducted: 1, teacherAnnotation: "Sign copied wrongly.", mistakeType: type, correctedWorking: null,
  }],
  mistakeSummary: { conceptual: 0, calculation: type === "calculation" ? 1 : 0, silly: type === "silly" ? 1 : 0, presentation: 0 },
  teacherNote: "Check the sign.",
});
const batch = (results: ReturnType<typeof grade>[]) => ({
  ok: true, results, totalQuestions: results.length, gradedCount: results.length, pendingCount: 0,
  gradedMarksAwarded: results.reduce((s, r) => s + r.marksAwarded, 0),
  gradedMarksTotal: results.reduce((s, r) => s + r.totalMarks, 0),
  worksheetTotalMarks: results.reduce((s, r) => s + r.totalMarks, 0),
});

async function buildSet(pool: PQ[]) {
  mockBuild.mockResolvedValue(pool);
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[`/practice/10/maths?topic=real-numbers&count=${pool.length}`]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
}

const card = (n: number) => document.querySelector(`[data-question-id="q-${n}"]`) as HTMLElement;
const finish = () => fireEvent.click(screen.getByRole("button", { name: /Finish session/i }));
/** Every question answered opens the scorecard by itself (no Finish button then). */
const finishIfOffered = () => {
  const b = screen.queryByRole("button", { name: /Finish session/i });
  if (b) fireEvent.click(b);
};
const backToSet = async () =>
  fireEvent.click(await screen.findByRole("button", { name: (n: string) => n.includes("Back to this set") }));
const lastBatchArgs = () => batchSpy.mock.calls[batchSpy.mock.calls.length - 1][0] as BatchArgs;

/** Open question `n`'s box and TYPE working — `save` false is the owner's case (never saved). */
async function typeWorking(n: number, text: string, save: boolean) {
  const c = card(n);
  const open = within(c).queryByRole("button", { name: /^Answer this question$/ });
  if (open) fireEvent.click(open);
  await waitFor(() => expect(within(card(n)).getAllByRole("tab", { name: "Type my working" }).length).toBeGreaterThan(0));
  fireEvent.click(within(card(n)).getByRole("tab", { name: "Type my working" }));
  await act(async () => {
    fireEvent.change(within(card(n)).getByLabelText("Type your working and answer"), { target: { value: text } });
  });
  if (save) {
    fireEvent.click(within(card(n)).getByTestId("qp-save-answer"));
    await within(card(n)).findByTestId("qp-saved-confirmation");
  }
}
/** The MI front door, for one question. */
const miWritesFor = (id: string) =>
  recordMistakeSpy.mock.calls.filter((c) => (c as unknown[])[2] && ((c as unknown[])[2] as { questionId?: string }).questionId === id).length;
const attemptsFor = (id: string) =>
  recordAttemptSpy.mock.calls.filter((c) => (c as unknown[])[1] && ((c as unknown[])[1] as { questionId?: string }).questionId === id).length;

beforeEach(() => {
  authUser.current = STUDENT;
  window.localStorage.clear();
  window.sessionStorage.clear();
  recordAttemptSpy.mockClear();
  recordMistakeSpy.mockClear();
  batchSpy.mockClear();
});
afterEach(() => {
  cleanup();
  mockBuild.mockReset();
  gradeWorksheet.mockReset();
  setMatchMediaMatches(false);
});

describe("QP-WORKING-AFTER-1 · unsaved working at Finish", () => {
  it("★★ typed but never saved (not reviewed): Finish SAVES it, it is graded and RECORDED as usual", async () => {
    gradeWorksheet.mockResolvedValue(batch([grade(1, 3, 2, "calculation")]));
    await buildSet([mkItem(1, false), mkItem(2, true)]);
    fireEvent.click(screen.getByText("q2-correct"));
    await typeWorking(1, "x + 2 = 5 so x = 4", false);
    finish();
    // The working was NOT dropped: the confirm card offers to check it.
    fireEvent.click(await screen.findByTestId("qp-grade-batch", {}, { timeout: 8000 }));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    const sent = gradeWorksheet.mock.calls[0][0] as { questions: Array<{ qNumber: number }> };
    expect(sent.questions.map((q) => q.qNumber)).toEqual([1]);
    expect(lastBatchArgs().record).toBeUndefined(); // recorded as usual
    await waitFor(() => expect(miWritesFor("q-1")).toBe(1));
    expect(await screen.findByText(/^Question 1$/)).toBeInTheDocument();
    expect(screen.queryByText(/Review attempt/)).toBeNull();
  }, 60_000);

  it("★★ typed after opening that question's steps: saved and graded, but a review attempt (NOT recorded)", async () => {
    gradeWorksheet.mockResolvedValue(batch([grade(1, 1, 1, "silly")]));
    await buildSet([mkItem(1, true), mkItem(2, true)]);
    fireEvent.click(screen.getByText("q1-wrong"));
    fireEvent.click(await within(card(1)).findByRole("button", { name: /^Show steps$/ }));
    await typeWorking(1, "I picked b", false);
    fireEvent.click(screen.getByText("q2-correct")); // every question answered: the card opens
    finishIfOffered();
    fireEvent.click(await screen.findByTestId("qp-grade-batch", {}, { timeout: 8000 }));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    expect(lastBatchArgs().record).toBe(false);
    expect(await screen.findByTestId("qp-review-note")).toHaveTextContent(QP_REVIEW_NOTE);
    expect(miWritesFor("q-1")).toBe(0);
  }, 60_000);
});

describe("QP-WORKING-AFTER-1 · the owner's loop (all MCQ, 2 wrong → first missed → working → Finish)", () => {
  it("★★ graded and SHOWN (the type appears), NOT recorded (MI writes = 0), the MCQ mark unchanged", async () => {
    // The grader even says FULL marks for the wrong pick: the objective invariant must hold.
    gradeWorksheet.mockResolvedValue(batch([grade(2, 1, 1, "silly")]));
    await buildSet([mkItem(1, true), mkItem(2, true), mkItem(3, true), mkItem(4, true), mkItem(5, true)]);
    for (const n of [1, 2, 3, 4, 5]) fireEvent.click(screen.getByText(n === 2 || n === 4 ? `q${n}-wrong` : `q${n}-correct`));
    const finishBtn = screen.queryByRole("button", { name: /Finish session/i });
    if (finishBtn) fireEvent.click(finishBtn);
    await screen.findByRole("dialog", {}, { timeout: 10000 });
    const hero = () => document.querySelector(".lt-sc__big")?.textContent ?? "";
    await waitFor(() => expect(hero()).toBe("3 / 5"));
    const attemptsBefore = recordAttemptSpy.mock.calls.length;
    // Back to the set (Byte's "first one I missed" does the same), Q2's box, working typed, NOT saved.
    await backToSet();
    await waitFor(() => expect(card(2)).toBeTruthy());
    await typeWorking(2, "I thought the sign stays", false);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch", {}, { timeout: 8000 }));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    expect(lastBatchArgs().record).toBe(false);
    // Shown: Q2's row carries the type, labelled honestly.
    const card2 = await screen.findByText(/Question 2 · Review attempt/);
    expect(card2).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/Silly slip/i);
    expect(screen.getByTestId("qp-review-note")).toHaveTextContent(QP_REVIEW_NOTE);
    // The mark: still 3 / 5 (the working never rescues a wrong pick).
    expect(hero()).toBe("3 / 5");
    // NOT recorded: no MI write, no attempt for the review working.
    expect(recordMistakeSpy).not.toHaveBeenCalled();
    expect(recordAttemptSpy.mock.calls.length).toBe(attemptsBefore);
  }, 90_000);
});

describe("QP-WORKING-AFTER-1 · after a graded set: 'Check this working', and never twice", () => {
  async function gradedSet() {
    gradeWorksheet.mockResolvedValueOnce(batch([grade(1, 3, 2, "calculation")]));
    await buildSet([mkItem(1, false), mkItem(2, true)]);
    fireEvent.click(screen.getByText("q2-wrong"));
    await typeWorking(1, "x = 4", true);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch", {}, { timeout: 8000 }));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    await screen.findByText(/^Question 1$/);
    await waitFor(() => expect(miWritesFor("q-1")).toBe(1));
  }

  it("★★ working added after the grade: the box checks THAT ONE answer (record:false), the scorecard shows it", async () => {
    await gradedSet();
    await backToSet();
    await waitFor(() => expect(card(2)).toBeTruthy());
    await typeWorking(2, "picked b, sign error", true);
    const check = await within(card(2)).findByTestId("qp-check-now");
    expect(check.textContent).toBe("Check this working");
    gradeWorksheet.mockResolvedValueOnce(batch([grade(2, 1, 1, "silly")]));
    fireEvent.click(check);
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(2));
    const sent = gradeWorksheet.mock.calls[1][0] as { questions: Array<{ qNumber: number }> };
    expect(sent.questions.map((q) => q.qNumber)).toEqual([2]); // ONLY the new working
    expect(lastBatchArgs().record).toBe(false);
    // Back on the scorecard, shown with the honest line; Q1's grade untouched; nothing recorded.
    expect(await screen.findByText(/Question 2 · Review attempt/)).toBeInTheDocument();
    expect(screen.getByTestId("qp-review-note")).toHaveTextContent(QP_REVIEW_NOTE);
    expect(screen.getByText(/^Question 1$/)).toBeInTheDocument();
    expect(miWritesFor("q-2")).toBe(0);
    expect(miWritesFor("q-1")).toBe(1);
    expect(attemptsFor("q-2")).toBeLessThanOrEqual(1); // the MCQ tap itself, never the working
  }, 90_000);

  it("★★ the same working is never graded twice: Back to this set → Finish offers no second grade", async () => {
    // A set NOT fully answered (Q3 left), so the graded card offers "Keep practicing this set".
    gradeWorksheet.mockResolvedValueOnce(batch([grade(1, 3, 2, "calculation")]));
    await buildSet([mkItem(1, false), mkItem(2, true), mkItem(3, true)]);
    fireEvent.click(screen.getByText("q2-wrong"));
    await typeWorking(1, "x = 4", true);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch", {}, { timeout: 8000 }));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    await screen.findByText(/^Question 1$/);
    await waitFor(() => expect(miWritesFor("q-1")).toBe(1));
    // The graded card's "Back to this set" (its keep-practicing action): on trunk it DISCARDED the
    // grade, so the next Finish offered to grade the same working again.
    await backToSet();
    await waitFor(() => expect(card(1)).toBeTruthy());
    finish();
    await screen.findByText(/^Question 1$/, {}, { timeout: 8000 });
    expect(screen.queryByTestId("qp-grade-batch")).toBeNull();
    expect(screen.queryByTestId("qp-scorecard-check-now")).toBeNull();
    expect(gradeWorksheet).toHaveBeenCalledTimes(1);
    expect(miWritesFor("q-1")).toBe(1);
  }, 90_000);
});
