/**
 * Payments — a student buys a pass through Razorpay (RAZORPAY-1).
 *
 *   POST /api/pay/order     { passType }                        AUTH REQUIRED
 *   POST /api/pay/verify    { orderId, paymentId, signature }   AUTH REQUIRED
 *   POST /api/pay/webhook   Razorpay's signed event             SIGNATURE REQUIRED
 *   POST /api/pay/status    { orderId }                         AUTH REQUIRED (PAY-STATUS-1)
 *
 * ★★ DARK BY DEFAULT (Z1). With the server env `PAYMENTS_ENABLED` unset, every one of
 * the four answers 404 — byte-for-byte the gateway's own not-found — before it reads
 * a header, a body or a key. Keys come ONLY from env: RAZORPAY_KEY_ID,
 * RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET. The key SECRET and the webhook secret
 * never leave this process; only the public key id is returned to the browser.
 *
 * ★★ NOTHING THAT DECIDES MONEY COMES FROM THE REQUEST (Z2). The amount of an order is
 * the server's own price for this student — `computeGrant` in passGrant.cjs, the SAME
 * function that later records `pricePaidInr` — and the request contributes only the
 * pass TYPE. A body that carries `amount`, `amountPaise` or `price` is ignored.
 *
 * ★★ A PAYMENT IS BELIEVED ONLY WHEN EVERY CHECK AGREES (Z4). The checkout signature
 * (timing-safe HMAC-SHA256 of `orderId|paymentId` under the key secret); the stored
 * order belongs to THIS verified caller; the payment Razorpay reports belongs to THIS
 * order, is in INR, is captured (or authorized, then captured here) and its amount
 * EQUALS the stored order's amount. Any disagreement is a 400, no grant, and a
 * telemetry counter — never a partial grant.
 *
 * ★★ THE WEBHOOK SIGNATURE IS OVER THE RAW BYTES (Z5). Nothing upstream of the route
 * dispatch in index.cjs reads a request body (the POST pre-block reads headers only),
 * so this module reads the unparsed stream itself and verifies the HMAC over exactly
 * those bytes before parsing them. Re-serialising parsed JSON would not reproduce
 * Razorpay's bytes and would reject genuine events.
 *
 * ★ IDEMPOTENT END TO END. The grant is `grantPass` with `paymentRef = paymentId` and
 * `payOrderId = orderId`: the payment record, the pass and the order's created -> paid
 * transition are one Firestore transaction (Z9), so verify + webhook + status + retries
 * of any of them grant a payment exactly once.
 *
 * ★★ ONE SET OF Z4 PAYMENT CHECKS (PAY-STATUS-1). verify, webhook and status all judge
 * Razorpay's payment through `paymentMismatch` — order_id, INR, amount equals the STORED
 * amountPaise, captured — so the three grant paths cannot drift apart (CLAUDE.md §4a).
 *
 * ★ STATUS IS A RECONCILE, NOT A SHORTCUT (owner decision D9). `/api/pay/status` answers
 * "is my payment through?" for the caller's OWN order. A `created` order is checked
 * against Razorpay's own list of the order's payments; it grants (through the same
 * `grantAndRespond`) ONLY on a Razorpay-confirmed captured payment that passes every Z4
 * check. Nothing in the request but the order id is read; Razorpay unreachable is an
 * honest `state: "unknown"`, never a grant.
 */

const crypto = require('node:crypto');
const { VALIDITY_LABEL } = require('../services/validityWindow.cjs'); // VALIDITY-FEB27
const { grantPass, computeGrant, describePass, isStaleFoundingOrder, monthPassAvailableFor, hasPaidMonthOrder, PassGrantInputError, PASS_TYPES } = require('../services/passGrant.cjs');
const { createRateLimiter } = require('../services/rateLimiter.cjs');
// TOPUP-1 (DARK): the extra-usage packs. Everything below is behind PAYMENTS_ENABLED AND TOPUP_ENABLED.
const { TOPUP_PRODUCTS, isTopupProduct, boardPassChargeFor, chargeFor } = require('../services/passPricing.cjs');
const { grantTopup, TopupInputError, isTopupFlagOn } = require('../services/usageCredit.cjs');
const { deriveEffectiveTier } = require('../services/entitlement.cjs');
// PACKS-SERVER-1 (DARK): one-time PDF packs. Behind PAYMENTS_ENABLED AND PACKS_ENABLED=1.
const { packBaseInrAt, isPackProduct, isPackOnSale, validateTarget, packIdFor, isAlreadyOwned } = require('../services/packProducts.cjs');
const { grantPack, listPacks, PackGrantInputError } = require('../services/packGrant.cjs');
// PACK-CREDIT-1: a Board Pass order is credited with the student's recent pack purchases.
const { boardPassCreditFor, applyCreditToQuote, creditNotes, creditOrderFields } = require('../services/packCredit.cjs');
// TS-UPGRADE-CREDIT-1: a Test Series Pack owner upgrading to the Board Pass pays the difference (taxable base), plus GST on it.
const { testSeriesUpgradeCreditFor, applyTsCreditToQuote, tsCreditNotes } = require('../services/tsUpgradeCredit.cjs');
// PAY-PHONE-1: a guest (signed-out, phone-number) order is only marked paid_unclaimed by the webhook, never granted here.
const { GUEST_PAYER, markGuestOrderPaid } = require('../services/guestPay.cjs');
// GST-INVOICE-1 (DARK): the buyer's confirmed state on the order, and the tax invoice issued after a verified capture.
const { gstBuyerFromBody, afterCapture } = require('../services/gstInvoice.cjs');
const { orderOptInField } = require('../services/waOptIn.cjs'); // WHATSAPP-OPTIN-1
const { orderSourceField } = require('../services/orderSource.cjs'); // ORDER-SOURCE-1
const { fire: fireServerEvent, signalsFor } = require('../services/serverEvents.cjs'); // SERVER-EVENTS-1
const { isOrderParallelDisabled, settle } = require('../services/payOrderTiming.cjs'); // CHECKOUT-FAST-1

/**
 * MONEY-DUPGUARD-1 - parentPay.cjs `coveredTillBoards`, the SAME function guest and parent pay use (not a copy). Read at
 * call time because parentPay.cjs itself requires this module at load (a top-level require here would be a cycle that
 * hands parentPay a half-built exports object).
 */
function coveredTillBoards(storedSubscription, nowMs) {
  return require('./parentPay.cjs').coveredTillBoards(storedSubscription, nowMs);
}

/**
 * MONEY-DUPGUARD-1 (§2.4) - how long an open, unpaid pass order of the caller's is handed back instead of a second one.
 * Razorpay documents no order expiry, so the bound is ours: 30 minutes, the life of the browser's own pending-order marker
 * and Pay-button hold (checkout.ts PAY_PENDING_TTL_MS). Two tabs / a re-tap / a ?buy= relaunch all fall well inside it; an
 * older open order is left alone and a fresh one is made, exactly as before.
 */
const REUSE_OPEN_ORDER_MS = 30 * 60 * 1000;
/** At most this many of the caller's open orders of one pass type are read (equality-only query, no composite index). */
const REUSE_SCAN_LIMIT = 10;
/**
 * Every stored order field that decides WHAT is charged and granted. An open order is reused only when each of these is
 * identical to the order this request would create (a GST cut-off, a price change, a pack credit or a different GST buyer
 * state / PIN all make a fresh order). Fields written later (lastFailure, ...) are not compared.
 */
const REUSE_MATCH_FIELDS = Object.freeze([
  'passType', 'amountPaise', 'offerKey', 'packCreditInr', 'packCreditIds', 'baseInr', 'gstInr', 'totalInr', 'gstRate', 'gstBuyer',
  // TS-UPGRADE-CREDIT-1: an open order made before (or without) the Test Series credit is never handed back for a credited
  // request, and vice versa. Absent on both sides for every other order (compared as "undefined"), so nothing else changes.
  'tsUpgradeCreditInr', 'tsUpgradeFullBaseInr', 'tsUpgradeCreditPackId', 'tsUpgradeCreditOrderId',
]);
/** Fields that mark an order as made by someone other than the signed-in student (parent link, guest / pay-for-someone). */
const NON_STUDENT_ORDER_MARKERS = Object.freeze(['payer', 'parentLinkId', 'recipient', 'guestPhone']);
/** Razorpay order states in which a NEW payment may still be made (razorpay.com/docs/payments/orders). */
const RAZORPAY_OPEN_ORDER_STATES = Object.freeze(['created', 'attempted']);

/** Canonical JSON (sorted object keys) so a stored map and a fresh one compare by value. */
function canonicalJson(value) {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
}

/** Does a stored order charge and grant exactly what `expected` (the order this request would store) does? */
function sameOrderTerms(stored, expected) {
  return REUSE_MATCH_FIELDS.every((k) => canonicalJson(stored[k]) === canonicalJson(expected[k]));
}

