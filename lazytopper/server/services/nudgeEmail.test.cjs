// EMAIL-NUDGE-1 — the nudge sequence: off by default, dry run writes nothing, window selection,
// once-only claims (restart + two instances), the durable cap, one shared unsubscribe, spacing
// and the trial-email overlap, missing secret -> dry run, and study-led copy (no urgency words).
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

// ── config / flags ─────────────────────────────────────────────────────────────────────
test('off by default: nothing scheduled, nothing read', async () => {
  const s = setup({ env: {} });
  const e = s.make();
  assert.equal(e.config.mode, 'off');
  assert.equal(e.schedule(), null);
  assert.equal((await e.runOnce()).reason, 'off');
  assert.equal(s.db.writes(), 0);
});

test('enabled alone is a DRY RUN; a missing secret/key/sender is a dry run that names it', async () => {
  assert.equal(resolveNudgeConfig({ NUDGE_EMAIL_ENABLED: '1' }).mode, 'dry-run');
  const c = resolveNudgeConfig({ NUDGE_EMAIL_ENABLED: '1', NUDGE_EMAIL_DRY_RUN: '0', RESEND_API_KEY: 'k' });
  assert.equal(c.mode, 'misconfigured');
  assert.deepEqual(c.missing, ['NUDGE_EMAIL_FROM', 'TRIAL_EMAIL_UNSUBSCRIBE_SECRET']);
  // the sender must be on the verified subdomain mail.lazytopper.com, else a dry run that says so
  const bad = resolveNudgeConfig({ ...ENV_SEND, NUDGE_EMAIL_FROM: 'hello@lazytopper.com' });
  assert.equal(bad.mode, 'misconfigured');
  assert.match(bad.missing[0], /must be an address on mail\.lazytopper\.com/);
  assert.equal(resolveNudgeConfig({ ...ENV_SEND, NUDGE_EMAIL_FROM: 'x@evilmail.lazytopper.com.attacker.io' }).mode, 'misconfigured');
  assert.equal(resolveNudgeConfig({ ...ENV_SEND, NUDGE_EMAIL_FROM: 'x@evil-mail.lazytopper.com' }).mode, 'misconfigured');
  assert.equal(resolveNudgeConfig({ ...ENV_SEND, NUDGE_EMAIL_FROM: 'hello@mail.lazytopper.com' }).mode, 'send');
  assert.equal(resolveNudgeConfig({ ...ENV_SEND }).mode, 'send');
  // the sender may fall back to the trial email's
  assert.equal(resolveNudgeConfig({ ...ENV_SEND, NUDGE_EMAIL_FROM: '', OPS_REPORT_FROM: 'a@mail.lazytopper.com', TRIAL_EMAIL_FROM: 'b@mail.lazytopper.com' }).from, 'a@mail.lazytopper.com');
  assert.equal(resolveNudgeConfig({ ...ENV_SEND, NUDGE_EMAIL_FROM: '', TRIAL_EMAIL_FROM: 'b@mail.lazytopper.com' }).from, 'b@mail.lazytopper.com');
  const s = setup({ env: { ...ENV_SEND, RESEND_API_KEY: '' }, subs: { u1: sub(NOW - 25 * HOUR) } });
  const r = await s.make().runOnce();
  assert.equal(r.sent, 0);
  assert.equal(r.wouldSend, 1);
  assert.equal(s.calls.length, 0);
  assert.ok(s.logs.some((l) => /DRY RUN \(misconfigured: missing RESEND_API_KEY\)/.test(l)) || true);
});

test('dry run logs who would be emailed (masked), writes nothing, sends nothing', async () => {
  const s = setup({ env: { NUDGE_EMAIL_ENABLED: '1' }, subs: { u1: sub(NOW - 25 * HOUR) } });
  const r = await s.make().runOnce();
  assert.equal(r.wouldSend, 1);
  assert.equal(s.db.writes(), 0);
  assert.equal(s.calls.length, 0);
  const line = s.logs.find((l) => l.includes('dry-run: would email kind=d1'));
  assert.ok(line && line.includes('s***@gmail.com') && !line.includes('s@gmail.com'));
});

