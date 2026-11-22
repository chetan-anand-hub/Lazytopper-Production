'use strict';
/**
 * adminUnpaidOrders - UNPAID-ORDERS-LIST-1 (owner YES 22 Nov 2026). "Ordered, not paid" on /admin/students.
 *
 *   GET /api/admin/unpaid-orders[?days=7] -> { ok, items: [...], hiddenPaidLater, ... }     READ-ONLY, ADMIN-ONLY
 *
 * ★ WHAT IT LISTS. One row per order in `payOrders` that is still `status: 'created'` (no paymentId, no paidAt) and was
 *   created in the last 24 h (rolling, from the server clock; times are shown in IST on the card), or the last 7 x 24 h with
 *   `?days=7`. Newest first. The writers are routes/payments.cjs, routes/parentPay.cjs and routes/guestPay.cjs (handleOrder):
 *   every one stores `status: 'created'` + `createdAt`, and only the grant transactions move an order past it.
 *
 * ★ LEFT OUT (never shown, never counted as a row):
 *     - top-ups (pricing.isTopupProduct) and orders of erased accounts (uid 'erased');
 *     - ADMIN / TEST orders: the same rule as the Purchases card (adminPurchases.cjs, TEST-ACCOUNTS-1) - uid or payerUid in
 *       ADMIN_FIREBASE_UIDS, or an account / guest email in TEST_ACCOUNT_EMAILS;
 *     - an order whose buyer has SINCE PAID for the same product (owner choice: hide, and show the count `hiddenPaidLater`).
 *       "Same buyer" = any shared uid / payerUid / phone / email on the two orders; "same product" = any Board Pass for a
 *       Board Pass, the same pack (sku + target) for a pack; "since" = the payment came at or after the unpaid order.
 *
 * ★ CONTACT RULE (many buyers are minors). The payer's contact is returned in FULL only when THIS order carries the
 *   WhatsApp consent tick (`waOptIn`, WHATSAPP-OPTIN-1: a valid number + consentVersion, stored only when the visitor ticked).
 *   Otherwise every value is MASKED here, on the server - the full value never leaves the store. "Payer" means:
 *     signed-in student  -> the account's email / phone (Firebase Auth);
 *     guest phone order  -> the number (and email) typed at checkout;
 *     for someone        -> the signed-in payer's account (payerUid); the RECIPIENT's phone / email is never shown here;
 *     parent link        -> nothing is stored for the parent on the order, so no contact;
 *     any order          -> the WhatsApp number the visitor ticked consent for.
 *   Nothing here exports, emails or writes anything. Logs carry error codes only - never a phone, an email or a uid.
 *
 * ★ KILL SWITCH. UNPAID_ORDERS_LIST_DISABLED=1 (or true/on/yes) -> 404 before the gate; the card then hides itself.
 * Gate pattern is adminPurchases.cjs: requireAdmin FIRST, 503 if gate / Firestore missing, no-store.
 */
const { maskIndianMobile, maskEmail, normaliseIndianMobile, normaliseEmail } = require('../services/guestPay.cjs');
const pricing = require('../services/passPricing.cjs');
const { isPackProduct, packIdFor } = require('../services/packProducts.cjs');
const { emailItemLabel } = require('../services/paymentReceiptEmail.cjs');

const PAY_ORDERS_COLLECTION = 'payOrders';
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ALLOWED_DAYS = Object.freeze([1, 7]);
const READ_CAP = 500;
const SHOWN_CAP = 100;
const ERASED_UID = 'erased';
/** Statuses that mean the money arrived (a granted order, or a guest payment waiting for / past its claim). */
const PAID_STATUSES = Object.freeze(['paid', 'paid_unclaimed', 'claimed', 'duplicate_purchase', 'erased_unclaimed']);

const BUYER_TYPE = Object.freeze({ signedIn: 'signed_in', guest: 'guest', forSomeone: 'for_someone', parent: 'parent' });

