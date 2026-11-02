// PACKS-SERVER-1 - PDF packs through /api/pay/* and GET /api/packs/mine. MONEY code: each test names the
// way a payment is NOT believed (or a pack is NOT granted twice).
// Run: node --test lazytopper/server/routes/packs.payments.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');

const { createPaymentRoutes, PAY_ORDER_PATH, PAY_VERIFY_PATH, PAY_WEBHOOK_PATH, PAY_STATUS_PATH } = require('./payments.cjs');
const { createPackRoutes, PACKS_MINE_PATH } = require('./packs.cjs');
const { createHttpUtils } = require('../services/httpUtils.cjs');
const { grantPack, PackGrantInputError } = require('../services/packGrant.cjs');

const KEY_ID = 'rzp_test_KEYID';
const KEY_SECRET = 'test_key_secret_never_sent';
const WEBHOOK_SECRET = 'test_webhook_secret';
const ENV_ON = { PAYMENTS_ENABLED: '1', PACKS_ENABLED: '1', RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET };
const NOW = Date.parse('2026-10-27T06:30:00.000Z');

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
  function coll(key) {
    return {
      doc: (id) => ref(`${key}/${id}`),
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

async function start({ env = ENV_ON, db = memoryFirestore(), rzp = fakeRazorpay(), licensees = {}, throwLicensee = false } = {}) {
  const { sendJson } = createHttpUtils('*');
  const events = [];
  const telemetry = { increment: (e) => events.push(e) };
  const verifiedCaller = {
    async resolveVerifiedUid(req) {
      const h = String(req.headers.authorization || '');
      return h.startsWith('Bearer uid:') ? h.slice('Bearer uid:'.length) : '';
    },
  };
  const pay = createPaymentRoutes({ sendJson, verifiedCaller, adminFirestore: db, telemetry, env, fetchImpl: rzp.fetchImpl, now: () => NOW, foundingOfferOpen: true });
  const packs = createPackRoutes({
    sendJson, verifiedCaller, adminFirestore: db, telemetry, now: () => NOW, foundingOfferOpen: true,
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
const seedPack = (db, uid, sku, target, extra = {}) => {
  const packId = sku === 'pack_bundle' ? 'pack_bundle:all' : `${sku}:${target}`;
  db.docs.set(`packEntitlements/${uid}/packs/${packId}`, { data: { packId, sku, target: sku === 'pack_bundle' ? 'all' : target, pricePaidInr: 1, paidAt: NOW - 1000, orderId: 'o_seed', paymentRef: 'p_seed', creditedToPass: false, ...extra }, version: 1 });
};

const CASES = [
  ['pack_chapter', { packTarget: 'triangles' }, 4900, 'pack_chapter:triangles', 'triangles'],
  ['pack_mock', { packTarget: 'maths' }, 9900, 'pack_mock:maths', 'maths'],
  ['pack_subject', { packTarget: 'science' }, 19900, 'pack_subject:science', 'science'],
  ['pack_bundle', {}, 29900, 'pack_bundle:all', 'all'],
  ['pack_cbq', { packTarget: 'science' }, 19900, 'pack_cbq:science', 'science'],
];

/* ── price is the server's ───────────────────────────────────────────────────── */
test('price per sku is decided by the server: body amount / amountPaise / price are ignored; notes + payOrders carry the target', async (t) => {
  for (const [sku, extra, paise, packId, target] of CASES) {
    const srv = await start();
    t.after(srv.close);
    const r = await order(srv, 'u1', sku, { ...extra, amount: 1, amountPaise: 1, price: 1, priceInr: 1 });
    assert.equal(r.status, 200, `${sku}: ${JSON.stringify(r.json)}`);
    assert.equal(r.json.amountPaise, paise, sku);
    assert.equal(r.json.keyId, KEY_ID);
    const created = srv.rzp.calls.find((c) => c.url.endsWith('/orders') && c.method === 'POST');
    assert.equal(created.body.amount, paise, `${sku}: Razorpay was asked for the server price`);
    assert.equal(created.body.notes.packTarget, target);
    const stored = srv.db.read(`payOrders/${r.json.orderId}`);
    assert.equal(stored.uid, 'u1');
    assert.equal(stored.passType, sku);
    assert.equal(stored.packTarget, target);
    assert.equal(stored.amountPaise, paise);
    assert.equal(stored.offerKey, null);
    assert.equal(stored.status, 'created');
    assert.ok(packId);
  }
});

test('bad target -> 400, no Razorpay call, no order stored', async (t) => {
  const bad = [
    ['pack_chapter', {}],
    ['pack_chapter', { packTarget: 'maths' }],
    ['pack_chapter', { packTarget: 'not-a-chapter' }],
    ['pack_chapter', { packTarget: '__proto__' }],
    ['pack_chapter', { packTarget: 'constructor' }],
    ['pack_chapter', { packTarget: ['triangles'] }],
    ['pack_chapter', { packTarget: 7 }],
    ['pack_mock', {}],
    ['pack_mock', { packTarget: 'english' }],
    ['pack_mock', { packTarget: 'triangles' }],
    ['pack_subject', { packTarget: 'Maths' }],
    ['pack_subject', { packTarget: null }],
  ];
  const srv = await start();
  t.after(srv.close);
  for (const [sku, extra] of bad) {
    const r = await order(srv, 'u1', sku, extra);
    assert.equal(r.status, 400, `${sku} ${JSON.stringify(extra)}`);
    assert.equal(r.json.error, 'invalid_pack_target');
  }
  assert.equal(srv.rzp.calls.length, 0);
  assert.equal(srv.db.keys('payOrders/').length, 0);
});

test('pack_bundle ignores a supplied target (stored as "all")', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const r = await orderOk(srv, 'u1', 'pack_bundle', { packTarget: 'maths' });
  assert.equal(srv.db.read(`payOrders/${r.orderId}`).packTarget, 'all');
});

test('packs off (unset / "0" / "true") -> exactly the response an unknown passType gets; nothing called or written', async (t) => {
  for (const flag of [undefined, '0', 'true', '']) {
    const env = { ...ENV_ON };
    if (flag === undefined) delete env.PACKS_ENABLED; else env.PACKS_ENABLED = flag;
    const srv = await start({ env });
    t.after(srv.close);
    const unknown = await order(srv, 'u1', 'definitely_not_a_pass');
    for (const [sku, extra] of CASES) {
      const r = await order(srv, 'u1', sku, extra.packTarget ? extra : { packTarget: 'maths' });
      assert.equal(r.status, unknown.status, `${sku} flag=${flag}`);
      assert.deepEqual(r.json, unknown.json, `${sku} flag=${flag}`);
    }
    assert.equal(unknown.status, 400);
    assert.equal(srv.rzp.calls.length, 0);
    assert.equal(srv.db.docs.size, 0);
  }
});

test('PAYMENTS_ENABLED off -> 404 for a pack even with PACKS_ENABLED on', async (t) => {
  const env = { ...ENV_ON };
  delete env.PAYMENTS_ENABLED;
  const srv = await start({ env });
  t.after(srv.close);
  const r = await order(srv, 'u1', 'pack_bundle');
  assert.equal(r.status, 404);
  assert.deepEqual(r.json, { error: 'Not Found' });
});

/* ── already_owned ───────────────────────────────────────────────────────────── */
test('already_owned 409 for every coverage case; no Razorpay order is created', async (t) => {
  const cases = [
    ['chapter under subject', [['pack_subject', 'maths']], 'pack_chapter', { packTarget: 'triangles' }],
    ['chapter under bundle', [['pack_bundle']], 'pack_chapter', { packTarget: 'heredity' }],
    ['chapter under chapter', [['pack_chapter', 'circles']], 'pack_chapter', { packTarget: 'circles' }],
    ['mock under subject', [['pack_subject', 'science']], 'pack_mock', { packTarget: 'science' }],
    ['mock under bundle', [['pack_bundle']], 'pack_mock', { packTarget: 'maths' }],
    ['mock under mock', [['pack_mock', 'maths']], 'pack_mock', { packTarget: 'maths' }],
    ['subject under bundle', [['pack_bundle']], 'pack_subject', { packTarget: 'maths' }],
    ['subject under subject', [['pack_subject', 'maths']], 'pack_subject', { packTarget: 'maths' }],
    ['bundle under bundle', [['pack_bundle']], 'pack_bundle', {}],
    ['bundle under both subjects', [['pack_subject', 'maths'], ['pack_subject', 'science']], 'pack_bundle', {}],
  ];
  for (const [name, owned, sku, extra] of cases) {
    const db = memoryFirestore();
    for (const [s, tg] of owned) seedPack(db, 'u1', s, tg);
    const srv = await start({ db });
    t.after(srv.close);
    const r = await order(srv, 'u1', sku, extra);
    assert.equal(r.status, 409, name);
    assert.equal(r.json.error, 'already_owned', name);
    assert.equal(srv.rzp.calls.length, 0, `${name}: no charge for nothing`);
    assert.equal(srv.db.keys('payOrders/').length, 0, name);
  }
});

test('NOT already owned: partial / sideways coverage still sells; another student\'s packs do not count', async (t) => {
  const cases = [
    ['science chapter under maths subject', [['pack_subject', 'maths']], 'pack_chapter', { packTarget: 'heredity' }],
    ['subject over one of its chapters', [['pack_chapter', 'triangles']], 'pack_subject', { packTarget: 'maths' }],
    ['subject over its mock pack only', [['pack_mock', 'maths']], 'pack_subject', { packTarget: 'maths' }],
    ['bundle over one subject', [['pack_subject', 'maths']], 'pack_bundle', {}],
    ['mock over a chapter pack', [['pack_chapter', 'triangles']], 'pack_mock', { packTarget: 'maths' }],
  ];
  for (const [name, owned, sku, extra] of cases) {
    const db = memoryFirestore();
    for (const [s, tg] of owned) seedPack(db, 'u1', s, tg);
    const srv = await start({ db });
    t.after(srv.close);
    const r = await order(srv, 'u1', sku, extra);
    assert.equal(r.status, 200, name);
  }
  const db = memoryFirestore();
  seedPack(db, 'someone_else', 'pack_bundle');
  const srv = await start({ db });
  t.after(srv.close);
  assert.equal((await order(srv, 'u1', 'pack_bundle')).status, 200);
});

test('ownership read failure -> 500, fail CLOSED (no Razorpay order)', async (t) => {
  const db = memoryFirestore();
  const realCollection = db.collection;
  db.collection = (name) => {
    const c = realCollection(name);
    if (name !== 'packEntitlements') return c;
    return { doc: () => ({ collection: () => ({ get: async () => { throw new Error('firestore down'); }, doc: c.doc }) }) };
  };
  const srv = await start({ db });
  t.after(srv.close);
  const r = await order(srv, 'u1', 'pack_bundle');
  assert.equal(r.status, 500);
  assert.equal(srv.rzp.calls.length, 0);
});

/* ── grant: verify / webhook / status ────────────────────────────────────────── */
test('verify grants a pack: {ok, kind:"pack", packId, sku, target}, NO passEnd; entitlement + marker + order paid; no pass written', async (t) => {
  for (const [sku, extra, paise, packId, target] of CASES) {
    const srv = await start();
    t.after(srv.close);
    const o = await orderOk(srv, 'u1', sku, extra);
    const p = srv.rzp.pay(o.orderId);
    const r = await verify(srv, 'u1', o.orderId, p.id);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.ok, true);
    assert.equal(r.json.kind, 'pack');
    assert.equal(r.json.packId, packId);
    assert.equal(r.json.sku, sku);
    assert.equal(r.json.target, target);
    assert.equal('passEnd' in r.json, false);
    assert.equal('pass' in r.json, false);
    assert.deepEqual(srv.db.read(`packEntitlements/u1/packs/${packId}`), {
      packId, sku, target, pricePaidInr: paise / 100, paidAt: NOW, orderId: o.orderId, paymentRef: p.id, creditedToPass: false,
    });
    const marker = srv.db.read(`packEntitlements/u1/grants/${p.id}`);
    assert.equal(marker.packId, packId);
    assert.equal(marker.orderId, o.orderId);
    assert.equal(srv.db.read(`payOrders/${o.orderId}`).status, 'paid');
    assert.equal(srv.db.keys('subscriptions/').length, 0, 'a pack must never write a pass');
    assert.equal(srv.db.keys('usageCredits/').length, 0);
  }
});

test('IDEMPOTENT: verify, webhook, status and a retry all firing -> one entitlement doc, one marker, one write of each', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const o = await orderOk(srv, 'u1', 'pack_subject', { packTarget: 'maths' });
  const p = srv.rzp.pay(o.orderId);
  const [a, b, c] = await Promise.all([verify(srv, 'u1', o.orderId, p.id), webhook(srv, p), status(srv, 'u1', o.orderId)]);
  for (const r of [a, b, c]) {
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.kind, 'pack');
    assert.equal(r.json.packId, 'pack_subject:maths');
  }
  const d = await verify(srv, 'u1', o.orderId, p.id);
  const e = await status(srv, 'u1', o.orderId);
  assert.equal(d.status, 200);
  assert.equal(d.json.replayed, true);
  assert.equal(e.json.state, 'paid');
  assert.equal(e.json.kind, 'pack');
  assert.equal('passEnd' in e.json, false);
  assert.deepEqual(srv.db.keys('packEntitlements/').sort(), ['packEntitlements/u1', `packEntitlements/u1/grants/${p.id}`, 'packEntitlements/u1/packs/pack_subject:maths'].sort());
  assert.equal(srv.db.version('packEntitlements/u1/packs/pack_subject:maths'), 1, 'the entitlement was written exactly once');
  assert.equal(srv.db.version(`packEntitlements/u1/grants/${p.id}`), 1, 'the marker was written exactly once');
  assert.equal(srv.db.stats.writes.filter((k) => k.startsWith('packEntitlements/')).length, 3, 'parent + marker + entitlement, once each');
});

test('status reconcile grants a pack from a Razorpay-confirmed payment (never from the request)', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const o = await orderOk(srv, 'u1', 'pack_chapter', { packTarget: 'electricity' });
  assert.equal((await status(srv, 'u1', o.orderId)).json.state, 'pending');
  assert.equal(srv.db.keys('packEntitlements/').length, 0);
  const p = srv.rzp.pay(o.orderId);
  const r = await status(srv, 'u1', o.orderId);
  assert.equal(r.status, 200);
  assert.equal(r.json.state, 'paid');
  assert.equal(r.json.kind, 'pack');
  assert.equal(r.json.packId, 'pack_chapter:electricity');
  assert.equal(r.json.paymentId, p.id);
  assert.equal(r.json.amountInr, 49);
  assert.ok(srv.db.read('packEntitlements/u1/packs/pack_chapter:electricity'));
});