/** A stored `createdAt` (Admin SDK Timestamp, Date or ms) as epoch ms, or null. */
function createdAtMs(v) {
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.getTime() : null;
  if (v && typeof v.toMillis === 'function') {
    const ms = v.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

const PAY_ORDER_PATH = '/api/pay/order';
const PAY_VERIFY_PATH = '/api/pay/verify';
const PAY_WEBHOOK_PATH = '/api/pay/webhook';
const PAY_STATUS_PATH = '/api/pay/status';

/** Top-level collection. Named as a constant so the studentDataMap drift guard sees it. */
const PAY_ORDERS_COLLECTION = 'payOrders';
/** The subscription document the offer is read from — same collection passGrant writes. */
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';
const RAZORPAY_TIMEOUT_MS = 15000;
const CURRENCY = 'INR';

const MAX_JSON_BYTES = 16 * 1024;
const MAX_WEBHOOK_BYTES = 256 * 1024;
const ID_PATTERN = /^[A-Za-z0-9_]{1,64}$/;
const HEX_PATTERN = /^[a-fA-F0-9]{1,256}$/;

const NOT_FOUND_BODY = Object.freeze({ error: 'Not Found' });
/** What account erasure writes into an order's `uid` (Z7; studentDataMap `onErase`). */
const ERASED_UID = 'erased';

/** Same truthy grammar as the gateway's other server switches (FREE_CHECK_ENABLED). */
function isPaymentsEnabled(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.PAYMENTS_ENABLED) || '').trim());
}

/** TOPUP-1: top-up packs exist only when payments are on AND the owner has turned TOPUP_ENABLED on. */
function isTopupEnabled(env = process.env) {
  return isPaymentsEnabled(env) && isTopupFlagOn(env);
}

function readKeys(env = process.env) {
  const clean = (v) => String(v || '').trim();
  return {
    keyId: clean(env.RAZORPAY_KEY_ID),
    keySecret: clean(env.RAZORPAY_KEY_SECRET),
    webhookSecret: clean(env.RAZORPAY_WEBHOOK_SECRET),
  };
}

function hmacSha256Hex(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * ★ TIMING-SAFE. `crypto.timingSafeEqual` over equal-length buffers; a length mismatch
 * is answered false without a byte-wise compare (the expected length is public: a
 * SHA-256 hex digest is always 64 characters). Never `===` on a signature.
 */
function timingSafeHexEqual(expectedHex, providedHex) {
  const expected = Buffer.from(String(expectedHex || '').toLowerCase(), 'utf8');
  const provided = Buffer.from(String(providedHex || '').toLowerCase(), 'utf8');
  if (expected.length === 0 || expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

/** Razorpay Checkout: HMAC-SHA256(`order_id|payment_id`, key_secret), hex. */
function isCheckoutSignatureValid({ orderId, paymentId, signature, keySecret }) {
  if (!keySecret) return false;
  return timingSafeHexEqual(hmacSha256Hex(keySecret, `${orderId}|${paymentId}`), signature);
}

/** WEBHOOK-SIG-1 - the UTF-8 text with every non-ASCII code point written as a JSON \uXXXX escape (astral = surrogate pair). */
function escapeNonAscii(text, upper) {
  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code <= 127) {
      out += text[i];
    } else {
      const hex = code.toString(16).padStart(4, '0');
      out += `\\u${upper ? hex.toUpperCase() : hex}`;
    }
  }
  return out;
}

/**
 * Razorpay webhook: HMAC-SHA256(raw body bytes, webhook_secret), hex. Returns which form matched: 'raw' (the byte-exact path, as
 * always), or - ONLY when raw fails, the body has a byte > 127 and `variantsDisabled` is false - 'a' | 'b' | 'c2'
 * (WEBHOOK-SIG-1: the same secret over an escaped / re-encoded copy of the text). null = no match.
 */
function matchWebhookVariant({ rawBody, signature, webhookSecret, variantsDisabled }) {
  if (variantsDisabled || !webhookSecret || !Buffer.isBuffer(rawBody)) return null;
  let nonAscii = false;
  for (const b of rawBody) {
    if (b > 127) {
      nonAscii = true;
      break;
    }
  }
  if (!nonAscii) return null;
  const utf8 = rawBody.toString('utf8');
  const candidates = [
    ['a', () => Buffer.from(escapeNonAscii(utf8, false), 'utf8')],
    ['b', () => Buffer.from(escapeNonAscii(utf8, true), 'utf8')],
    ['c2', () => Buffer.from(rawBody.toString('latin1'), 'utf8')],
  ];
  for (const [name, build] of candidates) {
    if (timingSafeHexEqual(hmacSha256Hex(webhookSecret, build()), signature)) return name;
  }
  return null;
}

function matchWebhookSignature(args) {
  if (!args.webhookSecret || !Buffer.isBuffer(args.rawBody)) return null;
  if (timingSafeHexEqual(hmacSha256Hex(args.webhookSecret, args.rawBody), args.signature)) return 'raw';
  return matchWebhookVariant(args);
}

function isWebhookSignatureValid({ rawBody, signature, webhookSecret, variantsDisabled }) {
  if (!webhookSecret || !Buffer.isBuffer(rawBody)) return false;
  if (timingSafeHexEqual(hmacSha256Hex(webhookSecret, rawBody), signature)) return true;
  return matchWebhookVariant({ rawBody, signature, webhookSecret, variantsDisabled }) !== null;
}

/** WEBHOOK-SIG-1 kill switch: WEBHOOK_SIG_VARIANTS_DISABLED=1 restores the raw-bytes-only check. */
function areWebhookVariantsDisabled(env = process.env) {
  return String((env && env.WEBHOOK_SIG_VARIANTS_DISABLED) || '').trim() === '1';
}

/** WEBHOOK-SIG-1 diag - WHERE non-ASCII text sits (key paths) and WHICH code points; never a value, never a contact. */
function nonAsciiFacts(rawBody) {
  try {
    const paths = [];
    const cps = [];
    const hasNa = (str) => /[^\x00-\x7f]/.test(str);
    const walk = (node, p, depth) => {
      if (depth > 12 || (paths.length >= 5 && cps.length >= 8)) return;
      if (typeof node === 'string') {
        if (!hasNa(node)) return;
        if (paths.length < 5) paths.push(p || '$');
        for (const ch of node) {
          const cp = ch.codePointAt(0);
          if (cp > 127) {
            const tag = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
            if (!cps.includes(tag) && cps.length < 8) cps.push(tag);
          }
        }
      } else if (Array.isArray(node)) {
        node.forEach((v, i) => walk(v, `${p}[${i}]`, depth + 1));
      } else if (node && typeof node === 'object') {
        for (const k of Object.keys(node)) walk(node[k], p ? `${p}.${k}` : k, depth + 1);
      }
    };
    walk(JSON.parse(rawBody.toString('utf8')), '', 0);
    const clean = (k) => String(k).replace(/[^A-Za-z0-9_.[\]-]/g, '?').slice(0, 60);
    return ` naPaths=${paths.length ? paths.map(clean).join(',') : '-'} cps=${cps.length ? cps.join(',') : '-'}`;
  } catch {
    return '';
  }
}

/**
 * WEBHOOK-DIAG-1 - ids and byte facts only (never the body, the secret or any contact) for a webhook whose signature failed, so the
 * cause of the 400 bursts can be told apart: a body changed in transit (bytes vs content-length, non-ASCII bytes, encodings), a
 * missing/odd signature, or a different secret (everything matches and it still fails).
 */
function webhookBadSigContext(req, rawBody, signature) {
  try {
    const h = (req && req.headers) || {};
    const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : '';
    const pick = (re) => {
      const m = re.exec(text);
      return m ? m[1] : undefined;
    };
    let nonAscii = 0;
    if (Buffer.isBuffer(rawBody)) for (const b of rawBody) if (b > 127) nonAscii += 1;
    const one = (v) => String(v === undefined ? '-' : v).replace(/[^A-Za-z0-9_.,/=-]/g, '').slice(0, 40) || '-';
    return {
      event: pick(/"event"\s*:\s*"([a-z_.]{1,40})"/),
      orderId: pick(/"order_id"\s*:\s*"(order_[A-Za-z0-9_]{1,40})"/),
      paymentId: pick(/"id"\s*:\s*"(pay_[A-Za-z0-9_]{1,40})"/),
      diag:
        `bytes=${Buffer.isBuffer(rawBody) ? rawBody.length : -1} cl=${one(h['content-length'])} nonascii=${nonAscii}` +
        ` enc=${one(h['content-encoding'])} te=${one(h['transfer-encoding'])} sigLen=${String(signature || '').length}` +
        ` evid=${one(h['x-razorpay-event-id'])} via=${h['x-vercel-id'] ? 'vercel' : 'direct'}` +
        (nonAscii > 0 ? nonAsciiFacts(rawBody) : ''),
    };
  } catch {
    return undefined;
  }
}

/** The unparsed request body, as bytes. Rejects past `maxBytes`. */
function readRawBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let done = false;
    req.on('data', (chunk) => {
      if (done) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buf.length;
      if (bytes > maxBytes) {
        done = true;
        const err = new Error('Request body too large');
        err.code = 'BODY_TOO_LARGE';
        reject(err);
        return;
      }
      chunks.push(buf);
    });
    req.on('end', () => {
      if (!done) {
        done = true;
        resolve(Buffer.concat(chunks));
      }
    });
    req.on('error', (e) => {
      if (!done) {
        done = true;
        reject(e);
      }
    });
  });
}

