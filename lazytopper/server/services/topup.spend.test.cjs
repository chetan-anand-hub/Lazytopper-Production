/**
 * topup.spend.test.cjs - TOPUP-1 PR-1: extra-usage credit is SPENT at the refusal point, and only there.
 *
 * Run: `node --test server/services/topup.spend.test.cjs`
 * Wired into `lazytopper` test:matrix:all as `test:server:topup-spend`.
 *
 * Pinned (spec §2 items 3/4/7, §3 gates):
 *   GATE    a Premium request the window would refuse is served from credit - Tutor included - when BOTH switches
 *           are on and the live balance covers the estimate; it is refused exactly as before when either switch is
 *           off, the balance is short or expired, the tier is trial/free, or the window still has allowance
 *           (credit is never read before the cap).
 *   LEDGER  a credit-mode request charges credit and leaves the window's cost + hour bucket untouched; a normal
 *           request is unchanged (CONTROL).
 *   VIEW    /api/usage/me carries `credit` only when both switches are on and something was bought - never a rupee
 *           figure; with either switch off the body is byte-identical to before.
 *   PRICES  the pack breakdown "about N" is floor(credit / cost) for every activity, from the constants.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { createFairUse } = require('./fairUse.cjs');
const { createUsageLedger, runWithRequestContext, bindRequestUid, markCreditMode } = require('./usageLedger.cjs');
const { topupBreakdownFor, TOPUP_ACTIVITIES, MICRO_INR_PER_INR, topupCreditFor } = require('./passPricing.cjs');
const credit = require('./usageCredit.cjs');

const NOW = Date.UTC(2026, 8, 27, 6, 0, 0); // 11:30 IST
const TODAY = '2026-09-27';
const INR = 1e6;
const ON = { PAYMENTS_ENABLED: '1', TOPUP_ENABLED: '1', FAIR_USE_ENFORCE: '1', FAIR_USE_ENFORCE_ALL_AI: '1' };
const FUTURE = NOW + 90 * 86_400_000;

function recorder() {
  const events = [];
  return { events, increment: (e) => events.push(e), count: (e) => events.filter((x) => x === e).length };
}

/** A Firestore whose usageCredits/{uid} doc is `stored`; counts credit reads. */
function creditFirestore(stored) {
  const state = { reads: 0, doc: stored };
  const db = {
    collection: (name) => ({
      doc: () => ({
        async get() {
          if (name === 'usageCredits') state.reads += 1;
          return { exists: name === 'usageCredits' && state.doc !== null, data: () => state.doc };
        },
      }),
    }),
  };
  return { state, resolve: () => ({ db, FieldValue: { increment: (n) => ({ increment: n }) } }) };
}

const stored = (over = {}) => ({
  balanceMicroInr: 20 * INR,
  boughtMicroInr: 20 * INR,
  boughtBaseMicroInr: 20 * INR,
  spentMicroInr: 0,
  expiresAtMs: FUTURE,
  ...over,
});

function rig({ tier = 'premium', env = ON, doc = stored(), days } = {}) {
  const telemetry = recorder();
  const fs = creditFirestore(doc);
  const gate = createFairUse({
    tierOf: async () => tier,
    ledger: {
      async readDays(_uid, keys) {
        return new Map(keys.map((k) => [k, (days && days[k]) || {}]));
      },
      recordTrialUse: () => Promise.resolve(true),
    },
    telemetry,
    env,
    now: () => NOW,
    readJson: async (req) => req.__body || {},
    resolveFirestore: fs.resolve,
    sendJson: (res, status, body) => { res.sent = { status, body }; },
    verifiedCaller: { resolveVerifiedUid: async () => 'stu-1' },
  });
  return { gate, telemetry, fs };
}

// Premium day cap is 38 INR by default (fairUse.allAi.test.cjs daysFor): at cap / under cap.
const AT_CAP = { [TODAY]: { costMicroInr: 38 * INR } };
const UNDER_CAP = { [TODAY]: { costMicroInr: 1 * INR } };

async function through(r, reqPath) {
  const req = { headers: {} };
  const res = new EventEmitter();
  res.statusCode = 0;
  res.sent = null;
  // The gateway binds a request context before the gate runs (index.cjs); credit mode lives in it.
  const answered = await runWithRequestContext(async () => {
    bindRequestUid('stu-1', reqPath);
    return r.gate.applyToRequest(req, res, reqPath, 'stu-1', undefined);
  });
  return { answered, res };
}

const TUTOR = '/api/tutor';
const CHECK = '/api/check-solution';

