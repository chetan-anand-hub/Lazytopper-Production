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

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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
// PRACTICE-REVIEW-HONEST-1 — a passthrough spy (same return as before) so review mode can
// prove an MCQ pick after Finish never reaches the attempts front door.
const { recordAttemptSpy } = vi.hoisted(() => ({ recordAttemptSpy: vi.fn(() => "recorded") }));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: recordAttemptSpy,
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
// PRACTICE-REVIEW-HONEST-1 — passthrough spies (the REAL functions still run) so review
// mode can read the batch's `record` flag and the persisted session entries.
const { batchSpy, persistSpy } = vi.hoisted(() => ({ batchSpy: vi.fn(), persistSpy: vi.fn() }));
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  batchSpy.mockImplementation(actual.gradeQuickPracticeBatch);
  persistSpy.mockImplementation(actual.persistQuickPracticeSession);
  return {
    ...actual,
    sessionRotationOffset: () => 0,
    gradeQuickPracticeBatch: batchSpy,
    persistQuickPracticeSession: persistSpy,
  };
});
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn() };
});

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";
import { STEPS_LOCKED_COPY } from "../components/practice/StepsLockedNote";

authUser.current = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
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
  authUser.current = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
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
    const back = await screen.findByRole("button", { name: (n: string) => n.includes(BACK_TO_SET) });
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

  it("★ written-only: no '0 / 0 MCQ marks' big number (honest empty); the check CTA and 'Back to this set' remain", async () => {
    await buildSet([mkItem(1, false), mkItem(2, false)]);
    await saveTypedFor(1);
    finish();
    const confirm = await screen.findByTestId("qp-confirm");
    expect(within(confirm).queryByTestId("qp-mcq-marks")).toBeNull();
    expect(within(confirm).getByTestId("qp-grade-batch").textContent).toBe(CHECK_CTA);
    expect(within(confirm).getByTestId("qp-back-to-set").textContent).toBe(BACK_TO_SET);
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

const KEY = "lt:qp-guest-score";
const PATH = "/practice/10/maths?topic=real-numbers&count=3";
const GUEST = { uid: "", isLocalSession: true };
const STUDENT = { uid: "student-1", isLocalSession: false, email: "s@x.com" };

function Probe() {
  const loc = useLocation();
  return <div data-testid="login-probe">{String((loc.state as { from?: string } | null)?.from)}</div>;
}

async function mount(overlay?: { onClose: () => void }) {
  mockBuild.mockResolvedValue([mkItem(1, true), mkItem(2, true), mkItem(3, true)]);
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[PATH]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage overlay={overlay} />} />
        <Route path="/login" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
}

/** One right, one wrong, then Finish -> the MCQ-only scorecard. */
async function reachScorecard(overlay?: { onClose: () => void }) {
  await mount(overlay);
  await answerAndFinish();
}

async function answerAndFinish() {
  fireEvent.click(screen.getByText("q1-correct"));
  fireEvent.click(screen.getByText("q2-wrong"));
  fireEvent.click(screen.getByRole("button", { name: /Finish session/i }));
  await screen.findByRole("button", { name: (n: string) => n.includes(BACK_TO_SET) });
}


describe("QP-GUEST-SIGNIN-1 · sign-in card on the signed-out MCQ-only scorecard", () => {
  beforeEach(() => { window.sessionStorage.clear(); authUser.current = GUEST; });
  afterEach(() => { window.sessionStorage.clear(); });
  it("guest sees the card with the exact copy", async () => {
    await reachScorecard();
    const card = await screen.findByTestId("qp-guest-signin-card");
    expect(card.textContent).toContain("Want to keep going?");
    expect(card.textContent).toContain(
      "Sign in free: your practice from now on is saved, and the 7-day trial marks your written answers the way a CBSE examiner does.",
    );
    expect(screen.getByTestId("qp-guest-signin").textContent).toBe("Sign in free");
    expect(screen.getByRole("button", { name: "Not now" })).toBeInTheDocument();
  });

  it("CONTROL: a signed-in student gets no card", async () => {
    authUser.current = STUDENT;
    await reachScorecard();
    expect(screen.queryByTestId("qp-guest-signin-card")).toBeNull();
  });

  it("the scorecard's own review action is still present and works with the card shown", async () => {
    await reachScorecard();
    expect(screen.getByTestId("qp-guest-signin-card")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: (n: string) => n.includes(BACK_TO_SET) }));
    expect(await screen.findAllByTestId("practice-question-card")).toHaveLength(3);
  });

  it("the link goes to /login carrying state.from = pathname+search", async () => {
    await reachScorecard();
    const link = screen.getByTestId("qp-guest-signin");
    expect(link.getAttribute("href")).toBe("/login");
    fireEvent.click(link);
    expect((await screen.findByTestId("login-probe")).textContent).toBe(PATH);
  });

  it("'Not now' hides the card", async () => {
    await reachScorecard();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByTestId("qp-guest-signin-card")).toBeNull();
  });

  it("'Not now' is for THIS set only: after 'Refresh set' the next scorecard asks again", async () => {
    await reachScorecard();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    fireEvent.click(screen.getByRole("button", { name: (n: string) => n.includes(BACK_TO_SET) }));
    fireEvent.click(await screen.findByRole("button", { name: /^Refresh set$/ }));
    await screen.findAllByTestId("practice-question-card");
    await answerAndFinish();
    expect(await screen.findByTestId("qp-guest-signin-card")).toBeInTheDocument();
  });

  it("a guest inside the Tutor overlay gets no card", async () => {
    await reachScorecard({ onClose: () => undefined });
    expect(screen.queryByTestId("qp-guest-signin-card")).toBeNull();
  });

  it("tapping 'Sign in free' stashes exactly one entry with the right numbers", async () => {
    await reachScorecard();
    fireEvent.click(screen.getByTestId("qp-guest-signin"));
    const raw = window.sessionStorage.getItem(KEY);
    expect(window.sessionStorage.length).toBe(1);
    const parsed = JSON.parse(raw!);
    expect(Object.keys(parsed).sort()).toEqual(["at", "attempted", "correct", "path", "total", "v"]);
    expect(parsed).toMatchObject({ v: 1, path: PATH, attempted: 2, correct: 1, total: 3 });
  });
});

