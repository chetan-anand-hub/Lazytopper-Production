// ADMIN-EXTEND-1 — extend a student's Premium by N days at price 0 (feedback-call reward).
//
// Covers: trial extension, pass extension, never shortens, idempotent (sequential AND
// concurrent double-click), price 0 kept out of every payment/revenue record, the audit
// entry, and that the SAME readers the product already uses (entitlement gate, admin page
// planOf, the trial-ending email's tier test) all see the one new end. The route-level
// admin vs non-admin cases are in server/routes/adminExtendPremium.test.cjs; the client
// half (subscriptionService hydrating the written document) is in
// src/services/subscriptionService.entitlement.test.ts §10.
//
// ★ MUTATIONS (run against this file, each shown red, each restored — see the PR):
//   X1  ignore the derived trial end          -> "trial · a RUNNING trial is extended from its END" red (6 fail)
//   X2  drop the adminGrants replay check     -> both "idempotent ·" tests red (3 fail with the route)
//   X3  write a payments record               -> both "not a sale ·" record tests red
//   X4  store pricePaidInr: 0 on the subscription doc -> "pass ·" + three "not a sale ·" red
//   X5  always extend from now (shortens a running end) -> both "never shortens ·" red (11 fail)
//
// Run: node --test lazytopper/server/services/premiumExtension.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extendPremium,
  computeExtension,
  ExtensionInputError,
  ExtensionRefusedError,
  EXTENSION_PLAN,
  AUDIT_ACTION,
} = require('./premiumExtension.cjs');
const { grantPass } = require('./passGrant.cjs');
const { deriveEffectiveTier, isEntitled } = require('./entitlement.cjs');
const { planOf } = require('../routes/adminStudents.cjs');

const DAY = 24 * 60 * 60 * 1000;
const istNoon = (isoDate) => Date.parse(`${isoDate}T12:00:00+05:30`);
const NOW = istNoon('2026-10-18');
/** A Firestore Timestamp stand-in — what the Admin SDK hands back for a stored Date. */
const stamp = (ms) => ({ toDate: () => new Date(ms), toMillis: () => ms });
const msOf = (v) => (v instanceof Date ? v.getTime() : v && typeof v.toMillis === 'function' ? v.toMillis() : v);

/* An in-memory Firestore with REAL optimistic transactions (the passGrant.test harness),
   plus one realism fix: a stored JS Date is READ BACK as a Timestamp, exactly as
   firebase-admin does — the entitlement reader parses Timestamps, not Dates. */
function memoryFirestore(seed = {}) {
  const docs = new Map();
  for (const [key, data] of Object.entries(seed)) docs.set(key, { data: { ...data }, version: 1 });
  const stats = { commits: 0, retries: 0 };
  const yieldNow = () => new Promise((r) => setImmediate(r));
  const asStored = (data) => {
    const out = {};
    for (const [k, v] of Object.entries(data)) out[k] = v instanceof Date ? stamp(v.getTime()) : v;
    return out;
  };
  const snapOf = (entry) => ({ exists: !!entry, data: () => (entry ? asStored(entry.data) : undefined) });
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
    stats,
    read: (key) => (docs.get(key) ? asStored(docs.get(key).data) : undefined),
    keys: () => [...docs.keys()],
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
        if (conflict) { stats.retries += 1; continue; }
        for (const [k, d, o] of pending) write(k, d, o);
        stats.commits += 1;
        return out;
      }
      throw new Error('transaction contention: too many retries');
    },
  };
}

const SUB = (uid) => `subscriptions/${uid}`;
const ADMIN = 'admin-owner-uid';
const run = (db, over = {}) =>
  extendPremium({ uid: 'u1', requestId: 'req-00000001', adminUid: ADMIN, now: NOW, ...over }, { firestore: db });

/** A trial that started `daysAgo` days before NOW (server-pinned start). */
const trialDoc = (daysAgo, over = {}) => ({
  tier: 'trial',
  plan: 'trial_7day',
  premiumSince: null,
  trialStartDate: stamp(NOW - daysAgo * DAY),
  ...over,
});

/* ══ Trial accounts ═══════════════════════════════════════════════════════════ */

test('trial · a RUNNING trial is extended from its END, not from now (3 days left + 7 = 10)', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(4) });
  const trialEnd = NOW - 4 * DAY + 7 * DAY;
  const { replayed, extension } = await run(db);
  assert.equal(replayed, false);
  const stored = db.read(SUB('u1'));
  assert.equal(stored.tier, 'premium');
  assert.equal(stored.plan, EXTENSION_PLAN);
  assert.equal(msOf(stored.passEnd), trialEnd + 7 * DAY);
  assert.equal(extension.basis, 'trial');
  assert.equal(extension.previousEnd, new Date(trialEnd).toISOString());
  assert.equal(extension.newEnd, new Date(trialEnd + 7 * DAY).toISOString());
  // The trial START is untouched — the trial-start rule is not this lane's to change.
  assert.equal(msOf(stored.trialStartDate), NOW - 4 * DAY);
});

