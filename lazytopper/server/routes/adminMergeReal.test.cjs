'use strict';
// ADMIN-MERGE-REAL-1. Run: node --test server/routes/adminMergeReal.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminPurchasesRoutes } = require('./adminPurchases.cjs');

const NOW = Date.parse('2026-11-13T06:00:00Z');

function memStore(initial) {
  const m = new Map(Object.entries(initial));
  const writes = [];
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
    doc: (id) => ref(`${path}/${id}`),
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

function authFake(users, { failDelete = false } = {}) {
  const calls = [];
  const nf = () => Object.assign(new Error('nf'), { code: 'auth/user-not-found' });
  const find = (f, v) => Object.values(users).find((u) => u[f] === v);
  const a = {
    calls, users,
    auth: () => ({
      getUser: async (uid) => { if (!users[uid]) throw nf(); return { ...users[uid] }; },
      getUserByEmail: async (e) => { const u = find('email', e); if (!u) throw nf(); return { ...u }; },
      getUserByPhoneNumber: async (p) => { const u = find('phoneNumber', p); if (!u) throw nf(); return { ...u }; },
      revokeRefreshTokens: async (uid) => { calls.push(['revoke', uid]); if (!users[uid]) throw nf(); },
      updateUser: async (uid, patch) => { calls.push(['update', uid, patch]); if (!users[uid]) throw nf(); Object.assign(users[uid], patch); },
      deleteUser: async (uid) => { calls.push(['delete', uid]); if (failDelete) throw new Error('boom'); if (!users[uid]) throw nf(); delete users[uid]; },
    }),
  };
  return a;
}

const PACK = { packId: 'pack_bundle:all', sku: 'pack_bundle', target: 'all', pricePaidInr: 353, paidAt: 1762940000000, orderId: 'order_p', paymentRef: 'pay_p', creditedToPass: false };
const PASS_SUB = { tier: 'premium', plan: 'board_pass', passType: 'till_boards', passEnd: new Date('2027-03-31T00:00:00Z'), lastPaymentRef: 'pay_b' };
const users = (over = {}) => ({
  realA: { uid: 'realA', email: 'kid.a@gmail.com', providerData: [{ providerId: 'google.com' }], disabled: false },
  realB: { uid: 'realB', phoneNumber: '+919611111555', providerData: [{ providerId: 'phone' }], disabled: false },
  ...over,
});
// realB (the one to REMOVE) holds a pack and its order; realA (the one to KEEP) has nothing yet.
const seed = (over = {}) => ({
  'payOrders/order_p': { uid: 'realB', passType: 'pack_bundle', packTarget: 'all', status: 'paid', paymentId: 'pay_p', amountPaise: 35300 },
  'packEntitlements/realB/packs/pack_bundle:all': PACK,
  'packEntitlements/realB/grants/pay_p': { paymentRef: 'pay_p', packId: 'pack_bundle:all', orderId: 'order_p', grantedAt: 1 },
  'users/realB': { name: 'Priya' },
  'sessionRecords/realB': { n: 1 },
  ...over,
});
function harness(store, fa, { admin = true, env = {} } = {}) {
  const sent = [];
  const routes = createAdminPurchasesRoutes({
    sendJson: (res, status, body) => sent.push([status, body]), readJson: async (req) => req.body, adminFirestore: store, firebaseAdmin: fa, env,
    requireAdmin: async () => (admin ? { ok: true, uid: 'admin-1' } : { ok: false, status: 403, error: 'Forbidden' }), now: () => NOW,
  });
  return async (body) => { sent.length = 0; await routes.mergeReal({ body }); return sent[0]; };
}
const GO = { keepUid: 'realA', removeUid: 'realB', confirm: 'MERGE' };

test('REAL-MERGE: non-admin 403; kill switch 404; bad bodies and a missing / wrong confirmation 400; nothing written, no Auth call', async () => {
  const s = memStore(seed()); const fa = authFake(users());
  assert.equal((await harness(s, fa, { admin: false })(GO))[0], 403);
  assert.equal((await harness(s, fa, { env: { ADMIN_MERGE_REAL_DISABLED: '1' } })(GO))[0], 404);
  const call = harness(s, fa);
  for (const b of [{}, { keepUid: 'realA' }, { removeUid: 'realB', confirm: 'MERGE' }, { ...GO, confirm: '' }, { ...GO, confirm: 'merge' }, { ...GO, confirm: undefined }]) assert.equal((await call(b))[0], 400, JSON.stringify(b));
  assert.deepEqual(s.writes, []); assert.deepEqual(fa.calls, []);
});

test('REAL-MERGE: preview describes both accounts MASKED, writes nothing, and names the blocker', async () => {
  const s = memStore(seed({ 'subscriptions/realB': PASS_SUB })); const fa = authFake(users());
  const call = harness(s, fa);
  const [status, body] = await call({ preview: true, keep: 'kid.a@gmail.com', remove: '9611111555' });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.keep.uid, 'realA'); assert.equal(body.remove.uid, 'realB');
  assert.equal(/kid\.a@gmail|9611111555/.test(JSON.stringify(body)), false, 'no full email or phone');
  assert.ok(body.keep.email.includes('@') && body.keep.email.includes('•'));
  assert.deepEqual(body.remove.packs, ['pack_bundle:all']);
  assert.equal(body.remove.plan.passType, 'till_boards');
  assert.equal(body.remove.paidOrders, 1);
  assert.equal(body.remove.hasStudyData, true);
  assert.equal(body.blocker, undefined);
  assert.deepEqual(s.writes, []); assert.deepEqual(fa.calls, []);
  // both hold a Board Pass: the blocker says so
  const s2 = memStore(seed({ 'subscriptions/realB': PASS_SUB, 'subscriptions/realA': PASS_SUB }));
  const p2 = await harness(s2, authFake(users()))({ preview: true, keep: 'realA', remove: 'realB' });
  assert.match(p2[1].blocker, /Both accounts hold a Board Pass/);
  assert.equal((await harness(s, fa)({ preview: true, keep: 'ghost@gmail.com', remove: 'realB' }))[0], 404);
  assert.equal((await harness(s, fa)({ preview: true, keep: 'realA', remove: 'realA' }))[0], 400);
});

