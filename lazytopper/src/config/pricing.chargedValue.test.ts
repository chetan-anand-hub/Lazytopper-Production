/** META-PURCHASE-UNIFY-1 follow-up F2: the browser purchase value falls back to the price INCLUDING GST, matching the server's amountPaise/100. */
import { describe, expect, it } from "vitest";
import { chargedValueInr, priceWithGst } from "./pricing";

const NOW = Date.UTC(2030, 0, 1); // explicit clock: GST is charged on top from the cut-off

describe("chargedValueInr", () => {
  it("uses the server amount (already GST-inclusive) when present", () => {
    expect(chargedValueInr(1178.82, 999, NOW)).toBe(1178.82);
  });
  it("with no server amount, falls back to the base price WITH GST, not the bare base", () => {
    const v = chargedValueInr(undefined, 999, NOW);
    expect(v).toBe(priceWithGst(999, NOW));
    expect(v).toBeGreaterThan(999);
  });
  it("a zero / invalid server amount also falls back; nothing known -> undefined", () => {
    expect(chargedValueInr(0, 999, NOW)).toBe(priceWithGst(999, NOW));
    expect(chargedValueInr(undefined, undefined, NOW)).toBeNull();
  });
});
