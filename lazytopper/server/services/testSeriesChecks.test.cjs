'use strict';
// TS-PACK-1 - written-answer checking on the Test Series papers for Test Series Pack owners.
// Run: node --test lazytopper/server/services/testSeriesChecks.test.cjs
// No model, no network: a versioned in-memory Firestore (conflicting transactions RETRY, like Firestore's), the REAL
// entitlement gate, and a fixture manifest in the shape TEST-SERIES-1 commits (server/data/testSeriesPapers.json).

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { EventEmitter } = require('node:events');
const { createEntitlementGate } = require('./entitlement.cjs');
const {
  createTestSeriesChecks,
  canonicalQuestionTextHash,
  indexManifest,
  loadManifest,
  verifySubmission,
  seriesPaperOf,
  CHECKS_PER_PAPER,
  CHECKS_FIELD,
  HOLDS_FIELD,
  HOLD_TTL_MS,
  MANIFEST_PATH,
} = require('./testSeriesChecks.cjs');
const { setChargeableCount } = require('../grading/charge.cjs');
const { preReadGradingBody, cachedReadJson } = require('./fairUse.cjs');
const { readJson, createHttpUtils } = require('./httpUtils.cjs');
const { TEST_SERIES_ENDS_MS } = require('./packTerms.cjs');

const NOW = Date.parse('2026-11-20T06:30:00.000Z');
const GRADE = '/api/grade-worksheet';

/* ── fixtures ────────────────────────────────────────────────────────────────── */

const Q = {
  'm-ct-01-b1': { text: 'Find the HCF of 96 and 404 by prime factorisation.', marks: 2 },
  'm-ct-01-c1': { text: 'Prove that  √2 is irrational.', marks: 3 },
  'm-ct-01-d1': { text: 'A two-digit number ... find the number.', marks: 5 },
  'm-fm-01-b1': { text: 'Find the zeroes of x² − 3x + 2.', marks: 2 },
};
// The committed manifest's shape (TEST-SERIES-1 + TS-PACK-1 textHashes): a top-level array.
const MANIFEST_RAW = [
  {
    key: 'TS-CT-M01',
    subject: 'Maths',
    kind: 'chapter',
    number: 1,
    paperCode: 'CT-M01',
    topicKey: 'real-numbers',
    worksheetIdPrefix: 'ct-ts1-real-numbers--',
    questionIds: ['m-ct-01-a1', 'm-ct-01-b1', 'm-ct-01-c1', 'm-ct-01-d1'],
    sectionBEQuestionIds: ['m-ct-01-b1', 'm-ct-01-c1', 'm-ct-01-d1'],
    textHashes: Object.fromEntries(['m-ct-01-b1', 'm-ct-01-c1', 'm-ct-01-d1'].map((id) => [id, canonicalQuestionTextHash(Q[id].text)])),
  },
  {
    key: 'TS-FM-M1',
    subject: 'Maths',
    kind: 'mock',
    number: 1,
    paperCode: 'FM-M1',
    topicKey: null,
    worksheetIdPrefix: 'fm-ts1-m1--',
    questionIds: ['m-fm-01-a1', 'm-fm-01-b1'],
    sectionBEQuestionIds: ['m-fm-01-b1'],
    textHashes: { 'm-fm-01-b1': canonicalQuestionTextHash(Q['m-fm-01-b1'].text) },
  },
];
const MANIFEST = indexManifest(MANIFEST_RAW);

const q = (id, n, over = {}) => ({ qNumber: n, questionId: id, questionText: Q[id].text, marks: Q[id].marks, ...over });
const CT = 'TS-CT-M01';
const FM = 'TS-FM-M1';
const seriesBody = (over = {}) => ({
  worksheetId: 'ct-ts1-real-numbers--mz1abc-7f3',
  questions: [q('m-ct-01-b1', 6), q('m-ct-01-c1', 9)],
  imageBase64: 'AAAA',
  ...over,
});

