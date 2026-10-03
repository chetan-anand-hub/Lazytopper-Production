/// <reference lib="dom" />
// ^ Vercel typechecks this file against the REPO-ROOT tsconfig (lib es2022, no DOM, no
//   @types/node) before deploying it — measured: the first preview failed on
//   "Cannot find name 'Request'". The reference supplies the Fetch API types.
import { next } from "@vercel/functions/middleware";

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

export default function middleware(request: Request): Response | undefined {
  return pinAssetsToDeployment(request, processEnv);
}

export const config = {
  // Invoke only for pages. Hashed assets, the two API proxies, Vercel's own /_vercel/ paths
  // and the retired base (redirected by vercel.json) are left out here as well as in code.
  matcher: ["/((?!assets/|api/|shared-api/|_vercel/|app/|app$).*)"],
  // Vercel's build warns that the default "edge" runtime for middleware.ts is deprecated
  // and recommends Node.js (https://vercel.com/docs/routing-middleware#runtime-options).
  runtime: "nodejs",
};