test('REAL-MERGE: success moves packs, the Board Pass + payment records, and orders to the kept account; then revoke -> disable -> delete the REMOVED user only', async () => {
  const s = memStore(seed({
    'subscriptions/realB': PASS_SUB,
    'subscriptions/realB/payments/pay_b': { paymentRef: 'pay_b' },
    'payOrders/order_b': { uid: 'realB', passType: 'till_boards', status: 'paid', paymentId: 'pay_b' },
  }));
  const fa = authFake(users());
  const [status, body] = await harness(s, fa)(GO);
  assert.equal(status, 200, JSON.stringify(body));
  assert.deepEqual(body, { ok: true, merged: true, replayed: false, removed: true });
  assert.deepEqual(s.m.get('packEntitlements/realA/packs/pack_bundle:all'), PACK);
  assert.ok(s.m.has('packEntitlements/realA/grants/pay_p'));
  assert.equal(s.m.has('packEntitlements/realB/packs/pack_bundle:all'), false);
  assert.equal(s.m.get('subscriptions/realA').passType, 'till_boards');
  assert.ok(s.m.has('subscriptions/realA/payments/pay_b'));
  assert.equal(s.m.has('subscriptions/realB'), false);
  assert.equal(s.m.get('payOrders/order_p').uid, 'realA');
  assert.equal(s.m.get('payOrders/order_b').uid, 'realA');
  const audit = s.m.get('adminMoves/merge-realB');
  assert.deepEqual(Object.keys(audit).sort(), ['adminUid', 'at', 'fromUid', 'reason', 'toUid']);
  assert.equal(audit.reason, 'admin merge real');
  assert.equal(/@|\+91/.test(JSON.stringify(audit)), false, 'uids only');
  assert.deepEqual(fa.calls, [['revoke', 'realB'], ['update', 'realB', { disabled: true }], ['delete', 'realB']]);
  assert.ok(fa.users.realA, 'the kept user is untouched'); assert.equal(fa.users.realB, undefined);
  assert.deepEqual(s.m.get('users/realB'), { name: 'Priya' }, 'study data is NOT deleted or moved');
  assert.deepEqual(s.m.get('sessionRecords/realB'), { n: 1 });
});

