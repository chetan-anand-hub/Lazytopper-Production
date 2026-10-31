// STORED-RATE-1 — grant a paid pass. The ONLY writer of the pass fields.
//
// ★ WHAT A PASS IS. A student's paid access is stored on `subscriptions/{uid}` as:
//     tier: "premium", plan: "pass_month" | "pass_till_boards",
//     passType, passStart, passEnd, pricePaidInr, offerKey, foundingMember, lastPaymentRef
// firestore.rules refuse every CLIENT create or change of those seven pass fields, so
// they can only come from here, through the Admin SDK. The expiry is enforced by
// reading `passEnd` — see entitlement.cjs deriveEffectiveTier and
// subscriptionService.applyExpiry.
//
// ★★ NOTHING THAT DECIDES MONEY OR TIME COMES FROM THE CALLER. The input is
// {uid, passType, paymentRef, now}. The price, the offer, and both dates are computed
// here from the stored document and the server's own pricing mirror (passPricing.cjs).
// A caller that sends `pricePaidInr`, `passEnd` or `offerKey` is ignored, not obeyed.
//
// ★★ ONE TRANSACTION. Stacking reads the current `passEnd` and writes a later one; two
// grants that both read before either writes would each extend from the SAME old end
// and one payment would vanish. The read and the write are therefore a single
// Firestore transaction, which Firestore retries on contention.
//
// ★ IDEMPOTENT. Razorpay (and a nervous owner with curl) will deliver the same payment
// twice. If the stored `lastPaymentRef` equals this `paymentRef`, nothing is written
// and the stored pass is returned as-is.
//
// ★★ PAYMENT-LEVEL IDEMPOTENCY (RAZORPAY-1 · Z9). `lastPaymentRef` remembers only the
// LATEST payment, so payments A then B then a late webhook retry of A would grant A a
// second time. Every applied payment therefore also leaves a record at
// `subscriptions/{uid}/payments/{paymentRef}`, read and written INSIDE the same
// transaction as the pass: if that record exists the payment is a replay and nothing
// changes. When the grant comes from a checkout order (`payOrderId`), the order's
// `created -> paid` transition is written in that SAME transaction, so a grant and its
// order can never disagree. Only idempotency changed here — price and dates did not.

const pricing = require('./passPricing.cjs');
// PACK-CREDIT-1: the Board Pass order may carry a pack credit; the packs it names are marked credited in the
// grant transaction. Only the collection / segment names are taken from packGrant.
const { ENTITLEMENTS_COLLECTION, PACK_SEGMENTS } = require('./packGrant.cjs');
const { parseCreditIds, BOARD_PASS_TYPE } = require('./packCredit.cjs');

const FIRESTORE_COLLECTION = 'subscriptions';
/**
 * Subcollection / sibling-collection names. Held in an object on purpose, NOT as
 * top-level `.collection(CONST)` constants: the studentDataMap drift guard scans
 * `.collection(UPPER_CONST)` as a TOP-LEVEL collection, and `payments` is a
 * subcollection (mapped as `subscriptions.payments`). `payOrders` IS top-level and is
 * named where it is created (routes/payments.cjs), which the guard does see.
 */
const PAYMENT_SEGMENTS = Object.freeze({ payments: 'payments', payOrders: 'payOrders' });

const PASS_TYPES = Object.freeze({
  month: 'pass_month',
  till_boards: 'pass_till_boards',
});

/** The seven fields firestore.rules forbid a client to create or change. */
const PASS_FIELDS = Object.freeze([
  'passType',
  'passStart',
  'passEnd',
  'pricePaidInr',
  'offerKey',
  'foundingMember',
  'lastPaymentRef',
]);

const MAX_PAYMENT_REF_LENGTH = 200;

class PassGrantInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PassGrantInputError';
  }
}

/** Firestore Timestamp | Date | ISO string | {seconds} | ms -> epoch ms, or null. */
function toMillis(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') {
      try {
        const ms = value.toMillis();
        return Number.isFinite(ms) ? ms : null;
      } catch {
        return null;
      }
    }
    if (typeof value.toDate === 'function') {
      try {
        const ms = value.toDate().getTime();
        return Number.isFinite(ms) ? ms : null;
      } catch {
        return null;
      }
    }
    if (typeof value.seconds === 'number') return value.seconds * 1000;
  }
  return null;
}

