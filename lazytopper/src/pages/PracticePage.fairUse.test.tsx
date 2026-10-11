// FAIR-USE-UI-1 — Quick Practice's ONE batched grade, on the REAL page through the REAL
// service and the REAL usage client. Only the network is stubbed: /api/usage/me (via
// fetch) and the grader seam (`gradeWorksheet`).
//
// ★ ONE ROUTER — the same single-MemoryRouter harness PracticePage.batchGrading.test.tsx
// uses; nothing here nests a second one.
// ★ Every "enforced" assertion has its dark twin: the SAME session with `enforced: false`
// must behave exactly as before this lane.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false, getToken: async () => "tok" }),
}));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: false, status: { tier: "trial" }, loading: false }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/adaptivePracticeEngine", () => ({
  computeAdaptiveDifficultyMix: () => undefined,
  getWrongConceptsForTopic: () => [],
  recordWrongAnswer: () => {},
}));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));
// The verified identity the usage read sends. (The grader itself is stubbed below.)
vi.mock("../ai/paidCallHeaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/paidCallHeaders")>();
  return {
    ...actual,
    paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" }),
  };
});

const { gradeWorksheet } = vi.hoisted(() => ({ gradeWorksheet: vi.fn() }));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, gradeWorksheet };
});
vi.mock("../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/mistakeIntelligence")>();
  return { ...actual, recordMistake: vi.fn(async () => ({ outcome: "logged", bridged: false })) };
});
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: () => "recorded",
}));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, writeSessionRecord: vi.fn(() => "recorded"), writeSessionPerQuestion: vi.fn() };
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
import { __resetUsageClientForTests } from "../services/usageClient";

const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;

const MIDNIGHT = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

function mkItem(n: number): PQ {
  return {
    id: `q-${n}`, questionText: `Question ${n}: solve it.`, marks: 3, section: "C", format: "vsa",
    difficulty: "Easy", subtopic: "seed", topicKey: "real-numbers",
  } as unknown as PQ;
}
const okGrade = (qNumber: number) => ({
  qNumber, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 2, percentage: 67,
  annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: "Good.",
});
const okBatch = (qs: number[]) => ({
  ok: true, results: qs.map(okGrade), totalQuestions: qs.length, gradedCount: qs.length, pendingCount: 0,
  gradedMarksAwarded: 2 * qs.length, gradedMarksTotal: 3 * qs.length, worksheetTotalMarks: 3 * qs.length,
});

function usageBody(enforced: boolean, checksLeftToday: number) {
  return {
    enforced,
    tier: "trial",
    trial: {
      checksLeftToday, chapterTestsLeftToday: 1, mocksLeft: 1, worksheetsLeft: 1,
      resets: { checks: MIDNIGHT, chapterTests: MIDNIGHT, mocks: null, worksheets: null },
      // FAIR-USE-3 R3: the server now sends its limits; the copy's "5" below is read from here.
      limits: { checksPerDay: 5, chapterTestsPerDay: 1, mocksPerWeek: 1, worksheetsPerWeek: 1 },
    },
    premium: null,
  };
}

let usageFetch: ReturnType<typeof vi.fn>;
function stubUsage(body: unknown) {
  usageFetch = vi.fn(async (url: string) =>
    String(url).includes("/api/usage/me")
      ? new Response(JSON.stringify(body), { status: 200 })
      : new Response("{}", { status: 404 }));
  vi.stubGlobal("fetch", usageFetch);
}

beforeEach(() => __resetUsageClientForTests());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  mockBuild.mockReset();
  gradeWorksheet.mockReset();
});

async function buildSet() {
  mockBuild.mockResolvedValue([mkItem(1), mkItem(2), mkItem(3)]);
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={["/practice/10/maths?topic=real-numbers&count=3"]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
      </Routes>
    </MemoryRouter>,
  );
  // (30 s: the page's lazy bank build can exceed the 1 s default on a loaded machine.)
  await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
}
const triggers = () => screen.getAllByRole("button", { name: /^(Answer this question|Hide answer box)$/ });
async function saveTypedFor(n: number) {
  fireEvent.click(triggers()[n - 1]);
  const tabs = screen.getAllByRole("tab", { name: "Type my working" });
  fireEvent.click(tabs[tabs.length - 1]);
  const boxes = screen.getAllByLabelText("Type your working and answer");
  await act(async () => {
    fireEvent.change(boxes[boxes.length - 1], { target: { value: `answer ${n}` } });
  });
  fireEvent.click(await screen.findByTestId("qp-save-answer"));
  await screen.findByTestId("qp-saved-confirmation");
  fireEvent.click(triggers()[n - 1]);
}
async function threeAnswersToConfirmStep() {
  await buildSet();
  await saveTypedFor(1);
  await saveTypedFor(2);
  await saveTypedFor(3);
  fireEvent.click(screen.getByRole("button", { name: /Finish session/i }));
  await screen.findByTestId("qp-grade-batch");
  // The mount read has landed before the student taps Grade.
  await waitFor(() => expect(usageFetch).toHaveBeenCalled());
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}
const sentQNumbers = (call: number) =>
  (gradeWorksheet.mock.calls[call][0] as { questions: { qNumber: number }[] }).questions.map((q) => q.qNumber);

