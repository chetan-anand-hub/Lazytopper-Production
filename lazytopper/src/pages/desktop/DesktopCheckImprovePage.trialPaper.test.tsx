/**
 * TRIAL-PAPER-1 · a trial student's whole Check & Improve paper, on the REAL page.
 * Owner ruling 2026-10-07 (e): a free user's paper grades its FIRST 5 questions, with a
 * clear upgrade note (honest, no fake premium).
 *
 * Only the network edges are stubbed: /api/usage/me (fetch), the grading calls (spies on
 * the real aiClient module) and the account writes a signed-in grade makes.
 *
 * Pinned:
 *   (1) 38-Q trial paper, 5 checks left -> EXACTLY Q1..Q5 sent; Q6..Q38 (33) listed
 *       "Not graded" under the honest free-plan note + See plans (/pricing); the head and
 *       the scorecard both say 5 of 38; nothing after Q5 is recorded as a mistake.
 *   (2) 3 checks left -> Q1..Q3 sent, the note names the real count ("you had 3 checks").
 *   (3) 0 checks left -> today's limit panel, nothing sent, no note (unchanged).
 *   (4) premium -> the whole paper sent, no confirm, no note.
 *   (5) DARK control (enforced:false) -> the whole paper, no note.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const H = vi.hoisted(() => ({
  detectQuestion: vi.fn(),
  checkSolutionImage: vi.fn(),
  gradeWorksheet: vi.fn(),
  recordMistake: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1", email: null, phoneNumber: "+919000000000", displayName: null }, loading: false }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: true, isTrialExpired: false, hydrated: true, tier: "trial", isTrialActive: true, daysLeftInTrial: 5,
    startTrial: vi.fn(), upgradeToPremium: vi.fn(),
    status: { tier: "trial", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
  }),
}));
vi.mock("../../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
vi.mock("../../ai/paidCallHeaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/paidCallHeaders")>();
  return { ...actual, paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "u1", Authorization: "Bearer tok" }) };
});
vi.mock("../../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/aiClient")>();
  return {
    ...actual,
    detectQuestion: (...a: unknown[]) => H.detectQuestion(...a),
    checkSolutionImage: (...a: unknown[]) => H.checkSolutionImage(...a),
    gradeWorksheet: (...a: unknown[]) => H.gradeWorksheet(...a),
  };
});
vi.mock("../../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/mistakeIntelligence")>();
  return {
    ...actual,
    recordMistake: (...a: unknown[]) => {
      H.recordMistake(...a);
      return Promise.resolve({ outcome: "logged", bridged: false });
    },
  };
});
vi.mock("../../services/practiceInsights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/practiceInsights")>();
  return { ...actual, recordAttempt: () => "recorded" };
});
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    ensureCheckImproveSessionCode: () => Promise.resolve({ code: "CI-M-REAL-02", name: "Real Numbers · Paper #2", sequence: 2 }),
    getSessionRecordsFromCloud: () => Promise.resolve([]),
  };
});
vi.mock("../../services/checkImproveGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/checkImproveGradeService")>();
  return { ...actual, persistCheckImproveSession: () => "recorded" };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import { __resetUsageClientForTests } from "../../services/usageClient";

const MIDNIGHT = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

const PAPER_38 = {
  ok: true, detectedMarks: 2, detectedSubject: "Maths", detectedTopic: "real-numbers", marksSource: "stated",
  questions: Array.from({ length: 38 }, (_, i) => ({
    questionNumber: i + 1, questionText: `Question ${i + 1}`, marks: 2, marksSource: "stated",
  })),
};

/** The grader's answer for exactly what was SENT: each sent question 1/2, one conceptual mistake. */
function gradedFor(req: { questions: { qNumber: number }[] }) {
  const results = req.questions.map((q) => ({
    qNumber: q.qNumber, couldNotRead: false, totalMarks: 2, ok: true, marksAwarded: 1, percentage: 50,
    annotatedSteps: [], mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "",
  }));
  return {
    ok: true, results, totalQuestions: results.length, gradedCount: results.length, pendingCount: 0,
    gradedMarksAwarded: results.length, gradedMarksTotal: results.length * 2, worksheetTotalMarks: results.length * 2,
  };
}

function trialUsage(enforced: boolean, checksLeftToday: number) {
  return {
    enforced,
    tier: "trial",
    trial: {
      checksLeftToday, chapterTestsLeftToday: 1, mocksLeft: 1, worksheetsLeft: 1,
      resets: { checks: MIDNIGHT, chapterTests: MIDNIGHT, mocks: null, worksheets: null },
      limits: { checksPerDay: 5, chapterTestsPerDay: 1, mocksPerWeek: 1, worksheetsPerWeek: 1 },
    },
    premium: null,
  };
}
const PREMIUM_USAGE = {
  enforced: true,
  tier: "premium",
  trial: null,
  premium: { fiveHourPct: 10, dayPct: 10, weekPct: 10, resets: { fiveHour: MIDNIGHT, day: MIDNIGHT, week: MIDNIGHT } },
};

let usageFetch: ReturnType<typeof vi.fn>;
function stubUsage(body: unknown) {
  usageFetch = vi.fn(async (url: string) =>
    String(url).includes("/api/usage/me")
      ? new Response(JSON.stringify(body), { status: 200 })
      : new Response("{}", { status: 404 }));
  vi.stubGlobal("fetch", usageFetch);
}

