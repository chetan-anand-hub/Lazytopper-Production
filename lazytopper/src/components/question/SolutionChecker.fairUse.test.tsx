import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * FAIR-USE-3 R4 — SolutionChecker shows the fair-use limit panel on a fair-use refusal,
 * exactly like every other grading surface, and NOTHING ELSE about its errors changes.
 *
 *   1. ENFORCED + FairUseLimitError  -> the FairUseLimitPanel, and no red error string;
 *   2. DARK (enforced:false) + the SAME error -> the existing error path, word for word,
 *      and no panel (the ship state: FAIR_USE_ENFORCE unset);
 *   3. every other error (generic, DailyLimitError-shaped, 500) -> the existing error
 *      string, no panel, and NO usage read at all;
 *   4. a successful grade -> no panel, and no usage read on mount (enabled=false).
 *
 * Mocks mirror SolutionChecker.entitlement.test.tsx's set. The usage client is REAL; only
 * the network is stubbed (/api/usage/me via fetch) and paidCallHeaders (the identity).
 * The error is built by NAME, not by importing the class: aiClient is mocked as a
 * complete replacement here, as in the contract suite.
 */

const checkSolutionImage = vi.fn();
const recordMistake = vi.fn();
const recordAttempt = vi.fn();

vi.mock("../../ai/aiClient", () => ({
  checkSolutionImage: (...args: unknown[]) => checkSolutionImage(...args),
}));

vi.mock("../../ai/paidCallHeaders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../ai/paidCallHeaders")>()),
  paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "test-uid", Authorization: "Bearer tok" }),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "test-uid", isLocalSession: false } }),
}));

// Trial counts as premium for the grading CTA (isPremiumAccess). See the entitlement suite.
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "trial",
    isPremium: true,
    isTrialActive: true,
    isTrialExpired: false,
    daysLeftInTrial: 3,
    status: { tier: "trial" },
    startTrial: () => {},
    upgradeToPremium: () => {},
  }),
}));

vi.mock("../../services/mistakeIntelligence", () => ({
  recordMistake: (...args: unknown[]) => recordMistake(...args),
  isSavedOutcome: (outcome: string) => outcome === "logged" || outcome === "duplicate",
}));

vi.mock("../../services/practiceInsights", () => ({
  recordAttempt: (...args: unknown[]) => recordAttempt(...args),
}));

vi.mock("../qr/QrAnswerHandoff", () => ({
  default: () => <div data-testid="qr-handoff" />,
}));

import { SolutionChecker } from "./SolutionChecker";
import { __resetUsageClientForTests } from "../../services/usageClient";

const MIDNIGHT = "2026-09-28T18:30:00.000Z";

function usageBody(enforced: boolean, checksPerDay = 5) {
  return {
    enforced,
    tier: "trial",
    trial: {
      checksLeftToday: 0, chapterTestsLeftToday: 1, mocksLeft: 1, worksheetsLeft: 1,
      resets: { checks: MIDNIGHT, chapterTests: MIDNIGHT, mocks: null, worksheets: null },
      limits: { checksPerDay, chapterTestsPerDay: 1, mocksPerWeek: 1, worksheetsPerWeek: 1 },
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

const usageCalls = () => usageFetch.mock.calls.filter(([u]) => String(u).includes("/api/usage/me")).length;

/** The error FAIR-USE-2's aiClient throws for a 409 trial_limit (#860), by its fields. */
function fairUseError() {
  return Object.assign(new Error("trial_limit"), {
    name: "FairUseLimitError", kind: "trial_limit", remaining: 0, resetAt: MIDNIGHT, window: null,
  });
}

function renderChecker() {
  return render(
    <MemoryRouter>
      <SolutionChecker question="Solve x + 1 = 2" marks={2} subject="Maths" topic="linear-equations" />
    </MemoryRouter>,
  );
}

async function typeAndCheck() {
  fireEvent.click(screen.getByRole("tab", { name: "Type my working" }));
  fireEvent.change(screen.getByLabelText("Type your working and answer"), { target: { value: "x = 1" } });
  fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));
  await waitFor(() => expect(checkSolutionImage).toHaveBeenCalledTimes(1));
}

const panel = () => screen.queryByTestId("fair-use-limit-panel");

beforeEach(() => {
  localStorage.clear();
  __resetUsageClientForTests();
  checkSolutionImage.mockReset();
  recordMistake.mockReset();
  recordAttempt.mockReset();
  recordMistake.mockResolvedValue({ outcome: "logged", bridged: false });
  recordAttempt.mockReturnValue("logged");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("R4 · SolutionChecker — a fair-use refusal renders the FairUseLimitPanel", () => {
  it("★★ ENFORCED: the panel with the server's own number, and no red error string", async () => {
    stubUsage(usageBody(true, 6));
    checkSolutionImage.mockRejectedValue(fairUseError());
    renderChecker();
    await typeAndCheck();
    const p = await screen.findByTestId("fair-use-limit-panel");
    expect(p.textContent).toContain("You've used today's 6 answer checks.");
    expect(p.textContent).toContain("Premium removes the daily limit.");
    expect(screen.queryByText("trial_limit")).toBeNull();
    expect(p.textContent).not.toMatch(/trial_limit|\b409\b/);
    // Dismissable, like the other surfaces' panels.
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(panel()).toBeNull();
  });

  it("★★ DARK (enforced:false — the ship state): the SAME refusal takes the existing error path, and no panel", async () => {
    stubUsage(usageBody(false));
    checkSolutionImage.mockRejectedValue(fairUseError());
    renderChecker();
    await typeAndCheck();
    // Exactly today's behaviour: the error's own message in the error box.
    expect(await screen.findByText("trial_limit")).toBeInTheDocument();
    expect(panel()).toBeNull();
  });

  it("★★ every OTHER error is unchanged: its message, no panel, and NO usage read", async () => {
    const others: Error[] = [
      new Error("Failed to grade the worksheet. Please try again."),
      Object.assign(new Error("You've hit today's limit for this. It resets tomorrow."), { name: "DailyLimitError" }),
      Object.assign(new Error("Grading is busy"), { name: "SomethingElse" }),
    ];
    for (const err of others) {
      cleanup();
      __resetUsageClientForTests();
      stubUsage(usageBody(true));
      checkSolutionImage.mockReset();
      checkSolutionImage.mockRejectedValue(err);
      renderChecker();
      await typeAndCheck();
      expect(await screen.findByText(err.message)).toBeInTheDocument();
      expect(panel()).toBeNull();
      expect(usageCalls()).toBe(0);
    }
  });

  it("★ a non-Error rejection keeps its generic fallback string", async () => {
    stubUsage(usageBody(true));
    checkSolutionImage.mockRejectedValue("boom");
    renderChecker();
    await typeAndCheck();
    // LOW-END-1 R2: the fallback is a plain sentence now (was "Failed to check solution").
    expect(
      await screen.findByText("We couldn't check your answer just now. Your answer is still here — please try again."),
    ).toBeInTheDocument();
    expect(panel()).toBeNull();
  });

  it("★ a successful grade: no panel, and no usage read (not on mount, not after)", async () => {
    stubUsage(usageBody(true));
    checkSolutionImage.mockResolvedValue({
      ok: true, marksAwarded: 2, totalMarks: 2, steps: [], summary: "Correct", feedback: "",
    });
    renderChecker();
    expect(usageCalls()).toBe(0);
    await typeAndCheck();
    await waitFor(() => expect(recordMistake).toHaveBeenCalled());
    expect(panel()).toBeNull();
    expect(usageCalls()).toBe(0);
  });
});