test('AMOUNT MISMATCH: Razorpay reports a different amount -> 400, no entitlement, order stays created (verify, webhook, status)', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const o = await orderOk(srv, 'u1', 'pack_bundle');
  const p = srv.rzp.pay(o.orderId, { amount: 4900 }); // paid ₹49 against a ₹299 order
  const v = await verify(srv, 'u1', o.orderId, p.id);
  assert.equal(v.status, 400);
  assert.equal(v.json.reason, 'amount_mismatch');
  const w = await webhook(srv, p);
  assert.equal(w.status, 400);
  assert.equal(w.json.reason, 'amount_mismatch');
  const s = await status(srv, 'u1', o.orderId);
  assert.equal(s.json.state, 'pending');
  assert.equal(srv.db.keys('packEntitlements/').length, 0);
  assert.equal(srv.db.read(`payOrders/${o.orderId}`).status, 'created');
});

test('not captured / bad signature / foreign uid / unknown order are all refused with no grant', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const o = await orderOk(srv, 'u1', 'pack_mock', { packTarget: 'science' });
  const p = srv.rzp.pay(o.orderId, { status: 'failed' });
  assert.equal((await verify(srv, 'u1', o.orderId, p.id)).json.reason, 'not_captured');
  const sig = await post(srv.port, PAY_VERIFY_PATH, { body: { orderId: o.orderId, paymentId: p.id, signature: 'a'.repeat(64) }, headers: asUid('u1') });
  assert.equal(sig.json.reason, 'bad_signature');
  srv.rzp.pay(o.orderId, { id: 'pay_ok' });
  assert.equal((await verify(srv, 'intruder', o.orderId, 'pay_ok')).json.reason, 'uid_mismatch');
  assert.equal((await verify(srv, 'u1', 'order_NOPE', 'pay_ok')).json.reason, 'unknown_order');
  assert.equal(srv.db.keys('packEntitlements/').length, 0);
});

