/**
 * limits.test.cjs — LIMITS-1 PR-1. Download limits.
 *
 * PR-2 adds: the IST-day Quick Practice limit, the scorecard detail claim, the LLM grading gate
 * (per kind, first free), and state preservation across buckets.
 *
 * MUTATIONS (each turns a named test RED):
 *   LIM-MUT-1  limits.cjs handleDownloadMint(): run mintBody on plain get/set instead of
 *              db.runTransaction -> the race test.
 *   LIM-MUT-2  TRIAL_COHORT_START_MS off by one second -> the cutoff boundary test.
 *   LIM-MUT-3  count the free first download -> the first-free test.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { createLimits, decideDownload, decideCounted, istDayStartMs, entryId, TRIAL_COHORT_START_MS, WINDOW_MS } = require('./limits.cjs');

const DAY = 86400000;
const NOW = Date.UTC(2026, 10, 2, 6, 0, 0); // 2 Nov 2026 11:30 IST

function fakeFirestore({ failTx = false } = {}) {
  const docs = new Map();
  const versions = new Map();
  const tick = () => new Promise((r) => setImmediate(r));
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  function ref(parts) {
    const key = parts.join('/');
    return {
      key,
      collection: (n) => ({ doc: (id) => ref([...parts, n, id]) }),
      async get() { await tick(); return { exists: docs.has(key), data: () => clone(docs.get(key)) }; },
      async set(d) { await tick(); docs.set(key, clone(d)); versions.set(key, (versions.get(key) || 0) + 1); },
    };
  }
  const db = {
    collection: (n) => ({ doc: (id) => ref([n, id]) }),
    async runTransaction(fn) {
      if (failTx) throw new Error('down');
      for (let i = 0; i < 6; i += 1) {
        const seen = new Map(); const queued = [];
        const tx = {
          async get(r) { await tick(); seen.set(r.key, versions.get(r.key) || 0); return { exists: docs.has(r.key), data: () => clone(docs.get(r.key)) }; },
          set(r, d) { queued.push([r, d]); return tx; },
        };
        const out = await fn(tx);
        await tick();
        if ([...seen].some(([k, v]) => (versions.get(k) || 0) !== v)) continue;
        for (const [r, d] of queued) { docs.set(r.key, clone(d)); versions.set(r.key, (versions.get(r.key) || 0) + 1); }
        return out;
      }
      throw new Error('contention');
    },
  };
  return { db, docs };
}

function rig({ tier = 'free', env = { LIMITS_ENFORCE: '1' }, created = NOW - 30 * DAY, failTx = false, unauth = false } = {}) {
  const clock = { now: NOW };
  const f = fakeFirestore({ failTx });
  const counters = {};
  const sent = [];
  let creationReads = 0;
  const l = createLimits({
    tierOf: async () => tier,
    getCreationMs: async () => { creationReads += 1; return created; },
    resolveFirestore: () => ({ db: f.db }),
    telemetry: { increment: (e) => { counters[e] = (counters[e] || 0) + 1; } },
    env,
    now: () => clock.now,
    readJson: async (req) => req.__body || {},
    sendJson: (res, status, body) => { sent.push({ status, body }); res.sent = { status, body }; },
    verifiedCaller: { resolveVerifiedUid: async () => (unauth ? '' : 'stu-1') },
  });
  return { l, f, clock, counters, creationReads: () => creationReads };
}

async function mint(r, body) {
  const res = {};
  await r.l.handleDownloadMint({ headers: {}, __body: body }, res);
  return res.sent;
}
const paper = (n, kind = 'worksheet') => ({ kind, paperKey: `paper-${n}` });

test('pure: window math, rolling 7 days, first free', () => {
  const base = { metered: true, limit: 1, paperKey: 'a', nowMs: NOW };
  const first = decideDownload({ ...base, entries: [], firstFreeUsed: false });
  assert.deepEqual([first.kind, first.free, first.counted], ['allowed', true, false]);
  const second = decideDownload({ ...base, entries: [], firstFreeUsed: true });
  assert.deepEqual([second.kind, second.counted, second.remaining], ['allowed', true, 0]);
  const e = [{ at: NOW - 6 * DAY, id: 'x', free: false }];
  const blocked = decideDownload({ ...base, entries: e, firstFreeUsed: true });
  assert.equal(blocked.kind, 'refused');
  assert.equal(blocked.resetAt, new Date(NOW - 6 * DAY + WINDOW_MS).toISOString());
  const aged = decideDownload({ ...base, entries: [{ at: NOW - 7 * DAY - 1, id: 'x', free: false }], firstFreeUsed: true });
  assert.equal(aged.kind, 'allowed');
});

test('pure: unmetered is always allowed and never counted', () => {
  const d = decideDownload({ metered: false, limit: null, entries: [], firstFreeUsed: true, paperKey: 'a', nowMs: NOW });
  assert.deepEqual([d.kind, d.counted], ['allowed', false]);
});

test('Basic: first free, one counted, then 409 with resetAt (enforced)', async () => {
  const r = rig();
  const a = await mint(r, paper(1));
  assert.equal(a.status, 200); assert.equal(a.body.free, true); assert.equal(a.body.counted, false);
  r.clock.now += 1000;
  const b = await mint(r, paper(2));
  assert.equal(b.status, 200); assert.equal(b.body.counted, true); assert.equal(b.body.remaining, 0);
  r.clock.now += 1000;
  const c = await mint(r, paper(3));
  assert.equal(c.status, 409); assert.equal(c.body.error, 'download_limit'); assert.equal(c.body.window, '7d');
  assert.equal(c.body.resetAt, new Date(NOW + 1000 + WINDOW_MS).toISOString());
  // after the oldest counted ages out, one frees up
  r.clock.now = NOW + 1000 + WINDOW_MS + 1;
  assert.equal((await mint(r, paper(3))).status, 200);
});

test('idempotent: same paperKey within 24 h spends nothing (paper + solutions = one)', async () => {
  const r = rig();
  await mint(r, paper(1));
  r.clock.now += 1000;
  const b = await mint(r, paper(2));
  const again = await mint(r, { kind: 'worksheet', paperKey: 'paper-2' });
  assert.equal(again.status, 200); assert.equal(again.body.reused, true);
  const key = [...r.f.docs.keys()][0];
  assert.equal(r.f.docs.get(key).dl.length, 2);
  assert.equal(b.body.counted, true);
});

test('a paper on day 1 and its key on day 5 are ONE spend; a different paper still counts', async () => {
  const r = rig();
  await mint(r, paper(0)); r.clock.now += 1000;            // burn the free one
  const day1 = await mint(r, paper(1));
  assert.equal(day1.body.counted, true);
  r.clock.now += 4 * DAY;
  const day5 = await mint(r, { kind: 'worksheet', paperKey: 'paper-1' });
  assert.equal(day5.status, 200); assert.equal(day5.body.reused, true);
  const other = await mint(r, paper(2));
  assert.equal(other.status, 409);
  const key = [...r.f.docs.keys()][0];
  assert.equal(r.f.docs.get(key).dl.filter((e) => !e.free).length, 1);
});

test('409 names the tier so the client can word it', async () => {
  const r = rig({ tier: 'trial', created: NOW - 3 * DAY });
  let last;
  for (let i = 0; i < 4; i += 1) { last = await mint(r, paper(i)); r.clock.now += 1; }
  assert.equal(last.status, 409); assert.equal(last.body.tier, 'trial');
});

test('stored entries hold a hash, never the paper id', async () => {
  const r = rig();
  await mint(r, { kind: 'worksheet', paperKey: 'SECRET-PAPER-ID' });
  const json = JSON.stringify([...r.f.docs.values()]);
  assert.ok(!json.includes('SECRET-PAPER-ID'));
  assert.ok(json.includes(entryId('SECRET-PAPER-ID')));
});

test('dark (LIMITS_ENFORCE unset): served, count still moves, would_refuse counted', async () => {
  const r = rig({ env: {} });
  await mint(r, paper(1)); r.clock.now += 1; await mint(r, paper(2)); r.clock.now += 1;
  const c = await mint(r, paper(3));
  assert.equal(c.status, 200);
  assert.equal(r.counters['limits.download.would_refuse'], 1);
});

test('premium: never counted, never refused, no ledger write', async () => {
  const r = rig({ tier: 'premium' });
  for (let i = 0; i < 5; i += 1) assert.equal((await mint(r, paper(i))).status, 200);
  assert.equal(r.f.docs.size, 0);
});

test('trial: new cohort capped at 2 + first free; old cohort unmetered', async () => {
  const r = rig({ tier: 'trial', created: NOW - 3 * DAY });
  const res = [];
  for (let i = 0; i < 4; i += 1) { res.push((await mint(r, paper(i))).status); r.clock.now += 1; }
  assert.deepEqual(res, [200, 200, 200, 409]);
  const old = rig({ tier: 'trial', created: Date.UTC(2026, 9, 20) });
  for (let i = 0; i < 5; i += 1) assert.equal((await mint(old, paper(i))).status, 200);
  assert.equal(old.f.docs.size, 0);
});

test('trial cutoff boundary: 18:29:59Z excluded, 18:30:00Z included', async () => {
  assert.equal(TRIAL_COHORT_START_MS, Date.parse('2026-10-24T18:30:00Z'));
  const before = rig({ tier: 'trial', created: TRIAL_COHORT_START_MS - 1000 });
  for (let i = 0; i < 4; i += 1) assert.equal((await mint(before, paper(i))).status, 200);
  const at = rig({ tier: 'trial', created: TRIAL_COHORT_START_MS });
  const codes = [];
  for (let i = 0; i < 4; i += 1) { codes.push((await mint(at, paper(i))).status); at.clock.now += 1; }
  assert.equal(codes[3], 409);
});

test('trial with unreadable creation time fails open', async () => {
  const r = rig({ tier: 'trial', created: null });
  for (let i = 0; i < 4; i += 1) assert.equal((await mint(r, paper(i))).status, 200);
  assert.ok(r.counters['limits.fail_open'] >= 1);
});

test('Basic after a trial: trial spends carry into the Basic window', async () => {
  const r = rig({ tier: 'trial', created: NOW - 3 * DAY });
  await mint(r, paper(1)); r.clock.now += 1; await mint(r, paper(2)); r.clock.now += 1; await mint(r, paper(3));
  const basic = createLimits({
    tierOf: async () => 'free', resolveFirestore: () => ({ db: r.f.db }), env: { LIMITS_ENFORCE: '1' },
    now: () => r.clock.now, readJson: async (q) => q.__body, sendJson: (res, s, b) => { res.sent = { status: s, body: b }; },
    verifiedCaller: { resolveVerifiedUid: async () => 'stu-1' },
  });
  const res = {};
  await basic.handleDownloadMint({ __body: paper(9) }, res);
  assert.equal(res.sent.status, 409);
});

test('race: two mints at once spend once (transaction)', async () => {
  const r = rig();
  await mint(r, paper(0)); r.clock.now += 1; // burn the free one
  const [a, b] = await Promise.all([mint(r, paper(1)), mint(r, paper(2))]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
});

test('fail open on a failed transaction; fail-open counter moves', async () => {
  const r = rig({ failTx: true });
  const a = await mint(r, paper(1));
  assert.equal(a.status, 200); assert.equal(a.body.failOpen, true);
  assert.equal(r.counters['limits.fail_open'], 1);
});

test('401 signed out; 400 bad kind / missing key / oversize key', async () => {
  assert.equal((await mint(rig({ unauth: true }), paper(1))).status, 401);
  const r = rig();
  assert.equal((await mint(r, { kind: 'notes', paperKey: 'a' })).status, 400);
  assert.equal((await mint(r, { kind: 'worksheet' })).status, 400);
  assert.equal((await mint(r, { kind: 'worksheet', paperKey: 'x'.repeat(201) })).status, 400);
});

test('GET /api/usage/limits: counts and a time, returns the cohort constant', async () => {
  const r = rig();
  await mint(r, paper(1)); r.clock.now += 1; await mint(r, paper(2));
  const res = {};
  await r.l.handleLimitsMe({ headers: {} }, res);
  assert.equal(res.sent.status, 200);
  assert.equal(res.sent.body.trialCohortStartMs, TRIAL_COHORT_START_MS);
  assert.deepEqual([res.sent.body.download.used, res.sent.body.download.remaining, res.sent.body.download.firstFreeAvailable], [1, 0, false]);
  assert.ok(res.sent.body.download.resetAt);
  assert.ok(!/rupee|inr|price/i.test(JSON.stringify(res.sent.body)));
});

test('source pins: the mint runs in a transaction and the route is registered + preflighted', () => {
  const src = fs.readFileSync(path.join(__dirname, 'limits.cjs'), 'utf8');
  assert.match(src, /db\.runTransaction\(/);
  const idx = fs.readFileSync(path.join(__dirname, '..', 'index.cjs'), 'utf8');
  assert.match(idx, /reqPath === USAGE_LIMITS_DOWNLOAD_PATH/);
  assert.match(idx, /reqPath === USAGE_LIMITS_PATH/);
  assert.match(idx, /limits\.handleDownloadMint\(req, res\)/);
});

/* ───────────────────────── PR-2 ───────────────────────── */

