/**
 * fairUse.test.cjs — FAIR-USE-1 guards: fair limits on grading, decided on the server.
 *
 * Run: `node --test server/services/fairUse.test.cjs`
 * Wired into `lazytopper` test:matrix:all as `test:server:fair-use`.
 *
 * What is pinned (spec §2 U7), each test named for the clause it enforces:
 *   U2  every trial allowance: at the limit, over by N, and its IST reset boundary;
 *       a multi-question request over the limit -> 409 with `remaining`, nothing graded;
 *       checks are counted PER QUESTION; rolling 7 IST days for mock / worksheet.
 *   U1  a missing / unknown / not-believed surface is check-improve, per question.
 *   U3  each premium window cap (5 h, day, week) and its reset; caps come from env,
 *       never from the request.
 *   U4  premium at 85% of the global day -> served; trial at 85% -> shed; the global
 *       HARD ceiling still refuses premium; a header-only uid can never earn the exemption.
 *   U5  GET /api/usage/me shape — percentages only, never rupees.
 *   U8  both ways: FAIR_USE_ENFORCE unset -> served + `fair_use.would_refuse.<rule>`;
 *       FAIR_USE_ENFORCE=1 -> 409 / 429.
 *   U6  non-grading paths, the free check, unverified callers, free tier: untouched.
 *   WIRING  the REAL index.cjs over HTTP: 409 before Gemini, a served grade counted once
 *       per question after it is served, the body pre-read reaching the grader, U4 through
 *       the real limiter, /api/usage/me, and the dark default.
 *
 * MUTATIONS this file was verified against (each run alone, each restore verified):
 *   MUT-1  fairUse.cjs decide(): commit `{ checks: 1 }` per REQUEST instead of `need`
 *          -> "U2 · checks are counted PER QUESTION" RED.
 *   MUT-2  rateLimiter.cjs check(): shed premium at 80% like everyone else
 *          -> "U4 · premium at 85% of the global day is SERVED" RED.
 *   MUT-3  fairUse.cjs applyToRequest(): merge caps supplied by the request into the limits
 *          -> "U3 · the caps come from env ONLY" RED.
 *
 * No network, no Firestore: the ledger and the tier are injected in-process; the HTTP
 * tests boot index.cjs with firebase-admin and fetch swapped before it loads.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { EventEmitter } = require('node:events');
const { spawn } = require('node:child_process');

const {
  createFairUse,
  cachedReadJson,
  resolveSurface,
  resolveLimits,
  isEnforced,
  windowDayKeys,
  DEFAULT_LIMITS,
  SURFACE_HEADER,
  CHECK_SOLUTION_PATH,
  GRADE_WORKSHEET_PATH,
} = require('./fairUse.cjs');
const { createRateLimiter, istDayKey } = require('./rateLimiter.cjs');

/* ── Harness ─────────────────────────────────────────────────────────────── */

// 2026-09-27 06:00 UTC = 2026-09-27 11:30 IST.
const NOW = Date.UTC(2026, 8, 27, 6, 0, 0);
const TODAY = '2026-09-27';
const NEXT_IST_MIDNIGHT = '2026-09-27T18:30:00.000Z';
const INR = 1e6; // micro-rupees per rupee — the ledger's unit

function recorder() {
  const events = [];
  return {
    events,
    increment: (event, value = 1) => events.push({ event, value }),
    count: (event) => events.filter((e) => e.event === event).length,
    startingWith: (prefix) => events.filter((e) => e.event.startsWith(prefix)).map((e) => e.event),
  };
}

/** A ledger over a plain object { dayKey: data }. Records every trial write. */
function fakeLedger(days = {}, { failRead = false } = {}) {
  const trialWrites = [];
  const reads = [];
  return {
    trialWrites,
    reads,
    async readDays(uid, keys) {
      reads.push({ uid, keys });
      if (failRead) throw new Error('ledger down');
      return new Map(keys.map((k) => [k, days[k] || {}]));
    },
    recordTrialUse(uid, counts) {
      trialWrites.push({ uid, counts });
      return Promise.resolve(true);
    },
  };
}

function fakeRes() {
  const res = new EventEmitter();
  res.statusCode = 0;
  res.sent = null;
  /** Simulate the route handler answering. */
  res.serve = (status = 200) => {
    res.statusCode = status;
    res.emit('finish');
  };
  return res;
}

function fakeReq({ surface, body, headers = {} } = {}) {
  const req = { headers: { ...headers } };
  if (surface !== undefined) req.headers[SURFACE_HEADER] = surface;
  req.__body = body;
  return req;
}

const rawReadJson = async (req) => req.__body || {};

/** A fair-use gate over an injected tier, ledger and clock. */
function rig({ tier = 'trial', days = {}, env = { FAIR_USE_ENFORCE: '1' }, now = NOW, failRead = false, tierOf } = {}) {
  const ledger = fakeLedger(days, { failRead });
  const telemetry = recorder();
  const sent = [];
  let tierReads = 0;
  const gate = createFairUse({
    tierOf: tierOf || (async () => { tierReads += 1; return tier; }),
    ledger,
    telemetry,
    env,
    now: () => now,
    readJson: rawReadJson,
    sendJson: (res, status, body) => {
      sent.push({ status, body });
      res.sent = { status, body };
    },
    verifiedCaller: { resolveVerifiedUid: async (req) => (req.headers.authorization === 'Bearer ok' ? 'stu-1' : '') },
  });
  return { gate, ledger, telemetry, sent, tierReads: () => tierReads };
}

function questions(n) {
  return Array.from({ length: n }, (_, i) => ({ qNumber: i + 1, marks: 2, questionText: `Question ${i + 1}` }));
}

