// TS-UPGRADE-CREDIT-1 - a Test Series Pack owner buying the Board Pass pays ONLY THE DIFFERENCE (the Test Series BASE comes off
// the Board Pass base; GST on the difference), through the REAL /api/pay/* and /api/packs/mine routes. MONEY code: every test
// names the amount charged, or a way the credit is NOT given (and the purchase still goes through at the full price).
// Run: node --test lazytopper/server/routes/tsUpgradeCredit.payments.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');

const { createPaymentRoutes, PAY_ORDER_PATH, PAY_VERIFY_PATH, PAY_WEBHOOK_PATH, PAY_STATUS_PATH } = require('./payments.cjs');
const { createPackRoutes, PACKS_MINE_PATH } = require('./packs.cjs');
const { createHttpUtils } = require('../services/httpUtils.cjs');
const g = require('../services/gstInvoice.cjs');
const { invoiceTextBlocks } = require('../services/gstInvoicePdf.cjs');
const { movePackOrder } = require('../services/adminMovePurchase.cjs');
const { FOUNDING_OFFER_CLOSES_AT_MS } = require('../services/passPricing.cjs');

const KEY_ID = 'rzp_test_KEYID';
const KEY_SECRET = 'test_key_secret_never_sent';
const WEBHOOK_SECRET = 'test_webhook_secret';
const ENV_ON = { PAYMENTS_ENABLED: '1', PACKS_ENABLED: '1', RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET };
/** 20 Nov 2026, 12:00 IST: after the GST cut-off (7 Nov), inside the founding offer (Board Pass base 1917). */
const NOW = Date.parse('2026-11-20T12:00:00+05:30');
/** 1 Dec 2026 00:00 IST, exactly: the after-founding Board Pass base (2499) applies from this instant. */
const AFTER_FOUNDING = FOUNDING_OFFER_CLOSES_AT_MS;

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');
const checkoutSig = (orderId, paymentId) => hmac(KEY_SECRET, `${orderId}|${paymentId}`);

/* in-memory Firestore with optimistic transactions + collection reads (the payments.test.cjs harness) */
function memoryFirestore(seed = {}) {
  const docs = new Map();
  for (const [key, data] of Object.entries(seed)) docs.set(key, { data: { ...data }, version: 1 });
  const stats = { commits: 0, retries: 0, writes: [] };
  const yieldNow = () => new Promise((r) => setImmediate(r));
  const snapOf = (entry) => ({ exists: !!entry, data: () => (entry ? { ...entry.data } : undefined) });
  function write(key, data, opts) {
    const prev = docs.get(key);
    const base = opts && opts.merge && prev ? prev.data : {};
    docs.set(key, { data: { ...base, ...data }, version: (prev ? prev.version : 0) + 1 });
    stats.writes.push(key);
  }
  // PASS-OWNER-PACKS-1: chainable equality query (`where().where().limit().get()`) over the documents directly under `key`.
  function query(key, filters = [], max = Infinity) {
    return {
      where(field, op, value) {
        assert.equal(op, '==');
        return query(key, [...filters, [field, value]], max);
      },
      limit: (n) => query(key, filters, n),
      async get() {
        await yieldNow();
        const out = [];
        for (const [k, e] of docs) {
          if (!k.startsWith(`${key}/`) || k.slice(key.length + 1).includes('/')) continue;
          if (filters.every(([f, v]) => e.data[f] === v) && out.length < max) out.push({ id: k.slice(key.length + 1), data: () => ({ ...e.data }) });
        }
        return { docs: out, empty: out.length === 0, size: out.length };
      },
    };
  }
  function coll(key) {
    return {
      where: (field, op, value) => query(key).where(field, op, value),
      doc: (id) => ref(`${key}/${id === undefined ? crypto.randomUUID() : id}`),
      async get() {
        await yieldNow();
        const out = [];
        for (const [k, e] of docs) {
          if (!k.startsWith(`${key}/`) || k.slice(key.length + 1).includes('/')) continue;
          out.push({ id: k.slice(key.length + 1), data: () => ({ ...e.data }) });
        }
        return { docs: out };
      },
    };
  }
  function ref(key) {
    return {
      key,
      collection: (sub) => coll(`${key}/${sub}`),
      async get() { await yieldNow(); return snapOf(docs.get(key)); },
      async set(data, opts) { await yieldNow(); write(key, data, opts); },
    };
  }
  return {
    docs,
    stats,
    read: (key) => (docs.get(key) ? { ...docs.get(key).data } : undefined),
    version: (key) => (docs.get(key) ? docs.get(key).version : 0),
    keys: (prefix) => [...docs.keys()].filter((k) => k.startsWith(prefix)),
    collection: (name) => coll(name),
    async runTransaction(fn) {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const seen = new Map();
        const pending = [];
        const tx = {
          async get(r) { await yieldNow(); const e = docs.get(r.key); seen.set(r.key, e ? e.version : 0); return snapOf(e); },
          set(r, data, opts) { pending.push([r.key, data, opts]); },
          delete(r) { pending.push([r.key, null, null]); },
        };
        const out = await fn(tx);
        await yieldNow();
        const conflict = [...seen].some(([k, v]) => (docs.get(k) ? docs.get(k).version : 0) !== v);
        if (conflict) { stats.retries += 1; continue; }
        for (const [k, d, o] of pending) { if (d === null) docs.delete(k); else write(k, d, o); }
        stats.commits += 1;
        return out;
      }
      throw new Error('transaction contention: too many retries');
    },
  };
}

