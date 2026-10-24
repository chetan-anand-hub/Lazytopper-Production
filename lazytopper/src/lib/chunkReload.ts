import { isChunkLoadError, failedModuleUrl, RETRY_DELAYS_MS, retryUrl } from "./lazyWithRetry";

/**
 * ASSET-RELOAD-1 (B) — recover from a lost chunk by reloading ONCE, instead of showing
 * "Something went wrong".
 *
 * WHY. After a deploy, a tab (or a second tab that re-pinned the shared `__vdpl` cookie) can
 * ask for a hashed chunk its pinned deployment no longer serves. `importWithRetry` has then
 * already retried and given up. The page itself is fine; a full reload fetches fresh HTML and
 * the matching chunks. So the error boundary reloads once before it ever paints an error.
 *
 * ★ CANNOT LOOP. A `sessionStorage` timestamp allows at most one automatic reload per tab per
 * 60 s. Storage unavailable or throwing (private modes, blocked site data) means NO automatic
 * reload — we fall through to today's error screen rather than risk a reload loop.
 *
 * ★ A CACHED 404 SURVIVES A RELOAD. A missing /assets file used to be answered
 * `404` + `Cache-Control: immutable`, which the browser keeps for a year. Before reloading we
 * re-fetch the failed URL with `cache: "reload"` (best effort, ~3 s cap, errors ignored) so a
 * good response overwrites the stored 404.
 */

/** sessionStorage key. Mirrored by the inline net in index.html (a guard test pins both). */
export const CHUNK_RELOAD_KEY = "lazytopper.chunkReloadAt";

/** At most one automatic reload per this many ms, per tab. */
export const CHUNK_RELOAD_WINDOW_MS = 60_000;

/** How long the cache-overwrite fetches may hold the reload back. */
export const CACHE_REFRESH_TIMEOUT_MS = 3000;

/** At most this many URLs are re-fetched before a reload (error URL first, then failed entries). */
export const MAX_REFRESH_URLS = 10;

/** The slice of a PerformanceResourceTiming that failure detection reads. */
export interface ResourceEntryLike {
  name: string;
  responseStatus?: number;
  transferSize?: number;
  decodedBodySize?: number;
  encodedBodySize?: number;
}

/**
 * Same-origin /assets/ resources that FAILED to load, from resource timing: `responseStatus`
 * >= 400 where the browser reports it, otherwise (status absent or 0) an all-zero-size .js/.css
 * entry. De-duplicated, in order, at most `cap`. Never throws. This is what covers WebKit,
 * whose chunk error names no URL.
 */
export function collectFailedAssetUrls(
  entries: ReadonlyArray<ResourceEntryLike>,
  origin: string,
  cap: number = MAX_REFRESH_URLS,
): string[] {
  const out: string[] = [];
  try {
    for (const entry of entries) {
      if (out.length >= cap) break;
      let url: URL;
      try {
        url = new URL(entry.name);
      } catch {
        continue;
      }
      if (url.origin !== origin || !url.pathname.startsWith("/assets/")) continue;
      const status = entry.responseStatus;
      const failed =
        typeof status === "number" && status > 0
          ? status >= 400
          : entry.transferSize === 0 &&
            entry.decodedBodySize === 0 &&
            entry.encodedBodySize === 0 &&
            /\.(js|css)$/i.test(url.pathname);
      if (failed && !out.includes(entry.name)) out.push(entry.name);
    }
  } catch {
    // best effort
  }
  return out;
}

function defaultEntries(): ReadonlyArray<ResourceEntryLike> {
  try {
    return typeof performance === "undefined" ? [] : (performance.getEntriesByType("resource") as ResourceEntryLike[]);
  } catch {
    return [];
  }
}

function defaultOrigin(): string {
  try {
    return window.location.origin;
  } catch {
    return "";
  }
}

let reloadPending = false;

/** True once this page has started its one automatic reload. */
export function isChunkReloadPending(): boolean {
  return reloadPending;
}

/** Test-only: forget a pending reload. */
export function resetChunkReloadPending(): void {
  reloadPending = false;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export interface ChunkReloadDeps {
  /** `null` = storage unavailable. Default: window.sessionStorage (read inside a try). */
  storage?: StorageLike | null;
  now?: () => number;
  fetchFn?: (url: string, init: { cache: "reload" }) => Promise<unknown>;
  reload?: () => void;
  /** Cap on the cache-overwrite fetches. */
  timeoutMs?: number;
  /** Resource-timing entries (default: performance.getEntriesByType("resource")). */
  entries?: () => ReadonlyArray<ResourceEntryLike>;
  origin?: string;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Claims this tab's one automatic reload. True = the caller may reload now (the timestamp is
 * already written). False = the guard fired within the window, or storage is unusable.
 */
export function claimChunkReload(storage: StorageLike | null, now: number): boolean {
  if (storage === null) return false;
  try {
    const last = Number(storage.getItem(CHUNK_RELOAD_KEY));
    const elapsed = now - last;
    if (Number.isFinite(last) && last > 0 && elapsed >= 0 && elapsed < CHUNK_RELOAD_WINDOW_MS) return false;
    storage.setItem(CHUNK_RELOAD_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

/**
 * What to re-fetch before reloading: the failed chunk's URL and its `?retry=<n>` variants (when
 * the engine names the URL), then every failed same-origin /assets/ entry in `failed`.
 * De-duplicated, capped at MAX_REFRESH_URLS.
 */
export function urlsToRefresh(error: unknown, failed: ReadonlyArray<string> = []): string[] {
  const urls: string[] = [];
  const url = failedModuleUrl(error);
  if (url !== null) {
    urls.push(url);
    for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length; attempt += 1) urls.push(retryUrl(url, attempt));
  }
  for (const u of failed) if (!urls.includes(u)) urls.push(u);
  return urls.slice(0, MAX_REFRESH_URLS);
}

/**
 * If `error` is a lost chunk and this tab has not auto-reloaded in the last minute, starts the
 * cache-overwrite + reload and returns true (the caller shows a neutral "updating" state, not an
 * error). Returns false for anything else — a non-chunk error, a second failure inside the
 * window, unusable storage — and the caller shows its normal error screen. Never throws.
 */
export function recoverFromChunkError(error: unknown, deps: ChunkReloadDeps = {}): boolean {
  try {
    if (!isChunkLoadError(error)) return false;
    // A second boundary on the same page: the reload is already under way; do not claim again.
    if (reloadPending) return true;
    const storage = deps.storage === undefined ? defaultStorage() : deps.storage;
    const now = (deps.now ?? Date.now)();
    if (!claimChunkReload(storage, now)) return false;
    reloadPending = true;

    const reload = deps.reload ?? (() => window.location.reload());
    const fetchFn = deps.fetchFn ?? ((url, init) => fetch(url, init));
    const timeoutMs = deps.timeoutMs ?? CACHE_REFRESH_TIMEOUT_MS;

    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      try {
        reload();
      } catch {
        // nothing further to try
      }
    };
    setTimeout(go, timeoutMs);
    const failed = collectFailedAssetUrls((deps.entries ?? defaultEntries)(), deps.origin ?? defaultOrigin());
    const settled = urlsToRefresh(error, failed).map((url) => {
      try {
        return Promise.resolve(fetchFn(url, { cache: "reload" })).then(
          () => undefined,
          () => undefined,
        );
      } catch {
        return Promise.resolve();
      }
    });
    void Promise.all(settled).then(go);
    return true;
  } catch {
    return false;
  }
}
