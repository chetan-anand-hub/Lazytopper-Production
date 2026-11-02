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
 * ★ PRIVACY. The phone number is stored on the order (it is the claim key) and goes to Razorpay's checkout as the
 *    read-only contact. It is never in a URL, a Razorpay order note, a telemetry name or an analytics event; responses
 *    carry it MASKED (`+91 98•••••948`). The per-phone limiter keys on its SHA-256, not the number.
 */

const crypto = require('node:crypto');
const {
  isPaymentsEnabled,
  isCheckoutSignatureValid,
  quotePass,
  readRawBody,
  paymentMismatch,
  PAY_ORDERS_COLLECTION,
  RAZORPAY_API_BASE,
} = require('./payments.cjs');
const { grantPass, isStaleFoundingOrder, PassGrantInputError } = require('../services/passGrant.cjs');
const { grantPack, PackGrantInputError } = require('../services/packGrant.cjs');
const { PACK_PRODUCTS, isPackProduct, packsEnabled, validateTarget, packIdFor } = require('../services/packProducts.cjs');
const { createRateLimiter, ANONYMOUS_CLASS } = require('../services/rateLimiter.cjs');
// Review fix 5: "already covered till the boards" is the parent-pay rule, reused.
const { coveredTillBoards } = require('./parentPay.cjs');
const {
  GUEST_PAYER,
  GUEST_STATUS,
  isGuestPayFlagOn,
  normaliseIndianMobile,
  maskIndianMobile,
  markGuestOrderPaid,
} = require('../services/guestPay.cjs');

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

function isGuestPayEnabled(env = process.env) {
  return isPaymentsEnabled(env) && isGuestPayFlagOn(env);
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
    if (!isGuestPayEnabled(env)) {
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
    const snap = await adminFirestore
      .collection(PAY_ORDERS_COLLECTION)
      .where('guestPhone', '==', phone)
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
        const price = PACK_PRODUCTS[sku].priceInr;
        quote = { pricePaidInr: price, amountPaise: price * 100, offerKey: null };
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
      // Review fix 6: never the number itself (the browser already has what it typed); only its masked form.
      phoneMasked: maskIndianMobile(phone),
    });
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
    if (order.payer !== GUEST_PAYER || typeof order.guestPhone !== 'string') return reject(res, 'verify', 'not_guest');
    if (!Number.isInteger(order.amountPaise) || order.amountPaise <= 0) return reject(res, 'verify', 'bad_order');

    const done = () =>
      sendJson(res, 200, {
        ok: true,
        status: GUEST_STATUS.paidUnclaimed,
        ...describeOrder(order),
        phoneMasked: maskIndianMobile(order.guestPhone),
      });

    // Already recorded for THIS payment (a retry, or the webhook got there first): nothing to ask Razorpay.
    if (order.status !== GUEST_STATUS.created && order.paymentId === paymentId) {
      emit('payments.guest.verify.replayed');
      return done();
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
    return done();
  }

  /**
   * ONE TRANSACTION: re-read the order and take it for `uid`. Returns the order to grant, or null when it is not this
   * caller's to take (another phone, not paid, already someone else's, erased).
   */
  async function takeOrder(orderId, uid, phone) {
    const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
    return adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const order = snap && snap.exists ? snap.data() || {} : null;
      if (!order || order.payer !== GUEST_PAYER || order.guestPhone !== phone) return null;
      if (typeof order.paymentId !== 'string' || !order.paymentId) return null;
      if (order.status === GUEST_STATUS.paidUnclaimed && (order.uid === null || order.uid === undefined)) {
        tx.set(ref, { uid, status: GUEST_STATUS.claimed, claimedAt: new Date(now()), claimAttempts: 1 }, { merge: true });
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

  /* ── POST /api/pay/guest/claim — the verified phone takes its paid orders ──── */
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
    // The ONLY source of the phone: the verified token. The body is not read at all.
    const phone = normaliseIndianMobile(identity.phoneNumber || '');
    if (!phone) {
      emit('payments.guest.claim.no_phone');
      return sendJson(res, 200, { ok: true, claimed: [] });
    }

    let candidates;
    try {
      candidates = [
        ...(await ordersForPhone(phone, GUEST_STATUS.paidUnclaimed)),
        ...(await ordersForPhone(phone, GUEST_STATUS.claimed)).filter(({ order }) => order.uid === uid),
      ];
    } catch (e) {
      emit('payments.guest.claim.read_failed');
      console.error('[pay/guest/claim] read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not read your payments.' });
    }

    const claimed = [];
    let failed = 0;
    let duplicates = 0;
    for (const { id: orderId } of candidates) {
      try {
        const order = await takeOrder(orderId, uid, phone);
        if (!order) continue;
        const paymentRef = order.paymentId;
        const orderRef = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
        if (isPackProduct(order.passType)) {
          const granted = await grantPack({ db: adminFirestore, uid, order: { orderId }, paymentRef, nowMs: now() });
          if (granted.duplicate) {
            // Review fix 5: the account already owned this pack - a real payment for nothing. Never swallowed: the order
            // is labelled a duplicate purchase the owner sees in admin purchases.
            emit('payments.guest.claim.pack_duplicate_payment');
            await orderRef.set({ status: DUPLICATE_PURCHASE, duplicateReason: 'already_owned' }, { merge: true });
            duplicates += 1;
            continue;
          }
          claimed.push({ orderId, ...describeOrder(order), packId: granted.pack.packId });
        } else {
          // Review fix 5: a Board Pass bought for an account whose pass ALREADY runs to the boards buys nothing: no grant,
          // the order is labelled a duplicate purchase. (A shorter running pass is extended by the grant as usual.)
          const subSnap = await adminFirestore.collection('subscriptions').doc(uid).get();
          const stored = subSnap && subSnap.exists ? subSnap.data() || {} : {};
          if (order.passType === GUEST_PASS_SKU && coveredTillBoards(stored, now())) {
            emit('payments.guest.claim.already_covered');
            await orderRef.set({ status: DUPLICATE_PURCHASE, duplicateReason: 'already_premium_till_boards' }, { merge: true });
            duplicates += 1;
            continue;
          }
          const granted = await grantPass(
            { uid, passType: order.passType, paymentRef, now: now() },
            { firestore: adminFirestore, payOrderId: orderId, foundingOfferOpen },
          );
          claimed.push({ orderId, ...describeOrder(order), passEnd: granted.pass.passEnd });
        }
        emit('payments.guest.claim.granted');
      } catch (e) {
        failed += 1;
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
      }
    }
    return sendJson(res, 200, { ok: true, claimed, ...(failed ? { failed } : {}), ...(duplicates ? { duplicates } : {}) });
  }

  return { handleOrder, handleVerify, handleClaim, isEnabled: () => isGuestPayEnabled(env) };
}

module.exports = {
  createGuestPayRoutes,
  createGuestPayLimiters,
  isGuestPayEnabled,
  phoneKey,
  GUEST_ORDER_PATH,
  GUEST_VERIFY_PATH,
  GUEST_CLAIM_PATH,
  GUEST_PASS_SKU,
  MAX_CLAIM_ATTEMPTS,
  MAX_GUEST_ORDERS_PER_PHONE_PER_DAY,
  MAX_GUEST_CALLS_PER_CLIENT_PER_DAY,
};
