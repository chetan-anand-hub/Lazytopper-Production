'use strict';
// TS-UPGRADE-CREDIT-1 (owner ruling 19 Nov 2026 00:03 IST) - a student who bought the Test Series Pack (sku `test_series`,
// Rs 999 + GST) and later buys the Board Pass (`till_boards`) pays ONLY THE DIFFERENCE, "but take care of the GST".
// Server-only, MONEY code, fails CLOSED.
//
// ★★ THE GST RULE: the credit is the TAXABLE BASE the student paid for the Test Series (999), never the all-in amount.
//     upgrade base = Board Pass base at ORDER time - 999;   charge = withGstInr(upgrade base)
//     founding (till 30 Nov 23:59:59 IST):  1917 - 999 =  918 ->  918 + 165 = 1083   (1179 + 1083 = 2262, the Board Pass all-in)
//     from 1 Dec 00:00 IST:                 2499 - 999 = 1500 -> 1500 + 270 = 1770   (1179 + 1770 = 2949)
//   The order then stores baseInr = the upgrade base and gstInr = the GST on it, so the GST invoice (taxable = baseInr,
//   GST = amount - taxable) reproduces the charge exactly, with the Test Series named as the credited prior purchase.
// ★★ THE CREDIT IS PROVED FROM THE SERVER'S OWN RECORDS, never from the caller: the entitlement
//   packEntitlements/{uid}/packs/test_series:all AND the paid order it names (payOrders/{orderId}). Everything must hold:
//   the entitlement is uncredited (creditedToPass === false), carries no refunded / duplicate / revoked mark, names its
//   order and payment; the order is THIS uid's, a test_series order, paid (status paid / claimed), by THAT payment, not a
//   duplicate / refunded / revoked one, with a stored GST breakup whose base is exactly the Test Series price (999) and
//   whose amount equals what the entitlement records. Anything else - including a read that fails - is credit 0, and the
//   Board Pass is still sold at its full price (a purchase is NEVER blocked by this rule).
// ★ ADMIN-MOVED / MERGED purchases (adminMovePurchase.cjs, adminMergeAccount.cjs): the move copies the entitlement UNCHANGED
//   (orderId, paymentRef, price) and sets the ORDER's uid to the new holder in the same transaction, so a moved Test Series
//   still points at its original paid order, now owned by the new uid: it IS provable and is credited. A pack already
//   credited cannot be moved or merged (both refuse creditedToPass === true), so a credit can never be spent twice by moving.
// ★ No gift / admin grant writes a Test Series entitlement today; one without a paid order of THIS uid is never credited.
// ★ ONCE: the Board Pass grant (passGrant.cjs) marks the entitlement creditedToPass in the SAME transaction as the grant,
//   idempotent on verify / webhook / status replays (exactly like PACK-CREDIT-1).
// ★ NO 7-day window (valid any time before the boards). Test Series -> Board Pass ONLY: the wound-down PACK-CREDIT-1 rule
//   for other packs (PACK-TERMS-1 cut-off, 5 Nov) is untouched, and the two never stack (a PACK-CREDIT-1 credit wins).
// ★ Kill switch: TS_UPGRADE_CREDIT_DISABLED=1 (or true/on/yes) -> no credit, no reads; the caller emits an event.

const { ENTITLEMENTS_COLLECTION, PACK_SEGMENTS } = require('./packGrant.cjs');
const { PACK_PRODUCTS, TEST_SERIES_SKU, TEST_SERIES_PACK_ID } = require('./packProducts.cjs');
const { chargeFor, withGstInr } = require('./passPricing.cjs');

const PAY_ORDERS_COLLECTION = 'payOrders';
const BOARD_PASS_TYPE = 'till_boards';
/** The base (taxable) price of the Test Series Pack - the only base this rule credits. */
const TEST_SERIES_BASE_INR = PACK_PRODUCTS[TEST_SERIES_SKU].priceInr;
/** Order states that are a completed payment on an account (guest `paid_unclaimed` is not on an account yet). */
const CREDITABLE_ORDER_STATES = Object.freeze(['paid', 'claimed']);
const EXCLUDING_FLAGS = Object.freeze(['refunded', 'duplicate', 'revoked']);
/** Razorpay's minimum order is Rs 1; an upgrade base below this is not credited (never happens at 1917 / 2499). */
const MIN_UPGRADE_BASE_INR = 1;

