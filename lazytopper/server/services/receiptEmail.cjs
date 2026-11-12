'use strict';
/**
 * receiptEmail.cjs - RECEIPT-EMAIL-1 (owner go-ahead 12 Nov 2026): ONE "Your LazyTopper <item> is ready" email per paid
 * order, sent AFTER the grant succeeded, to every address we hold for that purchase (the buyer's checkout email, and the
 * recipient account's email when it differs). No address -> no email.
 *
 * Built on the existing Resend rail (trialEndingEmail.sendViaResend, sender mail.lazytopper.com); there is no second mailer.
 *
 * ★ ON BY DEFAULT once RESEND_API_KEY is set and the sender is on the verified domain. Kill switch: RECEIPT_EMAIL_DISABLED.
 * ★ EXACTLY ONCE PER ORDER. A Firestore TRANSACTION claims `receiptEmailSentAt` / `receiptEmailStatus` on the order's own
 *   `payOrders/{orderId}` doc (no new collection). Replays, duplicate webhooks and verify+claim races find the marker and
 *   send nothing. Only a claim that certainly did not go out (every address failed with a retryable error) is released
 *   (`receiptEmailStatus: 'failed'`) and may be taken again. Resend's Idempotency-Key is the second fence.
 * ★ TRANSACTIONAL, NOT A NUDGE. It never reads or writes the one-email-a-day ledgers (nudgeEmails / trialEmails /
 *   guestNudgeEmails `lastClaimMs`) nor the nudge / trial / invoice daily counters: a receipt is sent even if another email
 *   went out that day, and it does not use up that day's nudge slot. The IST daytime window does not apply either.
 * ★ NEVER blocks the grant: callers fire it AFTER the grant committed and do not await it; it never throws.
 * ★ PRIVACY. The body names sign-in identifiers MASKED only (phone `98•••••210`, email `ch•••@gmail.com`); the full address
 *   is only the To header. Nothing logged or counted carries an address or phone.
 */

const { sendViaResend, isOnFlag, escapeHtml } = require('./trialEndingEmail.cjs');
const { senderOnVerifiedDomain } = require('./nudgeEmail.cjs');
const { itemLabel, isPlaceholderAddress, formatInr, formatIstDay, SUPPORT_WHATSAPP_DISPLAY, SUPPORT_WHATSAPP_URL } = require('./paymentReceiptEmail.cjs');
const { normaliseIndianMobile, normaliseEmail } = require('./guestPay.cjs');

const PAY_ORDERS_COLLECTION = 'payOrders';
const DEFAULT_FROM = 'LazyTopper <hello@mail.lazytopper.com>';
const DEFAULT_REPLY_TO = 'support@lazytopper.com';
/** An order that was really paid AND granted: signed-in / parent `paid`, pay-first `claimed` (after the attach/claim grant). */
const GRANTED_STATES = Object.freeze(['paid', 'claimed']);
const EMAIL_PATTERN = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,}$/;
const MAX_ADDRESSES = 3;
const ORDER_ID_PATTERN = /^[A-Za-z0-9_]{1,64}$/;

function resolveReceiptConfig(env = process.env) {
  const e = env || {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const disabled = isOnFlag(e.RECEIPT_EMAIL_DISABLED);
  const apiKey = str(e.RESEND_API_KEY);
  const from = str(e.RECEIPT_EMAIL_FROM) || str(e.PAYMENT_EMAIL_FROM) || DEFAULT_FROM;
  const replyTo = str(e.RECEIPT_EMAIL_REPLY_TO) || str(e.PAYMENT_EMAIL_REPLY_TO) || DEFAULT_REPLY_TO;
  const active = !disabled && !!apiKey && senderOnVerifiedDomain(from);
  return { disabled, active, mode: active ? 'send' : 'off', apiKey, from, replyTo };
}

/** "98•••••210" - the first two and last three digits of a 10-digit Indian mobile (accepts E.164 / 10 digits). */
function maskPhone(raw) {
  const n = normaliseIndianMobile(typeof raw === 'string' ? raw : '');
  if (!n) return '';
  const d = n.slice(3);
  return `${d.slice(0, 2)}•••••${d.slice(7)}`;
}
/** "ch•••@gmail.com". */
function maskMail(raw) {
  const e = normaliseEmail(typeof raw === 'string' ? raw : '');
  const at = e ? e.indexOf('@') : -1;
  if (at < 1) return '';
  return `${e.slice(0, Math.min(2, at))}•••${e.slice(at)}`;
}

function isDeliverable(to) {
  return typeof to === 'string' && to.length <= 254 && EMAIL_PATTERN.test(to) && !isPlaceholderAddress(to);
}

/** The short id shown to the buyer: the last 8 characters of the order id, upper case. */
function shortOrderId(orderId) {
  const s = String(orderId || '').replace(/^order_/i, '');
  return s.slice(-8).toUpperCase();
}

function msOf(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v instanceof Date) return v.getTime();
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  return null;
}

