/**
 * Client mirror of server/services/limitsConfig.cjs (LIMITS-1). Used only for copy that must
 * not hard-code a number; the SERVER decides every limit and sends the live numbers.
 * `limitsConfig.parity.test.ts` fails if this drifts from the server object.
 */
export const LIMITS_CONFIG = {
  trialCohortStartMs: Date.UTC(2026, 9, 24, 18, 30, 0, 0),
  firstFree: true,
  trial: {
    downloadsPerWeek: 2,
    checkImprovePerWeek: 5,
    quickPracticeGradedPerDay: 3,
    worksheetGradedPerWeek: 1,
    chapterTestGradedPerWeek: 1,
    fullMockGradedPerWeek: 1,
  },
  basic: {
    downloadsPerWeek: 1,
    quickPracticeGradedPerDay: 1,
    scorecardBreakdownLocked: true,
  },
} as const;
