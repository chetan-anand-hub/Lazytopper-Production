// src/ai/gradingJobs.ts
//
// GRADING-JOBS-1 J2 — the background-grading CLIENT (contract: J2_CLIENT_CONTRACT v1.0,
// PR #966 "## J2 CLIENT CONTRACT v1.0"; the server is J1, switch GRADING_JOBS default OFF).
//
// ONE function, `gradeWorksheetJob`, used by `aiClient.gradeWorksheet` when — and only when —
// a caller passes `opts.job`. It does the three things contract §11 asks of the shared layer:
//   1. a 200 is today's v2 body, handled EXACTLY as today (the same parse, the same typed
//      throws) — that is what the kill switch looks like from here (§1, §8);
//   2. a 202 (including an `Idempotent-Replayed: true` 202) starts polling the status endpoint
//      (§3) and hands every landed row to `onProgress` — `final:true` rows are marks,
//      `final:false` rows are PROVISIONAL (§4); `done` returns `final`, the v2 body, which the
//      caller uses exactly as today's 200;
//   3. a 404 mid-poll means the job is gone: it falls back to today's synchronous path (owner
//      rule: "fall back to today's synchronous path if jobs are off or fail") with a NEW
//      Idempotency-Key (§3: "offer to grade again (new Idempotency-Key)") — when the caller
//      still holds the document. After a reload (no document) it says so honestly instead.
//
// RESUME (§11): `{jobId, idempotencyKey}` is written to the caller's store the moment the 202
// lands, so a reload polls the SAME job (`resumeOnly`) and never re-submits.
// INTERRUPTED (§6): the job's final rows are kept; the rest are offered back as "grade the
// remaining N" (`continueFrom`), re-submitted alone with a NEW key, then merged by index.
//
// ★ No new runtime export is added to aiClient (three suites mock it with partial factories);
//   aiClient imports THIS module lazily, the same way it imports gradingTransport.

import type {
  WorksheetGradeQuestionInput,
  WorksheetGradeResponse,
  WorksheetGradeUpload,
  WorksheetQuestionGrade,
} from "./aiClient";
import { GradingNetworkError, newIdempotencyKey } from "./gradingTransport";
import { isGradedQuestion } from "../lib/mistakeDisplay";

/* ── the wire (contract §2, §3) ──────────────────────────────────────────── */

/** §2 canonical opt-in (RFC 7240). Sent ONLY by a caller that passes `opts.job`. */
export const PREFER_HEADER = "Prefer";
export const PREFER_ASYNC_VALUE = "respond-async";
/** §3 default cadence. */
export const DEFAULT_POLL_AFTER_MS = 2_500;
/** §9: a job is readable for 24 h from submit; a stored one older than that is never polled. */
export const JOB_TTL_MS = 24 * 60 * 60 * 1000;
/** Consecutive poll failures (network / 503 / unexpected) before this call gives up. The job
 *  is KEPT in the store, so "try again" (or a reload) resumes the SAME job — never a second
 *  charge. */
export const MAX_CONSECUTIVE_POLL_FAILURES = 6;
/** The longest one call keeps polling. Far above every server cap (§10: 180 s wall from
 *  running, 120 s per model call) so the client never kills a job the server would finish;
 *  it only bounds a queue that never drains. The job stays stored either way. */
export const MAX_POLL_WINDOW_MS = 20 * 60 * 1000;

export type GradingJobState = "queued" | "running" | "done" | "interrupted";

/** One landed row: the v2 question entry plus its 0-based index and the §4 `final` flag. */
export type GradingJobRow = WorksheetQuestionGrade & { index: number; final: boolean };

export interface GradingJobProgress {
  state: GradingJobState;
  total: number;
  done: number;
  rows: GradingJobRow[];
}

/** What is kept so a reload resumes the same job (§11). `context` is the surface's own. */
export interface StoredGradingJob {
  v: 1;
  jobId: string;
  idempotencyKey: string;
  pollPath: string;
  total: number;
  submittedAt: number;
  /** The paper this job grades (worksheetId / code) — a store never resumes another paper. */
  paperKey: string;
  context?: unknown;
}