function tsUpgradeCreditDisabled(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.TS_UPGRADE_CREDIT_DISABLED) || '').trim());
}

const docId = (v) => (typeof v === 'string' && v.trim() && !v.includes('/') ? v.trim() : '');

function flagged(rec) {
  for (const f of EXCLUDING_FLAGS) if (rec[f] === true) return true;
  if (rec.refundedAt !== undefined && rec.refundedAt !== null) return true;
  if (rec.revokedAt !== undefined && rec.revokedAt !== null) return true;
  return false;
}

/**
 * PURE. Why this entitlement + its order do NOT prove a creditable Test Series purchase by `uid`, or null when they do.
 * `pack` is the raw entitlement document (or null), `order` the raw payOrders document it names (or null).
 */
function tsCreditRefusal(uid, pack, orderId, order) {
  if (!docId(uid)) return 'bad_uid';
  if (!pack || typeof pack !== 'object') return 'no_test_series';
  if (pack.packId !== TEST_SERIES_PACK_ID || pack.sku !== TEST_SERIES_SKU) return 'bad_entitlement';
  if (pack.creditedToPass !== false) return 'already_credited'; // true, missing, anything else: not provably uncredited
  if (flagged(pack)) return 'entitlement_flagged';
  if (!docId(pack.orderId) || pack.orderId !== orderId) return 'no_order';
  if (!docId(pack.paymentRef)) return 'no_payment';
  if (!Number.isInteger(pack.pricePaidInr) || pack.pricePaidInr <= 0) return 'bad_entitlement';
  if (!order || typeof order !== 'object') return 'no_order';
  if (order.uid !== uid) return 'other_uid';
  if (order.passType !== TEST_SERIES_SKU) return 'bad_order';
  if (!CREDITABLE_ORDER_STATES.includes(order.status)) return 'not_paid';
  if (order.paymentId !== pack.paymentRef) return 'payment_mismatch';
  if (flagged(order)) return 'order_flagged';
  // A Test Series order never carries a pass credit; one that does is not a record we understand.
  if (order.packCreditInr !== undefined || order.tsUpgradeCreditInr !== undefined) return 'bad_order';
  // The BASE price actually paid, proved from the stored GST breakup (an order with no breakup - all-in, created before
  // the 7 Nov cut-off - cannot prove its taxable base: not credited).
  if (order.baseInr !== TEST_SERIES_BASE_INR) return 'base_unproven';
  if (!Number.isInteger(order.gstInr) || order.gstInr !== withGstInr(TEST_SERIES_BASE_INR) - TEST_SERIES_BASE_INR) return 'base_unproven';
  if (!Number.isInteger(order.amountPaise) || order.amountPaise !== (order.baseInr + order.gstInr) * 100) return 'base_unproven';
  if (order.amountPaise !== pack.pricePaidInr * 100) return 'amount_mismatch';
  return null;
}

/**
 * The Test Series credit a Board Pass order for `uid` earns RIGHT NOW. NEVER THROWS and never blocks a purchase.
 * @returns {Promise<{ creditBaseInr: number, packId: string, orderId: string, reason: string|null, readFailed: boolean, disabled: boolean }>}
 */
async function testSeriesUpgradeCreditFor(db, uid, passType, env = process.env) {
  const none = (reason, extra) => ({ creditBaseInr: 0, packId: '', orderId: '', reason, readFailed: false, disabled: false, ...(extra || {}) });
  if (passType !== BOARD_PASS_TYPE) return none('not_board_pass');
  if (tsUpgradeCreditDisabled(env)) return none('disabled', { disabled: true });
  const id = docId(uid);
  if (!db || typeof db.collection !== 'function' || !id) return none('read_failed', { readFailed: true });
  let pack;
  let order = null;
  let orderId = '';
  try {
    const snap = await db.collection(ENTITLEMENTS_COLLECTION).doc(id).collection(PACK_SEGMENTS.packs).doc(TEST_SERIES_PACK_ID).get();
    if (!snap || !snap.exists) return none('no_test_series');
    pack = snap.data() || null;
    orderId = docId(pack && pack.orderId);
    if (orderId) {
      const os = await db.collection(PAY_ORDERS_COLLECTION).doc(orderId).get();
      order = os && os.exists ? os.data() || null : null;
    }
  } catch {
    return none('read_failed', { readFailed: true });
  }
  const refusal = tsCreditRefusal(id, pack, orderId, order);
  if (refusal) return none(refusal);
  return { creditBaseInr: order.baseInr, packId: TEST_SERIES_PACK_ID, orderId, reason: null, readFailed: false, disabled: false };
}

