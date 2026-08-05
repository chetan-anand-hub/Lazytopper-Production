// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

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
 */
function matchSource(source: string, path: string): Record<string, string> | null {
  if (!source.startsWith("/")) {
    throw new Error(`unsupported vercel source (must start with "/"): ${source}`);
  }
  if (/[()^$?+]/.test(source)) {
    throw new Error(
      `unsupported vercel source construct (regex) in "${source}" — this guard ` +
        `models literal and :param patterns only. Extend matchSource() or the ` +
        `guard will mis-report reachability.`,
    );
  }
  const names: string[] = [];
  const regexSrc = source
    .split("/")
    .map((seg) => {
      if (seg === "") return "";
      const star = seg.match(/^:([A-Za-z0-9_]+)\*$/);
      if (star) {
        names.push(star[1]);
        return "(.*)";
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
 * All three are `sitemap.xml` <loc> entries pointing at ROOT paths for routes
 * that only exist under `/app/`. Measured live 2026-08-05 against
 * `www.lazytopper.com`: each returns 404, while its `/app/` twin returns 200.
 *
 *   /topic-hub                  404   ( /app/topic-hub                 200 )
 *   /highly-probable/10/Maths   404   ( /app/highly-probable/10/Maths  200 )
 *   /practice/10/Maths          404   ( /app/practice/10/Maths         200 )
 *
 * ⚠ THIS LIST IS SELF-CLEANING. The second test below asserts every quarantined
 * path is still genuinely unreachable. The moment one is fixed, its entry goes
 * stale and that test goes RED demanding the entry be deleted — so quarantine
 * cannot quietly become a permanent exemption, which is how the previous guards
 * decayed.
 *
 * ⚠ These are NOT fixed by this lane's rewrite. Making the sitemap fetchable and
 * leaving its contents pointing at 404s is a different, still-open defect.
 */
const QUARANTINE = new Map<string, string>([
  ["/topic-hub", "sitemap advertises the root path; route only exists at /app/topic-hub"],
  [
    "/highly-probable/10/Maths",
    "sitemap advertises the root path; route only exists at /app/highly-probable/10/Maths",
  ],
  [
    "/practice/10/Maths",
    "sitemap advertises the root path; route only exists at /app/practice/10/Maths",
  ],
]);

// --------------------------------------------------------------------------
// 3 · THE ASSERTIONS
// --------------------------------------------------------------------------

describe("crawler reachability — every URL the app advertises resolves to something served", () => {
  it("the resolver is not dead — it distinguishes served from unserved, and filesystem beats rewrite", () => {
    // ★ A CONTROL. Without this, a resolver that returned "reachable" for
    // everything would sit green forever and this whole file would assert nothing.

    // Known-served: a real file under the served prefix.
    expect(resolvePath("/app/robots.txt").kind).toBe("file");

    // ★ FILESYSTEM BEATS REWRITE. `/app/:path* -> /app/index.html` would swallow
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
 * 6. IT CHECKS PATHS, NOT HOSTS-AS-DEPLOYED. It asserts advertised URLs use the
 *    product host, but it cannot know which host the CDN treats as canonical. A
 *    canonical tag naming a host that 308-redirects elsewhere is a real SEO
 *    weakness this guard will call fine.
 *
 * 7. IT CANNOT JUDGE SEMANTICS. A canonical pointing at the wrong-but-existing
 *    page, or a sitemap listing a real page nobody should index, resolves fine
 *    and passes.
 *
 * 8. ★★ THE SPA CATCH-ALL MAKES EVERY `/app/*` PATH LOOK REACHABLE, AND THIS IS
 *    THE BIGGEST HOLE. `/app/:path* -> /app/index.html` means a typo'd or retired
 *    route under `/app/` resolves to the shell and passes. Verified by mutation:
 *    pointing a sitemap <loc> at `/app/this-route-does-not-exist.xml` left this
 *    file GREEN. That is not a modelling error — production returns 200 there too
 *    — but it means this guard catches UNSERVED paths, NOT DEAD ROUTES. A dead
 *    `/app/` route needs a router-level check, which is a different guard. Only
 *    ROOT-relative paths (where nothing is served) are caught here, which is
 *    exactly the defect class this file was written for.
 * ------------------------------------------------------------------------- */
