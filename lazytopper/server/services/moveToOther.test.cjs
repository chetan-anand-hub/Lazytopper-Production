'use strict';
/**
 * SIGNED-IN-MOVE-1 - behavioural tests for services/moveToOther.cjs on an in-memory Firestore (real transactions, real reads).
 * Every guard has its own test; scripts/mutation notes in the PR show each one going red when the guard is removed.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { fakeDb } = require('./moveToOther.fakeDb.cjs');
const { moveOrderToOther, precheck, assertMovable, MoveRefusal, MOVE_WINDOW_MS } = require('./moveToOther.cjs');
const { istDayKey } = require('./rateLimiter.cjs');

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-11-12T15:00:00+05:30');
const FUTURE = new Date(NOW + 200 * 24 * HOUR);

function packSeed(over = {}) {
  return {
    'payOrders/o1': { uid: 'buyer', passType: 'pack_cbq', packTarget: 'maths', status: 'paid', paymentId: 'pay_1', paidAt: new Date(NOW - 2 * HOUR), amountPaise: 29900, ...over.order },
    'packEntitlements/buyer/packs/pack_cbq:maths': { orderId: 'o1', passType: 'pack_cbq', target: 'maths', ...over.pack },
    'packEntitlements/buyer/grants/pay_1': { orderId: 'o1' },
  };
}
function passSeed(over = {}) {
  return {
    'payOrders/o2': { uid: 'buyer', passType: 'till_boards', status: 'paid', paymentId: 'pay_2', paidAt: new Date(NOW - 2 * HOUR), amountPaise: 99900, ...over.order },
    'subscriptions/buyer': {
      tier: 'premium', plan: 'pass_till_boards', passType: 'till_boards', passStart: new Date(NOW - 2 * HOUR), passEnd: FUTURE,
      pricePaidInr: 999, offerKey: 'launch', foundingMember: true, lastPaymentRef: 'pay_2', trialStartDate: new Date(NOW - 20 * 24 * HOUR), ...over.sub,
    },
    'subscriptions/buyer/payments/pay_2': { amountPaise: 99900, orderId: 'o2' },
    ...(over.extra || {}),
  };
}
const refusal = (code) => (e) => e instanceof MoveRefusal && e.code === code;
const move = (db, o = {}) => moveOrderToOther({ db, orderId: 'o1', callerUid: 'buyer', toUid: 'child', nowMs: NOW, env: {}, ...o });

/* ── happy paths ───────────────────────────────────────────────────────── */
test('PACK: moves the entitlement + marker + order holder to the target, once, with a uid-only audit', async () => {
  const db = fakeDb(packSeed());
  const r = await move(db);
  assert.equal(r.moved, true);
  assert.equal(r.kind, 'pack');
  assert.equal(db.read('packEntitlements/buyer/packs/pack_cbq:maths'), undefined);
  assert.equal(db.read('packEntitlements/buyer/grants/pay_1'), undefined);
  assert.equal(db.read('packEntitlements/child/packs/pack_cbq:maths').orderId, 'o1');
  assert.ok(db.read('packEntitlements/child/grants/pay_1'));
  const order = db.read('payOrders/o1');
  assert.equal(order.uid, 'child');
  assert.equal(order.movedFromUid, 'buyer');
  assert.ok(order.movedToOtherAt instanceof Date);
  const audits = db.keys('adminMoves/').map((k) => db.read(k));
  assert.equal(audits.length, 1);
  assert.deepEqual(Object.keys(audits[0]).sort(), ['at', 'byUid', 'fromUid', 'orderId', 'reason', 'toUid']);
  assert.equal(audits[0].byUid, 'buyer');
  assert.equal(audits[0].reason, 'buyer move');
  assert.equal(audits[0].adminUid, undefined);
});

test('PASS: the whole pass (fields + payment record) moves to the target; the buyer is left with no pass', async () => {
  const db = fakeDb(passSeed());
  const r = await move(db, { orderId: 'o2' });
  assert.equal(r.kind, 'pass');
  const to = db.read('subscriptions/child');
  assert.equal(to.tier, 'premium');
  assert.equal(to.plan, 'pass_till_boards');
  assert.equal(to.passType, 'till_boards');
  assert.equal(to.lastPaymentRef, 'pay_2');
  assert.equal(to.foundingMember, true);
  assert.deepEqual(to.passEnd, FUTURE);
  assert.ok(db.read('subscriptions/child/payments/pay_2'));
  const from = db.read('subscriptions/buyer');
  assert.equal(from.passType, null);
  assert.equal(from.passEnd, null);
  assert.equal(from.lastPaymentRef, null);
  assert.equal(from.foundingMember, false);
  assert.equal(from.tier, 'free');
  assert.equal(from.plan, 'trial_7day');
  assert.equal(db.read('subscriptions/buyer/payments/pay_2'), undefined);
  const order = db.read('payOrders/o2');
  assert.equal(order.uid, 'child');
  assert.ok(order.movedToOtherAt);
  const audits = db.keys('adminMoves/').map((k) => db.read(k));
  assert.equal(audits.length, 1);
  assert.deepEqual(Object.keys(audits[0]).sort(), ['at', 'byUid', 'fromUid', 'orderId', 'reason', 'toUid']);
  assert.equal(audits[0].byUid, 'buyer');
  assert.equal(audits[0].adminUid, undefined);
});

