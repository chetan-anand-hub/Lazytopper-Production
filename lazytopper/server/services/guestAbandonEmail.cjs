'use strict';
/**
 * guestAbandonEmail.cjs - GUEST-ABANDON-1 (owner ruling 6 Nov 2026). ONE follow-up email for a SIGNED-OUT checkout
 * (a guest order: uid null, payer 'guest' - CHECKOUT-WHO "Who will use it?" or PAY-PHONE-1) that was opened and not
 * paid, sent ONLY when the order carries an email address (`guestEmail`). Never SMS, never WhatsApp, never to a phone.
 * PURE helpers, the email template and the unsubscribe token; no I/O, no clock. The pass that uses them is
 * runGuestAbandonedCheckout in services/nudgeEmail.cjs, on the SAME rails as CHECKOUT-NUDGE-1: the hourly runner, the
 * IST send window (EMAIL-SEND-WINDOW-1), the claim + durable daily cap (`nudgeEmailDaily/{day}`) + opt-out re-read
 * transaction, the 24 h one-a-day spacing, the same 1-36 h order-age window, at most once per recipient per product.
 *
 * ★ DARK BY DEFAULT. Nothing runs unless GUEST_ABANDON_EMAIL_ENABLED is exactly "1" (on top of the nudge job's own
 *   NUDGE_EMAIL_ENABLED / NUDGE_EMAIL_DRY_RUN=0 / Resend / sender / unsubscribe-secret requirements).
 *
 * ★ WHO HAS NO ACCOUNT, SO NO UID. The recipient is keyed by `emailKey(email)` = SHA-256 of a domain-separated,
 *   normalised address (hex). Two collections hold ONLY that key, never the address:
 *     `guestNudgeEmails/{key}`   the per-recipient ledger: { abandoned_<product>: { status, ... }, lastClaimMs }
 *     `emailSuppression/{key}`   the stop record: { optedOut: true, optedOutAt, source } - written by the guest
 *                                unsubscribe link (GUEST_EMAIL_UNSUBSCRIBE_PATH, an HMAC token over the key).
 *   If the address also belongs to an account, that account's own opt-out (`trialEmails/{uid}.optedOut`), its nudge
 *   ledger (`nudgeEmails/{uid}`: same product already emailed, 24 h spacing) and what it has paid for are honoured too.
 *   The key is pseudonymous, not anonymous: anyone holding an address can recompute it. It is deliberately NOT keyed
 *   with a secret so that rotating TRIAL_EMAIL_UNSUBSCRIBE_SECRET can never silently drop a stop request.
 *
 * ★ COPY. Calm, for a student or a parent (whoever typed the address). No urgency, no "ask", no pre-filled payment:
 *   the button opens /pricing (Board Pass) or /packs (a pack). The only price is the item's CURRENT price, read from
 *   the server's pricing (computed by the caller), and no other claim.
 */

const crypto = require('node:crypto');
const { escapeHtml } = require('./trialEndingEmail.cjs');
const { normaliseEmail } = require('./guestPay.cjs');
const abandoned = require('./abandonedCheckout.cjs');

const GUEST_NUDGE_EMAILS_COLLECTION = 'guestNudgeEmails';
const EMAIL_SUPPRESSION_COLLECTION = 'emailSuppression';
const GUEST_EMAIL_UNSUBSCRIBE_PATH = '/api/guest-email/unsubscribe';
const METRIC = 'guest_abandoned_checkout';
const GUEST_PAYER = 'guest';
/** Guest-order statuses that mean the money for it arrived (guestPay.cjs GUEST_STATUS + the review labels). */
const GUEST_PAID_STATUSES = Object.freeze(['paid_unclaimed', 'claimed', 'paid', 'captured', 'duplicate_purchase', 'erased_unclaimed']);
const MIN_SECRET_LENGTH = 32;
const KEY_PATTERN = /^[a-f0-9]{64}$/;

/** The switch: exactly "1" turns it on; anything else (unset included) is off. PURE. */
function guestAbandonEmailEnabled(env = process.env) {
  return String((env && env.GUEST_ABANDON_EMAIL_ENABLED) || '').trim() === '1';
}

/** The recipient key: hex SHA-256 of the normalised address, domain-separated. null for a non-address. PURE. */
function emailKey(raw) {
  const e = normaliseEmail(raw);
  if (!e) return null;
  return crypto.createHash('sha256').update(`lazytopper-email-key:v1:${e}`).digest('hex');
}

