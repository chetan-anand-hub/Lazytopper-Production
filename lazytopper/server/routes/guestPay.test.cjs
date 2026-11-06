// PAY-PHONE-1 — "Pay now with your phone number", then sign in with the same number.
//
// Money + access path for a payer who is NOT signed in. Every test below is a reason an order, a payment or a claim
// is NOT believed — or proof that the grant lands only on the account whose VERIFIED token carries the order's phone.
//
//   D* dark by default        O* order: phone, SKU whitelist, server amount, limits, no double charge
//   V* verify: every check, no grant, idempotent    W* webhook: guest captured -> paid_unclaimed
//   C* claim: phone from the token only, both grants land, idempotent, concurrent
//
// ★ MUTATIONS (run against THIS file only, each shown red, each restored):
//   M1 guestPay.cjs handleClaim reads the phone from the body
//        -> "C · the phone comes ONLY from the verified token: a body phone is ignored" red
//   M2 guestPay.cjs takeOrder drops the `order.uid === uid` check on a `claimed` order
//        -> "C · a claim interrupted after take is finished by the SAME uid only" red
//   M3 guestPay.cjs handleOrder takes amountPaise from the body
//        -> "O · the amount is the server's: a pack is the table price, the Board Pass a NEW account's quote" red
//
// Run: node --test lazytopper/server/routes/guestPay.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');

const {
  createGuestPayRoutes,
  isGuestPayEnabled,
  GUEST_ORDER_PATH,
  GUEST_VERIFY_PATH,
  GUEST_CLAIM_PATH,
  MAX_GUEST_ORDERS_PER_PHONE_PER_DAY,
} = require('./guestPay.cjs');
const { normaliseIndianMobile, maskIndianMobile } = require('../services/guestPay.cjs');
const { createPaymentRoutes, quotePass, PAY_ORDER_PATH, PAY_WEBHOOK_PATH, PAY_VERIFY_PATH } = require('./payments.cjs');
const { createHttpUtils } = require('../services/httpUtils.cjs');
const { createPaymentReceiptEmailer, buildReceiptEmail, resolveReceiptEmailConfig } = require('../services/paymentReceiptEmail.cjs');

const KEY_ID = 'rzp_test_KEYID';
const KEY_SECRET = 'test_key_secret_never_sent';
const WEBHOOK_SECRET = 'test_webhook_secret';
const ENV_ON = {
  PAYMENTS_ENABLED: '1',
  GUEST_PAY_ENABLED: '1',
  PACKS_ENABLED: '1',
  RAZORPAY_KEY_ID: KEY_ID,
  RAZORPAY_KEY_SECRET: KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
};
const NOW = Date.parse('2026-11-02T12:00:00+05:30');
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');
const checkoutSig = (orderId, paymentId, secret = KEY_SECRET) => hmac(secret, `${orderId}|${paymentId}`);
const PHONE = '+919876543948';
const OTHER_PHONE = '+917012345678';

/* ── in-memory Firestore with optimistic transactions (the payments.test harness) ── */
function memoryFirestore(seed = {}) {
  const docs = new Map();
  for (const [key, data] of Object.entries(seed)) docs.set(key, { data: { ...data }, version: 1 });
  const yieldNow = () => new Promise((r) => setImmediate(r));
  const snapOf = (entry) => ({ exists: !!entry, data: () => (entry ? { ...entry.data } : undefined) });
  function write(key, data, opts) {
    const prev = docs.get(key);
    const base = opts && opts.merge && prev ? prev.data : {};
    docs.set(key, { data: { ...base, ...data }, version: (prev ? prev.version : 0) + 1 });
  }
  // PRICE-FIXED-1: chainable equality query over the documents directly under `prefix`.
  function chain(prefix, depth, filters = [], max = Infinity) {
    return {
      where(field, op, value) {
        assert.equal(op, '==');
        return chain(prefix, depth, [...filters, [field, value]], max);
      },
      limit: (n) => chain(prefix, depth, filters, n),
      async get() {
        await yieldNow();
        const out = [];
        for (const [key, entry] of docs) {
          if (!key.startsWith(`${prefix}/`) || key.slice(prefix.length + 1).includes('/')) continue;
          if (filters.every(([f, v]) => entry.data[f] === v) && out.length < max) out.push({ id: key.slice(prefix.length + 1), data: () => ({ ...entry.data }) });
        }
        return { docs: out, empty: out.length === 0, size: out.length };
      },
    };
  }
  function ref(key) {
    return {
      key,
      collection: (sub) => ({
        doc: (id) => ref(`${key}/${sub}/${id}`),
        ...chain(`${key}/${sub}`, 3),
        // PACK-CREDIT-1: the pack list read (packEntitlements/{uid}/packs).
        async get() {
          await yieldNow();
          const prefix = `${key}/${sub}/`;
          const out = [];
          for (const [k, e] of docs) {
            if (k.startsWith(prefix) && !k.slice(prefix.length).includes('/')) out.push({ id: k.slice(prefix.length), data: () => ({ ...e.data }) });
          }
          return { docs: out };
        },
      }),
      async get() { await yieldNow(); return snapOf(docs.get(key)); },
      async set(data, opts) { await yieldNow(); write(key, data, opts); },
    };
  }
  return {
    docs,
    read: (key) => (docs.get(key) ? { ...docs.get(key).data } : undefined),
    keys: (prefix) => [...docs.keys()].filter((k) => k.startsWith(prefix)),
    collection: (name) => ({
      doc: (id) => ref(`${name}/${id}`),
      // Equality queries, chainable (`where().where().limit().get()`), on a top-level collection.
      ...chain(name, 2),
    }),
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
        if (conflict) continue;
        for (const [k, d, o] of pending) write(k, d, o);
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
    calls.push({ url, method, body });
    const expectedAuth = `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`;
    if (!init.headers || init.headers.Authorization !== expectedAuth) return reply(401, {});
    const u = new URL(url);
    let m;
    if (method === 'POST' && u.pathname === '/v1/orders') {
      seq += 1;
      const order = { id: `order_P${seq}`, amount: body.amount, currency: body.currency, notes: body.notes, status: 'created' };
      orders.set(order.id, order);
      return reply(200, order);
    }
    if (method === 'GET' && (m = u.pathname.match(/^\/v1\/payments\/([^/]+)$/))) {
      const p = payments.get(m[1]);
      return p ? reply(200, { ...p }) : reply(400, {});
    }
    if (method === 'POST' && (m = u.pathname.match(/^\/v1\/payments\/([^/]+)\/capture$/))) {
      const p = payments.get(m[1]);
      if (!p || p.status !== 'authorized' || body.amount !== p.amount) return reply(400, {});
      p.status = 'captured';
      return reply(200, { ...p });
    }
    return reply(404, {});
  }
  function pay(orderId, { id = `pay_${orderId}`, amount, status = 'captured', currency = 'INR' } = {}) {
    const order = orders.get(orderId);
    const p = { id, order_id: orderId, amount: amount === undefined ? order.amount : amount, currency, status };
    payments.set(id, p);
    return p;
  }
  return { fetchImpl, orders, payments, calls, pay };
}


/* ── guest routes AND the existing payment routes (webhook), behind one real HTTP server ── */
async function startRoutes({ env = ENV_ON, db = memoryFirestore(), rzp = fakeRazorpay(), receiptEmailer, accountExistsForPhone, uidForPhone, uidForEmail, authAccounts, nowMs = NOW } = {}) {
  const { sendJson } = createHttpUtils('*');
  const events = [];
  const telemetry = { increment: (e) => events.push(e) };
  const now = () => nowMs; // GST-EXCL-1: a test may move the clock past the 7 Nov GST cut-off
  // `Bearer uid:<uid>` or `Bearer uid:<uid>|phone:<e164>` — the test stand-in for a token firebase-admin verified.
  const identityOf = (req) => {
    const h = String(req.headers.authorization || '');
    if (!h.startsWith('Bearer uid:')) return { uid: '', phoneNumber: '' };
    // CHECKOUT-WHO-1: optional `|email:<e>|ev:1` (ev:1 = Firebase says the email is verified).
    const [uidPart, ...rest] = h.slice('Bearer uid:'.length).split('|');
    const kv = Object.fromEntries(rest.map((x) => [x.slice(0, x.indexOf(':')), x.slice(x.indexOf(':') + 1)]));
    return { uid: uidPart, phoneNumber: kv.phone || '', ...(kv.email ? { email: kv.email, emailVerified: kv.ev === '1' } : {}) };
  };
  const verifiedCaller = {
    async resolveVerifiedUid(req) { return identityOf(req).uid; },
    async resolveVerifiedIdentity(req) { return identityOf(req); },
  };
  const guest = createGuestPayRoutes({ sendJson, verifiedCaller, adminFirestore: db, telemetry, env, fetchImpl: rzp.fetchImpl, now, foundingOfferOpen: true, receiptEmailer, accountExistsForPhone, uidForPhone, uidForEmail, authAccounts });
  // CHECKOUT-WHO-2: the webhook runs the guest routes' recipient delivery, wired exactly as index.cjs does.
  const pay = createPaymentRoutes({ sendJson, verifiedCaller, adminFirestore: db, telemetry, env, fetchImpl: rzp.fetchImpl, now, foundingOfferOpen: true, receiptEmailer, afterGuestPaid: (x) => guest.afterRecipientPaid(x) });
  const table = {
    [GUEST_ORDER_PATH]: guest.handleOrder,
    [GUEST_VERIFY_PATH]: guest.handleVerify,
    [GUEST_CLAIM_PATH]: guest.handleClaim,
    [PAY_ORDER_PATH]: pay.handleOrder,
    [PAY_VERIFY_PATH]: pay.handleVerify,
    [PAY_WEBHOOK_PATH]: pay.handleWebhook,
  };
  // CHECKOUT-WHO-1: a handler may keep working AFTER its response (delivery to an existing account); `idle()` waits for it.
  const pending = new Set();
  const server = http.createServer((req, res) => {
    const h = req.method === 'POST' ? table[String(req.url).split('?')[0]] : null;
    if (!h) return sendJson(res, 404, { error: 'Not Found' });
    const p = Promise.resolve(h(req, res)).catch((e) => sendJson(res, 500, { error: e.message }));
    pending.add(p);
    p.finally(() => pending.delete(p));
    return p;
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const idle = async () => {
    while (pending.size) await Promise.all([...pending]);
  };
  return { port, db, rzp, events, idle, close: () => new Promise((r) => server.close(r)) };
}

let ipSeq = 0;
function request(port, urlPath, { body, raw, headers = {} } = {}) {
  ipSeq += 1;
  return new Promise((resolve, reject) => {
    const payload = raw !== undefined ? raw : JSON.stringify(body === undefined ? {} : body);
    const req = http.request(
      { host: '127.0.0.1', port, path: urlPath, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), 'X-Forwarded-For': `198.51.100.${ipSeq % 250}`, ...headers } },
      (res) => {
        let text = '';
        res.on('data', (d) => { text += d; });
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
const signedIn = (uid, phone) => ({ Authorization: `Bearer uid:${uid}${phone ? `|phone:${phone}` : ''}` });
const guestOrder = (srv, body) => request(srv.port, GUEST_ORDER_PATH, { body });
const guestVerify = (srv, orderId, paymentId, signature = checkoutSig(orderId, paymentId)) =>
  request(srv.port, GUEST_VERIFY_PATH, { body: { orderId, paymentId, signature } });
const claim = (srv, headers, body = {}) => request(srv.port, GUEST_CLAIM_PATH, { body, headers });
function webhookBody(payment) {
  return `{"entity":"event","event":"payment.captured","payload":{"payment":{"entity":${JSON.stringify(payment)}}}}`;
}
function sendWebhook(srv, payment) {
  const raw = webhookBody(payment);
  return request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, raw) } });
}
/** Order + Razorpay capture + verify: a guest order in paid_unclaimed. */
async function paidGuestOrder(srv, body) {
  const o = await guestOrder(srv, body);
  assert.equal(o.status, 200, o.text);
  const p = srv.rzp.pay(o.json.orderId);
  const v = await guestVerify(srv, o.json.orderId, p.id);
  assert.equal(v.status, 200, v.text);
  return { orderId: o.json.orderId, paymentId: p.id, order: o.json, verify: v.json };
}
const subsDocs = (db) => db.keys('subscriptions/');
const packDocs = (db) => db.keys('packEntitlements/');

/* ══ D · dark by default ═══════════════════════════════════════════════════════ */

test('D · the switch needs BOTH PAYMENTS_ENABLED and GUEST_PAY_ENABLED', () => {
  assert.equal(isGuestPayEnabled({ PAYMENTS_ENABLED: '1', GUEST_PAY_ENABLED: '1' }), true);
  assert.equal(isGuestPayEnabled({ PAYMENTS_ENABLED: '1' }), false);
  assert.equal(isGuestPayEnabled({ GUEST_PAY_ENABLED: '1' }), false);
  assert.equal(isGuestPayEnabled({ PAYMENTS_ENABLED: '1', GUEST_PAY_ENABLED: 'enabled' }), false);
  assert.equal(isGuestPayEnabled({}), false);
});

test('D · either switch off: order and verify answer 404 and touch nothing; claim is 404 only while PAYMENTS is off', async (t) => {
  for (const env of [{ ...ENV_ON, GUEST_PAY_ENABLED: '' }, { ...ENV_ON, PAYMENTS_ENABLED: '0' }]) {
    const srv = await startRoutes({ env });
    t.after(srv.close);
    for (const p of [GUEST_ORDER_PATH, GUEST_VERIFY_PATH]) {
      const r = await request(srv.port, p, { body: { sku: 'till_boards', phone: '9876543948', orderId: 'order_X', paymentId: 'pay_X', signature: 'ab' } });
      assert.equal(r.status, 404, p);
      assert.deepEqual(r.json, { error: 'Not Found' });
    }
    const c = await claim(srv, signedIn('u1', PHONE));
    assert.equal(c.status, env.PAYMENTS_ENABLED === '1' ? 200 : 404);
    assert.equal(srv.rzp.calls.length, 0);
    assert.equal(srv.db.docs.size, 0);
  }
});

/* ══ O · the order ═════════════════════════════════════════════════════════════ */

test('O · phone validation: Indian mobile only, normalised to E.164; everything else is refused', () => {
  const ok = { '9876543948': PHONE, '+919876543948': PHONE, '919876543948': PHONE, '09876543948': PHONE, '98765 43948': PHONE, '+91 98765-43948': PHONE, '6000000000': '+916000000000' };
  for (const [raw, want] of Object.entries(ok)) assert.equal(normaliseIndianMobile(raw), want, raw);
  for (const bad of ['', '5876543948', '987654394', '98765439481', '+19876543948', '+44 9876543948', 'abcdefghij', '98765abc48', null, 9876543948, '+91987654394', '0'.repeat(30)]) {
    assert.equal(normaliseIndianMobile(bad), null, String(bad));
  }
  assert.equal(maskIndianMobile(PHONE), '+91 98•••••948');
  assert.equal(maskIndianMobile('nonsense'), '');
});

test('O · a bad phone, an unknown / month / top-up SKU or a bad target is a 400 before Razorpay is called', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const cases = [
    [{ sku: 'till_boards', phone: '12345' }, 'invalid_phone'],
    [{ sku: 'till_boards' }, 'invalid_phone'],
    [{ sku: 'month', phone: PHONE }, 'invalid_sku'],
    [{ sku: 'topup_small', phone: PHONE }, 'invalid_sku'],
    [{ sku: 'premium', phone: PHONE }, 'invalid_sku'],
    [{ sku: 'pack_mock', target: 'history', phone: PHONE }, 'invalid_target'],
    [{ sku: 'pack_chapter', target: 'not-a-chapter', phone: PHONE }, 'invalid_target'],
  ];
  for (const [body, reason] of cases) {
    const r = await guestOrder(srv, body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.json.reason, reason, JSON.stringify(body));
  }
  assert.equal(srv.rzp.calls.length, 0);
  assert.equal(srv.db.docs.size, 0);
});

