// src/services/quickPracticePaperStore.ts
//
// QP-UPLOAD-LATER — the Quick Practice set, kept so "Upload later" works. Mirrors
// chapterTestPaperStore.ts (server snapshot + a small device-local copy):
//
//   • TEXT ONLY: the set's identity, the outcomes already scored, and the written questions
//     still waiting for an answer. NEVER an answer photo (a typed draft may ride along).
//   • Server path: `sessionRecords/{uid}/quickPracticePapers/{code}` — a sibling
//     subcollection under the EXISTING recursive owner-only rule
//     (firestore.rules `match /sessionRecords/{uid} { match /{document=**} ... isOwner(uid) }`);
//     no rules change.
//   • Local copy: a small ring in localStorage keyed by uid, so the same device never
//     needs the network.
//   • Lifecycle: written on "Upload later" (signed-in real uid only), replaced after a later
//     grade that leaves questions still waiting, deleted once nothing is waiting.
//   • HONEST-FAILURE: a missing or unreadable copy returns null / is left out; the caller
//     says so — a set is never rebuilt or guessed.

import { isFirestoreEnabled, withFirestore } from "./firestoreSdk";
import type { AuthUser } from "../context/AuthContext";
import type { QuickPracticeEntry, QuickPracticeSavedAnswer } from "./quickPracticeSessionService";
import type { SessionSubject } from "./sessionRecords";

export interface QuickPracticePaperSnapshot {
  /** The set's session-record id (quickPracticeCode of `persist`'s identity): the doc id. */
  code: string;
  /** The batch id the first grade used — the MI submission id, so a later grade REPLACES. */
  worksheetId: string;
  /** The grader's subject key (the page's `subjectKey`). */
  subject?: string;
  /** The record identity, exactly as `persistQuickPracticeSession` takes it. */
  persist: {
    title: string;
    subject: SessionSubject;
    topicSlug: string;
    topicKeys?: string[];
    filterSignature: string;
    startedAt: number;
  };
  /** One outcome per DISPLAYED question, in displayed order (what the record holds now). */
  entries: QuickPracticeEntry[];
  /** The written questions still waiting, with their DISPLAYED qNumber. No photo, ever. */
  pending: QuickPracticeSavedAnswer[];
  savedAt: number;
}

const LOCAL_KEY_PREFIX = "lazytopper.qp.papers.v1.";
const LOCAL_MAX = 10;
const COLLECTION = "quickPracticePapers";

function cloudUid(user: AuthUser | null | undefined): string | null {
  const uid = user?.uid;
  if (!uid || user?.isLocalSession || uid === "anonymous") return null;
  return uid;
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** A photo is never stored: drop it, keep any typed draft. */
function textOnly(a: QuickPracticeSavedAnswer): QuickPracticeSavedAnswer {
  return { ...a, imageBase64: null, imageMimeType: null };
}

export function isQuickPracticePaperSnapshot(v: unknown): v is QuickPracticePaperSnapshot {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  const p = s.persist as Record<string, unknown> | undefined;
  return (
    typeof s.code === "string" &&
    s.code.length > 0 &&
    typeof s.worksheetId === "string" &&
    !!p &&
    typeof p === "object" &&
    typeof p.filterSignature === "string" &&
    typeof p.startedAt === "number" &&
    typeof p.topicSlug === "string" &&
    Array.isArray(s.entries) &&
    Array.isArray(s.pending)
  );
}

function readLocal(uid: string): QuickPracticePaperSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY_PREFIX + uid);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isQuickPracticePaperSnapshot) : [];
  } catch {
    return [];
  }
}

function writeLocal(uid: string, list: QuickPracticePaperSnapshot[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY_PREFIX + uid, JSON.stringify(list.slice(0, LOCAL_MAX)));
  } catch {
    /* quota: best-effort, the server copy still exists */
  }
}

