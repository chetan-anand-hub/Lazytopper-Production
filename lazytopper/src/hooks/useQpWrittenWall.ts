/**
 * useQpWrittenWall — GATE-QP-1: does THIS student meet the Board Pass screen on Quick Practice's written answers?
 * Chosen once at module load from the build-time kill switch (VITE_GATE_QP_DISABLED), so the hook order never changes and, with the
 * switch set, no subscription read is added to the page at all. Fails open (see lib/practice/qpWrittenGate.ts).
 */
import { useAuth } from "../context/AuthContext";
import { gateQpDisabled, qpWrittenWallApplies } from "../lib/practice/qpWrittenGate";
import { useSubscription } from "./useSubscription";

function useQpWrittenWallOff(): boolean {
  return false;
}

function useQpWrittenWallLive(): boolean {
  const { user } = useAuth();
  const { tier, hydrated } = useSubscription();
  return qpWrittenWallApplies({ uid: user?.uid, hydrated, tier });
}

export const useQpWrittenWall: () => boolean = gateQpDisabled() ? useQpWrittenWallOff : useQpWrittenWallLive;