test('a stored order whose amount no longer matches the pack price table is NOT granted (grant_refused)', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const o = await orderOk(srv, 'u1', 'pack_bundle');
  const stored = srv.db.read(`payOrders/${o.orderId}`);
  srv.db.docs.set(`payOrders/${o.orderId}`, { data: { ...stored, amountPaise: 100 }, version: 2 });
  const p = srv.rzp.pay(o.orderId, { amount: 100 });
  const r = await verify(srv, 'u1', o.orderId, p.id);
  assert.equal(r.status, 400);
  assert.equal(r.json.reason, 'grant_refused');
  assert.equal(srv.db.keys('packEntitlements/').length, 0);
});

test('a stored pack order with a tampered target is NOT granted', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const o = await orderOk(srv, 'u1', 'pack_chapter', { packTarget: 'triangles' });
  const stored = srv.db.read(`payOrders/${o.orderId}`);
  srv.db.docs.set(`payOrders/${o.orderId}`, { data: { ...stored, packTarget: 'maths' }, version: 2 });
  const p = srv.rzp.pay(o.orderId);
  assert.equal((await verify(srv, 'u1', o.orderId, p.id)).json.reason, 'grant_refused');
  assert.equal(srv.db.keys('packEntitlements/').length, 0);
});

test('a paid pack is still granted if PACKS_ENABLED is switched off after the order was made', async (t) => {
  const db = memoryFirestore();
  const rzp = fakeRazorpay();
  const on = await start({ db, rzp });
  const o = await orderOk(on, 'u1', 'pack_bundle');
  await on.close();
  const envOff = { ...ENV_ON };
  delete envOff.PACKS_ENABLED;
  const off = await start({ env: envOff, db, rzp });
  t.after(off.close);
  const p = rzp.pay(o.orderId);
  const r = await verify(off, 'u1', o.orderId, p.id);
  assert.equal(r.status, 200);
  assert.equal(r.json.packId, 'pack_bundle:all');
});

