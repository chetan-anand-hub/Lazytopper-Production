/**
 * useLimitedDownload — LIMITS-1 PR-1: "mint first, build the PDF only on success".
 *
 *   const limited = useLimitedDownload();
 *   if (!(await limited.guard("worksheet", paperKey))) return;   // wall is already showing
 *   ...build the PDF...
 *   {limited.wall}
 *
 * A paper and its own solutions share ONE paperKey, so the second download of the same paper
 * spends nothing. With VITE_LIMITS_ENABLED off, or for Premium, `guard` resolves true at once
 * and makes no request: the dark build behaves exactly as before.
 */
import { useCallback, useState, type ReactNode } from "react";
import DownloadLimitWall, { type DownloadWallVariant } from "../components/limits/DownloadLimitWall";
import { useAuth } from "../context/AuthContext";
import { trackDownload, type DownloadKind } from "../analytics/analytics";
import { isLimitsClientEnabled, mintDownload } from "../services/limitsClient";
import { useSubscription } from "./useSubscription";

interface WallState {
  variant: DownloadWallVariant;
  resetAt: string | null;
  kind: DownloadKind;
}

export interface LimitedDownload {
  /** Resolves true when the PDF may be built. False means a wall is showing. */
  guard: (kind: DownloadKind, paperKey: string) => Promise<boolean>;
  /** Render this once, anywhere in the page. null when no wall is open. */
  wall: ReactNode;
}

export function useLimitedDownload(): LimitedDownload {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const signedIn = Boolean(user?.uid);
  const [wallState, setWallState] = useState<WallState | null>(null);

  const guard = useCallback(
    async (kind: DownloadKind, paperKey: string): Promise<boolean> => {
      if (!isLimitsClientEnabled() || isPremium) return true;
      const result = await mintDownload(kind, paperKey, signedIn);
      switch (result.status) {
        case "ok":
          trackDownload(kind, "start");
          return true;
        case "blocked":
          trackDownload(kind, "blocked");
          trackDownload(kind, "wall_shown");
          setWallState({ variant: "blocked", resetAt: result.resetAt, kind });
          return false;
        case "signed_out":
          trackDownload(kind, "wall_shown");
          setWallState({ variant: "signed_out", resetAt: null, kind });
          return false;
        case "offline":
          setWallState({ variant: "offline", resetAt: null, kind });
          return false;
        default:
          return true;
      }
    },
    [isPremium, signedIn],
  );

  const wall = wallState ? (
    <DownloadLimitWall variant={wallState.variant} resetAt={wallState.resetAt} onClose={() => setWallState(null)} />
  ) : null;

  return { guard, wall };
}
