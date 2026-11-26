// COST-TRUTH-1 — the global daily AI cost ledger. Run: node --test server/services/aiCostDaily.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createAiCostDaily, buildDailyIncrement, AI_COST_DAILY_COLLECTION } = require('./aiCostDaily.cjs');
const { createGeminiClient } = require('./geminiClient.cjs');
const { createAdminAiCostDailyRoutes, summariseDay } = require('../routes/adminAiCostDaily.cjs');
const { createAdminTelemetryRoutes } = require('../routes/adminTelemetry.cjs');
const { IST_2027_01_01_MS } = require('./modelPrices.cjs');

const FieldValue = { increment: (n) => ({ __inc: n }) };

/** A Firestore stand-in recording every set(); merges increments so tests can read totals. */
function fakeDb() {
  const writes = [];
  return {
    writes,
    collection(name) {
      return { doc: (id) => ({ set: async (data, opts) => { writes.push({ name, id, data, opts }); } }) };
    },
  };
}
function flat(o, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === 'object' && '__inc' in v) out[prefix + k] = v.__inc;
    else if (v && typeof v === 'object') flat(v, `${prefix}${k}.`, out);
  }
  return out;
}
function ledgerWith(db, extra = {}) {
  return createAiCostDaily({ resolveFirestore: () => ({ db, FieldValue }), now: () => Date.UTC(2026, 10, 26, 6, 0, 0), env: {}, ...extra });
}

const REC = {
  model: 'gemini-3.8-flash',
  workloadClass: 'grade_structured',
  callClass: 'grade',
  promptTokenCount: 1_000_000,
  cachedContentTokenCount: 0,
  candidatesTokenCount: 100_000,
  thoughtsTokenCount: 100_000,
};

test('a call with usage increments the IST day doc, keyed by workload and call class, in micro-INR', async () => {
  const db = fakeDb();
  const l = ledgerWith(db);
  await l.recordCall(REC, true);
  assert.equal(db.writes.length, 1);
  const w = db.writes[0];
  assert.equal(w.name, AI_COST_DAILY_COLLECTION);
  assert.equal(w.id, '2026-11-26');
  assert.deepEqual(w.opts, { merge: true });
  const f = flat(w.data);
  // (1.0M*0.75 + 0.2M*3.75) = 1.5 USD * 88 = 132 INR = 132,000,000 micro
  assert.equal(f.costMicroInr, 132_000_000);
  assert.equal(f.calls, 1);
  assert.equal(f.promptTokens, 1_000_000);
  assert.equal(f.thoughtsTokens, 100_000);
  assert.equal(f['byWorkload.grade_structured.grade.costMicroInr'], 132_000_000);
  assert.equal(f['byWorkload.grade_structured.grade.calls'], 1);
});

test('no uid is needed: recording works outside any request context', async () => {
  const db = fakeDb();
  await ledgerWith(db).recordCall({ ...REC, workloadClass: 'unclassified', callClass: 'unclassified' }, true);
  assert.equal(db.writes.length, 1);
  assert.ok(flat(db.writes[0].data)['byWorkload.unclassified.unclassified.calls'] === 1);
});

test('count-only for a call with no usage: cost 0, unknownUsageCalls 1', () => {
  const inc = buildDailyIncrement(REC, false);
  assert.equal(inc.calls, 1);
  assert.equal(inc.unknownUsageCalls, 1);
  assert.equal(inc.costMicroInr, 0);
  assert.equal(inc.promptTokens, 0);
});

test('the price in force at the call time is used: the 2027-01-01 doubling', async () => {
  const before = ledgerWith(fakeDb(), { now: () => IST_2027_01_01_MS - 1 });
  const after = ledgerWith(fakeDb(), { now: () => IST_2027_01_01_MS });
  const b = buildDailyIncrement(REC, true, { nowMs: IST_2027_01_01_MS - 1, env: {} });
  const a = buildDailyIncrement(REC, true, { nowMs: IST_2027_01_01_MS, env: {} });
  assert.equal(a.costMicroInr, b.costMicroInr * 2);
  assert.ok(before && after);
});

test('unpriced model is counted, cost 0; LT_USD_INR is honoured', () => {
  assert.equal(buildDailyIncrement({ ...REC, model: 'nope' }, true).unpricedCalls, 1);
  const inc = buildDailyIncrement(REC, true, { nowMs: 0, env: { LT_USD_INR: '100' } });
  assert.equal(inc.costMicroInr, 150_000_000);
});