test('O · packs are not sold to a guest while PACKS_ENABLED is off (the pack key is just an unknown SKU)', async (t) => {
  const srv = await startRoutes({ env: { ...ENV_ON, PACKS_ENABLED: '' } });
  t.after(srv.close);
  const r = await guestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  assert.equal(r.status, 400);
  assert.equal(r.json.reason, 'invalid_sku');
});

test('O · the amount is the server\'s: a pack is the table price, the Board Pass a NEW account\'s quote; body amount / uid ignored', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const pack = await guestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: '98765 43948', amountPaise: 100, amount: 1, price: 1, uid: 'attacker' });
  assert.equal(pack.status, 200, pack.text);
  assert.equal(pack.json.amountPaise, 9900);
  assert.equal(pack.json.contact, undefined, 'review fix 6: the number is never echoed back');
  assert.ok(!pack.text.includes('9876543948'));
  assert.equal(pack.json.phoneMasked, '+91 98•••••948');
  const stored = srv.db.read(`payOrders/${pack.json.orderId}`);
  assert.equal(stored.uid, null);
  assert.equal(stored.payer, 'guest');
  assert.equal(stored.guestPhone, PHONE);
  assert.equal(stored.passType, 'pack_mock');
  assert.equal(stored.packTarget, 'maths');
  assert.equal(stored.amountPaise, 9900);
  assert.equal(stored.status, 'created');

  const pass = await guestOrder(srv, { sku: 'till_boards', phone: OTHER_PHONE, amountPaise: 100 });
  assert.equal(pass.status, 200, pass.text);
  const fresh = quotePass({}, 'till_boards', NOW, { foundingOfferOpen: true });
  assert.equal(pass.json.amountPaise, fresh.amountPaise);
  assert.equal(srv.db.read(`payOrders/${pass.json.orderId}`).offerKey, 'founding');

  // Razorpay sees the server amount and NO phone / uid in its notes.
  const created = srv.rzp.calls.filter((c) => c.method === 'POST' && c.url.endsWith('/orders'));
  assert.deepEqual(created.map((c) => c.body.amount), [9900, fresh.amountPaise]);
  for (const c of created) {
    assert.ok(!JSON.stringify(c.body).includes('9876543948') && !JSON.stringify(c.body).includes('7012345678'));
    assert.equal(c.body.notes.uid, undefined);
    assert.equal(c.body.notes.payer, 'guest');
  }
});

test('O · per-phone limit: the same number cannot start more than the daily cap of orders', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  for (let i = 0; i < MAX_GUEST_ORDERS_PER_PHONE_PER_DAY; i += 1) {
    const r = await guestOrder(srv, { sku: 'pack_chapter', target: 'real-numbers', phone: PHONE });
    assert.equal(r.status, 200, `order ${i}`);
  }
  const over = await guestOrder(srv, { sku: 'pack_chapter', target: 'real-numbers', phone: '+91 98765 43948' });
  assert.equal(over.status, 429);
  const other = await guestOrder(srv, { sku: 'pack_chapter', target: 'real-numbers', phone: OTHER_PHONE });
  assert.equal(other.status, 200);
});

test('O · the same thing already paid with this number and not yet claimed is refused (409), nothing charged twice', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  await paidGuestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  const again = await guestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  assert.equal(again.status, 409);
  // Review fix 4: generic - nothing says this number has a purchase.
  assert.deepEqual(again.json, { ok: false, error: 'payment_unavailable' });
  // A different pack is a different purchase.
  const other = await guestOrder(srv, { sku: 'pack_mock', target: 'science', phone: PHONE });
  assert.equal(other.status, 200);
});

/* ══ V · verify ════════════════════════════════════════════════════════════════ */

test('V · a verified, captured payment moves the order to paid_unclaimed and grants NOTHING', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId, paymentId, verify } = await paidGuestOrder(srv, { sku: 'till_boards', phone: PHONE });
  assert.deepEqual(
    { status: verify.status, kind: verify.kind, sku: verify.sku, phoneMasked: verify.phoneMasked },
    { status: 'paid_unclaimed', kind: 'pass', sku: 'till_boards', phoneMasked: '+91 98•••••948' },
  );
  const stored = srv.db.read(`payOrders/${orderId}`);
  assert.equal(stored.status, 'paid_unclaimed');
  assert.equal(stored.paymentId, paymentId);
  assert.equal(stored.uid, null);
  assert.equal(stored.paidAt, undefined, 'paidAt is written only by a grant');
  assert.deepEqual(subsDocs(srv.db), []);
  assert.deepEqual(packDocs(srv.db), []);
});

test('V · every check: bad signature, unknown order, a student\'s own order, wrong amount / currency / order, not captured, payment swap', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  const orderId = o.json.orderId;
  const good = srv.rzp.pay(orderId, { id: 'pay_good' });

  assert.equal((await guestVerify(srv, orderId, good.id, checkoutSig(orderId, good.id, 'wrong-secret'))).json.reason, 'bad_signature');
  assert.equal((await guestVerify(srv, 'order_nope', 'pay_x')).json.reason, 'unknown_order');
  assert.equal((await request(srv.port, GUEST_VERIFY_PATH, { body: { orderId, paymentId: 'p/../x', signature: 'zz' } })).json.reason, 'malformed');

  // A signed-in student's own (non-guest) order can never be pushed through the guest route.
  const own = await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'pack_mock', packTarget: 'maths' }, headers: signedIn('student1') });
  assert.equal(own.status, 200, own.text);
  const ownPay = srv.rzp.pay(own.json.orderId);
  assert.equal((await guestVerify(srv, own.json.orderId, ownPay.id)).json.reason, 'not_guest');

  const cheap = srv.rzp.pay(orderId, { id: 'pay_cheap', amount: 100 });
  assert.equal((await guestVerify(srv, orderId, cheap.id)).json.reason, 'amount_mismatch');
  const usd = srv.rzp.pay(orderId, { id: 'pay_usd', currency: 'USD' });
  assert.equal((await guestVerify(srv, orderId, usd.id)).json.reason, 'currency_mismatch');
  const failed = srv.rzp.pay(orderId, { id: 'pay_failed', status: 'failed' });
  assert.equal((await guestVerify(srv, orderId, failed.id)).json.reason, 'not_captured');
  // A real payment of ANOTHER order, signed for this one.
  const o2 = await guestOrder(srv, { sku: 'pack_mock', target: 'science', phone: PHONE });
  const elsewhere = srv.rzp.pay(o2.json.orderId, { id: 'pay_elsewhere' });
  assert.equal((await guestVerify(srv, orderId, elsewhere.id)).json.reason, 'order_mismatch');

  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'created');
  const ok = await guestVerify(srv, orderId, good.id);
  assert.equal(ok.status, 200);
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'paid_unclaimed');
  assert.deepEqual(packDocs(srv.db), []);
});

test('V · an authorized payment is captured for the STORED amount, then recorded', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'pack_chapter', target: 'real-numbers', phone: PHONE });
  const p = srv.rzp.pay(o.json.orderId, { status: 'authorized' });
  const v = await guestVerify(srv, o.json.orderId, p.id);
  assert.equal(v.status, 200, v.text);
  const capture = srv.rzp.calls.find((c) => c.url.endsWith('/capture'));
  assert.equal(capture.body.amount, 4900);
});

test('V · idempotent: a repeat verify (and verify after the webhook) answers the same and asks Razorpay nothing new', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId, paymentId } = await paidGuestOrder(srv, { sku: 'till_boards', phone: PHONE });
  const before = srv.rzp.calls.length;
  const again = await guestVerify(srv, orderId, paymentId);
  assert.equal(again.status, 200);
  assert.equal(again.json.status, 'paid_unclaimed');
  assert.equal(srv.rzp.calls.length, before);
  const wh = await sendWebhook(srv, srv.rzp.payments.get(paymentId));
  assert.equal(wh.status, 200);
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'paid_unclaimed');
  assert.deepEqual(subsDocs(srv.db), []);
});

/* ══ W · the webhook ═══════════════════════════════════════════════════════════ */

test('W · a guest payment.captured with no verify marks the order paid_unclaimed (no grant); a wrong amount is refused', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  const bad = await sendWebhook(srv, { id: 'pay_bad', order_id: o.json.orderId, amount: 100, currency: 'INR', status: 'captured' });
  assert.equal(bad.status, 400);
  assert.equal(srv.db.read(`payOrders/${o.json.orderId}`).status, 'created');

  const p = srv.rzp.pay(o.json.orderId);
  const wh = await sendWebhook(srv, p);
  assert.equal(wh.status, 200, wh.text);
  const stored = srv.db.read(`payOrders/${o.json.orderId}`);
  assert.equal(stored.status, 'paid_unclaimed');
  assert.equal(stored.paymentId, p.id);
  assert.equal(stored.uid, null);
  assert.deepEqual(packDocs(srv.db), []);
  assert.ok(srv.events.includes('payments.webhook.guest_paid_unclaimed'));
  // ...and it is then claimable exactly like a verified one.
  const c = await claim(srv, signedIn('u1', PHONE));
  assert.equal(c.json.claimed.length, 1);
});

test('W · the webhook still grants a normal student order exactly as before', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const own = await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'pack_mock', packTarget: 'maths' }, headers: signedIn('student1') });
  const p = srv.rzp.pay(own.json.orderId);
  const wh = await sendWebhook(srv, p);
  assert.equal(wh.status, 200, wh.text);
  assert.equal(wh.json.kind, 'pack');
  assert.ok(srv.db.read('packEntitlements/student1/packs/pack_mock:maths'));
});

/* ══ C · the claim ═════════════════════════════════════════════════════════════ */

test('C · no verified sign-in is 401; a token with no phone claims nothing', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  await paidGuestOrder(srv, { sku: 'till_boards', phone: PHONE });
  assert.equal((await claim(srv, {}, { phone: PHONE })).status, 401);
  const noPhone = await claim(srv, signedIn('googleUser'), { phone: PHONE });
  assert.equal(noPhone.status, 200);
  assert.deepEqual(noPhone.json.claimed, []);
  assert.deepEqual(subsDocs(srv.db), []);
});

test('C · the phone comes ONLY from the verified token: a body phone is ignored', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await paidGuestOrder(srv, { sku: 'till_boards', phone: PHONE });
  const thief = await claim(srv, signedIn('thief', OTHER_PHONE), { phone: PHONE, phoneNumber: PHONE, guestPhone: PHONE });
  assert.equal(thief.status, 200);
  assert.deepEqual(thief.json.claimed, []);
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'paid_unclaimed');
  assert.equal(srv.db.read('subscriptions/thief'), undefined);
});

test('C · Board Pass: the claim grants Premium to the claiming uid through grantPass, order paid, recorded price = charged', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId, paymentId, order } = await paidGuestOrder(srv, { sku: 'till_boards', phone: PHONE });
  const c = await claim(srv, signedIn('newPhoneUser', PHONE));
  assert.equal(c.status, 200, c.text);
  assert.equal(c.json.claimed.length, 1);
  assert.equal(c.json.claimed[0].kind, 'pass');
  assert.ok(c.json.claimed[0].passEnd);
  const sub = srv.db.read('subscriptions/newPhoneUser');
  assert.equal(sub.tier, 'premium');
  assert.equal(sub.passType, 'till_boards');
  assert.equal(sub.pricePaidInr, order.amountPaise / 100);
  assert.equal(sub.lastPaymentRef, paymentId);
  assert.ok(srv.db.read(`subscriptions/newPhoneUser/payments/${paymentId}`));
  const stored = srv.db.read(`payOrders/${orderId}`);
  assert.equal(stored.status, 'paid');
  assert.equal(stored.uid, 'newPhoneUser');
  assert.ok(stored.paidAt);
  assert.ok(!JSON.stringify(c.json).includes('9876543948'));
});

