// @vitest-environment node
//
// STORED-RATE-1 R6 · P16 — the SERVER's pass pricing is a mirror; this suite is the
// proof that the mirror and the source agree.
//
// `server/services/passPricing.cjs` copies the four owner constants from
// `src/config/pricing.ts` and the date logic of `tillBoardsQuote` (pricing.ts) and
// `predictCbseExamDate` (services/cbseExamDate.ts), because the server must price a
// grant at the instant it is GIVEN and `predictCbseExamDate` reads the clock itself.
// A duplicated number is only safe while something re-checks it: change a price in
// pricing.ts without changing it in passPricing.cjs and this file turns red.
//
// ★ Every `now` is NOON IST (06:30Z) on the named calendar date, so the IST date the
// server uses and the device-local date the client predictor uses are the same date
// on any machine between UTC-06:30 and UTC+11:30 — CI (UTC) and a dev box (IST) alike.

import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FOUNDING_OFFER_CLOSES_AT_ISO,
  FOUNDING_OFFER_CLOSES_AT_MS,
  foundingOfferOpen,
  MONTH_PASS_RETIRED_AT_ISO,
  MONTH_PASS_RETIRED_AT_MS,
  monthPassAvailable,
  monthPassRetired,
  PRICE_MONTHLY_FOUNDING_INR,
  PRICE_MONTHLY_LIST_INR,
  TILL_BOARDS_AFTER_FOUNDING_INR,
  TILL_BOARDS_FOUNDING_INR,
  tillBoardsPriceInr,
  tillBoardsQuote,
} from "./pricing";
import { predictCbseExamDate } from "../services/cbseExamDate";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const server = require("../../server/services/passPricing.cjs") as {
  PRICE_MONTHLY_FOUNDING_INR: number;
  PRICE_MONTHLY_LIST_INR: number;
  FOUNDING_OFFER_CLOSES_AT_ISO: string;
  FOUNDING_OFFER_CLOSES_AT_MS: number;
  foundingOfferOpen: (now: Date | number) => boolean;
  TILL_BOARDS_FOUNDING_INR: number;
  TILL_BOARDS_AFTER_FOUNDING_INR: number;
  tillBoardsPriceInr: (now: Date | number) => number;
  MONTH_PASS_RETIRED_AT_ISO: string;
  MONTH_PASS_RETIRED_AT_MS: number;
  monthPassRetired: (now: Date | number) => boolean;
  monthPassAvailable: (now: Date | number, hasPriorMonthOrder: boolean) => boolean;
  predictBoardDateIso: (now: Date | number) => string | null;
  tillBoardsQuote: (
    now: Date | number,
    boardIso: string,
    foundingOpen?: boolean,
  ) => { monthsLeft: number; monthlyInr: number; fullInr: number; priceInr: number } | null;
};

