'use strict';
// PACKS-SERVER-1 - grant a PDF pack for a verified Razorpay payment. Server-only; Admin SDK only.
//
//     packEntitlements/{uid}                     { updatedAt }  (so export / erase can walk to the subcollections)
//     packEntitlements/{uid}/packs/{packId}      { packId, sku, target, pricePaidInr, paidAt (ms), orderId,
//                                                  paymentRef, creditedToPass: false }
//     packEntitlements/{uid}/grants/{paymentRef} replay marker { paymentRef, packId, orderId, grantedAt }
//
// ★★ ONE TRANSACTION (the usageCredit.grantTopup pattern): the entitlement, the replay marker and the
//   order's created -> paid commit together or not at all. verify + webhook + status + retries therefore
//   grant a payment exactly once; a replay finds the marker and writes nothing but a missing "paid" flag.
// ★★ NOTHING THAT DECIDES MONEY IS TAKEN FROM THE CALLER. The sku, target and price are re-read from the
//   STORED payOrders document INSIDE the transaction (written only by handleOrder), and the stored amount
//   must equal the server price table, or the grant is refused.
// ★ A second, DIFFERENT payment for a pack the student already holds (two tabs, two orders) is a real
//   payment: its marker is recorded and its order marked paid, the existing entitlement is kept untouched
//   (paidAt / paymentRef of the first stay), and the result says `duplicate: true` so it can be refunded.

const {
  PACK_PRODUCTS,
  PACK_CHAPTERS,
  PACK_SUBJECTS,
  BUNDLE_TARGET,
  isPackProduct,
  validateTarget,
  packIdFor,
  chaptersOf,
  isAlreadyOwned,
} = require('./packProducts.cjs');
//
// PARENT-PACKS-1 review M1 (4 Nov 2026):
// ★ COVERED == DUPLICATE. A payment for a pack whose contents the student already holds through ANOTHER pack (a Chapter
//   Pack after the Subject Pack / Bundle; a Mock Pack after the Subject Pack ...) is the same thing as paying twice: inside
//   the SAME transaction the covering entitlements are read and `isAlreadyOwned` decides. Nothing new is granted, the
//   payment's marker and order carry `duplicate: true` (exactly the exact-repeat path above).
// ★ After any pack grant, the student's OPEN parent-pay PACK links whose pack is now covered are closed (`status: "owned"`),
//   so a parent opening one sees "already has it" instead of a Pay button (closeCoveredParentPackLinks; best effort).

const ENTITLEMENTS_COLLECTION = 'packEntitlements';
// Subcollection names live in an object (the usageCredit.cjs CREDIT_SEGMENTS convention): they are children of
// `packEntitlements/{uid}`, declared as subcollections in studentDataMap, not top-level collections.
const PACK_SEGMENTS = Object.freeze({ packs: 'packs', grants: 'grants' });
const PAY_ORDERS_COLLECTION = 'payOrders';
/** routes/parentPay.cjs PARENT_PAY_LINKS_COLLECTION (the same top-level collection; constant for the studentDataMap guard). */
const PARENT_PAY_LINKS_COLLECTION = 'parentPayLinks';
/** The link status a covered pack link is closed with (routes/parentPay.cjs answers it as reason "owned"). */
const LINK_OWNED_STATUS = 'owned';

/**
 * Every packId whose ownership can make (sku, target) "already owned" (packProducts.isAlreadyOwned) - read inside the grant
 * transaction. At most 31 documents (the Bundle). PURE.
 */
function coveringPackIds(sku, target) {
  const bundle = `pack_bundle:${BUNDLE_TARGET}`;
  const subjectIds = (s) => [`pack_subject:${s}`, `pack_mock:${s}`, ...chaptersOf(s).map((c) => `pack_chapter:${c}`)];
  if (sku === 'pack_chapter') return [`pack_chapter:${target}`, `pack_subject:${PACK_CHAPTERS[target]}`, bundle];
  if (sku === 'pack_mock') return [`pack_mock:${target}`, `pack_subject:${target}`, bundle];
  if (sku === 'pack_cbq') return [`pack_cbq:${target}`];
  if (sku === 'pack_subject') return [...subjectIds(target), bundle];
  return [bundle, ...PACK_SUBJECTS.flatMap(subjectIds)];
}

class PackGrantInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PackGrantInputError';
  }
}

const docId = (v) => (typeof v === 'string' && v.trim() && !v.includes('/') ? v.trim() : '');

