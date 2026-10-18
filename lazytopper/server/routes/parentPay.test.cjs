// ASK-PARENTS-PAY-1 — a parent pays for their child from a link the child sends.
//
// Money path for a payer who is NOT signed in. Every test below is a reason a link, an order
// or a payment is NOT believed — or proof that the grant lands on the CHILD's uid and never
// anywhere else.
//
//   L* the link: minting (auth, dark, rate), the token (opaque, hashed, tamper, expiry)
//   O* the order: bound to the link's child, server-priced, single use, capped
//   V* verify: signature, link binding, Razorpay's record, grant to the child, idempotent
//   W* the unchanged webhook grants a parent order to the child too
//   P* privacy: what the parent can learn
//
// ★ MUTATIONS (run against THIS file only, each shown red, each restored):
//   M1 parentPay.cjs handleOrder stores `uid` from the request body
//        -> "O · a uid / amount in the body is ignored: the order is the LINK's child at the SERVER price" red
//   M2 parentPay.cjs handleVerify skips the parentLinkId check
//        -> "V · an order from ANOTHER link (or the child's own checkout) is refused" red
//   M3 parentPay.cjs resolveLink skips the expiry check
//        -> "L · an EXPIRED link cannot view or order" red
//
// Run: node --test lazytopper/server/routes/parentPay.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');

const {
  createParentPayRoutes,
  isParentPayEnabled,
  firstNameOf,
  linkIdOf,
  mintToken,
  PARENT_LINK_PATH,
  PARENT_VIEW_PATH,
  PARENT_ORDER_PATH,
  PARENT_VERIFY_PATH,
  LINK_TTL_MS,
  MAX_ORDERS_PER_LINK,
  MAX_LINKS_PER_UID_PER_DAY,
  TOKEN_PATTERN,
} = require('./parentPay.cjs');
const { createPaymentRoutes, PAY_ORDER_PATH, PAY_WEBHOOK_PATH } = require('./payments.cjs');
const { createHttpUtils } = require('../services/httpUtils.cjs');

const KEY_ID = 'rzp_test_KEYID';
const KEY_SECRET = 'test_key_secret_never_sent';
const WEBHOOK_SECRET = 'test_webhook_secret';
const ENV_ON = {
  PAYMENTS_ENABLED: '1',
  PARENT_PAY_ENABLED: '1',
  RAZORPAY_KEY_ID: KEY_ID,
  RAZORPAY_KEY_SECRET: KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
};
const istNoon = (isoDate) => Date.parse(`${isoDate}T12:00:00+05:30`);
const NOW = istNoon('2026-09-27');
const ms = (v) => (v instanceof Date ? v.getTime() : v);
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');
const checkoutSig = (orderId, paymentId, secret = KEY_SECRET) => hmac(secret, `${orderId}|${paymentId}`);

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
    read: (key) => (docs.get(key) ? { ...docs.get(key).data } : undefined),
    keys: (prefix) => [...docs.keys()].filter((k) => k.startsWith(prefix)),
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

