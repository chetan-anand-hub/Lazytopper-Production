'use strict';
// server/services/gracefulDrain.test.cjs — GRACEFUL-DEPLOY: a redeploy loses no grading work.
// Run: node --test server/services/gracefulDrain.test.cjs   (pnpm run test:server:graceful-drain)
//
// Every timer is a FAKE driven by advance(); no test reads the wall clock (jobs get an injected
// `now`), so this file needs no CLOCK GUARD entry. The jobs used here are the REAL grading/jobs.cjs
// runner on a path-keyed in-memory Firestore, so "the job finished and persisted" is read back from
// the stored record, not from a stub's say-so.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const {
  createGracefulDrain, DRAIN_DEADLINE_MS, INTERRUPT_GUARD_MS, SERVER_RESTARTING_BODY, RETRY_AFTER_SECONDS,
} = require('./gracefulDrain.cjs');
const { createUsageLedger, pendingWrites } = require('./usageLedger.cjs');
const { createGradingJobs } = require('../grading/jobs.cjs');
const { GRADING_RESULTS_COLLECTION, GRADING_RESULTS_SEGMENTS } = require('./fairUse.cjs');

const tick = () => new Promise((r) => setImmediate(r));
const settle = async (n = 40) => { for (let i = 0; i < n; i += 1) await tick(); };

/* ── fake timers: nothing fires until advance() moves the fake time past it ── */
function fakeTimers() {
  let t = 0;
  const pending = new Set();
  const add = (fn, ms, every) => { const h = { at: t + ms, fn, every }; pending.add(h); return h; };
  return {
    setTimeout: (fn, ms) => add(fn, ms, 0),
    setInterval: (fn, ms) => add(fn, ms, ms),
    clearTimeout: (h) => pending.delete(h),
    clearInterval: (h) => pending.delete(h),
    now: () => t,
    pendingCount: () => pending.size,
    async advance(ms) {
      const target = t + ms;
      for (;;) {
        let next = null;
        for (const h of pending) if (h.at <= target && (!next || h.at < next.at)) next = h;
        if (!next) break;
        t = next.at;
        if (next.every) next.at = t + next.every; else pending.delete(next);
        next.fn();
        await settle(5);
      }
      t = target;
      await settle();
    },
  };
}

/** A response like Node's: writeHead/end; `finish` then `close` on end. */
function fakeRes() {
  const res = new EventEmitter();
  res.statusCode = 0;
  res.headers = {};
  res.body = null;
  res.writeHead = (status, headers) => { res.statusCode = status; res.headers = { ...headers }; };
  res.end = (chunk) => { res.body = chunk === undefined ? null : String(chunk); res.emit('finish'); res.emit('close'); };
  return res;
}

/* ── a path-keyed Firestore with transactions; update() fails on a missing doc ── */
function memFirestore() {
  const docs = new Map();
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const notFound = () => Object.assign(new Error('5 NOT_FOUND'), { code: 5 });
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
  }
  function ref(parts) {
    const p = parts.join('/');
    return {
      path: p,
      collection: (name) => ({ doc: (id) => ref([...parts, name, id]) }),
      async get() { await tick(); return { exists: docs.has(p), data: () => clone(docs.get(p)) }; },
      async update(fields) { await tick(); if (!docs.has(p)) throw notFound(); applyFields(p, fields); },
    };
  }
  const db = {
    collection: (name) => ({ doc: (id) => ref([name, id]) }),
    async runTransaction(fn) {
      const queued = [];
      const tx = {
        async get(r) { await tick(); return { exists: docs.has(r.path), data: () => clone(docs.get(r.path)) }; },
        update(r, fields) { queued.push([r, fields]); return tx; },
      };
      const out = await fn(tx);
      for (const [r] of queued) if (!docs.has(r.path)) throw notFound();
      for (const [r, fields] of queued) applyFields(r.path, fields);
      return out;
    },
  };
  return { db, docs };
}

const UID = 'student-uid-1';
const JOB_ID = 'a'.repeat(40);
const DOC_PATH = [GRADING_RESULTS_COLLECTION, UID, GRADING_RESULTS_SEGMENTS.attempts, JOB_ID].join('/');

/** The real jobs runner with one claimed attempt record ready to become a job. `onCommit` (optional)
 *  runs inside the deferred commit, as fair use's commitDeferred does (it starts the ledger write). */