test('GATE ★★ Premium at cap + both switches + balance covers -> SERVED from credit, for the Tutor and for grading', async () => {
  for (const path of [TUTOR, CHECK]) {
    const r = rig({ days: AT_CAP });
    const { answered, res } = await through(r, path);
    assert.equal(answered, false, `${path} must be let through`);
    assert.equal(res.sent, null);
    assert.equal(r.telemetry.count('fair_use.credit_served'), 1);
    assert.equal(r.telemetry.count('fair_use.refused.premium_day'), 0);
  }
});

test('GATE ★★ NEVER before the cap: a Premium request under cap is served normally and the credit is not even read', async () => {
  const r = rig({ days: UNDER_CAP });
  const { answered } = await through(r, TUTOR);
  assert.equal(answered, false);
  assert.equal(r.fs.state.reads, 0, 'credit must not be read while the window has allowance');
  assert.equal(r.telemetry.count('fair_use.credit_served'), 0);
});

test('GATE ★ dark: either switch off -> refused exactly as before (429 usage_limit), credit never read', async () => {
  for (const env of [
    { ...ON, TOPUP_ENABLED: '' },
    { ...ON, PAYMENTS_ENABLED: '' },
    { FAIR_USE_ENFORCE: '1', FAIR_USE_ENFORCE_ALL_AI: '1' },
  ]) {
    const r = rig({ env, days: AT_CAP });
    const { answered, res } = await through(r, TUTOR);
    assert.equal(answered, true);
    assert.equal(res.sent.status, 429);
    assert.equal(res.sent.body.error, 'usage_limit');
    assert.equal(r.fs.state.reads, 0);
    assert.equal(r.telemetry.count('fair_use.credit_served'), 0);
  }
});

test('GATE ★ a balance that does not cover the estimate, an expired balance and no document -> the normal refusal', async () => {
  const cases = {
    short: stored({ balanceMicroInr: 1000 }),
    expired: stored({ expiresAtMs: NOW - 1 }),
    none: null,
  };
  for (const [name, doc] of Object.entries(cases)) {
    const r = rig({ doc, days: AT_CAP });
    const { answered, res } = await through(r, TUTOR);
    assert.equal(answered, true, name);
    assert.equal(res.sent.status, 429, name);
    assert.equal(r.telemetry.count('fair_use.credit_served'), 0, name);
  }
});

test('GATE ★ trial and free never spend credit: a trial student at the Tutor cap is still refused 409', async () => {
  const r = rig({ tier: 'trial', days: { [TODAY]: { trialTutor: 15 } } });
  const { answered, res } = await through(r, TUTOR);
  assert.equal(answered, true);
  assert.equal(res.sent.status, 409);
  assert.equal(r.fs.state.reads, 0);
});

test('GATE ★ switch FAIR_USE_ENFORCE_ALL_AI unset: the Tutor at cap is only a would_refuse, and credit is not read (nothing to spend)', async () => {
  const r = rig({ env: { ...ON, FAIR_USE_ENFORCE_ALL_AI: '' }, days: AT_CAP });
  const { answered } = await through(r, TUTOR);
  assert.equal(answered, false);
  assert.equal(r.fs.state.reads, 0);
});

/* ── LEDGER ─────────────────────────────────────────────────────────────── */

function ledgerRig() {
  const writes = [];
  const txCharges = [];
  const FieldValue = { increment: (n) => ({ __increment: n }) };
  const db = {
    collection: (name) => ({
      doc: (id) => ({
        collection: (n2) => ({ doc: (id2) => ({ set(data) { writes.push({ path: `${name}/${id}/${n2}/${id2}`, data }); return Promise.resolve(); } }) }),
        set(data) { writes.push({ path: `${name}/${id}`, data }); return Promise.resolve(); },
      }),
    }),
    runTransaction: async (fn) => {
      const tx = {
        get: async () => ({ exists: true, data: () => stored() }),
        set: (_ref, data) => { txCharges.push(data); },
      };
      return fn(tx);
    },
  };
  const ledger = createUsageLedger({ resolveFirestore: () => ({ db, FieldValue }), telemetry: recorder(), now: () => NOW, env: {} });
  return { ledger, writes, txCharges };
}

const RECORD = { model: 'gemini-2.5-flash', promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 800 };

