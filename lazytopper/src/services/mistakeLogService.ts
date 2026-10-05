import {
  collection,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
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
  /**
   * MI-CONCEPT-1 — the bank row's `subtopic`, VERBATIM, resolved from the question
   * id at write time (see services/mistakeConcept.ts).
   *
   * ★ OPTIONAL AND IT MUST STAY OPTIONAL. Every entry written before MI-CONCEPT-1
   * shipped has neither this nor `questionId`, and those entries must keep parsing.
   * ★ ABSENT MEANS UNKNOWABLE, NOT ZERO. A free-typed Check & Improve answer is not
   * a bank question, and a withheld/deleted id no longer resolves — both correctly
   * carry no concept. Never substitute the topic for a missing concept.
   */
  concept?: string;
  /**
   * MI-CONCEPT-1 — the id the grading surface identified this answer by, written
   * through from `RecordMistakeContext.questionId`.
   *
   * ⚠ NOT ALWAYS A BANK ID. Quick Practice and the per-question SolutionChecker
   * write the bare bank id; worksheet / full-mock / chapter-test / multi-question
   * Check & Improve write a surface-scoped SYNTHETIC attempt id
   * (`ws:`/`fm:`/`ct:`/`ci:`). Anything re-serving a question from this field must
   * handle that (see [FU-RETRY-SYNTHETIC-QUESTION-ID]).
   */
  questionId?: string;
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

/** SCORECARD-MI-1 (D5) — how an entry is written. With `id` (the stable grade identity from
 *  `gradeIdentityDocId`) the write REPLACES any earlier entry for the same submission, on the
 *  device and in Firestore (`setDoc` on that id — firestore.rules:41-43 allow the owner to
 *  create and update `mistakeLogs/{logId}`). Without it, the legacy append path. */
export interface LogMistakesOptions {
  id?: string;
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
  entry: Omit<MistakeLogEntry, "id">,
  options?: LogMistakesOptions
): Promise<void> {
  const stableId = options?.id?.trim() || "";
  const id = stableId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const full: MistakeLogEntry = { id, ...entry };

  // A stable id REPLACES the earlier local copy of the same submission (never two).
  const existing = readLocal(uid).filter((e) => e.id !== id);
  writeLocal(uid, [full, ...existing]);

  if (firestoreDb) {
    try {
      if (stableId) {
        await setDoc(doc(firestoreDb, "learnerProfiles", uid, "mistakeLogs", stableId), full);
      } else {
        await addDoc(
          collection(firestoreDb, "learnerProfiles", uid, "mistakeLogs"),
          full
        );
      }
    } catch {
      // Firestore write failed — localStorage copy remains the source of truth
    }
  }
}

/**
 * SCORECARD-MI-1 (W1) — a stable grade-identity id always holds "::"
 * (surface::submission::question — `gradeIdentityDocId`); a legacy random id
 * (`${Date.now()}-xxxxxx`) never does. Only a stable id may ever be removed.
 */
export function isStableMistakeLogId(id: string): boolean {
  return typeof id === "string" && id.includes("::");
}

/**
 * SCORECARD-MI-1 (W1) — a re-grade of the SAME submission came back with no mistake
 * (full marks, or not attempted). Remove that submission's stable-identity entry, on the
 * device and in Firestore, so Mistake Intelligence never keeps a mistake the scorecard no
 * longer shows. `firestore.rules:41-43` (`allow read, write: if isOwner(uid)`) covers delete.
 *
 * - Acts on a STABLE id only; a legacy random-id entry is never touched.
 * - `known` is the caller's evidence that an entry was written (the MI dedup ring). Without
 *   it, only a copy on this device triggers the cloud delete, so a first-time clean grade
 *   costs no write.
 * - Best effort, like the write: a failed cloud delete leaves the local removal in place.
 *
 * Returns whether it acted.
 */
export async function removeStableMistakeLog(
  uid: string,
  id: string,
  options?: { known?: boolean }
): Promise<boolean> {
  const stableId = (id || "").trim();
  if (!uid || !isStableMistakeLogId(stableId)) return false;
  const local = readLocal(uid);
  const kept = local.filter((e) => e.id !== stableId);
  const hadLocal = kept.length !== local.length;
  if (!hadLocal && !options?.known) return false;
  if (hadLocal) writeLocal(uid, kept);
  if (firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, "learnerProfiles", uid, "mistakeLogs", stableId));
    } catch {
      // Firestore delete failed — the device copy is already gone; same best effort as the write
    }
  }
  return true;
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
