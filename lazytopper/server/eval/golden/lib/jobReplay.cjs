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

/** J3 round 6: the same plan WITH production's abort retry (timing.jobTiming().abortRetry): a chunk whose
 *  first call ABORTED is split into one-question calls, as before, at the larger budget. The synchronous path has no such retry,
 *  so this plan is used only by the ABORT-RETRY pass below, never by the job-vs-sync identity pass. */
function syncPlanAsJobWithAbortRetry(n) {
  return { ...syncPlanAsJob(n), abortRetry: timingLib.jobTiming().abortRetry };
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

/**
 * THE COMPARISON. The same request through the synchronous handler and through the job path, each
 * with its OWN copy of the same reply source (makeDriver() is called once per path). Returns
 *   { bodyEqual, finalRows, provisionalRows, provisionalChanged, finalRowDiffs, parts, oneDocument }
 * or { skipped } (the synchronous replay is not a 200: a job has no 500 to compare) or { error }.
 * `parts` = distinct chunks the JOB graded (first attempts); > 1 = a MULTI-CHUNK paper, where a row's
 * own inventory is NOT the paper's union and the stable rule (postprocess inventoryStable) decides.
 * `provisionalChanged` = provisional rows that did change at done (a real verdict flip).
 */
async function compareJobToSync({ label, request, makeDriver, abortRetry = false }) {
  const sync = await makeDriver(null).run({ handler: 'handleGradeWorksheet', request });
  if (sync.httpStatus !== 200) return { skipped: true };
  const syncBytes = JSON.stringify(sync.body);
  const firstAttemptChunks = new Set();
  const retryCalls = []; // J3 round 5/6: the job's attempt-2 calls { chunkKey, timeoutMs }
  const d = makeDriver((cfg) => {
    if (cfg && cfg.chunkKey && (cfg.attempt || 1) === 1) firstAttemptChunks.add(cfg.chunkKey);
    if (cfg && cfg.attempt === 2) retryCalls.push({ chunkKey: cfg.chunkKey || null, timeoutMs: cfg.timeoutMs });
  });
  const fs = memoryFirestore();
  const jobs = jobsLib.createGradingJobs({ resolveFirestore: () => ({ db: fs.db }), commitDeferred: () => null });
  const route = createCheckSolutionRoute({ ...d.deps, GRADING_JOBS: true, gradingJobs: jobs, jobTimingFor: abortRetry ? syncPlanAsJobWithAbortRetry : syncPlanAsJob });
  const uid = 'golden-eval';
  const key = 'golden-job-' + String(label).replace(/[^A-Za-z0-9-]/g, '-').slice(0, 40);
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
  let provisionalChanged = 0;
  const finalRowDiffs = [];
  for (const [k, row] of Object.entries(job.rows || {})) {
    const i = Number(k.slice(1));
    const want = final.ok && Array.isArray(final.results) ? JSON.stringify(final.results[i]) : null;
    if (row.final !== true) {
      provisionalRows += 1;
      if (row.json !== want) provisionalChanged += 1;
      continue;
    }
    finalRows += 1;
    if (row.json !== want) finalRowDiffs.push(label + '#Q' + (i + 1));
  }
  return {
    bodyEqual: job.final === syncBytes, finalRows, provisionalRows, provisionalChanged, finalRowDiffs,
    parts: firstAttemptChunks.size, oneDocument: Boolean(String(request.imageBase64 || '').trim()),
    // an abort retry = an attempt-2 call above the J1 per-call cap (only the abort retry may exceed it)
    abortRetries: retryCalls.filter((c) => c.timeoutMs > timingLib.JOB_PER_CALL_MS).map((c) => c.chunkKey),
    firstAttemptChunks: [...firstAttemptChunks],
  };
}

/** One stored grade-worksheet record, replayed from its stored model replies. */
async function replayAsJob(planJob, record, R, opts = {}) {
  const cfg = R.manifest && R.manifest.config;
  const detectModel = R.manifest && R.manifest.detectModel;
  const request = { ...JSON.parse(JSON.stringify(planJob.request)), acceptsV2: true };
  const makeDriver = (spy) => {
    const replay = replayCallGemini(record);
    const callGemini = spy ? (m, c, cfgCall) => { spy(cfgCall); return replay(m, c, cfgCall); } : replay;
    return driverFor(cfg, record, callGemini, detectModel);
  };
  return compareJobToSync({ label: record.jobKey, request, makeDriver, abortRetry: opts.abortRetry === true });
}

/**
 * SYNTHETIC FLIP. No stored paper has a real verdict flip (J1 audit Q5), so this one is built: a
 * 12-question one-document paper, graded in four parts of 3 (the synchronous plan for > 10
 * questions). Every part's reply lists its own questions in its page inventory with their first
 * lines, EXCEPT question 2: its own part (questions 1-3) leaves it out and the next part (questions
 * 4-6) lists it. So question 2 is "not found" on its own part's inventory but graded on the paper's
 * union: its row MUST be provisional and MUST change at done. A fixed replier, not a model:
 * deterministic, zero network.
 */
const FLIP_N = 12;
function syntheticFlipRequest() {
  return {
    worksheetId: 'golden-synthetic-flip', subject: 'Maths', acceptsV2: true,
    imageBase64: 'JVBERi0xLjQK', imageMimeType: 'application/pdf',
    questions: Array.from({ length: FLIP_N }, (_, i) => ({ qNumber: i + 1, marks: 2, questionText: 'Question ' + (i + 1) + ': solve x + ' + i + ' = 10 and show the working.' })),
  };
}
function syntheticFlipCallGemini() {
  return async (_model, _contents, cfg) => {
    const ids = String((cfg && cfg.chunkKey) || '').split('+').filter(Boolean).map((k) => Number(k.slice(1)));
    const work = (id) => 'Answer ' + (id + 1) + ': x = ' + (10 - id) + ', working shown step by step';
    const results = ids.map((id) => ({
      qNumber: id + 1, couldNotRead: false, addressesQuestion: 'yes', finalAnswerCorrect: true, teacherNote: 'Good.',
      annotatedSteps: [{ description: 'Answer', studentWork: work(id), status: 'correct', marksAwarded: 2, marksDeducted: 0, teacherAnnotation: 'Correct.', mistakeType: null }],
    }));
    const seen = ids.filter((id) => id !== 1).map((id) => ({ qNumber: id + 1, firstLine: work(id) }));
    if (ids.includes(3)) seen.push({ qNumber: 2, firstLine: work(1) });
    return { text: JSON.stringify({ pageInventory: [{ page: 1, questionsSeen: seen }], results, summary: 'Synthetic paper.' }), raw: { candidates: [{ finishReason: 'STOP' }] } };
  };
}
async function syntheticFlipCase() {
  const makeDriver = (spy) => {
    const reply = syntheticFlipCallGemini();
    const callGemini = spy ? (m, c, cfg) => { spy(cfg); return reply(m, c, cfg); } : reply;
    return createDriver({ callGemini, model: 'gemini-2.5-flash', gradingModel: 'gemini-3.8-flash', gradingMode: 'single', makeFenceNonce: () => 'goldenflipnonce' });
  };
  return compareJobToSync({ label: 'SYNTHETIC.FLIP', request: syntheticFlipRequest(), makeDriver });
}

/** Every stored grade-worksheet record of the given runs, plus (opt-in) the synthetic flip paper. */
async function replayRunsAsJobs(runDirs, opts = {}) {
  const plan = Object.fromEntries(buildPlan({ includeDetect: true }).map((j) => [j.jobKey, j]));
  const out = {
    jobs: 0, skipped: 0, bodyDiffs: [], finalRows: 0, provisionalRows: 0, provisionalChanged: 0, finalRowDiffs: [], errors: [],
    multiChunkPapers: 0, multiChunkOneDocument: 0, multiChunkFinalRows: 0, syntheticFlip: null,
    abortRetryJobs: 0, abortRetryIdentical: 0, abortRetried: 0,
  };
  // J3 round 6 · THE ABORT-RETRY PASS: the same stored replies through the job path WITH production's abort
  // retry. A job none of whose chunks aborted must be BYTE-IDENTICAL to the synchronous body (the abort
  // retry changes nothing else); a job with an aborted chunk must retry it as ONE call per question (a
  // one-question chunk as itself), each question exactly once, covering the whole chunk and nothing
  // outside it — trunk's split shape on the larger budget. Failures join bodyDiffs / errors.
  const addAbortRetry = (label, r) => {
    if (r.skipped) return;
    out.abortRetryJobs += 1;
    if (r.error) { out.errors.push('ABORT-RETRY ' + label + ': ' + r.error); return; }
    if (r.abortRetries.length === 0) {
      if (!r.bodyEqual || r.finalRowDiffs.length) out.bodyDiffs.push('ABORT-RETRY ' + label);
      else out.abortRetryIdentical += 1;
      return;
    }
    out.abortRetried += 1;
    const idsOf = (k) => String(k || '').split('+').filter(Boolean);
    const once = new Set(r.abortRetries).size === r.abortRetries.length;
    const single = r.abortRetries.every((k) => idsOf(k).length === 1);
    const retried = new Set(r.abortRetries);
    const parents = new Set(r.abortRetries.map((k) => r.firstAttemptChunks.find((c) => idsOf(c).includes(k))));
    const split = !parents.has(undefined) && [...parents].every((c) => idsOf(c).every((id) => retried.has(id)));
    if (!once || !single || !split) out.errors.push('ABORT-RETRY ' + label + ': retries ' + JSON.stringify(r.abortRetries) + ' are not one single-question call per question of each aborted chunk');
  };
  const add = (label, r) => {
    if (r.skipped) { out.skipped += 1; return; }
    out.jobs += 1;
    if (r.error) { out.errors.push(label + ': ' + r.error); return; }
    if (!r.bodyEqual) out.bodyDiffs.push(label);
    out.finalRows += r.finalRows;
    out.provisionalRows += r.provisionalRows;
    out.provisionalChanged += r.provisionalChanged;
    out.finalRowDiffs.push(...r.finalRowDiffs);
    if (r.parts > 1) {
      out.multiChunkPapers += 1;
      out.multiChunkFinalRows += r.finalRows;
      if (r.oneDocument) out.multiChunkOneDocument += 1;
    }
  };
  for (const runDir of runDirs) {
    const R = loadRun(runDir);
    for (const run of Object.keys(R.runs).map(Number).sort((a, b) => a - b)) {
      for (const record of R.runs[run]) {
        const planJob = plan[record.jobKey];
        if (!planJob || planJob.handler !== 'handleGradeWorksheet') continue;
        let r;
        try { r = await replayAsJob(planJob, record, R); } catch (e) { r = { error: (e && e.message) || String(e) }; }
        add(record.jobKey + '#' + run, r);
        let ar;
        try { ar = await replayAsJob(planJob, record, R, { abortRetry: true }); } catch (e) { ar = { error: (e && e.message) || String(e) }; }
        addAbortRetry(record.jobKey + '#' + run, ar);
      }
    }
  }
  // What the STORED replies alone contain (the synthetic paper is counted separately).
  out.storedMultiChunkPapers = out.multiChunkPapers;
  out.storedMultiChunkOneDocument = out.multiChunkOneDocument;
  out.storedMultiChunkFinalRows = out.multiChunkFinalRows;
  if (opts.syntheticFlip) {
    let r;
    try { r = await syntheticFlipCase(); } catch (e) { r = { error: (e && e.message) || String(e) }; }
    add('SYNTHETIC.FLIP', r);
    out.syntheticFlip = r.error ? { error: r.error } : { parts: r.parts, provisionalRows: r.provisionalRows, provisionalChanged: r.provisionalChanged, finalRows: r.finalRows, bodyEqual: r.bodyEqual };
  }
  return out;
}

module.exports = { replayRunsAsJobs, replayAsJob, compareJobToSync, syntheticFlipCase, syncPlanAsJob, syncPlanAsJobWithAbortRetry, memoryFirestore };