function fakeRazorpay() {
  const orders = new Map();
  const payments = new Map();
  const calls = [];
  let seq = 0;
  const reply = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json });
  async function fetchImpl(url, init = {}) {
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    const u = new URL(url);
    let m;
    if (method === 'POST' && u.pathname === '/v1/orders') {
      seq += 1;
      const order = { id: `order_P${seq}`, entity: 'order', amount: body.amount, currency: body.currency, notes: body.notes, status: 'created' };
      orders.set(order.id, order);
      return reply(200, order);
    }
    if (method === 'GET' && (m = u.pathname.match(/^\/v1\/orders\/([^/]+)\/payments$/))) {
      const items = [...payments.values()].filter((p) => p.order_id === m[1]).map((p) => ({ ...p }));
      return reply(200, { entity: 'collection', count: items.length, items });
    }
    // MONEY-DUPGUARD-1: an order as Razorpay reports it (razorpay.com/docs/payments/orders): `created` until a payment is
    // attempted, `attempted` until one is captured, then `paid` (amount_paid = amount).
    if (method === 'GET' && (m = u.pathname.match(/^\/v1\/orders\/([^/]+)$/))) {
      const o = orders.get(m[1]);
      if (!o) return reply(400, { error: { code: 'BAD_REQUEST_ERROR' } });
      const its = [...payments.values()].filter((p) => p.order_id === o.id);
      const paid = its.some((p) => p.status === 'captured');
      return reply(200, { ...o, status: paid ? 'paid' : its.length ? 'attempted' : 'created', amount_paid: paid ? o.amount : 0, attempts: its.length });
    }
    if (method === 'GET' && (m = u.pathname.match(/^\/v1\/payments\/([^/]+)$/))) {
      const p = payments.get(m[1]);
      return p ? reply(200, { ...p }) : reply(400, {});
    }
    return reply(404, {});
  }
  function pay(orderId, { id = `pay_${orderId}`, amount, status = 'captured' } = {}) {
    const order = orders.get(orderId);
    const p = { id, entity: 'payment', order_id: orderId, amount: amount === undefined ? order.amount : amount, currency: 'INR', status };
    payments.set(id, p);
    return p;
  }
  return { fetchImpl, orders, payments, calls, pay };
}

async function start({ env = ENV_ON, db = memoryFirestore(), rzp = fakeRazorpay(), licensees = {}, throwLicensee = false, nowMs = NOW, foundingOfferOpen } = {}) {
  const { sendJson } = createHttpUtils('*');
  const events = [];
  const telemetry = { increment: (e) => events.push(e) };
  const verifiedCaller = {
    async resolveVerifiedUid(req) {
      const h = String(req.headers.authorization || '');
      return h.startsWith('Bearer uid:') ? h.slice('Bearer uid:'.length) : '';
    },
  };
  const pay = createPaymentRoutes({ sendJson, verifiedCaller, adminFirestore: db, telemetry, env, fetchImpl: rzp.fetchImpl, now: () => nowMs, foundingOfferOpen });
  const packs = createPackRoutes({
    sendJson, verifiedCaller, adminFirestore: db, telemetry, now: () => nowMs, foundingOfferOpen, env,
    getLicensee: async (uid) => { if (throwLicensee) throw new Error('auth down'); return licensees[uid] || { name: '', email: '' }; },
  });
  const server = http.createServer((req, res) => {
    const p = String(req.url).split('?')[0];
    let h;
    if (req.method === 'POST' && p === PAY_ORDER_PATH) h = pay.handleOrder;
    else if (req.method === 'POST' && p === PAY_VERIFY_PATH) h = pay.handleVerify;
    else if (req.method === 'POST' && p === PAY_WEBHOOK_PATH) h = pay.handleWebhook;
    else if (req.method === 'POST' && p === PAY_STATUS_PATH) h = pay.handleStatus;
    else if (req.method === 'GET' && p === PACKS_MINE_PATH) h = packs.handleMine;
    if (!h) return sendJson(res, 404, { error: 'Not Found' });
    return Promise.resolve(h(req, res)).catch((e) => sendJson(res, 500, { error: e.message }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, db, rzp, events, close: () => new Promise((r) => server.close(r)) };
}

function call(port, method, urlPath, { body, raw, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = raw !== undefined ? raw : method === 'GET' ? '' : JSON.stringify(body === undefined ? {} : body);
    const req = http.request(
      { host: '127.0.0.1', port, path: urlPath, method, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers } },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => { let json = null; try { json = JSON.parse(text); } catch {} resolve({ status: res.statusCode, json, text }); });
      },
    );
    req.on('error', reject);
    req.end(payload);
  });
}
const post = (port, p, o) => call(port, 'POST', p, o);
const asUid = (uid) => ({ Authorization: `Bearer uid:${uid}` });
const order = (srv, uid, passType, extra = {}) => post(srv.port, PAY_ORDER_PATH, { body: { passType, ...extra }, headers: asUid(uid) });
async function orderOk(srv, uid, passType, extra) {
  const r = await order(srv, uid, passType, extra);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json;
}
const verify = (srv, uid, orderId, paymentId) =>
  post(srv.port, PAY_VERIFY_PATH, { body: { orderId, paymentId, signature: checkoutSig(orderId, paymentId) }, headers: asUid(uid) });
