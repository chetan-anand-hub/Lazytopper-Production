/**
 * packSampleSeen.test.cjs - SAMPLE-FOLLOWUP-1, server half of the "sample saved" marker (POST /api/pack-sample-seen).
 * Run: node --test lazytopper/server/routes/packSampleSeen.test.cjs   (wired as test:server:pack-sample-seen)
 * The clock is INJECTED (deps.now), so this passes at any LT_TEST_CLOCK.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { createPackSampleSeenRoutes, validateBody, MAX_CALLS_PER_WINDOW } = require('./packSampleSeen.cjs');

const NOW = Date.parse('2030-06-15T06:30:00.000Z');

function makeReq(body, headers = {}) {
  const req = new EventEmitter();
  req.headers = { 'content-type': 'application/json', authorization: 'Bearer tok-u1', ...headers };
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
const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.body = body;
};

function makeWorld({ verified = { 'tok-u1': 'u1', 'tok-u2': 'u2' }, accounts = ['u1', 'u2'], eraseDuringWrite = [] } = {}) {
  const store = new Map();
  const writes = [];
  const deleted = [];
  const verifiedCaller = {
    async resolveVerifiedCaller(req) {
      const h = String(req.headers.authorization || '');
      const tok = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
      return verified[tok] ? { uid: verified[tok], reason: 'verified' } : { uid: '', reason: tok ? 'invalid' : 'no-token' };
    },
  };
  const gone = new Set();
  const firebaseAdmin = {
    auth: () => ({
      async getUser(uid) {
        if (gone.has(uid) || !accounts.includes(uid)) {
          const e = new Error('no user');
          e.code = 'auth/user-not-found';
          throw e;
        }
        return { uid };
      },
    }),
  };
  const merge = (a, b) => {
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(out[k] || {}, v) : v;
    return out;
  };
  const adminFirestore = {
    collection: (name) => ({
      doc: (id) => {
        const path = `${name}/${id}`;
        return {
          path,
          async get() {
            const d = store.get(path);
            return { exists: d !== undefined, data: () => (d === undefined ? undefined : { ...d }) };
          },
          async set(data, opts) {
            writes.push({ path, data });
            store.set(path, opts && opts.merge ? merge(store.get(path) || {}, data) : { ...data });
            if (eraseDuringWrite.includes(id)) gone.add(id);
          },
          async delete() {
            deleted.push(path);
            store.delete(path);
          },
        };
      },
    }),
    async runTransaction(fn) {
      const pending = [];
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, data, opts) => {
          pending.push(() => ref.set(data, opts));
          return tx;
        },
      };
      const r = await fn(tx);
      for (const w of pending) await w();
      return r;
    },
  };
  let now = NOW;
  const routes = createPackSampleSeenRoutes({ sendJson, verifiedCaller, firebaseAdmin, adminFirestore, now: () => now });
  return { store, writes, deleted, routes, setNow: (n) => (now = n) };
}
async function call(w, body, headers) {
  const res = makeRes();
  await w.routes.handle(makeReq(body, headers), res);
  return res;
}

test('a signed-in student: the first save of a pack is recorded with the server clock', async () => {
  const w = makeWorld();
  const res = await call(w, { pack: 'pack_cbq:science' });
  assert.equal(res.statusCode, 204);
  assert.deepEqual(w.store.get('nudgeEmails/u1'), { sampleSeenAt_pack_cbq_science: NOW });
});

test('FIRST WRITE WINS: a second save of the same pack does not restart the clock; another pack is its own entry', async () => {
  const w = makeWorld();
  await call(w, { pack: 'pack_cbq:science' });
  w.setNow(NOW + 3600_000);
  await call(w, { pack: 'pack_cbq:science' });
  assert.equal(w.writes.length, 1);
  await call(w, { pack: 'pack_bundle:all' });
  assert.deepEqual(w.store.get('nudgeEmails/u1'), { sampleSeenAt_pack_cbq_science: NOW, sampleSeenAt_pack_bundle_all: NOW + 3600_000 });
});

test('the marker keeps the rest of the ledger row (merge, never overwrite)', async () => {
  const w = makeWorld();
  w.store.set('nudgeEmails/u1', { lastClaimMs: 5, abandoned_board_pass: { status: 'sent' } });
  await call(w, { pack: 'pack_mock:maths' });
  const row = w.store.get('nudgeEmails/u1');
  assert.equal(row.lastClaimMs, 5);
  assert.equal(row.abandoned_board_pass.status, 'sent');
  assert.equal(row.sampleSeenAt_pack_mock_maths, NOW);
});

test('no token / a bad token -> 401, nothing written (a signed-out visitor leaves nothing)', async () => {
  const w = makeWorld();
  assert.equal((await call(w, { pack: 'pack_cbq:science' }, { authorization: '' })).statusCode, 401);
  assert.equal((await call(w, { pack: 'pack_cbq:science' }, { authorization: 'Bearer nope' })).statusCode, 401);
  assert.equal(w.writes.length, 0);
});

test('the uid comes from the token, never the body; an extra field, an unknown or chapter-level pack, or bad JSON -> 400', async () => {
  const w = makeWorld();
  for (const body of [{ pack: 'pack_cbq:science', uid: 'u2' }, { pack: 'pack_chapter:real-numbers' }, { pack: 'pack_cbq:all' }, { pack: 7 }, {}, [], 'nope{']) {
    assert.equal((await call(w, body)).statusCode, 400, JSON.stringify(body));
  }
  assert.equal(w.writes.length, 0);
  assert.equal(validateBody({ pack: 'pack_chapter:maths' }).ok, true);
  await call(w, { pack: 'pack_cbq:science' });
  assert.equal(w.store.has('nudgeEmails/u2'), false);
});

test('a body over the cap -> 413', async () => {
  const w = makeWorld();
  assert.equal((await call(w, { pack: 'pack_cbq:science', pad: 'x'.repeat(400) })).statusCode, 413);
});

test('rate limit per student', async () => {
  const w = makeWorld();
  let last;
  for (let i = 0; i <= MAX_CALLS_PER_WINDOW; i += 1) last = await call(w, { pack: 'pack_cbq:science' });
  assert.equal(last.statusCode, 429);
});

test('ERASURE RACE: an account erased while the write was in flight leaves no row', async () => {
  const w = makeWorld({ eraseDuringWrite: ['u1'] });
  const res = await call(w, { pack: 'pack_cbq:science' });
  assert.equal(res.statusCode, 204);
  assert.deepEqual(w.deleted, ['nudgeEmails/u1']);
  assert.equal(w.store.has('nudgeEmails/u1'), false);
});

test('no Firebase on this deploy -> 503', async () => {
  const res = makeRes();
  await createPackSampleSeenRoutes({ sendJson }).handle(makeReq({ pack: 'pack_cbq:science' }), res);
  assert.equal(res.statusCode, 503);
});
