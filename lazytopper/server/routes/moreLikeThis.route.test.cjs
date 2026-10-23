/**
 * moreLikeThis.route.test — MLT-RETIRE-1 over the REAL index.cjs.
 *
 * ★ WHAT THIS SUITE PINS. POST /api/more-like-this (the old AI "More like this" generator) is
 * RETIRED: owner ruling 2026-10-23. MLT-MUTE-1 (#1295) had already stopped every client call to
 * it, but the route itself was still live — authenticated, metered and able to call the model for
 * anyone who POSTed to it. It now answers 410 with a short JSON body, exactly like
 * /api/ai-questions (aiQuestions.route.test.cjs): no body read, no pool read or write, no model
 * call, no usage-ledger write, no trial counter, no rate-limit bucket.
 *
 * RED on the old code: a signed-in POST answered 200, called the model (MODEL_MARKER) and wrote
 * the usage ledger (LEDGER_MARKER); an unauthenticated POST answered 401 (AUTHGATE-2), not 410.
 *
 * ★ WHY OVER THE REAL index.cjs: a refusal in the route factory proves nothing if index.cjs
 * dispatches the path somewhere else, or a gate in front of dispatch meters it first. Stubbed,
 * and only these: firebase-admin (no network; every Firestore write is logged), the pool module
 * (it would need Postgres; every call is logged) and the model's HTTP endpoint (every call is
 * logged). No request leaves the machine.
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const INDEX_CJS = path.resolve(__dirname, '..', 'index.cjs');
const ROUTE = '/api/more-like-this';
const GOOD_TOKEN = 'mlt-retire-1-test-token';
const FAKE_KEY = 'fake-key-mlt-retire-1-not-real';

const MODEL_MARKER = '[MLT-RETIRE-TEST] MODEL_CALL';
const LEDGER_MARKER = '[MLT-RETIRE-TEST] LEDGER_WRITE';
const WRITE_MARKER = '[MLT-RETIRE-TEST] FIRESTORE_WRITE';
const PICK_MARKER = '[MLT-RETIRE-TEST] POOL_PICK';
const SAVE_MARKER = '[MLT-RETIRE-TEST] POOL_SAVE';

/** A body the OLD handler accepted and generated variants for. */
const SEED = { subject: 'Maths', topicKey: 'arithmetic-progressions', seedQuestion: { text: 'Find the 10th term of 2, 5, 8, ...', marks: 2 }, numVariants: 3 };

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

