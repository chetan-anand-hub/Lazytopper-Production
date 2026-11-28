import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  PACK_PRICE_INR,
  TEST_SERIES_FOUNDING_INR,
  TEST_SERIES_LIST_INR,
  packBaseInr,
  packChargeInr,
  packGstBreakdown,
  packPayLabel,
  packPriceLabel,
  testSeriesFoundingClause,
  testSeriesPriceLine,
} from "./packs";
import { FOUNDING_OFFER_CLOSES_AT_ISO } from "../config/pricing";

// TS-PRICE-2 (owner ruling 19 Nov 2026 08:23 IST): the Test Series is Rs 999 + GST as a founding price until the SAME instant the
// Board Pass founding offer closes (00:00 IST 1 Dec 2026), and Rs 1,499 + GST from it.
// PRICE-HOLD-1: these two instants are the RETIRED 1 Dec switch, kept as probes - the price must be identical on both.
const LAST_FOUNDING_MS = Date.parse("2026-12-01T00:00:00+05:30") - 1;
const FIRST_LIST_MS = Date.parse("2026-12-01T00:00:00+05:30");

describe("PRICE-HOLD-1 · the Test Series stays 999 (+ GST) on every date: the Board Pass founding offer has no cut-off", () => {
  it("uses the Board Pass founding constants: no closing instant exists", () => {
    expect(FOUNDING_OFFER_CLOSES_AT_ISO).toBeNull();
    expect(TEST_SERIES_FOUNDING_INR).toBe(999);
    expect(TEST_SERIES_LIST_INR).toBe(1499);
    expect(PACK_PRICE_INR.test_series).toBe(999);
  });

  it("base: 999 one millisecond before the old 1 Dec instant, exactly at it and after it; the other packs never move", () => {
    expect(packBaseInr("test_series", LAST_FOUNDING_MS)).toBe(999);
    expect(packBaseInr("test_series", FIRST_LIST_MS)).toBe(999);
    expect(packBaseInr("test_series", new Date(FIRST_LIST_MS + 400 * 86_400_000))).toBe(999);
    for (const sku of ["pack_chapter", "pack_mock", "pack_subject", "pack_bundle", "pack_cbq"] as const) {
      expect(packBaseInr(sku, LAST_FOUNDING_MS)).toBe(PACK_PRICE_INR[sku]);
      expect(packBaseInr(sku, FIRST_LIST_MS)).toBe(PACK_PRICE_INR[sku]);
    }
  });

  it("tag, button and charge: 999 + GST -> Rs 1,179 before AND after the old 1 Dec instant", () => {
    expect(packPriceLabel("test_series", LAST_FOUNDING_MS)).toBe("₹999 + GST");
    expect(packPayLabel("test_series", LAST_FOUNDING_MS)).toBe("₹1,179");
    expect(packChargeInr("test_series", LAST_FOUNDING_MS)).toBe(1179);
    expect(packGstBreakdown("test_series", LAST_FOUNDING_MS)).toBe("₹999 + ₹180 GST (18%) = ₹1,179");
    expect(packPriceLabel("test_series", FIRST_LIST_MS)).toBe("₹999 + GST");
    expect(packPayLabel("test_series", FIRST_LIST_MS)).toBe("₹1,179");
    expect(packChargeInr("test_series", FIRST_LIST_MS)).toBe(1179);
    expect(packGstBreakdown("test_series", FIRST_LIST_MS)).toBe("₹999 + ₹180 GST (18%) = ₹1,179");
  });

  it("the price line: the plain price, NO deadline clause on any date; no crossed-out price, no AI, no refund promise", () => {
    expect(testSeriesPriceLine(LAST_FOUNDING_MS)).toBe("₹999 + GST");
    expect(testSeriesFoundingClause(LAST_FOUNDING_MS)).toBeNull();
    expect(testSeriesPriceLine(FIRST_LIST_MS)).toBe("₹999 + GST");
    expect(testSeriesFoundingClause(FIRST_LIST_MS)).toBeNull();
    for (const ms of [LAST_FOUNDING_MS, FIRST_LIST_MS]) {
      const line = testSeriesPriceLine(ms);
      expect(line).not.toMatch(/\bAI\b|refund|save|<s>|was /i);
    }
  });

  it("PARITY: the client display price equals the server's authoritative price on both sides of the instant, for every pack", () => {
    const server = createRequire(import.meta.url)("../../server/services/packProducts.cjs") as {
      packBaseInrAt: (sku: string, nowMs: number) => number | null;
      packAcceptedBasesInr: (sku: string) => number[];
    };
    for (const ms of [LAST_FOUNDING_MS - 86_400_000, LAST_FOUNDING_MS, FIRST_LIST_MS, FIRST_LIST_MS + 86_400_000]) {
      for (const sku of ["pack_chapter", "pack_mock", "pack_subject", "pack_bundle", "pack_cbq", "test_series"] as const) {
        expect(server.packBaseInrAt(sku, ms), `${sku} @ ${ms}`).toBe(packBaseInr(sku, ms));
      }
    }
    expect(server.packAcceptedBasesInr("test_series")).toEqual([TEST_SERIES_FOUNDING_INR, TEST_SERIES_LIST_INR]);
  });
});
