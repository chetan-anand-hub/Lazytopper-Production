// PACK-BASIC-ONLY-1 - the pack line is for Basic students only.
import { describe, expect, it } from "vitest";
import { packKindOf, packLineText, packLineTextFor, showPackLine } from "./packLine";

describe("showPackLine", () => {
  it("is true only for a known Basic student", () => {
    expect(showPackLine({ tier: "free" })).toBe(true);
    expect(showPackLine({ tier: "free" }, true)).toBe(true);
  });
  it("is false for an active trial and for paid Premium", () => {
    expect(showPackLine({ tier: "trial" })).toBe(false);
    expect(showPackLine({ tier: "premium" })).toBe(false);
  });
  it("is false for an unknown or unhydrated status (fail toward the Board Pass)", () => {
    expect(showPackLine(null)).toBe(false);
    expect(showPackLine(undefined)).toBe(false);
    expect(showPackLine({ tier: "free" }, false)).toBe(false);
  });
});

describe("packLineText", () => {
  it("says printed self-check practice, one wording per pack", () => {
    expect(packLineText("chapter", "₹49")).toBe("Prefer practising on paper? Chapter Pack ₹49 — printed questions with answer keys →");
    expect(packLineText("mock", "₹99")).toBe("Prefer practising on paper? Mock Pack ₹99 — printed papers with answer keys →");
    expect(packLineText("general", "₹49")).toBe("Prefer practising on paper? PDF packs from ₹49 — printed, with answer keys →");
  });
  it("maps a PaperPackLine to its words, pricing the plain /packs link from the catalogue constant", () => {
    expect(packKindOf({ label: "Mock Pack" })).toBe("mock");
    expect(packLineTextFor({ label: "Chapter Pack", priceLabel: "\u20b949" })).toContain("Chapter Pack \u20b949");
    expect(packLineTextFor({ label: "PDF packs", priceLabel: "" })).toContain("PDF packs from \u20b949");
    for (const t of ["chapter", "mock", "general"] as const) expect(packLineText(t, "\u20b949")).not.toMatch(/mark(ing|ed)/i);
  });
});