/** A versioned in-memory Firestore: a transaction whose reads changed under it RETRIES (Firestore's contract). */
function memoryDb(seed = {}) {
  const docs = new Map(Object.entries(seed).map(([k, v]) => [k, { data: v, version: 1 }]));
  const stats = { commits: 0, retries: 0 };
  const yieldNow = () => new Promise((r) => setImmediate(r));
  const snapOf = (e) => ({ exists: !!e, data: () => (e ? JSON.parse(JSON.stringify(e.data)) : undefined) });
  const write = (k, data, opts) => {
    const old = docs.get(k);
    const next = opts && opts.merge && old ? { ...old.data, ...data } : data;
    docs.set(k, { data: JSON.parse(JSON.stringify(next)), version: (old ? old.version : 0) + 1 });
  };
  const ref = (key) => ({
    key,
    collection: (sub) => coll(`${key}/${sub}`),
    async get() { await yieldNow(); return snapOf(docs.get(key)); },
    async set(data, opts) { await yieldNow(); write(key, data, opts); },
  });
  const coll = (key) => ({
    key,
    doc: (id) => ref(`${key}/${id}`),
    async get() {
      await yieldNow();
      return { docs: [...docs].filter(([k]) => k.startsWith(`${key}/`) && !k.slice(key.length + 1).includes('/')).map(([k, e]) => ({ id: k.split('/').pop(), ...snapOf(e) })) };
    },
  });
  return {
    docs,
    stats,
    read: (k) => (docs.get(k) ? JSON.parse(JSON.stringify(docs.get(k).data)) : undefined),
    collection: (name) => coll(name),
    async runTransaction(fn) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const seen = new Map();
        const pending = [];
        const tx = {
          async get(r) { await yieldNow(); const e = docs.get(r.key); seen.set(r.key, e ? e.version : 0); return snapOf(e); },
          set(r, data, opts) { pending.push([r.key, data, opts]); },
        };
        const out = await fn(tx);
        await yieldNow();
        if ([...seen].some(([k, v]) => (docs.get(k) ? docs.get(k).version : 0) !== v)) { stats.retries += 1; continue; }
        for (const [k, d, o] of pending) write(k, d, o);
        stats.commits += 1;
        return out;
      }
      throw new Error('transaction contention');
    },
  };
}

const TS_PACK = { packId: 'test_series:all', sku: 'test_series', target: 'all', pricePaidInr: 1179, paidAt: NOW - 60_000, orderId: 'o1', paymentRef: 'p1', creditedToPass: false };
const CBQ_PACK = { packId: 'pack_cbq:maths', sku: 'pack_cbq', target: 'maths', pricePaidInr: 235, paidAt: NOW - 60_000, orderId: 'o2' };
const SUBS = {
  free: { tier: 'free' },
  premium: { tier: 'premium', passEnd: new Date(NOW + 30 * 86400000).toISOString() },
  trial: { tier: 'trial', trialStartDate: { seconds: Math.floor((NOW - 86400000) / 1000) } },
  none: null,
};

function setup({ sub = 'free', owns = true, used, holds, packs = [], uid = 'u1', env = {}, nowMs = NOW, manifest = MANIFEST, testSeries = true } = {}) {
  const clock = { now: nowMs };
  const seed = {};
  if (SUBS[sub]) seed[`subscriptions/${uid}`] = SUBS[sub];
  const allPacks = [...(owns ? [TS_PACK] : []), ...packs];
  if (allPacks.length || used !== undefined || holds !== undefined) seed[`packEntitlements/${uid}`] = { ...(used !== undefined ? { [CHECKS_FIELD]: used } : {}), ...(holds !== undefined ? { [HOLDS_FIELD]: holds } : {}) };
  for (const p of allPacks) seed[`packEntitlements/${uid}/packs/${p.packId}`] = p;
  const db = memoryDb(seed);
  const events = [];
  const telemetry = { increment: (e) => events.push(e) };
  const checks = createTestSeriesChecks({ adminFirestore: db, telemetry, now: () => clock.now, manifest, readBody: async (r) => r.body });
  const sent = [];
  const gate = createEntitlementGate({
    adminFirestore: db, telemetry, logger: { warn() {}, info() {}, error() {} }, now: () => clock.now, cacheTtlMs: 0, env,
    sendJson: (res, status, body) => { sent.push({ status, body }); if (res && typeof res.end === 'function') res.end(status); },
    ...(testSeries ? { testSeriesChecks: checks } : {}),
  });
  return { db, gate, checks, sent, events, uid, clock };
}

/**
 * A response double shaped like Node's: the handler sets statusCode, then calls `res.end(body)` (which the module wraps). `serve`
 * ends it as the handler would; `drop()` is the client going away BEFORE any answer (close, no end); `abortThenServe` is the client
 * going away and the handler answering AFTERWARDS (end is still called; close may come first or after).
 */