function bootServer({ port }) {
  const launcher = `
    const Module = require('module');
    const say = (m) => process.stdout.write(m + '\\n');
    const logWrite = (key) => say((/usageLedger/.test(key) ? ${JSON.stringify(LEDGER_MARKER)} : ${JSON.stringify(WRITE_MARKER)}) + ' ' + key);
    const mkRef = (key) => ({ key, collection: (s) => ({ doc: (id) => mkRef(key + '/' + s + '/' + id) }),
      async get() { return { exists: false, data: () => undefined }; },
      async set() { logWrite(key); }, async update() { logWrite(key); }, async create() { logWrite(key); } });
    const db = { collection: (n) => ({ doc: (id) => mkRef(n + '/' + id) }),
      async runTransaction() { say(${JSON.stringify(WRITE_MARKER)} + ' transaction'); throw new Error('unused'); } };
    const firestore = () => db;
    firestore.FieldValue = { increment: (n) => ({ __increment: n }), serverTimestamp: () => ({ __ts: true }) };
    const fake = {
      apps: [],
      credential: { cert: () => ({}) },
      initializeApp() { fake.apps.push({}); },
      auth: () => ({ verifyIdToken: async (t) => { if (t === ${JSON.stringify(GOOD_TOKEN)}) return { uid: 'u-mlt-retire-1' }; throw new Error('bad token'); } }),
      appCheck: () => ({ verifyToken: async () => { throw new Error('no app check in this test'); } }),
      firestore,
    };
    const fakePool = {
      async pickFromPool() { say(${JSON.stringify(PICK_MARKER)}); return []; },
      async markServed() {},
      async saveToPool() { say(${JSON.stringify(SAVE_MARKER)}); },
    };
    const orig = Module._load;
    Module._load = function (r) {
      if (r === 'firebase-admin') return fake;
      if (/generatedQuestionPool\\.cjs$/.test(r)) return { ...orig.apply(this, arguments), ...fakePool };
      return orig.apply(this, arguments);
    };
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('generativelanguage.googleapis.com')) {
        say(${JSON.stringify(MODEL_MARKER)});
        const q = { questionText: 'Find the 12th term of 3, 7, 11, ...', marks: 2, answer: '47', solutionSteps: ['a=3, d=4', 'a12 = 3 + 11x4 = 47'], finalAnswer: '47' };
        return new Response(JSON.stringify({
          candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({ questions: [q, q, q] }) }] }, finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 100, totalTokenCount: 200 },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return realFetch(url, init);
    };
    require(${JSON.stringify(INDEX_CJS)});
  `;
  const env = { ...process.env, PORT: String(port), VITE_FIREBASE_PROJECT_ID: 'demo-mlt-retire-1', API_KEY: FAKE_KEY, AI_PROVIDER: 'gemini' };
  for (const k of ['GEMINI_API_KEY', 'DIRECT_GEMINI_API_KEY', 'AI_INTEGRATIONS_GEMINI_BASE_URL', 'AI_INTEGRATIONS_GEMINI_API_KEY',
    'AI_INTEGRATIONS_ANTHROPIC_BASE_URL', 'AI_INTEGRATIONS_ANTHROPIC_API_KEY', 'DATABASE_URL', 'STUB_MODE',
    'FAIR_USE_ENFORCE', 'FAIR_USE_ENFORCE_ALL_AI']) delete env[k];
  const child = spawn(process.execPath, ['-e', launcher], { env, cwd: path.dirname(INDEX_CJS) });
  const srv = { child, out: '' };
  child.stdout.on('data', (d) => { srv.out += d; });
  child.stderr.on('data', (d) => { srv.out += d; });
  srv.ready = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`server did not start:\n${srv.out}`)), 40000);
    const tick = setInterval(() => {
      if (/running on port/.test(srv.out)) { clearInterval(tick); clearTimeout(t); resolve(); }
      if (child.exitCode !== null) { clearInterval(tick); clearTimeout(t); reject(new Error(`server exited:\n${srv.out}`)); }
    }, 200);
  });
  srv.count = (marker) => srv.out.split('\n').filter((l) => l.startsWith(marker)).length;
  return srv;
}