test('C · pack: the claim grants the pack through grantPack, exactly as a normal order', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await paidGuestOrder(srv, { sku: 'pack_cbq', target: 'science', phone: PHONE });
  const c = await claim(srv, signedIn('u1', PHONE));
  assert.equal(c.json.claimed[0].kind, 'pack');
  assert.equal(c.json.claimed[0].packId, 'pack_cbq:science');
  const pack = srv.db.read('packEntitlements/u1/packs/pack_cbq:science');
  assert.equal(pack.pricePaidInr, 199);
  assert.equal(pack.orderId, orderId);
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'paid');
  assert.equal(srv.db.read('subscriptions/u1'), undefined, 'a pack never grants Premium');
});

test('C · several purchases on one number all attach in one claim; a wrong number claims nothing; a second claim claims nothing', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  await paidGuestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  await paidGuestOrder(srv, { sku: 'till_boards', phone: PHONE });
  const unpaid = await guestOrder(srv, { sku: 'pack_bundle', phone: PHONE }); // never paid
  await paidGuestOrder(srv, { sku: 'pack_mock', target: 'science', phone: OTHER_PHONE });

  const first = await claim(srv, signedIn('u1', PHONE));
  assert.deepEqual(first.json.claimed.map((x) => x.sku).sort(), ['pack_mock', 'till_boards']);
  assert.equal(srv.db.read(`payOrders/${unpaid.json.orderId}`).status, 'created');
  const second = await claim(srv, signedIn('u1', PHONE));
  assert.deepEqual(second.json.claimed, []);
  assert.ok(srv.db.read('packEntitlements/u1/packs/pack_mock:maths'));
  assert.equal(srv.db.read('packEntitlements/u1/packs/pack_mock:science'), undefined);
});

test('C · concurrent claims by the same uid grant each payment exactly once', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { paymentId } = await paidGuestOrder(srv, { sku: 'till_boards', phone: PHONE });
  await Promise.all([1, 2, 3, 4].map(() => claim(srv, signedIn('u1', PHONE))));
  assert.deepEqual(srv.db.keys('subscriptions/u1/payments/'), [`subscriptions/u1/payments/${paymentId}`]);
  assert.equal(srv.db.read('subscriptions/u1').tier, 'premium');
});

test('C · two DIFFERENT accounts racing for the same order: exactly one gets it', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await paidGuestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  const [a, b] = await Promise.all([claim(srv, signedIn('uA', PHONE)), claim(srv, signedIn('uB', PHONE))]);
  assert.equal(a.json.claimed.length + b.json.claimed.length, 1);
  const owner = srv.db.read(`payOrders/${orderId}`).uid;
  assert.ok(owner === 'uA' || owner === 'uB');
  const loser = owner === 'uA' ? 'uB' : 'uA';
  assert.equal(srv.db.read(`packEntitlements/${loser}/packs/pack_mock:maths`), undefined);
});

test('C · a claim interrupted after take is finished by the SAME uid only', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { orderId } = await paidGuestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  // Simulate a crash between the take transaction and the grant: claimed by uA, not yet paid.
  await srv.db.collection('payOrders').doc(orderId).set({ status: 'claimed', uid: 'uA' }, { merge: true });
  const other = await claim(srv, signedIn('uB', PHONE));
  assert.deepEqual(other.json.claimed, []);
  assert.equal(srv.db.read('packEntitlements/uB/packs/pack_mock:maths'), undefined);
  const same = await claim(srv, signedIn('uA', PHONE));
  assert.equal(same.json.claimed.length, 1);
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'paid');
  assert.ok(srv.db.read('packEntitlements/uA/packs/pack_mock:maths'));
});

/* ══ E · the receipt email (owner item A) ══════════════════════════════════════ */

const EMAIL_ENV = { PAYMENT_EMAIL_ENABLED: '1', RESEND_API_KEY: 're_test_key' };
function resendRecorder() {
  const sent = [];
  return {
    sent,
    fetchImpl: async (url, init) => {
      sent.push({ url, headers: init.headers, body: JSON.parse(init.body) });
      return { ok: true, status: 200, json: async () => ({ id: `em_${sent.length}` }) };
    },
  };
}
function emailHarness(env = EMAIL_ENV) {
  const db = memoryFirestore();
  const resend = resendRecorder();
  const receiptEmailer = createPaymentReceiptEmailer({ env, adminFirestore: db, fetchImpl: resend.fetchImpl, now: () => NOW });
  return { db, resend, receiptEmailer };
}

test('E · off by default: no PAYMENT_EMAIL_ENABLED or no RESEND_API_KEY -> nothing is sent; an off-domain sender is refused', () => {
  assert.equal(resolveReceiptEmailConfig({}).mode, 'off');
  assert.equal(resolveReceiptEmailConfig({ PAYMENT_EMAIL_ENABLED: '1' }).mode, 'off');
  assert.equal(resolveReceiptEmailConfig({ RESEND_API_KEY: 'k' }).mode, 'off');
  assert.equal(resolveReceiptEmailConfig(EMAIL_ENV).mode, 'send');
  assert.equal(resolveReceiptEmailConfig(EMAIL_ENV).from, 'LazyTopper <hello@mail.lazytopper.com>');
  assert.equal(resolveReceiptEmailConfig(EMAIL_ENV).replyTo, 'support@lazytopper.com');
  assert.equal(resolveReceiptEmailConfig({ ...EMAIL_ENV, PAYMENT_EMAIL_FROM: 'x@gmail.com' }).mode, 'off');
});

test('E · guest: ONE email to the Razorpay address after verify; masked phone + phone-mode login link; the webhook adds none', async (t) => {
  const { db, resend, receiptEmailer } = emailHarness();
  const srv = await startRoutes({ db, receiptEmailer });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  const p = srv.rzp.pay(o.json.orderId);
  srv.rzp.payments.get(p.id).email = 'parent@example.com';
  assert.equal((await guestVerify(srv, o.json.orderId, p.id)).status, 200);
  await receiptEmailer.whenIdle();
  assert.equal((await sendWebhook(srv, { ...srv.rzp.payments.get(p.id) })).status, 200);
  assert.equal((await guestVerify(srv, o.json.orderId, p.id)).status, 200);
  await receiptEmailer.whenIdle();

  assert.equal(resend.sent.length, 1);
  const [mail] = resend.sent;
  assert.deepEqual(mail.body.to, ['parent@example.com']);
  assert.equal(mail.body.from, 'LazyTopper <hello@mail.lazytopper.com>');
  assert.equal(mail.body.reply_to, 'support@lazytopper.com');
  assert.equal(mail.headers['Idempotency-Key'], `payment-receipt-${p.id}`);
  assert.equal(mail.body.headers, undefined, 'a receipt carries no unsubscribe header');
  assert.equal(mail.body.subject, 'Payment received: Maths Mock Pack (₹99)');
  const text = mail.body.text;
  for (const want of ['Maths Mock Pack', '₹99', p.id, '2 November 2026', '+91 98•••••948', 'your pack is in My packs',
    '/login?method=phone&redirect=%2Fpacks%23my-packs', 'support@lazytopper.com', '+91 97145 68948']) {
    assert.ok(text.includes(want), want);
  }
  const all = JSON.stringify(mail.body);
  assert.ok(!all.includes('9876543948'), 'never the full phone');
  assert.ok(!/token|uid/i.test(text));
  assert.equal(db.read(`payOrders/${o.json.orderId}`).receiptEmail.status, 'sent');
  assert.ok(!JSON.stringify(db.read(`payOrders/${o.json.orderId}`)).includes('parent@example.com'), 'the address is never stored');
});

test('E · guest paid by webhook only: one email from the webhook', async (t) => {
  const { db, resend, receiptEmailer } = emailHarness();
  const srv = await startRoutes({ db, receiptEmailer });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'till_boards', phone: PHONE });
  const p = { ...srv.rzp.pay(o.json.orderId), email: 'kid@example.com' };
  await sendWebhook(srv, p);
  await sendWebhook(srv, p);
  await receiptEmailer.whenIdle();
  assert.equal(resend.sent.length, 1);
  assert.ok(resend.sent[0].body.text.includes('your Premium is switched on'));
  assert.ok(resend.sent[0].body.text.includes('redirect=%2F\n') || resend.sent[0].body.text.includes('redirect=%2F'));
});

test('E · signed-in pack verify: the direct My packs link; verify + webhook still send ONE email', async (t) => {
  const { db, resend, receiptEmailer } = emailHarness();
  const srv = await startRoutes({ db, receiptEmailer });
  t.after(srv.close);
  const own = await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'pack_cbq', packTarget: 'science' }, headers: signedIn('student1') });
  const p = srv.rzp.pay(own.json.orderId);
  srv.rzp.payments.get(p.id).email = 'student@example.com';
  const v = await request(srv.port, PAY_VERIFY_PATH, { body: { orderId: own.json.orderId, paymentId: p.id, signature: checkoutSig(own.json.orderId, p.id) }, headers: signedIn('student1') });
  assert.equal(v.status, 200, v.text);
  await sendWebhook(srv, { ...srv.rzp.payments.get(p.id) });
  await receiptEmailer.whenIdle();
  assert.equal(resend.sent.length, 1);
  const text = resend.sent[0].body.text;
  assert.ok(text.includes('Science CBQ Pack'));
  assert.ok(text.includes('https://www.lazytopper.com/packs#my-packs'));
  assert.ok(!text.includes('/login'));
});

test('E · no email on the payment -> silent skip; a failed (5xx) send may be retried once by a later path', async (t) => {
  const { db, receiptEmailer, resend } = emailHarness();
  const srv = await startRoutes({ db, receiptEmailer });
  t.after(srv.close);
  await paidGuestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  await receiptEmailer.whenIdle();
  assert.equal(resend.sent.length, 0);

  // A provider failure releases the slot as `failed`; the next path sends it.
  const db2 = memoryFirestore();
  let fail = true;
  const sent = [];
  const flaky = createPaymentReceiptEmailer({
    env: EMAIL_ENV, adminFirestore: db2, now: () => NOW,
    fetchImpl: async (url, init) => { sent.push(JSON.parse(init.body)); if (fail) { fail = false; return { ok: false, status: 503 }; } return { ok: true, status: 200, json: async () => ({}) }; },
  });
  await db2.collection('payOrders').doc('order_Z').set({ status: 'paid', paymentId: 'pay_Z', passType: 'pack_bundle', packTarget: 'all', amountPaise: 29900, uid: 'u1' });
  await flaky.sendForPayment({ orderId: 'order_Z', paymentId: 'pay_Z', email: 'a@b.in' });
  assert.equal(db2.read('payOrders/order_Z').receiptEmail.status, 'failed');
  await flaky.sendForPayment({ orderId: 'order_Z', paymentId: 'pay_Z', email: 'a@b.in' });
  await flaky.sendForPayment({ orderId: 'order_Z', paymentId: 'pay_Z', email: 'a@b.in' });
  assert.equal(sent.length, 2);
  assert.equal(db2.read('payOrders/order_Z').receiptEmail.status, 'sent');
  // An unpaid order, or a payment id that is not the order's, never emails.
  await db2.collection('payOrders').doc('order_U').set({ status: 'created', passType: 'pack_bundle', amountPaise: 29900 });
  await flaky.sendForPayment({ orderId: 'order_U', paymentId: 'pay_U', email: 'a@b.in' });
  await flaky.sendForPayment({ orderId: 'order_Z', paymentId: 'pay_OTHER', email: 'a@b.in' });
  assert.equal(sent.length, 2);
});

test('E · the email copy: honest, plain, no full phone; top-ups get no receipt', () => {
  const guest = buildReceiptEmail({ passType: 'pack_chapter', packTarget: 'human-eye-and-colourful-world', amountPaise: 4900, paymentId: 'pay_1', paidAtMs: NOW, guestPhoneMasked: '+91 98•••••948', appUrl: 'https://www.lazytopper.com' });
  assert.equal(guest.subject, 'Payment received: Chapter Pack · Human Eye and Colourful World (₹49)');
  assert.ok(guest.html.includes('+91 98•••••948'));
  assert.ok(!/hurry|only today|limited|save \d|\d%/i.test(guest.text));
  assert.equal(buildReceiptEmail({ passType: 'topup_small', amountPaise: 4900, paymentId: 'p', paidAtMs: NOW, appUrl: 'x' }), null);
});

/* ══ R · review fixes ══════════════════════════════════════════════════════════ */

const seedGuest = (db, id, data) => db.collection('payOrders').doc(id).set({ uid: null, payer: 'guest', guestPhone: PHONE, createdAt: new Date(NOW), ...data });

test('R2 · a paid order is found even under 60 unpaid orders for the same number (query by phone AND status)', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  for (let i = 0; i < 60; i += 1) await seedGuest(srv.db, `order_spam${i}`, { passType: 'pack_mock', packTarget: 'maths', amountPaise: 9900, status: 'created' });
  const { orderId } = await paidGuestOrder(srv, { sku: 'pack_cbq', target: 'maths', phone: PHONE });
  const c = await claim(srv, signedIn('u1', PHONE));
  assert.deepEqual(c.json.claimed.map((x) => x.orderId), [orderId]);
});

