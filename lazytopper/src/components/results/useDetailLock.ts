/**
 * useDetailLock — LIMITS-1 PR-2: is this scorecard's per-answer breakdown open or locked?
 *
 * The SERVER decides (POST /api/usage/limits/detail): a Basic student's first result of each kind
 * is open and stays open when re-opened; every other Basic result is locked. Premium and trial
 * are always open. Any uncertainty (flag off, signed out, offline, slow or failed server) is OPEN.
 *
 * ★ DARK = UNCHANGED. VITE_LIMITS_ENABLED is a BUILD-TIME constant, so which implementation runs
 * never changes while a page is mounted (the hook order is stable). Off, this returns "open"
 * and touches no context, subscription, effect or network.
 *
 * ★ SOFT LOCK, SAID HONESTLY: it is a UI guard on a result the browser already holds, not a vault.
 *
 * `hasDetail` is false for a scorecard with nothing to lock (an all-pending sheet, an objective-only
 * partial): the free first-of-kind is never spent on a card that showed no breakdown.
 */
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { LIMITS_CONFIG } from "../../config/limitsConfig";
import { claimDetail, isLimitsClientEnabled, type DetailKind } from "../../services/limitsClient";

export interface DetailLimitKey {
  kind: DetailKind;
  /** Stable per result: the surface code (or the practice set's key). Never a student's content. */
  resultKey: string;
}

export type DetailLock = "open" | "pending" | "locked";

function useDetailLockOff(): DetailLock {
  return "open";
}

function useDetailLockLive(limitKey: DetailLimitKey | undefined, hasDetail: boolean): DetailLock {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const uid = user?.uid ?? "";
  const skip = !limitKey || !hasDetail || isPremium || !uid || !LIMITS_CONFIG.basic.scorecardBreakdownLocked;
  const id = limitKey ? `${limitKey.kind}|${limitKey.resultKey}` : "";
  const [answer, setAnswer] = useState<{ id: string; open: boolean } | null>(null);

  useEffect(() => {
    if (skip || !limitKey) return;
    let cancelled = false;
    void claimDetail(limitKey.kind, limitKey.resultKey, true).then((open) => {
      if (!cancelled) setAnswer({ id, open });
    });
    return () => {
      cancelled = true;
    };
    // limitKey is represented by `id`; its identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, id]);

  if (skip) return "open";
  if (!answer || answer.id !== id) return "pending";
  return answer.open ? "open" : "locked";
}

/** Chosen once at module load from the build-time flag, so the hook order never changes. */
export const useDetailLock: (limitKey: DetailLimitKey | undefined, hasDetail: boolean) => DetailLock = isLimitsClientEnabled()
  ? useDetailLockLive
  : useDetailLockOff;
