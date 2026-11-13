'use strict';
// UNCLAIMED-ALERT-1 - the owner alert (b) and the sweep's own rules (a). The hold-end DELIVERY through the real guest routes is
// pinned in routes/guestPay.test.cjs (UNCLAIMED-1 ...); here `deliver` is a recorder.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createUnclaimedSweeper, alertRecipient, isSweepDisabled, isAlertDisabled, buildAlertEmail, ALERT_AFTER_MS, ALERT_MAX_AGE_MS, MAX_SWEEP_ATTEMPTS, MAX_ALERT_ATTEMPTS } = require('./unclaimedOrders.cjs');

const NOW = Date.parse('2026-11-13T12:00:00+05:30');
const MIN = 60000;

/** In-memory store: equality queries, doc get/set(merge), and SERIALISED transactions (as Firestore's are). */
function memDb(seed = {}) {
  const docs = new Map(Object.entries(seed).map(([k, v]) => [k, { ...v }]));
  let chainTx = Promise.resolve();
  const refOf = (key) => ({ key, async get() { return { exists: docs.has(key), data: () => ({ ...docs.get(key) }) }; }, async set(d, o) { docs.set(key, { ...(o && o.merge ? docs.get(key) || {} : {}), ...d }); } });
  const query = (name, filters = [], max = Infinity) => ({
    where: (f, op, v) => { assert.equal(op, '=='); return query(name, [...filters, [f, v]], max); },
    limit: (n) => query(name, filters, n),
    async get() {
      const out = [];
      for (const [k, v] of docs) if (k.startsWith(`${name}/`) && filters.every(([f, x]) => v[f] === x) && out.length < max) out.push({ id: k.slice(name.length + 1), data: () => ({ ...v }) });
      return { docs: out };
    },
  });
  return {
    docs,
    read: (k) => docs.get(k),
    collection: (name) => ({ doc: (id) => refOf(`${name}/${id}`), ...query(name) }),
    runTransaction(fn) {
      const run = chainTx.then(() => fn({ get: (r) => r.get(), set: (r, d, o) => r.set(d, o) }));
      chainTx = run.catch(() => null);
      return run;
    },
  };
}

const order = (over = {}) => ({ payer: 'guest', status: 'paid_unclaimed', uid: null, paymentId: 'pay_1', guestPhone: '+919876543948', passType: 'pack_mock', packTarget: 'maths', amountPaise: 9900, guestPaidAt: new Date(NOW - 16 * MIN), ...over });
const mk = (db, over = {}) => {
  const sent = [];
  const deliveries = [];
  const sweeper = createUnclaimedSweeper({
    db,
    now: () => NOW,
    env: { UNCLAIMED_ALERT_TO: 'owner@example.com' },
    deliver: async (i) => { deliveries.push(i); },
    send: async (m) => { sent.push(m); return { ok: true }; },
    canSend: () => true,
    maskPhone: (p) => (p ? `+91 98•••••${String(p).slice(-3)}` : ''),
    maskMail: () => '',
    ...over,
  });
  return { sweeper, sent, deliveries };
};

test('switches and the recipient: both kill switches accept 1|true|on|yes; the address is env only (alert-to, else ops-report-to, valid only)', () => {
  for (const v of ['1', 'true', 'ON', 'Yes']) { assert.equal(isSweepDisabled({ UNCLAIMED_SWEEP_DISABLED: v }), true); assert.equal(isAlertDisabled({ UNCLAIMED_ALERT_DISABLED: v }), true); }
  for (const v of ['', '0', 'no', undefined]) { assert.equal(isSweepDisabled({ UNCLAIMED_SWEEP_DISABLED: v }), false); assert.equal(isAlertDisabled({ UNCLAIMED_ALERT_DISABLED: v }), false); }
  assert.equal(alertRecipient({ UNCLAIMED_ALERT_TO: 'a@x.com', OPS_REPORT_TO: 'b@x.com' }), 'a@x.com');
  assert.equal(alertRecipient({ OPS_REPORT_TO: 'b@x.com' }), 'b@x.com');
  assert.equal(alertRecipient({ UNCLAIMED_ALERT_TO: 'not an email', OPS_REPORT_TO: 'b@x.com' }), 'b@x.com');
  assert.equal(alertRecipient({ UNCLAIMED_ALERT_TO: 'a@x.com,c@x.com' }), '');
  assert.equal(alertRecipient({}), '');
});