/* ── parent-pay routes AND the existing payment routes, behind one real HTTP server ── */
async function startRoutes({ env = ENV_ON, db = memoryFirestore(), rzp = fakeRazorpay(), clock, displayNames = { child1: 'Aarav Sharma' } } = {}) {
  const { sendJson } = createHttpUtils('*');
  const events = [];
  const telemetry = { increment: (e) => events.push(e) };
  const c = clock || { t: NOW };
  const now = () => c.t;
  const verifiedCaller = {
    async resolveVerifiedUid(req) {
      const h = String(req.headers.authorization || '');
      return h.startsWith('Bearer uid:') ? h.slice('Bearer uid:'.length) : '';
    },
  };
  const parent = createParentPayRoutes({
    sendJson, verifiedCaller, adminFirestore: db, telemetry, env, fetchImpl: rzp.fetchImpl, now,
    foundingOfferOpen: true,
    getDisplayName: async (uid) => displayNames[uid] || '',
  });
  const pay = createPaymentRoutes({
    sendJson, verifiedCaller, adminFirestore: db, telemetry, env, fetchImpl: rzp.fetchImpl, now, foundingOfferOpen: true,
  });
  const table = {
    [PARENT_LINK_PATH]: parent.handleMintLink,
    [PARENT_VIEW_PATH]: parent.handleView,
    [PARENT_ORDER_PATH]: parent.handleOrder,
    [PARENT_VERIFY_PATH]: parent.handleVerify,
    [PAY_ORDER_PATH]: pay.handleOrder,
    [PAY_WEBHOOK_PATH]: pay.handleWebhook,
  };
  const server = http.createServer((req, res) => {
    const h = req.method === 'POST' ? table[String(req.url).split('?')[0]] : null;
    if (!h) return sendJson(res, 404, { error: 'Not Found' });
    return Promise.resolve(h(req, res)).catch((e) => sendJson(res, 500, { error: e.message }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return { port, db, rzp, events, clock: c, close: () => new Promise((r) => server.close(r)) };
}

let ipSeq = 0;
function request(port, urlPath, { body, raw, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = raw !== undefined ? raw : JSON.stringify(body === undefined ? {} : body);
    const req = http.request(
      { host: '127.0.0.1', port, path: urlPath, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers } },
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
const asUid = (uid) => ({ Authorization: `Bearer uid:${uid}` });

async function mint(srv, uid = 'child1') {
  const r = await request(srv.port, PARENT_LINK_PATH, { headers: asUid(uid) });
  assert.equal(r.status, 200, r.text);
  return r.json;
}
async function parentOrder(srv, token, passType = 'month', extra = {}, headers = {}) {
  return request(srv.port, PARENT_ORDER_PATH, { body: { token, passType, ...extra }, headers });
}
async function parentVerify(srv, token, orderId, paymentId, headers = {}, signature = checkoutSig(orderId, paymentId)) {
  return request(srv.port, PARENT_VERIFY_PATH, { body: { token, orderId, paymentId, signature }, headers });
}
function webhookBody(payment) {
  return `{"entity":"event","event":"payment.captured","payload":{"payment":{"entity":${JSON.stringify(payment, null, 1)}}}}`;
}

/* ══════════════════════════════════════════════════════════════════════════
   Dark by default
   ══════════════════════════════════════════════════════════════════════════ */

test('DARK · the switch needs BOTH PAYMENTS_ENABLED and PARENT_PAY_ENABLED', () => {
  assert.equal(isParentPayEnabled({ PAYMENTS_ENABLED: '1', PARENT_PAY_ENABLED: '1' }), true);
  assert.equal(isParentPayEnabled({ PAYMENTS_ENABLED: '1' }), false);
  assert.equal(isParentPayEnabled({ PARENT_PAY_ENABLED: '1' }), false);
  assert.equal(isParentPayEnabled({ PAYMENTS_ENABLED: '1', PARENT_PAY_ENABLED: 'enabled' }), false);
  assert.equal(isParentPayEnabled({}), false);
});

test('DARK · with either switch off all four routes answer 404 and touch nothing', async (t) => {
  for (const env of [
    { ...ENV_ON, PARENT_PAY_ENABLED: '' },
    { ...ENV_ON, PAYMENTS_ENABLED: '0' },
  ]) {
    const srv = await startRoutes({ env });
    t.after(srv.close);
    for (const p of [PARENT_LINK_PATH, PARENT_VIEW_PATH, PARENT_ORDER_PATH, PARENT_VERIFY_PATH]) {
      const r = await request(srv.port, p, { body: { token: 'x'.repeat(43), passType: 'month' }, headers: asUid('child1') });
      assert.equal(r.status, 404, p);
      assert.deepEqual(r.json, { error: 'Not Found' });
    }
    assert.equal(srv.rzp.calls.length, 0);
    assert.equal(srv.db.docs.size, 0);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   L — the link
   ══════════════════════════════════════════════════════════════════════════ */

test('L · a signed-out caller cannot mint a link (401) and nothing is stored', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const r = await request(srv.port, PARENT_LINK_PATH, {});
  assert.equal(r.status, 401);
  assert.equal(srv.db.docs.size, 0);
});

test('L · the token is 256-bit, opaque, shown once, and stored ONLY as its SHA-256 with the child uid as a field', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const out = await mint(srv);
  assert.match(out.token, TOKEN_PATTERN);
  assert.equal(Buffer.from(out.token, 'base64url').length, 32);
  assert.notEqual(out.token, mintToken());
  // The token is opaque: it does not encode the uid or the name.
  const decoded = Buffer.from(out.token, 'base64url').toString('latin1');
  assert.ok(!decoded.includes('child1') && !decoded.includes('Aarav'));
  const keys = srv.db.keys('parentPayLinks/');
  assert.deepEqual(keys, [`parentPayLinks/${linkIdOf(out.token)}`]);
  assert.ok(!JSON.stringify([...srv.db.docs]).includes(out.token), 'the raw token was stored');
  const link = srv.db.read(keys[0]);
  assert.deepEqual(Object.keys(link).sort(), ['createdAt', 'expiresAt', 'firstName', 'orderIds', 'status', 'uid']);
  assert.equal(link.uid, 'child1');
  assert.equal(link.firstName, 'Aarav', 'first name only — never the surname');
  assert.equal(link.status, 'open');
  assert.equal(ms(link.expiresAt) - ms(link.createdAt), LINK_TTL_MS);
  // The child's message is built from the SERVER price.
  assert.deepEqual(out.prices, { month: 599, till_boards: 2396 });
  assert.equal(out.expiresAt, new Date(NOW + LINK_TTL_MS).toISOString());
  assert.ok(!('uid' in out));
});

test('L · a child may mint at most MAX_LINKS_PER_UID_PER_DAY links a day', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  for (let i = 0; i < MAX_LINKS_PER_UID_PER_DAY; i += 1) await mint(srv);
  const r = await request(srv.port, PARENT_LINK_PATH, { headers: asUid('child1') });
  assert.equal(r.status, 429);
  assert.equal(srv.db.keys('parentPayLinks/').length, MAX_LINKS_PER_UID_PER_DAY);
});

test('L · view: a live link shows the first name and the child\'s server prices — and nothing else', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const r = await request(srv.port, PARENT_VIEW_PATH, { body: { token } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json).sort(), ['expiresAt', 'firstName', 'ok', 'prices']);
  assert.equal(r.json.firstName, 'Aarav');
  assert.deepEqual(r.json.prices, { month: 599, till_boards: 2396 });
  assert.ok(!r.text.includes('child1'), 'the uid reached the parent');
});

test('L · a TAMPERED, malformed or unknown token is refused (404) and starts nothing', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const flipped = (token[0] === 'A' ? 'B' : 'A') + token.slice(1);
  for (const bad of [flipped, token.slice(0, 42), `${token}x`, '', null, 42, '../../x', linkIdOf(token)]) {
    for (const p of [PARENT_VIEW_PATH, PARENT_ORDER_PATH]) {
      const r = await request(srv.port, p, { body: { token: bad, passType: 'month' } });
      assert.equal(r.status, 404, `${p} ${String(bad)}`);
      assert.equal(r.json.reason, 'invalid');
    }
  }
  assert.equal(srv.rzp.calls.length, 0);
});

test('L · an EXPIRED link cannot view or order (410 expired)', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  srv.clock.t = NOW + LINK_TTL_MS;
  for (const p of [PARENT_VIEW_PATH, PARENT_ORDER_PATH]) {
    const r = await request(srv.port, p, { body: { token, passType: 'month' } });
    assert.equal(r.status, 410, p);
    assert.equal(r.json.reason, 'expired');
  }
  srv.clock.t = NOW + LINK_TTL_MS - 1;
  assert.equal((await request(srv.port, PARENT_VIEW_PATH, { body: { token } })).status, 200, 'one ms before expiry is live');
  assert.equal(srv.rzp.calls.length, 0);
});

test('L · a link whose child was ERASED (uid "erased" or deleted) is invalid', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  await srv.db.collection('parentPayLinks').doc(linkIdOf(token)).set({ uid: 'erased' }, { merge: true });
  const r = await request(srv.port, PARENT_VIEW_PATH, { body: { token } });
  assert.equal(r.status, 404);
});

/* ══════════════════════════════════════════════════════════════════════════
   O — the order
   ══════════════════════════════════════════════════════════════════════════ */

test('O · a uid / amount in the body is ignored: the order is the LINK\'s child at the SERVER price', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const r = await parentOrder(srv, token, 'month', { uid: 'attacker', amount: 100, amountPaise: 100 }, asUid('parentOwnAccount'));
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json).sort(), ['amountPaise', 'keyId', 'ok', 'orderId']);
  assert.equal(r.json.amountPaise, 59900);
  const sent = srv.rzp.calls.find((c) => c.method === 'POST' && c.url.endsWith('/v1/orders'));
  assert.equal(sent.body.amount, 59900);
  assert.deepEqual(sent.body.notes, { uid: 'child1', passType: 'month', offerKey: 'founding', payer: 'parent' });
  const stored = srv.db.read(`payOrders/${r.json.orderId}`);
  assert.equal(stored.uid, 'child1', 'the order is not bound to the child');
  assert.equal(stored.payer, 'parent');
  assert.equal(stored.parentLinkId, linkIdOf(token));
  assert.equal(stored.status, 'created');
  assert.deepEqual(srv.db.read(`parentPayLinks/${linkIdOf(token)}`).orderIds, [r.json.orderId]);
  assert.ok(!JSON.stringify(stored).includes(token), 'the raw token reached the order');
});