function publicPack(p) {
  return {
    packId: p.packId,
    sku: p.sku,
    target: p.target,
    pricePaidInr: p.pricePaidInr,
    paidAt: p.paidAt,
    orderId: p.orderId,
  };
}

/**
 * @param {{ db: object, uid: string, order: { orderId: string }, paymentRef: string, nowMs: number }} input
 * @returns {Promise<{ replayed: boolean, duplicate: boolean, pack: object }>}
 */
async function grantPack(input) {
  const result = await grantPackInTransaction(input);
  // M1 (a): best effort, AFTER the grant committed - a failure here never fails a paid grant.
  try {
    await closeCoveredParentPackLinks(input.db, docId(input.uid), docId(input.order && input.order.orderId));
  } catch (_e) {
    /* the order route re-checks ownership anyway */
  }
  return result;
}

/**
 * PARENT-PACKS-1 review M1 (a): close this student's OPEN parent-pay PACK links whose pack is now covered by what the student
 * owns. Single-field query (uid) + in-code filter, like account export / erasure. Returns how many links were closed.
 * A link's in-flight order is still honoured by verify / the webhook (they do not require an open link); the grant then
 * reports `duplicate`.
 */
async function closeCoveredParentPackLinks(db, uid, exceptOrderId = '') {
  if (!db || !uid || typeof db.collection !== 'function') return 0;
  const linksSnap = await db.collection(PARENT_PAY_LINKS_COLLECTION).where('uid', '==', uid).get();
  const open = (linksSnap && Array.isArray(linksSnap.docs) ? linksSnap.docs : []).filter((d) => {
    const v = typeof d.data === 'function' ? d.data() || {} : {};
    // The link that created THIS order is not "covered" - it is being paid (verify / the webhook spends it as `paid`).
    if (exceptOrderId && Array.isArray(v.orderIds) && v.orderIds.includes(exceptOrderId)) return false;
    return v.status === 'open' && v.product === 'pack' && isPackProduct(v.packSku);
  });
  if (open.length === 0) return 0;
  const owned = await listPacks(db, uid);
  let closed = 0;
  for (const d of open) {
    const v = d.data() || {};
    if (!isAlreadyOwned(owned, v.packSku, v.packTarget)) continue;
    await db.collection(PARENT_PAY_LINKS_COLLECTION).doc(d.id).set({ status: LINK_OWNED_STATUS }, { merge: true });
    closed += 1;
  }
  return closed;
}

