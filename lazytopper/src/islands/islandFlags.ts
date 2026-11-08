/// <reference types="vite/client" />
/**
 * SPEED-ISLANDS-2 — the build flags the island mirrors from the app. Vite replaces `import.meta.env.X` in the island's
 * chunk exactly as in the app's, so the island and the app always agree. (Its own file so the build scripts' Node
 * tsconfig, which type-checks contentIsland.ts through islandConfig.ts, gets the vite/client types.)
 */

/** packEntryLazy.ts isPacksEntryEnabled: only the string "1" turns the pack entry links on. */
export function packsEntryEnabled(): boolean {
  return String(import.meta.env.VITE_PACKS_ENABLED ?? "").trim() === "1";
}
