// TRIAL-3DAY-1 (owner ruling 28 Nov 2026: "I agreed for 3 days free trial, not 7 days").
//
// A NEW trial lasts 3 days; a trial already running keeps the 7 days it was given (the trial END is
// derived from the start, so lowering one constant would otherwise SHORTEN a running trial).
// Every case pins the clock with vi.setSystemTime - nothing depends on the day the suite runs.
//
// MUTATIONS (each shown RED before commit):
//   M1  trialDaysForStart ignores the cutover (always TRIAL_DAYS)  -> "existing 7-day trial unchanged" red
//   M2  trialDaysForStart ignores the cutover (always 7)           -> "new trial = 3 days" red
//   M3  server cutover drifts from the client one                  -> parity test red

import { createRequire } from "node:module";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./firebaseClient", () => ({ firestoreDb: { __fakeDb: true } }));
vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => ({ __ref: args }),
  getDoc: () => Promise.resolve(undefined),
  setDoc: () => Promise.resolve(),
  serverTimestamp: () => ({ __serverTimestampSentinel: true }),
}));

import {
  LEGACY_TRIAL_DAYS,
  TRIAL_3DAY_CUTOVER_MS,
  TRIAL_DAYS,
  applyExpiry,
  getDaysLeftInTrial,
  trialDaysForStart,
  trialDaysForStartIso,
  trialHasRunItsCourse,
  type SubscriptionStatus,
} from "./subscriptionService";
import { trialBannerTiming, trialBarFirstDay, trialBannerFirstDay } from "../components/trial/trialEndBannerModel";
import { trialEarlyStripDay, trialEarlyStripDayText } from "../components/trial/trialEarlyStripModel";
import { trialCountdownRouteAllowed, trialCountdownText } from "../components/trial/TrialCountdownBar";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();
const trial = (startMs: number): SubscriptionStatus =>
  ({ tier: "trial", plan: "trial_7day", premiumSince: null, trialStartDate: iso(startMs) }) as SubscriptionStatus;

afterEach(() => vi.useRealTimers());

describe("TRIAL-3DAY-1 - the length", () => {
  it("the constants: new trials 3 days, legacy 7, cutover 00:00 IST 30 Nov 2026", () => {
    expect(TRIAL_DAYS).toBe(3);
    expect(LEGACY_TRIAL_DAYS).toBe(7);
    expect(TRIAL_3DAY_CUTOVER_MS).toBe(Date.parse("2026-11-30T00:00:00+05:30"));
    expect(trialDaysForStart(TRIAL_3DAY_CUTOVER_MS - 1)).toBe(7);
    expect(trialDaysForStart(TRIAL_3DAY_CUTOVER_MS)).toBe(3);
    expect(trialDaysForStartIso(iso(TRIAL_3DAY_CUTOVER_MS + DAY))).toBe(3);
    expect(trialDaysForStartIso(iso(TRIAL_3DAY_CUTOVER_MS - DAY))).toBe(7);
    expect(trialDaysForStartIso(null)).toBe(3);
  });

  it("the server mirror (entitlement.cjs) has the SAME constants and the same answer for a sample of starts", () => {
    const server = createRequire(import.meta.url)("../../server/services/entitlement.cjs");
    expect(server.TRIAL_DAYS).toBe(TRIAL_DAYS);
    expect(server.LEGACY_TRIAL_DAYS).toBe(LEGACY_TRIAL_DAYS);
    expect(server.TRIAL_3DAY_CUTOVER_MS).toBe(TRIAL_3DAY_CUTOVER_MS);
    for (const start of [0, TRIAL_3DAY_CUTOVER_MS - DAY, TRIAL_3DAY_CUTOVER_MS - 1, TRIAL_3DAY_CUTOVER_MS, TRIAL_3DAY_CUTOVER_MS + 400 * DAY]) {
      expect(server.trialDaysForStart(start)).toBe(trialDaysForStart(start));
    }
  });

  it("a NEW trial (started at/after the cutover) is 3 days: 3 days left on day 1, expired after 3 days", () => {
    const start = TRIAL_3DAY_CUTOVER_MS + 2 * HOUR;
    vi.useFakeTimers({ now: start + HOUR });
    expect(getDaysLeftInTrial(trial(start))).toBe(3);
    vi.setSystemTime(start + 2 * DAY + HOUR);
    expect(getDaysLeftInTrial(trial(start))).toBe(1);
    expect(applyExpiry(trial(start)).tier).toBe("trial");
    vi.setSystemTime(start + 3 * DAY + HOUR);
    expect(getDaysLeftInTrial(trial(start))).toBe(0);
    expect(applyExpiry(trial(start)).tier).toBe("free");
    expect(trialHasRunItsCourse(iso(start), start + 3 * DAY)).toBe(true);
    expect(trialHasRunItsCourse(iso(start), start + 3 * DAY - 1)).toBe(false);
  });

  it("an EXISTING 7-day trial (started before the cutover) is NOT shortened - even read after the cutover", () => {
    const start = TRIAL_3DAY_CUTOVER_MS - 2 * DAY;
    vi.useFakeTimers({ now: start + 5 * DAY }); // day 6: long past a 3-day trial's end, after the cutover
    expect(applyExpiry(trial(start)).tier).toBe("trial");
    expect(getDaysLeftInTrial(trial(start))).toBe(2);
    expect(trialHasRunItsCourse(iso(start), start + 5 * DAY)).toBe(false);
    vi.setSystemTime(start + 7 * DAY + HOUR);
    expect(applyExpiry(trial(start)).tier).toBe("free");
    expect(trialHasRunItsCourse(iso(start), start + 7 * DAY)).toBe(true);
  });
});

