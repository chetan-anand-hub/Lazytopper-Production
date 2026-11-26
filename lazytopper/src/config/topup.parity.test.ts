// @vitest-environment node
//
// TOPUP-GO-1 - config/topup.ts is a MIRROR of the server's top-up table (server/services/passPricing.cjs). A duplicated number is
// only safe while something re-checks it: change a price, a credit or a per-activity cost on the server and this file turns red.

import { createRequire } from "node:module";
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  isTopupClientEnabled,
  TOPUP_PACKS,
  topupLines,
  topupPrice,
  TOPUP_COST_INR,
  TOPUP_GRADING_PRICE_FACTOR_FROM_2027,
} from "./topup";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const server = require("../../server/services/passPricing.cjs") as {
  TOPUP_PRODUCTS: Record<string, { priceInr: number; creditInr: number }>;
  TOPUP_ACTIVITIES: Record<string, { costInr: number }>;
  topupBreakdownFor: (key: string, nowMs: number) => { rows: { activity: string; about: number }[] };
  priceMultiplierAt: (model: string, atMs: number) => number;
};

const IST_2027_01_01_MS = Date.parse("2027-01-01T00:00:00+05:30");
const NOON_26_NOV = Date.parse("2026-11-26T12:00:00+05:30");
const NOON_05_NOV = Date.parse("2026-11-05T12:00:00+05:30");

afterEach(() => vi.unstubAllEnvs());

describe("TOPUP-GO-1 parity with the server table", () => {
  it("the packs, base prices and credits are the server's", () => {
    expect(Object.keys(server.TOPUP_PRODUCTS).sort()).toEqual(TOPUP_PACKS.map((p) => p.key).sort());
    for (const p of TOPUP_PACKS) {
      expect(server.TOPUP_PRODUCTS[p.key]).toEqual({ priceInr: p.baseInr, creditInr: p.creditInr });
    }
    expect(TOPUP_PACKS.map((p) => [p.baseInr, p.creditInr])).toEqual([[49, 35], [149, 110]]);
  });

  it("the three per-activity costs are the server's, and the 2027 factor is the grading model's own price rise", () => {
    expect(TOPUP_COST_INR.answerCheck).toBe(server.TOPUP_ACTIVITIES.answer_check.costInr);
    expect(TOPUP_COST_INR.chapterTest).toBe(server.TOPUP_ACTIVITIES.chapter_test_grading.costInr);
    expect(TOPUP_COST_INR.fullMock).toBe(server.TOPUP_ACTIVITIES.full_mock_grading.costInr);
    expect(server.priceMultiplierAt("gemini-3.8-flash", IST_2027_01_01_MS)).toBe(TOPUP_GRADING_PRICE_FACTOR_FROM_2027);
  });

  it("★ the 'about N' lines equal the server's own breakdown from 1 Jan 2027 (the lower, honest count), for both packs", () => {
    for (const p of TOPUP_PACKS) {
      const rows = new Map(server.topupBreakdownFor(p.key, IST_2027_01_01_MS).rows.map((r) => [r.activity, r.about]));
      const lines = topupLines(p);
      expect(lines.find((l) => l.label === "full mocks marked")?.about).toBe(rows.get("full_mock_grading"));
      expect(lines.find((l) => l.label === "Chapter Tests marked")?.about).toBe(rows.get("chapter_test_grading"));
      expect(lines.find((l) => l.label === "answer checks")?.about).toBe(rows.get("answer_check"));
    }
    // pinned values (do not recompute by hand: read them off this run): 49 -> 4 mocks, 149 -> 13 mocks
    expect(topupLines(TOPUP_PACKS[0]).map((l) => l.about)).toEqual([4, 10, 8]);
    expect(topupLines(TOPUP_PACKS[1]).map((l) => l.about)).toEqual([13, 33, 26]);
  });
});

describe("TOPUP-GO-1 prices: base + GST, total on the button", () => {
  it("from the GST cut-off: ₹49 + GST -> ₹58 and ₹149 + GST -> ₹176", () => {
    expect(topupPrice(TOPUP_PACKS[0], NOON_26_NOV)).toMatchObject({ priceText: "₹49 + GST", totalText: "₹58", breakupText: "₹49 + ₹9 GST (18%) = ₹58" });
    expect(topupPrice(TOPUP_PACKS[1], NOON_26_NOV)).toMatchObject({ priceText: "₹149 + GST", totalText: "₹176", breakupText: "₹149 + ₹27 GST (18%) = ₹176" });
  });
  it("the total is the server's tableQuote total (parity with chargeFor on the server)", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chargeFor } = require("../../server/services/passPricing.cjs") as { chargeFor: (b: number, n: number) => { totalInr: number } };
    for (const p of TOPUP_PACKS) expect(topupPrice(p, NOON_26_NOV).charge.totalInr).toBe(chargeFor(p.baseInr, NOON_26_NOV).totalInr);
  });
  it("before the cut-off the price is plain (no GST wording invented)", () => {
    expect(topupPrice(TOPUP_PACKS[0], NOON_05_NOV)).toMatchObject({ priceText: "₹49", totalText: "₹49", breakupText: null });
  });
});

describe("TOPUP-GO-1 client switch", () => {
  it("is off unless VITE_TOPUP_ENABLED AND VITE_PAYMENTS_ENABLED are both on", () => {
    expect(isTopupClientEnabled()).toBe(false);
    vi.stubEnv("VITE_TOPUP_ENABLED", "1");
    expect(isTopupClientEnabled()).toBe(false);
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    expect(isTopupClientEnabled()).toBe(true);
    vi.stubEnv("VITE_TOPUP_ENABLED", "0");
    expect(isTopupClientEnabled()).toBe(false);
  });
});
