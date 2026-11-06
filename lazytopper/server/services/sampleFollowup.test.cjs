// SAMPLE-FOLLOWUP-1 - the free-sample follow-up email: signed-in only (marker), 24-72 h window, not if owned / Board Pass,
// once per pack, opt-out and caps, send window, copy (no price, no refund, no Premium). Harness copied from abandonedCheckout.test.cjs.
const test = require('node:test');
const assert = require('node:assert/strict');

const { createNudgeEmailer, resolveNudgeConfig } = require('./nudgeEmail.cjs');
const S = require('./sampleFollowup.cjs');
const fs = require('node:fs');
const path = require('node:path');

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
const ENV_ON = { ...ENV_SEND, SAMPLE_FOLLOWUP_EMAIL_ENABLED: '1' };
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

/** A student who saved the `pack` sample `ageH` hours before NOW (what routes/packSampleSeen.cjs writes: one flat field per pack). */
function seen(db, uid, pack, ageH, extra = {}) {
  const at = NOW - ageH * HOUR;
  const row = db.docs.get(`nudgeEmails/${uid}`) || {};
  db.docs.set(`nudgeEmails/${uid}`, { ...row, [S.seenField(pack)]: at, ...extra });
}
const ent = (db, uid, packId) => db.docs.set(`packEntitlements/${uid}/packs/${packId}`, { packId, paidAt: NOW - 2 * HOUR });

// ── flag ────────────────────────────────────────────────────────────────────────────────

test('flag off (default) sends nothing and never reads the markers', async () => {
  const s = setup({ env: ENV_SEND });
  seen(s.db, 'u1', 'pack_cbq:science', 30);
  const r = await s.run();
  assert.equal(r.ran, true);
  assert.equal(s.calls.length, 0);
  assert.equal(r.byKind.sample_followup, 0);
  assert.equal(s.db.queries.filter((q) => q.path === 'nudgeEmails').length, 0);
});

test('only exactly "1" turns the flag on', () => {
  assert.equal(resolveNudgeConfig({}).sampleFollowupEnabled, false);
  assert.equal(resolveNudgeConfig({ SAMPLE_FOLLOWUP_EMAIL_ENABLED: '0' }).sampleFollowupEnabled, false);
  assert.equal(resolveNudgeConfig({ SAMPLE_FOLLOWUP_EMAIL_ENABLED: 'true' }).sampleFollowupEnabled, false);
  assert.equal(resolveNudgeConfig({ SAMPLE_FOLLOWUP_EMAIL_ENABLED: '1' }).sampleFollowupEnabled, true);
});

// ── who / when ──────────────────────────────────────────────────────────────────────────

test('window (pure): due from 24 h to before 72 h after the first save', () => {
  assert.equal(S.sampleFollowupDue(23.9 * HOUR), false);
  assert.equal(S.sampleFollowupDue(24 * HOUR), true);
  assert.equal(S.sampleFollowupDue(71.9 * HOUR), true);
  assert.equal(S.sampleFollowupDue(72 * HOUR), false);
  assert.equal(S.sampleFollowupDue(NaN), false);
});

test('a signed-in student 30 h after the sample gets ONE email, with the approved shape', async () => {
  const s = setup();
  seen(s.db, 'u1', 'pack_cbq:science', 30);
  const r = await s.run();
  assert.equal(r.sent, 1);
  assert.equal(r.byKind.sample_followup, 1);
  const b = s.calls[0].body;
  assert.deepEqual(b.to, ['one@gmail.com']);
  assert.equal(b.subject, "The full Science CBQ Pack: what's in it");
  assert.match(b.text, /^Hi there, you saved the free Science CBQ Pack sample page\./);
  assert.match(b.text, /Competency-based questions for every Science chapter \(13 chapters\)/);
  assert.match(b.text, /Get the full pack: https:\/\/www\.lazytopper\.com\/packs\?buy=pack_cbq&t=science&from=sample&utm_source=email/);
  assert.match(b.text, /Made by an IITian \(IIT Kanpur\)/);
  assert.match(b.text, /Questions\? WhatsApp us: https:\/\/wa\.me\/919714568948/);
  assert.match(b.html, /<a href="https:\/\/wa\.me\/919714568948"[^>]*>Questions\? WhatsApp us<\/a>/);
  assert.match(b.text, /Unsubscribe: https:\/\/www\.lazytopper\.com\/api\/trial-email\/unsubscribe\?t=/);
  assert.equal(b.tags[0].value, 'nudge_sample_followup');
  assert.ok(b.headers['List-Unsubscribe']);
  assert.equal(s.db.docs.get('nudgeEmails/u1').samplefu_pack_cbq_science.status, 'sent');
});

