/**
 * TS-FAIRUSE-1 - the fair-use FAQ is one constant: calm copy, no rupee amounts, the "extra usage" sentence only when top-ups are on,
 * and it is NOT on /pricing's face cards (owner 24-25 Nov: card faces show only USPs, price and one Buy).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fairUseFaq } from "./salesPagesCopy";

const read = (rel: string) => readFileSync(resolve(__dirname, "../..", rel), "utf8");

describe("fairUseFaq", () => {
  it("is calm, has no rupee amount, no AI wording", () => {
    const { q, a } = fairUseFaq(false);
    expect(q).toBe("Is there a usage limit?");
    expect(a).not.toMatch(/₹|\bAI\\b|answer key|refund/i);
    expect(a).toContain("a full mock marked every day");
  });
  it("mentions extra usage only when top-ups are on (default hidden)", () => {
    expect(fairUseFaq(false).a).not.toMatch(/extra usage/i);
    expect(fairUseFaq(true).a).toMatch(/You can also add extra usage\./);
    expect(fairUseFaq().a).not.toMatch(/extra usage/i);
  });
  it("is wired into both product pages and never into /pricing", () => {
    expect(read("pages/BoardPassPage.tsx")).toContain("fairUseFaq()");
    expect(read("pages/TestSeriesPage.tsx")).toContain("fairUseFaq()");
    for (const f of ["pages/PricingPage.tsx", "pages/pricingHub/PricingHub.tsx", "components/pricing/pricingPlansCopy.ts"]) {
      expect(read(f), f).not.toMatch(/fairUseFaq|Is there a usage limit|Fair use:/);
    }
  });
});
