'use strict';
// server/grading/jobs.suite.cjs — GRADING-JOBS-1 J1 (owner ruling 7): background grading jobs.
//
// Every test drives the REAL pieces in index.cjs's order — idempotency (createGradingIdempotency) →
// fair use (createFairUse.applyToRequest) → the grade-worksheet handler (createCheckSolutionRoute)
// → the job runner (grading/jobs.cjs) → the poll route (routes/gradingJobs.cjs) — over a path-keyed
// in-memory Firestore that honours transactions and fails update() on a missing document, exactly
// as Firestore does. Only the model is stubbed (and can be HELD, to look at a job mid-flight).
//
// The spec's pins (dispatch §4), each a test and ONE red mutation (report table):
//   1 no charge at submit · 2 charge = graded, exactly once, across retry/replay/restart ·
//   3 poll owner-scoped, unguessable, capped · 4 interrupted → the rest "not graded", charged 0 ·
//   5 switch OFF ⇒ sync byte-identical · 6 final:true rows never change at done ·
//   7 an erased record is never re-created · 8 the 5th job queues.
// Plus D12 (the premium meter's context follows a QUEUED job) and D14 (job timing).
// J3 (controller D71): the switch is ON by default; GRADING_JOBS=0/off/false is the kill switch
// (J3 SWITCH 1-6; the env → handler case reuses PIN 5's byte-identical sync proof).
//
// Named *.suite.cjs, NOT *.test.cjs: checkSolution.test.cjs requires it, so it runs in CI under
// test:server:check-solution (the matrix-wiring guard enumerates *.test.cjs files that need their own
// package.json script, and package.json is outside this lane — the J0 precedent).
// Run alone: node --test server/grading/jobs.suite.cjs

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
const {
  createFairUse, createGradingIdempotency, cachedReadJson, encodePaperPass, idempotencyAttemptId,
  IDEMPOTENCY_HEADER, GRADE_WORKSHEET_PATH, PAPER_HEADER, SURFACE_HEADER,
} = require('../services/fairUse.cjs');

const T0 = 1_800_000_000_000;
const SECRET = 'test-paper-secret-0123456789';
const tick = () => new Promise((r) => setImmediate(r));
const settle = async (n = 30) => { for (let i = 0; i < n; i += 1) await tick(); };
const until = async (cond, what, n = 400) => {
  for (let i = 0; i < n; i += 1) { if (cond()) return; await tick(); }
  assert.fail('timed out waiting for: ' + what);
};

/* ── A path-keyed Firestore: transactions (version check + re-run), update() fails on a missing doc ── */
function jobsFirestore() {
  const docs = new Map();
  const versions = new Map();
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const bump = (p) => versions.set(p, (versions.get(p) || 0) + 1);
  const notFound = () => Object.assign(new Error('5 NOT_FOUND: No document to update'), { code: 5 });
  const stats = { updates: 0, sets: 0 };
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
      async update(fields) { await tick(); if (!docs.has(p)) throw notFound(); stats.updates += 1; applyFields(p, fields); },
      async set(data, opts) { await tick(); stats.sets += 1; if (opts && opts.merge) applyFields(p, data); else { docs.set(p, clone(data)); bump(p); } },
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
        for (const [op, r, data, opts] of queued) if (op === 'update' && !docs.has(r.path)) throw notFound();
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
  return { db, docs, stats };
}

/** A response the pipeline can hook (writeHead/setHeader/end, `finish` and `close` like Node's). */
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

/* ── The stubbed model: per-question grades; any call can be HELD until released ── */
function stubModel({ marksOf, verdictOf, inventoryOf, onCall, failWith } = {}) {
  const calls = [];
  const holds = [];
  let holdNext = null;
  const ctxUids = [];
  async function callGemini(model, contents, cfg) {
    const ids = String((cfg && cfg.chunkKey) || '').split('+').filter(Boolean).map((k) => Number(k.slice(1)));
    calls.push({ ids, cfg: { timeoutMs: cfg.timeoutMs, attempt: cfg.attempt, chunkKey: cfg.chunkKey, deadlineAt: cfg.deadlineAt } });
    ctxUids.push(ledgerLib.currentUid());
    if (onCall) onCall(model); // J1b: what geminiClient does after a successful call (usageLedger.recordUsage)
    if (holdNext && holdNext(ids)) {
      await new Promise((resolve) => holds.push({ ids, resolve }));
    }
    // J3 round 5: a call can FAIL instead (e.g. the per-call abort geminiClient raises: HTTP 504).
    const failure = failWith ? failWith(ids, cfg) : null;
    if (failure) throw failure;
    const results = ids.map((id) => {
      const qNumber = id + 1;
      const marks = marksOf ? marksOf(id) : 2;
      const v = verdictOf ? verdictOf(id) : 'correct';
      if (v === 'unread') return { qNumber, couldNotRead: true, note: 'Could not read this answer.' };
      return {
        qNumber, couldNotRead: false, addressesQuestion: 'yes', finalAnswerCorrect: v === 'correct',
        annotatedSteps: [{ description: 'Answer', studentWork: 'Answer ' + qNumber + ': the working is shown here', status: v === 'correct' ? 'correct' : 'incorrect',
          marksAwarded: v === 'correct' ? marks : 0, marksDeducted: v === 'correct' ? 0 : marks, teacherAnnotation: v === 'correct' ? '✓ Correct.' : '× Wrong.', mistakeType: v === 'correct' ? null : 'calculation' }],
        teacherNote: 'Note ' + qNumber + '.',
      };
    });
    const reply = { results, summary: 'Summary of the paper.' };
    if (inventoryOf) reply.pageInventory = [{ page: 1, questionsSeen: inventoryOf(ids) }];
    return { text: JSON.stringify(reply), raw: { candidates: [{ finishReason: 'STOP' }] } };
  }
  return {
    callGemini, calls, ctxUids,
    holdWhen(pred) { holdNext = pred; },
    held: () => holds.length,
    releaseAll() { holdNext = null; while (holds.length) holds.shift().resolve(); },
  };
}

