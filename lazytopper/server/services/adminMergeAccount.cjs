'use strict';
/**
 * adminMergeAccount - ADMIN-MOVE-1 (scope change, owner 12 Nov 2026): an admin MERGES the account a signed-out self-pay created at
 * payment (uid `pay-...`, packGrant/guestPay AUTO_ACCOUNT_UID_PREFIX) into the student's real account, so she can sign in with either
 * her phone or her email and see what she paid for.
 *
 * ★ NEVER two real accounts. Only a source whose uid starts with `pay-` (created by the server at payment, nothing else makes one)
 *   AND that has no activity of its own beyond its purchases is merged; anything else is a 409 with the reason.
 * ★ Order of effects: (1) ONE Firestore transaction moves every entitlement (packs + replay markers, the Board Pass subscription doc +
 *   its payment records), re-points EVERY order of the source to the target, and writes the audit/replay record
 *   `adminMoves/merge-{fromUid}` (uids only); (2) Firebase Auth: the phone number leaves the source and is set on the target
 *   (refused up front if the target already has a DIFFERENT phone; restored on the source if setting it on the target fails);
 *   (3) the source Auth user is DISABLED (never deleted - audit / rollback) and tagged mergedInto.
 * ★ Idempotent: the audit record is the replay key; a repeat re-checks (2) and (3) and writes nothing in Firestore.
 * ★ Never touches payment state, the GST invoice or pack-credit numbers; only each order's `uid` changes.
 * ★ Not supported (409): a source holding top-up credit (usageCredits) - a stack of spend with no safe move.
 */
const { ENTITLEMENTS_COLLECTION, PACK_SEGMENTS, coveringPackIds } = require('./packGrant.cjs');
const { isAlreadyOwned, parsePackId, isPackProduct } = require('./packProducts.cjs');
const { MoveError, ADMIN_MOVES_COLLECTION } = require('./adminMovePurchase.cjs');

const PAY_ORDERS_COLLECTION = 'payOrders';
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
const AUTO_ACCOUNT_UID_PREFIX = 'pay-';
const MERGE_REASON = 'admin merge';
const REAL_REASON = 'admin merge real';
const BUYER_REASON = 'buyer put it on this account';
const mergeDocId = (fromUid) => `merge-${fromUid}`;
const PASS_FIELDS = Object.freeze(['tier', 'plan', 'passType', 'passStart', 'passEnd', 'pricePaidInr', 'offerKey', 'foundingMember', 'lastPaymentRef']);
/** Student-activity locations keyed by uid (studentDataMap), i.e. everything a real student leaves besides purchases. */
const ACTIVITY_COLLECTIONS = Object.freeze([
  'users', 'learnerProfiles', 'sessionRecords', 'practiceInsights', 'mockScoreHistory', 'weakAreaSummary', 'topicMastery',
  'learnerProgress', 'srSchedules', 'learningPaths', 'dashboardPrefs', 'tutorSessions', 'usageLedger', 'activityLog', 'gradingResults',
]);
const CREDIT_COLLECTION = 'usageCredits';
// a SUBcollection of subscriptions/{uid} (studentDataMap: subscriptions.payments) - held in an object so the drift guard does not read it as top-level
const SUB_SEGMENTS = Object.freeze({ payments: 'payments' });

const docId = (v) => (typeof v === 'string' && v.trim() && !v.includes('/') && v.trim() !== '.' && v.trim() !== '..' ? v.trim() : '');
const notFound = (e) => !!e && e.code === 'auth/user-not-found';

async function hasAnything(db, collection, uid) {
  const ref = db.collection(collection).doc(uid);
  const snap = await ref.get();
  if (snap && snap.exists) return true;
  if (typeof ref.listCollections === 'function') {
    const subs = await ref.listCollections();
    if (Array.isArray(subs) && subs.length > 0) return true;
  }
  return false;
}

/**
 * @param {{ db: object, auth: object, fromUid: string, toUid: string, adminUid: string, nowMs?: number }} input  auth = firebaseAdmin.auth()
 * @returns {Promise<{ merged: boolean, replayed: boolean, fromUid: string, toUid: string, phoneMoved: boolean }>}
 */