describe("FAIR-USE-UI-1 · Quick Practice", () => {
  it("★★ UI2: 3 answers, 2 checks left -> the confirm, and EXACTLY the first 2 are sent", async () => {
    stubUsage(usageBody(true, 2));
    gradeWorksheet.mockResolvedValue(okBatch([1, 2]));
    await threeAnswersToConfirmStep();

    fireEvent.click(screen.getByTestId("qp-grade-batch"));
    const confirm = await screen.findByTestId("fair-use-confirm");
    expect(confirm.textContent).toContain("You have 2 checks left today — we'll mark the first 2.");
    // Asking is free: nothing was sent yet.
    expect(gradeWorksheet).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("fair-use-confirm-yes"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    expect(sentQNumbers(0)).toEqual([1, 2]);
  });

  it("★ UI2: cancelling sends nothing", async () => {
    stubUsage(usageBody(true, 2));
    await threeAnswersToConfirmStep();
    fireEvent.click(screen.getByTestId("qp-grade-batch"));
    fireEvent.click(await screen.findByRole("button", { name: "Not now" }));
    expect(screen.queryByTestId("fair-use-confirm")).toBeNull();
    expect(gradeWorksheet).not.toHaveBeenCalled();
  });

  it("★★ DARK: the SAME session with enforced:false sends all 3, no confirm, no panel", async () => {
    stubUsage(usageBody(false, 2));
    gradeWorksheet.mockResolvedValue(okBatch([1, 2, 3]));
    await threeAnswersToConfirmStep();
    fireEvent.click(screen.getByTestId("qp-grade-batch"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    expect(sentQNumbers(0)).toEqual([1, 2, 3]);
    expect(screen.queryByTestId("fair-use-confirm")).toBeNull();
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
  });

  it("★★ UI1 via R = 0: the limit panel, and NO grading call", async () => {
    stubUsage(usageBody(true, 0));
    await threeAnswersToConfirmStep();
    fireEvent.click(screen.getByTestId("qp-grade-batch"));
    const panel = await screen.findByTestId("fair-use-limit-panel");
    expect(panel.textContent).toContain("You've used today's 5 answer checks.");
    expect(screen.getByTestId("fair-use-see-plans").getAttribute("href")).toBe("/pricing");
    expect(gradeWorksheet).not.toHaveBeenCalled();
  });

  it("★★ UI1 on a refusal: the panel replaces the error box", async () => {
    stubUsage(usageBody(true, 5));
    gradeWorksheet.mockRejectedValue(Object.assign(new Error("limit"), {
      name: "FairUseLimitError", kind: "trial_limit", remaining: 0, resetAt: MIDNIGHT, window: null,
    }));
    await threeAnswersToConfirmStep();
    fireEvent.click(screen.getByTestId("qp-grade-batch"));
    await screen.findByTestId("fair-use-limit-panel");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(document.body.textContent).not.toMatch(/trial_limit|could not grade your answers/i);
  });

  it("★★ DARK refusal: the SAME error with enforced:false keeps today's error box", async () => {
    stubUsage(usageBody(false, 5));
    gradeWorksheet.mockRejectedValue(Object.assign(new Error("limit"), { name: "FairUseLimitError", kind: "trial_limit" }));
    await threeAnswersToConfirmStep();
    fireEvent.click(screen.getByTestId("qp-grade-batch"));
    expect((await screen.findByRole("alert")).textContent).toMatch(/could not grade your answers/i);
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
  });
});

describe("FAIR-USE-WARN-1 · the usage banner is mounted on Practice", () => {
  it("★★ enforced trial, 4 of 5 checks used → the banner with the server's counts", async () => {
    stubUsage(usageBody(true, 1));
    await buildSet();
    const banner = await screen.findByTestId("usage-warning");
    expect(banner.textContent).toContain("You've used 4 of today's 5 answer checks. They reset at midnight.");
    expect(screen.getByTestId("usage-warning-link").getAttribute("href")).toBe("/pricing");
  });
  it("★ DARK: enforced:false → no banner", async () => {
    stubUsage(usageBody(false, 1));
    await buildSet();
    await waitFor(() => expect(usageFetch).toHaveBeenCalled());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(screen.queryByTestId("usage-warning")).toBeNull();
  });
});
