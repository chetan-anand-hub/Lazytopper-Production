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
 * Gate pattern is adminKeyDisputes.cjs: requireAdmin FIRST, 503 if gate / Firestore missing, no-store.
 */
const { istDayKey } = require('../services/rateLimiter.cjs');
const { istDayStartMs, addIstDays } = require('./adminStudents.cjs');

const PAY_ORDERS_COLLECTION = 'payOrders';
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });
const READ_CAP = 300;
const SHOWN_CAP = 100;
const PREMIUM_TYPES = Object.freeze(['month', 'till_boards']);

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

const emptyTotals = () => ({ premium: { count: 0, inr: 0 }, packs: { count: 0, inr: 0 }, topups: { count: 0, inr: 0 } });

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
        paid.push({
          orderId: d.id,
          paidAtMs,
          uid: v.uid,
          passType: typeof v.passType === 'string' ? v.passType : '',
          packTarget: typeof v.packTarget === 'string' ? v.packTarget : null,
          kind: kindOf(v.passType),
          amountInr,
          channel: v.payer === 'parent' ? 'parent' : 'student',
          isAdminAccount: admins.has(v.uid),
        });
      });
      paid.sort((a, b) => b.paidAtMs - a.paidAtMs);

      const totals = { last7: emptyTotals(), last30: emptyTotals(), excludesAdminAccounts: true };
      for (const p of paid) {
        if (p.isAdminAccount || p.kind === 'other' || p.amountInr === null) continue;
        const bucket = p.kind === 'premium' ? 'premium' : p.kind === 'pack' ? 'packs' : 'topups';
        for (const [key, from] of [['last7', start7], ['last30', start30]]) {
          if (p.paidAtMs >= from) {
            totals[key][bucket].count += 1;
            totals[key][bucket].inr += p.amountInr;
          }
        }
      }
      // The read stopped at READ_CAP: if its oldest row is still inside the 30-day window, older sales may be missing.
      const readFull = snap.size >= READ_CAP;
      const oldestMs = paid.length ? paid[paid.length - 1].paidAtMs : null;
      totals.complete = !(readFull && (oldestMs === null || oldestMs >= start30));

      const shown = paid.slice(0, SHOWN_CAP);
      const profiles = await profilesFor([...new Set(shown.map((p) => p.uid))]);
      const items = shown.map((p) => {
        const pr = profiles.get(p.uid) || { email: null, name: null };
        return { ...p, email: pr.email, name: pr.name };
      });
      return send(res, 200, { ok: true, items, totals, truncated: paid.length > SHOWN_CAP || readFull });
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

module.exports = { createAdminPurchasesRoutes, handleAdminPurchases };
