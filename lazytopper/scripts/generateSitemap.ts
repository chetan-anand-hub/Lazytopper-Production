/**
 * GENERATE `public/sitemap.xml` FROM THE ROUTE REGISTRY.
 *
 *   pnpm --filter lazytopper run gen:sitemap
 *
 * ⛔ THIS SCRIPT'S IMPORT GRAPH MUST STAY FREE OF `.tsx`, AND THE RULE WAS LEARNED
 * THE EXPENSIVE WAY IN FOLLOWON-1. The `/legal` family is expanded from
 * `LEGAL_SLUGS`; the first attempt exported that list from `pages/LegalPage.tsx`,
 * pulling a React component into this node script. It broke TWICE:
 *
 *   1. HERE, AT RUNTIME — the repo's ROOT `tsconfig.json` is a references-only stub
 *      with no `compilerOptions`, so `tsx` finds no `jsx` setting, falls back to the
 *      CLASSIC runtime and emits `React.createElement` into a module that never
 *      imports React: `ReferenceError: React is not defined`.
 *   2. IN `pnpm run build` — `tsc -b` builds `tsconfig.node.json` too, and that
 *      project has no `jsx` either: `TS6142: ... '--jsx' is not set`.
 *
 * ⚠ AND BOTH WERE GREEN UNDER `tsc -p tsconfig.app.json --noEmit`, the standing
 * gate, because the APP config does set `jsx`. Neither tsc config in the documented
 * two-config gate covers the NODE project — only the build does. The fix is a
 * JSX-free leaf (`src/pages/legalSlugs.ts`), NOT a `--tsconfig` flag: a flag would
 * have made this script compile a React tree to produce three strings, and would
 * have left the `tsc -b` failure in place.
 *
 * ★ WHY A GENERATOR AND A GUARD, NOT ONE OR THE OTHER. The generator is what
 * makes the file DERIVED rather than typed out by hand. The guard
 * (`src/config/sitemapUrls.guard.test.tsx`) is what makes it STAY derived — it
 * recomputes the URL list from the same module and fails if the checked-in file
 * has drifted, so forgetting to run this script is a red test rather than a
 * sitemap that silently stops matching the router.
 *
 * ★ THE BASENAME COMES FROM `vite.config.ts`. `canonicalFor` normally defaults
 * it to `appBasename()` (`import.meta.env.BASE_URL`), which is correct in the
 * browser and WRONG here: outside Vite's transform that value is `"/"`, so a
 * generator trusting it would emit `https://www.lazytopper.com/exam-trends` —
 * every URL a 404. `vite.config.ts`'s `base` is the value Vite itself turns
 * into `BASE_URL`, so reading it is reading the same source one step upstream.
 * It is emphatically NOT a `/app/` literal, which is what #736 existed to kill.
 *
 * ⚠ LASTMOD IS PRESERVED, NOT RESTAMPED. A date is not derivable from the route
 * table. Re-dating all 31 URLs on every run would tell Google the whole site
 * changed whenever one topic was added, which is how a freshness signal stops
 * meaning anything. Existing URLs keep the date already published; only genuinely
 * new URLs are stamped with today (override with `--lastmod=YYYY-MM-DD`).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import viteConfig from "../vite.config";
import { renderSitemapXml } from "../src/config/sitemapUrls";

const here = dirname(fileURLToPath(import.meta.url));
const SITEMAP = join(here, "..", "public", "sitemap.xml");

/** `/app/` -> `/app`, matching how `main.tsx` feeds `<BrowserRouter basename>`. */
function basenameFromViteConfig(): string {
  const base = (viteConfig as { base?: string }).base;
  if (typeof base !== "string" || base.length === 0) {
    throw new Error(
      "vite.config.ts declares no `base`. Every sitemap URL would be missing " +
        "the app basename and would 404.",
    );
  }
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

/** The dates already published, so a regenerate does not re-date the whole site. */
function publishedLastmods(): Map<string, string> {
  const dates = new Map<string, string>();
  let xml: string;
  try {
    xml = readFileSync(SITEMAP, "utf8");
  } catch {
    return dates;
  }
  const entry = /<url>[\s\S]*?<\/url>/g;
  for (const block of xml.match(entry) ?? []) {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/.exec(block)?.[1];
    const lastmod = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(block)?.[1];
    if (loc && lastmod) dates.set(loc, lastmod);
  }
  return dates;
}

function today(): string {
  const override = process.argv
    .find((a) => a.startsWith("--lastmod="))
    ?.slice("--lastmod=".length);
  if (override) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(override)) {
      throw new Error(`--lastmod must be YYYY-MM-DD, got "${override}"`);
    }
    return override;
  }
  return new Date().toISOString().slice(0, 10);
}

const published = publishedLastmods();
const stamp = today();
// LF on purpose: `.gitattributes` normalises the repo to LF, and CI reads the
// committed bytes. Writing CRLF here would make the guard pass on Windows and
// fail on the linux runner.
const xml = renderSitemapXml(
  basenameFromViteConfig(),
  (url) => published.get(url) ?? stamp,
);
writeFileSync(SITEMAP, xml, "utf8");

const added = xml.match(/<loc>/g)?.length ?? 0;
// eslint-disable-next-line no-console
console.log(
  `sitemap.xml written: ${added} <loc> (${added - published.size} new, ` +
    `stamped ${stamp}; ${published.size} kept their published lastmod)`,
);