function fakeRes() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.writableFinished = false;
  res.ends = 0;
  res.end = function end() { res.ends += 1; res.writableFinished = true; res.emit('finish'); res.emit('close'); return res; };
  res.serve = (status, graded) => { if (status) res.statusCode = status; if (graded !== undefined) setChargeableCount(res, graded); res.end('{}'); };
  res.drop = () => { res.emit('close'); };
  return res;
}
const reqWith = (body, headers = {}) => ({ method: 'POST', headers: { authorization: 'Bearer t', ...headers }, body });
const settle = () => new Promise((r) => setTimeout(r, 30));
const usedOnPaper = (db, uid, paperKey) => {
  const d = db.read(`packEntitlements/${uid}`) || {};
  return (d[CHECKS_FIELD] || {})[paperKey] || 0;
};
/** Committed checks + live holds on a paper (what the allowance sees). */
const takenOn = (db, uid, paperKey) => {
  const d = db.read(`packEntitlements/${uid}`) || {};
  const holds = Object.values(d[HOLDS_FIELD] || {}).filter((h) => h.paper === paperKey).length;
  return ((d[CHECKS_FIELD] || {})[paperKey] || 0) + holds;
};
const holdsOf = (db, uid) => Object.keys((db.read(`packEntitlements/${uid}`) || {})[HOLDS_FIELD] || {}).length;
const usedMap = (paperKey, n) => ({ [paperKey]: n });

/* ── the manifest ────────────────────────────────────────────────────────────── */

test('manifest: a paper is found by the worksheetId PREFIX (`ct-ts1-<topicKey>--` / `fm-ts1-<m|s><n>--`) only', () => {
  assert.equal(MANIFEST.count, 2);
  assert.equal(seriesPaperOf({ worksheetId: 'ct-ts1-real-numbers--mz1abc-7f3' }, MANIFEST).key, CT);
  assert.equal(seriesPaperOf({ worksheetId: 'fm-ts1-m1--mz1abc-7f3' }, MANIFEST).key, FM);
  for (const w of [
    'ct-ts1-real-numbers--', // the bare prefix is not a sitting
    'ct-ts1-real-numbers-x--abc', // another chapter's prefix
    'fm-ts1-m10--abc', // Mock 10 is not Mock 1 (the "--" separator)
    'ct-real-numbers--abc', 'TS-CT-M01', 'CT-M01', 'ci:abc', '', undefined, 7, '__proto__', `ct-ts1-real-numbers--${'x'.repeat(300)}`,
  ]) {
    assert.equal(seriesPaperOf({ worksheetId: w }, MANIFEST), null, String(w).slice(0, 40));
  }
  assert.equal(seriesPaperOf(null, MANIFEST), null);
});

test('manifest: a malformed paper is DROPPED (fail closed); a missing, unreadable or EMPTY file has no papers and logs an ERROR', () => {
  const ok = (over) => ({ key: 'K', worksheetIdPrefix: 'ct-ts1-a--', questionIds: ['x'], sectionBEQuestionIds: ['x'], textHashes: { x: 'f'.repeat(64) }, ...over });
  const bad = indexManifest([
    ok({ key: 'a', worksheetIdPrefix: 'ct-ts1-a1--', textHashes: {} }), // no hash
    ok({ key: 'b', worksheetIdPrefix: 'ct-ts1-b--', sectionBEQuestionIds: ['y'], textHashes: { y: 'f'.repeat(64) } }), // outside questionIds
    ok({ key: 'c', worksheetIdPrefix: 'ct-ts1-c--', textHashes: { x: 'not-hex' } }),
    ok({ key: 'd', worksheetIdPrefix: 'ct-ts1-d--', sectionBEQuestionIds: [] }), // nothing to check
    ok({ key: 'e', worksheetIdPrefix: 'ct-ts1-e--', sectionBEQuestionIds: ['x', 'x'] }), // duplicate id
    ok({ key: 'f', worksheetIdPrefix: 'ct-ts1-f' }), // a prefix without the "--" separator would match other papers
    ok({ key: 'g', worksheetIdPrefix: '' }),
    ok({ key: 'OK', worksheetIdPrefix: 'ct-ts1-ok--' }),
    ok({ key: 'OK', worksheetIdPrefix: 'ct-ts1-ok2--' }), // duplicate key
    ok({ key: 'OK3', worksheetIdPrefix: 'ct-ts1-ok--' }), // duplicate prefix
    ok({ key: 'h', worksheetIdPrefix: 'ct-ts1-h--', textHashes: Object.assign(Object.create({ x: 'f'.repeat(64) }), {}) }), // inherited only
  ]);
  assert.equal(bad.count, 1);
  assert.equal(bad.dropped, 10);
  assert.equal(indexManifest(null).count, 0);
  assert.equal(indexManifest({ papers: [] }).count, 0, 'an object is not the committed array shape');
  const logs = [];
  const missing = loadManifest('/nonexistent/testSeriesPapers.json', { error: (m) => logs.push(m) });
  assert.equal(missing.count, 0);
  assert.equal(logs.length, 1, 'a missing file is an ERROR (no series check can pass)');
  const logged = [];
  assert.equal(loadManifest(__filename, { error: (m) => logged.push(m) }).count, 0); // not JSON
  assert.equal(logged.length, 1);
  const fs = require('node:fs');
  const os = require('node:os');
  const tmp = require('node:path').join(fs.mkdtempSync(require('node:path').join(os.tmpdir(), 'tsm-')), 'm.json');
  fs.writeFileSync(tmp, '[]');
  const emptyLogs = [];
  assert.equal(loadManifest(tmp, { error: (m) => emptyLogs.push(m) }).count, 0);
  assert.match(emptyLogs.join(' '), /0 papers/);
  assert.match(MANIFEST_PATH, /server[\\/]data[\\/]testSeriesPapers\.json$/);
});

