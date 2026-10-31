/**
 * LADDER-NAV-1 — bring one element into view ONCE, clear of the mobile BottomNav.
 *
 * The ladder's verdict button and the photo CTA appear BELOW the fold after a tap; at phone width the fixed
 * BottomNav then covers them (or they are off-screen with nothing to say so). `scrollIntoView({block:"nearest"})`
 * is a no-op when the element is already fully visible (desktop), and the element's `scroll-margin-bottom`
 * (the `.ci-nav-clear` class: --mob-nav-height + safe-area) keeps it above the nav when it does scroll.
 * Smooth unless the student prefers reduced motion. Never throws (jsdom has no scrollIntoView).
 */
import { useEffect, type RefObject } from "react";

export function useClearBottomNav(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el || typeof el.scrollIntoView !== "function") return;
    let reduced = false;
    try {
      reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reduced = false;
    }
    el.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    // Once per activation; the ref is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
