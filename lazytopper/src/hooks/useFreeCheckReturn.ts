import { useEffect, useState } from "react";
import type { AuthUser } from "../context/AuthContext";
import { hasReplayablePendingFreeCheck } from "../services/freeCheckClient";
import {
  getInflightFreeCheckReplay,
  isReplayReady,
  startFreeCheckReplay,
} from "../services/freeCheckReplay";

/**
 * FREE-CHECK-1b, R8 — drive the replay of a waiting free result for a SIGNED-IN student
 * on /check-improve.
 *
 *   none    nothing waiting (or the replay could not run) → the page as today
 *   saving  a result is waiting / being written
 *   saved   written through recordMistake + recordAttempt → the R9 offer may follow
 *
 * `user` must be null while auth is loading. The replay waits for the ACTIVE PROGRESS
 * uid to equal `user.uid` (AuthContext sets it in an effect that runs after ours), polling
 * briefly; if it never arrives the result is left on the device for the next visit.
 *
 * OR-18 — only a REPLAYABLE result counts here: unexpired, and matched by this tab's
 * sign-in marker. A sign-in without the marker is `none` from the first render — no
 * "saving", no write, no trial offer — and the result is left on the device to expire.
 */
export type FreeCheckReturnPhase = "none" | "saving" | "saved";

const READY_POLL_MS = 100;
const READY_POLL_MAX = 50; // ~5s

export function useFreeCheckReturn(user: AuthUser | null, enabled: boolean): FreeCheckReturnPhase {
  const uid = user?.uid ?? "";
  const [phase, setPhase] = useState<FreeCheckReturnPhase>("none");
  const [settledUid, setSettledUid] = useState<string>("");

  useEffect(() => {
    if (!enabled || !user || !uid) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (next: FreeCheckReturnPhase) => {
      if (cancelled) return;
      setPhase(next);
      setSettledUid(uid);
    };

    const run = async (tries: number): Promise<void> => {
      if (cancelled) return;
      const joined = getInflightFreeCheckReplay(uid);
      if (!joined && !hasReplayablePendingFreeCheck()) {
        settle("none");
        return;
      }
      if (!joined && !isReplayReady(user)) {
        if (tries >= READY_POLL_MAX) {
          settle("none"); // left waiting on the device for the next visit
          return;
        }
        timer = setTimeout(() => void run(tries + 1), READY_POLL_MS);
        return;
      }
      setPhase("saving");
      const outcome = await (joined ?? startFreeCheckReplay(user));
      settle(outcome.kind === "saved" ? "saved" : "none");
    };

    void run(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // `user` is read through `uid`: a new object for the same uid is not a new student.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, uid]);

  if (!enabled || !uid) return "none";
  // Before this uid's replay has settled, a waiting result means "saving" — so the first
  // render after sign-in never flashes the Premium lock at a student whose answer is
  // about to be saved.
  if (settledUid !== uid) {
    return hasReplayablePendingFreeCheck() || getInflightFreeCheckReplay(uid) ? "saving" : "none";
  }
  return phase;
}
