// FAIR-USE-UI-1 · Check & Improve (single + whole paper) on the REAL page. Only the
// network is stubbed: /api/usage/me (fetch) and the three grading calls (spies on the
// real aiClient module, every other export kept). Each enforced case has a dark twin.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const H = vi.hoisted(() => ({
  detectQuestion: vi.fn(),
  checkSolutionImage: vi.fn(),
  gradeWorksheet: vi.fn(),
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

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import { __resetUsageClientForTests } from "../../services/usageClient";

const MIDNIGHT = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

const THREE_QUESTIONS = {
  ok: true, detectedMarks: 2, detectedSubject: "Maths", detectedTopic: "real-numbers", marksSource: "stated",
  questions: [
    { questionNumber: 1, questionText: "Q-A", marks: 2, marksSource: "stated" },
    { questionNumber: 2, questionText: "Q-B", marks: 3, marksSource: "stated" },
    { questionNumber: 3, questionText: "Q-C", marks: 3, marksSource: "stated" },
  ],
};
const ONE_QUESTION = { ...THREE_QUESTIONS, questions: [THREE_QUESTIONS.questions[0]] };

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

beforeEach(() => {
  __resetUsageClientForTests();
  H.detectQuestion.mockReset();
  H.checkSolutionImage.mockReset();
  H.gradeWorksheet.mockReset().mockRejectedValue(new Error("stop here"));
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
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(usageFetch).toHaveBeenCalled());
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: "Three questions" } });
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

describe("FAIR-USE-UI-1 · Check & Improve", () => {
  it("★★ UI2 whole paper: 3 questions, 2 checks left -> confirm, then EXACTLY Q1 and Q2 are sent", async () => {
    stubUsage(usageBody(true, 2));
    H.detectQuestion.mockResolvedValue(THREE_QUESTIONS);
    const grade = await readAndUpload();
    fireEvent.click(grade);
    const confirm = await screen.findByTestId("fair-use-confirm");
    expect(confirm.textContent).toContain("You have 2 checks left today — we'll mark the first 2.");
    expect(H.gradeWorksheet).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("fair-use-confirm-yes"));
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    expect(sentQNumbers()).toEqual([1, 2]);
  });

  it("★★ DARK: the SAME paper with enforced:false sends all 3, no confirm", async () => {
    stubUsage(usageBody(false, 2));
    H.detectQuestion.mockResolvedValue(THREE_QUESTIONS);
    const grade = await readAndUpload();
    fireEvent.click(grade);
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    expect(sentQNumbers()).toEqual([1, 2, 3]);
    expect(screen.queryByTestId("fair-use-confirm")).toBeNull();
  });

  it("★★ UI1 single question: a refusal shows the panel, not 'Grading unavailable'", async () => {
    stubUsage(usageBody(true, 5));
    H.detectQuestion.mockResolvedValue(ONE_QUESTION);
    H.checkSolutionImage.mockRejectedValue(Object.assign(new Error("limit"), {
      name: "FairUseLimitError", kind: "trial_limit", remaining: 0, resetAt: MIDNIGHT, window: null,
    }));
    const grade = await readAndUpload();
    fireEvent.click(grade);
    const panel = await screen.findByTestId("fair-use-limit-panel");
    expect(panel.textContent).toContain("You've used today's 5 answer checks.");
    expect(document.body.textContent).not.toContain("Grading unavailable");
  });

  it("★★ DARK single question: the SAME refusal with enforced:false keeps today's error", async () => {
    stubUsage(usageBody(false, 5));
    H.detectQuestion.mockResolvedValue(ONE_QUESTION);
    H.checkSolutionImage.mockRejectedValue(Object.assign(new Error("limit"), { name: "FairUseLimitError", kind: "trial_limit" }));
    const grade = await readAndUpload();
    fireEvent.click(grade);
    await waitFor(() => expect(document.body.textContent).toContain("Grading unavailable — please try again."));
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
  });
});
