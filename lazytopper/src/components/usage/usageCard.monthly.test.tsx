/**
 * FAIRUSE-MONTHLY-1 — Board Pass fair use is ONE monthly bar plus a daily safety ceiling.
 *
 * Pinned: a payload with only thirtyDayPct + dayPct (5-hour / week OFF on the server) parses and
 * renders ONE "This month" bar with its reset DATE; the daily line shows only from 75% of the daily
 * ceiling; limit copy says "this month's" with a date / "today's" with a time; no rupees, no "Premium".
 *
 * CLOCK: fixed instants only (NOW = 2026-11-10 06:00Z = 11:30 IST).
 *
 * MUTATIONS (each alone, RED, restored):
 *   MM-C1  UsageCard.tsx: render the daily line at any percentage          -> "daily line threshold" RED
 *   MM-C2  UsageCard.tsx: render 5-hour/week bars even when the month exists -> "ONE bar" RED
 *   MM-C3  usageClient.ts: require fiveHourPct/weekPct again                 -> "payload without 5h/week" RED
 *   MM-C4  fairUseGate.ts: month resets "at" with a clock time               -> "copy strings" RED
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { UsageCardView } from "./UsageCard";
import { limitCopy, limitResetWhen, tutorLimitMessage } from "./fairUseGate";
import { usageWarning, warningBannerCopy } from "./usageWarningLogic";
import { parseUsageMe, type UsageSnapshot } from "../../services/usageClient";

afterEach(cleanup);

const NOW = Date.UTC(2026, 10, 10, 6, 0, 0);
const MONTH_RESET = "2026-11-17T18:30:00.000Z"; // 00:00 IST Wed 18 Nov
const DAY_RESET = "2026-11-10T18:30:00.000Z"; // 00:00 IST Wed 11 Nov

function live(dayPct: number, thirtyDayPct = 40): unknown {
  return {
    enforced: true,
    tier: "premium",
    trial: null,
    premium: { dayPct, thirtyDayPct, resets: { day: DAY_RESET, thirtyDay: MONTH_RESET } },
  };
}
const snap = (b: unknown) => parseUsageMe(b) as UsageSnapshot;
const bars = () => Array.from(document.querySelectorAll("progress.lt-usage__bar")) as HTMLProgressElement[];

describe("FAIRUSE-MONTHLY-1 · usage card", () => {
  it("★★ payload without 5h/week still parses (not null) and renders ONE bar: This month, with its date", () => {
    const s = snap(live(10));
    expect(s.premium).not.toBeNull();
    expect(s.premium?.fiveHourPct).toBeNull();
    expect(s.premium?.weekPct).toBeNull();
    render(<UsageCardView snapshot={s} nowMs={NOW} />);
    expect(bars().map((b) => b.value)).toEqual([40]);
    const row = screen.getByTestId("usage-bar-thirtyDay");
    expect(row.textContent).toContain("This month");
    expect(row.textContent).toContain("40% used");
    expect(row.textContent).toContain("Resets on Wed 18 Nov");
    expect(screen.queryByTestId("usage-bar-fiveHour")).toBeNull();
    expect(screen.queryByTestId("usage-bar-week")).toBeNull();
    expect(screen.queryByTestId("usage-bar-day")).toBeNull();
    expect(screen.queryByTestId("usage-empty")).toBeNull();
  });

  it("★ a legacy server that still sends all windows plus the month shows ONLY the month bar", () => {
    const s = snap({ ...(live(10) as object), premium: { fiveHourPct: 5, dayPct: 10, weekPct: 20, thirtyDayPct: 40, resets: { thirtyDay: MONTH_RESET } } });
    render(<UsageCardView snapshot={s} nowMs={NOW} />);
    expect(bars().map((b) => b.value)).toEqual([40]);
  });

  it("★★ daily line threshold: hidden at 74%, shown at 75% with the reset time, still shown at 100%", () => {
    render(<UsageCardView snapshot={snap(live(74))} nowMs={NOW} />);
    expect(screen.queryByTestId("usage-today-heavy")).toBeNull();
    cleanup();
    render(<UsageCardView snapshot={snap(live(75))} nowMs={NOW} />);
    expect(screen.getByTestId("usage-today-heavy").textContent).toBe("Today: heavy use — resets at 12:00 am on Wed 11 Nov");
    cleanup();
    render(<UsageCardView snapshot={snap(live(100))} nowMs={NOW} />);
    expect(screen.getByTestId("usage-today-heavy")).toBeTruthy();
  });

  it("★ no rupees, no codes, no 'Premium' on the card", () => {
    render(<UsageCardView snapshot={snap(live(90))} nowMs={NOW} />);
    expect(screen.getByTestId("usage-card").textContent).not.toMatch(/₹|inr|rupee|cost|usage_limit|premium/i);
  });

  it("★ a month-less server with only the daily window still draws that window (never the empty state)", () => {
    const s = snap({ enforced: true, tier: "premium", premium: { dayPct: 30, resets: { day: DAY_RESET } } });
    render(<UsageCardView snapshot={s} nowMs={NOW} />);
    expect(bars().map((b) => b.value)).toEqual([30]);
  });

  it("★ a payload with no window at all, or a malformed present window, is the honest empty state", () => {
    expect(snap({ enforced: true, tier: "premium", premium: { resets: {} } }).premium).toBeNull();
    expect(snap({ enforced: true, tier: "premium", premium: { dayPct: 140, thirtyDayPct: 10, resets: {} } }).premium).toBeNull();
  });
});

describe("FAIRUSE-MONTHLY-1 · copy strings", () => {
  const month = { tier: "premium", scope: "checks", resetAt: MONTH_RESET, window: "thirtyDay" } as const;
  const day = { tier: "premium", scope: "checks", resetAt: DAY_RESET, window: "day" } as const;

  it("★★ monthly: \"You've reached this month's fair-use limit. It resets on <date>.\"", () => {
    expect(limitCopy(month)).toMatchObject({ lead: "You've reached this month's fair-use limit.", resetPrefix: "It resets on" });
    expect(limitResetWhen(month, NOW)).toBe("Wed 18 Nov");
    expect(tutorLimitMessage(month, NOW)).toBe("You've reached this month's fair-use limit. It resets on Wed 18 Nov.");
  });

  it("★★ daily: \"You've reached today's fair-use limit. It resets at <time>.\"", () => {
    expect(limitCopy(day)).toMatchObject({ lead: "You've reached today's fair-use limit.", resetPrefix: "It resets at" });
    expect(tutorLimitMessage(day, NOW)).toBe("You've reached today's fair-use limit. It resets at 12:00 am on Wed 11 Nov.");
  });

  it("★ never rupees, never 'Premium'", () => {
    for (const l of [month, day]) expect(tutorLimitMessage(l, NOW)).not.toMatch(/premium|₹|rupee/i);
  });

  it("★ the 75% banner names the month with a date, from a payload without 5h/week", () => {
    const w = usageWarning(snap(live(10, 80)), NOW, "tutor");
    expect(w).toMatchObject({ tier: "premium", window: "thirtyDay", level: 75 });
    expect(warningBannerCopy(w!, NOW)).toBe("You've used 75% of this month's AI use allowance. It resets on Wed 18 Nov.");
  });
});