test('the REAL committed manifest (server/data/testSeriesPapers.json) loads 66 papers, none dropped, nothing logged', () => {
  const logs = [];
  const m = loadManifest(MANIFEST_PATH, { error: (x) => logs.push(x) });
  assert.equal(m.count, 66);
  assert.equal(m.dropped, 0);
  assert.deepEqual(logs, []);
  assert.equal(m.byKey.get('TS-CT-M01').prefix, 'ct-ts1-real-numbers--');
  assert.ok(m.byKey.get('TS-FM-S20'));
  // a real sitting id resolves to its paper
  assert.equal(seriesPaperOf({ worksheetId: 'ct-ts1-real-numbers--mz1abc-7f3' }, m).key, 'TS-CT-M01');
  assert.equal(seriesPaperOf({ worksheetId: 'fm-ts1-s20--mz1abc-7f3' }, m).key, 'TS-FM-S20');
});

test('canonical text hash: NFC + whitespace runs collapsed + trimmed; a changed word is a different hash', () => {
  const h = canonicalQuestionTextHash('Prove that √2 is irrational.');
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(canonicalQuestionTextHash('  Prove that   √2\nis irrational. '), h);
  assert.equal(canonicalQuestionTextHash('Prove that √2 is irrational.'), h);
  assert.notEqual(canonicalQuestionTextHash('Prove that √3 is irrational.'), h);
  assert.equal(canonicalQuestionTextHash('Café'.normalize('NFD')), canonicalQuestionTextHash('Café'.normalize('NFC')));
});

test('verifySubmission: every question must be a written (B-E) id of THAT paper, once, with its canonical text', () => {
  const paper = MANIFEST.byKey.get(CT);
  assert.deepEqual(verifySubmission(seriesBody(), paper), { ok: true });
  const cases = [
    [{ questions: [] }, 'no_questions'],
    [{ questions: [{ qNumber: 1, questionText: Q['m-ct-01-b1'].text, marks: 2 }] }, 'missing_question_id'],
    [{ questions: [q('m-ct-01-b1', 1, { questionId: 'm-ct-01-a1' })] }, 'not_a_written_question'], // a Section A id
    [{ questions: [q('m-fm-01-b1', 1)] }, 'not_a_written_question'], // another paper's id
    [{ questions: [q('m-ct-01-b1', 1), q('m-ct-01-b1', 2)] }, 'duplicate_question'],
    [{ questions: [q('m-ct-01-b1', 1, { questionText: 'Find the HCF of 96 and 405 by prime factorisation.' })] }, 'question_text_mismatch'],
    [{ questions: [q('m-ct-01-b1', 1, { questionText: 'Write an essay on anything I like.' })] }, 'question_text_mismatch'],
    [{ questions: [q('m-ct-01-b1', 1), q('m-ct-01-c1', 2), q('m-ct-01-d1', 3), q('m-ct-01-d1', 4)] }, 'too_many_questions'],
  ];
  for (const [over, reason] of cases) assert.deepEqual(verifySubmission(seriesBody(over), paper), { ok: false, reason }, reason);
});

