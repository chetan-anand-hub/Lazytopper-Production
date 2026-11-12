'use strict';
/**
 * SIGNED-IN-MOVE-1 - behavioural tests for POST /api/pay/move-to-other (routes/moveToOther.cjs) on an in-memory Firestore.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { fakeDb } = require('../services/moveToOther.fakeDb.cjs');
const { createMoveToOtherRoutes } = require('./moveToOther.cjs');
const { buildReceiptEmail } = require('../services/paymentReceiptEmail.cjs');

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-11-12T15:00:00+05:30');
const FUTURE = new Date(NOW + 200 * HOUR);

function seedPack(over = {}) {
  return {
    'payOrders/o1': { uid: 'buyer', passType: 'pack_cbq', packTarget: 'maths', status: 'paid', paymentId: 'pay_1', paidAt: new Date(NOW - 2 * HOUR), ...over },
    'packEntitlements/buyer/packs/pack_cbq:maths': { orderId: 'o1' },
    'packEntitlements/buyer/grants/pay_1': { orderId: 'o1' },
  };
}
function seedPass(extra = {}) {
  return {
    'payOrders/o2': { uid: 'buyer', passType: 'till_boards', status: 'paid', paymentId: 'pay_2', paidAt: new Date(NOW - 2 * HOUR) },
    'subscriptions/buyer': { tier: 'premium', plan: 'pass_till_boards', passType: 'till_boards', passStart: new Date(NOW - HOUR), passEnd: FUTURE, pricePaidInr: 999, offerKey: 'x', foundingMember: false, lastPaymentRef: 'pay_2' },
    'subscriptions/buyer/payments/pay_2': { orderId: 'o2' },
    ...extra,
  };
}

function harness({ seed, env = {}, uid = 'buyer', finder, now = NOW } = {}) {
  const db = fakeDb(seed);
  const created = [];
  const counters = [];
  const receipts = [];
  const logs = [];
  const routes = createMoveToOtherRoutes({
    sendJson: (res, status, body) => { res.status = status; res.body = body; logs.push(JSON.stringify(body)); },
    verifiedCaller: { resolveVerifiedUid: async () => uid },
    adminFirestore: db,
    telemetry: { increment: (e) => counters.push(e) },
    env,
    now: () => now,
    receiptEmailer: { sendForPayment: async (a) => { receipts.push(a); } },
    findOrCreateAccount: finder || (async (orderId, input) => { created.push({ orderId, input }); return { uid: 'child', created: true }; }),
  });
  async function post(body, { auth = true, raw } = {}) {
    const req = Readable.from([Buffer.from(raw !== undefined ? raw : JSON.stringify(body))]);
    req.headers = auth ? { authorization: 'Bearer t' } : {};
    const res = {};
    await routes.handleMoveToOther(req, res);
    return res;
  }
  return { db, post, created, counters, receipts, routes, logs };
}

test('PACK by phone: 200, masked target, account made for exactly that phone, order moved, receipt re-sent', async () => {
  const h = harness({ seed: seedPack() });
  const res = await h.post({ orderId: 'o1', phone: '98765 43210' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true, moved: true, kind: 'pack', to: { kind: 'phone', masked: res.body.to.masked } });
  assert.equal(res.body.to.masked, '+91 98•••••210');
  assert.ok(!JSON.stringify(res.body).includes('9876543210'));
  assert.equal(h.created.length, 1);
  assert.equal(h.created[0].input.phone, '+919876543210');
  assert.equal(h.db.read('payOrders/o1').uid, 'child');
  assert.ok(h.db.read('packEntitlements/child/packs/pack_cbq:maths'));
  assert.equal(h.receipts.length, 1);
  assert.equal(h.receipts[0].orderId, 'o1');
});

test('PASS by email: 200 with a masked email only', async () => {
  const h = harness({ seed: seedPass() });
  const res = await h.post({ orderId: 'o2', email: 'Kid.Name@Example.com' });
  assert.equal(res.status, 200);
  assert.equal(res.body.kind, 'pass');
  assert.equal(res.body.to.kind, 'email');
  assert.ok(!res.body.to.masked.includes('Kid.Name') && !res.body.to.masked.includes('kid.name@'));
  assert.equal(h.created[0].input.email, 'kid.name@example.com');
  assert.equal(h.db.read('subscriptions/child').passType, 'till_boards');
});

test('KILL SWITCH: PAY_MOVE_TO_OTHER_DISABLED=1 answers 404 and moves nothing, creates nothing', async () => {
  const h = harness({ seed: seedPack(), env: { PAY_MOVE_TO_OTHER_DISABLED: '1' } });
  const res = await h.post({ orderId: 'o1', phone: '9876543210' });
  assert.equal(res.status, 404);
  assert.equal(h.created.length, 0);
  assert.equal(h.db.read('payOrders/o1').uid, 'buyer');
  assert.equal(h.routes.isEnabled(), false);
});

test('AUTH: no token -> 401; a token that does not verify -> 401; nothing moves', async () => {
  const h = harness({ seed: seedPack() });
  assert.equal((await h.post({ orderId: 'o1', phone: '9876543210' }, { auth: false })).status, 401);
  const h2 = harness({ seed: seedPack(), uid: '' });
  assert.equal((await h2.post({ orderId: 'o1', phone: '9876543210' })).status, 401);
  assert.equal(h2.db.read('payOrders/o1').uid, 'buyer');
  assert.equal(h2.created.length, 0);
});

test('INPUT: malformed order id, both / neither contact, invalid phone or email -> 400 and no account made', async () => {
  const h = harness({ seed: seedPack() });
  const cases = [
    [{ orderId: '../x', phone: '9876543210' }, 'malformed'],
    [{ orderId: 'o1' }, 'one_contact'],
    [{ orderId: 'o1', phone: '9876543210', email: 'a@b.co' }, 'one_contact'],
    [{ orderId: 'o1', phone: '12345' }, 'invalid_contact'],
    [{ orderId: 'o1', email: 'not-an-email' }, 'invalid_contact'],
  ];
  for (const [body, reason] of cases) {
    const res = await h.post(body);
    assert.equal(res.status, 400);
    assert.equal(res.body.reason, reason);
  }
  assert.equal((await h.post(null, { raw: 'not json' })).status, 400);
  assert.equal(h.created.length, 0);
});

test('RATE LIMIT: the 11th attempt in an hour is 429', async () => {
  const h = harness({ seed: seedPack({ status: 'created' }) });
  let last;
  for (let i = 0; i < 11; i += 1) last = await h.post({ orderId: 'o1', phone: '9876543210' });
  assert.equal(last.status, 429);
});

/* A refusal BEFORE the target is touched: no account is made for the typed contact. */
test('REFUSALS leave NO stray account: not yours, unpaid, >24 h, moved before, used pass, unsupported', async () => {
  const cases = [
    [harness({ seed: seedPack(), uid: 'stranger' }), 'o1', 'not_yours', 403],
    [harness({ seed: seedPack({ status: 'created' }) }), 'o1', 'not_paid', 409],
    [harness({ seed: seedPack({ paidAt: new Date(NOW - 25 * HOUR) }) }), 'o1', 'too_late', 409],
    [harness({ seed: seedPack({ movedToOtherAt: new Date(NOW - HOUR) }) }), 'o1', 'moved_before', 409],
    [harness({ seed: seedPack({ payer: 'guest' }) }), 'o1', 'unsupported', 409],
    [harness({ seed: seedPass({ [`usageLedger/buyer/days/2026-11-12`]: { calls: 3 } }) }), 'o2', 'used', 409],
  ];
  for (const [h, orderId, reason, status] of cases) {
    const res = await h.post({ orderId, phone: '9876543210' });
    assert.equal(res.status, status, reason);
    assert.equal(res.body.error, 'move_refused');
    assert.equal(res.body.reason, reason);
    assert.ok(res.body.message && !/9876543210/.test(res.body.message));
    assert.equal(h.created.length, 0, `${reason}: no account may be made for a refused move`);
    assert.equal(h.receipts.length, 0);
  }
});

