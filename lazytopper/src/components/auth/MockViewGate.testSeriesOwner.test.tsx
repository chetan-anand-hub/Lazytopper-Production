import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// FREE-TS-WEEKLY: this file pins TODAY's daily gate / copy, which the kill switch VITE_FREE_TS_WEEKLY_DISABLED=1 restores exactly.
vi.hoisted(() => vi.stubEnv("VITE_FREE_TS_WEEKLY_DISABLED", "1"));
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * TS-DAILY-CAP-1 (launch blocker, live 19 Nov 2026 00:20 IST) — a Test Series Pack owner whose trial had ended opened
 * /full-mock/10/Maths?paper=2 after three chapter tests and met "Your Free Trial Has Ended — you've used your 3 papers for
 * today". A buyer must never meet that wall. These pin the gate's new branch against the REAL ownership module with only the
 * packs client (`fetchMyPacks`, GET /api/packs/mine) stubbed:
 *   - owner over the limit → the paper opens and is NOT counted;
 *   - non-owner over the limit → the existing wall;
 *   - ownership unknown → the neutral loading card (no wall flash, no paper), then it resolves;
 *   - read failed → the existing wall (fail closed);
 *   - premium / under-the-limit / anonymous → unchanged and never asked;
 *   - claimNewPaperView: an owner the gate confirmed is never refused (no NEW_PAPER_LIMIT_LINE).
 */

type TestUser = { uid: string; isLocalSession?: boolean } | null;
let currentUser: TestUser = null;
let premium = false;
let trialExpired = true;

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: currentUser, loading: false }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: premium ? "premium" : "free",
    isPremium: premium,
    isTrialActive: false,
    isTrialExpired: trialExpired,
    daysLeftInTrial: 0,
    status: { tier: premium ? "premium" : "free" },
    startTrial: () => {},
    upgradeToPremium: () => {},
  }),
}));

const fetchMyPacks = vi.fn();
vi.mock("../../services/packs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/packs")>();
  return { ...actual, fetchMyPacks: () => fetchMyPacks() };
});

import { MockViewGate, claimNewPaperView } from "./MockViewGate";
import { resetPaperCapOwnerForTests } from "./paperCapOwner";
import { SIGNED_IN_DAILY_MOCK_LIMIT } from "../../config/mockViewLimits";

const PAPER = "the series paper body";
const UID = "ts-owner-1";
const SERIES_FM = "/full-mock/10/Maths?paper=2";

const gate = (path: string) => (
  <MemoryRouter initialEntries={[path]}>
    <MockViewGate><div>{PAPER}</div></MockViewGate>
  </MemoryRouter>
);

function viewsToday(): number {
  const raw = localStorage.getItem(`lazytopper.dailyMockViews:${UID}`);
  return raw ? JSON.parse(raw).count ?? 0 : 0;
}

/** Spend today's allowance the way the student did (three chapter tests), through real gate mounts. */
function spendAllowance() {
  for (let i = 0; i < SIGNED_IN_DAILY_MOCK_LIMIT; i++) {
    const v = render(gate(`/chapter-test/10/maths/chapter-${i}`));
    expect(screen.queryByText(PAPER)).not.toBeNull();
    v.unmount();
  }
  expect(viewsToday()).toBe(SIGNED_IN_DAILY_MOCK_LIMIT);
}

const owned = () => Promise.resolve({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null, ownsTestSeries: true });
const notOwned = () => Promise.resolve({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetPaperCapOwnerForTests();
  fetchMyPacks.mockReset();
  currentUser = { uid: UID, isLocalSession: false };
  premium = false;
  trialExpired = true;
});
afterEach(cleanup);