function realJobs(timers, onCommit) {
  const store = memFirestore();
  store.docs.set(DOC_PATH, { state: 'pending', claimId: 'claim-1', expiresAtMs: 10 ** 12 });
  const commits = [];
  const jobs = createGradingJobs({
    resolveFirestore: () => ({ db: store.db }),
    commitDeferred: (deferred, graded) => { commits.push({ deferred, graded }); if (onCommit) onCommit(graded); },
    now: timers.now,
    heartbeatMs: 10 ** 9,
  });
  return { jobs, store, commits };
}

/** Submit a 2-question job whose grading is HELD until release() is called. */
async function submitHeldJob(jobs) {
  let release = () => {};
  const gate = new Promise((r) => { release = r; });
  const row = (i) => ({ qNumber: i + 1, totalMarks: 1, marksAwarded: 1, couldNotRead: false, note: 'ok', _reason: 'graded' });
  const out = await jobs.submit({
    attempt: { uid: UID, attemptId: JOB_ID, claimId: 'claim-1' },
    total: 2,
    meta: [{ qNumber: 1, totalMarks: 1 }, { qNumber: 2, totalMarks: 1 }],
    deferred: { paper: 'p1' },
    run: async (onRows) => {
      onRows([{ index: 0, final: true, result: row(0) }]);
      await gate;
      onRows([{ index: 1, final: true, result: row(1) }]);
      return [row(0), row(1)];
    },
    finish: (graded) => ({ body: JSON.stringify({ ok: true, results: graded }), graded: 2, model: 'test-model' }),
  });
  assert.equal(out.ok, true, 'the job was accepted');
  await settle();
  return { release };
}

function drainWith(timers, jobs, extra = {}) {
  const exits = [];
  const drain = createGracefulDrain({
    jobs, exit: (code) => exits.push(code), corsOrigin: 'https://example.test', ...timers, ...extra,
  });
  return { drain, exits };
}

test('PIN 1 · after SIGTERM a new request is refused with an honest, retryable 503 and never reaches the handler', async () => {
  const timers = fakeTimers();
  const { drain } = drainWith(timers, { stats: () => ({ live: 1 }), interruptAll: async () => 0 });
  let handled = 0;
  const handler = drain.wrap(() => { handled += 1; });
  void drain.begin('SIGTERM');
  const res = fakeRes();
  handler({ method: 'POST', url: '/api/grade-worksheet' }, res);
  assert.equal(handled, 0, 'the grading handler never ran: nothing started, nothing charged');
  assert.equal(res.statusCode, 503);
  assert.equal(res.headers['Retry-After'], String(RETRY_AFTER_SECONDS));
  assert.equal(res.headers.Connection, 'close');
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://example.test');
  const body = JSON.parse(res.body);
  assert.deepEqual(body, { ...SERVER_RESTARTING_BODY });
  assert.equal(body.retryable, true);
  assert.equal(body.error, 'server_restarting');
});

test('PIN 2 · a request in flight at SIGTERM is served to the end; the exit comes only after it', async () => {
  const timers = fakeTimers();
  const { drain, exits } = drainWith(timers, null);
  let res;
  const handler = drain.wrap((req, r) => { res = r; });
  handler({ method: 'POST', url: '/api/check-solution' }, fakeRes());
  assert.equal(drain.inFlight(), 1);
  void drain.begin('SIGTERM');
  await timers.advance(5000);
  assert.deepEqual(exits, [], 'no exit while the request is in flight');
  res.end('{"ok":true}');
  await timers.advance(1000);
  assert.deepEqual(exits, [0], 'exit 0 once it finished');
});

test('PIN 3 · an in-flight grading job FINISHES and is PERSISTED done (charged once) before the process exits', async () => {
  const timers = fakeTimers();
  const { jobs, store, commits } = realJobs(timers);
  const { release } = await submitHeldJob(jobs);
  const { drain, exits } = drainWith(timers, jobs);
  const ended = drain.begin('SIGTERM');
  await timers.advance(60000);
  assert.deepEqual(exits, [], 'still grading at 60 s: no exit');
  assert.equal(store.docs.get(DOC_PATH).job.state, 'running');
  assert.ok(store.docs.get(DOC_PATH).job.rows.q0, 'progress already persisted while draining');
  release();
  await settle(200);
  await timers.advance(1000);
  const job = store.docs.get(DOC_PATH).job;
  assert.equal(job.state, 'done', 'the job ended done, not interrupted');
  assert.equal(job.chargedCount, 2);
  assert.deepEqual(commits, [{ deferred: { paper: 'p1' }, graded: 2 }], 'charged once, for the graded questions');
  assert.deepEqual(exits, [0]);
  assert.deepEqual(await ended, { ending: 'drained', interrupted: 0 });
});

