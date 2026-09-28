/**
 * fairUseGate — FAIR-USE-UI-1. The PURE decisions and the copy behind every fair-use
 * panel. No React, no fetch: each function takes the snapshot the page already holds.
 *
 * ★ A null snapshot is "not enforced" and every function here answers "carry on as
 * today" for it. That is the lane's darkness, restated at the decision layer.
 */

import type { FairUseLimitInfo, PremiumWindow, UsageSnapshot } from "../../services/usageClient";

/** Which allowance a surface spends. Per-question surfaces spend `checks`. */
export type LimitScope = "checks" | "chapter-test" | "full-mock" | "worksheet";

/** What the limit panel needs. Built only from the server's own fields. */
export interface LimitState {
  tier: "trial" | "premium";
  scope: LimitScope;
  resetAt: string | null;
  window: PremiumWindow | null;
}

/* ── <time>: the server's resetAt, in IST ─────────────────────────────────── */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * PURE. "5:30 pm" when the reset is later today (IST), otherwise "12:00 am on Tue 29 Sep".
 * Formatted by hand in IST so the student reads the boundary the server actually uses,
 * whatever the device's own time zone, and so a test can pin it exactly.
 */
export function formatResetIst(resetAt: string, nowMs: number = Date.now()): string {
  const ms = Date.parse(resetAt);
  if (Number.isNaN(ms)) return "";
  const ist = new Date(ms + IST_OFFSET_MS);
  const nowIst = new Date(nowMs + IST_OFFSET_MS);
  const h24 = ist.getUTCHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const time = `${h12}:${String(ist.getUTCMinutes()).padStart(2, "0")} ${h24 < 12 ? "am" : "pm"}`;
  const sameDay =
    ist.getUTCFullYear() === nowIst.getUTCFullYear() &&
    ist.getUTCMonth() === nowIst.getUTCMonth() &&
    ist.getUTCDate() === nowIst.getUTCDate();
  if (sameDay) return time;
  return `${time} on ${DAYS[ist.getUTCDay()]} ${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]}`;
}

/* ── Copy (owner rulings UI1 / UI2, word for word where the spec gives it) ── */

export const PREMIUM_WINDOW_LABEL: Record<PremiumWindow, string> = {
  fiveHour: "5-hour",
  day: "day",
  week: "week",
};

/** The first sentence of the trial panel, per allowance. `checks` is the spec's copy
 *  verbatim; the three paper lines follow its shape (the spec names no paper copy). */
export const TRIAL_USED_LINE: Record<LimitScope, string> = {
  checks: "You've used today's 5 answer checks.",
  "chapter-test": "You've used today's chapter test.",
  "full-mock": "You've used this week's full mock.",
  worksheet: "You've used this week's worksheet.",
};

const TRIAL_PREMIUM_LINE: Record<LimitScope, string> = {
  checks: "Premium removes the daily limit.",
  "chapter-test": "Premium removes the daily limit.",
  "full-mock": "Premium removes the weekly limit.",
  worksheet: "Premium removes the weekly limit.",
};

export interface LimitCopy {
  /** The used/limit sentence. */
  lead: string;
  /** "They reset at" / "It resets at" — null when the server sent no reset time
   *  (never an invented one). */
  resetPrefix: string | null;
  /** The follow-on sentence (trial only). */
  tail: string | null;
  /** Trial only: the See plans link. */
  showPlans: boolean;
}

/** PURE. The panel's sentences. ★ No codes, no rupees — only these strings render. */
export function limitCopy(limit: LimitState): LimitCopy {
  if (limit.tier === "premium") {
    const label = PREMIUM_WINDOW_LABEL[limit.window ?? "day"];
    return {
      lead: `You've reached this ${label} fair-use limit.`,
      resetPrefix: limit.resetAt ? "It resets at" : null,
      tail: null,
      showPlans: false,
    };
  }
  return {
    lead: TRIAL_USED_LINE[limit.scope],
    resetPrefix: limit.resetAt ? (limit.scope === "checks" ? "They reset at" : "It resets at") : null,
    tail: TRIAL_PREMIUM_LINE[limit.scope],
    showPlans: true,
  };
}

/** PURE. UI2's confirm sentence. The spec's copy, with the one grammatical change a
 *  single check needs ("1 check", not "1 checks"). */
export function confirmCopy(remaining: number): string {
  return `You have ${remaining} ${remaining === 1 ? "check" : "checks"} left today — we'll mark the first ${remaining}.`;
}

/* ── Decisions ─────────────────────────────────────────────────────────────── */

