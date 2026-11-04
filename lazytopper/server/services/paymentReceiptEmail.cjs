'use strict';
/**
 * paymentReceiptEmail.cjs — PAY-PHONE-1 (A, owner 2 Nov 2026 13:08): ONE confirmation email after a server-verified
 * payment for a pack or a pass — guest (phone) and signed-in alike. Built on the trial email's Resend rail
 * (trialEndingEmail.sendViaResend); there is no second mailer.
 *
 * ★ OFF BY DEFAULT. Nothing is sent unless PAYMENT_EMAIL_ENABLED is on AND RESEND_API_KEY is set AND the sender is on the
 *   verified domain (mail.lazytopper.com). Otherwise every call is a silent skip.
 * ★ ONE EMAIL PER PAYMENT, across verify + webhook + status, restarts and instances. Before sending, a Firestore
 *   TRANSACTION claims `receiptEmail` on the order's own `payOrders/{orderId}` document (no new collection) — only for an
 *   order that is really paid (`paid`, `paid_unclaimed`, `claimed`) and only once; Resend's Idempotency-Key
 *   (`payment-receipt-<paymentId>`) is the second fence. A send that certainly did not go out (429 / 5xx / network)
 *   marks the claim `failed`, and only a `failed` claim may be taken again.
 * ★ THE ADDRESS IS THE ONE RAZORPAY RECORDED ON THE PAYMENT (the payment record verify / webhook already read). It is
 *   used for this one send and NEVER stored. No address -> silent skip.
 * ★ PRIVACY. Never the full phone (masked `+91 98•••••948`), never a token, never a uid. No tracking pixel, no link
 *   tracking. Plain, honest copy.
 */

const {
  sendViaResend,
  isOnFlag,
  normaliseAppUrl,
  escapeHtml,
} = require('./trialEndingEmail.cjs');
const { senderOnVerifiedDomain } = require('./nudgeEmail.cjs');
const { isPackProduct, validateTarget } = require('./packProducts.cjs');
const { maskIndianMobile, maskEmail, GUEST_PAYER } = require('./guestPay.cjs');

const PAY_ORDERS_COLLECTION = 'payOrders';
const DEFAULT_FROM = 'LazyTopper <hello@mail.lazytopper.com>';
const DEFAULT_REPLY_TO = 'support@lazytopper.com';
const SUPPORT_EMAIL = 'support@lazytopper.com';
/** The ONE support WhatsApp number (mirror of src/config/socialProfiles.ts WHATSAPP_URL / WHATSAPP_DISPLAY_NUMBER). */
const SUPPORT_WHATSAPP_URL = 'https://wa.me/919714568948';
const SUPPORT_WHATSAPP_DISPLAY = '+91 97145 68948';
const PAID_STATES = Object.freeze(['paid', 'paid_unclaimed', 'claimed']);
const EMAIL_PATTERN = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,}$/;

