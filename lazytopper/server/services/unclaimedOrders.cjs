'use strict';
/**
 * UNCLAIMED-ALERT-1 - two additive safety nets for money that is paid but on NO account. Nothing here grants anything itself.
 *
 *  (a) HOLD-END SWEEP. A self-pay "pay first, choose later" order is held 10 minutes for its payer's choice (SELFPAY-ATTACH-1).
 *      The hold's intended fallback - deliver to the contact it was paid with - only ever ran when somebody signed in, so a payer
 *      who never came back (or reloaded after the hold) waited. This sweep calls the SAME post-payment step the attach choice and
 *      the payment webhook call (`deliver` = guestPay routes' afterRecipientPaid): an existing account by phone / email, else the
 *      existing auto-account creation, through the same take + grant. No second grant path lives here. That step re-checks the hold
 *      and acts only on a paid_unclaimed order, so a repeat (a restart, two instances, a late payer's own choice) is a no-op.
 *      Kill switch: UNCLAIMED_SWEEP_DISABLED=1.
 *  (b) OWNER ALERT. A paid guest order still on no account 15 minutes after payment sends ONE email to the owner. The recipient is
 *      read from env (UNCLAIMED_ALERT_TO, else OPS_REPORT_TO) - nothing is hard-coded. At most one per order: the order records
 *      the alert in a transaction BEFORE the send, and the send carries a per-order idempotency key. Masked contacts only.
 *      Kill switch: UNCLAIMED_ALERT_DISABLED=1.
 *
 * Restart-safe: every decision is read from the stored orders; nothing lives in memory except the timer.
 */

// ONE hold length, shared with the hold itself so the two cannot drift.
const { ATTACH_HOLD_MS: HOLD_MS } = require('../routes/guestPay.cjs');

const PAY_ORDERS_COLLECTION = 'payOrders';
/** An order is "overdue" (alert + admin badge) this long after payment. */
const ALERT_AFTER_MS = 15 * 60 * 1000;
/** An older order is never mass-mailed on boot: only orders paid inside this window are alerted. */
const ALERT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_ALERTS_PER_RUN = 10;
const MAX_ALERT_ATTEMPTS = 3;
/** A `sending` claim older than this is treated as a crashed send and retried (the idempotency key stops a duplicate). */
const ALERT_SENDING_STALE_MS = 30 * 60 * 1000;
const MAX_SWEEP_ATTEMPTS = 5;
const MAX_DELIVERIES_PER_RUN = 25;
const READ_CAP = 200;
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const MIN_INTERVAL_MS = 60 * 1000;
const BOOT_DELAY_MS = 30 * 1000;

const truthy = (v) => /^(1|true|on|yes)$/i.test(String(v || '').trim());
function isSweepDisabled(env = process.env) {
  return truthy(env && env.UNCLAIMED_SWEEP_DISABLED);
}
function isAlertDisabled(env = process.env) {
  return truthy(env && env.UNCLAIMED_ALERT_DISABLED);
}

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
/** The owner address: UNCLAIMED_ALERT_TO, else OPS_REPORT_TO. One address only; '' when none / invalid. */
function alertRecipient(env = process.env) {
  const e = env || {};
  for (const k of ['UNCLAIMED_ALERT_TO', 'OPS_REPORT_TO']) {
    const v = typeof e[k] === 'string' ? e[k].trim() : '';
    if (v && EMAIL_RE.test(v)) return v;
  }
  return '';
}

function timeMs(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  if (v && typeof v.toDate === 'function') return v.toDate().getTime();
  return NaN;
}

/** The hold end of an attach order (stored `attachHoldUntil`, else paid + 10 min); NaN when there is none. Same rule as guestPay. */
function holdEndsMs(o) {
  const stored = timeMs(o.attachHoldUntil);
  if (Number.isFinite(stored)) return stored;
  const paid = timeMs(o.guestPaidAt);
  return Number.isFinite(paid) ? paid + HOLD_MS : NaN;
}

/** Real snapshots have `docs` and `forEach`; either works. */
const eachDoc = (snap, fn) => (snap && Array.isArray(snap.docs) ? snap.docs.forEach(fn) : snap.forEach(fn));

const noUid = (o) => o.uid === null || o.uid === undefined || o.uid === '';

function buildAlertEmail({ orderId, order, ageMin, maskPhone, maskMail }) {
  const item = [order.passType, order.packTarget].filter((x) => typeof x === 'string' && x).join(' / ') || 'a purchase';
  const amount = Number.isFinite(order.amountPaise) ? `Rs ${order.amountPaise / 100}` : 'an amount not recorded';
  const contact = [maskPhone(order.guestPhone), maskMail(order.guestEmail)].filter(Boolean).join(' / ') || 'no contact recorded';
  const lines = [
    `A paid order is on no account ${ageMin} minutes after payment.`,
    `Order: ${orderId}`,
    `Item: ${item} (${amount})`,
    `Paid with: ${contact}`,
    order.attachFlow === true ? 'It was a pay-first order (the buyer chose who it is for later).' : 'It was a signed-out checkout order.',
    'Open Admin > Students > Purchases, section "not yet claimed", to see it. The student gets it automatically on signing in with that contact.',
  ];
  return { subject: `LazyTopper: paid order on no account (${orderId})`, text: lines.join('\n') };
}

