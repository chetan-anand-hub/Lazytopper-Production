// RAZORPAY-1 — a student buys a pass. Money path: every check below is a reason a
// payment is NOT believed, and each one is shown refusing.
//
// Z8 · valid / invalid signature; tampered amount; uid mismatch; replayed verify and
// webhook grant once; switches off -> 404 (and, over the REAL index.cjs, the same 404
// the gateway gives any unknown path). The pricing page half of "switches off" is in
// src/components/pricing/PassCheckout.test.tsx.
//
// ★ MUTATIONS (each run against THIS file only, each shown red, each restored):
//   MA  payments.cjs takes the order amount from the request body
//        -> "Z2 · the order amount is the SERVER price; a request amount is ignored" red
//   MB  payments.cjs skips the amount check in verify
//        -> "Z4 · TAMPERED amount: Razorpay reports a different amount -> 400, no grant" red
//   MC  payments.cjs compares signatures with === instead of crypto.timingSafeEqual
//        -> "Z4 · STATIC: every signature comparison is timing-safe" red
//
// Run: node --test lazytopper/server/routes/payments.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const {
  createPaymentRoutes,
  isPaymentsEnabled,
  isCheckoutSignatureValid,
  isWebhookSignatureValid,
  timingSafeHexEqual,
  quotePass,
  PAY_ORDER_PATH,
  PAY_VERIFY_PATH,
  PAY_WEBHOOK_PATH,
  PAY_STATUS_PATH,
} = require('./payments.cjs');
const { createHttpUtils } = require('../services/httpUtils.cjs');
const pricing = require('../services/passPricing.cjs');

const PAYMENTS_CJS = path.join(__dirname, 'payments.cjs');
const INDEX_CJS = path.resolve(__dirname, '..', 'index.cjs');

const KEY_ID = 'rzp_test_KEYID';
const KEY_SECRET = 'test_key_secret_never_sent';
const WEBHOOK_SECRET = 'test_webhook_secret';
const ENV_ON = {
  PAYMENTS_ENABLED: '1',
  RAZORPAY_KEY_ID: KEY_ID,
  RAZORPAY_KEY_SECRET: KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
};
const DAY = 24 * 60 * 60 * 1000;
const istNoon = (isoDate) => Date.parse(`${isoDate}T12:00:00+05:30`);
const NOW = istNoon('2026-09-27');
const ms = (v) => (v instanceof Date ? v.getTime() : v);

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');
const checkoutSig = (orderId, paymentId, secret = KEY_SECRET) => hmac(secret, `${orderId}|${paymentId}`);

/* ── in-memory Firestore with optimistic transactions (the passGrant.test harness) ── */
function memoryFirestore(seed = {}) {
  const docs = new Map();
  for (const [key, data] of Object.entries(seed)) docs.set(key, { data: { ...data }, version: 1 });
  const stats = { commits: 0, retries: 0 };
  const yieldNow = () => new Promise((r) => setImmediate(r));
  const snapOf = (entry) => ({ exists: !!entry, data: () => (entry ? { ...entry.data } : undefined) });
  function write(key, data, opts) {
    const prev = docs.get(key);
    const base = opts && opts.merge && prev ? prev.data : {};
    docs.set(key, { data: { ...base, ...data }, version: (prev ? prev.version : 0) + 1 });
  }
  // PRICE-FIXED-1: equality-only queries (`where(...).where(...).limit(n).get()`) over a collection path.
  function query(prefix, filters = [], max = Infinity) {
    const api = {
      where(field, op, value) {
        assert.equal(op, '==', 'the fake supports == only');
        return query(prefix, [...filters, [field, value]], max);
      },
      limit: (n) => query(prefix, filters, n),
      async get() {
        await yieldNow();
        const rows = [];
        for (const [k, e] of docs) {
          if (!k.startsWith(`${prefix}/`) || k.slice(prefix.length + 1).includes('/')) continue;
          if (filters.every(([f, v]) => e.data[f] === v)) rows.push({ id: k.slice(prefix.length + 1), data: () => ({ ...e.data }) });
          if (rows.length >= max) break;
        }
        return { empty: rows.length === 0, size: rows.length, docs: rows };
      },
    };
    return api;
  }
  function ref(key) {
    return {
      key,
      collection: (sub) => ({ doc: (id) => ref(`${key}/${sub}/${id}`), ...query(`${key}/${sub}`) }),
      async get() { await yieldNow(); return snapOf(docs.get(key)); },
      async set(data, opts) { await yieldNow(); write(key, data, opts); },
    };
  }
  return {
    docs,
    stats,
    read: (key) => (docs.get(key) ? { ...docs.get(key).data } : undefined),
    version: (key) => (docs.get(key) ? docs.get(key).version : 0),
    collection: (name) => ({ doc: (id) => ref(`${name}/${id}`), ...query(name) }),
    async runTransaction(fn) {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const seen = new Map();
        const pending = [];
        const tx = {
          async get(r) {
            await yieldNow();
            const entry = docs.get(r.key);
            seen.set(r.key, entry ? entry.version : 0);
            return snapOf(entry);
          },
          set(r, data, opts) { pending.push([r.key, data, opts]); },
        };
        const out = await fn(tx);
        await yieldNow();
        const conflict = [...seen].some(([k, v]) => (docs.get(k) ? docs.get(k).version : 0) !== v);
        if (conflict) { stats.retries += 1; continue; }
        for (const [k, d, o] of pending) write(k, d, o);
        stats.commits += 1;
        return out;
      }
      throw new Error('transaction contention: too many retries');
    },
  };
}

/* ── a fake Razorpay REST API, recording every call ─────────────────────────────── */
function fakeRazorpay() {
  const orders = new Map();
  const payments = new Map();
  const calls = [];
  const state = { down: false };
  let seq = 0;
  const reply = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json });
  async function fetchImpl(url, init = {}) {
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body, auth: init.headers && init.headers.Authorization });
    if (state.down) throw new Error('getaddrinfo ENOTFOUND api.razorpay.com');
    const expectedAuth = `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`;
    if (!init.headers || init.headers.Authorization !== expectedAuth) return reply(401, { error: { code: 'BAD_REQUEST_ERROR' } });
    const u = new URL(url);
    let m;
    if (method === 'POST' && u.pathname === '/v1/orders') {
      seq += 1;
      const order = { id: `order_T${seq}`, entity: 'order', amount: body.amount, currency: body.currency, notes: body.notes, status: 'created' };
      orders.set(order.id, order);
      return reply(200, order);
    }
    // PAY-STATUS-1 · the order's payments (razorpay.com/docs/api/orders/fetch-payments):
    // { entity: "collection", count, items: [payment, ...] }.
    if (method === 'GET' && (m = u.pathname.match(/^\/v1\/orders\/([^/]+)\/payments$/))) {
      const items = [...payments.values()].filter((p) => p.order_id === m[1]).map((p) => ({ ...p }));
      return reply(200, { entity: 'collection', count: items.length, items });
    }
    if (method === 'GET' && (m = u.pathname.match(/^\/v1\/payments\/([^/]+)$/))) {
      const p = payments.get(m[1]);
      return p ? reply(200, { ...p }) : reply(400, { error: { code: 'BAD_REQUEST_ERROR' } });
    }
    if (method === 'POST' && (m = u.pathname.match(/^\/v1\/payments\/([^/]+)\/capture$/))) {
      const p = payments.get(m[1]);
      if (!p || p.status !== 'authorized' || body.amount !== p.amount) return reply(400, { error: { code: 'BAD_REQUEST_ERROR' } });
      p.status = 'captured';
      return reply(200, { ...p });
    }
    return reply(404, {});
  }
  /** A payment made against an order in the fake. */
  function pay(orderId, { id = `pay_${orderId}`, amount, status = 'captured', currency = 'INR' } = {}) {
    const order = orders.get(orderId);
    const p = { id, entity: 'payment', order_id: orderId, amount: amount === undefined ? order.amount : amount, currency, status };
    payments.set(id, p);
    return p;
  }
  return { fetchImpl, orders, payments, calls, pay, state };
}

/* ── the routes behind a real HTTP server, so bodies arrive as real bytes ────────── */
async function startRoutes({ env = ENV_ON, db = memoryFirestore(), rzp = fakeRazorpay(), now = () => NOW, telemetry, topupBonus, calendarOffer = false } = {}) {
  const { sendJson } = createHttpUtils('*');
  const events = [];
  const tele = telemetry || { increment: (e) => events.push(e) };
  const verifiedCaller = {
    async resolveVerifiedUid(req) {
      const h = String(req.headers.authorization || '');
      return h.startsWith('Bearer uid:') ? h.slice('Bearer uid:'.length) : '';
    },
  };
  const routes = createPaymentRoutes({
    sendJson, verifiedCaller, adminFirestore: db, telemetry: tele, env, fetchImpl: rzp.fetchImpl, now,
    // PRICING-1: `calendarOffer` leaves the offer to the injected clock (the production path).
    ...(calendarOffer ? {} : { foundingOfferOpen: true }),
    ...(topupBonus ? { topupBonus } : {}),
  });
  const server = http.createServer((req, res) => {
    const p = String(req.url).split('?')[0];
    let h;
    if (req.method === 'POST' && p === PAY_ORDER_PATH) h = routes.handleOrder;
    else if (req.method === 'POST' && p === PAY_VERIFY_PATH) h = routes.handleVerify;
    else if (req.method === 'POST' && p === PAY_WEBHOOK_PATH) h = routes.handleWebhook;
    else if (req.method === 'POST' && p === PAY_STATUS_PATH) h = routes.handleStatus;
    if (!h) return sendJson(res, 404, { error: 'Not Found' });
    return Promise.resolve(h(req, res)).catch((e) => sendJson(res, 500, { error: e.message }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return { port, db, rzp, events, close: () => new Promise((r) => server.close(r)) };
}

function request(port, urlPath, { body, raw, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = raw !== undefined ? raw : JSON.stringify(body === undefined ? {} : body);
    const req = http.request(
      { host: '127.0.0.1', port, path: urlPath, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers } },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(text); } catch {}
          resolve({ status: res.statusCode, json, text });
        });
      },
    );
    req.on('error', reject);
    req.end(payload);
  });
}

const asUid = (uid) => ({ Authorization: `Bearer uid:${uid}` });

async function createOrder(srv, uid = 'u1', passType = 'month', extraBody = {}) {
  const r = await request(srv.port, PAY_ORDER_PATH, { body: { passType, ...extraBody }, headers: asUid(uid) });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json;
}

function webhookBody(payment, event = 'payment.captured') {
  // Deliberately NOT JSON.stringify's canonical spacing: the signature must be over
  // these exact bytes, so a server that re-serialises would reject it.
  return `{"entity":"event","event":${JSON.stringify(event)},"payload":{"payment":{"entity":${JSON.stringify(payment, null, 1)}}},"created_at":1790000000}`;
}

/* ══════════════════════════════════════════════════════════════════════════
   Z1 — dark by default
   ══════════════════════════════════════════════════════════════════════════ */

test('Z1 · PAYMENTS_ENABLED unset: all four routes answer 404 and touch nothing', async (t) => {
  const rzp = fakeRazorpay();
  const db = memoryFirestore();
  const srv = await startRoutes({ env: { RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET }, rzp, db });
  t.after(srv.close);
  for (const p of [PAY_ORDER_PATH, PAY_VERIFY_PATH, PAY_WEBHOOK_PATH, PAY_STATUS_PATH]) {
    const r = await request(srv.port, p, { body: { passType: 'month', orderId: 'order_X' }, headers: asUid('u1') });
    assert.equal(r.status, 404, p);
    assert.deepEqual(r.json, { error: 'Not Found' }, p);
  }
  assert.equal(rzp.calls.length, 0, 'a dark route called Razorpay');
  assert.equal(db.docs.size, 0, 'a dark route wrote to Firestore');
});

test('Z1 · the switch grammar: only an explicit on-value enables payments', () => {
  for (const v of ['1', 'true', 'on', 'yes', 'TRUE', ' 1 ']) assert.equal(isPaymentsEnabled({ PAYMENTS_ENABLED: v }), true, v);
  for (const v of [undefined, '', '0', 'false', 'off', 'no', 'enabled']) assert.equal(isPaymentsEnabled({ PAYMENTS_ENABLED: v }), false, String(v));
  assert.equal(isPaymentsEnabled({}), false);
});

