// PACKS-SERVER-1 - the EMAIL-CONCIERGE-1 checkout_help email is framed around a PLAN ("the monthly plan
// (₹599)"); an abandoned PDF-pack order must never receive it.
// Run: node --test lazytopper/server/services/nudgeEmail.packs.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');

const { createNudgeEmailer, resolveNudgeConfig } = require('./nudgeEmail.cjs');

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

const ENV_C = { ...ENV_SEND, NUDGE_CONCIERGE_ENABLED: '1', NUDGE_EMAIL_REPLY_TO: 'founder@example.com' };
const OLD = NOW - 20 * DAY;
const order = (db, id, uid, ageMs, extra = {}) =>
  db.docs.set(`payOrders/${id}`, { uid, passType: 'month', amountPaise: 59900, status: 'created', createdAt: ts(NOW - ageMs), ...extra });

test('checkout_help skips an abandoned pack order (every sku), and still emails an abandoned plan order (control)', async () => {
  const subs = {};
  const users = {};
  for (const u of ['pc', 'pm', 'ps', 'pb', 'plan']) { subs[u] = sub(OLD); users[u] = gUser(`${u}@gmail.com`); }
  const s = setup({ env: ENV_C, subs, users });
  order(s.db, 'k1', 'pc', 5 * HOUR, { passType: 'pack_chapter', packTarget: 'triangles', amountPaise: 4900 });
  order(s.db, 'k2', 'pm', 5 * HOUR, { passType: 'pack_mock', packTarget: 'maths', amountPaise: 9900 });
  order(s.db, 'k3', 'ps', 5 * HOUR, { passType: 'pack_subject', packTarget: 'science', amountPaise: 19900 });
  order(s.db, 'k4', 'pb', 5 * HOUR, { passType: 'pack_bundle', packTarget: 'all', amountPaise: 29900 });
  order(s.db, 'k5', 'plan', 5 * HOUR);
  const r = await s.make().runOnce();
  assert.equal(r.byKind.checkout_help, 1, 'only the plan order is emailed');
  assert.equal(s.calls.length, 1);
  assert.match(s.calls[0].body.text, /the monthly plan/);
  for (const u of ['pc', 'pm', 'ps', 'pb']) assert.equal((s.db.docs.get(`nudgeEmails/${u}`) || {}).checkout_help, undefined, u);
});
