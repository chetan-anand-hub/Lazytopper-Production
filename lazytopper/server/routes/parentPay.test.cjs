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
  MAX_PACK_LINKS_PER_UID_PER_DAY,
  MAX_PARENT_CALLS_PER_CLIENT_PER_DAY,
  TOKEN_PATTERN,
  createParentPayLimiter,
  coveredTillBoards,
} = require('./parentPay.cjs');
const { createRateLimiter, ANONYMOUS_CLASS } = require('../services/rateLimiter.cjs');
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

/* ── parent-pay routes AND the existing payment routes, behind one real HTTP server ── */
async function startRoutes({ env = ENV_ON, db = memoryFirestore(), rzp = fakeRazorpay(), clock, displayNames = { child1: 'Aarav Sharma' }, rateLimiter } = {}) {
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
    ...(rateLimiter ? { rateLimiter } : {}),
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
  assert.deepEqual(Object.keys(link).sort(), ['createdAt', 'expiresAt', 'firstName', 'orderIds', 'orderSlots', 'status', 'uid']);
  assert.equal(link.uid, 'child1');
  assert.equal(link.firstName, 'Aarav', 'first name only — never the surname');
  assert.equal(link.status, 'open');
  assert.equal(ms(link.expiresAt) - ms(link.createdAt), LINK_TTL_MS);
  // The child's message is built from the SERVER price.
  assert.deepEqual(out.prices, { month: null, till_boards: 1917 });
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
  assert.deepEqual(r.json.prices, { month: null, till_boards: 1917 });
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
  assert.equal(r.json.amountPaise, 191700);
});

const seedChildPack = (db, uid, packId, extra = {}) =>
  db.docs.set(`packEntitlements/${uid}/packs/${packId}`, { data: { packId, sku: 'pack_chapter', target: 'triangles', pricePaidInr: 49, paidAt: NOW - 1000, orderId: 'o_seed', paymentRef: 'p_seed', creditedToPass: false, ...extra }, version: 1 });

test('PACK-CREDIT-1 · O · a Board Pass order made through a parent link is credited with the CHILD\'s recent pack, in Razorpay, the notes and the stored order', async (t) => {
  const plain = await startRoutes();
  t.after(plain.close);
  const { token: t0 } = await mint(plain);
  const full = (await parentOrder(plain, t0, 'till_boards')).json.amountPaise;

  const db = memoryFirestore();
  seedChildPack(db, 'child1', 'pack_chapter:triangles');
  const srv = await startRoutes({ db });
  t.after(srv.close);
  const { token } = await mint(srv);
  const r = await parentOrder(srv, token, 'till_boards', { packCreditInr: 9999, amountPaise: 100 }, asUid('parentOwnAccount'));
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.amountPaise, full - 4900);
  const sent = srv.rzp.calls.find((c) => c.method === 'POST' && c.url.endsWith('/v1/orders'));
  assert.equal(sent.body.amount, full - 4900);
  assert.equal(sent.body.notes.packCreditInr, '49');
  assert.equal(sent.body.notes.packCreditIds, 'pack_chapter:triangles');
  assert.equal(sent.body.notes.uid, 'child1');
  const stored = srv.db.read(`payOrders/${r.json.orderId}`);
  assert.equal(stored.amountPaise, full - 4900);
  assert.equal(stored.packCreditInr, 49);
  assert.equal(stored.packCreditIds, 'pack_chapter:triangles');
  assert.ok(srv.events.includes('payments.parent.order.pack_credit_applied'));
});

test('PACK-CREDIT-1 · O · parent path: month pass no credit; the PARENT\'s own uid is never read for packs; an unreadable list is credit 0 and the order still goes through', async (t) => {
  const db = memoryFirestore();
  seedChildPack(db, 'child1', 'pack_chapter:triangles');
  seedChildPack(db, 'parentOwnAccount', 'pack_chapter:circles');
  const srv = await startRoutes({ db });
  t.after(srv.close);
  const m = await mint(srv);
  const month = await parentOrder(srv, m.token, 'month', {}, asUid('parentOwnAccount'));
  assert.equal(month.json.amountPaise, 59900, 'a month pass earns no credit');
  const sentMonth = srv.rzp.calls.filter((c) => c.method === 'POST').pop();
  assert.equal(sentMonth.body.notes.packCreditInr, undefined);

  const real = memoryFirestore();
  seedChildPack(real, 'child1', 'pack_chapter:triangles');
  const broken = {
    ...real,
    collection: (name) =>
      name === 'packEntitlements'
        ? { doc: () => ({ collection: () => ({ get: async () => { throw new Error('firestore down'); } }) }) }
        : real.collection(name),
  };
  const srv2 = await startRoutes({ db: broken });
  t.after(srv2.close);
  const m2 = await mint(srv2);
  const r = await parentOrder(srv2, m2.token, 'till_boards');
  assert.equal(r.status, 200, r.text);
  const plain = await startRoutes();
  t.after(plain.close);
  const m3 = await mint(plain);
  assert.equal(r.json.amountPaise, (await parentOrder(plain, m3.token, 'till_boards')).json.amountPaise, 'fail closed: full price');
  assert.ok(srv2.events.includes('payments.parent.order.pack_credit_read_failed'));
});

