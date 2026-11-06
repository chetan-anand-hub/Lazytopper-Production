import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { INLINE_ROUTE_CSS } from "../../scripts/seo/applyPrerendered";

/**
 * CLS-1 (6 Nov 2026): /packs (0.575), /cbq-class-10 (0.44), the CBQ chapter pages (1.085) and /contact (0.173) shifted because
 * their CSS arrived with the lazy route chunk after the prerendered body had painted, and the CBQ chapter list collapsed to a
 * one-line "Loading" note on hydration. These pin both fixes.
 */
describe("CLS-1 first paint", () => {
  it("inlines the route CSS (own + the shared CSS the first screen needs) for the four shifting pages", () => {
    expect(INLINE_ROUTE_CSS.PacksPage).toEqual(
      expect.arrayContaining(["PacksShop", "CbqBand", "PackTileBuy", "PackSampleLink", "FounderBadge", "TestimonialVideo"]),
    );
    expect(INLINE_ROUTE_CSS.CbqHubPage).toEqual(expect.arrayContaining(["CbqBand", "CbqChapterPage"]));
    expect(INLINE_ROUTE_CSS.CbqChapterPage).toContain("CbqChapterPage");
    expect(INLINE_ROUTE_CSS.ContactPage).toBeDefined();
  });

  it("never inlines KaTeX CSS (it delayed first paint on the notes pages)", () => {
    for (const prefixes of Object.values(INLINE_ROUTE_CSS)) expect(prefixes.join(",")).not.toMatch(/katex/i);
  });

  it("keeps the chapter sample list's box tall while it loads, so the CTAs below do not jump", () => {
    const css = readFileSync(resolve(__dirname, "../pages/cbq/cbqSeo.css"), "utf8");
    const rule = css.match(/\.lt-cbqs__note--loading\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    const minHeight = Number(rule![1].match(/min-height:\s*(\d+)px/)?.[1]);
    expect(minHeight).toBeGreaterThanOrEqual(1200); // taller than a phone/desktop first screen
    const tsx = readFileSync(resolve(__dirname, "../components/cbq/CbqSampleList.tsx"), "utf8");
    expect(tsx).toContain("lt-cbqs__note lt-cbqs__note--loading");
  });
});
