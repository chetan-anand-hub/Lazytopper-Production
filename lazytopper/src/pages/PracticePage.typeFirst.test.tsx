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
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
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
import { askCloudOnce, resetZeroGradedCacheForTests } from "../components/startHere/zeroGraded";

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

  it("★ CONTROL: signed out -> Upload", async () => {
    authUser.current = null;
    await open(ORDINARY, POOL);
    expect(selectedTab()).toEqual(["Upload a photo"]);
    expect(cloudHas).not.toHaveBeenCalled();
  });
});
