'use strict';
/**
 * moveToOther - SIGNED-IN-MOVE-1 (owner 12 Nov 2026). A SIGNED-IN buyer who has just paid may move what they bought to the
 * account of the person who will actually use it (a child's own phone or email), ONCE, within 24 h, if it is unused.
 *
 * ★ NO NEW GRANT LOGIC. A PDF pack moves through the SAME transaction an admin move uses (services/adminMovePurchase.movePackOrder:
 *   the entitlement + the replay marker + the order's holder uid + an audit record). A Board Pass has no per-order record to lift
 *   out of `subscriptions/{uid}` in general, so it moves only in the one shape where that is exact: the buyer's whole pass IS this
 *   order (see movePassOrder). Anything else is refused, never guessed.
 * ★ ONE-TIME: the order carries `movedToOtherAt` after a move; a second attempt is refused ("moved before"), and the order's
 *   holder `uid` is the target afterwards, so it is no longer the caller's anyway.
 * ★ 24 h from the payment (`paidAt` on the order, the server's own write), on the SERVER clock.
 * ★ "UNUSED" IS DECIDED FROM WHAT THE SERVER ACTUALLY RECORDS - and this file says exactly what that is:
 *     PASS  - the buyer's `usageLedger/{uid}/days/{IST day}` documents (usageLedger.cjs, one per IST day, written by every metered
 *             AI call). Used when the day doc of the payment day shows cost in an IST HOUR at or after the payment hour
 *             (`hourCostMicroInr`), or a LATER day shows any calls / spend. Earlier use on the payment day (the trial check that
 *             made the parent buy) and the trial counters are ignored. Practice that never calls a model leaves no server
 *             record, so it is NOT visible here. A ledger that cannot be read refuses the move (fail closed).
 *     PACK  - the server stores no download. BEST EFFORT, client-reported: a `pack_download` entry at or after payment in the
 *             buyer's activity feed (`activityLog/{uid}/activityDays/{day}.feed`) refuses the move ("downloaded"). None found, or
 *             the feed unreadable, allows it (fail open): a move is a convenience, the 24 h window still applies.
 * ★ AUDIT: uids only (adminMoves, `byUid`), no phone and no email, ever.
 */
const { movePackOrder, MoveError } = require('./adminMovePurchase.cjs');
const { isPackProduct } = require('./packProducts.cjs');
const { ENTITLEMENTS_COLLECTION, PACK_SEGMENTS } = require('./packGrant.cjs');
const { istDayKey } = require('./rateLimiter.cjs');
const { LEDGER_SEGMENTS, LEDGER_HOUR_FIELD, istHourKey } = require('./usageLedger.cjs');
const { PAYMENT_SEGMENTS } = require('./passGrant.cjs');
const { ACTIVITY_COLLECTION, ACTIVITY_SEGMENTS } = require('../routes/studentActivity.cjs');

const MOVE_WINDOW_MS = 24 * 60 * 60 * 1000;
const PAY_ORDERS_COLLECTION = 'payOrders';
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
const USAGE_LEDGER_COLLECTION = 'usageLedger';
const MOVE_REASON = 'buyer move';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Kill switch: PAY_MOVE_TO_OTHER_DISABLED=1 -> the route answers 404 and nothing moves. */
function isMoveToOtherDisabled(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.PAY_MOVE_TO_OTHER_DISABLED) || '').trim());
}

/** Refusals. `code` is stable (the client maps it to its own copy); `message` is the plain line. */
const REFUSALS = Object.freeze({
  not_yours: [403, 'That order is not on your account.'],
  not_paid: [409, 'That order is not a paid order.'],
  unsupported: [409, 'That purchase cannot be moved. Message us on WhatsApp and we will help.'],
  self: [400, 'That is your own account. Enter the other person’s phone number or email.'],
  moved_before: [409, 'This purchase was already moved once, so it cannot be moved again. Message us on WhatsApp and we will help.'],
  too_late: [409, 'It can only be moved within 24 hours of paying. Message us on WhatsApp and we will help.'],
  used: [409, 'It has already been used on this account, so it cannot be moved. Message us on WhatsApp and we will help.'],
  downloaded: [409, 'You have already downloaded from it, so it cannot be moved. Message us on WhatsApp and we will help.'],
  target_unverified: [409, 'That email already has an account whose email is not verified yet, so it cannot be used here. Use their mobile number instead, or message us on WhatsApp and we will help.'],
  target_mismatch: [409, 'We could not set up an account for exactly that contact. Nothing was moved. Message us on WhatsApp and we will help.'],
  target_has_pass: [409, 'That account already has a Board Pass. Message us on WhatsApp and we will help.'],
  target_has_pack: [409, 'That account already has this pack. Message us on WhatsApp and we will help.'],
  target_in_use: [409, 'That phone number or email already has its own LazyTopper account, so it cannot be used here. Message us on WhatsApp and we will help.'],
  cannot_check: [503, 'We cannot check that right now. Please try again in a few minutes.'],
});

