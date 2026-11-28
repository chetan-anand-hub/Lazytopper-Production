// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";

import {
  boardPassDeadlineLine,
  boardPassFoundingCountdownLine,
  foundingDaysLeft,
  boardPassFoundingLabel,
  boardPassPriceDisplay,
  boardPassPriceLine,
  FOUNDING_OFFER_CLOSES_AT_MS,
  TILL_BOARDS_AFTER_FOUNDING_INR,
  TILL_BOARDS_FOUNDING_INR,
  TILL_BOARDS_INLINE,
  TILL_BOARDS_LINE,
  tillBoardsQuote,
} from "./pricing";
import { predictCbseExamDate } from "../services/cbseExamDate";

/**
 * PRICE-FIXED-1 (owner ruling, 31 Oct 2026) - the Board Pass costs a FIXED price until the boards.
 *
 * It replaces PRICING-TB-1's "monthly x months left x 0.8", whose price shrank month by month and moved with the
 * founding offer. `tillBoardsQuote` keeps its signature (and the months-left / until-label it always carried),
 * but the price is the one constant on every day and in both offer states.
 */

const BOARD = "2027-02-17";

/** Noon IST on the given calendar date. */
function istNoon(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00+05:30`);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("tillBoardsQuote - PRICE-HOLD-1: the Board Pass is 1,917 on EVERY date (no founding deadline, no 2,499 switch)", () => {
  it("the constants are 1,917 (live) and 2,499 (retained, unreachable) and the price is displayed as 1,917 on every date", () => {
    expect(TILL_BOARDS_FOUNDING_INR).toBe(1917);
    expect(TILL_BOARDS_AFTER_FOUNDING_INR).toBe(2499);
    expect(boardPassPriceDisplay(istNoon("2026-10-31"))).toBe("₹1,917");
    // GST-EXCL-1: from 7 Nov 2026 the tag is "+ GST" (the charge, base + 18%, is on the Pay button / checkout).
    expect(boardPassPriceDisplay(istNoon("2026-11-04"))).toBe("₹1,917");
    expect(boardPassPriceDisplay(istNoon("2026-11-07"))).toBe("₹1,917 + GST");
    expect(boardPassPriceDisplay(istNoon("2026-12-02"))).toBe("₹1,917 + GST");
    expect(boardPassPriceLine(istNoon("2026-10-31"))).toBe("₹1,917 — one payment, valid till 28 Feb 2027");
    expect(boardPassPriceLine(istNoon("2026-12-02"))).toBe("₹1,917 + GST — one payment, valid till 28 Feb 2027");
  });

  it.each([
    ["2026-10-31", 1917],
    ["2026-11-15", 1917],
    ["2026-12-02", 1917],
    ["2027-02-01", 1917],
    ["2027-02-17", 1917],
  ])("%s -> %i, whatever the founding flag says (the date decides)", (today, price) => {
    for (const founding of [true, false]) {
      const quote = tillBoardsQuote(istNoon(today), BOARD, founding);
      expect(quote).not.toBeNull();
      expect(quote!.priceInr).toBe(price);
      expect(quote!.untilLabel).toBe("valid till 28 Feb 2027");
    }
  });

  it("every day from 1 Mar 2026 to the board date: ONE price, 1,917 - it never shrinks and never switches", () => {
    const start = Date.UTC(2026, 2, 1);
    const end = Date.UTC(2027, 1, 17);
    let checked = 0;
    for (let t = start; t <= end; t += 86_400_000) {
      const iso = new Date(t).toISOString().slice(0, 10);
      expect(tillBoardsQuote(istNoon(iso), BOARD)!.priceInr).toBe(1917);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(300);
  });

  it("does NOT switch at 00:00 IST 1 Dec: 23:59:59 IST 30 Nov, 00:00:00 IST 1 Dec and 00:00:01 IST 1 Dec are all 1,917", () => {
    expect(tillBoardsQuote(new Date("2026-11-30T23:59:59+05:30"), BOARD)!.priceInr).toBe(1917);
    expect(tillBoardsQuote(new Date("2026-12-01T00:00:00+05:30"), BOARD)!.priceInr).toBe(1917);
    expect(tillBoardsQuote(new Date("2026-12-01T00:00:01+05:30"), BOARD)!.priceInr).toBe(1917);
    expect(FOUNDING_OFFER_CLOSES_AT_MS).toBe(Number.POSITIVE_INFINITY);
  });

  it("the founding label stays (no date attached) and the deadline line is null on EVERY date, with no strike or saving claim", () => {
    for (const iso of ["2026-11-01T10:00:00+05:30", "2026-11-30T23:59:59+05:30", "2026-12-01T00:00:00+05:30", "2027-02-01T00:00:00+05:30"]) {
      expect(boardPassFoundingLabel(new Date(iso)), iso).toBe("Founding member offer");
      expect(boardPassDeadlineLine(new Date(iso)), iso).toBeNull();
    }
  });

  it("the quote carries no saving claim, struck price or monthly figure", () => {
    const q = tillBoardsQuote(istNoon("2026-10-31"), BOARD)! as unknown as Record<string, unknown>;
    expect(Object.keys(q).sort()).toEqual(["monthsLeft", "priceDisplay", "priceInr", "totalDisplay", "totalInr", "untilLabel"]);
  });
});

describe("tillBoardsQuote - the rules that stay", () => {
  it("k is never 0 - on the day of the first paper the plan still covers one month", () => {
    const q = tillBoardsQuote(istNoon(BOARD), BOARD)!;
    expect(q.monthsLeft).toBe(1);
    expect(q.priceInr).toBe(1917);
  });

  it("uses the IST calendar date, not UTC: 16 Dec 20:00 UTC is already 17 Dec in India", () => {
    expect(tillBoardsQuote(new Date("2026-12-16T20:00:00Z"), BOARD)!.monthsLeft).toBe(2);
    expect(tillBoardsQuote(new Date("2026-12-16T18:00:00Z"), BOARD)!.monthsLeft).toBe(3);
  });

  it("clamps a month-end day instead of rolling into the month after", () => {
    expect(tillBoardsQuote(istNoon("2026-12-31"), BOARD)!.monthsLeft).toBe(2);
    expect(tillBoardsQuote(istNoon("2026-11-30"), "2027-02-28")!.monthsLeft).toBe(3);
  });

  it("returns null for an unparseable board date rather than inventing a price", () => {
    expect(tillBoardsQuote(istNoon("2026-09-26"), "not-a-date")).toBeNull();
    expect(tillBoardsQuote(istNoon("2026-09-26"), "2027-02-30")).toBeNull();
    expect(tillBoardsQuote(new Date("nonsense"), BOARD)).toBeNull();
  });
});

describe("the number-free copy", () => {
  it("carries NO rupee figure and NO saving-versus-monthly claim", () => {
    for (const copy of [TILL_BOARDS_LINE, TILL_BOARDS_INLINE]) {
      expect(copy).not.toMatch(/₹/);
      expect(copy).not.toMatch(/%|save|off paying|monthly/i);
    }
  });
});

describe("tillBoardsQuote - wired to the same board date as the landing countdown", () => {
  it("on 2026-10-31 the predictor yields 2027-02-16 and the quote is ₹1,917", () => {
    vi.useFakeTimers();
    vi.setSystemTime(istNoon("2026-10-31"));
    const boardIso = predictCbseExamDate("10");
    expect(boardIso).toBe("2027-02-16");
    const q = tillBoardsQuote(new Date(), boardIso)!;
    expect(q.priceDisplay).toBe("₹1,917");
    expect(q.untilLabel).toBe("valid till 28 Feb 2027");
  });
});

describe("BP-PREBOARDS-1 / PRICE-HOLD-1 - there is no founding countdown", () => {
  const at = (iso: string) => new Date(iso);
  it("no days-left count and no countdown line on any date (the price has no end)", () => {
    for (const iso of ["2026-11-18T23:59:00+05:30", "2026-11-29T10:00:00+05:30", "2026-11-30T23:59:59+05:30", "2026-12-01T00:00:00+05:30", "2027-02-01T00:00:00+05:30"]) {
      expect(foundingDaysLeft(at(iso)), iso).toBeNull();
      expect(boardPassFoundingCountdownLine(at(iso)), iso).toBeNull();
    }
  });
});
