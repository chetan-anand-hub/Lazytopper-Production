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
  FREE_FIELD,
  mostlyUnreadable,
} = require('./testSeriesChecks.cjs');
const { setChargeableCount, setUnreadableSummary, unreadableSummary, isUnreadable } = require('../grading/charge.cjs');
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
  const checks = createTestSeriesChecks({ adminFirestore: db, telemetry, now: () => clock.now, manifest, readBody: async (r) => r.body, env });
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

test('the REAL committed manifest (server/data/testSeriesPapers.json) loads 180 papers (TS-MORE-1), none dropped, nothing logged', () => {
  const logs = [];
  const m = loadManifest(MANIFEST_PATH, { error: (x) => logs.push(x) });
  assert.equal(m.count, 180);
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
  assert.equal(req.lazytopperSyncOnly, undefined, 'TS-PACK-JOBFIX: graded like every other paper (job mode allowed)');
  const ref = require('./testSeriesChecks.cjs').testSeriesDeferredOf(res);
  assert.equal(ref.uid, s.uid);
  assert.equal(ref.paper, CT);
  assert.match(ref.holdId, /^[0-9a-f]{32}$/, 'the hold rides the response, for the job deferred');
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

test('NON-OWNER (TS_FREE_WRITTEN_CHECK_DISABLED=1): free student, series paper -> the ordinary 402; the body is never read; nothing written', async () => {
  const s = setup({ owns: false, packs: [CBQ_PACK], env: { TS_FREE_WRITTEN_CHECK_DISABLED: '1' } });
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

test('TS-PACK-JOBFIX: a 202 (a background job took the grade) settles NOTHING here - the hold waits for the job; a later close is a no-op', async () => {
  const s = setup();
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false);
  res.serve(202, 0);
  res.emit('close');
  await settle();
  assert.equal(holdsOf(s.db, s.uid), 1, 'still held');
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0);
  const ref = require('./testSeriesChecks.cjs').testSeriesDeferredOf(res);
  s.checks.settleDeferred({ uid: s.uid, testSeries: ref }, 3);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1, 'the job end committed it');
  assert.equal(holdsOf(s.db, s.uid), 0);
  s.checks.settleDeferred({ uid: s.uid }, 3); // a deferred without a series hold does nothing
  s.checks.settleDeferred(null, 3);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1);
});

test('TRIAL (TS_FREE_WRITTEN_CHECK_DISABLED=1): no series paper on the trial (non-owner -> 402); an owner on trial spends a pack check; other papers unchanged', async () => {
  const s = setup({ sub: 'trial', owns: false, env: { TS_FREE_WRITTEN_CHECK_DISABLED: '1' } });
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

test('LIMITS-1 "first paper of each kind" (TS_FREE_WRITTEN_CHECK_DISABLED=1): never a series paper for a non-owner; any other paper still bypasses as before', async () => {
  const s = setup({ owns: false, env: { TS_FREE_WRITTEN_CHECK_DISABLED: '1' } });
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

/* ── TS-PACK-JOBFIX (review P0 #1) · the owner + series-paper predicates LIMITS-1 uses ─────────────────────────────── */
test('ownerSeriesPaper: owner + manifest paper + matching kind only; expired, non-owner, wrong kind, non-series -> false', async () => {
  const s = setup();
  assert.equal(await s.checks.ownerSeriesPaper(s.uid, 'chapter-test', 'ct-ts1-real-numbers--abc'), true);
  assert.equal(await s.checks.ownerSeriesPaper(s.uid, 'full-mock', 'fm-ts1-m1--abc'), true);
  assert.equal(await s.checks.ownerSeriesPaper(s.uid, 'full-mock', 'ct-ts1-real-numbers--abc'), false, 'wrong kind');
  assert.equal(await s.checks.ownerSeriesPaper(s.uid, 'chapter-test', 'ct-abc'), false, 'not a series paper');
  assert.equal(await s.checks.ownerSeriesPaper(s.uid, 'chapter-test', ''), false);
  const non = setup({ owns: false });
  assert.equal(await non.checks.ownerSeriesPaper(non.uid, 'chapter-test', 'ct-ts1-real-numbers--abc'), false);
  const old = setup({ nowMs: TEST_SERIES_ENDS_MS + 1 });
  assert.equal(await old.checks.ownerSeriesPaper(old.uid, 'chapter-test', 'ct-ts1-real-numbers--abc'), false, 'expired');
});

test('ownerSeriesGrade: the SAME checks as admission (paper + written ids + canonical text) and ownership; writes nothing', async () => {
  const s = setup();
  assert.equal(await s.checks.ownerSeriesGrade(reqWith(seriesBody()), s.uid), true);
  assert.equal(await s.checks.ownerSeriesGrade(reqWith(seriesBody({ questions: [q('m-ct-01-b1', 1, { questionText: 'swapped' })] })), s.uid), false);
  assert.equal(await s.checks.ownerSeriesGrade(reqWith({ worksheetId: 'ws-1', questions: [] }), s.uid), false);
  const non = setup({ owns: false });
  assert.equal(await non.checks.ownerSeriesGrade(reqWith(seriesBody()), non.uid), false);
  assert.equal(holdsOf(s.db, s.uid), 0);
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0);
});


test('TS_CHECKS_DISABLED=1: no LIMITS-1 exemption either - ownerSeriesPaper / ownerSeriesGrade are false for a real owner on a real series paper', async () => {
  for (const v of ['1', 'true', 'on', 'yes']) {
    const s = setup({ env: { TS_CHECKS_DISABLED: v } });
    assert.equal(await s.checks.ownerSeriesPaper(s.uid, 'chapter-test', 'ct-ts1-real-numbers--abc'), false, v);
    assert.equal(await s.checks.ownerSeriesGrade(reqWith(seriesBody()), s.uid), false, v);
    // and no series admission (the gate's own switch is the SAME function)
    assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, s.uid), true);
    assert.equal(s.sent.at(-1).body.feature, 'grade-worksheet');
  }
  const on = setup({ env: { TS_CHECKS_DISABLED: '0' } });
  assert.equal(await on.checks.ownerSeriesPaper(on.uid, 'chapter-test', 'ct-ts1-real-numbers--abc'), true, 'off-values leave it on');
  const { testSeriesChecksDisabled } = require('./testSeriesChecks.cjs');
  assert.equal(require('./entitlement.cjs').testSeriesChecksDisabled, testSeriesChecksDisabled, 'ONE switch function for both');
});


/* ── TS-RECHECK-1 (owner ruling 19 Nov 2026, 15:42 IST) · a sheet the grader mostly could not read is NOT counted - once per paper ── */
const freeOf = (db, uid, key) => ((db.read(`packEntitlements/${uid}`) || {})[FREE_FIELD] || {})[key];
const reasoned = (reason) => { const o = {}; Object.defineProperty(o, '_reason', { value: reason }); return o; };
/** A synchronous grade whose sheet had `unreadable` of `total` unreadable questions (graded count = the rest). */
const serveWith = (res, unreadable, total, graded = total - unreadable) => { setUnreadableSummary(res, { unreadable, total }); res.serve(200, graded); };
async function takeCheck(s, finish) {
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false);
  finish(res);
  await settle();
  return res;
}

test('TS-RECHECK-1 which verdicts count as unreadable: couldNotRead / notInInventory / firstLineNotInWork / answerMismatch - NEVER a blank left blank, a timeout, a failure or a graded answer', () => {
  for (const r of ['couldNotRead', 'notInInventory', 'firstLineNotInWork', 'answerMismatch']) assert.equal(isUnreadable(reasoned(r)), true, r);
  for (const r of ['unattempted', 'blankInInventory', 'timeout', 'failed', 'injectionCited', 'objectiveUnresolved', 'graded']) assert.equal(isUnreadable(reasoned(r)), false, r);
  assert.equal(isUnreadable(null), false);
  assert.deepEqual(unreadableSummary([reasoned('notInInventory'), reasoned('unattempted'), reasoned('graded'), reasoned('blankInInventory')]), { unreadable: 1, total: 4 });
  assert.deepEqual(unreadableSummary(undefined), { unreadable: 0, total: 0 });
});

