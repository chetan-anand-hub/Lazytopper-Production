/**
 * TRIAL-END-1 (owner ruling 18 Oct 2026) — the PURE half of the trial-ending banner.
 *
 * A 7-day trial used to end silently. On the last days of a running trial the Home page now
 * says, plainly, when it ends and what the student actually did during it. Everything here is
 * pure (no React, no storage, no network) so every rule is pinned by a test with a fixed clock.
 *
 * ★ WHEN IT SHOWS — IST CALENDAR DAYS, NOT ROLLING 24-HOUR BLOCKS. Trial day 1 is the IST
 * calendar day the trial started on (the server-pinned `trialStartDate`). The banner shows on
 * trial days 5, 6 and 7 and on the final morning (day 8) until the exact end instant
 * (start + TRIAL_DAYS — the same derivation subscriptionService uses; the end is never stored).
 * Day boundaries come from the repo's one IST helper, `istDayStartMs` (progressStore.ts), so a
 * device in another time zone and the CI "ist-midnight" clock both see the same days.
 *
 * ★ HONEST BY CONSTRUCTION (CLAUDE.md §5, India CCPA dark-pattern guidelines 2023):
 *   - the end it names is the real end instant — never a countdown that resets, never "hurry";
 *   - the counts are real graded session records since the trial began — zero is said as zero,
 *     with something the student can still try, never an invented number;
 *   - nothing is pre-selected; dismissing hides it until the next IST day, nothing more.
 *
 * This module never starts, extends or reads a trial on its own: it is handed the status that
 * useSubscription already resolved. When the trial starts is unchanged (owner, 18 Oct 2026).
 */
import { TRIAL_DAYS } from "../../services/subscriptionService";
import { istDayStartMs } from "../../services/progressStore";
import type { SessionRecord } from "../../services/sessionRecords";

const DAY_MS = 24 * 60 * 60 * 1000;
/** IST is a fixed UTC+05:30 — used only to PRINT an IST wall-clock time and date key. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
/** Mirror of subscriptionService's skew tolerance: a start this far ahead of the device is clamped, beyond it is not a start. */
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

/** The first trial day (IST calendar) the banner appears on. */
export const TRIAL_BANNER_FIRST_DAY = 5;

export interface TrialBannerTiming {
  /** 1-based IST calendar day of the trial (5, 6, 7, or 8 on the final morning). */
  dayOfTrial: number;
  /** IST calendar days from today to the day the trial ends: 3, 2, 1, or 0 (ends today). */
  daysLeft: number;
  /** The exact end instant (epoch ms) = server-pinned start + TRIAL_DAYS. */
  endMs: number;
  /** The trial start (epoch ms), clamped exactly as subscriptionService clamps it. */
  startMs: number;
}

/**
 * When — if at all — the banner applies at `nowMs`. `null` means "say nothing": no start,
 * an unparseable or future start, a trial that has not reached day 5, or one already ended.
 */
export function trialBannerTiming(trialStartIso: string | null | undefined, nowMs: number): TrialBannerTiming | null {
  if (!trialStartIso) return null;
  const raw = Date.parse(trialStartIso);
  if (!Number.isFinite(raw) || !Number.isFinite(nowMs)) return null;
  if (raw > nowMs + CLOCK_SKEW_TOLERANCE_MS) return null;
  const startMs = Math.min(raw, nowMs);
  const endMs = startMs + TRIAL_DAYS * DAY_MS;
  if (nowMs >= endMs) return null;
  const dayOfTrial = Math.round((istDayStartMs(nowMs) - istDayStartMs(startMs)) / DAY_MS) + 1;
  if (dayOfTrial < TRIAL_BANNER_FIRST_DAY) return null;
  const daysLeft = Math.round((istDayStartMs(endMs) - istDayStartMs(nowMs)) / DAY_MS);
  return { dayOfTrial, daysLeft, endMs, startMs };
}

/** "YYYY-MM-DD" of the IST calendar day containing `ms` — the dismissal and shown-once key. */
export function istDayKeyOf(ms: number): string {
  return new Date(istDayStartMs(ms) + IST_OFFSET_MS).toISOString().slice(0, 10);
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "10:05 am" — the IST wall-clock time of `ms`, formatted by hand so a test pins it exactly. */
export function formatIstTime(ms: number): string {
  const ist = new Date(ms + IST_OFFSET_MS);
  const h24 = ist.getUTCHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(ist.getUTCMinutes()).padStart(2, "0")} ${h24 < 12 ? "am" : "pm"}`;
}

/** "Sat 25 Oct" — the IST calendar date of `ms`. */
export function formatIstDate(ms: number): string {
  const ist = new Date(ms + IST_OFFSET_MS);
  return `${DAYS[ist.getUTCDay()]} ${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]}`;
}

/** The headline: the real end, in words. No urgency adjectives, no ticking clock. */
export function trialBannerHeadline(timing: Pick<TrialBannerTiming, "daysLeft" | "endMs">): string {
  const time = formatIstTime(timing.endMs);
  if (timing.daysLeft <= 0) return `Your Premium trial ends today at ${time}.`;
  if (timing.daysLeft === 1) return `Your Premium trial ends tomorrow at ${time}.`;
  return `Your Premium trial ends in ${timing.daysLeft} days, on ${formatIstDate(timing.endMs)} at ${time}.`;
}

/** What the student did during the trial — counted from graded session records only. */
export interface TrialActivityCounts {
  /** Check & Improve checks that were graded (one per C&I session record). */
  checks: number;
  /** Worksheets, chapter tests and full mocks fully graded (pending uploads are NOT tests taken). */
  tests: number;
  /** Quick Practice sets finished. */
  practiceSets: number;
}

/**
 * Count the trial's real activity: records graded at or after the trial start, status
 * "graded" only (the progressStore `isTestTaken` rule — a pending upload has no result yet).
 */
export function countTrialActivity(records: readonly SessionRecord[], trialStartMs: number): TrialActivityCounts {
  const counts: TrialActivityCounts = { checks: 0, tests: 0, practiceSets: 0 };
  const seen = new Set<string>();
  for (const r of records) {
    if (!r || typeof r.gradedAt !== "number" || r.gradedAt < trialStartMs) continue;
    if (r.status !== "graded") continue;
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    if (r.surface === "check-improve") counts.checks += 1;
    else if (r.surface === "worksheet" || r.surface === "chapter-test" || r.surface === "full-mock") counts.tests += 1;
    else if (r.surface === "quick-practice") counts.practiceSets += 1;
  }
  return counts;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The activity line. Real counts only; a zero is never padded, and when there is nothing yet
 * the line says so and names one thing the student can still try (returned as `zero: true`
 * so the view can offer that action).
 */
export function trialActivityLine(counts: TrialActivityCounts): { text: string; zero: boolean } {
  const parts: string[] = [];
  if (counts.checks > 0) parts.push(plural(counts.checks, "answer check", "answer checks"));
  if (counts.tests > 0) parts.push(plural(counts.tests, "test taken", "tests taken"));
  if (counts.practiceSets > 0) parts.push(plural(counts.practiceSets, "practice set", "practice sets"));
  if (parts.length === 0) {
    return { text: "You haven't checked an answer yet. Check one before your trial ends.", zero: true };
  }
  return { text: `In your trial so far: ${parts.join(" · ")}.`, zero: false };
}

/** What happens next, stated once and plainly (no loss-framing, no "you will lose everything"). */
export const TRIAL_BANNER_AFTER_COPY = "After it ends, the free features stay free. Premium features need a pass.";