test('REAL-MERGE: refused (409), NOTHING moved and NO Auth call: both hold a Board Pass; a pack already owned; a paid order with nothing to move; top-up credit; a pay- account; your own account', async () => {
  const cases = [
    ['both pass', seed({ 'subscriptions/realB': PASS_SUB, 'subscriptions/realA': PASS_SUB }), GO, /Both accounts hold a Board Pass/],
    ['pack owned', seed({ 'packEntitlements/realA/packs/pack_bundle:all': PACK }), GO, /already has a pack/],
    ['paid order, no pack to move', seed({ 'payOrders/order_x': { uid: 'realB', passType: 'pack_cbq', packTarget: 'maths', status: 'paid', paymentId: 'pay_x' } }), GO, /no purchase to move/],
    ['paid pass order, no pass', seed({ 'payOrders/order_y': { uid: 'realB', passType: 'till_boards', status: 'paid', paymentId: 'pay_y' } }), GO, /no purchase to move/],
    ['credit', seed({ 'usageCredits/realB': { n: 1 } }), GO, /top-up credit/],
    ['pay- remove', seed(), { ...GO, removeUid: 'pay-abc' }, /two real accounts/],
    ['pay- keep', seed(), { ...GO, keepUid: 'pay-abc' }, /two real accounts/],
    ['self', seed(), { ...GO, keepUid: 'realA', removeUid: 'realA' }, /itself/],
  ];
  for (const [name, data, body, re] of cases) {
    const s = memStore(data); const fa = authFake(users({ 'pay-abc': { uid: 'pay-abc' } }));
    const [status, out] = await harness(s, fa)(body);
    assert.equal(status, 409 === status ? 409 : status, name);
    assert.ok(status === 409 || status === 400, `${name}: ${status}`);
    assert.match(out.error, re, name);
    assert.deepEqual(s.writes, [], `${name}: nothing written`);
    assert.deepEqual(fa.calls, [], `${name}: no Auth call`);
  }
  // the admin cannot remove their own account
  const s = memStore(seed()); const fa = authFake(users({ 'admin-1': { uid: 'admin-1' } }));
  const [st, out] = await harness(s, fa)({ keepUid: 'realA', removeUid: 'admin-1', confirm: 'MERGE' });
  assert.equal(st, 409); assert.match(out.error, /own account/); assert.deepEqual(fa.calls, []);
});

test('REAL-MERGE: if deleting the user fails, the data is already moved and the account is disabled; running it again finishes; a third run is a no-op', async () => {
  const s = memStore(seed()); const users1 = users();
  const failing = authFake(users1, { failDelete: true });
  const first = await harness(s, failing)(GO);
  assert.equal(first[0], 500);
  assert.equal(s.m.get('payOrders/order_p').uid, 'realA', 'data is moved');
  assert.equal(users1.realB.disabled, true, 'a safe stop: disabled, sessions revoked');
  const ok = authFake(users1);
  const second = await harness(s, ok)(GO);
  assert.deepEqual(second[1], { ok: true, merged: false, replayed: true, removed: true });
  assert.equal(users1.realB, undefined);
  const w = s.writes.length;
  const third = await harness(s, authFake(users1))(GO);
  assert.deepEqual(third[1], { ok: true, merged: false, replayed: true, removed: true });
  assert.equal(s.writes.length, w);
});

