// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  RETRY_DELAYS_MS,
  failedModuleUrl,
  importWithRetry,
  isChunkLoadError,
  lazyWithRetry,
  retryUrl,
} from "./lazyWithRetry";

/**
 * CHUNK-RESILIENCE-1 K3 — lazyWithRetry.
 * The error messages below are the ones MEASURED in Chromium 153, Firefox 155 and
 * WebKit 26.6 (§0b P10), not paraphrases.
 */
const CHUNK_URL = "https://www.lazytopper.com/app/assets/DesktopNotesPage-AbC123.js";
const chromiumError = (url = CHUNK_URL) =>
  new TypeError(`Failed to fetch dynamically imported module: ${url}`);
const firefoxError = (url = CHUNK_URL) =>
  new TypeError(`error loading dynamically imported module: ${url}`);
const webkitError = () => new TypeError("Importing a module script failed.");
const webkitMimeError = (url = CHUNK_URL) =>
  new TypeError(`'text/html' is not a valid JavaScript MIME type for module script '${url}'.`);

const Page = () => null;
const pageModule = { default: Page };

function harness() {
  const sleeps: number[] = [];
  const sleep = vi.fn(async (ms: number) => {
    sleeps.push(ms);
  });
  return { sleeps, sleep };
}

describe("isChunkLoadError / failedModuleUrl — the P10 messages and nothing else", () => {
  it("recognises all four measured module-fetch messages", () => {
    expect(isChunkLoadError(chromiumError())).toBe(true);
    expect(isChunkLoadError(firefoxError())).toBe(true);
    expect(isChunkLoadError(webkitError())).toBe(true);
    expect(isChunkLoadError(webkitMimeError())).toBe(true);
  });

  it("does not recognise an evaluation error or a render bug", () => {
    expect(isChunkLoadError(new Error("evaluation boom"))).toBe(false);
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });

  it("recovers the URL from Chromium, Firefox and WebKit-MIME messages; not from WebKit's fetch message", () => {
    expect(failedModuleUrl(chromiumError())).toBe(CHUNK_URL);
    expect(failedModuleUrl(firefoxError())).toBe(CHUNK_URL);
    expect(failedModuleUrl(webkitMimeError())).toBe(CHUNK_URL);
    expect(failedModuleUrl(webkitError())).toBeNull();
  });

  it("strips an earlier retry parameter so attempt numbers never stack", () => {
    expect(failedModuleUrl(chromiumError(`${CHUNK_URL}?retry=1`))).toBe(CHUNK_URL);
    expect(retryUrl(CHUNK_URL, 2)).toBe(`${CHUNK_URL}?retry=2`);
  });
});

