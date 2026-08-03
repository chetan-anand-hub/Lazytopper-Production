// GATE-1 — server-side entitlement enforcement.
//
// ★ WHAT THIS SUITE IS FOR. A paywall that cannot be SHOWN to have refused a
// request is indistinguishable from no paywall. So nothing here asserts that a
// variable exists or that a module was imported: §5 drives a REAL http server
// through the REAL index.cjs dispatch and asserts on a REAL 402, and §6 drives
// the REAL aiClient.ts through a REAL fetch response. Every mutation listed in
// the lane spec reddens at least one named test below.
//
// Run: node --test lazytopper/server/services/entitlement.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const { spawn } = require('node:child_process');
const Module = require('node:module');
const vm = require('node:vm');

const ENT = require('./entitlement.cjs');
const {
  createEntitlementGate,
  deriveEffectiveTier,
  isEntitled,
  TRIAL_MS,
  CLOCK_SKEW_TOLERANCE_MS,
  ALLOW_EVENT,
  DENY_EVENT,
  FAIL_OPEN_EVENT,
  FAIL_OPEN_NO_ADMIN,
  FAIL_OPEN_NO_UID,
  FAIL_OPEN_NO_CREDENTIAL,
  FAIL_OPEN_READ_ERROR,
} = ENT;

const INDEX_CJS = path.resolve(__dirname, '..', 'index.cjs');
const NOW = Date.UTC(2026, 7, 3, 12, 0, 0);

/* ── harness ──────────────────────────────────────────────────────────────── */

function telemetryStub() {
  const counts = new Map();
  return {
    increment(event, value = 1) {
      counts.set(event, (counts.get(event) || 0) + value);
    },
    get: (event) => counts.get(event) || 0,
    events: () => [...counts.keys()],
  };
}

function loggerStub() {
  const warnings = [];
  return { warn: (m) => warnings.push(String(m)), warnings, error() {}, log() {} };
}

/** A Firestore Timestamp is duck-typed by toDate()/seconds — that IS the security boundary. */
const stamp = (ms) => ({ toDate: () => new Date(ms), seconds: Math.floor(ms / 1000) });

/**
 * @param doc  undefined => the document is ABSENT (a successful read of nothing).
 * @param opts.throwOn 'get' | 'data' to simulate a FAILED read.
 */
function firestoreStub(doc, opts = {}) {
  const calls = { get: 0 };
  return {
    calls,
    collection(name) {
      assert.equal(name, 'subscriptions', 'the gate must read the subscriptions collection');
      return {
        doc() {
          return {
            async get() {
              calls.get += 1;
              if (opts.throwOn === 'get') throw new Error('FIRESTORE UNAVAILABLE');
              if (doc === undefined) return { exists: false, data: () => null };
              return {
                exists: true,
                data() {
                  if (opts.throwOn === 'data') throw new Error('DECODE FAILED');
                  return doc;
                },
              };
            },
          };
        },
      };
    },
  };
}

function resStub() {
  const sent = [];
  return { sent, last: () => sent[sent.length - 1] };
}
const sendJsonStub = (res, status, body) => res.sent.push({ status, body });

function reqStub(withToken = true) {
  return { method: 'POST', headers: withToken ? { authorization: 'Bearer tok' } : {} };
}

function gateFor(doc, { throwOn, uid = 'u1', cacheTtlMs = 0, admin } = {}) {
  const telemetry = telemetryStub();
  const logger = loggerStub();
  const store = admin === null ? null : firestoreStub(doc, { throwOn });
  const gate = createEntitlementGate({
    adminFirestore: store,
    telemetry,
    logger,
    sendJson: sendJsonStub,
    now: () => NOW,
    cacheTtlMs,
  });
  return { gate, telemetry, logger, store, uid };
}

/* ══════════════════════════════════════════════════════════════════════════
   §1 · THE EFFECTIVE TIER IS NOT THE STORED FIELD
   These are the tests that stop the P0 being "fixed" while still open.
   ══════════════════════════════════════════════════════════════════════════ */

test('§1 a stored premium is premium', () => {
  assert.equal(deriveEffectiveTier({ tier: 'premium' }, NOW).tier, 'premium');
});