test('R3 · a grant that fails is recorded on the order, retried by the same uid, and capped', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  // A stored amount that is not the pack price: grantPack refuses it every time.
  await seedGuest(srv.db, 'order_bad', { passType: 'pack_mock', packTarget: 'maths', amountPaise: 100, status: 'paid_unclaimed', paymentId: 'pay_bad' });
  for (let i = 0; i < 8; i += 1) {
    const c = await claim(srv, signedIn('u1', PHONE));
    assert.deepEqual(c.json.claimed, []);
  }
  const o = srv.db.read('payOrders/order_bad');
  assert.equal(o.status, 'claimed');
  assert.equal(o.uid, 'u1');
  assert.equal(o.claimError.code, 'grant_refused');
  assert.equal(o.claimAttempts, 5, 'capped at MAX_CLAIM_ATTEMPTS');
});

test('R5 · a pack the account already owns: the order is labelled a duplicate purchase, never swallowed', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  await srv.db.collection('packEntitlements').doc('u1').collection('packs').doc('pack_mock:maths').set({ packId: 'pack_mock:maths', sku: 'pack_mock', target: 'maths', pricePaidInr: 99, paidAt: 1, orderId: 'order_old', paymentRef: 'pay_old' });
  const { orderId } = await paidGuestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  const c = await claim(srv, signedIn('u1', PHONE));
  assert.deepEqual(c.json.claimed, []);
  assert.equal(c.json.duplicates, 1);
  const o = srv.db.read(`payOrders/${orderId}`);
  assert.equal(o.status, 'duplicate_purchase');
  assert.equal(o.duplicateReason, 'already_owned');
  assert.equal(srv.db.read('packEntitlements/u1/packs/pack_mock:maths').orderId, 'order_old', 'the first purchase is untouched');
});

test('R5 · a Board Pass for an account already Premium till the boards: duplicate purchase, no grant', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  await srv.db.collection('subscriptions').doc('u1').set({ tier: 'premium', passType: 'till_boards', passEnd: new Date(Date.parse('2027-12-31T00:00:00Z')), lastPaymentRef: 'pay_first' });
  const { orderId, paymentId } = await paidGuestOrder(srv, { sku: 'till_boards', phone: PHONE });
  const c = await claim(srv, signedIn('u1', PHONE));
  assert.equal(c.json.duplicates, 1);
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'duplicate_purchase');
  assert.equal(srv.db.read(`payOrders/${orderId}`).duplicateReason, 'already_premium_till_boards');
  assert.equal(srv.db.read(`subscriptions/u1/payments/${paymentId}`), undefined);
  assert.equal(srv.db.read('subscriptions/u1').lastPaymentRef, 'pay_first');
});

test('R7 · a parent-paid pass receipt says Premium is active on the STUDENT\'s account', () => {
  const m = buildReceiptEmail({ passType: 'till_boards', amountPaise: 191700, paymentId: 'pay_p', paidAtMs: NOW, appUrl: 'https://www.lazytopper.com', payer: 'parent' });
  assert.ok(m.text.includes("Premium is now active on the student's account"));
  const own = buildReceiptEmail({ passType: 'till_boards', amountPaise: 191700, paymentId: 'pay_s', paidAtMs: NOW, appUrl: 'https://www.lazytopper.com' });
  assert.ok(own.text.includes('Premium is switched on for your account'));
});

test('OWNER · a number that already has an account cannot pay as a guest: one generic answer, no Razorpay order, limits first', async (t) => {
  const lookups = [];
  const accounts = new Set([PHONE, OTHER_PHONE]);
  const srv = await startRoutes({ accountExistsForPhone: async (p) => { lookups.push(p); return accounts.has(p); } });
  t.after(srv.close);
  // Two existing accounts - one that bought things, one that never did - get byte-identical answers.
  await srv.db.collection('packEntitlements').doc('buyer').collection('packs').doc('pack_mock:maths').set({ packId: 'pack_mock:maths' });
  const a = await guestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  const b = await guestOrder(srv, { sku: 'till_boards', phone: OTHER_PHONE });
  assert.equal(a.status, 409);
  assert.equal(a.text, b.text);
  assert.deepEqual(a.json, { ok: false, error: 'account_exists' });
  assert.equal(srv.rzp.calls.length, 0);
  assert.deepEqual(lookups, [PHONE, OTHER_PHONE]);
  // A bad number is refused before any lookup; a new number pays normally.
  await guestOrder(srv, { sku: 'till_boards', phone: '123' });
  assert.equal(lookups.length, 2);
  const fresh = await guestOrder(srv, { sku: 'till_boards', phone: '+917899999999' });
  assert.equal(fresh.status, 200);
});

test('OWNER · the account check counts against the per-phone limit, and a lookup that fails is a refusal (fail closed)', async (t) => {
  const srv = await startRoutes({ accountExistsForPhone: async () => true });
  t.after(srv.close);
  for (let i = 0; i < MAX_GUEST_ORDERS_PER_PHONE_PER_DAY; i += 1) assert.equal((await guestOrder(srv, { sku: 'till_boards', phone: PHONE })).status, 409);
  assert.equal((await guestOrder(srv, { sku: 'till_boards', phone: PHONE })).status, 429);
  const down = await startRoutes({ accountExistsForPhone: async () => { throw new Error('auth down'); } });
  t.after(down.close);
  const r = await guestOrder(down, { sku: 'till_boards', phone: PHONE });
  assert.equal(r.status, 500);
  assert.equal(down.rzp.calls.length, 0);
});

/* ══ WHO · CHECKOUT-WHO-1 "Who will use it?" (dark behind CHECKOUT_WHO_ENABLED) ══════════════════════════════════
 *
 * ★ MUTATIONS (run against THIS file only, each shown red, each restored):
 *   M4 guestPay.cjs handleWhoOrder prices from `body.amountPaise` when present
 *        -> "WHO · the amount is the server's for a recipient order (body amount ignored)" red
 *   M5 guestPay.cjs handleClaim reads the token email WITHOUT the `emailVerified === true` guard
 *        -> "WHO · claim by email: email_verified false claims NOTHING; true claims" red
 */

const { readRecipient, isCheckoutWhoEnabled, TWO_ACCOUNTS_NOTE } = require('./guestPay.cjs');
const { normaliseEmail, maskEmail } = require('../services/guestPay.cjs');
const { buildRecipientReadyEmail } = require('../services/paymentReceiptEmail.cjs');

const WHO_ENV = { ...ENV_ON, GUEST_PAY_ENABLED: '', CHECKOUT_WHO_ENABLED: '1' };
const EMAIL = 'anaya.k@gmail.com';
const whoAuth = (uid, { phone, email, ev } = {}) => ({
  Authorization: `Bearer uid:${uid}${phone ? `|phone:${phone}` : ''}${email ? `|email:${email}|ev:${ev ? '1' : '0'}` : ''}`,
});
const whoOrder = (srv, body, headers = {}) => request(srv.port, GUEST_ORDER_PATH, { body, headers });
async function paidWhoOrder(srv, body, headers = {}) {
  const o = await whoOrder(srv, body, headers);
  assert.equal(o.status, 200, o.text);
  const p = srv.rzp.pay(o.json.orderId);
  const v = await guestVerify(srv, o.json.orderId, p.id);
  assert.equal(v.status, 200, v.text);
  await srv.idle();
  return { orderId: o.json.orderId, paymentId: p.id, order: o.json, verify: v.json };
}
const COVERED_SUB = { tier: 'premium', passType: 'till_boards', passEnd: new Date(Date.parse('2027-12-31T00:00:00Z')), lastPaymentRef: 'pay_first' };

test('WHO · the switch needs PAYMENTS_ENABLED and CHECKOUT_WHO_ENABLED', () => {
  assert.equal(isCheckoutWhoEnabled({ PAYMENTS_ENABLED: '1', CHECKOUT_WHO_ENABLED: '1' }), true);
  assert.equal(isCheckoutWhoEnabled({ CHECKOUT_WHO_ENABLED: '1' }), false);
  assert.equal(isCheckoutWhoEnabled({ PAYMENTS_ENABLED: '1' }), false);
  assert.equal(isCheckoutWhoEnabled({}), false);
});

test('WHO · recipient detection / normalisation: Indian mobile or email, one or both, first-entered kept; anything bad -> null', () => {
  assert.deepEqual(readRecipient({ phone: '98765 43948' }), { phone: PHONE, email: null, first: 'phone' });
  assert.deepEqual(readRecipient({ phone: '+91 98765-43948' }), { phone: PHONE, email: null, first: 'phone' });
  assert.deepEqual(readRecipient({ phone: '09876543948' }), { phone: PHONE, email: null, first: 'phone' });
  assert.deepEqual(readRecipient({ email: '  Anaya.K@Gmail.com ' }), { phone: null, email: EMAIL, first: 'email' });
  assert.deepEqual(readRecipient({ phone: '9876543948', email: EMAIL }), { phone: PHONE, email: EMAIL, first: 'phone' });
  assert.deepEqual(readRecipient({ phone: '9876543948', email: EMAIL, first: 'email' }), { phone: PHONE, email: EMAIL, first: 'email' });
  for (const bad of [null, [], 'x', {}, { phone: '' }, { phone: '12345' }, { email: 'not-an-email' }, { phone: '9876543948', email: 'bad@' }, { email: 'a@b' }, { email: '<a@b.com>' }]) {
    assert.equal(readRecipient(bad), null, JSON.stringify(bad));
  }
  assert.equal(normaliseEmail('A@B.CO'), 'a@b.co');
  assert.equal(maskEmail(EMAIL), 'an••••@gmail.com');
  assert.equal(maskEmail('x'), '');
});

test('WHO · flag OFF: a `recipient` in the body is ignored and the order route answers exactly as before', async (t) => {
  // Guest pay on, checkout-who off: the old phone flow, recipient ignored (no checkoutWho fields stored).
  const srv = await startRoutes();
  t.after(srv.close);
  const r = await whoOrder(srv, { sku: 'till_boards', phone: PHONE, recipient: { email: EMAIL } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json).sort(), ['amountPaise', 'keyId', 'ok', 'orderId', 'phoneMasked']);
  const stored = srv.db.read(`payOrders/${r.json.orderId}`);
  assert.equal(stored.checkoutWho, undefined);
  assert.equal(stored.guestEmail, undefined);
  // A recipient-only body is the old "invalid_phone" refusal.
  const only = await whoOrder(srv, { sku: 'till_boards', recipient: { email: EMAIL } });
  assert.equal(only.status, 400);
  assert.equal(only.json.reason, 'invalid_phone');
  // Both switches off: 404, nothing touched.
  const dark = await startRoutes({ env: { ...ENV_ON, GUEST_PAY_ENABLED: '' } });
  t.after(dark.close);
  const d = await whoOrder(dark, { sku: 'till_boards', recipient: { phone: PHONE } });
  assert.equal(d.status, 404);
  assert.equal(dark.rzp.calls.length, 0);
});

test('WHO · checkout-who on, guest pay off: the old phone-only body stays 404; a recipient order works', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV });
  t.after(srv.close);
  assert.equal((await whoOrder(srv, { sku: 'till_boards', phone: PHONE })).status, 404);
  assert.equal((await whoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE } })).status, 200);
});

test('WHO · guest phone-only, email-only and both: stored as claim keys, echoed MASKED only, never in Razorpay notes', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV });
  t.after(srv.close);
  const phoneOnly = await whoOrder(srv, { sku: 'till_boards', recipient: { phone: '98765 43948' } });
  const emailOnly = await whoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { email: 'Anaya.K@gmail.com' } });
  const both = await whoOrder(srv, { sku: 'pack_mock', target: 'science', recipient: { phone: OTHER_PHONE, email: EMAIL, first: 'email' } });
  for (const r of [phoneOnly, emailOnly, both]) assert.equal(r.status, 200, r.text);
  assert.equal(phoneOnly.json.phoneMasked, '+91 98•••••948');
  assert.equal(phoneOnly.json.emailMasked, undefined);
  assert.equal(emailOnly.json.emailMasked, 'an••••@gmail.com');
  assert.equal(emailOnly.json.phoneMasked, undefined);
  assert.equal(both.json.phoneMasked, '+91 70•••••678');
  assert.equal(both.json.emailMasked, 'an••••@gmail.com');
  for (const r of [phoneOnly, emailOnly, both]) {
    assert.ok(!r.text.includes('9876543948') && !r.text.includes('7012345678') && !r.text.includes(EMAIL), 'masked echoes only');
  }
  const s1 = srv.db.read(`payOrders/${phoneOnly.json.orderId}`);
  assert.equal(s1.guestPhone, PHONE);
  assert.equal(s1.guestEmail, undefined);
  assert.equal(s1.checkoutWho, true);
  assert.equal(s1.payerType, 'signed_out');
  assert.equal(s1.uid, null);
  const s2 = srv.db.read(`payOrders/${emailOnly.json.orderId}`);
  assert.equal(s2.guestEmail, EMAIL);
  assert.equal(s2.guestPhone, undefined);
  assert.equal(s2.recipientFirst, 'email');
  const s3 = srv.db.read(`payOrders/${both.json.orderId}`);
  assert.equal(s3.recipientFirst, 'email');
  for (const c of srv.rzp.calls.filter((x) => x.url.endsWith('/orders'))) {
    const all = JSON.stringify(c.body);
    assert.ok(!all.includes('9876543948') && !all.includes('7012345678') && !all.includes('anaya'), all);
  }
  // Invalid recipient -> 400 before Razorpay; month is not sold this way.
  const before = srv.rzp.calls.length;
  assert.equal((await whoOrder(srv, { sku: 'till_boards', recipient: { email: 'bad' } })).json.reason, 'invalid_recipient');
  assert.equal((await whoOrder(srv, { sku: 'month', recipient: { phone: PHONE } })).json.reason, 'invalid_sku');
  assert.equal(srv.rzp.calls.length, before);
});

