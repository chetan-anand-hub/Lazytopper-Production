// src/components/papers/paperDownloadRecord.ts
//
// AWAIT-1-PAPERS — a downloaded Chapter Test / Full Mock paper becomes a PENDING record
// the moment it is downloaded (the worksheet's PENDING-UPLOAD-1 download path, mirrored:
// `worksheetPaperStore.recordWorksheetDownload`). What is written, exactly:
//
//   • `sessionRecords/{uid}/records/{code}` — built by the EXISTING builders
//     (`buildChapterTestSessionRecord` / `buildFullMockSessionRecord`, unchanged) from a
//     response in which EVERY question is pending (`couldNotRead`, no marks, no mistake):
//     status "pending-upload", marksAwarded 0, marksTotal 0, no four-type. Nothing is graded,
//     so Mistake Intelligence and progress counts are unaffected (progress counts graded
//     records only; MI is fed only by `recordMistake` at a real grade).
//   • the paper snapshot (the page's own store), marked `downloaded`, with NO Section A
//     result: a downloaded paper has no in-app picks yet.
//
// Guard (the worksheet rule): a record that already carries a grade or a submitted Section A
// (status "partial" / "graded") is never replaced by a pending one, and a read we cannot
// complete writes nothing. Best-effort throughout: a miss never blocks the PDF.

import { isFirestoreEnabled, withFirestore } from "../../services/firestoreSdk";
import type { AuthUser } from "../../context/AuthContext";
import type { WorksheetGradeResponse } from "../../ai/aiClient";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import {
  loadLocalSessionRecords,
  writeSessionRecord,
  type SessionRecord,
} from "../../services/sessionRecords";

/** A response with nothing graded: every question pending, no marks, no mistakes. */
export function awaitingPaperResponse(paper: PersistedWorksheet): WorksheetGradeResponse {
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

function cloudUid(user: AuthUser | null | undefined): string | null {
  const uid = user?.uid;
  if (!uid || user?.isLocalSession || uid === "anonymous") return null;
  return uid;
}

/** The same Firestore-safe doc id `writeSessionRecord` uses. */
function recordDocId(code: string): string {
  return code.replace(/[/.#$[\]\s]/g, "_");
}

/**
 * The record's CURRENT status, server first (this device's mirror only when there is no
 * Firestore). "missing" = no record; "unknown" = a read we cannot trust (failed, or a
 * cache-only answer that cannot prove another device has not moved it on).
 */
export async function readPaperRecordStatus(
  user: AuthUser | null | undefined,
  code: string,
): Promise<SessionRecord["status"] | "missing" | "unknown"> {
  const uid = cloudUid(user);
  if (!uid || !code) return "unknown";
  if (isFirestoreEnabled()) {
    try {
      const snap = await withFirestore(({ fs, db }) => fs.getDoc(fs.doc(db, "sessionRecords", uid, "records", recordDocId(code))));
      if (snap.metadata && snap.metadata.fromCache) return "unknown";
      if (!snap.exists()) return "missing";
      const status = (snap.data() as Partial<SessionRecord> | undefined)?.status;
      return status ?? "unknown";
    } catch (error) {
      console.warn("[paperDownloadRecord] record status read failed", error);
      return "unknown";
    }
  }
  return loadLocalSessionRecords(uid).find((r) => r.id === code)?.status ?? "missing";
}

/** AWAIT-1 — Section A picks may be written only while the paper is still untouched. */
export function picksMayContinue(status: Awaited<ReturnType<typeof readPaperRecordStatus>>): boolean {
  return status === "pending-upload" || status === "missing";
}

export const CONTINUED_ELSEWHERE_LINE = "This paper was already continued on another device.";
export const STATUS_UNKNOWN_LINE = "We couldn’t check this paper just now. Check your connection and try again.";

/**
 * Write the pending record for a downloaded paper, then (only then) call `saveSnapshot`.
 * Returns "written" or "skipped" (signed out, unreadable, or an existing non-pending record).
 */
export async function recordPaperDownload(args: {
  user: AuthUser | null | undefined;
  code: string;
  buildRecord: (response: WorksheetGradeResponse, uid: string) => SessionRecord;
  paper: PersistedWorksheet;
  saveSnapshot: () => void;
}): Promise<"written" | "skipped"> {
  const { user, code, buildRecord, paper, saveSnapshot } = args;
  const uid = cloudUid(user);
  if (!uid || !code) return "skipped";
  let existing: SessionRecord | undefined;
  if (isFirestoreEnabled()) {
    try {
      const snap = await withFirestore(({ fs, db }) => fs.getDoc(fs.doc(db, "sessionRecords", uid, "records", recordDocId(code))));
      // A cache-only answer (offline) cannot prove another device has not graded it: write nothing.
      if (snap.metadata && snap.metadata.fromCache) return "skipped";
      existing = snap.exists() ? (snap.data() as SessionRecord) : undefined;
    } catch (error) {
      console.warn("[paperDownloadRecord] record read failed; pending record not written", error);
      return "skipped";
    }
  } else {
    existing = loadLocalSessionRecords(uid).find((r) => r.id === code);
  }
  if (existing && existing.status !== "pending-upload") return "skipped";
  writeSessionRecord(user, buildRecord(awaitingPaperResponse(paper), uid));
  saveSnapshot();
  return "written";
}