test('O · till-boards is priced from the CHILD\'s subscription (a founding child keeps founding)', async (t) => {
  const db = memoryFirestore({ 'subscriptions/child1': { foundingMember: true } });
  const srv = await startRoutes({ db });
  t.after(srv.close);
  const { token } = await mint(srv);
  const r = await parentOrder(srv, token, 'till_boards');
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.amountPaise, 239600);
});

test('O · an unknown passType is refused before Razorpay is called', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const r = await parentOrder(srv, token, 'forever');
  assert.equal(r.status, 400);
  assert.equal(srv.rzp.calls.length, 0);
});

test('O · a link can start at most MAX_ORDERS_PER_LINK orders', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  for (let i = 0; i < MAX_ORDERS_PER_LINK; i += 1) assert.equal((await parentOrder(srv, token)).status, 200);
  const r = await parentOrder(srv, token);
  assert.equal(r.status, 429);
  assert.equal(r.json.reason, 'too_many_orders');
});

test('O · per-IP throttle on the unauthenticated routes', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  let last;
  for (let i = 0; i < 61; i += 1) {
    last = await request(srv.port, PARENT_VIEW_PATH, { body: { token: 'y'.repeat(43) }, headers: { 'X-Forwarded-For': '203.0.113.9' } });
  }
  assert.equal(last.status, 429);
  const other = await request(srv.port, PARENT_VIEW_PATH, { body: { token: 'y'.repeat(43) }, headers: { 'X-Forwarded-For': '203.0.113.10' } });
  assert.equal(other.status, 404, 'another IP is not throttled');
});

