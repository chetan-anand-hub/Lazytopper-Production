'use strict';
// CBQ-TUTOR-TASTE-1 - a CBQ Pack buyer who is not Premium gets exactly 3 tutor questions in total.
// Run: node --test lazytopper/server/services/cbqTutorTaste.test.cjs
// No model, no network: an in-memory Firestore and the REAL entitlement gate.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createEntitlementGate } = require('./entitlement.cjs');
const { createCbqTutorTaste, CBQ_TUTOR_TASTE_LIMIT } = require('./cbqTutorTaste.cjs');
const { createPackRoutes } = require('../routes/packs.cjs');

const NOW = Date.UTC(2026, 10, 1, 6, 0, 0);

/** Minimal in-memory Firestore: collection/doc/get, subcollections, merge sets and serial transactions. */
function memoryDb(seed = {}) {
  const store = new Map(Object.entries(seed)); // path -> data
  const docRef = (path) => ({
    path,
    async get() {
      return snap(path);
    },
    collection: (name) => colRef(`${path}/${name}`),
  });
  const snap = (path) => ({ exists: store.has(path), data: () => (store.has(path) ? { ...store.get(path) } : undefined) });
  const colRef = (path) => ({
    path,
    doc: (id) => docRef(`${path}/${id}`),
    async get() {
      const docs = [...store.keys()]
        .filter((k) => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes('/'))
        .map((k) => ({ id: k.split('/').pop(), ...snap(k) }));
      return { docs };
    },
  });
  let chain = Promise.resolve();
  const db = {
    store,
    collection: (name) => colRef(name),
    runTransaction(fn) {
      // Serial, like Firestore's retry-on-conflict outcome: a later transaction sees an earlier commit.
      const run = chain.then(async () => {
        const writes = [];
        const tx = {
          get: async (ref) => ref.get(),
          set: (ref, data, opts) => writes.push({ ref, data, merge: !!(opts && opts.merge) }),
        };
        const out = await fn(tx);
        for (const w of writes) store.set(w.ref.path, w.merge ? { ...(store.get(w.ref.path) || {}), ...w.data } : w.data);
        return out;
      });
      chain = run.catch(() => {});
      return run;
    },
  };
  return db;
}

const cbqPack = { packId: 'pack_cbq:maths', sku: 'pack_cbq', target: 'maths', pricePaidInr: 199, paidAt: NOW - 1000, orderId: 'o1' };
const chapterPack = { packId: 'pack_chapter:triangles', sku: 'pack_chapter', target: 'triangles', pricePaidInr: 49, paidAt: NOW - 1000, orderId: 'o2' };
const free = { tier: 'free' };
const premium = { tier: 'premium' };

function setup({ sub = free, packs = [cbqPack], used, uid = 'u1', break_ } = {}) {
  const seed = { [`subscriptions/${uid}`]: sub };
  if (packs.length || used !== undefined) seed[`packEntitlements/${uid}`] = { updatedAt: new Date(NOW), ...(used !== undefined ? { cbqTutorTasteUsed: used } : {}) };
  for (const p of packs) seed[`packEntitlements/${uid}/packs/${p.packId}`] = p;
  const db = memoryDb(seed);
  if (break_) db.runTransaction = async () => { throw new Error('FIRESTORE DOWN'); };
  const events = [];
  const telemetry = { increment: (e) => events.push(e) };
  const cbq = createCbqTutorTaste({ adminFirestore: db, telemetry, now: () => NOW });
  const sent = [];
  const gate = createEntitlementGate({
    adminFirestore: db, telemetry, logger: { warn() {}, info() {}, error() {} }, now: () => NOW, cacheTtlMs: 0,
    sendJson: (res, status, body) => sent.push({ status, body }), cbqTutorTaste: cbq,
  });
  return { db, gate, sent, events, cbq, uid };
}
const req = () => ({ method: 'POST', headers: { authorization: 'Bearer tok' } });
const turn = (ctx, path = '/api/tutor') => {
  const r = req();
  return ctx.gate.applyToRequest(r, {}, path, ctx.uid, { uid: ctx.uid, reason: 'ok' }).then((refused) => ({ refused, r }));
};

test('a CBQ Pack owner (not Premium) gets exactly 3 tutor turns and the 4th is refused with the normal 402', async () => {
  const ctx = setup();
  for (let i = 1; i <= CBQ_TUTOR_TASTE_LIMIT; i += 1) {
    const { refused, r } = await turn(ctx);
    assert.equal(refused, false, `turn ${i} is served`);
    assert.deepEqual(r.lazytopperCbqTutorBonus, { used: i, left: CBQ_TUTOR_TASTE_LIMIT - i, limit: 3 });
  }
  const { refused } = await turn(ctx);
  assert.equal(refused, true);
  assert.equal(ctx.sent.length, 1);
  assert.equal(ctx.sent[0].status, 402);
  assert.equal(ctx.sent[0].body.error, 'premium_required');
  assert.deepEqual(ctx.sent[0].body.cbqTutorBonus, { used: 3, left: 0, limit: 3 });
  assert.equal(ctx.db.store.get('packEntitlements/u1').cbqTutorTasteUsed, 3);
});

test('parallel turns cannot spend more than 3 questions', async () => {
  const ctx = setup();
  const results = await Promise.all(Array.from({ length: 8 }, () => turn(ctx)));
  assert.equal(results.filter((x) => x.refused === false).length, 3);
  assert.equal(ctx.db.store.get('packEntitlements/u1').cbqTutorTasteUsed, 3);
});