test('PACK-CREDIT-1 · V · a credited parent order is verified against the CREDITED amount, granted to the child, packs marked credited', async (t) => {
  const db = memoryFirestore();
  seedChildPack(db, 'child1', 'pack_chapter:triangles');
  const srv = await startRoutes({ db });
  t.after(srv.close);
  const { token } = await mint(srv);
  const { json: o } = await parentOrder(srv, token, 'till_boards');
  const p = srv.rzp.pay(o.orderId);
  const r = await parentVerify(srv, token, o.orderId, p.id, asUid('parentOwnAccount'));
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.amountPaise, o.amountPaise);
  const sub = srv.db.read('subscriptions/child1');
  assert.equal(sub.passType, 'till_boards');
  assert.equal(sub.pricePaidInr, o.amountPaise / 100, 'records what was paid');
  const pk = srv.db.read('packEntitlements/child1/packs/pack_chapter:triangles');
  assert.equal(pk.creditedToPass, true);
  assert.equal(pk.creditedOrderId, o.orderId);
  assert.equal(srv.db.read(`payOrders/${o.orderId}`).packCreditConflict, undefined);
  assert.ok(srv.events.includes('payments.parent.verify.pack_credit_marked'));
  // a payment for the FULL price against the credited order would have been refused:
  const db2 = memoryFirestore();
  seedChildPack(db2, 'child1', 'pack_chapter:triangles');
  const srv2 = await startRoutes({ db: db2 });
  t.after(srv2.close);
  const m2 = await mint(srv2);
  const { json: o2 } = await parentOrder(srv2, m2.token, 'till_boards');
  const bad = srv2.rzp.pay(o2.orderId, { amount: o2.amountPaise + 4900 });
  const rr = await parentVerify(srv2, m2.token, o2.orderId, bad.id);
  assert.equal(rr.status, 400);
  assert.equal(rr.json.reason, 'amount_mismatch');
  assert.equal(srv2.db.read('subscriptions/child1'), undefined);
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

test('O · the parent routes are throttled by the product limiter (rateLimiter.cjs), per client, signed out by construction', async (t) => {
  // The REAL limiter, with the parent-pay classes, a small hard cap for the test.
  const limiter = createRateLimiter({
    now: () => NOW,
    paidEndpoints: { [PARENT_VIEW_PATH]: 'parentPay', [PARENT_ORDER_PATH]: 'parentPay', [PARENT_VERIFY_PATH]: 'parentPay' },
    limits: { [ANONYMOUS_CLASS]: { soft: 2, hard: 3 } },
  });
  const srv = await startRoutes({ rateLimiter: limiter });
  t.after(srv.close);
  const from = (ip, uidHeader) => ({ 'X-Forwarded-For': ip, ...(uidHeader ? { 'X-Lazytopper-Uid': uidHeader } : {}) });
  const statuses = [];
  // Rotating a typed uid header buys nothing: the routes are keyed as signed out.
  for (let i = 0; i < 4; i += 1) {
    statuses.push((await request(srv.port, PARENT_VIEW_PATH, { body: { token: 'y'.repeat(43) }, headers: from('203.0.113.9', `fake-${i}`) })).status);
  }
  assert.deepEqual(statuses, [404, 404, 404, 429]);
  const other = await request(srv.port, PARENT_VIEW_PATH, { body: { token: 'y'.repeat(43) }, headers: from('203.0.113.10') });
  assert.equal(other.status, 404, 'another client is not throttled');
});

test('O · the default limiter is the product one, with the documented daily caps', () => {
  const limiter = createParentPayLimiter({ now: () => NOW });
  assert.equal(limiter.limits[ANONYMOUS_CLASS].hard, MAX_PARENT_CALLS_PER_CLIENT_PER_DAY);
  assert.equal(limiter.limits.parentLink.hard, MAX_LINKS_PER_UID_PER_DAY);
  assert.equal(limiter.paidEndpoints[PARENT_LINK_PATH], 'parentLink');
  for (const p of [PARENT_VIEW_PATH, PARENT_ORDER_PATH, PARENT_VERIFY_PATH]) assert.equal(limiter.paidEndpoints[p], 'parentPay');
  // STATIC: no hand-rolled counter or IP parser is left in the module.
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, 'parentPay.cjs'), 'utf8');
  assert.ok(!/x-forwarded-for/i.test(src), 'parentPay.cjs parses X-Forwarded-For itself');
  assert.ok(!/buckets\.clear\(\)/.test(src), 'parentPay.cjs carries its own counter map');
});

/* ── review round 1 (controller, 18 Oct) ─────────────────────────────────────── */

