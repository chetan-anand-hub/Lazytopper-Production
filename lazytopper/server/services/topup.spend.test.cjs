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
 *   PRICES  the pack breakdown "about N" is floor(credit / cost) for every activity, from the constants, at the
 *           model price IN FORCE at view time (gemini-3.8-flash doubles on 2027-01-01).
 *   RACE    FU-TOPUP-RACE: two parallel requests on one request's worth of credit -> one served, one refused.
 *   30DAY   the 30-day Premium cap (FAIR_USE_PREMIUM_30DAY_INR) reaches the AI routes, not just grading.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { createFairUse } = require('./fairUse.cjs');
const { createUsageLedger, runWithRequestContext, bindRequestUid, markCreditMode } = require('./usageLedger.cjs');
const { topupBreakdownFor, TOPUP_ACTIVITIES, MICRO_INR_PER_INR, topupCreditFor, creditEstimateMicroInr } = require('./passPricing.cjs');
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

/**
 * A Firestore whose usageCredits/stu-1 doc is `stored`; counts credit reads (plain AND transactional).
 * ★ runTransaction is OPTIMISTIC like the real one (the passGrant / payments.test harness): every read
 *   records the document's version, a commit whose read set moved is RETRIED, and every await yields, so
 *   two parallel transactions genuinely interleave.
 */
function creditFirestore(stored) {
  const state = { reads: 0, doc: stored === null ? null : { ...stored }, version: stored === null ? 0 : 1, commits: 0, retries: 0 };
  const yieldNow = () => new Promise((r) => setImmediate(r));
  const KEY = 'usageCredits/stu-1';
  const snap = () => ({ exists: state.doc !== null, data: () => (state.doc ? { ...state.doc } : undefined) });
  const ref = (name, id) => ({
    key: `${name}/${id}`,
    async get() {
      await yieldNow();
      if (name === 'usageCredits') state.reads += 1;
      return name === 'usageCredits' ? snap() : { exists: false, data: () => undefined };
    },
  });
  const db = {
    collection: (name) => ({ doc: (id) => ref(name, id) }),
    async runTransaction(fn) {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        let seen = null;
        const pending = [];
        const tx = {
          async get(r) {
            await yieldNow();
            if (r.key === KEY) { state.reads += 1; seen = state.version; return snap(); }
            return { exists: false, data: () => undefined };
          },
          set(r, data, opts) { pending.push([r.key, data, opts]); },
        };
        const out = await fn(tx);
        await yieldNow();
        if (seen !== null && seen !== state.version) { state.retries += 1; continue; }
        for (const [k, d, o] of pending) {
          if (k !== KEY) continue;
          state.doc = { ...(o && o.merge && state.doc ? state.doc : {}), ...d };
          state.version += 1;
        }
        state.commits += 1;
        return out;
      }
      throw new Error('transaction contention: too many retries');
    },
  };
  return { state, resolve: () => ({ db, FieldValue: { increment: (n) => ({ increment: n }) } }) };
}

