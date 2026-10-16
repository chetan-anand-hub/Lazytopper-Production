// START-HERE-1 — the REAL PracticePage on a Start-here set and on an ordinary MCQ set.
//
//   §2.4 the result shows, for each wrong MCQ, the student's pick, the right option and the
//        bank's own solution steps — nothing generated;
//   §2.4 "Try 5 more in this chapter" and "See all your progress" appear on a Start-here set only;
//   §2.4 `start_here_graded` fires ONCE per Start-here set, with counts only;
//   §2.5 "Ask the tutor why I lost this mark" is on each question that lost marks and opens
//        the tutor with `from=<that session's record id>` and `q=<question id>` — no answer text
//        in the URL — and fires `tutor_from_scorecard` once;
//   ·    PRACTICE-REVIEW-HONEST-1: a pick made after Finish (review) is never listed as wrong.
//
// ★ ONE router (the harness of PracticePage.finishReview.test.tsx).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
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
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: () => "recorded",
}));
const { written } = vi.hoisted(() => ({ written: [] as Array<{ id: string; questionIds: string[] }> }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return {
    ...actual,
    writeSessionRecord: (_u: unknown, r: { id: string; questionIds: string[] }) => {
      written.push({ id: r.id, questionIds: r.questionIds });
      return "recorded";
    },
    writeSessionPerQuestion: () => {},
  };
});
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, gradeWorksheet: vi.fn(), checkSolutionImage: vi.fn() };
});
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return { ...actual, sessionRotationOffset: () => 0 };
});
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn() };
});
const { onboarding } = vi.hoisted(() => ({ onboarding: vi.fn() }));
vi.mock("../analytics/analytics", async (importActual) => {
  const actual = await importActual<typeof import("../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: onboarding };
});

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";
import { gradeWorksheet } from "../ai/aiClient";

authUser.current = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;

/** An MCQ (correct = option 0) with bank solution steps. */
function mkItem(n: number): PQ {
  return {
    id: `q-${n}`,
    questionText: `Question ${n}: solve it.`,
    marks: 1,
    section: "A",
    format: "mcq",
    difficulty: "Hard",
    subtopic: "seed",
    topicKey: "real-numbers",
    solutionSteps: [`Bank step one of question ${n}.`, `Bank step two of question ${n}.`],
    finalAnswer: `answer-${n}`,
    options: [`q${n}-correct`, `q${n}-wrong`, `q${n}-c`, `q${n}-d`],
    answer: `q${n}-correct`,
  } as unknown as PQ;
}

let lastLocation = "";
function LocationProbe() {
  const l = useLocation();
  lastLocation = `${l.pathname}${l.search}`;
  return null;
}

beforeEach(() => {
  written.length = 0;
  onboarding.mockClear();
  lastLocation = "";
});
afterEach(() => {
  cleanup();
  mockBuild.mockReset();
});

async function buildSet(query: string, pool: PQ[]) {
  mockBuild.mockResolvedValue(pool);
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[`/practice/10/maths?topic=real-numbers&count=${pool.length}${query}`]}>
      <LocationProbe />
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
}

const finish = () => fireEvent.click(screen.getByRole("button", { name: /Finish session/i }));
const startHereCalls = (name: string) => onboarding.mock.calls.filter((c) => c[0] === name);

