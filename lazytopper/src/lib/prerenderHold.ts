/**
 * SPEED-SITE-1b — keep a prerendered page on screen until the page's own content has loaded.
 *
 * ★ THE DEFECT. An advertised page is served prerendered, and App's route boundary keeps that
 * markup on screen while the route's lazy chunk loads (App.tsx `RouteSuspenseFallback`). But a
 * page whose content arrives in a SECOND chunk (Notes: the chapter's spec JSON) commits as soon
 * as its own module is ready, with that content still missing — so the readable prerendered
 * body was swapped for a title over a blank area until the second chunk landed. Measured on
 * /notes/real-numbers (Lighthouse, applied mobile throttling): the body was blank from ~5.4 s to
 * ~7.9 s, and the content's re-appearance became the page's Largest Contentful Paint.
 *
 * ★ THE FIX. While App is still showing the prerendered markup (its `data-lt-route="prerendered"`
 * anchor is in the document), the page suspends on that second load instead of committing a
 * blank body, so the boundary keeps the prerendered markup up until the real content can replace
 * it. ONCE per key, and only then: a later visit, an in-app navigation (no prerendered anchor), a
 * non-prerendered page and a failed load (it resolves, the page then shows its own honest error)
 * all render exactly as before.
 */

/** The anchor App's route fallback renders while the first route shows its prerendered markup. */
export const PRERENDERED_ANCHOR_SELECTOR = 'template[data-lt-route="prerendered"]';

const holds = new Map<string, Promise<void>>();
const settled = new Set<string>();

/** Is App currently showing a prerendered route body (the first route of a prerendered page)? */
export function isShowingPrerenderedRoute(): boolean {
  try {
    return typeof document !== "undefined" && document.querySelector(PRERENDERED_ANCHOR_SELECTOR) !== null;
  } catch {
    return false;
  }
}

/**
 * Call during render, after the page's hooks, when the page's content is not loaded yet. If the
 * prerendered body is on screen, throws (suspends on) `load()` — at most once per `key`, and never
 * again once that load has settled either way. Otherwise returns and the page renders as before.
 */
export function holdPrerenderedRouteUntil(key: string, load: () => Promise<unknown>): void {
  if (settled.has(key)) return;
  let hold = holds.get(key);
  if (!hold) {
    if (!isShowingPrerenderedRoute()) return;
    hold = load().then(
      () => {
        settled.add(key);
      },
      () => {
        settled.add(key);
      },
    );
    holds.set(key, hold);
  }
  throw hold;
}

/** Tests only. */
export function __resetPrerenderHoldsForTests(): void {
  holds.clear();
  settled.clear();
}
