// PACKS-STALE-1: "Show files" / "Download" in a tab opened before a deploy must reload once (shared one-per-minute
// guard in chunkReload) instead of showing an error whose Retry re-fails until a manual refresh.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { recoverFromChunkError, resetChunkReloadPending } from "../../lib/chunkReload";

const src = readFileSync(path.join(__dirname, "PacksShop.tsx"), "utf8");

describe("PACKS-STALE-1", () => {
  it("open() and download() hand a failure to recoverFromChunkError before showing the error", () => {
    expect(src).toMatch(/import \{ recoverFromChunkError \} from "\.\.\/\.\.\/lib\/chunkReload"/);
    expect(src).toMatch(/if \(recoverFromChunkError\(err\)\) return;\s*setState\(\{ phase: "error" \}\)/);
    expect(src).toMatch(/if \(!recoverFromChunkError\(err\)\) setFailedId\(file\.id\)/);
  });

  it("a stale-chunk error claims the one reload; a non-chunk error does not", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    let reloads = 0;
    const deps = { storage, now: () => 1_000_000, reload: () => void reloads++, fetchFn: async () => undefined, refreshPin: async () => undefined, entries: () => [], origin: "https://x", timeoutMs: 0 };
    const stale = new TypeError("Failed to fetch dynamically imported module: https://x/assets/buildPackFiles-abc.js");
    expect(recoverFromChunkError(new Error("network down"), deps)).toBe(false);
    expect(recoverFromChunkError(stale, deps)).toBe(true);
    expect(reloads).toBe(0); // the reload is async; the claim is what matters here
    expect(store.size).toBe(1);
    resetChunkReloadPending();
  });
});