test('TARGET refusals: already has the pack / already has a pass / typed email on a real account', async () => {
  const hPack = harness({ seed: { ...seedPack(), 'packEntitlements/child/packs/pack_cbq:maths': { orderId: 'x' } } });
  const r1 = await hPack.post({ orderId: 'o1', phone: '9876543210' });
  assert.equal(r1.status, 409);
  assert.equal(r1.body.reason, 'target_has_pack');
  assert.equal(hPack.db.read('payOrders/o1').uid, 'buyer');

  const hPass = harness({ seed: { ...seedPass(), 'subscriptions/child': { passType: 'till_boards', passEnd: FUTURE } } });
  const r2 = await hPass.post({ orderId: 'o2', phone: '9876543210' });
  assert.equal(r2.body.reason, 'target_has_pass');
  assert.equal(hPass.db.read('subscriptions/buyer').passType, 'till_boards');

  const hUse = harness({ seed: seedPack(), finder: async () => ({ uid: null, reason: 'email_in_use' }) });
  const r3 = await hUse.post({ orderId: 'o1', email: 'a@b.co' });
  assert.equal(r3.body.reason, 'target_in_use');
  assert.equal(hUse.db.read('payOrders/o1').uid, 'buyer');
});

test('SELF: the target resolving to the caller is refused', async () => {
  const h = harness({ seed: seedPack(), finder: async () => ({ uid: 'buyer' }) });
  const res = await h.post({ orderId: 'o1', phone: '9876543210' });
  assert.equal(res.body.reason, 'self');
  assert.equal(h.db.read('payOrders/o1').uid, 'buyer');
});

