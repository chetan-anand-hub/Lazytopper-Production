'use strict';
/**
 * Guest pay — "Pay now with your phone number" (PAY-PHONE-1, owner 2 Nov 2026).
 *
 * ⚠ TOUCHES PAYMENT AND ACCESS — NEEDS COFOUNDER AUDIT. A signed-out visitor pays first with an Indian mobile number,
 * then signs in with that SAME number; the purchase attaches on sign-in. Pattern: parentPay.cjs (a payer who is not
 * signed in). Reuses payments.cjs's pure helpers, passGrant's grantPass and packGrant's grantPack — no second copy of a
 * price, a signature check or a grant.
 *
 *   POST /api/pay/guest/order   { sku, target?, phone }              no auth        PAYMENTS_ENABLED + GUEST_PAY_ENABLED
 *   POST /api/pay/guest/verify  { orderId, paymentId, signature }    no auth        PAYMENTS_ENABLED + GUEST_PAY_ENABLED
 *   POST /api/pay/guest/claim   {}                                   AUTH REQUIRED  PAYMENTS_ENABLED
 *
 * ★★ DARK BY DEFAULT. order/verify answer the gateway's own 404 unless BOTH switches are on, before anything is read.
 *    claim needs only PAYMENTS_ENABLED, ON PURPOSE: a guest who has already paid must still be able to claim if
 *    GUEST_PAY_ENABLED is later switched off (the same rule as a paid pack after PACKS_ENABLED goes off). With no guest
 *    order in the store it claims nothing.
 *
 * ★★ NOTHING THAT DECIDES MONEY COMES FROM THE REQUEST. The request names a SKU (and its target) from the existing
 *    whitelist; the amount is the server's: a pack is `PACK_PRODUCTS[sku].priceInr`, the Board Pass is `quotePass` over
 *    an EMPTY subscription — exactly what a brand-new account is charged (founding price while the offer is open). The
 *    month pass (retired for new accounts) and top-ups (Premium only) are not sold to a guest.
 *
 * ★★ A PAYMENT IS BELIEVED ONLY WHEN EVERY CHECK AGREES — the same checks as payments.cjs handleVerify: timing-safe
 *    checkout signature; the stored order (which must be `payer: "guest"`); Razorpay's own record of the payment (this
 *    order, INR, the stored amount, captured). Then the order goes `created -> paid_unclaimed` and NOTHING IS GRANTED:
 *    there is no uid yet. The webhook does the same for a guest order whose verify never arrived (payments.cjs).
 *
 * ★★ THE PHONE THAT CLAIMS COMES ONLY FROM THE VERIFIED FIREBASE ID TOKEN (`phone_number`, which Firebase sets only
 *    after SMS verification). The claim body is never read. Each matching order is moved `paid_unclaimed -> claimed`
 *    with the caller's uid in ONE transaction that re-reads it (so two accounts can never both take it), then the
 *    EXISTING grant runs — grantPass with payOrderId (Board Pass) or grantPack (packs) — which refuses an order whose
 *    uid is not the uid granted and flips it `claimed -> paid` in its own transaction. Idempotent end to end: a second
 *    claim finds nothing; a claim interrupted between the two steps is finished by the next claim of the SAME uid.
 *
 * ★★ CHECKOUT-WHO-1 (owner 3 Nov 2026) - "Who will use it?", DARK behind CHECKOUT_WHO_ENABLED (+ PAYMENTS_ENABLED). With the
 *    switch on, an order may carry `recipient: { phone?, email?, first? }` (at least one, normalised and validated HERE)
 *    instead of `phone`, from a signed-out payer or a signed-in payer buying for someone else. Same SKU whitelist, same
 *    server amount, same verify, same claim, same grants. After a VERIFIED payment, the response is sent FIRST (identical
 *    whether or not an account exists - no enumeration), then: a Firebase account that already uses the recipient's
 *    phone or email (Admin SDK lookup) gets the purchase at once through the SAME take + grant as a claim; phone and
 *    email on two DIFFERENT accounts -> the FIRST-entered identifier's account, plus an admin note (never a merge); no
 *    account -> the order waits `paid_unclaimed`. A claim takes orders whose recipient matches the token's verified
 *    `phone_number`, or its `email` ONLY when `email_verified` is true. A recipient account already covered (Board Pass
 *    till the boards / the pack already owned) is refused at the order with the SAME generic 409 `payment_unavailable` as
 *    "already paid, not yet claimed" (CHECKOUT-WHO-2), after the SAME coverage read whether or not an account was found.
 *    Switch off: an order body's `recipient` is ignored and every route answers exactly as before.
 *
 * ★★ PAY-ACCOUNT-1 (owner 4 Nov 2026) - "pay first, the account is made for them", DARK behind PAY_AUTO_ACCOUNT_ENABLED
 *    (on top of CHECKOUT_WHO). After a VERIFIED recipient payment for which NO account exists, the server creates the
 *    Firebase account (Admin SDK createUser, the FIRST-entered phone or email only; an email unverified) under a uid DERIVED from the order
 *    id (`pay-<hash>`: the client SDK never makes a uid with a hyphen, so `pay-` marks an account made here, and verify +
 *    webhook racing on the same order create ONE user - the loser gets uid-already-exists and uses it), then grants through
 *    the SAME take + grant. Existing rules stand. Owner addendum A (security): when ONE identifier already has an account
 *    and the other is new, the purchase goes to the EXISTING account and the other identifier is NEVER added to it, and no
 *    second account is made for it (admin note `second_identifier_not_linked`; the student can link it later through the
 *    verified "also sign in with" step) - else paying ₹49 with a victim's email and your own phone would hand you their
 *    account. Creation failure -> the order stays `paid_unclaimed` (today's claim still rescues it), admin note
 *    `account_not_created`. A NEW account carries ONLY the first-entered identifier (review HIGH 1). Nothing is written to
 *    Firestore for it at payment (sign-up writes no users doc either); its trial starts at its FIRST SIGN-IN (its
 *    sign-up), inside the claim's transaction, and the claim reports `firstSignIn` ONCE. Switch off: not one byte runs.
 *
 * ★ PRIVACY. The phone number is stored on the order (it is the claim key) and goes to Razorpay's checkout as the
 *    read-only contact. It is never in a URL, a Razorpay order note, a telemetry name or an analytics event; responses
 *    carry it MASKED (`+91 98•••••948`). The per-phone limiter keys on its SHA-256, not the number.
 */

const crypto = require('node:crypto');
const {
  isPaymentsEnabled,
  isCheckoutSignatureValid,
  quotePass,
  tableQuote,
  gstOrderFields,
  gstResponseFields,
  readRawBody,
  paymentMismatch,
  PAY_ORDERS_COLLECTION,
  RAZORPAY_API_BASE,
} = require('./payments.cjs');
const { grantPass, isStaleFoundingOrder, PassGrantInputError, PAYMENT_SEGMENTS } = require('../services/passGrant.cjs');
const { grantPack, PackGrantInputError } = require('../services/packGrant.cjs');
const { PACK_PRODUCTS, isPackProduct, packsEnabled, validateTarget, packIdFor } = require('../services/packProducts.cjs');
const { createRateLimiter, ANONYMOUS_CLASS } = require('../services/rateLimiter.cjs');
// Review fix 5: "already covered till the boards" is the parent-pay rule, reused.
const { coveredTillBoards } = require('./parentPay.cjs');
const {
  GUEST_PAYER,
  GUEST_STATUS,
  isGuestPayFlagOn,
  isCheckoutWhoFlagOn,
  isPayAutoAccountFlagOn,
  normaliseEmail,
  maskEmail,
  normaliseIndianMobile,
  maskIndianMobile,
  markGuestOrderPaid,
} = require('../services/guestPay.cjs');
const { ENTITLEMENTS_COLLECTION, PACK_SEGMENTS } = require('../services/packGrant.cjs');

const GUEST_ORDER_PATH = '/api/pay/guest/order';
const GUEST_VERIFY_PATH = '/api/pay/guest/verify';
const GUEST_CLAIM_PATH = '/api/pay/guest/claim';