test('trial · an ENDED trial is extended from NOW (never back-dated into the past)', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(20, { tier: 'free' }) });
  const { extension } = await run(db);
  assert.equal(extension.basis, 'now');
  assert.equal(msOf(db.read(SUB('u1')).passEnd), NOW + 7 * DAY);
});

test('trial · the interrupted-trial shape {free, trial_7day, pinned start} is extended from its trial end', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(2, { tier: 'free' }) });
  await run(db, { days: 5 });
  assert.equal(msOf(db.read(SUB('u1')).passEnd), NOW - 2 * DAY + 7 * DAY + 5 * DAY);
});

test('★ one effective end: the entitlement gate, the admin page and the trial-email tier test all read the new end', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(4) });
  await run(db);
  const stored = db.read(SUB('u1'));
  const newEnd = NOW + 3 * DAY + 7 * DAY;
  // After the ORIGINAL trial end, still entitled (premium) — the extension is real.
  const midway = deriveEffectiveTier(stored, NOW + 5 * DAY);
  assert.equal(midway.tier, 'premium');
  assert.ok(isEntitled(midway.tier));
  assert.equal(midway.passEndsAtMs, newEnd);
  // The admin Students page reports the same end.
  assert.deepEqual(planOf(stored, NOW + 5 * DAY), { kind: 'premium', premiumUntilMs: newEnd });
  // One ms before the new end: entitled. AT it: free, like any pass.
  assert.equal(deriveEffectiveTier(stored, newEnd - 1).tier, 'premium');
  assert.equal(deriveEffectiveTier(stored, newEnd).tier, 'free');
  // #1242's trial banner and email both require the derived tier to be "trial"; an
  // extended account is premium, so neither announces the old day-7 end.
  assert.notEqual(deriveEffectiveTier(stored, NOW).tier, 'trial');
});

/* ══ Pass accounts ════════════════════════════════════════════════════════════ */

test('pass · a RUNNING pass keeps tier, plan and price; only passEnd moves (+7 from its end)', async () => {
  const db = memoryFirestore();
  await grantPass({ uid: 'u1', passType: 'month', paymentRef: 'pay_1', now: NOW - 10 * DAY }, { firestore: db, foundingOfferOpen: true });
  const before = db.read(SUB('u1'));
  const { extension } = await run(db);
  const after = db.read(SUB('u1'));
  assert.equal(extension.basis, 'pass');
  assert.equal(msOf(after.passEnd), msOf(before.passEnd) + 7 * DAY);
  for (const f of ['tier', 'plan', 'passType', 'pricePaidInr', 'offerKey', 'foundingMember', 'lastPaymentRef']) {
    assert.deepEqual(after[f], before[f], `${f} changed`);
  }
  assert.equal(msOf(after.passStart), msOf(before.passStart));
});

test('pass · a LAPSED pass is extended from now', async () => {
  const db = memoryFirestore({ [SUB('u1')]: { tier: 'premium', plan: 'pass_month', passEnd: stamp(NOW - 3 * DAY), pricePaidInr: 599 } });
  const { extension } = await run(db, { days: 1 });
  assert.equal(extension.basis, 'now');
  assert.equal(msOf(db.read(SUB('u1')).passEnd), NOW + DAY);
  assert.equal(db.read(SUB('u1')).plan, 'pass_month');
});

test('pass · a later PAID month stacks on top of the extension (the extension is not lost)', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(1) });
  await run(db);
  const extendedEnd = msOf(db.read(SUB('u1')).passEnd);
  await grantPass({ uid: 'u1', passType: 'month', paymentRef: 'pay_9', now: NOW + DAY }, { firestore: db, foundingOfferOpen: true });
  const after = db.read(SUB('u1'));
  assert.equal(after.plan, 'pass_month');
  assert.equal(msOf(after.passStart), extendedEnd);
  assert.ok(msOf(after.passEnd) > extendedEnd);
});

/* ══ Never shortens ═══════════════════════════════════════════════════════════ */

test('never shortens · a far-future pass end only ever grows, whichever end is later', async () => {
  // A trial that is still running AND a pass ending much later: the later end wins.
  const passEnd = NOW + 200 * DAY;
  const db = memoryFirestore({ [SUB('u1')]: { ...trialDoc(1), tier: 'premium', plan: 'pass_till_boards', passEnd: stamp(passEnd) } });
  await run(db, { days: 1 });
  assert.equal(msOf(db.read(SUB('u1')).passEnd), passEnd + DAY);
});

