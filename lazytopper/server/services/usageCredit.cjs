'use strict';
// TOPUP-1 - extra-usage CREDIT. Server-only; built DARK (PAYMENTS_ENABLED AND TOPUP_ENABLED).
//
// A top-up pack is a one-time Razorpay payment that adds AI-usage credit. Credit is held in MICRO-INR
// (the unit usageLedger.cjs already meters in), in ONE server-only document per student:
//
//     usageCredits/{uid}                 { balanceMicroInr, boughtMicroInr, spentMicroInr, expiredMicroInr,
//                                          expiresAtMs, updatedAt }
//     usageCredits/{uid}/grants/{payId}  { productKey, creditMicroInr, priceInr, orderId, grantedAt }
//
// ★ NO CLIENT PATH WRITES OR READS THIS COLLECTION. It is written with the Admin SDK only (firestore.rules
//   is not touched - its default is deny for a collection it never names) and read by the student only
//   through GET /api/usage/me, which reports a PERCENTAGE / "about N" figure, never rupees (the spec).
//
// ★ IDEMPOTENT ON THE PAYMENT ID. The grant, the balance change and the order's created -> paid are ONE
//   transaction (the grantPass pattern); a replay of verify or the webhook finds `grants/{payId}` and
//   changes nothing.
//
// ★ EXPIRY. Credit lasts until the student's predicted board date (the SAME predictor the till-boards pass
//   uses: passPricing.predictBoardDateIso). After that it is ignored - never silently deleted: the
//   remainder moves to `expiredMicroInr` the next time the document is written, and admin can read it.

const {
  TOPUP_PRODUCTS,
  topupCreditFor,
  isTopupProduct,
  predictBoardDateIso,
  endOfIstDayMs,
} = require('./passPricing.cjs');

const CREDIT_COLLECTION = 'usageCredits';
const CREDIT_SEGMENTS = Object.freeze({ grants: 'grants' });
const PAY_ORDERS_COLLECTION = 'payOrders';

class TopupInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TopupInputError';
  }
}

/** The TOPUP_ENABLED half of the dark switch (payments.cjs ANDs it with PAYMENTS_ENABLED). */
function isTopupFlagOn(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.TOPUP_ENABLED) || '').trim());
}

