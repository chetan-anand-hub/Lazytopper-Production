// src/services/chapterTestPaperStore.ts
//
// PENDING-UPLOAD-1 PR-1 — the Chapter Test paper, kept so "Upload later" works.
// A submitted test used to live ONLY in the page's memory: leaving the page lost the
// paper, so the "⏳ Awaiting sheet" card could open nothing to upload against. This
// mirrors fullMockPaperStore.ts (server snapshot) plus a small device-local copy:
//
//   • TEXT ONLY: the drawn paper and the objective result frozen at submit. NEVER the
//     uploaded answer-sheet image, and not the typed answers (the score is frozen).
//   • Server path: `sessionRecords/{uid}/chapterTestPapers/{code}` — a sibling
//     subcollection under the EXISTING recursive owner-only rule; no rules change.
//   • Local copy: a small ring in localStorage keyed by uid, so the same device never
//     needs the network.
//   • Lifecycle: written at submit (fire-and-forget, signed-in real uid only), deleted
//     best-effort once the test is fully graded.
//   • HONEST-FAILURE: a missing or unreadable copy returns null; the caller says so —
//     a paper is never rebuilt or guessed.

import { isFirestoreEnabled, withFirestore } from "./firestoreSdk";
import type { AuthUser } from "../context/AuthContext";
import type { PersistedWorksheet } from "./worksheetSessionStore";
import type { ObjectiveScore } from "./chapterTestGradeService";

export interface ChapterTestPaperSnapshot {
  /** The durable CT-{S}-{TOPIC}-{NN} code: the doc id and the session-record id. */
  code: string;
  name: string;
  subject: "Maths" | "Science";
  topicKey: string;
  /** The drawn paper, whole: the SAME questions the student sat. */
  paper: PersistedWorksheet;
  /** Frozen at submit (deterministic 0-or-full). AWAIT-1: null on a DOWNLOADED paper until the
   *  student taps the Section A options they wrote (no in-app picks exist yet). */
  objective: ObjectiveScore | null;
  /** AWAIT-1-PAPERS — saved at download (sat on paper): Section A is entered at upload time. */
  downloaded?: boolean;
  savedAt: number;
}

/** AWAIT-1 — a downloaded paper whose Section A picks are not entered yet. */
export function needsSectionAPicks(s: Pick<ChapterTestPaperSnapshot, "objective" | "downloaded">): boolean {
  return s.downloaded === true && !s.objective;
}

const LOCAL_KEY_PREFIX = "lazytopper.ct.papers.v1.";
const LOCAL_MAX = 10;

function cloudUid(user: AuthUser | null | undefined): string | null {
  const uid = user?.uid;
  if (!uid || user?.isLocalSession || uid === "anonymous") return null;
  return uid;
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isSnapshot(v: unknown): v is ChapterTestPaperSnapshot {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.code === "string" &&
    !!s.paper &&
    typeof s.paper === "object" &&
    Array.isArray((s.paper as PersistedWorksheet).questions) &&
    typeof (s.paper as PersistedWorksheet).worksheetId === "string" &&
    ((!!s.objective && typeof s.objective === "object") || (s.downloaded === true && s.objective == null))
  );
}

function readLocal(uid: string): ChapterTestPaperSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY_PREFIX + uid);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isSnapshot) : [];
  } catch {
    return [];
  }
}

function writeLocal(uid: string, list: ChapterTestPaperSnapshot[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY_PREFIX + uid, JSON.stringify(list.slice(0, LOCAL_MAX)));
  } catch {
    /* quota: best-effort, the server copy still exists */
  }
}

/** Persist at submit: device copy now, server snapshot fire-and-forget. Signed-in real uid only. */
export function saveChapterTestPaper(
  user: AuthUser | null | undefined,
  snapshot: Omit<ChapterTestPaperSnapshot, "savedAt">,
): void {
  const uid = cloudUid(user);
  if (!uid) return;
  const full: ChapterTestPaperSnapshot = { ...snapshot, savedAt: Date.now() };
  // RECORD-SAFE-1: a saved paper is never replaced by a DIFFERENT paper under the same code.
  const prior = readLocal(uid).find((s) => s.code === full.code);
  if (prior && prior.paper.worksheetId !== full.paper.worksheetId) {
    console.warn("[chapterTestPaperStore] code already holds a different paper; not saved", full.code);
    return;
  }
  writeLocal(uid, [full, ...readLocal(uid).filter((s) => s.code !== full.code)]);
  if (!isFirestoreEnabled()) return;
  try {
    const data = stripUndefined(full);
    void withFirestore(async ({ fs, db }) => {
      const ref = fs.doc(db, "sessionRecords", uid, "chapterTestPapers", full.code);
      const snap = await fs.getDoc(ref);
      if (snap.metadata && snap.metadata.fromCache) throw new Error("cache-only snapshot read");
      if (snap.exists() && (snap.data() as { paper?: { worksheetId?: string } })?.paper?.worksheetId !== full.paper.worksheetId) {
        throw new Error("code already holds a different paper");
      }
      await fs.setDoc(ref, data);
    }).catch((error) => {
      console.warn("[chapterTestPaperStore] snapshot write failed", error);
    });
  } catch (error) {
    console.warn("[chapterTestPaperStore] snapshot write failed", error);
  }
}

/** The stored paper for a pending test: this device first, else the server snapshot. Null when neither exists. */
export async function loadChapterTestPaper(
  user: AuthUser | null | undefined,
  code: string,
  /** AWAIT-1: read the server copy first (this device's copy may be a stale downloaded one). */
  opts: { preferServer?: boolean } = {},
): Promise<ChapterTestPaperSnapshot | null> {
  const uid = cloudUid(user);
  if (!uid) return null;
  const local = readLocal(uid).find((s) => s.code === code);
  if (local && !(opts.preferServer && isFirestoreEnabled())) return local;
  if (!isFirestoreEnabled()) return null;
  try {
    const snap = await withFirestore(({ fs, db }) => fs.getDoc(fs.doc(db, "sessionRecords", uid, "chapterTestPapers", code)));
    const data = snap.exists() ? snap.data() : null;
    if (!isSnapshot(data)) return local ?? null;
    writeLocal(uid, [data, ...readLocal(uid).filter((s) => s.code !== code)]);
    return data;
  } catch (error) {
    console.warn("[chapterTestPaperStore] snapshot read failed", error);
    return local ?? null;
  }
}

/**
 * Best-effort cleanup once the test is fully graded. RECORD-SAFE-1: pass `worksheetId` (the paper that was
 * graded) and only THAT paper's copy is deleted - a different paper saved under the code is left alone.
 */
export function deleteChapterTestPaper(user: AuthUser | null | undefined, code: string, worksheetId?: string): void {
  const uid = cloudUid(user);
  if (!uid) return;
  writeLocal(uid, readLocal(uid).filter((s) => !(s.code === code && (!worksheetId || s.paper.worksheetId === worksheetId))));
  if (!isFirestoreEnabled()) return;
  try {
    void withFirestore(async ({ fs, db }) => {
      const ref = fs.doc(db, "sessionRecords", uid, "chapterTestPapers", code);
      if (worksheetId) {
        const snap = await fs.getDoc(ref);
        if (!snap.exists() || (snap.data() as { paper?: { worksheetId?: string } })?.paper?.worksheetId !== worksheetId) return;
      }
      await fs.deleteDoc(ref);
    }).catch(() => {
      /* best-effort */
    });
  } catch {
    /* best-effort */
  }
}
