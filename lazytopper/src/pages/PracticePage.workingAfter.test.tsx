// QP-WORKING-AFTER-1 — the owner's design (23 Oct 22:48 IST) on the REAL Quick Practice page.
//
// Owner live test (23 Oct, prod 190d8271): working typed in a box but never SAVED was silently
// dropped at "Finish session". The owner's design:
//   1. FINISH GATE — Finish with written (subjective) questions that have no saved working shows a
//      gate first: those questions, each with its answer box in place, and "Skip — show my
//      scorecard". Saving there is the set's ordinary save → normal grading → recorded as usual.
//      Skip shows the scorecard at once. One gate per Finish, never a loop.
//   2. ZIGGY SAVE NUDGE — typed / attached but not saved: "Don't forget to save your answer!" with
//      a Save button, in place; gone on Save; Hide mascots → the same line as plain text.
//   3. No post-scorecard grading path ("Check this working" is gone).
//   4. Kept: the same working is never graded twice; an MCQ tap keeps its mark when working is added.
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

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";
import { __setGuideAbForTests } from "../components/guide/guideVariant";
import { __resetMascotsForTests, hideMascots } from "../components/guide/mascotsMute";
import { SAVE_NUDGE_COPY, SAVE_NUDGE_IDLE_MS, __resetSaveNudgeForTests } from "../components/guide/saveNudge/saveNudge";
import { FINISH_GATE_COPY } from "../components/practice/FinishGate";
import { __resetStageForTests } from "../components/guide/scoreGuideStage";

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

const card = (n: number) => document.querySelector(`[data-testid="practice-question-card"][data-question-id="q-${n}"]`) as HTMLElement;
const gate = () => screen.queryByTestId("qp-finish-gate");
const gateItem = (n: number) => document.querySelector(`[data-testid="qp-gate-item"][data-question-id="q-${n}"]`) as HTMLElement;
const finish = () => fireEvent.click(screen.getByRole("button", { name: /Finish session/i }));
const backToSet = async () =>
  fireEvent.click(await screen.findByRole("button", { name: (n: string) => n.includes("Back to this set") }));
const lastBatchArgs = () => batchSpy.mock.calls[batchSpy.mock.calls.length - 1][0] as BatchArgs;
const wait = (ms: number) => act(async () => new Promise((r) => setTimeout(r, ms)));

/** Type working in a box (`root`: a set card or a gate row); `save` taps "Save my answer". */
async function typeIn(root: HTMLElement, text: string, save: boolean) {
  const open = within(root).queryByRole("button", { name: /^Answer this question$/ });
  if (open) fireEvent.click(open);
  await waitFor(() => expect(within(root).getAllByRole("tab", { name: "Type my working" }).length).toBeGreaterThan(0));
  fireEvent.click(within(root).getByRole("tab", { name: "Type my working" }));
  await act(async () => {
    fireEvent.change(within(root).getByLabelText("Type your working and answer"), { target: { value: text } });
  });
  if (save) {
    fireEvent.click(within(root).getByTestId("qp-save-answer"));
    await within(root).findByTestId("qp-saved-confirmation");
  }
}
const miWritesFor = (id: string) =>
  recordMistakeSpy.mock.calls.filter((c) => ((c as unknown[])[2] as { questionId?: string } | undefined)?.questionId === id).length;

beforeEach(() => {
  authUser.current = STUDENT;
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetMascotsForTests();
  __resetStageForTests();
  __resetSaveNudgeForTests();
  __setGuideAbForTests(true, "guide");
  recordAttemptSpy.mockClear();
  recordMistakeSpy.mockClear();
  batchSpy.mockClear();
});
afterEach(() => {
  cleanup();
  mockBuild.mockReset();
  gradeWorksheet.mockReset();
  setMatchMediaMatches(false);
  __setGuideAbForTests(null);
});

