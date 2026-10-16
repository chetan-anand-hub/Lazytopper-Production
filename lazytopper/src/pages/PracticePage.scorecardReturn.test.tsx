// QP-SCORECARD-2 — the REAL PracticePage: the graded scorecard's full menu (A), "Your past
// sessions" + the read-only reopen (B), the tutor round trip landing back on the SAME scorecard
// (C, the live defect), and "Explore LazyTopper" on a Start-here scorecard (E4).
//
//   A  · graded QP scorecard: "Back to this set (see the steps)" FIRST, then the full menu;
//   B  · the uid's saved sessions are listed; a row reopens its scorecard from the stored record
//        + perQuestion payload + the bank rows; another uid's records never appear;
//   B  · ★★ the reopen calls ZERO recording paths (spies on every one of them);
//   C  · the tutor button's returnTo carries review=<that record id>; landing there reopens it
//        once and strips the param; an unreadable record leaves the plain page, silently;
//   E4 · "Explore LazyTopper" only on a src=start_here GRADED scorecard; it goes Home ("/").
//
// ★ ONE router (the harness of PracticePage.startHere.test.tsx). The record store is REAL (its
//   local mirror); the write functions are wrapped in spies that still call through.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
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

const spies = vi.hoisted(() => ({
  recordAttempt: vi.fn(() => "recorded"),
  recordMistake: vi.fn(),
  writeSessionRecord: vi.fn(),
  writeSessionPerQuestion: vi.fn(),
  persistQuickPracticeSession: vi.fn(),
  trackPracticeGraded: vi.fn(),
  onboarding: vi.fn(),
  extraBankRows: [] as unknown[],
}));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: spies.recordAttempt,
}));
vi.mock("../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/mistakeIntelligence")>();
  return { ...actual, recordMistake: spies.recordMistake };
});
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return {
    ...actual,
    writeSessionRecord: (...a: Parameters<typeof actual.writeSessionRecord>) => {
      spies.writeSessionRecord(...a);
      return actual.writeSessionRecord(...a);
    },
    writeSessionPerQuestion: (...a: Parameters<typeof actual.writeSessionPerQuestion>) => {
      spies.writeSessionPerQuestion(...a);
      return actual.writeSessionPerQuestion(...a);
    },
  };
});
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return {
    ...actual,
    sessionRotationOffset: () => 0,
    persistQuickPracticeSession: (...a: Parameters<typeof actual.persistQuickPracticeSession>) => {
      spies.persistQuickPracticeSession(...a);
      return actual.persistQuickPracticeSession(...a);
    },
  };
});
// The fixture questions are not bank rows; the reopen reads the bank by id (bankChaptersFor →
// getBankRows), so for THAT read only the loader also serves the fixtures. The chapter list it
// returns is tagged, so every other getBankRows caller (prediction, pools) sees the real bank.
const FIXTURE_TAG = Symbol.for("qps2.fixture-read");
vi.mock("../data/bankChapters/loader", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../data/bankChapters/loader")>();
  return {
    ...actual,
    bankChaptersFor: (keys: Iterable<string | null | undefined>) =>
      Object.assign(actual.bankChaptersFor(keys), { [FIXTURE_TAG]: true }),
    getBankRows: (slugs: Iterable<string>) => {
      const rows = actual.getBankRows(slugs);
      return (slugs as unknown as Record<symbol, unknown>)[FIXTURE_TAG]
        ? [...rows, ...(spies.extraBankRows as typeof rows)]
        : rows;
    },
  };
});
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, gradeWorksheet: vi.fn(), checkSolutionImage: vi.fn() };
});
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn() };
});
vi.mock("../analytics/analytics", async (importActual) => {
  const actual = await importActual<typeof import("../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: spies.onboarding, trackPracticeGraded: spies.trackPracticeGraded };
});

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";

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
let historyLength = 0;
function LocationProbe() {
  const l = useLocation();
  lastLocation = `${l.pathname}${l.search}`;
  return null;
}

const ME = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
const RECORDING = () => ({
  persistQuickPracticeSession: spies.persistQuickPracticeSession.mock.calls.length,
  writeSessionRecord: spies.writeSessionRecord.mock.calls.length,
  writeSessionPerQuestion: spies.writeSessionPerQuestion.mock.calls.length,
  recordAttempt: spies.recordAttempt.mock.calls.length,
  recordMistake: spies.recordMistake.mock.calls.length,
  trackPracticeGraded: spies.trackPracticeGraded.mock.calls.length,
  start_here_graded: spies.onboarding.mock.calls.filter((c) => c[0] === "start_here_graded").length,
});
const ZERO = {
  persistQuickPracticeSession: 0, writeSessionRecord: 0, writeSessionPerQuestion: 0,
  recordAttempt: 0, recordMistake: 0, trackPracticeGraded: 0, start_here_graded: 0,
};
function resetSpies() {
  for (const k of ["recordAttempt", "recordMistake", "writeSessionRecord", "writeSessionPerQuestion", "persistQuickPracticeSession", "trackPracticeGraded", "onboarding"] as const) {
    spies[k].mockClear();
  }
}

beforeEach(() => {
  window.localStorage.clear();
  authUser.current = ME;
  resetSpies();
  spies.extraBankRows = [mkItem(1), mkItem(2), mkItem(3)];
  lastLocation = "";
});
afterEach(() => {
  cleanup();
  mockBuild.mockReset();
});

async function renderAt(url: string, pool: PQ[]) {
  mockBuild.mockResolvedValue(pool);
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[url]}>
      <LocationProbe />
      <HistoryProbe />
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
}
function HistoryProbe() {
  // Counts PUSH navigations (a new history entry); a REPLACE adds none.
  const l = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (type === "PUSH") historyLength += 1;
  }, [l.key, type]);
  return null;
}