test('§1 a trial inside its window is trial', () => {
  const raw = { tier: 'trial', plan: 'trial_7day', trialStartDate: stamp(NOW - 2 * 86400000) };
  assert.equal(deriveEffectiveTier(raw, NOW).tier, 'trial');
});

test('§1 ★ a stored trial whose window ELAPSED is free — this is the day-7 hole', () => {
  const raw = { tier: 'trial', plan: 'trial_7day', trialStartDate: stamp(NOW - TRIAL_MS - 1000) };
  const out = deriveEffectiveTier(raw, NOW);
  assert.equal(out.tier, 'free', 'reading the raw tier field here re-opens the entire P0');
  assert.equal(isEntitled(out.tier), false);
});

test('§1 a trial that cannot prove when it began is free (fails closed)', () => {
  assert.equal(deriveEffectiveTier({ tier: 'trial', trialStartDate: null }, NOW).tier, 'free');
});

test('§1 a start beyond the skew tolerance is unprovable, so free', () => {
  const raw = { tier: 'trial', trialStartDate: stamp(NOW + CLOCK_SKEW_TOLERANCE_MS + 60000) };
  assert.equal(deriveEffectiveTier(raw, NOW).tier, 'free');
});

test('§1 ★ free + trial_7day + PINNED live start repairs to trial (mid-trial students)', () => {
  const raw = { tier: 'free', plan: 'trial_7day', trialStartDate: stamp(NOW - 86400000) };
  assert.equal(deriveEffectiveTier(raw, NOW).tier, 'trial');
});

test('§1 ★ the repair requires a SERVER-PINNED start — an ISO string never repairs', () => {
  const raw = {
    tier: 'free',
    plan: 'trial_7day',
    trialStartDate: new Date(NOW - 86400000).toISOString(),
  };
  assert.equal(
    deriveEffectiveTier(raw, NOW).tier,
    'free',
    'a client-writable ISO string must never grant a trial',
  );
});

test('§1 the repair does not resurrect an elapsed trial', () => {
  const raw = { tier: 'free', plan: 'trial_7day', trialStartDate: stamp(NOW - TRIAL_MS - 1) };
  assert.equal(deriveEffectiveTier(raw, NOW).tier, 'free');
});

test('§1 the repair never touches a premium record', () => {
  const raw = {
    tier: 'free', plan: 'trial_7day', premiumSince: '2026-01-01',
    trialStartDate: stamp(NOW - 1000),
  };
  assert.equal(deriveEffectiveTier(raw, NOW).tier, 'free');
});

test('§1 isEntitled: trial counts exactly as premium', () => {
  assert.equal(isEntitled('premium'), true);
  assert.equal(isEntitled('trial'), true);
  assert.equal(isEntitled('free'), false);
});

/* ══════════════════════════════════════════════════════════════════════════
   §2 · resolve() — assertions 1-6
   ══════════════════════════════════════════════════════════════════════════ */

test('A1 · a premium caller is entitled', async () => {
  const { gate, telemetry } = gateFor({ tier: 'premium' });
  const d = await gate.resolve('u1', reqStub());
  assert.equal(d.entitled, true);
  assert.equal(d.outcome, 'read');
  assert.equal(telemetry.get(ALLOW_EVENT), 1);
});

test('A2 · a TRIAL caller is entitled — trial == premium', async () => {
  const { gate } = gateFor({ tier: 'trial', plan: 'trial_7day', trialStartDate: stamp(NOW - 1000) });
  const d = await gate.resolve('u1', reqStub());
  assert.equal(d.entitled, true, 'a trial student is a premium student');
  assert.equal(d.tier, 'trial');
});

test('A3 · a free caller is NOT entitled', async () => {
  const { gate, telemetry } = gateFor({ tier: 'free', plan: 'none' });
  const d = await gate.resolve('u1', reqStub());
  assert.equal(d.entitled, false);
  assert.equal(d.tier, 'free');
  assert.equal(telemetry.get(DENY_EVENT), 1);
});

