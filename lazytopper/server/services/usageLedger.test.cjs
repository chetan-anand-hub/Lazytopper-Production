/**
 * usageLedger.test.cjs — METER-1 guards: what each student's AI use costs, recorded.
 *
 * Run: `node --test server/services/usageLedger.test.cjs`
 * Wired into `lazytopper` test:matrix:all as `test:server:usage-ledger`.
 *
 * RECORDS ONLY — nothing here limits or refuses. The properties pinned below, each
 * with the spec clause it enforces:
 *
 *   M2  cost maths for a known usage, THINKING AT THE OUTPUT RATE; unknown model -> 0
 *       plus a `usage.unpriced_model` count, never a guessed price.
 *   M3  increments land on the IST day; no uid -> no write; a thrown or slow ledger
 *       write never rejects or delays callGemini; the document holds ONLY the five
 *       named numbers.
 *   M1  the uid is the VERIFIED one — proven through the REAL index.cjs over HTTP: a
 *       verified caller is charged, an unverified header uid is not, and an admitted
 *       free check is not.
 *   P9  a callGemini that escapes the request chain (the boot-time warm-pool timer,
 *       the admin warm-pool run on a non-paid path) records nothing.
 *
 * MUTATIONS this file was verified against (each run alone, each restore verified):
 *   M-A  usageLedger.cjs buildLedgerIncrement: cost thoughtsTokens at the INPUT price
 *        -> "cost maths" test RED.
 *   M-B  geminiClient.cjs: `await recordLedgerUsage(tokenRecord)` -> latency test RED.
 *   M-C  index.cjs: bind `verifiedUid || req.headers['x-lazytopper-uid']`
 *        -> real-server "unverified header uid" test RED.
 *
 * No network: `globalThis.fetch` is stubbed in-process, and inside the booted server.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { spawn } = require('node:child_process');

const {
  createUsageLedger,
  buildLedgerIncrement,
  runWithRequestContext,
  bindRequestUid,
  currentUid,
  USAGE_LEDGER_COLLECTION,
  LEDGER_FIELDS,
  LEDGER_HOUR_FIELD,
  istHourKey,
  TELEMETRY,
} = require('./usageLedger.cjs');
const { MODEL_PRICES, DEFAULT_USD_INR, usdInrRate } = require('./modelPrices.cjs');
const { createGeminiClient } = require('./geminiClient.cjs');
const { PAID_ENDPOINTS, istDayKey } = require('./rateLimiter.cjs');

/* ── Harness ─────────────────────────────────────────────────────────────── */

const GEMINI_CFG = {
  GEMINI_API_KEY: 'test-key',
  HAS_REPLIT_PROXY: false,
  REPLIT_GEMINI_BASE_URL: '',
  REPLIT_GEMINI_API_KEY: '',
  DIRECT_GEMINI_API_KEY: 'test-key',
  GEMINI_TUTOR_MODEL: 'gemini-2.5-flash',
  GEMINI_TIMEOUT_MS: 10000,
};

const PROMPT_SENTINEL = 'PROMPT-SENTINEL-7f3a the student wrote this';
const REPLY_SENTINEL = 'REPLY-SENTINEL-91cc the model wrote this';
const CONTENTS = [{ role: 'user', parts: [{ text: PROMPT_SENTINEL }] }];
const USAGE = { promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 800, totalTokenCount: 2000 };

function geminiOk(usage = USAGE) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => null },
    text: async () =>
      JSON.stringify({ candidates: [{ content: { parts: [{ text: REPLY_SENTINEL }] } }], usageMetadata: usage }),
  };
}

function stubFetch(usage) {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return geminiOk(usage);
  };
  return { calls: () => calls, restore: () => { globalThis.fetch = original; } };
}

function recorder() {
  const events = [];
  return {
    events,
    increment: (event, value = 1) => events.push({ event, value }),
    count: (event) => events.filter((e) => e.event === event).length,
  };
}

