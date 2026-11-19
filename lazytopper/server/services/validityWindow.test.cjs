'use strict';
// VALIDITY-FEB27 - the Test Series Pack and the Board Pass are both valid until 28 Feb 2027, 23:59:59 IST.
//   * a NEW Board Pass ends 28 Feb 2027;
//   * an EXISTING Board Pass stored to 17 Feb 2027 reads valid until 28 Feb (read-time rule, nothing is written);
//   * a LATER stored end is never shortened, and an end that was set EARLIER on purpose is never resurrected;
//   * the Test Series is owned until 28 Feb and expired on 1 Mar;
//   * after 28 Feb both are expired (and a Board Pass sold then is not born expired).

const test = require('node:test');
const assert = require('node:assert/strict');

const W = require('./validityWindow.cjs');
const { computeGrant, describePass } = require('./passGrant.cjs');
const { deriveEffectiveTier } = require('./entitlement.cjs');
const { isRedownloadOpen, TEST_SERIES_ENDS_MS, TEST_SERIES_UNTIL } = require('./packTerms.cjs');
const { coveredTillBoards } = require('../routes/parentPay.cjs');
const { creditExpiryMs } = require('./usageCredit.cjs');

const ist = (iso) => Date.parse(`${iso}+05:30`);
const END = ist('2027-02-28T23:59:59.999');
const OLD_END = ist('2027-02-17T23:59:59.999');
const ts = (ms) => ({ toMillis: () => ms, toDate: () => new Date(ms) });
const till = (endMs, extra = {}) => ({ tier: 'premium', plan: 'pass_till_boards', passType: 'till_boards', passEnd: ts(endMs), lastPaymentRef: 'p', pricePaidInr: 1917, ...extra });

test('the constants: 28 Feb 2027, end of day IST, one label', () => {
  assert.equal(W.VALIDITY_END_ISO, '2027-02-28');
  assert.equal(W.VALIDITY_END_MS, END);
  assert.equal(W.VALIDITY_LABEL, '28 Feb 2027');
  assert.equal(W.OLD_BOARD_PASS_END_MS, OLD_END);
  assert.equal(TEST_SERIES_ENDS_MS, END, 'the Test Series shares the one end');
  assert.equal(TEST_SERIES_UNTIL, '28 Feb 2027');
});

test('a NEW Board Pass is granted to 28 Feb 2027 end of day IST (founding, after founding, and stacked on a running month pass)', () => {
  for (const day of ['2026-11-20', '2026-12-05', '2027-01-10']) {
    const g = computeGrant({}, { passType: 'till_boards', paymentRef: 'pay_1', nowMs: ist(`${day}T12:00:00`) });
    assert.equal(g.fields.passEnd.getTime(), END, day);
  }
  const month = { tier: 'premium', plan: 'pass_month', passType: 'month', passEnd: ts(ist('2026-12-20T12:00:00')) };
  assert.equal(computeGrant(month, { passType: 'till_boards', paymentRef: 'pay_2', nowMs: ist('2026-12-01T12:00:00') }).fields.passEnd.getTime(), END);
});

test('a LATER stored end is never shortened by a new grant', () => {
  const later = till(ist('2027-04-30T23:59:59.999'));
  assert.equal(computeGrant(later, { passType: 'till_boards', paymentRef: 'pay_9', nowMs: ist('2026-12-01T12:00:00') }).fields.passEnd.getTime(), ist('2027-04-30T23:59:59.999'));
});

test('a Board Pass sold AFTER 28 Feb 2027 is not born expired: it rolls to 28 Feb 2028', () => {
  const now = ist('2027-03-05T12:00:00');
  assert.equal(W.validityEndMsFor(now), ist('2028-02-28T23:59:59.999'));
  assert.equal(computeGrant({}, { passType: 'till_boards', paymentRef: 'pay_3', nowMs: now }).fields.passEnd.getTime(), ist('2028-02-28T23:59:59.999'));
});

test('read-time rule: a stored 17 Feb pass reads as 28 Feb; a later end is returned unchanged; an earlier end is NOT resurrected; month is untouched', () => {
  assert.equal(W.effectiveBoardPassEndMs('till_boards', OLD_END), END);
  assert.equal(W.effectiveBoardPassEndMs('till_boards', ist('2027-02-23T10:00:00')), END, 'an admin end between 17 and 28 Feb is raised, never lowered');
  assert.equal(W.effectiveBoardPassEndMs('till_boards', END), END);
  assert.equal(W.effectiveBoardPassEndMs('till_boards', ist('2027-04-30T23:59:59.999')), ist('2027-04-30T23:59:59.999'), 'never shortened');
  assert.equal(W.effectiveBoardPassEndMs('till_boards', OLD_END - 1), OLD_END - 1, 'an end earlier than the old board end (ended early / refunded / last session) stays as stored');
  assert.equal(W.effectiveBoardPassEndMs('till_boards', ist('2026-02-17T23:59:59.999')), ist('2026-02-17T23:59:59.999'));
  assert.equal(W.effectiveBoardPassEndMs('month', OLD_END), OLD_END, 'only a Board Pass is read forward');
  assert.equal(W.effectiveBoardPassEndMs('till_boards', NaN) !== W.effectiveBoardPassEndMs('till_boards', NaN), true, 'NaN passes through (fails closed upstream)');
});

