/**
 * fairUse.thirtyDay.test.cjs — CAP-30DAY guards: the rolling 30-IST-day Premium rupee cap.
 *
 * Run: `node --test server/services/fairUse.thirtyDay.test.cjs`
 * Wired into `lazytopper` test:matrix:all as `test:server:fair-use-30day`.
 *
 * Ruling (owner + cofounder, board 16:38Z item 2; NO-DEFAULT amendment 19:17Z: unset / empty /
 * invalid = NO 30-day limit, zero behaviour change): env FAIR_USE_PREMIUM_30DAY_INR, resolved
 * like the 5-hour / day / week caps; rolling 30 IST days on the SAME day-bucket mechanism as
 * the week; at the cap -> 429 { error: "usage_limit", window: "thirtyDay", resetAt }, checked
 * BEFORE the model call; /api/usage/me gains thirtyDayPct + resets.thirtyDay (additive);
 * trial untouched.
 *
 * CLOCK: every test injects `now` (a fixed instant); nothing here reads the real clock.
 *
 * MUTATIONS this file was verified against (each alone, RED, restored):
 *   M30-1  premiumState(): sum the 30-day window over 7 days     -> "30-day sum" RED
 *   M30-2  premiumState(): drop the thirtyDay atCap check        -> "refuses at the limit" RED
 *   M30-3  resolveLimits(): ignore FAIR_USE_PREMIUM_30DAY_INR    -> "env sets the cap" RED
 *   M30-4  windowDayKeysFor(): premium reads 7 days              -> "premium read covers 30" RED
 *   M30-5  windowDayKeysFor(): trial reads 30 days               -> "trial untouched" RED
 *   M30-6  unset -> a ₹1,140 default (the pre-amendment build)   -> "unset never refuses" + "unset no bar" RED
 *   M30-7  premiumState(): send thirtyDayPct even when OFF       -> "unset no bar" RED
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  createFairUse,
  decide,
  premiumState,
  resolveLimits,
  windowDayKeys,
  windowDayKeysFor,
  DEFAULT_LIMITS,
  LIMIT_ENV,
  THIRTY_DAYS,
  GRADE_WORKSHEET_PATH,
  CHECK_SOLUTION_PATH,
} = require('./fairUse.cjs');
const { istDayKey } = require('./rateLimiter.cjs');

const DAY = 86400000;
const INR = 1e6;
// 11:30 IST on an IST day (06:00Z). Fixed instant, never the real clock.
const NOW = Date.UTC(2026, 8, 27, 6, 0, 0);
const dayOf = (offsetDays, base = NOW) => istDayKey(base - offsetDays * DAY);
/** The IST midnight that starts the IST day `offsetDays` before `base`, as epoch ms. */
const IST = 5.5 * 3600000;
const istDayStart = (offsetDays, base = NOW) => Math.floor((base - offsetDays * DAY + IST) / DAY) * DAY - IST;

const ENFORCED = Object.freeze({ FAIR_USE_ENFORCE: '1' });

/** Days map from { offset: rupees }. */
function ledgerDays(spend, base = NOW) {
  const m = new Map();
  for (const [off, inr] of Object.entries(spend)) m.set(dayOf(Number(off), base), { costMicroInr: inr * INR });
  return m;
}

/** Spread rupees across the 30-day window: `perDay` on each of offsets [from..to]. */
function spread(from, to, perDay) {
  const out = {};
  for (let k = from; k <= to; k += 1) out[k] = perDay;
  return out;
}

/* ── Limits ───────────────────────────────────────────────────────────────── */

const SET_400 = Object.freeze({ FAIR_USE_PREMIUM_30DAY_INR: '400' });

test('CAP-30DAY · the env name is exact; NO default: unset / empty / invalid -> the window is OFF (null)', () => {
  assert.equal(LIMIT_ENV.premiumThirtyDayInr, 'FAIR_USE_PREMIUM_30DAY_INR');
  assert.equal(DEFAULT_LIMITS.premiumThirtyDayInr, null);
  for (const v of [undefined, '', '   ', 'junk', '0', '-5', 'NaN', 'Infinity']) {
    const env = v === undefined ? {} : { FAIR_USE_PREMIUM_30DAY_INR: v };
    assert.equal(resolveLimits(env).premium.thirtyDayMicroInr, null, `env ${JSON.stringify(v)} must be OFF`);
  }
});

