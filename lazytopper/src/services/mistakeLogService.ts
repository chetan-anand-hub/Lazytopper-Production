import { collection, addDoc } from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";

const LOCAL_KEY_PREFIX = "lazytopper.mistakeLogs.v1";
const MAX_LOCAL_ENTRIES = 200;

export interface MistakeLogEntry {
  id: string;
  timestamp: string;
  questionText: string;
  topic: string;
  subject: string;
  totalMarks: number;
  marksLost: number;
  mistakeCounts: {
    conceptual: number;
    calculation: number;
    silly: number;
    presentation: number;
  };
  stepDetails?: Array<{
    stepNumber: number;
    mistakeType: string;
    marksDeducted: number;
  }>;
}

function localKey(uid: string): string {
  return `${LOCAL_KEY_PREFIX}:${uid}`;
}

function readLocal(uid: string): MistakeLogEntry[] {
  try {
    const raw = localStorage.getItem(localKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MistakeLogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(uid: string, entries: MistakeLogEntry[]): void {
  try {
    localStorage.setItem(localKey(uid), JSON.stringify(entries.slice(0, MAX_LOCAL_ENTRIES)));
  } catch {
    // quota exceeded or SSR — ignore
  }
}

/**
 * Write a mistake log entry for a completed answer check.
 * Always writes to localStorage. Attempts Firestore write fire-and-forget.
 */
export async function logMistakes(
  uid: string,
  entry: Omit<MistakeLogEntry, "id">
): Promise<void> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const full: MistakeLogEntry = { id, ...entry };

  const existing = readLocal(uid);
  writeLocal(uid, [full, ...existing]);

  if (firestoreDb) {
    try {
      await addDoc(
        collection(firestoreDb, "learnerProfiles", uid, "mistakeLogs"),
        full
      );
    } catch {
      // Firestore write failed — localStorage copy is the source of truth
    }
  }
}

/**
 * Return mistake log entries for the given user within the last `days` days,
 * sorted newest-first. Reads from localStorage only (fast, offline-capable).
 */
export function getMistakeLogs(uid: string, days: number): MistakeLogEntry[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return readLocal(uid)
    .filter((e) => {
      try {
        return new Date(e.timestamp).getTime() >= cutoff;
      } catch {
        return false;
      }
    })
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}