/** The one pass a guest can buy: what a new account is sold (PRICE-FIXED-1 retired the month pass for them). */
const GUEST_PASS_SKU = 'till_boards';

/** Guest order + verify calls per client (IP) per IST day, together. Same limiter, same keying as parentPay. */
const MAX_GUEST_CALLS_PER_CLIENT_PER_DAY = 120;
/** Orders one phone number may start per IST day (a few UPI retries, never a flood of orders against one number). */
const MAX_GUEST_ORDERS_PER_PHONE_PER_DAY = 10;
/** Claims one verified uid may make per IST day (one per sign-in is the normal case). */
const MAX_CLAIMS_PER_UID_PER_DAY = 30;
/** Orders read per claim: far more than any honest buyer has, and a bound on the work one claim can cause. */
const MAX_ORDERS_PER_CLAIM = 50;
/** Grant attempts per claimed order before it is left for the owner (admin "claimed, grant failed"). */
const MAX_CLAIM_ATTEMPTS = 5;

const GUEST_PHONE_CLASS = 'guestPayPhone';
/** Review fix 5: paid again for something the account already has; an admin information label only (owner ruling 2 Nov 2026). */
const DUPLICATE_PURCHASE = 'duplicate_purchase';
const GUEST_CLAIM_CLASS = 'guestPayClaim';

const RAZORPAY_TIMEOUT_MS = 15000;
const CURRENCY = 'INR';
const MAX_JSON_BYTES = 16 * 1024;
const ID_PATTERN = /^[A-Za-z0-9_]{1,64}$/;
const HEX_PATTERN = /^[a-fA-F0-9]{1,256}$/;
const NOT_FOUND_BODY = Object.freeze({ error: 'Not Found' });
const ERASED_UID = 'erased';
/**
 * CHECKOUT-WHO-2 - the account id whose coverage is read when NO account was found for a recipient, so an order for nobody
 * does the same reads as an order for an existing account (timing must not reveal whether an account exists). Never a real
 * Firebase uid (those are 28 chars of [A-Za-z0-9]); nothing is ever written under it.
 */
// HOTFIX 4 Nov: Firestore REJECTS document ids matching __.*__ ("reserved") - the old '__checkout_who_no_account__' made
// every order for a recipient with NO account fail (500). Plain id; a real Firebase uid never contains '-no-account'.
const NO_ACCOUNT_COVERAGE_ID = 'checkout-who-no-account';

function isGuestPayEnabled(env = process.env) {
  return isPaymentsEnabled(env) && isGuestPayFlagOn(env);
}

/** CHECKOUT-WHO-1: BOTH PAYMENTS_ENABLED and CHECKOUT_WHO_ENABLED. */
function isCheckoutWhoEnabled(env = process.env) {
  return isPaymentsEnabled(env) && isCheckoutWhoFlagOn(env);
}

/** PAY-ACCOUNT-1: CHECKOUT-WHO (both its switches) AND PAY_AUTO_ACCOUNT_ENABLED. */
function isPayAutoAccountEnabled(env = process.env) {
  return isCheckoutWhoEnabled(env) && isPayAutoAccountFlagOn(env);
}

/** PAY-ACCOUNT-1 - the prefix of a uid this server created at payment. The client SDK's uids are [A-Za-z0-9] only. */
const AUTO_ACCOUNT_UID_PREFIX = 'pay-';
/** PAY-ACCOUNT-1 - the uid of the account created for a paid order: derived from the order id, so a race makes ONE user. */
function autoAccountUid(orderId) {
  return `${AUTO_ACCOUNT_UID_PREFIX}${crypto.createHash('sha256').update(`lazytopper-pay-account:${orderId}`).digest('hex').slice(0, 24)}`;
}
function isAutoAccountUid(uid) {
  return typeof uid === 'string' && /^pay-[0-9a-f]{24}$/.test(uid);
}
/** PAY-ACCOUNT-1 admin notes (shown on the admin Purchases rows). */
const SECOND_NOT_LINKED_NOTE = 'second_identifier_not_linked';
const ACCOUNT_NOT_CREATED_NOTE = 'account_not_created';
/** PAY-ACCOUNT-1 `claimedVia` for an order granted to an account made at payment. */
const VIA_ACCOUNT_CREATED = 'account_created';

/** CHECKOUT-WHO-1 payer types (admin view): who paid for an order that names a recipient. */
const PAYER_TYPE = Object.freeze({ signedOut: 'signed_out', signedInOther: 'signed_in_other' });
/** CHECKOUT-WHO-1 admin note: the recipient's phone and email are on two different accounts (the first-entered one got it). */
const TWO_ACCOUNTS_NOTE = 'phone_and_email_on_different_accounts';

/** CHECKOUT-WHO-1 - the per-email limiter key: a hash, as for a phone. */
function emailKey(email) {
  return `email:${crypto.createHash('sha256').update(String(email)).digest('hex').slice(0, 32)}`;
}

/**
 * CHECKOUT-WHO-1 - the order body's `recipient`, normalised. null when it is not an object, names nothing, or names
 * anything invalid (a typed-but-bad field is refused, never silently dropped). `first` is the identifier the payer typed
 * FIRST (it decides which account wins when phone and email are on two accounts); default: the only one given, else phone.
 */
function readRecipient(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const hasPhone = raw.phone !== undefined && raw.phone !== null && raw.phone !== '';
  const hasEmail = raw.email !== undefined && raw.email !== null && raw.email !== '';
  if (!hasPhone && !hasEmail) return null;
  const phone = hasPhone ? normaliseIndianMobile(raw.phone) : null;
  const email = hasEmail ? normaliseEmail(raw.email) : null;
  if ((hasPhone && !phone) || (hasEmail && !email)) return null;
  let first = phone ? 'phone' : 'email';
  if (phone && email && raw.first === 'email') first = 'email';
  return { phone, email, first };
}

/** What the payer typed, masked - the only echo of a recipient a response ever carries. */
function recipientMasked(order) {
  return {
    ...(typeof order.guestPhone === 'string' && order.guestPhone ? { phoneMasked: maskIndianMobile(order.guestPhone) } : {}),
    ...(typeof order.guestEmail === 'string' && order.guestEmail ? { emailMasked: maskEmail(order.guestEmail) } : {}),
  };
}

/** The per-phone limiter key: a hash, so the number itself never sits in the limiter's memory. */
function phoneKey(e164) {
  return `phone:${crypto.createHash('sha256').update(String(e164)).digest('hex').slice(0, 32)}`;
}

/** Three instances of the product's ONE limiter (rateLimiter.cjs): per client IP, per phone hash, per verified uid. */
function createGuestPayLimiters({ telemetry, now } = {}) {
  return {
    client: createRateLimiter({
      telemetry,
      now,
      paidEndpoints: { [GUEST_ORDER_PATH]: 'guestPay', [GUEST_VERIFY_PATH]: 'guestPay' },
      limits: {
        [ANONYMOUS_CLASS]: { soft: Math.ceil(MAX_GUEST_CALLS_PER_CLIENT_PER_DAY / 2), hard: MAX_GUEST_CALLS_PER_CLIENT_PER_DAY },
      },
    }),
    phone: createRateLimiter({
      now,
      paidEndpoints: { [GUEST_ORDER_PATH]: GUEST_PHONE_CLASS },
      limits: {
        [GUEST_PHONE_CLASS]: { soft: Math.ceil(MAX_GUEST_ORDERS_PER_PHONE_PER_DAY / 2), hard: MAX_GUEST_ORDERS_PER_PHONE_PER_DAY },
      },
    }),
    claim: createRateLimiter({
      telemetry,
      now,
      paidEndpoints: { [GUEST_CLAIM_PATH]: GUEST_CLAIM_CLASS },
      limits: { [GUEST_CLAIM_CLASS]: { soft: Math.ceil(MAX_CLAIMS_PER_UID_PER_DAY / 2), hard: MAX_CLAIMS_PER_UID_PER_DAY } },
    }),
  };
}