test('O · RACE: parallel orders on one link never exceed the cap, and no order id is lost', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const results = await Promise.all(Array.from({ length: MAX_ORDERS_PER_LINK + 4 }, () => parentOrder(srv, token)));
  const ok = results.filter((r) => r.status === 200);
  const capped = results.filter((r) => r.status === 429);
  assert.equal(ok.length, MAX_ORDERS_PER_LINK, `created ${ok.length} orders, cap is ${MAX_ORDERS_PER_LINK}`);
  assert.equal(capped.length, 4);
  for (const r of capped) assert.equal(r.json.reason, 'too_many_orders');
  const link = srv.db.read(`parentPayLinks/${linkIdOf(token)}`);
  assert.equal(link.orderSlots, MAX_ORDERS_PER_LINK);
  assert.deepEqual([...link.orderIds].sort(), ok.map((r) => r.json.orderId).sort(), 'an order id was lost from the link');
  assert.equal(srv.rzp.orders.size, MAX_ORDERS_PER_LINK, 'Razorpay was asked for more orders than the cap');
});

test('O · a webhook-paid order MISSING from the link\'s list still spends the link (payOrders queried by parentLinkId)', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { token } = await mint(srv);
  const { json: o } = await parentOrder(srv, token);
  const p = srv.rzp.pay(o.orderId);
  const raw = webhookBody(p);
  const hook = await request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, raw) } });
  assert.equal(hook.status, 200, hook.text);
  // Simulate the lost append the review found: the list no longer names the paid order.
  await srv.db.collection('parentPayLinks').doc(linkIdOf(token)).set({ orderIds: [] }, { merge: true });
  for (const path of [PARENT_VIEW_PATH, PARENT_ORDER_PATH]) {
    const r = await request(srv.port, path, { body: { token, passType: 'month' } });
    assert.equal(r.status, 410, path);
    assert.equal(r.json.reason, 'used');
  }
  assert.equal(srv.rzp.orders.size, 1, 'a second order was created for a paid link');
});

test('L · ALREADY COVERED: a child whose pass already runs to the boards gets no view and no order', async (t) => {
  // NOW is 2026-09-27 IST; the predicted board day is 2027-02-17. A pass to 2027-03-01 covers it.
  const db = memoryFirestore({ 'subscriptions/child1': { tier: 'premium', passType: 'till_boards', passEnd: new Date('2027-03-01T00:00:00+05:30') } });
  const srv = await startRoutes({ db });
  t.after(srv.close);
  assert.equal(coveredTillBoards(db.read('subscriptions/child1'), NOW), true);
  const { token } = await mint(srv);
  for (const [path, passType] of [[PARENT_VIEW_PATH], [PARENT_ORDER_PATH, 'month'], [PARENT_ORDER_PATH, 'till_boards']]) {
    const r = await request(srv.port, path, { body: { token, passType } });
    assert.equal(r.status, 410, `${path} ${passType || ''}`);
    assert.equal(r.json.reason, 'covered');
  }
  assert.equal(srv.rzp.calls.length, 0, 'Razorpay was asked to charge for a covered child');
});