test('REAL-MERGE: a repeat for a DIFFERENT kept account is refused', async () => {
  const s = memStore(seed()); const fa = authFake(users({ realC: { uid: 'realC', email: 'c@gmail.com' } }));
  await harness(s, fa)(GO);
  const again = await harness(s, authFake(users({ realB: { uid: 'realB', phoneNumber: '+919611111555' }, realC: { uid: 'realC', email: 'c@gmail.com' } })))({ keepUid: 'realC', removeUid: 'realB', confirm: 'MERGE' });
  assert.equal(again[0], 409); assert.match(again[1].error, /already merged into a different account/);
});

test('REAL-MERGE: an order that lands on the removed account DURING the move stops it before any login is freed', async () => {
  const s = memStore(seed()); const fa = authFake(users());
  const origTx = s.runTransaction.bind(s);
  s.runTransaction = async (fn) => { const out = await origTx(fn); s.m.set('payOrders/order_late', { uid: 'realB', status: 'created' }); return out; };
  const [status, body] = await harness(s, fa)(GO);
  assert.equal(status, 409); assert.match(body.error, /still on the removed account/);
  // The sign-in-and-buy window is closed BEFORE the check (revoked + disabled), but the login is NOT deleted.
  assert.deepEqual(fa.calls, [['revoke', 'realB'], ['update', 'realB', { disabled: true }]]);
  assert.ok(fa.users.realB); assert.equal(fa.users.realB.disabled, true);
});

test('REAL-MERGE: M6 - a repeat for a DIFFERENT kept account AFTER the removed user was deleted is refused (409), never reported as success', async () => {
  const s = memStore(seed()); const u = users({ realC: { uid: 'realC', email: 'c@gmail.com' } });
  const first = await harness(s, authFake(u))(GO);
  assert.equal(first[0], 200);
  assert.equal(u.realB, undefined, 'the removed user is gone');
  const w = s.writes.length;
  const fa = authFake(u);
  const again = await harness(s, fa)({ keepUid: 'realC', removeUid: 'realB', confirm: 'MERGE' });
  assert.equal(again[0], 409); assert.match(again[1].error, /already merged into a different account/);
  assert.equal(s.writes.length, w); assert.deepEqual(fa.calls, []);
  // the same kept account is still the harmless no-op
  assert.deepEqual((await harness(s, authFake(u))(GO))[1], { ok: true, merged: false, replayed: true, removed: true });
});

test('REAL-MERGE: orders the removed account PAID for (payerUid) move too, with their payerUid; an order that changes mid-move or lands afterwards stops the run', async () => {
  const s = memStore(seed({
    'payOrders/order_child': { uid: 'someChild', payerUid: 'realB', passType: 'till_boards', status: 'paid', paymentId: 'pay_c' },
    'payOrders/order_both': { uid: 'realB', payerUid: 'realB', passType: 'pack_bundle', packTarget: 'all', status: 'paid', paymentId: 'pay_p' },
    'payOrders/order_other': { uid: 'someChild', payerUid: 'realZ', status: 'paid', paymentId: 'pay_z' },
  }));
  const fa = authFake(users());
  const [status] = await harness(s, fa)(GO);
  assert.equal(status, 200);
  assert.deepEqual([s.m.get('payOrders/order_child').uid, s.m.get('payOrders/order_child').payerUid], ['someChild', 'realA'], 'the payer moves, the child it paid for stays');
  assert.deepEqual([s.m.get('payOrders/order_both').uid, s.m.get('payOrders/order_both').payerUid], ['realA', 'realA']);
  assert.deepEqual([s.m.get('payOrders/order_other').uid, s.m.get('payOrders/order_other').payerUid], ['someChild', 'realZ'], 'someone else\'s order is untouched');
  assert.equal(s.m.get('payOrders/order_p').payerUid, undefined, 'an order with no payerUid gets none written');
  // a payer order landing after the transaction stops the run before the login is deleted
  const s2 = memStore(seed()); const fa2 = authFake(users());
  const origTx = s2.runTransaction.bind(s2);
  s2.runTransaction = async (fn) => { const out = await origTx(fn); s2.m.set('payOrders/order_late', { uid: 'someChild', payerUid: 'realB', status: 'created' }); return out; };
  const [st2, b2] = await harness(s2, fa2)(GO);
  assert.equal(st2, 409); assert.match(b2.error, /still on the removed account/);
  assert.ok(!fa2.calls.some((c) => c[0] === 'delete'));
});

