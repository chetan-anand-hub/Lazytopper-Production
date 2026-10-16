import { useEffect, useState } from "react";
import { cloudHasAnySessionRecord, loadLocalSessionRecords } from "../../services/sessionRecords";
import { authClient } from "../../services/firebaseClient";

/**
 * SHW-2 — the ONE "has this signed-in student any graded result?" signal, shared by the
 * Start-here card (useStartHere) and the answer boxes' type-first default (Practice and
 * Check & Improve). Moved here verbatim from StartHereCard.tsx so both read it the same way.
 *
 * ★ TRI-STATE, as before: "loading" until a completed answer. Local rows first (no network);
 * only a device with no local rows asks the cloud, and only whether ONE record exists
 * (`cloudHasAnySessionRecord`, limit(1)).
 *
 * ★ NO EXTRA READ (owner ruling, 16 Oct): the cloud answer is shared per uid across every
 * mount in this tab — an in-flight ask is joined, and a SERVER answer (true / false) is kept
 * in a module-level map. "Could not tell" (null) is never kept, so a failed read is retried
 * exactly as it always was. Readers that must not add a read at all (Practice) pass
 * `{ cloud: false }`: local rows, then the kept answer, then an ask already in flight — and
 * otherwise "loading" (their caller's unchanged default).
 */
export type ZeroGraded = "loading" | "none" | "some";

/** One more ask after this long when the cloud could not answer. */
export const START_HERE_RETRY_MS = 3000;
/** An account created within this many days counts as new when the network cannot say. */
export const START_HERE_NEW_ACCOUNT_DAYS = 7;

/** The signed-in user's Firebase Auth `metadata.creationTime`, already on the device. Missing,
 *  unparseable, a different user, or in the future -> false (never guess "new"). */
export function accountIsNew(uid: string, now: number = Date.now()): boolean {
  try {
    const user = authClient?.currentUser;
    if (!user || user.uid !== uid) return false;
    const created = Date.parse(user.metadata?.creationTime ?? "");
    if (!Number.isFinite(created)) return false;
    const age = now - created;
    return age >= 0 && age <= START_HERE_NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** uid -> the server's answer ("has at least one record"). Only true / false are kept. */
const kept = new Map<string, boolean>();
/** uid -> the ask in flight, joined by every other mount. */
const inFlight = new Map<string, Promise<boolean | null>>();

/** Tests only: forget every kept / in-flight answer. */
export function resetZeroGradedCacheForTests(): void {
  kept.clear();
  inFlight.clear();
}

/** The cloud answer for this uid: the kept one, the one in flight, or ONE new ask. */
export function askCloudOnce(uid: string): Promise<boolean | null> {
  if (kept.has(uid)) return Promise.resolve(kept.get(uid) as boolean);
  const pending = inFlight.get(uid);
  if (pending) return pending;
  const ask = (async (): Promise<boolean | null> => {
    try {
      return await cloudHasAnySessionRecord(uid);
    } catch {
      return null;
    }
  })().then((has) => {
    inFlight.delete(uid);
    if (has !== null) kept.set(uid, has);
    return has;
  });
  inFlight.set(uid, ask);
  return ask;
}

/** Which answer tab is selected at first. Both tabs always show; this never changes grading. */
export type DefaultAnswerMode = "type" | "upload";

/**
 * SHW-2 TYPE-FIRST DEFAULT (owner ruling, 16 Oct). A Start-here WRITTEN set, or a signed-in student
 * with ZERO graded answers -> "type". Anything else - still loading, graded work, signed out (no uid,
 * so the signal stays "loading") -> undefined: the caller's unchanged default (upload).
 */
export function typeFirstAnswerMode(
  zeroGraded: ZeroGraded,
  opts: { startHereWritten?: boolean } = {},
): DefaultAnswerMode | undefined {
  if (opts.startHereWritten) return "type";
  return zeroGraded === "none" ? "type" : undefined;
}

export interface UseZeroGradedOptions {
  /** false -> never START a cloud read (join one in flight / use a kept answer only). Default true. */
  cloud?: boolean;
}

export function useZeroGraded(uid?: string | null, { cloud = true }: UseZeroGradedOptions = {}): ZeroGraded {
  const [graded, setGraded] = useState<ZeroGraded>("loading");

  useEffect(() => {
    // Re-enter "loading" on a uid change so a sign-in can never inherit the previous verdict.
    setGraded("loading");
    if (!uid) return;
    // Local first: any record on this device is the answer, and costs no network call.
    if (loadLocalSessionRecords(uid).length > 0) {
      setGraded("some");
      return;
    }
    let cancelled = false;
    if (!cloud) {
      // No new read: a kept answer, or one another mount already started; else stay "loading".
      if (kept.has(uid)) {
        setGraded(kept.get(uid) ? "some" : "none");
        return;
      }
      const pending = inFlight.get(uid);
      if (pending) {
        void pending.then((has) => {
          if (!cancelled && has !== null) setGraded(has ? "some" : "none");
        });
      }
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      // `true` -> a returning student; `false` -> a first session. `null` is "could not tell"
      // (offline, no Firestore, a cached answer, any error): ask ONCE more after a few seconds,
      // and if the network still cannot answer, decide from the account's age (known on the
      // device, no network) so a weak connection never hides the card from a NEW student.
      let has = await askCloudOnce(uid);
      if (cancelled) return;
      if (has === null) {
        await new Promise((r) => setTimeout(r, START_HERE_RETRY_MS));
        if (cancelled) return;
        has = await askCloudOnce(uid);
        if (cancelled) return;
      }
      if (has === null) {
        // Still cannot tell: a young account with no local rows is almost certainly new; an older
        // or unknown one is never shown the card on a failed read.
        setGraded(accountIsNew(uid) ? "none" : "some");
        return;
      }
      setGraded(has === false ? "none" : "some");
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, cloud]);

  return graded;
}