function validateInput(input) {
  const src = input && typeof input === 'object' ? input : {};
  const uid = typeof src.uid === 'string' ? src.uid.trim() : '';
  if (!uid || uid.includes('/')) throw new PassGrantInputError('uid must be a non-empty document id');
  if (!Object.prototype.hasOwnProperty.call(PASS_TYPES, src.passType)) {
    throw new PassGrantInputError('passType must be "month" or "till_boards"');
  }
  const paymentRef = typeof src.paymentRef === 'string' ? src.paymentRef.trim() : '';
  if (!paymentRef || paymentRef.length > MAX_PAYMENT_REF_LENGTH) {
    throw new PassGrantInputError(`paymentRef must be a non-empty string of at most ${MAX_PAYMENT_REF_LENGTH} characters`);
  }
  // Z9: the paymentRef is now also a document id (subscriptions/{uid}/payments/{ref}).
  if (paymentRef.includes('/') || paymentRef === '.' || paymentRef === '..' || /^__.*__$/.test(paymentRef)) {
    throw new PassGrantInputError('paymentRef must be usable as a document id');
  }
  const nowMs = src.now === undefined ? Date.now() : toMillis(src.now);
  if (nowMs === null) throw new PassGrantInputError('now must be a valid instant');
  return { uid, passType: src.passType, paymentRef, nowMs };
}

/**
 * PURE. Given the stored document and a validated request, decide what to write.
 * `foundingOfferOpen` is a DEPENDENCY, never request input — it defaults to the calendar
 * (`pricing.foundingOfferOpen(nowMs)`, closed from 00:00 IST 1 Dec 2026 —
 * PRICING-1) and exists so the closed-offer state can be tested without editing pricing.
 * Returns { replay: true } when this payment was already applied, else { fields }.
 */
function computeGrant(stored, { passType, paymentRef, nowMs }, { foundingOfferOpen = pricing.foundingOfferOpen(nowMs) } = {}) {
  const current = stored && typeof stored === 'object' ? stored : {};

  if (current.lastPaymentRef === paymentRef) return { replay: true };

  // The offer. Founding while the offer is open, or for a student who already holds
  // it — `foundingMember` is sticky, so a founding student keeps the founding rate
  // after the cohort closes.
  const wasFounding = current.foundingMember === true;
  const offerKey = foundingOfferOpen || wasFounding ? 'founding' : 'regular';
  const founding = offerKey === 'founding';

  // A pass still running is extended, never overwritten.
  const storedEndMs = toMillis(current.passEnd);
  const unexpiredEndMs = storedEndMs !== null && storedEndMs > nowMs ? storedEndMs : null;

  let pricePaidInr;
  let passStartMs;
  let passEndMs;

  if (passType === 'month') {
    pricePaidInr = pricing.monthlyInrFor(founding);
    passStartMs = unexpiredEndMs !== null ? unexpiredEndMs : nowMs;
    passEndMs = pricing.addOneCalendarMonthIst(passStartMs);
  } else {
    const boardIso = pricing.predictBoardDateIso(nowMs);
    const quote = pricing.tillBoardsQuote(nowMs, boardIso, founding);
    const boardEndMs = pricing.endOfIstDayMs(boardIso);
    if (!quote || boardEndMs === null) throw new Error(`could not price a till-boards pass (board ${boardIso})`);
    pricePaidInr = quote.priceInr;
    passStartMs = nowMs;
    passEndMs = unexpiredEndMs !== null && unexpiredEndMs > boardEndMs ? unexpiredEndMs : boardEndMs;
  }

  if (!Number.isInteger(pricePaidInr) || pricePaidInr <= 0) {
    throw new Error(`computed price is not a positive integer: ${pricePaidInr}`);
  }

  return {
    replay: false,
    fields: {
      tier: 'premium',
      plan: PASS_TYPES[passType],
      passType,
      // Date objects: the Admin SDK stores a JS Date as a Firestore Timestamp.
      passStart: new Date(passStartMs),
      passEnd: new Date(passEndMs),
      pricePaidInr,
      offerKey,
      // Sticky: once true it is never written false.
      foundingMember: founding || wasFounding,
      lastPaymentRef: paymentRef,
    },
  };
}

/** The pass as JSON — what the admin route returns. */
function describePass(uid, data) {
  const doc = data && typeof data === 'object' ? data : {};
  const iso = (v) => {
    const ms = toMillis(v);
    return ms === null ? null : new Date(ms).toISOString();
  };
  return {
    uid,
    tier: doc.tier ?? null,
    plan: doc.plan ?? null,
    passType: doc.passType ?? null,
    passStart: iso(doc.passStart),
    passEnd: iso(doc.passEnd),
    pricePaidInr: doc.pricePaidInr ?? null,
    offerKey: doc.offerKey ?? null,
    foundingMember: doc.foundingMember === true,
    lastPaymentRef: doc.lastPaymentRef ?? null,
  };
}

/**
 * Grant a pass. `firestore` is firebase-admin's Firestore.
 *
 * @returns {Promise<{ replayed: boolean, pass: object }>}
 * @throws PassGrantInputError on bad input; any other error is an infrastructure fault.
 */
