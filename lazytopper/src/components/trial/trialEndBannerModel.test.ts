// TRIAL-END-1 — the banner's pure rules: IST-calendar trial days, the honest headline,
// real counts and the zero state, and parity with the server email's port of the same rules.
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import {
  TRIAL_BANNER_FIRST_DAY,
  countTrialActivity,
  formatIstDate,
  formatIstTime,
  istDayKeyOf,
  trialActivityLine,
  trialBannerHeadline,
  trialBannerTiming,
} from "./trialEndBannerModel";
import type { SessionRecord } from "../../services/sessionRecords";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const server = require("../../../server/services/trialEndingEmail.cjs") as {
  countTrialActivity: typeof countTrialActivity;
  trialActivityLine: typeof trialActivityLine;
  formatIstDate: typeof formatIstDate;
  formatIstTime: typeof formatIstTime;
  istDayKeyOf: typeof istDayKeyOf;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** IST wall clock -> epoch ms (IST is UTC+05:30, no DST). */
const ist = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h, mi) - 5.5 * HOUR;

describe("trialBannerTiming — IST calendar days", () => {
  // Trial started Mon 1 Jun 2026, 10:00 am IST -> ends Mon 8 Jun, 10:00 am IST.
  const start = ist(2026, 6, 1, 10, 0);
  const startIso = new Date(start).toISOString();

  it("is silent on trial days 1-4, shows on days 5, 6, 7 and the final morning, silent once ended", () => {
    expect(trialBannerTiming(startIso, ist(2026, 6, 4, 23, 59))).toBeNull(); // day 4, last minute
    const d5 = trialBannerTiming(startIso, ist(2026, 6, 5, 0, 0)); // day 5, IST midnight
    expect(d5).toMatchObject({ dayOfTrial: 5, daysLeft: 3 });
    expect(trialBannerTiming(startIso, ist(2026, 6, 6, 12))).toMatchObject({ dayOfTrial: 6, daysLeft: 2 });
    expect(trialBannerTiming(startIso, ist(2026, 6, 7, 23, 59))).toMatchObject({ dayOfTrial: 7, daysLeft: 1 });
    expect(trialBannerTiming(startIso, ist(2026, 6, 8, 9, 59))).toMatchObject({ dayOfTrial: 8, daysLeft: 0 });
    expect(trialBannerTiming(startIso, ist(2026, 6, 8, 10, 0))).toBeNull(); // the exact end
    expect(trialBannerTiming(startIso, ist(2026, 6, 20))).toBeNull();
    expect(TRIAL_BANNER_FIRST_DAY).toBe(5);
  });

  it("uses IST days, not the device's or UTC's: a 11:50 pm IST start makes day 2 begin ten minutes later", () => {
    const late = new Date(ist(2026, 6, 1, 23, 50)).toISOString();
    // 4 Jun 11:59 pm IST is IST-day 4 -> silent; 5 Jun 12:00 am IST is IST-day 5 -> shown.
    expect(trialBannerTiming(late, ist(2026, 6, 4, 23, 59))).toBeNull();
    expect(trialBannerTiming(late, ist(2026, 6, 5, 0, 0))).toMatchObject({ dayOfTrial: 5 });
    // 00:10 am IST on 1 Jun is still 31 May in UTC: the IST day, not the UTC day, counts.
    const early = new Date(ist(2026, 6, 1, 0, 10)).toISOString();
    expect(trialBannerTiming(early, ist(2026, 6, 5, 0, 0))).toMatchObject({ dayOfTrial: 5, daysLeft: 3 });
    expect(trialBannerTiming(early, ist(2026, 6, 4, 23, 59))).toBeNull();
  });

  it("fails closed: no start, an unparseable start, or a start far in the future says nothing", () => {
    const now = ist(2026, 6, 6, 12);
    expect(trialBannerTiming(null, now)).toBeNull();
    expect(trialBannerTiming("not-a-date", now)).toBeNull();
    expect(trialBannerTiming(new Date(now + DAY).toISOString(), now)).toBeNull();
  });

  it("clamps a slightly-ahead (skewed) start to now, like subscriptionService — it can never buy extra days", () => {
    const now = ist(2026, 6, 6, 12);
    // A start 2 minutes ahead is day 1 of a trial starting now: silent, never "ends in 7 days".
    expect(trialBannerTiming(new Date(now + 2 * 60 * 1000).toISOString(), now)).toBeNull();
  });
});