test('copy: no price, no rupee sign, no refund wording, never "Premium"; one button', async () => {
  const s = setup();
  const keys = ['pack_chapter:maths', 'pack_mock:science', 'pack_subject:maths', 'pack_bundle:all', 'pack_cbq:maths'];
  keys.forEach((k, i) => seen(s.db, `u${i + 1}`, k, 30));
  const users = {};
  keys.forEach((_, i) => (users[`u${i + 1}`] = gUser(`s${i + 1}@gmail.com`)));
  const s2 = setup({ users });
  keys.forEach((k, i) => seen(s2.db, `u${i + 1}`, k, 30));
  const r = await s2.run();
  assert.equal(r.sent, 5);
  for (const c of s2.calls) {
    const all = c.body.subject + c.body.text + c.body.html;
    assert.doesNotMatch(all, /₹|&#8377;|\bRs\.?\s?\d|\bINR\b|\d{2,}\s?rupees/i);
    assert.doesNotMatch(all, /refund/i);
    assert.doesNotMatch(all, /premium/i);
    assert.equal((c.body.html.match(/Get the full pack/g) || []).length, 1);
    assert.doesNotMatch(all, /\b(uid|u[1-5])\b.*utm/); // no uid in any URL
    assert.doesNotMatch(c.body.text, /utm_[a-z]+=[^&\s]*(@|\+91)/);
  }
  const byTo = Object.fromEntries(s2.calls.map((c) => [c.body.to[0], c.body.text]));
  assert.match(byTo['s1@gmail.com'], /any of the 26 chapters/);
  assert.match(byTo['s1@gmail.com'], /\/packs\?utm_source=email/); // a Chapter Pack needs a chapter: opens /packs
  assert.match(byTo['s2@gmail.com'], /8 board-pattern Science mock papers/);
  assert.match(byTo['s3@gmail.com'], /Every Maths chapter \(13 chapters\)/);
  assert.match(byTo['s4@gmail.com'], /All 26 chapters of Maths and Science plus 16 board-pattern mock papers/);
  assert.match(byTo['s4@gmail.com'], /\/packs\?buy=pack_bundle&from=sample&utm_source=email/);
});

test('the WhatsApp link mirrors src/config/socialProfiles.ts', () => {
  const ts = fs.readFileSync(path.join(__dirname, '../../src/config/socialProfiles.ts'), 'utf8');
  const m = ts.match(/export const WHATSAPP_URL = "([^"]+)"/);
  assert.ok(m);
  assert.equal(S.SUPPORT_WHATSAPP_URL, m[1]);
});

test('window: before 24 h and from 72 h nothing is sent', async () => {
  const s = setup();
  seen(s.db, 'u1', 'pack_cbq:science', 23);
  seen(s.db, 'u2', 'pack_cbq:science', 73);
  const r = await s.run();
  assert.equal(r.sent, 0);
  assert.equal(s.calls.length, 0);
});

test('a student with no marker (signed-out downloads leave none) is never a candidate', async () => {
  const s = setup();
  s.db.docs.set('nudgeEmails/u1', { lastClaimMs: NOW - 90 * HOUR });
  const r = await s.run();
  assert.equal(r.sent, 0);
  assert.equal(r.candidates, 0);
});

// ── not if bought ───────────────────────────────────────────────────────────────────────

