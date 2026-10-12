/**
 * SOFT404-1 — THE ROUTER'S PATHS, AS `vercel.json` REWRITES.
 *
 * Before this module `vercel.json` sent EVERY path that is not a file to `/__shell.html`
 * (HTTP 200), so `/this-does-not-exist-xyz` and `/llms-full.txt` were "Soft 404"s. Now only
 * the paths the app ROUTES are sent to the shell; anything else falls through to
 * `public/404.html` with HTTP 404.
 *
 * ★ ONE SOURCE OF TRUTH: the `<Route path="…">` literals in `src/App.tsx`. This module reads
 * that text (it never imports the file: App.tsx drags in ~80 lazy pages, Firebase and a DOM)
 * and emits one rewrite per path. `scripts/seo/writeVercelRewrites.ts --write` puts them in
 * `vercel.json`; `soft404Routes.guard.test.ts` fails if `vercel.json` differs from this
 * output, so adding a route to the router can never silently 404 it, and a hand edit of the
 * generated rules cannot survive CI.
 *
 * ★ THE `<Route` PARSER IS THE SAME ONE `crawlerReachability.guard` USES, WITH THE SAME TWO
 * SAFEGUARDS: comments are stripped first (App.tsx's prose says "alongside their <Route>
 * entries" and `/login/*` contains a literal `/*`), and `paths.length === routeTags` is
 * asserted by the caller, so a `<Route>` this parser cannot read is RED rather than absent.
 *
 * ★ CASE. Vercel matches `source` case-SENSITIVELY; React Router matches case-INSENSITIVELY,
 * and production serves `/PRICING` (the shell, 200) today. "Every routed path keeps today's
 * behaviour" therefore needs each static letter as a `[Pp]` class. Parameters are `[^/]+`
 * (one segment, as React Router's `:param`), a trailing `*` is `(?:/.*)?`, and an optional
 * trailing slash is allowed (React Router ignores it).
 *
 * Only `:path(<regex>)` is emitted, because the guard's model of Vercel's matcher
 * (`crawlerReachability.guard`) understands literal, `:p`, `:p*` and `:p(pattern)` only,
 * and the regex never contains a capturing group.
 */

/** Where every routed path is sent. Built by `applyPrerendered` as a clean copy of the shell. */
export const SHELL_DESTINATION = "/__shell.html";

/** The router's catch-all. It matches everything, so it is the one path NOT turned into a rewrite. */
export const ROUTER_CATCH_ALL = "*";

export interface RewriteRule {
  source: string;
  destination: string;
}

/**
 * Takes block comments (including the JSX brace form) and line comments out of the source,
 * so prose is not read as JSX.
 * The `(^|[\s{])` prefix is load-bearing: the route path `"/login/*"` contains `/*`.
 */
export function stripComments(src: string): string {
  return src
    .replace(/(^|[\s{])\/\*[\s\S]*?\*\//gm, "$1")
    .replace(/(^|[^:])\/\/[^\n]*/gm, "$1");
}

/**
 * Every `path="…"` literal declared on a `<Route>` element, in source order.
 * `routeTags` counts the `<Route` elements found, so the caller can pin `paths.length === routeTags`.
 */
export function parseRoutePaths(src: string): { paths: string[]; routeTags: number } {
  const chunks = stripComments(src).split(/<Route(?=\s)/).slice(1);
  const paths: string[] = [];
  for (const chunk of chunks) {
    // A <Route>'s path is its first attribute; cutting at `element=` stops a nested
    // <Route> inside an element prop leaking its path into the parent's slot.
    const head = chunk.split(/\belement\s*=/)[0];
    const m = head.match(/\bpath="([^"]+)"/);
    if (m) paths.push(m[1]);
  }
  return { paths, routeTags: chunks.length };
}

/** The router's distinct, matchable paths (catch-all removed), in source order. */
export function routerPatterns(appSource: string): string[] {
  const { paths, routeTags } = parseRoutePaths(appSource);
  if (paths.length !== routeTags) {
    throw new Error(
      `routeRewrites: ${routeTags} <Route> elements but ${paths.length} readable path="…" literals. ` +
        `A route whose path is not a plain string literal cannot be turned into a rewrite; ` +
        `refusing to guess (a missing rewrite would 404 a live page).`,
    );
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paths) {
    if (p === ROUTER_CATCH_ALL || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

const REGEX_META = /[.*+?^${}()|[\]\\\/]/;

/** One literal character, case-insensitively and regex-safe. */
function literalChar(c: string): string {
  if (/[A-Za-z]/.test(c)) return `[${c.toLowerCase()}${c.toUpperCase()}]`;
  return REGEX_META.test(c) ? `\\${c}` : c;
}

/** One router segment as a regex fragment. */
function segmentRegex(seg: string): string {
  if (seg.startsWith(":")) return "[^/]+";
  return [...seg].map(literalChar).join("");
}

/**
 * The `vercel.json` `source` for one router path.
 *   "/"                 -> "/"                      (the root is a file; the literal documents it)
 *   "/pricing"          -> "/:path([Pp][Rr]…/?)"
 *   "/notes/:topicSlug" -> "/:path([Nn]…/[^/]+/?)"
 *   "/login/*"          -> "/:path([Ll]…(?:/.*)?)"
 */
export function sourceFor(pattern: string): string {
  if (!pattern.startsWith("/")) {
    throw new Error(`routeRewrites: router path must start with "/": ${pattern}`);
  }
  if (pattern === "/") return "/";
  const segs = pattern.slice(1).split("/");
  let splat = false;
  if (segs[segs.length - 1] === "*") {
    splat = true;
    segs.pop();
  }
  if (segs.some((s) => s === "" || s.includes("*"))) {
    throw new Error(`routeRewrites: unsupported router path shape: ${pattern}`);
  }
  const body = segs.map(segmentRegex).join("/");
  return `/:path(${body}${splat ? "(?:/.*)?" : "/?"})`;
}

/** The generated rules, one per router path, in router order. */
export function shellRewrites(appSource: string): RewriteRule[] {
  return routerPatterns(appSource).map((p) => ({ source: sourceFor(p), destination: SHELL_DESTINATION }));
}

export interface VercelConfigShape {
  rewrites?: RewriteRule[];
  [key: string]: unknown;
}

/**
 * `vercel.json` with its shell rules replaced by the generated ones.
 * "Shell rule" = a rewrite whose destination is `/__shell.html`. The hand-kept rules (the two
 * API proxies and the two asset rules) keep their order and bytes; the generated rules go last,
 * where the old catch-all was.
 */
export function withGeneratedRewrites<T extends VercelConfigShape>(config: T, appSource: string): T {
  const kept = (config.rewrites ?? []).filter((r) => r.destination !== SHELL_DESTINATION);
  return { ...config, rewrites: [...kept, ...shellRewrites(appSource)] };
}
