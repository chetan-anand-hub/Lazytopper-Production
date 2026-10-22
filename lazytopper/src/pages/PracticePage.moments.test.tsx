// MOMENTS-1 — Quick Practice on the REAL page (PracticePage → PracticeQuestionList → the card).
//
//   M3  a zero-graded GUIDE-arm student on a five-question MCQ set: Byte (point) above the question
//       "Tap the answer you think is right. No typing."; after the FIRST tap, Ziggy (excited)
//       "Yes! 1 of 5. Next one." in the same spot ONLY when that tap was correct; a wrong first
//       tap → Byte just goes. The MCQ is graded by the card exactly as before (display only).
//   M8  the set fails to load on the bank chunk → Ziggy (sad) "Oops, the connection dropped." —
//       never "Your answer is safe" here (no answer exists yet). Guide arm only.
//   FIX a real "Retry" under a failed load re-runs it, for EVERY student (both arms).
//
// ★ The harness of PracticePage.startHere.test.tsx / PracticePage.typeFirst.test.tsx.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

const { authUser, cloudHas, localRows, failBank } = vi.hoisted(() => ({
  authUser: { current: null as null | { uid: string; isLocalSession: boolean; email?: string } },
  cloudHas: vi.fn(),
  localRows: vi.fn(),
  failBank: { on: false },
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
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return {
    ...actual,
    loadLocalSessionRecords: (...a: unknown[]) => localRows(...a),
    cloudHasAnySessionRecord: (...a: unknown[]) => cloudHas(...a),
    writeSessionRecord: () => "recorded",
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
// The bank chunk "does not arrive" while `failBank.on` (the offline / stale-deploy failure).
vi.mock("../data/bankChapters/loader", async (importActual) => {
  const actual = await importActual<typeof import("../data/bankChapters/loader")>();
  return {
    ...actual,
    ensureBankChapters: (keys: Iterable<string | null | undefined>) =>
      failBank.on ? Promise.reject(new TypeError("Failed to fetch dynamically imported module")) : actual.ensureBankChapters(keys),
  };
});

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";
import { askCloudOnce, resetZeroGradedCacheForTests } from "../components/startHere/zeroGraded";
import { __setGuideAbForTests } from "../components/guide/guideVariant";
import { __resetMascotsForTests } from "../components/guide/mascotsMute";

const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;
const UID = "qp-moments";

/** An MCQ (correct = option 0). */
function mkMcq(n: number): PQ {
  return {
    id: `q-${n}`,
    questionText: `Question ${n}: solve it.`,
    marks: 1,
    section: "A",
    format: "mcq",
    difficulty: "Hard",
    subtopic: "seed",
    topicKey: "real-numbers",
    solutionSteps: [`Bank step one of question ${n}.`],
    finalAnswer: `answer-${n}`,
    options: [`q${n}-correct`, `q${n}-wrong`, `q${n}-c`, `q${n}-d`],
    answer: `q${n}-correct`,
  } as unknown as PQ;
}
const FIVE = [1, 2, 3, 4, 5].map(mkMcq);
const BYTE_LINE = "Tap the answer you think is right. No typing.";
const ZIGGY_LINE = "Yes! 1 of 5. Next one.";
const M8_LINE = "Oops, the connection dropped.";

function mount(count = 5) {
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[`/practice/10/maths?topic=real-numbers&count=${count}`]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}
async function buildSet(pool: PQ[]) {
  mockBuild.mockResolvedValue(pool);
  mount(pool.length);
  await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
}
const momentLine = () => screen.queryByTestId("guide-moment-line")?.textContent ?? null;

beforeEach(async () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetMascotsForTests();
  resetZeroGradedCacheForTests();
  failBank.on = false;
  authUser.current = { uid: UID, isLocalSession: false, email: "s@x.com" };
  cloudHas.mockReset().mockResolvedValue(false);
  localRows.mockReset().mockReturnValue([]);
  await askCloudOnce(UID); // the zero-graded answer Home / the hub already read in this tab
  __setGuideAbForTests(true, "guide");
});
afterEach(() => {
  cleanup();
  mockBuild.mockReset();
  setMatchMediaMatches(false);
  __setGuideAbForTests(null);
});

describe("MOMENTS-1 M3 · the first Quick Practice question", () => {
  it("★★ guide arm, zero graded, 5 MCQs: Byte asks for a tap; a CORRECT first tap → Ziggy in his place; the next tap → gone", async () => {
    await buildSet(FIVE);
    await waitFor(() => expect(momentLine()).toBe(BYTE_LINE));
    expect(screen.getByTestId("guide-moment-m3").getAttribute("data-kind")).toBe("byte");
    fireEvent.click(screen.getByText("q1-correct"));
    await waitFor(() => expect(momentLine()).toBe(ZIGGY_LINE));
    const m = screen.getByTestId("guide-moment-m3");
    expect(m.getAttribute("data-kind")).toBe("ziggy");
    expect(m.getAttribute("data-pose")).toBe("excited");
    expect(screen.queryByText(BYTE_LINE)).toBeNull(); // never side by side
    fireEvent.click(screen.getByText("q2-wrong"));
    await waitFor(() => expect(screen.queryByTestId("guide-moment-m3")).toBeNull());
  });

  it("★★ a WRONG first tap → Byte just goes (no Ziggy line); a later correct tap brings nobody back", async () => {
    await buildSet(FIVE);
    await waitFor(() => expect(momentLine()).toBe(BYTE_LINE));
    fireEvent.click(screen.getByText("q1-wrong"));
    await waitFor(() => expect(screen.queryByTestId("guide-moment-m3")).toBeNull());
    fireEvent.click(screen.getByText("q2-correct"));
    await act(async () => {});
    expect(screen.queryByText(ZIGGY_LINE)).toBeNull();
  });

  it("★★ CONTROL arm: no moment at all (today's page)", async () => {
    __setGuideAbForTests(true, "control");
    await buildSet(FIVE);
    fireEvent.click(screen.getByText("q1-correct"));
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m3")).toBeNull();
    expect(screen.queryByText(BYTE_LINE)).toBeNull();
    expect(screen.queryByText(ZIGGY_LINE)).toBeNull();
  });

  it("a student with graded work: no first-session moment", async () => {
    localRows.mockReturnValue([{ id: "r1" }]);
    await buildSet(FIVE);
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m3")).toBeNull();
  });

  it("not a five-question set ('1 of 5' would be untrue): no moment", async () => {
    await buildSet(FIVE.slice(0, 3));
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m3")).toBeNull();
  });

  it("display only: the tap is graded exactly as before (the card's own right/wrong marks)", async () => {
    await buildSet(FIVE);
    const right = screen.getByText("q1-correct").closest("button")!;
    fireEvent.click(right);
    await waitFor(() => expect(right.getAttribute("aria-pressed")).toBe("true"));
  });
});

describe("MOMENTS-1 · a set that fails to load: Retry (everyone) + M8 (guide arm)", () => {
  it("★★ a generation failure shows a real Retry (BOTH arms) that re-runs the load; not a connection failure → no Ziggy", async () => {
    for (const arm of ["control", "guide"] as const) {
      __setGuideAbForTests(true, arm);
      mockBuild.mockReset().mockRejectedValueOnce(new Error("engine")).mockResolvedValue(FIVE);
      mount();
      const retry = await screen.findByTestId("qp-load-retry", {}, { timeout: 30000 });
      expect(retry.textContent).toBe("Retry");
      expect(screen.getByText("Could not generate practice questions right now. Please try again.")).toBeTruthy();
      expect(screen.queryByTestId("guide-moment-m8")).toBeNull(); // not a dropped connection
      const before = mockBuild.mock.calls.length;
      fireEvent.click(retry);
      await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
      expect(mockBuild.mock.calls.length).toBeGreaterThan(before);
      expect(screen.queryByTestId("qp-load-retry")).toBeNull();
      cleanup();
    }
  });

  it("★★ the bank chunk does not arrive: guide arm → Ziggy 'Oops, the connection dropped.' (no 'answer is safe'); Retry loads the set", async () => {
    failBank.on = true;
    mockBuild.mockResolvedValue(FIVE);
    mount();
    await waitFor(() => expect(screen.getByTestId("guide-moment-m8")).toBeTruthy(), { timeout: 30000 });
    expect(momentLine()).toBe(M8_LINE);
    expect(screen.getByTestId("guide-moment-m8").getAttribute("data-kind")).toBe("ziggy");
    expect(screen.getByTestId("guide-moment-m8").getAttribute("data-pose")).toBe("sad");
    expect(screen.queryByText(/Your answer is safe/)).toBeNull();
    failBank.on = false;
    fireEvent.click(screen.getByTestId("qp-load-retry"));
    await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
    expect(screen.queryByTestId("guide-moment-m8")).toBeNull();
  });

  it("★★ CONTROL arm, the same failure: the Retry, and NO Ziggy", async () => {
    __setGuideAbForTests(true, "control");
    failBank.on = true;
    mockBuild.mockResolvedValue(FIVE);
    mount();
    await screen.findByTestId("qp-load-retry", {}, { timeout: 30000 });
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m8")).toBeNull();
    expect(screen.queryByText(M8_LINE)).toBeNull();
  });
});
