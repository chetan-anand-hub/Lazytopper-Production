'use strict';
/**
 * gstInvoice.cjs — GST-INVOICE-1 (owner rulings 6 Nov 2026). A GST TAX INVOICE for every new purchase.
 *
 * ★★ DARK BY DEFAULT. Nothing here writes anything unless GST_INVOICE_ENABLED is on. With it off, `issueForPayment`
 *   resolves `{ skipped: 'off' }` at once and no Firestore call is made.
 * ★★ PAYMENT NEVER WAITS FOR, OR FAILS BECAUSE OF, AN INVOICE. Callers fire `issueForPayment` AFTER the grant has answered
 *   (it is never awaited on a payment response) and it never throws.
 * ★★ FAILS CLOSED ON SELLER DATA. The seller's GSTIN, registered address and the SAC codes come ONLY from env
 *   (SELLER_GSTIN, SELLER_ADDRESS, SAC_BOARD_PASS, SAC_PACKS). They are NOT in the repo and are never guessed. If any is
 *   missing or malformed, NO invoice is issued (the payment is already done), the order is put on the HELD list with
 *   reason `seller_config_missing`, and the admin page shows which value is missing.
 * ★★ ONE GAPLESS SERIES PER FINANCIAL YEAR. `LT/26-27/000001`, consecutive, reset at 00:00 IST on 1 April. The number is
 *   allocated in the SAME Firestore transaction that writes the invoice onto the order, from `gstInvoiceCounters/{fy}`:
 *   either both commit or neither does, so a contended / retried / crashed issue can never leave a gap or a duplicate.
 *   An order that is not paid (abandoned) never reaches the transaction's write, so it never consumes a number.
 * ★★ IDEMPOTENT PER RAZORPAY PAYMENT. The invoice lives ON the order (`payOrders/{orderId}.gstInvoice`) and carries the
 *   payment id; verify + webhook + status + retries all read it first and return the existing invoice.
 * ★ AMOUNTS IN PAISE, FROM THE STORED ORDER (never recomputed from a price table): taxable = baseInr, GST = amount paid -
 *   taxable (reproduces the displayed "₹1,917 + ₹345 GST (18%) = ₹2,262" exactly). Intra-state (buyer in Karnataka, the
 *   seller's state): CGST = floor(GST / 2), SGST = GST - CGST. Every invoice's lines sum EXACTLY to the amount paid.
 * ★ NO DEFAULT STATE (CBIC Circular 242/36/2024-GST): the buyer's state is what the buyer confirmed at checkout, stored on
 *   the order at creation. An order with no state gets NO invoice and is HELD (`no_state`) for the CA.
 * ★ HELD, NOT GUESSED: an order created before the 7 Nov cut-off (no GST breakup), a Board Pass credited with a pack
 *   (the credit's GST treatment is the CA's call), a top-up (no SAC code is configured for it), or anything that does not
 *   add up is recorded on the held list with its reason and gets no invoice.
 */

const crypto = require('node:crypto');
const { GST_EXCLUSIVE_FROM_MS, GST_RATE_PERCENT, IST_OFFSET_MS } = require('./passPricing.cjs');
const { isPackProduct } = require('./packProducts.cjs');

const PAY_ORDERS_COLLECTION = 'payOrders';
/** One doc per financial year ("26-27"): `{ last }`. Not student data (a counter). */
const GST_INVOICE_COUNTERS_COLLECTION = 'gstInvoiceCounters';

/** Owner ruling 6 Nov 2026 (the legal name and brand were given by the owner; the GSTIN / address are env-only). */
const SELLER_LEGAL_NAME = 'P&CGOLDDUST_TECH PRIVATE LIMITED';
const SELLER_BRAND = 'Lazytopper';
const SELLER_STATE_CODE = '29';

const PAID_STATES = Object.freeze(['paid', 'paid_unclaimed', 'claimed']);

/**
 * The 36 States / UTs with their GST state codes (GST state-code list; 25 and 28 are retired codes). `ip` lists the
 * ISO 3166-2:IN subdivision codes (current and pre-2023) an IP geolocation header may carry for that state.
 */
