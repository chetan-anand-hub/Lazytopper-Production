'use strict';
/**
 * abandonedCheckout.cjs - CHECKOUT-NUDGE-1 (owner approved 3 Nov 2026, 16:30). One follow-up email to a signed-in
 * student who opened a checkout (Board Pass or a PDF pack) and did not pay. PURE helpers and the email template;
 * no I/O, no clock. The pass that uses them is runAbandonedCheckout in services/nudgeEmail.cjs, on the SAME rails as
 * every other nudge: the hourly runner, the IST send window (EMAIL_SEND_WINDOW_IST), the claim + durable daily cap +
 * opt-out re-read transaction, the 24 h one-a-day spacing, the shared signed unsubscribe, Resend. No second scheduler,
 * no second ledger, no new collection: the ledger key lives in `nudgeEmails/{uid}`.
 *
 * WHY (Razorpay, 28 Oct - 3 Nov 2026): 24 real checkouts opened, 6 paid; 15 opened with zero payment attempts; Board
 * Pass 12 opened, 1 paid. Nothing followed up an abandoned checkout.
 *
 * ★ DARK BY DEFAULT. Nothing runs unless ABANDONED_CHECKOUT_EMAIL_ENABLED is exactly "1" (on top of the nudge job's own
 *   NUDGE_EMAIL_ENABLED / NUDGE_EMAIL_DRY_RUN=0 / Resend / sender / unsubscribe-secret requirements).
 *
 * ★ WHO. An order in `payOrders` (written by routes/payments.cjs handleOrder: { uid, passType, amountPaise, packTarget?,
 *   status: 'created', createdAt }) that is:
 *     - the student's OWN order: a uid, no `payer` (a parent-link or guest order is never a candidate), no guestPhone;
 *     - still status 'created' (never paid) and created 1-36 h ago;
 *     - a Board Pass (`till_boards`) or a valid PDF pack. Month-pass orders (retired 1 Nov 2026) and top-ups are skipped;
 *     - not followed by a payment for the same product (any Board Pass, for a Board Pass; the same pack, or a pack
 *       that now covers it, for a pack), and for a Board Pass the student is not Premium now.
 *   At most ONE abandoned-checkout email per student per product, ever (ledger key `abandoned_<product>`).
 *
 * ★ PRIVACY. Every URL carries only a path and UTM tags: no uid, no email, no phone. The WhatsApp share link is
 *   `https://wa.me/?text=...` with NO number. Logs carry counts, the uid (as every nudge log already does) and a masked
 *   email in dry runs only. No refund wording, ever.
 */

const { escapeHtml } = require('./trialEndingEmail.cjs');
const pricing = require('./passPricing.cjs');
const { PACK_CHAPTERS, isPackProduct, packIdFor, parsePackId, isAlreadyOwned } = require('./packProducts.cjs');
const { packDisplayName } = require('./packNudge.cjs');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The order's age window: created at least 1 h and less than 36 h ago. */
const ABANDONED_MIN_AGE_MS = 1 * HOUR_MS;
const ABANDONED_MAX_AGE_MS = 36 * HOUR_MS;
/** The newest orders read per run (one single-field createdAt range query, the checkout_help pattern). */
const CAP_ABANDONED = 500;
/** Graded sessions considered for the "marks lost" line: at most this many, from at most this far back. */
const MARKS_LOOKBACK_MS = 30 * DAY_MS;
const MARKS_MAX_RECORDS = 5;
const KIND_PREFIX = 'abandoned_';
const METRIC = 'abandoned_checkout';
const ERASED_UID = 'erased';
const BOARD_PASS = 'board_pass';

/** The switch: exactly "1" turns it on; anything else (unset included) is off. PURE. */
function abandonedCheckoutEnabled(env = process.env) {
  return String((env && env.ABANDONED_CHECKOUT_EMAIL_ENABLED) || '').trim() === '1';
}

function msOf(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  if (v instanceof Date) return v.getTime();
  return null;
}