async function grantPackInTransaction(input) {
  const i = input && typeof input === 'object' ? input : {};
  const db = i.db;
  const uid = docId(i.uid);
  const paymentRef = docId(i.paymentRef);
  const orderId = docId(i.order && i.order.orderId);
  const nowMs = typeof i.nowMs === 'number' && Number.isFinite(i.nowMs) ? i.nowMs : null;
  if (!uid) throw new PackGrantInputError('uid must be a document id');
  if (!paymentRef) throw new PackGrantInputError('paymentRef must be a document id');
  if (!orderId) throw new PackGrantInputError('order.orderId must be a document id');
  if (nowMs === null) throw new PackGrantInputError('nowMs is required');
  if (!db || typeof db.runTransaction !== 'function') throw new Error('firebase-admin Firestore is unavailable');

  const userRef = db.collection(ENTITLEMENTS_COLLECTION).doc(uid);
  const grantRef = userRef.collection(PACK_SEGMENTS.grants).doc(paymentRef);
  const orderRef = db.collection(PAY_ORDERS_COLLECTION).doc(orderId);

  return db.runTransaction(async (tx) => {
    // Every read before any write (Firestore's transaction contract).
    const orderSnap = await tx.get(orderRef);
    const grantSnap = await tx.get(grantRef);

    if (!orderSnap || !orderSnap.exists) throw new PackGrantInputError('payment order not found');
    const order = orderSnap.data() || {};
    if (order.uid !== uid) throw new PackGrantInputError('payment order belongs to another account');
    if (!isPackProduct(order.passType)) throw new PackGrantInputError('payment order is not a pack order');
    const sku = order.passType;
    const target = validateTarget(sku, order.packTarget);
    const packId = packIdFor(sku, order.packTarget);
    if (target === null || packId === null) throw new PackGrantInputError('payment order has an invalid pack target');
    const priceInr = PACK_PRODUCTS[sku].priceInr;
    if (!Number.isInteger(order.amountPaise) || order.amountPaise !== priceInr * 100) {
      throw new PackGrantInputError('payment order amount does not match the pack price');
    }

    const markOrderPaid = (extra) => {
      if (order.status !== 'paid') {
        tx.set(orderRef, { status: 'paid', paymentId: paymentRef, paidAt: new Date(nowMs), ...(extra || {}) }, { merge: true });
      }
    };

    // A replay: this payment was already granted. Return what was granted; at most repair the order flag.
    if (grantSnap && grantSnap.exists) {
      const marker = grantSnap.data() || {};
      const markerPackId = typeof marker.packId === 'string' && marker.packId ? marker.packId : packId;
      const existingSnap = await tx.get(userRef.collection(PACK_SEGMENTS.packs).doc(markerPackId));
      markOrderPaid();
      const existing = existingSnap && existingSnap.exists ? existingSnap.data() || {} : null;
      return {
        replayed: true,
        duplicate: marker.duplicate === true,
        pack: existing
          ? publicPack(existing)
          : { packId: markerPackId, sku, target, pricePaidInr: priceInr, paidAt: nowMs, orderId },
      };
    }

    const packRef = userRef.collection(PACK_SEGMENTS.packs).doc(packId);
    const packSnap = await tx.get(packRef);
    const held = packSnap && packSnap.exists ? packSnap.data() || {} : null;
    // M1 (b): covered through ANOTHER pack the student holds (read in this transaction).
    let coveredBy = null;
    if (!held) {
      const owned = [];
      for (const id of coveringPackIds(sku, target)) {
        if (id === packId) continue;
        const snap = await tx.get(userRef.collection(PACK_SEGMENTS.packs).doc(id));
        if (snap && snap.exists) owned.push({ ...(snap.data() || {}), packId: id });
      }
      if (owned.length > 0 && isAlreadyOwned(owned, sku, target)) coveredBy = owned;
    }

    // The parent document exists so the account export / erase (which walk the map) find the student's packs.
    tx.set(userRef, { updatedAt: new Date(nowMs) }, { merge: true });
    // A payment for a pack the student already holds is real money: flag it on BOTH records (same
    // transaction) so refund candidates can be queried: grants where duplicate == true, payOrders likewise.
    const isDuplicate = !!held || !!coveredBy;
    tx.set(grantRef, { paymentRef, packId, orderId, grantedAt: new Date(nowMs), ...(isDuplicate ? { duplicate: true } : {}) });
    markOrderPaid(isDuplicate ? { duplicate: true } : undefined);
    if (held) {
      // Already owned through an earlier payment: keep that entitlement, record this payment for refund.
      return { replayed: false, duplicate: true, pack: publicPack(held) };
    }
    if (coveredBy) {
      // Already covered by another pack: nothing new is granted (no second entitlement); the payment is flagged above.
      return { replayed: false, duplicate: true, pack: { packId, sku, target, pricePaidInr: priceInr, paidAt: nowMs, orderId } };
    }
    const pack = {
      packId,
      sku,
      target,
      pricePaidInr: priceInr,
      paidAt: nowMs,
      orderId,
      paymentRef,
      creditedToPass: false,
    };
    tx.set(packRef, pack);
    return { replayed: false, duplicate: false, pack: publicPack(pack) };
  });
}

/** Every pack a student owns, oldest first. Throws if the read fails (callers decide how to fail). */
async function listPacks(db, uid) {
  const qs = await db.collection(ENTITLEMENTS_COLLECTION).doc(uid).collection(PACK_SEGMENTS.packs).get();
  const out = [];
  for (const d of qs.docs || []) {
    const p = d.data() || {};
    if (typeof p.packId !== 'string' || !p.packId) continue;
    out.push({
      packId: p.packId,
      sku: p.sku,
      target: p.target,
      pricePaidInr: p.pricePaidInr,
      paidAt: p.paidAt,
      orderId: p.orderId,
    });
  }
  out.sort((a, b) => (Number(a.paidAt) || 0) - (Number(b.paidAt) || 0) || (a.packId < b.packId ? -1 : 1));
  return out;
}

module.exports = {
  grantPack,
  closeCoveredParentPackLinks,
  coveringPackIds,
  LINK_OWNED_STATUS,
  listPacks,
  PackGrantInputError,
  ENTITLEMENTS_COLLECTION,
  PACK_SEGMENTS,
};