test('never shortens · computeExtension is strictly later than every end, for every day count 1-30', () => {
  const shapes = [trialDoc(0), trialDoc(6), trialDoc(30, { tier: 'free' }), { tier: 'premium', plan: 'pass_month', passEnd: stamp(NOW + 40 * DAY) }, { tier: 'free', plan: 'none' }];
  for (const doc of shapes) {
    for (let days = 1; days <= 30; days += 1) {
      const d = computeExtension(doc, { days, nowMs: NOW });
      assert.ok(d.newEndMs > NOW);
      if (d.previousEndMs !== null) assert.ok(d.newEndMs > d.previousEndMs);
      assert.equal(d.newEndMs - d.baseMs, days * DAY);
    }
  }
});

test('never shortens · a FUTURE passEnd on a NON-premium record still counts (review nit 1)', async () => {
  // e.g. a record whose stored tier is not "premium" but still carries a server-written
  // passEnd 40 days out: the extension must grow THAT end, never store an earlier one.
  const passEnd = NOW + 40 * DAY;
  for (const tier of ['free', 'trial']) {
    const db = memoryFirestore({ [SUB('u1')]: { ...trialDoc(2), tier, plan: 'pass_month', passEnd: stamp(passEnd) } });
    const { extension } = await run(db);
    assert.equal(msOf(db.read(SUB('u1')).passEnd), passEnd + 7 * DAY, tier);
    assert.equal(extension.basis, 'pass', tier);
    assert.equal(extension.previousEnd, new Date(passEnd).toISOString(), tier);
  }
  // A PAST passEnd on a non-premium record is ignored (the running trial end wins).
  const lapsed = memoryFirestore({ [SUB('u1')]: { ...trialDoc(2), tier: 'free', passEnd: stamp(NOW - 5 * DAY) } });
  await run(lapsed);
  assert.equal(msOf(lapsed.read(SUB('u1')).passEnd), NOW + 5 * DAY + 7 * DAY);
});

test('refused · Premium with NO end date (legacy owner grant) is not touched — nothing to extend', async () => {
  const db = memoryFirestore({ [SUB('u1')]: { tier: 'premium', plan: 'premium_monthly', premiumSince: '2026-08-01T00:00:00.000Z' } });
  await assert.rejects(run(db), (e) => e instanceof ExtensionRefusedError && e.code === 'premium-no-end');
  assert.equal(db.read(SUB('u1')).passEnd, undefined);
  assert.deepEqual(db.keys(), [SUB('u1')]);
});

test('refused · no subscription record (a mistyped uid) writes nothing', async () => {
  const db = memoryFirestore();
  await assert.rejects(run(db, { uid: 'nobody' }), (e) => e instanceof ExtensionRefusedError && e.code === 'no-record');
  assert.deepEqual(db.keys(), []);
});

/* ══ Input ════════════════════════════════════════════════════════════════════ */

test('input · days default 7; 1 and 30 allowed; 0, 31, 1.5, -1, "abc" refused with nothing written', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(30, { tier: 'free' }) });
  const { extension } = await run(db, { days: undefined, requestId: 'req-default' });
  assert.equal(extension.days, 7);
  assert.equal(extension.reason, 'feedback call reward');
  const ok1 = computeExtension(trialDoc(30), { days: 1, nowMs: NOW });
  const ok30 = computeExtension(trialDoc(30), { days: 30, nowMs: NOW });
  assert.equal(ok1.newEndMs, NOW + DAY);
  assert.equal(ok30.newEndMs, NOW + 30 * DAY);
  const versionBefore = db.docs.get(SUB('u1')).version;
  const keysBefore = db.keys();
  for (const days of [0, 31, 1.5, -1, 'abc', true]) {
    await assert.rejects(run(db, { days, requestId: `req-bad-${String(days).replace(/\W/g, 'x')}` }), ExtensionInputError, String(days));
  }
  assert.equal(db.docs.get(SUB('u1')).version, versionBefore);
  assert.deepEqual(db.keys(), keysBefore);
});

test('input · bad requestId / uid / reason are refused', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(1) });
  await assert.rejects(run(db, { requestId: 'short' }), ExtensionInputError);
  await assert.rejects(run(db, { requestId: 'has/slash-0000' }), ExtensionInputError);
  await assert.rejects(run(db, { uid: 'a/b' }), ExtensionInputError);
  await assert.rejects(run(db, { reason: 'x'.repeat(201) }), ExtensionInputError);
  await assert.rejects(run(db, { adminUid: '' }), ExtensionInputError);
});

/* ══ Idempotency ══════════════════════════════════════════════════════════════ */

