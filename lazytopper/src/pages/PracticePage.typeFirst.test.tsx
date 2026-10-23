// SHW-2 (owner ruling, Oct 2026) - TYPE-FIRST DEFAULT in Quick Practice's answer box, on the REAL page
// (PracticePage -> PracticeQuestionList -> PracticeQuestionCard -> SolutionChecker). Both tabs always show;
// only the one selected at first changes:
//
//   * a Start-here WRITTEN set (src=start_here&qt=written) -> Type;
//   * a signed-in student with ZERO graded answers -> Type - from the answer the Start-here check already
//     has in this tab (no NEW cloud read on this page);
//   * the answer not known on this page (no kept answer) -> Upload (today's default);
//   * a student with graded work, or a signed-out visitor -> Upload (unchanged).
//
// ★ The harness of PracticePage.startHere.test.tsx.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

const { authUser, cloudHas, localRows } = vi.hoisted(() => ({
  authUser: { current: null as null | { uid: string; isLocalSession: boolean; email?: string } },
  cloudHas: vi.fn(),
  localRows: vi.fn(),
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

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";
import { gradeWorksheet } from "../ai/aiClient";
import { askCloudOnce, resetZeroGradedCacheForTests } from "../components/startHere/zeroGraded";

/** QP-WORKING-AFTER-1 — Finish with written questions that have no saved working opens the gate
 *  first; these flows test what comes AFTER it, so they take its "Skip — show my scorecard". */
function skipFinishGate() {
  const skip = screen.queryByTestId("qp-gate-skip");
  if (skip) fireEvent.click(skip);
}


const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;
const SIGNED_IN = { uid: "qp-new", isLocalSession: false, email: "s@x.com" };

function mkWritten(n: number): PQ {
  return {
    id: `w-${n}`,
    questionText: `Question ${n}: solve it.`,
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

async function open(url: string, pool: PQ[]) {
  mockBuild.mockResolvedValue(pool);
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
  fireEvent.click(screen.getAllByRole("button", { name: /^Answer this question$/ })[0]);
}
const selectedTab = () => {
  const tabs = [
    ...screen.getAllByRole("tab", { name: "Type my working" }),
    ...screen.getAllByRole("tab", { name: "Upload a photo" }),
  ];
  return tabs.filter((t) => t.getAttribute("aria-selected") === "true").map((t) => t.textContent);
};
const ORDINARY = "/practice/10/science?topic=electricity&count=3";
const POOL = [mkWritten(1), mkWritten(2), mkWritten(3)];

beforeEach(() => {
  resetZeroGradedCacheForTests();
  authUser.current = SIGNED_IN;
  cloudHas.mockReset().mockResolvedValue(false);
  localRows.mockReset().mockReturnValue([]);
});
afterEach(() => {
  cleanup();
  mockBuild.mockReset();
  vi.mocked(gradeWorksheet).mockReset();
  setMatchMediaMatches(false);
});

describe("SHW-2 · Quick Practice answer box - type-first", () => {
  it("★★ a Start-here written set -> Type", async () => {
    localRows.mockReturnValue([{ id: "x" }]); // even with graded work: the written set is typed
    await open(
      "/practice/10/science?topic=electricity&focusBankIds=w-1&strictFocus=true&count=1&src=start_here&qt=written",
      [mkWritten(1)],
    );
    expect(selectedTab()).toEqual(["Type my working"]);
  });

  it("★★ signed-in, zero graded (the Start-here check's kept answer) -> Type; NO new cloud read", async () => {
    await askCloudOnce(SIGNED_IN.uid); // the read Home / Practice Hub already made in this tab
    expect(cloudHas).toHaveBeenCalledTimes(1);
    await open(ORDINARY, POOL);
    expect(selectedTab()).toEqual(["Type my working"]);
    expect(cloudHas).toHaveBeenCalledTimes(1);
  });

  it("★★ signed-in, the answer not known on this page -> Upload, and this page reads nothing", async () => {
    await open(ORDINARY, POOL);
    expect(selectedTab()).toEqual(["Upload a photo"]);
    expect(cloudHas).not.toHaveBeenCalled();
  });

  it("★★ CONTROL: a student with graded work -> Upload", async () => {
    localRows.mockReturnValue([{ id: "x" }]);
    await open(ORDINARY, POOL);
    expect(selectedTab()).toEqual(["Upload a photo"]);
  });

  it("★★ SHW-3: after the first graded batch on THIS mount, the next answer box opens on Upload (local rows, no new read)", async () => {
    await askCloudOnce(SIGNED_IN.uid); // zero graded, as Home / the hub already read in this tab
    vi.mocked(gradeWorksheet).mockImplementation(async () => {
      // The graded batch's record lands on this device (writeSessionRecord's local row).
      localRows.mockReturnValue([{ id: "just-graded" }]);
      return {
        ok: true,
        results: [{ qNumber: 1, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 2, percentage: 67, annotatedSteps: [], teacherNote: "ok" }],
        totalQuestions: 1, gradedCount: 1, pendingCount: 0,
        gradedMarksAwarded: 2, gradedMarksTotal: 3, worksheetTotalMarks: 3,
      } as unknown as Awaited<ReturnType<typeof gradeWorksheet>>;
    });
    await open(ORDINARY, POOL); // Q1's box is open
    expect(selectedTab()).toEqual(["Type my working"]);
    const boxes = screen.getAllByLabelText("Type your working and answer");
    await act(async () => {
      fireEvent.change(boxes[boxes.length - 1], { target: { value: "R = V / I = 2 ohm" } });
    });
    fireEvent.click(await screen.findByTestId("qp-save-answer"));
    await screen.findByTestId("qp-saved-confirmation");
    fireEvent.click(screen.getByRole("button", { name: /Finish session/i })); skipFinishGate(); // QP-WORKING-AFTER-1 — past the gate
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByTestId("qp-grade-batch")).toBeNull()); // the graded sheet is up
    fireEvent.click(await screen.findByRole("button", { name: /Back to this set \(see the steps\)/ }));
    const triggers = await screen.findAllByRole("button", { name: /^Answer this question$/ });
    fireEvent.click(triggers[triggers.length - 1]); // an unanswered question's box
    expect(selectedTab()).toEqual(["Upload a photo"]);
    expect(cloudHas).toHaveBeenCalledTimes(1); // the recheck read no cloud
  });

  it("★ CONTROL: signed out -> Upload", async () => {
    authUser.current = null;
    await open(ORDINARY, POOL);
    expect(selectedTab()).toEqual(["Upload a photo"]);
    expect(cloudHas).not.toHaveBeenCalled();
  });
});