const stored = (over = {}) => ({
  balanceMicroInr: 25 * INR,
  boughtMicroInr: 25 * INR,
  boughtBaseMicroInr: 25 * INR,
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
  assert.ok(rg.txCharges[0].spentMicroInr > 0 && rg.txCharges[0].balanceMicroInr < 25 * INR);
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
  assert.equal(on.credit.leftPct, 40); // 10 of 25 left
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

/* ── RACE (FU-TOPUP-RACE) ───────────────────────────────────────────────── */

test('RACE ★★ two PARALLEL Premium requests at cap with credit for ONE: the first is served from credit, the second is REFUSED (429)', async () => {
  // Exactly one answer check's estimate is left (at the price in force NOW).
  const one = creditEstimateMicroInr('answer_check', 1, NOW);
  const r = rig({ days: AT_CAP, doc: stored({ balanceMicroInr: one }) });
  const [a, b] = await Promise.all([through(r, CHECK), through(r, CHECK)]);
  const served = [a, b].filter((x) => x.answered === false);
  const refused = [a, b].filter((x) => x.answered === true);
  assert.equal(served.length, 1, 'exactly one request may be served on one request\'s worth of credit');
  assert.equal(refused.length, 1, 'the second parallel request must be refused');
  assert.equal(refused[0].res.sent.status, 429);
  assert.equal(refused[0].res.sent.body.error, 'usage_limit');
  assert.equal(r.telemetry.count('fair_use.credit_served'), 1);
  // The admitted request holds the credit until its metered cost arrives (or the hold lapses).
  const live = credit.describeCredit(r.fs.state.doc, NOW);
  assert.equal(live.heldMicroInr, one);
  assert.equal(live.availableMicroInr, 0);
});

test('RACE ★ CONTROL: with credit for TWO, both parallel requests are served (the fix refuses only what is not covered)', async () => {
  const one = creditEstimateMicroInr('answer_check', 1, NOW);
  const r = rig({ days: AT_CAP, doc: stored({ balanceMicroInr: 2 * one }) });
  const both = await Promise.all([through(r, CHECK), through(r, TUTOR)]);
  assert.deepEqual(both.map((x) => x.answered), [false, false]);
  assert.equal(r.telemetry.count('fair_use.credit_served'), 2);
});

test('RACE ★ holds: a charge draws the hold down; a hold lapses by itself after CREDIT_HOLD_TTL_MS; the charge never exceeds the balance', async () => {
  const fs = creditFirestore(stored({ balanceMicroInr: 5 * INR }));
  const db = fs.resolve().db;
  const h = await credit.reserveCredit({ uid: 'stu-1', amountMicroInr: 3 * INR, nowMs: NOW }, { firestore: db });
  assert.equal(h.reserved, true);
  assert.equal(credit.describeCredit(fs.state.doc, NOW).availableMicroInr, 2 * INR);
  assert.equal((await credit.reserveCredit({ uid: 'stu-1', amountMicroInr: 3 * INR, nowMs: NOW }, { firestore: db })).reserved, false, 'only 2 left after the hold');
  assert.deepEqual(await credit.chargeCredit({ uid: 'stu-1', amountMicroInr: 1 * INR, nowMs: NOW, holdId: h.holdId }, { firestore: db }), { charged: 1 * INR });
  const after = credit.describeCredit(fs.state.doc, NOW);
  assert.equal(after.balanceMicroInr, 4 * INR);
  assert.equal(after.heldMicroInr, 2 * INR, 'the hold shrank by the charge');
  assert.equal(after.availableMicroInr, 2 * INR);
  const later = NOW + credit.CREDIT_HOLD_TTL_MS + 1;
  assert.equal(credit.describeCredit(fs.state.doc, later).availableMicroInr, 4 * INR, 'a lapsed hold frees its credit');
  assert.equal((await credit.reserveCredit({ uid: 'stu-1', amountMicroInr: 0, nowMs: NOW }, { firestore: db })).reserved, false, 'a zero hold is never granted');
});

/* ── PRICE IN FORCE AT VIEW TIME (gemini-3.8-flash doubles on 2027-01-01) ── */

const { IST_2027_01_01_MS } = require('./modelPrices.cjs');
const { aboutCountFor, creditEstimateMicroInr: estimateAt } = require('./passPricing.cjs');

test('PRICES ★★ the "about N" breakdown uses the model price IN FORCE at view time: grading rows halve from 2027-01-01, Tutor rows do not', () => {
  const before = Object.fromEntries(topupBreakdownFor('topup_49', IST_2027_01_01_MS - 1).rows.map((r) => [r.activity, r.about]));
  const after = Object.fromEntries(topupBreakdownFor('topup_49', IST_2027_01_01_MS).rows.map((r) => [r.activity, r.about]));
  // ₹25 of credit (never shown): 25 / 2.05 = 12 checks; at double the grading price 25 / 4.10 = 6.
  assert.equal(before.answer_check, 12);
  assert.equal(after.answer_check, 6);
  assert.equal(before.full_mock_grading, 5);
  assert.equal(after.full_mock_grading, 2);
  assert.equal(before.chapter_test_grading, 15);
  assert.equal(after.chapter_test_grading, 7);
  // The Tutor / detection / More-like-this run gemini-2.5-flash, whose price does not change.
  assert.equal(before.tutor_message, 70);
  assert.equal(after.tutor_message, 70);
  assert.equal(after.question_detection, before.question_detection);
  // ₹149 pack: 80 / 2.05 = 39 checks -> 19.
  const big = (at) => topupBreakdownFor('topup_149', at).rows.find((r) => r.activity === 'answer_check').about;
  assert.equal(big(IST_2027_01_01_MS - 1), 39);
  assert.equal(big(IST_2027_01_01_MS), 19);
  // The admission estimate (what is held) follows the same price.
  assert.equal(estimateAt('answer_check', 1, IST_2027_01_01_MS), 2 * estimateAt('answer_check', 1, IST_2027_01_01_MS - 1));
  assert.equal(estimateAt('papers', 10, IST_2027_01_01_MS), 2 * estimateAt('papers', 10, IST_2027_01_01_MS - 1));
  assert.equal(aboutCountFor(25 * INR, 'answer_check', IST_2027_01_01_MS), 6);
});

test('PRICES ★ paper rows are flagged as ESTIMATES (D97); measured rows are not', () => {
  const rows = topupBreakdownFor('topup_49', NOW).rows;
  const flagged = rows.filter((r) => r.estimate).map((r) => r.activity).sort();
  assert.deepEqual(flagged, ['chapter_test_grading', 'full_mock_grading', 'worksheet_grading']);
  assert.equal(JSON.stringify(topupBreakdownFor('topup_49', NOW)).match(/micro|creditInr|₹/i), null, 'the sheet carries no credit rupee figure');
});

test('VIEW ★★ /api/usage/me prices its "about N" at the instant of the read: the same balance shows half the checks on 2027-01-01', async () => {
  const at = async (nowMs) => {
    // Credit bought for the 2027 boards: still live on 2027-01-01.
    const fs = creditFirestore(stored({ expiresAtMs: IST_2027_01_01_MS + 60 * DAY_MS }));
    const gate = createFairUse({
      tierOf: async () => 'premium',
      ledger: { async readDays(_u, keys) { return new Map(keys.map((k) => [k, {}])); } },
      telemetry: recorder(),
      env: ON,
      now: () => nowMs,
      resolveFirestore: fs.resolve,
      sendJson: (res, status, body) => { res.sent = { status, body }; },
      verifiedCaller: { resolveVerifiedUid: async () => 'stu-1' },
    });
    const res = { sent: null };
    await gate.handleUsageMe({ headers: {} }, res);
    return res.sent.body.credit;
  };
  const before = await at(IST_2027_01_01_MS - 1);
  const after = await at(IST_2027_01_01_MS);
  assert.equal(before.aboutChecks, 12);
  assert.equal(after.aboutChecks, 6);
  assert.equal(before.aboutTutorMessages, after.aboutTutorMessages);
  assert.equal(after.papersAreEstimates, true);
  assert.equal(JSON.stringify(after).match(/micro|rupee|₹/i), null);
});

/* ── 30-DAY CAP covers the AI routes too (owner 22 Oct) ─────────────────── */

const DAY_MS = 86_400_000;
const istKey = (ms) => new Date(ms + 5.5 * 3_600_000).toISOString().slice(0, 10);

test('30DAY ★★ with FAIR_USE_PREMIUM_30DAY_INR=450 the Tutor is refused (thirtyDay) when the spend sits 8-29 days back; with credit it is served from credit', async () => {
  // ₹450 spent on days 8..22 back (₹30 a day): nothing in the last 7 days, so only a 30-day read can see it.
  const days = {};
  for (let k = 8; k <= 22; k += 1) days[istKey(NOW - k * DAY_MS)] = { costMicroInr: 30 * INR };
  const env = { ...ON, FAIR_USE_PREMIUM_30DAY_INR: '450' };
  const none = rig({ env, days, doc: null });
  const refused = await through(none, TUTOR);
  assert.equal(refused.answered, true, 'the 30-day cap must reach the Tutor');
  assert.equal(refused.res.sent.status, 429);
  assert.equal(refused.res.sent.body.window, 'thirtyDay');
  const withCredit = rig({ env, days });
  const served = await through(withCredit, TUTOR);
  assert.equal(served.answered, false);
  assert.equal(withCredit.telemetry.count('fair_use.credit_served'), 1);
  // CONTROL: env unset -> no 30-day window at all (7-day read, unchanged behaviour).
  const off = rig({ env: ON, days, doc: null });
  assert.equal((await through(off, TUTOR)).answered, false);
});
