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
 * ★ LASTMOD MOVES WHEN THE PAGE MOVED — AND ONLY THEN (SEO-FRESH-1, F1). A date is
 * not derivable from the route table, so it is derived from the one thing that IS the
 * page a crawler reads: the committed prerendered fragment. `prerendered/lastmod.json`
 * records, per advertised path, the sha256 of that fragment and the date it last
 * changed. A run restamps a path to today (IST — the product's and its students' day)
 * only when the hash moved; new paths get today; everything else keeps its date. The
 * generator this replaced kept every date FOREVER, so a rewritten page still claimed
 * its first-publish date. Restamping everything on every run would be the opposite
 * lie. `--lastmod=YYYY-MM-DD` overrides "today" (tests, backfills).
 *
 * ⚠ IT READS THE FRAGMENTS, SO IT RUNS AFTER A CAPTURE. In CI the prerender-capture job
 * runs this right after `seo:capture`, and a stale `sitemap.xml` or `lastmod.json`
 * fails that job and is supplied in its artifact — the same verify-and-supply pattern
 * as the fragments themselves (F2).
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import viteConfig from "../vite.config";
import { canonicalFor } from "../src/config/canonicalUrl";
import {
  nextLastmods,
  renderSitemapXml,
  sitemapPaths,
  type LastmodEntry,
  type LastmodLedger,
} from "../src/config/sitemapUrls";
import { PRERENDERED_DIR, fragmentPathFor } from "./seo/applyPrerendered";

const here = dirname(fileURLToPath(import.meta.url));
const SITEMAP = join(here, "..", "public", "sitemap.xml");
export const LASTMOD_LEDGER = join(PRERENDERED_DIR, "lastmod.json");

/** `/` -> `` (a based `/x/` -> `/x`), matching how `main.tsx` feeds `<BrowserRouter basename>`. */
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

/**
 * sha256 of a committed fragment, with CRLF normalised to LF: a Windows checkout
 * (autocrlf) must hash the same bytes the linux runner does, or every local run would
 * see every page as changed.
 */
export function fragmentHash(contents: string): string {
  return createHash("sha256").update(contents.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}

/** Today's calendar date in India (IST), as YYYY-MM-DD. */
export function todayIst(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
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
  return todayIst();
}

/** Render the ledger deterministically (sorted keys, 2-space JSON, LF, trailing newline). */
export function renderLedger(ledger: Readonly<Record<string, LastmodEntry>>): string {
  const sorted: Record<string, LastmodEntry> = {};
  for (const path of Object.keys(ledger).sort()) {
    sorted[path] = { sha256: ledger[path].sha256, lastmod: ledger[path].lastmod };
  }
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

function main(): void {
  const basename = basenameFromViteConfig();
  const paths = sitemapPaths();

  const hashes = new Map<string, string>();
  const missing: string[] = [];
  for (const path of paths) {
    const file = fragmentPathFor(path);
    if (!existsSync(file)) {
      missing.push(`${path} (${file})`);
      continue;
    }
    hashes.set(path, fragmentHash(readFileSync(file, "utf8")));
  }
  if (missing.length > 0) {
    throw new Error(
      `gen:sitemap: ${missing.length} advertised path(s) have no prerendered fragment, so ` +
        `no honest lastmod can be computed. Run the capture first (CI's prerender-capture ` +
        `job supplies it).\n  - ${missing.join("\n  - ")}`,
    );
  }

  const firstRun = !existsSync(LASTMOD_LEDGER);
  const previous: LastmodLedger = firstRun
    ? {}
    : (JSON.parse(readFileSync(LASTMOD_LEDGER, "utf8")) as LastmodLedger);
  const stamp = today();
  const ledger = nextLastmods(previous, hashes, stamp);

  const byUrl = new Map(paths.map((path) => [canonicalFor(path, basename), ledger[path].lastmod]));
  // LF on purpose: `.gitattributes` normalises the repo to LF, and CI reads the
  // committed bytes. Writing CRLF here would make the guard pass on Windows and
  // fail on the linux runner.
  const xml = renderSitemapXml(basename, (url) => {
    const lastmod = byUrl.get(url);
    if (!lastmod) throw new Error(`gen:sitemap: no lastmod computed for ${url}`);
    return lastmod;
  });
  writeFileSync(SITEMAP, xml, "utf8");
  writeFileSync(LASTMOD_LEDGER, renderLedger(ledger), "utf8");

  const restamped = paths.filter((path) => previous[path]?.sha256 !== ledger[path].sha256);
  // eslint-disable-next-line no-console
  console.log(
    `sitemap.xml written: ${paths.length} <loc>; ${restamped.length} stamped ${stamp}` +
      `${firstRun ? " (FIRST RUN — no ledger, every path stamped)" : ""}; ` +
      `${paths.length - restamped.length} kept their date. Ledger: ${LASTMOD_LEDGER}` +
      (restamped.length > 0 ? `\n  restamped: ${restamped.join(", ")}` : ""),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
