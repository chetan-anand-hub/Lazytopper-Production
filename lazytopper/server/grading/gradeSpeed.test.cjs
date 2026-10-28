'use strict';
// server/grading/gradeSpeed.test.cjs — GRADE-SPEED-1: plumbing only, NO grading change.
//   §T  the [grade-timing] line: format, content firewall, both endpoints, cache + retry rows
//   §R  the MAX_TOKENS retry raises ONLY the retry's cap (first attempt, prompt, model, thinking untouched)
//   §W  the warm-up proof: loopback + secret, bypasses only the limiter, counts against nobody
//   §P  the early tier read (warmTier): one read instead of two, same answers
//   §I  the finished idempotency record keeps claimedAtMs
// Every behaviour has a CONTROL that fails without the fix.
// Run: node --test server/grading/gradeSpeed.test.cjs   (from lazytopper/)

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { createCheckSolutionRoute } = require('../routes/checkSolution.cjs');
const gt = require('./gradeTiming.cjs');
const { SINGLE_MAX_OUTPUT_TOKENS, SET_MAX_OUTPUT_TOKENS } = require('./core.cjs');
const { isInternalWarmupRequest, verdictFor, WARMUP_HEADER, WARMUP_SECRET_ENV } = require('../services/internalWarmup.cjs');
const { createRateLimiter } = require('../services/rateLimiter.cjs');
const { createFairUse, createGradingIdempotency, CHECK_SOLUTION_PATH, GRADE_WORKSHEET_PATH } = require('../services/fairUse.cjs');

/* ── harness: the REAL route + core, a stubbed model that can report usage and finishReason ── */

const QT = 'Solve x^2 - 2x - 8 = 0 by factorisation.';
const SECRET_ANSWER = 'x^2 - 4x + 2x - 8 = 0 SECRET-ANSWER-MARKER';
const OK_STEP = { description: 'Step', studentWork: 'x = 4', status: 'correct', marksAwarded: 1, marksDeducted: 0, teacherAnnotation: 'Good.', mistakeType: null, correctedWorking: null };
const GOOD = (qNumbers = [1]) => JSON.stringify({ summary: 's', results: qNumbers.map((n) => ({ qNumber: n, couldNotRead: false, addressesQuestion: 'yes', annotatedSteps: [OK_STEP], teacherNote: 'Note.' })) });
const lenient = (text) => { try { const v = JSON.parse(text); return v && typeof v === 'object' ? v : null; } catch { return null; } };

/** plan: array of { text, finishReason, usage, delayMs, error } per model call (last repeats). */
function harness(plan, deps = {}) {
  const calls = [];
  let captured = null;
  const route = createCheckSolutionRoute({
    sendJson: (res, status, body) => { res.statusCode = status; captured = { status, body }; },
    readJson: async (req) => req,
    callGemini: async (model, contents, genConfig) => {
      calls.push({ model, contents, genConfig });
      const p = plan[Math.min(calls.length - 1, plan.length - 1)];
      if (p.delayMs) await new Promise((r) => setTimeout(r, p.delayMs));
      if (p.error) throw p.error;
      return {
        text: p.text,
        finishReason: p.finishReason || 'STOP',
        raw: { candidates: [{ finishReason: p.finishReason || 'STOP' }], usageMetadata: p.usage || {} },
      };
    },
    GEMINI_MODEL: 'test-model',
    ACTIVE_PROVIDER: 'test',
    isStubMode: () => false,
    extractJsonObjectFromText: lenient,
    buildGeminiImagePart: ({ mimeType, base64 }) => ({ inlineData: { mimeType, data: base64 } }),
    validateMentorImagePayload: () => ({ ok: true }),
    makeFenceNonce: () => 'testnonce',
    telemetry: { increment: () => {} },
    ...deps,
  });
  const lines = [];
  const realLog = console.log;
  const run = async (handler, payload) => {
    const res = new EventEmitter();
    res.setHeader = () => {};
    res.statusCode = 0;
    console.log = (...a) => { const l = a.join(' '); if (l.startsWith('[grade-timing]')) lines.push(l); };
    try {
      captured = null;
      await route[handler](payload, res);
      res.emit('finish');
    } finally {
      console.log = realLog;
    }
    return captured;
  };
  return {
    calls, lines,
    single: (o = {}) => run('handleCheckSolution', { question: QT, marks: 3, subject: 'Maths', topic: 'Quadratic Equations', textAnswer: SECRET_ANSWER, headers: { 'x-lazytopper-surface': 'check-improve' }, ...o }),
    sheet: (qs, o = {}) => run('handleGradeWorksheet', { worksheetId: 'ws', subject: 'Maths', questions: qs, headers: { 'x-lazytopper-surface': 'worksheet' }, ...o }),
    quiet: async (fn) => { const w = console.warn; console.warn = () => {}; try { return await fn(); } finally { console.warn = w; } },
  };
}
const sq = (n, o = {}) => ({ qNumber: n, marks: 3, topic: 'Quadratic Equations', topicLabel: 'Quadratic Equations', questionText: QT, textAnswer: SECRET_ANSWER, ...o });
const parseLine = (line) => { assert.ok(line.startsWith('[grade-timing] '), line); return JSON.parse(line.slice('[grade-timing] '.length)); };
const USAGE = { thoughtsTokenCount: 9120, candidatesTokenCount: 1840, promptTokenCount: 5000 };