test('ALERT · one email for an order unclaimed 15 minutes: to the env address, masked contact, a per-order idempotency key', async () => {
  const db = memDb({ 'payOrders/o1': order() });
  const { sweeper, sent } = mk(db);
  assert.equal(await sweeper.alertOverdueOrders(), 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'owner@example.com');
  assert.equal(sent[0].idempotencyKey, 'unclaimed-alert-o1');
  assert.match(sent[0].text, /o1/);
  assert.ok(sent[0].text.includes('+91 98•••••948') && !sent[0].text.includes('9876543948'), 'masked contact only');
  assert.equal(db.read('payOrders/o1').unclaimedAlert.status, 'sent');
});

test('ALERT · at most ONE per order: a second tick, a restart (fresh sweeper) and two racing sweepers all send nothing more', async () => {
  const db = memDb({ 'payOrders/o1': order(), 'payOrders/o2': order({ paymentId: 'pay_2' }) });
  const a = mk(db);
  assert.equal(await a.sweeper.alertOverdueOrders(), 2);
  assert.equal(await a.sweeper.alertOverdueOrders(), 0);
  const b = mk(db); // a restart: nothing but the stored orders remains
  assert.equal(await b.sweeper.alertOverdueOrders(), 0);
  const db2 = memDb({ 'payOrders/r1': order() });
  const x = mk(db2); const y = mk(db2);
  await Promise.all([x.sweeper.alertOverdueOrders(), y.sweeper.alertOverdueOrders()]);
  assert.equal(x.sent.length + y.sent.length, 1, 'two instances at once: the claim transaction lets only one send');
});

test('ALERT · the 15-minute edge, the 24 h ceiling (no boot-time mass mail of old orders), claimed orders and non-guest orders', async () => {
  const at = (ms, extra = {}) => order({ guestPaidAt: new Date(NOW - ms), ...extra });
  const db = memDb({
    'payOrders/young': at(ALERT_AFTER_MS - 1),
    'payOrders/edge': at(ALERT_AFTER_MS),
    'payOrders/old': at(ALERT_MAX_AGE_MS + 1),
    'payOrders/claimed': at(20 * MIN, { status: 'claimed', uid: 'u1' }),
    'payOrders/hasUid': at(20 * MIN, { uid: 'u1' }),
    'payOrders/notGuest': at(20 * MIN, { payer: 'self' }),
    'payOrders/noPay': at(20 * MIN, { paymentId: '' }),
    'payOrders/noTime': order({ guestPaidAt: undefined }),
  });
  const { sweeper, sent } = mk(db);
  await sweeper.alertOverdueOrders();
  assert.deepEqual(sent.map((m) => m.idempotencyKey), ['unclaimed-alert-edge']);
});

test('ALERT · does nothing without a recipient, with the kill switch, or when mail cannot send; the order stays alertable afterwards', async () => {
  const db = memDb({ 'payOrders/o1': order() });
  for (const over of [{ env: {} }, { env: { UNCLAIMED_ALERT_TO: 'o@x.com', UNCLAIMED_ALERT_DISABLED: '1' } }, { canSend: () => false }]) {
    const { sweeper, sent } = mk(db, over);
    assert.equal(await sweeper.alertOverdueOrders(), 0);
    assert.equal(sent.length, 0);
  }
  assert.equal(db.read('payOrders/o1').unclaimedAlert, undefined, 'nothing was claimed');
  const { sweeper, sent } = mk(db);
  assert.equal(await sweeper.alertOverdueOrders(), 1);
  assert.equal(sent.length, 1);
});