test("WHO · the amount is the server's for a recipient order (body amount ignored)", async (t) => {
  const srv = await startRoutes({ env: WHO_ENV });
  t.after(srv.close);
  const pack = await whoOrder(srv, { sku: 'pack_cbq', target: 'maths', amountPaise: 100, amount: 1, recipient: { email: EMAIL } });
  assert.equal(pack.status, 200, pack.text);
  assert.equal(pack.json.amountPaise, 19900);
  const pass = await whoOrder(srv, { sku: 'till_boards', amountPaise: 100, recipient: { phone: PHONE } });
  const fresh = quotePass({}, 'till_boards', NOW, { foundingOfferOpen: true });
  assert.equal(pass.json.amountPaise, fresh.amountPaise);
  assert.deepEqual(srv.rzp.calls.filter((c) => c.url.endsWith('/orders')).map((c) => c.body.amount), [19900, fresh.amountPaise]);
  assert.equal(srv.db.read(`payOrders/${pass.json.orderId}`).amountPaise, fresh.amountPaise);
});

test('WHO · no account for the recipient: verify -> paid_unclaimed, nothing granted', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV, uidForPhone: async () => null, uidForEmail: async () => null });
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE, email: EMAIL } });
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'paid_unclaimed');
  assert.deepEqual(subsDocs(srv.db), []);
});

test('WHO · an existing account by EMAIL gets the Board Pass immediately after verify', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV, uidForPhone: async () => null, uidForEmail: async (e) => (e === EMAIL ? 'uEmail' : null) });
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { email: EMAIL } });
  const stored = srv.db.read(`payOrders/${orderId}`);
  assert.equal(stored.uid, 'uEmail');
  assert.equal(stored.claimedVia, 'existing_account');
  assert.equal(stored.status, 'paid');
  assert.equal(srv.db.read('subscriptions/uEmail').tier, 'premium');
});

test('WHO · an existing account by PHONE gets a pack immediately after verify', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV, uidForPhone: async (p) => (p === PHONE ? 'uPhone' : null), uidForEmail: async () => null });
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'pack_cbq', target: 'science', recipient: { phone: '9876543948' } });
  assert.equal(srv.db.read(`payOrders/${orderId}`).uid, 'uPhone');
  assert.ok(srv.db.read('packEntitlements/uPhone/packs/pack_cbq:science'));
});

test('WHO · phone and email on two DIFFERENT accounts: the FIRST-entered wins, an admin note, never merged', async (t) => {
  for (const [first, winner, other] of [['phone', 'uPhone', 'uEmail'], ['email', 'uEmail', 'uPhone']]) {
    const srv = await startRoutes({ env: WHO_ENV, uidForPhone: async () => 'uPhone', uidForEmail: async () => 'uEmail' });
    t.after(srv.close);
    const { orderId } = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE, email: EMAIL, first } });
    const stored = srv.db.read(`payOrders/${orderId}`);
    assert.equal(stored.uid, winner, first);
    assert.equal(stored.adminNote, TWO_ACCOUNTS_NOTE);
    assert.equal(stored.otherAccountUid, other);
    assert.ok(srv.db.read(`subscriptions/${winner}`));
    assert.equal(srv.db.read(`subscriptions/${other}`), undefined, 'the other account gets nothing');
    assert.ok(srv.events.includes('payments.guest.deliver.two_accounts'));
  }
});

test('WHO · no enumeration: order and verify answer the SAME shape whether or not an account exists', async (t) => {
  const shapes = [];
  for (const lookup of [async () => null, async () => 'uExisting']) {
    const srv = await startRoutes({ env: WHO_ENV, uidForPhone: lookup, uidForEmail: lookup });
    t.after(srv.close);
    const o = await whoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE, email: EMAIL } });
    assert.equal(o.status, 200, o.text);
    const p = srv.rzp.pay(o.json.orderId);
    const v = await guestVerify(srv, o.json.orderId, p.id);
    await srv.idle();
    const strip = ({ orderId, ...rest }) => rest; // eslint-disable-line no-unused-vars
    shapes.push({ order: { http: o.status, ...strip(o.json) }, verify: { http: v.status, ...strip(v.json) } });
  }
  assert.deepEqual(shapes[0], shapes[1]);
  assert.equal(shapes[0].verify.http, 200);
  assert.equal(shapes[0].verify.status, 'paid_unclaimed', 'the answer says nothing about delivery');
  assert.equal(shapes[0].verify.emailMasked, 'an••••@gmail.com');
});

test('WHO · an already-covered recipient account is refused at the order with one generic answer, nothing charged', async (t) => {
  const db = memoryFirestore();
  await db.collection('subscriptions').doc('uCovered').set(COVERED_SUB);
  const srv = await startRoutes({ env: WHO_ENV, db, uidForPhone: async () => 'uCovered', uidForEmail: async () => null });
  t.after(srv.close);
  const r = await whoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE } });
  assert.equal(r.status, 409);
  // CHECKOUT-WHO-2: the SAME generic answer as "already paid, not yet claimed" - nothing says an account exists.
  assert.deepEqual(r.json, { ok: false, error: 'payment_unavailable' });
  assert.equal(srv.rzp.calls.length, 0);
  // An owned pack is the same answer; a lookup that cannot tell fails closed.
  await db.collection('packEntitlements').doc('uCovered').collection('packs').doc('pack_cbq:maths').set({ packId: 'pack_cbq:maths' });
  assert.deepEqual((await whoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { phone: PHONE } })).json, { ok: false, error: 'payment_unavailable' });
  const down = await startRoutes({ env: WHO_ENV, uidForPhone: async () => { throw new Error('auth down'); } });
  t.after(down.close);
  assert.equal((await whoOrder(down, { sku: 'till_boards', recipient: { phone: PHONE } })).status, 500);
  assert.equal(down.rzp.calls.length, 0);
});

test('WHO · claim by the VERIFIED phone attaches an order that named a phone (and an email)', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV });
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE, email: EMAIL } });
  const c = await claim(srv, whoAuth('uKid', { phone: PHONE }));
  assert.equal(c.status, 200, c.text);
  assert.equal(c.json.claimed.length, 1);
  // CHECKOUT-WHO-2: the account signs in with the phone but has no verified email: offer the order's email, MASKED.
  assert.deepEqual(c.json.alsoSignIn, { kind: 'email', masked: 'an••••@gmail.com' });
  assert.ok(!c.text.includes(EMAIL));
  assert.equal(srv.db.read(`payOrders/${orderId}`).uid, 'uKid');
  assert.equal(srv.db.read(`payOrders/${orderId}`).claimedVia, 'claim');
});

test('WHO · claim by email: email_verified false claims NOTHING; true claims', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV });
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { email: EMAIL, phone: PHONE, first: 'email' } });
  const unverified = await claim(srv, whoAuth('uSquat', { email: EMAIL, ev: false }));
  assert.equal(unverified.status, 200);
  assert.deepEqual(unverified.json.claimed, []);
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'paid_unclaimed');
  assert.equal(srv.db.read('packEntitlements/uSquat/packs/pack_cbq:maths'), undefined);
  const verified = await claim(srv, whoAuth('uKid', { email: 'ANAYA.K@gmail.com', ev: true }));
  assert.equal(verified.json.claimed.length, 1);
  assert.equal(verified.json.claimed[0].kind, 'pack');
  assert.ok(srv.db.read('packEntitlements/uKid/packs/pack_cbq:maths'));
  // The order also named a phone this account does not sign in with: offer the link step, MASKED.
  assert.deepEqual(verified.json.alsoSignIn, { kind: 'phone', masked: '+91 98•••••948' });
  assert.ok(!verified.text.includes('9876543948'));
  // A second claim finds nothing.
  assert.deepEqual((await claim(srv, whoAuth('uKid', { email: EMAIL, ev: true }))).json.claimed, []);
});

test('WHO · a signed-in payer buying for someone else: payer recorded, the grant goes to the RECIPIENT only', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV, uidForPhone: async () => null, uidForEmail: async () => null });
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { phone: OTHER_PHONE } }, whoAuth('uParent', { email: 'p@x.com', ev: true }));
  const stored = srv.db.read(`payOrders/${orderId}`);
  assert.equal(stored.payerType, 'signed_in_other');
  assert.equal(stored.payerUid, 'uParent');
  assert.equal(stored.uid, null);
  assert.equal(srv.db.read('subscriptions/uParent'), undefined);
  assert.equal((await claim(srv, whoAuth('uParent', { email: 'p@x.com', ev: true }))).json.claimed.length, 0);
  assert.equal((await claim(srv, whoAuth('uSibling', { phone: OTHER_PHONE }))).json.claimed.length, 1);
});

test('WHO · the old phone order and its claim are unchanged with checkout-who ON (no alsoSignIn, no checkoutWho fields)', async (t) => {
  const srv = await startRoutes({ env: { ...ENV_ON, CHECKOUT_WHO_ENABLED: '1' } });
  t.after(srv.close);
  const { orderId } = await paidGuestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  assert.equal(srv.db.read(`payOrders/${orderId}`).checkoutWho, undefined);
  const c = await claim(srv, signedIn('uOld', PHONE));
  assert.deepEqual(Object.keys(c.json).sort(), ['claimed', 'ok']);
  assert.equal(srv.db.read(`payOrders/${orderId}`).claimedVia, undefined);
});

test('WHO · email: the recipient gets "Your Board Pass is ready" once (Resend, behind its flag); no price, phone masked', async (t) => {
  const { db, resend, receiptEmailer } = emailHarness();
  const srv = await startRoutes({ env: WHO_ENV, db, receiptEmailer, uidForPhone: async () => null, uidForEmail: async () => null });
  t.after(srv.close);
  const o = await whoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE, email: EMAIL } });
  const p = srv.rzp.pay(o.json.orderId);
  srv.rzp.payments.get(p.id).email = 'payer@example.com';
  assert.equal((await guestVerify(srv, o.json.orderId, p.id)).status, 200);
  await srv.idle();
  await receiptEmailer.whenIdle();
  assert.equal((await guestVerify(srv, o.json.orderId, p.id)).status, 200);
  await srv.idle();
  await receiptEmailer.whenIdle();
  const toRecipient = resend.sent.filter((m) => m.body.to.includes(EMAIL));
  assert.equal(toRecipient.length, 1, 'once');
  const [mail] = toRecipient;
  assert.equal(mail.body.subject, 'Your Board Pass is ready');
  assert.equal(mail.headers['Idempotency-Key'], `recipient-ready-${p.id}`);
  assert.ok(mail.body.text.includes('+91 98•••••948'));
  assert.ok(mail.body.text.includes('the Board Pass is already there'));
  assert.ok(!JSON.stringify(mail.body).includes('9876543948'));
  assert.ok(!/₹/.test(mail.body.text), 'no price to the recipient');
  // The payer's receipt names the masked recipient identifiers.
  const receipt = resend.sent.find((m) => m.body.to.includes('payer@example.com'));
  assert.ok(receipt && receipt.body.text.includes('an••••@gmail.com'));
  // Email switch off: nothing to the recipient.
  const off = emailHarness({});
  const srv2 = await startRoutes({ env: WHO_ENV, db: off.db, receiptEmailer: off.receiptEmailer });
  t.after(srv2.close);
  await paidWhoOrder(srv2, { sku: 'till_boards', recipient: { email: EMAIL } });
  await off.receiptEmailer.whenIdle();
  assert.equal(off.resend.sent.length, 0);
});

test('WHO · the recipient email copy: pack says My packs; month is never sent', () => {
  const pack = buildRecipientReadyEmail({ passType: 'pack_cbq', packTarget: 'maths', phoneMasked: null, emailMasked: 'an••••@gmail.com', appUrl: 'https://lazytopper.com' });
  assert.ok(pack.subject.startsWith('Your ') && pack.subject.endsWith(' is ready'));
  assert.ok(pack.text.includes('open My packs to download it'));
  assert.ok(pack.text.includes('%2Fpacks%23my-packs'));
  assert.equal(buildRecipientReadyEmail({ passType: 'month', appUrl: 'x' }), null);
});

/* ══ WHO-2 · CHECKOUT-WHO-2 (review follow-ups before the flags flip) ═════════════════════════════════════════════
 *
 * ★ MUTATIONS (run against THIS file only, each shown red, each restored):
 *   M6 payments.cjs handleGuestCaptured drops the `afterGuestPaid` call
 *        -> "WHO-2 · webhook only: the SAME delivery + recipient email as verify" red
 *   M7 guestPay.cjs handleWhoOrder skips the coverage read when no account was found (no dummy id)
 *        -> "WHO-2 · the coverage read runs for an order for NOBODY too" red
 */
const { NO_ACCOUNT_COVERAGE_ID } = require('./guestPay.cjs');

/** Records every `<collection>/<doc>` touched through collection().doc() (reads and writes alike). */
function spyDocs(db) {
  const touched = [];
  const orig = db.collection.bind(db);
  db.collection = (name) => {
    const c = orig(name);
    const doc = c.doc.bind(c);
    c.doc = (id) => {
      touched.push(`${name}/${id}`);
      return doc(id);
    };
    return c;
  };
  return touched;
}

