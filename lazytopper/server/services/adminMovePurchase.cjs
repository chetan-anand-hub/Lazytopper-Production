'use strict';
/**
 * adminMovePurchase - ADMIN-MOVE-1. An admin moves ONE paid PDF-pack purchase from the account that holds it to another
 * account (a signed-out self-pay lands on a phone-created uid; the student then signs in with Google = a different uid).
 *
 * ★ ONE Firestore transaction, every read before any write. It moves exactly what packGrant.cjs wrote:
 *     packEntitlements/{uid}/packs/{packId}      the entitlement (copied UNCHANGED: paidAt, price, orderId, paymentRef, ...)
 *     packEntitlements/{uid}/grants/{paymentRef} the replay marker (copied UNCHANGED)
 *   plus the order's `uid` (the holder field the admin Purchases row reads) and one `adminMoves` audit record.
 * ★ It never touches payment state (status, paymentId, paidAt, amount), the GST invoice, or pack-credit numbers.
 * ★ The audit record holds uids only - no phone, no email.
 * ★ Idempotent: repeating a finished move answers ok and writes nothing.
 * ★ Board Pass orders are NOT moved here: a pass lives on subscriptions/{uid} as merged, stackable fields with no
 *   per-order record to lift out, so a faithful move is not defined by the stored shape. They answer 400.
 *
 * packGrant.cjs is read-only here: only its exported constants / coveringPackIds are reused.
 */
const { ENTITLEMENTS_COLLECTION, PACK_SEGMENTS, coveringPackIds } = require('./packGrant.cjs');
const { isPackProduct, packIdFor, validateTarget, isAlreadyOwned } = require('./packProducts.cjs');

const PAY_ORDERS_COLLECTION = 'payOrders';
const ADMIN_MOVES_COLLECTION = 'adminMoves';
const MOVE_REASON = 'admin move';

class MoveError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'MoveError';
    this.status = status;
  }
}

const docId = (v) => (typeof v === 'string' && v.trim() && !v.includes('/') && v.trim() !== '.' && v.trim() !== '..' ? v.trim() : '');

/**
 * SIGNED-IN-MOVE-1 reuses this SAME transaction for a buyer's own one-time move (routes/moveToOther.cjs): `byUid` (the buyer)
 * instead of `adminUid`, `reason`, a `guard(order, srcPack)` that runs INSIDE the transaction (the 24 h / moved-before /
 * ownership refusals can then never race the move), and `orderPatch` (fields merged onto the order in the same transaction).
 *
 * @param {{ db: object, orderId: string, toUid: string, adminUid?: string, byUid?: string, reason?: string, guard?: Function, orderPatch?: object, nowMs: number }} input   toUid is already resolved.
 * @returns {Promise<{ moved: boolean, fromUid: string, toUid: string, packId: string }>}
 */