const GST_STATES = Object.freeze([
  { code: '01', name: 'Jammu and Kashmir', ip: ['JK'] },
  { code: '02', name: 'Himachal Pradesh', ip: ['HP'] },
  { code: '03', name: 'Punjab', ip: ['PB'] },
  { code: '04', name: 'Chandigarh', ip: ['CH'] },
  { code: '05', name: 'Uttarakhand', ip: ['UK', 'UT'] },
  { code: '06', name: 'Haryana', ip: ['HR'] },
  { code: '07', name: 'Delhi', ip: ['DL'] },
  { code: '08', name: 'Rajasthan', ip: ['RJ'] },
  { code: '09', name: 'Uttar Pradesh', ip: ['UP'] },
  { code: '10', name: 'Bihar', ip: ['BR'] },
  { code: '11', name: 'Sikkim', ip: ['SK'] },
  { code: '12', name: 'Arunachal Pradesh', ip: ['AR'] },
  { code: '13', name: 'Nagaland', ip: ['NL'] },
  { code: '14', name: 'Manipur', ip: ['MN'] },
  { code: '15', name: 'Mizoram', ip: ['MZ'] },
  { code: '16', name: 'Tripura', ip: ['TR'] },
  { code: '17', name: 'Meghalaya', ip: ['ML'] },
  { code: '18', name: 'Assam', ip: ['AS'] },
  { code: '19', name: 'West Bengal', ip: ['WB'] },
  { code: '20', name: 'Jharkhand', ip: ['JH'] },
  { code: '21', name: 'Odisha', ip: ['OD', 'OR'] },
  { code: '22', name: 'Chhattisgarh', ip: ['CG', 'CT'] },
  { code: '23', name: 'Madhya Pradesh', ip: ['MP'] },
  { code: '24', name: 'Gujarat', ip: ['GJ'] },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu', ip: ['DH', 'DN', 'DD'] },
  { code: '27', name: 'Maharashtra', ip: ['MH'] },
  { code: '29', name: 'Karnataka', ip: ['KA'] },
  { code: '30', name: 'Goa', ip: ['GA'] },
  { code: '31', name: 'Lakshadweep', ip: ['LD'] },
  { code: '32', name: 'Kerala', ip: ['KL'] },
  { code: '33', name: 'Tamil Nadu', ip: ['TN'] },
  { code: '34', name: 'Puducherry', ip: ['PY'] },
  { code: '35', name: 'Andaman and Nicobar Islands', ip: ['AN'] },
  { code: '36', name: 'Telangana', ip: ['TG', 'TS'] },
  { code: '37', name: 'Andhra Pradesh', ip: ['AP'] },
  { code: '38', name: 'Ladakh', ip: ['LA'] },
]);
const STATE_BY_CODE = new Map(GST_STATES.map((s) => [s.code, s]));
const STATE_BY_IP = new Map(GST_STATES.flatMap((s) => s.ip.map((ip) => [ip, s])));

function stateByCode(code) {
  return typeof code === 'string' ? STATE_BY_CODE.get(code) || null : null;
}
function isGstStateCode(code) {
  return stateByCode(code) !== null;
}
/** An IP region header value ("KA", "IN-KA") -> GST state code, or null. Only for country IN. */
function stateCodeFromIpRegion(country, region) {
  if (String(country || '').trim().toUpperCase() !== 'IN') return null;
  const r = String(region || '').trim().toUpperCase().replace(/^IN-/, '');
  if (!/^[A-Z]{2}$/.test(r)) return null;
  const s = STATE_BY_IP.get(r);
  return s ? s.code : null;
}

/* ── GSTIN ─────────────────────────────────────────────────────────────────── */

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GSTIN_PATTERN = /^[0-9]{2}[A-Z0-9]{12}[A-Z0-9]$/;

/** The GSTIN check character for the first 14 characters (the published mod-36 scheme). */
function gstinCheckChar(first14) {
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const v = GSTIN_CHARS.indexOf(first14[i]);
    if (v < 0) return null;
    const p = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36];
}
/** 15 characters, a valid state code first, the checksum right. Uppercased; spaces dropped. */
function isValidGstin(raw) {
  const g = String(raw || '').replace(/\s+/g, '').toUpperCase();
  if (!GSTIN_PATTERN.test(g)) return false;
  if (!isGstStateCode(g.slice(0, 2))) return false;
  return gstinCheckChar(g.slice(0, 14)) === g[14];
}
function normaliseGstin(raw) {
  return String(raw || '').replace(/\s+/g, '').toUpperCase();
}

/* ── The buyer's details on an order (collected at checkout) ─────────────────── */

const PIN_PATTERN = /^[1-9][0-9]{5}$/;
const cleanText = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

