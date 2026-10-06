'use strict';
// server/grading/jobs.cjs — BACKGROUND GRADING JOBS (GRADING-JOBS-1 J1, owner ruling 7).
//
// WHY. A paper is graded inside ONE web request today, against an 80 s deadline; a 4-question
// paper took 77.1 s live, and big papers time out. A JOB answers the submit at once (202) and grades
// in the background; the student's page polls GET /api/grade-worksheet/jobs/:jobId and shows the
// questions as they settle.
//
// THE RULES THIS FILE KEEPS (controller decisions D9–D16, review §3 "ADOPT WITH CHANGES"):
//   • SAME URL, SAME GATES (D9). A job is started by the grade-worksheet handler AFTER the whole POST
//     pipeline ran (verified uid → idempotency → limiter → entitlement → fair-use decision). Only a
//     request that idempotency CLAIMED can become one (fairUse.gradingAttemptOf), so a job always has
//     a verified uid, Firestore and an Idempotency-Key. Anything else is graded synchronously, as today.
//   • NO NEW STORE (D10). jobId = the idempotency attempt id (sha256 of path|client key, 40 hex — never
//     derivable without the client's key). The job lives on that attempt's own record,
//     gradingResults/{uid}/attempts/{jobId}, field `job` — already uid-scoped, already erased and
//     exported (src/services/studentDataMap.ts), already 24 h (expiresAtMs, enforced on read). No new
//     collection, no new src/ file, no firestore.rules change (admin SDK; browsers are denied).
//   • ROW WRITES WITH update() (D10, the erasure race): update() FAILS on a document that no longer
//     exists, so a job whose student erased their account mid-grade can never re-create the record.
//     Every STATE change (queued → running → done | interrupted) is a transaction.
//   • CHARGE ONCE, AT THE END, FOR GRADED QUESTIONS ONLY (D12). The 202 commits nothing (the handler
//     records a chargeable count of 0 on it). The fair-use commit the hooks would have made is
//     persisted at submit (`job.deferred`, plain data), and the transaction that ends the job — `done`
//     by its worker, or `interrupted` by whichever reader finds it dead — sets `job.charged`; ONLY the
//     reader whose transaction flipped it from false calls commitDeferred(deferred, graded). A replayed
//     submit (same key) gets the stored 202 and starts nothing; a poll never charges.
//     ⚠ What "exactly once" means here: the CLAIM is exactly once (transactional); the ledger increment
//     is issued once by the claim winner, AFTER its claim committed. A process death in that window
//     (milliseconds) loses the charge — it can never double it. The student is never charged twice.
//   • PROVISIONAL vs FINAL (D13). Each question's row is written as its chunk settles, with `final`
//     from the grading core (postprocess inventoryStable). Totals and the summary exist only at `done`,
//     inside `final` — the v2 body, byte-identical to the synchronous 200's.
//   • RESTART TRUTH (D15). A live job writes `heartbeatAtMs` every JOB_HEARTBEAT_MS. A queued/running
//     job whose heartbeat is older than JOB_STALE_MS was killed with its process (Railway restarts the
//     gateway on every deploy): the READ that notices it ends it as `interrupted` — no sweeper. Final
//     rows stay final and are charged; every other question is "not graded" with
//     notGraded: "interrupted", never charged. The uploaded document is NEVER persisted (it is held in
//     this process's memory for the job's life only), so a job cannot be resumed — the student grades
//     the remaining questions again.
//   • PROCESS CAP (D16). At most MAX_INFLIGHT_JOBS run at once in this process; the rest wait `queued`
//     (heartbeating, so a queued job is not mistaken for a dead one).

const timingLib = require('./timing.cjs');
const { isChargeable } = require('./charge.cjs');
const { zeroLost } = require('./postprocess.cjs');
const { redactErrorDetails } = require('../services/httpUtils.cjs');
const { captureRequestContext } = require('../services/usageLedger.cjs');
const { GRADING_RESULTS_COLLECTION, GRADING_RESULTS_SEGMENTS, IDEMPOTENCY_MAX_BODY_BYTES } = require('../services/fairUse.cjs');

