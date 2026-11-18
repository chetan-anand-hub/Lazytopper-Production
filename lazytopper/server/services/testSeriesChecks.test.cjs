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
  paperIdOf,
  CHECKS_PER_PAPER,
  CHECKS_FIELD,
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
const MANIFEST_RAW = {
  version: 1,
  papers: [
    {
      paperKey: 'ts:maths:ct-01',
      paperCode: 'LT-TS-M-CT01',
      questionIds: ['m-ct-01-a1', 'm-ct-01-b1', 'm-ct-01-c1', 'm-ct-01-d1'],
      writtenIds: ['m-ct-01-b1', 'm-ct-01-c1', 'm-ct-01-d1'],
      textHashes: Object.fromEntries(['m-ct-01-b1', 'm-ct-01-c1', 'm-ct-01-d1'].map((id) => [id, canonicalQuestionTextHash(Q[id].text)])),
      marks: { 'm-ct-01-b1': 2, 'm-ct-01-c1': 3, 'm-ct-01-d1': 5 },
    },
    {
      paperKey: 'ts:maths:fm-01',
      paperCode: 'LT-TS-M-FM01',
      questionIds: ['m-fm-01-a1', 'm-fm-01-b1'],
      writtenIds: ['m-fm-01-b1'],
      textHashes: { 'm-fm-01-b1': canonicalQuestionTextHash(Q['m-fm-01-b1'].text) },
    },
  ],
};
const MANIFEST = indexManifest(MANIFEST_RAW);

