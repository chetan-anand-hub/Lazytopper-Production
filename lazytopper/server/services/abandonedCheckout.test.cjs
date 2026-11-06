// CHECKOUT-NUDGE-1 - the abandoned-checkout email: window, paid-since, once per product, skips, flag, send window,
// cap ordering, and no phone number in any rendered URL.
const test = require('node:test');
const assert = require('node:assert/strict');

const { createNudgeEmailer, resolveNudgeConfig } = require('./nudgeEmail.cjs');
const A = require('./abandonedCheckout.cjs');

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
// 2026-11-03 10:00 IST: inside the 08-21 send window, founding offer open.
const NOW = Date.parse('2026-11-03T04:30:00.000Z');
// 2026-11-03 22:00 IST: outside the send window.
const NIGHT = Date.parse('2026-11-03T16:30:00.000Z');
const SECRET = 'x'.repeat(40);
const ENV_SEND = {
  NUDGE_EMAIL_ENABLED: '1',
  NUDGE_EMAIL_DRY_RUN: '0',
  RESEND_API_KEY: 'k',
  NUDGE_EMAIL_FROM: 'LazyTopper <hello@mail.lazytopper.com>',
  TRIAL_EMAIL_UNSUBSCRIBE_SECRET: SECRET,
};
const ENV_ON = { ...ENV_SEND, ABANDONED_CHECKOUT_EMAIL_ENABLED: '1' };
const PAY = 'payOrders';

function ts(ms) {
  return { _ms: ms, seconds: Math.floor(ms / 1000), toDate: () => new Date(ms), toMillis: () => ms };
}
function msOf(v) {
  if (v && typeof v === 'object' && typeof v._ms === 'number') return v._ms;
  if (v instanceof Date) return v.getTime();
  return null;
}
function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const plain = v && typeof v === 'object' && !Array.isArray(v) && typeof v._ms !== 'number' && !(v instanceof Date);
    out[k] = plain && out[k] && typeof out[k] === 'object' ? deepMerge(out[k], v) : v;
  }
  return out;
}
function makeDb() {
  const docs = new Map();
  const queries = [];
  let writes = 0;
  function docRef(path) {
    return {
      id: path.split('/').pop(),
      async get() {
        const data = docs.get(path);
        return { exists: data !== undefined, id: path.split('/').pop(), data: () => (data === undefined ? undefined : { ...data }) };
      },
      async set(data, opts) {
        writes += 1;
        docs.set(path, opts && opts.merge ? deepMerge(docs.get(path) || {}, data) : { ...data });
      },
      collection: (name) => collRef(`${path}/${name}`),
    };
  }
  function collRef(path, filters = [], lim = Infinity, order = null) {
    return {
      doc: (id) => docRef(`${path}/${id}`),
      where: (field, op, value) => collRef(path, [...filters, { field, op, value }], lim, order),
      limit: (n) => collRef(path, filters, n, order),
      orderBy: (field, dir) => collRef(path, filters, lim, { field, dir }),
      async get() {
        queries.push({ path, filters: filters.map((f) => `${f.field}${f.op}`) });
        const out = [];
        for (const [p, data] of docs) {
          const rest = p.slice(path.length + 1);
          if (!p.startsWith(`${path}/`) || rest.includes('/')) continue;
          const ok = filters.every(({ field, op, value }) => {
            const raw = data[field];
            if (op === '==') return raw === value;
            const a = typeof raw === 'number' ? raw : msOf(raw);
            const b = typeof value === 'number' ? value : msOf(value);
            if (a === null || b === null) return false;
            if (op === '>=') return a >= b;
            if (op === '<') return a < b;
            throw new Error(`op ${op}`);
          });
          if (ok) out.push({ id: rest, data: () => ({ ...data }), _k: order ? (msOf(data[order.field]) ?? data[order.field]) : 0 });
        }
        if (order) out.sort((x, y) => (order.dir === 'desc' ? y._k - x._k : x._k - y._k));
        return { docs: out.slice(0, lim) };
      },
    };
  }
  let chain = Promise.resolve();
  function runTransaction(fn) {
    const run = chain.then(async () => {
      const pending = [];
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, data, opts) => {
          pending.push(() => ref.set(data, opts));
          return tx;
        },
      };
      const result = await fn(tx);
      for (const w of pending) await w();
      return result;
    });
    chain = run.catch(() => {});
    return run;
  }
  return { docs, queries, collection: (n) => collRef(n), runTransaction, writes: () => writes };
}
function makeAdmin(users) {
  return {
    firestore: { Timestamp: { fromMillis: ts }, FieldValue: { serverTimestamp: () => ts(NOW) } },
    auth: () => ({
      async getUser(uid) {
        if (!users[uid]) {
          const e = new Error('no user');
          e.code = 'auth/user-not-found';
          throw e;
        }
        return users[uid];
      },
      // GUEST-ABANDON-1: the guest pass looks the address up to honour an account's own opt-out / purchases.
      async getUserByEmail(email) {
        const uid = Object.keys(users).find((k) => users[k].email === email);
        if (!uid) {
          const e = new Error('no user');
          e.code = 'auth/user-not-found';
          throw e;
        }
        return { uid, ...users[uid] };
      },
    }),
  };
}
const gUser = (email) => ({ email, emailVerified: true, disabled: false, providerData: [{ providerId: 'google.com' }] });
const phoneUser = () => ({ phoneNumber: '+919876543210', disabled: false, providerData: [{ providerId: 'phone' }] });
const USERS = { u1: gUser('one@gmail.com'), u2: gUser('two@gmail.com'), u3: gUser('three@gmail.com') };