/* ══════════════════════════════════════════════════════════════════════════
   V — verify and the grant
   ══════════════════════════════════════════════════════════════════════════ */

test('V · VALID payment -> the pass is granted to the CHILD, never to the (signed-in) parent; link spent', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const { json: o } = await parentOrder(srv, token);
  const p = srv.rzp.pay(o.orderId);
  const r = await parentVerify(srv, token, o.orderId, p.id, asUid('parentOwnAccount'));
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json).sort(), ['amountPaise', 'firstName', 'ok', 'passEnd', 'replayed']);
  assert.equal(r.json.replayed, false);
  assert.equal(r.json.firstName, 'Aarav');
  assert.equal(r.json.passEnd, new Date(istNoon('2026-10-27')).toISOString());
  assert.ok(!r.text.includes('child1'), 'the uid reached the parent');
  const sub = srv.db.read('subscriptions/child1');
  assert.equal(sub.tier, 'premium');
  assert.equal(sub.lastPaymentRef, p.id);
  assert.equal(srv.db.read('subscriptions/parentOwnAccount'), undefined, 'the PARENT got a pass');
  assert.equal(srv.db.keys('subscriptions/').filter((k) => !k.startsWith('subscriptions/child1')).length, 0);
  assert.equal(srv.db.read(`payOrders/${o.orderId}`).status, 'paid');
  const link = srv.db.read(`parentPayLinks/${linkIdOf(token)}`);
  assert.equal(link.status, 'paid');
  assert.equal(link.paidOrderId, o.orderId);
  // SINGLE USE: the link now refuses to view or to start another payment.
  for (const path of [PARENT_VIEW_PATH, PARENT_ORDER_PATH]) {
    const again = await request(srv.port, path, { body: { token, passType: 'month' } });
    assert.equal(again.status, 410, path);
    assert.equal(again.json.reason, 'used');
  }
});