describe("TRIAL-3DAY-1 - the day-based banners follow each trial's own length", () => {
  const newStart = TRIAL_3DAY_CUTOVER_MS + 3 * HOUR; // 03:00 IST 30 Nov: IST day 1 = 30 Nov
  const oldStart = TRIAL_3DAY_CUTOVER_MS - 5 * DAY + 3 * HOUR;

  it("first days: bar 4 / banner 5 for a 7-day trial; bar 2 / banner 3 for a 3-day one", () => {
    expect([trialBarFirstDay(7), trialBannerFirstDay(7)]).toEqual([4, 5]);
    expect([trialBarFirstDay(3), trialBannerFirstDay(3)]).toEqual([2, 3]);
  });

  it("a 3-day trial: strip on day 1, bar on day 2, banner on day 3, nothing after the end", () => {
    const d1 = newStart + 2 * HOUR;
    const d2 = newStart + DAY;
    const d3 = newStart + 2 * DAY;
    const afterEnd = newStart + 3 * DAY + HOUR;
    expect(trialEarlyStripDay(iso(newStart), d1)).toBe(1);
    expect(trialEarlyStripDay(iso(newStart), d2)).toBeNull();
    expect(trialBannerTiming(iso(newStart), d1, "bar")).toBeNull();
    expect(trialBannerTiming(iso(newStart), d2, "bar")?.dayOfTrial).toBe(2);
    expect(trialBannerTiming(iso(newStart), d2)).toBeNull();
    expect(trialBannerTiming(iso(newStart), d3)?.dayOfTrial).toBe(3);
    expect(trialBannerTiming(iso(newStart), d3)?.trialDays).toBe(3);
    expect(trialBannerTiming(iso(newStart), d3)?.endMs).toBe(newStart + 3 * DAY);
    expect(trialBannerTiming(iso(newStart), afterEnd)).toBeNull();
    expect(trialBannerTiming(iso(newStart), afterEnd, "bar")).toBeNull();
  });

  it("a legacy 7-day trial keeps its old schedule: strip days 1-3, bar from day 4, banner from day 5", () => {
    const at = (n: number) => oldStart + (n - 1) * DAY + HOUR;
    expect(trialEarlyStripDay(iso(oldStart), at(3))).toBe(3);
    expect(trialEarlyStripDay(iso(oldStart), at(4))).toBeNull();
    expect(trialBannerTiming(iso(oldStart), at(3), "bar")).toBeNull();
    expect(trialBannerTiming(iso(oldStart), at(4), "bar")?.dayOfTrial).toBe(4);
    expect(trialBannerTiming(iso(oldStart), at(4))).toBeNull();
    expect(trialBannerTiming(iso(oldStart), at(5))?.dayOfTrial).toBe(5);
    expect(trialBannerTiming(iso(oldStart), at(5))?.endMs).toBe(oldStart + 7 * DAY);
  });

  it("the strip's text names the trial's own length; the bar's text no longer says 'free week'", () => {
    expect(trialEarlyStripDayText(1)).toBe("Trial: day 1 of 3");
    expect(trialEarlyStripDayText(2, 7)).toBe("Trial: day 2 of 7");
    expect(trialCountdownText(2, "plan")).toBe("2 days left of your free trial · plan");
    expect(trialCountdownText(0, "plan")).toBe("Last day of your free trial · plan");
  });

  it("the bar yields to the Home banner from the banner's first day, per length", () => {
    expect(trialCountdownRouteAllowed("/", 3, 3)).toBe(false);
    expect(trialCountdownRouteAllowed("/", 2, 3)).toBe(true);
    expect(trialCountdownRouteAllowed("/", 4, 7)).toBe(true);
    expect(trialCountdownRouteAllowed("/", 5, 7)).toBe(false);
  });
});

// ── COPY GUARD: no "7-day trial" copy left anywhere a student, parent or crawler reads it ──────────
describe("TRIAL-3DAY-1 - copy guard", () => {
  const root = join(__dirname, "..", "..");
  const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "data", "eval", "tests", "coverage"]);
  function walk(dir: string, out: string[]): string[] {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name)) continue;
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p, out);
      else if (/\.(ts|tsx|cjs|mjs|html|txt)$/.test(name) && !/\.test\.|\.golden\.|\.generated\./.test(name)) out.push(p);
    }
    return out;
  }
  // The student-facing shapes of the old promise. The extension reward ("7 days extra Premium") and the weekly
  // limit windows are different things and are not matched.
  const BANNED = [
    /\b7[- ]day(?:s)? (?:free |Premium )?trial/i,
    /\bfree (?:for )?7 days\b/i,
    /\b7 days of the tutor/i,
    /\bfree week\b/i,
    /\bone free week\b/i,
    /\bfree for a week\b/i,
  ];
  const isComment = (line: string) => /^\s*(\/\/|\*|\/\*|\{\/\*|#)/.test(line);

  it("src, server, public, index.html and the SEO scripts carry no '7-day trial' / 'free week' copy outside comments", () => {
    const files = [
      ...walk(join(root, "src"), []),
      ...walk(join(root, "server"), []),
      ...walk(join(root, "public"), []),
      ...walk(join(root, "scripts", "seo"), []),
      join(root, "index.html"),
    ];
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (isComment(line)) return;
          if (BANNED.some((re) => re.test(line))) hits.push(`${relative(root, f)}:${i + 1}: ${line.trim().slice(0, 140)}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it("the prerendered pages carry none either (the committed capture)", () => {
    const hits: string[] = [];
    for (const f of walk(join(root, "prerendered"), [])) {
      const text = readFileSync(f, "utf8");
      for (const re of BANNED) {
        const m = re.exec(text);
        if (m) hits.push(`${relative(root, f)}: ${text.slice(Math.max(0, m.index - 40), m.index + 80).replace(/\s+/g, " ")}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