/** Persist on "Upload later": device copy now, server snapshot fire-and-forget. Signed-in real
 *  uid only — returns false (nothing kept) for a signed-out or local session. */
export function saveQuickPracticePaper(
  user: AuthUser | null | undefined,
  snapshot: Omit<QuickPracticePaperSnapshot, "savedAt">,
): boolean {
  const uid = cloudUid(user);
  if (!uid) return false;
  const full: QuickPracticePaperSnapshot = stripUndefined({
    ...snapshot,
    pending: snapshot.pending.map(textOnly),
    savedAt: Date.now(),
  });
  writeLocal(uid, [full, ...readLocal(uid).filter((s) => s.code !== full.code)]);
  if (!isFirestoreEnabled()) return true;
  try {
    void withFirestore(({ fs, db }) => fs.setDoc(fs.doc(db, "sessionRecords", uid, COLLECTION, full.code), full))
      .catch((error) => {
        console.warn("[quickPracticePaperStore] snapshot write failed", error);
      });
  } catch (error) {
    console.warn("[quickPracticePaperStore] snapshot write failed", error);
  }
  return true;
}

/** One stored set: this device first, else the server snapshot. Null when neither exists. */
export async function loadQuickPracticePaper(
  user: AuthUser | null | undefined,
  code: string,
): Promise<QuickPracticePaperSnapshot | null> {
  const uid = cloudUid(user);
  if (!uid) return null;
  const local = readLocal(uid).find((s) => s.code === code);
  if (local) return local;
  if (!isFirestoreEnabled()) return null;
  try {
    const snap = await withFirestore(({ fs, db }) => fs.getDoc(fs.doc(db, "sessionRecords", uid, COLLECTION, code)));
    const data = snap.exists() ? snap.data() : null;
    if (!isQuickPracticePaperSnapshot(data)) return null;
    writeLocal(uid, [data, ...readLocal(uid).filter((s) => s.code !== code)]);
    return data;
  } catch (error) {
    console.warn("[quickPracticePaperStore] snapshot read failed", error);
    return null;
  }
}

/** Every set still waiting for written answers, newest first: this device's copies merged with
 *  the server's (the server fills in sets saved on another device). Never throws. */
export async function listQuickPracticePapers(
  user: AuthUser | null | undefined,
): Promise<QuickPracticePaperSnapshot[]> {
  const uid = cloudUid(user);
  if (!uid) return [];
  const byCode = new Map<string, QuickPracticePaperSnapshot>();
  for (const s of readLocal(uid)) byCode.set(s.code, s);
  if (isFirestoreEnabled()) {
    try {
      const snap = await withFirestore(({ fs, db }) => fs.getDocs(fs.collection(db, "sessionRecords", uid, COLLECTION)));
      snap.forEach((d) => {
        const data = d.data();
        if (!isQuickPracticePaperSnapshot(data)) return;
        const mine = byCode.get(data.code);
        if (!mine || (Number(data.savedAt) || 0) > (Number(mine.savedAt) || 0)) byCode.set(data.code, data);
      });
    } catch (error) {
      console.warn("[quickPracticePaperStore] snapshot list failed", error);
    }
  }
  return Array.from(byCode.values())
    .filter((s) => s.pending.length > 0)
    .sort((a, b) => (Number(b.savedAt) || 0) - (Number(a.savedAt) || 0));
}

/** Best-effort cleanup once nothing is waiting. */
export function deleteQuickPracticePaper(user: AuthUser | null | undefined, code: string): void {
  const uid = cloudUid(user);
  if (!uid) return;
  writeLocal(uid, readLocal(uid).filter((s) => s.code !== code));
  if (!isFirestoreEnabled()) return;
  try {
    void withFirestore(({ fs, db }) => fs.deleteDoc(fs.doc(db, "sessionRecords", uid, COLLECTION, code)))
      .catch(() => {
        /* best-effort */
      });
  } catch {
    /* best-effort */
  }
}
