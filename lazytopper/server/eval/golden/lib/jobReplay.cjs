'use strict';
// lib/jobReplay.cjs — GRADING-JOBS-1 J1 (controller decision D13): THE 0-CALL JOB CASE.
//
// For every stored /api/grade-worksheet job of a golden run, the SAME stored model replies are
// replayed twice through the REAL handler (routes/checkSolution.cjs):
//   SYNC — exactly as G1 does (lib/driver.cjs): today's 200 body;
//   JOB  — the background-job path: the request opts in (`Prefer: respond-async`), the switch is on,
//          the request carries a claimed idempotency attempt, and grading/jobs.cjs runs the job over
//          an in-memory Firestore; its rows and its `final` body are read back from the job record.
// Both grade with the SAME chunk plan (the job is given the synchronous plan through the route's
// eval seam `jobTimingFor`), so they consume the same stored replies — a job graded at its own chunk
// size would ask for calls the record never made. Both requests ask for the v2 shape (a job requires
// it), on the stored replies of runs recorded with and without it.
//
// It asserts, per job: (1) the job's final body is BYTE-IDENTICAL to the synchronous body; (2) every
// row the job published as `final: true` (as its chunk settled) equals that question's entry in the
// final body. Network: none — the CLI (goldenJobs.cjs) installs lib/netblock.cjs first.

const path = require('path');
const { loadRun, pickStoredCall, ReplayExhaustedError } = require('./replay.cjs');
const { buildPlan } = require('./planner.cjs');
const { createDriver, SERVER_DIR } = require('./driver.cjs');

const { createCheckSolutionRoute } = require(path.join(SERVER_DIR, 'routes', 'checkSolution.cjs'));
const jobsLib = require(path.join(SERVER_DIR, 'grading', 'jobs.cjs'));
const timingLib = require(path.join(SERVER_DIR, 'grading', 'timing.cjs'));
const { GRADING_ATTEMPT, idempotencyAttemptId } = require(path.join(SERVER_DIR, 'services', 'fairUse.cjs'));

const tick = () => new Promise((r) => setImmediate(r));