function typedPaper(n, { marks = 2 } = {}) {
  return {
    worksheetId: 'ws-test-1',
    subject: 'Maths',
    acceptsV2: true,
    questions: Array.from({ length: n }, (_, i) => ({ qNumber: i + 1, marks, questionText: 'Question ' + (i + 1) + ': solve the equation x + ' + i + ' = 10.', textAnswer: 'Answer ' + (i + 1) + ': the working is shown here' })),
  };
}

/**
 * index.cjs's pipeline in-process. `submit` runs idempotency → fair use → the handler inside a request
 * context bound to the uid (as index.cjs does); `poll` calls the poll route with a Bearer token = uid.
 */
function harness({ switchOn = true, tier = 'trial', model = stubModel(), maxInFlight, withJobs = true, jobTimingFor } = {}) {
  const fs = jobsFirestore();
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
    tierOf: async () => tier, ledger, env: { FAIR_USE_PAPER_SECRET: SECRET }, now: () => clock.now,
    readJson: rawRead, resolveFirestore: () => ({ db: fs.db }), sendJson,
  });
  const commits = [];
  const jobs = createJobsFor(fs, clock, fairUse, commits, maxInFlight);
  const route = createCheckSolutionRoute({
    sendJson, readJson: cachedReadJson(rawRead), callGemini: model.callGemini,
    GEMINI_MODEL: 'test-model', ACTIVE_PROVIDER: 'test', isStubMode: () => false,
    extractJsonObjectFromText: (t) => { try { return JSON.parse(t); } catch { return null; } },
    buildGeminiImagePart: (a) => ({ inlineData: { mimeType: a && a.mimeType, data: a && a.base64 } }),
    validateMentorImagePayload: () => ({ ok: true }),
    makeFenceNonce: () => 'testnonce', telemetry: { increment() {} },
    ...(withJobs ? { GRADING_JOBS: switchOn, gradingJobs: jobs } : {}),
    ...(jobTimingFor ? { jobTimingFor } : {}),
  });
  const pollRoutes = createGradingJobsRoutes({
    sendJson, gradingJobs: jobs, now: () => clock.now,
    verifiedCaller: { resolveVerifiedUid: async (req) => String((req.headers && req.headers.authorization) || '').replace(/^Bearer /, '') },
  });
  let handlerRuns = 0;
  async function submit({ key, uid = 'stu-1', prefer = true, payload, surface = 'check-improve', pass } = {}) {
    const headers = { [SURFACE_HEADER]: surface };
    if (key) headers[IDEMPOTENCY_HEADER] = key;
    if (prefer) headers.prefer = 'respond-async';
    if (pass) headers[PAPER_HEADER] = pass;
    const req = { headers, __payload: JSON.parse(JSON.stringify(payload)) };
    const res = pipeRes();
    await ledgerLib.runWithRequestContext(async () => {
      ledgerLib.bindRequestUid(uid, GRADE_WORKSHEET_PATH);
      const step = await idem.begin(req, res, GRADE_WORKSHEET_PATH, uid);
      if (step && step.replay) return idem.replay(res, step.replay);
      if (await fairUse.applyToRequest(req, res, GRADE_WORKSHEET_PATH, uid)) return undefined;
      handlerRuns += 1;
      return route.handleGradeWorksheet(req, res);
    });
    await settle();
    return res;
  }
  async function poll(jobId, { uid = 'stu-1', token, extraHeaders = {} } = {}) {
    const res = pipeRes();
    const auth = token === undefined ? uid : token;
    await pollRoutes.handlePoll({ headers: { ...extraHeaders, ...(auth ? { authorization: 'Bearer ' + auth } : {}) } }, res, jobId);
    let json = null;
    try { json = JSON.parse(res.body); } catch { /* not json */ }
    return { status: res.statusCode, headers: res.headers, body: res.body, json };
  }
  const recordOf = (uid, jobId) => {
    const d = fs.docs.get('gradingResults/' + uid + '/attempts/' + jobId);
    return d ? JSON.parse(JSON.stringify(d)) : null;
  };
  return { fs, clock, trialWrites, commits, jobs, route, model, submit, poll, recordOf, handlerRuns: () => handlerRuns, fairUse };
}

function createJobsFor(fs, clock, fairUse, commits, maxInFlight) {
  return jobsLib.createGradingJobs({
    resolveFirestore: () => ({ db: fs.db }), now: () => clock.now, maxInFlight,
    commitDeferred: (d, n) => { commits.push({ deferred: d, graded: n }); return fairUse.commitDeferred(d, n); },
  });
}

// J3: the interruption / charging / erasure pins below were written for a 10-question paper graded as
// TWO parts of 5 (questions 6-10 held). They pin semantics, not the chunk size, so they keep that plan
// explicitly; the production chunk size (timing.JOB_CHUNK_QUESTIONS) is pinned by the D14 / J3 test.
const TWO_PARTS_OF_5 = () => ({ wallMs: timingLib.JOB_WALL_MS, perCallMs: timingLib.JOB_PER_CALL_MS, chunkQuestions: 5 });
const KEY = (n) => '7f9c2ba4-e88f-4d21-9a3b-' + String(n).padStart(12, '0');
const jobIdFor = (key) => idempotencyAttemptId(GRADE_WORKSHEET_PATH, key);

