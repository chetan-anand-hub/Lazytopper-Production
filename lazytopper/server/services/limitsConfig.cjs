/**
 * limitsConfig.cjs — LIMITS-1: EVERY number the limits use, in ONE object (owner ruling
 * 25 Oct 2026 07:58 IST). Tune here; no logic changes. The client mirror is
 * src/config/limitsConfig.ts and `limitsConfig.parity.test.ts` fails if they differ.
 * All counts are per rolling 7 days unless the key says `PerDay` (IST calendar day).
 * The FIRST of each kind is free and uncounted (`firstFree`).
 * PR-1 enforces the two `downloadsPerWeek` numbers; the rest are used by PR-2 and are
 * listed now so the owner has one place to read.
 */
const LIMITS_CONFIG = Object.freeze({
  /** Trial metering applies to accounts created on/after 25 Oct 2026 00:00 IST. */
  trialCohortStartMs: Date.UTC(2026, 9, 24, 18, 30, 0, 0),
  firstFree: true,
  trial: Object.freeze({
    downloadsPerWeek: 2,
    checkImprovePerWeek: 5,
    quickPracticeGradedPerDay: 3,
    worksheetGradedPerWeek: 1,
    chapterTestGradedPerWeek: 1,
    fullMockGradedPerWeek: 1,
  }),
  basic: Object.freeze({
    downloadsPerWeek: 1,
    quickPracticeGradedPerDay: 1,
    /** Basic: first of each LLM-graded kind free, then the existing 402. */
    scorecardBreakdownLocked: true,
  }),
});

module.exports = { LIMITS_CONFIG };
