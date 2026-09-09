// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import viteConfig from "../../vite.config";
import { renderSitemapXml, sitemapPaths, sitemapUrls } from "./sitemapUrls";
import {
  SELF_CANONICAL_EXACT,
  SELF_CANONICAL_ONE_SEGMENT,
  canonicalFor,
  canonicalPathFor,
} from "./canonicalUrl";
import { allDesktopTopics } from "../lib/desktop/topics";
import { LEGAL_SLUGS } from "../pages/legalSlugs";

/**
 * GUARD — `public/sitemap.xml` IS DERIVED FROM THE ROUTE REGISTRY, AND STAYS DERIVED.
 *
 * ★ WHAT THIS GUARDS THAT `crawlerReachability.guard.test.ts` CANNOT. That file
 * asks whether each URL the sitemap ALREADY lists maps to a route. It is
 * completely blind to a URL the sitemap OMITS — which is the whole defect here:
 * seven route families are self-canonical and the sitemap advertised three. A
 * guard that only validates what is present can never notice what is missing.
 * This file asserts the LIST ITSELF, recomputed from the registry.
 *
 * ⚠ AND A NOTE ON THAT SIBLING'S NON-VACUITY, BECAUSE IT IS NOT WHAT IT LOOKS
 * LIKE. Its routed-URL arm pins `locs.length > 0`, which stops a sitemap that
 * parses to zero entries from passing everything. It does NOT pin
 * `routed.length > 0`: every <loc> classified as a served STATIC FILE is
 * skipped before the route check, so a sitemap whose every entry were a static
 * page would leave its `dead` list empty and pass with the route arm having
 * examined nothing at all. `static_pages=0` on today's run is what makes that
 * green meaningful, and it is a value to READ on each run, not a property
 * anyone asserted. Its `staticPages` loop has no non-vacuity arm either.
 *
 * ⚠ ENVIRONMENT IS PINNED TO NODE ON PURPOSE, AND IT IS LOAD-BEARING. This file
 * imports `vite.config.ts` to read the basename from the same source Vite turns
 * into `import.meta.env.BASE_URL`. Under jsdom that import dies inside vite's
 * own internals (an invariant violation about TextEncoder producing something
 * that is not a Uint8Array), taking the whole file with it before a single test
 * runs. The RENDERING half of this contract therefore lives in the jsdom
 * sibling, `sitemapResolution.guard.test.tsx`. The environment is per-FILE.
 */

const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const SITEMAP = resolve(ROOT, "public", "sitemap.xml");

/**
 * The router's basename, from `vite.config.ts`'s `base` — the value Vite itself
 * turns into `import.meta.env.BASE_URL`, which `main.tsx` hands to
 * `<BrowserRouter>`. NOT `appBasename()`: outside Vite's browser transform that
 * returns the empty string, so every assertion below would be about
 * `https://www.lazytopper.com/...` URLs the product does not serve, and would
 * pass while proving nothing.
 */
const PROD_BASENAME = (() => {
  const base = (viteConfig as { base?: string }).base;
  if (typeof base !== "string" || base.length === 0) {
    throw new Error("vite.config.ts declares no `base`");
  }
  return base.endsWith("/") ? base.slice(0, -1) : base;
})();

/** The committed file is LF (`.gitattributes`); a Windows checkout is CRLF. */
const onDisk = (): string => readFileSync(SITEMAP, "utf8").replace(/\r\n/g, "\n");

