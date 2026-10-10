/**
 * usageWarning — FAIR-USE-WARN-1. The PURE decision and copy behind the 75% / 90% usage
 * banner and the muted note under an AI action. No React, no fetch, no storage.
 *
 * ★ DARK like the rest of fair use: a null snapshot (the server did not say
 *   `enforced: true`), a free / unknown tier, or a tier whose numbers did not arrive
 *   answers null — and null renders nothing.
 * ★ 100% IS NOT A WARNING. The existing limit panel owns a spent allowance; at 100% this
 *   answers null so the two never show the same fact twice.
 * ★ NO RUPEES. Premium is percentages only (the server sends no rupee figure); trial is
 *   the server's own counts and limit (FAIR-USE-3 R3 — never a hard-coded number).
 * ★ DATA-DRIVEN WINDOWS (P13). The premium windows are a list; a fourth window is one
 *   more row here, never a new component.
 */

import type { PremiumUsage, PremiumWindow, UsageSnapshot } from "../../services/usageClient";
import { formatResetIst } from "./fairUseGate";

export type WarnLevel = 75 | 90;

/** The surfaces a banner is mounted on. Trial counts are answer checks, so the trial
 *  warning shows only where a tap spends a check. */
export type UsageWarningScope =
  | "practice"
  | "check-improve"
  | "chapter-test"
  | "full-mock"
  | "worksheet"
  | "worksheet-grade"
  | "tutor";

const TRIAL_CHECK_SCOPES: ReadonlySet<UsageWarningScope> = new Set(["practice", "check-improve"]);

interface PremiumWindowDef {
  key: PremiumWindow;
  /** Longer windows rank higher: on a tie the longer one decides when the student is
   *  served again (the server's own order, fairUse.cjs premiumState). */
  rank: number;
  /** "{phrase} AI use allowance". */
  phrase: string;
  pct: (p: PremiumUsage) => number;
  resetAt: (p: PremiumUsage) => string | null;
}

/** The premium windows, shortest first. Add a row to add a window. */
export const PREMIUM_WARN_WINDOWS: readonly PremiumWindowDef[] = [
  { key: "fiveHour", rank: 1, phrase: "your 5-hour", pct: (p) => p.fiveHourPct, resetAt: (p) => p.resets.fiveHour },
  { key: "day", rank: 2, phrase: "today's", pct: (p) => p.dayPct, resetAt: (p) => p.resets.day },
  { key: "week", rank: 3, phrase: "this week's", pct: (p) => p.weekPct, resetAt: (p) => p.resets.week },
];

export type UsageWarningState =
  | { tier: "premium"; level: WarnLevel; window: PremiumWindow; resetAt: string | null }
  | { tier: "trial"; level: WarnLevel; window: "checks"; resetAt: string | null; used: number; limit: number };

/** PURE. 75 / 90 / null. Under 75 → null; 100 and over → null (the limit panel's job). */
export function warnLevel(pct: number): WarnLevel | null {
  if (!Number.isFinite(pct) || pct >= 100) return null;
  if (pct >= 90) return 90;
  if (pct >= 75) return 75;
  return null;
}

/** A reading whose reset has already passed is stale: the allowance has refilled. */
const stale = (resetAt: string | null, nowMs: number) => resetAt !== null && Date.parse(resetAt) <= nowMs;

/**
 * PURE. The warning to show, or null. Premium: the window with the HIGHEST percent; on a
 * tie the LONGER window. Trial: today's answer checks used vs the server's checksPerDay.
 */
export function usageWarning(
  snapshot: UsageSnapshot | null | undefined,
  nowMs: number,
  scope: UsageWarningScope,
): UsageWarningState | null {
  if (!snapshot || snapshot.enforced !== true) return null;

  if (snapshot.tier === "premium") {
    const p = snapshot.premium;
    if (!p) return null;
    let best: PremiumWindowDef | null = null;
    for (const w of PREMIUM_WARN_WINDOWS) {
      if (!best || w.pct(p) > best.pct(p) || (w.pct(p) === best.pct(p) && w.rank > best.rank)) best = w;
    }
    if (!best) return null;
    const level = warnLevel(best.pct(p));
    const resetAt = best.resetAt(p);
    if (level === null || stale(resetAt, nowMs)) return null;
    return { tier: "premium", level, window: best.key, resetAt };
  }

  if (snapshot.tier === "trial") {
    if (!TRIAL_CHECK_SCOPES.has(scope)) return null;
    const t = snapshot.trial;
    const limit = t?.limits?.checksPerDay ?? null;
    if (!t || limit === null || limit <= 0) return null; // unknown allowance → never guessed
    const used = Math.max(0, limit - t.checksLeftToday);
    const level = warnLevel((used / limit) * 100);
    const resetAt = t.resets.checks;
    if (level === null || stale(resetAt, nowMs)) return null;
    return { tier: "trial", level, window: "checks", resetAt, used, limit };
  }

  return null;
}

/* ── Copy (DRAFT — the owner approves it at the end of the lane) ─────────────── */

/** P10: the premium meter sums EVERY paid AI call (tutor, step solution, more-like-this,
 *  detect, grading), so the true word is "AI use", not "marking". */
export const PREMIUM_NOUN = "AI use";

function resetWhen(resetAt: string | null, nowMs: number): string {
  return resetAt ? formatResetIst(resetAt, nowMs) : "";
}

/** PURE. The banner's sentence. */
export function warningBannerCopy(w: UsageWarningState, nowMs: number): string {
  if (w.tier === "trial") {
    return `You've used ${w.used} of today's ${w.limit} answer checks. They reset at midnight.`;
  }
  const def = PREMIUM_WARN_WINDOWS.find((d) => d.key === w.window);
  const when = resetWhen(w.resetAt, nowMs);
  const lead = `You've used ${w.level}% of ${def ? def.phrase : "your"} ${PREMIUM_NOUN} allowance.`;
  return when ? `${lead} It resets at ${when}.` : lead;
}

/** PURE. The banner's link: Premium → the usage card on Me; trial → pricing. */
export function warningLink(w: UsageWarningState): { label: string; to: string } {
  return w.tier === "premium" ? { label: "See usage", to: "/me" } : { label: "Upgrade", to: "/pricing" };
}

/** PURE. The muted note under an AI action. */
export function warningNoteCopy(w: UsageWarningState, nowMs: number): string {
  const when = resetWhen(w.resetAt, nowMs);
  return when ? `${w.level}% used · resets ${when}` : `${w.level}% used`;
}

/** PURE. The sessionStorage key a dismiss writes: window + level + resetAt, so a dismiss
 *  hides only THAT level until THAT reset — a higher level, or a new window, shows again. */
export function dismissKey(w: UsageWarningState): string {
  return `lt-usage-warn:${w.window}:${w.level}:${w.resetAt ?? "none"}`;
}
