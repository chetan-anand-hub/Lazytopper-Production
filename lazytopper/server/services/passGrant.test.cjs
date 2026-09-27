// STORED-RATE-1 — a student's pass is stored, priced, dated and unforgeable.
//
// R3 grantPass (price, dates, stacking, idempotency, one transaction), R4 the admin
// route over REAL HTTP through the REAL index.cjs, R5 expiry in the server gate, and
// R6's forged-field case. The client half of R5 is in
// src/services/subscriptionService.entitlement.test.ts §9, the rules half of R2 in
// firestore-rules-tests/subscriptions.rules.test.mjs §15/§16, and the pricing mirror's
// parity in src/config/passPricing.parity.test.ts.
//
// ★ MUTATIONS (each run against THIS file only, each shown red, each restored):
//   M1  passGrant.cjs takes pricePaidInr from the input  -> "R6 · price from input is IGNORED" red
//   M2  passGrant.cjs drops runTransaction for a plain get/set
//                                                         -> "R6 · CONCURRENT double grant" red
//
// Run: node --test lazytopper/server/services/passGrant.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const {
  grantPass,
  computeGrant,
  PassGrantInputError,
  PASS_FIELDS,
} = require('./passGrant.cjs');
const pricing = require('./passPricing.cjs');
const { deriveEffectiveTier, isEntitled, createEntitlementGate } = require('./entitlement.cjs');

const INDEX_CJS = path.resolve(__dirname, '..', 'index.cjs');
const DAY = 24 * 60 * 60 * 1000;

/** Noon IST on a calendar date, as epoch ms. */
const istNoon = (isoDate) => Date.parse(`${isoDate}T12:00:00+05:30`);
/** The last millisecond of an IST calendar day. */
const istDayEnd = (isoDate) => Date.parse(`${isoDate}T00:00:00+05:30`) + DAY - 1;
const ms = (v) => (v instanceof Date ? v.getTime() : v);

/* ── an in-memory Firestore with REAL optimistic transactions ─────────────────
   Every read and write yields to the event loop, so two unsynchronised grants
   genuinely interleave: both read the old document before either writes. Inside
   runTransaction the commit re-checks every document version it read and RETRIES
   the whole function on a conflict — Firestore's own contract. So a grant that
   uses the transaction serialises, and one that does not loses an update. */