async function mergeAccount(input) {
  const i = input && typeof input === 'object' ? input : {};
  const { db, auth } = i;
  const fromUid = docId(i.fromUid);
  const toUid = docId(i.toUid);
  const adminUid = docId(i.adminUid);
  if (!fromUid) throw new MoveError(400, 'fromUid must be an account id');
  if (!toUid || !adminUid) throw new MoveError(400, 'target account is invalid');
  if (fromUid === toUid) throw new MoveError(400, 'Cannot merge an account into itself');
  // PUT-ON-THIS-ACCOUNT-1: `purchasesOnly` moves the purchases and orders ONLY - no Firebase Auth call at all (the phone stays where
  // it is, nothing is disabled). Used when the BUYER (not an admin) puts a purchase on the account they are signed in with: a phone
  // number typed at a checkout is never moved onto another account by a buyer's say-so.
  const purchasesOnly = i.purchasesOnly === true;
  // `onlyOrderId` (+ `onlyPaymentRef`): the buyer's proof covers ONE order, so the account may hold nothing else (a pay- account can also
  // hold later orders delivered to that phone, e.g. a parent's "someone else" purchase). Anything else on it is refused, nothing moves.
  const onlyOrderId = purchasesOnly && typeof i.onlyOrderId === 'string' && i.onlyOrderId ? i.onlyOrderId : '';
  const onlyPaymentRef = onlyOrderId && typeof i.onlyPaymentRef === 'string' ? i.onlyPaymentRef : '';
  if (!db || typeof db.runTransaction !== 'function' || (!auth && !purchasesOnly)) throw new Error('firebase-admin is unavailable');
  const nowMs = typeof i.nowMs === 'number' && Number.isFinite(i.nowMs) ? i.nowMs : Date.now();
  // ADMIN-MERGE-REAL-1: `real` merges TWO REAL accounts (neither is a pay- account); `dryRun` runs every check and writes nothing.
  const real = i.real === true;
  if (real && purchasesOnly) throw new Error('mergeAccount: `real` and `purchasesOnly` are mutually exclusive');
  const dryRun = real && i.dryRun === true;

  if (real) {
    if (fromUid.startsWith(AUTO_ACCOUNT_UID_PREFIX) || toUid.startsWith(AUTO_ACCOUNT_UID_PREFIX)) throw new MoveError(409, 'This merges two real accounts. An account created at payment uses the payment-account merge');
    if (adminUid === fromUid) throw new MoveError(409, 'You cannot remove your own account');
  } else if (!fromUid.startsWith(AUTO_ACCOUNT_UID_PREFIX)) throw new MoveError(409, 'Only an account created at payment can be merged (this one is a real account)');

  let srcUser = null;
  if (!purchasesOnly) try {
    srcUser = await auth.getUser(fromUid);
  } catch (e) {
    if (notFound(e)) {
      // A real merge that already finished and removed the account: the audit record is the proof, so a repeat is a no-op.
      if (real) {
        const done = await db.collection(ADMIN_MOVES_COLLECTION).doc(mergeDocId(fromUid)).get();
        const d = done && done.exists ? done.data() || {} : null;
        if (d && d.toUid === toUid) return { merged: false, replayed: true, fromUid, toUid, phoneMoved: false, removedAlready: true };
        if (d && d.toUid !== toUid) throw new MoveError(409, 'That account was already merged into a different account');
      }
      throw new MoveError(404, 'That source account does not exist');
    }
    throw e;
  }
  let tgtUser = null;
  if (!purchasesOnly) try {
    tgtUser = await auth.getUser(toUid);
  } catch (e) {
    if (notFound(e)) throw new MoveError(404, 'No LazyTopper account with that email/phone — ask them to sign in once first');
    throw e;
  }

  const markerRef = db.collection(ADMIN_MOVES_COLLECTION).doc(mergeDocId(fromUid));
  const markerSnap = await markerRef.get();
  const marker = markerSnap && markerSnap.exists ? markerSnap.data() || {} : null;
  if (marker && marker.toUid !== toUid) throw new MoveError(409, 'That account was already merged into a different account');
  const replayed = !!marker;

  if (!replayed) {
    // A real student's study data is not merged (it stays under the old id, untouched); only a pay- account must be empty of it.
    if (!real) for (const c of ACTIVITY_COLLECTIONS) {
      if (await hasAnything(db, c, fromUid)) throw new MoveError(409, 'That account has activity of its own, so it is not merged automatically');
    }
    if (await hasAnything(db, CREDIT_COLLECTION, fromUid)) throw new MoveError(409, 'That account holds top-up credit, which cannot be merged automatically');
  }

  const srcPhone = srcUser && typeof srcUser.phoneNumber === 'string' && srcUser.phoneNumber ? srcUser.phoneNumber : '';
  const tgtPhone = tgtUser && typeof tgtUser.phoneNumber === 'string' && tgtUser.phoneNumber ? tgtUser.phoneNumber : '';
  if (!real && srcPhone && tgtPhone && srcPhone !== tgtPhone) throw new MoveError(409, 'The target account already has a different phone number');

  let moved = false;
  if (!replayed) {
    // Order ids are listed first (a query cannot run in a transaction on every SDK); each is re-read, and re-checked, inside it.
    const ordersSnap = await db.collection(PAY_ORDERS_COLLECTION).where('uid', '==', fromUid).get();
    const orderIds = (ordersSnap && ordersSnap.docs ? ordersSnap.docs : []).map((d) => d.id);
    // MONEY / GST (real merge): an order the removed account PAID for (payerUid) but that sits on another uid (a parent paying for a child) is
    // owned by payerUid for its invoice, and listed by payerUid. It moves to the kept account too, or the invoice would point at a deleted login.
    let payerOnlyIds = [];
    if (real) {
      const payerSnap = await db.collection(PAY_ORDERS_COLLECTION).where('payerUid', '==', fromUid).get();
      payerOnlyIds = (payerSnap && payerSnap.docs ? payerSnap.docs : []).map((d) => d.id).filter((id) => !orderIds.includes(id));
    }
    const ent = (uid) => db.collection(ENTITLEMENTS_COLLECTION).doc(uid);
    const sub = (uid) => db.collection(SUBSCRIPTIONS_COLLECTION).doc(uid);

    await db.runTransaction(async (tx) => {
      // Reads - all before any write.
      const srcPacks = await tx.get(ent(fromUid).collection(PACK_SEGMENTS.packs));
      const srcMarkers = await tx.get(ent(fromUid).collection(PACK_SEGMENTS.grants));
      const tgtPacks = await tx.get(ent(toUid).collection(PACK_SEGMENTS.packs));
      const tgtMarkers = await tx.get(ent(toUid).collection(PACK_SEGMENTS.grants));
      const srcSub = await tx.get(sub(fromUid));
      const srcSubPays = await tx.get(sub(fromUid).collection(SUB_SEGMENTS.payments));
      const tgtSub = await tx.get(sub(toUid));
      const orderSnaps = [];
      for (const id of orderIds) orderSnaps.push(await tx.get(db.collection(PAY_ORDERS_COLLECTION).doc(id)));
      const payerSnaps = [];
      for (const id of payerOnlyIds) payerSnaps.push(await tx.get(db.collection(PAY_ORDERS_COLLECTION).doc(id)));

      const packDocs = srcPacks.docs || [];
      const owned = (tgtPacks.docs || []).map((d) => ({ ...(d.data() || {}), packId: d.id }));
      const ownedIds = new Set(owned.map((p) => p.packId));
      for (const d of packDocs) {
        const data = d.data() || {};
        if (data.creditedToPass === true) throw new MoveError(409, 'A pack on that account was credited to a Board Pass order and cannot be merged automatically');
        if (ownedIds.has(d.id)) throw new MoveError(409, 'The target account already has a pack from that account');
        const parsed = parsePackId(d.id);
        if (parsed && coveringPackIds(parsed.sku, parsed.target).length && isAlreadyOwned(owned, parsed.sku, parsed.target)) {
          throw new MoveError(409, 'The target account already has a pack from that account');
        }
      }
      for (const d of srcMarkers.docs || []) {
        if ((tgtMarkers.docs || []).some((t) => t.id === d.id)) throw new MoveError(409, 'The target account already has a payment record from that account');
      }
      const srcSubData = srcSub && srcSub.exists ? srcSub.data() || {} : null;
      const srcHasPass = !!srcSubData && (srcSubData.passType || srcSubData.passEnd);
      const tgtSubData = tgtSub && tgtSub.exists ? tgtSub.data() || {} : null;
      if (srcHasPass && tgtSubData && (tgtSubData.passType || tgtSubData.passEnd)) throw new MoveError(409, 'Both accounts hold a Board Pass; not merged automatically');
      for (const s of orderSnaps) {
        if (!s || !s.exists || (s.data() || {}).uid !== fromUid) throw new MoveError(409, 'An order changed while merging; try again');
      }
      for (const s of payerSnaps) {
        if (!s || !s.exists || (s.data() || {}).payerUid !== fromUid) throw new MoveError(409, 'An order changed while merging; try again');
      }
      if (real) {
        // Every PAID order of the removed account must have its purchase here to move (a pack row / replay marker, or the Board Pass
        // on the subscription). Anything else is money with nothing to move: refuse, never leave an order pointing at nothing.
        for (const s of orderSnaps) {
          const o = s.data() || {};
          if (o.status !== 'paid' && o.status !== 'claimed') continue;
          const hasIt = isPackProduct(o.passType)
            ? packDocs.some((d) => (d.data() || {}).orderId === s.id) || (srcMarkers.docs || []).some((d) => d.id === o.paymentId || (d.data() || {}).orderId === s.id)
            : !!srcHasPass;
          if (!hasIt) throw new MoveError(409, 'A paid order on that account has no purchase to move; not merged automatically');
        }
      }
      if (dryRun) return;

      if (onlyOrderId) {
        const other = 'That account holds more than this one purchase, so it is not moved automatically';
        if (orderIds.length !== 1 || orderIds[0] !== onlyOrderId) throw new MoveError(409, other);
        if (packDocs.some((d) => (d.data() || {}).orderId !== onlyOrderId)) throw new MoveError(409, other);
        if ((srcMarkers.docs || []).some((d) => (d.data() || {}).orderId !== onlyOrderId && d.id !== onlyPaymentRef)) throw new MoveError(409, other);
        if (srcHasPass) {
          const pays = srcSubPays.docs || [];
          const ref = pays.length > 0 ? pays.every((p) => p.id === onlyPaymentRef) : (srcSubData || {}).lastPaymentRef === onlyPaymentRef;
          if (!onlyPaymentRef || !ref) throw new MoveError(409, other);
        }
      }
      // Writes.
      for (const d of packDocs) {
        tx.set(ent(toUid).collection(PACK_SEGMENTS.packs).doc(d.id), d.data());
        tx.delete(ent(fromUid).collection(PACK_SEGMENTS.packs).doc(d.id));
      }
      for (const d of srcMarkers.docs || []) {
        tx.set(ent(toUid).collection(PACK_SEGMENTS.grants).doc(d.id), d.data());
        tx.delete(ent(fromUid).collection(PACK_SEGMENTS.grants).doc(d.id));
      }
      if (packDocs.length > 0 || (srcMarkers.docs || []).length > 0) tx.set(ent(toUid), { updatedAt: new Date(nowMs) }, { merge: true });
      if (srcHasPass) {
        const fields = {};
        for (const f of PASS_FIELDS) if (srcSubData[f] !== undefined) fields[f] = srcSubData[f];
        tx.set(sub(toUid), fields, { merge: true });
        for (const p of srcSubPays.docs || []) {
          tx.set(sub(toUid).collection(SUB_SEGMENTS.payments).doc(p.id), p.data());
          tx.delete(sub(fromUid).collection(SUB_SEGMENTS.payments).doc(p.id));
        }
        tx.delete(sub(fromUid));
      }
      for (let k = 0; k < orderIds.length; k += 1) {
        // real: an order the removed account also PAID for moves its payerUid with it; every other mode writes exactly { uid } as before.
        const alsoPayer = real && ((orderSnaps[k].data() || {}).payerUid === fromUid);
        tx.set(db.collection(PAY_ORDERS_COLLECTION).doc(orderIds[k]), alsoPayer ? { uid: toUid, payerUid: toUid } : { uid: toUid }, { merge: true });
      }
      for (const id of payerOnlyIds) tx.set(db.collection(PAY_ORDERS_COLLECTION).doc(id), { payerUid: toUid }, { merge: true });
      tx.set(markerRef, { at: new Date(nowMs), adminUid, fromUid, toUid, reason: real ? REAL_REASON : purchasesOnly ? BUYER_REASON : MERGE_REASON });
    });
    moved = !dryRun;
  }
  if (dryRun) return { merged: false, replayed: false, dryRun: true, fromUid, toUid, phoneMoved: false };
  if (real) {
    // Close the sign-in-and-buy window FIRST: from here the removed account cannot start a session, so nothing new can land on it
    // between the move and the check below. (Deleting the login stays a later step, after the check.)
    try {
      await auth.revokeRefreshTokens(fromUid);
      await auth.updateUser(fromUid, { disabled: true });
    } catch (e) {
      if (!notFound(e)) throw new MoveError(500, 'The purchases are moved but the removed account could not be signed out; run the merge again');
    }
    // Nothing of the removed account's may still point at it (as owner OR as payer) before its logins are freed.
    for (const field of ['uid', 'payerUid']) {
      const left = await db.collection(PAY_ORDERS_COLLECTION).where(field, '==', fromUid).get();
      if (left && left.docs && left.docs.length > 0) throw new MoveError(409, 'An order is still on the removed account; its logins were NOT removed. Run it again');
    }
    return { merged: moved, replayed, fromUid, toUid, phoneMoved: false };
  }

  if (purchasesOnly) return { merged: moved, replayed, fromUid, toUid, phoneMoved: false };

  // Firebase Auth - idempotent: each step acts only if still needed.
  let phoneMoved = false;
  if (srcPhone && !tgtPhone) {
    await auth.updateUser(fromUid, { phoneNumber: null });
    try {
      await auth.updateUser(toUid, { phoneNumber: srcPhone });
      phoneMoved = true;
    } catch (e) {
      try {
        await auth.updateUser(fromUid, { phoneNumber: srcPhone });
      } catch (_restore) {
        console.error('[admin-merge] could not restore the phone on the source after a failed move');
      }
      throw new MoveError(500, 'The phone number could not be moved; the purchases are already on the target - run the merge again');
    }
  }
  if (srcUser.disabled !== true) await auth.updateUser(fromUid, { disabled: true });
  if (typeof auth.setCustomUserClaims === 'function') await auth.setCustomUserClaims(fromUid, { mergedInto: toUid });

  return { merged: moved, replayed, fromUid, toUid, phoneMoved };
}

