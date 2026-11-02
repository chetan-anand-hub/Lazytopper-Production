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
      const make = (field, filters) => ({
        orderBy(f, dir) {
          assert.equal(f, field); assert.equal(dir, 'desc');
          return {
            limit(n) {
              return {
                async get() {
                  reads += 1;
                  const docs = orders
                    .filter((o) => o.data[field] !== undefined && filters.every((fn) => fn(o)))
                    .sort((a, b) => b.data[field] - a.data[field]).slice(0, n);
                  return { size: docs.length, forEach: (fn) => docs.forEach((o) => fn({ id: o.id, data: () => o.data })) };
                },
              };
            },
          };
        },
      });
      return {
        ...make('paidAt', []),
        // CHECKOUT-1: the abandoned-checkout read is a createdAt range ordered by createdAt.
        where(field, op, value) {
          // PAY-PHONE-1: the unclaimed-guest read is a single equality on status, with a limit.
          if (field === 'status') {
            assert.equal(op, '==');
            return {
              limit: (n) => ({
                async get() {
                  reads += 1;
                  const docs = orders.filter((o) => o.data.status === value).slice(0, n);
                  return { size: docs.length, forEach: (fn) => docs.forEach((o) => fn({ id: o.id, data: () => o.data })) };
                },
              }),
            };
          }
          assert.equal(field, 'createdAt'); assert.equal(op, '>=');
          return make('createdAt', [(o) => o.data.createdAt >= value]);
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

// ── CHECKOUT-1: abandoned checkouts ──────────────────────────────────────────────────────────────
const created = (id, uid, passType, inr, ago, extra = {}) => ({ id, data: { uid, passType, amountPaise: inr * 100, status: 'created', createdAt: new Date(NOW - ago), ...extra } });
const MIN = 60000;

test('abandoned: only status created, older than 30 minutes, within 30 days; paid excluded; newest first', async () => {
  const orders = [
    created('old', 'u1', 'till_boards', 1917, 3 * DAY),
    created('fresh', 'u2', 'month', 599, 10 * MIN),
    created('edge', 'u3', 'month', 599, 30 * MIN),
    created('ok', 'u4', 'month', 599, 31 * MIN),
    created('ancient', 'u5', 'month', 599, 31 * DAY),
    { id: 'paidOne', data: { uid: 'u6', passType: 'month', amountPaise: 59900, status: 'paid', paymentId: 'pay_x', paidAt: new Date(NOW - 2 * DAY), createdAt: new Date(NOW - 2 * DAY - MIN) } },
    created('admin', 'admin1', 'pack_chapter', 49, 2 * DAY, { packTarget: 'triangles' }),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.abandoned.items.map((i) => i.orderId), ['ok', 'admin', 'old']);
  const [ok, adm, old] = res.body.abandoned.items;
  assert.equal(ok.email, 'u4@x.in'); assert.equal(ok.amountInr, 599); assert.equal(ok.passType, 'month');
  assert.equal(adm.isAdminAccount, true); assert.equal(old.isAdminAccount, false);
  assert.equal(old.amountInr, 1917);
});

test('PAY-RESCUE-1 abandoned: shows the stored lastFailure with attempted:true; no note -> attempted:false', async () => {
  const lastFailure = { code: 'BAD_REQUEST_ERROR', reason: 'payment_timeout', source: 'customer', step: 'payment_authorization', atMs: NOW - 40 * MIN, upi: 'kid@upi' };
  const { route } = harness({ orders: [created('failed', 'u1', 'month', 599, 2 * 60 * MIN, { lastFailure }), created('never', 'u2', 'month', 599, 3 * 60 * MIN)] });
  const res = {}; await route.list({}, res);
  const [failed, never] = res.body.abandoned.items;
  assert.equal(failed.orderId, 'failed');
  assert.equal(failed.attempted, true);
  assert.deepEqual(failed.lastFailure, { code: 'BAD_REQUEST_ERROR', reason: 'payment_timeout', source: 'customer', step: 'payment_authorization', atMs: NOW - 40 * MIN });
  assert.equal(never.attempted, false);
  assert.equal(never.lastFailure, null);
});

test('abandoned: the admin gate refuses before the abandoned read too', async () => {
  const { route, fs } = harness({ ok: false, orders: [created('o', 'u1', 'month', 599, DAY)] });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 403);
  assert.equal(res.body.abandoned, undefined);
  assert.equal(fs.reads, 0);
});

test('abandoned: a failed abandoned read keeps the purchases (abandoned is null)', async () => {
  process.env.ADMIN_FIREBASE_UIDS = 'admin1';
  const base = fakeFirestore([paid('o1', 'u1', 'month', 599, 10)]);
  const fs = { collection: (n) => ({ ...base.collection(n), where() { throw new Error('index missing'); } }) };
  const route = createAdminPurchasesRoutes({
    sendJson: (res, s, b) => { res.status = s; res.body = b; },
    adminFirestore: fs, firebaseAdmin: fakeAuth, now: () => NOW, requireAdmin: async () => ({ ok: true, uid: 'admin1' }),
  });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 1);
  assert.equal(res.body.abandoned, null);
});

test('PAY-PHONE-1 unclaimedGuest: guest paid_unclaimed only, phone MASKED, oldest first; never counted as a purchase', async () => {
  const HOUR = 3600000;
  const guest = (id, phone, passType, inr, ago, extra = {}) => ({
    id, data: { uid: null, payer: 'guest', guestPhone: phone, passType, amountPaise: inr * 100, status: 'paid_unclaimed', paymentId: `pay_${id}`, guestPaidAt: new Date(NOW - ago), ...extra },
  });
  const orders = [
    guest('g1', '+919876543948', 'pack_mock', 99, 2 * HOUR, { packTarget: 'maths' }),
    guest('g2', '+917012345678', 'till_boards', 1917, 30 * HOUR),
    { id: 'notGuest', data: { uid: 'u1', passType: 'month', amountPaise: 59900, status: 'paid_unclaimed' } },
    paid('p1', 'u2', 'month', 599, HOUR),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.unclaimedGuest.items.map((i) => i.orderId), ['g2', 'g1']);
  const [g2, g1] = res.body.unclaimedGuest.items;
  assert.equal(g1.phoneMasked, '+91 98•••••948');
  assert.equal(g1.paymentId, 'pay_g1'); assert.equal(g1.amountInr, 99); assert.equal(g1.kind, 'pack'); assert.equal(g1.ageHours, 2);
  assert.equal(g2.kind, 'premium'); assert.equal(g2.ageHours, 30);
  assert.ok(!JSON.stringify(res.body).includes('9876543948'), 'the full number never leaves the store');
  assert.deepEqual(res.body.items.map((i) => i.orderId), ['p1']);
});