test('two DIFFERENT payments for the same pack (two tabs): both recorded, the first entitlement is kept, the duplicate is counted', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const o1 = await orderOk(srv, 'u1', 'pack_chapter', { packTarget: 'circles' });
  const o2 = await orderOk(srv, 'u1', 'pack_chapter', { packTarget: 'circles' }); // both created before either is paid
  const p1 = srv.rzp.pay(o1.orderId);
  const p2 = srv.rzp.pay(o2.orderId);
  assert.equal((await verify(srv, 'u1', o1.orderId, p1.id)).status, 200);
  assert.equal((await verify(srv, 'u1', o2.orderId, p2.id)).status, 200);
  const kept = srv.db.read('packEntitlements/u1/packs/pack_chapter:circles');
  assert.equal(kept.paymentRef, p1.id);
  assert.equal(kept.orderId, o1.orderId);
  assert.ok(srv.db.read(`packEntitlements/u1/grants/${p2.id}`), 'the second payment is on record (refundable)');
  assert.equal(srv.db.read(`payOrders/${o2.orderId}`).status, 'paid');
  assert.ok(srv.events.includes('payments.verify.pack_duplicate_payment'));
  assert.equal(srv.db.keys('packEntitlements/u1/packs/').length, 1);
  // F3: refund candidates are findable on both records, and only the duplicate carries the flag.
  assert.equal(srv.db.read(`packEntitlements/u1/grants/${p2.id}`).duplicate, true);
  assert.equal(srv.db.read(`payOrders/${o2.orderId}`).duplicate, true);
  assert.equal(srv.db.read(`packEntitlements/u1/grants/${p1.id}`).duplicate, undefined);
  assert.equal(srv.db.read(`payOrders/${o1.orderId}`).duplicate, undefined);
  const again = await verify(srv, 'u1', o2.orderId, p2.id);
  assert.equal(again.json.replayed, true);
  assert.equal(srv.db.read(`payOrders/${o2.orderId}`).duplicate, true, 'a replay keeps the flag');
});