/** What the order is for, for a response: never the phone, never a uid. */
function describeOrder(order) {
  const sku = typeof order.passType === 'string' ? order.passType : '';
  const isPack = isPackProduct(sku);
  return {
    kind: isPack ? 'pack' : 'pass',
    sku,
    target: isPack ? validateTarget(sku, order.packTarget) : null,
    amountInr: Number.isInteger(order.amountPaise) ? order.amountPaise / 100 : null,
  };
}

function createGuestPayRoutes(deps = {}) {
  const {
    sendJson,
    verifiedCaller,
    adminFirestore,
    telemetry,
    env = process.env,
    fetchImpl = typeof fetch === 'function' ? fetch : null,
    now = () => Date.now(),
    foundingOfferOpen,
    receiptEmailer, // PAY-PHONE-1 (A): optional, fire and forget, idempotent per payment
    /**
     * Owner ruling 2 Nov 2026 (prevent duplicates): async (e164) => boolean - does ANY Firebase account already use this
     * number (firebase-admin getUserByPhoneNumber)? Throws when it cannot tell. Absent -> no check (tests / no admin).
     */
    accountExistsForPhone,
    /**
     * CHECKOUT-WHO-1: async (e164) => uid | null and async (email) => uid | null - the Firebase account that already uses
     * this phone / email (firebase-admin getUserByPhoneNumber / getUserByEmail). Throw when they cannot tell. Absent ->
     * no account is ever found (orders wait for a claim).
     */
    uidForPhone,
    uidForEmail,
    /**
     * PAY-ACCOUNT-1 (firebase-admin, wired in index.cjs): { createUser({ uid, phoneNumber?, email?, emailVerified }),
     * getUser(uid), getUserByPhone(e164), getUserByEmail(email) } - the lookups answer a record ({ uid }) or null, ANY
     * account (verified email or not); createUser throws firebase-admin's error (with `.code`). Absent -> nothing is created.
     */
    authAccounts,
  } = deps;
  const limiters = deps.limiters || createGuestPayLimiters({ telemetry, now });

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail a payment */
    }
  }

  function reject(res, scope, reason, status = 400) {
    emit(`payments.guest.${scope}.rejected.${reason}`);
    return sendJson(res, status, { ok: false, error: 'payment_rejected', reason });
  }

  function readKeys() {
    const clean = (v) => String(v || '').trim();
    return { keyId: clean(env.RAZORPAY_KEY_ID), keySecret: clean(env.RAZORPAY_KEY_SECRET) };
  }

  function unavailable(res) {
    emit('payments.guest.unavailable');
    return sendJson(res, 503, { ok: false, error: 'Payments are unavailable right now.' });
  }

  async function razorpay(keys, method, apiPath, body) {
    if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable');
    const init = {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
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

  /**
   * payments.cjs fetchCapturedPayment, for a guest order: Razorpay's record, captured for the STORED amount. A stale
   * founding order still merely authorized is refused BEFORE capture (PRICING-1): a guest is never yet a founder.
   */
  async function fetchCapturedPayment(keys, paymentId, amountPaise, order) {
    const fetched = await razorpay(keys, 'GET', `/payments/${paymentId}`);
    if (!fetched.ok || !fetched.json) return { error: 'payment_fetch_failed' };
    let payment = fetched.json;
    if (payment.status === 'authorized') {
      if (isStaleFoundingOrder(order, now())) return { error: 'order_expired' };
      const captured = await razorpay(keys, 'POST', `/payments/${paymentId}/capture`, { amount: amountPaise, currency: CURRENCY });
      if (captured.ok && captured.json) {
        payment = captured.json;
      } else {
        const again = await razorpay(keys, 'GET', `/payments/${paymentId}`);
        if (!again.ok || !again.json) return { error: 'payment_capture_failed' };
        payment = again.json;
      }
    }
    return { payment };
  }

  async function readJsonBody(req, res) {
    try {
      const buf = await readRawBody(req, MAX_JSON_BYTES);
      const parsed = JSON.parse(buf.length ? buf.toString('utf8') : '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      return parsed;
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
      return null;
    }
  }

  /** Dark check FIRST, then the per-client limiter (signed out by construction), then the store. */
  function admitGuestCall(req, res, scope, reqPath) {
    // CHECKOUT-WHO-1: either switch opens order / verify; with CHECKOUT_WHO off this is exactly the old check.
    if (!isGuestPayEnabled(env) && !isCheckoutWhoEnabled(env)) {
      sendJson(res, 404, NOT_FOUND_BODY);
      return false;
    }
    const verdict = limiters.client.check(req, reqPath, '', { signedOut: true });
    if (!verdict.allowed) {
      emit(`payments.guest.${scope}.rate_limited`);
      sendJson(res, 429, { ok: false, error: 'Too many attempts. Please try again tomorrow.' });
      return false;
    }
    if (!adminFirestore) {
      unavailable(res);
      return false;
    }
    return true;
  }

  /**
   * Guest orders for this phone IN ONE STATUS (review fix 2): one query per status, so unpaid orders (anyone can create
   * them for any number) can never bury a paid one under the read cap. Two EQUALITY filters only: Firestore serves that
   * by merging its automatic single-field indexes, so no composite index is needed.
   */
  async function ordersForPhone(phone, status) {
    return ordersFor('guestPhone', phone, status);
  }

  /** CHECKOUT-WHO-1: the same read keyed by the recipient email (`guestEmail`), or the phone (`guestPhone`). */
  async function ordersFor(field, value, status) {
    const snap = await adminFirestore
      .collection(PAY_ORDERS_COLLECTION)
      .where(field, '==', value)
      .where('status', '==', status)
      .limit(MAX_ORDERS_PER_CLAIM)
      .get();
    const docs = snap && Array.isArray(snap.docs) ? snap.docs : [];
    return docs.map((d) => ({ id: d.id, order: typeof d.data === 'function' ? d.data() || {} : {} })).filter((x) => x.order.payer === GUEST_PAYER);
  }

  /* ── POST /api/pay/guest/order ─────────────────────────────────────────────── */
  async function handleOrder(req, res) {
    if (!admitGuestCall(req, res, 'order', GUEST_ORDER_PATH)) return undefined;
    const keys = readKeys();
    if (!keys.keyId || !keys.keySecret) return unavailable(res);
    const body = await readJsonBody(req, res);
    if (!body) return undefined;

    // CHECKOUT-WHO-1: a `recipient` is read ONLY while its switch is on; off, the body is read exactly as before.
    if (isCheckoutWhoEnabled(env) && body.recipient !== undefined) return handleWhoOrder(req, res, keys, body);
    if (!isGuestPayEnabled(env)) return sendJson(res, 404, NOT_FOUND_BODY);

    const phone = normaliseIndianMobile(body.phone);
    if (!phone) return reject(res, 'order', 'invalid_phone');

    const sku = body.sku;
    const isPack = isPackProduct(sku) && packsEnabled(env);
    if (!isPack && sku !== GUEST_PASS_SKU) return reject(res, 'order', 'invalid_sku');
    let packTarget = null;
    if (isPack) {
      packTarget = validateTarget(sku, body.target);
      if (packTarget === null) return reject(res, 'order', 'invalid_target');
    }

    const phoneVerdict = limiters.phone.check(req, GUEST_ORDER_PATH, phoneKey(phone));
    if (!phoneVerdict.allowed) {
      emit('payments.guest.order.phone_rate_limited');
      return sendJson(res, 429, { ok: false, error: 'Too many attempts for this number today. Please try again tomorrow.' });
    }

    // Owner ruling 2 Nov 2026 - PREVENT duplicates: a number that already has a LazyTopper account signs in instead (the
    // signed-in path already refuses an owned pack and never offers a Board Pass to a holder). Checked after the same
    // per-IP and per-phone limits as the order. ONE answer for every existing account, whatever it does or does not
    // own: nothing about purchases is read or said. A lookup that cannot tell fails CLOSED (no order).
    if (typeof accountExistsForPhone === 'function') {
      let exists;
      try {
        exists = await accountExistsForPhone(phone);
      } catch (e) {
        emit('payments.guest.order.account_lookup_failed');
        console.error('[pay/guest/order] account lookup failed:', e && e.message);
        return sendJson(res, 500, { ok: false, error: 'Could not start the payment.' });
      }
      if (exists) {
        emit('payments.guest.order.account_exists');
        return sendJson(res, 409, { ok: false, error: 'account_exists' });
      }
    }

    // The amount is the SERVER's, never the body's.
    let quote;
    try {
      if (isPack) {
        quote = tableQuote(PACK_PRODUCTS[sku].priceInr, now());
      } else {
        quote = quotePass({}, GUEST_PASS_SKU, now(), { foundingOfferOpen });
      }
    } catch (e) {
      emit('payments.guest.order.quote_failed');
      console.error('[pay/guest/order] quote failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not price this.' });
    }

    // The same thing already paid for with this number and not yet claimed: never take the money twice. Read fails
    // CLOSED (no order) - we cannot promise the buyer is not paying twice without it.
    try {
      const wanted = isPack ? packIdFor(sku, packTarget) : GUEST_PASS_SKU;
      const existing = [...(await ordersForPhone(phone, GUEST_STATUS.paidUnclaimed)), ...(await ordersForPhone(phone, GUEST_STATUS.claimed))];
      const already = existing.some(({ order }) => {
        const id = isPackProduct(order.passType) ? packIdFor(order.passType, order.packTarget) : order.passType;
        return id === wanted;
      });
      if (already) {
        // Review fix 4: GENERIC - the answer must not tell a stranger that this number has a purchase. The guard stays.
        emit('payments.guest.order.already_paid_unclaimed');
        return sendJson(res, 409, { ok: false, error: 'payment_unavailable' });
      }
    } catch (e) {
      emit('payments.guest.order.existing_read_failed');
      console.error('[pay/guest/order] existing-order read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not start the payment.' });
    }

    let created;
    try {
      created = await razorpay(keys, 'POST', '/orders', {
        amount: quote.amountPaise,
        currency: CURRENCY,
        // No phone and no uid in the notes: the order id is the only link to our record.
        notes: { payer: GUEST_PAYER, passType: sku, ...(isPack ? { packTarget } : {}), ...(quote.offerKey ? { offerKey: quote.offerKey } : {}) },
      });
    } catch (e) {
      emit('payments.guest.order.razorpay_unreachable');
      console.error('[pay/guest/order] razorpay unreachable:', e && e.message);
      return sendJson(res, 502, { ok: false, error: 'Payment provider is unreachable.' });
    }
    const order = created.json || {};
    if (!created.ok || typeof order.id !== 'string' || !ID_PATTERN.test(order.id) || order.amount !== quote.amountPaise || order.currency !== CURRENCY) {
      emit('payments.guest.order.razorpay_refused');
      console.error('[pay/guest/order] razorpay refused the order, status', created.status);
      return sendJson(res, 502, { ok: false, error: 'Payment provider refused the order.' });
    }

    try {
      await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(order.id).set({
        uid: null,
        payer: GUEST_PAYER,
        guestPhone: phone,
        passType: sku,
        ...(isPack ? { packTarget } : {}),
        amountPaise: quote.amountPaise,
        ...gstOrderFields(quote),
        offerKey: quote.offerKey,
        status: GUEST_STATUS.created,
        createdAt: new Date(now()),
      });
    } catch (e) {
      emit('payments.guest.order.store_failed');
      console.error('[pay/guest/order] could not store the order:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not record the order.' });
    }

    emit('payments.guest.order.created');
    return sendJson(res, 200, {
      ok: true,
      orderId: order.id,
      keyId: keys.keyId,
      amountPaise: quote.amountPaise,
      ...gstResponseFields(quote, 0),
      // Review fix 6: never the number itself (the browser already has what it typed); only its masked form.
      phoneMasked: maskIndianMobile(phone),
    });
  }

  /**
   * CHECKOUT-WHO-1 - the account that would receive this order: the FIRST-entered identifier's account if it has one,
   * else the other's. `note` when phone and email are on two DIFFERENT accounts. Throws when a lookup cannot tell.
   */
  async function resolveRecipientAccount({ phone, email, first }) {
    const byPhone = phone && typeof uidForPhone === 'function' ? await uidForPhone(phone) : null;
    const byEmail = email && typeof uidForEmail === 'function' ? await uidForEmail(email) : null;
    const clean = (u) => (typeof u === 'string' && u && u !== ERASED_UID ? u : null);
    const p = clean(byPhone);
    const e = clean(byEmail);
    const primary = first === 'email' ? e : p;
    const secondary = first === 'email' ? p : e;
    const uid = primary || secondary || null;
    const note = p && e && p !== e ? { note: TWO_ACCOUNTS_NOTE, otherUid: uid === p ? e : p } : null;
    return { uid, note, byPhone: p, byEmail: e };
  }

  /** CHECKOUT-WHO-1 - does this account already have what is being bought (Board Pass to the boards / this pack)? */
  async function recipientCovered(uid, sku, packTarget) {
    if (isPackProduct(sku)) {
      const snap = await adminFirestore
        .collection(ENTITLEMENTS_COLLECTION)
        .doc(uid)
        .collection(PACK_SEGMENTS.packs)
        .doc(packIdFor(sku, packTarget))
        .get();
      return !!(snap && snap.exists);
    }
    const subSnap = await adminFirestore.collection('subscriptions').doc(uid).get();
    const stored = subSnap && subSnap.exists ? subSnap.data() || {} : {};
    return coveredTillBoards(stored, now());
  }

  /** CHECKOUT-WHO-1 - the payer, if signed in (a "someone else" purchase). Only a VERIFIED token counts; else signed out. */
  async function payerUidOf(req) {
    if (!req.headers || !req.headers.authorization) return '';
    try {
      const uid = verifiedCaller && typeof verifiedCaller.resolveVerifiedUid === 'function' ? await verifiedCaller.resolveVerifiedUid(req) : '';
      return typeof uid === 'string' && uid && uid !== ERASED_UID ? uid : '';
    } catch {
      return '';
    }
  }

  /* ── POST /api/pay/guest/order with `recipient` (CHECKOUT-WHO-1) ───────────── */
  async function handleWhoOrder(req, res, keys, body) {
    const recipient = readRecipient(body.recipient);
    if (!recipient) return reject(res, 'order', 'invalid_recipient');

    const sku = body.sku;
    const isPack = isPackProduct(sku) && packsEnabled(env);
    if (!isPack && sku !== GUEST_PASS_SKU) return reject(res, 'order', 'invalid_sku');
    let packTarget = null;
    if (isPack) {
      packTarget = validateTarget(sku, body.target);
      if (packTarget === null) return reject(res, 'order', 'invalid_target');
    }

    // The same per-identifier daily limit as a phone order, for each identifier named (keys are hashes).
    for (const key of [recipient.phone ? phoneKey(recipient.phone) : null, recipient.email ? emailKey(recipient.email) : null]) {
      if (!key) continue;
      const verdict = limiters.phone.check(req, GUEST_ORDER_PATH, key);
      if (!verdict.allowed) {
        emit('payments.guest.order.phone_rate_limited');
        return sendJson(res, 429, { ok: false, error: 'Too many attempts today. Please try again tomorrow.' });
      }
    }

    const payerUid = await payerUidOf(req);

    // An account already holding what is bought is not sold it again. ONE generic answer whatever the reason, and the
    // lookup runs for every order (so an order for nobody costs the same work). A lookup that cannot tell fails CLOSED.
    try {
      const target = await resolveRecipientAccount(recipient);
      // CHECKOUT-WHO-2: ALWAYS the coverage read (a fixed dummy id when no account), so timing does not tell.
      const covered = await recipientCovered(target.uid || NO_ACCOUNT_COVERAGE_ID, sku, packTarget);
      if (target.uid && covered) {
        emit('payments.guest.order.recipient_covered');
        // CHECKOUT-WHO-2: the SAME answer as "already paid, not yet claimed" below - nothing says an account exists.
        return sendJson(res, 409, { ok: false, error: 'payment_unavailable' });
      }
    } catch (e) {
      emit('payments.guest.order.account_lookup_failed');
      console.error('[pay/guest/order] recipient lookup failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not start the payment.' });
    }

    // The amount is the SERVER's, never the body's (a brand-new account's quote, as for a phone order).
    let quote;
    try {
      if (isPack) {
        quote = tableQuote(PACK_PRODUCTS[sku].priceInr, now());
      } else {
        quote = quotePass({}, GUEST_PASS_SKU, now(), { foundingOfferOpen });
      }
    } catch (e) {
      emit('payments.guest.order.quote_failed');
      console.error('[pay/guest/order] quote failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not price this.' });
    }

    // Never take the money twice for the same thing already paid for this recipient and not yet attached.
    try {
      const wanted = isPack ? packIdFor(sku, packTarget) : GUEST_PASS_SKU;
      const existing = [];
      for (const [field, value] of [['guestPhone', recipient.phone], ['guestEmail', recipient.email]]) {
        if (!value) continue;
        existing.push(...(await ordersFor(field, value, GUEST_STATUS.paidUnclaimed)), ...(await ordersFor(field, value, GUEST_STATUS.claimed)));
      }
      const already = existing.some(({ order }) => {
        const id = isPackProduct(order.passType) ? packIdFor(order.passType, order.packTarget) : order.passType;
        return id === wanted;
      });
      if (already) {
        emit('payments.guest.order.already_paid_unclaimed');
        return sendJson(res, 409, { ok: false, error: 'payment_unavailable' });
      }
    } catch (e) {
      emit('payments.guest.order.existing_read_failed');
      console.error('[pay/guest/order] existing-order read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not start the payment.' });
    }

    let created;
    try {
      created = await razorpay(keys, 'POST', '/orders', {
        amount: quote.amountPaise,
        currency: CURRENCY,
        // No phone, no email and no uid in the notes: the order id is the only link to our record.
        notes: { payer: GUEST_PAYER, passType: sku, ...(isPack ? { packTarget } : {}), ...(quote.offerKey ? { offerKey: quote.offerKey } : {}) },
      });
    } catch (e) {
      emit('payments.guest.order.razorpay_unreachable');
      console.error('[pay/guest/order] razorpay unreachable:', e && e.message);
      return sendJson(res, 502, { ok: false, error: 'Payment provider is unreachable.' });
    }
    const order = created.json || {};
    if (!created.ok || typeof order.id !== 'string' || !ID_PATTERN.test(order.id) || order.amount !== quote.amountPaise || order.currency !== CURRENCY) {
      emit('payments.guest.order.razorpay_refused');
      console.error('[pay/guest/order] razorpay refused the order, status', created.status);
      return sendJson(res, 502, { ok: false, error: 'Payment provider refused the order.' });
    }

    const stored = {
      uid: null,
      payer: GUEST_PAYER,
      ...(recipient.phone ? { guestPhone: recipient.phone } : {}),
      ...(recipient.email ? { guestEmail: recipient.email } : {}),
      recipientFirst: recipient.first,
      checkoutWho: true,
      payerType: payerUid ? PAYER_TYPE.signedInOther : PAYER_TYPE.signedOut,
      ...(payerUid ? { payerUid } : {}),
      passType: sku,
      ...(isPack ? { packTarget } : {}),
      amountPaise: quote.amountPaise,
      ...gstOrderFields(quote),
      offerKey: quote.offerKey,
      status: GUEST_STATUS.created,
      createdAt: new Date(now()),
    };
    try {
      await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(order.id).set(stored);
    } catch (e) {
      emit('payments.guest.order.store_failed');
      console.error('[pay/guest/order] could not store the order:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not record the order.' });
    }

    emit('payments.guest.order.created');
    return sendJson(res, 200, { ok: true, orderId: order.id, keyId: keys.keyId, amountPaise: quote.amountPaise, ...gstResponseFields(quote, 0), ...recipientMasked(stored) });
  }

  /* ── POST /api/pay/guest/verify — every check, then paid_unclaimed (no grant) ── */
  async function handleVerify(req, res) {
    if (!admitGuestCall(req, res, 'verify', GUEST_VERIFY_PATH)) return undefined;
    const keys = readKeys();
    if (!keys.keyId || !keys.keySecret) return unavailable(res);
    const body = await readJsonBody(req, res);
    if (!body) return undefined;
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : '';
    const signature = typeof body.signature === 'string' ? body.signature.trim() : '';
    if (!ID_PATTERN.test(orderId) || !ID_PATTERN.test(paymentId) || !HEX_PATTERN.test(signature)) {
      return reject(res, 'verify', 'malformed');
    }

    // 1. The checkout signature — timing-safe (payments.cjs).
    if (!isCheckoutSignatureValid({ orderId, paymentId, signature, keySecret: keys.keySecret })) {
      return reject(res, 'verify', 'bad_signature');
    }

    // 2. The stored order: a GUEST order.
    let order;
    try {
      const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId).get();
      order = snap && snap.exists ? snap.data() || {} : null;
    } catch (e) {
      emit('payments.guest.verify.store_read_failed');
      console.error('[pay/guest/verify] read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not read the order.' });
    }
    if (!order) return reject(res, 'verify', 'unknown_order');
    // CHECKOUT-WHO-1: a recipient order may name an email and no phone.
    const whoOrder = order && order.checkoutWho === true && typeof order.guestEmail === 'string';
    if (order.payer !== GUEST_PAYER || (typeof order.guestPhone !== 'string' && !whoOrder)) return reject(res, 'verify', 'not_guest');
    if (!Number.isInteger(order.amountPaise) || order.amountPaise <= 0) return reject(res, 'verify', 'bad_order');

    const done = () =>
      sendJson(res, 200, {
        ok: true,
        status: GUEST_STATUS.paidUnclaimed,
        ...describeOrder(order),
        phoneMasked: maskIndianMobile(order.guestPhone),
        // CHECKOUT-WHO-1: the masked email too. ONE answer whether or not an account exists (delivery runs AFTER it).
        ...(order.checkoutWho === true ? recipientMasked(order) : {}),
      });
    // CHECKOUT-WHO-1: after the response, a recipient who already has an account gets it now; an email recipient is told.
    const afterPaid = async () => {
      if (order.checkoutWho !== true) return;
      await afterRecipientPaid({ orderId, paymentId });
    };

    // Already recorded for THIS payment (a retry, or the webhook got there first): nothing to ask Razorpay.
    if (order.status !== GUEST_STATUS.created && order.paymentId === paymentId) {
      emit('payments.guest.verify.replayed');
      done();
      return afterPaid();
    }

    // 3. What Razorpay says was actually paid.
    let result;
    try {
      result = await fetchCapturedPayment(keys, paymentId, order.amountPaise, order);
    } catch (e) {
      emit('payments.guest.verify.razorpay_unreachable');
      console.error('[pay/guest/verify] razorpay unreachable:', e && e.message);
      return sendJson(res, 502, { ok: false, error: 'Payment provider is unreachable.' });
    }
    if (result.error === 'order_expired') return reject(res, 'verify', 'order_expired');
    if (result.error) {
      emit(`payments.guest.verify.${result.error}`);
      return sendJson(res, 502, { ok: false, error: 'Payment provider did not confirm the payment.' });
    }
    const payment = result.payment;
    if (payment.id !== undefined && payment.id !== paymentId) return reject(res, 'verify', 'payment_mismatch');
    const mismatch = paymentMismatch(payment, { orderId, amountPaise: order.amountPaise });
    if (mismatch) return reject(res, 'verify', mismatch);

    // 4. created -> paid_unclaimed (idempotent). NO grant: there is no uid until a verified sign-in claims it.
    try {
      const marked = await markGuestOrderPaid(adminFirestore, { orderId, paymentId, nowMs: now() });
      if (!marked.ok) return reject(res, 'verify', marked.reason || 'bad_order');
      emit(marked.changed ? 'payments.guest.verify.paid_unclaimed' : 'payments.guest.verify.replayed');
      if (marked.reason === 'other_payment') emit('payments.guest.verify.duplicate_payment');
      else if (receiptEmailer && typeof receiptEmailer.sendForPayment === 'function') {
        // The address Razorpay recorded on THIS payment; the emailer sends at most one receipt per payment.
        void receiptEmailer.sendForPayment({ orderId, paymentId, email: typeof payment.email === 'string' ? payment.email : '' });
      }
    } catch (e) {
      emit('payments.guest.verify.store_write_failed');
      console.error('[pay/guest/verify] could not record the payment:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not record the payment.' });
    }
    done();
    return afterPaid();
  }

  /**
   * CHECKOUT-WHO-2 - the ONE post-payment step for a recipient order, run by verify AND by the payment webhook (routes/
   * payments.cjs, via index.cjs): attach to an existing recipient account, then "Your … is ready" to the recipient email.
   * Idempotent: delivery acts only on a `paid_unclaimed` order; the email is at most once per payment. Never throws.
   */
  async function afterRecipientPaid({ orderId, paymentId } = {}) {
    if (typeof orderId !== 'string' || !orderId || typeof paymentId !== 'string' || !paymentId || !adminFirestore) return;
    try {
      const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId).get();
      const o = snap && snap.exists ? snap.data() || {} : null;
      if (!o || o.payer !== GUEST_PAYER || o.checkoutWho !== true || o.paymentId !== paymentId) return;
    } catch (e) {
      emit('payments.guest.deliver.failed');
      console.error('[pay/guest/deliver] could not read the order:', e && e.message);
      return;
    }
    await deliverToExistingAccount(orderId);
    if (receiptEmailer && typeof receiptEmailer.sendRecipientReady === 'function') {
      await receiptEmailer.sendRecipientReady({ orderId, paymentId });
    }
  }

  /**
   * CHECKOUT-WHO-1 - a paid recipient order whose phone or email already belongs to a Firebase account is attached to
   * that account NOW, through the SAME take + grant as a claim. Two different accounts: the first-entered identifier's
   * account, and an admin note on the order (accounts are never merged). No account, or a lookup that cannot tell: the
   * order stays `paid_unclaimed` for the recipient's sign-in. Never throws.
   */
  async function deliverToExistingAccount(orderId) {
    try {
      const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId).get();
      const order = snap && snap.exists ? snap.data() || {} : null;
      if (!order || order.checkoutWho !== true || order.status !== GUEST_STATUS.paidUnclaimed) return;
      const target = await resolveRecipientAccount({
        phone: typeof order.guestPhone === 'string' ? order.guestPhone : null,
        email: typeof order.guestEmail === 'string' ? order.guestEmail : null,
        first: order.recipientFirst === 'email' ? 'email' : 'phone',
      });
      const auto = isPayAutoAccountEnabled(env) && !!authAccounts && typeof authAccounts.createUser === 'function';
      // PAY-ACCOUNT-1: nobody has this phone / email yet - the account is made now (switch off: the order waits). Review
      // MED 2: the account found may be THIS order's own (a concurrent run made it a moment ago) - still "created at
      // payment", through the same path (its labels, its sign-in email, its first sign-in).
      if (!target.uid || (auto && target.uid === autoAccountUid(orderId))) {
        if (auto) await deliverToNewAccount(orderId, order);
        return;
      }
      // PAY-ACCOUNT-1 addendum A: one identifier on an account, the other on none -> the existing account gets it and the
      // other identifier is NOT added to it (and no second account is made). Recorded for the admin; switch off: nothing.
      let existingExtra;
      if (auto && !target.note && order.guestPhone && order.guestEmail && !(target.byPhone && target.byEmail)) {
        emit('payments.guest.deliver.second_not_linked');
        await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId).set({ adminNote: SECOND_NOT_LINKED_NOTE }, { merge: true });
        // What the recipient email may say: the account signs in with the identifier that FOUND it, never the other.
        existingExtra = target.uid === target.byEmail ? { accountSignInWith: 'email', accountHasEmail: true } : { accountSignInWith: 'phone' };
      }
      if (target.note) {
        emit('payments.guest.deliver.two_accounts');
        await adminFirestore
          .collection(PAY_ORDERS_COLLECTION)
          .doc(orderId)
          .set({ adminNote: target.note.note, otherAccountUid: target.note.otherUid }, { merge: true });
      }
      const outcome = await attachOrder(orderId, target.uid, (o) => o.checkoutWho === true, 'existing_account', existingExtra);
      if (outcome && outcome.claimed) {
        emit('payments.guest.deliver.granted');
        // CHECKOUT-WHO-2: the account was not signed in here, so the "Also sign in with <masked>?" offer waits on the order
        // for that account's next claim (its next session). Only when the order named BOTH identifiers.
        if (typeof order.guestPhone === 'string' && order.guestPhone && typeof order.guestEmail === 'string' && order.guestEmail) {
          await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId).set({ alsoSignInPending: true }, { merge: true });
        }
      }
    } catch (e) {
      emit('payments.guest.deliver.failed');
      console.error('[pay/guest/deliver] could not attach to an existing account:', e && e.message);
    }
  }

  /**
   * PAY-ACCOUNT-1 - find (an account this server made at an earlier payment) or create the recipient's account. Returns
   * { uid, created, hasEmail, secondNotLinked } or { uid: null, reason }.
   * ★★ Review HIGH 1 (pre-staging takeover): a NEW account carries ONLY the FIRST-entered identifier, never both. Two
   *    unverified identifiers on one account would let a payer stage an account with a victim's phone and their own email
   *    (or the reverse), open it by the identifier they control, and have the victim sign into it later. The second
   *    identifier is never put on any account here; the student adds it later through the verified "also sign in with"
   *    step. And (addendum A) an identifier already used by ANY account never goes on a new one.
   */
  async function findOrCreateAccount(orderId, { phone, email, first }) {
    const lookup = async (fn, v) => (v && typeof fn === 'function' ? fn(v) : null);
    const phoneRec = await lookup(authAccounts.getUserByPhone, phone);
    const emailRec = await lookup(authAccounts.getUserByEmail, email);
    const idOf = (r) => (r && typeof r.uid === 'string' && r.uid ? r.uid : null);
    const own = autoAccountUid(orderId);
    const both = !!phone && !!email;
    // An existing account: one with the phone (SMS-verified - a sign-up raced the payment), or one THIS server made.
    const firstRec = first === 'email' ? emailRec : phoneRec;
    const otherRec = first === 'email' ? phoneRec : emailRec;
    for (const rec of [firstRec, otherRec]) {
      const id = idOf(rec);
      if (!id || !(rec === phoneRec || isAutoAccountUid(id))) continue;
      const hasPhone = idOf(phoneRec) === id;
      const hasEmail = idOf(emailRec) === id;
      // THIS order's own account (a concurrent run created it a moment ago) is still "created at payment".
      return { uid: id, created: id === own, hasEmail, signInWith: hasEmail && !hasPhone ? 'email' : hasPhone ? 'phone' : 'email', secondNotLinked: both && !(hasPhone && hasEmail) };
    }
    // The new account: the first-entered identifier ONLY, and only while no account of any kind uses it.
    const firstValue = first === 'email' ? email : phone;
    const firstFree = !!firstValue && !idOf(firstRec);
    if (!firstFree) return { uid: null, reason: first === 'email' ? 'email_in_use' : 'phone_in_use' };
    const input = { uid: own, emailVerified: false, ...(first === 'email' ? { email } : { phoneNumber: phone }) };
    try {
      await authAccounts.createUser(input);
    } catch (e) {
      const code = e && e.code;
      if (code === 'auth/uid-already-exists') {
        // verify + webhook raced on THIS order: the other run made it. Use it.
        const rec = typeof authAccounts.getUser === 'function' ? await authAccounts.getUser(own) : null;
        if (!idOf(rec)) return { uid: null, reason: 'create_failed' };
      } else if (code === 'auth/phone-number-already-exists' || code === 'auth/email-already-exists') {
        // A sign-up took the identifier between the lookup and the create: re-resolve by the existing rules, else wait.
        const again = await resolveRecipientAccount({ phone, email, first });
        if (again.uid) {
          const hasEmail = again.uid === again.byEmail;
          return { uid: again.uid, created: false, hasEmail, signInWith: hasEmail && again.uid !== again.byPhone ? 'email' : 'phone', secondNotLinked: both && !(again.byPhone && again.byEmail) };
        }
        return { uid: null, reason: 'identifier_taken' };
      } else {
        return { uid: null, reason: 'create_failed' };
      }
    }
    return { uid: own, created: true, hasEmail: first === 'email', signInWith: first === 'email' ? 'email' : 'phone', secondNotLinked: both };
  }

  /** PAY-ACCOUNT-1 - a paid recipient order with NO account: make it, then the SAME take + grant. Never throws. */
  async function deliverToNewAccount(orderId, order) {
    const orderRef = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
    let made;
    try {
      made = await findOrCreateAccount(orderId, {
        phone: typeof order.guestPhone === 'string' && order.guestPhone ? order.guestPhone : null,
        email: typeof order.guestEmail === 'string' && order.guestEmail ? order.guestEmail : null,
        first: order.recipientFirst === 'email' ? 'email' : 'phone',
      });
    } catch (e) {
      made = { uid: null, reason: 'create_failed' };
      console.error('[pay/guest/deliver] account lookup / create failed:', e && e.code);
    }
    if (!made.uid) {
      // Never lose a paid order: it stays paid_unclaimed for today's claim; the owner sees "account not created".
      emit('payments.guest.deliver.account_not_created');
      await orderRef.set({ adminNote: ACCOUNT_NOT_CREATED_NOTE, accountCreateError: made.reason || 'create_failed' }, { merge: true });
      return;
    }
    if (made.created) emit('payments.guest.deliver.account_created');
    if (made.secondNotLinked) emit('payments.guest.deliver.second_not_linked');
    const extra = {
      ...(made.hasEmail ? { accountHasEmail: true } : {}),
      accountSignInWith: made.signInWith,
      adminNote: made.secondNotLinked ? SECOND_NOT_LINKED_NOTE : null,
      accountCreateError: null,
    };
    const outcome = await attachOrder(orderId, made.uid, (o) => o.checkoutWho === true, made.created ? VIA_ACCOUNT_CREATED : 'existing_account', extra);
    if (outcome && outcome.claimed) emit('payments.guest.deliver.granted');
  }

  /**
   * ONE TRANSACTION: re-read the order and take it for `uid`. Returns the order to grant, or null when it is not this
   * caller's to take (another phone, not paid, already someone else's, erased).
   */
  async function takeOrder(orderId, uid, matches, via, extra) {
    const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
    return adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const order = snap && snap.exists ? snap.data() || {} : null;
      // `matches` re-checks INSIDE the transaction that this order is the caller's (its phone / verified email).
      if (!order || order.payer !== GUEST_PAYER || !matches(order)) return null;
      if (typeof order.paymentId !== 'string' || !order.paymentId) return null;
      if (order.status === GUEST_STATUS.paidUnclaimed && (order.uid === null || order.uid === undefined)) {
        tx.set(ref, { uid, status: GUEST_STATUS.claimed, claimedAt: new Date(now()), claimAttempts: 1, ...(via && order.checkoutWho === true ? { claimedVia: via } : {}), ...(extra || {}) }, { merge: true });
        return { ...order, uid, status: GUEST_STATUS.claimed };
      }
      // A claim interrupted after this step (or whose grant failed): only the SAME uid may finish it, and only while
      // under the retry cap (review fix 3) - past it the order waits in the admin view as "claimed, grant failed".
      if (order.status === GUEST_STATUS.claimed && order.uid === uid) {
        const attempts = Number.isInteger(order.claimAttempts) ? order.claimAttempts : 0;
        if (attempts >= MAX_CLAIM_ATTEMPTS) return null;
        tx.set(ref, { claimAttempts: attempts + 1 }, { merge: true });
        return order;
      }
      return null;
    });
  }

  /**
   * Take ONE order for `uid` (transaction) and run the EXISTING grant. Shared by the claim and (CHECKOUT-WHO-1) the
   * delivery to an existing account, so there is one copy of the take, the duplicate rules and the grant.
   * Returns { claimed } | { duplicate: true } | { failed: true } | null (not this caller's to take).
   */
  async function attachOrder(orderId, uid, matches, via, extra) {
    try {
      const order = await takeOrder(orderId, uid, matches, via, extra);
      if (!order) return null;
      const paymentRef = order.paymentId;
      const orderRef = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
      let entry;
      if (isPackProduct(order.passType)) {
        const granted = await grantPack({ db: adminFirestore, uid, order: { orderId }, paymentRef, nowMs: now() });
        if (granted.duplicate) {
          // Review fix 5: the account already owned this pack - a real payment for nothing. Never swallowed: the order
          // is labelled a duplicate purchase the owner sees in admin purchases.
          emit('payments.guest.claim.pack_duplicate_payment');
          await orderRef.set({ status: DUPLICATE_PURCHASE, duplicateReason: 'already_owned' }, { merge: true });
          return { duplicate: true };
        }
        entry = { orderId, ...describeOrder(order), packId: granted.pack.packId };
      } else {
        // Review fix 5: a Board Pass bought for an account whose pass ALREADY runs to the boards buys nothing: no grant,
        // the order is labelled a duplicate purchase. (A shorter running pass is extended by the grant as usual.)
        const subSnap = await adminFirestore.collection('subscriptions').doc(uid).get();
        const stored = subSnap && subSnap.exists ? subSnap.data() || {} : {};
        // CHECKOUT-WHO-2: THIS payment already on the account (a concurrent claim / delivery granted it first) is a replay,
        // not a duplicate purchase: skip the covered check and let grantPass replay it (it writes nothing new).
        // The per-payment record grantPass keeps under the subscription (subscriptions/{uid}/payments/{paymentRef}).
        const subRef = adminFirestore.collection('subscriptions').doc(uid);
        const paidHere = await subRef.collection(PAYMENT_SEGMENTS.payments).doc(paymentRef).get();
        const alreadyRecorded = !!(paidHere && paidHere.exists) || stored.lastPaymentRef === paymentRef;
        if (!alreadyRecorded && order.passType === GUEST_PASS_SKU && coveredTillBoards(stored, now())) {
          emit('payments.guest.claim.already_covered');
          await orderRef.set({ status: DUPLICATE_PURCHASE, duplicateReason: 'already_premium_till_boards' }, { merge: true });
          return { duplicate: true };
        }
        const granted = await grantPass(
          { uid, passType: order.passType, paymentRef, now: now() },
          { firestore: adminFirestore, payOrderId: orderId, foundingOfferOpen },
        );
        entry = { orderId, ...describeOrder(order), passEnd: granted.pass.passEnd };
      }
      emit('payments.guest.claim.granted');
      return { claimed: entry, order };
    } catch (e) {
      const refused = e instanceof PassGrantInputError || e instanceof PackGrantInputError;
      emit(refused ? 'payments.guest.claim.grant_refused' : 'payments.guest.claim.grant_failed');
      console.error('[pay/guest/claim] could not claim an order:', e && e.message);
      // Review fix 3: the failure is recorded ON the order (still `claimed`, this uid) for the admin view and the retry cap.
      try {
        await adminFirestore
          .collection(PAY_ORDERS_COLLECTION)
          .doc(orderId)
          .set({ claimError: { code: refused ? 'grant_refused' : 'grant_failed', atMs: now() } }, { merge: true });
      } catch {
        /* the next claim retries; the cap still applies */
      }
      return { failed: true };
    }
  }

  /**
   * CHECKOUT-WHO-1/2 - the "Also sign in with <masked>?" offer for a recipient order this account now holds: the order's
   * phone when the account does not sign in with a phone; else its email when the account has no VERIFIED email. MASKED.
   * Linking itself happens in the browser and always needs its own verification (SMS code / email link / Google).
   */
  function alsoSignInFor(o, phone, email) {
    if (!o || o.checkoutWho !== true) return null;
    if (!phone && typeof o.guestPhone === 'string' && o.guestPhone) return { kind: 'phone', masked: maskIndianMobile(o.guestPhone) };
    if (!email && typeof o.guestEmail === 'string' && o.guestEmail) return { kind: 'email', masked: maskEmail(o.guestEmail) };
    return null;
  }

  /* ── POST /api/pay/guest/claim — the verified phone (or verified email) takes its paid orders ── */
  async function handleClaim(req, res) {
    if (!isPaymentsEnabled(env)) return sendJson(res, 404, NOT_FOUND_BODY);
    const resolve = verifiedCaller && typeof verifiedCaller.resolveVerifiedIdentity === 'function' ? verifiedCaller.resolveVerifiedIdentity : null;
    const identity = resolve ? await resolve(req) : { uid: '', phoneNumber: '' };
    const uid = identity && typeof identity.uid === 'string' ? identity.uid : '';
    if (!uid || uid === ERASED_UID) return sendJson(res, 401, { ok: false, error: 'unauthenticated' });
    const verdict = limiters.claim.check(req, GUEST_CLAIM_PATH, uid);
    if (!verdict.allowed) {
      emit('payments.guest.claim.rate_limited');
      return sendJson(res, 429, { ok: false, error: 'Too many attempts. Please try again tomorrow.' });
    }
    if (!adminFirestore) return unavailable(res);
    // The ONLY sources: the verified token. The body is not read at all.
    const phone = normaliseIndianMobile(identity.phoneNumber || '');
    // CHECKOUT-WHO-1: the token's email counts ONLY when Firebase says it is verified (`email_verified === true`).
    const email = identity.emailVerified === true ? normaliseEmail(identity.email || '') : null;
    if (!phone && !email) {
      emit('payments.guest.claim.no_phone');
      return sendJson(res, 200, { ok: true, claimed: [] });
    }

    let candidates;
    try {
      candidates = [];
      const seen = new Set();
      const add = (list) => {
        for (const c of list) {
          if (seen.has(c.id)) continue;
          seen.add(c.id);
          candidates.push(c);
        }
      };
      if (phone) {
        add(await ordersForPhone(phone, GUEST_STATUS.paidUnclaimed));
        add((await ordersForPhone(phone, GUEST_STATUS.claimed)).filter(({ order }) => order.uid === uid));
      }
      if (email) {
        add(await ordersFor('guestEmail', email, GUEST_STATUS.paidUnclaimed));
        add((await ordersFor('guestEmail', email, GUEST_STATUS.claimed)).filter(({ order }) => order.uid === uid));
      }
    } catch (e) {
      emit('payments.guest.claim.read_failed');
      console.error('[pay/guest/claim] read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not read your payments.' });
    }

    const matches = (order) => (!!phone && order.guestPhone === phone) || (!!email && order.guestEmail === email);
    const claimed = [];
    let failed = 0;
    let duplicates = 0;
    let alsoSignIn = null;
    for (const { id: orderId } of candidates) {
      const outcome = await attachOrder(orderId, uid, matches, 'claim');
      if (!outcome) continue;
      if (outcome.failed) failed += 1;
      else if (outcome.duplicate) duplicates += 1;
      else if (outcome.claimed) {
        claimed.push(outcome.claimed);
        // CHECKOUT-WHO-1: the order also named a phone this account does not sign in with -> offer the existing
        // link-a-number step (masked; linking still needs its own SMS code).
        if (!alsoSignIn) alsoSignIn = alsoSignInFor(outcome.order || {}, phone, email);
      }
    }
    // CHECKOUT-WHO-2: purchases delivered at payment time to THIS existing account that named a second identifier: offer
    // it now, once (the flag is cleared whatever the outcome). A read failure only loses the offer, never the claim.
    try {
      const pending = await adminFirestore
        .collection(PAY_ORDERS_COLLECTION)
        .where('uid', '==', uid)
        .where('alsoSignInPending', '==', true)
        .limit(MAX_ORDERS_PER_CLAIM)
        .get();
      for (const d of pending && Array.isArray(pending.docs) ? pending.docs : []) {
        const o = typeof d.data === 'function' ? d.data() || {} : {};
        if (!alsoSignIn) alsoSignIn = alsoSignInFor(o, phone, email);
        await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(d.id).set({ alsoSignInPending: false }, { merge: true });
      }
    } catch (e) {
      emit('payments.guest.claim.pending_prompt_failed');
      console.error('[pay/guest/claim] pending prompt read failed:', e && e.message);
    }
    // PAY-ACCOUNT-1: the FIRST sign-in of an account made at payment is its sign-up. Said ONCE (the orders are marked in a
    // transaction) so the client can count the sign-up. Review LOW 5: the sign-up TRIAL starts HERE, in that same
    // transaction, so a lost response cannot lose it - with activateTrial's own rules: never over premium, a pass or a
    // trial already started, and never for a Board Pass account (covered anyway). Only for a `pay-` uid; switch off: never.
    let firstSignIn = false;
    let trialStarted = false;
    if (isPayAutoAccountEnabled(env) && isAutoAccountUid(uid)) {
      try {
        const made = await adminFirestore
          .collection(PAY_ORDERS_COLLECTION)
          .where('uid', '==', uid)
          .where('claimedVia', '==', VIA_ACCOUNT_CREATED)
          .limit(MAX_ORDERS_PER_CLAIM)
          .get();
        const refs = (made && Array.isArray(made.docs) ? made.docs : []).map((d) => adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(d.id));
        if (refs.length) {
          const subRef = adminFirestore.collection('subscriptions').doc(uid);
          const out = await adminFirestore.runTransaction(async (tx) => {
            const orders = [];
            for (const ref of refs) {
              const snap = await tx.get(ref);
              orders.push({ ref, o: snap && snap.exists ? snap.data() || {} : null });
            }
            const subSnap = await tx.get(subRef);
            const sub = subSnap && subSnap.exists ? subSnap.data() || {} : {};
            const fresh = orders.filter(({ o }) => o && o.uid === uid && !o.firstSignInAt);
            if (!fresh.length) return { first: false, trial: false };
            const at = new Date(now());
            for (const { ref } of fresh) tx.set(ref, { firstSignInAt: at }, { merge: true });
            const covered = sub.tier === 'premium' || !!sub.passEnd || !!sub.passType || !!sub.trialStartDate;
            if (covered) return { first: true, trial: false };
            // The same record the client's activateTrial writes at sign-up (the start pinned to the server's clock).
            tx.set(subRef, { tier: 'trial', plan: 'trial_7day', premiumSince: null, trialStartDate: at, updatedAt: at.toISOString() }, { merge: true });
            return { first: true, trial: true };
          });
          firstSignIn = out.first;
          trialStarted = out.trial;
          if (trialStarted) emit('payments.guest.claim.first_signin_trial');
        }
      } catch (e) {
        emit('payments.guest.claim.first_signin_failed');
        console.error('[pay/guest/claim] first sign-in failed:', e && e.message);
      }
    }
    return sendJson(res, 200, {
      ok: true,
      claimed,
      ...(firstSignIn ? { firstSignIn: true, trialStarted } : {}),
      ...(failed ? { failed } : {}),
      ...(duplicates ? { duplicates } : {}),
      ...(alsoSignIn ? { alsoSignIn } : {}),
    });
  }

  return { handleOrder, handleVerify, handleClaim, afterRecipientPaid, isEnabled: () => isGuestPayEnabled(env) || isCheckoutWhoEnabled(env) };
}

module.exports = {
  createGuestPayRoutes,
  createGuestPayLimiters,
  isGuestPayEnabled,
  isCheckoutWhoEnabled,
  isPayAutoAccountEnabled,
  autoAccountUid,
  isAutoAccountUid,
  SECOND_NOT_LINKED_NOTE,
  ACCOUNT_NOT_CREATED_NOTE,
  VIA_ACCOUNT_CREATED,
  readRecipient,
  NO_ACCOUNT_COVERAGE_ID,
  phoneKey,
  emailKey,
  PAYER_TYPE,
  TWO_ACCOUNTS_NOTE,
  GUEST_ORDER_PATH,
  GUEST_VERIFY_PATH,
  GUEST_CLAIM_PATH,
  GUEST_PASS_SKU,
  MAX_CLAIM_ATTEMPTS,
  MAX_GUEST_ORDERS_PER_PHONE_PER_DAY,
  MAX_GUEST_CALLS_PER_CLIENT_PER_DAY,
};
