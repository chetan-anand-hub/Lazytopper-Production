// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
// ★ THE APP'S OWN MATCHER. The generated Vercel rules are compared with React Router's
// `matchPath` on a corpus, so the guard cannot agree with a model that disagrees with the router.
import { matchPath } from "react-router-dom";
import ts from "typescript";
import { generatedVercelJson } from "../../scripts/seo/writeVercelRewrites";
import {
  SHELL_DESTINATION,
  parseRoutePaths,
  routerPatterns,
  shellRewrites,
  sourceFor,
  type RewriteRule,
} from "./routeRewrites";
import { sitemapPaths } from "./sitemapUrls";

/**
 * SOFT404-1 — an address the app does not route is HTTP 404, not the shell with 200.
 *
 * What this file pins, and why each pin can fail:
 *   1. DRIFT. `vercel.json`'s shell rules are exactly what the generator produces from the
 *      `<Route path>` literals in `App.tsx`. Hand-editing the rules, or adding/removing a
 *      route without regenerating, is RED (the mutation tests below prove it).
 *   2. EQUIVALENCE. On a corpus (every router path with sample params, in upper case, with a
 *      trailing slash, with an extra and a missing segment, plus unknown addresses) a request
 *      reaches the shell if and only if React Router's `matchPath` routes it.
 *   3. ADVERTISED. Every sitemap URL and every `llms.txt` URL reaches the shell or is the root.
 *   4. NEGATIVES. `/this-does-not-exist-xyz`, `/llms-full.txt`, `/cbse/class-99` ... reach nothing.
 *   5. UNCHANGED. The redirects, both API proxies, both asset rules, the headers and
 *      `ignoreCommand` are exactly what they were before this lane.
 *   6. THE PAGE. `public/404.html` is static, says the page does not exist, is `noindex`, links
 *      Home / Practice hub / CBSE Class 10.
 *
 * ⚠ WHAT THIS CANNOT DO. It models Vercel's matcher (a `:path(<regex>)` group is the regex,
 * trailing delimiter optional); it is not Vercel. The status codes themselves (200 / 404 / 308)
 * are proven on the PR's Vercel preview and again on www after merge (the §3 / §5 sweep).
 */

const LAZYTOPPER = resolve(__dirname, "../..");
const REPO_ROOT = resolve(LAZYTOPPER, "..");
const VERCEL_JSON = resolve(REPO_ROOT, "vercel.json");
const APP_TSX = resolve(LAZYTOPPER, "src/App.tsx");
const NOT_FOUND_HTML = resolve(LAZYTOPPER, "public/404.html");
const LLMS_TXT = resolve(LAZYTOPPER, "public/llms.txt");

const appSource = readFileSync(APP_TSX, "utf8");
const vercelText = readFileSync(VERCEL_JSON, "utf8");
const vercel = JSON.parse(vercelText) as {
  ignoreCommand: string;
  redirects: Array<Record<string, unknown>>;
  rewrites: RewriteRule[];
  headers: unknown[];
};

const patterns = routerPatterns(appSource);
const shellRules = vercel.rewrites.filter((r) => r.destination === SHELL_DESTINATION);

/** Does one generated rule send this pathname to the shell? Model of `/:path(<regex>)`. */
function ruleMatches(source: string, pathname: string): boolean {
  if (source === "/") return pathname === "/";
  const m = /^\/:path\((.*)\)$/s.exec(source);
  if (!m) throw new Error(`unexpected generated source shape: ${source}`);
  return new RegExp(`^/${m[1]}$`).test(pathname);
}
const reachesShell = (pathname: string): boolean => shellRules.some((r) => ruleMatches(r.source, pathname));
const routerRoutes = (pathname: string): boolean =>
  patterns.some((p) => matchPath({ path: p, end: true }, pathname) !== null);

/** A concrete URL path that the router pattern accepts. */
function sample(pattern: string): string {
  return pattern.replace(/:[A-Za-z]+/g, "sample-1").replace(/\*$/, "a/b");
}

