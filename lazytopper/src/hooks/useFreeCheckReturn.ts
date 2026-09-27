import { useEffect, useState } from "react";
import type { AuthUser } from "../context/AuthContext";
import { hasReplayablePendingFreeCheck } from "../services/freeCheckClient";
import {
  getInflightFreeCheckReplay,
  isReplayReady,
  setFreeCheckSaveStatus,
  startFreeCheckReplay,
  type FreeCheckReplayOutcome,
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
 *
 * FREECHECK-2 · F2 (FU-FREECHECK-OFFLINE-SAVING) — "saving" keeps the page's save panel
 * up; what the panel SAYS is published through `setFreeCheckSaveStatus`:
 *   · offline before the write, or offline while it runs → "offline"; the write starts
 *     (or resumes) on the browser `online` event;
 *   · a save that FAILS for lack of network → "offline", retried ONCE on `online`;
 *   · any other failure (or that retry failing) → "failed", with a "Try again" button;
 *   · a write still unconfirmed after SAVE_STALL_MS → "failed" too. Its "Try again"
 *     JOINS the running write (one in-flight replay per uid), so it can never write twice.
 * Never an endless "Saving your answer…".
 */
export type FreeCheckReturnPhase = "none" | "saving" | "saved";

const READY_POLL_MS = 100;
const READY_POLL_MAX = 50; // ~5s
/** F2 — how long a write may run unconfirmed before the panel stops saying "Saving…". */
export const SAVE_STALL_MS = 20_000;

function browserOffline(): boolean {
  try {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  } catch {
    return false;
  }
}

export function useFreeCheckReturn(user: AuthUser | null, enabled: boolean): FreeCheckReturnPhase {
  const uid = user?.uid ?? "";
  const [phase, setPhase] = useState<FreeCheckReturnPhase>("none");
  const [settledUid, setSettledUid] = useState<string>("");

  useEffect(() => {
    if (!enabled || !user || !uid) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    let detach: (() => void) | null = null;
    const signedInUser = user;

    const clearWaits = () => {
      if (detach) detach();
      detach = null;
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = undefined;
    };

    const settle = (next: FreeCheckReturnPhase) => {
      if (cancelled) return;
      clearWaits();
      setPhase(next);
      setSettledUid(uid);
    };

    /** Keep the save panel up (phase "saving") and say what it is waiting on. */
    const hold = (status: "saving" | "offline" | "failed", retry: (() => void) | null = null) => {
      if (cancelled) return;
      setFreeCheckSaveStatus(status, retry);
      setPhase("saving");
      setSettledUid(uid);
    };

    /** Run `fn` once, on the next browser `online` event. */
    const onceOnline = (fn: () => void) => {
      clearWaits();
      const handler = () => {
        clearWaits();
        if (!cancelled) fn();
      };
      window.addEventListener("online", handler);
      detach = () => window.removeEventListener("online", handler);
    };

    /**
     * Await one replay (new, joined, or a resume) and act on how it ended. While it runs
     * the panel follows the network: offline → "offline", back → "saving"; unconfirmed
     * after SAVE_STALL_MS → "failed", whose retry joins this same in-flight write.
     */
    let watchGen = 0;
    const watch = async (replay: Promise<FreeCheckReplayOutcome>, autoRetryLeft: boolean) => {
      clearWaits();
      // A newer watch (the stalled panel's "Try again" re-joining this write) owns the
      // outcome; an older one only stops listening.
      const gen = ++watchGen;
      let stalled = false;
      const reflect = () => {
        if (browserOffline()) hold("offline");
        else if (stalled) hold("failed", () => void watch(replay, autoRetryLeft));
        else hold("saving");
      };
      const onNetwork = () => reflect();
      window.addEventListener("online", onNetwork);
      window.addEventListener("offline", onNetwork);
      detach = () => {
        window.removeEventListener("online", onNetwork);
        window.removeEventListener("offline", onNetwork);
      };
      stallTimer = setTimeout(() => {
        stalled = true;
        reflect();
      }, SAVE_STALL_MS);
      reflect();

      const outcome = await replay;
      if (cancelled || gen !== watchGen) return;
      clearWaits();
      if (outcome.kind === "saved") {
        settle("saved");
        return;
      }
      if (outcome.kind !== "failed") {
        settle("none");
        return;
      }
      // F2 — the save failed. Only THIS tab can resume it (it holds `gradedAt`).
      const resume = (autoRetry: boolean) =>
        void watch(startFreeCheckReplay(signedInUser, outcome.gradedAt), autoRetry);
      if (outcome.offline && autoRetryLeft) {
        hold("offline");
        onceOnline(() => resume(false)); // retried ONCE on `online`
        return;
      }
      // Any other failure, or the one retry failing: a button, never an endless spinner.
      // A tap earns a fresh automatic retry if that attempt, too, fails offline.
      hold("failed", () => resume(true));
    };

    const run = async (tries: number): Promise<void> => {
      if (cancelled) return;
      const joined = getInflightFreeCheckReplay(uid);
      if (!joined && !hasReplayablePendingFreeCheck()) {
        settle("none");
        return;
      }
      if (!joined && !isReplayReady(signedInUser)) {
        if (tries >= READY_POLL_MAX) {
          settle("none"); // left waiting on the device for the next visit
          return;
        }
        timer = setTimeout(() => void run(tries + 1), READY_POLL_MS);
        return;
      }
      if (!joined && browserOffline()) {
        // F2 — nothing is claimed while offline: the write starts when the network is back.
        hold("offline");
        onceOnline(() => void run(tries));
        return;
      }
      await watch(joined ?? startFreeCheckReplay(signedInUser), true);
    };

    setFreeCheckSaveStatus("saving");
    void run(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      clearWaits();
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