test('entitlement: an EXISTING pass stored to 17 Feb 2027 is premium through the Science exam (22 Feb) and 28 Feb 23:59:59.999, free at 1 Mar 00:00 IST', () => {
  const doc = till(OLD_END);
  for (const at of ['2027-02-17T12:00:00', '2027-02-18T00:00:00', '2027-02-22T09:00:00', '2027-02-28T23:59:59.998']) {
    assert.equal(deriveEffectiveTier(doc, ist(at)).tier, 'premium', at);
  }
  assert.equal(deriveEffectiveTier(doc, END).tier, 'free', 'the stored-end rule is "at or after passEnd is free": the last ms is the first expired one');
  assert.equal(deriveEffectiveTier(doc, ist('2027-03-01T00:00:00')).tier, 'free');
  assert.equal(deriveEffectiveTier(doc, OLD_END).passEndsAtMs, END, 'the end the gate reports (cache TTL, admin page) is the read end');
});

test('entitlement: a later stored end is untouched; a pass ended early stays ended; a month pass is unchanged', () => {
  const april = ist('2027-04-30T23:59:59.999');
  assert.equal(deriveEffectiveTier(till(april), ist('2027-03-15T12:00:00')).tier, 'premium');
  assert.equal(deriveEffectiveTier(till(april), ist('2027-03-15T12:00:00')).passEndsAtMs, april);
  const ended = till(ist('2026-11-10T10:00:00'));
  assert.equal(deriveEffectiveTier(ended, ist('2026-11-12T10:00:00')).tier, 'free', 'a pass an admin ended on 10 Nov is not resurrected');
  const month = { tier: 'premium', plan: 'pass_month', passType: 'month', passEnd: ts(OLD_END), lastPaymentRef: 'p', pricePaidInr: 599 };
  assert.equal(deriveEffectiveTier(month, ist('2027-02-20T12:00:00')).tier, 'free');
});

test('describePass (the admin / status read) shows the read end', () => {
  assert.equal(describePass('u', till(OLD_END)).passEnd, new Date(END).toISOString());
  assert.equal(describePass('u', till(ist('2027-04-30T23:59:59.999'))).passEnd, new Date(ist('2027-04-30T23:59:59.999')).toISOString());
});

test('duplicate-purchase check (coveredTillBoards): covered to 28 Feb, offered again after it', () => {
  assert.equal(coveredTillBoards(till(OLD_END), ist('2026-11-20T12:00:00')), true);
  assert.equal(coveredTillBoards(till(OLD_END), ist('2027-02-25T12:00:00')), true, 'valid on 25 Feb: nothing to buy');
  assert.equal(coveredTillBoards(till(OLD_END), END + 1), false, 'expired on 1 Mar: offered again');
  assert.equal(coveredTillBoards(till(ist('2027-04-30T23:59:59.999')), ist('2027-01-10T12:00:00')), true, 'a later stored end still counts as covered (never shortened)');
  assert.equal(coveredTillBoards(till(ist('2027-04-30T23:59:59.999')), ist('2027-03-10T12:00:00')), false, 'past 28 Feb the next window opens, so an April end no longer covers it');
});

test('the Test Series is owned until 28 Feb end of day and expired on 1 Mar', () => {
  const pack = { packId: 'test_series:all', sku: 'test_series', target: 'all', paidAt: ist('2026-11-20T12:00:00') };
  assert.equal(isRedownloadOpen(pack, ist('2027-02-22T10:00:00')), true);
  assert.equal(isRedownloadOpen(pack, END), true);
  assert.equal(isRedownloadOpen(pack, ist('2027-03-01T00:00:00')), false);
});

test('Top-up credit lasts to the same end (never shorter than the pass it tops up)', () => {
  assert.equal(creditExpiryMs(ist('2026-12-01T12:00:00')), END);
  assert.equal(creditExpiryMs(ist('2027-03-05T12:00:00')), ist('2028-02-28T23:59:59.999'));
});
