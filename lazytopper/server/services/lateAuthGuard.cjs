'use strict';

/**
 * LATE-AUTH-GUARD-1 v1.1 (22 Nov 2026) - never capture a late-authorised payment ourselves.
 *
 * ★ WHY. Orders are created WITHOUT `payment_capture`, so the Razorpay account setting applies: a payment authorised within
 *   12 minutes of the PAYMENT's creation is captured automatically by Razorpay; one authorised later is refunded instantly
 *   (razorpay.com/docs/payments/payments/capture-settings: the timer starts when the payment is created). That protects a
 *   buyer whose bank approved late (e.g. a UPI approval 15 minutes on, after they already paid again) - UNLESS our own manual
 *   capture (signed-in verify / status, guest verify / order-status, parent verify) captures it first. Owner rule: no refunds
 *   ever, and a double charge must be impossible.
 *
 * ★ THE ONE RULE (payment age only). A payment Razorpay reports `authorized` is NOT captured by us when it is older than the
 *   window: now - payment.created_at > LATE_AUTH_WINDOW_MS. Such a payment was authorised after Razorpay's own window (inside
 *   it Razorpay would already have captured it), so Razorpay will refund it. Inside the window our capture is harmless -
 *   Razorpay would capture it anyway - and is exactly the behaviour before this guard. The ORDER's age plays no part: a fresh
 *   payment on an old (reused) order is captured as before.
 *   A payment whose `created_at` cannot be read decides nothing (captured as before).
 *   A payment Razorpay already CAPTURED never reaches here and is honoured exactly as before.
 *
 * ★ A REFUSAL IS "PENDING", NEVER "FAILED": the bank may still be finishing; Razorpay's own refund (payment `refunded`) is what
 *   ends it. The routes answer their existing pending shapes.
 *
 * ★ OBSERVED ONLY. `order_window` (the payment began more than 12 min after our stored order time) is returned as an
 *   observation for telemetry; it never changes the decision or any response.
 *
 * Kill switch: LATE_AUTH_GUARD_DISABLED=1 -> no decision, no observation: exactly the behaviour before this guard.
 */

/**
 * Razorpay's account window is 12 minutes; we refuse from 11, one minute of margin for clock skew between our server and
 * Razorpay (refusing inside the window is harmless - Razorpay captures it itself and the webhook grants it).
 */
const RAZORPAY_AUTO_CAPTURE_MS = 12 * 60 * 1000;
const LATE_AUTH_WINDOW_MS = 11 * 60 * 1000;

const LATE_AUTHORISATION = 'late_authorisation';
/** The reason the routes put in their pending answers for a refused capture. */
const AWAITING_BANK = 'awaiting_bank';

/** Same truthy grammar as every other server switch. */
function isLateAuthGuardDisabled(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.LATE_AUTH_GUARD_DISABLED) || '').trim());
}

/** A stored time (Date, Firestore Timestamp, epoch ms, ISO string) as epoch ms; null when it is none of those. */
function storedTimeMs(v) {
  let t = NaN;
  if (v instanceof Date) t = v.getTime();
  else if (typeof v === 'number') t = v;
  else if (typeof v === 'string' && v.trim()) t = Date.parse(v);
  else if (v && typeof v.toMillis === 'function') t = v.toMillis();
  else if (v && typeof v.toDate === 'function') t = v.toDate().getTime();
  else if (v && typeof v === 'object' && (typeof v.seconds === 'number' || typeof v._seconds === 'number')) {
    t = (typeof v.seconds === 'number' ? v.seconds : v._seconds) * 1000;
  }
  return Number.isFinite(t) && t > 0 ? t : null;
}

/** Razorpay's `created_at` (unix SECONDS) as epoch ms; null when absent or malformed. */
function razorpaySecondsMs(v) {
  const n = typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v.trim()) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n * 1000 : null;
}

/** Ids for a log line: the 8 characters after Razorpay's `pay_` / `order_` prefix. No PII. */
function id8(id) {
  return String(id || '').replace(/^[a-z]+_/, '').slice(0, 8) || '-';
}

/**
 * Decide, BEFORE a manual capture of an `authorized` payment, whether we may capture it. Pure (no reads). Never throws.
 * -> { capture: true, observed: string[] } | { capture: false, error: 'late_authorisation', observed: string[] }
 */
function decideManualCapture({ env, payment, paymentId, orderId, storedOrderCreatedAt, nowMs, log = console }) {
  if (isLateAuthGuardDisabled(env)) return { capture: true, observed: [] };
  const paymentCreatedMs = razorpaySecondsMs(payment && payment.created_at);
  const observed = [];
  const orderCreatedMs = storedTimeMs(storedOrderCreatedAt);
  if (paymentCreatedMs !== null && orderCreatedMs !== null && paymentCreatedMs - orderCreatedMs > RAZORPAY_AUTO_CAPTURE_MS) observed.push('order_window');
  if (paymentCreatedMs !== null && Number.isFinite(nowMs) && nowMs - paymentCreatedMs > LATE_AUTH_WINDOW_MS) {
    try {
      log.warn(`[pay] left late authorisation uncaptured pay=${id8(paymentId)} order=${id8(orderId)}`);
    } catch {
      /* a log line must never fail a payment */
    }
    return { capture: false, error: LATE_AUTHORISATION, observed };
  }
  return { capture: true, observed };
}

module.exports = {
  RAZORPAY_AUTO_CAPTURE_MS,
  LATE_AUTH_WINDOW_MS,
  LATE_AUTHORISATION,
  AWAITING_BANK,
  isLateAuthGuardDisabled,
  storedTimeMs,
  razorpaySecondsMs,
  id8,
  decideManualCapture,
};