/* ════════════════════════════════════ PIN 1 ════════════════════════════════════ */
test('J1 PIN 1 · NO CHARGE AT SUBMIT — a 202 spends 0 trial checks and does not mark the paper pass graded', async () => {
  // (a) a per-question surface (trial checks)
  const h = harness();
  h.model.holdWhen(() => true);
  const res = await h.submit({ key: KEY(1), payload: typedPaper(4) });
  assert.equal(res.statusCode, 202, res.body);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.jobId, jobIdFor(KEY(1)));
  assert.equal(body.total, 4);
  assert.equal(body.pollPath, '/api/grade-worksheet/jobs/' + body.jobId);
  assert.equal(chargeableCountOf(res), 0, 'the 202 records a chargeable count of 0');
  await settle();
  assert.deepEqual(h.trialWrites, [], 'nothing is spent at submit (the finish hook committed nothing)');
  // the deferred commit is persisted with the job, so a later reader can settle it
  const rec = h.recordOf('stu-1', body.jobId);
  assert.deepEqual(rec.job.deferred, { uid: 'stu-1', tier: 'trial', surface: 'check-improve', commit: { checks: 4 } });
  assert.equal(rec.job.charged, false);
  h.model.releaseAll();
  await until(() => h.recordOf('stu-1', body.jobId).job.state === 'done', 'job done');
  await settle();
  assert.deepEqual(h.trialWrites, [{ uid: 'stu-1', counts: { checks: 4 } }], 'charged once, at the end');

  // (b) a PAPER surface with a verified pass: the 202 never marks the pass graded; the end does
  const p = harness();
  p.model.holdWhen(() => true);
  const paper = { ...typedPaper(3), worksheetId: 'paper-key-1' };
  const pass = encodePaperPass(SECRET, 'stu-1', 'chapter-test', 'paper-key-1', T0 - 1000);
  const r2 = await p.submit({ key: KEY(2), payload: paper, surface: 'chapter-test', pass });
  assert.equal(r2.statusCode, 202);
  await settle();
  const passGraded = () => [...p.fs.docs.entries()].some(([k, d]) => k.startsWith('usageLedger/') && JSON.stringify(d).includes('gradedAtMs'));
  assert.equal(passGraded(), false, 'the 202 did not mark the paper pass graded');
  p.model.releaseAll();
  await until(() => p.recordOf('stu-1', jobIdFor(KEY(2))).job.state === 'done', 'paper job done');
  await until(passGraded, 'the pass is marked graded at the end');
  assert.deepEqual(p.trialWrites, [], 'a paper with a verified pass spends no per-question checks');
});

/* ════════════════════════════════════ PIN 2 ════════════════════════════════════ */
test('J1 PIN 2 · CHARGE = GRADED, EXACTLY ONCE — across a retried submit, polls and a late finish', async () => {
  const model = stubModel({ verdictOf: (id) => (id === 2 ? 'unread' : 'correct') });
  const h = harness({ model });
  const res = await h.submit({ key: KEY(3), payload: typedPaper(5) });
  assert.equal(res.statusCode, 202);
  const { jobId } = JSON.parse(res.body);
  await until(() => h.recordOf('stu-1', jobId).job.state === 'done', 'job done');
  await settle();
  assert.deepEqual(h.trialWrites, [{ uid: 'stu-1', counts: { checks: 4 } }], '5 requested, 1 unreadable → 4 charged');
  // a retried submit with the SAME key replays the stored 202 — no second job, no second charge
  const again = await h.submit({ key: KEY(3), payload: typedPaper(5) });
  assert.equal(again.statusCode, 202);
  assert.equal(again.headers['Idempotent-Replayed'], 'true');
  assert.equal(JSON.parse(again.body).jobId, jobId);
  assert.equal(h.handlerRuns(), 1, 'the handler ran once');
  // polls never charge
  for (let i = 0; i < 3; i += 1) assert.equal((await h.poll(jobId)).status, 200);
  await settle();
  assert.equal(h.trialWrites.length, 1);
  assert.equal(h.commits.length, 1);
  assert.equal(h.recordOf('stu-1', jobId).job.chargedCount, 4);
});

test('J1 PIN 2 · RESTART — a job declared interrupted is charged once; its worker finishing later charges nothing', async () => {
  const h = harness({ jobTimingFor: TWO_PARTS_OF_5 });
  h.model.holdWhen((ids) => ids.includes(9)); // the second chunk (questions 6-10) never returns in time
  const res = await h.submit({ key: KEY(4), payload: typedPaper(10) });
  const { jobId } = JSON.parse(res.body);
  await until(() => Object.keys(h.recordOf('stu-1', jobId).job.rows || {}).length === 5, 'first chunk rows');
  h.clock.now += timingLib.JOB_STALE_MS + 1; // the process "died": its heartbeat stopped
  const p1 = await h.poll(jobId);
  assert.equal(p1.json.state, 'interrupted');
  await settle();
  assert.deepEqual(h.trialWrites, [{ uid: 'stu-1', counts: { checks: 5 } }], 'the 5 final graded rows, once');
  h.model.releaseAll(); // the "dead" worker returns after all
  await settle(200);
  const p2 = await h.poll(jobId);
  assert.equal(p2.json.state, 'interrupted', 'an interrupted job stays interrupted');
  assert.equal(h.trialWrites.length, 1, 'the late finish charged nothing');
  assert.equal(h.commits.length, 1);
});

/* ════════════════════════════════════ PIN 3 ════════════════════════════════════ */
test('J1 PIN 3 · THE POLL — 401 without a token, 404 for another account / unknown / malformed id, 429 over the cap', async () => {
  const h = harness();
  const res = await h.submit({ key: KEY(5), uid: 'stu-1', payload: typedPaper(2) });
  const { jobId } = JSON.parse(res.body);
  await until(() => h.recordOf('stu-1', jobId).job.state === 'done', 'job done');
  // unguessable: the id is sha256(path|client key), 40 hex, never the key itself
  assert.match(jobId, /^[0-9a-f]{40}$/);
  assert.notEqual(jobId, KEY(5));
  const noToken = await h.poll(jobId, { token: '' });
  assert.equal(noToken.status, 401);
  // the attacker is signed in as stu-2 and names the victim in every attacker-controlled place
  const other = await h.poll(jobId, { uid: 'stu-2', extraHeaders: { 'x-lazytopper-uid': 'stu-1', 'x-user-id': 'stu-1' } });
  const unknown = await h.poll('0'.repeat(40), { uid: 'stu-1' });
  const malformed = await h.poll('../stu-1/attempts/' + jobId, { uid: 'stu-1' });
  assert.equal(other.status, 404, 'another account cannot read the job');
  assert.equal(other.body, unknown.body, 'and cannot tell it exists');
  assert.equal(malformed.status, 404);
  const own = await h.poll(jobId, { uid: 'stu-1' });
  assert.equal(own.status, 200);
  assert.equal(own.json.state, 'done');
  // the cap: 60 polls a minute per uid (5 used above by stu-1 incl. this one)
  let last;
  for (let i = 0; i < 60; i += 1) last = await h.poll(jobId, { uid: 'stu-3' });
  assert.equal(last.status, 404, 'stu-3 is under its own cap (404: not its job)');
  const capped = await h.poll(jobId, { uid: 'stu-3' });
  assert.equal(capped.status, 429);
  assert.ok(Number(capped.headers['Retry-After']) >= 1);
  h.clock.now += 60 * 1000;
  assert.equal((await h.poll(jobId, { uid: 'stu-3' })).status, 404, 'the window resets');
  // expired (24 h) → 404
  h.clock.now += 24 * 60 * 60 * 1000;
  assert.equal((await h.poll(jobId, { uid: 'stu-1' })).status, 404);
});

