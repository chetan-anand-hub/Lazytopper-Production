// src/services/worksheetPaperStore.ts
//
// PENDING-UPLOAD-1 PR-2 (option B, #973 DECISION 50a) — a downloaded Worksheet can be
// uploaded later, on this device or any other signed-in one.
//
// Before this, a Worksheet SessionRecord was written ONLY when a grade came back, and the
// paper lived only in a 25-slot device-local ring: a student who downloaded, left and came
// back had no card, no banner and no way to the paper. Now, at DOWNLOAD:
//   • a PENDING record is written (id = the worksheet's frozen code, so a re-download
//     overwrites and never duplicates — and never overwrites a record that already has a
//     grade), exactly as Chapter Test / Full Mock write theirs at submit;
//   • the paper is saved server-side: `sessionRecords/{uid}/worksheetPapers/{code}`, a
//     sibling subcollection under the EXISTING recursive owner-only rule (no rules change).
//
// TEXT ONLY (the questions + marking scheme; never an answer-sheet image). Signed-in real
// uid only, fire-and-forget. HONEST-FAILURE: a missing/unreadable copy returns null and the
// caller says so — a paper is never rebuilt or guessed.

import { isFirestoreEnabled, withFirestore } from "./firestoreSdk";
import type { AuthUser } from "../context/AuthContext";
import type { WorksheetGradeResponse } from "../ai/aiClient";
import { getWorksheetSession, saveWorksheetSession, type PersistedWorksheet } from "./worksheetSessionStore";
import type { WorksheetNomenclature } from "../components/worksheet/worksheetNaming";
import {
  ensureWorksheetSessionCode,
  buildWorksheetSessionRecord,
  loadLocalSessionRecords,
  writeSessionRecord,
  type SessionRecord,
} from "./sessionRecords";

export interface WorksheetPaperSnapshot {
  /** The durable WS-… code: the doc id and the session-record id. */
  code: string;
  name: string;
  /** The paper, whole, with its frozen code. */
  paper: PersistedWorksheet;
  savedAt: number;
}

/** Codes this device saved a snapshot for, so a graded one can be cleaned up later. */
const OPEN_CODES_PREFIX = "lazytopper.ws.paperCodes.v1.";

function cloudUid(user: AuthUser | null | undefined): string | null {
  const uid = user?.uid;
  if (!uid || user?.isLocalSession || uid === "anonymous") return null;
  return uid;
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isSnapshot(v: unknown): v is WorksheetPaperSnapshot {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  const p = s.paper as PersistedWorksheet | undefined;
  return (
    typeof s.code === "string" &&
    !!p &&
    typeof p === "object" &&
    typeof p.worksheetId === "string" &&
    Array.isArray(p.questions)
  );
}

function readCodes(uid: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(OPEN_CODES_PREFIX + uid) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

function writeCodes(uid: string, codes: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OPEN_CODES_PREFIX + uid, JSON.stringify(codes.slice(0, 50)));
  } catch {
    /* best-effort */
  }
}

/** A response with nothing graded: every question pending, no marks, no mistakes. */
function awaitingResponse(paper: PersistedWorksheet): WorksheetGradeResponse {
  return {
    ok: true,
    worksheetId: paper.worksheetId,
    results: paper.questions.map((q) => ({
      qNumber: q.qNumber,
      couldNotRead: true,
      totalMarks: Number(q.marks) || 0,
      note: "Answer sheet not uploaded yet.",
    })),
    totalQuestions: paper.questions.length,
    gradedCount: 0,
    pendingCount: paper.questions.length,
    gradedMarksAwarded: 0,
    gradedMarksTotal: 0,
    worksheetTotalMarks: Number(paper.totalMarks) || 0,
  };
}

/** Pause between the first attempt and its single retry (WS-AWAIT-1). */
export const SAVE_RETRY_DELAY_MS = 400;

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One awaited server write of the snapshot, with ONE retry. True when it landed. */
async function writeSnapshotDoc(
  uid: string,
  snapshot: Omit<WorksheetPaperSnapshot, "savedAt">,
  retryDelayMs: number,
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = stripUndefined({ ...snapshot, savedAt: Date.now() });
      await withFirestore(({ fs, db }) => fs.setDoc(fs.doc(db, "sessionRecords", uid, "worksheetPapers", snapshot.code), data));
      return true;
    } catch (error) {
      console.warn("[worksheetPaperStore] snapshot write failed", error);
      if (attempt === 0) await pause(retryDelayMs);
    }
  }
  return false;
}

