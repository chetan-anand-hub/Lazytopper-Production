// PACK-CREDIT-1 - the pure credit rule. MONEY code: every test names a way a credit is (or is NOT) given.
// Run: node --test lazytopper/server/services/packCredit.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  packCreditFor,
  boardPassCreditFor,
  applyCreditToQuote,
  creditNotes,
  creditOrderFields,
  parseCreditIds,
  CREDIT_WINDOW_MS,
} = require('./packCredit.cjs');

const NOW = Date.parse('2026-10-28T06:30:00.000Z');
const pack = (packId, pricePaidInr, paidAt, extra = {}) => ({ packId, pricePaidInr, paidAt, creditedToPass: false, ...extra });

test('empty / bad input -> no credit', () => {
  const none = { creditInr: 0, packIds: [], expiresAtMs: null };
  assert.deepEqual(packCreditFor([], NOW), none);
  assert.deepEqual(packCreditFor(undefined, NOW), none);
  assert.deepEqual(packCreditFor(null, NOW), none);
  assert.deepEqual(packCreditFor('x', NOW), none);
  assert.deepEqual(packCreditFor({}, NOW), none);
  assert.deepEqual(packCreditFor([pack('a:1', 49, NOW)], NaN), none);
  assert.deepEqual(packCreditFor([pack('a:1', 49, NOW)], undefined), none);
  assert.deepEqual(packCreditFor([null, undefined, 7, 'x', [], {}], NOW), none);
});

test('one fresh pack is credited at its price; expiry = paidAt + 7 days', () => {
  const r = packCreditFor([pack('pack_chapter:triangles', 49, NOW - 1000)], NOW);
  assert.deepEqual(r, { creditInr: 49, packIds: ['pack_chapter:triangles'], expiresAtMs: NOW - 1000 + CREDIT_WINDOW_MS });
});

test('boundary: exactly 7 days old still counts; 7 days + 1 ms does not; paidAt in the future does not', () => {
  assert.equal(packCreditFor([pack('a:1', 49, NOW - CREDIT_WINDOW_MS)], NOW).creditInr, 49);
  assert.equal(packCreditFor([pack('a:1', 49, NOW - CREDIT_WINDOW_MS - 1)], NOW).creditInr, 0);
  assert.equal(packCreditFor([pack('a:1', 49, NOW)], NOW).creditInr, 49);
  assert.equal(packCreditFor([pack('a:1', 49, NOW + 1)], NOW).creditInr, 0, 'a future-dated pack is not trusted');
});

test('already credited (true, missing, or any non-false value) -> NOT credited again', () => {
  assert.equal(packCreditFor([pack('a:1', 49, NOW, { creditedToPass: true })], NOW).creditInr, 0);
  const noFlag = { packId: 'a:1', pricePaidInr: 49, paidAt: NOW };
  assert.equal(packCreditFor([noFlag], NOW).creditInr, 0, 'a doc with no creditedToPass flag is not provably uncredited');
  assert.equal(packCreditFor([pack('a:1', 49, NOW, { creditedToPass: 'false' })], NOW).creditInr, 0);
  assert.equal(packCreditFor([pack('a:1', 49, NOW, { creditedToPass: null })], NOW).creditInr, 0);
});

test('refunded / duplicate / revoked markers exclude a pack', () => {
  assert.equal(packCreditFor([pack('a:1', 49, NOW, { refunded: true })], NOW).creditInr, 0);
  assert.equal(packCreditFor([pack('a:1', 49, NOW, { duplicate: true })], NOW).creditInr, 0);
  assert.equal(packCreditFor([pack('a:1', 49, NOW, { revoked: true })], NOW).creditInr, 0);
  assert.equal(packCreditFor([pack('a:1', 49, NOW, { refundedAt: new Date(NOW) })], NOW).creditInr, 0);
});

test('multiple packs: the credits add; only the eligible ones; expiry from the EARLIEST', () => {
  const r = packCreditFor(
    [
      pack('pack_mock:maths', 99, NOW - 3 * 86400000),
      pack('pack_chapter:circles', 49, NOW - 1000),
      pack('pack_chapter:old', 49, NOW - 8 * 86400000),
      pack('pack_subject:science', 199, NOW - 86400000, { creditedToPass: true }),
    ],
    NOW,
  );
  assert.equal(r.creditInr, 148);
  assert.deepEqual(r.packIds, ['pack_mock:maths', 'pack_chapter:circles']);
  assert.equal(r.expiresAtMs, NOW - 3 * 86400000 + CREDIT_WINDOW_MS);
});

test('bad data is never credited: price 0 / negative / fractional / string / NaN, bad paidAt, bad packId', () => {
  for (const price of [0, -49, 49.5, '49', NaN, Infinity, null, undefined]) {
    assert.equal(packCreditFor([pack('a:1', price, NOW)], NOW).creditInr, 0, `price ${String(price)}`);
  }
  for (const paidAt of ['2026-10-28', null, undefined, NaN, {}, []]) {
    assert.equal(packCreditFor([pack('a:1', 49, paidAt)], NOW).creditInr, 0, `paidAt ${String(paidAt)}`);
  }
  for (const id of ['', undefined, 7, 'a,b', 'a/b']) {
    assert.equal(packCreditFor([{ ...pack('x', 49, NOW), packId: id }], NOW).creditInr, 0, `packId ${String(id)}`);
  }
});

