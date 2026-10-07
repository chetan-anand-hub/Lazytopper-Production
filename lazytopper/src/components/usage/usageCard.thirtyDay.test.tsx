/**
 * CAP-30DAY — the Me / Progress usage card's "Last 30 days" bar.
 *
 * Pinned:
 *   - a premium /api/usage/me body WITH thirtyDayPct -> a fourth bar, percentage only,
 *     after the week bar, using the same row/bar classes as the others;
 *   - an OLDER server's body (no thirtyDayPct) -> exactly the three bars as before, and the
 *     body still parses (backward compatible);
 *   - a malformed thirtyDayPct (over 100, a string) -> no 30-day bar, never a guessed one,
 *     and the other three bars still render;
 *   - no rupees, no codes.
 *
 * CLOCK: no reset times are sent here (null), so nothing reads or formats a date; reset
 * times are pinned server-side (server/services/fairUse.thirtyDay.test.cjs).
 *
 * MUTATIONS (each alone, RED, restored):
 *   UI30-1  UsageCard.tsx: drop the thirtyDay bar           -> "renders the 30-day bar" RED
 *   UI30-2  usageClient.ts: thirtyDayPct always null         -> "renders the 30-day bar" RED
 *   UI30-3  usageClient.ts: accept any number (no isPct)     -> "malformed" RED
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { UsageCardView } from "./UsageCard";
import { parseUsageMe, type UsageSnapshot } from "../../services/usageClient";

afterEach(cleanup);

const NO_RUPEES_OR_CODES = /₹|inr|rupee|cost|usage_limit|thirtyDay/i;

function premiumBody(extra: Record<string, unknown> = {}) {
  return {
    enforced: true,
    tier: "premium",
    trial: null,
    premium: {
      fiveHourPct: 40,
      dayPct: 20,
      weekPct: 63,
      resets: { fiveHour: null, day: null, week: null, thirtyDay: null },
      ...extra,
    },
  };
}

const snap = (body: unknown) => parseUsageMe(body) as UsageSnapshot;
const barValues = () =>
  (Array.from(document.querySelectorAll("progress.lt-usage__bar")) as HTMLProgressElement[]).map((b) => b.value);

describe("CAP-30DAY · usage card 30-day bar", () => {
  it("★★ renders the 30-day bar with its percentage, after the week bar", () => {
    const s = snap(premiumBody({ thirtyDayPct: 27 }));
    expect(s.premium?.thirtyDayPct).toBe(27);
    render(<UsageCardView snapshot={s} nowMs={0} />);
    expect(barValues()).toEqual([40, 20, 63, 27]);
    const row = screen.getByTestId("usage-bar-thirtyDay");
    expect(row.textContent).toContain("Last 30 days");
    expect(row.textContent).toContain("27% used");
    expect(row.querySelector("progress")?.getAttribute("aria-label")).toBe(
      "Last 30 days: 27% of the fair-use limit used",
    );
    expect(row.className).toBe("lt-usage__row");
    expect(screen.getByTestId("usage-card").textContent).not.toMatch(NO_RUPEES_OR_CODES);
  });

  it("★ an older server (no thirtyDayPct) -> exactly the three bars as before", () => {
    const body = premiumBody();
    delete (body.premium as Record<string, unknown>).thirtyDayPct;
    (body.premium as { resets: Record<string, unknown> }).resets = { fiveHour: null, day: null, week: null };
    const s = snap(body);
    expect(s.premium).not.toBeNull();
    expect(s.premium?.thirtyDayPct).toBeNull();
    expect(s.premium?.resets.thirtyDay).toBeNull();
    render(<UsageCardView snapshot={s} nowMs={0} />);
    expect(barValues()).toEqual([40, 20, 63]);
    expect(screen.queryByTestId("usage-bar-thirtyDay")).toBeNull();
  });

  it("★ a malformed thirtyDayPct -> no 30-day bar, the other bars unchanged", () => {
    for (const bad of [140, "50", -1, Number.NaN]) {
      const s = snap(premiumBody({ thirtyDayPct: bad }));
      expect(s.premium?.weekPct).toBe(63);
      expect(s.premium?.thirtyDayPct).toBeNull();
      render(<UsageCardView snapshot={s} nowMs={0} />);
      expect(screen.queryByTestId("usage-bar-thirtyDay")).toBeNull();
      expect(barValues()).toEqual([40, 20, 63]);
      cleanup();
    }
  });

  it("★ trial card is untouched: no 30-day row", () => {
    const s = snap({
      enforced: true,
      tier: "trial",
      premium: null,
      trial: {
        checksLeftToday: 3,
        chapterTestsLeftToday: 1,
        mocksLeft: 1,
        worksheetsLeft: 1,
        resets: { checks: null, chapterTests: null, mocks: null, worksheets: null },
      },
    });
    render(<UsageCardView snapshot={s} nowMs={0} />);
    expect(screen.getByTestId("usage-card")).toBeInTheDocument();
    expect(screen.queryByTestId("usage-bar-thirtyDay")).toBeNull();
    expect(screen.getByTestId("usage-card").textContent).not.toMatch(/30 days/);
  });
});