beforeEach(() => {
  __resetUsageClientForTests();
  H.detectQuestion.mockReset().mockResolvedValue(PAPER_38);
  H.checkSolutionImage.mockReset();
  H.recordMistake.mockReset();
  H.gradeWorksheet.mockReset().mockImplementation(async (req: { questions: { qNumber: number }[] }) => gradedFor(req));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function readAndUpload() {
  const view = render(
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage />} />
        <Route path="/pricing" element={<div data-testid="pricing-probe" />} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(usageFetch).toHaveBeenCalled());
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: "A 38-question paper" } });
  fireEvent.click(screen.getByRole("button", { name: /Read the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
  const answerInput = view.container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
  fireEvent.change(answerInput, { target: { files: [new File(["png-bytes"], "answers.png", { type: "image/png" })] } });
  const grade = await screen.findByRole("button", { name: /Grade my answer/ });
  await waitFor(() => expect(grade).not.toBeDisabled());
  return grade;
}
const sentQNumbers = () =>
  (H.gradeWorksheet.mock.calls[0][0] as { questions: { qNumber: number }[] }).questions.map((q) => q.qNumber);
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const notGradedLabels = () =>
  within(screen.getByTestId("trial-paper-not-graded"))
    .getAllByRole("listitem")
    .map((li) => li.querySelector(".lt-usage__notgraded-q")?.textContent);

async function confirmFirst(n: number) {
  const confirm = await screen.findByTestId("fair-use-confirm");
  expect(confirm.textContent).toContain(`You have ${n} ${n === 1 ? "check" : "checks"} left today — we'll mark the first ${n}.`);
  expect(H.gradeWorksheet).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId("fair-use-confirm-yes"));
  await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
}

describe("TRIAL-PAPER-1 · a trial paper grades its FIRST questions, honestly", () => {
  it("★★ 38-Q trial paper, 5 checks left -> Q1..Q5 sent; Q6..Q38 'Not graded' + the upgrade note", async () => {
    stubUsage(trialUsage(true, 5));
    fireEvent.click(await readAndUpload());
    await confirmFirst(5);
    expect(sentQNumbers()).toEqual([1, 2, 3, 4, 5]);

    const note = await screen.findByTestId("trial-paper-note");
    expect(note.textContent).toContain("Free plan: we graded the first 5 questions.");
    expect(note.textContent).toContain(
      "The other 33 questions were not graded — no marks, and nothing added to your score, progress or mistakes.",
    );
    expect(note.textContent).toContain("Premium grades the whole paper.");
    expect(notGradedLabels()).toEqual(range(6, 38).map((n) => `Q${n}`));
    // Not-graded rows carry no mark: no "/2" and no mistake chip inside the note.
    expect(note.textContent).not.toMatch(/\/2|Concept/);

    // The head and the scorecard count the WHOLE paper: 5 of 38, never "5/5".
    expect(document.body.textContent).toContain("5/38 graded");
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toMatch(/5\s*of\s*38/);
    expect(dialog.textContent).toContain("Free plan: we graded the first 5 questions. Premium grades the whole paper.");

    // Nothing after Q5 is ever recorded as a mistake.
    await waitFor(() => expect(H.recordMistake.mock.calls.length).toBeGreaterThan(0));
    expect(H.recordMistake.mock.calls.length).toBeLessThanOrEqual(5);

    // The upgrade link is the EXISTING plans route (no payment, no activation).
    const plans = screen.getByTestId("trial-paper-see-plans");
    expect(plans.getAttribute("href")).toBe("/pricing");
  });

  it("★★ 3 checks left -> Q1..Q3 sent, and the note names the real count", async () => {
    stubUsage(trialUsage(true, 3));
    fireEvent.click(await readAndUpload());
    await confirmFirst(3);
    expect(sentQNumbers()).toEqual([1, 2, 3]);
    const note = await screen.findByTestId("trial-paper-note");
    expect(note.textContent).toContain("Free plan: you had 3 checks left today, so we graded the first 3 questions.");
    expect(note.textContent).toContain("The other 35 questions were not graded");
    expect(notGradedLabels()).toEqual(range(4, 38).map((n) => `Q${n}`));
  });

  it("★★ 0 checks left -> today's limit panel, nothing sent, no note", async () => {
    stubUsage(trialUsage(true, 0));
    fireEvent.click(await readAndUpload());
    const panel = await screen.findByTestId("fair-use-limit-panel");
    expect(panel.textContent).toContain("You've used today's 5 answer checks.");
    expect(H.gradeWorksheet).not.toHaveBeenCalled();
    expect(screen.queryByTestId("fair-use-confirm")).toBeNull();
    expect(screen.queryByTestId("trial-paper-note")).toBeNull();
  });

  it("★★ premium -> the whole paper is sent, no confirm, no note", async () => {
    stubUsage(PREMIUM_USAGE);
    fireEvent.click(await readAndUpload());
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    expect(sentQNumbers()).toEqual(range(1, 38));
    await screen.findByRole("dialog");
    expect(screen.queryByTestId("fair-use-confirm")).toBeNull();
    expect(screen.queryByTestId("trial-paper-note")).toBeNull();
    expect(document.body.textContent).toContain("38/38 graded");
    expect(document.body.textContent).not.toContain("Free plan");
  });

  it("★★ DARK control (enforced:false) -> the whole paper, no note", async () => {
    stubUsage(trialUsage(false, 5));
    fireEvent.click(await readAndUpload());
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    expect(sentQNumbers()).toEqual(range(1, 38));
    await screen.findByRole("dialog");
    expect(screen.queryByTestId("trial-paper-note")).toBeNull();
  });
});