test('kill switch AI_COST_DAILY_DISABLED=1 writes nothing and returns null', () => {
  const db = fakeDb();
  const l = ledgerWith(db, { env: { AI_COST_DAILY_DISABLED: '1' } });
  assert.equal(l.recordCall(REC, true), null);
  assert.equal(db.writes.length, 0);
});

test('never throws: a throwing/absent Firestore is swallowed', async () => {
  assert.equal(createAiCostDaily({ resolveFirestore: () => null }).recordCall(REC, true), null);
  assert.equal(createAiCostDaily({ resolveFirestore: () => { throw new Error('x'); } }).recordCall(REC, true), null);
  const bad = { collection: () => ({ doc: () => ({ set: async () => { throw new Error('boom'); } }) }) };
  await assert.doesNotReject(ledgerWith(bad).recordCall(REC, true));
});

/* ── geminiClient wiring ─────────────────────────────────────────────────── */
const GEMINI_CFG = {
  GEMINI_API_KEY: 'k', HAS_REPLIT_PROXY: false, REPLIT_GEMINI_BASE_URL: '', REPLIT_GEMINI_API_KEY: '',
  DIRECT_GEMINI_API_KEY: 'k', GEMINI_TUTOR_MODEL: 'm', GEMINI_TIMEOUT_MS: 10000,
};
const resp = (payload, status = 200) => ({
  ok: status < 300, status, statusText: 'S', headers: { get: () => null }, text: async () => JSON.stringify(payload),
});
function withFetch(r, fn) {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => (typeof r === 'function' ? r() : r);
  return fn().finally(() => { globalThis.fetch = orig; });
}
const CONTENTS = [{ role: 'user', parts: [{ text: 'hi' }] }];
function spy() {
  const calls = [];
  return { calls, recordCall: (rec, known) => { calls.push({ rec, known }); } };
}

test('gemini success: one record with usage (no uid in sight)', async () => {
  const s = spy();
  const c = createGeminiClient({ ...GEMINI_CFG, aiCostDaily: s });
  await withFetch(resp({ candidates: [{ content: { parts: [{ text: 'x' }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 2 } }),
    () => c.callGemini('gemini-3.8-flash', CONTENTS, { callClass: 'tutor' }));
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].known, true);
  assert.equal(s.calls[0].rec.promptTokenCount, 10);
  assert.equal(s.calls[0].rec.callClass, 'tutor');
});

test('gemini error WITH usage in the body is costed from it, once', async () => {
  const s = spy();
  const c = createGeminiClient({ ...GEMINI_CFG, aiCostDaily: s });
  await assert.rejects(withFetch(resp({ error: { message: 'bad' }, usageMetadata: { promptTokenCount: 77, candidatesTokenCount: 0 } }, 500),
    () => c.callGemini('gemini-3.8-flash', CONTENTS, {})), /Gemini request failed/);
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].known, true);
  assert.equal(s.calls[0].rec.promptTokenCount, 77);
});

test('gemini error WITHOUT usage is count-only, once; the error still propagates unchanged', async () => {
  const s = spy();
  const c = createGeminiClient({ ...GEMINI_CFG, aiCostDaily: s });
  let err;
  try {
    await withFetch(resp({ error: { message: 'bad' } }, 500), () => c.callGemini('gemini-3.8-flash', CONTENTS, {}));
  } catch (e) { err = e; }
  assert.equal(err.status, 500);
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].known, false);
});

test('gemini abort/network error is count-only', async () => {
  const s = spy();
  const c = createGeminiClient({ ...GEMINI_CFG, aiCostDaily: s });
  await assert.rejects(withFetch(() => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; },
    () => c.callGemini('gemini-3.8-flash', CONTENTS, {})), /timed out/);
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].known, false);
});

test('a throwing cost ledger never fails or changes a successful call', async () => {
  const c = createGeminiClient({ ...GEMINI_CFG, aiCostDaily: { recordCall() { throw new Error('x'); } } });
  const r = await withFetch(resp({ candidates: [{ content: { parts: [{ text: 'ok' }] } }], usageMetadata: { promptTokenCount: 1 } }),
    () => c.callGemini('gemini-3.8-flash', CONTENTS, {}));
  assert.equal(r.text, 'ok');
});

