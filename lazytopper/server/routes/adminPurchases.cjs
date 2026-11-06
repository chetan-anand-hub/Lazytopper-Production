'use strict';
/**
 * adminPurchases - ADMIN-PURCHASES-1. "Purchases" card on /admin/students: who bought what.
 *
 *   GET /api/admin/purchases -> { ok, items: [...], totals, ... }     READ-ONLY, ADMIN-ONLY
 *
 * ★ WHAT "PAID" MEANS (established from the writers, not guessed). An order doc in `payOrders` is written with
 *   status 'created' (payments.cjs / parentPay.cjs handleOrder). It becomes `status: 'paid'` + `paymentId` + `paidAt`
 *   ONLY inside the grant transactions (passGrant.cjs, packGrant.cjs, usageCredit.cjs), i.e. after a server-verified
 *   Razorpay payment. So a purchase is: status === 'paid' AND a string paymentId AND a finite paidAt. 'created'
 *   is NEVER treated as paid. Orders with no paidAt never match the orderBy below, so they are not even read.
 *
 * ★ Nothing here writes, grants, or re-verifies anything. Totals EXCLUDE admin accounts (owner test purchases).
 * CHECKOUT-1 (31 Oct 2026): the same response also carries `abandoned` - orders with status 'created' (never paid, no
 *   paidAt) created more than 30 minutes ago and within the last 30 days, newest first. Read-only; same admin gate, read AFTER it.
 *   The query is a single-field createdAt range (no composite index); the status test is made in memory.
 * Gate pattern is adminKeyDisputes.cjs: requireAdmin FIRST, 503 if gate / Firestore missing, no-store.
 *
 * GUEST-ABANDON-1 (owner ruling 6 Nov 2026):
 *   - `abandoned` also lists signed-out GUEST checkouts (uid null, payer 'guest': PAY-PHONE-1 phone orders and
 *     CHECKOUT-WHO "Who will use it?" orders), channel 'who' | 'guest'. Their recipient is MASKED (maskIndianMobile /
 *     maskEmail); there is no profile lookup for them and no raw phone / email ever leaves the store.
 *   - `totals.lastN.guestUnclaimed` counts guest money RECEIVED but not (yet) on an account: status paid_unclaimed,
 *     erased_unclaimed, or claimed-but-not-yet-granted. Each order has exactly one status at a time, and once its grant
 *     completes it is status 'paid' with a uid and counts in premium / packs instead - so it is counted ONCE. A claimed
 *     guest order is dated by `guestPaidAt` (when the money arrived), not by the later grant time, so the claim never
 *     moves it between windows. duplicate_purchase orders are NOT counted (they are flagged under guestAttention).
 */
const { istDayKey } = require('../services/rateLimiter.cjs');
const { istDayStartMs, addIstDays } = require('./adminStudents.cjs');
// PAY-PHONE-1: guest (phone-number) payments nobody has claimed yet. Read-only; the phone is shown MASKED.
const { maskIndianMobile, maskEmail, GUEST_STATUS } = require('../services/guestPay.cjs');

/**
 * CHECKOUT-WHO-1 - for an order bought through "Who will use it?": the recipient (MASKED), who paid (signed out / a
 * signed-in account buying for someone else), the uid it landed on and how, and the two-accounts note. {} for any other
 * order, so every existing row is exactly as before.
 */
function whoFields(v) {
  if (!v || v.checkoutWho !== true) return {};
  return {
    recipient: {
      ...(typeof v.guestPhone === 'string' && v.guestPhone ? { phoneMasked: maskIndianMobile(v.guestPhone) } : {}),
      ...(typeof v.guestEmail === 'string' && v.guestEmail ? { emailMasked: maskEmail(v.guestEmail) } : {}),
    },
    payerType: typeof v.payerType === 'string' ? v.payerType : null,
    claimedBy: typeof v.uid === 'string' && v.uid ? v.uid : null,
    claimedVia: typeof v.claimedVia === 'string' ? v.claimedVia : null,
    adminNote: typeof v.adminNote === 'string' ? v.adminNote : null,
  };
}

