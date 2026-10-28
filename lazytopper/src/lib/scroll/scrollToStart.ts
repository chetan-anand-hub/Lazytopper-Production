/**
 * SCROLL-TOP-1 — where the student lands when content is swapped or opened.
 *
 * ★ THE ROOT CAUSE THIS FIXES. At desktop width the shell's `<main>` (DesktopShell.tsx,
 * `flex:1; overflow-y:auto`) is the ONLY scroll container: `window.scrollY` stays 0. Nothing in
 * the app reset ANY scroll on navigation, and the lone `window.scrollTo` calls in the product
 * are therefore no-ops on desktop. So an in-place swap (the Quick Practice set building on the
 * same route) or a route change from the bottom of a page left `<main>` where it was — the
 * student landed at the foot of the new content. On mobile the WINDOW scrolls, and the browser
 * does not reset it on a client-side push either.
 *
 * These helpers know about both containers and never assume either.
 */

/** True when the student asked the OS for less motion. */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function isScrollableY(el: Element): boolean {
  let overflowY = "";
  try {
    overflowY = window.getComputedStyle(el).overflowY;
  } catch {
    return false;
  }
  return (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") && el.scrollHeight > el.clientHeight;
}

/**
 * The nearest ancestor of `el` that really scrolls vertically, or `null` when the document
 * (the window) is the scroller — the mobile case, and any page outside the desktop shell.
 */
export function findScrollContainer(el: Element | null): HTMLElement | null {
  let node: Element | null = el ? el.parentElement : null;
  while (node && node !== document.body && node !== document.documentElement) {
    if (isScrollableY(node)) return node as HTMLElement;
    node = node.parentElement;
  }
  return null;
}

/**
 * Bring the START of `el` to the top of whichever container scrolls it (`topOffset` px of
 * breathing room, e.g. a sticky header). One-shot; never loops or re-asserts.
 */
export function scrollStartIntoView(
  el: Element | null | undefined,
  opts: { topOffset?: number; behavior?: "auto" | "smooth" } = {},
): boolean {
  if (!el) return false;
  const topOffset = opts.topOffset ?? 0;
  const behavior: ScrollBehavior = opts.behavior === "smooth" && !prefersReducedMotion() ? "smooth" : "auto";
  const container = findScrollContainer(el);
  const rect = el.getBoundingClientRect();
  try {
    if (container) {
      const top = container.scrollTop + (rect.top - container.getBoundingClientRect().top) - topOffset;
      if (typeof container.scrollTo === "function") container.scrollTo({ top: Math.max(0, top), behavior });
      else container.scrollTop = Math.max(0, top);
    } else {
      window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - topOffset), behavior });
    }
  } catch {
    return false;
  }
  return true;
}

/** Back to the top of the page, on the window AND on the shell's inner scroller(s). */
export function resetAppScroll(): void {
  try {
    window.scrollTo(0, 0);
  } catch {
    /* jsdom: not implemented */
  }
  if (typeof document === "undefined") return;
  const scroller = document.scrollingElement as HTMLElement | null;
  if (scroller && scroller.scrollTop !== 0) scroller.scrollTop = 0;
  document.querySelectorAll<HTMLElement>("main").forEach((m) => {
    if (m.scrollTop !== 0) m.scrollTop = 0;
  });
}
