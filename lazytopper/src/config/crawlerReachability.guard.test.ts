// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
// ★ THE APP'S OWN MATCHER, NOT A MODEL OF IT. `resolvePath` below had to model
// Vercel because Vercel is not importable; React Router IS. Re-implementing route
// matching would put a second, drifting copy of the rules in the repo — and a
// matcher that disagrees with the router is worse than no matcher, because it
// disagrees silently. `matchPath` is a pure function and runs in the node env.
import { matchPath } from "react-router-dom";

/**
 * GUARD — every absolute URL this app ADVERTISES must actually RESOLVE.
 *
 * WHY THIS EXISTS
 * The same defect has now shipped four times in one file family, and every guard
 * we had missed all four — because each one checked the VALUE of a metadata
 * string and none of them checked whether the URL that string names could be
 * FETCHED.
 *
 *   - `robots.txt`, `sitemap.xml`, `llms.txt` and `favicon.svg` were all 404 at
 *     the site root. Vite builds with `base: "/app/"` and outputs into
 *     `dist/public/app/`, so every file in `public/` is served under `/app/`,
 *     and NOTHING is ever placed at the deployment root. Crawlers fetch
 *     `/robots.txt` and `/sitemap.xml` from the root by protocol and will never
 *     look under `/app/` — so no robots directive and no sitemap this project
 *     has ever written has reached a single crawler.
 *   - `og:image` was the identical defect, fixed separately in #612 by pointing
 *     the meta tag at `/app/og-image.png`.
 *
 * Every one of those was a correct string pointing at a path nothing served.
 *
 * WHAT THIS GUARD DOES DIFFERENTLY
 * It builds a model of what the deployment actually serves — the files that ship,
 * plus `vercel.json`'s redirect and rewrite tables — and then RESOLVES every
 * absolute URL the product advertises against that model. It is the difference
 * between "the string says /sitemap.xml" and "/sitemap.xml is served".
 *
 * ★ WHAT IT CANNOT CATCH is enumerated at the bottom of this file and is not
 * short. Read it before trusting a green run.
 */

const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const REPO_ROOT = resolve(ROOT, "..");
const VERCEL_JSON = resolve(REPO_ROOT, "vercel.json");
const INDEX_HTML = resolve(ROOT, "index.html");
const PUBLIC_ROOT = resolve(ROOT, "public");
/** Read-only. This guard inspects the route table; it never edits App.tsx. */
const APP_TSX = resolve(ROOT, "src", "App.tsx");

/**
 * The host the product advertises. Note this is the host written into the files,
 * NOT necessarily the host the CDN canonicalises to — see LIMITS §6.
 */
const PRODUCT_HOST = "lazytopper.com";

/**
 * ★ THE BUILD MAPPING, AND WHY IT IS THE WHOLE BUG.
 *
 * `lazytopper/vite.config.ts` sets `base: "/app/"` and, in production,
 * `outDir: "../artifacts/lazytopper-app/dist/public/app"`. The deployment's
 * static root is `dist/public/`. Therefore:
 *
 *     lazytopper/public/robots.txt   ->  /app/robots.txt
 *     lazytopper/index.html          ->  /app/index.html
 *     (deployment root)              ->  contains ONLY app/
 *
 * If that ever changes, this constant is the single line to change, and every
 * assertion below moves with it.
 */
const SERVED_PREFIX = "/app";

// --------------------------------------------------------------------------
// 1 · THE MODEL OF WHAT IS SERVED
// --------------------------------------------------------------------------

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "coverage", ".vite"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Every URL path the deployment serves as a real static file. */
function servedFiles(): Set<string> {
  const paths = new Set<string>();
  if (existsSync(INDEX_HTML)) paths.add(`${SERVED_PREFIX}/index.html`);
  if (existsSync(PUBLIC_ROOT)) {
    for (const abs of walk(PUBLIC_ROOT)) {
      const rel = relative(PUBLIC_ROOT, abs).split(sep).join("/");
      paths.add(`${SERVED_PREFIX}/${rel}`);
    }
  }
  return paths;
}

interface Rule {
  source: string;
  destination: string;
}

function readVercelConfig(): { redirects: Rule[]; rewrites: Rule[] } {
  const raw = JSON.parse(readFileSync(VERCEL_JSON, "utf8"));
  return {
    redirects: (raw.redirects ?? []) as Rule[],
    rewrites: (raw.rewrites ?? []) as Rule[],
  };
}

/**
 * Match a Vercel `source` pattern against a path.
 *
 * Supports the two forms this repo uses: a literal path, and a `:name*`
 * catch-all. `:name` (single segment) is supported for completeness. Returns the
 * captured params, or null when the pattern does not match.
 *
 * ⚠ This is a MODEL of Vercel's matcher, not Vercel's matcher. It is deliberately
 * strict: an unsupported pattern construct throws rather than silently failing to
 * match, because a silent non-match would make an unreachable path look reachable.
 *
 * ★★★ THIS MODEL ONCE DIVERGED FROM VERCEL, AND THE DIVERGENCE SHIPPED A 404.
 * It modelled `:name*` as `(.*)`, which matches a trailing slash. Vercel compiles
 * `source` with path-to-regexp, where `:name*` matches a sequence of SEGMENTS and
 * does NOT match a path ending in "/". So the model called
 * `/questions/class-10/science/light-reflection-and-refraction/` reachable while
 * the real preview returned 404 (X-Vercel-Error: NOT_FOUND, X-Vercel-Id: bom1) —
 * a green guard over a dead URL. The direction of the error is the dangerous one:
 * the model was MORE PERMISSIVE than Vercel, so it could only ever hide a 404,
 * never invent one.
 *
 * `:name*` is therefore modelled as segments-with-no-trailing-slash. Proof that
 * the SOURCE is what fails to match, rather than the destination failing to
 * resolve: `/app/practice/` also 404s, and `/app/:path*`'s destination is the
 * LITERAL, existing file `/app/index.html`.
 */