test('A4 · a FAILED entitlement read SERVES the request (fail-safe)', async () => {
  const { gate } = gateFor({ tier: 'free' }, { throwOn: 'get' });
  const d = await gate.resolve('u1', reqStub());
  assert.equal(d.entitled, true, 'an infrastructure blip must never lock out a paying student');
  assert.equal(d.outcome, 'fail-open');
});

test('A4b · a snapshot whose data() throws also fails open', async () => {
  const { gate } = gateFor({ tier: 'free' }, { throwOn: 'data' });
  assert.equal((await gate.resolve('u1', reqStub())).entitled, true);
});

test('A5 · an ABSENT document is free and denied — distinct from a failed read', async () => {
  const { gate } = gateFor(undefined);
  const d = await gate.resolve('u1', reqStub());
  assert.equal(d.entitled, false);
  assert.equal(d.tier, 'free');
  assert.equal(d.outcome, 'absent', 'absent is a SUCCESSFUL read of nothing, not a failure');
});

test('A6 · ★ a failed read emits the warning AND increments the counters', async () => {
  const { gate, telemetry, logger } = gateFor({ tier: 'free' }, { throwOn: 'get' });
  await gate.resolve('u1', reqStub());
  assert.equal(telemetry.get(FAIL_OPEN_EVENT), 1, 'the aggregate fail-open counter must fire');
  assert.equal(telemetry.get(FAIL_OPEN_READ_ERROR), 1, 'the reason counter must fire');
  assert.equal(logger.warnings.length, 1, 'a fail-open must be logged');
  assert.match(logger.warnings[0], /FAIL-OPEN/);
  assert.match(logger.warnings[0], /not being enforced/);
});

test('A6b · ★ credentials absent (no Firestore) fails open, warns and counts', async () => {
  const { gate, telemetry, logger } = gateFor(undefined, { admin: null });
  const d = await gate.resolve('u1', reqStub());
  assert.equal(d.entitled, true);
  assert.equal(telemetry.get(FAIL_OPEN_NO_ADMIN), 1);
  assert.equal(telemetry.get(FAIL_OPEN_EVENT), 1);
  assert.match(logger.warnings[0], /FAIL-OPEN/);
});

test('A6c · a token that did not verify counts as no_uid, NOT as no_credential', async () => {
  const { gate, telemetry } = gateFor({ tier: 'free' });
  await gate.resolve('', reqStub(true));
  assert.equal(telemetry.get(FAIL_OPEN_NO_UID), 1, 'credentials-broken must be legible on its own');
  assert.equal(telemetry.get(FAIL_OPEN_NO_CREDENTIAL), 0);
});

test('A6d · a signed-out caller counts as no_credential, NOT as no_uid', async () => {
  const { gate, telemetry } = gateFor({ tier: 'free' });
  await gate.resolve('', reqStub(false));
  assert.equal(telemetry.get(FAIL_OPEN_NO_CREDENTIAL), 1);
  assert.equal(telemetry.get(FAIL_OPEN_NO_UID), 0, 'routine traffic must not drown the real signal');
});

/* ── the cache (§3E) ──────────────────────────────────────────────────────── */

test('§3E an ENTITLED decision is cached — the second call does not read', async () => {
  const { gate, store } = gateFor({ tier: 'premium' }, { cacheTtlMs: 60000 });
  await gate.resolve('u1', reqStub());
  await gate.resolve('u1', reqStub());
  assert.equal(store.calls.get, 1);
});

test('§3E ★ a DENIAL is never cached, so an upgrade is honoured on the very next call', async () => {
  const { gate, store } = gateFor({ tier: 'free' }, { cacheTtlMs: 60000 });
  await gate.resolve('u1', reqStub());
  await gate.resolve('u1', reqStub());
  assert.equal(store.calls.get, 2, 'a student who pays must not wait out a TTL');
  assert.equal(gate._cacheSize(), 0);
});

/* ══════════════════════════════════════════════════════════════════════════
   §3 · THE ROUTE BOUNDARY — assertions 3, 7, 10
   ══════════════════════════════════════════════════════════════════════════ */

const GATED = ['/api/check-solution', '/api/grade-worksheet', '/api/tutor'];

