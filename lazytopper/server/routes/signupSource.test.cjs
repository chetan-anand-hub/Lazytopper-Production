/**
 * signupSource.test.cjs — SOURCE-1, server half (POST /api/signup-source).
 *
 * Run: node --test lazytopper/server/routes/signupSource.test.cjs
 * Wired into `lazytopper` test:matrix:all as test:server:signup-source.
 *
 * The clock is INJECTED (deps.now) from a fixed instant, so this passes at any
 * LT_TEST_CLOCK.
 *
 * Spec mutations that turn THIS file red (one at a time):
 *   M1  drop the 15-minute account-age check            -> "an account older than 15 minutes -> 409, no write"
 *   M2  overwrite instead of create-only (`set`)        -> "a second call does not overwrite"
 *   M3  accept a gclid VALUE (string)                   -> "a gclid VALUE in the body -> 400"
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  createSignupSourceRoutes,
  validateSource,
  MAX_ACCOUNT_AGE_MS,
  MAX_CALLS_PER_WINDOW,
  SIGNUP_SOURCES_COLLECTION,
} = require('./signupSource.cjs');

const NOW = Date.parse('2030-06-15T06:30:00.000Z');
const iso = (ms) => new Date(ms).toUTCString();

const GOOD = {
  ref: 'youtube.com',
  utm_source: 'youtube',
  utm_medium: 'paid',
  utm_campaign: 'test',
  utm_content: null,
  landing: '/',
  gclid: false,
  fbclid: false,
};

function makeReq(body, headers = {}) {
  const req = new EventEmitter();
  req.headers = { 'content-type': 'application/json', ...headers };
  process.nextTick(() => {
    if (body !== undefined) req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
    req.emit('end');
  });
  return req;
}

function makeRes() {
  const res = { statusCode: 0, body: null, ended: false };
  res.end = () => {
    res.ended = true;
  };
  return res;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.body = body;
}

/** accounts: uid -> creationTime ms. tokens: uid per Bearer token. */
function makeWorld({ accounts = { u1: NOW - 60 * 1000 }, verified = { 'tok-u1': 'u1', 'tok-old': 'old' } } = {}) {
  const store = new Map();
  const writes = [];
  const accountMap = { old: NOW - 60 * 60 * 1000, ...accounts };
  const verifiedCaller = {
    async resolveVerifiedCaller(req) {
      const h = String(req.headers.authorization || '');
      const tok = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
      if (!tok) return { uid: '', reason: 'no-token' };
      if (verified[tok]) return { uid: verified[tok], reason: 'verified' };
      return { uid: '', reason: 'invalid' };
    },
  };
  const firebaseAdmin = {
    auth: () => ({
      async getUser(uid) {
        if (!(uid in accountMap)) {
          const e = new Error('no user');
          e.code = 'auth/user-not-found';
          throw e;
        }
        return { uid, metadata: { creationTime: iso(accountMap[uid]) } };
      },
    }),
    firestore: { FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) } },
  };
  const adminFirestore = {
    collection(name) {
      return {
        doc(id) {
          const p = `${name}/${id}`;
          return {
            async create(data) {
              writes.push({ op: 'create', path: p, data });
              if (store.has(p)) {
                const e = new Error('6 ALREADY_EXISTS: Document already exists');
                e.code = 6;
                throw e;
              }
              store.set(p, data);
            },
          };
        },
      };
    },
  };
  const routes = createSignupSourceRoutes({ sendJson, verifiedCaller, firebaseAdmin, adminFirestore, now: () => NOW });
  return { routes, store, writes };
}

async function call(world, body, token = 'tok-u1') {
  const res = makeRes();
  await world.routes.handleSignupSource(makeReq(body, token ? { authorization: `Bearer ${token}` } : {}), res);
  return res;
}

test('a verified, brand-new account records its source: 204, one create-only write, server timestamp', async () => {
  const w = makeWorld();
  const res = await call(w, GOOD);
  assert.equal(res.statusCode, 204);
  assert.equal(w.writes.length, 1);
  assert.equal(w.writes[0].path, `${SIGNUP_SOURCES_COLLECTION}/u1`);
  assert.deepEqual(w.store.get('signupSources/u1'), { ...GOOD, capturedAt: { __serverTimestamp: true } });
});

test('★ unverified / missing token -> 401 and no write', async () => {
  const w = makeWorld();
  assert.equal((await call(w, GOOD, null)).statusCode, 401);
  assert.equal((await call(w, GOOD, 'forged')).statusCode, 401);
  assert.equal(w.writes.length, 0);
});

test('★ M1 an account older than 15 minutes -> 409 and NO write', async () => {
  const w = makeWorld();
  const res = await call(w, GOOD, 'tok-old');
  assert.equal(res.statusCode, 409);
  assert.equal(w.writes.length, 0);
  assert.equal(w.store.size, 0);
});

test('the age boundary: exactly 15 minutes is accepted, one second more is refused', async () => {
  const at = makeWorld({ accounts: { u1: NOW - MAX_ACCOUNT_AGE_MS } });
  assert.equal((await call(at, GOOD)).statusCode, 204);
  const over = makeWorld({ accounts: { u1: NOW - MAX_ACCOUNT_AGE_MS - 1000 } });
  assert.equal((await call(over, GOOD)).statusCode, 409);
  assert.equal(over.writes.length, 0);
});

