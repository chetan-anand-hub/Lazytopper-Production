'use strict';
// server/grading/singleJobs.suite.cjs — GRADE-SINGLE-JOB-1: a ONE-question Answer Checker check
// (POST /api/check-solution) as a background grading job.
//
// Every test drives the REAL pieces in index.cjs's order — idempotency (createGradingIdempotency) →
// fair use (createFairUse.applyToRequest) → the check-solution handler (createCheckSolutionRoute) → the
// job runner (grading/jobs.cjs) → the poll route (routes/gradingJobs.cjs) — over a path-keyed in-memory
// Firestore that honours transactions. Only the model is stubbed.
//
// The pins:
//   IDENTITY · the model request (the HTTP body the REAL geminiClient puts on the wire) is byte-identical on
//              the synchronous path and the job path — typed, photo, scheme-first cache, objective MCQ — and
//              the job's `final` is byte-identical to the synchronous 200 body.
//   1 happy path (202 charges nothing; done charges 1, once) · 2 a not-graded answer charges 0 ·
//   3 idempotent replay (same key → the stored 202, no second job, no second charge) ·
//   4 timeout → the abort re-split budget; every attempt timing out → the synchronous failure copy, charged 0 ·
//   5 drain (interruptAll) → interrupted, charged 0 · 6 switches OFF / no claim / auto-detect → synchronous,
//   byte-identical · 7 the single lane never waits behind four papers (and papers keep their cap) ·
//   8 GRADING_SINGLE_JOBS is OFF by default.
//
// Named *.suite.cjs: checkSolution.test.cjs requires it (as it requires jobs.suite.cjs), so it runs in CI
// under test:server:check-solution. Run alone: node --test server/grading/singleJobs.suite.cjs

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { createCheckSolutionRoute } = require('../routes/checkSolution.cjs');
const { createGradingJobsRoutes } = require('../routes/gradingJobs.cjs');
const jobsLib = require('./jobs.cjs');
const timingLib = require('./timing.cjs');
const { chargeableCountOf } = require('./charge.cjs');
const { createHttpUtils } = require('../services/httpUtils.cjs');
const ledgerLib = require('../services/usageLedger.cjs');
const { createGeminiClient } = require('../services/geminiClient.cjs');
const { describeSingleJobsSwitch } = require('../services/serverConfig.cjs');
const {
  createFairUse, createGradingIdempotency, cachedReadJson, idempotencyAttemptId,
  IDEMPOTENCY_HEADER, CHECK_SOLUTION_PATH, GRADE_WORKSHEET_PATH, SURFACE_HEADER,
} = require('../services/fairUse.cjs');

const T0 = 1_800_000_000_000;
const tick = () => new Promise((r) => setImmediate(r));
const settle = async (n = 30) => { for (let i = 0; i < n; i += 1) await tick(); };
const until = async (cond, what, n = 600) => {
  for (let i = 0; i < n; i += 1) { if (cond()) return; await tick(); }
  assert.fail('timed out waiting for: ' + what);
};
const KEY = (n) => '5e1c2ba4-e88f-4d21-9a3b-' + String(n).padStart(12, '0');
const jobIdFor = (key, path = CHECK_SOLUTION_PATH) => idempotencyAttemptId(path, key);

