/**
 * GUIDE-PAGES-1 M7 — Byte's words on the fair-use limit panel, and the PURE rule that picks them.
 * EAGER on purpose (a few hundred bytes): the words render in the SAME commit as the panel, so the
 * panel never grows after it appears. Only Byte's drawing is lazy (./pageGuidesChunk).
 *
 * Every line is built from the panel's OWN LimitState (scope, tier, window, resetAt) and its own
 * formatted reset (formatResetIst); nothing is guessed. What "still works" rests on:
 * server/services/fairUse.cjs meters ONLY /api/check-solution + /api/grade-worksheet (:187-188) and
 * /api/tutor, /api/more-like-this, /api/detect-question (AI_ROUTES :786-802); /api/step-solution is
 * not metered (:780). Notes, Topic Hub, Exam Trends and the NCERT pages call none of them.
 * Worksheets are NOT named: a worksheet's GRADE is metered.
 */
import { PREMIUM_WINDOW_LABEL, isMidnightIst, type LimitScope, type LimitState } from "../../usage/fairUseGate";

/* ── COPY TABLE 1 — M7, Byte on the limit panel ───────────────────────────────────────────── */

export const M7_COPY = {
  /** Which trial limit was hit — the panel's own `limit.scope`. */
  trialHit: {
    checks: "Your answer checks for today are used up.",
    "chapter-test": "Your chapter test allowance for today is used up.",
    "full-mock": "Your full mock allowance for this week is used up.",
    worksheet: "Your worksheet allowance for this week is used up.",
    tutor: "Your Tutor messages for today are used up.",
    "more-like-this": "Your new practice questions for today are used up.",
  } satisfies Record<LimitScope, string>,
  /** A Premium student at a fair-use window: {window} is the panel's own window label. */
  premiumHit: "You've reached Premium's {window} fair-use limit.",
  /** Only when the reset is the NEXT midnight (under 24 hours away). */
  resetMidnight: "It comes back after midnight.",
  /** Any other reset: the panel's own formatted time, which names the day when it isn't today. */
  resetAt: "It comes back at {when}.",
  /** Inline panel only (the trial-day dialog already says what still works). */
  still: "Notes, Topic Hub, Exam Trends and NCERT solutions still work. Reading them never uses your limit.",
  // NO Premium line of Byte's: the panel's own lead (fairUseGate limitCopy / TRIAL_PREMIUM_LINE)
  // already says "Premium removes the … limit." right above Pay — a second one would repeat it.
  /**
   * The trial-day DIALOG (today's answer checks only): Byte adds companion value instead of
   * repeating the dialog. {n} is the panel's own `allowance` (all of today's checks are used).
   * "Tapping an answer doesn't use checks": a bare MCQ option pick is scored LOCALLY with no API
   * call (services/quickPracticeSessionService.ts `local-mcq` disposition, :429 and :727), and the
   * fair-use gate meters only server routes (fairUse.cjs :187-188, AI_ROUTES :786-802). An MCQ sent
   * WITH working does go to the grader — hence "tapping an answer", not "MCQs".
   */
  dialogDone: "You checked {n} answers today. Good work! Rest now, or tap through some MCQs; tapping an answer doesn't use checks.",
  dialogDoneOne: "You checked 1 answer today. Good work! Rest now, or tap through some MCQs; tapping an answer doesn't use checks.",
  dialogDoneUnknown: "You checked all of today's answers. Good work! Rest now, or tap through some MCQs; tapping an answer doesn't use checks.",
  adminPreview: "Admin preview",
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** True only when `resetAt` is an IST midnight that is the NEXT one (0 < reset − now ≤ 24 h). */
export function isNextMidnight(resetAt: string, nowMs: number): boolean {
  const ms = Date.parse(resetAt);
  if (Number.isNaN(ms) || !isMidnightIst(resetAt)) return false;
  const ahead = ms - nowMs;
  return ahead > 0 && ahead <= DAY_MS;
}

/** PURE. Byte's ONE line in the trial-day dialog, from the panel's own `allowance` (never guessed). */
export function m7DialogLine(limit: LimitState): string {
  const n = typeof limit.allowance === "number" && Number.isFinite(limit.allowance) && limit.allowance > 0 ? limit.allowance : null;
  if (n === null) return M7_COPY.dialogDoneUnknown;
  if (n === 1) return M7_COPY.dialogDoneOne;
  return M7_COPY.dialogDone.replace("{n}", String(n));
}

/** PURE. Byte's lines for a limit, from the panel's own data only. */
export function m7Lines(
  limit: LimitState,
  when: string,
  nowMs: number = Date.now(),
): { hit: string; still: string } {
  const head =
    limit.tier === "premium"
      ? M7_COPY.premiumHit.replace("{window}", PREMIUM_WINDOW_LABEL[limit.window ?? "day"])
      : M7_COPY.trialHit[limit.scope];
  let reset = "";
  if (limit.resetAt && isNextMidnight(limit.resetAt, nowMs)) reset = M7_COPY.resetMidnight;
  else if (limit.resetAt && when) reset = M7_COPY.resetAt.replace("{when}", when);
  return {
    hit: reset ? `${head} ${reset}` : head,
    still: M7_COPY.still,
  };
}