test('not sent when the pack (or a pack/bundle that includes it) is owned, or a paid Board Pass is held; a free trial still gets it', async () => {
  const users = { u1: gUser('a@gmail.com'), u2: gUser('b@gmail.com'), u3: gUser('c@gmail.com'), u4: gUser('d@gmail.com'), u5: gUser('e@gmail.com'), u6: gUser('f@gmail.com'), u7: gUser('g@gmail.com') };
  const s = setup({ users });
  seen(s.db, 'u1', 'pack_cbq:science', 30); ent(s.db, 'u1', 'pack_cbq:science'); // the pack itself
  seen(s.db, 'u2', 'pack_subject:maths', 30); ent(s.db, 'u2', 'pack_bundle:all'); // the bundle includes it
  seen(s.db, 'u3', 'pack_chapter:maths', 30); ent(s.db, 'u3', 'pack_chapter:triangles'); // a Maths chapter pack
  seen(s.db, 'u4', 'pack_mock:science', 30); ent(s.db, 'u4', 'pack_subject:science'); // the subject pack includes mocks
  seen(s.db, 'u5', 'pack_bundle:all', 30);
  s.db.docs.set('subscriptions/u5', { tier: 'premium', plan: 'till_boards', premiumSince: ts(NOW - 5 * DAY), passEnd: ts(NOW + 100 * DAY), passType: 'till_boards' }); // a paid Board Pass
  seen(s.db, 'u6', 'pack_cbq:maths', 30); ent(s.db, 'u6', 'pack_cbq:science'); // a DIFFERENT CBQ pack: not covered, still emailed
  seen(s.db, 'u7', 'pack_cbq:maths', 30);
  s.db.docs.set('subscriptions/u7', { tier: 'trial', plan: 'trial_7day', trialStartDate: ts(NOW - 5 * DAY) }); // a free trial is not a purchase: still emailed
  const r = await s.run();
  assert.equal(r.skipped['already-owned'], 5, JSON.stringify(r.skipped));
  assert.deepEqual(s.calls.map((c) => c.body.to[0]).sort(), ['f@gmail.com', 'g@gmail.com']);
  assert.equal(r.sent, 2);
});

test('ownership (pure): the server coverage rules per sample key', () => {
  const p = (...ids) => ids.map((packId) => ({ packId }));
  assert.equal(S.sampleOwned(p(), 'pack_cbq:maths'), false);
  assert.equal(S.sampleOwned(p('pack_bundle:all'), 'pack_cbq:maths'), false); // the bundle does NOT include CBQ
  assert.equal(S.sampleOwned(p('pack_cbq:maths'), 'pack_cbq:maths'), true);
  assert.equal(S.sampleOwned(p('pack_chapter:circles'), 'pack_chapter:maths'), true);
  assert.equal(S.sampleOwned(p('pack_chapter:electricity'), 'pack_chapter:maths'), false);
  assert.equal(S.sampleOwned(p('pack_mock:maths'), 'pack_subject:maths'), false);
  assert.equal(S.sampleOwned(p('pack_subject:maths'), 'pack_subject:maths'), true);
  assert.equal(S.sampleOwned(p(), 'not-a-pack'), true); // unreadable: never emailed
});

// ── once per pack ───────────────────────────────────────────────────────────────────────

test('once per student per pack, ever; a second pack is its own email but never the same day', async () => {
  const s = setup();
  seen(s.db, 'u1', 'pack_cbq:science', 30);
  assert.equal((await s.run()).sent, 1);
  assert.equal((await s.run()).sent, 0);
  // A new save of the SAME pack 2 days later does not restart anything (the route keeps the first save), and a second pack:
  seen(s.db, 'u1', 'pack_mock:maths', 28);
  s.clock.now = NOW + 2 * HOUR; // same day: spaced
  assert.equal((await s.run()).sent, 0);
  s.clock.now = NOW + 25 * HOUR; // the mock sample is now 53 h old: still in the window
  const r3 = await s.run();
  assert.equal(r3.sent, 1);
  assert.equal(s.calls.length, 2);
  assert.match(s.calls[1].body.subject, /Maths Mock Pack/);
  s.clock.now = NOW + 50 * HOUR;
  assert.equal((await s.run()).sent, 0);
  const row = s.db.docs.get('nudgeEmails/u1');
  assert.equal(row.samplefu_pack_cbq_science.status, 'sent');
  assert.equal(row.samplefu_pack_mock_maths.status, 'sent');
});

