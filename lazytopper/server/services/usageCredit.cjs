'use strict';
// TOPUP-1 - extra-usage CREDIT. Server-only; built DARK (PAYMENTS_ENABLED AND TOPUP_ENABLED).
//
// A top-up pack is a one-time Razorpay payment that adds AI-usage credit. Credit is held in MICRO-INR
// (the unit usageLedger.cjs already meters in), in ONE server-only document per student:
//
//     usageCredits/{uid}                 { balanceMicroInr, boughtMicroInr, spentMicroInr, expiredMicroInr,
//                                          expiresAtMs, holds: [{ id, amountMicroInr, expiresAtMs }], updatedAt }
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
//
// ★★ RACE-SAFE ADMISSION (FU-TOPUP-RACE). Admitting a request on credit is `reserveCredit`: ONE Firestore
//   transaction that RE-READS the document, refuses when the AVAILABLE balance (balance minus the live
//   holds of requests already admitted) does not cover the estimate, and otherwise records a HOLD for the
//   estimate. Two parallel requests therefore cannot both be admitted on the same credit: the second
//   transaction either sees the first's hold or is retried by Firestore after the first commits, and then
//   sees it. The metered cost (`chargeCredit`) later draws the balance down and shrinks that hold by the
//   same amount. A hold lapses by itself after CREDIT_HOLD_TTL_MS (a request that failed, or whose cost came
//   in under the estimate, never locks credit away for longer than that) - no end-of-request hook needed.

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

/** Payments AND top-ups both on (the same grammar as routes/payments.cjs isPaymentsEnabled + isTopupEnabled). */
function isTopupLive(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.PAYMENTS_ENABLED) || '').trim()) && isTopupFlagOn(env);
}

