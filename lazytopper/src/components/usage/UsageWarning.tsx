/**
 * UsageWarning — FAIR-USE-WARN-1. A thin, non-blocking bar at the top of an AI surface,
 * shown at 75% and 90% of an allowance (the way Claude warns before a limit).
 *
 * ★ Never a modal, never covering a question: it is an inline bar in the page flow.
 * ★ DARK: signed-out, free tier, or a dark snapshot (/api/usage/me did not say
 *   `enforced: true`) → renders nothing at all.
 * ★ The page's own `useFairUse` snapshot is passed in where the page has one. With
 *   `selfRead` (the Tutor, which has no useFairUse) the bar reads /api/usage/me itself:
 *   once on mount, and again each time `refreshKey` changes to a non-null value (after
 *   each reply).
 * ★ Dismiss (×) hides THAT level for THAT window until its reset (sessionStorage, keyed
 *   by window + level + resetAt). A storage failure means the banner shows.
 * ★ No rupees, no codes, no hardcoded /app/ prefix.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchUsageMe, type UsageSnapshot } from "../../services/usageClient";
import {
  dismissKey,
  usageWarning,
  warningBannerCopy,
  warningLink,
  warningNoteCopy,
  type UsageWarningScope,
  type UsageWarningState,
} from "./usageWarningLogic";
import "./usage.css";

function readDismissed(key: string): boolean {
  try {
    return typeof window !== "undefined" && window.sessionStorage.getItem(key) === "1";
  } catch {
    return false; // storage failure = the banner shows
  }
}

function writeDismissed(key: string): void {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* storage failure: the in-memory dismiss below still hides it for this mount */
  }
}

/** The snapshot to warn from: the page's own, or (`selfRead`) one the bar reads itself. */
function useWarningSnapshot(
  snapshot: UsageSnapshot | null | undefined,
  selfFetch: boolean,
  refreshKey: unknown,
): UsageSnapshot | null {
  const [own, setOwn] = useState<UsageSnapshot | null>(null);
  const reads = useRef(0);
  useEffect(() => {
    if (!selfFetch || refreshKey === null) return;
    let cancelled = false;
    // The first read may use the client's short cache; every later one (after a reply,
    // which moved the counts) asks the server again.
    const force = reads.current > 0;
    reads.current += 1;
    void fetchUsageMe(force ? { force: true } : {}).then((s) => {
      if (!cancelled) setOwn(s);
    });
    return () => {
      cancelled = true;
    };
  }, [selfFetch, refreshKey]);
  return selfFetch ? own : snapshot ?? null;
}

export interface UsageWarningProps {
  scope: UsageWarningScope;
  /** The page's `useFairUse().snapshot`. */
  snapshot?: UsageSnapshot | null;
  /** No page snapshot (the Tutor): read /api/usage/me here instead. */
  selfRead?: boolean;
  /** Self-read only: a change to a non-null value re-reads usage (e.g. after a reply). */
  refreshKey?: unknown;
  /** Test seam: the clock. */
  nowMs?: number;
}

export default function UsageWarning({ scope, snapshot, selfRead = false, refreshKey, nowMs }: UsageWarningProps) {
  const snap = useWarningSnapshot(snapshot, selfRead, refreshKey);
  const [hiddenKey, setHiddenKey] = useState<string | null>(null);
  // Dark (no enforced snapshot) → nothing, and not even a clock read.
  if (!snap) return null;
  const now = nowMs ?? Date.now();
  const warning = usageWarning(snap, now, scope);
  const key = warning ? dismissKey(warning) : null;

  if (!warning || !key) return null;
  if (hiddenKey === key || readDismissed(key)) return null;

  const link = warningLink(warning);
  return (
    <div className="lt-usage-warn" role="status" data-testid="usage-warning" data-level={warning.level}>
      <p className="lt-usage-warn__text">{warningBannerCopy(warning, now)}</p>
      <Link to={link.to} className="lt-usage-warn__link" data-testid="usage-warning-link">
        {link.label}
      </Link>
      <button
        type="button"
        className="lt-usage-warn__close"
        aria-label="Dismiss usage warning"
        onClick={() => {
          writeDismissed(key);
          setHiddenKey(key);
        }}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}

/**
 * The ONE muted line under a surface's main AI action (Check / Grade / Submit paper /
 * Tutor send): "{75|90}% used · resets {h:mm am/pm}". Not dismissible, no link.
 */
export function UsageNote({ scope, snapshot, nowMs }: { scope: UsageWarningScope; snapshot: UsageSnapshot | null; nowMs?: number }) {
  if (!snapshot) return null;
  const now = nowMs ?? Date.now();
  const warning: UsageWarningState | null = usageWarning(snapshot, now, scope);
  if (!warning) return null;
  return (
    <p className="lt-usage-note" data-testid="usage-note">
      {warningNoteCopy(warning, now)}
    </p>
  );
}