const status = (srv, uid, orderId) => post(srv.port, PAY_STATUS_PATH, { body: { orderId }, headers: asUid(uid) });
function webhook(srv, payment) {
  const raw = `{"entity":"event","event":"payment.captured","payload":{"payment":{"entity":${JSON.stringify(payment, null, 1)}}}}`;
  return post(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'x-razorpay-signature': hmac(WEBHOOK_SECRET, raw) } });
}

/* ══════════════════════════════════════════════════════════════════════════════
   Fixtures: a Test Series purchase exactly as packGrant.cjs + the order route store it.
   ══════════════════════════════════════════════════════════════════════════════ */
const GST_BUYER_KA = { stateCode: '29', pin: '560001' };
function seedTs(db, uid, { order: o = {}, pack: p = {}, orderId = `order_TS_${uid}` } = {}) {
  const paymentId = `pay_TS_${uid}`;
  db.docs.set(`payOrders/${orderId}`, {
    data: {
      uid, passType: 'test_series', packTarget: 'all', amountPaise: 117900, baseInr: 999, gstInr: 180, totalInr: 1179, gstRate: 0.18,
      gstBuyer: GST_BUYER_KA, offerKey: null, status: 'paid', paymentId, paidAt: new Date(NOW - 86400000), createdAt: new Date(NOW - 86400000), ...o,
    },
    version: 1,
  });
  db.docs.set(`packEntitlements/${uid}/packs/test_series:all`, {
    data: { packId: 'test_series:all', sku: 'test_series', target: 'all', pricePaidInr: 1179, paidAt: NOW - 86400000, orderId, paymentRef: paymentId, creditedToPass: false, ...p },
    version: 1,
  });
  db.docs.set(`packEntitlements/${uid}/grants/${paymentId}`, { data: { paymentRef: paymentId, packId: 'test_series:all', orderId, grantedAt: new Date(NOW - 86400000) }, version: 1 });
  return { orderId, paymentId };
}
const TS_KEYS = ['tsUpgradeCreditInr', 'tsUpgradeFullBaseInr', 'tsUpgradeCreditPackId', 'tsUpgradeCreditOrderId'];
const lastRzpOrder = (srv) => srv.rzp.calls.filter((c) => c.url.endsWith('/orders') && c.method === 'POST').pop();
const mine = (srv, uid) => call(srv.port, 'GET', PACKS_MINE_PATH, { headers: asUid(uid) });
const LIC = (uids) => Object.fromEntries(uids.map((u) => [u, { name: u, email: `${u}@example.com` }]));

/* ── THE MONEY TABLE ──────────────────────────────────────────────────────────────────────────────────────────────── */

test('MONEY · founding: Test Series owner pays 918 + 165 = 1083 (1179 + 1083 = 2262 = the Board Pass all-in); Razorpay, stored order, notes, response agree', async (t) => {
  const db = memoryFirestore();
  seedTs(db, 'ts1');
  const srv = await start({ db });
  t.after(srv.close);
  const plain = await orderOk(srv, 'nobody', 'till_boards');
  assert.equal(plain.amountPaise, 226200, 'a student without the Test Series pays the full 1917 + 345');
  const r = await orderOk(srv, 'ts1', 'till_boards', { gstBuyer: GST_BUYER_KA });
  assert.equal(r.amountPaise, 108300);
  assert.equal(117900 + r.amountPaise, plain.amountPaise, '1179 + 1083 = 2262');
  assert.deepEqual(r.gst, { baseInr: 918, gstInr: 165, totalInr: 1083 });
  assert.equal(r.tsUpgradeCreditInr, 999);
  const created = lastRzpOrder(srv);
  assert.equal(created.body.amount, 108300, 'Razorpay is asked for the credited amount');
  assert.equal(created.body.notes.tsUpgradeCreditInr, '999');
  assert.equal(created.body.notes.tsUpgradeCreditOrderId, 'order_TS_ts1');
  const stored = srv.db.read(`payOrders/${r.orderId}`);
  assert.equal(stored.amountPaise, 108300);
  assert.equal(stored.baseInr, 918);
  assert.equal(stored.gstInr, 165);
  assert.equal(stored.totalInr, 1083);
  assert.equal(stored.gstRate, 0.18);
  assert.equal(stored.tsUpgradeCreditInr, 999);
  assert.equal(stored.tsUpgradeFullBaseInr, 1917);
  assert.equal(stored.tsUpgradeCreditPackId, 'test_series:all');
  assert.equal(stored.tsUpgradeCreditOrderId, 'order_TS_ts1');
  assert.equal(stored.packCreditInr, undefined, 'never recorded as a PACK-CREDIT-1 credit');
  assert.ok(srv.events.includes('payments.order.ts_upgrade_credit_applied'));
  assert.equal(srv.db.read('packEntitlements/ts1/packs/test_series:all').creditedToPass, false, 'creating the order does not spend the credit');
});

