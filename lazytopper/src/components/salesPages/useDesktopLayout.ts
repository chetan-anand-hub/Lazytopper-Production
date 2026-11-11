import { useEffect, useState } from "react";

/**
 * The app's layout switch (>= 1024 px), read SYNCHRONOUSLY so the first render already places the desktop columns (the same rule as
 * PricingPage's useDesktop and the island's DESKTOP_QUERY). The prerender is captured at 390 px and at 1280 px, one file each.
 */
export const DESKTOP_QUERY = "(min-width: 1024px)";

function readDesktop(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(DESKTOP_QUERY).matches;
  } catch {
    return false;
  }
}

export function useDesktopLayout(): boolean {
  const [desktop, setDesktop] = useState(readDesktop);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return desktop;
}
