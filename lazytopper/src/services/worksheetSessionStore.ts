// src/services/worksheetSessionStore.ts
//
// PR-E2a — persist a generated worksheet's question set + marking schemes by
// `worksheetId` so grading can happen LATER, not just in the same session
// (locked spec §7). This is the data contract PR-E2b's one-PDF structured grade
// loop reads: the grader processes the uploaded PDF as a STRUCTURED SET keyed to
// the known question numbers (Q1…QN), looking each one up here.
//
// Device-local (localStorage) only — no auth required, no fabricated data, no
// premium/trial state. A small ring buffer keeps the most recent worksheets.
// (Profile/cloud sync, if wanted, is a later additive concern; same-device
// persistence already satisfies "grading works later".)

const STORE_KEY = "lazytopper.worksheets.v1";
const MAX_STORED = 25;

/** A single persisted question + its marking scheme, keyed by its worksheet
 *  number (Q1…QN) — the matching key the structured grader uses. */
export interface PersistedWorksheetQuestion {
  qNumber: number;
  id: string;
  subject: string;
  topicKey: string;
  topicLabel: string;
  section: string;
  marks: number;
  questionText: string;
  options?: string[];
  /** Marking scheme — the same fields the per-question grader references. */
  solutionSteps?: string[];
  finalAnswer?: string;
  answer?: string;
}

export interface PersistedWorksheet {
  worksheetId: string;
  createdAt: string;
  title: string;
  subject: string;
  grade: string;
  /** "All" or specific section letters, for display. */
  sectionFilter: string;
  totalMarks: number;
  questions: PersistedWorksheetQuestion[];
}

/** Lightweight list-row (no question bodies) for a "your worksheets" view. */
export interface PersistedWorksheetMeta {
  worksheetId: string;
  createdAt: string;
  title: string;
  subject: string;
  questionCount: number;
  totalMarks: number;
}

function readAll(): PersistedWorksheet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (w): w is PersistedWorksheet =>
        !!w &&
        typeof w === "object" &&
        typeof w.worksheetId === "string" &&
        Array.isArray(w.questions),
    );
  } catch {
    return [];
  }
}

function writeAll(list: PersistedWorksheet[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, MAX_STORED)));
  } catch {
    /* quota / SSR — persistence is best-effort and never blocks the download */
  }
}

/** Mint a worksheetId. Time + random suffix; identifier only, not user data. */
export function mintWorksheetId(): string {
  return `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Persist a worksheet (newest first; dedupes by worksheetId). */
export function saveWorksheetSession(ws: PersistedWorksheet): void {
  const list = readAll().filter((w) => w.worksheetId !== ws.worksheetId);
  writeAll([ws, ...list]);
}

/** Look up a persisted worksheet by id (PR-E2b grade loop entry point). */
export function getWorksheetSession(worksheetId: string): PersistedWorksheet | null {
  return readAll().find((w) => w.worksheetId === worksheetId) ?? null;
}

/** List stored worksheets (newest first) as lightweight metadata rows. */
export function listWorksheetSessions(): PersistedWorksheetMeta[] {
  return readAll().map((w) => ({
    worksheetId: w.worksheetId,
    createdAt: w.createdAt,
    title: w.title,
    subject: w.subject,
    questionCount: w.questions.length,
    totalMarks: w.totalMarks,
  }));
}

/** PR-A nomenclature input: every stored worksheet reduced to what
 *  `worksheetNomenclature` needs to compute the device-local sequence number. */
export function listStoredWorksheetsLite(): Array<{
  worksheetId: string;
  subject: string;
  createdAt: string;
  title: string;
  topicKeys: string[];
}> {
  return readAll().map((w) => ({
    worksheetId: w.worksheetId,
    subject: w.subject,
    createdAt: w.createdAt,
    title: w.title,
    topicKeys: Array.from(new Set(w.questions.map((q) => q.topicKey).filter(Boolean))),
  }));
}

// ── PR-E2b: persist a worksheet's GRADE result so the student can revisit it ──
// Keyed by worksheetId (device-local, same as the question set). The stored shape
// is whatever the grade service produced — kept loosely typed here so the store
// stays free of the AI-client types (the service owns the contract); the service
// re-validates on read.

const GRADE_STORE_KEY = "lazytopper.worksheetGrades.v1";
const MAX_GRADES = 25;

interface StoredGradeRow {
  worksheetId: string;
  gradedAt: string;
  grade: unknown;
}

function readAllGrades(): StoredGradeRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GRADE_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is StoredGradeRow =>
        !!r && typeof r === "object" && typeof r.worksheetId === "string",
    );
  } catch {
    return [];
  }
}

/** Persist (or replace) the grade result for a worksheet. Best-effort. */
export function saveWorksheetGrade(worksheetId: string, grade: unknown): void {
  if (typeof window === "undefined" || !worksheetId) return;
  try {
    const list = readAllGrades().filter((r) => r.worksheetId !== worksheetId);
    const next: StoredGradeRow[] = [
      { worksheetId, gradedAt: new Date().toISOString(), grade },
      ...list,
    ].slice(0, MAX_GRADES);
    window.localStorage.setItem(GRADE_STORE_KEY, JSON.stringify(next));
  } catch {
    /* quota / SSR — persistence is best-effort and never blocks the grade UI */
  }
}

/** Look up a previously-saved grade for a worksheet (null if none). */
export function getWorksheetGrade<T = unknown>(worksheetId: string): T | null {
  if (!worksheetId) return null;
  const row = readAllGrades().find((r) => r.worksheetId === worksheetId);
  return row ? (row.grade as T) : null;
}