test('MONEY · 1 Dec 00:00 IST boundary: 1 ms before -> 1083; exactly at it -> 1500 + 270 = 1770 (1179 + 1770 = 2949)', async (t) => {
  const db = memoryFirestore();
  seedTs(db, 'ts1');
  const before = await start({ db, nowMs: AFTER_FOUNDING - 1 });
  t.after(before.close);
  assert.equal((await orderOk(before, 'ts1', 'till_boards')).amountPaise, 108300);
  const db2 = memoryFirestore();
  seedTs(db2, 'ts1');
  const at = await start({ db: db2, nowMs: AFTER_FOUNDING });
  t.after(at.close);
  const plain = await orderOk(at, 'nobody', 'till_boards');
  assert.equal(plain.amountPaise, 294900, 'the full after-founding price: 2499 + 450');
  const r = await orderOk(at, 'ts1', 'till_boards');
  assert.equal(r.amountPaise, 177000);
  assert.deepEqual(r.gst, { baseInr: 1500, gstInr: 270, totalInr: 1770 });
  assert.equal(117900 + r.amountPaise, plain.amountPaise, '1179 + 1770 = 2949');
  assert.equal(at.db.read(`payOrders/${r.orderId}`).tsUpgradeFullBaseInr, 2499);
});

/* ── grant: verify, webhook, status, replays ─────────────────────────────────────────────────────────────────────── */

test('GRANT · verify grants the Board Pass for 1083, marks the Test Series credited ONCE; verify / webhook / status replays change nothing', async (t) => {
  const db = memoryFirestore();
  seedTs(db, 'ts1');
  const srv = await start({ db });
  t.after(srv.close);
  const r = await orderOk(srv, 'ts1', 'till_boards', { gstBuyer: GST_BUYER_KA });
  const p = srv.rzp.pay(r.orderId);
  const v = await verify(srv, 'ts1', r.orderId, p.id);
  assert.equal(v.status, 200, v.text);
  assert.equal(v.json.replayed, false);
  assert.ok(v.json.passEnd);
  const sub = db.read('subscriptions/ts1');
  assert.equal(sub.passType, 'till_boards');
  assert.equal(sub.pricePaidInr, 1083, 'the price recorded is the amount charged');
  const ts = db.read('packEntitlements/ts1/packs/test_series:all');
  assert.equal(ts.creditedToPass, true);
  assert.equal(ts.creditedOrderId, r.orderId);
  assert.equal(ts.creditedKind, 'ts_upgrade');
  assert.equal(ts.orderId, 'order_TS_ts1', 'the entitlement itself is untouched otherwise (the series stays unlocked)');
  const paidOrder = db.read(`payOrders/${r.orderId}`);
  assert.equal(paidOrder.status, 'paid');
  assert.equal(paidOrder.tsUpgradeCreditConflict, undefined);
  assert.ok(srv.events.includes('payments.verify.ts_upgrade_credit_marked'));
  const version = db.version('packEntitlements/ts1/packs/test_series:all');
  // replays: verify again, the webhook (duplicate delivery), status
  const again = await verify(srv, 'ts1', r.orderId, p.id);
  assert.equal(again.json.replayed, true);
  const w = await webhook(srv, { id: p.id, entity: 'payment', order_id: r.orderId, amount: 108300, currency: 'INR', status: 'captured' });
  assert.equal(w.status, 200, w.text);
  const w2 = await webhook(srv, { id: p.id, entity: 'payment', order_id: r.orderId, amount: 108300, currency: 'INR', status: 'captured' });
  assert.equal(w2.status, 200, w2.text);
  const s = await status(srv, 'ts1', r.orderId);
  assert.equal(s.status, 200, s.text);
  assert.equal(db.version('packEntitlements/ts1/packs/test_series:all'), version, 'never marked twice');
  assert.equal(db.read('packEntitlements/ts1/packs/test_series:all').creditedOrderId, r.orderId);
  // a second Board Pass is not sold (the pass already runs to the boards)
  const second = await order(srv, 'ts1', 'till_boards');
  assert.equal(second.status, 409);
});

test('GRANT · webhook only (verify never ran) grants at 1083 and marks once; a payment of the FULL 2262 on the credited order is REJECTED (amount check uses the credited amount)', async (t) => {
  const db = memoryFirestore();
  seedTs(db, 'ts1');
  seedTs(db, 'ts2');
  const srv = await start({ db });
  t.after(srv.close);
  const a = await orderOk(srv, 'ts1', 'till_boards');
  const pa = srv.rzp.pay(a.orderId);
  const w = await webhook(srv, { id: pa.id, entity: 'payment', order_id: a.orderId, amount: 108300, currency: 'INR', status: 'captured' });
  assert.equal(w.status, 200, w.text);
  assert.equal(db.read('packEntitlements/ts1/packs/test_series:all').creditedToPass, true);
  assert.equal(db.read('subscriptions/ts1').pricePaidInr, 1083);
  // wrong amount: the full price paid against a credited order
  const b = await orderOk(srv, 'ts2', 'till_boards');
  const pb = srv.rzp.pay(b.orderId, { amount: 226200 });
  const wb = await webhook(srv, { id: pb.id, entity: 'payment', order_id: b.orderId, amount: 226200, currency: 'INR', status: 'captured' });
  assert.notEqual(wb.json && wb.json.granted, true);
  assert.equal(db.read('subscriptions/ts2'), undefined, 'nothing granted on a mismatched amount');
  assert.equal(db.read('packEntitlements/ts2/packs/test_series:all').creditedToPass, false, 'and the credit is not spent');
  const vb = await verify(srv, 'ts2', b.orderId, pb.id);
  assert.notEqual(vb.status, 200);
  assert.equal(db.read('subscriptions/ts2'), undefined);
});

