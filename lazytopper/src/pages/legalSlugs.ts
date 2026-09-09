/**
 * THE `/legal/:slug` MEMBERSHIP — one list, consumed by the route and the sitemap.
 *
 * ★ WHY THIS IS ITS OWN MODULE AND NOT AN EXPORT FROM `LegalPage.tsx`. The sitemap
 * generator (`scripts/generateSitemap.ts`, run under `tsx` on node) expands
 * `/legal/:slug` into the URLs Google is asked to crawl, so it needs these slugs.
 * Reaching into the page component for them fails TWICE, and both failures are
 * worth recording because neither is visible to the gate you would reach for first:
 *
 *   1. AT RUNTIME — the repo's ROOT `tsconfig.json` is a references-only stub with
 *      no `compilerOptions`, so `tsx` finds no `jsx` setting, falls back to the
 *      CLASSIC runtime, and emits `React.createElement` into a module that never
 *      imports React: `ReferenceError: React is not defined`.
 *   2. AT BUILD — `pnpm run build` runs `tsc -b`, which builds `tsconfig.node.json`
 *      as well as the app project. The node project has no `jsx` either, so a
 *      `.tsx` import from tooling code is `error TS6142: ... '--jsx' is not set`.
 *
 * ⚠ AND `tsc -p tsconfig.app.json --noEmit` IS GREEN THROUGH BOTH OF THEM, because
 * the app config DOES set `jsx`. The standing two-config gate (app + test) does not
 * cover the NODE project; only the build does. A DATA MODULE HAS NO SUCH PROBLEM —
 * keeping the slugs JSX-free is what lets one list serve a React route and a node
 * script at once.
 *
 * ★ THIS IS STILL ONE SOURCE OF TRUTH, ENFORCED BY THE COMPILER RATHER THAN BY A
 * CONVENTION. `LegalPage.tsx` declares its content table as
 * `Record<LegalSlug, PageDef>`, so a slug listed here with no page is a MISSING
 * PROPERTY error and a page whose key is not listed here is an EXCESS PROPERTY
 * error. The two cannot drift: they fail to compile. That is strictly stronger than
 * deriving the list with `Object.keys(PAGES)` at runtime, which can only be checked
 * once something imports it.
 *
 * ⚠ THE THIRD SLUG IS `refund`, SINGULAR — AND EVERY LABEL IN THE PRODUCT READS
 * "Refunds", PLURAL. `DesktopShell`, `MobileAccountMenu`, `PublicLegalFooter` and
 * `Welcome` all render the plural label against this singular slug. A sitemap built
 * by copying the visible footer would have shipped `/legal/refunds` — a soft 404
 * that returns HTTP 200 forever, because on a SPA every path serves the shell and
 * no status check can find it. READ THE SLUG FROM HERE, NEVER FROM A LABEL.
 *
 * ⚠ ORDER IS EMITTED VERBATIM into `public/sitemap.xml`, so reordering this array
 * reorders the file. That is intended: it is what makes a hand edit detectable.
 */
export const LEGAL_SLUGS = ["privacy", "terms", "refund"] as const;

/** The slug union `LegalPage`'s content table is keyed on. */
export type LegalSlug = (typeof LEGAL_SLUGS)[number];
