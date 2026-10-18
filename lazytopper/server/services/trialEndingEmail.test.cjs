// TRIAL-END-1 — the trial-ending email: flag-off default, dry run, idempotency (restarts and
// two instances), the 24-48 h window, who may be emailed, honest content, unsubscribe.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createTrialEndingEmailer,
  resolveTrialEmailConfig,
  decideCandidate,
  emailEligibility,
  buildTrialEmail,
  signUnsubscribe,
  verifyUnsubscribe,
  startRangeFor,
  maskEmail,
  formatIstDate,
  formatIstTime,
  istDayKeyOf,
  TRIAL_EMAILS_COLLECTION,
  TRIAL_EMAIL_UNSUBSCRIBE_PATH,
} = require('./trialEndingEmail.cjs');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// A fixed "now": 2030-06-15 10:00 IST.
const NOW = Date.parse('2030-06-15T04:30:00.000Z');
const SECRET = 'x'.repeat(40);

// ── A tiny in-memory Firestore + Auth, just enough for this module ───────────────────────
function ts(ms) {
  return { _ms: ms, seconds: Math.floor(ms / 1000), toDate: () => new Date(ms), toMillis: () => ms };
}
function msOf(v) {
  if (v && typeof v === 'object' && typeof v._ms === 'number') return v._ms;
  if (v instanceof Date) return v.getTime();
  return null;
}
function makeDb() {
  const docs = new Map(); // path -> data
  const calls = { creates: 0 };
  function docRef(path) {
    return {
      id: path.split('/').pop(),
      async get() {
        const data = docs.get(path);
        return { exists: data !== undefined, id: path.split('/').pop(), data: () => (data === undefined ? undefined : { ...data }) };
      },
      async create(data) {
        calls.creates += 1;
        // Yield once so two parallel runners interleave, as two instances would.
        await new Promise((r) => setImmediate(r));
        if (docs.has(path)) {
          const e = new Error('6 ALREADY_EXISTS: Document already exists');
          e.code = 6;
          throw e;
        }
        docs.set(path, { ...data });
      },
      async update(data) {
        if (!docs.has(path)) throw new Error('NOT_FOUND');
        docs.set(path, { ...docs.get(path), ...data });
      },
      async set(data, opts) {
        docs.set(path, opts && opts.merge ? { ...(docs.get(path) || {}), ...data } : { ...data });
      },
      async delete() {
        docs.delete(path);
      },
      collection(name) {
        return collRef(`${path}/${name}`);
      },
    };
  }
  function collRef(path, filters = []) {
    return {
      doc: (id) => docRef(`${path}/${id}`),
      where(field, op, value) {
        return collRef(path, [...filters, { field, op, value }]);
      },
      async get() {
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
          if (ok) out.push({ id: rest, data: () => ({ ...data }) });
        }
        return { docs: out };
      },
    };
  }
  // Transactions run one at a time with their writes applied at commit — the serializable
  // outcome Firestore guarantees (it retries a transaction whose reads changed underneath it).
  let txChain = Promise.resolve();
  function runTransaction(fn) {
    const run = txChain.then(async () => {
      const writes = [];
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, data, opts) => { writes.push(() => ref.set(data, opts)); return tx; },
        update: (ref, data) => { writes.push(() => ref.update(data)); return tx; },
        delete: (ref) => { writes.push(() => ref.delete()); return tx; },
      };
      const result = await fn(tx);
      for (const w of writes) await w();
      return result;
    });
    txChain = run.catch(() => {});
    return run;
  }
  return { docs, calls, collection: (name) => collRef(name), runTransaction };
}
function makeAdmin(users, lookups = []) {
  return {
    firestore: { Timestamp: { fromMillis: ts }, FieldValue: { serverTimestamp: () => ts(NOW) } },
    auth: () => ({
      async getUser(uid) {
        lookups.push(uid);
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
const googleUser = (email) => ({ email, emailVerified: true, disabled: false, providerData: [{ providerId: 'google.com' }] });
function trialDoc(startMs, extra = {}) {
  return { tier: 'trial', plan: 'trial_7day', trialStartDate: ts(startMs), premiumSince: null, ...extra };
}
function okFetch(calls) {
  return async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ id: `msg_${calls.length}` }) };
  };
}
const SEND_ENV = {
  TRIAL_EMAIL_ENABLED: '1',
  TRIAL_EMAIL_DRY_RUN: '0',
  RESEND_API_KEY: 're_test_key',
  TRIAL_EMAIL_FROM: 'LazyTopper <hello@lazytopper.com>',
  TRIAL_EMAIL_UNSUBSCRIBE_SECRET: SECRET,
};
function setup({ env = SEND_ENV, users = { u1: googleUser('asha@example.com') }, subs = { u1: trialDoc(NOW - 5.5 * DAY) }, fetchImpl, db, now = () => NOW } = {}) {
  const theDb = db || makeDb();
  for (const [uid, d] of Object.entries(subs)) theDb.docs.set(`subscriptions/${uid}`, d);
  const logs = [];
  const fetchCalls = [];
  const lookups = [];
  const emailer = createTrialEndingEmailer({
    env,
    adminFirestore: theDb,
    firebaseAdmin: makeAdmin(users, lookups),
    fetchImpl: fetchImpl || okFetch(fetchCalls),
    now,
    log: (l) => logs.push(l),
    telemetry: { counts: {}, increment(name) { this.counts[name] = (this.counts[name] || 0) + 1; } },
  });
  return { db: theDb, logs, fetchCalls, emailer, lookups };
}

// ── Config: OFF by default ───────────────────────────────────────────────────────────────

test('flag OFF is the default: mode off, nothing scheduled, nothing read', async () => {
  const cfg = resolveTrialEmailConfig({});
  assert.equal(cfg.mode, 'off');
  const touched = [];
  const db = new Proxy({}, { get: (_t, k) => { touched.push(k); return () => { throw new Error('db touched'); }; } });
  const timers = [];
  const emailer = createTrialEndingEmailer({
    env: {},
    adminFirestore: db,
    firebaseAdmin: makeAdmin({}),
    log: () => {},
    setTimeoutFn: (...a) => timers.push(a),
    setIntervalFn: (...a) => timers.push(a),
  });
  assert.equal(emailer.schedule(), null);
  assert.equal(timers.length, 0);
  const r = await emailer.runOnce();
  assert.equal(r.ran, false);
  assert.deepEqual(touched, []);
});

test('enabled alone is a DRY RUN; sending needs DRY_RUN=0 AND key, sender and a >= 32-char secret', () => {
  assert.equal(resolveTrialEmailConfig({ TRIAL_EMAIL_ENABLED: '1' }).mode, 'dry-run');
  assert.equal(resolveTrialEmailConfig({ TRIAL_EMAIL_ENABLED: 'true', TRIAL_EMAIL_DRY_RUN: 'yes' }).mode, 'dry-run');
  const mis = resolveTrialEmailConfig({ TRIAL_EMAIL_ENABLED: '1', TRIAL_EMAIL_DRY_RUN: '0', TRIAL_EMAIL_UNSUBSCRIBE_SECRET: 'short' });
  assert.equal(mis.mode, 'misconfigured');
  assert.deepEqual(mis.missing, ['RESEND_API_KEY', 'TRIAL_EMAIL_FROM', 'TRIAL_EMAIL_UNSUBSCRIBE_SECRET']);
  assert.equal(resolveTrialEmailConfig(SEND_ENV).mode, 'send');
  assert.equal(resolveTrialEmailConfig({ ...SEND_ENV, TRIAL_EMAIL_APP_URL: 'http://evil.example' }).appUrl, 'https://www.lazytopper.com');
});

test('schedule() when enabled arms one first run and one hourly interval, both unref()d', () => {
  const armed = [];
  const fakeTimer = () => ({ unref() { this.unrefd = true; } });
  const emailer = createTrialEndingEmailer({
    env: { TRIAL_EMAIL_ENABLED: '1' },
    log: () => {},
    setTimeoutFn: (fn, ms) => { const t = fakeTimer(); armed.push({ kind: 'timeout', ms, t }); return t; },
    setIntervalFn: (fn, ms) => { const t = fakeTimer(); armed.push({ kind: 'interval', ms, t }); return t; },
  });
  emailer.schedule();
  assert.deepEqual(armed.map((a) => a.kind), ['timeout', 'interval']);
  assert.equal(armed[1].ms, HOUR);
  assert.ok(armed.every((a) => a.t.unrefd));
});

// ── Dry run ──────────────────────────────────────────────────────────────────────────────

test('dry run logs who WOULD be emailed (uid + masked address), writes nothing, sends nothing, logs each uid once', async () => {
  const { db, logs, fetchCalls, emailer } = setup({ env: { TRIAL_EMAIL_ENABLED: '1' } });
  const r1 = await emailer.runOnce();
  assert.equal(r1.wouldSend, 1);
  assert.equal(r1.sent, 0);
  assert.equal(fetchCalls.length, 0);
  assert.equal(db.docs.has(`${TRIAL_EMAILS_COLLECTION}/u1`), false);
  const line = logs.find((l) => l.includes('dry-run: would email'));
  assert.ok(line && line.includes('uid=u1') && line.includes('to=a***@example.com'));
  assert.ok(!logs.join('\n').includes('asha@example.com'), 'the full address is never logged');
  await emailer.runOnce();
  assert.equal(logs.filter((l) => l.includes('dry-run: would email')).length, 1);
});

test('misconfigured (DRY_RUN=0 but no key) behaves as a dry run', async () => {
  const { fetchCalls, db, emailer } = setup({ env: { TRIAL_EMAIL_ENABLED: '1', TRIAL_EMAIL_DRY_RUN: '0' } });
  const r = await emailer.runOnce();
  assert.equal(r.mode, 'misconfigured');
  assert.equal(r.wouldSend, 1);
  assert.equal(fetchCalls.length, 0);
  assert.equal(db.docs.size, 1);
});

// ── Idempotency ──────────────────────────────────────────────────────────────────────────

test('sends once and records it; a restart (a NEW emailer on the same database) never resends', async () => {
  const first = setup();
  const r = await first.emailer.runOnce();
  assert.equal(r.sent, 1);
  assert.equal(first.fetchCalls.length, 1);
  const ledger = first.db.docs.get(`${TRIAL_EMAILS_COLLECTION}/u1`);
  assert.equal(ledger.status, 'sent');
  assert.equal(ledger.providerMessageId, 'msg_1');
  assert.ok(first.logs.some((l) => l.startsWith('[trial-email] trial_email_sent uid=u1')));
  assert.equal(first.emailer.config.mode, 'send');

  const restarted = setup({ db: first.db, subs: {} });
  const r2 = await restarted.emailer.runOnce();
  assert.equal(r2.sent, 0);
  assert.equal(restarted.fetchCalls.length, 0);
  assert.equal(r2.skipped['already-sent'], 1);
});

test('two instances running at the same moment send exactly ONE email (the create-only claim)', async () => {
  const db = makeDb();
  const a = setup({ db });
  const b = setup({ db, subs: {} });
  const [ra, rb] = await Promise.all([a.emailer.runOnce(), b.emailer.runOnce()]);
  assert.equal(ra.sent + rb.sent, 1);
  assert.equal(a.fetchCalls.length + b.fetchCalls.length, 1);
});

test('telemetry counts trial_email_sent', async () => {
  const db = makeDb();
  const telemetry = { counts: {}, increment(n) { this.counts[n] = (this.counts[n] || 0) + 1; } };
  db.docs.set('subscriptions/u1', trialDoc(NOW - 5.5 * DAY));
  const emailer = createTrialEndingEmailer({
    env: SEND_ENV, adminFirestore: db, firebaseAdmin: makeAdmin({ u1: googleUser('a@b.co') }),
    fetchImpl: okFetch([]), now: () => NOW, log: () => {}, telemetry,
  });
  await emailer.runOnce();
  assert.equal(telemetry.counts.trial_email_sent, 1);
});

test('a 429 (certainly not sent) releases the claim and the next run sends; a 400 is recorded failed and never retried', async () => {
  let status = 429;
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(JSON.parse(init.body));
    if (status === 200) return { ok: true, status: 200, json: async () => ({ id: 'm' }) };
    return { ok: false, status, json: async () => ({}) };
  };
  const s = setup({ fetchImpl });
  const r1 = await s.emailer.runOnce();
  assert.equal(r1.failed, 1);
  assert.equal(s.db.docs.has(`${TRIAL_EMAILS_COLLECTION}/u1`), false);
  status = 200;
  const r2 = await s.emailer.runOnce();
  assert.equal(r2.sent, 1);

  const t = setup({ fetchImpl: async () => ({ ok: false, status: 400, json: async () => ({}) }) });
  await t.emailer.runOnce();
  assert.equal(t.db.docs.get(`${TRIAL_EMAILS_COLLECTION}/u1`).status, 'failed');
  const again = await t.emailer.runOnce();
  assert.equal(again.skipped['already-failed'], 1);
});