for (const p of GATED) {
  test(`A7 · ${p} returns 402 for a free caller — not 403, not 200`, async () => {
    const { gate } = gateFor({ tier: 'free' });
    const res = resStub();
    const handled = await gate.applyToRequest(reqStub(), res, p, 'u1');
    assert.equal(handled, true, 'the boundary must have responded');
    const out = res.last();
    assert.equal(out.status, 402, '402 Payment Required, never 403');
    assert.equal(out.body.error, 'premium_required');
    assert.equal(out.body.tier, 'free');
    assert.ok(out.body.feature, 'the client needs to know which feature');
  });

  test(`A1/A2 · ${p} passes a premium caller straight through`, async () => {
    const { gate } = gateFor({ tier: 'premium' });
    const res = resStub();
    assert.equal(await gate.applyToRequest(reqStub(), res, p, 'u1'), false);
    assert.equal(res.sent.length, 0, 'an entitled caller must see nothing from the gate');
  });
}

test('A3 · the 402 carries the derived trialEndedAt when a trial has elapsed', async () => {
  const start = NOW - TRIAL_MS - 1000;
  const { gate } = gateFor({ tier: 'trial', plan: 'trial_7day', trialStartDate: stamp(start) });
  const res = resStub();
  await gate.applyToRequest(reqStub(), res, '/api/check-solution', 'u1');
  assert.equal(res.last().status, 402);
  assert.equal(res.last().body.trialEndedAt, new Date(start + TRIAL_MS).toISOString());
});

test('§3D ★ the 402 message is plain English — no underscore, no error code, no fault', async () => {
  const { gate } = gateFor({ tier: 'free' });
  for (const p of GATED) {
    const res = resStub();
    await gate.applyToRequest(reqStub(), res, p, 'u1');
    const msg = res.last().body.message;
    assert.ok(typeof msg === 'string' && msg.length > 0, `${p} must carry a student-facing message`);
    assert.ok(!msg.includes('_'), `${p}: a student must never be shown an underscore: ${msg}`);
    assert.doesNotMatch(msg, /denied|unauthori|forbidden|error|failed|invalid|402/i,
      `${p}: a locked feature is not a mistake the student made: ${msg}`);
    assert.match(msg, /Premium/, `${p}: the message must say what it is`);
  }
});

test('A10 · ungated endpoints are untouched and cost no Firestore read', async () => {
  const { gate, store } = gateFor({ tier: 'free' });
  for (const p of [
    '/api/questions', '/api/detect-question', '/api/generate-visual',
    '/api/generate-diagram', '/api/ai-questions', '/api/more-like-this',
    '/api/qr-upload/new', '/api/share-token', '/api/health',
  ]) {
    const res = resStub();
    assert.equal(await gate.applyToRequest(reqStub(), res, p, 'u1'), false, `${p} must not be gated`);
    assert.equal(res.sent.length, 0);
  }
  assert.equal(store.calls.get, 0, 'an ungated path must not spend a read');
});

/* ══════════════════════════════════════════════════════════════════════════
   §4 · /api/step-solution — assertions 8 and 9, driven through the REAL handler
   ══════════════════════════════════════════════════════════════════════════ */

const { createStepSolutionRoute } = require('../routes/stepSolution.cjs');

function stepHarness(tierDoc) {
  const { gate } = gateFor(tierDoc);
  const geminiCalls = [];
  const route = createStepSolutionRoute({
    readJson: async (req) => req.body,
    sendJson: sendJsonStub,
    callGemini: async () => {
      geminiCalls.push(1);
      return JSON.stringify({ steps: [{ title: 'S', detail: 'd', marks: 1 }], finalAnswer: '4' });
    },
    GEMINI_MODEL: 'm',
    ACTIVE_PROVIDER: 'gemini',
    isStubMode: () => false,
    buildFallbackSteps: () => ({ steps: [], source: 'fallback' }),
    buildStubStepSolution: () => ({ steps: [], source: 'stub' }),
    isObjectiveType: () => false,
    extractJsonObjectFromText: (t) => { try { return JSON.parse(t); } catch { return null; } },
  });
  return { route, gate, geminiCalls };
}

