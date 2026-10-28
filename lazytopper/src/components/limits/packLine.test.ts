// PACK-BASIC-ONLY-1 - the pack line is for Basic students only.
import { describe, expect, it } from "vitest";
import { PACK_LINE_HREF, PACK_LINE_TEXT, showPackLine } from "./packLine";
import { PACK_PRICE_INR } from "../../services/packs";

describe("showPackLine", () => {
  it("is true for a known Basic student", () => {
    expect(showPackLine({ tier: "free" })).toBe(true);
    expect(showPackLine({ tier: "free" }, true)).toBe(true);
  });
  it("is true for a trial student on any day (no clock is read)", () => {
    expect(showPackLine({ tier: "trial" })).toBe(true);
  });
  it("CONTROL: is false for paid Premium", () => {
    expect(showPackLine({ tier: "premium" })).toBe(false);
  });
  it("is false for an unknown or unhydrated status (fail toward the Board Pass)", () => {
    expect(showPackLine(null)).toBe(false);
    expect(showPackLine(undefined)).toBe(false);
    expect(showPackLine({ tier: "free" }, false)).toBe(false);
  });
});

describe("the one line", () => {
  it("is the owner's words with the catalogue price, linking to the packs strip", () => {
    expect(PACK_LINE_TEXT).toBe("Not ready for the Board Pass yet? Try our PDF packs from \u20b949 \u2014 printed questions with answer keys, no marking \u2192");
    expect(PACK_LINE_TEXT).toContain(`\u20b9${PACK_PRICE_INR.pack_chapter}`);
    expect(PACK_LINE_HREF).toBe("/pricing#packs");
  });
});
