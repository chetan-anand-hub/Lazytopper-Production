'use strict';
/**
 * gstInvoiceExport.cjs — GST-INVOICE-1 §6. The GSTR-1 working files for the CA, PURE: invoice records in, CSV text out.
 *
 *   invoices  every invoice, one row each (the invoice-wise list)
 *   b2cs      B2C (unregistered buyer) summary by place of supply and rate        (GSTR-1 Table 7)
 *   b2b       B2B rows, one per invoice, with the buyer's GSTIN                     (GSTR-1 Table 4A)
 *   hsn       SAC-wise summary                                                      (GSTR-1 Table 12)
 *   held      paid orders with NO invoice and why (pre-cut-off, no state, pack credit, top-up, seller config)
 *
 * ★ Amounts are rupees with two decimals, computed from the stored PAISE (no float sums: integers are summed, then
 *   formatted). Every cell that a spreadsheet could read as a formula is prefixed with an apostrophe (buyer names and
 *   addresses are typed by buyers).
 * ★ B2CL: an inter-state B2C invoice above Rs 1,00,000 belongs in Table 5, not 7. No LazyTopper product is near that,
 *   so `b2cs` asserts it rather than silently mis-filing: such a row is listed with type "B2CL-CHECK".
 */

const B2CL_LIMIT_PAISE = 100000 * 100;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function money(paise) {
  const n = Math.round(Number(paise) || 0);
  return `${n < 0 ? '-' : ''}${Math.floor(Math.abs(n) / 100)}.${String(Math.abs(n) % 100).padStart(2, '0')}`;
}
function cell(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(header, rows) {
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
/** "07-11-2026" -> "07-Nov-2026" (the GST portal's date format). */
function portalDate(dateIst) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(dateIst || ''));
  return m ? `${m[1]}-${MONTHS[Number(m[2]) - 1]}-${m[3]}` : String(dateIst || '');
}
const pos = (inv) => `${inv.placeOfSupply.code}-${inv.placeOfSupply.name}`;
const rateOf = (inv) => (inv.supplyType === 'intra' ? (inv.rates.cgst || 0) + (inv.rates.sgst || 0) : inv.rates.igst || 0);
const sortInvoices = (list) => list.slice().sort((a, b) => (a.fy < b.fy ? -1 : a.fy > b.fy ? 1 : a.seq - b.seq));

function invoicesCsv(list) {
  const rows = sortInvoices(list).map((inv) => [
    inv.number,
    inv.dateIst,
    inv.orderId,
    inv.paymentId,
    inv.b2b ? 'B2B' : 'B2C',
    inv.buyer.name || '',
    inv.buyer.gstin || '',
    inv.placeOfSupply.code,
    inv.placeOfSupply.name,
    inv.supplyType === 'intra' ? 'Intra-state' : 'Inter-state',
    inv.line.sac,
    money(inv.taxablePaise),
    rateOf(inv),
    money(inv.igstPaise),
    money(inv.cgstPaise),
    money(inv.sgstPaise),
    money(inv.totalPaise),
  ]);
  return toCsv(
    ['Invoice number', 'Invoice date', 'Order ID', 'Razorpay payment ID', 'Type', 'Buyer name', 'Buyer GSTIN', 'Place of supply code', 'Place of supply', 'Supply type', 'SAC', 'Taxable value', 'Rate %', 'IGST', 'CGST', 'SGST', 'Invoice value'],
    rows,
  );
}

function b2csCsv(list) {
  const groups = new Map();
  for (const inv of list) {
    if (inv.b2b) continue;
    const big = inv.supplyType === 'inter' && inv.totalPaise > B2CL_LIMIT_PAISE;
    const key = `${big ? 'B2CL-CHECK' : 'OE'}|${pos(inv)}|${rateOf(inv)}`;
    const g = groups.get(key) || { type: big ? 'B2CL-CHECK' : 'OE', pos: pos(inv), rate: rateOf(inv), taxable: 0, igst: 0, cgst: 0, sgst: 0, count: 0 };
    g.taxable += inv.taxablePaise;
    g.igst += inv.igstPaise;
    g.cgst += inv.cgstPaise;
    g.sgst += inv.sgstPaise;
    g.count += 1;
    groups.set(key, g);
  }
  const rows = [...groups.values()]
    .sort((a, b) => (a.pos < b.pos ? -1 : a.pos > b.pos ? 1 : a.rate - b.rate))
    .map((g) => [g.type, g.pos, g.rate, '', money(g.taxable), '0.00', '', money(g.igst), money(g.cgst), money(g.sgst), g.count]);
  return toCsv(['Type', 'Place Of Supply', 'Rate', 'Applicable % of Tax Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN', 'IGST', 'CGST', 'SGST', 'Invoices'], rows);
}

function b2bCsv(list) {
  const rows = sortInvoices(list.filter((inv) => inv.b2b)).map((inv) => [
    inv.buyer.gstin,
    inv.buyer.name || '',
    inv.number,
    portalDate(inv.dateIst),
    money(inv.totalPaise),
    pos(inv),
    'N',
    '',
    'Regular B2B',
    '',
    rateOf(inv),
    money(inv.taxablePaise),
    '0.00',
  ]);
  return toCsv(
    ['GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Applicable % of Tax Rate', 'Invoice Type', 'E-Commerce GSTIN', 'Rate', 'Taxable Value', 'Cess Amount'],
    rows,
  );
}

function hsnCsv(list) {
  const groups = new Map();
  for (const inv of list) {
    const key = `${inv.line.sac}|${rateOf(inv)}`;
    const g = groups.get(key) || { sac: inv.line.sac, rate: rateOf(inv), qty: 0, total: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0 };
    g.qty += Number(inv.line.quantity) || 1;
    g.total += inv.totalPaise;
    g.taxable += inv.taxablePaise;
    g.igst += inv.igstPaise;
    g.cgst += inv.cgstPaise;
    g.sgst += inv.sgstPaise;
    groups.set(key, g);
  }
  const rows = [...groups.values()]
    .sort((a, b) => (a.sac < b.sac ? -1 : a.sac > b.sac ? 1 : a.rate - b.rate))
    .map((g) => [g.sac, '', 'OTH-OTHERS', g.qty, money(g.total), g.rate, money(g.taxable), money(g.igst), money(g.cgst), money(g.sgst), '0.00']);
  return toCsv(['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Rate', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount'], rows);
}

/** `held`: [{ orderId, createdIst, paidIst, passType, amountPaise, reason, stateCode }] */
function heldCsv(held) {
  const rows = held.map((h) => [h.orderId, h.createdIst || '', h.paidIst || '', h.passType || '', money(h.amountPaise), h.reason, h.stateCode || '']);
  return toCsv(['Order ID', 'Created (IST)', 'Paid (IST)', 'Product', 'Amount paid', 'Reason no invoice', 'Buyer state code'], rows);
}

const SECTIONS = Object.freeze({ invoices: invoicesCsv, b2cs: b2csCsv, b2b: b2bCsv, hsn: hsnCsv });

module.exports = { SECTIONS, invoicesCsv, b2csCsv, b2bCsv, hsnCsv, heldCsv, money, cell, portalDate };