test('Z1 · switched on but a key is missing -> 503, never a half-configured charge', async (t) => {
  const rzp = fakeRazorpay();
  const srv = await startRoutes({ env: { PAYMENTS_ENABLED: '1', RAZORPAY_KEY_ID: KEY_ID }, rzp });
  t.after(srv.close);
  assert.equal((await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'month' }, headers: asUid('u1') })).status, 503);
  assert.equal((await request(srv.port, PAY_WEBHOOK_PATH, { raw: '{}' })).status, 503);
  assert.equal(rzp.calls.length, 0);
});

/* ══════════════════════════════════════════════════════════════════════════
   Z2 — the order
   ══════════════════════════════════════════════════════════════════════════ */

test('Z2 · a signed-out caller cannot create an order (401), and nothing is created', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const r = await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'month' } });
  assert.equal(r.status, 401);
  assert.equal(srv.rzp.calls.length, 0);
});

test('Z2 · the order amount is the SERVER price; a request amount is ignored', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const out = await createOrder(srv, 'u1', 'month', { amount: 100, amountPaise: 100, price: 1, pricePaidInr: 1 });
  assert.equal(out.amountPaise, pricing.PRICE_MONTHLY_FOUNDING_INR * 100);
  assert.equal(out.amountPaise, 59900);
  const sent = srv.rzp.calls.find((c) => c.method === 'POST' && c.url.endsWith('/v1/orders'));
  assert.equal(sent.body.amount, 59900, 'Razorpay was asked for a request-supplied amount');
  assert.equal(sent.body.currency, 'INR');
  assert.deepEqual(sent.body.notes, { uid: 'u1', passType: 'month', offerKey: 'founding' });
  // Stored with the Admin SDK, exactly the Z2 shape.
  const stored = srv.db.read(`payOrders/${out.orderId}`);
  assert.deepEqual(Object.keys(stored).sort(), ['amountPaise', 'createdAt', 'offerKey', 'passType', 'status', 'uid']);
  assert.equal(stored.uid, 'u1');
  assert.equal(stored.amountPaise, 59900);
  assert.equal(stored.status, 'created');
  assert.equal(ms(stored.createdAt), NOW);
  // The browser gets the PUBLIC key id — never the secret.
  assert.deepEqual(Object.keys(out).sort(), ['amountPaise', 'keyId', 'ok', 'orderId']);
  assert.equal(out.keyId, KEY_ID);
  assert.ok(!JSON.stringify(out).includes(KEY_SECRET));
});

test('Z2 · till-boards is priced by the same server rule as the grant (quotePass == grant price)', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const out = await createOrder(srv, 'u1', 'till_boards');
  // PRICE-FIXED-1: the Board Pass is a FIXED ₹1,917 (it was ₹2,396 on 2026-09-27 under the shrinking rule).
  assert.equal(out.amountPaise, 191700);
  assert.equal(quotePass({}, 'till_boards', NOW, { foundingOfferOpen: true }).amountPaise, 191700);
  // A stored lastPaymentRef can never turn a quote into a "replay".
  assert.equal(quotePass({ lastPaymentRef: 'quote' }, 'month', NOW, { foundingOfferOpen: true }).amountPaise, 59900);
});

test('Z2 · an unknown passType is refused before Razorpay is called', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const r = await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'forever' }, headers: asUid('u1') });
  assert.equal(r.status, 400);
  assert.equal(srv.rzp.calls.length, 0);
});

/* ══════════════════════════════════════════════════════════════════════════
   Z4 — verify
   ══════════════════════════════════════════════════════════════════════════ */

test('Z4 · VALID signature + captured payment of the stored amount -> grant, order paid', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const p = srv.rzp.pay(orderId);
  const r = await request(srv.port, PAY_VERIFY_PATH, {
    body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('u1'),
  });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.replayed, false);
  assert.equal(r.json.passEnd, new Date(istNoon('2026-10-27')).toISOString());
  const sub = srv.db.read('subscriptions/u1');
  assert.equal(sub.tier, 'premium');
  assert.equal(sub.lastPaymentRef, p.id);
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'paid');
  assert.equal(srv.db.read(`payOrders/${orderId}`).paymentId, p.id);
  assert.ok(srv.db.read(`subscriptions/u1/payments/${p.id}`));
  assert.ok(srv.events.includes('payments.verify.granted'));
});

test('Z4 · INVALID signature -> 400, no grant, no Razorpay call, telemetry', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const p = srv.rzp.pay(orderId);
  const before = srv.rzp.calls.length;
  for (const signature of [checkoutSig(orderId, p.id, 'wrong-secret'), checkoutSig(orderId, 'pay_other'), 'ab', '0'.repeat(64)]) {
    const r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId, paymentId: p.id, signature }, headers: asUid('u1') });
    assert.equal(r.status, 400, signature);
    assert.equal(r.json.reason, 'bad_signature');
  }
  assert.equal(srv.rzp.calls.length, before, 'a bad signature still reached Razorpay');
  assert.equal(srv.db.read('subscriptions/u1'), undefined);
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'created');
  assert.ok(srv.events.includes('payments.verify.rejected.bad_signature'));
});

test('Z4 · TAMPERED amount: Razorpay reports a different amount -> 400, no grant', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const p = srv.rzp.pay(orderId, { amount: 100 }); // ₹1 paid against a ₹599 order
  const r = await request(srv.port, PAY_VERIFY_PATH, {
    body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('u1'),
  });
  assert.equal(r.status, 400);
  assert.equal(r.json.reason, 'amount_mismatch');
  assert.equal(srv.db.read('subscriptions/u1'), undefined, 'a tampered amount was granted');
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'created');
  assert.ok(srv.events.includes('payments.verify.rejected.amount_mismatch'));
});

test('Z4 · UID MISMATCH: another student cannot claim this order -> 400, no grant', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv, 'u1');
  const p = srv.rzp.pay(orderId);
  const r = await request(srv.port, PAY_VERIFY_PATH, {
    body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('intruder'),
  });
  assert.equal(r.status, 400);
  assert.equal(r.json.reason, 'uid_mismatch');
  assert.equal(srv.db.read('subscriptions/intruder'), undefined);
  assert.equal(srv.db.read('subscriptions/u1'), undefined);
  assert.ok(srv.events.includes('payments.verify.rejected.uid_mismatch'));
});

test('Z4 · a payment of ANOTHER order, a failed payment, or a foreign currency -> 400, no grant', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const a = await createOrder(srv);
  const b = await createOrder(srv);
  const onB = srv.rzp.pay(b.orderId, { id: 'pay_onB' });
  // Signature forged as if pay_onB belonged to order A (a leaked secret would allow this).
  let r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId: a.orderId, paymentId: onB.id, signature: checkoutSig(a.orderId, onB.id) }, headers: asUid('u1') });
  assert.equal(r.json.reason, 'order_mismatch');
  const failed = srv.rzp.pay(a.orderId, { id: 'pay_failed', status: 'failed' });
  r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId: a.orderId, paymentId: failed.id, signature: checkoutSig(a.orderId, failed.id) }, headers: asUid('u1') });
  assert.equal(r.json.reason, 'not_captured');
  const usd = srv.rzp.pay(a.orderId, { id: 'pay_usd', currency: 'USD' });
  r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId: a.orderId, paymentId: usd.id, signature: checkoutSig(a.orderId, usd.id) }, headers: asUid('u1') });
  assert.equal(r.json.reason, 'currency_mismatch');
  assert.equal(srv.db.read('subscriptions/u1'), undefined);
});

test('Z4 · an AUTHORIZED payment is captured for the STORED amount, then granted', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const p = srv.rzp.pay(orderId, { status: 'authorized' });
  const r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('u1') });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const capture = srv.rzp.calls.find((c) => c.url.endsWith(`/payments/${p.id}/capture`));
  assert.deepEqual(capture.body, { amount: 59900, currency: 'INR' });
  assert.equal(srv.db.read('subscriptions/u1').tier, 'premium');
});

test('Z4 · REPLAYED verify grants once', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const p = srv.rzp.pay(orderId);
  const body = { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) };
  const first = await request(srv.port, PAY_VERIFY_PATH, { body, headers: asUid('u1') });
  const again = await Promise.all([
    request(srv.port, PAY_VERIFY_PATH, { body, headers: asUid('u1') }),
    request(srv.port, PAY_VERIFY_PATH, { body, headers: asUid('u1') }),
  ]);
  assert.equal(first.json.replayed, false);
  for (const r of again) {
    assert.equal(r.status, 200);
    assert.equal(r.json.replayed, true);
    assert.equal(r.json.passEnd, first.json.passEnd);
  }
  assert.equal(ms(srv.db.read('subscriptions/u1').passEnd), istNoon('2026-10-27'), 'one month, not more');
});