test('idempotent · same requestId twice -> ONE extension, one audit entry; the replay returns the first result', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(4) });
  const first = await run(db);
  const endAfterFirst = msOf(db.read(SUB('u1')).passEnd);
  const second = await run(db, { now: NOW + 60 * 1000 });
  assert.equal(second.replayed, true);
  assert.deepEqual(second.extension, first.extension);
  assert.equal(msOf(db.read(SUB('u1')).passEnd), endAfterFirst);
  assert.equal(db.keys().filter((k) => k.includes('/adminGrants/')).length, 1);
});

test('idempotent · a CONCURRENT double-click (same requestId, in parallel) extends once', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(4) });
  const [a, b] = await Promise.all([run(db), run(db)]);
  assert.deepEqual([a.replayed, b.replayed].sort(), [false, true]);
  assert.equal(msOf(db.read(SUB('u1')).passEnd), NOW + 3 * DAY + 7 * DAY);
  assert.equal(db.keys().filter((k) => k.includes('/adminGrants/')).length, 1);
});

test('idempotent · the same requestId with DIFFERENT days is refused as a mismatch, not replayed (review nit 2)', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(4) });
  await run(db, { days: 7 });
  const endAfterFirst = msOf(db.read(SUB('u1')).passEnd);
  await assert.rejects(run(db, { days: 14 }), (e) => e instanceof ExtensionRefusedError && e.code === 'request-mismatch');
  assert.equal(msOf(db.read(SUB('u1')).passEnd), endAfterFirst);
  assert.equal(db.keys().filter((k) => k.includes('/adminGrants/')).length, 1);
  // The SAME days is still a plain replay.
  assert.equal((await run(db, { days: 7 })).replayed, true);
});

test('two DIFFERENT requests stack (two rewards are two extensions)', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(30, { tier: 'free' }) });
  await run(db, { requestId: 'req-aaaaaaaa' });
  await run(db, { requestId: 'req-bbbbbbbb' });
  assert.equal(msOf(db.read(SUB('u1')).passEnd), NOW + 14 * DAY);
});

/* ══ Price 0 — never a sale ═══════════════════════════════════════════════════ */

test('not a sale · no payments record, no payOrder, pricePaidInr / lastPaymentRef untouched', async () => {
  const db = memoryFirestore();
  await grantPass({ uid: 'u1', passType: 'month', paymentRef: 'pay_1', now: NOW - DAY }, { firestore: db, foundingOfferOpen: true });
  const paymentsBefore = db.keys().filter((k) => k.includes('/payments/'));
  await run(db);
  const after = db.read(SUB('u1'));
  assert.deepEqual(db.keys().filter((k) => k.includes('/payments/')), paymentsBefore);
  assert.equal(paymentsBefore.length, 1);
  assert.ok(!db.keys().some((k) => k.startsWith('payOrders/')));
  assert.equal(after.pricePaidInr, 599, 'the last SALE price must not be overwritten by the reward');
  assert.equal(after.lastPaymentRef, 'pay_1');
});

test('not a sale · a trial account gets NO price field at all', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(2) });
  await run(db);
  const after = db.read(SUB('u1'));
  assert.equal('pricePaidInr' in after, false);
  assert.equal('lastPaymentRef' in after, false);
  assert.ok(!db.keys().some((k) => k.includes('/payments/') || k.startsWith('payOrders/')));
});

test('not a sale · forged money/time fields in the input are ignored', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(30, { tier: 'free' }) });
  await extendPremium(
    { uid: 'u1', requestId: 'req-forged00', adminUid: ADMIN, now: NOW, pricePaidInr: 999, passEnd: '2099-01-01', tier: 'premium' },
    { firestore: db },
  );
  const after = db.read(SUB('u1'));
  assert.equal(msOf(after.passEnd), NOW + 7 * DAY);
  assert.equal('pricePaidInr' in after, false);
});

/* ══ The audit entry ══════════════════════════════════════════════════════════ */

test('audit · subscriptions/{uid}/adminGrants/{requestId} records who, when, days, reason, price 0, before and after', async () => {
  const db = memoryFirestore({ [SUB('u1')]: trialDoc(4) });
  await run(db, { days: 10, reason: '  Feedback call   with parent  ', requestId: 'req-audit001' });
  const rec = db.read('subscriptions/u1/adminGrants/req-audit001');
  assert.ok(rec, 'no audit entry written');
  assert.equal(rec.action, AUDIT_ACTION);
  assert.equal(rec.requestId, 'req-audit001');
  assert.equal(rec.days, 10);
  assert.equal(rec.reason, 'Feedback call with parent');
  assert.equal(rec.pricePaidInr, 0);
  assert.equal(rec.isSale, false);
  assert.equal(rec.adminUid, ADMIN);
  assert.equal(rec.basis, 'trial');
  assert.equal(msOf(rec.previousEnd), NOW + 3 * DAY);
  assert.equal(msOf(rec.newEnd), NOW + 13 * DAY);
  assert.equal(msOf(rec.createdAt), NOW);
});
