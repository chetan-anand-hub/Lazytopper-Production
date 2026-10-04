/// <reference lib="dom" />
// ^ Vercel typechecks this file against the REPO-ROOT tsconfig (lib es2022, no DOM, no
//   @types/node) before deploying it — measured: the first preview failed on
//   "Cannot find name 'Request'". The reference supplies the Fetch API types.
import { next, rewrite } from "@vercel/functions/middleware";
// ★ SEO-5 PR-2 (D2) — the set of pages that HAVE a desktop variant, from the committed
// prerender artifact (CI capture only, never hand-edited). `applyPrerendered` FAILS THE BUILD
// unless its `paths` equals the advertised set AND both variants exist for every one, so a
// path listed here always has a built `/__desktop/` file to rewrite to.
// The root tsconfig's `moduleResolution: "bundler"` resolves a JSON import (checked against
// that exact config). The value is still shape-checked at runtime by `advertisedPathsFrom` —
// a malformed manifest serves EVERY client the mobile file (the safe default); it never throws.
import prerenderManifest from "./lazytopper/prerendered/manifest.json";

/**
 * CHUNK-RESILIENCE-1 (K1) — pin a page's ASSETS to the deployment that served the page.
 *
 * WHY. A page's HTML from deployment N asks for hashed chunks under /assets/. If
 * deployment N+1 goes live in between, those chunks no longer exist on the live
 * deployment, the import fails, and the global ErrorBoundary renders "Something went
 * wrong" — which Google filed as a Soft 404. Vercel Skew Protection routes a request
 * carrying the `__vdpl` cookie to the deployment it names
 * (https://vercel.com/docs/skew-protection).
 *
 * ★ PIN ASSETS, NEVER PAGES. The cookie is scoped `Path=/assets`, so the browser
 * sends it ONLY with asset requests. Document navigations never carry it and always get
 * the latest deployment — a student can never be stuck on an old version. The cookie is
 * rewritten on every page load, so it always names the deployment of the page on screen.
 * `Path=/` would pin every navigation; the test pins that it is not.
 *
 * ROOT-URL-1 (M3). The app moved from the retired `/app` base to the domain root. An old
 * `/app...` request is a permanent redirect in vercel.json and is never pinned here.
 *
 * ★ FAIL OPEN. ANY exception, and any missing / empty / malformed variable, lets the
 * request through UNCHANGED with no cookie — the site must never be broken by the thing
 * meant to make it more robust. Returning nothing from a Routing Middleware continues
 * the request untouched (vercel.json rewrites, headers and the ASSET-404 rule all still
 * apply after it).
 *
 * The only thing ever added to a response is the one Set-Cookie header, via `next()`
 * from @vercel/functions, whose headers are "sent to the user response along with the
 * response headers from the origin".
 *
 * Tested by lazytopper/src/lib/vercelMiddleware.test.ts (it lives under lazytopper/src
 * so the CI vitest step (its include is every .test.ts under src) actually runs it, and so
 * `typecheck:test` typechecks this file through that import).
 */

/**
 * SEO-5 PR-2 (D2) — DEVICE SERVING. A document request for an advertised page is served the
 * capture made at its device's width: the 390-px MOBILE file (the page's own file, the default)
 * or the 1280-px DESKTOP variant under `/__desktop/` (a rewrite — the URL, and so the canonical,
 * never changes).
 *
 *   Sec-CH-UA-Mobile: ?0                 -> desktop     (Chromium says so outright)
 *   Sec-CH-UA-Mobile: ?1                 -> mobile
 *   no / unreadable hint, UA non-mobile  -> desktop     (Googlebot desktop, Safari/Firefox desktop)
 *   no / unreadable hint, UA mobile      -> mobile      (Googlebot smartphone, every phone)
 *   no User-Agent at all                 -> mobile      (unknown client: the safe default)
 *   ANY thrown error                     -> mobile      (the request passes through untouched)
 *
 * ★ `Vary: User-Agent, Sec-CH-UA-Mobile` on every advertised-page response, both variants, so
 * no cache between here and the reader can hand one device the other's HTML under one URL.
 * Vercel's own edge cannot: this middleware runs BEFORE its cache on every request, and the
 * two variants are two different files.
 *
 * ★ A DIRECT request for a `/__desktop/...` URL gets `X-Robots-Tag: noindex`. The header is
 * keyed on the REQUEST path, so a desktop client rewritten there from the real URL never sees
 * it — the variant file itself keeps the page's `index` robots meta and canonical.
 */