/* ════════════════════════════════════ PIN 4 ════════════════════════════════════ */
test('J1 PIN 4 · INTERRUPTED — final rows stay; every other question is notGraded "interrupted", charged 0', async () => {
  // A one-document paper. Question 2's own chunk lists it with only a too-short first line "(a)":
  // GRADED and chargeable on its own chunk, but not in the stable case → a PROVISIONAL row.
  const model = stubModel({
    inventoryOf: (ids) => ids.map((id) => ({ qNumber: id + 1, firstLine: id === 1 ? '(a)' : 'Answer ' + (id + 1) + ': the working is shown here' })),
  });
  const h = harness({ model, jobTimingFor: TWO_PARTS_OF_5 });
  h.model.holdWhen((ids) => ids.includes(9));
  const paper = { ...typedPaper(10), imageBase64: 'JVBERi0xLjQK', imageMimeType: 'application/pdf' };
  for (const q of paper.questions) q.textAnswer = '';
  const res = await h.submit({ key: KEY(6), payload: paper });
  const { jobId } = JSON.parse(res.body);
  await until(() => Object.keys(h.recordOf('stu-1', jobId).job.rows || {}).length === 5, 'first chunk rows');
  const running = await h.poll(jobId);
  assert.equal(running.json.state, 'running');
  const prov = running.json.results.filter((r) => r.final === false).map((r) => r.index);
  assert.deepEqual(prov, [1], 'question 2 is provisional (no quotable first line in its own chunk inventory)');
  assert.equal(running.json.results[1].marksAwarded, 2, 'its provisional row carries a grade');
  assert.equal(h.recordOf('stu-1', jobId).job.rows.q1.chargeable, true, 'and would be chargeable — were it final');
  h.clock.now += timingLib.JOB_STALE_MS + 1;
  const p = await h.poll(jobId);
  assert.equal(p.json.state, 'interrupted');
  assert.equal(p.json.results.length, 10);
  const interrupted = p.json.results.filter((r) => r.notGraded === 'interrupted').map((r) => r.index);
  assert.deepEqual(interrupted, [1, 5, 6, 7, 8, 9], 'the provisional row and the unfinished chunk');
  for (const r of p.json.results.filter((x) => x.notGraded === 'interrupted')) {
    assert.equal(r.couldNotRead, true);
    assert.equal(r.marksAwarded, 0);
    assert.equal(r.note, jobsLib.INTERRUPTED_NOTE);
  }
  await settle();
  assert.deepEqual(h.trialWrites, [{ uid: 'stu-1', counts: { checks: 4 } }], 'only the 4 FINAL graded rows are charged (not the provisional one)');
  h.model.releaseAll();
  await settle(200);
});

test('J1 PIN 4 · SIGTERM (best effort) — interruptAll ends a running job at once, final rows kept', async () => {
  const h = harness({ jobTimingFor: TWO_PARTS_OF_5 });
  h.model.holdWhen((ids) => ids.includes(9));
  const res = await h.submit({ key: KEY(7), payload: typedPaper(10) });
  const { jobId } = JSON.parse(res.body);
  await until(() => Object.keys(h.recordOf('stu-1', jobId).job.rows || {}).length === 5, 'first chunk rows');
  assert.equal(await h.jobs.interruptAll('shutdown'), 1);
  const rec = h.recordOf('stu-1', jobId);
  assert.equal(rec.job.state, 'interrupted');
  assert.equal(rec.job.interruptReason, 'shutdown');
  await settle();
  assert.deepEqual(h.trialWrites, [{ uid: 'stu-1', counts: { checks: 5 } }]);
  h.model.releaseAll();
  await settle(200);
  assert.equal(h.trialWrites.length, 1);
});

/* ════════════════════════════════════ PIN 5 ════════════════════════════════════ */
test('J1 PIN 5 · SWITCH OFF (or any missing condition) ⇒ the synchronous 200, BYTE-IDENTICAL', async () => {
  const baseline = await harness({ withJobs: false }).submit({ key: KEY(8), prefer: false, payload: typedPaper(4) });
  assert.equal(baseline.statusCode, 200);
  const cases = {
    'switch OFF, opt-in header': harness({ switchOn: false }).submit({ key: KEY(8), payload: typedPaper(4) }),
    'switch OFF, opt-in body': harness({ switchOn: false }).submit({ key: KEY(8), prefer: false, payload: { ...typedPaper(4), async: true } }),
    'switch ON, no opt-in': harness().submit({ key: KEY(8), prefer: false, payload: typedPaper(4) }),
    'switch ON, no Idempotency-Key': harness().submit({ payload: typedPaper(4) }),
  };
  const legacy = { ...typedPaper(4) };
  delete legacy.acceptsV2;
  const legacyBase = await harness({ withJobs: false }).submit({ key: KEY(8), prefer: false, payload: legacy });
  const legacyOn = await harness().submit({ key: KEY(8), payload: legacy });
  assert.equal(legacyOn.statusCode, 200);
  assert.equal(legacyOn.body, legacyBase.body, 'switch ON, no acceptsV2 → the legacy sync body');
  for (const [name, p] of Object.entries(cases)) {
    const r = await p;
    assert.equal(r.statusCode, 200, name);
    assert.equal(r.body, baseline.body, name + ': byte-identical to the no-jobs server');
  }
  // a paper over MAX_JOB_QUESTIONS is graded synchronously (its record could outgrow Firestore's cap)
  const big = await harness().submit({ key: KEY(13), payload: typedPaper(jobsLib.MAX_JOB_QUESTIONS + 1) });
  assert.equal(big.statusCode, 200, 'a ' + (jobsLib.MAX_JOB_QUESTIONS + 1) + '-question paper → sync');
  // the stored idempotency record of a sync grade carries no `job`
  const h = harness({ switchOn: false });
  await h.submit({ key: KEY(9), payload: typedPaper(2) });
  assert.equal(h.recordOf('stu-1', jobIdFor(KEY(9))).job, undefined);
});

