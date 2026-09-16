import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * AUTH-GATE-MOVE-1 — `MockViewGate` is a per-DAY, two-tier view limit.
 *
 * It used to be 1 per WEEK while `App.tsx`'s own route comment claimed 1 per day: the
 * code and its documentation disagreed. It is now genuinely per-day — anonymous 1,
 * signed-in free 3, premium unlimited.
 *
 * ★★ THE TWO HALVES THAT MUST BOTH HOLD, AND WHY NEITHER ALONE IS ENOUGH:
 *
 *   · A FRESH context must ALWAYS render. Googlebot carries no `localStorage`, so it
 *     reads as a first-time visitor on every single fetch. This is why the chapter pages
 *     are indexed at all, and a limit that can fire on a fresh context breaks indexing.
 *   · The limit must ACTUALLY FIRE once the allowance is spent in that same context.
 *     A limit that never fires is not a limit, and "a fresh context renders" would pass
 *     trivially against a gate that had been deleted outright.
 *
 * Asserting only the first would let a no-op gate through; asserting only the second
 * would let a crawler-hostile gate through. Both are pinned below.
 */

type TestUser = { uid: string; isLocalSession?: boolean } | null;
let currentUser: TestUser = null;
let premium = false;
let trialExpired = false;

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

import { MockViewGate } from "./MockViewGate";

const PAPER = "the mock paper body";

/**
 * One visit in the SAME browser context: mount, observe, unmount.
 *
 * The gate counts once per MOUNT (`incrementedRef`), so each visit needs its own mount —
 * and the unmount is what makes the next call a genuinely separate visit rather than a
 * re-render. Whatever the gate put on screen is captured into `lastScreen` BEFORE the
 * unmount, because querying the DOM afterwards inspects an empty body and would make any
 * "the wall says X" assertion silently unfalsifiable.
 */
let lastScreen = "";

function visit(): boolean {
  const view = render(
    <MemoryRouter>
      <MockViewGate><div>{PAPER}</div></MockViewGate>
    </MemoryRouter>,
  );
  const rendered = screen.queryByText(PAPER) !== null;
  lastScreen = document.body.textContent || "";
  view.unmount();
  return rendered;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  currentUser = null;
  premium = false;
  trialExpired = false;
  lastScreen = "";
});
afterEach(cleanup);

describe("MockViewGate — the crawler guarantee", () => {
  it("★ A FRESH CONTEXT ALWAYS RENDERS — this is why the chapter pages are indexed", () => {
    // Empty localStorage is exactly what Googlebot presents on every fetch.
    expect(localStorage.length).toBe(0);
    expect(visit()).toBe(true);
  });

  it("★ CONTROL: in that SAME context the limit DOES fire — it is a real limit", () => {
    expect(visit()).toBe(true);   // paper 1 — the free anonymous view
    expect(visit()).toBe(false);  // paper 2 — walled
    expect(lastScreen).toContain("Sign in to View More");
  });

  it("a fresh context AFTER a walled one renders again (storage is the only memory)", () => {
    visit();
    expect(visit()).toBe(false);
    // A different crawler fetch = a different empty context.
    localStorage.clear();
    sessionStorage.clear();
    expect(visit()).toBe(true);
  });
});

describe("MockViewGate — the tiers the owner published", () => {
  it("ANONYMOUS: 1 a day — paper 2 the same day is walled", () => {
    expect(visit()).toBe(true);
    expect(visit()).toBe(false);
  });

  it("SIGNED-IN FREE: 3 a day — papers 1-3 open, the 4th is walled", () => {
    currentUser = { uid: "u-signed-in", isLocalSession: false };
    expect(visit()).toBe(true);   // 1
    expect(visit()).toBe(true);   // 2
    expect(visit()).toBe(true);   // 3
    expect(visit()).toBe(false);  // 4
    expect(lastScreen).toContain("Mock Paper Limit Reached");
  });

  it("★ A TRIAL-EXPIRED STUDENT IS SIGNED-IN FREE — 3 a day, not zero", () => {
    // This branch used to return early with NO allowance at all. Because a new account's
    // 7-day trial makes it premium until it lapses, trial-expired is HOW a student
    // becomes signed-in free — so the early return left the entire signed-in free tier
    // unreachable and its published allowance untestable.
    currentUser = { uid: "u-expired", isLocalSession: false };
    trialExpired = true;
    expect(visit()).toBe(true);   // 1
    expect(visit()).toBe(true);   // 2
    expect(visit()).toBe(true);   // 3
    expect(visit()).toBe(false);  // 4
    // The trial-ended surface is not gone — it now appears at the honest moment.
    expect(lastScreen).toContain("Your Free Trial Has Ended");
  });

  it("PREMIUM: unlimited — well past every free allowance", () => {
    currentUser = { uid: "u-premium", isLocalSession: false };
    premium = true;
    for (let i = 0; i < 8; i++) expect(visit()).toBe(true);
  });

  it("the two tiers are DIFFERENT — the signed-in student outlasts the anonymous one", () => {
    // ★ The discriminating assertion. Both tiers passing their own test would also happen
    // if the limit were a single shared number; this is what separates them.
    expect(visit()).toBe(true);
    expect(visit()).toBe(false);          // anonymous is done after 1

    localStorage.clear();
    sessionStorage.clear();
    currentUser = { uid: "u-signed-in", isLocalSession: false };
    expect(visit()).toBe(true);
    expect(visit()).toBe(true);           // still going where the anonymous visitor stopped
  });

  it("the counter is scoped per identity — one student's views are not another's", () => {
    currentUser = { uid: "u-a", isLocalSession: false };
    expect(visit()).toBe(true);
    expect(visit()).toBe(true);
    expect(visit()).toBe(true);
    expect(visit()).toBe(false);
    currentUser = { uid: "u-b", isLocalSession: false };
    expect(visit()).toBe(true);
  });

  it("a stale record from another DAY does not consume today's allowance", () => {
    currentUser = { uid: "u-stale", isLocalSession: false };
    localStorage.setItem(
      "lazytopper.dailyMockViews:u-stale",
      JSON.stringify({ day: "2020-01-01", count: 99 }),
    );
    expect(visit()).toBe(true);
  });

  it("a LEGACY weekly record (no `day` field) does not wall anyone", () => {
    // The old shape was {week,count}. It must read as zero rather than as a spent
    // allowance, or every existing user would meet a wall on the day this ships.
    currentUser = { uid: "u-legacy", isLocalSession: false };
    localStorage.setItem(
      "lazytopper.dailyMockViews:u-legacy",
      JSON.stringify({ week: "2026-W37", count: 99 }),
    );
    expect(visit()).toBe(true);
  });
});