/**
 * PURE. The `gstBuyer` an order stores, from the request body's `gstBuyer` — or {} when there is no usable state.
 * ★ NEVER REJECTS AN ORDER: a bad PIN is dropped, a bad business block (GSTIN checksum, or its state code not the chosen
 *   state, or no legal name / address) is dropped (the order is then a B2C sale in the chosen state) and reported in
 *   `dropped` for a counter. The client validates the same rules before Pay, so this only catches a forged / stale body.
 */
function gstBuyerFromBody(raw) {
  const out = { fields: {}, dropped: [] };
  if (!raw || typeof raw !== 'object') return out;
  const stateCode = typeof raw.stateCode === 'string' ? raw.stateCode.trim() : '';
  if (!isGstStateCode(stateCode)) {
    if (stateCode) out.dropped.push('state');
    return out;
  }
  const buyer = { stateCode };
  const pin = typeof raw.pin === 'string' ? raw.pin.trim() : '';
  if (pin) {
    if (PIN_PATTERN.test(pin)) buyer.pin = pin;
    else out.dropped.push('pin');
  }
  const b = raw.business;
  if (b && typeof b === 'object') {
    const gstin = normaliseGstin(b.gstin);
    const legalName = cleanText(b.legalName, 120);
    const address = cleanText(b.address, 300);
    if (isValidGstin(gstin) && gstin.slice(0, 2) === stateCode && legalName.length >= 2 && address.length >= 5) {
      buyer.business = { gstin, legalName, address };
    } else {
      out.dropped.push('business');
    }
  }
  out.fields = { gstBuyer: buyer };
  return out;
}

/* ── Config ──────────────────────────────────────────────────────────────────── */

const SAC_PATTERN = /^99[0-9]{4}$/;

function isOnFlag(v) {
  return /^(1|true|on|yes)$/i.test(String(v || '').trim());
}

/**
 * The invoicing switch and the seller values. `missing` names every env var that is unset or malformed; `ready` is true
 * only when invoicing is on AND nothing is missing. Values are never logged.
 */
function resolveInvoiceConfig(env = process.env) {
  const e = env || {};
  const str = (k) => (typeof e[k] === 'string' ? e[k].trim() : '');
  const enabled = isOnFlag(e.GST_INVOICE_ENABLED);
  const sellerGstin = normaliseGstin(str('SELLER_GSTIN'));
  const sellerAddress = cleanText(str('SELLER_ADDRESS'), 300);
  const sacBoardPass = str('SAC_BOARD_PASS');
  const sacPacks = str('SAC_PACKS');
  const missing = [];
  if (!isValidGstin(sellerGstin) || sellerGstin.slice(0, 2) !== SELLER_STATE_CODE) missing.push('SELLER_GSTIN');
  if (sellerAddress.length < 10) missing.push('SELLER_ADDRESS');
  if (!SAC_PATTERN.test(sacBoardPass)) missing.push('SAC_BOARD_PASS');
  if (!SAC_PATTERN.test(sacPacks)) missing.push('SAC_PACKS');
  return {
    enabled,
    ready: enabled && missing.length === 0,
    missing,
    seller: { legalName: SELLER_LEGAL_NAME, brand: SELLER_BRAND, gstin: sellerGstin, address: sellerAddress, stateCode: SELLER_STATE_CODE },
    sac: { boardPass: sacBoardPass, packs: sacPacks },
  };
}

/* ── Dates and numbers ───────────────────────────────────────────────────────── */

/** The Indian financial year (1 April – 31 March, IST) an instant falls in: "26-27". */
function financialYearFor(ms) {
  const d = new Date(ms + IST_OFFSET_MS);
  const y = d.getUTCFullYear();
  const start = d.getUTCMonth() >= 3 ? y : y - 1;
  const two = (n) => String(((n % 100) + 100) % 100).padStart(2, '0');
  return `${two(start)}-${two(start + 1)}`;
}
function invoiceNumberFor(fy, seq) {
  return `LT/${fy}/${String(seq).padStart(6, '0')}`;
}
/** "07-11-2026" (IST), the invoice date. */
function istDateLabel(ms) {
  const d = new Date(ms + IST_OFFSET_MS);
  return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
}
function toMs(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  return NaN;
}

/* ── The product line ────────────────────────────────────────────────────────── */

const SMALL_WORDS = new Set(['and', 'of', 'its', 'to', 'do']);
function chapterTitle(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}
const subjectTitle = (t) => (t === 'science' ? 'Science' : 'Maths');

