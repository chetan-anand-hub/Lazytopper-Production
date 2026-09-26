// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";

import {
  FOUNDING_OFFER_OPEN,
  PRICE_MONTHLY_FOUNDING_INR,
  PRICE_MONTHLY_LIST_INR,
  TILL_BOARDS_INLINE,
  TILL_BOARDS_LINE,
  TILL_BOARDS_PAY_FRACTION,
  TILL_BOARDS_SAVING_LABEL,
  TILL_BOARDS_SAVING_PERCENT,
  tillBoardsQuote,
} from "./pricing";
import { predictCbseExamDate } from "../services/cbseExamDate";

/**
 * PRICING-TB-1 · R3 + R7 — the till-boards price, a PURE function of (now, boardIso).
 *
 * Owner ruling (2026-09-26):
 *   today      = the calendar date in Asia/Kolkata
 *   monthsLeft = the smallest integer k >= 1 with today + k calendar months >= boardDate
 *   full       = monthly × monthsLeft   (monthly = founding while open, else list)
 *   price      = Math.round(full × 0.8)
 *
 * The five dated cases below are the ruling's own table, verbatim. Each `now` is
 * written as an explicit +05:30 instant so the IST calendar date is unambiguous
 * whatever time zone the test machine runs in.
 */

const BOARD = "2027-02-17";