function msOf(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  if (v instanceof Date) return v.getTime();
  return null;
}

const isGuestOrder = (o) => !!o && o.payer === GUEST_PAYER && (o.uid === null || o.uid === undefined);
const isPaidish = (o) => !!o && GUEST_PAID_STATUSES.includes(o.status);

/** Why this order is not an abandoned guest checkout we may email, or null when it is. PURE. */
function guestOrderSkipReason(order) {
  if (!order || typeof order !== 'object') return 'bad-order';
  if (!isGuestOrder(order)) return 'not-guest';
  if (order.status !== 'created') return isPaidish(order) ? 'paid' : 'not-created';
  if (msOf(order.paidAt) !== null) return 'paid';
  if (!normaliseEmail(order.guestEmail)) return 'no-email';
  return null;
}

/**
 * From the orders created in the window, the guest candidates: per recipient address and per product the NEWEST unpaid
 * guest order, unless an order in the same set paid for that product with the same address. Newest first. PURE.
 * Signed-in orders are NOT counted as skipped here (CHECKOUT-NUDGE-1 owns them).
 * @returns {Array<{ key:string, email:string, order:object, product:object }>}
 */
function pickGuestCandidates(orders, nowMs, skip = () => {}) {
  const list = (Array.isArray(orders) ? orders : []).filter(isGuestOrder);
  const best = new Map(); // `${key}|${product.key}` -> { key, email, order, product, at }
  for (const o of list) {
    if (isPaidish(o)) continue;
    const why = guestOrderSkipReason(o);
    if (why) {
      skip(`guest-${why}`);
      continue;
    }
    const at = msOf(o.createdAt);
    if (at === null || nowMs - at < abandoned.ABANDONED_MIN_AGE_MS || nowMs - at >= abandoned.ABANDONED_MAX_AGE_MS) {
      skip('guest-outside-window');
      continue;
    }
    const product = abandoned.productOf(o);
    if (product.reason) {
      skip(`guest-${product.reason}`);
      continue;
    }
    const email = normaliseEmail(o.guestEmail);
    const key = emailKey(email);
    const paidHere = list.some((p) => isPaidish(p) && normaliseEmail(p.guestEmail) === email && abandoned.sameProduct(product, p));
    if (paidHere) {
      skip('guest-paid-in-window');
      continue;
    }
    const id = `${key}|${product.key}`;
    const cur = best.get(id);
    if (!cur || at > cur.at) best.set(id, { key, email, order: o, product, at });
  }
  const out = [...best.values()].map(({ key, email, order, product }) => ({ key, email, order, product }));
  out.sort((a, b) => (msOf(b.order.createdAt) || 0) - (msOf(a.order.createdAt) || 0));
  return out;
}

/**
 * Did a payment for the same product land, for this address (or this phone), after the guest order was opened? PURE.
 * `related` = the guest orders found by the same guestEmail / guestPhone; `accountOrders` = the orders of the account
 * that owns the address (if any). Returns a skip reason or null.
 */
function guestPaidSinceReason({ product, order, related, accountOrders, accountPremium, accountOwnsPack }) {
  if (product.kind === 'board_pass' && accountPremium) return 'premium-now';
  if (product.kind === 'pack' && accountOwnsPack) return 'already-owned';
  const openedAt = msOf(order && order.createdAt);
  for (const o of [...(Array.isArray(related) ? related : []), ...(Array.isArray(accountOrders) ? accountOrders : [])]) {
    if (!isPaidish(o) || !abandoned.sameProduct(product, o)) continue;
    const at = msOf(o.guestPaidAt) ?? msOf(o.paidAt) ?? msOf(o.createdAt);
    if (openedAt === null || at === null || at >= openedAt) return 'paid-since';
  }
  return null;
}