/** Run one request through the gate; if it was let through, the handler serves `status`. */
async function run(r, { path: reqPath = CHECK_SOLUTION_PATH, surface, body, headers, uid = 'stu-1', serve = 200, options } = {}) {
  const req = fakeReq({ surface, body, headers });
  const res = fakeRes();
  const answered = await r.gate.applyToRequest(req, res, reqPath, uid, options);
  if (!answered && serve) res.serve(serve);
  await new Promise((resolve) => setImmediate(resolve));
  return { answered, res, req };
}

const dayOf = (offsetDays) => istDayKey(NOW - offsetDays * 86400000);

/* ══════════════════════════════════════════════════════════════════════════
   U2 · TRIAL — 5 answer checks per IST day, counted PER QUESTION
   ══════════════════════════════════════════════════════════════════════════ */

test('U2 · trial checks AT the limit: a 1-question check is refused 409, nothing counted', async () => {
  const r = rig({ days: { [TODAY]: { trialChecks: 5 } } });
  const out = await run(r, { surface: 'check-improve' });
  assert.equal(out.answered, true);
  assert.deepEqual(out.res.sent, {
    status: 409,
    body: { error: 'trial_limit', remaining: 0, resetAt: NEXT_IST_MIDNIGHT },
  });
  assert.equal(r.ledger.trialWrites.length, 0, 'a refused request must not be counted');
});

test('U2 · trial checks one UNDER the limit: served, and counted once it is served', async () => {
  const r = rig({ days: { [TODAY]: { trialChecks: 4 } } });
  const out = await run(r, { surface: 'quick-practice' });
  assert.equal(out.answered, false);
  assert.equal(out.res.sent, null);
  assert.deepEqual(r.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 1 } }]);
});

test('U2 · multi-question over the limit by N -> 409 with `remaining`, NOTHING graded or counted', async () => {
  for (const surface of ['check-improve', 'quick-practice']) {
    const r = rig({ days: { [TODAY]: { trialChecks: 3 } } });
    const out = await run(r, { path: GRADE_WORKSHEET_PATH, surface, body: { worksheetId: 'w', questions: questions(4) } });
    assert.equal(out.answered, true, `${surface}: must be refused`);
    assert.deepEqual(out.res.sent.body, { error: 'trial_limit', remaining: 2, resetAt: NEXT_IST_MIDNIGHT });
    assert.equal(out.res.sent.status, 409);
    assert.equal(r.ledger.trialWrites.length, 0);
  }
});

// MUTATION MUT-1 target.
test('U2 · checks are counted PER QUESTION — a 3-question grade spends 3 checks, not 1', async () => {
  const r = rig({ days: { [TODAY]: { trialChecks: 2 } } });
  const out = await run(r, { path: GRADE_WORKSHEET_PATH, surface: 'check-improve', body: { worksheetId: 'w', questions: questions(3) } });
  assert.equal(out.answered, false, 'exactly the remaining 3 must be served');
  assert.deepEqual(r.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 3 } }]);

  // The count is what the grader will grade: entries its own filter drops are not counted.
  const r2 = rig({ days: {} });
  const body = { worksheetId: 'w', questions: [...questions(2), { qNumber: 0, questionText: 'x' }, { qNumber: 9, questionText: '  ' }] };
  await run(r2, { path: GRADE_WORKSHEET_PATH, surface: 'quick-practice', body });
  assert.deepEqual(r2.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 2 } }]);
});

test('U2 · a served grade is counted only on a 2xx — a failed or refused-downstream one costs nothing', async () => {
  const r = rig({ days: {} });
  await run(r, { serve: 500 });
  await run(r, { serve: 402 });
  assert.equal(r.ledger.trialWrites.length, 0);
  await run(r, { serve: 200 });
  assert.equal(r.ledger.trialWrites.length, 1);
});

test('U2 · trial checks reset on the IST day boundary, not the UTC one', async () => {
  const days = { [TODAY]: { trialChecks: 5 } };
  // 2026-09-27 18:29:59 UTC = 23:59:59 IST on the 27th -> still today, refused.
  const before = rig({ days, now: Date.UTC(2026, 8, 27, 18, 29, 59) });
  assert.equal((await run(before)).answered, true);
  // 2026-09-27 18:30:00 UTC = 00:00 IST on the 28th — the UTC date is STILL the 27th.
  const after = rig({ days, now: Date.UTC(2026, 8, 27, 18, 30, 0) });
  const out = await run(after);
  assert.equal(out.answered, false, 'a new IST day must restore the checks');
  assert.equal(after.ledger.reads[0].keys.at(-1), '2026-09-28');
});

/* ── 1 chapter test per IST day ───────────────────────────────────────────── */

test('U2 · chapter test: 1 per IST day — at the limit 409, next IST day served, counted as ONE paper', async () => {
  const days = { [TODAY]: { trialChapterTests: 1 } };
  const body = { worksheetId: 'ct-1', questions: questions(8) };
  const at = rig({ days });
  const refused = await run(at, { path: GRADE_WORKSHEET_PATH, surface: 'chapter-test', body });
  assert.deepEqual(refused.res.sent, {
    status: 409,
    body: { error: 'trial_limit', remaining: 0, resetAt: NEXT_IST_MIDNIGHT },
  });

  const next = rig({ days, now: Date.UTC(2026, 8, 27, 18, 30, 0) });
  const served = await run(next, { path: GRADE_WORKSHEET_PATH, surface: 'chapter-test', body });
  assert.equal(served.answered, false);
  assert.deepEqual(next.ledger.trialWrites, [{ uid: 'stu-1', counts: { chapterTests: 1 } }],
    'an 8-question chapter test is one chapter test, and spends no answer checks');
});

/* ── 1 full mock and 1 worksheet grading per ROLLING 7 IST days ────────────── */