test('grantPack direct: refuses another account\'s order, a non-pack order, a missing order', async () => {
  const db = memoryFirestore({
    'payOrders/o_pass': { uid: 'u1', passType: 'month', amountPaise: 59900, status: 'created' },
    'payOrders/o_pack': { uid: 'u1', passType: 'pack_bundle', packTarget: 'all', amountPaise: 29900, status: 'created' },
  });
  await assert.rejects(grantPack({ db, uid: 'u1', order: { orderId: 'o_pass' }, paymentRef: 'p1', nowMs: NOW }), PackGrantInputError);
  await assert.rejects(grantPack({ db, uid: 'u2', order: { orderId: 'o_pack' }, paymentRef: 'p1', nowMs: NOW }), PackGrantInputError);
  await assert.rejects(grantPack({ db, uid: 'u1', order: { orderId: 'o_missing' }, paymentRef: 'p1', nowMs: NOW }), PackGrantInputError);
  await assert.rejects(grantPack({ db, uid: 'u1', order: { orderId: 'o_pack' }, paymentRef: 'a/b', nowMs: NOW }), PackGrantInputError);
  const ok = await grantPack({ db, uid: 'u1', order: { orderId: 'o_pack' }, paymentRef: 'p1', nowMs: NOW });
  assert.equal(ok.replayed, false);
  const again = await grantPack({ db, uid: 'u1', order: { orderId: 'o_pack' }, paymentRef: 'p1', nowMs: NOW + 5000 });
  assert.equal(again.replayed, true);
  assert.equal(again.pack.paidAt, NOW, 'a replay returns the original grant, not a new time');
});

test('the pass flow is untouched: a month order still grants a pass and answers passEnd', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const o = await orderOk(srv, 'u1', 'month');
  const p = srv.rzp.pay(o.orderId);
  const r = await verify(srv, 'u1', o.orderId, p.id);
  assert.equal(r.status, 200);
  assert.ok(r.json.passEnd);
  assert.equal(r.json.kind, undefined);
  assert.equal(srv.db.keys('packEntitlements/').length, 0);
});

test('GET /api/packs/mine: licensee lookup throws (or no email) -> 503 licensee_unavailable, packs NOT sent', async (t) => {
  const db = memoryFirestore();
  seedPack(db, 'u1', 'pack_bundle', 'all');
  const srv = await start({ db, throwLicensee: true });
  t.after(srv.close);
  const r = await call(srv.port, 'GET', PACKS_MINE_PATH, { headers: asUid('u1') });
  assert.equal(r.status, 503);
  assert.deepEqual(r.json, { ok: false, error: 'licensee_unavailable' });
  assert.equal(r.text.includes('pack_bundle'), false);
  assert.ok(srv.events.includes('packs.mine.licensee_unavailable'));
});

/* ── GET /api/packs/mine ─────────────────────────────────────────────────────── */
test('GET /api/packs/mine: 401 without a verified uid', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const r = await call(srv.port, 'GET', PACKS_MINE_PATH);
  assert.equal(r.status, 401);
  const forged = await call(srv.port, 'GET', PACKS_MINE_PATH, { headers: { 'X-Lazytopper-Uid': 'u1', 'X-User-ID': 'u1' } });
  assert.equal(forged.status, 401, 'a header uid is not a verified uid');
});

test('GET /api/packs/mine: [] when none, licensee from the server record of the verified uid', async (t) => {
  const srv = await start({ licensees: { u1: { name: 'Asha Rao', email: 'asha@example.com' } } });
  t.after(srv.close);
  const r = await call(srv.port, 'GET', PACKS_MINE_PATH, { headers: asUid('u1') });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { packs: [], licensee: { name: 'Asha Rao', email: 'asha@example.com' }, boardPassCredit: { creditInr: 0, expiresAtMs: null, payInr: null } });
  const blank = await call(srv.port, 'GET', PACKS_MINE_PATH, { headers: asUid('u9') });
  assert.equal(blank.status, 503, 'no email on record -> no licensee -> refuse');
  assert.deepEqual(blank.json, { ok: false, error: 'licensee_unavailable' });
});

test('GET /api/packs/mine: lists only the caller\'s packs, public fields only, even with PACKS_ENABLED off', async (t) => {
  const db = memoryFirestore();
  seedPack(db, 'u1', 'pack_chapter', 'circles', { paidAt: 2000, pricePaidInr: 49 });
  seedPack(db, 'u1', 'pack_mock', 'maths', { paidAt: 1000, pricePaidInr: 99 });
  seedPack(db, 'u2', 'pack_bundle', 'all', { paidAt: 1500 });
  const env = { ...ENV_ON };
  delete env.PACKS_ENABLED;
  const srv = await start({ db, env, licensees: { u1: { name: '', email: 'asha@example.com' } } });
  t.after(srv.close);
  const r = await call(srv.port, 'GET', PACKS_MINE_PATH, { headers: asUid('u1') });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.packs, [
    { packId: 'pack_mock:maths', sku: 'pack_mock', target: 'maths', pricePaidInr: 99, paidAt: 1000, orderId: 'o_seed' },
    { packId: 'pack_chapter:circles', sku: 'pack_chapter', target: 'circles', pricePaidInr: 49, paidAt: 2000, orderId: 'o_seed' },
  ]);
  assert.deepEqual(r.json.licensee, { name: '', email: 'asha@example.com' });
  assert.equal(JSON.stringify(r.json).includes('paymentRef'), false);
  assert.equal(JSON.stringify(r.json).includes('p_seed'), false, 'the payment reference stays server-side');
});

/* ══════════════════════════════════════════════════════════════════════════════
   PACK-CREDIT-1 - a Board Pass bought within 7 days of a pack is credited the pack price.
   MONEY: each test names a way the credit is NOT given, or a payment is NOT rejected / stranded.
   ══════════════════════════════════════════════════════════════════════════════ */
const WEEK = 7 * 24 * 60 * 60 * 1000;
const orderAmount = async (srv, uid, passType = 'till_boards') => (await orderOk(srv, uid, passType)).amountPaise;
async function fullBoardPrice(t) {
  const srv = await start();
  t.after(srv.close);
  return orderAmount(srv, 'nobody');
}