async function grantPass(input, { firestore, foundingOfferOpen, payOrderId } = {}) {
  const request = validateInput(input);
  if (!firestore || typeof firestore.runTransaction !== 'function') {
    throw new Error('firebase-admin Firestore is unavailable');
  }
  const hasOrder = payOrderId !== undefined && payOrderId !== null;
  const orderId = hasOrder ? String(payOrderId).trim() : '';
  if (hasOrder && (!orderId || orderId.includes('/'))) {
    throw new PassGrantInputError('payOrderId must be a document id');
  }
  const ref = firestore.collection(FIRESTORE_COLLECTION).doc(request.uid);
  const paymentDocRef = ref.collection(PAYMENT_SEGMENTS.payments).doc(request.paymentRef);
  const orderRef = hasOrder ? firestore.collection(PAYMENT_SEGMENTS.payOrders).doc(orderId) : null;

  return firestore.runTransaction(async (tx) => {
    // Every read before any write — Firestore's transaction contract.
    const snap = await tx.get(ref);
    const paymentSnap = await tx.get(paymentDocRef);
    const orderSnap = orderRef ? await tx.get(orderRef) : null;
    const stored = snap && snap.exists ? snap.data() || {} : {};
    // PACK-CREDIT-1: the packs this Board Pass order was credited with. The list comes from the STORED order
    // (written only by the order routes), never from a caller. Read here, before any write.
    const creditIds =
      orderSnap && orderSnap.exists && request.passType === BOARD_PASS_TYPE && Number((orderSnap.data() || {}).packCreditInr) > 0
        ? parseCreditIds((orderSnap.data() || {}).packCreditIds)
        : [];
    const packRefs = creditIds.map((id) =>
      firestore.collection(ENTITLEMENTS_COLLECTION).doc(request.uid).collection(PACK_SEGMENTS.packs).doc(id),
    );
    const packSnaps = [];
    for (const r of packRefs) packSnaps.push(await tx.get(r));

    let order = null;
    if (orderRef) {
      if (!orderSnap || !orderSnap.exists) throw new PassGrantInputError('payment order not found');
      order = orderSnap.data() || {};
      if (order.uid !== request.uid) throw new PassGrantInputError('payment order belongs to another account');
    }
    // created -> paid, in THIS transaction. An order already paid is never rewritten.
    const markOrderPaid = (extra) => {
      if (order && order.status !== 'paid') {
        tx.set(orderRef, { status: 'paid', paymentId: request.paymentRef, paidAt: new Date(request.nowMs), ...(extra || {}) }, { merge: true });
      }
    };

    // Z9: this payment was already applied — by any path, at any time. Nothing changes.
    if (paymentSnap && paymentSnap.exists) {
      markOrderPaid();
      return { replayed: true, pass: describePass(request.uid, stored) };
    }
    // PRICING-1 — the ORDER is the record of what was offered and charged. An order created at
    // 23:59 on 30 Nov and paid at 00:01 on 1 Dec was priced as a founding order and charged the
    // founding amount; the grant must record exactly that, not re-derive the offer from the
    // payment time. (An order without an `offerKey` — older ones, tests — falls back to the
    // dependency/calendar.)
    const orderOffer =
      order && (order.offerKey === 'founding' || order.offerKey === 'regular') ? order.offerKey === 'founding' : undefined;
    const decision = computeGrant(stored, request, {
      foundingOfferOpen: orderOffer !== undefined ? orderOffer : foundingOfferOpen,
    });
    // ...and the price recorded is the amount the order charged. A disagreement with the table
    // (a till-boards order that crossed a month boundary, a price change between order and
    // payment) must NEVER strand a payment Razorpay has already captured, so it is logged, not
    // thrown: the student paid the order's amount and that is what is recorded.
    if (!decision.replay && order && Number.isInteger(order.amountPaise) && order.amountPaise > 0 && order.amountPaise % 100 === 0) {
      const chargedInr = order.amountPaise / 100;
      // A credited Board Pass is expected to be charged the table price LESS its recorded credit.
      const expectedInr = decision.fields.pricePaidInr - (Number.isInteger(order.packCreditInr) && order.packCreditInr > 0 ? order.packCreditInr : 0);
      if (chargedInr !== expectedInr) {
        console.error('[passGrant] order amount differs from the price table:', orderId, chargedInr, decision.fields.pricePaidInr);
      }
      decision.fields.pricePaidInr = chargedInr;
    }
    if (decision.replay) {
      markOrderPaid();
      return { replayed: true, pass: describePass(request.uid, stored) };
    }
    tx.set(ref, decision.fields, { merge: true });
    tx.set(paymentDocRef, {
      passType: request.passType,
      pricePaidInr: decision.fields.pricePaidInr,
      grantedAt: new Date(request.nowMs),
    });

    // PACK-CREDIT-1 — mark exactly the packs this order was credited with, in THIS transaction. The money
    // was really paid, so the pass is granted whatever we find here: a pack that is missing, already credited
    // by a different order (two orders raced), or whose price disagrees with the recorded credit is a
    // CONFLICT - flagged on the order and surfaced to the route for a counter, never thrown.
    let packCredit = null;
    let orderExtra;
    if (creditIds.length > 0) {
      let conflict = false;
      let sumInr = 0;
      const marked = [];
      creditIds.forEach((id, idx) => {
        const ps = packSnaps[idx];
        const pk = ps && ps.exists ? ps.data() || {} : null;
        if (!pk) {
          conflict = true;
          return;
        }
        sumInr += Number.isInteger(pk.pricePaidInr) ? pk.pricePaidInr : 0;
        if (pk.creditedToPass === true && pk.creditedOrderId !== orderId) {
          conflict = true; // already spent against a different order
          return;
        }
        marked.push(id);
        tx.set(
          packRefs[idx],
          { creditedToPass: true, creditedOrderId: orderId, creditedAt: new Date(request.nowMs) },
          { merge: true },
        );
      });
      if (sumInr !== order.packCreditInr) conflict = true;
      packCredit = { conflict, markedIds: marked, creditInr: order.packCreditInr };
      if (conflict) orderExtra = { packCreditConflict: true };
    }
    markOrderPaid(orderExtra);
    if (orderExtra && order.status === 'paid') tx.set(orderRef, orderExtra, { merge: true });
    return {
      replayed: false,
      pass: describePass(request.uid, { ...stored, ...decision.fields }),
      ...(packCredit ? { packCredit } : {}),
    };
  });
}