function setup({ env = ENV_ON, now = NOW, users = USERS } = {}) {
  const db = makeDb();
  const calls = [];
  const logs = [];
  const clock = { now };
  const fetchFn = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ id: 'msg_1' }) };
  };
  const make = () =>
    createNudgeEmailer({
      config: resolveNudgeConfig(env),
      env,
      adminFirestore: db,
      firebaseAdmin: makeAdmin(users),
      fetchImpl: fetchFn,
      now: () => clock.now,
      log: (l) => logs.push(l),
      telemetry: { increment: () => {} },
      setTimeoutFn: () => ({}),
      setIntervalFn: () => ({}),
    });
  return { db, calls, logs, clock, make, run: () => make().runOnce() };
}
let n = 0;
/** An order created `ageH` hours before NOW. */
function order(db, uid, ageH, extra = {}) {
  n += 1;
  const id = `order_${n}`;
  db.docs.set(`${PAY}/${id}`, { uid, passType: 'till_boards', amountPaise: 191700, status: 'created', createdAt: new Date(NOW - ageH * HOUR), ...extra });
  return id;
}
const packOrder = (db, uid, ageH, sku, target, extra = {}) => order(db, uid, ageH, { passType: sku, packTarget: target, amountPaise: 4900, ...extra });

// ── flag ────────────────────────────────────────────────────────────────────────────────

test('flag off (default) sends nothing and never reads payOrders, even with the nudge job sending', async () => {
  const s = setup({ env: ENV_SEND });
  order(s.db, 'u1', 3);
  const r = await s.run();
  assert.equal(r.ran, true);
  assert.equal(s.calls.length, 0);
  assert.equal(r.byKind.abandoned_checkout, 0);
  assert.equal(s.db.queries.filter((q) => q.path === PAY).length, 0);
  assert.equal(s.logs.some((l) => l.startsWith('[abandoned-checkout]')), false);
});

test('only exactly "1" turns the flag on', () => {
  assert.equal(resolveNudgeConfig({}).abandonedCheckoutEnabled, false);
  assert.equal(resolveNudgeConfig({ ABANDONED_CHECKOUT_EMAIL_ENABLED: '0' }).abandonedCheckoutEnabled, false);
  assert.equal(resolveNudgeConfig({ ABANDONED_CHECKOUT_EMAIL_ENABLED: 'true' }).abandonedCheckoutEnabled, false);
  assert.equal(resolveNudgeConfig({ ABANDONED_CHECKOUT_EMAIL_ENABLED: '1' }).abandonedCheckoutEnabled, true);
  assert.equal(resolveNudgeConfig({ ABANDONED_CHECKOUT_EMAIL_ENABLED: ' 1 ' }).abandonedCheckoutEnabled, true);
});

// ── eligibility window ──────────────────────────────────────────────────────────────────

test('window: created 1 h to before 36 h ago; younger and older orders are not candidates', () => {
  const o = (ageH) => ({ uid: `u${ageH}`, passType: 'till_boards', status: 'created', createdAt: new Date(NOW - ageH * HOUR) });
  const got = A.pickCandidates([o(0.5), o(0.99), o(1), o(20), o(35.9), o(36), o(40)], NOW).map((c) => c.uid);
  assert.deepEqual(got.sort(), ['u1', 'u20', 'u35.9'].sort());
});

test('a Board Pass checkout opened 3 h ago gets ONE email with the approved shape', async () => {
  const s = setup();
  order(s.db, 'u1', 3);
  const r = await s.run();
  assert.equal(r.sent, 1);
  assert.equal(r.byKind.abandoned_checkout, 1);
  const b = s.calls[0].body;
  assert.deepEqual(b.to, ['one@gmail.com']);
  assert.equal(b.subject, 'Your Board Pass is waiting');
  assert.match(b.text, /Board Pass: ₹1,917, one payment till your boards\./);
  assert.doesNotMatch(b.text + b.html, /2,499|2499/);
  assert.doesNotMatch(b.text, /try again/); // no failed attempt on this order
  assert.match(b.text, /Finish paying: https:\/\/www\.lazytopper\.com\/pricing\?buy=board_pass&utm_source=email/);
  assert.match(b.text, /Send it to a parent: https:\/\/wa\.me\/\?text=/);
  assert.match(b.text, /Made by an IITian \(IIT Kanpur\)/);
  assert.match(b.text, /Unsubscribe: https:\/\/www\.lazytopper\.com\/api\/trial-email\/unsubscribe\?t=/);
  assert.doesNotMatch(b.text + b.html, /refund/i);
  assert.equal(b.tags[0].value, 'nudge_abandoned_checkout');
  assert.ok(b.headers['List-Unsubscribe']);
  assert.equal(s.db.docs.get('nudgeEmails/u1').abandoned_board_pass.status, 'sent');
});