class MoveRefusal extends Error {
  constructor(code) {
    super((REFUSALS[code] || REFUSALS.unsupported)[1]);
    this.name = 'MoveRefusal';
    this.code = code;
    this.status = (REFUSALS[code] || REFUSALS.unsupported)[0];
  }
}

function msOf(v) {
  if (v === null || v === undefined) return NaN;
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') return new Date(v).getTime();
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return NaN;
}

/**
 * PURE. Is this stored order one the CALLER may move at `nowMs`? Throws MoveRefusal; returns { kind: 'pack' | 'pass' } when ok.
 * (Pack and pass specifics - the target's holdings, a pass's usage - are decided where those records are read.)
 */
function assertMovable(order, callerUid, nowMs) {
  const o = order && typeof order === 'object' ? order : null;
  if (!o) throw new MoveRefusal('not_paid');
  if (o.movedToOtherAt) throw new MoveRefusal('moved_before');
  if (typeof o.uid !== 'string' || !o.uid || o.uid !== callerUid) throw new MoveRefusal('not_yours');
  // The buyer's OWN signed-in checkout only: a guest / parent / "buy for someone else" order already names its recipient.
  if (typeof o.payer === 'string' && o.payer) throw new MoveRefusal('unsupported');
  if (o.status !== 'paid' || typeof o.paymentId !== 'string' || !o.paymentId) throw new MoveRefusal('not_paid');
  const paidMs = msOf(o.paidAt);
  if (!Number.isFinite(paidMs)) throw new MoveRefusal('cannot_check');
  if (nowMs - paidMs > MOVE_WINDOW_MS) throw new MoveRefusal('too_late');
  if (isPackProduct(o.passType)) return { kind: 'pack', paidMs };
  // Only the Board Pass (till the boards). A month pass stacks on a running pass and a top-up is credit: not movable.
  if (o.passType === 'till_boards') {
    if (Number(o.packCreditInr) > 0) throw new MoveRefusal('unsupported'); // it spent pack credit: those packs would have to move too
    // TS-UPGRADE-CREDIT-1: it spent the Test Series credit (paid only the difference). Moving it would leave the buyer with the
    // Test Series AND hand someone else a full Board Pass for the price of one Board Pass: refused exactly like a pack credit.
    if (Number(o.tsUpgradeCreditInr) > 0) throw new MoveRefusal('unsupported');
    return { kind: 'pass', paidMs };
  }
  throw new MoveRefusal('unsupported');
}

/** IST day keys from the day of `sinceMs` through the day of `nowMs` (the window is 24 h, so at most two; a few for a skewed clock). */
function dayKeysBetween(sinceMs, nowMs) {
  const last = istDayKey(nowMs);
  const keys = [istDayKey(sinceMs)];
  for (let t = sinceMs; keys[keys.length - 1] !== last && keys.length < 4; ) {
    t += DAY_MS;
    keys.push(istDayKey(t));
  }
  if (!keys.includes(last)) keys.push(last);
  return keys;
}