test('TS-RECHECK-1 threshold: at least half of the check\'s questions, and at least one', () => {
  assert.equal(mostlyUnreadable({ unreadable: 1, total: 2 }), true);
  assert.equal(mostlyUnreadable({ unreadable: 2, total: 3 }), true);
  assert.equal(mostlyUnreadable({ unreadable: 1, total: 3 }), false);
  assert.equal(mostlyUnreadable({ unreadable: 0, total: 3 }), false);
  assert.equal(mostlyUnreadable({ unreadable: 0, total: 0 }), false);
  assert.equal(mostlyUnreadable(undefined), false);
});

test('TS-RECHECK-1 an unreadable sheet (>= 50%, some graded) is NOT counted and flags the free re-check; status() says so; checks left stays 2', async () => {
  const s = setup();
  await takeCheck(s, (r) => serveWith(r, 1, 2));
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0, 'not counted');
  assert.equal(holdsOf(s.db, s.uid), 0);
  assert.equal(freeOf(s.db, s.uid, CT), 0, 'the free re-check is spent (value = committed count at that moment)');
  assert.ok(s.events.includes('test_series.check_free_recheck'));
  const st = await s.checks.status(s.uid);
  assert.deepEqual(st.used, {});
  assert.deepEqual(st.freeRecheck, { [CT]: true });
});

test('TS-RECHECK-1 a SECOND unreadable sheet on the same paper is counted (one free re-check per paper); worst case 3 gradings', async () => {
  const s = setup();
  await takeCheck(s, (r) => serveWith(r, 2, 2, 0 + 1));
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0);
  await takeCheck(s, (r) => serveWith(r, 2, 3));
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1, 'second unreadable: counted');
  assert.equal(((await s.checks.status(s.uid)).freeRecheck || {})[CT], undefined, 'the note goes once a counted check has landed');
  await takeCheck(s, (r) => r.serve(200, 2));
  assert.equal(usedOnPaper(s.db, s.uid, CT), 2);
  const res = fakeRes();
  await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid);
  assert.equal(s.sent.at(-1).status, 402, 'a 4th is refused');
});

test('TS-RECHECK-1 the free re-check is per paper: another paper still has its own', async () => {
  const s = setup();
  await takeCheck(s, (r) => serveWith(r, 1, 1, 1));
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith({ worksheetId: 'fm-ts1-m1--abc', questions: [q('m-fm-01-b1', 21)] }), res, GRADE, s.uid), false);
  serveWith(res, 1, 1, 1);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, FM), 0);
  assert.equal(freeOf(s.db, s.uid, FM), 0);
  assert.equal(freeOf(s.db, s.uid, CT), 0);
});

test('TS-RECHECK-1 partly readable (< 50% unreadable) is counted; a normal check is counted; blanks never make it free', async () => {
  const s = setup();
  await takeCheck(s, (r) => serveWith(r, 1, 3));
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1);
  assert.equal(freeOf(s.db, s.uid, CT), undefined);
  const s2 = setup();
  await takeCheck(s2, (r) => r.serve(200, 2)); // no summary recorded at all
  assert.equal(usedOnPaper(s2.db, s2.uid, CT), 1);
  const s3 = setup();
  await takeCheck(s3, (r) => serveWith(r, 0, 4, 1)); // 3 genuinely blank answers: summary counts none unreadable
  assert.equal(usedOnPaper(s3.db, s3.uid, CT), 1);
});

test('TS-RECHECK-1 nothing graded at all is released exactly as before (and does NOT use up the free re-check)', async () => {
  const s = setup();
  await takeCheck(s, (r) => serveWith(r, 2, 2, 0));
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0);
  assert.equal(freeOf(s.db, s.uid, CT), undefined);
});

test('TS-RECHECK-1 kill switch TS_RECHECK_DISABLED=1: an unreadable sheet is counted exactly as today', async () => {
  const s = setup({ env: { TS_RECHECK_DISABLED: '1' } });
  await takeCheck(s, (r) => serveWith(r, 2, 2, 1));
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1);
  assert.equal(freeOf(s.db, s.uid, CT), undefined);
  assert.equal((await s.checks.status(s.uid)).freeRecheck, undefined);
  // the job path too
  const j = setup({ env: { TS_RECHECK_DISABLED: 'true' } });
  const res = fakeRes();
  await j.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, j.uid);
  res.serve(202, 0);
  j.checks.settleDeferred({ uid: j.uid, testSeries: require('./testSeriesChecks.cjs').testSeriesDeferredOf(res) }, 1, { unreadable: 2, total: 2 });
  await settle();
  assert.equal(usedOnPaper(j.db, j.uid, CT), 1);
});

test('TS-RECHECK-1 background job path: settleDeferred(deferred, graded, { unreadable, total }) refunds once; a second settle of the same hold changes nothing', async () => {
  const s = setup();
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false);
  res.serve(202, 0);
  const deferred = { uid: s.uid, testSeries: require('./testSeriesChecks.cjs').testSeriesDeferredOf(res) };
  s.checks.settleDeferred(deferred, 1, { unreadable: 1, total: 2 });
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0);
  assert.equal(freeOf(s.db, s.uid, CT), 0);
  assert.equal(holdsOf(s.db, s.uid), 0);
  s.checks.settleDeferred(deferred, 1, { unreadable: 1, total: 2 }); // replayed claim: hold already gone
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0, 'no double refund, no stray count');
  assert.equal(takenOn(s.db, s.uid, CT), 0);
  // and with no detail (an interrupted job / older caller) it is counted as today
  const s2 = setup();
  const r2 = fakeRes();
  await s2.gate.applyToRequest(reqWith(seriesBody()), r2, GRADE, s2.uid);
  r2.serve(202, 0);
  s2.checks.settleDeferred({ uid: s2.uid, testSeries: require('./testSeriesChecks.cjs').testSeriesDeferredOf(r2) }, 1);
  await settle();
  assert.equal(usedOnPaper(s2.db, s2.uid, CT), 1);
});

test('TS-RECHECK-1 CONCURRENCY: two holds on one paper settling unreadable at once - exactly ONE free re-check, the other is counted', async () => {
  const s = setup();
  const a = fakeRes();
  const b = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), a, GRADE, s.uid), false);
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), b, GRADE, s.uid), false);
  assert.equal(takenOn(s.db, s.uid, CT), 2);
  serveWith(a, 2, 2, 1);
  serveWith(b, 2, 2, 1);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1, 'one counted');
  assert.equal(freeOf(s.db, s.uid, CT), 0, 'one free');
  assert.equal(holdsOf(s.db, s.uid), 0);
});

test('TS-RECHECK-1 two parallel uploads for the last check still admit exactly one (the free re-check never widens admission)', async () => {
  const s = setup({ used: usedMap(CT, 1) });
  const a = fakeRes();
  const b = fakeRes();
  const [ra, rb] = await Promise.all([s.gate.applyToRequest(reqWith(seriesBody()), a, GRADE, s.uid), s.gate.applyToRequest(reqWith(seriesBody()), b, GRADE, s.uid)]);
  assert.deepEqual([ra, rb].sort(), [false, true]);
});

test('TS-RECHECK-1 an expired hold (> 30 min) that ends unreadable is still counted (as before this lane) and does not spend the free re-check', async () => {
  const s = setup();
  const res = fakeRes();
  await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid);
  s.clock.now = NOW + HOLD_TTL_MS + 10;
  serveWith(res, 2, 2, 1);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1);
  assert.equal(freeOf(s.db, s.uid, CT), undefined);
});