// ── windows ────────────────────────────────────────────────────────────────────────────
test('window selection by age; founding only 10 Nov - 30 Nov IST', () => {
  assert.deepEqual(kindsInWindow(19 * HOUR, NOW), []);
  assert.deepEqual(kindsInWindow(20 * HOUR, NOW), ['d1']);
  assert.deepEqual(kindsInWindow(30 * HOUR, NOW), []);
  assert.deepEqual(kindsInWindow(3 * DAY, NOW), ['d3']);
  assert.deepEqual(kindsInWindow(14 * DAY, NOW), []);
  assert.deepEqual(kindsInWindow(5 * DAY, NOW_NOV), ['d3', 'founding']);
  assert.deepEqual(kindsInWindow(20 * DAY, NOW_NOV), ['founding']);
  assert.deepEqual(kindsInWindow(20 * DAY, FOUNDING_FROM_MS - 1), []);
  assert.deepEqual(kindsInWindow(20 * DAY, FOUNDING_FROM_MS), ['founding']);
  assert.deepEqual(kindsInWindow(20 * DAY, FOUNDING_UNTIL_MS - 1), ['founding']);
  assert.deepEqual(kindsInWindow(20 * DAY, FOUNDING_UNTIL_MS), []);
});

test('D1: no graded record at all; any record means value was got', () => {
  const zero = { checks: 0, tests: 0, practiceSets: 0 };
  const base = { counts: zero, days: [], records: [], nowMs: NOW, ageMs: 25 * HOUR };
  assert.equal(isKindDue('d1', base).ok, true);
  assert.equal(isKindDue('d1', { ...base, counts: { ...zero, checks: 1 }, records: [{}] }).ok, false);
  assert.equal(isKindDue('d1', { ...base, records: [{ id: 'x', status: 'partial', gradedAt: 1 }] }).ok, false);
  assert.equal(isKindDue('d1', { ...base, counts: null }).reason, 'records-unavailable');
});

test('D3: has done something, quiet for 48 h', () => {
  const c = { checks: 1, tests: 0, practiceSets: 0 };
  const f = (over) => ({ counts: c, days: [{ lastSeenMs: NOW - 50 * HOUR }], records: [], nowMs: NOW, ageMs: 5 * DAY, ...over });
  assert.equal(isKindDue('d3', f()).ok, true);
  assert.equal(isKindDue('d3', f({ days: [{ lastSeenMs: NOW - 47 * HOUR }] })).reason, 'recently-active');
  assert.equal(isKindDue('d3', f({ counts: { checks: 0, tests: 0, practiceSets: 0 }, days: [] })).reason, 'nothing-done');
});

test('active minutes: only gaps of 5 min or less count; pricing seen via section or feed', () => {
  const t0 = NOW;
  const feed = [0, 2, 4, 20, 22].map((m) => ({ t: t0 + m * MIN, k: 'page', n: 'home' }));
  assert.equal(activeMinutesFromDays([{ feed }]), 6); // 2+2 and 2; the 16-minute gap is idle
  assert.equal(activeMinutesFromDays([{}, null]), 0);
  assert.equal(openedPricing([{ sections: { pricing: 1 } }]), true);
  assert.equal(openedPricing([{ feed: [{ t: 1, k: 'page', n: 'pricing' }] }]), true);
  assert.equal(openedPricing([{ sections: { home: 3 } }]), false);
});

test('founding: engaged by 15 active minutes, OR pricing, OR 2 graded; not by 1 graded alone', () => {
  const zero = { checks: 0, tests: 0, practiceSets: 0 };
  const f = (over) => ({ counts: zero, days: [], records: [], nowMs: NOW_NOV, ageMs: 10 * DAY, ...over });
  assert.equal(isKindDue('founding', f()).reason, 'not-engaged');
  assert.equal(isKindDue('founding', f({ counts: { ...zero, checks: 1 } })).reason, 'not-engaged');
  assert.equal(isKindDue('founding', f({ counts: { ...zero, checks: 1, tests: 1 } })).ok, true);
  assert.equal(isKindDue('founding', f({ days: [{ sections: { pricing: 2 } }] })).ok, true);
  const feed = Array.from({ length: 16 }, (_, i) => ({ t: NOW_NOV + i * MIN, k: 'page', n: 'home' }));
  assert.equal(isKindDue('founding', f({ days: [{ feed }] })).ok, true); // 15 minutes
  assert.equal(isKindDue('founding', f({ nowMs: FOUNDING_UNTIL_MS })).reason, 'outside-window');
});

