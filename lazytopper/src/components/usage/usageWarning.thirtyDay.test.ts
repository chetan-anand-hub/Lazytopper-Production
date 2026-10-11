// CAP-30DAY [FU-30DAY-WARN-BANNER] - the 75% / 90% warning knows the rolling 30-day window.
// The value stays UNSET on the server until the owner sets it, so a null thirtyDayPct must change nothing.

import { describe, it, expect } from "vitest";
import { parseUsageMe, type UsageSnapshot } from "../../services/usageClient";
import { usageWarning, warningBannerCopy, PREMIUM_WARN_WINDOWS } from "./usageWarningLogic";

const NOW = Date.parse("2026-09-28T04:30:00Z");
const FUTURE = "2026-10-20T18:30:00.000Z";
const MIDNIGHT = "2026-09-28T18:30:00.000Z";

const snap = (p: { fiveHourPct: number; dayPct: number; weekPct: number; thirtyDayPct?: number | null }, thirtyDayReset: string | null = FUTURE) =>
  parseUsageMe({
    enforced: true,
    tier: "premium",
    premium: { ...p, resets: { fiveHour: MIDNIGHT, day: MIDNIGHT, week: MIDNIGHT, thirtyDay: thirtyDayReset } },
  }) as UsageSnapshot;

describe("usageWarning · thirtyDay window", () => {
  it("★★ 80% of the 30-day allowance with the shorter windows low -> a 75 warning on the thirtyDay window, in the owner's wording", () => {
    const w = usageWarning(snap({ fiveHourPct: 5, dayPct: 5, weekPct: 10, thirtyDayPct: 80 }), NOW, "tutor");
    expect(w).toMatchObject({ tier: "premium", level: 75, window: "thirtyDay", resetAt: FUTURE });
    expect(warningBannerCopy(w!, NOW)).toMatch(/80%|75%/);
    expect(warningBannerCopy(w!, NOW)).toContain("your 30-day");
  });

  it("★★ a tie goes to the LONGER window (thirtyDay outranks week)", () => {
    const w = usageWarning(snap({ fiveHourPct: 0, dayPct: 0, weekPct: 80, thirtyDayPct: 80 }), NOW, "tutor");
    expect(w?.window).toBe("thirtyDay");
  });

  it("★ CONTROL: a null thirtyDayPct (value unset on the server) is exactly the old behaviour - week still decides", () => {
    const w = usageWarning(snap({ fiveHourPct: 0, dayPct: 0, weekPct: 80, thirtyDayPct: null }, null), NOW, "tutor");
    expect(w).toMatchObject({ level: 75, window: "week" });
    expect(usageWarning(snap({ fiveHourPct: 10, dayPct: 10, weekPct: 10, thirtyDayPct: null }, null), NOW, "tutor")).toBeNull();
  });

  it("★ 100% of the 30-day window is the limit panel's job (null here); a stale 30-day reading is ignored", () => {
    expect(usageWarning(snap({ fiveHourPct: 0, dayPct: 0, weekPct: 0, thirtyDayPct: 100 }), NOW, "tutor")).toBeNull();
    expect(usageWarning(snap({ fiveHourPct: 0, dayPct: 0, weekPct: 0, thirtyDayPct: 80 }, "2026-09-28T04:00:00.000Z"), NOW, "tutor")).toBeNull();
  });

  it("the window list is data-driven and ends with thirtyDay", () => {
    expect(PREMIUM_WARN_WINDOWS.map((w) => w.key)).toEqual(["fiveHour", "day", "week", "thirtyDay"]);
  });
});