test('V · REPLAYED verify (and concurrent verifies) grant ONCE', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const { json: o } = await parentOrder(srv, token);
  const p = srv.rzp.pay(o.orderId);
  const results = await Promise.all([1, 2, 3].map(() => parentVerify(srv, token, o.orderId, p.id)));
  for (const r of results) assert.equal(r.status, 200, r.text);
  assert.equal(results.filter((r) => r.json.replayed === false).length, 1);
  const later = await parentVerify(srv, token, o.orderId, p.id);
  assert.equal(later.status, 200, 'a retry after the link is spent still answers');
  assert.equal(later.json.replayed, true);
  assert.equal(ms(srv.db.read('subscriptions/child1').passEnd), istNoon('2026-10-27'), 'exactly one month');
});

test('V · INVALID signature -> 400, no grant', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const { json: o } = await parentOrder(srv, token);
  const p = srv.rzp.pay(o.orderId);
  for (const sig of [checkoutSig(o.orderId, p.id, 'wrong'), checkoutSig(o.orderId, 'pay_other'), '0'.repeat(64)]) {
    const r = await parentVerify(srv, token, o.orderId, p.id, {}, sig);
    assert.equal(r.status, 400);
    assert.equal(r.json.reason, 'bad_signature');
  }
  assert.equal(srv.db.read('subscriptions/child1'), undefined);
});

test('V · an order from ANOTHER link (or the child\'s own checkout) is refused', async (t) => {
  const srv = await startRoutes({ displayNames: { child1: 'Aarav', child2: 'Diya' } });
  t.after(srv.close);
  const a = await mint(srv, 'child1');
  const b = await mint(srv, 'child2');
  const { json: oB } = await parentOrder(srv, b.token);
  const pB = srv.rzp.pay(oB.orderId);
  // Link A presenting link B's (validly signed, captured) payment.
  const cross = await parentVerify(srv, a.token, oB.orderId, pB.id);
  assert.equal(cross.status, 400);
  assert.equal(cross.json.reason, 'link_mismatch');
  // A child's own order is not a parent order.
  const own = await request(srv.port, PAY_ORDER_PATH, { body: { passType: 'month' }, headers: asUid('child1') });
  const pOwn = srv.rzp.pay(own.json.orderId);
  const viaLink = await parentVerify(srv, a.token, own.json.orderId, pOwn.id);
  assert.equal(viaLink.status, 400);
  assert.equal(viaLink.json.reason, 'link_mismatch');
  assert.equal(srv.db.read('subscriptions/child1'), undefined);
  assert.equal(srv.db.read('subscriptions/child2'), undefined);
});

