// PACK-NUDGE-1 - email buyers who have not opened their pack: eligibility, windows, one-a-day, copy, idempotency.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createNudgeEmailer,
  resolveNudgeConfig,
  kindsInWindow,
  isKindDue,
  activeMinutesFromDays,
  openedPricing,
  foundingPriceLine,
  buildNudgeEmail,
  NUDGE_EMAILS_COLLECTION,
  NUDGE_EMAIL_DAILY_COLLECTION,
  FOUNDING_FROM_MS,
  FOUNDING_UNTIL_MS,
} = require('./nudgeEmail.cjs');
const { verifyUnsubscribe, TRIAL_EMAILS_COLLECTION } = require('./trialEndingEmail.cjs');

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
// 2026-10-27 10:00 IST: before the founding window.
const NOW = Date.parse('2026-10-27T04:30:00.000Z');
// 2026-11-15 10:00 IST: inside the founding window.
const NOW_NOV = Date.parse('2026-11-15T04:30:00.000Z');
const SECRET = 'x'.repeat(40);
const ENV_SEND = {
  NUDGE_EMAIL_ENABLED: '1',
  NUDGE_EMAIL_DRY_RUN: '0',
  RESEND_API_KEY: 'k',
  NUDGE_EMAIL_FROM: 'LazyTopper <hello@mail.lazytopper.com>',
  TRIAL_EMAIL_UNSUBSCRIBE_SECRET: SECRET,
};

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
      async delete() {
        writes += 1;
        docs.delete(path);
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
        queries.push({ path, filters: filters.map((f) => `${f.field}${f.op}`), lim, order: order && order.field });
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
        set: (ref, data, opts) => { pending.push(() => ref.set(data, opts)); return tx; },
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
        if (!users[uid]) { const e = new Error('no user'); e.code = 'auth/user-not-found'; throw e; }
        return users[uid];
      },
    }),
  };
}
const gUser = (email = 's@gmail.com') => ({ email, emailVerified: true, disabled: false, providerData: [{ providerId: 'google.com' }] });
const sub = (startMs, extra = {}) => ({ tier: 'free', plan: 'trial_7day', trialStartDate: ts(startMs), premiumSince: null, ...extra });
const rec = (db, uid, id, gradedAt, surface = 'check-improve') =>
  db.docs.set(`sessionRecords/${uid}/records/${id}`, { id, surface, gradedAt, status: 'graded' });
const day = (db, uid, key, data) => db.docs.set(`activityLog/${uid}/activityDays/${key}`, data);

function setup({ env = ENV_SEND, now = NOW, users, fetchImpl, subs = {} } = {}) {
  const db = makeDb();
  for (const [uid, s] of Object.entries(subs)) db.docs.set(`subscriptions/${uid}`, s);
  const calls = [];
  const logs = [];
  const counters = [];
  const fetchFn = fetchImpl || (async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return { ok: true, status: 200, json: async () => ({ id: 'msg_1' }) }; });
  const make = () => createNudgeEmailer({
    config: resolveNudgeConfig({ NUDGE_FOUNDING_EMAIL_ENABLED: '1', ...env, PAYMENTS_ENABLED: '1', PARENT_PAY_ENABLED: '1' }),
    adminFirestore: db,
    firebaseAdmin: makeAdmin(users || { u1: gUser() }),
    fetchImpl: fetchFn,
    now: () => now,
    log: (l) => logs.push(l),
    telemetry: { increment: (n) => counters.push(n) },
    setTimeoutFn: () => ({}),
    setIntervalFn: () => ({}),
  });
  return { db, calls, logs, counters, make };
}


const P = require('./packNudge.cjs');
const PAY = 'payOrders';
const PACK = 'pack_cbq:science';
const ENV_ON = { ...ENV_SEND, PACK_NUDGE_ENABLED: '1' };
// Purchases are paid `ageDays` days before NOW.
function buy(db, uid, ageDays, { packId = PACK, extra = {}, entitlement = true } = {}) {
  const [sku, target] = packId.split(':');
  const paidAt = NOW - ageDays * DAY;
  db.docs.set(`${PAY}/o_${uid}_${packId}`, { uid, status: 'paid', passType: sku, packTarget: target, paidAt: new Date(paidAt), ...extra });
  if (entitlement) db.docs.set(`packEntitlements/${uid}/packs/${packId}`, { packId, sku, target, paidAt });
  return paidAt;
}
const dl = (db, uid, key, ms) => day(db, uid, key, { firstSeenMs: ms, lastSeenMs: ms, events: { pack_download: 1 } });
const run = async (s) => s.make().runOnce();

