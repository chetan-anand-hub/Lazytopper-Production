'use strict';
/**
 * gstBackdate.cjs — GST-INVOICE-BACKDATE-1 (owner ruling + CA's answer, 7 Nov 2026). GST tax invoices for the PAST SALES
 * of 16 Sep 2026 (registration) up to the 7 Nov cut-off, whose prices were GST-inclusive and whose buyers were never
 * asked their state.
 *
 *   1. Admin "Past sales": every paid order from 16 Sep 2026 00:00 IST created before the cut-off (gstInvoice.cjs
 *      backdateExclusion: never pre-registration, never a top-up, never refunded), with its status:
 *      needs details / form queued / form sent / reminder sent / details received / invoiced (or no address, refunded,
 *      failed).
 *   2. "Send state forms" (admin, in batches): for each order that needs details, Razorpay's payment record gives the
 *      PAYER's address (fallback: the paying account's email) and tells us whether it was refunded. The form email is
 *      QUEUED; the drain sends it.
 *   3. The email carries a SIGNED link (INVOICE_LINK_SECRET, its own domain, expires after 30 days) to
 *      /invoice-details?t=…: state + PIN (and the optional business GSTIN). It works signed out.
 *   4. On submit the buyer's state + PIN are stored on the order and the invoice is issued at once in the SAME gapless
 *      series, through the SAME transaction (gstInvoice.cjs issueBackdated, idempotent per payment id), with the tax
 *      WORKED BACK from the amount paid. The invoice is then emailed (paymentReceiptEmail queueInvoiceEmail).
 *   5. ONE reminder 5 days after the form to a non-responder, then nothing more.
 *
 * ★ Every email here keeps the student-email rules: only inside the IST send window (default 08:00-21:00), never within
 *   24 h of another LazyTopper email to the same person, and under the durable daily cap (paymentReceiptEmail rails).
 * ★ NEVER a default state, NEVER the IP region: the form starts unselected and only the buyer's answer is used.
 * ★ The order field is `gstBackdate: { status, contact: { email, phone }, emailSource, queuedAtMs, formSentAtMs,
 *   reminderSentAtMs, detailsAtMs, attempts, at }`. The address is kept for the reminder and the invoice (the invoice
 *   prints it anyway). Never logged.
 */

const crypto = require('node:crypto');
const {
  PAY_ORDERS_COLLECTION,
  backdateExclusion,
  supplyMsOf,
  gstBuyerFromBody,
  invoiceLinkSecret,
  invoiceToken,
  BACKDATE_FROM_MS,
} = require('./gstInvoice.cjs');
const { escapeHtml } = require('./trialEndingEmail.cjs');
const { itemLabel, formatInr, formatIstDay, payerAccountUid } = require('./paymentReceiptEmail.cjs');
const { maskEmail } = require('./guestPay.cjs');

const DAY_MS = 24 * 60 * 60 * 1000;
const DETAILS_TOKEN_TTL_MS = 30 * DAY_MS;
const REMINDER_AFTER_MS = 5 * DAY_MS;
const STALE_SENDING_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 3;
/** Emails tried per drain run (the daily cap still applies), and orders prepared per "Send state forms" click. */
const SEND_BATCH = 20;
const FORMS_PER_CLICK = 50;
const RUNNER_INTERVAL_MS = 60 * 60 * 1000;
const ID_PATTERN = /^[A-Za-z0-9_]{1,64}$/;
const SUPPORT_EMAIL = 'support@lazytopper.com';

/* ── The signed, expiring link ───────────────────────────────────────────────── */