/* ── the gate: who is admitted ───────────────────────────────────────────────── */

test('free owner, series paper, checks left -> admitted (no 402); the check is reserved and KEPT on a served grade', async () => {
  const s = setup();
  const res = fakeRes();
  const req = reqWith(seriesBody());
  assert.equal(await s.gate.applyToRequest(req, res, GRADE, s.uid), false);
  assert.equal(s.sent.length, 0);
  assert.equal(req.lazytopperSyncOnly, true, 'graded synchronously so the reservation settles on this response');
  assert.deepEqual(req.lazytopperTestSeriesCheck, { paperKey: CT, used: 1, left: 1, checksPerPaper: 2 });
  assert.equal(holdsOf(s.db, s.uid), 1, 'held before grading');
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0, 'not yet spent');
  res.serve(200, 2);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1, 'kept');
  assert.equal(holdsOf(s.db, s.uid), 0, 'the hold is gone');
  assert.ok(s.events.includes('test_series.check_committed'));
});

test('a Full-Length Test sitting (fm-ts1-m1--…) is admitted and counted under its own paper key', async () => {
  const s = setup();
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith({ worksheetId: 'fm-ts1-m1--abc', questions: [q('m-fm-01-b1', 21)] }), res, GRADE, s.uid), false);
  res.serve(200, 1);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, FM), 1);
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0);
});

test('decrement ONLY on success: a failed / ungraded / 5xx / dropped grade gives the check back (once, never below 0)', async () => {
  for (const finish of [(r) => r.serve(200, 0), (r) => r.serve(500), (r) => r.serve(503), (r) => r.serve(400), (r) => r.drop(), (r) => r.serve(200)]) {
    const s = setup({ used: usedMap(CT, 1) });
    const res = fakeRes();
    assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false);
    assert.equal(takenOn(s.db, s.uid, CT), 2, 'held');
    finish(res);
    res.emit('close'); // a second signal must not settle twice
    await settle();
    assert.equal(takenOn(s.db, s.uid, CT), 1, 'given back exactly once');
    assert.equal(usedOnPaper(s.db, s.uid, CT), 1);
    assert.equal(holdsOf(s.db, s.uid), 0);
  }
});

test('at 2 checks on a paper -> 402 with the exhausted line; another paper still has its own 2', async () => {
  const s = setup({ used: usedMap(CT, 2) });
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), true);
  assert.equal(s.sent[0].status, 402);
  assert.equal(s.sent[0].body.error, 'premium_required');
  assert.equal(s.sent[0].body.feature, 'test-series-check');
  assert.match(s.sent[0].body.message, /twice/);
  assert.deepEqual(s.sent[0].body.testSeries, { reason: 'exhausted', paperKey: CT, checksPerPaper: 2, left: 0 });
  assert.equal(usedOnPaper(s.db, s.uid, CT), 2, 'nothing moved');

  const res2 = fakeRes();
  const fm = { worksheetId: 'fm-ts1-m1--abc', questions: [q('m-fm-01-b1', 4)] };
  assert.equal(await s.gate.applyToRequest(reqWith(fm), res2, GRADE, s.uid), false);
  assert.equal(CHECKS_PER_PAPER, 2);
});

test('the 2-per-paper allowance end to end: check, check, refused', async () => {
  const s = setup();
  for (let i = 0; i < 2; i += 1) {
    const res = fakeRes();
    assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false, `check ${i + 1}`);
    res.serve(200, 2);
    await settle();
  }
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), true);
  assert.equal(s.sent.at(-1).status, 402);
  assert.equal(usedOnPaper(s.db, s.uid, CT), 2);
});

test('CONCURRENCY: 1 check left, two uploads at once -> exactly one admitted, one refused; then a failed grade frees it again', async () => {
  const s = setup({ used: usedMap(CT, 1) });
  const resA = fakeRes();
  const resB = fakeRes();
  const [a, b] = await Promise.all([
    s.gate.applyToRequest(reqWith(seriesBody()), resA, GRADE, s.uid),
    s.gate.applyToRequest(reqWith(seriesBody()), resB, GRADE, s.uid),
  ]);
  assert.deepEqual([a, b].sort(), [false, true], 'one admitted (false), one answered (true)');
  assert.equal(s.sent.length, 1);
  assert.equal(s.sent[0].status, 402);
  assert.equal(takenOn(s.db, s.uid, CT), 2);
  assert.ok(s.db.stats.retries > 0, 'the second transaction saw the first commit and re-ran');
  const admitted = a === false ? resA : resB;
  admitted.serve(500);
  await settle();
  assert.equal(takenOn(s.db, s.uid, CT), 1, 'the failed grade gave its hold back');
});