test('with parent pay live, "Send it to a parent" opens the Plans page (Board Pass only)', async () => {
  const s = setup({ env: { ...ENV_ON, PAYMENTS_ENABLED: '1', PARENT_PAY_ENABLED: '1' } });
  order(s.db, 'u1', 3);
  packOrder(s.db, 'u2', 3, 'pack_chapter', 'real-numbers');
  await s.run();
  const byTo = Object.fromEntries(s.calls.map((c) => [c.body.to[0], c.body.text]));
  assert.match(byTo['one@gmail.com'], /Send it to a parent: https:\/\/www\.lazytopper\.com\/pricing\?utm_source=email/);
  assert.match(byTo['one@gmail.com'], /"Forward link to parents"/);
  assert.match(byTo['two@gmail.com'], /Send it to a parent: https:\/\/wa\.me\/\?text=/);
});

test('a pack checkout: pack name, catalogue price, the OFFERS-V2 one-tap /packs?buy=&t= link', async () => {
  const s = setup();
  packOrder(s.db, 'u1', 5, 'pack_cbq', 'science', { amountPaise: 19900 });
  packOrder(s.db, 'u2', 5, 'pack_bundle', 'all', { amountPaise: 29900 });
  // u3: a Board Pass order the server credited with packs (₹1,917 - ₹199 = ₹1,718) and a failed payment attempt.
  order(s.db, 'u3', 4, { amountPaise: 171800, packCreditInr: 199, lastFailure: { code: 'BAD_REQUEST_ERROR', atMs: NOW - 4 * HOUR } });
  await s.run();
  const byTo = Object.fromEntries(s.calls.map((c) => [c.body.to[0], c.body]));
  assert.equal(byTo['one@gmail.com'].subject, 'Your Science CBQ Pack is waiting');
  assert.match(byTo['one@gmail.com'].text, /₹199, one-time payment\. It never renews\./);
  assert.match(byTo['one@gmail.com'].text, /Finish paying: https:\/\/www\.lazytopper\.com\/packs\?buy=pack_cbq&t=science&utm_source=email/);
  assert.equal(byTo['two@gmail.com'].subject, 'Your Maths + Science Bundle is waiting');
  assert.match(byTo['two@gmail.com'].text, /Finish paying: https:\/\/www\.lazytopper\.com\/packs\?buy=pack_bundle&utm_source=email/);
  assert.match(byTo['two@gmail.com'].text, /₹299, one-time payment/);
  // The credited order shows ITS OWN amount, never the config price; the failed attempt gets the one retry line.
  const t3 = byTo['three@gmail.com'].text;
  assert.match(t3, /Board Pass: ₹1,718, one payment till your boards\./);
  assert.doesNotMatch(t3, /1,917|2,499/);
  assert.ok(t3.includes(A.RETRY_LINE));
  assert.equal(A.RETRY_LINE, "If your payment didn't go through, you can simply try again — nothing extra is needed.");
  assert.doesNotMatch(byTo['one@gmail.com'].text, /try again/);
  for (const c of s.calls) assert.doesNotMatch(c.body.text + c.body.html, /2,499|2499/);
});

test('price (pure): from the order amount only; no usable amount -> no price line', () => {
  const bp = A.productOf({ passType: 'till_boards' });
  assert.equal(A.priceLine(bp, { amountPaise: 191700 }), 'Board Pass: ₹1,917, one payment till your boards.');
  assert.equal(A.priceLine(bp, { amountPaise: 0 }), null);
  assert.equal(A.priceLine(bp, {}), null);
  assert.equal(A.hadFailedAttempt({ lastFailure: { code: 'x' } }), true);
  assert.equal(A.hadFailedAttempt({}), false);
});

// ── paid since ──────────────────────────────────────────────────────────────────────────

test('paid-since: a later paid Board Pass, Premium now, or a pack now owned (bundle covers chapter) -> no email', async () => {
  const s = setup();
  // u1: Board Pass abandoned 10 h ago, paid on a second order 2 h ago.
  order(s.db, 'u1', 10);
  order(s.db, 'u1', 2, { status: 'paid', paidAt: new Date(NOW - 2 * HOUR) });
  // u2: chapter pack abandoned, then the Bundle bought (outside the window, granted).
  packOrder(s.db, 'u2', 20, 'pack_chapter', 'trigonometry');
  s.db.docs.set('packEntitlements/u2/packs/pack_bundle:all', { packId: 'pack_bundle:all', sku: 'pack_bundle', target: 'all', paidAt: NOW - 3 * HOUR });
  // u3: Board Pass abandoned, Premium now (an admin grant, no paid order).
  order(s.db, 'u3', 6);
  s.db.docs.set('subscriptions/u3', { tier: 'premium', plan: 'till_boards', premiumSince: ts(NOW - HOUR) });
  const r = await s.run();
  assert.equal(s.calls.length, 0);
  assert.equal(r.skipped['paid-in-window'], 1);
  assert.equal(r.skipped['already-owned'], 1);
  assert.equal(r.skipped['premium-now'], 1);
});