export interface GradingJobStore {
  read(): StoredGradingJob | null;
  write(rec: StoredGradingJob): void;
  clear(): void;
}

export interface GradingJobOptions {
  store: GradingJobStore;
  paperKey: string;
  /** The surface's resume context, persisted beside the job (text only — never an image). */
  context?: unknown;
  onProgress?: (progress: GradingJobProgress) => void;
  /** After a reload: poll the stored job; NEVER submit (the document is gone). */
  resumeOnly?: boolean;
  /** "Grade the remaining N" (§6): re-submit only the interrupted questions, NEW key. */
  continueFrom?: GradingJobInterruptedError;
}

/* ── errors a surface reads by NAME (suites mock aiClient whole) ───────────── */

/**
 * §6 — the server restarted mid-job. `rows` holds EVERY question (final rows as they were,
 * the rest `notGraded: "interrupted"`); `remaining` are the 0-based indices to grade again.
 * Nothing paper-level exists: no totals, no summary.
 */
export class GradingJobInterruptedError extends Error {
  readonly rows: GradingJobRow[];
  readonly remaining: number[];
  readonly paperKey: string;
  constructor(rows: GradingJobRow[], paperKey: string) {
    const remaining = rows.filter((r) => isInterruptedRow(r)).map((r) => r.index);
    super(gradeRemainingLabel(remaining.length));
    this.name = "GradingJobInterruptedError";
    this.rows = rows;
    this.remaining = remaining;
    this.paperKey = paperKey;
  }
}

/** §3 404 / §9 expiry after a reload, when the document is no longer on the device. */
export class GradingJobGoneError extends Error {
  constructor() {
    super("This check is no longer available — please upload your answers and grade again. You have not been charged twice.");
    this.name = "GradingJobGoneError";
  }
}

/** §5 "interrupted" — shipped literally to opted-in clients only, so it is outside the v2
 *  row type the synchronous path uses; read as a plain value. */
export function isInterruptedRow(r: { notGraded?: unknown }): boolean {
  return r.notGraded === "interrupted";
}

/** §6 — the offer, singular and plural. */
export function gradeRemainingLabel(n: number): string {
  return n === 1 ? "Grade the remaining 1 question" : `Grade the remaining ${n} questions`;
}

/* ── stores ───────────────────────────────────────────────────────────────── */

const SESSION_PREFIX = "lazytopper.gradingJob.v1.";

export function isStoredGradingJob(v: unknown): v is StoredGradingJob {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    r.v === 1 &&
    typeof r.jobId === "string" && r.jobId.length > 0 &&
    typeof r.idempotencyKey === "string" &&
    typeof r.pollPath === "string" && r.pollPath.startsWith(JOB_POLL_PATH_PREFIX) &&
    typeof r.submittedAt === "number" &&
    typeof r.paperKey === "string"
  );
}