test('CONCURRENCY: 5 parallel uploads with 2 left -> exactly 2 admitted', async () => {
  const s = setup();
  const outs = await Promise.all(Array.from({ length: 5 }, () => s.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, s.uid)));
  assert.equal(outs.filter((x) => x === false).length, 2);
  assert.equal(outs.filter((x) => x === true).length, 3);
  assert.equal(takenOn(s.db, s.uid, CT), 2);
});

test('expired pack (after 31 May 2027 IST) -> 402, nothing counted', async () => {
  const s = setup({ nowMs: TEST_SERIES_ENDS_MS + 1 });
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, s.uid), true);
  assert.equal(s.sent[0].status, 402);
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0);
  const last = setup({ nowMs: TEST_SERIES_ENDS_MS });
  assert.equal(await last.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, last.uid), false, 'the whole last day is valid');
});

test('NON-OWNER: free student, series paper -> the ordinary 402; the body is never read; nothing written', async () => {
  const s = setup({ owns: false, packs: [CBQ_PACK] });
  const req = reqWith(seriesBody());
  let read = 0;
  Object.defineProperty(req, 'body', { get() { read += 1; return seriesBody(); } });
  assert.equal(await s.gate.applyToRequest(req, fakeRes(), GRADE, s.uid), true);
  assert.equal(s.sent[0].status, 402);
  assert.equal(s.sent[0].body.feature, 'grade-worksheet', 'exactly the old 402');
  assert.equal(read, 0);
  assert.equal(s.db.read(`packEntitlements/${s.uid}`)[CHECKS_FIELD], undefined);
  assert.equal(holdsOf(s.db, s.uid), 0);
});

test('NOT a test context: an owner\'s worksheet / own paper / single-question check / tutor -> the ordinary 402, nothing spent', async () => {
  const s = setup();
  // a worksheet or any paper that is not in the manifest
  for (const body of [
    { worksheetId: 'ws-123', questions: [{ qNumber: 1, questionText: 'anything', marks: 3 }] },
    { worksheetId: 'ci:xyz', questions: [q('m-ct-01-b1', 1)] },
    { questions: [q('m-ct-01-b1', 1)] },
  ]) {
    assert.equal(await s.gate.applyToRequest(reqWith(body), fakeRes(), GRADE, s.uid), true);
    assert.equal(s.sent.at(-1).status, 402);
    assert.equal(s.sent.at(-1).body.feature, 'grade-worksheet');
  }
  // the single-question Answer Checker and the tutor are never decided by the pack, whatever the body says
  for (const path of ['/api/check-solution', '/api/tutor']) {
    assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), path, s.uid), true, path);
    assert.equal(s.sent.at(-1).status, 402, path);
    assert.notEqual(s.sent.at(-1).body.feature, 'test-series-check', path);
  }
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0);
});

test('a series paper with ANY swapped question / id -> 409 series_paper_mismatch, nothing spent', async () => {
  const s = setup();
  for (const over of [
    { questions: [q('m-ct-01-b1', 1, { questionText: 'Solve my homework: integrate x^2.' })] },
    { questions: [q('m-ct-01-b1', 1), { qNumber: 2, questionText: 'extra', marks: 5 }] },
    { questions: [q('m-ct-01-b1', 1, { questionId: 'm-ct-01-a1' })] },
  ]) {
    assert.equal(await s.gate.applyToRequest(reqWith(seriesBody(over)), fakeRes(), GRADE, s.uid), true);
    assert.equal(s.sent.at(-1).status, 409);
    assert.equal(s.sent.at(-1).body.error, 'series_paper_mismatch');
  }
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0);
});