test('TS-RECHECK-1 PREMIUM (Board Pass): never held, never counted, no free-recheck state written', async () => {
  const s = setup({ sub: 'premium' });
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false);
  assert.equal(require('./testSeriesChecks.cjs').testSeriesDeferredOf(res), null);
  serveWith(res, 2, 2, 1);
  await settle();
  assert.deepEqual(s.db.read(`packEntitlements/${s.uid}`), {}, 'untouched');
});

/* ── TS-MORE-1: 180 papers - chapter papers 2..5 and full-length 21..25 are admitted exactly like the original 66 ── */

const Q3 = { 'm-ct-01-p3-b1': { text: 'Find the LCM of 12 and 18 by prime factorisation.', marks: 2 }, 'm-ct-01-p3-c1': { text: 'Show that 5 - sqrt(3) is irrational.', marks: 3 } };
const Q24 = { 'm-fm-24-b1': { text: 'Find the zeroes of x² − 5x + 6.', marks: 2 } };
Object.assign(Q, Q3, Q24);
const entryOf = (key, prefix, ids, extra = {}) => ({
  key, subject: 'Maths', kind: key.startsWith('TS-FM') ? 'mock' : 'chapter', number: 1, paperCode: key.slice(3), topicKey: key.startsWith('TS-FM') ? null : 'real-numbers',
  worksheetIdPrefix: prefix, questionIds: ['x-a1', ...ids], sectionBEQuestionIds: ids,
  textHashes: Object.fromEntries(ids.map((id) => [id, canonicalQuestionTextHash(Q[id].text)])), ...extra,
});
const MORE_RAW = [
  ...MANIFEST_RAW,
  entryOf('TS-CT-M01-3', 'ct-ts1p3-real-numbers--', ['m-ct-01-p3-b1', 'm-ct-01-p3-c1']),
  entryOf('TS-FM-M24', 'fm-ts1-m24--', ['m-fm-24-b1']),
];
const MORE = indexManifest(MORE_RAW);
const P3 = 'TS-CT-M01-3';
const FM24 = 'TS-FM-M24';
const p3Body = (over = {}) => ({ worksheetId: 'ct-ts1p3-real-numbers--mz1abc-7f3', questions: [q('m-ct-01-p3-b1', 7), q('m-ct-01-p3-c1', 8)], imageBase64: 'AAAA', ...over });

test('TS-MORE-1: a check on chapter paper 3 (CT-M01-3) is admitted, counted under its OWN key, and paper 1\'s counter is untouched', async () => {
  const s = setup({ manifest: MORE, used: { [CT]: 1 } });
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(p3Body()), res, GRADE, s.uid), false);
  assert.equal(s.sent.length, 0);
  res.serve(200, 2);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, P3), 1);
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1, 'the existing buyer\'s paper-1 count is exactly what it was');
});

test('TS-MORE-1: paper 3 has its own 2 checks - the third is the exhausted 402; paper 1 and paper 3 never share a counter', async () => {
  const s = setup({ manifest: MORE, used: { [P3]: 2, [CT]: 0 } });
  assert.equal(await s.gate.applyToRequest(reqWith(p3Body()), fakeRes(), GRADE, s.uid), true);
  assert.equal(s.sent[0].status, 402);
  assert.equal(s.sent[0].body.testSeries.reason, 'exhausted');
  assert.equal(s.sent[0].body.testSeries.paperKey, P3);
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false, 'paper 1 still has both its checks');
  res.serve(200, 2);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1);
  assert.equal(usedOnPaper(s.db, s.uid, P3), 2);
});

test('TS-MORE-1: full-length paper 24 (FM-M24) is admitted and counted under its own key', async () => {
  const s = setup({ manifest: MORE });
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith({ worksheetId: 'fm-ts1-m24--abc', questions: [q('m-fm-24-b1', 22)] }), res, GRADE, s.uid), false);
  res.serve(200, 1);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, FM24), 1);
  assert.equal(usedOnPaper(s.db, s.uid, FM), 0);
});

test('TS-MORE-1: prefixes cannot be spoofed across papers - a paper-1 id never admits paper 3\'s questions, nor the reverse; "fm-ts1-m2--" never admits Mock 24', async () => {
  const s = setup({ manifest: MORE });
  // paper 1's worksheetId carrying paper 3's questions (valid ids and valid text for paper 3) -> mismatch, nothing spent
  assert.equal(await s.gate.applyToRequest(reqWith(p3Body({ worksheetId: 'ct-ts1-real-numbers--abc' })), fakeRes(), GRADE, s.uid), true);
  assert.equal(s.sent.at(-1).status, 409);
  assert.equal(s.sent.at(-1).body.error, 'series_paper_mismatch');
  // paper 3's worksheetId carrying paper 1's questions
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody({ worksheetId: 'ct-ts1p3-real-numbers--abc' })), fakeRes(), GRADE, s.uid), true);
  assert.equal(s.sent.at(-1).status, 409);
  // Mock 2's id style does not reach Mock 24, and the mock cannot carry a chapter paper's questions
  assert.equal(await s.gate.applyToRequest(reqWith({ worksheetId: 'fm-ts1-m2--abc', questions: [q('m-fm-24-b1', 22)] }), fakeRes(), GRADE, s.uid), true);
  assert.notEqual(s.sent.at(-1).status, 200);
  assert.equal(holdsOf(s.db, s.uid), 0);
  assert.equal(usedOnPaper(s.db, s.uid, P3) + usedOnPaper(s.db, s.uid, CT) + usedOnPaper(s.db, s.uid, FM24), 0);
  // the prefix lookup itself: each id resolves to exactly its own paper
  assert.equal(seriesPaperOf({ worksheetId: 'ct-ts1p3-real-numbers--x' }, MORE).key, P3);
  assert.equal(seriesPaperOf({ worksheetId: 'ct-ts1-real-numbers--x' }, MORE).key, CT);
  assert.equal(seriesPaperOf({ worksheetId: 'ct-ts1p4-real-numbers--x' }, MORE), null, 'a paper the manifest does not have is no series paper');
  assert.equal(seriesPaperOf({ worksheetId: 'ct-ts1p3-real-numbers-x--x' }, MORE), null);
});

test('TS-MORE-1: an UNKNOWN paper (ct-ts1p9-…, fm-ts1-m26--…) is refused - not a series paper, so the ordinary 402', async () => {
  const s = setup({ manifest: MORE });
  for (const w of ['ct-ts1p9-real-numbers--abc', 'fm-ts1-m26--abc', 'fm-ts1-m99--abc', 'ct-ts1p2-nope--abc']) {
    assert.equal(await s.gate.applyToRequest(reqWith(p3Body({ worksheetId: w })), fakeRes(), GRADE, s.uid), true, w);
    assert.equal(s.sent.at(-1).status, 402, w);
    assert.equal(s.sent.at(-1).body.feature, 'grade-worksheet', `${w}: the ordinary 402, nothing spent`);
  }
  assert.equal(holdsOf(s.db, s.uid), 0);
});

