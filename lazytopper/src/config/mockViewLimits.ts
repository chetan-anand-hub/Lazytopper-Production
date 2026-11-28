/**
 * FRICTION-FIX-1 · F2 (owner ruling R3, 2026-10-03) — the per-DAY paper-view limits,
 * ONE source, in a module with NO imports.
 *
 * MockViewGate enforces them; the Basic plan list (BasicFreeList) states them. They live
 * here, not in MockViewGate, for two reasons:
 *   1. NO CYCLE. MockViewGate imports UpgradeModal, which imports BasicFreeList. Had
 *      BasicFreeList imported the limits from MockViewGate, the loop
 *      MockViewGate -> UpgradeModal -> BasicFreeList -> MockViewGate would evaluate the
 *      Basic row before the limits existed ("Mock papers: undefined a day ...").
 *   2. FIREBASE-FREE. BasicFreeList must stay import-light (homeDestinations' firebase-free
 *      rule, freeCheckClient's node-safety); MockViewGate pulls in AuthContext.
 * Keep this file import-free. Pinned by src/components/pricing/BasicFreeList.mockLimits.test.tsx.
 */

/** Anonymous visitor: one paper a day, download included. */
export const ANON_DAILY_MOCK_LIMIT = 1;
/** Signed-in, non-premium — including a student whose 7-day trial has ended. */
export const SIGNED_IN_DAILY_MOCK_LIMIT = 3;

/**
 * GUEST-WALL (owner ruling 26 Nov 2026, 22:43 IST: "remove the download or checking option from basic plan") — the Basic
 * plan's papers row, ONE source: opens only. No download and no written-answer checking is stated as a Basic allowance.
 */
export const BASIC_PAPERS_ROW_DAILY = `Open ${SIGNED_IN_DAILY_MOCK_LIMIT} chapter tests or mocks a day (${ANON_DAILY_MOCK_LIMIT} when signed out)`;
/**
 * GUEST-WALL — the one free test (lib/testSeries/seriesAccess FREE_TESTS_ALLOWED = 1, owner ruling 23 Nov 2026: its written
 * answers are marked). Kept here, import-free, for the Basic list and the signed-out paper wall; the "first" in it is pinned to
 * FREE_TESTS_ALLOWED by BasicFreeList.mockLimits.test.tsx.
 */
export const FIRST_TEST_FREE_LINE = "Your first test is free, marking included.";

/**
 * FREE-TS-WEEKLY (owner ruling 27 Nov 2026, 13:14 IST) - Basic and trial accounts open ONLY Test Series papers, 3 a WEEK signed in
 * (1 a week signed out; signed out never exceeds signed in). Board Pass holders and Test Series owners are unchanged. The week is the
 * product's own weekly window: a ROLLING 7 days (the server's WINDOW_MS in limits.cjs, the same window as the weekly download and
 * grading limits) - there is no IST calendar week anywhere in the limits.
 * Kill switch (client, build time): VITE_FREE_TS_WEEKLY_DISABLED=1 restores today's behaviour exactly. The server's twin is
 * FREE_TS_WEEKLY_DISABLED=1. Only "1" counts, like the other lane switches.
 */
export const FREE_TS_WEEKLY_SIGNED_IN = 3;
export const FREE_TS_WEEKLY_SIGNED_OUT = 1;
export const FREE_TS_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function freeTsWeeklyDisabled(): boolean {
  try {
    return import.meta.env?.VITE_FREE_TS_WEEKLY_DISABLED === "1";
  } catch {
    return false;
  }
}

/** The Basic plan's papers row, ONE source (weekly Test Series wording; the daily wording only with the kill switch). */
export const BASIC_PAPERS_ROW = freeTsWeeklyDisabled()
  ? BASIC_PAPERS_ROW_DAILY
  : `Open ${FREE_TS_WEEKLY_SIGNED_IN} Test Series papers a week (${FREE_TS_WEEKLY_SIGNED_OUT} when signed out)`;
/** The compare table's Basic cell for "Open chapter tests and full mocks". */
export const BASIC_PAPERS_COMPARE_CELL = freeTsWeeklyDisabled()
  ? `${SIGNED_IN_DAILY_MOCK_LIMIT} a day (${ANON_DAILY_MOCK_LIMIT} signed out)`
  : `${FREE_TS_WEEKLY_SIGNED_IN} Test Series papers a week (${FREE_TS_WEEKLY_SIGNED_OUT} signed out)`;
/** Ruling copy (exact). */
export const FREE_TS_WALL_LINE = `Sign in to open ${FREE_TS_WEEKLY_SIGNED_IN} Test Series papers a week. ${FIRST_TEST_FREE_LINE}`;
export const FREE_TS_GUEST_LIMIT_LINE = `You've used this week's free paper. Sign in (free) for ${FREE_TS_WEEKLY_SIGNED_IN} a week.`;