for (const [surface, field, counterKey] of [
  ['full-mock', 'trialMocks', 'mocks'],
  ['worksheet', 'trialWorksheets', 'worksheets'],
]) {
  test(`U2 · ${surface}: 1 per rolling 7 IST days — 6 days ago refused (reset when it leaves), 7 days ago served`, async () => {
    const body = { worksheetId: `${surface}-1`, questions: questions(5) };
    // Used 6 IST days ago (2026-09-21): still inside [09-21 .. 09-27].
    const inside = rig({ days: { [dayOf(6)]: { [field]: 1 } } });
    const refused = await run(inside, { path: GRADE_WORKSHEET_PATH, surface, body });
    assert.equal(refused.res.sent.status, 409);
    // It leaves the window at the start of 09-28 IST = 2026-09-27T18:30Z.
    assert.deepEqual(refused.res.sent.body, { error: 'trial_limit', remaining: 0, resetAt: '2026-09-27T18:30:00.000Z' });

    // Used 4 days ago: leaves at the start of 2026-09-30 IST.
    const mid = rig({ days: { [dayOf(4)]: { [field]: 1 } } });
    assert.equal((await run(mid, { path: GRADE_WORKSHEET_PATH, surface, body })).res.sent.body.resetAt,
      '2026-09-29T18:30:00.000Z');

    // Used 7 IST days ago (2026-09-20): outside the window.
    const outside = rig({ days: { [dayOf(7)]: { [field]: 1 } } });
    const served = await run(outside, { path: GRADE_WORKSHEET_PATH, surface, body });
    assert.equal(served.answered, false);
    assert.deepEqual(outside.ledger.trialWrites, [{ uid: 'stu-1', counts: { [counterKey]: 1 } }]);
    assert.deepEqual(outside.ledger.reads[0].keys, windowDayKeys(NOW));
    assert.equal(outside.ledger.reads[0].keys.length, 7);
    assert.ok(!outside.ledger.reads[0].keys.includes(dayOf(7)));
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   U1 · THE SURFACE HEADER IS UNTRUSTED
   ══════════════════════════════════════════════════════════════════════════ */

test('U1 · missing / unknown surface -> check-improve, counted per question', async () => {
  for (const surface of [undefined, '', 'banana', 'CHAPTER TEST', 'full_mock']) {
    const r = rig({ days: {} });
    await run(r, { path: GRADE_WORKSHEET_PATH, surface, body: { worksheetId: 'w', questions: questions(3) } });
    assert.deepEqual(r.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 3 } }], `surface=${surface}`);
  }
});

test('U1 · a forged surface never buys a cheaper allowance than the fallback', async () => {
  // A paper surface on the single-question endpoint is not believed.
  const one = rig({ days: { [TODAY]: { trialChecks: 5 } } });
  assert.equal((await run(one, { surface: 'worksheet' })).answered, true, 'check-solution is always per question');

  // A paper surface on a C&I / Quick Practice id is not believed either.
  for (const worksheetId of ['ci:ABC123', 'qp:XYZ', 'CI:abc']) {
    const r = rig({ days: { [TODAY]: { trialChecks: 5 } } });
    const out = await run(r, { path: GRADE_WORKSHEET_PATH, surface: 'worksheet', body: { worksheetId, questions: questions(3) } });
    assert.equal(out.answered, true, `${worksheetId}: must fall back to per-question checks`);
    assert.equal(out.res.sent.body.remaining, 0);
  }
  assert.equal(resolveSurface({ headers: { [SURFACE_HEADER]: 'full-mock' } }, CHECK_SOLUTION_PATH, null), 'check-improve');
  assert.equal(resolveSurface({ headers: { [SURFACE_HEADER]: ' Full-Mock ' } }, GRADE_WORKSHEET_PATH, { worksheetId: 'fm-1' }), 'full-mock');
});

/* ══════════════════════════════════════════════════════════════════════════
   U3 · PREMIUM — real cost, three rolling windows
   ══════════════════════════════════════════════════════════════════════════ */

test('U3 · premium WEEK cap ₹84 over rolling 7 IST days -> 429 week, reset when enough leaves', async () => {
  const days = { [dayOf(3)]: { costMicroInr: 50 * INR }, [dayOf(1)]: { costMicroInr: 34 * INR } };
  const r = rig({ tier: 'premium', days });
  const out = await run(r);
  // 09-24's ₹50 leaves at the start of 10-01 IST = 2026-09-30T18:30Z, dropping the week to ₹34.
  assert.deepEqual(out.res.sent, {
    status: 429,
    body: { error: 'usage_limit', window: 'week', resetAt: '2026-09-30T18:30:00.000Z' },
  });
  // ₹83.99 in the week -> served.
  const under = rig({ tier: 'premium', days: { [dayOf(3)]: { costMicroInr: 50 * INR }, [dayOf(1)]: { costMicroInr: 33.99 * INR } } });
  assert.equal((await run(under)).answered, false);
  // Spend 7 days ago is outside the window.
  const old = rig({ tier: 'premium', days: { [dayOf(7)]: { costMicroInr: 500 * INR } } });
  assert.equal((await run(old)).answered, false);
});

test('U3 · premium DAY cap ₹38 per IST day -> 429 day, reset at the next IST midnight', async () => {
  const r = rig({ tier: 'premium', days: { [TODAY]: { costMicroInr: 38 * INR } } });
  assert.deepEqual((await run(r)).res.sent, {
    status: 429,
    body: { error: 'usage_limit', window: 'day', resetAt: NEXT_IST_MIDNIGHT },
  });
  const under = rig({ tier: 'premium', days: { [TODAY]: { costMicroInr: 37.99 * INR } } });
  assert.equal((await run(under)).answered, false);
  // Yesterday's ₹38 does not count toward today.
  const yday = rig({ tier: 'premium', days: { [dayOf(1)]: { costMicroInr: 38 * INR } } });
  assert.equal((await run(yday)).answered, false);
});

