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
  GUEST_ATTACH_PATH,
  GUEST_RECEIPT_PATH,
  GUEST_GST_DETAILS_PATH,
  GUEST_PROOF_CLAIM_PATH,
  GUEST_ZIP_LINK_PATH,
  RECEIPT_WINDOW_MS,
  ATTACH_HOLD_MS,
  GUEST_VERIFY_PATH,
  GUEST_CLAIM_PATH,
  MAX_GUEST_ORDERS_PER_PHONE_PER_DAY,
  GUEST_ORDER_STATUS_PATH,
  STATUS_PROOF_TTL_MS,
  STATUS_CALLS_PER_ORDER_PER_HOUR,
  MAX_STATUS_CALLS_PER_CLIENT_PER_DAY,
  NO_ATTEMPT_FAILED_AFTER_MS,
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
        key: `${key}/${sub}`,
        isCollection: true,
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
            if (r.isCollection) {
              const prefix = `${r.key}/`;
              const list = [];
              for (const [k, e] of docs) if (k.startsWith(prefix) && !k.slice(prefix.length).includes('/')) list.push({ id: k.slice(prefix.length), data: () => ({ ...e.data }) });
              seen.set(`${r.key}/*`, list.map((d) => `${r.key}/${d.id}`).join(','));
              return { docs: list };
            }
            const entry = docs.get(r.key);
            seen.set(r.key, entry ? entry.version : 0);
            return snapOf(entry);
          },
          set(r, data, opts) { pending.push([r.key, data, opts]); },
          delete(r) { pending.push([r.key, null, { remove: true }]); },
        };
        const out = await fn(tx);
        await yieldNow();
        const conflict = [...seen].some(([k, v]) => {
          if (k.endsWith('/*')) {
            const prefix = `${k.slice(0, -1)}`;
            return [...docs.keys()].filter((x) => x.startsWith(prefix) && !x.slice(prefix.length).includes('/')).join(',') !== v;
          }
          return (docs.get(k) ? docs.get(k).version : 0) !== v;
        });
        if (conflict) continue;
        for (const [k, d, o] of pending) {
          if (o && o.remove) docs.delete(k);
          else write(k, d, o);
        }
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
    // PAY-RETURN-1: Razorpay's list of an order's payments.
    if (method === 'GET' && (m = u.pathname.match(/^\/v1\/orders\/([^/]+)\/payments$/))) {
      if (!orders.has(m[1])) return reply(400, {});
      const items = [...payments.values()].filter((x) => x.order_id === m[1]).map((x) => ({ ...x }));
      return reply(200, { entity: 'collection', count: items.length, items });
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
  function pay(orderId, { id = `pay_${orderId}`, amount, status = 'captured', currency = 'INR', contact, email } = {}) {
    const order = orders.get(orderId);
    const p = { id, order_id: orderId, amount: amount === undefined ? order.amount : amount, currency, status, ...(contact !== undefined ? { contact } : {}), ...(email !== undefined ? { email } : {}) };
    payments.set(id, p);
    return p;
  }
  return { fetchImpl, orders, payments, calls, pay };
}


/* ── guest routes AND the existing payment routes (webhook), behind one real HTTP server ── */
async function startRoutes({ env = ENV_ON, db = memoryFirestore(), rzp = fakeRazorpay(), receiptEmailer, accountExistsForPhone, uidForPhone, uidForEmail, authAccounts, invoicer, packPdf, nowMs = NOW, nowFn = null, serverEvents } = {}) {
  const { sendJson } = createHttpUtils('*');
  const events = [];
  const telemetry = { increment: (e) => events.push(e) };
  const now = nowFn || (() => nowMs); // GST-EXCL-1: a test may move the clock past the 7 Nov GST cut-off
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
  const guest = createGuestPayRoutes({ sendJson, verifiedCaller, adminFirestore: db, telemetry, env, fetchImpl: rzp.fetchImpl, now, foundingOfferOpen: true, receiptEmailer, invoicer, packPdf, accountExistsForPhone, uidForPhone, uidForEmail, authAccounts, ...(serverEvents ? { serverEvents } : {}) });
  // CHECKOUT-WHO-2: the webhook runs the guest routes' recipient delivery, wired exactly as index.cjs does.
  const pay = createPaymentRoutes({ sendJson, verifiedCaller, adminFirestore: db, telemetry, env, fetchImpl: rzp.fetchImpl, now, foundingOfferOpen: true, receiptEmailer, ...(serverEvents ? { serverEvents } : {}), afterGuestPaid: (x) => guest.afterRecipientPaid(x) });
  const table = {
    [GUEST_ORDER_PATH]: guest.handleOrder,
    [GUEST_VERIFY_PATH]: guest.handleVerify,
    [GUEST_ORDER_STATUS_PATH]: guest.handleOrderStatus,
    [GUEST_CLAIM_PATH]: guest.handleClaim,
    [GUEST_ATTACH_PATH]: guest.handleAttach,
    [GUEST_RECEIPT_PATH]: guest.handleReceipt,
    [GUEST_GST_DETAILS_PATH]: guest.handleGstDetails,
    [GUEST_PROOF_CLAIM_PATH]: guest.handleClaimWithProof,
    [GUEST_ZIP_LINK_PATH]: guest.handleZipLink,
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
  return { port, db, rzp, events, idle, guest, close: () => new Promise((r) => server.close(r)) };
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
    '/login?method=phone&redirect=%2Fpacks%3Ffrom%3Dpay%23my-packs', 'support@lazytopper.com', '+91 97145 68948']) {
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
  assert.ok(resend.sent[0].body.text.includes('your Board Pass is switched on'));
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
  assert.ok(m.text.includes("Board Pass is now active on the student's account"));
  const own = buildReceiptEmail({ passType: 'till_boards', amountPaise: 191700, paymentId: 'pay_s', paidAtMs: NOW, appUrl: 'https://www.lazytopper.com' });
  assert.ok(own.text.includes('Board Pass is switched on for your account'));
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
  // PAY-RETURN-1: the one additive reply field is the per-order status proof (PAY_RETURN_DISABLED=1 drops it: see the PR* tests).
  assert.deepEqual(Object.keys(r.json).sort(), ['amountPaise', 'keyId', 'ok', 'orderId', 'phoneMasked', 'statusProof']);
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
    const strip = ({ orderId, statusProof, ...rest }) => rest; // eslint-disable-line no-unused-vars -- statusProof is random per order
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
  // SELFPAY-ATTACH-1 (owner 12 Nov: say it plainly): "already has it" is now its own answer (expectation changed from the generic one).
  assert.deepEqual(r.json, { ok: false, error: 'already_covered', reason: 'already_has' });
  assert.equal(srv.rzp.calls.length, 0);
  // An owned pack is the same answer; a lookup that cannot tell fails closed.
  await db.collection('packEntitlements').doc('uCovered').collection('packs').doc('pack_cbq:maths').set({ packId: 'pack_cbq:maths' });
  assert.deepEqual((await whoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { phone: PHONE } })).json, { ok: false, error: 'already_covered', reason: 'already_has' });
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
  assert.ok(pack.text.includes('%2Fpacks%3Ffrom%3Dpay%23my-packs'));
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
  // SELFPAY-ATTACH-1: expectation changed - "already has it" is said plainly now; a purchase merely WAITING stays the generic answer.
  assert.deepEqual(covered.json, { ok: false, error: 'already_covered', reason: 'already_has' });
  assert.deepEqual(pending.json, { ok: false, error: 'payment_unavailable' });
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
  assert.equal(r.json.error, 'already_covered');
  assert.equal(r.json.reason, 'already_has');
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
  assert.equal(links[0].url, 'https://www.lazytopper.com/login?finish=link&redirect=%2Fpacks%3Ffrom%3Dpay%23my-packs');
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

/* ══ SELF · CHECKOUT-SELF-2 "Buy for me": the signed-out buyer's contact is read from the VERIFIED payment ═══════════════
 *
 * ★ MUTATIONS (run against THIS file only, each shown red, each restored):
 *   M11 guestPay.cjs ensureSelfContact takes the contact from the verify BODY instead of Razorpay's payment record
 *        -> "SELF · the contact comes ONLY from Razorpay's record ..." red
 *   M12 guestPay.cjs handleSelfOrder accepts a signed-in caller (drops the payerUidOf refusal)
 *        -> "SELF · a signed-in caller ..." red
 */
const SELF_ENV = { ...AUTO_ENV };
const selfOrder = (srv, body = {}, headers = {}) => request(srv.port, GUEST_ORDER_PATH, { body: { self: true, ...body }, headers });
async function paidSelfOrder(srv, payOpts, body = { sku: 'pack_cbq', target: 'maths' }) {
  const o = await selfOrder(srv, body);
  assert.equal(o.status, 200, o.text);
  const p = srv.rzp.pay(o.json.orderId, payOpts);
  const v = await guestVerify(srv, o.json.orderId, p.id);
  return { orderId: o.json.orderId, paymentId: p.id, order: o.json, verify: v };
}

test('SELF · order: no identifier is asked or stored; server price; kill switch and CHECKOUT_WHO both gate it', async (t) => {
  const { srv } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const o = await selfOrder(srv, { sku: 'till_boards', amountPaise: 1, uid: 'x', phone: PHONE });
  assert.equal(o.status, 200, o.text);
  assert.equal(srv.rzp.orders.get(o.json.orderId).amount, o.json.amountPaise, 'the Razorpay order carries the server amount');
  assert.notEqual(o.json.amountPaise, 1);
  const stored = srv.db.read(`payOrders/${o.json.orderId}`);
  assert.equal(stored.selfPay, true);
  assert.equal(stored.checkoutWho, true);
  assert.equal(stored.guestPhone, undefined, 'a body phone is not stored for a self order');
  assert.equal(stored.guestEmail, undefined);
  assert.equal(stored.uid, null);
  assert.equal(JSON.stringify(srv.rzp.orders.get(o.json.orderId).notes).includes('+91'), false);
  assert.equal((await selfOrder(srv, { sku: 'nope' })).status, 400);
  assert.equal((await selfOrder(srv, { sku: 'pack_cbq', target: 'bad-target' })).status, 400);
  // kill switch: a self body is then treated like a body with no phone (400/404), and no Razorpay order is made
  const off = await startRoutes({ env: { ...SELF_ENV, CHECKOUT_SELF_DISABLED: '1' } });
  t.after(off.close);
  const before = off.rzp.calls.length;
  assert.notEqual((await selfOrder(off, { sku: 'till_boards' })).status, 200);
  assert.equal(off.rzp.calls.length, before);
  // CHECKOUT_WHO off -> not available
  const nowho = await startRoutes({ env: { ...ENV_ON } });
  t.after(nowho.close);
  assert.notEqual((await selfOrder(nowho, { sku: 'till_boards' })).status, 200);
});

test('SELF · a signed-in caller is refused (409): signed-in flows keep their own checkout', async (t) => {
  const { srv } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const r = await selfOrder(srv, { sku: 'till_boards' }, whoAuth('uSignedIn', { phone: PHONE }));
  assert.equal(r.status, 409);
  assert.equal(srv.rzp.calls.length, 0);
});

test("SELF · the contact comes ONLY from Razorpay's record of the verified payment, never the verify body", async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const o = await selfOrder(srv, { sku: 'pack_cbq', target: 'maths' });
  const p = srv.rzp.pay(o.json.orderId, { contact: '+91 98765 43948', email: 'Anaya.K@Gmail.com' });
  const v = await request(srv.port, GUEST_VERIFY_PATH, {
    body: { orderId: o.json.orderId, paymentId: p.id, signature: checkoutSig(o.json.orderId, p.id), phone: OTHER_PHONE, recipient: { phone: OTHER_PHONE }, contact: OTHER_PHONE },
  });
  assert.equal(v.status, 200, v.text);
  assert.deepEqual(v.json.selfContact, { phone: PHONE, email: EMAIL, first: 'phone' });
  const stored = srv.db.read(`payOrders/${o.json.orderId}`);
  assert.equal(stored.guestPhone, PHONE);
  assert.equal(stored.guestEmail, EMAIL);
  assert.equal(stored.recipientFirst, 'phone');
  await srv.idle();
  assert.ok(auth.created.every((u) => u.phoneNumber !== OTHER_PHONE));
});

test('SELF · phone only, email only, both: derived, first = phone when present', async (t) => {
  const cases = [
    [{ contact: '+919876543948' }, { phone: PHONE, first: 'phone' }],
    [{ contact: '9876543948', email: 'ignored-not-an-email' }, { phone: PHONE, first: 'phone' }],
    [{ email: 'Anaya.K@gmail.com' }, { email: EMAIL, first: 'email' }],
    [{ contact: '+14155550100', email: 'anaya.k@gmail.com' }, { email: EMAIL, first: 'email' }],
    [{ contact: '+919876543948', email: 'anaya.k@gmail.com' }, { phone: PHONE, email: EMAIL, first: 'phone' }],
  ];
  for (const [pay, want] of cases) {
    const { srv } = await autoRoutes({ env: SELF_ENV });
    t.after(srv.close);
    const r = await paidSelfOrder(srv, pay);
    assert.equal(r.verify.status, 200, r.verify.text);
    assert.deepEqual(r.verify.json.selfContact, want, JSON.stringify(pay));
  }
});

test('SELF · phone paid -> the account is made for that phone and the pack is delivered; a later phone sign-in finds it', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const { orderId } = await paidSelfOrder(srv, { contact: '+919876543948' });
  await srv.idle();
  const uid = autoAccountUid(orderId);
  assert.deepEqual(auth.created, [{ uid, emailVerified: false, phoneNumber: PHONE }]);
  assert.ok(srv.db.read(`packEntitlements/${uid}/packs/pack_cbq:maths`));
  assert.equal(srv.db.read(`payOrders/${orderId}`).claimedVia, 'account_created');
});

test('SELF · PAY_AUTO_ACCOUNT off: the order waits paid_unclaimed and the buyer\'s verified phone sign-in claims it', async (t) => {
  const { srv } = await autoRoutes({ env: { ...WHO_ENV } });
  t.after(srv.close);
  const { orderId, verify } = await paidSelfOrder(srv, { contact: '+919876543948' });
  assert.equal(verify.json.selfContact.phone, PHONE);
  await srv.idle();
  assert.equal(srv.db.read(`payOrders/${orderId}`).status, 'paid_unclaimed');
  assert.deepEqual(packDocs(srv.db), []);
  const c = await claim(srv, whoAuth('uBuyer', { phone: PHONE }));
  assert.equal(c.json.claimed.length, 1);
  assert.ok(srv.db.read('packEntitlements/uBuyer/packs/pack_cbq:maths'));
});

test('SELF · email-only payment: claimable by the VERIFIED email (Google), not by an unverified one', async (t) => {
  const { srv } = await autoRoutes({ env: { ...WHO_ENV } });
  t.after(srv.close);
  await paidSelfOrder(srv, { email: 'anaya.k@gmail.com' });
  assert.deepEqual((await claim(srv, whoAuth('uA', { email: EMAIL, ev: false }))).json.claimed, []);
  assert.equal((await claim(srv, whoAuth('uB', { email: EMAIL, ev: true }))).json.claimed.length, 1);
});

test('SELF · no usable contact (foreign number, no email): honest null, order stays paid_unclaimed with an admin note, nothing granted, no account, no lost grant', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const { orderId, verify } = await paidSelfOrder(srv, { contact: '+14155550100' });
  assert.equal(verify.status, 200, verify.text);
  assert.equal(verify.json.selfContact, null);
  await srv.idle();
  const stored = srv.db.read(`payOrders/${orderId}`);
  assert.equal(stored.status, 'paid_unclaimed');
  assert.equal(stored.adminNote, 'self_pay_no_usable_contact');
  assert.equal(stored.guestPhone, undefined);
  assert.deepEqual(auth.created, []);
  assert.deepEqual(packDocs(srv.db), []);
  // a repeat verify answers the same and does not re-fetch / overwrite
  const again = await guestVerify(srv, orderId, `pay_${orderId}`);
  assert.equal(again.json.selfContact, null);
  // the order is not claimable by an unrelated verified phone
  assert.deepEqual((await claim(srv, whoAuth('uX', { phone: OTHER_PHONE }))).json.claimed, []);
  // ...and once the owner attaches an identifier (admin), the existing claim path takes it
  await srv.db.collection('payOrders').doc(orderId).set({ guestPhone: PHONE }, { merge: true });
  assert.equal((await claim(srv, whoAuth('uY', { phone: PHONE }))).json.claimed.length, 1);
});

test('SELF · webhook only (verify never arrives): the contact is read from Razorpay, the account made, the pack delivered', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const o = await selfOrder(srv, { sku: 'pack_cbq', target: 'maths' });
  const p = srv.rzp.pay(o.json.orderId, { contact: '+919876543948' });
  const w = await sendWebhook(srv, p);
  assert.equal(w.status, 200, w.text);
  await srv.idle();
  const uid = autoAccountUid(o.json.orderId);
  assert.equal(srv.db.read(`payOrders/${o.json.orderId}`).guestPhone, PHONE);
  assert.deepEqual(auth.created, [{ uid, emailVerified: false, phoneNumber: PHONE }]);
  assert.ok(srv.db.read(`packEntitlements/${uid}/packs/pack_cbq:maths`));
  // the late verify then replays the same contact
  const v = await guestVerify(srv, o.json.orderId, p.id);
  assert.equal(v.json.selfContact.phone, PHONE);
});

test('SELF · verify + webhook racing on one self order: ONE account, ONE grant', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const o = await selfOrder(srv, { sku: 'till_boards' });
  const p = srv.rzp.pay(o.json.orderId, { contact: '+919876543948' });
  await Promise.all([guestVerify(srv, o.json.orderId, p.id), sendWebhook(srv, p)]);
  await srv.idle();
  assert.equal(auth.created.length, 1);
  assert.equal(srv.db.read(`subscriptions/${autoAccountUid(o.json.orderId)}`).tier, 'premium');
});

