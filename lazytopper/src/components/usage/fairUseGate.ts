/**
 * fairUseGate — FAIR-USE-UI-1. The PURE decisions and the copy behind every fair-use
 * panel. No React, no fetch: each function takes the snapshot the page already holds.
 *
 * ★ A null snapshot is "not enforced" and every function here answers "carry on as
 * today" for it. That is the lane's darkness, restated at the decision layer.
 */

import type { FairUseLimitInfo, PremiumWindow, UsageSnapshot } from "../../services/usageClient";

/** Which allowance a surface spends. Per-question surfaces spend `checks`.
 *  ALL-AI-METERING-1: `tutor` and `more-like-this` (question detection refusals use `checks`). */
export type LimitScope = "checks" | "chapter-test" | "full-mock" | "worksheet" | "tutor" | "more-like-this";

/** The three paper allowances (the scopes a paper start can be blocked on). */
type PaperScope = "chapter-test" | "full-mock" | "worksheet";
const isPaperScope = (scope: LimitScope): scope is PaperScope =>
  scope === "chapter-test" || scope === "full-mock" || scope === "worksheet";

/** What the limit panel needs. Built only from the server's own fields. */
export interface LimitState {
  tier: "trial" | "premium";
  scope: LimitScope;
  resetAt: string | null;
  window: PremiumWindow | null;
  /**
   * FAIR-USE-3 R3 — the size of the spent trial allowance, from /api/usage/me's own
   * `trial.limits` (so it follows the server's env). Null / absent when the server did
   * not say: the copy then omits the number. Never a client-side default.
   */
  allowance?: number | null;
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
  thirtyDay: "30-day",
};

/** ALL-AI-METERING-1 — owner copy (owner approves later), word for word. Trial only: a Premium
 *  refusal on these scopes reads the existing Premium window copy (a week cap is not "today's"). */
export const TUTOR_TRIAL_LIMIT_COPY = "You've reached today's Tutor limit. It resets at midnight.";
export const MORE_LIKE_THIS_TRIAL_LIMIT_COPY =
  "You've reached today's limit for new practice questions. Your saved questions still work.";

const PAPER_NOUN: Record<PaperScope, { when: string; one: string; many: string }> = {
  "chapter-test": { when: "today's", one: "chapter test", many: "chapter tests" },
  "full-mock": { when: "this week's", one: "full mock", many: "full mocks" },
  worksheet: { when: "this week's", one: "worksheet", many: "worksheets" },
};

/**
 * PURE. The first sentence of the trial panel, per allowance. FAIR-USE-3 R3: the number
 * is the SERVER'S (`allowance`, from /api/usage/me `trial.limits`) — never hard-coded.
 * Unknown -> the number is omitted, never guessed:
 *   checks  N: "You've used today's N answer checks."   unknown: "You've used today's answer checks."
 *   paper   1 or unknown: "You've used today's chapter test."   N > 1: "...today's N chapter tests."
 *
 * MUTATION FU3-MUT-3 target ("hard-code 5" -> the changed-limit copy tests go RED).
 */
export function trialUsedLine(scope: LimitScope, allowance: number | null | undefined): string {
  const n = typeof allowance === "number" && Number.isInteger(allowance) && allowance > 0 ? allowance : null;
  if (scope === "checks") {
    if (n === null) return "You've used today's answer checks.";
    return `You've used today's ${n} answer ${n === 1 ? "check" : "checks"}.`;
  }
  if (scope === "tutor") return TUTOR_TRIAL_LIMIT_COPY;
  if (scope === "more-like-this") return MORE_LIKE_THIS_TRIAL_LIMIT_COPY;
  const noun = PAPER_NOUN[scope];
  if (n === null || n === 1) return `You've used ${noun.when} ${noun.one}.`;
  return `You've used ${noun.when} ${n} ${noun.many}.`;
}

const TRIAL_PREMIUM_LINE: Record<LimitScope, string> = {
  checks: "Premium removes the daily limit.",
  "chapter-test": "Premium removes the daily limit.",
  "full-mock": "Premium removes the weekly limit.",
  worksheet: "Premium removes the weekly limit.",
  // ALL-AI-METERING-1: the owner's sentence is the whole message — no follow-on line.
  tutor: "",
  "more-like-this": "",
};

/** ALL-AI-METERING-1: the owner's trial copy already says when it resets — no <time> sentence. */
const SELF_CONTAINED_TRIAL_COPY: ReadonlySet<LimitScope> = new Set<LimitScope>(["tutor", "more-like-this"]);

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
  if (SELF_CONTAINED_TRIAL_COPY.has(limit.scope)) {
    return { lead: trialUsedLine(limit.scope, limit.allowance), resetPrefix: null, tail: null, showPlans: true };
  }
  return {
    lead: trialUsedLine(limit.scope, limit.allowance),
    resetPrefix: limit.resetAt ? (limit.scope === "checks" ? "They reset at" : "It resets at") : null,
    tail: TRIAL_PREMIUM_LINE[limit.scope],
    showPlans: true,
  };
}

