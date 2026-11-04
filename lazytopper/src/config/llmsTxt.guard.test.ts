// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { sitemapUrls } from "./sitemapUrls";
import { CBQ_SUBJECT_CLAIM } from "../lib/packs/packLabels";
import { PACK_PRICE_INR } from "../services/packs";
import { chargeFor, formatInr, GST_EXCLUSIVE_FROM_MS, PRICE_MONTHLY_FOUNDING_INR, PRICE_MONTHLY_LIST_INR, TILL_BOARDS_AFTER_FOUNDING_INR, TILL_BOARDS_FOUNDING_INR } from "./pricing";

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

/**
 * LLMS-MARKETING-1 — the URLs as the SITEMAP sees them: a `#section` fragment (`/pricing#cbq`) is the same page as
 * `/pricing`, so it is compared without the fragment. Only the fragment is dropped; host, path and case stay exact.
 */
function stripFragment(u: string): string {
  const i = u.indexOf("#");
  return i === -1 ? u : u.slice(0, i);
}

/** The markdown link targets - `[label](url)` - the curated list. Prose may repeat a URL; the list may not. */
function linkTargetsFromLlms(): string[] {
  const txt = readFileSync(LLMS_TXT, "utf8");
  return [...txt.matchAll(/\]\((https?:\/\/[^\s<>")]+)\)/gi)].map((m) => m[1]);
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
    const notInSitemap = urls.filter((u) => !inSitemap.has(stripFragment(u)));
    expect(notInSitemap, `llms.txt advertises URLs the sitemap does not: ${notInSitemap.join(", ")}`).toEqual([]);
  });

  it("(c) no URL is listed twice", () => {
    const seen = new Set<string>();
    const dupes = linkTargetsFromLlms().filter((u) => (seen.has(u) ? true : (seen.add(u), false)));
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
    const inLlms = new Set(urls.map(stripFragment));
    const notInLlms = sitemap.filter((u) => !inLlms.has(u));
    expect(notInLlms, `the sitemap advertises URLs llms.txt does not list: ${notInLlms.join(", ")}`).toEqual([]);
  });

  // LLMS-MARKETING-1 (owner, 30 Oct 2026) - the file must market Premium first, then the CBQ Packs and the other packs.
  it("(f) llms.txt offers Premium first, then the CBQ Packs, then the other packs, each linked to the Pricing page", () => {
    const txt = readFileSync(LLMS_TXT, "utf8");
    const premium = txt.indexOf("1. The Board Pass"); // GST-EXCL-1 review G6: never "Premium" in copy
    const cbq = txt.indexOf("2. CBQ Packs");
    const packs = txt.indexOf("3. Other PDF packs");
    expect(premium, "no Premium offer line").toBeGreaterThan(-1);
    expect(cbq, "no CBQ Packs offer line").toBeGreaterThan(premium);
    expect(packs, "no other-packs offer line").toBeGreaterThan(cbq);
    expect(txt).toContain("Details: https://www.lazytopper.com/pricing");
    expect(txt).toContain("https://www.lazytopper.com/pricing#cbq");
    expect(txt).toContain("https://www.lazytopper.com/pricing#packs");
    expect(txt).toContain("Maths CBQ Pack ₹199");
    expect(txt).toContain("Science CBQ Pack ₹199");
  });

  it("(g) the prices it quotes are the ones in code", () => {
    const txt = readFileSync(LLMS_TXT, "utf8");
    expect(txt).toContain(`${CBQ_SUBJECT_CLAIM.replace(" CBQs", "")} CBQs`);
    expect(txt).toContain(`CBQ Pack ₹${PACK_PRICE_INR.pack_cbq}`);
    expect(txt).toContain(`Chapter pack ₹${PACK_PRICE_INR.pack_chapter}`);
    expect(txt).toContain(`Mock pack ₹${PACK_PRICE_INR.pack_mock}`);
    expect(txt).toContain(`Subject pack ₹${PACK_PRICE_INR.pack_subject}`);
    expect(txt).toContain(`Bundle ₹${PACK_PRICE_INR.pack_bundle}`);
    // PRICE-FIXED-1 (owner, 31 Oct 2026): the Board Pass is one fixed price and the month price is hidden.
    expect(txt).toContain(`${formatInr(TILL_BOARDS_FOUNDING_INR)} + GST as the Founding member offer until 30 November 2026`);
    expect(txt).toContain(`${formatInr(TILL_BOARDS_AFTER_FOUNDING_INR)} + GST from 1 December 2026`);
    // GST-EXCL-1 (owner, 4 Nov 2026): every price is "+ GST" and the example totals are the code's own arithmetic.
    for (const n of [PACK_PRICE_INR.pack_cbq, PACK_PRICE_INR.pack_chapter, PACK_PRICE_INR.pack_mock, PACK_PRICE_INR.pack_subject, PACK_PRICE_INR.pack_bundle, TILL_BOARDS_FOUNDING_INR, TILL_BOARDS_AFTER_FOUNDING_INR]) {
      expect(txt).toContain(`${formatInr(n)} + GST`);
    }
    const cut = GST_EXCLUSIVE_FROM_MS;
    const bp = chargeFor(TILL_BOARDS_FOUNDING_INR, cut);
    const ch = chargeFor(PACK_PRICE_INR.pack_chapter, cut);
    expect(txt).toContain(`${formatInr(bp.baseInr)} + ${formatInr(bp.gstInr)} GST = ${formatInr(bp.totalInr)}`);
    expect(txt).toContain(`${formatInr(ch.baseInr)} + ${formatInr(ch.gstInr)} GST = ${formatInr(ch.totalInr)}`);
    expect(txt).toContain("From 5 November 2026 every price is plus 18% GST");
    expect(txt).not.toContain(String(PRICE_MONTHLY_FOUNDING_INR));
    expect(txt).not.toContain(String(PRICE_MONTHLY_LIST_INR));
    expect(txt).not.toMatch(/less than paying monthly|for a month/i);
    expect(txt).toContain("7-day free trial");
    expect(txt).not.toMatch(/Premium|refunds/); // GST-EXCL-1 review G6
  });
});