test('SELF · every payment check still applies: a bad signature, a wrong-amount payment, or an uncaptured one reads and attaches NOTHING', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const o = await selfOrder(srv, { sku: 'pack_cbq', target: 'maths' });
  const p = srv.rzp.pay(o.json.orderId, { contact: '+919876543948' });
  assert.equal((await guestVerify(srv, o.json.orderId, p.id, 'ab'.repeat(32))).status, 400);
  const o2 = await selfOrder(srv, { sku: 'pack_cbq', target: 'maths' });
  const p2 = srv.rzp.pay(o2.json.orderId, { contact: '+919876543948', amount: 100 });
  assert.equal((await guestVerify(srv, o2.json.orderId, p2.id)).status, 400);
  const o3 = await selfOrder(srv, { sku: 'pack_cbq', target: 'maths' });
  const p3 = srv.rzp.pay(o3.json.orderId, { contact: '+919876543948', status: 'failed' });
  assert.notEqual((await guestVerify(srv, o3.json.orderId, p3.id)).status, 200);
  for (const id of [o.json.orderId, o2.json.orderId, o3.json.orderId]) {
    assert.equal(srv.db.read(`payOrders/${id}`).guestPhone, undefined);
    assert.equal(srv.db.read(`payOrders/${id}`).status, 'created');
  }
  assert.deepEqual(auth.created, []);
});

test('SELF · an existing account with that phone gets it (never a second account); a duplicate is labelled, not swallowed', async (t) => {
  const auth = fakeAuth({ users: [{ uid: 'uOld', phoneNumber: PHONE, emailVerified: false }] });
  const { srv } = await autoRoutes({ env: SELF_ENV, auth });
  t.after(srv.close);
  const { orderId } = await paidSelfOrder(srv, { contact: '+919876543948' });
  await srv.idle();
  assert.deepEqual(auth.created, []);
  assert.equal(srv.db.read(`payOrders/${orderId}`).uid, 'uOld');
  assert.ok(srv.db.read('packEntitlements/uOld/packs/pack_cbq:maths'));
  const second = await paidSelfOrder(srv, { contact: '+919876543948', id: 'pay_second' });
  await srv.idle();
  assert.equal(srv.db.read(`payOrders/${second.orderId}`).status, 'duplicate_purchase');
});

test('SELF · the old recipient order and phone order are untouched with the self path present', async (t) => {
  const { srv } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const r = await paidWhoOrder(srv, { sku: 'till_boards', recipient: { phone: PHONE } });
  assert.equal(srv.db.read(`payOrders/${r.orderId}`).selfPay, undefined);
  assert.equal(r.verify.selfContact, undefined);
});

test('SELF · phone AND email on the payment: both are claim keys, no account is made at payment, ONE grant whichever sign-in comes first', async (t) => {
  for (const order of ['phone-first', 'google-first']) {
    const { srv, auth } = await autoRoutes({ env: SELF_ENV });
    t.after(srv.close);
    const { orderId, verify } = await paidSelfOrder(srv, { contact: '+919876543948', email: 'anaya.k@gmail.com' });
    assert.deepEqual(verify.json.selfContact, { phone: PHONE, email: EMAIL, first: 'phone' });
    await srv.idle();
    const stored = srv.db.read(`payOrders/${orderId}`);
    assert.equal(stored.status, 'paid_unclaimed');
    assert.equal(stored.guestPhone, PHONE);
    assert.equal(stored.guestEmail, EMAIL);
    assert.deepEqual(auth.created, [], 'no account made at payment');
    const phoneSide = () => claim(srv, whoAuth('uPhone', { phone: PHONE }));
    const googleSide = () => claim(srv, whoAuth('uGoogle', { email: EMAIL, ev: true }));
    const [first, second] = order === 'phone-first' ? [phoneSide, googleSide] : [googleSide, phoneSide];
    assert.equal((await first()).json.claimed.length, 1, order);
    assert.deepEqual((await second()).json.claimed, [], `${order}: the other sign-in claims nothing`);
    assert.equal(srv.db.keys('packEntitlements/').filter((k) => k.includes('/packs/pack_cbq:maths')).length, 1, 'exactly one grant');
  }
});

test('SELF · precedence unchanged: phone only and email only still get their one account at payment', async (t) => {
  for (const [pay, carried] of [[{ contact: '+919876543948' }, { phoneNumber: PHONE }], [{ email: 'anaya.k@gmail.com' }, { email: EMAIL }]]) {
    const { srv, auth } = await autoRoutes({ env: SELF_ENV });
    t.after(srv.close);
    const { orderId } = await paidSelfOrder(srv, pay);
    await srv.idle();
    assert.deepEqual(auth.created, [{ uid: autoAccountUid(orderId), emailVerified: false, ...carried }]);
  }
});

test("SELF · F1: Razorpay's placeholder email (void@razorpay.com) is NOT an email: Indian phone -> phone-only path, account at payment as before", async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const { orderId, verify } = await paidSelfOrder(srv, { contact: '+919876543948', email: 'void@razorpay.com' });
  assert.deepEqual(verify.json.selfContact, { phone: PHONE, first: 'phone' });
  await srv.idle();
  assert.equal(srv.db.read(`payOrders/${orderId}`).guestEmail, undefined);
  assert.deepEqual(auth.created, [{ uid: autoAccountUid(orderId), emailVerified: false, phoneNumber: PHONE }]);
  assert.ok(srv.db.read(`packEntitlements/${autoAccountUid(orderId)}/packs/pack_cbq:maths`));
});

test('SELF · F1: placeholder email + foreign phone -> no usable contact: paid_unclaimed, admin note, no account, nothing sent to void@', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  for (const email of ['void@razorpay.com', 'VOID@Razorpay.com']) {
    const { orderId, verify } = await paidSelfOrder(srv, { contact: '+14155550100', email });
    assert.equal(verify.json.selfContact, null);
    await srv.idle();
    const stored = srv.db.read(`payOrders/${orderId}`);
    assert.equal(stored.status, 'paid_unclaimed');
    assert.equal(stored.adminNote, 'self_pay_no_usable_contact');
    assert.equal(stored.guestEmail, undefined);
  }
  assert.deepEqual(auth.created, []);
  assert.deepEqual(packDocs(srv.db), []);
});

test('SELF · F2: the Razorpay payment read failing flags the order for the admin, and a later successful read clears the note and delivers', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const o = await selfOrder(srv, { sku: 'pack_cbq', target: 'maths' });
  const p = srv.rzp.pay(o.json.orderId, { contact: '+919876543948' });
  srv.rzp.payments.delete(p.id); // the GET inside the contact read now fails
  const w = await sendWebhook(srv, p);
  assert.equal(w.status, 200, w.text);
  await srv.idle();
  const flagged = srv.db.read(`payOrders/${o.json.orderId}`);
  assert.equal(flagged.status, 'paid_unclaimed');
  assert.equal(flagged.adminNote, 'self_pay_contact_read_failed');
  assert.equal(flagged.guestPhone, undefined);
  assert.deepEqual(auth.created, []);
  assert.ok(srv.events.includes('payments.guest.self.contact_read_failed'));
  // Razorpay answers again: the next verify reads it, clears the flag, and the order is delivered
  srv.rzp.payments.set(p.id, p);
  const v = await guestVerify(srv, o.json.orderId, p.id);
  assert.equal(v.json.selfContact.phone, PHONE);
  await srv.idle();
  const ok = srv.db.read(`payOrders/${o.json.orderId}`);
  assert.equal(ok.adminNote, null);
  assert.equal(ok.guestPhone, PHONE);
  assert.equal(auth.created.length, 1);
});


/* ══ SELFPAY-ATTACH-1 (12 Nov 2026): pay first, then say who uses it ═════════════════════════════════════════════════ */
const attachSelf = (srv, body = {}, headers = {}) => request(srv.port, GUEST_ORDER_PATH, { body: { self: true, attach: true, sku: 'till_boards', ...body }, headers });
const doAttach = (srv, paid, extra = {}, headers = {}) =>
  request(srv.port, GUEST_ATTACH_PATH, { body: { orderId: paid.orderId, paymentId: paid.paymentId, signature: checkoutSig(paid.orderId, paid.paymentId), ...extra }, headers });
async function paidAttach(srv, payOpts = { contact: '+919876543948' }, body = {}) {
  const o = await attachSelf(srv, body);
  assert.equal(o.status, 200, o.text);
  const p = srv.rzp.pay(o.json.orderId, payOpts);
  const v = await guestVerify(srv, o.json.orderId, p.id);
  assert.equal(v.status, 200, v.text);
  await srv.idle();
  return { orderId: o.json.orderId, paymentId: p.id, verify: v.json };
}

test('ATTACH · the marker is stored; verify records the payment, reads the contact, HOLDS delivery (no account, no grant)', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const stored = srv.db.read(`payOrders/${paid.orderId}`);
  assert.equal(stored.attachFlow, true);
  assert.equal(stored.status, 'paid_unclaimed');
  assert.equal(stored.guestPhone, PHONE, 'the paid-with contact is still read');
  assert.equal(new Date(stored.attachHoldUntil).getTime(), NOW + ATTACH_HOLD_MS, 'hold = payment time + 10 minutes');
  assert.deepEqual(auth.created, [], 'no account is made while the payer may still choose');
  assert.equal(subsDocs(srv.db).length, 0);
  assert.equal(paid.verify.attach.attached, false);
  assert.equal(paid.verify.attach.holdUntilMs, NOW + ATTACH_HOLD_MS);
  assert.equal(paid.verify.attach.holdRemainingMs, ATTACH_HOLD_MS, "the server sends its own remaining time (F10)");
});

test('ATTACH · "me" with no recipient: the paid-with number gets it through the EXISTING delivery', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const r = await doAttach(srv, paid, { choice: 'me' });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.phoneMasked, maskIndianMobile(PHONE));
  assert.equal(JSON.stringify(r.json).includes('9876543948'), false, 'never the full number');
  await srv.idle();
  assert.equal(auth.created.length, 1);
  assert.equal(auth.created[0].phoneNumber, PHONE);
  const uid = autoAccountUid(paid.orderId);
  assert.equal(srv.db.read(`subscriptions/${uid}`).tier, 'premium');
  const stored = srv.db.read(`payOrders/${paid.orderId}`);
  assert.equal(stored.status, 'paid');
  assert.equal(stored.attachChoice, 'me');
});

test('ATTACH · "other": the typed recipient REPLACES the paid-with contact and gets the delivery', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const paid = await paidAttach(srv, { contact: '+919876543948', email: 'Anaya.K@Gmail.com' });
  const r = await doAttach(srv, paid, { choice: 'other', recipient: { phone: OTHER_PHONE } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.phoneMasked, maskIndianMobile(OTHER_PHONE));
  assert.equal(r.json.emailMasked, undefined, 'the paid-with email is not carried over');
  await srv.idle();
  const stored = srv.db.read(`payOrders/${paid.orderId}`);
  assert.equal(stored.guestPhone, OTHER_PHONE);
  assert.equal(stored.guestEmail, null);
  assert.equal(stored.attachChoice, 'other');
  assert.deepEqual(auth.created.map((u) => u.phoneNumber), [OTHER_PHONE]);
  assert.equal(srv.db.read(`subscriptions/${autoAccountUid(paid.orderId)}`).tier, 'premium');
});

test('ATTACH · a recipient that already has it: already_has, order UNCHANGED, no delivery (pass and pack)', async (t) => {
  const auth = fakeAuth({ users: [{ uid: 'uHas', phoneNumber: OTHER_PHONE }] });
  const db = memoryFirestore();
  await db.collection('subscriptions').doc('uHas').set(COVERED_SUB);
  await db.collection('packEntitlements').doc('uHas').collection('packs').doc('pack_cbq:maths').set({ packId: 'pack_cbq:maths' });
  const { srv } = await autoRoutes({ env: SELF_ENV, auth, db });
  t.after(srv.close);
  for (const body of [{}, { sku: 'pack_cbq', target: 'maths' }]) {
    const paid = await paidAttach(srv, { contact: '+919876543948' }, body);
    const before = JSON.stringify(srv.db.read(`payOrders/${paid.orderId}`));
    const r = await doAttach(srv, paid, { choice: 'other', recipient: { phone: OTHER_PHONE } });
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.reason, 'already_has');
    assert.equal(JSON.stringify(srv.db.read(`payOrders/${paid.orderId}`)), before, 'nothing written');
    await srv.idle();
    assert.equal(srv.db.read(`payOrders/${paid.orderId}`).status, 'paid_unclaimed');
  }
  assert.deepEqual(auth.created, []);
});

test('ATTACH · refused: bad signature, wrong paymentId, signed-in caller, a non-attach order, a bad choice', async (t) => {
  const { srv } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const base = { orderId: paid.orderId, paymentId: paid.paymentId, choice: 'me' };
  assert.equal((await request(srv.port, GUEST_ATTACH_PATH, { body: { ...base, signature: 'ab'.repeat(32) } })).status, 400);
  const wrong = await request(srv.port, GUEST_ATTACH_PATH, { body: { ...base, paymentId: 'pay_other', signature: checkoutSig(paid.orderId, 'pay_other') } });
  assert.equal(wrong.status, 400);
  assert.equal((await doAttach(srv, paid, { choice: 'me' }, signedIn('uX', PHONE))).status, 409);
  assert.equal((await doAttach(srv, paid, { choice: 'nope' })).status, 400);
  assert.equal(srv.db.read(`payOrders/${paid.orderId}`).attachedAt, undefined, 'nothing attached by any refusal');
  // an old-client self order (no marker) is not attachable
  const o = await selfOrder(srv, { sku: 'till_boards' });
  const p = srv.rzp.pay(o.json.orderId, { contact: '+919876543948' });
  await guestVerify(srv, o.json.orderId, p.id);
  assert.equal((await doAttach(srv, { orderId: o.json.orderId, paymentId: p.id }, { choice: 'me' })).status, 400);
});

test('ATTACH · idempotent: a second attach answers the same and changes nothing (even with a different recipient)', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const first = await doAttach(srv, paid, { choice: 'me' });
  await srv.idle();
  const stored = JSON.stringify(srv.db.read(`payOrders/${paid.orderId}`));
  const again = await doAttach(srv, paid, { choice: 'other', recipient: { phone: OTHER_PHONE } });
  await srv.idle();
  assert.equal(again.status, 200);
  assert.deepEqual(again.json, first.json);
  assert.equal(JSON.stringify(srv.db.read(`payOrders/${paid.orderId}`)), stored);
  assert.equal(auth.created.length, 1);
});

test('ATTACH · F3: two concurrent attaches with DIFFERENT recipients: exactly one wins, the other gets the first answer, one delivery', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const [a, b] = await Promise.all([
    doAttach(srv, paid, { choice: 'other', recipient: { phone: OTHER_PHONE } }),
    doAttach(srv, paid, { choice: 'other', recipient: { phone: '+919811122233' } }),
  ]);
  await srv.idle();
  assert.equal(a.status, 200, a.text);
  assert.equal(b.status, 200, b.text);
  assert.deepEqual(a.json, b.json, 'the loser is answered with the winner\'s answer, never its own');
  const stored = srv.db.read(`payOrders/${paid.orderId}`);
  assert.equal(stored.status, 'paid');
  assert.equal(auth.created.length, 1, 'exactly one delivery');
  assert.equal(auth.created[0].phoneNumber, stored.guestPhone, 'the account is for the recipient that won');
  assert.equal(a.json.phoneMasked, maskIndianMobile(stored.guestPhone));
});

test('ATTACH-HOLD-1 · the PAYER signs in with the paid-with phone DURING the hold: claimed at once, no hold hint, idempotent', async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  assert.equal(db.read(`payOrders/${paid.orderId}`).status, 'paid_unclaimed');
  const during = await startRoutes({ env: SELF_ENV, db, nowMs: NOW + ATTACH_HOLD_MS - 1 });
  t.after(during.close);
  const r = await claim(during, signedIn('uPayer', PHONE));
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.claimed.length, 1, r.text);
  assert.equal(r.json.held, undefined);
  const stored = db.read(`payOrders/${paid.orderId}`);
  assert.equal(stored.status, 'paid');
  assert.equal(stored.uid, 'uPayer');
  const again = await claim(during, signedIn('uPayer', PHONE));
  assert.equal(again.json.claimed.length, 0);
  assert.equal(db.read(`payOrders/${paid.orderId}`).uid, 'uPayer');
});

test("ATTACH-HOLD-1 · an attach order that is NOT the payer's own paid-with contact stays refused during the hold, is reported as held (end time only), and is taken at exactly +10:00", async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const key = `payOrders/${paid.orderId}`;
  const { selfContactFrom, ...rest } = db.read(key);
  assert.equal(selfContactFrom, 'payment');
  db.docs.set(key, { data: { ...rest }, version: 99 });
  const before = await startRoutes({ env: SELF_ENV, db, nowMs: NOW + ATTACH_HOLD_MS - 1 });
  t.after(before.close);
  const r = await claim(before, signedIn('uEdge', PHONE));
  assert.deepEqual(r.json.claimed, [], 'still held at +9:59.999');
  assert.deepEqual(r.json.held, [{ holdEndsMs: NOW + ATTACH_HOLD_MS }]);
  assert.equal(JSON.stringify(r.json).includes(paid.orderId), false, 'no order id in the hint');
  assert.equal(db.read(key).status, 'paid_unclaimed');
  db.docs.set(key, { data: { ...rest, selfContactFrom: 'payment', selfPay: false }, version: 100 });
  assert.deepEqual((await claim(before, signedIn('uEdge', PHONE))).json.claimed, [], 'not a self-pay order: still held');
  db.docs.set(key, { data: { ...rest }, version: 101 });
  const at = await startRoutes({ env: SELF_ENV, db, nowMs: NOW + ATTACH_HOLD_MS });
  t.after(at.close);
  const ok = await claim(at, signedIn('uEdge', PHONE));
  assert.equal(ok.json.claimed.length, 1, ok.text);
  assert.equal(ok.json.held, undefined);
  assert.equal(db.read(key).uid, 'uEdge');
});