// MUTATION M30-3 target.
test('CAP-30DAY · the env sets the cap (owner go-live value 400)', () => {
  assert.equal(resolveLimits(SET_400).premium.thirtyDayMicroInr, 400 * INR);
  const both = resolveLimits(SET_400).premium;
  const base = resolveLimits({}).premium;
  assert.equal(both.weekMicroInr, base.weekMicroInr);
  assert.equal(both.dayMicroInr, base.dayMicroInr);
  assert.equal(both.fiveHourMicroInr, base.fiveHourMicroInr);
});

// MUTATION M30-6 target.
test('CAP-30DAY · unset -> NEVER refuses on the 30-day window, even with huge spend', () => {
  const limits = resolveLimits({});
  // ₹110,000 across days 8..29: outside the week, so only a 30-day window could refuse.
  const huge = ledgerDays(spread(8, 29, 5000));
  const d = decide({ tier: 'premium', surface: 'check-improve', questionCount: 1, days: huge, nowMs: NOW, limits });
  assert.equal(d.allowed, true);
  assert.equal(premiumState(huge, NOW, limits).atCap, null);
  // CONTROL: the SAME spend with the env set -> refused on thirtyDay.
  const on = decide({ tier: 'premium', surface: 'check-improve', questionCount: 1, days: huge, nowMs: NOW, limits: resolveLimits(SET_400) });
  assert.equal(on.allowed, false);
  assert.equal(on.body.window, 'thirtyDay');
  // Unset, the shorter caps decide exactly as before: a full week is still 'week'.
  const week = decide({ tier: 'premium', surface: 'check-improve', questionCount: 1, days: ledgerDays({ 1: 90 }), nowMs: NOW, limits });
  assert.equal(week.body.window, 'week');
});

// MUTATION M30-6 / M30-7 target.
test('CAP-30DAY · unset -> the usage view has NO thirtyDayPct / resets.thirtyDay key (no bar), exactly the old shape', () => {
  const view = premiumState(ledgerDays({ 0: 19, 1: 23, 20: 58 }), NOW, resolveLimits({})).view;
  assert.deepEqual(Object.keys(view).sort(), ['dayPct', 'fiveHourPct', 'resets', 'weekPct']);
  assert.deepEqual(Object.keys(view.resets).sort(), ['day', 'fiveHour', 'week']);
  // CONTROL: set -> both keys present.
  const onView = premiumState(ledgerDays({ 0: 19, 1: 23, 20: 58 }), NOW, resolveLimits(SET_400)).view;
  assert.equal(onView.thirtyDayPct, 25);
  assert.ok('thirtyDay' in onView.resets);
});

/* ── The 30-day sum ───────────────────────────────────────────────────────── */

// MUTATION M30-1 target.
test('CAP-30DAY · 30-day sum covers all 30 IST day documents (today + 29 before), and not the 31st', () => {
  const limits = resolveLimits(SET_400);
  // ₹10 on each of the 30 days in the window = ₹300 = 75 %; ₹1000 on day 30 (outside) is ignored.
  const days = ledgerDays({ ...spread(0, 29, 10), 30: 1000 });
  const st = premiumState(days, NOW, limits);
  assert.equal(st.view.thirtyDayPct, 75);
  // The oldest in-window day alone is counted (days 8..29 are outside the week).
  const oldOnly = premiumState(ledgerDays({ 29: 100 }), NOW, limits);
  assert.equal(oldOnly.view.thirtyDayPct, 25);
  assert.equal(oldOnly.view.weekPct, 0, 'day 29 is outside the week window');
});

/* ── The cap ──────────────────────────────────────────────────────────────── */

// MUTATION M30-2 target.
test('CAP-30DAY · refuses AT the limit with 429 usage_limit / window thirtyDay / resetAt; one rupee under is served', () => {
  const limits = resolveLimits(SET_400);
  // ₹400 spread over days 8..27 (₹20 each): outside the week, so ONLY the 30-day cap is reached.
  const at = decide({ tier: 'premium', surface: 'check-improve', questionCount: 1, days: ledgerDays(spread(8, 27, 20)), nowMs: NOW, limits });
  assert.equal(at.allowed, false);
  assert.equal(at.status, 429);
  assert.equal(at.rule, 'premium_thirty_day');
  assert.equal(at.body.error, 'usage_limit');
  assert.equal(at.body.window, 'thirtyDay');
  assert.equal(typeof at.body.resetAt, 'string');
  assert.deepEqual(Object.keys(at.body).sort(), ['error', 'resetAt', 'window']);

  // CONTROL: ₹399 -> served (a request may overrun by its own cost, never more).
  const under = ledgerDays({ ...spread(8, 26, 20), 27: 19 });
  assert.equal(decide({ tier: 'premium', surface: 'check-improve', questionCount: 1, days: under, nowMs: NOW, limits }).allowed, true);
});