/** A minimal Firestore for one job record: transactions, get/update (update fails on a missing doc). */
function memoryFirestore() {
  const docs = new Map();
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const put = (p, fields) => {
    const d = clone(docs.get(p)) || {};
    for (const [k, v] of Object.entries(fields)) {
      const parts = k.split('.');
      let o = d;
      for (let i = 0; i < parts.length - 1; i += 1) { if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
      o[parts[parts.length - 1]] = clone(v);
    }
    docs.set(p, d);
  };
  const missing = () => Object.assign(new Error('5 NOT_FOUND'), { code: 5 });
  function ref(parts) {
    const p = parts.join('/');
    return {
      path: p,
      collection: (n) => ({ doc: (id) => ref([...parts, n, id]) }),
      async get() { await tick(); return { exists: docs.has(p), data: () => clone(docs.get(p)) }; },
      async update(f) { await tick(); if (!docs.has(p)) throw missing(); put(p, f); },
    };
  }
  const db = {
    collection: (n) => ({ doc: (id) => ref([n, id]) }),
    async runTransaction(fn) {
      const ops = [];
      const tx = {
        async get(r) { await tick(); return { exists: docs.has(r.path), data: () => clone(docs.get(r.path)) }; },
        update(r, f) { ops.push([r, f]); return tx; },
      };
      const out = await fn(tx);
      for (const [r] of ops) if (!docs.has(r.path)) throw missing();
      for (const [r, f] of ops) put(r.path, f);
      return out;
    },
  };
  return { db, docs };
}

/** The synchronous chunk plan, as a job budget: one call up to 10 questions (D43), else chunks of 3. */
function syncPlanAsJob(n) {
  return {
    wallMs: timingLib.JOB_WALL_MS,
    perCallMs: timingLib.JOB_PER_CALL_MS,
    chunkQuestions: n > timingLib.SINGLE_CALL_MAX_QUESTIONS ? timingLib.MAX_CHUNK_QUESTIONS : Math.max(1, n),
  };
}

/** The stored replies of one record, served by identity exactly as lib/replay.cjs serves them. */
function replayCallGemini(record) {
  const calls = (record.calls || []).slice();
  const used = new Set();
  return async (model, _contents, cfg) => {
    const at = pickStoredCall(calls, used, model, cfg);
    const next = at >= 0 ? calls[at] : null;
    if (!next) throw new ReplayExhaustedError(record.jobKey);
    used.add(at);
    if (next.ok) return { text: next.text, raw: { candidates: [{ finishReason: next.finishReason || null }] } };
    if (!next.error && (!Array.isArray(next.http) || next.http.length === 0)) {
      const late = new Error('stored call still in flight at the request deadline');
      late.status = null;
      late.gradingDeadline = true;
      throw late;
    }
    const err = new Error(next.error ? next.error.message : 'stored model error');
    err.status = next.error ? next.error.status : null;
    throw err;
  };
}

function driverFor(cfg, record, callGemini, detectModel) {
  return cfg && cfg.core
    ? createDriver({ callGemini, model: detectModel || 'gemini-2.5-flash', gradingModel: cfg.model, gradingThinkingBudget: cfg.thinkingBudget ?? null, gradingMode: cfg.gradingMode, gradingLightModel: cfg.lightModel })
    : createDriver({ callGemini, model: record.model });
}

/** One stored grade-worksheet record → { bodyEqual, finalRows, provisionalRows, finalRowDiffs } or { error }. */
async function replayAsJob(planJob, record, R) {
  const cfg = R.manifest && R.manifest.config;
  const detectModel = R.manifest && R.manifest.detectModel;
  const request = { ...JSON.parse(JSON.stringify(planJob.request)), acceptsV2: true };
  // SYNC — the real handler, as G1 runs it.
  const sync = await driverFor(cfg, record, replayCallGemini(record), detectModel).run({ ...planJob, request });
  if (sync.httpStatus !== 200) return { skipped: true };
  const syncBytes = JSON.stringify(sync.body);
  // JOB — the same handler, on the job path.
  const fs = memoryFirestore();
  const jobs = jobsLib.createGradingJobs({ resolveFirestore: () => ({ db: fs.db }), commitDeferred: () => null });
  const d = driverFor(cfg, record, replayCallGemini(record), detectModel);
  const route = createCheckSolutionRoute({ ...d.deps, GRADING_JOBS: true, gradingJobs: jobs, jobTimingFor: syncPlanAsJob });
  const uid = 'golden-eval';
  const key = 'golden-job-' + String(record.jobKey).replace(/[^A-Za-z0-9-]/g, '-').slice(0, 40);
  const attemptId = idempotencyAttemptId('/api/grade-worksheet', key);
  const claimId = 'claim-' + attemptId.slice(0, 8);
  const recPath = 'gradingResults/' + uid + '/attempts/' + attemptId;
  fs.docs.set(recPath, { state: 'pending', claimId, claimedAtMs: Date.now(), expiresAtMs: Date.now() + 86400000 });
  const req = { headers: { prefer: 'respond-async' }, __payload: JSON.parse(JSON.stringify(request)) };
  Object.defineProperty(req, GRADING_ATTEMPT, { value: { uid, attemptId, path: '/api/grade-worksheet', claimId } });
  let status = 0;
  const res = { writeHead(s) { status = s; }, setHeader() {}, end() {}, once() {}, on() {} };
  await route.handleGradeWorksheet(req, res);
  if (status !== 202) return { error: 'job not started (HTTP ' + status + ')' };
  for (let i = 0; i < 20000 && fs.docs.get(recPath).job.state !== 'done'; i += 1) await tick();
  const job = fs.docs.get(recPath).job;
  if (job.state !== 'done') return { error: 'job did not finish (state ' + job.state + ')' };
  const final = JSON.parse(job.final);
  let finalRows = 0;
  let provisionalRows = 0;
  const finalRowDiffs = [];
  for (const [k, row] of Object.entries(job.rows || {})) {
    if (row.final !== true) { provisionalRows += 1; continue; }
    finalRows += 1;
    const i = Number(k.slice(1));
    const want = final.ok && Array.isArray(final.results) ? JSON.stringify(final.results[i]) : null;
    if (row.json !== want) finalRowDiffs.push(record.jobKey + '#Q' + (i + 1));
  }
  return { bodyEqual: job.final === syncBytes, finalRows, provisionalRows, finalRowDiffs };
}

/** Every stored grade-worksheet record of the given runs. */
async function replayRunsAsJobs(runDirs) {
  const plan = Object.fromEntries(buildPlan({ includeDetect: true }).map((j) => [j.jobKey, j]));
  const out = { jobs: 0, skipped: 0, bodyDiffs: [], finalRows: 0, provisionalRows: 0, finalRowDiffs: [], errors: [] };
  for (const runDir of runDirs) {
    const R = loadRun(runDir);
    for (const run of Object.keys(R.runs).map(Number).sort((a, b) => a - b)) {
      for (const record of R.runs[run]) {
        const planJob = plan[record.jobKey];
        if (!planJob || planJob.handler !== 'handleGradeWorksheet') continue;
        let r;
        try { r = await replayAsJob(planJob, record, R); } catch (e) { r = { error: (e && e.message) || String(e) }; }
        if (r.skipped) { out.skipped += 1; continue; }
        out.jobs += 1;
        if (r.error) { out.errors.push(record.jobKey + '#' + run + ': ' + r.error); continue; }
        if (!r.bodyEqual) out.bodyDiffs.push(record.jobKey + '#' + run);
        out.finalRows += r.finalRows;
        out.provisionalRows += r.provisionalRows;
        out.finalRowDiffs.push(...r.finalRowDiffs.map((x) => x + '#' + run));
      }
    }
  }
  return out;
}

module.exports = { replayRunsAsJobs, replayAsJob, syncPlanAsJob, memoryFirestore };
