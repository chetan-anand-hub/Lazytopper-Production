'use strict';
/**
 * Email-code sign-in — EMAIL-CODE-1 (owner 4 Nov 2026 11:39): "can a student just log in there only, using some code in
 * their email?" Type a 6-digit code from the inbox on the SAME screen, like the phone OTP. Firebase has no email OTP, so:
 *
 *   POST /api/auth/email-code/send    { email }         no auth    EMAIL_CODE_SIGNIN_ENABLED
 *   POST /api/auth/email-code/verify  { email, code }   no auth    EMAIL_CODE_SIGNIN_ENABLED
 *
 * ★★ DARK BY DEFAULT. Switch off -> both answer the gateway's own 404 before anything is read.
 *
 * ★★ NO ENUMERATION. `send` answers the SAME `200 { ok: true }` for every well-formed address, and answers it BEFORE
 *    anything about the address is looked up: a code is issued (and its hash stored) for EVERY address; whether it is
 *    emailed is decided afterwards, off the response path. It is emailed only when an account uses that email, or (pay
 *    first, PAY_AUTO_ACCOUNT on) a paid order is waiting for that email as its account's identifier; otherwise nobody
 *    ever sees that code. So `verify` behaves identically for both kinds of address too (wrong code -> tries left, 5 ->
 *    locked, 10 min -> expired). The per-email and per-IP limits count REQUESTS, never eligibility.
 *
 * ★★ THE SIGN-IN IS ONLY EVER INTO THE ACCOUNT THAT OWNS THE EMAIL. After a matching code, the account is
 *    firebase-admin getUserByEmail(<the normalised email the code was issued for>) and nothing else: the body carries
 *    no uid, and none is read. The credential returned is a one-time Firebase EMAIL SIGN-IN LINK for that email
 *    (Admin generateSignInWithEmailLink — the same credential the "Send me the sign-in link" email carries), which the
 *    browser redeems with signInWithEmailLink: Firebase signs in the account that owns that email.
 *    WHY NOT A CUSTOM TOKEN (the brief's first design): firebase/auth lives in the ENTRY chunk, so ANY use of
 *    signInWithCustomToken anywhere adds it to the entry (measured +311 B raw / +73 B gz) and breaks the PERF-3 budget
 *    (32 B headroom at trunk with the CI capture flags). signInWithEmailLink is already in the entry: zero cost. A disabled account gets nothing. No account yet but a pay-first order waiting for
 *    this email -> the EXISTING pay-first delivery (guestPay afterRecipientPaid: findOrCreate under its first-identifier
 *    rules, then the same take + grant) runs, and the account it made is looked up again by email. Never a merge: an
 *    email belongs to at most one Firebase account, and that one is used.
 *
 * ★ An UNVERIFIED email on that account is marked verified: typing the code proves the student reads that inbox (the same
 *   proof an email sign-in link gives). If the account also has a PASSWORD, that password is removed and its sessions
 *   revoked FIRST (review H1): a stranger who registered the address with a password before its owner loses all access.
 *
 * ★ PRIVACY. The code is never logged, counted, put in a URL or echoed back; neither is the email. Telemetry names are
 *   fixed strings. The sign-in link travels only in this response body (Cache-Control: no-store).
 */

const {
  isEmailCodeSigninEnabled,
  resolveSecret,
  clientKey,
  resolveTrustedHops,
  createWindowLimiter,
  createDistinctLimiter,
  createDailyCounter,
  createCodeStore,
  PER_EMAIL_SEND_RULES,
  PER_IP_SEND_RULES,
  PER_IP_VERIFY_RULES,
} = require('../services/emailCode.cjs');
const { normaliseEmail, GUEST_PAYER, GUEST_STATUS } = require('../services/guestPay.cjs');
const { readRawBody, PAY_ORDERS_COLLECTION } = require('./payments.cjs');

const EMAIL_CODE_SEND_PATH = '/api/auth/email-code/send';
const EMAIL_CODE_VERIFY_PATH = '/api/auth/email-code/verify';

