// CHECKOUT-FAST-1 - the order routes' CRITICAL PATH. With fake latency on every Firestore / Auth / Razorpay call, the response time
// is about the longest of the independent parts, not their sum - and the answers, the stored order and the Razorpay body are
// the same as the sequential route's (PAY_ORDER_PARALLEL_DISABLED=1 restores the old sequence).
//
// Run: node --test lazytopper/server/routes/guestPay.test.cjs (it requires this file)

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createGuestPayRoutes, GUEST_ORDER_PATH } = require('./guestPay.cjs');
const { createPaymentRoutes, PAY_ORDER_PATH } = require('./payments.cjs');
const { createHttpUtils } = require('../services/httpUtils.cjs');

const L = 70; // ms of fake latency per Firestore / Auth read
const R = 70; // ms of fake latency for the Razorpay order call
const KEY_ID = 'rzp_test_KEYID';
const KEY_SECRET = 'test_key_secret_never_sent';
const NOW = Date.parse('2026-11-12T12:00:00+05:30');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** In-memory Firestore where EVERY operation costs `latency` ms and the call log records start order. */
function slowFirestore(latency = L, seed = {}) {
  const docs = new Map(Object.entries(seed));
  const log = [];
  const chain = (prefix, filters = []) => ({
    where: (f, op, v) => chain(prefix, [...filters, [f, v]]),
    limit: () => chain(prefix, filters),
    async get() {
      log.push(`query:${prefix}`);
      await sleep(latency);
      const out = [];
      for (const [k, data] of docs) {
        if (!k.startsWith(`${prefix}/`) || k.slice(prefix.length + 1).includes('/')) continue;
        if (filters.every(([f, v]) => data[f] === v)) out.push({ id: k.slice(prefix.length + 1), data: () => ({ ...data }) });
      }
      return { docs: out };
    },
  });
  const ref = (key) => ({
    key,
    collection: (sub) => ({ doc: (id) => ref(`${key}/${sub}/${id}`), ...chain(`${key}/${sub}`) }),
    async get() { log.push(`get:${key}`); await sleep(latency); const d = docs.get(key); return { exists: !!d, data: () => (d ? { ...d } : undefined) }; },
    async set(data, opts) { log.push(`set:${key}`); await sleep(latency); docs.set(key, { ...(opts && opts.merge ? docs.get(key) || {} : {}), ...data }); },
  });
  return { docs, log, collection: (name) => ({ doc: (id) => ref(`${name}/${id}`), ...chain(name) }) };
}

function slowRazorpay(latency = R) {
  const calls = [];
  async function fetchImpl(url, init = {}) {
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    await sleep(latency);
    if (method === 'POST' && new URL(url).pathname === '/v1/orders') {
      const order = { id: `order_T${calls.length}`, amount: body.amount, currency: body.currency, status: 'created' };
      return { ok: true, status: 200, json: async () => order };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  }
  return { fetchImpl, calls };
}

async function serve(handler) {
  const { sendJson } = createHttpUtils('*');
  const server = http.createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch((e) => sendJson(res, 500, { error: e.message }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, close: () => new Promise((r) => server.close(r)) };
}
let ip = 0;
function post(port, path, body, headers = {}) {
  ip += 1;
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const req = http.request(
      { host: '127.0.0.1', port, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), 'X-Forwarded-For': `198.51.100.${ip % 250}`, ...headers } },
      (res) => {
        let text = '';
        res.on('data', (d) => { text += d; });
        res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(text || 'null'), ms: Date.now() - started }));
      },
    );
    req.on('error', reject);
    req.end(payload);
  });
}

