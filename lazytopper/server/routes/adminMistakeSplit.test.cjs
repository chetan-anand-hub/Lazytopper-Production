// MISTAKE-SPLIT-1 — GET /api/admin/mistake-split is ADMIN-ONLY, READ-ONLY and COUNTS-ONLY.
//
// ★ THE GATE UNDER TEST IS THE REAL ONE: adminTelemetry.cjs's requireFirebaseAdmin over a
// fake firebase-admin, as index.cjs mounts it (pinned by the source test at the bottom).
//
// Run: node --test lazytopper/server/routes/adminMistakeSplit.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createAdminMistakeSplitRoutes, summariseMistakeLogs, ADMIN_MISTAKE_SPLIT_PATH } = require('./adminMistakeSplit.cjs');
const { createAdminTelemetryRoutes } = require('./adminTelemetry.cjs');

const ADMIN = 'admin-owner-uid';
const fakeFirebaseAdmin = {
  auth: () => ({
    async verifyIdToken(token) {
      if (token === 'admin-token') return { uid: ADMIN };
      if (token === 'student-token') return { uid: 'u1' };
      throw new Error('invalid token');
    },
  }),
};

function log(owner, data) {
  return { data: () => data, ref: { parent: { parent: { id: owner } } } };
}

/** A Firestore stand-in whose writes THROW and whose only read is the collection group. */
function db(docs) {
  const reads = [];
  const deny = () => { throw new Error('WRITE ATTEMPTED'); };
  return {
    reads,
    collection: deny,
    batch: deny,
    runTransaction: deny,
    collectionGroup(name) {
      const q = {
        select(...fields) { reads.push({ name, fields }); return q; },
        limit() { return q; },
        async get() { return { docs }; },
        set: deny, update: deny, delete: deny, add: deny,
      };
      return q;
    },
  };
}

const SEED = [
  log('a', { subject: 'Maths', timestamp: '2026-10-01T10:00:00Z', mistakeCounts: { calculation: 2, conceptual: 1, silly: 0, presentation: 1 }, questionText: 'SECRET' }),
  log('a', { subject: 'Science', timestamp: '2026-11-01T10:00:00Z', mistakeCounts: { calculation: 0, conceptual: 0, silly: 1, presentation: 3 } }),
  log('b', { subject: 'Maths', timestamp: '2026-09-15T10:00:00Z', mistakeCounts: { calculation: 2, conceptual: 0, silly: 0, presentation: 0 } }),
  log('c', { subject: 'Maths', timestamp: '2026-09-01T10:00:00Z', mistakeCounts: { calculation: 0, conceptual: 0, silly: 0, presentation: 0 } }),
  log('d', { subject: 'Maths' }),
];

function harness(docs = SEED) {
  process.env.ADMIN_FIREBASE_UIDS = ADMIN;
  const store = db(docs);
  const { requireFirebaseAdmin } = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin: fakeFirebaseAdmin, telemetry: null });
  const routes = createAdminMistakeSplitRoutes({
    sendJson: (res, status, body) => { res.status = status; res.body = body; },
    adminFirestore: store,
    requireAdmin: requireFirebaseAdmin,
  });
  async function get(token) {
    const req = { method: 'GET', url: ADMIN_MISTAKE_SPLIT_PATH, headers: token ? { authorization: `Bearer ${token}` } : {} };
    const res = {};
    await routes.handle(req, res);
    return res;
  }
  return { get, store };
}

test('no token is 401 and nothing is read', async () => {
  const h = harness();
  const res = await h.get(null);
  assert.equal(res.status, 401);
  assert.equal(h.store.reads.length, 0);
});

test('a non-admin student is 403 and nothing is read', async () => {
  const h = harness();
  const res = await h.get('student-token');
  assert.equal(res.status, 403);
  assert.equal(h.store.reads.length, 0);
});

test('a missing gate is 503, never open', async () => {
  const routes = createAdminMistakeSplitRoutes({ sendJson: (res, s, b) => { res.status = s; res.body = b; }, adminFirestore: db(SEED) });
  const res = {};
  await routes.handle({ headers: {} }, res);
  assert.equal(res.status, 503);
});

test('admin gets totals, shares and per-subject counts, and only selected fields are read', async () => {
  const h = harness();
  const res = await h.get('admin-token');
  assert.equal(res.status, 200);
  const b = res.body;
  assert.deepEqual(b.counts, { calculation: 4, conceptual: 1, silly: 1, presentation: 4 });
  assert.equal(b.totalMistakes, 10);
  assert.deepEqual(b.share, { calculation: 40, conceptual: 10, silly: 10, presentation: 40 });
  assert.equal(b.logsWithAnyMistake, 3);
  assert.equal(b.students, 2);
  assert.equal(b.logsRead, 5);
  assert.equal(b.truncated, false);
  assert.equal(b.firstLog, '2026-09-15T10:00:00Z');
  assert.equal(b.lastLog, '2026-11-01T10:00:00Z');
  assert.deepEqual(b.bySubject.maths, { calculation: 4, conceptual: 1, silly: 0, presentation: 1 });
  assert.deepEqual(h.store.reads, [{ name: 'mistakeLogs', fields: ['mistakeCounts', 'subject', 'timestamp'] }]);
  // counts only: no question text or student id anywhere in the response
  const text = JSON.stringify(b);
  assert.ok(!text.includes('SECRET'));
  assert.ok(!/"a"|"b"/.test(text));
});

test('CONTROL: summarise ignores logs with no counts and gives null shares when empty', () => {
  const s = summariseMistakeLogs([{ data: {} }, { data: { mistakeCounts: { calculation: 0 } } }]);
  assert.equal(s.totalMistakes, 0);
  assert.equal(s.share.calculation, null);
  assert.equal(s.logsWithAnyMistake, 0);
});

test('index.cjs mounts the route behind the shared admin gate', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.cjs'), 'utf8');
  const line = src.split('\n').find((l) => l.includes("'/api/admin/mistake-split'"));
  assert.ok(line, 'route is mounted');
  assert.ok(line.includes("req.method === 'GET'"));
  assert.ok(line.includes('requireAdmin: adminTelemetryRoutes.requireFirebaseAdmin'));
});