test('U3 · premium 5-HOUR cap ₹25 over rolling IST hour buckets -> 429 fiveHour, reset when the oldest leaves', async () => {
  // NOW is 11:30 IST: the window is hours 07..11.
  const r = rig({ tier: 'premium', days: { [TODAY]: { costMicroInr: 25 * INR, hourCostMicroInr: { '08': 15 * INR, 11: 10 * INR } } } });
  // Hour 08 leaves at 13:00 IST = 07:30 UTC, dropping the window to ₹10.
  assert.deepEqual((await run(r)).res.sent, {
    status: 429,
    body: { error: 'usage_limit', window: 'fiveHour', resetAt: '2026-09-27T07:30:00.000Z' },
  });
  // Hour 06 is outside the window.
  const outside = rig({ tier: 'premium', days: { [TODAY]: { costMicroInr: 25 * INR, hourCostMicroInr: { '06': 15 * INR, 11: 10 * INR } } } });
  assert.equal((await run(outside)).answered, false);
  // Across IST midnight: 01:30 IST on the 28th reads hour 23 of the 27th's document.
  const late = Date.UTC(2026, 8, 27, 20, 0, 0);
  const cross = rig({
    tier: 'premium',
    now: late,
    days: { [TODAY]: { costMicroInr: 20 * INR, hourCostMicroInr: { 23: 20 * INR } }, '2026-09-28': { costMicroInr: 5 * INR, hourCostMicroInr: { '01': 5 * INR } } },
  });
  const out = await run(cross);
  assert.equal(out.res.sent.body.window, 'fiveHour');
  // Hour 23 of the 27th (17:30Z) leaves 5 h later = 22:30Z.
  assert.equal(out.res.sent.body.resetAt, '2026-09-27T22:30:00.000Z');
});

// MUTATION MUT-3 target.
test('U3 · the caps come from env ONLY — never from the request', async () => {
  const days = { [TODAY]: { costMicroInr: 38 * INR, trialChecks: 5 } };
  const lifted = Object.fromEntries(Object.values(require('./fairUse.cjs').LIMIT_ENV).map((k) => [k, '100000']));
  const headers = { 'x-fair-use-caps': JSON.stringify(lifted), 'x-fair-use-premium-day-inr': '100000' };
  const body = { worksheetId: 'w', questions: questions(1), caps: lifted, ...lifted };

  const premium = rig({ tier: 'premium', days });
  const p = await run(premium, { path: GRADE_WORKSHEET_PATH, headers, body });
  assert.equal(p.res.sent && p.res.sent.status, 429, 'a cap carried by the request must be ignored');

  const trial = rig({ tier: 'trial', days });
  const t = await run(trial, { path: GRADE_WORKSHEET_PATH, headers, body });
  assert.equal(t.res.sent && t.res.sent.status, 409, 'an allowance carried by the request must be ignored');

  // CONTROL: the SAME cap lifted through env is honoured — so the test can tell the two apart.
  const viaEnv = rig({ tier: 'premium', days, env: { FAIR_USE_ENFORCE: '1', FAIR_USE_PREMIUM_DAY_INR: '100' } });
  assert.equal((await run(viaEnv, { path: GRADE_WORKSHEET_PATH, headers, body })).answered, false);
  assert.equal(resolveLimits({}).premium.dayMicroInr, DEFAULT_LIMITS.premiumDayInr * INR);
  assert.equal(resolveLimits({ FAIR_USE_PREMIUM_DAY_INR: 'junk' }).premium.dayMicroInr, 38 * INR);
});

/* ══════════════════════════════════════════════════════════════════════════
   U8 · DARK BY DEFAULT — both ways
   ══════════════════════════════════════════════════════════════════════════ */

test('U8 · FAIR_USE_ENFORCE unset -> SERVED, counters still move, would_refuse telemetry emitted', async () => {
  const trial = rig({ env: {}, days: { [TODAY]: { trialChecks: 5 } } });
  const t = await run(trial, { path: GRADE_WORKSHEET_PATH, surface: 'check-improve', body: { worksheetId: 'w', questions: questions(2) } });
  assert.equal(t.answered, false);
  assert.equal(t.res.sent, null, 'nothing may be refused while enforcement is dark');
  assert.equal(trial.telemetry.count('fair_use.would_refuse.trial_checks'), 1);
  assert.deepEqual(trial.telemetry.startingWith('fair_use.refused.'), []);
  assert.deepEqual(trial.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 2 } }], 'the honest count keeps moving');

  const premium = rig({ tier: 'premium', env: {}, days: { [TODAY]: { costMicroInr: 40 * INR } } });
  const p = await run(premium);
  assert.equal(p.answered, false);
  assert.equal(premium.telemetry.count('fair_use.would_refuse.premium_day'), 1);

  for (const value of ['0', 'true', 'yes', ' 2', '']) assert.equal(isEnforced({ FAIR_USE_ENFORCE: value }), false, value);
  assert.equal(isEnforced({}), false);
});

test('U8 · FAIR_USE_ENFORCE=1 -> 409 (trial) and 429 (premium), refused telemetry, no would_refuse', async () => {
  const trial = rig({ env: { FAIR_USE_ENFORCE: '1' }, days: { [TODAY]: { trialChecks: 5 } } });
  assert.equal((await run(trial)).res.sent.status, 409);
  assert.equal(trial.telemetry.count('fair_use.refused.trial_checks'), 1);
  assert.deepEqual(trial.telemetry.startingWith('fair_use.would_refuse.'), []);

  const premium = rig({ tier: 'premium', env: { FAIR_USE_ENFORCE: '1' }, days: { [TODAY]: { costMicroInr: 40 * INR } } });
  assert.equal((await run(premium)).res.sent.status, 429);
  assert.equal(premium.telemetry.count('fair_use.refused.premium_day'), 1);
});