test('WHO-2 · the coverage read runs for an order for NOBODY too (fixed dummy id), and nothing is written under it', async (t) => {
  const db = memoryFirestore();
  const touched = spyDocs(db);
  const srv = await startRoutes({ env: WHO_ENV, db, uidForPhone: async () => null, uidForEmail: async () => null });
  t.after(srv.close);
  assert.equal((await whoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE } })).status, 200);
  assert.ok(touched.includes(`subscriptions/${NO_ACCOUNT_COVERAGE_ID}`), touched.join(','));
  assert.equal((await whoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { email: EMAIL } })).status, 200);
  assert.ok(touched.includes(`packEntitlements/${NO_ACCOUNT_COVERAGE_ID}`), touched.join(','));
  assert.deepEqual(db.keys(`subscriptions/${NO_ACCOUNT_COVERAGE_ID}`), []);
  assert.deepEqual(db.keys(`packEntitlements/${NO_ACCOUNT_COVERAGE_ID}`), []);
});

test('WHO-2 · covered recipient and pending purchase answer the SAME generic 409', async (t) => {
  const db = memoryFirestore();
  await db.collection('subscriptions').doc('uCovered').set(COVERED_SUB);
  const srv = await startRoutes({ env: WHO_ENV, db, uidForPhone: async (p) => (p === PHONE ? 'uCovered' : null), uidForEmail: async () => null });
  t.after(srv.close);
  const covered = await whoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE } });
  await paidWhoOrder(srv, { sku: 'till_boards', recipient: { phone: OTHER_PHONE } });
  const pending = await whoOrder(srv, { sku: 'till_boards', recipient: { phone: OTHER_PHONE } });
  assert.equal(covered.status, 409);
  assert.equal(pending.status, 409);
  assert.deepEqual(covered.json, pending.json);
});

test('WHO-2 · claim: an email prompt when the account has no VERIFIED email; none when it has', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV });
  t.after(srv.close);
  await paidWhoOrder(srv, { sku: 'pack_mock', target: 'maths', recipient: { phone: PHONE, email: EMAIL } });
  await paidWhoOrder(srv, { sku: 'pack_mock', target: 'science', recipient: { phone: OTHER_PHONE, email: EMAIL } });
  const unverified = await claim(srv, whoAuth('uA', { phone: PHONE, email: EMAIL, ev: false }));
  assert.deepEqual(unverified.json.alsoSignIn, { kind: 'email', masked: 'an••••@gmail.com' });
  const verified = await claim(srv, whoAuth('uB', { phone: OTHER_PHONE, email: 'other@x.in', ev: true }));
  assert.equal(verified.json.claimed.length, 1);
  assert.equal(verified.json.alsoSignIn, undefined, 'it already has a verified email');
});

test('WHO-2 · delivered at payment time to an EXISTING account: the "also sign in" offer waits for its next session, once', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV, uidForPhone: async (p) => (p === PHONE ? 'uExisting' : null), uidForEmail: async () => null });
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE, email: EMAIL } });
  assert.equal(srv.db.read(`payOrders/${orderId}`).uid, 'uExisting');
  assert.equal(srv.db.read(`payOrders/${orderId}`).alsoSignInPending, true);
  const next = await claim(srv, whoAuth('uExisting', { phone: PHONE }));
  assert.deepEqual(next.json.claimed, []);
  assert.deepEqual(next.json.alsoSignIn, { kind: 'email', masked: 'an••••@gmail.com' });
  assert.equal(srv.db.read(`payOrders/${orderId}`).alsoSignInPending, false);
  assert.equal((await claim(srv, whoAuth('uExisting', { phone: PHONE }))).json.alsoSignIn, undefined, 'once');
  // Another account never sees it.
  const other = await startRoutes({ env: WHO_ENV, uidForPhone: async () => 'uExisting2', uidForEmail: async () => null });
  t.after(other.close);
  await paidWhoOrder(other, { sku: 'till_boards', recipient: { phone: PHONE, email: EMAIL } });
  assert.equal((await claim(other, whoAuth('uStranger', { phone: OTHER_PHONE }))).json.alsoSignIn, undefined);
  // One identifier only: nothing to offer, no marker.
  const single = await startRoutes({ env: WHO_ENV, uidForPhone: async () => 'uSolo', uidForEmail: async () => null });
  t.after(single.close);
  const s1 = await paidWhoOrder(single, { sku: 'till_boards', recipient: { phone: PHONE } });
  assert.equal(single.db.read(`payOrders/${s1.orderId}`).alsoSignInPending, undefined);
});

test('WHO-2 · webhook only (no verify): the SAME delivery + recipient email as verify, once; old guest orders untouched', async (t) => {
  const { db, resend, receiptEmailer } = emailHarness();
  const srv = await startRoutes({ env: { ...WHO_ENV, GUEST_PAY_ENABLED: '1' }, db, receiptEmailer, uidForPhone: async () => null, uidForEmail: async (e) => (e === EMAIL ? 'uEmail' : null) });
  t.after(srv.close);
  const o = await whoOrder(srv, { sku: 'till_boards', recipient: { email: EMAIL } });
  const p = srv.rzp.pay(o.json.orderId);
  const w = await sendWebhook(srv, { ...srv.rzp.payments.get(p.id) });
  assert.equal(w.status, 200, w.text);
  await srv.idle();
  await receiptEmailer.whenIdle();
  assert.equal(db.read(`payOrders/${o.json.orderId}`).uid, 'uEmail');
  assert.equal(db.read(`payOrders/${o.json.orderId}`).claimedVia, 'existing_account');
  assert.equal(db.read('subscriptions/uEmail').tier, 'premium');
  // A later verify / webhook replay adds nothing.
  assert.equal((await guestVerify(srv, o.json.orderId, p.id)).status, 200);
  assert.equal((await sendWebhook(srv, { ...srv.rzp.payments.get(p.id) })).status, 200);
  await srv.idle();
  await receiptEmailer.whenIdle();
  assert.equal(resend.sent.filter((m) => m.body.to.includes(EMAIL)).length, 1);
  // A plain pay-by-phone order through the webhook: paid_unclaimed, exactly as before.
  const old = await guestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: OTHER_PHONE });
  const op = srv.rzp.pay(old.json.orderId);
  await sendWebhook(srv, { ...srv.rzp.payments.get(op.id) });
  await srv.idle();
  assert.equal(db.read(`payOrders/${old.json.orderId}`).status, 'paid_unclaimed');
});

test('WHO-2 · a payment ALREADY recorded on the account is a replay, never labelled a duplicate purchase (race)', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV });
  t.after(srv.close);
  const { orderId, paymentId } = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE } });
  // A concurrent delivery took the order and granted THIS payment, and the account now runs to the boards.
  await srv.db.collection('payOrders').doc(orderId).set({ uid: 'uK', status: 'claimed', claimAttempts: 1 }, { merge: true });
  await srv.db.collection('subscriptions').doc('uK').set({ ...COVERED_SUB, lastPaymentRef: paymentId });
  await srv.db.collection('subscriptions').doc('uK').collection('payments').doc(paymentId).set({ paymentRef: paymentId });
  await claim(srv, whoAuth('uK', { phone: PHONE }));
  assert.notEqual(srv.db.read(`payOrders/${orderId}`).status, 'duplicate_purchase');
  assert.equal(srv.db.read(`payOrders/${orderId}`).duplicateReason, undefined);
  // CONTROL: a DIFFERENT payment for an account already covered is still a duplicate purchase.
  const second = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { phone: OTHER_PHONE } });
  await claim(srv, whoAuth('uK', { phone: OTHER_PHONE }));
  assert.equal(srv.db.read(`payOrders/${second.orderId}`).status, 'duplicate_purchase');
});

test('HOTFIX: the no-account coverage id is a legal Firestore document id (not reserved __.*__)', () => {
  const { NO_ACCOUNT_COVERAGE_ID: id } = require('./guestPay.cjs');
  assert.ok(typeof id === 'string' && id.length > 0 && id.length <= 1500);
  assert.ok(!/^__.*__$/.test(id), `reserved id: ${id}`);
  assert.ok(!id.includes('/') && id !== '.' && id !== '..');
});

/* ══ AUTO · PAY-ACCOUNT-1 "pay first, the account is made for them" (dark behind PAY_AUTO_ACCOUNT_ENABLED) ═══════════
 *
 * ★ MUTATIONS (run against THIS file only, each shown red, each restored):
 *   M6 guestPay.cjs findOrCreateAccount puts every typed identifier on the new account (drops the `phoneFree` /
 *      `emailFree` guards) -> "AUTO · an email on a stranger's UNVERIFIED account never goes on the new one ..." red
 *   M7 guestPay.cjs autoAccountUid uses a random suffix instead of the order-id hash
 *        -> "AUTO · verify + webhook racing on one order: ONE user, ONE grant ..." red
 *   M9 guestPay.cjs findOrCreateAccount puts BOTH typed identifiers on a new account (review HIGH 1)
 *        -> "AUTO · new phone + new email: the NEW account carries ONLY the first-entered one ..." and
 *           "AUTO · PRE-STAGING TAKEOVER ..." red
 *   M10 guestPay.cjs deliverToExistingAccount drops the `target.uid === autoAccountUid(orderId)` branch (review MED 2)
 *        -> "AUTO · MED 2 race: ..." red
 *   M8 guestPay.cjs handleClaim drops the `o.firstSignInAt` check
 *        -> "AUTO · first sign-in with the phone: the product is there, firstSignIn is said ONCE ..." red
 */

const {
  autoAccountUid,
  isAutoAccountUid,
  isPayAutoAccountEnabled,
  SECOND_NOT_LINKED_NOTE,
  ACCOUNT_NOT_CREATED_NOTE,
} = require('./guestPay.cjs');
const { buildAccountReadyEmail } = require('../services/paymentReceiptEmail.cjs');

const AUTO_ENV = { ...WHO_ENV, PAY_AUTO_ACCOUNT_ENABLED: '1' };
const VICTIM_EMAIL = 'victim@gmail.com';

/** firebase-admin's user store, in memory: the SAME lookups index.cjs wires (uidForEmail = VERIFIED email only). */
function fakeAuth({ users = [], failCreate = null } = {}) {
  const byUid = new Map(users.map((u) => [u.uid, { ...u }]));
  const created = [];
  const find = (f) => [...byUid.values()].find(f) || null;
  const authAccounts = {
    async createUser(input) {
      await new Promise((r) => setImmediate(r));
      if (failCreate) throw Object.assign(new Error('boom'), { code: failCreate });
      const err = (code) => Object.assign(new Error(code), { code });
      if (byUid.has(input.uid)) throw err('auth/uid-already-exists');
      if (input.phoneNumber && find((u) => u.phoneNumber === input.phoneNumber)) throw err('auth/phone-number-already-exists');
      if (input.email && find((u) => u.email === input.email)) throw err('auth/email-already-exists');
      byUid.set(input.uid, { ...input });
      created.push({ ...input });
      return { ...input };
    },
    async getUser(uid) { return byUid.get(uid) ? { ...byUid.get(uid) } : null; },
    async getUserByPhone(p) { return find((u) => u.phoneNumber === p); },
    async getUserByEmail(e) { return find((u) => u.email === e); },
  };
  return {
    byUid,
    created,
    authAccounts,
    uidForPhone: async (p) => (find((u) => u.phoneNumber === p) || {}).uid || null,
    uidForEmail: async (e) => {
      const r = find((u) => u.email === e);
      return r && r.emailVerified === true ? r.uid : null;
    },
  };
}
async function autoRoutes({ env = AUTO_ENV, auth = fakeAuth(), ...rest } = {}) {
  const srv = await startRoutes({ env, authAccounts: auth.authAccounts, uidForPhone: auth.uidForPhone, uidForEmail: auth.uidForEmail, ...rest });
  return { srv, auth };
}

test('AUTO · the switch needs CHECKOUT-WHO (both) AND PAY_AUTO_ACCOUNT_ENABLED; the uid is derived from the order and marked `pay-`', () => {
  assert.equal(isPayAutoAccountEnabled(AUTO_ENV), true);
  assert.equal(isPayAutoAccountEnabled(WHO_ENV), false);
  assert.equal(isPayAutoAccountEnabled({ PAY_AUTO_ACCOUNT_ENABLED: '1', CHECKOUT_WHO_ENABLED: '1' }), false);
  const u = autoAccountUid('order_P1');
  assert.equal(u, autoAccountUid('order_P1'), 'deterministic');
  assert.notEqual(u, autoAccountUid('order_P2'));
  assert.match(u, /^pay-[0-9a-f]{24}$/);
  assert.equal(u.length, 28);
  assert.equal(isAutoAccountUid(u), true);
  for (const client of ['aZ09aZ09aZ09aZ09aZ09aZ09aZ09', 'payabcdef0123456789abcdef01', 'uPhone', '']) assert.equal(isAutoAccountUid(client), false);
});

test('AUTO · new phone only: ONE account with that phone is created at payment and the pack is granted to it', async (t) => {
  const { srv, auth } = await autoRoutes();
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { phone: '98765 43948' } });
  const uid = autoAccountUid(orderId);
  assert.deepEqual(auth.created, [{ uid, emailVerified: false, phoneNumber: PHONE }]);
  const stored = srv.db.read(`payOrders/${orderId}`);
  assert.equal(stored.uid, uid);
  assert.equal(stored.status, 'paid');
  assert.equal(stored.claimedVia, 'account_created');
  assert.equal(stored.adminNote, null);
  assert.equal(stored.accountHasEmail, undefined);
  assert.ok(srv.db.read(`packEntitlements/${uid}/packs/pack_cbq:maths`));
  assert.ok(srv.events.includes('payments.guest.deliver.account_created'));
  assert.deepEqual(srv.db.keys('users/'), [], 'no users doc: sign-up writes none either');
  assert.equal(srv.db.read(`subscriptions/${uid}`), undefined, 'no trial is started at payment');
});