test('paid-since (pure): a paid order of ANOTHER product does not block; a paid one of the same product before the checkout does not either', () => {
  const product = A.productOf({ passType: 'pack_chapter', packTarget: 'circles' });
  const ab = { createdAt: new Date(NOW - 5 * HOUR) };
  const otherPaid = { passType: 'pack_chapter', packTarget: 'triangles', status: 'paid', paidAt: new Date(NOW - HOUR) };
  const samePaidBefore = { passType: 'pack_chapter', packTarget: 'circles', status: 'paid', paidAt: new Date(NOW - 50 * HOUR) };
  const samePaidAfter = { ...samePaidBefore, paidAt: new Date(NOW - HOUR) };
  assert.equal(A.paidSinceReason({ product, order: ab, uidOrders: [otherPaid, samePaidBefore], packs: [], isPremium: true }), null);
  assert.equal(A.paidSinceReason({ product, order: ab, uidOrders: [samePaidAfter], packs: [], isPremium: false }), 'paid-since');
  const bp = A.productOf({ passType: 'till_boards' });
  assert.equal(A.paidSinceReason({ product: bp, order: ab, uidOrders: [], packs: [], isPremium: true }), 'premium-now');
});

// ── once per product ────────────────────────────────────────────────────────────────────

test('once per student per product, ever: a second run (and a re-opened checkout) sends nothing', async () => {
  const s = setup();
  order(s.db, 'u1', 3);
  assert.equal((await s.run()).sent, 1);
  const r2 = await s.run();
  assert.equal(r2.sent, 0);
  assert.equal(s.calls.length, 1);
  // A day and a half later the student opens a NEW Board Pass checkout and abandons it again: still no second email.
  s.clock.now = NOW + 30 * HOUR;
  order(s.db, 'u1', -28); // created 2 h before the new clock
  const r3 = await s.run();
  assert.equal(r3.sent, 0);
  assert.ok(r3.skipped['already-sent'] >= 1, JSON.stringify(r3.skipped));
});

test('a different product is its own email, but never the same day (one email a day)', async () => {
  const s = setup();
  order(s.db, 'u1', 5);
  packOrder(s.db, 'u1', 3, 'pack_mock', 'maths');
  const r = await s.run();
  assert.equal(r.sent, 1); // the newest first: the Mock Pack
  assert.equal(s.calls[0].body.subject, 'Your Maths Mock Pack is waiting');
  s.clock.now = NOW + 2 * HOUR; // same day: the Board Pass waits (one email a day)
  assert.equal((await s.run()).sent, 0);
  s.clock.now = NOW + 25 * HOUR; // the Board Pass order is now 30 h old, still in the window
  const r3 = await s.run();
  assert.equal(r3.sent, 1);
  assert.equal(s.calls[1].body.subject, 'Your Board Pass is waiting');
  const row = s.db.docs.get('nudgeEmails/u1');
  assert.equal(row.abandoned_pack_mock_maths.status, 'sent');
  assert.equal(row.abandoned_board_pass.status, 'sent');
  s.clock.now = NOW + 26 * HOUR;
  assert.equal((await s.run()).sent, 0);
});

// ── skips ───────────────────────────────────────────────────────────────────────────────

test('admin, @lazytopper.com, unsubscribed, guest/phone, parent-link, phone-only account, month and top-up orders are skipped', async () => {
  const users = {
    admin: gUser('boss@gmail.com'),
    staff: gUser('me@lazytopper.com'),
    unsub: gUser('unsub@gmail.com'),
    phone: phoneUser(),
    kid: gUser('kid@gmail.com'),
    mon: gUser('mon@gmail.com'),
  };
  const s = setup({ env: { ...ENV_ON, ADMIN_FIREBASE_UIDS: 'admin' }, users });
  order(s.db, 'admin', 3);
  order(s.db, 'staff', 3);
  order(s.db, 'unsub', 3);
  s.db.docs.set('trialEmails/unsub', { optedOut: true });
  order(s.db, 'phone', 3);
  order(s.db, null, 3, { payer: 'guest', guestPhone: '+919876543210' });
  order(s.db, 'kid', 3, { payer: 'parent', parentLinkId: 'abc' });
  order(s.db, 'mon', 3, { passType: 'month' });
  order(s.db, 'mon', 4, { passType: 'topup_49' });
  const r = await s.run();
  assert.equal(s.calls.length, 0);
  assert.equal(r.skipped.internal, 2);
  assert.equal(r.skipped['opted-out'], 1);
  assert.equal(r.skipped['no-email'], 1); // the phone-only account
  assert.equal(r.skipped['guest-order'], 1);
  assert.equal(r.skipped['parent-order'], 1);
  assert.equal(r.skipped['month-order'], 1);
  assert.equal(r.skipped['topup-order'], 1);
  // No phone number reaches any log line.
  assert.equal(s.logs.some((l) => /\d{10}/.test(l)), false, s.logs.join('\n'));
});

// ── send window ─────────────────────────────────────────────────────────────────────────