function resolveReceiptEmailConfig(env = process.env) {
  const e = env || {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const enabled = isOnFlag(e.PAYMENT_EMAIL_ENABLED);
  const apiKey = str(e.RESEND_API_KEY);
  const from = str(e.PAYMENT_EMAIL_FROM) || DEFAULT_FROM;
  const replyTo = str(e.PAYMENT_EMAIL_REPLY_TO) || DEFAULT_REPLY_TO;
  const ready = enabled && !!apiKey && senderOnVerifiedDomain(from);
  return { enabled, mode: ready ? 'send' : 'off', apiKey, from, replyTo, appUrl: normaliseAppUrl(e.PAYMENT_EMAIL_APP_URL || e.TRIAL_EMAIL_APP_URL) };
}

const SMALL_WORDS = new Set(['and', 'of', 'its', 'to', 'do']);
/** "human-eye-and-colourful-world" -> "Human Eye and Colourful World". */
function chapterTitle(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}
const subjectTitle = (t) => (t === 'science' ? 'Science' : 'Maths');

/** The item as the student knows it (the pack names on /packs). Top-ups and unknown keys -> null (no receipt). */
function itemLabel(passType, packTarget) {
  if (passType === 'till_boards') return 'Board Pass (Premium till your boards)';
  if (passType === 'month') return 'Premium month pass';
  if (!isPackProduct(passType)) return null;
  const t = validateTarget(passType, packTarget);
  switch (passType) {
    case 'pack_chapter':
      return `Chapter Pack · ${chapterTitle(t)}`;
    case 'pack_mock':
      return `${subjectTitle(t)} Mock Pack`;
    case 'pack_subject':
      return `${subjectTitle(t)} Subject Pack`;
    case 'pack_cbq':
      return `${subjectTitle(t)} CBQ Pack`;
    case 'pack_bundle':
      return 'Maths + Science Bundle';
    default:
      return null;
  }
}

function formatInr(inr) {
  return `₹${Number(inr).toLocaleString('en-IN')}`;
}
function formatIstDay(ms) {
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/**
 * PURE. The email for one paid order. `guestPhoneMasked` set -> the "sign in with your phone" instructions; else the
 * direct link. Returns null when the order is not something we send a receipt for.
 */
function buildReceiptEmail({ passType, packTarget, amountPaise, paymentId, paidAtMs, guestPhoneMasked, appUrl, payer, recipient }) {
  const item = itemLabel(passType, packTarget);
  if (!item || !Number.isInteger(amountPaise) || amountPaise <= 0 || typeof paymentId !== 'string' || !paymentId) return null;
  const isPack = isPackProduct(passType);
  const amount = formatInr(amountPaise / 100);
  const date = formatIstDay(paidAtMs);
  const where = isPack ? '/packs#my-packs' : '/';
  const subject = `Payment received: ${item} (${amount})`;

  let howText;
  let howHtml;
  if (recipient && (recipient.phoneMasked || recipient.emailMasked)) {
    // CHECKOUT-WHO-1: bought for a recipient (maybe someone else). Name ONLY the masked identifiers the payer typed.
    const ids = [recipient.phoneMasked, recipient.emailMasked].filter(Boolean);
    const lands = isPack ? 'the pack is in My packs' : 'the Board Pass is already there';
    howText = `Sign in at lazytopper.com/login with ${ids.join(' or ')}, and ${lands}.\nUse exactly what was entered at checkout. Anything else will not find this purchase.`;
    howHtml = `<p>Sign in at lazytopper.com/login with <strong>${ids.map(escapeHtml).join('</strong> or <strong>')}</strong>, and ${lands}.</p>
<p>Use exactly what was entered at checkout. Anything else will not find this purchase.</p>`;
  } else if (guestPhoneMasked) {
    const loginUrl = `${appUrl}/login?method=phone&redirect=${encodeURIComponent(where)}`;
    const lands = isPack ? 'your pack is in My packs' : 'your Premium is switched on';
    howText = `Sign in at lazytopper.com/login with your phone number ${guestPhoneMasked}, and ${lands}.\nSign in: ${loginUrl}\nUse the same number you paid with. A different number will not find this purchase.`;
    howHtml = `<p>Sign in at lazytopper.com/login with your phone number <strong>${escapeHtml(guestPhoneMasked)}</strong>, and ${lands}.</p>
<p><a href="${escapeHtml(loginUrl)}">Sign in with your phone number</a></p>
<p>Use the same number you paid with. A different number will not find this purchase.</p>`;
  } else {
    const url = `${appUrl}${where}`;
    // Review fix 7: a parent paid through the child's link - the pass is on the STUDENT's account, not the payer's.
    const lands = isPack
      ? 'It is in My packs on your account'
      : payer === 'parent'
        ? "Premium is now active on the student's account"
        : 'Premium is switched on for your account';
    howText = `${lands}.\nOpen it: ${url}`;
    howHtml = `<p>${lands}.</p>\n<p><a href="${escapeHtml(url)}">${isPack ? 'Open My packs' : 'Open LazyTopper'}</a></p>`;
  }

  const supportText = `Need help? Reply to this email, write to ${SUPPORT_EMAIL}, or message us on WhatsApp: ${SUPPORT_WHATSAPP_DISPLAY} (${SUPPORT_WHATSAPP_URL}).`;
  const text = [
    'Thank you. We have received your payment.',
    `Item: ${item}\nAmount: ${amount}\nRazorpay payment ID: ${paymentId}\nDate: ${date}`,
    `How to get it\n${howText}`,
    supportText,
    'LazyTopper',
  ].join('\n\n');
  const html = `<p>Thank you. We have received your payment.</p>
<p>Item: ${escapeHtml(item)}<br>Amount: ${escapeHtml(amount)}<br>Razorpay payment ID: ${escapeHtml(paymentId)}<br>Date: ${escapeHtml(date)}</p>
<p><strong>How to get it</strong></p>
${howHtml}
<p>Need help? Reply to this email, write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>, or message us on WhatsApp: <a href="${SUPPORT_WHATSAPP_URL}">${SUPPORT_WHATSAPP_DISPLAY}</a>.</p>
<p>LazyTopper</p>`;
  return { subject, text, html };
}

/**
 * CHECKOUT-WHO-1 - PURE. "Your Board Pass is ready" / "Your <pack> is ready" for the RECIPIENT's email address (the payer
 * typed it at checkout). The sign-in instruction only: no price, no payer details, the phone masked.
 */
function buildRecipientReadyEmail({ passType, packTarget, phoneMasked, emailMasked, appUrl }) {
  const item = itemLabel(passType, packTarget);
  if (!item || passType === 'month') return null;
  const isPack = isPackProduct(passType);
  const name = isPack ? item : 'Board Pass';
  const subject = `Your ${name} is ready`;
  const where = isPack ? '/packs#my-packs' : '/';
  const loginUrl = `${appUrl}/login?redirect=${encodeURIComponent(where)}`;
  const ids = [emailMasked ? 'this email address' : '', phoneMasked || ''].filter(Boolean).join(' or ');
  const lands = isPack ? 'and open My packs to download it' : 'and the Board Pass is already there';
  const text = [
    `Your ${name} on LazyTopper is paid for.`,
    `Sign in at lazytopper.com/login with ${ids}, ${lands}.\nSign in: ${loginUrl}`,
    'If you sign in with Google, use the Google account for this email address.',
    `Need help? Reply to this email or write to ${SUPPORT_EMAIL}.`,
    'LazyTopper',
  ].join('\n\n');
  const html = `<p>Your ${escapeHtml(name)} on LazyTopper is paid for.</p>
<p>Sign in at lazytopper.com/login with ${escapeHtml(ids)}, ${lands}.</p>
<p><a href="${escapeHtml(loginUrl)}">Sign in to LazyTopper</a></p>
<p>If you sign in with Google, use the Google account for this email address.</p>
<p>Need help? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
<p>LazyTopper</p>`;
  return { subject, text, html };
}

/**
 * PAY-ACCOUNT-1 - PURE. The recipient email when the purchase sits on an account that signs in with THIS email (made at
 * payment): "Your LazyTopper account is ready", the product, and ONE "Open LazyTopper" button that is a one-tap
 * passwordless sign-in link for this address (firebase-admin generateSignInWithEmailLink; Firebase sets its expiry), plus
 * "or sign in any time with this email". No price, no payer details, the phone masked. The link is never logged or stored.
 */
function buildAccountReadyEmail({ passType, packTarget, signInLink, newAccount, appUrl }) {
  const item = itemLabel(passType, packTarget);
  if (!item || passType === 'month' || typeof signInLink !== 'string' || !/^https:\/\//.test(signInLink)) return null;
  const isPack = isPackProduct(passType);
  const name = isPack ? item : 'Board Pass';
  const subject = newAccount ? 'Your LazyTopper account is ready' : `Your ${name} is ready`;
  const lands = isPack ? 'It is in My packs, ready to download.' : 'The Board Pass is already on it.';
  const loginUrl = `${appUrl}/login`;
  const text = [
    newAccount ? `Your LazyTopper account is ready, with ${name}.` : `Your ${name} on LazyTopper is ready.`,
    lands,
    `Open LazyTopper (signs you in, no password): ${signInLink}`,
    `This button works for a limited time. Or sign in any time at ${loginUrl} with this email address.`,
    `Need help? Reply to this email or write to ${SUPPORT_EMAIL}.`,
    'LazyTopper',
  ].join('\n\n');
  const html = `<p>${newAccount ? `Your LazyTopper account is ready, with <strong>${escapeHtml(name)}</strong>.` : `Your <strong>${escapeHtml(name)}</strong> on LazyTopper is ready.`}</p>
<p>${lands}</p>
<p><a href="${escapeHtml(signInLink)}">Open LazyTopper</a></p>
<p>This button signs you in without a password and works for a limited time. Or sign in any time at <a href="${escapeHtml(loginUrl)}">lazytopper.com/login</a> with this email address.</p>
<p>Need help? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
<p>LazyTopper</p>`;
  return { subject, text, html };
}

function createPaymentReceiptEmailer(deps = {}) {
  const config = deps.config || resolveReceiptEmailConfig(deps.env || process.env);
  const { adminFirestore, telemetry } = deps;
  const fetchImpl = deps.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const inFlight = new Set();

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* never fails a payment */
    }
  }

  /** Claim the order's receipt slot. Returns the order to email about, or null (not paid, already sent / sending). */
  async function claim(orderId, paymentId) {
    const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
    return adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const order = snap && snap.exists ? snap.data() || {} : null;
      if (!order || !PAID_STATES.includes(order.status) || order.paymentId !== paymentId) return null;
      const prior = order.receiptEmail && typeof order.receiptEmail === 'object' ? order.receiptEmail : null;
      if (prior && prior.status !== 'failed') return null;
      tx.set(ref, { receiptEmail: { status: 'sending', at: new Date(now()) } }, { merge: true });
      return order;
    });
  }

  async function settle(orderId, status) {
    try {
      await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId).set({ receiptEmail: { status, at: new Date(now()) } }, { merge: true });
    } catch {
      /* the claim stands: at most once */
    }
  }

  async function run({ orderId, paymentId, email }) {
    if (config.mode !== 'send' || !adminFirestore || typeof fetchImpl !== 'function') return { skipped: 'off' };
    const to = typeof email === 'string' ? email.trim() : '';
    if (!to || to.length > 254 || !EMAIL_PATTERN.test(to)) {
      emit('payments.receipt_email.no_address');
      return { skipped: 'no_address' };
    }
    if (typeof orderId !== 'string' || !orderId || typeof paymentId !== 'string' || !paymentId) return { skipped: 'bad_input' };
    const order = await claim(orderId, paymentId);
    if (!order) return { skipped: 'already_or_unpaid' };
    const guest = order.payer === GUEST_PAYER;
    const who = guest && order.checkoutWho === true;
    const built = buildReceiptEmail({
      passType: order.passType,
      packTarget: order.packTarget,
      amountPaise: order.amountPaise,
      paymentId,
      paidAtMs: now(),
      guestPhoneMasked: guest ? maskIndianMobile(order.guestPhone) || null : null,
      appUrl: config.appUrl,
      payer: typeof order.payer === 'string' ? order.payer : null,
      // CHECKOUT-WHO-1: a recipient order names the masked phone and/or email to sign in with.
      ...(who ? { recipient: { phoneMasked: maskIndianMobile(order.guestPhone) || null, emailMasked: maskEmail(order.guestEmail) || null } } : {}),
    });
    if (!built) {
      await settle(orderId, 'skipped');
      return { skipped: 'not_receipted' };
    }
    const sent = await sendViaResend({
      fetchImpl,
      apiKey: config.apiKey,
      from: config.from,
      replyTo: config.replyTo,
      to,
      subject: built.subject,
      text: built.text,
      html: built.html,
      idempotencyKey: `payment-receipt-${paymentId}`,
      category: 'payment_receipt',
    });
    if (sent.ok) {
      await settle(orderId, 'sent');
      emit('payments.receipt_email.sent');
      return { sent: true };
    }
    await settle(orderId, sent.retryable ? 'failed' : 'refused');
    emit('payments.receipt_email.failed');
    return { sent: false, code: sent.code };
  }

  /** Never throws. Callers do NOT await it on the payment path (fire and forget); `whenIdle` exists for tests. */
  function sendForPayment(input) {
    const p = run(input || {}).catch((e) => {
      emit('payments.receipt_email.error');
      console.error('[payment-receipt] send failed:', e && e.message);
      return { error: true };
    });
    inFlight.add(p);
    p.finally(() => inFlight.delete(p));
    return p;
  }

  /**
   * CHECKOUT-WHO-1 - "Your Board Pass is ready" to the recipient email typed at checkout. Same switch, same rail, same
   * at-most-once fence (its own `recipientEmail` slot on the order, Resend idempotency key `recipient-ready-<paymentId>`).
   * The address is read from the order (it is the claim key) and goes nowhere else. Never throws.
   */
  async function runRecipient({ orderId, paymentId }) {
    if (config.mode !== 'send' || !adminFirestore || typeof fetchImpl !== 'function') return { skipped: 'off' };
    if (typeof orderId !== 'string' || !orderId || typeof paymentId !== 'string' || !paymentId) return { skipped: 'bad_input' };
    const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
    const order = await adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const o = snap && snap.exists ? snap.data() || {} : null;
      if (!o || o.checkoutWho !== true || typeof o.guestEmail !== 'string' || !o.guestEmail) return null;
      if (!PAID_STATES.includes(o.status) || o.paymentId !== paymentId) return null;
      const prior = o.recipientEmail && typeof o.recipientEmail === 'object' ? o.recipientEmail : null;
      if (prior && prior.status !== 'failed') return null;
      tx.set(ref, { recipientEmail: { status: 'sending', at: new Date(now()) } }, { merge: true });
      return o;
    });
    if (!order) return { skipped: 'already_or_none' };
    const mark = async (status) => {
      try {
        await ref.set({ recipientEmail: { status, at: new Date(now()) } }, { merge: true });
      } catch {
        /* at most once */
      }
    };
    const to = order.guestEmail;
    if (to.length > 254 || !EMAIL_PATTERN.test(to)) {
      await mark('skipped');
      return { skipped: 'no_address' };
    }
    // PAY-ACCOUNT-1: the purchase is on an account that signs in with THIS email -> a one-tap sign-in link. A link that
    // cannot be made falls back to the plain "is ready" email below.
    let accountReady = null;
    if (order.accountHasEmail === true && typeof deps.emailSignInLink === 'function') {
      try {
        // Back to /login's finish step (markers only, never the address), then the safe landing: My packs / Home.
        const where = isPackProduct(order.passType) ? '/packs#my-packs' : '/';
        const link = await deps.emailSignInLink(to, `${config.appUrl}/login?finish=link&redirect=${encodeURIComponent(where)}`);
        accountReady = buildAccountReadyEmail({
          passType: order.passType,
          packTarget: order.packTarget,
          signInLink: link,
          newAccount: order.claimedVia === 'account_created',
          appUrl: config.appUrl,
        });
      } catch (e) {
        emit('payments.recipient_email.link_failed');
        console.error('[payment-recipient] sign-in link failed:', e && e.code);
      }
    }
    const built = accountReady || buildRecipientReadyEmail({
      passType: order.passType,
      packTarget: order.packTarget,
      phoneMasked: maskIndianMobile(order.guestPhone) || null,
      emailMasked: maskEmail(order.guestEmail) || null,
      appUrl: config.appUrl,
    });
    if (!built) {
      await mark('skipped');
      return { skipped: 'not_receipted' };
    }
    const sent = await sendViaResend({
      fetchImpl,
      apiKey: config.apiKey,
      from: config.from,
      replyTo: config.replyTo,
      to,
      subject: built.subject,
      text: built.text,
      html: built.html,
      idempotencyKey: `recipient-ready-${paymentId}`,
      category: 'payment_recipient',
    });
    if (sent.ok) {
      await mark('sent');
      emit('payments.recipient_email.sent');
      return { sent: true };
    }
    await mark(sent.retryable ? 'failed' : 'refused');
    emit('payments.recipient_email.failed');
    return { sent: false, code: sent.code };
  }

  function sendRecipientReady(input) {
    const p = runRecipient(input || {}).catch((e) => {
      emit('payments.recipient_email.error');
      console.error('[payment-recipient] send failed:', e && e.message);
      return { error: true };
    });
    inFlight.add(p);
    p.finally(() => inFlight.delete(p));
    return p;
  }

  async function whenIdle() {
    while (inFlight.size) await Promise.all([...inFlight]);
  }

  return { sendForPayment, sendRecipientReady, whenIdle, config };
}

module.exports = {
  buildAccountReadyEmail,
  createPaymentReceiptEmailer,
  resolveReceiptEmailConfig,
  buildReceiptEmail,
  buildRecipientReadyEmail,
  itemLabel,
  chapterTitle,
  SUPPORT_WHATSAPP_URL,
  SUPPORT_WHATSAPP_DISPLAY,
};