/* ── guards: each refuses, and leaves every document untouched ─────────── */
async function refuses(seed, code, opts = {}) {
  const db = fakeDb(seed);
  const before = JSON.stringify([...db.docs.entries()]);
  await assert.rejects(() => move(db, opts), refusal(code));
  assert.equal(JSON.stringify([...db.docs.entries()]), before, `a refused move (${code}) must change nothing`);
}

test('GUARD not_yours: another account cannot move this order', async () => {
  await refuses(packSeed(), 'not_yours', { callerUid: 'someone-else' });
});
test('GUARD not_paid: an unpaid / payment-less order', async () => {
  await refuses(packSeed({ order: { status: 'created' } }), 'not_paid');
  await refuses(packSeed({ order: { paymentId: '' } }), 'not_paid');
});
test('GUARD self: moving to your own account', async () => {
  await refuses(packSeed(), 'self', { toUid: 'buyer' });
});
test('GUARD moved_before: an order that carries movedToOtherAt, even when the caller is the holder again', async () => {
  await refuses(packSeed({ order: { movedToOtherAt: new Date(NOW - HOUR) } }), 'moved_before');
});
test('GUARD too_late: older than 24 h (pack and pass); exactly 24 h is still allowed', async () => {
  await refuses(packSeed({ order: { paidAt: new Date(NOW - MOVE_WINDOW_MS - 1) } }), 'too_late');
  await refuses(passSeed({ order: { paidAt: new Date(NOW - MOVE_WINDOW_MS - 1) } }), 'too_late', { orderId: 'o2' });
  const db = fakeDb(packSeed({ order: { paidAt: new Date(NOW - MOVE_WINDOW_MS) } }));
  assert.equal((await move(db)).moved, true);
});
test('GUARD cannot_check: a payment time that cannot be read', async () => {
  await refuses(packSeed({ order: { paidAt: undefined } }), 'cannot_check');
});
test('GUARD unsupported: guest/parent orders (payer), month pass, top-up, credited pass', async () => {
  await refuses(packSeed({ order: { payer: 'guest' } }), 'unsupported');
  await refuses(passSeed({ order: { passType: 'month' } }), 'unsupported', { orderId: 'o2' });
  await refuses(passSeed({ order: { passType: 'topup' } }), 'unsupported', { orderId: 'o2' });
  await refuses(passSeed({ order: { packCreditInr: 100 } }), 'unsupported', { orderId: 'o2' });
});
test('GUARD target_has_pack: the target already owns that pack', async () => {
  await refuses({ ...packSeed(), 'packEntitlements/child/packs/pack_cbq:maths': { orderId: 'other' } }, 'target_has_pack');
});
test('GUARD target_has_pack: the target already owns a pack that COVERS this one (the bundle covers a chapter pack)', async () => {
  const seed = {
    'payOrders/o1': { uid: 'buyer', passType: 'pack_chapter', packTarget: 'real-numbers', status: 'paid', paymentId: 'pay_1', paidAt: new Date(NOW - 2 * HOUR) },
    'packEntitlements/buyer/packs/pack_chapter:real-numbers': { orderId: 'o1', passType: 'pack_chapter', target: 'real-numbers' },
    'packEntitlements/buyer/grants/pay_1': { orderId: 'o1' },
    'packEntitlements/child/packs/pack_bundle:all': { orderId: 'other', passType: 'pack_bundle', target: 'all' },
  };
  await refuses(seed, 'target_has_pack');
});
test('GUARD target_has_pass: the target has a running Board Pass', async () => {
  await refuses(passSeed({ extra: { 'subscriptions/child': { passType: 'till_boards', passEnd: FUTURE } } }), 'target_has_pass', { orderId: 'o2' });
});
test('target with an EXPIRED pass may receive one', async () => {
  const db = fakeDb(passSeed({ extra: { 'subscriptions/child': { passType: 'till_boards', passEnd: new Date(NOW - HOUR) } } }));
  assert.equal((await move(db, { orderId: 'o2' })).moved, true);
});

