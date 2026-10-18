// ADMIN-EXTEND-1 — extend a student's Premium by N days, at price 0, from the admin page.
//
// Used for the "5-minute feedback call -> 7 days extra Premium" reward (feedback survey,
// PR #1238). Owner-approved 18 Oct 2026.
//
// ★★ HOW THE EXTENSION IS STORED — AND WHY IT IS A PASS END, NOT A LONGER TRIAL.
// The trial END is never stored: every reader derives it from `trialStartDate + 7 days`
// (client subscriptionService.applyExpiry, server entitlement.deriveEffectiveTier, the
// admin Students page through deriveEffectiveTier, PricingPage / Check & Improve labels,
// and the trial-ending banner + email in #1242). Two ways to make a trial "longer" were
// rejected:
//   • moving `trialStartDate` forward — firestore.rules pin it immutable for clients,
//     and every reader treats a start more than 5 minutes in the FUTURE as forged and
//     fails it CLOSED (the student would lose the trial, not gain days);
//   • a new stored "bonus days" field — every one of those derivations would need the
//     same edit, on two runtimes, and one missed reader is a student told the wrong end.
// The product already has ONE stored, server-only, uniformly-read end date: the pass end.
// `passEnd` is refused to every client write by firestore.rules, and EVERY reader above
// already honours it the same way (premium until `passEnd`, free at/after it). So:
//   • a TRIAL (running or ended) or a free account becomes
//       { tier: "premium", plan: "pass_extension", passEnd: max(now, trial end) + N days }
//     `trialStartDate` is NOT touched — the trial-start rule (once, at sign-up, via
//     activateTrial) is unchanged and a later read still knows a trial was used.
//   • an existing PASS keeps its tier and plan and only moves `passEnd` to
//       max(now, passEnd) + N days.
// The banner and the trial email key on the derived tier being "trial"; an extended
// student is premium, so neither tells them their trial ends on day 7 when it does not.
// A later paid grant (passGrant.computeGrant) stacks on top of this passEnd as it does
// on any unexpired pass.
//
// ★★ NOT A SALE. Nothing here writes `pricePaidInr`, `lastPaymentRef`, the
// `subscriptions/{uid}/payments` records or `payOrders` — the only places a payment or
// its price is read from (admin timeline "Payment" events, accounting). The reward's
// own record says `pricePaidInr: 0, isSale: false` and lives in its own subcollection,
// `subscriptions/{uid}/adminGrants/{requestId}`, which is also:
//   • the IDEMPOTENCY key — a double-click / retry with the same request id is a no-op;
//   • the ADMIN AUDIT entry — who, when, how many days, why, from what end to what end.
//
// ★ ONE TRANSACTION, exactly like passGrant: the end is read and the later end written
// in the same Firestore transaction, together with the audit record, so two clicks can
// never both extend from the same old end.

const { deriveEffectiveTier } = require('./entitlement.cjs');
const { toMillis, FIRESTORE_COLLECTION } = require('./passGrant.cjs');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 7;
const MIN_DAYS = 1;
const MAX_DAYS = 30;
const DEFAULT_REASON = 'feedback call reward';
const MAX_REASON_LENGTH = 200;
/** A client-generated id per confirmation (crypto.randomUUID shape, or similar). */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
/** The plan a non-pass account is given while its extension runs. Server-written only. */
const EXTENSION_PLAN = 'pass_extension';
const AUDIT_ACTION = 'extend_premium_days';
/**
 * Subcollection names held in an object, NOT as a top-level `.collection(CONST)`: the
 * studentDataMap drift guard scans that shape as a TOP-LEVEL collection, and this is a
 * subcollection (mapped as `subscriptions.adminGrants`). Same pattern as passGrant's
 * PAYMENT_SEGMENTS.
 */
const EXTENSION_SEGMENTS = Object.freeze({ adminGrants: 'adminGrants' });

class ExtensionInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExtensionInputError';
  }
}

/** The request was well-formed but this account cannot be extended. `code` is for the UI. */
class ExtensionRefusedError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ExtensionRefusedError';
    this.code = code;
  }
}

function parseDays(raw) {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_DAYS;
  const n = typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : raw;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < MIN_DAYS || n > MAX_DAYS) {
    throw new ExtensionInputError(`days must be a whole number from ${MIN_DAYS} to ${MAX_DAYS}`);
  }
  return n;
}

function validateExtensionInput(input) {
  const src = input && typeof input === 'object' ? input : {};
  const uid = typeof src.uid === 'string' ? src.uid.trim() : '';
  if (!UID_PATTERN.test(uid)) throw new ExtensionInputError('uid must be a student uid');
  const days = parseDays(src.days);
  let reason = DEFAULT_REASON;
  if (src.reason !== undefined && src.reason !== null) {
    if (typeof src.reason !== 'string') throw new ExtensionInputError('reason must be text');
    const trimmed = src.reason.replace(/\s+/g, ' ').trim();
    if (trimmed.length > MAX_REASON_LENGTH) {
      throw new ExtensionInputError(`reason must be at most ${MAX_REASON_LENGTH} characters`);
    }
    if (trimmed) reason = trimmed;
  }
  const requestId = typeof src.requestId === 'string' ? src.requestId.trim() : '';
  if (!REQUEST_ID_PATTERN.test(requestId)) {
    throw new ExtensionInputError('requestId must be 8-128 letters, digits, "-" or "_"');
  }
  const adminUid = typeof src.adminUid === 'string' ? src.adminUid.trim() : '';
  if (!adminUid) throw new ExtensionInputError('adminUid is required');
  const nowMs = src.now === undefined ? Date.now() : toMillis(src.now);
  if (nowMs === null) throw new ExtensionInputError('now must be a valid instant');
  return { uid, days, reason, requestId, adminUid, nowMs };
}