const JOB_STATES = Object.freeze({ QUEUED: 'queued', RUNNING: 'running', DONE: 'done', INTERRUPTED: 'interrupted' });
const LIVE_STATES = new Set([JOB_STATES.QUEUED, JOB_STATES.RUNNING]);
/** D16: background jobs grading at once in ONE process; the next one waits `queued`. */
const MAX_INFLIGHT_JOBS = 4;
/** How soon the client should poll again (the 202 and every unfinished poll carry it). */
const POLL_AFTER_MS = 2500;
/** A job id is an idempotency attempt id: 40 lower-case hex. Anything else is never a job. */
const JOB_ID_RE = /^[0-9a-f]{40}$/;
/** The poll path. Exported so index.cjs cannot drift from it. */
const JOB_POLL_PATH_RE = /^\/api\/grade-worksheet\/jobs\/([^/]+)$/;
const JOB_POLL_PATH_PREFIX = '/api/grade-worksheet/jobs/';
/** A paper larger than this is graded synchronously: the job record must fit Firestore's 1 MiB
 *  document with its rows AND its final body. Measured on every stored golden paper (J1 report
 *  P6(c)): a v2 result is 2.1 KB on average and 3.9 KB at most (a 27-question body: 41-48 KB), so
 *  100 questions at the maximum is 2 x 390 KB, inside IDEMPOTENCY_MAX_BODY_BYTES (900 KB). */
const MAX_JOB_QUESTIONS = 100;
/** The student-facing note on a question an interrupted job did not finish. */
const INTERRUPTED_NOTE = 'Not graded — the check was interrupted before this question was marked. You have not been charged for it; grade it again.';
/** The final body when the grading itself failed outright (the synchronous path's 500 copy, as data). */
const JOB_FAILED_BODY = Object.freeze({ ok: false, error: 'Failed to grade the worksheet. Please try again.' });
const ROW_KEY = (index) => 'q' + index;

function defaultResolveFirestore() {
  try {
    const admin = require('firebase-admin');
    if (!admin || !Array.isArray(admin.apps) || admin.apps.length === 0) return null;
    return { db: admin.firestore() };
  } catch {
    return null;
  }
}

/** Firestore's NOT_FOUND (gRPC code 5): the record is gone — the account was erased mid-job. */
function isNotFound(err) {
  return Boolean(err) && (err.code === 5 || err.code === 'not-found' || /NOT_FOUND|no document to update/i.test(String(err.message || '')));
}

/** The v2 "not graded" row for a question an interrupted job did not finish (postprocess pending shape). */
function interruptedRow(meta) {
  const totalMarks = Number(meta && meta.totalMarks) > 0 ? Number(meta.totalMarks) : 1;
  return {
    qNumber: meta ? meta.qNumber : null, couldNotRead: true, totalMarks, marksAwarded: 0, note: INTERRUPTED_NOTE,
    answerMismatch: null, departureKind: null, marksLostByType: zeroLost(), rubric: null, objectiveResolved: null,
    notGraded: 'interrupted',
  };
}

/** Is this request asking for a background job? RFC 7240 `Prefer: respond-async` (canonical), or
 *  body `async: true`. (Asking is never enough: the server decides — see the handler.) */
function wantsAsync(req, payload) {
  const raw = req && req.headers ? req.headers.prefer : undefined;
  const header = String(Array.isArray(raw) ? raw.join(',') : raw || '');
  const prefers = header.split(',').some((t) => t.split(';')[0].trim().toLowerCase() === 'respond-async');
  return prefers || Boolean(payload && payload.async === true);
}

/**
 * @param deps.resolveFirestore () => ({ db } | null) — defaults to firebase-admin.
 * @param deps.commitDeferred   (deferred, gradedCount) => any — fair use's deferred commit.
 * @param deps.telemetry, deps.now, deps.maxInFlight, deps.heartbeatMs, deps.staleMs (tests)
 */