// ── Unsubscribe token (HMAC over the recipient key, no expiry: a stop link must keep working) ──────────────────────

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
function macFor(key, secret) {
  return crypto.createHmac('sha256', secret).update(`guest-email-unsubscribe:${key}`).digest();
}
function signGuestUnsubscribe(key, secret) {
  return `${key}.${b64url(macFor(key, secret))}`;
}
/** The recipient key a token is for, or null. Constant-time compare; never throws. PURE. */
function verifyGuestUnsubscribe(token, secret) {
  try {
    if (!secret || secret.length < MIN_SECRET_LENGTH) return null;
    if (typeof token !== 'string' || token.length > 256) return null;
    const [key, macPart] = token.split('.');
    if (!key || !macPart || !KEY_PATTERN.test(key)) return null;
    const expected = macFor(key, secret);
    const got = fromB64url(macPart);
    if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) return null;
    return key;
  } catch {
    return null;
  }
}
function guestUnsubscribeUrlFor(appUrl, key, secret) {
  return `${appUrl}${GUEST_EMAIL_UNSUBSCRIBE_PATH}?t=${encodeURIComponent(signGuestUnsubscribe(key, secret))}`;
}

// ── The email ─────────────────────────────────────────────────────────────────────────────────────────────────────

const utm = (content) => `utm_source=email&utm_medium=email&utm_campaign=guest_abandoned_checkout&utm_content=${content}`;
const rupee = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

/** The page the product lives on - never a pre-filled payment. PURE. */
function productPageUrl(appUrl, product) {
  return product.kind === 'board_pass' ? `${appUrl}/pricing?${utm('page')}` : `${appUrl}/packs?${utm('page')}`;
}

/**
 * The email. PURE. Plain HTML + text, no tracking pixel, no name, no urgency, no "ask", a plain stop line with the
 * guest unsubscribe link. `currentPriceInr` is the item's price NOW (null -> no price line).
 * @returns {{subject:string, text:string, html:string, links:{page:string}} | null}
 */
function buildGuestAbandonEmail({ product, currentPriceInr, appUrl, unsubscribeUrl }) {
  const name = abandoned.productName(product);
  if (!name || !unsubscribeUrl) return null;
  const page = productPageUrl(appUrl, product);
  const where = product.kind === 'board_pass' ? 'the Plans page' : 'the Packs page';
  const subject = `Your LazyTopper checkout for the ${name}`;
  const paras = [
    'Hi,',
    `A checkout for the LazyTopper ${name} was started with this email address, and the payment was not finished. Nothing was charged.`,
    `If you still want it, it is on ${where} whenever you are ready.`,
  ];
  if (Number.isFinite(currentPriceInr) && currentPriceInr > 0) paras.push(`${name}: ${rupee(currentPriceInr)}.`);
  paras.push('If this was not you, or you have already sorted it out, you can ignore this email.');
  const signoff = 'Team LazyTopper';
  const footer = 'This is the only email about this checkout. To stop all LazyTopper emails to this address, use the unsubscribe link.';

  const text = [...paras.flatMap((p) => [p, '']), `Open ${where}: ${page}`, '', signoff, '', footer, `Unsubscribe: ${unsubscribeUrl}`, '', 'LazyTopper'].join('\n');

  const pStyle = 'margin:0 0 14px;font-size:15px;line-height:1.5;color:#1b2a3a';
  const html = [
    '<!doctype html><html><body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif">',
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">',
    paras.map((p) => `<p style="${pStyle}">${escapeHtml(p)}</p>`).join(''),
    `<p style="margin:0 0 14px"><a href="${escapeHtml(page)}" style="display:inline-block;background:#13804f;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:8px">${escapeHtml(`Open ${where}`)}</a></p>`,
    `<p style="${pStyle}">${escapeHtml(signoff)}</p>`,
    `<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#5b6b7c">${escapeHtml(footer)} <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5b6b7c">Unsubscribe</a></p>`,
    '</div></body></html>',
  ].join('');
  return { subject, text, html, links: { page } };
}

/** The per-run structured count line (no PII: counts and reason names only). PURE. */
function runCountLine(s) {
  return `[guest-abandoned-checkout] run mode=${s.mode} candidates=${s.candidates} wouldSend=${s.wouldSend} sent=${s.sent} failed=${s.failed} skipped=${JSON.stringify(s.skipped)}`;
}

module.exports = {
  GUEST_NUDGE_EMAILS_COLLECTION,
  EMAIL_SUPPRESSION_COLLECTION,
  GUEST_EMAIL_UNSUBSCRIBE_PATH,
  METRIC,
  guestAbandonEmailEnabled,
  emailKey,
  guestOrderSkipReason,
  pickGuestCandidates,
  guestPaidSinceReason,
  signGuestUnsubscribe,
  verifyGuestUnsubscribe,
  guestUnsubscribeUrlFor,
  productPageUrl,
  buildGuestAbandonEmail,
  runCountLine,
};
