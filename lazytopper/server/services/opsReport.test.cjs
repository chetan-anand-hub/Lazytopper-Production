// OPS-REPORT-1 — the daily health email: dark by default, 08:00 IST at the clock edges, one send
// per IST date under two concurrent instances, honest "couldn't read" (never a 0), dry run sends
// nothing, and the admin send-now gate. Every clock is injected: no test reads the wall clock.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createOpsReporter,
  resolveOpsReportConfig,
  describeConfig,
  collectReportData,
  buildOpsReport,
  isDueAt,
  msUntilNextRun,
  istDayStartMs,
  OPS_REPORTS_COLLECTION,
  OPS_REPORT_SEND_NOW_PATH,
  WORST_CASE_READS,
  FIRST_RUN_DELAY_MS,
} = require('./opsReport.cjs');
const { createAdminTelemetryRoutes } = require('../routes/adminTelemetry.cjs');

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
// 2030-06-15 08:00 IST = 02:30Z. Yesterday (the reported IST day) = 2030-06-14.
const NOW = Date.parse('2030-06-15T02:30:00.000Z');
const YS = istDayStartMs('2030-06-14');
const SEND_ENV = Object.freeze({
  OPS_REPORT_ENABLED: '1',
  OPS_REPORT_DRY_RUN: '0',
  RESEND_API_KEY: 're_test_key',
  OPS_REPORT_FROM: 'LazyTopper <ops@lazytopper.com>',
  OPS_REPORT_TO: 'owner@example.com',
});

// ── A tiny in-memory Firestore + Auth ──────────────────────────────────────────────────
function ts(ms) {
  return { _ms: ms, toDate: () => new Date(ms), toMillis: () => ms };
}
function msOf(v) {
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  if (v && typeof v._ms === 'number') return v._ms;
  return null;
}
function grpc(code) {
  return Object.assign(new Error(`grpc ${code}`), { code });
}
function makeDb({ failPrefix = null, failCode = 7 } = {}) {
  const docs = new Map();
  const writes = [];
  const guard = (path) => {
    if (failPrefix && path.startsWith(failPrefix)) throw grpc(failCode);
  };
  function docRef(path) {
    return {
      id: path.split('/').pop(),
      path,
      async get() {
        guard(path);
        const data = docs.get(path);
        return { exists: data !== undefined, data: () => (data === undefined ? undefined : { ...data }) };
      },
      async set(data, opts) {
        writes.push(path);
        await new Promise((r) => setImmediate(r));
        docs.set(path, opts && opts.merge ? { ...(docs.get(path) || {}), ...data } : { ...data });
      },
      collection: (name) => collRef(`${path}/${name}`),
    };
  }
  function collRef(path, filters = [], lim = Infinity) {
    const match = () => {
      guard(path);
      const out = [];
      for (const [p, data] of docs) {
        const rest = p.slice(path.length + 1);
        if (!p.startsWith(`${path}/`) || rest.includes('/')) continue;
        const ok = filters.every(({ field, op, value }) => {
          const a = msOf(data[field]);
          const b = msOf(value);
          if (a === null || b === null) return false;
          if (op === '>=') return a >= b;
          if (op === '<') return a < b;
          throw new Error(`op ${op}`);
        });
        if (ok) out.push({ id: rest, data: () => ({ ...data }) });
      }
      return out.slice(0, lim);
    };
    return {
      doc: (id) => docRef(`${path}/${id}`),
      where: (field, op, value) => collRef(path, [...filters, { field, op, value }], lim),
      limit: (n) => collRef(path, filters, n),
      select: () => collRef(path, filters, lim),
      count: () => ({ get: async () => { const n = match().length; return { data: () => ({ count: n }) }; } }),
      async get() {
        return { docs: match() };
      },
    };
  }
  let txChain = Promise.resolve();
  function runTransaction(fn) {
    const run = txChain.then(async () => {
      const pending = [];
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, data, opts) => { pending.push(() => ref.set(data, opts)); return tx; },
      };
      const result = await fn(tx);
      for (const w of pending) await w();
      return result;
    });
    txChain = run.catch(() => {});
    return run;
  }
  return {
    docs,
    writes,
    collection: (name) => collRef(name),
    getAll: async (...refs) => Promise.all(refs.map((r) => r.get())),
    runTransaction,
  };
}
function makeAdmin(users, { authFail = false, verify = {} } = {}) {
  return {
    firestore: { Timestamp: { fromMillis: ts }, FieldValue: { serverTimestamp: () => ts(NOW) } },
    auth: () => ({
      async listUsers() {
        if (authFail) throw Object.assign(new Error('auth down'), { code: 'auth/internal-error' });
        return { users, pageToken: undefined };
      },
      async verifyIdToken(token) {
        if (!Object.prototype.hasOwnProperty.call(verify, token)) throw new Error('bad token');
        return { uid: verify[token] };
      },
    }),
  };
}
function user(uid, createdMs, refreshedMs) {
  return {
    uid,
    email: `${uid}@student.example`,
    metadata: { creationTime: new Date(createdMs).toUTCString(), lastRefreshTime: refreshedMs === null ? null : new Date(refreshedMs).toUTCString() },
  };
}
function fakeFetch() {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ id: `msg_${calls.length}` }) };
  };
  fn.calls = calls;
  return fn;
}