const NEW_ACCT = Date.UTC(2026, 9, 26); // after the cohort cutoff
async function post(r, method, body) {
  const res = {};
  await r.l[method]({ headers: {}, __body: body }, res);
  return res.sent;
}
const qp = (r, n) => post(r, 'handleQpMint', { paperKey: `qp-${n}` });
const detail = (r, kind, key) => post(r, 'handleDetailClaim', { kind, resultKey: key });

async function gate(r, { path = '/api/grade-worksheet', surface, idem, status = 200 } = {}) {
  const headers = {};
  if (surface) headers['x-lazytopper-surface'] = surface;
  if (idem) headers['idempotency-key'] = idem;
  const res = new EventEmitter();
  res.statusCode = status;
  const verdict = await r.l.gradingGate({ headers }, res, path, 'stu-1');
  res.emit('finish');
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  return { verdict, sent: res.sent };
}

test('pure: IST day starts at 18:30Z, resets at the next IST midnight', () => {
  const at = Date.UTC(2026, 10, 2, 6, 0, 0); // 11:30 IST on 2 Nov
  assert.equal(new Date(istDayStartMs(at)).toISOString(), '2026-11-01T18:30:00.000Z');
  assert.equal(istDayStartMs(Date.UTC(2026, 10, 1, 18, 29, 59)), Date.UTC(2026, 9, 31, 18, 30, 0));
  assert.equal(istDayStartMs(Date.UTC(2026, 10, 1, 18, 30, 0)), Date.UTC(2026, 10, 1, 18, 30, 0));
  const d = decideCounted({ metered: true, limit: 1, entries: [{ at: at - 1000, id: 'a', free: false }], firstFreeUsed: true, id: 'b', nowMs: at, window: { kind: 'istDay' } });
  assert.equal(d.kind, 'refused');
  assert.equal(d.resetAt, '2026-11-02T18:30:00.000Z');
});

