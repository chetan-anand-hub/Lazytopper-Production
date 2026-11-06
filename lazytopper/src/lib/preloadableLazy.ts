/**
 * SPEED-SITE-2a — a lazily-loaded component that can also be PRELOADED, and that renders DIRECTLY (no Suspense
 * round) once its module is in memory.
 *
 * ★ WHY. Login, Welcome and DesktopShell used to be static imports of App.tsx, so every visitor downloaded and
 * ran them before first paint (~317 KB of the 866 KB entry chunk), on pages that use none of them. Making them
 * plain `lazy()` would move the code out, but a lazy component suspends on its FIRST render even when its chunk
 * has already arrived, and DesktopShell sits OUTSIDE the route boundaries, so a suspension there would replace a
 * prerendered page with a fallback. Instead:
 *   - main.tsx preloads the ones the FIRST route needs and renders once they are in (App.tsx `preloadFirstRoute`);
 *     the prerendered HTML stays on screen meanwhile, exactly as it does while the entry chunk runs;
 *   - a component whose module is already loaded when an instance mounts renders it directly, so the first commit
 *     is identical to the old static-import one;
 *   - otherwise (a later in-app navigation before the chunk came) it falls back to React's lazy, under the route's
 *     own Suspense boundary, like every other lazy route.
 * An instance keeps the path it mounted with, so a chunk landing mid-life never swaps the element type (that
 * would remount the subtree and lose its state).
 *
 * The chunk fetch retries a failed load exactly like `lazyWithRetry` (`importWithRetry`).
 */
import { createElement, lazy, useState, type ComponentType, type ReactElement } from "react";
import { importWithRetry } from "./lazyWithRetry";

export interface PreloadableComponent<P extends object> {
  (props: P): ReactElement;
  /** Fetch the module now (once). Never rejects; a failure is retried by the next preload or render. */
  preload: () => Promise<void>;
  /** Whether the module is in memory (an instance mounting now renders it directly). */
  isLoaded: () => boolean;
  displayName?: string;
}

export function preloadableLazy<P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>,
  displayName?: string,
): PreloadableComponent<P> {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<{ default: ComponentType<P> }> | null = null;

  const load = (): Promise<{ default: ComponentType<P> }> => {
    if (!pending) {
      pending = importWithRetry(factory).then(
        (module) => {
          loaded = module.default;
          return module;
        },
        (error: unknown) => {
          pending = null; // a later preload / render tries again
          throw error;
        },
      );
    }
    return pending;
  };

  const Lazy = lazy(load);

  function Preloadable(props: P): ReactElement {
    // Decided once per instance (see the header): direct if the module is already here.
    const [direct] = useState<ComponentType<P> | null>(() => loaded);
    return direct ? createElement(direct, props) : createElement(Lazy as unknown as ComponentType<P>, props);
  }
  Preloadable.preload = (): Promise<void> => load().then(
    () => undefined,
    () => undefined,
  );
  Preloadable.isLoaded = (): boolean => loaded !== null;
  if (displayName) Preloadable.displayName = displayName;
  return Preloadable;
}