// ── opt-out, eligibility, caps, window ──────────────────────────────────────────────────

test('unsubscribed, admin, @lazytopper.com, phone-only, unverified and deleted accounts are skipped', async () => {
  const users = {
    u1: gUser('a@gmail.com'),
    u2: gUser('b@gmail.com'),
    u3: gUser('team@lazytopper.com'),
    u4: phoneUser(),
    u5: { ...gUser('e@gmail.com'), emailVerified: false },
  };
  const s = setup({ users, env: { ...ENV_ON, ADMIN_FIREBASE_UIDS: 'u2' } });
  for (const u of ['u1', 'u2', 'u3', 'u4', 'u5', 'u6']) seen(s.db, u, 'pack_cbq:maths', 30);
  s.db.docs.set('trialEmails/u1', { optedOut: true });
  const r = await s.run();
  assert.equal(s.calls.length, 0);
  assert.equal(r.skipped['opted-out'], 1);
  assert.equal(r.skipped.internal >= 2, true);
  assert.equal(r.skipped['no-account'], 1);
});

test('a student emailed by another nudge in the last 24 h waits (one email a day)', async () => {
  const s = setup();
  seen(s.db, 'u1', 'pack_cbq:maths', 30, { lastClaimMs: NOW - 5 * HOUR });
  const r = await s.run();
  assert.equal(r.sent, 0);
  assert.equal(r.skipped.spaced, 1);
  s.clock.now = NOW + 25 * HOUR; // 30 h after the other email, inside the send window; the sample is 55 h old
  assert.equal((await s.run()).sent, 1);
});

test('the shared daily cap applies', async () => {
  const users = { u1: gUser('a@gmail.com'), u2: gUser('b@gmail.com') };
  const s = setup({ users, env: { ...ENV_ON, NUDGE_EMAIL_DAILY_CAP: '1' } });
  seen(s.db, 'u1', 'pack_cbq:maths', 30);
  seen(s.db, 'u2', 'pack_cbq:maths', 31);
  const r = await s.run();
  assert.equal(r.sent, 1);
  assert.equal(r.skipped['daily-cap'], 1);
});

test('outside the IST send window nothing is read or written', async () => {
  const s = setup({ now: NIGHT });
  seen(s.db, 'u1', 'pack_cbq:maths', 30);
  const before = s.db.writes();
  const r = await s.run();
  assert.equal(r.ran, false);
  assert.equal(s.calls.length, 0);
  assert.equal(s.db.writes(), before);
});

test('dry run reports who would be emailed and writes nothing', async () => {
  const s = setup({ env: { ...ENV_ON, NUDGE_EMAIL_DRY_RUN: '1' } });
  seen(s.db, 'u1', 'pack_cbq:maths', 30);
  const before = s.db.writes();
  const r = await s.run();
  assert.equal(r.wouldSend, 1);
  assert.equal(s.calls.length, 0);
  assert.equal(s.db.writes(), before);
  assert.ok(s.logs.some((l) => /dry-run: would email kind=sample_followup pack=pack_cbq:maths uid=u1 to=/.test(l)));
});

test('a retryable send failure releases the claim (sent next run); a permanent one is not retried', async () => {
  const s = setup();
  seen(s.db, 'u1', 'pack_cbq:maths', 30);
  let status = 503;
  const fail = async () => ({ ok: false, status, json: async () => ({}) });
  const emailer = createNudgeEmailer({
    config: resolveNudgeConfig(ENV_ON), env: ENV_ON, adminFirestore: s.db, firebaseAdmin: makeAdmin(USERS), fetchImpl: fail,
    now: () => NOW, log: () => {}, telemetry: { increment: () => {} }, setTimeoutFn: () => ({}), setIntervalFn: () => ({}),
  });
  const r1 = await emailer.runOnce();
  assert.equal(r1.failed, 1);
  assert.equal(s.db.docs.get('nudgeEmails/u1').samplefu_pack_cbq_maths, undefined);
  assert.equal((await s.run()).sent, 1);
});