test('QP · Basic: first free, 1 counted per IST day, then 409 qp_limit; next IST day frees', async () => {
  const r = rig();
  assert.equal((await qp(r, 1)).body.free, true);
  r.clock.now += 1000;
  const b = await qp(r, 2);
  assert.equal(b.status, 200); assert.equal(b.body.counted, true);
  r.clock.now += 1000;
  const c = await qp(r, 3);
  assert.equal(c.status, 409); assert.equal(c.body.error, 'qp_limit'); assert.equal(c.body.window, '1d');
  assert.equal(c.body.resetAt, '2026-11-02T18:30:00.000Z');
  assert.equal((await qp(r, 2)).body.reused, true, 'the same set is idempotent');
  r.clock.now = Date.UTC(2026, 10, 2, 18, 30, 0);
  assert.equal((await qp(r, 3)).status, 200);
});

test('QP · trial cohort: 3 counted per IST day after the first free; pre-cohort and premium unmetered', async () => {
  const r = rig({ tier: 'trial', created: NEW_ACCT });
  const out = [];
  for (let i = 1; i <= 5; i += 1) { out.push((await qp(r, i)).status); r.clock.now += 10; }
  assert.deepEqual(out, [200, 200, 200, 200, 409]);
  const old = rig({ tier: 'trial', created: TRIAL_COHORT_START_MS - 1 });
  for (let i = 1; i <= 6; i += 1) assert.equal((await qp(old, i)).status, 200);
  assert.equal(old.f.docs.size, 0);
  const prem = rig({ tier: 'premium' });
  assert.equal((await qp(prem, 1)).body.counted, false);
  assert.equal(prem.f.docs.size, 0);
});