test('ATTACH-HOLD-2 · the payer exemption is for the CLAIM only: a delivery-path take during the hold is still refused (defence in depth)', async (t) => {
  const db = memoryFirestore();
  const auth = fakeAuth({ users: [{ uid: 'uPayer', phoneNumber: PHONE }] });
  const clock = { t: NOW };
  const { srv } = await autoRoutes({ env: SELF_ENV, db, auth, nowFn: () => clock.t });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const key = `payOrders/${paid.orderId}`;
  assert.equal(db.read(key).status, 'paid_unclaimed');
  assert.equal(db.read(key).selfPay, true);
  assert.equal(db.read(key).selfContactFrom, 'payment');
  // The delivery decides the hold has ended, then the clock is back inside the hold by the time its take runs (a clock race).
  const origTx = db.runTransaction.bind(db);
  let takes = 0;
  db.runTransaction = (fn) => {
    clock.t = NOW + 1000;
    takes += 1;
    return origTx(fn);
  };
  clock.t = NOW + ATTACH_HOLD_MS + 1000;
  await srv.guest.afterRecipientPaid({ orderId: paid.orderId, paymentId: paid.paymentId });
  await srv.idle();
  assert.ok(takes >= 1, 'the delivery reached its take transaction');
  const stored = db.read(key);
  assert.equal(stored.status, 'paid_unclaimed', 'the delivery take is refused inside the hold');
  assert.ok(stored.uid === null || stored.uid === undefined);
  assert.equal(db.docs.has(`subscriptions/uPayer`), false, 'nothing granted');
  // ...while the CLAIM, in the same moment inside the hold, takes it for the payer
  const r = await claim(srv, signedIn('uPayer', PHONE));
  assert.equal(r.json.claimed.length, 1, r.text);
});

test('ATTACH-HOLD-2 · `held` never lists an order that does not match the claimant (H5) nor one whose hold already ended (H6)', async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const key = `payOrders/${paid.orderId}`;
  const { selfContactFrom, ...rest } = db.read(key);
  // a held, NON-payer order (so the payer exemption does not take it) and a claimant who is NOT its contact: no hint (H5)
  db.docs.set(key, { data: { ...rest, guestPhone: '+919811111111' }, version: 50 });
  const during = await startRoutes({ env: SELF_ENV, db, nowMs: NOW + 1000 });
  t.after(during.close);
  const other = await claim(during, signedIn('uNope', PHONE));
  assert.deepEqual(other.json.claimed, []);
  assert.equal(other.json.held, undefined, 'H5: an order not matching the claimant is never in held');
  // H5b: an order this uid already holds (status claimed, retries used up) is never reported as held, even with a future hold
  db.docs.set(key, { data: { ...rest, guestPhone: PHONE, status: 'claimed', uid: 'uMine', claimAttempts: 99 }, version: 52 });
  const mine = await claim(during, signedIn('uMine', PHONE));
  assert.equal(mine.json.held, undefined, 'H5b: only an unclaimed order is ever held');
  // H6: the contact matches but the hold is already over at the moment the claim reads it, and the take is refused for another reason
  db.docs.set(key, { data: { ...rest, guestPhone: PHONE, attachHoldUntil: new Date(NOW - 1) , paymentId: undefined }, version: 51 });
  const over = await startRoutes({ env: SELF_ENV, db, nowMs: NOW + 1000 });
  t.after(over.close);
  const r = await claim(over, signedIn('uLate', PHONE));
  assert.deepEqual(r.json.claimed, []);
  assert.equal(r.json.held, undefined, 'H6: an order whose hold already ended is not in held');
});

test('ATTACH-HOLD-1 · a DIFFERENT phone never takes the order during the hold', async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const r = await claim(srv, signedIn('uOther', '+919811111111'));
  assert.deepEqual(r.json.claimed, []);
  assert.equal(r.json.held, undefined);
  assert.equal(db.read(`payOrders/${paid.orderId}`).status, 'paid_unclaimed');
});

test('ATTACH · after the hold the claim still takes it for the paid-with number', async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const later = await startRoutes({ env: SELF_ENV, db, nowMs: NOW + ATTACH_HOLD_MS + 1000 });
  t.after(later.close);
  const after = await claim(later, signedIn('uPaidWith', PHONE));
  assert.equal(after.json.claimed.length, 1, after.text);
  assert.equal(db.read(`payOrders/${paid.orderId}`).uid, 'uPaidWith');
});

test('ATTACH · a webhook-only payment is held too (no verify): nothing delivered until the choice', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const o = await attachSelf(srv);
  const p = srv.rzp.pay(o.json.orderId, { contact: '+919876543948' });
  await sendWebhook(srv, p);
  await srv.idle();
  assert.deepEqual(auth.created, []);
  assert.equal(srv.db.read(`payOrders/${o.json.orderId}`).status, 'paid_unclaimed');
  assert.ok(srv.db.read(`payOrders/${o.json.orderId}`).attachHoldUntil);
});

test('ATTACH · an order with NO marker behaves exactly as before (delivered at payment, no hold)', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const { orderId } = await paidSelfOrder(srv, { contact: '+919876543948' }, { sku: 'till_boards' });
  await srv.idle();
  const stored = srv.db.read(`payOrders/${orderId}`);
  assert.equal(stored.attachFlow, undefined);
  assert.equal(stored.attachHoldUntil, undefined);
  assert.equal(auth.created.length, 1);
  assert.equal(stored.status, 'paid');
});

test('ATTACH · kill switch CHECKOUT_SELF_ATTACH_DISABLED: marker ignored (today), /attach is 404, "already has" generic again', async (t) => {
  const env = { ...SELF_ENV, CHECKOUT_SELF_ATTACH_DISABLED: '1' };
  const auth = fakeAuth({ users: [{ uid: 'uHas', phoneNumber: OTHER_PHONE }] });
  const db = memoryFirestore();
  await db.collection('subscriptions').doc('uHas').set(COVERED_SUB);
  const { srv } = await autoRoutes({ env, auth, db });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  assert.equal(srv.db.read(`payOrders/${paid.orderId}`).attachFlow, undefined);
  assert.equal(srv.db.read(`payOrders/${paid.orderId}`).status, 'paid', 'delivered at payment, as before');
  assert.equal((await doAttach(srv, paid, { choice: 'me' })).status, 404);
  const r = await whoOrder(srv, { sku: 'till_boards', recipient: { phone: OTHER_PHONE } });
  assert.deepEqual(r.json, { ok: false, error: 'payment_unavailable' });
});


/* ══ PAID-SHOWS-1 (12 Nov 2026): once somebody has paid, show them what they got - POST /api/pay/guest/receipt ═════════ */
const receipt = (srv, paid, extra = {}, headers = {}) =>
  request(srv.port, GUEST_RECEIPT_PATH, { body: { orderId: paid.orderId, paymentId: paid.paymentId, signature: checkoutSig(paid.orderId, paid.paymentId), ...extra }, headers });

test('RECEIPT · a Board Pass paid and still held: the card is answered with the paid-with contact MASKED; nothing changes, no account, hold untouched', async (t) => {
  const { srv, auth } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const before = JSON.stringify(srv.db.read(`payOrders/${paid.orderId}`));
  const r = await receipt(srv, paid);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true, attached: false, savedTo: maskIndianMobile(PHONE), savedToKind: 'phone', item: { kind: 'pass', label: 'Board Pass' } });
  assert.equal(JSON.stringify(r.json).includes('9876543948'), false, 'never the full number');
  await srv.idle();
  assert.equal(JSON.stringify(srv.db.read(`payOrders/${paid.orderId}`)), before, 'the order is byte-identical: not attached, hold not ended');
  assert.deepEqual(auth.created, [], 'no account is made by a receipt');
  assert.equal(subsDocs(srv.db).length, 0, 'nothing granted');
  // asking twice answers twice (a reload)
  assert.deepEqual((await receipt(srv, paid)).json, r.json);
});

test('RECEIPT · a pack: the OwnedPack-shaped record + licensee = the paid-with number masked (and, once attached, the CHOSEN recipient)', async (t) => {
  const { srv } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const paid = await paidAttach(srv, { contact: '+919876543948' }, { sku: 'pack_cbq', target: 'maths' });
  const r = await receipt(srv, paid);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.item.kind, 'pack');
  assert.deepEqual(r.json.pack, { packId: 'pack_cbq:maths', sku: 'pack_cbq', target: 'maths', paidAt: NOW, orderId: paid.orderId });
  assert.deepEqual(r.json.licensee, { name: '', email: '', phone: maskIndianMobile(PHONE) });
  assert.equal(r.json.savedTo, maskIndianMobile(PHONE));
  assert.equal(r.json.attached, false, 'the card says the number is the paid-with one until a choice is made');
  // the payer then chooses someone else: the licence line follows the recipient, never the payer's contact
  const a = await doAttach(srv, paid, { choice: 'other', recipient: { email: 'Anaya.K@Gmail.com' } });
  assert.equal(a.status, 200, a.text);
  await srv.idle();
  const after = await receipt(srv, paid);
  assert.equal(after.status, 200, after.text);
  assert.deepEqual(after.json.licensee, { name: '', email: 'an••••@gmail.com' });
  assert.equal(after.json.savedToKind, 'email');
  assert.equal(after.json.attached, true);
  const text = JSON.stringify(after.json);
  assert.equal(text.includes('9876543948'), false);
  assert.equal(text.includes('Anaya.K'), false);
});

test('RECEIPT · refused: bad signature, wrong paymentId, another order\'s id, an unpaid order, a signed-in caller, malformed', async (t) => {
  const { srv } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const other = await paidAttach(srv, { contact: '+917012345678' });
  assert.equal((await receipt(srv, paid, { signature: 'ab'.repeat(32) })).status, 400, 'bad signature');
  const wrongPay = await request(srv.port, GUEST_RECEIPT_PATH, { body: { orderId: paid.orderId, paymentId: 'pay_other', signature: checkoutSig(paid.orderId, 'pay_other') } });
  assert.equal(wrongPay.status, 400, 'a payment id that is not this order\'s');
  // order B's id with order A's (valid for A) proof: the signature does not cover that pair
  const crossed = await request(srv.port, GUEST_RECEIPT_PATH, { body: { orderId: other.orderId, paymentId: paid.paymentId, signature: checkoutSig(paid.orderId, paid.paymentId) } });
  assert.equal(crossed.status, 400, 'another order\'s id');
  // a correct signature for the pair, but the order was never paid (still `created`)
  const o = await attachSelf(srv);
  const fakePay = 'pay_neverpaid1';
  const unpaid = await request(srv.port, GUEST_RECEIPT_PATH, { body: { orderId: o.json.orderId, paymentId: fakePay, signature: checkoutSig(o.json.orderId, fakePay) } });
  assert.equal(unpaid.status, 400, 'unpaid: no payment is recorded against it');
  assert.equal((await receipt(srv, paid, {}, signedIn('uX', PHONE))).status, 409, 'signed in');
  assert.equal((await receipt(srv, paid, { orderId: 'bad id!' })).status, 400, 'malformed');
  for (const r of [wrongPay, crossed, unpaid]) assert.equal(JSON.stringify(r.json).includes('Board Pass'), false, 'a refusal says nothing about the purchase');
});

test('RECEIPT · the 24 h window: open at +23:59:59.999 from the payment time, refused (ok:false, expired) at +24:00:00 with the masked contact', async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const inside = await startRoutes({ env: SELF_ENV, db, nowMs: NOW + RECEIPT_WINDOW_MS - 1 });
  t.after(inside.close);
  assert.equal((await receipt(inside, paid)).json.ok, true);
  const edge = await startRoutes({ env: SELF_ENV, db, nowMs: NOW + RECEIPT_WINDOW_MS });
  t.after(edge.close);
  const r = await receipt(edge, paid);
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: false, reason: 'expired', savedTo: maskIndianMobile(PHONE), savedToKind: 'phone' });
});

test('RECEIPT · dark with the payment switches off; no Razorpay call is made (the proof is the signature + the stored order)', async (t) => {
  const off = await startRoutes({ env: { ...ENV_ON, PAYMENTS_ENABLED: '' } });
  t.after(off.close);
  const r = await request(off.port, GUEST_RECEIPT_PATH, { body: { orderId: 'order_x', paymentId: 'pay_x', signature: checkoutSig('order_x', 'pay_x') } });
  assert.equal(r.status, 404);
});

test('RECEIPT · a someone-else order (no attach flow) is NOT "pending": attached:true, licence = the recipient masked', async (t) => {
  const { srv } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const paid = await paidWhoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { phone: OTHER_PHONE } });
  const orderId = paid.orderId || paid.json?.orderId;
  const paymentId = paid.paymentId;
  assert.ok(orderId && paymentId, JSON.stringify(Object.keys(paid)));
  const r = await receipt(srv, { orderId, paymentId });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.attached, true, 'the recipient is already named: the card must not say "choose someone else below"');
  assert.deepEqual(r.json.licensee, { name: '', email: '', phone: maskIndianMobile(OTHER_PHONE) });
});

test('RECEIPT · the not_paid guard: an order that has a paymentId but is still `created` is refused (409), not answered', async (t) => {
  const { srv } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const o = await attachSelf(srv);
  const pid = 'pay_neverpaid2';
  await srv.db.collection('payOrders').doc(o.json.orderId).set({ paymentId: pid }, { merge: true });
  const r = await request(srv.port, GUEST_RECEIPT_PATH, { body: { orderId: o.json.orderId, paymentId: pid, signature: checkoutSig(o.json.orderId, pid) } });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.reason, 'not_paid');
});

/* ══ RECEIPT-EMAIL-1 · B3: the receipt after a pay-first grant, REAL emailer wired ═══════════════════════════════
 * Each path must (a) still answer a SUCCESSFUL claim with no claimError, and (b) send exactly one receipt. */
function receiptRig({ clock = { t: NOW }, db = memoryFirestore() } = {}) {
  const resend = resendRecorder();
  const receiptEmailer = createPaymentReceiptEmailer({
    env: EMAIL_ENV,
    adminFirestore: db,
    fetchImpl: resend.fetchImpl,
    now: () => clock.t,
    getAuthUser: async () => ({ email: '', phoneNumber: PHONE, providerIds: ['phone'] }),
    fetchPayment: async () => ({ email: 'buyer@example.com' }),
  });
  return { db, resend, receiptEmailer, clock };
}
const noClaimError = (db, orderId) => assert.equal(db.read(`payOrders/${orderId}`).claimError, undefined);

test('RECEIPT · plain pay-first claim: claimed 1, no claimError, ONE receipt (the payer address read from the Razorpay record)', async (t) => {
  const { db, resend, receiptEmailer } = receiptRig();
  const srv = await startRoutes({ db, receiptEmailer });
  t.after(srv.close);
  const paid = await paidGuestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE }); // no email in hand: read from the Razorpay record
  await receiptEmailer.whenIdle();
  assert.equal(resend.sent.length, 1, 'the capture-time receipt');
  const c = await claim(srv, signedIn('u1', PHONE));
  assert.equal(c.json.claimed.length, 1, c.text);
  assert.equal(c.json.failed, undefined);
  noClaimError(db, paid.orderId);
  await receiptEmailer.whenIdle();
  assert.deepEqual(resend.sent.map((m) => m.body.to[0]), ['buyer@example.com'], 'the claim hook adds nothing: one receipt per order');
  assert.match(resend.sent[0].body.text, /your pack is in My packs/);
});

test('RECEIPT · attach "me": the attach succeeds, no claimError, ONE receipt naming the account', async (t) => {
  const { db, resend, receiptEmailer } = receiptRig();
  const { srv } = await autoRoutes({ env: SELF_ENV, db, receiptEmailer });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  await receiptEmailer.whenIdle();
  assert.equal(resend.sent.length, 0, 'held: nothing before the choice');
  const r = await doAttach(srv, paid, { choice: 'me' });
  assert.equal(r.json.ok, true, r.text);
  await srv.idle();
  await receiptEmailer.whenIdle();
  noClaimError(db, paid.orderId);
  assert.equal(db.read(`payOrders/${paid.orderId}`).status, 'paid');
  assert.deepEqual(resend.sent.map((m) => m.body.to[0]), ['buyer@example.com']);
});

test('RECEIPT · attach "other": the attach succeeds, no claimError, ONE receipt to the payer', async (t) => {
  const { db, resend, receiptEmailer } = receiptRig();
  const { srv } = await autoRoutes({ env: SELF_ENV, db, receiptEmailer });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const r = await doAttach(srv, paid, { choice: 'other', recipient: { phone: OTHER_PHONE } });
  assert.equal(r.json.ok, true, r.text);
  await srv.idle();
  await receiptEmailer.whenIdle();
  noClaimError(db, paid.orderId);
  assert.equal(resend.sent.length, 1);
  assert.equal(resend.sent[0].body.to[0], 'buyer@example.com');
});

test('RECEIPT · 10-minute fallback (nobody chose): the claim takes it, claimed 1, no claimError, ONE receipt', async (t) => {
  const clock = { t: NOW };
  const { db, resend, receiptEmailer } = receiptRig({ clock });
  const { srv } = await autoRoutes({ env: SELF_ENV, db, receiptEmailer });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  await receiptEmailer.whenIdle();
  assert.equal(resend.sent.length, 0);
  clock.t = NOW + ATTACH_HOLD_MS + 1000;
  const later = await startRoutes({ env: SELF_ENV, db, nowMs: clock.t, receiptEmailer });
  t.after(later.close);
  const c = await claim(later, signedIn('uPaidWith', PHONE));
  assert.equal(c.json.claimed.length, 1, c.text);
  noClaimError(db, paid.orderId);
  await receiptEmailer.whenIdle();
  assert.equal(resend.sent.length, 1);
  assert.equal(resend.sent[0].body.to[0], 'buyer@example.com');
});

test('RECEIPT · a THROWING or REJECTING emailer can never change the grant: claimed 1, no claimError', async (t) => {
  for (const boom of [() => { throw new Error('boom'); }, () => { const p = Promise.reject(new Error('boom')); p.catch(() => null); return p; }]) {
    const db = memoryFirestore();
    const srv = await startRoutes({ db, receiptEmailer: { sendForPayment: boom } });
    t.after(srv.close);
    const paid = await paidGuestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
    const c = await claim(srv, signedIn('u1', PHONE));
    assert.equal(c.json.claimed.length, 1, c.text);
    noClaimError(db, paid.orderId);
    assert.equal(db.read(`payOrders/${paid.orderId}`).status, 'paid');
    assert.ok(db.read(`payOrders/${paid.orderId}`).uid);
  }
});