/** A realistic fixture: 3 students, yesterday's activity, payments, ledger, trial emails. */
function seed(db) {
  const put = (path, data) => db.docs.set(path, data);
  // Trials: 2 yesterday, 7 in the 7 days before.
  put('subscriptions/aaaaaa111', { trialStartDate: ts(YS + 2 * HOUR) });
  put('subscriptions/bbbbbb222', { trialStartDate: ts(YS + 20 * HOUR) });
  for (let i = 1; i <= 7; i += 1) put(`subscriptions/old${i}`, { trialStartDate: ts(YS - i * DAY + HOUR) });
  // Gradings yesterday (and one pending upload, and one the day before — not counted).
  put('sessionRecords/aaaaaa111/records/r1', { surface: 'check-improve', status: 'graded', gradedAt: YS + HOUR });
  put('sessionRecords/aaaaaa111/records/r2', { surface: 'worksheet', status: 'pending-upload', gradedAt: YS + 2 * HOUR });
  put('sessionRecords/bbbbbb222/records/r3', { surface: 'chapter-test', status: 'graded', gradedAt: YS + 3 * HOUR });
  put('sessionRecords/bbbbbb222/records/r4', { surface: 'check-improve', status: 'partial', gradedAt: YS + 4 * HOUR });
  put('sessionRecords/cccccc333/records/r5', { surface: 'check-improve', status: 'graded', gradedAt: YS - HOUR });
  // AI cost (micro-INR): yesterday ₹30 + ₹10 + ₹2; the 7 days before total ₹70 (avg ₹10).
  put('usageLedger/aaaaaa111/days/2030-06-14', { calls: 9, costMicroInr: 30_000_000 });
  put('usageLedger/bbbbbb222/days/2030-06-14', { calls: 3, costMicroInr: 10_000_000 });
  put('usageLedger/cccccc333/days/2030-06-14', { calls: 1, costMicroInr: 2_000_000 });
  put('usageLedger/cccccc333/days/2030-06-10', { calls: 20, costMicroInr: 70_000_000 });
  // Payments.
  put('payOrders/o1', { uid: 'aaaaaa111', passType: 'month', amountPaise: 59900, status: 'paid', createdAt: new Date(YS + HOUR), paidAt: new Date(YS + HOUR + MIN) });
  put('payOrders/o2', { uid: 'bbbbbb222', passType: 'topup_49', amountPaise: 4900, status: 'paid', createdAt: new Date(YS + 5 * HOUR), paidAt: new Date(YS + 5 * HOUR + MIN) });
  put('payOrders/o3', { uid: 'cccccc333', passType: 'month', amountPaise: 59900, status: 'created', createdAt: new Date(YS + 6 * HOUR) });
  // Trial emails.
  put('trialEmailDaily/2030-06-14', { count: 2 });
  put('trialEmails/aaaaaa111', { status: 'sent', sentAt: ts(YS + 9 * HOUR) });
  put('trialEmails/bbbbbb222', { status: 'failed', failedAt: ts(YS + 9 * HOUR) });
}
const USERS = [
  user('aaaaaa111', YS + HOUR, NOW - HOUR), // signed up yesterday
  user('bbbbbb222', YS + 10 * HOUR, NOW - 2 * HOUR), // signed up yesterday
  user('cccccc333', YS - 3 * DAY, YS - HOUR / 2), // signed up in the 7 days before
  user('dddddd444', YS - 40 * DAY, YS - 30 * DAY), // dormant: never scanned
];
const telemetry = {
  snapshot: () => ({
    'fair_use.refused.premium_5h': 2,
    'fair_use.would_refuse.trial_checks': 1,
    'rate_limit.hard_block.vision': 4,
    'payments.verify.grant_failed': 0,
  }),
};

