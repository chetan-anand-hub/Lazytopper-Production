// PRACTICE-HONESTY-1 — the REAL PracticePage (the one host every practice surface routes
// into: Practice, Quick Practice, chapter, Topic Hub, CBQ sets, the tutor overlay).
//
//   §1  steps are LOCKED until the question is answered (MCQ pick, saved working) or the
//       session is finished; unlocking one question unlocks ONLY that question.
//   §2  after Finish, "Back to this set (see the steps)" is ALWAYS offered and reopens the
//       SAME set with every step unlocked — on the MCQ-only scorecard, the confirm card and
//       the graded sheet. (D35: there is no Quick Practice history card; FU-QP-HISTORY-REVIEW.)
//   §5  the confirm card on the Chapter Test / Full Mock model: big number = MCQ marks,
//       the owner's one line, "Check my written answers", then "Back to this set".
//       MCQ-only: the marks + the review button only. Empty: unchanged.
//
// ★ ONE router (the seed-location harness of PracticePage.batchGrading.test.tsx).

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "student-1", isLocalSession: false, email: "s@x.com" },
    loading: false,
    getToken: async () => "tok",
  }),
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
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: () => "recorded",
}));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, writeSessionRecord: () => "recorded", writeSessionPerQuestion: () => {} };
});

const { gradeWorksheet } = vi.hoisted(() => ({ gradeWorksheet: vi.fn() }));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, gradeWorksheet, checkSolutionImage: vi.fn() };
});
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return { ...actual, sessionRotationOffset: () => 0 };
});
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn() };
});

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";
import { STEPS_LOCKED_COPY } from "../components/practice/StepsLockedNote";

const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;

const BACK_TO_SET = "Back to this set (see the steps)";
const CHECK_CTA = "Check my written answers";
const ONE_LINE = "Your MCQs are scored. Get your written answers checked for the full result.";

/** An MCQ (correct = option 0) or a written question; pre-written steps, so "Show steps"
 *  never needs the network. */
function mkItem(n: number, withOptions: boolean): PQ {
  const base = {
    id: `q-${n}`,
    questionText: `Question ${n}: solve it.`,
    marks: withOptions ? 1 : 3,
    section: withOptions ? "A" : "C",
    format: withOptions ? "mcq" : "vsa",
    difficulty: "Easy",
    subtopic: "seed",
    topicKey: "real-numbers",
    solutionSteps: [`Step one of question ${n}.`, `Step two of question ${n}.`],
    finalAnswer: `answer-${n}`,
  };
  return (withOptions
    ? { ...base, options: [`q${n}-correct`, `q${n}-wrong`, `q${n}-c`, `q${n}-d`], answer: `q${n}-correct` }
    : base) as unknown as PQ;
}

const okGrade = (qNumber: number) => ({
  qNumber, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 2, percentage: 67,
  annotatedSteps: [{
    stepNumber: 1, description: "Substitute", studentWork: "x", status: "incorrect", marksAwarded: 0,
    marksDeducted: 1, teacherAnnotation: "Off by one.", mistakeType: "calculation", correctedWorking: null,
  }],
  mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
  teacherNote: "Method correct throughout.",
});
const okBatch = (results: ReturnType<typeof okGrade>[]) => ({
  ok: true, results, totalQuestions: results.length, gradedCount: results.length, pendingCount: 0,
  gradedMarksAwarded: results.reduce((s, r) => s + r.marksAwarded, 0),
  gradedMarksTotal: results.reduce((s, r) => s + r.totalMarks, 0),
  worksheetTotalMarks: results.reduce((s, r) => s + r.totalMarks, 0),
});