test('PREMIUM: unaffected - served on any paper, series or not, body never read, nothing counted', async () => {
  const s = setup({ sub: 'premium' });
  const req = reqWith(seriesBody());
  let read = 0;
  Object.defineProperty(req, 'body', { get() { read += 1; return seriesBody(); } });
  assert.equal(await s.gate.applyToRequest(req, fakeRes(), GRADE, s.uid), false);
  assert.equal(read, 0);
  assert.equal(s.sent.length, 0);
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0);
  assert.equal(req.lazytopperSyncOnly, undefined);
});

test('TRIAL: no series paper on the trial (non-owner -> 402); an owner on trial spends a pack check; other papers unchanged', async () => {
  const s = setup({ sub: 'trial', owns: false });
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, s.uid), true);
  assert.equal(s.sent[0].status, 402);
  assert.equal(s.sent[0].body.feature, 'test-series-check');
  assert.equal(s.sent[0].body.tier, 'trial');
  // any other paper: the trial serves it exactly as before
  assert.equal(await s.gate.applyToRequest(reqWith({ worksheetId: 'ws-1', questions: [{ qNumber: 1, questionText: 'x' }] }), fakeRes(), GRADE, s.uid), false);
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), '/api/check-solution', s.uid), false);

  const o = setup({ sub: 'trial' });
  const res = fakeRes();
  assert.equal(await o.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, o.uid), false);
  res.serve(200, 2);
  await settle();
  assert.equal(usedOnPaper(o.db, o.uid, CT), 1);
});

test('LIMITS-1 "first paper of each kind": never a series paper for a non-owner; any other paper still bypasses as before', async () => {
  const s = setup({ owns: false });
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, s.uid, undefined, { limitsBypass: true }), true);
  assert.equal(s.sent[0].status, 402);
  assert.equal(await s.gate.applyToRequest(reqWith({ worksheetId: 'ws-1', questions: [] }), fakeRes(), GRADE, s.uid, undefined, { limitsBypass: true }), false);
  // a bypass on the single-question path is untouched (no read, no 402)
  assert.equal(await s.gate.applyToRequest(reqWith({}), fakeRes(), '/api/check-solution', s.uid, undefined, { limitsBypass: true }), false);
  assert.equal(s.sent.length, 1);
});

test('kill switch TS_CHECKS_DISABLED=1: the rule is inert - an owner meets the old 402, a trial is served as before', async () => {
  const s = setup({ env: { TS_CHECKS_DISABLED: '1' } });
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, s.uid), true);
  assert.equal(s.sent[0].body.feature, 'grade-worksheet');
  const t = setup({ sub: 'trial', owns: false, env: { TS_CHECKS_DISABLED: '1' } });
  assert.equal(await t.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, t.uid), false);
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0);
});

test('no manifest / no module: nothing changes (the gate is byte-for-byte the old one)', async () => {
  const none = setup({ manifest: indexManifest([]) });
  assert.equal(await none.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, none.uid), true);
  assert.equal(none.sent[0].body.feature, 'grade-worksheet');
  const absent = setup({ testSeries: false, sub: 'trial' });
  assert.equal(await absent.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, absent.uid), false);
});

test('a Firestore failure while reserving -> 503 (never a free check), nothing written', async () => {
  const s = setup();
  s.db.runTransaction = async () => { throw new Error('FIRESTORE DOWN'); };
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, s.uid), true);
  assert.equal(s.sent[0].status, 503);
  assert.equal(s.sent[0].body.error, 'test_series_unavailable');
});

test('status(): the owner view for /api/packs/mine - per-paper counts by paperKey, capped, validity date', async () => {
  const s = setup({ used: { ...usedMap(CT, 1), ...usedMap(FM, 7) } });
  assert.deepEqual(await s.checks.status(s.uid), {
    owned: true, active: true, validUntilMs: TEST_SERIES_ENDS_MS, checksPerPaper: 2, used: { [CT]: 1, [FM]: 2 },
  });
  const n = setup({ owns: false });
  assert.equal(await n.checks.status(n.uid), null);
});

/* ── over real HTTP: the body is read ONCE and the handler gets the same parse ─── */

