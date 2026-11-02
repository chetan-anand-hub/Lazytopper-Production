/**
 * useOwnedPacks - SALE-MOMENT-1. The signed-in student's owned packs from the SERVER (`/api/packs/mine`, via fetchMyPacks), so a
 * buying line is never shown for a pack the student already has. The browser stores no ownership: this holds the answer in memory
 * for a short time per uid so several scorecards opened back to back share one request. A failed or slow read is "error" / "loading",
 * and the caller then shows nothing (when unsure, never sell).
 */
import { useEffect, useState } from "react";

import { fetchMyPacks, type OwnedPack } from "../../services/packs";

export type OwnedPacksState = { phase: "loading" } | { phase: "error" } | { phase: "ready"; packs: OwnedPack[] };

const TTL_MS = 30_000;
const cache = new Map<string, { at: number; promise: Promise<OwnedPack[]> }>();

function load(uid: string): Promise<OwnedPack[]> {
  const hit = cache.get(uid);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = fetchMyPacks().then((m) => m.packs);
  cache.set(uid, { at: Date.now(), promise });
  // A failure must not be remembered: the next scorecard asks again.
  promise.catch(() => {
    if (cache.get(uid)?.promise === promise) cache.delete(uid);
  });
  return promise;
}

/** Test seam: forget what was read. */
export function resetOwnedPacksCache(): void {
  cache.clear();
}

export function useOwnedPacks(uid: string, enabled: boolean): OwnedPacksState {
  const [state, setState] = useState<OwnedPacksState>({ phase: "loading" });
  useEffect(() => {
    if (!uid || !enabled) return undefined;
    let live = true;
    load(uid).then(
      (packs) => {
        if (live) setState({ phase: "ready", packs });
      },
      () => {
        if (live) setState({ phase: "error" });
      },
    );
    return () => {
      live = false;
    };
  }, [uid, enabled]);
  return state;
}
