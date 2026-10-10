/**
 * fairUse.allAi.test.cjs — ALL-AI-METERING-1: limits for the Tutor, More-like-this and
 * question detection, decided on the server behind their OWN switch.
 *
 * Run: `node --test server/services/fairUse.allAi.test.cjs`
 * Wired into `lazytopper` test:matrix:all as `test:server:fair-use-all-ai`.
 *
 * What is pinned (spec §2.5), one TABLE plus the edges it cannot express:
 *   TABLE  tier (anonymous free check / free / trial / premium) × route (tutor /
 *          more-like-this / detect-question / step-solution) × switch (FAIR_USE_ENFORCE_ALL_AI
 *          unset / "1") × counter state (under / at cap) -> served, or refused with its status
 *          and body. Refused => answered before dispatch (no model) and NOTHING counted.
 *          Served => a trial counter moves by exactly one, only on a 2xx; dark refusals are
 *          counted as `fair_use.would_refuse.<rule>`.
 *   EDGES  free-check detection admitted; Show steps never refused (and never even reads the
 *          tier); grading refusals unchanged with the new switch on or off; the new switch
 *          never refuses grading; env-tunable limits; IST day reset; fail-open; usage/me
 *          carries the new counts; the free 402 is the entitlement gate's own body shape.
 *   WIRING the REAL index.cjs over HTTP: refused before Gemini, served + counted while dark.
 *
 * ★ The new exports are read through the module object, never destructured at load, so this
 *   file RUNS against trunk's fairUse.cjs too — that is how each decision was shown RED once.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { EventEmitter } = require('node:events');
const { spawn } = require('node:child_process');

const fairUse = require('./fairUse.cjs');
const entitlement = require('./entitlement.cjs');
const { istDayKey } = require('./rateLimiter.cjs');

const { createFairUse } = fairUse;

/* ── Harness ─────────────────────────────────────────────────────────────── */

// 2026-09-27 06:00 UTC = 11:30 IST.
const NOW = Date.UTC(2026, 8, 27, 6, 0, 0);
const TODAY = '2026-09-27';
const NEXT_IST_MIDNIGHT = '2026-09-27T18:30:00.000Z';
const INR = 1e6;

const TUTOR = '/api/tutor';
const MLT = '/api/more-like-this';
const DETECT = '/api/detect-question';
const STEPS = '/api/step-solution';
const CHECK = '/api/check-solution';
const AI_SWITCH = 'FAIR_USE_ENFORCE_ALL_AI';

/** The trial ledger field and default per-day limit of each AI route (owner ruling 10 Oct). */
const ROUTE = {
  [TUTOR]: { field: 'trialTutor', key: 'tutor', limit: 15, rule: 'tutor' },
  [MLT]: { field: 'trialMoreLikeThis', key: 'moreLikeThis', limit: 5, rule: 'more_like_this' },
  [DETECT]: { field: 'trialDetect', key: 'detect', limit: 10, rule: 'detect' },
};

function recorder() {
  const events = [];
  return {
    events,
    increment: (event) => events.push(event),
    count: (event) => events.filter((e) => e === event).length,
    startingWith: (p) => events.filter((e) => e.startsWith(p)),
  };
}

/** A Firestore that records every ledger-day write the AI counters make. */
function fakeLedgerFirestore() {
  const writes = [];
  const docRef = (parts) => ({
    collection: (name) => ({ doc: (id) => docRef([...parts, name, id]) }),
    async set(data, opts) {
      writes.push({ path: parts.join('/'), data: JSON.parse(JSON.stringify(data)), merge: !!(opts && opts.merge) });
    },
  });
  return {
    writes,
    fs: {
      db: { collection: (name) => ({ doc: (id) => docRef([name, id]) }) },
      FieldValue: { increment: (n) => ({ increment: n }) },
    },
  };
}

