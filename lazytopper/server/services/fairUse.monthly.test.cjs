/**
 * fairUse.monthly.test.cjs — FAIRUSE-MONTHLY-1: a Premium window can be switched OFF by env ("off"),
 * so Board Pass shows ONE monthly bar (30-day) plus a daily safety ceiling.
 *
 * Run: `node --test server/services/fairUse.monthly.test.cjs`
 * Wired into `lazytopper` test:matrix:all as `test:server:fair-use-monthly`.
 *
 * MUTATIONS this file was verified against (each alone, RED, restored):
 *   MM-1  envWindowInr(): treat "off" as invalid (fall back to the default)  -> "off resolves to null" RED
 *   MM-2  premiumState(): enforce the 5-hour / week window though null       -> "off windows never refuse" RED
 *   MM-3  premiumState(): keep fiveHourPct / weekPct in the view when off    -> "view omits" RED
 *   MM-4  premiumState(): drop the day check                                 -> "day ceiling still refuses" RED
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { decide, premiumState, resolveLimits } = require('./fairUse.cjs');
const { istDayKey } = require('./rateLimiter.cjs');

const DAY = 86400000;
const INR = 1e6;
const NOW = Date.UTC(2026, 10, 10, 6, 0, 0); // 11:30 IST, fixed
const LIVE = Object.freeze({
  FAIR_USE_PREMIUM_30DAY_INR: '450',
  FAIR_USE_PREMIUM_DAY_INR: '150',
  FAIR_USE_PREMIUM_FIVE_HOUR_INR: 'off',
  FAIR_USE_PREMIUM_WEEK_INR: 'off',
});
const ledger = (spend) => {
  const m = new Map();
  for (const [off, inr] of Object.entries(spend)) m.set(istDayKey(NOW - Number(off) * DAY), { costMicroInr: inr * INR });
  return m;
};
const run = (days, env = LIVE) =>
  decide({ tier: 'premium', surface: 'check-improve', questionCount: 1, days, nowMs: NOW, limits: resolveLimits(env) });

test('FAIRUSE-MONTHLY-1 · "off" (any case, padded) resolves to a null limit; other windows keep their values', () => {
  for (const v of ['off', 'OFF', ' Off ']) {
    const p = resolveLimits({ ...LIVE, FAIR_USE_PREMIUM_FIVE_HOUR_INR: v, FAIR_USE_PREMIUM_WEEK_INR: v }).premium;
    assert.equal(p.fiveHourMicroInr, null, v);
    assert.equal(p.weekMicroInr, null, v);
  }
  const p = resolveLimits(LIVE).premium;
  assert.equal(p.dayMicroInr, 150 * INR);
  assert.equal(p.thirtyDayMicroInr, 450 * INR);
});

test('FAIRUSE-MONTHLY-1 · defaults unchanged when env is unset (5h 25, day 38, week 84)', () => {
  const p = resolveLimits({}).premium;
  assert.deepEqual([p.fiveHourMicroInr, p.dayMicroInr, p.weekMicroInr], [25 * INR, 38 * INR, 84 * INR]);
  const view = premiumState(ledger({ 0: 19 }), NOW, resolveLimits({})).view;
  assert.deepEqual(Object.keys(view).sort(), ['dayPct', 'fiveHourPct', 'resets', 'weekPct']);
  assert.deepEqual(Object.keys(view.resets).sort(), ['day', 'fiveHour', 'week']);
  assert.equal(view.dayPct, 50);
});

test('FAIRUSE-MONTHLY-1 · off windows never refuse (a week of 100/day is under the 450 month, under the 150 day)', () => {
  // 5 days x ₹90 = ₹450 hits the month exactly -> thirtyDay; 4 days x ₹90 = ₹360 is served though far over any week default.
  const d = run(ledger({ 0: 90, 1: 90, 2: 90, 3: 90 }));
  assert.equal(d.allowed, true);
  assert.equal(premiumState(ledger({ 0: 90, 1: 90, 2: 90, 3: 90 }), NOW, resolveLimits(LIVE)).atCap, null);
});

test('FAIRUSE-MONTHLY-1 · the 30-day cap still refuses, and the daily ceiling still refuses', () => {
  const month = run(ledger({ 0: 50, 1: 100, 2: 100, 3: 100, 4: 100 }));
  assert.equal(month.allowed, false);
  assert.equal(month.status, 429);
  assert.equal(month.body.window, 'thirtyDay');
  const day = run(ledger({ 0: 150 }));
  assert.equal(day.allowed, false);
  assert.equal(day.body.window, 'day');
  assert.equal(typeof day.body.resetAt, 'string');
  assert.equal(run(ledger({ 0: 149 })).allowed, true);
});

test('FAIRUSE-MONTHLY-1 · the view carries only 30-day + day; off windows are omitted entirely', () => {
  const view = premiumState(ledger({ 0: 120, 1: 45 }), NOW, resolveLimits(LIVE)).view;
  assert.deepEqual(Object.keys(view).sort(), ['dayPct', 'resets', 'thirtyDayPct']);
  assert.deepEqual(Object.keys(view.resets).sort(), ['day', 'thirtyDay']);
  assert.equal(view.dayPct, 80);
  assert.equal(view.thirtyDayPct, 36); // 165 of 450
  assert.doesNotMatch(JSON.stringify(view), /fiveHour|week|inr|micro|rupee|₹/i);
});

test('FAIRUSE-MONTHLY-1 · DAY may be "off" only while a valid 30-day cap is set', () => {
  // With a valid month: DAY off is honoured.
  const ok = { ...LIVE, FAIR_USE_PREMIUM_DAY_INR: 'off' };
  assert.equal(resolveLimits(ok).premium.dayMicroInr, null);
  assert.equal(run(ledger({ 0: 5000 }), { ...ok, FAIR_USE_PREMIUM_30DAY_INR: '999999' }).allowed, true);
  // 30-day unset or invalid: DAY keeps its default (38) and still refuses.
  const warns = [];
  const orig = console.warn;
  console.warn = (m) => warns.push(String(m));
  try {
    for (const m of [undefined, '', 'junk', '0', '-5', 'off']) {
      const env = { ...ok };
      if (m === undefined) delete env.FAIR_USE_PREMIUM_30DAY_INR;
      else env.FAIR_USE_PREMIUM_30DAY_INR = m;
      assert.equal(resolveLimits(env).premium.dayMicroInr, 38 * INR, `30DAY=${JSON.stringify(m)}`);
      const d = run(ledger({ 0: 38 }), env);
      assert.equal(d.allowed, false);
      assert.equal(d.body.window, 'day');
    }
  } finally {
    console.warn = orig;
  }
  assert.ok(warns.length <= 1, 'one boot warning, not one per call');
});

test('FAIRUSE-MONTHLY-1 · 0, empty, "offf" and negative on 5h / week / day keep the defaults (25 / 84 / 38) and still refuse', () => {
  for (const bad of ['0', '', '   ', 'offf', '-5', 'NaN']) {
    const p = resolveLimits({ ...LIVE, FAIR_USE_PREMIUM_FIVE_HOUR_INR: bad, FAIR_USE_PREMIUM_WEEK_INR: bad, FAIR_USE_PREMIUM_DAY_INR: bad }).premium;
    assert.deepEqual([p.fiveHourMicroInr, p.weekMicroInr, p.dayMicroInr], [25 * INR, 84 * INR, 38 * INR], JSON.stringify(bad));
    const d = run(ledger({ 0: 38 }), { ...LIVE, FAIR_USE_PREMIUM_FIVE_HOUR_INR: bad, FAIR_USE_PREMIUM_WEEK_INR: bad, FAIR_USE_PREMIUM_DAY_INR: bad });
    assert.equal(d.allowed, false, JSON.stringify(bad));
  }
});