/** Persist the paper server-side; fire-and-forget, signed-in only. */
export function saveWorksheetPaperSnapshot(
  user: AuthUser | null | undefined,
  snapshot: Omit<WorksheetPaperSnapshot, "savedAt">,
): void {
  const uid = cloudUid(user);
  if (!uid) return;
  const codes = readCodes(uid);
  if (!codes.includes(snapshot.code)) writeCodes(uid, [snapshot.code, ...codes]);
  if (!isFirestoreEnabled()) return;
  void writeSnapshotDoc(uid, snapshot, SAVE_RETRY_DELAY_MS);
}

/** The stored paper for a pending worksheet, or null. */
export async function fetchWorksheetPaperSnapshot(
  user: AuthUser | null | undefined,
  code: string,
): Promise<WorksheetPaperSnapshot | null> {
  const uid = cloudUid(user);
  if (!uid || !isFirestoreEnabled()) return null;
  try {
    const snap = await withFirestore(({ fs, db }) => fs.getDoc(fs.doc(db, "sessionRecords", uid, "worksheetPapers", code)));
    const data = snap.exists() ? snap.data() : null;
    return isSnapshot(data) ? data : null;
  } catch (error) {
    console.warn("[worksheetPaperStore] snapshot read failed", error);
    return null;
  }
}

/** Best-effort cleanup once the worksheet is fully graded. */
export function deleteWorksheetPaperSnapshot(user: AuthUser | null | undefined, code: string): void {
  const uid = cloudUid(user);
  if (!uid) return;
  writeCodes(uid, readCodes(uid).filter((c) => c !== code));
  if (!isFirestoreEnabled()) return;
  try {
    void withFirestore(({ fs, db }) => fs.deleteDoc(fs.doc(db, "sessionRecords", uid, "worksheetPapers", code)))
      .catch(() => {
        /* best-effort */
      });
  } catch {
    /* best-effort */
  }
}

/** Delete the snapshots of worksheets this device saved that now have a FULL grade. */
export function reapGradedWorksheetSnapshots(
  user: AuthUser | null | undefined,
  records: readonly SessionRecord[],
): void {
  const uid = cloudUid(user);
  if (!uid) return;
  const graded = new Set(records.filter((r) => r.surface === "worksheet" && r.status === "graded").map((r) => r.id));
  for (const code of readCodes(uid)) if (graded.has(code)) deleteWorksheetPaperSnapshot(user, code);
}

/** What a download-time save did: the pending card exists, was left alone, or could not be written. */
export type WorksheetDownloadSave = "saved" | "kept" | "failed" | "skipped" | "collision";

/**
 * At download: write the pending record + the server snapshot. Never replaces a record that
 * already carries a grade (a re-download of a graded worksheet changes nothing). A re-download of
 * a paper whose pending record is missing CREATES it. Best-effort: a miss never blocks the PDF,
 * but WS-AWAIT-1: it is no longer silent - the read and the snapshot write are each retried once,
 * and a save that still did not land returns "failed" so the ready screen can say so honestly.
 * "skipped" = no signed-in cloud user (nothing to save; the caller says to sign in).
 */
