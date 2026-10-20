import { loadLocalSessionRecords, type SessionRecord } from "../services/sessionRecords";
import { trackFirstGraded, type FirstGradedSurface } from "./analytics";

/**
 * MEASURE-1 B — `first_graded`, ONCE PER ACCOUNT: the first time a signed-in student gets a
 * graded result. Google Ads bids on sign-ups, and most sign-ups never get anything graded; this
 * is the event GA4 can mark as a key event and Ads can import.
 *
 * ★ WHERE IT IS CALLED. Every graded surface ends in ONE persist seam that writes the durable
 * SessionRecord (sessionRecords.ts `writeSessionRecord`); each seam calls this right after that
 * write, with the record it wrote and its own surface name. That file itself is a guarded
 * (additive-only) file, so the call lives in the seams, not in it. The record is only READ here.
 *
 * ★ OBSERVE ONLY. Nothing here changes a grade, a mark, a record or a prompt; it never throws.
 *
 * ★ WHAT COUNTS AS "GRADED". A record whose status is "graded" or "partial" (something on it was
 * graded). A "pending-upload" record (a downloaded paper, nothing graded yet) never counts.
 *
 * ★ ONCE PER ACCOUNT, PER DEVICE. A localStorage marker `lazytopper.firstGraded.<tag>` = "1", where
 * <tag> is an 8-hex FNV-1a hash of the uid (never the uid itself); it holds no premium or trial
 * state and is never sent anywhere. Plus an in-memory set for this page load (blocked storage).
 * Before firing, the device's own record mirror is checked: an account that ALREADY has another
 * graded record on this device is not new, so the marker is set and nothing is sent — that stops
 * every existing student from firing once on their next grade after deploy.
 * ⚠ CROSS-DEVICE: a student whose earlier records are not mirrored on this device (a new phone,
 * cleared storage) can fire once more there. Accepted (MEASURE-1 §2B); no cloud read is added.
 */
export const FIRST_GRADED_KEY_PREFIX = "lazytopper.firstGraded.";

const sentThisLoad = new Set<string>();

/** FNV-1a (32-bit) -> 8 lowercase hex. A device-local key suffix only; never sent. */
function accountTag(uid: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < uid.length; i += 1) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function firstGradedKey(uid: string): string {
  return `${FIRST_GRADED_KEY_PREFIX}${accountTag(uid)}`;
}

/**
 * Call right after a persist seam's `writeSessionRecord(user, record)`, with the same record.
 * Fires `first_graded { surface }` at most once per account on this device.
 */
export function noteFirstGraded(
  uid: string | null | undefined,
  record: Pick<SessionRecord, "id" | "status"> | null | undefined,
  surface: FirstGradedSurface,
): void {
  try {
    if (!uid || uid === "anonymous" || !record || !record.id) return;
    if (record.status !== "graded" && record.status !== "partial") return;
    const key = firstGradedKey(uid);
    if (sentThisLoad.has(key)) return;
    sentThisLoad.add(key);
    try {
      if (window.localStorage.getItem(key) === "1") return;
      window.localStorage.setItem(key, "1");
    } catch {
      /* blocked storage: the in-memory set still holds this page load */
    }
    const hadGradedBefore = loadLocalSessionRecords(uid).some(
      (r) => r.id !== record.id && (r.status === "graded" || r.status === "partial"),
    );
    if (hadGradedBefore) return;
    trackFirstGraded(surface);
  } catch {
    /* analytics must never break grading */
  }
}

/** Test seam: forget this page load's in-memory marks (localStorage is left as a reload leaves it). */
export function __resetFirstGradedForTests(): void {
  sentThisLoad.clear();
}