test('TS-MORE-1 kill switch TS_MORE_DISABLED: papers 2..5 and 21..25 are no longer admitted (ordinary 402); the original papers are untouched', async () => {
  for (const v of ['1', 'true', 'on', 'yes']) {
    const s = setup({ manifest: MORE, env: { TS_MORE_DISABLED: v } });
    assert.equal(await s.gate.applyToRequest(reqWith(p3Body()), fakeRes(), GRADE, s.uid), true, v);
    assert.equal(s.sent.at(-1).body.feature, 'grade-worksheet', v);
    assert.equal(await s.gate.applyToRequest(reqWith({ worksheetId: 'fm-ts1-m24--abc', questions: [q('m-fm-24-b1', 22)] }), fakeRes(), GRADE, s.uid), true, v);
    assert.equal(s.sent.at(-1).body.feature, 'grade-worksheet', v);
    // no LIMITS-1 exemption for the new papers either
    assert.equal(await s.checks.ownerSeriesPaper(s.uid, 'chapter-test', 'ct-ts1p3-real-numbers--abc'), false, v);
    assert.equal(await s.checks.ownerSeriesPaper(s.uid, 'full-mock', 'fm-ts1-m24--abc'), false, v);
    assert.equal(await s.checks.ownerSeriesGrade(reqWith(p3Body()), s.uid), false, v);
    // the originals: still series papers
    assert.equal(await s.checks.ownerSeriesPaper(s.uid, 'chapter-test', 'ct-ts1-real-numbers--abc'), true, v);
    const res = fakeRes();
    assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false, v);
    res.serve(200, 2);
    await settle();
    assert.equal(usedOnPaper(s.db, s.uid, CT), 1, v);
  }
  const off = setup({ manifest: MORE, env: { TS_MORE_DISABLED: '0' } });
  assert.equal(await off.checks.ownerSeriesPaper(off.uid, 'chapter-test', 'ct-ts1p3-real-numbers--abc'), true, 'off-values leave the new papers on');
});

test('TS-MORE-1: the REAL manifest - 180 papers, a prefix that is a prefix of another does not exist, and every new paper is recognised as new', () => {
  const m = loadManifest(MANIFEST_PATH, { error: () => {} });
  const { isMorePaper } = require('./testSeriesChecks.cjs');
  assert.equal(m.count, 180);
  const prefixes = m.papers.map((p) => p.prefix);
  for (const a of prefixes) for (const b of prefixes) if (a !== b) assert.equal(b.startsWith(a), false, `${a} is a prefix of ${b}`);
  assert.equal(m.papers.filter(isMorePaper).length, 180 - 66);
  assert.equal(m.papers.slice(0, 66).some(isMorePaper), false, 'the original 66 are never "new"');
  assert.equal(m.byKey.get('TS-CT-M01-3').prefix, 'ct-ts1p3-real-numbers--');
  assert.ok(m.byKey.get('TS-FM-M24') && m.byKey.get('TS-FM-S25'));
  // every paper is found by its own prefix and by nothing else
  for (const p of m.papers) assert.equal(seriesPaperOf({ worksheetId: `${p.prefix}mz1abc-7f3` }, m).key, p.key);
});

test('TS-MORE-1: existing buyers\' counters are unchanged - status() lists committed checks per key exactly as before; new keys appear only once used', async () => {
  const s = setup({ manifest: MORE, used: { [CT]: 1, [FM]: 2 } });
  const st = await s.checks.status(s.uid);
  assert.deepEqual(st.used, { [CT]: 1, [FM]: 2 });
  assert.equal(st.checksPerPaper, CHECKS_PER_PAPER);
});

/* ── TS-THEMES-1: the 30 FOCUS SETS - admitted exactly like the series papers, counted under their own keys, own kill switch ── */

const QF = { 'm-fs-la-d1': { text: 'A train travels 360 km at a uniform speed ... find the speed.', marks: 5 }, 'm-fs-la-d2': { text: 'Prove the basic proportionality theorem.', marks: 5 } };
Object.assign(Q, QF);
const FOCUS_RAW = [
  ...MORE_RAW,
  {
    key: 'TS-FS-M-LA-1', subject: 'Maths', kind: 'focus', number: 1, paperCode: 'FS-M-LA-1', topicKey: null,
    worksheetIdPrefix: 'fm-tsfs-mla1--', questionIds: ['m-fs-la-d1', 'm-fs-la-d2'], sectionBEQuestionIds: ['m-fs-la-d1', 'm-fs-la-d2'],
    textHashes: Object.fromEntries(['m-fs-la-d1', 'm-fs-la-d2'].map((id) => [id, canonicalQuestionTextHash(Q[id].text)])),
  },
];
const FOCUS = indexManifest(FOCUS_RAW);
const FS1 = 'TS-FS-M-LA-1';
const fsBody = (over = {}) => ({ worksheetId: 'fm-tsfs-mla1--mz1abc-7f3', questions: [q('m-fs-la-d1', 1), q('m-fs-la-d2', 2)], imageBase64: 'AAAA', ...over });

test('TS-THEMES-1: a focus set check is admitted, counted under its OWN key (2 per paper), and no series counter moves', async () => {
  const s = setup({ manifest: FOCUS, used: { [FM]: 1 } });
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(fsBody()), res, GRADE, s.uid), false);
  assert.equal(s.sent.length, 0);
  res.serve(200, 2);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, FS1), 1);
  assert.equal(usedOnPaper(s.db, s.uid, FM), 1);
  const ex = setup({ manifest: FOCUS, used: { [FS1]: 2 } });
  assert.equal(await ex.gate.applyToRequest(reqWith(fsBody()), fakeRes(), GRADE, ex.uid), true);
  assert.equal(ex.sent[0].status, 402);
  assert.equal(ex.sent[0].body.testSeries.reason, 'exhausted');
  assert.equal(ex.sent[0].body.testSeries.paperKey, FS1);
});

test('TS-THEMES-1: a focus set is a FULL-MOCK paper for LIMITS-1 (owner exemption), never a chapter test; its questions cannot ride another paper', async () => {
  const s = setup({ manifest: FOCUS });
  assert.equal(await s.checks.ownerSeriesPaper(s.uid, 'full-mock', 'fm-tsfs-mla1--abc'), true);
  assert.equal(await s.checks.ownerSeriesPaper(s.uid, 'chapter-test', 'fm-tsfs-mla1--abc'), false);
  assert.equal(await s.checks.ownerSeriesGrade(reqWith(fsBody()), s.uid), true);
  // a focus set's questions under a series mock id, and a mock's question under the focus id -> mismatch, nothing spent
  assert.equal(await s.gate.applyToRequest(reqWith(fsBody({ worksheetId: 'fm-ts1-m1--abc' })), fakeRes(), GRADE, s.uid), true);
  assert.equal(s.sent.at(-1).status, 409);
  assert.equal(await s.gate.applyToRequest(reqWith({ worksheetId: 'fm-tsfs-mla1--abc', questions: [q('m-fm-01-b1', 21)] }), fakeRes(), GRADE, s.uid), true);
  assert.equal(s.sent.at(-1).status, 409);
  // a focus set the manifest does not have is no series paper (the ordinary 402)
  assert.equal(await s.gate.applyToRequest(reqWith(fsBody({ worksheetId: 'fm-tsfs-mla6--abc' })), fakeRes(), GRADE, s.uid), true);
  assert.equal(s.sent.at(-1).body.feature, 'grade-worksheet');
  assert.equal(holdsOf(s.db, s.uid), 0);
});

