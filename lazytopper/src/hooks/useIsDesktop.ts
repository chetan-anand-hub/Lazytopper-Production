import { useEffect, useState } from "react";

/**
 * useIsDesktop — returns true when viewport width is ≥1024px.
 *
 * Used to conditionally mount the locked desktop AppShell + DesktopHome
 * (Desktop Phase 1) without disturbing any mobile route, mobile nav, or
 * mobile screen. SSR-safe (defaults to false when window is undefined).
 *
 * Threshold mirrors the locked desktop baseline workspace assumption that
 * the persistent left sidebar is only visible on tablet-landscape and up.
 */
const DESKTOP_QUERY = "(min-width: 1024px)";

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(DESKTOP_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    // Set initial in case it changed between SSR and mount
    setIsDesktop(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  return isDesktop;
}
