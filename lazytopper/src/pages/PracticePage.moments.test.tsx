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

const { authUser, cloudHas, localRows, failBank, writtenCloud } = vi.hoisted(() => ({
  writtenCloud: vi.fn(),
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

// MOMENTS-1 M11 — the server's "any written answer graded?" read.
vi.mock("../components/guide/moments/writtenGradedCloud", async (importActual) => {
  const actual = await importActual<typeof import("../components/guide/moments/writtenGradedCloud")>();
  return { ...actual, cloudHasWrittenGraded: (...a: unknown[]) => writtenCloud(...a) };
});

import PracticePage from "./PracticePage";
import { __resetM11ForTests } from "../components/guide/moments/moments";
import { resetWrittenGradedForTests } from "../components/guide/moments/writtenGraded";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";
import { gradeWorksheet } from "../ai/aiClient";
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
/** ONE build of a single-topic set asks the builder once per blueprint section (A–E). */
const CALLS_PER_BUILD = 5;

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
  writtenCloud.mockReset().mockResolvedValue(false);
  resetWrittenGradedForTests();
  __resetM11ForTests();
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

  it("★★ REVIEW M1 (delta FB) — correct tap → Refresh set → a DIFFERENT set: no Ziggy at 0 answers; the NEW set's correct first tap brings Ziggy", async () => {
    // Build #1 (the first CALLS_PER_BUILD section calls) serves q-1..q-5; every later build serves q-6..q-10.
    const NEXT = [6, 7, 8, 9, 10].map(mkMcq);
    let calls = 0;
    mockBuild.mockImplementation(async () => (++calls <= CALLS_PER_BUILD ? FIVE : NEXT));
    mount(5);
    await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
    await waitFor(() => expect(momentLine()).toBe(BYTE_LINE));
    fireEvent.click(screen.getByText("q1-correct"));
    await waitFor(() => expect(momentLine()).toBe(ZIGGY_LINE));
    expect(calls).toBe(CALLS_PER_BUILD); // one build so far
    fireEvent.click(screen.getByRole("button", { name: /^Refresh set$/i }));
    await waitFor(() => expect(calls).toBe(2 * CALLS_PER_BUILD));
    // the refreshed set really is different: the new questions on screen, the old ones gone
    await screen.findByText("Question 6: solve it.", {}, { timeout: 30000 });
    expect(screen.queryByText("Question 1: solve it.")).toBeNull();
    await act(async () => {});
    // (a) 0 answers on the new set: "Yes! 1 of 5" would be untrue, and Byte's ask is over
    expect(screen.queryByTestId("guide-moment-m3")).toBeNull();
    expect(screen.queryByText(ZIGGY_LINE)).toBeNull();
    expect(screen.queryByText(BYTE_LINE)).toBeNull();
    // (b) the NEW set's first question, tapped correctly, is exactly one recorded answer → Ziggy is true
    fireEvent.click(screen.getByText("q6-correct"));
    await waitFor(() => expect(momentLine()).toBe(ZIGGY_LINE));
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

describe("MOMENTS-1 M3 · the SERVER's zero-graded answer (owner ruling, 22 Oct)", () => {
  beforeEach(() => {
    resetZeroGradedCacheForTests(); // no answer kept from Home / the hub: this page must ask itself
  });

  it("★★ no kept answer, the server says zero graded → M3 (this page now asks the cloud, guide arm only)", async () => {
    cloudHas.mockReset().mockResolvedValue(false);
    await buildSet(FIVE);
    await waitFor(() => expect(momentLine()).toBe(BYTE_LINE));
    expect(cloudHas).toHaveBeenCalledTimes(1);
  });

  it("★★ graded work only in the cloud (local empty): no moment", async () => {
    cloudHas.mockReset().mockResolvedValue(true);
    await buildSet(FIVE);
    await waitFor(() => expect(cloudHas).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m3")).toBeNull();
  });

  it("★★ loading: nothing until the server answers", async () => {
    let answer: (v: boolean) => void = () => {};
    cloudHas.mockReset().mockReturnValue(new Promise<boolean>((r) => (answer = r)));
    await buildSet(FIVE);
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m3")).toBeNull();
    await act(async () => answer(false));
    await waitFor(() => expect(momentLine()).toBe(BYTE_LINE));
  });

  it("★★ CONTROL arm: this page still reads nothing new (no cloud ask)", async () => {
    __setGuideAbForTests(true, "control");
    cloudHas.mockReset().mockResolvedValue(false);
    await buildSet(FIVE);
    await act(async () => {});
    expect(cloudHas).not.toHaveBeenCalled();
  });
});

describe("MOMENTS-1 M11 · the first written answer nudge on the MCQ-only scorecard", () => {
  const M11_LINE =
    "Nice! Now write one answer in your notebook, snap a photo, and I'll show where marks slip — step by step, the way a CBSE examiner marks it.";
  async function finishTapOnly() {
    await buildSet(FIVE);
    for (let n = 1; n <= 5; n += 1) fireEvent.click(screen.getByText(`q${n}-correct`));
    const finish = screen.queryByRole("button", { name: /Finish session/i });
    if (finish) fireEvent.click(finish);
    await screen.findByRole("dialog", {}, { timeout: 10000 });
  }

  it("★★ guide arm, never a written answer graded (server says so): Byte (cheer) + 'Check a written answer' opens THIS set's working box (GUIDE-SCORE-2: never /check-improve)", async () => {
    await finishTapOnly();
    const m = await screen.findByTestId("guide-moment-m11", {}, { timeout: 5000 });
    expect(m.getAttribute("data-kind")).toBe("byte");
    expect(m.getAttribute("data-pose")).toBe("cheer");
    expect(m.querySelector('[data-testid="guide-moment-line"]')!.textContent).toBe(M11_LINE);
    const cta = screen.getByTestId("guide-moment-m11-cta");
    expect(cta.textContent).toBe("Check a written answer");
    expect(cta.tagName).toBe("BUTTON");
    expect(document.querySelector('a[href="/check-improve"]')).toBeNull();
    expect(writtenCloud).toHaveBeenCalledWith(UID);
    // The tap: back to the set, the FIRST question's working box open, scrolled to and focused.
    fireEvent.click(cta);
    const box = await waitFor(() => {
      const el = document.querySelector('[data-question-id="q-1"] [data-testid="practice-checker"]') as HTMLElement | null;
      expect(el).not.toBeNull();
      return el!;
    });
    await waitFor(() => expect(document.activeElement).toBe(box));
    expect(document.querySelectorAll('[data-testid="practice-checker"]').length).toBe(1);
    expect(screen.queryByTestId("guide-moment-m11")).toBeNull(); // the scorecard closed
  });

  it("★★ CONTROL arm: absent (and the server is not asked)", async () => {
    __setGuideAbForTests(true, "control");
    await finishTapOnly();
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m11")).toBeNull();
    expect(screen.queryByText(M11_LINE)).toBeNull();
    expect(writtenCloud).not.toHaveBeenCalled();
  });

  it("★★ a written answer was graded once (only in the cloud): absent", async () => {
    writtenCloud.mockResolvedValue(true);
    await finishTapOnly();
    await waitFor(() => expect(writtenCloud).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m11")).toBeNull();
  });

  it("★★ a written answer was graded on THIS device (a C&I record): absent, no read", async () => {
    localRows.mockReturnValue([{ id: "CI-M-REAL-01", surface: "check-improve", topicKeys: [], questionIds: [], gradedAt: 1 }]);
    await finishTapOnly();
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m11")).toBeNull();
    expect(writtenCloud).not.toHaveBeenCalled();
  });

  it("★★ the server read is pending, or fails: absent", async () => {
    writtenCloud.mockReturnValue(new Promise(() => {}));
    await finishTapOnly();
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m11")).toBeNull();
    cleanup();
    resetWrittenGradedForTests();
    writtenCloud.mockReset().mockResolvedValue(null);
    await finishTapOnly();
    await waitFor(() => expect(writtenCloud).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m11")).toBeNull();
  });

  it("once per account per device: the next MCQ-only result does not repeat it", async () => {
    await finishTapOnly();
    await screen.findByTestId("guide-moment-m11", {}, { timeout: 5000 });
    cleanup();
    await finishTapOnly();
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m11")).toBeNull();
  });
});

describe("MOMENTS-1 M11 · never on a WRITTEN result (delta FA)", () => {
  /** A written (3-mark) question: no options, so it is graded by the batch, never by a tap. */
  function mkWritten(n: number): PQ {
    return {
      id: `w-${n}`,
      questionText: `Question ${n}: solve it.`,
      marks: 3,
      section: "C",
      format: "vsa",
      difficulty: "Easy",
      subtopic: "seed",
      topicKey: "real-numbers",
    } as unknown as PQ;
  }

  it("★★ a set with a graded WRITTEN answer → the written-result scorecard never renders guide-moment-m11", async () => {
    const grader = vi.mocked(gradeWorksheet);
    grader.mockReset().mockResolvedValue({
      ok: true,
      results: [
        {
          qNumber: 5, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 2, percentage: 67,
          annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 }, teacherNote: "",
        },
      ],
      totalQuestions: 1, gradedCount: 1, pendingCount: 0, gradedMarksAwarded: 2, gradedMarksTotal: 3, worksheetTotalMarks: 3,
    } as never);
    await buildSet([mkMcq(1), mkMcq(2), mkMcq(3), mkMcq(4), mkWritten(5)]);
    fireEvent.click(screen.getByText("q1-correct")); // a tap too: the nudge's own condition (an MCQ answered) holds
    // the written answer, typed and saved on question 5
    const triggers = () => screen.getAllByRole("button", { name: /^(Answer this question|Hide answer box)$/ });
    fireEvent.click(triggers()[triggers().length - 1]);
    const tabs = screen.getAllByRole("tab", { name: "Type my working" });
    fireEvent.click(tabs[tabs.length - 1]);
    const boxes = screen.getAllByLabelText("Type your working and answer");
    await act(async () => {
      fireEvent.change(boxes[boxes.length - 1], { target: { value: "HCF = 2, so the answer is 2." } });
    });
    fireEvent.click(await screen.findByTestId("qp-save-answer"));
    await screen.findByTestId("qp-saved-confirmation");
    fireEvent.click(screen.getByRole("button", { name: /Finish session/i }));
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(grader).toHaveBeenCalledTimes(1));
    await screen.findByRole("dialog", {}, { timeout: 10000 });
    // Give the nudge every chance it would have (the server read, the claim, the lazy chunk): it never comes.
    await expect(screen.findByTestId("guide-moment-m11", {}, { timeout: 2000 })).rejects.toThrow();
    expect(screen.queryByText("Check a written answer")).toBeNull();
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
      expect(before).toBe(CALLS_PER_BUILD); // exactly the one failed build
      fireEvent.click(retry);
      await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
      await act(async () => {});
      // REVIEW F4: Retry runs EXACTLY ONE more build (+1 build = +CALLS_PER_BUILD section calls), never more
      expect(mockBuild.mock.calls.length).toBe(before + CALLS_PER_BUILD);
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