function createUnclaimedSweeper(deps = {}) {
  const { db, deliver, send, canSend, maskPhone = () => '', maskMail = () => '', env = process.env, telemetry } = deps;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const log = typeof deps.log === 'function' ? deps.log : () => {};
  let running = false;

  const emit = (event) => {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter never matters */
    }
  };
  const orders = () => db.collection(PAY_ORDERS_COLLECTION);

  /** Record one more delivery attempt in a transaction. False = not this run's to attempt any more. */
  async function claimSweepAttempt(orderId) {
    return db.runTransaction(async (tx) => {
      const ref = orders().doc(orderId);
      const snap = await tx.get(ref);
      const o = snap && snap.exists ? snap.data() || {} : null;
      if (!o || o.status !== 'paid_unclaimed' || !noUid(o) || o.attachedAt) return false;
      const n = Number.isInteger(o.holdSweepAttempts) ? o.holdSweepAttempts : 0;
      if (n >= MAX_SWEEP_ATTEMPTS) return false;
      tx.set(ref, { holdSweepAttempts: n + 1, holdSweptAt: new Date(now()) }, { merge: true });
      return true;
    });
  }

  /** (a) Deliver self-pay attach orders whose hold has ended. Returns the number handed to the delivery step. */
  async function sweepHeldOrders() {
    if (isSweepDisabled(env) || !db || typeof deliver !== 'function') return 0;
    let handed = 0;
    try {
      let q = orders().where('status', '==', 'paid_unclaimed');
      if (typeof q.where === 'function') q = q.where('attachFlow', '==', true);
      if (typeof q.limit === 'function') q = q.limit(READ_CAP);
      const snap = await q.get();
      const due = [];
      eachDoc(snap, (d) => {
        const o = d.data() || {};
        if (o.attachFlow !== true || o.selfPay !== true || o.checkoutWho !== true || o.attachedAt || !noUid(o)) return;
        if (typeof o.paymentId !== 'string' || !o.paymentId) return;
        if ((Number.isInteger(o.holdSweepAttempts) ? o.holdSweepAttempts : 0) >= MAX_SWEEP_ATTEMPTS) return;
        const ends = holdEndsMs(o);
        if (Number.isFinite(ends) && now() >= ends) due.push({ orderId: d.id, paymentId: o.paymentId, ends });
      });
      due.sort((a, b) => a.ends - b.ends);
      for (const { orderId, paymentId } of due.slice(0, MAX_DELIVERIES_PER_RUN)) {
        try {
          if (!(await claimSweepAttempt(orderId))) continue;
          handed += 1;
          emit('payments.unclaimed.sweep.delivered');
          await deliver({ orderId, paymentId });
        } catch (e) {
          emit('payments.unclaimed.sweep.failed');
          log(`[unclaimed-sweep] one order failed: ${e && e.message}`);
        }
      }
    } catch (e) {
      emit('payments.unclaimed.sweep.read_failed');
      log(`[unclaimed-sweep] read failed: ${e && e.message}`);
    }
    return handed;
  }

  /** Claim the alert for one order in a transaction BEFORE sending. Returns { order, attempts } or null. */
  async function claimAlert(orderId) {
    return db.runTransaction(async (tx) => {
      const ref = orders().doc(orderId);
      const snap = await tx.get(ref);
      const o = snap && snap.exists ? snap.data() || {} : null;
      if (!o || o.payer !== 'guest' || o.status !== 'paid_unclaimed' || !noUid(o)) return null;
      const a = o.unclaimedAlert && typeof o.unclaimedAlert === 'object' ? o.unclaimedAlert : null;
      const attempts = a && Number.isInteger(a.attempts) ? a.attempts : 0;
      if (a) {
        if (a.status === 'sent' || attempts >= MAX_ALERT_ATTEMPTS) return null;
        if (a.status === 'sending' && now() - timeMs(a.at) < ALERT_SENDING_STALE_MS) return null;
      }
      tx.set(ref, { unclaimedAlert: { status: 'sending', attempts: attempts + 1, at: new Date(now()) } }, { merge: true });
      return { order: o, attempts: attempts + 1 };
    });
  }

  async function settleAlert(orderId, status, attempts) {
    try {
      await orders().doc(orderId).set({ unclaimedAlert: { status, attempts, at: new Date(now()) } }, { merge: true });
    } catch (e) {
      log(`[unclaimed-alert] could not record the outcome: ${e && e.message}`);
    }
  }

  /** (b) One email per paid guest order on no account 15 minutes after payment. Returns the number sent. */
  async function alertOverdueOrders() {
    if (isAlertDisabled(env) || !db || typeof send !== 'function') return 0;
    const to = alertRecipient(env);
    if (!to || (typeof canSend === 'function' && !canSend())) return 0;
    let sent = 0;
    try {
      const snap = await orders().where('status', '==', 'paid_unclaimed').limit(READ_CAP).get();
      const due = [];
      eachDoc(snap, (d) => {
        const o = d.data() || {};
        if (o.payer !== 'guest' || !noUid(o) || typeof o.paymentId !== 'string' || !o.paymentId) return;
        const paid = timeMs(o.guestPaidAt);
        if (!Number.isFinite(paid)) return;
        const age = now() - paid;
        if (age < ALERT_AFTER_MS || age > ALERT_MAX_AGE_MS) return;
        const a = o.unclaimedAlert;
        if (a && (a.status === 'sent' || (Number.isInteger(a.attempts) && a.attempts >= MAX_ALERT_ATTEMPTS))) return;
        due.push({ orderId: d.id, paid });
      });
      due.sort((x, y) => x.paid - y.paid);
      for (const { orderId } of due.slice(0, MAX_ALERTS_PER_RUN)) {
        let claim = null;
        try {
          claim = await claimAlert(orderId);
          if (!claim) continue;
          const paid = timeMs(claim.order.guestPaidAt);
          const mail = buildAlertEmail({ orderId, order: claim.order, ageMin: Math.max(0, Math.floor((now() - paid) / 60000)), maskPhone, maskMail });
          const r = await send({ to, subject: mail.subject, text: mail.text, html: `<pre>${mail.text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}</pre>`, idempotencyKey: `unclaimed-alert-${orderId}`, category: 'unclaimed_alert' });
          if (r && r.ok) {
            sent += 1;
            emit('payments.unclaimed.alert.sent');
            await settleAlert(orderId, 'sent', claim.attempts);
          } else {
            emit('payments.unclaimed.alert.failed');
            await settleAlert(orderId, 'failed', claim.attempts);
          }
        } catch (e) {
          emit('payments.unclaimed.alert.failed');
          log(`[unclaimed-alert] one order failed: ${e && e.message}`);
          if (claim) await settleAlert(orderId, 'failed', claim.attempts);
        }
      }
    } catch (e) {
      emit('payments.unclaimed.alert.read_failed');
      log(`[unclaimed-alert] read failed: ${e && e.message}`);
    }
    return sent;
  }

  /** One pass: deliver first, THEN alert (an order the sweep just attached is no longer unclaimed). Never overlaps itself. */
  async function tick() {
    if (running) return { skipped: true };
    running = true;
    try {
      const delivered = await sweepHeldOrders();
      const alerted = await alertOverdueOrders();
      return { delivered, alerted };
    } finally {
      running = false;
    }
  }

  /** On boot (after a short delay) and then on an interval. Returns stop(). Arms nothing when both switches are off. */
  function start({ intervalMs } = {}) {
    if (isSweepDisabled(env) && isAlertDisabled(env)) {
      log('[unclaimed] OFF (UNCLAIMED_SWEEP_DISABLED and UNCLAIMED_ALERT_DISABLED set) - nothing scheduled.');
      return () => {};
    }
    const configured = Number(env && env.UNCLAIMED_SWEEP_INTERVAL_MS);
    const every = Math.max(MIN_INTERVAL_MS, Number.isFinite(intervalMs) ? intervalMs : Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_INTERVAL_MS);
    const run = () => void tick().catch(() => null);
    const boot = setTimeout(run, BOOT_DELAY_MS);
    const timer = setInterval(run, every);
    for (const t of [boot, timer]) if (t && typeof t.unref === 'function') t.unref();
    log(`[unclaimed] ON - hold-end sweep ${isSweepDisabled(env) ? 'OFF' : 'on'}, owner alert ${isAlertDisabled(env) ? 'OFF' : alertRecipient(env) ? 'on' : 'no recipient (set UNCLAIMED_ALERT_TO or OPS_REPORT_TO)'}.`);
    return () => {
      clearTimeout(boot);
      clearInterval(timer);
    };
  }

  return { sweepHeldOrders, alertOverdueOrders, tick, start };
}

module.exports = {
  createUnclaimedSweeper,
  isSweepDisabled,
  isAlertDisabled,
  alertRecipient,
  buildAlertEmail,
  ALERT_AFTER_MS,
  ALERT_MAX_AGE_MS,
  MAX_SWEEP_ATTEMPTS,
  MAX_ALERT_ATTEMPTS,
};
