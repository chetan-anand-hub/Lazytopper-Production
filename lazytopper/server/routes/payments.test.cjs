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
  let seq = 0;
  const reply = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json });
  async function fetchImpl(url, init = {}) {
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body, auth: init.headers && init.headers.Authorization });
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
  return { fetchImpl, orders, payments, calls, pay };
}

/* ── the routes behind a real HTTP server, so bodies arrive as real bytes ────────── */
async function startRoutes({ env = ENV_ON, db = memoryFirestore(), rzp = fakeRazorpay(), now = () => NOW, telemetry } = {}) {
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
  });
  const server = http.createServer((req, res) => {
    const p = String(req.url).split('?')[0];
    let h;
    if (req.method === 'POST' && p === PAY_ORDER_PATH) h = routes.handleOrder;
    else if (req.method === 'POST' && p === PAY_VERIFY_PATH) h = routes.handleVerify;
    else if (req.method === 'POST' && p === PAY_WEBHOOK_PATH) h = routes.handleWebhook;
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

test('Z1 · PAYMENTS_ENABLED unset: all three routes answer 404 and touch nothing', async (t) => {
  const rzp = fakeRazorpay();
  const db = memoryFirestore();
  const srv = await startRoutes({ env: { RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET }, rzp, db });
  t.after(srv.close);
  for (const p of [PAY_ORDER_PATH, PAY_VERIFY_PATH, PAY_WEBHOOK_PATH]) {
    const r = await request(srv.port, p, { body: { passType: 'month' }, headers: asUid('u1') });
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

test('Z1 · REAL index.cjs, switch OFF: the three routes give the gateway\'s own 404, byte-identical to an unknown path', { timeout: 90000 }, async (t) => {
  const port = await freePort();
  const srv = bootServer({ port });
  t.after(() => srv.child.kill());
  await srv.ready;
  const control = await request(port, '/api/pay/no-such-route', { body: {} });
  assert.equal(control.status, 404);
  for (const p of [PAY_ORDER_PATH, PAY_VERIFY_PATH, PAY_WEBHOOK_PATH]) {
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
});