/* ── the signed-out phone order (the route that has three independent reads before Razorpay) ── */
async function guestRun({ parallelOff, accountExists = false, accountThrows = false, existingThrows = false, seed = {} } = {}) {
  const db = slowFirestore(L, seed);
  if (existingThrows) {
    const real = db.collection;
    db.collection = (name) => {
      const c = real(name);
      return { ...c, where: () => ({ where: () => ({ limit: () => ({ get: async () => { await sleep(L); throw new Error('boom'); } }) }) }) };
    };
  }
  const rzp = slowRazorpay(R);
  const { sendJson } = createHttpUtils('*');
  const env = { PAYMENTS_ENABLED: '1', GUEST_PAY_ENABLED: '1', PACKS_ENABLED: '1', RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, ...(parallelOff ? { PAY_ORDER_PARALLEL_DISABLED: '1' } : {}) };
  const events = [];
  const guest = createGuestPayRoutes({
    sendJson, verifiedCaller: { async resolveVerifiedUid() { return ''; } }, adminFirestore: db, telemetry: { increment: (e) => events.push(e) }, env, fetchImpl: rzp.fetchImpl, now: () => NOW, foundingOfferOpen: true,
    accountExistsForPhone: async () => { await sleep(L); if (accountThrows) throw new Error('auth down'); return accountExists; },
  });
  const srv = await serve((req, res) => guest.handleOrder(req, res));
  try {
    const r = await post(srv.port, GUEST_ORDER_PATH, { sku: 'pack_bundle', phone: '9876543210' });
    return { r, db, rzp, events };
  } finally {
    await srv.close();
  }
}

test('guest phone order: the three independent reads overlap - the response is ~max, not the sum', async () => {
  const seq = await guestRun({ parallelOff: true });
  const par = await guestRun({ parallelOff: false });
  assert.equal(seq.r.status, 200, JSON.stringify(seq.r.json));
  assert.equal(par.r.status, 200, JSON.stringify(par.r.json));
  if (process.env.TIMING_REPORT) console.log(`TIMING guest phone order: sequential ${seq.r.ms} ms -> parallel ${par.r.ms} ms (L=${L} R=${R})`);
  // sequential = account L + unclaimed L + claimed L + razorpay R + store L = 4L + R ; parallel = L + R + L = 2L + R
  assert.ok(seq.r.ms >= 4 * L + R - 25, `sequential should be ~${4 * L + R} ms, was ${seq.r.ms}`);
  assert.ok(par.r.ms <= 2 * L + R + 90, `parallel should be ~${2 * L + R} ms, was ${par.r.ms}`);
  assert.ok(seq.r.ms - par.r.ms >= 2 * L - 40, `parallel must save about two reads (seq ${seq.r.ms}, par ${par.r.ms})`);
});

test('guest phone order: same answer, same Razorpay body, same stored order in both modes', async () => {
  const seq = await guestRun({ parallelOff: true });
  const par = await guestRun({ parallelOff: false });
  const strip = (j) => ({ ...j, orderId: 'X', statusProof: j.statusProof ? 'P' : undefined });
  assert.deepEqual(strip(par.r.json), strip(seq.r.json));
  assert.deepEqual(par.rzp.calls.map((c) => [c.method, new URL(c.url).pathname, c.body]), seq.rzp.calls.map((c) => [c.method, new URL(c.url).pathname, c.body]));
  const stored = (run) => { const d = { ...[...run.db.docs.values()][0] }; delete d.createdAt; delete d.statusProofHash; return d; };
  assert.deepEqual(stored(par), stored(seq));
  assert.deepEqual(par.events, seq.events);
});