describe("SOFT404-1 — the shell rules are generated from the router", () => {
  it("the parser is not dead — it reads App.tsx's routes and every <Route> tag has a readable path", () => {
    const { paths, routeTags } = parseRoutePaths(appSource);
    expect(routeTags).toBeGreaterThan(40);
    expect(paths.length, "a <Route> whose path is not a string literal would be invisible").toBe(routeTags);
    expect(patterns).toContain("/pricing");
    expect(patterns).toContain("/notes/:topicSlug");
    expect(patterns).toContain("/login/*");
    expect(patterns, "the catch-all is the one path that is NOT a rewrite").not.toContain("*");
    expect(new Set(patterns).size, "distinct").toBe(patterns.length);
  });

  it("★ INDEPENDENT PARSE — a TypeScript-AST read of App.tsx finds exactly the generator's paths (the comment stripper cannot hide a <Route>)", () => {
    const sf = ts.createSourceFile("App.tsx", appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const found: string[] = [];
    let tags = 0;
    const visit = (n: ts.Node): void => {
      if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(sf) === "Route") {
        tags++;
        const attr = n.attributes.properties.find(
          (a): a is ts.JsxAttribute => ts.isJsxAttribute(a) && a.name.getText(sf) === "path",
        );
        const init = attr?.initializer;
        if (init && ts.isStringLiteral(init)) found.push(init.text);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
    expect(tags, "AST <Route> count equals the text parser's").toBe(parseRoutePaths(appSource).routeTags);
    expect(found.length, "every AST <Route> has a literal path").toBe(tags);
    const distinct = [...new Set(found.filter((p) => p !== "*"))];
    expect(distinct).toEqual(patterns);
  });

  it("★ DRIFT — vercel.json's rewrites are exactly what the generator produces from App.tsx", () => {
    const regenerated = generatedVercelJson(vercelText, appSource);
    expect(
      regenerated === vercelText,
      "vercel.json is out of date with the router. Run: npx tsx scripts/seo/writeVercelRewrites.ts --write",
    ).toBe(true);
    expect(shellRules.map((r) => r.source)).toEqual(shellRewrites(appSource).map((r) => r.source));
  });

  it("★ MUTATION — a route removed from the router makes the check RED, and an added route is picked up", () => {
    // Removing: rename one route so the router no longer has /pricing.
    const without = appSource.replace('path="/pricing"', 'path="/pricing-removed-by-mutation"');
    expect(without).not.toBe(appSource);
    expect(generatedVercelJson(vercelText, without) === vercelText, "removing a route must change the output").toBe(false);
    const mutated = shellRewrites(without);
    expect(mutated.some((r) => ruleMatches(r.source, "/pricing"))).toBe(false);

    // Adding: a new route appears as a new rule, so it can never be silently 404'd.
    const withNew = appSource.replace(
      '<Route path="/pricing"',
      '<Route path="/brand-new-page" element={null} />\n<Route path="/pricing"',
    );
    expect(withNew).not.toBe(appSource);
    expect(shellRewrites(withNew).some((r) => ruleMatches(r.source, "/brand-new-page"))).toBe(true);
    expect(generatedVercelJson(vercelText, withNew) === vercelText).toBe(false);

    // An unreadable route is refused, not skipped.
    const unreadable = appSource.replace('<Route path="/pricing"', "<Route path={someVariable}");
    expect(() => routerPatterns(unreadable)).toThrow(/refusing to guess/);
  });

  it("every generated rule is a shell rewrite whose group has no capturing group", () => {
    expect(shellRules.length).toBe(patterns.length);
    for (const r of shellRules) {
      expect(r.destination).toBe(SHELL_DESTINATION);
      expect(r.source.startsWith("/")).toBe(true);
      const group = /^\/:path\((.*)\)$/s.exec(r.source);
      if (group) expect(/\((?!\?)/.test(group[1]), `capturing group in ${r.source}`).toBe(false);
    }
  });
});

describe("SOFT404-1 — a request reaches the shell if and only if the router routes it", () => {
  const corpus = new Set<string>();
  for (const p of patterns) {
    const s = sample(p);
    corpus.add(s);
    corpus.add(s.toUpperCase());
    corpus.add(s.replace(/^\/([^/]+)/, (_m, first: string) => `/${first[0].toUpperCase()}${first.slice(1)}`));
    if (s !== "/") corpus.add(`${s}/`);
    corpus.add(`${s}/extra-segment`);
    corpus.add(`${s}/extra/two`);
    const parent = s.slice(0, s.lastIndexOf("/"));
    if (parent) corpus.add(parent);
  }
  for (const unknown of [
    "/this-does-not-exist-xyz",
    "/llms-full.txt",
    "/cbse/class-99",
    "/cbse",
    "/notes",
    "/notes/fake/abc",
    "/practice",
    "/worksheets",
    "/chapter-test",
    "/chapter-test/10",
    "/full-mock",
    "/highly-probable/10",
    "/dashboard",
    "/trends/10/Maths",
    "/favicon.ico",
    "/wp-login.php",
    "/pricingx",
    "/x/pricing",
    "/zz/yy/xx/ww",
  ]) {
    corpus.add(unknown);
  }

  it("the corpus is not trivial — it holds both routed and unrouted paths", () => {
    const routed = [...corpus].filter(routerRoutes).length;
    expect(corpus.size).toBeGreaterThan(150);
    expect(routed).toBeGreaterThan(60);
    expect(corpus.size - routed).toBeGreaterThan(60);
  });

  it("★ EQUIVALENCE — agrees with React Router's matchPath on every corpus path (case, trailing slash, extra / missing segments)", () => {
    const disagreements = [...corpus]
      .filter((p) => reachesShell(p) !== routerRoutes(p))
      .map((p) => `${p}  vercel=${reachesShell(p)} router=${routerRoutes(p)}`);
    expect(disagreements).toEqual([]);
  });

  it("CONTROL — case and trailing slash are preserved for routed paths (today's behaviour)", () => {
    for (const p of ["/PRICING", "/Pricing", "/pricing/", "/Highly-Probable/10/Maths/", "/NOTES/real-numbers", "/ME"]) {
      expect(reachesShell(p), p).toBe(true);
    }
  });

  it("★ NEGATIVES — the spec's unknown addresses reach nothing", () => {
    for (const p of ["/this-does-not-exist-xyz", "/llms-full.txt", "/cbse/class-99", "/notes/fake/abc", "/notes", "/practice", "/worksheets", "/favicon.ico"]) {
      expect(reachesShell(p), p).toBe(false);
    }
  });
});

describe("SOFT404-1 — every advertised URL still reaches the shell", () => {
  it("every sitemap URL path matches a shell rule (or is the root file)", () => {
    const paths = sitemapPaths();
    expect(paths.length).toBeGreaterThan(40);
    const missing = paths.filter((p) => !reachesShell(p));
    expect(missing).toEqual([]);
  });

  it("every llms.txt URL path matches a shell rule (or is the root file)", () => {
    expect(existsSync(LLMS_TXT)).toBe(true);
    const txt = readFileSync(LLMS_TXT, "utf8");
    const paths = [...txt.matchAll(/https?:\/\/[^\s<>")]+/gi)]
      .map((m) => new URL(m[0].replace(/[.,]$/, "")))
      .filter((u) => u.hostname === "www.lazytopper.com")
      .map((u) => u.pathname);
    expect(paths.length).toBeGreaterThan(20);
    const missing = paths.filter((p) => !reachesShell(p));
    expect(missing).toEqual([]);
  });

  it("sourceFor is the single place a pattern becomes a source (spot checks)", () => {
    expect(sourceFor("/")).toBe("/");
    expect(sourceFor("/pricing")).toBe("/:path([pP][rR][iI][cC][iI][nN][gG]/?)");
    expect(sourceFor("/notes/:topicSlug")).toBe("/:path([nN][oO][tT][eE][sS]/[^/]+/?)");
    expect(sourceFor("/login/*")).toBe("/:path([lL][oO][gG][iI][nN](?:/.*)?)");
  });
});

describe("SOFT404-1 — everything except the shell rules is exactly as it was", () => {
  it("redirects, the two API proxies, the two asset rules, headers and ignoreCommand are unchanged", () => {
    expect(vercel.ignoreCommand).toBe("node lazytopper/scripts/ops/vercel_ignore_build.mjs");
    // The retired base is assembled, never written as a literal: noAppPrefix.guard forbids it.
    const RETIRED = ["", "app"].join("/");
    expect(vercel.redirects).toEqual([
      { source: RETIRED, destination: "/", permanent: true },
      { source: `${RETIRED}/:path((?!assets/).*)`, destination: "/:path", permanent: true },
    ]);
    const RAILWAY = "https://lazytopper-production-production.up.railway.app";
    expect(vercel.rewrites.slice(0, 4)).toEqual([
      { source: "/api/:path*", destination: `${RAILWAY}/api/:path*` },
      { source: "/shared-api/:path*", destination: `${RAILWAY}/shared-api/:path*` },
      { source: `${RETIRED}/assets/:path(.*)`, destination: "/__asset-not-found__" },
      { source: "/assets/:path(.*)", destination: "/__asset-not-found__" },
    ]);
    expect(vercel.rewrites.length).toBe(4 + shellRules.length);
    expect(vercel.headers).toEqual([
      { source: "/__shell.html", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
      {
        source: "/assets/:path(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ]);
  });
});

describe("SOFT404-1 — public/404.html is the honest not-found page", () => {
  const html = existsSync(NOT_FOUND_HTML) ? readFileSync(NOT_FOUND_HTML, "utf8") : "";

  it("exists and is a complete static document", () => {
    expect(existsSync(NOT_FOUND_HTML)).toBe(true);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("</html>");
  });

  it("title, noindex, honest copy", () => {
    expect(html).toContain("<title>Page not found | LazyTopper</title>");
    expect(html).toMatch(/<meta name="robots" content="[^"]*\bnoindex\b[^"]*"/);
    expect(html).toContain("This page does not exist.");
  });

  it("links Home, Practice hub and CBSE Class 10, and needs no JavaScript", () => {
    const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(["/", "/practice-hub", "/cbse/class-10"]);
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/\bhttps?:\/\//i);
  });

  it("is not advertised as a page (not in the sitemap, not routed)", () => {
    expect(sitemapPaths()).not.toContain("/404.html");
    expect(patterns.some((p) => p.includes("404"))).toBe(false);
  });
});