const inFuture = (iso: string | null, nowMs: number) => iso !== null && Date.parse(iso) > nowMs;

/** The premium window that is full, longest first (the one that decides when the
 *  student is served again — the server's own order). Null when none is at 100%. */
export function fullPremiumWindow(snapshot: UsageSnapshot): PremiumWindow | null {
  const p = snapshot.premium;
  if (!p) return null;
  if (p.weekPct >= 100) return "week";
  if (p.dayPct >= 100) return "day";
  if (p.fiveHourPct >= 100) return "fiveHour";
  return null;
}

function trialScopeState(snapshot: UsageSnapshot, scope: LimitScope): { left: number; resetAt: string | null } | null {
  const t = snapshot.trial;
  if (!t) return null;
  switch (scope) {
    case "checks":
      return { left: t.checksLeftToday, resetAt: t.resets.checks };
    case "chapter-test":
      return { left: t.chapterTestsLeftToday, resetAt: t.resets.chapterTests };
    case "full-mock":
      return { left: t.mocksLeft, resetAt: t.resets.mocks };
    case "worksheet":
      return { left: t.worksheetsLeft, resetAt: t.resets.worksheets };
  }
}

export type GradePlan =
  | { action: "proceed" }
  | { action: "confirm"; remaining: number }
  | { action: "blocked"; limit: LimitState };

/**
 * PURE. UI2 — before a per-question grade of `n` answers. Only a TRIAL student on an
 * ENFORCED snapshot is ever asked anything; everyone else proceeds exactly as today.
 *
 * ★ A snapshot whose reset time has already passed is stale (the day turned over) and
 *   proceeds — the server decides; a stale zero must never block a student.
 * ★ R = 0 shows the limit panel instead of "we'll mark the first 0": nothing would be
 *   marked, and the server would refuse the call anyway.
 */
export function planPerQuestionGrade(snapshot: UsageSnapshot | null, n: number, nowMs: number = Date.now()): GradePlan {
  if (!snapshot || snapshot.tier !== "trial" || n <= 0) return { action: "proceed" };
  const st = trialScopeState(snapshot, "checks");
  if (!st || st.left >= n) return { action: "proceed" };
  if (!inFuture(st.resetAt, nowMs)) return { action: "proceed" };
  if (st.left <= 0) {
    return { action: "blocked", limit: { tier: "trial", scope: "checks", resetAt: st.resetAt, window: null } };
  }
  return { action: "confirm", remaining: Math.floor(st.left) };
}

/**
 * PURE. UI3 — may this paper start? Returns the limit to show, or null to start as
 * today. Only a trial student's spent PAPER allowance blocks (the spec's "that
 * allowance"); a premium student is refused, if ever, at grading, where UI1 shows.
 */
export function paperStartBlock(
  snapshot: UsageSnapshot | null,
  scope: Exclude<LimitScope, "checks">,
  nowMs: number = Date.now(),
): LimitState | null {
  if (!snapshot || snapshot.tier !== "trial") return null;
  const st = trialScopeState(snapshot, scope);
  if (!st || st.left > 0) return null;
  // A spent rolling allowance always carries its reset time; without one (or with one
  // already past) the snapshot is not a positive read, so the paper starts.
  if (!inFuture(st.resetAt, nowMs)) return null;
  return { tier: "trial", scope, resetAt: st.resetAt, window: null };
}

/**
 * PURE. UI1 — the panel for a refusal. `info` is the error's own fields (FAIR-USE-2 F4);
 * the snapshot fills only what the error did not carry (a service that kept only the
 * error's name). Null → render the surface's existing error path unchanged.
 */
export function limitFromRefusal(
  info: FairUseLimitInfo,
  snapshot: UsageSnapshot | null,
  scope: LimitScope,
): LimitState | null {
  if (!snapshot) return null; // dark: never a panel
  const tier: "trial" | "premium" | null =
    info.kind === "trial_limit" ? "trial"
      : info.kind === "usage_limit" ? "premium"
        : snapshot.tier === "trial" || snapshot.tier === "premium" ? snapshot.tier
          : null;
  if (!tier) return null;
  if (tier === "trial") {
    const st = trialScopeState(snapshot, scope);
    return { tier, scope, resetAt: info.resetAt ?? st?.resetAt ?? null, window: null };
  }
  const window = info.window ?? fullPremiumWindow(snapshot);
  if (!window) return null; // cannot name the window honestly -> existing error path
  return {
    tier,
    scope,
    resetAt: info.resetAt ?? snapshot.premium?.resets[window] ?? null,
    window,
  };
}