/**
 * PURE. Given the stored `subscriptions/{uid}` document, decide the new end and the
 * fields to merge. Throws ExtensionRefusedError when there is nothing to extend.
 *
 * The CURRENT END is read through entitlement.deriveEffectiveTier — the same function
 * the server gate and the admin page use — so "current end" here is exactly the end
 * those readers would report:
 *   trial end = server-pinned trialStartDate + 7 days (the trial may already be over);
 *   pass end  = `passEnd`, consulted only on a stored premium record (as the gate does).
 */
function computeExtension(stored, { days, nowMs }) {
  if (!stored || typeof stored !== 'object') {
    throw new ExtensionRefusedError('no-record', 'This account has no subscription record yet');
  }
  const storedTier = typeof stored.tier === 'string' ? stored.tier : 'free';
  const hasPassEnd = stored.passEnd !== undefined && stored.passEnd !== null;
  if (storedTier === 'premium' && !hasPassEnd) {
    throw new ExtensionRefusedError(
      'premium-no-end',
      'This account has Premium with no end date — there is nothing to extend',
    );
  }

  const { trialEndsAtMs, passEndsAtMs } = deriveEffectiveTier(stored, nowMs);
  const passEndMs = storedTier === 'premium' ? passEndsAtMs : null;
  const ends = [trialEndsAtMs, passEndMs].filter((v) => v !== null && Number.isFinite(v));
  const previousEndMs = ends.length > 0 ? Math.max(...ends) : null;

  const baseMs = previousEndMs !== null && previousEndMs > nowMs ? previousEndMs : nowMs;
  const basis = baseMs === nowMs ? 'now' : baseMs === passEndMs ? 'pass' : 'trial';
  const newEndMs = baseMs + days * DAY_MS;

  // Never shortens: the new end is strictly after every end this account holds.
  if (previousEndMs !== null && newEndMs <= previousEndMs) {
    throw new Error(`extension would not lengthen access (${previousEndMs} -> ${newEndMs})`);
  }

  // Date objects: the Admin SDK stores a JS Date as a Firestore Timestamp, which is the
  // shape every reader of passEnd already parses.
  const fields =
    storedTier === 'premium'
      ? { passEnd: new Date(newEndMs) }
      : { tier: 'premium', plan: EXTENSION_PLAN, passEnd: new Date(newEndMs) };

  return { previousEndMs, baseMs, basis, newEndMs, fields };
}

function iso(value) {
  const ms = toMillis(value);
  return ms === null ? null : new Date(ms).toISOString();
}

/** The audit record as JSON — what the admin route returns, on a first run or a replay. */
function describeExtension(uid, record) {
  const r = record && typeof record === 'object' ? record : {};
  return {
    uid,
    requestId: r.requestId ?? null,
    days: typeof r.days === 'number' ? r.days : null,
    reason: typeof r.reason === 'string' ? r.reason : null,
    pricePaidInr: 0,
    isSale: false,
    basis: r.basis ?? null,
    previousEnd: iso(r.previousEnd),
    newEnd: iso(r.newEnd),
    adminUid: r.adminUid ?? null,
    createdAt: iso(r.createdAt),
  };
}

/**
 * Extend one student's Premium. `firestore` is firebase-admin's Firestore.
 *
 * @returns {Promise<{ replayed: boolean, extension: object }>}
 * @throws ExtensionInputError / ExtensionRefusedError; anything else is an infrastructure fault.
 */
async function extendPremium(input, { firestore } = {}) {
  const request = validateExtensionInput(input);
  if (!firestore || typeof firestore.runTransaction !== 'function') {
    throw new Error('firebase-admin Firestore is unavailable');
  }
  const ref = firestore.collection(FIRESTORE_COLLECTION).doc(request.uid);
  const grantRef = ref.collection(EXTENSION_SEGMENTS.adminGrants).doc(request.requestId);

  return firestore.runTransaction(async (tx) => {
    // Every read before any write — Firestore's transaction contract.
    const snap = await tx.get(ref);
    const grantSnap = await tx.get(grantRef);

    // This request was already applied (a double-click, a retry): nothing changes.
    if (grantSnap && grantSnap.exists) {
      return { replayed: true, extension: describeExtension(request.uid, grantSnap.data() || {}) };
    }

    const stored = snap && snap.exists ? snap.data() || {} : null;
    const decision = computeExtension(stored, request);
    const record = {
      action: AUDIT_ACTION,
      requestId: request.requestId,
      days: request.days,
      reason: request.reason,
      pricePaidInr: 0,
      isSale: false,
      basis: decision.basis,
      previousEnd: decision.previousEndMs === null ? null : new Date(decision.previousEndMs),
      newEnd: new Date(decision.newEndMs),
      adminUid: request.adminUid,
      createdAt: new Date(request.nowMs),
    };
    tx.set(ref, decision.fields, { merge: true });
    tx.set(grantRef, record);
    return { replayed: false, extension: describeExtension(request.uid, record) };
  });
}

module.exports = {
  extendPremium,
  computeExtension,
  validateExtensionInput,
  describeExtension,
  ExtensionInputError,
  ExtensionRefusedError,
  EXTENSION_SEGMENTS,
  EXTENSION_PLAN,
  AUDIT_ACTION,
  DEFAULT_DAYS,
  MIN_DAYS,
  MAX_DAYS,
  DEFAULT_REASON,
  MAX_REASON_LENGTH,
};
