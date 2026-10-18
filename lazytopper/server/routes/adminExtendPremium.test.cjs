// ADMIN-EXTEND-1 — POST /api/admin/extend-premium is ADMIN-ONLY.
//
// ★ THE GATE UNDER TEST IS THE REAL ONE: `requireAdmin` is adminTelemetry.cjs's
// createAdminTelemetryRoutes(...).requireFirebaseAdmin — the very function index.cjs hands
// this route (pinned by the source test at the bottom) — over a fake firebase-admin whose
// verifyIdToken maps a token to a uid. Nothing about the allowlist is re-implemented.
//
// ★ MUTATION (run, shown red, restored — see the PR): skip the requireAdmin call in
//   adminExtendPremium.cjs -> "non-admin is refused 403 and NOTHING is written" red.
//
// Run: node --test lazytopper/server/routes/adminExtendPremium.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createAdminExtendPremiumRoutes, ADMIN_EXTEND_PREMIUM_PATH } = require('./adminExtendPremium.cjs');
const { createAdminTelemetryRoutes } = require('./adminTelemetry.cjs');

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-18T12:00:00+05:30');
const ADMIN = 'admin-owner-uid';
const STUDENT = 'u1';
const stamp = (ms) => ({ toDate: () => new Date(ms), toMillis: () => ms });

/** Minimal transactional store: enough for one extension at a time. */
function store(seed = {}) {
  const docs = new Map(Object.entries(seed));
  const read = (k) => {
    const d = docs.get(k);
    if (!d) return undefined;
    const out = {};
    for (const [f, v] of Object.entries(d)) out[f] = v instanceof Date ? stamp(v.getTime()) : v;
    return out;
  };
  const ref = (key) => ({ key, collection: (sub) => ({ doc: (id) => ref(`${key}/${sub}/${id}`) }) });
  return {
    docs,
    read,
    collection: (name) => ({ doc: (id) => ref(`${name}/${id}`) }),
    async runTransaction(fn) {
      const pending = [];
      const out = await fn({
        async get(r) { const d = read(r.key); return { exists: !!d, data: () => d }; },
        set(r, data, opts) { pending.push([r.key, data, opts]); },
      });
      for (const [k, d, o] of pending) docs.set(k, o && o.merge ? { ...(docs.get(k) || {}), ...d } : { ...d });
      return out;
    },
  };
}

const fakeFirebaseAdmin = {
  auth: () => ({
    async verifyIdToken(token) {
      if (token === 'admin-token') return { uid: ADMIN };
      if (token === 'student-token') return { uid: STUDENT };
      throw new Error('invalid token');
    },
  }),
};

function harness({ seed, adminUids = ADMIN, firebaseAdmin = fakeFirebaseAdmin } = {}) {
  process.env.ADMIN_FIREBASE_UIDS = adminUids;
  const db = store(seed ?? {
    [`subscriptions/${STUDENT}`]: { tier: 'trial', plan: 'trial_7day', trialStartDate: stamp(NOW - 4 * DAY) },
  });
  const { requireFirebaseAdmin } = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin, telemetry: null });
  let bodyReads = 0;
  const routes = createAdminExtendPremiumRoutes({
    sendJson: (res, status, body) => { res.status = status; res.body = body; },
    readJson: async (req) => { bodyReads += 1; return req.body; },
    adminFirestore: db,
    requireAdmin: requireFirebaseAdmin,
    now: () => NOW,
  });
  async function post(token, body) {
    const req = { method: 'POST', url: ADMIN_EXTEND_PREMIUM_PATH, headers: token ? { authorization: `Bearer ${token}` } : {}, body };
    const res = {};
    await routes.handle(req, res);
    return res;
  }
  return { db, post, bodyReads: () => bodyReads };
}

const BODY = { uid: STUDENT, days: 7, requestId: 'req-route-0001' };
const subOf = (db) => db.read(`subscriptions/${STUDENT}`);
const grantKeys = (db) => [...db.docs.keys()].filter((k) => k.includes('/adminGrants/'));