/** Every `<loc>` in the file, IN ORDER — order matters for the parity check. */
function locsOnDisk(): string[] {
  return [...onDisk().matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

/** The published `<lastmod>` per URL — not derivable from the route table. */
function publishedLastmods(): Map<string, string> {
  return new Map(
    [...onDisk().matchAll(/<url>[\s\S]*?<\/url>/g)].flatMap((m) => {
      const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/.exec(m[0])?.[1];
      const lastmod = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(m[0])?.[1];
      return loc && lastmod ? [[loc, lastmod] as [string, string]] : [];
    }),
  );
}

describe("sitemap.xml — derived from the registry, not hand-listed", () => {
  it("the basename came from vite.config.ts, not from a literal and not from BASE_URL", () => {
    // Name the subject. Were this ever the empty string the whole suite would
    // stay green while asserting things about URLs with no /app in them.
    expect(PROD_BASENAME).toBe("/app");
    // eslint-disable-next-line no-console
    console.log(
      `SITEMAP_DERIVATION: basename=${PROD_BASENAME} ` +
        `exact_families=${SELF_CANONICAL_EXACT.length} ` +
        `one_segment_families=${SELF_CANONICAL_ONE_SEGMENT.length} ` +
        `registry_topics=${allDesktopTopics().length} ` +
        `derived_urls=${sitemapUrls(PROD_BASENAME).length} ` +
        `locs_on_disk=${locsOnDisk().length}`,
    );
  });

  it("★★ THE POINT — the committed file is byte-identical to a fresh generation", () => {
    const locs = locsOnDisk();
    const derived = sitemapUrls(PROD_BASENAME);

    // Non-vacuous both ways: a file that parsed to nothing, or a derivation that
    // produced nothing, would make every comparison below trivially true.
    expect(locs.length, "sitemap.xml yielded no <loc>").toBeGreaterThan(3);
    expect(derived.length, "the derivation produced no URLs").toBeGreaterThan(3);

    // Order included: the generator emits the ruled families in ruling order and
    // each registry in its own order, so a reorder means someone hand-edited.
    expect(locs).toEqual([...derived]);

    // And the WHOLE FILE, not just its <loc>s. The generator is re-run here with
    // the dates the file already carries, so a hand edit to the surrounding XML —
    // a reintroduced <priority>, a dropped <lastmod>, a reindent — is caught too.
    const published = publishedLastmods();
    expect(
      onDisk(),
      "public/sitemap.xml has drifted from the registry. Regenerate it with " +
        "`pnpm --filter lazytopper run gen:sitemap` rather than editing it by hand.",
    ).toBe(
      renderSitemapXml(PROD_BASENAME, (url) => published.get(url) ?? "MISSING-LASTMOD"),
    );
  });

  it("★★ every advertised URL is SELF-CANONICAL — the sitemap and #736 cannot disagree", () => {
    const derived = sitemapUrls(PROD_BASENAME);
    expect(derived.length).toBeGreaterThan(3);

    // The invariant: crawl this URL and the page you land on names THIS URL as
    // authoritative. Advertising a page that canonicalises elsewhere is asking
    // Google to fetch a URL and then telling it to discard what it fetched.
    for (const url of derived) {
      const path = new URL(url).pathname.slice(PROD_BASENAME.length) || "/";
      expect(
        canonicalFor(path, PROD_BASENAME),
        `${url} is advertised but canonicalises to ${canonicalFor(path, PROD_BASENAME)}`,
      ).toBe(url);
    }

    // CONTROL — the assertion above is worth something only if a NON-self-canonical
    // path would fail it. These are real routes that deliberately consolidate to
    // the root; `/u/:token` is a share token that must never be advertised, and
    // `/topic-hub/10/Maths` is the premium-gated two-segment shape the ruling
    // excludes precisely so a bare-prefix match cannot sweep it in.
    const advertisedPaths = new Set(derived.map((u) => new URL(u).pathname));
    for (const excluded of ["/me", "/check-improve", "/u/abc123", "/topic-hub/10/Maths"]) {
      expect(
        canonicalPathFor(excluded),
        `${excluded} became self-canonical — the control no longer controls`,
      ).toBe("/");
      expect(
        advertisedPaths.has(`${PROD_BASENAME}${excluded}`),
        `${excluded} is in the sitemap and must not be`,
      ).toBe(false);
    }
  });

  it("★ every ruled family is represented — a new family cannot be silently dropped", () => {
    const paths = sitemapPaths();

    // Exact families: each appears verbatim.
    for (const exact of SELF_CANONICAL_EXACT) {
      expect(paths, `ruled exact route ${exact} is not advertised`).toContain(exact);
    }

    // Parameterised families: `membersOfParameterisedFamily` THROWS for a prefix
    // it has no member registry for, so a new family added to the ruling turns
    // this red instead of vanishing from the sitemap. Pin the set it was written
    // against so "a new family appeared" is a failure someone must look at.
    expect([...SELF_CANONICAL_ONE_SEGMENT].sort()).toEqual(["/legal", "/topic-hub"]);

    // ★★ THE GAP IS CLOSED — OWNER RULING, 2026-09-09 (FOLLOWON-1), which retires
    // [FU-SITEMAP-LEGAL-PAGES-UNADVERTISED]. This assertion previously read
    // `.toEqual([])` and pinned the EMPTINESS: `/legal/:slug` had been
    // self-canonical since #736 with none of its members advertised, because the
    // ruling for THAT change named practice-hub, topic-hub and the topic pages
    // only. The owner has now ruled the legal pages IN.
    //
    // ⚠ AND IT IS STILL DERIVED, WHICH IS THE ONLY REASON THIS IS SAFE. The
    // expectation is built from `LEGAL_SLUGS` — `Object.keys(PAGES)` in
    // `pages/LegalPage.tsx`, the very table the route renders from — so it cannot
    // pass while the sitemap advertises a slug the page cannot resolve.
    // Hand-listing "privacy", "terms", "refund" here would recreate the exact
    // second-source-of-truth defect this module exists to prevent, and the trap is
    // not hypothetical: every label in the product reads "Refunds", PLURAL,
    // against a slug of `refund`, SINGULAR.
    expect(
      paths.filter((p) => p.startsWith("/legal/")),
      "the /legal family is not expanded from LegalPage's own slug table",
    ).toEqual(LEGAL_SLUGS.map((slug) => `/legal/${slug}`));

    // Non-vacuous: an empty `LEGAL_SLUGS` would reduce the equality above to
    // `[] === []` — precisely the green this assertion used to pin as a FINDING.
    // A floor rather than an exact count means a fourth policy page does not need
    // an edit here, while still refusing to pass on nothing.
    expect(
      LEGAL_SLUGS.length,
      "LEGAL_SLUGS is empty — the /legal expansion would be vacuously correct",
    ).toBeGreaterThan(2);
  });

  /**
   * ★ THE BARE `/topic-hub` IS OUT — OWNER RULING, 2026-09-09 (FOLLOWON-1).
   * *"With no `:topicName` it is a signpost, not a destination, and a sitemap
   * should advertise pages rather than redirects."*
   *
   * ⚠ IT IS NOT A "CONSOLIDATE TO THE ROOT" CASE, WHICH IS WHY IT IS NOT IN THE
   * CONTROL LOOP ABOVE. Those paths canonicalise to "/". This one names its
   * redirect DESTINATION, `/exam-trends`. Asserting both halves in one test keeps
   * "not advertised" and "canonicalises to the destination" as ONE ruling rather
   * than two facts in two files that can drift apart.
   */
  it("★ the bare /topic-hub is NOT advertised, and its canonical names /exam-trends", () => {
    const paths = sitemapPaths();

    expect(paths, "the redirecting /topic-hub is advertised and must not be")
      .not.toContain("/topic-hub");
    expect(SELF_CANONICAL_EXACT, "/topic-hub is still in the self-canonical set")
      .not.toContain("/topic-hub");
    expect(canonicalPathFor("/topic-hub")).toBe("/exam-trends");
    expect(canonicalFor("/topic-hub", PROD_BASENAME)).toBe(
      "https://www.lazytopper.com/app/exam-trends",
    );

    // CONTROL — SURGICAL, not a prefix sweep. The 26 topic pages live under the
    // same prefix; a fix that dropped the whole family would satisfy every
    // assertion above while emptying the sitemap of the pages it exists to serve.
    expect(
      paths.filter((p) => p.startsWith("/topic-hub/")).length,
      "the 26 topic pages were removed along with their parent",
    ).toBe(allDesktopTopics().length);
  });

  it("★ the topic pages come from the registry — membership and count, not a typed list", () => {
    const registry = allDesktopTopics();
    const advertised = sitemapPaths().filter((p) => p.startsWith("/topic-hub/"));

    expect(registry.length, "the topic registry is empty").toBeGreaterThan(0);
    // EQUALITY, not containment: containment would pass while the sitemap still
    // carried an extra hand-typed slug the registry no longer has.
    expect(advertised).toEqual(registry.map((t) => `/topic-hub/${t.slug}`));

    // No duplicates anywhere in the file.
    const locs = locsOnDisk();
    expect(new Set(locs).size, "sitemap.xml contains a duplicate <loc>").toBe(locs.length);
  });

  it("★ every advertised slug is URL-safe — a registry slug is not required to be", () => {
    // ⚠ THIS ARM EXISTS BECAUSE A MUTATION TEST FOUND THE HOLE. Probing the
    // resolution guard with a registry slug of `"Our Environment!"` did NOT go
    // red: `desktopTopicBySlug` normalises its input and ALSO matches on the
    // normalised NAME, so the page still resolved. Nothing in the registry
    // requires a slug to be URL-shaped — that is the RESOLVER's tolerance, and
    // it does not extend to the sitemap, where a raw space is a malformed <loc>
    // that Google rejects for the whole file. Assert the property here, where it
    // is actually required, instead of assuming the resolver implies it.
    const segments = sitemapPaths().flatMap((p) => p.split("/").filter(Boolean));
    expect(segments.length, "no path segments to check").toBeGreaterThan(0);
    for (const segment of segments) {
      expect(
        encodeURIComponent(segment),
        `path segment "${segment}" needs percent-encoding to appear in a URL`,
      ).toBe(segment);
    }
    // And the rendered file carries no whitespace inside a <loc>.
    for (const loc of locsOnDisk()) {
      expect(/\s/.test(loc), `<loc> ${loc} contains whitespace`).toBe(false);
    }
  });
});