test('a student with no CBQ pack is refused (a different pack does not count) and nothing is written', async () => {
  for (const packs of [[], [chapterPack]]) {
    const ctx = setup({ packs });
    const { refused } = await turn(ctx);
    assert.equal(refused, true);
    assert.equal(ctx.sent[0].status, 402);
    assert.equal(ctx.sent[0].body.cbqTutorBonus, undefined);
    assert.equal(ctx.db.store.has('packEntitlements/u1') ? ctx.db.store.get('packEntitlements/u1').cbqTutorTasteUsed : undefined, undefined);
  }
});

test('Premium is unaffected: served by the existing gate, the allowance is never read or spent', async () => {
  const ctx = setup({ sub: premium });
  const { refused, r } = await turn(ctx);
  assert.equal(refused, false);
  assert.equal(r.lazytopperCbqTutorBonus, undefined);
  assert.equal(ctx.db.store.get('packEntitlements/u1').cbqTutorTasteUsed, undefined);
});

test('it never grants Premium: the subscription document is untouched and other gated routes stay locked', async () => {
  const ctx = setup();
  await turn(ctx);
  assert.deepEqual(ctx.db.store.get('subscriptions/u1'), free);
  const other = await turn(ctx, '/api/check-solution');
  assert.equal(other.refused, true);
  assert.equal(ctx.sent[ctx.sent.length - 1].status, 402);
  const g = await turn(ctx, '/api/grade-worksheet');
  assert.equal(g.refused, true);
});

test('the count lives on the server: a client-supplied count, header or body field cannot reset it', async () => {
  const ctx = setup({ used: 3 });
  const r = { method: 'POST', headers: { authorization: 'Bearer tok', 'x-cbq-tutor-used': '0' }, body: { cbqTutorTasteUsed: 0, used: 0 } };
  const refused = await ctx.gate.applyToRequest(r, {}, '/api/tutor', 'u1', { uid: 'u1', reason: 'ok' });
  assert.equal(refused, true);
  assert.equal(ctx.db.store.get('packEntitlements/u1').cbqTutorTasteUsed, 3);
});

test('a garbage or oversized stored count reads as fully used / zero, never as extra questions', async () => {
  assert.equal((await setup({ used: 99 }).cbq.status('u1')).left, 0);
  assert.equal((await setup({ used: -4 }).cbq.status('u1')).left, 3);
  assert.equal((await setup({ used: 'x' }).cbq.status('u1')).left, 3);
});

test('it fails closed: a Firestore failure is the normal lock, never a free turn', async () => {
  const ctx = setup({ break_: true });
  const { refused } = await turn(ctx);
  assert.equal(refused, true);
  assert.equal(ctx.sent[0].status, 402);
  assert.ok(ctx.events.includes('cbq_tutor_taste.consume_failed'));
});

test('a gate built without the helper decides /api/tutor exactly as before', async () => {
  const db = memoryDb({ 'subscriptions/u1': free, 'packEntitlements/u1/packs/pack_cbq:maths': cbqPack });
  const sent = [];
  const gate = createEntitlementGate({ adminFirestore: db, telemetry: null, logger: { warn() {}, info() {}, error() {} }, now: () => NOW, cacheTtlMs: 0, sendJson: (r, s, b) => sent.push({ s, b }) });
  assert.equal(await gate.applyToRequest(req(), {}, '/api/tutor', 'u1', { uid: 'u1', reason: 'ok' }), true);
  assert.equal(sent[0].s, 402);
});

test('GET /api/packs/mine reports the remaining questions only to a CBQ Pack owner', async () => {
  const run = async (ctx) => {
    const out = [];
    const routes = createPackRoutes({
      sendJson: (res, status, body) => out.push({ status, body }),
      verifiedCaller: { resolveVerifiedUid: async () => 'u1' },
      adminFirestore: ctx.db, telemetry: null, cbqTutorTaste: ctx.cbq, now: () => NOW,
      getLicensee: async () => ({ name: 'A', email: 'a@b.c' }),
    });
    await routes.handleMine(req(), {});
    return out[0].body;
  };
  assert.deepEqual((await run(setup({ used: 1 }))).tutorTaste, { used: 1, left: 2, limit: 3 });
  assert.equal((await run(setup({ packs: [chapterPack] }))).tutorTaste, undefined);
});

test('the tutor route echoes the remaining allowance only when the gate spent one; no model is called', async () => {
  const { createTutorRoute } = require('../routes/tutor.cjs');
  const route = createTutorRoute({
    sendJson: (res, status, body) => { res.status = status; res.body = body; },
    readJson: async (r) => r.body,
    callGemini: async () => { throw new Error('a real model must never be called here'); },
    GEMINI_TUTOR_MODEL: 'x', GEMINI_MODEL: 'x', ACTIVE_PROVIDER: 'gemini',
    isStubMode: () => true,
  });
  const body = { subject: 'maths', messages: [{ role: 'student', content: 'why?' }] };
  const withBonus = {}; 
  await route.handleTutorRequest({ body, lazytopperCbqTutorBonus: { used: 1, left: 2, limit: 3 } }, withBonus);
  assert.deepEqual(withBonus.body.cbqTutorBonus, { used: 1, left: 2, limit: 3 });
  const plain = {};
  await route.handleTutorRequest({ body }, plain);
  assert.equal(plain.body.cbqTutorBonus, undefined);
});
