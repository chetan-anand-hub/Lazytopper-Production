'use strict';
/**
 * POST /api/pay/move-to-other - SIGNED-IN-MOVE-1 (owner 12 Nov 2026). A signed-in buyer moves what they just paid for to the account
 * of the person who will use it. Body { orderId, phone? | email? } (one of them). Signed in only (verified Firebase uid).
 *
 * ★ Auth = the VERIFIED uid; the order must be THIS caller's own signed-in checkout (services/moveToOther.assertMovable).
 * ★ Every refusal that does not depend on the target is decided BEFORE any account is made for them (precheck), so a refused move
 *   never leaves a stray account behind. Then the target is found or created by the SAME rules the "someone else" checkout uses
 *   (guestPay findOrCreateAccount: an account with that phone, or one this server made; a real account that only has the typed EMAIL
 *   is refused - never a silent hand-over on an unverified address), then the move itself (services/moveToOther).
 * ★ Answers carry the target MASKED only. Logs / counters carry no phone, no email, no uid. Audit: uids only (adminMoves).
 * ★ Kill switch PAY_MOVE_TO_OTHER_DISABLED=1 -> 404, nothing moves. Needs the payments + "who will use it" switches ON like the rest.
 */
const { MoveError } = require('../services/adminMovePurchase.cjs');
const { moveOrderToOther, precheck, isMoveToOtherDisabled, MoveRefusal, REFUSALS } = require('../services/moveToOther.cjs');
const { normaliseEmail, maskEmail, normaliseIndianMobile, maskIndianMobile } = require('../services/guestPay.cjs');
const { readRawBody } = require('./payments.cjs');

const MOVE_TO_OTHER_PATH = '/api/pay/move-to-other';
const MAX_JSON_BYTES = 4 * 1024;
const ID_PATTERN = /^[A-Za-z0-9_]{1,64}$/;
const NOT_FOUND_BODY = Object.freeze({ error: 'Not Found' });
const ERASED_UID = 'erased';
/** A signed-in buyer makes at most this many attempts an hour (typos happen; a loop does not). */
const MAX_PER_HOUR = 10;