async function recordIn(rg, { creditMode }) {
  await runWithRequestContext(async () => {
    bindRequestUid('stu-1', '/api/check-solution');
    if (creditMode) assert.equal(markCreditMode(), true);
    rg.ledger.recordUsage(RECORD);
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
}

test('LEDGER ★★ a credit-mode call charges CREDIT and leaves the window cost + hour bucket untouched', async () => {
  const rg = ledgerRig();
  await recordIn(rg, { creditMode: true });
  const day = rg.writes.find((w) => w.path.includes('/'));
  assert.ok(day, 'the day doc still records calls and tokens');
  assert.equal(day.data.costMicroInr, undefined, 'window cost must NOT move');
  assert.equal(Object.keys(day.data).some((k) => /hour/i.test(k)), false, 'hour bucket must NOT move');
  assert.ok(day.data.calls && day.data.promptTokens, 'calls + tokens are still counted');
  assert.equal(rg.txCharges.length, 1, 'exactly one credit charge');
  assert.ok(rg.txCharges[0].spentMicroInr > 0 && rg.txCharges[0].balanceMicroInr < 20 * INR);
});

test('LEDGER ★ CONTROL: a normal call moves the window cost and charges no credit', async () => {
  const rg = ledgerRig();
  await recordIn(rg, { creditMode: false });
  const day = rg.writes.find((w) => w.data && w.data.costMicroInr);
  assert.ok(day && day.data.costMicroInr.__increment > 0);
  assert.equal(rg.txCharges.length, 0);
});

/* ── VIEW (/api/usage/me) ───────────────────────────────────────────────── */

async function usageMe(env, doc) {
  const fs = creditFirestore(doc);
  const gate = createFairUse({
    tierOf: async () => 'premium',
    ledger: { async readDays(_u, keys) { return new Map(keys.map((k) => [k, {}])); } },
    telemetry: recorder(),
    env,
    now: () => NOW,
    resolveFirestore: fs.resolve,
    sendJson: (res, status, body) => { res.sent = { status, body }; },
    verifiedCaller: { resolveVerifiedUid: async () => 'stu-1' },
  });
  const res = { sent: null };
  await gate.handleUsageMe({ headers: {} }, res);
  return res.sent.body;
}

test('VIEW ★★ dark: with either switch off the usage body has NO credit key; on + bought -> a rupee-free view', async () => {
  assert.equal('credit' in (await usageMe({ ...ON, TOPUP_ENABLED: '' }, stored())), false);
  assert.equal('credit' in (await usageMe({ FAIR_USE_ENFORCE: '1' }, stored())), false);
  const on = await usageMe(ON, stored({ balanceMicroInr: 10 * INR }));
  assert.equal(on.credit.leftPct, 50);
  assert.equal(on.credit.aboutChecks, Math.floor(10 / TOPUP_ACTIVITIES.answer_check.costInr));
  assert.equal(on.credit.aboutTutorMessages, Math.floor(10 / TOPUP_ACTIVITIES.tutor_message.costInr));
  assert.equal(JSON.stringify(on.credit).match(/micro|inr|rupee|₹/i), null, 'no rupee figure in the student view');
});

test('VIEW ★ nothing ever bought -> no credit key even with both switches on', async () => {
  assert.equal('credit' in (await usageMe(ON, null)), false);
});

/* ── PRICES ─────────────────────────────────────────────────────────────── */

test('PRICES ★★ every "about N" is floor(credit / cost) from the constants; the bonus (0 at launch) moves them; changing a constant changes the sheet', () => {
  for (const key of ['topup_49', 'topup_149']) {
    const b = topupBreakdownFor(key, NOW);
    const total = topupCreditFor(key, NOW).totalMicroInr;
    assert.equal(b.bonusPercent, 0, 'no offer at launch');
    for (const row of b.rows) {
      assert.equal(row.about, Math.floor(total / (TOPUP_ACTIVITIES[row.activity].costInr * MICRO_INR_PER_INR)));
    }
  }
  const base = topupBreakdownFor('topup_49', NOW).rows.find((r) => r.activity === 'answer_check').about;
  const boosted = topupBreakdownFor('topup_49', NOW, { percent: 25, endsIso: null }).rows.find((r) => r.activity === 'answer_check');
  assert.ok(boosted.about > base, 'a positive bonus raises the numbers');
  assert.equal(topupBreakdownFor('topup_49', NOW, { percent: 25, endsIso: '2026-01-01' }).bonusPercent, 0, 'a past end date stops the bonus');
  assert.equal(topupBreakdownFor('nope', NOW), null);
});

test('credit helpers: describeCredit expiry and creditCovers edge cases', () => {
  assert.equal(credit.describeCredit(stored({ expiresAtMs: NOW - 1 }), NOW).balanceMicroInr, 0);
  assert.equal(credit.creditCovers(0, 0), false);
  assert.equal(credit.creditCovers(5, 5), true);
});