/** The switch: 1 / true / on / yes turns the list OFF. PURE. */
function isUnpaidOrdersListDisabled(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.UNPAID_ORDERS_LIST_DISABLED) || '').trim());
}

const msOf = (v) => (v instanceof Date ? v.getTime() : v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** `?days=7` -> 7; anything else -> 1. PURE. */
function daysFrom(url) {
  const q = String(url || '').split('?')[1] || '';
  const n = Number(new URLSearchParams(q).get('days'));
  return ALLOWED_DAYS.includes(n) ? n : 1;
}

/** A phone masked: an Indian mobile as "+91 98•••••948"; anything else keeps only its last two digits. PURE. */
function maskPhone(raw) {
  const s = str(raw);
  if (!s) return '';
  const indian = maskIndianMobile(s);
  if (indian) return indian;
  const digits = s.replace(/\D/g, '');
  return digits.length >= 4 ? `•••••${digits.slice(-2)}` : '•••';
}

/** The comparable product of an order: any Board Pass is one product; a pack is sku:target. PURE. */
function productKeyOf(o) {
  const passType = str(o && o.passType);
  if (!passType) return null;
  if (passType === 'till_boards') return 'board_pass';
  if (isPackProduct(passType)) return packIdFor(passType, o.packTarget) || `${passType}:${String(o.packTarget || '')}`;
  return passType;
}

/** The human product name, falling back to the raw sku. PURE. */
function productNameOf(o) {
  const passType = str(o && o.passType) || '';
  const target = str(o && o.packTarget);
  let label = null;
  try {
    label = emailItemLabel(passType, target);
  } catch {
    label = null;
  }
  return label || (target ? `${passType} (${target})` : passType || 'Unknown product');
}

/** The order's valid WhatsApp consent: the E.164 number, or null. Only a ticked opt-in is ever stored. PURE. */
function consentPhoneOf(o) {
  const w = o && o.waOptIn;
  if (!w || typeof w !== 'object' || Array.isArray(w)) return null;
  if (!str(w.consentVersion)) return null;
  return normaliseIndianMobile(typeof w.phone === 'string' ? w.phone : '') || null;
}

/** Every identity that names the buyer of an order (for "paid later"). PURE. */
function buyerKeysOf(o) {
  const keys = new Set();
  const uid = str(o.uid);
  if (uid && uid !== ERASED_UID) keys.add(`uid:${uid}`);
  const payerUid = str(o.payerUid);
  if (payerUid) keys.add(`uid:${payerUid}`);
  for (const p of [o.guestPhone, o.waOptIn && o.waOptIn.phone]) {
    const n = normaliseIndianMobile(typeof p === 'string' ? p : '');
    if (n) keys.add(`phone:${n}`);
  }
  const e = normaliseEmail(typeof o.guestEmail === 'string' ? o.guestEmail : '');
  if (e) keys.add(`email:${e}`);
  return keys;
}

/** signed_in | guest | for_someone | parent. PURE. */
function buyerTypeOf(o) {
  if (o.payer === 'parent') return BUYER_TYPE.parent;
  if (o.payer === 'guest') return o.checkoutWho === true && o.selfPay !== true ? BUYER_TYPE.forSomeone : BUYER_TYPE.guest;
  return BUYER_TYPE.signedIn;
}

function adminUidSet(env) {
  return new Set(String((env && env.ADMIN_FIREBASE_UIDS) || '').split(',').map((s) => s.trim()).filter(Boolean));
}
function testEmailSet(env) {
  return new Set(String((env && env.TEST_ACCOUNT_EMAILS) || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
}

function createAdminUnpaidOrdersRoutes(deps = {}) {
  const { sendJson, sendJsonWithHeaders, adminFirestore, firebaseAdmin, requireAdmin } = deps;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const envOf = () => deps.env || process.env;
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

  const authApi = () => (firebaseAdmin && typeof firebaseAdmin.auth === 'function' ? firebaseAdmin.auth() : null);

  /** ADMIN / TEST: the admin uids plus the uids of TEST_ACCOUNT_EMAILS (adminPurchases TEST-ACCOUNTS-1). Never logged. */
  async function flagged(env) {
    const uids = adminUidSet(env);
    const emails = testEmailSet(env);
    const fa = emails.size ? authApi() : null;
    if (fa && typeof fa.getUserByEmail === 'function') {
      for (const email of emails) {
        try {
          const u = await fa.getUserByEmail(email);
          if (u && typeof u.uid === 'string' && u.uid) uids.add(u.uid);
        } catch (e) {
          if (!e || e.code !== 'auth/user-not-found') console.error('[admin-unpaid-orders] test-account lookup failed:', (e && e.code) || 'error');
        }
      }
    }
    return { uids, emails };
  }

  /** uid -> { email, phone } from Firebase Auth, in batches of 100. A failed batch = no contact for those (never a guess). */
  async function profilesFor(uids) {
    const out = new Map();
    const fa = authApi();
    if (!uids.length || !fa || typeof fa.getUsers !== 'function') return out;
    for (let i = 0; i < uids.length; i += 100) {
      try {
        const r = await fa.getUsers(uids.slice(i, i + 100).map((uid) => ({ uid })));
        for (const u of (r && r.users) || []) out.set(u.uid, { email: str(u.email), phone: str(u.phoneNumber) });
      } catch (e) {
        console.error('[admin-unpaid-orders] profile lookup failed:', (e && e.code) || 'error');
      }
    }
    return out;
  }

  /** The payer's raw contacts for one order (still UNMASKED - only `contactsOut` may leave this module). */
  function rawContacts(o, type, profiles) {
    const out = [];
    const add = (kind, source, value) => {
      const v = kind === 'phone' ? str(value) : normaliseEmail(typeof value === 'string' ? value : '') || null;
      if (v && !out.some((c) => c.kind === kind && c.value === v)) out.push({ kind, source, value: v });
    };
    if (type === BUYER_TYPE.signedIn) {
      const p = profiles.get(str(o.uid)) || {};
      add('email', 'account', p.email);
      add('phone', 'account', p.phone);
    } else if (type === BUYER_TYPE.forSomeone) {
      const payerUid = str(o.payerUid);
      const p = (payerUid && profiles.get(payerUid)) || {};
      add('email', 'account', p.email);
      add('phone', 'account', p.phone);
    } else if (type === BUYER_TYPE.guest) {
      add('phone', 'checkout', normaliseIndianMobile(typeof o.guestPhone === 'string' ? o.guestPhone : '') || null);
      add('email', 'checkout', o.guestEmail);
    }
    const wa = consentPhoneOf(o);
    if (wa) {
      const same = out.find((c) => c.kind === 'phone' && normaliseIndianMobile(c.value) === wa);
      if (same) same.source = 'whatsapp';
      else out.push({ kind: 'phone', source: 'whatsapp', value: wa });
    }
    return out;
  }

  /** ★ THE CONTACT RULE: full only with consent on this order; masked otherwise. */
  function contactsOut(raw, consent) {
    return raw.map((c) => ({
      kind: c.kind,
      source: c.source,
      masked: c.kind === 'phone' ? maskPhone(c.value) : maskEmail(c.value) || '•••',
      ...(consent ? { full: c.value } : {}),
    }));
  }

  async function list(req, res) {
    const env = envOf();
    if (isUnpaidOrdersListDisabled(env)) return send(res, 404, { ok: false, error: 'Not found' });
    const auth = await gate(req, res);
    if (!auth) return undefined;
    try {
      const nowMs = now();
      const days = daysFrom(req && req.url);
      const sinceMs = nowMs - days * DAY_MS;
      const snap = await adminFirestore
        .collection(PAY_ORDERS_COLLECTION)
        .where('createdAt', '>=', new Date(sinceMs))
        .orderBy('createdAt', 'desc')
        .limit(READ_CAP)
        .get();
      const docs = [];
      snap.forEach((d) => docs.push({ id: d.id, o: (typeof d.data === 'function' && d.data()) || {} }));
      const { uids: adminUids, emails: testEmails } = await flagged(env);
      const isAdminTest = (o) =>
        (str(o.uid) && adminUids.has(str(o.uid))) ||
        (str(o.payerUid) && adminUids.has(str(o.payerUid))) ||
        (typeof o.guestEmail === 'string' && testEmails.has(o.guestEmail.trim().toLowerCase()));

      // Payments in the read, for "paid later".
      const paid = [];
      for (const { o } of docs) {
        if (!PAID_STATUSES.includes(o.status) || !str(o.paymentId)) continue;
        const atMs = msOf(o.paidAt) ?? msOf(o.guestPaidAt) ?? msOf(o.createdAt);
        const product = productKeyOf(o);
        if (atMs === null || !product) continue;
        paid.push({ atMs, product, keys: buyerKeysOf(o) });
      }

      const rows = [];
      let hiddenPaidLater = 0;
      let excludedAdminTest = 0;
      for (const { id, o } of docs) {
        const createdAtMs = msOf(o.createdAt);
        if (o.status !== 'created' || createdAtMs === null || createdAtMs < sinceMs) continue;
        if (str(o.paymentId) || msOf(o.paidAt) !== null) continue;
        if (pricing.isTopupProduct(o.passType)) continue;
        if (o.uid === ERASED_UID) continue;
        if (isAdminTest(o)) {
          excludedAdminTest += 1;
          continue;
        }
        const product = productKeyOf(o);
        const keys = buyerKeysOf(o);
        const paidLater = product && paid.some((p) => p.product === product && p.atMs >= createdAtMs && [...p.keys].some((k) => keys.has(k)));
        if (paidLater) {
          hiddenPaidLater += 1;
          continue;
        }
        rows.push({ id, o, createdAtMs });
      }
      rows.sort((a, b) => b.createdAtMs - a.createdAtMs);
      const shown = rows.slice(0, SHOWN_CAP);

      const lookup = new Set();
      for (const { o } of shown) {
        const type = buyerTypeOf(o);
        if (type === BUYER_TYPE.signedIn && str(o.uid)) lookup.add(str(o.uid));
        if (type === BUYER_TYPE.forSomeone && str(o.payerUid)) lookup.add(str(o.payerUid));
      }
      const profiles = await profilesFor([...lookup]);

      const items = shown.map(({ id, o, createdAtMs }) => {
        const buyerType = buyerTypeOf(o);
        const consent = consentPhoneOf(o) !== null;
        return {
          orderId: id,
          createdAtMs,
          product: { name: productNameOf(o), passType: str(o.passType) || '', packTarget: str(o.packTarget) },
          amountInr: Number.isFinite(o.amountPaise) ? o.amountPaise / 100 : null,
          buyerType,
          consent,
          contacts: contactsOut(rawContacts(o, buyerType, profiles), consent),
        };
      });

      return send(res, 200, {
        ok: true,
        days,
        sinceMs,
        generatedAtMs: nowMs,
        items,
        hiddenPaidLater,
        excludedAdminTest,
        truncated: rows.length > SHOWN_CAP || docs.length >= READ_CAP,
      });
    } catch (e) {
      console.error('[admin-unpaid-orders] read failed:', (e && e.code) || 'error');
      return send(res, 500, { ok: false, error: 'Could not read the orders' });
    }
  }

  return { list };
}

let mounted = null;
function handleAdminUnpaidOrders(req, res, deps) {
  if (!mounted) mounted = createAdminUnpaidOrdersRoutes(deps);
  return mounted.list(req, res);
}

module.exports = {
  createAdminUnpaidOrdersRoutes,
  handleAdminUnpaidOrders,
  isUnpaidOrdersListDisabled,
  maskPhone,
  productKeyOf,
  buyerKeysOf,
  daysFrom,
  UNPAID_ORDERS_PATH: '/api/admin/unpaid-orders',
};
