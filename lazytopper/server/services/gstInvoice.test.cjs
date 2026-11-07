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
const { buildReceiptEmail } = require('./paymentReceiptEmail.cjs');

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
    ...(stateCode ? { gstBuyer: { stateCode } } : {}),
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
  const mismatch = g.gstBuyerFromBody({ stateCode: '29', business });
  assert.deepEqual(mismatch.fields, { gstBuyer: { stateCode: '29' } });
  assert.deepEqual(mismatch.dropped, ['business']);
  const badSum = g.gstBuyerFromBody({ stateCode: '27', business: { ...business, gstin: `${TEST_B2B_GSTIN_MH.slice(0, 14)}${TEST_B2B_GSTIN_MH[14] === 'A' ? 'B' : 'A'}` } });
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
    'payOrders/mh': storedOrder({ passType: 'pack_bundle', baseInr: 299, paymentId: 'pay_mh', extra: { gstBuyer: { stateCode: '27', business } } }),
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
  assert.match(invoices[1], /,1917\.00,18,0\.00,172\.50,172\.50,2262\.00$/);
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
function routesFor(db, { env = { ...ENV_READY, PAYMENTS_ENABLED: '1', INVOICE_LINK_SECRET: LINK_SECRET }, admin = true, inv = null } = {}) {
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
    'payOrders/par': storedOrder({ uid: 'child1', paymentId: 'pay_par', extra: { payer: 'parent', parentLinkId: 'L1', gstBuyer: { stateCode: '27', business: BIZ_MH() } } }),
    // A signed-in payer bought for someone else; it was then claimed by the recipient (uid = recipient).
    'payOrders/who': storedOrder({ uid: 'recip1', paymentId: 'pay_who', extra: { payer: 'guest', checkoutWho: true, payerUid: 'payer1', gstBuyer: { stateCode: '33', pin: '600001' } } }),
    // A signed-out phone purchase claimed by the same person.
    'payOrders/self': storedOrder({ uid: 'phone1', paymentId: 'pay_self', extra: { payer: 'guest', gstBuyer: { stateCode: '07' } } }),
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
  const { inv } = invoicer(db);
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