describe("QP-GUEST-SIGNIN-1 · restored score for a signed-in arrival", () => {
  beforeEach(() => { window.sessionStorage.clear(); });
  afterEach(() => { window.sessionStorage.clear(); });
  const seed = (over: object = {}) =>
    window.sessionStorage.setItem(
      KEY, JSON.stringify({ v: 1, path: PATH, attempted: 2, correct: 1, total: 3, at: Date.now(), ...over }),
    );

  it("fresh entry for this path shows once and is consumed", async () => {
    authUser.current = STUDENT;
    seed();
    await mount();
    const card = await screen.findByTestId("qp-guest-score-restored");
    expect(card.textContent).toContain("Your set before you signed in: 1 / 2 correct.");
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
    cleanup();
    await mount();
    expect(screen.queryByTestId("qp-guest-score-restored")).toBeNull();
  });

  it.each([
    ["stale", { at: Date.now() - 31 * 60 * 1000 }],
    ["wrong path", { path: "/practice/10/science" }],
  ])("%s entry shows no restored card", async (_n, over) => {
    authUser.current = STUDENT;
    seed(over);
    await mount();
    expect(screen.queryByTestId("qp-guest-score-restored")).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PRACTICE-REVIEW-HONEST-1 (cofounder DECISION 27a, owner-approved; scope 30b) —
// "An answer given after the student has seen the steps is not a real attempt."
// ════════════════════════════════════════════════════════════════════════════
const REVIEW_LINE = "Review mode: answers here aren't added to your score.";
const reviewLine = () => screen.queryByTestId("qp-review-mode-line");
const backToSet = async () =>
  fireEvent.click(await screen.findByRole("button", { name: (n: string) => n.includes(BACK_TO_SET) }));
type QpService = typeof import("../services/quickPracticeSessionService");
type BatchArgs = Parameters<QpService["gradeQuickPracticeBatch"]>[0];
type PersistArgs = Parameters<QpService["persistQuickPracticeSession"]>[0];
const lastBatchArgs = () => batchSpy.mock.calls[batchSpy.mock.calls.length - 1][0] as BatchArgs;
const lastPersisted = () => persistSpy.mock.calls[persistSpy.mock.calls.length - 1][0] as PersistArgs;
const entryFor = (id: string) => lastPersisted().entries.find((e) => e.questionId === id);

describe("PRACTICE-REVIEW-HONEST-1 · review-mode answers are not counted", () => {
  beforeEach(() => {
    authUser.current = STUDENT;
    recordAttemptSpy.mockClear();
    batchSpy.mockClear();
    persistSpy.mockClear();
  });

  it("(a) the muted line shows ONLY in review mode, verbatim", async () => {
    await buildSet([mkItem(1, true), mkItem(2, true)]);
    expect(reviewLine()).toBeNull();
    fireEvent.click(screen.getByText("q1-correct"));
    expect(reviewLine()).toBeNull();
    finish();
    await backToSet();
    await waitFor(() => expect(cards()).toHaveLength(2));
    expect(reviewLine()?.textContent).toBe(REVIEW_LINE);
  });

  it("(b)+(c) an MCQ answered BEFORE Finish counts (CONTROL); one answered in review shows right/wrong but changes no number and records nothing", async () => {
    await buildSet([mkItem(1, true), mkItem(2, true), mkItem(3, false)]);
    fireEvent.click(screen.getByText("q1-correct"));
    await saveTypedFor(3);
    // (c) CONTROL — the pre-Finish pick went through the attempts front door.
    expect(recordAttemptSpy).toHaveBeenCalledTimes(1);
    finish();
    expect((await screen.findByTestId("qp-mcq-marks")).textContent).toBe("1 / 1 MCQ mark");
    fireEvent.click(screen.getByTestId("qp-back-to-set"));
    await waitFor(() => expect(cards()).toHaveLength(3));
    // (b) the review pick: the card still marks it…
    fireEvent.click(screen.getByText("q2-correct"));
    expect(screen.getByText("q2-correct").closest("button")?.getAttribute("aria-pressed")).toBe("true");
    // …but it never reaches recordAttempt / MI…
    expect(recordAttemptSpy).toHaveBeenCalledTimes(1);
    finish();
    // …and the scorecard numbers are unchanged.
    const confirm = await screen.findByTestId("qp-confirm");
    expect(within(confirm).getByTestId("qp-mcq-marks").textContent).toBe("1 / 1 MCQ mark");
    expect(confirm.textContent).toContain("Review attempt");
  });

  it("(b) the MCQ-only scorecard's attempted / correct numbers ignore a review pick", async () => {
    window.sessionStorage.clear();
    authUser.current = GUEST;
    await buildSet([mkItem(1, true), mkItem(2, true), mkItem(3, true)]);
    fireEvent.click(screen.getByText("q1-correct"));
    finish();
    await backToSet();
    await waitFor(() => expect(cards()).toHaveLength(3));
    fireEvent.click(screen.getByText("q2-correct"));
    finish();
    // The guest stash carries sessionStats verbatim: 1 attempted, 1 correct — not 2 / 2.
    fireEvent.click(await screen.findByTestId("qp-guest-signin"));
    expect(JSON.parse(window.sessionStorage.getItem(KEY)!)).toMatchObject({ attempted: 1, correct: 1, total: 3 });
    window.sessionStorage.clear();
  });

  it("(d) a written answer graded in review mode: record:false, labelled 'Review attempt', NOT in the persisted record", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, true)]);
    fireEvent.click(screen.getByText("q2-correct"));
    finish();
    await backToSet();
    await waitFor(() => expect(cards()).toHaveLength(2));
    await saveTypedFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    expect(lastBatchArgs().record).toBe(false);
    expect(await screen.findByText(/Question 1 · Review attempt/)).toBeInTheDocument();
    await waitFor(() => expect(persistSpy).toHaveBeenCalled());
    expect(entryFor("q-1")?.graded).toBeUndefined();
    expect(entryFor("q-2")?.mcq).toBe("correct");
  });

  it("(d) MIXED batch: the pre-Finish answer is recorded and persisted, the review answer is neither", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1), okGrade(2)]));
    await buildSet([mkItem(1, false), mkItem(2, false)]);
    await saveTypedFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-back-to-set"));
    await waitFor(() => expect(cards()).toHaveLength(2));
    await saveTypedFor(2);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    const { record, answers } = lastBatchArgs();
    expect(typeof record).toBe("function");
    const rec = record as (a: BatchArgs["answers"][number]) => boolean;
    expect(rec(answers.find((a) => a.questionId === "q-1")!)).toBe(true);
    expect(rec(answers.find((a) => a.questionId === "q-2")!)).toBe(false);
    expect(await screen.findByText(/Question 2 · Review attempt/)).toBeInTheDocument();
    expect(screen.queryByText(/Question 1 · Review attempt/)).toBeNull();
    await waitFor(() => expect(persistSpy).toHaveBeenCalled());
    expect(entryFor("q-1")?.graded).toBeDefined();
    expect(entryFor("q-2")?.graded).toBeUndefined();
  });

  it("(d) CONTROL: a written answer saved BEFORE Finish is graded with recording on and no label", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false)]);
    await saveTypedFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    expect(lastBatchArgs().record).toBeUndefined();
    await waitFor(() => expect(persistSpy).toHaveBeenCalled());
    expect(entryFor("q-1")?.graded).toBeDefined();
    expect(screen.queryByText(/Review attempt/)).toBeNull();
  });

  it("(e) a fresh set clears review mode: the line goes and picks count again", async () => {
    await buildSet([mkItem(1, true), mkItem(2, true), mkItem(3, true)]);
    fireEvent.click(screen.getByText("q1-correct"));
    finish();
    await backToSet();
    await waitFor(() => expect(reviewLine()).not.toBeNull());
    fireEvent.click(screen.getByText("q2-correct"));
    expect(recordAttemptSpy).toHaveBeenCalledTimes(1);
    fireEvent.click(await screen.findByRole("button", { name: /^Refresh set$/ }));
    await waitFor(() => expect(reviewLine()).toBeNull());
    await screen.findAllByTestId("practice-question-card");
    fireEvent.click(screen.getByText("q2-correct"));
    expect(recordAttemptSpy).toHaveBeenCalledTimes(2);
  });
});