/**
 * What the order is for, or { reason } when it is not something this email follows up. PURE.
 * @returns {{ key:string, kind:'board_pass'|'pack', sku?:string, target?:string, packId?:string } | { reason:string }}
 */
function productOf(order) {
  const passType = order && order.passType;
  if (passType === 'till_boards') return { key: BOARD_PASS, kind: BOARD_PASS };
  if (passType === 'month') return { reason: 'month-order' };
  if (pricing.isTopupProduct(passType)) return { reason: 'topup-order' };
  if (isPackProduct(passType)) {
    const packId = packIdFor(passType, order.packTarget);
    const parsed = packId ? parsePackId(packId) : null;
    if (!parsed) return { reason: 'bad-pack' };
    return { key: packId, kind: 'pack', sku: parsed.sku, target: parsed.target, packId };
  }
  return { reason: 'unknown-product' };
}

/** Two orders are "the same product" for the paid-since rule: any Board Pass for a Board Pass; the same pack id. PURE. */
function sameProduct(product, order) {
  const p = productOf(order);
  return !!p && !p.reason && p.key === product.key;
}

/** The ledger key, a safe Firestore map key: `abandoned_board_pass`, `abandoned_pack_chapter_real_numbers`. PURE. */
function abandonedKind(product) {
  const safe = String(product && product.key ? product.key : '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `${KIND_PREFIX}${safe}`;
}

/** Does this nudge ledger row hold any abandoned-checkout email (claimed, sent or failed)? PURE. */
function hasAbandonedEntry(ledger) {
  return !!ledger && typeof ledger === 'object' && Object.keys(ledger).some((k) => k.startsWith(KIND_PREFIX) && ledger[k]);
}

/** Why this order is not the student's own unpaid checkout, or null when it is. PURE. */
function orderSkipReason(order) {
  if (!order || typeof order !== 'object') return 'bad-order';
  if (typeof order.uid !== 'string' || !order.uid) return 'guest-order';
  if (order.uid === ERASED_UID) return 'erased';
  if (order.payer || order.guestPhone || order.parentLinkId) return order.payer === 'parent' || order.parentLinkId ? 'parent-order' : 'guest-order';
  if (order.status !== 'created') return order.status === 'paid' || order.status === 'captured' ? 'paid' : 'not-created';
  if (order.duplicate) return 'duplicate';
  return null;
}

const isPaid = (o) => !!o && (o.status === 'paid' || o.status === 'captured');

/**
 * From the orders created in the window, the candidates: per student and per product the NEWEST unpaid own order, unless
 * an order in the same set paid for that product. Newest first, so a student's latest checkout is tried first and an
 * older product only when the newer one was already emailed. PURE. `skip(reason)` counts what was dropped.
 * @returns {Array<{ uid:string, order:object, product:object }>}
 */
function pickCandidates(orders, nowMs, skip = () => {}) {
  const byUid = new Map();
  for (const o of Array.isArray(orders) ? orders : []) {
    if (!o || typeof o.uid !== 'string' || !o.uid) {
      skip('guest-order');
      continue;
    }
    const list = byUid.get(o.uid) || [];
    list.push(o);
    byUid.set(o.uid, list);
  }
  const out = [];
  for (const [uid, list] of byUid) {
    const paid = list.filter(isPaid);
    const best = new Map(); // product key -> { order, product, at }
    for (const o of list) {
      if (isPaid(o)) continue;
      const why = orderSkipReason(o);
      if (why) {
        skip(why);
        continue;
      }
      const at = msOf(o.createdAt);
      if (at === null || nowMs - at < ABANDONED_MIN_AGE_MS || nowMs - at >= ABANDONED_MAX_AGE_MS) {
        skip('outside-window');
        continue;
      }
      const product = productOf(o);
      if (product.reason) {
        skip(product.reason);
        continue;
      }
      if (paid.some((p) => sameProduct(product, p))) {
        skip('paid-in-window');
        continue;
      }
      const cur = best.get(product.key);
      if (!cur || at > cur.at) best.set(product.key, { order: o, product, at });
    }
    for (const v of best.values()) out.push({ uid, order: v.order, product: v.product });
  }
  out.sort((a, b) => (msOf(b.order.createdAt) || 0) - (msOf(a.order.createdAt) || 0));
  return out;
}

/**
 * The last look before the claim: did a payment for the same product land after the abandoned order was opened, or
 * does the student already own it? PURE. Returns a skip reason or null.
 * `uidOrders` = every order of this student; `packs` = their pack entitlements (listPacks shape); `isPremium` = tier now.
 */
function paidSinceReason({ product, order, uidOrders, packs, isPremium }) {
  if (product.kind === BOARD_PASS && isPremium) return 'premium-now';
  const openedAt = msOf(order && order.createdAt);
  for (const o of Array.isArray(uidOrders) ? uidOrders : []) {
    if (!isPaid(o) || !sameProduct(product, o)) continue;
    const at = msOf(o.paidAt) ?? msOf(o.createdAt);
    if (openedAt === null || at === null || at >= openedAt) return 'paid-since';
  }
  if (product.kind === 'pack' && isAlreadyOwned(packs, product.sku, product.target)) return 'already-owned';
  return null;
}

const fmtMarks = (n) => (Math.round(n * 10) / 10).toString();

/**
 * One honest line from the student's REAL graded sessions (sessionRecords: marksAwarded / marksTotal, status graded),
 * the newest MARKS_MAX_RECORDS from the last 30 days. null when there is nothing graded or nothing was lost - never a
 * made-up figure. PURE.
 */
function marksLostLine(records, nowMs) {
  const usable = (Array.isArray(records) ? records : [])
    .filter(
      (r) =>
        r &&
        r.status === 'graded' &&
        typeof r.gradedAt === 'number' &&
        r.gradedAt >= nowMs - MARKS_LOOKBACK_MS &&
        r.gradedAt <= nowMs &&
        typeof r.marksAwarded === 'number' &&
        typeof r.marksTotal === 'number' &&
        Number.isFinite(r.marksAwarded) &&
        Number.isFinite(r.marksTotal) &&
        r.marksTotal > 0 &&
        r.marksAwarded >= 0 &&
        r.marksAwarded <= r.marksTotal
    )
    .sort((a, b) => b.gradedAt - a.gradedAt);
  const seen = new Set();
  const picked = [];
  for (const r of usable) {
    const id = typeof r.id === 'string' ? r.id : null;
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    picked.push(r);
    if (picked.length >= MARKS_MAX_RECORDS) break;
  }
  if (!picked.length) return null;
  const total = picked.reduce((s, r) => s + r.marksTotal, 0);
  const lost = picked.reduce((s, r) => s + (r.marksTotal - r.marksAwarded), 0);
  if (!(lost > 0)) return null;
  const papers = picked.length === 1 ? 'your last marked paper' : `your last ${picked.length} marked papers`;
  return `In ${papers} on LazyTopper, step marking found ${fmtMarks(lost)} of ${fmtMarks(total)} marks lost.`;
}

const utm = (content) => `utm_source=email&utm_medium=email&utm_campaign=abandoned_checkout&utm_content=${content}`;

/**
 * "Finish paying": the one-tap paths OFFERS-V2 builds - `/pricing?buy=board_pass` (boardPassBuy.ts BOARD_PASS_BUY_PATH)
 * and `/packs?buy=<sku>&t=<target>` (offersModel.ts buyHrefFor; the Bundle has no t) - with UTM tags after. PURE.
 */
function finishPayingUrl(appUrl, product) {
  if (product.kind === BOARD_PASS) return `${appUrl}/pricing?buy=board_pass&${utm('finish')}`;
  const q = new URLSearchParams({ buy: product.sku });
  if (product.sku !== 'pack_bundle') q.set('t', product.target);
  return `${appUrl}/packs?${q.toString()}&${utm('finish')}`;
}

/** The Plans page, where the existing "Ask a parent to pay" / "Pay by QR code" actions live (ASK-PARENTS-PAY-1). PURE. */
function parentPayPageUrl(appUrl) {
  return `${appUrl}/pricing?${utm('parent')}`;
}

/** A WhatsApp share link with prefilled text and NO phone number (the student picks the contact). PURE. */
function whatsappShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

const rupee = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const SUBJECT_LABEL = Object.freeze({ maths: 'Maths', science: 'Science' });

/**
 * One line on what the product gives, from the existing product copy: the Board Pass "ladder" benefit
 * (src/components/packs/offersCopy.ts BOARD_PASS_BENEFIT.ladder) and the pack OFFER_LINES (offersModel.ts). PURE.
 * ★ KEEP IN STEP: the mock counts ("16 mocks", "8 board-pattern mock papers") mirror MOCKS_PER_SUBJECT (8) and
 *   BUNDLE_MOCKS (16) in src/lib/packs/packLabels.ts. The server has no copy of those constants (packProducts.cjs holds
 *   prices and targets only), so a change there must be made here too.
 */
function benefitLine(product) {
  if (product.kind === BOARD_PASS) return 'Get your written answers marked step by step, like a CBSE examiner, till your boards.';
  switch (product.sku) {
    case 'pack_bundle':
      return `All ${Object.keys(PACK_CHAPTERS).length} chapters + 16 mocks, the whole year.`;
    case 'pack_subject':
      return `Every ${SUBJECT_LABEL[product.target] || ''} chapter, chapter-wise question bank.`;
    case 'pack_cbq':
      return 'Competency questions of every type, chapter-wise.';
    case 'pack_mock':
      return '8 board-pattern mock papers with step-marking keys.';
    default:
      return 'Important questions with answer keys.';
  }
}

/**
 * The rupee amount of the abandoned order itself: `amountPaise` as the SERVER set it when the order was created
 * (payments.cjs handleOrder - it already carries the founding price and any pack credit). null when unusable. PURE.
 * Never a config price: a founding student keeps the founding price, and a credited order shows its credited amount.
 */
function orderAmountInr(order) {
  const p = order && order.amountPaise;
  return Number.isInteger(p) && p > 0 ? p / 100 : null;
}

/** The price line, from the order's own amount; null (no line) when the order has no usable amount. PURE. */
function priceLine(product, order) {
  const inr = orderAmountInr(order);
  if (inr === null) return null;
  if (product.kind === BOARD_PASS) return `Board Pass: ${rupee(inr)}, one payment till your boards.`;
  return `${rupee(inr)}, one-time payment. It never renews.`;
}

/** A payment was tried and failed (Razorpay's signed payment.failed left `lastFailure`, PAY-RESCUE-1). PURE. */
function hadFailedAttempt(order) {
  return !!(order && order.lastFailure && typeof order.lastFailure === 'object');
}
const RETRY_LINE = "If your payment didn't go through, you can simply try again — nothing extra is needed.";

/** The product's name in the email. PURE. */
function productName(product) {
  return product.kind === BOARD_PASS ? 'Board Pass' : packDisplayName(product.packId);
}

/**
 * The email. PURE. Plain HTML + text, no tracking pixel, the shared unsubscribe link, no refund wording, no urgency words.
 * `parentPayLive` true -> "Send it to a parent" opens the Plans page's parent-pay actions (Board Pass only: parent pay
 * sells passes, not packs); otherwise it is a WhatsApp share (no number) asking a parent to help.
 * @returns {{subject:string, text:string, html:string, links:{finish:string, parent:string}} | null}
 */
function buildAbandonedCheckoutEmail({ product, order, marksLine, appUrl, unsubscribeUrl, parentPayLive }) {
  const name = productName(product);
  if (!name) return null;
  const finish = finishPayingUrl(appUrl, product);
  const inr = orderAmountInr(order);
  const price = inr === null ? '' : product.kind === BOARD_PASS ? ` (${rupee(inr)}, one payment till my boards)` : ` (${rupee(inr)}, one-time)`;
  const ask =
    product.kind === BOARD_PASS
      ? `Hi, I want to get the LazyTopper Board Pass for my board exam prep${price}. Can you help me pay for it? ${appUrl}/pricing`
      : `Hi, I want to get the LazyTopper ${name} for my board exam prep${price}. Can you help me pay for it? ${appUrl}/packs`;
  const parent = product.kind === BOARD_PASS && parentPayLive ? parentPayPageUrl(appUrl) : whatsappShareUrl(ask);
  const parentNote =
    product.kind === BOARD_PASS && parentPayLive
      ? 'Want a parent to pay? On the Plans page, "Ask a parent to pay" sends them a pay link.'
      : 'Want a parent to pay? Send them a WhatsApp message with the details.';

  const subject = `Your ${name} is waiting`;
  const paras = [
    { t: 'Hi,' },
    { t: `You opened the checkout for the ${name} on LazyTopper but did not finish paying. It is still here when you are ready.` },
  ];
  if (hadFailedAttempt(order)) paras.push({ t: RETRY_LINE });
  paras.push({ t: benefitLine(product) });
  const pl = priceLine(product, order);
  if (pl) paras.push({ t: pl });
  if (marksLine) paras.push({ t: marksLine });
  const buttons = [
    { label: 'Finish paying', url: finish },
    { label: 'Send it to a parent', url: parent },
  ];
  const signoff = 'Team LazyTopper · Made by an IITian (IIT Kanpur)';
  const footer = "You're getting this because you made a LazyTopper account with this address. You can stop these emails any time.";

  const textLines = [];
  for (const p of paras) textLines.push(p.t, '');
  textLines.push(`Finish paying: ${finish}`, '', parentNote, `Send it to a parent: ${parent}`, '', signoff, '', footer, `Unsubscribe: ${unsubscribeUrl}`, '', 'LazyTopper');
  const text = textLines.join('\n');

  const pStyle = 'margin:0 0 14px;font-size:15px;line-height:1.5;color:#1b2a3a';
  const btn = (b, primary) =>
    `<a href="${escapeHtml(b.url)}" style="display:inline-block;margin:0 8px 10px 0;${
      primary ? 'background:#13804f;color:#ffffff' : 'background:#ffffff;color:#13804f;border:1px solid #13804f'
    };font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:8px">${escapeHtml(b.label)}</a>`;
  const html = [
    '<!doctype html><html><body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif">',
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">',
    paras.map((p) => `<p style="${pStyle}">${escapeHtml(p.t)}</p>`).join(''),
    `<p style="margin:0 0 8px">${btn(buttons[0], true)}${btn(buttons[1], false)}</p>`,
    `<p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:#5b6b7c">${escapeHtml(parentNote)}</p>`,
    `<p style="${pStyle}">${escapeHtml(signoff)}</p>`,
    `<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#5b6b7c">${escapeHtml(footer)} <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5b6b7c">Unsubscribe</a></p>`,
    '</div></body></html>',
  ].join('');
  return { subject, text, html, links: { finish, parent } };
}

/** The per-run structured count line (no PII: counts and reason names only). PURE. */
function runCountLine(s) {
  return `[abandoned-checkout] run mode=${s.mode} candidates=${s.candidates} wouldSend=${s.wouldSend} sent=${s.sent} failed=${s.failed} skipped=${JSON.stringify(s.skipped)}`;
}

module.exports = {
  ABANDONED_MIN_AGE_MS,
  ABANDONED_MAX_AGE_MS,
  CAP_ABANDONED,
  KIND_PREFIX,
  METRIC,
  abandonedCheckoutEnabled,
  productOf,
  sameProduct,
  abandonedKind,
  hasAbandonedEntry,
  orderSkipReason,
  pickCandidates,
  paidSinceReason,
  marksLostLine,
  finishPayingUrl,
  parentPayPageUrl,
  whatsappShareUrl,
  benefitLine,
  priceLine,
  orderAmountInr,
  hadFailedAttempt,
  RETRY_LINE,
  productName,
  buildAbandonedCheckoutEmail,
  runCountLine,
};
