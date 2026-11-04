'use strict';
// PAY-PHONE-1 - the shared, route-free half of "Pay now with your phone number".
//
// Kept apart from routes/guestPay.cjs so routes/payments.cjs (the webhook) can mark a guest order paid without a
// require cycle (routes/guestPay.cjs itself requires payments.cjs for the pure payment helpers).
//
// ★★ A GUEST ORDER IS NEVER GRANTED HERE. A verified, captured payment for a `payer: "guest"` order only moves the
// order `created -> paid_unclaimed` and records the payment id. The grant (grantPass / grantPack) runs later, in
// routes/guestPay.cjs handleClaim, for the uid whose VERIFIED Firebase token carries the same phone number.

const PAY_ORDERS_COLLECTION = 'payOrders';
const GUEST_PAYER = 'guest';
const GUEST_STATUS = Object.freeze({ created: 'created', paidUnclaimed: 'paid_unclaimed', claimed: 'claimed', paid: 'paid' });

/** Same truthy grammar as every other server switch. */
function isGuestPayFlagOn(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.GUEST_PAY_ENABLED) || '').trim());
}

/**
 * CHECKOUT-WHO-1 - the server switch for "Who will use it?" (a recipient phone and/or email on a guest order, signed-out
 * payers and signed-in "someone else" payers alike). Same truthy grammar. Off -> the guest routes behave exactly as before.
 */
function isCheckoutWhoFlagOn(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.CHECKOUT_WHO_ENABLED) || '').trim());
}

/**
 * PAY-ACCOUNT-1 - the server switch for "pay first, the account is made for them": after a VERIFIED recipient payment for
 * someone with no account, the server creates the Firebase account and grants to it. Same truthy grammar. Off -> exactly
 * CHECKOUT-WHO's behaviour (the order waits `paid_unclaimed` for a claim).
 */
function isPayAutoAccountFlagOn(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.PAY_AUTO_ACCOUNT_ENABLED) || '').trim());
}

/**
 * CHECKOUT-WHO-1 - an email address as the claim key: trimmed, lower-cased, at most 254 characters, one `@`, a dotted
 * domain with a 2+ letter TLD, no spaces / angle brackets / quotes. Anything else -> null. (Firebase compares sign-in
 * emails case-insensitively; storing the lower-cased form makes the claim query an exact match.)
 */
const EMAIL_SHAPE = /^[^\s@<>()",;:]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
function normaliseEmail(raw) {
  if (typeof raw !== 'string') return null;
  const e = raw.trim().toLowerCase();
  if (!e || e.length > 254 || !EMAIL_SHAPE.test(e)) return null;
  return e;
}

/** `an••••@gmail.com`: the first two characters of the local part, then dots, then the domain. Not an email -> ''. */
function maskEmail(raw) {
  const e = normaliseEmail(typeof raw === 'string' ? raw : '');
  if (!e) return '';
  const at = e.indexOf('@');
  return `${e.slice(0, Math.min(2, at))}••••${e.slice(at)}`;
}

/**
 * An Indian mobile number as E.164 (`+91` + 10 digits starting 6-9), or null. Accepts the 10 digits alone, or with a
 * leading `+91` / `91` / `0`, and ignores spaces and dashes. Anything else (letters, other country codes, landlines,
 * 9 or 11 digits) is null.
 */
function normaliseIndianMobile(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 20 || /[^0-9+\s-]/.test(trimmed)) return null;
  let digits = trimmed.replace(/[\s-]/g, '');
  if (digits.startsWith('+')) {
    if (!digits.startsWith('+91')) return null;
    digits = digits.slice(3);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return /^[6-9][0-9]{9}$/.test(digits) ? `+91${digits}` : null;
}

/** `+91 98•••••948`: the first two and last three digits only. Anything that is not an E.164 Indian mobile -> ''. */
function maskIndianMobile(e164) {
  const n = normaliseIndianMobile(typeof e164 === 'string' ? e164 : '');
  if (!n) return '';
  const d = n.slice(3);
  return `+91 ${d.slice(0, 2)}•••••${d.slice(7)}`;
}

/**
 * `created -> paid_unclaimed` for a guest order, in one transaction. Idempotent: an order already past `created`
 * (paid_unclaimed, claimed, paid) is left exactly as it is. Refuses (returns { ok:false }) anything that is not a
 * guest order. The CALLER has already run every payment check; this only records the outcome.
 *
 * @returns {Promise<{ ok: boolean, changed: boolean, status?: string, reason?: string }>}
 */
async function markGuestOrderPaid(db, { orderId, paymentId, nowMs }) {
  if (!db || typeof db.runTransaction !== 'function') throw new Error('firebase-admin Firestore is unavailable');
  const ref = db.collection(PAY_ORDERS_COLLECTION).doc(orderId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const order = snap && snap.exists ? snap.data() || {} : null;
    if (!order) return { ok: false, changed: false, reason: 'unknown_order' };
    if (order.payer !== GUEST_PAYER) return { ok: false, changed: false, reason: 'not_guest' };
    if (order.status !== GUEST_STATUS.created) {
      // Already recorded (verify + webhook both arrive): a DIFFERENT payment id for the same order is reported, never
      // written over the first one.
      const same = typeof order.paymentId !== 'string' || order.paymentId === paymentId;
      return { ok: true, changed: false, status: order.status, ...(same ? {} : { reason: 'other_payment' }) };
    }
    tx.set(ref, { status: GUEST_STATUS.paidUnclaimed, paymentId, guestPaidAt: new Date(nowMs) }, { merge: true });
    return { ok: true, changed: true, status: GUEST_STATUS.paidUnclaimed };
  });
}

module.exports = {
  PAY_ORDERS_COLLECTION,
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
};
