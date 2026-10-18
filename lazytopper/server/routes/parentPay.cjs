/**
 * Parent pay — "Ask your parents to pay" (ASK-PARENTS-PAY-1, owner ruling 18 Oct 2026).
 *
 * ⚠ TOUCHES PAYMENT — NEEDS COFOUNDER AUDIT. This module creates Razorpay orders and
 * verifies payments for a payer who is NOT signed in. It does not change payments.cjs,
 * passGrant.cjs or the webhook: it reuses their pure helpers and their grant.
 *
 *   POST /api/pay/parent-link    {}                                       AUTH REQUIRED (the child)
 *   POST /api/pay/parent/view    { token }                                capability token
 *   POST /api/pay/parent/order   { token, passType }                      capability token
 *   POST /api/pay/parent/verify  { token, orderId, paymentId, signature } capability token
 *
 * ★★ DARK BY DEFAULT. All four answer the gateway's own 404 unless BOTH `PAYMENTS_ENABLED`
 * and `PARENT_PAY_ENABLED` are on. Nothing is read before that check.
 *
 * ★★ THE CHILD'S UID NEVER COMES FROM THE PARENT. The signed-in child mints a link. Its
 * token is 256 bits of crypto.randomBytes, shown ONCE (in the child's WhatsApp message) and
 * stored only as its SHA-256 (`parentPayLinks/{sha256(token)}`), like the QR hand-off's
 * slots. The link document holds the child's uid as a FIELD. Every parent route resolves the
 * uid from that document — never from a body, a header or an Authorization token. A parent
 * who happens to be signed in to their own account changes nothing: no Authorization header
 * is ever read on the three parent routes.
 *
 * ★★ NOTHING THAT DECIDES MONEY COMES FROM THE REQUEST. The amount is `quotePass` over the
 * CHILD's stored subscription — the same function the child's own order uses, the same
 * `computeGrant` that records `pricePaidInr`. The request contributes the pass TYPE only.
 *
 * ★★ A PAYMENT IS BELIEVED ONLY WHEN EVERY CHECK AGREES — the same checks as
 * payments.cjs handleVerify (timing-safe checkout signature; the stored order; Razorpay's
 * own record of the payment: this order, INR, captured, the stored amount) PLUS the order
 * must have been created through THIS link (`payer: "parent"`, `parentLinkId`) for THIS
 * link's child. The grant is the existing `grantPass` with `payOrderId`, whose transaction
 * refuses an order whose `uid` is not the uid being granted — so a pass can only ever land
 * on the uid the order was created for, which is the child's.
 *
 * ★ THE WEBHOOK IS UNCHANGED AND STILL COVERS A PARENT ORDER. A parent order is an ordinary
 * `payOrders` document whose `uid` is the child: if the parent closes the tab before verify,
 * the existing `payment.captured` webhook grants it to `order.uid` exactly as for any order.
 * Idempotent end to end through grantPass's payment-level record (Z9).
 *
 * ★ SINGLE USE. A link pays at most once. It stops creating orders as soon as any order it
 * created is `paid` (by verify OR by the webhook — `payOrders` is QUERIED by `parentLinkId`,
 * so a webhook-only completion is seen too, whatever the link's own list says), it expires
 * (LINK_TTL_MS), and it can create at most MAX_ORDERS_PER_LINK orders at all — the cap is
 * checked and its slot taken in ONE Firestore transaction, so parallel requests cannot
 * exceed it. Verify does NOT check expiry: a payment Razorpay captured for an order created
 * while the link was live is always honoured.
 *
 * ★ ALREADY COVERED. If the child's pass already runs to the end of the predicted board day
 * (bought by the child, or through another link), view and order refuse with `covered` —
 * a parent is never asked to pay for nothing.
 *
 * ★ PRIVACY. The URL carries only the opaque token, in the FRAGMENT (`/pricing#pp=…`), so it
 * never reaches a server log, a Referer or an analytics vendor. A parent sees the child's
 * FIRST name only (the first word of the account's display name, letters only), and never
 * the uid, an email, a phone number or any study data. The parent's own details go to
 * Razorpay's checkout and never to LazyTopper.
 */

const crypto = require('node:crypto');
const {
  isPaymentsEnabled,
  isCheckoutSignatureValid,
  quotePass,
  readRawBody,
  PAY_ORDERS_COLLECTION,
  RAZORPAY_API_BASE,
} = require('./payments.cjs');
const { grantPass, PassGrantInputError, PASS_TYPES } = require('../services/passGrant.cjs');
const { createRateLimiter, ANONYMOUS_CLASS } = require('../services/rateLimiter.cjs');
const pricing = require('../services/passPricing.cjs');

