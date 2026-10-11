// @vitest-environment node
// CAP-30DAY 27d - the CLIENT knows the 30-day window. Once the optional cap is switched on, a
// 429 { error: "usage_limit", window: "thirtyDay" } must reach the student as the calm fair-use
// panel, not the generic error. (Server pins: server/services/fairUse.thirtyDay.test.cjs.)

import { describe, it, expect, vi } from "vitest";

vi.mock("../../ai/paidCallHeaders", () => ({
  UID_HEADER: "X-Lazytopper-Uid",
  paidJsonHeaders: async () => ({ "Content-Type": "application/json", "X-Lazytopper-Uid": "u", Authorization: "Bearer t" }),
}));

import { checkSolutionImage, FairUseLimitError, resetPaperPassCacheForTests } from "../../ai/aiClient";
import { parseUsageMe, readFairUseLimit, type UsageSnapshot } from "../../services/usageClient";
import { fullPremiumWindow, limitCopy, limitFromRefusal, PREMIUM_WINDOW_LABEL } from "./fairUseGate";

const premium = (extra: Record<string, unknown> = {}) =>
  parseUsageMe({
    enforced: true,
    tier: "premium",
    trial: null,
    premium: { fiveHourPct: 10, dayPct: 10, weekPct: 10, resets: { fiveHour: null, day: null, week: null, thirtyDay: "2026-11-01T00:00:00.000Z" }, ...extra },
  }) as UsageSnapshot;

describe("CAP-30DAY 27d · client knows the thirtyDay window", () => {
  it("★★ a 429 usage_limit with window thirtyDay becomes a FairUseLimitError carrying the window (not null)", async () => {
    resetPaperPassCacheForTests();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "usage_limit", window: "thirtyDay", resetAt: "2026-11-01T00:00:00.000Z" }), { status: 429 })));
    const err = await checkSolutionImage({ imageBase64: "x", imageMimeType: "image/png" } as never).catch((e) => e);
    vi.unstubAllGlobals();
    expect(err).toBeInstanceOf(FairUseLimitError);
    expect((err as FairUseLimitError).window).toBe("thirtyDay");
    expect(readFairUseLimit(err)?.window).toBe("thirtyDay");
  });

  it("★★ the panel names the 30-day limit and its reset; an unknown window is still rejected", () => {
    const snapshot = premium();
    const limit = limitFromRefusal({ kind: "usage_limit", remaining: null, resetAt: null, window: "thirtyDay" }, snapshot, "checks");
    expect(limit?.window).toBe("thirtyDay");
    expect(limit?.resetAt).toBe("2026-11-01T00:00:00.000Z"); // from the snapshot's resets.thirtyDay
    const copy = limitCopy(limit!);
    expect(copy.lead).toBe("You've reached this 30-day fair-use limit.");
    expect(copy.showPlans).toBe(false);
    expect(readFairUseLimit({ name: "FairUseLimitError", kind: "usage_limit", window: "century" })?.window).toBeNull();
  });

  it("★ fullPremiumWindow: the 30-day window decides when it is the full one; absent/under 100 changes nothing", () => {
    expect(fullPremiumWindow(premium({ thirtyDayPct: 100 }))).toBe("thirtyDay");
    expect(fullPremiumWindow(premium({ thirtyDayPct: 100, weekPct: 100 }))).toBe("thirtyDay");
    expect(fullPremiumWindow(premium({ thirtyDayPct: 99, weekPct: 100 }))).toBe("week");
    expect(fullPremiumWindow(premium())).toBeNull();
    expect(PREMIUM_WINDOW_LABEL.thirtyDay).toBe("30-day");
  });
});