const SET_URL = (extra = "") => `/practice/10/maths?topic=real-numbers&count=3${extra}`;
const finish = () => fireEvent.click(screen.getByRole("button", { name: /Finish session/i }));

/** Answer Q1 wrong, Q2 right, Q3 wrong, finish; return the record id and the tutor URL of Q3. */
async function gradeAndAskTutor(extra = "") {
  await renderAt(SET_URL(extra), [mkItem(1), mkItem(2), mkItem(3)]);
  fireEvent.click(screen.getByText("q1-wrong"));
  fireEvent.click(screen.getByText("q2-correct"));
  fireEvent.click(screen.getByText("q3-wrong"));
  const buttons = await screen.findAllByTestId("sc-tutor-ask");
  await waitFor(() => expect(spies.writeSessionRecord).toHaveBeenCalled());
  const recordId = (spies.writeSessionRecord.mock.calls.at(-1)![1] as { id: string }).id;
  fireEvent.click(buttons[1]);
  await waitFor(() => expect(lastLocation).toMatch(/^\/tutor\//));
  return { recordId, tutorUrl: lastLocation };
}

describe("QP-SCORECARD-2 A · the graded scorecard on the page", () => {
  it("★★ Back to this set FIRST and primary, then the full menu (Chapter Test / Important Questions / Study)", async () => {
    await renderAt(SET_URL(), [mkItem(1), mkItem(2)]);
    fireEvent.click(screen.getByText("q1-correct"));
    finish();
    const back = await screen.findByRole("button", { name: /Back to this set \(see the steps\)/ });
    const all = screen.getAllByRole("button").map((b) => b.textContent || "");
    const at = (label: string) => all.findIndex((t) => t.includes(label));
    expect(at("Back to this set")).toBeGreaterThanOrEqual(0);
    for (const label of ["Keep practicing this set", "Build a fresh set", "Chapter Test", "Important Questions", "Study this chapter"]) {
      expect(at(label), label).toBeGreaterThan(at("Back to this set"));
    }
    expect(back).toBeInTheDocument();
    // An ordinary set has no Start-here exit (E4 control).
    expect(screen.queryByRole("button", { name: /Explore LazyTopper/ })).toBeNull();
  });
});

describe("QP-SCORECARD-2 C · the tutor round trip returns to the SAME scorecard (the live defect)", () => {
  it("★★ the tutor button's returnTo carries review=<that record id>", async () => {
    const { recordId, tutorUrl } = await gradeAndAskTutor();
    const q = new URLSearchParams(tutorUrl.split("?")[1]);
    expect(q.get("from")).toBe(recordId);
    const returnTo = q.get("returnTo")!;
    expect(returnTo).toMatch(/^\/practice\/10\/maths\?/);
    expect(new URLSearchParams(returnTo.split("?")[1]).get("review")).toBe(recordId);
    // The rest of the page's own query survives the round trip.
    expect(new URLSearchParams(returnTo.split("?")[1]).get("topic")).toBe("real-numbers");
  });

  it("★★ returning opens THAT scorecard read-only — rows, bank steps, tutor buttons — once, param stripped, ZERO recording calls", async () => {
    const { recordId, tutorUrl } = await gradeAndAskTutor();
    const returnTo = new URLSearchParams(tutorUrl.split("?")[1]).get("returnTo")!;
    cleanup();
    resetSpies();
    historyLength = 0;
    await renderAt(returnTo, [mkItem(1), mkItem(2), mkItem(3)]);
    // The reopened scorecard: the record's code in the subtitle, its stored marks, the rows.
    expect(await screen.findByText(new RegExp(`${recordId} ·`))).toBeInTheDocument();
    const rows = await screen.findAllByTestId("sc-wrong-answer");
    expect(rows.map((r) => within(r).getByText(/^Question \d$/).textContent)).toEqual(["Question 1", "Question 3"]);
    expect(rows[1].textContent).toContain("Correct answer: q3-correct");
    expect(rows[1].textContent).toContain("Bank step one of question 3.");
    // The pick is not stored on the record — left out, never guessed.
    expect(rows[1].textContent).not.toContain("Your answer");
    expect(screen.getAllByTestId("sc-tutor-ask")).toHaveLength(2);
    // The full menu (A) on the reopen; no live-set action.
    expect(screen.getByRole("button", { name: /Build a fresh set/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Chapter Test/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Back to this set/ })).toBeNull();
    // ONE reopen, the param stripped with REPLACE (no extra history entry).
    await waitFor(() => expect(lastLocation).not.toContain("review="));
    expect(lastLocation).toContain("topic=real-numbers");
    expect(historyLength).toBe(0);
    // ★★ HARD RULE — the reopen recorded nothing.
    expect(RECORDING()).toEqual(ZERO);
    // Its own tutor button goes round again to the SAME record.
    fireEvent.click(screen.getAllByTestId("sc-tutor-ask")[0]);
    await waitFor(() => expect(lastLocation).toMatch(/^\/tutor\//));
    const again = new URLSearchParams(lastLocation.split("?")[1]);
    expect(again.get("from")).toBe(recordId);
    expect(again.get("q")).toBe("q-1");
    expect(new URLSearchParams(again.get("returnTo")!.split("?")[1]).get("review")).toBe(recordId);
    expect(RECORDING()).toEqual(ZERO);
  });

  it("★ an unreadable record (not on this device, no cloud) → the plain page, silently; param stripped", async () => {
    await renderAt(SET_URL("&review=QP-M-REAL-deadbeef"), [mkItem(1)]);
    await waitFor(() => expect(lastLocation).not.toContain("review="));
    expect(document.querySelector(".lt-sc__big")).toBeNull();
    expect(screen.queryByText(/QP-M-REAL-deadbeef/)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("★ another account's record is never reopened (uid-scoped)", async () => {
    const { tutorUrl } = await gradeAndAskTutor();
    const returnTo = new URLSearchParams(tutorUrl.split("?")[1]).get("returnTo")!;
    cleanup();
    authUser.current = { uid: "student-2", isLocalSession: false, email: "t@x.com" };
    await renderAt(returnTo, [mkItem(1)]);
    await waitFor(() => expect(lastLocation).not.toContain("review="));
    expect(screen.queryAllByTestId("sc-wrong-answer")).toHaveLength(0);
    expect(document.querySelector(".lt-sc__big")).toBeNull();
  });
});

describe("QP-SCORECARD-2 B · Your past sessions on the Quick Practice page", () => {
  it("★★ the uid's saved session is listed by name and reopens read-only with ZERO recording calls", async () => {
    const { recordId } = await gradeAndAskTutor();
    cleanup();
    resetSpies();
    await renderAt(SET_URL(), [mkItem(1), mkItem(2), mkItem(3)]);
    const list = await screen.findByTestId("qp-past-sessions");
    expect(within(list).getByRole("heading", { name: "Your past sessions" })).toBeInTheDocument();
    const row = within(list).getByRole("button", { name: /Re-open the .*Practice set scorecard/ });
    expect(row.textContent).toContain(recordId);
    fireEvent.click(row);
    expect(await screen.findByText(new RegExp(`${recordId} ·`))).toBeInTheDocument();
    expect(await screen.findAllByTestId("sc-wrong-answer")).toHaveLength(2);
    expect(RECORDING()).toEqual(ZERO);
  });

  it("CONTROL: a signed-out visitor sees no past-sessions list", async () => {
    authUser.current = null;
    await renderAt(SET_URL(), [mkItem(1)]);
    expect(screen.queryByTestId("qp-past-sessions")).toBeNull();
  });
});

describe("QP-SCORECARD-2 E4 · Explore LazyTopper (Start-here graded scorecards only)", () => {
  it("★★ present and PRIMARY-placed on a src=start_here graded scorecard; it goes Home", async () => {
    await renderAt(SET_URL("&src=start_here"), [mkItem(1), mkItem(2)]);
    fireEvent.click(screen.getByText("q1-wrong"));
    fireEvent.click(screen.getByText("q2-correct"));
    const explore = await screen.findByRole("button", { name: /Explore LazyTopper/ });
    fireEvent.click(explore);
    await waitFor(() => expect(lastLocation).toBe("/"));
  });

  it("★ the reopened Start-here scorecard (tutor return) carries it too", async () => {
    const { tutorUrl } = await gradeAndAskTutor("&src=start_here");
    const returnTo = new URLSearchParams(tutorUrl.split("?")[1]).get("returnTo")!;
    expect(returnTo).toContain("src=start_here");
    cleanup();
    await renderAt(returnTo, [mkItem(1), mkItem(2), mkItem(3)]);
    expect(await screen.findByRole("button", { name: /Explore LazyTopper/ })).toBeInTheDocument();
  });

  it("CONTROL: a Start-here set with nothing attempted (empty state) has no Explore action", async () => {
    await renderAt(SET_URL("&src=start_here"), [mkItem(1), mkItem(2)]);
    finish();
    await screen.findByText(/nothing is counted against you/);
    expect(screen.queryByRole("button", { name: /Explore LazyTopper/ })).toBeNull();
  });
});
