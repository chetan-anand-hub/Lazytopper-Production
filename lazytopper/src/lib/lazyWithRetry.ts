import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * CHUNK-RESILIENCE-1 (K2) — `React.lazy` that survives one dropped route chunk.
 *
 * WHY. A lazy route whose chunk request fails once (a crawler dropping a request, a
 * flaky mobile network) used to go straight to the global ErrorBoundary — "Something
 * went wrong" — which Google files as a Soft 404. The deploy-skew half of that failure
 * is fixed in `middleware.ts` (assets pinned to the page's deployment); this file is the
 * other half: a transient miss gets retried before anything renders an error.
 *
 * ★ THE SAME URL CANNOT BE RETRIED. Chromium's module map remembers a failed
 * `import()` for the life of the document: calling the same factory again replays the
 * cached failure WITHOUT touching the network (measured, Chromium 153: a second import
 * of the same URL failed again and the server saw no second request). The retry
 * therefore imports the failed module's URL with `?retry=<n>` — a new module-map key,
 * a real request. (Firefox 155 and WebKit 26.6 do re-request the same URL; the query
 * form works in all three.)
 *
 * ★ ONLY A MODULE-FETCH FAILURE IS RETRIED. The messages are engine-specific (CHUNK-
 * RESILIENCE-1 §0b P10, measured with Playwright against a 404 and a text/html 200):
 *   Chromium  "Failed to fetch dynamically imported module: <url>"      (404 and bad MIME)
 *   Firefox   "error loading dynamically imported module: <url>"        (404 and bad MIME)
 *   WebKit    "Importing a module script failed."                       (404 — no URL)
 *   WebKit    "'text/html' is not a valid JavaScript MIME type for module script '<url>'."
 * Anything else — an error thrown while the module EVALUATES, a render bug — is a real
 * bug, and retrying it would only delay the same error, so it rethrows at once.
 *
 * When the URL is not in the message (WebKit), the factory is called ONCE more and the
 * result, success or failure, stands.
 *
 * The factories this wraps are plain `() => import("./pages/X")` (App.tsx). A URL retry
 * returns that module's namespace, so the retried module must carry a `default` export;
 * if it does not, the original error is rethrown rather than handing React.lazy an
 * undefined component.
 */

/** Delays before retry 1 and retry 2 (K2: 300 ms, then 1 s). */
export const RETRY_DELAYS_MS: readonly number[] = [300, 1000];

const CHUNK_ERROR_PATTERNS: readonly RegExp[] = [
  /Failed to fetch dynamically imported module/i, // Chromium
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // WebKit, failed fetch
  /is not a valid JavaScript MIME type for module script/i, // WebKit, wrong MIME
];

function messageOf(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return typeof error === "string" ? error : "";
}

/** True only for a failed module FETCH (the P10 messages), never for any other error. */
export function isChunkLoadError(error: unknown): boolean {
  const message = messageOf(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * The failed module's URL, when the engine puts it in the message (Chromium, Firefox),
 * with any `retry` parameter from an earlier attempt removed. `null` when absent (WebKit).
 */
export function failedModuleUrl(error: unknown): string | null {
  if (!isChunkLoadError(error)) return null;
  const match = /(https?:\/\/[^\s'"]+)/i.exec(messageOf(error));
  if (!match) return null;
  try {
    const url = new URL(match[1]);
    url.searchParams.delete("retry");
    return url.toString();
  } catch {
    return null;
  }
}

/** `url` with `retry=<attempt>` set — a module-map key the failed import never used. */
export function retryUrl(url: string, attempt: number): string {
  const next = new URL(url);
  next.searchParams.set("retry", String(attempt));
  return next.toString();
}

export interface RetryOptions<T> {
  /** Imports a module by absolute URL. Injected by tests; the default is a native import(). */
  importUrl?: (url: string) => Promise<T>;
  /** Waits `ms`. Injected by tests. */
  sleep?: (ms: number) => Promise<void>;
}

function nativeImport<T>(url: string): Promise<T> {
  return import(/* @vite-ignore */ url) as Promise<T>;
}
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function hasDefaultExport(module: unknown): boolean {
  return !!module && typeof module === "object" && "default" in module && (module as { default: unknown }).default != null;
}

/** Runs `factory`, retrying a failed module fetch as described above. */
export async function importWithRetry<T>(
  factory: () => Promise<T>,
  options: RetryOptions<T> = {},
): Promise<T> {
  const importUrl = options.importUrl ?? nativeImport<T>;
  const sleep = options.sleep ?? wait;

  let firstError: unknown;
  try {
    return await factory();
  } catch (error) {
    if (!isChunkLoadError(error)) throw error;
    firstError = error;
  }

  const url = failedModuleUrl(firstError);
  if (url === null) {
    // URL not recoverable (WebKit): one more call of the factory, then its result stands.
    await sleep(RETRY_DELAYS_MS[0]);
    return factory();
  }

  let lastError: unknown = firstError;
  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    await sleep(RETRY_DELAYS_MS[attempt - 1]);
    let module: T;
    try {
      module = await importUrl(retryUrl(url, attempt));
    } catch (error) {
      if (!isChunkLoadError(error)) throw error;
      lastError = error;
      continue;
    }
    if (!hasDefaultExport(module)) throw firstError;
    return module;
  }
  throw lastError;
}

/** Drop-in for React's `lazy` with the chunk retry above. Same signature. */
export function lazyWithRetry<T extends ComponentType<any>>( // eslint-disable-line @typescript-eslint/no-explicit-any -- mirrors React.lazy's own signature
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() => importWithRetry(factory));
}
