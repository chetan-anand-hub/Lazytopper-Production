import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";

export interface LearnerAccountMetadata {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  authProvider: string;
}

function cleanNullableString(value: string | null | undefined): string | null {
  const cleaned = String(value || "").trim();
  return cleaned ? cleaned : null;
}

export async function ensureLearnerAccountMetadata(
  input: LearnerAccountMetadata
): Promise<void> {
  const uid = cleanNullableString(input.uid);
  if (!uid || !firestoreDb) return;

  const now = new Date().toISOString();
  const ref = doc(firestoreDb, "users", uid);

  try {
    const snap = await getDoc(ref);
    const payload = {
      uid,
      email: cleanNullableString(input.email),
      phoneNumber: cleanNullableString(input.phoneNumber),
      displayName: cleanNullableString(input.displayName),
      authProvider: cleanNullableString(input.authProvider) || "clerk",
      lastLoginAt: now,
      updatedAt: now,
      ...(snap.exists() ? {} : { createdAt: now }),
    };

    await setDoc(ref, payload, { merge: true });
  } catch {
    // Non-blocking by design. Login must not fail if account metadata cannot sync.
  }
}
