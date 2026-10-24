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

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export interface ChunkReloadDeps {
  /** `null` = storage unavailable. Default: window.sessionStorage (read inside a try). */
  storage?: StorageLike | null;
  now?: () => number;
  fetchFn?: (url: string, init: { cache: "reload" }) => Promise<unknown>;
  reload?: () => void;
  /** Cap on the cache-overwrite fetches. */
  timeoutMs?: number;
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

/** The failed chunk's URL and the `?retry=<n>` variants the retries may have cached a 404 for. */
export function urlsToRefresh(error: unknown): string[] {
  const url = failedModuleUrl(error);
  if (url === null) return [];
  const urls = [url];
  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length; attempt += 1) urls.push(retryUrl(url, attempt));
  return urls;
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
    const storage = deps.storage === undefined ? defaultStorage() : deps.storage;
    const now = (deps.now ?? Date.now)();
    if (!claimChunkReload(storage, now)) return false;

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
    const settled = urlsToRefresh(error).map((url) => {
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