const PARENT_LINK_PATH = '/api/pay/parent-link';
const PARENT_VIEW_PATH = '/api/pay/parent/view';
const PARENT_ORDER_PATH = '/api/pay/parent/order';
const PARENT_VERIFY_PATH = '/api/pay/parent/verify';

/** Top-level collection. Named as a constant so the studentDataMap drift guard sees it. */
const PARENT_PAY_LINKS_COLLECTION = 'parentPayLinks';
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';

/** How long a link can start a payment. An owner-tunable default (see the PR). */
const LINK_TTL_MS = 72 * 60 * 60 * 1000;
/** Orders one link may ever create (a parent retrying a failed UPI payment needs a few). */
const MAX_ORDERS_PER_LINK = 5;
/** Links one child may mint per IST day. */
const MAX_LINKS_PER_UID_PER_DAY = 10;
/**
 * Parent-route calls per client per IST day (view + order + verify together). Counted by
 * the product's ONE limiter (rateLimiter.cjs), keyed exactly as it keys every signed-out
 * caller — the same client-IP rule, the same daily reset (which is also its only memory
 * bound), the same documented XFF caveat. Not a second, hand-rolled policy.
 */
const MAX_PARENT_CALLS_PER_CLIENT_PER_DAY = 300;
/** The limiter's class for minting (keyed by the child's VERIFIED uid). */
const PARENT_LINK_CLASS = 'parentLink';
/** Refusal reason when the child's pass already runs to the boards. */
const COVERED_REASON = 'covered';

const RAZORPAY_TIMEOUT_MS = 15000;
const CURRENCY = 'INR';
const MAX_JSON_BYTES = 16 * 1024;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ID_PATTERN = /^[A-Za-z0-9_]{1,64}$/;
const HEX_PATTERN = /^[a-fA-F0-9]{1,256}$/;
const NOT_FOUND_BODY = Object.freeze({ error: 'Not Found' });
const ERASED_UID = 'erased';
const PARENT_PAYER = 'parent';
const MAX_FIRST_NAME_LENGTH = 24;

function isParentPayEnabled(env = process.env) {
  const on = /^(1|true|on|yes)$/i.test(String((env && env.PARENT_PAY_ENABLED) || '').trim());
  return on && isPaymentsEnabled(env);
}