// ── Config ───────────────────────────────────────────────────────────────────────────────

test('config: OFF by default; enabled = DRY RUN; send needs dry-run 0 + key + sender + recipient', () => {
  assert.equal(resolveOpsReportConfig({}).mode, 'off');
  assert.equal(resolveOpsReportConfig({ OPS_REPORT_ENABLED: '1' }).mode, 'dry-run');
  const mis = resolveOpsReportConfig({ OPS_REPORT_ENABLED: '1', OPS_REPORT_DRY_RUN: '0' });
  assert.equal(mis.mode, 'misconfigured');
  assert.deepEqual(mis.missing, ['RESEND_API_KEY', 'OPS_REPORT_FROM', 'OPS_REPORT_TO']);
  assert.equal(resolveOpsReportConfig(SEND_ENV).mode, 'send');
  // The trial email's verified sender is reused when no OPS_REPORT_FROM is set.
  const fallback = resolveOpsReportConfig({ ...SEND_ENV, OPS_REPORT_FROM: '', TRIAL_EMAIL_FROM: 'LT <hi@lazytopper.com>' });
  assert.equal(fallback.mode, 'send');
  assert.equal(fallback.from, 'LT <hi@lazytopper.com>');
  // A malformed or list-shaped recipient is refused (the email goes to ONE address).
  assert.equal(resolveOpsReportConfig({ ...SEND_ENV, OPS_REPORT_TO: 'a@x.com,b@y.com' }).mode, 'misconfigured');
  assert.match(describeConfig(resolveOpsReportConfig({})), /OFF/);
  assert.doesNotMatch(describeConfig(resolveOpsReportConfig(SEND_ENV)), /re_test_key|owner@example/);
});

test('worst-case reads are bounded and stated: 14,806', () => {
  assert.equal(WORST_CASE_READS, 300 * 40 + 300 * 8 + 2 * 200 + 4 + 2);
  assert.equal(WORST_CASE_READS, 14806);
});

// ── 08:00 IST at the clock edges ────────────────────────────────────────────────────────

test('scheduling: 08:00 IST exactly, at the clock edges', () => {
  const at0800 = Date.parse('2030-06-15T02:30:00.000Z');
  assert.equal(isDueAt(at0800 - 1), false, '07:59:59.999 IST is not due');
  assert.equal(msUntilNextRun(at0800 - 1), 1);
  assert.equal(isDueAt(at0800), true, '08:00:00.000 IST is due');
  assert.equal(msUntilNextRun(at0800), DAY, 'the next run after 08:00 is tomorrow 08:00');
  const istMidnight = Date.parse('2030-06-14T18:30:00.000Z');
  assert.equal(isDueAt(istMidnight - 1), true, '23:59:59.999 IST is still due (catch-up)');
  assert.equal(isDueAt(istMidnight), false, '00:00 IST is a new day, not yet due');
  assert.equal(msUntilNextRun(istMidnight), 8 * HOUR);
  // UTC midnight is 05:30 IST — not due, 2.5 h to go.
  assert.equal(isDueAt(Date.parse('2030-06-15T00:00:00.000Z')), false);
  assert.equal(msUntilNextRun(Date.parse('2030-06-15T00:00:00.000Z')), 2.5 * HOUR);
});

