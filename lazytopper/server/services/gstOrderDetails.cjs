'use strict';
/**
 * gstOrderDetails.cjs - GST-AFTER-PAY-1 (owner 13 Nov 2026): the buyer's state + PIN, given AFTER paying.
 *
 * Buy goes straight to Razorpay (no state box first). On the paid screen the buyer may then give their state + PIN (and, for a
 * school or coaching centre, a GSTIN). `submit` stores it on the PAID order and issues the invoice through the SAME transaction
 * as a capture-time invoice (`invoicer.issueNow`: same gapless series, idempotent per payment), then queues the invoice email
 * like the past-sale form does (gstBackdate.submitDetails).
 *
 * ★ The route decides WHO may call (guest: Razorpay's signature for this payment; signed-in: the account that paid). It passes
 *   that rule in as `authorize(order)`, run INSIDE the transaction on the order that is then written.
 * ★ Written only while the order has NO invoice yet and is PAID for a payment id: an issued invoice is never changed.
 * ★ It never touches the grant, the attach choice or ownership: only `gstBuyer` is written.
 * ★ Nothing given = the order stays HELD (no_state), as before; the admin's "Issue now" still works.
 */
const { PAY_ORDERS_COLLECTION, PAID_STATES, gstBuyerFromBody } = require('./gstInvoice.cjs');

const ID_PATTERN = /^[A-Za-z0-9_]{1,64}$/;

function createGstOrderDetails({ adminFirestore, invoicer, mailer } = {}) {
  /**
   * Resolves `{ ok: true, status: 'invoiced' | 'details_saved', invoice?: number-string, held? }` or `{ error }` where error is
   * 'bad_input' (with `field`), 'unknown_order', 'forbidden', 'unpaid', 'unavailable'. Never throws.
   */
  async function submit({ orderId, raw, authorize }) {
    if (!adminFirestore || typeof adminFirestore.runTransaction !== 'function') return { error: 'unavailable' };
    if (typeof orderId !== 'string' || !ID_PATTERN.test(orderId)) return { error: 'unknown_order' };
    const parsed = gstBuyerFromBody(raw);
    const buyer = parsed.fields.gstBuyer;
    if (!buyer) return { error: 'bad_input', field: 'state' };
    if (!buyer.pin) return { error: 'bad_input', field: 'pin' };
    if (parsed.dropped.includes('business')) return { error: 'bad_input', field: 'business' };
    const ref = adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId);
    try {
      const stored = await adminFirestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const order = snap && snap.exists ? snap.data() || {} : null;
        if (!order) return 'unknown_order';
        if (typeof authorize === 'function' && !authorize(order)) return 'forbidden';
        if (order.gstInvoice) return 'invoiced';
        if (!PAID_STATES.includes(order.status) || typeof order.paymentId !== 'string' || !order.paymentId) return 'unpaid';
        tx.set(ref, { gstBuyer: buyer }, { merge: true });
        return 'stored';
      });
      if (stored === 'unknown_order' || stored === 'forbidden' || stored === 'unpaid') return { error: stored };
      let result = null;
      if (stored === 'stored' && invoicer && typeof invoicer.issueNow === 'function') {
        result = await invoicer.issueNow({ orderId });
        if (result && result.issued && mailer && typeof mailer.queueInvoiceEmail === 'function') {
          try {
            await mailer.queueInvoiceEmail({ orderId });
          } catch {
            /* the invoice stands; the receipt's link and My invoices show it */
          }
        }
      }
      const after = await ref.get();
      const o = after && after.exists ? after.data() || {} : {};
      if (o.gstInvoice) return { ok: true, status: 'invoiced' };
      return { ok: true, status: 'details_saved', ...(result && result.held ? { held: result.held } : {}) };
    } catch (e) {
      console.error('[gst-order-details] failed:', e && e.message);
      return { error: 'unavailable' };
    }
  }
  return { submit };
}

module.exports = { createGstOrderDetails };