/* ── WHATSAPP-OPTIN-1: the signed-out SELF order stores `waOptIn` only for a valid number + explicit tick ──
 * MUTATIONS: M1 guestPay.cjs handleSelfOrder drops the orderOptInField spread -> "valid + ticked" red;
 *            M2 it stores without checking `consent === true` -> "unticked" red.
 */
test('WA-OPTIN · self order: valid + ticked -> stored on the order; the claim contact (guestPhone) is NOT set from it', async (t) => {
  const { srv } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  const o = await selfOrder(srv, { sku: 'pack_cbq', target: 'maths', waOptIn: { phone: '98765 43948', consent: true } });
  assert.equal(o.status, 200, o.text);
  const stored = srv.db.read(`payOrders/${o.json.orderId}`);
  assert.deepEqual(stored.waOptIn, { phone: '+919876543948', consentText: 'Send me updates on WhatsApp', consentVersion: 'wa-optin-v1', consentAt: NOW, source: 'checkout' });
  assert.equal(stored.guestPhone, undefined, 'the WhatsApp number is never the account claim key');
  assert.equal(JSON.stringify(srv.rzp.orders.get(o.json.orderId).notes).includes('9876543948'), false);
});

test('WA-OPTIN · self order: unticked / invalid -> nothing stored, order still created', async (t) => {
  const { srv } = await autoRoutes({ env: SELF_ENV });
  t.after(srv.close);
  for (const waOptIn of [{ phone: '9876543948' }, { phone: '9876543948', consent: false }, { phone: '1234', consent: true }]) {
    const o = await selfOrder(srv, { sku: 'pack_cbq', target: 'maths', waOptIn });
    assert.equal(o.status, 200, o.text);
    assert.equal(srv.db.read(`payOrders/${o.json.orderId}`).waOptIn, undefined, JSON.stringify(waOptIn));
  }
});

/* ── WHATSAPP-OPTIN-1 review: the opt-in also rides the pay-by-phone and "someone else" guest orders ──
 * MUTATIONS: M1 drop the spread in the phone order / the recipient order -> the matching test below goes red;
 *            M2 read consentText from the body (services/waOptIn.cjs buildOrderOptIn) -> "attacker consentText" red.
 */
test('WA-OPTIN · pay-by-phone guest order: valid + ticked stored (the claim phone stays the typed order phone); unticked -> nothing', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'till_boards', phone: PHONE, waOptIn: { phone: '9123456780', consent: true } });
  assert.equal(o.status, 200, o.text);
  const stored = srv.db.read(`payOrders/${o.json.orderId}`);
  assert.equal(stored.waOptIn.phone, '+919123456780');
  assert.equal(stored.waOptIn.source, 'checkout');
  assert.ok(stored.guestPhone && stored.guestPhone !== stored.waOptIn.phone, 'the order phone is the typed claim phone, not the WhatsApp number');
  const n = await guestOrder(srv, { sku: 'till_boards', phone: PHONE, waOptIn: { phone: '9123456780' } });
  assert.equal(srv.db.read(`payOrders/${n.json.orderId}`).waOptIn, undefined);
});

test('WA-OPTIN · "someone else" recipient order: the PAYER\'s ticked number is stored beside (never as) the recipient; unticked -> nothing', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV });
  t.after(srv.close);
  const o = await whoOrder(srv, { sku: 'till_boards', recipient: { email: EMAIL }, waOptIn: { phone: '+91 91234 56780', consent: true } });
  assert.equal(o.status, 200, o.text);
  const stored = srv.db.read(`payOrders/${o.json.orderId}`);
  assert.equal(stored.waOptIn.phone, '+919123456780');
  assert.equal(stored.guestEmail, EMAIL.toLowerCase());
  assert.equal(stored.guestPhone, undefined, 'the WhatsApp number is not the recipient\'s claim key');
  const n = await whoOrder(srv, { sku: 'till_boards', recipient: { email: EMAIL }, waOptIn: { phone: '9123456780', consent: false } });
  assert.equal(srv.db.read(`payOrders/${n.json.orderId}`).waOptIn, undefined);
});

test('WA-OPTIN · an attacker-supplied consentText / consentVersion / source in the body is ignored on every order path: the stored text is the server constant', async (t) => {
  const srv = await startRoutes({ env: { ...WHO_ENV, GUEST_PAY_ENABLED: '1' } });
  t.after(srv.close);
  const evil = { phone: '9123456780', consent: true, consentText: 'I agree to anything', consentVersion: 'evil', source: 'admin', consentAt: 1 };
  const self = await request(srv.port, GUEST_ORDER_PATH, { body: { self: true, sku: 'till_boards', waOptIn: evil } });
  const who = await whoOrder(srv, { sku: 'till_boards', recipient: { email: EMAIL }, waOptIn: evil });
  const phone = await guestOrder(srv, { sku: 'till_boards', phone: PHONE, waOptIn: evil });
  for (const r of [self, who, phone]) {
    assert.equal(r.status, 200, r.text);
    const w = srv.db.read(`payOrders/${r.json.orderId}`).waOptIn;
    assert.equal(w.consentText, 'Send me updates on WhatsApp');
    assert.equal(w.consentVersion, 'wa-optin-v1');
    assert.equal(w.source, 'checkout');
    assert.notEqual(w.consentAt, 1);
  }
});


/* ══ GST-AFTER-PAY-1 (13 Nov 2026): the payer's state + PIN AFTER paying - POST /api/pay/guest/gst-details ═══════════ */
/** A stand-in for the invoicer's `issueNow`: it issues ONLY when the stored order has a complete gstBuyer (as the real one holds `no_state`/`no_pin`), once per order. */
const GST_ENV = { ...SELF_ENV, GST_INVOICE_ENABLED: '1' };
function fakeInvoicer(db) {
  const calls = [];
  return {
    calls,
    async issueNow({ orderId }) {
      calls.push(orderId);
      const o = db.read(`payOrders/${orderId}`);
      if (o.gstInvoice) return { issued: false, existing: o.gstInvoice.number };
      if (!o.gstBuyer || !o.gstBuyer.stateCode) return { held: 'no_state' };
      if (!o.gstBuyer.pin) return { held: 'no_pin' };
      await db.collection('payOrders').doc(orderId).set({ gstInvoice: { number: `LT/26-27/00000${calls.length}` } }, { merge: true });
      return { issued: true, number: `LT/26-27/00000${calls.length}` };
    },
  };
}
const gstDetails = (srv, paid, extra = {}, headers = {}) =>
  request(srv.port, GUEST_GST_DETAILS_PATH, { body: { orderId: paid.orderId, paymentId: paid.paymentId, signature: checkoutSig(paid.orderId, paid.paymentId), stateCode: '29', pin: '560001', ...extra }, headers });
async function gstRoutes(t, over = {}) {
  const db = memoryFirestore();
  const invoicer = fakeInvoicer(db);
  const queued = [];
  const receiptEmailer = { queueInvoiceEmail: async (x) => { queued.push(x.orderId); return { sent: true }; } };
  const { srv } = await autoRoutes({ env: GST_ENV, db, invoicer, receiptEmailer, ...over });
  t.after(srv.close);
  return { srv, db, invoicer, queued };
}

test('GST-AFTER-PAY · a valid state + PIN after paying is stored on the order, the invoice is issued once and its email queued; grant / attach untouched', async (t) => {
  const { srv, invoicer, queued } = await gstRoutes(t);
  const paid = await paidAttach(srv);
  const before = srv.db.read(`payOrders/${paid.orderId}`);
  const r = await gstDetails(srv, paid);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true, status: 'invoiced' });
  const after = srv.db.read(`payOrders/${paid.orderId}`);
  assert.deepEqual(after.gstBuyer, { stateCode: '29', pin: '560001' });
  assert.ok(after.gstInvoice);
  for (const k of ['status', 'attachFlow', 'attachHoldUntil', 'uid', 'paymentId', 'guestPhone']) assert.deepEqual(after[k], before[k], `${k} unchanged`);
  assert.deepEqual(queued, [paid.orderId]);
  // idempotent: asking again changes nothing and issues nothing new
  const again = await gstDetails(srv, paid, { stateCode: '27', pin: '400001' });
  assert.equal(again.status, 200);
  assert.deepEqual(again.json, { ok: true, status: 'invoiced' });
  assert.deepEqual(srv.db.read(`payOrders/${paid.orderId}`).gstBuyer, { stateCode: '29', pin: '560001' }, 'an issued invoice is never changed');
  assert.equal(invoicer.calls.length, 1);
  assert.deepEqual(queued, [paid.orderId], 'the email is queued once');
});

test('GST-AFTER-PAY · bad signature, another payment id, or an unpaid order: refused, nothing written', async (t) => {
  const { srv, invoicer } = await gstRoutes(t);
  const paid = await paidAttach(srv);
  const badSig = await request(srv.port, GUEST_GST_DETAILS_PATH, { body: { orderId: paid.orderId, paymentId: paid.paymentId, signature: 'ab'.repeat(32), stateCode: '29', pin: '560001' } });
  assert.equal(badSig.status, 400);
  const wrongPay = await request(srv.port, GUEST_GST_DETAILS_PATH, { body: { orderId: paid.orderId, paymentId: 'pay_other', signature: checkoutSig(paid.orderId, 'pay_other'), stateCode: '29', pin: '560001' } });
  assert.equal(wrongPay.status, 400);
  const unpaidOrder = await attachSelf(srv, {});
  const fake = { orderId: unpaidOrder.json.orderId, paymentId: 'pay_x' };
  const unpaid = await gstDetails(srv, fake);
  assert.equal(unpaid.status, 409, 'signed by Razorpay but not recorded yet: not_paid (the page retries); nothing written');
  assert.equal(unpaid.json.reason, 'not_paid');
  assert.equal(srv.db.read(`payOrders/${paid.orderId}`).gstBuyer, undefined);
  assert.equal(srv.db.read(`payOrders/${unpaidOrder.json.orderId}`).gstBuyer, undefined);
  assert.equal(invoicer.calls.length, 0);
  // a signed-in caller is refused (the guest proof is signed-out only)
  const si = await gstDetails(srv, paid, {}, signedIn('u1'));
  assert.equal(si.status, 409);
  assert.equal(srv.db.read(`payOrders/${paid.orderId}`).gstBuyer, undefined);
});

test('GST-AFTER-PAY · the 24 h window: open at +23:59:59.999, refused (ok:false, expired) at +24:00:00; nothing written', async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: GST_ENV, db });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const inv = fakeInvoicer(db);
  const inside = await startRoutes({ env: GST_ENV, db, invoicer: inv, nowMs: NOW + RECEIPT_WINDOW_MS - 1 });
  t.after(inside.close);
  assert.equal((await gstDetails(inside, paid)).json.ok, true);
  const db2 = memoryFirestore();
  const { srv: s2 } = await autoRoutes({ env: GST_ENV, db: db2 });
  t.after(s2.close);
  const paid2 = await paidAttach(s2);
  const edge = await startRoutes({ env: GST_ENV, db: db2, invoicer: fakeInvoicer(db2), nowMs: NOW + RECEIPT_WINDOW_MS });
  t.after(edge.close);
  const r = await gstDetails(edge, paid2);
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: false, reason: 'expired' });
  assert.equal(db2.read(`payOrders/${paid2.orderId}`).gstBuyer, undefined);
});

test('GST-AFTER-PAY · a bad state or PIN is a 400 naming the field and writes nothing; no state given at all leaves the order HELD (no invoice)', async (t) => {
  const { srv, invoicer } = await gstRoutes(t);
  const paid = await paidAttach(srv);
  const badPin = await gstDetails(srv, paid, { pin: '12345' });
  assert.equal(badPin.status, 400);
  assert.deepEqual(badPin.json, { ok: false, error: 'bad_input', field: 'pin' });
  const noPin = await gstDetails(srv, paid, { pin: '' });
  assert.equal(noPin.json.field, 'pin');
  const badState = await gstDetails(srv, paid, { stateCode: '99' });
  assert.deepEqual(badState.json, { ok: false, error: 'bad_input', field: 'state' });
  const badBiz = await gstDetails(srv, paid, { business: { gstin: 'NOTAGSTIN', legalName: 'X', address: 'Y' } });
  assert.equal(badBiz.json.field, 'business');
  const o = srv.db.read(`payOrders/${paid.orderId}`);
  assert.equal(o.gstBuyer, undefined);
  assert.equal(o.gstInvoice, undefined, 'skipped / refused = no invoice: the order stays held, as before');
  assert.equal(invoicer.calls.length, 0);
});

test('GST-AFTER-PAY · invoicing held (e.g. seller config missing): the details are saved, status details_saved, no invoice, no email', async (t) => {
  const db = memoryFirestore();
  const queued = [];
  const heldInvoicer = { async issueNow() { return { held: 'seller_config_missing' }; } };
  const { srv } = await autoRoutes({ env: GST_ENV, db, invoicer: heldInvoicer, receiptEmailer: { queueInvoiceEmail: async (x) => queued.push(x) } });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const r = await gstDetails(srv, paid);
  assert.deepEqual(r.json, { ok: true, status: 'details_saved' });
  assert.deepEqual(srv.db.read(`payOrders/${paid.orderId}`).gstBuyer, { stateCode: '29', pin: '560001' });
  assert.deepEqual(queued, []);
});

test('GST-AFTER-PAY · invoicing off is 404 and writes nothing; a valid signature on a NON-guest order is refused; a flood of calls is rate limited', async (t) => {
  // invoicing switch off (GST_INVOICE_ENABLED unset): dark, nothing read or written
  const off = await autoRoutes({ env: SELF_ENV });
  t.after(off.srv.close);
  const paidOff = await paidAttach(off.srv);
  assert.equal((await gstDetails(off.srv, paidOff)).status, 404);
  assert.equal(off.srv.db.read(`payOrders/${paidOff.orderId}`).gstBuyer, undefined);

  const { srv, invoicer } = await gstRoutes(t);
  // a signed-in payer's order (payer not 'guest') with a VALID checkout signature is refused; nothing written
  await srv.db.collection('payOrders').doc('order_NG').set({ status: 'paid', paymentId: 'pay_NG', payer: 'student', uid: 'u1', passType: 'till_boards', amountPaise: 191700, paidAt: new Date(NOW), createdAt: new Date(NOW) });
  const ng = await request(srv.port, GUEST_GST_DETAILS_PATH, { body: { orderId: 'order_NG', paymentId: 'pay_NG', signature: checkoutSig('order_NG', 'pay_NG'), stateCode: '29', pin: '560001' } });
  assert.notEqual(ng.status, 200);
  assert.equal(srv.db.read('payOrders/order_NG').gstBuyer, undefined);
  assert.equal(invoicer.calls.length, 0);

  // the per-client limiter counts this route
  let limited = 0;
  for (let i = 0; i < 130; i += 1) {
    const r = await request(srv.port, GUEST_GST_DETAILS_PATH, { body: { orderId: 'bad', paymentId: 'bad', signature: 'zz' }, headers: { 'X-Forwarded-For': '203.0.113.77' } });
    if (r.status === 429) limited += 1;
  }
  assert.ok(limited > 0);
});

/* ══ GUEST-ZIP-1 (13 Nov 2026): one ZIP of the whole pack for a signed-out buyer - POST /api/pay/guest/zip-link ═════════════════ */
function fakePackPdf() {
  const calls = [];
  const recorded = [];
  return {
    calls,
    recorded,
    async zipLink(args) {
      calls.push(args);
      return { url: 'https://storage.example/z.zip', expiresAtMs: NOW + 900000, filename: 'lazytopper-pack-cbq-maths.zip', files: [{ fileId: 'f1', filename: 'a.pdf', label: 'A', codes: ['C1'] }], papers: [] };
    },
    async recordDownloads(uid, n) { recorded.push([uid, n]); },
  };
}
const zipLink = (srv, paid, extra = {}, headers = {}) =>
  request(srv.port, GUEST_ZIP_LINK_PATH, { body: { orderId: paid.orderId, paymentId: paid.paymentId, signature: checkoutSig(paid.orderId, paid.paymentId), ...extra }, headers });
async function zipRoutes(t, over = {}) {
  const packPdf = fakePackPdf();
  const { srv } = await autoRoutes({ env: SELF_ENV, packPdf, ...over });
  t.after(srv.close);
  return { srv, packPdf };
}