describe("QP-WORKING-AFTER-1 · the Finish gate", () => {
  it("★★ Finish with a written question that has NO working: the gate lists it (not the MCQ), with its box in place", async () => {
    await buildSet([mkItem(1, false), mkItem(2, true)]);
    fireEvent.click(screen.getByText("q2-correct"));
    finish();
    const g = await screen.findByTestId("qp-finish-gate");
    expect(g.getAttribute("role")).toBe("dialog");
    expect(within(g).getByText(FINISH_GATE_COPY.title)).toBeInTheDocument();
    expect(Array.from(g.querySelectorAll('[data-testid="qp-gate-item"]')).map((e) => e.getAttribute("data-question-id"))).toEqual(["q-1"]);
    expect(within(gateItem(1)).getAllByRole("tab", { name: "Type my working" }).length).toBeGreaterThan(0);
    expect(within(g).getByTestId("qp-gate-skip").textContent).toBe(FINISH_GATE_COPY.skip);
    expect(screen.queryByRole("dialog", { name: "Session scorecard" })).toBeNull(); // not yet
  }, 60_000);

  it("★★ typed in the set but NOT saved: the gate shows it with the save nudge; Save there → graded and RECORDED once", async () => {
    gradeWorksheet.mockResolvedValue(batch([grade(1, 3, 2, "calculation")]));
    await buildSet([mkItem(1, false), mkItem(2, true)]);
    fireEvent.click(screen.getByText("q2-correct"));
    await typeIn(card(1), "x + 2 = 5 so x = 4", false);
    finish();
    const row = gateItem(1);
    expect(within(row).getByText(FINISH_GATE_COPY.draftNote)).toBeInTheDocument();
    const nudge = within(row).getByTestId("save-nudge");
    expect(within(nudge).getByTestId("save-nudge-save").textContent).toBe(SAVE_NUDGE_COPY.save);
    fireEvent.click(within(nudge).getByTestId("save-nudge-save"));
    fireEvent.click(await screen.findByTestId("qp-gate-continue"));
    expect(gate()).toBeNull();
    fireEvent.click(await screen.findByTestId("qp-grade-batch", {}, { timeout: 8000 }));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    const sent = gradeWorksheet.mock.calls[0][0] as { questions: Array<{ qNumber: number }> };
    expect(sent.questions.map((q) => q.qNumber)).toEqual([1]);
    expect(lastBatchArgs().record).toBeUndefined(); // recorded as usual
    await waitFor(() => expect(miWritesFor("q-1")).toBe(1));
    expect(screen.queryByText(/Review attempt/)).toBeNull();
  }, 60_000);

  it("★★ nothing written: typed and saved IN the gate → graded and recorded once", async () => {
    gradeWorksheet.mockResolvedValue(batch([grade(1, 3, 2, "calculation")]));
    await buildSet([mkItem(1, false), mkItem(2, true)]);
    fireEvent.click(screen.getByText("q2-correct"));
    finish();
    await screen.findByTestId("qp-finish-gate");
    await typeIn(gateItem(1), "x = 4", true);
    fireEvent.click(screen.getByTestId("qp-gate-continue"));
    fireEvent.click(await screen.findByTestId("qp-grade-batch", {}, { timeout: 8000 }));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(miWritesFor("q-1")).toBe(1));
  }, 60_000);

  it("★★ Skip shows the scorecard at once (nothing graded); the next Finish never re-opens the gate", async () => {
    await buildSet([mkItem(1, false), mkItem(2, true), mkItem(3, true)]);
    fireEvent.click(screen.getByText("q2-correct"));
    finish();
    fireEvent.click(await screen.findByTestId("qp-gate-skip"));
    expect(gate()).toBeNull();
    await screen.findByRole("dialog", {}, { timeout: 8000 });
    expect(screen.queryByTestId("qp-grade-batch")).toBeNull();
    expect(gradeWorksheet).not.toHaveBeenCalled();
    await backToSet();
    await waitFor(() => expect(card(1)).toBeTruthy());
    finish();
    await screen.findByRole("dialog", {}, { timeout: 8000 });
    expect(gate()).toBeNull(); // one gate per Finish, never a loop
  }, 60_000);

  it("CONTROL: every written question already saved → no gate", async () => {
    await buildSet([mkItem(1, false), mkItem(2, true), mkItem(3, true)]);
    await typeIn(card(1), "x = 4", true);
    finish();
    await screen.findByTestId("qp-confirm", {}, { timeout: 8000 });
    expect(gate()).toBeNull();
  }, 60_000);
});