/** The invoice line for a stored order: { description, sacKind } or null (no invoice for this product). */
function productLineFor(order) {
  const t = typeof order.packTarget === 'string' ? order.packTarget : '';
  switch (order.passType) {
    case 'till_boards':
      return { description: 'LazyTopper Board Pass (Premium access till CBSE Class 10 boards)', sacKind: 'boardPass' };
    case 'month':
      return { description: 'LazyTopper Premium month pass', sacKind: 'boardPass' };
    case 'pack_chapter':
      return { description: `LazyTopper PDF Chapter Pack: ${chapterTitle(t)}`, sacKind: 'packs' };
    case 'pack_mock':
      return { description: `LazyTopper PDF ${subjectTitle(t)} Mock Pack`, sacKind: 'packs' };
    case 'pack_subject':
      return { description: `LazyTopper PDF ${subjectTitle(t)} Subject Pack`, sacKind: 'packs' };
    case 'pack_cbq':
      return { description: `LazyTopper PDF ${subjectTitle(t)} CBQ Pack`, sacKind: 'packs' };
    case 'pack_bundle':
      return { description: 'LazyTopper PDF Maths + Science Bundle', sacKind: 'packs' };
    default:
      return null;
  }
}

/* ── Eligibility and amounts (PURE) ──────────────────────────────────────────── */

/**
 * PURE. The tax split for a stored order, in PAISE, or `{ held: reason }`.
 *   taxable = baseInr * 100; gst = amountPaise - taxable; intra: cgst = floor(gst / 2), sgst = gst - cgst.
 */
function invoiceAmountsFor(order) {
  if (!Number.isInteger(order.amountPaise) || order.amountPaise <= 0) return { held: 'amount_mismatch' };
  if (!Number.isInteger(order.baseInr) || !Number.isInteger(order.gstInr) || !(order.gstInr > 0)) return { held: 'pre_cutoff' };
  if (Number.isInteger(order.packCreditInr) && order.packCreditInr > 0) return { held: 'pack_credit' };
  const taxablePaise = order.baseInr * 100;
  const gstPaise = order.amountPaise - taxablePaise;
  // The stored breakup must reproduce the charge exactly (2262 = 1917 + 345).
  if (gstPaise !== order.gstInr * 100 || gstPaise <= 0) return { held: 'amount_mismatch' };
  const buyerState = order.gstBuyer && order.gstBuyer.stateCode;
  const intra = buyerState === SELLER_STATE_CODE;
  const cgstPaise = intra ? Math.floor(gstPaise / 2) : 0;
  const sgstPaise = intra ? gstPaise - cgstPaise : 0;
  const igstPaise = intra ? 0 : gstPaise;
  return {
    supplyType: intra ? 'intra' : 'inter',
    taxablePaise,
    gstPaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalPaise: taxablePaise + cgstPaise + sgstPaise + igstPaise,
    rates: intra ? { cgst: GST_RATE_PERCENT / 2, sgst: GST_RATE_PERCENT / 2 } : { igst: GST_RATE_PERCENT },
  };
}

/**
 * PURE. Why an order (already paid) gets no invoice, or null when it gets one. Order of checks = the reason a CA reads.
 */
function heldReasonFor(order, config) {
  const createdMs = toMs(order.createdAt);
  if (!Number.isFinite(createdMs) || createdMs < GST_EXCLUSIVE_FROM_MS) return 'pre_cutoff';
  if (!Number.isInteger(order.baseInr) || !Number.isInteger(order.gstInr) || !(order.gstInr > 0)) return 'pre_cutoff';
  const line = productLineFor(order);
  if (!line) return 'no_sac_for_product';
  if (!order.gstBuyer || !isGstStateCode(order.gstBuyer.stateCode)) return 'no_state';
  const amounts = invoiceAmountsFor(order);
  if (amounts.held) return amounts.held;
  if (!config || !config.ready) return 'seller_config_missing';
  return null;
}