test('an account whose creation time cannot be read is refused (409), never written', async () => {
  const w = makeWorld({ accounts: { u1: NaN } });
  const res = await call(w, GOOD);
  assert.equal(res.statusCode, 409);
  assert.equal(w.writes.length, 0);
});

test('★ M2 a second call does NOT overwrite: still 204, the first doc is untouched', async () => {
  const w = makeWorld();
  assert.equal((await call(w, GOOD)).statusCode, 204);
  const second = await call(w, { ...GOOD, utm_source: 'google', utm_campaign: 'rewritten' });
  assert.equal(second.statusCode, 204);
  assert.equal(w.store.get('signupSources/u1').utm_source, 'youtube');
  assert.equal(w.store.get('signupSources/u1').utm_campaign, 'test');
});

test('★ unknown key -> 400, no write', async () => {
  const w = makeWorld();
  const res = await call(w, { ...GOOD, email: 'a@b.c' });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /unknown field: email/);
  assert.equal((await call(w, { ...GOOD, uid: 'u1' })).statusCode, 400);
  assert.equal(w.writes.length, 0);
});

test('★ M3 a gclid VALUE in the body -> 400 (booleans only), likewise fbclid', async () => {
  const w = makeWorld();
  assert.equal((await call(w, { ...GOOD, gclid: 'EAIaIQobChMI' })).statusCode, 400);
  assert.equal((await call(w, { ...GOOD, fbclid: 'IwAR0abc' })).statusCode, 400);
  assert.equal(w.writes.length, 0);
  assert.equal((await call(w, { ...GOOD, gclid: true, fbclid: true })).statusCode, 204);
});

test('every string field is held to its charset and length; a full URL or query never gets in', async () => {
  const bad = [
    { utm_source: 'a b' },
    { utm_campaign: 'x'.repeat(65) },
    { utm_medium: '' },
    { utm_content: '<script>' },
    { ref: 'https://youtube.com/watch?v=1' },
    { ref: 'YouTube.com' },
    { landing: '/notes?x=1' },
    { landing: '/a#b' },
    { landing: 'https://lazytopper.com/' },
    { landing: '/' + 'a'.repeat(200) },
  ];
  for (const patch of bad) {
    const w = makeWorld();
    const res = await call(w, { ...GOOD, ...patch });
    assert.equal(res.statusCode, 400, JSON.stringify(patch));
    assert.equal(w.writes.length, 0);
  }
  // the charset includes `{}` for ad-platform macros such as {campaignid}
  assert.equal(validateSource({ ...GOOD, utm_campaign: '{campaignid}' }).ok, true);
  assert.equal(validateSource({ ...GOOD, utm_campaign: 'x'.repeat(64) }).ok, true);
});

test('not an object / invalid JSON / oversized -> 400 / 400 / 413', async () => {
  const w = makeWorld();
  assert.equal((await call(w, '[]')).statusCode, 400);
  assert.equal((await call(w, 'null')).statusCode, 400);
  assert.equal((await call(w, '{nope')).statusCode, 400);
  assert.equal((await call(w, { ...GOOD, landing: '/' + 'a'.repeat(5000) })).statusCode, 413);
  assert.equal(w.writes.length, 0);
});

test('★ the uid comes from the verified token, never the body', async () => {
  const w = makeWorld({ accounts: { u1: NOW - 1000, victim: NOW - 1000 } });
  const res = await call(w, { ...GOOD, uid: 'victim' });
  assert.equal(res.statusCode, 400);
  assert.equal(w.store.has('signupSources/victim'), false);
  await call(w, GOOD);
  assert.deepEqual([...w.store.keys()], ['signupSources/u1']);
});

test('rate limit: more than the per-window cap -> 429', async () => {
  const w = makeWorld();
  let last;
  for (let i = 0; i <= MAX_CALLS_PER_WINDOW; i += 1) last = await call(w, GOOD);
  assert.equal(last.statusCode, 429);
});

test('an unavailable verifier / Admin SDK answers 503, never a silent success', async () => {
  const routes = createSignupSourceRoutes({ sendJson, now: () => NOW });
  const res = makeRes();
  await routes.handleSignupSource(makeReq(GOOD, { authorization: 'Bearer x' }), res);
  assert.equal(res.statusCode, 503);
});

test('a Firestore failure other than "already exists" is a 500, not a 204', async () => {
  const w = makeWorld();
  const boom = createSignupSourceRoutes({
    sendJson,
    verifiedCaller: { resolveVerifiedCaller: async () => ({ uid: 'u1', reason: 'verified' }) },
    firebaseAdmin: {
      auth: () => ({ getUser: async () => ({ metadata: { creationTime: iso(NOW - 1000) } }) }),
      firestore: { FieldValue: { serverTimestamp: () => 1 } },
    },
    adminFirestore: { collection: () => ({ doc: () => ({ create: async () => { throw new Error('unavailable'); } }) }) },
    now: () => NOW,
  });
  const res = makeRes();
  await boom.handleSignupSource(makeReq(GOOD, { authorization: 'Bearer t' }), res);
  assert.equal(res.statusCode, 500);
  assert.equal(w.writes.length, 0);
});