test('GUEST-ZIP · a valid guest proof gets ONE whole-pack ZIP link; owned + masked licensee are rebuilt from the ORDER, stamped under guest_<orderId>, nothing recorded', async (t) => {
  const { srv, packPdf } = await zipRoutes(t);
  const paid = await paidAttach(srv, { contact: '+919876543948' }, { sku: 'pack_cbq', target: 'maths' });
  // a hostile body cannot choose the pack, the group or the licensee
  const r = await zipLink(srv, paid, { packId: 'pack_bundle:all', group: 'x', uid: 'u9', licensee: { name: 'Evil' } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.url, 'https://storage.example/z.zip');
  assert.equal(packPdf.calls.length, 1);
  const a = packPdf.calls[0];
  assert.equal(a.uid, `guest_${paid.orderId}`);
  assert.equal(a.packId, 'pack_cbq:maths');
  assert.equal(a.groupId, '__all__');
  assert.deepEqual(a.buyer, { name: '', contact: maskIndianMobile(PHONE) });
  assert.equal(a.boardPass, null);
  assert.deepEqual(a.owned, [{ packId: 'pack_cbq:maths', sku: 'pack_cbq', target: 'maths', pricePaidInr: 0, paidAt: NOW, orderId: paid.orderId }]);
  assert.equal(JSON.stringify(a).includes('9876543948'), false, 'never the full number');
  assert.deepEqual(packPdf.recorded, [], 'no download event: there is no uid to record it against');
});

test('GUEST-ZIP · a wrong signature, another payment id, an unpaid order, a signed-in caller, a Board Pass order: refused, no ZIP made', async (t) => {
  const { srv, packPdf } = await zipRoutes(t);
  const paid = await paidAttach(srv, { contact: '+919876543948' }, { sku: 'pack_cbq', target: 'maths' });
  const bad = await request(srv.port, GUEST_ZIP_LINK_PATH, { body: { orderId: paid.orderId, paymentId: paid.paymentId, signature: 'ab'.repeat(32) } });
  assert.equal(bad.status, 400);
  const other = await request(srv.port, GUEST_ZIP_LINK_PATH, { body: { orderId: paid.orderId, paymentId: 'pay_other', signature: checkoutSig(paid.orderId, 'pay_other') } });
  assert.equal(other.status, 400);
  const unpaidOrder = await attachSelf(srv, { sku: 'pack_cbq', target: 'maths' });
  assert.equal((await zipLink(srv, { orderId: unpaidOrder.json.orderId, paymentId: 'pay_x' })).status, 400);
  assert.equal((await zipLink(srv, paid, {}, signedIn('u1'))).status, 409);
  const pass = await paidAttach(srv);
  assert.equal((await zipLink(srv, pass)).status, 400, 'a Board Pass order has no pack to zip');
  assert.equal(packPdf.calls.length, 0);
});

test('GUEST-ZIP · the 24 h window: open at +23:59:59.999, refused (403 expired) at +24:00:00', async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidAttach(srv, { contact: '+919876543948' }, { sku: 'pack_cbq', target: 'maths' });
  const p1 = fakePackPdf();
  const inside = await startRoutes({ env: SELF_ENV, db, packPdf: p1, nowMs: NOW + RECEIPT_WINDOW_MS - 1 });
  t.after(inside.close);
  assert.equal((await zipLink(inside, paid)).status, 200);
  const p2 = fakePackPdf();
  const edge = await startRoutes({ env: SELF_ENV, db, packPdf: p2, nowMs: NOW + RECEIPT_WINDOW_MS });
  t.after(edge.close);
  const r = await zipLink(edge, paid);
  assert.equal(r.status, 403);
  assert.deepEqual(r.json, { ok: false, error: 'expired' });
  assert.equal(p2.calls.length, 0);
});

test('GUEST-ZIP · no PDF service, or the kill switch PACK_SERVER_PDF_DISABLED: 404, nothing made', async (t) => {
  const none = await autoRoutes({ env: SELF_ENV });
  t.after(none.srv.close);
  const paid = await paidAttach(none.srv, { contact: '+919876543948' }, { sku: 'pack_cbq', target: 'maths' });
  assert.equal((await zipLink(none.srv, paid)).status, 404);
  const packPdf = fakePackPdf();
  const off = await autoRoutes({ env: { ...SELF_ENV, PACK_SERVER_PDF_DISABLED: '1' }, packPdf });
  t.after(off.srv.close);
  const paid2 = await paidAttach(off.srv, { contact: '+919876543948' }, { sku: 'pack_cbq', target: 'maths' });
  assert.equal((await zipLink(off.srv, paid2)).status, 404);
  assert.equal(packPdf.calls.length, 0);
});

test('GUEST-ZIP · guards pinned: flags off 404; a flood is rate limited; another payer type, an unpaid status and a missing contact are refused', async (t) => {
  // flags off: the route is dark (404), nothing made
  const off = await startRoutes({ env: {}, packPdf: fakePackPdf() });
  t.after(off.close);
  assert.equal((await request(off.port, GUEST_ZIP_LINK_PATH, { body: { orderId: 'order_x', paymentId: 'pay_x', signature: 'ab'.repeat(32) } })).status, 404);

  const { srv, packPdf } = await zipRoutes(t);
  const paid = await paidAttach(srv, { contact: '+919876543948' }, { sku: 'pack_cbq', target: 'maths' });
  const doc = () => srv.db.collection('payOrders').doc(paid.orderId);

  // no_contact: neither a phone nor an email on the order
  await doc().set({ guestPhone: '', guestEmail: '' }, { merge: true });
  const nc = await zipLink(srv, paid);
  assert.equal(nc.status, 400);
  await doc().set({ guestPhone: PHONE }, { merge: true });

  // status not paid, though the payment id is present
  await doc().set({ status: 'created' }, { merge: true });
  assert.equal((await zipLink(srv, paid)).status, 409);
  await doc().set({ status: 'paid_unclaimed' }, { merge: true });

  // a VALID checkout signature on a NON-guest (signed-in payer's) order is refused
  await srv.db.collection('payOrders').doc('order_NG').set({ status: 'paid', paymentId: 'pay_NG', payer: 'student', uid: 'u1', passType: 'pack_cbq', packTarget: 'maths', paidAt: new Date(NOW), amountPaise: 19900 });
  const ng = await request(srv.port, GUEST_ZIP_LINK_PATH, { body: { orderId: 'order_NG', paymentId: 'pay_NG', signature: checkoutSig('order_NG', 'pay_NG') } });
  assert.equal(ng.status, 400);
  assert.equal(packPdf.calls.length, 0);

  // the per-order hourly cap: the 31st call inside the hour is refused (429), the ZIP is not built again
  for (let i = 0; i < 30; i += 1) assert.equal((await zipLink(srv, paid)).status, 200);
  const capped = await zipLink(srv, paid);
  assert.equal(capped.status, 429);
  assert.equal(packPdf.calls.length, 30);
});

test('GUEST-ZIP · the per-client limiter counts this route (a flood of calls gets 429)', async (t) => {
  const { srv } = await zipRoutes(t);
  let limited = 0;
  for (let i = 0; i < 130; i += 1) {
    const r = await request(srv.port, GUEST_ZIP_LINK_PATH, { body: { orderId: 'bad', paymentId: 'bad', signature: 'zz' }, headers: { 'X-Forwarded-For': '203.0.113.9' } });
    if (r.status === 429) limited += 1;
  }
  assert.ok(limited > 0, 'the 120/day per-client limit applies to the zip-link path');
});

/* ══ GST-PARENT-POSTPAY-1: a parent-pay link order saves its state + PIN after paying (the same route, the stored payer decides) ══ */
const PARENT_ENV = { PAYMENTS_ENABLED: '1', PARENT_PAY_ENABLED: '1', GST_INVOICE_ENABLED: '1', RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET };
const parentOrder = (over = {}) => ({ uid: 'kid1', payer: 'parent', parentLinkId: 'lnk1', passType: 'till_boards', amountPaise: 191700, status: 'paid', paymentId: 'pay_PAR', createdAt: new Date(NOW), paidAt: new Date(NOW), ...over });
async function parentGst(t, orders = {}, over = {}) {
  const db = memoryFirestore({ 'payOrders/order_PAR': parentOrder(), ...Object.fromEntries(Object.entries(orders).map(([k, v]) => [`payOrders/${k}`, v])) });
  const invoicer = fakeInvoicer(db);
  const queued = [];
  const srv = await startRoutes({ env: PARENT_ENV, db, invoicer, receiptEmailer: { queueInvoiceEmail: async (x) => { queued.push(x.orderId); return { sent: true }; } }, ...over });
  t.after(srv.close);
  return { srv, db, invoicer, queued };
}
const parentSave = (srv, orderId, paymentId, extra = {}, headers = {}, sigFor = [orderId, paymentId]) =>
  request(srv.port, GUEST_GST_DETAILS_PATH, { body: { orderId, paymentId, signature: checkoutSig(sigFor[0], sigFor[1]), stateCode: '29', pin: '560001', ...extra }, headers });

test('GST-PARENT-POSTPAY · a parent-pay order saves: state + PIN stored on the order, ONE invoice issued, its email queued; works with ONLY the parent-pay switch on', async (t) => {
  const { srv, db, invoicer, queued } = await parentGst(t);
  const r = await parentSave(srv, 'order_PAR', 'pay_PAR');
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true, status: 'invoiced' });
  assert.deepEqual(db.read('payOrders/order_PAR').gstBuyer, { stateCode: '29', pin: '560001' });
  assert.deepEqual(invoicer.calls, ['order_PAR']);
  assert.deepEqual(queued, ['order_PAR']);
  // the parent may be signed in as themselves: still accepted (only a GUEST proof is signed-out only)
  const again = await parentSave(srv, 'order_PAR', 'pay_PAR', { stateCode: '27', pin: '411001' }, signedIn('uParent'));
  assert.equal(again.status, 200);
  assert.equal(db.read('payOrders/order_PAR').gstBuyer.stateCode, '29', 'an invoiced order is never changed');
  assert.equal(invoicer.calls.length, 1);
});

test('GST-PARENT-POSTPAY · refused, nothing written: wrong signature, another payment id, a signature for ANOTHER order, a non-parent/non-guest payer, a parent order with no link', async (t) => {
  const { srv, db, invoicer } = await parentGst(t, {
    order_OTH: parentOrder({ paymentId: 'pay_OTH' }),
    order_STU: parentOrder({ payer: 'student', paymentId: 'pay_STU' }),
    order_NOL: parentOrder({ parentLinkId: undefined, paymentId: 'pay_NOL' }),
  });
  assert.equal((await request(srv.port, GUEST_GST_DETAILS_PATH, { body: { orderId: 'order_PAR', paymentId: 'pay_PAR', signature: 'ab'.repeat(32), stateCode: '29', pin: '560001' } })).status, 400);
  assert.equal((await parentSave(srv, 'order_PAR', 'pay_other')).status, 400);
  // a valid signature for order_OTH can never write order_PAR (the HMAC binds the order id AND the payment id)
  assert.equal((await parentSave(srv, 'order_PAR', 'pay_PAR', {}, {}, ['order_OTH', 'pay_OTH'])).status, 400);
  assert.equal((await parentSave(srv, 'order_PAR', 'pay_OTH')).status, 400);
  for (const id of ['order_STU', 'order_NOL']) {
    const r = await parentSave(srv, id, `pay_${id.slice(6)}`);
    assert.equal(r.status, 400, id);
    assert.equal(db.read(`payOrders/${id}`).gstBuyer, undefined, id);
  }
  assert.equal(db.read('payOrders/order_PAR').gstBuyer, undefined);
  assert.equal(invoicer.calls.length, 0);
});

test('GST-PARENT-POSTPAY · the 24 h window: open at +23:59:59.999, refused (ok:false, expired) at +24:00:00; and a signed-but-unrecorded payment is 409 not_paid', async (t) => {
  const db = memoryFirestore({ 'payOrders/order_PAR': parentOrder(), 'payOrders/order_NEW': parentOrder({ status: 'created', paymentId: undefined }) });
  const inside = await startRoutes({ env: PARENT_ENV, db, invoicer: fakeInvoicer(db), nowMs: NOW + RECEIPT_WINDOW_MS - 1 });
  t.after(inside.close);
  assert.equal((await parentSave(inside, 'order_PAR', 'pay_PAR')).status, 200);
  const db2 = memoryFirestore({ 'payOrders/order_PAR': parentOrder() });
  const edge = await startRoutes({ env: PARENT_ENV, db: db2, invoicer: fakeInvoicer(db2), nowMs: NOW + RECEIPT_WINDOW_MS });
  t.after(edge.close);
  const r = await parentSave(edge, 'order_PAR', 'pay_PAR');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: false, reason: 'expired' });
  assert.equal(db2.read('payOrders/order_PAR').gstBuyer, undefined);
  const np = await parentSave(inside, 'order_NEW', 'pay_NEW');
  assert.equal(np.status, 409);
  assert.equal(np.json.reason, 'not_paid');
  assert.equal(db.read('payOrders/order_NEW').gstBuyer, undefined);
});

test('GST-PARENT-POSTPAY · switches: all off = 404; PARENT_PAY on but PAYMENTS off = 404; only the parent switch on refuses a GUEST order and serves a parent one', async (t) => {
  const db = memoryFirestore({ 'payOrders/order_PAR': parentOrder(), 'payOrders/order_GST': parentOrder({ payer: 'guest', parentLinkId: undefined, paymentId: 'pay_GST', guestPaidAt: new Date(NOW) }) });
  const mk = async (env) => {
    const srv = await startRoutes({ env: { GST_INVOICE_ENABLED: '1', RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET, ...env }, db, invoicer: fakeInvoicer(db) });
    t.after(srv.close);
    return srv;
  };
  assert.equal((await parentSave(await mk({}), 'order_PAR', 'pay_PAR')).status, 404);
  assert.equal((await parentSave(await mk({ PARENT_PAY_ENABLED: '1' }), 'order_PAR', 'pay_PAR')).status, 404);
  const only = await mk({ PARENT_PAY_ENABLED: '1', PAYMENTS_ENABLED: '1' });
  const g = await parentSave(only, 'order_GST', 'pay_GST');
  assert.notEqual(g.status, 200, 'a guest order is refused when only the parent switch is on');
  assert.equal(db.read('payOrders/order_GST').gstBuyer, undefined);
  assert.equal((await parentSave(only, 'order_PAR', 'pay_PAR')).status, 200);
});

/* ── UNCLAIMED-ALERT-1 · the hold-end sweep runs the SAME delivery step (afterRecipientPaid): no second grant path ── */
const { createUnclaimedSweeper } = require('../services/unclaimedOrders.cjs');
const sweeperFor = (srv, clock, over = {}) =>
  createUnclaimedSweeper({ db: srv.db, now: () => clock.t, env: { ...over.env }, deliver: (i) => srv.guest.afterRecipientPaid(i), ...over.deps });
const passOf = (db, uid) => db.read(`subscriptions/${uid}`);

test('UNCLAIMED-1 · after the hold, an unchosen self-pay order with NO account gets one, through the existing creation path + grant; a repeat changes nothing', async (t) => {
  const clock = { t: NOW };
  const { srv, auth } = await autoRoutes({ env: SELF_ENV, nowFn: () => clock.t });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const key = `payOrders/${paid.orderId}`;
  assert.equal(srv.db.read(key).status, 'paid_unclaimed');
  clock.t = NOW + ATTACH_HOLD_MS + 1000;
  const sweeper = sweeperFor(srv, clock);
  assert.equal((await sweeper.tick()).delivered, 1);
  await srv.idle();
  const uid = autoAccountUid(paid.orderId);
  assert.deepEqual(auth.created, [{ uid, emailVerified: false, phoneNumber: PHONE }]);
  const stored = srv.db.read(key);
  assert.equal(stored.status, 'paid');
  assert.equal(stored.uid, uid);
  assert.equal(stored.claimedVia, 'account_created', 'the same label the delivery path writes');
  assert.ok(passOf(srv.db, uid), 'the Board Pass is granted to the new account');
  const passAfterFirst = passOf(srv.db, uid);
  const before = JSON.stringify([...srv.db.docs.entries()].filter(([k]) => !k.startsWith('payOrders/')));
  await sweeper.tick();
  await createUnclaimedSweeper({ db: srv.db, now: () => clock.t, env: {}, deliver: (i) => srv.guest.afterRecipientPaid(i) }).tick(); // a restart
  await srv.idle();
  assert.equal(auth.created.length, 1, 'no second account');
  assert.deepEqual(passOf(srv.db, uid), passAfterFirst, 'no second grant');
  assert.equal(JSON.stringify([...srv.db.docs.entries()].filter(([k]) => !k.startsWith('payOrders/'))), before);
});

test('UNCLAIMED-1 · an account that already has the paid-with phone receives it (no new account)', async (t) => {
  const clock = { t: NOW };
  const auth = fakeAuth({ users: [{ uid: 'uHasPhone', phoneNumber: PHONE }] });
  const { srv } = await autoRoutes({ env: SELF_ENV, auth, nowFn: () => clock.t });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  clock.t = NOW + ATTACH_HOLD_MS + 1000;
  await sweeperFor(srv, clock).tick();
  await srv.idle();
  const stored = srv.db.read(`payOrders/${paid.orderId}`);
  assert.equal(stored.uid, 'uHasPhone');
  assert.equal(stored.claimedVia, 'existing_account');
  assert.deepEqual(auth.created, []);
  assert.ok(passOf(srv.db, 'uHasPhone'));
});

test('UNCLAIMED-1 · nothing happens inside the hold, after the payer chose, or with the kill switch; the sweep never writes an attempt for them', async (t) => {
  const clock = { t: NOW };
  const { srv, auth } = await autoRoutes({ env: SELF_ENV, nowFn: () => clock.t });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const key = `payOrders/${paid.orderId}`;
  clock.t = NOW + ATTACH_HOLD_MS - 1000;
  assert.deepEqual(await sweeperFor(srv, clock).tick(), { delivered: 0, alerted: 0 });
  assert.equal(srv.db.read(key).holdSweepAttempts, undefined);
  clock.t = NOW + ATTACH_HOLD_MS + 1000;
  assert.equal((await sweeperFor(srv, clock, { env: { UNCLAIMED_SWEEP_DISABLED: '1' } }).tick()).delivered, 0);
  assert.deepEqual(auth.created, []);
  assert.equal(srv.db.read(key).status, 'paid_unclaimed');
  // switched back on, it delivers
  assert.equal((await sweeperFor(srv, clock).tick()).delivered, 1);
  await srv.idle();
  assert.equal(srv.db.read(key).status, 'paid');
});

test('UNCLAIMED-1 · a payer who chose "someone else" is not swept; the sweep never overrides the choice', async (t) => {
  const clock = { t: NOW };
  const { srv, auth } = await autoRoutes({ env: SELF_ENV, nowFn: () => clock.t });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const key = `payOrders/${paid.orderId}`;
  const cur = srv.db.read(key);
  srv.db.docs.set(key, { data: { ...cur, attachedAt: new Date(NOW + 1000), attachChoice: 'other' }, version: 50 });
  clock.t = NOW + ATTACH_HOLD_MS + 1000;
  assert.equal((await sweeperFor(srv, clock).tick()).delivered, 0);
  assert.deepEqual(auth.created, []);
});

