'use strict';
// ADMIN-PURCHASES-1. Run: node --test server/routes/adminPurchases.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminPurchasesRoutes } = require('./adminPurchases.cjs');

const NOW = Date.parse('2026-10-31T06:00:00Z');
const DAY = 86400000;

function fakeFirestore(orders) {
  let reads = 0;
  return {
    get reads() { return reads; },
    collection(name) {
      assert.equal(name, 'payOrders');
      return {
        orderBy(field, dir) {
          assert.equal(field, 'paidAt'); assert.equal(dir, 'desc');
          return {
            limit(n) {
              return {
                async get() {
                  reads += 1;
                  const docs = orders.filter((o) => o.data.paidAt !== undefined).sort((a, b) => b.data.paidAt - a.data.paidAt).slice(0, n);
                  return { size: docs.length, forEach: (fn) => docs.forEach((o) => fn({ id: o.id, data: () => o.data })) };
                },
              };
            },
          };
        },
      };
    },
  };
}
const fakeAuth = { auth: () => ({ getUsers: async (ids) => ({ users: ids.map(({ uid }) => ({ uid, email: `${uid}@x.in`, displayName: `Name ${uid}` })) }) }) };
const paid = (id, uid, passType, inr, ago, extra = {}) => ({ id, data: { uid, passType, amountPaise: inr * 100, status: 'paid', paymentId: `pay_${id}`, paidAt: new Date(NOW - ago), ...extra } });

function harness({ ok = true, orders = [], admins = 'admin1' } = {}) {
  process.env.ADMIN_FIREBASE_UIDS = admins;
  const fs = fakeFirestore(orders);
  const route = createAdminPurchasesRoutes({
    sendJson: (res, status, body) => { res.status = status; res.body = body; },
    adminFirestore: fs, firebaseAdmin: fakeAuth, now: () => NOW,
    requireAdmin: async () => (ok ? { ok: true, uid: 'admin1' } : { ok: false, status: 403, error: 'Forbidden' }),
  });
  return { route, fs };
}

test('non-admin is refused (403) before any data is read; a missing gate is 503', async () => {
  const { route, fs } = harness({ ok: false, orders: [paid('o1', 'u1', 'month', 599, 1000)] });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 403);
  assert.equal(fs.reads, 0);
  const noGate = createAdminPurchasesRoutes({ sendJson: (r, s, b) => { r.status = s; r.body = b; }, adminFirestore: fs });
  const r2 = {}; await noGate.list({}, r2);
  assert.equal(r2.status, 503);
  assert.equal(fs.reads, 0);
});

test('only status paid + paymentId + paidAt count; created / no paymentId are never purchases', async () => {
  const orders = [
    paid('o1', 'u1', 'month', 599, 1000),
    { id: 'o2', data: { uid: 'u2', passType: 'month', amountPaise: 59900, status: 'created', createdAt: new Date(NOW) } },
    { id: 'o3', data: { uid: 'u3', passType: 'month', amountPaise: 59900, status: 'created', paidAt: new Date(NOW - 5) } },
    paid('o4', 'u4', 'month', 599, 2000, { paymentId: '' }),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  assert.deepEqual(res.body.items.map((i) => i.orderId), ['o1']);
  assert.equal(res.body.items[0].email, 'u1@x.in');
  assert.equal(res.body.items[0].name, 'Name u1');
});

test('newest first, channel, pack target, admin flag', async () => {
  const orders = [
    paid('a', 'u1', 'pack_subject', 199, 3000, { packTarget: 'maths' }),
    paid('b', 'admin1', 'pack_subject', 199, 1000, { packTarget: 'science' }),
    paid('c', 'u2', 'till_boards', 2396, 2000, { payer: 'parent' }),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  assert.deepEqual(res.body.items.map((i) => i.orderId), ['b', 'c', 'a']);
  const [b, c, a] = res.body.items;
  assert.equal(b.isAdminAccount, true); assert.equal(a.isAdminAccount, false);
  assert.equal(c.channel, 'parent'); assert.equal(a.channel, 'student');
  assert.equal(a.packTarget, 'maths'); assert.equal(a.amountInr, 199);
});

test('totals: IST windows, Premium vs packs, admin accounts excluded', async () => {
  const orders = [
    paid('p1', 'u1', 'month', 599, 1 * DAY),
    paid('p2', 'u2', 'pack_chapter', 49, 2 * DAY, { packTarget: 'triangles' }),
    paid('p3', 'admin1', 'pack_subject', 199, 1 * DAY, { packTarget: 'maths' }),
    paid('p4', 'u3', 'pack_bundle', 299, 20 * DAY),
    paid('p5', 'u4', 'month', 599, 40 * DAY),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  const t = res.body.totals;
  assert.deepEqual(t.last7.premium, { count: 1, inr: 599 });
  assert.deepEqual(t.last7.packs, { count: 1, inr: 49 });
  assert.deepEqual(t.last30.packs, { count: 2, inr: 348 });
  assert.deepEqual(t.last30.premium, { count: 1, inr: 599 });
  assert.equal(t.excludesAdminAccounts, true);
  assert.equal(t.complete, true);
});

test('profile lookup failure keeps the rows, with no email', async () => {
  process.env.ADMIN_FIREBASE_UIDS = 'admin1';
  const route = createAdminPurchasesRoutes({
    sendJson: (res, s, b) => { res.status = s; res.body = b; },
    adminFirestore: fakeFirestore([paid('o1', 'u1', 'month', 599, 10)]),
    firebaseAdmin: { auth: () => ({ getUsers: async () => { throw new Error('boom'); } }) },
    now: () => NOW, requireAdmin: async () => ({ ok: true, uid: 'admin1' }),
  });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 200);
  assert.equal(res.body.items[0].email, null);
});
