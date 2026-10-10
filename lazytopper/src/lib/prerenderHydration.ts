/**
 * LOW-END-3 PR-2 (e): prerendered pages are HYDRATED, not replaced.
 *
 * THE DEFECT (measured, P6). Every advertised page is served with its body already in the
 * HTML. `main.tsx` used to mount with `createRoot`, whose first commit throws that body away
 * and builds React's own copy: the chrome is rebuilt, and the route region is re-inserted as
 * a CLONE of the prerendered markup until the route chunk arrives, then replaced a second
 * time by the real page. The browser therefore records LCP at React's re-render, not at first
 * paint (#963 cause B; FU-LE3-DEFERRED-BOOT-TO-PR2).
 *
 * WHY `hydrateRoot` ALONE DID NOT WORK (measured on a local build, every named page):
 *   1. The capture is a serialized browser DOM, not `renderToString` output, so it has no
 *      Suspense markers. React looks for `<!--$-->` at the route's `<Suspense>`, finds a
 *      `<template>`, and regenerates the WHOLE root (one recoverable error per page).
 *   2. With markers added, the route boundary stays dehydrated until the lazy route chunk
 *      resolves. Any update above it in that window (auth state, App's own effects) is not a
 *      transition, so React deletes the server markup and shows the fallback instead.
 *   3. Chrome the capture strips (`stripAuthChrome` in `scripts/seo/captureStaticBodies.ts`)
 *      is still rendered by the client's first pass: a mismatch, so the root is regenerated.
 *
 * THE FIX, ONE ANSWER PER CAUSE:
 *   1. `insertRouteSuspenseMarkers` wraps the route region (the two `data-lt-route` marks every
 *      route boundary renders) in the comments React's Suspense hydration expects. Comments
 *      take no layout and paint nothing.
 *   2. The route's own chunk is loaded BEFORE `hydrateRoot` is called (`lazyWithPreload`), and
 *      the lazy then resolves synchronously, so the boundary hydrates in the same pass as the
 *      chrome. Nothing is left dehydrated for an early update to throw away.
 *   3. `useHydrated` lets stripped chrome render nothing during hydration (matching the
 *      capture) and appear right after it. On the `createRoot` path it is `true` from the first
 *      render, so pages that are not hydrated behave exactly as before.
 *
 * Routes whose chrome cannot yet match the capture keep `createRoot` (see `hydratableRoutePreload`
 * in App.tsx): today that is the DesktopShell layout at >= 1024 px, whose Mistake Intel card
 * and greeting are stripped by the capture (FU-LE3-DESKTOP-SHELL-HYDRATION).
 */