/** PURE. The invoice document for an eligible order at `issuedAtMs` with sequence `seq`. */
function buildInvoiceRecord({ order, orderId, paymentId, config, fy, seq, issuedAtMs, contact }) {
  const amounts = invoiceAmountsFor(order);
  const line = productLineFor(order);
  const buyerState = stateByCode(order.gstBuyer.stateCode);
  const business = order.gstBuyer.business || null;
  const sac = line.sacKind === 'packs' ? config.sac.packs : config.sac.boardPass;
  const c = contact || {};
  return {
    number: invoiceNumberFor(fy, seq),
    fy,
    seq,
    orderId,
    paymentId,
    issuedAt: new Date(issuedAtMs),
    issuedAtMs,
    dateIst: istDateLabel(issuedAtMs),
    seller: {
      legalName: config.seller.legalName,
      brand: config.seller.brand,
      gstin: config.seller.gstin,
      address: config.seller.address,
      stateCode: config.seller.stateCode,
      stateName: stateByCode(config.seller.stateCode).name,
    },
    buyer: {
      name: business ? business.legalName : cleanText(c.name, 120) || null,
      email: cleanText(c.email, 254) || null,
      phone: cleanText(c.phone, 20) || null,
      stateCode: buyerState.code,
      stateName: buyerState.name,
      pin: order.gstBuyer.pin || null,
      gstin: business ? business.gstin : null,
      address: business ? business.address : null,
    },
    b2b: !!business,
    placeOfSupply: { code: buyerState.code, name: buyerState.name },
    line: { description: line.description, sac, quantity: 1, taxablePaise: amounts.taxablePaise },
    supplyType: amounts.supplyType,
    rates: amounts.rates,
    taxablePaise: amounts.taxablePaise,
    cgstPaise: amounts.cgstPaise,
    sgstPaise: amounts.sgstPaise,
    igstPaise: amounts.igstPaise,
    totalPaise: amounts.totalPaise,
  };
}

/* ── The invoice download token (guest purchases; the email link) ─────────────── */

/** HMAC over the order id under the server's key secret, domain-separated. Empty secret -> no token. */
function invoiceToken(orderId, secret) {
  if (!secret || typeof orderId !== 'string' || !orderId) return '';
  const mac = crypto.createHmac('sha256', `gst-invoice-link:v1:${secret}`).update(orderId).digest('base64url').slice(0, 32);
  return `${Buffer.from(orderId, 'utf8').toString('base64url')}.${mac}`;
}
/** The order id a token names, or null for a malformed / forged token. Timing-safe. */
function orderIdFromToken(token, secret) {
  if (!secret || typeof token !== 'string' || token.length > 200) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  let orderId;
  try {
    orderId = Buffer.from(token.slice(0, dot), 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (!/^[A-Za-z0-9_]{1,64}$/.test(orderId)) return null;
  const expected = Buffer.from(invoiceToken(orderId, secret));
  const given = Buffer.from(token);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return orderId;
}

/* ── The issuer ──────────────────────────────────────────────────────────────── */

/**
 * `createGstInvoicer({ adminFirestore, telemetry, env, now, getDisplayName })`
 *   .issueForPayment({ orderId, paymentId, payment }) -> Promise<result>   never throws; fire and forget
 *   .config                                                                 resolved once
 *   .whenIdle()                                                             tests only
 */
function createGstInvoicer(deps = {}) {
  const { adminFirestore, telemetry } = deps;
  const config = deps.config || resolveInvoiceConfig(deps.env || process.env);
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const inFlight = new Set();

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail anything */
    }
  }

  async function lookupName(order) {
    // Only a signed-in buyer paying for their OWN account has a name we know (their auth record). A guest, a parent and a
    // "who will use it" payer are named on the invoice by their contact only.
    if (typeof deps.getDisplayName !== 'function' || typeof order.uid !== 'string' || !order.uid || order.uid === 'erased') return '';
    if (order.payer) return '';
    try {
      return String((await deps.getDisplayName(order.uid)) || '');
    } catch {
      return '';
    }
  }

  async function run({ orderId, paymentId, payment }) {
    if (!config.enabled) return { skipped: 'off' };
    if (!adminFirestore || typeof adminFirestore.runTransaction !== 'function') return { skipped: 'no_store' };
    if (typeof orderId !== 'string' || !orderId || typeof paymentId !== 'string' || !paymentId) return { skipped: 'bad_input' };
    const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);

    // A read outside the transaction only to fetch the display name (an auth call must not run inside a transaction).
    let name = '';
    try {
      const pre = await ref.get();
      const o = pre && pre.exists ? pre.data() || {} : null;
      if (!o) return { skipped: 'unknown_order' };
      if (o.gstInvoice) return { issued: false, existing: o.gstInvoice.number };
      name = await lookupName(o);
    } catch {
      /* the transaction below re-reads */
    }
    const contact = {
      name,
      email: payment && typeof payment.email === 'string' ? payment.email : '',
      phone: payment && typeof payment.contact === 'string' ? payment.contact : '',
    };

    const result = await adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const order = snap && snap.exists ? snap.data() || {} : null;
      if (!order) return { skipped: 'unknown_order' };
      if (order.gstInvoice) return { issued: false, existing: order.gstInvoice.number };
      // Only a PAID order, and only for the payment that paid it.
      if (!PAID_STATES.includes(order.status) || order.paymentId !== paymentId) return { skipped: 'unpaid' };
      const issuedAtMs = now();
      const held = heldReasonFor(order, config);
      if (held) {
        if (!order.gstInvoiceHeld) {
          tx.set(ref, { gstInvoiceHeld: { reason: held, atMs: issuedAtMs, paymentId, ...(held === 'seller_config_missing' ? { missing: config.missing.slice() } : {}) } }, { merge: true });
        }
        return { held };
      }
      const fy = financialYearFor(issuedAtMs);
      const counterRef = adminFirestore.collection(GST_INVOICE_COUNTERS_COLLECTION).doc(fy);
      const counterSnap = await tx.get(counterRef);
      const last = counterSnap && counterSnap.exists ? Number((counterSnap.data() || {}).last) || 0 : 0;
      const seq = last + 1;
      const invoice = buildInvoiceRecord({ order, orderId, paymentId, config, fy, seq, issuedAtMs, contact });
      tx.set(counterRef, { last: seq, fy, updatedAt: new Date(issuedAtMs) }, { merge: true });
      tx.set(ref, { gstInvoice: invoice, ...(order.gstInvoiceHeld ? { gstInvoiceHeld: null } : {}) }, { merge: true });
      return { issued: true, number: invoice.number };
    }, { maxAttempts: 10 }); // concurrent captures contend on the counter: retried, never a gap or a duplicate
    if (result.issued) emit('payments.gst_invoice.issued');
    else if (result.held) emit(`payments.gst_invoice.held.${result.held}`);
    return result;
  }

  function issueForPayment(input) {
    const p = run(input || {}).catch((e) => {
      emit('payments.gst_invoice.error');
      console.error('[gst-invoice] issue failed:', e && e.message);
      return { error: true };
    });
    inFlight.add(p);
    p.finally(() => inFlight.delete(p));
    return p;
  }

  async function whenIdle() {
    while (inFlight.size) await Promise.all([...inFlight]);
  }

  return { issueForPayment, whenIdle, config };
}