test('PIN 4 · a job still running at the deadline is ended INTERRUPTED (final rows kept) and the process exits at the deadline, not before', async () => {
  const timers = fakeTimers();
  const { jobs, store, commits } = realJobs(timers);
  await submitHeldJob(jobs); // never released
  const { drain, exits } = drainWith(timers, jobs);
  const ended = drain.begin('SIGTERM');
  await timers.advance(DRAIN_DEADLINE_MS - 1);
  assert.deepEqual(exits, [], 'no exit before the deadline');
  await timers.advance(1);
  await settle(200);
  const job = store.docs.get(DOC_PATH).job;
  assert.equal(job.state, 'interrupted');
  assert.equal(job.interruptReason, 'shutdown');
  assert.equal(JSON.parse(job.results[1]).notGraded, 'interrupted', 'the unfinished question is "not graded"');
  assert.deepEqual(commits, [{ deferred: { paper: 'p1' }, graded: 1 }], 'only the final graded row is charged');
  assert.deepEqual(exits, [0]);
  assert.deepEqual(await ended, { ending: 'deadline', interrupted: 1 });
  assert.ok(DRAIN_DEADLINE_MS <= 120000, 'the drain fits inside Railway drainingSeconds (120)');
});

test('PIN 5 · an idle process exits at once on SIGTERM, closes its listener, and a second SIGTERM changes nothing', async () => {
  const timers = fakeTimers();
  const { drain, exits } = drainWith(timers, { stats: () => ({ live: 0 }), interruptAll: async () => 0 });
  let closed = 0;
  drain.attach({ close: () => { closed += 1; } });
  void drain.begin('SIGTERM');
  void drain.begin('SIGTERM');
  assert.equal(closed, 1);
  assert.deepEqual(exits, [0]);
  await timers.advance(DRAIN_DEADLINE_MS * 2);
  assert.deepEqual(exits, [0], 'exactly one exit');
});

