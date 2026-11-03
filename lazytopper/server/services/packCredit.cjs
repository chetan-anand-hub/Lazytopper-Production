'use strict';
// PACK-CREDIT-1 - "If you take the Board Pass within 7 days of buying a pack, the pack price comes off the
// Board Pass" (owner-approved 25 Oct 2026). Server-only, MONEY code, fails CLOSED.
//
// ★★ THE CREDIT IS COMPUTED HERE, FROM THE SERVER'S OWN pack documents, and from nothing the caller sends.
//   packEntitlements/{uid}/packs/{packId}: pricePaidInr (rupees), paidAt (ms), creditedToPass.
// ★★ FAIL CLOSED. Any pack that cannot be read cleanly is NOT credited; a failed read credits 0 and never
//   blocks the purchase (the student simply pays the full Board Pass price).
// ★ WHICH PACKS COUNT: paid within the last 7 x 24 h of the ORDER time (boundary inclusive: exactly 7 days
//   still counts, 7 days + 1 ms does not), not yet credited, not a refunded / duplicate / revoked record,
//   a positive whole-rupee price, a real past timestamp. A pack dated in the FUTURE is data we do not trust:
//   not credited. (A duplicate payment never becomes a pack document at all - packGrant keeps the first
//   entitlement - but the flags are excluded defensively should one ever be written.)
// ★ PACK-TERMS-1 (owner ruling 3 Nov 2026): packs and the Board Pass are different products, so the credit is being
//   WOUND DOWN. Only a pack paid BEFORE PACK_CREDIT_CUTOFF_MS (5 Nov 2026, 00:00 IST) is still honoured (the old promise,
//   exactly as before: 7-day window from payment). A pack paid AT or AFTER the cut-off earns nothing. The old rule
//   therefore dies by itself 7 days after the cut-off.
// ★ ONLY the Board Pass (till_boards) earns a credit; the month pass earns none.
// ★ The final amount never drops below RAZORPAY_MIN_INR (Razorpay's minimum order is Rs 1). Packs are
//   consumed WHOLE, oldest first: a pack that would push the credit past the cap is left uncredited.

const { ENTITLEMENTS_COLLECTION, PACK_SEGMENTS } = require('./packGrant.cjs');

const CREDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/** PACK-TERMS-1: packs paid at or after this instant earn no Board Pass credit (2026-11-05T00:00:00+05:30). */
const PACK_CREDIT_CUTOFF_MS = Date.parse('2026-11-05T00:00:00+05:30');
const RAZORPAY_MIN_INR = 1;
const BOARD_PASS_TYPE = 'till_boards';
/** Razorpay caps a notes value at 256 characters; beyond this the ids stay on the stored order only. */
const MAX_NOTE_VALUE_LENGTH = 250;

const EXCLUDING_FLAGS = Object.freeze(['refunded', 'duplicate', 'revoked']);