function createGradingJobs(deps = {}) {
  const resolveFirestore = typeof deps.resolveFirestore === 'function' ? deps.resolveFirestore : defaultResolveFirestore;
  const commitDeferred = typeof deps.commitDeferred === 'function' ? deps.commitDeferred : () => null;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const telemetry = deps.telemetry || null;
  const maxInFlight = Number.isFinite(deps.maxInFlight) && deps.maxInFlight > 0 ? Math.floor(deps.maxInFlight) : MAX_INFLIGHT_JOBS;
  const heartbeatMs = Number.isFinite(deps.heartbeatMs) && deps.heartbeatMs > 0 ? deps.heartbeatMs : timingLib.JOB_HEARTBEAT_MS;
  const staleMs = Number.isFinite(deps.staleMs) && deps.staleMs > 0 ? deps.staleMs : timingLib.JOB_STALE_MS;

  /** Jobs this process owns, by `uid/jobId`: { ref, state, timer, erased }. */
  const live = new Map();
  const queue = [];
  let running = 0;

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch { /* a counter never fails a job */ }
  }

  function database() {
    try {
      const fs = resolveFirestore();
      return fs && fs.db ? fs.db : null;
    } catch {
      return null;
    }
  }

  function refOf(db, uid, jobId) {
    return db.collection(GRADING_RESULTS_COLLECTION).doc(uid).collection(GRADING_RESULTS_SEGMENTS.attempts).doc(jobId);
  }

  const dataOf = (snap) => (snap && snap.exists && typeof snap.data === 'function' ? snap.data() : null);

  /** The questions charged when a job ends: rows that are final AND chargeable. */
  function gradedOfRows(rows) {
    return Object.values(rows || {}).filter((r) => r && r.final === true && r.chargeable === true).length;
  }

  /**
   * END A JOB as INTERRUPTED, once (a transaction). `force` (SIGTERM) skips the stale test. Final
   * rows stay; every other question becomes notGraded "interrupted". Charged: the final graded rows,
   * by the reader whose transaction flipped `charged`. Returns true when this call ended it.
   */
  async function interrupt(db, ref, { force = false, reason = 'stale' } = {}) {
    let claim = null;
    await db.runTransaction(async (tx) => {
      claim = null;
      const data = dataOf(await tx.get(ref));
      const job = data && data.job;
      if (!job || !LIVE_STATES.has(job.state)) return;
      const nowMs = now();
      if (!force && !(nowMs - Number(job.heartbeatAtMs || 0) > staleMs)) return;
      const rows = job.rows || {};
      const meta = Array.isArray(job.meta) ? job.meta : [];
      const results = meta.map((m, i) => {
        const row = rows[ROW_KEY(i)];
        return row && row.final === true ? row.json : JSON.stringify(redactErrorDetails(interruptedRow(m), 2));
      });
      const graded = gradedOfRows(rows);
      const won = job.charged !== true;
      tx.update(ref, {
        // `rows` go: `results` now holds every question (a record never carries both).
        job: { ...job, rows: {}, state: JOB_STATES.INTERRUPTED, interruptedAtMs: nowMs, interruptReason: reason, results, charged: true, chargedCount: won ? graded : job.chargedCount },
      });
      claim = { won, graded, deferred: job.deferred || null };
    });
    if (!claim) return false;
    emit('grading_jobs.interrupted.' + reason);
    if (claim.won) commitDeferred(claim.deferred, claim.graded);
    return true;
  }

  /**
   * SUBMIT. Writes the job onto its CLAIMED attempt record (a transaction: the record must still be
   * this claim's pending marker), then queues or starts the worker inside the submitting request's
   * async context. Returns { ok:true, jobId, total, pollAfterMs, state } or { ok:false } (the handler
   * then grades synchronously — nothing was written, nothing is lost).
   *   run(onRows, startedAt) → Promise<graded> (the grading core's result; may throw)
   *   finish(graded | { error }) → { body: string, graded: number, model: string|null }
   */
  async function submit({ attempt, total, meta, deferred, run, finish }) {
    const db = database();
    if (!db || !attempt || !attempt.uid || !JOB_ID_RE.test(String(attempt.attemptId || ''))) return { ok: false };
    if (!(total > 0) || total > MAX_JOB_QUESTIONS) return { ok: false };
    const ref = refOf(db, attempt.uid, attempt.attemptId);
    const nowMs = now();
    try {
      const created = await db.runTransaction(async (tx) => {
        const data = dataOf(await tx.get(ref));
        if (!data || data.state !== 'pending' || data.claimId !== attempt.claimId || data.job) return false;
        tx.update(ref, {
          job: {
            v: 1, state: JOB_STATES.QUEUED, total, meta, rows: {}, submittedAtMs: nowMs, heartbeatAtMs: nowMs,
            deferred: deferred || null, charged: false, model: null,
          },
        });
        return true;
      });
      if (!created) return { ok: false };
    } catch {
      emit('grading_jobs.submit_failed');
      return { ok: false };
    }
    const state = running < maxInFlight ? JOB_STATES.RUNNING : JOB_STATES.QUEUED;
    const key = attempt.uid + '/' + attempt.attemptId;
    const entry = { key, db, ref, erased: false, timer: null, inContext: captureRequestContext(), run, finish };
    live.set(key, entry);
    // Heartbeat from submit: a QUEUED job is alive too.
    entry.timer = setInterval(() => { void beat(entry); }, heartbeatMs);
    if (entry.timer && typeof entry.timer.unref === 'function') entry.timer.unref();
    emit('grading_jobs.submitted');
    if (state === JOB_STATES.RUNNING) startJob(entry);
    else { queue.push(entry); emit('grading_jobs.queued'); }
    return { ok: true, jobId: attempt.attemptId, total, pollAfterMs: POLL_AFTER_MS, state };
  }

  async function beat(entry) {
    if (entry.erased) return;
    try {
      await entry.ref.update({ 'job.heartbeatAtMs': now() });
    } catch (e) {
      if (isNotFound(e)) entry.erased = true;
      emit('grading_jobs.heartbeat_failed');
    }
  }

  function startJob(entry) {
    running += 1;
    entry.inContext(() => {
      void work(entry).finally(() => {
        running -= 1;
        if (entry.timer) clearInterval(entry.timer);
        live.delete(entry.key);
        entry.run = null; // the document leaves memory with the closure
        entry.finish = null;
        const next = queue.shift();
        if (next) startJob(next);
      });
    });
  }

  async function work(entry) {
    const { db, ref } = entry;
    const startedAt = now();
    // queued → running (a transaction: an interrupted or erased job is not restarted).
    let go = false;
    try {
      go = await db.runTransaction(async (tx) => {
        const data = dataOf(await tx.get(ref));
        const job = data && data.job;
        if (!job || !LIVE_STATES.has(job.state)) return false;
        tx.update(ref, { 'job.state': JOB_STATES.RUNNING, 'job.startedAtMs': startedAt, 'job.heartbeatAtMs': startedAt });
        return true;
      });
    } catch {
      go = false;
    }
    if (!go) { emit('grading_jobs.not_started'); return; }
    emit('grading_jobs.started');

    // Rows, written in order, one update() per settled part.
    let chain = Promise.resolve();
    const onRows = (rows) => {
      if (entry.erased || !Array.isArray(rows) || rows.length === 0) return;
      const update = {};
      for (const r of rows) {
        update['job.rows.' + ROW_KEY(r.index)] = {
          final: r.final === true,
          chargeable: isChargeable(r.result),
          json: JSON.stringify(redactErrorDetails(r.result, 2)),
        };
      }
      chain = chain.then(() => (entry.erased ? null : ref.update(update))).catch((e) => {
        if (isNotFound(e)) entry.erased = true;
        emit('grading_jobs.row_write_failed');
      });
    };

    let outcome;
    try {
      outcome = entry.finish(await entry.run(onRows, startedAt));
    } catch (error) {
      outcome = entry.finish({ error });
    }
    await chain;
    if (entry.erased) { emit('grading_jobs.erased'); return; }

    // running → done, charged once (a transaction).
    let claim = null;
    try {
      await db.runTransaction(async (tx) => {
        claim = null;
        const data = dataOf(await tx.get(ref));
        const job = data && data.job;
        if (!job || !LIVE_STATES.has(job.state)) return; // interrupted meanwhile: it was settled there
        const won = job.charged !== true;
        let rows = job.rows || {};
        // The record must fit Firestore's document cap: the rows go when final + rows would not.
        const size = Buffer.byteLength(outcome.body, 'utf8') + Buffer.byteLength(JSON.stringify(rows), 'utf8');
        if (size > IDEMPOTENCY_MAX_BODY_BYTES) rows = {};
        tx.update(ref, {
          job: { ...job, rows, state: JOB_STATES.DONE, doneAtMs: now(), final: outcome.body, model: outcome.model || null, charged: true, chargedCount: won ? outcome.graded : job.chargedCount },
        });
        claim = { won, graded: outcome.graded, deferred: job.deferred || null };
      });
    } catch (e) {
      emit('grading_jobs.done_failed');
      return;
    }
    if (!claim) return;
    emit('grading_jobs.done');
    if (claim.won) commitDeferred(claim.deferred, claim.graded);
  }

  /**
   * READ for the poll (owner-scoped by path: only gradingResults/{uid}/…). A live job whose heartbeat
   * is stale is ended as interrupted HERE, then re-read. Returns
   *   { status: 404 } | { status: 503 } | { status: 200, body: string, model: string|null, state }
   */
  async function read(uid, jobId) {
    if (!uid || !JOB_ID_RE.test(String(jobId || ''))) return { status: 404 };
    const db = database();
    if (!db) return { status: 503 };
    const ref = refOf(db, uid, jobId);
    let data;
    try {
      data = dataOf(await ref.get());
      const job = data && data.job;
      if (job && LIVE_STATES.has(job.state) && now() - Number(job.heartbeatAtMs || 0) > staleMs) {
        await interrupt(db, ref, { reason: 'stale' });
        data = dataOf(await ref.get());
      }
    } catch {
      return { status: 503 };
    }
    const job = data && data.job;
    const expiresAtMs = Number(data && data.expiresAtMs);
    if (!job || !Number.isFinite(expiresAtMs) || expiresAtMs <= now()) return { status: 404 };
    return { status: 200, ...viewOf(jobId, job) };
  }

  /** The poll body (a string: a done job's `final` is spliced in byte-for-byte). */
  function viewOf(jobId, job) {
    const head = { ok: true, jobId, state: job.state, total: job.total };
    const rowEntry = (i, final, json) => ({ index: i, final, ...JSON.parse(json) });
    if (job.state === JOB_STATES.DONE) {
      const parsed = JSON.parse(job.final);
      const results = parsed && parsed.ok === true && Array.isArray(parsed.results)
        ? parsed.results.map((r, i) => ({ index: i, final: true, ...r }))
        : rowsOf(job).map(({ i, row }) => rowEntry(i, true, row.json));
      const body = JSON.stringify({ ...head, done: job.total, model: job.model || null, results });
      return { state: job.state, model: job.model || null, body: body.slice(0, -1) + ',"final":' + job.final + '}' };
    }
    if (job.state === JOB_STATES.INTERRUPTED) {
      const results = (Array.isArray(job.results) ? job.results : []).map((json, i) => rowEntry(i, true, json));
      return { state: job.state, model: null, body: JSON.stringify({ ...head, done: job.total, results }) };
    }
    const results = rowsOf(job).map(({ i, row }) => rowEntry(i, row.final === true, row.json));
    return { state: job.state, model: null, body: JSON.stringify({ ...head, done: results.length, pollAfterMs: POLL_AFTER_MS, results }) };
  }

  function rowsOf(job) {
    const rows = job.rows || {};
    return Object.keys(rows)
      .map((k) => ({ i: Number(k.slice(1)), row: rows[k] }))
      .filter(({ i, row }) => Number.isInteger(i) && row && typeof row.json === 'string')
      .sort((a, b) => a.i - b.i);
  }

  /** D15 (best effort): end every job this process owns as interrupted — SIGTERM. Never rejects. */
  async function interruptAll(reason = 'shutdown') {
    const entries = [...live.values()];
    await Promise.all(entries.map((e) => interrupt(e.db, e.ref, { force: true, reason }).catch(() => false)));
    return entries.length;
  }

  return {
    submit, read, interruptAll,
    stats: () => ({ running, queued: queue.length, live: live.size }),
  };
}

module.exports = {
  createGradingJobs,
  wantsAsync,
  interruptedRow,
  JOB_STATES,
  MAX_INFLIGHT_JOBS,
  MAX_JOB_QUESTIONS,
  POLL_AFTER_MS,
  JOB_ID_RE,
  JOB_POLL_PATH_RE,
  JOB_POLL_PATH_PREFIX,
  INTERRUPTED_NOTE,
  JOB_FAILED_BODY,
};
