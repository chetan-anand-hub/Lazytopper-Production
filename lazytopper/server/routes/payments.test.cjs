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
  function ref(key) {
    return {
      key,
      collection: (sub) => ({ doc: (id) => ref(`${key}/${sub}/${id}`) }),
      async get() { await yieldNow(); return snapOf(docs.get(key)); },
      async set(data, opts) { await yieldNow(); write(key, data, opts); },
    };
  }
  return {
    docs,
    stats,
    read: (key) => (docs.get(key) ? { ...docs.get(key).data } : undefined),
    version: (key) => (docs.get(key) ? docs.get(key).version : 0),
    collection: (name) => ({ doc: (id) => ref(`${name}/${id}`) }),
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
async function startRoutes({ env = ENV_ON, db = memoryFirestore(), rzp = fakeRazorpay(), now = () => NOW, telemetry, topupBonus } = {}) {
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
    foundingOfferOpen: true,
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
  // The owner ruling's own table: 2026-09-27 at founding -> ₹2,396.
  assert.equal(out.amountPaise, 239600);
  assert.equal(quotePass({}, 'till_boards', NOW, { foundingOfferOpen: true }).amountPaise, 239600);
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