test('TS-THEMES-1 kill switch TS_FOCUS_SETS_DISABLED: focus sets are no longer admitted (ordinary 402, no exemption); every series paper is untouched', async () => {
  const { testSeriesFocusSetsDisabled, isFocusPaper } = require('./testSeriesChecks.cjs');
  for (const v of ['1', 'true', 'on', 'yes']) {
    assert.equal(testSeriesFocusSetsDisabled({ TS_FOCUS_SETS_DISABLED: v }), true, v);
    const s = setup({ manifest: FOCUS, env: { TS_FOCUS_SETS_DISABLED: v } });
    assert.equal(await s.gate.applyToRequest(reqWith(fsBody()), fakeRes(), GRADE, s.uid), true, v);
    assert.equal(s.sent.at(-1).body.feature, 'grade-worksheet', v);
    assert.equal(await s.checks.ownerSeriesPaper(s.uid, 'full-mock', 'fm-tsfs-mla1--abc'), false, v);
    assert.equal(await s.checks.ownerSeriesGrade(reqWith(fsBody()), s.uid), false, v);
    assert.equal(await s.checks.ownerSeriesPaper(s.uid, 'full-mock', 'fm-ts1-m24--abc'), true, `${v}: TS-MORE-1 papers stay on`);
    const res = fakeRes();
    assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false, v);
    res.serve(200, 2);
    await settle();
    assert.equal(usedOnPaper(s.db, s.uid, CT), 1, v);
    assert.equal(holdsOf(s.db, s.uid), 0, v);
  }
  for (const v of ['', '0', 'false', 'no']) assert.equal(testSeriesFocusSetsDisabled({ TS_FOCUS_SETS_DISABLED: v }), false, v);
  assert.equal(isFocusPaper({ key: FS1 }), true);
  assert.equal(isFocusPaper({ key: 'TS-FM-M1' }), false);
  assert.equal(isFocusPaper({ key: 'TS-CT-M01-3' }), false);
});

test('TS-THEMES-1: the REAL files load as ONE manifest - 180 series papers + 30 focus sets, none dropped, no prefix is a prefix of another', () => {
  const { MANIFEST_FILES, FOCUS_MANIFEST_PATH, isFocusPaper, isMorePaper } = require('./testSeriesChecks.cjs');
  assert.deepEqual([...MANIFEST_FILES], [MANIFEST_PATH, FOCUS_MANIFEST_PATH]);
  assert.match(FOCUS_MANIFEST_PATH, /server[\\/]data[\\/]testSeriesFocusSets\.json$/);
  const logs = [];
  const m = loadManifest(MANIFEST_FILES, { error: (x) => logs.push(x) });
  assert.deepEqual(logs, []);
  assert.equal(m.count, 210);
  assert.equal(m.dropped, 0);
  assert.equal(m.papers.filter(isFocusPaper).length, 30);
  assert.equal(m.papers.filter(isMorePaper).length, 180 - 66, 'no focus set is read as a TS-MORE-1 paper');
  const prefixes = m.papers.map((p) => p.prefix);
  for (const a of prefixes) for (const b of prefixes) if (a !== b) assert.equal(b.startsWith(a), false, `${a} is a prefix of ${b}`);
  for (const p of m.papers) assert.equal(seriesPaperOf({ worksheetId: `${p.prefix}mz1abc-7f3` }, m).key, p.key);
  // the series file alone is still exactly the 180 (nothing was appended to it)
  assert.equal(loadManifest(MANIFEST_PATH, { error: () => {} }).count, 180);
});

test('TS-THEMES-1: a missing focus file never takes the series papers down (logged; the 180 still load)', () => {
  const logs = [];
  const m = loadManifest([MANIFEST_PATH, '/nonexistent/testSeriesFocusSets.json'], { error: (x) => logs.push(x) });
  assert.equal(m.count, 180);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /testSeriesFocusSets\.json/);
  const none = [];
  assert.equal(loadManifest(['/nonexistent/a.json', '/nonexistent/b.json'], { error: (x) => none.push(x) }).count, 0);
  assert.ok(none.some((l) => /NO Test Series paper/.test(l)));
});

/* ── TS-FREE-CHECK-1 (owner ruling 23 Nov 2026, 19:59 IST) · the free test includes written-answer marking ─────────────────── */
// A student WITHOUT the pack (free or trial) gets ONE series paper checked - the first one a written check is admitted on, pinned
// server-side in `testSeriesFreeTest` - with the owner's per-paper allowance (2 checks + the free re-check). Every bypass below must fail.
const { FREE_TEST_FIELD, testSeriesFreeCheckDisabled, freeTestPaperOf } = require('./testSeriesChecks.cjs');
const fmBody = (over = {}) => ({ worksheetId: 'fm-ts1-m1--mz9xyz-1a2', questions: [q('m-fm-01-b1', 21)], imageBase64: 'AAAA', ...over });
const pinOf = (db, uid) => freeTestPaperOf(db.read(`packEntitlements/${uid}`) || {});
async function check(s, body, finish = (r) => r.serve(200, 2), opts) {
  const res = fakeRes();
  const req = reqWith(body);
  const refused = await s.gate.applyToRequest(req, res, GRADE, s.uid, undefined, opts);
  if (!refused) finish(res);
  await settle();
  return { refused, req, res, sent: refused ? s.sent.at(-1) : null };
}

test('TS-FREE-CHECK-1 FREE non-owner: the first written check on a series paper is admitted, PINS that paper server-side, and counts like an owner check', async () => {
  const s = setup({ owns: false });
  const c = await check(s, seriesBody());
  assert.equal(c.refused, false);
  assert.equal(s.sent.length, 0);
  assert.deepEqual(c.req.lazytopperTestSeriesCheck, { paperKey: CT, used: 1, left: 1, checksPerPaper: 2, freeTest: true });
  assert.equal(pinOf(s.db, s.uid), CT, 'the free test is pinned on the server');
  assert.equal(typeof (s.db.read(`packEntitlements/${s.uid}`)[FREE_TEST_FIELD].atMs), 'number');
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1);
  assert.ok(s.events.includes('test_series.free_test.pinned'));
  assert.ok(s.events.includes('entitlement.test_series.admitted'));
});

test('TS-FREE-CHECK-1 TRIAL non-owner: the same - the free test is checked on the trial too (tier trial), pinned once', async () => {
  const s = setup({ sub: 'trial', owns: false });
  assert.equal((await check(s, seriesBody())).refused, false);
  assert.equal(pinOf(s.db, s.uid), CT);
  const other = await check(s, fmBody());
  assert.equal(other.refused, true);
  assert.equal(other.sent.status, 402);
  assert.equal(other.sent.body.tier, 'trial');
  assert.equal(other.sent.body.testSeries.reason, 'free_test_used');
  assert.equal(other.sent.body.testSeries.freePaperKey, CT);
  // any NON-series paper on the trial is served exactly as before (the trial's ordinary rules)
  assert.equal(await s.gate.applyToRequest(reqWith({ worksheetId: 'ws-1', questions: [{ qNumber: 1, questionText: 'x' }] }), fakeRes(), GRADE, s.uid), false);
});

test('TS-FREE-CHECK-1 the SAME allowance as an owner: check, check, then the free-test exhausted 402 (no copy mentions a pack the student has not bought)', async () => {
  const s = setup({ owns: false });
  assert.equal((await check(s, seriesBody())).refused, false);
  assert.equal((await check(s, seriesBody())).refused, false);
  const third = await check(s, seriesBody());
  assert.equal(third.refused, true);
  assert.equal(third.sent.status, 402);
  assert.equal(third.sent.body.testSeries.reason, 'exhausted');
  assert.equal(third.sent.body.testSeries.freeTest, true);
  assert.equal(third.sent.body.testSeries.left, 0);
  assert.doesNotMatch(third.sent.body.message, /with your Test Series Pack/);
  assert.doesNotMatch(third.sent.body.message, /\bAI\b|answer key/i);
  assert.equal(usedOnPaper(s.db, s.uid, CT), 2);
});

test('TS-FREE-CHECK-1 BYPASS: another paper after the pin -> 402 free_test_used; nothing held, counted or re-pinned (chapter -> mock, or any other code)', async () => {
  const s = setup({ owns: false });
  await check(s, seriesBody());
  for (const body of [fmBody(), fmBody({ worksheetId: 'fm-ts1-m1--another-sitting' })]) {
    const r = await check(s, body);
    assert.equal(r.refused, true);
    assert.equal(r.sent.status, 402);
    assert.equal(r.sent.body.error, 'premium_required');
    assert.equal(r.sent.body.testSeries.reason, 'free_test_used');
    assert.doesNotMatch(r.sent.body.message, /\bAI\b|answer key/i);
  }
  assert.equal(pinOf(s.db, s.uid), CT, 'the pin never moves');
  assert.equal(usedOnPaper(s.db, s.uid, FM), 0);
  assert.equal(holdsOf(s.db, s.uid), 0);
});