test('send window: at 22:00 IST nothing is read, claimed or sent; at 10:00 IST it sends', async () => {
  const s = setup({ now: NIGHT });
  order(s.db, 'u1', -9); // 3 h before NIGHT
  const r = await s.run();
  assert.equal(r.ran, false);
  assert.equal(r.reason, 'outside-send-window');
  assert.equal(s.calls.length, 0);
  assert.equal(s.db.queries.length, 0);
  assert.equal(s.db.docs.has('nudgeEmails/u1'), false);
  s.clock.now = NOW + 24 * HOUR; // next morning, 10:00 IST, the order is 27 h old
  assert.equal((await s.run()).sent, 1);
});

test('dry run: logs a masked would-send and the count line, writes and sends nothing', async () => {
  const s = setup({ env: { ...ENV_ON, NUDGE_EMAIL_DRY_RUN: '1' } });
  order(s.db, 'u1', 3);
  const before = s.db.writes();
  const r = await s.run();
  assert.equal(r.wouldSend, 1);
  assert.equal(s.calls.length, 0);
  assert.equal(s.db.writes(), before);
  assert.ok(s.logs.some((l) => /would email kind=abandoned_checkout product=board_pass uid=u1 to=o\*\*\*@gmail\.com/.test(l)));
});

test('one structured count line per run, without PII', async () => {
  const s = setup();
  order(s.db, 'u1', 3);
  order(s.db, null, 3, { payer: 'guest', guestPhone: '+919876543210' });
  await s.run();
  const lines = s.logs.filter((l) => l.startsWith('[abandoned-checkout] run'));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /mode=send candidates=1 wouldSend=0 sent=1 failed=0 skipped=\{"guest-order":1\}/);
  assert.doesNotMatch(lines[0], /@|u1|\+91/);
});

// ── cap ordering ────────────────────────────────────────────────────────────────────────

test('cap ordering: with one slot left, the abandoned-checkout email wins over checkout_help, pack nudges and d1', async () => {
  const env = {
    ...ENV_ON,
    NUDGE_EMAIL_DAILY_CAP: '1',
    PACK_NUDGE_ENABLED: '1',
    NUDGE_CONCIERGE_ENABLED: '1',
    NUDGE_EMAIL_REPLY_TO: 'chetan@lazytopper.com',
  };
  const s = setup({ env });
  // u2: a pack bought 2.5 days ago and never opened (pack nudge candidate).
  s.db.docs.set(`${PAY}/paid_u2`, { uid: 'u2', status: 'paid', passType: 'pack_cbq', packTarget: 'maths', paidAt: new Date(NOW - 2.5 * DAY) });
  s.db.docs.set('packEntitlements/u2/packs/pack_cbq:maths', { packId: 'pack_cbq:maths', sku: 'pack_cbq', target: 'maths', paidAt: NOW - 2.5 * DAY });
  // u3: signed up 25 h ago, nothing graded (d1 candidate).
  s.db.docs.set('subscriptions/u3', { tier: 'free', plan: 'trial_7day', trialStartDate: ts(NOW - 25 * HOUR), premiumSince: null });
  // u1: Board Pass checkout 5 h ago (abandoned AND a checkout_help candidate).
  order(s.db, 'u1', 5);
  const r = await s.run();
  assert.equal(s.calls.length, 1);
  assert.deepEqual(s.calls[0].body.to, ['one@gmail.com']);
  assert.equal(s.calls[0].body.subject, 'Your Board Pass is waiting');
  assert.equal(r.byKind.abandoned_checkout, 1);
  assert.equal(r.byKind.checkout_help, 0);
});

test('checkout_help never follows a student the abandoned-checkout email already covered', async () => {
  const env = { ...ENV_ON, NUDGE_CONCIERGE_ENABLED: '1', NUDGE_EMAIL_REPLY_TO: 'chetan@lazytopper.com' };
  const s = setup({ env });
  order(s.db, 'u1', 5);
  await s.run();
  s.clock.now = NOW + 25 * HOUR; // order is 30 h old: still inside checkout_help's 2-48 h window
  const r = await s.run();
  assert.equal(s.calls.length, 1);
  assert.equal(r.skipped['abandoned-email-covers'], 1);
});

// ── honest marks line ───────────────────────────────────────────────────────────────────

test('marks line: only from real graded sessions; none graded or nothing lost -> no line', async () => {
  assert.equal(A.marksLostLine([], NOW), null);
  assert.equal(A.marksLostLine([{ id: 'a', status: 'graded', gradedAt: NOW - HOUR, marksAwarded: 5, marksTotal: 5 }], NOW), null);
  assert.equal(A.marksLostLine([{ id: 'a', status: 'pending-upload', gradedAt: NOW - HOUR, marksAwarded: 0, marksTotal: 5 }], NOW), null);
  const recs = [
    { id: 'a', status: 'graded', gradedAt: NOW - HOUR, marksAwarded: 3.5, marksTotal: 5 },
    { id: 'b', status: 'graded', gradedAt: NOW - 2 * HOUR, marksAwarded: 1, marksTotal: 3 },
    { id: 'c', status: 'graded', gradedAt: NOW - 40 * DAY, marksAwarded: 0, marksTotal: 80 }, // too old
  ];
  assert.equal(A.marksLostLine(recs, NOW), 'In your last 2 marked papers on LazyTopper, step marking found 3.5 of 8 marks lost.');

  const s = setup();
  order(s.db, 'u1', 3);
  order(s.db, 'u2', 3);
  for (const r of recs) s.db.docs.set(`sessionRecords/u1/records/${r.id}`, r);
  await s.run();
  const byTo = Object.fromEntries(s.calls.map((c) => [c.body.to[0], c.body.text]));
  assert.match(byTo['one@gmail.com'], /step marking found 3\.5 of 8 marks lost\./);
  assert.doesNotMatch(byTo['two@gmail.com'], /marks lost/);
});