/** Has the buyer's ledger any metered use from the payment hour on? Throws when it cannot be read (the caller refuses). */
async function passUsedSince(db, uid, paidMs, nowMs) {
  const paidDay = istDayKey(paidMs);
  const paidHour = istHourKey(paidMs);
  for (const key of dayKeysBetween(paidMs, nowMs)) {
    const snap = await db.collection(USAGE_LEDGER_COLLECTION).doc(uid).collection(LEDGER_SEGMENTS.days).doc(key).get();
    if (!snap || typeof snap.exists === 'undefined') throw new Error('ledger read gave no snapshot');
    const d = snap.exists && typeof snap.data === 'function' ? snap.data() || {} : {};
    if (key !== paidDay) {
      // A later day is wholly after the payment.
      if (Number(d.calls) > 0 || Number(d.providerSpendMicroInr) > 0) return true;
      continue;
    }
    const hours = d[LEDGER_HOUR_FIELD] && typeof d[LEDGER_HOUR_FIELD] === 'object' ? d[LEDGER_HOUR_FIELD] : {};
    for (const [hour, cost] of Object.entries(hours)) if (hour >= paidHour && Number(cost) > 0) return true;
  }
  return false;
}

/** Best effort: did the buyer's activity feed record a pack download at or after payment? Never throws; unreadable -> false. */
async function packDownloadedSince(db, uid, paidMs, nowMs) {
  try {
    for (const key of dayKeysBetween(paidMs, nowMs)) {
      const snap = await db.collection(ACTIVITY_COLLECTION).doc(uid).collection(ACTIVITY_SEGMENTS.days).doc(key).get();
      const d = snap && snap.exists && typeof snap.data === 'function' ? snap.data() || {} : {};
      const feed = Array.isArray(d.feed) ? d.feed : [];
      if (feed.some((e) => e && e.n === 'pack_download' && Number(e.t) >= paidMs)) return true;
    }
  } catch {
    /* fail open */
  }
  return false;
}

/**
 * The buyer's subscription must be exactly this order's pass (lastPaymentRef is this payment, till_boards, ONE payment record which is
 * this one). Read OUTSIDE the move so a mismatch is refused before any account is made; movePassOrder re-checks it inside.
 */
async function passIsOnlyThisOrder(db, uid, order) {
  const sub = await db.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
  const from = sub && sub.exists ? sub.data() || {} : {};
  const pays = await db.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).collection(PAYMENT_SEGMENTS.payments).limit(2).get();
  const docs = (pays && pays.docs) || [];
  return from.lastPaymentRef === order.paymentId && from.passType === 'till_boards' && docs.length === 1 && docs[0].id === order.paymentId;
}

/**
 * A Board Pass: ONE transaction, every read before any write. Exact only when the buyer's subscription is this order's grant and
 * nothing else: `lastPaymentRef` is this payment AND `subscriptions/{from}/payments` holds exactly this payment's record. The
 * target must have no running pass. The pass fields move to the target (with the payment record); the buyer's pass fields are
 * cleared. Payment state, the invoice and the order's money are never touched.
 */
async function movePassOrder({ db, orderId, toUid, byUid, nowMs, guard }) {
  if (!db || typeof db.runTransaction !== 'function') throw new Error('firebase-admin Firestore is unavailable');
  const orderRef = db.collection(PAY_ORDERS_COLLECTION).doc(orderId);
  const subRef = (uid) => db.collection(SUBSCRIPTIONS_COLLECTION).doc(uid);
  const PASS_KEYS = ['passType', 'passStart', 'passEnd', 'pricePaidInr', 'offerKey', 'foundingMember', 'lastPaymentRef'];
  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap || !orderSnap.exists) throw new MoveError(404, 'Order not found');
    const order = orderSnap.data() || {};
    const fromUid = order.uid;
    if (guard) guard(order);
    if (typeof fromUid !== 'string' || !fromUid || fromUid === toUid) throw new MoveError(409, 'Nothing to move');
    const ref = order.paymentId;
    const fromSnap = await tx.get(subRef(fromUid));
    const toSnap = await tx.get(subRef(toUid));
    const paysSnap = await tx.get(subRef(fromUid).collection(PAYMENT_SEGMENTS.payments).limit(2));
    const from = fromSnap && fromSnap.exists ? fromSnap.data() || {} : {};
    const to = toSnap && toSnap.exists ? toSnap.data() || {} : {};
    const payDocs = (paysSnap && paysSnap.docs) || [];
    if (from.lastPaymentRef !== ref || from.passType !== 'till_boards' || payDocs.length !== 1 || payDocs[0].id !== ref) {
      throw new MoveError(409, 'The pass on this account is not only this purchase');
    }
    const toEnd = msOf(to.passEnd);
    if (Number.isFinite(toEnd) && toEnd > nowMs) throw new MoveRefusal('target_has_pass');
    const toPay = await tx.get(subRef(toUid).collection(PAYMENT_SEGMENTS.payments).doc(ref));
    if (toPay && toPay.exists) throw new MoveError(409, 'That account already has this payment');
    const moved = {};
    for (const k of PASS_KEYS) moved[k] = from[k] === undefined ? null : from[k];
    const cleared = {};
    for (const k of PASS_KEYS) cleared[k] = null;
    // Writes.
    tx.set(subRef(toUid), { tier: 'premium', plan: 'pass_till_boards', ...moved }, { merge: true });
    tx.set(subRef(toUid).collection(PAYMENT_SEGMENTS.payments).doc(ref), payDocs[0].data() || {});
    tx.set(
      subRef(fromUid),
      { ...cleared, foundingMember: false, tier: 'free', plan: from.trialStartDate ? 'trial_7day' : 'none' },
      { merge: true },
    );
    tx.delete(subRef(fromUid).collection(PAYMENT_SEGMENTS.payments).doc(ref));
    tx.set(orderRef, { uid: toUid, movedToOtherAt: new Date(nowMs), movedFromUid: fromUid }, { merge: true });
    tx.set(db.collection('adminMoves').doc(), { at: new Date(nowMs), byUid, orderId, fromUid, toUid, reason: MOVE_REASON });
    return { moved: true, fromUid, toUid, kind: 'pass' };
  });
}

