// REDOWNLOAD-ENFORCE-1 - the pack re-download date on the server: 31 Mar 2027 for packs paid from 5 Nov 2026 00:00 IST,
// 31 May 2027 before (and when the paid time is unknown). Each boundary is pinned at the day before, the day, the day after.
// Run: node --test lazytopper/server/services/packTerms.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PACK_TERMS_CUTOFF_MS,
  REDOWNLOAD_ENDS_MS,
  REDOWNLOAD_ENDS_LEGACY_MS,
  paidAtMsOf,
  redownloadEndsMsFor,
  redownloadUntilFor,
  isRedownloadOpen,
  splitByRedownload,
} = require('./packTerms.cjs');
const { PACK_CREDIT_CUTOFF_MS } = require('./packCredit.cjs');

const ist = (s) => Date.parse(`${s}+05:30`);
const POST = ist('2026-11-05T00:00:00.000'); // exactly the cut-off: new terms
const PRE = ist('2026-11-04T23:59:59.999'); // 1 ms before: old terms
const UNKNOWN = [undefined, null, 0, -5, NaN, Infinity, 'yesterday', {}, []];

test('the cut-off is 5 Nov 2026 00:00 IST, the same instant the pack credit stops (one place)', () => {
  assert.equal(PACK_TERMS_CUTOFF_MS, Date.parse('2026-11-04T18:30:00.000Z'));
  assert.equal(PACK_CREDIT_CUTOFF_MS, PACK_TERMS_CUTOFF_MS);
});

test('the end instants are the LAST ms of the day, IST', () => {
  assert.equal(REDOWNLOAD_ENDS_MS, Date.parse('2027-03-31T18:29:59.999Z'));
  assert.equal(REDOWNLOAD_ENDS_LEGACY_MS, Date.parse('2027-05-31T18:29:59.999Z'));
});

test('date per paid time: on/after the cut-off -> 31 March 2027; before -> 31 May 2027; unknown -> 31 May 2027', () => {
  assert.equal(redownloadUntilFor(POST), '31 March 2027');
  assert.equal(redownloadUntilFor(POST + 86400000 * 90), '31 March 2027');
  assert.equal(redownloadUntilFor(PRE), '31 May 2027');
  assert.equal(redownloadUntilFor(ist('2026-10-20T10:00:00')), '31 May 2027');
  for (const u of UNKNOWN) {
    assert.equal(redownloadUntilFor(u), '31 May 2027', String(u));
    assert.equal(redownloadEndsMsFor(u), REDOWNLOAD_ENDS_LEGACY_MS, String(u));
  }
  assert.equal(redownloadEndsMsFor(POST), REDOWNLOAD_ENDS_MS);
  assert.equal(redownloadEndsMsFor(PRE), REDOWNLOAD_ENDS_LEGACY_MS);
});

test('paidAt shapes: ms number, Date, Firestore Timestamp; a throwing toMillis is unknown', () => {
  assert.equal(paidAtMsOf(POST), POST);
  assert.equal(paidAtMsOf(new Date(POST)), POST);
  assert.equal(paidAtMsOf({ toMillis: () => POST }), POST);
  assert.equal(paidAtMsOf({ toMillis: () => { throw new Error('x'); } }), null);
  assert.equal(redownloadUntilFor({ toMillis: () => POST }), '31 March 2027');
  assert.equal(redownloadUntilFor(new Date(PRE)), '31 May 2027');
});

test('POST-5-NOV purchase: open the day before (30 Mar), open all of 31 Mar IST, ended the day after (1 Apr)', () => {
  const p = { paidAt: POST };
  assert.equal(isRedownloadOpen(p, ist('2027-03-30T12:00:00')), true, 'day before');
  assert.equal(isRedownloadOpen(p, ist('2027-03-31T00:00:00')), true, 'the day, first ms');
  assert.equal(isRedownloadOpen(p, ist('2027-03-31T23:59:59.999')), true, 'the day, last ms');
  assert.equal(isRedownloadOpen(p, ist('2027-04-01T00:00:00')), false, 'day after, first ms');
  assert.equal(isRedownloadOpen(p, ist('2027-04-01T12:00:00')), false, 'day after');
});

test('PRE-5-NOV purchase and UNKNOWN paid time: open through 31 May IST (still open on 1 Apr), ended on 1 Jun', () => {
  for (const paidAt of [PRE, undefined, 0]) {
    const p = { paidAt };
    assert.equal(isRedownloadOpen(p, ist('2027-04-01T12:00:00')), true, `${paidAt}: past the new date, still open`);
    assert.equal(isRedownloadOpen(p, ist('2027-05-30T12:00:00')), true, `${paidAt}: day before`);
    assert.equal(isRedownloadOpen(p, ist('2027-05-31T23:59:59.999')), true, `${paidAt}: the day, last ms`);
    assert.equal(isRedownloadOpen(p, ist('2027-06-01T00:00:00')), false, `${paidAt}: day after`);
  }
});

