'use strict';
// server/grading/gradeSpeed.wiring.test.cjs — GRADE-SPEED-1 over the REAL index.cjs, over HTTP.
// (The boot harness is the one fairUse.test.cjs WIRING section uses: firebase-admin and fetch swapped
// before index.cjs loads, no test seam in production code.)
//   (1) a graded check emits ONE [grade-timing] line with the model call's numbers and NO identity;
//   (2) the deploy warm-up (proof header over loopback) never spends the anonymous/global budget,
//       while the same calls without the proof do, and a wrong proof is an ordinary caller.
// Run: node --test server/grading/gradeSpeed.wiring.test.cjs   (from lazytopper/)

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const INDEX_CJS = path.resolve(__dirname, '..', 'index.cjs');

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

function bootServer(port, extraEnv, seed) {
  const launcher = `
    const Module = require('module');
    const SEED = JSON.parse(process.env.FAIR_USE_TEST_SEED || '{}');
    const TOKENS = { 'trial-token': 'trial-student', 'premium-token': 'premium-student' };
    const SUBS = {
      'trial-student': { tier: 'trial', trialStartDate: { seconds: Math.floor(Date.now() / 1000) - 86400 } },
      'premium-student': { tier: 'premium' },
    };
    const docRef = (p) => ({
      path: p,
      collection: (n) => collRef(p + '/' + n),
      get: async () => {
        if (p.startsWith('subscriptions/')) {
          const d = SUBS[p.split('/')[1]];
          return { exists: !!d, data: () => d };
        }
        const d = SEED[p];
        return { exists: !!d, data: () => d };
      },
      set: async (data) => {
        if (p.startsWith('usageLedger/')) console.log('LEDGER_SET ' + p + ' ' + JSON.stringify(data));
        // LOW-END-1 R4: the idempotency store really persists (and is logged), so a retry
        // can find what the first attempt stored.
        if (p.startsWith('gradingResults/')) {
          SEED[p] = JSON.parse(JSON.stringify(data));
          console.log('IDEM_SET ' + p + ' ' + data.state);
        }
      },
      delete: async () => {
        if (p.startsWith('gradingResults/')) { delete SEED[p]; console.log('IDEM_DELETE ' + p); }
      },
    });
    const collRef = (p) => ({ doc: (id) => docRef(p + '/' + id) });
    const firestore = () => ({
      collection: (n) => collRef(n),
      // FAIR-USE-3: a transaction runs on the same fake documents (its writes are logged too).
      runTransaction: async (fn) => fn({
        get: (ref) => ref.get(),
        getAll: (...refs) => Promise.all(refs.map((r) => r.get())),
        set(ref, data, opts) { ref.set(data, opts); return this; },
        delete(ref) { ref.delete(); return this; },
      }),
    });
    firestore.FieldValue = { increment: (n) => ({ increment: n }) };
    const fake = {
      apps: [],
      credential: { cert: () => ({}) },
      initializeApp() { fake.apps.push({}); },
      auth: () => ({
        verifyIdToken: async (t) => {
          if (TOKENS[t]) return { uid: TOKENS[t] };
          throw new Error('invalid token');
        },
      }),
      appCheck: () => ({ verifyToken: async () => ({ appId: 'app-1', alreadyConsumed: false }) }),
      firestore,
    };
    const orig = Module._load;
    Module._load = function (r) { return r === 'firebase-admin' ? fake : orig.apply(this, arguments); };
    // GRADER-CORE-1 PR-3 (C9): a served grade is charged only for what it actually GRADED, so
    // the stub answers with a real, parseable grade for questions 1..12 (the tutor still reads
    // its "reply"). FAIR_USE_TEST_GEMINI=unparseable restores the old reply — a 200 { ok:false }
    // "couldn't read the grading" — which is now stored but never charged.
    const GRADED_REPLY = JSON.stringify({ reply: 'ok', summary: 'ok', results: Array.from({ length: 12 }, (_, i) => ({
      qNumber: i + 1, couldNotRead: false, addressesQuestion: 'yes', teacherNote: 'ok',
      annotatedSteps: [{ description: 'Solves', studentWork: 'x = 1', status: 'correct', marksAwarded: 1, marksDeducted: 0, teacherAnnotation: 'ok', mistakeType: null }],
    })) });
    const MODEL_TEXT = process.env.FAIR_USE_TEST_GEMINI === 'unparseable' ? '{"reply":"ok"}' : GRADED_REPLY;
    globalThis.fetch = async (url) => {
      console.log('GEMINI_FETCH ' + String(url).split('?')[0].split('/').pop());
      return {
        ok: true, status: 200, statusText: 'OK', headers: { get: () => null },
        text: async () => JSON.stringify({
          candidates: [{ content: { parts: [{ text: MODEL_TEXT }] } }],
          usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 800, totalTokenCount: 2000 },
        }),
      };
    };
    require(${JSON.stringify(INDEX_CJS)});
  `;
  const env = { ...process.env, PORT: String(port) };
  for (const k of Object.keys(env)) {
    // TEST-CLOCK-SWEEP: keep the test clock (LT_TEST_CLOCK, LT_TEST_CLOCK_ANCHOR). The LT_ strip
    // drops app config; dropping the clock put this child on the REAL clock while the test
    // computed `today` on the switched one (red at LT_TEST_CLOCK=2030-...).
    if (k.startsWith('LT_TEST_CLOCK')) continue;
    if (/^(AI_INTEGRATIONS_|GEMINI_|WARM_POOL_|LT_|FAIR_USE_)/.test(k)) delete env[k];
  }
  delete env.DATABASE_URL;
  delete env.FIREBASE_SERVICE_ACCOUNT_KEY;
  env.API_KEY = 'fake-gemini-key';
  env.AI_PROVIDER = 'gemini';
  env.VITE_FIREBASE_PROJECT_ID = 'demo-fair-use';
  env.FAIR_USE_TEST_SEED = JSON.stringify(seed || {});
  Object.assign(env, extraEnv || {});

  const child = spawn(process.execPath, ['-e', launcher], { env, cwd: path.dirname(INDEX_CJS) });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const ready = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`server did not start:\n${out}`)), 60000);
    const tick = setInterval(() => {
      if (/running on port/.test(out)) { clearInterval(tick); clearTimeout(t); resolve(); }
      if (child.exitCode !== null) { clearInterval(tick); clearTimeout(t); reject(new Error(`server exited:\n${out}`)); }
    }, 100);
  });
  return { child, ready, log: () => out };
}

