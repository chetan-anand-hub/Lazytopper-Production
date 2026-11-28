import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { GST_EXCLUSIVE_FROM_MS, buyDisplay, formatInr, priceWithGst, withGstInr } from "../../config/pricing";
import { PACK_PRICE_INR, packBaseInr, packBuyLabel, packPayLabel, packPriceLabel, type PackSku } from "../../services/packs";
import { cbqBuyLabel } from "../../components/cbq/CbqCtas";

/**
 * SEO-SELL-3 (owner ruling, 28 Nov 2026) - a pack Buy/Pay BUTTON names the base price + GST AND the total: "₹199 + GST (₹235 total)",
 * never the total alone. The total comes from the one GST computation (priceWithGst / withGstInr), never typed.
 */
const AFTER = GST_EXCLUSIVE_FROM_MS + 1;
const BEFORE = GST_EXCLUSIVE_FROM_MS - 1;
const SKUS = Object.keys(PACK_PRICE_INR) as PackSku[];

describe("buyDisplay / packBuyLabel", () => {
  it("from the GST cut-off: '₹<base> + GST (₹<total> total)', the total being the one GST computation", () => {
    expect(buyDisplay(199, AFTER)).toBe("₹199 + GST (₹235 total)");
    expect(buyDisplay(99, AFTER)).toBe("₹99 + GST (₹117 total)");
    expect(buyDisplay(299, AFTER)).toBe("₹299 + GST (₹353 total)");
    expect(buyDisplay(999, AFTER)).toBe("₹999 + GST (₹1,179 total)");
    for (const base of [49, 99, 199, 299, 999, 1499, 2499]) {
      expect(buyDisplay(base, AFTER)).toBe(`${formatInr(base)} + GST (${formatInr(withGstInr(base))} total)`);
      expect(buyDisplay(base, AFTER)).toContain(formatInr(priceWithGst(base, AFTER)));
    }
  });

  it("before the cut-off the price was all-in, so it is the bare price (every figure unchanged)", () => {
    expect(buyDisplay(199, BEFORE)).toBe("₹199");
    expect(packBuyLabel("pack_cbq", BEFORE)).toBe("₹199");
  });

  it("every pack sku's button label carries its tag AND its total, and is never the total alone", () => {
    for (const sku of SKUS) {
      const label = packBuyLabel(sku, AFTER);
      expect(label, sku).toMatch(/^₹[\d,]+ \+ GST \(₹[\d,]+ total\)$/);
      expect(label, sku).toContain(packPriceLabel(sku, AFTER));
      expect(label, sku).toContain(`(${packPayLabel(sku, AFTER)} total)`);
      expect(label, sku).not.toBe(packPayLabel(sku, AFTER));
      expect(label.startsWith(formatInr(packBaseInr(sku, AFTER))), sku).toBe(true);
    }
  });

  it("the CBQ landing button (audit: 'Buy Maths CBQ · ₹235') now reads 'Buy Maths CBQ · ₹199 + GST (₹235 total)'", () => {
    expect(cbqBuyLabel("maths")).toBe(`Buy Maths CBQ · ${packBuyLabel("pack_cbq")}`);
    expect(cbqBuyLabel("maths")).toBe("Buy Maths CBQ · ₹199 + GST (₹235 total)");
  });
});

/** The bare total (packPayLabel) belongs in the checkout sheet's priceDisplay only; every other pack button reads packBuyLabel. */
describe("no pack button reads the bare total", () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
    }
    return out;
  }
  it("packPayLabel( is called only inside services/packs.ts and for the checkout sheet's priceDisplay", () => {
    const src = join(process.cwd(), "src");
    const hits: string[] = [];
    for (const file of walk(src)) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (/packPayLabel\(/.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line)) hits.push(`${relative(src, file)}:${i + 1}:${line.trim()}`);
      });
    }
    const outside = hits.filter((h) => !h.startsWith("services/packs.ts:"));
    expect(outside).toEqual([expect.stringMatching(/^components\/packs\/PacksShop\.tsx:\d+:priceDisplay: packPayLabel\(who\.sku\),$/)]);
  });
});
