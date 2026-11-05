/**
 * NAV-PRICING-1 — the "new" dot on the phone avatar: a graded paper the student has not yet seen on Me.
 *
 * Honest signal only, and clock-free: opening Me stores the `gradedAt` of the newest device-local SessionRecord
 * it could show (per uid, localStorage — a per-viewer convenience, every access in try/catch). The dot is on
 * exactly when the newest record NOW is newer than that. No graded record -> no dot; storage blocked -> no dot.
 * No stored key yet (first load after this shipped, or a new device) -> the current newest is stored SILENTLY and
 * there is no dot: an existing student is never told "New" about papers they graded before the dot existed.
 */
import { loadLocalSessionRecords } from "../../services/sessionRecords";

const key = (uid: string) => `lazytopper.meSeenGradedAt.${uid}`;

function newestGradedAt(uid: string): number {
  let newest = 0;
  for (const r of loadLocalSessionRecords(uid)) if (r.gradedAt > newest) newest = r.gradedAt;
  return newest;
}

/** Called when Me is opened: everything graded so far counts as seen. */
export function markMeSeen(uid: string | null | undefined): void {
  if (!uid) return;
  try {
    window.localStorage.setItem(key(uid), String(newestGradedAt(uid)));
  } catch {
    /* storage blocked: the dot just stays off */
  }
}

export function hasUnseenGradedPaper(uid: string | null | undefined): boolean {
  if (!uid) return false;
  try {
    const newest = newestGradedAt(uid);
    if (!newest) return false;
    const raw = window.localStorage.getItem(key(uid));
    if (raw === null) {
      window.localStorage.setItem(key(uid), String(newest));
      return false;
    }
    const seen = Number(raw);
    return newest > (Number.isFinite(seen) ? seen : 0);
  } catch {
    return false;
  }
}