function rig({ tier = 'trial', days = {}, env = {}, now = NOW, failRead = false } = {}) {
  const telemetry = recorder();
  const ledgerFs = fakeLedgerFirestore();
  const reads = [];
  const trialWrites = [];
  let tierReads = 0;
  const gate = createFairUse({
    tierOf: async () => { tierReads += 1; return tier; },
    ledger: {
      async readDays(uid, keys) {
        reads.push(keys);
        if (failRead) throw new Error('ledger down');
        return new Map(keys.map((k) => [k, days[k] || {}]));
      },
      recordTrialUse(uid, counts) { trialWrites.push(counts); return Promise.resolve(true); },
    },
    telemetry,
    env,
    now: () => now,
    readJson: async (req) => req.__body || {},
    resolveFirestore: () => ledgerFs.fs,
    sendJson: (res, status, body) => { res.sent = { status, body }; },
    verifiedCaller: { resolveVerifiedUid: async (req) => (req.headers.authorization === 'Bearer ok' ? 'stu-1' : '') },
  });
  return { gate, telemetry, ledgerFs, reads, trialWrites, tierReads: () => tierReads };
}

function fakeRes() {
  const res = new EventEmitter();
  res.statusCode = 0;
  res.sent = null;
  return res;
}

/** One request through the gate; when let through, the route handler answers `serve`. */
async function run(r, { reqPath, uid = 'stu-1', options, serve = 200, headers = {} }) {
  const req = { headers: { ...headers } };
  const res = fakeRes();
  const answered = await r.gate.applyToRequest(req, res, reqPath, uid, options);
  if (!answered && serve) {
    res.statusCode = serve;
    res.emit('finish');
  }
  await new Promise((resolve) => setImmediate(resolve));
  return { answered, res };
}

/** The AI counter increments written, as { field: n }. */
const aiCounts = (r) => r.ledgerFs.writes.map((w) => Object.fromEntries(
  Object.entries(w.data).map(([k, v]) => [k, v && v.increment])));

/** Ledger days for a counter state. `atCap` spends the route's whole trial day / Premium day. */
function daysFor(tier, reqPath, atCap) {
  if (tier === 'trial') {
    const r = ROUTE[reqPath];
    return r ? { [TODAY]: { [r.field]: atCap ? r.limit : r.limit - 1 } } : {};
  }
  if (tier === 'premium') return { [TODAY]: { costMicroInr: (atCap ? 38 : 37) * INR } };
  return {};
}

/* ══════════════════════════════════════════════════════════════════════════
   THE TABLE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Expected outcome for one cell. `refused` = { status, body }; `count` = the trial counter
 * expected to move on a served 2xx (or null); `wouldRefuse` = the dark-path rule.
 */
function expected(tier, reqPath, switchOn, atCap) {
  const route = ROUTE[reqPath];
  const served = (extra = {}) => ({ refused: null, count: null, wouldRefuse: null, ...extra });
  if (tier === 'anon-free-check' || !route) return served();
  if (tier === 'free') {
    if (reqPath === TUTOR) return served(); // the Tutor's free 402 is entitlement.cjs's, untouched
    const body = {
      error: 'premium_required',
      feature: reqPath === MLT ? 'more-like-this' : 'detect-question',
      tier: 'free',
      message: entitlement.AI_TIER_GATED_ROUTES
        ? entitlement.AI_TIER_GATED_ROUTES[reqPath].message
        : '(trunk has no copy)',
    };
    const rule = `free_${route.rule}`;
    return switchOn ? { refused: { status: 402, body }, count: null, wouldRefuse: null } : served({ wouldRefuse: rule });
  }
  if (tier === 'trial') {
    const count = { [route.field]: 1 };
    if (!atCap) return served({ count });
    const rule = `trial_${route.rule}`;
    return switchOn
      ? { refused: { status: 409, body: { error: 'trial_limit', remaining: 0, resetAt: NEXT_IST_MIDNIGHT } }, count: null, wouldRefuse: null }
      : served({ count, wouldRefuse: rule });
  }
  // premium
  if (!atCap) return served();
  const rule = `premium_day_${route.rule}`;
  return switchOn
    ? { refused: { status: 429, body: { error: 'usage_limit', window: 'day', resetAt: NEXT_IST_MIDNIGHT } }, count: null, wouldRefuse: null }
    : served({ wouldRefuse: rule });
}

const TIERS = ['anon-free-check', 'free', 'trial', 'premium'];
const ROUTES = [TUTOR, MLT, DETECT, STEPS];

