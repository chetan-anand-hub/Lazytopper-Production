'use strict';
/**
 * gstInvoice routes — GST-INVOICE-1.
 *
 *   GET /api/gst/checkout-context            optional auth  { ipStateCode, remembered }   (behind PAYMENTS_ENABLED)
 *   GET /api/gst/invoices                    AUTH           the caller's own invoices      (behind GST_INVOICE_ENABLED)
 *   GET /api/gst/invoice?orderId=…           AUTH           the PDF, only for the buyer's uid
 *   GET /api/gst/invoice?t=…                 SIGNED TOKEN   the PDF, for a guest purchase (the receipt email's link)
 *   GET /api/admin/gst/status?from=&to=      ADMIN          seller-config warning, counters, held orders
 *   GET /api/admin/gst/export?section=&from=&to=   ADMIN    GSTR-1 CSV (invoices | b2cs | b2b | hsn | held)
 *
 * ★ READ-ONLY. Nothing here issues, numbers or changes an invoice: issuing happens only after a server-verified capture
 *   (services/gstInvoice.cjs). A downloaded PDF is rendered from the invoice record STORED on the order.
 * ★ The IP region (`x-vercel-ip-country` + `x-vercel-ip-country-region`) is only a PRE-FILL HINT for the state select;
 *   the buyer always confirms. A header a client forged can only pre-select a state the buyer then sees.
 * ★ Admin routes sit behind the SAME ADMIN_FIREBASE_UIDS gate as the Students page (requireAdmin), and answer no-store.
 */

const {
  PAY_ORDERS_COLLECTION,
  GST_INVOICE_COUNTERS_COLLECTION,
  resolveInvoiceConfig,
  stateCodeFromIpRegion,
  isGstStateCode,
  heldReasonFor,
  orderIdFromToken,
  toMs,
  istDateLabel,
  PAID_STATES,
} = require('../services/gstInvoice.cjs');
const { SECTIONS, heldCsv } = require('../services/gstInvoiceExport.cjs');
const { IST_OFFSET_MS } = require('../services/passPricing.cjs');

const GST_CHECKOUT_CONTEXT_PATH = '/api/gst/checkout-context';
const GST_INVOICES_PATH = '/api/gst/invoices';
const GST_INVOICE_PDF_PATH = '/api/gst/invoice';
const GST_ADMIN_STATUS_PATH = '/api/admin/gst/status';
const GST_ADMIN_EXPORT_PATH = '/api/admin/gst/export';

const NOT_FOUND_BODY = Object.freeze({ error: 'Not Found' });
const ID_PATTERN = /^[A-Za-z0-9_]{1,64}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 400;
const PDF_PER_MINUTE = 20;

function isOn(v) {
  return /^(1|true|on|yes)$/i.test(String(v || '').trim());
}

/** "2026-11-07" -> the first ms of that IST day, or NaN. */
function istDayStart(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - IST_OFFSET_MS;
}

/** PURE. `{ fromMs, toMs }` (to = end of the `to` IST day, exclusive) or null. */
function parseRange(query) {
  const fromMs = istDayStart(query.get('from'));
  const toStart = istDayStart(query.get('to'));
  if (!Number.isFinite(fromMs) || !Number.isFinite(toStart) || toStart < fromMs) return null;
  const toMsExcl = toStart + DAY_MS;
  if (toMsExcl - fromMs > MAX_RANGE_DAYS * DAY_MS) return null;
  return { fromMs, toMs: toMsExcl };
}

/** PURE. The latest state a signed-in buyer confirmed, from their own orders. */
function rememberedFrom(orders) {
  let best = null;
  let bestMs = -Infinity;
  for (const o of orders) {
    if (!o || !o.gstBuyer || !isGstStateCode(o.gstBuyer.stateCode)) continue;
    const ms = toMs(o.createdAt);
    if (Number.isFinite(ms) && ms > bestMs) {
      bestMs = ms;
      best = o.gstBuyer;
    }
  }
  if (!best) return null;
  return {
    stateCode: best.stateCode,
    ...(best.pin ? { pin: best.pin } : {}),
    ...(best.business ? { business: { gstin: best.business.gstin, legalName: best.business.legalName, address: best.business.address } } : {}),
  };
}

