// GST-INVOICE-1 — the tax invoice: amounts, numbering, idempotency, FY rollover, fail-closed config, buyer validation,
// holds, the PDF, the GSTR-1 CSVs, the routes, and the wiring into every capture path (verify + webhook + status).
//
// ★ Every instant is INJECTED (`now`); nothing here reads the real clock.
// ★ The seller GSTIN / SAC values below are TEST FIXTURES built to pass the format and checksum. They are NOT the
//   company's: the real values exist only in Railway env (SELLER_GSTIN, SELLER_ADDRESS, SAC_BOARD_PASS, SAC_PACKS).
//
// ★ MUTATIONS (each run against THIS file only, each shown red, each restored):
//   M1  gstInvoice.cjs reads the counter OUTSIDE the transaction (plain get + set)  -> "20 concurrent captures" red
//   M2  gstInvoice.cjs drops the `order.gstInvoice` re-check inside the transaction  -> "verify + webhook ... = 1" red
//   M3  financialYearFor uses UTC instead of IST                                     -> "FY rollover" red
//
// Run: node --test lazytopper/server/services/gstInvoice.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');

const g = require('./gstInvoice.cjs');
const pricing = require('./passPricing.cjs');
const { PACK_PRODUCTS } = require('./packProducts.cjs');
const { renderInvoicePdf, invoiceTextBlocks } = require('./gstInvoicePdf.cjs');
const exp = require('./gstInvoiceExport.cjs');
const { createGstInvoiceRoutes, rememberedFrom, parseRange } = require('../routes/gstInvoice.cjs');
const { createPaymentRoutes, PAY_ORDER_PATH, PAY_VERIFY_PATH, PAY_WEBHOOK_PATH, PAY_STATUS_PATH } = require('../routes/payments.cjs');
const { createHttpUtils } = require('./httpUtils.cjs');
const { buildReceiptEmail, createPaymentReceiptEmailer } = require('./paymentReceiptEmail.cjs');

/* ── fixtures ──────────────────────────────────────────────────────────────── */

const withCheck = (first14) => `${first14}${g.gstinCheckChar(first14)}`;
const TEST_SELLER_GSTIN = withCheck('29AAAAA0000A1Z'); // test fixture (Karnataka code, valid checksum), not the company's
const TEST_B2B_GSTIN_MH = withCheck('27BBBBB1111B1Z'); // test fixture, Maharashtra
const TEST_SAC = '990000'; // test fixture in the SAC format, not a confirmed code
const ENV_READY = {
  GST_INVOICE_ENABLED: '1',
  SELLER_GSTIN: TEST_SELLER_GSTIN,
  SELLER_ADDRESS: 'Test address line, Test City, Karnataka 560001',
  SAC_BOARD_PASS: TEST_SAC,
  SAC_PACKS: TEST_SAC,
};
/** A PIN plausible for each state the fixtures use (GST-INVOICE-2a: state + PIN are both required for an invoice). */
const PIN_FOR = { '29': '560001', '27': '411001', '33': '600001', '07': '110001', '32': '682001' };
const IST = (iso) => Date.parse(`${iso}+05:30`);
const AFTER_CUTOFF = IST('2026-11-08T12:00:00');
const BEFORE_CUTOFF = IST('2026-11-06T12:00:00');

/** A stored order exactly as payments.cjs writes it after the cut-off (base + GST breakup from passPricing). */
function storedOrder({ passType = 'till_boards', baseInr = 1917, stateCode = '29', createdMs = AFTER_CUTOFF, status = 'paid', paymentId = 'pay_A', uid = 'u1', extra = {} } = {}) {
  const c = pricing.chargeFor(baseInr, createdMs);
  return {
    uid,
    passType,
    amountPaise: c.totalInr * 100,
    ...(c.gstExclusive ? { baseInr: c.baseInr, gstInr: c.gstInr, totalInr: c.totalInr, gstRate: c.gstRate } : {}),
    ...(stateCode ? { gstBuyer: { stateCode, ...(PIN_FOR[stateCode] ? { pin: PIN_FOR[stateCode] } : {}) } } : {}),
    status,
    paymentId,
    createdAt: new Date(createdMs),
    ...extra,
  };
}

/* ── in-memory Firestore with optimistic transactions + == / range queries (from payments.test) ── */
function memoryFirestore(seed = {}) {
  const docs = new Map();
  for (const [key, data] of Object.entries(seed)) docs.set(key, { data: { ...data }, version: 1 });
  const stats = { commits: 0, retries: 0, calls: 0 };
  const yieldNow = () => new Promise((r) => setImmediate(r));
  const snapOf = (entry) => ({ exists: !!entry, data: () => (entry ? { ...entry.data } : undefined) });
  const get = (obj, path) => path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
  const cmpVal = (v) => (v instanceof Date ? v.getTime() : v);
  function write(key, data, opts) {
    const prev = docs.get(key);
    const base = opts && opts.merge && prev ? prev.data : {};
    docs.set(key, { data: { ...base, ...data }, version: (prev ? prev.version : 0) + 1 });
  }
  function query(prefix, filters = []) {
    return {
      where: (field, op, value) => query(prefix, [...filters, [field, op, value]]),
      async get() {
        stats.calls += 1;
        await yieldNow();
        const rows = [];
        for (const [k, e] of docs) {
          if (!k.startsWith(`${prefix}/`) || k.slice(prefix.length + 1).includes('/')) continue;
          const ok = filters.every(([f, op, v]) => {
            const x = cmpVal(get(e.data, f));
            const y = cmpVal(v);
            if (op === '==') return x === y;
            if (x === undefined || x === null) return false;
            if (op === '>=') return x >= y;
            if (op === '<') return x < y;
            throw new Error(`fake: op ${op}`);
          });
          if (ok) rows.push({ id: k.slice(prefix.length + 1), data: () => ({ ...e.data }) });
        }
        return { empty: rows.length === 0, size: rows.length, docs: rows, forEach: (fn) => rows.forEach(fn) };
      },
    };
  }
  function ref(key) {
    return {
      key,
      collection: (sub) => ({ doc: (id) => ref(`${key}/${sub}/${id}`), ...query(`${key}/${sub}`) }),
      async get() { stats.calls += 1; await yieldNow(); return snapOf(docs.get(key)); },
      async set(data, opts) { stats.calls += 1; await yieldNow(); write(key, data, opts); },
    };
  }
  return {
    docs,
    stats,
    read: (key) => (docs.get(key) ? { ...docs.get(key).data } : undefined),
    collection: (name) => ({ doc: (id) => ref(`${name}/${id}`), ...query(name) }),
    async runTransaction(fn) {
      stats.calls += 1;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const seen = new Map();
        const pending = [];
        const tx = {
          async get(r) {
            await yieldNow();
            const entry = docs.get(r.key);
            seen.set(r.key, entry ? entry.version : 0);
            return snapOf(entry);
          },
          set(r, data, opts) { pending.push([r.key, data, opts]); },
        };
        const out = await fn(tx);
        await yieldNow();
        const conflict = [...seen].some(([k, v]) => (docs.get(k) ? docs.get(k).version : 0) !== v);
        if (conflict) { stats.retries += 1; continue; }
        for (const [k, d, o] of pending) write(k, d, o);
        stats.commits += 1;
        return out;
      }
      throw new Error('transaction contention: too many retries');
    },
  };
}

function invoicer(db, { env = ENV_READY, now = () => AFTER_CUTOFF, getDisplayName } = {}) {
  const events = [];
  const inv = g.createGstInvoicer({ adminFirestore: db, env, now, telemetry: { increment: (e) => events.push(e) }, getDisplayName });
  return { inv, events };
}

/* ══ §4.1 THE ROUNDING TABLE — every product, a Karnataka buyer and an other-state buyer ══ */

const PRODUCTS = [
  ['till_boards', pricing.TILL_BOARDS_FOUNDING_INR],
  ['month', pricing.PRICE_MONTHLY_FOUNDING_INR],
  ['pack_chapter', PACK_PRODUCTS.pack_chapter.priceInr],
  ['pack_mock', PACK_PRODUCTS.pack_mock.priceInr],
  ['pack_subject', PACK_PRODUCTS.pack_subject.priceInr],
  ['pack_bundle', PACK_PRODUCTS.pack_bundle.priceInr],
  ['pack_cbq', PACK_PRODUCTS.pack_cbq.priceInr],
];

test('rounding table: every product x (Karnataka, Maharashtra) — lines sum EXACTLY to the amount paid', () => {
  const rows = [];
  for (const [passType, baseInr] of PRODUCTS) {
    for (const stateCode of ['29', '27']) {
      const order = storedOrder({ passType, baseInr, stateCode, extra: passType.startsWith('pack_') && passType !== 'pack_bundle' ? { packTarget: 'maths' } : {} });
      const a = g.invoiceAmountsFor(order);
      assert.equal(a.held, undefined, `${passType} ${stateCode}`);
      assert.equal(a.taxablePaise, baseInr * 100);
      assert.equal(a.taxablePaise + a.cgstPaise + a.sgstPaise + a.igstPaise, order.amountPaise, `${passType} ${stateCode} sums`);
      assert.equal(a.totalPaise, order.amountPaise);
      if (stateCode === '29') {
        assert.equal(a.supplyType, 'intra');
        assert.equal(a.igstPaise, 0);
        assert.equal(a.cgstPaise, Math.floor(a.gstPaise / 2));
        assert.equal(a.sgstPaise, a.gstPaise - a.cgstPaise);
        assert.deepEqual(a.rates, { cgst: 9, sgst: 9 });
      } else {
        assert.equal(a.supplyType, 'inter');
        assert.equal(a.cgstPaise + a.sgstPaise, 0);
        assert.equal(a.igstPaise, a.gstPaise);
        assert.deepEqual(a.rates, { igst: 18 });
      }
      rows.push(`${passType} ${stateCode} ${a.taxablePaise} ${a.cgstPaise} ${a.sgstPaise} ${a.igstPaise} ${a.totalPaise}`);
    }
  }
  // The displayed figures, reproduced exactly: "₹1,917 + ₹345 GST (18%) = ₹2,262" and "₹49 + ₹9 = ₹58".
  const bp = g.invoiceAmountsFor(storedOrder({ baseInr: 1917, stateCode: '29' }));
  assert.deepEqual([bp.taxablePaise, bp.cgstPaise, bp.sgstPaise, bp.totalPaise], [191700, 17250, 17250, 226200]);
  const ch = g.invoiceAmountsFor(storedOrder({ passType: 'pack_chapter', baseInr: 49, stateCode: '27', extra: { packTarget: 'polynomials' } }));
  assert.deepEqual([ch.taxablePaise, ch.igstPaise, ch.totalPaise], [4900, 900, 5800]);
  assert.equal(rows.length, 14);
});

/* ══ §4.2 GAPLESS NUMBERING UNDER 20 CONCURRENT CAPTURES ══ */

test('20 concurrent captures: numbers 1..20, no gap, no duplicate (contended transactions retried)', async () => {
  const seed = {};
  for (let i = 0; i < 20; i += 1) seed[`payOrders/order_${i}`] = storedOrder({ paymentId: `pay_${i}`, stateCode: i % 2 ? '29' : '33' });
  const db = memoryFirestore(seed);
  const { inv } = invoicer(db);
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => inv.issueForPayment({ orderId: `order_${i}`, paymentId: `pay_${i}`, payment: {} })));
  assert.ok(results.every((r) => r.issued === true), JSON.stringify(results));
  const seqs = [];
  for (let i = 0; i < 20; i += 1) seqs.push(db.read(`payOrders/order_${i}`).gstInvoice.seq);
  assert.deepEqual(seqs.slice().sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.equal(db.read('gstInvoiceCounters/26-27').last, 20);
  assert.ok(db.stats.retries > 0, 'the test really contended (otherwise it proves nothing)');
  assert.equal(db.read('payOrders/order_0').gstInvoice.number.slice(0, 10), 'LT/26-27/0');
});

/* ══ §4.3 IDEMPOTENCY: webhook + verify (+ status) for the SAME payment = ONE invoice ══ */

test('the same payment issued 3 times at once (verify + webhook + status) = 1 invoice, 1 number', async () => {
  const db = memoryFirestore({ 'payOrders/o1': storedOrder({ paymentId: 'pay_1' }) });
  const { inv } = invoicer(db);
  const rs = await Promise.all([0, 1, 2].map(() => inv.issueForPayment({ orderId: 'o1', paymentId: 'pay_1', payment: {} })));
  assert.equal(rs.filter((r) => r.issued).length, 1);
  assert.equal(db.read('gstInvoiceCounters/26-27').last, 1);
  const again = await inv.issueForPayment({ orderId: 'o1', paymentId: 'pay_1', payment: {} });
  assert.equal(again.existing, 'LT/26-27/000001');
  assert.equal(db.read('gstInvoiceCounters/26-27').last, 1);
});

test('a different payment id than the one that paid the order gets nothing', async () => {
  const db = memoryFirestore({ 'payOrders/o1': storedOrder({ paymentId: 'pay_1' }) });
  const { inv } = invoicer(db);
  assert.deepEqual(await inv.issueForPayment({ orderId: 'o1', paymentId: 'pay_OTHER', payment: {} }), { skipped: 'unpaid' });
  assert.equal(db.read('gstInvoiceCounters/26-27'), undefined);
});

/* ══ §4.4 FY ROLLOVER at 1 April 00:00 IST ══ */

test('FY rollover: 31 Mar 23:59:59.999 IST is 26-27; 1 Apr 00:00 IST restarts at LT/27-28/000001', async () => {
  assert.equal(g.financialYearFor(IST('2027-03-31T23:59:59.999')), '26-27');
  assert.equal(g.financialYearFor(IST('2027-04-01T00:00:00')), '27-28');
  // 18:30Z on 31 Mar is ALREADY 1 April in IST (the UTC date would say March).
  assert.equal(g.financialYearFor(Date.parse('2027-03-31T18:30:00Z')), '27-28');
  assert.equal(g.financialYearFor(IST('2026-04-01T00:00:00')), '26-27');
  let clock = IST('2027-03-31T23:59:59.999');
  const db = memoryFirestore({
    'payOrders/a': storedOrder({ paymentId: 'pa' }),
    'payOrders/b': storedOrder({ paymentId: 'pb' }),
    'gstInvoiceCounters/26-27': { last: 41 },
  });
  const { inv } = invoicer(db, { now: () => clock });
  await inv.issueForPayment({ orderId: 'a', paymentId: 'pa', payment: {} });
  clock = IST('2027-04-01T00:00:00');
  await inv.issueForPayment({ orderId: 'b', paymentId: 'pb', payment: {} });
  assert.equal(db.read('payOrders/a').gstInvoice.number, 'LT/26-27/000042');
  assert.equal(db.read('payOrders/a').gstInvoice.dateIst, '31-03-2027');
  assert.equal(db.read('payOrders/b').gstInvoice.number, 'LT/27-28/000001');
  assert.equal(db.read('payOrders/b').gstInvoice.dateIst, '01-04-2027');
});

/* ══ §4.5 MISSING ENV FAILS CLOSED ══ */

test('missing / malformed seller env: no invoice, no number, order HELD with the missing names', async () => {
  for (const drop of ['SELLER_GSTIN', 'SELLER_ADDRESS', 'SAC_BOARD_PASS', 'SAC_PACKS']) {
    const env = { ...ENV_READY, [drop]: '' };
    const c = g.resolveInvoiceConfig(env);
    assert.equal(c.ready, false);
    assert.deepEqual(c.missing, [drop]);
    const db = memoryFirestore({ 'payOrders/o': storedOrder() });
    const { inv } = invoicer(db, { env });
    assert.deepEqual(await inv.issueForPayment({ orderId: 'o', paymentId: 'pay_A', payment: {} }), { held: 'seller_config_missing' });
    assert.equal(db.read('payOrders/o').gstInvoice, undefined);
    assert.deepEqual(db.read('payOrders/o').gstInvoiceHeld.missing, [drop]);
    assert.equal(db.read('gstInvoiceCounters/26-27'), undefined);
  }
  // A seller GSTIN from another state, or with a bad checksum, is "missing" too (never guessed, never used).
  assert.deepEqual(g.resolveInvoiceConfig({ ...ENV_READY, SELLER_GSTIN: TEST_B2B_GSTIN_MH }).missing, ['SELLER_GSTIN']);
  const badCheck = `${TEST_SELLER_GSTIN.slice(0, 14)}${TEST_SELLER_GSTIN[14] === 'A' ? 'B' : 'A'}`;
  assert.deepEqual(g.resolveInvoiceConfig({ ...ENV_READY, SELLER_GSTIN: badCheck }).missing, ['SELLER_GSTIN']);
  assert.deepEqual(g.resolveInvoiceConfig({ ...ENV_READY, SAC_PACKS: '1234' }).missing, ['SAC_PACKS']);
});

