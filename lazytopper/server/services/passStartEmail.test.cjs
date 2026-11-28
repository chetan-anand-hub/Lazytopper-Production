const test = require('node:test');
const assert = require('node:assert/strict');

const { createNudgeEmailer, resolveNudgeConfig } = require('./nudgeEmail.cjs');
const P = require('./passStartEmail.cjs');
const fs = require('node:fs');
const path = require('node:path');

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
// 2026-11-03 10:00 IST: inside the 08-21 send window.
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
const ENV_ON = { ...ENV_SEND, PASS_START_EMAIL_ENABLED: '1' };
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


/** A Board Pass granted `ageH` hours before NOW (what grantPass writes: server-set passStart / passEnd / passType). */
function grant(db, uid, ageH, extra = {}) {
  db.docs.set(`subscriptions/${uid}`, {
    tier: 'premium',
    plan: 'pass_till_boards',
    passType: 'till_boards',
    passStart: ts(NOW - ageH * HOUR),
    passEnd: ts(NOW + 90 * DAY),
    ...extra,
  });
}

test('PASS-START-1 header: reads only, no grading change (4a not triggered)', () => {
  const src = fs.readFileSync(path.join(__dirname, 'passStartEmail.cjs'), 'utf8');
  assert.match(src, /PASS-START-1/);
  assert.doesNotMatch(src, /gradeStructuredSet|handleCheckSolution/);
});

test('kill switch: flag off (default) sends nothing and never reads subscriptions for it', async () => {
  const s = setup({ env: ENV_SEND });
  grant(s.db, 'u1', 30);
  const r = await s.run();
  assert.equal(s.calls.length, 0);
  assert.equal(r.byKind.pass_start, 0);
  assert.equal(s.db.queries.filter((q) => q.filters.some((f) => f.startsWith('passStart'))).length, 0);
  assert.equal(resolveNudgeConfig({}).passStartEnabled, false);
  assert.equal(resolveNudgeConfig({ PASS_START_EMAIL_ENABLED: 'true' }).passStartEnabled, false);
  assert.equal(resolveNudgeConfig({ PASS_START_EMAIL_ENABLED: '1' }).passStartEnabled, true);
});

test('window (pure): 24 h up to before 72 h after the grant', () => {
  assert.equal(P.passStartDue(23.9 * HOUR), false);
  assert.equal(P.passStartDue(24 * HOUR), true);
  assert.equal(P.passStartDue(72 * HOUR), false);
  assert.equal(P.passStartDue(NaN), false);
});

test('inactive holder 30 h after the grant gets ONE email, once ever (restart does not resend)', async () => {
  const s = setup();
  grant(s.db, 'u1', 30);
  const r = await s.run();
  assert.equal(r.sent, 1);
  assert.equal(r.byKind.pass_start, 1);
  const b = s.calls[0].body;
  assert.deepEqual(b.to, ['one@gmail.com']);
  assert.match(b.text, /Open Home: https:\/\/www\.lazytopper\.com\/\?utm_source=email&utm_medium=email&utm_campaign=nudge_passstart/);
  assert.doesNotMatch(b.text + b.html, /₹|refund|premium/i);
  assert.equal(b.tags[0].value, 'nudge_pass_start');
  assert.equal(s.db.docs.get('nudgeEmails/u1').passstart.status, 'sent');
  s.clock.now = NOW + 3 * HOUR;
  const again = await s.run();
  assert.equal(again.sent, 0);
  assert.equal(s.calls.length, 1);
});

test('not yet 24 h, or past 72 h: nothing', async () => {
  const s = setup();
  grant(s.db, 'u1', 20);
  grant(s.db, 'u2', 80);
  const r = await s.run();
  assert.equal(r.sent, 0);
});

test('skipped when the student already has a graded record', async () => {
  const s = setup();
  grant(s.db, 'u1', 30);
  s.db.docs.set('sessionRecords/u1/records/r1', { gradedAt: NOW - HOUR });
  const r = await s.run();
  assert.equal(r.sent, 0);
  assert.equal(r.skipped['already-active'], 1);
});

test('skipped when the student already has a practice attempt', async () => {
  const s = setup();
  grant(s.db, 'u1', 30);
  s.db.docs.set('practiceInsights/u1/attempts/a1', { timestamp: NOW - HOUR });
  const r = await s.run();
  assert.equal(r.sent, 0);
  assert.equal(r.skipped['already-active'], 1);
});

test('a lapsed pass, a non-pass premium and a plain student are never emailed', async () => {
  const s = setup();
  grant(s.db, 'u1', 30, { passEnd: ts(NOW - HOUR) });
  grant(s.db, 'u2', 30, { passType: undefined });
  const r = await s.run();
  assert.equal(r.sent, 0);
});

test('opted out, phone-only and admin accounts are skipped', async () => {
  const s = setup({ users: { ...USERS, u2: phoneUser() }, env: { ...ENV_ON, ADMIN_FIREBASE_UIDS: 'u3' } });
  grant(s.db, 'u1', 30);
  grant(s.db, 'u2', 30);
  grant(s.db, 'u3', 30);
  s.db.docs.set('trialEmails/u1', { optedOut: true });
  const r = await s.run();
  assert.equal(r.sent, 0);
});

test('spacing: another nudge claimed within 24 h defers it; nothing is duplicated', async () => {
  const s = setup();
  grant(s.db, 'u1', 30);
  s.db.docs.set('nudgeEmails/u1', { lastClaimMs: NOW - 2 * HOUR, d1: { status: 'sent' } });
  const r = await s.run();
  assert.equal(r.sent, 0);
  assert.equal(r.skipped.spaced, 1);
  assert.equal(s.db.docs.get('nudgeEmails/u1').passstart, undefined);
});

test('daily cap and send window are honoured', async () => {
  const s = setup({ env: { ...ENV_ON, NUDGE_EMAIL_DAILY_CAP: '1' } });
  grant(s.db, 'u1', 30);
  grant(s.db, 'u2', 31);
  const r = await s.run();
  assert.equal(r.sent, 1);
  const n = setup({ now: NIGHT });
  grant(n.db, 'u1', 30);
  const rn = await n.run();
  assert.equal(rn.ran, false);
  assert.equal(n.calls.length, 0);
});

test('only the student is emailed: no payer address is read or used', async () => {
  const s = setup();
  grant(s.db, 'u1', 30);
  s.db.docs.set('payOrders/o1', { uid: 'u1', payer: 'parent', status: 'paid' });
  await s.run();
  assert.equal(s.calls.length, 1);
  assert.deepEqual(s.calls[0].body.to, ['one@gmail.com']);
  assert.equal(s.db.queries.filter((q) => q.path === 'payOrders').length, 0);
});