test('AUTO · new email only: ONE account with that email, UNVERIFIED, gets the Board Pass', async (t) => {
  const { srv, auth } = await autoRoutes();
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { email: 'Anaya.K@gmail.com' } });
  const uid = autoAccountUid(orderId);
  assert.deepEqual(auth.created, [{ uid, emailVerified: false, email: EMAIL }]);
  assert.equal(srv.db.read(`payOrders/${orderId}`).accountHasEmail, true);
  assert.equal(srv.db.read(`subscriptions/${uid}`).tier, 'premium');
});

test('AUTO · new phone + new email: the NEW account carries ONLY the first-entered one; the second is on no account', async (t) => {
  for (const [first, carried] of [['email', { email: EMAIL }], ['phone', { phoneNumber: PHONE }]]) {
    const { srv, auth } = await autoRoutes();
    t.after(srv.close);
    const { orderId } = await paidWhoOrder(srv, { sku: 'pack_mock', target: 'science', recipient: { phone: PHONE, email: EMAIL, first } });
    const uid = autoAccountUid(orderId);
    assert.deepEqual(auth.created, [{ uid, emailVerified: false, ...carried }], first);
    assert.equal(auth.byUid.size, 1, 'no second account');
    if (first === 'email') assert.equal(await auth.authAccounts.getUserByPhone(PHONE), null, 'the phone is on no account');
    else assert.equal(await auth.authAccounts.getUserByEmail(EMAIL), null, 'the email is on no account');
    const stored = srv.db.read(`payOrders/${orderId}`);
    assert.equal(stored.adminNote, SECOND_NOT_LINKED_NOTE);
    assert.equal(stored.accountSignInWith, first);
    assert.equal(stored.accountHasEmail, first === 'email' ? true : undefined);
  }
});

test('AUTO · PRE-STAGING TAKEOVER (review HIGH 1), both directions: the victim lands in an account the attacker cannot open', async (t) => {
  const ATTACKER_EMAIL = 'attacker@evil.in';
  // (a) victim's phone FIRST + attacker's email: the account carries ONLY the victim's phone (opened by an SMS to the
  //     victim). The attacker's email is on no account, so the attacker's email-link sign-in reaches nothing of it.
  const a = await autoRoutes();
  t.after(a.srv.close);
  const one = await paidWhoOrder(a.srv, { sku: 'pack_cbq', target: 'maths', recipient: { phone: PHONE, email: ATTACKER_EMAIL, first: 'phone' } });
  const uidA = autoAccountUid(one.orderId);
  assert.deepEqual(a.auth.byUid.get(uidA), { uid: uidA, emailVerified: false, phoneNumber: PHONE });
  assert.equal(await a.auth.authAccounts.getUserByEmail(ATTACKER_EMAIL), null);
  const atk = await claim(a.srv, whoAuth('uAttackerFresh', { email: ATTACKER_EMAIL, ev: true }));
  assert.deepEqual(atk.json.claimed, [], 'the attacker (verified email, a fresh account) gets nothing');
  // The victim signs in by OTP (Firebase signs them into the account with their phone): it is theirs alone.
  const victim = await claim(a.srv, whoAuth(uidA, { phone: PHONE }));
  assert.equal(victim.status, 200);
  assert.ok(a.srv.db.read(`packEntitlements/${uidA}/packs/pack_cbq:maths`));
  // (b) victim's email FIRST + attacker's phone: the account carries ONLY the victim's email (opened from the victim's
  //     inbox); the attacker's phone is on no account, so an OTP to the attacker opens nothing of it.
  const b = await autoRoutes();
  t.after(b.srv.close);
  const two = await paidWhoOrder(b.srv, { sku: 'pack_cbq', target: 'maths', recipient: { phone: OTHER_PHONE, email: VICTIM_EMAIL, first: 'email' } });
  const uidB = autoAccountUid(two.orderId);
  assert.deepEqual(b.auth.byUid.get(uidB), { uid: uidB, emailVerified: false, email: VICTIM_EMAIL });
  assert.equal(await b.auth.authAccounts.getUserByPhone(OTHER_PHONE), null);
  assert.deepEqual((await claim(b.srv, whoAuth('uAttackerPhone', { phone: OTHER_PHONE }))).json.claimed, []);
});

test('AUTO · phone EXISTING + email new: the existing account gets it, the email is NOT linked, no second account, admin note', async (t) => {
  const auth = fakeAuth({ users: [{ uid: 'uPhone', phoneNumber: PHONE }] });
  const { srv } = await autoRoutes({ auth });
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'pack_cbq', target: 'science', recipient: { phone: PHONE, email: EMAIL } });
  assert.deepEqual(auth.created, []);
  assert.deepEqual(auth.byUid.get('uPhone'), { uid: 'uPhone', phoneNumber: PHONE }, 'nothing added to the existing account');
  const stored = srv.db.read(`payOrders/${orderId}`);
  assert.equal(stored.uid, 'uPhone');
  assert.equal(stored.claimedVia, 'existing_account');
  assert.equal(stored.adminNote, SECOND_NOT_LINKED_NOTE);
  // The verified "also sign in with" offer still waits for that account's own session (linking needs its own proof).
  assert.equal(stored.alsoSignInPending, true);
});

test('AUTO · TAKEOVER: victim\'s email + attacker\'s new phone -> the VICTIM\'s account gets it; nothing linked; no account for the attacker', async (t) => {
  const auth = fakeAuth({ users: [{ uid: 'uVictim', email: VICTIM_EMAIL, emailVerified: true }] });
  const { srv } = await autoRoutes({ auth });
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'pack_chapter', target: 'real-numbers', recipient: { phone: OTHER_PHONE, email: VICTIM_EMAIL } });
  assert.deepEqual(auth.created, [], 'no account for the attacker phone');
  assert.deepEqual(auth.byUid.get('uVictim'), { uid: 'uVictim', email: VICTIM_EMAIL, emailVerified: true }, 'the attacker phone is NOT on the victim account');
  assert.equal(await auth.uidForPhone(OTHER_PHONE), null);
  assert.equal(srv.db.read(`payOrders/${orderId}`).uid, 'uVictim');
  assert.equal(srv.db.read(`payOrders/${orderId}`).adminNote, SECOND_NOT_LINKED_NOTE);
  // The attacker signing in with their phone gets NOTHING (the order is the victim's) and no way into the victim account.
  const atk = await claim(srv, whoAuth('uAttacker', { phone: OTHER_PHONE }));
  assert.deepEqual(atk.json.claimed, []);
  assert.equal(atk.json.firstSignIn, undefined);
  // Mirror: the attacker's EXISTING phone + the victim's NEW email -> the attacker's account, the email never added, no
  // account is made for the victim's email.
  const auth2 = fakeAuth({ users: [{ uid: 'uAttacker', phoneNumber: OTHER_PHONE }] });
  const { srv: srv2 } = await autoRoutes({ auth: auth2 });
  t.after(srv2.close);
  const second = await paidWhoOrder(srv2, { sku: 'pack_cbq', target: 'maths', recipient: { phone: OTHER_PHONE, email: VICTIM_EMAIL } });
  assert.deepEqual(auth2.created, []);
  assert.deepEqual(auth2.byUid.get('uAttacker'), { uid: 'uAttacker', phoneNumber: OTHER_PHONE });
  assert.equal(srv2.db.read(`payOrders/${second.orderId}`).adminNote, SECOND_NOT_LINKED_NOTE);
});

test('AUTO · an email on a stranger\'s UNVERIFIED account never goes on the new one: phone-only account + note; email-only waits', async (t) => {
  const auth = fakeAuth({ users: [{ uid: 'uStranger', email: EMAIL, emailVerified: false }] });
  const { srv } = await autoRoutes({ auth });
  t.after(srv.close);
  const withPhone = await paidWhoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { phone: PHONE, email: EMAIL } });
  assert.deepEqual(auth.created, [{ uid: autoAccountUid(withPhone.orderId), emailVerified: false, phoneNumber: PHONE }]);
  assert.equal(srv.db.read(`payOrders/${withPhone.orderId}`).adminNote, SECOND_NOT_LINKED_NOTE);
  assert.equal(srv.db.read(`payOrders/${withPhone.orderId}`).accountHasEmail, undefined);
  const emailOnly = await paidWhoOrder(srv, { sku: 'pack_mock', target: 'maths', recipient: { email: EMAIL } });
  const stored = srv.db.read(`payOrders/${emailOnly.orderId}`);
  assert.equal(stored.status, 'paid_unclaimed');
  assert.equal(stored.adminNote, ACCOUNT_NOT_CREATED_NOTE);
  assert.equal(stored.accountCreateError, 'email_in_use');
  assert.equal(auth.byUid.get('uStranger').phoneNumber, undefined);
});

test('AUTO · phone and email on two DIFFERENT accounts: first-entered wins + two-accounts note, nothing created', async (t) => {
  const auth = fakeAuth({ users: [{ uid: 'uPhone', phoneNumber: PHONE }, { uid: 'uEmail', email: EMAIL, emailVerified: true }] });
  const { srv } = await autoRoutes({ auth });
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE, email: EMAIL, first: 'email' } });
  assert.deepEqual(auth.created, []);
  assert.equal(srv.db.read(`payOrders/${orderId}`).uid, 'uEmail');
  assert.equal(srv.db.read(`payOrders/${orderId}`).adminNote, TWO_ACCOUNTS_NOTE);
});

test('AUTO · a recipient who already owns it is refused BEFORE payment (generic 409): no Razorpay order, nothing created', async (t) => {
  const auth = fakeAuth({ users: [{ uid: 'uOwner', phoneNumber: PHONE }] });
  const db = memoryFirestore();
  await db.collection('packEntitlements').doc('uOwner').collection('packs').doc('pack_cbq:maths').set({ packId: 'pack_cbq:maths' });
  const { srv } = await autoRoutes({ auth, db });
  t.after(srv.close);
  const r = await whoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { phone: PHONE } });
  assert.equal(r.status, 409);
  assert.equal(r.json.error, 'payment_unavailable');
  assert.equal(srv.rzp.calls.length, 0);
  assert.deepEqual(auth.created, []);
});

test('AUTO · verify + webhook racing on one order (verify twice, webhook first, both at once): ONE user, ONE grant', async (t) => {
  for (const mode of ['verify-twice', 'webhook-first', 'concurrent']) {
    const { srv, auth } = await autoRoutes();
    t.after(srv.close);
    const o = await whoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE, email: EMAIL } });
    const p = srv.rzp.pay(o.json.orderId);
    const pay = { ...srv.rzp.payments.get(p.id) };
    if (mode === 'verify-twice') {
      await guestVerify(srv, o.json.orderId, p.id);
      await guestVerify(srv, o.json.orderId, p.id);
    } else if (mode === 'webhook-first') {
      await sendWebhook(srv, pay);
      await srv.idle();
      await guestVerify(srv, o.json.orderId, p.id);
    } else {
      await Promise.all([guestVerify(srv, o.json.orderId, p.id), sendWebhook(srv, pay), guestVerify(srv, o.json.orderId, p.id)]);
    }
    await srv.idle();
    const uid = autoAccountUid(o.json.orderId);
    assert.equal(auth.byUid.size, 1, `${mode}: one user`);
    assert.ok(auth.byUid.has(uid), mode);
    const stored = srv.db.read(`payOrders/${o.json.orderId}`);
    assert.equal(stored.uid, uid, mode);
    assert.equal(stored.status, 'paid', mode);
    assert.equal(stored.claimedVia, 'account_created', mode);
    assert.deepEqual(srv.db.keys(`subscriptions/${uid}/payments/`), [`subscriptions/${uid}/payments/${p.id}`], `${mode}: one grant`);
  }
});

test('AUTO · createUser fails: the order stays paid_unclaimed with "account not created"; a later sign-in claim still attaches it', async (t) => {
  const auth = fakeAuth({ failCreate: 'auth/internal-error' });
  const { srv } = await autoRoutes({ auth });
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'pack_cbq', target: 'science', recipient: { phone: PHONE } });
  const stored = srv.db.read(`payOrders/${orderId}`);
  assert.equal(stored.status, 'paid_unclaimed');
  assert.equal(stored.uid, null);
  assert.equal(stored.adminNote, ACCOUNT_NOT_CREATED_NOTE);
  assert.equal(stored.accountCreateError, 'create_failed');
  assert.ok(srv.events.includes('payments.guest.deliver.account_not_created'));
  const c = await claim(srv, whoAuth('uLater', { phone: PHONE }));
  assert.equal(c.json.claimed.length, 1);
  assert.equal(srv.db.read(`payOrders/${orderId}`).uid, 'uLater');
  assert.ok(srv.db.read('packEntitlements/uLater/packs/pack_cbq:science'));
});

test('AUTO · first sign-in with the phone: the product is there, firstSignIn is said ONCE (trial rule); never for other accounts', async (t) => {
  const { srv } = await autoRoutes();
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { phone: PHONE } });
  const uid = autoAccountUid(orderId);
  assert.equal(srv.db.read(`subscriptions/${uid}`), undefined, 'no trial at payment');
  const first = await claim(srv, whoAuth(uid, { phone: PHONE }));
  assert.equal(first.status, 200);
  assert.deepEqual(first.json.claimed, [], 'already attached at payment');
  assert.equal(first.json.firstSignIn, true);
  assert.equal(first.json.trialStarted, true);
  // Review LOW 5: the trial is started BY THE SERVER in the same transaction (a lost response cannot lose it), as the
  // client's activateTrial writes it at sign-up.
  const sub = srv.db.read(`subscriptions/${uid}`);
  assert.equal(sub.tier, 'trial');
  assert.equal(sub.plan, 'trial_7day');
  assert.equal(new Date(sub.trialStartDate).getTime(), NOW);
  assert.ok(srv.db.read(`packEntitlements/${uid}/packs/pack_cbq:maths`), 'the product is there');
  const again = await claim(srv, whoAuth(uid, { phone: PHONE }));
  assert.equal(again.json.firstSignIn, undefined, 'once');
  assert.equal(again.json.trialStarted, undefined);
  assert.equal(new Date(srv.db.read(`subscriptions/${uid}`).trialStartDate).getTime(), NOW, 'never moved or restarted');
  // A normal (client-made) account never gets it; nor does anything with the switch off.
  assert.equal((await claim(srv, whoAuth('uNormal', { phone: OTHER_PHONE }))).json.firstSignIn, undefined);
});