test('a Firestore Timestamp-like paidAt (toMillis) and a Date are read; the same pack twice counts once', () => {
  assert.equal(packCreditFor([pack('a:1', 49, { toMillis: () => NOW - 5 })], NOW).creditInr, 49);
  assert.equal(packCreditFor([pack('a:1', 49, new Date(NOW - 5))], NOW).creditInr, 49);
  assert.equal(packCreditFor([pack('a:1', 49, { toMillis: () => { throw new Error('x'); } })], NOW).creditInr, 0);
  assert.equal(packCreditFor([pack('a:1', 49, NOW), pack('a:1', 49, NOW)], NOW).creditInr, 49);
});

test('cap: whole packs, oldest first; never past maxCreditInr; cap 0 -> nothing', () => {
  const packs = [pack('a:1', 99, NOW - 3000), pack('b:2', 49, NOW - 2000), pack('c:3', 199, NOW - 1000)];
  assert.deepEqual(packCreditFor(packs, NOW, { maxCreditInr: 150 }).packIds, ['a:1', 'b:2']);
  assert.equal(packCreditFor(packs, NOW, { maxCreditInr: 150 }).creditInr, 148);
  assert.equal(packCreditFor(packs, NOW, { maxCreditInr: 98 }).creditInr, 49, 'a pack that does not fit whole is skipped');
  assert.equal(packCreditFor(packs, NOW, { maxCreditInr: 0 }).creditInr, 0);
  assert.equal(packCreditFor(packs, NOW, { maxCreditInr: -5 }).creditInr, 0);
});

/* ── boardPassCreditFor: the I/O wrapper. NEVER throws, never blocks, fails CLOSED ── */
function dbWith(docs, { throws = false } = {}) {
  return {
    collection: () => ({
      doc: () => ({
        collection: () => ({
          async get() {
            if (throws) throw new Error('firestore down');
            return { docs: docs.map((d) => ({ data: () => ({ ...d }) })) };
          },
        }),
      }),
    }),
  };
}

test('boardPassCreditFor: month pass earns no credit and reads nothing', async () => {
  let read = false;
  const db = { collection: () => { read = true; throw new Error('must not read'); } };
  const r = await boardPassCreditFor(db, 'u1', 'month', 599, NOW);
  assert.equal(r.creditInr, 0);
  assert.equal(read, false);
});

test('boardPassCreditFor: till_boards sums the creditable packs; capped to price - Rs 1', async () => {
  const db = dbWith([pack('a:1', 49, NOW - 10), pack('b:2', 99, NOW - 20)]);
  const r = await boardPassCreditFor(db, 'u1', 'till_boards', 2396, NOW);
  assert.equal(r.creditInr, 148);
  assert.deepEqual(r.packIds.sort(), ['a:1', 'b:2']);
  const capped = await boardPassCreditFor(db, 'u1', 'till_boards', 100, NOW);
  assert.equal(capped.creditInr, 99, 'the order can never go below Rs 1');
  const tiny = await boardPassCreditFor(db, 'u1', 'till_boards', 1, NOW);
  assert.equal(tiny.creditInr, 0);
});

test('boardPassCreditFor: a FAILED READ is credit 0 with readFailed (fail closed), and does not throw', async () => {
  const r = await boardPassCreditFor(dbWith([], { throws: true }), 'u1', 'till_boards', 2396, NOW);
  assert.equal(r.creditInr, 0);
  assert.equal(r.readFailed, true);
  const noDb = await boardPassCreditFor(null, 'u1', 'till_boards', 2396, NOW);
  assert.equal(noDb.creditInr, 0);
});

test('applyCreditToQuote / notes / order fields: no credit changes nothing; credit lowers the amount, floor Rs 1', () => {
  const base = { pricePaidInr: 599, amountPaise: 59900, offerKey: 'founding' };
  const none = applyCreditToQuote(base, { creditInr: 0, packIds: [] });
  assert.equal(none.quote, base);
  assert.deepEqual(creditNotes(none.packCreditInr, none.packCreditIds), {});
  assert.deepEqual(creditOrderFields(none.packCreditInr, none.packCreditIds), {});
  const got = applyCreditToQuote(base, { creditInr: 148, packIds: ['a:1', 'b:2'] });
  assert.deepEqual(got.quote, { pricePaidInr: 451, amountPaise: 45100, offerKey: 'founding' });
  assert.equal(got.packCreditIds, 'a:1,b:2');
  assert.deepEqual(creditNotes(148, 'a:1,b:2'), { packCreditInr: '148', packCreditIds: 'a:1,b:2' });
  assert.deepEqual(creditOrderFields(148, 'a:1,b:2'), { packCreditInr: 148, packCreditIds: 'a:1,b:2' });
  const over = applyCreditToQuote(base, { creditInr: 599, packIds: ['x:1'] });
  assert.equal(over.quote, base, 'a credit that would take the order to Rs 0 is refused outright');
  assert.deepEqual(Object.keys(creditNotes(10, 'x'.repeat(300))), ['packCreditInr'], 'an over-long id list stays off the Razorpay notes');
});

test('parseCreditIds: comma list back to unique clean ids', () => {
  assert.deepEqual(parseCreditIds('a:1, b:2,,a:1,c/d'), ['a:1', 'b:2']);
  assert.deepEqual(parseCreditIds(''), []);
  assert.deepEqual(parseCreditIds(undefined), []);
  assert.deepEqual(parseCreditIds(7), []);
});