/**
 * PURE. The quote a credited Board Pass order is created with. `base` is quotePass' result for till_boards (it carries the
 * server's GST breakup `gst.baseInr` = the Board Pass base at order time). Returns { quote, fields } where `fields` are the
 * stored order additions, or { quote: base, fields: {} } (byte-identical, uncredited) when anything does not add up.
 */
function applyTsCreditToQuote(base, credit, nowMs) {
  const unchanged = { quote: base, fields: {} };
  if (!credit || !(credit.creditBaseInr > 0) || !base || !base.gst) return unchanged;
  const fullBaseInr = base.gst.baseInr;
  if (!Number.isInteger(fullBaseInr) || !Number.isInteger(credit.creditBaseInr)) return unchanged;
  // The uncredited quote must itself be the plain base + GST we are about to discount (never re-discount a credited quote).
  if (base.amountPaise !== withGstInr(fullBaseInr) * 100) return unchanged;
  const upgradeBaseInr = fullBaseInr - credit.creditBaseInr;
  if (!Number.isInteger(upgradeBaseInr) || upgradeBaseInr < MIN_UPGRADE_BASE_INR) return unchanged;
  const charge = chargeFor(upgradeBaseInr, nowMs);
  if (!charge.gstExclusive) return unchanged; // before the GST cut-off there is no taxable base to credit: not applied
  return {
    quote: {
      ...base,
      pricePaidInr: charge.totalInr,
      amountPaise: charge.totalInr * 100,
      gst: { baseInr: charge.baseInr, gstInr: charge.gstInr, totalInr: charge.totalInr, gstRate: charge.gstRate },
    },
    fields: {
      tsUpgradeCreditInr: credit.creditBaseInr,
      tsUpgradeFullBaseInr: fullBaseInr,
      tsUpgradeCreditPackId: credit.packId,
      tsUpgradeCreditOrderId: credit.orderId,
    },
  };
}

/** Razorpay `notes` additions for a credited order (empty object when there is no credit). */
function tsCreditNotes(fields) {
  if (!fields || !(fields.tsUpgradeCreditInr > 0)) return {};
  return { tsUpgradeCreditInr: String(fields.tsUpgradeCreditInr), tsUpgradeCreditOrderId: String(fields.tsUpgradeCreditOrderId || '') };
}

/** PURE. Is a stored order a Test Series upgrade whose fields agree with each other (used by the grant and the invoice)? */
function isConsistentTsUpgradeOrder(order) {
  if (!order || !(Number.isInteger(order.tsUpgradeCreditInr) && order.tsUpgradeCreditInr > 0)) return false;
  return (
    order.passType === BOARD_PASS_TYPE &&
    order.tsUpgradeCreditPackId === TEST_SERIES_PACK_ID &&
    !!docId(order.tsUpgradeCreditOrderId) &&
    Number.isInteger(order.tsUpgradeFullBaseInr) &&
    Number.isInteger(order.baseInr) &&
    order.tsUpgradeFullBaseInr - order.tsUpgradeCreditInr === order.baseInr
  );
}

module.exports = {
  testSeriesUpgradeCreditFor,
  tsCreditRefusal,
  applyTsCreditToQuote,
  tsCreditNotes,
  isConsistentTsUpgradeOrder,
  tsUpgradeCreditDisabled,
  TEST_SERIES_BASE_INR,
  BOARD_PASS_TYPE,
  CREDITABLE_ORDER_STATES,
};
