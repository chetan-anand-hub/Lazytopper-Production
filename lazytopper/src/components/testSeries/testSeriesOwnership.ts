/**
 * TS-PACK-1 — does this signed-in student own the Test Series Pack, and how many checks has each series paper used? SERVER TRUTH
 * ONLY: GET /api/packs/mine (`ownsTestSeries`, present only while the pack is valid; `testSeries.used` per manifest paper key).
 * Held in memory for the page's life (never localStorage); one request per student per page load, and again on `refresh()`
 * (after a grade, so the "checks left" line moves). A failed read is "not owned" (the ordinary gate), never "owned".
 * The server still decides every grade (server/services/testSeriesChecks.cjs); this only decides what the page SHOWS.
 */
import { useEffect, useRef, useState } from "react";
import type { TestSeriesStatus } from "../../services/packs";

interface Entry {
  uid: string;
  owns: boolean;
  status: TestSeriesStatus | null;
}

let entry: Entry | null = null;
let inflight: string | null = null;
const listeners = new Set<() => void>();

async function load(uid: string, force: boolean): Promise<void> {
  if (!force && (entry?.uid === uid || inflight === uid)) return;
  inflight = uid;
  try {
    const { fetchMyPacks } = await import("../../services/packs");
    const mine = await fetchMyPacks();
    entry = { uid, owns: mine.ownsTestSeries === true, status: mine.testSeries ?? null };
  } catch {
    /* unknown: not shown, the gate stays */
  } finally {
    if (inflight === uid) inflight = null;
    listeners.forEach((fn) => fn());
  }
}

/** `uid` null = do not ask (signed out, a Board Pass holder, the gate switched off). `refreshKey` changing re-reads the counts. */
/** `known` (TS-PAGE-2, additive): true once the server has answered for this uid; false while loading or after a failed read. */
export function useTestSeriesOwnership(
  uid: string | null | undefined,
  refreshKey?: unknown,
): { owns: boolean; status: TestSeriesStatus | null; known: boolean } {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  useEffect(() => {
    if (uid) void load(uid, false);
  }, [uid]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (uid) void load(uid, true);
  }, [uid, refreshKey]);
  const e = uid && entry && entry.uid === uid ? entry : null;
  return { owns: e?.owns ?? false, status: e?.status ?? null, known: e !== null };
}

export function resetTestSeriesOwnershipForTests(): void {
  entry = null;
  inflight = null;
  listeners.clear();
}