test('QP · dark (not enforced): served, counted, would_refuse', async () => {
  const r = rig({ env: {} });
  await qp(r, 1); r.clock.now += 1; await qp(r, 2); r.clock.now += 1;
  const c = await qp(r, 3);
  assert.equal(c.status, 200);
  assert.equal(r.counters['limits.qp.would_refuse'], 1);
});

test('QP · fail open, 401, 400', async () => {
  assert.equal((await qp(rig({ failTx: true }), 1)).body.failOpen, true);
  assert.equal((await qp(rig({ unauth: true }), 1)).status, 401);
  assert.equal((await post(rig(), 'handleQpMint', {})).status, 400);
});

test('state: a QP spend keeps the download entries (one document, whole write-back)', async () => {
  const r = rig();
  await mint(r, paper(1)); r.clock.now += 1;
  await qp(r, 1); r.clock.now += 1;
  await detail(r, 'worksheet', 'k1');
  const doc = [...r.f.docs.values()][0];
  assert.equal(doc.dl.length, 1); assert.equal(doc.qp.length, 1); assert.equal(typeof doc.detail.worksheet, 'string');
  assert.ok(!JSON.stringify(doc).includes('qp-1') && !JSON.stringify(doc).includes('paper-1') && !JSON.stringify(doc).includes('k1'));
});