test('V · a link whose order uid was changed underneath it is refused (uid_mismatch)', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const { json: o } = await parentOrder(srv, token);
  await srv.db.collection('payOrders').doc(o.orderId).set({ uid: 'someoneElse' }, { merge: true });
  const p = srv.rzp.pay(o.orderId);
  const r = await parentVerify(srv, token, o.orderId, p.id);
  assert.equal(r.status, 400);
  assert.equal(r.json.reason, 'uid_mismatch');
  assert.equal(srv.db.read('subscriptions/someoneElse'), undefined);
});

test('V · TAMPERED amount / wrong order / not captured / wrong currency -> 400, no grant', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const cases = [
    [{ amount: 100 }, 'amount_mismatch'],
    [{ currency: 'USD' }, 'currency_mismatch'],
    [{ status: 'failed' }, 'not_captured'],
  ];
  for (const [over, reason] of cases) {
    const { token } = await mint(srv);
    const { json: o } = await parentOrder(srv, token);
    const p = srv.rzp.pay(o.orderId, { id: `pay_${reason}`, ...over });
    const r = await parentVerify(srv, token, o.orderId, p.id);
    assert.equal(r.status, 400, reason);
    assert.equal(r.json.reason, reason);
  }
  assert.equal(srv.db.read('subscriptions/child1'), undefined);
});

test('V · an AUTHORIZED payment is captured for the STORED amount, then granted', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const { json: o } = await parentOrder(srv, token);
  const p = srv.rzp.pay(o.orderId, { status: 'authorized' });
  const r = await parentVerify(srv, token, o.orderId, p.id);
  assert.equal(r.status, 200, r.text);
  const cap = srv.rzp.calls.find((c) => c.url.endsWith('/capture'));
  assert.equal(cap.body.amount, 59900);
});

test('V · a payment captured after the link EXPIRED, for an order made while it was live, is still honoured', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const { json: o } = await parentOrder(srv, token);
  const p = srv.rzp.pay(o.orderId);
  srv.clock.t = NOW + LINK_TTL_MS + 60 * 1000;
  const r = await parentVerify(srv, token, o.orderId, p.id);
  assert.equal(r.status, 200, r.text);
  assert.equal(srv.db.read('subscriptions/child1').tier, 'premium');
});

/* ══════════════════════════════════════════════════════════════════════════
   W — the unchanged webhook
   ══════════════════════════════════════════════════════════════════════════ */

test('W · parent closes the tab before verify: the existing webhook grants the CHILD, and the link is then spent', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const { json: o } = await parentOrder(srv, token);
  const p = srv.rzp.pay(o.orderId);
  const raw = webhookBody(p);
  const hook = await request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, raw) } });
  assert.equal(hook.status, 200, hook.text);
  assert.equal(srv.db.read('subscriptions/child1').tier, 'premium');
  // The link did not see verify, but it re-reads its orders: no second payment.
  const again = await parentOrder(srv, token);
  assert.equal(again.status, 410);
  assert.equal(again.json.reason, 'used');
  assert.equal(srv.db.read(`parentPayLinks/${linkIdOf(token)}`).status, 'paid');
  // And a late verify of the same payment grants nothing more.
  const late = await parentVerify(srv, token, o.orderId, p.id);
  assert.equal(late.json.replayed, true);
  assert.equal(ms(srv.db.read('subscriptions/child1').passEnd), istNoon('2026-10-27'));
});

/* ══════════════════════════════════════════════════════════════════════════
   P — privacy
   ══════════════════════════════════════════════════════════════════════════ */