/**
 * ★★ Z4, SHARED (PAY-STATUS-1). Does Razorpay's payment belong to THIS order, in INR, for
 * EXACTLY the stored amount? Returns the first failing reason, or null. The order of the
 * checks is the order verify and webhook have always applied them in.
 */
function paymentIdentityMismatch(payment, { orderId, amountPaise }) {
  if (payment.order_id !== orderId) return 'order_mismatch';
  if (payment.currency !== CURRENCY) return 'currency_mismatch';
  if (!Number.isInteger(amountPaise) || payment.amount !== amountPaise) return 'amount_mismatch';
  return null;
}

/** Every Z4 check on a payment: its identity (above), and that it is captured. */
function paymentMismatch(payment, order) {
  const identity = paymentIdentityMismatch(payment, order);
  if (identity) return identity;
  if (payment.status !== 'captured') return 'not_captured';
  return null;
}

/** PAY-RESCUE-1 - one of Razorpay's short error strings, trimmed to 80 chars of plain text ('' when absent). */
function cleanFailureText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[^A-Za-z0-9_ .,:;'()/-]/g, '').trim().slice(0, 80);
}

function parseJsonObject(buf) {
  const text = buf.length ? buf.toString('utf8') : '{}';
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
  return parsed;
}

/**
 * ★★ THE SERVER PRICE (P5). The amount a student pays for `passType` right now, from
 * the SAME `computeGrant` that records `pricePaidInr` at grant time — never a second
 * copy of the pricing rules. `lastPaymentRef` is stripped so a quote can never be
 * mistaken for a replay; nothing is written.
 */
function quotePass(storedSubscription, passType, nowMs, { foundingOfferOpen } = {}) {
  const stored = storedSubscription && typeof storedSubscription === 'object' ? storedSubscription : {};
  const withoutRef = { ...stored };
  delete withoutRef.lastPaymentRef;
  const decision = computeGrant(
    withoutRef,
    { passType, paymentRef: 'quote', nowMs },
    foundingOfferOpen === undefined ? undefined : { foundingOfferOpen },
  );
  const pricePaidInr = decision.fields.pricePaidInr;
  // GST-EXCL-1 - from 00:00 IST 7 Nov 2026 (SERVER clock, at ORDER time) EVERY pass (the Board Pass and the month pass,
  // owner scope: every paid product) is charged its base price + 18% GST (₹1,917 -> ₹2,262; month ₹599 -> ₹707).
  // `pricePaidInr` / `amountPaise` are then the TOTAL - what Razorpay is asked for and what every later amount check
  // (verify / webhook / status) compares against - and `gst` carries the breakup the order stores. Before the cut-off
  // the quote is byte-identical to before (no `gst` key).
  if (Object.prototype.hasOwnProperty.call(PASS_TYPES, passType)) {
    const charge = boardPassChargeFor(pricePaidInr, nowMs);
    if (charge.gstExclusive) {
      return {
        pricePaidInr: charge.totalInr,
        amountPaise: charge.totalInr * 100,
        offerKey: decision.fields.offerKey,
        gst: { baseInr: charge.baseInr, gstInr: charge.gstInr, totalInr: charge.totalInr, gstRate: charge.gstRate },
      };
    }
  }
  return { pricePaidInr, amountPaise: pricePaidInr * 100, offerKey: decision.fields.offerKey };
}

/**
 * GST-EXCL-1 - the quote for an item priced from a SERVER TABLE (a PDF pack, a top-up): its base price, plus 18% GST for an
 * order created at/after the cut-off (owner scope, 4 Nov 18:23 IST). Before it: byte-identical to `{ pricePaidInr: base, ... }`.
 */
function tableQuote(baseInr, nowMs) {
  const charge = chargeFor(baseInr, nowMs);
  const quote = { pricePaidInr: charge.totalInr, amountPaise: charge.totalInr * 100, offerKey: null };
  if (charge.gstExclusive) {
    quote.gst = { baseInr: charge.baseInr, gstInr: charge.gstInr, totalInr: charge.totalInr, gstRate: charge.gstRate };
  }
  return quote;
}

/**
 * GST-EXCL-1 - the GST breakup a stored pay order carries: { baseInr, gstInr, totalInr, gstRate } for a Board Pass order
 * created at/after the cut-off, else nothing (an older order, a pack, a top-up: byte-identical to before). `totalInr` is
 * base + GST BEFORE any pack credit; `amountPaise` stays the amount actually charged.
 */
function gstOrderFields(quote) {
  const g = quote && quote.gst;
  if (!g || !Number.isInteger(g.baseInr) || !Number.isInteger(g.gstInr) || !Number.isInteger(g.totalInr)) return {};
  return { baseInr: g.baseInr, gstInr: g.gstInr, totalInr: g.totalInr, gstRate: g.gstRate };
}

/**
 * GST-EXCL-1 (review G2) - what the ORDER response tells the browser about the price it is about to pay: the server's own
 * breakup, so a tab rendered before the cut-off (or a phone with a wrong clock) can show the corrected total and ask
 * before Razorpay opens. Nothing for a pre-cut-off order: the response is byte-identical to before.
 */
function gstResponseFields(quote, packCreditInr, tsFields) {
  const g = gstOrderFields(quote);
  if (!('baseInr' in g)) return {};
  return {
    gst: { baseInr: g.baseInr, gstInr: g.gstInr, totalInr: g.totalInr },
    ...(packCreditInr > 0 ? { packCreditInr } : {}),
    // TS-UPGRADE-CREDIT-1: the Test Series base credited (the `gst` above is already the upgrade's own breakup). Absent otherwise.
    ...(tsFields && tsFields.tsUpgradeCreditInr > 0 ? { tsUpgradeCreditInr: tsFields.tsUpgradeCreditInr } : {}),
  };
}