describe("QP-WORKING-AFTER-1 · the save nudge", () => {
  it("★★ typed, not saved: after a pause Ziggy says 'Don't forget to save your answer!'; its Save saves; then it is gone", async () => {
    await buildSet([mkItem(1, false), mkItem(2, true)]);
    await typeIn(card(1), "x = 4", false);
    expect(within(card(1)).queryByTestId("save-nudge")).toBeNull(); // not on the keystroke
    await wait(SAVE_NUDGE_IDLE_MS + 200);
    const nudge = within(card(1)).getByTestId("save-nudge");
    expect(nudge.getAttribute("data-kind")).toBe("ziggy");
    expect(within(nudge).getByTestId("save-nudge-line").textContent).toBe(SAVE_NUDGE_COPY.ziggy);
    fireEvent.click(within(nudge).getByTestId("save-nudge-save"));
    await within(card(1)).findByTestId("qp-saved-confirmation");
    expect(within(card(1)).queryByTestId("save-nudge")).toBeNull();
  }, 60_000);

  it("★★ Hide mascots: the SAME reminder and Save, as plain text (no character)", async () => {
    hideMascots();
    await buildSet([mkItem(1, false), mkItem(2, true)]);
    await typeIn(card(1), "x = 4", false);
    await wait(SAVE_NUDGE_IDLE_MS + 200);
    const nudge = within(card(1)).getByTestId("save-nudge");
    expect(nudge.getAttribute("data-kind")).toBe("plain");
    expect(within(nudge).getByTestId("save-nudge-line").textContent).toBe(SAVE_NUDGE_COPY.plain);
    expect(nudge.querySelector('[data-testid^="blob-"]')).toBeNull();
    fireEvent.click(within(nudge).getByTestId("save-nudge-save"));
    await within(card(1)).findByTestId("qp-saved-confirmation");
  }, 60_000);

  it("★ two unsaved answers at once: ONE Ziggy, the other reminder is plain text", async () => {
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, true)]);
    await typeIn(card(1), "x = 4", false);
    await typeIn(card(2), "y = 5", false);
    await wait(SAVE_NUDGE_IDLE_MS + 200);
    const kinds = Array.from(document.querySelectorAll('[data-testid="save-nudge"]')).map((n) => n.getAttribute("data-kind"));
    expect(kinds.sort()).toEqual(["plain", "ziggy"]);
  }, 60_000);
});

describe("QP-WORKING-AFTER-1 · no grading after the scorecard; never twice; MCQ marks kept", () => {
  it("★★ after a graded set: no 'Check this working' anywhere, and Back to this set → Finish offers no second grade", async () => {
    gradeWorksheet.mockResolvedValueOnce(batch([grade(1, 3, 2, "calculation")]));
    await buildSet([mkItem(1, false), mkItem(2, true)]);
    fireEvent.click(screen.getByText("q2-wrong"));
    await typeIn(card(1), "x = 4", true);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch", {}, { timeout: 8000 }));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    await screen.findByText(/^Question 1$/);
    await waitFor(() => expect(miWritesFor("q-1")).toBe(1));
    await backToSet();
    await waitFor(() => expect(card(1)).toBeTruthy());
    expect(screen.queryByText(/Check this working/)).toBeNull();
    finish();
    await screen.findByText(/^Question 1$/, {}, { timeout: 8000 });
    expect(screen.queryByTestId("qp-grade-batch")).toBeNull();
    expect(screen.queryByText(/Check this working/)).toBeNull();
    expect(gradeWorksheet).toHaveBeenCalledTimes(1);
    expect(miWritesFor("q-1")).toBe(1);
  }, 90_000);

  it("★★ an MCQ tapped before Finish keeps its mark when working is added afterwards (3 / 5, never 3 / 4)", async () => {
    gradeWorksheet.mockResolvedValue(batch([grade(2, 1, 1, "silly")]));
    await buildSet([mkItem(1, true), mkItem(2, true), mkItem(3, true), mkItem(4, true), mkItem(5, true)]);
    for (const n of [1, 2, 3, 4, 5]) fireEvent.click(screen.getByText(n === 2 || n === 4 ? `q${n}-wrong` : `q${n}-correct`));
    const f = screen.queryByRole("button", { name: /Finish session/i });
    if (f) fireEvent.click(f);
    await screen.findByRole("dialog", {}, { timeout: 10000 });
    const hero = () => document.querySelector(".lt-sc__big")?.textContent ?? "";
    await waitFor(() => expect(hero()).toBe("3 / 5"));
    await backToSet();
    await waitFor(() => expect(card(2)).toBeTruthy());
    await typeIn(card(2), "I thought the sign stays", true);
    finish();
    const grade1 = screen.queryByTestId("qp-grade-batch");
    if (grade1) {
      fireEvent.click(grade1);
      await waitFor(() => expect(gradeWorksheet).toHaveBeenCalled());
    }
    await screen.findByRole("dialog", {}, { timeout: 8000 });
    await waitFor(() => expect(hero()).toBe("3 / 5"));
    expect(recordMistakeSpy).not.toHaveBeenCalled(); // after the scorecard: never recorded
  }, 90_000);
});
