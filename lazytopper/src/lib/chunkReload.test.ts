import { describe, expect, it, vi } from "vitest";
import {
  CHUNK_RELOAD_KEY,
  CHUNK_RELOAD_WINDOW_MS,
  claimChunkReload,
  recoverFromChunkError,
  urlsToRefresh,
} from "./chunkReload";

/** ASSET-RELOAD-1 (B) — one guarded automatic reload before any error screen. */
const URL_ = "https://www.lazytopper.com/assets/PricingPage-BvCbdRTL.js";
const chunkError = () => new TypeError(`Failed to fetch dynamically imported module: ${URL_}?retry=2`);

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

function deps(storage: ReturnType<typeof memoryStorage> | null, now = 1_000_000) {
  const reload = vi.fn();
  const fetchFn = vi.fn(async (_url: string, _init: { cache: "reload" }) => ({ status: 200 }));
  return { reload, fetchFn, d: { storage, now: () => now, reload, fetchFn, timeoutMs: 50 } };
}

describe("recoverFromChunkError", () => {
  it("first chunk failure: cache-reload fetch of the URL (and retry variants), then exactly one reload", async () => {
    const storage = memoryStorage();
    const { reload, fetchFn, d } = deps(storage);
    expect(recoverFromChunkError(chunkError(), d)).toBe(true);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(fetchFn.mock.calls.map((c) => c[0])).toEqual([URL_, `${URL_}?retry=1`, `${URL_}?retry=2`]);
    for (const call of fetchFn.mock.calls) expect(call[1]).toEqual({ cache: "reload" });
    expect(storage.data[CHUNK_RELOAD_KEY]).toBe("1000000");
    await new Promise((r) => setTimeout(r, 80)); // the timeout fallback must not reload twice
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("second failure within 60 s: no reload, no fetch -> the error screen stays", async () => {
    const storage = memoryStorage({ [CHUNK_RELOAD_KEY]: String(1_000_000 - (CHUNK_RELOAD_WINDOW_MS - 1)) });
    const { reload, fetchFn, d } = deps(storage);
    expect(recoverFromChunkError(chunkError(), d)).toBe(false);
    await new Promise((r) => setTimeout(r, 80));
    expect(reload).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("a failure 60 s or more after the last reload is allowed again", () => {
    const storage = memoryStorage({ [CHUNK_RELOAD_KEY]: String(1_000_000 - CHUNK_RELOAD_WINDOW_MS) });
    expect(recoverFromChunkError(chunkError(), deps(storage).d)).toBe(true);
  });

  it("storage that throws (read or write) or is absent: no reload", async () => {
    const readThrows = { getItem: () => { throw new Error("denied"); }, setItem: () => undefined };
    const writeThrows = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    for (const storage of [readThrows, writeThrows]) {
      const reload = vi.fn();
      const fetchFn = vi.fn(async (_url: string, _init: { cache: "reload" }) => ({}));
      expect(recoverFromChunkError(chunkError(), { storage, now: () => 5, reload, fetchFn, timeoutMs: 20 })).toBe(false);
      await new Promise((r) => setTimeout(r, 40));
      expect(reload).not.toHaveBeenCalled();
      expect(fetchFn).not.toHaveBeenCalled();
    }
    const { reload, d } = deps(null);
    expect(recoverFromChunkError(chunkError(), d)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("a NON-chunk error: no reload, guard untouched", () => {
    const storage = memoryStorage();
    const { reload, d } = deps(storage);
    expect(recoverFromChunkError(new TypeError("Cannot read properties of undefined"), d)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(storage.data[CHUNK_RELOAD_KEY]).toBeUndefined();
  });

  it("failing or hanging fetches do not stop the reload (timeout cap)", async () => {
    const reload = vi.fn();
    const fetchFn = vi.fn((_url: string, _init: { cache: "reload" }) => new Promise<never>(() => undefined));
    recoverFromChunkError(chunkError(), { storage: memoryStorage(), now: () => 9, reload, fetchFn, timeoutMs: 30 });
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it("WebKit's URL-less message still reloads, with nothing to re-fetch", async () => {
    const e = new TypeError("Importing a module script failed.");
    expect(urlsToRefresh(e)).toEqual([]);
    const { reload, fetchFn, d } = deps(memoryStorage());
    expect(recoverFromChunkError(e, d)).toBe(true);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("claimChunkReload ignores a garbage or future timestamp rather than blocking forever", () => {
    expect(claimChunkReload(memoryStorage({ [CHUNK_RELOAD_KEY]: "garbage" }), 100)).toBe(true);
    expect(claimChunkReload(memoryStorage({ [CHUNK_RELOAD_KEY]: "999999999" }), 100)).toBe(true);
  });
});