test('GRANT · CONFLICT: two credited orders (different GST state -> not reused) both paid -> both passes granted for what was paid; the Test Series is marked once and the second order is flagged, counted, never thrown', async (t) => {
  const db = memoryFirestore();
  seedTs(db, 'ts1');
  const srv = await start({ db });
  t.after(srv.close);
  const a = await orderOk(srv, 'ts1', 'till_boards', { gstBuyer: GST_BUYER_KA });
  const b = await orderOk(srv, 'ts1', 'till_boards', { gstBuyer: { stateCode: '27', pin: '411001' } });
  assert.notEqual(a.orderId, b.orderId);
  const pa = srv.rzp.pay(a.orderId);
  const pb = srv.rzp.pay(b.orderId);
  assert.equal((await verify(srv, 'ts1', a.orderId, pa.id)).status, 200);
  const vb = await verify(srv, 'ts1', b.orderId, pb.id);
  assert.equal(vb.status, 200, vb.text);
  assert.equal(db.read('packEntitlements/ts1/packs/test_series:all').creditedOrderId, a.orderId);
  assert.equal(db.read(`payOrders/${a.orderId}`).tsUpgradeCreditConflict, undefined);
  assert.equal(db.read(`payOrders/${b.orderId}`).tsUpgradeCreditConflict, true);
  assert.ok(srv.events.includes('payments.verify.ts_upgrade_credit_conflict'));
});

test('GRANT · CONFLICT: the entitlement no longer names the order the credit was proved from (replaced between order and payment) -> pass granted for what was paid, entitlement NOT marked, order flagged', async (t) => {
  const db = memoryFirestore();
  seedTs(db, 'ts1');
  const srv = await start({ db });
  t.after(srv.close);
  const r = await orderOk(srv, 'ts1', 'till_boards');
  assert.equal(r.amountPaise, 108300);
  // Between order and payment the entitlement is replaced by one from a DIFFERENT Test Series order.
  db.docs.set('packEntitlements/ts1/packs/test_series:all', { data: { ...db.read('packEntitlements/ts1/packs/test_series:all'), orderId: 'order_TS_OTHER' }, version: 9 });
  const p = srv.rzp.pay(r.orderId);
  const v = await verify(srv, 'ts1', r.orderId, p.id);
  assert.equal(v.status, 200, v.text);
  assert.equal(db.read('subscriptions/ts1').passType, 'till_boards', 'the money was paid: the pass is granted');
  const ent = db.read('packEntitlements/ts1/packs/test_series:all');
  assert.equal(ent.creditedToPass, false, 'a different purchase is never marked by this order');
  assert.equal(ent.creditedOrderId, undefined);
  assert.equal(db.read(`payOrders/${r.orderId}`).tsUpgradeCreditConflict, true);
  assert.ok(srv.events.includes('payments.verify.ts_upgrade_credit_conflict'));
});

test('FAIL CLOSED · self-consistent Test Series orders whose base is not 999 or whose GST is not 18% are not credited (full price)', async (t) => {
  const db = memoryFirestore();
  seedTs(db, 'base1099', { order: { baseInr: 1099, gstInr: 180, totalInr: 1279, amountPaise: 127900 }, pack: { pricePaidInr: 1279 } });
  seedTs(db, 'gst0', { order: { gstInr: 0, totalInr: 999, amountPaise: 99900 }, pack: { pricePaidInr: 999 } });
  const srv = await start({ db });
  t.after(srv.close);
  for (const uid of ['base1099', 'gst0']) {
    const r = await orderOk(srv, uid, 'till_boards');
    assert.equal(r.amountPaise, 226200, uid);
    assert.equal('tsUpgradeCreditInr' in r, false, uid);
  }
});

/* ── FAIL CLOSED: full price, purchase still made, nothing credited ──────────────────────────────────────────────── */

