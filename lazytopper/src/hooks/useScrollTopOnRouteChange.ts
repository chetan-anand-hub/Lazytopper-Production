import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { resetAppScroll } from "../lib/scroll/scrollToStart";

/** Navigation state a caller can set to keep the scroll position across a path change. */
export const PRESERVE_SCROLL_STATE_KEY = "preserveScroll" as const;

/**
 * SCROLL-TOP-1 — a new PATH opens at the top.
 *
 * Fires on a `pathname` change only. NOT on a query-only change (filters live in the query),
 * NOT on Back/Forward (POP), NOT when the URL carries a `#hash` whose target is already on the page (it keeps its own anchor
 * scroll; a target that mounts later — PacksStrip's `/pricing#packs` — starts from the top and scrolls itself), and NOT when the navigation state says `{ preserveScroll: true }`. The
 * first render is skipped: a reload keeps whatever the browser restores.
 */
/** True when the element a `#hash` names is in the document now. */
function hashTargetPresent(hash: string): boolean {
  try {
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    return id !== "" && typeof document !== "undefined" && document.getElementById(id) !== null;
  } catch {
    return true; // unreadable hash: leave the scroll alone, as before
  }
}

export function useScrollTopOnRouteChange(): void {
  const { pathname, hash, state } = useLocation();
  const navType = useNavigationType();
  const prev = useRef<string | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = pathname;
    if (before === null || before === pathname) return;
    // A hash whose target is already on the page keeps its own anchor scroll. BUY-PATH-1: a hash whose target is NOT there yet
    // (/pricing#cbq, /pricing#packs - the strip mounts lazily, after this) starts the new page at the top, so the visitor never
    // lands mid-way down a page they did not ask for; the lazy target then scrolls itself into view when it mounts.
    if (hash && hashTargetPresent(hash)) return;
    // Back/Forward (POP) must not jump to the top: leave the position to the browser.
    if (navType === "POP") return;
    if (state && typeof state === "object" && (state as Record<string, unknown>)[PRESERVE_SCROLL_STATE_KEY] === true) return;
    resetAppScroll();
  }, [pathname, hash, state, navType]);
}

/**
 * SCROLL-TOP-1 — a whole-page IN-PLACE swap (Chapter Test setup → taking → results, Full Mock,
 * the Worksheet build → preview → generated views) opens at the top. Pass the value that names
 * the swap; the first render is skipped, and the same value never re-fires.
 */
export function useScrollTopOnChange(key: string): void {
  const prev = useRef<string | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = key;
    if (before === null || before === key) return;
    resetAppScroll();
  }, [key]);
}