/* ═══════════ J3 (controller D71) · the switch is ON BY DEFAULT; GRADING_JOBS is a kill switch ═══════════ */
const { describeGradingJobsSwitch, resolveGradingJobsSwitch, resolveConfig } = require('../services/serverConfig.cjs');
const UNRECOGNISED_NOTE = 'GRADING_JOBS=1(unrecognised value; use 0/off/false to turn jobs off)';
const switchCase = (env, on, envNote) => {
  assert.deepEqual(describeGradingJobsSwitch(env), { on, envNote }, JSON.stringify(env));
  assert.equal(resolveGradingJobsSwitch(env), on, 'resolveGradingJobsSwitch agrees: ' + JSON.stringify(env));
};

test('J3 SWITCH 1 · unset / empty / whitespace ⇒ ON (the new default), with no ENV_USED note', () => {
  for (const env of [{}, { GRADING_JOBS: undefined }, { GRADING_JOBS: '' }, { GRADING_JOBS: '   ' }, null]) switchCase(env, true, null);
});

test('J3 SWITCH 2 · "0" / "off" / "false" (trimmed, any case) ⇒ OFF, the kill switch', () => {
  for (const v of ['0', 'off', 'false', 'OFF', 'Off', 'FALSE', ' false ', '\t0\n', ' oFf ']) switchCase({ GRADING_JOBS: v }, false, 'GRADING_JOBS=off');
});

test('J3 SWITCH 3 · "1" / "on" / "true" (trimmed, any case) ⇒ ON', () => {
  for (const v of ['1', 'on', 'true', 'ON', 'True', ' 1 ', ' TRUE ']) switchCase({ GRADING_JOBS: v }, true, 'GRADING_JOBS=1');
});

test('J3 SWITCH 4 · any other value ⇒ ON (fail-open: a typo never silently turns jobs off) + an ENV_USED note', () => {
  for (const v of ['yes', 'no', '2', '00', 'disabled', 'of', 'offf', 'f', 'null']) switchCase({ GRADING_JOBS: v }, true, UNRECOGNISED_NOTE);
});

test('J3 SWITCH 5 · resolveConfig (what index.cjs serves) carries the switch and its ENV_USED note', () => {
  const saved = { ...process.env };
  const restore = () => {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  };
  const run = (value) => {
    if (value === undefined) delete process.env.GRADING_JOBS; else process.env.GRADING_JOBS = value;
    try { const c = resolveConfig(); return { on: c.GRADING_JOBS, notes: c.ENV_USED.filter((n) => n.startsWith('GRADING_JOBS')) }; } finally { restore(); }
  };
  assert.deepEqual(run(undefined), { on: true, notes: [] }, 'unset → ON, no note');
  assert.deepEqual(run(''), { on: true, notes: [] }, 'empty → ON, no note');
  assert.deepEqual(run(' Off '), { on: false, notes: ['GRADING_JOBS=off'] }, 'kill switch');
  assert.deepEqual(run('true'), { on: true, notes: ['GRADING_JOBS=1'] }, 'explicit on');
  assert.deepEqual(run('banana'), { on: true, notes: [UNRECOGNISED_NOTE] }, 'unrecognised → ON + note');
});

test('J3 SWITCH 6 · env → handler: a kill-switch value gives the synchronous 200 BYTE-IDENTICAL to the no-jobs server; every other value gives a 202 job', async () => {
  const baseline = await harness({ withJobs: false }).submit({ key: KEY(50), prefer: false, payload: typedPaper(4) });
  assert.equal(baseline.statusCode, 200);
  for (const v of ['0', 'off', 'false', ' OFF ']) {
    const r = await harness({ switchOn: resolveGradingJobsSwitch({ GRADING_JOBS: v }) }).submit({ key: KEY(50), payload: typedPaper(4) });
    assert.equal(r.statusCode, 200, JSON.stringify(v) + ' → sync');
    assert.equal(r.body, baseline.body, JSON.stringify(v) + ': byte-identical to the no-jobs server');
  }
  for (const env of [{}, { GRADING_JOBS: '' }, { GRADING_JOBS: '1' }, { GRADING_JOBS: 'on' }, { GRADING_JOBS: 'banana' }]) {
    const r = await harness({ switchOn: resolveGradingJobsSwitch(env) }).submit({ key: KEY(51), payload: typedPaper(4) });
    assert.equal(r.statusCode, 202, JSON.stringify(env) + ' → a job');
    assert.equal(JSON.parse(r.body).jobId, jobIdFor(KEY(51)));
  }
});

