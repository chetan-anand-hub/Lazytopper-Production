import { firestoreDb } from "./firebaseClient";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";

// Define what a Session looks like
export interface SessionStartData {
  topicId: string;
  conceptId: string;
  subject: string;
}

/**
 * Creates a new session document in Firestore.
 * Path: learnerProfiles/{uid}/sessions/{sessionId}
 */
export async function createNewSession(userId: string, data: SessionStartData) {
  if (!firestoreDb) {
    throw new Error("Firestore is not initialized. Check firebaseClient.ts");
  }

  // 1. Reference the user's profile
  const userProfileRef = doc(firestoreDb, "learnerProfiles", userId);

  // 2. Create a reference to a new (random ID) document in the 'sessions' subcollection
  const sessionsRef = collection(userProfileRef, "sessions");
  const newSessionDoc = doc(sessionsRef); // Auto-generates ID

  // 3. Prepare the data to save
  const sessionPayload = {
    sessionId: newSessionDoc.id,
    ...data,
    startTime: serverTimestamp(),
    status: "active",
    platform: "web",
    lastUpdated: serverTimestamp(),
  };

  // 4. Write to cloud
  await setDoc(newSessionDoc, sessionPayload);

  console.log("✅ Session Created in Cloud:", newSessionDoc.id);
  return newSessionDoc.id;
}
