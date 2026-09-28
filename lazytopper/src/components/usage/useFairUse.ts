/**
 * useFairUse — FAIR-USE-UI-1. The one hook a grading / paper surface uses.
 *
 * ★ DARK. `snapshot` is null unless /api/usage/me said `enforced: true`; with a null
 * snapshot `planGrade` always proceeds, `blockPaperStart` never blocks and
 * `handleRefusal` never claims an error — the page behaves exactly as before.
 *
 * ★ NEVER IN FRONT OF GRADING. The read starts on mount and is never awaited by a
 * Grade tap: `planGrade` / `blockPaperStart` use whatever snapshot is already here. The
 * only await is `handleRefusal`'s, and it runs AFTER the server has already refused.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchUsageMe,
  invalidateUsage,
  readFairUseLimit,
  type UsageSnapshot,
} from "../../services/usageClient";
import {
  limitFromRefusal,
  paperStartBlock,
  planPerQuestionGrade,
  type GradePlan,
  type LimitScope,
  type LimitState,
} from "./fairUseGate";

export interface FairUse {
  snapshot: UsageSnapshot | null;
  /** The limit panel to show, or null. */
  limit: LimitState | null;
  clearLimit: () => void;
  /** UI2 — call with the number of answers about to be graded. */
  planGrade: (n: number) => GradePlan;
  /** UI3 — true when the paper must NOT start (the panel is now showing). */
  blockPaperStart: () => boolean;
  /** UI1 — call from a grade's catch. True when it was a fair-use refusal AND the panel
   *  is now showing; false means "render your existing error path unchanged". */
  handleRefusal: (err: unknown) => Promise<boolean>;
  /** A grade was served: the counts moved, so re-read them (enforced only). */
  noteGraded: () => void;
  /** Show a limit decided elsewhere (UI2's R = 0). */
  showLimit: (limit: LimitState) => void;
}

export function useFairUse(scope: LimitScope, enabled: boolean = true): FairUse {
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
  const [limit, setLimit] = useState<LimitState | null>(null);
  const snapshotRef = useRef<UsageSnapshot | null>(null);
  snapshotRef.current = snapshot;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void fetchUsageMe().then((s) => {
      if (!cancelled) setSnapshot(s);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const clearLimit = useCallback(() => setLimit(null), []);

  const planGrade = useCallback(
    (n: number) => planPerQuestionGrade(snapshotRef.current, n, Date.now()),
    [],
  );

  const blockPaperStart = useCallback(() => {
    if (scope === "checks") return false;
    const blocked = paperStartBlock(snapshotRef.current, scope, Date.now());
    if (blocked) setLimit(blocked);
    return blocked !== null;
  }, [scope]);

  const handleRefusal = useCallback(
    async (err: unknown) => {
      const info = readFairUseLimit(err);
      if (!info) return false;
      invalidateUsage();
      // The panel needs an ENFORCED read. Normally it is already here; if the mount read
      // failed, ask once — this runs only after a refusal, never in front of a grade.
      const snap = snapshotRef.current ?? (await fetchUsageMe({ force: true }));
      const next = limitFromRefusal(info, snap, scope);
      if (!next) return false;
      if (mounted.current) {
        setSnapshot(snap);
        setLimit(next);
      }
      return true;
    },
    [scope],
  );

  const noteGraded = useCallback(() => {
    invalidateUsage();
    if (!snapshotRef.current) return; // dark: no extra read
    void fetchUsageMe({ force: true }).then((s) => {
      if (mounted.current) setSnapshot(s);
    });
  }, []);

  const showLimit = useCallback((l: LimitState) => setLimit(l), []);

  return { snapshot, limit, clearLimit, planGrade, blockPaperStart, handleRefusal, noteGraded, showLimit };
}
