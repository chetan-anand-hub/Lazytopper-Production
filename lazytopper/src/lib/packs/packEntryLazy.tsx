/**
 * packEntryLazy — PACKS-ENTRY-1: the ONLY pack-entry module the eagerly loaded chrome (desktop shell, public footer,
 * download wall, mobile account menu) imports. It holds the flag read and ONE lazy wrapper and nothing else, so the
 * entry bundle pays almost nothing for the feature (PERF-3 budget): every helper lives in packEntry.ts and the lazy
 * chunk. `packEntry.ts` re-exports `isPacksEntryEnabled` so there is one definition.
 */
import { lazy, Suspense } from "react";
import type { PacksEntryProps } from "./PacksEntryPoint";

/** The client switch for the entry links. Only the string "1" turns them on (contract §7). */
export function isPacksEntryEnabled(): boolean {
  return String(import.meta.env.VITE_PACKS_ENABLED ?? "").trim() === "1";
}

const PacksEntryPoint = lazy(() => import("./PacksEntryPoint"));

/**
 * Every pack entry the eager chrome shows, behind the flag and in ONE lazy chunk (each extra `import()` costs entry
 * bytes for its preload map). `kind`: "footer-link" (public footer), "footer-menu" (desktop dropdown legal row),
 * "account-row" (mobile menu row; variant="desktop" = the desktop dropdown row), "me-card" (Me / Progress card), "wall" (download-wall button). Flag off: renders nothing and loads nothing.
 */
export function PacksEntry(props: PacksEntryProps) {
  return isPacksEntryEnabled() ? (
    <Suspense fallback={null}>
      <PacksEntryPoint {...props} />
    </Suspense>
  ) : null;
}