test('HTTP: the gate pre-reads the body; the handler (cachedReadJson) receives the same parse and the check settles on its 200', async (t) => {
  const db = memoryDb({ [`subscriptions/u1`]: SUBS.free, 'packEntitlements/u1/packs/test_series:all': TS_PACK });
  const { sendJson } = createHttpUtils('*');
  const checks = createTestSeriesChecks({ adminFirestore: db, now: () => NOW, manifest: MANIFEST, readBody: (r) => preReadGradingBody(r, readJson) });
  const gate = createEntitlementGate({ adminFirestore: db, logger: { warn() {}, info() {}, error() {} }, now: () => NOW, cacheTtlMs: 0, sendJson, testSeriesChecks: checks });
  const handlerRead = cachedReadJson(readJson);
  let handlerSaw = null;
  const server = http.createServer(async (req, res) => {
    if (await gate.applyToRequest(req, res, GRADE, 'u1')) return;
    handlerSaw = await handlerRead(req, 10 * 1024 * 1024);
    setChargeableCount(res, handlerSaw.questions.length);
    sendJson(res, 200, { ok: true, n: handlerSaw.questions.length });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  t.after(() => new Promise((r) => server.close(r)));
  const payload = JSON.stringify(seriesBody());
  const reply = await new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: server.address().port, path: GRADE, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, (res) => {
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(text) }));
    });
    r.on('error', reject);
    r.end(payload);
  });
  assert.equal(reply.status, 200);
  assert.equal(reply.json.n, 2);
  assert.deepEqual(handlerSaw, seriesBody());
  await settle();
  assert.equal(usedOnPaper(db, 'u1', CT), 1);
});


/* ── C · settle from res.end (as idempotency does), never from a close that follows an end; holds expire ──────────── */

test('ABORT-THEN-REPLAY: the client goes away, the handler still answers a graded 200 (idempotency stores it) -> the check is KEPT; the replay spends nothing more', async () => {
  const s = setup();
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false);
  // Node: the socket closes first, but the handler's end() still runs (and the idempotency layer stores the body at end()).
  // Model the worst order: end with the socket already gone (writableFinished stays false), then close.
  setChargeableCount(res, 2);
  res.statusCode = 200;
  const end = res.end;
  res.end('{"ok":true}');
  void end; // the wrapper ran
  res.emit('close');
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1, 'the delivered (stored) grade keeps its check - no refund on the late close');
  assert.equal(holdsOf(s.db, s.uid), 0);
  // the replay is answered by the idempotency layer BEFORE the gate (index.cjs): the gate is not reached, nothing moves.
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1);
});

test('the wrapper runs BEFORE the idempotency wrapper it sits on, and calls through exactly once', async () => {
  const s = setup();
  const res = fakeRes();
  const order = [];
  const inner = res.end;
  res.end = function idempotentEnd() { order.push('idempotency'); return inner.apply(this, arguments); };
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false);
  setChargeableCount(res, 1);
  res.end('{}');
  assert.deepEqual(order, ['idempotency']);
  assert.equal(res.ends, 1);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1);
});

test('a close BEFORE any answer releases (idempotency stores nothing then, so a retry is a fresh request); a later end changes nothing', async () => {
  const s = setup();
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false);
  res.drop();
  await settle();
  assert.equal(takenOn(s.db, s.uid, CT), 0, 'released');
  setChargeableCount(res, 2);
  res.end('{}');
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0, 'already settled - the late end neither keeps nor double-releases');
});

test('CRASH: a hold that is never settled stops counting after HOLD_TTL_MS (no check leaks for good); a fresh one does count', async () => {
  const stale = { h1: { paper: CT, atMs: NOW - HOLD_TTL_MS - 1 }, h2: { paper: CT, atMs: NOW - HOLD_TTL_MS - 5 } };
  const s = setup({ holds: stale });
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, s.uid), false, 'two crashed holds do not block the paper');
  const d = s.db.read(`packEntitlements/${s.uid}`);
  assert.deepEqual(Object.keys(d[HOLDS_FIELD]).filter((k) => k === 'h1' || k === 'h2'), [], 'expired holds are dropped in the same write');

  const fresh = setup({ holds: { h1: { paper: CT, atMs: NOW - 1000 }, h2: { paper: CT, atMs: NOW - 2000 } } });
  assert.equal(await fresh.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, fresh.uid), true, 'two live holds = both checks in flight');
  assert.equal(fresh.sent[0].status, 402);

  // and the clock moving on frees them
  fresh.clock.now = NOW + HOLD_TTL_MS + 1;
  assert.equal(await fresh.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, fresh.uid), false);
});

test('a commit whose hold already expired still counts the delivered grade (never a free grade)', async () => {
  const s = setup();
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false);
  s.clock.now = NOW + HOLD_TTL_MS + 10;
  res.serve(200, 2);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1);
});