/**
 * PRICE-FIXED-1 - has this account EVER PAID for a month pass? Derived ONLY on the server, from its own
 * records (never from a request field). True only when a `payOrders` document exists with this uid,
 * passType "month" and status "paid" - the record a real, verified payment leaves (a student's own checkout
 * or a parent's pay-link order, both stored against the CHILD's uid). An admin-granted month pass, a
 * ledger record without a paid order and a stored month `passType` are NOT a purchase (owner, review of
 * #1458: "a PAID month purchase"), so none of them keeps the month option open.
 * A read that fails THROWS: the caller refuses the order (fail closed) rather than guess either way.
 * An erased account's orders carry uid "erased" and cannot match.
 */
async function hasPaidMonthOrder(firestore, uid) {
  if (!firestore || typeof firestore.collection !== 'function') throw new Error('firebase-admin Firestore is unavailable');
  const id = typeof uid === 'string' ? uid.trim() : '';
  if (!id || id.includes('/')) return false;
  const orders = await firestore
    .collection(PAYMENT_SEGMENTS.payOrders)
    .where('uid', '==', id).where('passType', '==', 'month').where('status', '==', 'paid').limit(1).get();
  return !!orders && orders.empty === false;
}

/**
 * PRICE-FIXED-1 - may this account be SOLD a month pass at `nowMs`? Before the retirement instant
 * every account may; from it, only an account with a prior paid month order. Server clock, server data.
 * (A month order that was CREATED before the instant and is paid after it is still GRANTED: the money is
 * captured and grantPass never consults this - only the order routes do.)
 */
async function monthPassAvailableFor(firestore, uid, nowMs) {
  if (!pricing.monthPassRetired(nowMs)) return true;
  return hasPaidMonthOrder(firestore, uid);
}

/** A founding order stays payable this long after the offer closes (PRICING-1). */
const FOUNDING_ORDER_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * PRICING-1 — has a FOUNDING order outlived the offer by more than the grace window? True only
 * for an order that was priced while the offer was open (created before the close) and is
 * being paid 24 h or more after it. An order created after the close (a founder re-buying at
 * their locked rate) is never stale.
 */
function isStaleFoundingOrder(order, nowMs) {
  if (!order || order.offerKey !== 'founding') return false;
  const createdMs = toMillis(order.createdAt);
  if (createdMs === null) return false;
  return createdMs < pricing.FOUNDING_OFFER_CLOSES_AT_MS && nowMs >= pricing.FOUNDING_OFFER_CLOSES_AT_MS + FOUNDING_ORDER_GRACE_MS;
}

module.exports = {
  hasPaidMonthOrder,
  monthPassAvailableFor,
  isStaleFoundingOrder,
  FOUNDING_ORDER_GRACE_MS,
  grantPass,
  computeGrant,
  describePass,
  validateInput,
  toMillis,
  PassGrantInputError,
  PASS_FIELDS,
  PASS_TYPES,
  FIRESTORE_COLLECTION,
  PAYMENT_SEGMENTS,
};