test('L · NOT covered: a pass that ends BEFORE the boards (or has expired) still lets the parent pay', async (t) => {
  assert.equal(coveredTillBoards({ passEnd: new Date('2026-12-01T00:00:00+05:30') }, NOW), false);
  assert.equal(coveredTillBoards({ passEnd: new Date('2026-09-01T00:00:00+05:30') }, NOW), false);
  assert.equal(coveredTillBoards({}, NOW), false);
  const db = memoryFirestore({ 'subscriptions/child1': { tier: 'premium', passType: 'month', passEnd: new Date('2026-10-20T00:00:00+05:30') } });
  const srv = await startRoutes({ db });
  t.after(srv.close);
  const { token } = await mint(srv);
  assert.equal((await request(srv.port, PARENT_VIEW_PATH, { body: { token } })).status, 200);
  assert.equal((await parentOrder(srv, token)).status, 200);
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

test('PRICING-1 · V · a founding order only AUTHORIZED 24 h+ after the close is not captured and not granted; a CAPTURED one still is', async (t) => {
  // PRICE-FIXED-1: after 1 Nov a month order needs a prior paid month order on the CHILD's account.
  const srv = await startRoutes({ db: memoryFirestore({ 'payOrders/order_old_month': { uid: 'child1', passType: 'month', status: 'paid', amountPaise: 59900 } }), clock: { t: Date.parse('2026-11-30T23:59:00+05:30') } });
  t.after(srv.close);
  const { token } = await mint(srv);
  const { json: o } = await parentOrder(srv, token);
  const auth = srv.rzp.pay(o.orderId, { id: 'pay_auth', status: 'authorized' });
  srv.clock.t = Date.parse('2026-12-02T00:00:01+05:30');
  const r = await parentVerify(srv, token, o.orderId, auth.id);
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.reason, 'order_expired');
  assert.equal(srv.rzp.calls.filter((c) => c.url.endsWith('/capture')).length, 0, 'a stale founding order was captured');
  assert.equal(srv.db.read('subscriptions/child1'), undefined);
  const done = srv.rzp.pay(o.orderId, { id: 'pay_done' });
  const ok = await parentVerify(srv, token, o.orderId, done.id);
  assert.equal(ok.status, 200, ok.text);
  assert.equal(srv.db.read('subscriptions/child1').pricePaidInr, 599);
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

/* ── PRICE-FIXED-1 - the month pass is not sold through a parent link to a child who never bought one ─── */
test('PRICE-FIXED-1 · parent link: a never-month child has month: null on EVERY date (before and after 2026-11-01T00:00:00+05:30)', async (t) => {
  const before = await startRoutes({ clock: { t: Date.parse('2026-10-31T23:59:59+05:30') } });
  t.after(before.close);
  const a = await mint(before);
  assert.deepEqual((await request(before.port, PARENT_VIEW_PATH, { body: { token: a.token } })).json.prices, { month: null, till_boards: 1917 });

  const after = await startRoutes({ clock: { t: Date.parse('2026-11-01T00:00:00+05:30') } });
  t.after(after.close);
  const b = await mint(after);
  assert.deepEqual(b.prices, { month: null, till_boards: 1917 });
  const view = await request(after.port, PARENT_VIEW_PATH, { body: { token: b.token } });
  assert.deepEqual(view.json.prices, { month: null, till_boards: 1917 });
});

test('PRICE-FIXED-1 · parent link: a month ORDER for a never-month child is refused (409) after the instant, nothing reaches Razorpay; the Board Pass still orders at 1917', async (t) => {
  const srv = await startRoutes({ clock: { t: Date.parse('2026-11-12T10:00:00+05:30') } });
  t.after(srv.close);
  const { token } = await mint(srv);
  const refused = await parentOrder(srv, token, 'month');
  assert.equal(refused.status, 409, refused.text);
  assert.equal(refused.json.error, 'month_pass_retired');
  assert.equal(srv.rzp.calls.length, 0);
  const ok = await parentOrder(srv, token, 'till_boards');
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.amountPaise, 191700);
});

test('PRICE-FIXED-1 · parent link: a child WITH a prior paid month order keeps the month price and order after the instant', async (t) => {
  const db = memoryFirestore({ 'payOrders/o_old': { uid: 'child1', passType: 'month', status: 'paid', amountPaise: 59900 } });
  const srv = await startRoutes({ db, clock: { t: Date.parse('2026-11-12T10:00:00+05:30') } });
  t.after(srv.close);
  const { token } = await mint(srv);
  const view = await request(srv.port, PARENT_VIEW_PATH, { body: { token } });
  assert.equal(view.json.prices.month, 599);
  const ok = await parentOrder(srv, token, 'month');
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.amountPaise, 59900);
});

/* ══════════════════════════════════════════════════════════════════════════
   PARENT-PACKS-1 — a link may carry ONE PDF pack, fixed by the child at mint time
   ══════════════════════════════════════════════════════════════════════════ */

const ENV_PACKS = { ...ENV_ON, PACKS_ENABLED: '1' };
async function mintPack(srv, pack, uid = 'child1') {
  return request(srv.port, PARENT_LINK_PATH, { body: { pack }, headers: asUid(uid) });
}
const ownPack = (db, uid, packId) => {
  const [sku, target] = packId.split(':');
  db.docs.set(`packEntitlements/${uid}/packs/${packId}`, { data: { packId, sku, target, pricePaidInr: 1, paidAt: NOW - 1000, orderId: 'order_old' }, version: 1 });
};

test('PARENT-PACKS-1 · mint: the pack is validated and stored ON THE LINK; the response names it at the SERVER price, no pass prices', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const r = await mintPack(srv, { sku: 'pack_cbq', target: 'maths', priceInr: 1 });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json).sort(), ['expiresAt', 'ok', 'pack', 'token']);
  assert.deepEqual(r.json.pack, { sku: 'pack_cbq', target: 'maths', priceInr: 199 });
  const link = srv.db.read(`parentPayLinks/${linkIdOf(r.json.token)}`);
  assert.deepEqual(Object.keys(link).sort(), ['createdAt', 'expiresAt', 'firstName', 'orderIds', 'orderSlots', 'packSku', 'packTarget', 'product', 'status', 'uid']);
  assert.equal(link.uid, 'child1');
  assert.equal(link.product, 'pack');
  assert.equal(link.packSku, 'pack_cbq');
  assert.equal(link.packTarget, 'maths');
  assert.ok(!('priceInr' in link), 'a price from the request is never stored');
  // The bundle's target is always "all"; a bad sku / target is refused and stores nothing.
  const b = await mintPack(srv, { sku: 'pack_bundle', target: 'anything' });
  assert.deepEqual(b.json.pack, { sku: 'pack_bundle', target: 'all', priceInr: 299 });
  const before = srv.db.keys('parentPayLinks/').length;
  for (const bad of [{ sku: 'pack_chapter', target: 'not-a-chapter' }, { sku: 'pack_cbq', target: 'english' }, { sku: 'till_boards' }, { sku: 'topup_x' }]) {
    const x = await mintPack(srv, bad);
    assert.equal(x.status, 400, JSON.stringify(bad));
    assert.equal(x.json.error, 'invalid_pack_target');
  }
  assert.equal(srv.db.keys('parentPayLinks/').length, before);
});

