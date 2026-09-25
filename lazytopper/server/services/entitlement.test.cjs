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
  FAIL_OPEN_READ_ERROR,
  DENY_ANONYMOUS,
  DENY_UID_HEADER_NO_TOKEN,
} = ENT;

/**
 * The counter a signed-out caller used to increment, before ENTITLEMENT-NO-CREDENTIAL-1
 * made that path a denial. Retired from the module, so named here as a literal: the
 * tests below assert nothing emits it, and a regression to the old fail-open would.
 */
const RETIRED_NO_CREDENTIAL = 'entitlement.fail_open.no_credential';

/**
 * The uid header the CLIENT actually sends, read from its source rather than restated,
 * lower-cased the way node delivers it. A client rename turns §8 red instead of leaving
 * the server reading a header nobody sends.
 */
const UID_HEADER = /export const UID_HEADER = "([^"]+)"/
  .exec(fs.readFileSync(path.resolve(__dirname, '..', '..', 'src', 'ai', 'paidCallHeaders.ts'), 'utf8'))[1]
  .toLowerCase();

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
  const infos = [];
  return {
    warn: (m) => warnings.push(String(m)), warnings,
    info: (m) => infos.push(String(m)), infos,
    error() {}, log() {},
  };
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
  assert.equal(telemetry.get(RETIRED_NO_CREDENTIAL), 0);
});

test('A6d · a signed-out caller is DENIED as anonymous, NOT counted as any fail-open', async () => {
  const { gate, telemetry, logger } = gateFor({ tier: 'free' });
  const d = await gate.resolve('', reqStub(false));
  assert.equal(d.entitled, false, 'no bearer token and no uid header is a positive fact: deny');
  assert.equal(d.outcome, 'anonymous', "never 'absent' — no Firestore read happened");
  assert.equal(telemetry.get(DENY_EVENT), 1);
  assert.equal(telemetry.get(DENY_ANONYMOUS), 1);
  assert.equal(telemetry.get(FAIL_OPEN_EVENT), 0, 'a correct denial must not inflate the leak counter');
  assert.equal(telemetry.get(RETIRED_NO_CREDENTIAL), 0);
  assert.equal(telemetry.get(FAIL_OPEN_NO_UID), 0, 'routine traffic must not drown the real signal');
  assert.equal(logger.warnings.length, 0, 'routine signed-out traffic must stay out of the warn channel');
  assert.equal(logger.infos.length, 1);
});

