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
let lastState: unknown = null;
function LocationProbe() {
  const l = useLocation();
  lastLocation = `${l.pathname}${l.search}`;
  // eslint-disable-next-line react-hooks/globals -- test probe records the router state
  lastState = l.state;
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

  it("★★ a local session sees the scorecard exactly as before: no rows, no button", async () => {
    authUser.current = { uid: "local-1", isLocalSession: true };
    await buildSet("&src=start_here", [mkItem(1)]);
    fireEvent.click(screen.getByText("q1-wrong"));
    await screen.findByText(/Session scorecard/);
    expect(screen.queryAllByTestId("sc-wrong-answer")).toHaveLength(0);
    expect(screen.queryByTestId("sc-wrong-heading")).toBeNull();
    expect(screen.queryByTestId("sc-tutor-ask")).toBeNull();
    authUser.current = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
  });

  // TUTOR-FIX-2 T12 (owner ruling) — a SIGNED-OUT visitor (incl. the Start-here path) now sees
  // the lost-mark rows with "Ask the tutor why I lost this mark"; the tap opens a sign-up prompt
  // and does nothing else: no /tutor navigation, no network, no analytics, nothing stored. Only
  // choosing Sign up stores the one-shot (q + pick) and goes to /login with the tutor as `from`.
  it("★★ signed out: the button opens the sign-up prompt — no /tutor navigation, no network", async () => {
    authUser.current = null;
    sessionStorage.clear();
    try {
      await buildSet("&src=start_here&qt=mcq", [mkItem(1), mkItem(2)]);
      fireEvent.click(screen.getByText("q1-correct"));
      fireEvent.click(screen.getByText("q2-wrong"));
      const buttons = await screen.findAllByTestId("sc-tutor-ask");
      expect(buttons).toHaveLength(1);
      const before = lastLocation;
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      onboarding.mockClear();
      fireEvent.click(buttons[0]);
      const prompt = await screen.findByTestId("tutor-signup-prompt");
      expect(prompt.textContent).toContain(
        "Sign up free to ask the tutor why you lost this mark - your 7-day trial starts when you sign up.",
      );
      expect(lastLocation).toBe(before);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(onboarding).not.toHaveBeenCalled();
      expect(sessionStorage.getItem("lazytopper.tutorSignupAsk.v1")).toBeNull();
      vi.unstubAllGlobals();

      fireEvent.click(within(prompt).getByTestId("tutor-signup-cta"));
      await waitFor(() => expect(lastLocation).toBe("/login"));
      expect(lastState).toEqual({ from: "/tutor/10/Maths/real-numbers?q=q-2&source=scorecard" });
      const stash = JSON.parse(sessionStorage.getItem("lazytopper.tutorSignupAsk.v1")!);
      expect(stash).toMatchObject({ q: "q-2", qNumber: 2, pick: "q2-wrong" });
      expect(written).toHaveLength(0); // the signed-out result is never persisted
    } finally {
      vi.unstubAllGlobals();
      authUser.current = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
    }
  });

  it("★ signed out: Not now closes the prompt and keeps the scorecard", async () => {
    authUser.current = null;
    try {
      await buildSet("", [mkItem(1)]);
      fireEvent.click(screen.getByText("q1-wrong"));
      fireEvent.click(await screen.findByTestId("sc-tutor-ask"));
      fireEvent.click(within(await screen.findByTestId("tutor-signup-prompt")).getByRole("button", { name: "Not now" }));
      await waitFor(() => expect(screen.queryByTestId("tutor-signup-prompt")).toBeNull());
      expect(screen.getByTestId("sc-wrong-heading")).toBeInTheDocument();
    } finally {
      authUser.current = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
    }
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
