/**
 * SITEMAP URL SET — the pages this site asks Google to index, DERIVED.
 *
 * ★ THE DEFECT THIS CLOSES. `index.html` used to ship ONE hardcoded
 * `<link rel="canonical">` naming `/app/`, and because this is a SPA every
 * route serves that same file, so Google was told the authoritative copy of
 * every page was `/app/`. Google obeyed: two pages indexed on the property.
 * CANONICAL-1 (#736) made seven route families self-canonical, and Search
 * Console's Live Test confirmed it on `/app/exam-trends`. But `sitemap.xml`
 * still advertised only THREE URLs, and Request Indexing is rate-limited —
 * so the sitemap is how Google FINDS the rest. This module is that list.
 *
 * ⛔ NOTHING HERE IS HAND-LISTED, AND THAT IS THE POINT. A hand-written list of
 * 26 topic URLs is a SECOND source of truth: it agrees with the router on the
 * day it is written and drifts the first time a topic is added or renamed,
 * and the failure mode is silent (a sitemap URL that 404s, which still returns
 * HTTP 200 because the SPA shell is served for everything). Every path below
 * comes from the SAME two authorities the running app uses:
 *
 *   - WHICH FAMILIES  → `SELF_CANONICAL_EXACT` / `SELF_CANONICAL_ONE_SEGMENT`
 *                       in `./canonicalUrl` — the owner's ruled set, the very
 *                       arrays that decide whether a page is self-canonical.
 *   - WHICH MEMBERS   → `allDesktopTopics()` in `../lib/desktop/topics` — the
 *                       registry `DesktopTopicHubPage` itself resolves against.
 *
 * ★ THE INVARIANT THAT TIES THEM: every URL this module emits must be
 * SELF-CANONICAL, i.e. `canonicalFor(path) === url`. Advertising a page that
 * declares a DIFFERENT page as authoritative is asking Google to crawl a URL
 * and then telling it to throw that URL away. `sitemapUrls.guard.test.tsx`
 * asserts exactly that, per URL, so the two sets cannot diverge in silence.
 *
 * ⚠ THE BASENAME IS A PARAMETER, NEVER A LITERAL. `canonicalFor` defaults it to
 * `appBasename()` (`import.meta.env.BASE_URL`), which is the router's own
 * source under Vite — but under vitest and under tsx that value is `"/"`, not
 * `"/app/"`. Callers therefore pass it in, and both callers (the generator
 * script and the guard) read it from `vite.config.ts`'s `base` — the value Vite
 * itself turns into `BASE_URL`. Upstream of the same source, never a literal.
 */

import {
  SELF_CANONICAL_EXACT,
  SELF_CANONICAL_ONE_SEGMENT,
  canonicalFor,
} from "./canonicalUrl";
import { allDesktopTopics } from "../lib/desktop/topics";

/**
 * The concrete members of each PARAMETERISED self-canonical family.
 *
 * ★ A FAMILY IS A PATTERN; A SITEMAP NEEDS ADDRESSES. `/topic-hub/:topicName`
 * is self-canonical, but Google cannot crawl a colon — the family has to be
 * expanded against the registry that decides which members actually resolve.
 *
 * ⚠ `/legal` IS DELIBERATELY EMPTY, AND THE EMPTINESS IS A KNOWN GAP, NOT AN
 * OVERSIGHT. `/legal/:slug` has three real members (privacy, terms, refund),
 * they render for a signed-out visitor, and #736 made them self-canonical — but
 * the owner's ruling for THIS change named practice-hub, topic-hub and the topic
 * pages only. Advertising legal pages as well would be this lane's opinion, not
 * the ruling, so the gap is recorded here and reported rather than closed
 * unilaterally. Their slugs also live in a private `TABS`/`PAGES` table inside
 * `pages/LegalPage.tsx`; closing the gap means exporting that registry first, on
 * the same no-hand-listing rule this file exists to enforce.
 *
 * ★ THE TABLE IS TOTAL, AND THE GUARD PROVES IT. Every prefix in
 * `SELF_CANONICAL_ONE_SEGMENT` must appear as a key here. A NEW parameterised
 * family added to the ruling would otherwise be dropped from the sitemap in
 * total silence — the exact failure this module exists to make impossible.
 */
function membersOfParameterisedFamily(prefix: string): readonly string[] {
  switch (prefix) {
    case "/topic-hub":
      // The registry `DesktopTopicHubPage` resolves `:topicName` against.
      return allDesktopTopics().map((topic) => topic.slug);
    case "/legal":
      return [];
    default:
      // Unreachable while the guard's totality check is green. Throwing beats
      // returning [] : a silent empty is how a whole family disappears.
      throw new Error(
        `sitemapUrls: self-canonical family "${prefix}" has no member registry. ` +
          `Add one in membersOfParameterisedFamily() — an unexpanded family is ` +
          `a page Google will never be told about.`,
      );
  }
}

/**
 * Every app-relative path the sitemap advertises, in emission order:
 * the exact routes in the order the ruling lists them, then each
 * parameterised family expanded in its registry's own order.
 */
export function sitemapPaths(): string[] {
  const paths: string[] = [...SELF_CANONICAL_EXACT];
  for (const prefix of SELF_CANONICAL_ONE_SEGMENT) {
    for (const member of membersOfParameterisedFamily(prefix)) {
      paths.push(`${prefix}/${member}`);
    }
  }
  return paths;
}

/**
 * Every absolute URL the sitemap advertises.
 *
 * ★ BUILT THROUGH `canonicalFor`, NOT BY STRING CONCATENATION. That is what
 * makes "advertised" and "self-canonical" the same computation rather than two
 * that happen to agree: the trailing-slash convention (root WITH, everything
 * else WITHOUT), the origin and the basename all come from one place, and a
 * path that is NOT self-canonical would collapse to the root here and be caught
 * by the guard as a duplicate instead of shipping as a wrong URL.
 */
export function sitemapUrls(basename: string): string[] {
  return sitemapPaths().map((path) => canonicalFor(path, basename));
}

/**
 * Render the sitemap XML.
 *
 * `lastmodFor` is supplied by the caller because a last-modified date is NOT
 * derivable from the route table — the generator preserves the date already
 * published for a URL and stamps only genuinely new ones, so regenerating does
 * not falsely re-date every page and blunt the freshness signal.
 *
 * `<changefreq>` and `<priority>` are omitted on purpose: Google ignores both,
 * and `crawlerReachability.guard.test.ts` fails if either reappears.
 */
export function renderSitemapXml(
  basename: string,
  lastmodFor: (url: string) => string,
): string {
  const body = sitemapUrls(basename)
    .map((url) => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmodFor(url)}</lastmod>\n  </url>`)
    .join("\n");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${body}\n` +
    "</urlset>\n"
  );
}