test('CAP-30DAY · longest window first: 30-day and week both full -> the 30-day window is reported', () => {
  const limits = resolveLimits(SET_400);
  const d = decide({ tier: 'premium', surface: 'check-improve', questionCount: 1, days: ledgerDays({ 1: 450 }), nowMs: NOW, limits });
  assert.equal(d.body.window, 'thirtyDay');
  // CONTROL: only the week full -> week, as before.
  const w = decide({ tier: 'premium', surface: 'check-improve', questionCount: 1, days: ledgerDays({ 1: 90 }), nowMs: NOW, limits });
  assert.equal(w.body.window, 'week');
});

test('CAP-30DAY · resetAt is the IST midnight the deciding day leaves the 30-day window, across IST midnight', () => {
  const limits = resolveLimits(SET_400);
  // ₹300 on day 29 + ₹100 on day 10: at the cap. Dropping day 29 frees room -> it leaves at
  // the IST midnight 30 days after its own start, i.e. the start of TOMORROW (IST).
  const days = ledgerDays({ 29: 300, 10: 100 });
  const st = premiumState(days, NOW, limits);
  assert.equal(st.atCap, 'thirtyDay');
  const expected = new Date(istDayStart(29) + THIRTY_DAYS * DAY).toISOString();
  assert.equal(st.view.resets.thirtyDay, expected);
  assert.equal(expected, new Date(istDayStart(-1)).toISOString(), 'day 29 leaves at the next IST midnight');
  assert.ok(expected.endsWith('T18:30:00.000Z'), 'an IST midnight is 18:30Z');

  // ACROSS IST MIDNIGHT: one minute before the boundary still at the cap; one minute after,
  // day 29 has left (it is now day 30) and the student is served.
  const boundary = istDayStart(-1);
  const before = boundary - 60000;
  const after = boundary + 60000;
  const daysFixed = new Map([[dayOf(29), { costMicroInr: 300 * INR }], [dayOf(10), { costMicroInr: 100 * INR }]]);
  assert.equal(premiumState(daysFixed, before, limits).atCap, 'thirtyDay');
  assert.equal(premiumState(daysFixed, after, limits).atCap, null);
  assert.equal(premiumState(daysFixed, after, limits).view.thirtyDayPct, 25);

  // Nothing counted -> no reset invented.
  assert.equal(premiumState(new Map(), NOW, limits).view.resets.thirtyDay, null);
});

/* ── The ledger read ──────────────────────────────────────────────────────── */

// MUTATION M30-4 / M30-5 targets.
test('CAP-30DAY · premium reads 30 day documents only when ON; unset premium and trial read 7 (unchanged)', () => {
  const on = resolveLimits(SET_400);
  const p = windowDayKeysFor('premium', NOW, on);
  assert.equal(p.length, 30);
  assert.equal(p[0], dayOf(29));
  assert.equal(p[29], dayOf(0));
  assert.deepEqual(windowDayKeysFor('premium', NOW, resolveLimits({})), windowDayKeys(NOW), 'unset: no extra reads');
  assert.deepEqual(windowDayKeysFor('trial', NOW, on), windowDayKeys(NOW));
  assert.equal(windowDayKeys(NOW).length, 7);
});

/* ── Route boundary + /api/usage/me (in-process rig) ──────────────────────── */

function fakeLedger(daysByKey) {
  const reads = [];
  return {
    reads,
    trialWrites: [],
    async readDays(uid, keys) {
      reads.push(keys);
      const m = new Map();
      for (const k of keys) m.set(k, daysByKey[k] || {});
      return m;
    },
    recordTrialUse(uid, counts) { this.trialWrites.push({ uid, counts }); },
  };
}

function fakeRes() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.sent = null;
  return res;
}

function rig({ tier, days = {}, env = ENFORCED }) {
  const ledger = fakeLedger(days);
  const fu = createFairUse({
    tierOf: async () => tier,
    ledger,
    env,
    now: () => NOW,
    readJson: async (req) => req.__body || {},
    resolveFirestore: () => null,
    verifiedCaller: { resolveVerifiedUid: async () => 'stu-1' },
    sendJson: (res, status, body) => { res.sent = { status, body }; },
  });
  return { fu, ledger };
}

