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

/** Forget what was read. Called after a server-verified pack payment so the student is never offered what they just bought; also a test seam. */
export function resetOwnedPacksCache(): void {
  cache.clear();
}

export function useOwnedPacks(uid: string, enabled: boolean): OwnedPacksState {
  const key = `${uid}|${enabled ? 1 : 0}`;
  const [held, setHeld] = useState<{ key: string; value: OwnedPacksState }>({ key, value: { phase: "loading" } });
  useEffect(() => {
    // Another student (or the switch flipping) starts again from "loading": one account's answer is never shown for another.
    setHeld((h) => (h.key === key && h.value.phase === "loading" ? h : { key, value: { phase: "loading" } }));
    if (!uid || !enabled) return undefined;
    let live = true;
    load(uid).then(
      (packs) => {
        if (live) setHeld({ key, value: { phase: "ready", packs } });
      },
      () => {
        if (live) setHeld({ key, value: { phase: "error" } });
      },
    );
    return () => {
      live = false;
    };
  }, [uid, enabled, key]);
  // Render-time guard: before the effect runs for a new uid, the previous uid's answer must not leak through.
  return held.key === key ? held.value : { phase: "loading" };
}
