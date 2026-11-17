'use strict';
// ADMIN-PURCHASES-1. Run: node --test server/routes/adminPurchases.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminPurchasesRoutes } = require('./adminPurchases.cjs');

const NOW = Date.parse('2026-10-31T06:00:00Z');
const DAY = 86400000;

function fakeFirestore(orders, waOptIns = []) {
  let reads = 0;
  return {
    get reads() { return reads; },
    collection(name) {
      // WHATSAPP-OPTIN-1: the free-sample opt-in list is its own (separate-counter) read: where('lastAt','>=').orderBy('lastAt','desc').limit().
      if (name === 'waOptIns') {
        return {
          where: (f, op, since) => {
            assert.equal(f, 'lastAt'); assert.equal(op, '>=');
            return { orderBy: (f2, dir) => { assert.equal(f2, 'lastAt'); assert.equal(dir, 'desc'); return { limit: (n) => ({ async get() {
              const docs = waOptIns.filter((o) => o.data.lastAt >= since).sort((a, b) => b.data.lastAt - a.data.lastAt).slice(0, n);
              return { size: docs.length, forEach: (fn) => docs.forEach((o) => fn({ id: o.id, data: () => o.data })) };
            } }) }; } };
          },
        };
      }
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

function harness({ ok = true, orders = [], admins = 'admin1', waOptIns = [] } = {}) {
  process.env.ADMIN_FIREBASE_UIDS = admins;
  const fs = fakeFirestore(orders, waOptIns);
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

test('UNCLAIMED-ALERT-1 unclaimedGuest.overdue: counts orders unclaimed for 15 minutes or more (the admin badge), not newer ones', async () => {
  const MIN = 60000;
  const guest = (id, ago) => ({ id, data: { uid: null, payer: 'guest', guestPhone: '+919876543948', passType: 'pack_mock', amountPaise: 9900, status: 'paid_unclaimed', paymentId: `pay_${id}`, guestPaidAt: new Date(NOW - ago) } });
  const { route } = harness({ orders: [guest('a', 14 * MIN), guest('b', 15 * MIN), guest('c', 600 * MIN)] });
  const res = {}; await route.list({}, res);
  assert.equal(res.body.unclaimedGuest.overdue, 2);
  assert.equal(res.body.unclaimedGuest.items.length, 3);
});

test('PAY-PHONE-1 review · guestAttention: claimed+grant failed, duplicate purchases, erased before claim; masked; in-progress claims hidden', async () => {
  const HOUR = 3600000;
  const g = (id, status, extra = {}) => ({ id, data: { uid: 'u1', payer: 'guest', guestPhone: '+919876543948', passType: 'pack_mock', packTarget: 'maths', amountPaise: 9900, status, paymentId: `pay_${id}`, guestPaidAt: new Date(NOW - 5 * HOUR), ...extra } });
  const orders = [
    g('f1', 'claimed', { claimError: { code: 'grant_failed', atMs: NOW } }),
    g('busy', 'claimed'),
    g('r1', 'duplicate_purchase', { duplicateReason: 'already_owned' }),
    g('e1', 'erased_unclaimed', { guestPhone: null, uid: null }),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  const rows = res.body.guestAttention.items;
  assert.deepEqual(rows.map((r) => [r.orderId, r.state]), [
    ['f1', 'claimed, grant failed'],
    ['r1', 'Paid again for something the account already has'],
    ['e1', 'Paid, account erased before sign-in'],
  ]);
  assert.equal(rows[0].phoneMasked, '+91 98•••••948');
  assert.equal(rows[0].paymentId, 'pay_f1');
  assert.equal(rows[1].reason, 'already_owned');
  assert.equal(rows[2].paymentId, 'pay_e1');
  assert.ok(!JSON.stringify(res.body).includes('9876543948'));
});

test('CHECKOUT-WHO-1 · a recipient order shows recipient (MASKED), payer type, claimed-by uid and the two-accounts note; others unchanged', async () => {
  const HOUR = 3600000;
  const orders = [
    { id: 'w1', data: { uid: null, payer: 'guest', checkoutWho: true, guestPhone: '+919876543948', guestEmail: 'anaya.k@gmail.com', payerType: 'signed_out', passType: 'till_boards', amountPaise: 191700, status: 'paid_unclaimed', paymentId: 'pay_w1', guestPaidAt: new Date(NOW - 3 * HOUR) } },
    paid('w2', 'uKid', 'till_boards', 1917, HOUR, { payer: 'guest', checkoutWho: true, guestEmail: 'anaya.k@gmail.com', payerType: 'signed_in_other', claimedVia: 'existing_account', adminNote: 'phone_and_email_on_different_accounts' }),
    paid('p1', 'u2', 'month', 599, 2 * HOUR),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 200);
  const [w1] = res.body.unclaimedGuest.items;
  assert.deepEqual(w1.recipient, { phoneMasked: '+91 98•••••948', emailMasked: 'an••••@gmail.com' });
  assert.equal(w1.payerType, 'signed_out');
  assert.equal(w1.claimedBy, null);
  const w2 = res.body.items.find((i) => i.orderId === 'w2');
  assert.deepEqual(w2.recipient, { emailMasked: 'an••••@gmail.com' });
  assert.equal(w2.payerType, 'signed_in_other');
  assert.equal(w2.claimedBy, 'uKid');
  assert.equal(w2.claimedVia, 'existing_account');
  assert.equal(w2.adminNote, 'phone_and_email_on_different_accounts');
  const p1 = res.body.items.find((i) => i.orderId === 'p1');
  assert.equal(p1.recipient, undefined, 'an ordinary order has no new fields');
  assert.ok(!JSON.stringify(res.body).includes('9876543948') && !JSON.stringify(res.body).includes('anaya.k@'));
});

test('PARENT-PACKS-1 M2: a paid pack order the student already had is flagged "duplicate — check with the payer" (facts only)', async () => {
  const orders = [
    paid('d', 'u1', 'pack_chapter', 49, 1000, { packTarget: 'polynomials', payer: 'parent', duplicate: true }),
    paid('e', 'u2', 'pack_cbq', 199, 2000, { packTarget: 'maths' }),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  const [d, e] = res.body.items;
  assert.equal(d.duplicate, true);
  assert.equal(d.flag, 'duplicate — check with the payer');
  assert.equal(d.channel, 'parent');
  assert.equal(e.duplicate, undefined);
  assert.equal(e.flag, undefined);
  assert.doesNotMatch(JSON.stringify(res.body), /refund/i);
});

// ── GUEST-ABANDON-1: signed-out checkouts in abandoned; unclaimed guest money in the totals ───────────────────────────
test('GUEST-ABANDON-1 abandoned: a "Who will use it?" order and a phone-guest order appear MASKED; paid / claimed never', async () => {
  const HOUR = 3600000;
  const orders = [
    created('who', null, 'till_boards', 1917, 2 * HOUR, { payer: 'guest', checkoutWho: true, payerType: 'signed_out', guestPhone: '+919876543948', guestEmail: 'anaya.k@gmail.com' }),
    created('ph', null, 'pack_mock', 99, 3 * HOUR, { payer: 'guest', guestPhone: '+917012345678', packTarget: 'maths' }),
    created('young', null, 'till_boards', 1917, 10 * MIN, { payer: 'guest', checkoutWho: true, guestEmail: 'y@gmail.com' }),
    { id: 'gpaid', data: { uid: null, payer: 'guest', guestPhone: '+917012345678', passType: 'pack_mock', amountPaise: 9900, status: 'paid_unclaimed', paymentId: 'pay_g', guestPaidAt: new Date(NOW - HOUR), createdAt: new Date(NOW - 2 * HOUR) } },
    { id: 'gclaimed', data: { uid: 'uK', payer: 'guest', guestEmail: 'anaya.k@gmail.com', passType: 'till_boards', amountPaise: 191700, status: 'claimed', paymentId: 'pay_c', guestPaidAt: new Date(NOW - HOUR), createdAt: new Date(NOW - 2 * HOUR) } },
    created('own', 'u1', 'month', 599, 4 * HOUR),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.abandoned.items.map((i) => i.orderId), ['who', 'ph', 'own']);
  const [who, ph, own] = res.body.abandoned.items;
  assert.equal(who.channel, 'who');
  assert.deepEqual(who.recipient, { phoneMasked: '+91 98•••••948', emailMasked: 'an••••@gmail.com' });
  assert.equal(who.uid, null); assert.equal(who.email, null); assert.equal(who.name, null);
  assert.equal(who.payerType, 'signed_out');
  assert.equal(ph.channel, 'guest');
  assert.deepEqual(ph.recipient, { phoneMasked: '+91 70•••••678' });
  assert.equal(ph.amountInr, 99);
  assert.equal(own.channel, 'student'); assert.equal(own.email, 'u1@x.in');
  const body = JSON.stringify(res.body);
  for (const raw of ['9876543948', '7012345678', 'anaya.k@', 'y@gmail.com']) assert.ok(!body.includes(raw), `raw ${raw} leaked`);
});

test('GST-EXCL-1 abandoned: a guest ("Who" / phone) or student order created from the GST cut-off carries its base + GST; an all-in order carries none', async () => {
  const HOUR = 3600000;
  const orders = [
    created('gwho', null, 'till_boards', 2262, 2 * HOUR, { payer: 'guest', checkoutWho: true, guestEmail: 'anaya.k@gmail.com', baseInr: 1917, gstInr: 345, totalInr: 2262, gstRate: 0.18 }),
    created('gph', null, 'pack_mock', 117, 3 * HOUR, { payer: 'guest', guestPhone: '+917012345678', packTarget: 'maths', baseInr: 99, gstInr: 18, totalInr: 117, gstRate: 0.18 }),
    created('gold', null, 'till_boards', 1917, 4 * HOUR, { payer: 'guest', checkoutWho: true, guestEmail: 'old@gmail.com' }),
    created('sgst', 'u1', 'till_boards', 2262, 5 * HOUR, { baseInr: 1917, gstInr: 345, totalInr: 2262, gstRate: 0.18 }),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 200);
  const by = Object.fromEntries(res.body.abandoned.items.map((i) => [i.orderId, i]));
  assert.deepEqual([by.gwho.amountInr, by.gwho.baseInr, by.gwho.gstInr], [2262, 1917, 345]);
  assert.deepEqual([by.gph.amountInr, by.gph.baseInr, by.gph.gstInr], [117, 99, 18]);
  assert.deepEqual([by.sgst.amountInr, by.sgst.baseInr, by.sgst.gstInr], [2262, 1917, 345]);
  assert.equal(by.gold.amountInr, 1917);
  assert.equal('baseInr' in by.gold || 'gstInr' in by.gold, false, 'an all-in (pre-cut-off) guest order: byte-identical row');
});

test('GUEST-ABANDON-1 abandoned: no profile lookup is made for a guest row', async () => {
  process.env.ADMIN_FIREBASE_UIDS = 'admin1';
  const asked = [];
  const route = createAdminPurchasesRoutes({
    sendJson: (res, s, b) => { res.status = s; res.body = b; },
    adminFirestore: fakeFirestore([created('who', null, 'till_boards', 1917, 2 * 3600000, { payer: 'guest', checkoutWho: true, guestEmail: 'anaya.k@gmail.com' })]),
    firebaseAdmin: { auth: () => ({ getUsers: async (ids) => { asked.push(...ids); return { users: [] }; } }) },
    now: () => NOW, requireAdmin: async () => ({ ok: true, uid: 'admin1' }),
  });
  const res = {}; await route.list({}, res);
  assert.equal(res.body.abandoned.items.length, 1);
  assert.deepEqual(asked, []);
});

test('GUEST-ABANDON-1 totals: unclaimed guest money counted ONCE in guestUnclaimed; after the claim it moves to its product bucket, not both', async () => {
  const HOUR = 3600000;
  const g = (id, status, extra = {}) => ({ id, data: { uid: null, payer: 'guest', guestPhone: '+919876543948', passType: 'till_boards', amountPaise: 191700, status, paymentId: `pay_${id}`, guestPaidAt: new Date(NOW - 2 * HOUR), ...extra } });
  const before = [
    g('a', 'paid_unclaimed'),
    g('e', 'erased_unclaimed', { guestPhone: null, passType: 'pack_chapter', packTarget: 'triangles', amountPaise: 4900 }),
    g('c', 'claimed', { uid: 'u9' }),
    g('dup', 'duplicate_purchase', { uid: 'u8' }),
    g('old', 'paid_unclaimed', { guestPaidAt: new Date(NOW - 40 * DAY) }),
    g('adm', 'paid_unclaimed', { payerUid: 'admin1' }),
    g('nopay', 'paid_unclaimed', { paymentId: '' }),
  ];
  const r1 = {}; await harness({ orders: before }).route.list({}, r1);
  const t1 = r1.body.totals;
  assert.deepEqual(t1.last7.guestUnclaimed, { count: 3, inr: 1917 + 49 + 1917 });
  assert.deepEqual(t1.last30.guestUnclaimed, { count: 3, inr: 1917 + 49 + 1917 });
  assert.deepEqual(t1.last7.premium, { count: 0, inr: 0 });
  assert.equal(t1.guestUnclaimedKnown, true);
  // 'a' is claimed and granted 9 days later: status paid, uid set, paidAt NOW. It counts once, dated when the money came.
  const after = [paid('a', 'u5', 'till_boards', 1917, 0, { payer: 'guest', guestPaidAt: new Date(NOW - 2 * HOUR) }), ...before.slice(1)];
  const r2 = {}; await harness({ orders: after }).route.list({}, r2);
  const t2 = r2.body.totals;
  assert.deepEqual(t2.last7.guestUnclaimed, { count: 2, inr: 1917 + 49 });
  assert.deepEqual(t2.last7.premium, { count: 1, inr: 1917 });
  assert.ok(!JSON.stringify(r2.body).includes('9876543948'));
});

test('GUEST-ABANDON-1 totals: a failed guest read leaves purchases intact and says the guest figure is unknown', async () => {
  process.env.ADMIN_FIREBASE_UIDS = 'admin1';
  const base = fakeFirestore([paid('o1', 'u1', 'till_boards', 1917, 10)]);
  const fs = { collection: (n) => ({ ...base.collection(n), where() { throw new Error('down'); } }) };
  const route = createAdminPurchasesRoutes({
    sendJson: (res, s, b) => { res.status = s; res.body = b; },
    adminFirestore: fs, firebaseAdmin: fakeAuth, now: () => NOW, requireAdmin: async () => ({ ok: true, uid: 'admin1' }),
  });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 200);
  assert.equal(res.body.totals.guestUnclaimedKnown, false);
  assert.deepEqual(res.body.totals.last7.premium, { count: 1, inr: 1917 });
});

test('review D6/D4: erased_unclaimed counts; a claimed order by an admin payer or landed on an admin is excluded; guestTruncated is separate from complete', async () => {
  const HOUR = 3600000;
  const g = (id, status, extra = {}) => ({ id, data: { uid: null, payer: 'guest', passType: 'pack_chapter', packTarget: 'triangles', amountPaise: 4900, status, paymentId: `pay_${id}`, guestPaidAt: new Date(NOW - HOUR), ...extra } });
  const orders = [
    g('er', 'erased_unclaimed', { guestPhone: null }),
    g('cAdminPayer', 'claimed', { uid: 'u3', payerUid: 'admin1' }),
    g('cAdminUid', 'claimed', { uid: 'admin1' }),
    g('cOk', 'claimed', { uid: 'u4' }),
  ];
  const r = {}; await harness({ orders }).route.list({}, r);
  assert.deepEqual(r.body.totals.last7.guestUnclaimed, { count: 2, inr: 98 });
  assert.equal(r.body.totals.guestTruncated, false);
  assert.equal(r.body.totals.complete, true);
  // 300 paid_unclaimed guest orders: the guest read is capped -> guestTruncated, while `complete` (paid orders) stays true.
  const many = Array.from({ length: 300 }, (_, i) => g(`m${i}`, 'paid_unclaimed'));
  const r2 = {}; await harness({ orders: many }).route.list({}, r2);
  assert.equal(r2.body.totals.guestTruncated, true);
  assert.equal(r2.body.totals.complete, true);
});

test('TEST-ACCOUNTS-1: TEST_ACCOUNT_EMAILS flags + excludes test accounts (case-insensitive); unset = unchanged; no admin access', async () => {
  const lookups = [];
  const auth = { auth: () => ({
    getUsers: fakeAuth.auth().getUsers,
    getUserByEmail: async (e) => { lookups.push(e); if (e === 'tester@x.in') return { uid: 'tu1' }; const err = new Error('nf'); err.code = 'auth/user-not-found'; throw err; },
  }) };
  const orders = [paid('p1', 'u1', 'pack_chapter', 199, 1000), paid('p2', 'tu1', 'pack_chapter', 235, 2000)];
  const run = async (env) => {
    process.env.ADMIN_FIREBASE_UIDS = 'admin1';
    if (env === undefined) delete process.env.TEST_ACCOUNT_EMAILS; else process.env.TEST_ACCOUNT_EMAILS = env;
    const route = createAdminPurchasesRoutes({
      sendJson: (res, s, b) => { res.status = s; res.body = b; }, adminFirestore: fakeFirestore(orders), firebaseAdmin: auth, now: () => NOW,
      requireAdmin: async () => ({ ok: true, uid: 'admin1' }),
    });
    const r = {}; await route.list({}, r); return r.body;
  };
  const off = await run(undefined);
  assert.equal(lookups.length, 0);
  assert.equal(off.items.find((i) => i.uid === 'tu1').isAdminAccount, false);
  assert.deepEqual(off.totals.last7.packs, { count: 2, inr: 434 });
  const on = await run(' Tester@X.in , missing@x.in ');
  assert.equal(on.items.find((i) => i.uid === 'tu1').isAdminAccount, true);
  assert.equal(on.items.find((i) => i.uid === 'u1').isAdminAccount, false);
  assert.deepEqual(on.totals.last7.packs, { count: 1, inr: 199 });
  assert.equal(JSON.stringify(on).includes('TEST_ACCOUNT'), false);
  delete process.env.TEST_ACCOUNT_EMAILS;
});

test('TEST-ACCOUNTS-1: a guest order whose guestEmail is a test email is flagged and left out of guest totals', async () => {
  process.env.TEST_ACCOUNT_EMAILS = 'Tester@x.in';
  const g = (id, extra) => ({ id, data: { uid: null, payer: 'guest', passType: 'pack_chapter', packTarget: 'triangles', amountPaise: 4900, status: 'paid_unclaimed', paymentId: `pay_${id}`, guestPaidAt: new Date(NOW - 3600000), ...extra } });
  const r = {}; await harness({ orders: [g('t1', { guestEmail: 'tester@X.in' }), g('r1', { guestEmail: 'real@x.in' })] }).route.list({}, r);
  assert.deepEqual(r.body.totals.last7.guestUnclaimed, { count: 1, inr: 49 });
  delete process.env.TEST_ACCOUNT_EMAILS;
});

// ───────────── ADMIN-MOVE-1: POST /api/admin/purchases/move ─────────────
// In-memory Firestore with transactions (reads then writes), subcollections and auto-ids.
function memStore(initial) {
  const m = new Map(Object.entries(initial));
  const writes = [];
  let auto = 0;
  const kids = (path) => [...m.keys()].filter((k) => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes('/'));
  const collSnap = (path) => { const docs = kids(path).map((k) => ({ id: k.split('/').pop(), exists: true, data: () => structuredClone(m.get(k)) })); return { docs, size: docs.length, empty: docs.length === 0 }; };
  const snap = (path) => ({ exists: m.has(path), id: path.split('/').pop(), data: () => (m.has(path) ? structuredClone(m.get(path)) : undefined) });
  const ref = (path) => ({
    path, id: path.split('/').pop(),
    collection: (n) => coll(`${path}/${n}`),
    get: async () => snap(path),
    listCollections: async () => [...new Set([...m.keys()].filter((k) => k.startsWith(`${path}/`)).map((k) => k.slice(path.length + 1).split('/')[0]))].map((id) => ({ id })),
  });
  const coll = (path) => ({
    isColl: true, path,
    doc: (id) => ref(`${path}/${id || `auto${++auto}`}`),
    get: async () => collSnap(path),
    where: (f, op, v) => ({ get: async () => { const docs = collSnap(path).docs.filter((d) => d.data()[f] === v); return { docs, size: docs.length }; } }),
  });
  return {
    m, writes,
    collection: (n) => coll(n),
    async runTransaction(fn) {
      const pending = [];
      let wrote = false;
      const tx = {
        async get(r) { assert.equal(wrote, false, 'a read after a write'); return r.isColl ? collSnap(r.path) : snap(r.path); },
        set(r, v, o) { wrote = true; pending.push(() => { m.set(r.path, o && o.merge ? { ...(m.get(r.path) || {}), ...v } : v); writes.push(['set', r.path]); }); },
        delete(r) { wrote = true; pending.push(() => { m.delete(r.path); writes.push(['delete', r.path]); }); },
      };
      const out = await fn(tx);
      pending.forEach((p) => p());
      return out;
    },
  };
}
const PACK = { packId: 'pack_bundle:all', sku: 'pack_bundle', target: 'all', pricePaidInr: 353, paidAt: 1762940000000, orderId: 'order_m', paymentRef: 'pay_m', creditedToPass: false };
const seed = (over = {}) => ({
  'payOrders/order_m': { uid: 'pay-src', passType: 'pack_bundle', packTarget: 'all', status: 'paid', paymentId: 'pay_m', paidAt: new Date(NOW), amountPaise: 35300 },
  'packEntitlements/pay-src/packs/pack_bundle:all': PACK,
  'packEntitlements/pay-src/grants/pay_m': { paymentRef: 'pay_m', packId: 'pack_bundle:all', orderId: 'order_m', grantedAt: 1 },
  ...over,
});
function moveHarness(store, { admin = true, users } = {}) {
  const sent = [];
  const accounts = users || { 'priya@gmail.com': 'google-uid', '+919611111555': 'phone-uid' };
  const routes = createAdminPurchasesRoutes({
    sendJson: (res, status, body) => sent.push([status, body]),
    readJson: async (req) => req.body,
    adminFirestore: store,
    firebaseAdmin: { auth: () => ({
      getUserByEmail: async (e) => { if (!accounts[e]) { const x = new Error('nf'); x.code = 'auth/user-not-found'; throw x; } return { uid: accounts[e] }; },
      getUserByPhoneNumber: async (p) => { if (!accounts[p]) { const x = new Error('nf'); x.code = 'auth/user-not-found'; throw x; } return { uid: accounts[p] }; },
    }) },
    requireAdmin: async () => (admin ? { ok: true, uid: 'admin-1' } : { ok: false, status: 403, error: 'Forbidden' }),
    now: () => NOW,
  });
  const call = async (body) => { sent.length = 0; await routes.move({ body }); return sent[0]; };
  return { call, sent };
}

test('ADMIN-MOVE-1: a non-admin gets 403 and nothing is read or written', async () => {
  const s = memStore(seed());
  const h = moveHarness(s, { admin: false });
  const [status] = await h.call({ orderId: 'order_m', toEmail: 'priya@gmail.com' });
  assert.equal(status, 403);
  assert.deepEqual(s.writes, []);
});

test('ADMIN-MOVE-1: bad bodies are 400 (no target, two targets, bad email, bad phone, no order id)', async () => {
  const s = memStore(seed());
  const h = moveHarness(s);
  for (const body of [{ orderId: 'order_m' }, { orderId: 'order_m', toEmail: 'priya@gmail.com', toPhone: '9611111555' }, { orderId: 'order_m', toEmail: 'nope' }, { orderId: 'order_m', toPhone: '12345' }, { toEmail: 'priya@gmail.com' }]) {
    assert.equal((await h.call(body))[0], 400, JSON.stringify(body));
  }
  assert.deepEqual(s.writes, []);
});

test('ADMIN-MOVE-1: an unpaid order is 400; a Board Pass order is 400; an unknown order is 404', async () => {
  const s = memStore(seed({ 'payOrders/order_u': { uid: 'pay-src', passType: 'pack_bundle', packTarget: 'all', status: 'created' }, 'payOrders/order_p': { uid: 'pay-src', passType: 'till_boards', status: 'paid', paymentId: 'pay_p' } }));
  const h = moveHarness(s);
  assert.equal((await h.call({ orderId: 'order_u', toEmail: 'priya@gmail.com' }))[0], 400);
  assert.equal((await h.call({ orderId: 'order_p', toEmail: 'priya@gmail.com' }))[0], 400);
  assert.equal((await h.call({ orderId: 'nope', toEmail: 'priya@gmail.com' }))[0], 404);
  assert.deepEqual(s.writes, []);
});

test('ADMIN-MOVE-1: an unknown target account is 404 with the ask-them-to-sign-in copy, no writes', async () => {
  const s = memStore(seed());
  const h = moveHarness(s);
  const [status, body] = await h.call({ orderId: 'order_m', toEmail: 'ghost@gmail.com' });
  assert.equal(status, 404);
  assert.match(body.error, /ask them to sign in once first/);
  assert.deepEqual(s.writes, []);
});

test('ADMIN-MOVE-1: the target already holds the pack, or a covering pack => 409 and NOTHING written', async () => {
  const a = memStore(seed({ 'packEntitlements/google-uid/packs/pack_bundle:all': { ...PACK, orderId: 'other', paymentRef: 'pay_o' } }));
  assert.equal((await moveHarness(a).call({ orderId: 'order_m', toEmail: 'priya@gmail.com' }))[0], 409);
  assert.deepEqual(a.writes, []);
  // chapter-pack order; the target holds the Bundle that covers it
  const b = memStore({
    'payOrders/order_c': { uid: 'pay-src', passType: 'pack_chapter', packTarget: 'real-numbers', status: 'paid', paymentId: 'pay_c' },
    'packEntitlements/pay-src/packs/pack_chapter:real-numbers': { packId: 'pack_chapter:real-numbers', sku: 'pack_chapter', target: 'real-numbers', pricePaidInr: 49, paidAt: 1, orderId: 'order_c', paymentRef: 'pay_c', creditedToPass: false },
    'packEntitlements/google-uid/packs/pack_bundle:all': PACK,
  });
  const r = await moveHarness(b).call({ orderId: 'order_c', toEmail: 'priya@gmail.com' });
  assert.equal(r[0], 409);
  assert.deepEqual(b.writes, []);
});

test('ADMIN-MOVE-1: success moves exactly the entitlement + marker, byte-identical, and leaves no copy on the source', async () => {
  const s = memStore(seed());
  const h = moveHarness(s);
  const before = structuredClone(s.m.get('payOrders/order_m'));
  const [status, body] = await h.call({ orderId: 'order_m', toEmail: 'Priya@Gmail.com' });
  assert.equal(status, 200);
  assert.equal(body.moved, true);
  assert.deepEqual(s.m.get('packEntitlements/google-uid/packs/pack_bundle:all'), PACK);
  assert.deepEqual(s.m.get('packEntitlements/google-uid/grants/pay_m'), { paymentRef: 'pay_m', packId: 'pack_bundle:all', orderId: 'order_m', grantedAt: 1 });
  assert.equal(s.m.has('packEntitlements/pay-src/packs/pack_bundle:all'), false);
  assert.equal(s.m.has('packEntitlements/pay-src/grants/pay_m'), false);
  const after = s.m.get('payOrders/order_m');
  assert.equal(after.uid, 'google-uid');
  // payment state untouched: only `uid` differs
  assert.deepEqual({ ...after, uid: before.uid }, before);
});

test('ADMIN-MOVE-1: the audit record has uids only (no phone, no email) and the admin uid', async () => {
  const s = memStore(seed());
  await moveHarness(s).call({ orderId: 'order_m', toPhone: '+91 96111 11555' });
  const audits = [...s.m.entries()].filter(([k]) => k.startsWith('adminMoves/'));
  assert.equal(audits.length, 1);
  const a = audits[0][1];
  assert.deepEqual(Object.keys(a).sort(), ['adminUid', 'at', 'fromUid', 'orderId', 'reason', 'toUid']);
  assert.equal(a.fromUid, 'pay-src'); assert.equal(a.toUid, 'phone-uid'); assert.equal(a.adminUid, 'admin-1'); assert.equal(a.reason, 'admin move');
  assert.equal(/@|\+91|9611111555/.test(JSON.stringify(a)), false);
});

test('ADMIN-MOVE-1: repeating the same move is ok and writes nothing', async () => {
  const s = memStore(seed());
  const h = moveHarness(s);
  await h.call({ orderId: 'order_m', toEmail: 'priya@gmail.com' });
  const n = s.writes.length;
  const [status, body] = await h.call({ orderId: 'order_m', toEmail: 'priya@gmail.com' });
  assert.equal(status, 200);
  assert.equal(body.moved, false);
  assert.equal(s.writes.length, n);
});

test('ADMIN-MOVE-1: a pack credited to a Board Pass is refused; a holder with no pack from the order is 409', async () => {
  const a = memStore(seed({ 'packEntitlements/pay-src/packs/pack_bundle:all': { ...PACK, creditedToPass: true } }));
  assert.equal((await moveHarness(a).call({ orderId: 'order_m', toEmail: 'priya@gmail.com' }))[0], 409);
  const b = memStore(seed({ 'packEntitlements/pay-src/packs/pack_bundle:all': { ...PACK, orderId: 'elsewhere' } }));
  assert.equal((await moveHarness(b).call({ orderId: 'order_m', toEmail: 'priya@gmail.com' }))[0], 409);
  assert.deepEqual(a.writes.concat(b.writes), []);
});

// ───────────── ADMIN-MOVE-1 (scope change): POST /api/admin/accounts/merge ─────────────
function authFake(users) {
  const calls = [];
  const byField = (f, v) => Object.values(users).find((u) => u[f] === v);
  const fa = {
    calls, users,
    auth: () => ({
      getUser: async (uid) => { if (!users[uid]) { const x = new Error('nf'); x.code = 'auth/user-not-found'; throw x; } return { ...users[uid] }; },
      getUserByEmail: async (e) => { const u = byField('email', e); if (!u) { const x = new Error('nf'); x.code = 'auth/user-not-found'; throw x; } return { ...u }; },
      getUserByPhoneNumber: async (p) => { const u = byField('phoneNumber', p); if (!u) { const x = new Error('nf'); x.code = 'auth/user-not-found'; throw x; } return { ...u }; },
      updateUser: async (uid, patch) => { calls.push(['updateUser', uid, patch]); const u = users[uid]; for (const [k, v] of Object.entries(patch)) { if (v === null) delete u[k]; else u[k] = v; } return { ...u }; },
      setCustomUserClaims: async (uid, c) => { calls.push(['claims', uid, c]); users[uid].claims = c; },
      deleteUser: async () => { throw new Error('must never delete'); },
    }),
  };
  return fa;
}
const mergeUsers = (over = {}) => ({
  'pay-src': { uid: 'pay-src', phoneNumber: '+919611111555', disabled: false },
  'google-uid': { uid: 'google-uid', email: 'priya@gmail.com', disabled: false },
  ...over,
});
function mergeHarness(store, fa, { admin = true } = {}) {
  const sent = [];
  const routes = createAdminPurchasesRoutes({
    sendJson: (res, status, body) => sent.push([status, body]), readJson: async (req) => req.body, adminFirestore: store, firebaseAdmin: fa,
    requireAdmin: async () => (admin ? { ok: true, uid: 'admin-1' } : { ok: false, status: 403, error: 'Forbidden' }), now: () => NOW,
  });
  return async (body) => { sent.length = 0; await routes.merge({ body }); return sent[0]; };
}

test('ADMIN-MERGE: non-admin 403; bad bodies 400; unknown target 404; nothing written', async () => {
  const s = memStore(seed()); const fa = authFake(mergeUsers());
  assert.equal((await mergeHarness(s, fa, { admin: false })({ fromUid: 'pay-src', toEmail: 'priya@gmail.com' }))[0], 403);
  const call = mergeHarness(s, fa);
  for (const b of [{ toEmail: 'priya@gmail.com' }, { fromUid: 'pay-src' }, { fromUid: 'pay-src', toEmail: 'priya@gmail.com', toPhone: '9611111555' }, { fromUid: 'pay-src', toEmail: 'x' }]) assert.equal((await call(b))[0], 400);
  assert.equal((await call({ fromUid: 'pay-src', toEmail: 'ghost@gmail.com' }))[0], 404);
  assert.deepEqual(s.writes, []); assert.deepEqual(fa.calls, []);
});

test('ADMIN-MERGE: success moves entitlement + marker + order holder; phone moves to the target; source disabled, NOT deleted', async () => {
  const s = memStore(seed()); const fa = authFake(mergeUsers());
  const [status, body] = await mergeHarness(s, fa)({ fromUid: 'pay-src', toEmail: 'priya@gmail.com' });
  assert.equal(status, 200); assert.equal(body.merged, true); assert.equal(body.phoneMoved, true);
  assert.deepEqual(s.m.get('packEntitlements/google-uid/packs/pack_bundle:all'), PACK);
  assert.ok(s.m.has('packEntitlements/google-uid/grants/pay_m'));
  assert.equal(s.m.has('packEntitlements/pay-src/packs/pack_bundle:all'), false);
  assert.equal(s.m.has('packEntitlements/pay-src/grants/pay_m'), false);
  assert.equal(s.m.get('payOrders/order_m').uid, 'google-uid');
  assert.equal(fa.users['google-uid'].phoneNumber, '+919611111555');
  assert.equal(fa.users['google-uid'].email, 'priya@gmail.com'); // the target keeps its original sign-in method
  assert.equal(fa.users['pay-src'].phoneNumber, undefined);
  assert.equal(fa.users['pay-src'].disabled, true);
  assert.deepEqual(fa.users['pay-src'].claims, { mergedInto: 'google-uid' });
  assert.ok(fa.users['pay-src']); // still exists
  const audit = s.m.get('adminMoves/merge-pay-src');
  assert.deepEqual(Object.keys(audit).sort(), ['adminUid', 'at', 'fromUid', 'reason', 'toUid']);
  assert.equal(/@|\+91/.test(JSON.stringify(audit)), false);
});

test('ADMIN-MERGE: replay is a no-op (no Firestore writes, no Auth changes)', async () => {
  const s = memStore(seed()); const fa = authFake(mergeUsers());
  const call = mergeHarness(s, fa);
  await call({ fromUid: 'pay-src', toEmail: 'priya@gmail.com' });
  const w = s.writes.length; const c = fa.calls.length;
  const [status, body] = await call({ fromUid: 'pay-src', toEmail: 'priya@gmail.com' });
  assert.equal(status, 200); assert.equal(body.merged, false); assert.equal(body.replayed, true);
  assert.equal(s.writes.length, w);
  assert.equal(fa.calls.filter((x) => x[0] === 'updateUser').length, c - 1); // only the claims call repeats; no updateUser
});

test('ADMIN-MERGE: refuses (409, nothing changed) when the target has a DIFFERENT phone', async () => {
  const s = memStore(seed()); const fa = authFake(mergeUsers({ 'google-uid': { uid: 'google-uid', email: 'priya@gmail.com', phoneNumber: '+919888888888' } }));
  const [status, body] = await mergeHarness(s, fa)({ fromUid: 'pay-src', toEmail: 'priya@gmail.com' });
  assert.equal(status, 409); assert.match(body.error, /different phone/);
  assert.deepEqual(s.writes, []); assert.deepEqual(fa.calls, []);
});

test('ADMIN-MERGE: refuses a real account (not pay-...) and a source with activity of its own', async () => {
  const a = memStore(seed()); const faA = authFake(mergeUsers({ real: { uid: 'real', phoneNumber: '+919000000000' } }));
  assert.equal((await mergeHarness(a, faA)({ fromUid: 'real', toEmail: 'priya@gmail.com' }))[0], 409);
  const b = memStore(seed({ 'topicMastery/pay-src': { x: 1 }, })); const faB = authFake(mergeUsers());
  const [st, body] = await mergeHarness(b, faB)({ fromUid: 'pay-src', toEmail: 'priya@gmail.com' });
  assert.equal(st, 409); assert.match(body.error, /activity of its own/);
  const c = memStore(seed({ 'learnerProfiles/pay-src/sessions/s1': { x: 1 } })); // a subcollection under a missing parent still counts
  assert.equal((await mergeHarness(c, authFake(mergeUsers()))({ fromUid: 'pay-src', toEmail: 'priya@gmail.com' }))[0], 409);
  assert.deepEqual(a.writes.concat(b.writes, c.writes), []); assert.deepEqual(faA.calls.concat(faB.calls), []);
});

test('ADMIN-MERGE: target already has the pack => 409, nothing changed; already merged elsewhere => 409', async () => {
  const s = memStore(seed({ 'packEntitlements/google-uid/packs/pack_bundle:all': { ...PACK, orderId: 'other' } })); const fa = authFake(mergeUsers());
  assert.equal((await mergeHarness(s, fa)({ fromUid: 'pay-src', toEmail: 'priya@gmail.com' }))[0], 409);
  assert.deepEqual(s.writes, []); assert.deepEqual(fa.calls, []);
  const t = memStore(seed({ 'adminMoves/merge-pay-src': { toUid: 'someone-else' } }));
  assert.equal((await mergeHarness(t, authFake(mergeUsers()))({ fromUid: 'pay-src', toEmail: 'priya@gmail.com' }))[0], 409);
});

test('ADMIN-MERGE: a Board Pass subscription and every order move; a failed phone set restores the source phone', async () => {
  const sub = { tier: 'premium', plan: 'pass_month', passType: 'month', passEnd: 5, pricePaidInr: 599, lastPaymentRef: 'pay_s' };
  const s = memStore(seed({ 'subscriptions/pay-src': sub, 'subscriptions/pay-src/payments/pay_s': { passType: 'month' }, 'payOrders/order_s': { uid: 'pay-src', passType: 'month', status: 'paid', paymentId: 'pay_s' } }));
  const fa = authFake(mergeUsers());
  assert.equal((await mergeHarness(s, fa)({ fromUid: 'pay-src', toEmail: 'priya@gmail.com' }))[0], 200);
  assert.deepEqual(s.m.get('subscriptions/google-uid'), sub);
  assert.ok(s.m.has('subscriptions/google-uid/payments/pay_s'));
  assert.equal(s.m.has('subscriptions/pay-src'), false);
  assert.equal(s.m.get('payOrders/order_s').uid, 'google-uid');
  // phone set fails on the target -> restored on the source, 500
  const s2 = memStore(seed()); const fa2 = authFake(mergeUsers()); const orig = fa2.auth;
  fa2.auth = () => { const a = orig(); const u = a.updateUser; a.updateUser = async (uid, p) => { if (uid === 'google-uid' && p.phoneNumber) throw new Error('boom'); return u(uid, p); }; return a; };
  assert.equal((await mergeHarness(s2, fa2)({ fromUid: 'pay-src', toEmail: 'priya@gmail.com' }))[0], 500);
  assert.equal(fa2.users['pay-src'].phoneNumber, '+919611111555');
});

test('RECEIPT-EMAIL-1 · a sent receipt shows its time; failed / sending / none shows nothing', async () => {
  const sentAt = new Date(NOW - 500);
  const orders = [
    paid('s', 'u1', 'pack_subject', 199, 1000, { packTarget: 'maths', receiptEmail: { status: 'sent', at: sentAt } }),
    paid('f', 'u2', 'pack_subject', 199, 2000, { packTarget: 'maths', receiptEmail: { status: 'failed', at: sentAt } }),
    paid('n', 'u3', 'pack_subject', 199, 3000, { packTarget: 'maths' }),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  const by = Object.fromEntries(res.body.items.map((i) => [i.orderId, i]));
  assert.equal(by.s.receiptEmailedAtMs, sentAt.getTime());
  assert.equal('receiptEmailedAtMs' in by.f, false);
  assert.equal('receiptEmailedAtMs' in by.n, false);
});

// ── WHATSAPP-OPTIN-1: abandoned rows carry the WhatsApp opt-in (masked + the full number for the card's Reveal); sample opt-ins list ──
// MUTATIONS: M1 waOptInOf returns the stored object as-is (raw consent text, unvalidated) -> the shape test goes red;
//            M2 the sample read ignores the 30-day window -> "sample opt-ins: last 30 days" red;
//            M3 requireAdmin moved after the read -> the 403 test goes red.
test('WHATSAPP-OPTIN-1 abandoned: a guest (self) order and a student order show waOptIn masked + full; rows without one, or with a malformed one, show none', async () => {
  const HOUR = 3600000;
  const wa = { phone: '+919876543948', consentText: 'Send me updates on WhatsApp', consentVersion: 'wa-optin-v1', consentAt: NOW - 2 * HOUR, source: 'checkout' };
  const orders = [
    created('selfwa', null, 'pack_mock', 99, 2 * HOUR, { payer: 'guest', checkoutWho: true, selfPay: true, waOptIn: wa }),
    created('stuwa', 'u1', 'till_boards', 1917, 3 * HOUR, { waOptIn: { ...wa, phone: '+917012345678' } }),
    created('none', 'u2', 'till_boards', 1917, 4 * HOUR),
    created('bad', 'u3', 'till_boards', 1917, 5 * HOUR, { waOptIn: { phone: '12345', source: 'checkout' } }),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 200);
  const by = Object.fromEntries(res.body.abandoned.items.map((i) => [i.orderId, i]));
  assert.deepEqual(by.selfwa.waOptIn, { phoneMasked: '+91 98•••••948', phone: '+919876543948', consentAtMs: NOW - 2 * HOUR, source: 'checkout' });
  assert.deepEqual(by.stuwa.waOptIn, { phoneMasked: '+91 70•••••678', phone: '+917012345678', consentAtMs: NOW - 2 * HOUR, source: 'checkout' });
  assert.equal(by.none.waOptIn, undefined);
  assert.equal(by.bad.waOptIn, undefined);
  assert.equal(JSON.stringify(res.body).includes('Send me updates'), false, 'consent text stays in the store');
  assert.deepEqual(by.selfwa.recipient, {}, 'the claim contact stays masked / absent as before');
});

test('WHATSAPP-OPTIN-1 sample opt-ins: last 30 days, newest first, masked + full, malformed rows skipped; none -> empty list', async () => {
  const DAYS = 86400000;
  const waOptIns = [
    { id: 'h1', data: { phone: '+919876543948', packIds: ['pack_cbq:maths', 'pack_mock:science'], lastAt: NOW - 2 * DAYS, firstAt: NOW - 5 * DAYS, source: 'sample' } },
    { id: 'h2', data: { phone: '+917012345678', packIds: ['pack_bundle:all'], lastAt: NOW - 1 * DAYS, firstAt: NOW - 1 * DAYS, source: 'sample' } },
    { id: 'old', data: { phone: '+918012345678', packIds: [], lastAt: NOW - 40 * DAYS, firstAt: NOW - 40 * DAYS } },
    { id: 'junk', data: { phone: '123', packIds: [], lastAt: NOW - DAYS } },
  ];
  const { route } = harness({ waOptIns });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.waSampleOptIns.items.map((i) => i.phoneMasked), ['+91 70•••••678', '+91 98•••••948']);
  assert.deepEqual(res.body.waSampleOptIns.items[1], { phoneMasked: '+91 98•••••948', phone: '+919876543948', packIds: ['pack_cbq:maths', 'pack_mock:science'], lastAtMs: NOW - 2 * DAYS, firstAtMs: NOW - 5 * DAYS });
  assert.equal(res.body.waSampleOptIns.truncated, false);
  const empty = harness();
  const r2 = {}; await empty.route.list({}, r2);
  assert.deepEqual(r2.body.waSampleOptIns, { items: [], truncated: false });
});

test('WHATSAPP-OPTIN-1: the admin gate refuses (403) before the opt-in reads too; a failed opt-in read leaves the rest intact (null)', async () => {
  const { route, fs } = harness({ ok: false, waOptIns: [{ id: 'x', data: { phone: '+919876543948', lastAt: NOW, packIds: [] } }] });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 403);
  assert.equal(fs.reads, 0);
  assert.equal(res.body.waSampleOptIns, undefined);
  const base = fakeFirestore([paid('o1', 'u1', 'month', 599, 1000)]);
  const fs2 = { collection: (n) => (n === 'waOptIns' ? { where() { throw new Error('down'); } } : base.collection(n)) };
  const route2 = createAdminPurchasesRoutes({
    sendJson: (r, s, b) => { r.status = s; r.body = b; }, adminFirestore: fs2, firebaseAdmin: fakeAuth, now: () => NOW,
    requireAdmin: async () => ({ ok: true, uid: 'admin1' }),
  });
  const r2 = {}; await route2.list({}, r2);
  assert.equal(r2.status, 200);
  assert.equal(r2.body.waSampleOptIns, null);
  assert.equal(r2.body.items.length, 1);
});

// Superseded 13 Nov 2026 (owner): this test used to assert a paid row NEVER carries the number. The owner now needs it on paid orders
// (a WhatsApp thank-you later); the admin-gated route, masked + Reveal pattern and "a paid order is not an abandoned row" stay.
test('WHATSAPP-OPTIN-1 review: a paid order is still not an abandoned row, even with an opt-in', async () => {
  const orders = [paid('p1', 'u1', 'till_boards', 1917, 1000, { waOptIn: { phone: '+919876543948', consentText: 'x', consentVersion: 'wa-optin-v1', consentAt: NOW, source: 'checkout' } })];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 1);
  assert.deepEqual(res.body.abandoned.items, [], 'a paid order is not an abandoned row either');
});

test('WHATSAPP-OPTIN-1 paid: a paid order with a stored opt-in returns it (masked + full); without one, or a malformed one, none; consent text stays in the store', async () => {
  const HOUR = 3600000;
  const wa = { phone: '+919876543948', consentText: 'Send me updates on WhatsApp', consentVersion: 'wa-optin-v1', consentAt: NOW - 2 * HOUR, source: 'checkout' };
  const orders = [
    paid('pwa', 'u1', 'till_boards', 1917, 3 * HOUR, { waOptIn: wa }),
    paid('pno', 'u2', 'till_boards', 1917, 4 * HOUR),
    paid('pbad', 'u3', 'till_boards', 1917, 5 * HOUR, { waOptIn: { phone: '12345', source: 'checkout' } }),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  assert.equal(res.status, 200);
  const by = Object.fromEntries(res.body.items.map((i) => [i.orderId, i]));
  assert.deepEqual(by.pwa.waOptIn, { phoneMasked: '+91 98•••••948', phone: '+919876543948', consentAtMs: NOW - 2 * HOUR, source: 'checkout' });
  assert.equal('waOptIn' in by.pno, false);
  assert.equal('waOptIn' in by.pbad, false);
  assert.equal(JSON.stringify(res.body).includes('Send me updates'), false);
});

// ── ORDER-SOURCE-1: the stored visit source is returned on purchase + abandoned rows (re-sanitised; none -> no key) ──
test('ORDER-SOURCE-1: source is on paid and abandoned rows; a click-id value never leaves; an order without one has no key', async () => {
  const src = { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'PDF_Packs', landing: '/packs', gclid: true };
  const orders = [
    paid('p1', 'u1', 'month', 599, 1000, { source: { ...src, gclid: 'LEAKED-VALUE', extra: 'x' } }),
    paid('p2', 'u2', 'month', 599, 2000),
    created('c1', 'u3', 'month', 599, 31 * MIN, { source: { ref: 'youtube.com' } }),
    created('c2', null, 'pack_cbq', 99, 40 * MIN, { payer: 'guest', guestPhone: '+919876543948', source: src }),
    created('c3', 'u5', 'month', 599, 50 * MIN),
  ];
  const { route } = harness({ orders });
  const res = {}; await route.list({}, res);
  const byId = (rows) => Object.fromEntries(rows.map((r) => [r.orderId, r]));
  const items = byId(res.body.items);
  assert.deepEqual(items.p1.source, { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'PDF_Packs', landing: '/packs' });
  assert.equal('source' in items.p2, false);
  const ab = byId(res.body.abandoned.items);
  assert.deepEqual(ab.c1.source, { ref: 'youtube.com' });
  assert.deepEqual(ab.c2.source, src);
  assert.equal('source' in ab.c3, false);
  assert.equal(JSON.stringify(res.body).includes('LEAKED-VALUE'), false);
});