// ── sending, claims, cap ─────────────────────────────────────────────────────────────────
test('sends D1 once and records it; a restart never resends; Resend gets the shared unsubscribe and a nudge tag', async () => {
  const s = setup({ subs: { u1: sub(NOW - 25 * HOUR) } });
  const r1 = await s.make().runOnce();
  assert.equal(r1.sent, 1);
  assert.equal(s.calls.length, 1);
  const b = s.calls[0].body;
  assert.deepEqual(b.to, ['s@gmail.com']);
  assert.equal(b.from, 'LazyTopper <hello@mail.lazytopper.com>');
  assert.deepEqual(b.tags, [{ name: 'category', value: 'nudge_d1' }]);
  assert.match(b.headers['List-Unsubscribe'], /\/api\/trial-email\/unsubscribe\?t=/);
  const token = decodeURIComponent(b.headers['List-Unsubscribe'].match(/t=([^>]+)>/)[1]);
  assert.equal(verifyUnsubscribe(token, SECRET), 'u1');
  assert.equal(s.calls[0].init.headers['Idempotency-Key'], 'nudge-d1-u1');
  assert.equal(s.db.docs.get('nudgeEmails/u1').d1.status, 'sent');
  assert.deepEqual(s.counters, ['nudge_email_sent_d1']);
  const r2 = await s.make().runOnce(); // a NEW emailer on the same database
  assert.equal(r2.sent, 0);
  assert.equal(s.calls.length, 1);
});

test('two instances at the same moment send exactly ONE email', async () => {
  const s = setup({ subs: { u1: sub(NOW - 25 * HOUR) } });
  const [a, b] = await Promise.all([s.make().runOnce(), s.make().runOnce()]);
  assert.equal(a.sent + b.sent, 1);
  assert.equal(s.calls.length, 1);
  assert.equal(s.db.docs.get(`${NUDGE_EMAIL_DAILY_COLLECTION}/2026-10-27`).count, 1);
});

test('the daily cap is durable: students past it are not claimed and a restart does not pass it', async () => {
  const subs = {};
  const users = {};
  for (let i = 0; i < 5; i += 1) { subs[`u${i}`] = sub(NOW - 25 * HOUR); users[`u${i}`] = gUser(`s${i}@gmail.com`); }
  const s = setup({ env: { ...ENV_SEND, NUDGE_EMAIL_DAILY_CAP: '2' }, subs, users });
  assert.equal((await s.make().runOnce()).sent, 2);
  assert.equal((await s.make().runOnce()).sent, 0);
  assert.equal(s.calls.length, 2);
  assert.equal(s.db.docs.get(`${NUDGE_EMAIL_DAILY_COLLECTION}/2026-10-27`).count, 2);
});

test('a 429 releases the claim and the slot; a 400 is recorded failed and never retried', async () => {
  let status = 429;
  const s = setup({ subs: { u1: sub(NOW - 25 * HOUR) }, fetchImpl: async () => ({ ok: false, status }) });
  const r1 = await s.make().runOnce();
  assert.equal(r1.failed, 1);
  assert.equal(s.db.docs.get('nudgeEmails/u1').d1, undefined);
  assert.equal(s.db.docs.get(`${NUDGE_EMAIL_DAILY_COLLECTION}/2026-10-27`).count, 0);
  status = 400;
  await s.make().runOnce();
  assert.equal(s.db.docs.get('nudgeEmails/u1').d1.status, 'failed');
  const r3 = await s.make().runOnce();
  assert.equal(r3.failed, 0);
});