export async function recordWorksheetDownload(
  user: AuthUser | null | undefined,
  paper: PersistedWorksheet,
  nomen: { code: string; name: string },
  opts: { retryDelayMs?: number } = {},
): Promise<WorksheetDownloadSave> {
  const uid = cloudUid(user);
  if (!uid || !nomen.code) return "skipped";
  const retryDelayMs = opts.retryDelayMs ?? SAVE_RETRY_DELAY_MS;
  // Read THIS record's own document, never the local mirror: a stale mirror must not let a
  // pending write replace a grade made on another device. A read we cannot complete (failed, or a
  // cache-only answer that cannot prove another device has not graded it) is retried once; if it
  // still cannot, nothing is written and the caller is told.
  let existing: SessionRecord | undefined;
  if (isFirestoreEnabled()) {
    let read = false;
    for (let attempt = 0; attempt < 2 && !read; attempt++) {
      try {
        const snap = await withFirestore(({ fs, db }) => fs.getDoc(fs.doc(db, "sessionRecords", uid, "records", nomen.code.replace(/[/.#$[\]\s]/g, "_"))));
        if (snap.metadata && snap.metadata.fromCache) {
          if (attempt === 0) await pause(retryDelayMs);
          continue;
        }
        existing = snap.exists() ? (snap.data() as SessionRecord) : undefined;
        read = true;
      } catch (error) {
        console.warn("[worksheetPaperStore] record read failed", error);
        if (attempt === 0) await pause(retryDelayMs);
      }
    }
    if (!read) return "failed";
  } else {
    existing = loadLocalSessionRecords(uid).find((r) => r.id === nomen.code);
  }
  // WS-AWAIT-1: a record under this code that belongs to a DIFFERENT worksheet is a code COLLISION,
  // never "already graded, nothing to do" (that silent skip lost the owner's WS-M-MIX-02 paper). The
  // code is minted collision-free before the PDF (mintUniqueWorksheetCode); this is the backstop.
  if (existing && existing.worksheetId && existing.worksheetId !== paper.worksheetId) return "collision";
  if (existing && existing.status !== "pending-upload") return "kept";
  const withCode: PersistedWorksheet = { ...paper, code: nomen.code, name: nomen.name };
  writeSessionRecord(user, buildWorksheetSessionRecord(withCode, awaitingResponse(withCode), { code: nomen.code }, uid));
  const codes = readCodes(uid);
  if (!codes.includes(nomen.code)) writeCodes(uid, [nomen.code, ...codes]);
  if (!isFirestoreEnabled()) return "saved";
  const landed = await writeSnapshotDoc(uid, { code: nomen.code, name: nomen.name, paper: withCode }, retryDelayMs);
  return landed ? "saved" : "failed";
}

// ── WS-AWAIT-1: a worksheet code is unique against everything the student already owns ──────────
//
// ROOT CAUSE (proven on production data, 4 Nov): `worksheetNomenclature` (worksheetNaming.ts:138-145)
// numbers a worksheet as 1 + the COUNT of stored worksheets in its title/topic "group", and the
// durable list is rebuilt from each record's title + topicKeys (sessionRecords.ts:627-640). A record
// whose title/topicKeys group differently from its own code token ("Real Numbers - Custom filters"
// holding WS-M-MIX-02) is not counted, so a new Board-exam-mix worksheet was minted WS-M-MIX-02 too.
// The pending save then took the `existing && status !== "pending-upload"` branch and wrote nothing.
// So: after the count-based mint, bump the sequence until NO record / saved paper of ANOTHER
// worksheet holds the code, and freeze that code before it is printed on the PDF.

function codeBase(code: string): { prefix: string; n: number } | null {
  const m = /^(.*-)(\d+)$/.exec(code);
  return m ? { prefix: m[1], n: Number(m[2]) } : null;
}

/** Who already holds `code` for this student: another worksheet's id, or null when it is free. */
async function ownerOfCode(uid: string, code: string): Promise<string | null> {
  const id = code.replace(/[/.#$[\]\s]/g, "_");
  const local = loadLocalSessionRecords(uid).find((r) => r.id === code || r.id === id);
  if (local?.worksheetId) return local.worksheetId;
  if (!isFirestoreEnabled()) return null;
  for (const path of [["records", id], ["worksheetPapers", code]]) {
    try {
      const snap = await withFirestore(({ fs, db }) => fs.getDoc(fs.doc(db, "sessionRecords", uid, path[0], path[1])));
      if (!snap.exists()) continue;
      const d = snap.data() as { worksheetId?: string; paper?: { worksheetId?: string } };
      const owner = d?.worksheetId ?? d?.paper?.worksheetId;
      if (owner) return owner;
    } catch (error) {
      console.warn("[worksheetPaperStore] code check read failed", error);
    }
  }
  return null;
}

/**
 * The worksheet's durable code, guaranteed not to belong to any OTHER worksheet of this student
 * (their records or saved papers). Same worksheet re-asking gets the same code (idempotent). A
 * collision mints the next free sequence and freezes it onto the stored worksheet, so the code on
 * the PDF, the pending record and the later grade are all the same one.
 */
export async function mintUniqueWorksheetCode(
  ws: PersistedWorksheet,
  user: AuthUser | null | undefined,
  fallback: Parameters<typeof ensureWorksheetSessionCode>[2] = [],
): Promise<WorksheetNomenclature> {
  const nomen = await ensureWorksheetSessionCode(ws, user, fallback);
  const uid = cloudUid(user);
  const base = codeBase(nomen.code);
  if (!uid || !base) return nomen;
  let n = base.n;
  for (let i = 0; i < 200; i++) {
    const code = `${base.prefix}${String(n).padStart(2, "0")}`;
    const owner = await ownerOfCode(uid, code);
    if (!owner || owner === ws.worksheetId) {
      if (n === base.n) return nomen;
      const nameBase = /^(.*?)(\d+)$/.exec(nomen.name);
      const name = nameBase ? `${nameBase[1]}${n}` : nomen.name;
      const stored = getWorksheetSession(ws.worksheetId) ?? ws;
      saveWorksheetSession({ ...stored, code, name, sequence: n });
      return { ...nomen, code, name, sequence: n };
    }
    n += 1;
  }
  return nomen;
}