test('FAIL CLOSED · refunded, revoked, duplicate, already credited, other uid, gift/no order, unpaid, unclaimed guest, pre-GST all-in, payment mismatch -> full price 2262, no credit fields', async (t) => {
  const db = memoryFirestore();
  const cases = {
    refunded: { order: { refunded: true } },
    refundedAt: { order: { refundedAt: new Date(NOW) } },
    packRefunded: { pack: { refundedAt: new Date(NOW) } },
    revoked: { pack: { revoked: true } },
    duplicate: { order: { duplicate: true } },
    credited: { pack: { creditedToPass: true, creditedOrderId: 'order_OLD' } },
    noFlag: { pack: { creditedToPass: undefined } },
    otherUid: { order: { uid: 'someone_else' } },
    unpaid: { order: { status: 'created' } },
    unclaimed: { order: { status: 'paid_unclaimed' } },
    preGst: { order: { amountPaise: 99900, baseInr: undefined, gstInr: undefined, totalInr: undefined, gstRate: undefined }, pack: { pricePaidInr: 999 } },
    payMismatch: { order: { paymentId: 'pay_ELSEWHERE' } },
  };
  for (const [uid, c] of Object.entries(cases)) seedTs(db, uid, c);
  // gift / admin grant with no paid order of its own: the entitlement names an order that does not exist
  db.docs.set('packEntitlements/gift/packs/test_series:all', { data: { packId: 'test_series:all', sku: 'test_series', target: 'all', pricePaidInr: 1179, paidAt: NOW - 1000, orderId: 'order_NONE', paymentRef: 'admin', creditedToPass: false }, version: 1 });
  db.docs.set('packEntitlements/giftNoOrder/packs/test_series:all', { data: { packId: 'test_series:all', sku: 'test_series', target: 'all', pricePaidInr: 0, paidAt: NOW - 1000, creditedToPass: false }, version: 1 });
  const srv = await start({ db });
  t.after(srv.close);
  for (const uid of [...Object.keys(cases), 'gift', 'giftNoOrder']) {
    const r = await orderOk(srv, uid, 'till_boards');
    assert.equal(r.amountPaise, 226200, `${uid}: full price`);
    assert.deepEqual(r.gst, { baseInr: 1917, gstInr: 345, totalInr: 2262 }, uid);
    assert.equal('tsUpgradeCreditInr' in r, false, uid);
    const stored = db.read(`payOrders/${r.orderId}`);
    for (const k of TS_KEYS) assert.equal(k in stored, false, `${uid}: ${k}`);
    const notes = lastRzpOrder(srv).body.notes;
    assert.deepEqual(Object.keys(notes).sort(), ['offerKey', 'passType', 'uid'], `${uid}: notes unchanged`);
  }
  assert.ok(srv.events.includes('payments.order.ts_upgrade_credit_refused.order_flagged'));
  assert.ok(srv.events.includes('payments.order.ts_upgrade_credit_refused.already_credited'));
  assert.ok(srv.events.includes('payments.order.ts_upgrade_credit_refused.other_uid'));
});

test('FAIL CLOSED · an unreadable entitlement / order gives credit 0; the order is still made at full price, and it is counted', async (t) => {
  const real = memoryFirestore();
  seedTs(real, 'ts1');
  for (const broken of ['packEntitlements/ts1/packs/test_series:all', 'payOrders/order_TS_ts1']) {
    const db = Object.create(real);
    db.collection = (name) => {
      const c = real.collection(name);
      return {
        ...c,
        doc: (id) => {
          const r = c.doc(id);
          const wrap = (rr) => ({ ...rr, collection: (sub) => { const cc = rr.collection(sub); return { ...cc, doc: (i) => { const d = cc.doc(i); return d.key === broken ? { ...d, get: async () => { throw new Error('read failed'); } } : d; } }; } });
          return r.key === broken ? { ...r, get: async () => { throw new Error('read failed'); } } : wrap(r);
        },
      };
    };
    const srv = await start({ db });
    t.after(srv.close);
    const r = await orderOk(srv, 'ts1', 'till_boards');
    assert.equal(r.amountPaise, 226200, broken);
    assert.ok(srv.events.includes('payments.order.ts_upgrade_credit_read_failed'), broken);
  }
});

test('KILL SWITCH · TS_UPGRADE_CREDIT_DISABLED=1 -> full price, an event, /mine reports no credit; switching it off credits again', async (t) => {
  const db = memoryFirestore();
  seedTs(db, 'ts1');
  const off = await start({ db, env: { ...ENV_ON, TS_UPGRADE_CREDIT_DISABLED: '1' }, licensees: LIC(['ts1']) });
  t.after(off.close);
  const r = await orderOk(off, 'ts1', 'till_boards');
  assert.equal(r.amountPaise, 226200);
  assert.ok(off.events.includes('payments.order.ts_upgrade_credit_disabled'));
  const m = await mine(off, 'ts1');
  assert.deepEqual(m.json.boardPassCredit, { creditInr: 0, expiresAtMs: null, payInr: null });
  // REUSE: the full-price open order made while the switch was on is NOT handed back to a credited request
  const on = await start({ db, rzp: off.rzp, licensees: LIC(['ts1']) });
  t.after(on.close);
  const r2 = await orderOk(on, 'ts1', 'till_boards');
  assert.notEqual(r2.orderId, r.orderId, 'a pre-credit open order is never reused with the wrong terms');
  assert.equal(r2.amountPaise, 108300);
  // ...and a credited open order IS reused by the same credited request (one Razorpay order for two tabs)
  const r3 = await orderOk(on, 'ts1', 'till_boards');
  assert.equal(r3.orderId, r2.orderId);
  assert.equal(r3.amountPaise, 108300);
  assert.deepEqual(r3.gst, { baseInr: 918, gstInr: 165, totalInr: 1083 });
  assert.equal(r3.tsUpgradeCreditInr, 999);
  // and the reverse: switched off again, the credited open order is not handed back for a full-price request
  const off2 = await start({ db, rzp: off.rzp, env: { ...ENV_ON, TS_UPGRADE_CREDIT_DISABLED: '1' } });
  t.after(off2.close);
  const r4 = await orderOk(off2, 'ts1', 'till_boards');
  assert.notEqual(r4.orderId, r2.orderId);
  assert.equal(r4.amountPaise, 226200);
});

/* ── byte-identical for everyone else ────────────────────────────────────────────────────────────────────────────── */

