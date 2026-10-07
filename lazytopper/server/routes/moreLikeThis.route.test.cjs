/**
 * moreLikeThis.route.test — /api/more-like-this over the REAL index.cjs (MLT-FIX-1).
 *
 * ★ THE DEFECT THIS SUITE PINS. #516 (a86feda9, 2026-07-21) deleted the mentor route
 * that used to hand `buildMoreLikeThisUserPrompt` to index.cjs, and replaced it with
 *
 *     const { buildMoreLikeThisUserPrompt } = require('./prompts/promptLearn.cjs');
 *
 * but promptLearn.cjs exported only `{ createLearnPrompts }` — the builder lived INSIDE
 * that factory. The destructured name was `undefined`, so `handleMoreLikeThis` threw
 * `TypeError: buildMoreLikeThisUserPrompt is not a function` and the server answered
 * 500 on every non-stub request. The call sits BEFORE the pool check, so a pool HIT
 * failed exactly like a miss. Stub mode (no key) never reaches the builder, which is
 * why nothing local ever saw it.
 *
 * ★ WHY OVER THE REAL index.cjs. The defect is in the WIRING (what index.cjs imports),
 * not in the builder or the route factory, each of which is fine on its own. A test
 * that builds the route with a hand-passed builder would stay green on the broken
 * trunk. So this suite boots index.cjs in a child process and talks HTTP to it.
 *
 * Stubbed, and only these: the model's HTTP endpoint (globalThis.fetch, for
 * generativelanguage.googleapis.com only), firebase-admin (no network, one accepted
 * test token), and — in the pool-HIT case only — the pool module, because the real
 * pool needs Postgres. The key is a FAKE value; no request leaves the machine.
 *
 * Sign-in behaviour on this route is AUTHGATE-2's to test; every request here is a
 * verified caller so the suite is indifferent to that gate.
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const INDEX_CJS = path.resolve(__dirname, '..', 'index.cjs');
const ROUTE = '/api/more-like-this';
const GOOD_TOKEN = 'mlt-fix-1-test-token';
const FAKE_KEY = 'fake-key-mlt-fix-1-not-real';

const MODEL_MARKER = '[MLT-TEST] MODEL_CALL';
const SERVED_MARKER = '[MLT-TEST] MARK_SERVED';

/** Three COMPLETE variants (text + answer + solutionSteps + finalAnswer) as the model returns them. */
const MODEL_QUESTIONS = [1, 2, 3].map((n) => ({
  questionText: `Find the ${n}th term of the AP 3, 7, 11, ...`,
  marks: 2,
  difficulty: 'Medium',
  bloomSkill: 'Applying',
  answer: String(3 + (n - 1) * 4),
  solutionSteps: ['a = 3, d = 4', `a_${n} = a + (${n} - 1)d = ${3 + (n - 1) * 4}`],
  finalAnswer: `∴ a_${n} = ${3 + (n - 1) * 4}`,
}));

const PAYLOAD = {
  subject: 'Maths',
  topicKey: 'arithmetic-progressions',
  seedQuestion: { text: 'Find the 10th term of the AP 2, 7, 12, ...', marks: 2, difficulty: 'Medium', bloomSkill: 'Applying' },
  numVariants: 3,
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

/**
 * Boot the REAL index.cjs. `poolRows` > 0 replaces the pool module with one that holds
 * that many stored rows (the pool-HIT case); otherwise the real pool module runs with no
 * DATABASE_URL, i.e. a genuine pool miss.
 */
function bootServer({ port, poolRows = 0 }) {
  const launcher = `
    const Module = require('module');
    const mkRef = (key) => ({ key, collection: (s) => ({ doc: (id) => mkRef(key + '/' + s + '/' + id) }),
      async get() { return { exists: false, data: () => undefined }; }, async set() {} });
    const fake = {
      apps: [],
      credential: { cert: () => ({}) },
      initializeApp() { fake.apps.push({}); },
      auth: () => ({ verifyIdToken: async (t) => { if (t === ${JSON.stringify(GOOD_TOKEN)}) return { uid: 'u-mlt-1' }; throw new Error('bad token'); } }),
      appCheck: () => ({ verifyToken: async () => { throw new Error('no app check in this test'); } }),
      firestore: () => ({ collection: (n) => ({ doc: (id) => mkRef(n + '/' + id) }), async runTransaction() { throw new Error('unused'); } }),
    };
    const poolRows = ${Number(poolRows) || 0};
    const fakePool = {
      async pickFromPool(topicKey, subject, marks, difficulty, n) {
        return Array.from({ length: poolRows }, (_, i) => ({ id: 900 + i, text: 'Pooled question ' + i, marks, difficulty,
          answer: 'x', solutionSteps: ['s'], finalAnswer: 'f' })).slice(0, n);
      },
      async markServed(ids) { process.stdout.write(${JSON.stringify(SERVED_MARKER)} + ' ' + ids.length + '\\n'); },
      async saveToPool() {},
    };
    const orig = Module._load;
    Module._load = function (r) {
      if (r === 'firebase-admin') return fake;
      if (poolRows > 0 && /generatedQuestionPool\\.cjs$/.test(r)) return { ...orig.apply(this, arguments), ...fakePool };
      return orig.apply(this, arguments);
    };
    const realFetch = globalThis.fetch;
    const modelText = ${JSON.stringify(JSON.stringify({ questions: MODEL_QUESTIONS }))};
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('generativelanguage.googleapis.com')) {
        process.stdout.write(${JSON.stringify(MODEL_MARKER)} + '\\n');
        return new Response(JSON.stringify({
          candidates: [{ content: { role: 'model', parts: [{ text: modelText }] }, finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return realFetch(url, init);
    };
    require(${JSON.stringify(INDEX_CJS)});
  `;
  const env = { ...process.env, PORT: String(port), VITE_FIREBASE_PROJECT_ID: 'demo-mlt-fix-1', API_KEY: FAKE_KEY, AI_PROVIDER: 'gemini' };
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

function post(port, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      { host: '127.0.0.1', port, path: ROUTE, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), Authorization: `Bearer ${GOOD_TOKEN}` } },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(text); } catch {}
          resolve({ status: res.statusCode, json, text });
        });
      }
    );
    req.on('error', reject);
    req.end(payload);
  });
}