const keyed = (spend) => Object.fromEntries(Object.entries(spend).map(([off, inr]) => [dayOf(Number(off)), { costMicroInr: inr * INR }]));

test('CAP-30DAY · route boundary: a premium grade at the 30-day cap is refused 429 BEFORE the handler, reading 30 days', async () => {
  const r = rig({ tier: 'premium', days: keyed(spread(8, 27, 20)), env: { ...ENFORCED, FAIR_USE_PREMIUM_30DAY_INR: '400' } });
  const res = fakeRes();
  const answered = await r.fu.applyToRequest({ headers: {} }, res, CHECK_SOLUTION_PATH, 'stu-1');
  assert.equal(answered, true);
  assert.equal(res.sent.status, 429);
  assert.equal(res.sent.body.window, 'thirtyDay');
  assert.equal(r.ledger.reads[0].length, 30);

  // Unset 30-day env, enforced, huge spend outside the week: served, and 7 days read.
  const off = rig({ tier: 'premium', days: keyed(spread(8, 29, 5000)) });
  const offRes = fakeRes();
  assert.equal(await off.fu.applyToRequest({ headers: {} }, offRes, CHECK_SOLUTION_PATH, 'stu-1'), false);
  assert.equal(offRes.sent, null);
  assert.equal(off.ledger.reads[0].length, 7);

  // Dark (FAIR_USE_ENFORCE unset): served, as every other window.
  const dark = rig({ tier: 'premium', days: keyed(spread(8, 27, 20)), env: { FAIR_USE_PREMIUM_30DAY_INR: '400' } });
  const dres = fakeRes();
  assert.equal(await dark.fu.applyToRequest({ headers: {} }, dres, CHECK_SOLUTION_PATH, 'stu-1'), false);
  assert.equal(dres.sent, null);
});

test('CAP-30DAY · trial grading still reads 7 days and is decided exactly as before', async () => {
  const r = rig({ tier: 'trial', days: {} });
  const res = fakeRes();
  const req = { headers: { 'x-lazytopper-surface': 'check-improve' }, __body: { worksheetId: 'w', questions: [{ qNumber: 1, questionText: 'q' }] } };
  assert.equal(await r.fu.applyToRequest(req, res, GRADE_WORKSHEET_PATH, 'stu-1'), false);
  assert.equal(r.ledger.reads[0].length, 7);
});

test('CAP-30DAY · /api/usage/me premium view: thirtyDayPct + resets.thirtyDay, additive, never rupees', async () => {
  const r = rig({ tier: 'premium', days: keyed({ 0: 19, 1: 23, 20: 58 }), env: { ...ENFORCED, FAIR_USE_PREMIUM_30DAY_INR: '400' } });
  const res = fakeRes();
  await r.fu.handleUsageMe({ headers: {} }, res);
  assert.equal(res.sent.status, 200);
  const p = res.sent.body.premium;
  // Every pre-existing field is still there (old clients keep working).
  for (const k of ['fiveHourPct', 'dayPct', 'weekPct', 'resets']) assert.ok(k in p, k);
  for (const k of ['fiveHour', 'day', 'week']) assert.ok(k in p.resets, k);
  assert.equal(p.weekPct, 50); // ₹42 of ₹84
  assert.equal(p.thirtyDayPct, 25); // ₹100 of ₹400
  assert.equal(p.resets.thirtyDay, new Date(istDayStart(20) + THIRTY_DAYS * DAY).toISOString());
  assert.equal(r.ledger.reads[0].length, 30);
  assert.doesNotMatch(JSON.stringify(res.sent.body), /inr|cost|micro|rupee|₹/i);

  // Unset: the premium body has NO 30-day key and reads 7 days.
  const off = rig({ tier: 'premium', days: keyed({ 0: 19, 1: 23, 20: 5000 }) });
  const ores = fakeRes();
  await off.fu.handleUsageMe({ headers: {} }, ores);
  assert.doesNotMatch(JSON.stringify(ores.sent.body), /thirty/i);
  assert.equal(off.ledger.reads[0].length, 7);

  // Trial view: unchanged, no 30-day field anywhere.
  const t = rig({ tier: 'trial' });
  const tres = fakeRes();
  await t.fu.handleUsageMe({ headers: {} }, tres);
  assert.equal(tres.sent.body.premium, null);
  assert.doesNotMatch(JSON.stringify(tres.sent.body), /thirty/i);
  assert.equal(t.ledger.reads[0].length, 7);
});