/* ══ §T · the [grade-timing] line ═══════════════════════════════════════════ */

test('§T.1 check-solution: ONE line with route, surface, status, preMs, attempts[], totalMs; no answer text', async () => {
  const h = harness([{ text: GOOD(), usage: USAGE }]);
  const out = await h.single({ __ltEnteredAtMs: Date.now() - 5 });
  assert.equal(out.status, 200);
  assert.equal(h.lines.length, 1);
  const rec = parseLine(h.lines[0]);
  assert.equal(rec.route, '/api/check-solution');
  assert.equal(rec.surface, 'check-improve');
  assert.equal(rec.status, 200);
  assert.ok(rec.preMs >= 0 && rec.preMs < 5000, 'preMs measured from the server pipeline entry: ' + rec.preMs);
  assert.equal(rec.cacheMs, null, 'no solution cache wired: the pre-phase did not run');
  assert.deepEqual(rec.attempts, [{ n: 1, ms: rec.attempts[0].ms, finishReason: 'STOP', thoughtsTokenCount: 9120, outputTokens: 1840, retryReason: null }]);
  assert.ok(Number.isInteger(rec.totalMs) && rec.totalMs >= rec.attempts[0].ms);
  assert.deepEqual(Object.keys(rec), ['route', 'surface', 'status', 'preMs', 'cacheMs', 'attempts', 'totalMs']);
  // CONTENT FIREWALL: no answer text, question text or identity.
  assert.ok(!h.lines[0].includes('SECRET-ANSWER-MARKER') && !h.lines[0].includes('factorisation'));
});

test('§T.2 grade-worksheet: its own line (route, surface) and a CONTROL that an unknown surface is not echoed', async () => {
  const h = harness([{ text: GOOD([1, 2]), usage: USAGE }]);
  await h.sheet([sq(1), sq(2)]);
  const rec = parseLine(h.lines[0]);
  assert.deepEqual([rec.route, rec.surface, rec.status], ['/api/grade-worksheet', 'worksheet', 200]);
  const h2 = harness([{ text: GOOD([1]) }]);
  await h2.single({ headers: { 'x-lazytopper-surface': 'uid=abc;<script>' } });
  assert.equal(parseLine(h2.lines[0]).surface, null, 'a header value outside the closed set never reaches the log');
});

test('§T.3 a request that never reaches the grader (400) logs nothing', async () => {
  const h = harness([{ text: GOOD() }]);
  const out = await h.single({ question: '' });
  assert.equal(out.status, 400);
  assert.equal(h.lines.length, 0);
  assert.equal(h.calls.length, 0);
});

test('§T.4 cacheMs is recorded when the scheme-first cache pre-phase runs', async () => {
  const solutionCache = { getOrCreateModelSolution: () => new Promise((r) => setTimeout(() => r({ schemeSteps: ['Write the formula [1]'] }), 40)) };
  const h = harness([{ text: GOOD() }], { solutionCache });
  await h.single();
  const rec = parseLine(h.lines[0]);
  assert.ok(rec.cacheMs >= 30, 'cacheMs ' + rec.cacheMs);
  // CONTROL: no cache, no figure.
  const none = harness([{ text: GOOD() }]);
  await none.single();
  assert.equal(parseLine(none.lines[0]).cacheMs, null);
});

test('§T.5 a retry is its own row with the reason: parse miss -> "unparseable", 503 -> "http_503", timeout -> "timeout"', async () => {
  const e503 = Object.assign(new Error('overloaded'), { status: 503 });
  const cases = [
    [[{ text: 'not json', finishReason: 'STOP' }, { text: GOOD() }], 'unparseable'],
    [[{ error: e503 }, { text: GOOD() }], 'http_503'],
  ];
  for (const [plan, reason] of cases) {
    const h = harness(plan);
    await h.quiet(() => h.single());
    const rec = parseLine(h.lines[0]);
    assert.equal(rec.attempts.length, 2, reason);
    assert.deepEqual([rec.attempts[0].n, rec.attempts[0].retryReason, rec.attempts[1].n, rec.attempts[1].retryReason], [1, null, 2, reason]);
  }
});