/**
 * A fake Firestore that records every write by its full path. `setImpl` lets a test
 * make the write throw, reject, or hang.
 */
function fakeFirestore(setImpl) {
  const writes = [];
  function docRef(p) {
    return {
      path: p,
      collection: (name) => collRef(`${p}/${name}`),
      set(data, opts) {
        writes.push({ path: p, data, opts });
        return setImpl ? setImpl(data) : Promise.resolve();
      },
    };
  }
  function collRef(p) {
    return { doc: (id) => docRef(`${p}/${id}`) };
  }
  const FieldValue = { increment: (n) => ({ __increment: n }) };
  return { writes, resolve: () => ({ db: { collection: collRef }, FieldValue }) };
}

/** A usage ledger over a fake store, and a Gemini client wired to it. */
function rig({ setImpl, now, env, telemetry } = {}) {
  const store = fakeFirestore(setImpl);
  const sink = telemetry || recorder();
  const ledger = createUsageLedger({
    resolveFirestore: store.resolve,
    telemetry: sink,
    now: now || (() => Date.UTC(2026, 8, 27, 6, 0, 0)),
    env: env || {},
  });
  const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder(), usageLedger: ledger });
  return { store, sink, ledger, client };
}

/** Run `fn` as a bound request of a VERIFIED student on a paid path. */
function asVerifiedStudent(uid, fn, reqPath = '/api/tutor') {
  return runWithRequestContext(() => {
    bindRequestUid(uid, reqPath);
    return fn();
  });
}

const settle = () => new Promise((r) => setImmediate(r));

/* ══════════════════════════════════════════════════════════════════════════
   M2 · THE PRICE TABLE AND THE COST MATHS
   ══════════════════════════════════════════════════════════════════════════ */

// MUTATION M-A: cost thoughtsTokens at inputUsdPerMillion -> RED (246400 !== 43120...).
test('M2 · cost maths for a known usage — thinking tokens are costed at the OUTPUT rate', () => {
  assert.deepEqual(MODEL_PRICES['gemini-2.5-flash'], { inputUsdPerMillion: 0.3, outputUsdPerMillion: 2.5 });
  assert.equal(DEFAULT_USD_INR, 88);

  // 1000 prompt * $0.30/M = 300 micro-USD; (200 + 800) * $2.50/M = 2500 micro-USD.
  // 2800 micro-USD * 88 = 246,400 micro-INR (= Rs 0.2464).
  const { increment, priced } = buildLedgerIncrement(
    { model: 'gemini-2.5-flash', promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 800 },
    { env: {} }
  );
  assert.equal(priced, true);
  assert.deepEqual(increment, {
    calls: 1,
    promptTokens: 1000,
    outputTokens: 200,
    thoughtsTokens: 800,
    costMicroInr: 246400,
  });

  // Thinking ALONE, one million tokens: $2.50 * 88 = Rs 220 = 220,000,000 micro-INR.
  // At the input rate it would be Rs 26.40 — an 8x under-count.
  const thinkingOnly = buildLedgerIncrement(
    { model: 'gemini-2.5-flash', thoughtsTokenCount: 1_000_000 },
    { env: {} }
  );
  assert.equal(thinkingOnly.increment.costMicroInr, 220_000_000);
  assert.ok(Number.isInteger(increment.costMicroInr), 'costMicroInr must be an integer');
});

test('M2 · LT_USD_INR moves the rate; an unusable value falls back to 88', () => {
  const rec = { model: 'gemini-2.5-flash', promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 800 };
  assert.equal(buildLedgerIncrement(rec, { env: { LT_USD_INR: '90' } }).increment.costMicroInr, 252000);
  for (const bad of ['', 'banana', '0', '-5', 'Infinity']) {
    assert.equal(usdInrRate({ LT_USD_INR: bad }), 88, `LT_USD_INR=${JSON.stringify(bad)} must fall back`);
  }
});