function memoryFirestore(seed = {}) {
  const docs = new Map();
  for (const [key, data] of Object.entries(seed)) docs.set(key, { data: { ...data }, version: 1 });
  const stats = { commits: 0, retries: 0, plainWrites: 0 };
  const yieldNow = () => new Promise((r) => setImmediate(r));
  const snapOf = (entry) => ({ exists: !!entry, data: () => (entry ? { ...entry.data } : undefined) });
  function write(key, data, opts) {
    const prev = docs.get(key);
    const base = opts && opts.merge && prev ? prev.data : {};
    docs.set(key, { data: { ...base, ...data }, version: (prev ? prev.version : 0) + 1 });
  }
  function ref(key) {
    return {
      key,
      async get() { await yieldNow(); return snapOf(docs.get(key)); },
      async set(data, opts) { await yieldNow(); stats.plainWrites += 1; write(key, data, opts); },
    };
  }
  return {
    docs,
    stats,
    read: (key) => (docs.get(key) ? { ...docs.get(key).data } : undefined),
    version: (key) => (docs.get(key) ? docs.get(key).version : 0),
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
        // Commit is synchronous from here: check-and-apply cannot interleave.
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

const KEY = (uid) => `subscriptions/${uid}`;

/* ══════════════════════════════════════════════════════════════════════════
   R3 — price and dates
   ══════════════════════════════════════════════════════════════════════════ */

test('R6 · grant MONTH at FOUNDING: ₹599, founding, now -> now + 1 calendar month', async () => {
  const db = memoryFirestore();
  const now = istNoon('2026-09-27');
  const { replayed, pass } = await grantPass(
    { uid: 'u1', passType: 'month', paymentRef: 'pay_1', now },
    { firestore: db, foundingOfferOpen: true },
  );
  assert.equal(replayed, false);
  const stored = db.read(KEY('u1'));
  assert.equal(stored.tier, 'premium');
  assert.equal(stored.plan, 'pass_month');
  assert.equal(stored.passType, 'month');
  assert.equal(stored.pricePaidInr, pricing.PRICE_MONTHLY_FOUNDING_INR);
  assert.equal(stored.pricePaidInr, 599);
  assert.equal(stored.offerKey, 'founding');
  assert.equal(stored.foundingMember, true);
  assert.equal(stored.lastPaymentRef, 'pay_1');
  assert.equal(ms(stored.passStart), now);
  assert.equal(ms(stored.passEnd), istNoon('2026-10-27'));
  assert.ok(stored.passEnd instanceof Date, 'passEnd must be a Date (stored by the Admin SDK as a Timestamp)');
  assert.equal(pass.passEnd, new Date(istNoon('2026-10-27')).toISOString());
  for (const f of PASS_FIELDS) assert.ok(f in stored, `grant did not write ${f}`);
});

test('R6 · grant MONTH at REGULAR: ₹999, regular, foundingMember false', async () => {
  const db = memoryFirestore();
  await grantPass(
    { uid: 'u1', passType: 'month', paymentRef: 'pay_1', now: istNoon('2026-09-27') },
    { firestore: db, foundingOfferOpen: false },
  );
  const stored = db.read(KEY('u1'));
  assert.equal(stored.pricePaidInr, 999);
  assert.equal(stored.offerKey, 'regular');
  assert.equal(stored.foundingMember, false);
});

test('R6 · foundingMember is STICKY: offer closed, a founding member still pays ₹599', async () => {
  const db = memoryFirestore({ [KEY('u1')]: { tier: 'free', plan: 'none', foundingMember: true, lastPaymentRef: 'old' } });
  await grantPass(
    { uid: 'u1', passType: 'month', paymentRef: 'pay_2', now: istNoon('2026-09-27') },
    { firestore: db, foundingOfferOpen: false },
  );
  const stored = db.read(KEY('u1'));
  assert.equal(stored.pricePaidInr, 599);
  assert.equal(stored.offerKey, 'founding');
  assert.equal(stored.foundingMember, true);
});

test('R6 · grant TILL-BOARDS at FOUNDING: tillBoardsQuote price, ends at the END of the board day IST', async () => {
  const db = memoryFirestore();
  const now = istNoon('2026-09-27');
  await grantPass({ uid: 'u1', passType: 'till_boards', paymentRef: 'pay_1', now }, { firestore: db, foundingOfferOpen: true });
  const stored = db.read(KEY('u1'));
  // The owner ruling's own table (pricing.tillBoards.test.ts): 2026-09-26/27 -> 5 months, ₹2,396.
  assert.equal(stored.pricePaidInr, 2396);
  assert.equal(stored.plan, 'pass_till_boards');
  assert.equal(stored.offerKey, 'founding');
  assert.equal(ms(stored.passStart), now);
  assert.equal(ms(stored.passEnd), istDayEnd('2027-02-17'));
});

test('R6 · grant TILL-BOARDS at REGULAR: 5 x ₹999 x 0.8 = ₹3,996', async () => {
  const db = memoryFirestore();
  await grantPass(
    { uid: 'u1', passType: 'till_boards', paymentRef: 'pay_1', now: istNoon('2026-09-27') },
    { firestore: db, foundingOfferOpen: false },
  );
  const stored = db.read(KEY('u1'));
  assert.equal(stored.pricePaidInr, 3996);
  assert.equal(stored.offerKey, 'regular');
  assert.equal(stored.foundingMember, false);
});

test('R6 · month end is CLAMPED: 31 Jan + 1 month = 28 Feb, same IST wall time', () => {
  const { fields } = computeGrant({}, { passType: 'month', paymentRef: 'p', nowMs: istNoon('2027-01-31') });
  assert.equal(ms(fields.passEnd), istNoon('2027-02-28'));
  const leap = computeGrant({}, { passType: 'month', paymentRef: 'p', nowMs: istNoon('2028-01-31') });
  assert.equal(ms(leap.fields.passEnd), istNoon('2028-02-29'));
});

/* ══════════════════════════════════════════════════════════════════════════
   R3 — stacking
   ══════════════════════════════════════════════════════════════════════════ */

test('R6 · STACKING: a month on an ACTIVE month starts at the current passEnd', async () => {
  const db = memoryFirestore();
  await grantPass({ uid: 'u1', passType: 'month', paymentRef: 'pay_1', now: istNoon('2026-09-27') }, { firestore: db });
  await grantPass({ uid: 'u1', passType: 'month', paymentRef: 'pay_2', now: istNoon('2026-10-10') }, { firestore: db });
  const stored = db.read(KEY('u1'));
  assert.equal(ms(stored.passStart), istNoon('2026-10-27'));
  assert.equal(ms(stored.passEnd), istNoon('2026-11-27'));
  assert.equal(stored.lastPaymentRef, 'pay_2');
});

test('R6 · STACKING: a month after an EXPIRED month starts now', async () => {
  const db = memoryFirestore();
  await grantPass({ uid: 'u1', passType: 'month', paymentRef: 'pay_1', now: istNoon('2026-09-27') }, { firestore: db });
  await grantPass({ uid: 'u1', passType: 'month', paymentRef: 'pay_2', now: istNoon('2026-12-01') }, { firestore: db });
  const stored = db.read(KEY('u1'));
  assert.equal(ms(stored.passStart), istNoon('2026-12-01'));
  assert.equal(ms(stored.passEnd), istNoon('2027-01-01'));
});

test('R6 · STACKING: till-boards over a LATER month keeps the later passEnd', async () => {
  // A month bought on 10 Feb 2027 ends 10 Mar 2027, after the 17 Feb board day.
  const db = memoryFirestore();
  await grantPass({ uid: 'u1', passType: 'month', paymentRef: 'pay_1', now: istNoon('2027-02-10') }, { firestore: db });
  await grantPass({ uid: 'u1', passType: 'till_boards', paymentRef: 'pay_2', now: istNoon('2027-02-12') }, { firestore: db });
  const stored = db.read(KEY('u1'));
  assert.equal(ms(stored.passEnd), istNoon('2027-03-10'));
  assert.equal(stored.plan, 'pass_till_boards');
});

test('R6 · STACKING: till-boards over an EARLIER month runs to the board day', async () => {
  const db = memoryFirestore();
  await grantPass({ uid: 'u1', passType: 'month', paymentRef: 'pay_1', now: istNoon('2026-09-27') }, { firestore: db });
  await grantPass({ uid: 'u1', passType: 'till_boards', paymentRef: 'pay_2', now: istNoon('2026-10-01') }, { firestore: db });
  assert.equal(ms(db.read(KEY('u1')).passEnd), istDayEnd('2027-02-17'));
});

/* ══════════════════════════════════════════════════════════════════════════
   R3 — idempotency, input, transaction
   ══════════════════════════════════════════════════════════════════════════ */

test('R6 · IDEMPOTENT replay: the same paymentRef changes nothing and returns the stored pass', async () => {
  const db = memoryFirestore();
  const first = await grantPass({ uid: 'u1', passType: 'month', paymentRef: 'pay_1', now: istNoon('2026-09-27') }, { firestore: db });
  const before = db.read(KEY('u1'));
  const versionBefore = db.version(KEY('u1'));
  const again = await grantPass({ uid: 'u1', passType: 'month', paymentRef: 'pay_1', now: istNoon('2026-10-05') }, { firestore: db });
  assert.equal(again.replayed, true);
  assert.equal(db.version(KEY('u1')), versionBefore, 'a replay wrote to the document');
  assert.deepEqual(db.read(KEY('u1')), before);
  assert.deepEqual(again.pass, first.pass);
});

test('R6 · price from input is IGNORED — price, dates and offer are server-computed only', async () => {
  const db = memoryFirestore();
  const now = istNoon('2026-09-27');
  await grantPass(
    {
      uid: 'u1', passType: 'month', paymentRef: 'pay_1', now,
      // A forged request body. None of it may land.
      pricePaidInr: 1, offerKey: 'regular', passEnd: '2099-01-01T00:00:00Z', passStart: '2000-01-01T00:00:00Z',
      foundingMember: false, tier: 'free', plan: 'pass_till_boards',
    },
    { firestore: db, foundingOfferOpen: true },
  );
  const stored = db.read(KEY('u1'));
  assert.equal(stored.pricePaidInr, 599);
  assert.equal(stored.offerKey, 'founding');
  assert.equal(stored.foundingMember, true);
  assert.equal(stored.plan, 'pass_month');
  assert.equal(stored.tier, 'premium');
  assert.equal(ms(stored.passStart), now);
  assert.equal(ms(stored.passEnd), istNoon('2026-10-27'));
});

test('R6 · CONCURRENT double grant: two payments at once stack to TWO months, none lost', async () => {
  const db = memoryFirestore();
  const now = istNoon('2026-09-27');
  const results = await Promise.all([
    grantPass({ uid: 'u1', passType: 'month', paymentRef: 'pay_A', now }, { firestore: db }),
    grantPass({ uid: 'u1', passType: 'month', paymentRef: 'pay_B', now }, { firestore: db }),
  ]);
  assert.equal(results.filter((r) => r.replayed).length, 0);
  const stored = db.read(KEY('u1'));
  assert.equal(
    new Date(ms(stored.passEnd)).toISOString(),
    new Date(istNoon('2026-11-27')).toISOString(),
    'one of the two payments was lost — the grants did not serialise',
  );
  // CONTROL — the harness really interleaved them: the transaction had to retry.
  assert.ok(db.stats.retries >= 1, 'the two grants never contended, so this test proved nothing');
});

test('R3 · bad input is refused with PassGrantInputError and writes nothing', async () => {
  const db = memoryFirestore();
  const bad = [
    { uid: '', passType: 'month', paymentRef: 'p' },
    { uid: 'a/b', passType: 'month', paymentRef: 'p' },
    { uid: 'u1', passType: 'year', paymentRef: 'p' },
    { uid: 'u1', passType: 'month', paymentRef: '' },
    { uid: 'u1', passType: 'month', paymentRef: 'x'.repeat(201) },
    { uid: 'u1', passType: 'month', paymentRef: 'p', now: 'not a date' },
  ];
  for (const input of bad) {
    await assert.rejects(grantPass(input, { firestore: db }), PassGrantInputError, JSON.stringify(input));
  }
  assert.equal(db.docs.size, 0);
  await assert.rejects(grantPass({ uid: 'u1', passType: 'month', paymentRef: 'p' }, {}), /unavailable/);
});

/* ══════════════════════════════════════════════════════════════════════════
   R5 — expiry in the server gate (deriveEffectiveTier / resolve)
   ══════════════════════════════════════════════════════════════════════════ */

const END = istNoon('2026-10-27');
const passDoc = (passEnd) => ({
  tier: 'premium', plan: 'pass_month', passType: 'month',
  passStart: { toDate: () => new Date(istNoon('2026-09-27')) },
  ...(passEnd === undefined ? {} : { passEnd }),
  pricePaidInr: 599, offerKey: 'founding', foundingMember: true, lastPaymentRef: 'pay_1',
});
const stamp = (t) => ({ toDate: () => new Date(t) });

test('R6 · R5 expiry BEFORE passEnd -> premium', () => {
  const d = deriveEffectiveTier(passDoc(stamp(END)), END - 1);
  assert.equal(d.tier, 'premium');
  assert.equal(isEntitled(d.tier), true);
  assert.equal(d.passEndsAtMs, END);
});

test('R6 · R5 expiry AT passEnd -> free', () => {
  assert.equal(deriveEffectiveTier(passDoc(stamp(END)), END).tier, 'free');
});

test('R6 · R5 expiry AFTER passEnd -> free', () => {
  assert.equal(deriveEffectiveTier(passDoc(stamp(END)), END + DAY).tier, 'free');
});

test('R6 · R5 legacy premium with NO passEnd stays premium (grandfathered); null is the same', () => {
  assert.equal(deriveEffectiveTier({ tier: 'premium', plan: 'premium_monthly' }, END + 365 * DAY).tier, 'premium');
  assert.equal(deriveEffectiveTier({ tier: 'premium', plan: 'premium_monthly', passEnd: null }, END).tier, 'premium');
});

test('R6 · R5 a present but UNREADABLE passEnd fails closed -> free', () => {
  assert.equal(deriveEffectiveTier(passDoc({ garbage: true }), END - DAY).tier, 'free');
});

test('R6 · R5 an ISO-string passEnd (owner console edit) is honoured too', () => {
  const iso = new Date(END).toISOString();
  assert.equal(deriveEffectiveTier(passDoc(iso), END - 1).tier, 'premium');
  assert.equal(deriveEffectiveTier(passDoc(iso), END).tier, 'free');
});

test('R6 · FORGED: a FREE doc with a client-written passEnd in 2099 stays free', () => {
  const forged = { tier: 'free', plan: 'none', passEnd: stamp(Date.UTC(2099, 0, 1)), passType: 'till_boards' };
  const d = deriveEffectiveTier(forged, END);
  assert.equal(d.tier, 'free');
  assert.equal(isEntitled(d.tier), false);
  // ...nor does it resurrect an elapsed trial.
  const trial = { tier: 'trial', plan: 'trial_7day', trialStartDate: stamp(END - 30 * DAY), passEnd: stamp(Date.UTC(2099, 0, 1)) };
  assert.equal(deriveEffectiveTier(trial, END).tier, 'free');
});

test('R5 · trial semantics are untouched by the pass branch', () => {
  const live = { tier: 'trial', plan: 'trial_7day', trialStartDate: stamp(END - DAY) };
  assert.equal(deriveEffectiveTier(live, END).tier, 'trial');
});

test('R5 · the gate DENIES an expired pass, and a cached ALLOW never outlives passEnd', async () => {
  let doc = passDoc(stamp(END));
  let reads = 0;
  let clock = END - 1000;
  const firestore = {
    collection: () => ({ doc: () => ({ get: async () => { reads += 1; return { exists: true, data: () => doc }; } }) }),
  };
  const gate = createEntitlementGate({ adminFirestore: firestore, now: () => clock, cacheTtlMs: 60 * 1000, logger: { warn() {}, info() {} } });
  const allow = await gate.resolve('u1', {});
  assert.equal(allow.entitled, true);
  assert.equal(reads, 1);
  clock = END - 500; // inside both the TTL and the pass: served from cache
  assert.equal((await gate.resolve('u1', {})).outcome, 'cache');
  clock = END; // inside the 60 s TTL, but the pass has ended: must re-read
  const after = await gate.resolve('u1', {});
  assert.equal(after.outcome, 'read');
  assert.equal(after.entitled, false);
  assert.equal(after.tier, 'free');
  assert.equal(reads, 2);
});

/* ══════════════════════════════════════════════════════════════════════════
   R4 — the admin route over REAL HTTP through the REAL index.cjs
   ══════════════════════════════════════════════════════════════════════════ */

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

/**
 * Boot the REAL server in a child process with firebase-admin swapped (Module._load)
 * for an in-memory Firestore that supports runTransaction. `secret` undefined
 * reproduces a deploy without PASS_ADMIN_SECRET.
 */
function bootServer({ port, secret }) {
  const launcher = `
    const Module = require('module');
    const docs = new Map();
    const fake = {
      apps: [],
      credential: { cert: () => ({}) },
      initializeApp() { fake.apps.push({}); },
      auth: () => ({ verifyIdToken: async () => { throw new Error('no'); } }),
      firestore: () => ({
        collection: (n) => ({ doc: (id) => ({ key: n + '/' + id }) }),
        async runTransaction(fn) {
          const pending = [];
          const out = await fn({
            async get(r) { const d = docs.get(r.key); return { exists: !!d, data: () => (d ? { ...d } : undefined) }; },
            set(r, data, o) { pending.push([r.key, data, o]); },
          });
          for (const [k, d, o] of pending) docs.set(k, { ...((o && o.merge && docs.get(k)) || {}), ...d });
          return out;
        },
      }),
    };
    const orig = Module._load;
    Module._load = function (r) { return r === 'firebase-admin' ? fake : orig.apply(this, arguments); };
    require(${JSON.stringify(INDEX_CJS)});
  `;
  const env = { ...process.env, PORT: String(port), VITE_FIREBASE_PROJECT_ID: 'demo-stored-rate' };
  delete env.GEMINI_API_KEY; delete env.DIRECT_GEMINI_API_KEY;
  delete env.REPLIT_GEMINI_BASE_URL; delete env.REPLIT_ANTHROPIC_BASE_URL;
  delete env.DATABASE_URL;
  if (secret === undefined) delete env.PASS_ADMIN_SECRET;
  else env.PASS_ADMIN_SECRET = secret;

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

function post(port, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      { host: '127.0.0.1', port, path: urlPath, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers } },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(text); } catch {}
          resolve({ status: res.statusCode, json });
        });
      },
    );
    req.on('error', reject);
    req.end(payload);
  });
}