function matchSource(source: string, path: string): Record<string, string> | null {
  if (!source.startsWith("/")) {
    throw new Error(`unsupported vercel source (must start with "/"): ${source}`);
  }
  // `:name(pattern)` is a supported construct, so its regex characters are
  // removed before the unsupported-construct sweep rather than tripping it.
  const residue = source.replace(/:[A-Za-z0-9_]+\([^()]*\)/g, "");
  if (/[()^$?+]/.test(residue)) {
    throw new Error(
      `unsupported vercel source construct (regex) in "${source}" — this guard ` +
        `models literal, :param, :param* and :param(pattern) only. Extend ` +
        `matchSource() or the guard will mis-report reachability.`,
    );
  }
  const names: string[] = [];
  const regexSrc = source
    .split("/")
    .map((seg) => {
      if (seg === "") return "";
      const custom = seg.match(/^:([A-Za-z0-9_]+)\(([^()]*)\)$/);
      if (custom) {
        names.push(custom[1]);
        return `(${custom[2]})`;
      }
      const star = seg.match(/^:([A-Za-z0-9_]+)\*$/);
      if (star) {
        names.push(star[1]);
        // ★ SEGMENTS, AND NEVER A TRAILING SLASH — see the divergence note above.
        return "((?:[^/]+(?:/[^/]+)*)?)";
      }
      const one = seg.match(/^:([A-Za-z0-9_]+)$/);
      if (one) {
        names.push(one[1]);
        return "([^/]+)";
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");

  const m = new RegExp(`^${regexSrc}$`).exec(path);
  if (!m) return null;
  const params: Record<string, string> = {};
  names.forEach((n, i) => {
    params[n] = m[i + 1];
  });
  return params;
}

function applyParams(destination: string, params: Record<string, string>): string {
  return destination.replace(/:([A-Za-z0-9_]+)\*?/g, (whole, name: string) =>
    name in params ? params[name] : whole,
  );
}

type Resolution =
  | { kind: "file"; path: string }
  | { kind: "proxy"; destination: string }
  | { kind: "redirect"; to: string; then: Resolution }
  | { kind: "unreachable"; path: string; reason: string };

/**
 * ★★ RESOLUTION ORDER — verified against Vercel's current documentation, not
 * assumed.
 *
 * `vercel.json` reference, §rewrites: "The `source` property should NOT be a file
 * because PRECEDENCE IS GIVEN TO THE FILESYSTEM PRIOR TO REWRITES BEING APPLIED."
 * The same page describes `rewrites` as the replacement for the legacy
 * `handle: "filesystem"` phase, "which checks the filesystem by default", and
 * states that rules are processed in array order, so catch-alls belong last.
 *
 * So: redirects -> filesystem -> rewrites (first match wins) -> 404.
 *
 * ★ THIS ORDER IS ALSO PROVEN LIVE BY THIS VERY DEPLOYMENT. `/app/robots.txt`
 * returns 200 with the real robots body even though the rewrite
 * `/app/:path* -> /app/index.html` would otherwise swallow it. The filesystem
 * beat the rewrite. That is the ordering, observed rather than believed — and it
 * is why rewriting a ROOT path to an `/app/` file works: the destination is a
 * real file, so the SPA catch-all never sees it.
 */
function resolvePath(path: string, depth = 0): Resolution {
  if (depth > 5) {
    return { kind: "unreachable", path, reason: "redirect/rewrite loop" };
  }
  const { redirects, rewrites } = readVercelConfig();
  const files = servedFiles();

  // Directory requests serve index.html.
  const asFile = path.endsWith("/") ? `${path}index.html` : path;

  // 1 · redirects
  for (const r of redirects) {
    const params = matchSource(r.source, path);
    if (params) {
      const to = applyParams(r.destination, params);
      return { kind: "redirect", to, then: resolvePath(to, depth + 1) };
    }
  }

  // 2 · filesystem — beats every rewrite
  if (files.has(asFile)) return { kind: "file", path: asFile };

  // 3 · rewrites, first match wins
  for (const w of rewrites) {
    const params = matchSource(w.source, path);
    if (params) {
      const dest = applyParams(w.destination, params);
      if (/^https?:\/\//.test(dest)) return { kind: "proxy", destination: dest };
      const destFile = dest.endsWith("/") ? `${dest}index.html` : dest;
      if (files.has(destFile)) return { kind: "file", path: destFile };
      return {
        kind: "unreachable",
        path,
        reason: `rewrite -> ${dest}, which is not a file that ships`,
      };
    }
  }

  // 4 · nothing served it
  return {
    kind: "unreachable",
    path,
    reason: "no redirect, no file, no rewrite matched",
  };
}

/** Flatten a resolution to a yes/no, following redirects to their end. */
function isReachable(r: Resolution): boolean {
  if (r.kind === "file" || r.kind === "proxy") return true;
  if (r.kind === "redirect") return isReachable(r.then);
  return false;
}

function describeResolution(r: Resolution): string {
  if (r.kind === "file") return `file ${r.path}`;
  if (r.kind === "proxy") return `proxy ${r.destination}`;
  if (r.kind === "redirect") return `redirect -> ${r.to} => ${describeResolution(r.then)}`;
  return `UNREACHABLE (${r.reason})`;
}

// --------------------------------------------------------------------------
// 2 · WHAT THE APP ADVERTISES
// --------------------------------------------------------------------------

interface Advertised {
  url: string;
  path: string;
  origin: string; // which file advertised it
}

function toAdvertised(url: string, origin: string): Advertised | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  return { url, path: u.pathname, origin };
}

/**
 * ★ index.html is read from SOURCE, but the URLs that matter are the ones Vite
 * EMITS. Vite rewrites root-relative asset attributes through `base`, so the
 * source `href="/favicon.svg"` ships as `href="/app/favicon.svg"` (confirmed
 * against the live build). Absolute `https://` URLs in `content="..."` are NOT
 * touched by Vite and ship verbatim. This function therefore collects only the
 * absolute URLs, which are the ones that pass through unchanged — see LIMITS §5.
 */
function advertisedFromIndexHtml(): Advertised[] {
  const html = readFileSync(INDEX_HTML, "utf8");
  const out: Advertised[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/<link\s+rel="canonical"\s+href="([^"]+)"/i, "index.html rel=canonical"],
    [/<meta\s+property="og:image"\s+content="([^"]+)"/i, "index.html og:image"],
    [/<meta\s+name="twitter:image"\s+content="([^"]+)"/i, "index.html twitter:image"],
    [/<meta\s+property="og:url"\s+content="([^"]+)"/i, "index.html og:url"],
  ];
  for (const [re, origin] of patterns) {
    const m = html.match(re);
    if (m) {
      const a = toAdvertised(m[1], origin);
      if (a) out.push(a);
    }
  }
  return out;
}

function advertisedFromRobots(): Advertised[] {
  const file = join(PUBLIC_ROOT, "robots.txt");
  if (!existsSync(file)) return [];
  const out: Advertised[] = [];
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*Sitemap:\s*(\S+)/i);
    if (m) {
      const a = toAdvertised(m[1], "robots.txt Sitemap:");
      if (a) out.push(a);
    }
  }
  return out;
}

function advertisedFromSitemap(): Advertised[] {
  const file = join(PUBLIC_ROOT, "sitemap.xml");
  if (!existsSync(file)) return [];
  const xml = readFileSync(file, "utf8");
  const out: Advertised[] = [];
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    const a = toAdvertised(m[1], "sitemap.xml <loc>");
    if (a) out.push(a);
  }
  return out;
}