function paidAtMsOf(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (value && typeof value === 'object' && typeof value.toMillis === 'function') {
    try {
      const ms = value.toMillis();
      return Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Is this one pack document creditable at `nowMs`? Anything doubtful is NOT. */
function isCreditable(pack, nowMs) {
  if (!pack || typeof pack !== 'object') return false;
  if (typeof pack.packId !== 'string' || !pack.packId || pack.packId.includes(',') || pack.packId.includes('/')) return false;
  if (pack.creditedToPass !== false) return false; // true, undefined, missing: not provably uncredited -> no credit
  for (const flag of EXCLUDING_FLAGS) if (pack[flag] === true) return false;
  if (pack.refundedAt !== undefined && pack.refundedAt !== null) return false;
  if (!Number.isInteger(pack.pricePaidInr) || pack.pricePaidInr <= 0) return false;
  const paidMs = paidAtMsOf(pack.paidAt);
  if (paidMs === null) return false;
  if (paidMs >= PACK_CREDIT_CUTOFF_MS) return false; // PACK-TERMS-1: no credit for packs paid at/after the cut-off
  const age = nowMs - paidMs;
  return age >= 0 && age <= CREDIT_WINDOW_MS;
}

/**
 * PURE. The credit these packs earn at `nowMs`.
 * @param {object[]} packs   raw pack documents (must carry creditedToPass; listPacks' public shape does not)
 * @param {number} nowMs     the ORDER time
 * @param {{ maxCreditInr?: number }} [opts]  whole-pack cap (price - Rs 1)
 * @returns {{ creditInr: number, packIds: string[], expiresAtMs: number | null }}
 */
function packCreditFor(packs, nowMs, opts) {
  const none = { creditInr: 0, packIds: [], expiresAtMs: null };
  if (!Array.isArray(packs) || typeof nowMs !== 'number' || !Number.isFinite(nowMs)) return none;
  const cap = opts && typeof opts.maxCreditInr === 'number' && Number.isFinite(opts.maxCreditInr) ? Math.floor(opts.maxCreditInr) : Infinity;
  if (cap <= 0) return none;
  const ok = packs.filter((p) => isCreditable(p, nowMs));
  ok.sort((a, b) => paidAtMsOf(a.paidAt) - paidAtMsOf(b.paidAt) || (a.packId < b.packId ? -1 : 1));
  let creditInr = 0;
  let earliest = null;
  const seen = new Set();
  const packIds = [];
  for (const p of ok) {
    if (seen.has(p.packId)) continue; // never count one pack twice
    if (creditInr + p.pricePaidInr > cap) continue;
    seen.add(p.packId);
    creditInr += p.pricePaidInr;
    packIds.push(p.packId);
    const ms = paidAtMsOf(p.paidAt);
    if (earliest === null || ms < earliest) earliest = ms;
  }
  if (creditInr <= 0) return none;
  return { creditInr, packIds, expiresAtMs: earliest + CREDIT_WINDOW_MS };
}

/** Raw pack documents with the fields the credit rule needs. THROWS if the read fails (callers fail closed). */
async function readPacksForCredit(db, uid) {
  const qs = await db.collection(ENTITLEMENTS_COLLECTION).doc(uid).collection(PACK_SEGMENTS.packs).get();
  const out = [];
  for (const d of qs.docs || []) {
    const p = d.data() || {};
    out.push({ ...p, packId: typeof p.packId === 'string' ? p.packId : '' });
  }
  return out;
}

/**
 * The credit a Board Pass order for `uid` earns RIGHT NOW. NEVER THROWS and never blocks a purchase: any
 * failure (or a non-Board-Pass type) is credit 0.
 * @returns {Promise<{ creditInr: number, packIds: string[], expiresAtMs: number | null, readFailed: boolean }>}
 */
async function boardPassCreditFor(db, uid, passType, passPriceInr, nowMs) {
  const none = { creditInr: 0, packIds: [], expiresAtMs: null, readFailed: false };
  if (passType !== BOARD_PASS_TYPE) return none;
  if (!db || typeof uid !== 'string' || !uid) return { ...none, readFailed: true };
  if (!Number.isInteger(passPriceInr) || passPriceInr <= RAZORPAY_MIN_INR) return none;
  let packs;
  try {
    packs = await readPacksForCredit(db, uid);
  } catch {
    return { ...none, readFailed: true };
  }
  const got = packCreditFor(packs, nowMs, { maxCreditInr: passPriceInr - RAZORPAY_MIN_INR });
  return { ...got, readFailed: false };
}

/**
 * The quote an order is created with: the server price less the credit. `base` is quotePass' result.
 * Adds nothing to a quote that earns no credit (so an uncredited order is byte-identical to today's).
 */
function applyCreditToQuote(base, credit) {
  if (!credit || !(credit.creditInr > 0)) return { quote: base, packCreditInr: 0, packCreditIds: '' };
  const pricePaidInr = base.pricePaidInr - credit.creditInr;
  if (!Number.isInteger(pricePaidInr) || pricePaidInr < RAZORPAY_MIN_INR) return { quote: base, packCreditInr: 0, packCreditIds: '' };
  return {
    quote: { ...base, pricePaidInr, amountPaise: pricePaidInr * 100 },
    packCreditInr: credit.creditInr,
    packCreditIds: credit.packIds.join(','),
  };
}

/** Razorpay `notes` additions for a credited order (empty object when there is no credit). */
function creditNotes(packCreditInr, packCreditIds) {
  if (!(packCreditInr > 0)) return {};
  const notes = { packCreditInr: String(packCreditInr) };
  if (packCreditIds && packCreditIds.length <= MAX_NOTE_VALUE_LENGTH) notes.packCreditIds = packCreditIds;
  return notes;
}

/** Stored pay-order document additions (empty object when there is no credit). */
function creditOrderFields(packCreditInr, packCreditIds) {
  return packCreditInr > 0 ? { packCreditInr, packCreditIds } : {};
}

/** Parse the stored comma list back to ids (bad entries dropped). */
function parseCreditIds(csv) {
  if (typeof csv !== 'string' || !csv) return [];
  return [...new Set(csv.split(',').map((s) => s.trim()).filter((s) => s && !s.includes('/')))];
}

module.exports = {
  packCreditFor,
  readPacksForCredit,
  boardPassCreditFor,
  applyCreditToQuote,
  creditNotes,
  creditOrderFields,
  parseCreditIds,
  isCreditable,
  CREDIT_WINDOW_MS,
  PACK_CREDIT_CUTOFF_MS,
  RAZORPAY_MIN_INR,
  BOARD_PASS_TYPE,
};
