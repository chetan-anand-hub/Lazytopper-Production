/**
 * TS-PACK-1 — does this signed-in student own the Test Series Pack, and how many checks has each series paper used? SERVER TRUTH
 * ONLY: GET /api/packs/mine (`ownsTestSeries`, present only while the pack is valid; `testSeries.used` per manifest paper key).
 * Held in memory for the page's life (never localStorage); one request per student per page load, and again on `refresh()`
 * (after a grade, so the "checks left" line moves). A failed read is retried once, then "error" (never "owned", and never a paywall: the page offers a retry).
 * The server still decides every grade (server/services/testSeriesChecks.cjs); this only decides what the page SHOWS.
 */
import { useEffect, useRef, useState } from "react";
import type { TestSeriesStatus } from "../../services/packs";

interface Entry {
  uid: string;
  owns: boolean;
  status: TestSeriesStatus | null;
  /** MYPACKS-TS-1: the read failed (twice) - the page says "Couldn't confirm your purchase - retry", never a paywall. */
  failed: boolean;
}

let entry: Entry | null = null;
let inflight: string | null = null;
const listeners = new Set<() => void>();

async function readOnce(): Promise<{ owns: boolean; status: TestSeriesStatus | null }> {
  const { fetchMyPacks } = await import("../../services/packs");
  const mine = await fetchMyPacks();
  return { owns: mine.ownsTestSeries === true, status: mine.testSeries ?? null };
}

export const OWNERSHIP_RETRY_DELAY_MS = 700;

async function load(uid: string, force: boolean): Promise<void> {
  if (!force && (entry?.uid === uid || inflight === uid)) return;
  inflight = uid;
  try {
    let r: { owns: boolean; status: TestSeriesStatus | null } | null = null;
    try {
      r = await readOnce();
    } catch {
      // ONE quiet retry before giving up.
      await new Promise((res) => setTimeout(res, OWNERSHIP_RETRY_DELAY_MS));
      try {
        r = await readOnce();
      } catch {
        r = null;
      }
    }
    entry = r ? { uid, owns: r.owns, status: r.status, failed: false } : { uid, owns: false, status: null, failed: true };
  } finally {
    if (inflight === uid) inflight = null;
    listeners.forEach((fn) => fn());
  }
}

export type OwnershipPhase = "idle" | "loading" | "ready" | "error";

/** `uid` null = do not ask (signed out, a Board Pass holder, the gate switched off). `refreshKey` changing re-reads the counts. */
export function useTestSeriesOwnership(
  uid: string | null | undefined,
  refreshKey?: unknown,
): { owns: boolean; status: TestSeriesStatus | null; phase: OwnershipPhase; retry: () => void } {
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
  const retry = () => {
    if (uid) {
      entry = null;
      void load(uid, true);
      bump((n) => n + 1);
    }
  };
  const e = uid && entry && entry.uid === uid ? entry : null;
  const phase: OwnershipPhase = !uid ? "idle" : !e ? "loading" : e.failed ? "error" : "ready";
  return { owns: e?.owns ?? false, status: e?.status ?? null, phase, retry };
}

export function resetTestSeriesOwnershipForTests(): void {
  entry = null;
  inflight = null;
  listeners.clear();
}