function advertisedFromLlms(): Advertised[] {
  const file = join(PUBLIC_ROOT, "llms.txt");
  if (!existsSync(file)) return [];
  const txt = readFileSync(file, "utf8");
  const out: Advertised[] = [];
  for (const m of txt.matchAll(/https?:\/\/[^\s<>")]+/gi)) {
    const a = toAdvertised(m[0].replace(/[.,]$/, ""), "llms.txt");
    if (a) out.push(a);
  }
  return out;
}

function allAdvertised(): Advertised[] {
  return [
    ...advertisedFromIndexHtml(),
    ...advertisedFromRobots(),
    ...advertisedFromSitemap(),
    ...advertisedFromLlms(),
  ];
}

/** Only our own host is this guard's business; third-party URLs are not ours to serve. */
function ownHost(a: Advertised): boolean {
  const h = new URL(a.url).hostname.toLowerCase();
  return h === PRODUCT_HOST || h === `www.${PRODUCT_HOST}`;
}

/**
 * ★★ QUARANTINE — paths this project ADVERTISES that DO NOT RESOLVE, recorded
 * rather than fixed, because which routes belong in a sitemap is the owner's
 * ruling and not a guard's.
 *
 * ★★ IT IS NOW EMPTY, AND THAT IS THE POINT — the self-cleaning mechanism worked.
 *
 * #613 quarantined three `sitemap.xml` <loc> entries that pointed at ROOT paths
 * for routes existing only under `/app/`. Measured live 2026-08-05 against
 * `www.lazytopper.com`, each returned 404 while its `/app/` twin returned 200:
 *
 *   /topic-hub                  404   ( /app/topic-hub                 200 )
 *   /highly-probable/10/Maths   404   ( /app/highly-probable/10/Maths  200 )
 *   /practice/10/Maths          404   ( /app/practice/10/Maths         200 )
 *
 * META-3 fixed the sitemap, so nothing advertises those three paths any more —
 * and the "quarantine may only contain paths something actually advertises"
 * assertion below went RED on the stale entries and demanded their deletion. The
 * exemption could not quietly outlive the defect. That is exactly the decay mode
 * this list was shaped to prevent, caught by its own guard on the first run.
 *
 * ⚠ KEEP THE MECHANISM. An empty Map costs nothing and the next owner-ruling-
 * pending defect has somewhere honest to live. Both assertions below still run.
 */
const QUARANTINE = new Map<string, string>([]);

// --------------------------------------------------------------------------
// 2b · THE ROUTE TABLE — the layer HTTP status cannot see
// --------------------------------------------------------------------------

/**
 * ★★★ WHY THIS SECTION EXISTS: "IT RETURNS 200" IS NOT "THE ROUTE EXISTS".
 *
 * LIMITS §8 of this file (see the bottom) named this as its biggest hole, proven
 * by mutation: #613 pointed a sitemap <loc> at `/app/this-route-does-not-exist`
 * and this guard stayed GREEN. It was not a modelling error — production returns
 * 200 there too. `/app/:path(.*) -> /app/index.html` means EVERY path under `/app/`
 * serves the SPA shell, so an HTTP check, a `resolvePath` check, and a live curl
 * all agree on 200 for a route that does not exist. Google would index an empty
 * shell and count it against the site.
 *
 * The only thing that can tell a real route from the shell is the ROUTE TABLE.
 * So this section reads `src/App.tsx` and resolves each advertised path against
 * the `<Route path="...">` declarations, using React Router's own `matchPath`.
 *
 * ★★ AND THE ROUTER HAS THE IDENTICAL TRAP ONE LAYER UP.
 * `<Route path="*" element={<HomeRedirect />} />` is a catch-all: ask React
 * Router "does /complete-nonsense match a route?" and the honest answer is YES.
 * A guard that used the raw route list would be exactly as blind as the HTTP
 * check it replaces — it would just fail one layer higher up. The catch-all is
 * therefore EXCLUDED from the matchable set, and the test below PROVES the
 * exclusion is load-bearing by asserting that `"*"` really does match nonsense.
 */

/**
 * ★ main.tsx: `<BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>`,
 * and `vite.config.ts` sets `base: "/app/"`. So the router's basename is `/app`
 * and every `<Route path>` in App.tsx is relative to it: the URL
 * `/app/exam-trends` is the route `/exam-trends`. This mirrors SERVED_PREFIX and
 * is derived from the same vite `base` — they move together or both are wrong.
 */
const ROUTER_BASENAME = SERVED_PREFIX;

/**
 * ★ THE HOST THE CDN ACTUALLY SERVES, recorded as a MEASUREMENT, not derived.
 *
 * The apex-to-www 308 is a Vercel *dashboard* rule — it runs before `vercel.json`
 * and is invisible to this repo (LIMITS §2). So this constant cannot be computed
 * from anything checked in; it is an observation, and it is written down here
 * with the observation attached so the next reader can re-run it rather than
 * trust it. Measured 2026-08-05, `curl -sL -o /dev/null -w '%{num_redirects}'`:
 *
 *     https://lazytopper.com/         200, 2 redirects -> www.lazytopper.com/app/
 *     https://www.lazytopper.com/     200, 1 redirect  -> www.lazytopper.com/app/
 *     https://www.lazytopper.com/app/ 200, 0 redirects
 */
const CANONICAL_HOST = `www.${PRODUCT_HOST}`;

/**
 * Comments removed, for ROUTE COUNTING ONLY.
 *
 * ⚠ THIS IS NOT OPTIONAL TIDYING — IT IS THE DIFFERENCE BETWEEN A REAL AND A
 * PHANTOM ROUTE. App.tsx's own header prose says "alongside their <Route>
 * entries below", and a naive scan counts that sentence as a route. The first
 * run of this guard found exactly that: 51 `<Route` occurrences, 50 real ones.
 *
 * A phantom route is the DANGEROUS direction of error. A missed route makes a
 * live URL look dead — loud, and someone fixes it. A phantom route invented from
 * a comment could make a DEAD <loc> look alive, which is the precise failure this
 * whole section exists to prevent.
 *
 * The stripper is crude on purpose: it never has to preserve semantics, only to
 * stop prose from being read as JSX. The `[^:]` guard keeps `https://` intact so
 * a URL in a string literal is not mistaken for a line comment.
 */
function stripComments(src: string): string {
  return src
    // Block comments, including the JSX `{/* … */}` form.
    //
    // ⚠⚠ THE `(^|[\s{])` PREFIX IS LOAD-BEARING, AND IT WAS LEARNED THE HARD WAY.
    // Without it, the ROUTE PATH `"/login/*"` contains a literal `/*` that opens a
    // fake block comment, which then runs to the next `*/` and swallows every
    // route in between. Measured on the first attempt: 12 real routes silently
    // deleted, and `/app/pricing` — a URL this very sitemap advertises — reported
    // as a dead route. A real block comment is always preceded by start-of-line,
    // whitespace, or `{`; `/login/*` is preceded by `n`.
    .replace(/(^|[\s{])\/\*[\s\S]*?\*\//gm, "$1")
    // Line comments. The `[^:]` guard keeps `https://` inside a string literal
    // from being read as one.
    .replace(/(^|[^:])\/\/[^\n]*/gm, "$1");
}

/**
 * Every `path="..."` literal declared on a `<Route>` element.
 *
 * ⚠ A STATIC PARSE, deliberately. Importing App.tsx would drag in ~80 lazy page
 * modules, Firebase, and a DOM. Two rules keep it honest:
 *
 *   - `<Route` must be followed by WHITESPACE. A real element always has
 *     attributes after it; the prose form `<Route>` does not. Combined with the
 *     comment strip above, this is what separates elements from sentences.
 *   - the caller pins `paths.length === routeTags`, so a `<Route>` this parser
 *     cannot read is RED rather than silently absent.
 *
 * ★ Pure and exported-by-argument so the test below can run it on a fixture. A
 * parser only ever exercised on the real file cannot be shown to reject anything.
 */
function parseRoutePaths(src: string): { paths: string[]; routeTags: number } {
  const chunks = stripComments(src).split(/<Route(?=\s)/).slice(1);
  const paths: string[] = [];
  for (const chunk of chunks) {
    // Stop at `element=`: a <Route>'s path is always its first attribute in this
    // file, and cutting there stops a nested <Route> inside an element prop from
    // leaking its path into the parent's slot.
    const head = chunk.split(/\belement\s*=/)[0];
    const m = head.match(/\bpath="([^"]+)"/);
    if (m) paths.push(m[1]);
  }
  return { paths, routeTags: chunks.length };
}

function declaredRoutePaths(): { paths: string[]; routeTags: number } {
  return parseRoutePaths(readFileSync(APP_TSX, "utf8"));
}

/** The catch-all, which matches everything and therefore proves nothing. */
const CATCH_ALL = "*";

/** Route patterns a URL may legitimately resolve to. `"*"` is NOT one of them. */
function matchableRoutePatterns(): string[] {
  return declaredRoutePaths().paths.filter((p) => p !== CATCH_ALL);
}

/** URL path -> router path. `/app/` is the router's `/`. Null if outside the basename. */
function toRouterPath(urlPath: string): string | null {
  if (urlPath === ROUTER_BASENAME) return "/";
  if (!urlPath.startsWith(`${ROUTER_BASENAME}/`)) return null;
  const rest = urlPath.slice(ROUTER_BASENAME.length);
  return rest === "/" ? "/" : rest;
}

interface RouteVerdict {
  ok: boolean;
  routerPath: string | null;
  pattern?: string;
  reason?: string;
}

function resolveAgainstRouteTable(urlPath: string): RouteVerdict {
  const routerPath = toRouterPath(urlPath);
  if (routerPath === null) {
    return {
      ok: false,
      routerPath: null,
      reason:
        `"${urlPath}" is outside the router basename "${ROUTER_BASENAME}" — no ` +
        `<Route> can ever match it, whatever the CDN returns`,
    };
  }
  for (const pattern of matchableRoutePatterns()) {
    if (matchPath(pattern, routerPath)) return { ok: true, routerPath, pattern };
  }
  return {
    ok: false,
    routerPath,
    reason:
      `no <Route path> in src/App.tsx matches "${routerPath}". The "${CATCH_ALL}" ` +
      `catch-all is deliberately excluded: it matches everything, so counting it ` +
      `would make a dead route look alive — the exact defect this check exists for`,
  };
}

/**
 * ★★ THE STATIC-PAGE ESCAPE, AND WHY THE ROUTE CHECK NEEDS ONE (ENGINE-0).
 *
 * The route-table check above exists for ONE stated reason:
 * `/app/:path(.*) -> /app/index.html` makes EVERY path under `/app/` return the SPA
 * shell, so a 200 proves nothing and only React Router's table can tell a real
 * route from an empty shell.
 *
 * That reasoning is about the SHELL. It does not reach a URL that resolves to a
 * REAL STATIC FILE, because there is no shell in the picture: the bytes on the
 * wire ARE the page. ENGINE-0 shipped exactly that — pre-rendered question pages
 * under `public/questions/**`, reached at the root through a dedicated rewrite,
 * whose entire purpose was to be readable by a crawler that runs no JavaScript.
 *
 * ★★ THAT ARC WAS RETIRED (RETIRE-1). The pages, the rewrite and the sitemap
 * entry are all gone, so nothing is classified as a static page today and the
 * loop below iterates an EMPTY list — honestly, not vacuously: no assertion here
 * ever required it to be non-empty. The escape is KEPT because it is generic,
 * keying on "a real file that is not the SPA shell" rather than on any URL
 * prefix, and the notes route that supersedes the arc is expected to be
 * pre-rendered in the same way. Such a URL has no
 * `<Route>` and must never have one; demanding it prove otherwise would be this
 * check firing outside the defect it was built for.
 *
 * ⚠ THE EXEMPTION IS DELIBERATELY NARROW, AND THE SECOND CLAUSE IS THE WHOLE
 * POINT. Without `!== /app/index.html`, every SPA path would qualify — the
 * catch-all rewrite lands them all on index.html as `kind: "file"` — and this
 * one function would exempt the entire site, re-opening LIMITS §8 in a single
 * line. It returns true ONLY for a file that is not the shell.
 */
function servedAsStaticPage(urlPath: string): boolean {
  const r = resolvePath(urlPath);
  return r.kind === "file" && r.path !== `${SERVED_PREFIX}/index.html`;
}

// --------------------------------------------------------------------------
// 3 · THE ASSERTIONS
// --------------------------------------------------------------------------

describe("crawler reachability — every URL the app advertises resolves to something served", () => {
  it("the resolver is not dead — it distinguishes served from unserved, and filesystem beats rewrite", () => {
    // ★ A CONTROL. Without this, a resolver that returned "reachable" for
    // everything would sit green forever and this whole file would assert nothing.

    // Known-served: a real file under the served prefix.
    expect(resolvePath("/app/robots.txt").kind).toBe("file");

    // ★ FILESYSTEM BEATS REWRITE. `/app/:path(.*) -> /app/index.html` would swallow
    // this if rewrites ran first. It resolves to the real file, matching the live
    // deployment, which returns text/plain robots content at that URL.
    const robots = resolvePath("/app/robots.txt");
    expect(robots.kind === "file" && robots.path).toBe("/app/robots.txt");

    // The SPA catch-all still works for a route with no file behind it.
    const spa = resolvePath("/app/some-client-route");
    expect(spa.kind === "file" && spa.path).toBe("/app/index.html");

    // Known-UNSERVED: proves the resolver can actually say no.
    expect(resolvePath("/definitely-not-a-real-path").kind).toBe("unreachable");
    expect(isReachable(resolvePath("/definitely-not-a-real-path"))).toBe(false);

    // The external proxies resolve as proxies, not as files or 404s.
    expect(resolvePath("/api/health").kind).toBe("proxy");
    expect(resolvePath("/shared-api/anything").kind).toBe("proxy");
  });

  it("the extractors are not dead — each source really yields the URLs it should", () => {
    // A reachability check over an EMPTY list of advertised URLs passes vacuously.
    // Name the subject on every run, green included.
    const ads = allAdvertised();
    // eslint-disable-next-line no-console
    console.log(
      `CRAWLER_REACHABILITY_SCOPE: advertised=${ads.length} ` +
        `served_files=${servedFiles().size} quarantined=${QUARANTINE.size} ` +
        `sources=index.html,robots.txt,sitemap.xml,llms.txt`,
    );

    expect(advertisedFromIndexHtml().length, "no absolute URLs found in index.html").toBeGreaterThan(0);
    expect(advertisedFromRobots().length, "robots.txt advertises no Sitemap:").toBeGreaterThan(0);
    expect(advertisedFromSitemap().length, "sitemap.xml yielded no <loc>").toBeGreaterThan(0);
    expect(advertisedFromLlms().length, "llms.txt yielded no URLs").toBeGreaterThan(0);

    // Every advertised URL must be on our own host — a URL we do not serve is one
    // we cannot make resolve.
    for (const a of ads) {
      expect(ownHost(a), `${a.origin} advertises a foreign host: ${a.url}`).toBe(true);
    }
  });

  it("★ THE POINT — the four crawler-facing files resolve AT THE ROOT, where crawlers look", () => {
    // Crawlers fetch these from `/` by protocol and never look under `/app/`.
    // Before this lane all four were 404 at the root while their `/app/` twins
    // returned 200 — correct files on an unreachable path.
    for (const p of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/favicon.svg"]) {
      const r = resolvePath(p);
      expect(
        isReachable(r),
        `${p} does not resolve — crawlers fetch this from the site ROOT and will ` +
          `never look under ${SERVED_PREFIX}/. Resolution: ${describeResolution(r)}`,
      ).toBe(true);
    }
  });

  it("every advertised URL resolves, except the quarantined ones", () => {
    const broken: string[] = [];
    for (const a of allAdvertised()) {
      if (!ownHost(a)) continue;
      if (QUARANTINE.has(a.path)) continue;
      const r = resolvePath(a.path);
      if (!isReachable(r)) {
        broken.push(`  ${a.origin}  ${a.url}\n      ${describeResolution(r)}`);
      }
    }
    expect(
      broken,
      `the app advertises ${broken.length} URL(s) that nothing serves. A correct ` +
        `string pointing at a path that 404s is this project's most-repeated ` +
        `defect:\n${broken.join("\n")}`,
    ).toEqual([]);
  });

  it("⚠ the quarantine is honest and self-cleaning — every entry is still genuinely broken", () => {
    // ★ A quarantine nobody re-checks becomes a permanent exemption, which is
    // exactly how the previous guards decayed into passing on a broken tree.
    const stale: string[] = [];
    for (const [path, why] of QUARANTINE) {
      if (isReachable(resolvePath(path))) {
        stale.push(`  ${path} — recorded as broken (${why}) but now RESOLVES`);
      }
    }
    expect(
      stale,
      `${stale.length} quarantine entr(y/ies) are stale — the path now resolves, so ` +
        `delete the entry from QUARANTINE and let the real assertion cover it:\n${stale.join("\n")}`,
    ).toEqual([]);

    // And the quarantine may only contain paths something actually advertises —
    // otherwise it silently accumulates entries for URLs nobody references.
    const advertisedPaths = new Set(allAdvertised().map((a) => a.path));
    for (const path of QUARANTINE.keys()) {
      expect(
        advertisedPaths.has(path),
        `${path} is quarantined but nothing advertises it — delete the entry`,
      ).toBe(true);
    }
  });

  it("★★ the load-bearing backend proxies are present and unshadowed", () => {
    // `/api/*` and `/shared-api/*` proxy the live backend. A new rewrite placed
    // above them, or a literal rule that captured their prefix, would take the
    // product down. Assert both still resolve as proxies AND that nothing earlier
    // in the array claims them.
    const { rewrites } = readVercelConfig();
    for (const probe of ["/api/health", "/shared-api/anything"]) {
      const firstMatch = rewrites.find((w) => matchSource(w.source, probe) !== null);
      expect(firstMatch, `no rewrite matches ${probe}`).toBeDefined();
      expect(
        /^https?:\/\//.test((firstMatch as Rule).destination),
        `${probe} is claimed by "${(firstMatch as Rule).source}" -> ` +
          `"${(firstMatch as Rule).destination}", which is not the external backend ` +
          `proxy. A rewrite is shadowing the API.`,
      ).toBe(true);
    }
  });

  it("★★ the /app/ catch-all matches a TRAILING SLASH — the (.*) form, not :path*", () => {
    // SLASH-1. `/app/:path*` compiles to SEGMENTS and does not match a path ending
    // in "/", so every SPA deep link 404d when written with a trailing slash.
    // Measured live 2026-08-31 on www.lazytopper.com: /app/pricing/ and
    // /app/exam-trends/ — two of this domain's three indexable URLs — both 404,
    // while their slashless twins returned 200. The cure is the SAME construction
    // first proven live by the `/questions/:path(.*)` rewrite shipped in #714. That
    // rewrite has since been removed with the static arc (RETIRE-1), but the `(.*)`
    // form it validated is exactly what the `/app/` catch-all below still relies on.
    //
    // ★ The destination could not have been at fault: `/app/index.html` is a
    // LITERAL, always-present file that cannot fail to resolve. If the destination
    // cannot fail and the request still 404s, the SOURCE is what failed to match.
    const { rewrites } = readVercelConfig();
    const appRule = rewrites.find((w) => w.destination === "/app/index.html");
    expect(appRule, "the /app/ catch-all rewrite is gone").toBeDefined();
    expect(
      (appRule as Rule).source,
      "the /app/ catch-all must use the (.*) form — `:path*` does not match a trailing slash",
    ).toBe("/app/:path(.*)");

    // ★ RED/GREEN: with `:path*` these three resolve nowhere at all.
    for (const probe of ["/app/pricing/", "/app/exam-trends/", "/app/practice/"]) {
      const r = resolvePath(probe);
      expect(
        r.kind === "file" && r.path,
        `${probe} must resolve to the SPA shell`,
      ).toBe("/app/index.html");
    }

    // ★ CONTROL — the slashless twins already worked and must NOT regress. Without
    // this, a rule that matched nothing would still fail the loop above for the
    // wrong reason, and a rule that matched everything would look like a fix.
    for (const probe of ["/app/pricing", "/app/exam-trends", "/app/practice"]) {
      const r = resolvePath(probe);
      expect(r.kind === "file" && r.path, `CONTROL ${probe} regressed`).toBe(
        "/app/index.html",
      );
    }
  });
});

describe("route reachability — every advertised URL names a REAL route, not just a 200", () => {
  it("★★ THE CONTROL — the catch-all really does match nonsense, which is why it is excluded", () => {
    // ★ THIS IS THE LOAD-BEARING TEST OF THIS WHOLE SECTION. If `"*"` did NOT
    // match everything, excluding it would be decoration and the route check
    // below would be passing for the wrong reason. Assert the trap is real
    // BEFORE relying on the defence against it.
    expect(
      matchPath(CATCH_ALL, "/complete-nonsense-no-route-exists"),
      `<Route path="${CATCH_ALL}"> is expected to match ANY path — that is why ` +
        `matchableRoutePatterns() drops it. If this is null, React Router changed ` +
        `and the exclusion may no longer be needed.`,
    ).not.toBeNull();

    // And the catch-all is genuinely present in App.tsx, or the exclusion is
    // guarding against something that no longer exists.
    expect(declaredRoutePaths().paths, "App.tsx no longer declares a catch-all route")
      .toContain(CATCH_ALL);

    // ★ THE RESOLVER SAYS NO. Without the exclusion this would be `true`, and
    // this file would repeat the HTTP-200 blindness one layer up.
    const nonsense = resolveAgainstRouteTable("/app/complete-nonsense-no-route-exists");
    expect(
      nonsense.ok,
      `a path with no <Route> behind it must NOT resolve. It returns HTTP 200 in ` +
        `production (SPA shell) — that is precisely why status code is not evidence.`,
    ).toBe(false);

    // ★ AND IT SAYS YES to real ones, or "no" would be a resolver that rejects
    // everything — the mirror-image dead test.
    expect(resolveAgainstRouteTable("/app/").ok, "/app/ is the router's own /").toBe(true);
    expect(resolveAgainstRouteTable("/app/pricing").ok).toBe(true);
    expect(resolveAgainstRouteTable("/app/exam-trends").ok).toBe(true);
    // A parameterised route matches through its params, not by literal spelling.
    expect(resolveAgainstRouteTable("/app/highly-probable/10/Maths").ok).toBe(true);

    // Outside the basename nothing can match, whatever the CDN does with it.
    expect(resolveAgainstRouteTable("/exam-trends").ok, "root paths are not routes").toBe(false);
  });

  it("the route-table PARSER is not dead — it reads elements and rejects prose", () => {
    // ★ RUN IT ON A FIXTURE, NOT ONLY ON THE REAL FILE. A parser exercised solely
    // against App.tsx can be shown to accept, never to reject — and "rejects a
    // route that is not there" is the half this guard's correctness rests on.
    const fixture = [
      '// see their <Route> entries below — prose, NOT a route',
      '{/* a JSX comment mentioning <Route path="/ghost" /> */}',
      '/* a block comment with <Route path="/phantom" /> */',
      '<Routes>',
      '  <Route path="/real" element={<A />} />',
      // ★ THE `/*` TRAP, PINNED. This path contains a literal `/*`. A comment
      // stripper that treats it as the start of a block comment eats every route
      // after it until the next `*/` — which is what happened, costing 12 routes.
      '  <Route path="/login/*" element={<L />} />',
      '  <Route',
      '    path="/multi/:line"',
      '    element={<B />}',
      '  />',
      '  <Route path="*" element={<C />} />',
      '</Routes>',
    ].join("\n");
    const fx = parseRoutePaths(fixture);
    expect(fx.paths, "parser read prose or a comment as a route").toEqual([
      "/real",
      "/login/*",
      "/multi/:line",
      "*",
    ]);
    expect(fx.routeTags, "element count and path count must agree").toBe(4);
    // And explicitly: neither commented-out route leaked in. A phantom route is
    // the direction that makes a DEAD <loc> look alive.
    expect(fx.paths).not.toContain("/ghost");
    expect(fx.paths).not.toContain("/phantom");
    // `<Routes>` is not a `<Route>`.
    expect(parseRoutePaths("<Routes></Routes>").routeTags).toBe(0);

    const { paths, routeTags } = declaredRoutePaths();

    // eslint-disable-next-line no-console
    console.log(
      `ROUTE_TABLE_SCOPE: source=src/App.tsx route_tags=${routeTags} ` +
        `paths=${paths.length} matchable=${matchableRoutePatterns().length} ` +
        `basename=${ROUTER_BASENAME} excluded=${JSON.stringify([CATCH_ALL])}`,
    );

    // A zero-route table would make every <loc> fail loudly rather than silently,
    // but a HALF-read table is the dangerous shape: it fails only the routes it
    // missed. Pin that every <Route tag yielded a path.
    expect(routeTags, "no <Route> elements found in App.tsx — the parse is broken")
      .toBeGreaterThan(30);
    expect(
      paths.length,
      `${routeTags} <Route> tags but only ${paths.length} path attributes parsed — ` +
        `an attribute order this parser does not handle. Fix declaredRoutePaths().`,
    ).toBe(routeTags);

    // Name the subject: prove the parse reaches literal, parameterised and
    // splat forms, and both single-line and multi-line <Route> declarations.
    for (const mustFind of [
      "/",                              // single-line literal
      "/pricing",                       // the route this sitemap advertises
      "/exam-trends",                   // multi-line declaration
      "/topic-hub/:grade/:subject",     // parameterised
      "/login/*",                       // a real route that happens to use a splat
      CATCH_ALL,                        // the trap
    ]) {
      expect(paths, `route table is missing ${mustFind}`).toContain(mustFind);
    }
  });

  it("★★ THE POINT — every sitemap <loc> maps to a registered route, not just to a 200", () => {
    const locs = advertisedFromSitemap();

    // Non-vacuous: a sitemap that parsed to zero <loc> would pass everything below.
    expect(locs.length, "sitemap.xml yielded no <loc> — this check would be vacuous")
      .toBeGreaterThan(0);

    const dead: string[] = [];
    const staticPages: string[] = [];
    const routed: string[] = [];
    for (const a of locs) {
      // ★ ENGINE-0: a <loc> served as a real static file is content in itself and
      // has no route to name. Classified, not waved through — and COUNTED below,
      // so the split is visible on a green run instead of silently absorbing a
      // URL that stopped resolving.
      if (servedAsStaticPage(a.path)) {
        staticPages.push(a.url);
        continue;
      }
      const v = resolveAgainstRouteTable(a.path);
      if (v.ok) routed.push(a.url);
      else dead.push(`  ${a.url}\n      ${v.reason}`);
    }
    // eslint-disable-next-line no-console
    console.log(
      `SITEMAP_LOC_CLASSIFICATION: total=${locs.length} routed=${routed.length} ` +
        `static_pages=${staticPages.length} dead=${dead.length} ` +
        `static=${JSON.stringify(staticPages)}`,
    );
    // ★ THE ESCAPE CANNOT BECOME A BLANKET. Every static <loc> must be a file that
    // is NOT the SPA shell — assert it a second way, from the resolution itself,
    // so a future change that made `servedAsStaticPage` return true for shell
    // paths goes red here rather than quietly exempting the whole sitemap.
    for (const url of staticPages) {
      const r = resolvePath(new URL(url).pathname);
      expect(
        r.kind === "file" && r.path !== `${SERVED_PREFIX}/index.html`,
        `${url} was classified as a pre-rendered static page, but it resolves as ` +
          `${describeResolution(r)}. Only a real file that is not the SPA shell may ` +
          `skip the route check.`,
      ).toBe(true);
    }
    expect(
      dead,
      `${dead.length} sitemap URL(s) do not correspond to any route in App.tsx. ` +
        `Every one of them still returns HTTP 200 — the SPA shell — so no status ` +
        `check will ever find them. Google indexes an empty page:\n${dead.join("\n")}`,
    ).toEqual([]);

    // ⚠ AND THE HOST. A <loc> on the apex costs every crawler a redirect hop,
    // and a sitemap whose URLs are on a different host from the sitemap file is
    // cross-submission, which Google discards unless both hosts are verified.
    for (const a of locs) {
      expect(
        new URL(a.url).hostname,
        `sitemap <loc> ${a.url} is not on the served host — the apex 308s to www`,
      ).toBe(CANONICAL_HOST);
    }
  });

  it("★ the canonical names a real route on the host the site actually serves", () => {
    const canonical = advertisedFromIndexHtml().find((a) => a.origin.includes("canonical"));
    expect(canonical, "index.html has no <link rel=canonical>").toBeDefined();
    const c = canonical as Advertised;

    // Host: the apex redirects, so an apex canonical names a URL that 30x-es.
    expect(
      new URL(c.url).hostname,
      `canonical is ${c.url}; the apex 308s to ${CANONICAL_HOST}, so this names a ` +
        `URL that redirects. A canonical is a directive — it must name the ` +
        `destination, not the doorway.`,
    ).toBe(CANONICAL_HOST);

    // Path: `/` is a 307 to `/app/` in vercel.json, so the redirect half of this
    // IS derivable from the repo — assert it from the model rather than pinning
    // a string, so a routing change moves the verdict with it.
    const r = resolvePath(c.path);
    expect(
      r.kind,
      `canonical path "${c.path}" resolves as: ${describeResolution(r)}. A canonical ` +
        `must name its final destination; this one redirects.`,
    ).not.toBe("redirect");
    expect(isReachable(r), `canonical does not resolve: ${describeResolution(r)}`).toBe(true);

    // And it must be a real route, not the SPA shell standing in for one.
    const v = resolveAgainstRouteTable(c.path);
    expect(v.ok, `canonical ${c.url} does not map to a route: ${v.reason}`).toBe(true);
  });

  it("robots.txt's Sitemap: line is host-consistent with the <loc> entries", () => {
    const sitemapLines = advertisedFromRobots();
    expect(sitemapLines.length, "robots.txt advertises no Sitemap:").toBeGreaterThan(0);
    const locs = advertisedFromSitemap();
    expect(locs.length, "sitemap.xml yielded no <loc>").toBeGreaterThan(0);

    const bare = (h: string) => h.toLowerCase().replace(/^www\./, "");
    const sitemapHost = new URL(sitemapLines[0].url).hostname;
    const locHosts = [...new Set(locs.map((a) => new URL(a.url).hostname))];

    // ★ NAME THE HOSTS ON EVERY RUN, GREEN INCLUDED. Google treats apex and www as
    // DIFFERENT hosts, and a sitemap fetched at one host listing URLs on another is
    // a cross-submission it discards unless both are Search-Console-verified. Both
    // sides are on www as of CRAWL-1; printing them keeps a regression visible.
    // eslint-disable-next-line no-console
    console.log(
      `SITEMAP_HOST_CONSISTENCY: robots_sitemap_host=${sitemapHost} ` +
        `loc_hosts=${JSON.stringify(locHosts)} ` +
        `exact_match=${locHosts.every((h) => h === sitemapHost)} ` +
        `registrable_match=${locHosts.every((h) => bare(h) === bare(sitemapHost))}`,
    );

    for (const h of locHosts) {
      expect(
        h,
        `sitemap <loc> host "${h}" and robots.txt Sitemap: host "${sitemapHost}" are ` +
          `different hosts. Google will not accept a sitemap that indexes a host ` +
          `it was not served from, and apex/www are different hosts to it.`,
      ).toBe(sitemapHost);
    }
  });
});

describe("crawl control — the sitemap's freshness signal and the IndexNow key file", () => {
  // The IndexNow protocol identifies the key by the FILENAME and verifies it by
  // the CONTENTS: the file must be named <key>.txt and contain exactly <key>.
  // Deriving the expectation from the filename is the whole point — a hardcoded
  // key compared against itself would pass while the file on disk disagreed.
  const KEY_FILE = /^[0-9a-f]{32}\.txt$/;

  it("★ the IndexNow key file exists, and its contents are exactly its filename stem", () => {
    const keys = readdirSync(PUBLIC_ROOT).filter((f) => KEY_FILE.test(f));
    expect(
      keys.length,
      `expected exactly one IndexNow key file (<32-hex>.txt) in public/, found ` +
        `${keys.length}. Bing verifies ownership by fetching this file.`,
    ).toBe(1);

    const name = keys[0];
    const stem = name.replace(/\.txt$/, "");
    const body = readFileSync(join(PUBLIC_ROOT, name), "utf8");
    expect(
      body,
      `IndexNow key file "${name}" must contain exactly its own stem and nothing ` +
        `else — no newline, no BOM, no trailing whitespace. Bing compares the two ` +
        `byte-for-byte and rejects the key otherwise. Got ${JSON.stringify(body)}.`,
    ).toBe(stem);
  });

  it("★★ the IndexNow key file RESOLVES AT THE ROOT — public/ ships under /app/, so this needs a rewrite", () => {
    // THE DEFECT THIS FILE EXISTS FOR, one more time. Vite's base is "/app/", so a
    // file dropped in public/ is served at /app/<name> and is 404 at the root.
    // IndexNow fetches the key from the ROOT by protocol and never looks under
    // /app/ — so without a vercel.json rewrite the key is correct and unreachable.
    const keys = readdirSync(PUBLIC_ROOT).filter((f) => KEY_FILE.test(f));
    expect(keys.length, "no IndexNow key file — the check below would be vacuous").toBe(1);

    const r = resolvePath(`/${keys[0]}`);
    expect(
      isReachable(r),
      `/${keys[0]} does not resolve at the site root. IndexNow fetches the key ` +
        `from the root and will never look under ${SERVED_PREFIX}/. ` +
        `Resolution: ${describeResolution(r)}`,
    ).toBe(true);
  });

  it("★ every sitemap <loc> carries a <lastmod>, and no <changefreq> or <priority>", () => {
    const xml = readFileSync(join(PUBLIC_ROOT, "sitemap.xml"), "utf8");

    const locCount = [...xml.matchAll(/<loc>/gi)].length;
    expect(locCount, "sitemap.xml yielded no <loc> — these checks would be vacuous")
      .toBeGreaterThan(0);

    const lastmods = [...xml.matchAll(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/gi)].map((m) => m[1]);
    expect(
      lastmods.length,
      `${locCount} <loc> but ${lastmods.length} <lastmod>. Google reads <lastmod> ` +
        `and ignores <changefreq>/<priority>; a sitemap without it gives the ` +
        `crawler no reason to revisit.`,
    ).toBe(locCount);

    for (const d of lastmods) {
      expect(d, `<lastmod> "${d}" is not a W3C date (YYYY-MM-DD)`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(
        Date.parse(d) <= Date.now(),
        `<lastmod> "${d}" is in the future — a fabricated freshness signal is worse ` +
          `than none, and Google discounts the whole sitemap for it.`,
      ).toBe(true);
    }

    expect(
      /<changefreq>/i.test(xml),
      "sitemap.xml still declares <changefreq>; Google ignores it — drop it.",
    ).toBe(false);
    expect(
      /<priority>/i.test(xml),
      "sitemap.xml still declares <priority>; Google ignores it — drop it.",
    ).toBe(false);
  });
});

/* ------------------------------------------------------------------------- *
 * ★ LIMITS — WHAT THIS GUARD CANNOT CATCH
 *
 * This is a STATIC model. It reads the repo and reasons about it. It never opens
 * a socket. That is deliberate — a test that fetches production cannot run on a
 * PR before deploy, and would be flaky when it did — but it means all of the
 * following are outside its reach:
 *
 * 1. IT CANNOT PROVE VERCEL BEHAVES THE WAY IT MODELS. `matchSource` and
 *    `resolvePath` are this file's reading of Vercel's documented order
 *    (redirects -> filesystem -> rewrites, first match wins). If Vercel changes
 *    that order, or interprets a pattern differently, the guard stays green while
 *    production breaks. ONLY A DEPLOYED FETCH PROVES ROUTING.
 *
 * 2. IT CANNOT SEE DASHBOARD-LEVEL ROUTING. Vercel project-level routing rules,
 *    domain redirects and firewall rules are configured outside the repo and run
 *    BEFORE `vercel.json`. The apex-to-www 308 on this very domain is one of
 *    them and is invisible here.
 *
 * 3. IT READS `public/`, NOT `dist/`. It asserts what SHOULD ship. If the build
 *    fails to copy `public/` into the output, every assertion here still passes.
 *
 * 4. IT CANNOT TELL WHETHER THE PROXY TARGET IS UP. `/api/*` resolving to a
 *    Railway URL is checked as a rewrite, never as a reachable backend.
 *
 * 5. IT MODELS VITE'S `base` REWRITING RATHER THAN OBSERVING IT. Root-relative
 *    attributes in `index.html` are rewritten through `base` at build time and are
 *    deliberately NOT collected here, only absolute `https://` URLs are. If Vite
 *    stopped applying `base`, this guard would not notice.
 *
 * 6. IT CHECKS PATHS, AND NOW ALSO PINS ONE HOST — BUT THE PIN IS AN OBSERVATION.
 *    ★ NARROWED BY META-3. `CANONICAL_HOST` pins the canonical and every <loc> to
 *    `www.lazytopper.com`, so a canonical naming a 308-ing host is now RED. But
 *    that host is a MEASURED CONSTANT, not a derived one — the apex-to-www rule
 *    lives in the Vercel dashboard (§2), so if the CDN's canonical host ever
 *    changes, this file will keep asserting the old one and go red for the wrong
 *    reason. It is a pinned observation with its curl output written beside it.
 *
 * 7. IT CANNOT JUDGE SEMANTICS. A canonical pointing at the wrong-but-existing
 *    page, or a sitemap listing a real page nobody should index, resolves fine
 *    and passes. ⚠ In particular NOTHING HERE CHECKS GATING: `/highly-probable/
 *    :grade/:subject` is a real route wrapped in `RequirePremium`, so it would
 *    satisfy every assertion in this file while showing a crawler a paywall. Which
 *    routes belong in a sitemap remains the owner's ruling, not a guard's.
 *
 * 8. ★★ CLOSED BY META-3 — THE SPA CATCH-ALL NO LONGER HIDES A DEAD ROUTE.
 *    This entry previously read: `/app/:path* -> /app/index.html` means a typo'd
 *    or retired route resolves to the shell and passes, verified by a mutation
 *    that pointed a <loc> at `/app/this-route-does-not-exist` and left this file
 *    GREEN. Section 2b closes it by resolving each advertised path against
 *    `src/App.tsx`'s `<Route>` table with React Router's own `matchPath`, with
 *    the `"*"` catch-all excluded — the identical trap one layer up, and the
 *    control test asserts that catch-all really does match nonsense so the
 *    exclusion cannot become decoration.
 *
 *    ⚠ WHAT THE ROUTE CHECK STILL CANNOT DO:
 *      a. It is a STATIC PARSE of `<Route path="...">` string literals. A route
 *         built from a variable, spread, or generated in a loop is invisible to
 *         it — such a route would read as DEAD and go red, which is the safe
 *         direction, but it is still a false positive someone must then debug.
 *      b. It proves a route is REGISTERED, not that it RENDERS. A route whose
 *         lazy chunk throws, or which redirects onward, or which renders an
 *         honest empty state, passes here and serves a crawler nothing.
 *      c. It reads App.tsx ONLY. A nested `<Routes>` declared inside a page
 *         component is not in this table.
 *      d. `matchPath` is the matcher, but the RANKING is React Router's and is
 *         not modelled: this asks "does any route match", not "which route wins".
 *         Two routes declaring the same path (App.tsx currently declares
 *         `/topic-hub` twice) are indistinguishable here.
 *
 * 9. (RESOLVED BY CRAWL-1 — NOT A LIMIT ANY MORE.) The `Sitemap:` host is now
 *    pinned EXACTLY — robots.txt and every <loc> are on www, the check asserts
 *    strict host equality, and the registrable-domain fallback is GONE (`bare()`
 *    survives only in the diagnostic line). [FU-ROBOTS-SITEMAP-WWW-HOST] CLOSED.
 * ------------------------------------------------------------------------- */