/**
 * ADMIN-MERGE-REAL-1: free the removed account's logins once its data is on the kept account and verified. mergeAccount (real) has
 * already revoked its sessions and disabled it BEFORE its final check; this DELETES the Auth user, so its phone / email / Google
 * provider can be added to the kept account. Why delete and not just unset the phone: a disabled user still owns its email and provider
 * links, and Firebase will not let the student add them elsewhere. The account's Firestore data is NOT deleted.
 * Idempotent: an already-removed user is fine.
 */
async function retireAccount({ auth, uid }) {
  try {
    await auth.deleteUser(uid);
  } catch (e) {
    if (e && e.code === 'auth/user-not-found') return { removed: true, already: true };
    throw e;
  }
  return { removed: true, already: false };
}

/** PUT-ON-THIS-ACCOUNT-1: does this account hold anything of its own besides purchases (a real student's data, or top-up credit)? */
async function hasOwnActivity(db, uid) {
  for (const c of ACTIVITY_COLLECTIONS) if (await hasAnything(db, c, uid)) return true;
  return hasAnything(db, CREDIT_COLLECTION, uid);
}

module.exports = { mergeAccount, hasOwnActivity, retireAccount, REAL_REASON, AUTO_ACCOUNT_UID_PREFIX, MERGE_REASON, BUYER_REASON };