/**
 * Faithful to index.cjs: the boundary runs FIRST and, if it responded, dispatch
 * never happens. Discarding the boundary's verdict here would make this harness
 * blind to the endpoint being gated wholesale — the exact mutation §5 asks for.
 */
async function driveStep(body, gate, route) {
  const req = { method: 'POST', headers: { authorization: 'Bearer tok' }, body };
  const boundaryRes = resStub();
  const handled = await gate.applyToRequest(req, boundaryRes, '/api/step-solution', 'u1');
  if (handled) return boundaryRes.last();
  const res = resStub();
  await route.handleStepSolution(req, res);
  return res.last();
}

test('A8 · ★ a BANK-backed solution serves a FREE caller — steps stay free', async () => {
  const { route, gate, geminiCalls } = stepHarness({ tier: 'free' });
  const out = await driveStep(
    { question: 'Solve 2+2', marks: 1, solutionSteps: ['Add them', 'Answer 4'], finalAnswer: '4' },
    gate, route,
  );
  assert.equal(out.status, 200, 'gating the bank path would gate a feature students rightly expect');
  assert.equal(geminiCalls.length, 0);
});

test('A8b · the boundary attaches the resolver but spends NO read on the free path', async () => {
  const { gate, store } = gateFor({ tier: 'free' });
  const req = reqStub();
  assert.equal(await gate.applyToRequest(req, resStub(), '/api/step-solution', 'u1'), false);
  assert.equal(typeof req.lazytopperEntitlement.requireForGeneration, 'function');
  assert.equal(store.calls.get, 0, 'the resolver must be LAZY');
});

test('A9 · ★ generation (bank empty + cache miss) returns 402 for a FREE caller', async () => {
  const { route, gate, geminiCalls } = stepHarness({ tier: 'free' });
  const out = await driveStep({ question: 'An unbanked question', marks: 3 }, gate, route);
  assert.equal(out.status, 402);
  assert.equal(out.body.error, 'premium_required');
  assert.equal(out.body.feature, 'step-solution-generation');
  assert.equal(geminiCalls.length, 0, 'the whole point is that no money is spent');
  assert.ok(!out.body.message.includes('_'));
});

test('A9b · generation proceeds for a PREMIUM caller', async () => {
  const { route, gate, geminiCalls } = stepHarness({ tier: 'premium' });
  const out = await driveStep({ question: 'An unbanked question', marks: 3 }, gate, route);
  assert.equal(out.status, 200);
  assert.equal(geminiCalls.length, 1);
});

test('A9c · generation is SERVED when the entitlement read fails (fail-safe holds here too)', async () => {
  const { gate } = gateFor({ tier: 'free' }, { throwOn: 'get' });
  const { route, geminiCalls } = stepHarness({ tier: 'free' });
  const req = { method: 'POST', headers: { authorization: 'Bearer tok' }, body: { question: 'Q', marks: 3 } };
  await gate.applyToRequest(req, resStub(), '/api/step-solution', 'u1');
  const res = resStub();
  await route.handleStepSolution(req, res);
  assert.equal(res.last().status, 200);
  assert.equal(geminiCalls.length, 1);
});

/* ══════════════════════════════════════════════════════════════════════════
   §5 · CONTROL 1 + CONTROL 2 — a REAL request through the REAL index.cjs
   A middleware that is wired but never evaluated is a silent no-op. These two
   tests are the only proof that the gate is reached by an actual HTTP request.
   ══════════════════════════════════════════════════════════════════════════ */

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
 * Boot the REAL server in a child process.
 *
 * `stubAdmin` swaps firebase-admin through Module._load BEFORE index.cjs is
 * required, so no test seam is needed in production code. Omit it to reproduce
 * the credentials-absent deploy exactly.
 */