function macFor(payload, secret) {
  return crypto.createHmac('sha256', `gst-invoice-details:v1:${secret}`).update(payload).digest('base64url').slice(0, 32);
}
/** `<base64url(orderId.expMs)>.<mac>`, or '' without a secret. A DIFFERENT domain from the invoice download link. */
function detailsToken(orderId, expMs, secret) {
  if (!secret || typeof orderId !== 'string' || !ID_PATTERN.test(orderId) || !Number.isInteger(expMs)) return '';
  const payload = Buffer.from(`${orderId}.${expMs}`, 'utf8').toString('base64url');
  return `${payload}.${macFor(payload, secret)}`;
}
/** `{ orderId, expMs }`, or `{ error: 'invalid' | 'expired' }`. Timing-safe; the expiry is checked only after the MAC. */
function parseDetailsToken(token, secret, nowMs) {
  if (!secret || typeof token !== 'string' || token.length > 300) return { error: 'invalid' };
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return { error: 'invalid' };
  const payload = token.slice(0, dot);
  const expected = Buffer.from(macFor(payload, secret));
  const given = Buffer.from(token.slice(dot + 1));
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return { error: 'invalid' };
  let raw;
  try {
    raw = Buffer.from(payload, 'base64url').toString('utf8');
  } catch {
    return { error: 'invalid' };
  }
  const m = /^([A-Za-z0-9_]{1,64})\.(\d{1,16})$/.exec(raw);
  if (!m) return { error: 'invalid' };
  const expMs = Number(m[2]);
  if (!(nowMs < expMs)) return { error: 'expired' };
  return { orderId: m[1], expMs };
}

/* ── Status ───────────────────────────────────────────────────────────────────── */

/** PURE. The admin's status for a past sale. */
function pastSaleStatus(order) {
  if (order.gstInvoice) return 'invoiced';
  const b = order.gstBackdate && typeof order.gstBackdate === 'object' ? order.gstBackdate : {};
  if (b.status === 'details_received' || (order.gstBuyer && b.detailsAtMs)) return 'details_received';
  if (b.status === 'refunded' || b.status === 'no_address' || b.status === 'failed') return b.status;
  if (b.reminderSentAtMs) return 'reminder_sent';
  if (b.formSentAtMs) return 'form_sent';
  if (b.status === 'form_queued' || b.status === 'form_sending') return 'form_queued';
  return 'needs_details';
}

/* ── The email ───────────────────────────────────────────────────────────────── */

