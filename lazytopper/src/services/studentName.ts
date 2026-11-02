/**
 * studentName — PAY-PHONE-1: the student's name printed on their pack PDFs, for an account that has none (a phone
 * sign-in usually has no display name). Saved with the SAME Firebase profile update the sign-up doors use
 * (`updateProfile(user, { displayName })`, AuthContext); there is no second name store. The server reads it back from
 * Firebase Auth's own record when it builds the licensee (`/api/packs/mine`), so it can never be typed into a PDF here.
 *
 * "Skip" is remembered on this device only: localStorage `lazytopper.packNameSkipped.<tag>` ("1"; <tag> is an 8-hex hash
 * of the uid, never the uid). It is a "don't ask again" convenience, never premium, trial or pack state.
 */
import { updateProfile } from "firebase/auth";
import { guideAccountTag } from "../components/guide/guideVariant";

export const STUDENT_NAME_MAX = 40;
export const PACK_NAME_SKIPPED_PREFIX = "lazytopper.packNameSkipped.";

/** Trimmed, single-spaced; null unless 1-40 characters of letters, spaces and . - ' with at least one letter. */
export function cleanStudentName(raw: string | null | undefined): string | null {
  const v = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!v || v.length > STUDENT_NAME_MAX) return null;
  if (!/^[\p{L}\p{M} .'-]+$/u.test(v) || !/\p{L}/u.test(v)) return null;
  return v;
}

export function packNameSkipped(uid: string): boolean {
  try {
    return !!uid && window.localStorage.getItem(PACK_NAME_SKIPPED_PREFIX + guideAccountTag(uid)) === "1";
  } catch {
    return false;
  }
}

export function skipPackName(uid: string): void {
  try {
    if (uid) window.localStorage.setItem(PACK_NAME_SKIPPED_PREFIX + guideAccountTag(uid), "1");
  } catch {
    /* private mode: the prompt may ask again, which is harmless */
  }
}

/** Saves the display name on the signed-in Firebase account ONLY when it has none. Throws on a bad name or failure. */
export async function saveStudentName(raw: string): Promise<string> {
  const name = cleanStudentName(raw);
  if (!name) throw new Error("invalid_name");
  // A STATIC firebase/auth import (as every other module): a dynamic one split firebase/auth out of its own chunk and
  // into the entry, over the PERF-3 budget.
  const { authClient } = await import("./firebaseClient");
  const user = authClient?.currentUser ?? null;
  if (!user) throw new Error("signed-out");
  if (user.displayName && user.displayName.trim()) return user.displayName;
  await updateProfile(user, { displayName: name });
  return name;
}
