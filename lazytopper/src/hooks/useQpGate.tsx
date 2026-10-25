/**
 * useQpGate — LIMITS-1 PR-2: "one graded Quick Practice set a day" at the scorecard moment.
 *
 *   const qpGate = useQpGate(showScorecard, qpSetKey);
 *   if (qpGate.status !== "open") ...withhold the scorecard and the saved record...
 *   {qpGate.wall}
 *
 * Quick Practice MCQs are marked in the browser, so there is no server request to refuse. The
 * gate is therefore at the moment the SET IS SCORED AND SAVED: the server mints one counted set
 * (idempotent per set key within the IST day). Blocked -> the scorecard and the saved record are
 * withheld and a calm wall shows; every question, its solution and the per-tap right/wrong
 * stay readable. Said honestly: a soft limit, like the download limit.
 *
 * ★ DARK = UNCHANGED. VITE_LIMITS_ENABLED is a BUILD-TIME constant, so which implementation runs
 * never changes while a page is mounted (the hook order is stable). Off, `status` is always
 * "open" and no context, effect or request is touched.
 * ★ FAILS OPEN on every uncertainty (signed out, premium, offline, slow or failed server).
 */
import { useEffect, useState, type ReactNode } from "react";
import DownloadLimitWall from "../components/limits/DownloadLimitWall";
import { useAuth } from "../context/AuthContext";
import { trackNamedEvent } from "../analytics/analytics";
import { isLimitsClientEnabled, mintQp } from "../services/limitsClient";
import { useSubscription } from "./useSubscription";

export type QpGateStatus = "open" | "pending" | "blocked";

export interface QpGate {
  status: QpGateStatus;
  /** Render once anywhere in the page. null unless a wall is open. */
  wall: ReactNode;
}

const OPEN: QpGate = Object.freeze({ status: "open" as const, wall: null });

function useQpGateOff(): QpGate {
  return OPEN;
}

interface Answer {
  key: string;
  blocked: boolean;
  resetAt: string | null;
  tier: string | null;
}

function useQpGateLive(active: boolean, setKey: string): QpGate {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const uid = user?.uid ?? "";
  const skip = !active || !setKey || isPremium || !uid;
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [wallClosedFor, setWallClosedFor] = useState<string>("");

  useEffect(() => {
    if (skip) return;
    let cancelled = false;
    void mintQp(setKey, true).then((r) => {
      if (cancelled) return;
      if (r.status === "blocked") {
        trackNamedEvent("grade_blocked");
        setAnswer({ key: setKey, blocked: true, resetAt: r.resetAt, tier: r.tier });
      } else {
        setAnswer({ key: setKey, blocked: false, resetAt: null, tier: null });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [skip, setKey]);

  if (skip) return OPEN;
  if (!answer || answer.key !== setKey) return { status: "pending", wall: null };
  if (!answer.blocked) return OPEN;
  return {
    status: "blocked",
    wall:
      wallClosedFor === setKey ? null : (
        <DownloadLimitWall
          variant="blocked"
          flavor="practice"
          resetAt={answer.resetAt}
          tier={answer.tier}
          onClose={() => setWallClosedFor(setKey)}
        />
      ),
  };
}

/** Chosen once at module load from the build-time flag, so the hook order never changes. */
export const useQpGate: (active: boolean, setKey: string) => QpGate = isLimitsClientEnabled() ? useQpGateLive : useQpGateOff;
