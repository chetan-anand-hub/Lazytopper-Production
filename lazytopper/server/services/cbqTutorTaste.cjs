'use strict';
// CBQ-TUTOR-TASTE-1 - a student who has PAID for a CBQ Pack and is not Premium gets 3 tutor questions in total
// (lifetime, not per day), so they can feel the tutor. Server-only; Admin SDK only.
//
//   packEntitlements/{uid}                 { cbqTutorTasteUsed: <0..3>, updatedAt }   (the existing per-uid parent document)
//   packEntitlements/{uid}/packs/{packId}  { sku: "pack_cbq", ... }                   (written ONLY by packGrant.grantPack)
//
// ★ ADDITIVE AND NARROW. This module never reads or writes a subscription, trial or pass document and never
//   grants Premium; it only answers "may this one tutor turn go ahead?". Ownership is read from the pack
//   entitlement a verified Razorpay payment wrote; the count lives on the same server-only parent document.
//   No new collection, no firestore.rules change (the Admin SDK bypasses rules; clients cannot reach either path).
// ★ NOTHING IS TAKEN FROM THE REQUEST. The caller passes the VERIFIED uid; the client cannot send, raise or
//   reset the count.
// ★ ONE TRANSACTION. Ownership and the count are read and the count is incremented together, so two parallel
//   turns cannot both spend the same question: exactly 3 turns are ever admitted.
// ★ FAILS CLOSED. Any read or transaction failure answers "not allowed" - the normal Premium lock - never a free turn.

// The collection / subcollection names come from packGrant.cjs (the one place that writes them), so the
// student-data drift guard sees no second declaration.
const { ENTITLEMENTS_COLLECTION, PACK_SEGMENTS } = require('./packGrant.cjs');
const PACKS_SEGMENT = PACK_SEGMENTS.packs;
const USED_FIELD = 'cbqTutorTasteUsed';
const CBQ_SKU = 'pack_cbq';
const CBQ_TUTOR_TASTE_LIMIT = 3;

const docId = (v) => (typeof v === 'string' && v.trim() && !v.includes('/') ? v.trim() : '');

/** A stored count as a whole number in 0..LIMIT. Anything else (missing, negative, text) reads as 0 used... except
 *  a larger number, which reads as fully used. PURE. */
function usedFrom(raw) {
  const n = raw && typeof raw === 'object' ? raw[USED_FIELD] : undefined;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return 0;
  return Math.min(CBQ_TUTOR_TASTE_LIMIT, Math.floor(n));
}

/** True when the pack documents include a paid CBQ Pack. PURE. */
function ownsCbqPack(packDocs) {
  for (const d of packDocs || []) {
    const p = d && typeof d.data === 'function' ? d.data() || {} : {};
    if (p.sku === CBQ_SKU && typeof p.packId === 'string' && p.packId) return true;
  }
  return false;
}

function view(owned, used) {
  const u = Math.max(0, Math.min(CBQ_TUTOR_TASTE_LIMIT, used));
  return { owned, used: u, left: owned ? CBQ_TUTOR_TASTE_LIMIT - u : 0, limit: CBQ_TUTOR_TASTE_LIMIT };
}

/**
 * @param {{ adminFirestore: object|null, telemetry?: object|null, now?: () => number }} deps
 */
function createCbqTutorTaste(deps = {}) {
  const { adminFirestore = null, telemetry = null, now = () => Date.now() } = deps;
  const emit = (e) => {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(e);
    } catch {
      /* telemetry never blocks */
    }
  };

  /** Read-only: { owned, used, left, limit } for the verified uid, or null when it cannot be read. */
  async function status(uid) {
    const id = docId(uid);
    if (!id || !adminFirestore || typeof adminFirestore.collection !== 'function') return null;
    try {
      const userRef = adminFirestore.collection(ENTITLEMENTS_COLLECTION).doc(id);
      const packs = await userRef.collection(PACKS_SEGMENT).get();
      const owned = ownsCbqPack(packs && packs.docs);
      if (!owned) return view(false, 0);
      const snap = await userRef.get();
      return view(true, usedFrom(snap && snap.exists ? snap.data() || {} : {}));
    } catch {
      emit('cbq_tutor_taste.read_failed');
      return null;
    }
  }

  /**
   * Spend ONE tutor question if the uid owns a CBQ Pack and has used fewer than 3.
   * Never throws. { allowed, owned, used, left, limit } - `owned` is false when it is unknown (failure).
   */
  async function tryConsume(uid) {
    const id = docId(uid);
    const closed = { allowed: false, owned: false, ...view(false, 0) };
    if (!id || !adminFirestore || typeof adminFirestore.runTransaction !== 'function') return closed;
    try {
      const userRef = adminFirestore.collection(ENTITLEMENTS_COLLECTION).doc(id);
      const out = await adminFirestore.runTransaction(async (tx) => {
        // Every read before any write (Firestore's transaction contract).
        const packsSnap = await tx.get(userRef.collection(PACKS_SEGMENT));
        const userSnap = await tx.get(userRef);
        if (!ownsCbqPack(packsSnap && packsSnap.docs)) return { allowed: false, ...view(false, 0) };
        const used = usedFrom(userSnap && userSnap.exists ? userSnap.data() || {} : {});
        if (used >= CBQ_TUTOR_TASTE_LIMIT) return { allowed: false, ...view(true, used) };
        tx.set(userRef, { [USED_FIELD]: used + 1, updatedAt: new Date(now()) }, { merge: true });
        return { allowed: true, ...view(true, used + 1) };
      });
      emit(out.allowed ? 'cbq_tutor_taste.used' : out.owned ? 'cbq_tutor_taste.exhausted' : 'cbq_tutor_taste.not_owner');
      return out;
    } catch {
      emit('cbq_tutor_taste.consume_failed');
      return closed;
    }
  }

  /**
   * Give back ONE question that THIS request spent (the caller calls it at most once, only for a request whose
   * tryConsume returned allowed, when the tutor ended non-2xx). Never below 0. Never throws.
   * It restores only what was taken, so it cannot create a turn the student did not already hold.
   */
  async function refund(uid) {
    const id = docId(uid);
    if (!id || !adminFirestore || typeof adminFirestore.runTransaction !== 'function') return false;
    try {
      const userRef = adminFirestore.collection(ENTITLEMENTS_COLLECTION).doc(id);
      const done = await adminFirestore.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        const used = usedFrom(userSnap && userSnap.exists ? userSnap.data() || {} : {});
        if (used <= 0) return false;
        tx.set(userRef, { [USED_FIELD]: used - 1, updatedAt: new Date(now()) }, { merge: true });
        return true;
      });
      if (done) emit('cbq_tutor_taste.refunded');
      return done;
    } catch {
      emit('cbq_tutor_taste.refund_failed');
      return false;
    }
  }

  return { status, tryConsume, refund };
}

module.exports = {
  createCbqTutorTaste,
  usedFrom,
  ownsCbqPack,
  USED_FIELD,
  CBQ_SKU,
  CBQ_TUTOR_TASTE_LIMIT,
};
