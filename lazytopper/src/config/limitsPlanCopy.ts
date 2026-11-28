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

/**
 * GATE-QP-1 (owner ruling 19 Nov 2026): Basic no longer gets a graded (written-answer) Quick Practice set. Said plainly, with no number:
 * the Basic allowance is `C.basic.quickPracticeWrittenGradedPerDay` (0), so the line is built only while that stays 0.
 */
export const basicQuickPracticeLine = (): string =>
  C.basic.quickPracticeWrittenGradedPerDay === 0
    ? "Quick Practice questions are scored as you tap; marking your written practice answers comes with the Board Pass"
    : `${n(C.basic.quickPracticeWrittenGradedPerDay, "graded Quick Practice set", "graded Quick Practice sets")} a day — your first is free`;

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

/*
 * GUEST-WALL (owner ruling 26 Nov 2026, 22:43 IST: "remove the download or checking option from basic plan"): the Basic download
 * line (`basicDownloadLine`), its compare cell (`basicDownloadCell`), the Basic list's limits-on papers row (`basicPapersRow`) and
 * the Quick Practice compare cell's text (`basicQuickPracticeCell`) are retired - no Basic copy states a download or a written-answer
 * check as an allowance; the compare table marks both "not included". The server-side LIMITS-1 numbers (limitsConfig) are untouched.
 */
