// src/services/sessionRecords.ts
//
// Progress-Journey PR-1 — the per-completed-SESSION record store: the connectivity
// spine the scorecard → histories → Me → Home arc reads. ONE durable record per
// COMPLETED graded session (worksheet / chapter-test / full-mock). Quick Practice
// writes NO session record — it is exploratory, its attempts already persist via
// recordAttempt (LOCKED contract §1a). Build exactly to the LOCKED
// `LazyTopper_Progress_Journey_Design_Package_LOCKED_2026-07-03` §1 data contract.
//
// Persistence mirrors the PR-B pattern (mockScoreHistory / practiceInsights):
//   • a localStorage blob per uid  →  fast, offline, synchronous reads;
//   • a durable Firestore subcollection `sessionRecords/{uid}/records/{id}`  →
//     queryable + cross-device. The doc id IS the surface CODE, so a re-open /
//     re-grade OVERWRITES the same doc (idempotent — never double-counts). Writes
//     go through the SHARED firestoreDb (D32: initialised with
//     ignoreUndefinedProperties). Fire-and-forget with a LOGGED catch.
//
// HONEST-FAILURE (product doctrine): NEVER persists for a signed-out, local/browse,
// or anonymous session — no fabricated history. A pending (couldNotRead) question is
// never scored 0; the whole-session `status` stays honest (graded/partial/pending).
//
// This module is the STORE + durable #NN + per-question payload only. Reading it at
// altitudes (recent strip, per-surface history, rolled-up progress) is progressStore.

import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";
import { getActiveProgressUser } from "./studentProgressStore";
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";
import type { AuthUser } from "../context/AuthContext";
import type { WorksheetGradeResponse } from "../ai/aiClient";
import {
  worksheetNomenclature,
  topicAbbr,
  type StoredWorksheetLite,
  type WorksheetNomenclature,
} from "../components/worksheet/worksheetModel";
import {
  updateStoredWorksheetCode,
  getWorksheetSession,
  type PersistedWorksheet,
} from "./worksheetSessionStore";

// ── The LOCKED §1 data contract ──────────────────────────────────────────────

export type SessionSurface = "worksheet" | "chapter-test" | "full-mock";
/** graded (all read) · pending-upload (nothing graded yet) · partial (some pending). Never a fake 0. */
export type SessionStatus = "graded" | "pending-upload" | "partial";
export type SessionSubject = "maths" | "science";

/** The four-type breakdown, from per-question mistakeSummary (server-reconciled). */
export interface SessionFourType {
  conceptual: number;
  calculation: number;
  silly: number;
  presentation: number;
}

/** Full-mock-only examiner lens: per-section {awarded, total}. null for other surfaces. */
export type SessionSectionBreakdown = Record<string, { a: number; t: number }>;

/** One durable record per completed graded session. Fields per the §1 contract, plus
 *  ONE additive internal anchor (`worksheetId`) documented below. */
export interface SessionRecord {
  /** The surface CODE = the record id (idempotent; a re-open overwrites, never dups). */
  id: string;
  /** The physical worksheet id (`ws-...`) this record came from. NOT in the LOCKED §1
   *  field list — an additive internal anchor so re-grading the SAME worksheet is
   *  recognised (and its code reused) even if the localStorage code-freeze was lost
   *  (ring-buffer eviction / a failed write). Never surfaced to the student. */
  worksheetId: string;
  surface: SessionSurface;
  title: string;
  subject: SessionSubject;
  /** One or many; matches topics.ts slugs. Union across records = the seen-set (follow-on). */
  topicKeys: string[];
  /** The questions in this session — powers the uniqueness seen-set (§1c). */
  questionIds: string[];
  /** Graded portion (excludes pending) — honest, never inflated by unreadable pages. */
  marksAwarded: number;
  marksTotal: number;
  status: SessionStatus;
  /** From per-question mistakeSummary. */
  fourType: SessionFourType;
  /** Full Mock only; null for worksheet / chapter-test. */
  sectionBreakdown: SessionSectionBreakdown | null;
  /** ms epoch. */
  gradedAt: number;
  /** Key to "review my answers": points at the stored per-question grade payload (§1b). */
  perQuestionRef: string;
  /** Idempotent write key (mirrors recordAttempt dedup). */
  dedupKey: string;
}