/** 256 bits, URL-safe, 43 characters. */
function mintToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/** The link document id: the token is never stored. */
function linkIdOf(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * The FIRST name only: the first word of the display name, letters (any script) and the
 * joiners a name uses. Anything else -> '' (the page then says "your child").
 */
function firstNameOf(displayName) {
  const first = String(displayName || '').trim().split(/\s+/)[0] || '';
  if (!first || first.length > MAX_FIRST_NAME_LENGTH) return '';
  if (!/^[\p{L}\p{M}][\p{L}\p{M}'.-]*$/u.test(first)) return '';
  return first;
}

function toMillis(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') {
      try {
        return value.toMillis();
      } catch {
        return null;
      }
    }
    if (typeof value.seconds === 'number') return value.seconds * 1000;
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

/**
 * The parent-pay limiter: an instance of the product's existing limiter (rateLimiter.cjs),
 * like payments.cjs's own. Minting is keyed on the child's VERIFIED uid; the three parent
 * routes are called signed out by construction, so they are checked with `signedOut: true`
 * (a typed X-Lazytopper-Uid header keys nothing) and land in the limiter's anonymous
 * per-client bucket. No global class: these routes cost no model calls.
 */
function createParentPayLimiter({ telemetry, now } = {}) {
  return createRateLimiter({
    telemetry,
    now,
    paidEndpoints: {
      [PARENT_LINK_PATH]: PARENT_LINK_CLASS,
      [PARENT_VIEW_PATH]: 'parentPay',
      [PARENT_ORDER_PATH]: 'parentPay',
      [PARENT_VERIFY_PATH]: 'parentPay',
    },
    limits: {
      [PARENT_LINK_CLASS]: { soft: Math.ceil(MAX_LINKS_PER_UID_PER_DAY / 2), hard: MAX_LINKS_PER_UID_PER_DAY },
      [ANONYMOUS_CLASS]: { soft: Math.ceil(MAX_PARENT_CALLS_PER_CLIENT_PER_DAY / 2), hard: MAX_PARENT_CALLS_PER_CLIENT_PER_DAY },
    },
  });
}

/**
 * Does the child's pass already run to (or past) the end of the predicted board day? Then
 * neither pass buys anything new for the boards and the link must not take money.
 */
function coveredTillBoards(storedSubscription, nowMs) {
  const stored = storedSubscription && typeof storedSubscription === 'object' ? storedSubscription : {};
  const endMs = toMillis(stored.passEnd);
  if (endMs === null || endMs <= nowMs) return false;
  const boardEndMs = pricing.endOfIstDayMs(pricing.predictBoardDateIso(nowMs));
  return boardEndMs !== null && endMs >= boardEndMs;
}

class OrderCapError extends Error {}
class LinkClosedError extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

function createParentPayRoutes(deps = {}) {
  const {
    sendJson,
    verifiedCaller,
    adminFirestore,
    telemetry,
    env = process.env,
    fetchImpl = typeof fetch === 'function' ? fetch : null,
    now = () => Date.now(),
    foundingOfferOpen,
    /** async (uid) => display name | '' — the server's own record (firebase-admin), never the request. */
    getDisplayName = async () => '',
    tokenFactory = mintToken,
  } = deps;

  const rateLimiter = deps.rateLimiter || createParentPayLimiter({ telemetry, now });

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail a payment */
    }
  }

  function reject(res, scope, reason, status = 400) {
    emit(`payments.parent.${scope}.rejected.${reason}`);
    return sendJson(res, status, { ok: false, error: 'payment_rejected', reason });
  }

  function linkRefused(res, scope, reason) {
    emit(`payments.parent.${scope}.link_${reason}`);
    const status = reason === 'invalid' ? 404 : 410;
    return sendJson(res, status, { ok: false, error: 'link_unavailable', reason });
  }

  function readKeys() {
    const clean = (v) => String(v || '').trim();
    return { keyId: clean(env.RAZORPAY_KEY_ID), keySecret: clean(env.RAZORPAY_KEY_SECRET) };
  }

  function unavailable(res) {
    emit('payments.parent.unavailable');
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

  /** Same as payments.cjs fetchCapturedPayment: Razorpay's record, captured for the STORED amount. */
  async function fetchCapturedPayment(keys, paymentId, amountPaise) {
    const fetched = await razorpay(keys, 'GET', `/payments/${paymentId}`);
    if (!fetched.ok || !fetched.json) return { error: 'payment_fetch_failed' };
    let payment = fetched.json;
    if (payment.status === 'authorized') {
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

  /** The child's stored subscription (the server's own record). */
  async function readSubscription(uid) {
    const snap = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
    return snap && snap.exists ? snap.data() || {} : {};
  }

  /** The child's server prices right now, rupees. A pass that cannot be priced is null. */
  function pricesFrom(stored) {
    const prices = {};
    for (const passType of Object.keys(PASS_TYPES)) {
      try {
        prices[passType] = quotePass(stored, passType, now(), { foundingOfferOpen }).pricePaidInr;
      } catch {
        prices[passType] = null;
      }
    }
    return prices;
  }

  async function quotesFor(uid) {
    return pricesFrom(await readSubscription(uid));
  }

  /** The link for a token, or a refusal reason. `requireOpen` = may it start a payment now. */
  async function resolveLink(token, { requireOpen }) {
    if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) return { reason: 'invalid' };
    const linkId = linkIdOf(token);
    const ref = adminFirestore.collection(PARENT_PAY_LINKS_COLLECTION).doc(linkId);
    const snap = await ref.get();
    const link = snap && snap.exists ? snap.data() || {} : null;
    if (!link || typeof link.uid !== 'string' || !link.uid || link.uid === ERASED_UID) return { reason: 'invalid' };
    if (requireOpen) {
      if (link.status !== 'open') return { reason: 'used' };
      const exp = toMillis(link.expiresAt);
      if (exp === null || exp <= now()) return { reason: 'expired' };
    }
    return { linkId, ref, link };
  }

  /**
   * Has any order this link created already been paid (by verify or by the webhook)?
   * ★ Asked of `payOrders` BY `parentLinkId`, never of the link's own `orderIds` list: every
   * parent order is stored with its `parentLinkId` BEFORE Razorpay can see a payment for it,
   * so no order — whatever happened to the list — is invisible to this check.
   */
  async function linkAlreadyPaid(linkId) {
    const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).where('parentLinkId', '==', linkId).get();
    const docs = snap && Array.isArray(snap.docs) ? snap.docs : [];
    for (const doc of docs) {
      const order = typeof doc.data === 'function' ? doc.data() || {} : {};
      if (order.payer === PARENT_PAYER && order.status === 'paid') return doc.id;
    }
    return null;
  }

  /**
   * ★ ONE TRANSACTION reserves an order slot: the link is re-read inside it (still open,
   * unexpired) and its `orderSlots` count is checked against the cap and incremented
   * together, so parallel requests can never create more than MAX_ORDERS_PER_LINK orders.
   */
  async function reserveOrderSlot(ref) {
    await adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const link = snap && snap.exists ? snap.data() || {} : null;
      if (!link || link.status !== 'open') throw new LinkClosedError('used');
      const exp = toMillis(link.expiresAt);
      if (exp === null || exp <= now()) throw new LinkClosedError('expired');
      const listed = Array.isArray(link.orderIds) ? link.orderIds.length : 0;
      const slots = Number.isInteger(link.orderSlots) ? link.orderSlots : listed;
      if (slots >= MAX_ORDERS_PER_LINK) throw new OrderCapError('cap');
      tx.set(ref, { orderSlots: slots + 1 }, { merge: true });
    });
  }

  /** The order id joins the link's list in its own transaction — no read-then-write loss. */
  async function appendOrderId(ref, orderId) {
    await adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const link = snap && snap.exists ? snap.data() || {} : {};
      const ids = Array.isArray(link.orderIds) ? link.orderIds : [];
      if (!ids.includes(orderId)) tx.set(ref, { orderIds: [...ids, orderId] }, { merge: true });
    });
  }

  function admitParentCall(req, res, scope, reqPath) {
    if (!isParentPayEnabled(env)) {
      sendJson(res, 404, NOT_FOUND_BODY);
      return false;
    }
    // Signed out by construction: no uid (verified or header) keys this bucket.
    const verdict = rateLimiter.check(req, reqPath, '', { signedOut: true });
    if (!verdict.allowed) {
      emit(`payments.parent.${scope}.rate_limited`);
      sendJson(res, 429, { ok: false, error: 'Too many attempts. Please try again tomorrow.' });
      return false;
    }
    if (!adminFirestore) {
      unavailable(res);
      return false;
    }
    return true;
  }

  /* ── POST /api/pay/parent-link — the signed-in child mints a link ─────────── */
  async function handleMintLink(req, res) {
    if (!isParentPayEnabled(env)) return sendJson(res, 404, NOT_FOUND_BODY);
    const uid = await verifiedCaller.resolveVerifiedUid(req);
    if (!uid) return sendJson(res, 401, { ok: false, error: 'unauthenticated' });
    const verdict = rateLimiter.check(req, PARENT_LINK_PATH, uid);
    if (!verdict.allowed) {
      emit('payments.parent.link.rate_limited');
      return sendJson(res, 429, { ok: false, error: 'Too many links today. Please try again tomorrow.' });
    }
    const keys = readKeys();
    if (!keys.keyId || !keys.keySecret || !adminFirestore) return unavailable(res);

    let prices;
    try {
      prices = await quotesFor(uid);
    } catch (e) {
      emit('payments.parent.link.quote_failed');
      console.error('[pay/parent-link] quote failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not price a pass.' });
    }

    let firstName = '';
    try {
      firstName = firstNameOf(await getDisplayName(uid));
    } catch {
      firstName = '';
    }

    const token = tokenFactory();
    if (!TOKEN_PATTERN.test(token)) return sendJson(res, 500, { ok: false, error: 'Could not create a link.' });
    const createdMs = now();
    const expiresMs = createdMs + LINK_TTL_MS;
    try {
      await adminFirestore.collection(PARENT_PAY_LINKS_COLLECTION).doc(linkIdOf(token)).set({
        uid,
        firstName,
        status: 'open',
        createdAt: new Date(createdMs),
        expiresAt: new Date(expiresMs),
        orderIds: [],
        orderSlots: 0,
      });
    } catch (e) {
      emit('payments.parent.link.store_failed');
      console.error('[pay/parent-link] could not store the link:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not create a link.' });
    }
    emit('payments.parent.link.created');
    return sendJson(res, 200, { ok: true, token, expiresAt: new Date(expiresMs).toISOString(), prices });
  }

  /* ── POST /api/pay/parent/view — what the parent's page shows ─────────────── */
  async function handleView(req, res) {
    if (!admitParentCall(req, res, 'view', PARENT_VIEW_PATH)) return undefined;
    const body = await readJsonBody(req, res);
    if (!body) return undefined;
    let resolved;
    let prices;
    try {
      resolved = await resolveLink(body.token, { requireOpen: true });
      if (resolved.reason) return linkRefused(res, 'view', resolved.reason);
      const paidOrder = await linkAlreadyPaid(resolved.linkId);
      if (paidOrder) {
        await resolved.ref.set({ status: 'paid', paidOrderId: paidOrder }, { merge: true });
        return linkRefused(res, 'view', 'used');
      }
      const stored = await readSubscription(resolved.link.uid);
      // Already covered till the boards (by the child, or through another link): nothing to sell.
      if (coveredTillBoards(stored, now())) return linkRefused(res, 'view', COVERED_REASON);
      prices = pricesFrom(stored);
    } catch (e) {
      emit('payments.parent.view.failed');
      console.error('[pay/parent/view] failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not open this link.' });
    }
    emit('payments.parent.view.ok');
    return sendJson(res, 200, {
      ok: true,
      firstName: firstNameOf(resolved.link.firstName),
      prices,
      expiresAt: new Date(toMillis(resolved.link.expiresAt)).toISOString(),
    });
  }

  /* ── POST /api/pay/parent/order — an order bound to the CHILD's uid ───────── */
  async function handleOrder(req, res) {
    if (!admitParentCall(req, res, 'order', PARENT_ORDER_PATH)) return undefined;
    const keys = readKeys();
    if (!keys.keyId || !keys.keySecret) return unavailable(res);
    const body = await readJsonBody(req, res);
    if (!body) return undefined;
    const passType = body.passType;
    if (!Object.prototype.hasOwnProperty.call(PASS_TYPES, passType)) {
      return sendJson(res, 400, { ok: false, error: 'passType must be "month" or "till_boards"' });
    }

    let resolved;
    let quote;
    try {
      resolved = await resolveLink(body.token, { requireOpen: true });
      if (resolved.reason) return linkRefused(res, 'order', resolved.reason);
      const paidOrder = await linkAlreadyPaid(resolved.linkId);
      if (paidOrder) {
        await resolved.ref.set({ status: 'paid', paidOrderId: paidOrder }, { merge: true });
        return linkRefused(res, 'order', 'used');
      }
      const stored = await readSubscription(resolved.link.uid);
      if (coveredTillBoards(stored, now())) return linkRefused(res, 'order', COVERED_REASON);
      quote = quotePass(stored, passType, now(), { foundingOfferOpen });
      await reserveOrderSlot(resolved.ref);
    } catch (e) {
      if (e instanceof OrderCapError) return reject(res, 'order', 'too_many_orders', 429);
      if (e instanceof LinkClosedError) return linkRefused(res, 'order', e.reason);
      emit('payments.parent.order.prepare_failed');
      console.error('[pay/parent/order] could not prepare the order:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not price this pass.' });
    }
    const { linkId, ref, link } = resolved;
    const uid = link.uid;

    let created;
    try {
      created = await razorpay(keys, 'POST', '/orders', {
        amount: quote.amountPaise,
        currency: CURRENCY,
        notes: { uid, passType, offerKey: quote.offerKey, payer: PARENT_PAYER },
      });
    } catch (e) {
      emit('payments.parent.order.razorpay_unreachable');
      console.error('[pay/parent/order] razorpay unreachable:', e && e.message);
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
      emit('payments.parent.order.razorpay_refused');
      console.error('[pay/parent/order] razorpay refused the order, status', created.status);
      return sendJson(res, 502, { ok: false, error: 'Payment provider refused the order.' });
    }

    try {
      // Stored WITH its parentLinkId before the browser ever gets the order id — so
      // linkAlreadyPaid can always find it, whatever happens to the link's list.
      await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(order.id).set({
        uid,
        passType,
        amountPaise: quote.amountPaise,
        offerKey: quote.offerKey,
        status: 'created',
        createdAt: new Date(now()),
        payer: PARENT_PAYER,
        parentLinkId: linkId,
      });
      await appendOrderId(ref, order.id);
    } catch (e) {
      emit('payments.parent.order.store_failed');
      console.error('[pay/parent/order] could not store the order:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not record the order.' });
    }

    emit('payments.parent.order.created');
    return sendJson(res, 200, { ok: true, orderId: order.id, keyId: keys.keyId, amountPaise: quote.amountPaise });
  }

  /* ── POST /api/pay/parent/verify — every check, then the CHILD's grant ────── */
  async function handleVerify(req, res) {
    if (!admitParentCall(req, res, 'verify', PARENT_VERIFY_PATH)) return undefined;
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

    // 2. The link (NOT expiry-checked: a captured payment for a live-link order is honoured)
    //    and the stored order, which must be this link's, for this link's child.
    let resolved;
    let order;
    try {
      resolved = await resolveLink(body.token, { requireOpen: false });
      if (resolved.reason) return linkRefused(res, 'verify', resolved.reason);
      const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId).get();
      order = snap && snap.exists ? snap.data() || {} : null;
    } catch (e) {
      emit('payments.parent.verify.store_read_failed');
      console.error('[pay/parent/verify] read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not read the order.' });
    }
    if (!order) return reject(res, 'verify', 'unknown_order');
    if (order.payer !== PARENT_PAYER || order.parentLinkId !== resolved.linkId) return reject(res, 'verify', 'link_mismatch');
    if (order.uid !== resolved.link.uid) return reject(res, 'verify', 'uid_mismatch');
    if (!Number.isInteger(order.amountPaise) || order.amountPaise <= 0) return reject(res, 'verify', 'bad_order');

    // 3. What Razorpay says was actually paid.
    let result;
    try {
      result = await fetchCapturedPayment(keys, paymentId, order.amountPaise);
    } catch (e) {
      emit('payments.parent.verify.razorpay_unreachable');
      console.error('[pay/parent/verify] razorpay unreachable:', e && e.message);
      return sendJson(res, 502, { ok: false, error: 'Payment provider is unreachable.' });
    }
    if (result.error) {
      emit(`payments.parent.verify.${result.error}`);
      return sendJson(res, 502, { ok: false, error: 'Payment provider did not confirm the payment.' });
    }
    const payment = result.payment;
    if (payment.id !== undefined && payment.id !== paymentId) return reject(res, 'verify', 'payment_mismatch');
    if (payment.order_id !== orderId) return reject(res, 'verify', 'order_mismatch');
    if (payment.currency !== CURRENCY) return reject(res, 'verify', 'currency_mismatch');
    if (payment.amount !== order.amountPaise) return reject(res, 'verify', 'amount_mismatch');
    if (payment.status !== 'captured') return reject(res, 'verify', 'not_captured');

    // 4. The grant — to the ORDER's uid (the child's), idempotent, order paid in the same
    //    transaction. grantPass refuses an order whose uid is not the uid granted.
    let granted;
    try {
      granted = await grantPass(
        { uid: order.uid, passType: order.passType, paymentRef: paymentId, now: now() },
        { firestore: adminFirestore, payOrderId: orderId, foundingOfferOpen },
      );
    } catch (e) {
      if (e instanceof PassGrantInputError) return reject(res, 'verify', 'grant_refused');
      emit('payments.parent.verify.grant_failed');
      console.error('[pay/parent/verify] grant failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Pass grant failed' });
    }
    emit(granted.replayed ? 'payments.parent.verify.replayed' : 'payments.parent.verify.granted');

    // 5. The link is spent. Not part of the grant: if this write fails the link still
    //    refuses new orders, because order creation re-reads its orders' status.
    try {
      await resolved.ref.set({ status: 'paid', paidOrderId: orderId, paidAt: new Date(now()) }, { merge: true });
    } catch {
      emit('payments.parent.verify.link_close_failed');
    }

    // The parent learns the pass end date and the child's first name — never the uid.
    return sendJson(res, 200, {
      ok: true,
      replayed: granted.replayed,
      passEnd: granted.pass.passEnd,
      firstName: firstNameOf(resolved.link.firstName),
      amountPaise: order.amountPaise,
    });
  }

  return { handleMintLink, handleView, handleOrder, handleVerify, isEnabled: () => isParentPayEnabled(env) };
}

module.exports = {
  createParentPayRoutes,
  isParentPayEnabled,
  firstNameOf,
  linkIdOf,
  mintToken,
  PARENT_LINK_PATH,
  PARENT_VIEW_PATH,
  PARENT_ORDER_PATH,
  PARENT_VERIFY_PATH,
  PARENT_PAY_LINKS_COLLECTION,
  LINK_TTL_MS,
  MAX_ORDERS_PER_LINK,
  MAX_LINKS_PER_UID_PER_DAY,
  MAX_PARENT_CALLS_PER_CLIENT_PER_DAY,
  TOKEN_PATTERN,
  createParentPayLimiter,
  coveredTillBoards,
};