/* ── A path-keyed Firestore with transactions (the jobs.suite.cjs model, trimmed) ── */
function memFirestore() {
  const docs = new Map();
  const versions = new Map();
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const bump = (p) => versions.set(p, (versions.get(p) || 0) + 1);
  const notFound = () => Object.assign(new Error('5 NOT_FOUND: No document to update'), { code: 5 });
  function applyFields(p, fields) {
    const d = clone(docs.get(p)) || {};
    for (const [k, v] of Object.entries(fields)) {
      const parts = k.split('.');
      let o = d;
      for (let i = 0; i < parts.length - 1; i += 1) {
        if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {};
        o = o[parts[i]];
      }
      o[parts[parts.length - 1]] = clone(v);
    }
    docs.set(p, d);
    bump(p);
  }
  function ref(parts) {
    const p = parts.join('/');
    return {
      path: p,
      collection: (name) => ({ doc: (id) => ref([...parts, name, id]) }),
      async get() { await tick(); return { exists: docs.has(p), data: () => clone(docs.get(p)) }; },
      async update(fields) { await tick(); if (!docs.has(p)) throw notFound(); applyFields(p, fields); },
      async set(data, opts) { await tick(); if (opts && opts.merge) applyFields(p, data); else { docs.set(p, clone(data)); bump(p); } },
    };
  }
  const db = {
    collection: (name) => ({ doc: (id) => ref([name, id]) }),
    async runTransaction(fn) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const seen = new Map();
        const queued = [];
        const tx = {
          async get(r) { await tick(); seen.set(r.path, versions.get(r.path) || 0); return { exists: docs.has(r.path), data: () => clone(docs.get(r.path)) }; },
          set(r, data, opts) { queued.push(['set', r, data, opts]); return tx; },
          update(r, fields) { queued.push(['update', r, fields]); return tx; },
          delete(r) { queued.push(['delete', r]); return tx; },
        };
        const result = await fn(tx);
        await tick();
        if ([...seen].some(([p, v]) => (versions.get(p) || 0) !== v)) continue;
        for (const [op, r] of queued) if (op === 'update' && !docs.has(r.path)) throw notFound();
        for (const [op, r, data, opts] of queued) {
          if (op === 'set') { if (opts && opts.merge) applyFields(r.path, data); else { docs.set(r.path, clone(data)); bump(r.path); } }
          else if (op === 'update') applyFields(r.path, data);
          else { docs.delete(r.path); bump(r.path); }
        }
        return result;
      }
      throw new Error('transaction contention');
    },
  };
  return { db, docs };
}

