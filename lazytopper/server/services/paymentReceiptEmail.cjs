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
const { randomBytes } = require('node:crypto');
const { senderOnVerifiedDomain } = require('./nudgeEmail.cjs');
const { isPackProduct, validateTarget } = require('./packProducts.cjs');
const { maskIndianMobile, maskEmail, GUEST_PAYER, normaliseIndianMobile, normaliseEmail } = require('./guestPay.cjs');
const { GST_RATE_PERCENT } = require('./passPricing.cjs');
// GST-INVOICE-1: the tax invoice link (a signed link for a purchase made without this account's sign-in).
const { invoiceToken, invoiceLinkSecret, invoiceOwnedBy } = require('./gstInvoice.cjs');
// GST-INVOICE-2a: the invoice email ("Issue now") keeps the batch-email rules: the IST send window and one email a day.
const { resolveSendWindow } = require('./emailSendWindow.cjs');
const { emailKey } = require('./emailSuppression.cjs');

const PAY_ORDERS_COLLECTION = 'payOrders';
/** SELF-PAY-LAND-1: the pack sign-in landing, marked so a just-paid buyer is not met by the trial-ended screen. */
const PAID_PACKS_LANDING = '/packs?from=pay#my-packs';
const DEFAULT_FROM = 'LazyTopper <hello@mail.lazytopper.com>';
const DEFAULT_REPLY_TO = 'support@lazytopper.com';
const SUPPORT_EMAIL = 'support@lazytopper.com';
/** The ONE support WhatsApp number (mirror of src/config/socialProfiles.ts WHATSAPP_URL / WHATSAPP_DISPLAY_NUMBER). */
const SUPPORT_WHATSAPP_URL = 'https://wa.me/919714568948';
const SUPPORT_WHATSAPP_DISPLAY = '+91 97145 68948';
/** SELFPAY-ATTACH-1: how long a signed-out payer may choose who an attach order is for (mirror of routes/guestPay.cjs). */
const ATTACH_HOLD_MS = 10 * 60 * 1000;
/** A receipt marker in one of these states may be taken again (a failed send; or nothing was sendable yet: no address). */
const RETRYABLE_RECEIPT = Object.freeze(['failed', 'no_address']);
/** The hourly sweep only looks at attach orders paid this recently (an older one is never mass-mailed days later). */
const HELD_RECEIPT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PAID_STATES = Object.freeze(['paid', 'paid_unclaimed', 'claimed']);
const EMAIL_PATTERN = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,}$/;
/**
 * GST-FU-1 F5 - Razorpay fills a PLACEHOLDER (`void@razorpay.com`) when a buyer gives no email at checkout. Any address at
 * the razorpay.com domain (or a subdomain of it) is never the buyer's: an email to it is lost, so it counts as no address.
 */
function isPlaceholderAddress(to) {
  if (typeof to !== 'string') return false;
  const at = to.trim().lastIndexOf('@');
  if (at < 0) return false;
  const domain = to.trim().slice(at + 1).toLowerCase().replace(/\.$/, '');
  return domain === 'razorpay.com' || domain.endsWith('.razorpay.com');
}
/** GST-INVOICE-2a - the ledgers of the one-email-a-day rule (read, and `lastClaimMs` written, by every student emailer). */
const NUDGE_EMAILS_COLLECTION = 'nudgeEmails';
const TRIAL_EMAILS_COLLECTION = 'trialEmails';
const GUEST_NUDGE_EMAILS_COLLECTION = 'guestNudgeEmails';
const ONE_A_DAY_MS = 24 * 60 * 60 * 1000;
const INVOICE_EMAIL_BATCH = 25;
const INVOICE_EMAIL_INTERVAL_MS = 60 * 60 * 1000;
/** Review F2: a `sending` claim older than this was lost in a crash; it is taken again (Resend's key dedupes a real send). */
const INVOICE_EMAIL_STALE_SENDING_MS = 30 * 60 * 1000;
const RECEIPT_RECLAIM_MAX_MS = 20 * 60 * 60 * 1000;
/** Review F3: at most this many send attempts; after that the email is `failed` and shown to the admin. */
const INVOICE_EMAIL_MAX_ATTEMPTS = 3;
/**
 * GST-INVOICE-BACKDATE-1 - the DURABLE daily cap shared by every later invoice email (the invoice email, the state form
 * and its reminder): one doc per IST day holding only `count` (a counter, no student data; NON_STUDENT_COLLECTIONS).
 * Default 30/day, env GST_INVOICE_EMAIL_DAILY_CAP (1-1000): Resend's free plan is shared with the trial and nudge mail.
 */
const GST_INVOICE_EMAIL_DAILY_COLLECTION = 'gstInvoiceEmailDaily';
const DEFAULT_INVOICE_EMAIL_DAILY_CAP = 30;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
/** "2026-11-08" - the IST day of an instant (the daily cap's key). */
function istDayKey(ms) {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}
function invoiceEmailDailyCap(env) {
  const n = Number(env && env.GST_INVOICE_EMAIL_DAILY_CAP);
  return Number.isFinite(n) && n >= 1 ? Math.min(1000, Math.floor(n)) : DEFAULT_INVOICE_EMAIL_DAILY_CAP;
}

