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
  boardPassGstBreakdown,
  boardPassTotalInr,
  chargeFor,
  displayPlusGst,
  formatInr,
  GST_EXCLUSIVE_FROM_ISO,
  GST_EXCLUSIVE_FROM_MS,
  GST_RATE_PERCENT,
  gstBreakdownFor,
  priceWithGst,
} from "./pricing";
import { PACK_PRICE_INR } from "../services/packs";
import * as P from "./pricing";
import * as K from "../services/packs";
import { predictCbseExamDate } from "../services/cbseExamDate";

/** PRICE-HOLD-1: the RETIRED 1 Dec 2026 00:00 IST switch instant - kept only as a test probe: nothing changes at it. */
const OLD_SWITCH_MS = Date.parse("2026-12-01T00:00:00+05:30");
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const server = require("../../server/services/passPricing.cjs") as {
  PRICE_MONTHLY_FOUNDING_INR: number;
  PRICE_MONTHLY_LIST_INR: number;
  FOUNDING_OFFER_CLOSES_AT_ISO: string | null;
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
    // PRICE-HOLD-1: both sides agree there is NO closing instant.
    expect(FOUNDING_OFFER_CLOSES_AT_ISO).toBeNull();
    expect(server.FOUNDING_OFFER_CLOSES_AT_ISO).toBeNull();
    expect(FOUNDING_OFFER_CLOSES_AT_MS).toBe(Number.POSITIVE_INFINITY);
    expect(server.FOUNDING_OFFER_CLOSES_AT_MS).toBe(Number.POSITIVE_INFINITY);
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

  // PRICE-HOLD-1 (owner, 28 Nov 2026): the founding offer NEVER closes. Client and server must agree at every instant.
  it("PRICE-HOLD-1 · the founding offer is open at 23:59:59 IST on 30 Nov 2026 AND at 00:00:00 IST on 1 Dec AND later, on BOTH sides", () => {
    const lastSecond = new Date("2026-11-30T23:59:59+05:30");
    const firstSecond = new Date("2026-12-01T00:00:00+05:30");
    const justBefore = new Date(firstSecond.getTime() - 1);
    for (const d of [lastSecond, justBefore, firstSecond, new Date("2027-02-01T00:00:00+05:30"), new Date("2030-01-01T00:00:00+05:30")]) {
      expect(foundingOfferOpen(d)).toBe(true);
      expect(server.foundingOfferOpen(d)).toBe(true);
    }
    // Whole-millisecond agreement across the old boundary and a spread either side.
    for (const offsetMs of [-86_400_000, -1000, -1, 0, 1, 1000, 86_400_000]) {
      const at = OLD_SWITCH_MS + offsetMs;
      expect(server.foundingOfferOpen(at), `offset ${offsetMs}`).toBe(foundingOfferOpen(at));
      expect(foundingOfferOpen(at), `offset ${offsetMs}`).toBe(true);
    }
    expect(foundingOfferOpen(Number.NaN)).toBe(false);
    expect(server.foundingOfferOpen(Number.NaN)).toBe(false);
  });

  it("PRICE-HOLD-1 · the default offer in tillBoardsQuote is the founding price at every instant, on both sides", () => {
    const board = "2027-02-17";
    for (const now of [new Date("2026-11-30T23:59:59+05:30"), new Date("2026-12-01T00:00:00+05:30"), new Date("2027-02-01T00:00:00+05:30")]) {
      const c = tillBoardsQuote(now, board)!;
      const m = server.tillBoardsQuote(now, board)!;
      expect({ monthsLeft: m.monthsLeft, priceInr: m.priceInr }).toEqual({ monthsLeft: c.monthsLeft, priceInr: c.priceInr });
      expect(c.priceInr).toBe(TILL_BOARDS_FOUNDING_INR);
      expect(server.tillBoardsPriceInr(now)).toBe(tillBoardsPriceInr(now));
      expect(tillBoardsPriceInr(now)).toBe(1917);
      // The server still reports the legacy monthly rate (month orders are priced by it); the CLIENT quote has none.
      expect(m.monthlyInr).toBe(PRICE_MONTHLY_FOUNDING_INR);
    }
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

// ── GST-EXCL-1 (owner, 4 Nov 2026): EVERY paid product is priced "+ 18% GST" from 00:00 IST 7 Nov 2026. The server
// charges `chargeFor(base, orderTime)`; the client shows `chargeFor(base, now)`. They are the same rule or this is red.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const gstServer = require("../../server/services/passPricing.cjs") as {
  GST_RATE_PERCENT: number;
  GST_EXCLUSIVE_FROM_ISO: string;
  GST_EXCLUSIVE_FROM_MS: number;
  chargeFor: (base: number, now: number) => { baseInr: number; gstInr: number; totalInr: number; gstRate: number; gstExclusive: boolean };
  priceWithGst: (base: number, now: number) => number;
  displayPlusGst: (base: number, now: number) => string;
  gstBreakdownFor: (base: number, now: number) => string | null;
  formatInr: (n: number) => string;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const serverPacks = require("../../server/services/packProducts.cjs") as { PACK_PRODUCTS: Record<string, { priceInr: number }> };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const serverTopups = (require("../../server/services/passPricing.cjs") as { TOPUP_PRODUCTS: Record<string, { priceInr: number }> }).TOPUP_PRODUCTS;

describe("GST-EXCL-1 — the GST rule is ONE rule, server and client, for the Board Pass, every pack and top-ups", () => {
  const CUT = GST_EXCLUSIVE_FROM_MS;
  const INSTANTS: number[] = [CUT - 86_400_000, CUT - 1, CUT, CUT + 1, +istNoon("2026-11-30"), OLD_SWITCH_MS - 1, OLD_SWITCH_MS, +istNoon("2027-02-01")];
  const BASES = [
    TILL_BOARDS_FOUNDING_INR,
    TILL_BOARDS_AFTER_FOUNDING_INR,
    ...Object.values(PACK_PRICE_INR),
    ...Object.values(serverPacks.PACK_PRODUCTS).map((p) => p.priceInr),
    ...Object.values(serverTopups).map((p) => p.priceInr),
  ];

  it("the constants are identical: 18%, from 2026-11-07T00:00:00+05:30", () => {
    expect(GST_RATE_PERCENT).toBe(18);
    expect(gstServer.GST_RATE_PERCENT).toBe(GST_RATE_PERCENT);
    expect(GST_EXCLUSIVE_FROM_ISO).toBe("2026-11-07T00:00:00+05:30");
    expect(gstServer.GST_EXCLUSIVE_FROM_ISO).toBe(GST_EXCLUSIVE_FROM_ISO);
    expect(gstServer.GST_EXCLUSIVE_FROM_MS).toBe(GST_EXCLUSIVE_FROM_MS);
  });

  it("the client pack table equals the server pack table (the base every pack's GST is computed on)", () => {
    for (const [sku, p] of Object.entries(serverPacks.PACK_PRODUCTS)) expect(PACK_PRICE_INR[sku as keyof typeof PACK_PRICE_INR]).toBe(p.priceInr);
  });

  it("charge, tag and breakup agree on every base at every instant (before, at and after the cut-off; across 1 Dec)", () => {
    for (const now of INSTANTS) {
      for (const base of BASES) {
        expect(gstServer.chargeFor(base, now)).toEqual(chargeFor(base, now));
        expect(gstServer.priceWithGst(base, now)).toBe(priceWithGst(base, now));
        expect(gstServer.displayPlusGst(base, now)).toBe(displayPlusGst(base, now));
        expect(gstServer.gstBreakdownFor(base, now)).toBe(gstBreakdownFor(base, now));
        expect(gstServer.formatInr(base)).toBe(formatInr(base));
      }
    }
  });

  it("the Board Pass: what the client shows on the Pay button is what the server charges, on both sides of both switches", () => {
    for (const now of INSTANTS) {
      expect(gstServer.priceWithGst(server.tillBoardsPriceInr(now), now)).toBe(boardPassTotalInr(now));
    }
    // The owner's published totals (computed here, never typed in product code).
    expect([1917, 2499, 49, 99, 199, 299].map((b) => priceWithGst(b, CUT))).toEqual([2262, 2949, 58, 117, 235, 353]);
    expect(boardPassTotalInr(CUT - 1)).toBe(1917);
    expect(boardPassTotalInr(CUT)).toBe(2262);
    expect(boardPassTotalInr(OLD_SWITCH_MS)).toBe(2262); // PRICE-HOLD-1: nothing changes at 1 Dec
    expect(boardPassGstBreakdown(CUT)).toBe("₹1,917 + ₹345 GST (18%) = ₹2,262");
    expect(boardPassGstBreakdown(CUT - 1)).toBeNull();
  });

  it("CONTROL — the comparison can fail: one ms before the cut-off differs from the cut-off", () => {
    expect(chargeFor(1917, CUT - 1)).not.toEqual(chargeFor(1917, CUT));
  });
});

// ── GST-EXCL-1 refresh (owner ruling 6 Nov 2026 18:52 IST): the switch is 00:00 IST 7 Nov 2026. One ms before it, every price
// figure and string is EXACTLY current trunk's (the literals below are trunk 22880010's own output at that instant, read off
// trunk's pricing.ts / packs.ts); at the cut-off they become base + 18% GST. The old 5 Nov instant is now plainly pre-GST.
describe("GST-EXCL-1 · 1 ms before 00:00 IST 7 Nov every amount and string equals trunk; at the cut-off, base + GST", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const routes = require("../../server/routes/payments.cjs") as {
    quotePass: (s: object, t: string, n: number) => { pricePaidInr: number; amountPaise: number; gst?: unknown };
    tableQuote: (b: number, n: number) => { pricePaidInr: number; amountPaise: number; gst?: unknown };
  };
  const CUT = Date.parse("2026-11-07T00:00:00+05:30");
  const BEFORE = CUT - 1;

  it("the cut-off is 00:00 IST 7 Nov 2026 on both sides; 5 Nov and 6 Nov are now before it", () => {
    expect(GST_EXCLUSIVE_FROM_MS).toBe(CUT);
    expect(gstServer.GST_EXCLUSIVE_FROM_MS).toBe(CUT);
    for (const t of [Date.parse("2026-11-05T00:00:00+05:30"), +istNoon("2026-11-06"), BEFORE]) {
      expect(P.boardPassGstExclusive(t)).toBe(false);
      expect(boardPassTotalInr(t)).toBe(1917);
    }
  });

  it("1 ms before: trunk's strings, byte for byte (client), and trunk's quotes with no gst key (server)", () => {
    expect(P.boardPassPriceDisplay(BEFORE)).toBe("₹1,917");
    expect(P.boardPassPayDisplay(BEFORE)).toBe("₹1,917");
    expect(P.boardPassPriceLine(BEFORE)).toBe("₹1,917 \u2014 one payment, valid till 28 Feb 2027");
    expect(P.boardPassDeadlineLine(BEFORE)).toBeNull(); // PRICE-HOLD-1: no deadline copy
    expect(P.boardPassFromLine(BEFORE)).toBe("One payment, no renewals");
    expect(P.boardPassFoundingLabel(BEFORE)).toBe("Founding member offer");
    expect(boardPassGstBreakdown(BEFORE)).toBeNull();
    const trunkPack: Record<string, string> = { pack_chapter: "₹49", pack_mock: "₹99", pack_subject: "₹199", pack_bundle: "₹299", pack_cbq: "₹199" };
    for (const [sku, tag] of Object.entries(trunkPack)) {
      expect(K.packPriceLabel(sku as never, BEFORE)).toBe(tag);
      expect(K.packPayLabel(sku as never, BEFORE)).toBe(tag);
      expect(K.packGstBreakdown(sku as never, BEFORE)).toBeNull();
    }
    expect(routes.quotePass({}, "till_boards", BEFORE)).toEqual({ pricePaidInr: 1917, amountPaise: 191700, offerKey: "founding" });
    for (const base of [49, 99, 199, 299, 149]) {
      expect(routes.tableQuote(base, BEFORE)).toEqual({ pricePaidInr: base, amountPaise: base * 100, offerKey: null });
    }
  });

  it("at the cut-off: tags say + GST, Pay names the total, the breakup appears, and the server charges base + GST", () => {
    expect(P.boardPassPriceDisplay(CUT)).toBe("₹1,917 + GST");
    expect(P.boardPassPayDisplay(CUT)).toBe("₹2,262");
    expect(P.boardPassPriceLine(CUT)).toBe("₹1,917 + GST \u2014 one payment, valid till 28 Feb 2027");
    expect(P.boardPassDeadlineLine(CUT)).toBeNull(); // PRICE-HOLD-1: no deadline copy
    expect(boardPassGstBreakdown(CUT)).toBe("₹1,917 + ₹345 GST (18%) = ₹2,262");
    const after: Record<string, [string, string, string]> = {
      pack_chapter: ["₹49 + GST", "₹58", "₹49 + ₹9 GST (18%) = ₹58"],
      pack_mock: ["₹99 + GST", "₹117", "₹99 + ₹18 GST (18%) = ₹117"],
      pack_subject: ["₹199 + GST", "₹235", "₹199 + ₹36 GST (18%) = ₹235"],
      pack_bundle: ["₹299 + GST", "₹353", "₹299 + ₹54 GST (18%) = ₹353"],
      pack_cbq: ["₹199 + GST", "₹235", "₹199 + ₹36 GST (18%) = ₹235"],
    };
    for (const [sku, [tag, pay, breakup]] of Object.entries(after)) {
      expect(K.packPriceLabel(sku as never, CUT)).toBe(tag);
      expect(K.packPayLabel(sku as never, CUT)).toBe(pay);
      expect(K.packGstBreakdown(sku as never, CUT)).toBe(breakup);
    }
    const q = routes.quotePass({}, "till_boards", CUT);
    expect([q.pricePaidInr, q.amountPaise, q.gst]).toEqual([2262, 226200, { baseInr: 1917, gstInr: 345, totalInr: 2262, gstRate: 0.18 }]);
    expect([49, 99, 199, 299, 149].map((b) => routes.tableQuote(b, CUT).amountPaise)).toEqual([5800, 11700, 23500, 35300, 17600]);
  });
});

describe("GST-EXCL-1 · the month pass is + GST from 00:00 IST 7 Nov too (owner: every paid product)", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const routes = require("../../server/routes/payments.cjs") as {
    quotePass: (s: object, t: string, n: number) => { pricePaidInr: number; amountPaise: number; gst?: unknown };
  };
  const CUT = Date.parse("2026-11-07T00:00:00+05:30");
  it("1 ms before: ₹599 all-in (trunk); at the cut-off: ₹599 + ₹108 GST = ₹707 on the server and on every month label", () => {
    const pre = routes.quotePass({}, "month", CUT - 1);
    expect([pre.pricePaidInr, pre.amountPaise, "gst" in pre]).toEqual([599, 59900, false]);
    const at = routes.quotePass({}, "month", CUT);
    expect([at.pricePaidInr, at.amountPaise, at.gst]).toEqual([707, 70700, { baseInr: 599, gstInr: 108, totalInr: 707, gstRate: 0.18 }]);
    expect(P.payDisplay(PRICE_MONTHLY_FOUNDING_INR, CUT - 1)).toBe("₹599");
    expect(P.displayPlusGst(PRICE_MONTHLY_FOUNDING_INR, CUT - 1)).toBe("₹599");
    expect(P.payDisplay(PRICE_MONTHLY_FOUNDING_INR, CUT)).toBe("₹707");
    expect(P.displayPlusGst(PRICE_MONTHLY_FOUNDING_INR, CUT)).toBe("₹599 + GST");
    expect(P.payDisplay(PRICE_MONTHLY_LIST_INR, CUT)).toBe("₹1,179");
    // server = client on both sides of both switches, for both month prices
    for (const now of [CUT - 1, CUT, OLD_SWITCH_MS - 1, OLD_SWITCH_MS]) {
      const q = routes.quotePass({ passType: "month", plan: "pass_month" }, "month", now);
      const base = foundingOfferOpen(now) ? PRICE_MONTHLY_FOUNDING_INR : PRICE_MONTHLY_LIST_INR;
      expect(q.pricePaidInr).toBe(priceWithGst(base, now));
    }
  });
});
