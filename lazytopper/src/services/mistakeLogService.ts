import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
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
  stepDetails: Array<{
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
    localStorage.setItem(
      localKey(uid),
      JSON.stringify(entries.slice(0, MAX_LOCAL_ENTRIES))
    );
  } catch {
    // quota exceeded or SSR — ignore
  }
}

/** Merge two entry arrays by ID, primary wins, sorted newest-first. */
function mergeByID(
  primary: MistakeLogEntry[],
  secondary: MistakeLogEntry[]
): MistakeLogEntry[] {
  const seen = new Set(primary.map((e) => e.id));
  const merged = [...primary, ...secondary.filter((e) => !seen.has(e.id))];
  return merged.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Write a mistake log entry for a completed answer check.
 * Always writes to localStorage first. Attempts Firestore write fire-and-forget.
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
      // Firestore write failed — localStorage copy remains the source of truth
    }
  }
}

/**
 * Return mistake log entries for the given user within the last `days` days,
 * sorted newest-first.
 *
 * Primary source: Firestore subcollection `learnerProfiles/{uid}/mistakeLogs`
 * (when Firebase is configured and reachable).
 * Fallback: localStorage cache — always works offline or when Firestore is
 * unavailable / not yet configured.
 *
 * Firestore results are merged into localStorage so subsequent reads are fast
 * even when offline, and locally-written entries that pre-date cloud config
 * are preserved.
 */
export async function getMistakeLogs(
  uid: string,
  days: number
): Promise<MistakeLogEntry[]> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoff).toISOString();

  if (firestoreDb) {
    try {
      const q = query(
        collection(firestoreDb, "learnerProfiles", uid, "mistakeLogs"),
        where("timestamp", ">=", cutoffIso),
        orderBy("timestamp", "desc"),
        limit(MAX_LOCAL_ENTRIES)
      );
      const snap = await getDocs(q);
      const remote = snap.docs.map((d) => {
        const data = d.data() as MistakeLogEntry;
        return { ...data, id: data.id || d.id };
      });

      // Merge with local cache so locally-written entries (written while offline
      // or before Firestore was ready) are not silently dropped.
      const merged = mergeByID(remote, readLocal(uid));
      writeLocal(uid, merged);

      // Return the merged set filtered to the requested date window
      return merged.filter((e) => {
        try {
          return new Date(e.timestamp).getTime() >= cutoff;
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.warn(
        "[mistakeLogService] Firestore read failed — using local cache",
        { uid, error }
      );
      // Fall through to localStorage
    }
  }

  // No Firestore or read failed: filter local cache by date window
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