test('UNCLAIMED-1 · the payer signing in right at the hold end and the sweep race: ONE grant, whichever wins', async (t) => {
  const clock = { t: NOW };
  const auth = fakeAuth({ users: [{ uid: 'uPayer', phoneNumber: PHONE }] });
  const { srv } = await autoRoutes({ env: SELF_ENV, auth, nowFn: () => clock.t });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  clock.t = NOW + ATTACH_HOLD_MS + 1000;
  await Promise.all([sweeperFor(srv, clock).tick(), claim(srv, signedIn('uPayer', PHONE))]);
  await srv.idle();
  const stored = srv.db.read(`payOrders/${paid.orderId}`);
  assert.equal(stored.uid, 'uPayer');
  assert.ok(passOf(srv.db, 'uPayer'));
  assert.equal(srv.db.keys('subscriptions/uPayer/payments/').length, 1, 'one payment record: one grant');
  assert.equal(subsDocs(srv.db).filter((k) => !k.startsWith('subscriptions/uPayer')).length, 0);
});

/* ══ PUT-ON-THIS-ACCOUNT-1: a signed-in buyer who still holds the receipt proof puts the purchase on THIS account ══ */
const proofClaim = (srv, o, headers, extra = {}, sigFor = [o.orderId, o.paymentId]) =>
  request(srv.port, GUEST_PROOF_CLAIM_PATH, { body: { orderId: o.orderId, paymentId: o.paymentId, signature: checkoutSig(sigFor[0], sigFor[1]), ...extra }, headers });
const GOOGLE = (uid = 'uGoogle') => ({ Authorization: `Bearer uid:${uid}|email:g.student@gmail.com` });
const AFTER_HOLD = NOW + ATTACH_HOLD_MS + 1000;

test('PUT-ON · an attach order still waiting: the signed-in Google account takes it with the proof; preview writes nothing; a second tap is "yours"; nothing else moves', async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const later = await startRoutes({ env: SELF_ENV, db, nowMs: AFTER_HOLD });
  t.after(later.close);
  const key = `payOrders/${paid.orderId}`;
  const before = JSON.stringify(db.read(key));
  const pv = await proofClaim(later, paid, GOOGLE(), { preview: true });
  assert.equal(pv.status, 200, pv.text);
  assert.deepEqual(pv.json, { ok: true, state: 'can_put', item: { kind: 'pass', label: 'Board Pass', sku: 'till_boards', target: null }, savedTo: '+91 98•••••948' });
  assert.equal(JSON.stringify(db.read(key)), before, 'a preview writes nothing');
  const r = await proofClaim(later, paid, GOOGLE());
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true, state: 'put', item: { kind: 'pass', label: 'Board Pass', sku: 'till_boards', target: null } });
  const stored = db.read(key);
  assert.equal(stored.uid, 'uGoogle');
  assert.equal(stored.status, 'paid');
  assert.equal(db.read('subscriptions/uGoogle').passType, 'till_boards');
  const again = await proofClaim(later, paid, GOOGLE());
  assert.deepEqual(again.json, { ok: true, state: 'yours', item: { kind: 'pass', label: 'Board Pass', sku: 'till_boards', target: null } });
  assert.equal(db.keys('subscriptions/uGoogle/payments/').length, 1, 'ONE grant');
  // another signed-in account cannot take it now
  const other = await proofClaim(later, paid, GOOGLE('uOther'));
  assert.equal(other.json.ok, false);
  assert.equal(db.read(key).uid, 'uGoogle');
});

test('PUT-ON · a pack: granted through the same pack grant to THIS account', async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidAttach(srv, { contact: '+919876543948' }, { sku: 'pack_cbq', target: 'maths' });
  const later = await startRoutes({ env: SELF_ENV, db, nowMs: AFTER_HOLD });
  t.after(later.close);
  const r = await proofClaim(later, paid, GOOGLE());
  assert.deepEqual(r.json, { ok: true, state: 'put', item: { kind: 'pack', label: 'PDF pack', sku: 'pack_cbq', target: 'maths' } });
  assert.ok(db.read('packEntitlements/uGoogle/packs/pack_cbq:maths'));
});

test('PUT-ON · the order made an account at payment (pay-): the purchase moves to THIS account; the phone and both sign-ins stay where they are', async (t) => {
  const db = memoryFirestore();
  const { srv, auth } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidSelfOrder(srv, { contact: '+919876543948' });
  await srv.idle();
  const auto = autoAccountUid(paid.orderId);
  assert.ok(db.read(`packEntitlements/${auto}/packs/pack_cbq:maths`), 'granted to the pay- account first');
  assert.equal(db.read(`payOrders/${paid.orderId}`).claimedVia, 'account_created');
  const usersBefore = JSON.stringify([...auth.byUid.entries()]);
  const pv = await proofClaim(srv, paid, GOOGLE(), { preview: true });
  assert.equal(pv.status, 200, pv.text);
  assert.equal(pv.json.state, 'can_put');
  assert.equal(db.read(`payOrders/${paid.orderId}`).uid, auto, 'a preview moves nothing');
  const r = await proofClaim(srv, paid, GOOGLE());
  assert.deepEqual(r.json, { ok: true, state: 'put', item: { kind: 'pack', label: 'PDF pack', sku: 'pack_cbq', target: 'maths' } });
  assert.equal(db.read(`payOrders/${paid.orderId}`).uid, 'uGoogle');
  assert.ok(db.read('packEntitlements/uGoogle/packs/pack_cbq:maths'));
  assert.equal(db.read(`packEntitlements/${auto}/packs/pack_cbq:maths`), undefined, 'gone from the pay- account');
  assert.equal(JSON.stringify([...auth.byUid.entries()]), usersBefore, 'Firebase Auth is not touched: the phone is never moved, nothing disabled');
  assert.equal(db.read(`adminMoves/merge-${auto}`).toUid, 'uGoogle');
  assert.deepEqual(Object.keys(db.read(`adminMoves/merge-${auto}`)).sort(), ['adminUid', 'at', 'fromUid', 'reason', 'toUid'], 'uids only');
  assert.equal((await proofClaim(srv, paid, GOOGLE())).json.state, 'yours');
});

test('PUT-ON · refused, nothing written: signed out, bad / wrong-order / wrong-payment proof, a someone-else order, expired, kill switch, switches off', async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const other = await paidAttach(srv);
  const later = await startRoutes({ env: SELF_ENV, db, nowMs: AFTER_HOLD });
  t.after(later.close);
  const key = `payOrders/${paid.orderId}`;
  const before = JSON.stringify(db.read(key));
  assert.equal((await proofClaim(later, paid, {})).status, 401);
  assert.equal((await request(later.port, GUEST_PROOF_CLAIM_PATH, { body: { orderId: paid.orderId, paymentId: paid.paymentId, signature: 'ab'.repeat(32) }, headers: GOOGLE() })).status, 400);
  assert.equal((await proofClaim(later, paid, GOOGLE(), {}, [other.orderId, other.paymentId])).status, 400, "another order's signature");
  assert.equal((await proofClaim(later, { orderId: paid.orderId, paymentId: other.paymentId }, GOOGLE())).status, 400, 'a different payment id');
  assert.equal(JSON.stringify(db.read(key)), before);
  // a someone-else order (selfPay false) is never taken with a proof
  db.docs.set(key, { data: { ...db.read(key), selfPay: false }, version: 77 });
  assert.equal((await proofClaim(later, paid, GOOGLE())).status, 400);
  db.docs.set(key, { data: { ...JSON.parse(before), attachHoldUntil: db.read(key).attachHoldUntil, guestPaidAt: db.read(key).guestPaidAt, createdAt: db.read(key).createdAt }, version: 78 });
  // the payer chose 'someone else' (attachedAt): not taken
  db.docs.set(key, { data: { ...db.read(key), attachedAt: new Date(NOW) }, version: 79 });
  assert.equal((await proofClaim(later, paid, GOOGLE(), { preview: true })).json.reason, 'not_available', 'a preview says so too');
  assert.equal((await proofClaim(later, paid, GOOGLE())).json.reason, 'not_available');
  assert.equal(db.read(key).uid === null || db.read(key).uid === undefined, true);
  // expired
  const late = await startRoutes({ env: SELF_ENV, db, nowMs: NOW + RECEIPT_WINDOW_MS });
  t.after(late.close);
  assert.deepEqual((await proofClaim(late, other, GOOGLE())).json, { ok: false, reason: 'expired' });
  // kill switch and the two feature switches
  const killed = await startRoutes({ env: { ...SELF_ENV, PUT_ON_ACCOUNT_DISABLED: '1' }, db, nowMs: AFTER_HOLD });
  t.after(killed.close);
  assert.equal((await proofClaim(killed, other, GOOGLE())).status, 404);
  const dark = await startRoutes({ env: { PAYMENTS_ENABLED: '1', RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET }, db, nowMs: AFTER_HOLD });
  t.after(dark.close);
  assert.equal((await proofClaim(dark, other, GOOGLE())).status, 404);
  assert.equal(db.read(`payOrders/${other.orderId}`).uid === null || db.read(`payOrders/${other.orderId}`).uid === undefined, true);
});

test('PUT-ON · an order already on a REAL account is never moved; a pay- account with activity of its own is not merged; a second Board Pass is not merged', async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const a = await paidSelfOrder(srv, { contact: '+919876543948' });
  const b = await paidSelfOrder(srv, { contact: '+917012345678' }, { sku: 'till_boards' });
  await srv.idle();
  // a: real account holds it (claimedVia claim, real uid)
  db.docs.set(`payOrders/${a.orderId}`, { data: { ...db.read(`payOrders/${a.orderId}`), uid: 'uReal', claimedVia: 'claim' }, version: 90 });
  const ra = await proofClaim(srv, a, GOOGLE());
  assert.equal(ra.json.reason, 'not_available');
  assert.equal(db.read(`payOrders/${a.orderId}`).uid, 'uReal');
  // each half of the pay- test on its own: a real uid labelled account_created, and the pay- uid labelled as another way in
  const autoA = autoAccountUid(a.orderId);
  db.docs.set(`payOrders/${a.orderId}`, { data: { ...db.read(`payOrders/${a.orderId}`), uid: 'uReal', claimedVia: 'account_created' }, version: 91 });
  assert.equal((await proofClaim(srv, a, GOOGLE())).json.reason, 'not_available');
  db.docs.set(`payOrders/${a.orderId}`, { data: { ...db.read(`payOrders/${a.orderId}`), uid: autoA, claimedVia: 'existing_account' }, version: 92 });
  assert.equal((await proofClaim(srv, a, GOOGLE())).json.reason, 'not_available');
  assert.equal(db.read(`payOrders/${a.orderId}`).uid, autoA);
  // b: the pay- account has activity of its own
  const autoB = autoAccountUid(b.orderId);
  db.docs.set(`users/${autoB}`, { data: { name: 'x' }, version: 1 });
  assert.equal((await proofClaim(srv, b, GOOGLE(), { preview: true })).json.reason, 'not_available');
  assert.equal((await proofClaim(srv, b, GOOGLE())).json.reason, 'not_available');
  assert.equal(db.read(`payOrders/${b.orderId}`).uid, autoB);
  db.docs.delete(`users/${autoB}`);
  // the target already holds a Board Pass: refused (one pass, one account), nothing moves
  db.docs.set('subscriptions/uGoogle', { data: { tier: 'premium', passType: 'till_boards', passEnd: new Date(Date.parse('2027-12-31T00:00:00Z')) }, version: 1 });
  assert.equal((await proofClaim(srv, b, GOOGLE())).json.reason, 'not_available');
  assert.equal(db.read(`payOrders/${b.orderId}`).uid, autoB);
  assert.ok(db.read(`subscriptions/${autoB}`).passType);
  assert.equal(db.docs.has(`adminMoves/merge-${autoB}`), false);
});

test('PUT-ON · a Board Pass the target already covers: the duplicate rule is unchanged (labelled a duplicate, no second grant)', async (t) => {
  const db = memoryFirestore({ 'subscriptions/uGoogle': COVERED_SUB });
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const later = await startRoutes({ env: SELF_ENV, db, nowMs: AFTER_HOLD });
  t.after(later.close);
  const r = await proofClaim(later, paid, GOOGLE());
  assert.deepEqual(r.json, { ok: true, state: 'duplicate', item: { kind: 'pass', label: 'Board Pass', sku: 'till_boards', target: null } });
  assert.equal(db.read(`payOrders/${paid.orderId}`).status, 'duplicate_purchase');
});

test('PUT-ON · during the 10-minute attach hold the buyer holding the proof still takes it (a signed-in payer has chosen); a preview in the hold says the same', async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidAttach(srv);
  const during = await startRoutes({ env: SELF_ENV, db, nowMs: NOW + 1000 });
  t.after(during.close);
  assert.equal((await proofClaim(during, paid, GOOGLE(), { preview: true })).json.state, 'can_put');
  const r = await proofClaim(during, paid, GOOGLE());
  assert.equal(r.json.state, 'put', r.text);
  assert.equal(db.read(`payOrders/${paid.orderId}`).uid, 'uGoogle');
});

test('PUT-ON · ONE proof moves ONE order: a pay- account that also holds another order (a parent "someone else" purchase), pack or Board Pass is refused, nothing moves', async (t) => {
  for (const extra of ['order', 'pack', 'marker', 'pass']) {
    const db = memoryFirestore();
    const { srv } = await autoRoutes({ env: SELF_ENV, db });
    t.after(srv.close);
    const paid = await paidSelfOrder(srv, { contact: '+919876543948' });
    await srv.idle();
    const auto = autoAccountUid(paid.orderId);
    if (extra === 'order') db.docs.set('payOrders/order_second', { data: { uid: auto, payer: 'guest', selfPay: false, passType: 'pack_cbq', packTarget: 'science', status: 'paid', paymentId: 'pay_second' }, version: 1 });
    if (extra === 'pack') db.docs.set(`packEntitlements/${auto}/packs/pack_cbq:science`, { data: { packId: 'pack_cbq:science', sku: 'pack_cbq', target: 'science', orderId: 'order_second', paymentRef: 'pay_second' }, version: 1 });
    if (extra === 'marker') db.docs.set(`packEntitlements/${auto}/grants/pay_second`, { data: { paymentRef: 'pay_second', packId: 'pack_cbq:science', orderId: 'order_second' }, version: 1 });
    if (extra === 'pass') db.docs.set(`subscriptions/${auto}`, { data: { tier: 'premium', passType: 'till_boards', passEnd: new Date(Date.parse('2027-12-31T00:00:00Z')), lastPaymentRef: 'pay_second' }, version: 1 });
    const r = await proofClaim(srv, paid, GOOGLE());
    assert.equal(r.json.ok, false, extra);
    assert.equal(r.json.reason, 'not_available', extra);
    assert.equal(db.read(`payOrders/${paid.orderId}`).uid, auto, `${extra}: the proven order stays`);
    if (extra === 'order') assert.equal(db.read('payOrders/order_second').uid, auto);
    assert.ok(db.read(`packEntitlements/${auto}/packs/pack_cbq:maths`), `${extra}: nothing moved`);
    assert.equal(db.read('packEntitlements/uGoogle/packs/pack_cbq:maths'), undefined, extra);
    assert.equal(db.docs.has(`adminMoves/merge-${auto}`), false, extra);
  }
});

test('PUT-ON · the order must sit on the pay- account made for EXACTLY this order (any other pay- uid is refused); the take re-checks "not attached" inside the transaction', async (t) => {
  const db = memoryFirestore();
  const { srv } = await autoRoutes({ env: SELF_ENV, db });
  t.after(srv.close);
  const paid = await paidSelfOrder(srv, { contact: '+919876543948' });
  await srv.idle();
  const auto = autoAccountUid(paid.orderId);
  const stranger = `pay-${'a'.repeat(24)}`;
  assert.notEqual(stranger, auto);
  db.docs.set(`payOrders/${paid.orderId}`, { data: { ...db.read(`payOrders/${paid.orderId}`), uid: stranger }, version: 40 });
  const r = await proofClaim(srv, paid, GOOGLE());
  assert.equal(r.json.reason, 'not_available');
  assert.equal(db.read(`payOrders/${paid.orderId}`).uid, stranger);
  // the take: the payer chooses "someone else" between the page read and the transaction
  const db2 = memoryFirestore();
  const a2 = await autoRoutes({ env: SELF_ENV, db: db2 });
  t.after(a2.srv.close);
  const waiting = await paidAttach(a2.srv);
  const later = await startRoutes({ env: SELF_ENV, db: db2, nowMs: AFTER_HOLD });
  t.after(later.close);
  const key = `payOrders/${waiting.orderId}`;
  const origTx = db2.runTransaction.bind(db2);
  let raced = false;
  db2.runTransaction = (fn) => {
    if (!raced) {
      raced = true;
      db2.docs.set(key, { data: { ...db2.read(key), attachedAt: new Date(NOW) }, version: 99 });
    }
    return origTx(fn);
  };
  const t2 = await proofClaim(later, waiting, GOOGLE());
  assert.equal(t2.json.reason, 'not_available');
  assert.ok(db2.read(key).uid === null || db2.read(key).uid === undefined);
});

// ── ORDER-SOURCE-1: guest, who and self order writers store the sanitised source ──
test('ORDER-SOURCE-1 · guest order stores the whitelisted source (no click-id value); invalid -> no field; kill switch -> none', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const g = await guestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE, source: { utm_source: 'meta', utm_medium: 'paid', landing: '/packs', fbclid: 'REAL-ID', gclid: true, junk: 1 } });
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(srv.db.read(`payOrders/${g.json.orderId}`).source, { utm_source: 'meta', utm_medium: 'paid', landing: '/packs', gclid: true });
  const none = await guestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: '+919876543210', source: { utm_source: 'a@b.com' } });
  assert.equal(srv.db.read(`payOrders/${none.json.orderId}`).source, undefined);
  const off = await startRoutes({ env: { ...ENV_ON, ORDER_SOURCE_DISABLED: '1' } });
  t.after(off.close);
  const o = await guestOrder(off, { sku: 'pack_mock', target: 'maths', phone: PHONE, source: { utm_source: 'meta' } });
  assert.equal(o.status, 200, o.text);
  assert.equal(off.db.read(`payOrders/${o.json.orderId}`).source, undefined);
});

