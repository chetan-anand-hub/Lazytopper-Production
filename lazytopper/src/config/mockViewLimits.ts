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
export const BASIC_PAPERS_ROW = `Open ${SIGNED_IN_DAILY_MOCK_LIMIT} chapter tests or mocks a day (${ANON_DAILY_MOCK_LIMIT} when signed out)`;
/**
 * GUEST-WALL — the one free test (lib/testSeries/seriesAccess FREE_TESTS_ALLOWED = 1, owner ruling 23 Nov 2026: its written
 * answers are marked). Kept here, import-free, for the Basic list and the signed-out paper wall; the "first" in it is pinned to
 * FREE_TESTS_ALLOWED by BasicFreeList.mockLimits.test.tsx.
 */
export const FIRST_TEST_FREE_LINE = "Your first test is free, marking included.";