describe("START-HERE-1 · a Start-here set's result", () => {
  it("★★ each wrong MCQ shows the pick, the right option and the bank's steps; the right ones are not listed", async () => {
    await buildSet("&src=start_here&qt=mcq", [mkItem(1), mkItem(2), mkItem(3)]);
    fireEvent.click(screen.getByText("q1-wrong"));
    fireEvent.click(screen.getByText("q2-correct"));
    fireEvent.click(screen.getByText("q3-correct"));
    const rows = await screen.findAllByTestId("sc-wrong-answer");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Question 1");
    expect(rows[0].textContent).toContain("Your answer: q1-wrong");
    expect(rows[0].textContent).toContain("Correct answer: q1-correct");
    expect(rows[0].textContent).toContain("Bank step one of question 1.");
    expect(rows[0].textContent).toContain("Bank step two of question 1.");
    expect(screen.getByTestId("sc-wrong-heading")).toBeInTheDocument();
  });

  it("★ the Start-here next steps are on the card: Try 5 more, See all your progress", async () => {
    await buildSet("&src=start_here&qt=mcq", [mkItem(1), mkItem(2)]);
    fireEvent.click(screen.getByText("q1-wrong"));
    fireEvent.click(screen.getByText("q2-wrong"));
    expect(await screen.findByRole("button", { name: /Try 5 more in this chapter/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /See all your progress/ }));
    await waitFor(() => expect(lastLocation).toBe("/me"));
  });

  it("★★ start_here_graded fires ONCE, with counts only", async () => {
    await buildSet("&src=start_here&qt=mcq", [mkItem(1), mkItem(2), mkItem(3)]);
    fireEvent.click(screen.getByText("q1-wrong"));
    fireEvent.click(screen.getByText("q2-correct"));
    finish();
    await screen.findAllByTestId("sc-wrong-answer");
    // Re-render churn (a dismissed-and-reopened scorecard) must not count it twice.
    const back = screen.getByRole("button", { name: /Back to this set/ });
    fireEvent.click(back);
    finish();
    await screen.findAllByTestId("sc-wrong-answer");
    expect(startHereCalls("start_here_graded")).toHaveLength(1);
    expect(startHereCalls("start_here_graded")[0][1]).toEqual({ subject: "maths", correct: 1, total: 3 });
  });

  it("★★ CONTROL: an ordinary MCQ set fires no start_here_graded and has no Start-here next steps", async () => {
    await buildSet("", [mkItem(1), mkItem(2)]);
    fireEvent.click(screen.getByText("q1-wrong"));
    fireEvent.click(screen.getByText("q2-wrong"));
    await screen.findAllByTestId("sc-wrong-answer");
    expect(startHereCalls("start_here_graded")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /Try 5 more in this chapter/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /See all your progress/ })).toBeNull();
  });
});

describe("START-HERE-1 · Ask the tutor why I lost this mark (Quick Practice scorecard)", () => {
  it("★★ one button per wrong question; it opens the tutor with the record id and question id, never the answer", async () => {
    await buildSet("", [mkItem(1), mkItem(2), mkItem(3)]);
    fireEvent.click(screen.getByText("q1-wrong"));
    fireEvent.click(screen.getByText("q2-correct"));
    fireEvent.click(screen.getByText("q3-wrong"));
    const buttons = await screen.findAllByTestId("sc-tutor-ask");
    expect(buttons).toHaveLength(2); // Q1 and Q3 lost marks; Q2 did not
    await waitFor(() => expect(written.length).toBeGreaterThan(0));
    const recordId = written[written.length - 1].id;
    fireEvent.click(buttons[1]);
    await waitFor(() => expect(lastLocation).toMatch(/^\/tutor\/10\/Maths\/real-numbers\?/));
    const q = new URLSearchParams(lastLocation.split("?")[1]);
    expect(q.get("from")).toBe(recordId);
    expect(q.get("q")).toBe("q-3");
    expect(q.get("source")).toBe("scorecard");
    expect(q.get("returnTo")).toMatch(/^\/practice\/10\/maths\?/);
    expect(lastLocation).not.toContain("q3-wrong");
    expect(lastLocation).not.toContain("q3-correct");
    expect(startHereCalls("tutor_from_scorecard")).toEqual([["tutor_from_scorecard", { surface: "quick_practice" }]]);
  });

  it("★★ a local session or a signed-out visitor sees the scorecard exactly as before: no rows, no button", async () => {
    for (const who of [{ uid: "local-1", isLocalSession: true }, null]) {
      authUser.current = who;
      await buildSet("&src=start_here", [mkItem(1)]);
      fireEvent.click(screen.getByText("q1-wrong"));
      await screen.findByText(/Session scorecard/);
      expect(screen.queryAllByTestId("sc-wrong-answer")).toHaveLength(0);
      expect(screen.queryByTestId("sc-wrong-heading")).toBeNull();
      expect(screen.queryByTestId("sc-tutor-ask")).toBeNull();
      cleanup();
    }
    authUser.current = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
  });

  it("★★ review mode: a pick made after Finish (steps seen) is not scored, so it is never listed as wrong", async () => {
    await buildSet("", [mkItem(1), mkItem(2)]);
    fireEvent.click(screen.getByText("q1-correct"));
    finish();
    fireEvent.click(await screen.findByRole("button", { name: /Back to this set \(see the steps\)/ }));
    await waitFor(() => expect(screen.getAllByTestId("practice-question-card")).toHaveLength(2));
    // Q2 is picked wrongly IN REVIEW: shown right/wrong on the card, never a counted mistake.
    fireEvent.click(within(screen.getAllByTestId("practice-question-card")[1]).getByText("q2-wrong"));
    finish();
    await screen.findByRole("button", { name: /Back to this set \(see the steps\)/ });
    expect(screen.queryAllByTestId("sc-wrong-answer")).toHaveLength(0);
    expect(screen.queryByTestId("sc-tutor-ask")).toBeNull();
  });
});

