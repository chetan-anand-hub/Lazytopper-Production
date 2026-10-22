import { useEffect, useMemo, useState } from "react";
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
 * in a module-level map ("has records" for the tab's life; SHW-3: "no records" only for
 * ZERO_GRADED_NONE_TTL_MS, so grading on another device or a failed local write is seen by a
 * later mount). "Could not tell" (null) is never kept, so a failed read is retried
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

/**
 * SHW-3: how long a kept "no records" (false) answer is trusted. A student can grade on another
 * device (or a local write can fail) after the ask, so "none" is re-asked by a mount after this;
 * "has records" (true) can never become false and is kept for the life of the tab.
 */
export const ZERO_GRADED_NONE_TTL_MS = 5 * 60 * 1000;

/** uid -> the server's answer ("has at least one record") and when it arrived. Only true / false are kept. */
const kept = new Map<string, { has: boolean; at: number }>();
/** uid -> the ask in flight, joined by every other mount. */
const inFlight = new Map<string, Promise<boolean | null>>();

/** Tests only: forget every kept / in-flight answer. */
export function resetZeroGradedCacheForTests(): void {
  kept.clear();
  inFlight.clear();
}

/** The kept answer for this uid, or undefined (never asked, or a "no records" older than the TTL). */
function keptAnswer(uid: string): boolean | undefined {
  const k = kept.get(uid);
  if (!k) return undefined;
  if (k.has) return true;
  if (performance.now() - k.at < ZERO_GRADED_NONE_TTL_MS) return false;
  kept.delete(uid); // a stale "no records": the next ask reads again
  return undefined;
}

/** The cloud answer for this uid: the kept one, the one in flight, or ONE new ask. */
export function askCloudOnce(uid: string): Promise<boolean | null> {
  const known = keptAnswer(uid);
  if (known !== undefined) return Promise.resolve(known);
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
    // A monotonic, tab-local stamp (not the calendar clock): it only times the "no records" TTL.
    if (has !== null) kept.set(uid, { has, at: performance.now() });
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
  /**
   * SHW-3: change this number to look again on the SAME mount (e.g. after a graded batch): local
   * rows first, then the kept answer. It never starts a read by itself beyond what `cloud` allows.
   */
  recheck?: number;
  /**
   * MOMENTS-1 (owner ruling, 22 Oct) — "none" ONLY on the SERVER's answer. When the cloud cannot
   * answer (offline, a cached answer, any error — after the one retry), stay "loading" instead of
   * guessing "none" from the account's age: a student whose graded work is only in the cloud, on a
   * new phone with a bad connection, must never be shown a first-session moment. Default false
   * (today's behaviour, unchanged for the Start-here card and the answer boxes).
   */
  serverOnly?: boolean;
}

/** Local rows first (no network), then the kept answer; undefined when neither can say. */
function knownWithoutNetwork(uid: string | null | undefined, recheck: number): ZeroGraded | undefined {
  void recheck; // only the memo's key: a new value means "look again"
  if (!uid) return undefined;
  // Local first: any record on this device is the answer, and costs no network call.
  if (loadLocalSessionRecords(uid).length > 0) return "some";
  const k = keptAnswer(uid);
  return k === undefined ? undefined : k ? "some" : "none";
}

export function useZeroGraded(
  uid?: string | null,
  { cloud = true, recheck = 0, serverOnly = false }: UseZeroGradedOptions = {},
): ZeroGraded {
  // What the device already knows, read once per uid / recheck (no network, no effect).
  const known = useMemo(() => knownWithoutNetwork(uid, recheck), [uid, recheck]);
  // An answer that needed the network, tagged with the uid + recheck it answers, so a sign-in (or a
  // recheck) never inherits the previous verdict: it reads "loading" until its own answer lands.
  const [asked, setAsked] = useState<{ uid: string; recheck: number; graded: ZeroGraded } | null>(null);

  useEffect(() => {
    if (!uid || known !== undefined) return;
    let cancelled = false;
    const settle = (graded: ZeroGraded) => {
      if (!cancelled) setAsked({ uid, recheck, graded });
    };
    if (!cloud) {
      // No new read: join an ask another mount already started; else stay "loading".
      const pending = inFlight.get(uid);
      if (pending) {
        void pending.then((has) => {
          if (has !== null) settle(has ? "some" : "none");
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
      // MOMENTS-1: a server-only reader makes no retry of its own (it would be a SECOND read beside the
      // card's retry); "could not tell" simply stays "loading" — no moment.
      if (has === null && !serverOnly) {
        await new Promise((r) => setTimeout(r, START_HERE_RETRY_MS));
        if (cancelled) return;
        has = await askCloudOnce(uid);
        if (cancelled) return;
      }
      if (has === null) {
        // MOMENTS-1: a server-only reader never guesses — no answer, no "none".
        if (serverOnly) {
          settle("loading");
          return;
        }
        // Still cannot tell: a young account with no local rows is almost certainly new; an older
        // or unknown one is never shown the card on a failed read.
        settle(accountIsNew(uid) ? "none" : "some");
        return;
      }
      settle(has === false ? "none" : "some");
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, cloud, recheck, known, serverOnly]);

  if (!uid) return "loading";
  if (known !== undefined) return known;
  return asked && asked.uid === uid && asked.recheck === recheck ? asked.graded : "loading";
}