function createPaymentRoutes(deps = {}) {
  const {
    sendJson,
    verifiedCaller,
    adminFirestore,
    telemetry,
    env = process.env,
    fetchImpl = typeof fetch === 'function' ? fetch : null,
    now = () => Date.now(),
    foundingOfferOpen,
    topupBonus, // test seam only: { percent, endsIso }; production passes nothing (the constants decide)
    receiptEmailer, // PAY-PHONE-1 (A): optional; absent -> no receipt email (it is off by default anyway)
    /**
     * CHECKOUT-WHO-2 - optional async ({ orderId, paymentId }) => void: the guest routes' post-payment step for a
     * "Who will use it?" order (attach to an existing recipient account + the recipient email), the SAME one verify runs.
     * Idempotent and never throws. Absent -> a webhook-only recipient order simply waits for the recipient's sign-in.
     */
    afterGuestPaid,
    /**
     * GST-INVOICE-1 - optional `{ issueForPayment, config }` (services/gstInvoice.cjs). Absent, or GST_INVOICE_ENABLED off:
     * nothing happens and the receipt is sent exactly as before. Fired AFTER the grant has answered; never awaited.
     */
    invoicer,
    /** SERVER-EVENTS-1 - optional serverEvents service (Meta CAPI + GA4 MP). Absent -> nothing. Only ever called through `fire`. */
    serverEvents,
  } = deps;

  /**
   * PAY-PHONE-1 (A) - ONE receipt email per paid order, to the address Razorpay recorded on the payment. Fire and
   * forget: never awaited, never able to fail or delay a payment response; the emailer itself is idempotent per payment
   * and only sends for an order that is really paid. Top-ups get none.
   */
  function sendReceipt(orderId, paymentId, payment, passType) {
    // GST-INVOICE-1: the invoice (if invoicing is on) is issued first, so the receipt can link it; a top-up gets no
    // receipt but still reaches the invoicer (which HOLDS it: no SAC is configured for a top-up).
    const wantsReceipt = !!receiptEmailer && typeof receiptEmailer.sendForPayment === 'function' && !isTopupProduct(passType);
    const email = payment && typeof payment.email === 'string' ? payment.email : '';
    // SERVER-EVENTS-1: fire and forget, once per order (the service claims a marker on the paid order doc). Cannot throw here.
    if (serverEvents) fireServerEvent(() => serverEvents.orderPaid({ orderId, payment }));
    afterCapture({
      invoicer,
      input: { orderId, paymentId, payment },
      sendReceipt: wantsReceipt ? () => void receiptEmailer.sendForPayment({ orderId, paymentId, email }) : null,
    });
  }

  const rateLimiter =
    deps.rateLimiter ||
    createRateLimiter({
      telemetry,
      now,
      paidEndpoints: { [PAY_ORDER_PATH]: 'payments', [PAY_VERIFY_PATH]: 'payments', [PAY_STATUS_PATH]: 'payments' },
      limits: {
        payments: {
          soft: Number(env.LT_CAP_PAYMENTS_SOFT || 20),
          hard: Number(env.LT_CAP_PAYMENTS_HARD || 60),
        },
      },
    });

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail a payment */
    }
  }

  /**
   * Operator-only reject log (Razorpay ids + order status only; never email, phone, uid or name).
   * Logging must never alter the response, so it is fully guarded.
   */
  function logReject(scope, reason, ctx) {
    try {
      const c = ctx || {};
      const f = (v) => (typeof v === 'string' && v ? v : v === undefined || v === null || v === '' ? '-' : String(v));
      let line = `[pay/${scope}] rejected reason=${reason} event=${f(c.event)} order=${f(c.orderId)} pay=${f(c.paymentId)} status=${f(c.status)}`;
      if (reason === 'amount_mismatch') line += ` expected=${f(c.expected)} got=${f(c.got)}`;
      if (c.error) line += ` error=${String(c.error).slice(0, 160)}`;
      if (c.diag) line += ` ${String(c.diag).slice(0, 480)}`;
      console.warn(line);
    } catch {
      /* a log line must never fail a payment */
    }
  }

  /** Z4/Z5: every rejection is a 400 with a reason, and counted. */
  function reject(res, scope, reason, ctx) {
    emit(`payments.${scope}.rejected.${reason}`);
    logReject(scope, reason, ctx);
    return sendJson(res, 400, { ok: false, error: 'payment_rejected', reason });
  }

  function enabled() {
    return isPaymentsEnabled(env);
  }

  function topupEnabled() {
    return isTopupEnabled(env);
  }

  function razorpayAuthHeader(keys) {
    return `Basic ${Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64')}`;
  }

  async function razorpay(keys, method, apiPath, body) {
    if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable');
    const init = {
      method,
      headers: { Authorization: razorpayAuthHeader(keys), 'Content-Type': 'application/json' },
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      init.signal = AbortSignal.timeout(RAZORPAY_TIMEOUT_MS);
    }
    const res = await fetchImpl(`${RAZORPAY_API_BASE}${apiPath}`, init);
    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { ok: !!res.ok, status: res.status, json };
  }

  async function readJsonBody(req, res) {
    try {
      return parseJsonObject(await readRawBody(req, MAX_JSON_BYTES));
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
      return null;
    }
  }

  /** The shared front door of the three browser routes. Returns { uid, keys } or null. */
  async function admitBrowserCall(req, res, reqPath) {
    const uid = await verifiedCaller.resolveVerifiedUid(req);
    if (!uid) {
      sendJson(res, 401, { ok: false, error: 'unauthenticated' });
      return null;
    }
    const verdict = rateLimiter.check(req, reqPath, uid);
    if (!verdict.allowed) {
      sendJson(res, verdict.status, verdict.body);
      return null;
    }
    const keys = readKeys(env);
    if (!keys.keyId || !keys.keySecret || !adminFirestore) {
      emit('payments.unavailable');
      sendJson(res, 503, { ok: false, error: 'Payments are unavailable right now.' });
      return null;
    }
    return { uid, keys };
  }

  /**
   * MONEY-DUPGUARD-1 (§2.4) - the id of the caller's newest open pass order that may be handed back, or null.
   * ALL must hold: our record is the caller's, `created` (never paid / claimed / erased), of the same terms, made within
   * REUSE_OPEN_ORDER_MS; and RAZORPAY's own order is still open (`created` / `attempted`, nothing paid, same amount, INR)
   * with no payment on it already authorized or captured (Razorpay refuses a new payment on such an order). Every read
   * failure, refusal or odd answer -> null (a fresh order: today's behaviour), with a telemetry counter.
   */
  async function reusableOpenPassOrder(keys, uid, terms) {
    let candidate = null;
    try {
      const snap = await adminFirestore
        .collection(PAY_ORDERS_COLLECTION)
        .where('uid', '==', uid).where('passType', '==', terms.passType).where('status', '==', 'created')
        .limit(REUSE_SCAN_LIMIT).get();
      const nowMs = now();
      for (const d of (snap && snap.docs) || []) {
        const stored = d.data() || {};
        const at = createdAtMs(stored.createdAt);
        if (stored.uid !== uid || stored.status !== 'created' || at === null) continue;
        // Review F1: only the student's OWN signed-in orders. A parent pay-link order (stored under the CHILD's uid) or a
        // guest order carries a payer marker: it is someone else's checkout and is never handed to the student.
        if (NON_STUDENT_ORDER_MARKERS.some((k) => stored[k] !== undefined && stored[k] !== null)) continue;
        if (at > nowMs || nowMs - at > REUSE_OPEN_ORDER_MS) continue;
        if (!ID_PATTERN.test(d.id) || !sameOrderTerms(stored, terms)) continue;
        if (!candidate || at > candidate.at) candidate = { id: d.id, at };
      }
    } catch (e) {
      emit('payments.order.reuse_read_failed');
      console.error('[pay/order] open-order read failed:', e && e.message);
      return null;
    }
    if (!candidate) return null;
    try {
      const got = await razorpay(keys, 'GET', `/orders/${candidate.id}`);
      const o = got.json || {};
      if (
        !got.ok ||
        o.id !== candidate.id ||
        !RAZORPAY_OPEN_ORDER_STATES.includes(o.status) ||
        o.amount !== terms.amountPaise ||
        o.amount_paid !== 0 ||
        o.currency !== CURRENCY
      ) {
        emit('payments.order.reuse_not_open');
        return null;
      }
      if (o.status === 'attempted') {
        const listed = await razorpay(keys, 'GET', `/orders/${candidate.id}/payments`);
        const items = listed.ok && listed.json && Array.isArray(listed.json.items) ? listed.json.items : null;
        if (!items || items.some((p) => !p || p.status === 'authorized' || p.status === 'captured')) {
          emit('payments.order.reuse_not_open');
          return null;
        }
      }
    } catch (e) {
      emit('payments.order.reuse_read_failed');
      console.error('[pay/order] open-order Razorpay read failed:', e && e.message);
      return null;
    }
    return candidate.id;
  }

  /* ── Z2 · POST /api/pay/order ───────────────────────────────────────────── */
  async function handleOrder(req, res) {
    if (!enabled()) return sendJson(res, 404, NOT_FOUND_BODY);
    const admitted = await admitBrowserCall(req, res, PAY_ORDER_PATH);
    if (!admitted) return undefined;
    const { uid, keys } = admitted;

    const body = await readJsonBody(req, res);
    if (!body) return undefined;
    const passType = body.passType;
    const isTopup = isTopupProduct(passType);
    // PACKS-SERVER-1 dark proof: with PACKS_ENABLED off a pack key is NOT a pack - it falls through to the
    // unknown-passType 400 below, byte for byte what any unknown key gets.
    // TS-PACK-1: `isPackOnSale` is PACKS_ENABLED plus the Test Series Pack's own kill switch (TS_PACK_DISABLED) - a pack that
    // is not on sale falls through to the same unknown-passType 400 as before.
    const isPack = isPackOnSale(passType, env);
    // TOPUP-1 dark proof: with TOPUP_ENABLED unset a top-up key is answered exactly like an unknown route.
    if (isTopup && !topupEnabled()) return sendJson(res, 404, NOT_FOUND_BODY);
    if (!isTopup && !isPack && !Object.prototype.hasOwnProperty.call(PASS_TYPES, passType)) {
      return sendJson(res, 400, { ok: false, error: 'passType must be "month" or "till_boards"' });
    }

    let quote;
    let packTarget = null;
    if (isPack) {
      // ★★ The target is validated, the amount is the SERVER table's (never the body's), and a pack the
      // student already owns is refused BEFORE any Razorpay order exists (no charge for nothing).
      packTarget = validateTarget(passType, body.packTarget);
      if (packTarget === null) {
        emit('payments.order.pack_bad_target');
        return sendJson(res, 400, { ok: false, error: 'invalid_pack_target' });
      }
      try {
        const owned = await listPacks(adminFirestore, uid);
        if (isAlreadyOwned(owned, passType, packTarget)) {
          emit('payments.order.pack_already_owned');
          return sendJson(res, 409, { ok: false, error: 'already_owned' });
        }
      } catch (e) {
        // Fail CLOSED: without the ownership read we cannot promise the student is not paying twice.
        emit('payments.order.pack_owned_read_failed');
        console.error('[pay/order] pack ownership read failed:', e && e.message);
        return sendJson(res, 500, { ok: false, error: 'Could not price this pack.' });
      }
      quote = tableQuote(packBaseInrAt(passType, now()), now());
    }
    // CHECKOUT-FAST-1: for the Board Pass the Test Series credit read needs nothing from the quote, so it STARTS with the
    // subscription read instead of after the pack-credit read (PAY_ORDER_PARALLEL_DISABLED=1: as before). Its result is used exactly
    // where the sequential code used it. The MONEY-DUPGUARD open-order scan is NOT moved: it still runs immediately before the order.
    const parallel = !isOrderParallelDisabled(env);
    const tsCreditP = parallel && !isPack && !isTopup && passType === 'till_boards' ? settle(() => testSeriesUpgradeCreditFor(adminFirestore, uid, passType, env)) : null;
    try {
      // A pack needs no subscription read: its price does not depend on the student's plan.
      const snap = isPack ? null : await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
      const stored = snap && snap.exists ? snap.data() || {} : {};
      if (isPack) {
        // quote already fixed above from the server table
      } else if (isTopup) {
        // Premium only (a trial or free student at a limit sees "Upgrade"). The tier is the SERVER's own
        // derivation from the stored subscription; the amount is ALWAYS the server table, never the body's.
        if (deriveEffectiveTier(stored, now()).tier !== 'premium') {
          emit('payments.order.topup_not_premium');
          return sendJson(res, 403, { ok: false, error: 'premium_required' });
        }
        quote = tableQuote(TOPUP_PRODUCTS[passType].priceInr, now());
      } else {
        // MONEY-DUPGUARD-1 (owner 2-3 Nov: "There are no refunds") - an account whose pass ALREADY runs to the boards
        // buys nothing new with either pass, so no order is made for it (no Razorpay order, nothing stored). The rule is
        // the ONE guest / parent pay already use (parentPay.cjs `coveredTillBoards`). A month pass that ends before the
        // boards is not covered, so its Board Pass upgrade is still sold. A failed subscription read never reaches here:
        // it is the catch below (500, no order) - fail CLOSED.
        if (coveredTillBoards(stored, now())) {
          emit('payments.order.pass_already_covered');
          return sendJson(res, 409, {
            ok: false,
            error: 'already_covered',
            message: `Your pass is already valid till ${VALIDITY_LABEL}. There is nothing more to pay.`,
          });
        }
        // PRICE-FIXED-1 - the month pass is no longer sold to an account that has never bought one, from
        // 2026-11-01T00:00:00+05:30 (server clock). Derived from the server's own records, never the body.
        if (passType === 'month' && !(await monthPassAvailableFor(adminFirestore, uid, now()))) {
          emit('payments.order.month_pass_retired');
          return sendJson(res, 409, {
            ok: false,
            error: 'month_pass_retired',
            message: 'The month pass is no longer on sale. Choose the Board Pass instead.',
          });
        }
        quote = quotePass(stored, passType, now(), { foundingOfferOpen });
      }
    } catch (e) {
      emit('payments.order.quote_failed');
      console.error('[pay/order] quote failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not price this pass.' });
    }

    // PACK-CREDIT-1 - a Board Pass is credited with the packs bought in the last 7 days. The credit is the
    // server's own sum over the student's stored packs; a failed read is credit 0 (fail CLOSED) and never
    // blocks the purchase. The credited amount is what Razorpay is asked for and what the order stores, so
    // every later amount check (verify / webhook / status) compares against it.
    let packCreditInr = 0;
    let packCreditIds = '';
    if (!isPack && !isTopup && passType === 'till_boards') {
      const credit = await boardPassCreditFor(adminFirestore, uid, passType, quote.pricePaidInr, now());
      if (credit.readFailed) emit('payments.order.pack_credit_read_failed');
      const applied = applyCreditToQuote(quote, credit);
      quote = applied.quote;
      packCreditInr = applied.packCreditInr;
      packCreditIds = applied.packCreditIds;
      if (packCreditInr > 0) emit('payments.order.pack_credit_applied');
    }

    // TS-UPGRADE-CREDIT-1 - a student who paid for the Test Series Pack pays only the DIFFERENCE for the Board Pass: the Test
    // Series TAXABLE base (999, proved from the server's own paid order) comes off the Board Pass base, and GST is charged on
    // the difference (918 + 165 = 1083 founding; 1500 + 270 = 1770 from 1 Dec). Never stacked with a PACK-CREDIT-1 credit.
    // Any doubt / failed read is credit 0 and the order is made at the full price, byte-identical to before (fail CLOSED,
    // never blocks). The credited amount is what Razorpay is asked for and what the order stores, so verify / webhook /
    // status compare against it; the order's baseInr / gstInr are the upgrade's own, so the GST invoice reproduces it.
    let tsFields = {};
    if (!isPack && !isTopup && passType === 'till_boards' && packCreditInr === 0) {
      let tsCredit;
      if (tsCreditP) {
        const r = await tsCreditP;
        if (!r.ok) throw r.error; // the service never throws; if it somehow did, the sequential route threw here too
        tsCredit = r.value;
      } else {
        tsCredit = await testSeriesUpgradeCreditFor(adminFirestore, uid, passType, env);
      }
      if (tsCredit.disabled) emit('payments.order.ts_upgrade_credit_disabled');
      else if (tsCredit.readFailed) emit('payments.order.ts_upgrade_credit_read_failed');
      if (tsCredit.creditBaseInr > 0) {
        const applied = applyTsCreditToQuote(quote, tsCredit, now());
        quote = applied.quote;
        tsFields = applied.fields;
        emit(tsFields.tsUpgradeCreditInr > 0 ? 'payments.order.ts_upgrade_credit_applied' : 'payments.order.ts_upgrade_credit_not_applied');
      } else if (tsCredit.reason && !['no_test_series', 'not_board_pass', 'disabled', 'read_failed'].includes(tsCredit.reason)) {
        // A Test Series owner whose record could not prove a creditable purchase (already credited, refunded, other uid ...).
        emit(`payments.order.ts_upgrade_credit_refused.${tsCredit.reason}`);
      }
    }

    // GST-INVOICE-1: the state the buyer confirmed (+ optional PIN / business GSTIN). Never refuses an order.
    const gstBuyer = gstBuyerFromBody(body.gstBuyer);
    for (const d of gstBuyer.dropped) emit(`payments.order.gst_buyer_dropped.${d}`);

    // What this request would store (and charge / grant). Also what an open order must match to be handed back.
    const orderTerms = {
      passType,
      amountPaise: quote.amountPaise,
      ...creditOrderFields(packCreditInr, packCreditIds),
      ...tsFields,
      ...gstOrderFields(quote),
      ...gstBuyer.fields,
      offerKey: quote.offerKey,
    };

    // MONEY-DUPGUARD-1 (§2.4) - the caller's own open, unpaid order for the SAME terms is handed back instead of a second
    // order: two tabs then share ONE Razorpay order, and Razorpay binds a single successful payment to an order. Pass
    // orders only. Any read failure -> a fresh order, exactly as before (never blocks the student).
    if (!isPack && !isTopup) {
      const reuse = await reusableOpenPassOrder(keys, uid, orderTerms);
      if (reuse) {
        emit('payments.order.reused');
        // WHATSAPP-OPTIN-1: the handed-back open order takes this tap's valid + ticked opt-in too (best effort; never blocks the order).
        const reuseOptIn = orderOptInField(body, now());
        if (reuseOptIn.waOptIn) {
          try {
            await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(reuse).set(reuseOptIn, { merge: true });
          } catch {
            emit('payments.order.wa_optin_store_failed');
          }
        }
        return sendJson(res, 200, { ok: true, orderId: reuse, keyId: keys.keyId, amountPaise: quote.amountPaise, ...gstResponseFields(quote, packCreditInr, tsFields) });
      }
    }

    let created;
    try {
      created = await razorpay(keys, 'POST', '/orders', {
        amount: quote.amountPaise,
        currency: CURRENCY,
        notes: {
          uid,
          passType,
          ...(isPack ? { packTarget } : {}),
          ...(quote.offerKey ? { offerKey: quote.offerKey } : {}),
          ...creditNotes(packCreditInr, packCreditIds),
          ...tsCreditNotes(tsFields),
        },
      });
    } catch (e) {
      emit('payments.order.razorpay_unreachable');
      console.error('[pay/order] razorpay unreachable:', e && e.message);
      return sendJson(res, 502, { ok: false, error: 'Payment provider is unreachable.' });
    }
    const order = created.json || {};
    if (
      !created.ok ||
      typeof order.id !== 'string' ||
      !ID_PATTERN.test(order.id) ||
      order.amount !== quote.amountPaise ||
      order.currency !== CURRENCY
    ) {
      emit('payments.order.razorpay_refused');
      console.error('[pay/order] razorpay refused the order, status', created.status);
      return sendJson(res, 502, { ok: false, error: 'Payment provider refused the order.' });
    }

    try {
      await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(order.id).set({
        uid,
        passType,
        amountPaise: quote.amountPaise,
        ...(isPack ? { packTarget } : {}),
        ...creditOrderFields(packCreditInr, packCreditIds),
        ...tsFields,
        ...gstOrderFields(quote),
        ...gstBuyer.fields,
        ...orderOptInField(body, now()), // WHATSAPP-OPTIN-1: only when the number is valid AND the tick was sent; else nothing
        ...orderSourceField(body, env), // ORDER-SOURCE-1: whitelisted + sanitised; nothing when absent / invalid / switched off
        ...signalsFor(serverEvents, body, req), // SERVER-EVENTS-1: only when server events are ON; cookie ids + server-read IP / UA
        offerKey: quote.offerKey,
        status: 'created',
        createdAt: new Date(now()),
      });
    } catch (e) {
      emit('payments.order.store_failed');
      console.error('[pay/order] could not store the order:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not record the order.' });
    }

    emit('payments.order.created');
    if (serverEvents) fireServerEvent(() => serverEvents.orderCreated({ orderId: order.id, passType, amountPaise: quote.amountPaise, uid, signals: signalsFor(serverEvents, body, req).adSignals }));
    return sendJson(res, 200, { ok: true, orderId: order.id, keyId: keys.keyId, amountPaise: quote.amountPaise, ...gstResponseFields(quote, packCreditInr, tsFields) });
  }

  /**
   * The payment as Razorpay reports it, captured if it was only authorized.
   * Returns { payment } or { error: reason, upstream: bool }.
   */
  /**
   * PRICING-1 — true only for a STALE founding order whose buyer is NOT already a founder. An existing
   * founder pays the founding rate on every order anyway (foundingMember is sticky), so their late
   * authorization is captured normally. A failed read counts as "not a founder": refuse, never capture blind.
   */
  async function refuseStaleFoundingOrder(order) {
    if (!isStaleFoundingOrder(order, now())) return false;
    // TS-PRICE-2: the founder exemption is a Board Pass rate lock; a Test Series order is never exempt from it.
    if (order.passType === 'test_series') return true;
    try {
      const snap = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(order.uid).get();
      const stored = snap && snap.exists ? snap.data() || {} : {};
      if (stored.foundingMember === true) return false;
    } catch (_e) {
      /* fall through to refuse */
    }
    return true;
  }

  async function fetchCapturedPayment(keys, paymentId, amountPaise, order) {
    const fetched = await razorpay(keys, 'GET', `/payments/${paymentId}`);
    if (!fetched.ok || !fetched.json) return { error: 'payment_fetch_failed', upstream: true };
    let payment = fetched.json;
    if (payment.status === 'authorized') {
      // MONEY-DUPGUARD-1 (review F3) - our order is ALREADY PAID by a different payment: this is a late / second
      // authorisation on it (Razorpay binds one successful payment to an order and auto-refunds a late authorisation).
      // Never capture it - leave it uncaptured so it lapses / is refunded - and never grant twice.
      if (order && order.status === 'paid' && typeof order.paymentId === 'string' && order.paymentId && order.paymentId !== paymentId) {
        return { error: 'order_already_paid', upstream: false };
      }
      // PRICING-1 — MANUAL-CAPTURE PATH ONLY. Orders are created WITHOUT payment_capture, so the Razorpay
      // account setting applies (auto-capture is Razorpay's default). Auto-capture: a stale founding order
      // that is captured is honoured at its order price (599) — a captured payment ALWAYS grants (verify,
      // status and the webhook), so money is never stranded. Only a payment still merely AUTHORIZED, 24 h+
      // after the close, for a buyer who is not already a founder, is refused here BEFORE capture: the
      // authorization lapses and Razorpay releases it, so no money is taken for a pass we refuse.
      if (await refuseStaleFoundingOrder(order)) return { error: 'order_expired', upstream: false };
      // Capture for the STORED amount — the only amount this server ever charges.
      const captured = await razorpay(keys, 'POST', `/payments/${paymentId}/capture`, {
        amount: amountPaise,
        currency: CURRENCY,
      });
      if (captured.ok && captured.json) {
        payment = captured.json;
      } else {
        // A concurrent auto-capture makes our capture fail; read the truth once more.
        const again = await razorpay(keys, 'GET', `/payments/${paymentId}`);
        if (!again.ok || !again.json) return { error: 'payment_capture_failed', upstream: true };
        payment = again.json;
      }
    }
    return { payment };
  }

  /* ── Z4 · POST /api/pay/verify ──────────────────────────────────────────── */
  async function handleVerify(req, res) {
    if (!enabled()) return sendJson(res, 404, NOT_FOUND_BODY);
    const admitted = await admitBrowserCall(req, res, PAY_VERIFY_PATH);
    if (!admitted) return undefined;
    const { uid, keys } = admitted;

    const body = await readJsonBody(req, res);
    if (!body) return undefined;
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : '';
    const signature = typeof body.signature === 'string' ? body.signature.trim() : '';
    if (!ID_PATTERN.test(orderId) || !ID_PATTERN.test(paymentId) || !HEX_PATTERN.test(signature)) {
      return reject(res, 'verify', 'malformed', { orderId, paymentId });
    }

    // 1. The checkout signature — timing-safe.
    if (!isCheckoutSignatureValid({ orderId, paymentId, signature, keySecret: keys.keySecret })) {
      return reject(res, 'verify', 'bad_signature', { orderId, paymentId });
    }

    // 2. The stored order, and whose it is.
    let order;
    try {
      const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId).get();
      order = snap && snap.exists ? snap.data() || {} : null;
    } catch (e) {
      emit('payments.verify.store_read_failed');
      console.error('[pay/verify] order read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not read the order.' });
    }
    if (!order) return reject(res, 'verify', 'unknown_order', { orderId, paymentId });
    if (order.uid !== uid) return reject(res, 'verify', 'uid_mismatch', { orderId, paymentId, status: order.status });
    if (!Number.isInteger(order.amountPaise) || order.amountPaise <= 0) return reject(res, 'verify', 'bad_order', { orderId, paymentId, status: order.status });

    // 3. What Razorpay says was actually paid.
    let result;
    try {
      result = await fetchCapturedPayment(keys, paymentId, order.amountPaise, order);
    } catch (e) {
      emit('payments.verify.razorpay_unreachable');
      console.error('[pay/verify] razorpay unreachable:', e && e.message);
      return sendJson(res, 502, { ok: false, error: 'Payment provider is unreachable.' });
    }
    if (result.error === 'order_expired') return reject(res, 'verify', 'order_expired', { orderId, paymentId, status: order.status });
    if (result.error === 'order_already_paid') {
      emit('payments.verify.late_auth_not_captured');
      return reject(res, 'verify', 'order_already_paid', { orderId, paymentId, status: order.status });
    }
    if (result.error) {
      emit(`payments.verify.${result.error}`);
      return sendJson(res, 502, { ok: false, error: 'Payment provider did not confirm the payment.' });
    }
    const payment = result.payment;
    if (payment.id !== undefined && payment.id !== paymentId) return reject(res, 'verify', 'payment_mismatch', { orderId, paymentId, status: order.status });
    const mismatch = paymentMismatch(payment, { orderId, amountPaise: order.amountPaise });
    if (mismatch) return reject(res, 'verify', mismatch, { ...{ orderId, paymentId, status: order.status }, expected: order.amountPaise, got: payment.amount });

    // 4. Grant — idempotent, with the order's created -> paid in the same transaction.
    const answered = await grantAndRespond(res, 'verify', { uid: order.uid, passType: order.passType, paymentId, orderId });
    sendReceipt(orderId, paymentId, payment, order.passType);
    return answered;
  }

  /**
   * `extra` (status only): `{ body, counter }` — fields appended AFTER the verify/webhook
   * response fields, and a counter emitted only on a successful grant. Absent, the
   * response is exactly what verify and webhook have always sent.
   *
   * ★★ TOPUP-1. A top-up order NEVER reaches grantPass (it must not extend Premium), and a pass
   * order never reaches grantTopup: the branch is on the STORED order's passType, which only
   * handleOrder wrote. Verify, webhook and status all arrive here after the SAME Z4 checks.
   */
  async function grantAndRespond(res, scope, { uid, passType, paymentId, orderId, orderStatus }, extra) {
    const refusedCtx = (e) => ({ event: scope === 'webhook' ? 'payment.captured' : undefined, orderId, paymentId, status: orderStatus, error: e && e.message });
    if (isPackProduct(passType)) {
      // PACKS-SERVER-1: a paid pack is always granted, even if PACKS_ENABLED was switched off after the order
      // was made. It NEVER reaches grantPass / grantTopup (no passEnd, no Premium, no credit). The sku, target
      // and price are re-read from the STORED order inside the grant transaction.
      try {
        const granted = await grantPack({ db: adminFirestore, uid, order: { orderId }, paymentRef: paymentId, nowMs: now() });
        emit(granted.replayed ? `payments.${scope}.pack_replayed` : `payments.${scope}.pack_granted`);
        if (granted.duplicate) emit(`payments.${scope}.pack_duplicate_payment`);
        if (extra && extra.counter) emit(extra.counter);
        const body = { ok: true, kind: 'pack', packId: granted.pack.packId, sku: granted.pack.sku, target: granted.pack.target, replayed: granted.replayed };
        return sendJson(res, 200, extra && extra.body ? { ...body, ...extra.body } : body);
      } catch (e) {
        if (e instanceof PackGrantInputError) return reject(res, scope, 'grant_refused', refusedCtx(e));
        emit(`payments.${scope}.grant_failed`);
        console.error(`[pay/${scope}] pack grant failed:`, e && e.message);
        return sendJson(res, 500, { ok: false, error: 'Pack grant failed' });
      }
    }
    if (isTopupProduct(passType)) {
      // A paid top-up is always credited, even if TOPUP_ENABLED was switched off after the order was made.
      try {
        const granted = await grantTopup(
          { uid, productKey: passType, paymentRef: paymentId, orderId, nowMs: now(), ...(topupBonus ? { bonus: topupBonus } : {}) },
          { firestore: adminFirestore },
        );
        emit(granted.replayed ? `payments.${scope}.topup_replayed` : `payments.${scope}.topup_granted`);
        if (extra && extra.counter) emit(extra.counter);
        const body = { ok: true, replayed: granted.replayed, topup: true };
        return sendJson(res, 200, extra && extra.body ? { ...body, ...extra.body } : body);
      } catch (e) {
        if (e instanceof TopupInputError) return reject(res, scope, 'grant_refused', refusedCtx(e));
        emit(`payments.${scope}.grant_failed`);
        console.error(`[pay/${scope}] top-up grant failed:`, e && e.message);
        return sendJson(res, 500, { ok: false, error: 'Top-up grant failed' });
      }
    }
    try {
      const granted = await grantPass(
        { uid, passType, paymentRef: paymentId, now: now() },
        { firestore: adminFirestore, payOrderId: orderId, foundingOfferOpen },
      );
      emit(granted.replayed ? `payments.${scope}.replayed` : `payments.${scope}.granted`);
      if (granted.packCredit) {
        emit(`payments.${scope}.pack_credit_marked`);
        if (granted.packCredit.conflict) emit(`payments.${scope}.pack_credit_conflict`);
      }
      // TS-UPGRADE-CREDIT-1: the Test Series entitlement this Board Pass was credited with was marked in the grant transaction.
      if (granted.tsUpgradeCredit) {
        emit(`payments.${scope}.ts_upgrade_credit_marked`);
        if (granted.tsUpgradeCredit.conflict) emit(`payments.${scope}.ts_upgrade_credit_conflict`);
      }
      if (extra && extra.counter) emit(extra.counter);
      const body = {
        ok: true,
        replayed: granted.replayed,
        passEnd: granted.pass.passEnd,
        pass: granted.pass,
      };
      return sendJson(res, 200, extra && extra.body ? { ...body, ...extra.body } : body);
    } catch (e) {
      if (e instanceof PassGrantInputError) return reject(res, scope, 'grant_refused', refusedCtx(e));
      emit(`payments.${scope}.grant_failed`);
      console.error(`[pay/${scope}] grant failed:`, e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Pass grant failed' });
    }
  }

  /**
   * PAY-RESCUE-1 - Razorpay's SIGNED `payment.failed` (the caller already verified the signature).
   * Writes ONLY an additive `lastFailure` note onto a `payOrders/{orderId}` we created and that is still `created`:
   * `{ code, reason, source, step, atMs }` - Razorpay's own short error strings (capped, no card / UPI / contact).
   * It never grants, never touches status / paid fields / amount, and never runs for a paid, erased or unknown order.
   */
  async function handlePaymentFailed(event, res) {
    const entity = event.payload && event.payload.payment && event.payload.payment.entity;
    const orderId = entity && typeof entity.order_id === 'string' ? entity.order_id : '';
    // A failed payment with no usable order id (another product on the account) is acknowledged, never a 4xx:
    // Razorpay retries 4xx responses.
    if (!ID_PATTERN.test(orderId) || !ID_PATTERN.test(entity && typeof entity.id === 'string' ? entity.id : '')) {
      emit('payments.webhook.failed_malformed');
      return sendJson(res, 200, { ok: true, ignored: true });
    }
    const lastFailure = {
      code: cleanFailureText(entity.error_code),
      reason: cleanFailureText(entity.error_reason),
      source: cleanFailureText(entity.error_source),
      step: cleanFailureText(entity.error_step),
      atMs: now(),
    };
    let wrote = false;
    try {
      const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
      await adminFirestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const order = snap && snap.exists ? snap.data() || {} : null;
        if (!order || order.status !== 'created' || order.uid === ERASED_UID || typeof order.uid !== 'string' || !order.uid) return;
        tx.set(ref, { lastFailure }, { merge: true });
        wrote = true;
      });
    } catch (e) {
      emit('payments.webhook.store_write_failed');
      console.error('[pay/webhook] failure note write failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not record the failure.' });
    }
    emit(wrote ? 'payments.webhook.failure_recorded' : 'payments.webhook.ignored');
    return sendJson(res, 200, wrote ? { ok: true } : { ok: true, ignored: true });
  }

  /* ── Z5 · POST /api/pay/webhook ─────────────────────────────────────────── */
  async function handleWebhook(req, res) {
    if (!enabled()) return sendJson(res, 404, NOT_FOUND_BODY);
    const { webhookSecret } = readKeys(env);
    if (!webhookSecret || !adminFirestore) {
      emit('payments.unavailable');
      return sendJson(res, 503, { ok: false, error: 'Payments are unavailable right now.' });
    }

    let rawBody;
    try {
      rawBody = await readRawBody(req, MAX_WEBHOOK_BYTES);
    } catch (e) {
      emit('payments.webhook.rejected.body');
      return sendJson(res, e && e.code === 'BODY_TOO_LARGE' ? 413 : 400, { ok: false, error: 'Invalid body' });
    }

    const signature = String(req.headers['x-razorpay-signature'] || '').trim();
    const sigMatch = matchWebhookSignature({ rawBody, signature, webhookSecret, variantsDisabled: areWebhookVariantsDisabled(env) });
    if (!sigMatch) {
      return reject(res, 'webhook', 'bad_signature', webhookBadSigContext(req, rawBody, signature));
    }
    if (sigMatch !== 'raw') {
      // WEBHOOK-SIG-1: valid over an escaped / re-encoded copy. Ids only - never the body, the secret or a contact.
      emit(`payments.webhook.sig_variant.${sigMatch}`);
      try {
        const c = webhookBadSigContext(req, rawBody, signature) || {};
        console.warn(`[pay/webhook] sig variant=${sigMatch} event=${c.event || '-'} order=${c.orderId || '-'} pay=${c.paymentId || '-'}`);
      } catch {
        /* a log line must never fail a payment */
      }
    }

    let event;
    try {
      event = parseJsonObject(rawBody);
    } catch {
      return reject(res, 'webhook', 'malformed');
    }
    const evName = event && typeof event.event === 'string' ? event.event : undefined;
    // PAY-RESCUE-1 - a FAILED attempt only leaves a note on our own order (never a grant, never a status change).
    if (event.event === 'payment.failed') return handlePaymentFailed(event, res);
    if (event.event !== 'payment.captured') {
      emit('payments.webhook.ignored');
      return sendJson(res, 200, { ok: true, ignored: true });
    }

    const entity = event.payload && event.payload.payment && event.payload.payment.entity;
    const paymentId = entity && typeof entity.id === 'string' ? entity.id : '';
    const orderId = entity && typeof entity.order_id === 'string' ? entity.order_id : '';
    if (!ID_PATTERN.test(paymentId) || !ID_PATTERN.test(orderId)) return reject(res, 'webhook', 'malformed', { event: evName, orderId, paymentId });

    let order;
    try {
      const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId).get();
      order = snap && snap.exists ? snap.data() || {} : null;
    } catch (e) {
      emit('payments.webhook.store_read_failed');
      console.error('[pay/webhook] order read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not read the order.' });
    }
    // Not one of ours (another product on the account, or a deleted test order):
    // acknowledge so Razorpay stops retrying, and count it.
    if (!order) {
      emit('payments.webhook.unknown_order');
      return sendJson(res, 200, { ok: true, ignored: true });
    }
    // PAY-PHONE-1 - a guest order has no uid yet: the SAME Z4 checks, then `created -> paid_unclaimed` only. The grant
    // happens at claim time (routes/guestPay.cjs), for the account whose VERIFIED token carries the order's phone.
    if (order.payer === GUEST_PAYER) return handleGuestCaptured(res, { entity, order, orderId, paymentId });
    // The account was erased (Z7 anonymises its orders): there is no one to grant to.
    if (order.uid === ERASED_UID || typeof order.uid !== 'string' || !order.uid) {
      emit('payments.webhook.erased_order');
      return sendJson(res, 200, { ok: true, ignored: true });
    }

    // orderId was read from this entity, so order_mismatch cannot fire here; the shared
    // checks then run currency -> amount -> captured, as the webhook always has.
    const mismatch = paymentMismatch(entity, { orderId, amountPaise: order.amountPaise });
    if (mismatch) return reject(res, 'webhook', mismatch, { event: 'payment.captured', orderId, paymentId, status: order.status, expected: order.amountPaise, got: entity && entity.amount });

    const answered = await grantAndRespond(res, 'webhook', { uid: order.uid, passType: order.passType, paymentId, orderId, orderStatus: order.status });
    sendReceipt(orderId, paymentId, entity, order.passType);
    return answered;
  }

  /** PAY-PHONE-1 - the webhook's guest branch: every Z4 check, then the order is recorded paid_unclaimed (no grant). */
  async function handleGuestCaptured(res, { entity, order, orderId, paymentId }) {
    const mismatch = paymentMismatch(entity, { orderId, amountPaise: order.amountPaise });
    if (mismatch) return reject(res, 'webhook', mismatch, { event: 'payment.captured', orderId, paymentId, status: order.status, expected: order.amountPaise, got: entity && entity.amount });
    try {
      const marked = await markGuestOrderPaid(adminFirestore, { orderId, paymentId, nowMs: now() });
      emit(marked.changed ? 'payments.webhook.guest_paid_unclaimed' : 'payments.webhook.guest_replayed');
      if (marked.reason === 'other_payment') emit('payments.webhook.guest_duplicate_payment');
      else sendReceipt(orderId, paymentId, entity, order.passType);
      const answered = sendJson(res, 200, { ok: true, guest: true, status: marked.status || null });
      // CHECKOUT-WHO-2: a recipient order paid with no verify (closed tab) gets the same delivery + email as verify, AFTER
      // the answer. Only for THIS payment (never the duplicate one) and only for a checkoutWho order.
      if (order.checkoutWho === true && marked.reason !== 'other_payment' && typeof afterGuestPaid === 'function') {
        try {
          await afterGuestPaid({ orderId, paymentId });
        } catch (e) {
          emit('payments.webhook.guest_deliver_failed');
          console.error('[pay/webhook] recipient delivery failed:', e && e.message);
        }
      }
      return answered;
    } catch (e) {
      emit('payments.webhook.store_write_failed');
      console.error('[pay/webhook] guest order write failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not record the payment.' });
    }
  }

  /**
   * The first of Razorpay's payments for this order that passes EVERY Z4 check —
   * capturing an authorized one for the STORED amount first (P4). Returns
   * { payment } | { none: true } | { upstream: reason }. Throws if Razorpay is unreachable.
   */
  async function findConfirmedPayment(keys, orderId, amountPaise, order) {
    const listed = await razorpay(keys, 'GET', `/orders/${orderId}/payments`);
    if (!listed.ok || !listed.json || !Array.isArray(listed.json.items)) return { upstream: 'list_failed' };
    let sawExpired = false;
    for (const item of listed.json.items) {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !ID_PATTERN.test(item.id)) continue;
      // Never capture a payment that is not this order's, in INR, for the stored amount.
      if (paymentIdentityMismatch(item, { orderId, amountPaise })) continue;
      let payment = item;
      if (item.status === 'authorized') {
        const result = await fetchCapturedPayment(keys, item.id, amountPaise, order);
        // A stale authorized item must not hide a captured one later on the order: keep looking.
        if (result.error === 'order_expired') { sawExpired = true; continue; }
        // MONEY-DUPGUARD-1 (F3): a second authorisation on an order already paid by another payment is never captured.
        if (result.error === 'order_already_paid') { emit('payments.status.late_auth_not_captured'); continue; }
        if (result.error) return { upstream: result.error };
        payment = result.payment;
        if (payment.id !== undefined && payment.id !== item.id) continue;
      } else if (item.status !== 'captured') {
        continue;
      }
      if (!paymentMismatch(payment, { orderId, amountPaise })) return { payment: { ...payment, id: item.id } };
    }
    return sawExpired ? { expired: true } : { none: true };
  }

  /* ── PAY-STATUS-1 · POST /api/pay/status ────────────────────────────────── */
  async function handleStatus(req, res) {
    if (!enabled()) return sendJson(res, 404, NOT_FOUND_BODY);
    const admitted = await admitBrowserCall(req, res, PAY_STATUS_PATH);
    if (!admitted) return undefined;
    const { uid, keys } = admitted;

    const body = await readJsonBody(req, res);
    if (!body) return undefined;
    // PRICE-FIXED-1 - `{ offer: true }` (no order id) asks what THIS student should be SHOWN: `monthPassAvailable`
    // is true only for an account with a prior PAID month order (derived here, from the server's own records), on
    // every date - the month price is hidden from everyone else from the moment this ships (owner, 31 Oct 2026).
    // The ORDER gate is separate and stays at 2026-11-01T00:00:00+05:30. Nothing is written or granted.
    if (body.offer === true && body.orderId === undefined) {
      try {
        const snap = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
        const stored = snap && snap.exists ? snap.data() || {} : {};
        const monthPassAvailable = await hasPaidMonthOrder(adminFirestore, uid);
        return sendJson(res, 200, { ok: true, state: 'offer', monthPassAvailable });
      } catch (e) {
        emit('payments.status.offer_read_failed');
        console.error('[pay/status] offer read failed:', e && e.message);
        return sendJson(res, 500, { ok: false, error: 'Could not read the offer.' });
      }
    }
    // Only the order id is read from the request — never an amount, a payment or a status.
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    if (!ID_PATTERN.test(orderId)) return reject(res, 'status', 'malformed', { orderId });

    let order;
    try {
      const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId).get();
      order = snap && snap.exists ? snap.data() || {} : null;
    } catch (e) {
      emit('payments.status.store_read_failed');
      console.error('[pay/status] order read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not read the order.' });
    }
    if (!order) {
      emit('payments.status.rejected.unknown_order');
      return sendJson(res, 404, { ok: false, error: 'payment_rejected', reason: 'unknown_order' });
    }
    if (order.uid !== uid) return reject(res, 'status', 'uid_mismatch', { orderId, status: order && order.status });
    if (!Number.isInteger(order.amountPaise) || order.amountPaise <= 0) return reject(res, 'status', 'bad_order', { orderId, status: order && order.status });
    const amountInr = order.amountPaise / 100;

    // 1. Already paid (verify, webhook or an earlier status call): report it, write nothing.
    if (order.status === 'paid') {
      // PACKS-SERVER-1: a paid pack order reports the pack, never a pass (no passEnd).
      if (isPackProduct(order.passType)) {
        emit('payments.status.paid');
        return sendJson(res, 200, {
          ok: true,
          state: 'paid',
          kind: 'pack',
          packId: packIdFor(order.passType, order.packTarget),
          sku: order.passType,
          target: validateTarget(order.passType, order.packTarget),
          paymentId: typeof order.paymentId === 'string' ? order.paymentId : null,
          amountInr,
        });
      }
      // TOPUP-1: a paid top-up order has no pass to report (a top-up never extends Premium).
      if (isTopupProduct(order.passType)) {
        emit('payments.status.paid');
        return sendJson(res, 200, {
          ok: true,
          state: 'paid',
          topup: true,
          paymentId: typeof order.paymentId === 'string' ? order.paymentId : null,
          amountInr,
        });
      }
      let pass;
      try {
        const snap = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
        pass = describePass(uid, snap && snap.exists ? snap.data() || {} : {});
      } catch (e) {
        emit('payments.status.store_read_failed');
        console.error('[pay/status] subscription read failed:', e && e.message);
        return sendJson(res, 500, { ok: false, error: 'Could not read the pass.' });
      }
      emit('payments.status.paid');
      return sendJson(res, 200, {
        ok: true,
        state: 'paid',
        passEnd: pass.passEnd,
        paymentId: typeof order.paymentId === 'string' ? order.paymentId : null,
        amountInr,
      });
    }
    if (order.status !== 'created') return reject(res, 'status', 'bad_order', { orderId, status: order && order.status });

    // 2. Created: ask Razorpay what was actually paid against this order.
    let found;
    try {
      found = await findConfirmedPayment(keys, orderId, order.amountPaise, order);
    } catch (e) {
      emit('payments.status.razorpay_unreachable');
      emit('payments.status.unknown');
      console.error('[pay/status] razorpay unreachable:', e && e.message);
      return sendJson(res, 200, { ok: true, state: 'unknown' });
    }
    if (found.expired) return reject(res, 'status', 'order_expired', { orderId, status: order && order.status });
    if (found.upstream) {
      emit(`payments.status.${found.upstream}`);
      emit('payments.status.unknown');
      return sendJson(res, 200, { ok: true, state: 'unknown' });
    }
    if (!found.payment) {
      emit('payments.status.pending');
      return sendJson(res, 200, { ok: true, state: 'pending' });
    }

    // 3. A Razorpay-confirmed captured payment for this order: the SAME idempotent grant.
    const paymentId = found.payment.id;
    const reconciled = await grantAndRespond(
      res,
      'status',
      { uid: order.uid, passType: order.passType, paymentId, orderId },
      { body: { state: 'paid', paymentId, amountInr }, counter: 'payments.status.reconciled' },
    );
    sendReceipt(orderId, paymentId, found.payment, order.passType);
    return reconciled;
  }

  return { handleOrder, handleVerify, handleWebhook, handleStatus, isEnabled: enabled, isTopupEnabled: topupEnabled };
}

module.exports = {
  createPaymentRoutes,
  isPaymentsEnabled,
  isTopupEnabled,
  isCheckoutSignatureValid,
  isWebhookSignatureValid,
  matchWebhookSignature,
  areWebhookVariantsDisabled,
  timingSafeHexEqual,
  hmacSha256Hex,
  quotePass,
  tableQuote,
  gstOrderFields,
  gstResponseFields,
  readRawBody,
  paymentMismatch,
  PAY_ORDER_PATH,
  PAY_VERIFY_PATH,
  PAY_WEBHOOK_PATH,
  PAY_STATUS_PATH,
  PAY_ORDERS_COLLECTION,
  RAZORPAY_API_BASE,
};
