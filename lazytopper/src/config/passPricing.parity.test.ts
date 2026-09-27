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
  FOUNDING_OFFER_OPEN,
  PRICE_MONTHLY_FOUNDING_INR,
  PRICE_MONTHLY_LIST_INR,
  TILL_BOARDS_PAY_FRACTION,
  tillBoardsQuote,
} from "./pricing";
import { predictCbseExamDate } from "../services/cbseExamDate";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const server = require("../../server/services/passPricing.cjs") as {
  PRICE_MONTHLY_FOUNDING_INR: number;
  PRICE_MONTHLY_LIST_INR: number;
  FOUNDING_OFFER_OPEN: boolean;
  TILL_BOARDS_PAY_FRACTION: number;
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
    expect(server.FOUNDING_OFFER_OPEN).toBe(FOUNDING_OFFER_OPEN);
    expect(server.TILL_BOARDS_PAY_FRACTION).toBe(TILL_BOARDS_PAY_FRACTION);
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
      expect(mirror).toEqual({
        monthsLeft: client!.monthsLeft,
        monthlyInr: client!.monthlyInr,
        fullInr: client!.fullInr,
        priceInr: client!.priceInr,
      });
    }
  });

  it("the default offer is the shipped flag on both sides", () => {
    const now = istNoon("2026-09-27");
    expect(server.tillBoardsQuote(now, "2027-02-17")?.priceInr).toBe(tillBoardsQuote(now, "2027-02-17")?.priceInr);
  });

  it("CONTROL — the comparison can fail: a different board date gives a different price", () => {
    const now = istNoon("2026-09-27");
    expect(server.tillBoardsQuote(now, "2027-03-17")?.priceInr).not.toBe(
      tillBoardsQuote(now, "2027-02-17")?.priceInr,
    );
  });
});