function pipeRes() {
  const res = new EventEmitter();
  res.statusCode = 0;
  res.headers = {};
  res.body = null;
  res.headersSent = false;
  res.writeHead = (status, headers) => { res.statusCode = status; res.headers = { ...res.headers, ...(headers || {}) }; res.headersSent = true; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.end = function end(chunk) {
    res.body = chunk === undefined ? null : String(chunk);
    setImmediate(() => res.emit('finish'));
  };
  return res;
}

/* ── The stubbed model (a callGemini), one question at a time; calls can be HELD or FAIL ── */
function stubModel({ verdict = 'correct', failWith } = {}) {
  const calls = [];
  const holds = [];
  let holdNext = null;
  async function callGemini(model, contents, cfg) {
    calls.push({ model, attempt: cfg.attempt, timeoutMs: cfg.timeoutMs, deadlineAt: cfg.deadlineAt, chunkKey: cfg.chunkKey });
    if (holdNext && holdNext(cfg)) await new Promise((resolve) => holds.push(resolve));
    const failure = failWith ? failWith(cfg) : null;
    if (failure) throw failure;
    return { text: JSON.stringify(replyFor(verdict)), raw: { candidates: [{ finishReason: 'STOP' }] } };
  }
  return {
    callGemini, calls,
    holdWhen(pred) { holdNext = pred; },
    held: () => holds.length,
    releaseAll() { holdNext = null; while (holds.length) holds.shift()(); },
  };
}

function replyFor(verdict, qNumber = 1, marks = 3) {
  if (verdict === 'unread') return { results: [{ qNumber, couldNotRead: true, note: 'Could not read this answer.' }] };
  const ok = verdict === 'correct';
  return {
    results: [{
      qNumber, couldNotRead: false, addressesQuestion: 'yes', finalAnswerCorrect: ok,
      annotatedSteps: [{ description: 'Answer', studentWork: 'x = 7 so the answer is 7', status: ok ? 'correct' : 'incorrect',
        marksAwarded: ok ? marks : 0, marksDeducted: ok ? 0 : marks, teacherAnnotation: ok ? '✓ Correct.' : '× Wrong.', mistakeType: ok ? null : 'calculation' }],
      teacherNote: 'A clear answer.',
    }],
    summary: '',
  };
}

const TYPED = { question: 'Solve 2x + 3 = 17 for x, showing each step.', marks: 3, subject: 'Maths', topic: 'Linear Equations', textAnswer: 'x = 7 so the answer is 7', acceptsV2: true };
const PHOTO = { question: 'Solve 2x + 3 = 17 for x, showing each step.', marks: 3, subject: 'Maths', topic: 'Linear Equations', imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', imageMimeType: 'image/png', acceptsV2: true };
const MCQ = { question: 'Which of these is a prime number? (a) 4 (b) 6 (c) 7 (d) 9', marks: 1, subject: 'Maths', topic: 'Real Numbers', textAnswer: '(c) 7',
  section: 'A', format: 'MCQ', answer: '7', options: ['4', '6', '7', '9'], acceptsV2: true };

/**
 * index.cjs's POST pipeline in-process for /api/check-solution: idempotency → fair use → the handler,
 * inside a request context bound to the uid. `poll` calls the poll route with Bearer = uid.
 */
function harness({ gradingJobsOn = true, singleJobsOn = true, tier = 'trial', model = stubModel(), callGemini, maxInFlight, jobTimingFor, solutionCache, extraDeps = {} } = {}) {
  const fs = memFirestore();
  const clock = { now: T0 };
  const trialWrites = [];
  const ledger = {
    async readDays(uid, keys) { return new Map(keys.map((k) => [k, {}])); },
    recordTrialUse(uid, counts) { trialWrites.push({ uid, counts }); return null; },
  };
  const { sendJson } = createHttpUtils('*');
  const rawRead = async (req) => req.__payload;
  const idem = createGradingIdempotency({ resolveFirestore: () => ({ db: fs.db }), now: () => clock.now, corsOrigin: '*' });
  const fairUse = createFairUse({
    tierOf: async () => tier, ledger, env: {}, now: () => clock.now,
    readJson: rawRead, resolveFirestore: () => ({ db: fs.db }), sendJson,
  });
  const commits = [];
  const jobs = jobsLib.createGradingJobs({
    resolveFirestore: () => ({ db: fs.db }), now: () => clock.now, maxInFlight,
    commitDeferred: (d, n) => { commits.push({ deferred: d, graded: n }); return fairUse.commitDeferred(d, n); },
  });
  const route = createCheckSolutionRoute({
    sendJson, readJson: cachedReadJson(rawRead), callGemini: callGemini || model.callGemini,
    GEMINI_MODEL: 'test-model', ACTIVE_PROVIDER: 'test', isStubMode: () => false,
    extractJsonObjectFromText: (t) => { try { return JSON.parse(t); } catch { return null; } },
    buildGeminiImagePart: (a) => ({ inlineData: { mimeType: a && a.mimeType, data: a && a.base64 } }),
    validateMentorImagePayload: () => ({ ok: true }),
    makeFenceNonce: () => 'testnonce', telemetry: { increment() {} },
    GRADING_JOBS: gradingJobsOn, GRADING_SINGLE_JOBS: singleJobsOn, gradingJobs: jobs,
    ...(jobTimingFor ? { jobTimingFor } : {}),
    ...(solutionCache ? { solutionCache } : {}),
    ...extraDeps,
  });
  const pollRoutes = createGradingJobsRoutes({
    sendJson, gradingJobs: jobs, now: () => clock.now,
    verifiedCaller: { resolveVerifiedUid: async (req) => String((req.headers && req.headers.authorization) || '').replace(/^Bearer /, '') },
  });
  let handlerRuns = 0;
  async function submit({ key, uid = 'stu-1', prefer = true, payload, surface = 'check-improve', path = CHECK_SOLUTION_PATH } = {}) {
    const headers = { [SURFACE_HEADER]: surface };
    if (key) headers[IDEMPOTENCY_HEADER] = key;
    if (prefer) headers.prefer = 'respond-async';
    const req = { headers, __payload: JSON.parse(JSON.stringify(payload)) };
    const res = pipeRes();
    await ledgerLib.runWithRequestContext(async () => {
      ledgerLib.bindRequestUid(uid, path);
      const step = await idem.begin(req, res, path, uid);
      if (step && step.replay) return idem.replay(res, step.replay);
      if (await fairUse.applyToRequest(req, res, path, uid)) return undefined;
      handlerRuns += 1;
      return path === CHECK_SOLUTION_PATH ? route.handleCheckSolution(req, res) : route.handleGradeWorksheet(req, res);
    });
    await settle();
    return res;
  }
  async function poll(jobId, { uid = 'stu-1' } = {}) {
    const res = pipeRes();
    await pollRoutes.handlePoll({ headers: { authorization: 'Bearer ' + uid } }, res, jobId);
    let json = null;
    try { json = JSON.parse(res.body); } catch { /* not json */ }
    return { status: res.statusCode, headers: res.headers, body: res.body, json };
  }
  const recordOf = (uid, jobId) => {
    const d = fs.docs.get('gradingResults/' + uid + '/attempts/' + jobId);
    return d ? JSON.parse(JSON.stringify(d)) : null;
  };
  const doneOf = (jobId) => () => { const r = recordOf('stu-1', jobId); return Boolean(r && r.job && r.job.state === 'done'); };
  return { fs, clock, trialWrites, commits, jobs, route, model, submit, poll, recordOf, doneOf, handlerRuns: () => handlerRuns };
}

/** The `final` bytes of a done job, exactly as stored (the poll splices them in byte for byte). */
function finalBytesOf(h, jobId) {
  return h.recordOf('stu-1', jobId).job.final;
}

/* ═════════════════════════ IDENTITY · the model request on the wire ═════════════════════════ */
// The REAL geminiClient builds the HTTP body (buildBody); globalThis.fetch is stubbed to capture it. The same
// check is graded once synchronously (no Prefer) and once as a job, and every captured request body — the URL
// and the exact bytes — must match. GRADING_MODEL + GRADING_THINKING_BUDGET are set, so the thinking config on
// the wire is compared too (it must not change: thinking is what costs time, and capping it costs accuracy).
function wireCapture() {
  const seen = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    seen.push({ url: String(url), body: String(opts.body) });
    const envelope = {
      candidates: [{ content: { parts: [{ text: JSON.stringify(replyFor('correct', 1, 3)) }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 7, totalTokenCount: 22 },
    };
    return { ok: true, status: 200, statusText: 'OK', headers: { get: () => null }, text: async () => JSON.stringify(envelope) };
  };
  return { seen, restore: () => { globalThis.fetch = original; } };
}

function realGemini() {
  return createGeminiClient({
    GEMINI_API_KEY: 'test-key', HAS_REPLIT_PROXY: false, REPLIT_GEMINI_BASE_URL: '', REPLIT_GEMINI_API_KEY: '',
    DIRECT_GEMINI_API_KEY: 'test-key', GEMINI_TUTOR_MODEL: 'test-model', GEMINI_TIMEOUT_MS: 10000, telemetry: { increment() {} },
  });
}

for (const [label, payload, withCache] of [
  ['typed answer', TYPED, false],
  ['photo answer', PHOTO, false],
  ['scheme-first cache (a stored marking scheme reaches the prompt)', TYPED, true],
  ['objective MCQ (bank key + options: the clamp path)', MCQ, false],
]) {
  test('GRADE-SINGLE-JOB-1 IDENTITY · ' + label + ' — the model request is byte-identical on the sync path and the job path, and the job final is the sync body', async () => {
    const wire = wireCapture();
    try {
      const cacheCalls = [];
      const solutionCache = withCache ? {
        async getOrCreateModelSolution(fields) {
          cacheCalls.push(JSON.parse(JSON.stringify(fields)));
          return { schemeSteps: ['Step 1: 2x = 14 [1]', 'Step 2: x = 7 [1]', 'Answer: x = 7 [1]'], fromCache: true, hash: 'abcdef0123456789' };
        },
      } : undefined;
      const h = harness({
        callGemini: realGemini().callGemini, solutionCache,
        extraDeps: { GRADING_MODEL: 'gemini-grading-test', GRADING_THINKING_BUDGET: 8192 },
      });
      // (1) synchronous: no Prefer header
      const sync = await h.submit({ key: KEY(100), prefer: false, payload });
      assert.equal(sync.statusCode, 200, sync.body);
      const syncWire = wire.seen.splice(0);
      assert.ok(syncWire.length >= 1, 'the sync grade reached the model');
      // (2) the same check as a job
      const res = await h.submit({ key: KEY(101), payload });
      assert.equal(res.statusCode, 202, res.body);
      const { jobId } = JSON.parse(res.body);
      await until(h.doneOf(jobId), 'job done');
      const jobWire = wire.seen.splice(0);

      assert.deepEqual(jobWire, syncWire, 'the URL and the exact request bytes are identical');
      const sent = JSON.parse(syncWire[0].body);
      assert.deepEqual(sent.generationConfig.thinkingConfig, { thinkingBudget: 8192 }, 'thinking config unchanged and present on both');
      assert.match(syncWire[0].url, /gemini-grading-test/, 'the same grading model on both');
      if (withCache) {
        assert.equal(cacheCalls.length, 2, 'the scheme-first cache was asked on both paths');
        assert.deepEqual(cacheCalls[1], cacheCalls[0], 'with the same fields');
        assert.ok(syncWire[0].body.includes('2x = 14'), 'the stored scheme is in the prompt');
      }
      // the job's final is byte-identical to the synchronous 200 body
      assert.equal(finalBytesOf(h, jobId), sync.body, 'final bytes === sync body bytes');
      // and the done poll hands it over unchanged
      const p = await h.poll(jobId);
      assert.equal(p.status, 200);
      assert.equal(JSON.stringify(p.json.final), sync.body);
      // charging: one trial check each — the same rule on both paths
      await settle();
      assert.deepEqual(h.trialWrites, [{ uid: 'stu-1', counts: { checks: 1 } }, { uid: 'stu-1', counts: { checks: 1 } }]);
    } finally {
      wire.restore();
    }
  });
}

/* ═════════════════════════ 1 · happy path ═════════════════════════ */
test('GRADE-SINGLE-JOB-1 PIN 1 · a check becomes a 1-question job: the 202 charges nothing, done charges 1 exactly once', async () => {
  const h = harness();
  h.model.holdWhen(() => true);
  const res = await h.submit({ key: KEY(1), payload: TYPED });
  assert.equal(res.statusCode, 202, res.body);
  const body = JSON.parse(res.body);
  assert.equal(body.jobId, jobIdFor(KEY(1)));
  assert.equal(body.total, 1);
  assert.equal(body.state, 'running');
  assert.equal(body.pollPath, '/api/grade-worksheet/jobs/' + body.jobId);
  assert.equal(chargeableCountOf(res), 0);
  await settle();
  assert.deepEqual(h.trialWrites, [], 'nothing spent at submit');
  const rec = h.recordOf('stu-1', body.jobId);
  assert.deepEqual(rec.job.meta, [{ qNumber: 1, totalMarks: 3 }]);
  assert.deepEqual(rec.job.deferred, { uid: 'stu-1', tier: 'trial', surface: 'check-improve', commit: { checks: 1 } });
  // mid-flight poll: running, no rows yet
  const mid = await h.poll(body.jobId);
  assert.equal(mid.json.state, 'running');
  assert.equal(mid.json.done, 0);
  h.model.releaseAll();
  await until(h.doneOf(body.jobId), 'job done');
  await settle();
  const done = await h.poll(body.jobId);
  assert.equal(done.json.state, 'done');
  assert.equal(done.json.results.length, 1);
  assert.equal(done.json.results[0].final, true);
  assert.equal(done.json.final.ok, true);
  assert.equal(done.json.final.marksAwarded, 3);
  assert.equal(done.json.final.totalMarks, 3);
  assert.equal(done.json.final.couldNotRead, false, 'the v2 single body');
  assert.equal(done.headers['X-Grading-Model'], 'test-model');
  assert.deepEqual(h.trialWrites, [{ uid: 'stu-1', counts: { checks: 1 } }], 'charged once, at the end');
  assert.equal(h.commits.length, 1);
  // polls never charge
  for (let i = 0; i < 3; i += 1) await h.poll(body.jobId);
  await settle();
  assert.equal(h.trialWrites.length, 1);
  // ONE model call, with the job's per-call cap (120 s), never the synchronous single deadline
  assert.equal(h.model.calls.length, 1);
  assert.ok(h.model.calls[0].timeoutMs <= timingLib.JOB_PER_CALL_MS && h.model.calls[0].timeoutMs > timingLib.MAX_SINGLE_QUESTION_DEADLINE_MS,
    'first call capped at JOB_PER_CALL_MS (got ' + h.model.calls[0].timeoutMs + ')');
});

/* ═════════════════════════ 2 · not graded → not charged ═════════════════════════ */
test('GRADE-SINGLE-JOB-1 PIN 2 · an answer the grader could not read is "not graded" and charged 0 — as on the sync path', async () => {
  const h = harness({ model: stubModel({ verdict: 'unread' }) });
  const sync = await h.submit({ key: KEY(20), prefer: false, payload: TYPED });
  assert.equal(sync.statusCode, 200);
  const res = await h.submit({ key: KEY(21), payload: TYPED });
  const { jobId } = JSON.parse(res.body);
  await until(h.doneOf(jobId), 'job done');
  await settle();
  assert.equal(finalBytesOf(h, jobId), sync.body);
  assert.equal(JSON.parse(sync.body).couldNotRead, true);
  assert.deepEqual(h.trialWrites, [], 'neither path charged');
  assert.equal(h.recordOf('stu-1', jobId).job.chargedCount, 0);
});

/* ═════════════════════════ 3 · idempotent replay ═════════════════════════ */
test('GRADE-SINGLE-JOB-1 PIN 3 · a re-sent submit (same key) replays the stored 202 — no second job, no second grade, no second charge', async () => {
  const h = harness();
  h.model.holdWhen(() => true);
  const res = await h.submit({ key: KEY(3), payload: PHOTO });
  const { jobId } = JSON.parse(res.body);
  await until(() => { const r = h.recordOf('stu-1', jobId); return r && r.state === 'done'; }, 'the 202 stored for replay');
  const again = await h.submit({ key: KEY(3), payload: PHOTO });
  assert.equal(again.statusCode, 202);
  assert.equal(again.headers['Idempotent-Replayed'], 'true');
  assert.equal(JSON.parse(again.body).jobId, jobId);
  assert.equal(h.handlerRuns(), 1);
  h.model.releaseAll();
  await until(h.doneOf(jobId), 'job done');
  const third = await h.submit({ key: KEY(3), payload: PHOTO });
  assert.equal(JSON.parse(third.body).jobId, jobId, 'still the same job after it finished');
  await settle();
  assert.equal(h.model.calls.length, 1, 'graded once');
  assert.deepEqual(h.trialWrites, [{ uid: 'stu-1', counts: { checks: 1 } }], 'charged once');
});

/* ═════════════════════════ 4 · timeout → re-split budget; total timeout → failure, 0 ═════════════════════════ */
const timeoutErr = () => Object.assign(new Error('Gemini request timed out after 120000ms'), { status: 504 });

test('GRADE-SINGLE-JOB-1 PIN 4a · a first call that times out is retried once on the abort-retry budget (not the 80/110 s wall) and the check is graded', async () => {
  const h = harness({ model: stubModel({ failWith: (cfg) => (cfg.attempt === 1 ? timeoutErr() : null) }) });
  const res = await h.submit({ key: KEY(40), payload: TYPED });
  const { jobId } = JSON.parse(res.body);
  await until(h.doneOf(jobId), 'job done');
  await settle();
  const calls = h.model.calls;
  assert.equal(calls.length, 2);
  assert.equal(calls[0].attempt, 1);
  assert.equal(calls[1].attempt, 2);
  assert.ok(calls[1].timeoutMs > timingLib.JOB_PER_CALL_MS && calls[1].timeoutMs <= timingLib.JOB_ABORT_RETRY_PER_CALL_MS,
    'the retry gets the abort-retry per-call budget (got ' + calls[1].timeoutMs + ')');
  assert.equal(calls[1].chunkKey, calls[0].chunkKey, 'a one-question chunk is retried as itself');
  const final = JSON.parse(finalBytesOf(h, jobId));
  assert.equal(final.ok, true);
  assert.equal(final.marksAwarded, 3);
  assert.deepEqual(h.trialWrites, [{ uid: 'stu-1', counts: { checks: 1 } }]);
});

test('GRADE-SINGLE-JOB-1 PIN 4b · when every attempt times out, the final is the synchronous failure copy and nothing is charged', async () => {
  const h = harness({ model: stubModel({ failWith: () => timeoutErr() }) });
  const res = await h.submit({ key: KEY(41), payload: TYPED });
  const { jobId } = JSON.parse(res.body);
  await until(h.doneOf(jobId), 'job done');
  await settle();
  assert.equal(finalBytesOf(h, jobId), JSON.stringify({ ok: false, error: 'Failed to evaluate solution. Please try again.' }));
  assert.deepEqual(h.trialWrites, []);
  assert.equal(h.recordOf('stu-1', jobId).job.chargedCount, 0);
});

/* ═════════════════════════ 5 · drain ═════════════════════════ */
test('GRADE-SINGLE-JOB-1 PIN 5 · a redeploy drain (interruptAll) ends a running check as interrupted, charged 0; its late finish charges nothing', async () => {
  const h = harness();
  h.model.holdWhen(() => true);
  const res = await h.submit({ key: KEY(5), payload: TYPED });
  const { jobId } = JSON.parse(res.body);
  await until(() => h.model.held() === 1, 'the call is in flight');
  assert.equal(h.jobs.stats().live, 1, 'the drain sees the live check (gracefulDrain waits on stats().live)');
  assert.equal(await h.jobs.interruptAll('shutdown'), 1);
  const p = await h.poll(jobId);
  assert.equal(p.json.state, 'interrupted');
  assert.equal(p.json.results.length, 1);
  assert.equal(p.json.results[0].notGraded, 'interrupted');
  h.model.releaseAll();
  await settle(60);
  assert.equal(h.recordOf('stu-1', jobId).job.state, 'interrupted', 'the late finish does not overwrite it');
  assert.deepEqual(h.trialWrites, [], 'never charged');
  assert.equal(h.commits.length, 1);
  assert.equal(h.commits[0].graded, 0);
});

/* ═════════════════════════ 6 · synchronous whenever a condition fails ═════════════════════════ */
test('GRADE-SINGLE-JOB-1 PIN 6 · switch off, GRADING_JOBS off, no idempotency claim, legacy auto-detect or a v1 client → synchronous, byte-identical', async () => {
  const base = await harness({ singleJobsOn: false }).submit({ key: KEY(60), prefer: false, payload: TYPED });
  assert.equal(base.statusCode, 200);
  const cases = [
    ['GRADING_SINGLE_JOBS off', { singleJobsOn: false }, { key: KEY(61) }, TYPED],
    ['GRADING_JOBS off', { gradingJobsOn: false }, { key: KEY(62) }, TYPED],
    ['no Idempotency-Key (no claim: e.g. the signed-out free check)', {}, {}, TYPED],
  ];
  for (const [label, hOpts, sOpts, payload] of cases) {
    const h = harness(hOpts);
    const r = await h.submit({ ...sOpts, payload });
    assert.equal(r.statusCode, 200, label);
    assert.equal(r.body, base.body, label + ': byte-identical to a request that never asked');
    assert.equal(h.jobs.stats().live, 0, label);
  }
  // a v1 (no acceptsV2) client and the legacy auto-detect read stay synchronous
  for (const [label, payload] of [['v1 client', { ...TYPED, acceptsV2: false }], ['auto-detect', { ...TYPED, detectMarks: true }]]) {
    const h = harness();
    const r = await h.submit({ key: KEY(label.length + 70), payload });
    assert.equal(r.statusCode, 200, label);
    assert.equal(h.jobs.stats().live, 0, label);
  }
});

/* ═════════════════════════ 7 · the single lane ═════════════════════════ */
test('GRADE-SINGLE-JOB-1 PIN 7 · a check runs at once even with four papers grading; papers keep their own cap of 4', async () => {
  const h = harness();
  h.model.holdWhen(() => true);
  const paper = (n) => ({ worksheetId: 'ws-' + n, subject: 'Maths', acceptsV2: true,
    questions: [1, 2].map((q) => ({ qNumber: q, marks: 2, questionText: 'Paper ' + n + ' question ' + q + ': solve x + 1 = 3.', textAnswer: 'x = 2 is the answer here' })) });
  const states = [];
  for (let i = 0; i < 5; i += 1) {
    const r = await h.submit({ key: KEY(700 + i), payload: paper(i), path: GRADE_WORKSHEET_PATH });
    assert.equal(r.statusCode, 202, r.body);
    states.push(JSON.parse(r.body).state);
  }
  assert.deepEqual(states, ['running', 'running', 'running', 'running', 'queued'], 'the paper lane is unchanged');
  const single = await h.submit({ key: KEY(710), payload: TYPED });
  assert.equal(single.statusCode, 202);
  assert.equal(JSON.parse(single.body).state, 'running', 'the check does not wait behind papers');
  assert.equal(h.jobs.stats().running, 5);
  assert.equal(h.jobs.stats().queued, 1);
  h.model.releaseAll();
  await until(h.doneOf(JSON.parse(single.body).jobId), 'single done');
  // the queued paper starts once a paper finishes, and every job ends
  await until(() => h.jobs.stats().live === 0, 'every job done', 2000);
});

test('GRADE-SINGLE-JOB-1 PIN 7b · the single lane has its own cap (MAX_INFLIGHT_SINGLE_JOBS) and queue', async () => {
  assert.equal(jobsLib.MAX_INFLIGHT_SINGLE_JOBS, 8);
  assert.equal(jobsLib.MAX_INFLIGHT_JOBS, 4, 'the paper cap is unchanged');
  const h = harness();
  h.model.holdWhen(() => true);
  const states = [];
  for (let i = 0; i < 9; i += 1) states.push(JSON.parse((await h.submit({ key: KEY(800 + i), payload: TYPED })).body).state);
  assert.deepEqual(states, [...Array(8).fill('running'), 'queued']);
  h.model.releaseAll();
  await until(() => h.jobs.stats().live === 0, 'all checks done', 2000);
  await settle();
  assert.equal(h.trialWrites.length, 9, 'each check charged once');
});

/* ═════════════════════════ 8 · the switch ═════════════════════════ */
test('GRADE-SINGLE-JOB-1 PIN 8 · GRADING_SINGLE_JOBS is OFF by default; only 1/on/true turns it on', () => {
  for (const env of [{}, { GRADING_SINGLE_JOBS: '' }, { GRADING_SINGLE_JOBS: '  ' }, null]) assert.equal(describeSingleJobsSwitch(env).on, false);
  for (const v of ['0', 'off', 'false', 'OFF']) assert.deepEqual(describeSingleJobsSwitch({ GRADING_SINGLE_JOBS: v }), { on: false, envNote: 'GRADING_SINGLE_JOBS=off' });
  for (const v of ['1', 'on', 'true', ' TRUE ']) assert.deepEqual(describeSingleJobsSwitch({ GRADING_SINGLE_JOBS: v }), { on: true, envNote: 'GRADING_SINGLE_JOBS=1' });
  for (const v of ['yes', 'banana', '2']) assert.equal(describeSingleJobsSwitch({ GRADING_SINGLE_JOBS: v }).on, false, v);
  // resolveConfig carries it to the route deps
  const saved = process.env.GRADING_SINGLE_JOBS;
  try {
    delete process.env.GRADING_SINGLE_JOBS;
    const { resolveConfig } = require('../services/serverConfig.cjs');
    assert.equal(resolveConfig().GRADING_SINGLE_JOBS, false);
    process.env.GRADING_SINGLE_JOBS = '1';
    assert.equal(resolveConfig().GRADING_SINGLE_JOBS, true);
  } finally {
    if (saved === undefined) delete process.env.GRADING_SINGLE_JOBS; else process.env.GRADING_SINGLE_JOBS = saved;
  }
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.cjs'), 'utf8');
  assert.match(src, /GRADING_SINGLE_JOBS: config\.GRADING_SINGLE_JOBS/, 'index.cjs hands the switch to the routes');
});