// ── privacy ─────────────────────────────────────────────────────────────────────────────

test('no phone number in any rendered URL; the WhatsApp link names no number', () => {
  const products = [
    A.productOf({ passType: 'till_boards' }),
    ...['real-numbers', 'heredity'].map((t) => A.productOf({ passType: 'pack_chapter', packTarget: t })),
    ...['maths', 'science'].flatMap((t) => ['pack_mock', 'pack_subject', 'pack_cbq'].map((sku) => A.productOf({ passType: sku, packTarget: t }))),
    A.productOf({ passType: 'pack_bundle', packTarget: 'all' }),
  ];
  for (const parentPayLive of [false, true]) {
    for (const product of products) {
      const m = A.buildAbandonedCheckoutEmail({
        product,
        order: { amountPaise: 4900, lastFailure: { code: 'x' } },
        marksLine: null,
        appUrl: 'https://www.lazytopper.com',
        unsubscribeUrl: 'https://www.lazytopper.com/api/trial-email/unsubscribe?t=abc.def',
        parentPayLive,
      });
      assert.ok(m, product.key);
      const urls = [...m.text.matchAll(/https?:\/\/\S+/g)].map((x) => x[0]).concat([...m.html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]));
      assert.ok(urls.length >= 3);
      for (const u of urls) {
        const decoded = decodeURIComponent(u.replace(/&amp;/g, '&'));
        assert.doesNotMatch(decoded, /(\+?91)?[6-9]\d{9}/, `phone-like digits in ${decoded}`);
        assert.doesNotMatch(decoded, /wa\.me\/\d/, decoded);
        assert.doesNotMatch(decoded, /uid=|email=|phone=/i, decoded);
      }
      assert.ok(urls.every((u) => !u.includes('wa.me') || u.startsWith('https://wa.me/?text=')));
      assert.doesNotMatch(m.text + m.html, /refund/i);
    }
  }
});

// ── GUEST-ABANDON-1: signed-out (guest) checkouts ───────────────────────────────────────────────────

const G = require('./guestAbandonEmail.cjs');
const ENV_GUEST = { ...ENV_SEND, GUEST_ABANDON_EMAIL_ENABLED: '1' };
/** A "Who will use it?" guest order (uid null) created `ageH` hours before NOW. */
const guestOrder = (db, ageH, extra = {}) =>
  order(db, null, ageH, { payer: 'guest', checkoutWho: true, payerType: 'signed_out', guestPhone: '+919876543948', guestEmail: 'parent.k@gmail.com', ...extra });

test('GUEST-ABANDON-1 flag: only exactly "1"; off (default) sends nothing to a guest and writes nothing', async () => {
  assert.equal(G.guestAbandonEmailEnabled({}), false);
  assert.equal(G.guestAbandonEmailEnabled({ GUEST_ABANDON_EMAIL_ENABLED: 'true' }), false);
  assert.equal(G.guestAbandonEmailEnabled({ GUEST_ABANDON_EMAIL_ENABLED: '1' }), true);
  const s = setup({ env: ENV_SEND });
  guestOrder(s.db, 3);
  const r = await s.run();
  assert.equal(r.ran, true);
  assert.equal(s.calls.length, 0);
  assert.equal(r.byKind.guest_abandoned_checkout, 0);
  assert.equal([...s.db.docs.keys()].some((k) => k.startsWith('guestNudgeEmails/')), false);
  assert.equal(s.logs.some((l) => l.startsWith('[guest-abandoned-checkout]')), false);
});

test('GUEST-ABANDON-1: a guest checkout with an email gets EXACTLY one calm email in the window; a second run sends nothing', async () => {
  const s = setup({ env: ENV_GUEST });
  guestOrder(s.db, 3);
  const r = await s.run();
  assert.equal(r.sent, 1);
  assert.equal(r.byKind.guest_abandoned_checkout, 1);
  const b = s.calls[0].body;
  assert.deepEqual(b.to, ['parent.k@gmail.com']);
  assert.equal(b.subject, 'Your LazyTopper checkout for the Board Pass');
  assert.match(b.text, /Nothing was charged\./);
  assert.match(b.text, /Board Pass: ₹1,917\./); // the CURRENT price (founding offer open at NOW), nothing else
  assert.match(b.text, /Open the Plans page: https:\/\/www\.lazytopper\.com\/pricing\?utm_source=email/);
  assert.doesNotMatch(b.text + b.html, /buy=|refund|\bask\b|hurry|today only|last chance/i);
  assert.match(b.text, /Unsubscribe: https:\/\/www\.lazytopper\.com\/api\/guest-email\/unsubscribe\?t=/);
  assert.ok(b.headers['List-Unsubscribe'].includes('/api/guest-email/unsubscribe'));
  assert.equal(b.tags[0].value, 'nudge_guest_abandoned_checkout');
  const key = G.emailKey('parent.k@gmail.com');
  assert.equal(s.db.docs.get(`guestNudgeEmails/${key}`).abandoned_board_pass.status, 'sent');
  // No raw address or phone stored by this pass, and none in any log line.
  assert.equal([...s.db.docs.keys()].some((k) => k.includes('parent.k')), false);
  assert.equal(s.logs.some((l) => l.includes('parent.k@') || /\d{10}/.test(l)), false, s.logs.join('\n'));
  // Re-run the next day (spacing passed): still once per recipient per product, ever.
  s.clock.now = NOW + 25 * HOUR;
  guestOrder(s.db, 3 - 25); // re-opened the same product 3 h before the new now
  assert.equal((await s.run()).sent, 0);
  assert.equal(s.calls.length, 1);
});

