import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  INLINE_MARKUP_CSS,
  inlinedStylesIn,
  islandStylesheetsFor,
  lateRouteCssFor,
  resolveStylesheet,
  routeCssFor,
  withRouteStyles,
} from "../../scripts/seo/applyPrerendered";
import { routeChunkModulesFor } from "../../scripts/seo/writeStaticHeads";

/**
 * SPEED-SALES-CSS-1 (21 Nov 2026). The sales landing pages used to LINK 3-7 tiny stylesheets each (render-blocking, one round
 * trip apiece on 4G). This pins the BEHAVIOUR: for each sales path the island links no stylesheet, whatever the tables are named.
 *
 * The dependency lists below are the REAL ones read from a production build at 714f0fff (the entry's `__vite__mapDeps` table for
 * each route chunk), with the REAL emitted file names - including the lower-case `cbqBand-` and `salesPagesCopy-` that the old
 * `CbqBand` / `salesPages` prefixes missed. A stylesheet that is emitted but not inlined shows up as a link and goes RED.
 */
const DEPS: Record<string, { module: string; css: string[] }> = {
  "/cbq-packs": {
    module: "CbqPacksPage",
    css: ["salesPagesCopy-rQqodK4S.css", "GuestPaySheet-Cs1vBIqF.css", "WhatsAppOptInCheckout-CY2sp5nc.css", "PackSampleLink-BiufQJAM.css", "packReady-CVZG3_1-.css", "PacksShop-BgaUjc8K.css", "PackTileBuy-CvyGXGwq.css", "SubjectSwitch-DegdIYqU.css", "ParentReturnLink-CdoiudXg.css", "faqContent-BSjsJZbB.css", "CbqPacksPage-CxKvkbCt.css", "cbqBand-CQOB5GVV.css", "salesPages-CSXnw1hx.css"],
  },
  "/board-pass": {
    module: "BoardPassPage",
    css: ["salesPagesCopy-rQqodK4S.css", "GuestPaySheet-Cs1vBIqF.css", "WhatsAppOptInCheckout-CY2sp5nc.css", "TestimonialVideo-Dldp0nWG.css", "PricingProof-NTIfpcIT.css", "ParentReturnLink-CdoiudXg.css", "SalesStickyBar-BrnEsYgX.css", "BoardPassPage-DPoudZw9.css", "salesPages-CSXnw1hx.css"],
  },
  "/test-series": {
    module: "TestSeriesPage",
    css: ["TestSeriesPerTest-DcyWG8Q8.css", "GuestPaySheet-Cs1vBIqF.css", "WhatsAppOptInCheckout-CY2sp5nc.css", "PackSampleLink-BiufQJAM.css", "packReady-CVZG3_1-.css", "PacksShop-BgaUjc8K.css", "TestSeriesPage-CjjsfZbU.css", "salesPages-CSXnw1hx.css"],
  },
  "/packs": {
    module: "PacksPage",
    css: ["faqContent-BSjsJZbB.css", "FounderBadge-DEUy_9l6.css", "GuestPaySheet-Cs1vBIqF.css", "WhatsAppOptInCheckout-CY2sp5nc.css", "PackSampleLink-BiufQJAM.css", "packReady-CVZG3_1-.css", "PacksShop-BgaUjc8K.css", "TestSeriesPerTest-DcyWG8Q8.css", "SubjectSwitch-DegdIYqU.css", "PackTileBuy-CvyGXGwq.css", "TestimonialVideo-Dldp0nWG.css", "PacksPage-Dotz7EST.css"],
  },
  "/for-parents": {
    module: "ForParentsPage",
    css: ["TestimonialVideo-Dldp0nWG.css", "SalesStickyBar-BrnEsYgX.css", "ForParentsPage-Ua6lI2XB.css"],
  },
};
// The one sheet deliberately left linked: PacksShop-*.css is 8.9 KB raw on /test-series, over the 6 KB inline rule.
const STILL_LINKED: Record<string, string[]> = { "/test-series": ["PacksShop-BgaUjc8K.css"] };

const SHELL = '<!doctype html><html><head><script type="module" crossorigin src="/assets/index-AAAAAAAA.js"></script><link rel="stylesheet" crossorigin href="/assets/index-AAAAAAAA.css"></head><body>BODY</body></html>';
// Only these two prerendered sales pages carry the WhatsApp button markup (read from the build).
const FAB = '<a class="lt-wa-fab" href="https://wa.me/1">WA</a>';
const FAB_PATHS = new Set(["/packs", "/for-parents"]);
const TMP = mkdtempSync(join(tmpdir(), "sales-css-"));
afterAll(() => rmSync(TMP, { recursive: true, force: true }));
const ASSETS_BASE = ["WhatsAppFab-TWtivnxE.css"];

function build(path: string) {
  const { module, css } = DEPS[path];
  const chunk = `${module}-CCCCCCCC.js`;
  const files = [...css, ...ASSETS_BASE, chunk, "index-AAAAAAAA.js"];
  const entry = `m.f=[${css.map((f) => `"assets/${f}"`).join(",")}];import("./${chunk}"),__vite__mapDeps([${css.map((_, i) => i).join(",")}]);`;
  const shell0 = SHELL.replace("BODY", "");
  mkdirSync(join(TMP, "assets"), { recursive: true });
  writeFileSync(join(TMP, "assets", "index-AAAAAAAA.js"), entry, "utf8");
  // Exactly the head assembly of writeStaticBodies' `finish`: route sheets, markup sheets, the late sheets; then the island's links.
  const route = [
    ...routeCssFor(path, join(TMP, "assets"), shell0, files),
    ...(INLINE_MARKUP_CSS[path] ?? []).map((name) => resolveStylesheet(name, files)),
    ...lateRouteCssFor(path, join(TMP, "assets"), shell0, files),
  ];
  const shell = SHELL.replace("BODY", FAB_PATHS.has(path) ? FAB : "");
  const styled = withRouteStyles(shell, route.map((file) => ({ file, css: `/* ${file} */` })));
  return { styled, route, linked: islandStylesheetsFor(path, styled, entry, files) };
}

describe("SPEED-SALES-CSS-1 - the sales landing pages carry no render-blocking island stylesheet", () => {
  for (const path of Object.keys(DEPS)) {
    it(`${path}: every emitted stylesheet is inlined, except the documented over-size one`, () => {
      expect(routeChunkModulesFor(path)).toContain(DEPS[path].module);
      const { linked } = build(path);
      expect(linked, `${path} still LINKS ${linked.join(", ")}`).toEqual(STILL_LINKED[path] ?? []);
    });
  }

  it("inlines each sheet once, and the late sheets come AFTER the route's own (where their links sat: cascade unchanged)", () => {
    const { route, styled } = build("/packs");
    expect(new Set(route).size).toBe(route.length);
    expect(inlinedStylesIn(styled)).toEqual(route);
    expect(route.indexOf("PacksPage-Dotz7EST.css")).toBeLessThan(route.indexOf("faqContent-BSjsJZbB.css"));
    expect(route.indexOf("WhatsAppFab-TWtivnxE.css")).toBeLessThan(route.indexOf("faqContent-BSjsJZbB.css"));
  });
});
