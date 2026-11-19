// TS-UPGRADE-CREDIT-1 - the pure Test Series -> Board Pass upgrade rule. MONEY code: every test names a way the credit is
// (or is NOT) given, and the GST arithmetic it must produce.
// Run: node --test lazytopper/server/services/tsUpgradeCredit.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  tsCreditRefusal,
  applyTsCreditToQuote,
  tsCreditNotes,
  isConsistentTsUpgradeOrder,
  testSeriesUpgradeCreditFor,
  tsUpgradeCreditDisabled,
  TEST_SERIES_BASE_INR,
} = require('./tsUpgradeCredit.cjs');
const { withGstInr, chargeFor, tillBoardsPriceInr, FOUNDING_OFFER_CLOSES_AT_MS } = require('./passPricing.cjs');

const FOUNDING = Date.parse('2026-11-20T12:00:00+05:30');
const AFTER = FOUNDING_OFFER_CLOSES_AT_MS; // 1 Dec 2026 00:00 IST, exactly

const PACK = Object.freeze({
  packId: 'test_series:all', sku: 'test_series', target: 'all', pricePaidInr: 1179, paidAt: FOUNDING - 1000,
  orderId: 'order_TS1', paymentRef: 'pay_TS1', creditedToPass: false,
});
const ORDER = Object.freeze({
  uid: 'u1', passType: 'test_series', packTarget: 'all', amountPaise: 117900, baseInr: 999, gstInr: 180, totalInr: 1179, gstRate: 0.18,
  status: 'paid', paymentId: 'pay_TS1', offerKey: null,
});
const boardQuote = (nowMs) => {
  const c = chargeFor(tillBoardsPriceInr(nowMs), nowMs);
  return { pricePaidInr: c.totalInr, amountPaise: c.totalInr * 100, offerKey: 'founding', gst: { baseInr: c.baseInr, gstInr: c.gstInr, totalInr: c.totalInr, gstRate: c.gstRate } };
};
const credit = { creditBaseInr: 999, packId: 'test_series:all', orderId: 'order_TS1' };

test('the Test Series base credited is the catalogue base, 999 (never the all-in 1179)', () => {
  assert.equal(TEST_SERIES_BASE_INR, 999);
  assert.equal(withGstInr(999), 1179);
});

test('MONEY TABLE · founding: 1917 - 999 = 918 -> 918 + 165 = 1083; 1179 + 1083 = 2262 = the Board Pass all-in', () => {
  const base = boardQuote(FOUNDING);
  assert.equal(base.gst.baseInr, 1917);
  assert.equal(base.amountPaise, 226200);
  const { quote, fields } = applyTsCreditToQuote(base, credit, FOUNDING);
  assert.deepEqual(quote.gst, { baseInr: 918, gstInr: 165, totalInr: 1083, gstRate: 0.18 });
  assert.equal(quote.pricePaidInr, 1083);
  assert.equal(quote.amountPaise, 108300);
  assert.equal(quote.offerKey, 'founding', 'the offer key is the Board Pass quote\'s, untouched');
  assert.equal(1179 + quote.pricePaidInr, 2262);
  assert.deepEqual(fields, { tsUpgradeCreditInr: 999, tsUpgradeFullBaseInr: 1917, tsUpgradeCreditPackId: 'test_series:all', tsUpgradeCreditOrderId: 'order_TS1' });
});

test('MONEY TABLE · after founding (1 Dec 00:00 IST exactly): 2499 - 999 = 1500 -> 1500 + 270 = 1770; 1179 + 1770 = 2949', () => {
  const base = boardQuote(AFTER);
  assert.equal(base.gst.baseInr, 2499);
  const { quote } = applyTsCreditToQuote(base, credit, AFTER);
  assert.deepEqual(quote.gst, { baseInr: 1500, gstInr: 270, totalInr: 1770, gstRate: 0.18 });
  assert.equal(quote.amountPaise, 177000);
  assert.equal(1179 + 1770, base.pricePaidInr);
  // one millisecond earlier is still the founding price
  assert.equal(applyTsCreditToQuote(boardQuote(AFTER - 1), credit, AFTER - 1).quote.amountPaise, 108300);
});