import { lazy, useSyncExternalStore, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { importWithRetry } from "./lazyWithRetry";

/** The viewport query `useIsDesktop` uses; at or above it, shell routes render DesktopShell. */
export const DESKTOP_VIEWPORT_QUERY = "(min-width: 1024px)";

/** The attribute on the two `<template>` marks every route boundary renders (App.tsx). */
const ROUTE_MARK = "data-lt-route";

export type PreloadableLazy<T extends ComponentType<any>> = LazyExoticComponent<T> & { // eslint-disable-line @typescript-eslint/no-explicit-any -- mirrors React.lazy's own signature
  /** Loads the module (with the chunk-retry policy). Once settled, rendering never suspends. */
  preload: () => Promise<void>;
};

/**
 * `React.lazy` with chunk retry (as `lazyWithRetry`) plus `preload()`.
 *
 * React's lazy initializer calls `thenable.then(...)` and checks the status straight after.
 * Once the module has loaded, the factory returns a thenable that settles synchronously,
 * so the first render of a preloaded component does not suspend at all.
 */
export function lazyWithPreload<T extends ComponentType<any>>( // eslint-disable-line @typescript-eslint/no-explicit-any -- mirrors React.lazy's own signature
  factory: () => Promise<{ default: T }>,
): PreloadableLazy<T> {
  let loaded: { default: T } | null = null;
  let pending: Promise<{ default: T }> | null = null;
  const load = (): Promise<{ default: T }> => {
    if (!pending) {
      pending = importWithRetry(factory).then(
        (module) => {
          loaded = module;
          return module;
        },
        (error: unknown) => {
          pending = null;
          throw error;
        },
      );
    }
    return pending;
  };
  const component = lazy(() => {
    const module = loaded;
    if (module) {
      const settled = { then: (resolve: (value: { default: T }) => void) => resolve(module) };
      return settled as unknown as Promise<{ default: T }>;
    }
    return load();
  });
  return Object.assign(component, { preload: () => load().then(() => undefined) });
}

/**
 * Wrap the first route region under `container` in `<!--$-->` ... `<!--/$-->`, the markers
 * React's hydration expects at a completed Suspense boundary. The region is the start mark
 * through the LAST end mark among its siblings (the same pairing `extractPrerenderedRoute`
 * uses). Returns false, touching nothing, when there is no complete region.
 */
export function insertRouteSuspenseMarkers(container: Element): boolean {
  const region = routeRegionOf(container);
  if (!region) return false;
  const doc = container.ownerDocument;
  region.parent.insertBefore(doc.createComment("$"), region.start);
  region.parent.insertBefore(doc.createComment("/$"), region.end.nextSibling);
  return true;
}

function routeRegionOf(container: Element): { parent: Node; start: Element; end: Element } | null {
  const start = container.querySelector(`template[${ROUTE_MARK}="start"]`);
  const parent = start?.parentNode;
  if (!start || !parent) return null;
  let end: Element | null = null;
  for (let node = start.nextSibling; node; node = node.nextSibling) {
    if (node instanceof Element && node.tagName === "TEMPLATE" && node.getAttribute(ROUTE_MARK) === "end") end = node;
  }
  return end ? { parent, start, end } : null;
}

/** How long hydration waits for the route chunk before mounting as before (`createRoot`). */
export const HYDRATION_PRELOAD_TIMEOUT_MS = 10_000;

export interface MountOptions {
  /** The router path (pathname minus the basename). */
  path: string;
  /** `matchMedia(DESKTOP_VIEWPORT_QUERY).matches` at boot. */
  isDesktopViewport: boolean;
  /** The route chunk to load before hydrating, or null to keep `createRoot`. */
  preloadFor: (path: string, isDesktopViewport: boolean) => (() => Promise<void>) | null;
  /** The tree to hydrate the prerendered markup with. */
  hydrate: () => ReactNode;
  /** The tree to render with `createRoot`; built only on that path. */
  create: () => ReactNode;
  timeoutMs?: number;
  /** Passed to `hydrateRoot` (tests observe mismatches with it; the app keeps React's default). */
  onRecoverableError?: (error: unknown) => void;
}

/**
 * Mount the app into `container`: HYDRATE when it holds a prerendered route region whose page
 * can hydrate (after loading that route's chunk), otherwise `createRoot` exactly as before,
 * synchronously. A chunk that fails or takes longer than `timeoutMs` also falls back to
 * `createRoot`, which is today's behaviour, not a broken page.
 */
export async function mountApp(container: Element, options: MountOptions): Promise<"hydrated" | "created"> {
  // Hydrate only a URL the capture could have produced: no query and no router state.
  // The prerender file is captured with neither, and React 19 does NOT repair a mismatched
  // attribute while hydrating — `/notes/x?tab=questions` would keep the capture's active-tab
  // classes against a client state of "questions" (verifier, round 1). Such loads use createRoot.
  const pristineUrl = isPristineBootUrl();
  // Decide by the FILE that was served, not only the viewport: the middleware serves the
  // DesktopShell file to any desktop user agent, so a narrow desktop window would otherwise
  // hydrate mobile chrome against desktop markup. Only the mobile file carries MobileShell's
  // `.phone-shell`; markup without it is treated as the desktop file.
  const servedDesktopFile = !container.querySelector(".phone-shell");
  const preload =
    pristineUrl && routeRegionOf(container)
      ? options.preloadFor(options.path, options.isDesktopViewport || servedDesktopFile)
      : null;
  if (preload) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ready = await Promise.race([
      preload().then(
        () => true,
        () => false,
      ),
      new Promise<boolean>((done) => {
        timer = setTimeout(() => done(false), options.timeoutMs ?? HYDRATION_PRELOAD_TIMEOUT_MS);
      }),
    ]);
    clearTimeout(timer);
    if (ready && insertRouteSuspenseMarkers(container)) {
      hydrateRoot(
        container,
        options.hydrate(),
        options.onRecoverableError ? { onRecoverableError: options.onRecoverableError } : undefined,
      );
      return "hydrated";
    }
  }
  createRoot(container).render(options.create());
  return "created";
}

/** True when the boot URL has no query string and the history entry carries no router state. */
export function isPristineBootUrl(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.search !== "") return false;
  const state = window.history.state as { usr?: unknown } | null;
  return !(state && state.usr != null);
}

const subscribeNever = () => () => {};

/**
 * False while React is hydrating server markup, true on every other render. Use it to keep
 * nodes the prerender capture strips out of the hydration pass; they appear right after.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