export const DESKTOP_PREFIX = "/__desktop";

/** The response header that keeps device variants apart in every downstream cache. */
export const DEVICE_VARY = "User-Agent, Sec-CH-UA-Mobile";

export type DeviceVariant = "mobile" | "desktop";

/**
 * A User-Agent that names a phone or tablet. Googlebot smartphone carries `Android … Mobile`;
 * an Android tablet carries `Android` without `Mobile` and is matched by `Android`.
 */
const MOBILE_UA = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|IEMobile|BlackBerry|BB10|Opera Mini|webOS|Silk|Kindle|PlayBook/i;

/** Which capture a client gets. Never throws on a malformed header; unknown is mobile. */
export function deviceVariantFor(headers: Headers): DeviceVariant {
  const hint = headers.get("sec-ch-ua-mobile")?.trim();
  if (hint === "?0") return "desktop";
  if (hint === "?1") return "mobile";
  const ua = headers.get("user-agent")?.trim() ?? "";
  if (ua === "") return "mobile";
  return MOBILE_UA.test(ua) ? "mobile" : "desktop";
}

/** The manifest's `paths`, shape-checked; anything malformed yields an EMPTY set (= mobile for all). */
export function advertisedPathsFrom(manifest: unknown): ReadonlySet<string> {
  const paths = (manifest as { paths?: unknown } | null)?.paths;
  if (!Array.isArray(paths)) return new Set();
  return new Set(paths.filter((p): p is string => typeof p === "string" && p.startsWith("/")));
}

const ADVERTISED: ReadonlySet<string> = (() => {
  try {
    return advertisedPathsFrom(prerenderManifest);
  } catch {
    return new Set<string>();
  }
})();

/** `/notes/x/` -> `/notes/x`; the root stays `/`. */
function withoutTrailingSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/**
 * The built desktop variant for an advertised path: `/__desktop/notes/x.html`, the root's
 * `/__desktop/index.html`. Mirrors `desktopVariantFile` in `lazytopper/scripts/seo/applyPrerendered.ts`
 * (which cannot be imported here — it pulls node:fs); `vercelMiddleware.test.ts` asserts the
 * two agree for every advertised path.
 */
export function desktopVariantPath(path: string): string {
  return `${DESKTOP_PREFIX}/${path === "/" ? "index" : path.slice(1)}.html`;
}

export interface DevicePlan {
  /** Rewrite to this path (desktop variant), or null = serve the page's own (mobile) file. */
  rewriteTo: string | null;
  /** Response headers to add: Vary on advertised pages, X-Robots-Tag on a direct variant URL. */
  headers: Record<string, string>;
}

/**
 * The device-serving decision for one request. THROWS on a broken request (the caller turns
 * that into the mobile file); never consulted for non-documents.
 */
export function devicePlanFor(request: Request, advertised: ReadonlySet<string> = ADVERTISED): DevicePlan {
  const { pathname } = new URL(request.url);
  if (pathname === DESKTOP_PREFIX || pathname.startsWith(`${DESKTOP_PREFIX}/`)) {
    return { rewriteTo: null, headers: { "x-robots-tag": "noindex" } };
  }
  if (!isDocumentRequest(request)) return { rewriteTo: null, headers: {} };
  const path = withoutTrailingSlash(pathname);
  if (!advertised.has(path)) return { rewriteTo: null, headers: {} };
  const headers = { vary: DEVICE_VARY };
  return {
    rewriteTo: deviceVariantFor(request.headers) === "desktop" ? desktopVariantPath(path) : null,
    headers,
  };
}

/** The deployment-pin cookie's lifetime: 7 days, matching Skew Protection's max age. */
export const PIN_MAX_AGE_SECONDS = 604800;

/** Path prefixes that are never documents and never get the cookie. */
export const EXCLUDED_PREFIXES: readonly string[] = ["/assets/", "/api/", "/shared-api/", "/_vercel/"];

/** The same prefixes without the trailing slash (`/assets`, `/api` ...) are not pages either. */
const EXCLUDED_EXACT: readonly string[] = EXCLUDED_PREFIXES.map((prefix) => prefix.slice(0, -1));

