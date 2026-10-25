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
    sendJson, verifiedCaller, adminFirestore: db, telemetry,
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
  assert.deepEqual(r.json, { packs: [], licensee: { name: 'Asha Rao', email: 'asha@example.com' } });
  const blank = await call(srv.port, 'GET', PACKS_MINE_PATH, { headers: asUid('u9') });
  assert.deepEqual(blank.json, { packs: [], licensee: { name: '', email: '' } });
});

test('GET /api/packs/mine: lists only the caller\'s packs, public fields only, even with PACKS_ENABLED off; licensee failure -> blanks', async (t) => {
  const db = memoryFirestore();
  seedPack(db, 'u1', 'pack_chapter', 'circles', { paidAt: 2000, pricePaidInr: 49 });
  seedPack(db, 'u1', 'pack_mock', 'maths', { paidAt: 1000, pricePaidInr: 99 });
  seedPack(db, 'u2', 'pack_bundle', 'all', { paidAt: 1500 });
  const env = { ...ENV_ON };
  delete env.PACKS_ENABLED;
  const srv = await start({ db, env, throwLicensee: true });
  t.after(srv.close);
  const r = await call(srv.port, 'GET', PACKS_MINE_PATH, { headers: asUid('u1') });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.packs, [
    { packId: 'pack_mock:maths', sku: 'pack_mock', target: 'maths', pricePaidInr: 99, paidAt: 1000 },
    { packId: 'pack_chapter:circles', sku: 'pack_chapter', target: 'circles', pricePaidInr: 49, paidAt: 2000 },
  ]);
  assert.deepEqual(r.json.licensee, { name: '', email: '' });
  assert.equal(JSON.stringify(r.json).includes('paymentRef'), false);
  assert.equal(JSON.stringify(r.json).includes('o_seed'), false);
});