for (const tier of TIERS) {
  for (const reqPath of ROUTES) {
    for (const switchOn of [false, true]) {
      for (const atCap of [false, true]) {
        const name = `TABLE · ${tier} · ${reqPath} · switch ${switchOn ? '"1"' : 'unset'} · ${atCap ? 'at cap' : 'under cap'}`;
        test(name, async () => {
          const exp = expected(tier, reqPath, switchOn, atCap);
          // FAIR_USE_ENFORCE=1 in every cell: the grading switch must not decide these routes.
          const env = { FAIR_USE_ENFORCE: '1', ...(switchOn ? { [AI_SWITCH]: '1' } : {}) };
          const r = rig({ tier: tier === 'anon-free-check' ? 'free' : tier, days: daysFor(tier, reqPath, atCap), env });
          const out = tier === 'anon-free-check'
            ? await run(r, { reqPath, uid: '', options: { freeCheck: true } })
            : await run(r, { reqPath });
          if (exp.refused) {
            assert.equal(out.answered, true, 'must be refused at the boundary (before any handler / model)');
            assert.deepEqual(out.res.sent, exp.refused);
            assert.deepEqual(aiCounts(r), [], 'a refused call is never counted');
            assert.deepEqual(r.trialWrites, [], 'and never spends a grading allowance');
            assert.equal(r.telemetry.count(`fair_use.refused.${exp.refused.status === 402 ? `free_${ROUTE[reqPath].rule}` : exp.refused.status === 409 ? `trial_${ROUTE[reqPath].rule}` : `premium_day_${ROUTE[reqPath].rule}`}`), 1);
          } else {
            assert.equal(out.answered, false, 'must be served');
            assert.equal(out.res.sent, null);
            assert.deepEqual(aiCounts(r), exp.count ? [exp.count] : [], 'the served call counts once, on its own counter');
            assert.deepEqual(r.trialWrites, [], 'an AI call never spends a grading allowance');
            if (exp.wouldRefuse) assert.equal(r.telemetry.count(`fair_use.would_refuse.${exp.wouldRefuse}`), 1, 'dark: counted as a would-refuse');
            else assert.deepEqual(r.telemetry.startingWith('fair_use.would_refuse.'), []);
          }
          if (tier === 'anon-free-check' || reqPath === STEPS) {
            assert.equal(r.tierReads(), 0, 'untouched: not even a tier read');
            assert.deepEqual(r.reads, [], 'untouched: no ledger read');
          }
        });
      }
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   EDGES
   ══════════════════════════════════════════════════════════════════════════ */

test('EDGE · a trial counter moves ONLY on a served 2xx (500 / 402 / 429 downstream cost nothing)', async () => {
  for (const reqPath of [TUTOR, MLT, DETECT]) {
    const r = rig({ env: { [AI_SWITCH]: '1' } });
    await run(r, { reqPath, serve: 500 });
    await run(r, { reqPath, serve: 402 });
    await run(r, { reqPath, serve: 429 });
    assert.deepEqual(aiCounts(r), [], reqPath);
    await run(r, { reqPath, serve: 200 });
    assert.deepEqual(aiCounts(r), [{ [ROUTE[reqPath].field]: 1 }], `${reqPath}: CONTROL — a 2xx counts`);
    assert.equal(r.ledgerFs.writes[0].path, `usageLedger/stu-1/days/${TODAY}`, 'on TODAY\'s existing ledger day document');
    assert.equal(r.ledgerFs.writes[0].merge, true);
  }
});

test('EDGE · each route spends only its OWN allowance (a spent Tutor day does not block detection)', async () => {
  const days = { [TODAY]: { trialTutor: 15, trialMoreLikeThis: 0, trialDetect: 0 } };
  const env = { [AI_SWITCH]: '1' };
  assert.equal((await run(rig({ days, env }), { reqPath: TUTOR })).answered, true);
  assert.equal((await run(rig({ days, env }), { reqPath: DETECT })).answered, false);
  assert.equal((await run(rig({ days, env }), { reqPath: MLT })).answered, false);
});

test('EDGE · the trial limits come from env (FAIR_USE_TRIAL_*_PER_DAY), with the owner\'s defaults', async () => {
  assert.equal(typeof fairUse.resolveAiLimits, 'function', 'resolveAiLimits is exported');
  assert.deepEqual(fairUse.resolveAiLimits({}), { tutorPerDay: 15, moreLikeThisPerDay: 5, detectPerDay: 10 });
  const env = { [AI_SWITCH]: '1', FAIR_USE_TRIAL_TUTOR_PER_DAY: '20', FAIR_USE_TRIAL_MLT_PER_DAY: '2', FAIR_USE_TRIAL_DETECT_PER_DAY: '3' };
  assert.deepEqual(fairUse.resolveAiLimits(env), { tutorPerDay: 20, moreLikeThisPerDay: 2, detectPerDay: 3 });
  // 15 Tutor turns used: refused at the default, served at 20.
  const days = { [TODAY]: { trialTutor: 15, trialMoreLikeThis: 2, trialDetect: 3 } };
  assert.equal((await run(rig({ days, env: { [AI_SWITCH]: '1' } }), { reqPath: TUTOR })).answered, true);
  assert.equal((await run(rig({ days, env }), { reqPath: TUTOR })).answered, false);
  assert.equal((await run(rig({ days, env }), { reqPath: MLT })).answered, true, 'a LOWER env limit refuses earlier');
  assert.equal((await run(rig({ days, env }), { reqPath: DETECT })).answered, true);
  // Junk env -> the default, never 0 / NaN.
  assert.deepEqual(fairUse.resolveAiLimits({ FAIR_USE_TRIAL_TUTOR_PER_DAY: 'abc', FAIR_USE_TRIAL_MLT_PER_DAY: '0', FAIR_USE_TRIAL_DETECT_PER_DAY: '-4' }),
    { tutorPerDay: 15, moreLikeThisPerDay: 5, detectPerDay: 10 });
});

test('EDGE · the switch is EXACTLY "1" — "true", "yes", "0", " 1 " trimmed', async () => {
  const days = { [TODAY]: { trialTutor: 15 } };
  for (const v of ['true', 'yes', '0', 'on', '']) {
    assert.equal((await run(rig({ days, env: { [AI_SWITCH]: v } }), { reqPath: TUTOR })).answered, false, `"${v}" is dark`);
  }
  assert.equal((await run(rig({ days, env: { [AI_SWITCH]: ' 1 ' } }), { reqPath: TUTOR })).answered, true, 'trimmed "1" enforces (same rule as FAIR_USE_ENFORCE)');
});

test('EDGE · trial allowances reset on the IST day boundary, not the UTC one', async () => {
  const days = { [TODAY]: { trialTutor: 15 } };
  const env = { [AI_SWITCH]: '1' };
  assert.equal((await run(rig({ days, env, now: Date.UTC(2026, 8, 27, 18, 29, 59) }), { reqPath: TUTOR })).answered, true);
  const after = rig({ days, env, now: Date.UTC(2026, 8, 27, 18, 30, 0) });
  assert.equal((await run(after, { reqPath: TUTOR })).answered, false, '00:00 IST restores the day');
  assert.deepEqual(after.reads, [['2026-09-28']], 'a trial reads only today\'s ledger document');
});

test('EDGE · Premium is refused on EVERY window grading refuses on (5-hour / day / week), same body', async () => {
  const env = { [AI_SWITCH]: '1' };
  const cases = [
    ['week', { [TODAY]: { costMicroInr: 20 * INR }, [istDayKey(NOW - 86400000)]: { costMicroInr: 30 * INR }, [istDayKey(NOW - 2 * 86400000)]: { costMicroInr: 35 * INR } }],
    ['fiveHour', { [TODAY]: { costMicroInr: 25 * INR, hourCostMicroInr: { 11: 25 * INR } } }],
  ];
  for (const [window, days] of cases) {
    for (const reqPath of [TUTOR, MLT, DETECT]) {
      const r = rig({ tier: 'premium', days, env });
      const out = await run(r, { reqPath });
      assert.equal(out.answered, true, `${window} ${reqPath}`);
      assert.equal(out.res.sent.status, 429);
      assert.equal(out.res.sent.body.error, 'usage_limit');
      assert.equal(out.res.sent.body.window, window);
      assert.deepEqual(Object.keys(out.res.sent.body).sort(), ['error', 'resetAt', 'window'], 'grading\'s exact 429 shape');
      // The SAME ledger refuses grading identically (the decision is shared).
      const g = rig({ tier: 'premium', days, env: { FAIR_USE_ENFORCE: '1' } });
      const graded = await run(g, { reqPath: CHECK });
      assert.deepEqual(graded.res.sent.body, out.res.sent.body, 'identical to grading\'s refusal');
    }
  }
});

test('EDGE · grading refusals are UNCHANGED with the new switch on or off; the new switch never refuses grading', async () => {
  const days = { [TODAY]: { trialChecks: 5 } };
  for (const ai of [undefined, '1']) {
    const env = { FAIR_USE_ENFORCE: '1', ...(ai ? { [AI_SWITCH]: ai } : {}) };
    const out = await run(rig({ days, env }), { reqPath: CHECK });
    assert.equal(out.answered, true, `FAIR_USE_ENFORCE=1, ALL_AI=${ai}: grading still refused`);
    assert.deepEqual(out.res.sent, { status: 409, body: { error: 'trial_limit', remaining: 0, resetAt: NEXT_IST_MIDNIGHT } });
  }
  const onlyAi = rig({ days, env: { [AI_SWITCH]: '1' } });
  const out = await run(onlyAi, { reqPath: CHECK });
  assert.equal(out.answered, false, 'FAIR_USE_ENFORCE_ALL_AI alone must NOT refuse a grade');
  assert.equal(onlyAi.telemetry.count('fair_use.would_refuse.trial_checks'), 1);
  // ...and the grading switch alone never refuses the AI routes (the TABLE's unset column).
  const onlyGrading = rig({ days: { [TODAY]: { trialTutor: 99 } }, env: { FAIR_USE_ENFORCE: '1' } });
  assert.equal((await run(onlyGrading, { reqPath: TUTOR })).answered, false);
});

test('EDGE · Show steps is NEVER refused — any tier, any switch, any spend', async () => {
  const days = { [TODAY]: { trialTutor: 99, trialMoreLikeThis: 99, trialDetect: 99, trialChecks: 99, costMicroInr: 999 * INR } };
  for (const tier of ['free', 'trial', 'premium']) {
    const r = rig({ tier, days, env: { FAIR_USE_ENFORCE: '1', [AI_SWITCH]: '1' } });
    const out = await run(r, { reqPath: STEPS });
    assert.equal(out.answered, false, tier);
    assert.equal(r.tierReads(), 0);
    assert.deepEqual(aiCounts(r), []);
  }
});

test('EDGE · detection inside an admitted anonymous free check is admitted exactly as today', async () => {
  const r = rig({ tier: 'free', env: { [AI_SWITCH]: '1' } });
  const out = await run(r, { reqPath: DETECT, uid: '', options: { freeCheck: true } });
  assert.equal(out.answered, false);
  assert.equal(r.tierReads(), 0);
  // An unverified caller (no uid, App Check) is not metered here either.
  const anon = rig({ tier: 'free', env: { [AI_SWITCH]: '1' } });
  assert.equal((await run(anon, { reqPath: MLT, uid: '' })).answered, false);
  assert.equal(anon.tierReads(), 0);
});

test('EDGE · FAIL-OPEN: an unknown tier or an unreadable ledger serves (and the served call still counts)', async () => {
  const unknown = rig({ tier: null, env: { [AI_SWITCH]: '1' } });
  assert.equal((await run(unknown, { reqPath: MLT })).answered, false);
  assert.equal(unknown.telemetry.count('fair_use.tier_unknown'), 1);
  const down = rig({ failRead: true, env: { [AI_SWITCH]: '1' } });
  assert.equal((await run(down, { reqPath: TUTOR })).answered, false);
  assert.equal(down.telemetry.count('fair_use.ledger_unreadable'), 1);
  assert.deepEqual(aiCounts(down), [{ trialTutor: 1 }]);
  // An odd tier string is not "free": never refused.
  assert.equal((await run(rig({ tier: 'weird', env: { [AI_SWITCH]: '1' } }), { reqPath: DETECT })).answered, false);
});

test('EDGE · the free 402 is the entitlement gate\'s OWN body shape (premium_required + feature + tier + message)', async () => {
  const gate = entitlement.createEntitlementGate({ adminFirestore: null, logger: { warn() {}, info() {} } });
  for (const reqPath of [MLT, DETECT]) {
    const out = await run(rig({ tier: 'free', env: { [AI_SWITCH]: '1' } }), { reqPath });
    assert.equal(out.res.sent.status, 402);
    assert.deepEqual(out.res.sent.body, gate.denialBody(entitlement.AI_TIER_GATED_ROUTES[reqPath], { tier: 'free' }));
  }
});

async function usageMe(r) {
  const res = fakeRes();
  await r.gate.handleUsageMe({ headers: { authorization: 'Bearer ok' } }, res);
  return res.sent;
}

test('USAGE/ME · a trial caller gets the three AI counts, resets and limits — additively', async () => {
  const r = rig({ days: { [TODAY]: { trialChecks: 2, trialTutor: 4, trialMoreLikeThis: 5, trialDetect: 9 } }, env: { FAIR_USE_ENFORCE: '1' } });
  const out = await usageMe(r);
  assert.equal(out.status, 200);
  const t = out.body.trial;
  assert.equal(t.checksLeftToday, 3, 'the grading view is unchanged');
  assert.equal(t.tutorLeftToday, 11);
  assert.equal(t.moreLikeThisLeftToday, 0);
  assert.equal(t.detectLeftToday, 1);
  assert.equal(t.resets.tutor, NEXT_IST_MIDNIGHT);
  assert.equal(t.resets.moreLikeThis, NEXT_IST_MIDNIGHT);
  assert.equal(t.resets.detect, NEXT_IST_MIDNIGHT);
  assert.equal(t.resets.checks, NEXT_IST_MIDNIGHT);
  assert.deepEqual(t.limits, { checksPerDay: 5, chapterTestsPerDay: 1, mocksPerWeek: 1, worksheetsPerWeek: 1, tutorPerDay: 15, moreLikeThisPerDay: 5, detectPerDay: 10 });
  // Env-tuned limits reach usage/me.
  const tuned = await usageMe(rig({ env: { FAIR_USE_TRIAL_TUTOR_PER_DAY: '30' } }));
  assert.equal(tuned.body.trial.limits.tutorPerDay, 30);
  assert.equal(tuned.body.trial.tutorLeftToday, 30);
  // Premium view unchanged: no trial limits, no counts, the same four top-level keys.
  const p = await usageMe(rig({ tier: 'premium' }));
  assert.deepEqual(Object.keys(p.body).sort(), ['enforced', 'premium', 'tier', 'trial']);
  assert.equal(p.body.trial, null);
});

test('STATIC · grading prompt assembly and usageLedger.cjs carry no AI-metering code', () => {
  const fs = require('node:fs');
  const ledgerSrc = fs.readFileSync(path.join(__dirname, 'usageLedger.cjs'), 'utf8');
  assert.doesNotMatch(ledgerSrc, /trialTutor|trialMoreLikeThis|trialDetect|ALL_AI/);
});

/* ══════════════════════════════════════════════════════════════════════════
   WIRING · THE REAL index.cjs, OVER HTTP
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

/** fairUse.test.cjs's launcher (firebase-admin + fetch swapped before index.cjs loads) + a FREE student. */
function bootServer(port, extraEnv, seed) {
  const launcher = `
    const Module = require('module');
    const SEED = JSON.parse(process.env.FAIR_USE_TEST_SEED || '{}');
    const TOKENS = { 'trial-token': 'trial-student', 'premium-token': 'premium-student', 'free-token': 'free-student' };
    const SUBS = {
      'trial-student': { tier: 'trial', trialStartDate: { seconds: Math.floor(Date.now() / 1000) - 86400 } },
      'premium-student': { tier: 'premium' },
      'free-student': { tier: 'free' },
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
      delete: async () => {},
    });
    const collRef = (p) => ({ doc: (id) => docRef(p + '/' + id) });
    const firestore = () => ({
      collection: (n) => collRef(n),
      runTransaction: async (fn) => fn({
        get: (ref) => ref.get(),
        getAll: (...refs) => Promise.all(refs.map((r) => r.get())),
        set(ref, data, opts) { ref.set(data, opts); return this; },
        delete(ref) { ref.delete(); return this; },
      }),
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
          usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 0, totalTokenCount: 1200 },
        }),
      };
    };
    require(${JSON.stringify(INDEX_CJS)});
  `;
  const env = { ...process.env, PORT: String(port) };
  for (const k of Object.keys(env)) {
    if (k.startsWith('LT_TEST_CLOCK')) continue;
    if (/^(AI_INTEGRATIONS_|GEMINI_|WARM_POOL_|LT_|FAIR_USE_|FREE_CHECK_)/.test(k)) delete env[k];
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
        res.on('end', () => resolve({ status: res.statusCode, text }));
      }
    );
    req.on('error', reject);
    req.end(payload || undefined);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const count = (log, re) => (log.match(re) || []).length;
const TUTOR_BODY = { topicLabel: 'Electricity', subject: 'science', messages: [{ role: 'user', content: 'what is ohm law' }] };

test('WIRING · REAL index.cjs, FAIR_USE_ENFORCE_ALL_AI=1: refused BEFORE Gemini and never counted; Show steps untouched',
  { timeout: 180000 }, async (t) => {
    const today = istDayKey(Date.now());
    const port = await freePort();
    const srv = bootServer(port, { [AI_SWITCH]: '1' }, {
      [`usageLedger/trial-student/days/${today}`]: { trialTutor: 15 },
      [`usageLedger/premium-student/days/${today}`]: { costMicroInr: 40 * INR },
    });
    t.after(() => srv.child.kill());
    await srv.ready;

    // Trial at the Tutor cap -> 409, no model call, no counter write.
    let before = srv.log();
    let res = await request(port, 'POST', TUTOR, TUTOR_BODY, { authorization: 'Bearer trial-token' });
    await wait(300);
    let delta = srv.log().slice(before.length);
    assert.equal(res.status, 409, `${res.text}\n${delta}`);
    assert.equal(JSON.parse(res.text).error, 'trial_limit');
    assert.equal(count(delta, /GEMINI_FETCH/g), 0, `a refused Tutor turn reached the model\n${delta}`);
    assert.equal(count(delta, /trialTutor/g), 0, 'a refused call was counted');

    // Premium at the day cap -> 429 usage_limit, no model call.
    before = srv.log();
    res = await request(port, 'POST', TUTOR, TUTOR_BODY, { authorization: 'Bearer premium-token' });
    await wait(300);
    delta = srv.log().slice(before.length);
    assert.equal(res.status, 429, res.text);
    assert.deepEqual(Object.keys(JSON.parse(res.text)).sort(), ['error', 'resetAt', 'window']);
    assert.equal(count(delta, /GEMINI_FETCH/g), 0, delta);

    // Free signed-in student: More-like-this -> 402 premium_required, no model call.
    before = srv.log();
    res = await request(port, 'POST', MLT, { question: 'x' }, { authorization: 'Bearer free-token' });
    await wait(300);
    delta = srv.log().slice(before.length);
    assert.equal(res.status, 402, res.text);
    assert.equal(JSON.parse(res.text).error, 'premium_required');
    assert.equal(count(delta, /GEMINI_FETCH/g), 0, delta);

    // Trial with detection left -> SERVED (CONTROL: the gate is not refusing everything).
    before = srv.log();
    res = await request(port, 'POST', DETECT, { imageBase64: 'aGVsbG8=', mimeType: 'image/png' }, { authorization: 'Bearer trial-token' });
    await wait(300);
    assert.notEqual(res.status, 409, res.text);
    assert.notEqual(res.status, 402, res.text);

    // Show steps: never refused by this lane, even for the over-cap Premium student.
    res = await request(port, 'POST', STEPS, { question: 'Solve x + 1 = 2' }, { authorization: 'Bearer premium-token' });
    assert.notEqual(res.status, 429, res.text);
    assert.notEqual(res.status, 409, res.text);
  });

test('WIRING · REAL index.cjs, FAIR_USE_ENFORCE_ALL_AI UNSET (the ship state): the over-cap Tutor turn is SERVED and counted',
  { timeout: 120000 }, async (t) => {
    const today = istDayKey(Date.now());
    const port = await freePort();
    // FAIR_USE_ENFORCE=1 too: the grading switch must not refuse the Tutor.
    const srv = bootServer(port, { FAIR_USE_ENFORCE: '1' }, {
      [`usageLedger/trial-student/days/${today}`]: { trialTutor: 15 },
    });
    t.after(() => srv.child.kill());
    await srv.ready;
    const before = srv.log();
    const res = await request(port, 'POST', TUTOR, TUTOR_BODY, { authorization: 'Bearer trial-token' });
    for (let i = 0; i < 40 && !/trialTutor/.test(srv.log().slice(before.length)); i++) await wait(50);
    const delta = srv.log().slice(before.length);
    assert.equal(res.status, 200, `dark must not refuse: ${res.text}\n${delta}`);
    assert.ok(count(delta, /GEMINI_FETCH/g) >= 1, `the Tutor turn must reach the model\n${delta}`);
    assert.ok(delta.includes(`LEDGER_SET usageLedger/trial-student/days/${today} {"trialTutor":{"increment":1}}`),
      `the served turn is counted once\n${delta}`);
    // Free student MLT while dark: served (today's behaviour), not 402.
    const free = await request(port, 'POST', MLT, { question: 'x' }, { authorization: 'Bearer free-token' });
    assert.notEqual(free.status, 402, free.text);
  });