test('Z4 · STATIC: every signature comparison is timing-safe (crypto.timingSafeEqual, never ===)', () => {
  const src = fs.readFileSync(PAYMENTS_CJS, 'utf8');
  // The one comparison primitive.
  const helper = src.match(/function timingSafeHexEqual\([^)]*\) \{[\s\S]*?\n\}/);
  assert.ok(helper, 'timingSafeHexEqual is gone');
  assert.match(helper[0], /crypto\.timingSafeEqual\(/, 'the comparison is not timing-safe');
  assert.doesNotMatch(helper[0], /expected\s*===\s*provided|provided\s*===\s*expected|\.equals\(/);
  // Both signature checks route through it — and nothing compares a signature directly.
  for (const fn of ['isCheckoutSignatureValid', 'isWebhookSignatureValid']) {
    const body = src.match(new RegExp(`function ${fn}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
    assert.ok(body, `${fn} is gone`);
    assert.match(body[0], /timingSafeHexEqual\(/, `${fn} does not use the timing-safe compare`);
  }
  assert.doesNotMatch(src, /signature\s*[!=]==?\s*[a-zA-Z_(]|[a-zA-Z_)]\s*[!=]==?\s*signature\b/, 'a signature is compared with ===');
  // Behaviour agrees with the source.
  assert.equal(timingSafeHexEqual('abcd', 'ABCD'), true);
  assert.equal(timingSafeHexEqual('abcd', 'abce'), false);
  assert.equal(timingSafeHexEqual('abcd', 'abc'), false);
  assert.equal(timingSafeHexEqual('', ''), false);
  assert.equal(isCheckoutSignatureValid({ orderId: 'o', paymentId: 'p', signature: checkoutSig('o', 'p'), keySecret: KEY_SECRET }), true);
  assert.equal(isCheckoutSignatureValid({ orderId: 'o', paymentId: 'p', signature: checkoutSig('o', 'p'), keySecret: '' }), false);
});

/* ══════════════════════════════════════════════════════════════════════════
   Z5 — webhook, signed over the RAW body
   ══════════════════════════════════════════════════════════════════════════ */

test('Z5 · VALID webhook signature over the raw bytes -> grant exactly as verify', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const p = srv.rzp.pay(orderId);
  const raw = webhookBody(p);
  const r = await request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, raw) } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.replayed, false);
  assert.equal(srv.db.read('subscriptions/u1').tier, 'premium');
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'paid');
  assert.ok(srv.events.includes('payments.webhook.granted'));
});

test('Z5 · INVALID webhook signature -> 400, no grant — including a signature over RE-SERIALISED json', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const p = srv.rzp.pay(orderId);
  const raw = webhookBody(p);
  // CONTROL for "raw": the same event, canonically re-serialised, is different bytes.
  const reserialised = JSON.stringify(JSON.parse(raw));
  assert.notEqual(reserialised, raw);
  for (const sig of ['', hmac('wrong', raw), hmac(WEBHOOK_SECRET, reserialised)]) {
    const r = await request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': sig } });
    assert.equal(r.status, 400, `sig ${sig}`);
    assert.equal(r.json.reason, 'bad_signature');
  }
  assert.equal(srv.db.read('subscriptions/u1'), undefined);
  assert.equal(isWebhookSignatureValid({ rawBody: Buffer.from(raw), signature: hmac(WEBHOOK_SECRET, raw), webhookSecret: WEBHOOK_SECRET }), true);
});

test('Z5 · TAMPERED webhook amount -> 400, no grant', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const p = srv.rzp.pay(orderId, { amount: 100 });
  const raw = webhookBody(p);
  const r = await request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, raw) } });
  assert.equal(r.status, 400);
  assert.equal(r.json.reason, 'amount_mismatch');
  assert.equal(srv.db.read('subscriptions/u1'), undefined);
});

test('Z5 · unknown order -> 200 + telemetry, nothing granted; other events are ignored', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const raw = webhookBody({ id: 'pay_x', order_id: 'order_notours', amount: 59900, currency: 'INR', status: 'captured' });
  const r = await request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, raw) } });
  assert.equal(r.status, 200);
  assert.ok(srv.events.includes('payments.webhook.unknown_order'));
  const other = webhookBody({ id: 'pay_x', order_id: 'order_notours' }, 'payment.failed');
  const r2 = await request(srv.port, PAY_WEBHOOK_PATH, { raw: other, headers: { 'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, other) } });
  assert.equal(r2.status, 200);
  assert.equal(r2.json.ignored, true);
  assert.equal([...srv.db.docs.keys()].filter((k) => k.startsWith('subscriptions/')).length, 0);
});

test('Z5 · an order anonymised by account erasure is never granted to "erased"', async (t) => {
  const db = memoryFirestore({ 'payOrders/order_E': { uid: 'erased', passType: 'month', amountPaise: 59900, status: 'created' } });
  const srv = await startRoutes({ db });
  t.after(srv.close);
  const raw = webhookBody({ id: 'pay_E', order_id: 'order_E', amount: 59900, currency: 'INR', status: 'captured' });
  const r = await request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, raw) } });
  assert.equal(r.status, 200);
  assert.equal(db.read('subscriptions/erased'), undefined);
});

test('Z4+Z5 · REPLAYED webhook, and webhook + verify for one payment, grant ONCE', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const p = srv.rzp.pay(orderId);
  const raw = webhookBody(p);
  const sig = hmac(WEBHOOK_SECRET, raw);
  const results = await Promise.all([
    request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': sig } }),
    request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': sig } }),
    request(srv.port, PAY_VERIFY_PATH, { body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('u1') }),
  ]);
  for (const r of results) assert.equal(r.status, 200, r.text);
  assert.equal(results.filter((r) => r.json.replayed === false).length, 1, 'more than one path granted');
  assert.equal(ms(srv.db.read('subscriptions/u1').passEnd), istNoon('2026-10-27'), 'one month, not more');
  // A late retry after a SECOND payment still grants nothing (Z9).
  const second = await createOrder(srv);
  const p2 = srv.rzp.pay(second.orderId);
  await request(srv.port, PAY_VERIFY_PATH, { body: { orderId: second.orderId, paymentId: p2.id, signature: checkoutSig(second.orderId, p2.id) }, headers: asUid('u1') });
  const late = await request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': sig } });
  assert.equal(late.json.replayed, true);
  assert.equal(ms(srv.db.read('subscriptions/u1').passEnd), istNoon('2026-11-27'), 'exactly two months for two payments');
});

/* ══════════════════════════════════════════════════════════════════════════
   Z1 over the REAL index.cjs — the gateway's own 404 while dark, and routed when on
   ══════════════════════════════════════════════════════════════════════════ */

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

function bootServer({ port, env: extraEnv }) {
  const launcher = `
    const Module = require('module');
    const mkRef = (key) => ({ key, collection: (s) => ({ doc: (id) => mkRef(key + '/' + s + '/' + id) }),
      async get() { return { exists: false, data: () => undefined }; }, async set() {} });
    const fake = {
      apps: [],
      credential: { cert: () => ({}) },
      initializeApp() { fake.apps.push({}); },
      auth: () => ({ verifyIdToken: async () => { throw new Error('no'); } }),
      firestore: () => ({ collection: (n) => ({ doc: (id) => mkRef(n + '/' + id) }), async runTransaction() { throw new Error('unused'); } }),
    };
    const orig = Module._load;
    Module._load = function (r) { return r === 'firebase-admin' ? fake : orig.apply(this, arguments); };
    require(${JSON.stringify(INDEX_CJS)});
  `;
  const env = { ...process.env, PORT: String(port), VITE_FIREBASE_PROJECT_ID: 'demo-razorpay-1' };
  for (const k of ['GEMINI_API_KEY', 'DIRECT_GEMINI_API_KEY', 'REPLIT_GEMINI_BASE_URL', 'REPLIT_ANTHROPIC_BASE_URL', 'DATABASE_URL',
    'PAYMENTS_ENABLED', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']) delete env[k];
  Object.assign(env, extraEnv || {});
  const child = spawn(process.execPath, ['-e', launcher], { env, cwd: path.dirname(INDEX_CJS) });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const ready = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`server did not start:\n${out}`)), 40000);
    const tick = setInterval(() => {
      if (/running on port/.test(out)) { clearInterval(tick); clearTimeout(t); resolve(); }
      if (child.exitCode !== null) { clearInterval(tick); clearTimeout(t); reject(new Error(`server exited:\n${out}`)); }
    }, 200);
  });
  return { child, ready };
}

test('Z1 · REAL index.cjs, switch OFF: the four routes give the gateway\'s own 404, byte-identical to an unknown path', { timeout: 90000 }, async (t) => {
  const port = await freePort();
  const srv = bootServer({ port });
  t.after(() => srv.child.kill());
  await srv.ready;
  const control = await request(port, '/api/pay/no-such-route', { body: {} });
  assert.equal(control.status, 404);
  for (const p of [PAY_ORDER_PATH, PAY_VERIFY_PATH, PAY_WEBHOOK_PATH, PAY_STATUS_PATH]) {
    const r = await request(port, p, { body: { passType: 'month' } });
    assert.equal(r.status, 404, p);
    assert.equal(r.text, control.text, `${p} is distinguishable from an unknown path while dark`);
  }
});

test('Z1 · REAL index.cjs, switch ON: the routes are mounted (unauthenticated order -> 401, unsigned webhook -> 400)', { timeout: 90000 }, async (t) => {
  const port = await freePort();
  const srv = bootServer({ port, env: ENV_ON });
  t.after(() => srv.child.kill());
  await srv.ready;
  const order = await request(port, PAY_ORDER_PATH, { body: { passType: 'month' } });
  assert.equal(order.status, 401, order.text);
  const hook = await request(port, PAY_WEBHOOK_PATH, { raw: '{"event":"payment.captured"}', headers: { 'X-Razorpay-Signature': 'bad' } });
  assert.equal(hook.status, 400, hook.text);
  assert.equal(hook.json.reason, 'bad_signature');
  const status = await request(port, PAY_STATUS_PATH, { body: { orderId: 'order_X' } });
  assert.equal(status.status, 401, status.text);
  assert.deepEqual(status.json, order.json, 'status refuses a signed-out caller exactly as order/verify do');
});

/* ══════════════════════════════════════════════════════════════════════════
   PAY-STATUS-1 — "is my payment through?" + an idempotent reconcile (owner D9)
   ══════════════════════════════════════════════════════════════════════════ */

const askStatus = (srv, orderId, uid = 'u1', extra = {}) =>
  request(srv.port, PAY_STATUS_PATH, { body: { orderId, ...extra }, headers: asUid(uid) });
const paymentDocs = (db, uid = 'u1') => [...db.docs.keys()].filter((k) => k.startsWith(`subscriptions/${uid}/payments/`));
const orderPaymentLists = (rzp) => rzp.calls.filter((c) => c.method === 'GET' && /\/v1\/orders\/[^/]+\/payments$/.test(c.url));

test('STATUS · a signed-out caller -> 401 exactly as verify, and nothing is read', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const before = srv.rzp.calls.length;
  const s = await request(srv.port, PAY_STATUS_PATH, { body: { orderId } });
  const v = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId } });
  assert.equal(s.status, 401);
  assert.equal(s.text, v.text, 'status and verify refuse a signed-out caller differently');
  assert.equal(srv.rzp.calls.length, before);
});

test('STATUS · another student\'s order -> uid_mismatch; an unknown order -> 404 reject; neither calls Razorpay', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv, 'u1');
  srv.rzp.pay(orderId);
  const before = srv.rzp.calls.length;
  const other = await askStatus(srv, orderId, 'intruder');
  assert.equal(other.status, 400);
  assert.equal(other.json.reason, 'uid_mismatch');
  const unknown = await askStatus(srv, 'order_nope');
  assert.equal(unknown.status, 404);
  assert.deepEqual(unknown.json, { ok: false, error: 'payment_rejected', reason: 'unknown_order' });
  const malformed = await askStatus(srv, '../payOrders/x');
  assert.equal(malformed.status, 400);
  assert.equal(malformed.json.reason, 'malformed');
  assert.equal(srv.rzp.calls.length, before, 'a refused status call reached Razorpay');
  assert.equal(srv.db.read('subscriptions/intruder'), undefined);
  assert.equal(srv.db.read('subscriptions/u1'), undefined, 'the intruder\'s call granted the owner');
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'created');
  assert.ok(srv.events.includes('payments.status.rejected.uid_mismatch'));
  assert.ok(srv.events.includes('payments.status.rejected.unknown_order'));
});

test('STATUS · an order already PAID -> state paid with passEnd, paymentId, amountInr; no Razorpay call, no write', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const p = srv.rzp.pay(orderId);
  const v = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('u1') });
  assert.equal(v.status, 200);
  const callsBefore = srv.rzp.calls.length;
  const subVersion = srv.db.version('subscriptions/u1');
  const r = await askStatus(srv, orderId);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true, state: 'paid', passEnd: v.json.passEnd, paymentId: p.id, amountInr: 599 });
  assert.equal(srv.rzp.calls.length, callsBefore, 'a paid order still asked Razorpay');
  assert.equal(srv.db.version('subscriptions/u1'), subVersion, 'a paid-order status call wrote the subscription');
  assert.ok(srv.events.includes('payments.status.paid'));
});

test('STATUS · created + Razorpay CAPTURED matching -> grant once, state paid; again -> paid, no second grant; concurrent -> replayed', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const p = srv.rzp.pay(orderId);
  // A request amount is ignored — only the order id is read.
  const r = await askStatus(srv, orderId, 'u1', { amount: 100, amountPaise: 100, paymentId: 'pay_forged', status: 'captured' });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.state, 'paid');
  assert.equal(r.json.replayed, false);
  assert.equal(r.json.paymentId, p.id);
  assert.equal(r.json.amountInr, 599);
  assert.equal(r.json.passEnd, new Date(istNoon('2026-10-27')).toISOString());
  assert.equal(srv.db.read('subscriptions/u1').tier, 'premium');
  assert.equal(srv.db.read('subscriptions/u1').lastPaymentRef, p.id);
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'paid');
  assert.equal(srv.db.read(`payOrders/${orderId}`).paymentId, p.id);
  assert.deepEqual(paymentDocs(srv.db), [`subscriptions/u1/payments/${p.id}`]);
  assert.ok(srv.events.includes('payments.status.granted'));
  assert.ok(srv.events.includes('payments.status.reconciled'));
  // Second call: the order is paid now -> answered from the store, nothing granted.
  const lists = orderPaymentLists(srv.rzp).length;
  const again = await askStatus(srv, orderId);
  assert.deepEqual(again.json, { ok: true, state: 'paid', passEnd: r.json.passEnd, paymentId: p.id, amountInr: 599 });
  assert.equal(orderPaymentLists(srv.rzp).length, lists);
  assert.deepEqual(paymentDocs(srv.db), [`subscriptions/u1/payments/${p.id}`], 'a second payment record was written');
  assert.equal(ms(srv.db.read('subscriptions/u1').passEnd), istNoon('2026-10-27'), 'one month, not more');
  // The webhook for the same payment afterwards is a replay (live-verify step d).
  const raw = webhookBody(p);
  const hook = await request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, raw) } });
  assert.equal(hook.json.replayed, true);
  assert.equal(ms(srv.db.read('subscriptions/u1').passEnd), istNoon('2026-10-27'), 'webhook after status granted twice');
});

test('STATUS · concurrent status + status + verify on a created order grant ONCE; the rest are replayed', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const p = srv.rzp.pay(orderId);
  const results = await Promise.all([
    askStatus(srv, orderId),
    askStatus(srv, orderId),
    request(srv.port, PAY_VERIFY_PATH, { body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('u1') }),
  ]);
  for (const r of results) assert.equal(r.status, 200, r.text);
  const granting = results.filter((r) => r.json.replayed === false);
  assert.equal(granting.length, 1, 'more than one path granted');
  assert.ok(results.some((r) => r.json.replayed === true), 'no concurrent call was a replay');
  assert.deepEqual(paymentDocs(srv.db), [`subscriptions/u1/payments/${p.id}`]);
  assert.equal(ms(srv.db.read('subscriptions/u1').passEnd), istNoon('2026-10-27'), 'one month, not more');
});

test('STATUS · created + Razorpay AUTHORIZED -> captured for the STORED amount, then granted', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const p = srv.rzp.pay(orderId, { status: 'authorized' });
  const r = await askStatus(srv, orderId);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.state, 'paid');
  assert.equal(r.json.paymentId, p.id);
  const capture = srv.rzp.calls.find((c) => c.url.endsWith(`/payments/${p.id}/capture`));
  assert.deepEqual(capture.body, { amount: 59900, currency: 'INR' });
  assert.equal(srv.db.read('subscriptions/u1').tier, 'premium');
});

test('STATUS · amount mismatch / currency mismatch / failed / another order\'s payment -> pending, NO grant, nothing captured', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const other = await createOrder(srv);
  srv.rzp.pay(orderId, { id: 'pay_cheap', amount: 100 });
  srv.rzp.pay(orderId, { id: 'pay_cheap_auth', amount: 100, status: 'authorized' });
  srv.rzp.pay(orderId, { id: 'pay_usd', currency: 'USD' });
  srv.rzp.pay(orderId, { id: 'pay_failed', status: 'failed' });
  // A captured payment of ANOTHER order sits in the fake too; it must not leak in.
  srv.rzp.pay(other.orderId, { id: 'pay_other_order' });
  // (a listing that itself carries a foreign order_id is the next test)
  const r = await askStatus(srv, orderId);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true, state: 'pending' });
  assert.equal(srv.rzp.calls.filter((c) => c.url.includes('/capture')).length, 0, 'a mismatched authorized payment was captured');
  assert.equal(srv.db.read('subscriptions/u1'), undefined, 'a mismatched payment was granted');
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'created');
  assert.ok(srv.events.includes('payments.status.pending'));
});

test('STATUS · a listing that carries a payment of ANOTHER order_id is never granted', async (t) => {
  const rzp = fakeRazorpay();
  const inner = rzp.fetchImpl;
  // Razorpay (or a MITM'd response) returns another order's captured payment in this order's list.
  rzp.fetchImpl = async (url, init) => {
    const res = await inner(url, init);
    if (/\/v1\/orders\/[^/]+\/payments$/.test(new URL(url).pathname)) {
      const json = await res.json();
      json.items.push({ id: 'pay_foreign', entity: 'payment', order_id: 'order_someoneelse', amount: 59900, currency: 'INR', status: 'captured' });
      return { ok: true, status: 200, json: async () => json };
    }
    return res;
  };
  const srv = await startRoutes({ rzp });
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const r = await askStatus(srv, orderId);
  assert.deepEqual(r.json, { ok: true, state: 'pending' });
  assert.equal(srv.db.read('subscriptions/u1'), undefined);
});

test('STATUS · created + no payments -> pending; Razorpay unreachable -> 200 unknown, no grant', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  const none = await askStatus(srv, orderId);
  assert.equal(none.status, 200);
  assert.deepEqual(none.json, { ok: true, state: 'pending' });
  srv.rzp.pay(orderId); // captured, but Razorpay cannot be reached
  srv.rzp.state.down = true;
  const down = await askStatus(srv, orderId);
  assert.equal(down.status, 200, down.text);
  assert.deepEqual(down.json, { ok: true, state: 'unknown' });
  assert.ok(srv.events.includes('payments.status.razorpay_unreachable'));
  assert.ok(srv.events.includes('payments.status.unknown'));
  assert.equal(srv.db.read('subscriptions/u1'), undefined, 'granted without Razorpay confirming');
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'created');
  // Back up: the same call now reconciles.
  srv.rzp.state.down = false;
  const up = await askStatus(srv, orderId);
  assert.equal(up.json.state, 'paid');
});

test('STATUS · Razorpay refuses the listing (non-2xx) -> unknown, no grant', async (t) => {
  const rzp = fakeRazorpay();
  const inner = rzp.fetchImpl;
  rzp.fetchImpl = async (url, init) => {
    if (/\/v1\/orders\/[^/]+\/payments$/.test(new URL(url).pathname)) return { ok: false, status: 500, json: async () => ({}) };
    return inner(url, init);
  };
  const srv = await startRoutes({ rzp });
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  rzp.pay(orderId);
  const r = await askStatus(srv, orderId);
  assert.deepEqual(r.json, { ok: true, state: 'unknown' });
  assert.ok(srv.events.includes('payments.status.list_failed'));
  assert.equal(srv.db.read('subscriptions/u1'), undefined);
});

test('STATUS · shares the payments rate class with order and verify', async (t) => {
  const srv = await startRoutes({ env: { ...ENV_ON, LT_CAP_PAYMENTS_SOFT: '2', LT_CAP_PAYMENTS_HARD: '2' } });
  t.after(srv.close);
  const { orderId } = await createOrder(srv); // 1 of 2
  assert.equal((await askStatus(srv, orderId)).status, 200); // 2 of 2
  const third = await askStatus(srv, orderId);
  assert.notEqual(third.status, 200, 'status polling is not rate-limited');
  assert.ok(third.status >= 400 && third.status < 500, third.text);
});

test('STATUS · STATIC: verify, webhook and status judge a payment through the ONE shared Z4 function', () => {
  const src = fs.readFileSync(PAYMENTS_CJS, 'utf8');
  for (const fn of ['handleVerify', 'handleWebhook', 'findConfirmedPayment']) {
    const body = src.match(new RegExp(`async function ${fn}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`));
    assert.ok(body, `${fn} is gone`);
    assert.match(body[0], /paymentMismatch\(/, `${fn} does not use the shared Z4 checks`);
    assert.doesNotMatch(body[0], /\.currency !== CURRENCY|\.status !== 'captured'\) return reject/, `${fn} re-implements a Z4 check`);
  }
  // The status handler never reads money from the request.
  const status = src.match(/async function handleStatus\([^)]*\) \{[\s\S]*?\n  \}/)[0];
  assert.doesNotMatch(status, /body\.(amount|amountPaise|price|paymentId|status|signature)/);
});

test('STATUS · an AUTHORIZED payment whose capture fails and stays authorized -> pending, NO grant', async (t) => {
  const rzp = fakeRazorpay();
  const inner = rzp.fetchImpl;
  rzp.fetchImpl = async (url, init) => {
    if (/\/capture$/.test(new URL(url).pathname)) return { ok: false, status: 400, json: async () => ({ error: {} }) };
    return inner(url, init);
  };
  const srv = await startRoutes({ rzp });
  t.after(srv.close);
  const { orderId } = await createOrder(srv);
  rzp.pay(orderId, { status: 'authorized' });
  const r = await askStatus(srv, orderId);
  assert.deepEqual(r.json, { ok: true, state: 'pending' });
  assert.equal(srv.db.read('subscriptions/u1'), undefined, 'an uncaptured payment was granted');
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'created');
});

/* ══════════════════════════════════════════════════════════════════════════
   TOPUP-1 - extra-usage packs. DARK behind PAYMENTS_ENABLED AND TOPUP_ENABLED; premium only; the amount is
   always the SERVER table; the grant is one idempotent transaction on the payment id.
   ══════════════════════════════════════════════════════════════════════════ */

const usageCredit = require('../services/usageCredit.cjs');
const ENV_TOPUP = { ...ENV_ON, TOPUP_ENABLED: '1' };
const premiumDb = () => memoryFirestore({
  'subscriptions/u1': { tier: 'premium', plan: 'month', premiumSince: new Date(NOW - DAY).toISOString(), passEnd: new Date(NOW + 10 * DAY).toISOString() },
});
const MICRO = 1_000_000;

test('TOPUP dark · TOPUP_ENABLED unset (payments ON): a top-up key is answered 404, Razorpay is never called, nothing is written', async (t) => {
  const rzp = fakeRazorpay();
  const db = premiumDb();
  const srv = await startRoutes({ env: ENV_ON, rzp, db });
  t.after(srv.close);
  for (const passType of ['topup_49', 'topup_149']) {
    const r = await request(srv.port, PAY_ORDER_PATH, { body: { passType }, headers: asUid('u1') });
    assert.equal(r.status, 404, passType);
    assert.deepEqual(r.json, { error: 'Not Found' });
  }
  assert.equal(rzp.calls.length, 0);
  assert.equal([...db.docs.keys()].filter((k) => k.startsWith('payOrders/') || k.startsWith('usageCredits/')).length, 0);
});

test('TOPUP dark · TOPUP_ENABLED on but PAYMENTS_ENABLED unset: every route is the gateway 404 (the flags AND)', async (t) => {
  const srv = await startRoutes({ env: { ...ENV_TOPUP, PAYMENTS_ENABLED: '' }, db: premiumDb() });
  t.after(srv.close);
  const r = await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'topup_49' }, headers: asUid('u1') });
  assert.equal(r.status, 404);
  assert.equal(srv.rzp.calls.length, 0);
  const { isTopupEnabled } = require('./payments.cjs');
  assert.equal(isTopupEnabled({ TOPUP_ENABLED: '1' }), false);
  assert.equal(isTopupEnabled({ PAYMENTS_ENABLED: '1' }), false);
  assert.equal(isTopupEnabled({ PAYMENTS_ENABLED: '1', TOPUP_ENABLED: '1' }), true);
});

test('TOPUP · forged amount: the client sends 1 rupee, the server prices 49 (and 149)', async (t) => {
  const srv = await startRoutes({ env: ENV_TOPUP, db: premiumDb() });
  t.after(srv.close);
  const a = await createOrder(srv, 'u1', 'topup_49', { amount: 100, amountPaise: 100, price: 1, pricePaidInr: 1, creditInr: 9999 });
  assert.equal(a.amountPaise, 4900);
  const sent = srv.rzp.calls.find((c) => c.method === 'POST' && c.url.endsWith('/v1/orders'));
  assert.equal(sent.body.amount, 4900);
  assert.deepEqual(sent.body.notes, { uid: 'u1', passType: 'topup_49' });
  const b = await createOrder(srv, 'u1', 'topup_149', { amount: 1 });
  assert.equal(b.amountPaise, 14900);
  const stored = srv.db.read(`payOrders/${a.orderId}`);
  assert.equal(stored.passType, 'topup_49');
  assert.equal(stored.amountPaise, 4900);
});

test('TOPUP · premium only: a free / trial / expired / no-subscription student is refused (403) before Razorpay is called', async (t) => {
  const db = memoryFirestore({
    'subscriptions/free1': { tier: 'free' },
    'subscriptions/trial1': { tier: 'trial', trialStartDate: new Date(NOW - DAY) },
    'subscriptions/expired1': { tier: 'premium', passEnd: new Date(NOW - DAY).toISOString() },
  });
  const srv = await startRoutes({ env: ENV_TOPUP, db });
  t.after(srv.close);
  for (const uid of ['free1', 'trial1', 'expired1', 'nobody']) {
    const r = await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'topup_49' }, headers: asUid(uid) });
    assert.equal(r.status, 403, uid);
    assert.equal(r.json.error, 'premium_required', uid);
  }
  assert.equal(srv.rzp.calls.length, 0);
});

async function payTopup(srv, passType = 'topup_49', uid = 'u1') {
  const { orderId } = await createOrder(srv, uid, passType);
  const p = srv.rzp.pay(orderId);
  const r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid(uid) });
  return { orderId, p, r };
}

test('TOPUP · verify credits the BASE in ONE transaction (bonus OFF at launch): 49 -> 25, 149 -> 80 (owner 22 Oct), bonus recorded as 0', async (t) => {
  const srv = await startRoutes({ env: ENV_TOPUP, db: premiumDb() });
  t.after(srv.close);
  const a = await payTopup(srv, 'topup_49');
  assert.equal(a.r.status, 200, JSON.stringify(a.r.json));
  assert.deepEqual({ ok: a.r.json.ok, replayed: a.r.json.replayed, topup: a.r.json.topup }, { ok: true, replayed: false, topup: true });
  const doc = srv.db.read('usageCredits/u1');
  assert.equal(doc.balanceMicroInr, 25 * MICRO);
  assert.equal(doc.boughtBaseMicroInr, 25 * MICRO);
  assert.equal(doc.boughtBonusMicroInr, 0);
  const grant = srv.db.read(`usageCredits/u1/grants/${a.p.id}`);
  assert.deepEqual(
    { k: grant.productKey, base: grant.baseMicroInr, bonus: grant.bonusMicroInr, pct: grant.bonusPercent, price: grant.priceInr },
    { k: 'topup_49', base: 25 * MICRO, bonus: 0, pct: 0, price: 49 },
  );
  assert.equal(srv.db.read(`payOrders/${a.orderId}`).status, 'paid');
  assert.equal(srv.db.read('subscriptions/u1').lastPaymentRef, undefined, 'a top-up must not touch the pass');
  const b = await payTopup(srv, 'topup_149');
  assert.equal(b.r.status, 200);
  const doc2 = srv.db.read('usageCredits/u1');
  assert.equal(doc2.balanceMicroInr, (25 + 80) * MICRO);
  assert.equal(doc2.boughtBonusMicroInr, 0);
});

test('TOPUP · IDEMPOTENT: verify twice, verify then webhook, webhook twice -> the credit is added exactly once', async (t) => {
  const srv = await startRoutes({ env: ENV_TOPUP, db: premiumDb() });
  t.after(srv.close);
  const { orderId, p, r } = await payTopup(srv);
  assert.equal(r.json.replayed, false);
  const again = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('u1') });
  assert.equal(again.json.replayed, true);
  const raw = webhookBody({ ...p, status: 'captured' });
  const hook = (body) => request(srv.port, PAY_WEBHOOK_PATH, { raw: body, headers: { 'x-razorpay-signature': hmac(WEBHOOK_SECRET, body) } });
  assert.equal((await hook(raw)).json.replayed, true);
  assert.equal((await hook(raw)).json.replayed, true);
  assert.equal(srv.db.read('usageCredits/u1').balanceMicroInr, 25 * MICRO, 'a replay added credit');
  assert.equal([...srv.db.docs.keys()].filter((k) => k.startsWith('usageCredits/u1/grants/')).length, 1);
});

test('TOPUP · webhook first, then verify: still once', async (t) => {
  const srv = await startRoutes({ env: ENV_TOPUP, db: premiumDb() });
  t.after(srv.close);
  const { orderId } = await createOrder(srv, 'u1', 'topup_49');
  const p = srv.rzp.pay(orderId);
  const body = webhookBody({ ...p, status: 'captured' });
  const h = await request(srv.port, PAY_WEBHOOK_PATH, { raw: body, headers: { 'x-razorpay-signature': hmac(WEBHOOK_SECRET, body) } });
  assert.equal(h.json.replayed, false);
  const v = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('u1') });
  assert.equal(v.json.replayed, true);
  assert.equal(srv.db.read('usageCredits/u1').balanceMicroInr, 25 * MICRO);
});

test('TOPUP · a paid pack is credited even if TOPUP_ENABLED was switched off after the order was made', async (t) => {
  const db = premiumDb();
  const rzp = fakeRazorpay();
  const on = await startRoutes({ env: ENV_TOPUP, db, rzp });
  const { orderId } = await createOrder(on, 'u1', 'topup_49');
  await on.close();
  const off = await startRoutes({ env: ENV_ON, db, rzp });
  t.after(off.close);
  const p = rzp.pay(orderId);
  const r = await request(off.port, PAY_VERIFY_PATH, { body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('u1') });
  assert.equal(r.status, 200);
  assert.equal(db.read('usageCredits/u1').balanceMicroInr, 25 * MICRO);
});

test('TOPUP · TAMPERED amount on a top-up order is refused like any pass (no credit)', async (t) => {
  const srv = await startRoutes({ env: ENV_TOPUP, db: premiumDb() });
  t.after(srv.close);
  const { orderId } = await createOrder(srv, 'u1', 'topup_149');
  const p = srv.rzp.pay(orderId, { amount: 100 });
  const r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('u1') });
  assert.equal(r.status, 400);
  assert.equal(srv.db.read('usageCredits/u1'), undefined);
});

test('TOPUP · another student cannot verify your order (uid mismatch) and gets nothing', async (t) => {
  const srv = await startRoutes({ env: ENV_TOPUP, db: premiumDb() });
  t.after(srv.close);
  const { orderId } = await createOrder(srv, 'u1', 'topup_49');
  const p = srv.rzp.pay(orderId);
  const r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('u2') });
  assert.equal(r.status, 400);
  assert.equal(srv.db.read('usageCredits/u2'), undefined);
  assert.equal(srv.db.read('usageCredits/u1'), undefined);
});

test('TOPUP · the bonus is built but OFF (0%): no offer by default; on it adds 25% (49 -> 25 + 6 = 31, 149 -> 80 + 20 = 100), recorded separately, stops after its end date, and ignores FOUNDING_OFFER_OPEN', () => {
  const { topupCreditFor, topupBonusActive, TOPUP_BONUS_PERCENT, TOPUP_BONUS_ENDS_ISO } = pricing;
  assert.equal(TOPUP_BONUS_PERCENT, 0, 'launch: no bonus');
  assert.equal(TOPUP_BONUS_ENDS_ISO, null);
  assert.deepEqual(topupCreditFor('topup_49', NOW), { baseMicroInr: 25 * MICRO, bonusMicroInr: 0, totalMicroInr: 25 * MICRO, bonusPercent: 0 });
  assert.deepEqual(topupCreditFor('topup_149', NOW), { baseMicroInr: 80 * MICRO, bonusMicroInr: 0, totalMicroInr: 80 * MICRO, bonusPercent: 0 });
  const on = { percent: 25 };
  assert.deepEqual(topupCreditFor('topup_49', NOW, on), { baseMicroInr: 25 * MICRO, bonusMicroInr: 6 * MICRO, totalMicroInr: 31 * MICRO, bonusPercent: 25 });
  assert.deepEqual(topupCreditFor('topup_149', NOW, on), { baseMicroInr: 80 * MICRO, bonusMicroInr: 20 * MICRO, totalMicroInr: 100 * MICRO, bonusPercent: 25 });
  const until = { percent: 25, endsIso: '2026-12-31' };
  assert.equal(topupCreditFor('topup_49', istNoon('2026-12-31'), until).bonusMicroInr, 6 * MICRO, 'the last day still counts');
  assert.equal(topupCreditFor('topup_49', istNoon('2027-01-01'), until).bonusMicroInr, 0, 'after the end date: base only');
  assert.equal(topupBonusActive(NOW, 0), false);
  assert.equal(topupCreditFor('month', NOW), null);
  // FOUNDING_OFFER_OPEN has no effect on it: the function takes no such input and the founding switch is not read.
  assert.ok(!/FOUNDING_OFFER_OPEN/.test(topupCreditFor.toString()));
});

test('TOPUP · bonus ON through the routes: verify credits base + bonus and records them separately', async (t) => {
  const srv = await startRoutes({ env: ENV_TOPUP, db: premiumDb(), topupBonus: { percent: 25 } });
  t.after(srv.close);
  const a = await payTopup(srv, 'topup_149');
  assert.equal(a.r.status, 200);
  const doc = srv.db.read('usageCredits/u1');
  assert.equal(doc.balanceMicroInr, 100 * MICRO);
  assert.equal(doc.boughtBaseMicroInr, 80 * MICRO);
  assert.equal(doc.boughtBonusMicroInr, 20 * MICRO);
  const grant = srv.db.read(`usageCredits/u1/grants/${a.p.id}`);
  assert.deepEqual({ base: grant.baseMicroInr, bonus: grant.bonusMicroInr, pct: grant.bonusPercent }, { base: 80 * MICRO, bonus: 20 * MICRO, pct: 25 });
});

test('TOPUP · expiry: credit counts until the predicted board day, then is IGNORED (kept, never deleted); a new pack restarts it', async () => {
  const db = memoryFirestore();
  const order = (id, key) => db.collection('payOrders').doc(id).set({ uid: 'u9', passType: key, amountPaise: 4900, status: 'created' });
  await order('o1', 'topup_49');
  const g1 = await usageCredit.grantTopup({ uid: 'u9', productKey: 'topup_49', paymentRef: 'pay1', orderId: 'o1', nowMs: NOW }, { firestore: db });
  assert.equal(g1.credit.balanceMicroInr, 25 * MICRO);
  const expiresAt = db.read('usageCredits/u9').expiresAtMs;
  assert.equal(expiresAt, usageCredit.creditExpiryMs(NOW));
  assert.ok(expiresAt > NOW);
  assert.equal((await usageCredit.readCredit(db, 'u9', expiresAt)).balanceMicroInr, 25 * MICRO, 'still counts on the board day');
  const after = await usageCredit.readCredit(db, 'u9', expiresAt + 1);
  assert.equal(after.balanceMicroInr, 0);
  assert.equal(after.expired, true);
  assert.equal(after.expiredMicroInr, 25 * MICRO, 'the expired remainder stays visible to admin');
  assert.equal(db.read('usageCredits/u9').balanceMicroInr, 25 * MICRO, 'not deleted silently');
  assert.deepEqual(await usageCredit.chargeCredit({ uid: 'u9', amountMicroInr: 6 * MICRO, nowMs: expiresAt + 1 }, { firestore: db }), { charged: 0 });
  await order('o2', 'topup_49');
  const g2 = await usageCredit.grantTopup({ uid: 'u9', productKey: 'topup_49', paymentRef: 'pay2', orderId: 'o2', nowMs: expiresAt + 1 }, { firestore: db });
  assert.equal(g2.credit.balanceMicroInr, 25 * MICRO, 'expired credit did not carry into the new pack');
  assert.equal(g2.credit.expiredMicroInr, 25 * MICRO);
});

test('TOPUP · chargeCredit: the ACTUAL cost is taken, never more than the balance, never below zero; creditCovers needs a positive balance', async () => {
  const db = memoryFirestore();
  await db.collection('payOrders').doc('o1').set({ uid: 'u8', passType: 'topup_49', amountPaise: 4900, status: 'created' });
  await usageCredit.grantTopup({ uid: 'u8', productKey: 'topup_49', paymentRef: 'p1', orderId: 'o1', nowMs: NOW }, { firestore: db });
  assert.deepEqual(await usageCredit.chargeCredit({ uid: 'u8', amountMicroInr: 3 * MICRO, nowMs: NOW }, { firestore: db }), { charged: 3 * MICRO });
  assert.equal(db.read('usageCredits/u8').balanceMicroInr, 22 * MICRO);
  assert.equal(db.read('usageCredits/u8').spentMicroInr, 3 * MICRO);
  assert.deepEqual(await usageCredit.chargeCredit({ uid: 'u8', amountMicroInr: 100 * MICRO, nowMs: NOW }, { firestore: db }), { charged: 22 * MICRO });
  assert.equal(db.read('usageCredits/u8').balanceMicroInr, 0);
  assert.deepEqual(await usageCredit.chargeCredit({ uid: 'u8', amountMicroInr: MICRO, nowMs: NOW }, { firestore: db }), { charged: 0 });
  assert.deepEqual(await usageCredit.chargeCredit({ uid: 'nobody', amountMicroInr: MICRO, nowMs: NOW }, { firestore: db }), { charged: 0 });
  assert.equal(usageCredit.creditCovers(0, 0), false);
  assert.equal(usageCredit.creditCovers(5, 6), false);
  assert.equal(usageCredit.creditCovers(6, 6), true);
});

/* ── TOPUP-1 (22 Oct) · the status reconcile, parallel grant paths, and "never extends Premium" ───── */

test('TOPUP · status reconcile: a captured top-up payment is credited ONCE through /api/pay/status (same Z4 checks), and a paid top-up order reports no pass', async (t) => {
  const srv = await startRoutes({ env: ENV_TOPUP, db: premiumDb() });
  t.after(srv.close);
  const { orderId } = await createOrder(srv, 'u1', 'topup_49');
  srv.rzp.pay(orderId);
  const first = await request(srv.port, PAY_STATUS_PATH, { body: { orderId }, headers: asUid('u1') });
  assert.equal(first.status, 200, JSON.stringify(first.json));
  assert.equal(first.json.state, 'paid');
  assert.equal(first.json.topup, true);
  assert.equal(first.json.passEnd, undefined, 'a top-up has no pass to report');
  assert.equal(srv.db.read('usageCredits/u1').balanceMicroInr, 25 * MICRO);
  const again = await request(srv.port, PAY_STATUS_PATH, { body: { orderId }, headers: asUid('u1') });
  assert.deepEqual({ state: again.json.state, topup: again.json.topup, passEnd: again.json.passEnd }, { state: 'paid', topup: true, passEnd: undefined });
  assert.equal(srv.db.read('usageCredits/u1').balanceMicroInr, 25 * MICRO, 'status twice credited twice');
});

test('TOPUP · status reconcile refuses a tampered amount (no credit) and never credits another student', async (t) => {
  const srv = await startRoutes({ env: ENV_TOPUP, db: premiumDb() });
  t.after(srv.close);
  const { orderId } = await createOrder(srv, 'u1', 'topup_149');
  srv.rzp.pay(orderId, { amount: 100 });
  const r = await request(srv.port, PAY_STATUS_PATH, { body: { orderId }, headers: asUid('u1') });
  assert.equal(r.json.state, 'pending', 'a payment for the wrong amount is not this order\'s payment');
  const other = await request(srv.port, PAY_STATUS_PATH, { body: { orderId }, headers: asUid('u2') });
  assert.equal(other.status, 400);
  assert.equal(srv.db.read('usageCredits/u1'), undefined);
  assert.equal(srv.db.read('usageCredits/u2'), undefined);
});

test('TOPUP · verify and webhook IN PARALLEL for the same payment: credited exactly once (one grant record)', async (t) => {
  const srv = await startRoutes({ env: ENV_TOPUP, db: premiumDb() });
  t.after(srv.close);
  const { orderId } = await createOrder(srv, 'u1', 'topup_149');
  const p = srv.rzp.pay(orderId);
  const raw = webhookBody({ ...p, status: 'captured' });
  const [v, h] = await Promise.all([
    request(srv.port, PAY_VERIFY_PATH, { body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('u1') }),
    request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'x-razorpay-signature': hmac(WEBHOOK_SECRET, raw) } }),
  ]);
  assert.equal(v.status, 200);
  assert.equal(h.status, 200);
  assert.deepEqual([v.json.replayed, h.json.replayed].sort(), [false, true]);
  assert.equal(srv.db.read('usageCredits/u1').balanceMicroInr, 80 * MICRO);
  assert.equal([...srv.db.docs.keys()].filter((k) => k.startsWith('usageCredits/u1/grants/')).length, 1);
});

test('TOPUP · a top-up NEVER extends Premium: the subscription document is byte-identical after a paid pack, and no pass payment record is written', async (t) => {
  const db = premiumDb();
  const before = JSON.stringify(db.read('subscriptions/u1'));
  const srv = await startRoutes({ env: ENV_TOPUP, db });
  t.after(srv.close);
  const a = await payTopup(srv, 'topup_149');
  assert.equal(a.r.status, 200);
  assert.equal(JSON.stringify(db.read('subscriptions/u1')), before);
  assert.equal([...db.docs.keys()].filter((k) => k.startsWith('subscriptions/u1/payments/')).length, 0);
  // and a pass order is never routed to the credit grant
  const m = await payTopupAsPass(srv);
  assert.equal(m.status, 200);
  assert.equal(srv.db.read('usageCredits/u1').balanceMicroInr, 80 * MICRO, 'a pass payment added credit');
});

async function payTopupAsPass(srv) {
  const { orderId } = await createOrder(srv, 'u1', 'month');
  const p = srv.rzp.pay(orderId);
  return request(srv.port, PAY_VERIFY_PATH, { body: { orderId, paymentId: p.id, signature: checkoutSig(orderId, p.id) }, headers: asUid('u1') });
}

test('TOPUP · the pack table is the owner\'s 22 Oct decision: 49 -> 25 and 149 -> 80 of credit, no bonus', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(pricing.TOPUP_PRODUCTS).map(([k, v]) => [k, { ...v }])),
    { topup_49: { priceInr: 49, creditInr: 25 }, topup_149: { priceInr: 149, creditInr: 80 } },
  );
  assert.equal(pricing.TOPUP_BONUS_PERCENT, 0);
});

/* ══════════════════════════════════════════════════════════════════════════
   PRICING-1 — the founding offer closes at 00:00 IST on 1 Dec 2026
   ══════════════════════════════════════════════════════════════════════════ */

// PRICE-FIXED-1: from 1 Nov 2026 only an account with a prior PAID month order may order a month pass, so every
// month-order test dated in Nov/Dec seeds one (a founder / existing subscriber re-buying).
const PRIOR_MONTH_BUYER = () => memoryFirestore({ 'subscriptions/u1/payments/pay_old_month': { passType: 'month', pricePaidInr: 599 } });
const LAST_SECOND = Date.parse('2026-11-30T23:59:59+05:30');
const AFTER_CLOSE = Date.parse('2026-12-01T00:00:01+05:30');
const PAST_GRACE = Date.parse('2026-12-02T00:00:01+05:30');

test('PRICING-1 · an order made at 23:59:59 IST on 30 Nov and PAID at 00:00:01 IST on 1 Dec is charged AND recorded as founding (599, foundingMember)', async (t) => {
  let clock = LAST_SECOND;
  const srv = await startRoutes({ db: PRIOR_MONTH_BUYER(), now: () => clock, calendarOffer: true });
  t.after(srv.close);
  const created = await createOrder(srv);
  assert.equal(created.amountPaise, 59900, 'the order was priced at the founding rate');
  clock = AFTER_CLOSE;
  const p = srv.rzp.pay(created.orderId);
  const r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId: created.orderId, paymentId: p.id, signature: checkoutSig(created.orderId, p.id) }, headers: asUid('u1') });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const stored = srv.db.read('subscriptions/u1');
  assert.equal(stored.pricePaidInr, 599, 'recorded what was charged');
  assert.equal(stored.offerKey, 'founding');
  assert.equal(stored.foundingMember, true);
  assert.equal(srv.db.read(`subscriptions/u1/payments/${p.id}`).pricePaidInr, 599);
});

test('PRICING-1 · an order made after the close is charged and recorded at the list price (999, not founding)', async (t) => {
  const srv = await startRoutes({ db: PRIOR_MONTH_BUYER(), now: () => AFTER_CLOSE, calendarOffer: true });
  t.after(srv.close);
  const created = await createOrder(srv);
  assert.equal(created.amountPaise, 99900);
  const p = srv.rzp.pay(created.orderId);
  const r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId: created.orderId, paymentId: p.id, signature: checkoutSig(created.orderId, p.id) }, headers: asUid('u1') });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const stored = srv.db.read('subscriptions/u1');
  assert.equal(stored.pricePaidInr, 999);
  assert.equal(stored.offerKey, 'regular');
  assert.equal(stored.foundingMember, false);
});

test('PRICING-1 · a founding order whose payment is only AUTHORIZED 24 h+ after the close is NOT captured and NOT granted (the authorization lapses, no money taken)', async (t) => {
  let clock = LAST_SECOND;
  const srv = await startRoutes({ db: PRIOR_MONTH_BUYER(), now: () => clock, calendarOffer: true });
  t.after(srv.close);
  const created = await createOrder(srv);
  clock = PAST_GRACE;
  const p = srv.rzp.pay(created.orderId, { status: 'authorized' });
  const r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId: created.orderId, paymentId: p.id, signature: checkoutSig(created.orderId, p.id) }, headers: asUid('u1') });
  assert.equal(r.status, 400, JSON.stringify(r.json));
  assert.equal(r.json.reason, 'order_expired');
  assert.equal(srv.rzp.calls.filter((c) => c.url.includes('/capture')).length, 0, 'a stale founding order was captured');
  assert.equal(srv.db.read('subscriptions/u1'), undefined, 'a pass was granted for a refused order');
  // The status path refuses the same way and also captures nothing.
  const st = await askStatus(srv, created.orderId);
  assert.equal(st.json.reason, 'order_expired');
  assert.equal(srv.rzp.calls.filter((c) => c.url.includes('/capture')).length, 0);
});

test('PRICING-1 · within the 24 h grace an authorized founding order is still captured and granted at 599', async (t) => {
  let clock = LAST_SECOND;
  const srv = await startRoutes({ db: PRIOR_MONTH_BUYER(), now: () => clock, calendarOffer: true });
  t.after(srv.close);
  const created = await createOrder(srv);
  clock = Date.parse('2026-12-01T23:59:00+05:30');
  const p = srv.rzp.pay(created.orderId, { status: 'authorized' });
  const r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId: created.orderId, paymentId: p.id, signature: checkoutSig(created.orderId, p.id) }, headers: asUid('u1') });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(srv.db.read('subscriptions/u1').pricePaidInr, 599);
});

test('PRICING-1 · money already CAPTURED is never stranded: a stale founding order that Razorpay captured is granted at its own price', async (t) => {
  let clock = LAST_SECOND;
  const srv = await startRoutes({ db: PRIOR_MONTH_BUYER(), now: () => clock, calendarOffer: true });
  t.after(srv.close);
  const created = await createOrder(srv);
  clock = PAST_GRACE;
  const p = srv.rzp.pay(created.orderId); // captured (auto-capture) before we ever saw it
  const r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId: created.orderId, paymentId: p.id, signature: checkoutSig(created.orderId, p.id) }, headers: asUid('u1') });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const stored = srv.db.read('subscriptions/u1');
  assert.equal(stored.tier, 'premium');
  assert.equal(stored.pricePaidInr, 599);
  assert.equal(stored.foundingMember, true);
});

test('PRICING-1 · status: a stale AUTHORIZED item does not hide a CAPTURED one later on the same order — it confirms; expired only when nothing else is confirmed', async (t) => {
  let clock = LAST_SECOND;
  const srv = await startRoutes({ db: PRIOR_MONTH_BUYER(), now: () => clock, calendarOffer: true });
  t.after(srv.close);
  const created = await createOrder(srv);
  clock = PAST_GRACE;
  srv.rzp.pay(created.orderId, { id: 'pay_stale_auth', status: 'authorized' });
  srv.rzp.pay(created.orderId, { id: 'pay_later_captured' });
  const st = await askStatus(srv, created.orderId);
  assert.equal(st.status, 200, JSON.stringify(st.json));
  assert.equal(srv.db.read('subscriptions/u1').pricePaidInr, 599, 'granted at the order price');
  assert.equal(srv.rzp.calls.filter((c) => c.url.includes('/capture')).length, 0, 'the stale authorization was never captured');
});

test('PRICING-1 · an EXISTING founder is never refused: a late authorized founding order is captured and granted', async (t) => {
  let clock = LAST_SECOND;
  const db = memoryFirestore({ 'subscriptions/u1': { tier: 'free', foundingMember: true }, 'subscriptions/u1/payments/pay_old_month': { passType: 'month' } });
  const srv = await startRoutes({ db, now: () => clock, calendarOffer: true });
  t.after(srv.close);
  const created = await createOrder(srv);
  clock = PAST_GRACE;
  const p = srv.rzp.pay(created.orderId, { status: 'authorized' });
  const r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId: created.orderId, paymentId: p.id, signature: checkoutSig(created.orderId, p.id) }, headers: asUid('u1') });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(srv.db.read('subscriptions/u1').pricePaidInr, 599);
});

/* ══════════════════════════════════════════════════════════════════════════
   PRICE-FIXED-1 - Board Pass fixed at 1,917; month pass retired for new buyers from 2026-11-01T00:00:00+05:30
   ══════════════════════════════════════════════════════════════════════════ */

const RETIRE_MINUS_1S = Date.parse('2026-10-31T23:59:59+05:30');
const RETIRE_AT = Date.parse('2026-11-01T00:00:00+05:30');

test('PRICE-FIXED-1 · the retirement instant is exactly 2026-11-01T00:00:00+05:30 and the Board Pass constants are 1917 (founding) and 2499 (after)', () => {
  assert.equal(pricing.MONTH_PASS_RETIRED_AT_ISO, '2026-11-01T00:00:00+05:30');
  assert.equal(pricing.MONTH_PASS_RETIRED_AT_MS, RETIRE_AT);
  assert.equal(pricing.TILL_BOARDS_FOUNDING_INR, 1917);
  assert.equal(pricing.TILL_BOARDS_AFTER_FOUNDING_INR, 2499);
  assert.equal(pricing.monthPassRetired(RETIRE_MINUS_1S), false);
  assert.equal(pricing.monthPassRetired(RETIRE_AT), true);
  assert.equal(pricing.monthPassAvailable(RETIRE_AT, true), true);
  assert.equal(pricing.monthPassAvailable(RETIRE_AT, false), false);
});

test('PRICE-FIXED-1 · till_boards is 1917 until the founding deadline and 2499 from it: 31 Oct, 30 Nov 23:59:59 IST -> 1917; 1 Dec 00:00:00 IST, 2 Dec, 1 Feb -> 2499 (the SERVER clock decides)', async (t) => {
  const cases = [
    [Date.parse('2026-10-31T10:00:00+05:30'), 191700],
    [Date.parse('2026-11-15T10:00:00+05:30'), 191700],
    [Date.parse('2026-11-30T23:59:59+05:30'), 191700],
    [Date.parse('2026-12-01T00:00:00+05:30'), 249900],
    [Date.parse('2026-12-02T10:00:00+05:30'), 249900],
    [Date.parse('2027-02-01T10:00:00+05:30'), 249900],
  ];
  for (const [nowMs, paise] of cases) {
    const label = new Date(nowMs).toISOString();
    assert.equal(quotePass({}, 'till_boards', nowMs).amountPaise, paise, `quote ${label}`);
    const srv = await startRoutes({ now: () => nowMs, calendarOffer: true });
    t.after(srv.close);
    const out = await createOrder(srv, 'u_tb', 'till_boards');
    assert.equal(out.amountPaise, paise, `order ${label}`);
    const sent = srv.rzp.calls.find((c) => c.method === 'POST' && c.url.endsWith('/v1/orders'));
    assert.equal(sent.body.amount, paise);
  }
});

test('PRICE-FIXED-1 · the two Board Pass constants: 1917 founding, 2499 after (one constant each, server-decided)', () => {
  assert.equal(pricing.TILL_BOARDS_FOUNDING_INR, 1917);
  assert.equal(pricing.TILL_BOARDS_AFTER_FOUNDING_INR, 2499);
  assert.equal(pricing.tillBoardsPriceInr(pricing.FOUNDING_OFFER_CLOSES_AT_MS - 1), 1917);
  assert.equal(pricing.tillBoardsPriceInr(pricing.FOUNDING_OFFER_CLOSES_AT_MS), 2499);
});

test('PRICE-FIXED-1 · month order BEFORE the instant (23:59:59 IST 31 Oct) is still accepted for a never-month uid', async (t) => {
  const srv = await startRoutes({ now: () => RETIRE_MINUS_1S, calendarOffer: true });
  t.after(srv.close);
  const out = await createOrder(srv, 'u_new', 'month');
  assert.equal(out.amountPaise, 59900);
});

test('PRICE-FIXED-1 · month order AT/AFTER the instant is REFUSED (409 month_pass_retired) for a never-month uid; Razorpay is never called, nothing stored', async (t) => {
  for (const at of [RETIRE_AT, istNoon('2026-11-15'), istNoon('2026-12-05')]) {
    const srv = await startRoutes({ now: () => at, calendarOffer: true });
    t.after(srv.close);
    const r = await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'month' }, headers: asUid('u_new') });
    assert.equal(r.status, 409, JSON.stringify(r.json));
    assert.equal(r.json.error, 'month_pass_retired');
    assert.equal(srv.rzp.calls.length, 0, 'Razorpay was called for a refused month order');
    assert.equal([...srv.db.docs.keys()].filter((k) => k.startsWith('payOrders/')).length, 0);
    assert.ok(srv.events.includes('payments.order.month_pass_retired'));
  }
});

test('PRICE-FIXED-1 · a client claim cannot open the gate: monthPassAvailable / hasPaidMonth / amount in the body are ignored after the instant', async (t) => {
  const srv = await startRoutes({ now: () => istNoon('2026-11-10'), calendarOffer: true });
  t.after(srv.close);
  const r = await request(srv.port, PAY_ORDER_PATH, {
    body: { passType: 'month', monthPassAvailable: true, hasPaidMonth: true, priorMonthOrder: true, amount: 1, amountPaise: 100 },
    headers: asUid('u_new'),
  });
  assert.equal(r.status, 409);
  assert.equal(r.json.error, 'month_pass_retired');
});

test('PRICE-FIXED-1 · after the instant a uid with a prior PAID month order may still order a month (ledger record, paid payOrder, or a stored month pass)', async (t) => {
  const seeds = {
    ledger: { 'subscriptions/u_b/payments/pay_x': { passType: 'month', pricePaidInr: 599 } },
    paidOrder: { 'payOrders/order_old': { uid: 'u_b', passType: 'month', status: 'paid', amountPaise: 59900 } },
    storedMonth: { 'subscriptions/u_b': { tier: 'premium', passType: 'month', passEnd: new Date(istNoon('2026-10-20')) } },
  };
  for (const [name, seed] of Object.entries(seeds)) {
    const srv = await startRoutes({ db: memoryFirestore(seed), now: () => istNoon('2026-11-10'), calendarOffer: true });
    t.after(srv.close);
    const out = await createOrder(srv, 'u_b', 'month');
    assert.equal(out.amountPaise, 59900, name);
  }
});

test('PRICE-FIXED-1 · only a PAID MONTH order counts: an unpaid month order, another uid\'s month order, a till_boards payment and a pack do not open the gate', async (t) => {
  const db = memoryFirestore({
    'payOrders/o1': { uid: 'u_c', passType: 'month', status: 'created' },
    'payOrders/o2': { uid: 'someone_else', passType: 'month', status: 'paid' },
    'payOrders/o3': { uid: 'u_c', passType: 'till_boards', status: 'paid' },
    'subscriptions/u_c/payments/p1': { passType: 'till_boards', pricePaidInr: 1917 },
  });
  const srv = await startRoutes({ db, now: () => istNoon('2026-11-10'), calendarOffer: true });
  t.after(srv.close);
  const r = await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'month' }, headers: asUid('u_c') });
  assert.equal(r.status, 409);
  // ...and the Board Pass is of course still sold to the same account.
  const ok = await createOrder(srv, 'u_c', 'till_boards');
  assert.equal(ok.amountPaise, 191700);
});

test('PRICE-FIXED-1 · a read failure while deriving the history FAILS CLOSED (no order, no Razorpay call)', async (t) => {
  const db = memoryFirestore();
  const realCollection = db.collection;
  db.collection = (name) => {
    const c = realCollection(name);
    if (name === 'payOrders') return { ...c, where: () => { throw new Error('firestore down'); } };
    return c;
  };
  const srv = await startRoutes({ db, now: () => istNoon('2026-11-10'), calendarOffer: true });
  t.after(srv.close);
  const r = await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'month' }, headers: asUid('u_new') });
  assert.equal(r.status, 500);
  assert.equal(srv.rzp.calls.length, 0);
});

test('PRICE-FIXED-1 · /api/pay/status {offer:true} reports the SERVER-derived monthPassAvailable (and writes nothing)', async (t) => {
  // Shown to prior buyers ONLY, on every date (hidden from everyone else from the moment this ships), even
  // though the ORDER gate does not close until the instant.
  const before = await startRoutes({ now: () => RETIRE_MINUS_1S, calendarOffer: true });
  t.after(before.close);
  assert.equal((await request(before.port, PAY_STATUS_PATH, { body: { offer: true }, headers: asUid('u_new') })).json.monthPassAvailable, false);

  const db = memoryFirestore({ 'subscriptions/u_b/payments/pay_x': { passType: 'month' } });
  const after = await startRoutes({ db, now: () => istNoon('2026-11-10'), calendarOffer: true });
  t.after(after.close);
  const neverBought = await request(after.port, PAY_STATUS_PATH, { body: { offer: true, monthPassAvailable: true }, headers: asUid('u_new') });
  assert.equal(neverBought.status, 200);
  assert.equal(neverBought.json.monthPassAvailable, false);
  const buyer = await request(after.port, PAY_STATUS_PATH, { body: { offer: true }, headers: asUid('u_b') });
  assert.equal(buyer.json.monthPassAvailable, true);
  const signedOut = await request(after.port, PAY_STATUS_PATH, { body: { offer: true } });
  assert.equal(signedOut.status, 401);
  assert.equal(after.rzp.calls.length, 0);
});

test('PRICE-FIXED-1 · a month order CREATED before the instant and PAID after it is still granted (captured money is never stranded)', async (t) => {
  let clock = RETIRE_MINUS_1S;
  const srv = await startRoutes({ now: () => clock, calendarOffer: true });
  t.after(srv.close);
  const created = await createOrder(srv, 'u_late', 'month');
  clock = istNoon('2026-11-02');
  const p = srv.rzp.pay(created.orderId);
  const r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId: created.orderId, paymentId: p.id, signature: checkoutSig(created.orderId, p.id) }, headers: asUid('u_late') });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(srv.db.read('subscriptions/u_late').passType, 'month');
});

/* ══════════════════════════════════════════════════════════════════════════
   PRICE-FIXED-1 - EXISTING BUYERS ARE NOT AFFECTED (owner ruling 20:31 IST, 31 Oct 2026)
   (1) a till_boards buyer keeps their pass, its end date and the grant/extension logic
   (2) a month buyer keeps the month option at the existing price logic (founding lock) and can renew/extend
   (3) admin grants and pack credit are unchanged
   (4) no existing subscriptions/{uid} or payOrders doc is rewritten or migrated - no new write path
   ══════════════════════════════════════════════════════════════════════════ */

const { grantPass, computeGrant } = require('../services/passGrant.cjs');
const BOARD_END = Date.parse('2027-02-17T23:59:59.999+05:30');
const snapshotDocs = (db) => JSON.stringify([...db.docs.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, e]) => [k, e.data, e.version]));

/** An EXISTING till_boards buyer: a paid Board Pass at the old shrinking price (2,396), founding member. */
const tillBoardsBuyerSeed = () => ({
  'subscriptions/tb1': {
    tier: 'premium', plan: 'pass_till_boards', passType: 'till_boards',
    passStart: new Date(istNoon('2026-09-27')), passEnd: new Date(BOARD_END),
    pricePaidInr: 2396, offerKey: 'founding', foundingMember: true, lastPaymentRef: 'pay_tb_old',
  },
  'subscriptions/tb1/payments/pay_tb_old': { passType: 'till_boards', pricePaidInr: 2396, grantedAt: new Date(istNoon('2026-09-27')) },
  'payOrders/order_tb_old': { uid: 'tb1', passType: 'till_boards', status: 'paid', amountPaise: 239600, offerKey: 'founding', paymentId: 'pay_tb_old' },
});

/** An EXISTING month buyer: a founding-rate month pass still running on 20 Nov. */
const monthBuyerSeed = () => ({
  'subscriptions/mb1': {
    tier: 'premium', plan: 'pass_month', passType: 'month',
    passStart: new Date(istNoon('2026-11-05')), passEnd: new Date(istNoon('2026-12-05')),
    pricePaidInr: 599, offerKey: 'founding', foundingMember: true, lastPaymentRef: 'pay_mb_old',
  },
  'subscriptions/mb1/payments/pay_mb_old': { passType: 'month', pricePaidInr: 599, grantedAt: new Date(istNoon('2026-11-05')) },
  'payOrders/order_mb_old': { uid: 'mb1', passType: 'month', status: 'paid', amountPaise: 59900, offerKey: 'founding', paymentId: 'pay_mb_old' },
});

test('EXISTING-BUYERS (1) · a till_boards buyer: their stored pass is byte-identical after the offer endpoint, a refused month order and a new Board Pass ORDER; the new order is the only write', async (t) => {
  const db = memoryFirestore(tillBoardsBuyerSeed());
  const srv = await startRoutes({ db, now: () => istNoon('2026-11-10'), calendarOffer: true });
  t.after(srv.close);
  const before = snapshotDocs(db);

  // The offer endpoint: not a month buyer -> month hidden. Writes nothing.
  const offer = await request(srv.port, PAY_STATUS_PATH, { body: { offer: true }, headers: asUid('tb1') });
  assert.equal(offer.json.monthPassAvailable, false);
  // A month order is refused (never bought a month): writes nothing.
  const refused = await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'month' }, headers: asUid('tb1') });
  assert.equal(refused.status, 409);
  assert.equal(snapshotDocs(db), before, 'a read-only/refused call rewrote a stored document');

  // A new Board Pass order: priced at the fixed 1917; the ONLY new document is the new payOrders order.
  const ok = await createOrder(srv, 'tb1', 'till_boards');
  assert.equal(ok.amountPaise, 191700);
  const after = new Map(db.docs);
  const added = [...after.keys()].filter((k) => !JSON.parse(before).some(([bk]) => bk === k));
  assert.deepEqual(added, [`payOrders/${ok.orderId}`]);
  for (const [k, data, version] of JSON.parse(before)) {
    assert.equal(db.docs.get(k).version, version, `${k} was rewritten`);
    assert.deepEqual(JSON.parse(JSON.stringify(db.docs.get(k).data)), data, `${k} changed`);
  }
});

test('EXISTING-BUYERS (1) · a till_boards buyer keeps the SAME end date and stacking rule: re-granting never shortens a later passEnd, a replay changes nothing, and the paid order record is untouched', async () => {
  const db = memoryFirestore(tillBoardsBuyerSeed());
  const orderBefore = JSON.stringify(db.read('payOrders/order_tb_old'));
  // Replay of the ORIGINAL payment: nothing is written.
  const sameRef = await grantPass({ uid: 'tb1', passType: 'till_boards', paymentRef: 'pay_tb_old', now: istNoon('2026-11-10') }, { firestore: db });
  assert.equal(sameRef.replayed, true);
  assert.equal(ms(db.read('subscriptions/tb1').passEnd), BOARD_END);
  assert.equal(db.read('subscriptions/tb1').pricePaidInr, 2396, 'the old price they paid was rewritten');
  // An admin/owner extension beyond the board day is preserved by a later Board Pass grant (existing logic).
  const extended = memoryFirestore({ ...tillBoardsBuyerSeed(), 'subscriptions/tb1': { ...tillBoardsBuyerSeed()['subscriptions/tb1'], passEnd: new Date(Date.parse('2027-04-30T23:59:59+05:30')) } });
  await grantPass({ uid: 'tb1', passType: 'till_boards', paymentRef: 'pay_tb_new', now: istNoon('2026-11-10') }, { firestore: extended });
  assert.equal(ms(extended.read('subscriptions/tb1').passEnd), Date.parse('2027-04-30T23:59:59+05:30'), 'a later passEnd was shortened');
  assert.equal(extended.read('subscriptions/tb1').pricePaidInr, 1917);
  assert.equal(JSON.stringify(db.read('payOrders/order_tb_old')), orderBefore);
  // The pure rule is unchanged: a till_boards grant on an unexpired pass ends at max(stored end, board end).
  const d = computeGrant(tillBoardsBuyerSeed()['subscriptions/tb1'], { passType: 'till_boards', paymentRef: 'p2', nowMs: istNoon('2026-12-20') });
  assert.equal(ms(d.fields.passEnd), BOARD_END);
  assert.equal(d.fields.foundingMember, true, 'the founding flag is sticky and was not cleared');
});

test('EXISTING-BUYERS (2) · a month buyer keeps the month option on every date, at the founding lock, and can renew: the offer says available, the order is priced as before, the grant stacks on the running pass', async (t) => {
  for (const [day, expectPaise] of [['2026-11-20', 59900], ['2026-12-10', 59900]]) {
    const db = memoryFirestore(monthBuyerSeed());
    let clock = istNoon(day);
    const srv = await startRoutes({ db, now: () => clock, calendarOffer: true });
    t.after(srv.close);
    const offer = await request(srv.port, PAY_STATUS_PATH, { body: { offer: true }, headers: asUid('mb1') });
    assert.equal(offer.json.monthPassAvailable, true, `${day}: month hidden from a month buyer`);
    // Existing price logic: the founding lock holds after the 1 Dec close (foundingMember is sticky).
    const created = await createOrder(srv, 'mb1', 'month');
    assert.equal(created.amountPaise, expectPaise, `${day}: month price for an existing founding buyer`);
    // Renewal: pay, verify, the pass is extended.
    const p = srv.rzp.pay(created.orderId);
    const r = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId: created.orderId, paymentId: p.id, signature: checkoutSig(created.orderId, p.id) }, headers: asUid('mb1') });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const sub = db.read('subscriptions/mb1');
    assert.equal(sub.passType, 'month');
    assert.equal(sub.pricePaidInr, 599);
    assert.equal(sub.foundingMember, true);
    if (day === '2026-11-20') {
      // Still running on 20 Nov -> the new month stacks from the stored end (5 Dec -> 5 Jan).
      assert.equal(ms(sub.passStart), istNoon('2026-12-05'));
      assert.equal(ms(sub.passEnd), istNoon('2027-01-05'));
    }
    // The OLD paid order and ledger record are untouched.
    assert.equal(db.read('payOrders/order_mb_old').status, 'paid');
    assert.equal(db.read('payOrders/order_mb_old').amountPaise, 59900);
    assert.equal(db.read('subscriptions/mb1/payments/pay_mb_old').pricePaidInr, 599);
  }
});

test('EXISTING-BUYERS (2) · a month buyer who was NOT a founder keeps the list price logic (999 after 1 Dec) - the price rule itself is untouched', async (t) => {
  const seed = monthBuyerSeed();
  seed['subscriptions/mb1'] = { ...seed['subscriptions/mb1'], foundingMember: false, offerKey: 'regular', pricePaidInr: 999 };
  const srv = await startRoutes({ db: memoryFirestore(seed), now: () => istNoon('2026-12-10'), calendarOffer: true });
  t.after(srv.close);
  assert.equal((await createOrder(srv, 'mb1', 'month')).amountPaise, 99900);
});

test('EXISTING-BUYERS (3) · admin grants are not gated: the owner can still grant a month or Board Pass to any uid after the instant, at the existing prices', async () => {
  const db = memoryFirestore();
  const month = await grantPass({ uid: 'newcomer', passType: 'month', paymentRef: 'admin_m1', now: istNoon('2026-11-10') }, { firestore: db });
  assert.equal(month.replayed, false);
  assert.equal(db.read('subscriptions/newcomer').pricePaidInr, 599, 'month grant price (founding open on 10 Nov)');
  const boards = await grantPass({ uid: 'newcomer2', passType: 'till_boards', paymentRef: 'admin_t1', now: istNoon('2026-12-10') }, { firestore: db });
  assert.equal(boards.replayed, false);
  assert.equal(db.read('subscriptions/newcomer2').pricePaidInr, 2499, 'Board Pass grant price on 10 Dec (after the founding deadline)');
  // ...and the route-level gate lives ONLY in the order routes, not in the grant path.
  const grantSrc = fs.readFileSync(path.join(__dirname, '..', 'services', 'passGrant.cjs'), 'utf8');
  const grantFn = grantSrc.slice(grantSrc.indexOf('async function grantPass('), grantSrc.indexOf('PRICE-FIXED-1 - has this account EVER'));
  assert.ok(!/monthPassAvailableFor|hasPaidMonthOrder|monthPassRetired/.test(grantFn), 'grantPass consults the month gate');
});

test('EXISTING-BUYERS (3) · pack credit is unchanged: a Board Pass order is still credited with a pack bought in the last 7 days, now off the fixed 1917', async (t) => {
  const db = memoryFirestore({
    'packEntitlements/pc1/packs/pk1': { packId: 'pk1', sku: 'pack_chapter', target: 'triangles', pricePaidInr: 49, paidAt: istNoon('2026-11-09'), creditedToPass: false },
  });
  const srv = await startRoutes({ db, now: () => istNoon('2026-11-10'), calendarOffer: true });
  t.after(srv.close);
  const out = await createOrder(srv, 'pc1', 'till_boards');
  assert.equal(out.amountPaise, (1917 - 49) * 100);
  const stored = db.read(`payOrders/${out.orderId}`);
  assert.equal(stored.packCreditInr, 49);
  // The pack is NOT marked credited until the payment is granted (unchanged behaviour).
  assert.equal(db.read('packEntitlements/pc1/packs/pk1').creditedToPass, false);
  // And a month order earns no credit (unchanged), for a month buyer.
  const mdb = memoryFirestore({ ...monthBuyerSeed(), 'packEntitlements/mb1/packs/pk2': { packId: 'pk2', sku: 'pack_chapter', target: 'x', pricePaidInr: 49, paidAt: istNoon('2026-11-19'), creditedToPass: false } });
  const msrv = await startRoutes({ db: mdb, now: () => istNoon('2026-11-20'), calendarOffer: true });
  t.after(msrv.close);
  assert.equal((await createOrder(msrv, 'mb1', 'month')).amountPaise, 59900);
});

test('EXISTING-BUYERS (4) · NO new write path: the month-history helpers are read-only, and neither refused orders nor the offer endpoint change a single stored document', async (t) => {
  const passGrantSrc = fs.readFileSync(path.join(__dirname, '..', 'services', 'passGrant.cjs'), 'utf8');
  for (const fn of ['async function hasPaidMonthOrder(', 'async function monthPassAvailableFor(']) {
    const start = passGrantSrc.indexOf(fn);
    assert.ok(start > 0, fn);
    const body = passGrantSrc.slice(start, passGrantSrc.indexOf('\n}\n', start));
    assert.ok(!/\.(set|update|delete|create)\(|runTransaction|\.batch\(/.test(body), `${fn} writes`);
  }
  // Run every new read path against a populated database and compare the whole store before/after.
  const db = memoryFirestore({ ...tillBoardsBuyerSeed(), ...monthBuyerSeed() });
  const srv = await startRoutes({ db, now: () => istNoon('2026-11-10'), calendarOffer: true });
  t.after(srv.close);
  const before = snapshotDocs(db);
  for (const uid of ['tb1', 'mb1', 'nobody']) {
    await request(srv.port, PAY_STATUS_PATH, { body: { offer: true }, headers: asUid(uid) });
    await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'month' }, headers: { ...asUid(uid) } }).catch(() => undefined);
  }
  // mb1's month order above is accepted (creates ONE payOrders doc); nothing else may differ.
  const afterKeys = [...db.docs.keys()];
  const newKeys = afterKeys.filter((k) => !JSON.parse(before).some(([bk]) => bk === k));
  assert.ok(newKeys.every((k) => k.startsWith('payOrders/order_T')), `unexpected new documents: ${newKeys}`);
  for (const [k, data, version] of JSON.parse(before)) {
    assert.equal(db.docs.get(k).version, version, `${k} was rewritten`);
  }
  // Source-level: the only code that WRITES subscriptions/{uid} is still grantPass (no migration, no backfill).
  const paymentsSrc = fs.readFileSync(PAYMENTS_CJS, 'utf8');
  assert.ok(!/collection\(SUBSCRIPTIONS_COLLECTION\)[^;]*\.(set|update)\(/.test(paymentsSrc), 'payments.cjs writes a subscription');
  const parentSrc = fs.readFileSync(path.join(__dirname, 'parentPay.cjs'), 'utf8');
  assert.ok(!/collection\(SUBSCRIPTIONS_COLLECTION\)[^;]*\.(set|update)\(/.test(parentSrc), 'parentPay.cjs writes a subscription');
});