const MAX_JSON_BYTES = 4 * 1024;
const MAX_WAITING_ORDERS = 10;
/** Real code emails per rolling 24 h, all addresses together (an anti-catastrophe ceiling on the Resend bill). */
const DEFAULT_DAILY_SEND_CAP = 500;
const NOT_FOUND_BODY = Object.freeze({ error: 'Not Found' });

function createEmailCodeRoutes(deps = {}) {
  const {
    sendJson,
    sendJsonWithHeaders,
    adminFirestore,
    telemetry,
    env = process.env,
    now = () => Date.now(),
    /**
     * firebase-admin, wired in index.cjs: { getUserByEmail(email) -> record | null, updateUser(uid, props),
     * createSignInLink(email) -> string (generateSignInWithEmailLink), revokeRefreshTokens(uid) }.
     */
    authAccounts,
    /** { ready() -> boolean, send({ to, code }) -> { ok } } (services/emailCodeEmail.cjs). */
    mailer,
    /** guestPay's afterRecipientPaid({ orderId, paymentId }) - the EXISTING pay-first delivery. Optional. */
    deliverWaitingOrder,
    /** () => boolean - guestPay's isPayAutoAccountEnabled(env). Optional (absent -> no waiting-order path). */
    payAutoAccountEnabled,
  } = deps;
  const maxKeys = Number.isInteger(deps.maxKeys) && deps.maxKeys > 0 ? deps.maxKeys : undefined;
  const store = deps.store || createCodeStore({ secret: resolveSecret(env), now, ...(maxKeys ? { maxEntries: maxKeys } : {}) });
  const dailyCap = Number.isInteger(deps.dailySendCap) ? deps.dailySendCap : (() => {
    const n = Number(env.EMAIL_CODE_DAILY_CAP);
    return Number.isInteger(n) && n > 0 ? n : DEFAULT_DAILY_SEND_CAP;
  })();
  // Review M1: one map per KIND of key (a flood of one kind can never crowd out another), each failing closed when full.
  const lim = {
    email: createWindowLimiter({ now, maxKeys }),
    ipSend: createWindowLimiter({ now, maxKeys }),
    ipVerify: createWindowLimiter({ now, maxKeys }),
    distinct: createDistinctLimiter({ now, maxKeys }),
    daily: createDailyCounter({ now, cap: dailyCap }),
  };
  const trustedHops = resolveTrustedHops(env);
  const pending = new Set();

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail a sign-in */
    }
  }

  function ready() {
    return !!authAccounts && typeof authAccounts.getUserByEmail === 'function' && !!mailer && mailer.ready();
  }

  async function readJsonBody(req, res) {
    try {
      const buf = await readRawBody(req, MAX_JSON_BYTES);
      const parsed = JSON.parse(buf.length ? buf.toString('utf8') : '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      return parsed;
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid_request' });
      return null;
    }
  }

  /** Review M1: a limiter / the store is full of live keys -> fail CLOSED with the generic answer (same for every address). */
  function full(res, scope) {
    emit(`auth.email_code.${scope}.full`);
    return sendJson(res, 503, { ok: false, error: 'unavailable' });
  }

  function tooMany(res, verdict) {
    return sendJson(res, 429, { ok: false, error: 'too_many', retryAfterSec: Math.max(1, Math.ceil(verdict.retryAfterMs / 1000)) });
  }

  /** The firebase-admin record that owns this email, or null (no account, disabled, or the record names another email). */
  async function ownerOf(email) {
    const rec = await authAccounts.getUserByEmail(email);
    if (!rec || typeof rec.uid !== 'string' || !rec.uid || rec.disabled === true) return null;
    if (normaliseEmail(rec.email || '') !== email) return null;
    return rec;
  }

  /**
   * Paid pay-first orders waiting for THIS email as the identifier their account would be made with (the email was
   * typed first, or alone): findOrCreate makes an account from the FIRST identifier only, so an order whose first
   * identifier is a phone can never become an email account and is not offered here.
   */
  async function waitingOrdersFor(email) {
    if (!adminFirestore || typeof payAutoAccountEnabled !== 'function' || !payAutoAccountEnabled()) return [];
    const snap = await adminFirestore
      .collection(PAY_ORDERS_COLLECTION)
      .where('guestEmail', '==', email)
      .where('status', '==', GUEST_STATUS.paidUnclaimed)
      .limit(MAX_WAITING_ORDERS)
      .get();
    const docs = snap && Array.isArray(snap.docs) ? snap.docs : [];
    return docs
      .map((d) => ({ id: d.id, o: typeof d.data === 'function' ? d.data() || {} : {} }))
      .filter(({ o }) => o.payer === GUEST_PAYER && o.checkoutWho === true && typeof o.paymentId === 'string' && !!o.paymentId)
      .filter(({ o }) => o.recipientFirst === 'email' || !o.guestPhone)
      .filter(({ o }) => o.uid === null || o.uid === undefined);
  }

  /** Off the response path: email the code only to an address that can sign in with it. Never throws. */
  async function deliver(email, code) {
    try {
      const eligible = !!(await ownerOf(email)) || (await waitingOrdersFor(email)).length > 0;
      if (!eligible) {
        emit('auth.email_code.send.no_account');
        return;
      }
      if (!lim.daily.take()) {
        emit('auth.email_code.send.daily_cap');
        return;
      }
      const sent = await mailer.send({ to: email, code });
      emit(sent && sent.ok ? 'auth.email_code.send.sent' : 'auth.email_code.send.failed');
    } catch (e) {
      emit('auth.email_code.send.failed');
      console.error('[auth/email-code/send] delivery failed:', e && e.code ? e.code : 'error');
    }
  }

  /* ── POST /api/auth/email-code/send ───────────────────────────────────────── */
  async function handleSend(req, res) {
    if (!isEmailCodeSigninEnabled(env)) return sendJson(res, 404, NOT_FOUND_BODY);
    const ipKey = clientKey(req, trustedHops);
    const ipVerdict = lim.ipSend.hit(ipKey, PER_IP_SEND_RULES);
    if (ipVerdict.full) return full(res, 'send');
    if (!ipVerdict.allowed) {
      emit('auth.email_code.send.rate_limited_ip');
      return tooMany(res, ipVerdict);
    }
    const body = await readJsonBody(req, res);
    if (!body) return undefined;
    const email = normaliseEmail(typeof body.email === 'string' ? body.email : '');
    if (!email) return sendJson(res, 400, { ok: false, error: 'invalid_email' });
    if (!ready()) {
      emit('auth.email_code.unavailable');
      return sendJson(res, 503, { ok: false, error: 'unavailable' });
    }
    const emailId = store.idFor(email);
    const emailVerdict = lim.email.hit(emailId, PER_EMAIL_SEND_RULES);
    if (emailVerdict.full) return full(res, 'send');
    if (!emailVerdict.allowed) {
      emit('auth.email_code.send.rate_limited_email');
      return tooMany(res, emailVerdict);
    }
    // Review M3: one IP, at most 10 DIFFERENT emails a day (counted for every address alike).
    const distinct = lim.distinct.hit(ipKey, emailId);
    if (distinct.full) return full(res, 'send');
    if (!distinct.allowed) {
      emit('auth.email_code.send.rate_limited_ip_emails');
      return sendJson(res, 429, { ok: false, error: 'too_many' });
    }
    // Review M3: past the day's ceiling no code is even made (the answer is the same "sent"; the admin sees the counter).
    if (lim.daily.reached()) {
      emit('auth.email_code.send.daily_cap');
      return sendJson(res, 200, { ok: true });
    }
    const code = store.issue(email);
    if (code === null) return full(res, 'send');
    emit('auth.email_code.send.accepted');
    sendJson(res, 200, { ok: true });
    const p = deliver(email, code).finally(() => pending.delete(p));
    pending.add(p);
    return undefined;
  }

  /* ── POST /api/auth/email-code/verify ─────────────────────────────────────── */
  async function handleVerify(req, res) {
    if (!isEmailCodeSigninEnabled(env)) return sendJson(res, 404, NOT_FOUND_BODY);
    const ipVerdict = lim.ipVerify.hit(clientKey(req, trustedHops), PER_IP_VERIFY_RULES);
    if (ipVerdict.full) return full(res, 'verify');
    if (!ipVerdict.allowed) {
      emit('auth.email_code.verify.rate_limited_ip');
      return tooMany(res, ipVerdict);
    }
    const body = await readJsonBody(req, res);
    if (!body) return undefined;
    const email = normaliseEmail(typeof body.email === 'string' ? body.email : '');
    if (!email) return sendJson(res, 400, { ok: false, error: 'invalid_email' });
    const code = typeof body.code === 'string' || typeof body.code === 'number' ? String(body.code).replace(/\s/g, '') : '';
    if (!/^\d{6}$/.test(code)) return sendJson(res, 400, { ok: false, error: 'invalid_code' });
    if (!ready() || typeof authAccounts.createSignInLink !== 'function') {
      emit('auth.email_code.unavailable');
      return sendJson(res, 503, { ok: false, error: 'unavailable' });
    }

    const verdict = store.check(email, code);
    if (verdict.status === 'mismatch') {
      emit('auth.email_code.verify.mismatch');
      return sendJson(res, 200, { ok: false, error: 'code_mismatch', triesLeft: verdict.triesLeft });
    }
    if (verdict.status === 'locked') {
      emit('auth.email_code.verify.locked');
      return sendJson(res, 200, { ok: false, error: 'too_many_tries' });
    }
    if (verdict.status !== 'ok') {
      emit('auth.email_code.verify.expired');
      return sendJson(res, 200, { ok: false, error: 'code_expired' });
    }

    // The code matched (and is used up). From here on the address is PROVEN to be the caller's.
    try {
      let rec = await ownerOf(email);
      if (!rec && typeof deliverWaitingOrder === 'function') {
        const waiting = await waitingOrdersFor(email);
        for (const { id, o } of waiting) await deliverWaitingOrder({ orderId: id, paymentId: o.paymentId });
        if (waiting.length) rec = await ownerOf(email);
      }
      if (!rec) {
        emit('auth.email_code.verify.no_account');
        return sendJson(res, 200, { ok: false, error: 'no_account' });
      }
      if (rec.emailVerified !== true) {
        // Review H1 (pre-registration takeover): someone may have registered this address with a PASSWORD before its
        // owner. The code proves the owner reads this inbox, so that password is REMOVED (and its sessions revoked)
        // BEFORE the address is marked verified - the pre-registrant keeps no way in. The owner signs in by this code /
        // the email link, and can set a password again later through "Forgot password".
        const hasPassword = Array.isArray(rec.providerData) && rec.providerData.some((p) => p && p.providerId === 'password');
        if (hasPassword) {
          await authAccounts.updateUser(rec.uid, { providersToUnlink: ['password'] });
          if (typeof authAccounts.revokeRefreshTokens === 'function') await authAccounts.revokeRefreshTokens(rec.uid);
          emit('auth.email_code.verify.password_removed');
        }
        await authAccounts.updateUser(rec.uid, { emailVerified: true });
        emit('auth.email_code.verify.email_verified');
      }
      // For the OWNER's address only (the record's own email, normalised - equal to the one the code was issued for).
      const link = await authAccounts.createSignInLink(email);
      if (typeof link !== 'string' || !link) throw Object.assign(new Error('no link'), { code: 'no_link' });
      emit('auth.email_code.verify.signed_in');
      const headers = { 'Cache-Control': 'no-store' };
      if (typeof sendJsonWithHeaders === 'function') return sendJsonWithHeaders(res, 200, { ok: true, link }, headers);
      return sendJson(res, 200, { ok: true, link });
    } catch (e) {
      emit('auth.email_code.verify.failed');
      console.error('[auth/email-code/verify] sign-in failed:', e && e.code ? e.code : 'error');
      return sendJson(res, 503, { ok: false, error: 'unavailable' });
    }
  }

  /** Tests: wait for the off-path deliveries. */
  async function whenIdle() {
    while (pending.size) await Promise.all([...pending]);
  }

  return { handleSend, handleVerify, whenIdle, isEnabled: () => isEmailCodeSigninEnabled(env) };
}

module.exports = { createEmailCodeRoutes, EMAIL_CODE_SEND_PATH, EMAIL_CODE_VERIFY_PATH, DEFAULT_DAILY_SEND_CAP };
