/**
 * whatsappOptIn.test.cjs - WHATSAPP-OPTIN-1: POST /api/whatsapp/optin (free-sample WhatsApp opt-in) + the shared validator.
 * Run: node --test lazytopper/server/routes/whatsappOptIn.test.cjs   (wired as test:server:whatsapp-optin)
 *
 * MUTATIONS (each must turn a named test red):
 *   M1 route: drop the `consent !== true` check                      -> "no consent -> 400"
 *   M2 route: store the raw typed phone instead of the normalised    -> "valid -> doc written (normalised)"
 *   M3 route: console.error / log carries the phone                  -> "the number never reaches a log"
 *   M4 route: drop the rate limiter                                  -> "per-IP limit"
 *   M5 route: take consentText from the body                         -> "consentText is the server constant"
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');

const { createWhatsappOptInRoutes, validateBody, MAX_CALLS_PER_CLIENT_PER_DAY } = require('./whatsappOptIn.cjs');
const { WA_OPTIN_LABEL, WA_OPTIN_VERSION, buildOrderOptIn, orderOptInField, optInDocId } = require('../services/waOptIn.cjs');

const NOW = Date.parse('2030-06-15T06:30:00.000Z');
const PHONE = '9876543948';
const E164 = '+919876543948';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

function makeReq(body, ip = '1.2.3.4') {
  const req = new EventEmitter();
  req.headers = { 'content-type': 'application/json', 'x-forwarded-for': ip };
  req.socket = { remoteAddress: ip };
  process.nextTick(() => {
    if (body !== undefined) req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
    req.emit('end');
  });
  return req;
}
function makeRes() {
  return { statusCode: 0, body: null };
}
const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.body = body;
};
function makeDb() {
  const store = new Map();
  const db = {
    store,
    collection: (c) => ({
      doc: (id) => ({
        id,
        get: async () => ({ exists: store.has(`${c}/${id}`), data: () => ({ ...store.get(`${c}/${id}`) }) }),
        set: async (data, opts) => store.set(`${c}/${id}`, opts && opts.merge ? { ...(store.get(`${c}/${id}`) || {}), ...data } : { ...data }),
      }),
    }),
    async runTransaction(fn) {
      const pending = [];
      const tx = { get: (ref) => ref.get(), set: (ref, d, o) => { pending.push(() => ref.set(d, o)); return tx; } };
      const r = await fn(tx);
      for (const w of pending) await w();
      return r;
    },
  };
  return db;
}
function world(over = {}) {
  const db = makeDb();
  let now = NOW;
  const routes = createWhatsappOptInRoutes({ sendJson, adminFirestore: db, now: () => now, env: {}, ...over });
  const call = async (body, ip) => {
    const res = makeRes();
    await routes.handle(makeReq(body, ip), res);
    return res;
  };
  return { db, call, tick: (ms) => { now += ms; } };
}
const good = (over = {}) => ({ phone: PHONE, consent: true, packId: 'pack_cbq:maths', consentVersion: 'wa-optin-v1', ...over });

test('the label and version are exactly the owner-approved strings', () => {
  assert.equal(WA_OPTIN_LABEL, 'Send me updates on WhatsApp');
  assert.equal(WA_OPTIN_VERSION, 'wa-optin-v1');
});

test('invalid phone -> 400, nothing written', async () => {
  const w = world();
  for (const phone of ['12345', '5876543210', 'abcdefghij', '', null, 9876543948, '+441234567890', '98765 4394']) {
    const r = await w.call(good({ phone }));
    assert.equal(r.statusCode, 400, String(phone));
  }
  assert.equal(w.db.store.size, 0);
});

test('no consent -> 400, nothing written (missing, false, "true", 1)', async () => {
  const w = world();
  for (const consent of [undefined, false, 'true', 1, null]) {
    const r = await w.call(good({ consent }));
    assert.equal(r.statusCode, 400, String(consent));
  }
  assert.equal(w.db.store.size, 0);
});

test('unknown pack / unknown consent version / non-object body -> 400', async () => {
  const w = world();
  assert.equal((await w.call(good({ packId: 'pack_nope:x' }))).statusCode, 400);
  assert.equal((await w.call(good({ packId: undefined }))).statusCode, 400);
  assert.equal((await w.call(good({ consentVersion: 'wa-optin-v0' }))).statusCode, 400);
  assert.equal((await w.call('[]')).statusCode, 400);
  assert.equal((await w.call('not json')).statusCode, 400);
  assert.equal(w.db.store.size, 0);
});

test('valid -> doc written (normalised), keyed on sha256(E.164); a second pack unions; firstAt is kept', async () => {
  const w = world();
  const r = await w.call(good({ phone: '98765 43948' }));
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body, { ok: true }, 'the response echoes nothing');
  const key = `waOptIns/${sha(E164)}`;
  assert.equal(optInDocId(E164), sha(E164));
  assert.deepEqual(w.db.store.get(key), {
    phone: E164, packIds: ['pack_cbq:maths'], consentText: WA_OPTIN_LABEL, consentVersion: WA_OPTIN_VERSION, firstAt: NOW, lastAt: NOW, source: 'sample',
  });
  w.tick(60_000);
  assert.equal((await w.call(good({ phone: `+91${PHONE}`, packId: 'pack_mock:science' }))).statusCode, 200);
  assert.equal((await w.call(good({ packId: 'pack_cbq:maths' }))).statusCode, 200);
  const row = w.db.store.get(key);
  assert.deepEqual(row.packIds, ['pack_cbq:maths', 'pack_mock:science']);
  assert.equal(row.firstAt, NOW);
  assert.equal(row.lastAt, NOW + 60_000);
  assert.equal(w.db.store.size, 1);
});

test('consentText is the server constant (a body-supplied text is ignored)', async () => {
  const w = world();
  await w.call(good({ consentText: 'I agree to anything', source: 'admin' }));
  const row = [...w.db.store.values()][0];
  assert.equal(row.consentText, WA_OPTIN_LABEL);
  assert.equal(row.source, 'sample');
});

test('the number never reaches a log (console spy over a success, a 400 and a store failure)', async () => {
  const seen = [];
  const orig = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  for (const k of Object.keys(orig)) console[k] = (...a) => seen.push(a.map(String).join(' '));
  try {
    const w = world();
    await w.call(good());
    await w.call(good({ phone: '12345' }));
    const broken = world({ adminFirestore: { collection: () => { throw new Error(`boom ${E164}`); } } });
    const r = await broken.call(good());
    assert.equal(r.statusCode, 500);
  } finally {
    Object.assign(console, orig);
  }
  assert.equal(seen.some((l) => l.includes(PHONE) || l.includes('9876543948') || l.includes(E164)), false, seen.join('\n'));
});

test('per-IP limit: the hard cap answers 429 for that IP only', async () => {
  const w = world();
  for (let i = 0; i < MAX_CALLS_PER_CLIENT_PER_DAY; i += 1) assert.equal((await w.call(good(), '9.9.9.9')).statusCode, 200, `call ${i}`);
  assert.equal((await w.call(good(), '9.9.9.9')).statusCode, 429);
  assert.equal((await w.call(good(), '8.8.8.8')).statusCode, 200);
});

test('WA_OPTIN_DISABLED -> 404 and nothing written; no Firestore -> 503', async () => {
  const off = world({ env: { WA_OPTIN_DISABLED: '1' } });
  assert.equal((await off.call(good())).statusCode, 404);
  assert.equal(off.db.store.size, 0);
  const none = world({ adminFirestore: null });
  assert.equal((await none.call(good())).statusCode, 503);
});

test('validateBody is pure and returns no number in its error text', () => {
  const r = validateBody({ phone: '123', consent: true, packId: 'pack_cbq:maths' });
  assert.equal(r.ok, false);
  assert.equal(JSON.stringify(r).includes('123'), false);
});

test('buildOrderOptIn / orderOptInField: only valid + explicitly ticked; stored shape is exact', () => {
  assert.deepEqual(buildOrderOptIn({ phone: PHONE, consent: true }, NOW, {}), {
    phone: E164, consentText: WA_OPTIN_LABEL, consentVersion: 'wa-optin-v1', consentAt: NOW, source: 'checkout',
  });
  assert.equal(buildOrderOptIn({ phone: PHONE, consent: false }, NOW, {}), null);
  assert.equal(buildOrderOptIn({ phone: PHONE }, NOW, {}), null);
  assert.equal(buildOrderOptIn({ phone: '123', consent: true }, NOW, {}), null);
  assert.equal(buildOrderOptIn({ phone: PHONE, consent: true }, NOW, { WA_OPTIN_DISABLED: 'on' }), null);
  assert.deepEqual(orderOptInField({}, NOW, {}), {});
  assert.deepEqual(orderOptInField(undefined, NOW, {}), {});
  assert.deepEqual(Object.keys(orderOptInField({ waOptIn: { phone: PHONE, consent: true } }, NOW, {})), ['waOptIn']);
});