test('M2 · an UNKNOWN model costs 0 and is COUNTED as unpriced — never a guessed price', async () => {
  const f = stubFetch(USAGE);
  const { client, store, sink } = rig();
  try {
    await asVerifiedStudent('stu-1', () => client.callGemini('gemini-9-imaginary', CONTENTS, {}));
    await settle();
    assert.equal(store.writes.length, 1, 'tokens are still recorded for an unpriced model');
    assert.deepEqual(store.writes[0].data.costMicroInr, { __increment: 0 });
    assert.deepEqual(store.writes[0].data.thoughtsTokens, { __increment: 800 });
    assert.equal(sink.count(TELEMETRY.UNPRICED_MODEL), 1);
  } finally {
    f.restore();
  }
  // CONTROL: a priced model does NOT emit the unpriced count.
  assert.equal(buildLedgerIncrement({ model: 'gemini-2.5-flash' }).priced, true);
});

/* ══════════════════════════════════════════════════════════════════════════
   M3 · THE LEDGER WRITE
   ══════════════════════════════════════════════════════════════════════════ */

test('M3 · a successful call by a bound student increments usageLedger/{uid}/days/{istDay}', async () => {
  const f = stubFetch(USAGE);
  const { client, store } = rig();
  try {
    const out = await asVerifiedStudent('stu-1', () => client.callGemini('gemini-2.5-flash', CONTENTS, {}));
    assert.equal(out.text, REPLY_SENTINEL, 'the caller still gets its reply unchanged');
    await settle();
    assert.equal(store.writes.length, 1);
    const w = store.writes[0];
    assert.equal(w.path, `${USAGE_LEDGER_COLLECTION}/stu-1/days/2026-09-27`);
    assert.deepEqual(w.opts, { merge: true });
    assert.deepEqual(w.data, {
      calls: { __increment: 1 },
      promptTokens: { __increment: 1000 },
      outputTokens: { __increment: 200 },
      thoughtsTokens: { __increment: 800 },
      costMicroInr: { __increment: 246400 },
      // FAIR-USE-1 hour bucket: 06:00 UTC is 11:30 IST -> bucket "11", same cost.
      hourCostMicroInr: { 11: { __increment: 246400 } },
    });
  } finally {
    f.restore();
  }
});

test('M3 · increments land on the IST day, not the UTC day', async () => {
  const f = stubFetch(USAGE);
  try {
    // 2026-09-26 18:30 UTC is 2026-09-27 00:00 IST — the UTC date is still the 26th.
    const past = rig({ now: () => Date.UTC(2026, 8, 26, 18, 30, 0) });
    await asVerifiedStudent('stu-1', () => past.client.callGemini('gemini-2.5-flash', CONTENTS, {}));
    // One minute earlier is still 2026-09-26 in IST.
    const before = rig({ now: () => Date.UTC(2026, 8, 26, 18, 29, 0) });
    await asVerifiedStudent('stu-1', () => before.client.callGemini('gemini-2.5-flash', CONTENTS, {}));
    await settle();
    assert.equal(past.store.writes[0].path, 'usageLedger/stu-1/days/2026-09-27');
    assert.equal(before.store.writes[0].path, 'usageLedger/stu-1/days/2026-09-26');
    assert.equal(istDayKey(Date.UTC(2026, 8, 26, 18, 30, 0)), '2026-09-27');
  } finally {
    f.restore();
  }
});

test('M3 · NO uid in context -> NO write (outside a request, and inside an unbound one)', async () => {
  const f = stubFetch(USAGE);
  const { client, store } = rig();
  try {
    // Outside any request context — offline scripts, evals, the boot warm pool.
    await client.callGemini('gemini-2.5-flash', CONTENTS, {});
    // Inside a request whose uid was never bound — an anonymous caller.
    await runWithRequestContext(() => client.callGemini('gemini-2.5-flash', CONTENTS, {}));
    // Inside a request where verification returned "" — a failed token.
    await runWithRequestContext(() => {
      bindRequestUid('', '/api/tutor');
      return client.callGemini('gemini-2.5-flash', CONTENTS, {});
    });
    await settle();
    assert.equal(f.calls(), 3, 'all three model calls really happened');
    assert.equal(store.writes.length, 0, 'a call with no verified uid must record nothing');
  } finally {
    f.restore();
  }
});