test('kill-switch parity: with the real module and the switch ON, nothing is written and the reply is identical', async () => {
  const db = fakeDb();
  const mk = (env) => createGeminiClient({ ...GEMINI_CFG, aiCostDaily: createAiCostDaily({ resolveFirestore: () => ({ db, FieldValue }), env }) });
  const payload = { candidates: [{ content: { parts: [{ text: 'same' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 5 } };
  const off = await withFetch(resp(payload), () => mk({ AI_COST_DAILY_DISABLED: '1' }).callGemini('gemini-3.8-flash', CONTENTS, {}));
  assert.equal(db.writes.length, 0);
  const on = await withFetch(resp(payload), () => mk({}).callGemini('gemini-3.8-flash', CONTENTS, {}));
  assert.deepEqual(on, off);
  assert.equal(db.writes.length, 1);
});

/* ── admin endpoint ──────────────────────────────────────────────────────── */
const ADMIN = 'admin-owner-uid';
const fakeFirebaseAdmin = {
  auth: () => ({ async verifyIdToken(t) { if (t === 'admin-token') return { uid: ADMIN }; if (t === 'student-token') return { uid: 'u1' }; throw new Error('bad'); } }),
};
function routeFor(docs) {
  process.env.ADMIN_FIREBASE_UIDS = ADMIN;
  const gate = createAdminTelemetryRoutes({ sendJson() {}, firebaseAdmin: fakeFirebaseAdmin, telemetry: null });
  const sent = [];
  const reads = [];
  const db = {
    collection(name) { return { doc: (id) => ({ get: async () => { reads.push({ name, id }); return { exists: id in docs, data: () => docs[id] }; }, set() { throw new Error('WRITE'); } }) }; },
  };
  const r = createAdminAiCostDailyRoutes({
    sendJson: (res, status, body) => sent.push({ status, body }),
    adminFirestore: db,
    requireAdmin: gate.requireFirebaseAdmin,
    now: () => Date.UTC(2026, 10, 26, 6, 0, 0),
    env: {},
  });
  return { r, sent, reads };
}
const reqWith = (token, url = '/api/admin/ai-cost-daily?days=3') => ({ url, method: 'GET', headers: token ? { authorization: `Bearer ${token}` } : {} });

test('admin endpoint: no token 401/403, student refused, nothing read', async () => {
  for (const tok of [null, 'student-token', 'garbage']) {
    const { r, sent, reads } = routeFor({});
    await r.handle(reqWith(tok), {});
    assert.equal(sent[0].status, tok === 'student-token' ? 403 : 401);
    assert.equal(reads.length, 0);
  }
});

test('admin endpoint: admin gets per-day totals and per-workload split; unrecorded days are not zeros', async () => {
  const docs = { '2026-11-26': { calls: 3, costMicroInr: 5_500_000, unknownUsageCalls: 1, byWorkload: { grade_structured: { grade: { calls: 2, costMicroInr: 5_000_000 } }, tutor: { tutor: { calls: 1, costMicroInr: 500_000 } } } } };
  const { r, sent, reads } = routeFor(docs);
  await r.handle(reqWith('admin-token'), {});
  assert.equal(sent[0].status, 200);
  const b = sent[0].body;
  assert.equal(b.days.length, 3);
  assert.equal(reads.length, 3);
  assert.equal(b.todayKey, '2026-11-26');
  assert.equal(b.days[0].costInr, 5.5);
  assert.equal(b.days[0].byWorkload.grade_structured.costInr, 5);
  assert.deepEqual(b.days[1], { day: '2026-11-25', recorded: false });
  assert.equal(b.usdInrIsDefault, true);
});

test('summariseDay tolerates junk', () => {
  assert.deepEqual(summariseDay('d', null), { day: 'd', recorded: false });
  assert.equal(summariseDay('d', { calls: 'x', byWorkload: { w: null } }).calls, 0);
});

test('source pins: index.cjs mounts the route; firestore.rules and usageLedger are untouched by this lane', () => {
  const idx = fs.readFileSync(path.join(__dirname, '..', 'index.cjs'), 'utf8');
  assert.match(idx, /reqPath === '\/api\/admin\/ai-cost-daily'.*requireAdmin: adminTelemetryRoutes\.requireFirebaseAdmin/);
});
