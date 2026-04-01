// src/services/sessionLogger.ts
import { firestoreDb } from "./firebaseClient";
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";

export type ActivityType =
  | "practice"
  | "dailyMix"
  | "hpq"
  | "topicHub"
  | "mock"
  | "mentor";

export interface StudySessionActivity {
  timestamp: string;
  type: ActivityType;
  topicKey?: string;
  questionIds?: string[];
  score?: number;
  durationMinutes?: number;
}

export interface StudySessionLog {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  energyLevel?: "Low" | "High";
  activities: StudySessionActivity[];
  platform: "web";
  status: "active" | "completed";
}

// Keep local copy for instant UI updates
let currentSession: StudySessionLog | null = null;
const logs: StudySessionLog[] = [];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

/**
 * Start a new session and save to Firestore.
 */
export async function startSession(
  userId: string,
  energyLevel?: "Low" | "High",
) {
  // 1. Close existing if any
  if (currentSession) {
    endSession();
  }

  const sessionId = generateId();
  const startTime = new Date().toISOString();

  // 2. Update Local State (Instant UI)
  currentSession = {
    id: sessionId,
    userId,
    startTime,
    energyLevel,
    activities: [],
    platform: "web",
    status: "active",
  };

  // 3. Save to Cloud (Background)
  if (firestoreDb && userId) {
    try {
      const sessionRef = doc(
        firestoreDb,
        "learnerProfiles",
        userId,
        "sessions",
        sessionId,
      );
      await setDoc(sessionRef, {
        ...currentSession,
        createdAt: serverTimestamp(), // Server time is more accurate
        lastUpdated: serverTimestamp(),
      });
      console.log("☁️ Session started in Cloud:", sessionId);
    } catch (e) {
      console.error("🔥 Failed to start cloud session:", e);
    }
  }
}

/**
 * Log an activity. Adds to local array AND appends to Firestore array.
 */
export async function logActivity(
  activityData: Omit<StudySessionActivity, "timestamp">,
) {
  if (!currentSession) return;

  const newActivity: StudySessionActivity = {
    timestamp: new Date().toISOString(),
    ...activityData,
  };

  // 1. Local Update
  currentSession.activities.push(newActivity);

  // 2. Cloud Update
  if (firestoreDb && currentSession.userId) {
    try {
      const sessionRef = doc(
        firestoreDb,
        "learnerProfiles",
        currentSession.userId,
        "sessions",
        currentSession.id,
      );
      await updateDoc(sessionRef, {
        activities: arrayUnion(newActivity),
        lastUpdated: serverTimestamp(),
      });
      console.log("☁️ Activity logged:", activityData.type);
    } catch (e) {
      console.error("🔥 Failed to log activity to cloud:", e);
    }
  }
}

/**
 * End the session. Marks as completed in Firestore.
 */
export async function endSession() {
  if (!currentSession) return;

  const endTime = new Date().toISOString();

  // 1. Local Update
  currentSession.endTime = endTime;
  currentSession.status = "completed";
  logs.push(currentSession);

  const finalSession = { ...currentSession }; // Copy for async use
  currentSession = null;

  // 2. Cloud Update
  if (firestoreDb && finalSession.userId) {
    try {
      const sessionRef = doc(
        firestoreDb,
        "learnerProfiles",
        finalSession.userId,
        "sessions",
        finalSession.id,
      );
      await updateDoc(sessionRef, {
        endTime: endTime,
        status: "completed",
        lastUpdated: serverTimestamp(),
      });
      console.log("☁️ Session ended in Cloud");
    } catch (e) {
      console.error("🔥 Failed to end cloud session:", e);
    }
  }
}

export function getStudyLogs(): StudySessionLog[] {
  return logs;
}
