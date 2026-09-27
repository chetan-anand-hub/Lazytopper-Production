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

const pricing = require('./passPricing.cjs');

const FIRESTORE_COLLECTION = 'subscriptions';

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
  const nowMs = src.now === undefined ? Date.now() : toMillis(src.now);
  if (nowMs === null) throw new PassGrantInputError('now must be a valid instant');
  return { uid, passType: src.passType, paymentRef, nowMs };
}

/**
 * PURE. Given the stored document and a validated request, decide what to write.
 * `foundingOfferOpen` is a DEPENDENCY, never request input — it defaults to the shipped
 * flag and exists so the closed-offer state can be tested without editing pricing.
 * Returns { replay: true } when this payment was already applied, else { fields }.
 */
function computeGrant(stored, { passType, paymentRef, nowMs }, { foundingOfferOpen = pricing.FOUNDING_OFFER_OPEN } = {}) {
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
async function grantPass(input, { firestore, foundingOfferOpen } = {}) {
  const request = validateInput(input);
  if (!firestore || typeof firestore.runTransaction !== 'function') {
    throw new Error('firebase-admin Firestore is unavailable');
  }
  const ref = firestore.collection(FIRESTORE_COLLECTION).doc(request.uid);

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const stored = snap && snap.exists ? snap.data() || {} : {};
    const decision = computeGrant(stored, request, { foundingOfferOpen });
    if (decision.replay) return { replayed: true, pass: describePass(request.uid, stored) };
    tx.set(ref, decision.fields, { merge: true });
    return { replayed: false, pass: describePass(request.uid, { ...stored, ...decision.fields }) };
  });
}

module.exports = {
  grantPass,
  computeGrant,
  describePass,
  validateInput,
  toMillis,
  PassGrantInputError,
  PASS_FIELDS,
  PASS_TYPES,
  FIRESTORE_COLLECTION,
};