test('schedule(): OFF arms nothing; ON arms a boot catch-up and the next 08:00 IST', () => {
  const timers = [];
  const setTimeoutFn = (fn, ms) => { timers.push(ms); return { unref() {} }; };
  const lines = [];
  const off = createOpsReporter({ env: {}, setTimeoutFn, log: (l) => lines.push(l), now: () => NOW });
  assert.equal(off.schedule(), null);
  assert.deepEqual(timers, []);
  assert.match(lines[0], /OFF/);
  const on = createOpsReporter({ env: { OPS_REPORT_ENABLED: '1' }, setTimeoutFn, log: () => {}, now: () => NOW - HOUR });
  on.schedule();
  assert.deepEqual(timers, [FIRST_RUN_DELAY_MS, HOUR]);
});

test('runScheduled before 08:00 IST does nothing at all', async () => {
  const db = makeDb();
  const fetchImpl = fakeFetch();
  const r = createOpsReporter({ env: SEND_ENV, adminFirestore: db, firebaseAdmin: makeAdmin(USERS), fetchImpl, now: () => NOW - 1, log: () => {} });
  assert.deepEqual(await r.runScheduled(), { ran: false, reason: 'not-due' });
  assert.equal(fetchImpl.calls.length, 0);
  assert.equal(db.writes.length, 0);
});

// ── The data + the report ───────────────────────────────────────────────────────────────

test('collect + build: every number from the fixture; uid prefixes only; no student email', async () => {
  const db = makeDb();
  seed(db);
  const data = await collectReportData({ adminFirestore: db, firebaseAdmin: makeAdmin(USERS), telemetry, env: {}, nowMs: NOW, uptimeSeconds: 7200 });
  assert.equal(data.reportDay, '2030-06-14');
  assert.deepEqual([data.signups.ok, data.signups.yesterday, data.signups.prev7Avg], [true, 2, 0.1]);
  assert.deepEqual([data.trials.yesterday, data.trials.prev7Avg], [2, 1]);
  assert.equal(data.gradings.total, 3, 'graded + partial; the pending upload and the day before excluded');
  assert.equal(data.gradings.pendingExcluded, 1);
  assert.deepEqual(data.gradings.bySurface['check-improve'], 2);
  assert.equal(data.aiCost.yesterdayMicro, 42_000_000);
  assert.equal(data.aiCost.prev7AvgMicro, 10_000_000);
  assert.deepEqual(data.aiCost.top.map((t) => t.uidPrefix), ['aaaaaa', 'bbbbbb', 'cccccc']);
  assert.equal(data.aiCost.studentsScanned, 3, 'the dormant account is never read');
  assert.deepEqual([data.payments.passes, data.payments.passInr, data.payments.topups, data.payments.topupInr], [1, 599, 1, 49]);
  assert.deepEqual([data.payments.ordersCreated, data.payments.ordersUnpaid], [3, 1]);
  assert.deepEqual([data.trialEmail.claimed, data.trialEmail.sent, data.trialEmail.failed], [2, 1, 1]);
  assert.deepEqual(data.sinceBoot.refused, { premium_5h: 2 });
  assert.equal(data.sinceBoot.rateLimitHardBlocks, 4);

  const rep = buildOpsReport(data);
  assert.equal(rep.subject, 'LazyTopper daily — Fri 14 Jun 2030: 2 sign-ups, 3 graded, ₹42.00 AI');
  assert.match(rep.text, /AI cost: ₹42\.00 — 7-day avg ₹10\.00/);
  assert.match(rep.text, /Top students by cost: aaaaaa ₹30\.00 · bbbbbb ₹10\.00 · cccccc ₹2\.00/);
  assert.match(rep.text, /more than 2x the 7-day average/);
  assert.match(rep.text, /1 trial email\(s\) failed yesterday/);
  for (const out of [rep.text, rep.html, rep.subject]) {
    assert.doesNotMatch(out, /aaaaaa111|@student\.example/, 'no full uid, no student email');
  }
  assert.match(rep.html, /<table/);
});