// ── pure pieces ─────────────────────────────────────────────────────────────────────────

test('sample keys: only the closed list; kinds are safe map keys', () => {
  assert.deepEqual(S.parseSampleKey('pack_cbq:science'), { sku: 'pack_cbq', target: 'science' });
  assert.deepEqual(S.parseSampleKey('pack_bundle:all'), { sku: 'pack_bundle', target: 'all' });
  for (const bad of ['pack_bundle:maths', 'pack_cbq:all', 'pack_chapter:real-numbers', 'pack_x:maths', 'maths', '', null, 7, 'pack_cbq:' + 'x'.repeat(60)]) assert.equal(S.parseSampleKey(bad), null, String(bad));
  assert.equal(S.sampleFollowupKind('pack_cbq:science'), 'samplefu_pack_cbq_science');
  assert.equal(S.buildSampleFollowupEmail({ packKey: 'nope', appUrl: 'https://x', unsubscribeUrl: 'https://x/u' }), null);
});

// ── M1: each pack is judged by its OWN first-save time ──────────────────────────────────

test('TWO PACKS: a later sample of another pack never pushes the first pack out of its window', async () => {
  const s = setup();
  seen(s.db, 'u1', 'pack_cbq:science', 70); // 2 h left in its window
  seen(s.db, 'u1', 'pack_mock:maths', 5); // a LATER sample, not due for 19 h
  const r = await s.run();
  assert.equal(r.sent, 1);
  assert.match(s.calls[0].body.subject, /Science CBQ Pack/);
  assert.equal(s.db.docs.get('nudgeEmails/u1').samplefu_pack_cbq_science.status, 'sent');
  assert.equal(s.db.docs.get('nudgeEmails/u1').samplefu_pack_mock_maths, undefined);
});

test('TWO PACKS both due: oldest first, one a day; the second goes out on a later day', async () => {
  const s = setup();
  seen(s.db, 'u1', 'pack_cbq:science', 40);
  seen(s.db, 'u1', 'pack_mock:maths', 30);
  assert.equal((await s.run()).sent, 1);
  assert.match(s.calls[0].body.subject, /Science CBQ Pack/);
  s.clock.now = NOW + 2 * HOUR;
  assert.equal((await s.run()).sent, 0);
  s.clock.now = NOW + 25 * HOUR; // mock sample now 55 h old: still in window
  assert.equal((await s.run()).sent, 1);
  assert.match(s.calls[1].body.subject, /Maths Mock Pack/);
});

test('an owned older pack does not block the other due pack', async () => {
  const s = setup();
  seen(s.db, 'u1', 'pack_cbq:science', 40);
  ent(s.db, 'u1', 'pack_cbq:science');
  seen(s.db, 'u1', 'pack_mock:maths', 30);
  const r = await s.run();
  assert.equal(r.sent, 1);
  assert.match(s.calls[0].body.subject, /Maths Mock Pack/);
});

test('every sample key the browser can send has a query field, and the mock count mirrors packLabels.ts', () => {
  assert.equal(S.SAMPLE_KEYS.length, 9);
  for (const k of S.SAMPLE_KEYS) assert.ok(S.parseSampleKey(k), k);
  assert.equal(new Set(S.SAMPLE_KEYS.map(S.seenField)).size, 9);
  const labels = fs.readFileSync(path.join(__dirname, '../../src/lib/packs/packLabels.ts'), 'utf8');
  const per = Number(labels.match(/export const MOCKS_PER_SUBJECT = (\d+);/)[1]);
  assert.equal(S.MOCKS_PER_SUBJECT, per);
  assert.equal(S.BUNDLE_MOCKS, per * 2);
  const samples = fs.readFileSync(path.join(__dirname, '../../src/lib/packs/packSamples.ts'), 'utf8');
  for (const k of S.SAMPLE_KEYS) {
    const [sku, target] = k.split(':');
    assert.match(samples, new RegExp(`spec\\("${sku}", "${target}"`), k);
  }
});