test('P · firstNameOf keeps the first word of letters only, else nothing', () => {
  assert.equal(firstNameOf('Aarav Sharma'), 'Aarav');
  assert.equal(firstNameOf('  diya  '), 'diya');
  assert.equal(firstNameOf('आरव शर्मा'), 'आरव');
  assert.equal(firstNameOf("D'Souza"), "D'Souza");
  for (const bad of ['', null, undefined, 'a@b.com', '9876543210', '<script>', 'x'.repeat(25), 'R2D2']) {
    assert.equal(firstNameOf(bad), '', String(bad));
  }
});

test('P · a child with no usable display name: the link carries no name at all', async (t) => {
  const srv = await startRoutes({ displayNames: { child1: 'kid@example.com' } });
  t.after(srv.close);
  const { token } = await mint(srv);
  assert.equal(srv.db.read(`parentPayLinks/${linkIdOf(token)}`).firstName, '');
  const r = await request(srv.port, PARENT_VIEW_PATH, { body: { token } });
  assert.equal(r.json.firstName, '');
  assert.ok(!r.text.includes('example.com'));
});

test('P · the key SECRET never reaches a parent response', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const o = await parentOrder(srv, token);
  assert.equal(o.json.keyId, KEY_ID);
  assert.ok(!o.text.includes(KEY_SECRET));
});

/* ══════════════════════════════════════════════════════════════════════════
   Over the REAL index.cjs — mounted, and dark by default
   ══════════════════════════════════════════════════════════════════════════ */

const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const INDEX_CJS = path.resolve(__dirname, '..', 'index.cjs');

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
      auth: () => ({ verifyIdToken: async () => { throw new Error('no'); }, getUser: async () => ({}) }),
      firestore: () => ({ collection: (n) => ({ doc: (id) => mkRef(n + '/' + id) }), async runTransaction() { throw new Error('unused'); } }),
    };
    const orig = Module._load;
    Module._load = function (r) { return r === 'firebase-admin' ? fake : orig.apply(this, arguments); };
    require(${JSON.stringify(INDEX_CJS)});
  `;
  const env = { ...process.env, PORT: String(port), VITE_FIREBASE_PROJECT_ID: 'demo-parent-pay-1' };
  for (const k of ['GEMINI_API_KEY', 'DIRECT_GEMINI_API_KEY', 'REPLIT_GEMINI_BASE_URL', 'REPLIT_ANTHROPIC_BASE_URL', 'DATABASE_URL',
    'PAYMENTS_ENABLED', 'PARENT_PAY_ENABLED', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']) delete env[k];
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

test('REAL index.cjs · PARENT_PAY_ENABLED off (payments ON): the four routes are byte-identical to an unknown path', { timeout: 90000 }, async (t) => {
  const port = await freePort();
  const { PARENT_PAY_ENABLED: _off, ...paymentsOnly } = ENV_ON;
  const srv = bootServer({ port, env: paymentsOnly });
  t.after(() => srv.child.kill());
  await srv.ready;
  const control = await request(port, '/api/pay/no-such-route', { body: {} });
  assert.equal(control.status, 404);
  for (const p of [PARENT_LINK_PATH, PARENT_VIEW_PATH, PARENT_ORDER_PATH, PARENT_VERIFY_PATH]) {
    const r = await request(port, p, { body: { token: 'z'.repeat(43) } });
    assert.equal(r.status, 404, p);
    assert.equal(r.text, control.text, `${p} is distinguishable from an unknown path while dark`);
  }
});

test('REAL index.cjs · switched ON: mounted (signed-out mint -> 401, unknown token -> 404 invalid)', { timeout: 90000 }, async (t) => {
  const port = await freePort();
  const srv = bootServer({ port, env: ENV_ON });
  t.after(() => srv.child.kill());
  await srv.ready;
  const mintR = await request(port, PARENT_LINK_PATH, { body: {} });
  assert.equal(mintR.status, 401, mintR.text);
  const view = await request(port, PARENT_VIEW_PATH, { body: { token: 'z'.repeat(43) } });
  assert.equal(view.status, 404, view.text);
  assert.equal(view.json.reason, 'invalid');
});