test('AUTO · a Board Pass account made at payment: first sign-in is its sign-up, but no trial is started (covered anyway)', async (t) => {
  const { srv } = await autoRoutes();
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE } });
  const uid = autoAccountUid(orderId);
  const first = await claim(srv, whoAuth(uid, { phone: PHONE }));
  assert.equal(first.json.firstSignIn, true);
  assert.equal(first.json.trialStarted, false);
  assert.equal(srv.db.read(`subscriptions/${uid}`).tier, 'premium', 'the pass is untouched');
  assert.equal(srv.db.read(`subscriptions/${uid}`).trialStartDate, undefined);
  assert.ok(srv.db.read(`payOrders/${orderId}`).firstSignInAt, 'marked');
});

test('AUTO · MED 2 race: a re-resolve that finds THIS order\'s own account still takes the "created at payment" path', async (t) => {
  // Run A created the account (uid derived from the order) and stopped before the take; run B (verify / webhook) now
  // resolves the phone to that account - it must be labelled account_created, carry its sign-in fields, and get its
  // first sign-in (trial) like any account made at payment.
  const { srv, auth } = await autoRoutes();
  t.after(srv.close);
  const o = await whoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { email: EMAIL, phone: PHONE, first: 'email' } });
  const uid = autoAccountUid(o.json.orderId);
  await auth.authAccounts.createUser({ uid, emailVerified: false, email: EMAIL });
  auth.created.length = 0;
  // The email is unverified, so resolve (verified-email rule) does not see it - make the phone point at it instead, the
  // way a concurrent run's account is found by uidForPhone.
  auth.byUid.get(uid).phoneNumber = PHONE;
  const p = srv.rzp.pay(o.json.orderId);
  await guestVerify(srv, o.json.orderId, p.id);
  await srv.idle();
  assert.deepEqual(auth.created, [], 'not created again');
  const stored = srv.db.read(`payOrders/${o.json.orderId}`);
  assert.equal(stored.uid, uid);
  assert.equal(stored.claimedVia, 'account_created');
  assert.equal(stored.accountHasEmail, true);
  assert.equal((await claim(srv, whoAuth(uid, { phone: PHONE }))).json.firstSignIn, true);
});

test('AUTO · a signed-in payer buying for someone else: the account is made for the RECIPIENT, nothing for the payer', async (t) => {
  const auth = fakeAuth({ users: [{ uid: 'uPayer', email: 'parent@x.in', emailVerified: true }] });
  const { srv } = await autoRoutes({ auth });
  t.after(srv.close);
  const { orderId } = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE } }, whoAuth('uPayer', { email: 'parent@x.in', ev: true }));
  const stored = srv.db.read(`payOrders/${orderId}`);
  assert.equal(stored.payerUid, 'uPayer');
  assert.equal(stored.uid, autoAccountUid(orderId));
  assert.equal(srv.db.read('subscriptions/uPayer'), undefined);
});

test('AUTO · payment cancelled (order opened, never paid): nothing is created', async (t) => {
  const { srv, auth } = await autoRoutes();
  t.after(srv.close);
  const o = await whoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE, email: EMAIL } });
  assert.equal(o.status, 200);
  await srv.idle();
  assert.deepEqual(auth.created, []);
  assert.equal(srv.db.read(`payOrders/${o.json.orderId}`).status, 'created');
});

test('AUTO · switch OFF: identical to CHECKOUT-WHO - nothing created, paid_unclaimed, the same stored order', async (t) => {
  const snapshots = [];
  for (const env of [WHO_ENV, { ...AUTO_ENV, PAY_AUTO_ACCOUNT_ENABLED: '' }]) {
    const auth = fakeAuth({ users: [{ uid: 'uPhone', phoneNumber: OTHER_PHONE }] });
    const { srv } = await autoRoutes({ env, auth });
    t.after(srv.close);
    const fresh = await paidWhoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { phone: PHONE, email: EMAIL } });
    const half = await paidWhoOrder(srv, { sku: 'pack_mock', target: 'maths', recipient: { phone: OTHER_PHONE, email: EMAIL } });
    assert.deepEqual(auth.created, []);
    const a = srv.db.read(`payOrders/${fresh.orderId}`);
    const b = srv.db.read(`payOrders/${half.orderId}`);
    assert.equal(a.status, 'paid_unclaimed');
    assert.equal(b.adminNote, undefined, 'no second-identifier note with the switch off');
    const strip = (o) => Object.keys(o).sort();
    snapshots.push([strip(a), strip(b), (await claim(srv, whoAuth(autoAccountUid('x'), { phone: '+919000000001' }))).json]);
  }
  assert.deepEqual(snapshots[0], snapshots[1]);
});

test('AUTO · email: "Your LazyTopper account is ready" with ONE one-tap sign-in link (continue URL = our app); fallbacks', async (t) => {
  const links = [];
  const db = memoryFirestore();
  const resend = resendRecorder();
  const emailSignInLink = async (email, url) => {
    links.push({ email, url });
    return `https://lazytopper.firebaseapp.com/__/auth/action?mode=signIn&oobCode=CODE_${links.length}&continueUrl=${encodeURIComponent(url)}`;
  };
  const receiptEmailer = createPaymentReceiptEmailer({ env: EMAIL_ENV, adminFirestore: db, fetchImpl: resend.fetchImpl, now: () => NOW, emailSignInLink });
  const { srv } = await autoRoutes({ db, receiptEmailer });
  t.after(srv.close);
  const pack = await paidWhoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { email: EMAIL } });
  await receiptEmailer.whenIdle();
  const pass = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { email: 'riya@x.in', phone: PHONE } });
  await receiptEmailer.whenIdle();
  // Only the order whose account signs in with the email gets a link; the phone-first order's email gets none.
  assert.deepEqual(links.map((l) => l.email), [EMAIL]);
  assert.equal(links[0].url, 'https://www.lazytopper.com/login?finish=link&redirect=%2Fpacks%23my-packs');
  for (const l of links) assert.ok(!l.url.includes('@') && !l.url.includes('9876543948'), 'no email / phone in the continue URL');
  const toPack = resend.sent.filter((m) => m.body.to.includes(EMAIL));
  assert.equal(toPack.length, 1);
  assert.equal(toPack[0].body.subject, 'Your LazyTopper account is ready');
  assert.ok(toPack[0].body.html.includes('>Open LazyTopper</a>'));
  assert.ok(toPack[0].body.html.includes('CODE_1'));
  assert.ok(toPack[0].body.text.includes('Maths CBQ Pack'));
  assert.ok(toPack[0].body.text.includes('sign in any time'));
  const toPass = resend.sent.filter((m) => m.body.to.includes('riya@x.in'));
  assert.equal(toPass.length, 1);
  assert.equal(toPass[0].body.subject, 'Board Pass was bought for you on LazyTopper');
  assert.ok(toPass[0].body.text.startsWith("Board Pass was bought for you on LazyTopper \u2014 sign in with the mobile number it was bought for; it's already in your account."));
  assert.ok(!/https?:\/\//.test(toPass[0].body.html.replace(/mailto:[^"]+/g, '')), 'no link of any kind for an address not on the account');
  assert.ok(!toPass[0].body.text.includes('9876543948'), 'never the full phone');
  assert.ok(!JSON.stringify(resend.sent).includes('₹'), 'no price to the recipient');
  // Pure builder: no https link -> null (falls back).
  assert.equal(buildAccountReadyEmail({ passType: 'pack_cbq', packTarget: 'maths', signInLink: 'javascript:x', newAccount: true, appUrl: 'https://www.lazytopper.com' }), null);
  assert.ok(pack && pass);
});

test('AUTO · email fallbacks: a link that cannot be made, or a phone-only account, gets the plain "is ready" email', async (t) => {
  const db = memoryFirestore();
  const resend = resendRecorder();
  const receiptEmailer = createPaymentReceiptEmailer({ env: EMAIL_ENV, adminFirestore: db, fetchImpl: resend.fetchImpl, now: () => NOW, emailSignInLink: async () => { throw Object.assign(new Error('x'), { code: 'auth/unauthorized-continue-uri' }); } });
  const { srv } = await autoRoutes({ db, receiptEmailer });
  t.after(srv.close);
  await paidWhoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { email: EMAIL } });
  await receiptEmailer.whenIdle();
  assert.equal(resend.sent.length, 1);
  assert.equal(resend.sent[0].body.subject, 'Your Maths CBQ Pack is ready');
});

/* ══ GST-EXCL-1 · pay-by-phone and "Who will use it?" charge base + 18% GST from 00:00 IST 7 Nov 2026 ══════════════ */
const GST_AFTER = Date.parse('2026-11-07T09:00:00+05:30');

test('GST-EXCL-1 · pay-by-phone: the Board Pass and a pack are charged base + GST after the cut-off, with the breakup stored; claim grants them', async (t) => {
  const srv = await startRoutes({ nowMs: GST_AFTER });
  t.after(srv.close);
  const bp = await paidGuestOrder(srv, { sku: 'till_boards', phone: PHONE });
  const bpOrder = srv.db.read(`payOrders/${bp.orderId}`);
  assert.equal(bpOrder.amountPaise, 226200);
  assert.deepEqual([bpOrder.baseInr, bpOrder.gstInr, bpOrder.totalInr], [1917, 345, 2262]);
  assert.equal(bpOrder.amountPaise, quotePass({}, 'till_boards', GST_AFTER, { foundingOfferOpen: true }).amountPaise, 'the same quote as a signed-in order');
  const pk = await paidGuestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  const pkOrder = srv.db.read(`payOrders/${pk.orderId}`);
  assert.equal(pkOrder.amountPaise, 11700);
  assert.deepEqual([pkOrder.baseInr, pkOrder.gstInr, pkOrder.totalInr], [99, 18, 117]);
  const c = await claim(srv, signedIn('u1', PHONE));
  assert.equal(c.json.claimed.length, 2, c.text);
  assert.ok(srv.db.read('packEntitlements/u1/packs/pack_mock:maths'));
  assert.equal(srv.db.read('subscriptions/u1').tier, 'premium');
});

test('GST-EXCL-1 · pay-by-phone BEFORE the cut-off is byte-identical (1917, no GST fields)', async (t) => {
  const srv = await startRoutes({ nowMs: Date.parse('2026-11-06T23:59:59+05:30') });
  t.after(srv.close);
  const bp = await paidGuestOrder(srv, { sku: 'till_boards', phone: PHONE });
  const o = srv.db.read(`payOrders/${bp.orderId}`);
  assert.equal(o.amountPaise, 191700);
  assert.equal('gstInr' in o, false);
});

test('GST-EXCL-1 · "Who will use it?": the Board Pass and a CBQ pack are charged base + GST after the cut-off and land on the recipient', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV, nowMs: GST_AFTER, uidForPhone: async (p) => (p === PHONE ? 'uPhone' : null), uidForEmail: async () => null });
  t.after(srv.close);
  const pk = await paidWhoOrder(srv, { sku: 'pack_cbq', target: 'science', recipient: { phone: '9876543948' } });
  const o = srv.db.read(`payOrders/${pk.orderId}`);
  assert.equal(o.amountPaise, 23500);
  assert.deepEqual([o.baseInr, o.gstInr, o.totalInr], [199, 36, 235]);
  assert.ok(srv.db.read('packEntitlements/uPhone/packs/pack_cbq:science'));
  const bp = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { email: EMAIL } });
  assert.equal(srv.db.read(`payOrders/${bp.orderId}`).amountPaise, 226200);
});

test('GST-EXCL-1 · receipt: an order with a stored breakup shows "₹1,917 + ₹345 GST (18%) = ₹2,262 paid" (credit named); an older order has no GST line', () => {
  const base = { passType: 'till_boards', paymentId: 'pay_g', paidAtMs: GST_AFTER, appUrl: 'https://www.lazytopper.com' };
  const m = buildReceiptEmail({ ...base, amountPaise: 226200, gst: { baseInr: 1917, gstInr: 345 } });
  assert.ok(m.text.includes('Amount: ₹2,262\nGST: ₹1,917 + ₹345 GST (18%) = ₹2,262 paid\n'), m.text);
  assert.ok(m.html.includes('GST: ₹1,917 + ₹345 GST (18%) = ₹2,262 paid'));
  const credited = buildReceiptEmail({ ...base, amountPaise: 221300, gst: { baseInr: 1917, gstInr: 345, packCreditInr: 49 } });
  assert.ok(credited.text.includes('GST: ₹1,917 + ₹345 GST (18%) = ₹2,262, less pack credit ₹49: ₹2,213 paid'));
  const pack = buildReceiptEmail({ ...base, passType: 'pack_chapter', packTarget: 'triangles', amountPaise: 5800, gst: { baseInr: 49, gstInr: 9 } });
  assert.ok(pack.text.includes('GST: ₹49 + ₹9 GST (18%) = ₹58 paid'));
  const old = buildReceiptEmail({ ...base, amountPaise: 191700 });
  assert.ok(!/GST/.test(old.text + old.html));
  // A breakup that does not add up to the amount charged is never printed.
  const wrong = buildReceiptEmail({ ...base, amountPaise: 191700, gst: { baseInr: 1917, gstInr: 345 } });
  assert.ok(!/GST/.test(wrong.text));
});