test('guest phone order: a failing account lookup, an existing account and an already-paid order answer exactly as before - in BOTH modes', async () => {
  for (const parallelOff of [true, false]) {
    const exists = await guestRun({ parallelOff, accountExists: true });
    assert.deepEqual([exists.r.status, exists.r.json], [409, { ok: false, error: 'account_exists' }], `exists (parallelOff=${parallelOff})`);
    assert.equal(exists.rzp.calls.length, 0, 'no Razorpay order for an existing account');
    const lookup = await guestRun({ parallelOff, accountThrows: true, existingThrows: true });
    assert.deepEqual([lookup.r.status, lookup.r.json], [500, { ok: false, error: 'Could not start the payment.' }]);
    assert.ok(lookup.events.includes('payments.guest.order.account_lookup_failed'), 'the LOOKUP failure wins over the existing-read failure');
    assert.equal(lookup.rzp.calls.length, 0);
    const readFail = await guestRun({ parallelOff, existingThrows: true });
    assert.equal(readFail.r.status, 500);
    assert.ok(readFail.events.includes('payments.guest.order.existing_read_failed'));
    assert.equal(readFail.rzp.calls.length, 0, 'a failed read fails CLOSED: no order');
    const paid = await guestRun({ parallelOff, seed: { 'payOrders/order_OLD': { payer: 'guest', guestPhone: '+919876543210', status: 'paid_unclaimed', passType: 'pack_bundle' } } });
    assert.deepEqual([paid.r.status, paid.r.json], [409, { ok: false, error: 'payment_unavailable' }]);
    assert.equal(paid.rzp.calls.length, 0, 'never takes the money twice');
  }
});

/* ── the signed-in Board Pass order (the ₹1,083 upgrade and the full price) ── */
async function passRun({ parallelOff }) {
  const db = slowFirestore(L);
  const rzp = slowRazorpay(R);
  const { sendJson } = createHttpUtils('*');
  const env = { PAYMENTS_ENABLED: '1', RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, ...(parallelOff ? { PAY_ORDER_PARALLEL_DISABLED: '1' } : {}) };
  const pay = createPaymentRoutes({ sendJson, verifiedCaller: { async resolveVerifiedUid() { return 'uid_1'; } }, adminFirestore: db, telemetry: { increment() {} }, env, fetchImpl: rzp.fetchImpl, now: () => NOW, foundingOfferOpen: true });
  const srv = await serve((req, res) => pay.handleOrder(req, res));
  try {
    const r = await post(srv.port, PAY_ORDER_PATH, { passType: 'till_boards' }, { Authorization: 'Bearer uid:uid_1' });
    return { r, db, rzp };
  } finally {
    await srv.close();
  }
}

test('signed-in Board Pass order: subscription, Test Series credit and open-order scan start together', async () => {
  const seq = await passRun({ parallelOff: true });
  const par = await passRun({ parallelOff: false });
  assert.equal(seq.r.status, 200, JSON.stringify(seq.r.json));
  assert.equal(par.r.status, 200, JSON.stringify(par.r.json));
  if (process.env.TIMING_REPORT) console.log(`TIMING signed-in Board Pass order: sequential ${seq.r.ms} ms -> parallel ${par.r.ms} ms (L=${L} R=${R})`);
  // sequential = sub L + pack credit L + ts credit L + reuse scan L + razorpay R + store L = 5L + R
  // parallel   = max(sub, ts, scan) L + pack credit L + razorpay R + store L = 3L + R
  assert.ok(seq.r.ms >= 5 * L + R - 30, `sequential should be ~${5 * L + R} ms, was ${seq.r.ms}`);
  assert.ok(par.r.ms <= 3 * L + R + 90, `parallel should be ~${3 * L + R} ms, was ${par.r.ms}`);
  assert.ok(seq.r.ms - par.r.ms >= 2 * L - 40, `parallel must save about two reads (seq ${seq.r.ms}, par ${par.r.ms})`);
  // the same order is made: amount, Razorpay body, stored document
  const strip = (j) => ({ ...j, orderId: 'X' });
  assert.deepEqual(strip(par.r.json), strip(seq.r.json));
  assert.deepEqual(par.rzp.calls.map((c) => c.body), seq.rzp.calls.map((c) => c.body));
  const stored = (run) => { const d = { ...run.db.docs.get('payOrders/order_T1') }; delete d.createdAt; return d; };
  assert.deepEqual(stored(par), stored(seq));
});
