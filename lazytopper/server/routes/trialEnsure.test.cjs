/**
 * trialEnsure.test.cjs — TRIAL-SAVE-1, server half (POST /api/trial/ensure-signup).
 *
 * Run: node --test lazytopper/server/routes/trialEnsure.test.cjs
 * Wired into `lazytopper` test:matrix:all as test:server:trial-ensure.
 *
 * The clock is INJECTED (deps.now) from a fixed instant, so this passes at any LT_TEST_CLOCK.
 *
 * Spec mutations that turn THIS file red (one at a time):
 *   M1  drop the 24-hour account-age check                -> "an account older than 24 h -> 409, no write"
 *   M2  overwrite instead of create-only (`tx.set`)       -> "an existing trial is never moved" / "a pass is never touched"
 *   M3  take the uid from the body                        -> "the uid comes only from the token"
 *   M4  start the trial at `now` instead of creationTime  -> "the start is the sign-up instant"
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  createTrialEnsureRoutes,
  MAX_ACCOUNT_AGE_MS,
  MAX_CALLS_PER_WINDOW,
  SUBSCRIPTIONS_COLLECTION,
} = require('./trialEnsure.cjs');

const NOW = Date.parse('2030-06-15T06:30:00.000Z');
const HOUR = 60 * 60 * 1000;
const iso = (ms) => new Date(ms).toUTCString();

function makeReq(body, headers = {}) {
  const req = new EventEmitter();
  req.headers = { 'content-type': 'application/json', ...headers };
  process.nextTick(() => {
    if (body !== undefined) req.emit('data', Buffer.from(JSON.stringify(body)));
    req.emit('end');
  });
  return req;
}

function makeRes() {
  return { statusCode: 0, body: null };
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.body = body;
}

function makeWorld({ accounts = { u1: NOW - 2 * HOUR }, preexisting = {}, eraseDuringWrite = [] } = {}) {
  const store = new Map(Object.entries(preexisting).map(([uid, d]) => [`${SUBSCRIPTIONS_COLLECTION}/${uid}`, d]));
  const writes = [];
  const accountMap = { old: NOW - 30 * HOUR, ...accounts };
  const verified = { 'tok-u1': 'u1', 'tok-u2': 'u2', 'tok-old': 'old' };
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
    firestore: { Timestamp: { fromMillis: (ms) => ({ __ts: ms }) } },
  };
  const adminFirestore = {
    collection(name) {
      return {
        doc(id) {
          const p = `${name}/${id}`;
          return {
            __p: p,
            async delete() {
              writes.push({ op: 'delete', path: p });
              store.delete(p);
            },
          };
        },
      };
    },
    async runTransaction(fn) {
      return fn({
        async get(ref) {
          return { exists: store.has(ref.__p), data: () => store.get(ref.__p) };
        },
        create(ref, data) {
          assert.equal(store.has(ref.__p), false, 'create over an existing doc');
          writes.push({ op: 'create', path: ref.__p, data });
          store.set(ref.__p, data);
          for (const id of eraseDuringWrite) delete accountMap[id];
        },
        set(ref, data) {
          writes.push({ op: 'set', path: ref.__p, data });
          store.set(ref.__p, data);
        },
      });
    },
  };
  const routes = createTrialEnsureRoutes({ sendJson, verifiedCaller, firebaseAdmin, adminFirestore, now: () => NOW });
  return { routes, store, writes };
}

async function call(world, token = 'tok-u1', body) {
  const res = makeRes();
  await world.routes.handleEnsureSignupTrial(makeReq(body, token ? { authorization: `Bearer ${token}` } : {}), res);
  return res;
}

test('a verified <24h account with NO subscription doc gets the sign-up trial, started at its creation time', async () => {
  const w = makeWorld();
  const res = await call(w);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, created: true });
  assert.equal(w.writes.length, 1);
  assert.deepEqual(w.store.get('subscriptions/u1'), {
    tier: 'trial',
    plan: 'trial_7day',
    premiumSince: null,
    trialStartDate: { __ts: NOW - 2 * HOUR }, // M4: the start is the sign-up instant, not now
    updatedAt: new Date(NOW).toISOString(),
  });
});

test('unverified / missing token -> 401 and no write', async () => {
  const w = makeWorld();
  assert.equal((await call(w, null)).statusCode, 401);
  assert.equal((await call(w, 'forged')).statusCode, 401);
  assert.equal(w.writes.length, 0);
});

test('★ M1 an account older than 24 h -> 409, no write (no trial on login or reload)', async () => {
  const w = makeWorld();
  const res = await call(w, 'tok-old');
  assert.equal(res.statusCode, 409);
  assert.equal(w.writes.length, 0);
  assert.equal(w.store.size, 0);
});

test('the age boundary: exactly 24 h is accepted, one second more is refused', async () => {
  const at = makeWorld({ accounts: { u1: NOW - MAX_ACCOUNT_AGE_MS } });
  assert.equal((await call(at)).statusCode, 200);
  const over = makeWorld({ accounts: { u1: NOW - MAX_ACCOUNT_AGE_MS - 1000 } });
  assert.equal((await call(over)).statusCode, 409);
  assert.equal(over.writes.length, 0);
});

test('an unreadable creation time is refused (409), never written', async () => {
  const w = makeWorld({ accounts: { u1: NaN } });
  assert.equal((await call(w)).statusCode, 409);
  assert.equal(w.writes.length, 0);
});

test('★ M2 an existing trial is never moved or recreated: 200 created:false, doc untouched', async () => {
  const existing = { tier: 'trial', plan: 'trial_7day', premiumSince: null, trialStartDate: { __ts: NOW - 5 * HOUR }, updatedAt: 'x' };
  const w = makeWorld({ preexisting: { u1: existing } });
  const res = await call(w);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, created: false });
  assert.equal(w.writes.length, 0);
  assert.deepEqual(w.store.get('subscriptions/u1'), existing);
});

test('★ M2 a paid pass / a free default / any other existing doc is never touched', async () => {
  const pass = { tier: 'premium', plan: 'pass_month', passEnd: { __ts: NOW + HOUR }, lastPaymentRef: 'pay_1' };
  const free = { tier: 'free', plan: 'none', trialStartDate: null };
  for (const doc of [pass, free]) {
    const w = makeWorld({ preexisting: { u1: doc } });
    const res = await call(w);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.created, false);
    assert.equal(w.writes.length, 0);
    assert.deepEqual(w.store.get('subscriptions/u1'), doc);
  }
});

test('★ M3 the uid comes only from the token: a body uid is ignored', async () => {
  const w = makeWorld({ accounts: { u1: NOW - HOUR, u2: NOW - HOUR } });
  const res = await call(w, 'tok-u1', { uid: 'u2' });
  assert.equal(res.statusCode, 200);
  assert.equal(w.store.has('subscriptions/u1'), true);
  assert.equal(w.store.has('subscriptions/u2'), false);
});

test('idempotent: a second call changes nothing', async () => {
  const w = makeWorld();
  assert.equal((await call(w)).body.created, true);
  const first = w.store.get('subscriptions/u1');
  const second = await call(w);
  assert.deepEqual(second.body, { ok: true, created: false });
  assert.equal(w.writes.length, 1);
  assert.deepEqual(w.store.get('subscriptions/u1'), first);
});

test('rate limit: more than the per-window cap -> 429', async () => {
  const w = makeWorld();
  let last;
  for (let i = 0; i <= MAX_CALLS_PER_WINDOW; i += 1) last = await call(w);
  assert.equal(last.statusCode, 429);
});

test('erasure race: an account erased while the create is in flight leaves no document', async () => {
  const w = makeWorld({ eraseDuringWrite: ['u1'] });
  const res = await call(w);
  assert.equal(res.statusCode, 200);
  assert.equal(w.store.has('subscriptions/u1'), false);
});

test('unavailable admin SDK -> 503', async () => {
  const res = makeRes();
  const routes = createTrialEnsureRoutes({ sendJson });
  await routes.handleEnsureSignupTrial(makeReq(undefined, {}), res);
  assert.equal(res.statusCode, 503);
});