test('BYTE-IDENTICAL · a student with no Test Series: the stored order, Razorpay notes, response and /mine credit carry nothing new', async (t) => {
  const db = memoryFirestore();
  const srv = await start({ db, licensees: LIC(['plain']) });
  t.after(srv.close);
  const r = await orderOk(srv, 'plain', 'till_boards', { gstBuyer: GST_BUYER_KA });
  assert.deepEqual(Object.keys(r).sort(), ['amountPaise', 'gst', 'keyId', 'ok', 'orderId']);
  const stored = db.read(`payOrders/${r.orderId}`);
  assert.deepEqual(Object.keys(stored).sort(), ['amountPaise', 'baseInr', 'createdAt', 'gstBuyer', 'gstInr', 'gstRate', 'offerKey', 'passType', 'status', 'totalInr', 'uid']);
  assert.deepEqual(lastRzpOrder(srv).body, { amount: 226200, currency: 'INR', notes: { uid: 'plain', passType: 'till_boards', offerKey: 'founding' } });
  const m = await mine(srv, 'plain');
  assert.deepEqual(m.json.boardPassCredit, { creditInr: 0, expiresAtMs: null, payInr: null });
  // and a pack / the month pass is not touched by the rule at all
  const pack = await orderOk(srv, 'plain', 'pack_chapter', { packTarget: 'triangles' });
  assert.equal(pack.amountPaise, 5800);
  assert.equal(srv.events.some((e) => e.startsWith('payments.order.ts_upgrade')), false, 'no TS counter for a non-owner');
});

test('NOT STACKED · a PACK-CREDIT-1 credit (pre-5 Nov pack, inside 7 days) wins; the Test Series credit is then not applied', async (t) => {
  const at = Date.parse('2026-11-08T12:00:00+05:30');
  const db = memoryFirestore();
  seedTs(db, 'both');
  db.docs.set('packEntitlements/both/packs/pack_chapter:triangles', { data: { packId: 'pack_chapter:triangles', sku: 'pack_chapter', target: 'triangles', pricePaidInr: 49, paidAt: Date.parse('2026-11-04T12:00:00+05:30'), orderId: 'o_p', paymentRef: 'p_p', creditedToPass: false }, version: 1 });
  const srv = await start({ db, nowMs: at });
  t.after(srv.close);
  const r = await orderOk(srv, 'both', 'till_boards');
  assert.equal(r.amountPaise, 226200 - 4900);
  const stored = db.read(`payOrders/${r.orderId}`);
  assert.equal(stored.packCreditInr, 49);
  for (const k of TS_KEYS) assert.equal(k in stored, false, k);
});

/* ── /api/packs/mine ─────────────────────────────────────────────────────────────────────────────────────────────── */

test('/MINE · a Test Series owner gets boardPassCredit { creditInr 999, payInr 1083, baseInr 918, gstInr 165, fullBaseInr 1917, kind } - the same numbers the order route charges', async (t) => {
  const db = memoryFirestore();
  seedTs(db, 'ts1');
  seedTs(db, 'spent', { pack: { creditedToPass: true } });
  const srv = await start({ db, licensees: LIC(['ts1', 'spent']) });
  t.after(srv.close);
  const m = await mine(srv, 'ts1');
  assert.equal(m.status, 200, m.text);
  assert.deepEqual(m.json.boardPassCredit, { creditInr: 999, expiresAtMs: null, payInr: 1083, kind: 'test_series_upgrade', baseInr: 918, gstInr: 165, fullBaseInr: 1917 });
  assert.equal(m.json.ownsTestSeries, true);
  const r = await orderOk(srv, 'ts1', 'till_boards');
  assert.equal(r.amountPaise, m.json.boardPassCredit.payInr * 100, '/mine and the order agree');
  const s = await mine(srv, 'spent');
  assert.deepEqual(s.json.boardPassCredit, { creditInr: 0, expiresAtMs: null, payInr: null }, 'a spent credit is not shown');
  const after = await start({ db, nowMs: AFTER_FOUNDING, licensees: LIC(['ts1']) });
  t.after(after.close);
  const ma = await mine(after, 'ts1');
  assert.deepEqual(ma.json.boardPassCredit, { creditInr: 999, expiresAtMs: null, payInr: 1770, kind: 'test_series_upgrade', baseInr: 1500, gstInr: 270, fullBaseInr: 2499 });
});

/* ── admin-moved purchases ───────────────────────────────────────────────────────────────────────────────────────── */

test('ADMIN-MOVE · a moved Test Series keeps its original paid order (uid moved with it) -> the NEW holder is credited, the old one is not; a credited Test Series cannot be moved', async (t) => {
  const db = memoryFirestore();
  const { orderId } = seedTs(db, 'phoneUid');
  const moved = await movePackOrder({ db, orderId, toUid: 'googleUid', adminUid: 'admin1', nowMs: NOW });
  assert.equal(moved.moved, true);
  assert.equal(db.read(`payOrders/${orderId}`).uid, 'googleUid');
  assert.equal(db.read('packEntitlements/googleUid/packs/test_series:all').orderId, orderId);
  const srv = await start({ db });
  t.after(srv.close);
  assert.equal((await orderOk(srv, 'phoneUid', 'till_boards')).amountPaise, 226200, 'the old account no longer holds it');
  const r = await orderOk(srv, 'googleUid', 'till_boards');
  assert.equal(r.amountPaise, 108300, 'the moved record proves the paid purchase');
  const p = srv.rzp.pay(r.orderId);
  assert.equal((await verify(srv, 'googleUid', r.orderId, p.id)).status, 200);
  assert.equal(db.read('packEntitlements/googleUid/packs/test_series:all').creditedToPass, true);
  await assert.rejects(movePackOrder({ db, orderId, toUid: 'thirdUid', adminUid: 'admin1', nowMs: NOW }), /credited to a Board Pass/);
});

