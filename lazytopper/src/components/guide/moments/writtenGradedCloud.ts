/**
 * MOMENTS-1 M11 — does the DURABLE store hold a WRITTEN-answer grade for this uid? One query,
 * `limit(1)`, on the account's own session records: a record from a surface that grades written
 * work (Check & Improve, Worksheet, Chapter Test, Full Mock). `true` / `false` are the SERVER's
 * answers; `null` is "could not tell" (no Firestore, a cached snapshot, any error) and is never
 * folded into `false` (the caller then shows nothing). Same rules as
 * services/sessionRecords.cloudHasAnySessionRecord; kept here so that file is untouched.
 */
import { isFirestoreEnabled, withFirestore } from "../../../services/firestoreSdk";

/** The surfaces whose session record means "a written answer was graded". Quick Practice records
 *  are not counted (an MCQ-only set writes one too): FU-MOMENTS-M11-QP-WRITTEN. */
export const WRITTEN_GRADED_SURFACES = ["check-improve", "worksheet", "chapter-test", "full-mock"] as const;

export async function cloudHasWrittenGraded(uid: string): Promise<boolean | null> {
  if (!uid || !isFirestoreEnabled()) return null;
  try {
    const snap = await withFirestore(({ fs, db }) =>
      fs.getDocs(
        fs.query(
          fs.collection(db, "sessionRecords", uid, "records"),
          fs.where("surface", "in", [...WRITTEN_GRADED_SURFACES]),
          fs.limit(1),
        ),
      ),
    );
    if (snap.metadata?.fromCache) return null;
    return !snap.empty;
  } catch {
    return null;
  }
}