test('DETAIL · Basic: the first result of a kind is open, another result of that kind is locked, the same re-opens', async () => {
  const r = rig();
  assert.equal((await detail(r, 'worksheet', 'a')).body.unlocked, true);
  assert.equal((await detail(r, 'worksheet', 'b')).body.unlocked, false);
  assert.equal((await detail(r, 'worksheet', 'a')).body.unlocked, true, 're-open of the free one stays open');
  assert.equal((await detail(r, 'chapter-test', 'b')).body.unlocked, true, 'each kind has its own free one');
});

test('DETAIL · every one of the five kinds locks the second result for Basic', async () => {
  const r = rig();
  for (const kind of ['check-improve', 'worksheet', 'chapter-test', 'full-mock', 'quick-practice']) {
    assert.equal((await detail(r, kind, 'one')).body.unlocked, true, kind);
    assert.equal((await detail(r, kind, 'two')).body.unlocked, false, kind);
  }
});

test('DETAIL · trial, premium, dark and a failed transaction are all unlocked; bad input is 400', async () => {
  assert.equal((await detail(rig({ tier: 'trial', created: NEW_ACCT }), 'worksheet', 'b')).body.unlocked, true);
  assert.equal((await detail(rig({ tier: 'premium' }), 'worksheet', 'b')).body.unlocked, true);
  const dark = rig({ env: {} });
  await detail(dark, 'worksheet', 'a');
  assert.equal((await detail(dark, 'worksheet', 'b')).body.unlocked, true);
  assert.equal((await detail(rig({ failTx: true }), 'worksheet', 'b')).body.unlocked, true);
  assert.equal((await detail(rig(), 'nope', 'b')).status, 400);
  assert.equal((await detail(rig(), 'worksheet', '')).status, 400);
  assert.equal((await detail(rig({ unauth: true }), 'worksheet', 'a')).status, 401);
});

