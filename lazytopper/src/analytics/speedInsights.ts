/**
 * SPEED-1 (owner ruling 28 Oct 2026) — real-user mobile speed (Vercel Speed Insights).
 *
 * Why: mobile bounce is 76% against 47% on desktop and we had no field speed data; the
 * Speed Insights script was never loaded.
 *
 * Privacy (minors are the audience): the script sets NO cookie and reads no identity. It
 * sends Web Vitals plus the page URL and the route. Same rules as analytics.ts:
 *   - never loaded in an automated context (analyticsEnabled), on /admin, or on a /u/
 *     hand-off link; a later in-app navigation onto such a page sends nothing (beforeSend);
 *   - every URL is run through normalisePath (query and hash dropped, /u/<token> -> /u/:token,
 *     emails and opaque ids masked) before it leaves.
 * The package is imported dynamically, after first paint (idle), so it stays out of the
 * entry chunk (PERF-3 budget).
 *
 * SPEED-INSIGHTS-ROUTE-1 (coordinator, 6 Nov 2026): every event used to arrive with `route` unset, so the
 * dashboard showed one "Unknown" route. Each event now carries a ROUTE FAMILY derived from the already-scrubbed
 * path (`speedRouteFor`): content slugs collapse to a placeholder (`/notes/[chapter]`), so per-page speed is
 * readable without sending anything the URL did not already carry. Half the events are sampled (`sampleRate`
 * 0.5, owner cost ruling on the paid plan); p75s stay representative at today's ~1,100 mobile events a week.
 */
import { ADMIN_PATH, analyticsEnabled, normalisePath, routerPathOf } from "./analytics";

const HAND_OFF_PATH = /^\/u\/[^/]+/;

let started = false;

/** True when Speed Insights must not run on this router-relative path. */
export function speedInsightsBlocked(routerPath: string): boolean {
  return ADMIN_PATH.test(routerPath) || HAND_OFF_PATH.test(routerPath);
}

export const SPEED_SAMPLE_RATE = 0.5;

/**
 * Known top-level pages (review of #1603): a single-segment path is reported as itself ONLY if it is one of these.
 * Anything else — the catch-all (`/9876543210`, a typo, a pasted string) — is "/[other]", so a route can never
 * carry what a student typed into the address bar.
 */
export const KNOWN_TOP_LEVEL = new Set([
  "/", "/welcome", "/browse", "/login", "/sign-up", "/pricing", "/packs", "/exam-trends", "/practice-hub",
  "/check-improve", "/check-your-answer", "/for-parents", "/contact", "/cbq-class-10", "/highly-probable",
  "/ncert-class-10", "/topic-hub", "/me", "/tutor", "/intent", "/practice", "/notes", "/funnel", "/admin",
]);

/** Multi-segment paths that are ONE page each (kept as they are). */
const STATIC_MULTI_SEGMENT = new Set(["/cbse/class-10", "/practice/worksheets", "/practice/worksheets/ready"]);

/** Placeholder names for the content families; any other deeper path keeps its first segment + "[…]". */
const FAMILY: ReadonlyArray<[RegExp, string]> = [
  [/^\/notes\/[^/]+$/, "/notes/[chapter]"],
  [/^\/cbq-class-10\/[^/]+$/, "/cbq-class-10/[chapter]"],
  [/^\/topic-hub\/[^/]+$/, "/topic-hub/[chapter]"],
  [/^\/topic-hub\/[^/]+\/[^/]+$/, "/topic-hub/[grade]/[subject]"],
  [/^\/topic-hub\/[^/]+\/[^/]+\/[^/]+$/, "/topic-hub/[grade]/[subject]/[topic]"],
  [/^\/highly-probable\/[^/]+\/[^/]+$/, "/highly-probable/[grade]/[subject]"],
  [/^\/practice\/[^/]+\/[^/]+$/, "/practice/[grade]/[subject]"],
  [/^\/legal\/[^/]+$/, "/legal/[page]"],
];

/**
 * The route family Speed Insights groups a page under, from a router path. Runs normalisePath first (ids,
 * emails and hand-off tokens are already masked there), then collapses content slugs.
 */
export function speedRouteFor(routerPath: string): string {
  const path = normalisePath(routerPath);
  if (STATIC_MULTI_SEGMENT.has(path)) return path;
  for (const [pattern, family] of FAMILY) if (pattern.test(path)) return family;
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 1) return KNOWN_TOP_LEVEL.has(path) ? path : "/[other]";
  return KNOWN_TOP_LEVEL.has(`/${segments[0]}`) || /^ncert-(solutions|exemplar)$/.test(segments[0]) || segments[0] === "legal" || segments[0] === "chapter-test" || segments[0] === "full-mock" || segments[0] === "cbse"
    ? `/${segments[0]}/[…]`
    : "/[other]";
}

/** Scrub a vendor event URL; null drops the event (admin and hand-off pages). */
export function scrubSpeedEvent<T extends { url: string; route?: string }>(event: T): T | null {
  try {
    const u = new URL(event.url, window.location.origin);
    if (speedInsightsBlocked(routerPathOf(u.pathname))) return null;
    const routerPath = routerPathOf(u.pathname);
    return { ...event, url: `${u.origin}${normalisePath(u.pathname)}`, route: speedRouteFor(routerPath) };
  } catch {
    return null;
  }
}

export function startSpeedInsights(routerPath: string = routerPathOf(window.location.pathname)): void {
  if (started || !analyticsEnabled() || speedInsightsBlocked(routerPath)) return;
  started = true;
  const load = () => {
    import("@vercel/speed-insights")
      .then((m) => {
        m.injectSpeedInsights({
          beforeSend: scrubSpeedEvent,
          debug: false,
          sampleRate: SPEED_SAMPLE_RATE,
          route: speedRouteFor(routerPath),
        });
      })
      .catch(() => {
        /* a blocked or failed speed script is never worth a broken page */
      });
  };
  const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void };
  if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(load, { timeout: 4000 });
  else window.setTimeout(load, 2500);
}

export function __resetSpeedInsightsForTests(): void {
  started = false;
}