test('ALERT · a failed send is retried (same idempotency key) up to the cap, then stops; a later success is still ONE email', async () => {
  const db = memDb({ 'payOrders/o1': order(), 'payOrders/o2': order({ paymentId: 'pay_2' }) });
  let calls = 0;
  const { sweeper } = mk(db, { send: async (m) => { calls += 1; return m.idempotencyKey.endsWith('o1') ? { ok: false } : { ok: true }; } });
  for (let i = 0; i < MAX_ALERT_ATTEMPTS + 3; i += 1) await sweeper.alertOverdueOrders();
  assert.equal(db.read('payOrders/o1').unclaimedAlert.status, 'failed');
  assert.equal(db.read('payOrders/o1').unclaimedAlert.attempts, MAX_ALERT_ATTEMPTS);
  assert.equal(calls, MAX_ALERT_ATTEMPTS + 1, 'o1 stopped at the cap, o2 sent once');
  // a thrown send is a failure, never an unhandled error
  const db3 = memDb({ 'payOrders/o3': order() });
  const t = mk(db3, { send: async () => { throw new Error('boom'); } });
  assert.equal(await t.sweeper.alertOverdueOrders(), 0);
  assert.equal(db3.read('payOrders/o3').unclaimedAlert.status, 'failed');
});

test('ALERT · a crashed send (claimed `sending`, never settled) is retried only after the stale window', async () => {
  const db = memDb({ 'payOrders/o1': order({ unclaimedAlert: { status: 'sending', attempts: 1, at: new Date(NOW - 5 * MIN) } }), 'payOrders/o2': order({ paymentId: 'p2', unclaimedAlert: { status: 'sending', attempts: 1, at: new Date(NOW - 31 * MIN) } }) });
  const { sweeper, sent } = mk(db);
  await sweeper.alertOverdueOrders();
  assert.deepEqual(sent.map((m) => m.idempotencyKey), ['unclaimed-alert-o2']);
});

test('ALERT · the content names no full phone or email, no key', () => {
  const m = buildAlertEmail({ orderId: 'o9', order: order({ guestEmail: 'student@example.com' }), ageMin: 17, maskPhone: () => '+91 98•••••948', maskMail: () => 's•••@e•••.com' });
  assert.ok(!/9876543948|student@example/.test(m.text + m.subject));
});

test('SWEEP · only self-pay attach orders past their hold are handed to the delivery step, once per attempt, capped, oldest first', async () => {
  const held = (extra = {}) => order({ attachFlow: true, selfPay: true, checkoutWho: true, guestPaidAt: new Date(NOW - 11 * MIN), ...extra });
  const db = memDb({
    'payOrders/due': held(),
    'payOrders/older': held({ guestPaidAt: new Date(NOW - 50 * MIN), paymentId: 'pay_old' }),
    'payOrders/inHold': held({ guestPaidAt: new Date(NOW - 9 * MIN) }),
    'payOrders/storedHold': held({ attachHoldUntil: new Date(NOW + 5 * MIN) }),
    'payOrders/chose': held({ attachedAt: new Date(NOW - MIN) }),
    'payOrders/notSelf': held({ selfPay: false }),
    'payOrders/notAttach': held({ attachFlow: false }),
    'payOrders/claimed': held({ status: 'claimed', uid: 'u1' }),
    'payOrders/capped': held({ holdSweepAttempts: MAX_SWEEP_ATTEMPTS }),
  });
  const { sweeper, deliveries } = mk(db);
  assert.equal(await sweeper.sweepHeldOrders(), 2);
  assert.deepEqual(deliveries, [{ orderId: 'older', paymentId: 'pay_old' }, { orderId: 'due', paymentId: 'pay_1' }]);
  assert.equal(db.read('payOrders/due').holdSweepAttempts, 1);
});