function request(port, { method, route, body, token }) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? '' : JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const req = http.request({ host: '127.0.0.1', port, path: route, method, headers }, (res) => {
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(text); } catch {}
        resolve({ status: res.statusCode, json, text, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

/** Let any fire-and-forget work (ledger write, pool save) the handler started land in the output. */
const settle = () => new Promise((r) => setTimeout(r, 500));

function assertNothingSpent(srv, r) {
  const ctx = `\n--- response ---\n${r.status} ${r.text}\n--- server output ---\n${srv.out}`;
  assert.equal(srv.count(MODEL_MARKER), 0, `no model call${ctx}`);
  assert.equal(srv.count(LEDGER_MARKER), 0, `no usage-ledger write (no metering)${ctx}`);
  assert.equal(srv.count(WRITE_MARKER), 0, `no Firestore write of any kind (no trial counter)${ctx}`);
  assert.equal(srv.count(PICK_MARKER), 0, `the generated_questions pool is not read${ctx}`);
  assert.equal(srv.count(SAVE_MARKER), 0, `nothing is written to the generated_questions pool${ctx}`);
}

let srv;
let port;
test.before(async () => {
  port = await freePort();
  srv = bootServer({ port });
  await srv.ready;
});
test.after(() => { if (srv) srv.child.kill(); });

test('★ RED on the old code: a SIGNED-IN POST /api/more-like-this is refused 410 — no model call, no ledger write, no pool', { timeout: 90000 }, async () => {
  const r = await request(port, { method: 'POST', route: ROUTE, body: SEED, token: GOOD_TOKEN });
  await settle();
  assert.equal(r.status, 410, `expected 410, got ${r.status}: ${r.text}\n--- server output ---\n${srv.out}`);
  assert.equal(r.json && r.json.ok, false);
  assert.equal(r.json && r.json.error, 'gone');
  assert.equal(typeof (r.json && r.json.message), 'string');
  assert.equal(r.json && r.json.variants, undefined, 'no variants are served');
  assert.ok(!r.text.includes(FAKE_KEY));
  assertNothingSpent(srv, r);
});

test('★ RED on the old code: an UNAUTHENTICATED POST (a stale cached client) gets the same clean 410, not a 401', { timeout: 90000 }, async () => {
  const r = await request(port, { method: 'POST', route: ROUTE, body: SEED });
  await settle();
  assert.equal(r.status, 410, `expected 410, got ${r.status}: ${r.text}`);
  assert.equal(r.json && r.json.error, 'gone');
  assertNothingSpent(srv, r);
});

test('a POST with a query string or an unparseable body is refused the same way (no body is read)', { timeout: 90000 }, async () => {
  const q = await request(port, { method: 'POST', route: `${ROUTE}?v=2`, body: SEED, token: GOOD_TOKEN });
  assert.equal(q.status, 410, `got ${q.status}: ${q.text}`);
  const bad = await new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: ROUTE, method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GOOD_TOKEN}` } }, (res) => {
      let text = ''; res.on('data', (c) => { text += c; }); res.on('end', () => resolve({ status: res.statusCode, text }));
    });
    req.on('error', reject);
    req.end('{not json');
  });
  await settle();
  assert.equal(bad.status, 410, `got ${bad.status}: ${bad.text}`);
  assertNothingSpent(srv, bad);
});

test('the CORS preflight still answers 204, so a browser that still POSTs reads the 410 instead of a network error', { timeout: 90000 }, async () => {
  const r = await request(port, { method: 'OPTIONS', route: ROUTE });
  assert.equal(r.status, 204);
});

test('the path is gone from every metering / gate table; the read side of fair use is kept', () => {
  const { PAID_ENDPOINTS } = require('../services/rateLimiter.cjs');
  assert.equal(Object.prototype.hasOwnProperty.call(PAID_ENDPOINTS, ROUTE), false, 'not a paid (rate-limited, ledger-bound) endpoint');
  const fairUse = require('../services/fairUse.cjs');
  assert.equal(Object.prototype.hasOwnProperty.call(fairUse.AI_ROUTES, ROUTE), false, 'not an ALL-AI-METERING route');
  assert.deepEqual(Object.keys(fairUse.AI_ROUTES).sort(), ['/api/detect-question', '/api/tutor'], 'the other two AI routes are untouched');
  // Read side kept (GET /api/usage/me stays byte-identical): the trial view still reports the field.
  assert.equal(fairUse.resolveAiLimits({}).moreLikeThisPerDay, 5);
  const entitlement = require('../services/entitlement.cjs');
  for (const name of ['AI_CALLER_ROUTES', 'AI_TIER_GATED_ROUTES']) {
    const t = entitlement[name];
    if (!t) continue;
    const keys = Array.isArray(t) ? t : Object.keys(t);
    assert.equal(keys.includes(ROUTE), false, `${name} no longer names ${ROUTE}`);
  }
  const { classifyCall, UNCLASSIFIED_CALL_CLASS, WORKLOAD_BY_HANDLER } = require('../services/geminiClient.cjs');
  assert.equal(classifyCall({}, '    at async handleMoreLikeThis (/app/x.cjs:1:1)'), UNCLASSIFIED_CALL_CLASS, 'no billing class for the retired handler');
  assert.equal('handleMoreLikeThis' in WORKLOAD_BY_HANDLER, false);
});

test('the retired route module keeps no generation code (no model, prompt or pool dependency)', () => {
  const fs = require('node:fs');
  const src = fs.readFileSync(path.join(__dirname, 'moreLikeThis.cjs'), 'utf8');
  for (const name of ['callGemini', 'buildMoreLikeThisUserPrompt', 'pickFromPool', 'saveToPool', 'readJson', 'extractVariantsJson']) {
    assert.equal(src.includes(name), false, `routes/moreLikeThis.cjs must not reference ${name}`);
  }
  const prompts = require('../prompts/promptLearn.cjs');
  assert.equal(prompts.buildMoreLikeThisUserPrompt, undefined, 'the More-like-this prompt builder is deleted');
});