/* ════════════════════════════════════ PIN 6 ════════════════════════════════════ */
test('J1 PIN 6 · FINAL ROWS NEVER CHANGE AT DONE; done body == the synchronous body', async () => {
  const inventoryOf = (ids) => {
    // chunk A (ids 0-4) lists 1..5 except id 1, plus id 6's line; chunk B (5-9) lists 6..10 plus id 1.
    const own = ids.filter((id) => id !== 1).map((id) => ({ qNumber: id + 1, firstLine: 'Answer ' + (id + 1) + ': the working is shown here' }));
    if (ids.includes(5)) own.push({ qNumber: 2, firstLine: 'Answer 2: the working is shown here' });
    return own;
  };
  const doc = () => { const p = { ...typedPaper(10), imageBase64: 'JVBERi0xLjQK', imageMimeType: 'application/pdf' }; for (const q of p.questions) q.textAnswer = ''; return p; };
  const h = harness({ model: stubModel({ inventoryOf }) });
  const rowsSeen = [];
  const res = await h.submit({ key: KEY(10), payload: doc() });
  const { jobId } = JSON.parse(res.body);
  await until(() => {
    const rec = h.recordOf('stu-1', jobId);
    for (const [k, r] of Object.entries(rec.job.rows || {})) rowsSeen.push({ k, ...r });
    return rec.job.state === 'done';
  }, 'job done');
  const done = await h.poll(jobId);
  assert.equal(done.status, 200);
  assert.equal(done.headers['X-Grading-Model'], 'test-model');
  const final = done.json.final;
  let finals = 0;
  let provisional = 0;
  for (const r of rowsSeen) {
    const i = Number(r.k.slice(1));
    if (r.final) { finals += 1; assert.deepEqual(JSON.parse(r.json), final.results[i], 'final:true row ' + i + ' changed at done'); }
    else provisional += 1;
  }
  assert.ok(finals > 0 && provisional > 0, 'the paper exercised both kinds of row');
  // the provisional row DID change (it was judged on its own chunk's inventory only)
  const q2 = rowsSeen.find((r) => r.k === 'q1');
  assert.notDeepEqual(JSON.parse(q2.json), final.results[1]);
  assert.ok(done.body.endsWith(',"final":' + JSON.stringify(final) + '}'), 'final is spliced verbatim');
  // the done body's `final` == the synchronous 200 of the same paper, BYTE FOR BYTE, when both grade
  // with the same chunk plan (a 10-question paper is one sync call: the job is given one chunk of 10)
  const sync = await harness({ withJobs: false, model: stubModel({ inventoryOf }) }).submit({ key: KEY(12), prefer: false, payload: doc() });
  assert.equal(sync.statusCode, 200);
  const same = harness({ model: stubModel({ inventoryOf }), jobTimingFor: () => ({ wallMs: 180000, perCallMs: 120000, chunkQuestions: 10 }) });
  const sub = JSON.parse((await same.submit({ key: KEY(12), payload: doc() })).body);
  await until(() => same.recordOf('stu-1', sub.jobId).job.state === 'done', 'same-plan job done');
  const sameDone = await same.poll(sub.jobId);
  assert.ok(sameDone.body.endsWith(',"final":' + sync.body + '}'), 'job final bytes == sync 200 bytes');
  assert.deepEqual(done.json.results.map((r) => r.index), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.ok(done.json.results.every((r) => r.final === true));
});

/* ════════════════════════════════════ PIN 7 ════════════════════════════════════ */
test('J1 PIN 7 · ERASURE RACE — a record erased mid-job is never re-created, and nothing is charged', async () => {
  const h = harness({ jobTimingFor: TWO_PARTS_OF_5 });
  h.model.holdWhen((ids) => ids.includes(9));
  const res = await h.submit({ key: KEY(11), payload: typedPaper(10) });
  const { jobId } = JSON.parse(res.body);
  await until(() => Object.keys(h.recordOf('stu-1', jobId).job.rows || {}).length === 5, 'first chunk rows');
  h.fs.docs.delete('gradingResults/stu-1/attempts/' + jobId); // DPDP erasure of the account
  h.model.releaseAll();
  await settle(300);
  assert.equal(h.recordOf('stu-1', jobId), null, 'the erased record stays erased');
  assert.deepEqual(h.trialWrites, []);
  assert.equal((await h.poll(jobId)).status, 404);
});

/* ════════════════════════════════════ PIN 8 ════════════════════════════════════ */
test('J1 PIN 8 · PROCESS CAP — the 5th concurrent job waits "queued", and starts when a slot frees', async () => {
  const h = harness();
  h.model.holdWhen(() => true);
  const ids = [];
  for (let i = 0; i < 5; i += 1) {
    const r = await h.submit({ key: KEY(20 + i), payload: typedPaper(2) });
    assert.equal(r.statusCode, 202);
    ids.push(JSON.parse(r.body));
  }
  assert.deepEqual(ids.map((b) => b.state), ['running', 'running', 'running', 'running', 'queued']);
  assert.equal(h.recordOf('stu-1', ids[4].jobId).job.state, 'queued');
  assert.deepEqual(h.jobs.stats(), { running: 4, queued: 1, live: 5 });
  const queuedPoll = await h.poll(ids[4].jobId);
  assert.equal(queuedPoll.json.state, 'queued');
  assert.equal(queuedPoll.json.pollAfterMs, jobsLib.POLL_AFTER_MS);
  h.model.releaseAll();
  await until(() => ids.every((b) => h.recordOf('stu-1', b.jobId).job.state === 'done'), 'all five done');
  assert.equal(h.trialWrites.length, 5);
});

/* ════════════════════════ D12 · the premium meter follows a QUEUED job ════════════════════════ */
test('J1 D12 · a queued job runs in ITS submitter\'s request context (the premium meter charges the right student)', async () => {
  const h = harness({ tier: 'premium', maxInFlight: 1 });
  h.model.holdWhen(() => true);
  const a = JSON.parse((await h.submit({ key: KEY(30), uid: 'stu-A', payload: typedPaper(1) })).body);
  const b = JSON.parse((await h.submit({ key: KEY(31), uid: 'stu-B', payload: typedPaper(1) })).body);
  assert.equal(b.state, 'queued');
  h.model.releaseAll(); // A finishes; B starts from A's completion chain
  await until(() => h.recordOf('stu-B', b.jobId) && h.recordOf('stu-B', b.jobId).job.state === 'done', 'B done', 2000);
  assert.deepEqual(h.model.ctxUids, ['stu-A', 'stu-B'], 'each job\'s model call is metered to its own student');
  assert.equal(h.recordOf('stu-A', a.jobId).job.state, 'done');
  assert.deepEqual(h.recordOf('stu-A', a.jobId).job.deferred, { uid: 'stu-A', tier: 'premium', surface: 'check-improve', commit: null });
});

/* ════════════════ A-17 J1b METER-PRICE-1 · a background job is metered exactly like the sync path ════════════════ */
// MUTATION J1b-M5: run the job without its captured request context (jobs.cjs `inContext`) -> RED (async meters 0).
test('J1b (d) · a BACKGROUND job records the same meter cost and the same real spend as the synchronous grade, at the real gemini-3.8-flash price', async () => {
  // The suite clock T0 is 2027-01-15: the doubled 2027 list price applies ($1.50 / $7.50 per 1M).
  // One call: (1000 * 1.50 + (200 + 800) * 7.50) / 1M * 88 = Rs 0.792.
  const CALL = { model: 'gemini-3.8-flash', promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 800 };
  assert.ok(T0 >= require('../services/modelPrices.cjs').IST_2027_01_01_MS, 'precondition: the suite clock is in 2027');
  async function meterOf(prefer, key) {
    const writes = [];
    const ledger = ledgerLib.createUsageLedger({
      resolveFirestore: () => ({ db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ set: (d) => { writes.push(d); return Promise.resolve(); } }) }) }) }) }, FieldValue: { increment: (n) => n } }),
      telemetry: { increment() {} }, env: {}, now: () => T0,
    });
    const model = stubModel({ onCall: (m) => ledger.recordUsage({ ...CALL, model: m === 'test-model' ? CALL.model : m }) });
    const h = harness({ tier: 'premium', model });
    const res = await h.submit({ key: KEY(key), uid: 'stu-meter', payload: typedPaper(3), prefer });
    if (prefer) {
      assert.equal(res.statusCode, 202, 'the async path was taken');
      const { jobId } = JSON.parse(res.body);
      await until(() => h.recordOf('stu-meter', jobId) && h.recordOf('stu-meter', jobId).job.state === 'done', 'job done', 2000);
    } else {
      assert.equal(res.statusCode, 200, 'the synchronous path was taken');
    }
    await settle();
    const meter = writes.filter((w) => 'costMicroInr' in w);
    return {
      calls: model.calls.length,
      cost: meter.reduce((a, w) => a + (Number(w.costMicroInr) || 0), 0),
      spend: writes.reduce((a, w) => a + (Number(w[ledgerLib.LEDGER_SPEND_FIELD]) || 0), 0),
    };
  }
  const sync = await meterOf(false, 40);
  const job = await meterOf(true, 41);
  assert.equal(sync.calls, 1);
  assert.equal(job.calls, sync.calls, 'same number of model calls');
  assert.equal(sync.cost, 792000, 'sync: every question graded -> the full real cost on the premium meter');
  assert.equal(sync.spend, 792000, 'sync: the real spend');
  assert.equal(job.cost, sync.cost, 'background job: the SAME meter cost as the sync grade');
  assert.equal(job.spend, sync.spend, 'background job: the SAME real spend as the sync grade');
});

