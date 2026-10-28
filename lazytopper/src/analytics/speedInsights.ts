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
 */
import { ADMIN_PATH, analyticsEnabled, normalisePath, routerPathOf } from "./analytics";

const HAND_OFF_PATH = /^\/u\/[^/]+/;

let started = false;

/** True when Speed Insights must not run on this router-relative path. */
export function speedInsightsBlocked(routerPath: string): boolean {
  return ADMIN_PATH.test(routerPath) || HAND_OFF_PATH.test(routerPath);
}

/** Scrub a vendor event URL; null drops the event (admin and hand-off pages). */
export function scrubSpeedEvent<T extends { url: string; route?: string }>(event: T): T | null {
  try {
    const u = new URL(event.url, window.location.origin);
    if (speedInsightsBlocked(routerPathOf(u.pathname))) return null;
    return { ...event, url: `${u.origin}${normalisePath(u.pathname)}`, route: undefined };
  } catch {
    return null;
  }
}

export function startSpeedInsights(routerPath: string): void {
  if (started || !analyticsEnabled() || speedInsightsBlocked(routerPath)) return;
  started = true;
  const load = () => {
    import("@vercel/speed-insights")
      .then((m) => {
        m.injectSpeedInsights({ beforeSend: scrubSpeedEvent, debug: false });
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