// START-HERE-WRITTEN - the ONE written Science question, on the REAL page.
//   * the link's count=1 survives the page's count floor, so the exact-set path serves that one id;
//   * the typed answer goes through Quick Practice's EXISTING written grading (gradeWorksheet,
//     surface "quick-practice") with its line breaks intact (TUTOR-FIX-2 T14, the QP leg);
//   * start_here_graded fires once.
describe("START-HERE-WRITTEN · a one-question written Start-here set", () => {
  const mockGrade = vi.mocked(gradeWorksheet);
  afterEach(() => mockGrade.mockReset());

  function mkWritten(): PQ {
    return {
      id: "w-1",
      questionText: "Question 1: solve it.",
      marks: 3,
      section: "C",
      format: "Short",
      difficulty: "Hard",
      subtopic: "seed",
      topicKey: "electricity",
      solutionSteps: ["Bank step one.", "Bank step two."],
      finalAnswer: "2 ohm",
    } as unknown as PQ;
  }

  it("★★ count=1 serves the one id; the typed answer reaches the existing grader with line breaks intact", async () => {
    mockGrade.mockResolvedValue({
      ok: true,
      results: [
        {
          qNumber: 1, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 2, percentage: 67,
          annotatedSteps: [
            { stepNumber: 2, description: "Substitute", studentWork: "R = 4/2", status: "incorrect", marksAwarded: 0,
              marksDeducted: 1, teacherAnnotation: "Units missing.", mistakeType: "presentation", correctedWorking: null },
          ],
          mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 1 },
          teacherNote: "Good method.",
        },
      ],
      totalQuestions: 1, gradedCount: 1, pendingCount: 0, gradedMarksAwarded: 2, gradedMarksTotal: 3, worksheetTotalMarks: 3,
    } as never);
    mockBuild.mockResolvedValue([mkWritten()]);
    setMatchMediaMatches(true);
    render(
      <MemoryRouter
        initialEntries={["/practice/10/science?topic=electricity&focusBankIds=w-1&strictFocus=true&count=1&src=start_here&qt=written"]}
      >
        <LocationProbe />
        <Routes>
          <Route path="/practice/:grade/:subject" element={<PracticePage />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findAllByText(/^Question 1: solve it\.$/, {}, { timeout: 30000 });
    // The exact-set path: the one id, count 1 (the page's floor of 3 would otherwise send it elsewhere).
    // ONE engine call, on the exact-set branch (the blueprint branch fans out one call per section
    // with a `sectionFilter`).
    expect(mockBuild).toHaveBeenCalledTimes(1);
    expect(mockBuild.mock.calls[0][0]).toMatchObject({ count: 1, focusBankIds: ["w-1"], strictFocus: true });
    expect(mockBuild.mock.calls[0][0]).not.toHaveProperty("sectionFilter");
    expect(screen.getAllByTestId("practice-question-card")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /^Answer this question$/ }));
    const tabs = screen.getAllByRole("tab", { name: "Type my working" });
    fireEvent.click(tabs[tabs.length - 1]);
    fireEvent.change(screen.getByLabelText("Type your working and answer"), {
      target: { value: "V = 4 V, I = 2 A\nR = V / I\nR = 2 ohm" },
    });
    fireEvent.click(await screen.findByTestId("qp-save-answer"));
    await screen.findByTestId("qp-saved-confirmation");
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(mockGrade).toHaveBeenCalledTimes(1));
    const [req, opts] = mockGrade.mock.calls[0] as unknown as [
      { questions: Array<{ qNumber: number; textAnswer?: string }>; uploads?: unknown[] },
      { surface?: string },
    ];
    expect(opts.surface).toBe("quick-practice");
    expect(req.questions).toHaveLength(1);
    expect(req.questions[0].textAnswer).toBe("V = 4 V, I = 2 A\nR = V / I\nR = 2 ohm");
    expect(req.uploads ?? []).toHaveLength(0);
    await waitFor(() => expect(startHereCalls("start_here_graded")).toHaveLength(1));
    expect(startHereCalls("start_here_graded")[0][1]).toMatchObject({ subject: "science", total: 1 });
    // The existing written scorecard carries the tutor door on the question that lost marks.
    expect(await screen.findAllByTestId("sc-tutor-ask")).toHaveLength(1);
  });
});
