/**
 * TS-PACK-1 — does this signed-in student own the Test Series Pack, and how many checks has each series paper used? SERVER TRUTH
 * ONLY: GET /api/packs/mine (`ownsTestSeries`, present only while the pack is valid; `testSeries.used` per manifest paper key).
 * Held in memory for the page's life (never localStorage); one request per student per page load, and again on `refresh()`
 * (after a grade, so the "checks left" line moves). A failed read is retried once, then "error" (never "owned", and never a paywall: the page offers a retry).
 * The server still decides every grade (server/services/testSeriesChecks.cjs); this only decides what the page SHOWS.
 */
import { useEffect, useRef, useState } from "react";
import type { TestSeriesFreeTest, TestSeriesStatus } from "../../services/packs";

interface Entry {
  uid: string;
  owns: boolean;
  status: TestSeriesStatus | null;
  /** TS-FREE-CHECK-1: a non-owner's free-test state from the server (null: unknown, an owner, or the rule is off). */
  freeTest: TestSeriesFreeTest | null;
  /** MYPACKS-TS-1: the read failed (twice) - the page says "Couldn't confirm your purchase - retry", never a paywall. */
  failed: boolean;
}

let entry: Entry | null = null;
let inflight: string | null = null;
const listeners = new Set<() => void>();

type Read = { owns: boolean; status: TestSeriesStatus | null; freeTest: TestSeriesFreeTest | null };

async function readOnce(): Promise<Read> {
  const { fetchMyPacks } = await import("../../services/packs");
  const mine = await fetchMyPacks();
  return { owns: mine.ownsTestSeries === true, status: mine.testSeries ?? null, freeTest: mine.ownsTestSeries === true ? null : mine.freeTest ?? null };
}

export const OWNERSHIP_RETRY_DELAY_MS = 700;

/**
 * LIVE-FIX-1 - every read is numbered and ONLY the newest one may write the entry: a slow read started before a grade (the count
 * before the check) must never land after the read started once the grade finished and put the stale count back on screen.
 */
let seq = 0;

async function load(uid: string, force: boolean, background = false): Promise<void> {
  if (!force && (entry?.uid === uid || inflight === uid)) return;
  const mine = ++seq;
  inflight = uid;
  try {
    let r: Read | null = null;
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
    if (mine !== seq) return; // a newer read is in flight (or landed): it writes the entry, never this older one
    // FM-RECHECK-NOTE-1 (review nit): a failed BACKGROUND re-read keeps the last good read for this student - it must never turn a
    // confirmed owner into "couldn't confirm" on a screen that was already right.
    if (!r && background && entry?.uid === uid && !entry.failed) return;
    entry = r ? { uid, owns: r.owns, status: r.status, freeTest: r.freeTest, failed: false } : { uid, owns: false, status: null, freeTest: null, failed: true };
  } finally {
    if (mine === seq) {
      if (inflight === uid) inflight = null;
      listeners.forEach((fn) => fn());
    }
  }
}

export type OwnershipPhase = "idle" | "loading" | "ready" | "error";

/** FM-RECHECK-NOTE-1 - when a checks-left reader re-reads after its own read, to catch the server's settle of the check just graded. */
export const SETTLE_REREAD_MS: readonly number[] = [2500, 8000];

function settleRereadDisabled(): boolean {
  const v = import.meta.env?.VITE_TS_SETTLE_REREAD_DISABLED;
  return typeof v === "string" && !["", "0", "false"].includes(v.trim().toLowerCase());
}

/** `uid` null = do not ask (signed out, a Board Pass holder, the gate switched off). `refreshKey` changing re-reads the counts. */
export function useTestSeriesOwnership(
  uid: string | null | undefined,
  refreshKey?: unknown,
): { owns: boolean; status: TestSeriesStatus | null; freeTest: TestSeriesFreeTest | null; phase: OwnershipPhase; retry: () => void } {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  // LIVE-FIX-1 (live run 23 Nov 2026: "Checks left on this paper: 2 of 2" after a completed check) - a reader that passes a
  // `refreshKey` (the checks-left line) re-reads the SERVER's count when it MOUNTS, not only when the key later changes. The
  // result screen's line mounts fresh after the grade (the upload screen's line unmounts with it), so it used to skip its first
  // refresh and show the count cached before the check. A reader with no `refreshKey` keeps the page-life cache (one request).
  const mounted = useRef(false);
  useEffect(() => {
    const force = mounted.current || refreshKey !== undefined;
    mounted.current = true;
    if (uid) void load(uid, force);
    // FM-RECHECK-NOTE-1 (live, 25 Nov 2026: Full Mock showed no "This check wasn't counted" note although the server HAD given the
    // free re-check, `freeRecheck: {"TS-FM-M1": true}`). The server settles a check's hold just AFTER the grading job is marked done
    // (grading/jobs.cjs -> testSeriesChecks.settleDeferred), so the read above can land before the settle and show the old count
    // with no note. A checks-left reader (one that passes `refreshKey`) re-reads twice more, shortly after; the newest read wins (seq).
    // Display only - the server still decides every check. Kill switch VITE_TS_SETTLE_REREAD_DISABLED.
    if (!uid || refreshKey === undefined || settleRereadDisabled()) return;
    const timers = SETTLE_REREAD_MS.map((ms) => setTimeout(() => void load(uid, true, true), ms));
    return () => timers.forEach(clearTimeout);
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
  return { owns: e?.owns ?? false, status: e?.status ?? null, freeTest: e?.freeTest ?? null, phase, retry };
}

export function resetTestSeriesOwnershipForTests(): void {
  entry = null;
  inflight = null;
  seq = 0;
  listeners.clear();
}