/** The retired base path (ROOT-URL-1). vercel.json redirects everything under it. */
const RETIRED_BASE = /^\/app(?:\/|$)/;

export interface PinEnv {
  VERCEL_DEPLOYMENT_ID?: string;
  VERCEL_SKEW_PROTECTION_ENABLED?: string;
}

/** A document request — not an asset, an API call, a static file or a retired base URL. */
export function isDocumentRequest(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const { pathname } = new URL(request.url);
  if (RETIRED_BASE.test(pathname)) return false;
  if (EXCLUDED_EXACT.includes(pathname)) return false;
  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  // A browser says what it is fetching; honour it when present. (curl and some crawlers
  // send no Sec-Fetch-Dest — for them the path decides.)
  const dest = request.headers.get("sec-fetch-dest");
  if (dest && dest !== "document") return false;
  // /robots.txt, /sitemap.xml, /og-image.png ... are files, not pages.
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  if (/\.[a-z0-9]+$/i.test(lastSegment) && !/\.html?$/i.test(lastSegment)) return false;
  return true;
}

/** The exact K1 cookie, or null when Skew Protection is off or the id is unusable. */
export function deploymentPinCookie(env: PinEnv): string | null {
  if (env.VERCEL_SKEW_PROTECTION_ENABLED !== "1") return null;
  const id = env.VERCEL_DEPLOYMENT_ID;
  // Deployment ids look like `dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3`. Anything else (empty,
  // or a character that could break out of the header) sets nothing.
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  return `__vdpl=${id}; Path=/assets; Max-Age=${PIN_MAX_AGE_SECONDS}; Secure; HttpOnly; SameSite=Lax`;
}

/**
 * The whole middleware, with its environment injected. Returns a pass-through response
 * carrying the cookie, or `undefined` (= continue unchanged). Never throws.
 */
export function pinAssetsToDeployment(request: Request, readEnv: () => PinEnv): Response | undefined {
  try {
    if (!isDocumentRequest(request)) return undefined;
    const cookie = deploymentPinCookie(readEnv());
    if (cookie === null) return undefined;
    return next({ headers: { "set-cookie": cookie } });
  } catch {
    return undefined;
  }
}

// Read through globalThis so this file needs no @types/node under the root tsconfig.
function processEnv(): PinEnv {
  const proc = (globalThis as { process?: { env?: PinEnv } }).process;
  return proc?.env ?? {};
}

/**
 * K1 (asset pin) + D2 (device serving), composed. Each half fails open on its own: a fault in
 * device serving leaves the pin cookie intact and serves the mobile file; a fault in the pin
 * leaves device serving intact. Nothing here ever throws.
 */
export function serveRequest(
  request: Request,
  readEnv: () => PinEnv,
  advertised: ReadonlySet<string> = ADVERTISED,
): Response | undefined {
  const headers: Record<string, string> = {};
  const pinned = pinAssetsToDeployment(request, readEnv);
  const cookie = pinned?.headers.get("set-cookie");
  if (cookie) headers["set-cookie"] = cookie;

  let rewriteTo: string | null = null;
  try {
    const plan = devicePlanFor(request, advertised);
    Object.assign(headers, plan.headers);
    rewriteTo = plan.rewriteTo;
  } catch {
    // FAIL OPEN TO MOBILE: no rewrite. The page's own file is the 390-px capture.
    rewriteTo = null;
  }

  try {
    if (rewriteTo !== null) {
      const destination = new URL(request.url);
      destination.pathname = rewriteTo;
      return rewrite(destination, { headers });
    }
    if (Object.keys(headers).length === 0) return undefined;
    return next({ headers });
  } catch {
    return pinned;
  }
}

export default function middleware(request: Request): Response | undefined {
  return serveRequest(request, processEnv);
}

export const config = {
  // Invoke only for pages. Hashed assets, the two API proxies, Vercel's own /_vercel/ paths
  // and the retired base (redirected by vercel.json) are left out here as well as in code.
  matcher: ["/((?!assets/|api/|shared-api/|_vercel/|app/|app$).*)"],
  // Vercel's build warns that the default "edge" runtime for middleware.ts is deprecated
  // and recommends Node.js (https://vercel.com/docs/routing-middleware#runtime-options).
  runtime: "nodejs",
};
