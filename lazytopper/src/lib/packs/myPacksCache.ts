/**
 * myPacksCache — PACKS-ENTRY-1: "does this student own a pack?" for the "My packs" rows in Settings and the
 * mobile account menu.
 *
 * ★ ONE REQUEST PER SESSION PER STUDENT, LAZILY. Nothing runs on mount: the account menu / Settings call
 * `useOwnsAnyPack(uid, active)` with `active` true only while they are open, and the first activation fetches
 * `/api/packs/mine` (through the existing `fetchMyPacks`, imported dynamically so the checkout never joins the
 * early chunks). The answer is held in memory for the life of the page; it is never written to storage (an
 * entitlement is not stored on the client). A failed request is NOT cached: the next open tries again, and the
 * row stays hidden meanwhile (an honest "unknown" is "not shown", never "owned").
 * Flag off → no request at all and the hook returns false.
 */
import { useEffect, useState } from "react";
import { isPacksEntryEnabled } from "./packEntry";

let cachedUid: string | null = null;
let cachedOwns: boolean | null = null;
let inflight: { uid: string; promise: Promise<boolean | null> } | null = null;

/** Resolves true / false once known, null when the request failed (not cached). */
export function loadOwnsAnyPack(uid: string): Promise<boolean | null> {
  if (!isPacksEntryEnabled() || !uid) return Promise.resolve(false);
  if (cachedUid === uid && cachedOwns !== null) return Promise.resolve(cachedOwns);
  if (inflight && inflight.uid === uid) return inflight.promise;
  const promise = (async (): Promise<boolean | null> => {
    try {
      const { fetchMyPacks } = await import("../../services/packs");
      const mine = await fetchMyPacks();
      const owns = mine.packs.length > 0;
      cachedUid = uid;
      cachedOwns = owns;
      return owns;
    } catch {
      return null;
    } finally {
      if (inflight && inflight.uid === uid) inflight = null;
    }
  })();
  inflight = { uid, promise };
  return promise;
}

/** Read the cache without asking. null = not known yet. */
export function peekOwnsAnyPack(uid: string): boolean | null {
  return cachedUid === uid ? cachedOwns : null;
}

export function resetMyPacksCacheForTests(): void {
  cachedUid = null;
  cachedOwns = null;
  inflight = null;
}

/** True only when the student owns a pack. Fetches (once per session) the first time `active` is true. */
export function useOwnsAnyPack(uid: string | null | undefined, active: boolean): boolean {
  // Held with the uid it was learnt for, so a different student signing in on the same page never inherits it.
  const [known, setKnown] = useState<{ uid: string; owns: boolean } | null>(null);
  useEffect(() => {
    if (!uid || !active || !isPacksEntryEnabled()) return;
    let live = true;
    void loadOwnsAnyPack(uid).then((v) => {
      if (live && v !== null) setKnown({ uid, owns: v });
    });
    return () => {
      live = false;
    };
  }, [uid, active]);
  if (!uid) return false;
  if (known && known.uid === uid) return known.owns;
  return peekOwnsAnyPack(uid) === true;
}
