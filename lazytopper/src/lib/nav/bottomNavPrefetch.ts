// src/lib/nav/bottomNavPrefetch.ts
//
// SPEED-NAV-1 (8 Nov 2026) — start loading a BottomNav tab's page the moment the finger lands.
//
// Why: a tab tap navigates one frame after the tap (afterNextPaint) so the pressed tab paints
// first. On its own that makes the page ARRIVE a frame later. Starting the page's chunk on
// `pointerdown` (before the click, and through that frame) wins the time back: by the time the
// router asks for the page, its module is already fetched (and usually evaluated).
//
// The specifiers below are EXACTLY the ones App.tsx's route `lazy(() => import(...))` calls use,
// so the bundler resolves both to the SAME module and the SAME chunk — no new chunk, no second
// copy; the browser's module map hands the router's own import the already-loaded module.
// Keep the two in step: bottomNavPrefetch.test.ts pins each specifier to the route's in App.tsx.
//
// ★ NOT INSIDE THE POINTERDOWN. A dynamic import first inserts a <link rel=modulepreload> for every
// dependency chunk of the page (Vite's preload helper): measured 48 ms of the pointerdown event
// for /pricing at 4x CPU, which held back the press feedback. So the import starts in the task
// right after the next paint (afterNextPaint): on a phone that is still well before the finger
// lifts (the click), and it runs just before the deferred navigation, which then reuses it.
//
// A failed prefetch is ignored: the router's own import (lazyWithRetry) still does its
// retries exactly as before, so a prefetch can never turn into an error screen.

import { afterNextPaint } from "../afterNextPaint";

type Loader = () => Promise<unknown>;

/** BottomNav destination path (no query) -> the route's own page import. */
export const BOTTOM_NAV_PAGE_LOADERS: Readonly<Record<string, Loader>> = {
  "/browse": () => import("../../pages/app/MobileHome"),
  "/exam-trends": () => import("../../pages/ExamTrendsRanked"),
  "/practice-hub": () => import("../../pages/desktop/DesktopPracticePage"),
  "/check-improve": () => import("../../pages/desktop/DesktopCheckImprovePage"),
  "/pricing": () => import("../../pages/PricingPage"),
  "/me": () => import("../../pages/MeProgressPage"),
};

const started = new Set<string>();

/** Start loading the page for `to` (a BottomNav href, query allowed) after the next paint. Once per path; never throws. */
export function prefetchBottomNavPage(to: string): void {
  const path = to.split("?")[0];
  const load = BOTTOM_NAV_PAGE_LOADERS[path];
  if (!load || started.has(path)) return;
  started.add(path);
  afterNextPaint(() => {
    try {
      load().catch(() => {
        // Let a later tap try again; the router's own import handles retries for the real load.
        started.delete(path);
      });
    } catch {
      started.delete(path);
    }
  });
}

/** Test-only: forget which paths were started. */
export function resetBottomNavPrefetchForTests(): void {
  started.clear();
}
