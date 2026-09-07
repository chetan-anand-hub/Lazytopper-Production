/**
 * CANONICAL URL RESOLVER — every page's own address, computed once.
 *
 * ★ THE DEFECT THIS EXISTS TO FIX. `index.html` ships ONE hardcoded
 * `<link rel="canonical">` and ONE `<meta property="og:url">`, both naming
 * `/app/`. This is a SPA, so EVERY route serves that same file — which told
 * Google that the authoritative copy of `/app/exam-trends`, of `/app/pricing`
 * and of all 26 topic-hub pages was `/app/`. Google obeyed: Search Console
 * reported `/app/exam-trends` as "Alternate page with proper canonical tag"
 * (deduplicated away) and two pages indexed on the whole property.
 *
 * ★ WHY THIS FILE IS PURE. `canonicalFor` is a plain function over a string so
 * the guard can feed it synthetic input and be PROVEN to fire. A detector that
 * can only be pointed at the real app can never be shown to work, which is how
 * `head.guard.test.ts` stayed green through the entire defect: it asserted the
 * canonical was present, single and matched to `og:url` — all TRUE while it
 * named the wrong page on 25 of 26 routes. FORM, not CORRESPONDENCE.
 *
 * ⚠ THE BASENAME IS NOT OPTIONAL. The router runs with basename `/app`
 * (main.tsx, from `import.meta.env.BASE_URL`), so `useLocation().pathname`
 * EXCLUDES it: the route path `/exam-trends` is the URL `/app/exam-trends`.
 * A canonical built from the route path alone points every page at a 404.
 * `appBasename()` below reads the SAME source of truth the router itself uses,
 * so the two cannot drift apart.
 *
 * ⚠ TRAILING SLASH — one convention, matching `public/sitemap.xml`:
 * the root is `/app/` WITH a slash; every other path has NONE.
 */

/** The host the sitemap, robots.txt and og:image already use. */
export const SITE_ORIGIN = "https://www.lazytopper.com";

/**
 * The router's basename, from the SAME value `main.tsx` passes to
 * `<BrowserRouter basename=...>`. Mirroring the source rather than restating
 * `/app` keeps this from drifting if the base path ever changes.
 */
export function appBasename(): string {
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

/**
 * SELF-CANONICAL ROUTES — OWNER RULING, 2026-09-07. Seven routes.
 *
 * ★ THE RULE: a route is self-canonical when A SIGNED-OUT VISITOR SEES REAL
 * CONTENT THERE. The product is intent-first — a student browses freely and the
 * login gate fires at the ACTION, not at the page — so that entry is the one it
 * is designed for. Everything not listed here consolidates to the root.
 *
 * ⚠ `/practice-hub` WAS ADDED AFTER THE OWNER OPENED THE LIVE PAGE. An earlier
 * reading excluded it as "a mode launcher with nothing to read"; the rendered
 * page is a full subject/scope/topic chooser plus four described modes and an
 * honest locked-feature panel. It is the natural landing for a query like
 * "CBSE class 10 practice test". RECORDED BECAUSE THE CORRECTION CAME FROM THE
 * LIVE PRODUCT, NOT THE CODE: a route name and a grep said "launcher"; opening
 * the page said otherwise. Do not re-derive this set from route names.
 */
export const SELF_CANONICAL_EXACT: readonly string[] = [
  "/",
  "/pricing",
  "/exam-trends",
  "/topic-hub",
  "/practice-hub",
];

/**
 * Prefixes that are self-canonical with EXACTLY ONE further path segment.
 *
 * ⚠ "EXACTLY ONE" IS LOAD-BEARING. `/topic-hub/:grade/:subject` and
 * `/topic-hub/:grade/:subject/:topicKey` are premium-gated and render a login
 * redirect to a crawler; they must NOT be self-canonical. Matching on a bare
 * prefix would sweep them in.
 */
export const SELF_CANONICAL_ONE_SEGMENT: readonly string[] = [
  "/legal",
  "/topic-hub",
];

/** Drop any query string or hash, and any trailing slash except the root's. */
function normalise(pathname: string): string {
  let p = pathname;
  const q = p.indexOf("?");
  if (q !== -1) p = p.slice(0, q);
  const h = p.indexOf("#");
  if (h !== -1) p = p.slice(0, h);
  while (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p === "" ? "/" : p;
}

/**
 * The app-relative path this route should declare as authoritative.
 * Anything not in the ruled set returns "/" — today's behaviour, kept
 * deliberately: consolidating a launcher or a gated page is correct, and a
 * WRONG self-canonical is worse than the bug this file fixes because it
 * invites Google to index a page that should not exist.
 *
 * ⚠ `/u/:token` is a SHARE-TOKEN route. It falls to "/" here and must stay
 * that way — a self-canonical there would invite Google to index user tokens.
 */
export function canonicalPathFor(pathname: string): string {
  const path = normalise(pathname);

  if (SELF_CANONICAL_EXACT.includes(path)) return path;

  const segments = path.split("/").filter(Boolean);
  if (segments.length === 2) {
    const prefix = "/" + segments[0];
    if (SELF_CANONICAL_ONE_SEGMENT.includes(prefix)) {
      // The segment is reused VERBATIM: `location.pathname` is already
      // percent-encoded, so re-encoding it would double-escape the topic name.
      return prefix + "/" + segments[1];
    }
  }

  return "/";
}

/**
 * The absolute URL this route declares as authoritative — the ONE string that
 * feeds BOTH `<link rel="canonical">` and `<meta property="og:url">`.
 *
 * ★ ONE STRING, ONE CODE PATH, ON PURPOSE. `head.guard.test.ts` asserts the
 * two are BYTE-identical. Computing them separately would satisfy that guard
 * by coincidence and break the first time either side was edited alone.
 */
export function canonicalFor(pathname: string, basename: string = appBasename()): string {
  const path = canonicalPathFor(pathname);
  // Root keeps its trailing slash; every other path has none. Matches sitemap.xml.
  return path === "/" ? SITE_ORIGIN + basename + "/" : SITE_ORIGIN + basename + path;
}