test('A6e · the retired no_credential counter is no longer exported', () => {
  assert.equal(ENT.FAIL_OPEN_NO_CREDENTIAL, undefined,
    'nothing can emit it; an export would read as a live signal on the telemetry page');
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

/* ══════════════════════════════════════════════════════════════════════════
   §8 · ENTITLEMENT-NO-CREDENTIAL-1 — a request with NO caller identity is not served
   Every check pairs two requests the gate must tell apart. If a pair agrees, the
   change is wrong in one direction or the other.
   ══════════════════════════════════════════════════════════════════════════ */

const reqAnon = () => ({ method: 'POST', headers: {} });
const reqUidHeaderOnly = () => ({ method: 'POST', headers: { [UID_HEADER]: 'student-1' } });

for (const p of GATED) {
  test(`NC1 · ★ ${p}: an anonymous POST gets 402 — CONTROL: a verified premium uid is served`, async () => {
    const anon = gateFor({ tier: 'premium' });
    const res = resStub();
    const handled = await anon.gate.applyToRequest(reqAnon(), res, p, '');
    assert.equal(handled, true, 'the boundary must have responded');
    assert.equal(res.sent.length, 1);
    assert.equal(res.last().status, 402, '402 Payment Required, never 403');
    assert.equal(res.last().body.error, 'premium_required');
    assert.equal(anon.store.calls.get, 0, 'refusing an anonymous caller must not spend a read');

    const premium = gateFor({ tier: 'premium' });
    const controlRes = resStub();
    const controlHandled = await premium.gate.applyToRequest(reqAnon(), controlRes, p, 'u1');
    assert.equal(controlHandled, false);
    assert.equal(controlRes.sent.length, 0, 'an entitled caller must see nothing from the gate');
    assert.notEqual(handled, controlHandled, 'the same call with and without a verified uid must differ');
  });
}

test('NC2 · ★ THE PRESERVED CASE: an offered token that did not verify is SERVED — CONTROL: anonymous is denied', async () => {
  const offered = gateFor({ tier: 'free' });
  const served = await offered.gate.resolve('', reqStub(true));
  assert.equal(served.entitled, true, 'an expired token must never lock out a paying student');
  assert.equal(offered.telemetry.get(FAIL_OPEN_NO_UID), 1);
  const res = resStub();
  assert.equal(await offered.gate.applyToRequest(reqStub(true), res, '/api/check-solution', ''), false);
  assert.equal(res.sent.length, 0);

  const anon = gateFor({ tier: 'free' });
  const denied = await anon.gate.resolve('', reqAnon());
  assert.equal(denied.entitled, false);
  assert.notEqual(served.entitled, denied.entitled, 'token-offered and anonymous must not agree');
});

test('NC2b · ★ a uid header WITHOUT a token is DENIED under its own name — CONTROL: neither present is denied as anonymous', async () => {
  // UID-HEADER-CLOSE-1: this used to be SERVED as no_uid. paidCallHeaders.ts no longer
  // sends the header alone, so the only sender of this shape is someone typing a uid.
  const headerOnly = gateFor({ tier: 'premium' });
  const denied = await headerOnly.gate.resolve('', reqUidHeaderOnly());
  assert.equal(denied.entitled, false, 'a uid string with nothing behind it must not be served');
  assert.equal(denied.outcome, 'uid-header-no-token');
  assert.equal(headerOnly.telemetry.get(DENY_UID_HEADER_NO_TOKEN), 1);
  assert.equal(headerOnly.telemetry.get(FAIL_OPEN_NO_UID), 0, 'it must no longer count as a failed token');
  assert.equal(headerOnly.telemetry.get(FAIL_OPEN_EVENT), 0);
  assert.equal(headerOnly.telemetry.get(DENY_ANONYMOUS), 0);
  assert.equal(headerOnly.store.calls.get, 0, 'refusing an unverifiable uid must not spend a read');
  const res = resStub();
  assert.equal(await headerOnly.gate.applyToRequest(reqUidHeaderOnly(), res, '/api/check-solution', ''), true);
  assert.equal(res.last().status, 402);

  const neither = gateFor({ tier: 'free' });
  const anon = await neither.gate.resolve('', reqAnon());
  assert.equal(anon.entitled, false);
  assert.equal(anon.outcome, 'anonymous');
  assert.equal(neither.telemetry.get(DENY_ANONYMOUS), 1);
  assert.equal(neither.telemetry.get(DENY_UID_HEADER_NO_TOKEN), 0);
  assert.notEqual(denied.outcome, anon.outcome, 'the two denials must stay distinguishable');
});

/* ══════════════════════════════════════════════════════════════════════════
   §9 · UID-HEADER-CLOSE-1 — spec §4 acceptance, in-process, no network.
   The REAL entitlement.cjs, verifiedCaller.cjs and rateLimiter.cjs, driven in
   index.cjs's own order (verify -> limiter -> gate). firebase-admin is a stub and
   nothing is dispatched to a handler, so no paid endpoint can be reached.
   ══════════════════════════════════════════════════════════════════════════ */

const { createVerifiedCaller } = require('./verifiedCaller.cjs');
const { createRateLimiter } = require('./rateLimiter.cjs');

const reqP2TokenFailed = () => ({ method: 'POST', headers: { [UID_HEADER]: 'student-1', authorization: 'Bearer expired' } });
const reqVerified = () => ({ method: 'POST', headers: { [UID_HEADER]: 'student-1', authorization: 'Bearer good-token' } });

function edgeFor(doc) {
  const g = gateFor(doc);
  const verifiedCaller = createVerifiedCaller({
    firebaseAdmin: {
      auth: () => ({
        verifyIdToken: async (t) => {
          if (t === 'good-token') return { uid: 'student-1' };
          throw new Error('token did not verify');
        },
      }),
    },
    telemetry: g.telemetry,
  });
  return { ...g, verifiedCaller };
}

test('UHC §4.1 · ★ a spoofed uid with no token is DENIED — CONTROL: the same harness SERVES a token that did not verify (P2)', async () => {
  const spoof = edgeFor({ tier: 'premium' });
  const spoofReq = reqUidHeaderOnly();
  const spoofed = await spoof.gate.resolve(await spoof.verifiedCaller.resolveVerifiedUid(spoofReq), spoofReq);
  assert.equal(spoofed.entitled, false);

  const p2 = edgeFor({ tier: 'premium' });
  const p2Req = reqP2TokenFailed();
  const served = await p2.gate.resolve(await p2.verifiedCaller.resolveVerifiedUid(p2Req), p2Req);
  assert.equal(served.entitled, true, 'a harness that denies everything proves nothing');
});

test('UHC §4.2 · the denial has its own telemetry name, distinct from P2\'s', async () => {
  assert.equal(DENY_UID_HEADER_NO_TOKEN, 'entitlement.deny.uid_header_no_token');
  assert.equal(FAIL_OPEN_NO_UID, 'entitlement.fail_open.no_uid');
  assert.notEqual(DENY_UID_HEADER_NO_TOKEN, FAIL_OPEN_NO_UID);

  const g = edgeFor({ tier: 'premium' });
  await g.gate.resolve('', reqUidHeaderOnly());
  await g.gate.resolve('', reqP2TokenFailed());
  assert.equal(g.telemetry.get(DENY_UID_HEADER_NO_TOKEN), 1, 'P1 counts once under its own name');
  assert.equal(g.telemetry.get(FAIL_OPEN_NO_UID), 1, 'P2 counts once under its own name');
});

test('UHC §4.3 · a verified token resolves as before — CONTROL: the same assertion FAILS with the token removed', async () => {
  const g = edgeFor({ tier: 'premium' });
  const req = reqVerified();
  const d = await g.gate.resolve(await g.verifiedCaller.resolveVerifiedUid(req), req);
  assert.deepEqual({ entitled: d.entitled, tier: d.tier, outcome: d.outcome }, { entitled: true, tier: 'premium', outcome: 'read' });

  const c = edgeFor({ tier: 'premium' });
  const stripped = reqVerified();
  delete stripped.headers.authorization;
  const cd = await c.gate.resolve(await c.verifiedCaller.resolveVerifiedUid(stripped), stripped);
  assert.throws(
    () => assert.deepEqual({ entitled: cd.entitled, tier: cd.tier, outcome: cd.outcome }, { entitled: true, tier: 'premium', outcome: 'read' }),
    assert.AssertionError,
    'the same assertion must fail once the token is gone',
  );
});

test('UHC §4.6 · the rate limiter counts a denied P1 call exactly as it counts a served one', async () => {
  // index.cjs runs rateLimiter.check() BEFORE the gate, so a denial cannot un-count.
  const tel = telemetryStub();
  const limiter = createRateLimiter({ telemetry: tel, now: () => NOW });
  const g = edgeFor({ tier: 'premium' });
  for (const req of [reqUidHeaderOnly(), reqVerified()]) {
    const uid = await g.verifiedCaller.resolveVerifiedUid(req);
    assert.equal(limiter.check(req, '/api/check-solution', uid).allowed, true);
    await g.gate.applyToRequest(req, resStub(), '/api/check-solution', uid);
  }
  const snap = limiter.snapshot();
  const studentKey = Object.keys(snap).find((k) => k.startsWith('student-1:'));
  assert.equal(snap[studentKey], 2, 'the denied spoof and the served call both count against student-1');
  assert.equal(tel.get('rate_limit.uid_source.header'), 1);
  assert.equal(tel.get('rate_limit.uid_source.verified'), 1);
});

test('UHC §4.7 · ★ P2 STILL FAILS OPEN — the scope boundary, asserted', async () => {
  const g = edgeFor({ tier: 'free' });
  const req = reqP2TokenFailed();
  const d = await g.gate.resolve(await g.verifiedCaller.resolveVerifiedUid(req), req);
  assert.equal(d.entitled, true);
  assert.equal(d.outcome, 'fail-open');
  assert.equal(d.reason, 'a bearer token was offered and did not verify');
  assert.equal(g.telemetry.get(FAIL_OPEN_EVENT), 1);
  assert.equal(g.telemetry.get(DENY_UID_HEADER_NO_TOKEN), 0);
  const res = resStub();
  assert.equal(await g.gate.applyToRequest(reqP2TokenFailed(), res, '/api/check-solution', ''), false);
  assert.equal(res.sent.length, 0, 'P2 must reach the handler, not a 402');
});

test('NC3 · the other fail-opens are untouched: no firebase-admin, and a Firestore read that throws', async () => {
  const noAdmin = gateFor(undefined, { admin: null });
  const a = await noAdmin.gate.resolve('u1', reqStub());
  assert.equal(a.entitled, true);
  assert.equal(noAdmin.telemetry.get(FAIL_OPEN_NO_ADMIN), 1);
  assert.equal(noAdmin.telemetry.get(FAIL_OPEN_EVENT), 1);

  const threw = gateFor({ tier: 'free' }, { throwOn: 'get' });
  const b = await threw.gate.resolve('u1', reqStub());
  assert.equal(b.entitled, true);
  assert.equal(threw.telemetry.get(FAIL_OPEN_READ_ERROR), 1);
  assert.equal(threw.telemetry.get(FAIL_OPEN_EVENT), 1);
});

test('NC4 · ★ telemetry: an anonymous denial counts 0 fail-opens — CONTROL: an invalid token counts 1', async () => {
  const anon = gateFor({ tier: 'free' });
  await anon.gate.applyToRequest(reqAnon(), resStub(), '/api/check-solution', '');
  assert.equal(anon.telemetry.get(FAIL_OPEN_EVENT), 0, 'a correct denial must not inflate the leak counter');
  assert.equal(anon.telemetry.get(RETIRED_NO_CREDENTIAL), 0);
  assert.equal(anon.telemetry.get(DENY_ANONYMOUS), 1);

  const invalid = gateFor({ tier: 'free' });
  await invalid.gate.applyToRequest(reqStub(true), resStub(), '/api/check-solution', '');
  assert.equal(invalid.telemetry.get(FAIL_OPEN_EVENT), 1, 'the leak counter must still fire when it should');
  assert.equal(invalid.telemetry.get(DENY_ANONYMOUS), 0);
});

test('NC5 · ★ /api/step-solution still serves STORED steps to an anonymous caller — CONTROL: generation is denied', async () => {
  const { route, gate, geminiCalls } = stepHarness({ tier: 'premium' });
  const req = {
    method: 'POST', headers: {},
    body: { question: 'Solve 2+2', marks: 1, solutionSteps: ['Add them', 'Answer 4'], finalAnswer: '4' },
  };
  const boundaryRes = resStub();
  assert.equal(await gate.applyToRequest(req, boundaryRes, '/api/step-solution', ''), false,
    '/api/step-solution must stay ungated at the boundary');
  assert.equal(boundaryRes.sent.length, 0, 'no 402 at the boundary');
  assert.equal(typeof req.lazytopperEntitlement.requireForGeneration, 'function');
  const res = resStub();
  await route.handleStepSolution(req, res);
  assert.equal(res.last().status, 200, 'the bank-backed solutions are free for everyone');
  assert.equal(geminiCalls.length, 0);

  const denial = await req.lazytopperEntitlement.requireForGeneration();
  assert.ok(denial, 'requireForGeneration must deny the same anonymous request');
  assert.equal(denial.error, 'premium_required');
  assert.equal(denial.feature, 'step-solution-generation');

  const genReq = { method: 'POST', headers: {}, body: { question: 'An unbanked question', marks: 3 } };
  await gate.applyToRequest(genReq, resStub(), '/api/step-solution', '');
  const genRes = resStub();
  await route.handleStepSolution(genReq, genRes);
  assert.equal(genRes.last().status, 402);
  assert.equal(geminiCalls.length, 0, 'an anonymous caller must not spend money at Gemini');
});

test('CONTROL 3 · ★ over REAL HTTP: no identity and a uid header alone both get a 402 — CONTROL: an unverifiable token is SERVED',
  { timeout: 90000 }, async (t) => {
    const port = await freePort();
    const srv = bootServer({ port, stubAdmin: false });
    t.after(() => srv.child.kill());
    await srv.ready;

    const anon = await post(port, '/api/check-solution', { question: 'Q', marks: 3, textAnswer: 'a' });
    assert.equal(anon.status, 402, `an anonymous POST must be refused over HTTP, got ${anon.status}: ${anon.text}`);
    assert.equal(anon.json.error, 'premium_required');

    // UID-HEADER-CLOSE-1: a uid header alone was SERVED here until that lane.
    const withUid = await post(port, '/api/check-solution',
      { question: 'Q', marks: 3, textAnswer: 'a' }, { [UID_HEADER]: 'student-1' });
    assert.equal(withUid.status, 402,
      `a uid header with no token must be refused over HTTP, got ${withUid.status}: ${withUid.text}`);
    await new Promise((r) => setTimeout(r, 300));
    assert.match(srv.log(), /DENY \(a uid header arrived without a bearer token\)/,
      'the refusal must be the uid-header branch, reached under the name the client sends');

    // Control (P2): with no firebase-admin a token cannot verify, so it fails OPEN.
    const withToken = await post(port, '/api/check-solution',
      { question: 'Q', marks: 3, textAnswer: 'a' }, { [UID_HEADER]: 'student-1', authorization: 'Bearer any' });
    assert.notEqual(withToken.status, 402, 'an offered token that did not verify must still be served');
  });

/* ══════════════════════════════════════════════════════════════════════════
   §10 · FREE-CHECK-1a — ADMISSION. entitlement.cjs is byte-identical; these prove
   the free-check gate in front of it admits EXACTLY the N2 shape and nothing else,
   that it is inert with FREE_CHECK_ENABLED off, and that it fails CLOSED.
   In-process first (the REAL verifiedCaller, rateLimiter, entitlement and freeCheck
   modules in index.cjs's order), then over REAL HTTP through the REAL index.cjs.
   Each test names the mutation that turns it red.
   ══════════════════════════════════════════════════════════════════════════ */

const FC = require('./freeCheck.cjs');
const { createHttpUtils, DIAGNOSTIC_KEYS } = require('./httpUtils.cjs');

const MARKER = FC.FREE_CHECK_MARKER_HEADER.toLowerCase();
const APPCHECK = FC.APP_CHECK_HEADER.toLowerCase();
const AC_GOOD = 'ac-good';
const markedHeaders = (extra = {}) => ({ [MARKER]: FC.FREE_CHECK_MARKER_VALUE, [APPCHECK]: AC_GOOD, ...extra });
const reqMarked = (extra = {}) => ({ method: 'POST', headers: markedHeaders(extra), socket: { remoteAddress: '203.0.113.9' } });

/** Free-check day documents, with every touch recorded — a flag-off request must touch NOTHING. */
function freeStore({ failTx = false } = {}) {
  const docs = new Map();
  const touches = { reads: 0, writes: 0, transactions: 0 };
  return {
    docs,
    touches,
    db: {
      collection(name) {
        assert.equal(name, FC.FREE_CHECK_COLLECTION);
        return { doc: (id) => ({ key: `${name}/${id}` }) };
      },
      async runTransaction(fn) {
        touches.transactions += 1;
        if (failTx) throw new Error('FIRESTORE UNAVAILABLE');
        const pending = [];
        const tx = {
          async get(ref) {
            touches.reads += 1;
            const d = docs.get(ref.key);
            return { exists: !!d, data: () => (d ? { ...d } : undefined) };
          },
          set(ref, data) { pending.push([ref.key, data]); },
        };
        const out = await fn(tx);
        for (const [k, d] of pending) { touches.writes += 1; docs.set(k, { ...(docs.get(k) || {}), ...d }); }
        return out;
      },
    },
  };
}

/**
 * firebase-admin stand-in. Its verifyToken follows the 13.7.0 replay contract
 * (lib/app-check/app-check-api.d.ts): with `{ consume: true }` the first sight of a
 * token answers `alreadyConsumed: false` and marks it, every later sight answers
 * `alreadyConsumed: true`. The options of every call are recorded.
 */
function freeAdmin() {
  const calls = { verifyToken: 0, options: [] };
  const consumed = new Set();
  return {
    calls,
    auth: () => ({
      verifyIdToken: async (t) => {
        if (t === 'good-token') return { uid: 'student-1' };
        throw new Error('token did not verify');
      },
    }),
    appCheck: () => ({
      async verifyToken(t, options) {
        calls.verifyToken += 1;
        calls.options.push(options === undefined ? undefined : { ...options });
        if (t !== AC_GOOD) throw new Error('app check token did not verify');
        const out = { appId: '1:123:web:abc' };
        if (options && options.consume === true) {
          out.alreadyConsumed = consumed.has(t);
          consumed.add(t);
        }
        return out;
      },
    }),
  };
}

const FLAG = { FREE_CHECK_ENABLED: 'true' };

/**
 * The edge, in index.cjs's order: verify -> free-check classify/admit -> limiter -> gate.
 * `admin: null` / `firestore: null` reproduce a deploy without firebase-admin.
 */
function freeEdgeFor(doc, { env = FLAG, admin, firestore, failTx, limits } = {}) {
  const g = gateFor(doc);
  const fakeAdminObj = freeAdmin();
  const store = freeStore({ failTx });
  const verifiedCaller = createVerifiedCaller({ firebaseAdmin: fakeAdminObj, telemetry: g.telemetry });
  const limiter = createRateLimiter({ telemetry: g.telemetry, now: () => NOW, ...(limits ? { limits } : {}) });
  const free = FC.createFreeCheckGate({
    firebaseAdmin: admin === undefined ? fakeAdminObj : admin,
    adminFirestore: firestore === undefined ? store.db : firestore,
    telemetry: g.telemetry,
    logger: { warn() {} },
    env,
    now: () => NOW,
    globalCountToday: () => limiter.globalCountToday(),
    globalHardLimit: () => limiter.limits.global.hard,
  });
  async function run(req, reqPath) {
    const res = resStub();
    const uid = await verifiedCaller.resolveVerifiedUid(req);
    let admitted = false;
    if (free.isFreeCheckRequest(req, reqPath, uid)) {
      const a = await free.admit(req, reqPath);
      if (!a.admitted) { sendJsonStub(res, a.status, a.body); return { res, stage: 'free-check', admitted }; }
      admitted = true;
    }
    const v = admitted ? limiter.check(req, reqPath, uid, { freeCheck: true }) : limiter.check(req, reqPath, uid);
    if (!v.allowed) { sendJsonStub(res, v.status, v.body); return { res, stage: 'limiter', admitted }; }
    if (!admitted && await g.gate.applyToRequest(req, res, reqPath, uid)) return { res, stage: 'entitlement', admitted };
    return { res, stage: 'handler', admitted };
  }
  return { ...g, free, limiter, store, fakeAdmin: fakeAdminObj, run };
}

// MUTATION M5: treat the flag as always on ⇒ RED here.
for (const env of [{}, { FREE_CHECK_ENABLED: '' }, { FREE_CHECK_ENABLED: '0' }, { FREE_CHECK_ENABLED: 'false' }, { FREE_CHECK_ENABLED: 'off' }]) {
  test(`FC-E1 · ★ flag OFF (${JSON.stringify(env)}): marker + valid App Check change NOTHING — P2 'anonymous' and P3 'uid-header-no-token' stand`, async () => {
    const p2 = freeEdgeFor({ tier: 'premium' }, { env });
    assert.equal(p2.free.isFreeCheckRequest(reqMarked(), '/api/check-solution', ''), false);
    const r2 = await p2.run(reqMarked(), '/api/check-solution');
    assert.equal(r2.stage, 'entitlement');
    assert.equal(r2.res.last().status, 402);
    assert.equal(r2.res.last().body.error, 'premium_required');
    assert.equal(p2.telemetry.get(DENY_ANONYMOUS), 1);
    assert.equal((await p2.gate.resolve('', reqMarked())).outcome, 'anonymous');
    assert.ok(Object.keys(p2.limiter.snapshot()).some((k) => k.startsWith('ip:')), 'the per-IP bucket is charged exactly as before');
    assert.deepEqual(p2.store.touches, { reads: 0, writes: 0, transactions: 0 }, 'flag off must never touch the free-check store');
    assert.equal(p2.fakeAdmin.calls.verifyToken, 0, 'flag off must never verify App Check');

    const p3 = freeEdgeFor({ tier: 'premium' }, { env });
    const p3Req = reqMarked({ [UID_HEADER]: 'student-1' });
    const r3 = await p3.run(p3Req, '/api/check-solution');
    assert.equal(r3.stage, 'entitlement');
    assert.equal(r3.res.last().status, 402);
    assert.equal(p3.telemetry.get(DENY_UID_HEADER_NO_TOKEN), 1);
    assert.equal((await p3.gate.resolve('', p3Req)).outcome, 'uid-header-no-token');
    assert.deepEqual(p3.store.touches, { reads: 0, writes: 0, transactions: 0 });
    assert.equal(p3.fakeAdmin.calls.verifyToken, 0);

    // CONTROL: the identical P2 request WITH the flag on is admitted, so the flag — and
    // only the flag — is what kept the paths above unchanged.
    const on = freeEdgeFor({ tier: 'premium' });
    const ron = await on.run(reqMarked(), '/api/check-solution');
    assert.equal(ron.stage, 'handler');
    assert.equal(ron.admitted, true);
  });
}

test('FC-E2 · ★ signed-in callers are untouched with the flag ON, marker or not — a signed-in FREE student is still refused 402', async () => {
  for (const withMarker of [false, true]) {
    const extra = { authorization: 'Bearer good-token', [UID_HEADER]: 'student-1' };
    const req = withMarker ? reqMarked(extra) : { method: 'POST', headers: extra };
    const premium = freeEdgeFor({ tier: 'premium' });
    const r = await premium.run(req, '/api/check-solution');
    assert.equal(r.stage, 'handler');
    assert.equal(r.admitted, false, 'a signed-in caller is never a free check');
    const d = await premium.gate.resolve('student-1', req);
    assert.deepEqual({ entitled: d.entitled, tier: d.tier }, { entitled: true, tier: 'premium' });
    assert.ok(Object.keys(premium.limiter.snapshot()).some((k) => k.startsWith('student-1:vision:')), 'charged to the student as before');
    assert.deepEqual(premium.store.touches, { reads: 0, writes: 0, transactions: 0 });
    assert.equal(premium.fakeAdmin.calls.verifyToken, 0);

    const free = freeEdgeFor({ tier: 'free' });
    const rf = await free.run(req, '/api/check-solution');
    assert.equal(rf.stage, 'entitlement', 'the marker must not open grading to a signed-in free student');
    assert.equal(rf.res.last().status, 402);
    assert.deepEqual(free.store.touches, { reads: 0, writes: 0, transactions: 0 });
  }
});

// MUTATION M1: App Check verification always passes ⇒ RED here.
test('FC-E3 · ★ App Check MISSING or INVALID is refused before the limiter and the gate, with NO Firestore work — CONTROL: a valid token is admitted', async () => {
  const missing = freeEdgeFor({ tier: 'free' });
  const rm = await missing.run(reqMarked({ [APPCHECK]: '' }), '/api/check-solution');
  assert.equal(rm.stage, 'free-check');
  assert.equal(rm.res.last().status, FC.REFUSAL_STATUS);
  assert.equal(rm.res.last().body.reason, FC.REASONS.APP_CHECK_MISSING);
  assert.equal(missing.fakeAdmin.calls.verifyToken, 0);
  assert.deepEqual(missing.store.touches, { reads: 0, writes: 0, transactions: 0 }, 'OR-13: a missing token does no Firestore work');
  assert.equal(missing.telemetry.get('free_check.refused.app_check_missing'), 1, 'counted by telemetry only');

  for (const bad of ['forged', 'x.y.z', AC_GOOD + 'x']) {
    const invalid = freeEdgeFor({ tier: 'free' });
    const ri = await invalid.run(reqMarked({ [APPCHECK]: bad }), '/api/check-solution');
    assert.equal(ri.stage, 'free-check');
    assert.equal(ri.res.last().status, FC.REFUSAL_STATUS);
    assert.equal(ri.res.last().body.reason, FC.REASONS.APP_CHECK_INVALID);
    assert.equal(invalid.fakeAdmin.calls.verifyToken, 1, 'the token must really be verified');
    assert.deepEqual(invalid.limiter.snapshot(), {}, 'a refused free check commits nothing to the limiter');
    assert.equal(invalid.telemetry.get(DENY_ANONYMOUS), 0, 'and never reaches entitlement');
    // OR-13: counted by telemetry only — never written to freeCheckDaily.
    assert.deepEqual(invalid.store.touches, { reads: 0, writes: 0, transactions: 0 }, 'an invalid token does no Firestore work');
    assert.equal(invalid.store.docs.size, 0);
    assert.equal(invalid.telemetry.get('free_check.refused.app_check_invalid'), 1);
  }
  // A marked DETECT with a bad token is refused too (detect is ungated, so the edge must do it — N3).
  const detect = freeEdgeFor({ tier: 'free' });
  const rd = await detect.run(reqMarked({ [APPCHECK]: 'forged' }), '/api/detect-question');
  assert.equal(rd.res.last().body.reason, FC.REASONS.APP_CHECK_INVALID);

  const ok = freeEdgeFor({ tier: 'free' });
  const rok = await ok.run(reqMarked(), '/api/check-solution');
  assert.equal(rok.stage, 'handler');
  assert.equal(rok.admitted, true);
  assert.equal(ok.fakeAdmin.calls.verifyToken, 1);
});

// MUTATIONS F1 / F2 (drop consume:true / ignore alreadyConsumed) ⇒ RED here.
test('FC-E8 · ★ OR-13 replay protection at the edge: consume:true on EACH free-check path, and a replayed token is refused app_check_invalid before the limiter, with no Firestore work', async () => {
  for (const p of FC.FREE_CHECK_PATHS) {
    const e = freeEdgeFor({ tier: 'free' });
    const first = await e.run(reqMarked(), p);
    assert.equal(first.admitted, true, `${p}: the first use of the token is admitted`);
    assert.deepEqual(e.fakeAdmin.calls.options, [{ consume: true }], `${p}: verifyToken called with { consume: true }`);
    const touchesAfterFirst = { ...e.store.touches };
    const limiterAfterFirst = e.limiter.snapshot();

    const replay = await e.run(reqMarked(), p);
    assert.equal(replay.admitted, false, `${p}: the replay is not admitted`);
    assert.equal(replay.stage, 'free-check', `${p}: refused at the edge`);
    assert.equal(replay.res.last().status, FC.REFUSAL_STATUS);
    assert.equal(replay.res.last().body.error, 'free_check_refused');
    assert.equal(replay.res.last().body.reason, FC.REASONS.APP_CHECK_INVALID, `${p}: no new reason — replay is app_check_invalid`);
    assert.deepEqual(e.fakeAdmin.calls.options, [{ consume: true }, { consume: true }]);
    assert.deepEqual(e.store.touches, touchesAfterFirst, `${p}: the replay did no Firestore work`);
    assert.deepEqual(e.limiter.snapshot(), limiterAfterFirst, `${p}: the replay committed nothing to the limiter`);
    assert.equal(e.telemetry.get(DENY_ANONYMOUS), 0, `${p}: and never reached entitlement`);
  }
});

test('FC-E4 · ★ the marker on a NON-free-check path is never admitted (paid headers go out from 11 call sites)', async () => {
  for (const p of ['/api/tutor', '/api/generate-visual', '/api/generate-diagram', '/api/step-solution', '/api/more-like-this']) {
    const e = freeEdgeFor({ tier: 'free' });
    assert.equal(e.free.isFreeCheckRequest(reqMarked(), p, ''), false, `${p} must not be a free-check path`);
    await e.run(reqMarked(), p);
    assert.equal(e.fakeAdmin.calls.verifyToken, 0);
    assert.deepEqual(e.store.touches, { reads: 0, writes: 0, transactions: 0 });
  }
  const tutor = freeEdgeFor({ tier: 'free' });
  const r = await tutor.run(reqMarked(), '/api/tutor');
  assert.equal(r.stage, 'entitlement');
  assert.equal(r.res.last().status, 402);
  assert.equal(tutor.telemetry.get(DENY_ANONYMOUS), 1);
  // Only the exact marker value counts.
  const e = freeEdgeFor({ tier: 'free' });
  for (const v of ['0', 'true', 'yes', ' ']) {
    assert.equal(e.free.isFreeCheckRequest(reqMarked({ [MARKER]: v }), '/api/check-solution', ''), false, `marker value ${JSON.stringify(v)}`);
  }
  // CONTROL: every free-check path IS classified.
  for (const p of FC.FREE_CHECK_PATHS) assert.equal(e.free.isFreeCheckRequest(reqMarked(), p, ''), true, p);
});

// MUTATION M8: classify via resolveCaller().anonymous instead of the exact P2 shape ⇒ RED here.
test('FC-E5 · ★ the marker on a FAILED-BEARER caller is never admitted — it keeps P2\'s fail-open path exactly', async () => {
  for (const extra of [{ authorization: 'Bearer expired' }, { authorization: 'Bearer expired', [UID_HEADER]: 'student-1' }]) {
    const e = freeEdgeFor({ tier: 'free' });
    const req = reqMarked(extra);
    assert.equal(e.free.isFreeCheckRequest(req, '/api/check-solution', ''), false);
    const r = await e.run(req, '/api/check-solution');
    assert.equal(r.admitted, false);
    assert.equal(r.stage, 'handler', 'P2 still fails open, as before');
    assert.equal(e.telemetry.get(FAIL_OPEN_NO_UID), 1);
    assert.equal(e.fakeAdmin.calls.verifyToken, 0, 'a failed-bearer caller must never reach App Check');
    assert.deepEqual(e.store.touches, { reads: 0, writes: 0, transactions: 0 });
  }
  // The distinction the rule exists for: resolveCaller() calls this caller anonymous.
  const { resolveCaller } = require('./rateLimiter.cjs');
  assert.equal(resolveCaller(reqMarked({ authorization: 'Bearer expired' }), '').anonymous, true);
});

// MUTATION M9: admin handles null ⇒ admitted ⇒ RED here.
test('FC-E6 · ★ FAIL CLOSED: no firebase-admin, no Firestore, no appCheck(), or a failing transaction ⇒ refused `unavailable`', async () => {
  const cases = [
    ['firebase-admin null', { admin: null }],
    ['Firestore null', { firestore: null }],
    ['no appCheck()', { admin: { auth: () => ({}) } }],
    ['transaction throws', { failTx: true }],
  ];
  for (const [name, opts] of cases) {
    const e = freeEdgeFor({ tier: 'premium' }, opts);
    const r = await e.run(reqMarked(), '/api/check-solution');
    assert.equal(r.admitted, false, `${name}: must not admit`);
    assert.equal(r.stage, 'free-check', `${name}: refused at the edge`);
    assert.equal(r.res.last().status, FC.REFUSAL_STATUS);
    assert.equal(r.res.last().body.reason, FC.REASONS.UNAVAILABLE, name);
    assert.deepEqual(e.limiter.snapshot(), {}, `${name}: nothing committed`);
  }
});

test('FC-E7 · ★ every refusal has its OWN machine-readable reason, 403 + free_check_refused, distinct from 402 and 429', async () => {
  const bodies = {};
  const capZero = freeEdgeFor({ tier: 'free' }, { env: { ...FLAG, LT_FREECHECK_DAILY: '0' } });
  bodies.ceiling = (await capZero.run(reqMarked(), '/api/check-solution')).res.last();
  const budget = freeEdgeFor({ tier: 'free' }, {
    limits: { vision: { soft: 50, hard: 50 }, tutor: { soft: 50, hard: 50 }, practice: { soft: 50, hard: 50 },
      visual: { soft: 50, hard: 50 }, anonymous: { soft: 5, hard: 5 }, global: { soft: 50, hard: 10 } },
  });
  for (let i = 0; i < 6; i += 1) budget.limiter.check({ headers: { [UID_HEADER]: `t${i}` } }, '/api/tutor');
  bodies.budget = (await budget.run(reqMarked(), '/api/check-solution')).res.last();
  bodies.missing = (await freeEdgeFor({ tier: 'free' }).run(reqMarked({ [APPCHECK]: '' }), '/api/check-solution')).res.last();
  bodies.invalid = (await freeEdgeFor({ tier: 'free' }).run(reqMarked({ [APPCHECK]: 'forged' }), '/api/check-solution')).res.last();
  bodies.unavailable = (await freeEdgeFor({ tier: 'free' }, { admin: null }).run(reqMarked(), '/api/check-solution')).res.last();

  const reasons = Object.values(bodies).map((b) => b.body[FC.REFUSAL_REASON_KEY]);
  assert.deepEqual(reasons.slice().sort(), Object.values(FC.REASONS).slice().sort(), 'one distinct reason per refusal');
  assert.equal(new Set(reasons).size, 5);
  assert.equal(FC.REFUSAL_REASON_KEY, 'reason');
  assert.ok(!DIAGNOSTIC_KEYS.has(FC.REFUSAL_REASON_KEY), 'the reason must not be a redacted diagnostic key');
  for (const [name, { status, body }] of Object.entries(bodies)) {
    assert.equal(status, 403, name);
    assert.ok(status !== 402 && status !== 429, name);
    assert.equal(body.error, 'free_check_refused', name);
    assert.ok(body.error !== 'premium_required' && body.error !== 'daily_limit', name);
    assert.ok(typeof body.message === 'string' && body.message && !body.message.includes('_'), `${name}: plain-English message`);
  }
  assert.equal(typeof bodies.ceiling.body.resetAt, 'string');
  assert.equal(typeof bodies.budget.body.resetAt, 'string');

  // The REAL sendJson (with its redaction) delivers the reason intact.
  const { sendJson } = createHttpUtils('*');
  let written = '';
  let head = null;
  sendJson({ writeHead: (s) => { head = s; }, end: (t) => { written = t; } }, bodies.invalid.status, bodies.invalid.body);
  assert.equal(head, 403);
  assert.equal(JSON.parse(written).reason, FC.REASONS.APP_CHECK_INVALID);
});

/* ── over REAL HTTP, through the REAL index.cjs ─────────────────────────── */

/**
 * Boot index.cjs with a firebase-admin stand-in that ALSO has appCheck() and a
 * transactional Firestore, so the free-check path can be driven end to end.
 * ★ bootServer spreads process.env, so both flags are DELETED here and set only
 * when the test asks: a flag-off run can never inherit a flag from the shell.
 */
function bootFreeCheckServer({ port, flagOn }) {
  const launcher = [
    "const Module = require('module');",
    'const store = new Map();',
    'const consumed = new Set();',
    'const fake = {',
    '  apps: [],',
    '  credential: { cert: () => ({}) },',
    '  initializeApp() { fake.apps.push({}); },',
    "  auth: () => ({ verifyIdToken: async (t) => { if (t === 'good-token') return { uid: 'student-1' }; throw new Error('bad token'); } }),",
    // Genuine = AC_GOOD or AC_GOOD.<n>. The replay contract of firebase-admin 13.7.0:
    // with { consume: true } a token's first sight is alreadyConsumed:false, later ones true.
    "  appCheck: () => ({ verifyToken: async (t, o) => { if (t !== " + JSON.stringify(AC_GOOD) + " && !String(t).startsWith(" + JSON.stringify(AC_GOOD + '.') + ")) throw new Error('bad app check'); const out = { appId: '1:123:web:abc' }; if (o && o.consume === true) { out.alreadyConsumed = consumed.has(t); consumed.add(t); } return out; } }),",
    '  firestore: () => ({',
    '    collection: (name) => ({ doc: (id) => ({',
    "      key: name + '/' + id,",
    "      get: async () => (name === 'subscriptions' ? { exists: true, data: () => ({ tier: 'free' }) } : { exists: store.has(name + '/' + id), data: () => store.get(name + '/' + id) }),",
    '    }) }),',
    '    runTransaction: async (fn) => {',
    '      const pending = [];',
    '      const out = await fn({ get: async (ref) => ({ exists: store.has(ref.key), data: () => store.get(ref.key) }), set: (ref, d) => pending.push([ref.key, d]) });',
    '      for (const [k, d] of pending) store.set(k, Object.assign({}, store.get(k) || {}, d));',
    '      return out;',
    '    },',
    '  }),',
    '};',
    'const orig = Module._load;',
    "Module._load = function (r) { return r === 'firebase-admin' ? fake : orig.apply(this, arguments); };",
    `require(${JSON.stringify(INDEX_CJS)});`,
  ].join('\n');
  const env = { ...process.env, PORT: String(port), VITE_FIREBASE_PROJECT_ID: 'demo-free-check' };
  delete env.GEMINI_API_KEY; delete env.DIRECT_GEMINI_API_KEY;
  delete env.REPLIT_GEMINI_BASE_URL; delete env.REPLIT_ANTHROPIC_BASE_URL;
  delete env.DATABASE_URL;
  delete env.FREE_CHECK_ENABLED; delete env.LT_FREECHECK_DAILY;
  delete env.LT_CAP_ANON_HARD; delete env.LT_CAP_ANON_SOFT;
  if (flagOn) env.FREE_CHECK_ENABLED = 'true';

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

function preflight(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: urlPath, method: 'OPTIONS' }, (res) => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('FC-H1 · ★ over REAL HTTP, flag OFF: marker + valid App Check still get the P2 and P3 402s',
  { timeout: 90000 }, async (t) => {
    const port = await freePort();
    const srv = bootFreeCheckServer({ port, flagOn: false });
    t.after(() => srv.child.kill());
    await srv.ready;

    const anon = await post(port, '/api/check-solution', { question: 'Q', marks: 3, textAnswer: 'a' }, markedHeaders());
    assert.equal(anon.status, 402, `flag off: a marked anonymous POST must still be refused 402, got ${anon.status}: ${anon.text}`);
    assert.equal(anon.json.error, 'premium_required');

    const withUid = await post(port, '/api/check-solution', { question: 'Q', marks: 3, textAnswer: 'a' },
      markedHeaders({ [UID_HEADER]: 'student-1' }));
    assert.equal(withUid.status, 402);
    await new Promise((r) => setTimeout(r, 300));
    assert.match(srv.log(), /DENY \(a uid header arrived without a bearer token\)/);
  });

// MUTATION M4 (at the wiring): index.cjs drops the R6 option ⇒ the 4th marked call 429s ⇒ RED here.
test('FC-H2 · ★ over REAL HTTP, flag ON: admitted free checks pass the 3/day loopback bucket, bad App Check is refused, CORS allows the headers',
  { timeout: 90000 }, async (t) => {
    const port = await freePort();
    const srv = bootFreeCheckServer({ port, flagOn: true });
    t.after(() => srv.child.kill());
    await srv.ready;

    // R7 — the preflight advertises both headers.
    const pf = await preflight(port, '/api/check-solution');
    assert.equal(pf.status, 204);
    const allowHeaders = String(pf.headers['access-control-allow-headers'] || '');
    assert.match(allowHeaders, /X-Firebase-AppCheck/);
    assert.match(allowHeaders, new RegExp(FC.FREE_CHECK_MARKER_HEADER));

    // R6 — five admitted marked calls from ONE loopback address; the anonymous cap is 3.
    for (let i = 1; i <= 5; i += 1) {
      const r = await post(port, '/api/detect-question', {}, markedHeaders({ [APPCHECK]: `${AC_GOOD}.h${i}` }));
      assert.ok(![402, 403, 429].includes(r.status), `admitted free check ${i} was refused ${r.status}: ${r.text}`);
    }
    const gradeToken = `${AC_GOOD}.grade`;
    const grade = await post(port, '/api/check-solution', { question: 'Q', marks: 3, textAnswer: 'a' }, markedHeaders({ [APPCHECK]: gradeToken }));
    assert.ok(![402, 403, 429].includes(grade.status), `an admitted grading call passes entitlement, got ${grade.status}: ${grade.text}`);

    // OR-13 — the SAME token replayed through the real index.cjs is refused as app_check_invalid.
    const replay = await post(port, '/api/check-solution', { question: 'Q', marks: 3, textAnswer: 'a' }, markedHeaders({ [APPCHECK]: gradeToken }));
    assert.equal(replay.status, 403, `a replayed App Check token must be refused, got ${replay.status}: ${replay.text}`);
    assert.equal(replay.json.error, 'free_check_refused');
    assert.equal(replay.json.reason, FC.REASONS.APP_CHECK_INVALID);

    // App Check — refused with its reason over the wire.
    const bad = await post(port, '/api/check-solution', { question: 'Q', marks: 3, textAnswer: 'a' }, markedHeaders({ [APPCHECK]: 'forged' }));
    assert.equal(bad.status, 403);
    assert.equal(bad.json.error, 'free_check_refused');
    assert.equal(bad.json.reason, FC.REASONS.APP_CHECK_INVALID);

    // CONTROL — the unmarked anonymous path is exactly P2, and the bucket is still fresh.
    const plain = await post(port, '/api/check-solution', { question: 'Q', marks: 3, textAnswer: 'a' });
    assert.equal(plain.status, 402, `an unmarked anonymous POST is still P2, got ${plain.status}: ${plain.text}`);
    assert.equal(plain.json.error, 'premium_required');
  });