/* ══════════════════════════════════════════════════════════════════════════
   U6 · UNTOUCHED — and FAIL-OPEN
   ══════════════════════════════════════════════════════════════════════════ */

test('U6 · non-grading paths, free checks, unverified callers and the free tier are never touched', async () => {
  const days = { [TODAY]: { trialChecks: 99, costMicroInr: 999 * INR } };
  for (const reqPath of ['/api/tutor', '/api/detect-question', '/api/step-solution', '/api/generate-visual']) {
    const r = rig({ days });
    assert.equal((await run(r, { path: reqPath })).answered, false, reqPath);
    assert.equal(r.tierReads(), 0, `${reqPath}: must not even read the tier`);
  }
  const free = rig({ days });
  assert.equal((await run(free, { options: { freeCheck: true } })).answered, false);
  assert.equal(free.tierReads(), 0, 'an admitted free check is not fair-use metered');
  const anon = rig({ days });
  assert.equal((await run(anon, { uid: '' })).answered, false);
  assert.equal(anon.tierReads(), 0, 'a header-only / anonymous caller is not fair-use metered');
  for (const tier of ['free', null, 'weird']) {
    const r = rig({ tier, days });
    const out = await run(r);
    assert.equal(out.answered, false, `tier=${tier}`);
    assert.equal(r.ledger.reads.length, 0);
    assert.equal(r.ledger.trialWrites.length, 0);
  }
});

test('U6 · FAIL-OPEN: an unreadable ledger or tier serves the request (a refusal needs a positive read)', async () => {
  const r = rig({ failRead: true });
  const out = await run(r, { path: GRADE_WORKSHEET_PATH, surface: 'check-improve', body: { worksheetId: 'w', questions: questions(9) } });
  assert.equal(out.answered, false);
  assert.equal(r.telemetry.count('fair_use.ledger_unreadable'), 1);
  assert.deepEqual(r.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 9 } }]);

  const t = rig({ tierOf: async () => { throw new Error('firestore down'); } });
  assert.equal((await run(t)).answered, false);
  assert.equal(t.telemetry.count('fair_use.tier_unknown'), 1);
});

test('U6 · the grade-worksheet body is read ONCE and the handler gets the SAME parse (or the same failure)', async () => {
  const r = rig({ days: {} });
  const body = { worksheetId: 'w', questions: questions(2) };
  const { req } = await run(r, { path: GRADE_WORKSHEET_PATH, surface: 'check-improve', body, serve: 0 });
  let rawCalls = 0;
  const handlerReadJson = cachedReadJson(async () => { rawCalls += 1; return { other: true }; });
  assert.equal(await handlerReadJson(req, 8 * 1024 * 1024), body, 'the handler must receive the pre-read parse');
  assert.equal(rawCalls, 0, 'the stream must not be read twice');

  // No pre-read -> the original readJson, untouched.
  assert.deepEqual(await handlerReadJson({ headers: {} }), { other: true });
  assert.equal(rawCalls, 1);

  // A body that fails to parse: fair use steps aside, the handler sees the SAME rejection.
  const bad = createFairUse({
    tierOf: async () => 'trial',
    ledger: fakeLedger(),
    env: { FAIR_USE_ENFORCE: '1' },
    readJson: async () => { throw new Error('Request body too large'); },
    sendJson: () => assert.fail('fair use must not answer a request it could not read'),
  });
  const badReq = { headers: {} };
  assert.equal(await bad.applyToRequest(badReq, fakeRes(), GRADE_WORKSHEET_PATH, 'stu-1'), false);
  await assert.rejects(cachedReadJson(async () => ({}))(badReq), /Request body too large/);
});

/* ══════════════════════════════════════════════════════════════════════════
   U4 · PAYING STUDENTS ARE NEVER PAUSED BY THE DAY'S BUDGET
   ══════════════════════════════════════════════════════════════════════════ */

const LIMITS_100 = Object.freeze({
  vision: { soft: 1000, hard: 1000 },
  tutor: { soft: 1000, hard: 1000 },
  practice: { soft: 1000, hard: 1000 },
  visual: { soft: 1000, hard: 1000 },
  anonymous: { soft: 1000, hard: 1000 },
  global: { soft: 1000, hard: 100 },
});

/** A limiter whose global day already holds `n` calls from OTHER students. */
function limiterAt(n) {
  const telemetry = recorder();
  const limiter = createRateLimiter({ now: () => NOW, telemetry, limits: LIMITS_100 });
  for (let i = 0; i < n; i += 1) {
    const v = limiter.check({ headers: {} }, '/api/tutor', `other-${i}`);
    assert.equal(v.allowed, true);
  }
  return { limiter, telemetry };
}

