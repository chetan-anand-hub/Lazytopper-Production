/**
 * LADDER-NAV-1 — bring one element into view ONCE, clear of the mobile BottomNav.
 *
 * The ladder's verdict button and the photo CTA appear BELOW the fold after a tap; at phone width the fixed
 * BottomNav then covers them (or they are off-screen with nothing to say so). `scrollIntoView({block:"nearest"})`
 * is a no-op when the element is already fully visible (desktop), and the element's `scroll-margin-bottom`
 * (the `.ci-nav-clear` class: --mob-nav-height + safe-area) keeps it above the nav when it does scroll.
 * Smooth unless the student prefers reduced motion. Never throws (jsdom has no scrollIntoView).
 *
 * SPEED-CI-3 (review of #1641, B1) — `keep`: an element that must STAY on screen. The ladder passes its mark line
 * ("✓ 1/1" / "✗ 0/1 Right answer: …"): a verdict box taller than the screen used to be aligned by its top, which
 * scrolled the student's own mark (and the coloured options) above the screen. With `keep`, the page scrolls only as
 * far as the box needs AND never past `keep`'s top (less its `scroll-margin-top`); if `keep` itself is off-screen it is
 * brought in. No height is assumed: everything is read from the laid-out page.
 */
import { useEffect, type RefObject } from "react";

/** How far to scroll (px, + = down) so `box`'s bottom clears the nav without `keep`'s top leaving the screen. Pure. */
export function clearScrollDelta(
  box: { bottom: number },
  keep: { top: number; bottom: number },
  view: { height: number; bottomClear: number; topClear: number },
): number {
  const floor = view.height - view.bottomClear;
  if (keep.top < view.topClear) return keep.top - view.topClear; // the mark is above the screen: bring it back
  const want = box.bottom - floor; // what the box needs to clear the nav
  if (want <= 0) return 0;
  return Math.max(0, Math.min(want, keep.top - view.topClear)); // ...but never past the mark
}

function px(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function useClearBottomNav(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  keep?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    let reduced = false;
    try {
      reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reduced = false;
    }
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
    const mark = keep?.current ?? null;
    if (!mark) {
      if (typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest", behavior });
      return;
    }
    try {
      const style = window.getComputedStyle(el);
      const dy = clearScrollDelta(el.getBoundingClientRect(), mark.getBoundingClientRect(), {
        height: window.innerHeight,
        bottomClear: px(style.scrollMarginBottom),
        topClear: px(window.getComputedStyle(mark).scrollMarginTop),
      });
      if (dy !== 0 && typeof window.scrollBy === "function") window.scrollBy({ top: dy, behavior });
    } catch {
      /* never throws */
    }
    // Once per activation; the refs are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
