'use strict';
/**
 * gstInvoicePdf.cjs — GST-INVOICE-1 §5. The tax invoice as a PDF, generated SERVER-side from the invoice record STORED on
 * the order (`payOrders/{orderId}.gstInvoice`) — never from current prices or current env, so a re-download years later
 * is byte-for-byte the same document.
 *
 * ★ LIBRARY: `jspdf` — already a dependency of the lazytopper package (the client builds the pack PDFs with it); its Node
 *   build runs on the server with no new dependency. Required lazily, so the server pays for it only when an invoice is
 *   actually downloaded.
 * ★ The standard PDF fonts have no rupee glyph, so amounts print as "Rs. 1,917.00".
 */

function rupees(paise) {
  const n = Math.round(Number(paise) || 0);
  const whole = Math.floor(Math.abs(n) / 100);
  const frac = String(Math.abs(n) % 100).padStart(2, '0');
  const digits = String(whole);
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `Rs. ${n < 0 ? '-' : ''}${grouped}.${frac}`;
}

/** PURE. The lines of text the PDF carries, in order (also what the tests assert). */
function invoiceTextBlocks(inv) {
  const b = inv.buyer || {};
  const s = inv.seller || {};
  const intra = inv.supplyType === 'intra';
  const seller = [
    `${s.legalName} (brand "${s.brand}")`,
    `GSTIN: ${s.gstin}`,
    `${s.address}`,
    `State: ${s.stateName} (code ${s.stateCode})`,
  ];
  const buyer = [
    ...(b.name ? [`Name: ${b.name}`] : []),
    ...(b.email ? [`Email: ${b.email}`] : []),
    ...(b.phone ? [`Phone: ${b.phone}`] : []),
    ...(b.gstin ? [`GSTIN: ${b.gstin}`] : []),
    ...(b.address ? [`Address: ${b.address}`] : []),
    `State: ${b.stateName} (code ${b.stateCode})`,
    ...(b.pin ? [`PIN: ${b.pin}`] : []),
  ];
  const taxRows = intra
    ? [
        [`CGST @ ${inv.rates.cgst}%`, rupees(inv.cgstPaise)],
        [`SGST @ ${inv.rates.sgst}%`, rupees(inv.sgstPaise)],
      ]
    : [[`IGST @ ${inv.rates.igst}%`, rupees(inv.igstPaise)]];
  return {
    title: 'Tax Invoice',
    meta: [
      `Invoice number: ${inv.number}`,
      `Invoice date: ${inv.dateIst} (IST)`,
      `Place of supply: ${inv.placeOfSupply.name} (code ${inv.placeOfSupply.code})`,
      `Razorpay payment ID: ${inv.paymentId}`,
    ],
    seller,
    buyer,
    line: { description: inv.line.description, sac: inv.line.sac, qty: String(inv.line.quantity || 1), taxable: rupees(inv.taxablePaise) },
    totals: [['Taxable value', rupees(inv.taxablePaise)], ...taxRows, ['Total (amount paid)', rupees(inv.totalPaise)]],
    footer: 'This is a computer-generated invoice and does not require a signature.',
  };
}

/** The PDF bytes (a Buffer) for a stored invoice record. */
function renderInvoicePdf(inv) {
  const { jsPDF } = require('jspdf');
  const t = invoiceTextBlocks(inv);
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  doc.setProperties({ title: `Tax Invoice ${inv.number}`, author: inv.seller.legalName, creator: 'LazyTopper' });
  const W = doc.internal.pageSize.getWidth();
  const L = 48;
  const R = W - 48;
  let y = 56;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(t.title, L, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  y += 22;
  for (const m of t.meta) {
    doc.text(m, L, y);
    y += 14;
  }

  y += 10;
  const colW = (R - L - 24) / 2;
  const block = (heading, lines, x, y0) => {
    let yy = y0;
    doc.setFont('helvetica', 'bold');
    doc.text(heading, x, yy);
    doc.setFont('helvetica', 'normal');
    yy += 14;
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line, colW);
      doc.text(wrapped, x, yy);
      yy += 13 * wrapped.length;
    }
    return yy;
  };
  const yS = block('Supplier', t.seller, L, y);
  const yB = block('Recipient', t.buyer, L + colW + 24, y);
  y = Math.max(yS, yB) + 16;

  // The product line.
  doc.setDrawColor(160);
  doc.line(L, y, R, y);
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.text('Description', L, y);
  doc.text('SAC', L + 300, y);
  doc.text('Qty', L + 360, y);
  doc.text('Taxable value', R, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 14;
  const desc = doc.splitTextToSize(t.line.description, 290);
  doc.text(desc, L, y);
  doc.text(t.line.sac, L + 300, y);
  doc.text(t.line.qty, L + 360, y);
  doc.text(t.line.taxable, R, y, { align: 'right' });
  y += 13 * desc.length + 6;
  doc.line(L, y, R, y);
  y += 16;

  for (let i = 0; i < t.totals.length; i += 1) {
    const [label, value] = t.totals[i];
    const last = i === t.totals.length - 1;
    doc.setFont('helvetica', last ? 'bold' : 'normal');
    doc.text(label, R - 200, y);
    doc.text(value, R, y, { align: 'right' });
    y += 15;
  }

  y += 24;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text(t.footer, L, y);
  return Buffer.from(doc.output('arraybuffer'));
}

module.exports = { renderInvoicePdf, invoiceTextBlocks, rupees };