/** PURE. The state-form email (and its one reminder). Plain, short, no tracking. */
function buildStateFormEmail({ item, amountPaise, supplyMs, link, reminder = false }) {
  if (!item || typeof link !== 'string' || !/^https:\/\//.test(link)) return null;
  const amount = formatInr(amountPaise / 100);
  const date = formatIstDay(supplyMs);
  const subject = reminder ? `Reminder: confirm your state for your GST invoice (${item})` : `Your GST invoice for ${item}: confirm your state`;
  const lead = reminder
    ? 'A reminder: your GST tax invoice for this LazyTopper purchase is ready to be issued.'
    : 'Your GST tax invoice for this LazyTopper purchase is ready to be issued.';
  const ask = 'We only need your state and PIN code to complete it (the state decides whether the invoice shows CGST + SGST or IGST). It takes a moment.';
  const after = 'The link works for 30 days. Buying for a school or coaching centre? You can add its GSTIN on the same page. Your purchase itself is not affected.';
  const text = [
    lead,
    `Item: ${item}\nAmount paid: ${amount}\nPaid on: ${date}`,
    ask,
    `Confirm your state: ${link}`,
    after,
    `Need help? Reply to this email or write to ${SUPPORT_EMAIL}.`,
    'LazyTopper',
  ].join('\n\n');
  const html = `<p>${escapeHtml(lead)}</p>
<p>Item: ${escapeHtml(item)}<br>Amount paid: ${escapeHtml(amount)}<br>Paid on: ${escapeHtml(date)}</p>
<p>${escapeHtml(ask)}</p>
<p><a href="${escapeHtml(link)}">Confirm your state</a></p>
<p>${escapeHtml(after)}</p>
<p>Need help? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
<p>LazyTopper</p>`;
  return { subject, text, html };
}

/* ── The service ─────────────────────────────────────────────────────────────── */

function createGstBackdate(deps = {}) {
  const { adminFirestore, invoicer, mailer, telemetry } = deps;
  const env = deps.env || process.env;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const rails = mailer && mailer.rails ? mailer.rails : null;
  const secret = () => invoiceLinkSecret(env);

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* never */
    }
  }
  const enabled = () => !!(invoicer && invoicer.config && invoicer.config.enabled) && !!adminFirestore;
  const orderRef = (id) => adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(id);
  const backdateOf = (o) => (o && o.gstBackdate && typeof o.gstBackdate === 'object' ? o.gstBackdate : {});

  /** Every past sale (paid on/after 16 Sep 2026, created before the cut-off), refunded ones excluded. */
  async function pastSales() {
    const seen = new Map();
    for (const field of ['paidAt', 'guestPaidAt']) {
      const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).where(field, '>=', new Date(BACKDATE_FROM_MS)).get();
      snap.forEach((d) => {
        if (!seen.has(d.id)) seen.set(d.id, { id: d.id, ...(d.data() || {}) });
      });
    }
    const out = [];
    let refunded = 0;
    for (const o of seen.values()) {
      const why = backdateExclusion(o);
      if (why === 'refunded') refunded += 1;
      if (!why) out.push(o);
    }
    return { orders: out.sort((a, b) => supplyMsOf(a) - supplyMsOf(b)), refunded };
  }

  /** GET /api/admin/gst/past-sales: the rows and the counts by status. */
  async function listPastSales() {
    const { orders, refunded } = await pastSales();
    const counts = {};
    const rows = orders.map((o) => {
      const b = backdateOf(o);
      const status = pastSaleStatus(o);
      counts[status] = (counts[status] || 0) + 1;
      const supplyMs = supplyMsOf(o);
      return {
        orderId: o.id,
        paidIst: formatIstDay(supplyMs),
        passType: o.passType || '',
        item: itemLabel(o.passType, o.packTarget) || o.passType || '',
        amountPaise: o.amountPaise,
        status,
        emailMasked: b.contact && b.contact.email ? maskEmail(b.contact.email) : '',
        emailSource: b.emailSource || '',
        invoiceNumber: o.gstInvoice ? o.gstInvoice.number : '',
      };
    });
    return { rows, counts, refundedExcluded: refunded };
  }

  /** The payer's address for a past sale: Razorpay's payment record, else the paying account's email. */
  async function contactFor(o) {
    let payment = null;
    let fetchFailed = false;
    if (typeof deps.fetchPayment === 'function') {
      try {
        const p = await deps.fetchPayment(o.paymentId);
        if (p && typeof p === 'object' && p.id === o.paymentId && (!p.order_id || p.order_id === o.id)) payment = p;
        else fetchFailed = true;
      } catch {
        fetchFailed = true;
      }
    } else {
      fetchFailed = true;
    }
    if (payment && (payment.status === 'refunded' || (Number(payment.amount_refunded) || 0) > 0)) return { refunded: true };
    // Without the payment record we cannot tell whether it was refunded: try again next time.
    if (fetchFailed) return { retry: true };
    const email = typeof payment.email === 'string' ? payment.email.trim() : '';
    const phone = typeof payment.contact === 'string' ? payment.contact.trim() : '';
    if (rails && rails.isAddress(email)) return { contact: { email, phone }, source: 'payment' };
    const uid = payerAccountUid(o);
    if (uid && typeof deps.getAccountEmail === 'function') {
      try {
        const acct = String((await deps.getAccountEmail(uid)) || '').trim();
        if (rails && rails.isAddress(acct)) return { contact: { email: acct, phone }, source: 'account' };
      } catch {
        /* no account address */
      }
    }
    return { contact: null };
  }

  /**
   * POST /api/admin/gst/past-sales/send-forms: prepare up to 50 orders that need details (address + refund check), queue
   * their forms, then run one drain (which sends what the window, the one-a-day rule and the daily cap allow).
   */
  async function sendForms() {
    const summary = { queued: 0, noAddress: 0, refunded: 0, retryLater: 0, remaining: 0 };
    if (!enabled()) return { skipped: 'off', ...summary };
    if (!secret()) return { skipped: 'no_link_secret', ...summary };
    if (!rails || !rails.canSend()) return { skipped: 'email_off', ...summary };
    const { orders } = await pastSales();
    const todo = orders.filter((o) => pastSaleStatus(o) === 'needs_details');
    summary.remaining = Math.max(0, todo.length - FORMS_PER_CLICK);
    for (const o of todo.slice(0, FORMS_PER_CLICK)) {
      const c = await contactFor(o);
      if (c.retry) {
        summary.retryLater += 1;
        continue;
      }
      const t = now();
      const status = c.refunded ? 'refunded' : c.contact ? 'form_queued' : 'no_address';
      const wrote = await adminFirestore.runTransaction(async (tx) => {
        const snap = await tx.get(orderRef(o.id));
        const cur = snap && snap.exists ? snap.data() || {} : null;
        if (!cur || cur.gstInvoice || pastSaleStatus({ ...cur, id: o.id }) !== 'needs_details') return false;
        tx.set(
          orderRef(o.id),
          { gstBackdate: { status, ...(c.contact ? { contact: c.contact, emailSource: c.source } : {}), queuedAtMs: t, attempts: 0, at: new Date(t) } },
          { merge: true },
        );
        return true;
      });
      if (!wrote) continue;
      if (status === 'form_queued') summary.queued += 1;
      else if (status === 'refunded') summary.refunded += 1;
      else summary.noAddress += 1;
    }
    const drained = await drain();
    return { ...summary, sent: drained.sent, waiting: drained.waiting };
  }

  /** One form or reminder for one order, under every rule. Never throws (the drain catches). */
  async function runOne(orderId) {
    const t = now();
    if (!rails.inWindow(t)) return { waiting: 'window' };
    const ref = orderRef(orderId);
    const claimed = await adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const o = snap && snap.exists ? snap.data() || {} : null;
      if (!o || o.gstInvoice || o.gstBuyer || backdateExclusion(o)) return { skipped: 'not_due' };
      const b = backdateOf(o);
      const attempts = Number.isInteger(b.attempts) && b.attempts > 0 ? b.attempts : 0;
      const staleSending = (b.status === 'form_sending' || b.status === 'reminder_sending') && !(t - (b.atMs || 0) < STALE_SENDING_MS);
      let kind = null;
      if (b.status === 'form_queued' || (staleSending && b.status === 'form_sending')) kind = 'form';
      else if ((b.status === 'form_sent' && !b.reminderSentAtMs && t - (b.formSentAtMs || t) >= REMINDER_AFTER_MS) || (staleSending && b.status === 'reminder_sending')) kind = 'reminder';
      if (!kind) return { skipped: 'not_due' };
      if (attempts >= MAX_ATTEMPTS) {
        tx.set(ref, { gstBackdate: { ...b, status: 'failed', at: new Date(t), atMs: t } }, { merge: true });
        return { skipped: 'failed' };
      }
      const to = b.contact && b.contact.email;
      if (!rails.isAddress(to)) {
        tx.set(ref, { gstBackdate: { ...b, status: 'no_address', at: new Date(t), atMs: t } }, { merge: true });
        return { skipped: 'no_address' };
      }
      const slot = await rails.slotTx(tx, o, to, t);
      if (!slot.ok) return { waiting: slot.reason };
      const back = kind === 'form' ? 'form_queued' : 'form_sent';
      tx.set(ref, { gstBackdate: { ...b, status: `${kind}_sending`, back, attempts: attempts + 1, at: new Date(t), atMs: t } }, { merge: true });
      slot.commit();
      return { o, b: { ...b, attempts: attempts + 1 }, to, kind, back };
    });
    if (!claimed.o) return claimed;
    const { o, b, to, kind, back } = claimed;
    const settle = async (fields) => {
      try {
        await ref.set({ gstBackdate: { ...b, ...fields, at: new Date(now()), atMs: now() } }, { merge: true });
      } catch {
        /* at most once: a lost settle is re-taken as a stale claim */
      }
    };
    const link = `${rails.appUrl}/invoice-details?t=${encodeURIComponent(detailsToken(orderId, t + DETAILS_TOKEN_TTL_MS, secret()))}`;
    const built = buildStateFormEmail({ item: itemLabel(o.passType, o.packTarget), amountPaise: o.amountPaise, supplyMs: supplyMsOf(o), link, reminder: kind === 'reminder' });
    if (!built) {
      await settle({ status: 'failed' });
      return { skipped: 'not_buildable' };
    }
    const sent = await rails.send({
      to,
      subject: built.subject,
      text: built.text,
      html: built.html,
      idempotencyKey: `gst-state-${kind}-${o.paymentId}`,
      category: 'gst_state_form',
    });
    if (sent.ok) {
      await settle(kind === 'form' ? { status: 'form_sent', formSentAtMs: t, attempts: 0 } : { status: 'reminder_sent', reminderSentAtMs: t, attempts: 0 });
      emit(`payments.gst_backdate.${kind}_sent`);
      return { sent: kind };
    }
    const status = !sent.retryable ? 'failed' : b.attempts < MAX_ATTEMPTS ? back : 'failed';
    await settle({ status });
    emit(`payments.gst_backdate.${kind}_failed`);
    return { failed: kind, status };
  }

  /** One drain pass: queued forms, due reminders, stale claims. Stops for the day at the daily cap. Never throws. */
  async function drain() {
    const summary = { sent: 0, waiting: 0, failed: 0 };
    try {
      if (!enabled() || !rails || !rails.canSend() || !secret() || !rails.inWindow(now())) return summary;
      const ids = new Set();
      for (const status of ['form_queued', 'form_sent', 'form_sending', 'reminder_sending']) {
        let q = adminFirestore.collection(PAY_ORDERS_COLLECTION).where('gstBackdate.status', '==', status);
        if (typeof q.limit === 'function') q = q.limit(200);
        const snap = await q.get();
        snap.forEach((d) => ids.add(d.id));
      }
      let tried = 0;
      for (const id of ids) {
        if (tried >= SEND_BATCH) break;
        let r;
        try {
          r = await runOne(id);
        } catch (e) {
          console.error('[gst-backdate] send failed:', e && e.message);
          r = { failed: true };
        }
        if (r.skipped === 'not_due') continue;
        tried += 1;
        if (r.sent) summary.sent += 1;
        else if (r.waiting) summary.waiting += 1;
        else if (r.failed) summary.failed += 1;
        if (r.waiting === 'daily_cap' || r.waiting === 'window') break;
      }
    } catch (e) {
      emit('payments.gst_backdate.error');
      console.error('[gst-backdate] drain failed:', e && e.message);
    }
    return summary;
  }

  function startRunner({ intervalMs = RUNNER_INTERVAL_MS } = {}) {
    if (!enabled() || !rails || !rails.canSend() || !secret()) return () => {};
    const timer = setInterval(() => void drain(), intervalMs);
    if (timer && typeof timer.unref === 'function') timer.unref();
    return () => clearInterval(timer);
  }

  /** The invoice download for the buyer: the signed (non-expiring) invoice link the receipt already uses. */
  function invoiceLink(orderId, inv) {
    const t = invoiceToken(orderId, secret());
    return t ? { number: inv.number, url: `/api/gst/invoice?t=${encodeURIComponent(t)}` } : { number: inv.number, url: '' };
  }

  /** The order a details token names, or `{ error }`. */
  async function orderForToken(token) {
    if (!enabled()) return { error: 'off' };
    const parsed = parseDetailsToken(token, secret(), now());
    if (parsed.error) return parsed;
    const snap = await orderRef(parsed.orderId).get();
    const o = snap && snap.exists ? snap.data() || {} : null;
    if (!o) return { error: 'invalid' };
    if (!o.gstInvoice && backdateExclusion(o)) return { error: 'invalid' };
    return { orderId: parsed.orderId, order: o };
  }

  /** GET /api/gst/invoice-details?t= : what the page shows. No state is ever suggested. */
  async function getDetails(token) {
    const r = await orderForToken(token);
    if (r.error) return r;
    const o = r.order;
    return {
      item: itemLabel(o.passType, o.packTarget) || '',
      amountPaise: o.amountPaise,
      paidOn: formatIstDay(supplyMsOf(o)),
      status: o.gstInvoice ? 'invoiced' : o.gstBuyer ? 'details_received' : 'needs_details',
      ...(o.gstInvoice ? { invoice: invoiceLink(r.orderId, o.gstInvoice) } : {}),
    };
  }

  /**
   * POST /api/gst/invoice-details { t, stateCode, pin, business? }: the buyer's answer. Validated (state from the 36, PIN
   * 6 digits, GSTIN checksum + state match) - this is not a payment, so a bad answer is REFUSED with the field, never
   * guessed. Stored on the order, then the invoice is issued and emailed. Idempotent: an invoiced order returns its invoice.
   */
  async function submitDetails(token, body) {
    const r = await orderForToken(token);
    if (r.error) return r;
    const parsed = gstBuyerFromBody(body);
    const buyer = parsed.fields.gstBuyer;
    if (!buyer) return { error: 'bad_input', field: 'state' };
    if (parsed.dropped.includes('pin') || parsed.dropped.includes('pin_missing') || !buyer.pin) return { error: 'bad_input', field: 'pin' };
    if (parsed.dropped.includes('business')) return { error: 'bad_input', field: 'business' };
    const t = now();
    const stored = await adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef(r.orderId));
      const o = snap && snap.exists ? snap.data() || {} : null;
      if (!o) return 'invalid';
      if (o.gstInvoice) return 'invoiced';
      if (backdateExclusion(o)) return 'invalid';
      const b = backdateOf(o);
      tx.set(orderRef(r.orderId), { gstBuyer: buyer, gstBackdate: { ...b, status: 'details_received', detailsAtMs: t, at: new Date(t), atMs: t } }, { merge: true });
      return 'stored';
    });
    if (stored === 'invalid') return { error: 'invalid' };
    let result = null;
    if (stored === 'stored') {
      result = await invoicer.issueBackdated({ orderId: r.orderId });
      if (result && result.issued && mailer && typeof mailer.queueInvoiceEmail === 'function') {
        try {
          await mailer.queueInvoiceEmail({ orderId: r.orderId });
        } catch {
          /* the invoice stands; the page links it */
        }
      }
    }
    const after = await orderRef(r.orderId).get();
    const o = after && after.exists ? after.data() || {} : {};
    if (o.gstInvoice) return { ok: true, status: 'invoiced', invoice: invoiceLink(r.orderId, o.gstInvoice) };
    // Saved, not yet issued (e.g. the seller config is incomplete): the admin issues it with "Issue now"; it is emailed.
    emit('payments.gst_backdate.details_saved_not_issued');
    return { ok: true, status: 'details_received', ...(result && result.held ? { held: result.held } : {}) };
  }

  return { listPastSales, sendForms, drain, startRunner, getDetails, submitDetails };
}

module.exports = {
  createGstBackdate,
  detailsToken,
  parseDetailsToken,
  pastSaleStatus,
  buildStateFormEmail,
  DETAILS_TOKEN_TTL_MS,
  REMINDER_AFTER_MS,
  FORMS_PER_CLICK,
  SEND_BATCH,
};