describe("TS-DAILY-CAP-1 — the daily paper-open limit never walls a Test Series Pack owner", () => {
  it("★★ the live defect: an owner past 3 papers opens the series Full Mock — and it is NOT counted", async () => {
    fetchMyPacks.mockImplementation(owned);
    spendAllowance();
    expect(fetchMyPacks).not.toHaveBeenCalled(); // under the limit nobody is asked
    render(gate(SERIES_FM));
    expect(await screen.findByText(PAPER)).toBeTruthy();
    expect(document.body.textContent).not.toContain("Your Free Trial Has Ended");
    expect(viewsToday()).toBe(SIGNED_IN_DAILY_MOCK_LIMIT);
    expect(fetchMyPacks).toHaveBeenCalledTimes(1);
  });

  it("an owner is uncapped on every gated paper route, not only series papers (a chapter test, a fresh mock, a mock paper)", async () => {
    fetchMyPacks.mockImplementation(owned);
    spendAllowance();
    for (const path of ["/chapter-test/10/maths/real-numbers?series=1", "/full-mock/10/Science", "/mock-paper/some-paper"]) {
      const v = render(gate(path));
      expect(await screen.findByText(PAPER)).toBeTruthy();
      v.unmount();
    }
    expect(viewsToday()).toBe(SIGNED_IN_DAILY_MOCK_LIMIT);
  });

  it("★ CONTROL: a NON-owner over the limit meets the existing wall, exactly as before", async () => {
    fetchMyPacks.mockImplementation(notOwned);
    spendAllowance();
    render(gate(SERIES_FM));
    expect(await screen.findByText("Your Free Trial Has Ended")).toBeTruthy();
    expect(screen.queryByText(PAPER)).toBeNull();
    expect(viewsToday()).toBe(SIGNED_IN_DAILY_MOCK_LIMIT);
  });

  it("★ ownership UNKNOWN: a neutral loading card — no wall flash, no paper — then it resolves", async () => {
    let answer: (v: unknown) => void = () => {};
    fetchMyPacks.mockImplementation(() => new Promise((res) => { answer = res; }));
    spendAllowance();
    render(gate(SERIES_FM));
    // Let the lazy import and the request start; the read has not answered.
    await act(async () => { await Promise.resolve(); await new Promise((r) => setTimeout(r, 0)); });
    expect(screen.queryByText(PAPER)).toBeNull();
    expect(document.body.textContent).not.toContain("Your Free Trial Has Ended");
    expect(document.body.textContent).not.toContain("Mock Paper Limit Reached");
    expect(screen.getByText("Loading...")).toBeTruthy();
    await act(async () => { answer({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null, ownsTestSeries: true }); });
    expect(await screen.findByText(PAPER)).toBeTruthy();
    expect(viewsToday()).toBe(SIGNED_IN_DAILY_MOCK_LIMIT);
  });

  it("★ read FAILED: fail closed — the existing wall, never 'owner'", async () => {
    fetchMyPacks.mockImplementation(() => Promise.reject(new Error("request failed: 500")));
    spendAllowance();
    render(gate(SERIES_FM));
    expect(await screen.findByText("Your Free Trial Has Ended")).toBeTruthy();
    expect(screen.queryByText(PAPER)).toBeNull();
  });

  it("a failed read is not remembered: the next visit asks again and an owner gets through", async () => {
    fetchMyPacks.mockImplementationOnce(() => Promise.reject(new Error("offline"))).mockImplementation(owned);
    spendAllowance();
    const v = render(gate(SERIES_FM));
    expect(await screen.findByText("Your Free Trial Has Ended")).toBeTruthy();
    v.unmount();
    render(gate(SERIES_FM));
    expect(await screen.findByText(PAPER)).toBeTruthy();
  });

  it("PREMIUM: unchanged — unlimited and never asked", () => {
    premium = true;
    trialExpired = false;
    fetchMyPacks.mockImplementation(owned);
    for (let i = 0; i < SIGNED_IN_DAILY_MOCK_LIMIT + 3; i++) {
      const v = render(gate(SERIES_FM));
      expect(screen.queryByText(PAPER)).not.toBeNull();
      v.unmount();
    }
    expect(fetchMyPacks).not.toHaveBeenCalled();
  });

  it("ANONYMOUS: unchanged — walled at 1 without asking anyone", () => {
    currentUser = null;
    fetchMyPacks.mockImplementation(owned);
    render(gate(SERIES_FM)).unmount();
    render(gate(SERIES_FM));
    expect(screen.getByText("Sign in to View More")).toBeTruthy();
    expect(fetchMyPacks).not.toHaveBeenCalled();
  });

  it("claimNewPaperView: an owner the gate confirmed is never refused (no NEW_PAPER_LIMIT_LINE), and not counted", async () => {
    fetchMyPacks.mockImplementation(owned);
    spendAllowance();
    render(gate(SERIES_FM));
    expect(await screen.findByText(PAPER)).toBeTruthy();
    // A resume mark for another route, as CT-RESUME-2 would leave it.
    const route = "/full-mock/10/science";
    sessionStorage.setItem("lazytopper.dailyMockViews.uncounted", JSON.stringify([route]));
    expect(claimNewPaperView(route, UID, false)).toBe(true);
    expect(viewsToday()).toBe(SIGNED_IN_DAILY_MOCK_LIMIT);
  });

  it("★ a RESUME at the limit is never held, and warms ownership so 'start a fresh test instead' is not refused for an owner", async () => {
    fetchMyPacks.mockImplementation(owned);
    spendAllowance();
    const route = "/chapter-test/10/science/carbon-and-its-compounds";
    // What ChapterTestPage's autosave writes while a test is being taken (as in MockViewGate.resume.test.tsx).
    sessionStorage.setItem(
      "lazytopper.ct.progress.CT-S-CAIC-02",
      JSON.stringify({ answers: { 1: "x" }, flags: [], elapsed: 60, currentQNumber: 2, timerEnabled: true, paper: { worksheetId: "ct-1", questions: [{ qNumber: 1, id: "q1", section: "A", marks: 1 }] }, route }),
    );
    render(gate(route));
    expect(screen.queryByText(PAPER)).not.toBeNull(); // synchronously: a resume never waits
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(fetchMyPacks).toHaveBeenCalledTimes(1);
    // The page passes only isPremium (false): the gate's warmed verdict is what lets the owner through.
    expect(claimNewPaperView(route, UID, false)).toBe(true);
    expect(viewsToday()).toBe(SIGNED_IN_DAILY_MOCK_LIMIT);
  });

  it("claimNewPaperView: `uncapped` (Premium or a Test Series owner, from the page) is never refused; a non-owner still is", () => {
    spendAllowance();
    const route = "/full-mock/10/science";
    sessionStorage.setItem("lazytopper.dailyMockViews.uncounted", JSON.stringify([route]));
    expect(claimNewPaperView(route, UID, false)).toBe(false);
    expect(claimNewPaperView(route, UID, true)).toBe(true);
    expect(viewsToday()).toBe(SIGNED_IN_DAILY_MOCK_LIMIT);
  });
});


beforeEach(() => {
  vi.stubEnv("VITE_FREE_TS_WEEKLY_DISABLED", "1");
});