test('CREDIT · a Board Pass order for a student with a fresh Rs 49 pack is created at the price LESS Rs 49; notes + stored order carry it', async (t) => {
  const full = await fullBoardPrice(t);
  const db = memoryFirestore();
  seedPack(db, 'u1', 'pack_chapter', 'triangles', { pricePaidInr: 49, paidAt: NOW - 1000 });
  const srv = await start({ db });
  t.after(srv.close);
  const r = await orderOk(srv, 'u1', 'till_boards');
  assert.equal(r.amountPaise, full - 4900);
  const created = srv.rzp.calls.filter((c) => c.url.endsWith('/orders') && c.method === 'POST').pop();
  assert.equal(created.body.amount, full - 4900, 'Razorpay is asked for the CREDITED amount');
  assert.equal(created.body.notes.packCreditInr, '49');
  assert.equal(created.body.notes.packCreditIds, 'pack_chapter:triangles');
  const stored = srv.db.read(`payOrders/${r.orderId}`);
  assert.equal(stored.amountPaise, full - 4900);
  assert.equal(stored.packCreditInr, 49);
  assert.equal(stored.packCreditIds, 'pack_chapter:triangles');
  assert.ok(srv.events.includes('payments.order.pack_credit_applied'));
  // creating the order does NOT spend the credit: only the grant does
  assert.equal(srv.db.read('packEntitlements/u1/packs/pack_chapter:triangles').creditedToPass, false);
});

test('CREDIT · NOT given: month pass, a pack older than 7 days (7d + 1ms), an already-credited pack, someone else\'s pack, a body-supplied credit', async (t) => {
  const full = await fullBoardPrice(t);
  const db = memoryFirestore();
  seedPack(db, 'u1', 'pack_chapter', 'triangles', { pricePaidInr: 49, paidAt: NOW - 1000 });
  seedPack(db, 'old', 'pack_chapter', 'circles', { pricePaidInr: 49, paidAt: NOW - WEEK - 1 });
  seedPack(db, 'spent', 'pack_chapter', 'circles', { pricePaidInr: 49, paidAt: NOW - 1000, creditedToPass: true });
  seedPack(db, 'edge', 'pack_chapter', 'circles', { pricePaidInr: 49, paidAt: NOW - WEEK });
  const srv = await start({ db });
  t.after(srv.close);
  const month = await orderAmount(srv, 'u1', 'month');
  const monthNoPack = await orderAmount(srv, 'nobody', 'month');
  assert.equal(month, monthNoPack, 'a month pass earns no credit');
  assert.equal(await orderAmount(srv, 'old'), full, '7 days + 1 ms is out');
  assert.equal(await orderAmount(srv, 'spent'), full, 'a credited pack is spent');
  assert.equal(await orderAmount(srv, 'u2'), full, 'another student\'s pack is not mine');
  assert.equal(await orderAmount(srv, 'edge'), full - 4900, 'exactly 7 days is still in');
  const forged = await order(srv, 'nobody', 'till_boards', { packCreditInr: 9999, packCreditIds: 'pack_chapter:triangles', amountPaise: 100 });
  assert.equal(forged.status, 200);
  assert.equal(forged.json.amountPaise, full, 'the credit never comes from the request');
});

test('CREDIT · FAIL CLOSED: an unreadable pack list gives credit 0, the purchase still goes through at full price, and it is counted', async (t) => {
  const full = await fullBoardPrice(t);
  const real = memoryFirestore();
  seedPack(real, 'u1', 'pack_chapter', 'triangles', { pricePaidInr: 49, paidAt: NOW - 1000 });
  const db = {
    ...real,
    collection: (name) =>
      name === 'packEntitlements'
        ? { doc: () => ({ collection: () => ({ get: async () => { throw new Error('firestore down'); } }) }) }
        : real.collection(name),
  };
  const srv = await start({ db });
  t.after(srv.close);
  const r = await orderOk(srv, 'u1', 'till_boards');
  assert.equal(r.amountPaise, full);
  assert.equal(srv.db.read(`payOrders/${r.orderId}`).packCreditInr, undefined);
  assert.ok(srv.events.includes('payments.order.pack_credit_read_failed'));
});

test('CREDIT · the amount never drops below Rs 1: a pack total larger than the price is capped (whole packs only)', async (t) => {
  const db = memoryFirestore();
  for (let i = 0; i < 20; i += 1) seedPack(db, 'rich', 'pack_chapter', `ch${i}`, { pricePaidInr: 299, paidAt: NOW - 1000 - i });
  const srv = await start({ db });
  t.after(srv.close);
  const r = await orderOk(srv, 'rich', 'till_boards');
  assert.ok(r.amountPaise >= 100, `amount ${r.amountPaise} must stay at least Rs 1`);
  const ids = srv.db.read(`payOrders/${r.orderId}`).packCreditIds.split(',');
  assert.ok(ids.length < 20);
  const created = srv.rzp.calls.filter((c) => c.url.endsWith('/orders') && c.method === 'POST').pop();
  assert.ok(created.body.notes.packCreditIds === undefined || created.body.notes.packCreditIds.length <= 256);
});