function createGstInvoiceRoutes(deps = {}) {
  const { sendJson, sendJsonWithHeaders, verifiedCaller, adminFirestore, requireAdmin, env = process.env, now = () => Date.now() } = deps;
  const renderPdf = deps.renderPdf || ((inv) => require('../services/gstInvoicePdf.cjs').renderInvoicePdf(inv));
  const pdfHits = new Map();

  const paymentsOn = () => isOn(env.PAYMENTS_ENABLED);
  const invoicingOn = () => isOn(env.GST_INVOICE_ENABLED);
  const tokenSecret = () => String(env.RAZORPAY_KEY_SECRET || '').trim();

  async function uidOf(req) {
    try {
      return verifiedCaller && typeof verifiedCaller.resolveVerifiedUid === 'function' ? await verifiedCaller.resolveVerifiedUid(req) : null;
    } catch {
      return null;
    }
  }

  async function ordersOf(uid) {
    const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).where('uid', '==', uid).get();
    const out = [];
    snap.forEach((d) => out.push({ id: d.id, ...(d.data() || {}) }));
    return out;
  }

  /* GET /api/gst/checkout-context */
  async function handleCheckoutContext(req, res) {
    if (!paymentsOn()) return sendJson(res, 404, NOT_FOUND_BODY);
    const ipStateCode = stateCodeFromIpRegion(req.headers['x-vercel-ip-country'], req.headers['x-vercel-ip-country-region']);
    let remembered = null;
    const uid = req.headers.authorization ? await uidOf(req) : null;
    if (uid && adminFirestore) {
      try {
        remembered = rememberedFrom(await ordersOf(uid));
      } catch {
        remembered = null; // a failed read only means the buyer is asked
      }
    }
    return sendJsonWithHeaders(res, 200, { ok: true, ipStateCode, remembered }, { 'Cache-Control': 'no-store' });
  }

  /* GET /api/gst/invoices */
  async function handleMyInvoices(req, res) {
    if (!invoicingOn()) return sendJson(res, 404, NOT_FOUND_BODY);
    const uid = await uidOf(req);
    if (!uid) return sendJson(res, 401, { ok: false, error: 'unauthenticated' });
    if (!adminFirestore) return sendJson(res, 503, { ok: false, error: 'unavailable' });
    try {
      const items = (await ordersOf(uid))
        .filter((o) => o.gstInvoice && typeof o.gstInvoice.number === 'string')
        .map((o) => ({
          orderId: o.id,
          number: o.gstInvoice.number,
          dateIst: o.gstInvoice.dateIst,
          description: o.gstInvoice.line && o.gstInvoice.line.description,
          totalPaise: o.gstInvoice.totalPaise,
          issuedAtMs: o.gstInvoice.issuedAtMs,
        }))
        .sort((a, b) => b.issuedAtMs - a.issuedAtMs);
      return sendJsonWithHeaders(res, 200, { ok: true, items }, { 'Cache-Control': 'no-store' });
    } catch (e) {
      console.error('[gst/invoices] read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not read invoices.' });
    }
  }

  function overPdfCap(key) {
    const minute = Math.floor(now() / 60000);
    const k = `${key}|${minute}`;
    const n = (pdfHits.get(k) || 0) + 1;
    pdfHits.set(k, n);
    if (pdfHits.size > 5000) {
      for (const key2 of pdfHits.keys()) if (!key2.endsWith(`|${minute}`)) pdfHits.delete(key2);
    }
    return n > PDF_PER_MINUTE;
  }

  /* GET /api/gst/invoice */
  async function handleInvoicePdf(req, res, reqUrlRaw) {
    if (!adminFirestore) return sendJson(res, 503, { ok: false, error: 'unavailable' });
    const query = new URL(reqUrlRaw || req.url || '', 'http://local').searchParams;
    const token = query.get('t');
    let orderId = null;
    let uid = null;
    if (token) {
      orderId = orderIdFromToken(token, tokenSecret());
      if (!orderId) return sendJson(res, 404, NOT_FOUND_BODY);
    } else {
      uid = await uidOf(req);
      if (!uid) return sendJson(res, 401, { ok: false, error: 'unauthenticated' });
      orderId = query.get('orderId') || '';
      if (!ID_PATTERN.test(orderId)) return sendJson(res, 404, NOT_FOUND_BODY);
    }
    if (overPdfCap(uid || `t:${orderId}`)) return sendJson(res, 429, { ok: false, error: 'Too many requests' });
    let order;
    try {
      const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).doc(orderId).get();
      order = snap && snap.exists ? snap.data() || {} : null;
    } catch (e) {
      console.error('[gst/invoice] read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not read the invoice.' });
    }
    // Uniform 404: an unknown order, someone else's order and an order with no invoice look the same.
    if (!order || !order.gstInvoice) return sendJson(res, 404, NOT_FOUND_BODY);
    if (uid && order.uid !== uid) return sendJson(res, 404, NOT_FOUND_BODY);
    let pdf;
    try {
      pdf = renderPdf(order.gstInvoice);
    } catch (e) {
      console.error('[gst/invoice] render failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not render the invoice.' });
    }
    const file = `${String(order.gstInvoice.number).replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`;
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${file}"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.end(pdf);
  }

  async function admit(req, res) {
    if (typeof requireAdmin !== 'function' || !adminFirestore) {
      sendJson(res, 503, { ok: false, error: 'Admin endpoints unavailable' });
      return false;
    }
    const auth = await requireAdmin(req);
    if (!auth || !auth.ok) {
      sendJson(res, (auth && auth.status) || 401, { ok: false, error: (auth && auth.error) || 'Unauthorized' });
      return false;
    }
    return true;
  }

  async function invoicesIn(range) {
    const snap = await adminFirestore
      .collection(PAY_ORDERS_COLLECTION)
      .where('gstInvoice.issuedAtMs', '>=', range.fromMs)
      .where('gstInvoice.issuedAtMs', '<', range.toMs)
      .get();
    const out = [];
    snap.forEach((d) => {
      const v = d.data() || {};
      if (v.gstInvoice) out.push(v.gstInvoice);
    });
    return out;
  }

  /** Paid orders in the range (by paidAt, or guestPaidAt for a guest order) that carry NO invoice, with the reason. */
  async function heldIn(range, config) {
    const out = [];
    const seen = new Set();
    for (const field of ['paidAt', 'guestPaidAt']) {
      const snap = await adminFirestore
        .collection(PAY_ORDERS_COLLECTION)
        .where(field, '>=', new Date(range.fromMs))
        .where(field, '<', new Date(range.toMs))
        .get();
      snap.forEach((d) => {
        if (seen.has(d.id)) return;
        seen.add(d.id);
        const o = d.data() || {};
        if (o.gstInvoice || !PAID_STATES.includes(o.status)) return;
        const reason = (o.gstInvoiceHeld && o.gstInvoiceHeld.reason) || heldReasonFor(o, config) || (config.enabled ? 'not_yet_issued' : 'invoicing_off');
        const paidMs = toMs(o.paidAt || o.guestPaidAt);
        const createdMs = toMs(o.createdAt);
        out.push({
          orderId: d.id,
          createdIst: Number.isFinite(createdMs) ? istDateLabel(createdMs) : '',
          paidIst: Number.isFinite(paidMs) ? istDateLabel(paidMs) : '',
          paidMs: Number.isFinite(paidMs) ? paidMs : 0,
          passType: o.passType || '',
          amountPaise: Number.isInteger(o.amountPaise) ? o.amountPaise : 0,
          reason,
          stateCode: (o.gstBuyer && o.gstBuyer.stateCode) || '',
        });
      });
    }
    return out.sort((a, b) => a.paidMs - b.paidMs);
  }

  /* GET /api/admin/gst/status */
  async function handleAdminStatus(req, res, reqUrlRaw) {
    if (!(await admit(req, res))) return undefined;
    const config = resolveInvoiceConfig(env);
    const query = new URL(reqUrlRaw || req.url || '', 'http://local').searchParams;
    const range = parseRange(query);
    if (!range) return sendJson(res, 400, { ok: false, error: 'from and to must be YYYY-MM-DD, at most 400 days apart' });
    try {
      const [invoices, held] = await Promise.all([invoicesIn(range), heldIn(range, config)]);
      const counters = {};
      const cs = await adminFirestore.collection(GST_INVOICE_COUNTERS_COLLECTION).get();
      cs.forEach((d) => {
        counters[d.id] = Number((d.data() || {}).last) || 0;
      });
      return sendJsonWithHeaders(
        res,
        200,
        {
          ok: true,
          config: { enabled: config.enabled, ready: config.ready, missing: config.missing },
          invoiceCount: invoices.length,
          counters,
          held,
        },
        { 'Cache-Control': 'no-store' },
      );
    } catch (e) {
      console.error('[admin/gst/status] read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not read invoices.' });
    }
  }

  /* GET /api/admin/gst/export */
  async function handleAdminExport(req, res, reqUrlRaw) {
    if (!(await admit(req, res))) return undefined;
    const query = new URL(reqUrlRaw || req.url || '', 'http://local').searchParams;
    const section = query.get('section') || 'invoices';
    if (section !== 'held' && !Object.prototype.hasOwnProperty.call(SECTIONS, section)) return sendJson(res, 400, { ok: false, error: 'unknown section' });
    const range = parseRange(query);
    if (!range) return sendJson(res, 400, { ok: false, error: 'from and to must be YYYY-MM-DD, at most 400 days apart' });
    let csv;
    try {
      csv = section === 'held' ? heldCsv(await heldIn(range, resolveInvoiceConfig(env))) : SECTIONS[section](await invoicesIn(range));
    } catch (e) {
      console.error('[admin/gst/export] read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not build the export.' });
    }
    const body = Buffer.from(`﻿${csv}`, 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gstr1-${section}-${query.get('from')}-to-${query.get('to')}.csv"`,
      'Content-Length': String(body.length),
      'Cache-Control': 'no-store',
    });
    return res.end(body);
  }

  return { handleCheckoutContext, handleMyInvoices, handleInvoicePdf, handleAdminStatus, handleAdminExport };
}

module.exports = {
  createGstInvoiceRoutes,
  rememberedFrom,
  parseRange,
  GST_CHECKOUT_CONTEXT_PATH,
  GST_INVOICES_PATH,
  GST_INVOICE_PDF_PATH,
  GST_ADMIN_STATUS_PATH,
  GST_ADMIN_EXPORT_PATH,
};