/** The instant credit bought at `nowMs` stops counting: the end of the predicted board day (IST). */
function creditExpiryMs(nowMs) {
  const iso = predictBoardDateIso(nowMs);
  return iso ? endOfIstDayMs(iso) : null;
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** How long an admission HOLD keeps its credit set aside before it lapses by itself (see the header). */
const CREDIT_HOLD_TTL_MS = 15 * 60 * 1000;
/** A ceiling on stored holds, so a burst can never grow the document without bound (oldest dropped first). */
const MAX_HOLDS = 50;

/** The holds still in force at `nowMs` (positive amount, not lapsed), well-formed only. Pure. */
function activeHolds(stored, nowMs) {
  const list = stored && Array.isArray(stored.holds) ? stored.holds : [];
  return list
    .filter((h) => h && typeof h.id === 'string' && num(h.amountMicroInr) > 0 && num(h.expiresAtMs) > nowMs)
    .map((h) => ({ id: h.id, amountMicroInr: Math.floor(num(h.amountMicroInr)), expiresAtMs: num(h.expiresAtMs) }));
}

/** The live view of a stored credit document at `nowMs`. Pure. */
function describeCredit(stored, nowMs) {
  const d = stored && typeof stored === 'object' ? stored : {};
  const expiresAtMs = typeof d.expiresAtMs === 'number' && Number.isFinite(d.expiresAtMs) ? d.expiresAtMs : null;
  const expired = expiresAtMs !== null && nowMs > expiresAtMs;
  const stock = Math.max(0, num(d.balanceMicroInr));
  const balanceMicroInr = expired ? 0 : stock;
  const holds = expired ? [] : activeHolds(d, nowMs);
  const heldMicroInr = holds.reduce((s, h) => s + h.amountMicroInr, 0);
  return {
    balanceMicroInr,
    // What a NEW request may be admitted against: the balance less what admitted requests have set aside.
    availableMicroInr: Math.max(0, balanceMicroInr - heldMicroInr),
    heldMicroInr,
    holds,
    expired,
    expiredMicroInr: num(d.expiredMicroInr) + (expired ? stock : 0),
    boughtMicroInr: num(d.boughtMicroInr),
    boughtBaseMicroInr: num(d.boughtBaseMicroInr),
    boughtBonusMicroInr: num(d.boughtBonusMicroInr),
    spentMicroInr: num(d.spentMicroInr),
    expiresAtMs,
  };
}

/**
 * The student-facing view of live credit: percentages and counts only - NEVER a rupee figure (TOPUP-1 §2.5).
 * `leftPct` is the share of everything bought that is still unspent (0-100); the `about*` counts come from the
 * same cost table as the pack sheet, AT `nowMs` (the model price in force when the student looks - so from
 * 2027-01-01 the grading counts halve with gemini-3.8-flash's price). Paper counts are ESTIMATES (D97).
 * Null when nothing was ever bought.
 */
function creditView(live, nowMs) {
  if (!live || !(num(live.boughtMicroInr) > 0)) return null;
  const { aboutCountFor } = require('./passPricing.cjs');
  const left = num(live.balanceMicroInr);
  const per = (a) => aboutCountFor(left, a, nowMs);
  return {
    leftPct: Math.max(0, Math.min(100, Math.floor((left / live.boughtMicroInr) * 100))),
    aboutChecks: per('answer_check'),
    aboutTutorMessages: per('tutor_message'),
    aboutChapterTests: per('chapter_test_grading'),
    aboutFullMocks: per('full_mock_grading'),
    aboutWorksheets: per('worksheet_grading'),
    // The three paper counts are estimates, not measurements: the client must show them as "about N".
    papersAreEstimates: true,
    expiresAt: live.expiresAtMs !== null ? new Date(live.expiresAtMs).toISOString() : null,
    expired: live.expired,
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
 * ★★ FU-TOPUP-RACE. Admit ONE request on credit, atomically: re-read the document INSIDE a transaction,
 * refuse when the AVAILABLE balance (balance less live holds) does not cover `amountMicroInr`, otherwise
 * record a hold for it. Never throws; any failure is a refusal (fail CLOSED to the normal limit answer).
 * @returns {Promise<{ reserved: boolean, holdId: string|null }>}
 */
async function reserveCredit({ uid, amountMicroInr, nowMs, holdId }, { firestore } = {}) {
  const amount = Math.max(0, Math.ceil(num(amountMicroInr)));
  const id = typeof holdId === 'string' && holdId ? holdId : require('node:crypto').randomUUID();
  if (!uid || amount <= 0 || !Number.isFinite(nowMs) || !firestore || typeof firestore.runTransaction !== 'function') {
    return { reserved: false, holdId: null };
  }
  const creditRef = firestore.collection(CREDIT_COLLECTION).doc(uid);
  try {
    return await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(creditRef);
      const stored = snap && snap.exists ? snap.data() || {} : null;
      const live = describeCredit(stored, nowMs);
      if (!creditCovers(live.availableMicroInr, amount)) return { reserved: false, holdId: null };
      const holds = [...live.holds, { id, amountMicroInr: amount, expiresAtMs: nowMs + CREDIT_HOLD_TTL_MS }].slice(-MAX_HOLDS);
      // `holds` is an ARRAY, so a merge replaces it whole: lapsed holds are pruned on every write.
      tx.set(creditRef, { holds, updatedAt: new Date(nowMs) }, { merge: true });
      return { reserved: true, holdId: id };
    });
  } catch {
    return { reserved: false, holdId: null };
  }
}

/**
 * Charge the ACTUAL metered cost of a served call to credit (never more than the balance; never below 0),
 * and shrink the request's own hold (`holdId`) by the same amount. The window bars are not touched by this -
 * that is the caller's rule: credit is spent only at cap.
 * @returns {Promise<{ charged: number }>}
 */
async function chargeCredit({ uid, amountMicroInr, nowMs, holdId }, { firestore } = {}) {
  const amount = Math.max(0, Math.floor(num(amountMicroInr)));
  if (!uid || amount <= 0 || !firestore || typeof firestore.runTransaction !== 'function') return { charged: 0 };
  const creditRef = firestore.collection(CREDIT_COLLECTION).doc(uid);
  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(creditRef);
    const stored = snap && snap.exists ? snap.data() || {} : null;
    const live = describeCredit(stored, nowMs);
    const charged = Math.min(live.balanceMicroInr, amount);
    if (charged <= 0) return { charged: 0 };
    const holds = live.holds
      .map((h) => (holdId && h.id === holdId ? { ...h, amountMicroInr: h.amountMicroInr - charged } : h))
      .filter((h) => h.amountMicroInr > 0);
    tx.set(
      creditRef,
      { balanceMicroInr: live.balanceMicroInr - charged, spentMicroInr: live.spentMicroInr + charged, holds, updatedAt: new Date(nowMs) },
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
  isTopupLive,
  creditExpiryMs,
  describeCredit,
  creditCovers,
  creditView,
  CREDIT_HOLD_TTL_MS,
  activeHolds,
  grantTopup,
  readCredit,
  reserveCredit,
  chargeCredit,
  TOPUP_PRODUCTS,
};