test('M3 · a THROWN ledger write does not reject callGemini, and the failure is counted', async () => {
  const f = stubFetch(USAGE);
  try {
    const sync = rig({ setImpl: () => { throw new Error('firestore exploded synchronously'); } });
    const out1 = await asVerifiedStudent('stu-1', () => sync.client.callGemini('gemini-2.5-flash', CONTENTS, {}));
    const rejected = rig({ setImpl: () => Promise.reject(new Error('PERMISSION_DENIED')) });
    const out2 = await asVerifiedStudent('stu-1', () => rejected.client.callGemini('gemini-2.5-flash', CONTENTS, {}));
    await settle();
    await settle();
    assert.equal(out1.text, REPLY_SENTINEL);
    assert.equal(out2.text, REPLY_SENTINEL);
    // CONTROL: the write really was attempted, so "did not reject" is not vacuous.
    assert.equal(sync.store.writes.length, 1);
    assert.equal(rejected.store.writes.length, 1);
    assert.equal(sync.sink.count(TELEMETRY.WRITE_FAILED), 1);
    assert.equal(rejected.sink.count(TELEMETRY.WRITE_FAILED), 1);
  } finally {
    f.restore();
  }
});

// MUTATION M-B: `await recordLedgerUsage(tokenRecord)` in callGemini -> RED ("TIMEOUT").
test('M3 · LATENCY: callGemini resolves while the ledger write is still pending (fire-and-forget)', async () => {
  const f = stubFetch(USAGE);
  let release;
  const hang = new Promise((r) => { release = r; });
  const { client, store } = rig({ setImpl: () => hang });
  // ★ NOT unref'd: an unref'd timer lets the loop drain while an awaited write hangs,
  // and the test is then CANCELLED rather than failing on the assertion below.
  let timer;
  try {
    const call = asVerifiedStudent('stu-1', () => client.callGemini('gemini-2.5-flash', CONTENTS, {}));
    const timeout = new Promise((r) => {
      timer = setTimeout(() => r('TIMEOUT'), 1000);
    });
    const winner = await Promise.race([call.then(() => 'RESOLVED'), timeout]);
    assert.equal(winner, 'RESOLVED', 'callGemini waited on the ledger write — it must not');
    // CONTROL: the write was started and is genuinely still pending.
    assert.equal(store.writes.length, 1);
  } finally {
    clearTimeout(timer);
    release();
    f.restore();
  }
});

