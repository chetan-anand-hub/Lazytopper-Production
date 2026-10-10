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

import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";
import type { AuthUser } from "../context/AuthContext";
import type { WorksheetGradeResponse } from "../ai/aiClient";
import type { PersistedWorksheet } from "./worksheetSessionStore";
import {
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

/** Persist the paper server-side; fire-and-forget, signed-in only. */
export function saveWorksheetPaperSnapshot(
  user: AuthUser | null | undefined,
  snapshot: Omit<WorksheetPaperSnapshot, "savedAt">,
): void {
  const uid = cloudUid(user);
  if (!uid) return;
  const codes = readCodes(uid);
  if (!codes.includes(snapshot.code)) writeCodes(uid, [snapshot.code, ...codes]);
  if (!firestoreDb) return;
  try {
    void setDoc(
      doc(firestoreDb, "sessionRecords", uid, "worksheetPapers", snapshot.code),
      stripUndefined({ ...snapshot, savedAt: Date.now() }),
    ).catch((error) => {
      console.warn("[worksheetPaperStore] snapshot write failed", error);
    });
  } catch (error) {
    console.warn("[worksheetPaperStore] snapshot write failed", error);
  }
}

/** The stored paper for a pending worksheet, or null. */
export async function fetchWorksheetPaperSnapshot(
  user: AuthUser | null | undefined,
  code: string,
): Promise<WorksheetPaperSnapshot | null> {
  const uid = cloudUid(user);
  if (!uid || !firestoreDb) return null;
  try {
    const snap = await getDoc(doc(firestoreDb, "sessionRecords", uid, "worksheetPapers", code));
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
  if (!firestoreDb) return;
  try {
    void deleteDoc(doc(firestoreDb, "sessionRecords", uid, "worksheetPapers", code)).catch(() => {
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

/**
 * At download: write the pending record + the server snapshot. Never replaces a record that
 * already carries a grade (a re-download of a graded worksheet changes nothing). Best-effort:
 * a miss never blocks the PDF.
 */
export async function recordWorksheetDownload(
  user: AuthUser | null | undefined,
  paper: PersistedWorksheet,
  nomen: { code: string; name: string },
): Promise<void> {
  const uid = cloudUid(user);
  if (!uid || !nomen.code) return;
  // Read THIS record's own document, never the local mirror: a stale mirror must not let a
  // pending write replace a grade made on another device. A read we cannot complete writes
  // nothing (the download still works; the pending card appears on the next successful one).
  let existing: SessionRecord | undefined;
  if (firestoreDb) {
    try {
      const snap = await getDoc(doc(firestoreDb, "sessionRecords", uid, "records", nomen.code.replace(/[/.#$[\]\s]/g, "_")));
      // A cache-only answer (offline) cannot prove another device has not graded it: write nothing.
      if (snap.metadata && snap.metadata.fromCache) return;
      existing = snap.exists() ? (snap.data() as SessionRecord) : undefined;
    } catch (error) {
      console.warn("[worksheetPaperStore] record read failed; pending record not written", error);
      return;
    }
  } else {
    existing = loadLocalSessionRecords(uid).find((r) => r.id === nomen.code);
  }
  if (existing && existing.status !== "pending-upload") return;
  const withCode: PersistedWorksheet = { ...paper, code: nomen.code, name: nomen.name };
  writeSessionRecord(user, buildWorksheetSessionRecord(withCode, awaitingResponse(withCode), { code: nomen.code }, uid));
  saveWorksheetPaperSnapshot(user, { code: nomen.code, name: nomen.name, paper: withCode });
}