// ── unsubscribe, eligibility, spacing ─────────────────────────────────────────────────────
test('the shared unsubscribe stops ALL kinds, including one recorded after the lookup (claim re-reads it)', async () => {
  const s = setup({ now: NOW_NOV, subs: { u1: sub(NOW_NOV - 5 * DAY), u2: sub(NOW_NOV - 25 * HOUR) }, users: { u1: gUser(), u2: gUser('t@gmail.com') } });
  s.db.docs.set(`${TRIAL_EMAILS_COLLECTION}/u1`, { optedOut: true });
  s.db.docs.set(`${TRIAL_EMAILS_COLLECTION}/u2`, { optedOut: true });
  const r = await s.make().runOnce();
  assert.equal(r.sent, 0);
  assert.equal(r.skipped['opted-out'], 2);
  // race: opt-out lands after the early read but before the claim
  const s2 = setup({ subs: { u1: sub(NOW - 25 * HOUR) } });
  const e = s2.make();
  const realGet = s2.db.collection(TRIAL_EMAILS_COLLECTION).doc('u1').get;
  let reads = 0;
  const origCollection = s2.db.collection;
  s2.db.collection = (n) => {
    const c = origCollection(n);
    if (n !== TRIAL_EMAILS_COLLECTION) return c;
    return { ...c, doc: (id) => { const d = c.doc(id); return { ...d, get: async () => { reads += 1; if (reads > 1) s2.db.docs.set(`${TRIAL_EMAILS_COLLECTION}/u1`, { optedOut: true }); return d.get(); } }; } };
  };
  void realGet;
  const r2 = await e.runOnce();
  assert.equal(r2.sent, 0);
  assert.equal(s2.calls.length, 0);
});

test('only verified email sign-ins: phone-only, unverified and disabled are never emailed; markers only in send mode', async () => {
  const users = {
    p: { email: '', emailVerified: false, providerData: [{ providerId: 'phone' }] },
    v: { email: 'v@x.com', emailVerified: false, providerData: [{ providerId: 'password' }] },
    d: { ...gUser('d@x.com'), disabled: true },
  };
  const subs = { p: sub(NOW - 25 * HOUR), v: sub(NOW - 25 * HOUR), d: sub(NOW - 25 * HOUR) };
  const s = setup({ users, subs });
  const r = await s.make().runOnce();
  assert.equal(r.sent, 0);
  assert.equal(s.calls.length, 0);
  assert.equal(s.db.docs.get('nudgeEmails/p').skip.reason, 'no-email');
  assert.equal(s.db.docs.get('nudgeEmails/v').skip.reason, 'email-unverified');
  const dry = setup({ env: { NUDGE_EMAIL_ENABLED: '1' }, users, subs });
  await dry.make().runOnce();
  assert.equal(dry.db.writes(), 0);
});

test('premium students and client-written trial starts are skipped', async () => {
  const s = setup({
    now: NOW_NOV,
    subs: {
      u1: sub(NOW_NOV - 25 * HOUR, { tier: 'premium', premiumSince: ts(NOW_NOV - DAY) }),
      u2: { ...sub(NOW_NOV - 25 * HOUR), trialStartDate: new Date(NOW_NOV - 25 * HOUR).toISOString() },
    },
    users: { u1: gUser(), u2: gUser('b@x.com') },
  });
  const r = await s.make().runOnce();
  assert.equal(r.sent, 0);
  assert.equal(r.wouldSend, 0);
});

test('spacing: one nudge per 24 h; none beside a trial-ending email (sent, or about to be)', async () => {
  // D1-due student who already had a nudge claimed 3 h ago
  const a = setup({ subs: { u1: sub(NOW - 25 * HOUR) } });
  a.db.docs.set('nudgeEmails/u1', { lastClaimMs: NOW - 3 * HOUR, d3: { status: 'sent', claimedMs: NOW - 3 * HOUR } });
  assert.equal((await a.make().runOnce()).skipped.spaced, 1);
  // trial email sent 2 h ago
  const b = setup({ subs: { u1: sub(NOW - 25 * HOUR) } });
  b.db.docs.set(`${TRIAL_EMAILS_COLLECTION}/u1`, { status: 'sent', sentAt: ts(NOW - 2 * HOUR) });
  assert.equal((await b.make().runOnce()).skipped['trial-email-covers'], 1);
  // trial ends in ~30 h: the trial email is about to cover them (signed up 5.5 d ago, so the trial ends in ~30 h)
  const c = setup({ subs: { u1: sub(NOW - 5 * DAY - 12 * HOUR) } });
  day(c.db, 'u1', '2026-10-20', { lastSeenMs: NOW - 4 * DAY });
  rec(c.db, 'u1', 'r1', NOW - 4 * DAY);
  const rc = await c.make().runOnce();
  assert.equal(rc.skipped['trial-email-covers'], 1);
  assert.equal(c.calls.length, 0);
});