/**
 * PURE. The receipt for one granted order. `signIns` are the already-MASKED sign-in descriptions
 * (e.g. "phone 98•••••210", "Google ch•••@gmail.com"). Null when the order is not something we receipt (top-ups, unknown).
 */
function buildReadyEmail({ passType, packTarget, amountPaise, orderId, paidAtMs, signIns }) {
  const item = itemLabel(passType, packTarget);
  if (!item || !Number.isInteger(amountPaise) || amountPaise <= 0) return null;
  const isPack = typeof passType === 'string' && passType.startsWith('pack_');
  const total = formatInr(amountPaise / 100);
  const ids = Array.isArray(signIns) ? signIns.filter(Boolean) : [];
  const signInLine = ids.length ? `Sign in at lazytopper.com with ${ids.join(' / ')} to use it.` : 'Sign in at lazytopper.com to use it.';
  let usage;
  if (isPack) usage = 'Open the menu → My packs to download.';
  else if (passType === 'till_boards') usage = 'Everything is unlocked till the Feb 2027 boards.';
  else usage = 'Premium is unlocked on your account.';
  const orderLine = `Order ${shortOrderId(orderId)} · ${formatIstDay(paidAtMs)}.`;
  const helpText = `Need help? Reply to this email or WhatsApp ${SUPPORT_WHATSAPP_DISPLAY}.`;
  const subject = `Your LazyTopper ${item} is ready`;
  const text = [`Thank you! Your ${item} (${total} incl. GST) is ready.`, signInLine, usage, orderLine, helpText, 'LazyTopper'].join('\n\n');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#0b1b34;max-width:520px">
<p>Thank you! Your <strong>${escapeHtml(item)}</strong> (${escapeHtml(total)} incl. GST) is ready.</p>
<p>${escapeHtml(signInLine)}</p>
<p>${escapeHtml(usage)}</p>
<p>${escapeHtml(orderLine)}</p>
<p>Need help? Reply to this email or WhatsApp <a href="${SUPPORT_WHATSAPP_URL}">${escapeHtml(SUPPORT_WHATSAPP_DISPLAY)}</a>.</p>
<p>LazyTopper</p>
</div>`;
  return { subject, text, html };
}

/**
 * deps: { adminFirestore, telemetry, env, config, fetchImpl, now,
 *         getAuthUser(uid) -> { email, phoneNumber, providerIds[] } | null   (the recipient account's own record),
 *         fetchPayment(paymentId) -> Razorpay payment | null                  (only to read the checkout email when the caller has none) }
 */
function createReceiptEmailer(deps = {}) {
  const config = deps.config || resolveReceiptConfig(deps.env || process.env);
  const { adminFirestore, telemetry } = deps;
  const fetchImpl = deps.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const inFlight = new Set();

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter never fails a payment */
    }
  }

  /** The recipient account's record, or null. Never throws, never logged. */
  async function accountOf(uid) {
    if (typeof deps.getAuthUser !== 'function' || typeof uid !== 'string' || !uid || uid === 'erased') return null;
    try {
      return (await deps.getAuthUser(uid)) || null;
    } catch {
      return null;
    }
  }

  /** Every address held for the purchase (deduped, deliverable, at most MAX_ADDRESSES) and the masked sign-ins. */
  async function contactsFor(order, paymentId, buyerEmail) {
    const candidates = [];
    let checkout = typeof buyerEmail === 'string' ? buyerEmail.trim() : '';
    if (!checkout && typeof deps.fetchPayment === 'function' && !(typeof order.guestEmail === 'string' && order.guestEmail)) {
      try {
        const p = await deps.fetchPayment(paymentId);
        if (p && typeof p.email === 'string') checkout = p.email.trim();
      } catch {
        checkout = '';
      }
    }
    if (checkout) candidates.push(checkout);
    if (typeof order.guestEmail === 'string' && order.guestEmail) candidates.push(order.guestEmail.trim());
    const account = await accountOf(order.uid);
    if (account && typeof account.email === 'string' && account.email) candidates.push(account.email.trim());

    const seen = new Set();
    const to = [];
    for (const c of candidates) {
      const k = c.toLowerCase();
      if (seen.has(k) || !isDeliverable(c)) continue;
      seen.add(k);
      to.push(c);
      if (to.length >= MAX_ADDRESSES) break;
    }

    // The sign-ins the purchase is on: the recipient ACCOUNT's own phone / email; else what the order recorded.
    const signIns = [];
    const phone = maskPhone(account && account.phoneNumber) || (account ? '' : maskPhone(order.guestPhone));
    if (phone) signIns.push(`phone ${phone}`);
    const accountMail = account && typeof account.email === 'string' ? account.email : !account && typeof order.guestEmail === 'string' ? order.guestEmail : '';
    const masked = maskMail(accountMail);
    if (masked) {
      const google = account && Array.isArray(account.providerIds) && account.providerIds.includes('google.com');
      signIns.push(google ? `Google ${masked}` : `email ${masked}`);
    }
    return { to, signIns };
  }

  /** Claim the order's receipt slot ONCE (transaction). Returns the order to email about, or null. */
  async function claim(orderId, paymentId) {
    const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
    return adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const order = snap && snap.exists ? snap.data() || {} : null;
      if (!order || !GRANTED_STATES.includes(order.status) || order.paymentId !== paymentId) return null;
      if (order.receiptEmailSentAt && order.receiptEmailStatus !== 'failed') return null;
      tx.set(ref, { receiptEmailSentAt: new Date(now()), receiptEmailStatus: 'sending' }, { merge: true });
      return order;
    });
  }

  async function run({ orderId, buyerEmail } = {}) {
    if (config.mode !== 'send' || !adminFirestore || typeof fetchImpl !== 'function') return { skipped: 'off' };
    if (typeof orderId !== 'string' || !ORDER_ID_PATTERN.test(orderId)) return { skipped: 'bad_input' };
    const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
    // Cheap pre-read: not granted yet / already receipted / not an item we receipt -> no Razorpay or Auth lookups.
    const pre = await ref.get();
    const first = pre && pre.exists ? pre.data() || {} : null;
    if (!first || !GRANTED_STATES.includes(first.status) || typeof first.paymentId !== 'string' || !first.paymentId) return { skipped: 'not_granted' };
    if (first.receiptEmailSentAt && first.receiptEmailStatus !== 'failed') return { skipped: 'already' };
    if (!itemLabel(first.passType, first.packTarget)) return { skipped: 'not_receipted' };
    const paymentId = first.paymentId;
    const { to, signIns } = await contactsFor(first, paymentId, buyerEmail);
    if (!to.length) {
      emit('receipt_email_no_address');
      return { skipped: 'no_address' };
    }
    const order = await claim(orderId, paymentId);
    if (!order) return { skipped: 'already' };
    const built = buildReadyEmail({
      passType: order.passType,
      packTarget: order.packTarget,
      amountPaise: order.amountPaise,
      orderId,
      paidAtMs: msOf(order.paidAt) || msOf(order.guestPaidAt) || now(),
      signIns,
    });
    const settle = async (status, extra) => {
      try {
        await ref.set({ receiptEmailStatus: status, ...(extra || {}) }, { merge: true });
      } catch {
        /* the claim stands: at most once */
      }
    };
    if (!built) {
      await settle('skipped');
      return { skipped: 'not_receipted' };
    }
    let okCount = 0;
    let retryable = true;
    let lastCode = null;
    let firstId = null;
    for (let i = 0; i < to.length; i += 1) {
      const sent = await sendViaResend({
        fetchImpl,
        apiKey: config.apiKey,
        from: config.from,
        replyTo: config.replyTo,
        to: to[i],
        subject: built.subject,
        text: built.text,
        html: built.html,
        idempotencyKey: `receipt-ready-${paymentId}-${i}`,
        category: 'receipt_ready',
      });
      if (sent.ok) {
        okCount += 1;
        if (!firstId && sent.id) firstId = sent.id;
        emit('receipt_email_sent');
      } else {
        lastCode = sent.code || 'unknown';
        if (!sent.retryable) retryable = false;
        emit('receipt_email_failed');
        emit(`receipt_email_failed.${String(lastCode).replace(/[^A-Za-z0-9_]/g, '_').slice(0, 24)}`);
      }
    }
    if (okCount > 0) {
      await settle('sent', { receiptEmailAt: new Date(now()), ...(firstId ? { receiptEmailId: firstId } : {}) });
      return { sent: okCount };
    }
    // Nothing went out: only a retryable failure releases the claim.
    await settle(retryable ? 'failed' : 'refused');
    return { sent: 0, code: lastCode };
  }

  /** Fire and forget. Never throws; never awaited on the payment path (`whenIdle` exists for tests). */
  function sendForOrder(input) {
    const p = run(input || {}).catch(() => {
      emit('receipt_email_failed.error');
      return { error: true };
    });
    inFlight.add(p);
    p.finally(() => inFlight.delete(p));
    return p;
  }

  async function whenIdle() {
    while (inFlight.size) await Promise.all([...inFlight]);
  }

  return { sendForOrder, whenIdle, config };
}

module.exports = {
  createReceiptEmailer,
  resolveReceiptConfig,
  buildReadyEmail,
  maskPhone,
  maskMail,
  shortOrderId,
  GRANTED_STATES,
};