/** The per-question grade payload the `perQuestionRef` points at (§1b — a DATA
 *  REQUIREMENT, not optional: without it a history entry is a dead list). */
export interface SessionPerQuestionPayload {
  ref: string;
  code: string;
  worksheetId: string;
  surface: SessionSurface;
  gradedAt: number;
  /** The full grade response — the per-question results, not just the total. */
  response: WorksheetGradeResponse;
}

export type WriteSessionOutcome =
  | "recorded"
  | "skipped-no-user"
  | "skipped-local"
  | "skipped-invalid";

// ── uid + honest-failure gate ────────────────────────────────────────────────

/** Resolve the durable uid for a WRITE. null → do not persist (honest-failure):
 *  signed-out, local/browse session, or anonymous never write fabricated history. */
function writableUid(user: AuthUser | null | undefined): string | null {
  if (!user || !user.uid) return null;
  if (user.isLocalSession) return null;
  return user.uid;
}

/** Resolve the uid for a READ (durable count / aggregation) when no AuthUser is at
 *  hand. Falls back to the active-progress uid; treats "anonymous" as no uid. */
function readableUid(uid?: string | null): string | null {
  const resolved = uid ?? getActiveProgressUser();
  return resolved && resolved !== "anonymous" ? resolved : null;
}

// ── localStorage mirror ──────────────────────────────────────────────────────

const STORAGE_PREFIX = "lazytopper.user";
const MAX_LOCAL_RECORDS = 200;
const MAX_LOCAL_PAYLOADS = 25;

function recordsKey(uid: string): string {
  return `${STORAGE_PREFIX}.${uid}.sessionRecords.v1`;
}
function payloadsKey(uid: string): string {
  return `${STORAGE_PREFIX}.${uid}.sessionPerQuestion.v1`;
}

const VALID_SURFACES: SessionSurface[] = ["worksheet", "chapter-test", "full-mock"];

function isSessionRecord(v: unknown): v is SessionRecord {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.surface === "string" &&
    VALID_SURFACES.includes(r.surface as SessionSurface) &&
    Array.isArray(r.topicKeys) &&
    Array.isArray(r.questionIds) &&
    typeof r.gradedAt === "number"
  );
}

/** Strip `undefined` so nothing rejects a Firestore write even if the D32 flag
 *  regresses; also drops functions/symbols. Cheap and total for our plain data. */