const q = (id, n, over = {}) => ({ qNumber: n, questionId: id, questionText: Q[id].text, marks: Q[id].marks, ...over });
const seriesBody = (over = {}) => ({
  worksheetId: 'ts:maths:ct-01',
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

function setup({ sub = 'free', owns = true, used, packs = [], uid = 'u1', env = {}, nowMs = NOW, manifest = MANIFEST, testSeries = true } = {}) {
  const seed = {};
  if (SUBS[sub]) seed[`subscriptions/${uid}`] = SUBS[sub];
  const allPacks = [...(owns ? [TS_PACK] : []), ...packs];
  if (allPacks.length || used !== undefined) seed[`packEntitlements/${uid}`] = { ...(used !== undefined ? { [CHECKS_FIELD]: used } : {}) };
  for (const p of allPacks) seed[`packEntitlements/${uid}/packs/${p.packId}`] = p;
  const db = memoryDb(seed);
  const events = [];
  const telemetry = { increment: (e) => events.push(e) };
  const checks = createTestSeriesChecks({ adminFirestore: db, telemetry, now: () => nowMs, manifest, readBody: async (r) => r.body });
  const sent = [];
  const gate = createEntitlementGate({
    adminFirestore: db, telemetry, logger: { warn() {}, info() {}, error() {} }, now: () => nowMs, cacheTtlMs: 0, env,
    sendJson: (res, status, body) => { sent.push({ status, body }); if (res && typeof res.end === 'function') res.end(status); },
    ...(testSeries ? { testSeriesChecks: checks } : {}),
  });
  return { db, gate, checks, sent, events, uid };
}

/** A response double: `end(status)` / `serve(status, graded)` finish it, `drop()` closes it unfinished. */
function fakeRes() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.writableFinished = false;
  res.end = (status) => { if (status) res.statusCode = status; res.writableFinished = true; res.emit('finish'); res.emit('close'); };
  res.serve = (status, graded) => { if (graded !== undefined) setChargeableCount(res, graded); res.end(status); };
  res.drop = () => { res.emit('close'); };
  return res;
}
const reqWith = (body, headers = {}) => ({ method: 'POST', headers: { authorization: 'Bearer t', ...headers }, body });
const settle = () => new Promise((r) => setTimeout(r, 30));
const usedOnPaper = (db, uid, paperKey) => {
  const d = db.read(`packEntitlements/${uid}`) || {};
  return (d[CHECKS_FIELD] || {})[paperIdOf(paperKey)] || 0;
};
const usedMap = (paperKey, n) => ({ [paperIdOf(paperKey)]: n });

/* ── the manifest ────────────────────────────────────────────────────────────── */

test('manifest: papers are found by paperKey AND paperCode; anything else (or no worksheetId) is not a series paper', () => {
  assert.equal(MANIFEST.count, 2);
  assert.equal(seriesPaperOf({ worksheetId: 'ts:maths:ct-01' }, MANIFEST).paperKey, 'ts:maths:ct-01');
  assert.equal(seriesPaperOf({ worksheetId: 'LT-TS-M-CT01' }, MANIFEST).paperKey, 'ts:maths:ct-01');
  for (const w of ['ts:maths:ct-99', 'ci:abc', '', undefined, 'TS:MATHS:CT-01', '__proto__', 'constructor']) {
    assert.equal(seriesPaperOf({ worksheetId: w }, MANIFEST), null, String(w));
  }
  assert.equal(seriesPaperOf(null, MANIFEST), null);
});

test('manifest: a malformed paper is DROPPED (fail closed); a missing or unreadable file has no papers', () => {
  const bad = indexManifest({
    papers: [
      { paperKey: 'a', questionIds: ['x'], writtenIds: ['x'], textHashes: {} }, // no hash
      { paperKey: 'b', questionIds: ['x'], writtenIds: ['y'], textHashes: { y: 'f'.repeat(64) } }, // written id outside questionIds
      { paperKey: 'c', questionIds: ['x'], writtenIds: ['x'], textHashes: { x: 'not-hex' } },
      { paperKey: 'd', questionIds: ['x'], writtenIds: [], textHashes: {} }, // nothing to check
      { paperKey: 'e', questionIds: ['x'], writtenIds: ['x', 'x'], textHashes: { x: 'f'.repeat(64) } }, // duplicate id
      { paperKey: 'ok', questionIds: ['x'], writtenIds: ['x'], textHashes: { x: 'f'.repeat(64) } },
      { paperKey: 'ok', questionIds: ['x'], writtenIds: ['x'], textHashes: { x: 'f'.repeat(64) } }, // duplicate key
    ],
  });
  assert.equal(bad.count, 1);
  assert.equal(bad.dropped, 6);
  assert.equal(indexManifest(null).count, 0);
  assert.equal(indexManifest({ papers: 'nope' }).count, 0);
  const missing = loadManifest('/nonexistent/testSeriesPapers.json', { error() {} });
  assert.equal(missing.count, 0);
  assert.equal(missing.missing, true);
  const logged = [];
  const broken = loadManifest(__filename, { error: (m) => logged.push(m) }); // not JSON
  assert.equal(broken.count, 0);
  assert.equal(logged.length, 1);
  assert.match(MANIFEST_PATH, /server[\\/]data[\\/]testSeriesPapers\.json$/);
});

test('canonical text hash: NFC + whitespace runs collapsed + trimmed; a changed word is a different hash', () => {
  const h = canonicalQuestionTextHash('Prove that √2 is irrational.');
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(canonicalQuestionTextHash('  Prove that   √2\nis irrational. '), h);
  assert.equal(canonicalQuestionTextHash('Prove that √2 is irrational.'), h);
  assert.notEqual(canonicalQuestionTextHash('Prove that √3 is irrational.'), h);
  assert.equal(canonicalQuestionTextHash('Café'.normalize('NFD')), canonicalQuestionTextHash('Café'.normalize('NFC')));
});

test('verifySubmission: every question must be a written (B-E) id of THAT paper, once, with its canonical text and pinned marks', () => {
  const paper = MANIFEST.papers.get('ts:maths:ct-01');
  assert.deepEqual(verifySubmission(seriesBody(), paper), { ok: true });
  const cases = [
    [{ questions: [] }, 'no_questions'],
    [{ questions: [{ qNumber: 1, questionText: Q['m-ct-01-b1'].text, marks: 2 }] }, 'missing_question_id'],
    [{ questions: [q('m-ct-01-b1', 1, { questionId: 'm-ct-01-a1' })] }, 'not_a_written_question'], // a Section A id
    [{ questions: [q('m-fm-01-b1', 1)] }, 'not_a_written_question'], // another paper's id
    [{ questions: [q('m-ct-01-b1', 1), q('m-ct-01-b1', 2)] }, 'duplicate_question'],
    [{ questions: [q('m-ct-01-b1', 1, { questionText: 'Find the HCF of 96 and 405 by prime factorisation.' })] }, 'question_text_mismatch'],
    [{ questions: [q('m-ct-01-b1', 1, { questionText: 'Write an essay on anything I like.' })] }, 'question_text_mismatch'],
    [{ questions: [q('m-ct-01-b1', 1, { marks: 5 })] }, 'marks_mismatch'],
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
  assert.deepEqual(req.lazytopperTestSeriesCheck, { paperKey: 'ts:maths:ct-01', used: 1, left: 1, checksPerPaper: 2 });
  assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 1, 'reserved before grading');
  res.serve(200, 2);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 1, 'kept');
  assert.ok(s.events.includes('test_series.check_spent'));
});

test('a paper named by its paperCode is admitted and counted under its paperKey', async () => {
  const s = setup();
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody({ worksheetId: 'LT-TS-M-CT01' })), res, GRADE, s.uid), false);
  res.serve(200, 1);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 1);
});