/**
 * PURE. ALL-AI-METERING-1 — the Tutor's INLINE message for a refusal (the Tutor has no panel):
 *   trial   -> the owner's sentence, word for word;
 *   premium -> the existing Premium window copy, with the server's reset time in IST.
 */
export function tutorLimitMessage(limit: LimitState, nowMs: number = Date.now()): string {
  const copy = limitCopy(limit);
  const when = copy.resetPrefix && limit.resetAt ? formatResetIst(limit.resetAt, nowMs) : "";
  return when ? `${copy.lead} ${copy.resetPrefix} ${when}.` : copy.lead;
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
  // ALL-AI-METERING-1: the 30-day window (#1037) is the longest, so it is checked FIRST. Read
  // defensively: usageClient's PremiumUsage does not carry it until #1037 lands.
  const thirtyDayPct = (p as { thirtyDayPct?: unknown }).thirtyDayPct;
  if (typeof thirtyDayPct === "number" && thirtyDayPct >= 100) return "thirtyDay";
  if (p.weekPct >= 100) return "week";
  if (p.dayPct >= 100) return "day";
  if (p.fiveHourPct >= 100) return "fiveHour";
  return null;
}

function trialScopeState(
  snapshot: UsageSnapshot,
  scope: LimitScope,
): { left: number; resetAt: string | null; allowance: number | null } | null {
  const t = snapshot.trial;
  if (!t) return null;
  // FAIR-USE-3 R3: the allowance is the server's own number; a snapshot without limits
  // (an older server) gives null, and the copy omits the number.
  const limits = t.limits ?? { checksPerDay: null, chapterTestsPerDay: null, mocksPerWeek: null, worksheetsPerWeek: null };
  switch (scope) {
    case "checks":
      return { left: t.checksLeftToday, resetAt: t.resets.checks, allowance: limits.checksPerDay };
    case "chapter-test":
      return { left: t.chapterTestsLeftToday, resetAt: t.resets.chapterTests, allowance: limits.chapterTestsPerDay };
    case "full-mock":
      return { left: t.mocksLeft, resetAt: t.resets.mocks, allowance: limits.mocksPerWeek };
    case "worksheet":
      return { left: t.worksheetsLeft, resetAt: t.resets.worksheets, allowance: limits.worksheetsPerWeek };
    case "tutor":
    case "more-like-this":
      // ALL-AI-METERING-1: decided from the refusal itself (limitFromAiRefusal), never pre-blocked.
      return null;
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
    return { action: "blocked", limit: { tier: "trial", scope: "checks", resetAt: st.resetAt, window: null, allowance: st.allowance } };
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
  if (!snapshot || snapshot.tier !== "trial" || !isPaperScope(scope)) return null;
  const st = trialScopeState(snapshot, scope);
  if (!st || st.left > 0) return null;
  // A spent rolling allowance always carries its reset time; without one (or with one
  // already past) the snapshot is not a positive read, so the paper starts.
  if (!inFuture(st.resetAt, nowMs)) return null;
  return { tier: "trial", scope, resetAt: st.resetAt, window: null, allowance: st.allowance };
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
    return { tier, scope, resetAt: info.resetAt ?? st?.resetAt ?? null, window: null, allowance: st?.allowance ?? null };
  }
  const window = info.window ?? fullPremiumWindow(snapshot);
  if (!window) return null; // cannot name the window honestly -> existing error path
  return {
    tier,
    scope,
    resetAt: info.resetAt ?? premiumResetFor(snapshot, window),
    window,
  };
}

/** The snapshot's reset time for a premium window (the 30-day one only once #1037's snapshot carries it). */
function premiumResetFor(snapshot: UsageSnapshot | null, window: PremiumWindow): string | null {
  const resets = snapshot?.premium?.resets as Partial<Record<PremiumWindow, string | null>> | undefined;
  return resets?.[window] ?? null;
}

/**
 * PURE. ALL-AI-METERING-1 — the panel (or the Tutor's inline message) for a refusal on the Tutor,
 * More-like-this or question detection.
 *
 * ★ NOT GATED ON AN ENFORCED SNAPSHOT, deliberately unlike limitFromRefusal. Those refusals sit
 *   behind their OWN server switch (FAIR_USE_ENFORCE_ALL_AI), while `snapshot.enforced` follows
 *   FAIR_USE_ENFORCE (grading). A typed 409/429 from these routes is itself the positive fact that
 *   the server refused; requiring the grading switch too would show a generic error instead.
 * ★ Only what the error carries (or the snapshot, when present) is used: a refusal whose kind is
 *   unknown, or a Premium one whose window cannot be named, is null -> the existing error path.
 */
export function limitFromAiRefusal(
  info: FairUseLimitInfo | null,
  scope: LimitScope,
  snapshot: UsageSnapshot | null = null,
): LimitState | null {
  if (!info) return null;
  if (info.kind === "trial_limit") {
    return { tier: "trial", scope, resetAt: info.resetAt, window: null, allowance: null };
  }
  if (info.kind === "usage_limit") {
    const window = info.window ?? (snapshot ? fullPremiumWindow(snapshot) : null);
    if (!window) return null;
    return { tier: "premium", scope, resetAt: info.resetAt ?? premiumResetFor(snapshot, window), window };
  }
  return null;
}