test('CREDIT · A CREDITED ORDER IS NOT REJECTED AS A MISMATCH: verify grants, records the AMOUNT PAID, marks the packs credited, and a replay changes nothing', async (t) => {
  const full = await fullBoardPrice(t);
  const db = memoryFirestore();
  seedPack(db, 'u1', 'pack_chapter', 'triangles', { pricePaidInr: 49, paidAt: NOW - 1000 });
  seedPack(db, 'u1', 'pack_mock', 'maths', { pricePaidInr: 99, paidAt: NOW - 2000 });
  const srv = await start({ db });
  t.after(srv.close);
  const o = await orderOk(srv, 'u1', 'till_boards');
  const p = srv.rzp.pay(o.orderId);
  assert.equal(p.amount, full - 14800);
  const v = await verify(srv, 'u1', o.orderId, p.id);
  assert.equal(v.status, 200, JSON.stringify(v.json));
  assert.equal(v.json.pass.passType, 'till_boards');
  assert.equal(v.json.pass.pricePaidInr, (full - 14800) / 100, 'the subscription records what was actually paid');
  assert.equal(srv.db.read('subscriptions/u1').pricePaidInr, (full - 14800) / 100);
  for (const id of ['pack_chapter:triangles', 'pack_mock:maths']) {
    const pk = srv.db.read(`packEntitlements/u1/packs/${id}`);
    assert.equal(pk.creditedToPass, true, id);
    assert.equal(pk.creditedOrderId, o.orderId, id);
  }
  const stored = srv.db.read(`payOrders/${o.orderId}`);
  assert.equal(stored.status, 'paid');
  assert.equal(stored.packCreditConflict, undefined);
  assert.ok(srv.events.includes('payments.verify.pack_credit_marked'));
  assert.ok(!srv.events.some((e) => e.includes('pack_credit_conflict')));
  assert.ok(!srv.events.some((e) => e.includes('amount_mismatch')));
  // replay: nothing is written twice
  const before = srv.db.version('packEntitlements/u1/packs/pack_mock:maths');
  const again = await verify(srv, 'u1', o.orderId, p.id);
  assert.equal(again.status, 200);
  assert.equal(again.json.replayed, true);
  assert.equal(srv.db.version('packEntitlements/u1/packs/pack_mock:maths'), before);
  // the credit is SPENT: the next Board Pass order has none
  assert.equal(await orderAmount(srv, 'u1', 'till_boards'), full);
});

test('CREDIT · paying the FULL price for a credited order is refused (the stored credited amount is what is enforced)', async (t) => {
  const full = await fullBoardPrice(t);
  const db = memoryFirestore();
  seedPack(db, 'u1', 'pack_chapter', 'triangles', { pricePaidInr: 49, paidAt: NOW - 1000 });
  const srv = await start({ db });
  t.after(srv.close);
  const o = await orderOk(srv, 'u1', 'till_boards');
  const p = srv.rzp.pay(o.orderId, { amount: full });
  const v = await verify(srv, 'u1', o.orderId, p.id);
  assert.equal(v.status, 400);
  assert.equal(v.json.reason, 'amount_mismatch');
  assert.equal(srv.db.read('subscriptions/u1'), undefined);
  assert.equal(srv.db.read('packEntitlements/u1/packs/pack_chapter:triangles').creditedToPass, false);
});

test('CREDIT · the webhook and /status grant a credited order the same way (one grant, packs marked once)', async (t) => {
  const full = await fullBoardPrice(t);
  const db = memoryFirestore();
  seedPack(db, 'u1', 'pack_chapter', 'triangles', { pricePaidInr: 49, paidAt: NOW - 1000 });
  seedPack(db, 'u2', 'pack_chapter', 'circles', { pricePaidInr: 49, paidAt: NOW - 1000 });
  const srv = await start({ db });
  t.after(srv.close);
  const o1 = await orderOk(srv, 'u1', 'till_boards');
  const p1 = srv.rzp.pay(o1.orderId);
  const w = await webhook(srv, p1);
  assert.equal(w.status, 200, JSON.stringify(w.json));
  assert.equal(srv.db.read('packEntitlements/u1/packs/pack_chapter:triangles').creditedToPass, true);
  const o2 = await orderOk(srv, 'u2', 'till_boards');
  srv.rzp.pay(o2.orderId);
  const s = await status(srv, 'u2', o2.orderId);
  assert.equal(s.status, 200, JSON.stringify(s.json));
  assert.equal(srv.db.read('packEntitlements/u2/packs/pack_chapter:circles').creditedToPass, true);
  assert.equal(srv.db.read('subscriptions/u2').pricePaidInr, (full - 4900) / 100);
});

test('CREDIT · CONFLICT: two orders created on the same pack, both paid -> both passes granted for what was paid; the second is flagged packCreditConflict, counted, never thrown', async (t) => {
  const full = await fullBoardPrice(t);
  const db = memoryFirestore();
  seedPack(db, 'u1', 'pack_chapter', 'triangles', { pricePaidInr: 49, paidAt: NOW - 1000 });
  const srv = await start({ db });
  t.after(srv.close);
  const a = await orderOk(srv, 'u1', 'till_boards');
  const b = await orderOk(srv, 'u1', 'till_boards');
  assert.equal(a.amountPaise, full - 4900);
  assert.equal(b.amountPaise, full - 4900, 'both were quoted before either was paid');
  const pa = srv.rzp.pay(a.orderId);
  const pb = srv.rzp.pay(b.orderId);
  const va = await verify(srv, 'u1', a.orderId, pa.id);
  assert.equal(va.status, 200, JSON.stringify(va.json));
  const vb = await verify(srv, 'u1', b.orderId, pb.id);
  assert.equal(vb.status, 200, 'the money is real: the second pass is granted too');
  assert.equal(vb.json.replayed, false);
  assert.equal(srv.db.read(`payOrders/${a.orderId}`).packCreditConflict, undefined);
  assert.equal(srv.db.read(`payOrders/${b.orderId}`).packCreditConflict, true);
  assert.equal(srv.db.read(`payOrders/${b.orderId}`).status, 'paid');
  assert.equal(srv.db.read('packEntitlements/u1/packs/pack_chapter:triangles').creditedOrderId, a.orderId, 'the first order keeps the credit');
  assert.equal(srv.db.read('subscriptions/u1').pricePaidInr, (full - 4900) / 100);
  assert.ok(srv.events.includes('payments.verify.pack_credit_conflict'));
});

