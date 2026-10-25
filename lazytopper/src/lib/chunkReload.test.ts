import { isChunkLoadError, LOAD_ID } from "./lazyWithRetry";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHUNK_RELOAD_KEY,
  CHUNK_RELOAD_WINDOW_MS,
  claimChunkReload,
  collectFailedAssetUrls,
  isChunkReloadPending,
  MAX_REFRESH_URLS,
  PIN_REFRESH_PATH,
  refreshPinViaFrame,
  resetChunkReloadPending,
  recoverFromChunkError,
  urlsToRefresh,
} from "./chunkReload";

/** ASSET-RELOAD-1 (B) — one guarded automatic reload before any error screen. */
const URL_ = "https://www.lazytopper.com/assets/PricingPage-BvCbdRTL.js";
const chunkError = () => new TypeError(`Failed to fetch dynamically imported module: ${URL_}?retry=2&v=${LOAD_ID}`);

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
  const refreshPin = vi.fn(async () => undefined);
  return { reload, fetchFn, refreshPin, d: { storage, now: () => now, reload, fetchFn, refreshPin, timeoutMs: 50 } };
}

describe("recoverFromChunkError", () => {
  it("first chunk failure: cache-reload fetch of the URL (and retry variants), then exactly one reload", async () => {
    const storage = memoryStorage();
    const { reload, fetchFn, d } = deps(storage);
    expect(recoverFromChunkError(chunkError(), d)).toBe(true);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(fetchFn.mock.calls.map((c) => c[0])).toEqual([URL_, `${URL_}?retry=1&v=${LOAD_ID}`, `${URL_}?retry=2&v=${LOAD_ID}`]);
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
    recoverFromChunkError(chunkError(), { storage: memoryStorage(), now: () => 9, reload, fetchFn, refreshPin: async () => undefined, timeoutMs: 30 });
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


const ORIGIN = "https://www.lazytopper.com";
const A = (n: string) => `${ORIGIN}/assets/${n}`;
const bad = (name: string) => ({ name, responseStatus: 404, transferSize: 0, decodedBodySize: 0, encodedBodySize: 0 });
const good = (name: string) => ({ name, responseStatus: 200, transferSize: 900, decodedBodySize: 2000, encodedBodySize: 900 });

afterEach(() => resetChunkReloadPending());

describe("collectFailedAssetUrls", () => {
  it("takes same-origin /assets/ entries with responseStatus >= 400 and skips good, foreign and non-asset ones", () => {
    const got = collectFailedAssetUrls(
      [
        bad(A("PricingPage-BvCbdRTL.js")),
        good(A("index-Dv2RY8qK.js")),
        bad("https://cdn.example.com/assets/x.js"),
        bad(`${ORIGIN}/api/thing`),
        { ...bad(A("styles-AbC.css")), responseStatus: 500 },
        bad("not a url"),
      ],
      ORIGIN,
    );
    expect(got).toEqual([A("PricingPage-BvCbdRTL.js"), A("styles-AbC.css")]);
  });

  it("falls back to all-zero sizes for a .js/.css entry when responseStatus is absent or 0, but not for others", () => {
    const zero = { transferSize: 0, decodedBodySize: 0, encodedBodySize: 0 };
    const got = collectFailedAssetUrls(
      [
        { name: A("a-1.js"), ...zero },
        { name: A("b-2.css?x=1"), responseStatus: 0, ...zero },
        { name: A("logo-3.png"), ...zero },
        { name: A("cached-4.js"), transferSize: 0, decodedBodySize: 5000, encodedBodySize: 1500 },
        { name: A("ok-5.js"), responseStatus: 200, ...zero },
      ],
      ORIGIN,
    );
    expect(got).toEqual([A("a-1.js"), A("b-2.css?x=1")]);
  });

  it("de-duplicates and caps at 10", () => {
    const many = Array.from({ length: 25 }, (_, i) => bad(A(`c-${i}.js`)));
    const got = collectFailedAssetUrls([bad(A("c-0.js")), ...many], ORIGIN);
    expect(got.length).toBe(MAX_REFRESH_URLS);
    expect(new Set(got).size).toBe(got.length);
  });

  it("never throws on junk entries", () => {
    expect(collectFailedAssetUrls([null as never, undefined as never, {} as never], ORIGIN)).toEqual([]);
  });
});

describe("urlsToRefresh / recoverFromChunkError with failed entries", () => {
  const webkit = () => new TypeError("Importing a module script failed.");

  it("a WebKit-style error with no URL still collects the failed entries", () => {
    expect(isChunkLoadError(webkit())).toBe(true);
    expect(urlsToRefresh(webkit(), [A("x.js"), A("y.js")])).toEqual([A("x.js"), A("y.js")]);
    expect(urlsToRefresh(webkit())).toEqual([]);
  });

  it("error URL and its retry variants come first, failed entries are appended without duplicates, total capped", () => {
    const failed = Array.from({ length: 20 }, (_, i) => (i === 0 ? URL_ : A(`f-${i}.js`)));
    const urls = urlsToRefresh(chunkError(), failed);
    expect(urls.slice(0, 3)).toEqual([URL_, `${URL_}?retry=1&v=${LOAD_ID}`, `${URL_}?retry=2&v=${LOAD_ID}`]);
    expect(urls.length).toBe(MAX_REFRESH_URLS);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("recoverFromChunkError re-fetches resource-timing failures (WebKit error, no URL) before the one reload", async () => {
    const { reload, fetchFn, d } = deps(memoryStorage());
    const entries = () => [bad(A("DesktopPracticePage-Cid2pRiK.js")), good(A("index-ok.js"))];
    expect(recoverFromChunkError(webkit(), { ...d, entries, origin: ORIGIN })).toBe(true);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(fetchFn.mock.calls.map((c) => c[0])).toEqual([A("DesktopPracticePage-Cid2pRiK.js")]);
  });
});

describe("reloadPending: a second boundary on the same page", () => {
  it("returns true (recovering) without claiming the guard or reloading again", async () => {
    const storage = memoryStorage();
    const { reload, d } = deps(storage);
    expect(recoverFromChunkError(chunkError(), d)).toBe(true);
    expect(isChunkReloadPending()).toBe(true);
    const stamp = storage.data[CHUNK_RELOAD_KEY];
    const second = deps(storage, 2_000_000);
    expect(recoverFromChunkError(chunkError(), second.d)).toBe(true);
    expect(storage.data[CHUNK_RELOAD_KEY]).toBe(stamp);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(second.reload).not.toHaveBeenCalled();
    expect(second.fetchFn).not.toHaveBeenCalled();
  });

  it("a non-chunk error is still false while a reload is pending", () => {
    recoverFromChunkError(chunkError(), deps(memoryStorage()).d);
    expect(recoverFromChunkError(new Error("render bug"), deps(memoryStorage()).d)).toBe(false);
  });
});

describe("ASSET-RELOAD-1b — the pin is refreshed BEFORE the cache-overwrite fetches", () => {
  it("refreshPin runs and settles first; then the fetches; then one reload", async () => {
    const order: string[] = [];
    const reload = vi.fn(() => order.push("reload"));
    const fetchFn = vi.fn(async (_u: string, _i: { cache: "reload" }) => {
      order.push("fetch");
      return {};
    });
    const refreshPin = async () => {
      order.push("pin-start");
      await new Promise((r) => setTimeout(r, 10));
      order.push("pin-done");
    };
    recoverFromChunkError(chunkError(), { storage: memoryStorage(), now: () => 1, reload, fetchFn, refreshPin, timeoutMs: 500 });
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(order.slice(0, 2)).toEqual(["pin-start", "pin-done"]);
    expect(order.filter((o) => o === "fetch").length).toBe(3);
    expect(order[order.length - 1]).toBe("reload");
  });

  it("a pin refresh that rejects or never settles does not block the reload", async () => {
    const r1 = vi.fn();
    recoverFromChunkError(chunkError(), { storage: memoryStorage(), now: () => 1, reload: r1, fetchFn: async () => ({}), refreshPin: () => Promise.reject(new Error("x")), timeoutMs: 30 });
    await vi.waitFor(() => expect(r1).toHaveBeenCalledTimes(1));
    resetChunkReloadPending();
    const r2 = vi.fn();
    recoverFromChunkError(chunkError(), { storage: memoryStorage(), now: () => 1, reload: r2, fetchFn: async () => ({}), refreshPin: () => new Promise<void>(() => undefined), timeoutMs: 30 });
    await vi.waitFor(() => expect(r2).toHaveBeenCalledTimes(1));
  });

  it("refreshPinViaFrame appends a sandboxed iframe at the shell path and resolves when it loads", async () => {
    const done = refreshPinViaFrame();
    const frame = document.querySelector("iframe")!;
    expect(frame.getAttribute("sandbox")).toBe("");
    expect(frame.getAttribute("src")).toBe(PIN_REFRESH_PATH);
    expect(frame.getAttribute("style")).toBeNull();
    frame.dispatchEvent(new Event("load"));
    await done;
    expect(document.querySelector("iframe")).toBeNull();
  });
});