test('PARENT-PACKS-1 · mint: packs switched off -> 409 packs_unavailable; already owned (directly or via Subject / Bundle) -> 409 already_owned', async (t) => {
  const off = await startRoutes();
  t.after(off.close);
  const r = await mintPack(off, { sku: 'pack_cbq', target: 'maths' });
  assert.equal(r.status, 409);
  assert.equal(r.json.error, 'packs_unavailable');
  assert.equal(off.db.keys('parentPayLinks/').length, 0);

  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  ownPack(srv.db, 'child1', 'pack_subject:maths');
  for (const pack of [{ sku: 'pack_subject', target: 'maths' }, { sku: 'pack_mock', target: 'maths' }, { sku: 'pack_chapter', target: 'polynomials' }]) {
    const x = await mintPack(srv, pack);
    assert.equal(x.status, 409, JSON.stringify(pack));
    assert.equal(x.json.error, 'already_owned');
  }
  // A Subject Pack does not include CBQs (CBQ-PACK-1): that link is fine.
  assert.equal((await mintPack(srv, { sku: 'pack_cbq', target: 'maths' })).status, 200);
  assert.equal(srv.db.keys('parentPayLinks/').length, 1);
});

test('PARENT-PACKS-1 · view: first name + the pack at the server price, nothing about passes', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const { json: m } = await mintPack(srv, { sku: 'pack_chapter', target: 'polynomials' });
  const r = await request(srv.port, PARENT_VIEW_PATH, { body: { token: m.token } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json).sort(), ['expiresAt', 'firstName', 'ok', 'pack']);
  assert.equal(r.json.firstName, 'Aarav');
  assert.deepEqual(r.json.pack, { sku: 'pack_chapter', target: 'polynomials', priceInr: 49 });
  assert.ok(!r.text.includes('child1'));
});

test('PARENT-PACKS-1 · order -> verify: the parent body cannot change sku / target / uid / amount; the pack lands on the CHILD; link spent', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const { json: m } = await mintPack(srv, { sku: 'pack_cbq', target: 'maths' });
  const o = await request(srv.port, PARENT_ORDER_PATH, {
    body: { token: m.token, product: 'pack', passType: 'pack_bundle', sku: 'pack_bundle', packTarget: 'science', target: 'science', uid: 'evil', amountPaise: 100 },
    headers: asUid('parentOwnAccount'),
  });
  assert.equal(o.status, 200, o.text);
  assert.equal(o.json.amountPaise, 19900);
  const rz = srv.rzp.calls.find((c) => c.method === 'POST' && c.url.endsWith('/orders'));
  assert.equal(rz.body.amount, 19900);
  assert.deepEqual(rz.body.notes, { uid: 'child1', passType: 'pack_cbq', packTarget: 'maths', payer: 'parent' });
  const stored = srv.db.read(`payOrders/${o.json.orderId}`);
  assert.equal(stored.uid, 'child1');
  assert.equal(stored.passType, 'pack_cbq');
  assert.equal(stored.packTarget, 'maths');
  assert.equal(stored.amountPaise, 19900);
  assert.equal(stored.payer, 'parent');
  assert.equal(stored.parentLinkId, linkIdOf(m.token));
  assert.ok(!('packCreditInr' in stored), 'no pack credit logic on a pack order');

  const p = srv.rzp.pay(o.json.orderId);
  const v = await parentVerify(srv, m.token, o.json.orderId, p.id, asUid('parentOwnAccount'));
  assert.equal(v.status, 200, v.text);
  assert.deepEqual(Object.keys(v.json).sort(), ['amountPaise', 'firstName', 'kind', 'ok', 'pack', 'replayed']);
  assert.equal(v.json.kind, 'pack');
  assert.deepEqual(v.json.pack, { sku: 'pack_cbq', target: 'maths', priceInr: 199 });
  assert.equal(v.json.replayed, false);
  const owned = srv.db.read('packEntitlements/child1/packs/pack_cbq:maths');
  assert.equal(owned.sku, 'pack_cbq');
  assert.equal(owned.orderId, o.json.orderId);
  assert.equal(owned.paymentRef, p.id);
  assert.equal(srv.db.keys('packEntitlements/parentOwnAccount').length, 0, 'the PARENT got a pack');
  assert.equal(srv.db.keys('packEntitlements/evil').length, 0);
  assert.equal(srv.db.read('subscriptions/child1'), undefined, 'a pack never reaches grantPass');
  assert.equal(srv.db.read(`payOrders/${o.json.orderId}`).status, 'paid');
  assert.equal(srv.db.read(`parentPayLinks/${linkIdOf(m.token)}`).status, 'paid');
  // Single use: the spent link refuses to view or order; a replayed verify grants nothing new.
  for (const path of [PARENT_VIEW_PATH, PARENT_ORDER_PATH]) {
    const again = await request(srv.port, path, { body: { token: m.token, product: 'pack' } });
    assert.equal(again.status, 410, path);
    assert.equal(again.json.reason, 'used');
  }
  const replay = await parentVerify(srv, m.token, o.json.orderId, p.id);
  assert.equal(replay.json.replayed, true);
});