test('flag off (GST_INVOICE_ENABLED unset): no Firestore call at all', async () => {
  const db = memoryFirestore({ 'payOrders/o': storedOrder() });
  const { inv } = invoicer(db, { env: { ...ENV_READY, GST_INVOICE_ENABLED: '' } });
  assert.deepEqual(await inv.issueForPayment({ orderId: 'o', paymentId: 'pay_A', payment: {} }), { skipped: 'off' });
  assert.equal(db.stats.calls, 0);
});

test('a store that throws: issueForPayment resolves (never throws), nothing is written', async () => {
  const db = memoryFirestore({ 'payOrders/o': storedOrder() });
  db.runTransaction = async () => { throw new Error('FIRESTORE DOWN'); };
  const { inv, events } = invoicer(db);
  const err = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await inv.issueForPayment({ orderId: 'o', paymentId: 'pay_A', payment: {} }), { error: true });
  } finally {
    console.error = err;
  }
  assert.ok(events.includes('payments.gst_invoice.error'));
});

/* ══ §4.6 GSTIN CHECKSUM AND STATE-CODE MATCH ══ */

test('GSTIN: checksum (known public GSTINs), format, and the first two digits must equal the chosen state', () => {
  for (const ok of ['27AAPFU0939F1ZV', '29AAGCB7383J1Z4', '33AAACH7409R1Z8', TEST_SELLER_GSTIN]) assert.equal(g.isValidGstin(ok), true, ok);
  for (const bad of ['27AAPFU0939F1ZW', '27AAPFU0939F1Z', '99AAPFU0939F1ZV', '', 'hello']) assert.equal(g.isValidGstin(bad), false, bad);
  assert.equal(g.isValidGstin(' 27aapfu0939f1zv '), true, 'spaces and case are normalised');
  const business = { gstin: TEST_B2B_GSTIN_MH, legalName: 'Test Coaching Centre Pvt Ltd', address: '12 Test Road, Pune 411001' };
  assert.deepEqual(g.gstBuyerFromBody({ stateCode: '27', pin: '411001', business }).fields, { gstBuyer: { stateCode: '27', pin: '411001', business } });
  const mismatch = g.gstBuyerFromBody({ stateCode: '29', pin: '560001', business });
  assert.deepEqual(mismatch.fields, { gstBuyer: { stateCode: '29', pin: '560001' } });
  assert.deepEqual(mismatch.dropped, ['business']);
  const badSum = g.gstBuyerFromBody({ stateCode: '27', pin: '411001', business: { ...business, gstin: `${TEST_B2B_GSTIN_MH.slice(0, 14)}${TEST_B2B_GSTIN_MH[14] === 'A' ? 'B' : 'A'}` } });
  assert.deepEqual(badSum.dropped, ['business']);
  assert.deepEqual(g.gstBuyerFromBody({ stateCode: '29', pin: '12345' }).dropped, ['pin']);
  assert.deepEqual(g.gstBuyerFromBody({ stateCode: '25' }), { fields: {}, dropped: ['state'] }, '25 is a retired code');
  assert.deepEqual(g.gstBuyerFromBody(undefined), { fields: {}, dropped: [] });
});

test('the state table: 36 States / UTs, unique codes, IP region mapping only for India', () => {
  assert.equal(g.GST_STATES.length, 36);
  assert.equal(new Set(g.GST_STATES.map((s) => s.code)).size, 36);
  assert.equal(g.stateCodeFromIpRegion('IN', 'KA'), '29');
  assert.equal(g.stateCodeFromIpRegion('IN', 'IN-TG'), '36');
  assert.equal(g.stateCodeFromIpRegion('IN', 'TS'), '36');
  assert.equal(g.stateCodeFromIpRegion('IN', 'OR'), '21');
  assert.equal(g.stateCodeFromIpRegion('US', 'CA'), null);
  assert.equal(g.stateCodeFromIpRegion('IN', ''), null);
  assert.equal(g.stateCodeFromIpRegion('IN', 'ZZ'), null);
});

/* ══ §4.7 PRE-CUT-OFF, NO STATE, PACK CREDIT, TOP-UP, ABANDONED ══ */

test('held, never numbered: pre-cut-off, no state, pack credit, top-up; an abandoned (unpaid) order is untouched', async () => {
  const db = memoryFirestore({
    'payOrders/pre': storedOrder({ createdMs: BEFORE_CUTOFF, paymentId: 'p1' }),
    'payOrders/nostate': storedOrder({ stateCode: null, paymentId: 'p2' }),
    'payOrders/credit': storedOrder({ paymentId: 'p3', extra: { packCreditInr: 49, amountPaise: (2262 - 49) * 100 } }),
    'payOrders/topup': storedOrder({ passType: 'topup_49', baseInr: 49, paymentId: 'p4', createdMs: BEFORE_CUTOFF }), // D7: a top-up is no_sac_for_product even before the cut-off
    'payOrders/abandoned': storedOrder({ status: 'created', paymentId: undefined }),
  });
  const { inv } = invoicer(db);
  assert.deepEqual(await inv.issueForPayment({ orderId: 'pre', paymentId: 'p1', payment: {} }), { held: 'pre_cutoff' });
  assert.deepEqual(await inv.issueForPayment({ orderId: 'nostate', paymentId: 'p2', payment: {} }), { held: 'no_state' });
  assert.deepEqual(await inv.issueForPayment({ orderId: 'credit', paymentId: 'p3', payment: {} }), { held: 'pack_credit' });
  assert.deepEqual(await inv.issueForPayment({ orderId: 'topup', paymentId: 'p4', payment: {} }), { held: 'no_sac_for_product' });
  assert.deepEqual(await inv.issueForPayment({ orderId: 'abandoned', paymentId: 'pX', payment: {} }), { skipped: 'unpaid' });
  assert.equal(db.read('gstInvoiceCounters/26-27'), undefined, 'no number consumed');
  for (const id of ['pre', 'nostate', 'credit', 'topup']) assert.equal(db.read(`payOrders/${id}`).gstInvoice, undefined);
  assert.equal(db.read('payOrders/abandoned').gstInvoiceHeld, undefined);
  // The next real sale takes number 1.
  db.docs.set('payOrders/ok', { data: storedOrder({ paymentId: 'p5' }), version: 1 });
  await inv.issueForPayment({ orderId: 'ok', paymentId: 'p5', payment: {} });
  assert.equal(db.read('payOrders/ok').gstInvoice.number, 'LT/26-27/000001');
});

/* ══ the invoice record, the PDF and the CSVs ══ */

async function issuedPair() {
  const business = { gstin: TEST_B2B_GSTIN_MH, legalName: 'Test Coaching Centre Pvt Ltd', address: '12 Test Road, Pune 411001' };
  const db = memoryFirestore({
    'payOrders/ka': storedOrder({ paymentId: 'pay_ka', stateCode: '29', extra: { gstBuyer: { stateCode: '29', pin: '560001' } } }),
    'payOrders/mh': storedOrder({ passType: 'pack_bundle', baseInr: 299, paymentId: 'pay_mh', extra: { gstBuyer: { stateCode: '27', pin: '411001', business } } }),
  });
  const { inv } = invoicer(db, { getDisplayName: async () => 'Test Student' });
  await inv.issueForPayment({ orderId: 'ka', paymentId: 'pay_ka', payment: { email: 'student@example.com', contact: '+919999999999' } });
  await inv.issueForPayment({ orderId: 'mh', paymentId: 'pay_mh', payment: { email: 'office@example.com' } });
  return { db, ka: db.read('payOrders/ka').gstInvoice, mh: db.read('payOrders/mh').gstInvoice };
}

test('the stored invoice carries every field the PDF needs (seller snapshot, buyer, place of supply, SAC, taxes)', async () => {
  const { ka, mh } = await issuedPair();
  assert.equal(ka.seller.legalName, 'P&CGOLDDUST_TECH PRIVATE LIMITED');
  assert.equal(ka.seller.brand, 'Lazytopper');
  assert.equal(ka.seller.gstin, TEST_SELLER_GSTIN);
  assert.equal(ka.buyer.name, 'Test Student');
  assert.equal(ka.buyer.pin, '560001');
  assert.deepEqual(ka.placeOfSupply, { code: '29', name: 'Karnataka' });
  assert.equal(ka.line.sac, TEST_SAC);
  assert.equal(ka.supplyType, 'intra');
  assert.equal(mh.b2b, true);
  assert.equal(mh.buyer.gstin, TEST_B2B_GSTIN_MH);
  assert.equal(mh.buyer.name, 'Test Coaching Centre Pvt Ltd');
  assert.equal(mh.supplyType, 'inter');
  assert.equal(mh.igstPaise + mh.taxablePaise, 35300);

  const tk = invoiceTextBlocks(ka).totals.map((r) => r.join(' '));
  assert.deepEqual(tk, ['Taxable value Rs. 1,917.00', 'CGST @ 9% Rs. 172.50', 'SGST @ 9% Rs. 172.50', 'Total (amount paid) Rs. 2,262.00']);
  const tm = invoiceTextBlocks(mh);
  assert.deepEqual(tm.totals.map((r) => r.join(' ')), ['Taxable value Rs. 299.00', 'IGST @ 18% Rs. 54.00', 'Total (amount paid) Rs. 353.00']);
  assert.ok(tm.meta.includes('Place of supply: Maharashtra (code 27)'));
  assert.equal(tm.footer, 'This is a computer-generated invoice and does not require a signature.');
  for (const inv of [ka, mh]) {
    const pdf = renderInvoicePdf(inv);
    assert.equal(pdf.slice(0, 5).toString(), '%PDF-');
    assert.ok(pdf.length > 1000);
  }
});