function bootServer({ port, stubAdmin, tier }) {
  const launcher = `
    const Module = require('module');
    ${stubAdmin ? `
    const DOC = ${JSON.stringify({ tier })};
    const fake = {
      apps: [],
      credential: { cert: () => ({}) },
      initializeApp() { fake.apps.push({}); },
      auth: () => ({ verifyIdToken: async () => ({ uid: 'student-1' }) }),
      firestore: () => ({
        collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => DOC }) }) }),
      }),
    };
    const orig = Module._load;
    Module._load = function (r) { return r === 'firebase-admin' ? fake : orig.apply(this, arguments); };
    ` : ''}
    require(${JSON.stringify(INDEX_CJS)});
  `;
  const env = { ...process.env, PORT: String(port) };
  delete env.GEMINI_API_KEY; delete env.DIRECT_GEMINI_API_KEY;
  delete env.REPLIT_GEMINI_BASE_URL; delete env.REPLIT_ANTHROPIC_BASE_URL;
  delete env.DATABASE_URL;
  if (stubAdmin) env.VITE_FIREBASE_PROJECT_ID = 'demo-gate1';
  else delete env.VITE_FIREBASE_PROJECT_ID;

  const child = spawn(process.execPath, ['-e', launcher], { env, cwd: path.dirname(INDEX_CJS) });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const ready = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`server did not start:\n${out}`)), 40000);
    const tick = setInterval(() => {
      if (/running on port/.test(out)) { clearInterval(tick); clearTimeout(t); resolve(); }
      if (child.exitCode !== null) {
        clearInterval(tick); clearTimeout(t); reject(new Error(`server exited:\n${out}`));
      }
    }, 200);
  });
  return { child, ready, log: () => out };
}

function post(port, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      { host: '127.0.0.1', port, path: urlPath, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers } },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(text); } catch {}
          resolve({ status: res.statusCode, json, text });
        });
      },
    );
    req.on('error', reject);
    req.end(payload);
  });
}

test('CONTROL 1 · ★ a REAL free caller gets a REAL 402 from the REAL /api/check-solution',
  { timeout: 90000 }, async (t) => {
    const port = await freePort();
    const srv = bootServer({ port, stubAdmin: true, tier: 'free' });
    t.after(() => srv.child.kill());
    await srv.ready;

    const res = await post(port, '/api/check-solution',
      { question: 'Q', marks: 3, textAnswer: 'a' }, { authorization: 'Bearer real-token' });

    assert.equal(res.status, 402, `expected a real 402 over HTTP, got ${res.status}: ${res.text}`);
    assert.equal(res.json.error, 'premium_required');
    assert.equal(res.json.feature, 'check-solution');
    assert.ok(!res.json.message.includes('_'));
  });

test('CONTROL 1b · ★ a REAL premium caller is SERVED by the same real route',
  { timeout: 90000 }, async (t) => {
    const port = await freePort();
    const srv = bootServer({ port, stubAdmin: true, tier: 'premium' });
    t.after(() => srv.child.kill());
    await srv.ready;

    const res = await post(port, '/api/check-solution',
      { question: 'Q', marks: 3, textAnswer: 'a' }, { authorization: 'Bearer real-token' });

    assert.notEqual(res.status, 402, 'the gate must not refuse a premium student');
  });

test('CONTROL 2 · ★ credentials ABSENT: the real server SERVES and WARNS',
  { timeout: 90000 }, async (t) => {
    const port = await freePort();
    const srv = bootServer({ port, stubAdmin: false });
    t.after(() => srv.child.kill());
    await srv.ready;

    const res = await post(port, '/api/check-solution',
      { question: 'Q', marks: 3, textAnswer: 'a' }, { authorization: 'Bearer real-token' });

    assert.notEqual(res.status, 402,
      'with no credentials the gate MUST fail open — a blip may never lock out a paying student');

    await new Promise((r) => setTimeout(r, 300));
    const log = srv.log();
    assert.match(log, /\[entitlement\] FAIL-OPEN/,
      `the fail-open MUST be observable, or an open paywall looks exactly like a working one.\n${log}`);
    assert.match(log, /not being enforced/);
  });

/* ══════════════════════════════════════════════════════════════════════════
   §6 · ASSERTION 11 — the CLIENT turns a 402 into plain English
   Drives the REAL src/ai/aiClient.ts, transpiled the same way index.cjs does.
   ══════════════════════════════════════════════════════════════════════════ */