test('GRADE · Basic: the first grade of each kind bypasses the 402 once, a failed grade costs nothing', async () => {
  const r = rig();
  const failed = await gate(r, { surface: 'worksheet', status: 500 });
  assert.equal(failed.verdict.bypassEntitlement, true);
  const first = await gate(r, { surface: 'worksheet' });
  assert.equal(first.verdict.bypassEntitlement, true, 'the 500 above spent nothing');
  const second = await gate(r, { surface: 'worksheet' });
  assert.deepEqual(second.verdict, {}, 'now the ordinary 402 follows');
  const other = await gate(r, { surface: 'chapter-test' });
  assert.equal(other.verdict.bypassEntitlement, true, 'each kind has its own first free');
  const ci = await gate(r, { path: '/api/check-solution' });
  assert.equal(ci.verdict.bypassEntitlement, true);
  assert.deepEqual((await gate(r, { path: '/api/check-solution' })).verdict, {});
});

test('GRADE · a forged surface header can claim one free grade per kind and nothing more', async () => {
  const r = rig();
  await gate(r, { path: '/api/check-solution' });
  assert.deepEqual((await gate(r, { path: '/api/check-solution', surface: 'full-mock' })).verdict, {}, 'check-solution is always check-improve');
  assert.deepEqual((await gate(r, { surface: 'nonsense' })).verdict, {}, 'an unknown surface is check-improve, already used');
  assert.equal((await gate(r, { surface: 'worksheet' })).verdict.bypassEntitlement, true);
  assert.deepEqual((await gate(r, { surface: 'worksheet' })).verdict, {});
});

test('GRADE · quick-practice grading is not metered here (the QP mint does that)', async () => {
  const r = rig();
  assert.deepEqual((await gate(r, { path: '/api/check-solution', surface: 'quick-practice' })).verdict, {});
  assert.equal(r.f.docs.size, 0);
});

test('GRADE · trial cohort: first free + 1 per 7 days for worksheet / chapter-test / full-mock, then 409 trial_limit', async () => {
  for (const surface of ['worksheet', 'chapter-test', 'full-mock']) {
    const r = rig({ tier: 'trial', created: NEW_ACCT });
    assert.deepEqual((await gate(r, { surface, idem: 'a' })).verdict, {});
    r.clock.now += 10;
    assert.deepEqual((await gate(r, { surface, idem: 'b' })).verdict, {});
    r.clock.now += 10;
    const c = await gate(r, { surface, idem: 'c' });
    assert.equal(c.verdict.refused, true, surface);
    assert.equal(c.sent.status, 409); assert.equal(c.sent.body.error, 'trial_limit'); assert.equal(c.sent.body.remaining, 0);
    assert.equal(c.sent.body.source, 'limits');
    assert.equal(c.sent.body.resetAt, new Date(NOW + 10 + WINDOW_MS).toISOString());
    r.clock.now = NOW + 10 + WINDOW_MS + 1;
    assert.deepEqual((await gate(r, { surface, idem: 'd' })).verdict, {}, 'a week later one frees up');
  }
});