test('applyTsCreditToQuote never applies to a quote it cannot trust: no credit, no GST breakup, a quote already discounted, pre-GST', () => {
  const base = boardQuote(FOUNDING);
  for (const c of [null, undefined, {}, { creditBaseInr: 0 }, { creditBaseInr: -1 }, { creditBaseInr: 99.5 }]) {
    assert.deepEqual(applyTsCreditToQuote(base, c, FOUNDING), { quote: base, fields: {} });
  }
  const noGst = { pricePaidInr: 1917, amountPaise: 191700, offerKey: 'founding' };
  assert.deepEqual(applyTsCreditToQuote(noGst, credit, FOUNDING), { quote: noGst, fields: {} });
  const discounted = { ...base, amountPaise: base.amountPaise - 4900, pricePaidInr: base.pricePaidInr - 49 };
  assert.deepEqual(applyTsCreditToQuote(discounted, credit, FOUNDING), { quote: discounted, fields: {} }, 'never on top of another credit');
  assert.deepEqual(applyTsCreditToQuote(base, { ...credit, creditBaseInr: 1917 }, FOUNDING).fields, {}, 'an upgrade base below Rs 1 is not credited');
  const preGst = Date.parse('2026-11-06T12:00:00+05:30');
  assert.deepEqual(applyTsCreditToQuote(base, credit, preGst).fields, {}, 'before the GST cut-off there is no taxable base to credit');
});

test('tsCreditRefusal: the clean record is creditable', () => {
  assert.equal(tsCreditRefusal('u1', { ...PACK }, 'order_TS1', { ...ORDER }), null);
  assert.equal(tsCreditRefusal('u1', { ...PACK }, 'order_TS1', { ...ORDER, status: 'claimed' }), null, 'a claimed guest order on this account');
});

test('tsCreditRefusal: FAIL CLOSED on every doubtful record', () => {
  const cases = [
    ['no entitlement', 'u1', null, 'order_TS1', ORDER, 'no_test_series'],
    ['bad uid', '', PACK, 'order_TS1', ORDER, 'bad_uid'],
    ['another pack', 'u1', { ...PACK, packId: 'pack_bundle:all', sku: 'pack_bundle' }, 'order_TS1', ORDER, 'bad_entitlement'],
    ['already credited', 'u1', { ...PACK, creditedToPass: true }, 'order_TS1', ORDER, 'already_credited'],
    ['credit flag missing', 'u1', { ...PACK, creditedToPass: undefined }, 'order_TS1', ORDER, 'already_credited'],
    ['entitlement refunded', 'u1', { ...PACK, refunded: true }, 'order_TS1', ORDER, 'entitlement_flagged'],
    ['entitlement refundedAt', 'u1', { ...PACK, refundedAt: new Date() }, 'order_TS1', ORDER, 'entitlement_flagged'],
    ['entitlement revoked', 'u1', { ...PACK, revoked: true }, 'order_TS1', ORDER, 'entitlement_flagged'],
    ['entitlement duplicate', 'u1', { ...PACK, duplicate: true }, 'order_TS1', ORDER, 'entitlement_flagged'],
    ['gift: no order id', 'u1', { ...PACK, orderId: undefined }, '', null, 'no_order'],
    ['gift: order missing', 'u1', PACK, 'order_TS1', null, 'no_order'],
    ['no payment ref', 'u1', { ...PACK, paymentRef: '' }, 'order_TS1', ORDER, 'no_payment'],
    ['other uid', 'u1', PACK, 'order_TS1', { ...ORDER, uid: 'u2' }, 'other_uid'],
    ['not a test series order', 'u1', PACK, 'order_TS1', { ...ORDER, passType: 'pack_bundle' }, 'bad_order'],
    ['unpaid', 'u1', PACK, 'order_TS1', { ...ORDER, status: 'created' }, 'not_paid'],
    ['guest unclaimed', 'u1', PACK, 'order_TS1', { ...ORDER, status: 'paid_unclaimed' }, 'not_paid'],
    ['payment mismatch', 'u1', PACK, 'order_TS1', { ...ORDER, paymentId: 'pay_OTHER' }, 'payment_mismatch'],
    ['duplicate payment order', 'u1', PACK, 'order_TS1', { ...ORDER, duplicate: true }, 'order_flagged'],
    ['refunded order', 'u1', PACK, 'order_TS1', { ...ORDER, refunded: true }, 'order_flagged'],
    ['refundedAt order', 'u1', PACK, 'order_TS1', { ...ORDER, refundedAt: 1 }, 'order_flagged'],
    ['revoked order', 'u1', PACK, 'order_TS1', { ...ORDER, revoked: true }, 'order_flagged'],
    ['pre-cut-off all-in order (no breakup)', 'u1', { ...PACK, pricePaidInr: 999 }, 'order_TS1', { ...ORDER, amountPaise: 99900, baseInr: undefined, gstInr: undefined }, 'base_unproven'],
    ['wrong base', 'u1', PACK, 'order_TS1', { ...ORDER, baseInr: 49 }, 'base_unproven'],
    ['wrong gst', 'u1', PACK, 'order_TS1', { ...ORDER, gstInr: 179 }, 'base_unproven'],
    ['amount does not add up', 'u1', PACK, 'order_TS1', { ...ORDER, amountPaise: 117800 }, 'base_unproven'],
    ['entitlement price differs', 'u1', { ...PACK, pricePaidInr: 1178 }, 'order_TS1', ORDER, 'amount_mismatch'],
    ['order carries a credit', 'u1', PACK, 'order_TS1', { ...ORDER, packCreditInr: 49 }, 'bad_order'],
    // Self-consistent records whose BASE is not the Test Series price: only the base check refuses them (mutation-tested).
    ['consistent but base 1099', 'u1', { ...PACK, pricePaidInr: 1279 }, 'order_TS1', { ...ORDER, baseInr: 1099, gstInr: 180, totalInr: 1279, amountPaise: 127900 }, 'base_unproven'],
    // Self-consistent records whose GST is not 18% of 999: only the stored-GST check refuses them (mutation-tested).
    ['consistent but no GST', 'u1', { ...PACK, pricePaidInr: 999 }, 'order_TS1', { ...ORDER, gstInr: 0, totalInr: 999, amountPaise: 99900 }, 'base_unproven'],
    ['consistent but GST 181', 'u1', { ...PACK, pricePaidInr: 1180 }, 'order_TS1', { ...ORDER, gstInr: 181, totalInr: 1180, amountPaise: 118000 }, 'base_unproven'],
  ];
  for (const [name, uid, pack, orderId, order, want] of cases) {
    assert.equal(tsCreditRefusal(uid, pack ? { ...pack } : pack, orderId, order ? { ...order } : order), want, name);
  }
});

