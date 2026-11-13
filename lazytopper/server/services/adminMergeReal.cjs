'use strict';
/**
 * adminMergeReal - ADMIN-MERGE-REAL-1: the admin "Merge accounts" tool for TWO REAL accounts (keep one, remove the other). The move itself
 * is adminMergeAccount.mergeAccount in `real` mode (the same transaction the payment-account merge uses). This file only RESOLVES an
 * account from what an admin types and DESCRIBES it (masked) so the admin sees both accounts before the typed confirmation.
 * Nothing here writes. Never returns a full email, a full phone number or a payment id.
 */
const { ENTITLEMENTS_COLLECTION, PACK_SEGMENTS } = require('./packGrant.cjs');
const { maskIndianMobile, maskEmail, normaliseEmail, normaliseIndianMobile } = require('./guestPay.cjs');
const { hasOwnActivity } = require('./adminMergeAccount.cjs');

const notFound = (e) => !!e && e.code === 'auth/user-not-found';

/** An admin types an email, an Indian mobile or an account id. Returns the Firebase user, or null. */
async function resolveAccount(fa, raw) {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (!v) return null;
  try {
    if (v.includes('@')) {
      const email = normaliseEmail(v);
      return email ? await fa.getUserByEmail(email) : null;
    }
    const phone = /^[+\d][\d\s-]{6,}$/.test(v) ? normaliseIndianMobile(v) : null;
    if (phone) return await fa.getUserByPhoneNumber(phone);
    if (/^[A-Za-z0-9_-]{3,128}$/.test(v)) return await fa.getUser(v);
    return null;
  } catch (e) {
    if (notFound(e)) return null;
    throw e;
  }
}

/** One account as the admin sees it before merging. Masked contacts only. */
async function describeAccount({ db, user }) {
  const uid = user.uid;
  const providers = (Array.isArray(user.providerData) ? user.providerData : []).map((p) => p && p.providerId).filter((x) => typeof x === 'string');
  const subSnap = await db.collection('subscriptions').doc(uid).get();
  const sub = subSnap && subSnap.exists ? subSnap.data() || {} : {};
  const packsSnap = await db.collection(ENTITLEMENTS_COLLECTION).doc(uid).collection(PACK_SEGMENTS.packs).get();
  const packs = (packsSnap && packsSnap.docs ? packsSnap.docs : []).map((d) => d.id).sort();
  const ordersSnap = await db.collection('payOrders').where('uid', '==', uid).get();
  const orders = (ordersSnap && ordersSnap.docs ? ordersSnap.docs : []).map((d) => (typeof d.data === 'function' ? d.data() || {} : {}));
  const passEndMs = sub.passEnd && typeof sub.passEnd.toMillis === 'function' ? sub.passEnd.toMillis() : sub.passEnd instanceof Date ? sub.passEnd.getTime() : typeof sub.passEnd === 'number' ? sub.passEnd : null;
  return {
    uid,
    email: typeof user.email === 'string' && user.email ? maskEmail(user.email) : '',
    phone: typeof user.phoneNumber === 'string' && user.phoneNumber ? maskIndianMobile(user.phoneNumber) : '',
    providers,
    disabled: user.disabled === true,
    plan: { tier: typeof sub.tier === 'string' ? sub.tier : '', passType: typeof sub.passType === 'string' ? sub.passType : '', passEndMs },
    packs,
    paidOrders: orders.filter((o) => o.status === 'paid' || o.status === 'claimed').length,
    hasStudyData: await hasOwnActivity(db, uid),
  };
}

/**
 * Open (unexpired) parent-pay links minted by this account. A parent who pays one AFTER the merge would have the purchase granted to the
 * removed account, which no longer exists - so the admin is warned before merging. Read-only; 0 when the read fails (a warning, not a gate).
 */
async function pendingParentLinks({ db, uid, nowMs = Date.now() }) {
  try {
    const snap = await db.collection('parentPayLinks').where('uid', '==', uid).get();
    const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : v instanceof Date ? v.getTime() : typeof v === 'number' ? v : 0);
    return (snap && snap.docs ? snap.docs : []).filter((d) => {
      const l = typeof d.data === 'function' ? d.data() || {} : {};
      return l.status === 'open' && ms(l.expiresAt) > nowMs;
    }).length;
  } catch {
    return 0;
  }
}

module.exports = { resolveAccount, describeAccount, pendingParentLinks };