test('flag off (default): nothing is read or sent even with the nudge scheduler on', async () => {
  const s = setup({ env: ENV_SEND });
  buy(s.db, 'u1', 2.5);
  const r = await run(s);
  assert.equal(r.sent, 0);
  assert.equal(s.calls.length, 0);
  assert.equal(s.db.queries.filter((q) => q.path === PAY).length, 0);
  assert.equal(resolveNudgeConfig({}).packNudgeEnabled, false);
  assert.equal(resolveNudgeConfig({ PACK_NUDGE_ENABLED: '1' }).packNudgeEnabled, true);
});

test('stage windows: day 2 -> email 1, day 5 -> email 2, nothing in between or after', () => {
  const st = (d) => P.packNudgeStageFor(d * DAY);
  assert.deepEqual([1.9, 2, 3.9, 4, 4.9, 5, 6.9, 7, 20].map(st), [null, 1, 1, null, null, 2, 2, null, null]);
});

test('bought, not downloaded, day 2: email 1 sent once with the approved copy; a restart never resends', async () => {
  const s = setup({ env: ENV_ON, subs: { u1: sub(NOW - 20 * DAY) } });
  buy(s.db, 'u1', 2.5);
  const r = await run(s);
  assert.equal(r.sent, 1);
  assert.equal(r.byKind.pack_nudge_1, 1);
  const body = s.calls[0].body;
  assert.equal(body.subject, 'Your Science CBQ Pack is ready. Start with 10 CBQs today');
  assert.equal(body.reply_to, 'support@lazytopper.com');
  assert.match(body.text, /Hi there,/);
  assert.match(body.text, /1\) Open one chapter's CBQs\./);
  assert.match(body.text, /Answer Checker/);
  assert.doesNotMatch(body.text + body.html, /refund|Check & Improve/i);
  assert.match(body.text, /packs\?utm_source=email&utm_medium=email&utm_campaign=pack_nudge_1#my-packs/);
  assert.match(body.text, /Made by an IITian \(IIT Kanpur\)/);
  assert.equal(s.db.docs.get('nudgeEmails/u1')[P.packNudgeKind(1, PACK)].status, 'sent');
  assert.equal((await run(s)).sent, 0);
  assert.equal(s.calls.length, 1);
});

test('already downloaded a pack file since buying -> no email', async () => {
  const s = setup({ env: ENV_ON, subs: { u1: sub(NOW - 20 * DAY) } });
  const paid = buy(s.db, 'u1', 2.5);
  dl(s.db, 'u1', '2026-10-25', paid + HOUR);
  const r = await run(s);
  assert.equal(r.sent, 0);
  assert.equal(r.skipped['pack-already-opened'], 1);
});

test('a download from before the purchase does not count; activity unreadable -> no email', () => {
  assert.equal(P.packDownloadedSince([{ events: { pack_download: 2 }, lastSeenMs: 100 }], 200), false);
  assert.equal(P.packDownloadedSince([{ events: { pack_download: 2 }, lastSeenMs: 300 }], 200), true);
  assert.equal(P.packDownloadedSince([{ events: { pack_sample_download: 1 }, lastSeenMs: 300 }], 200), false);
  assert.equal(P.packDownloadedSince(null, 200), false);
});

test('guest purchase with no account yet -> skipped', async () => {
  const s = setup({ env: ENV_ON });
  buy(s.db, 'ignored', 2.5, { extra: { uid: null, payer: 'guest', guestPhone: '9' }, entitlement: false });
  const r = await run(s);
  assert.equal(r.sent, 0);
  assert.equal(r.skipped['pack-guest-unclaimed'], 1);
});

test('phone-only account (no email) and unverified email -> skipped', async () => {
  const s = setup({ env: ENV_ON, users: { u1: { phoneNumber: '+91', providerData: [{ providerId: 'phone' }] } }, subs: { u1: sub(NOW - 20 * DAY) } });
  buy(s.db, 'u1', 2.5);
  const r = await run(s);
  assert.equal(r.sent, 0);
  assert.equal(s.calls.length, 0);
});

test('opted out -> no email', async () => {
  const s = setup({ env: ENV_ON, subs: { u1: sub(NOW - 20 * DAY) } });
  s.db.docs.set(`${TRIAL_EMAILS_COLLECTION}/u1`, { optedOut: true });
  buy(s.db, 'u1', 2.5);
  assert.equal((await run(s)).sent, 0);
});

test('day 5: email 2 only after email 1 was sent, and only if still unopened', async () => {
  const s = setup({ env: ENV_ON, subs: { u1: sub(NOW - 20 * DAY) } });
  buy(s.db, 'u1', 5.5);
  assert.equal((await run(s)).skipped['pack-email1-not-sent'], 1);
  assert.equal(s.calls.length, 0);
  // email 1 went out 3 days ago
  s.db.docs.set('nudgeEmails/u1', { [P.packNudgeKind(1, PACK)]: { status: 'sent' }, lastClaimMs: NOW - 3 * DAY });
  const r = await run(s);
  assert.equal(r.byKind.pack_nudge_2, 1);
  assert.equal(s.calls[0].body.subject, "Done the first 20 minutes? Here's the next step");
  assert.match(s.calls[0].body.text, /Done 10 CBQs\? Try the case-study CBQs next\./);
  // never a third
  assert.equal((await run(s)).sent, 0);
  // opened in between -> no email 2
  const s2 = setup({ env: ENV_ON, subs: { u1: sub(NOW - 20 * DAY) } });
  const paid = buy(s2.db, 'u1', 5.5);
  s2.db.docs.set('nudgeEmails/u1', { [P.packNudgeKind(1, PACK)]: { status: 'sent' }, lastClaimMs: NOW - 3 * DAY });
  dl(s2.db, 'u1', '2026-10-24', paid + 2 * DAY);
  assert.equal((await run(s2)).sent, 0);
});

test('one email a day: another nudge claimed today defers the pack email, never duplicates it', async () => {
  const s = setup({ env: ENV_ON, subs: { u1: sub(NOW - 20 * DAY) } });
  buy(s.db, 'u1', 2.5);
  s.db.docs.set('nudgeEmails/u1', { d3: { status: 'sent' }, lastClaimMs: NOW - 2 * HOUR });
  const r = await run(s);
  assert.equal(r.sent, 0);
  assert.equal(r.skipped.spaced, 1);
  assert.equal(s.calls.length, 0);
  // next day it goes (still inside the day 2-4 window)
  const later = setup({ env: ENV_ON, now: NOW, subs: { u1: sub(NOW - 20 * DAY) } });
  buy(later.db, 'u1', 2.5);
  later.db.docs.set('nudgeEmails/u1', { d3: { status: 'sent' }, lastClaimMs: NOW - 25 * HOUR });
  assert.equal((await run(later)).sent, 1);
});

test('a trial-ending email within 24 h also defers it', async () => {
  const s = setup({ env: ENV_ON, subs: { u1: sub(NOW - 20 * DAY) } });
  buy(s.db, 'u1', 2.5);
  s.db.docs.set(`${TRIAL_EMAILS_COLLECTION}/u1`, { status: 'sent', sentAt: ts(NOW - 3 * HOUR) });
  assert.equal((await run(s)).sent, 0);
});

test('dry run (default delivery mode) reports who would be emailed and writes nothing', async () => {
  const s = setup({ env: { NUDGE_EMAIL_ENABLED: '1', PACK_NUDGE_ENABLED: '1' }, subs: { u1: sub(NOW - 20 * DAY) } });
  buy(s.db, 'u1', 2.5);
  const w0 = s.db.writes();
  const r = await run(s);
  assert.equal(r.wouldSend, 1);
  assert.equal(r.sent, 0);
  assert.equal(s.db.writes(), w0);
  assert.equal(s.calls.length, 0);
});

test('one student, two packs: each pack has its own ledger key, one email per day', async () => {
  const s = setup({ env: ENV_ON, subs: { u1: sub(NOW - 20 * DAY) } });
  buy(s.db, 'u1', 2.5);
  buy(s.db, 'u1', 2.5, { packId: 'pack_mock:maths' });
  const r = await run(s);
  assert.equal(r.sent, 1);
  assert.equal(r.skipped.spaced, 1);
  assert.notEqual(P.packNudgeKind(1, PACK), P.packNudgeKind(1, 'pack_mock:maths'));
});

test('copy per pack type, greeting by first name', () => {
  const b = (stage, packId, displayName) => P.buildPackNudgeEmail(stage, { packId, displayName, appUrl: 'https://www.lazytopper.com', unsubscribeUrl: 'https://u/x' });
  const mock = b(1, 'pack_mock:maths', 'Asha Rao');
  assert.equal(mock.subject, 'Your Maths Mock Pack is ready. Start with Paper 1 today');
  assert.match(mock.text, /Hi Asha, your Maths Mock Pack is waiting in My packs\. Pre-boards are close, so here's a 20-minute start:/);
  assert.match(mock.text, /3\) Check each answer against the step-marking key\./);
  assert.match(b(2, 'pack_mock:maths').text, /Done Section A\? Try Section B next/);
  const ch = b(1, 'pack_chapter:quadratic-equations');
  assert.equal(ch.subject, 'Your Quadratic Equations Chapter Pack is ready. Start with your first chapter today');
  assert.match(ch.text, /first worked example's questions/);
  assert.match(b(2, 'pack_chapter:quadratic-equations').text, /Try the next set of questions/);
  assert.equal(b(1, 'pack_bundle:all').subject, 'Your Maths + Science Bundle is ready. Start with your first chapter today');
  assert.match(b(1, 'pack_subject:science').subject, /^Your Science Subject Pack/);
  assert.match(b(1, 'pack_cbq:maths', '<script>').text, /Hi there,/);
  assert.equal(b(1, 'pack_bad:x'), null);
  assert.doesNotMatch(mock.html, /<script/);
});

test('PACK-NUDGE-PRIORITY-1: under a full daily cap, the pack_nudge_1 and checkout_help emails are sent and d3 fills the rest', async () => {
  const CAP = 5;
  const subs = { buyer: sub(NOW - 20 * DAY), payer: sub(NOW - 20 * DAY) };
  const users = { buyer: gUser('buyer@gmail.com'), payer: gUser('payer@gmail.com') };
  for (let i = 0; i < 9; i += 1) {
    subs[`d3_${i}`] = sub(NOW - 3.2 * DAY - i * MIN);
    users[`d3_${i}`] = gUser(`d3_${i}@gmail.com`);
  }
  const s = setup({
    env: { ...ENV_ON, NUDGE_EMAIL_DAILY_CAP: String(CAP), NUDGE_CONCIERGE_ENABLED: '1', NUDGE_EMAIL_REPLY_TO: 'founder@example.com' },
    subs,
    users,
  });
  for (let i = 0; i < 9; i += 1) {
    rec(s.db, `d3_${i}`, `r${i}`, NOW - 3 * DAY);
    day(s.db, `d3_${i}`, '2026-10-24', { lastSeenMs: NOW - 50 * HOUR });
  }
  buy(s.db, 'buyer', 2.5);
  s.db.docs.set('payOrders/o_payer', { uid: 'payer', passType: 'month', amountPaise: 59900, status: 'created', createdAt: ts(NOW - 5 * HOUR) });
  const r = await run(s);
  assert.equal(r.byKind.pack_nudge_1, 1, 'buyer email sent');
  assert.equal(r.byKind.checkout_help, 1, 'payment-rescue email sent');
  assert.equal(r.byKind.d3, CAP - 2, 'd3 fills only the remaining cap');
  assert.equal(r.sent, CAP);
  assert.ok(r.skipped['daily-cap'] >= 1);
  assert.equal(s.db.docs.get('nudgeEmails/buyer')[P.packNudgeKind(1, PACK)].status, 'sent');
  assert.equal(s.db.docs.get('nudgeEmails/payer').checkout_help.status, 'sent');
});
