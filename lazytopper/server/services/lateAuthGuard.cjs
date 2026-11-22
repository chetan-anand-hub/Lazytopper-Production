'use strict';

/**
 * LATE-AUTH-GUARD-1 (22 Nov 2026) - never capture a late-authorised payment ourselves.
 *
 * ★ WHY. Orders are created WITHOUT `payment_capture`, so the Razorpay account setting applies: a payment authorised within
 *   12 minutes is captured automatically; one authorised later is refunded instantly. That protects a buyer whose bank
 *   approved late (e.g. a UPI approval 15 minutes on, after they already paid again on a new order) - UNLESS our own manual
 *   capture (verify, /api/pay/status, /api/pay/guest/order-status, the parent verify) captures it first. Owner rule: no
 *   refunds ever, and a double charge must be impossible.
 *
 * ★ WHAT IT DECIDES. Only whether OUR server may POST /payments/{id}/capture for a payment Razorpay reports `authorized`.
 *   A payment Razorpay already CAPTURED never reaches here and is honoured exactly as before. Refusing never takes money:
 *   inside Razorpay's window Razorpay captures it itself (and the existing webhook grants it); outside, Razorpay refunds it.
 *
 *   The capture is refused when EITHER
 *   (a) LATE: the authorisation is outside Razorpay's auto-capture window. Two readings, either one refuses:
 *       - `order_window`: the payment's `created_at` is more than 11 minutes after the ORDER's creation (our stored order
 *         time, else Razorpay's order `created_at`) - the spec's rule;
 *       - `payment_age`: the payment is still merely authorised more than 11 minutes after its OWN `created_at`. Razorpay
 *         times its window from the PAYMENT's creation (razorpay.com/docs/payments/payments/capture-settings), so an
 *         authorised payment seen this late was authorised after the window, and Razorpay will refund it.
 *       A time that cannot be read decides nothing (the guard does not fire on it).
 *   (b) ALREADY OWNED: the same buyer / recipient already has a paid order or the entitlement for the same product, from a
 *       different order or payment. The route supplies that check (it reuses its own already-owned / already-covered reads).
 *       A read that fails refuses too (never capture blind) but as a TRANSIENT error, so no "refund" copy is shown for it.
 *
 * Kill switch: LATE_AUTH_GUARD_DISABLED=1 -> no read, no decision: exactly the behaviour before this guard.
 */

/** Razorpay's account window is 12 minutes; one minute of margin for clock skew between us and Razorpay. */
const LATE_AUTH_WINDOW_MS = 11 * 60 * 1000;

const LATE_AUTHORISATION = 'late_authorisation';
const ALREADY_OWNED_UNCAPTURED = 'already_owned_uncaptured';
const OWNERSHIP_READ_FAILED = 'ownership_read_failed';

/** The two refusals that mean "left uncaptured on purpose - the bank refunds it". */
const UNCAPTURED_REASONS = Object.freeze([LATE_AUTHORISATION, ALREADY_OWNED_UNCAPTURED]);

/** Same truthy grammar as every other server switch. */
function isLateAuthGuardDisabled(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.LATE_AUTH_GUARD_DISABLED) || '').trim());
}

function isUncapturedReason(reason) {
  return UNCAPTURED_REASONS.includes(reason);
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

/** Rule (a), pure: 'order_window' | 'payment_age' | null. Every input is epoch ms or null. */
function lateBasis({ paymentCreatedMs, orderCreatedMs, nowMs }) {
  if (paymentCreatedMs === null || paymentCreatedMs === undefined) return null;
  if (orderCreatedMs !== null && orderCreatedMs !== undefined && paymentCreatedMs - orderCreatedMs > LATE_AUTH_WINDOW_MS) return 'order_window';
  if (Number.isFinite(nowMs) && nowMs - paymentCreatedMs > LATE_AUTH_WINDOW_MS) return 'payment_age';
  return null;
}

/** Ids for a log line: the 8 characters after Razorpay's `pay_` / `order_` prefix. No PII. */
function id8(id) {
  return String(id || '').replace(/^[a-z]+_/, '').slice(0, 8) || '-';
}

/**
 * Decide, BEFORE a manual capture of an `authorized` payment, whether we may capture it.
 *   payment                     - Razorpay's payment entity (its `created_at` is read)
 *   paymentId, orderId          - for the log line only
 *   storedOrderCreatedAt        - our stored order's `createdAt`
 *   nowMs                       - the route's clock
 *   readRazorpayOrderCreatedMs  - async (orderId) -> epoch ms | null; asked ONLY when the stored time is unreadable
 *   isAlreadyOwned              - async () -> boolean; THROWS when the read fails
 * -> { capture: true } | { capture: false, error, basis? }. Never throws.
 */
async function guardManualCapture({ env, payment, paymentId, orderId, storedOrderCreatedAt, nowMs, readRazorpayOrderCreatedMs, isAlreadyOwned, log = console }) {
  if (isLateAuthGuardDisabled(env)) return { capture: true };

  // (a) late authorisation - the pure checks first (no read unless the order time must come from Razorpay).
  const paymentCreatedMs = razorpaySecondsMs(payment && payment.created_at);
  let orderCreatedMs = storedTimeMs(storedOrderCreatedAt);
  if (orderCreatedMs === null && paymentCreatedMs !== null && typeof readRazorpayOrderCreatedMs === 'function' && orderId) {
    try {
      orderCreatedMs = await readRazorpayOrderCreatedMs(orderId);
    } catch {
      orderCreatedMs = null; // unreadable: rule (a)'s order reading decides nothing
    }
  }
  const basis = lateBasis({ paymentCreatedMs, orderCreatedMs, nowMs });
  if (basis) {
    leftUncaptured(log, paymentId, orderId, LATE_AUTHORISATION);
    return { capture: false, error: LATE_AUTHORISATION, basis };
  }

  // (b) the same buyer already owns / already paid for the same product.
  if (typeof isAlreadyOwned === 'function') {
    let owned;
    try {
      owned = await isAlreadyOwned();
    } catch (e) {
      try {
        log.warn(`[pay] ownership read failed before capture, left uncaptured pay=${id8(paymentId)} order=${id8(orderId)}: ${e && e.message}`);
      } catch {
        /* a log line must never fail a payment */
      }
      return { capture: false, error: OWNERSHIP_READ_FAILED };
    }
    if (owned === true) {
      leftUncaptured(log, paymentId, orderId, ALREADY_OWNED_UNCAPTURED);
      return { capture: false, error: ALREADY_OWNED_UNCAPTURED };
    }
  }
  return { capture: true };
}

function leftUncaptured(log, paymentId, orderId, reason) {
  try {
    log.warn(`[pay] left late authorisation uncaptured pay=${id8(paymentId)} order=${id8(orderId)} reason=${reason}`);
  } catch {
    /* a log line must never fail a payment */
  }
}

module.exports = {
  LATE_AUTH_WINDOW_MS,
  LATE_AUTHORISATION,
  ALREADY_OWNED_UNCAPTURED,
  OWNERSHIP_READ_FAILED,
  isLateAuthGuardDisabled,
  isUncapturedReason,
  storedTimeMs,
  razorpaySecondsMs,
  lateBasis,
  id8,
  guardManualCapture,
};