describe("headline — the real end, in IST, no urgency", () => {
  const end = ist(2026, 6, 8, 10, 0);
  it("says in N days / tomorrow / today with the exact IST time", () => {
    expect(trialBannerHeadline({ daysLeft: 3, endMs: end })).toBe("Your Premium trial ends in 3 days, on Mon 8 Jun at 10:00 am.");
    expect(trialBannerHeadline({ daysLeft: 1, endMs: end })).toBe("Your Premium trial ends tomorrow at 10:00 am.");
    expect(trialBannerHeadline({ daysLeft: 0, endMs: end })).toBe("Your Premium trial ends today at 10:00 am.");
  });
  it("formats the IST midnight boundary correctly whatever the device zone", () => {
    expect(formatIstTime(ist(2026, 6, 8, 0, 0))).toBe("12:00 am");
    expect(formatIstTime(ist(2026, 6, 7, 23, 59))).toBe("11:59 pm");
    expect(formatIstDate(ist(2026, 6, 8, 0, 0))).toBe("Mon 8 Jun");
    expect(istDayKeyOf(ist(2026, 6, 7, 23, 59))).toBe("2026-06-07");
    expect(istDayKeyOf(ist(2026, 6, 8, 0, 0))).toBe("2026-06-08");
  });
  it("never uses urgency words", () => {
    for (const daysLeft of [0, 1, 2, 3]) {
      expect(trialBannerHeadline({ daysLeft, endMs: end })).not.toMatch(/hurry|last chance|only|act now|!|expir/i);
    }
  });
});

function rec(id: string, surface: SessionRecord["surface"], gradedAt: number, status: SessionRecord["status"] = "graded"): SessionRecord {
  return { id, surface, gradedAt, status } as SessionRecord;
}

describe("activity — real graded records since the trial began", () => {
  const start = ist(2026, 6, 1, 10, 0);
  const records = [
    rec("ci-1", "check-improve", start + HOUR),
    rec("ci-1", "check-improve", start + HOUR), // a duplicate id is one check
    rec("ci-2", "check-improve", start + 2 * HOUR),
    rec("ws-1", "worksheet", start + 3 * HOUR),
    rec("ct-1", "chapter-test", start + 4 * HOUR, "pending-upload"), // not taken until graded
    rec("fm-1", "full-mock", start + 5 * HOUR, "partial"),
    rec("qp-1", "quick-practice", start + 6 * HOUR),
    rec("old", "check-improve", start - HOUR), // before the trial
  ];

  it("counts checks, tests taken and practice sets; pending/partial and pre-trial records are excluded", () => {
    expect(countTrialActivity(records, start)).toEqual({ checks: 2, tests: 1, practiceSets: 1 });
    expect(trialActivityLine(countTrialActivity(records, start))).toEqual({
      text: "In your trial so far: 2 answer checks · 1 test taken · 1 practice set.",
      zero: false,
    });
  });

  it("zero is said as zero, with one thing to try — never a padded number", () => {
    const line = trialActivityLine(countTrialActivity([], start));
    expect(line.zero).toBe(true);
    expect(line.text).toBe("You haven't checked an answer yet. Check one before your trial ends.");
    expect(line.text).not.toMatch(/\d/);
  });

  it("singular / plural, and only the non-zero parts", () => {
    expect(trialActivityLine({ checks: 1, tests: 0, practiceSets: 0 }).text).toBe("In your trial so far: 1 answer check.");
    expect(trialActivityLine({ checks: 0, tests: 3, practiceSets: 2 }).text).toBe("In your trial so far: 3 tests taken · 2 practice sets.");
  });

  it("PARITY: the server email's port says exactly what the banner says", () => {
    expect(server.countTrialActivity(records, start)).toEqual(countTrialActivity(records, start));
    for (const c of [
      { checks: 0, tests: 0, practiceSets: 0 },
      { checks: 1, tests: 0, practiceSets: 0 },
      { checks: 2, tests: 1, practiceSets: 5 },
    ]) {
      expect(server.trialActivityLine(c)).toEqual(trialActivityLine(c));
    }
    const t = ist(2026, 6, 8, 0, 0);
    expect(server.formatIstDate(t)).toBe(formatIstDate(t));
    expect(server.formatIstTime(t)).toBe(formatIstTime(t));
    expect(server.istDayKeyOf(t - 1)).toBe(istDayKeyOf(t - 1));
  });
});