test('GUEST-ABANDON-1: a guest checkout with no email (phone only) gets nothing, never an SMS/WhatsApp', async () => {
  const s = setup({ env: ENV_GUEST });
  order(s.db, null, 3, { payer: 'guest', guestPhone: '+919876543948' }); // PAY-PHONE-1
  guestOrder(s.db, 4, { guestEmail: undefined }); // "Who" with phone only
  const r = await s.run();
  assert.equal(s.calls.length, 0);
  assert.equal(r.skipped['guest-no-email'], 2);
  assert.equal(s.logs.some((l) => /\d{10}/.test(l)), false);
});

test('GUEST-ABANDON-1: a suppressed address (guest stop link) gets nothing; the stop link records only the key', async () => {
  const s = setup({ env: ENV_GUEST });
  const emailer = s.make();
  const key = G.emailKey('Parent.K@gmail.com ');
  const token = G.signGuestUnsubscribe(key, SECRET);
  const resp = () => {
    const r = { status: 0, body: '' };
    r.writeHead = (st) => { r.status = st; };
    r.end = (b) => { r.body = b; };
    return r;
  };
  const get = resp();
  await emailer.handleGuestUnsubscribe({ method: 'GET' }, get, `/api/guest-email/unsubscribe?t=${encodeURIComponent(token)}`);
  assert.equal(get.status, 200);
  assert.equal(s.db.docs.has(`emailSuppression/${key}`), false, 'a GET (link scanner) never unsubscribes');
  const bad = resp();
  await emailer.handleGuestUnsubscribe({ method: 'POST' }, bad, `/api/guest-email/unsubscribe?t=${key}.AAAA`);
  assert.equal(bad.status, 400);
  const post = resp();
  await emailer.handleGuestUnsubscribe({ method: 'POST' }, post, `/api/guest-email/unsubscribe?t=${encodeURIComponent(token)}`);
  assert.equal(post.status, 200);
  assert.deepEqual(Object.keys(s.db.docs.get(`emailSuppression/${key}`)).sort(), ['optedOut', 'optedOutAt', 'source']);
  guestOrder(s.db, 3);
  const r = await s.run();
  assert.equal(s.calls.length, 0);
  assert.equal(r.skipped['opted-out'], 1);
});

test('GUEST-ABANDON-1: an address that is an account honours that account\'s opt-out; paid since / outside window / send window -> none', async () => {
  const users = { kid: gUser('parent.k@gmail.com') };
  const s = setup({ env: ENV_GUEST, users });
  s.db.docs.set('trialEmails/kid', { optedOut: true });
  guestOrder(s.db, 3);
  assert.equal((await s.run()).skipped['opted-out'], 1);

  const s2 = setup({ env: ENV_GUEST });
  guestOrder(s2.db, 5);
  guestOrder(s2.db, 2, { status: 'paid_unclaimed', paymentId: 'pay_1', guestPaidAt: new Date(NOW - 2 * HOUR) });
  guestOrder(s2.db, 40); // too old
  guestOrder(s2.db, 0.5, { guestEmail: 'other@gmail.com' }); // too young
  const r2 = await s2.run();
  assert.equal(s2.calls.length, 0);
  assert.equal(r2.skipped['guest-paid-in-window'], 1);
  assert.equal(r2.candidates, 0); // the too-old / too-young orders are outside the read window altogether

  const s3 = setup({ env: ENV_GUEST, now: NIGHT });
  guestOrder(s3.db, -9);
  const r3 = await s3.run();
  assert.equal(r3.reason, 'outside-send-window');
  assert.equal(s3.calls.length, 0);
});

test('GUEST-ABANDON-1: one email a day per recipient and the shared daily cap; a pack links to /packs, not a payment', async () => {
  const s = setup({ env: { ...ENV_GUEST, NUDGE_EMAIL_DAILY_CAP: '1' } });
  guestOrder(s.db, 3, { passType: 'pack_chapter', packTarget: 'triangles', amountPaise: 4900 });
  guestOrder(s.db, 4); // same address, Board Pass: never the same day
  guestOrder(s.db, 5, { guestEmail: 'second@gmail.com' }); // another address: the cap (1) is already used
  const r = await s.run();
  assert.equal(s.calls.length, 1);
  assert.equal(r.skipped['daily-cap'], 1);
  const b = s.calls[0].body;
  assert.match(b.text, /Triangles Chapter Pack: ₹49\./);
  assert.match(b.text, /https:\/\/www\.lazytopper\.com\/packs\?utm_source=email/);
  assert.doesNotMatch(b.text, /buy=|&t=/);
});