test('M3 · the ledger document holds ONLY the five named numbers — no prompt, no reply, no model', async () => {
  const f = stubFetch({ ...USAGE, cachedContentTokenCount: 77, promptTokensDetails: [{ modality: 'TEXT' }] });
  const { client, store } = rig();
  try {
    await asVerifiedStudent('stu-1', () =>
      client.callGemini('gemini-2.5-flash', CONTENTS, { callClass: 'tutor', marks: 5 })
    );
    await settle();
    assert.equal(store.writes.length, 1);
    const data = store.writes[0].data;
    assert.deepEqual(Object.keys(data).sort(), [...LEDGER_FIELDS, LEDGER_HOUR_FIELD].sort());
    assert.deepEqual(
      [...LEDGER_FIELDS].sort(),
      ['calls', 'costMicroInr', 'outputTokens', 'promptTokens', 'thoughtsTokens']
    );
    // FAIR-USE-1: the hour bucket is the same cost number keyed by an IST hour — no text.
    assert.equal(LEDGER_HOUR_FIELD, 'hourCostMicroInr');
    assert.deepEqual(Object.keys(data[LEDGER_HOUR_FIELD]), ['11']);
    const serialised = JSON.stringify(store.writes[0]);
    for (const banned of [PROMPT_SENTINEL, REPLY_SENTINEL, 'gemini-2.5-flash', 'tutor', 'TEXT']) {
      assert.ok(!serialised.includes(banned), `ledger write leaked: ${banned}`);
    }
  } finally {
    f.restore();
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   M1 · WHO IS CHARGED — the binding rules, in-process
   ══════════════════════════════════════════════════════════════════════════ */

test('M1 · bindRequestUid binds ONLY a verified uid, on a PAID path, never for a free check', async () => {
  const bound = (uid, p, opts) => runWithRequestContext(() => {
    bindRequestUid(uid, p, opts);
    return currentUid();
  });
  assert.equal(await bound('stu-1', '/api/tutor'), 'stu-1');
  for (const p of Object.keys(PAID_ENDPOINTS)) assert.equal(await bound('stu-1', p), 'stu-1', p);
  // Not a paid path: the admin tools that reach Gemini are not a student's use.
  assert.equal(await bound('admin-uid', '/api/admin/warm-question-pool'), '');
  assert.equal(await bound('admin-uid', '/api/admin/solution-cache/regenerate'), '');
  // An admitted free check is never charged to anyone.
  assert.equal(await bound('stu-1', '/api/check-solution', { freeCheck: true }), '');
  // Verification returned "" — nothing to bind.
  assert.equal(await bound('', '/api/tutor'), '');
  // Outside any request there is no store to bind into.
  assert.equal(bindRequestUid('stu-1', '/api/tutor'), '');
  assert.equal(currentUid(), '');
});

test('M1 · concurrent requests are charged to their OWN student (context does not bleed)', async () => {
  const f = stubFetch(USAGE);
  const { client, store } = rig();
  try {
    await Promise.all([
      asVerifiedStudent('stu-A', async () => {
        await new Promise((r) => setTimeout(r, 20));
        return client.callGemini('gemini-2.5-flash', CONTENTS, {});
      }),
      asVerifiedStudent('stu-B', () => client.callGemini('gemini-2.5-flash', CONTENTS, {})),
      runWithRequestContext(() => client.callGemini('gemini-2.5-flash', CONTENTS, {})),
    ]);
    await settle();
    assert.deepEqual(store.writes.map((w) => w.path.split('/')[1]).sort(), ['stu-A', 'stu-B']);
  } finally {
    f.restore();
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   P9 · CALLS THAT ESCAPE THE REQUEST CHAIN RECORD NOTHING
   The only callGemini callers outside a paid route's awaited chain are the warm
   question pool (a boot timer + interval armed in server.listen, and the admin
   POST /api/admin/warm-question-pool run, detached after its 202), the grader eval
   harness and the offline scripts. Proven with the REAL scheduler, not argued.
   ══════════════════════════════════════════════════════════════════════════ */

test('P9 · the warm pool armed at BOOT (real scheduleWarmPool timers) records nothing', async () => {
  const { scheduleWarmPool } = require('./warmQuestionPool.cjs');
  const f = stubFetch(USAGE);
  const { client, store } = rig();
  try {
    let ran;
    const done = new Promise((r) => { ran = r; });
    let running = false;
    const timers = [];
    // Armed exactly as index.cjs's server.listen callback arms it: outside any request.
    scheduleWarmPool({
      gates: { startupPrewarmArmed: true, startupDelayMs: 1, recurringTopUpArmed: false, logLines: [] },
      log: () => {},
      runWarmPool: async () => {
        await client.callGemini('gemini-2.5-flash', CONTENTS, {});
        ran();
      },
      isRunning: () => running,
      setRunning: (v) => { running = v; },
      setTimeoutFn: (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; },
      setIntervalFn: (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; },
    });
    await Promise.race([done, new Promise((r) => setTimeout(r, 2000).unref())]);
    timers.forEach((t) => clearTimeout(t));
    await settle();
    assert.equal(f.calls(), 1, 'CONTROL: the boot warm-pool run really called Gemini');
    assert.equal(store.writes.length, 0, 'a boot-time warm-pool call was charged to someone');
  } finally {
    f.restore();
  }
});

test('P9 · the admin warm-pool run, detached inside a request on a NON-paid path, records nothing', async () => {
  const f = stubFetch(USAGE);
  const { client, store } = rig();
  try {
    let detached;
    await runWithRequestContext(async () => {
      // index.cjs: POST is verified and bound — but this path is not a paid endpoint.
      bindRequestUid('admin-with-a-token', '/api/admin/warm-question-pool');
      // ...then the run is kicked off after the 202 and NOT awaited by the request.
      detached = new Promise((r) => setTimeout(r, 5)).then(() =>
        client.callGemini('gemini-2.5-flash', CONTENTS, {})
      );
    });
    await detached;
    await settle();
    assert.equal(f.calls(), 1, 'CONTROL: the detached run really called Gemini');
    assert.equal(store.writes.length, 0);
  } finally {
    f.restore();
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   M1 · THROUGH THE REAL index.cjs, OVER HTTP
   A wrapper wired but never reached is a silent no-op. These boot the real server
   (firebase-admin and fetch swapped BEFORE index.cjs loads — no test seam in
   production code) and read every ledger write it attempts from its stdout.
   ══════════════════════════════════════════════════════════════════════════ */

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

function bootServer(port) {
  const launcher = `
    const Module = require('module');
    const docRef = (p) => ({
      path: p,
      collection: (n) => collRef(p + '/' + n),
      get: async () => ({
        exists: p.startsWith('subscriptions/'),
        data: () => ({ tier: 'premium' }),
      }),
      set: async (data) => {
        if (p.startsWith('usageLedger/')) console.log('LEDGER_SET ' + p + ' ' + JSON.stringify(data));
      },
    });
    const collRef = (p) => ({ doc: (id) => docRef(p + '/' + id) });
    const firestore = () => ({
      collection: (n) => collRef(n),
      runTransaction: async (fn) => fn({ get: async () => ({ exists: false }), set() {} }),
    });
    firestore.FieldValue = { increment: (n) => ({ increment: n }) };
    const fake = {
      apps: [],
      credential: { cert: () => ({}) },
      initializeApp() { fake.apps.push({}); },
      auth: () => ({
        verifyIdToken: async (t) => {
          if (t === 'good-token') return { uid: 'verified-student' };
          throw new Error('invalid token');
        },
      }),
      appCheck: () => ({ verifyToken: async () => ({ appId: 'app-1', alreadyConsumed: false }) }),
      firestore,
    };
    const orig = Module._load;
    Module._load = function (r) { return r === 'firebase-admin' ? fake : orig.apply(this, arguments); };
    globalThis.fetch = async (url) => {
      console.log('GEMINI_FETCH ' + String(url).split('?')[0].split('/').pop());
      return {
        ok: true, status: 200, statusText: 'OK', headers: { get: () => null },
        text: async () => JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"question":"Q","marks":3,"reply":"ok"}' }] } }],
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
    if (/^(AI_INTEGRATIONS_|GEMINI_|WARM_POOL_|LT_)/.test(k)) delete env[k];
  }
  delete env.DATABASE_URL;
  delete env.FIREBASE_SERVICE_ACCOUNT_KEY;
  env.API_KEY = 'fake-gemini-key';
  env.AI_PROVIDER = 'gemini';
  env.VITE_FIREBASE_PROJECT_ID = 'demo-meter1';
  env.FREE_CHECK_ENABLED = '1';

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

function post(port, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        host: '127.0.0.1', port, path: urlPath, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => resolve({ status: res.statusCode, text }));
      }
    );
    req.on('error', reject);
    req.end(payload);
  });
}

const count = (log, re) => (log.match(re) || []).length;
const TUTOR_BODY = { topicLabel: 'Electricity', subject: 'science', messages: [{ role: 'user', content: 'what is ohm law' }] };

test('M1 · REAL index.cjs: verified charged, unverified header uid NOT, free check NOT',
  { timeout: 120000 }, async (t) => {
    const port = await freePort();
    const srv = bootServer(port);
    t.after(() => srv.child.kill());
    await srv.ready;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    // ── (1) A VERIFIED student on a paid path IS charged, to the verified uid. ──
    let before = srv.log();
    let res = await post(port, '/api/tutor', TUTOR_BODY, { authorization: 'Bearer good-token' });
    assert.equal(res.status, 200, `verified tutor call failed: ${res.status} ${res.text}\n${srv.log()}`);
    for (let i = 0; i < 40 && !/LEDGER_SET/.test(srv.log().slice(before.length)); i++) await wait(50);
    let delta = srv.log().slice(before.length);
    assert.equal(count(delta, /GEMINI_FETCH/g), 1, `CONTROL: Gemini called once\n${delta}`);
    assert.equal(count(delta, /LEDGER_SET/g), 1, `a verified call must be charged once\n${delta}`);
    const today = istDayKey(Date.now());
    assert.ok(delta.includes(`LEDGER_SET usageLedger/verified-student/days/${today} `),
      `the charge must land on today's IST day (${today})\n${delta}`);
    const written = JSON.parse(delta.match(/LEDGER_SET \S+ (\{.*\})/)[1]);
    // FAIR-USE-1 hour bucket: one IST hour key, the same cost. The key is read back from
    // the write (the call may straddle an hour boundary), then checked.
    const hourKeys = Object.keys(written.hourCostMicroInr || {});
    assert.equal(hourKeys.length, 1, `exactly one hour bucket per call\n${delta}`);
    assert.ok([istHourKey(Date.now()), istHourKey(Date.now() - 3600000)].includes(hourKeys[0]),
      `the hour bucket must be the current IST hour, got ${hourKeys[0]}`);
    assert.deepEqual(written.hourCostMicroInr[hourKeys[0]], { increment: 246400 });
    delete written.hourCostMicroInr;
    assert.deepEqual(written, {
      calls: { increment: 1 },
      promptTokens: { increment: 1000 },
      outputTokens: { increment: 200 },
      thoughtsTokens: { increment: 800 },
      costMicroInr: { increment: 246400 },
    });

    // ── (2) MUTATION M-C target: a FAILED token plus a forged uid HEADER. ──
    // Entitlement fails OPEN for a failed-bearer caller, so the model IS called —
    // which is exactly why the charge must not follow the header.
    before = srv.log();
    res = await post(port, '/api/tutor', TUTOR_BODY, {
      authorization: 'Bearer forged-token',
      'x-lazytopper-uid': 'forged-header-uid',
    });
    await wait(400);
    delta = srv.log().slice(before.length);
    assert.equal(count(delta, /GEMINI_FETCH/g), 1,
      `CONTROL: the unverified caller must really reach Gemini, or this proves nothing\n${res.status} ${res.text}\n${delta}`);
    assert.equal(count(delta, /LEDGER_SET/g), 0, `an UNVERIFIED header uid was charged\n${delta}`);
    assert.ok(!delta.includes('forged-header-uid'), 'the header uid reached the ledger');

    // ── (3) An ADMITTED free check (signed-out visitor) is charged to nobody. ──
    before = srv.log();
    res = await post(port, '/api/detect-question', { question: 'Find the resistance of a 2 m wire.' }, {
      'x-lazytopper-free-check': '1',
      'x-firebase-appcheck': 'app-check-token',
    });
    await wait(400);
    delta = srv.log().slice(before.length);
    assert.equal(count(delta, /GEMINI_FETCH/g), 1,
      `CONTROL: the admitted free check must really reach Gemini\n${res.status} ${res.text}\n${delta}`);
    assert.equal(count(delta, /LEDGER_SET/g), 0, `a free check was charged to someone\n${delta}`);
  });