// MUTATION MUT-2 target.
test('U4 · premium at 85% of the global day is SERVED; trial at 85% is SHED exactly as before', async () => {
  const { limiter, telemetry } = limiterAt(85);
  assert.equal(limiter.wouldShed('/api/check-solution'), true, 'CONTROL: 85% is past the 80% shed line');
  assert.equal(limiter.wouldShed('/api/grade-worksheet'), true);
  assert.equal(limiter.wouldShed('/api/tutor'), false, 'only vision is ever shed');

  const premium = limiter.check({ headers: {} }, '/api/check-solution', 'premium-uid', { premium: true });
  assert.equal(premium.allowed, true, 'a paying student must not be paused by the day budget');
  assert.equal(telemetry.count('rate_limit.shed.vision.premium_exempt'), 1);

  const trial = limiter.check({ headers: {} }, '/api/check-solution', 'trial-uid');
  assert.equal(trial.allowed, false);
  assert.equal(trial.status, 429);
  assert.equal(trial.body.class, 'vision', 'the trial caller meets the P2 shed, unchanged');

  // A header-only (unverified) uid cannot earn the exemption, even if asked.
  const forged = limiter.check({ headers: { 'x-lazytopper-uid': 'premium-uid' } }, '/api/check-solution', '', { premium: true });
  assert.equal(forged.allowed, false);
  assert.equal(forged.body.class, 'vision');
});

test('U4 · below 80% nobody is shed and wouldShed() is false — no tier read is needed', () => {
  const { limiter } = limiterAt(10);
  assert.equal(limiter.wouldShed('/api/check-solution'), false);
  assert.equal(limiter.check({ headers: {} }, '/api/check-solution', 'trial-uid').allowed, true);
});

test('U4 · only the global HARD ceiling can refuse a premium caller', () => {
  const { limiter } = limiterAt(100);
  const v = limiter.check({ headers: {} }, '/api/check-solution', 'premium-uid', { premium: true });
  assert.equal(v.allowed, false);
  assert.equal(v.body.class, 'global');
});

test('U4 · isPremium is true only for a verified uid whose effective tier is premium', async () => {
  for (const [tier, want] of [['premium', true], ['trial', false], ['free', false], [null, false]]) {
    const { gate } = rig({ tier });
    assert.equal(await gate.isPremium('stu-1', { headers: {} }), want, `tier=${tier}`);
  }
  const { gate, tierReads } = rig({ tier: 'premium' });
  assert.equal(await gate.isPremium('', { headers: {} }), false);
  assert.equal(tierReads(), 0);
});

/* ══════════════════════════════════════════════════════════════════════════
   U5 · GET /api/usage/me — percentages only, never rupees
   ══════════════════════════════════════════════════════════════════════════ */

async function usageMe(r, headers = { authorization: 'Bearer ok' }) {
  const res = fakeRes();
  await r.gate.handleUsageMe({ headers }, res);
  return res.sent;
}

const NO_RUPEES = /inr|cost|micro|rupee|₹/i;

test('U5 · /api/usage/me — trial shape', async () => {
  const r = rig({ days: { [TODAY]: { trialChecks: 3, costMicroInr: 12 * INR }, [dayOf(2)]: { trialMocks: 1 } } });
  const out = await usageMe(r);
  assert.equal(out.status, 200);
  assert.deepEqual(out.body, {
    tier: 'trial',
    trial: {
      checksLeftToday: 2,
      chapterTestsLeftToday: 1,
      mocksLeft: 0,
      worksheetsLeft: 1,
      resets: {
        checks: NEXT_IST_MIDNIGHT,
        chapterTests: NEXT_IST_MIDNIGHT,
        mocks: '2026-10-01T18:30:00.000Z',
        worksheets: null,
      },
    },
    premium: null,
  });
  assert.doesNotMatch(JSON.stringify(out.body), NO_RUPEES);
});

test('U5 · /api/usage/me — premium shape: whole percentages, clamped at 100, never rupees', async () => {
  const r = rig({
    tier: 'premium',
    days: {
      [TODAY]: { costMicroInr: 19 * INR, hourCostMicroInr: { 10: 5 * INR, 11: 5 * INR } },
      [dayOf(1)]: { costMicroInr: 23 * INR },
    },
  });
  const out = await usageMe(r);
  assert.equal(out.status, 200);
  assert.deepEqual(Object.keys(out.body).sort(), ['premium', 'tier', 'trial']);
  assert.equal(out.body.tier, 'premium');
  assert.equal(out.body.trial, null);
  assert.deepEqual(out.body.premium, {
    fiveHourPct: 40, // ₹10 of ₹25
    dayPct: 50, // ₹19 of ₹38
    weekPct: 50, // ₹42 of ₹84
    resets: {
      fiveHour: '2026-09-27T09:30:00.000Z', // hour 10 IST (04:30Z) + 5 h
      day: NEXT_IST_MIDNIGHT,
      week: '2026-10-02T18:30:00.000Z', // yesterday (09-26) leaves at 10-03 00:00 IST
    },
  });
  assert.doesNotMatch(JSON.stringify(out.body), NO_RUPEES);

  const over = await usageMe(rig({ tier: 'premium', days: { [TODAY]: { costMicroInr: 400 * INR } } }));
  assert.equal(over.body.premium.dayPct, 100);
  assert.equal(over.body.premium.weekPct, 100);
  for (const k of ['fiveHourPct', 'dayPct', 'weekPct']) assert.ok(Number.isInteger(over.body.premium[k]));
});

test('U5 · /api/usage/me — verified uid required; free / unknown tier are honest, never invented', async () => {
  assert.deepEqual(await usageMe(rig(), {}), { status: 401, body: { error: 'sign_in_required' } });
  assert.deepEqual(await usageMe(rig(), { 'x-lazytopper-uid': 'stu-1' }), { status: 401, body: { error: 'sign_in_required' } });
  assert.deepEqual(await usageMe(rig({ tier: 'free' })), { status: 200, body: { tier: 'free', trial: null, premium: null } });
  assert.deepEqual(await usageMe(rig({ tier: null })), { status: 503, body: { error: 'usage_unavailable' } });
  assert.deepEqual(await usageMe(rig({ failRead: true })), { status: 503, body: { error: 'usage_unavailable' } });
});