test('GSTR-1 CSVs: invoice-wise, B2CS by place of supply + rate, B2B with GSTIN, SAC summary, held', async () => {
  const { ka, mh } = await issuedPair();
  const invoices = exp.invoicesCsv([mh, ka]).trim().split('\r\n');
  assert.equal(invoices.length, 3);
  assert.match(invoices[1], /^LT\/26-27\/000001,/);
  assert.match(invoices[1], /,1917\.00,18,0\.00,172\.50,172\.50,2262\.00,08-11-2026,No$/);
  assert.match(invoices[0], /,Invoice value,Supply date,Issued later$/);
  const b2cs = exp.b2csCsv([ka, mh]).trim().split('\r\n');
  assert.deepEqual(b2cs.slice(1), ['OE,29-Karnataka,18,,1917.00,0.00,,0.00,172.50,172.50,1']);
  const b2b = exp.b2bCsv([ka, mh]).trim().split('\r\n');
  assert.equal(b2b.length, 2);
  assert.ok(b2b[1].startsWith(`${TEST_B2B_GSTIN_MH},Test Coaching Centre Pvt Ltd,LT/26-27/000002,`));
  assert.ok(b2b[1].includes(',353.00,27-Maharashtra,N,,Regular B2B,,18,299.00,0.00'));
  const hsn = exp.hsnCsv([ka, mh]).trim().split('\r\n');
  assert.deepEqual(hsn.slice(1), [`${TEST_SAC},,OTH-OTHERS,2,2615.00,18,2216.00,54.00,172.50,172.50,0.00`]);
  assert.equal(exp.cell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`, 'formula injection is neutralised');
});

/* ══ the guest download token ══ */

test('signed invoice link: round-trips, rejects a forged / other-secret / malformed token', () => {
  const t = g.invoiceToken('order_ABC', 'secret-1');
  assert.equal(g.orderIdFromToken(t, 'secret-1'), 'order_ABC');
  assert.equal(g.orderIdFromToken(t, 'secret-2'), null);
  assert.equal(g.orderIdFromToken(`${Buffer.from('order_XYZ').toString('base64url')}.${t.split('.')[1]}`, 'secret-1'), null);
  assert.equal(g.orderIdFromToken('nope', 'secret-1'), null);
  assert.equal(g.invoiceToken('order_ABC', ''), '');
});

/* ══ afterCapture: the receipt still goes out; the invoice comes first when on ══ */

test('afterCapture: no invoicer -> the receipt starts synchronously, exactly as before', () => {
  let sent = 0;
  g.afterCapture({ invoicer: undefined, input: {}, sendReceipt: () => { sent += 1; } });
  assert.equal(sent, 1);
  g.afterCapture({ invoicer: { config: { enabled: false }, issueForPayment: () => { throw new Error('must not run'); } }, input: {}, sendReceipt: () => { sent += 1; } });
  assert.equal(sent, 2);
});

test('afterCapture: invoicing on -> the receipt waits for the invoice (so it can link it), never for longer than the cap', async () => {
  const order = [];
  let release;
  const slow = new Promise((r) => { release = r; });
  g.afterCapture({ invoicer: { config: { enabled: true }, issueForPayment: () => slow.then(() => order.push('invoice')) }, input: {}, sendReceipt: () => order.push('receipt') });
  assert.deepEqual(order, []);
  release();
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(order, ['invoice', 'receipt']);
  const hung = [];
  g.afterCapture({ invoicer: { config: { enabled: true }, issueForPayment: () => new Promise(() => {}) }, input: {}, sendReceipt: () => hung.push('receipt'), capMs: 10 });
  await new Promise((r) => setTimeout(r, 40));
  assert.deepEqual(hung, ['receipt']);
});

test('receipt email: the invoice line appears only when an invoice exists (byte-identical otherwise)', () => {
  const base = { passType: 'till_boards', amountPaise: 226200, paymentId: 'pay_1', paidAtMs: AFTER_CUTOFF, appUrl: 'https://lazytopper.com' };
  const without = buildReceiptEmail(base);
  const withNull = buildReceiptEmail({ ...base, invoice: null });
  assert.deepEqual(without, withNull);
  const withInv = buildReceiptEmail({ ...base, invoice: { number: 'LT/26-27/000001', url: 'https://lazytopper.com/packs#invoices' } });
  assert.ok(withInv.text.includes('GST tax invoice LT/26-27/000001: https://lazytopper.com/packs#invoices'));
  assert.ok(withInv.html.includes('Download the invoice (PDF)'));
  assert.ok(!without.text.includes('GST tax invoice'));
});

/* ══ the routes ══ */

const LINK_SECRET = 'test-invoice-link-secret-0123456789abcdef'; // test fixture (>= 32 chars)
function routesFor(db, { env = { ...ENV_READY, PAYMENTS_ENABLED: '1', INVOICE_LINK_SECRET: LINK_SECRET }, admin = true, inv = null, mailer = null } = {}) {
  const { sendJson, sendJsonWithHeaders } = createHttpUtils('*');
  return createGstInvoiceRoutes({
    sendJson,
    sendJsonWithHeaders,
    adminFirestore: db,
    env,
    now: () => AFTER_CUTOFF,
    verifiedCaller: { async resolveVerifiedUid(req) { const h = String(req.headers.authorization || ''); return h.startsWith('Bearer uid:') ? h.slice(11) : ''; } },
    requireAdmin: async (req) => (admin && req.headers.authorization === 'Bearer admin' ? { ok: true } : { ok: false, status: 403, error: 'no' }),
    invoicer: inv,
    invoiceMailer: mailer,
    readJson: async (r) => r.body,
  });
}
function fakeRes() {
  const r = { status: 0, headers: {}, body: Buffer.alloc(0) };
  return {
    r,
    writeHead(status, headers) { r.status = status; r.headers = headers || {}; },
    end(b) { r.body = Buffer.isBuffer(b) ? b : Buffer.from(String(b || '')); },
    json: () => JSON.parse(r.body.toString()),
  };
}
const req = (url, headers = {}) => ({ url, headers, method: 'GET' });

test('routes: the PDF only for the paying uid (others 403) or a valid signed token (forged 404)', async () => {
  const { db } = await issuedPair();
  const routes = routesFor(db);
  let res = fakeRes();
  await routes.handleInvoicePdf(req('/api/gst/invoice?orderId=ka', { authorization: 'Bearer uid:u1' }), res, '/api/gst/invoice?orderId=ka');
  assert.equal(res.r.status, 200);
  assert.equal(res.r.headers['Content-Type'], 'application/pdf');
  assert.equal(res.r.body.slice(0, 5).toString(), '%PDF-');
  res = fakeRes();
  await routes.handleInvoicePdf(req('/api/gst/invoice?orderId=ka', { authorization: 'Bearer uid:someone_else' }), res, '/api/gst/invoice?orderId=ka');
  assert.equal(res.r.status, 403);
  res = fakeRes();
  await routes.handleInvoicePdf(req('/api/gst/invoice?orderId=ka'), res, '/api/gst/invoice?orderId=ka');
  assert.equal(res.r.status, 401);
  const t = g.invoiceToken('mh', LINK_SECRET);
  res = fakeRes();
  await routes.handleInvoicePdf(req(`/api/gst/invoice?t=${t}`), res, `/api/gst/invoice?t=${t}`);
  assert.equal(res.r.status, 200);
  res = fakeRes();
  await routes.handleInvoicePdf(req(`/api/gst/invoice?t=${g.invoiceToken('mh', 'other')}`), res, `/api/gst/invoice?t=${g.invoiceToken('mh', 'other')}`);
  assert.equal(res.r.status, 404);
});

test('routes: my invoices (own only, 404 while invoicing is off) and checkout context (IP hint + remembered state)', async () => {
  const { db } = await issuedPair();
  let res = fakeRes();
  await routesFor(db).handleMyInvoices(req('/api/gst/invoices', { authorization: 'Bearer uid:u1' }), res);
  assert.equal(res.r.status, 200);
  assert.deepEqual(res.json().items.map((i) => i.number).sort(), ['LT/26-27/000001', 'LT/26-27/000002']);
  res = fakeRes();
  await routesFor(db, { env: { PAYMENTS_ENABLED: '1' } }).handleMyInvoices(req('/api/gst/invoices', { authorization: 'Bearer uid:u1' }), res);
  assert.equal(res.r.status, 404);
  res = fakeRes();
  await routesFor(db).handleCheckoutContext(req('/api/gst/checkout-context', { 'x-vercel-ip-country': 'IN', 'x-vercel-ip-country-region': 'MH' }), res);
  assert.deepEqual(res.json(), { ok: true, ipStateCode: '27', remembered: null });
  res = fakeRes();
  await routesFor(db).handleCheckoutContext(req('/api/gst/checkout-context', { authorization: 'Bearer uid:u1' }), res);
  assert.equal(res.json().remembered.stateCode !== undefined, true);
  res = fakeRes();
  await routesFor(db, { env: {} }).handleCheckoutContext(req('/api/gst/checkout-context'), res);
  assert.equal(res.r.status, 404, 'dark while PAYMENTS_ENABLED is off');
  const older = { uid: 'u1', gstBuyer: { stateCode: '07' }, createdAt: new Date(1) };
  const newer = { uid: 'u1', gstBuyer: { stateCode: '33', pin: '600001' }, createdAt: new Date(2) };
  assert.deepEqual(rememberedFrom([newer, older, { uid: 'u1', createdAt: new Date(3) }, { uid: 'u1', payer: 'parent', gstBuyer: { stateCode: '29' }, createdAt: new Date(9) }], 'u1'), { stateCode: '33', pin: '600001' });
});

test('admin routes: gated; status names missing config and lists held orders; CSV export', async () => {
  const { db } = await issuedPair();
  db.docs.set('payOrders/held1', { data: storedOrder({ createdMs: BEFORE_CUTOFF, paymentId: 'ph', extra: { paidAt: new Date(AFTER_CUTOFF) } }), version: 1 });
  const url = '/api/admin/gst/status?from=2026-11-01&to=2026-11-30';
  let res = fakeRes();
  await routesFor(db).handleAdminStatus(req(url, { authorization: 'Bearer nope' }), res, url);
  assert.equal(res.r.status, 403);
  res = fakeRes();
  await routesFor(db, { env: { ...ENV_READY, SAC_PACKS: '' } }).handleAdminStatus(req(url, { authorization: 'Bearer admin' }), res, url);
  const body = res.json();
  assert.deepEqual(body.config, { enabled: true, ready: false, missing: ['SAC_PACKS'] });
  assert.equal(body.invoiceCount, 2);
  assert.deepEqual(body.counters, { '26-27': 2 });
  assert.deepEqual(body.held.map((h) => [h.orderId, h.reason]), [['held1', 'pre_cutoff']]);
  const csvUrl = '/api/admin/gst/export?section=b2cs&from=2026-11-01&to=2026-11-30';
  res = fakeRes();
  await routesFor(db).handleAdminExport(req(csvUrl, { authorization: 'Bearer admin' }), res, csvUrl);
  assert.equal(res.r.status, 200);
  assert.match(res.r.headers['Content-Type'], /^text\/csv/);
  assert.ok(res.r.body.toString().includes('OE,29-Karnataka,18'));
  assert.equal(parseRange(new URLSearchParams('from=2026-11-30&to=2026-11-01')), null);
});

/* ══ wiring: the REAL payment routes store the state at order time and invoice once across verify + webhook ══ */

const KEY_ID = 'rzp_test_KEYID';
const KEY_SECRET = 'test_key_secret_never_sent';
const WEBHOOK_SECRET = 'test_webhook_secret';
const PAY_ENV = { PAYMENTS_ENABLED: '1', PACKS_ENABLED: '1', RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET };

function fakeRazorpay() {
  const orders = new Map();
  const payments = new Map();
  let seq = 0;
  const reply = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json });
  async function fetchImpl(url, init = {}) {
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    const u = new URL(url);
    let m;
    if (method === 'POST' && u.pathname === '/v1/orders') {
      seq += 1;
      const order = { id: `order_T${seq}`, amount: body.amount, currency: body.currency, status: 'created' };
      orders.set(order.id, order);
      return reply(200, order);
    }
    if (method === 'GET' && (m = u.pathname.match(/^\/v1\/orders\/([^/]+)\/payments$/))) {
      return reply(200, { items: [...payments.values()].filter((p) => p.order_id === m[1]) });
    }
    if (method === 'GET' && (m = u.pathname.match(/^\/v1\/payments\/([^/]+)$/))) {
      const p = payments.get(m[1]);
      return p ? reply(200, { ...p }) : reply(400, {});
    }
    return reply(404, {});
  }
  function pay(orderId) {
    const o = orders.get(orderId);
    const p = { id: `pay_${orderId}`, entity: 'payment', order_id: orderId, amount: o.amount, currency: 'INR', status: 'captured', email: 'buyer@example.com' };
    payments.set(p.id, p);
    return p;
  }
  return { fetchImpl, pay };
}

async function startPay(db, inv, rzp, now) {
  const { sendJson } = createHttpUtils('*');
  const routes = createPaymentRoutes({
    sendJson,
    adminFirestore: db,
    env: PAY_ENV,
    fetchImpl: rzp.fetchImpl,
    now,
    foundingOfferOpen: true,
    invoicer: inv,
    verifiedCaller: { async resolveVerifiedUid(r) { const h = String(r.headers.authorization || ''); return h.startsWith('Bearer uid:') ? h.slice(11) : ''; } },
  });
  const server = http.createServer((rq, rs) => {
    const p = String(rq.url).split('?')[0];
    const h = { [PAY_ORDER_PATH]: routes.handleOrder, [PAY_VERIFY_PATH]: routes.handleVerify, [PAY_WEBHOOK_PATH]: routes.handleWebhook, [PAY_STATUS_PATH]: routes.handleStatus }[p];
    return h ? h(rq, rs) : sendJson(rs, 404, {});
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, close: () => new Promise((r) => server.close(r)) };
}
function post(port, path, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const rq = http.request({ host: '127.0.0.1', port, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers } }, (rs) => {
      let t = '';
      rs.on('data', (c) => { t += c; });
      rs.on('end', () => resolve({ status: rs.statusCode, json: (() => { try { return JSON.parse(t); } catch { return null; } })() }));
    });
    rq.on('error', reject);
    rq.end(payload);
  });
}

test('wiring: order stores the confirmed state; verify + webhook for the same payment = ONE invoice; payment answers first', async () => {
  const db = memoryFirestore();
  const { inv } = invoicer(db);
  const rzp = fakeRazorpay();
  const srv = await startPay(db, inv, rzp, () => AFTER_CUTOFF);
  try {
    const o = await post(srv.port, PAY_ORDER_PATH, { passType: 'till_boards', gstBuyer: { stateCode: '33', pin: '600001' } }, { Authorization: 'Bearer uid:u9' });
    assert.equal(o.status, 200);
    assert.deepEqual(db.read(`payOrders/${o.json.orderId}`).gstBuyer, { stateCode: '33', pin: '600001' });
    assert.equal(o.json.amountPaise, 226200, 'the charge is unchanged by invoicing');
    const p = rzp.pay(o.json.orderId);
    const sig = crypto.createHmac('sha256', KEY_SECRET).update(`${o.json.orderId}|${p.id}`).digest('hex');
    const wh = `{"event":"payment.captured","payload":{"payment":{"entity":${JSON.stringify(p)}}}}`;
    const whSig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(wh).digest('hex');
    const [v, w] = await Promise.all([
      post(srv.port, PAY_VERIFY_PATH, { orderId: o.json.orderId, paymentId: p.id, signature: sig }, { Authorization: 'Bearer uid:u9' }),
      post(srv.port, PAY_WEBHOOK_PATH, wh, { 'x-razorpay-signature': whSig }),
    ]);
    assert.equal(v.status, 200, JSON.stringify(v.json));
    assert.equal(w.status, 200, JSON.stringify(w.json));
    await inv.whenIdle();
    const stored = db.read(`payOrders/${o.json.orderId}`);
    assert.equal(stored.gstInvoice.number, 'LT/26-27/000001');
    assert.equal(stored.gstInvoice.supplyType, 'inter');
    assert.equal(stored.gstInvoice.igstPaise, 34500);
    assert.equal(stored.gstInvoice.buyer.email, 'buyer@example.com');
    assert.equal(db.read('gstInvoiceCounters/26-27').last, 1);
    // A body with NO gstBuyer is byte-identical to before (no field); a forged state code is dropped, the order still made.
    const o2 = await post(srv.port, PAY_ORDER_PATH, { passType: 'pack_bundle', gstBuyer: { stateCode: '99' } }, { Authorization: 'Bearer uid:u9' });
    assert.equal(o2.status, 200);
    assert.equal('gstBuyer' in db.read(`payOrders/${o2.json.orderId}`), false);
  } finally {
    await srv.close();
  }
});

test('wiring: invoicing FAILING (store down for the invoice) never fails or changes the payment response', async () => {
  const db = memoryFirestore();
  const broken = { config: { enabled: true }, issueForPayment: () => Promise.reject(new Error('boom')) };
  const rzp = fakeRazorpay();
  const srv = await startPay(db, broken, rzp, () => AFTER_CUTOFF);
  try {
    const o = await post(srv.port, PAY_ORDER_PATH, { passType: 'till_boards' }, { Authorization: 'Bearer uid:u7' });
    const p = rzp.pay(o.json.orderId);
    const sig = crypto.createHmac('sha256', KEY_SECRET).update(`${o.json.orderId}|${p.id}`).digest('hex');
    const v = await post(srv.port, PAY_VERIFY_PATH, { orderId: o.json.orderId, paymentId: p.id, signature: sig }, { Authorization: 'Bearer uid:u7' });
    assert.equal(v.status, 200);
    assert.equal(v.json.ok, true);
    assert.equal(db.read(`payOrders/${o.json.orderId}`).status, 'paid');
  } finally {
    await srv.close();
  }
});

/* ══ review round (HOLD of #1619): D1 ownership, D2 issue now, D5 link secret, D6 dark context, D7 order ══ */

const BIZ_MH = () => ({ gstin: TEST_B2B_GSTIN_MH, legalName: 'Parent Coaching LLP', address: '1 Parent Road, Pune 411001' });

async function parentAndWho() {
  const db = memoryFirestore({
    // A parent paid for the child's Board Pass: uid is the CHILD, payer 'parent'; the invoice carries the PARENT's contact.
    'payOrders/par': storedOrder({ uid: 'child1', paymentId: 'pay_par', extra: { payer: 'parent', parentLinkId: 'L1', gstBuyer: { stateCode: '27', pin: '411001', business: BIZ_MH() } } }),
    // A signed-in payer bought for someone else; it was then claimed by the recipient (uid = recipient).
    'payOrders/who': storedOrder({ uid: 'recip1', paymentId: 'pay_who', extra: { payer: 'guest', checkoutWho: true, payerUid: 'payer1', gstBuyer: { stateCode: '33', pin: '600001' } } }),
    // A signed-out phone purchase claimed by the same person.
    'payOrders/self': storedOrder({ uid: 'phone1', paymentId: 'pay_self', extra: { payer: 'guest', gstBuyer: { stateCode: '07', pin: '110001' } } }),
  });
  const { inv } = invoicer(db);
  await inv.issueForPayment({ orderId: 'par', paymentId: 'pay_par', payment: { email: 'parent@example.com', contact: '+919888888888' } });
  await inv.issueForPayment({ orderId: 'who', paymentId: 'pay_who', payment: { email: 'payer@example.com' } });
  await inv.issueForPayment({ orderId: 'self', paymentId: 'pay_self', payment: {} });
  return db;
}

test('D1: the child of a parent-paid order gets 403, an empty list, and NO reuse of the parent state / GSTIN', async () => {
  const db = await parentAndWho();
  const routes = routesFor(db);
  let res = fakeRes();
  await routes.handleInvoicePdf(req('/api/gst/invoice?orderId=par', { authorization: 'Bearer uid:child1' }), res, '/api/gst/invoice?orderId=par');
  assert.equal(res.r.status, 403);
  res = fakeRes();
  await routes.handleMyInvoices(req('/api/gst/invoices', { authorization: 'Bearer uid:child1' }), res);
  assert.deepEqual(res.json().items, []);
  res = fakeRes();
  await routes.handleCheckoutContext(req('/api/gst/checkout-context', { authorization: 'Bearer uid:child1' }), res);
  assert.equal(res.json().remembered, null, 'the parent state / GSTIN is never offered to the child');
  // The recipient of someone else's purchase: same.
  res = fakeRes();
  await routes.handleInvoicePdf(req('/api/gst/invoice?orderId=who', { authorization: 'Bearer uid:recip1' }), res, '/api/gst/invoice?orderId=who');
  assert.equal(res.r.status, 403);
  res = fakeRes();
  await routes.handleCheckoutContext(req('/api/gst/checkout-context', { authorization: 'Bearer uid:recip1' }), res);
  assert.equal(res.json().remembered, null);
});

test('D1: the payer can still download: the parent by the signed link, a signed-in payer from the account; a self-claim is the owner', async () => {
  const db = await parentAndWho();
  const routes = routesFor(db);
  const t = g.invoiceToken('par', LINK_SECRET);
  let res = fakeRes();
  await routes.handleInvoicePdf(req(`/api/gst/invoice?t=${t}`), res, `/api/gst/invoice?t=${t}`);
  assert.equal(res.r.status, 200);
  res = fakeRes();
  await routes.handleInvoicePdf(req('/api/gst/invoice?orderId=who', { authorization: 'Bearer uid:payer1' }), res, '/api/gst/invoice?orderId=who');
  assert.equal(res.r.status, 200);
  res = fakeRes();
  await routes.handleMyInvoices(req('/api/gst/invoices', { authorization: 'Bearer uid:payer1' }), res);
  assert.deepEqual(res.json().items.map((i) => i.orderId), ['who']);
  res = fakeRes();
  await routes.handleCheckoutContext(req('/api/gst/checkout-context', { authorization: 'Bearer uid:payer1' }), res);
  assert.deepEqual(res.json().remembered, { stateCode: '33', pin: '600001' });
  res = fakeRes();
  await routes.handleInvoicePdf(req('/api/gst/invoice?orderId=self', { authorization: 'Bearer uid:phone1' }), res, '/api/gst/invoice?orderId=self');
  assert.equal(res.r.status, 200);
  assert.equal(g.invoiceOwnedBy({ uid: 'u', payer: 'parent' }, 'u'), false);
  assert.equal(g.invoiceOwnedBy({ uid: 'u' }, 'u'), true);
});

test('D2: admin "Issue now" issues a held order once the cause is fixed, through the same transaction; idempotent', async () => {
  const db = memoryFirestore({ 'payOrders/h': storedOrder({ paymentId: 'pay_h', extra: { paidAt: new Date(AFTER_CUTOFF) } }) });
  const broken = invoicer(db, { env: { ...ENV_READY, SAC_BOARD_PASS: '' } }).inv;
  assert.deepEqual(await broken.issueForPayment({ orderId: 'h', paymentId: 'pay_h', payment: {} }), { held: 'seller_config_missing' });
  const inv = g.createGstInvoicer({ adminFirestore: db, env: ENV_READY, now: () => AFTER_CUTOFF, fetchPayment: async (id) => ({ id }) });
  const routes = routesFor(db, { inv });
  let res = fakeRes();
  await routes.handleAdminIssue({ ...req('/api/admin/gst/issue', { authorization: 'Bearer nope' }), method: 'POST', body: { orderId: 'h' } }, res);
  assert.equal(res.r.status, 403);
  res = fakeRes();
  await routes.handleAdminIssue({ ...req('/api/admin/gst/issue', { authorization: 'Bearer admin' }), method: 'POST', body: { orderId: 'h' } }, res);
  assert.deepEqual(res.json().result, { issued: true, number: 'LT/26-27/000001' });
  assert.equal(db.read('payOrders/h').gstInvoiceHeld, null, 'the hold is cleared in the same write');
  res = fakeRes();
  await routes.handleAdminIssue({ ...req('/api/admin/gst/issue', { authorization: 'Bearer admin' }), method: 'POST', body: { orderId: 'h' } }, res);
  assert.deepEqual(res.json().result, { issued: false, existing: 'LT/26-27/000001' });
  assert.equal(db.read('gstInvoiceCounters/26-27').last, 1);
  // An issue that THREW at capture (store down) is recovered the same way.
  db.docs.set('payOrders/t', { data: storedOrder({ paymentId: 'pay_t' }), version: 1 });
  const realTx = db.runTransaction;
  db.runTransaction = async () => { throw new Error('FIRESTORE DOWN'); };
  const err = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await inv.issueForPayment({ orderId: 't', paymentId: 'pay_t', payment: {} }), { error: true });
  } finally {
    console.error = err;
    db.runTransaction = realTx;
  }
  assert.deepEqual(await inv.issueNow({ orderId: 't' }), { issued: true, number: 'LT/26-27/000002' });
  assert.deepEqual(await inv.issueNow({ orderId: 'nope' }), { skipped: 'unknown_order' });
});

test('D5: links use INVOICE_LINK_SECRET only; missing or short -> no link and no token accepted', async () => {
  assert.equal(g.invoiceLinkSecret({ INVOICE_LINK_SECRET: 'short' }), '');
  assert.equal(g.invoiceLinkSecret({ RAZORPAY_KEY_SECRET: LINK_SECRET }), '', 'the Razorpay secret is never used');
  assert.equal(g.invoiceLinkSecret({ INVOICE_LINK_SECRET: LINK_SECRET }), LINK_SECRET);
  const db = await parentAndWho();
  const t = g.invoiceToken('par', LINK_SECRET);
  const res = fakeRes();
  await routesFor(db, { env: { ...ENV_READY, PAYMENTS_ENABLED: '1', RAZORPAY_KEY_SECRET: LINK_SECRET } }).handleInvoicePdf(req(`/api/gst/invoice?t=${t}`), res, `/api/gst/invoice?t=${t}`);
  assert.equal(res.r.status, 404);
});

test('D6: checkout-context with invoicing OFF answers an empty context and touches no store', async () => {
  const db = memoryFirestore({ 'payOrders/x': storedOrder({ extra: { gstBuyer: { stateCode: '29' } } }) });
  const res = fakeRes();
  await routesFor(db, { env: { PAYMENTS_ENABLED: '1' } }).handleCheckoutContext(req('/api/gst/checkout-context', { authorization: 'Bearer uid:u1', 'x-vercel-ip-country': 'IN', 'x-vercel-ip-country-region': 'KA' }), res);
  assert.deepEqual(res.json(), { ok: true, ipStateCode: null, remembered: null });
  assert.equal(db.stats.calls, 0);
});

/* ══ GST-INVOICE-2a: PIN required, Issue now reads Razorpay's contact and emails the invoice (window + one a day) ══ */

test('2a PIN required server-side (FORMAT only): missing / malformed PIN is dropped, the order is still made, and it is HELD no_pin', async () => {
  assert.deepEqual(g.gstBuyerFromBody({ stateCode: '29' }), { fields: { gstBuyer: { stateCode: '29' } }, dropped: ['pin_missing'] });
  assert.deepEqual(g.gstBuyerFromBody({ stateCode: '29', pin: '012345' }), { fields: { gstBuyer: { stateCode: '29' } }, dropped: ['pin'] });
  assert.deepEqual(g.gstBuyerFromBody({ stateCode: '29', pin: '560001' }), { fields: { gstBuyer: { stateCode: '29', pin: '560001' } }, dropped: [] });
  assert.deepEqual(g.gstBuyerFromBody({ stateCode: '29', pin: '110001' }).dropped, [], 'never checked against the state (owner ruling)');
  assert.equal(g.isValidPin('560001'), true);
  assert.equal(g.isValidPin('56001'), false);
  assert.equal(g.isValidPin(undefined), false);
  const db = memoryFirestore({
    'payOrders/nopin': storedOrder({ paymentId: 'p1', extra: { gstBuyer: { stateCode: '29' } } }),
    'payOrders/badpin': storedOrder({ paymentId: 'p2', extra: { gstBuyer: { stateCode: '29', pin: '56001' } } }),
    'payOrders/ok': storedOrder({ paymentId: 'p3' }),
  });
  const { inv } = invoicer(db);
  assert.deepEqual(await inv.issueForPayment({ orderId: 'nopin', paymentId: 'p1', payment: {} }), { held: 'no_pin' });
  assert.deepEqual(await inv.issueForPayment({ orderId: 'badpin', paymentId: 'p2', payment: {} }), { held: 'no_pin' });
  assert.equal(db.read('payOrders/nopin').gstInvoiceHeld.reason, 'no_pin');
  assert.equal(db.read('gstInvoiceCounters/26-27'), undefined, 'a held order never consumes a number');
  assert.deepEqual(await inv.issueForPayment({ orderId: 'ok', paymentId: 'p3', payment: {} }), { issued: true, number: 'LT/26-27/000001' });
  // The PDF prints "State (code), PIN".
  const blocks = invoiceTextBlocks(db.read('payOrders/ok').gstInvoice);
  assert.ok(JSON.stringify(blocks).includes('State: Karnataka (code 29), PIN 560001'), JSON.stringify(blocks.buyer || blocks));
});

test('2a PIN required on the REAL order route: a body without a PIN still makes the order (payment never refused), stored without a PIN', async () => {
  const db = memoryFirestore();
  const { inv } = invoicer(db);
  const rzp = fakeRazorpay();
  const srv = await startPay(db, inv, rzp, () => AFTER_CUTOFF);
  try {
    const o = await post(srv.port, PAY_ORDER_PATH, { passType: 'till_boards', gstBuyer: { stateCode: '33' } }, { Authorization: 'Bearer uid:u9' });
    assert.equal(o.status, 200);
    assert.equal(o.json.amountPaise, 226200);
    assert.deepEqual(db.read(`payOrders/${o.json.orderId}`).gstBuyer, { stateCode: '33' });
  } finally {
    await srv.close();
  }
});

test('2c Issue now: the payer contact comes from Razorpay payments.fetch (only for THIS order), stored on the invoice', async () => {
  const db = memoryFirestore({
    'payOrders/order_A': storedOrder({ paymentId: 'pay_A1', extra: { gstInvoiceHeld: { reason: 'seller_config_missing' } } }),
  });
  const fetched = [];
  const fetchPayment = async (id) => {
    fetched.push(id);
    return { id, order_id: 'order_A', email: 'payer@example.com', contact: '+919812345678' };
  };
  const inv = g.createGstInvoicer({ adminFirestore: db, env: ENV_READY, now: () => AFTER_CUTOFF, fetchPayment });
  assert.deepEqual(await inv.issueNow({ orderId: 'order_A' }), { issued: true, number: 'LT/26-27/000001' });
  const a = db.read('payOrders/order_A').gstInvoice;
  assert.equal(a.buyer.email, 'payer@example.com');
  assert.equal(a.buyer.phone, '+919812345678');
  assert.deepEqual(fetched, ['pay_A1']);
  assert.deepEqual(await inv.issueNow({ orderId: 'order_A' }), { issued: false, existing: 'LT/26-27/000001' }, 'idempotent');
  // The fetcher: Basic auth with the server's keys, the payment URL; no keys -> null without a call.
  const calls = [];
  const f = g.createRazorpayPaymentFetcher({ env: { RAZORPAY_KEY_ID: 'rzp_test_K', RAZORPAY_KEY_SECRET: 'sec' }, fetchImpl: async (url, init) => { calls.push([url, init.headers.Authorization]); return { ok: true, json: async () => ({ id: 'pay_X' }) }; } });
  assert.deepEqual(await f('pay_X'), { id: 'pay_X' });
  assert.deepEqual(calls, [['https://api.razorpay.com/v1/payments/pay_X', `Basic ${Buffer.from('rzp_test_K:sec').toString('base64')}`]]);
  assert.equal(await g.createRazorpayPaymentFetcher({ env: {}, fetchImpl: async () => { throw new Error('must not call'); } })('pay_X'), null);
});

/** The receipt emailer in SEND mode with a fake Resend; `clock.t` is the injected now. */
function mailerFor(db, clock, { env = {} } = {}) {
  const sent = [];
  const fetchImpl = async (url, init) => {
    sent.push({ url, key: init.headers['Idempotency-Key'], body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ id: `re_${sent.length}` }) };
  };
  const mailer = createPaymentReceiptEmailer({
    adminFirestore: db,
    fetchImpl,
    now: () => clock.t,
    env: { PAYMENT_EMAIL_ENABLED: '1', RESEND_API_KEY: 're_test_key', INVOICE_LINK_SECRET: LINK_SECRET, ...env },
  });
  return { mailer, sent };
}
const HOUR = 60 * 60 * 1000;

async function issuedForMail(extra = {}) {
  const db = memoryFirestore({ 'payOrders/order_M': storedOrder({ paymentId: 'pay_M', extra: { paidAt: new Date(AFTER_CUTOFF - 48 * HOUR), ...extra } }) });
  const inv = g.createGstInvoicer({ adminFirestore: db, env: ENV_READY, now: () => AFTER_CUTOFF, fetchPayment: async (id) => ({ id, order_id: 'order_M', email: 'payer@example.com' }) });
  await inv.issueNow({ orderId: 'order_M' });
  return { db, inv };
}

test('2c invoice email: inside the window, nothing sent in 24 h -> the receipt is re-sent with the invoice link, once', async () => {
  const { db } = await issuedForMail();
  const clock = { t: AFTER_CUTOFF }; // 12:00 IST
  const { mailer, sent } = mailerFor(db, clock);
  assert.deepEqual(await mailer.queueInvoiceEmail({ orderId: 'order_M' }), { sent: true });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].key, 'gst-invoice-email-pay_M');
  assert.deepEqual(sent[0].body.to, ['payer@example.com']);
  assert.match(sent[0].body.subject, /^GST tax invoice LT\/26-27\/000001: /);
  assert.match(sent[0].body.text, /GST tax invoice LT\/26-27\/000001: https:\/\//);
  assert.equal(db.read('payOrders/order_M').gstInvoiceEmail.status, 'sent');
  assert.equal(db.read('nudgeEmails/u1').lastClaimMs, AFTER_CUTOFF, 'the other emailers now wait 24 h for this one');
  assert.deepEqual(await mailer.queueInvoiceEmail({ orderId: 'order_M' }), { skipped: 'sent' });
  assert.equal(sent.length, 1, 'never twice');
});

test('2c invoice email: outside 08:00-21:00 IST it is QUEUED (nothing sent, no ledger touched) and the drain sends it in the window', async () => {
  const { db } = await issuedForMail();
  const clock = { t: IST('2026-11-08T21:30:00') };
  const { mailer, sent } = mailerFor(db, clock);
  assert.deepEqual(await mailer.queueInvoiceEmail({ orderId: 'order_M' }), { queued: 'window' });
  clock.t = IST('2026-11-09T07:59:00');
  assert.deepEqual(await mailer.drainInvoiceEmails(), { sent: 0, queued: 0, skipped: 0, failed: 0 });
  assert.equal(sent.length, 0);
  assert.equal(db.read('nudgeEmails/u1'), undefined);
  assert.equal(db.read('payOrders/order_M').gstInvoiceEmail.status, 'queued');
  clock.t = IST('2026-11-09T08:00:00');
  assert.deepEqual(await mailer.drainInvoiceEmails(), { sent: 1, queued: 0, skipped: 0, failed: 0 });
  assert.equal(sent.length, 1);
  for (const hhmm of ['00:00', '07:59', '21:00', '23:59']) {
    const { db: d2 } = await issuedForMail();
    const m2 = mailerFor(d2, { t: IST(`2026-11-08T${hhmm}:00`) });
    assert.deepEqual(await m2.mailer.queueInvoiceEmail({ orderId: 'order_M' }), { queued: 'window' }, hhmm);
    assert.equal(m2.sent.length, 0, hhmm);
  }
});

test('2c invoice email: one email a day - a nudge, the receipt, a trial email or a guest email in the last 24 h queues it until 24 h have passed', async () => {
  const cases = [
    ['nudge', (db) => db.docs.set('nudgeEmails/u1', { data: { lastClaimMs: AFTER_CUTOFF - 2 * HOUR }, version: 1 })],
    ['receipt', (db) => { const o = db.read('payOrders/order_M'); db.docs.set('payOrders/order_M', { data: { ...o, receiptEmail: { status: 'sent', at: new Date(AFTER_CUTOFF - 2 * HOUR) } }, version: 9 }); }],
    ['trial', (db) => db.docs.set('trialEmails/u1', { data: { status: 'sent', sentAt: new Date(AFTER_CUTOFF - 2 * HOUR) }, version: 1 })],
    ['guest', (db) => { const k = require('./emailSuppression.cjs').emailKey('payer@example.com'); db.docs.set(`guestNudgeEmails/${k}`, { data: { lastClaimMs: AFTER_CUTOFF - 2 * HOUR }, version: 1 }); }],
  ];
  for (const [name, seed] of cases) {
    const { db } = await issuedForMail();
    seed(db);
    const clock = { t: AFTER_CUTOFF };
    const { mailer, sent } = mailerFor(db, clock);
    assert.deepEqual(await mailer.queueInvoiceEmail({ orderId: 'order_M' }), { queued: 'spaced' }, name);
    clock.t = AFTER_CUTOFF + 21 * HOUR; // 09:00 IST next day, 23 h after the other email
    assert.equal((await mailer.drainInvoiceEmails()).sent, 0, name);
    clock.t = AFTER_CUTOFF + 22 * HOUR + 1; // 10:00 IST, 24 h + 1 ms after it
    assert.equal((await mailer.drainInvoiceEmails()).sent, 1, name);
    assert.equal(sent.length, 1, name);
  }
});

test('2c invoice email: no address on the payment -> no_address, nothing sent; email off -> skipped, nothing written', async () => {
  const db = memoryFirestore({ 'payOrders/order_N': storedOrder({ paymentId: 'pay_N' }) });
  const inv = g.createGstInvoicer({ adminFirestore: db, env: ENV_READY, now: () => AFTER_CUTOFF, fetchPayment: async (id) => ({ id, order_id: 'order_N' }) });
  await inv.issueNow({ orderId: 'order_N' });
  const { mailer, sent } = mailerFor(db, { t: AFTER_CUTOFF });
  assert.deepEqual(await mailer.queueInvoiceEmail({ orderId: 'order_N' }), { skipped: 'no_address' });
  assert.equal(sent.length, 0);
  assert.equal(db.read('payOrders/order_N').gstInvoiceEmail.status, 'no_address');
  const { db: d2 } = await issuedForMail();
  const off = createPaymentReceiptEmailer({ adminFirestore: d2, fetchImpl: async () => { throw new Error('must not send'); }, now: () => AFTER_CUTOFF, env: {} });
  assert.deepEqual(await off.queueInvoiceEmail({ orderId: 'order_M' }), { skipped: 'off' });
  assert.equal(d2.read('payOrders/order_M').gstInvoiceEmail, undefined);
});

test('2c route: admin "Issue now" issues, fetches the contact and emails the invoice; an EXISTING invoice is not re-emailed', async () => {
  const db = memoryFirestore({ 'payOrders/order_R': storedOrder({ paymentId: 'pay_R', extra: { paidAt: new Date(AFTER_CUTOFF - 48 * HOUR) } }) });
  const inv = g.createGstInvoicer({ adminFirestore: db, env: ENV_READY, now: () => AFTER_CUTOFF, fetchPayment: async (id) => ({ id, order_id: 'order_R', email: 'payer@example.com' }) });
  const { mailer, sent } = mailerFor(db, { t: AFTER_CUTOFF });
  const routes = routesFor(db, { inv, mailer });
  let res = fakeRes();
  await routes.handleAdminIssue({ ...req('/api/admin/gst/issue', { authorization: 'Bearer admin' }), method: 'POST', body: { orderId: 'order_R' } }, res);
  assert.deepEqual(res.json(), { ok: true, result: { issued: true, number: 'LT/26-27/000001' }, email: { sent: true } });
  assert.equal(sent.length, 1);
  res = fakeRes();
  await routes.handleAdminIssue({ ...req('/api/admin/gst/issue', { authorization: 'Bearer admin' }), method: 'POST', body: { orderId: 'order_R' } }, res);
  assert.deepEqual(res.json(), { ok: true, result: { issued: false, existing: 'LT/26-27/000001' } });
  assert.equal(sent.length, 1);
});

test('2c a failing mailer never fails "Issue now": the invoice stands', async () => {
  const db = memoryFirestore({ 'payOrders/order_F': storedOrder({ paymentId: 'pay_F' }) });
  const inv = g.createGstInvoicer({ adminFirestore: db, env: ENV_READY, now: () => AFTER_CUTOFF, fetchPayment: async (id) => ({ id, order_id: 'order_F' }) });
  const mailer = { queueInvoiceEmail: async () => ({ error: true }) };
  const res = fakeRes();
  await routesFor(db, { inv, mailer }).handleAdminIssue({ ...req('/api/admin/gst/issue', { authorization: 'Bearer admin' }), method: 'POST', body: { orderId: 'order_F' } }, res);
  assert.equal(res.r.status, 200);
  assert.deepEqual(res.json().result, { issued: true, number: 'LT/26-27/000001' });
});

/* ══ review of #1623: F1 no payment record -> not issued; F2 a stale `sending` claim is retried; F3 at most 3 attempts ══ */

test('F1 Issue now: Razorpay unreachable / no keys / another order\'s payment -> NOT issued, no number used; a retry then issues', async () => {
  const db = memoryFirestore({ 'payOrders/order_X': storedOrder({ paymentId: 'pay_X', extra: { gstInvoiceHeld: { reason: 'seller_config_missing' } } }) });
  let mode = 'throw';
  const fetchPayment = async (id) => {
    if (mode === 'throw') throw new Error('razorpay down');
    if (mode === 'null') return null; // no keys / non-2xx
    if (mode === 'other') return { id, order_id: 'order_SOMEONE_ELSE', email: 'wrong@example.com' };
    return { id, order_id: 'order_X', email: 'payer@example.com' };
  };
  const inv = g.createGstInvoicer({ adminFirestore: db, env: ENV_READY, now: () => AFTER_CUTOFF, fetchPayment });
  for (const m of ['throw', 'null', 'other']) {
    mode = m;
    assert.deepEqual(await inv.issueNow({ orderId: 'order_X' }), { skipped: 'payment_fetch_failed' }, m);
    assert.equal(db.read('payOrders/order_X').gstInvoice, undefined, m);
    assert.equal(db.read('gstInvoiceCounters/26-27'), undefined, `${m}: no number consumed`);
  }
  const noFetcher = g.createGstInvoicer({ adminFirestore: db, env: ENV_READY, now: () => AFTER_CUTOFF });
  assert.deepEqual(await noFetcher.issueNow({ orderId: 'order_X' }), { skipped: 'payment_fetch_failed' });
  mode = 'ok';
  assert.deepEqual(await inv.issueNow({ orderId: 'order_X' }), { issued: true, number: 'LT/26-27/000001' });
  assert.equal(db.read('payOrders/order_X').gstInvoice.buyer.email, 'payer@example.com');
  // Through the route: the admin sees the skip, no email is attempted.
  const db2 = memoryFirestore({ 'payOrders/order_Y': storedOrder({ paymentId: 'pay_Y' }) });
  const inv2 = g.createGstInvoicer({ adminFirestore: db2, env: ENV_READY, now: () => AFTER_CUTOFF, fetchPayment: async () => null });
  let queued = 0;
  const res = fakeRes();
  await routesFor(db2, { inv: inv2, mailer: { queueInvoiceEmail: async () => { queued += 1; return { sent: true }; } } }).handleAdminIssue({ ...req('/api/admin/gst/issue', { authorization: 'Bearer admin' }), method: 'POST', body: { orderId: 'order_Y' } }, res);
  assert.deepEqual(res.json(), { ok: true, result: { skipped: 'payment_fetch_failed' } });
  assert.equal(queued, 0);
});

test('F2 a `sending` claim left by a crash is retried after 30 min (same Idempotency-Key); a fresh one is left alone', async () => {
  const { db } = await issuedForMail();
  const o = db.read('payOrders/order_M');
  db.docs.set('payOrders/order_M', { data: { ...o, gstInvoiceEmail: { status: 'sending', queuedAtMs: AFTER_CUTOFF - HOUR, attempts: 1, at: new Date(AFTER_CUTOFF) } }, version: 9 });
  const clock = { t: AFTER_CUTOFF + 29 * 60 * 1000 };
  const { mailer, sent } = mailerFor(db, clock);
  assert.deepEqual(await mailer.drainInvoiceEmails(), { sent: 0, queued: 0, skipped: 0, failed: 0 }, 'a 29-min-old claim may still be sending');
  assert.equal(db.read('payOrders/order_M').gstInvoiceEmail.status, 'sending');
  clock.t = AFTER_CUTOFF + 31 * 60 * 1000;
  assert.deepEqual(await mailer.drainInvoiceEmails(), { sent: 1, queued: 0, skipped: 0, failed: 0 });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].key, 'gst-invoice-email-pay_M', 'the same key: Resend drops a duplicate if the lost send did go out');
  const st = db.read('payOrders/order_M').gstInvoiceEmail;
  assert.equal(st.status, 'sent');
  assert.equal(st.attempts, 2);
});

test('F3 a temporary send failure is retried at most 3 times in all, then `failed` (shown to the admin); a hard refusal is not retried', async () => {
  const { db } = await issuedForMail();
  const clock = { t: AFTER_CUTOFF };
  const calls = [];
  const mailer = createPaymentReceiptEmailer({
    adminFirestore: db,
    now: () => clock.t,
    env: { PAYMENT_EMAIL_ENABLED: '1', RESEND_API_KEY: 're_test_key', INVOICE_LINK_SECRET: LINK_SECRET },
    fetchImpl: async (url, init) => { calls.push(init.headers['Idempotency-Key']); return { ok: false, status: 503, json: async () => ({}) }; },
  });
  const r1 = await mailer.queueInvoiceEmail({ orderId: 'order_M' });
  assert.deepEqual([r1.sent, r1.status, r1.attempts], [false, 'queued', 1]);
  // Each retry waits for the one-a-day clock the failed attempt set (24 h), inside the window.
  clock.t += 24 * HOUR + 1;
  assert.equal((await mailer.drainInvoiceEmails()).failed, 1);
  assert.deepEqual([db.read('payOrders/order_M').gstInvoiceEmail.status, db.read('payOrders/order_M').gstInvoiceEmail.attempts], ['queued', 2]);
  clock.t += 24 * HOUR + 1;
  assert.equal((await mailer.drainInvoiceEmails()).failed, 1);
  assert.deepEqual([db.read('payOrders/order_M').gstInvoiceEmail.status, db.read('payOrders/order_M').gstInvoiceEmail.attempts], ['failed', 3]);
  clock.t += 24 * HOUR + 1;
  assert.deepEqual(await mailer.drainInvoiceEmails(), { sent: 0, queued: 0, skipped: 0, failed: 0 }, 'never a 4th try');
  assert.equal(calls.length, 3);
  // A stale `sending` already at the cap becomes `failed` without a send.
  const o = db.read('payOrders/order_M');
  db.docs.set('payOrders/order_M', { data: { ...o, gstInvoiceEmail: { status: 'sending', queuedAtMs: 1, attempts: 3, at: new Date(clock.t - 2 * HOUR) } }, version: 99 });
  await mailer.drainInvoiceEmails();
  assert.equal(db.read('payOrders/order_M').gstInvoiceEmail.status, 'failed');
  assert.equal(calls.length, 3);
  // A non-retryable answer (4xx) is `refused` at once.
  const { db: d2 } = await issuedForMail();
  const m2 = createPaymentReceiptEmailer({ adminFirestore: d2, now: () => AFTER_CUTOFF, env: { PAYMENT_EMAIL_ENABLED: '1', RESEND_API_KEY: 're_test_key', INVOICE_LINK_SECRET: LINK_SECRET }, fetchImpl: async () => ({ ok: false, status: 422, json: async () => ({}) }) });
  assert.equal((await m2.queueInvoiceEmail({ orderId: 'order_M' })).status, 'refused');
});

/* ══ GST-INVOICE-BACKDATE-1: invoices issued later for the sales of 16 Sep - 6 Nov 2026 ══ */

const bd = require('./gstBackdate.cjs');

/** A past sale exactly as payments.cjs stored it before the cut-off: GST-inclusive amount, no breakup, no state. */
function pastOrder({ passType = 'till_boards', inr = 1917, paid = '2026-10-01T10:00:00', created, uid = 'u1', paymentId = 'pay_P', extra = {} } = {}) {
  return {
    uid,
    passType,
    amountPaise: inr * 100,
    status: 'paid',
    paymentId,
    createdAt: new Date(IST(created || paid)),
    paidAt: new Date(IST(paid)),
    ...(passType.startsWith('pack_') && passType !== 'pack_bundle' ? { packTarget: passType === 'pack_chapter' ? 'polynomials' : 'maths' } : {}),
    ...extra,
  };
}

test('BACKDATE worked-back rounding: every price paid in the window, and every rupee 1..3000 (credit-reduced amounts), sums EXACTLY', () => {
  const table = [
    // paid (Rs), taxable (paise), GST (paise)
    [1917, 162458, 29242], // CA's example: 1,624.58 + 292.42
    [599, 50763, 9137],
    [49, 4153, 747],
    [99, 8390, 1510],
    [199, 16864, 3036],
    [299, 25339, 4561],
  ];
  for (const [inr, taxable, gst] of table) {
    for (const st of ['29', '27']) {
      const a = g.workedBackAmounts(inr * 100, st);
      assert.equal(a.taxablePaise, taxable, `${inr} taxable`);
      assert.equal(a.gstPaise, gst, `${inr} gst`);
      assert.equal(a.taxablePaise + a.cgstPaise + a.sgstPaise + a.igstPaise, inr * 100, `${inr} ${st} sums`);
      if (st === '29') assert.deepEqual([a.supplyType, a.igstPaise, a.cgstPaise + a.sgstPaise], ['intra', 0, gst]);
      else assert.deepEqual([a.supplyType, a.cgstPaise, a.sgstPaise, a.igstPaise], ['inter', 0, 0, gst]);
    }
  }
  // Credit-reduced amounts are not in the repo's data (no refund / credit ledger for past sales): EVERY whole-rupee
  // amount up to Rs 3,000 is checked instead - taxable is paid/1.18 to the nearest paisa and the lines sum exactly.
  for (let inr = 1; inr <= 3000; inr += 1) {
    const paid = inr * 100;
    const a = g.workedBackAmounts(paid, inr % 2 ? '29' : '33');
    assert.equal(a.taxablePaise + a.cgstPaise + a.sgstPaise + a.igstPaise, paid, `${inr} sums`);
    assert.ok(Math.abs(a.taxablePaise * 118 - paid * 100) <= 59, `${inr} is paid/1.18 to the nearest paisa`);
  }
  assert.deepEqual(g.workedBackAmounts(0, '29'), { held: 'amount_mismatch' });
});

test('BACKDATE past sales: from 16 Sep 00:00 IST, created before the cut-off; never pre-registration, a top-up, refunded or unpaid', () => {
  assert.equal(g.backdateExclusion(pastOrder({ paid: '2026-09-16T00:00:00' })), null);
  assert.equal(g.backdateExclusion(pastOrder({ paid: '2026-09-15T23:59:59' })), 'pre_registration');
  assert.equal(g.backdateExclusion(pastOrder({ paid: '2026-11-06T23:59:59' })), null);
  assert.equal(g.backdateExclusion(pastOrder({ paid: '2026-11-07T00:00:01', created: '2026-11-07T00:00:00' })), 'not_past_sale');
  assert.equal(g.backdateExclusion(pastOrder({ paid: '2026-11-07T00:05:00', created: '2026-11-06T23:59:00' })), null, 'created before the cut-off, paid just after');
  assert.equal(g.backdateExclusion(pastOrder({ passType: 'topup_tutor' })), 'no_sac_for_product');
  assert.equal(g.backdateExclusion(pastOrder({ extra: { status: 'created' } })), 'unpaid');
  assert.equal(g.backdateExclusion(pastOrder({ extra: { gstBackdate: { status: 'refunded' } } })), 'refunded');
  assert.equal(g.backdateExclusion(pastOrder({ extra: { refundedAt: new Date(1) } })), 'refunded');
});

test('BACKDATE details token: round-trips, expires after 30 days, rejects tampering, another secret and the invoice-download token', () => {
  const t0 = IST('2026-11-08T12:00:00');
  const exp = t0 + bd.DETAILS_TOKEN_TTL_MS;
  const tok = bd.detailsToken('order_P1', exp, LINK_SECRET);
  assert.deepEqual(bd.parseDetailsToken(tok, LINK_SECRET, t0), { orderId: 'order_P1', expMs: exp });
  assert.deepEqual(bd.parseDetailsToken(tok, LINK_SECRET, exp - 1).orderId, 'order_P1');
  assert.deepEqual(bd.parseDetailsToken(tok, LINK_SECRET, exp), { error: 'expired' });
  const [payload, mac] = tok.split('.');
  const forged = Buffer.from(`order_P2.${exp}`).toString('base64url');
  assert.deepEqual(bd.parseDetailsToken(`${forged}.${mac}`, LINK_SECRET, t0), { error: 'invalid' }, 'another order');
  const longer = Buffer.from(`order_P1.${exp + 10 * 86400000}`).toString('base64url');
  assert.deepEqual(bd.parseDetailsToken(`${longer}.${mac}`, LINK_SECRET, t0), { error: 'invalid' }, 'a pushed-out expiry');
  assert.deepEqual(bd.parseDetailsToken(`${payload}.${mac.slice(0, -1)}A`, LINK_SECRET, t0).error, 'invalid');
  assert.deepEqual(bd.parseDetailsToken(tok, 'another-secret-another-secret-0123456789', t0), { error: 'invalid' });
  assert.deepEqual(bd.parseDetailsToken(g.invoiceToken('order_P1', LINK_SECRET), LINK_SECRET, t0), { error: 'invalid' }, 'the download link is not a form link');
  assert.equal(g.orderIdFromToken(tok, LINK_SECRET), null, 'nor the other way round');
  assert.equal(bd.detailsToken('order_P1', exp, ''), '', 'no secret, no link');
  assert.deepEqual(bd.parseDetailsToken(tok, '', t0), { error: 'invalid' });
});

/** A backdate service over a fake Resend; `clock.t` is now. Each email records its link token. */
function backdateFor(db, clock, { env = {}, payments = {}, accountEmails = {}, fetchPayment: fetchOverride = null } = {}) {
  const E = { ...ENV_READY, PAYMENT_EMAIL_ENABLED: '1', RESEND_API_KEY: 're_test_key', INVOICE_LINK_SECRET: LINK_SECRET, ...env };
  const sent = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    const m = /invoice-details\?t=([^\s"<]+)/.exec(body.text);
    sent.push({ key: init.headers['Idempotency-Key'], to: body.to[0], subject: body.subject, text: body.text, token: m ? decodeURIComponent(m[1]) : null });
    return { ok: true, status: 200, json: async () => ({ id: `re_${sent.length}` }) };
  };
  const now = () => clock.t;
  const mailer = createPaymentReceiptEmailer({ adminFirestore: db, fetchImpl, now, env: E });
  const inv = g.createGstInvoicer({ adminFirestore: db, env: E, now, fetchPayment: async (id) => (payments[id] === undefined ? null : payments[id]) });
  const fetchPayment = fetchOverride || (async (id) => (payments[id] === undefined ? null : payments[id]));
  const svc = bd.createGstBackdate({ adminFirestore: db, invoicer: inv, mailer, fetchPayment, getAccountEmail: async (uid) => accountEmails[uid] || '', env: E, now });
  return { svc, sent, inv, mailer, env: E };
}

test('BACKDATE end to end: list -> send forms (payer email, account fallback, refunded, no address) -> form -> invoice in the SAME series', async () => {
  const db = memoryFirestore({
    'payOrders/order_KA': pastOrder({ uid: 'uKA', paymentId: 'pay_KA', paid: '2026-10-01T10:00:00' }),
    'payOrders/order_ACCT': pastOrder({ uid: 'uAC', passType: 'pack_chapter', inr: 49, paymentId: 'pay_AC', paid: '2026-09-20T09:00:00' }),
    'payOrders/order_REF': pastOrder({ uid: 'uRF', paymentId: 'pay_RF', paid: '2026-10-05T09:00:00' }),
    'payOrders/order_NOAD': pastOrder({ uid: null, passType: 'pack_bundle', inr: 299, paymentId: 'pay_NA', paid: '2026-10-06T09:00:00', extra: { payer: 'parent' } }),
    'payOrders/order_PRE': pastOrder({ uid: 'uPR', paymentId: 'pay_PR', paid: '2026-09-10T09:00:00' }),
    'payOrders/order_NEW': storedOrder({ paymentId: 'pay_NEW', extra: { paidAt: new Date(AFTER_CUTOFF) } }),
  });
  const clock = { t: IST('2026-11-08T12:00:00') };
  const { svc, sent, inv } = backdateFor(db, clock, {
    payments: {
      pay_KA: { id: 'pay_KA', order_id: 'order_KA', email: 'ka.buyer@example.com', contact: '+919800000001', status: 'captured' },
      pay_AC: { id: 'pay_AC', order_id: 'order_ACCT', status: 'captured' },
      pay_RF: { id: 'pay_RF', order_id: 'order_REF', email: 'rf@example.com', status: 'refunded', amount_refunded: 191700 },
      pay_NA: { id: 'pay_NA', order_id: 'order_NOAD', status: 'captured' },
    },
    accountEmails: { uAC: 'account.owner@example.com' },
  });
  let list = await svc.listPastSales();
  assert.deepEqual(list.rows.map((r) => [r.orderId, r.status]), [['order_ACCT', 'needs_details'], ['order_KA', 'needs_details'], ['order_REF', 'needs_details'], ['order_NOAD', 'needs_details']]);
  const result = await svc.sendForms();
  assert.deepEqual([result.queued, result.refunded, result.noAddress, result.sent], [2, 1, 1, 2]);
  assert.deepEqual(sent.map((s) => [s.to, s.key]).sort(), [['account.owner@example.com', 'gst-state-form-pay_AC'], ['ka.buyer@example.com', 'gst-state-form-pay_KA']]);
  assert.match(sent[0].subject, /confirm your state/);
  assert.ok(!/Karnataka/.test(sent.map((s) => s.text).join(' ')), 'no state is suggested in the email');
  list = await svc.listPastSales();
  assert.deepEqual(Object.fromEntries(list.rows.map((r) => [r.orderId, r.status])), { order_ACCT: 'form_sent', order_KA: 'form_sent', order_NOAD: 'no_address' });
  assert.equal(list.refundedExcluded, 1, 'the refunded order leaves the list');
  assert.equal(list.rows.find((r) => r.orderId === 'order_KA').emailMasked, 'ka••••@example.com');
  // The buyer opens the form: NO state is suggested (no IP, no Karnataka default).
  const ka = sent.find((s) => s.key === 'gst-state-form-pay_KA');
  const details = await svc.getDetails(ka.token);
  assert.deepEqual(details, { item: 'Board Pass (Premium till your boards)', amountPaise: 191700, paidOn: '1 October 2026', status: 'needs_details' });
  // Bad answers are refused with the field (never guessed).
  assert.deepEqual(await svc.submitDetails(ka.token, { pin: '560001' }), { error: 'bad_input', field: 'state' });
  assert.deepEqual(await svc.submitDetails(ka.token, { stateCode: '29' }), { error: 'bad_input', field: 'pin' });
  assert.deepEqual(await svc.submitDetails(ka.token, { stateCode: '29', pin: '56001' }), { error: 'bad_input', field: 'pin' });
  assert.deepEqual(await svc.submitDetails(ka.token, { stateCode: '29', pin: '560001', business: { gstin: 'NOPE', legalName: 'X Y', address: '1 Road, City' } }), { error: 'bad_input', field: 'business' });
  assert.equal(db.read('payOrders/order_KA').gstBuyer, undefined, 'nothing stored for a refused answer');
  // A live capture happens meanwhile: same series, no gap.
  db.docs.set('payOrders/order_NEW', { data: { ...db.read('payOrders/order_NEW') }, version: 7 });
  await inv.issueForPayment({ orderId: 'order_NEW', paymentId: 'pay_NEW', payment: {} });
  const r = await svc.submitDetails(ka.token, { stateCode: '29', pin: '560001' });
  assert.equal(r.ok, true);
  assert.equal(r.status, 'invoiced');
  assert.equal(r.invoice.number, 'LT/26-27/000002');
  assert.match(r.invoice.url, /^\/api\/gst\/invoice\?t=/);
  const invRec = db.read('payOrders/order_KA').gstInvoice;
  assert.deepEqual([invRec.taxablePaise, invRec.cgstPaise, invRec.sgstPaise, invRec.igstPaise, invRec.totalPaise], [162458, 14621, 14621, 0, 191700]);
  assert.deepEqual([invRec.issuedLater, invRec.supplyDateIst, invRec.dateIst], [true, '01-10-2026', '08-11-2026']);
  assert.deepEqual([invRec.buyer.stateCode, invRec.buyer.pin, invRec.buyer.email, invRec.buyer.phone], ['29', '560001', 'ka.buyer@example.com', '+919800000001']);
  // Idempotent: a second submit (or a double tap) returns the SAME invoice; no number is used.
  const again = await svc.submitDetails(ka.token, { stateCode: '27', pin: '411001' });
  assert.equal(again.invoice.number, 'LT/26-27/000002');
  assert.equal(db.read('payOrders/order_KA').gstBuyer.stateCode, '29', 'an invoiced order is never changed');
  assert.equal(db.read('gstInvoiceCounters/26-27').last, 2);
  assert.deepEqual((await svc.getDetails(ka.token)).status, 'invoiced');
  // The invoice email is queued: the form went to this person today, so it waits for the one-a-day rule.
  assert.equal(db.read('payOrders/order_KA').gstInvoiceEmail.status, 'queued');
  // The PDF prints the supply date and the note; the GSTR-1 list flags it.
  const blocks = invoiceTextBlocks(invRec);
  assert.ok(blocks.meta.includes('Supply date: 01-10-2026 (IST)'));
  assert.match(blocks.note, /issued for a supply made on 01-10-2026/);
  assert.ok(renderInvoicePdf(invRec).length > 1000);
  const csv = exp.invoicesCsv([invRec]).trim().split('\r\n');
  assert.match(csv[1], /,1624\.58,18,0\.00,146\.21,146\.21,1917\.00,01-10-2026,Yes$/);
  // An inter-state answer: IGST.
  const ac = sent.find((s) => s.key === 'gst-state-form-pay_AC');
  const r2 = await svc.submitDetails(ac.token, { stateCode: '33', pin: '600001' });
  const rec2 = db.read('payOrders/order_ACCT').gstInvoice;
  assert.equal(r2.invoice.number, 'LT/26-27/000003');
  assert.deepEqual([rec2.taxablePaise, rec2.igstPaise, rec2.cgstPaise, rec2.supplyType], [4153, 747, 0, 'inter']);
});

test('BACKDATE concurrency: 6 form answers and 6 live captures at once take numbers 1..12, no gap, no duplicate', async () => {
  const seed = {};
  for (let i = 0; i < 6; i += 1) {
    seed[`payOrders/past_${i}`] = pastOrder({ paymentId: `pp_${i}`, uid: `p${i}`, extra: { gstBackdate: { status: 'form_sent', formSentAtMs: 1, contact: { email: `p${i}@example.com` } } } });
    seed[`payOrders/live_${i}`] = storedOrder({ paymentId: `pl_${i}`, uid: `l${i}` });
  }
  const db = memoryFirestore(seed);
  const clock = { t: IST('2026-11-08T12:00:00') };
  const { svc, inv } = backdateFor(db, clock);
  const toks = Array.from({ length: 6 }, (_, i) => bd.detailsToken(`past_${i}`, clock.t + 1000, LINK_SECRET));
  await Promise.all([
    ...toks.map((t) => svc.submitDetails(t, { stateCode: '07', pin: '110001' })),
    ...Array.from({ length: 6 }, (_, i) => inv.issueForPayment({ orderId: `live_${i}`, paymentId: `pl_${i}`, payment: {} })),
  ]);
  const seqs = [];
  for (let i = 0; i < 6; i += 1) seqs.push(db.read(`payOrders/past_${i}`).gstInvoice.seq, db.read(`payOrders/live_${i}`).gstInvoice.seq);
  assert.deepEqual(seqs.sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(db.read('gstInvoiceCounters/26-27').last, 12);
});

test('BACKDATE emails: never outside 08:00-21:00 IST; one reminder after 5 days, then nothing; the daily cap holds', async () => {
  const db = memoryFirestore({
    'payOrders/o1': pastOrder({ uid: 'a1', paymentId: 'p1' }),
    'payOrders/o2': pastOrder({ uid: 'a2', paymentId: 'p2' }),
    'payOrders/o3': pastOrder({ uid: 'a3', paymentId: 'p3' }),
  });
  const payments = {};
  for (const i of [1, 2, 3]) payments[`p${i}`] = { id: `p${i}`, order_id: `o${i}`, email: `b${i}@example.com` };
  const clock = { t: IST('2026-11-08T21:30:00') };
  const { svc, sent } = backdateFor(db, clock, { payments, env: { GST_INVOICE_EMAIL_DAILY_CAP: '2' } });
  const r = await svc.sendForms();
  assert.deepEqual([r.queued, r.sent], [3, 0], 'queued at 21:30, nothing sent');
  for (const hhmm of ['23:00', '00:00', '07:59']) {
    clock.t = IST(`2026-11-${hhmm < '08' ? '09' : '08'}T${hhmm}:00`);
    assert.deepEqual(await svc.drain(), { sent: 0, waiting: 0, failed: 0 }, hhmm);
  }
  assert.equal(sent.length, 0);
  clock.t = IST('2026-11-09T08:00:00');
  assert.equal((await svc.drain()).sent, 2, 'the daily cap (2) stops the third');
  clock.t = IST('2026-11-09T15:00:00');
  assert.equal((await svc.drain()).sent, 0, 'still the same IST day');
  clock.t = IST('2026-11-10T08:00:00');
  assert.equal((await svc.drain()).sent, 1, 'the next day');
  assert.equal(sent.filter((s) => /gst-state-form/.test(s.key)).length, 3);
  // Reminders: 5 days after each form, in the window, once.
  const firstForm = IST('2026-11-09T08:00:00');
  clock.t = firstForm + bd.REMINDER_AFTER_MS - 60000;
  assert.equal((await svc.drain()).sent, 0, 'not before 5 days');
  clock.t = IST('2026-11-14T08:00:00');
  assert.equal((await svc.drain()).sent, 2, 'two reminders (the cap is per day)');
  clock.t = IST('2026-11-15T09:00:00');
  assert.equal((await svc.drain()).sent, 1);
  const reminders = sent.filter((s) => /gst-state-reminder/.test(s.key));
  assert.equal(reminders.length, 3);
  assert.match(reminders[0].subject, /^Reminder: /);
  assert.ok(bd.parseDetailsToken(reminders[0].token, LINK_SECRET, clock.t).orderId, 'the reminder carries a fresh 30-day link');
  for (const day of ['2026-11-20', '2026-11-25', '2026-12-05']) {
    clock.t = IST(`${day}T10:00:00`);
    assert.equal((await svc.drain()).sent, 0, `${day}: no second reminder`);
  }
  assert.equal(sent.length, 6);
  const list = await svc.listPastSales();
  assert.deepEqual([...new Set(list.rows.map((x) => x.status))], ['reminder_sent']);
});

test('BACKDATE one email a day: a nudge to the same account today defers the form to tomorrow', async () => {
  const db = memoryFirestore({ 'payOrders/o1': pastOrder({ uid: 'a1', paymentId: 'p1' }), 'nudgeEmails/a1': { lastClaimMs: IST('2026-11-08T09:00:00') } });
  const clock = { t: IST('2026-11-08T12:00:00') };
  const { svc, sent } = backdateFor(db, clock, { payments: { p1: { id: 'p1', order_id: 'o1', email: 'b1@example.com' } } });
  assert.equal((await svc.sendForms()).sent, 0);
  clock.t = IST('2026-11-09T08:30:00');
  assert.equal((await svc.drain()).sent, 0, '23.5 h after the nudge');
  clock.t = IST('2026-11-09T09:00:00');
  assert.equal((await svc.drain()).sent, 1);
  assert.equal(sent.length, 1);
  assert.equal(db.read('nudgeEmails/a1').lastClaimMs, IST('2026-11-09T09:00:00'), 'and the nudges now wait for it');
});

test('BACKDATE Razorpay unreachable: the order is left for the next click (never assumed not refunded)', async () => {
  const db = memoryFirestore({ 'payOrders/o1': pastOrder({ paymentId: 'p1' }) });
  const { svc, sent } = backdateFor(db, { t: IST('2026-11-08T12:00:00') }, { payments: {} });
  const r = await svc.sendForms();
  assert.deepEqual([r.queued, r.retryLater, r.sent], [0, 1, 0]);
  assert.equal(sent.length, 0);
  assert.equal((await svc.listPastSales()).rows[0].status, 'needs_details');
});

test('BACKDATE seller config missing at submit: details saved, not issued; "Issue now" later issues the backdated invoice', async () => {
  const db = memoryFirestore({ 'payOrders/o1': pastOrder({ paymentId: 'p1', extra: { gstBackdate: { status: 'form_sent', formSentAtMs: 1, contact: { email: 'b@example.com' } } } }) });
  const clock = { t: IST('2026-11-08T12:00:00') };
  const { svc } = backdateFor(db, clock, { env: { SAC_BOARD_PASS: '' } });
  const tok = bd.detailsToken('o1', clock.t + 1000, LINK_SECRET);
  assert.deepEqual(await svc.submitDetails(tok, { stateCode: '32', pin: '682001' }), { ok: true, status: 'details_received', held: 'seller_config_missing' });
  assert.equal(db.read('gstInvoiceCounters/26-27'), undefined);
  assert.equal((await svc.listPastSales()).rows[0].status, 'details_received');
  const fixed = g.createGstInvoicer({ adminFirestore: db, env: ENV_READY, now: () => clock.t });
  assert.deepEqual(await fixed.issueNow({ orderId: 'o1' }), { issued: true, number: 'LT/26-27/000001' });
  const rec = db.read('payOrders/o1').gstInvoice;
  assert.deepEqual([rec.issuedLater, rec.igstPaise, rec.buyer.email], [true, 29242, 'b@example.com']);
});

test('BACKDATE routes: signed-out form GET/POST (expired 410, forged 404, bad input 400), admin list + send gated', async () => {
  const db = memoryFirestore({ 'payOrders/o1': pastOrder({ paymentId: 'p1', extra: { gstBackdate: { status: 'form_sent', formSentAtMs: 1, contact: { email: 'b@example.com' } } } }) });
  const clock = { t: AFTER_CUTOFF };
  const { svc, inv } = backdateFor(db, clock);
  const { sendJson, sendJsonWithHeaders } = createHttpUtils('*');
  const routes = createGstInvoiceRoutes({
    sendJson,
    sendJsonWithHeaders,
    adminFirestore: db,
    env: { ...ENV_READY, INVOICE_LINK_SECRET: LINK_SECRET },
    now: () => clock.t,
    requireAdmin: async (rq) => (rq.headers.authorization === 'Bearer admin' ? { ok: true } : { ok: false, status: 403, error: 'no' }),
    invoicer: inv,
    backdate: svc,
    readJson: async (rq) => rq.body,
  });
  const good = bd.detailsToken('o1', clock.t + 5000, LINK_SECRET);
  let res = fakeRes();
  await routes.handleInvoiceDetailsGet(req(`/api/gst/invoice-details?t=${good}`), res, `/api/gst/invoice-details?t=${good}`);
  assert.equal(res.r.status, 200);
  assert.equal(res.json().status, 'needs_details');
  assert.equal('stateCode' in res.json(), false);
  const old = bd.detailsToken('o1', clock.t - 1, LINK_SECRET);
  res = fakeRes();
  await routes.handleInvoiceDetailsGet(req(`/api/gst/invoice-details?t=${old}`), res, `/api/gst/invoice-details?t=${old}`);
  assert.equal(res.r.status, 410);
  res = fakeRes();
  await routes.handleInvoiceDetailsGet(req('/api/gst/invoice-details?t=abc.def'), res, '/api/gst/invoice-details?t=abc.def');
  assert.equal(res.r.status, 404);
  res = fakeRes();
  await routes.handleInvoiceDetailsPost({ ...req('/api/gst/invoice-details'), method: 'POST', body: { t: good, stateCode: '29' } }, res);
  assert.deepEqual([res.r.status, res.json().field], [400, 'pin']);
  res = fakeRes();
  await routes.handleInvoiceDetailsPost({ ...req('/api/gst/invoice-details'), method: 'POST', body: { t: good, stateCode: '29', pin: '560001' } }, res);
  assert.equal(res.r.status, 200);
  assert.equal(res.json().invoice.number, 'LT/26-27/000001');
  res = fakeRes();
  await routes.handleAdminPastSales(req('/api/admin/gst/past-sales', { authorization: 'Bearer nope' }), res);
  assert.equal(res.r.status, 403);
  res = fakeRes();
  await routes.handleAdminPastSales(req('/api/admin/gst/past-sales', { authorization: 'Bearer admin' }), res);
  assert.deepEqual(res.json().rows.map((x) => [x.orderId, x.status, x.invoiceNumber]), [['o1', 'invoiced', 'LT/26-27/000001']]);
  res = fakeRes();
  await routes.handleAdminSendForms({ ...req('/api/admin/gst/past-sales/send-forms', { authorization: 'Bearer nope' }), method: 'POST' }, res);
  assert.equal(res.r.status, 403);
  // Invoicing off: the form endpoints do not exist.
  const off = createGstInvoiceRoutes({ sendJson, sendJsonWithHeaders, adminFirestore: db, env: {}, backdate: svc, readJson: async (rq) => rq.body });
  res = fakeRes();
  await off.handleInvoiceDetailsGet(req(`/api/gst/invoice-details?t=${good}`), res, `/api/gst/invoice-details?t=${good}`);
  assert.equal(res.r.status, 404);
});

/* ══ review of #1625: B1 the supply date of a CLAIMED guest order is guestPaidAt; F3 no due reminder is starved ══ */

test('B1 a guest order: the supply date is when it was PAID (guestPaidAt), never when it was claimed (paidAt)', async () => {
  const guest = (paid, claimed, paymentId) => ({
    uid: 'claimer1',
    payer: 'guest',
    passType: 'till_boards',
    amountPaise: 191700,
    status: 'paid', // passGrant rewrites status + paidAt at the claim
    paymentId,
    createdAt: new Date(IST(paid) - 60000),
    guestPaidAt: new Date(IST(paid)),
    paidAt: new Date(IST(claimed)),
  });
  const before = guest('2026-09-10T10:00:00', '2026-09-20T10:00:00', 'pay_G1');
  const inside = guest('2026-10-01T10:00:00', '2026-10-03T18:00:00', 'pay_G2');
  assert.equal(g.supplyMsOf(before), IST('2026-09-10T10:00:00'));
  assert.equal(g.backdateExclusion(before), 'pre_registration', 'paid before registration, claimed after: NOT a past sale');
  assert.equal(g.backdateExclusion(inside), null);
  const db = memoryFirestore({ 'payOrders/order_G1': before, 'payOrders/order_G2': inside });
  const clock = { t: IST('2026-11-08T12:00:00') };
  const { svc } = backdateFor(db, clock);
  const list = await svc.listPastSales();
  assert.deepEqual(list.rows.map((r) => [r.orderId, r.paidIst]), [['order_G2', '1 October 2026']]);
  const tok = bd.detailsToken('order_G2', clock.t + 1000, LINK_SECRET);
  assert.equal((await svc.submitDetails(tok, { stateCode: '07', pin: '110001' })).status, 'invoiced');
  const rec = db.read('payOrders/order_G2').gstInvoice;
  assert.equal(rec.supplyDateIst, '01-10-2026', 'the paid date, not the claim date (03-10-2026)');
  assert.match(exp.invoicesCsv([rec]).trim().split('\r\n')[1], /,01-10-2026,Yes$/);
  assert.equal(await svc.getDetails(bd.detailsToken('order_G1', clock.t + 1000, LINK_SECRET)).then((r) => r.error), 'invalid', 'no form for the pre-registration sale');
});

test('F3 the drain reads EVERY waiting order in a fixed order: 250 forms not yet due never starve the one reminder that is', async () => {
  const seed = {};
  const now0 = IST('2026-11-20T10:00:00');
  for (let i = 0; i < 250; i += 1) {
    seed[`payOrders/recent_${String(i).padStart(3, '0')}`] = pastOrder({ uid: `r${i}`, paymentId: `pr_${i}`, extra: { gstBackdate: { status: 'form_sent', formSentAtMs: now0 - 2 * DAY_MS_T, contact: { email: `r${i}@example.com` } } } });
  }
  seed['payOrders/zzz_due'] = pastOrder({ uid: 'due1', paymentId: 'p_due', extra: { gstBackdate: { status: 'form_sent', formSentAtMs: now0 - 6 * DAY_MS_T, contact: { email: 'due@example.com' } } } });
  const db = memoryFirestore(seed);
  const { svc, sent } = backdateFor(db, { t: now0 });
  assert.deepEqual(await svc.drain(), { sent: 1, waiting: 0, failed: 0 });
  assert.deepEqual(sent.map((s) => [s.to, s.key]), [['due@example.com', 'gst-state-reminder-p_due']]);
  assert.equal(db.read('payOrders/zzz_due').gstBackdate.status, 'reminder_sent');
});
const DAY_MS_T = 24 * 60 * 60 * 1000;

/* ══ GST-FU-1: F4 a payment Razorpay can never give is not retried forever; F5 the Razorpay placeholder email ══ */

test('F4 the fetcher: .lookup classifies (permanent 400/404/no id, transient 5xx/429/network/no keys); fetchPayment itself is unchanged', async () => {
  const KEYS = { RAZORPAY_KEY_ID: 'rzp_test_K', RAZORPAY_KEY_SECRET: 'sec' };
  const withStatus = (status, body = { id: 'pay_X' }) =>
    g.createRazorpayPaymentFetcher({ env: KEYS, fetchImpl: async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }) });
  assert.deepEqual(await withStatus(404).lookup('pay_X'), { permanent: 'not_found', status: 404 });
  assert.deepEqual(await withStatus(400).lookup('pay_X'), { permanent: 'not_found', status: 400 });
  assert.deepEqual(await withStatus(500).lookup('pay_X'), { transient: 'http', status: 500 });
  assert.deepEqual(await withStatus(503).lookup('pay_X'), { transient: 'http', status: 503 });
  assert.deepEqual(await withStatus(429).lookup('pay_X'), { transient: 'http', status: 429 });
  assert.deepEqual(await withStatus(401).lookup('pay_X'), { transient: 'http', status: 401 }, 'a key problem is ours, not the order\'s');
  assert.deepEqual(await withStatus(200).lookup('pay_X'), { payment: { id: 'pay_X' } });
  assert.deepEqual(await withStatus(200).lookup(''), { permanent: 'no_payment_id' });
  assert.deepEqual(await withStatus(200).lookup(undefined), { permanent: 'no_payment_id' });
  assert.deepEqual(await withStatus(200).lookup('pay/../x'), { permanent: 'no_payment_id' });
  const throwing = g.createRazorpayPaymentFetcher({ env: KEYS, fetchImpl: async () => { throw new Error('ETIMEDOUT'); } });
  assert.deepEqual(await throwing.lookup('pay_X'), { transient: 'network' });
  assert.deepEqual(await g.createRazorpayPaymentFetcher({ env: {}, fetchImpl: async () => { throw new Error('must not call'); } }).lookup('pay_X'), { transient: 'no_keys' });
  // What existing callers ("Issue now", the receipt path) receive is unchanged: the record, or null.
  assert.equal(await withStatus(404)('pay_X'), null);
  assert.equal(await withStatus(500)('pay_X'), null);
  assert.equal(await withStatus(200)(''), null);
  assert.deepEqual(await withStatus(200)('pay_X'), { id: 'pay_X' });
  await assert.rejects(() => throwing('pay_X'), /ETIMEDOUT/, 'fetchPayment still throws on a network error, as before');
});

test('F4 past sales: no payment id / Razorpay 404 / another order\'s payment are NOT retried: lookup recorded, form to the account email', async () => {
  const db = memoryFirestore({
    'payOrders/order_404': pastOrder({ uid: 'u404', paymentId: 'pay_404', paid: '2026-10-14T10:00:00' }),
    'payOrders/order_NOID': pastOrder({ uid: 'uNOID', paymentId: '', paid: '2026-10-14T10:05:00' }),
    'payOrders/order_MIS': pastOrder({ uid: 'uMIS', paymentId: 'pay_MIS', paid: '2026-10-14T10:10:00' }),
    'payOrders/order_NOACCT': pastOrder({ uid: null, paymentId: 'pay_404b', paid: '2026-10-14T10:15:00' }),
    'payOrders/order_5XX': pastOrder({ uid: 'u5', paymentId: 'pay_5XX', paid: '2026-10-14T10:20:00' }),
    'payOrders/order_REF': pastOrder({ uid: 'uRF', paymentId: 'pay_RF', paid: '2026-10-14T10:25:00' }),
  });
  const answers = {
    pay_404: { permanent: 'not_found', status: 404 },
    pay_404b: { permanent: 'not_found', status: 404 },
    pay_MIS: { payment: { id: 'pay_MIS', order_id: 'order_OTHER', email: 'someone.else@example.com' } },
    pay_5XX: { transient: 'http', status: 503 },
    pay_RF: { payment: { id: 'pay_RF', order_id: 'order_REF', status: 'refunded', amount_refunded: 191700, email: 'rf@example.com' } },
  };
  const fetchPayment = async () => {
    throw new Error('the classified lookup is used, not the bare fetch');
  };
  fetchPayment.lookup = async (id) => answers[id] || { permanent: 'not_found', status: 404 };
  const clock = { t: IST('2026-11-08T12:00:00') };
  const { svc, sent } = backdateFor(db, clock, { fetchPayment, accountEmails: { u404: 'acct404@example.com', uNOID: 'acctnoid@example.com', uMIS: 'acctmis@example.com', u5: 'acct5@example.com' } });
  const r = await svc.sendForms();
  assert.deepEqual([r.queued, r.noAddress, r.refunded, r.retryLater], [3, 1, 1, 1]);
  assert.deepEqual(sent.map((x) => x.to).sort(), ['acct404@example.com', 'acctmis@example.com', 'acctnoid@example.com']);
  assert.ok(!sent.some((x) => x.to === 'someone.else@example.com'), 'never another order\'s payer');
  const b = (id) => db.read(`payOrders/${id}`).gstBackdate;
  assert.deepEqual([b('order_404').lookup, b('order_404').emailSource], ['not_found', 'account']);
  assert.deepEqual([b('order_NOID').lookup, b('order_MIS').lookup], ['no_payment_id', 'order_mismatch']);
  assert.deepEqual([b('order_NOACCT').status, b('order_NOACCT').lookup], ['no_address', 'not_found']);
  assert.equal(b('order_5XX'), undefined, 'a 5xx is retried as before');
  assert.equal(b('order_REF').status, 'refunded', 'a payment that CAN be fetched keeps the refund check');
  const rows = Object.fromEntries((await svc.listPastSales()).rows.map((x) => [x.orderId, x]));
  assert.deepEqual([rows.order_404.status, rows.order_404.lookup, rows.order_404.emailMasked], ['form_sent', 'not_found', 'ac••••@example.com']);
  assert.deepEqual([rows.order_NOACCT.status, rows.order_NOACCT.lookup], ['no_address', 'not_found']);
  assert.deepEqual([rows.order_5XX.status, rows.order_5XX.lookup], ['needs_details', '']);
  // A second click: only the transient one is tried again.
  let calls = 0;
  fetchPayment.lookup = async (id) => {
    calls += 1;
    return answers[id];
  };
  assert.equal((await svc.sendForms()).retryLater, 1);
  assert.equal(calls, 1);
});

test('F5 the Razorpay placeholder (void@razorpay.com) is never an address: form falls to the account email; receipts/invoices skip it', async () => {
  const { isPlaceholderAddress } = require('./paymentReceiptEmail.cjs');
  assert.equal(isPlaceholderAddress('void@razorpay.com'), true);
  assert.equal(isPlaceholderAddress(' VOID@RazorPay.com '), true);
  assert.equal(isPlaceholderAddress('x@mail.razorpay.com'), true);
  assert.equal(isPlaceholderAddress('buyer@notrazorpay.com'), false);
  assert.equal(isPlaceholderAddress('razorpay.com@gmail.com'), false);
  assert.equal(isPlaceholderAddress(''), false);
  const db = memoryFirestore({
    'payOrders/order_V': pastOrder({ uid: 'uV', paymentId: 'pay_V' }),
    'payOrders/order_V2': pastOrder({ uid: null, paymentId: 'pay_V2', paid: '2026-10-02T10:00:00' }),
  });
  const { svc, sent, mailer } = backdateFor(db, { t: IST('2026-11-08T12:00:00') }, {
    payments: {
      pay_V: { id: 'pay_V', order_id: 'order_V', email: 'void@razorpay.com', contact: '+919800000009' },
      pay_V2: { id: 'pay_V2', order_id: 'order_V2', email: 'void@razorpay.com' },
    },
    accountEmails: { uV: 'real.buyer@example.com' },
  });
  assert.equal(mailer.rails.isAddress('void@razorpay.com'), false);
  assert.equal(mailer.rails.isAddress('real.buyer@example.com'), true);
  const r = await svc.sendForms();
  assert.deepEqual([r.queued, r.noAddress], [1, 1]);
  assert.deepEqual(sent.map((x) => x.to), ['real.buyer@example.com']);
  assert.deepEqual([db.read('payOrders/order_V').gstBackdate.emailSource, db.read('payOrders/order_V2').gstBackdate.status], ['account', 'no_address']);
  // The payer receipt (guest pay passes payment.email) skips the placeholder.
  assert.deepEqual(await mailer.sendForPayment({ orderId: 'order_V', paymentId: 'pay_V', email: 'void@razorpay.com' }), { skipped: 'no_address' });
});

test('F5 re-queue: an order already queued / sent to void@razorpay.com is re-resolved by the drain and the click; void@ is never emailed again', async () => {
  const placeholder = (status, extra = {}) => ({ gstBackdate: { status, contact: { email: 'void@razorpay.com', phone: '' }, emailSource: 'payment', queuedAtMs: 1, attempts: 0, ...extra } });
  const now0 = IST('2026-11-14T12:00:00');
  const db = memoryFirestore({
    'payOrders/order_SENT': pastOrder({ uid: 'uS', paymentId: 'pay_S', extra: placeholder('form_sent', { formSentAtMs: now0 - 1 * DAY_MS_T }) }),
    'payOrders/order_Q': pastOrder({ uid: 'uQ', paymentId: 'pay_Q', paid: '2026-10-03T10:00:00', extra: placeholder('form_queued') }),
    'payOrders/order_OLD': pastOrder({ uid: 'uO', paymentId: 'pay_O', paid: '2026-10-04T10:00:00', extra: placeholder('form_sent', { formSentAtMs: now0 - 6 * DAY_MS_T }) }),
  });
  const payments = {
    pay_S: { id: 'pay_S', order_id: 'order_SENT', email: 'void@razorpay.com' },
    pay_Q: { id: 'pay_Q', order_id: 'order_Q', email: 'void@razorpay.com' },
    pay_O: { id: 'pay_O', order_id: 'order_OLD', email: 'void@razorpay.com' },
  };
  const clock = { t: now0 };
  const { svc, sent } = backdateFor(db, clock, { payments, accountEmails: { uS: 's@example.com', uQ: 'q@example.com' } });
  // The list shows them as needing details again, never the placeholder.
  const rows = (await svc.listPastSales()).rows;
  assert.deepEqual(rows.map((x) => [x.orderId, x.status, x.emailMasked]), [['order_SENT', 'needs_details', ''], ['order_Q', 'needs_details', ''], ['order_OLD', 'needs_details', '']]);
  const d = await svc.drain();
  assert.equal(d.sent, 2);
  assert.ok(!sent.some((x) => /razorpay\.com/.test(x.to)), 'void@ is never emailed');
  assert.deepEqual(sent.map((x) => [x.to, x.key]).sort(), [['q@example.com', 'gst-state-form-pay_Q-r1'], ['s@example.com', 'gst-state-form-pay_S-r1']]);
  const s = db.read('payOrders/order_SENT').gstBackdate;
  assert.deepEqual([s.status, s.emailSource, s.reresolved, s.reminderSentAtMs], ['form_sent', 'account', 1, null]);
  assert.equal(s.formSentAtMs, now0, 'a fresh form time: the reminder clock restarts');
  assert.deepEqual([db.read('payOrders/order_OLD').gstBackdate.status, db.read('payOrders/order_OLD').gstBackdate.contact], ['no_address', null], 'no account email: no_address, never a reminder to void@');
  // The click finds nothing left to re-resolve, and the 1-a-day rule still holds for the new address.
  const r = await svc.sendForms();
  assert.deepEqual([r.queued, r.noAddress, r.retryLater], [0, 0, 0]);
  assert.equal(sent.length, 2);
});

test('F5 re-queue via the click: "Send state forms" re-resolves a form_sent placeholder order too', async () => {
  const db = memoryFirestore({
    'payOrders/order_C': pastOrder({ uid: 'uC', paymentId: 'pay_C', extra: { gstBackdate: { status: 'form_sent', formSentAtMs: 5, contact: { email: 'void@razorpay.com' }, emailSource: 'payment' } } }),
  });
  const { svc, sent } = backdateFor(db, { t: IST('2026-11-08T12:00:00') }, { payments: { pay_C: { id: 'pay_C', order_id: 'order_C', email: 'void@razorpay.com' } }, accountEmails: { uC: 'c@example.com' } });
  const r = await svc.sendForms();
  assert.deepEqual([r.queued, r.sent], [1, 1]);
  assert.deepEqual(sent.map((x) => [x.to, x.key]), [['c@example.com', 'gst-state-form-pay_C-r1']]);
});

test('GST-FU-1 review F2: the invoice email to a Razorpay placeholder (buyer.email void@razorpay.com) is never sent: no_address', async () => {
  const db = memoryFirestore({ 'payOrders/order_M': storedOrder({ paymentId: 'pay_M', extra: { paidAt: new Date(AFTER_CUTOFF - 48 * HOUR) } }) });
  const inv = g.createGstInvoicer({ adminFirestore: db, env: ENV_READY, now: () => AFTER_CUTOFF, fetchPayment: async (id) => ({ id, order_id: 'order_M', email: 'void@razorpay.com' }) });
  await inv.issueNow({ orderId: 'order_M' });
  assert.equal(db.read('payOrders/order_M').gstInvoice.buyer.email, 'void@razorpay.com', 'the invoice prints what Razorpay gave');
  const clock = { t: AFTER_CUTOFF };
  const { mailer, sent } = mailerFor(db, clock);
  assert.deepEqual(await mailer.queueInvoiceEmail({ orderId: 'order_M' }), { skipped: 'no_address' });
  assert.equal(sent.length, 0);
  assert.equal(db.read('payOrders/order_M').gstInvoiceEmail.status, 'no_address');
  // The hourly drain never picks it up either.
  assert.deepEqual(await mailer.drainInvoiceEmails(), { sent: 0, queued: 0, skipped: 0, failed: 0 });
  assert.equal(sent.length, 0);
});

/* ── GST-EMAIL-LINK-1: a sale made AFTER the cut-off, held for its state / PIN, takes the details page and gets a NORMAL invoice ── */
const heldNew = (extra = {}) => storedOrder({ stateCode: null, paymentId: 'pay_H', extra: { paidAt: new Date(AFTER_CUTOFF), ...extra } });
const tokenFor = (orderId, clock, exp) => bd.detailsToken(orderId, exp === undefined ? clock.t + bd.DETAILS_TOKEN_TTL_MS : exp, LINK_SECRET);

test('EMAIL-LINK post-cutoff held order: the page asks for details; a valid answer issues ONE normal capture-time invoice (not worked back), emailed once; a second submit changes nothing', async () => {
  const db = memoryFirestore({ 'payOrders/order_H': heldNew() });
  const clock = { t: AFTER_CUTOFF + 60 * 60 * 1000 };
  const { svc, sent } = backdateFor(db, clock, { payments: { pay_H: { id: 'pay_H', order_id: 'order_H', email: 'h.buyer@example.com', contact: '+919800000002', status: 'captured' } } });
  const tok = tokenFor('order_H', clock);
  assert.deepEqual(await svc.getDetails(tok), { item: 'Board Pass (Premium till your boards)', amountPaise: db.read('payOrders/order_H').amountPaise, paidOn: '8 November 2026', status: 'needs_details' });
  assert.deepEqual(await svc.submitDetails(tok, { stateCode: '29' }), { error: 'bad_input', field: 'pin' });
  assert.deepEqual(await svc.submitDetails(tok, { pin: '560001' }), { error: 'bad_input', field: 'state' });
  assert.equal(db.read('payOrders/order_H').gstBuyer, undefined, 'a refused answer stores nothing');
  const r = await svc.submitDetails(tok, { stateCode: '29', pin: '560001' });
  assert.equal(r.ok, true);
  assert.equal(r.status, 'invoiced');
  const rec = db.read('payOrders/order_H').gstInvoice;
  assert.ok(rec && rec.number, 'an invoice was issued');
  assert.equal(rec.issuedLater, undefined, 'a NORMAL invoice: not the back-dated one');
  assert.equal(rec.taxWorkedBack, undefined);
  assert.equal(db.read('payOrders/order_H').gstBackdate, undefined, 'no back-date marker is written');
  assert.deepEqual(db.read('payOrders/order_H').gstBuyer, { stateCode: '29', pin: '560001' });
  assert.equal(db.read('payOrders/order_H').gstInvoiceEmail.status, 'sent');
  assert.equal(sent.length, 1, 'the invoice email went out once');
  const number = rec.number;
  const again = await svc.submitDetails(tok, { stateCode: '27', pin: '411001' });
  assert.equal(again.status, 'invoiced');
  assert.equal(db.read('payOrders/order_H').gstInvoice.number, number);
  assert.equal(db.read('payOrders/order_H').gstBuyer.stateCode, '29', 'an invoiced order is never changed');
  assert.equal(db.read('gstInvoiceCounters/26-27').last, 1, 'one number used');
  assert.equal(sent.length, 1, 'a second submit sends no second email');
  const view = await svc.getDetails(tok);
  assert.equal(view.status, 'invoiced');
  assert.ok(view.invoice && view.invoice.number === number);
});

test('EMAIL-LINK post-cutoff: an order that already holds an invoice (saved in the paid-screen box first) is shown as invoiced and never changed', async () => {
  const db = memoryFirestore({ 'payOrders/order_I': storedOrder({ paymentId: 'pay_I', extra: { paidAt: new Date(AFTER_CUTOFF), gstInvoice: { number: 'LT/26-27/000009', paymentId: 'pay_I' } } }) });
  const clock = { t: AFTER_CUTOFF + 1000 };
  const { svc } = backdateFor(db, clock);
  const tok = tokenFor('order_I', clock);
  assert.equal((await svc.getDetails(tok)).status, 'invoiced');
  const r = await svc.submitDetails(tok, { stateCode: '27', pin: '411001' });
  assert.equal(r.status, 'invoiced');
  assert.equal(db.read('payOrders/order_I').gstBuyer.stateCode, '29', 'unchanged');
  assert.equal(db.read('payOrders/order_I').gstInvoice.number, 'LT/26-27/000009');
  assert.equal(db.docs.has('gstInvoiceCounters/26-27'), false, 'no number used');
});

test('EMAIL-LINK refused: a bad token, an expired token, another order id, a top-up, an unpaid order, a post-cutoff order with no payment id', async () => {
  const db = memoryFirestore({
    'payOrders/order_H': heldNew(),
    'payOrders/order_TU': heldNew({ passType: 'topup_tutor' }),
    'payOrders/order_UP': heldNew({ status: 'created' }),
    'payOrders/order_NP': heldNew({ paymentId: undefined }),
  });
  const clock = { t: AFTER_CUTOFF + 1000 };
  const { svc } = backdateFor(db, clock, { payments: { pay_H: { id: 'pay_H', order_id: 'order_H', email: 'h.buyer@example.com', contact: '+919800000002', status: 'captured' } } });
  const good = tokenFor('order_H', clock);
  const forged = good.slice(0, -2) + (good.endsWith('aa') ? 'bb' : 'aa');
  assert.deepEqual(await svc.getDetails(forged), { error: 'invalid' });
  assert.deepEqual(await svc.submitDetails(forged, { stateCode: '29', pin: '560001' }), { error: 'invalid' });
  assert.deepEqual(await svc.submitDetails(tokenFor('order_H', clock, clock.t - 1), { stateCode: '29', pin: '560001' }), { error: 'expired' });
  for (const id of ['order_TU', 'order_UP', 'order_NP', 'order_missing']) {
    assert.deepEqual(await svc.submitDetails(tokenFor(id, clock), { stateCode: '29', pin: '560001' }), { error: 'invalid' }, id);
    assert.equal(db.read(`payOrders/${id}`) && db.read(`payOrders/${id}`).gstBuyer, undefined, id);
  }
  // the token binds the order id: order_H's token never writes another order
  assert.equal((await svc.submitDetails(good, { stateCode: '29', pin: '560001' })).status, 'invoiced');
  assert.equal(db.read('payOrders/order_TU').gstInvoice, undefined);
});

test('EMAIL-LINK a post-cutoff order held for ANOTHER reason (state already given): shown as received, never overwritten', async () => {
  const db = memoryFirestore({ 'payOrders/order_C': storedOrder({ paymentId: 'pay_C', extra: { paidAt: new Date(AFTER_CUTOFF) } }) });
  const clock = { t: AFTER_CUTOFF + 1000 };
  const { svc, inv } = backdateFor(db, clock, { env: { GST_SELLER_GSTIN: '' } });
  // make the invoicer refuse (seller config) so the order stays un-invoiced with a complete state
  void inv;
  const tok = tokenFor('order_C', clock);
  const before = db.read('payOrders/order_C');
  if (!before.gstInvoice) {
    const r = await svc.submitDetails(tok, { stateCode: '27', pin: '411001' });
    assert.equal(r.status, 'details_received');
    assert.equal(db.read('payOrders/order_C').gstBuyer.stateCode, '29', 'the given state is not overwritten');
  }
});

test('EMAIL-LINK past-sale path unchanged: a past sale still gets the back-dated invoice and a post-cutoff-only rule never touches it', async () => {
  const db = memoryFirestore({ 'payOrders/order_PS': pastOrder({ paymentId: 'pay_PS' }) });
  const clock = { t: IST('2026-11-08T12:00:00') };
  const { svc } = backdateFor(db, clock);
  const tok = tokenFor('order_PS', clock);
  assert.equal((await svc.getDetails(tok)).status, 'needs_details');
  const r = await svc.submitDetails(tok, { stateCode: '29', pin: '560001' });
  assert.equal(r.status, 'invoiced');
  const rec = db.read('payOrders/order_PS').gstInvoice;
  assert.equal(rec.issuedLater, true);
  assert.equal(rec.taxWorkedBack, true);
});

test('EMAIL-LINK post-cutoff unpaid order (has a payment id, status not paid): submit maps to invalid, stores nothing, issues nothing, uses no number', async () => {
  for (const status of ['created', 'failed']) {
    const db = memoryFirestore({ 'payOrders/order_U': heldNew({ status }) });
    const clock = { t: AFTER_CUTOFF + 1000 };
    const { svc, sent } = backdateFor(db, clock, { payments: { pay_H: { id: 'pay_H', order_id: 'order_U', email: 'h.buyer@example.com', contact: '+919800000002', status: 'captured' } } });
    const tok = tokenFor('order_U', clock);
    assert.deepEqual(await svc.submitDetails(tok, { stateCode: '29', pin: '560001' }), { error: 'invalid' }, status);
    assert.equal(db.read('payOrders/order_U').gstBuyer, undefined, status);
    assert.equal(db.read('payOrders/order_U').gstInvoice, undefined, status);
    assert.equal(db.docs.has('gstInvoiceCounters/26-27'), false, status);
    assert.equal(sent.length, 0, status);
  }
});

test('EMAIL-LINK post-cutoff: when the write path itself answers unpaid / forbidden / unknown_order (a race after the page check), submit maps each to invalid', async () => {
  for (const code of ['unpaid', 'forbidden', 'unknown_order', 'unavailable']) {
    const db = memoryFirestore({ 'payOrders/order_H': heldNew() });
    const clock = { t: AFTER_CUTOFF + 1000 };
    const E = { ...ENV_READY, INVOICE_LINK_SECRET: LINK_SECRET };
    const svc = bd.createGstBackdate({ adminFirestore: db, invoicer: g.createGstInvoicer({ adminFirestore: db, env: E, now: () => clock.t }), mailer: null, fetchPayment: async () => null, getAccountEmail: async () => '', env: E, now: () => clock.t, orderDetails: { submit: async () => ({ error: code }) } });
    assert.deepEqual(await svc.submitDetails(tokenFor('order_H', clock), { stateCode: '29', pin: '560001' }), { error: 'invalid' }, code);
  }
});