test('TS-FREE-CHECK-1 BYPASS: re-taking the free paper (a NEW sitting id of the same paper) shares the SAME 2 checks - never a fresh allowance', async () => {
  const s = setup({ owns: false });
  assert.equal((await check(s, seriesBody({ worksheetId: 'ct-ts1-real-numbers--sitting-1' }))).refused, false);
  assert.equal((await check(s, seriesBody({ worksheetId: 'ct-ts1-real-numbers--sitting-2' }))).refused, false);
  const third = await check(s, seriesBody({ worksheetId: 'ct-ts1-real-numbers--sitting-3' }));
  assert.equal(third.sent.status, 402);
  assert.equal(third.sent.body.testSeries.reason, 'exhausted');
});

test('TS-FREE-CHECK-1 BYPASS: a RESTART (a fresh server / gate over the same Firestore) still knows the free test - durable, not in memory', async () => {
  const s = setup({ owns: false });
  await check(s, seriesBody());
  // a brand-new module instance reading the same documents
  const checks2 = createTestSeriesChecks({ adminFirestore: s.db, telemetry: null, now: () => s.clock.now, manifest: MANIFEST, readBody: async (r) => r.body, env: {} });
  const sent = [];
  const gate2 = createEntitlementGate({
    adminFirestore: s.db, telemetry: null, logger: { warn() {}, info() {}, error() {} }, now: () => s.clock.now, cacheTtlMs: 0, env: {},
    sendJson: (res, status, body) => { sent.push({ status, body }); res.end(status); }, testSeriesChecks: checks2,
  });
  assert.equal(await gate2.applyToRequest(reqWith(fmBody()), fakeRes(), GRADE, s.uid), true);
  assert.equal(sent[0].status, 402);
  assert.equal(sent[0].body.testSeries.reason, 'free_test_used');
});

test('TS-FREE-CHECK-1 BYPASS: MULTIPLE TABS - two different papers at once with no pin -> exactly ONE is admitted and pinned, the other refused', async () => {
  for (let round = 0; round < 5; round += 1) {
    const s = setup({ owns: false });
    const [a, b] = await Promise.all([check(s, seriesBody()), check(s, fmBody())]);
    assert.equal([a.refused, b.refused].filter((x) => x === false).length, 1, `round ${round}: exactly one admitted`);
    const won = a.refused ? FM : CT;
    assert.equal(pinOf(s.db, s.uid), won);
    const lost = a.refused ? a : b;
    assert.equal(lost.sent.body.testSeries.reason, 'free_test_used');
    assert.equal(usedOnPaper(s.db, s.uid, won === CT ? FM : CT), 0);
  }
});

test('TS-FREE-CHECK-1 BYPASS: MULTIPLE TABS on the free paper - 5 parallel uploads -> exactly 2 admitted (the per-paper cap holds)', async () => {
  const s = setup({ owns: false });
  const results = await Promise.all(Array.from({ length: 5 }, () => check(s, seriesBody())));
  assert.equal(results.filter((r) => r.refused === false).length, 2);
  assert.equal(usedOnPaper(s.db, s.uid, CT), 2);
});

test('TS-FREE-CHECK-1 BYPASS: a swapped question / id on the free paper -> 409 and NOTHING pinned (a forged body cannot claim the free test)', async () => {
  const s = setup({ owns: false });
  for (const over of [
    { questions: [q('m-ct-01-b1', 1, { questionText: 'Solve my homework: integrate x^2.' })] },
    { questions: [q('m-ct-01-b1', 1, { questionId: 'm-ct-01-a1' })] },
    { questions: [q('m-fm-01-b1', 1)] }, // the other paper's question under this paper's id
  ]) {
    const r = await check(s, seriesBody(over));
    assert.equal(r.sent.status, 409);
  }
  assert.equal(pinOf(s.db, s.uid), null);
  assert.equal(holdsOf(s.db, s.uid), 0);
});

test('TS-FREE-CHECK-1 BYPASS: SIGNED OUT (no verified uid; a bare uid header; an unverified token) -> nothing new: no admission, nothing written', async () => {
  const s = setup({ owns: false });
  const cases = [
    { headers: {} }, // no credential at all
    { headers: { 'x-user-id': s.uid } }, // a uid header without a token
    { headers: { authorization: 'Bearer forged' } }, // a token that did not verify
  ];
  for (const c of cases) {
    const req = { method: 'POST', headers: c.headers, body: seriesBody() };
    const res = fakeRes();
    assert.equal(await s.gate.applyToRequest(req, res, GRADE, undefined), true, JSON.stringify(c.headers));
    assert.notEqual(s.sent.at(-1).status, 200);
    assert.equal(req.lazytopperTestSeriesCheck, undefined);
  }
  assert.equal(s.db.read(`packEntitlements/${s.uid}`), undefined, 'nothing written for anyone');
});

test('TS-FREE-CHECK-1 a failed / ungraded check gives the check back (the pin stays: that paper IS the free test)', async () => {
  const s = setup({ owns: false });
  await check(s, seriesBody(), (r) => r.serve(500));
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0);
  assert.equal(holdsOf(s.db, s.uid), 0);
  assert.equal(pinOf(s.db, s.uid), CT);
  assert.equal((await check(s, seriesBody())).refused, false, 'still 2 checks on it');
  assert.equal((await check(s, seriesBody())).refused, false);
  assert.equal((await check(s, seriesBody())).sent.body.testSeries.reason, 'exhausted');
});

test('TS-FREE-CHECK-1 TS-RECHECK-1 applies to the free test: an unreadable sheet is not counted, once', async () => {
  const s = setup({ owns: false });
  await check(s, seriesBody(), (r) => { setUnreadableSummary(r, { unreadable: 2, total: 2 }); r.serve(200, 1); });
  assert.equal(usedOnPaper(s.db, s.uid, CT), 0, 'free re-check');
  const st = await s.checks.freeTestStatus(s.uid);
  assert.deepEqual(st, { paperKey: CT, checksPerPaper: 2, used: 0, freeRecheck: true });
});

test('TS-FREE-CHECK-1 background job (202): the free-test hold rides the deferred and the job end commits it', async () => {
  const s = setup({ owns: false });
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false);
  res.serve(202, 0);
  await settle();
  assert.equal(holdsOf(s.db, s.uid), 1);
  s.checks.settleDeferred({ uid: s.uid, testSeries: require('./testSeriesChecks.cjs').testSeriesDeferredOf(res) }, 3);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, CT), 1);
  assert.equal(holdsOf(s.db, s.uid), 0);
});

test('TS-FREE-CHECK-1 a Firestore failure while pinning -> 503, nothing pinned (never an unrecorded free check)', async () => {
  const s = setup({ owns: false });
  s.db.runTransaction = async () => { throw new Error('FIRESTORE DOWN'); };
  const r = await check(s, seriesBody());
  assert.equal(r.sent.status, 503);
  assert.equal(pinOf(s.db, s.uid), null);
});

test('TS-FREE-CHECK-1 PREMIUM and OWNERS unaffected: premium is never pinned; an owner never pins and keeps every paper', async () => {
  const p = setup({ sub: 'premium', owns: false });
  assert.equal((await check(p, seriesBody())).refused, false);
  assert.equal((await check(p, fmBody())).refused, false);
  assert.equal(p.db.read(`packEntitlements/${p.uid}`), undefined, 'premium: nothing written');
  const o = setup();
  assert.equal((await check(o, seriesBody())).refused, false);
  assert.equal((await check(o, fmBody())).refused, false);
  assert.equal(pinOf(o.db, o.uid), null, 'an owner is never pinned');
  assert.equal(await o.checks.freeTestStatus(o.uid), null, 'an owner sees the owner view, not the free-test view');
});