/* ══════════════════════════════════════════════════════════════════════════
   WIRING · THE REAL index.cjs, OVER HTTP
   A gate wired but never reached is a silent no-op. These boot the real server with
   firebase-admin and fetch swapped BEFORE index.cjs loads (no test seam in production
   code) and read every Gemini call and ledger write from its stdout.
   ══════════════════════════════════════════════════════════════════════════ */

const INDEX_CJS = path.resolve(__dirname, '..', 'index.cjs');

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

function bootServer(port, extraEnv, seed) {
  const launcher = `
    const Module = require('module');
    const SEED = JSON.parse(process.env.FAIR_USE_TEST_SEED || '{}');
    const TOKENS = { 'trial-token': 'trial-student', 'premium-token': 'premium-student' };
    const SUBS = {
      'trial-student': { tier: 'trial', trialStartDate: { seconds: Math.floor(Date.now() / 1000) - 86400 } },
      'premium-student': { tier: 'premium' },
    };
    const docRef = (p) => ({
      path: p,
      collection: (n) => collRef(p + '/' + n),
      get: async () => {
        if (p.startsWith('subscriptions/')) {
          const d = SUBS[p.split('/')[1]];
          return { exists: !!d, data: () => d };
        }
        const d = SEED[p];
        return { exists: !!d, data: () => d };
      },
      set: async (data) => {
        if (p.startsWith('usageLedger/')) console.log('LEDGER_SET ' + p + ' ' + JSON.stringify(data));
      },
    });
    const collRef = (p) => ({ doc: (id) => docRef(p + '/' + id) });
    const firestore = () => ({
      collection: (n) => collRef(n),
      runTransaction: async (fn) => fn({ get: async () => ({ exists: false }), set() {} }),
    });
    firestore.FieldValue = { increment: (n) => ({ increment: n }) };
    const fake = {
      apps: [],
      credential: { cert: () => ({}) },
      initializeApp() { fake.apps.push({}); },
      auth: () => ({
        verifyIdToken: async (t) => {
          if (TOKENS[t]) return { uid: TOKENS[t] };
          throw new Error('invalid token');
        },
      }),
      appCheck: () => ({ verifyToken: async () => ({ appId: 'app-1', alreadyConsumed: false }) }),
      firestore,
    };
    const orig = Module._load;
    Module._load = function (r) { return r === 'firebase-admin' ? fake : orig.apply(this, arguments); };
    globalThis.fetch = async (url) => {
      console.log('GEMINI_FETCH ' + String(url).split('?')[0].split('/').pop());
      return {
        ok: true, status: 200, statusText: 'OK', headers: { get: () => null },
        text: async () => JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"reply":"ok"}' }] } }],
          usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 800, totalTokenCount: 2000 },
        }),
      };
    };
    require(${JSON.stringify(INDEX_CJS)});
  `;
  const env = { ...process.env, PORT: String(port) };
  for (const k of Object.keys(env)) {
    if (/^(AI_INTEGRATIONS_|GEMINI_|WARM_POOL_|LT_|FAIR_USE_)/.test(k)) delete env[k];
  }
  delete env.DATABASE_URL;
  delete env.FIREBASE_SERVICE_ACCOUNT_KEY;
  env.API_KEY = 'fake-gemini-key';
  env.AI_PROVIDER = 'gemini';
  env.VITE_FIREBASE_PROJECT_ID = 'demo-fair-use';
  env.FAIR_USE_TEST_SEED = JSON.stringify(seed || {});
  Object.assign(env, extraEnv || {});

  const child = spawn(process.execPath, ['-e', launcher], { env, cwd: path.dirname(INDEX_CJS) });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const ready = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`server did not start:\n${out}`)), 60000);
    const tick = setInterval(() => {
      if (/running on port/.test(out)) { clearInterval(tick); clearTimeout(t); resolve(); }
      if (child.exitCode !== null) { clearInterval(tick); clearTimeout(t); reject(new Error(`server exited:\n${out}`)); }
    }, 100);
  });
  return { child, ready, log: () => out };
}

function request(port, method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? '' : JSON.stringify(body);
    const req = http.request(
      {
        host: '127.0.0.1', port, path: urlPath, method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => resolve({ status: res.statusCode, text, headers: res.headers }));
      }
    );
    req.on('error', reject);
    req.end(payload || undefined);
  });
}

const count = (log, re) => (log.match(re) || []).length;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TRIAL = { authorization: 'Bearer trial-token' };
const PREMIUM = { authorization: 'Bearer premium-token' };
const typedBatch = (n, worksheetId = 'w-1') => ({
  worksheetId,
  subject: 'Maths',
  questions: Array.from({ length: n }, (_, i) => ({ qNumber: i + 1, marks: 2, questionText: `Solve x + ${i} = ${i + 1}`, textAnswer: 'x = 1' })),
});

