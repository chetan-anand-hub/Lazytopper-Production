import "@testing-library/jest-dom";
import { afterEach } from "vitest";

/**
 * Vitest global setup.
 *
 * 1. Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc).
 * 2. Polyfills `window.matchMedia`, which jsdom does NOT implement. Several
 *    hooks (e.g. `useIsDesktop`) call `window.matchMedia(...)` on mount, so
 *    without this polyfill every responsive render test throws at import time.
 *
 * The polyfill is CONFIGURABLE per-test via `setMatchMediaMatches(...)`, so a
 * later PR can render the same component as desktop or mobile. It defaults to
 * `false` (mobile / "does not match"), mirroring the app's SSR-safe default in
 * `useIsDesktop`. Both the modern (`addEventListener`/`removeEventListener`)
 * and legacy (`addListener`/`removeListener`) MediaQueryList event APIs are
 * provided because `useIsDesktop` feature-detects and falls back to the legacy
 * pair.
 */

const DEFAULT_MATCHES = false;

let currentMatches: (query: string) => boolean = () => DEFAULT_MATCHES;

/**
 * Override what `window.matchMedia(query).matches` returns for the duration of
 * a test. Pass a boolean to force every query to that value (the common case —
 * `true` = desktop, `false` = mobile), or a predicate for per-query control.
 * Automatically reset to the default after each test.
 */
export function setMatchMediaMatches(matches: boolean | ((query: string) => boolean)): void {
  currentMatches = typeof matches === "function" ? matches : () => matches;
}

function installMatchMedia(): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList => {
      const list: MediaQueryList = {
        get matches() {
          return currentMatches(query);
        },
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        // Deprecated MediaQueryList API — kept for hooks that fall back to it.
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      };
      return list;
    },
  });
}

// Suites that opt into `// @vitest-environment node` have no `window`; the global
// setupFiles still runs for them, so guard the matchMedia polyfill on a real DOM.
if (typeof window !== "undefined") {
  installMatchMedia();
}

afterEach(() => {
  currentMatches = () => DEFAULT_MATCHES;
});