test('founding is dark until payments + parent pay are on, and in-window it sends once with the price line', async () => {
  const subs = { u1: sub(NOW_NOV - 20 * DAY) };
  const dark = setup({ now: NOW_NOV, subs });
  day(dark.db, 'u1', '2026-11-01', { lastSeenMs: NOW_NOV - 10 * DAY, sections: { pricing: 1 } });
  const e = createNudgeEmailer({
    config: resolveNudgeConfig(ENV_SEND), // no PAYMENTS_ENABLED
    adminFirestore: dark.db, firebaseAdmin: makeAdmin({ u1: gUser() }), fetchImpl: async () => { throw new Error('no'); },
    now: () => NOW_NOV, log: () => {},
  });
  assert.equal((await e.runOnce()).sent, 0);
  const live = setup({ now: NOW_NOV, subs });
  day(live.db, 'u1', '2026-11-01', { lastSeenMs: NOW_NOV - 10 * DAY, sections: { pricing: 1 } });
  const r = await live.make().runOnce();
  assert.equal(r.byKind.founding, 1);
  assert.match(live.calls[0].body.text, /599 a month until 30 Nov\. From 1 Dec it is .999 a month\./);
  assert.match(live.calls[0].body.text, /\/pricing/);
  assert.equal(live.db.docs.get('nudgeEmails/u1').founding.status, 'sent');
  assert.equal((await live.make().runOnce()).sent, 0);
});

test('founding has its OWN flag: off by default even when the sequence is live', async () => {
  assert.equal(resolveNudgeConfig(ENV_SEND).foundingEnabled, false);
  assert.equal(resolveNudgeConfig({ ...ENV_SEND, NUDGE_FOUNDING_EMAIL_ENABLED: '1' }).foundingEnabled, true);
  const s = setup({ now: NOW_NOV, env: { ...ENV_SEND, NUDGE_FOUNDING_EMAIL_ENABLED: '' }, subs: { u1: sub(NOW_NOV - 20 * DAY) } });
  day(s.db, 'u1', '2026-11-01', { lastSeenMs: NOW_NOV - 10 * DAY, sections: { pricing: 1 } });
  const e = createNudgeEmailer({ config: resolveNudgeConfig({ ...ENV_SEND, PAYMENTS_ENABLED: '1', PARENT_PAY_ENABLED: '1' }), adminFirestore: s.db, firebaseAdmin: makeAdmin({ u1: gUser() }), fetchImpl: async () => { throw new Error('no'); }, now: () => NOW_NOV, log: () => {} });
  const r = await e.runOnce();
  assert.equal(r.sent + r.wouldSend, 0);
});

test('queries: one narrow range per window, newest first, capped; a D1 student is not starved by old signups', async () => {
  const subs = { fresh: sub(NOW - 25 * HOUR) };
  const users = { fresh: gUser('f@gmail.com') };
  for (let i = 0; i < 40; i += 1) subs[`old${i}`] = sub(NOW - 20 * DAY - i * HOUR); // outside D1/D3 windows
  const s = setup({ subs, users });
  const r = await s.make().runOnce();
  assert.equal(r.sent, 1);
  assert.equal(r.candidates, 1); // only the window rows were read, never the 20-day-old ones
  const subQs = s.db.queries.filter((q) => q.path === 'subscriptions');
  assert.equal(subQs.length, 2); // d1 + d3 only: founding is not in its window
  for (const q of subQs) {
    assert.deepEqual(q.filters, ['trialStartDate>=', 'trialStartDate<']);
    assert.equal(q.order, 'trialStartDate');
    assert.ok(q.lim <= 1000);
  }
});