test('ORDER-SOURCE-1 · who-order and self-order store the source too', async (t) => {
  const srv = await startRoutes({ env: WHO_ENV });
  t.after(srv.close);
  const w = await whoOrder(srv, { sku: 'pack_mock', target: 'maths', recipient: { phone: PHONE, first: 'Aarav' }, source: { utm_source: 'google', utm_medium: 'cpc' } });
  assert.equal(w.status, 200, w.text);
  assert.deepEqual(srv.db.read(`payOrders/${w.json.orderId}`).source, { utm_source: 'google', utm_medium: 'cpc' });
  const s = await whoOrder(srv, { sku: 'pack_mock', target: 'maths', self: true, source: { ref: 'youtube.com' } });
  assert.equal(s.status, 200, s.text);
  assert.deepEqual(srv.db.read(`payOrders/${s.json.orderId}`).source, { ref: 'youtube.com' });
});


test('SERVER-EVENTS-1 · a guest pack: ONE PackPurchase for verify + webhook + replay, hashed Razorpay email + phone, event_id = order id', async (t) => {
  const { createServerEvents } = require('../services/serverEvents.cjs');
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url: String(url), body: JSON.parse(init.body) }); return { ok: true, status: 200 }; };
  const db = memoryFirestore();
  const serverEvents = createServerEvents({ firestore: db, env: { META_CAPI_ACCESS_TOKEN: 't' }, fetchImpl, now: () => NOW });
  const srv = await startRoutes({ db, serverEvents });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE, adSignals: { fbp: 'fb.1.1700000000000.12345678' } });
  const p = srv.rzp.pay(o.json.orderId);
  srv.rzp.payments.get(p.id).email = 'Parent@Example.com';
  assert.equal((await guestVerify(srv, o.json.orderId, p.id)).status, 200);
  assert.equal((await sendWebhook(srv, { ...srv.rzp.payments.get(p.id) })).status, 200);
  assert.equal((await guestVerify(srv, o.json.orderId, p.id)).status, 200);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(calls.length, 1);
  const ev = calls[0].body.data[0];
  assert.equal(ev.event_name, 'PackPurchase');
  assert.equal(ev.event_id, o.json.orderId);
  assert.equal(ev.user_data.em[0], crypto.createHash('sha256').update('parent@example.com').digest('hex'));
  assert.equal(ev.user_data.fbp, 'fb.1.1700000000000.12345678');
  assert.equal(ev.user_data.external_id, undefined, 'a guest has no account id');
});

test('TS-PRICE-2 · a guest Test Series order is charged 999 + GST before 00:00 IST 1 Dec 2026 and 1,499 + GST from it (the server clock decides)', async (t) => {
  const CUT = Date.parse('2026-12-01T00:00:00+05:30');
  const early = await startRoutes({ nowMs: CUT - 1 });
  t.after(early.close);
  const a = await guestOrder(early, { sku: 'test_series', phone: PHONE, amountPaise: 100, price: 1 });
  assert.equal(a.status, 200, a.text);
  assert.equal(a.json.amountPaise, 117900);
  const late = await startRoutes({ nowMs: CUT });
  t.after(late.close);
  const b = await guestOrder(late, { sku: 'test_series', phone: PHONE, amountPaise: 100, price: 1 });
  assert.equal(b.status, 200, b.text);
  assert.equal(b.json.amountPaise, 176900);
  assert.equal(late.rzp.calls.filter((c) => c.url.endsWith('/orders') && c.method === 'POST').pop().body.amount, 176900);
});

test('TS-PRICE-2 · guest: a 999 founding Test Series order only AUTHORIZED 24 h+ after the cut-off is refused (order_expired, not captured); +10 s is granted', async (t) => {
  const CUT = Date.parse('2026-12-01T00:00:00+05:30');
  const db = memoryFirestore();
  const rzp = fakeRazorpay();
  const early = await startRoutes({ db, rzp, nowMs: CUT - 5000 });
  t.after(early.close);
  const o = await guestOrder(early, { sku: 'test_series', phone: PHONE });
  assert.equal(o.json.amountPaise, 117900);
  const p = rzp.pay(o.json.orderId, { status: 'authorized' });
  const stale = await startRoutes({ db, rzp, nowMs: CUT + 25 * 3600 * 1000 });
  t.after(stale.close);
  const r = await guestVerify(stale, o.json.orderId, p.id);
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.reason, 'order_expired');
  assert.equal(rzp.calls.filter((c) => c.url.endsWith('/capture')).length, 0);
  const ok = await startRoutes({ db, rzp, nowMs: CUT + 10000 });
  t.after(ok.close);
  const v = await guestVerify(ok, o.json.orderId, p.id);
  assert.equal(v.status, 200, v.text);
});

/* ══ PR · PAY-RETURN-1 — a buyer back from the UPI app on a reset page (no verify ran) asks the server what became of the order ══
 *
 * ★ MUTATIONS (run against THIS file only, each shown red, each restored):
 *   M1 handleOrderStatus skips the statusProofMatches check        -> "PR · proof is required ..." red
 *   M2 handleOrderStatus fires orderPaid / the receipt when it did NOT move created -> paid_unclaimed -> "PR · concurrent status calls alone ..." red
 *   M3 handleOrderStatus believes a payment for another amount     -> "PR · a payment for another amount ..." red
 */
const statusCall = (srv, orderId, proof, headers = {}) => request(srv.port, GUEST_ORDER_STATUS_PATH, { body: { orderId, proof }, headers });
const PR_ENV = { ...WHO_ENV, GUEST_PAY_ENABLED: '1', PAY_AUTO_ACCOUNT_ENABLED: '1' };

test('PR · every order type mints a per-order proof: the reply carries it, the order stores ONLY its SHA-256, Razorpay never sees it', async (t) => {
  const srv = await startRoutes({ env: PR_ENV });
  t.after(srv.close);
  const phone = await guestOrder(srv, { sku: 'till_boards', phone: PHONE });
  const who = await whoOrder(srv, { sku: 'pack_mock', target: 'maths', recipient: { phone: PHONE } });
  const self = await selfOrder(srv, { sku: 'pack_cbq', target: 'maths' });
  for (const o of [phone, who, self]) {
    assert.equal(o.status, 200, o.text);
    assert.match(o.json.statusProof, /^[A-Za-z0-9_-]{32}$/);
    const stored = srv.db.read(`payOrders/${o.json.orderId}`);
    assert.equal(stored.statusProofHash, crypto.createHash('sha256').update(o.json.statusProof).digest('hex'));
    assert.equal(JSON.stringify(stored).includes(o.json.statusProof), false, 'the raw proof is never stored');
    assert.equal(JSON.stringify(srv.rzp.orders.get(o.json.orderId)).includes(o.json.statusProof), false, 'nor sent to Razorpay');
  }
  assert.notEqual(phone.json.statusProof, who.json.statusProof);
});

test('PR · proof is required: missing / malformed / wrong / another order\'s / an old order with no proof all get ONE refusal and touch nothing', async (t) => {
  const srv = await startRoutes({ env: PR_ENV });
  t.after(srv.close);
  const a = await guestOrder(srv, { sku: 'till_boards', phone: PHONE });
  const b = await guestOrder(srv, { sku: 'pack_cbq', target: 'maths', phone: OTHER_PHONE });
  srv.rzp.pay(a.json.orderId);
  await srv.db.collection('payOrders').doc('order_OLD').set({ payer: 'guest', guestPhone: PHONE, passType: 'till_boards', amountPaise: 100, status: 'created', createdAt: new Date(NOW) });
  const callsBefore = srv.rzp.calls.length;
  const refusals = [
    await request(srv.port, GUEST_ORDER_STATUS_PATH, { body: { orderId: a.json.orderId } }),
    await statusCall(srv, a.json.orderId, 'short'),
    await statusCall(srv, a.json.orderId, 'A'.repeat(32)),
    await statusCall(srv, a.json.orderId, b.json.statusProof),
    await statusCall(srv, 'order_unknown', a.json.statusProof),
    await statusCall(srv, 'order_OLD', a.json.statusProof),
    await statusCall(srv, a.json.orderId, `${a.json.statusProof}x`),
  ];
  assert.equal(refusals[0].json.reason, 'malformed');
  assert.equal(refusals[1].json.reason, 'malformed');
  for (const r of refusals.slice(2)) {
    assert.equal(r.status, 403, r.text);
    assert.deepEqual(r.json, { ok: false, error: 'payment_rejected', reason: 'invalid_proof' }, 'no enumeration: unknown order, wrong proof and no proof read the same');
  }
  assert.equal(srv.rzp.calls.length, callsBefore, 'Razorpay is never asked without a valid proof');
  assert.equal(srv.db.read(`payOrders/${a.json.orderId}`).status, 'created');
  // a non-guest order id never answers, even with a proof-shaped hash matching
  await srv.db.collection('payOrders').doc('order_SIGNEDIN').set({ payer: 'self', uid: 'u1', statusProofHash: crypto.createHash('sha256').update('P'.repeat(32)).digest('hex'), createdAt: new Date(NOW), amountPaise: 100, status: 'created' });
  assert.equal((await statusCall(srv, 'order_SIGNEDIN', 'P'.repeat(32))).status, 403);
});

test('PR · the proof expires with the order (createdAt + 2 h): 410, nothing asked of Razorpay', async (t) => {
  let clock = NOW;
  const srv = await startRoutes({ env: PR_ENV, nowFn: () => clock });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'till_boards', phone: PHONE });
  srv.rzp.pay(o.json.orderId);
  clock = NOW + STATUS_PROOF_TTL_MS - 1000;
  assert.equal((await statusCall(srv, o.json.orderId, o.json.statusProof)).status, 200);
  clock = NOW + STATUS_PROOF_TTL_MS + 1000;
  const callsBefore = srv.rzp.calls.length;
  const late = await statusCall(srv, o.json.orderId, o.json.statusProof);
  assert.equal(late.status, 410);
  assert.equal(late.json.reason, 'expired');
  assert.equal(srv.rzp.calls.length, callsBefore);
});

test('PR · captured at Razorpay, no verify, no webhook: recorded paid_unclaimed ONCE, the same body verify returns, plus the receipt proof Razorpay\'s handler would have given', async (t) => {
  const srv = await startRoutes({ env: PR_ENV });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'pack_cbq', target: 'maths', phone: PHONE });
  const p = srv.rzp.pay(o.json.orderId);
  const r = await statusCall(srv, o.json.orderId, o.json.statusProof);
  assert.equal(r.status, 200, r.text);
  const { receipt, ...body } = r.json;
  assert.deepEqual(receipt, { orderId: o.json.orderId, paymentId: p.id, signature: checkoutSig(o.json.orderId, p.id) });
  // the SAME success payload verify returns for this order (shape and values)
  const v = await guestVerify(srv, o.json.orderId, p.id);
  assert.deepEqual(body, v.json);
  assert.equal(body.status, 'paid_unclaimed');
  assert.equal(body.kind, 'pack');
  assert.equal(body.phoneMasked, maskIndianMobile(PHONE));
  const stored = srv.db.read(`payOrders/${o.json.orderId}`);
  assert.equal(stored.status, 'paid_unclaimed');
  assert.equal(stored.paymentId, p.id);
  assert.equal(packDocs(srv.db).length, 0, 'recording is not a grant: the claim grants, exactly as after verify');
  assert.equal(subsDocs(srv.db).length, 0);
  // and the returned proof is accepted by the receipt route (files / "Sign in with this number" card), unchanged
  const rc = await request(srv.port, GUEST_RECEIPT_PATH, { body: receipt });
  assert.equal(rc.status, 200, rc.text);
  assert.equal(rc.json.ok, true);
  assert.equal(rc.json.pack.sku, 'pack_cbq');
});

test('PR · already recorded by the webhook / sweep: the SAME verify body at once, from the store; Razorpay is not asked and nothing is fired again', async (t) => {
  const { createServerEvents } = require('../services/serverEvents.cjs');
  const metaCalls = [];
  const fetchImpl = async (url, init) => { metaCalls.push(JSON.parse(init.body)); return { ok: true, status: 200 }; };
  const db = memoryFirestore();
  const serverEvents = createServerEvents({ firestore: db, env: { META_CAPI_ACCESS_TOKEN: 't' }, fetchImpl, now: () => NOW });
  const resend = resendRecorder();
  const receiptEmailer = createPaymentReceiptEmailer({ env: EMAIL_ENV, adminFirestore: db, fetchImpl: resend.fetchImpl, now: () => NOW });
  const srv = await startRoutes({ db, env: PR_ENV, serverEvents, receiptEmailer });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'pack_cbq', target: 'maths', phone: PHONE });
  const p = srv.rzp.pay(o.json.orderId, { email: 'buyer@example.com' });
  assert.equal((await sendWebhook(srv, { ...p })).status, 200); // the webhook records it (the 21 Nov 16:53 shape)
  await receiptEmailer.whenIdle();
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(metaCalls.length, 1, 'the webhook fired the one purchase event');
  assert.equal(resend.sent.length, 1, 'and the one receipt');
  const callsBefore = srv.rzp.calls.length;
  const emailsBefore = resend.sent.length;
  const r = await statusCall(srv, o.json.orderId, o.json.statusProof);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.status, 'paid_unclaimed');
  assert.equal(r.json.receipt.paymentId, p.id);
  assert.equal(srv.rzp.calls.length, callsBefore, 'nothing asked of Razorpay for an order already recorded');
  await receiptEmailer.whenIdle();
  assert.equal(resend.sent.length, emailsBefore, 'no second receipt');
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(metaCalls.length, 1, 'no second purchase event');
  const again = await statusCall(srv, o.json.orderId, o.json.statusProof);
  assert.deepEqual(again.json, r.json, 'idempotent');
});

test('PR · concurrent: status x3 + a webhook + a verify on one captured order -> ONE payment recorded, ONE purchase event, ONE receipt email, no grant', async (t) => {
  const { createServerEvents } = require('../services/serverEvents.cjs');
  const metaCalls = [];
  const fetchImpl = async (url, init) => { metaCalls.push(JSON.parse(init.body)); return { ok: true, status: 200 }; };
  const base = memoryFirestore();
  const serverEvents = createServerEvents({ firestore: base, env: { META_CAPI_ACCESS_TOKEN: 't' }, fetchImpl, now: () => NOW });
  const h = emailHarness();
  const srv = await startRoutes({ db: base, env: PR_ENV, serverEvents, receiptEmailer: createPaymentReceiptEmailer({ env: EMAIL_ENV, adminFirestore: base, fetchImpl: h.resend.fetchImpl, now: () => NOW }) });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'pack_mock', target: 'maths', phone: PHONE });
  const p = srv.rzp.pay(o.json.orderId, { email: 'buyer@example.com' });
  const results = await Promise.all([
    statusCall(srv, o.json.orderId, o.json.statusProof),
    statusCall(srv, o.json.orderId, o.json.statusProof),
    statusCall(srv, o.json.orderId, o.json.statusProof),
    sendWebhook(srv, { ...p }),
    guestVerify(srv, o.json.orderId, p.id),
  ]);
  for (const r of results) assert.equal(r.status, 200, r.text);
  await srv.idle();
  await new Promise((r) => setTimeout(r, 80));
  const stored = srv.db.read(`payOrders/${o.json.orderId}`);
  assert.equal(stored.status, 'paid_unclaimed');
  assert.equal(stored.paymentId, p.id);
  assert.equal(metaCalls.length, 1, 'one PackPurchase for the sale, whoever recorded it');
  assert.equal(h.resend.sent.length, 1, 'one receipt email');
  assert.equal(packDocs(srv.db).length, 0);
  assert.equal(subsDocs(srv.db).length, 0);
  // the three status answers are identical
  assert.deepEqual(results[0].json, results[1].json);
  assert.deepEqual(results[1].json, results[2].json);
});

test('PR · an AUTHORIZED payment is captured for the STORED amount (the verify rule), then recorded', async (t) => {
  const srv = await startRoutes({ env: PR_ENV });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'till_boards', phone: PHONE });
  const p = srv.rzp.pay(o.json.orderId, { status: 'authorized' });
  const r = await statusCall(srv, o.json.orderId, o.json.statusProof);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.status, 'paid_unclaimed');
  const cap = srv.rzp.calls.filter((c) => c.method === 'POST' && c.url.endsWith(`/payments/${p.id}/capture`));
  assert.equal(cap.length, 1);
  assert.equal(cap[0].body.amount, srv.db.read(`payOrders/${o.json.orderId}`).amountPaise);
});

test('PR · a payment for another amount, another currency or another order is never believed', async (t) => {
  const srv = await startRoutes({ env: PR_ENV });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'till_boards', phone: PHONE });
  const other = await guestOrder(srv, { sku: 'till_boards', phone: OTHER_PHONE });
  srv.rzp.pay(o.json.orderId, { id: 'pay_cheap', amount: 100 });
  srv.rzp.pay(o.json.orderId, { id: 'pay_usd', currency: 'USD' });
  const r = await statusCall(srv, o.json.orderId, o.json.statusProof);
  assert.equal(r.status, 200);
  assert.notEqual(r.json.status, 'paid_unclaimed');
  assert.equal(srv.db.read(`payOrders/${o.json.orderId}`).status, 'created');
  // another order's captured payment, listed under this order by a lying list, does not count either
  srv.rzp.payments.set('pay_wrongorder', { id: 'pay_wrongorder', order_id: other.json.orderId, amount: srv.rzp.orders.get(o.json.orderId).amount, currency: 'INR', status: 'captured' });
  assert.equal(srv.db.read(`payOrders/${other.json.orderId}`).status, 'created');
});