function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Firestore-illegal doc-id chars → `_` (mirrors practiceInsights attemptId). */
function sanitizeDocId(id: string): string {
  return id.replace(/[/.#$[\]\s]/g, "_");
}

export function loadLocalSessionRecords(uid?: string | null): SessionRecord[] {
  const id = readableUid(uid);
  if (typeof window === "undefined" || !id) return [];
  try {
    const raw = window.localStorage.getItem(recordsKey(id));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSessionRecord) : [];
  } catch {
    return [];
  }
}

function writeLocalSessionRecords(uid: string, list: SessionRecord[]): void {
  if (typeof window === "undefined" || !uid) return;
  try {
    const trimmed = list
      .slice()
      .sort((a, b) => b.gradedAt - a.gradedAt)
      .slice(0, MAX_LOCAL_RECORDS);
    window.localStorage.setItem(recordsKey(uid), JSON.stringify(trimmed));
  } catch {
    /* quota / SSR — best-effort mirror; Firestore is the durable source */
  }
}

/** Union two record lists by id (later list wins), used to merge cloud over local. */
function mergeById(primary: SessionRecord[], secondary: SessionRecord[]): SessionRecord[] {
  const byId = new Map<string, SessionRecord>();
  for (const r of secondary) byId.set(r.id, r);
  for (const r of primary) byId.set(r.id, r);
  return Array.from(byId.values());
}

// ── Firestore reads ──────────────────────────────────────────────────────────

/**
 * Read all session records for a uid, cross-device. Local-first (returns the
 * localStorage mirror on any miss), then merges the durable subcollection over it
 * and refreshes the mirror. Never throws — honest-degrade to local on cloud error.
 */
export async function getSessionRecordsFromCloud(uid?: string | null): Promise<SessionRecord[]> {
  const id = readableUid(uid);
  if (!id) return [];
  const local = loadLocalSessionRecords(id);
  if (!firestoreDb) return local;
  try {
    const snap = await getDocs(collection(firestoreDb, "sessionRecords", id, "records"));
    const rows = snap.docs.map((d) => d.data()).filter(isSessionRecord) as SessionRecord[];
    if (!rows.length) return local;
    const merged = mergeById(rows, local);
    writeLocalSessionRecords(id, merged);
    return merged;
  } catch (error) {
    console.warn("[sessionRecords] cloud read failed", { uid: id, error });
    return local;
  }
}

// ── Writes ───────────────────────────────────────────────────────────────────

/**
 * Persist ONE session record. Idempotent by `id` (= the surface code) — a re-grade
 * / re-open overwrites the same doc, never duplicates. Honest-failure: skips
 * signed-out / local / anonymous sessions (returns a typed outcome, never throws).
 * Fire-and-forget cloud write with a LOGGED catch (D32 lesson: never silently swallow).
 */
export function writeSessionRecord(
  user: AuthUser | null | undefined,
  record: SessionRecord,
): WriteSessionOutcome {
  if (!user || !user.uid) return "skipped-no-user";
  if (user.isLocalSession) return "skipped-local";
  if (!record.id) return "skipped-invalid";
  const uid = user.uid;

  // localStorage mirror — idempotent by id (replace, newest-first).
  try {
    const list = loadLocalSessionRecords(uid).filter((r) => r.id !== record.id);
    writeLocalSessionRecords(uid, [record, ...list]);
  } catch {
    /* best-effort */
  }

  if (firestoreDb && uid !== "anonymous") {
    void setDoc(
      doc(firestoreDb, "sessionRecords", uid, "records", sanitizeDocId(record.id)),
      stripUndefined({ ...record, updatedAt: new Date().toISOString() }),
      { merge: true },
    ).catch((error) => console.warn("[sessionRecords] record write failed", { id: record.id, error }));
  }
  return "recorded";
}

// ── Per-question payload (perQuestionRef target) ─────────────────────────────

function readLocalPayloads(uid: string): Record<string, SessionPerQuestionPayload> {
  if (typeof window === "undefined" || !uid) return {};
  try {
    const raw = window.localStorage.getItem(payloadsKey(uid));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Persist the per-question grade payload the record's `perQuestionRef` points at,
 * so "review my answers" can re-open the graded sheet from a history entry (§1b) —
 * cross-device. Best-effort mirror + fire-and-forget cloud write; honest-failure gated.
 */
export function writeSessionPerQuestion(
  user: AuthUser | null | undefined,
  payload: SessionPerQuestionPayload,
): void {
  if (!user || !user.uid || user.isLocalSession || !payload.ref) return;
  const uid = user.uid;

  try {
    const map = readLocalPayloads(uid);
    map[payload.ref] = payload;
    // Cap: keep the most-recent payloads only.
    const entries = Object.values(map).sort((a, b) => b.gradedAt - a.gradedAt).slice(0, MAX_LOCAL_PAYLOADS);
    const trimmed: Record<string, SessionPerQuestionPayload> = {};
    for (const e of entries) trimmed[e.ref] = e;
    if (typeof window !== "undefined") window.localStorage.setItem(payloadsKey(uid), JSON.stringify(trimmed));
  } catch {
    /* best-effort */
  }

  if (firestoreDb && uid !== "anonymous") {
    void setDoc(
      doc(firestoreDb, "sessionRecords", uid, "perQuestion", sanitizeDocId(payload.ref)),
      stripUndefined({ ...payload, updatedAt: new Date().toISOString() }),
      { merge: true },
    ).catch((error) => console.warn("[sessionRecords] perQuestion write failed", { ref: payload.ref, error }));
  }
}

/** Read a stored per-question payload by ref — local-first, then cloud (§1b reader). */
export async function getSessionPerQuestion(
  uid: string | null | undefined,
  ref: string,
): Promise<SessionPerQuestionPayload | null> {
  const id = readableUid(uid);
  if (!id || !ref) return null;
  const local = readLocalPayloads(id)[ref];
  if (local) return local;
  if (!firestoreDb) return null;
  try {
    const snap = await getDocs(collection(firestoreDb, "sessionRecords", id, "perQuestion"));
    const match = snap.docs.map((d) => d.data() as SessionPerQuestionPayload).find((p) => p?.ref === ref);
    return match ?? null;
  } catch (error) {
    console.warn("[sessionRecords] perQuestion read failed", { uid: id, ref, error });
    return null;
  }
}

// ── Durable #NN (§1c — DURABLE + cross-device, replaces the device-local count) ──

function subjectToNameableLabel(subject: SessionSubject): string {
  return subject === "science" ? "Science" : "Maths";
}

/**
 * Map worksheet session records into the `StoredWorksheetLite[]` shape the PURE
 * `worksheetNomenclature` builder counts within — so #NN becomes the count of a
 * student's existing sessionRecords for (subject, topic) + 1, DURABLE + cross-device,
 * replacing the old device-local `listStoredWorksheetsLite()` count. Preserves title +
 * subject fidelity so the builder's own grouping (single→topic / multi→MIX / full→FULL)
 * reproduces. The builder is left byte-identical; only the DATA SOURCE changes. Pure.
 */
export function worksheetLiteFromRecords(records: SessionRecord[]): StoredWorksheetLite[] {
  return records
    .filter((r) => r.surface === "worksheet")
    .map((r) => ({
      // The REAL physical worksheet id so worksheetNomenclature's findIndex matches on
      // re-grade (idempotent #NN); fall back to the code for pre-anchor records.
      worksheetId: r.worksheetId || r.perQuestionRef || r.id,
      subject: subjectToNameableLabel(r.subject),
      createdAt: new Date(r.gradedAt).toISOString(),
      title: r.title,
      topicKeys: r.topicKeys,
    }));
}

async function durableWorksheetLite(user?: AuthUser | null): Promise<StoredWorksheetLite[]> {
  const uid = writableUid(user) ?? readableUid();
  if (!uid) return [];
  return worksheetLiteFromRecords(await getSessionRecordsFromCloud(uid));
}

/**
 * The DURABLE nomenclature for a worksheet — minted once from the cross-device
 * sessionRecords count and FROZEN onto the stored worksheet, so the downloadable
 * questions sheet, the graded sheet, and the session-record id all agree on the same
 * `WS-{S}-{TOPIC}-{NN}` code. Idempotent: a worksheet that already carries a frozen
 * `code` short-circuits (no re-count, no shift). On a cloud miss / signed-out session
 * it falls back to whatever `fallback` list the caller supplies (the device-local
 * list) so a code is always produced.
 */
export async function ensureWorksheetSessionCode(
  worksheet: PersistedWorksheet,
  user?: AuthUser | null,
  fallback: StoredWorksheetLite[] = [],
): Promise<WorksheetNomenclature> {
  // Frozen already → reuse (mint-once). The in-memory `worksheet` may be stale (a
  // code minted at download-time is frozen onto localStorage, not the object the
  // grade panel holds), so fall back to the STORED copy's frozen code — this keeps
  // the downloadable sheet, the graded sheet, and the record id in agreement.
  const frozen = worksheet.code ? worksheet : getWorksheetSession(worksheet.worksheetId) ?? worksheet;
  if (frozen.code) {
    const base = worksheetNomenclature(frozen, fallback);
    return {
      code: frozen.code,
      name: frozen.name ?? base.name,
      kind: base.kind,
      sequence: typeof frozen.sequence === "number" ? frozen.sequence : base.sequence,
    };
  }

  let durable: StoredWorksheetLite[] = [];
  try {
    durable = await durableWorksheetLite(user);
  } catch (error) {
    console.warn("[sessionRecords] durable count read failed; using fallback", error);
  }
  // Durable count is the contract source; union the device-local fallback only when
  // the durable read yielded nothing (signed-out / offline) so we never lose a code.
  const source = durable.length ? durable : fallback;
  const nomen = worksheetNomenclature(worksheet, source);

  // Freeze onto the stored worksheet (best-effort, mint-once) so it can't shift.
  updateStoredWorksheetCode(worksheet.worksheetId, nomen.code, nomen.name, nomen.sequence);
  return nomen;
}

// ── Build a worksheet session record from a grade response ───────────────────

/**
 * Pure builder: assemble the §1 record from a worksheet + its grade response. The
 * response OMITS per-question topic/subject/section, so those are JOINED from
 * `worksheet.questions`. fourType is the server-reconciled mistakeSummary over
 * LEGIBLE questions only (couldNotRead never fabricated into a mistake or a 0).
 */
export function buildWorksheetSessionRecord(
  worksheet: PersistedWorksheet,
  response: WorksheetGradeResponse,
  nomen: Pick<WorksheetNomenclature, "code">,
  uid: string,
): SessionRecord {
  const fourType = response.results.reduce<SessionFourType>(
    (acc, r) => {
      if (r.couldNotRead || !r.mistakeSummary) return acc;
      acc.conceptual += Number(r.mistakeSummary.conceptual) || 0;
      acc.calculation += Number(r.mistakeSummary.calculation) || 0;
      acc.silly += Number(r.mistakeSummary.silly) || 0;
      acc.presentation += Number(r.mistakeSummary.presentation) || 0;
      return acc;
    },
    { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  );

  const status: SessionStatus =
    response.gradedCount <= 0
      ? "pending-upload"
      : response.pendingCount > 0
        ? "partial"
        : "graded";

  const code = nomen.code;
  return {
    id: code,
    worksheetId: worksheet.worksheetId,
    surface: "worksheet",
    title: worksheet.title,
    subject: /sci/i.test(String(worksheet.subject || "")) ? "science" : "maths",
    topicKeys: Array.from(new Set(worksheet.questions.map((q) => resolveCanonicalSlug(q.topicKey)).filter(Boolean))),
    questionIds: worksheet.questions.map((q) => q.id).filter(Boolean),
    marksAwarded: Number(response.gradedMarksAwarded) || 0,
    marksTotal: Number(response.gradedMarksTotal) || 0,
    status,
    fourType,
    sectionBreakdown: null,
    gradedAt: Date.now(),
    perQuestionRef: `ws:${code}`,
    dedupKey: `${uid}::${code}`,
  };
}

// ── Chapter Test (surface "chapter-test") — durable CT-{S}-{TOPIC}-{NN} / #NN ─────
//
// The chapter-test analogue of the worksheet nomenclature + record builder above.
// A chapter test is NOT a PersistedWorksheet in the worksheet store (decision D2 —
// its in-memory paper is never saved there), so its durable #NN cannot come from
// `listStoredWorksheetsLite`; it is the count of this student's EXISTING
// (subject, topic) chapter-test SessionRecords + 1, read cross-device from the same
// `sessionRecords/{uid}` store. The token reuses `topicAbbr` so a student sees a
// consistent scheme across surfaces (`WS-M-RN-03` ↔ `CT-M-RN-03`). Additive: the
// worksheet path above is left byte-unchanged.

export interface ChapterTestNomenclature {
  /** `CT-{S}-{TOPIC}-{NN}` — e.g. `CT-M-RN-02`. */
  code: string;
  /** Friendly name — e.g. `Real Numbers · Test #2` (spec §3). */
  name: string;
  sequence: number;
}

/** Durable #NN base: 1 + the count of this student's existing (subject, topic)
 *  chapter-test records. Pure — the caller supplies the fetched records. */
export function chapterTestSequence(
  records: SessionRecord[],
  subject: SessionSubject,
  topicKey: string,
): number {
  const slug = resolveCanonicalSlug(topicKey);
  const count = records.filter(
    (r) =>
      r.surface === "chapter-test" &&
      r.subject === subject &&
      r.topicKeys.some((k) => resolveCanonicalSlug(k) === slug),
  ).length;
  return count + 1;
}

/** Build the CT code + name from a resolved sequence (pure). */
export function chapterTestNomenclature(
  subject: SessionSubject,
  topicKey: string,
  topicLabel: string,
  sequence: number,
): ChapterTestNomenclature {
  const sl = subject === "science" ? "S" : "M";
  const token = topicAbbr(topicKey);
  const code = `CT-${sl}-${token}-${String(sequence).padStart(2, "0")}`;
  const name = `${topicLabel || "Chapter"} · Test #${sequence}`;
  return { code, name, sequence };
}

/**
 * Mint the DURABLE chapter-test nomenclature ONCE, from the cross-device record
 * count. MUST be called exactly once per test, BEFORE the first (partial) record is
 * written — otherwise the just-written record would inflate its own #NN. The caller
 * freezes the returned code in page state and reuses it for BOTH the partial and the
 * full record (record id = code → idempotent overwrite, never a double-count).
 * Honest-degrade: on a signed-out / offline read it falls back to sequence 1.
 */
export async function ensureChapterTestSessionCode(
  subject: SessionSubject,
  topicKey: string,
  topicLabel: string,
  user?: AuthUser | null,
): Promise<ChapterTestNomenclature> {
  let records: SessionRecord[] = [];
  try {
    const uid = writableUid(user) ?? readableUid();
    if (uid) records = await getSessionRecordsFromCloud(uid);
  } catch (error) {
    console.warn("[sessionRecords] CT durable count read failed; using fallback", error);
  }
  const sequence = chapterTestSequence(records, subject, topicKey);
  return chapterTestNomenclature(subject, topicKey, topicLabel, sequence);
}

/**
 * Assemble the §1 record for a chapter test from its UNIFIED response — objective
 * (Section A, graded on submit) + subjective (B–D) results in ONE
 * WorksheetGradeResponse (built by chapterTestGradeService). This mirrors
 * buildWorksheetSessionRecord: honest graded subtotal (pending excluded, never a
 * fabricated 0), fourType from per-question mistakeSummary (objective carries none —
 * MCQs are never an MI signal), status from graded/pending counts. Two phases fall
 * out of the same shape: at submit the subjective questions are `couldNotRead`
 * (pending) → status "partial"; after upload they carry real grades → "graded".
 * `sectionBreakdown` is ALWAYS null for chapter-test (decision D3 — the A–D lens is
 * DERIVED at render from the stored per-question marks, never denormalised here).
 */
export function buildChapterTestSessionRecord(args: {
  paper: PersistedWorksheet;
  code: string;
  subject: SessionSubject;
  topicKey: string;
  response: WorksheetGradeResponse;
  uid: string;
}): SessionRecord {
  const { paper, code, subject, topicKey, response, uid } = args;

  const fourType: SessionFourType = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  for (const r of response.results) {
    if (r.couldNotRead || !r.mistakeSummary) continue;
    fourType.conceptual += Number(r.mistakeSummary.conceptual) || 0;
    fourType.calculation += Number(r.mistakeSummary.calculation) || 0;
    fourType.silly += Number(r.mistakeSummary.silly) || 0;
    fourType.presentation += Number(r.mistakeSummary.presentation) || 0;
  }

  const status: SessionStatus =
    response.gradedCount <= 0
      ? "pending-upload"
      : response.pendingCount > 0
        ? "partial"
        : "graded";

  return {
    id: code,
    worksheetId: paper.worksheetId,
    surface: "chapter-test",
    title: paper.name ?? paper.title,
    subject,
    topicKeys: Array.from(
      new Set(
        [
          resolveCanonicalSlug(topicKey),
          ...paper.questions.map((q) => resolveCanonicalSlug(q.topicKey)),
        ].filter(Boolean),
      ),
    ),
    questionIds: paper.questions.map((q) => q.id).filter(Boolean),
    marksAwarded: Number(response.gradedMarksAwarded) || 0,
    marksTotal: Number(response.gradedMarksTotal) || 0,
    status,
    fourType,
    sectionBreakdown: null,
    gradedAt: Date.now(),
    perQuestionRef: `ct:${code}`,
    dedupKey: `${uid}::${code}`,
  };
}
