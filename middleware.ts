import { next } from "@vercel/functions/middleware";

/**
 * CHUNK-RESILIENCE-1 (K1) — pin a page's ASSETS to the deployment that served the page.
 *
 * WHY. A page's HTML from deployment N asks for hashed chunks under /app/assets/. If
 * deployment N+1 goes live in between, those chunks no longer exist on the live
 * deployment, the import fails, and the global ErrorBoundary renders "Something went
 * wrong" — which Google filed as a Soft 404. Vercel Skew Protection routes a request
 * carrying the `__vdpl` cookie to the deployment it names
 * (https://vercel.com/docs/skew-protection).
 *
 * ★ PIN ASSETS, NEVER PAGES. The cookie is scoped `Path=/app/assets`, so the browser
 * sends it ONLY with asset requests. Document navigations never carry it and always get
 * the latest deployment — a student can never be stuck on an old version. The cookie is
 * rewritten on every page load, so it always names the deployment of the page on screen.
 * `Path=/` or `Path=/app` would pin every navigation; the test pins that it is neither.
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
export const EXCLUDED_PREFIXES: readonly string[] = ["/app/assets/", "/api/", "/shared-api/"];

export interface PinEnv {
  VERCEL_DEPLOYMENT_ID?: string;
  VERCEL_SKEW_PROTECTION_ENABLED?: string;
}

/** A document request under /app/ — not an asset, not an API call, not a static file. */
export function isAppDocumentRequest(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const { pathname } = new URL(request.url);
  if (pathname !== "/app" && !pathname.startsWith("/app/")) return false;
  if (pathname === "/app/assets") return false;
  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  // A browser says what it is fetching; honour it when present. (curl and some crawlers
  // send no Sec-Fetch-Dest — for them the path decides.)
  const dest = request.headers.get("sec-fetch-dest");
  if (dest && dest !== "document") return false;
  // /app/robots.txt, /app/sitemap.xml, /app/og-image.png ... are files, not pages.
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
  return `__vdpl=${id}; Path=/app/assets; Max-Age=${PIN_MAX_AGE_SECONDS}; Secure; HttpOnly; SameSite=Lax`;
}

/**
 * The whole middleware, with its environment injected. Returns a pass-through response
 * carrying the cookie, or `undefined` (= continue unchanged). Never throws.
 */
export function pinAssetsToDeployment(request: Request, readEnv: () => PinEnv): Response | undefined {
  try {
    if (!isAppDocumentRequest(request)) return undefined;
    const cookie = deploymentPinCookie(readEnv());
    if (cookie === null) return undefined;
    return next({ headers: { "set-cookie": cookie } });
  } catch {
    return undefined;
  }
}

function processEnv(): PinEnv {
  return typeof process === "undefined" ? {} : (process.env as PinEnv);
}

export default function middleware(request: Request): Response | undefined {
  return pinAssetsToDeployment(request, processEnv);
}

export const config = {
  // Invoke only for /app/ pages; hashed assets are left out here as well as in code.
  matcher: ["/app", "/app/((?!assets/).*)"],
};