test('CREDIT · a pack that vanished between order and payment is a conflict, not a failure: pass granted, order flagged', async (t) => {
  const full = await fullBoardPrice(t);
  const db = memoryFirestore();
  seedPack(db, 'u1', 'pack_chapter', 'triangles', { pricePaidInr: 49, paidAt: NOW - 1000 });
  const srv = await start({ db });
  t.after(srv.close);
  const o = await orderOk(srv, 'u1', 'till_boards');
  srv.db.docs.delete('packEntitlements/u1/packs/pack_chapter:triangles');
  const p = srv.rzp.pay(o.orderId);
  const v = await verify(srv, 'u1', o.orderId, p.id);
  assert.equal(v.status, 200, JSON.stringify(v.json));
  assert.equal(srv.db.read(`payOrders/${o.orderId}`).packCreditConflict, true);
  assert.equal(srv.db.read('subscriptions/u1').pricePaidInr, (full - 4900) / 100);
});

test('CREDIT · a Board Pass order with NO credit is exactly today\'s order (no new notes or fields)', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const o = await orderOk(srv, 'u1', 'till_boards');
  const created = srv.rzp.calls.filter((c) => c.url.endsWith('/orders') && c.method === 'POST').pop();
  assert.deepEqual(Object.keys(created.body.notes).sort(), ['offerKey', 'passType', 'uid']);
  assert.deepEqual(Object.keys(srv.db.read(`payOrders/${o.orderId}`)).sort(), ['amountPaise', 'createdAt', 'offerKey', 'passType', 'status', 'uid']);
});

test('CREDIT · GET /api/packs/mine reports boardPassCredit { creditInr, expiresAtMs, payInr } from the server; read only', async (t) => {
  const full = await fullBoardPrice(t);
  const db = memoryFirestore();
  seedPack(db, 'u1', 'pack_chapter', 'triangles', { pricePaidInr: 49, paidAt: NOW - 3000 });
  seedPack(db, 'u1', 'pack_mock', 'maths', { pricePaidInr: 99, paidAt: NOW - WEEK - 1 });
  const srv = await start({ db, licensees: { u1: { name: '', email: 'a@example.com' } } });
  t.after(srv.close);
  const writes = srv.db.stats.writes.length;
  const r = await call(srv.port, 'GET', PACKS_MINE_PATH, { headers: asUid('u1') });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.boardPassCredit, { creditInr: 49, expiresAtMs: NOW - 3000 + WEEK, payInr: (full - 4900) / 100 });
  assert.equal(srv.db.stats.writes.length, writes, 'no write');
});

test('PAY-PHONE-1 · GET /api/packs/mine: a phone-only account is licensed by its MASKED number; email accounts unchanged', async (t) => {
  const srv = await start({
    licensees: {
      phoneOnly: { name: 'Asha', email: '', phone: '+919876543948' },
      both: { name: 'Ravi', email: 'ravi@example.com', phone: '+917012345678' },
      foreign: { name: 'X', email: '', phone: '+14155550123' },
    },
  });
  t.after(srv.close);
  const p = await call(srv.port, 'GET', PACKS_MINE_PATH, { headers: asUid('phoneOnly') });
  assert.equal(p.status, 200);
  assert.deepEqual(p.json.licensee, { name: 'Asha', email: '', phone: '+91 98•••••948' });
  assert.ok(!p.text.includes('9876543948'), 'the full number never leaves the server');
  const b = await call(srv.port, 'GET', PACKS_MINE_PATH, { headers: asUid('both') });
  assert.deepEqual(b.json.licensee, { name: 'Ravi', email: 'ravi@example.com' }, 'an email account is licensed exactly as before');
  const f = await call(srv.port, 'GET', PACKS_MINE_PATH, { headers: asUid('foreign') });
  assert.equal(f.status, 503, 'no email and no maskable Indian mobile -> refuse as before');
});

test('OWNER 2 Nov · packs are not part of Premium: a Premium uid (pass till the boards) buys pack_cbq maths through the signed-in path', async (t) => {
  const db = memoryFirestore();
  await db.collection('subscriptions').doc('prem1').set({
    tier: 'premium', plan: 'pass_till_boards', passType: 'till_boards', passEnd: new Date(Date.parse('2027-12-31T00:00:00Z')),
    pricePaidInr: 1917, lastPaymentRef: 'pay_pass', foundingMember: true,
  });
  const srv = await start({ db });
  t.after(srv.close);
  const r = await order(srv, 'prem1', 'pack_cbq', { packTarget: 'maths' });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.amountPaise, 19900);
  assert.equal(db.read(`payOrders/${r.json.orderId}`).uid, 'prem1');
});