/* ── GST invoice ─────────────────────────────────────────────────────────────────────────────────────────────────── */

const withCheck = (first14) => `${first14}${g.gstinCheckChar(first14)}`;
const INVOICE_ENV = {
  GST_INVOICE_ENABLED: '1',
  SELLER_GSTIN: withCheck('29AAAAA0000A1Z'), // test fixture (Karnataka code, valid checksum), not the company's
  SELLER_ADDRESS: 'Test address line, Test City, Karnataka 560001',
  SAC_BOARD_PASS: '990000', // test fixture in the SAC format
  SAC_PACKS: '990000',
};

test('INVOICE · the paid upgrade is invoiced (not held): taxable 918.00 + GST 165.00 = 1083.00 exactly; intra-state CGST/SGST split; the Test Series is named as the credited prior purchase', async (t) => {
  const db = memoryFirestore();
  seedTs(db, 'ts1');
  const srv = await start({ db });
  t.after(srv.close);
  const r = await orderOk(srv, 'ts1', 'till_boards', { gstBuyer: GST_BUYER_KA });
  const p = srv.rzp.pay(r.orderId);
  assert.equal((await verify(srv, 'ts1', r.orderId, p.id)).status, 200);
  const stored = db.read(`payOrders/${r.orderId}`);
  const config = g.resolveInvoiceConfig(INVOICE_ENV);
  assert.equal(config.ready, true);
  assert.equal(g.heldReasonFor(stored, config), null, 'invoiced, not held');
  const a = g.invoiceAmountsFor(stored);
  assert.equal(a.taxablePaise, 91800);
  assert.equal(a.gstPaise, 16500);
  assert.equal(a.cgstPaise + a.sgstPaise, 16500);
  assert.equal(a.cgstPaise, 8250);
  assert.equal(a.sgstPaise, 8250);
  assert.equal(a.igstPaise, 0);
  assert.equal(a.totalPaise, stored.amountPaise, 'the breakup reproduces the charge exactly');
  const inv = g.buildInvoiceRecord({ order: stored, orderId: r.orderId, paymentId: p.id, config, fy: '26-27', seq: 7, issuedAtMs: NOW, contact: { name: 'Asha', email: 'a@example.com' } });
  assert.equal(inv.taxablePaise, 91800);
  assert.equal(inv.totalPaise, 108300);
  assert.match(inv.line.description, /Board Pass .*upgrade from the Test Series Pack/);
  assert.equal(inv.line.taxablePaise, 91800);
  assert.deepEqual(inv.priorCredit, { description: 'Test Series Pack', orderId: 'order_TS_ts1', listTaxablePaise: 191700, creditedTaxablePaise: 99900 });
  const text = invoiceTextBlocks(inv);
  assert.deepEqual(text.totals.map(([l]) => l), ['Taxable value', 'CGST @ 9%', 'SGST @ 9%', 'Total (amount paid)']);
  assert.match(text.note, /Board Pass .*1,917\.00 less .*999\.00 already paid \(taxable value\) for the Test Series Pack \(order order_TS_ts1, invoiced separately\)\. GST is charged on the difference only\./);
  // inter-state: IGST 165 on 918
  const inter = g.invoiceAmountsFor({ ...stored, gstBuyer: { stateCode: '27', pin: '411001' } });
  assert.equal(inter.igstPaise, 16500);
  assert.equal(inter.taxablePaise + inter.igstPaise, 108300);
  // after founding: 1500 + 270
  const a2 = g.invoiceAmountsFor({ ...stored, amountPaise: 177000, baseInr: 1500, gstInr: 270, totalInr: 1770, tsUpgradeFullBaseInr: 2499 });
  assert.equal(a2.taxablePaise, 150000);
  assert.equal(a2.gstPaise, 27000);
  // fields that do not add up are HELD, never invoiced
  assert.equal(g.heldReasonFor({ ...stored, tsUpgradeFullBaseInr: 2499 }, config), 'amount_mismatch');
  assert.equal(g.heldReasonFor({ ...stored, gstInr: 166 }, config), 'amount_mismatch');
  // an ordinary Board Pass invoice has no prior-credit block and the old line
  const plain = { ...stored };
  for (const k of TS_KEYS) delete plain[k];
  Object.assign(plain, { amountPaise: 226200, baseInr: 1917, gstInr: 345, totalInr: 2262 });
  const pinv = g.buildInvoiceRecord({ order: plain, orderId: 'o2', paymentId: 'p2', config, fy: '26-27', seq: 8, issuedAtMs: NOW, contact: {} });
  assert.equal('priorCredit' in pinv, false);
  assert.equal(pinv.line.description, 'LazyTopper Board Pass (Premium access till CBSE Class 10 boards)');
  assert.equal(invoiceTextBlocks(pinv).note, null);
});
