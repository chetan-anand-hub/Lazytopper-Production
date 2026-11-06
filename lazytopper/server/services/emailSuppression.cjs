'use strict';
/**
 * emailSuppression.cjs - GUEST-ABANDON-1 review D1. ONE stop record per email ADDRESS, for people with or without an
 * account: `emailSuppression/{emailKey}` = { optedOut: true, optedOutAt, source }. Written by the guest checkout email's
 * stop link (/api/guest-email/unsubscribe). Read INSIDE the claim transaction of EVERY reminder / follow-up email
 * (trial-ending, every nudge phase in nudgeEmail.cjs, the guest abandoned-checkout email), so a stop really stops them.
 * Transactional mail (sign-in codes, payment receipts / invoices) answers a request and does not read it.
 *
 * `emailKey` = hex SHA-256 of a domain-separated, normalised address. Pseudonymous, not anonymous (anyone holding the
 * address can recompute it); deliberately NOT keyed with a secret, so rotating TRIAL_EMAIL_UNSUBSCRIBE_SECRET can never
 * silently drop a stop request. No raw address is stored. Kept on account erasure on purpose (studentDataMap.ts).
 * No other requires than guestPay.cjs (pure) - safe to load from trialEndingEmail.cjs without a cycle.
 */
const crypto = require('node:crypto');
const { normaliseEmail } = require('./guestPay.cjs');

const EMAIL_SUPPRESSION_COLLECTION = 'emailSuppression';

/** The address key, or null for a non-address. PURE. */
function emailKey(raw) {
  const e = normaliseEmail(raw);
  if (!e) return null;
  return crypto.createHash('sha256').update(`lazytopper-email-key:v1:${e}`).digest('hex');
}

/** The suppression doc ref for an address, or null (no usable address / no db). */
function suppressionRefFor(db, email) {
  const key = emailKey(email);
  return key && db ? db.collection(EMAIL_SUPPRESSION_COLLECTION).doc(key) : null;
}

/** Inside a transaction: is this address stopped? A missing address is not. */
async function isSuppressedTx(tx, db, email) {
  const ref = suppressionRefFor(db, email);
  if (!ref) return false;
  const s = await tx.get(ref);
  return !!(s && s.exists && (s.data() || {}).optedOut);
}

module.exports = { EMAIL_SUPPRESSION_COLLECTION, emailKey, suppressionRefFor, isSuppressedTx };
