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

test('FAIRUSE-MONTHLY-1 · the day window can also be "off"; with every window off nothing refuses', () => {
  const env = { ...LIVE, FAIR_USE_PREMIUM_DAY_INR: 'off', FAIR_USE_PREMIUM_30DAY_INR: '' };
  assert.equal(run(ledger({ 0: 5000 }), env).allowed, true);
  assert.deepEqual(Object.keys(premiumState(ledger({ 0: 5 }), NOW, resolveLimits(env)).view), ['resets']);
});
