/**
 * aiQuestions.route.test — MLT-MUTE-1 over the REAL index.cjs.
 *
 * ★ THE DEFECT THIS SUITE PINS. POST /api/ai-questions had NO auth: any caller could write
 * rows into the generated_questions cache, which "More like this" then served to students as
 * practice questions (and as the marking key grading used, and into Mistake Intelligence).
 * GET served that same unverified cache. MLT-MUTE-1 retires both: 410, no body read, no pool
 * read or write, no model call.
 *
 * RED on the old code: the unauthenticated POST answered 200 and called saveToPool (the
 * POOL_SAVE marker below); the GET answered 200 and called pickFromPool (POOL_PICK).
 *
 * ★ WHY OVER THE REAL index.cjs (as moreLikeThis.route.test does): a refusal in the route
 * factory proves nothing if index.cjs dispatches the path somewhere else. Stubbed, and only
 * these: firebase-admin (no network), the pool module (it would need Postgres; every call is
 * logged) and the model's HTTP endpoint (every call is logged). No request leaves the machine.
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const INDEX_CJS = path.resolve(__dirname, '..', 'index.cjs');
const GOOD_TOKEN = 'mlt-mute-1-test-token';
const FAKE_KEY = 'fake-key-mlt-mute-1-not-real';

const MODEL_MARKER = '[MLT-MUTE-TEST] MODEL_CALL';
const SAVE_MARKER = '[MLT-MUTE-TEST] POOL_SAVE';
const PICK_MARKER = '[MLT-MUTE-TEST] POOL_PICK';

/** A body the OLD handler accepted and saved (topicKey + subject + a complete variant). */
const POISON = {
  topicKey: 'arithmetic-progressions',
  subject: 'Maths',
  difficulty: 'Medium',
  marks: 2,
  variants: [{ text: 'An unverified question written by anyone', marks: 2, difficulty: 'Medium',
    answer: '42', solutionSteps: ['step'], finalAnswer: '42' }],
};

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
    const mkRef = (key) => ({ key, collection: (s) => ({ doc: (id) => mkRef(key + '/' + s + '/' + id) }),
      async get() { return { exists: false, data: () => undefined }; }, async set() {} });
    const fake = {
      apps: [],
      credential: { cert: () => ({}) },
      initializeApp() { fake.apps.push({}); },
      auth: () => ({ verifyIdToken: async (t) => { if (t === ${JSON.stringify(GOOD_TOKEN)}) return { uid: 'u-mlt-mute-1' }; throw new Error('bad token'); } }),
      appCheck: () => ({ verifyToken: async () => { throw new Error('no app check in this test'); } }),
      firestore: () => ({ collection: (n) => ({ doc: (id) => mkRef(n + '/' + id) }), async runTransaction() { throw new Error('unused'); } }),
    };
    const say = (m) => process.stdout.write(m + '\\n');
    const fakePool = {
      async pickFromPool() { say(${JSON.stringify(PICK_MARKER)}); return [{ id: 1, text: 'Pooled', marks: 2, difficulty: 'Medium', answer: 'a', solutionSteps: ['s'], finalAnswer: 'f' }]; },
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
        return new Response(JSON.stringify({
          candidates: [{ content: { role: 'model', parts: [{ text: '{"questions":[]}' }] }, finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return realFetch(url, init);
    };
    require(${JSON.stringify(INDEX_CJS)});
  `;
  const env = { ...process.env, PORT: String(port), VITE_FIREBASE_PROJECT_ID: 'demo-mlt-mute-1', API_KEY: FAKE_KEY, AI_PROVIDER: 'gemini' };
  for (const k of ['GEMINI_API_KEY', 'DIRECT_GEMINI_API_KEY', 'AI_INTEGRATIONS_GEMINI_BASE_URL', 'AI_INTEGRATIONS_GEMINI_API_KEY',
    'AI_INTEGRATIONS_ANTHROPIC_BASE_URL', 'AI_INTEGRATIONS_ANTHROPIC_API_KEY', 'DATABASE_URL', 'STUB_MODE']) delete env[k];
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
        resolve({ status: res.statusCode, json, text });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

/** Let any fire-and-forget work the handler started land in the child's output. */
const settle = () => new Promise((r) => setTimeout(r, 400));

let srv;
let port;
test.before(async () => {
  port = await freePort();
  srv = bootServer({ port });
  await srv.ready;
});
test.after(() => { if (srv) srv.child.kill(); });

test('★ RED on the old code: an UNAUTHENTICATED POST /api/ai-questions is refused 410 and writes nothing, calls no model', { timeout: 90000 }, async () => {
  const r = await request(port, { method: 'POST', route: '/api/ai-questions', body: POISON });
  await settle();
  assert.equal(r.status, 410, `expected 410, got ${r.status}: ${r.text}\n--- server output ---\n${srv.out}`);
  assert.equal(r.json && r.json.ok, false);
  assert.equal(r.json && r.json.error, 'gone');
  assert.equal(srv.count(SAVE_MARKER), 0, 'nothing reaches the generated_questions pool');
  assert.equal(srv.count(MODEL_MARKER), 0, 'no model call');
  assert.ok(!r.text.includes(FAKE_KEY));
});

test('a SIGNED-IN POST /api/ai-questions is refused the same way — the route is retired, not merely gated', { timeout: 90000 }, async () => {
  const r = await request(port, { method: 'POST', route: '/api/ai-questions', body: POISON, token: GOOD_TOKEN });
  await settle();
  assert.equal(r.status, 410, `got ${r.status}: ${r.text}`);
  assert.equal(srv.count(SAVE_MARKER), 0);
  assert.equal(srv.count(MODEL_MARKER), 0);
});

test('★ RED on the old code: GET /api/ai-questions no longer serves the unverified cache', { timeout: 90000 }, async () => {
  const r = await request(port, { method: 'GET', route: '/api/ai-questions?topicKey=arithmetic-progressions&subject=Maths&n=5' });
  await settle();
  assert.equal(r.status, 410, `got ${r.status}: ${r.text}`);
  assert.equal(srv.count(PICK_MARKER), 0, 'the pool is not read');
  assert.ok(!r.text.includes('Pooled'), 'no cached question is served');
});

test('control: an UNAUTHENTICATED POST /api/more-like-this is refused before any model call (MLT-RETIRE-1: now 410, retired like this route)', { timeout: 90000 }, async () => {
  const r = await request(port, { method: 'POST', route: '/api/more-like-this',
    body: { subject: 'Maths', topicKey: 'arithmetic-progressions', seedQuestion: { text: 'Seed', marks: 2 }, numVariants: 3 } });
  await settle();
  assert.equal(r.status, 410, `expected 410, got ${r.status}: ${r.text}`);
  assert.equal(srv.count(MODEL_MARKER), 0, 'no model call');
});

test('the client no longer names /api/ai-questions or /api/more-like-this from the practice-set builder', () => {
  const fs = require('node:fs');
  const builder = fs.readFileSync(path.resolve(__dirname, '..', '..', 'src', 'components', 'practice', 'practiceQuestionBuilder.ts'), 'utf8');
  for (const name of ['generateMoreLikeThis', 'fetchCachedAiQuestions', 'saveAiGeneratedQuestions']) {
    assert.equal(builder.includes(name), false, `practiceQuestionBuilder.ts must not reference ${name}`);
  }
});