test('TS-FREE-CHECK-1 a student who used the free test and THEN bought the pack: every paper opens; the free paper\'s checks count on it (2 per paper in total)', async () => {
  const s = setup({ owns: false });
  await check(s, seriesBody());
  await check(s, seriesBody());
  s.db.docs.set(`packEntitlements/${s.uid}/packs/test_series:all`, { data: TS_PACK, version: 1 });
  assert.equal((await check(s, fmBody())).refused, false, 'another paper is open on the pack');
  const again = await check(s, seriesBody());
  assert.equal(again.sent.body.testSeries.reason, 'exhausted', 'the free paper already used its 2');
  assert.notEqual(again.sent.body.testSeries.freeTest, true, 'owner copy');
});

test('TS-FREE-CHECK-1 freeTestGrade (LIMITS-1 exemption): only a verified non-owner grade of the free paper (or of the first paper); writes nothing', async () => {
  const s = setup({ owns: false });
  assert.equal(await s.checks.freeTestGrade(reqWith(seriesBody()), s.uid), true, 'no pin yet: the first series paper may take it');
  assert.equal(await s.checks.freeTestGrade(reqWith(seriesBody({ questions: [q('m-ct-01-b1', 1, { questionText: 'swapped' })] })), s.uid), false);
  assert.equal(await s.checks.freeTestGrade(reqWith({ worksheetId: 'ws-1', questions: [] }), s.uid), false, 'not a series paper');
  assert.equal(pinOf(s.db, s.uid), null, 'READ ONLY');
  await check(s, seriesBody());
  assert.equal(await s.checks.freeTestGrade(reqWith(seriesBody()), s.uid), true, 'the pinned paper');
  assert.equal(await s.checks.freeTestGrade(reqWith(fmBody()), s.uid), false, 'another paper is metered as before');
  const o = setup();
  assert.equal(await o.checks.freeTestGrade(reqWith(seriesBody()), o.uid), false, 'an owner goes through ownerSeriesGrade');
  const off = setup({ owns: false, env: { TS_FREE_WRITTEN_CHECK_DISABLED: '1' } });
  assert.equal(await off.checks.freeTestGrade(reqWith(seriesBody()), off.uid), false);
});

test('TS-FREE-CHECK-1 freeTestPaper (scorecard breakdown): the pinned paper of the matching kind only', async () => {
  const s = setup({ owns: false });
  assert.equal(await s.checks.freeTestPaper(s.uid, 'chapter-test', 'ct-ts1-real-numbers--a'), false, 'nothing pinned yet');
  await check(s, seriesBody());
  assert.equal(await s.checks.freeTestPaper(s.uid, 'chapter-test', 'ct-ts1-real-numbers--a'), true);
  assert.equal(await s.checks.freeTestPaper(s.uid, 'full-mock', 'ct-ts1-real-numbers--a'), false, 'wrong kind');
  assert.equal(await s.checks.freeTestPaper(s.uid, 'full-mock', 'fm-ts1-m1--a'), false, 'not the free paper');
  assert.equal(await s.checks.freeTestPaper('someone-else', 'chapter-test', 'ct-ts1-real-numbers--a'), false);
});

test('TS-FREE-CHECK-1 freeTestStatus (/api/packs/mine): null pin before, the pinned paper + count after, capped', async () => {
  const s = setup({ owns: false });
  assert.deepEqual(await s.checks.freeTestStatus(s.uid), { paperKey: null, checksPerPaper: 2, used: 0 });
  await check(s, seriesBody());
  assert.deepEqual(await s.checks.freeTestStatus(s.uid), { paperKey: CT, checksPerPaper: 2, used: 1 });
  await check(s, seriesBody());
  assert.deepEqual(await s.checks.freeTestStatus(s.uid), { paperKey: CT, checksPerPaper: 2, used: 2 });
});

test('TS-FREE-CHECK-1 KILL SWITCH TS_FREE_WRITTEN_CHECK_DISABLED (1/true/on/yes): exactly the old behaviour - 402s, no body read for a free non-owner, no pin, no status', async () => {
  for (const v of ['1', 'true', 'on', 'yes']) {
    assert.equal(testSeriesFreeCheckDisabled({ TS_FREE_WRITTEN_CHECK_DISABLED: v }), true, v);
    const s = setup({ owns: false, env: { TS_FREE_WRITTEN_CHECK_DISABLED: v } });
    const req = reqWith(seriesBody());
    let read = 0;
    Object.defineProperty(req, 'body', { get() { read += 1; return seriesBody(); } });
    assert.equal(await s.gate.applyToRequest(req, fakeRes(), GRADE, s.uid), true);
    assert.equal(s.sent[0].body.feature, 'grade-worksheet', 'the old 402');
    assert.equal(read, 0, 'the body is never read');
    const t = setup({ sub: 'trial', owns: false, env: { TS_FREE_WRITTEN_CHECK_DISABLED: v } });
    assert.equal((await check(t, seriesBody())).sent.body.testSeries.reason, 'not_owner');
    assert.equal(pinOf(t.db, t.uid), null);
    assert.equal(await t.checks.freeTestStatus(t.uid), null);
    // owners are unaffected by this switch
    const o = setup({ env: { TS_FREE_WRITTEN_CHECK_DISABLED: v } });
    assert.equal((await check(o, seriesBody())).refused, false);
  }
  for (const v of ['', '0', 'false', 'off', undefined]) assert.equal(testSeriesFreeCheckDisabled({ TS_FREE_WRITTEN_CHECK_DISABLED: v }), false, String(v));
});

test('TS-FREE-CHECK-1 KILL SWITCH both ways: on after a pin -> the pinned paper too is refused (old 402); off again -> the pin is honoured as before', async () => {
  const env = {};
  const s = setup({ owns: false, env });
  await check(s, seriesBody());
  env.TS_FREE_WRITTEN_CHECK_DISABLED = '1';
  const off = await check(s, seriesBody());
  assert.equal(off.sent.status, 402);
  assert.equal(off.sent.body.feature, 'grade-worksheet');
  delete env.TS_FREE_WRITTEN_CHECK_DISABLED;
  assert.equal((await check(s, seriesBody())).refused, false);
  assert.equal((await check(s, fmBody())).sent.body.testSeries.reason, 'free_test_used');
});

test('TS-FREE-CHECK-1 TS_CHECKS_DISABLED (the whole series rule off) also turns the free test off', async () => {
  const s = setup({ owns: false, env: { TS_CHECKS_DISABLED: '1' } });
  assert.equal((await check(s, seriesBody())).sent.body.feature, 'grade-worksheet');
  assert.equal(await s.checks.freeTestStatus(s.uid), null);
  assert.equal(pinOf(s.db, s.uid), null);
});

test('TS-FREE-CHECK-1 the single-question Answer Checker and the tutor are never opened by the free test', async () => {
  const s = setup({ owns: false });
  for (const path of ['/api/check-solution', '/api/tutor']) {
    assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), path, s.uid), true, path);
    assert.equal(s.sent.at(-1).status, 402);
    assert.notEqual(s.sent.at(-1).body.feature, 'test-series-check');
  }
  assert.equal(pinOf(s.db, s.uid), null);
  // a non-series grade-worksheet request from a free non-owner: the ordinary 402, nothing pinned
  assert.equal(await s.gate.applyToRequest(reqWith({ worksheetId: 'ws-123', questions: [{ qNumber: 1, questionText: 'anything', marks: 3 }] }), fakeRes(), GRADE, s.uid), true);
  assert.equal(s.sent.at(-1).body.feature, 'grade-worksheet');
  assert.equal(pinOf(s.db, s.uid), null);
});

