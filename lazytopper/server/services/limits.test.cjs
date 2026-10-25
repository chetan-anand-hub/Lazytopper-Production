/**
 * limits.test.cjs — LIMITS-1 PR-1. Download limits.
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
const { createLimits, decideDownload, entryId, TRIAL_COHORT_START_MS, WINDOW_MS } = require('./limits.cjs');

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