/** The instant credit bought at `nowMs` stops counting: the end of the predicted board day (IST). */
function creditExpiryMs(nowMs) {
  const iso = predictBoardDateIso(nowMs);
  return iso ? endOfIstDayMs(iso) : null;
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** The live view of a stored credit document at `nowMs`. Pure. */
function describeCredit(stored, nowMs) {
  const d = stored && typeof stored === 'object' ? stored : {};
  const expiresAtMs = typeof d.expiresAtMs === 'number' && Number.isFinite(d.expiresAtMs) ? d.expiresAtMs : null;
  const expired = expiresAtMs !== null && nowMs > expiresAtMs;
  const stock = Math.max(0, num(d.balanceMicroInr));
  return {
    balanceMicroInr: expired ? 0 : stock,
    expired,
    expiredMicroInr: num(d.expiredMicroInr) + (expired ? stock : 0),
    boughtMicroInr: num(d.boughtMicroInr),
    boughtBaseMicroInr: num(d.boughtBaseMicroInr),
    boughtBonusMicroInr: num(d.boughtBonusMicroInr),
    spentMicroInr: num(d.spentMicroInr),
    expiresAtMs,
  };
}

/** Does the balance cover a request's cost estimate? Never true for a zero / negative balance. */
function creditCovers(balanceMicroInr, estimateMicroInr) {
  return num(balanceMicroInr) > 0 && num(balanceMicroInr) >= Math.max(0, num(estimateMicroInr));
}

function validateGrant(input) {
  const i = input && typeof input === 'object' ? input : {};
  const uid = typeof i.uid === 'string' ? i.uid.trim() : '';
  if (!uid || uid.includes('/')) throw new TopupInputError('uid must be a document id');
  if (!isTopupProduct(i.productKey)) throw new TopupInputError('unknown top-up product');
  const paymentRef = typeof i.paymentRef === 'string' ? i.paymentRef.trim() : '';
  if (!paymentRef || paymentRef.includes('/')) throw new TopupInputError('paymentRef must be a document id');
  const orderId = typeof i.orderId === 'string' ? i.orderId.trim() : '';
  if (!orderId || orderId.includes('/')) throw new TopupInputError('orderId must be a document id');
  const nowMs = typeof i.nowMs === 'number' && Number.isFinite(i.nowMs) ? i.nowMs : null;
  if (nowMs === null) throw new TopupInputError('nowMs is required');
  return { uid, productKey: i.productKey, paymentRef, orderId, nowMs, bonus: i.bonus };
}

/**
 * Add a pack's credit for a verified payment. ONE transaction: the grant record, the balance and the
 * order's created -> paid. Idempotent on `paymentRef`.
 * @returns {Promise<{ replayed: boolean, credit: object }>}
 */
async function grantTopup(input, { firestore } = {}) {
  const request = validateGrant(input);
  if (!firestore || typeof firestore.runTransaction !== 'function') {
    throw new Error('firebase-admin Firestore is unavailable');
  }
  const product = TOPUP_PRODUCTS[request.productKey];
  // Base and bonus are computed ONCE here and recorded separately (the margin stays visible).
  const credit = topupCreditFor(request.productKey, request.nowMs, request.bonus);
  const creditRef = firestore.collection(CREDIT_COLLECTION).doc(request.uid);
  const grantRef = creditRef.collection(CREDIT_SEGMENTS.grants).doc(request.paymentRef);
  const orderRef = firestore.collection(PAY_ORDERS_COLLECTION).doc(request.orderId);

  return firestore.runTransaction(async (tx) => {
    // Every read before any write (Firestore's transaction contract).
    const creditSnap = await tx.get(creditRef);
    const grantSnap = await tx.get(grantRef);
    const orderSnap = await tx.get(orderRef);
    const stored = creditSnap && creditSnap.exists ? creditSnap.data() || {} : {};

    if (!orderSnap || !orderSnap.exists) throw new TopupInputError('payment order not found');
    const order = orderSnap.data() || {};
    if (order.uid !== request.uid) throw new TopupInputError('payment order belongs to another account');
    if (order.passType !== request.productKey) throw new TopupInputError('payment order is for another product');
    const markOrderPaid = () => {
      if (order.status !== 'paid') {
        tx.set(orderRef, { status: 'paid', paymentId: request.paymentRef, paidAt: new Date(request.nowMs) }, { merge: true });
      }
    };

    if (grantSnap && grantSnap.exists) {
      markOrderPaid();
      return { replayed: true, credit: describeCredit(stored, request.nowMs) };
    }

    const live = describeCredit(stored, request.nowMs);
    const fields = {
      // An expired remainder is kept on the document (admin can see it), never silently dropped.
      balanceMicroInr: live.balanceMicroInr + credit.totalMicroInr,
      boughtMicroInr: live.boughtMicroInr + credit.totalMicroInr,
      boughtBaseMicroInr: live.boughtBaseMicroInr + credit.baseMicroInr,
      boughtBonusMicroInr: live.boughtBonusMicroInr + credit.bonusMicroInr,
      spentMicroInr: live.spentMicroInr,
      expiredMicroInr: live.expiredMicroInr,
      expiresAtMs: creditExpiryMs(request.nowMs),
      updatedAt: new Date(request.nowMs),
    };
    tx.set(creditRef, fields, { merge: true });
    tx.set(grantRef, {
      productKey: request.productKey,
      creditMicroInr: credit.totalMicroInr,
      baseMicroInr: credit.baseMicroInr,
      bonusMicroInr: credit.bonusMicroInr,
      bonusPercent: credit.bonusPercent,
      priceInr: product.priceInr,
      orderId: request.orderId,
      grantedAt: new Date(request.nowMs),
    });
    markOrderPaid();
    return { replayed: false, credit: describeCredit({ ...stored, ...fields }, request.nowMs) };
  });
}

/** Read a student's live credit. Never throws: an unreadable document is "no credit". */
async function readCredit(firestore, uid, nowMs) {
  try {
    const snap = await firestore.collection(CREDIT_COLLECTION).doc(uid).get();
    return describeCredit(snap && snap.exists ? snap.data() : null, nowMs);
  } catch {
    return describeCredit(null, nowMs);
  }
}

/**
 * Charge the ACTUAL metered cost of a served call to credit (never more than the balance; never below 0).
 * The window bars are not touched by this - that is the caller's rule: credit is spent only at cap.
 * @returns {Promise<{ charged: number }>}
 */
async function chargeCredit({ uid, amountMicroInr, nowMs }, { firestore } = {}) {
  const amount = Math.max(0, Math.floor(num(amountMicroInr)));
  if (!uid || amount <= 0 || !firestore || typeof firestore.runTransaction !== 'function') return { charged: 0 };
  const creditRef = firestore.collection(CREDIT_COLLECTION).doc(uid);
  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(creditRef);
    const stored = snap && snap.exists ? snap.data() || {} : null;
    const live = describeCredit(stored, nowMs);
    const charged = Math.min(live.balanceMicroInr, amount);
    if (charged <= 0) return { charged: 0 };
    tx.set(
      creditRef,
      { balanceMicroInr: live.balanceMicroInr - charged, spentMicroInr: live.spentMicroInr + charged, updatedAt: new Date(nowMs) },
      { merge: true },
    );
    return { charged };
  });
}

module.exports = {
  CREDIT_COLLECTION,
  CREDIT_SEGMENTS,
  TopupInputError,
  isTopupFlagOn,
  creditExpiryMs,
  describeCredit,
  creditCovers,
  grantTopup,
  readCredit,
  chargeCredit,
  TOPUP_PRODUCTS,
};