/** Noon IST on the given calendar date. */
function istNoon(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00+05:30`);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("tillBoardsQuote — the ruling's five dated cases (founding open)", () => {
  it.each([
    { today: "2026-09-26", months: 5, price: "₹2,396", full: "₹2,995" },
    { today: "2026-12-16", months: 3, price: "₹1,438", full: "₹1,797" },
    { today: "2026-12-17", months: 2, price: "₹958", full: "₹1,198" },
    { today: "2027-02-17", months: 1, price: "₹479", full: "₹599" },
  ])("$today → $months months, $price, struck $full", ({ today, months, price, full }) => {
    const quote = tillBoardsQuote(istNoon(today), BOARD, true);
    expect(quote).not.toBeNull();
    expect(quote!.monthsLeft).toBe(months);
    expect(quote!.monthlyInr).toBe(PRICE_MONTHLY_FOUNDING_INR);
    expect(quote!.priceDisplay).toBe(price);
    expect(quote!.fullDisplay).toBe(full);
    expect(quote!.untilLabel).toBe("till your boards (Feb 2027)");
    expect(quote!.savingLabel).toBe("save 20%");
  });

  it("founding CLOSED on 2026-09-26 → ₹3,996, struck ₹4,995 (list rate)", () => {
    const quote = tillBoardsQuote(istNoon("2026-09-26"), BOARD, false);
    expect(quote).not.toBeNull();
    expect(quote!.monthsLeft).toBe(5);
    expect(quote!.monthlyInr).toBe(PRICE_MONTHLY_LIST_INR);
    expect(quote!.priceDisplay).toBe("₹3,996");
    expect(quote!.fullDisplay).toBe("₹4,995");
  });
});

describe("tillBoardsQuote — the rules behind the table", () => {
  it("price is Math.round(full × 0.8) and full is monthly × monthsLeft, on every day of a year", () => {
    // Walk every calendar day from 2026-03-01 to the board date: the derivation
    // must hold everywhere, not only on the five hand-picked dates.
    const start = Date.UTC(2026, 2, 1);
    const end = Date.UTC(2027, 1, 17);
    let checked = 0;
    for (let t = start; t <= end; t += 86_400_000) {
      const iso = new Date(t).toISOString().slice(0, 10);
      const q = tillBoardsQuote(istNoon(iso), BOARD, true)!;
      expect(q.fullInr).toBe(q.monthlyInr * q.monthsLeft);
      expect(q.priceInr).toBe(Math.round(q.fullInr * TILL_BOARDS_PAY_FRACTION));
      expect(q.priceInr).toBeLessThan(q.fullInr);
      expect(q.monthsLeft).toBeGreaterThanOrEqual(1);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(300);
  });

  it("the saving is 20% and every copy string derives from the one fraction", () => {
    expect(TILL_BOARDS_PAY_FRACTION).toBe(0.8);
    expect(TILL_BOARDS_SAVING_PERCENT).toBe(20);
    expect(TILL_BOARDS_SAVING_LABEL).toBe("save 20%");
    expect(TILL_BOARDS_LINE).toBe("Or pay once till your boards — 20% off.");
    expect(TILL_BOARDS_INLINE).toBe("or pay once till boards — 20% off");
  });

  it("the number-free copy carries NO rupee figure", () => {
    for (const copy of [TILL_BOARDS_LINE, TILL_BOARDS_INLINE, TILL_BOARDS_SAVING_LABEL]) {
      expect(copy).not.toMatch(/₹/);
    }
  });

  it("k is never 0 — on the day of the first paper the plan still covers one month", () => {
    const q = tillBoardsQuote(istNoon(BOARD), BOARD, true)!;
    expect(q.monthsLeft).toBe(1);
    expect(q.fullInr).toBe(PRICE_MONTHLY_FOUNDING_INR);
    expect(q.priceInr).toBeGreaterThan(0);
  });

  it("uses the IST calendar date, not UTC: 16 Dec 20:00 UTC is already 17 Dec in India", () => {
    // 2026-12-16T20:00Z = 2026-12-17 01:30 IST → the 17 Dec row (2 months).
    expect(tillBoardsQuote(new Date("2026-12-16T20:00:00Z"), BOARD, true)!.monthsLeft).toBe(2);
    // CONTROL — 18:00 UTC is 23:30 IST on the 16th → the 16 Dec row (3 months).
    expect(tillBoardsQuote(new Date("2026-12-16T18:00:00Z"), BOARD, true)!.monthsLeft).toBe(3);
  });

  it("clamps a month-end day instead of rolling into the month after", () => {
    // 31 Dec + 1 month = 31 Jan; + 2 months = 28 Feb (clamped) >= 17 Feb → 2.
    expect(tillBoardsQuote(istNoon("2026-12-31"), BOARD, true)!.monthsLeft).toBe(2);
    // 30 Nov + 3 months = 28 Feb (clamped from 30 Feb, never 2 Mar).
    expect(tillBoardsQuote(istNoon("2026-11-30"), "2027-02-28", true)!.monthsLeft).toBe(3);
  });

  it("returns null for an unparseable board date rather than inventing a price", () => {
    expect(tillBoardsQuote(istNoon("2026-09-26"), "not-a-date", true)).toBeNull();
    expect(tillBoardsQuote(istNoon("2026-09-26"), "2027-02-30", true)).toBeNull();
    expect(tillBoardsQuote(new Date("nonsense"), BOARD, true)).toBeNull();
  });

  it("defaults to the SHIPPED founding flag when the caller passes none", () => {
    const shipped = tillBoardsQuote(istNoon("2026-09-26"), BOARD)!;
    expect(shipped.monthlyInr).toBe(
      FOUNDING_OFFER_OPEN ? PRICE_MONTHLY_FOUNDING_INR : PRICE_MONTHLY_LIST_INR,
    );
  });
});

describe("tillBoardsQuote — wired to the same board date as the landing countdown", () => {
  it("on 2026-09-26 the predictor yields 2027-02-17 and the quote is ₹2,396 / ₹2,995", () => {
    vi.useFakeTimers();
    vi.setSystemTime(istNoon("2026-09-26"));
    const boardIso = predictCbseExamDate("10");
    expect(boardIso).toBe("2027-02-17");
    const q = tillBoardsQuote(new Date(), boardIso, true)!;
    expect(q.priceDisplay).toBe("₹2,396");
    expect(q.fullDisplay).toBe("₹2,995");
    expect(q.untilLabel).toBe("till your boards (Feb 2027)");
  });
});
