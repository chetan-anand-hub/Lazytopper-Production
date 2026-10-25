/**
 * useLimitedDownload — LIMITS-1 PR-1: "mint first, build the PDF only on success".
 *
 *   const limited = useLimitedDownload();
 *   setBusy(true);                                              // before the guard (it can take a moment)
 *   if (!(await limited.guard("worksheet", () => paperKey))) { setBusy(false); return; }
 *   ...build the PDF...
 *   {limited.wall}
 *
 * A paper and its own solutions share ONE paperKey, so the second download of the same paper
 * spends nothing. `paperKey` may be a function so a dark build never computes it.
 *
 * ★ DARK = UNCHANGED. VITE_LIMITS_ENABLED is a BUILD-TIME constant, so which implementation runs
 * never changes while a page is mounted (the hook order is stable). Off, `guard` resolves true
 * with no request and NO context, subscription hydrate or listener is touched: the dark build's
 * runtime is exactly what it was.
 */
import { useCallback, useRef, useState, type ReactNode } from "react";
import DownloadLimitWall, { type DownloadWallVariant } from "../components/limits/DownloadLimitWall";
import { useAuth } from "../context/AuthContext";
import { trackDownload, type DownloadKind } from "../analytics/analytics";
import { isLimitsClientEnabled, mintDownload } from "../services/limitsClient";
import { isPaidPremium } from "../services/subscriptionService";
import { useSubscription } from "./useSubscription";

interface WallState {
  variant: DownloadWallVariant;
  resetAt: string | null;
  tier: string | null;
  kind: DownloadKind;
}

export type PaperKeySource = string | (() => string);

export interface LimitedDownload {
  /** Resolves true when the PDF may be built. False means a wall is showing (or a guard is already running). */
  guard: (kind: DownloadKind, paperKey: PaperKeySource) => Promise<boolean>;
  /** Render this once, anywhere in the page. null when no wall is open. */
  wall: ReactNode;
}

const OFF: LimitedDownload = Object.freeze({ guard: async () => true, wall: null });

function useLimitedDownloadOff(): LimitedDownload {
  return OFF;
}

function useLimitedDownloadLive(): LimitedDownload {
  const { user } = useAuth();
  const { status } = useSubscription();
  const paid = isPaidPremium(status);
  const signedIn = Boolean(user?.uid);
  const [wallState, setWallState] = useState<WallState | null>(null);
  const inFlight = useRef(false);

  const guard = useCallback(
    async (kind: DownloadKind, paperKey: PaperKeySource): Promise<boolean> => {
      if (paid) return true; // PAID premium only: trial and Basic ask the server, which decides
      if (inFlight.current) return false; // a second tap while the first is asking
      inFlight.current = true;
      try {
        const key = typeof paperKey === "function" ? paperKey() : paperKey;
        const result = await mintDownload(kind, key, signedIn);
        switch (result.status) {
          case "ok":
            trackDownload(kind, "start");
            return true;
          case "blocked":
            trackDownload(kind, "blocked");
            trackDownload(kind, "wall_shown");
            setWallState({ variant: "blocked", resetAt: result.resetAt, tier: result.tier, kind });
            return false;
          case "signed_out":
            trackDownload(kind, "wall_shown");
            setWallState({ variant: "signed_out", resetAt: null, tier: null, kind });
            return false;
          case "offline":
            setWallState({ variant: "offline", resetAt: null, tier: null, kind });
            return false;
          default:
            return true;
        }
      } finally {
        inFlight.current = false;
      }
    },
    [paid, signedIn],
  );

  const close = useCallback(() => setWallState(null), []);
  const wall = wallState ? (
    <DownloadLimitWall variant={wallState.variant} resetAt={wallState.resetAt} tier={wallState.tier} onClose={close} />
  ) : null;

  return { guard, wall };
}

export function useLimitedDownload(): LimitedDownload {
  return isLimitsClientEnabled() ? useLimitedDownloadLive() : useLimitedDownloadOff();
}
