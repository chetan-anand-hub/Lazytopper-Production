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