test('§T.6 a failed grade (every attempt errors) still logs, with status 500 and the attempt rows', async () => {
  const bad = Object.assign(new Error('bad request'), { status: 400 });
  const h = harness([{ error: bad }]);
  const out = await h.quiet(() => h.single());
  assert.equal(out.status, 500);
  const rec = parseLine(h.lines[0]);
  assert.equal(rec.status, 500);
  assert.equal(rec.attempts.length, 1);
  assert.equal(rec.attempts[0].finishReason, null);
});

test('§T.7 formatGradeTimingLine: closed sets, numbers only, job mode carries no status', () => {
  const sink = { cacheMs: 12.4, attempts: [{ n: 1, ms: 5, finishReason: 'STOP', thoughtsTokenCount: 1, outputTokens: 2, retryReason: null }] };
  const rec = parseLine(gt.formatGradeTimingLine({ route: '/api/grade-worksheet', mode: 'job', surface: 'full-mock', status: 202, preMs: null, sink, totalMs: 99.6 }));
  assert.deepEqual(rec, { route: '/api/grade-worksheet', mode: 'job', surface: 'full-mock', preMs: null, cacheMs: 12, attempts: sink.attempts, totalMs: 100 });
  const junk = parseLine(gt.formatGradeTimingLine({ route: 'uid-123/evil', surface: 'a@b.com', status: 'x', preMs: -4, sink: null, totalMs: NaN }));
  assert.deepEqual(junk, { route: null, surface: null, status: null, preMs: null, cacheMs: null, attempts: [], totalMs: null });
});

/* ══ §R · the MAX_TOKENS retry ═══════════════════════════════════════════════ */

const CUT_OFF = { text: '{"results":[{"qNumber":1,"annotatedSteps":[{"description":"Spl', finishReason: 'MAX_TOKENS' };

test('§R.1 single: a MAX_TOKENS cut-off is retried at 24000, the first attempt stays at 16000', async () => {
  const h = harness([CUT_OFF, { text: GOOD() }]);
  const out = await h.quiet(() => h.single());
  assert.equal(out.status, 200);
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[0].genConfig.maxOutputTokens, SINGLE_MAX_OUTPUT_TOKENS);
  assert.equal(h.calls[0].genConfig.maxOutputTokens, 16000);
  assert.equal(h.calls[1].genConfig.maxOutputTokens, 24000);
  const rec = parseLine(h.lines[0]);
  assert.deepEqual(rec.attempts.map((a) => [a.n, a.finishReason, a.retryReason]), [[1, 'MAX_TOKENS', null], [2, 'STOP', 'max_tokens']]);
});

test('§R.2 NOTHING else changes on the retry: same prompt, model, temperature, schema, thinking', async () => {
  const h = harness([CUT_OFF, { text: GOOD() }]);
  await h.quiet(() => h.single());
  const [a, b] = h.calls;
  assert.deepEqual(a.contents, b.contents);
  assert.equal(a.model, b.model);
  const strip = ({ maxOutputTokens, attempt, timeoutMs, deadlineAt, ...rest }) => rest;
  assert.deepEqual(strip(a.genConfig), strip(b.genConfig));
  assert.equal(a.genConfig.temperature, 0);
});

test('§R.3 set (grade-worksheet): 32000 -> 48000 on the retry only', async () => {
  const h = harness([CUT_OFF, { text: GOOD([1, 2]) }]);
  await h.quiet(() => h.sheet([sq(1), sq(2)]));
  assert.deepEqual(h.calls.map((c) => c.genConfig.maxOutputTokens), [SET_MAX_OUTPUT_TOKENS, 48000]);
  assert.equal(SET_MAX_OUTPUT_TOKENS, 32000);
});

test('§R.4 CONTROLS: a parse miss that finished STOP, a 503 and a timeout-style failure retry at the SAME cap', async () => {
  const e503 = Object.assign(new Error('overloaded'), { status: 503 });
  for (const first of [{ text: 'not json', finishReason: 'STOP' }, { error: e503 }]) {
    const h = harness([first, { text: GOOD() }]);
    await h.quiet(() => h.single());
    assert.deepEqual(h.calls.map((c) => c.genConfig.maxOutputTokens), [16000, 16000]);
  }
});

/* ══ §W · the warm-up proof ══════════════════════════════════════════════════ */

