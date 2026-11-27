/**
 * limits.freeTsWeekly.test.cjs - FREE-TS-WEEKLY (owner ruling 27 Nov 2026, 13:14 IST).
 *   POST /api/usage/limits/open: Basic and trial 3 Test Series papers per rolling 7 days (one per paper); premium and Test Series
 *   owners never counted; fails open; FREE_TS_WEEKLY_DISABLED=1 is a no-op.
 *   POST /api/usage/limits/download: a Test Series paper is VIEW-ONLY for Basic and trial (409 download_view_only); a Board Pass
 *   holder, a Test Series owner and a covering PDF pack owner are unchanged; the kill switch restores today's behaviour.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createLimits, WINDOW_MS, FREE_TS_OPENS_PER_WEEK } = require('./limits.cjs');

const DAY = 86400000;
const NOW = Date.UTC(2026, 10, 27, 6, 0, 0);

function fakeFirestore() {
  const docs = new Map();
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const ref = (parts) => ({
    key: parts.join('/'),
    collection: (n) => ({ doc: (id) => ref([...parts, n, id]) }),
  });
  const db = {
    collection: (n) => ({ doc: (id) => ref([n, id]) }),
    async runTransaction(fn) {
      const queued = [];
      const tx = {
        async get(r) { return { exists: docs.has(r.key), data: () => clone(docs.get(r.key)) }; },
        set(r, d) { queued.push([r, d]); return tx; },
      };
      const out = await fn(tx);
      for (const [r, d] of queued) docs.set(r.key, clone(d));
      return out;
    },
  };
  return { db, docs };
}

const SERIES_ID = 'ct-ts1-real-numbers--abc';
function rig({ tier = 'free', env = { LIMITS_ENFORCE: '1' }, owns = false, ownsFn, listPacks, seriesOwnerPaper } = {}) {
  const clock = { now: NOW };
  const f = fakeFirestore();
  const counters = {};
  const l = createLimits({
    tierOf: async () => tier,
    getCreationMs: async () => NOW - 30 * DAY,
    resolveFirestore: () => ({ db: f.db }),
    telemetry: { increment: (e) => { counters[e] = (counters[e] || 0) + 1; } },
    env,
    now: () => clock.now,
    readJson: async (req) => req.__body || {},
    sendJson: (res, status, body) => { res.sent = { status, body }; },
    verifiedCaller: { resolveVerifiedUid: async () => 'stu-1' },
    isSeriesPaperId: (kind, id) => kind === 'chapter-test' && id === SERIES_ID,
    ownsSeriesPack: ownsFn || (async () => owns),
    ...(listPacks ? { listPacks } : {}),
    ...(seriesOwnerPaper ? { seriesOwnerPaper } : {}),
  });
  return { l, f, clock, counters };
}
async function open(r, paperKey) {
  const res = {};
  await r.l.handleOpenMint({ headers: {}, __body: { paperKey } }, res);
  return res.sent;
}
async function dl(r, body) {
  const res = {};
  await r.l.handleDownloadMint({ headers: {}, __body: body }, res);
  return res.sent;
}

for (const tier of ['free', 'trial']) {
  test(`open (${tier}): 3 papers a week, the 4th is 409 open_limit with a resetAt; a re-open of the same paper is a reuse`, async () => {
    const r = rig({ tier });
    assert.equal(FREE_TS_OPENS_PER_WEEK, 3);
    for (const k of ['TS-CT-M01', 'TS-CT-M02', 'TS-FM-M1']) {
      const a = await open(r, k);
      assert.equal(a.status, 200);
      assert.equal(a.body.counted, true);
      r.clock.now += 1000;
    }
    const again = await open(r, 'TS-CT-M01');
    assert.equal(again.status, 200);
    assert.equal(again.body.reused, true);
    const fourth = await open(r, 'TS-CT-M03');
    assert.equal(fourth.status, 409);
    assert.equal(fourth.body.error, 'open_limit');
    assert.equal(fourth.body.window, '7d');
    assert.equal(fourth.body.limit, 3);
    assert.equal(fourth.body.resetAt, new Date(NOW + WINDOW_MS).toISOString());
  });
}

test('open: a new week resets (the oldest open ages out of the rolling 7 days)', async () => {
  const r = rig();
  for (const k of ['A', 'B', 'C']) await open(r, k);
  assert.equal((await open(r, 'D')).status, 409);
  r.clock.now += WINDOW_MS + 1000;
  assert.equal((await open(r, 'D')).status, 200);
  assert.equal((await open(r, 'E')).status, 200);
  assert.equal((await open(r, 'F')).status, 200);
  assert.equal((await open(r, 'G')).status, 409);
});

test('open: a Board Pass holder (premium) and a Test Series owner are never counted or written', async () => {
  const p = rig({ tier: 'premium' });
  for (let i = 0; i < 6; i += 1) assert.equal((await open(p, `K${i}`)).status, 200);
  assert.equal(p.f.docs.size, 0);
  const o = rig({ tier: 'trial', owns: true });
  for (let i = 0; i < 6; i += 1) assert.equal((await open(o, `K${i}`)).status, 200);
  assert.equal(o.f.docs.size, 0);
});

test('open: any doubt fails OPEN (unreadable ownership, unknown tier) and writes nothing', async () => {
  const u = rig({ ownsFn: async () => null });
  for (let i = 0; i < 5; i += 1) {
    const a = await open(u, `K${i}`);
    assert.equal(a.status, 200);
    assert.equal(a.body.failOpen, true);
  }
  assert.equal(u.f.docs.size, 0);
  const t = rig({ tier: 'weird' });
  assert.equal((await open(t, 'K')).body.failOpen, true);
});

test('open: not enforced (LIMITS_ENFORCE off) serves the 4th and counts would_refuse', async () => {
  const r = rig({ env: {} });
  for (const k of ['A', 'B', 'C', 'D']) assert.equal((await open(r, k)).status, 200);
  assert.equal(r.counters['limits.open.would_refuse'], 1);
});

test('open: kill switch FREE_TS_WEEKLY_DISABLED=1 is a no-op - nothing counted, nothing refused', async () => {
  const r = rig({ env: { LIMITS_ENFORCE: '1', FREE_TS_WEEKLY_DISABLED: '1' } });
  for (let i = 0; i < 6; i += 1) {
    const a = await open(r, `K${i}`);
    assert.equal(a.status, 200);
    assert.equal(a.body.disabled, true);
  }
  assert.equal(r.f.docs.size, 0);
  // only the literal "1" disables it
  const t = rig({ env: { LIMITS_ENFORCE: '1', FREE_TS_WEEKLY_DISABLED: 'true' } });
  for (const k of ['A', 'B', 'C']) await open(t, k);
  assert.equal((await open(t, 'D')).status, 409);
});

test('open: the `ts` bucket does not disturb the download ledger', async () => {
  const r = rig();
  await open(r, 'A');
  const a = await dl(r, { kind: 'worksheet', paperKey: 'w1' });
  assert.equal(a.status, 200);
  assert.equal(a.body.free, true);
  const doc = [...r.f.docs.values()][0];
  assert.equal(doc.ts.length, 1);
  assert.equal(doc.dl.length, 1);
});

for (const tier of ['free', 'trial']) {
  test(`download (${tier}): a Test Series paper is VIEW-ONLY (409 download_view_only), nothing written`, async () => {
    const r = rig({ tier });
    const a = await dl(r, { kind: 'chapter-test', paperKey: SERIES_ID, cover: { chapters: ['real-numbers'] } });
    assert.equal(a.status, 409);
    assert.equal(a.body.error, 'download_view_only');
    assert.equal(r.f.docs.size, 0);
    // an ordinary paper of the same kind is metered exactly as before
    const b = await dl(r, { kind: 'chapter-test', paperKey: 'ct-fresh-1' });
    assert.equal(b.status, 200);
  });
}

test('download: unchanged for a Board Pass holder, a Test Series owner and a covering PDF pack owner', async () => {
  const p = rig({ tier: 'premium' });
  assert.equal((await dl(p, { kind: 'chapter-test', paperKey: SERIES_ID })).status, 200);
  const o = rig({ tier: 'trial', seriesOwnerPaper: async () => true });
  const oa = await dl(o, { kind: 'chapter-test', paperKey: SERIES_ID });
  assert.equal(oa.status, 200);
  assert.equal(oa.body.testSeries, true);
  const c = rig({ listPacks: async () => [{ packId: 'pack_chapter:real-numbers' }] });
  const ca = await dl(c, { kind: 'chapter-test', paperKey: SERIES_ID, cover: { chapters: ['real-numbers'] } });
  assert.equal(ca.status, 200);
  assert.equal(ca.body.packOwned, true);
});

test('download: kill switch FREE_TS_WEEKLY_DISABLED=1 restores today\'s metering; not enforced only counts', async () => {
  const r = rig({ env: { LIMITS_ENFORCE: '1', FREE_TS_WEEKLY_DISABLED: '1' } });
  const a = await dl(r, { kind: 'chapter-test', paperKey: SERIES_ID });
  assert.equal(a.status, 200);
  assert.equal(a.body.free, true);
  const d = rig({ env: {} });
  assert.equal((await dl(d, { kind: 'chapter-test', paperKey: SERIES_ID })).status, 200);
  assert.equal(d.counters['limits.download.would_view_only'], 1);
});

test('parity: the server weekly limit equals the client constant (src/config/mockViewLimits.ts)', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../src/config/mockViewLimits.ts'), 'utf8');
  assert.equal(Number(/FREE_TS_WEEKLY_SIGNED_IN = (\d+)/.exec(src)[1]), FREE_TS_OPENS_PER_WEEK);
});