async function movePackOrder(input) {
  const i = input && typeof input === 'object' ? input : {};
  const db = i.db;
  const orderId = docId(i.orderId);
  const toUid = docId(i.toUid);
  const adminUid = docId(i.adminUid);
  const byUid = docId(i.byUid);
  const reason = typeof i.reason === 'string' && i.reason ? i.reason : MOVE_REASON;
  const guard = typeof i.guard === 'function' ? i.guard : null;
  const orderPatch = i.orderPatch && typeof i.orderPatch === 'object' ? i.orderPatch : null;
  if (!orderId) throw new MoveError(400, 'orderId must be a document id');
  if (!toUid) throw new MoveError(400, 'target account is invalid');
  if (!adminUid && !byUid) throw new MoveError(400, 'admin uid missing');
  if (!db || typeof db.runTransaction !== 'function') throw new Error('firebase-admin Firestore is unavailable');
  const nowMs = typeof i.nowMs === 'number' && Number.isFinite(i.nowMs) ? i.nowMs : Date.now();

  const orderRef = db.collection(PAY_ORDERS_COLLECTION).doc(orderId);
  const entRef = (uid) => db.collection(ENTITLEMENTS_COLLECTION).doc(uid);
  const packRef = (uid, id) => entRef(uid).collection(PACK_SEGMENTS.packs).doc(id);
  const markerRef = (uid, ref) => entRef(uid).collection(PACK_SEGMENTS.grants).doc(ref);

  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap || !orderSnap.exists) throw new MoveError(404, 'Order not found');
    const order = orderSnap.data() || {};
    const paymentRef = docId(order.paymentId);
    if (order.status !== 'paid' || !paymentRef) throw new MoveError(400, 'That order is not a paid order');
    if (!isPackProduct(order.passType)) throw new MoveError(400, 'Only PDF-pack orders can be moved (Board Pass orders are not supported)');
    const target = validateTarget(order.passType, order.packTarget);
    const packId = packIdFor(order.passType, order.packTarget);
    if (target === null || packId === null) throw new MoveError(400, 'That order has an invalid pack target');
    const fromUid = docId(order.uid);
    if (!fromUid) throw new MoveError(400, 'That order is not on an account yet');

    // Reads - all before any write.
    const targetPackSnap = await tx.get(packRef(toUid, packId));
    const targetPack = targetPackSnap && targetPackSnap.exists ? targetPackSnap.data() || {} : null;

    if (fromUid === toUid) {
      // Replay of a finished move (or a move onto the account it is already on): ok only if the entitlement is there.
      if (targetPack && targetPack.orderId === orderId) return { moved: false, fromUid, toUid, packId };
      throw new MoveError(409, 'That account already holds this order but has no pack from it');
    }
    if (targetPack && targetPack.orderId === orderId) return { moved: false, fromUid, toUid, packId };

    const srcPackSnap = await tx.get(packRef(fromUid, packId));
    const srcPack = srcPackSnap && srcPackSnap.exists ? srcPackSnap.data() || {} : null;
    if (!srcPack || srcPack.orderId !== orderId) throw new MoveError(409, 'The current holder has no pack from this order to move');
    if (srcPack.creditedToPass === true) throw new MoveError(409, 'This pack was credited to a Board Pass order and cannot be moved');
    if (guard) guard(order, srcPack);
    const srcMarkerSnap = await tx.get(markerRef(fromUid, paymentRef));
    const srcMarker = srcMarkerSnap && srcMarkerSnap.exists ? srcMarkerSnap.data() || {} : null;
    const tgtMarkerSnap = await tx.get(markerRef(toUid, paymentRef));

    if (targetPack) throw new MoveError(409, 'That account already has it');
    if (tgtMarkerSnap && tgtMarkerSnap.exists) throw new MoveError(409, 'That account already has it');
    const covering = [];
    for (const id of coveringPackIds(order.passType, target)) {
      if (id === packId) continue;
      const s = await tx.get(packRef(toUid, id));
      if (s && s.exists) covering.push({ ...(s.data() || {}), packId: id });
    }
    if (covering.length > 0 && isAlreadyOwned(covering, order.passType, target)) throw new MoveError(409, 'That account already has it');

    // Writes.
    tx.set(packRef(toUid, packId), srcPack);
    if (srcMarker) tx.set(markerRef(toUid, paymentRef), srcMarker);
    tx.set(entRef(toUid), { updatedAt: new Date(nowMs) }, { merge: true });
    tx.delete(packRef(fromUid, packId));
    if (srcMarker) tx.delete(markerRef(fromUid, paymentRef));
    tx.set(orderRef, { uid: toUid, ...(orderPatch || {}) }, { merge: true });
    tx.set(db.collection(ADMIN_MOVES_COLLECTION).doc(), { at: new Date(nowMs), ...(adminUid ? { adminUid } : { byUid }), orderId, fromUid, toUid, reason });
    return { moved: true, fromUid, toUid, packId };
  });
}

module.exports = { movePackOrder, MoveError, ADMIN_MOVES_COLLECTION, MOVE_REASON };