const PAY_ORDERS_COLLECTION = 'payOrders';
/** PARENT-PACKS-1 review M2: the admin note on a paid order whose pack the student already had. */
const DUPLICATE_FLAG = 'duplicate — check with the payer';
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });
const READ_CAP = 300;
const SHOWN_CAP = 100;
const ABANDONED_AFTER_MS = 30 * 60 * 1000;
const ABANDONED_WINDOW_DAYS = 30;
const ABANDONED_READ_CAP = 300;
const ABANDONED_SHOWN_CAP = 50;
const PREMIUM_TYPES = Object.freeze(['month', 'till_boards']);
/** GUEST-ABANDON-1: guest statuses whose money was received but is not (yet) a granted 'paid' order. */
const GUEST_MONEY_STATUSES = Object.freeze([GUEST_STATUS.paidUnclaimed, 'erased_unclaimed', GUEST_STATUS.claimed]);
const GUEST_PAYER = 'guest';

const msOf = (v) => (v instanceof Date ? v.getTime() : v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' && Number.isFinite(v) ? v : null);

function kindOf(passType) {
  if (PREMIUM_TYPES.includes(passType)) return 'premium';
  if (typeof passType === 'string' && passType.startsWith('pack_')) return 'pack';
  if (typeof passType === 'string' && passType.startsWith('topup_')) return 'topup';
  return 'other';
}

function adminUidSet() {
  return new Set(String(process.env.ADMIN_FIREBASE_UIDS || '').split(',').map((s) => s.trim()).filter(Boolean));
}

const emptyTotals = () => ({ premium: { count: 0, inr: 0 }, packs: { count: 0, inr: 0 }, topups: { count: 0, inr: 0 }, guestUnclaimed: { count: 0, inr: 0 } });

/**
 * GUEST-ABANDON-1 - the recipient of ANY guest order, MASKED (a phone order has only guestPhone; a "Who will use it?"
 * order may have either or both). Never the raw value.
 */
function guestRecipient(v) {
  return {
    ...(typeof v.guestPhone === 'string' && v.guestPhone ? { phoneMasked: maskIndianMobile(v.guestPhone) } : {}),
    ...(typeof v.guestEmail === 'string' && v.guestEmail ? { emailMasked: maskEmail(v.guestEmail) } : {}),
  };
}

function createAdminPurchasesRoutes(deps = {}) {
  const { sendJson, sendJsonWithHeaders, adminFirestore, firebaseAdmin, requireAdmin } = deps;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const send = (res, status, body) =>
    typeof sendJsonWithHeaders === 'function' ? sendJsonWithHeaders(res, status, body, NO_STORE) : sendJson(res, status, body);

  async function gate(req, res) {
    if (typeof requireAdmin !== 'function') {
      send(res, 503, { ok: false, error: 'Admin endpoints disabled: admin gate not configured' });
      return null;
    }
    const auth = await requireAdmin(req);
    if (!auth || !auth.ok || !auth.uid) {
      send(res, (auth && auth.status) || 503, { ok: false, error: (auth && auth.error) || 'Admin auth unavailable' });
      return null;
    }
    if (!adminFirestore) {
      send(res, 503, { ok: false, error: 'firebase-admin Firestore is not initialised on this deploy' });
      return null;
    }
    return auth;
  }

  /** uid -> { email, name } from Firebase Auth (the same source /api/admin/students reads). Failure = no names. */
  async function profilesFor(uids) {
    const out = new Map();
    if (!uids.length || !firebaseAdmin || typeof firebaseAdmin.auth !== 'function') return out;
    try {
      const res = await firebaseAdmin.auth().getUsers(uids.map((uid) => ({ uid })));
      for (const u of (res && res.users) || []) {
        out.set(u.uid, { email: typeof u.email === 'string' ? u.email : null, name: typeof u.displayName === 'string' ? u.displayName : null });
      }
    } catch (e) {
      console.error('[admin-purchases] profile lookup failed:', e && e.message);
    }
    return out;
  }

  /**
   * PAY-RESCUE-1 - what Razorpay's signed `payment.failed` webhook left on the order (`lastFailure`, payments.cjs).
   * `attempted` is true only when such a note exists; its absence means we have no record of an attempt.
   */
  function failureFields(raw) {
    const f = raw && typeof raw === 'object' ? raw : null;
    const text = (x) => (typeof x === 'string' ? x.slice(0, 80) : '');
    if (!f) return { attempted: false, lastFailure: null };
    return {
      attempted: true,
      lastFailure: { code: text(f.code), reason: text(f.reason), source: text(f.source), step: text(f.step), atMs: msOf(f.atMs) },
    };
  }

  /** CHECKOUT-1 - 'created' orders older than 30 min, last 30 days, newest first. Returns null when the read fails. */
  async function abandonedOrders(nowMs, admins) {
    try {
      const since = new Date(nowMs - ABANDONED_WINDOW_DAYS * 86400000);
      const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).where('createdAt', '>=', since).orderBy('createdAt', 'desc').limit(ABANDONED_READ_CAP).get();
      const rows = [];
      snap.forEach((d) => {
        const v = d.data() || {};
        const createdAtMs = msOf(v.createdAt);
        if (v.status !== 'created' || createdAtMs === null || msOf(v.paidAt) !== null) return;
        if (nowMs - createdAtMs <= ABANDONED_AFTER_MS) return;
        const isGuest = v.payer === GUEST_PAYER && (v.uid === null || v.uid === undefined);
        if (isGuest) {
          // GUEST-ABANDON-1: a signed-out checkout. Masked recipient only; no profile lookup; no raw phone / email.
          rows.push({
            orderId: d.id,
            createdAtMs,
            uid: null,
            passType: typeof v.passType === 'string' ? v.passType : '',
            packTarget: typeof v.packTarget === 'string' ? v.packTarget : null,
            kind: kindOf(v.passType),
            amountInr: Number.isFinite(v.amountPaise) ? v.amountPaise / 100 : null,
            channel: v.checkoutWho === true ? 'who' : 'guest',
            isAdminAccount: typeof v.payerUid === 'string' && admins.has(v.payerUid),
            recipient: guestRecipient(v),
            payerType: typeof v.payerType === 'string' ? v.payerType : null,
            ...failureFields(v.lastFailure),
          });
          return;
        }
        if (typeof v.uid !== 'string' || !v.uid) return;
        rows.push({
          orderId: d.id,
          createdAtMs,
          uid: v.uid,
          passType: typeof v.passType === 'string' ? v.passType : '',
          packTarget: typeof v.packTarget === 'string' ? v.packTarget : null,
          kind: kindOf(v.passType),
          amountInr: Number.isFinite(v.amountPaise) ? v.amountPaise / 100 : null,
          channel: v.payer === 'parent' ? 'parent' : 'student',
          isAdminAccount: admins.has(v.uid),
          ...failureFields(v.lastFailure),
        });
      });
      rows.sort((a, b) => b.createdAtMs - a.createdAtMs);
      const shown = rows.slice(0, ABANDONED_SHOWN_CAP);
      const profiles = await profilesFor([...new Set(shown.filter((p) => p.uid).map((p) => p.uid))]);
      const items = shown.map((p) => {
        if (!p.uid) return { ...p, email: null, name: null };
        const pr = profiles.get(p.uid) || { email: null, name: null };
        return { ...p, email: pr.email, name: pr.name };
      });
      return { items, truncated: rows.length > ABANDONED_SHOWN_CAP || snap.size >= ABANDONED_READ_CAP };
    } catch (e) {
      console.error('[admin-purchases] abandoned read failed:', e && e.message);
      return null;
    }
  }

  /**
   * PAY-PHONE-1 - guest payments that are captured but not yet claimed by a sign-in with the same number, oldest first,
   * so the owner can help a student who typed a wrong number. Single-field equality query (no composite index). The
   * phone is MASKED here; the full number never leaves the store. Returns null when the read fails.
   */
  async function unclaimedGuestOrders(nowMs, readStatus) {
    try {
      const snap = await readStatus(GUEST_STATUS.paidUnclaimed);
      const rows = [];
      snap.forEach((d) => {
        const v = d.data() || {};
        if (v.payer !== 'guest') return;
        const paidAtMs = msOf(v.guestPaidAt);
        rows.push({
          orderId: d.id,
          paymentId: typeof v.paymentId === 'string' ? v.paymentId : null,
          phoneMasked: maskIndianMobile(v.guestPhone),
          passType: typeof v.passType === 'string' ? v.passType : '',
          packTarget: typeof v.packTarget === 'string' ? v.packTarget : null,
          kind: kindOf(v.passType),
          amountInr: Number.isFinite(v.amountPaise) ? v.amountPaise / 100 : null,
          paidAtMs,
          ageHours: paidAtMs === null ? null : Math.max(0, Math.floor((nowMs - paidAtMs) / 3600000)),
          ...whoFields(v),
        });
      });
      rows.sort((a, b) => (a.paidAtMs || 0) - (b.paidAtMs || 0));
      return { items: rows.slice(0, ABANDONED_SHOWN_CAP), truncated: rows.length > ABANDONED_SHOWN_CAP || snap.size >= ABANDONED_READ_CAP };
    } catch (e) {
      console.error('[admin-purchases] unclaimed guest read failed:', e && e.message);
      return null;
    }
  }

  /**
   * PAY-PHONE-1 review fixes 3 / 5 / 10 - guest payments that need the owner: "claimed, grant failed" (status claimed,
   * a recorded claimError), duplicate purchases (paid again for something the account already has) and paid orders whose
   * number was erased before a claim. Equality query per status (no composite index); phone MASKED. null on a failed read.
   */
  async function guestAttentionOrders(nowMs, readStatus) {
    const LABEL = { claimed: 'claimed, grant failed', duplicate_purchase: 'Paid again for something the account already has', erased_unclaimed: 'Paid, account erased before sign-in' };
    try {
      const rows = [];
      for (const status of Object.keys(LABEL)) {
        const snap = await readStatus(status);
        snap.forEach((d) => {
          const v = d.data() || {};
          if (v.payer !== 'guest') return;
          if (status === 'claimed' && !(v.claimError && typeof v.claimError === 'object')) return; // still in progress
          const atMs = msOf(v.guestPaidAt);
          rows.push({
            orderId: d.id,
            state: LABEL[status],
            reason: typeof v.duplicateReason === 'string' ? v.duplicateReason : v.claimError && typeof v.claimError.code === 'string' ? v.claimError.code : null,
            paymentId: typeof v.paymentId === 'string' ? v.paymentId : null,
            phoneMasked: maskIndianMobile(v.guestPhone),
            passType: typeof v.passType === 'string' ? v.passType : '',
            packTarget: typeof v.packTarget === 'string' ? v.packTarget : null,
            kind: kindOf(v.passType),
            amountInr: Number.isFinite(v.amountPaise) ? v.amountPaise / 100 : null,
            ageHours: atMs === null ? null : Math.max(0, Math.floor((nowMs - atMs) / 3600000)),
            ...whoFields(v),
          });
        });
      }
      return { items: rows.slice(0, ABANDONED_SHOWN_CAP), truncated: rows.length > ABANDONED_SHOWN_CAP };
    } catch (e) {
      console.error('[admin-purchases] guest attention read failed:', e && e.message);
      return null;
    }
  }

  /**
   * GUEST-ABANDON-1 - one equality read per guest status, shared by unclaimedGuest, guestAttention and the totals within a
   * request (so adding the totals costs no extra read). A failed read is cached as the rejection, so every user of it fails
   * the same way.
   */
  function statusReader() {
    const cache = new Map();
    return (status) => {
      if (!cache.has(status)) cache.set(status, adminFirestore.collection(PAY_ORDERS_COLLECTION).where('status', '==', status).limit(ABANDONED_READ_CAP).get());
      return cache.get(status);
    };
  }

  /**
   * GUEST-ABANDON-1 - guest money received but not (yet) a granted 'paid' order, into `guestUnclaimed` of each window,
   * dated by guestPaidAt. Admin payers / admin claimers excluded like every other total. Returns false when a read failed
   * (the guest totals are then not known). A guest read that hit its cap sets `totals.guestTruncated` (review D4) - NOT
   * `complete`, which is only about the 300 paid orders.
   */
  async function addGuestMoney(totals, admins, windows, readStatus) {
    try {
      for (const status of GUEST_MONEY_STATUSES) {
        const snap = await readStatus(status);
        if (snap.size >= ABANDONED_READ_CAP) totals.guestTruncated = true;
        snap.forEach((d) => {
          const v = d.data() || {};
          if (v.payer !== GUEST_PAYER || typeof v.paymentId !== 'string' || !v.paymentId) return;
          const atMs = msOf(v.guestPaidAt);
          if (atMs === null || !Number.isFinite(v.amountPaise) || kindOf(v.passType) === 'other') return;
          if ((typeof v.uid === 'string' && admins.has(v.uid)) || (typeof v.payerUid === 'string' && admins.has(v.payerUid))) return;
          for (const [key, from] of windows) {
            if (atMs >= from) {
              totals[key].guestUnclaimed.count += 1;
              totals[key].guestUnclaimed.inr += v.amountPaise / 100;
            }
          }
        });
      }
      return true;
    } catch (e) {
      console.error('[admin-purchases] guest totals read failed:', e && e.message);
      for (const [key] of windows) totals[key].guestUnclaimed = { count: 0, inr: 0 };
      return false;
    }
  }

  async function list(req, res) {
    if (!(await gate(req, res))) return;
    try {
      const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).orderBy('paidAt', 'desc').limit(READ_CAP).get();
      const admins = adminUidSet();
      const nowMs = now();
      const today = istDayKey(nowMs);
      const start7 = istDayStartMs(addIstDays(today, -6));
      const start30 = istDayStartMs(addIstDays(today, -29));
      const paid = [];
      snap.forEach((d) => {
        const v = d.data() || {};
        const paidAtMs = msOf(v.paidAt);
        if (v.status !== 'paid' || typeof v.paymentId !== 'string' || !v.paymentId || paidAtMs === null) return;
        if (typeof v.uid !== 'string' || !v.uid) return;
        const amountInr = Number.isFinite(v.amountPaise) ? v.amountPaise / 100 : null;
        // GUEST-ABANDON-1: a claimed guest order is dated, in the totals, by when the money arrived.
        const guestPaidAtMs = v.payer === GUEST_PAYER ? msOf(v.guestPaidAt) : null;
        paid.push({
          orderId: d.id,
          paidAtMs,
          ...(guestPaidAtMs !== null ? { guestPaidAtMs } : {}),
          uid: v.uid,
          passType: typeof v.passType === 'string' ? v.passType : '',
          packTarget: typeof v.packTarget === 'string' ? v.packTarget : null,
          kind: kindOf(v.passType),
          amountInr,
          channel: v.payer === 'parent' ? 'parent' : 'student',
          isAdminAccount: admins.has(v.uid),
          ...whoFields(v),
          // PARENT-PACKS-1 review M2: a paid pack order whose pack the student already had (packGrant `duplicate`). Facts only.
          ...(v.duplicate === true ? { duplicate: true, flag: DUPLICATE_FLAG } : {}),
        });
      });
      paid.sort((a, b) => b.paidAtMs - a.paidAtMs);

      const totals = { last7: emptyTotals(), last30: emptyTotals(), excludesAdminAccounts: true };
      for (const p of paid) {
        if (p.isAdminAccount || p.kind === 'other' || p.amountInr === null) continue;
        const bucket = p.kind === 'premium' ? 'premium' : p.kind === 'pack' ? 'packs' : 'topups';
        for (const [key, from] of [['last7', start7], ['last30', start30]]) {
          if ((p.guestPaidAtMs ?? p.paidAtMs) >= from) {
            totals[key][bucket].count += 1;
            totals[key][bucket].inr += p.amountInr;
          }
        }
      }
      // The read stopped at READ_CAP: if its oldest row is still inside the 30-day window, older sales may be missing.
      const readFull = snap.size >= READ_CAP;
      const oldestMs = paid.length ? paid[paid.length - 1].paidAtMs : null;
      totals.complete = !(readFull && (oldestMs === null || oldestMs >= start30));
      const readStatus = statusReader();
      totals.guestTruncated = false;
      totals.guestUnclaimedKnown = await addGuestMoney(totals, admins, [['last7', start7], ['last30', start30]], readStatus);

      const shown = paid.slice(0, SHOWN_CAP);
      const profiles = await profilesFor([...new Set(shown.map((p) => p.uid))]);
      const items = shown.map((p) => {
        const pr = profiles.get(p.uid) || { email: null, name: null };
        return { ...p, email: pr.email, name: pr.name };
      });
      const abandoned = await abandonedOrders(nowMs, admins);
      const unclaimedGuest = await unclaimedGuestOrders(nowMs, readStatus);
      const guestAttention = await guestAttentionOrders(nowMs, readStatus);
      return send(res, 200, { ok: true, items, totals, truncated: paid.length > SHOWN_CAP || readFull, abandoned, unclaimedGuest, guestAttention });
    } catch (e) {
      console.error('[admin-purchases] list failed:', e && e.message);
      return send(res, 500, { ok: false, error: 'Could not read the purchases' });
    }
  }

  return { list };
}

let mounted = null;
function handleAdminPurchases(req, res, deps) {
  if (!mounted) mounted = createAdminPurchasesRoutes(deps);
  return mounted.list(req, res);
}

module.exports = { createAdminPurchasesRoutes, handleAdminPurchases, DUPLICATE_FLAG };