test('every send carries a stable provider Idempotency-Key and the List-Unsubscribe headers', async () => {
  const s = setup();
  await s.emailer.runOnce();
  const { init, body } = s.fetchCalls[0];
  assert.equal(init.headers['Idempotency-Key'], `trial-ending-u1-${NOW - 5.5 * DAY}`);
  assert.equal(init.headers.Authorization, 'Bearer re_test_key');
  assert.match(body.headers['List-Unsubscribe'], new RegExp(`^<https://www\\.lazytopper\\.com${TRIAL_EMAIL_UNSUBSCRIBE_PATH.replace(/\//g, '\\/')}\\?t=`));
  assert.equal(body.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.deepEqual(body.to, ['asha@example.com']);
});

test('the daily cap holds sends (unclaimed, so a later day can still send)', async () => {
  const users = {};
  const subs = {};
  for (let i = 0; i < 3; i += 1) {
    users[`u${i}`] = googleUser(`s${i}@example.com`);
    subs[`u${i}`] = trialDoc(NOW - 5.5 * DAY + i * 1000);
  }
  const s = setup({ env: { ...SEND_ENV, TRIAL_EMAIL_DAILY_CAP: '2' }, users, subs });
  const r = await s.emailer.runOnce();
  assert.equal(r.sent, 2);
  assert.equal(r.skipped['daily-cap'], 1);
  assert.equal([...s.db.docs.keys()].filter((k) => k.startsWith(`${TRIAL_EMAILS_COLLECTION}/`)).length, 2);
});

// ── Who is in the window, and who may be emailed ────────────────────────────────────────

test('window: only trials ending 24-48 h from now; premium, pass, ended and client-written starts are skipped', () => {
  assert.equal(decideCandidate(trialDoc(NOW - 5.5 * DAY), NOW).ok, true); // ends in 36 h
  assert.equal(decideCandidate(trialDoc(NOW - 5 * DAY), NOW).reason, 'outside-window'); // ends in exactly 48 h
  assert.equal(decideCandidate(trialDoc(NOW - 6 * DAY), NOW).ok, true); // ends in exactly 24 h
  assert.equal(decideCandidate(trialDoc(NOW - 4 * DAY), NOW).reason, 'outside-window'); // ends in 72 h
  assert.equal(decideCandidate(trialDoc(NOW - 6.5 * DAY), NOW).reason, 'outside-window'); // ends in 12 h
  assert.equal(decideCandidate(trialDoc(NOW - 5.5 * DAY, { tier: 'premium', plan: 'pass_month', passEnd: ts(NOW + 20 * DAY) }), NOW).reason, 'tier-premium');
  assert.equal(decideCandidate({ tier: 'trial', plan: 'trial_7day', trialStartDate: new Date(NOW - 5.5 * DAY).toISOString() }, NOW).reason, 'start-not-server-pinned');
  // The interrupted-trial shape the entitlement gate repairs is a running trial too.
  assert.equal(decideCandidate({ tier: 'free', plan: 'trial_7day', trialStartDate: ts(NOW - 5.5 * DAY) }, NOW).ok, true);
  const { loMs, hiMs } = startRangeFor(NOW);
  assert.equal(hiMs - loMs, DAY);
  assert.equal(loMs, NOW - 6 * DAY);
});

test('only email sign-ins: Google or email+password; never phone-only, disabled or Google-unverified', () => {
  assert.equal(emailEligibility(googleUser('a@b.co')).ok, true);
  assert.equal(emailEligibility({ email: 'a@b.co', emailVerified: true, providerData: [{ providerId: 'password' }] }).ok, true);
  // Review finding 2: an UNVERIFIED email+password address is never emailed.
  assert.equal(emailEligibility({ email: 'a@b.co', emailVerified: false, providerData: [{ providerId: 'password' }] }).reason, 'email-unverified');
  assert.equal(emailEligibility({ email: 'a@b.co', providerData: [{ providerId: 'password' }] }).reason, 'email-unverified');
  assert.equal(emailEligibility({ phoneNumber: '+911234567890', providerData: [{ providerId: 'phone' }] }).reason, 'no-email');
  assert.equal(emailEligibility({ email: 'a@b.co', emailVerified: true, providerData: [{ providerId: 'phone' }] }).reason, 'not-an-email-sign-in');
  assert.equal(emailEligibility({ ...googleUser('a@b.co'), disabled: true }).reason, 'disabled');
  assert.equal(emailEligibility({ ...googleUser('a@b.co'), emailVerified: false }).reason, 'email-unverified');
  assert.equal(emailEligibility(null).reason, 'no-account');
  assert.equal(maskEmail('asha@example.com'), 'a***@example.com');
});

test('runOnce skips opted-out students and phone-only accounts', async () => {
  const db = makeDb();
  db.docs.set(`${TRIAL_EMAILS_COLLECTION}/u1`, { optedOut: true });
  const s = setup({
    db,
    users: { u1: googleUser('a@b.co'), u2: { phoneNumber: '+91', providerData: [{ providerId: 'phone' }] } },
    subs: { u1: trialDoc(NOW - 5.5 * DAY), u2: trialDoc(NOW - 5.5 * DAY) },
  });
  const r = await s.emailer.runOnce();
  assert.equal(r.sent, 0);
  assert.equal(r.skipped['opted-out'], 1);
  assert.equal(r.skipped['no-email'], 1);
  assert.equal(s.fetchCalls.length, 0);
});

// ── Content ─────────────────────────────────────────────────────────────────────────────

test('content: the real end in IST, real counts, no name, no auto-charge, plans + unsubscribe links', async () => {
  const db = makeDb();
  const start = NOW - 5.5 * DAY;
  db.docs.set('sessionRecords/u1/records/ci-1', { id: 'ci-1', surface: 'check-improve', status: 'graded', gradedAt: start + HOUR });
  db.docs.set('sessionRecords/u1/records/ci-2', { id: 'ci-2', surface: 'check-improve', status: 'graded', gradedAt: start + 2 * HOUR });
  db.docs.set('sessionRecords/u1/records/ws-1', { id: 'ws-1', surface: 'worksheet', status: 'pending-upload', gradedAt: start + 3 * HOUR });
  db.docs.set('sessionRecords/u1/records/old', { id: 'old', surface: 'chapter-test', status: 'graded', gradedAt: start - DAY });
  const s = setup({ db, users: { u1: { ...googleUser('asha@example.com'), displayName: 'Asha Kumari' } } });
  await s.emailer.runOnce();
  const { body } = s.fetchCalls[0];
  const endMs = start + 7 * DAY;
  assert.equal(body.subject, `Your LazyTopper trial ends on ${formatIstDate(endMs)}`);
  assert.ok(body.text.includes(`ends on ${formatIstDate(endMs)} at ${formatIstTime(endMs)} (IST)`));
  assert.ok(body.text.includes('In your trial so far: 2 answer checks.'));
  assert.ok(!body.text.includes('test'), 'a pending upload and a pre-trial test are not counted');
  assert.ok(body.text.includes('Nothing is charged automatically'));
  assert.ok(body.text.includes('https://www.lazytopper.com/pricing'));
  assert.ok(body.text.includes(`Unsubscribe: https://www.lazytopper.com${TRIAL_EMAIL_UNSUBSCRIBE_PATH}?t=`));
  assert.ok(!body.text.includes('Asha') && !body.html.includes('Asha'), 'no name in the email');
  assert.ok(!/hurry|last chance|only \d+ (hours|left)|act now/i.test(body.text), 'no urgency copy');
  assert.ok(!/<img/i.test(body.html), 'no tracking pixel');
});

test('content: zero activity says so and offers one thing to try; unknown counts are left out, never invented', () => {
  const endMs = Date.parse('2030-06-16T18:30:00.000Z'); // 17 Jun 12:00 am IST
  const zero = buildTrialEmail({ trialEndsAtMs: endMs, counts: { checks: 0, tests: 0, practiceSets: 0 }, appUrl: 'https://www.lazytopper.com', unsubscribeUrl: 'https://x/u' });
  assert.ok(zero.text.includes("You haven't checked an answer yet. Check one before your trial ends."));
  assert.ok(zero.text.includes('Check an answer: https://www.lazytopper.com/check-improve'));
  assert.ok(zero.text.includes('Mon 17 Jun at 12:00 am (IST)'));
  const unknown = buildTrialEmail({ trialEndsAtMs: endMs, counts: null, appUrl: 'https://www.lazytopper.com', unsubscribeUrl: 'https://x/u' });
  assert.ok(!unknown.text.includes('In your trial so far'));
  assert.ok(!unknown.text.includes("haven't"));
});

test('IST formatting and day keys at the IST midnight boundary', () => {
  const justBefore = Date.parse('2030-06-15T18:29:59.000Z'); // 11:59 pm IST, 15 Jun
  const midnight = Date.parse('2030-06-15T18:30:00.000Z'); // 12:00 am IST, 16 Jun
  assert.equal(istDayKeyOf(justBefore), '2030-06-15');
  assert.equal(istDayKeyOf(midnight), '2030-06-16');
  assert.equal(formatIstTime(justBefore), '11:59 pm');
  assert.equal(formatIstTime(midnight), '12:00 am');
  assert.equal(formatIstDate(midnight), 'Sun 16 Jun');
});

// ── Unsubscribe ─────────────────────────────────────────────────────────────────────────

test('unsubscribe tokens: round-trip, tamper-proof, refuse a short secret', () => {
  const t = signUnsubscribe('u1', SECRET);
  assert.equal(verifyUnsubscribe(t, SECRET), 'u1');
  assert.equal(verifyUnsubscribe(t, 'y'.repeat(40)), null);
  assert.equal(verifyUnsubscribe(signUnsubscribe('u2', SECRET).split('.')[0] + '.' + t.split('.')[1], SECRET), null);
  assert.equal(verifyUnsubscribe(t, 'short'), null);
  assert.equal(verifyUnsubscribe('garbage', SECRET), null);
  assert.equal(verifyUnsubscribe(undefined, SECRET), null);
});

function fakeRes() {
  return {
    status: 0, headers: null, body: '',
    writeHead(s, h) { this.status = s; this.headers = h; },
    end(b) { this.body = b || ''; },
  };
}

test('unsubscribe GET shows a confirm button and writes nothing; POST records the opt-out', async () => {
  const s = setup({ subs: {} });
  const t = encodeURIComponent(signUnsubscribe('u1', SECRET));
  const url = `${TRIAL_EMAIL_UNSUBSCRIBE_PATH}?t=${t}`;
  const getRes = fakeRes();
  await s.emailer.handleUnsubscribe({ method: 'GET', url }, getRes, url);
  assert.equal(getRes.status, 200);
  assert.match(getRes.body, /<form method="post"/);
  assert.equal(getRes.headers['Cache-Control'], 'no-store');
  assert.equal(s.db.docs.has(`${TRIAL_EMAILS_COLLECTION}/u1`), false);

  const postRes = fakeRes();
  await s.emailer.handleUnsubscribe({ method: 'POST', url, resume() {} }, postRes, url);
  assert.equal(postRes.status, 200);
  assert.equal(s.db.docs.get(`${TRIAL_EMAILS_COLLECTION}/u1`).optedOut, true);
});

test('unsubscribe: an invalid token is a 400; an erased account is not re-created', async () => {
  const s = setup({ subs: {}, users: {} });
  const bad = fakeRes();
  await s.emailer.handleUnsubscribe({ method: 'POST', url: '/x?t=nope' }, bad, '/x?t=nope');
  assert.equal(bad.status, 400);
  const url = `${TRIAL_EMAIL_UNSUBSCRIBE_PATH}?t=${encodeURIComponent(signUnsubscribe('gone', SECRET))}`;
  const res = fakeRes();
  await s.emailer.handleUnsubscribe({ method: 'POST', url, resume() {} }, res, url);
  assert.equal(res.status, 200);
  assert.equal(s.db.docs.has(`${TRIAL_EMAILS_COLLECTION}/gone`), false);
});

// ── Review fixes (controller, 18 Oct 2026) ──────────────────────────────────────────────

function manyStudents(n, prefix = 's') {
  const users = {};
  const subs = {};
  for (let i = 0; i < n; i += 1) {
    users[`${prefix}${i}`] = googleUser(`${prefix}${i}@example.com`);
    subs[`${prefix}${i}`] = trialDoc(NOW - 5.5 * DAY + i * 1000);
  }
  return { users, subs };
}

test('FINDING 1: the daily cap is DURABLE — two instances together, then a restart, never pass it', async () => {
  const db = makeDb();
  const env = { ...SEND_ENV, TRIAL_EMAIL_DAILY_CAP: '2' };
  const first = manyStudents(3, 'a');
  const a = setup({ db, env, ...first });
  const b = setup({ db, env, users: first.users, subs: {} });
  const [ra, rb] = await Promise.all([a.emailer.runOnce(), b.emailer.runOnce()]);
  assert.equal(ra.sent + rb.sent, 2, 'two instances together send at most the cap');
  assert.equal(a.fetchCalls.length + b.fetchCalls.length, 2);
  const dayKey = istDayKeyOf(NOW);
  assert.equal(db.docs.get(`trialEmailDaily/${dayKey}`).count, 2);

  // A deploy restarts the process: a NEW emailer with fresh memory, a new student in the window.
  const later = manyStudents(1, 'z');
  const restarted = setup({ db, env, ...later });
  const rc = await restarted.emailer.runOnce();
  assert.equal(rc.sent, 0, 'a restart does not reset the day');
  assert.equal(rc.skipped['daily-cap'] >= 1, true);
  assert.equal(restarted.fetchCalls.length, 0);
  assert.equal(db.docs.get(`trialEmailDaily/${dayKey}`).count, 2);
});

test('FINDING 1: the cap is per IST day — the next IST day sends again', async () => {
  const db = makeDb();
  const env = { ...SEND_ENV, TRIAL_EMAIL_DAILY_CAP: '1' };
  db.docs.set(`trialEmailDaily/${istDayKeyOf(NOW)}`, { count: 1 });
  const s = setup({ db, env });
  assert.equal((await s.emailer.runOnce()).sent, 0);
  // 12 hours later is the next IST day (10:00 am -> 10:00 pm is the same day; use +16 h).
  const next = setup({ db, env, subs: { u2: trialDoc(NOW + 16 * HOUR - 5.5 * DAY) }, users: { u2: googleUser('b@example.com') }, now: () => NOW + 16 * HOUR });
  assert.notEqual(istDayKeyOf(NOW + 16 * HOUR), istDayKeyOf(NOW));
  assert.equal((await next.emailer.runOnce()).sent, 1);
});

test('FINDING 2: an unverified email+password account is never emailed (Google unverified neither); phone-only excluded', async () => {
  const s = setup({
    users: {
      pw: { email: 'typed@example.com', emailVerified: false, disabled: false, providerData: [{ providerId: 'password' }] },
      gg: { ...googleUser('g@example.com'), emailVerified: false },
      ph: { phoneNumber: '+911234567890', providerData: [{ providerId: 'phone' }] },
      ok: { email: 'ok@example.com', emailVerified: true, disabled: false, providerData: [{ providerId: 'password' }] },
    },
    subs: { pw: trialDoc(NOW - 5.5 * DAY), gg: trialDoc(NOW - 5.5 * DAY), ph: trialDoc(NOW - 5.5 * DAY), ok: trialDoc(NOW - 5.5 * DAY) },
  });
  const r = await s.emailer.runOnce();
  assert.equal(r.sent, 1);
  assert.deepEqual(s.fetchCalls.map((c) => c.body.to[0]), ['ok@example.com']);
  assert.equal(r.skipped['email-unverified'], 2);
  assert.equal(r.skipped['no-email'], 1);
});

test('FINDING 3: releasing a failed claim never erases an opt-out recorded meanwhile', async () => {
  const db = makeDb();
  const fetchImpl = async () => {
    // The student taps Unsubscribe while the send is in flight (the handler merges optedOut).
    await db.collection(TRIAL_EMAILS_COLLECTION).doc('u1').set({ optedOut: true }, { merge: true });
    return { ok: false, status: 429, json: async () => ({}) };
  };
  const s = setup({ db, fetchImpl });
  const r = await s.emailer.runOnce();
  assert.equal(r.failed, 1);
  const row = db.docs.get(`${TRIAL_EMAILS_COLLECTION}/u1`);
  assert.ok(row, 'the row (and with it the opt-out) must survive the release');
  assert.equal(row.optedOut, true);
  const again = await s.emailer.runOnce();
  assert.equal(again.sent, 0);
  assert.equal(again.skipped['opted-out'], 1);
});

test('FINDING 3: a released claim gives its daily slot back', async () => {
  const db = makeDb();
  let status = 503;
  const s = setup({ db, fetchImpl: async () => (status === 200 ? { ok: true, status: 200, json: async () => ({ id: 'm' }) } : { ok: false, status, json: async () => ({}) }) });
  await s.emailer.runOnce();
  assert.equal(db.docs.has(`${TRIAL_EMAILS_COLLECTION}/u1`), false);
  assert.equal(db.docs.get(`trialEmailDaily/${istDayKeyOf(NOW)}`).count, 0);
  status = 200;
  assert.equal((await s.emailer.runOnce()).sent, 1);
  assert.equal(db.docs.get(`trialEmailDaily/${istDayKeyOf(NOW)}`).count, 1);
});

test('FINDING 4: phone-only / no-email accounts get a skip marker and are not looked up again', async () => {
  const db = makeDb();
  const users = { ph: { phoneNumber: '+911234567890', providerData: [{ providerId: 'phone' }] } };
  const s = setup({ db, users, subs: { ph: trialDoc(NOW - 5.5 * DAY) } });
  await s.emailer.runOnce();
  const marker = db.docs.get(`${TRIAL_EMAILS_COLLECTION}/ph`);
  assert.equal(marker.status, 'skipped');
  assert.equal(marker.reason, 'no-email');
  assert.equal(marker.recheckAfterMs, null);
  assert.equal(s.lookups.length, 1);
  const again = await s.emailer.runOnce();
  assert.equal(s.lookups.length, 1, 'no second Auth lookup for a marked account');
  assert.equal(again.skipped['marked-no-email'], 1);
});

test('FINDING 4: an unverified address is re-checked after 6 h and emailed once verified; a dry run writes no marker', async () => {
  const db = makeDb();
  const users = { pw: { email: 'p@example.com', emailVerified: false, disabled: false, providerData: [{ providerId: 'password' }] } };
  let nowMs = NOW;
  const s = setup({ db, users, subs: { pw: trialDoc(NOW - 5.2 * DAY) }, now: () => nowMs });
  await s.emailer.runOnce();
  assert.equal(db.docs.get(`${TRIAL_EMAILS_COLLECTION}/pw`).reason, 'email-unverified');
  nowMs = NOW + HOUR;
  await s.emailer.runOnce();
  assert.equal(s.lookups.length, 1, 'not re-checked within 6 h');
  users.pw.emailVerified = true;
  nowMs = NOW + 7 * HOUR;
  const r = await s.emailer.runOnce();
  assert.equal(s.lookups.length, 2);
  assert.equal(r.sent, 1);
  assert.equal(db.docs.get(`${TRIAL_EMAILS_COLLECTION}/pw`).status, 'sent');

  const dry = setup({ env: { TRIAL_EMAIL_ENABLED: '1' }, users: { ph: { phoneNumber: '+91', providerData: [{ providerId: 'phone' }] } }, subs: { ph: trialDoc(NOW - 5.5 * DAY) } });
  await dry.emailer.runOnce();
  assert.equal(dry.db.docs.has(`${TRIAL_EMAILS_COLLECTION}/ph`), false, 'a dry run writes nothing, markers included');
});

// ── ADMIN-EXTEND-1 (#1249): an extension is premium, never "your trial ends" ─────────────

test('ADMIN-EXTEND-1: a pass_extension account (trial start kept, in the window) is never emailed — running or ended', async () => {
  const start = NOW - 5.5 * DAY; // the kept trial start sits inside the 24-48 h window
  const running = { tier: 'premium', plan: 'pass_extension', trialStartDate: ts(start), premiumSince: null, passEnd: ts(NOW + 5 * DAY) };
  const ended = { tier: 'premium', plan: 'pass_extension', trialStartDate: ts(start), premiumSince: null, passEnd: ts(NOW - HOUR) };
  assert.equal(decideCandidate(running, NOW).reason, 'tier-premium');
  assert.equal(decideCandidate(ended, NOW).reason, 'tier-free', 'an ended extension is free, not a trial');
  const s = setup({
    users: { ext: googleUser('ext@example.com'), old: googleUser('old@example.com') },
    subs: { ext: running, old: ended },
  });
  const r = await s.emailer.runOnce();
  assert.equal(r.candidates, 2, 'both rows are in the window query (the trial start is kept)');
  assert.equal(r.sent, 0);
  assert.equal(s.fetchCalls.length, 0);
  assert.equal(r.skipped['tier-premium'], 1);
  assert.equal(r.skipped['tier-free'], 1);
  assert.equal(s.lookups.length, 0, 'not even looked up in Auth');
});