test('"couldn\'t read": a failed source prints its code and NEVER a 0', async () => {
  // Every usage-ledger read is denied; Auth is fine.
  const db = makeDb({ failPrefix: 'usageLedger', failCode: 7 });
  seed(db);
  const data = await collectReportData({ adminFirestore: db, firebaseAdmin: makeAdmin(USERS), telemetry, env: {}, nowMs: NOW, uptimeSeconds: 60 });
  assert.deepEqual([data.aiCost.ok, data.aiCost.code], [false, 'permission-denied']);
  const rep = buildOpsReport(data);
  assert.match(rep.text, /^AI cost: couldn't read \(permission-denied\)$/m);
  assert.match(rep.text, /- AI cost: couldn't read \(permission-denied\)\./, 'listed under Look at this');
  assert.doesNotMatch(rep.text, /AI cost: ₹0/);
  assert.doesNotMatch(rep.text, /Top students by cost/);
  assert.match(rep.subject, /₹\? AI$/);
  assert.doesNotMatch(rep.subject, /₹0/);
});

test('"couldn\'t read": Auth down blanks sign-ups, gradings and AI cost honestly — no 0 anywhere for them', async () => {
  const db = makeDb();
  seed(db);
  const data = await collectReportData({ adminFirestore: db, firebaseAdmin: makeAdmin(USERS, { authFail: true }), telemetry, env: {}, nowMs: NOW, uptimeSeconds: 60 });
  const rep = buildOpsReport(data);
  assert.match(rep.text, /^Sign-ups: couldn't read \(auth\/internal-error\)$/m);
  assert.match(rep.text, /^Graded sessions: couldn't read \(auth\/internal-error\)$/m);
  assert.doesNotMatch(rep.text, /^Sign-ups: 0/m);
  assert.doesNotMatch(rep.text, /^Graded sessions: 0/m);
  assert.doesNotMatch(rep.text, /0 gradings yesterday/, 'an unreadable count is not "0 gradings"');
  assert.equal(rep.subject, 'LazyTopper daily — Fri 14 Jun 2030: ? sign-ups, ? graded, ₹? AI');
  // Sources that did read still report real numbers.
  assert.match(rep.text, /^Trials started: 2 — 7-day avg 1$/m);
});

test('a real 0 IS printed as 0 and flagged ("0 gradings")', async () => {
  const db = makeDb();
  const data = await collectReportData({ adminFirestore: db, firebaseAdmin: makeAdmin(USERS), telemetry: null, env: {}, nowMs: NOW, uptimeSeconds: 60 });
  const rep = buildOpsReport(data);
  assert.match(rep.text, /^Graded sessions: 0 — none$/m);
  assert.match(rep.text, /- 0 gradings yesterday\./);
});

// ── One send per IST day; dry run; restarts ─────────────────────────────────────────────

test('two concurrent instances at 08:00 IST: exactly ONE email; a restart afterwards sends none', async () => {
  const db = makeDb();
  seed(db);
  const fetchImpl = fakeFetch();
  const mk = () => createOpsReporter({ env: SEND_ENV, adminFirestore: db, firebaseAdmin: makeAdmin(USERS), telemetry, fetchImpl, now: () => NOW, log: () => {}, uptime: () => 100 });
  const [a, b] = await Promise.all([mk().runScheduled(), mk().runScheduled()]);
  assert.equal(fetchImpl.calls.length, 1, 'one send');
  assert.equal([a, b].filter((r) => r.sent === true).length, 1);
  assert.equal([a, b].filter((r) => r.reason === 'already-claimed' || r.reason === 'already-sent').length, 1);
  const ledger = db.docs.get(`${OPS_REPORTS_COLLECTION}/2030-06-15`);
  assert.equal(ledger.status, 'sent');
  assert.deepEqual(Object.keys(ledger).sort(), ['claimedAt', 'dayKey', 'providerMessageId', 'reportDay', 'sentAt', 'status'], 'uid-free ledger');
  const call = fetchImpl.calls[0];
  assert.deepEqual(call.body.to, ['owner@example.com']);
  assert.equal(call.init.headers['Idempotency-Key'], 'ops-report-2030-06-15');
  // A restart (fresh instance, later the same IST day) finds the ledger and sends nothing.
  await createOpsReporter({ env: SEND_ENV, adminFirestore: db, firebaseAdmin: makeAdmin(USERS), fetchImpl, now: () => NOW + 3 * HOUR, log: () => {} }).runScheduled();
  assert.equal(fetchImpl.calls.length, 1);
});

test('a send that certainly did not go out (HTTP 503) releases the claim; the retry reuses the Idempotency-Key', async () => {
  const db = makeDb();
  let n = 0;
  const keys = [];
  const fetchImpl = async (url, init) => {
    n += 1;
    keys.push(init.headers['Idempotency-Key']);
    return n === 1 ? { ok: false, status: 503 } : { ok: true, status: 200, json: async () => ({ id: 'm2' }) };
  };
  const retries = [];
  const r = createOpsReporter({ env: SEND_ENV, adminFirestore: db, firebaseAdmin: makeAdmin(USERS), fetchImpl, now: () => NOW, log: () => {}, setTimeoutFn: (fn, ms) => { retries.push(ms); return {}; } });
  const first = await r.runScheduled();
  assert.equal(first.sent, false);
  assert.equal(db.docs.get(`${OPS_REPORTS_COLLECTION}/2030-06-15`).status, 'released');
  assert.deepEqual(retries, [30 * MIN]);
  const second = await r.runScheduled();
  assert.equal(second.sent, true);
  assert.deepEqual(keys, ['ops-report-2030-06-15', 'ops-report-2030-06-15']);
});

test('dry run (the enabled default) sends nothing and writes nothing', async () => {
  const db = makeDb();
  seed(db);
  const writesBefore = db.writes.length;
  const fetchImpl = fakeFetch();
  const lines = [];
  const r = createOpsReporter({ env: { ...SEND_ENV, OPS_REPORT_DRY_RUN: undefined }, adminFirestore: db, firebaseAdmin: makeAdmin(USERS), telemetry, fetchImpl, now: () => NOW, log: (l) => lines.push(l) });
  assert.equal(r.config.mode, 'dry-run');
  const out = await r.runScheduled();
  assert.deepEqual([out.ran, out.sent], [true, false]);
  assert.equal(fetchImpl.calls.length, 0);
  assert.equal(db.writes.length, writesBefore);
  assert.match(lines.join('\n'), /dry-run.*\nSubject: LazyTopper daily/);
  // Logged once per IST day, not every tick.
  await r.runScheduled();
  assert.equal(lines.filter((l) => l.includes('dry-run')).length, 1);
});

// ── The admin send-now gate (the SAME requireFirebaseAdmin as the Students page) ───────

test('admin send-now: 503 unconfigured, 401 no token, 403 non-admin, 200 admin → OPS_REPORT_TO only', async () => {
  const prev = process.env.ADMIN_FIREBASE_UIDS;
  try {
    const db = makeDb();
    seed(db);
    const firebaseAdmin = makeAdmin(USERS, { verify: { 'tok-admin': 'owner-uid', 'tok-student': 'aaaaaa111' } });
    const responses = [];
    const sendJson = (res, status, body) => responses.push({ status, body });
    const { requireFirebaseAdmin } = createAdminTelemetryRoutes({ sendJson, firebaseAdmin, telemetry: null, getTokenTelemetry: () => [] });
    const fetchImpl = fakeFetch();
    let clock = NOW;
    const r = createOpsReporter({ env: SEND_ENV, adminFirestore: db, firebaseAdmin, telemetry, fetchImpl, now: () => clock, log: () => {} });
    const req = (token) => ({ method: 'POST', url: OPS_REPORT_SEND_NOW_PATH, headers: token ? { authorization: `Bearer ${token}` } : {} });

    delete process.env.ADMIN_FIREBASE_UIDS;
    await r.handleSendNow(req('tok-admin'), {}, { sendJson, requireAdmin: requireFirebaseAdmin });
    process.env.ADMIN_FIREBASE_UIDS = 'owner-uid';
    await r.handleSendNow(req(null), {}, { sendJson, requireAdmin: requireFirebaseAdmin });
    await r.handleSendNow(req('tok-student'), {}, { sendJson, requireAdmin: requireFirebaseAdmin });
    assert.deepEqual(responses.map((x) => x.status), [503, 401, 403]);
    assert.equal(fetchImpl.calls.length, 0, 'nothing sent behind a refused gate');

    await r.handleSendNow(req('tok-admin'), {}, { sendJson, requireAdmin: requireFirebaseAdmin });
    assert.equal(responses[3].status, 200);
    assert.equal(responses[3].body.sent, true);
    assert.equal(fetchImpl.calls.length, 1);
    assert.deepEqual(fetchImpl.calls[0].body.to, ['owner@example.com']);
    assert.equal(db.docs.get(`${OPS_REPORTS_COLLECTION}/2030-06-15`), undefined, 'a test send never takes the day\'s claim');
    // A second press within a minute is refused; after it, allowed.
    await r.handleSendNow(req('tok-admin'), {}, { sendJson, requireAdmin: requireFirebaseAdmin });
    assert.equal(responses[4].status, 429);
    clock += 61 * 1000;
    await r.handleSendNow(req('tok-admin'), {}, { sendJson, requireAdmin: requireFirebaseAdmin });
    assert.equal(responses[5].status, 200);
  } finally {
    if (prev === undefined) delete process.env.ADMIN_FIREBASE_UIDS;
    else process.env.ADMIN_FIREBASE_UIDS = prev;
  }
});

test('admin send-now in dry run returns the preview and sends nothing', async () => {
  const db = makeDb();
  const fetchImpl = fakeFetch();
  const r = createOpsReporter({ env: { OPS_REPORT_ENABLED: '1' }, adminFirestore: db, firebaseAdmin: makeAdmin(USERS), fetchImpl, now: () => NOW, log: () => {} });
  const out = await r.sendNow();
  assert.equal(out.status, 200);
  assert.equal(out.body.sent, false);
  assert.match(out.body.preview, /LazyTopper daily/);
  assert.equal(fetchImpl.calls.length, 0);
});

// ── Review round 1 (#1296 HOLD): F1, F2, F3 ─────────────────────────────────────────────

test('F1: the reads run BEFORE the claim — reads that throw leave no claim, a retry is armed, and the next run sends', async () => {
  const db = makeDb();
  seed(db);
  const fetchImpl = fakeFetch();
  let throwReads = true;
  const retries = [];
  const r = createOpsReporter({
    env: SEND_ENV,
    adminFirestore: db,
    firebaseAdmin: makeAdmin(USERS),
    telemetry,
    fetchImpl,
    now: () => NOW,
    log: () => {},
    setTimeoutFn: (fn, ms) => { retries.push(ms); return {}; },
    collectData: async (args) => {
      if (throwReads) throw new Error('reads blew up mid-collection');
      return collectReportData(args);
    },
  });
  const first = await r.runScheduled();
  assert.deepEqual([first.ran, first.reason], [false, 'error']);
  assert.equal(db.docs.get(`${OPS_REPORTS_COLLECTION}/2030-06-15`), undefined, 'no claim is left behind');
  assert.equal(fetchImpl.calls.length, 0);
  assert.deepEqual(retries, [30 * MIN], 'a same-day retry is armed');
  throwReads = false;
  const second = await r.runScheduled();
  assert.equal(second.sent, true);
  assert.equal(fetchImpl.calls.length, 1);
  assert.equal(db.docs.get(`${OPS_REPORTS_COLLECTION}/2030-06-15`).status, 'sent');
  // ORDER PIN: a fresh instance whose reads throw on a day already claimed by nobody never
  // writes the ledger; one whose day is already sent never even starts the reads.
  let readsStarted = 0;
  await createOpsReporter({
    env: SEND_ENV, adminFirestore: db, firebaseAdmin: makeAdmin(USERS), fetchImpl, now: () => NOW + HOUR, log: () => {},
    collectData: async () => { readsStarted += 1; throw new Error('x'); },
  }).runScheduled();
  assert.equal(readsStarted, 0, 'a sent day costs one ledger read, not a report');
});

test('F2: a retry answered HTTP 409 (the earlier send went out) marks the day "sent (duplicate suppressed)", not failed', async () => {
  const db = makeDb();
  let n = 0;
  const fetchImpl = async () => {
    n += 1;
    return n === 1 ? { ok: false, status: 503 } : { ok: false, status: 409 };
  };
  const lines = [];
  const r = createOpsReporter({ env: SEND_ENV, adminFirestore: db, firebaseAdmin: makeAdmin(USERS), fetchImpl, now: () => NOW, log: (l) => lines.push(l), setTimeoutFn: () => ({}) });
  await r.runScheduled(); // 503 -> released
  const second = await r.runScheduled(); // 409 -> duplicate suppressed
  assert.deepEqual([second.sent, second.duplicateSuppressed], [true, true]);
  const ledger = db.docs.get(`${OPS_REPORTS_COLLECTION}/2030-06-15`);
  assert.equal(ledger.status, 'sent');
  assert.equal(ledger.duplicateSuppressed, true);
  assert.equal(ledger.error, undefined);
  assert.match(lines.join('\n'), /duplicate suppressed/);
  assert.doesNotMatch(lines.join('\n'), /send failed day=2030-06-15 code=http_409/);
  // And the day is done: no third send.
  assert.deepEqual(await r.runScheduled(), { ran: false, reason: 'done-today' });
  assert.equal(n, 2);
});

test('F3: telemetry missing, or snapshot() throwing, makes the since-start counters "couldn\'t read" — never 0', async () => {
  const db = makeDb();
  seed(db);
  const cases = [
    [null, 'telemetry-unavailable'],
    [{}, 'telemetry-unavailable'],
    [{ snapshot: () => { throw new Error('boom'); } }, 'telemetry-error'],
  ];
  for (const [tel, code] of cases) {
    const data = await collectReportData({ adminFirestore: db, firebaseAdmin: makeAdmin(USERS), telemetry: tel, env: {}, nowMs: NOW, uptimeSeconds: 60 });
    assert.deepEqual([data.sinceBoot.ok, data.sinceBoot.code], [false, code]);
    const rep = buildOpsReport(data);
    assert.match(rep.text, new RegExp(`^Fair-use refusals: couldn't read \\(${code}\\) — since server start$`, 'm'));
    assert.match(rep.text, new RegExp(`^Payment errors: couldn't read \\(${code}\\) — since server start$`, 'm'));
    assert.doesNotMatch(rep.text, /^Fair-use refusals: 0/m);
    assert.doesNotMatch(rep.text, /^Payment errors: 0/m);
    assert.match(rep.text, new RegExp(`- Since-start counters \\(fair use, payment errors\\): couldn't read \\(${code}\\)\\.`));
  }
  // CONTROL: a working snapshot with no events IS a real 0.
  const ok = buildOpsReport(await collectReportData({ adminFirestore: db, firebaseAdmin: makeAdmin(USERS), telemetry: { snapshot: () => ({}) }, env: {}, nowMs: NOW, uptimeSeconds: 60 }));
  assert.match(ok.text, /^Payment errors: 0 — since server start/m);
});