test('PR · nothing captured: in-progress / just-created -> pending; a failed attempt -> failed with its reason; an old order with no attempt -> failed; nothing is recorded', async (t) => {
  let clock = NOW;
  const srv = await startRoutes({ env: PR_ENV, nowFn: () => clock });
  t.after(srv.close);
  // no attempt yet, young order -> pending
  const young = await guestOrder(srv, { sku: 'till_boards', phone: PHONE });
  let r = await statusCall(srv, young.json.orderId, young.json.statusProof);
  assert.deepEqual(r.json, { ok: true, status: 'pending', reason: 'no_payment_yet' });
  // still in the UPI app -> pending
  srv.rzp.pay(young.json.orderId, { id: 'pay_wip', status: 'created' });
  r = await statusCall(srv, young.json.orderId, young.json.statusProof);
  assert.deepEqual(r.json, { ok: true, status: 'pending', reason: 'in_progress' });
  // the 21 Nov 18:28 shape: a payment that timed out
  const timedOut = await guestOrder(srv, { sku: 'till_boards', phone: OTHER_PHONE });
  srv.rzp.pay(timedOut.json.orderId, { id: 'pay_to', status: 'failed' });
  srv.rzp.payments.get('pay_to').error_reason = 'payment_timed_out';
  r = await statusCall(srv, timedOut.json.orderId, timedOut.json.statusProof);
  assert.deepEqual(r.json, { ok: true, status: 'failed', reason: 'payment_timed_out' });
  // the 19:06 shape: no Razorpay payment at all, and time has passed
  const none = await guestOrder(srv, { sku: 'pack_cbq', target: 'maths', phone: '+917012345679' });
  clock = NOW + NO_ATTEMPT_FAILED_AFTER_MS + 1000;
  r = await statusCall(srv, none.json.orderId, none.json.statusProof);
  assert.deepEqual(r.json, { ok: true, status: 'failed', reason: 'no_payment' });
  for (const id of [young, timedOut, none]) assert.equal(srv.db.read(`payOrders/${id.json.orderId}`).status, 'created');
  assert.equal(packDocs(srv.db).length + subsDocs(srv.db).length, 0);
});

test('PR · review N2: a failed attempt PLUS a second attempt still in the UPI app reads pending, never failed', async (t) => {
  const srv = await startRoutes({ env: PR_ENV });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'till_boards', phone: PHONE });
  srv.rzp.pay(o.json.orderId, { id: 'pay_first_to', status: 'failed' });
  srv.rzp.payments.get('pay_first_to').error_reason = 'payment_timed_out';
  srv.rzp.pay(o.json.orderId, { id: 'pay_second_wip', status: 'created' });
  const r = await statusCall(srv, o.json.orderId, o.json.statusProof);
  assert.deepEqual(r.json, { ok: true, status: 'pending', reason: 'in_progress' });
  assert.equal(srv.db.read(`payOrders/${o.json.orderId}`).status, 'created');
});

test('PR · a failed attempt followed by a successful retry on the SAME order reads paid, not failed', async (t) => {
  const srv = await startRoutes({ env: PR_ENV });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'till_boards', phone: PHONE });
  srv.rzp.pay(o.json.orderId, { id: 'pay_bad', status: 'failed' });
  srv.rzp.pay(o.json.orderId, { id: 'pay_good' });
  const r = await statusCall(srv, o.json.orderId, o.json.statusProof);
  assert.equal(r.json.status, 'paid_unclaimed');
  assert.equal(r.json.receipt.paymentId, 'pay_good');
});

test('PR · "Buy for yourself" (self + attach): status reads the buyer\'s contact off Razorpay\'s payment and reports the open attach hold, like verify', async (t) => {
  const { srv } = await autoRoutes({ env: PR_ENV });
  t.after(srv.close);
  const o = await selfOrder(srv, { sku: 'pack_cbq', target: 'maths', attach: true });
  assert.equal(o.status, 200, o.text);
  const p = srv.rzp.pay(o.json.orderId, { contact: PHONE, email: 'buyer@example.com' });
  const r = await statusCall(srv, o.json.orderId, o.json.statusProof);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.selfContact, { phone: PHONE, email: 'buyer@example.com', first: 'phone' });
  assert.equal(r.json.attach.attached, false);
  assert.equal(r.json.attach.holdRemainingMs > 0 && r.json.attach.holdRemainingMs <= ATTACH_HOLD_MS, true);
  assert.equal(r.json.receipt.signature, checkoutSig(o.json.orderId, p.id));
  // the attach route accepts the proof the status route returned (the choice of WHO still works after a reset page)
  const at = await request(srv.port, GUEST_ATTACH_PATH, { body: { ...r.json.receipt, choice: 'me' } });
  assert.equal(at.status, 200, at.text);
});

test('PR · a recipient order recorded by status is delivered to an existing account exactly as after verify (once)', async (t) => {
  const auth = fakeAuth();
  const { srv } = await autoRoutes({ env: PR_ENV, auth });
  t.after(srv.close);
  const o = await whoOrder(srv, { sku: 'pack_cbq', target: 'maths', recipient: { phone: PHONE } });
  srv.rzp.pay(o.json.orderId);
  const r = await statusCall(srv, o.json.orderId, o.json.statusProof);
  assert.equal(r.status, 200, r.text);
  await srv.idle();
  const stored = srv.db.read(`payOrders/${o.json.orderId}`);
  assert.equal(['claimed', 'paid'].includes(stored.status), true, `delivered, got ${stored.status}`);
  const uid = stored.uid;
  assert.ok(uid);
  const packsBefore = packDocs(srv.db).length;
  await statusCall(srv, o.json.orderId, o.json.statusProof);
  await srv.idle();
  assert.equal(packDocs(srv.db).length, packsBefore, 'a second status call grants nothing more');
  assert.equal(srv.db.read(`payOrders/${o.json.orderId}`).uid, uid);
});

test('PR · kill switch PAY_RETURN_DISABLED=1: no proof is minted or stored, order replies are exactly the old shape, order-status answers 404 before anything is read', async (t) => {
  const off = await startRoutes({ env: { ...PR_ENV, PAY_RETURN_DISABLED: '1' } });
  t.after(off.close);
  const o = await guestOrder(off, { sku: 'till_boards', phone: PHONE });
  assert.equal(o.status, 200);
  assert.deepEqual(Object.keys(o.json).sort(), ['amountPaise', 'keyId', 'ok', 'orderId', 'phoneMasked']);
  assert.equal(off.db.read(`payOrders/${o.json.orderId}`).statusProofHash, undefined);
  assert.equal((await selfOrder(off, { sku: 'pack_cbq', target: 'maths' })).json.statusProof, undefined);
  assert.equal((await whoOrder(off, { sku: 'pack_cbq', target: 'maths', recipient: { phone: PHONE } })).json.statusProof, undefined);
  const before = off.rzp.calls.length;
  const r = await statusCall(off, o.json.orderId, 'A'.repeat(32));
  assert.equal(r.status, 404);
  assert.deepEqual(r.json, { error: 'Not Found' });
  assert.equal(off.rzp.calls.length, before);
  // and verify / webhook still work for that order, untouched
  const p = off.rzp.pay(o.json.orderId);
  assert.equal((await guestVerify(off, o.json.orderId, p.id)).status, 200);
});

test('PR · dark with the guest-pay switches: both off -> 404 (even with a valid proof shape)', async (t) => {
  const srv = await startRoutes({ env: { ...ENV_ON, GUEST_PAY_ENABLED: '' } });
  t.after(srv.close);
  const r = await statusCall(srv, 'order_X', 'A'.repeat(32));
  assert.equal(r.status, 404);
  const pay = await startRoutes({ env: { ...ENV_ON, PAYMENTS_ENABLED: '0' } });
  t.after(pay.close);
  assert.equal((await statusCall(pay, 'order_X', 'A'.repeat(32))).status, 404);
});

test('PR · rate limits: a per-order hourly cap (only after the proof matched) and a per-client daily budget of its own', async (t) => {
  const srv = await startRoutes({ env: PR_ENV });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'till_boards', phone: PHONE });
  srv.rzp.pay(o.json.orderId, { id: 'pay_wip', status: 'created' });
  let last = null;
  for (let i = 0; i < STATUS_CALLS_PER_ORDER_PER_HOUR; i += 1) last = await statusCall(srv, o.json.orderId, o.json.statusProof, { 'X-Forwarded-For': `203.0.113.${(i % 200) + 1}` });
  assert.equal(last.status, 200);
  const over = await statusCall(srv, o.json.orderId, o.json.statusProof, { 'X-Forwarded-For': '203.0.113.250' });
  assert.equal(over.status, 429);
  // a stranger with a WRONG proof cannot burn that buyer's cap: still 429 for the buyer only; the stranger gets 403
  const stranger = await statusCall(srv, o.json.orderId, 'B'.repeat(32), { 'X-Forwarded-For': '203.0.113.251' });
  assert.equal(stranger.status, 403);
  // per-client: one IP, daily budget
  const ip = { 'X-Forwarded-For': '192.0.2.77' };
  let n = 0;
  let status = 0;
  while (n <= MAX_STATUS_CALLS_PER_CLIENT_PER_DAY + 2 && status !== 429) {
    status = (await statusCall(srv, 'order_nobody', 'A'.repeat(32), ip)).status;
    n += 1;
  }
  assert.equal(status, 429);
  assert.equal(n, MAX_STATUS_CALLS_PER_CLIENT_PER_DAY + 1);
  // the order / verify budget is separate: this IP can still create an order
  assert.equal((await request(srv.port, GUEST_ORDER_PATH, { body: { sku: 'till_boards', phone: OTHER_PHONE }, headers: ip })).status, 200);
});

test('PR · the receipt proof the status route returns is byte-for-byte what Razorpay\'s handler gives (isCheckoutSignatureValid agrees)', async (t) => {
  const { isCheckoutSignatureValid } = require('./payments.cjs');
  const srv = await startRoutes({ env: PR_ENV });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'till_boards', phone: PHONE });
  const p = srv.rzp.pay(o.json.orderId);
  const r = await statusCall(srv, o.json.orderId, o.json.statusProof);
  assert.equal(isCheckoutSignatureValid({ orderId: o.json.orderId, paymentId: p.id, signature: r.json.receipt.signature, keySecret: KEY_SECRET }), true);
});

test('PR · concurrent status calls alone: the purchase event, the invoice step and the receipt each fire exactly ONCE (only the call that moved created -> paid_unclaimed fires them)', async (t) => {
  let paidEvents = 0;
  let receipts = 0;
  const serverEvents = { orderPaid: async () => { paidEvents += 1; }, orderCreated: async () => {}, signalsField: () => ({}), metaOn: true, ga4On: false };
  const receiptEmailer = { sendForPayment: async () => { receipts += 1; }, sendRecipientReady: async () => {} };
  const srv = await startRoutes({ env: PR_ENV, serverEvents, receiptEmailer });
  t.after(srv.close);
  const o = await guestOrder(srv, { sku: 'pack_cbq', target: 'maths', phone: PHONE });
  srv.rzp.pay(o.json.orderId, { email: 'buyer@example.com' });
  const rs = await Promise.all([1, 2, 3, 4].map(() => statusCall(srv, o.json.orderId, o.json.statusProof)));
  for (const r of rs) assert.equal(r.json.status, 'paid_unclaimed');
  await srv.idle();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(paidEvents, 1);
  assert.equal(receipts, 1);
  await statusCall(srv, o.json.orderId, o.json.statusProof);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(paidEvents, 1, 'a later status call fires nothing');
  assert.equal(receipts, 1);
});

// ---- META-IC-1: the server sends InitiateCheckout for EVERY guest order route, once per created order ------------------------
function icRecorder() {
  const created = [];
  return {
    created,
    serverEvents: {
      signalsField: (body) => ({ adSignals: { attemptId: body && body.adSignals && body.adSignals.attemptId } }),
      orderCreated: async (a) => { created.push(a); },
      orderPaid: async () => {},
      metaOn: true,
      ga4On: false,
    },
  };
}

test('META-IC-1 · pay-by-phone, pay-for-someone and pay-for-myself orders each fire ONE orderCreated carrying the browser attempt id; a refused order fires none', async (t) => {
  const rec = icRecorder();
  const srv = await startRoutes({ env: PR_ENV, serverEvents: rec.serverEvents });
  t.after(srv.close);
  const phone = await guestOrder(srv, { sku: 'till_boards', phone: PHONE, adSignals: { attemptId: 'lt_ic_phone_001' } });
  assert.equal(phone.status, 200, phone.text);
  const who = await whoOrder(srv, { sku: 'till_boards', recipient: { email: EMAIL }, adSignals: { attemptId: 'lt_ic_who_0001' } });
  assert.equal(who.status, 200, who.text);
  const self = await selfOrder(srv, { sku: 'pack_cbq', target: 'maths', adSignals: { attemptId: 'lt_ic_self_001' } });
  assert.equal(self.status, 200, self.text);
  await srv.idle();
  assert.deepEqual(rec.created.map((c) => [c.orderId, c.passType, c.amountPaise, c.uid, c.signals.attemptId]), [
    [phone.json.orderId, 'till_boards', phone.json.amountPaise, null, 'lt_ic_phone_001'],
    [who.json.orderId, 'till_boards', who.json.amountPaise, null, 'lt_ic_who_0001'],
    [self.json.orderId, 'pack_cbq', self.json.amountPaise, null, 'lt_ic_self_001'],
  ]);
  const before = rec.created.length;
  const bad = await guestOrder(srv, { sku: 'not_a_sku', phone: PHONE, adSignals: { attemptId: 'lt_ic_bad_00001' } });
  assert.notEqual(bad.status, 200);
  await srv.idle();
  assert.equal(rec.created.length, before, 'no order -> no InitiateCheckout');
});

/* ── LATE-AUTH-GUARD-1 v1.1 · guest verify + PAY-RETURN order-status: payment age only; a refusal is PENDING ──────────── */
{
  const MIN = 60 * 1000;
  const secs = (msValue) => Math.floor(msValue / 1000);
  const captures = (srv) => srv.rzp.calls.filter((c) => c.method === 'POST' && c.url.endsWith('/capture'));
  async function lateGuest(t, { env = PR_ENV } = {}) {
    const clock = { t: NOW };
    const srv = await startRoutes({ env, nowFn: () => clock.t });
    t.after(srv.close);
    const o = await guestOrder(srv, { sku: 'till_boards', phone: PHONE });
    assert.equal(o.status, 200, o.text);
    return { srv, clock, o };
  }

  test('LATE-AUTH · guest: a 20-minute-old order + a fresh payment authorised within seconds is captured and recorded', async (t) => {
    const { srv, clock, o } = await lateGuest(t);
    clock.t = NOW + 20 * MIN;
    const p = srv.rzp.pay(o.json.orderId, { status: 'authorized' });
    p.created_at = secs(clock.t - 5 * 1000);
    const v = await guestVerify(srv, o.json.orderId, p.id);
    assert.equal(v.status, 200, v.text);
    assert.equal(captures(srv).length, 1);
    assert.equal(srv.db.read(`payOrders/${o.json.orderId}`).status, 'paid_unclaimed');
  });

  test('LATE-AUTH · guest order-status: authorised 11:30 after it began, still authorised at 11:35 -> PENDING (not failed), not captured', async (t) => {
    const { srv, clock, o } = await lateGuest(t);
    const p = srv.rzp.pay(o.json.orderId, { status: 'authorized' });
    p.created_at = secs(NOW);
    clock.t = NOW + 11 * MIN + 35 * 1000;
    const r = await statusCall(srv, o.json.orderId, o.json.statusProof);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual([r.json.status, r.json.reason], ['pending', 'awaiting_bank']);
    assert.equal(captures(srv).length, 0);
    assert.equal(srv.db.read(`payOrders/${o.json.orderId}`).status, 'created');
  });

  test('LATE-AUTH · guest: still authorised at 13 min -> verify and order-status PENDING, never captured; Razorpay\'s refund then reads FAILED', async (t) => {
    const { srv, clock, o } = await lateGuest(t);
    const p = srv.rzp.pay(o.json.orderId, { status: 'authorized' });
    p.created_at = secs(NOW);
    clock.t = NOW + 13 * MIN;
    const v = await guestVerify(srv, o.json.orderId, p.id);
    assert.equal(v.status, 202, v.text);
    assert.deepEqual(v.json, { ok: false, status: 'pending', reason: 'awaiting_bank' }, 'a refused capture is never "rejected"');
    const r = await statusCall(srv, o.json.orderId, o.json.statusProof);
    assert.deepEqual([r.json.status, r.json.reason], ['pending', 'awaiting_bank']);
    assert.equal(captures(srv).length, 0, 'a late authorisation was captured by us');
    assert.equal(srv.db.read(`payOrders/${o.json.orderId}`).status, 'created');
    assert.ok(srv.events.includes('payments.guest.verify.left_uncaptured'));
    // Razorpay refunds the late authorisation: the pending order can now end.
    srv.rzp.payments.get(p.id).status = 'refunded';
    clock.t = NOW + 20 * MIN;
    const after = await statusCall(srv, o.json.orderId, o.json.statusProof);
    assert.deepEqual([after.json.status, after.json.reason], ['failed', 'refunded']);
    assert.equal(captures(srv).length, 0);
  });

  test('LATE-AUTH · guest: a payment Razorpay already CAPTURED (13 min old) is recorded exactly as today (verify and order-status)', async (t) => {
    const { srv, clock, o } = await lateGuest(t);
    const p = srv.rzp.pay(o.json.orderId);
    p.created_at = secs(NOW);
    clock.t = NOW + 13 * MIN;
    const r = await statusCall(srv, o.json.orderId, o.json.statusProof);
    assert.equal(r.json.status, 'paid_unclaimed', r.text);
    const v = await guestVerify(srv, o.json.orderId, p.id);
    assert.equal(v.status, 200, v.text);
  });

  test('LATE-AUTH · guest kill switch LATE_AUTH_GUARD_DISABLED=1: a 13-min-old authorisation is captured (exactly the old behaviour)', async (t) => {
    const { srv, clock, o } = await lateGuest(t, { env: { ...PR_ENV, LATE_AUTH_GUARD_DISABLED: '1' } });
    const p = srv.rzp.pay(o.json.orderId, { status: 'authorized' });
    p.created_at = secs(NOW);
    clock.t = NOW + 13 * MIN;
    const v = await guestVerify(srv, o.json.orderId, p.id);
    assert.equal(v.status, 200, v.text);
    assert.equal(captures(srv).length, 1);
    assert.equal(srv.db.read(`payOrders/${o.json.orderId}`).status, 'paid_unclaimed');
  });
}