function fakeDb(docs, { throwOn } = {}) {
  const ref = (key) => ({
    collection: (sub) => ({ doc: (id) => ref(`${key}/${sub}/${id}`) }),
    async get() {
      if (throwOn && key.startsWith(throwOn)) throw new Error('read failed');
      return docs[key] ? { exists: true, data: () => ({ ...docs[key] }) } : { exists: false, data: () => undefined };
    },
  });
  return { collection: (name) => ({ doc: (id) => ref(`${name}/${id}`) }) };
}
const DOCS = { 'packEntitlements/u1/packs/test_series:all': PACK, 'payOrders/order_TS1': ORDER };

test('testSeriesUpgradeCreditFor: the proved credit; never throws; read failure / non-Board-Pass / kill switch -> 0', async () => {
  assert.deepEqual(await testSeriesUpgradeCreditFor(fakeDb(DOCS), 'u1', 'till_boards', {}), {
    creditBaseInr: 999, packId: 'test_series:all', orderId: 'order_TS1', reason: null, readFailed: false, disabled: false,
  });
  assert.equal((await testSeriesUpgradeCreditFor(fakeDb(DOCS), 'u1', 'month', {})).creditBaseInr, 0);
  assert.equal((await testSeriesUpgradeCreditFor(fakeDb(DOCS), 'u2', 'till_boards', {})).reason, 'no_test_series');
  const rf = await testSeriesUpgradeCreditFor(fakeDb(DOCS, { throwOn: 'packEntitlements' }), 'u1', 'till_boards', {});
  assert.equal(rf.creditBaseInr, 0);
  assert.equal(rf.readFailed, true);
  const of = await testSeriesUpgradeCreditFor(fakeDb(DOCS, { throwOn: 'payOrders' }), 'u1', 'till_boards', {});
  assert.equal(of.creditBaseInr, 0);
  assert.equal(of.readFailed, true, 'the order read failing is also a read failure (credit 0)');
  assert.equal((await testSeriesUpgradeCreditFor(null, 'u1', 'till_boards', {})).readFailed, true);
  for (const v of ['1', 'true', 'ON', 'yes']) {
    const d = await testSeriesUpgradeCreditFor(fakeDb(DOCS, { throwOn: 'p' }), 'u1', 'till_boards', { TS_UPGRADE_CREDIT_DISABLED: v });
    assert.equal(d.disabled, true, v);
    assert.equal(d.creditBaseInr, 0);
    assert.equal(d.readFailed, false, 'the kill switch does not even read');
  }
  assert.equal(tsUpgradeCreditDisabled({ TS_UPGRADE_CREDIT_DISABLED: '0' }), false);
  assert.equal(tsUpgradeCreditDisabled({}), false);
});