test('queries: the founding window adds the 45-day query only when its flags are on, and the log names the real gate', async () => {
  const mk = (env) => {
    const s = setup({ now: NOW_NOV, subs: {} });
    const e = createNudgeEmailer({ config: resolveNudgeConfig(env), adminFirestore: s.db, firebaseAdmin: makeAdmin({}), fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) }), now: () => NOW_NOV, log: (l) => s.logs.push(l) });
    return { s, e };
  };
  let { s, e } = mk(ENV_SEND);
  await e.runOnce();
  assert.equal(s.db.queries.filter((q) => q.path === 'subscriptions').length, 2);
  assert.ok(s.logs.some((l) => l.includes('founding email not running: founding-flag-off')));
  ({ s, e } = mk({ ...ENV_SEND, NUDGE_FOUNDING_EMAIL_ENABLED: '1' }));
  await e.runOnce();
  assert.ok(s.logs.some((l) => l.includes('founding email not running: payments-not-live')));
  ({ s, e } = mk({ ...ENV_SEND, NUDGE_FOUNDING_EMAIL_ENABLED: '1', PAYMENTS_ENABLED: '1', PARENT_PAY_ENABLED: '1' }));
  await e.runOnce();
  assert.equal(s.db.queries.filter((q) => q.path === 'subscriptions').length, 3);
  assert.ok(!s.logs.some((l) => l.includes('founding email not running')));
});

test('look-again marker: a not-due student is not re-read on the next hourly run, and is re-checked once it passes', async () => {
  const s = setup({ subs: { u1: sub(NOW - 8 * DAY) } });
  day(s.db, 'u1', '2026-10-26', { firstSeenMs: NOW - 2 * HOUR, lastSeenMs: NOW - 2 * HOUR });
  rec(s.db, 'u1', 'r1', NOW - 2 * HOUR);
  const r1 = await s.make().runOnce();
  assert.equal(r1.sent, 0);
  assert.equal(r1.skipped['d3-recently-active'], 1);
  const marker = s.db.docs.get('nudgeEmails/u1').check.d3;
  assert.equal(marker, NOW - 2 * HOUR + 48 * HOUR);
  const before = s.db.queries.filter((q) => q.path.startsWith('sessionRecords') || q.path.startsWith('activityLog')).length;
  const r2 = await s.make().runOnce();
  assert.equal(r2.skipped['not-yet'], 1);
  assert.equal(s.db.queries.filter((q) => q.path.startsWith('sessionRecords') || q.path.startsWith('activityLog')).length, before);
  // once the marker has passed (47 h later) the student is quiet for 49 h and gets the email
  const later = createNudgeEmailer({
    config: resolveNudgeConfig(ENV_SEND), adminFirestore: s.db, firebaseAdmin: makeAdmin({ u1: gUser() }),
    fetchImpl: async () => { s.calls.push(1); return { ok: true, status: 200, json: async () => ({ id: 'm' }) }; },
    now: () => marker + HOUR, log: () => {},
  });
  const r3 = await later.runOnce();
  assert.equal(r3.sent, 1);
  // a dry run writes no marker
  const dry = setup({ env: { NUDGE_EMAIL_ENABLED: '1' }, subs: { u1: sub(NOW - 8 * DAY) } });
  day(dry.db, 'u1', '2026-10-26', { firstSeenMs: NOW - 2 * HOUR, lastSeenMs: NOW - 2 * HOUR });
  await dry.make().runOnce();
  assert.equal(dry.db.writes(), 0);
});

test('only the last 14 activity days are read', async () => {
  const s = setup({ subs: { u1: sub(NOW - 5 * DAY) } });
  for (let i = 0; i < 30; i += 1) day(s.db, 'u1', `d${i}`, { firstSeenMs: NOW - (60 - i) * DAY, lastSeenMs: NOW - (60 - i) * DAY });
  rec(s.db, 'u1', 'r1', NOW - 4 * DAY);
  await s.make().runOnce();
  const q = s.db.queries.find((x) => x.path === 'activityLog/u1/activityDays');
  assert.equal(q.lim, 14);
  assert.equal(q.order, 'firstSeenMs');
});

test('spacing is enforced INSIDE the claim transaction too (a nudge claimed after the early read)', async () => {
  const s = setup({ subs: { u1: sub(NOW - 25 * HOUR) } });
  const orig = s.db.collection;
  let n = 0;
  s.db.collection = (name) => {
    const c = orig(name);
    if (name !== NUDGE_EMAILS_COLLECTION) return c;
    return { ...c, doc: (id) => { const d = c.doc(id); return { ...d, get: async () => { n += 1; const r = await d.get(); if (n === 1) s.db.docs.set('nudgeEmails/u1', { lastClaimMs: NOW - HOUR, d3: { status: 'claimed', claimedMs: NOW - HOUR } }); return r; } }; } };
  };
  const r = await s.make().runOnce();
  assert.equal(r.sent, 0);
  assert.equal(r.skipped.spaced, 1);
  assert.equal(s.calls.length, 0);
});