function loadAiClient() {
  const ts = require('typescript');
  const file = path.resolve(__dirname, '..', '..', 'src', 'ai', 'aiClient.ts');
  const source = fs.readFileSync(file, 'utf8').replace(/\bimport\.meta\b/g, '({ env: process.env })');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: 'CommonJS', target: 'ES2020', esModuleInterop: true },
    fileName: 'aiClient.ts',
  });
  const mod = { exports: {} };
  const localRequire = (spec) =>
    spec === './paidCallHeaders'
      ? { paidJsonHeaders: async () => ({ 'Content-Type': 'application/json' }) }
      : require(spec);
  vm.runInThisContext(`(function(exports, require, module, __filename, __dirname){${outputText}\n})`, {
    filename: file,
  })(mod.exports, localRequire, mod, file, path.dirname(file));
  return mod.exports;
}

test('A11 · ★ the client turns a 402 into the plain-English message, never the raw code', async () => {
  const aiClient = loadAiClient();
  const serverBody = ENT.GATED_ROUTES['/api/tutor'];

  const original = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 402,
    text: async () => JSON.stringify({
      error: 'premium_required',
      feature: 'tutor',
      tier: 'free',
      message: serverBody.message,
      trialEndedAt: '2026-08-09T00:00:00.000Z',
    }),
  });

  try {
    let caught = null;
    try {
      await aiClient.callMentor('explain', { subject: 'Maths' });
    } catch (e) {
      caught = e;
    }

    assert.ok(caught, 'the call must reject');
    assert.equal(aiClient.isPremiumRequiredError(caught), true, 'it must be the typed error');
    assert.equal(caught.message, serverBody.message);
    assert.notEqual(caught.message, 'premium_required');
    assert.ok(!caught.message.includes('_'),
      `a fifteen-year-old must never be shown a code: ${caught.message}`);
    assert.equal(caught.feature, 'tutor');
    assert.equal(caught.tier, 'free');
    assert.equal(caught.trialEndedAt, '2026-08-09T00:00:00.000Z');
  } finally {
    globalThis.fetch = original;
  }
});

test('A11b · a 402 with no message still yields plain English, never the code', async () => {
  const aiClient = loadAiClient();
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false, status: 402,
    text: async () => JSON.stringify({ error: 'premium_required' }),
  });
  try {
    await assert.rejects(
      () => aiClient.callMentor('explain', { subject: 'Maths' }),
      (e) => {
        assert.equal(aiClient.isPremiumRequiredError(e), true);
        assert.ok(!e.message.includes('_'), e.message);
        assert.match(e.message, /Premium/);
        return true;
      },
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('A11c · CONTROL — a non-402 error is untouched by the new branch', async () => {
  const aiClient = loadAiClient();
  const original = globalThis.fetch;
  const errs = [];
  const origErr = console.error;
  console.error = (...a) => errs.push(a);
  globalThis.fetch = async () => ({
    ok: false, status: 500, text: async () => JSON.stringify({ error: 'boom' }),
  });
  try {
    await assert.rejects(
      () => aiClient.callMentor('explain', { subject: 'Maths' }),
      (e) => {
        assert.equal(aiClient.isPremiumRequiredError(e), false,
          'the 402 branch must not swallow ordinary failures');
        assert.equal(e.message, 'boom');
        return true;
      },
    );
  } finally {
    globalThis.fetch = original;
    console.error = origErr;
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   §7 · ASSERTION 12 — the 64 pre-existing grader tests are untouched by design
   ══════════════════════════════════════════════════════════════════════════ */

test('A12 · the grader handlers are reachable ONLY through the index.cjs dispatch', () => {
  // The route-boundary ruling is sound only while no gated handler has a second
  // entry point. gradeStructuredSet is module-internal (never exported), and the
  // three handlers are exported solely for the single dispatch in index.cjs.
  const routeSrc = fs.readFileSync(path.resolve(__dirname, '..', 'routes', 'checkSolution.cjs'), 'utf8');
  assert.match(routeSrc, /return \{ handleCheckSolution, handleDetectQuestion, handleGradeWorksheet \};/,
    'if gradeStructuredSet is ever exported, it gains an entry point the boundary cannot see');
  assert.ok(!/gradeStructuredSet,/.test(routeSrc.split('module.exports')[1] || ''),
    'gradeStructuredSet must stay module-internal');
});
