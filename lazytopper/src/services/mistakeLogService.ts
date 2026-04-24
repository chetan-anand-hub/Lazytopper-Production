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
import type { ErrorCategory } from "./errorCategories";
import { isErrorCategory } from "./errorCategories";

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
  /** High-level diagnosis from the error diagnosis engine — see errorCategories.ts. */
  errorCategory?: ErrorCategory | null;
  /** One-sentence reason produced by the AI examiner. */
  errorReason?: string | null;
}

/**
 * Read mistake log entries from local cache only (no Firestore round-trip),
 * filtered to entries with a timestamp at or after `sinceIso`.
 *
 * Used by the Practice session summary to derive a fast, sync breakdown of
 * the errors the student made during the current sitting.
 */
export function readLocalMistakeLogsSince(
  uid: string,
  sinceIso: string
): MistakeLogEntry[] {
  if (!uid) return [];
  const sinceMs = (() => {
    const t = new Date(sinceIso).getTime();
    return Number.isFinite(t) ? t : 0;
  })();
  return readLocal(uid).filter((entry) => {
    try {
      return new Date(entry.timestamp).getTime() >= sinceMs;
    } catch {
      return false;
    }
  });
}

/**
 * Aggregate errorCategory counts across a list of mistake log entries.
 * Returns the breakdown sorted by count desc, plus the #1 category (or null).
 */
export function aggregateErrorCategories(entries: MistakeLogEntry[]): {
  total: number;
  byCategory: Array<{ category: ErrorCategory; count: number }>;
  topCategory: ErrorCategory | null;
} {
  const counts = new Map<ErrorCategory, number>();
  for (const e of entries) {
    if (e.errorCategory && isErrorCategory(e.errorCategory)) {
      counts.set(e.errorCategory, (counts.get(e.errorCategory) || 0) + 1);
    }
  }
  const byCategory = Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
  const total = byCategory.reduce((sum, c) => sum + c.count, 0);
  return {
    total,
    byCategory,
    topCategory: byCategory.length > 0 ? byCategory[0].category : null,
  };
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
 * One-time hydration: if localStorage has no mistake log entries for the user,
 * fetch the most recent 200 entries from Firestore and populate localStorage.
 *
 * Called on profile load (sign-in) so history survives cleared browser data
 * or device switches. No-ops when Firestore is unavailable.
 */
export async function hydrateMistakeLogsFromCloud(uid: string): Promise<void> {
  const existing = readLocal(uid);
  if (existing.length > 0) return; // localStorage already has data — skip

  if (!firestoreDb) return;

  try {
    const q = query(
      collection(firestoreDb, "learnerProfiles", uid, "mistakeLogs"),
      orderBy("timestamp", "desc"),
      limit(MAX_LOCAL_ENTRIES)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const remote = snap.docs.map((d) => {
      const data = d.data() as MistakeLogEntry;
      return { ...data, id: data.id || d.id };
    });

    writeLocal(uid, remote);
  } catch {
    // Firestore unavailable — silently no-op; localStorage will be populated
    // organically on the next getMistakeLogs call.
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