/* ── "used": the pass reads the server usage ledger ────────────────────── */
const ledgerKey = (ms) => `usageLedger/buyer/days/${istDayKey(ms)}`;
test('GUARD used: ledger calls on the day of payment', async () => {
  await refuses(passSeed({ extra: { [ledgerKey(NOW - HOUR)]: { calls: 1 } } }), 'used', { orderId: 'o2' });
});
test('GUARD used: provider spend, and each trial counter, count as use', async () => {
  await refuses(passSeed({ extra: { [ledgerKey(NOW)]: { providerSpendMicroInr: 5 } } }), 'used', { orderId: 'o2' });
  for (const f of ['trialChecks', 'trialChapterTests', 'trialMocks', 'trialWorksheets']) {
    await refuses(passSeed({ extra: { [ledgerKey(NOW)]: { [f]: 1 } } }), 'used', { orderId: 'o2' });
  }
});
test('GUARD used: use on a DIFFERENT IST day inside the window (paid yesterday evening, used today) is seen', async () => {
  const paid = Date.parse('2026-11-11T22:00:00+05:30');
  const now = Date.parse('2026-11-12T09:00:00+05:30');
  const seed = passSeed({ order: { paidAt: new Date(paid) }, extra: { [ledgerKey(now)]: { calls: 2 } } });
  await refuses(seed, 'used', { orderId: 'o2', nowMs: now });
});
test('an all-zero ledger is NOT use; use from BEFORE the payment day is ignored', async () => {
  const db = fakeDb(passSeed({ extra: { [ledgerKey(NOW)]: { calls: 0, providerSpendMicroInr: 0 }, [ledgerKey(NOW - 3 * 24 * HOUR)]: { calls: 40 } } }));
  assert.equal((await move(db, { orderId: 'o2' })).moved, true);
});
test('GUARD cannot_check (fail closed): an unreadable usage ledger refuses a pass move', async () => {
  const db = fakeDb(passSeed());
  const realCollection = db.collection;
  db.collection = (name) => {
    if (name === 'usageLedger') throw new Error('ledger down');
    return realCollection(name);
  };
  await assert.rejects(() => move(db, { orderId: 'o2' }), refusal('cannot_check'));
  assert.equal(db.read('subscriptions/buyer').passType, 'till_boards');
});
test('a PACK is not judged on the ledger (nothing about downloads is stored): heavy AI use does not block it', async () => {
  const db = fakeDb({ ...packSeed(), [ledgerKey(NOW)]: { calls: 50 } });
  assert.equal((await move(db)).moved, true);
});

/* ── the pass is exact or refused ──────────────────────────────────────── */
test('GUARD pass-not-only-this-purchase: a second payment record, or another lastPaymentRef, refuses (409 MoveError -> unsupported)', async () => {
  const { MoveError } = require('./adminMovePurchase.cjs');
  for (const seed of [
    passSeed({ extra: { 'subscriptions/buyer/payments/pay_older': { amountPaise: 1 } } }),
    passSeed({ sub: { lastPaymentRef: 'pay_other' } }),
    passSeed({ sub: { passType: 'month' } }),
  ]) {
    const db = fakeDb(seed);
    const before = JSON.stringify([...db.docs.entries()]);
    await assert.rejects(() => move(db, { orderId: 'o2' }), (e) => e instanceof MoveError && e.status === 409);
    assert.equal(JSON.stringify([...db.docs.entries()]), before);
  }
});

/* ── once, and race safety ─────────────────────────────────────────────── */
test('ONCE: a second move of the same order (to anyone) is refused after the first', async () => {
  const db = fakeDb(packSeed());
  await move(db);
  await assert.rejects(() => move(db, { toUid: 'third' }), refusal('moved_before'));
  await assert.rejects(() => move(db, { callerUid: 'child', toUid: 'third' }), refusal('moved_before'));
  assert.equal(db.read('payOrders/o1').uid, 'child');
  assert.equal(db.keys('adminMoves/').length, 1);
});
test('RACE: two simultaneous moves of one order to different targets - exactly one wins', async () => {
  const db = fakeDb(packSeed());
  const results = await Promise.allSettled([move(db, { toUid: 'childA' }), move(db, { toUid: 'childB' })]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(db.keys('packEntitlements/childA/packs/').length + db.keys('packEntitlements/childB/packs/').length, 1);
  assert.equal(db.keys('adminMoves/').length, 1);
});
test('RACE: a pass move and the same pass move twice - exactly one wins and the pass exists once', async () => {
  const db = fakeDb(passSeed());
  const results = await Promise.allSettled([move(db, { orderId: 'o2', toUid: 'childA' }), move(db, { orderId: 'o2', toUid: 'childB' })]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const holders = ['childA', 'childB'].filter((u) => db.read(`subscriptions/${u}`) && db.read(`subscriptions/${u}`).passType === 'till_boards');
  assert.equal(holders.length, 1);
  assert.equal(db.read('subscriptions/buyer').passType, null);
});

test('assertMovable is pure and refuses a missing order', () => {
  assert.throws(() => assertMovable(null, 'buyer', NOW), refusal('not_paid'));
});
test('precheck refuses before anything is written', async () => {
  const db = fakeDb(packSeed({ order: { paidAt: new Date(NOW - 30 * HOUR) } }));
  await assert.rejects(() => precheck({ db, orderId: 'o1', callerUid: 'buyer', nowMs: NOW }), refusal('too_late'));
});