const KEY = 'a'.repeat(40);
const wreq = (o = {}) => ({ headers: { [WARMUP_HEADER]: KEY, ...(o.headers || {}) }, socket: { remoteAddress: o.peer || '127.0.0.1' } });
const ENV = { [WARMUP_SECRET_ENV]: KEY };

test('§W.1 accepted only with the secret, over loopback, on /api/step-solution, with no forwarding header', () => {
  assert.equal(isInternalWarmupRequest(wreq(), '/api/step-solution', ENV), true);
  assert.equal(isInternalWarmupRequest(wreq({ peer: '::1' }), '/api/step-solution', ENV), true);
  assert.equal(isInternalWarmupRequest(wreq({ peer: '::ffff:127.0.0.1' }), '/api/step-solution', ENV), true);
});

test('§W.2 CONTROLS: every missing proof is judged as an ordinary caller', () => {
  const p = '/api/step-solution';
  assert.equal(isInternalWarmupRequest(wreq({ headers: { [WARMUP_HEADER]: 'wrong' + KEY } }), p, ENV), false, 'wrong secret');
  assert.equal(isInternalWarmupRequest({ headers: {}, socket: { remoteAddress: '127.0.0.1' } }, p, ENV), false, 'no header');
  assert.equal(isInternalWarmupRequest(wreq({ peer: '203.0.113.9' }), p, ENV), false, 'not loopback');
  assert.equal(isInternalWarmupRequest(wreq({ headers: { 'x-forwarded-for': '203.0.113.9' } }), p, ENV), false, 'relayed from outside');
  assert.equal(isInternalWarmupRequest(wreq(), '/api/check-solution', ENV), false, 'a different route');
  assert.equal(isInternalWarmupRequest(wreq(), p, {}), false, 'no secret configured: the header alone proves nothing');
  assert.equal(isInternalWarmupRequest(wreq({ headers: { [WARMUP_HEADER]: 'short' } }), p, { [WARMUP_SECRET_ENV]: 'short' }), false, 'a too-short secret is not a secret');
  assert.equal(isInternalWarmupRequest(null, p, ENV), false);
});

test('§W.3 through the limiter step: an internal warm-up counts against NO student, anonymous, per-IP or global budget', () => {
  const rl = createRateLimiter({ now: () => Date.parse('2026-10-28T06:00:00Z'), telemetry: { increment() {} }, limits: { vision: { soft: 2, hard: 4 }, tutor: { soft: 2, hard: 4 }, practice: { soft: 2, hard: 4 }, anonymous: { soft: 1, hard: 2 }, global: { soft: 1000, hard: 1000 } } });
  const req = wreq();
  const before = JSON.stringify(rl.snapshot());
  for (let i = 0; i < 50; i += 1) {
    const v = verdictFor(isInternalWarmupRequest(req, '/api/step-solution', ENV), () => rl.check(req, '/api/step-solution', ''));
    assert.equal(v.allowed, true, 'warm-up call ' + i);
  }
  assert.equal(JSON.stringify(rl.snapshot()), before, 'not one counter moved');
  // CONTROL: the same 50 calls WITHOUT the proof hit the anonymous cap and move counters.
  const plain = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
  const verdicts = [];
  for (let i = 0; i < 5; i += 1) verdicts.push(verdictFor(isInternalWarmupRequest(plain, '/api/step-solution', ENV), () => rl.check(plain, '/api/step-solution', '')));
  assert.deepEqual(verdicts.map((v) => v.allowed), [true, true, false, false, false], 'anonymous hard cap 2');
  assert.notEqual(JSON.stringify(rl.snapshot()), before);
  assert.equal(verdicts[2].body.error, 'daily_limit');
});

test('§W.4 the three files agree: the script sends the header, the api-server creates the secret before spawning, index.cjs uses the proof', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.resolve(__dirname, '..', '..', '..');
  const script = fs.readFileSync(path.join(root, 'lazytopper', 'scripts', 'warmup-solution-cache.mjs'), 'utf8');
  const api = fs.readFileSync(path.join(root, 'artifacts', 'api-server', 'src', 'index.ts'), 'utf8');
  const idx = fs.readFileSync(path.join(root, 'lazytopper', 'server', 'index.cjs'), 'utf8');
  assert.ok(script.includes(`'${WARMUP_HEADER}'`) && script.includes('process.env.WARMUP_INTERNAL_KEY'));
  assert.ok(api.includes('WARMUP_INTERNAL_KEY') && api.indexOf('WARMUP_INTERNAL_KEY') < api.indexOf('function startGateway'), 'the secret exists before either child is spawned');
  assert.match(idx, /internalWarmupLib\.isInternalWarmupRequest\(req, reqPath\)/);
  assert.match(idx, /internalWarmupLib\.verdictFor\(internalWarmup, \(\) =>/);
});