// ── GUEST-ABANDON-1 review D1/D5/D6 ─────────────────────────────────────────────────────────────

test('review D1: the stop promise - an address stopped via the guest link gets NO account email either (abandoned checkout, d1)', async () => {
  const s = setup({ env: { ...ENV_GUEST, ABANDONED_CHECKOUT_EMAIL_ENABLED: '1' } });
  s.db.docs.set(`emailSuppression/${G.emailKey('one@gmail.com')}`, { optedOut: true, source: 'guest-email' });
  order(s.db, 'u1', 3); // the signed-in abandoned-checkout email (CHECKOUT-NUDGE-1)
  guestOrder(s.db, 3, { guestEmail: 'one@gmail.com' }); // and a guest checkout with the same address
  const r = await s.run();
  assert.equal(s.calls.length, 0, 'no email of any kind reaches a stopped address');
  assert.ok(r.skipped['opted-out'] >= 2);
  // The copy promises exactly what is honoured: reminder + follow-up emails stop; receipts and sign-in codes are named.
  const msg = G.buildGuestAbandonEmail({ product: { key: 'board_pass', kind: 'board_pass' }, currentPriceInr: 1917, appUrl: 'https://x', unsubscribeUrl: 'https://x/u' });
  assert.match(msg.text, /stop LazyTopper reminder and follow-up emails to this address/);
  assert.match(msg.text, /Sign-in codes and payment receipts still arrive\./);
  assert.doesNotMatch(msg.text, /stop all LazyTopper emails/);
});

test('review D6: guest stop tokens - tampered, wrong secret, short secret, malformed key, other key -> refused; tokens do not expire by design', () => {
  const SECRET2 = 'y'.repeat(40);
  const key = G.emailKey('parent.k@gmail.com');
  const tok = G.signGuestUnsubscribe(key, SECRET);
  assert.equal(G.verifyGuestUnsubscribe(tok, SECRET), key);
  const [k, mac] = tok.split('.');
  const flipped = `${k}.${mac[0] === 'A' ? 'B' : 'A'}${mac.slice(1)}`;
  assert.equal(G.verifyGuestUnsubscribe(flipped, SECRET), null, 'tampered mac');
  assert.equal(G.verifyGuestUnsubscribe(`${G.emailKey('x@gmail.com')}.${mac}`, SECRET), null, 'mac of another key');
  assert.equal(G.verifyGuestUnsubscribe(tok, SECRET2), null, 'wrong secret');
  assert.equal(G.verifyGuestUnsubscribe(G.signGuestUnsubscribe(key, 'short'), 'short'), null, 'a secret under 32 chars is refused');
  assert.equal(G.verifyGuestUnsubscribe(`NOTHEX.${mac}`, SECRET), null, 'malformed key');
  assert.equal(G.verifyGuestUnsubscribe('', SECRET), null);
  assert.equal(G.verifyGuestUnsubscribe(`${tok}${'a'.repeat(300)}`, SECRET), null, 'oversized');
});

test('review D5: a timed-out guest send is retried next run only while inside 22 h of the FIRST attempt', async () => {
  const s = setup({ env: ENV_GUEST });
  const key = G.emailKey('parent.k@gmail.com');
  let mode = 'timeout';
  const emailer = createNudgeEmailer({
    config: resolveNudgeConfig(ENV_GUEST), env: ENV_GUEST, adminFirestore: s.db, firebaseAdmin: makeAdmin(USERS),
    fetchImpl: async () => { if (mode === 'timeout') throw Object.assign(new Error('t'), { name: 'TimeoutError' }); return { ok: true, status: 200, json: async () => ({ id: 'm' }) }; },
    now: () => s.clock.now, log: () => {}, telemetry: { increment: () => {} }, setTimeoutFn: () => ({}), setIntervalFn: () => ({}),
  });
  guestOrder(s.db, 2);
  await emailer.runOnce();
  const row = s.db.docs.get(`guestNudgeEmails/${key}`);
  assert.equal(row.abandoned_board_pass, undefined, 'a timeout inside the window releases the claim (retry next run)');
  assert.equal(row.firstAttemptMs_abandoned_board_pass, NOW, 'the first attempt time survives the release');
  // 23 h later the order (now 25 h old) is still in the 1-36 h window, but the first attempt is past 22 h: no retry.
  s.clock.now = NOW + 23 * HOUR;
  await emailer.runOnce();
  assert.equal(s.db.docs.get(`guestNudgeEmails/${key}`).abandoned_board_pass.status, 'failed');
  mode = 'ok';
  s.clock.now = NOW + 26 * HOUR;
  await emailer.runOnce();
  assert.equal(s.db.docs.get(`guestNudgeEmails/${key}`).abandoned_board_pass.status, 'failed', 'never re-sent');
});