const GRANT = '/api/admin/grant-pass';

test('R4 · PASS_ADMIN_SECRET UNSET: the real route answers 503 and grants nothing', { timeout: 90000 }, async (t) => {
  const port = await freePort();
  const srv = bootServer({ port, secret: undefined });
  t.after(() => srv.child.kill());
  await srv.ready;
  const r = await post(port, GRANT, { uid: 'u1', passType: 'month', paymentRef: 'p' }, { 'X-Admin-Key': 'anything' });
  assert.equal(r.status, 503);
  assert.match(r.json.error, /PASS_ADMIN_SECRET/);
});

test('R4 · wrong / missing X-Admin-Key -> 401; right key -> 200 with the server-computed pass; replay -> replayed', { timeout: 90000 }, async (t) => {
  const port = await freePort();
  const srv = bootServer({ port, secret: 's3cret' });
  t.after(() => srv.child.kill());
  await srv.ready;

  const body = { uid: 'u1', passType: 'month', paymentRef: 'pay_route_1', pricePaidInr: 1, passEnd: '2099-01-01T00:00:00Z' };
  assert.equal((await post(port, GRANT, body, { 'X-Admin-Key': 'wrong' })).status, 401);
  assert.equal((await post(port, GRANT, body)).status, 401);

  const ok = await post(port, GRANT, body, { 'X-Admin-Key': 's3cret' });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.ok, true);
  assert.equal(ok.json.replayed, false);
  assert.equal(ok.json.pass.tier, 'premium');
  assert.equal(ok.json.pass.plan, 'pass_month');
  assert.equal(ok.json.pass.pricePaidInr, pricing.PRICE_MONTHLY_FOUNDING_INR);
  assert.notEqual(ok.json.pass.passEnd, '2099-01-01T00:00:00.000Z');
  assert.equal(ok.json.pass.lastPaymentRef, 'pay_route_1');

  const replay = await post(port, GRANT, body, { 'X-Admin-Key': 's3cret' });
  assert.equal(replay.status, 200);
  assert.equal(replay.json.replayed, true);
  assert.equal(replay.json.pass.passEnd, ok.json.pass.passEnd);

  const bad = await post(port, GRANT, { uid: 'u1', passType: 'forever', paymentRef: 'x' }, { 'X-Admin-Key': 's3cret' });
  assert.equal(bad.status, 400);
});