/**
 * Every refusal that does not depend on WHO the target is, decided before any account is made for them. Throws MoveRefusal.
 * @returns {Promise<{ kind: 'pack' | 'pass', paidMs: number }>}
 */
async function precheck({ db, orderId, callerUid, nowMs }) {
  if (!db || typeof db.collection !== 'function') throw new Error('firebase-admin Firestore is unavailable');
  const snap = await db.collection(PAY_ORDERS_COLLECTION).doc(orderId).get();
  const order = snap && snap.exists ? snap.data() || {} : null;
  if (!order) throw new MoveRefusal('not_paid');
  const { kind, paidMs } = assertMovable(order, callerUid, nowMs);
  if (kind === 'pass') {
    let used;
    let only;
    try {
      used = await passUsedSince(db, callerUid, paidMs, nowMs);
      only = await passIsOnlyThisOrder(db, callerUid, order);
    } catch {
      throw new MoveRefusal('cannot_check');
    }
    if (used) throw new MoveRefusal('used');
    if (!only) throw new MoveRefusal('unsupported');
  } else if (await packDownloadedSince(db, callerUid, paidMs, nowMs)) {
    throw new MoveRefusal('downloaded');
  }
  return { kind, paidMs };
}

/**
 * The whole move for one order. `toUid` is already resolved (found or created). Re-runs every check (precheck) and the order checks
 * AGAIN inside the move's transaction (a racing second tap, a late change): never only the pre-read.
 */
async function moveOrderToOther({ db, orderId, callerUid, toUid, nowMs, env }) {
  if (isMoveToOtherDisabled(env)) throw new MoveRefusal('unsupported');
  if (toUid === callerUid) throw new MoveRefusal('self');
  const { kind } = await precheck({ db, orderId, callerUid, nowMs });
  const guard = (o) => assertMovable(o, callerUid, nowMs);
  if (kind === 'pass') return movePassOrder({ db, orderId, toUid, byUid: callerUid, nowMs, guard });
  try {
    const r = await movePackOrder({
      db,
      orderId,
      toUid,
      byUid: callerUid,
      reason: MOVE_REASON,
      guard,
      orderPatch: { movedToOtherAt: new Date(nowMs), movedFromUid: callerUid },
      nowMs,
    });
    return { ...r, kind: 'pack' };
  } catch (e) {
    if (e instanceof MoveError && e.status === 409 && /already has it/i.test(e.message)) throw new MoveRefusal('target_has_pack');
    throw e;
  }
}

module.exports = {
  moveOrderToOther,
  precheck,
  movePassOrder,
  assertMovable,
  passUsedSince,
  packDownloadedSince,
  isMoveToOtherDisabled,
  MoveRefusal,
  REFUSALS,
  MOVE_WINDOW_MS,
  MOVE_REASON,
  ENTITLEMENTS_COLLECTION,
  PACK_SEGMENTS,
};