test('DOUBLE TAP: the second identical request is refused (moved_before), never a second move', async () => {
  const h = harness({ seed: seedPack() });
  assert.equal((await h.post({ orderId: 'o1', phone: '9876543210' })).status, 200);
  const again = await h.post({ orderId: 'o1', phone: '9876543210' });
  assert.equal(again.status, 409);
  assert.equal(again.body.reason, 'moved_before');
  assert.equal(h.db.keys('adminMoves/').length, 1);
});

test('PRIVACY: no response, log line or counter carries the phone, the email or a uid', async () => {
  const h = harness({ seed: seedPack() });
  await h.post({ orderId: 'o1', phone: '9876543210' });
  const h2 = harness({ seed: seedPack({ paidAt: new Date(NOW - 30 * HOUR) }) });
  await h2.post({ orderId: 'o1', email: 'secret.kid@example.com' });
  for (const text of [...h.logs, ...h.counters, ...h2.logs, ...h2.counters]) {
    assert.ok(!/9876543210|secret\.kid|child|buyer/.test(text), text);
  }
  for (const k of h.db.keys('adminMoves/')) {
    const a = JSON.stringify(h.db.read(k));
    assert.ok(!/9876543210|@/.test(a));
  }
});

test('RECEIPT: a moved order never names the old account; it says it was moved to the account chosen', () => {
  const base = { passType: 'pack_cbq', packTarget: 'maths', amountPaise: 29900, paymentId: 'pay_1', paidAtMs: NOW, appUrl: 'https://app.example' };
  const moved = buildReceiptEmail({ ...base, moved: true, signIns: ['+91 •••••••210'] });
  const text = JSON.stringify(moved);
  assert.ok(/moved to the account you chose/i.test(text), text.slice(0, 400));
  assert.ok(/210/.test(text), 'the new account\'s masked sign-in is named');
  const plain = JSON.stringify(buildReceiptEmail({ ...base }));
  assert.ok(!/moved to the account you chose/i.test(plain));
});