test('no usable server clock never cuts a student off', () => {
  for (const n of [undefined, NaN, 'now', null]) assert.equal(isRedownloadOpen({ paidAt: POST }, n), true);
});

test('split: before every date the open list IS the input (same objects, same order); after, ended carries the honest date', () => {
  const a = { packId: 'pack_chapter:circles', sku: 'pack_chapter', target: 'circles', pricePaidInr: 49, paidAt: PRE, orderId: 'o1' };
  const b = { packId: 'pack_mock:maths', sku: 'pack_mock', target: 'maths', pricePaidInr: 99, paidAt: POST, orderId: 'o2' };
  const before = splitByRedownload([a, b], ist('2027-03-31T23:59:59.999'));
  assert.deepEqual(before.ended, []);
  assert.equal(before.open[0], a);
  assert.equal(before.open[1], b);
  const after = splitByRedownload([a, b], ist('2027-04-01T00:00:00'));
  assert.deepEqual(after.open, [a]);
  assert.deepEqual(after.ended, [
    { packId: 'pack_mock:maths', sku: 'pack_mock', target: 'maths', paidAt: POST, redownloadUntil: '31 March 2027', endedAtMs: REDOWNLOAD_ENDS_MS },
  ]);
  const late = splitByRedownload([a, b], ist('2027-06-01T00:00:00'));
  assert.deepEqual(late.open, []);
  assert.deepEqual(late.ended.map((e) => e.redownloadUntil), ['31 May 2027', '31 March 2027']);
  assert.deepEqual(splitByRedownload(undefined, POST), { open: [], ended: [] });
});

/* ── TS-PACK-1 / VALIDITY-FEB27 · the Test Series Pack is valid till 28 Feb 2027 (IST end of day), whenever it was paid ───────────── */
const TS_ENDS_MS = Date.parse('2027-02-28T23:59:59.999+05:30');
test('TS-PACK-1: a Test Series Pack ends 28 Feb 2027 (VALIDITY-FEB27), never on the 31 March / 31 May PDF-pack dates', () => {
  const T = require('./packTerms.cjs');
  assert.equal(T.TEST_SERIES_ENDS_MS, TS_ENDS_MS);
  assert.equal(T.TEST_SERIES_UNTIL, '28 Feb 2027');
  const ts = { packId: 'test_series:all', sku: 'test_series', target: 'all', paidAt: Date.parse('2026-11-20T00:00:00+05:30') };
  const pdf = { packId: 'pack_bundle:all', sku: 'pack_bundle', target: 'all', paidAt: ts.paidAt };
  const march = Date.parse('2027-03-15T12:00:00+05:30');
  const feb = Date.parse('2027-02-20T12:00:00+05:30');
  assert.equal(isRedownloadOpen(ts, feb), true, 'valid on the Science exam day (22 Feb) and after');
  assert.equal(isRedownloadOpen(pdf, march), true, 'a PDF pack bought the same day keeps its own 31 March date (untouched)');
  assert.equal(isRedownloadOpen(ts, TS_ENDS_MS), true, 'the whole last day (28 Feb 23:59:59.999 IST)');
  assert.equal(isRedownloadOpen(ts, TS_ENDS_MS + 1), false, 'expired on 1 Mar 00:00 IST');
  assert.equal(isRedownloadOpen(ts, Date.parse('2027-03-01T00:00:00+05:30')), false);
  assert.equal(isRedownloadOpen(ts, march), false, 'no longer 31 May');
  const { open, ended } = T.splitByRedownload([ts], TS_ENDS_MS + 1);
  assert.equal(open.length, 0);
  assert.equal(ended[0].redownloadUntil, '28 Feb 2027');
  assert.equal(ended[0].endedAtMs, TS_ENDS_MS);
  // The PDF packs' own dates are EXACTLY as they were.
  assert.equal(T.REDOWNLOAD_UNTIL, '31 March 2027');
  assert.equal(T.REDOWNLOAD_UNTIL_LEGACY, '31 May 2027');
  assert.equal(T.REDOWNLOAD_ENDS_MS, Date.parse('2027-03-31T23:59:59.999+05:30'));
  assert.equal(T.REDOWNLOAD_ENDS_LEGACY_MS, Date.parse('2027-05-31T23:59:59.999+05:30'));
});
