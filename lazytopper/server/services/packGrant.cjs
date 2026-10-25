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

const { PACK_PRODUCTS, isPackProduct, validateTarget, packIdFor } = require('./packProducts.cjs');

const ENTITLEMENTS_COLLECTION = 'packEntitlements';
// Subcollection names live in an object (the usageCredit.cjs CREDIT_SEGMENTS convention): they are children of
// `packEntitlements/{uid}`, declared as subcollections in studentDataMap, not top-level collections.
const PACK_SEGMENTS = Object.freeze({ packs: 'packs', grants: 'grants' });
const PAY_ORDERS_COLLECTION = 'payOrders';

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

    // The parent document exists so the account export / erase (which walk the map) find the student's packs.
    tx.set(userRef, { updatedAt: new Date(nowMs) }, { merge: true });
    // A payment for a pack the student already holds is real money: flag it on BOTH records (same
    // transaction) so refund candidates can be queried: grants where duplicate == true, payOrders likewise.
    const isDuplicate = !!held;
    tx.set(grantRef, { paymentRef, packId, orderId, grantedAt: new Date(nowMs), ...(isDuplicate ? { duplicate: true } : {}) });
    markOrderPaid(isDuplicate ? { duplicate: true } : undefined);
    if (held) {
      // Already owned through an earlier payment: keep that entitlement, record this payment for refund.
      return { replayed: false, duplicate: true, pack: publicPack(held) };
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
  listPacks,
  PackGrantInputError,
  ENTITLEMENTS_COLLECTION,
  PACK_SEGMENTS,
};