/** Noon IST on the given calendar date. */
function istNoon(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00+05:30`);
}

/**
 * The dated cases: month ends (30/31-day, February, leap February, year end), the
 * August academic-year switch, the official 2026 board day and the days either side
 * of it, and the 2027 predicted board day and the days either side of it.
 */
const DATES = [
  "2026-01-31",
  "2026-02-16",
  "2026-02-17", // official 2025-26 board day
  "2026-02-18",
  "2026-02-28",
  "2026-03-31",
  "2026-07-31",
  "2026-08-01",
  "2026-08-31",
  "2026-09-27",
  "2026-11-30",
  "2026-12-31",
  "2027-01-31",
  "2027-02-16",
  "2027-02-17", // predicted 2026-27 board day
  "2027-02-18",
  "2028-02-29", // leap day
];

afterEach(() => {
  vi.useRealTimers();
});

describe("P16 — server pass pricing mirrors pricing.ts exactly", () => {
  it("the four owner constants are identical", () => {
    expect(server.PRICE_MONTHLY_FOUNDING_INR).toBe(PRICE_MONTHLY_FOUNDING_INR);
    expect(server.PRICE_MONTHLY_LIST_INR).toBe(PRICE_MONTHLY_LIST_INR);
    expect(server.FOUNDING_OFFER_CLOSES_AT_ISO).toBe(FOUNDING_OFFER_CLOSES_AT_ISO);
    expect(server.FOUNDING_OFFER_CLOSES_AT_MS).toBe(FOUNDING_OFFER_CLOSES_AT_MS);
    expect(server.TILL_BOARDS_FOUNDING_INR).toBe(TILL_BOARDS_FOUNDING_INR);
    expect(server.TILL_BOARDS_AFTER_FOUNDING_INR).toBe(TILL_BOARDS_AFTER_FOUNDING_INR);
    expect(TILL_BOARDS_FOUNDING_INR).toBe(1917);
    expect(TILL_BOARDS_AFTER_FOUNDING_INR).toBe(2499);
  });

  // PRICE-FIXED-1 - the month pass is retired for new buyers at 00:00 IST on 1 Nov 2026, on BOTH sides.
  it("PRICE-FIXED-1 · the month-pass retirement instant and rule are identical on both sides", () => {
    expect(server.MONTH_PASS_RETIRED_AT_ISO).toBe(MONTH_PASS_RETIRED_AT_ISO);
    expect(server.MONTH_PASS_RETIRED_AT_MS).toBe(MONTH_PASS_RETIRED_AT_MS);
    expect(MONTH_PASS_RETIRED_AT_ISO).toBe("2026-11-01T00:00:00+05:30");
    for (const offsetMs of [-86_400_000, -1000, -1, 0, 1, 1000, 86_400_000]) {
      const at = MONTH_PASS_RETIRED_AT_MS + offsetMs;
      expect(server.monthPassRetired(at), `offset ${offsetMs}`).toBe(monthPassRetired(at));
      for (const prior of [true, false]) expect(server.monthPassAvailable(at, prior)).toBe(monthPassAvailable(at, prior));
    }
    expect(monthPassRetired(MONTH_PASS_RETIRED_AT_MS - 1)).toBe(false);
    expect(monthPassRetired(MONTH_PASS_RETIRED_AT_MS)).toBe(true);
    expect(monthPassAvailable(MONTH_PASS_RETIRED_AT_MS, false)).toBe(false);
    expect(monthPassAvailable(MONTH_PASS_RETIRED_AT_MS, true)).toBe(true);
  });

  // PRICING-1 — the founding offer closes at 00:00 IST on 1 Dec 2026 (owner: "december will
  // start with 999/month"). Client and server must flip at the SAME instant.
  it("PRICING-1 · the founding offer: open at 23:59:59 IST on 30 Nov 2026, closed at 00:00:00 IST on 1 Dec, on BOTH sides", () => {
    const lastSecond = new Date("2026-11-30T23:59:59+05:30");
    const firstSecond = new Date("2026-12-01T00:00:00+05:30");
    const justBefore = new Date(firstSecond.getTime() - 1);
    expect(foundingOfferOpen(lastSecond)).toBe(true);
    expect(foundingOfferOpen(justBefore)).toBe(true);
    expect(foundingOfferOpen(firstSecond)).toBe(false);
    expect(server.foundingOfferOpen(lastSecond)).toBe(true);
    expect(server.foundingOfferOpen(justBefore)).toBe(true);
    expect(server.foundingOfferOpen(firstSecond)).toBe(false);
    // Whole-millisecond agreement across the boundary and a spread either side.
    for (const offsetMs of [-86_400_000, -1000, -1, 0, 1, 1000, 86_400_000]) {
      const at = FOUNDING_OFFER_CLOSES_AT_MS + offsetMs;
      expect(server.foundingOfferOpen(at), `offset ${offsetMs}`).toBe(foundingOfferOpen(at));
    }
    expect(foundingOfferOpen(Number.NaN)).toBe(false);
    expect(server.foundingOfferOpen(Number.NaN)).toBe(false);
  });

  it("PRICING-1 · the default offer in tillBoardsQuote follows the instant it is given, on both sides", () => {
    const board = "2027-02-17";
    const before = new Date("2026-11-30T23:59:59+05:30");
    const after = new Date("2026-12-01T00:00:00+05:30");
    for (const now of [before, after]) {
      const c = tillBoardsQuote(now, board)!;
      const m = server.tillBoardsQuote(now, board)!;
      expect({ monthsLeft: m.monthsLeft, priceInr: m.priceInr }).toEqual({ monthsLeft: c.monthsLeft, priceInr: c.priceInr });
      // PRICE-FIXED-1: the Board Pass is 1917 until the founding deadline and 2499 from it, on BOTH sides.
      expect(c.priceInr).toBe(foundingOfferOpen(now) ? TILL_BOARDS_FOUNDING_INR : TILL_BOARDS_AFTER_FOUNDING_INR);
      expect(server.tillBoardsPriceInr(now)).toBe(tillBoardsPriceInr(now));
    }
    // The server still reports the legacy monthly rate (month orders are priced by it); the CLIENT quote has none.
    expect(server.tillBoardsQuote(before, board)!.monthlyInr).toBe(PRICE_MONTHLY_FOUNDING_INR);
    expect(server.tillBoardsQuote(after, board)!.monthlyInr).toBe(PRICE_MONTHLY_LIST_INR);
  });

  it(`covers at least 12 dated cases (has ${DATES.length})`, () => {
    expect(DATES.length).toBeGreaterThanOrEqual(12);
  });

  it.each(DATES)("R6 parity %s — board date equals predictCbseExamDate('10')", (date) => {
    const now = istNoon(date);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    const client = predictCbseExamDate("10");
    vi.useRealTimers();
    expect(server.predictBoardDateIso(now)).toBe(client);
  });

  it.each(DATES)("R6 parity %s — till-boards quote equals tillBoardsQuote (founding AND regular)", (date) => {
    const now = istNoon(date);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    const board = predictCbseExamDate("10");
    vi.useRealTimers();

    for (const foundingOpen of [true, false]) {
      const client = tillBoardsQuote(now, board, foundingOpen);
      const mirror = server.tillBoardsQuote(now, board, foundingOpen);
      expect(client).not.toBeNull();
      expect({ monthsLeft: mirror!.monthsLeft, priceInr: mirror!.priceInr }).toEqual({
        monthsLeft: client!.monthsLeft,
        priceInr: client!.priceInr,
      });
      // The price follows the DATE on both sides, not the flag.
      expect(client!.priceInr).toBe(tillBoardsPriceInr(now));
      expect(mirror!.priceInr).toBe(server.tillBoardsPriceInr(now));
    }
  });

  it("the default offer is the shipped flag on both sides", () => {
    const now = istNoon("2026-09-27");
    expect(server.tillBoardsQuote(now, "2027-02-17")?.priceInr).toBe(tillBoardsQuote(now, "2027-02-17")?.priceInr);
  });

  it("CONTROL — the comparison can fail: a different board date gives a different months-left, the price stays fixed", () => {
    const now = istNoon("2026-09-27");
    expect(server.tillBoardsQuote(now, "2027-03-17")?.monthsLeft).not.toBe(
      tillBoardsQuote(now, "2027-02-17")?.monthsLeft,
    );
    expect(server.tillBoardsQuote(now, "2027-03-17")?.priceInr).toBe(1917);
  });
});