function request(port, method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? '' : JSON.stringify(body);
    const req = http.request(
      {
        host: '127.0.0.1', port, path: urlPath, method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => resolve({ status: res.statusCode, text, headers: res.headers }));
      }
    );
    req.on('error', reject);
    req.end(payload || undefined);
  });
}

const count = (log, re) => (log.match(re) || []).length;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TRIAL = { authorization: 'Bearer trial-token' };
const KEY = 'warmup-secret-' + 'k'.repeat(30);
const STEP = { question: 'Find the HCF of 12 and 18.', marks: 2, subject: 'Maths', topic: 'Real Numbers' };

test('WIRING · a graded check logs one [grade-timing] line: surface, status, preMs, the attempt row; no uid, no answer text',
  { timeout: 120000 }, async (t) => {
    const port = await freePort();
    const srv = bootServer(port, {}, {});
    t.after(() => srv.child.kill());
    await srv.ready;
    const before = srv.log().length;
    const res = await request(port, 'POST', '/api/check-solution',
      { question: 'Solve x + 1 = 2', marks: 2, textAnswer: 'x = 1 UNIQUE-ANSWER-TEXT' }, { ...TRIAL, 'x-lazytopper-surface': 'check-improve' });
    assert.equal(res.status, 200, res.text);
    for (let i = 0; i < 40 && !/\[grade-timing\]/.test(srv.log().slice(before)); i++) await wait(50);
    const delta = srv.log().slice(before);
    const lines = delta.split('\n').filter((l) => l.startsWith('[grade-timing]'));
    assert.equal(lines.length, 1, delta);
    const rec = JSON.parse(lines[0].slice('[grade-timing] '.length));
    assert.deepEqual([rec.route, rec.surface, rec.status], ['/api/check-solution', 'check-improve', 200]);
    assert.ok(Number.isInteger(rec.preMs) && rec.preMs >= 0 && rec.preMs < 10000, 'preMs ' + rec.preMs);
    assert.equal(rec.attempts.length, 1);
    assert.deepEqual([rec.attempts[0].n, rec.attempts[0].finishReason, rec.attempts[0].thoughtsTokenCount, rec.attempts[0].outputTokens], [1, null, 800, 200]);
    assert.ok(rec.totalMs >= rec.attempts[0].ms);
    assert.ok(!lines[0].includes('trial-student') && !lines[0].includes('UNIQUE-ANSWER-TEXT'), 'no identity, no answer text');
  });

test('WIRING · the warm-up proof skips ONLY the limiter: 12 proven calls spend nothing, then the anonymous cap still has its full budget',
  { timeout: 120000 }, async (t) => {
    const port = await freePort();
    const srv = bootServer(port, { WARMUP_INTERNAL_KEY: KEY }, {});
    t.after(() => srv.child.kill());
    await srv.ready;
    // (a) 12 proven calls: none is ever 429 (the anonymous hard cap is 3 a day).
    for (let i = 0; i < 12; i++) {
      const r = await request(port, 'POST', '/api/step-solution', STEP, { 'x-lt-internal-warmup': KEY });
      assert.notEqual(r.status, 429, 'proven warm-up call ' + i + ': ' + r.text);
    }
    // (b) CONTROL + proof of "counted against nobody": a WRONG proof is an ordinary anonymous caller,
    //     and it still has its WHOLE budget (3 allowed, the 4th refused) after the 12 proven calls.
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await request(port, 'POST', '/api/step-solution', STEP, { 'x-lt-internal-warmup': 'wrong-' + KEY })).status);
    assert.deepEqual(statuses.map((s) => s === 429), [false, false, false, true], JSON.stringify(statuses));
  });

test('WIRING · CONTROL: with no WARMUP_INTERNAL_KEY configured the header proves nothing (limited like anyone)',
  { timeout: 120000 }, async (t) => {
    const port = await freePort();
    const srv = bootServer(port, {}, {});
    t.after(() => srv.child.kill());
    await srv.ready;
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await request(port, 'POST', '/api/step-solution', STEP, { 'x-lt-internal-warmup': KEY })).status);
    assert.equal(statuses[3], 429, JSON.stringify(statuses));
  });