test('tsCreditNotes / isConsistentTsUpgradeOrder', () => {
  assert.deepEqual(tsCreditNotes({}), {});
  assert.deepEqual(tsCreditNotes({ tsUpgradeCreditInr: 999, tsUpgradeCreditOrderId: 'order_TS1' }), { tsUpgradeCreditInr: '999', tsUpgradeCreditOrderId: 'order_TS1' });
  const good = { passType: 'till_boards', baseInr: 918, tsUpgradeCreditInr: 999, tsUpgradeFullBaseInr: 1917, tsUpgradeCreditPackId: 'test_series:all', tsUpgradeCreditOrderId: 'order_TS1' };
  assert.equal(isConsistentTsUpgradeOrder(good), true);
  assert.equal(isConsistentTsUpgradeOrder({ ...good, baseInr: 1917 }), false);
  assert.equal(isConsistentTsUpgradeOrder({ ...good, tsUpgradeCreditPackId: 'pack_bundle:all' }), false);
  assert.equal(isConsistentTsUpgradeOrder({ ...good, passType: 'month' }), false);
  assert.equal(isConsistentTsUpgradeOrder({ ...good, tsUpgradeCreditOrderId: 'a/b' }), false);
  assert.equal(isConsistentTsUpgradeOrder({ passType: 'till_boards', baseInr: 1917 }), false);
});

/* ── TS-PRICE-2 · the credit is what the student ACTUALLY PAID (the base of their own paid order), never today's list price ── */
const ORDER_1499 = Object.freeze({
  uid: 'u1', passType: 'test_series', packTarget: 'all', amountPaise: 176900, baseInr: 1499, gstInr: 270, totalInr: 1769, gstRate: 0.18,
  status: 'paid', paymentId: 'pay_TS1', offerKey: null,
});
const PACK_1499 = Object.freeze({ ...PACK, pricePaidInr: 1769 });

test('TS-PRICE-2 · a 1,499 buyer\'s record is creditable (base 1499 proved from the stored GST breakup); a base that is neither Test Series price is not', () => {
  assert.equal(tsCreditRefusal('u1', { ...PACK_1499 }, 'order_TS1', { ...ORDER_1499 }), null);
  assert.equal(tsCreditRefusal('u1', { ...PACK_1499 }, 'order_TS1', { ...ORDER_1499, baseInr: 1000, gstInr: 180, amountPaise: 118000 }), 'base_unproven');
  assert.equal(tsCreditRefusal('u1', { ...PACK_1499 }, 'order_TS1', { ...ORDER_1499, gstInr: 180 }), 'base_unproven', 'a base with the wrong GST is not proved');
  assert.equal(tsCreditRefusal('u1', { ...PACK }, 'order_TS1', { ...ORDER_1499 }), 'amount_mismatch', 'the entitlement must record what the order charged');
});

test('MONEY TABLE · founding buyer (paid 999) upgrading after 1 Dec: 2499 - 999 = 1500 -> 1500 + 270 = 1770 (NOT reduced by today\'s 1,499 list price)', () => {
  const base = boardQuote(AFTER);
  const { quote, fields } = applyTsCreditToQuote(base, { creditBaseInr: 999, packId: 'test_series:all', orderId: 'order_TS1' }, AFTER);
  assert.deepEqual(quote.gst, { baseInr: 1500, gstInr: 270, totalInr: 1770, gstRate: 0.18 });
  assert.equal(fields.tsUpgradeCreditInr, 999);
});

test('MONEY TABLE · 1,499 buyer (paid 1499) upgrading after 1 Dec: 2499 - 1499 = 1000 -> 1000 + 180 = 1180; 1769 + 1180 = 2949 = the Board Pass all-in', () => {
  const base = boardQuote(AFTER + 86400000);
  assert.equal(base.amountPaise, 294900);
  const { quote, fields } = applyTsCreditToQuote(base, { creditBaseInr: 1499, packId: 'test_series:all', orderId: 'order_TS1' }, AFTER + 86400000);
  assert.deepEqual(quote.gst, { baseInr: 1000, gstInr: 180, totalInr: 1180, gstRate: 0.18 });
  assert.equal(quote.amountPaise, 118000);
  assert.equal(1769 + quote.pricePaidInr, 2949);
  assert.deepEqual(fields, { tsUpgradeCreditInr: 1499, tsUpgradeFullBaseInr: 2499, tsUpgradeCreditPackId: 'test_series:all', tsUpgradeCreditOrderId: 'order_TS1' });
});

test('TS-PRICE-2 · testSeriesUpgradeCreditFor reads the PAID ORDER\'s base: 999 for a founding buyer, 1,499 for a later one', async () => {
  const mk = (pack, ord) => ({
    collection: (c) => ({
      doc: () => ({
        collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => pack }) }) }),
        get: async () => ({ exists: true, data: () => ord }),
      }),
    }),
  });
  const f = await testSeriesUpgradeCreditFor(mk({ ...PACK }, { ...ORDER }), 'u1', 'till_boards', {});
  assert.equal(f.creditBaseInr, 999);
  const l = await testSeriesUpgradeCreditFor(mk({ ...PACK_1499 }, { ...ORDER_1499 }), 'u1', 'till_boards', {});
  assert.equal(l.creditBaseInr, 1499);
  assert.equal(l.reason, null);
});