test('PIN 6 · index.cjs routes every request through the drain and hands SIGTERM to it (the old interrupt-at-once hook is gone)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.cjs'), 'utf8');
  assert.match(src, /http\.createServer\(gracefulDrain\.wrap\(/);
  assert.match(src, /process\.once\('SIGTERM', \(\) => \{ void gracefulDrain\.begin\('SIGTERM'\); \}\);/);
  assert.match(src, /createGracefulDrain\(\{\s*jobs: gradingJobs,/);
  assert.doesNotMatch(src, /interruptAll\('shutdown'\)/, 'SIGTERM no longer interrupts running jobs at once');
  assert.doesNotMatch(src, /DARK unless\s*\/\/\s*GRADING_JOBS=1/, 'D79: the operator comment no longer says jobs are dark unless GRADING_JOBS=1');
});

/* ── ROUND 2 (verifier SHOULD-FIX 1 + 2) ─────────────────────────────────────────────────────────── */

/** A REAL usageLedger whose Firestore `set` is HELD until release(): the charge is "on the wire". */
function heldLedger(timers) {
  const writes = [];
  let release = () => {};
  const gate = new Promise((r) => { release = r; });
  const doc = (p) => ({
    collection: (name) => ({ doc: (id) => doc(`${p}/${name}/${id}`) }),
    async set(data) { await gate; writes.push({ path: p, data }); },
  });
  const ledger = createUsageLedger({
    resolveFirestore: () => ({ db: { collection: (name) => ({ doc: (id) => doc(`${name}/${id}`) }) }, FieldValue: { increment: (n) => ({ increment: n }) } }),
    telemetry: { increment() {} },
    now: timers.now,
  });
  return { ledger, writes, release };
}

test('PIN 7 · an ABORTED request (close without finish) releases the in-flight count, so the drain still exits', async () => {
  const timers = fakeTimers();
  const { drain, exits } = drainWith(timers, null);
  let res;
  const handler = drain.wrap((req, r) => { res = r; });
  handler({ method: 'POST', url: '/api/grade-worksheet' }, fakeRes());
  assert.equal(drain.inFlight(), 1);
  void drain.begin('SIGTERM');
  await timers.advance(1000);
  assert.deepEqual(exits, [], 'still in flight');
  res.emit('close'); // the client went away: Node fires close, never finish
  assert.equal(drain.inFlight(), 0, 'the aborted request is no longer counted');
  res.emit('close');
  assert.equal(drain.inFlight(), 0, 'released once: never negative');
  await timers.advance(1000);
  assert.deepEqual(exits, [0], 'exit 0 well before the deadline');
});

test('PIN 8 · a usage / fair-use ledger write still on the wire DELAYS the exit until it settles (the charge is not lost)', async () => {
  const timers = fakeTimers();
  const held = heldLedger(timers);
  const { jobs, store } = realJobs(timers, (graded) => held.ledger.recordTrialUse(UID, { worksheets: graded }));
  const { release } = await submitHeldJob(jobs);
  const { drain, exits } = drainWith(timers, jobs);
  const ended = drain.begin('SIGTERM');
  release();
  await settle(200);
  await timers.advance(5000);
  assert.equal(store.docs.get(DOC_PATH).job.state, 'done', 'the job ended done');
  assert.equal(jobs.stats().live, 0, 'no live job is left');
  assert.equal(pendingWrites(), 1, 'its charge is still on the wire');
  assert.deepEqual(exits, [], 'no exit while the charge is pending');
  held.release();
  await settle(50);
  await timers.advance(1000);
  assert.equal(held.writes.length, 1, 'the charge landed');
  assert.deepEqual(held.writes[0].data, { trialWorksheets: { increment: 2 } }, 'charged exactly the graded count');
  assert.equal(pendingWrites(), 0);
  assert.deepEqual(exits, [0]);
  assert.deepEqual(await ended, { ending: 'drained', interrupted: 0 });
  // Both markPaperGraded call sites in fair use are tracked the same way.
  const src = fs.readFileSync(path.join(__dirname, 'fairUse.cjs'), 'utf8');
  assert.equal((src.match(/void trackWrite\(markPaperGraded\(/g) || []).length, 2, 'both markPaperGraded calls are tracked');
  assert.doesNotMatch(src, /void markPaperGraded\(/, 'no untracked markPaperGraded call');
});

test('PIN 9 · at the deadline the interrupt’s charge write is awaited before the exit', async () => {
  const timers = fakeTimers();
  const held = heldLedger(timers);
  const { jobs, store } = realJobs(timers, (graded) => held.ledger.recordTrialUse(UID, { worksheets: graded }));
  await submitHeldJob(jobs); // never released
  const { drain, exits } = drainWith(timers, jobs);
  const ended = drain.begin('SIGTERM');
  await timers.advance(DRAIN_DEADLINE_MS);
  await settle(200);
  assert.equal(store.docs.get(DOC_PATH).job.state, 'interrupted');
  assert.equal(pendingWrites(), 1, 'the interrupt started its charge write');
  assert.deepEqual(exits, [], 'no exit while that write is pending');
  held.release();
  await settle(50);
  assert.deepEqual(held.writes.map((w) => w.data), [{ trialWorksheets: { increment: 1 } }], 'the final graded row is charged');
  assert.deepEqual(exits, [0]);
  assert.deepEqual(await ended, { ending: 'deadline', interrupted: 1 });
});

test('PIN 10 · a ledger write that NEVER settles cannot hold the exit past deadline + guard (inside the Railway 120 s window)', async () => {
  const timers = fakeTimers();
  const held = heldLedger(timers);
  held.ledger.recordTrialUse(UID, { worksheets: 1 }); // stuck on the wire
  assert.equal(pendingWrites(), 1);
  const { drain, exits } = drainWith(timers, { stats: () => ({ live: 0 }), interruptAll: async () => 0 });
  const ended = drain.begin('SIGTERM');
  await timers.advance(DRAIN_DEADLINE_MS + INTERRUPT_GUARD_MS - 1);
  assert.deepEqual(exits, [], 'waits for the write up to the guard');
  await timers.advance(1);
  assert.deepEqual(exits, [0], 'the deadline guard still ends it');
  assert.deepEqual(await ended, { ending: 'deadline', interrupted: -1 });
  assert.ok(DRAIN_DEADLINE_MS + INTERRUPT_GUARD_MS < 115000, 'child exits before the parent deadline (115 s) and SIGKILL (120 s)');
  held.release(); // tidy the module-wide set for any later test
  await settle(50);
  assert.equal(pendingWrites(), 0);
});