test('PARENT-PACKS-1 · W: the parent closes the tab before verify; the UNCHANGED webhook grants the pack to the CHILD; the link is spent', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const { json: m } = await mintPack(srv, { sku: 'pack_bundle' });
  const { json: o } = await request(srv.port, PARENT_ORDER_PATH, { body: { token: m.token, product: 'pack' } });
  const p = srv.rzp.pay(o.orderId);
  const raw = webhookBody(p);
  const hook = await request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, raw) } });
  assert.equal(hook.status, 200, hook.text);
  assert.equal(hook.json.kind, 'pack');
  assert.equal(srv.db.read('packEntitlements/child1/packs/pack_bundle:all').sku, 'pack_bundle');
  const again = await request(srv.port, PARENT_ORDER_PATH, { body: { token: m.token, product: 'pack' } });
  assert.equal(again.status, 410);
  assert.equal(again.json.reason, 'used');
  const late = await parentVerify(srv, m.token, o.orderId, p.id);
  assert.equal(late.status, 200, late.text);
  assert.equal(late.json.replayed, true);
});

test('PARENT-PACKS-1 · owned after mint (the child bought it, or the Bundle) -> view and order refuse `owned`, nothing reaches Razorpay', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const { json: m } = await mintPack(srv, { sku: 'pack_chapter', target: 'polynomials' });
  ownPack(srv.db, 'child1', 'pack_bundle:all');
  for (const path of [PARENT_VIEW_PATH, PARENT_ORDER_PATH]) {
    const r = await request(srv.port, path, { body: { token: m.token, product: 'pack' } });
    assert.equal(r.status, 410, path);
    assert.equal(r.json.reason, 'owned');
  }
  assert.equal(srv.rzp.calls.length, 0);
});

test('PARENT-PACKS-1 · a pack link never sells a pass, and a Board Pass link never sells a pack', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const { json: m } = await mintPack(srv, { sku: 'pack_cbq', target: 'science' });
  for (const passType of ['till_boards', 'month']) {
    const r = await parentOrder(srv, m.token, passType);
    assert.equal(r.status, 400, passType);
    assert.equal(r.json.reason, 'pack_link');
  }
  const board = await mint(srv);
  const r = await request(srv.port, PARENT_ORDER_PATH, { body: { token: board.token, product: 'pack', sku: 'pack_bundle' } });
  assert.equal(r.status, 400);
  assert.equal(r.json.reason, 'not_pack_link');
  assert.equal(srv.rzp.calls.length, 0);
  // A pack order verified against ANOTHER link (here: the Board Pass link) is refused.
  const { json: o } = await request(srv.port, PARENT_ORDER_PATH, { body: { token: m.token, product: 'pack' } });
  const p = srv.rzp.pay(o.orderId);
  const v = await parentVerify(srv, board.token, o.orderId, p.id);
  assert.equal(v.status, 400);
  assert.equal(v.json.reason, 'link_mismatch');
  assert.equal(srv.db.keys('packEntitlements/').length, 0);
});

test('PARENT-PACKS-1 · Board Pass links are unchanged: an empty or pack-less mint body is a Board Pass link with prices', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  for (const opts of [{}, { raw: '' }, { body: { other: 1 } }]) {
    const r = await request(srv.port, PARENT_LINK_PATH, { ...opts, headers: asUid('child1') });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(Object.keys(r.json).sort(), ['expiresAt', 'ok', 'prices', 'token']);
    const link = srv.db.read(`parentPayLinks/${linkIdOf(r.json.token)}`);
    assert.deepEqual(Object.keys(link).sort(), ['createdAt', 'expiresAt', 'firstName', 'orderIds', 'orderSlots', 'status', 'uid']);
  }
});

/* ── PARENT-PACKS-1 review round (independent review, 4 Nov) ───────────────────── */

const { grantPack } = require('../services/packGrant.cjs');
/** The child buys a pack themselves (any path ends in grantPack): a stored order, then the grant. */
async function childBuys(db, packId, orderId = `order_child_${packId.replace(':', '_')}`) {
  const [sku, packTarget] = packId.split(':');
  const { PACK_PRODUCTS } = require('../services/packProducts.cjs');
  db.docs.set(`payOrders/${orderId}`, { data: { uid: 'child1', passType: sku, packTarget, amountPaise: PACK_PRODUCTS[sku].priceInr * 100, status: 'created' }, version: 1 });
  return grantPack({ db, uid: 'child1', order: { orderId }, paymentRef: `pay_${orderId}`, nowMs: NOW });
}

test('PARENT-PACKS-1 · L1: a mint body that does not parse, or a `pack` that is not an object, is 400 — never a silent Board Pass link', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  for (const opts of [{ raw: 'not json' }, { raw: '[1]' }, { raw: '{"pack":' }, { body: { pack: null } }, { body: { pack: 'pack_cbq' } }, { body: { pack: ['pack_cbq'] } }]) {
    const r = await request(srv.port, PARENT_LINK_PATH, { ...opts, headers: asUid('child1') });
    assert.equal(r.status, 400, JSON.stringify(opts));
  }
  assert.equal(srv.db.keys('parentPayLinks/').length, 0);
});

