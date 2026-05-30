/**
 * Grammar design tokens — the canonical literal values for the shared responsive
 * primitives. These mirror the constants used in the locked desktop pages
 * (DesktopPracticePage / DesktopHome) so the primitives read identically to the
 * existing product grammar. Kept as HSL/hex literals (the same idiom the desktop
 * pages use) so the primitives are self-contained and theme-driven without a new
 * stylesheet dependency.
 *
 * Breakpoint: 1024px — matches `useIsDesktop` (`min-width: 1024px`). Reflow rules
 * in the primitives collapse to the mobile layout at `max-width: 1023px`.
 */
export const GREEN = "hsl(152, 55%, 45%)";
export const GREEN_SOFT = "hsl(152, 55%, 95%)";
export const GREEN_RING = "hsla(152, 55%, 45%, 0.30)";
export const GREEN_DARK = "hsl(152, 60%, 30%)";

export const FG = "hsl(220, 25%, 12%)";
export const MUTED = "hsl(220, 15%, 42%)";
export const BORDER = "hsl(220, 18%, 90%)";
export const CARD_BG = "#ffffff";
export const SECTION_BG = "hsl(210, 40%, 98%)";
export const PILL_BG = "hsl(210, 33%, 96%)";
export const PILL_FG = "hsl(220, 25%, 22%)";

export const FONT_DISPLAY = '"Fraunces", Georgia, serif';
export const FONT_BODY =
  '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

/** Desktop breakpoint in px — primitives reflow below this width. */
export const DESKTOP_MIN_WIDTH = 1024;