/* ════════════════════════ D14 · job timing (the synchronous timing unchanged) ════════════════════════ */
test('J1 D14 / J3 · a job grades in chunks of 8 with the J1 120 s per-call cap and 180 s wall (an aborted chunk: one retry at 180 s within 270 s); the sync path keeps 1 call / 45 s chunks', async () => {
  assert.deepEqual(timingLib.jobTiming(), { wallMs: 180000, perCallMs: 120000, chunkQuestions: 8, abortRetry: { perCallMs: 180000, wallMs: 270000 } },
    'J3 round 5 (cofounder ruling): J1 budget for every chunk; the larger budget only for the one retry of an aborted chunk');
  const h = harness();
  await h.submit({ key: KEY(40), payload: typedPaper(10) });
  await until(() => h.model.calls.length === 2, 'two job chunks');
  assert.deepEqual(h.model.calls.map((c) => c.ids.length).sort(), [5, 5], '10 questions → 2 chunks (≤ 8 each)');
  for (const c of h.model.calls) {
    assert.ok(c.cfg.timeoutMs > timingLib.DEFAULT_GRADING_CHUNK_TIMEOUT_MS, 'no 45 s first-attempt kill: ' + c.cfg.timeoutMs);
    assert.ok(c.cfg.timeoutMs <= timingLib.JOB_PER_CALL_MS);
  }
  const s = harness({ switchOn: false });
  await s.submit({ key: KEY(41), payload: typedPaper(10) });
  assert.equal(s.model.calls.length, 1, 'sync: a 10-question paper is ONE call (D43)');
  const s2 = harness({ switchOn: false });
  await s2.submit({ key: KEY(42), payload: typedPaper(12) });
  assert.deepEqual(s2.model.calls.map((c) => c.ids.length), [3, 3, 3, 3], 'sync: chunks of 3');
  for (const c of s2.model.calls) assert.ok(c.cfg.timeoutMs <= timingLib.DEFAULT_GRADING_CHUNK_TIMEOUT_MS, 'sync: 45 s first attempt');
  assert.equal(timingLib.normaliseTiming({}).deadlineMs, 80000, 'the sync request deadline is unchanged');
});

/* ═════════ J3 round 5 · RETRY ONLY WHAT ABORTED (cofounder ruling; FU-GRADING-ABORTS) ═════════
   Every job chunk keeps the J1 budget (120 s per call, 180 s wall). ONLY a chunk whose first call was
   ABORTED at that cap is retried, ONCE, WHOLE, at 180 s per call inside a 270 s wall; a second abort is
   today's honest "not graded" (timeout), and the charge counts graded questions only. An abort is what
   geminiClient raises at the per-call cap: HTTP 504. */
const abortError = () => Object.assign(new Error('Gemini request timed out after 120000ms'), { status: 504 });
const MARGIN = timingLib.GRADING_MARGIN_MS;
async function runJob(h, key, n = 10) {
  const res = await h.submit({ key: KEY(key), payload: typedPaper(n) });
  assert.equal(res.statusCode, 202, res.body);
  const { jobId } = JSON.parse(res.body);
  await until(() => h.recordOf('stu-1', jobId).job.state === 'done', 'job done', 2000);
  await settle();
  return (await h.poll(jobId)).json;
}

test('J3 R5 (a) · a chunk that is NOT aborted runs at the J1 budget (120 s cap, 180 s wall) and is never retried', async () => {
  const h = harness();
  const done = await runJob(h, 60);
  assert.equal(h.model.calls.length, 2, 'two chunks, two calls, no retry');
  const d0 = h.model.calls[0].cfg.deadlineAt;
  for (const c of h.model.calls) {
    assert.equal(c.cfg.attempt, 1);
    assert.equal(c.cfg.timeoutMs, 120000, 'the J1 per-call cap');
    assert.equal(c.cfg.deadlineAt, d0, 'one wall for every first call');
  }
  assert.ok(d0 - Date.now() <= 180000 - MARGIN, 'the J1 180 s wall, not 270 s');
  assert.ok(done.final.results.every((r) => !r.notGraded));
  assert.deepEqual(h.trialWrites, [{ uid: 'stu-1', counts: { checks: 10 } }]);
  // A chunk that FAILED without an abort (HTTP 503) keeps the unchanged path: one retry at the J1 budget.
  const e = harness({ model: stubModel({ failWith: (ids, cfg) => (ids.includes(9) && cfg.attempt === 1 ? Object.assign(new Error('overloaded'), { status: 503 }) : null) }) });
  await runJob(e, 61);
  const retry = e.model.calls.filter((c) => c.cfg.attempt === 2);
  assert.equal(retry.length, 1);
  assert.ok(retry[0].cfg.timeoutMs <= 120000, 'an HTTP-error retry stays at the J1 cap: ' + retry[0].cfg.timeoutMs);
  assert.equal(retry[0].cfg.deadlineAt, e.model.calls[0].cfg.deadlineAt, 'and inside the J1 wall');
});