test('PARENT-PACKS-1 · L2: pack links have their OWN daily quota — a used-up Board Pass quota does not block them, and they cap separately', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  for (let i = 0; i < MAX_LINKS_PER_UID_PER_DAY; i += 1) await mint(srv);
  assert.equal((await request(srv.port, PARENT_LINK_PATH, { headers: asUid('child1') })).status, 429);
  for (let i = 0; i < MAX_PACK_LINKS_PER_UID_PER_DAY; i += 1) {
    const r = await mintPack(srv, { sku: 'pack_cbq', target: 'maths' });
    assert.equal(r.status, 200, `pack link ${i + 1}`);
  }
  const over = await mintPack(srv, { sku: 'pack_cbq', target: 'maths' });
  assert.equal(over.status, 429);
});

test('PARENT-PACKS-1 · a pack link can start at most MAX_ORDERS_PER_LINK orders', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const { json: m } = await mintPack(srv, { sku: 'pack_mock', target: 'science' });
  for (let i = 0; i < MAX_ORDERS_PER_LINK; i += 1) {
    const r = await request(srv.port, PARENT_ORDER_PATH, { body: { token: m.token, product: 'pack' } });
    assert.equal(r.status, 200, `order ${i + 1}`);
  }
  const over = await request(srv.port, PARENT_ORDER_PATH, { body: { token: m.token, product: 'pack' } });
  assert.equal(over.status, 429);
  assert.equal(over.json.reason, 'too_many_orders');
  assert.equal(srv.rzp.calls.filter((c) => c.url.endsWith('/orders')).length, MAX_ORDERS_PER_LINK);
});

test('PARENT-PACKS-1 · M1 race (a): the child gets a COVERING pack after the link was sent -> the link closes; the parent sees "owned", no Pay', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const { json: chapter } = await mintPack(srv, { sku: 'pack_chapter', target: 'polynomials' });
  const { json: cbq } = await mintPack(srv, { sku: 'pack_cbq', target: 'maths' });
  assert.equal((await request(srv.port, PARENT_VIEW_PATH, { body: { token: chapter.token } })).status, 200);
  await childBuys(srv.db, 'pack_subject:maths');
  assert.equal(srv.db.read(`parentPayLinks/${linkIdOf(chapter.token)}`).status, 'owned');
  for (const path of [PARENT_VIEW_PATH, PARENT_ORDER_PATH]) {
    const r = await request(srv.port, path, { body: { token: chapter.token, product: 'pack' } });
    assert.equal(r.status, 410, path);
    assert.equal(r.json.reason, 'owned');
  }
  // A pack the Subject Pack does NOT cover (CBQ) keeps its link open.
  assert.equal(srv.db.read(`parentPayLinks/${linkIdOf(cbq.token)}`).status, 'open');
  assert.equal(srv.rzp.calls.length, 0);
});

test('PARENT-PACKS-1 · M1 race (b): the parent ordered BEFORE the covering pack landed -> the payment is honoured but flagged duplicate; nothing new granted; the parent is told so', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const { json: m } = await mintPack(srv, { sku: 'pack_chapter', target: 'polynomials' });
  const { json: o } = await request(srv.port, PARENT_ORDER_PATH, { body: { token: m.token, product: 'pack' } });
  await childBuys(srv.db, 'pack_bundle:all');
  const p = srv.rzp.pay(o.orderId);
  const v = await parentVerify(srv, m.token, o.orderId, p.id);
  assert.equal(v.status, 200, v.text);
  assert.equal(v.json.kind, 'pack');
  assert.equal(v.json.duplicate, true);
  assert.doesNotMatch(v.text, /refund/i);
  assert.equal(srv.db.read('packEntitlements/child1/packs/pack_chapter:polynomials'), undefined, 'a second entitlement was written');
  const order = srv.db.read(`payOrders/${o.orderId}`);
  assert.equal(order.status, 'paid');
  assert.equal(order.duplicate, true);
  assert.equal(srv.db.read(`packEntitlements/child1/grants/${p.id}`).duplicate, true);
});

test('PARENT-PACKS-1 · M1 (b) via the WEBHOOK: same flag, the link is spent', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const { json: m } = await mintPack(srv, { sku: 'pack_mock', target: 'maths' });
  const { json: o } = await request(srv.port, PARENT_ORDER_PATH, { body: { token: m.token, product: 'pack' } });
  await childBuys(srv.db, 'pack_subject:maths');
  const p = srv.rzp.pay(o.orderId);
  const raw = webhookBody(p);
  const hook = await request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, raw) } });
  assert.equal(hook.status, 200, hook.text);
  assert.equal(srv.db.read(`payOrders/${o.orderId}`).duplicate, true);
  assert.equal(srv.db.read('packEntitlements/child1/packs/pack_mock:maths'), undefined);
  const again = await request(srv.port, PARENT_ORDER_PATH, { body: { token: m.token, product: 'pack' } });
  assert.equal(again.status, 410);
});