/** A per-surface sessionStorage slot (survives a reload of this tab). Best-effort. */
export function sessionJobStore(slot: string): GradingJobStore {
  const key = SESSION_PREFIX + slot;
  return {
    read() {
      try {
        if (typeof window === "undefined") return null;
        const raw = window.sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isStoredGradingJob(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    write(rec) {
      try {
        if (typeof window !== "undefined") window.sessionStorage.setItem(key, JSON.stringify(rec));
      } catch {
        /* quota — best-effort: the poll still runs, only a reload cannot resume it */
      }
    },
    clear() {
      try {
        if (typeof window !== "undefined") window.sessionStorage.removeItem(key);
      } catch {
        /* best-effort */
      }
    },
  };
}

/** The stored job for this paper, or null (none, another paper, or past the §9 TTL). */
export function resumableJob(store: GradingJobStore, paperKey?: string, now?: number): StoredGradingJob | null {
  const rec = store.read();
  if (!rec) return null; // no clock read when nothing is stored (CLOCK_GUARD: callers mount on every page)
  if ((now ?? nowImpl()) - rec.submittedAt >= JOB_TTL_MS) {
    store.clear();
    return null;
  }
  if (paperKey !== undefined && rec.paperKey !== paperKey) return null;
  return rec;
}

/* ── the transport seam aiClient fills ────────────────────────────────────── */

export interface HttpLikeResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export interface GradingJobDeps {
  /** POST /api/grade-worksheet with today's headers + body and THIS key; `preferAsync` adds
   *  the §2 opt-in header. Retries / token refresh are aiClient's (unchanged). */
  submit(body: unknown, sendOpts: { idempotencyKey: string; preferAsync: boolean }): Promise<HttpLikeResponse>;
  /** GET the poll path with the Bearer token (a 401 is refreshed once inside). */
  poll(pollPath: string): Promise<HttpLikeResponse>;
  /** Today's response handling (handleJsonResponse): the body, or today's typed throw. */
  parse<T>(res: HttpLikeResponse): Promise<T>;
  /** R2 stage listener, if the caller passed one. */
  onStage?: (stage: { kind: "grading" }) => void;
}

let sleepImpl: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let nowImpl: () => number = () => Date.now();

/** Test seams: replace the poll sleep / clock (null restores the real ones). */
export function __setGradingJobTimersForTests(t: { sleep?: ((ms: number) => Promise<void>) | null; now?: (() => number) | null }): void {
  if (t.sleep !== undefined) sleepImpl = t.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  if (t.now !== undefined) nowImpl = t.now ?? (() => Date.now());
}

/* ── the request ──────────────────────────────────────────────────────────── */

export interface WorksheetGradeRequestBody {
  worksheetId: string;
  subject?: string;
  questions: WorksheetGradeQuestionInput[];
  imageBase64?: string;
  imageMimeType?: string;
  uploads?: WorksheetGradeUpload[];
}

/**
 * The questions the SERVER grades, in its order — `index` (§3) is a position in this list.
 * The server keeps a question only when `qNumber > 0` and `questionText` is non-empty
 * (checkSolution.cjs handleGradeWorksheet), so the client applies the same rule to map rows.
 */
export function gradedQuestionsOf(questions: WorksheetGradeQuestionInput[]): WorksheetGradeQuestionInput[] {
  return questions.filter((q) => (Number(q.qNumber) || 0) > 0 && String(q.questionText || "").trim().length > 0);
}

function stripRow(row: GradingJobRow): WorksheetQuestionGrade {
  const { index: _index, final: _final, ...rest } = row;
  void _index;
  void _final;
  return rest as WorksheetQuestionGrade;
}

type Settled =
  | { kind: "final"; body: WorksheetGradeResponse }
  | { kind: "interrupted"; rows: GradingJobRow[] };

class JobGone extends Error {
  constructor() {
    super("job_not_found");
    this.name = "JobGone";
  }
}

/** §2: the poll path is `/api/grade-worksheet/jobs/<jobId>`. The Bearer token only ever goes
 *  to that same-origin path — a value of any other shape is rebuilt from the jobId. */
export const JOB_POLL_PATH_PREFIX = "/api/grade-worksheet/jobs/";
export function safePollPath(raw: unknown, jobId: string): string {
  const canonical = JOB_POLL_PATH_PREFIX + encodeURIComponent(jobId);
  return typeof raw === "string" && raw === JOB_POLL_PATH_PREFIX + jobId && /^[A-Za-z0-9]+$/.test(jobId) ? raw : canonical;
}

function safeJson(text: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function rowsOf(body: Record<string, unknown>): GradingJobRow[] {
  const raw = Array.isArray(body.results) ? (body.results as unknown[]) : [];
  return raw
    .filter((r): r is GradingJobRow => !!r && typeof r === "object" && Number.isInteger((r as { index?: unknown }).index))
    .map((r) => ({ ...r, final: r.final === true }))
    .sort((a, b) => a.index - b.index);
}

/** §3 — poll ONE job until it ends. Throws JobGone on a 404; GradingNetworkError when the
 *  poll cannot get through (the job stays stored, so a retry resumes it). */
async function pollJob(
  rec: StoredGradingJob,
  deps: GradingJobDeps,
  onProgress: ((p: GradingJobProgress) => void) | undefined,
): Promise<Settled> {
  const started = nowImpl();
  let failures = 0;
  for (;;) {
    if (nowImpl() - started > MAX_POLL_WINDOW_MS) throw new GradingNetworkError("timeout");
    let res: HttpLikeResponse | null = null;
    try {
      res = await deps.poll(rec.pollPath);
    } catch (err) {
      // A SignInAgainError (token refused twice) is the student's answer, not a blip.
      if (err instanceof Error && err.name === "SignInAgainError") throw err;
      res = null;
    }
    if (res && res.status === 404) throw new JobGone();
    if (res && res.status === 200) {
      const body = safeJson(await res.text());
      if (body && body.ok === true) {
        failures = 0;
        const state = body.state as GradingJobState;
        const rows = rowsOf(body);
        const total = Number(body.total) || rec.total;
        onProgress?.({ state, total, done: Number(body.done) || rows.length, rows });
        if (state === "done") {
          const final = body.final;
          if (!final || typeof final !== "object") throw new JobGone();
          return { kind: "final", body: final as WorksheetGradeResponse };
        }
        if (state === "interrupted") return { kind: "interrupted", rows };
        const wait = Number(body.pollAfterMs);
        await sleepImpl(Number.isFinite(wait) && wait > 0 ? wait : DEFAULT_POLL_AFTER_MS);
        continue;
      }
    }
    if (res && res.status === 429) {
      const body = safeJson(await res.text());
      const wait = Number(body?.retryAfterMs);
      await sleepImpl(Number.isFinite(wait) && wait > 0 ? wait : DEFAULT_POLL_AFTER_MS * 2);
      continue;
    }
    // network error, 503 job_store_unavailable, or anything unexpected: back off, bounded.
    failures += 1;
    if (failures >= MAX_CONSECUTIVE_POLL_FAILURES) throw new GradingNetworkError("network");
    await sleepImpl(DEFAULT_POLL_AFTER_MS * 2 ** Math.min(failures - 1, 3));
  }
}

/** Submit (opt-in) or resume ONE grade; returns how it settled. */
async function runOnce(
  body: WorksheetGradeRequestBody,
  job: GradingJobOptions,
  deps: GradingJobDeps,
  onProgress: ((p: GradingJobProgress) => void) | undefined,
): Promise<Settled> {
  let rec = resumableJob(job.store, job.paperKey);
  if (!rec) {
    if (job.resumeOnly) {
      job.store.clear();
      throw new GradingJobGoneError();
    }
    const idempotencyKey = newIdempotencyKey();
    const res = await deps.submit(body, { idempotencyKey, preferAsync: true });
    // §1: a 200 (or any non-202) is TODAY'S answer — today's parse, today's throws.
    if (res.status !== 202) return { kind: "final", body: await deps.parse<WorksheetGradeResponse>(res) };
    const accepted = safeJson(await res.text());
    const jobId = accepted && typeof accepted.jobId === "string" ? accepted.jobId : "";
    const pollPath = jobId ? safePollPath(accepted?.pollPath, jobId) : "";
    if (!jobId) {
      // A 202 we cannot read: grade synchronously instead (owner rule), NEW key (§3).
      return syncFallback(body, deps);
    }
    rec = {
      v: 1,
      jobId,
      idempotencyKey,
      pollPath,
      total: Number(accepted?.total) || 0,
      submittedAt: nowImpl(),
      paperKey: job.paperKey,
      ...(job.context !== undefined ? { context: job.context } : {}),
    };
    // §11: stored BEFORE the first poll, so a reload from here on resumes this job.
    job.store.write(rec);
  }
  deps.onStage?.({ kind: "grading" });
  try {
    const settled = await pollJob(rec, deps, onProgress);
    job.store.clear();
    return settled;
  } catch (err) {
    if (!(err instanceof JobGone)) throw err; // network: the job stays stored for a resume
    job.store.clear();
    if (job.resumeOnly) throw new GradingJobGoneError();
    // §3 404 mid-poll: the job is gone. Owner rule: today's synchronous path, NEW key.
    return syncFallback(body, deps);
  }
}

async function syncFallback(body: WorksheetGradeRequestBody, deps: GradingJobDeps): Promise<Settled> {
  const res = await deps.submit(body, { idempotencyKey: newIdempotencyKey(), preferAsync: false });
  return { kind: "final", body: await deps.parse<WorksheetGradeResponse>(res) };
}

/** Totals the server's way (buildWorksheetBody), from FINAL rows only. */
function totalsOf(worksheetId: string, results: WorksheetQuestionGrade[]): WorksheetGradeResponse {
  const graded = results.filter((r) => isGradedQuestion(r));
  const half = (n: number) => Math.round(n * 2) / 2;
  return {
    ok: true,
    worksheetId,
    results,
    totalQuestions: results.length,
    gradedCount: graded.length,
    pendingCount: results.length - graded.length,
    gradedMarksAwarded: half(graded.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0)),
    gradedMarksTotal: half(graded.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0)),
    worksheetTotalMarks: half(results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0)),
    // No summary: the server wrote none for the merged paper, and none is invented here.
    summary: "",
  };
}

/**
 * The shared job client (contract §11). `req` is today's request body, byte for byte.
 */
export async function gradeWorksheetJob(
  req: WorksheetGradeRequestBody,
  job: GradingJobOptions,
  deps: GradingJobDeps,
): Promise<WorksheetGradeResponse> {
  const prior = job.continueFrom;
  if (!prior) {
    const settled = await runOnce(req, job, deps, job.onProgress);
    if (settled.kind === "interrupted") throw new GradingJobInterruptedError(settled.rows, job.paperKey);
    return settled.body;
  }

  // ── §6 "grade the remaining N" ──────────────────────────────────────────────
  const all = gradedQuestionsOf(req.questions);
  const remaining = prior.remaining.filter((i) => i >= 0 && i < all.length);
  const kept = prior.rows.filter((r) => !remaining.includes(r.index));
  const subsetQs = remaining.map((i) => all[i]);
  const subsetNumbers = new Set(subsetQs.map((q) => q.qNumber));
  const subsetBody: WorksheetGradeRequestBody = {
    ...req,
    questions: subsetQs,
    ...(req.uploads ? { uploads: req.uploads.filter((u) => subsetNumbers.has(u.qNumber)) } : {}),
  };
  // Subset rows come back indexed within the subset; show them at their paper index.
  const remap = (rows: GradingJobRow[]): GradingJobRow[] =>
    rows.map((r) => ({ ...r, index: remaining[r.index] ?? r.index }));
  const onProgress = job.onProgress
    ? (p: GradingJobProgress) =>
        job.onProgress!({
          state: p.state,
          total: all.length,
          done: kept.length + p.done,
          rows: [...kept, ...remap(p.rows)].sort((a, b) => a.index - b.index),
        })
    : undefined;
  const settled = await runOnce(subsetBody, { ...job, continueFrom: undefined, resumeOnly: false }, deps, onProgress);

  if (settled.kind === "interrupted") {
    const merged = [...kept, ...remap(settled.rows)].sort((a, b) => a.index - b.index);
    throw new GradingJobInterruptedError(merged, job.paperKey);
  }
  const body = settled.body;
  if (!body || body.ok !== true || !Array.isArray(body.results)) return body;
  const byIndex = new Map<number, WorksheetQuestionGrade>();
  for (const r of kept) byIndex.set(r.index, stripRow(r));
  body.results.forEach((r, pos) => {
    const idx = remaining[pos];
    if (idx !== undefined) byIndex.set(idx, r);
  });
  const results: WorksheetQuestionGrade[] = [];
  for (let i = 0; i < all.length; i += 1) {
    const r = byIndex.get(i);
    if (r) results.push(r);
  }
  return totalsOf(req.worksheetId, results);
}