test('J3 R5 (b) · an ABORTED chunk is retried exactly ONCE, whole, at 180 s per call within the 270 s wall', async () => {
  const h = harness({ model: stubModel({ failWith: (ids, cfg) => (ids.includes(9) && cfg.attempt === 1 ? abortError() : null) }) });
  const done = await runJob(h, 62);
  assert.equal(h.model.calls.length, 3, '2 first calls + 1 retry (no one-question-per-call split)');
  const first = h.model.calls.find((c) => c.ids.includes(9) && c.cfg.attempt === 1);
  const retry = h.model.calls.filter((c) => c.cfg.attempt === 2);
  assert.equal(retry.length, 1, 'exactly one retry');
  assert.deepEqual(retry[0].ids, first.ids, 'the WHOLE chunk, the same request');
  assert.equal(retry[0].cfg.timeoutMs, 180000, 'the larger per-call cap');
  assert.equal(retry[0].cfg.deadlineAt - first.cfg.deadlineAt, 90000, 'the 270 s wall (J1 wall + 90 s)');
  assert.ok(done.final.results.every((r) => !r.notGraded), 'every question graded');
  assert.deepEqual(h.trialWrites, [{ uid: 'stu-1', counts: { checks: 10 } }]);
  // The retry's cap is the time left before the abort-retry wall when that is under its 180 s cap
  // (a test wall of 100 s stands in for a retry that starts late in a real 270 s job).
  const w = harness({
    model: stubModel({ failWith: (ids, cfg) => (ids.includes(9) && cfg.attempt === 1 ? abortError() : null) }),
    jobTimingFor: () => ({ ...timingLib.jobTiming(), abortRetry: { perCallMs: 180000, wallMs: 100000 } }),
  });
  await runJob(w, 63);
  const wr = w.model.calls.find((c) => c.cfg.attempt === 2);
  assert.ok(wr.cfg.timeoutMs <= 100000 - MARGIN && wr.cfg.timeoutMs > 90000, 'min(180 s, time left before the wall): ' + wr.cfg.timeoutMs);
  assert.equal(wr.cfg.deadlineAt - w.model.calls[0].cfg.deadlineAt, 100000 - 180000, 'the retry runs against the abort-retry wall');
});

test('J3 R5 (c)+(d) · a SECOND abort ends "not graded" (timeout), no further retry; the charge counts graded questions only', async () => {
  const h = harness({ model: stubModel({ failWith: (ids) => (ids.includes(9) ? abortError() : null) }) });
  const done = await runJob(h, 64);
  assert.equal(h.model.calls.length, 3, 'first call + ONE retry for the aborted chunk; nothing more');
  assert.equal(h.model.calls.filter((c) => c.ids.length === 1).length, 0, 'no one-question-per-call retries');
  const ng = done.final.results.map((r, i) => [i, r.notGraded]).filter(([, g]) => g).map(([i, g]) => i + ':' + g);
  assert.deepEqual(ng, ['5:timeout', '6:timeout', '7:timeout', '8:timeout', '9:timeout']);
  assert.deepEqual(h.trialWrites, [{ uid: 'stu-1', counts: { checks: 5 } }], '(d) only the 5 graded questions are charged');
});

/* ═══════════ CORS · the opt-in header is allowed; the poll route is live with the switch OFF ═══════════ */
// J3: run twice: switch UNSET (now the default, ON) and the kill switch OFF ("0"), where the contract
// (§8) says the poll route and its preflight stay live.
for (const [label, switchValue, portOffset] of [['switch unset = ON', undefined, 0], ['kill switch GRADING_JOBS=0', '0', 1]]) test('J1 CORS · the REAL server (' + label + ') preflights `Prefer` on the submit and the poll, and the poll answers 401 without a token', async () => {
  const path = require('path');
  const { spawn } = require('child_process');
  const port = 39000 + ((process.pid * 2 + portOffset) % 1800);
  const env = { ...process.env, PORT: String(port), API_KEY: '', AI_PROVIDER: '', GEMINI_API_KEY: '', GRADING_JOBS: '' };
  if (switchValue === undefined) delete env.GRADING_JOBS; else env.GRADING_JOBS = switchValue;
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'index.cjs')], { env, stdio: 'ignore' });
  try {
    const base = 'http://127.0.0.1:' + port;
    let up = false;
    for (let i = 0; i < 150 && !up; i += 1) {
      try { up = (await fetch(base + '/health')).status === 200; } catch { await new Promise((r) => setTimeout(r, 100)); }
    }
    assert.ok(up, 'the server booted');
    const allowed = async (p) => {
      const r = await fetch(base + p, { method: 'OPTIONS', headers: { Origin: 'https://example.test', 'Access-Control-Request-Method': p.includes('/jobs/') ? 'GET' : 'POST', 'Access-Control-Request-Headers': 'authorization,idempotency-key,prefer' } });
      assert.equal(r.status, 204, p);
      return String(r.headers.get('access-control-allow-headers') || '').split(',').map((h) => h.trim().toLowerCase());
    };
    assert.ok((await allowed('/api/grade-worksheet')).includes('prefer'), 'the submit preflight allows Prefer');
    assert.ok((await allowed('/api/grade-worksheet/jobs/' + '0'.repeat(40))).includes('prefer'), 'and the poll preflight');
    const poll = await fetch(base + '/api/grade-worksheet/jobs/' + '0'.repeat(40));
    assert.equal(poll.status, 401, 'the poll route is mounted (' + label + ') and self-gating');
  } finally {
    child.kill();
  }
});

module.exports = { jobsFirestore, pipeRes, stubModel, typedPaper, harness };