test('GRADE · trial Check & Improve: first free + 5 per 7 days; kinds are independent', async () => {
  const r = rig({ tier: 'trial', created: NEW_ACCT });
  for (let i = 0; i < 6; i += 1) { assert.deepEqual((await gate(r, { path: '/api/check-solution', idem: `k${i}` })).verdict, {}); r.clock.now += 10; }
  assert.equal((await gate(r, { path: '/api/check-solution', idem: 'k6' })).verdict.refused, true);
  assert.deepEqual((await gate(r, { surface: 'worksheet', idem: 'w' })).verdict, {}, 'worksheet is untouched');
});

test('GRADE · a retry with the same Idempotency-Key spends once', async () => {
  const r = rig({ tier: 'trial', created: NEW_ACCT });
  await gate(r, { surface: 'worksheet', idem: 'same' }); r.clock.now += 10;
  await gate(r, { surface: 'worksheet', idem: 'same' }); r.clock.now += 10;
  assert.deepEqual((await gate(r, { surface: 'worksheet', idem: 'other' })).verdict, {}, 'first free + the retry did not eat the counted one');
});

test('GRADE · premium, pre-cohort trial, dark and an unreadable ledger all pass through untouched', async () => {
  assert.deepEqual((await gate(rig({ tier: 'premium' }), { surface: 'worksheet' })).verdict, {});
  const old = rig({ tier: 'trial', created: TRIAL_COHORT_START_MS - 1 });
  for (let i = 0; i < 4; i += 1) assert.deepEqual((await gate(old, { surface: 'worksheet', idem: `o${i}` })).verdict, {});
  const dark = rig({ env: {}, tier: 'trial', created: NEW_ACCT });
  for (let i = 0; i < 4; i += 1) assert.deepEqual((await gate(dark, { surface: 'worksheet', idem: `d${i}` })).verdict, {});
  assert.equal(dark.f.docs.size, 0, 'dark: nothing is read or written');
  const down = rig({ failTx: true, tier: 'trial', created: NEW_ACCT });
  assert.deepEqual((await gate(down, { surface: 'worksheet' })).verdict, {});
});

test('GET /api/usage/limits carries qp, per-kind grade counters and detailLocked', async () => {
  const r = rig();
  await qp(r, 1); r.clock.now += 1;
  const res = {};
  await r.l.handleLimitsMe({ headers: {} }, res);
  const b = res.sent.body;
  assert.equal(b.qp.window, '1d'); assert.equal(b.qp.firstFreeAvailable, false); assert.equal(b.qp.limit, 1);
  assert.equal(b.grade.worksheet.firstFreeAvailable, true);
  assert.equal(b.detailLocked, true);
  const t = rig({ tier: 'trial', created: NEW_ACCT });
  const res2 = {};
  await t.l.handleLimitsMe({ headers: {} }, res2);
  assert.equal(res2.sent.body.grade['check-improve'].limit, 5);
  assert.equal(res2.sent.body.qp.limit, 3);
  assert.equal(res2.sent.body.detailLocked, false);
});

test('source pins: PR-2 routes are registered, preflighted and the gate runs before the entitlement gate', () => {
  const idx = fs.readFileSync(path.join(__dirname, '..', 'index.cjs'), 'utf8');
  assert.match(idx, /reqPath === USAGE_LIMITS_QP_PATH/);
  assert.match(idx, /reqPath === USAGE_LIMITS_DETAIL_PATH/);
  assert.match(idx, /limits\.handleQpMint\(req, res\)/);
  assert.match(idx, /limits\.handleDetailClaim\(req, res\)/);
  assert.ok(idx.indexOf('limits.gradingGate(') < idx.indexOf('entitlementGate.applyToRequest(req, res, reqPath, verifiedUid, verification)) return;'));
  const lim = fs.readFileSync(path.join(__dirname, 'limits.cjs'), 'utf8');
  assert.ok(!/Math\.random/.test(lim));
});