/** The MoreLikeThisResponse / MoreLikeThisVariant shape the client reads (src/ai/aiClient.ts generateMoreLikeThis). */
function assertClientShape(json, n) {
  assert.ok(json && typeof json === 'object', 'a JSON body');
  assert.equal(typeof json.subject, 'string');
  assert.equal(json.topicKey, PAYLOAD.topicKey);
  assert.ok(Array.isArray(json.variants), 'variants is an array');
  assert.equal(json.variants.length, n);
  json.variants.forEach((v, i) => {
    assert.equal(typeof v.text, 'string');
    assert.ok(v.text.length > 0, 'variant text is non-empty');
    assert.equal(v.index, i);
    assert.equal(typeof v.answer, 'string');
    assert.ok(Array.isArray(v.solutionSteps) && v.solutionSteps.length > 0, 'solutionSteps');
    assert.equal(typeof v.finalAnswer, 'string');
    assert.equal(v.id, undefined, 'no pool row id leaks to the client');
  });
}

test('POOL MISS over the REAL index.cjs: 200, the model is called ONCE, variants in the client shape', { timeout: 90000 }, async (t) => {
  const port = await freePort();
  const srv = bootServer({ port });
  t.after(() => srv.child.kill());
  await srv.ready;
  const r = await post(port, PAYLOAD);
  assert.equal(r.status, 200, `expected 200, got ${r.status}: ${r.text}\n--- server output ---\n${srv.out}`);
  assert.equal(srv.count(MODEL_MARKER), 1, 'exactly one model call on a pool miss');
  assert.equal(r.json.provider, 'gemini');
  assertClientShape(r.json, 3);
  assert.equal(r.json.variants[0].text, MODEL_QUESTIONS[0].questionText, 'the variants are the model\'s, not invented');
  assert.ok(!r.text.includes(FAKE_KEY), 'the key never appears in a response');
});

test('POOL HIT over the REAL index.cjs: 200 from the pool, NO model call, rows marked served', { timeout: 90000 }, async (t) => {
  const port = await freePort();
  const srv = bootServer({ port, poolRows: 3 });
  t.after(() => srv.child.kill());
  await srv.ready;
  const r = await post(port, PAYLOAD);
  assert.equal(r.status, 200, `expected 200, got ${r.status}: ${r.text}\n--- server output ---\n${srv.out}`);
  assert.equal(srv.count(MODEL_MARKER), 0, 'a pool hit never calls the model');
  assert.equal(srv.count(SERVED_MARKER), 1, 'the served rows are marked once');
  assert.equal(r.json.provider, 'pool');
  assertClientShape(r.json, 3);
});

test('the module index.cjs imports the builder from exports it as a function (the wiring, statically)', () => {
  const src = require('fs').readFileSync(INDEX_CJS, 'utf8');
  const m = src.match(/const\s*\{\s*buildMoreLikeThisUserPrompt\s*\}\s*=\s*require\('(\.\/prompts\/[^']+)'\)/);
  assert.ok(m, 'index.cjs still imports buildMoreLikeThisUserPrompt by destructuring a require — re-read this test if that changed');
  const mod = require(path.resolve(path.dirname(INDEX_CJS), m[1]));
  assert.equal(typeof mod.buildMoreLikeThisUserPrompt, 'function', `${m[1]} must export buildMoreLikeThisUserPrompt`);
  const { userPrompt, numVariants } = mod.buildMoreLikeThisUserPrompt({ ...PAYLOAD, numVariants: 99 });
  assert.equal(numVariants, 10, 'numVariants is clamped to 10');
  assert.match(userPrompt, /Find the 10th term of the AP 2, 7, 12/);
  // The factory still hands out the SAME builder (one source, not a copy).
  assert.equal(typeof mod.createLearnPrompts, 'function');
  assert.strictEqual(mod.createLearnPrompts({}).buildMoreLikeThisUserPrompt, mod.buildMoreLikeThisUserPrompt);
});