afterEach(() => {
  cleanup();
  mockBuild.mockReset();
  gradeWorksheet.mockReset();
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

const cards = () => screen.getAllByTestId("practice-question-card");
const lockedNotes = (el: HTMLElement | Document = document) =>
  Array.from(el.querySelectorAll('[data-testid="steps-locked-note"]'));
const showStepsIn = (card: HTMLElement) => within(card).queryByRole("button", { name: /^(Show|Hide) steps$/ });
const finish = () => fireEvent.click(screen.getByRole("button", { name: /Finish session/i }));

/** Save typed working on question `n` (collect mode — no API call). */
async function saveTypedFor(n: number) {
  const triggers = () => screen.getAllByRole("button", { name: /^(Answer this question|Hide answer box)$/ });
  fireEvent.click(triggers()[n - 1]);
  const tabs = screen.getAllByRole("tab", { name: "Type my working" });
  fireEvent.click(tabs[tabs.length - 1]);
  const boxes = screen.getAllByLabelText("Type your working and answer");
  await act(async () => {
    fireEvent.change(boxes[boxes.length - 1], { target: { value: "x = 4" } });
  });
  fireEvent.click(await screen.findByTestId("qp-save-answer"));
  await screen.findByTestId("qp-saved-confirmation");
  fireEvent.click(triggers()[n - 1]);
}

function expectAllUnlocked() {
  expect(lockedNotes()).toHaveLength(0);
  for (const c of cards()) expect(showStepsIn(c)).not.toBeNull();
}

describe("PRACTICE-HONESTY-1 §1 · steps locked until answered (PracticePage)", () => {
  it("★★ a fresh set: EVERY card shows the lock note, no card offers Show steps, no steps render", async () => {
    await buildSet([mkItem(1, true), mkItem(2, false), mkItem(3, true)]);
    expect(cards()).toHaveLength(3);
    for (const c of cards()) {
      expect(within(c).getByTestId("steps-locked-note").textContent).toContain(STEPS_LOCKED_COPY);
      expect(showStepsIn(c)).toBeNull();
    }
    expect(document.body.textContent).not.toContain("Step one of question");
    expect(document.body.textContent).toContain(
      "Try it first: answer this question (or finish the session) to see the steps.",
    );
  });

  it("★★ an MCQ pick unlocks THAT question only (CONTROL: the others stay locked)", async () => {
    await buildSet([mkItem(1, true), mkItem(2, true), mkItem(3, false)]);
    fireEvent.click(screen.getByText("q1-wrong"));
    await waitFor(() => expect(showStepsIn(cards()[0])).not.toBeNull());
    expect(within(cards()[0]).queryByTestId("steps-locked-note")).toBeNull();
    expect(within(cards()[1]).getByTestId("steps-locked-note")).toBeInTheDocument();
    expect(within(cards()[2]).getByTestId("steps-locked-note")).toBeInTheDocument();
    // …and the unlocked steps really open.
    fireEvent.click(showStepsIn(cards()[0])!);
    expect(await screen.findByText(/Step one of question 1\./)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Step one of question 2.");
  });

  it("★ saved written working unlocks that question (collect mode)", async () => {
    await buildSet([mkItem(1, false), mkItem(2, false)]);
    await saveTypedFor(1);
    expect(showStepsIn(cards()[0])).not.toBeNull();
    expect(within(cards()[1]).getByTestId("steps-locked-note")).toBeInTheDocument();
  });
});

describe("PRACTICE-HONESTY-1 §2 + §5 · Finish → scorecard → Back to this set", () => {
  it("★★ MCQ-only: the scorecard shows JUST the MCQ marks + 'Back to this set', which reopens with every step unlocked", async () => {
    await buildSet([mkItem(1, true), mkItem(2, true), mkItem(3, true)]);
    fireEvent.click(screen.getByText("q1-correct"));
    fireEvent.click(screen.getByText("q2-wrong"));
    finish();
    const back = await screen.findByRole("button", { name: new RegExp(BACK_TO_SET.replace(/[()]/g, "\\$&")) });
    // Just the marks + the review button: no confirm card, no CTA to check written answers,
    // no Chapter Test / fresh-set menu.
    expect(screen.queryByTestId("qp-confirm")).toBeNull();
    expect(screen.queryByRole("button", { name: CHECK_CTA })).toBeNull();
    expect(screen.queryByText("Chapter Test")).toBeNull();
    fireEvent.click(back);
    await waitFor(() => expect(cards()).toHaveLength(3));
    expectAllUnlocked();
    // The unanswered q3 opens too — the set is in review.
    fireEvent.click(showStepsIn(cards()[2])!);
    expect(await screen.findByText(/Step one of question 3\./)).toBeInTheDocument();
  });

  it("★★ 'Back to this set' is offered even when EVERY question was attempted", async () => {
    await buildSet([mkItem(1, true), mkItem(2, true)]);
    fireEvent.click(screen.getByText("q1-correct"));
    fireEvent.click(screen.getByText("q2-correct"));
    // Every question attempted ⇒ the scorecard rises on its own (no Finish tap needed).
    const back = await screen.findByRole("button", { name: /Back to this set \(see the steps\)/ });
    fireEvent.click(back);
    // ★ It really goes BACK — `allDone` must not re-raise the scorecard over the list.
    await waitFor(() => expect(cards()).toHaveLength(2));
    expect(screen.queryByRole("button", { name: /Back to this set \(see the steps\)/ })).toBeNull();
    expectAllUnlocked();
    // …and the result stays one tap away.
    finish();
    expect(await screen.findByRole("button", { name: /Back to this set \(see the steps\)/ })).toBeInTheDocument();
  });

  it("★★ written answers: the confirm card is on the CT/FM model and 'Back to this set' reopens unlocked", async () => {
    await buildSet([mkItem(1, true), mkItem(2, false), mkItem(3, false)]);
    fireEvent.click(screen.getByText("q1-correct"));
    await saveTypedFor(2);
    finish();
    const confirm = await screen.findByTestId("qp-confirm");
    // Big number = MCQ marks scored (q1 is a 1-mark MCQ, answered right).
    expect(within(confirm).getByTestId("qp-mcq-marks").textContent).toBe("1 / 1 MCQ mark");
    expect(within(confirm).getByText(ONE_LINE)).toBeInTheDocument();
    const cta = within(confirm).getByTestId("qp-grade-batch");
    expect(cta.textContent).toBe(CHECK_CTA);
    const back = within(confirm).getByTestId("qp-back-to-set");
    expect(back.textContent).toBe(BACK_TO_SET);
    // Order: primary "Check my written answers" THEN "Back to this set".
    expect(cta.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(back);
    await waitFor(() => expect(screen.queryByTestId("qp-confirm")).toBeNull());
    expectAllUnlocked();
  });

  it("★ the graded sheet's 'Back to this set (see the steps)' reopens unlocked too", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false)]);
    await saveTypedFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    const back = await screen.findByRole("button", { name: /Back to this set \(see the steps\)/ });
    fireEvent.click(back);
    await waitFor(() => expect(cards()).toHaveLength(2));
    expectAllUnlocked();
  });

  it("empty session: the honest empty state is unchanged", async () => {
    await buildSet([mkItem(1, true), mkItem(2, false)]);
    finish();
    expect(await screen.findByText(/You finished without attempting any questions yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Keep practicing this set/ })).toBeInTheDocument();
    expect(screen.queryByTestId("qp-confirm")).toBeNull();
  });
});
