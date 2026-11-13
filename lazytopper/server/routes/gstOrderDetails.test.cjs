'use strict';
/**
 * GST-AFTER-PAY-1 - the signed-in half: POST /api/gst/order-details (routes/gstInvoice.cjs handleOrderDetailsPost) and the shared
 * service (services/gstOrderDetails.cjs). The guest half is tested in guestPay.test.cjs.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGstInvoiceRoutes } = require('./gstInvoice.cjs');
const { createGstOrderDetails } = require('../services/gstOrderDetails.cjs');

function fakeStore(orders) {
  const data = new Map(Object.entries(orders).map(([k, v]) => [k, { ...v }]));
  const ref = (id) => ({
    async get() { return { exists: data.has(id), data: () => (data.has(id) ? { ...data.get(id) } : undefined) }; },
    async set(v) { data.set(id, { ...(data.get(id) || {}), ...v }); },
  });
  return {
    data,
    collection: () => ({ doc: ref }),
    async runTransaction(fn) {
      const writes = [];
      const tx = {
        async get(r) { return r.get(); },
        set(r, v) { writes.push([r, v]); },
      };
      const out = await fn(tx);
      for (const [r, v] of writes) await r.set(v);
      return out;
    },
  };
}
// A sale made after the GST-exclusive cut-off (7 Nov 2026): the only kind this route takes (earlier sales use the emailed back-dated form).
const paidOrder = (over = {}) => ({ status: 'paid', paymentId: 'pay_1', uid: 'u1', amountPaise: 226200, passType: 'till_boards', createdAt: new Date('2026-11-12T10:00:00Z'), paidAt: new Date('2026-11-12T10:05:00Z'), ...over });

function harness(orders, { env = { PAYMENTS_ENABLED: '1', GST_INVOICE_ENABLED: '1' }, issue } = {}) {
  const store = fakeStore(orders);
  const issued = [];
  const queued = [];
  const invoicer = {
    async issueNow({ orderId }) {
      issued.push(orderId);
      if (issue) return issue(orderId, store);
      const o = store.data.get(orderId);
      if (o.gstInvoice) return { issued: false, existing: o.gstInvoice.number };
      if (!o.gstBuyer || !o.gstBuyer.pin) return { held: 'no_pin' };
      store.data.set(orderId, { ...o, gstInvoice: { number: 'LT/26-27/000009' } });
      return { issued: true, number: 'LT/26-27/000009' };
    },
  };
  const res = () => ({});
  const sendJson = (r, s, b) => { r.status = s; r.body = b; };
  const sendJsonWithHeaders = (r, s, b) => { r.status = s; r.body = b; };
  const routes = createGstInvoiceRoutes({
    sendJson,
    sendJsonWithHeaders,
    adminFirestore: store,
    invoicer,
    invoiceMailer: { queueInvoiceEmail: async (x) => { queued.push(x.orderId); } },
    verifiedCaller: { resolveVerifiedUid: async (req) => (req.uid === undefined ? null : req.uid) },
    readJson: async (req) => req.body,
    env,
  });
  return { routes, store, issued, queued, res };
}
const call = async (h, req) => { const r = h.res(); await h.routes.handleOrderDetailsPost(req, r); return r; };
const BODY = { orderId: 'o1', stateCode: '29', pin: '560001' };

test('signed-in: the account that paid saves state + PIN, the invoice is issued once and its email queued', async () => {
  const h = harness({ o1: paidOrder() });
  const r = await call(h, { uid: 'u1', body: BODY });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, status: 'invoiced' });
  assert.deepEqual(h.store.data.get('o1').gstBuyer, { stateCode: '29', pin: '560001' });
  assert.deepEqual(h.queued, ['o1']);
  const again = await call(h, { uid: 'u1', body: { ...BODY, stateCode: '27', pin: '400001' } });
  assert.deepEqual(again.body, { ok: true, status: 'invoiced' });
  assert.deepEqual(h.store.data.get('o1').gstBuyer, { stateCode: '29', pin: '560001' }, 'an issued invoice is never changed');
  assert.equal(h.issued.length, 1);
  assert.equal(h.queued.length, 1);
});

test('signed-in: signed out is 401; another account (or the child of a parent-paid order) gets 404 and nothing is written', async () => {
  const h = harness({ o1: paidOrder(), o2: paidOrder({ uid: 'child', payer: 'parent', payerUid: 'parent1' }) });
  assert.equal((await call(h, { body: BODY })).status, 401);
  assert.equal((await call(h, { uid: 'u2', body: BODY })).status, 404);
  assert.equal((await call(h, { uid: 'child', body: { ...BODY, orderId: 'o2' } })).status, 404);
  assert.equal(h.store.data.get('o1').gstBuyer, undefined);
  assert.equal(h.store.data.get('o2').gstBuyer, undefined);
  assert.equal(h.issued.length, 0);
  // the payer of a parent-paid order IS the owner
  assert.equal((await call(h, { uid: 'parent1', body: { ...BODY, orderId: 'o2' } })).status, 200);
});

test('signed-in: an unpaid order is 409; a bad state / PIN / business is a 400 naming the field and writes nothing', async () => {
  const h = harness({ o1: paidOrder(), o3: paidOrder({ status: 'created', paymentId: undefined }) });
  assert.equal((await call(h, { uid: 'u1', body: { ...BODY, orderId: 'o3' } })).status, 409);
  assert.deepEqual((await call(h, { uid: 'u1', body: { ...BODY, pin: '0123' } })).body, { ok: false, error: 'bad_input', field: 'pin' });
  assert.deepEqual((await call(h, { uid: 'u1', body: { ...BODY, stateCode: '' } })).body, { ok: false, error: 'bad_input', field: 'state' });
  assert.equal((await call(h, { uid: 'u1', body: { ...BODY, business: { gstin: 'bad', legalName: 'Co', address: 'Somewhere' } } })).body.field, 'business');
  assert.equal(h.store.data.get('o1').gstBuyer, undefined);
  assert.equal(h.issued.length, 0);
});

test('signed-in: held invoicing keeps the details and reports details_saved; invoicing off is 404 and writes nothing', async () => {
  const held = harness({ o1: paidOrder() }, { issue: async () => ({ held: 'seller_config_missing' }) });
  const r = await call(held, { uid: 'u1', body: BODY });
  assert.deepEqual(r.body, { ok: true, status: 'details_saved' });
  assert.deepEqual(held.store.data.get('o1').gstBuyer, { stateCode: '29', pin: '560001' });
  assert.deepEqual(held.queued, []);
  const off = harness({ o1: paidOrder() }, { env: { PAYMENTS_ENABLED: '1' } });
  assert.equal((await call(off, { uid: 'u1', body: BODY })).status, 404);
  assert.equal(off.store.data.get('o1').gstBuyer, undefined);
});

test('service: authorize runs on the order that is written; a throwing store answers unavailable, never throws', async () => {
  const store = fakeStore({ o1: paidOrder() });
  const svc = createGstOrderDetails({ adminFirestore: store, invoicer: { issueNow: async () => ({ held: 'no_state' }) } });
  assert.deepEqual(await svc.submit({ orderId: 'o1', raw: { stateCode: '29', pin: '560001' }, authorize: () => false }), { error: 'forbidden' });
  assert.equal(store.data.get('o1').gstBuyer, undefined);
  const broken = createGstOrderDetails({ adminFirestore: { collection: () => ({ doc: () => ({}) }), runTransaction: async () => { throw new Error('x'); } } });
  assert.deepEqual(await broken.submit({ orderId: 'o1', raw: { stateCode: '29', pin: '560001' } }), { error: 'unavailable' });
});

test('signed-in: a PAST sale (before the cut-off) is refused with 409 past_sale; nothing is written, no invoice is issued', async () => {
  const h = harness({ o1: paidOrder({ createdAt: new Date('2026-11-01T10:00:00Z'), paidAt: new Date('2026-11-01T10:05:00Z') }) });
  const r = await call(h, { uid: 'u1', body: BODY });
  assert.equal(r.status, 409);
  assert.deepEqual(r.body, { ok: false, error: 'past_sale' });
  assert.equal(h.store.data.get('o1').gstBuyer, undefined);
  assert.deepEqual(h.issued, []);
});

test('service: only a PAID status WITH a payment id is written (an unpaid status, or no payment id, is refused; nothing written)', async () => {
  for (const over of [{ status: 'created' }, { status: 'paid', paymentId: undefined }, { status: 'paid', paymentId: '' }]) {
    const h = harness({ o1: paidOrder(over) });
    const r = await call(h, { uid: 'u1', body: BODY });
    assert.equal(r.status, 409, JSON.stringify(over));
    assert.equal(h.store.data.get('o1').gstBuyer, undefined);
    assert.deepEqual(h.issued, []);
  }
});
