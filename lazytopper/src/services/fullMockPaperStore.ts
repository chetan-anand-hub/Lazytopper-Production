// src/services/fullMockPaperStore.ts
//
// Full Mock CROSS-DEVICE PAPER SNAPSHOT — closes [FU-FM-CROSS-DEVICE-UPLOAD]:
// the drawn paper used to live ONLY in the sitting device's localStorage
// (fullMockSession §8a), so "Upload now →" on another signed-in device could
// not re-grade the REAL paper. This store persists the drawn paper server-side,
// keyed by uid + FM code, so ANY signed-in device retrieves the SAME paper —
// never a fabricated one (owner-ratified anti-fabrication rule).
//
//   • TEXT ONLY: the drawn paper (questions + scheme), the frozen objective
//     score and the §8b focus aggregates. NEVER the uploaded answer-sheet image
//     (minors' data), and not even the typed objective answers — not needed:
//     the objective score is frozen at submit, subjective marks come from the
//     upload, graded fresh per student.
//   • Path: `sessionRecords/{uid}/fullMockPapers/{code}` — a SIBLING
//     subcollection of the record store, covered by the EXISTING recursive
//     owner-only rule in firestore.rules (`match /sessionRecords/{uid} …
//     /{document=**}`); no rules change. Doc id = the FM code (`FM-{S}-{NN}`,
//     nomenclature-generated, Firestore-safe).
//   • Lifecycle: written at submit (fire-and-forget, best-effort — a miss never
//     blocks the scorecard; the same-device localStorage path still works),
//     read by the pending-upload re-open when the local session is gone (other
//     device OR ring-buffer eviction), deleted best-effort after a successful
//     full grade (the record + perQuestion payload are the durable record).
//   • HONEST-FAILURE (product doctrine): never written for signed-out / local
//     sessions; a missing or unreadable snapshot returns null and the caller
//     keeps the honest "sat on another device" message — no fabricated paper.

import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";
import type { AuthUser } from "../context/AuthContext";
import type { PersistedWorksheet } from "./worksheetSessionStore";
import type { ObjectiveScore } from "./chapterTestGradeService";
import type { SessionFocusAggregates } from "./sessionRecords";

export interface FullMockPaperSnapshot {
  /** The durable FM-{S}-{NN} code — the doc id and the session-record id. */
  code: string;
  name: string;
  subject: "Maths" | "Science";
  grade: string;
  /** The drawn paper, whole — the SAME questions the student sat. */
  paper: PersistedWorksheet;
  /** Wall-clock anchors of the sitting (the mock is already submitted). */
  startedAt: number;
  durationMs: number;
  /** Frozen at submit (deterministic 0-or-full) — the pick data is gone. */
  objective: ObjectiveScore;
  /** §8b aggregates measured during the sitting. */
  focus?: SessionFocusAggregates;
  /** The draw's real mix — display only. */
  pyqCount?: number;
  freshCount?: number;
  savedAt: number;
}

/** Mirrors sessionRecords' honest-failure gate: a real signed-in uid AND a
 *  configured Firestore, or no cloud I/O at all. */
function cloudUid(user: AuthUser | null | undefined): string | null {
  const uid = user?.uid;
  if (!uid || user?.isLocalSession || uid === "anonymous") return null;
  return firestoreDb ? uid : null;
}

/** Drop undefined optionals before the write (the sessionRecords pattern). */
function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isSnapshot(v: unknown): v is FullMockPaperSnapshot {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.code === "string" &&
    typeof s.startedAt === "number" &&
    typeof s.durationMs === "number" &&
    !!s.paper &&
    typeof s.paper === "object" &&
    Array.isArray((s.paper as PersistedWorksheet).questions) &&
    !!s.objective &&
    typeof s.objective === "object"
  );
}

/** Persist at submit — fire-and-forget; signed-in real uid only (honest-failure). */
export function saveFullMockPaperSnapshot(
  user: AuthUser | null | undefined,
  snapshot: Omit<FullMockPaperSnapshot, "savedAt">,
): void {
  const uid = cloudUid(user);
  if (!uid || !firestoreDb) return;
  try {
    void setDoc(
      doc(firestoreDb, "sessionRecords", uid, "fullMockPapers", snapshot.code),
      stripUndefined({ ...snapshot, savedAt: Date.now() }),
    ).catch((error) => {
      console.warn("[fullMockPaperStore] snapshot write failed", error);
    });
  } catch (error) {
    console.warn("[fullMockPaperStore] snapshot write failed", error);
  }
}

/** The snapshot for a pending mock, or null — missing/unreadable means the
 *  caller keeps the honest fallback; a paper is never fabricated. */
export async function fetchFullMockPaperSnapshot(
  user: AuthUser | null | undefined,
  code: string,
): Promise<FullMockPaperSnapshot | null> {
  const uid = cloudUid(user);
  if (!uid || !firestoreDb) return null;
  try {
    const snap = await getDoc(doc(firestoreDb, "sessionRecords", uid, "fullMockPapers", code));
    const data = snap.exists() ? snap.data() : null;
    return isSnapshot(data) ? data : null;
  } catch (error) {
    console.warn("[fullMockPaperStore] snapshot read failed", error);
    return null;
  }
}

/** Best-effort cleanup once the mock is fully graded. */
export function deleteFullMockPaperSnapshot(
  user: AuthUser | null | undefined,
  code: string,
): void {
  const uid = cloudUid(user);
  if (!uid || !firestoreDb) return;
  try {
    void deleteDoc(doc(firestoreDb, "sessionRecords", uid, "fullMockPapers", code)).catch(() => {
      /* best-effort */
    });
  } catch {
    /* best-effort */
  }
}