test('admin is served 200: the trial becomes premium until trial end + 7 days, with an audit entry naming the admin', async () => {
  const h = harness();
  const res = await h.post('admin-token', BODY);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.ok, true);
  assert.equal(res.body.replayed, false);
  assert.equal(res.body.extension.pricePaidInr, 0);
  assert.equal(res.body.extension.isSale, false);
  assert.equal(res.body.extension.adminUid, ADMIN);
  assert.equal(res.body.extension.newEnd, new Date(NOW + 3 * DAY + 7 * DAY).toISOString());
  assert.equal(subOf(h.db).tier, 'premium');
  assert.equal(grantKeys(h.db).length, 1);
});

test('★★ non-admin (a valid signed-in STUDENT) is refused 403 and NOTHING is written', async () => {
  const h = harness();
  const before = JSON.stringify([...h.db.docs.entries()]);
  const res = await h.post('student-token', BODY);
  assert.equal(res.status, 403);
  assert.equal(res.body.ok, false);
  assert.equal(JSON.stringify([...h.db.docs.entries()]), before);
  assert.equal(h.bodyReads(), 0, 'the body must not even be read before the gate passes');
});

test('★ no token -> 401; an invalid token -> 401; nothing written', async () => {
  const h = harness();
  assert.equal((await h.post(null, BODY)).status, 401);
  assert.equal((await h.post('forged-token', BODY)).status, 401);
  assert.equal(subOf(h.db).tier, 'trial');
  assert.equal(grantKeys(h.db).length, 0);
});

test('★ fail-closed: ADMIN_FIREBASE_UIDS unset -> 503 even with an otherwise valid token', async () => {
  const h = harness({ adminUids: '' });
  const res = await h.post('admin-token', BODY);
  assert.equal(res.status, 503);
  assert.equal(subOf(h.db).tier, 'trial');
});

test('★ fail-closed: no requireAdmin handed in -> 503', async () => {
  const routes = createAdminExtendPremiumRoutes({ sendJson: (res, s, b) => { res.status = s; res.body = b; }, readJson: async () => BODY, adminFirestore: store() });
  const res = {};
  await routes.handle({ method: 'POST', headers: { authorization: 'Bearer admin-token' } }, res);
  assert.equal(res.status, 503);
});

test('a double-click (same requestId) is replayed, not applied twice', async () => {
  const h = harness();
  const a = await h.post('admin-token', BODY);
  const b = await h.post('admin-token', BODY);
  assert.equal(a.body.replayed, false);
  assert.equal(b.status, 200);
  assert.equal(b.body.replayed, true);
  assert.equal(b.body.extension.newEnd, a.body.extension.newEnd);
  assert.equal(grantKeys(h.db).length, 1);
});

test('bad input -> 400; nothing to extend -> 409 with a code', async () => {
  const h = harness({ seed: { 'subscriptions/legacy': { tier: 'premium', plan: 'premium_monthly' } } });
  assert.equal((await h.post('admin-token', { ...BODY, days: 31 })).status, 400);
  assert.equal((await h.post('admin-token', { ...BODY, requestId: 'x' })).status, 400);
  const legacy = await h.post('admin-token', { ...BODY, uid: 'legacy' });
  assert.equal(legacy.status, 409);
  assert.equal(legacy.body.code, 'premium-no-end');
  const missing = await h.post('admin-token', { ...BODY, uid: 'nobody' });
  assert.equal(missing.status, 409);
  assert.equal(missing.body.code, 'no-record');
});

test('★ index.cjs mounts POST /api/admin/extend-premium behind adminTelemetryRoutes.requireFirebaseAdmin', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.cjs'), 'utf8');
  const line = src.split('\n').find((l) => l.includes(`reqPath === '${ADMIN_EXTEND_PREMIUM_PATH}'`));
  assert.ok(line, 'the route is not mounted in index.cjs');
  assert.match(line, /req\.method === 'POST'/);
  assert.match(line, /handleAdminExtendPremium/);
  assert.match(line, /requireAdmin: adminTelemetryRoutes\.requireFirebaseAdmin/);
});
