/**
 * limitsPlanCopy — LIMITS-1 PR-2: the plan lines that state the real limits, for /pricing.
 *
 * ★ EVERY NUMBER COMES FROM `limitsConfig.ts` (the mirror of the server's one config object),
 * never typed here. The lines are used ONLY when the limits are on (`VITE_LIMITS_ENABLED`, a
 * build-time constant): with the flag off, /pricing keeps the wording it had, because the limits
 * are not enforced and the new lines would be untrue. The pricing page is prerendered with the
 * same environment as the app, so the page and the enforcement are always in the same state.
 *
 * Keep this module import-light (a public, prerendered route): it reads the flag directly rather
 * than importing the limits client, which pulls in the auth and network layer.
 */
import { LIMITS_CONFIG as C } from "./limitsConfig";
import { ANON_DAILY_MOCK_LIMIT, SIGNED_IN_DAILY_MOCK_LIMIT } from "./mockViewLimits";

/** Read as a LITERAL `import.meta.env.VITE_…` so Vite and Vitest both rewrite it. */
export function limitsCopyOn(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_LIMITS_ENABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

const n = (v: number, one: string, many: string): string => `${v} ${v === 1 ? one : many}`;

/** "1 paper download a week" */
export const basicDownloadLine = (): string =>
  `Download ${n(C.basic.downloadsPerWeek, "paper", "papers")} a week — your first is free`;

/** "1 graded Quick Practice set a day" */
export const basicQuickPracticeLine = (): string =>
  `${n(C.basic.quickPracticeGradedPerDay, "graded Quick Practice set", "graded Quick Practice sets")} a day — your first is free`;

export const BASIC_RESULT_LINE =
  "Every result shows your score and your Mistake Intelligence summary; the answer-by-answer breakdown is Premium";

/** The trial's allowances in one sentence. */
export function trialLimitsSentence(): string {
  const t = C.trial;
  return (
    `${n(t.checkImprovePerWeek, "answer check", "answer checks")} a week, ` +
    `${n(t.quickPracticeGradedPerDay, "graded Quick Practice set", "graded Quick Practice sets")} a day, ` +
    `${n(t.downloadsPerWeek, "paper download", "paper downloads")} a week, and ${t.worksheetGradedPerWeek} graded worksheet, ` +
    `${t.chapterTestGradedPerWeek} graded chapter test and ${t.fullMockGradedPerWeek} graded full mock a week — the first of each is free`
  );
}

/** Compare-table cells. */
export const basicDownloadCell = (): string => `${C.basic.downloadsPerWeek} a week (first free)`;
export const basicQuickPracticeCell = (): string => `${C.basic.quickPracticeGradedPerDay} a day (first free)`;

/** The Basic list's "papers" row with the limits on. BasicFreeList loads this module lazily (PERF-3). */
export const basicPapersRow = (): string =>
  `Open ${SIGNED_IN_DAILY_MOCK_LIMIT} chapter tests or mocks a day (${ANON_DAILY_MOCK_LIMIT} when signed out); ${basicDownloadLine().replace(/^Download/, "download")} — written answers on tests and mocks are not checked on Basic`;