test('PARENT-PACKS-1 · the link that is being PAID is never closed as "owned" by its own grant; a normal grant is not a duplicate', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const { json: m } = await mintPack(srv, { sku: 'pack_subject', target: 'science' });
  const { json: o } = await request(srv.port, PARENT_ORDER_PATH, { body: { token: m.token, product: 'pack' } });
  const p = srv.rzp.pay(o.orderId);
  const raw = webhookBody(p);
  await request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, raw) } });
  assert.notEqual(srv.db.read(`parentPayLinks/${linkIdOf(m.token)}`).status, 'owned');
  const again = await request(srv.port, PARENT_VIEW_PATH, { body: { token: m.token } });
  assert.equal(again.json.reason, 'used');
  assert.equal(srv.db.read(`payOrders/${o.orderId}`).duplicate, undefined);
  assert.ok(srv.db.read('packEntitlements/child1/packs/pack_subject:science'));
});

/* ── PARENT-PACKS-1 re-review (F1 / F2 / coverage) ─────────────────────────────── */

const { closeCoveredParentPackLinks } = require('../services/packGrant.cjs');

test('PARENT-PACKS-1 · closing never touches Board Pass links', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const board = await mint(srv);
  await childBuys(srv.db, 'pack_bundle:all');
  assert.equal(srv.db.read(`parentPayLinks/${linkIdOf(board.token)}`).status, 'open');
  assert.equal((await request(srv.port, PARENT_VIEW_PATH, { body: { token: board.token } })).status, 200);
});

test('PARENT-PACKS-1 · a Chapter Pack when the OTHER subject\'s Subject Pack is owned is granted (not a duplicate); its link stays open', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const { json: m } = await mintPack(srv, { sku: 'pack_chapter', target: 'polynomials' });
  await childBuys(srv.db, 'pack_subject:science');
  assert.equal(srv.db.read(`parentPayLinks/${linkIdOf(m.token)}`).status, 'open');
  const { json: o } = await request(srv.port, PARENT_ORDER_PATH, { body: { token: m.token, product: 'pack' } });
  const p = srv.rzp.pay(o.orderId);
  const v = await parentVerify(srv, m.token, o.orderId, p.id);
  assert.equal(v.status, 200, v.text);
  assert.equal(v.json.duplicate, undefined);
  assert.ok(srv.db.read('packEntitlements/child1/packs/pack_chapter:polynomials'));
  assert.equal(srv.db.read(`payOrders/${o.orderId}`).duplicate, undefined);
});

test('PARENT-PACKS-1 · F1: a link whose order was PAID (webhook, link doc still open) is never closed as owned; the parent sees "used"', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const { json: m } = await mintPack(srv, { sku: 'pack_chapter', target: 'polynomials' });
  const { json: o } = await request(srv.port, PARENT_ORDER_PATH, { body: { token: m.token, product: 'pack' } });
  const p = srv.rzp.pay(o.orderId);
  const raw = webhookBody(p);
  await request(srv.port, PAY_WEBHOOK_PATH, { raw, headers: { 'X-Razorpay-Signature': hmac(WEBHOOK_SECRET, raw) } });
  assert.equal(srv.db.read(`parentPayLinks/${linkIdOf(m.token)}`).status, 'open');
  await childBuys(srv.db, 'pack_subject:maths');
  assert.equal(srv.db.read(`parentPayLinks/${linkIdOf(m.token)}`).status, 'open', 'a paid link was marked owned');
  const r = await request(srv.port, PARENT_VIEW_PATH, { body: { token: m.token } });
  assert.equal(r.json.reason, 'used');
  // ...and even a link already marked owned answers "used" once it has a paid order.
  srv.db.docs.get(`parentPayLinks/${linkIdOf(m.token)}`).data.status = 'owned';
  assert.equal((await request(srv.port, PARENT_VIEW_PATH, { body: { token: m.token } })).json.reason, 'used');
});

test('PARENT-PACKS-1 · F2: the close writes "owned" only while the link is still open — never over "paid"', async (t) => {
  const srv = await startRoutes({ env: ENV_PACKS });
  t.after(srv.close);
  const { json: a } = await mintPack(srv, { sku: 'pack_chapter', target: 'polynomials' });
  const { json: b } = await mintPack(srv, { sku: 'pack_mock', target: 'maths' });
  srv.db.docs.get(`parentPayLinks/${linkIdOf(a.token)}`).data.status = 'paid';
  await childBuys(srv.db, 'pack_subject:maths');
  assert.equal(srv.db.read(`parentPayLinks/${linkIdOf(a.token)}`).status, 'paid');
  assert.equal(srv.db.read(`parentPayLinks/${linkIdOf(b.token)}`).status, 'owned');
  assert.equal(await closeCoveredParentPackLinks(srv.db, 'child1'), 0, 'a second pass closes nothing more');
});