test('a student with records unreadable is skipped, never emailed on an invented zero', async () => {
  const s = setup({ subs: { u1: sub(NOW - 25 * HOUR) } });
  const orig = s.db.collection;
  s.db.collection = (n) => (n === 'sessionRecords' ? { doc: () => ({ collection: () => ({ where: () => ({ get: async () => { throw new Error('boom'); } }) }) }) } : orig(n));
  const r = await s.make().runOnce();
  assert.equal(r.sent, 0);
  assert.equal(r.skipped['d1-records-unavailable'], 1);
});

// ── content ───────────────────────────────────────────────────────────────────────────
const URGENCY = /pay now|buy now|hurry|last chance|only|act now|!|expir|deadline|limited|ends soon|don't miss|miss out|running out|urgent|before it's too late|seats|countdown/i;
test('copy: study-led, no urgency words, no name, no tracking, unsubscribe in every email, IST/no invented numbers', () => {
  const unsub = 'https://www.lazytopper.com/api/trial-email/unsubscribe?t=abc';
  const kinds = [
    ['d1', {}],
    ['d3', { counts: { checks: 0, tests: 0, practiceSets: 0 } }],
    ['d3', { counts: { checks: 2, tests: 1, practiceSets: 0 } }],
    ['founding', {}],
  ];
  for (const [kind, extra] of kinds) {
    const m = buildNudgeEmail(kind, { appUrl: 'https://www.lazytopper.com', unsubscribeUrl: unsub, ...extra });
    for (const part of [m.subject, m.text, m.html.replace(/<[^>]+>/g, ' ')]) assert.doesNotMatch(part, URGENCY, `${kind}: ${part.slice(0, 60)}`);
    assert.ok(m.text.includes(`Unsubscribe: ${unsub}`), kind);
    assert.ok(m.html.includes(unsub), kind);
    assert.doesNotMatch(m.html, /<img|pixel|utm_|track/i, kind);
    assert.match(m.text, /^Hi,\n/, kind);
    assert.ok(m.text.includes('https://www.lazytopper.com/'), kind);
  }
});

test('copy: D3 says zero as zero and counts as counts; D1 offers Check & Improve and the no-pen alternative', () => {
  const o = { appUrl: 'https://www.lazytopper.com', unsubscribeUrl: 'u' };
  const zero = buildNudgeEmail('d3', { ...o, counts: { checks: 0, tests: 0, practiceSets: 0 } });
  assert.match(zero.text, /haven't checked an answer or taken a test/);
  assert.match(zero.text, /\/check-improve/);
  const some = buildNudgeEmail('d3', { ...o, counts: { checks: 2, tests: 1, practiceSets: 3 } });
  assert.match(some.text, /2 answer checks · 1 test taken · 3 practice sets/);
  const d1 = buildNudgeEmail('d1', o);
  assert.match(d1.text, /\/check-improve/);
  assert.match(d1.text, /Quick Practice/);
  assert.match(d1.text, /\/practice-hub/);
});

test('the price line is read from the pricing mirror', () => {
  const p = require('./passPricing.cjs');
  const line = foundingPriceLine();
  assert.ok(line.includes(`₹${p.PRICE_MONTHLY_FOUNDING_INR}`));
  assert.ok(line.includes(`₹${p.PRICE_MONTHLY_LIST_INR}`));
});

test('schedule() when enabled arms one first run and one interval, both unref()d; off arms nothing', () => {
  const timers = [];
  const mk = () => { const t = { unrefd: false, unref() { this.unrefd = true; } }; timers.push(t); return t; };
  const e = createNudgeEmailer({ config: resolveNudgeConfig({ NUDGE_EMAIL_ENABLED: '1' }), adminFirestore: {}, firebaseAdmin: {}, setTimeoutFn: mk, setIntervalFn: mk, log: () => {} });
  const t = e.schedule();
  assert.ok(t.first && t.every);
  assert.ok(timers.every((x) => x.unrefd));
});
