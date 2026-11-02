import { useEffect, useRef, useState } from "react";
import { wasTrialStartedAtSignUp } from "../../services/newAccountTrial";
import { START_HERE_RETRY_MS, accountIsNew, askCloudOnce, useZeroGraded, type ZeroGraded } from "./zeroGraded";

/**
 * ACT-FIRST-1 — why the LADDER / first-action card may show: the server's own "zero graded"
 * answer, or (when that read is slow, cached or failed) a new-account signal already on the device.
 */
export type FirstActionReason = "server_zero" | "new_by_signal";

/** After this long without a server answer, an account young by Firebase `creationTime` counts as new (the card's own retry + a beat). */
export const FIRST_ACTION_AGE_WAIT_MS = START_HERE_RETRY_MS + 500;

/**
 * ACT-FIRST-1 — the zero-graded read for the LADDER / first-action card ONLY. Byte "moments" and every
 * other caller keep `useZeroGraded(uid, { serverOnly: true })` unchanged (MOMENTS-1).
 *
 *  - the server (or a local row) answers -> exactly `serverOnly`'s answer; "some" always wins;
 *  - no answer yet, and THIS tab started the account's trial at sign-up (`wasTrialStartedAtSignUp`) ->
 *    "none" at once (a brand-new account has nothing graded; local rows were already checked);
 *  - no answer after FIRST_ACTION_AGE_WAIT_MS and the account is <= 7 days old (`accountIsNew`) -> "none".
 * Never "none" for a student with a local graded row, and a later server "some" takes the card away again.
 */
export function useFirstActionZeroGraded(uid?: string | null): { zeroGraded: ZeroGraded; reason: FirstActionReason | null } {
  const server = useZeroGraded(uid, { serverOnly: true });
  const signup = !!uid && wasTrialStartedAtSignUp(uid);
  // The account's age is read only when it can matter (no answer yet, no sign-up marker).
  const young = !!uid && server === "loading" && !signup && accountIsNew(uid);
  const [waited, setWaited] = useState<string | null>(null);
  useEffect(() => {
    if (!uid || !young) return;
    const t = setTimeout(() => setWaited(uid), FIRST_ACTION_AGE_WAIT_MS);
    return () => clearTimeout(t);
  }, [uid, young]);
  const bySignal = !!uid && server === "loading" && (signup || (young && waited === uid));

  // RETRACTION: a card shown on a signal is checked once more against the server - after the wait, and on
  // window focus. askCloudOnce joins an ask in flight / uses a kept answer, and a failed ask is not repeated
  // here, so this adds at most ONE extra read. A server "some" takes the card away.
  const [retracted, setRetracted] = useState<string | null>(null);
  const recheck = useRef<"idle" | "failed">("idle");
  useEffect(() => {
    if (!uid || !bySignal) return;
    let live = true;
    const check = () => {
      if (recheck.current === "failed") return;
      void askCloudOnce(uid).then((has) => {
        if (!live) return;
        if (has === null) recheck.current = "failed";
        else if (has) setRetracted(uid);
      });
    };
    const t = setTimeout(check, FIRST_ACTION_AGE_WAIT_MS);
    window.addEventListener("focus", check);
    return () => {
      live = false;
      clearTimeout(t);
      window.removeEventListener("focus", check);
    };
  }, [uid, bySignal]);

  if (!uid) return { zeroGraded: "loading", reason: null };
  if (retracted === uid) return { zeroGraded: "some", reason: null };
  if (server !== "loading") return { zeroGraded: server, reason: server === "none" ? "server_zero" : null };
  if (bySignal) return { zeroGraded: "none", reason: "new_by_signal" };
  return { zeroGraded: "loading", reason: null };
}
