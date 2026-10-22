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
const { grantPass, computeGrant, describePass, PassGrantInputError, PASS_TYPES } = require('../services/passGrant.cjs');
const { createRateLimiter } = require('../services/rateLimiter.cjs');
// TOPUP-1 (DARK): the extra-usage packs. Everything below is behind PAYMENTS_ENABLED AND TOPUP_ENABLED.
const { TOPUP_PRODUCTS, isTopupProduct } = require('../services/passPricing.cjs');
const { grantTopup, TopupInputError, isTopupFlagOn } = require('../services/usageCredit.cjs');
const { deriveEffectiveTier } = require('../services/entitlement.cjs');

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

/** Razorpay webhook: HMAC-SHA256(raw body bytes, webhook_secret), hex. */
function isWebhookSignatureValid({ rawBody, signature, webhookSecret }) {
  if (!webhookSecret || !Buffer.isBuffer(rawBody)) return false;
  return timingSafeHexEqual(hmacSha256Hex(webhookSecret, rawBody), signature);
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
  return { pricePaidInr, amountPaise: pricePaidInr * 100, offerKey: decision.fields.offerKey };
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
  } = deps;

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

  /** Z4/Z5: every rejection is a 400 with a reason, and counted. */
  function reject(res, scope, reason) {
    emit(`payments.${scope}.rejected.${reason}`);
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
    // TOPUP-1 dark proof: with TOPUP_ENABLED unset a top-up key is answered exactly like an unknown route.
    if (isTopup && !topupEnabled()) return sendJson(res, 404, NOT_FOUND_BODY);
    if (!isTopup && !Object.prototype.hasOwnProperty.call(PASS_TYPES, passType)) {
      return sendJson(res, 400, { ok: false, error: 'passType must be "month" or "till_boards"' });
    }

    let quote;
    try {
      const snap = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
      const stored = snap && snap.exists ? snap.data() || {} : {};
      if (isTopup) {
        // Premium only (a trial or free student at a limit sees "Upgrade"). The tier is the SERVER's own
        // derivation from the stored subscription; the amount is ALWAYS the server table, never the body's.
        if (deriveEffectiveTier(stored, now()).tier !== 'premium') {
          emit('payments.order.topup_not_premium');
          return sendJson(res, 403, { ok: false, error: 'premium_required' });
        }
        const price = TOPUP_PRODUCTS[passType].priceInr;
        quote = { pricePaidInr: price, amountPaise: price * 100, offerKey: null };
      } else {
        quote = quotePass(stored, passType, now(), { foundingOfferOpen });
      }
    } catch (e) {
      emit('payments.order.quote_failed');
      console.error('[pay/order] quote failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not price this pass.' });
    }

    let created;
    try {
      created = await razorpay(keys, 'POST', '/orders', {
        amount: quote.amountPaise,
        currency: CURRENCY,
        notes: { uid, passType, ...(quote.offerKey ? { offerKey: quote.offerKey } : {}) },
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
    return sendJson(res, 200, { ok: true, orderId: order.id, keyId: keys.keyId, amountPaise: quote.amountPaise });
  }

  /**
   * The payment as Razorpay reports it, captured if it was only authorized.
   * Returns { payment } or { error: reason, upstream: bool }.
   */
  async function fetchCapturedPayment(keys, paymentId, amountPaise) {
    const fetched = await razorpay(keys, 'GET', `/payments/${paymentId}`);
    if (!fetched.ok || !fetched.json) return { error: 'payment_fetch_failed', upstream: true };
    let payment = fetched.json;
    if (payment.status === 'authorized') {
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
      return reject(res, 'verify', 'malformed');
    }

    // 1. The checkout signature — timing-safe.
    if (!isCheckoutSignatureValid({ orderId, paymentId, signature, keySecret: keys.keySecret })) {
      return reject(res, 'verify', 'bad_signature');
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
    if (!order) return reject(res, 'verify', 'unknown_order');
    if (order.uid !== uid) return reject(res, 'verify', 'uid_mismatch');
    if (!Number.isInteger(order.amountPaise) || order.amountPaise <= 0) return reject(res, 'verify', 'bad_order');

    // 3. What Razorpay says was actually paid.
    let result;
    try {
      result = await fetchCapturedPayment(keys, paymentId, order.amountPaise);
    } catch (e) {
      emit('payments.verify.razorpay_unreachable');
      console.error('[pay/verify] razorpay unreachable:', e && e.message);
      return sendJson(res, 502, { ok: false, error: 'Payment provider is unreachable.' });
    }
    if (result.error) {
      emit(`payments.verify.${result.error}`);
      return sendJson(res, 502, { ok: false, error: 'Payment provider did not confirm the payment.' });
    }
    const payment = result.payment;
    if (payment.id !== undefined && payment.id !== paymentId) return reject(res, 'verify', 'payment_mismatch');
    const mismatch = paymentMismatch(payment, { orderId, amountPaise: order.amountPaise });
    if (mismatch) return reject(res, 'verify', mismatch);

    // 4. Grant — idempotent, with the order's created -> paid in the same transaction.
    return grantAndRespond(res, 'verify', { uid: order.uid, passType: order.passType, paymentId, orderId });
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
  async function grantAndRespond(res, scope, { uid, passType, paymentId, orderId }, extra) {
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
        if (e instanceof TopupInputError) return reject(res, scope, 'grant_refused');
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
      if (extra && extra.counter) emit(extra.counter);
      const body = {
        ok: true,
        replayed: granted.replayed,
        passEnd: granted.pass.passEnd,
        pass: granted.pass,
      };
      return sendJson(res, 200, extra && extra.body ? { ...body, ...extra.body } : body);
    } catch (e) {
      if (e instanceof PassGrantInputError) return reject(res, scope, 'grant_refused');
      emit(`payments.${scope}.grant_failed`);
      console.error(`[pay/${scope}] grant failed:`, e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Pass grant failed' });
    }
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
    if (!isWebhookSignatureValid({ rawBody, signature, webhookSecret })) {
      return reject(res, 'webhook', 'bad_signature');
    }

    let event;
    try {
      event = parseJsonObject(rawBody);
    } catch {
      return reject(res, 'webhook', 'malformed');
    }
    if (event.event !== 'payment.captured') {
      emit('payments.webhook.ignored');
      return sendJson(res, 200, { ok: true, ignored: true });
    }

    const entity = event.payload && event.payload.payment && event.payload.payment.entity;
    const paymentId = entity && typeof entity.id === 'string' ? entity.id : '';
    const orderId = entity && typeof entity.order_id === 'string' ? entity.order_id : '';
    if (!ID_PATTERN.test(paymentId) || !ID_PATTERN.test(orderId)) return reject(res, 'webhook', 'malformed');

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
    // The account was erased (Z7 anonymises its orders): there is no one to grant to.
    if (order.uid === ERASED_UID || typeof order.uid !== 'string' || !order.uid) {
      emit('payments.webhook.erased_order');
      return sendJson(res, 200, { ok: true, ignored: true });
    }

    // orderId was read from this entity, so order_mismatch cannot fire here; the shared
    // checks then run currency -> amount -> captured, as the webhook always has.
    const mismatch = paymentMismatch(entity, { orderId, amountPaise: order.amountPaise });
    if (mismatch) return reject(res, 'webhook', mismatch);

    return grantAndRespond(res, 'webhook', { uid: order.uid, passType: order.passType, paymentId, orderId });
  }

  /**
   * The first of Razorpay's payments for this order that passes EVERY Z4 check —
   * capturing an authorized one for the STORED amount first (P4). Returns
   * { payment } | { none: true } | { upstream: reason }. Throws if Razorpay is unreachable.
   */
  async function findConfirmedPayment(keys, orderId, amountPaise) {
    const listed = await razorpay(keys, 'GET', `/orders/${orderId}/payments`);
    if (!listed.ok || !listed.json || !Array.isArray(listed.json.items)) return { upstream: 'list_failed' };
    for (const item of listed.json.items) {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !ID_PATTERN.test(item.id)) continue;
      // Never capture a payment that is not this order's, in INR, for the stored amount.
      if (paymentIdentityMismatch(item, { orderId, amountPaise })) continue;
      let payment = item;
      if (item.status === 'authorized') {
        const result = await fetchCapturedPayment(keys, item.id, amountPaise);
        if (result.error) return { upstream: result.error };
        payment = result.payment;
        if (payment.id !== undefined && payment.id !== item.id) continue;
      } else if (item.status !== 'captured') {
        continue;
      }
      if (!paymentMismatch(payment, { orderId, amountPaise })) return { payment: { ...payment, id: item.id } };
    }
    return { none: true };
  }

  /* ── PAY-STATUS-1 · POST /api/pay/status ────────────────────────────────── */
  async function handleStatus(req, res) {
    if (!enabled()) return sendJson(res, 404, NOT_FOUND_BODY);
    const admitted = await admitBrowserCall(req, res, PAY_STATUS_PATH);
    if (!admitted) return undefined;
    const { uid, keys } = admitted;

    const body = await readJsonBody(req, res);
    if (!body) return undefined;
    // Only the order id is read from the request — never an amount, a payment or a status.
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    if (!ID_PATTERN.test(orderId)) return reject(res, 'status', 'malformed');

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
    if (order.uid !== uid) return reject(res, 'status', 'uid_mismatch');
    if (!Number.isInteger(order.amountPaise) || order.amountPaise <= 0) return reject(res, 'status', 'bad_order');
    const amountInr = order.amountPaise / 100;

    // 1. Already paid (verify, webhook or an earlier status call): report it, write nothing.
    if (order.status === 'paid') {
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
    if (order.status !== 'created') return reject(res, 'status', 'bad_order');

    // 2. Created: ask Razorpay what was actually paid against this order.
    let found;
    try {
      found = await findConfirmedPayment(keys, orderId, order.amountPaise);
    } catch (e) {
      emit('payments.status.razorpay_unreachable');
      emit('payments.status.unknown');
      console.error('[pay/status] razorpay unreachable:', e && e.message);
      return sendJson(res, 200, { ok: true, state: 'unknown' });
    }
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
    return grantAndRespond(
      res,
      'status',
      { uid: order.uid, passType: order.passType, paymentId, orderId },
      { body: { state: 'paid', paymentId, amountInr }, counter: 'payments.status.reconciled' },
    );
  }

  return { handleOrder, handleVerify, handleWebhook, handleStatus, isEnabled: enabled, isTopupEnabled: topupEnabled };
}

module.exports = {
  createPaymentRoutes,
  isPaymentsEnabled,
  isTopupEnabled,
  isCheckoutSignatureValid,
  isWebhookSignatureValid,
  timingSafeHexEqual,
  hmacSha256Hex,
  quotePass,
  readRawBody,
  PAY_ORDER_PATH,
  PAY_VERIFY_PATH,
  PAY_WEBHOOK_PATH,
  PAY_STATUS_PATH,
  PAY_ORDERS_COLLECTION,
  RAZORPAY_API_BASE,
};
