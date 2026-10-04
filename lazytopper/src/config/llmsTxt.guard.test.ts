// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { sitemapUrls } from "./sitemapUrls";

/**
 * GUARD — every URL `public/llms.txt` advertises is a URL the sitemap advertises.
 *
 * WHY THIS EXISTS
 * `llms.txt` is what AI crawlers read to understand the site, and it is a
 * HAND-WRITTEN list. The sitemap is DERIVED from the route registry
 * (`sitemapUrls.ts`). A hand-written list agrees with the registry on the day it
 * is written and drifts silently afterwards: a page dropped from the sitemap would
 * leave llms.txt pointing AI tools at it, and nothing would turn red, because the
 * SPA shell answers HTTP 200 for every path. This pin makes the sitemap the
 * authority: llms.txt may advertise nothing the sitemap does not (b) and, from
 * SEO-3, must advertise everything it does (e) — the two URL sets are EQUAL.
 *
 * WHAT `crawlerReachability.guard.test.ts` ALREADY COVERS, AND WHY THIS IS NOT IT
 * That guard resolves each llms.txt URL against the route table and the Vercel
 * rewrites, and fails on a foreign host. A routed page that is NOT in the sitemap
 * (deliberately absent because a crawler gets an empty app shell there) passes it.
 * This guard fails on exactly that case.
 *
 * ★ THE URL PATTERN IS THE SIBLING'S, VERBATIM — `advertisedFromLlms` in
 * `crawlerReachability.guard.test.ts`. Two guards that extract different URL sets
 * from the same file would disagree in silence.
 *
 * ★ COMPARISON IS EXACT STRING EQUALITY against `sitemapUrls("")`, which
 * returns ABSOLUTE canonical URLs. No trailing-slash, host or case normalisation:
 * any of those would let a URL the sitemap does not carry pass as one it does.
 * The production basename is EMPTY since ROOT-URL-1 — `sitemapUrls.guard.test.ts` pins
 * `PROD_BASENAME` to `""` from `vite.config.ts` (`base: "/"`).
 */

const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const LLMS_TXT = resolve(ROOT, "public", "llms.txt");
const BASENAME = "";

/** Floor for (a). The payload lists 63 (SEO-5 PR-3); a near-empty file must not pass vacuously. */
const MIN_URLS = 50;

/** Same pattern and trailing-punctuation trim as `advertisedFromLlms`. */
function urlsFromLlms(): string[] {
  const txt = readFileSync(LLMS_TXT, "utf8");
  return [...txt.matchAll(/https?:\/\/[^\s<>")]+/gi)].map((m) => m[0].replace(/[.,]$/, ""));
}

describe("llms.txt — lists exactly the sitemap URLs, pinned both ways", () => {
  const urls = urlsFromLlms();
  const sitemap = sitemapUrls(BASENAME);
  const inSitemap = new Set(sitemap);

  it("names its subject — the scope line is printed on every run, green included", () => {
    // eslint-disable-next-line no-console
    console.log(`LLMS_PIN: urls=${urls.length} sitemap=${sitemap.length}`);
    expect(sitemap.length, "sitemapUrls('') returned nothing").toBeGreaterThan(0);
  });

  it(`(a) llms.txt lists at least ${MIN_URLS} URLs`, () => {
    expect(urls.length, `llms.txt yielded ${urls.length} URLs, expected >= ${MIN_URLS}`).toBeGreaterThanOrEqual(
      MIN_URLS,
    );
  });

  it("(b) every llms.txt URL is in the sitemap", () => {
    const notInSitemap = urls.filter((u) => !inSitemap.has(u));
    expect(notInSitemap, `llms.txt advertises URLs the sitemap does not: ${notInSitemap.join(", ")}`).toEqual([]);
  });

  it("(c) no URL is listed twice", () => {
    const seen = new Set<string>();
    const dupes = urls.filter((u) => (seen.has(u) ? true : (seen.add(u), false)));
    expect(dupes, `llms.txt lists duplicate URLs: ${dupes.join(", ")}`).toEqual([]);
  });

  it("(d) llms.txt does not contain lazytopper.app", () => {
    expect(readFileSync(LLMS_TXT, "utf8").includes("lazytopper.app"), "llms.txt contains lazytopper.app").toBe(false);
  });

  // ★ SEO-3 — THE PIN RUNS BOTH WAYS (closes FU-LLMS-PIN-ONE-WAY, audit of #904).
  // (b) alone let a page the sitemap advertises be MISSING from llms.txt and stay
  // green, so an AI crawler would never be told about a page Google is. Together
  // with (b) and (c), this makes the two URL sets EQUAL.
  it("(e) every sitemap URL is in llms.txt", () => {
    const inLlms = new Set(urls);
    const notInLlms = sitemap.filter((u) => !inLlms.has(u));
    expect(notInLlms, `the sitemap advertises URLs llms.txt does not list: ${notInLlms.join(", ")}`).toEqual([]);
  });
});