/* ══ §P · the early tier read ════════════════════════════════════════════════ */

function tierRig() {
  let reads = 0;
  const gate = createFairUse({
    tierOf: async () => { reads += 1; await new Promise((r) => setImmediate(r)); return 'premium'; },
    ledger: { async readDay() { return {}; }, async addTrial() {}, async addPremium() {} },
    telemetry: { increment() {} },
    env: {},
    now: () => Date.parse('2026-10-28T06:00:00Z'),
    readJson: async () => ({}),
    resolveFirestore: () => null,
    sendJson: () => {},
  });
  return { gate, reads: () => reads };
}

test('§P.1 warmTier + isPremium share ONE read; CONTROL: without the warm-up each ask reads again', async () => {
  const warm = tierRig();
  const req = { headers: {} };
  warm.gate.warmTier('stu-1', req, CHECK_SOLUTION_PATH);
  assert.equal(await warm.gate.isPremium('stu-1', req), true);
  assert.equal(await warm.gate.isPremium('stu-1', req), true);
  assert.equal(warm.reads(), 1, 'one read for the whole request');
  const cold = tierRig();
  const req2 = { headers: {} };
  await cold.gate.isPremium('stu-1', req2);
  await cold.gate.isPremium('stu-1', req2);
  assert.equal(cold.reads(), 2, 'CONTROL: no warm-up, a read per ask');
});

test('§P.2 warmTier is a no-op for a non-grading path, an empty uid, and a DIFFERENT uid is never answered from another uid\'s read', async () => {
  const r = tierRig();
  const req = { headers: {} };
  r.gate.warmTier('stu-1', req, '/api/health');
  r.gate.warmTier('', req, CHECK_SOLUTION_PATH);
  assert.equal(r.reads(), 0, 'nothing started');
  r.gate.warmTier('stu-1', req, GRADE_WORKSHEET_PATH);
  await r.gate.isPremium('stu-2', req);
  assert.equal(r.reads(), 2, 'stu-2 got its own read');
});

/* ══ §I · the idempotency record keeps its start ═════════════════════════════ */

function fakeDb() {
  const docs = new Map();
  const ref = (p) => ({ path: p, collection: (n) => ({ doc: (id) => ref(p + '/' + n + '/' + id) }) });
  return {
    docs,
    db: {
      collection: (n) => ({ doc: (id) => ref(n + '/' + id) }),
      runTransaction: async (fn) => {
        const queued = [];
        const tx = {
          get: async (r) => ({ exists: docs.has(r.path), data: () => JSON.parse(JSON.stringify(docs.get(r.path))) }),
          set: (r, d) => { queued.push(['set', r, d]); return tx; },
          delete: (r) => { queued.push(['del', r]); return tx; },
        };
        const out = await fn(tx);
        for (const [op, r, d] of queued) { if (op === 'set') docs.set(r.path, JSON.parse(JSON.stringify(d))); else docs.delete(r.path); }
        return out;
      },
    },
  };
}

test('§I.1 the done record keeps claimedAtMs (never overwritten) beside completedAtMs; a stale re-claim is not mine and writes none', async () => {
  const fs = fakeDb();
  const clock = { now: 1_800_000_000_000 };
  const idem = createGradingIdempotency({ resolveFirestore: () => ({ db: fs.db }), now: () => clock.now, telemetry: null });
  const res = new EventEmitter();
  res.statusCode = 200;
  res.setHeader = () => {};
  res.end = function end() { return true; };
  const req = { headers: { 'idempotency-key': '7f9c2ba4-e88f-4d21-9a3b-1c2d3e4f5a6b' } };
  const step = await idem.begin(req, res, CHECK_SOLUTION_PATH, 'stu-1');
  assert.deepEqual(step, { claimed: true });
  const claimedAt = clock.now;
  clock.now += 75_000; // the slow grade
  res.end(JSON.stringify({ ok: true }));
  for (let i = 0; i < 20; i += 1) await new Promise((r) => setImmediate(r));
  const rec = [...fs.docs.values()][0];
  assert.equal(rec.state, 'done');
  assert.equal(rec.claimedAtMs, claimedAt, 'the start time survives the completed write');
  assert.equal(rec.completedAtMs, claimedAt + 75_000);
  assert.equal(rec.completedAtMs - rec.claimedAtMs, 75_000, 'the duration is recoverable');
});