function resolveReceiptEmailConfig(env = process.env) {
  const e = env || {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const enabled = isOnFlag(e.PAYMENT_EMAIL_ENABLED);
  const apiKey = str(e.RESEND_API_KEY);
  const from = str(e.PAYMENT_EMAIL_FROM) || DEFAULT_FROM;
  const replyTo = str(e.PAYMENT_EMAIL_REPLY_TO) || DEFAULT_REPLY_TO;
  const ready = enabled && !!apiKey && senderOnVerifiedDomain(from);
  return {
    enabled,
    // RECEIPT-EMAIL-1 kill switch: stops the receipt / recipient emails only (invoice emails keep their own switches).
    receiptDisabled: isOnFlag(e.RECEIPT_EMAIL_DISABLED),
    mode: ready ? 'send' : 'off',
    apiKey,
    from,
    replyTo,
    appUrl: normaliseAppUrl(e.PAYMENT_EMAIL_APP_URL || e.TRIAL_EMAIL_APP_URL),
    // GST-INVOICE-1 (review D5): the DEDICATED secret the signed invoice link uses. Missing -> no link. Never sent.
    invoiceLinkSecret: invoiceLinkSecret(e),
  };
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

/**
 * RECEIPT-EMAIL-1 (F1) - the item as an EMAIL names it: "Board Pass", never "Premium" (owner ruling). `itemLabel` itself is
 * shared with the tax invoice / state form and stays as it was.
 */
function emailItemLabel(passType, packTarget) {
  const label = itemLabel(passType, packTarget);
  if (!label) return null;
  if (passType === 'till_boards') return 'Board Pass';
  if (passType === 'month') return 'Month pass';
  return label;
}
const passNameOf = (passType) => (passType === 'month' ? 'Month pass' : 'Board Pass');

/** "98•••••210" - the first two and last three digits of an Indian mobile, or ''. */
function maskPhoneDigits(raw) {
  const n = normaliseIndianMobile(typeof raw === 'string' ? raw : '');
  return n ? `${n.slice(3, 5)}•••••${n.slice(10)}` : '';
}
/** "ch•••@gmail.com", or ''. */
function maskMailShort(raw) {
  const e = normaliseEmail(typeof raw === 'string' ? raw : '');
  const at = e ? e.indexOf('@') : -1;
  return at < 1 ? '' : `${e.slice(0, Math.min(2, at))}•••${e.slice(at)}`;
}

/**
 * GST-EXCL-1 - the receipt's GST line from the order's STORED breakup: "₹1,917 + ₹345 GST (18%) = ₹2,262 paid", or with a pack
 * credit "... = ₹2,262, less pack credit ₹199: ₹2,063 paid". Null when the order carries no breakup or it does not add up.
 */
function receiptGstLine(gst, amountPaise) {
  if (!gst || !Number.isInteger(gst.baseInr) || !Number.isInteger(gst.gstInr) || !(gst.gstInr > 0)) return null;
  const total = gst.baseInr + gst.gstInr;
  const paid = amountPaise / 100;
  const credit = Number.isInteger(gst.packCreditInr) && gst.packCreditInr > 0 ? gst.packCreditInr : 0;
  if (total - credit !== paid) return null;
  const head = `${formatInr(gst.baseInr)} + ${formatInr(gst.gstInr)} GST (${GST_RATE_PERCENT}%) = ${formatInr(total)}`;
  return credit > 0 ? `${head}, less pack credit ${formatInr(credit)}: ${formatInr(paid)} paid` : `${head} paid`;
}

/** The account that PAID (its one-a-day clock counts a later email), or null for a payer with no account. */
function payerAccountUid(order) {
  if (typeof order.payerUid === 'string' && order.payerUid) return order.payerUid;
  if (typeof order.uid === 'string' && order.uid && order.uid !== 'erased' && invoiceOwnedBy(order, order.uid)) return order.uid;
  return null;
}

function msOf(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v instanceof Date) return v.getTime();
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  return null;
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
function buildReceiptEmail({ passType, packTarget, amountPaise, paymentId, paidAtMs, guestPhoneMasked, appUrl, payer, recipient, gst, invoice, invoiceResend = false, signIns, moved = false, holdEndDefault }) {
  const item = emailItemLabel(passType, packTarget);
  if (!item || !Number.isInteger(amountPaise) || amountPaise <= 0 || typeof paymentId !== 'string' || !paymentId) return null;
  // GST-INVOICE-2a: the receipt RE-SENT with an invoice issued later ("Issue now") - only with a usable invoice link.
  if (invoiceResend && !(invoice && typeof invoice.number === 'string' && typeof invoice.url === 'string' && /^https:\/\//.test(invoice.url))) return null;
  const isPack = isPackProduct(passType);
  const amount = formatInr(amountPaise / 100);
  const date = formatIstDay(paidAtMs);
  // GST-EXCL-1: an order created at/after 7 Nov 2026 stored its breakup; the receipt shows it ("₹1,917 + ₹345 GST (18%) =
  // ₹2,262 paid"; a credited Board Pass adds "less pack credit"). An older order (all-in) gets no GST line: byte-identical.
  const gstLine = receiptGstLine(gst, amountPaise);
  const where = isPack ? '/packs#my-packs' : '/';
  const subject = invoiceResend ? `GST tax invoice ${invoice.number}: ${item} (${amount})` : `Payment received: ${item} (${amount})`;
  const opening = invoiceResend ? 'Your GST tax invoice for this purchase is ready. Your payment details are below.' : 'Thank you. We have received your payment.';

  let howText;
  let howHtml;
  if (recipient && (recipient.phoneMasked || recipient.emailMasked)) {
    // CHECKOUT-WHO-1: bought for a recipient (maybe someone else). Name ONLY the masked identifiers the payer typed.
    const ids = [recipient.phoneMasked, recipient.emailMasked].filter(Boolean);
    const lands = isPack ? 'the pack is in My packs' : 'the Board Pass is already there';
    howText = `Sign in at lazytopper.com/login with ${ids.join(' or ')}, and ${lands}.\nUse exactly what was entered at checkout. Anything else will not find this purchase.`;
    howHtml = `<p>Sign in at lazytopper.com/login with <strong>${ids.map(escapeHtml).join('</strong> or <strong>')}</strong>, and ${lands}.</p>
<p>Use exactly what was entered at checkout. Anything else will not find this purchase.</p>`;
  } else if (holdEndDefault && (holdEndDefault.phoneMasked || holdEndDefault.emailMasked)) {
    // RECEIPT-HOLD-END-1 (owner ruling 13 Nov 2026, #1683 R6): a signed-out "buy for yourself" payer who never chose who it is for
    // before the hold ended: assume the PAYER. Owner-approved sentence, the masked number (else the masked email) of the payer.
    const byPhone = Boolean(holdEndDefault.phoneMasked);
    const line = `Your ${item} is on the account for ${byPhone ? holdEndDefault.phoneMasked : holdEndDefault.emailMasked}. Sign in with that ${byPhone ? 'number' : 'email'} to open it.`;
    howText = line;
    howHtml = `<p>${escapeHtml(line)}</p>`;
  } else if (guestPhoneMasked) {
    const loginUrl = `${appUrl}/login?method=phone&redirect=${encodeURIComponent(isPack ? PAID_PACKS_LANDING : where)}`;
    const lands = isPack ? 'your pack is in My packs' : `your ${passNameOf(passType)} is switched on`;
    howText = `Sign in at lazytopper.com/login with your phone number ${guestPhoneMasked}, and ${lands}.\nSign in: ${loginUrl}\nUse the same number you paid with. A different number will not find this purchase.`;
    howHtml = `<p>Sign in at lazytopper.com/login with your phone number <strong>${escapeHtml(guestPhoneMasked)}</strong>, and ${lands}.</p>
<p><a href="${escapeHtml(loginUrl)}">Sign in with your phone number</a></p>
<p>Use the same number you paid with. A different number will not find this purchase.</p>`;
  } else {
    const url = `${appUrl}${where}`;
    // Review fix 7: a parent paid through the child's link - the pass is on the STUDENT's account, not the payer's.
    // SIGNED-IN-MOVE-1: the buyer moved it to the account of the person who will use it - never "your account" for the buyer.
    const lands = moved
      ? isPack
        ? 'It was moved to the account you chose, and is in My packs there'
        : `${passNameOf(passType)} was moved to the account you chose`
      : isPack
      ? 'It is in My packs on your account'
      : payer === 'parent'
        ? `${passNameOf(passType)} is now active on the student's account`
        : `${passNameOf(passType)} is switched on for your account`;
    howText = `${lands}.\nOpen it: ${url}`;
    howHtml = `<p>${lands}.</p>\n<p><a href="${escapeHtml(url)}">${isPack ? 'Open My packs' : 'Open LazyTopper'}</a></p>`;
  }

  // GST-INVOICE-1: { number, url } when a tax invoice was issued for this payment; nothing otherwise (byte-identical email).
  const inv = invoice && typeof invoice.number === 'string' && typeof invoice.url === 'string' && /^https:\/\//.test(invoice.url) ? invoice : null;
  const invoiceText = inv ? `\n\nGST tax invoice ${inv.number}: ${inv.url}` : '';
  const invoiceHtml = inv ? `\n<p>GST tax invoice ${escapeHtml(inv.number)}: <a href="${escapeHtml(inv.url)}">Download the invoice (PDF)</a></p>` : '';
  // RECEIPT-EMAIL-1: when the account the purchase is ON is known (granted / attached / fallback decided), name its MASKED sign-ins.
  const ids = Array.isArray(signIns) ? signIns.filter(Boolean) : null;
  let readyText = '';
  let readyHtml = '';
  if (ids) {
    const signInLine = ids.length ? `Sign in at lazytopper.com with ${ids.join(' / ')} to use it.` : 'Sign in at lazytopper.com to use it.';
    const usage = isPack ? 'Open the menu \u2192 My packs to download.' : passType === 'till_boards' ? 'Everything is unlocked till the Feb 2027 boards.' : `${passNameOf(passType)} is unlocked on your account.`;
    readyText = `\n\n${signInLine}\n${usage}`;
    readyHtml = `\n<p>${escapeHtml(signInLine)}</p>\n<p>${escapeHtml(usage)}</p>`;
  }
  const supportText = `Need help? Reply to this email, write to ${SUPPORT_EMAIL}, or message us on WhatsApp: ${SUPPORT_WHATSAPP_DISPLAY} (${SUPPORT_WHATSAPP_URL}).`;
  const text = [
    opening,
    `Item: ${item}\nAmount: ${amount}${gstLine ? `\nGST: ${gstLine}` : ''}\nRazorpay payment ID: ${paymentId}\nDate: ${date}${invoiceText}`,
    `How to get it\n${howText}${readyText}`,
    supportText,
    'LazyTopper',
  ].join('\n\n');
  const html = `<p>${opening}</p>
<p>Item: ${escapeHtml(item)}<br>Amount: ${escapeHtml(amount)}${gstLine ? `<br>GST: ${escapeHtml(gstLine)}` : ''}<br>Razorpay payment ID: ${escapeHtml(paymentId)}<br>Date: ${escapeHtml(date)}</p>${invoiceHtml}
<p><strong>How to get it</strong></p>
${howHtml}${readyHtml}
<p>Need help? Reply to this email, write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>, or message us on WhatsApp: <a href="${SUPPORT_WHATSAPP_URL}">${SUPPORT_WHATSAPP_DISPLAY}</a>.</p>
<p>LazyTopper</p>`;
  return { subject, text, html };
}

/**
 * CHECKOUT-WHO-1 - PURE. "Your Board Pass is ready" / "Your <pack> is ready" for the RECIPIENT's email address (the payer
 * typed it at checkout). The sign-in instruction only: no price, no payer details, the phone masked.
 */
function buildRecipientReadyEmail({ passType, packTarget, phoneMasked, emailMasked, appUrl }) {
  const item = emailItemLabel(passType, packTarget);
  if (!item || passType === 'month') return null;
  const isPack = isPackProduct(passType);
  const name = isPack ? item : 'Board Pass';
  const subject = `Your ${name} is ready`;
  const where = isPack ? '/packs#my-packs' : '/';
  const loginUrl = `${appUrl}/login?redirect=${encodeURIComponent(isPack ? PAID_PACKS_LANDING : where)}`;
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
  const item = emailItemLabel(passType, packTarget);
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

/**
 * PAY-ACCOUNT-1 review HIGH 1 - PURE. The email typed at checkout is NOT on the account (the account signs in with the
 * MOBILE NUMBER it was bought for): a plain notice with NO sign-in link of any kind (a link for an address that is not on
 * the account must never be sent) and no number in it.
 */
function buildPhoneAccountNoticeEmail({ passType, packTarget }) {
  const item = emailItemLabel(passType, packTarget);
  if (!item || passType === 'month') return null;
  const name = isPackProduct(passType) ? item : 'Board Pass';
  const line = `${name} was bought for you on LazyTopper \u2014 sign in with the mobile number it was bought for; it's already in your account.`;
  const subject = `${name} was bought for you on LazyTopper`;
  const text = [line, `Need help? Reply to this email or write to ${SUPPORT_EMAIL}.`, 'LazyTopper'].join('\n\n');
  const html = `<p>${escapeHtml(line)}</p>
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
  /** R4: a `sending` claim older than the stale window (the process died mid-send) may be taken again (Resend's idempotency key dedupes a real earlier send). */
  function receiptRetryable(prior) {
    if (!prior || typeof prior !== 'object') return true;
    if (RETRYABLE_RECEIPT.includes(prior.status)) return true;
    if (prior.status !== 'sending') return false;
    // M1: Resend idempotency keys last 24h, so only a claim aged 30 min .. 20 h is safe to retake; a missing / unparseable `at` is not.
    const at = msOf(prior.at);
    if (!Number.isFinite(at)) return false;
    const age = now() - at;
    return age >= INVOICE_EMAIL_STALE_SENDING_MS && age < RECEIPT_RECLAIM_MAX_MS;
  }

  async function claim(orderId, paymentId) {
    const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
    return adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const order = snap && snap.exists ? snap.data() || {} : null;
      if (!order || !PAID_STATES.includes(order.status) || order.paymentId !== paymentId) return null;
      const prior = order.receiptEmail && typeof order.receiptEmail === 'object' ? order.receiptEmail : null;
      if (prior && !receiptRetryable(prior)) return null;
      const token = randomBytes(12).toString('hex');
      tx.set(ref, { receiptEmail: { status: 'sending', at: new Date(now()), token } }, { merge: true });
      return { order, token };
    });
  }

  /**
   * GST-INVOICE-1 - the invoice link for the receipt: a buyer who paid signed in to their OWN account downloads it from
   * the account (My packs, behind their sign-in); a guest / parent / "who will use it" purchase gets a SIGNED link.
   */
  function invoiceLinkFor(order, orderId, paymentId) {
    const inv = order && order.gstInvoice;
    if (!inv || typeof inv.number !== 'string' || inv.paymentId !== paymentId) return null;
    // The account that paid can open it from My packs; anyone else (a parent, a signed-out payer) needs the signed link.
    const accountUid = typeof order.payerUid === 'string' && order.payerUid ? order.payerUid : order.uid;
    if (invoiceOwnedBy(order, accountUid) && (!order.payer || order.payerUid)) return { number: inv.number, url: `${config.appUrl}/packs#invoices` };
    const t = invoiceToken(orderId, config.invoiceLinkSecret);
    return t ? { number: inv.number, url: `${config.appUrl}/api/gst/invoice?t=${encodeURIComponent(t)}` } : null;
  }

  /** The receipt's inputs for a stored order (shared by the receipt and, GST-INVOICE-2a, the invoice email). */
  function receiptArgsFor(order, orderId, paymentId, paidAtMs) {
    const guest = order.payer === GUEST_PAYER;
    const who = guest && order.checkoutWho === true;
    return {
      passType: order.passType,
      packTarget: order.packTarget,
      amountPaise: order.amountPaise,
      paymentId,
      paidAtMs,
      guestPhoneMasked: guest ? maskIndianMobile(order.guestPhone) || null : null,
      appUrl: config.appUrl,
      payer: typeof order.payer === 'string' ? order.payer : null,
      gst: { baseInr: order.baseInr, gstInr: order.gstInr, packCreditInr: order.packCreditInr },
      invoice: invoiceLinkFor(order, orderId, paymentId),
      ...(order.movedToOtherAt ? { moved: true } : {}),
      // CHECKOUT-WHO-1: a recipient order names the masked phone and/or email to sign in with.
      ...(who ? { recipient: { phoneMasked: maskIndianMobile(order.guestPhone) || null, emailMasked: maskEmail(order.guestEmail) || null } } : {}),
    };
  }

  /** S2: only the claimer whose token is on the doc may settle it, so a stalled first sender cannot overwrite a later outcome. */
  async function settle(orderId, status, token) {
    try {
      const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
      await adminFirestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const order = snap && snap.exists ? snap.data() || {} : null;
        if (!order) return;
        const cur = order.receiptEmail && typeof order.receiptEmail === 'object' ? order.receiptEmail : null;
        // a pre-token `sending` claim (written before this deploy) has no token and may still settle
        if (cur && cur.token !== undefined && cur.token !== token) return;
        tx.set(ref, { receiptEmail: { status, at: new Date(now()), ...(token ? { token } : {}) } }, { merge: true });
      });
    } catch {
      /* the claim stands: at most once */
    }
  }

  /** R5: mark `no_address` only if no receipt outcome landed meanwhile (never over sent / sending / refused / skipped). */
  async function settleIfUnsent(orderId, status) {
    try {
      const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
      await adminFirestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const order = snap && snap.exists ? snap.data() || {} : null;
        if (!order) return;
        const cur = order.receiptEmail && typeof order.receiptEmail === 'object' ? order.receiptEmail.status : null;
        if (cur && cur !== 'failed' && cur !== 'no_address') return;
        tx.set(ref, { receiptEmail: { status, at: new Date(now()) } }, { merge: true });
      });
    } catch {
      /* best effort */
    }
  }

  /** SELFPAY-ATTACH-1 mirror: when an attach order's hold on the payer's choice ends (NaN: not an attach order / decided). */
  function attachHoldEndsMs(o) {
    if (!o || o.attachFlow !== true || o.attachedAt) return NaN;
    const stored = msOf(o.attachHoldUntil);
    if (Number.isFinite(stored)) return stored;
    const paid = msOf(o.guestPaidAt);
    return Number.isFinite(paid) ? paid + ATTACH_HOLD_MS : NaN;
  }

  /** The recipient ACCOUNT's own record (Firebase Auth), or null. Never throws; never logged. */
  async function accountOf(uid) {
    if (typeof deps.getAuthUser !== 'function' || typeof uid !== 'string' || !uid || uid === 'erased') return null;
    try {
      return (await deps.getAuthUser(uid)) || null;
    } catch {
      return null;
    }
  }

  /**
   * RECEIPT-EMAIL-1 - every address held for the purchase: the PAYER's checkout email (the one the caller has, else
   * Razorpay's payment record, so a "someone else" order still reaches its payer) and the recipient ACCOUNT's email when it
   * differs. The typed recipient address of a "Who will use it?" order is NOT here: its own "ready" email covers it, so
   * nobody gets two. Plus the masked sign-ins the purchase is on (only when the account is known).
   */
  async function contactsFor(order, paymentId, email) {
    let payer = typeof email === 'string' ? email.trim() : '';
    if (!payer && typeof deps.fetchPayment === 'function') {
      try {
        const p = await deps.fetchPayment(paymentId);
        if (p && typeof p.email === 'string') payer = p.email.trim();
      } catch {
        payer = '';
      }
    }
    const account = await accountOf(order.uid);
    const candidates = [payer];
    if (account && typeof account.email === 'string') candidates.push(account.email.trim());
    const recipientTyped = order.checkoutWho === true && typeof order.guestEmail === 'string' ? order.guestEmail.trim().toLowerCase() : '';
    const seen = new Set();
    const to = [];
    for (const c of candidates) {
      const k = c.toLowerCase();
      if (!c || seen.has(k) || k === recipientTyped || c.length > 254 || !EMAIL_PATTERN.test(c) || isPlaceholderAddress(c)) continue;
      seen.add(k);
      to.push(c);
      if (to.length >= 3) break;
    }
    let signIns = null;
    if (account) {
      signIns = [];
      const phone = maskPhoneDigits(account.phoneNumber);
      if (phone) signIns.push(`phone ${phone}`);
      const mail = maskMailShort(account.email);
      if (mail) signIns.push(Array.isArray(account.providerIds) && account.providerIds.includes('google.com') ? `Google ${mail}` : `email ${mail}`);
    }
    return { to, signIns };
  }

  async function run({ orderId, paymentId, email }) {
    if (config.receiptDisabled || config.mode !== 'send' || !adminFirestore || typeof fetchImpl !== 'function') return { skipped: 'off' };
    if (typeof orderId !== 'string' || !orderId || typeof paymentId !== 'string' || !paymentId) return { skipped: 'bad_input' };
    const first = await readOrder(orderId);
    if (!first || !PAID_STATES.includes(first.status) || first.paymentId !== paymentId) return { skipped: 'already_or_unpaid' };
    if (first.receiptEmail && !receiptRetryable(first.receiptEmail)) return { skipped: 'already_or_unpaid' };
    // The email names the account the purchase LANDS on, so an attach order waits for the payer's choice (or the 10-minute
    // fallback). It is never dropped: the attach / claim grant calls this again, a timer fires at the end of the hold, and the
    // hourly sweep picks up anything a restart lost.
    const holdEnds = attachHoldEndsMs(first);
    if (Number.isFinite(holdEnds) && now() < holdEnds) {
      scheduleHeld(orderId, paymentId, holdEnds);
      return { skipped: 'attach_hold' };
    }
    const { to: addresses, signIns } = await contactsFor(first, paymentId, email);
    if (!addresses.length) {
      emit('payments.receipt_email.no_address');
      return { skipped: 'no_address' };
    }
    const claimed = await claim(orderId, paymentId);
    if (!claimed) return { skipped: 'already_or_unpaid' };
    const { order, token } = claimed;
    // RECEIPT-HOLD-END-1: only an attach order whose hold ended with nobody choosing AND no account known yet (an account that is known
    // keeps the masked sign-ins path above). A "Who will use it?" recipient order is not a self-pay order and never takes this.
    const holdEndDefault =
      !signIns && order.payer === GUEST_PAYER && order.attachFlow === true && !order.attachedAt && order.checkoutWho !== true
        ? { phoneMasked: maskIndianMobile(order.guestPhone) || null, emailMasked: maskMailShort(order.guestEmail) || null }
        : null;
    const built = buildReceiptEmail({ ...receiptArgsFor(order, orderId, paymentId, now()), ...(signIns ? { signIns } : {}), ...(holdEndDefault ? { holdEndDefault } : {}) });
    if (!built) {
      await settle(orderId, 'skipped', token);
      return { skipped: 'not_receipted' };
    }
    let okCount = 0;
    let retryable = true;
    let lastCode = null;
    for (let i = 0; i < addresses.length; i += 1) {
      const sent = await sendViaResend({
        fetchImpl,
        apiKey: config.apiKey,
        from: config.from,
        replyTo: config.replyTo,
        to: addresses[i],
        subject: built.subject,
        text: built.text,
        html: built.html,
        idempotencyKey: i === 0 ? `payment-receipt-${paymentId}` : `payment-receipt-${paymentId}-${i}`,
        category: 'payment_receipt',
      });
      if (sent.ok) {
        okCount += 1;
        emit('payments.receipt_email.sent');
      } else {
        lastCode = sent.code;
        if (!sent.retryable) retryable = false;
        emit('payments.receipt_email.failed');
      }
    }
    if (okCount > 0) {
      await settle(orderId, 'sent', token);
      return { sent: true };
    }
    await settle(orderId, retryable ? 'failed' : 'refused', token);
    return { sent: false, code: lastCode };
  }

  async function readOrder(orderId) {
    const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId).get();
    return snap && snap.exists ? snap.data() || {} : null;
  }

  /** At the end of an attach hold, send the receipt then (in-process; the hourly sweep covers a restart). */
  function scheduleHeld(orderId, paymentId, holdEnds) {
    try {
      const timer = setTimeout(() => void sendForPayment({ orderId, paymentId, email: '' }), Math.max(1000, holdEnds - now() + 5000));
      if (timer && typeof timer.unref === 'function') timer.unref();
    } catch {
      /* the sweep covers it */
    }
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
    if (config.receiptDisabled || config.mode !== 'send' || !adminFirestore || typeof fetchImpl !== 'function') return { skipped: 'off' };
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
    if (order.accountSignInWith === 'phone') {
      // The account signs in with the mobile number only: a plain notice, never a link for this address.
      accountReady = buildPhoneAccountNoticeEmail({ passType: order.passType, packTarget: order.packTarget });
    } else if (order.accountHasEmail === true && typeof deps.emailSignInLink === 'function') {
      try {
        // Back to /login's finish step (markers only, never the address), then the safe landing: My packs / Home.
        const where = isPackProduct(order.passType) ? '/packs#my-packs' : '/';
        const link = await deps.emailSignInLink(to, `${config.appUrl}/login?finish=link&redirect=${encodeURIComponent(where === "/packs#my-packs" ? PAID_PACKS_LANDING : where)}`);
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

  /* ── GST-INVOICE-2a (review 2c): the receipt RE-SENT with an invoice issued later ("Issue now") ────────────────
   * ★ The order carries `gstInvoiceEmail: { status, queuedAtMs, at }` (queued -> sending -> sent | queued again after a
   *   retryable failure, at most 3 attempts | failed after 3 | refused | no_address | skipped); a `sending` claim older than
   *   30 min (a crash) is taken again. The address is the one ON THE INVOICE (Razorpay's payment
   *   record, fetched at issue). Resend's Idempotency-Key `gst-invoice-email-<paymentId>` is the second fence.
   * ★ Unlike the receipt, this is a LATER email, so it keeps the student-email rules: it goes out only inside the IST
   *   send window (EMAIL_SEND_WINDOW_IST, default 08:00-21:00) and never within 24 h of another LazyTopper email to the
   *   same person (the receipt for this order, a nudge or trial-ending email to the paying account, a guest email to this
   *   address); it writes `lastClaimMs` to those ledgers so the other emailers wait for it in turn. Otherwise it stays
   *   QUEUED and the hourly drain sends it when allowed. The stop list is not read: a tax invoice is transactional.
   */
  const sendWindow = resolveSendWindow(deps.env || process.env, () => {});

  const dailyCap = invoiceEmailDailyCap(deps.env || process.env);

  /**
   * GST-INVOICE-BACKDATE-1 - the rails of every LATER invoice email, INSIDE the caller's transaction (all reads first):
   * one email a day to this person (this order's receipt, the paying account's nudge / trial ledgers, the address's guest
   * ledger) and the durable daily cap. `{ ok: false, reason: 'spaced' | 'daily_cap' }`, or `{ ok: true, commit }` where
   * commit() writes `lastClaimMs` to the ledgers and count+1 to the day (call it after the caller's own reads).
   */
  async function slotTx(tx, order, to, t) {
    const uid = payerAccountUid(order);
    const key = emailKey(to);
    const nudgeRef = uid ? adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid) : null;
    const trialRef = uid ? adminFirestore.collection(TRIAL_EMAILS_COLLECTION).doc(uid) : null;
    const guestRef = key ? adminFirestore.collection(GUEST_NUDGE_EMAILS_COLLECTION).doc(key) : null;
    const dayKey = istDayKey(t);
    const dailyRef = adminFirestore.collection(GST_INVOICE_EMAIL_DAILY_COLLECTION).doc(dayKey);
    const rowOf = async (r) => {
      if (!r) return {};
      const x = await tx.get(r);
      return x && x.exists ? x.data() || {} : {};
    };
    const nudge = await rowOf(nudgeRef);
    const trial = await rowOf(trialRef);
    const guest = await rowOf(guestRef);
    const day = await rowOf(dailyRef);
    const receipt = order.receiptEmail && typeof order.receiptEmail === 'object' ? order.receiptEmail : {};
    const recent = [
      receipt.status === 'sent' || receipt.status === 'sending' ? msOf(receipt.at) : null,
      nudge.lastClaimMs,
      trial.status === 'sent' || trial.status === 'claimed' ? Math.max(msOf(trial.sentAt) || 0, msOf(trial.claimedAt) || 0) || null : null,
      guest.lastClaimMs,
    ].filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (recent.some((ms) => t - ms < ONE_A_DAY_MS)) return { ok: false, reason: 'spaced' };
    const count = typeof day.count === 'number' && day.count > 0 ? day.count : 0;
    if (count >= dailyCap) return { ok: false, reason: 'daily_cap' };
    return {
      ok: true,
      commit() {
        if (nudgeRef) tx.set(nudgeRef, { lastClaimMs: t }, { merge: true });
        if (guestRef) tx.set(guestRef, { lastClaimMs: t }, { merge: true });
        tx.set(dailyRef, { count: count + 1, dayKey, updatedAt: new Date(t) }, { merge: true });
      },
    };
  }

  async function runInvoiceEmail(orderId) {
    if (config.mode !== 'send' || !adminFirestore || typeof fetchImpl !== 'function') return { skipped: 'off' };
    if (typeof orderId !== 'string' || !/^[A-Za-z0-9_]{1,64}$/.test(orderId)) return { skipped: 'bad_input' };
    const t = now();
    if (!sendWindow.contains(t)) return { queued: 'window' };
    const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
    const claimed = await adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const order = snap && snap.exists ? snap.data() || {} : null;
      const state = order && order.gstInvoiceEmail && typeof order.gstInvoiceEmail === 'object' ? order.gstInvoiceEmail : null;
      // Review F2: a `sending` claim older than 30 min (the process died mid-send) is taken again.
      const stale = !!state && state.status === 'sending' && !(t - (msOf(state.at) || 0) < INVOICE_EMAIL_STALE_SENDING_MS);
      if (!order || !order.gstInvoice || !state || (state.status !== 'queued' && !stale)) return { skipped: 'not_queued' };
      const queuedAtMs = typeof state.queuedAtMs === 'number' ? state.queuedAtMs : t;
      const attempts = Number.isInteger(state.attempts) && state.attempts > 0 ? state.attempts : 0;
      // Review F3: the attempt cap (a stale claim counts as the attempt it was).
      if (attempts >= INVOICE_EMAIL_MAX_ATTEMPTS) {
        tx.set(ref, { gstInvoiceEmail: { status: 'failed', queuedAtMs, attempts, at: new Date(t) } }, { merge: true });
        return { skipped: 'failed' };
      }
      const buyer = order.gstInvoice.buyer || {};
      const to = typeof buyer.email === 'string' ? buyer.email.trim() : '';
      if (!to || to.length > 254 || !EMAIL_PATTERN.test(to) || isPlaceholderAddress(to)) {
        tx.set(ref, { gstInvoiceEmail: { status: 'no_address', queuedAtMs, attempts, at: new Date(t) } }, { merge: true });
        return { skipped: 'no_address' };
      }
      const slot = await slotTx(tx, order, to, t);
      if (!slot.ok) return { queued: slot.reason };
      tx.set(ref, { gstInvoiceEmail: { status: 'sending', queuedAtMs, attempts: attempts + 1, at: new Date(t) } }, { merge: true });
      slot.commit();
      return { order, to, queuedAtMs, attempts: attempts + 1 };
    });
    if (!claimed.order) return claimed;
    const { order, to, queuedAtMs, attempts } = claimed;
    const mark = async (status) => {
      try {
        await ref.set({ gstInvoiceEmail: { status, queuedAtMs, attempts, at: new Date(now()) } }, { merge: true });
      } catch {
        /* at most once */
      }
    };
    const paymentId = order.gstInvoice.paymentId;
    const paidMs = msOf(order.paidAt) || msOf(order.guestPaidAt) || order.gstInvoice.issuedAtMs || t;
    const built = buildReceiptEmail({ ...receiptArgsFor(order, orderId, paymentId, paidMs), invoiceResend: true });
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
      idempotencyKey: `gst-invoice-email-${paymentId}`,
      category: 'gst_invoice',
    });
    if (sent.ok) {
      await mark('sent');
      emit('payments.gst_invoice_email.sent');
      return { sent: true };
    }
    // A send that certainly did not go out is queued again (the next allowed drain: the one-a-day clock it just set means
    // about a day later), at most INVOICE_EMAIL_MAX_ATTEMPTS tries in all; then `failed`, for the admin (review F3).
    const status = !sent.retryable ? 'refused' : attempts < INVOICE_EMAIL_MAX_ATTEMPTS ? 'queued' : 'failed';
    await mark(status);
    emit('payments.gst_invoice_email.failed');
    return { sent: false, code: sent.code, status, attempts };
  }

  /**
   * Queue the invoice email for an order that has an invoice, and try to send it now. Resolves `{ sent } | { queued:
   * 'window' | 'spaced' } | { skipped }`. A queued / sent / sending email is never queued twice. Never throws.
   */
  async function queueInvoiceEmail({ orderId } = {}) {
    try {
      if (config.mode !== 'send' || !adminFirestore) return { skipped: 'off' };
      if (typeof orderId !== 'string' || !/^[A-Za-z0-9_]{1,64}$/.test(orderId)) return { skipped: 'bad_input' };
      const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
      const t = now();
      const queued = await adminFirestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const order = snap && snap.exists ? snap.data() || {} : null;
        if (!order || !order.gstInvoice) return 'no_invoice';
        const prior = order.gstInvoiceEmail && typeof order.gstInvoiceEmail === 'object' ? order.gstInvoiceEmail.status : null;
        if (prior === 'sent' || prior === 'sending') return prior;
        if (prior !== 'queued') tx.set(ref, { gstInvoiceEmail: { status: 'queued', queuedAtMs: t, at: new Date(t) } }, { merge: true });
        return 'queued';
      });
      if (queued !== 'queued') return { skipped: queued };
      return await runInvoiceEmail(orderId);
    } catch (e) {
      emit('payments.gst_invoice_email.error');
      console.error('[gst-invoice-email] queue failed:', e && e.message);
      return { error: true };
    }
  }

  /** One drain pass: the queued invoice emails (oldest first, a bounded batch), each under the rules above. Never throws. */
  async function drainInvoiceEmails() {
    const summary = { sent: 0, queued: 0, skipped: 0, failed: 0 };
    try {
      if (config.mode !== 'send' || !adminFirestore || !sendWindow.contains(now())) return summary;
      const ids = [];
      // Queued emails, and `sending` claims a crash left behind (review F2; runInvoiceEmail takes only stale ones).
      for (const status of ['queued', 'sending']) {
        let q = adminFirestore.collection(PAY_ORDERS_COLLECTION).where('gstInvoiceEmail.status', '==', status);
        if (typeof q.limit === 'function') q = q.limit(INVOICE_EMAIL_BATCH * 4);
        const snap = await q.get();
        snap.forEach((d) => ids.push([d.id, Number(((d.data() || {}).gstInvoiceEmail || {}).queuedAtMs) || 0]));
      }
      ids.sort((a, b) => a[1] - b[1]);
      for (const [id] of ids.slice(0, INVOICE_EMAIL_BATCH)) {
        let r;
        try {
          r = await runInvoiceEmail(id);
        } catch (e) {
          console.error('[gst-invoice-email] send failed:', e && e.message);
          r = { error: true };
        }
        if (r.sent) summary.sent += 1;
        else if (r.skipped === 'not_queued') continue; // a fresh `sending` claim another instance holds
        else if (r.queued) summary.queued += 1;
        else if (r.error || r.sent === false) summary.failed += 1;
        else summary.skipped += 1;
        if (r.queued === 'daily_cap') break; // the day is full: nothing else goes out today
      }
    } catch (e) {
      emit('payments.gst_invoice_email.error');
      console.error('[gst-invoice-email] drain failed:', e && e.message);
    }
    return summary;
  }

  /** The hourly drain (started by server/index.cjs only while invoicing AND payment email are on). Returns stop(). */
  function startInvoiceEmailRunner({ intervalMs = INVOICE_EMAIL_INTERVAL_MS } = {}) {
    if (config.mode !== 'send') return () => {};
    const timer = setInterval(() => void drainInvoiceEmails(), intervalMs);
    if (timer && typeof timer.unref === 'function') timer.unref();
    return () => clearInterval(timer);
  }

  /** Hourly: paid, unclaimed attach orders whose hold has ended and that never got their receipt (a restart lost the timer). */
  async function drainHeldReceipts() {
    try {
      if (config.mode !== 'send' || !adminFirestore) return 0;
      let q = adminFirestore.collection(PAY_ORDERS_COLLECTION).where('status', '==', 'paid_unclaimed');
      // Attach orders only, so the read cap cannot be starved by ordinary unclaimed orders.
      if (typeof q.where === 'function') q = q.where('attachFlow', '==', true);
      if (typeof q.limit === 'function') q = q.limit(200);
      const snap = await q.get();
      const jobs = [];
      snap.forEach((d) => {
        const o = d.data() || {};
        // `no_address` is final for the sweep (it must not re-look-up an address-less order every hour, forever).
        if (o.attachFlow !== true || o.attachedAt || (o.receiptEmail && o.receiptEmail.status !== 'failed' && !(o.receiptEmail.status === 'sending' && receiptRetryable(o.receiptEmail))) || typeof o.paymentId !== 'string') return;
        const paidMs = msOf(o.guestPaidAt);
        if (paidMs === null || now() - paidMs > HELD_RECEIPT_MAX_AGE_MS) return;
        const ends = attachHoldEndsMs(o);
        if (Number.isFinite(ends) && now() >= ends) jobs.push([d.id, o.paymentId]);
      });
      for (const [orderId, paymentId] of jobs.slice(0, 25)) {
        const r = await sendForPayment({ orderId, paymentId, email: '' });
        if (r && r.skipped === 'no_address') await settleIfUnsent(orderId, 'no_address');
      }
      return jobs.length;
    } catch (e) {
      emit('payments.receipt_email.error');
      return 0;
    }
  }

  /** R2: the held-receipt sweep runs on its OWN hourly timer (not only while invoicing is on). Returns stop(). */
  function startHeldReceiptRunner({ intervalMs = INVOICE_EMAIL_INTERVAL_MS } = {}) {
    if (config.mode !== 'send' || config.receiptDisabled) return () => {};
    const timer = setInterval(() => void drainHeldReceipts(), intervalMs);
    if (timer && typeof timer.unref === 'function') timer.unref();
    return () => clearInterval(timer);
  }

  async function whenIdle() {
    while (inFlight.size) await Promise.all([...inFlight]);
  }

  /**
   * GST-INVOICE-BACKDATE-1 - the same rails for the state form and its reminder (services/gstBackdate.cjs): the send
   * switch, the IST window, the in-transaction slot (one a day + daily cap) and the Resend send. Never logs an address.
   */
  const rails = {
    canSend: () => config.mode === 'send' && !!adminFirestore && typeof fetchImpl === 'function',
    inWindow: (t) => sendWindow.contains(t),
    slotTx,
    isAddress: (to) => typeof to === 'string' && to.length <= 254 && EMAIL_PATTERN.test(to) && !isPlaceholderAddress(to),
    appUrl: config.appUrl,
    send: ({ to, subject, text, html, idempotencyKey, category }) =>
      sendViaResend({ fetchImpl, apiKey: config.apiKey, from: config.from, replyTo: config.replyTo, to, subject, text, html, idempotencyKey, category }),
  };

  return { __settleForTest: settle, sendForPayment, sendRecipientReady, drainHeldReceipts, startHeldReceiptRunner, queueInvoiceEmail, drainInvoiceEmails, startInvoiceEmailRunner, whenIdle, config, rails };
}

module.exports = {
  buildAccountReadyEmail,
  buildPhoneAccountNoticeEmail,
  createPaymentReceiptEmailer,
  resolveReceiptEmailConfig,
  buildReceiptEmail,
  buildRecipientReadyEmail,
  itemLabel,
  emailItemLabel,
  maskPhoneDigits,
  maskMailShort,
  chapterTitle,
  SUPPORT_WHATSAPP_URL,
  SUPPORT_WHATSAPP_DISPLAY,
  GST_INVOICE_EMAIL_DAILY_COLLECTION,
  payerAccountUid,
  isPlaceholderAddress,
  istDayKey,
  formatInr,
  formatIstDay,
};
