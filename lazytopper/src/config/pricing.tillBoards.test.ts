// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";

import {
  boardPassDeadlineLine,
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

describe("tillBoardsQuote - the Board Pass: 1,917 until the founding deadline, 2,499 from it", () => {
  it("the constants are 1,917 and 2,499 and are displayed as such", () => {
    expect(TILL_BOARDS_FOUNDING_INR).toBe(1917);
    expect(TILL_BOARDS_AFTER_FOUNDING_INR).toBe(2499);
    expect(boardPassPriceDisplay(istNoon("2026-10-31"))).toBe("₹1,917");
    // GST-EXCL-1: from 7 Nov 2026 the tag is "+ GST" (the charge, base + 18%, is on the Pay button / checkout).
    expect(boardPassPriceDisplay(istNoon("2026-11-04"))).toBe("₹1,917");
    expect(boardPassPriceDisplay(istNoon("2026-11-07"))).toBe("₹1,917 + GST");
    expect(boardPassPriceDisplay(istNoon("2026-12-02"))).toBe("₹2,499 + GST");
    expect(boardPassPriceLine(istNoon("2026-10-31"))).toBe("₹1,917 — one payment till your boards");
    expect(boardPassPriceLine(istNoon("2026-12-02"))).toBe("₹2,499 + GST — one payment till your boards");
  });

  it.each([
    ["2026-10-31", 1917],
    ["2026-11-15", 1917],
    ["2026-12-02", 2499],
    ["2027-02-01", 2499],
    ["2027-02-17", 2499],
  ])("%s -> %i, whatever the founding flag says (the date decides)", (today, price) => {
    for (const founding of [true, false]) {
      const quote = tillBoardsQuote(istNoon(today), BOARD, founding);
      expect(quote).not.toBeNull();
      expect(quote!.priceInr).toBe(price);
      expect(quote!.untilLabel).toBe("till your boards (Feb 2027)");
    }
  });

  it("every day from 1 Mar 2026 to the board date: one price before the deadline, one from it - it never shrinks", () => {
    const start = Date.UTC(2026, 2, 1);
    const end = Date.UTC(2027, 1, 17);
    let checked = 0;
    for (let t = start; t <= end; t += 86_400_000) {
      const iso = new Date(t).toISOString().slice(0, 10);
      const want = istNoon(iso).getTime() < FOUNDING_OFFER_CLOSES_AT_MS ? 1917 : 2499;
      expect(tillBoardsQuote(istNoon(iso), BOARD)!.priceInr).toBe(want);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(300);
  });

  it("switches exactly at the founding deadline: 23:59:59 IST 30 Nov -> 1,917; 00:00:00 IST 1 Dec -> 2,499", () => {
    expect(tillBoardsQuote(new Date("2026-11-30T23:59:59+05:30"), BOARD)!.priceInr).toBe(1917);
    expect(tillBoardsQuote(new Date("2026-12-01T00:00:00+05:30"), BOARD)!.priceInr).toBe(2499);
  });

  it("the founding label and the one deadline line exist before the deadline only, with no strike or saving claim", () => {
    expect(boardPassFoundingLabel(new Date("2026-11-30T23:59:59+05:30"))).toBe("Founding member offer");
    expect(boardPassDeadlineLine(new Date("2026-11-30T23:59:59+05:30"))).toBe(
      "Founding member offer ends 30 November. From 1 December: ₹2,499 + GST.",
    );
    expect(boardPassFoundingLabel(new Date("2026-12-01T00:00:00+05:30"))).toBeNull();
    expect(boardPassDeadlineLine(new Date("2026-12-01T00:00:00+05:30"))).toBeNull();
    expect(boardPassDeadlineLine(new Date("2026-11-01T10:00:00+05:30"))).not.toMatch(/\b(save|off|shrinks?)\b|%/i);
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
    expect(q.priceInr).toBe(2499);
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
  it("on 2026-10-31 the predictor yields 2027-02-17 and the quote is ₹1,917", () => {
    vi.useFakeTimers();
    vi.setSystemTime(istNoon("2026-10-31"));
    const boardIso = predictCbseExamDate("10");
    expect(boardIso).toBe("2027-02-17");
    const q = tillBoardsQuote(new Date(), boardIso)!;
    expect(q.priceDisplay).toBe("₹1,917");
    expect(q.untilLabel).toBe("till your boards (Feb 2027)");
  });
});