test('SWEEP · stops after the attempt cap; a throwing delivery never escapes; the kill switch and a missing delivery step do nothing', async () => {
  const held = order({ attachFlow: true, selfPay: true, checkoutWho: true, guestPaidAt: new Date(NOW - 30 * MIN) });
  const db = memDb({ 'payOrders/o1': held });
  let calls = 0;
  const { sweeper } = mk(db, { deliver: async () => { calls += 1; throw new Error('nope'); } });
  for (let i = 0; i < MAX_SWEEP_ATTEMPTS + 3; i += 1) await sweeper.sweepHeldOrders();
  assert.equal(calls, MAX_SWEEP_ATTEMPTS);
  const off = mk(memDb({ 'payOrders/o1': held }), { env: { UNCLAIMED_SWEEP_DISABLED: '1', UNCLAIMED_ALERT_TO: 'o@x.com' } });
  assert.equal(await off.sweeper.sweepHeldOrders(), 0);
  assert.equal(off.deliveries.length, 0);
  const none = mk(memDb({ 'payOrders/o1': held }), { deliver: undefined });
  assert.equal(await none.sweeper.sweepHeldOrders(), 0);
});

test('TICK · delivers first, then alerts: an order the sweep just attached is not alerted; overlapping ticks do not run twice', async () => {
  const db = memDb({ 'payOrders/o1': order({ attachFlow: true, selfPay: true, checkoutWho: true, guestPaidAt: new Date(NOW - 20 * MIN) }) });
  const { sweeper, sent } = mk(db, {
    deliver: async ({ orderId }) => { await db.collection('payOrders').doc(orderId).set({ status: 'paid', uid: 'u1' }, { merge: true }); },
  });
  const r = await sweeper.tick();
  assert.deepEqual(r, { delivered: 1, alerted: 0 });
  assert.equal(sent.length, 0);
  const slow = mk(memDb({}), {});
  const [p, q] = [slow.sweeper.tick(), slow.sweeper.tick()];
  assert.deepEqual(await q, { skipped: true });
  await p;
});

test('START · arms nothing when both switches are off; otherwise returns a stop that clears its timers', () => {
  const off = createUnclaimedSweeper({ db: memDb(), env: { UNCLAIMED_SWEEP_DISABLED: '1', UNCLAIMED_ALERT_DISABLED: '1' } });
  const stopOff = off.start();
  assert.equal(typeof stopOff, 'function');
  const on = createUnclaimedSweeper({ db: memDb(), env: {}, log: () => {} });
  on.start()();
});

/** A db whose queries return a snapshot taken EARLIER (another instance acted since); transactions see the live store. */
function staleReads(db, snapshotDocs) {
  const q = { where: () => q, limit: () => q, get: async () => ({ docs: snapshotDocs.map(([id, data]) => ({ id, data: () => ({ ...data }) })) }) };
  return { ...db, collection: (name) => ({ doc: (id) => db.collection(name).doc(id), ...q }), runTransaction: (fn) => db.runTransaction(fn) };
}

test('ALERT · the in-transaction claim is the guard when the earlier read was stale: sent, attached or claimed-meanwhile orders get no second email', async () => {
  const db = memDb({
    'payOrders/sent': order({ unclaimedAlert: { status: 'sent', attempts: 1, at: new Date(NOW) } }),
    'payOrders/attached': order({ status: 'paid', uid: 'u1', paymentId: 'pay_a' }),
    'payOrders/capped': order({ unclaimedAlert: { status: 'failed', attempts: MAX_ALERT_ATTEMPTS, at: new Date(NOW) } }),
  });
  const stale = ['sent', 'attached', 'capped'].map((id) => [id, order({ paymentId: `pay_${id}` })]);
  const { sweeper, sent } = mk(staleReads(db, stale));
  assert.equal(await sweeper.alertOverdueOrders(), 0);
  assert.equal(sent.length, 0);
});

test('SWEEP · the in-transaction attempt claim is the guard when the earlier read was stale (cap reached, or already attached)', async () => {
  const held = (x = {}) => order({ attachFlow: true, selfPay: true, checkoutWho: true, guestPaidAt: new Date(NOW - 30 * MIN), ...x });
  const db = memDb({ 'payOrders/capped': held({ holdSweepAttempts: MAX_SWEEP_ATTEMPTS }), 'payOrders/gone': held({ status: 'paid', uid: 'u1' }) });
  const { sweeper, deliveries } = mk(staleReads(db, [['capped', held()], ['gone', held()]]));
  assert.equal(await sweeper.sweepHeldOrders(), 0);
  assert.equal(deliveries.length, 0);
});