test('TS-FREE-CHECK-1 LIMITS-1 bypass path (Basic\'s first paper of a kind): the free paper is admitted, another series paper is still refused', async () => {
  const s = setup({ owns: false });
  assert.equal((await check(s, seriesBody(), undefined, { limitsBypass: true })).refused, false);
  assert.equal((await check(s, fmBody(), undefined, { limitsBypass: true })).sent.body.testSeries.reason, 'free_test_used');
});

/* ── TS-THEMES-1 x TS-FREE-CHECK-1: a FOCUS SET can be the one free test (owner rule: the free test includes written marking) ── */
const QF2 = { 's-fs-nu-c1': { text: 'A bulb rated 60 W, 220 V is used for 5 h. Find the energy in kWh.', marks: 3 } };
Object.assign(Q, QF2);
const FOCUS2 = indexManifest([
  ...FOCUS_RAW,
  {
    key: 'TS-FS-S-NU-1', subject: 'Science', kind: 'focus', number: 1, paperCode: 'FS-S-NU-1', topicKey: null,
    worksheetIdPrefix: 'fm-tsfs-snu1--', questionIds: ['s-fs-nu-c1'], sectionBEQuestionIds: ['s-fs-nu-c1'],
    textHashes: { 's-fs-nu-c1': canonicalQuestionTextHash(Q['s-fs-nu-c1'].text) },
  },
]);
const fs2Body = () => ({ worksheetId: 'fm-tsfs-snu1--mz1abc-7f3', questions: [q('s-fs-nu-c1', 1)], imageBase64: 'AAAA' });

test('TS-THEMES-1 x TS-FREE-CHECK-1: a free (and a trial) student\'s FIRST written check on a focus set is admitted and PINS the FS- paper', async () => {
  for (const sub of ['free', 'trial']) {
    const s = setup({ manifest: FOCUS2, owns: false, ...(sub === 'trial' ? { sub } : {}) });
    const c = await check(s, fsBody());
    assert.equal(c.refused, false, sub);
    assert.deepEqual(c.req.lazytopperTestSeriesCheck, { paperKey: FS1, used: 1, left: 1, checksPerPaper: 2, freeTest: true }, sub);
    assert.equal(pinOf(s.db, s.uid), FS1, `${sub}: the focus set is the pinned free test`);
    assert.equal(usedOnPaper(s.db, s.uid, FS1), 1, sub);
    // the same focus set again (a new sitting) shares its 2 checks
    assert.equal((await check(s, fsBody({ worksheetId: 'fm-tsfs-mla1--second-sitting' }))).refused, false, sub);
    assert.equal(usedOnPaper(s.db, s.uid, FS1), 2, sub);
    assert.equal((await check(s, fsBody())).sent.status, 402, `${sub}: the third check on the free set is refused`);
  }
});

test('TS-THEMES-1 x TS-FREE-CHECK-1: after a focus-set pin, a second paper - a series paper OR another focus set - is refused (free_test_used), nothing held or counted', async () => {
  const s = setup({ manifest: FOCUS2, owns: false });
  await check(s, fsBody());
  for (const body of [seriesBody(), fmBody(), fs2Body(), { worksheetId: 'fm-ts1-m24--abc', questions: [q('m-fm-24-b1', 22)] }]) {
    const r = await check(s, body);
    assert.equal(r.refused, true, body.worksheetId);
    assert.equal(r.sent.status, 402, body.worksheetId);
    assert.equal(r.sent.body.testSeries.reason, 'free_test_used', body.worksheetId);
  }
  assert.equal(pinOf(s.db, s.uid), FS1, 'the pin never moves');
  assert.equal(usedOnPaper(s.db, s.uid, CT) + usedOnPaper(s.db, s.uid, FM) + usedOnPaper(s.db, s.uid, 'TS-FS-S-NU-1'), 0);
  assert.equal(holdsOf(s.db, s.uid), 0);
  // and the reverse: a series paper pinned first refuses a focus set
  const t = setup({ manifest: FOCUS2, owns: false });
  await check(t, seriesBody());
  const r = await check(t, fsBody());
  assert.equal(r.sent.body.testSeries.reason, 'free_test_used');
  assert.equal(pinOf(t.db, t.uid), CT);
});

test('TS-THEMES-1 x TS-FREE-CHECK-1: LIMITS-1 / scorecard helpers treat a pinned focus set as the full-mock free paper; TS_FOCUS_SETS_DISABLED makes it no series paper (nothing pinned)', async () => {
  const s = setup({ manifest: FOCUS2, owns: false });
  assert.equal(await s.checks.freeTestGrade(reqWith(fsBody()), s.uid), true, 'no pin yet: a focus set may take it');
  await check(s, fsBody());
  assert.equal(await s.checks.freeTestGrade(reqWith(fsBody()), s.uid), true);
  assert.equal(await s.checks.freeTestGrade(reqWith(fs2Body()), s.uid), false);
  assert.equal(await s.checks.freeTestPaper(s.uid, 'full-mock', 'fm-tsfs-mla1--x'), true);
  assert.equal(await s.checks.freeTestPaper(s.uid, 'chapter-test', 'fm-tsfs-mla1--x'), false, 'wrong kind');
  const off = setup({ manifest: FOCUS2, owns: false, env: { TS_FOCUS_SETS_DISABLED: '1' } });
  // Review fix: with the switch on a focus set is no series paper for the LIMITS-1 helpers either - no free-test exemption from
  // metering (decide() would answer not_series, so no hold / cap would apply).
  assert.equal(await off.checks.freeTestGrade(reqWith(fsBody()), off.uid), false, 'freeTestGrade: no exemption under the switch');
  assert.equal(await off.checks.freeTestPaper(off.uid, 'full-mock', 'fm-tsfs-mla1--x'), false, 'freeTestPaper: no exemption under the switch');
  // ...even for an account whose free test was ALREADY pinned on that focus set before the switch went on
  const pinnedThenOff = setup({ manifest: FOCUS2, owns: false });
  await check(pinnedThenOff, fsBody());
  assert.equal(pinOf(pinnedThenOff.db, pinnedThenOff.uid), FS1);
  const offAfter = createTestSeriesChecks({ adminFirestore: pinnedThenOff.db, now: () => pinnedThenOff.clock.now, manifest: FOCUS2, readBody: async (r) => r.body, env: { TS_FOCUS_SETS_DISABLED: 'on' } });
  const onAgain = createTestSeriesChecks({ adminFirestore: pinnedThenOff.db, now: () => pinnedThenOff.clock.now, manifest: FOCUS2, readBody: async (r) => r.body, env: {} });
  assert.equal(await onAgain.freeTestPaper(pinnedThenOff.uid, 'full-mock', 'fm-tsfs-mla1--x'), true, 'control: switch off -> the pinned set is the free paper');
  assert.equal(await offAfter.freeTestGrade(reqWith(fsBody()), pinnedThenOff.uid), false);
  assert.equal(await offAfter.freeTestPaper(pinnedThenOff.uid, 'full-mock', 'fm-tsfs-mla1--x'), false);
  // the series papers keep their free-test helpers under the focus switch
  assert.equal(await off.checks.freeTestGrade(reqWith(seriesBody()), off.uid), true, 'a series paper may still take the free test');
  const r = await check(off, fsBody());
  assert.equal(r.refused, true);
  assert.equal(r.sent.body.feature, 'grade-worksheet', 'the ordinary 402: not a series paper under the kill switch');
  assert.equal(pinOf(off.db, off.uid), null, 'nothing pinned');
});