function createMoveToOtherRoutes(deps = {}) {
  const { sendJson, verifiedCaller, adminFirestore, telemetry, env = process.env, now = () => Date.now(), receiptEmailer } = deps;
  /** Late-bound (guestPayRoutes is built after this): async (orderId, { phone, email, first }) => { uid, ... } | { uid: null, reason }. */
  const findOrCreateAccount = (...a) => (typeof deps.findOrCreateAccount === 'function' ? deps.findOrCreateAccount(...a) : Promise.resolve({ uid: null, reason: 'create_failed' }));
  const hits = new Map();

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail a move */
    }
  }

  function limited(uid) {
    const t = now();
    const recent = (hits.get(uid) || []).filter((x) => t - x < 60 * 60 * 1000);
    recent.push(t);
    hits.set(uid, recent);
    if (hits.size > 5000) hits.clear();
    return recent.length > MAX_PER_HOUR;
  }

  async function readJsonBody(req, res) {
    try {
      const buf = await readRawBody(req, MAX_JSON_BYTES);
      const parsed = JSON.parse(buf.length ? buf.toString('utf8') : '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      return parsed;
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
      return null;
    }
  }

  function refuse(res, code) {
    const [status, message] = REFUSALS[code] || REFUSALS.unsupported;
    emit(`payments.move_to_other.refused.${code}`);
    return sendJson(res, status, { ok: false, error: 'move_refused', reason: code, message });
  }

  async function callerUid(req) {
    if (!req.headers || !req.headers.authorization) return '';
    try {
      const uid = verifiedCaller && typeof verifiedCaller.resolveVerifiedUid === 'function' ? await verifiedCaller.resolveVerifiedUid(req) : '';
      return typeof uid === 'string' && uid && uid !== ERASED_UID ? uid : '';
    } catch {
      return '';
    }
  }

  async function handleMoveToOther(req, res) {
    if (isMoveToOtherDisabled(env)) return sendJson(res, 404, NOT_FOUND_BODY);
    if (!adminFirestore) return sendJson(res, 503, { ok: false, error: 'Unavailable right now.' });
    const uid = await callerUid(req);
    if (!uid) return sendJson(res, 401, { ok: false, error: 'Sign in first.' });
    if (limited(uid)) {
      emit('payments.move_to_other.rate_limited');
      return sendJson(res, 429, { ok: false, error: 'Too many attempts. Please try again later.' });
    }
    const body = await readJsonBody(req, res);
    if (!body) return undefined;
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    if (!ID_PATTERN.test(orderId)) return sendJson(res, 400, { ok: false, error: 'move_rejected', reason: 'malformed' });
    const hasPhone = body.phone !== undefined && body.phone !== null && body.phone !== '';
    const hasEmail = body.email !== undefined && body.email !== null && body.email !== '';
    if (hasPhone === hasEmail) return sendJson(res, 400, { ok: false, error: 'move_rejected', reason: 'one_contact' });
    const phone = hasPhone ? normaliseIndianMobile(body.phone) : null;
    const email = hasEmail ? normaliseEmail(body.email) : null;
    if (hasPhone ? !phone : !email) return sendJson(res, 400, { ok: false, error: 'move_rejected', reason: 'invalid_contact' });

    const nowMs = now();
    try {
      // 1. Everything that does not depend on the target, BEFORE an account is made for them.
      await precheck({ db: adminFirestore, orderId, callerUid: uid, nowMs });
      // 2. The target account: found, or made for exactly the identifier typed.
      let made;
      try {
        made = await findOrCreateAccount(orderId, { phone, email, first: phone ? 'phone' : 'email' });
      } catch {
        made = { uid: null, reason: 'create_failed' };
      }
      if (!made || !made.uid) return refuse(res, made && /in_use|taken/.test(String(made.reason || '')) ? 'target_in_use' : 'cannot_check');
      // 3. The move (re-checks everything inside its own transaction).
      const out = await moveOrderToOther({ db: adminFirestore, orderId, callerUid: uid, toUid: made.uid, nowMs, env });
      emit(`payments.move_to_other.moved.${out.kind}`);
      // A receipt not yet sent (no address earlier, a retry) now names the account the purchase is on: nothing to do here but let it run.
      try {
        const order = (await adminFirestore.collection('payOrders').doc(orderId).get()).data() || {};
        if (receiptEmailer && typeof receiptEmailer.sendForPayment === 'function' && order.paymentId) {
          void receiptEmailer.sendForPayment({ orderId, paymentId: order.paymentId, email: '' });
        }
      } catch {
        /* the receipt is best effort */
      }
      return sendJson(res, 200, {
        ok: true,
        moved: out.moved !== false,
        kind: out.kind,
        to: phone ? { kind: 'phone', masked: maskIndianMobile(phone) } : { kind: 'email', masked: maskEmail(email) },
      });
    } catch (e) {
      if (e instanceof MoveRefusal) return refuse(res, e.code);
      if (e instanceof MoveError) {
        emit(`payments.move_to_other.refused.move_error_${e.status}`);
        return sendJson(res, e.status === 404 ? 404 : 409, { ok: false, error: 'move_refused', reason: 'unsupported', message: REFUSALS.unsupported[1] });
      }
      emit('payments.move_to_other.error');
      console.error('[pay/move-to-other] failed:', e && e.name);
      return sendJson(res, 500, { ok: false, error: 'Could not move that right now. Nothing was changed.' });
    }
  }

  return { handleMoveToOther, isEnabled: () => !isMoveToOtherDisabled(env) };
}

module.exports = { createMoveToOtherRoutes, MOVE_TO_OTHER_PATH };