/**
 * Chain the receipt after the invoice (so the receipt can link it), without ever delaying a payment response: the caller
 * does not await this. When there is no invoicer the receipt is sent exactly as before (synchronously started).
 * Never throws. `cap` bounds how long a slow invoice can hold the receipt back.
 */
function afterCapture({ invoicer, sendReceipt, input, capMs = 10000 }) {
  let invoicing = null;
  try {
    if (invoicer && typeof invoicer.issueForPayment === 'function' && invoicer.config && invoicer.config.enabled) {
      invoicing = invoicer.issueForPayment(input);
    }
  } catch {
    invoicing = null;
  }
  if (invoicing && typeof invoicing.catch === 'function') invoicing.catch(() => null); // never an unhandled rejection
  if (typeof sendReceipt !== 'function') return;
  if (!invoicing) {
    try {
      sendReceipt();
    } catch {
      /* never */
    }
    return;
  }
  let timer = null;
  const cap = new Promise((resolve) => {
    timer = setTimeout(resolve, capMs);
    if (timer && typeof timer.unref === 'function') timer.unref();
  });
  void Promise.race([invoicing, cap])
    .catch(() => null)
    .then(() => {
      if (timer) clearTimeout(timer);
      try {
        sendReceipt();
      } catch {
        /* never */
      }
    });
}

module.exports = {
  PAY_ORDERS_COLLECTION,
  GST_INVOICE_COUNTERS_COLLECTION,
  SELLER_LEGAL_NAME,
  SELLER_BRAND,
  SELLER_STATE_CODE,
  GST_STATES,
  PAID_STATES,
  stateByCode,
  isGstStateCode,
  stateCodeFromIpRegion,
  gstinCheckChar,
  isValidGstin,
  normaliseGstin,
  gstBuyerFromBody,
  resolveInvoiceConfig,
  financialYearFor,
  invoiceNumberFor,
  istDateLabel,
  toMs,
  productLineFor,
  invoiceAmountsFor,
  heldReasonFor,
  buildInvoiceRecord,
  invoiceToken,
  orderIdFromToken,
  createGstInvoicer,
  afterCapture,
  isPackProduct,
};