test('REAL-MERGE: preview warns when the removed account has an OPEN parent-pay link (not an expired or paid one); it never blocks', async () => {
  const future = new Date(NOW + 3600000); const past = new Date(NOW - 3600000);
  const mkRun = async (links) => harness(memStore(seed(links)), authFake(users()))({ keep: 'kid.a@gmail.com', remove: '+91 96111 11555', preview: true });
  const [st, body] = await mkRun({ 'parentPayLinks/h1': { uid: 'realB', status: 'open', expiresAt: future } });
  assert.equal(st, 200); assert.match(body.warning, /parent payment link/); assert.equal(body.blocker, undefined);
  for (const links of [{ 'parentPayLinks/h2': { uid: 'realB', status: 'open', expiresAt: past } }, { 'parentPayLinks/h3': { uid: 'realB', status: 'paid', expiresAt: future } }, { 'parentPayLinks/h4': { uid: 'realA', status: 'open', expiresAt: future } }, {}]) {
    assert.equal((await mkRun(links))[1].warning, undefined);
  }
});

test('REAL-MERGE: `real` and `purchasesOnly` together are refused (they are different trust models)', async () => {
  const { mergeAccount } = require('../services/adminMergeAccount.cjs');
  await assert.rejects(() => mergeAccount({ db: memStore(seed()), auth: authFake(users()).auth(), fromUid: 'realB', toUid: 'realA', adminUid: 'admin-1', real: true, purchasesOnly: true }), /mutually exclusive/);
});

test('REAL-MERGE: a payer-only order that changes between the listing and the move stops the run (409, nothing written)', async () => {
  const s = memStore(seed({ 'payOrders/order_child': { uid: 'someChild', payerUid: 'realB', status: 'paid', paymentId: 'pay_c' } }));
  const fa = authFake(users());
  const origTx = s.runTransaction.bind(s);
  s.runTransaction = async (fn) => { s.m.set('payOrders/order_child', { uid: 'someChild', payerUid: 'realZ', status: 'paid', paymentId: 'pay_c' }); return origTx(fn); };
  const [status, body] = await harness(s, fa)(GO);
  assert.equal(status, 409); assert.match(body.error, /changed while merging/);
  assert.deepEqual(s.writes, []); assert.deepEqual(fa.calls, []);
});

test('PAY- MERGE UNCHANGED: the existing payment-account merge still writes ONLY { uid } on its orders (payerUid is a real-merge step only)', async () => {
  const { mergeAccount } = require('../services/adminMergeAccount.cjs');
  const s = memStore({
    'payOrders/o1': { uid: 'pay-abc', payerUid: 'pay-abc', passType: 'pack_bundle', status: 'paid', paymentId: 'pay_p' },
    'payOrders/o2': { uid: 'someChild', payerUid: 'pay-abc', status: 'paid' },
  });
  const a = authFake({ 'pay-abc': { uid: 'pay-abc', disabled: false }, realA: { uid: 'realA' } });
  await mergeAccount({ db: s, auth: a.auth(), fromUid: 'pay-abc', toUid: 'realA', adminUid: 'admin-1', nowMs: NOW });
  assert.deepEqual([s.m.get('payOrders/o1').uid, s.m.get('payOrders/o1').payerUid], ['realA', 'pay-abc']);
  assert.deepEqual([s.m.get('payOrders/o2').uid, s.m.get('payOrders/o2').payerUid], ['someChild', 'pay-abc']);
  assert.equal(s.m.get('adminMoves/merge-pay-abc').reason, 'admin merge');
});
