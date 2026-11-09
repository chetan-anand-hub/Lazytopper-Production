/**
 * BRIDGE-CODES-1 - is a pack paper code (`PK-...`) saved on THIS student's account? One read of the student's OWN record
 * document (`sessionRecords/{uid}/records/{code}`, the document registerPackPaper writes at download). Never a write, never
 * a model call, never grades.
 *
 * `true` / `false` are answers. `null` is "could not tell" (no uid, no Firestore, an offline CACHED answer, or ANY error)
 * and is never folded into `false`: the Answer Checker says "this paper is not in your papers yet" only on a positive
 * server answer, so a network blip never tells a buyer their paper is missing.
 */
import { isFirestoreEnabled, withFirestore } from "../../services/firestoreSdk";

export async function packCodeSavedOnAccount(uid: string | null | undefined, code: string): Promise<boolean | null> {
  if (!uid || !code || !isFirestoreEnabled()) return null;
  try {
    const id = code.replace(/[/.#$[\]\s]/g, "_");
    const snap = await withFirestore(({ fs, db }) => fs.getDoc(fs.doc(db, "sessionRecords", uid, "records", id)));
    if (snap.metadata?.fromCache) return null;
    return snap.exists();
  } catch {
    return null;
  }
}
