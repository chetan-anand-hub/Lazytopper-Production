import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { useMeHome } from "../../services/useMeHomeSummary";
import {
  DAILY_FIX_CHANGED_EVENT,
  readClearedFixes,
  selectDailyFixes,
  type DailyFixItem,
} from "../../lib/tutorSticky/dailyFix";

/**
 * TUTOR-STICKY-1 — the daily-fix card's data: the student's own unresolved mistakes (the shared
 * Mistake Intelligence read Home already makes, so no new read path) as up to three tutor-ready items.
 *
 * `access`: "open" = the tutor is theirs (paid Premium or an active trial); "locked" = a Basic account
 * (free / expired) — the card still names the real lost marks and offers "Unlock the tutor". While the
 * subscription is still reconciling, nothing is shown (a stale cache must never decide lock vs open).
 */
export interface DailyFixState {
  items: DailyFixItem[];
  access: "open" | "locked";
  uid: string;
}

export function useDailyFix(gen = 0): DailyFixState | null {
  const { user } = useAuth();
  const sub = useSubscription();
  const uid = user && !user.isLocalSession ? user.uid : null;
  const { status, read } = useMeHome(uid, gen);
  const [clearedTick, setClearedTick] = useState(0);

  useEffect(() => {
    const bump = () => setClearedTick((n) => n + 1);
    window.addEventListener(DAILY_FIX_CHANGED_EVENT, bump);
    return () => window.removeEventListener(DAILY_FIX_CHANGED_EVENT, bump);
  }, []);

  const complete = status === "ok" && read?.all.mistakes.complete === true;
  const entries = complete ? read!.all.mistakes.entries : null;
  return useMemo(() => {
    if (!uid || !entries || !sub.hydrated) return null;
    // `clearedTick` re-runs this when the student clears a fix (the record is read fresh each time).
    void clearedTick;
    const items = selectDailyFixes(entries, Date.now(), readClearedFixes(uid));
    if (items.length === 0) return null;
    return { items, access: sub.isPremium ? ("open" as const) : ("locked" as const), uid };
  }, [uid, entries, sub.hydrated, sub.isPremium, clearedTick]);
}
