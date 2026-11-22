// src/services/legacyWrittenGraded.ts
//
// RESULT-LIST-BACKFILL-1 - READ-TIME "was the written sheet graded?" for Chapter Test / Full Mock records
// written BEFORE #1802 (RESULT-LIST-HONEST-1) added `SessionRecord.writtenGraded`. NOTHING IS WRITTEN:
// the derived flag lives only on the in-memory copy a list renders; the stored record, its device mirror
// and the cloud doc are never changed (no migration, no backfill script).
//
// THE EVIDENCE (stored, never guessed) is the record's own per-question payload (`perQuestionRef`,
// `sessionRecords/{uid}/perQuestion/{ref}` + the device mirror): a GRADED row the GRADER produced.
//   - On these two surfaces Section A is scored on submit, client-side (chapterTestGradeService
//     `objectiveGradeRows`, which Full Mock reuses through `buildChapterTestResponse`); those rows are
//     always written with `annotatedSteps: []` and `teacherNote: ""`, and Section A is never sent to the
//     grader (only `subjectiveQuestions` = section !== "A" are).
//   - So a graded row carrying annotated steps or a teacher note can only be a WRITTEN answer the grader
//     marked - exactly what #1802's `responseHasGradedWritten` means by "the written sheet was graded".
// Rows without that evidence count for nothing: a record with none keeps reading as before ("Awaiting
// sheet"). The derivation can only turn an old record from "awaiting" to "graded" when the payload
// proves it, never the other way, and never sets `writtenGraded: false`.
//
// The `section` stamp (#1579) is deliberately NOT used: it is the bank row's own section (`bankSection`),
// which on a Chapter Test can differ from the slot section that decides objective vs written.
//
// KILL SWITCH: VITE_RESULT_LIST_BACKFILL_DISABLED=1 -> records are returned untouched (exactly #1802).
//
// READ COST: no read at all unless a list holds a legacy candidate (CT/FM, `partial`, no
// `writtenGraded`). Then the device mirror first; only a candidate it does not hold costs ONE doc read
// (by id, never the collection), at most MAX_CLOUD_READS per call, and each ref is read at most once per
// tab (memoised, found or not).

import { isGradedQuestion } from "../lib/mistakeDisplay";
import type { WorksheetGradeResponse } from "../ai/aiClient";
import {
  getSessionPerQuestionDocFromCloud,
  readLocalSessionPerQuestion,
  type SessionPerQuestionPayload,
  type SessionRecord,
} from "./sessionRecords";

const LEGACY_SURFACES: ReadonlySet<string> = new Set(["chapter-test", "full-mock"]);
export const MAX_CLOUD_READS = 20;

/** VITE_RESULT_LIST_BACKFILL_DISABLED=1|true|on|yes turns the read-time derivation off. */
export function isLegacyWrittenGradedEnabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_RESULT_LIST_BACKFILL_DISABLED;
    return !/^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return true;
  }
}

/** A record the derivation may look at: CT/FM, `partial`, written before #1802 (no `writtenGraded`). Pure. */
export function isLegacyWrittenGradedCandidate(r: SessionRecord | null | undefined): boolean {
  return (
    !!r &&
    LEGACY_SURFACES.has(r.surface) &&
    r.status === "partial" &&
    r.writtenGraded === undefined &&
    typeof r.perQuestionRef === "string" &&
    r.perQuestionRef.length > 0
  );
}

/** True when the results hold >=1 GRADED row the grader produced (annotated steps or a teacher note) - i.e.
 *  a written answer was marked. The on-submit objective rows never carry either. Pure. */
export function resultsShowGradedWritten(results: WorksheetGradeResponse["results"] | null | undefined): boolean {
  if (!Array.isArray(results)) return false;
  return results.some((r) => {
    if (!r || !isGradedQuestion(r)) return false;
    const steps = Array.isArray(r.annotatedSteps) ? r.annotatedSteps.length : 0;
    const note = typeof r.teacherNote === "string" ? r.teacherNote.trim() : "";
    return steps > 0 || note.length > 0;
  });
}

/** The payload is this record's own (same ref, same paper, same surface) and proves a graded written sheet. Pure. */
export function payloadProvesWrittenGraded(record: SessionRecord, payload: SessionPerQuestionPayload | null | undefined): boolean {
  if (!payload || !payload.response) return false;
  if (payload.ref !== record.perQuestionRef) return false;
  if (payload.worksheetId !== record.worksheetId) return false;
  if (payload.surface && payload.surface !== record.surface) return false;
  return resultsShowGradedWritten(payload.response.results);
}

/**
 * Return the records with `writtenGraded: true` on the IN-MEMORY copy of each legacy candidate whose payload
 * (from `payloadFor`) proves it. Every other record is returned as the same object. Never sets false. Pure.
 */
export function withDerivedWrittenGraded(
  records: readonly SessionRecord[],
  payloadFor: (record: SessionRecord) => SessionPerQuestionPayload | null | undefined,
): SessionRecord[] {
  if (!isLegacyWrittenGradedEnabled()) return records.slice();
  return records.map((r) =>
    isLegacyWrittenGradedCandidate(r) && payloadProvesWrittenGraded(r, payloadFor(r)) ? { ...r, writtenGraded: true } : r,
  );
}

/** Synchronous: the device mirror only (no network). For Home's first paint. */
export function withDerivedWrittenGradedLocal(uid: string | null | undefined, records: readonly SessionRecord[]): SessionRecord[] {
  if (!uid || !records.some(isLegacyWrittenGradedCandidate)) return records.slice();
  return withDerivedWrittenGraded(records, (r) => readLocalSessionPerQuestion(uid, r.perQuestionRef));
}

// Per-tab memo of what a cloud read found for a ref (the payload, or null = not there / unreadable).
const cloudMemo = new Map<string, Promise<SessionPerQuestionPayload | null>>();

/** Test seam. */
export function __resetLegacyWrittenGradedForTests(): void {
  cloudMemo.clear();
}

/**
 * Device mirror first, then ONE doc read per remaining candidate (capped, memoised per tab). Never throws;
 * a failed read leaves that record exactly as stored.
 */
export async function deriveWrittenGraded(
  uid: string | null | undefined,
  records: readonly SessionRecord[],
): Promise<SessionRecord[]> {
  if (!uid || !isLegacyWrittenGradedEnabled()) return records.slice();
  const candidates = records.filter(isLegacyWrittenGradedCandidate);
  if (candidates.length === 0) return records.slice();
  const found = new Map<string, SessionPerQuestionPayload | null>();
  const waits: Promise<void>[] = [];
  let reads = 0;
  for (const r of candidates) {
    const ref = r.perQuestionRef;
    const local = readLocalSessionPerQuestion(uid, ref);
    if (payloadProvesWrittenGraded(r, local)) {
      found.set(ref, local);
      continue;
    }
    const key = `${uid}::${ref}`;
    let pending = cloudMemo.get(key);
    if (!pending) {
      if (reads >= MAX_CLOUD_READS) continue;
      reads += 1;
      pending = getSessionPerQuestionDocFromCloud(uid, ref).catch(() => null);
      cloudMemo.set(key, pending);
    }
    waits.push(pending.then((p) => void found.set(ref, p)));
  }
  await Promise.all(waits);
  return withDerivedWrittenGraded(records, (r) => found.get(r.perQuestionRef) ?? null);
}