test('WIRING · REAL index.cjs, FAIR_USE_ENFORCE=1: 409 before Gemini, counted per question once served, U4 through the real limiter, /api/usage/me',
  { timeout: 180000 }, async (t) => {
    const today = istDayKey(Date.now());
    const port = await freePort();
    // Global hard 10 -> the vision shed line is floor(10 * 0.8) = 8.
    const srv = bootServer(port, { FAIR_USE_ENFORCE: '1', LT_CAP_GLOBAL_HARD: '10' }, {
      [`usageLedger/trial-student/days/${today}`]: { trialChecks: 4 },
    });
    t.after(() => srv.child.kill());
    await srv.ready;

    // ── (0) CORS: the surface header and the usage route are preflight-allowed. ──
    const pre = await request(port, 'OPTIONS', '/api/usage/me', undefined, { origin: 'http://x', 'access-control-request-headers': 'x-lazytopper-surface' });
    assert.equal(pre.status, 204);
    assert.match(String(pre.headers['access-control-allow-headers']), /X-Lazytopper-Surface/);

    // ── (1) Trial with 1 check left asks for 2 -> 409, and Gemini is NEVER called. ──   [global 1]
    let before = srv.log();
    let res = await request(port, 'POST', GRADE_WORKSHEET_PATH, typedBatch(2), { ...TRIAL, 'x-lazytopper-surface': 'check-improve' });
    await wait(300);
    let delta = srv.log().slice(before.length);
    assert.equal(res.status, 409, `${res.text}\n${delta}`);
    const refusal = JSON.parse(res.text);
    assert.equal(refusal.error, 'trial_limit');
    assert.equal(refusal.remaining, 1);
    assert.match(refusal.resetAt, /T18:30:00\.000Z$/, 'the reset is an IST midnight');
    assert.equal(count(delta, /GEMINI_FETCH/g), 0, `a refused request reached the model\n${delta}`);
    assert.equal(count(delta, /trialChecks/g), 0, 'a refused request was counted');

    // ── (2) The same trial asks for exactly the 1 left -> graded, then counted as 1. ── [global 2]
    //        This also proves the pre-read body reaches the grader (it graded).
    before = srv.log();
    res = await request(port, 'POST', GRADE_WORKSHEET_PATH, typedBatch(1), { ...TRIAL, 'x-lazytopper-surface': 'check-improve' });
    for (let i = 0; i < 40 && !/trialChecks/.test(srv.log().slice(before.length)); i++) await wait(50);
    delta = srv.log().slice(before.length);
    assert.equal(res.status, 200, `${res.text}\n${delta}`);
    assert.ok(count(delta, /GEMINI_FETCH/g) >= 1, `CONTROL: the served grade must reach the model\n${delta}`);
    assert.ok(delta.includes(`LEDGER_SET usageLedger/trial-student/days/${today} {"trialChecks":{"increment":1}}`),
      `the served grade must be counted once, per question\n${delta}`);

    // ── (3) /api/usage/me for the trial caller. ──
    res = await request(port, 'GET', '/api/usage/me', undefined, TRIAL);
    assert.equal(res.status, 200, res.text);
    const me = JSON.parse(res.text);
    assert.equal(me.tier, 'trial');
    assert.equal(me.premium, null);
    assert.deepEqual(Object.keys(me.trial).sort(), ['chapterTestsLeftToday', 'checksLeftToday', 'mocksLeft', 'resets', 'worksheetsLeft']);
    assert.doesNotMatch(res.text, NO_RUPEES);
    assert.equal((await request(port, 'GET', '/api/usage/me', undefined, {})).status, 401);

    // ── (4) U4 through the REAL limiter: push the global day to the shed line. ── [global 3..8]
    for (let i = 0; i < 6; i++) {
      const r = await request(port, 'POST', '/api/tutor',
        { topicLabel: 'Electricity', subject: 'science', messages: [{ role: 'user', content: 'what is ohm law' }] }, PREMIUM);
      assert.equal(r.status, 200, `tutor call ${i}: ${r.text}`);
    }
    // Premium at the shed line -> served.                                              [global 9]
    before = srv.log();
    res = await request(port, 'POST', CHECK_SOLUTION_PATH, { question: 'Solve x + 1 = 2', marks: 1, textAnswer: 'x = 1' }, PREMIUM);
    await wait(300);
    delta = srv.log().slice(before.length);
    assert.notEqual(res.status, 429, `a premium student was paused by the day budget: ${res.text}`);
    assert.ok(count(delta, /GEMINI_FETCH/g) >= 1, `CONTROL: the premium check must reach the model\n${delta}`);
    // Trial at the shed line -> shed, exactly as before.
    res = await request(port, 'POST', CHECK_SOLUTION_PATH, { question: 'Solve x + 1 = 2', marks: 1, textAnswer: 'x = 1' }, TRIAL);
    assert.equal(res.status, 429, res.text);
    assert.equal(JSON.parse(res.text).class, 'vision');
  });

test('WIRING · REAL index.cjs, FAIR_USE_ENFORCE UNSET (the ship state): an over-limit trial grade is SERVED',
  { timeout: 120000 }, async (t) => {
    const today = istDayKey(Date.now());
    const port = await freePort();
    const srv = bootServer(port, {}, {
      [`usageLedger/trial-student/days/${today}`]: { trialChecks: 5, trialChapterTests: 1 },
      [`usageLedger/premium-student/days/${today}`]: { costMicroInr: 500 * INR },
    });
    t.after(() => srv.child.kill());
    await srv.ready;

    let before = srv.log();
    let res = await request(port, 'POST', GRADE_WORKSHEET_PATH, typedBatch(3), { ...TRIAL, 'x-lazytopper-surface': 'chapter-test' });
    for (let i = 0; i < 40 && !/trialChapterTests/.test(srv.log().slice(before.length)); i++) await wait(50);
    let delta = srv.log().slice(before.length);
    assert.equal(res.status, 200, `dark enforcement must not refuse: ${res.text}\n${delta}`);
    assert.ok(count(delta, /GEMINI_FETCH/g) >= 1, `the over-limit grade must be SERVED\n${delta}`);
    assert.ok(delta.includes('{"trialChapterTests":{"increment":1}}'), `the honest count still moves\n${delta}`);

    before = srv.log();
    res = await request(port, 'POST', CHECK_SOLUTION_PATH, { question: 'Solve x + 1 = 2', marks: 1, textAnswer: 'x = 1' }, PREMIUM);
    await wait(300);
    delta = srv.log().slice(before.length);
    assert.notEqual(res.status, 429, res.text);
    assert.ok(count(delta, /GEMINI_FETCH/g) >= 1, `an over-cap premium check must be SERVED while dark\n${delta}`);
  });