describe("importWithRetry (K2)", () => {
  it("chunk error then success -> resolves, and the retry imports the failed URL with ?retry=1", async () => {
    const { sleeps, sleep } = harness();
    const factory = vi.fn(() => Promise.reject(chromiumError()));
    const importUrl = vi.fn(async (_url: string) => pageModule);

    await expect(importWithRetry(factory, { importUrl, sleep })).resolves.toBe(pageModule);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(importUrl).toHaveBeenCalledTimes(1);
    const requested = importUrl.mock.calls[0][0];
    expect(requested).toBe(`${CHUNK_URL}?retry=1`);
    // ★ the retry must NOT be the URL that already failed — the browser caches that failure.
    expect(requested).not.toBe(CHUNK_URL);
    expect(new URL(requested).searchParams.get("retry")).toBe("1");
    expect(sleeps).toEqual([300]);
  });

  it("works from a Firefox message too", async () => {
    const { sleep } = harness();
    const importUrl = vi.fn(async () => pageModule);
    await expect(
      importWithRetry(() => Promise.reject(firefoxError()), { importUrl, sleep }),
    ).resolves.toBe(pageModule);
    expect(importUrl).toHaveBeenCalledWith(`${CHUNK_URL}?retry=1`);
  });

  it("non-chunk error -> rethrown at once, no retry, no wait", async () => {
    const { sleep } = harness();
    const boom = new Error("evaluation boom");
    const factory = vi.fn(() => Promise.reject(boom));
    const importUrl = vi.fn(async () => pageModule);

    await expect(importWithRetry(factory, { importUrl, sleep })).rejects.toBe(boom);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(importUrl).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("three chunk errors -> rejects after exactly 2 retries (300 ms, then 1 s), each a distinct ?retry=<n> URL", async () => {
    const { sleeps, sleep } = harness();
    const factory = vi.fn(() => Promise.reject(chromiumError()));
    const importUrl = vi.fn(async (url: string) => {
      throw chromiumError(url);
    });

    await expect(importWithRetry(factory, { importUrl, sleep })).rejects.toThrow(
      /Failed to fetch dynamically imported module/,
    );
    expect(factory).toHaveBeenCalledTimes(1);
    expect(importUrl.mock.calls.map((call) => call[0])).toEqual([
      `${CHUNK_URL}?retry=1`,
      `${CHUNK_URL}?retry=2`,
    ]);
    expect(sleeps).toEqual([...RETRY_DELAYS_MS]);
    expect(RETRY_DELAYS_MS).toEqual([300, 1000]);
  });

  it("a non-chunk error during a retry is rethrown at once (no second retry)", async () => {
    const { sleep } = harness();
    const boom = new Error("evaluation boom");
    const importUrl = vi.fn(async () => {
      throw boom;
    });
    await expect(
      importWithRetry(() => Promise.reject(chromiumError()), { importUrl, sleep }),
    ).rejects.toBe(boom);
    expect(importUrl).toHaveBeenCalledTimes(1);
  });

  it("URL not recoverable (WebKit) -> factory() once more; success resolves", async () => {
    const { sleeps, sleep } = harness();
    const factory = vi
      .fn<() => Promise<typeof pageModule>>()
      .mockRejectedValueOnce(webkitError())
      .mockResolvedValueOnce(pageModule);
    const importUrl = vi.fn(async () => pageModule);

    await expect(importWithRetry(factory, { importUrl, sleep })).resolves.toBe(pageModule);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(importUrl).not.toHaveBeenCalled();
    expect(sleeps).toEqual([300]);
  });

  it("URL not recoverable (WebKit) -> factory() once more; a second failure is rethrown", async () => {
    const { sleep } = harness();
    const second = webkitError();
    const factory = vi
      .fn<() => Promise<typeof pageModule>>()
      .mockRejectedValueOnce(webkitError())
      .mockRejectedValueOnce(second);
    await expect(importWithRetry(factory, { sleep })).rejects.toBe(second);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("a retried module without a default export rethrows the original error instead of handing React undefined", async () => {
    const { sleep } = harness();
    const original = chromiumError();
    const importUrl = vi.fn(async () => ({ notDefault: Page }) as unknown as typeof pageModule);
    await expect(
      importWithRetry(() => Promise.reject(original), { importUrl, sleep }),
    ).rejects.toBe(original);
  });

  it("first-try success never waits or retries", async () => {
    const { sleep } = harness();
    const importUrl = vi.fn(async () => pageModule);
    await expect(
      importWithRetry(async () => pageModule, { importUrl, sleep }),
    ).resolves.toBe(pageModule);
    expect(importUrl).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe("wiring — App.tsx's lazy routes actually go through lazyWithRetry", () => {
  const appSource = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../App.tsx"),
    "utf8",
  );

  it("lazyWithRetry returns a React lazy component", () => {
    const Lazy = lazyWithRetry(async () => pageModule) as unknown as { $$typeof: symbol };
    expect(Lazy.$$typeof).toBe(Symbol.for("react.lazy"));
  });

  it("App.tsx takes `lazy` from ./lib/lazyWithRetry and NOT from react", () => {
    expect(appSource).toMatch(/import\s*\{\s*lazyWithRetry\s+as\s+lazy\s*\}\s*from\s*"\.\/lib\/lazyWithRetry"/);
    const reactImports = [...appSource.matchAll(/import\s*\{([^}]*)\}\s*from\s*"react"/g)].map((m) => m[1]);
    expect(reactImports.length).toBeGreaterThan(0);
    for (const names of reactImports) {
      expect(names.split(",").map((n) => n.trim())).not.toContain("lazy");
    }
  });

  it("every lazy route in App.tsx is a `lazy(() => import(...))` call (31 at CHUNK-RESILIENCE-1)", () => {
    const calls = appSource.match(/\blazy\(\s*\(\)\s*=>\s*import\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(31);
  });
});