test('decrement ONLY on success: a failed / ungraded / 5xx / dropped grade gives the check back (once, never below 0)', async () => {
  for (const finish of [(r) => r.serve(200, 0), (r) => r.serve(500), (r) => r.serve(503), (r) => r.serve(400), (r) => r.drop(), (r) => r.serve(200)]) {
    const s = setup({ used: usedMap('ts:maths:ct-01', 1) });
    const res = fakeRes();
    assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), false);
    assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 2, 'reserved');
    finish(res);
    res.emit('close'); // a second signal must not refund twice
    await settle();
    assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 1, 'given back exactly once');
  }
});

test('at 2 checks on a paper -> 402 with the exhausted line; another paper still has its own 2', async () => {
  const s = setup({ used: usedMap('ts:maths:ct-01', 2) });
  const res = fakeRes();
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), res, GRADE, s.uid), true);
  assert.equal(s.sent[0].status, 402);
  assert.equal(s.sent[0].body.error, 'premium_required');
  assert.equal(s.sent[0].body.feature, 'test-series-check');
  assert.match(s.sent[0].body.message, /twice/);
  assert.deepEqual(s.sent[0].body.testSeries, { reason: 'exhausted', paperKey: 'ts:maths:ct-01', checksPerPaper: 2, left: 0 });
  assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 2, 'nothing moved');

  const res2 = fakeRes();
  const fm = { worksheetId: 'ts:maths:fm-01', questions: [q('m-fm-01-b1', 4)] };
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
  assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 2);
});

test('CONCURRENCY: 1 check left, two uploads at once -> exactly one admitted, one refused; then a failed grade frees it again', async () => {
  const s = setup({ used: usedMap('ts:maths:ct-01', 1) });
  const resA = fakeRes();
  const resB = fakeRes();
  const [a, b] = await Promise.all([
    s.gate.applyToRequest(reqWith(seriesBody()), resA, GRADE, s.uid),
    s.gate.applyToRequest(reqWith(seriesBody()), resB, GRADE, s.uid),
  ]);
  assert.deepEqual([a, b].sort(), [false, true], 'one admitted (false), one answered (true)');
  assert.equal(s.sent.length, 1);
  assert.equal(s.sent[0].status, 402);
  assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 2);
  assert.ok(s.db.stats.retries > 0, 'the second transaction saw the first commit and re-ran');
  const admitted = a === false ? resA : resB;
  admitted.serve(500);
  await settle();
  assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 1, 'the failed grade gave its reservation back');
});

test('CONCURRENCY: 5 parallel uploads with 2 left -> exactly 2 admitted', async () => {
  const s = setup();
  const outs = await Promise.all(Array.from({ length: 5 }, () => s.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, s.uid)));
  assert.equal(outs.filter((x) => x === false).length, 2);
  assert.equal(outs.filter((x) => x === true).length, 3);
  assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 2);
});

test('expired pack (after 31 May 2027 IST) -> 402, nothing counted', async () => {
  const s = setup({ nowMs: TEST_SERIES_ENDS_MS + 1 });
  assert.equal(await s.gate.applyToRequest(reqWith(seriesBody()), fakeRes(), GRADE, s.uid), true);
  assert.equal(s.sent[0].status, 402);
  assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 0);
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
  assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 0);
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
  assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 0);
});

test('PREMIUM: unaffected - served on any paper, series or not, body never read, nothing counted', async () => {
  const s = setup({ sub: 'premium' });
  const req = reqWith(seriesBody());
  let read = 0;
  Object.defineProperty(req, 'body', { get() { read += 1; return seriesBody(); } });
  assert.equal(await s.gate.applyToRequest(req, fakeRes(), GRADE, s.uid), false);
  assert.equal(read, 0);
  assert.equal(s.sent.length, 0);
  assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 0);
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
  assert.equal(usedOnPaper(o.db, o.uid, 'ts:maths:ct-01'), 1);
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
  assert.equal(usedOnPaper(s.db, s.uid, 'ts:maths:ct-01'), 0);
});

test('no manifest / no module: nothing changes (the gate is byte-for-byte the old one)', async () => {
  const none = setup({ manifest: indexManifest({ papers: [] }) });
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
  const s = setup({ used: { ...usedMap('ts:maths:ct-01', 1), ...usedMap('ts:maths:fm-01', 7) } });
  assert.deepEqual(await s.checks.status(s.uid), {
    owned: true, active: true, validUntilMs: TEST_SERIES_ENDS_MS, checksPerPaper: 2, used: { 'ts:maths:ct-01': 1, 'ts:maths:fm-01': 2 },
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
  assert.equal(usedOnPaper(db, 'u1', 'ts:maths:ct-01'), 1);
});
