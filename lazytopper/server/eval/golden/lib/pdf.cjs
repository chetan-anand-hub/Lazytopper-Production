'use strict';
// lib/pdf.cjs — a minimal, dependency-free, DETERMINISTIC JPEG-pages -> PDF writer.
//
// WHY: Worksheets, Chapter Test, Full Mock and multi-question Check & Improve post ONE
// answer document (application/pdf). The golden set commits the answer PHOTOS, not
// pre-built PDFs, so the planner assembles the document at request time. Each page is
// one JPEG embedded as-is (DCTDecode — exactly what jsPDF does with a JPEG in the app),
// with an optional "Qn." label in a white band above it (a student labels each answer).
// No timestamps, ids or randomness: the same pages always yield the same bytes, so a
// request digest recorded at LIVE time can be re-derived at REPLAY time.

function jpegInfo(buf) {
  if (!(buf[0] === 0xff && buf[1] === 0xd8)) throw new Error('not a JPEG');
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    // SOF0..SOF15 except DHT(C4), JPG(C8), DAC(CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      const components = buf[i + 9];
      return { width, height, components };
    }
    i += 2 + len;
  }
  throw new Error('JPEG has no SOF marker');
}

function pdfString(s) {
  return '(' + String(s).replace(/[\\()]/g, (c) => '\\' + c).replace(/[^\x20-\x7e]/g, '?') + ')';
}

/**
 * @param {{ jpeg: Buffer, label?: string }[]} pages
 * @returns {Buffer}
 */
function jpegsToPdf(pages) {
  const PAGE_W = 595;
  const PAGE_H = 842;
  const BAND = 44;
  const MARGIN = 18;
  const objects = []; // index = object number - 1; each a Buffer
  const add = (buf) => { objects.push(buf); return objects.length; };
  const placeholder = () => add(Buffer.alloc(0));

  const catalogNo = placeholder();
  const pagesNo = placeholder();
  const fontNo = add(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'));
  const kids = [];

  for (const p of pages) {
    const info = jpegInfo(p.jpeg);
    const cs = info.components === 1 ? '/DeviceGray' : info.components === 4 ? '/DeviceCMYK' : '/DeviceRGB';
    const imgNo = add(Buffer.concat([
      Buffer.from('<< /Type /XObject /Subtype /Image /Width ' + info.width + ' /Height ' + info.height +
        ' /ColorSpace ' + cs + ' /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n'),
      p.jpeg,
      Buffer.from('\nendstream'),
    ]));
    const availW = PAGE_W - 2 * MARGIN;
    const availH = PAGE_H - BAND - 2 * MARGIN;
    const scale = Math.min(availW / info.width, availH / info.height);
    const w = Math.round(info.width * scale * 100) / 100;
    const h = Math.round(info.height * scale * 100) / 100;
    const x = Math.round(((PAGE_W - w) / 2) * 100) / 100;
    const y = MARGIN;
    let content = 'q ' + w + ' 0 0 ' + h + ' ' + x + ' ' + y + ' cm /Im0 Do Q';
    if (p.label) content += '\nBT /F1 22 Tf ' + MARGIN + ' ' + (PAGE_H - BAND + 12) + ' Td ' + pdfString(p.label) + ' Tj ET';
    const contentBuf = Buffer.from(content);
    const contentNo = add(Buffer.concat([
      Buffer.from('<< /Length ' + contentBuf.length + ' >>\nstream\n'), contentBuf, Buffer.from('\nendstream'),
    ]));
    const pageNo = add(Buffer.from('<< /Type /Page /Parent ' + pagesNo + ' 0 R /MediaBox [0 0 ' + PAGE_W + ' ' + PAGE_H +
      '] /Resources << /XObject << /Im0 ' + imgNo + ' 0 R >> /Font << /F1 ' + fontNo + ' 0 R >> >> /Contents ' + contentNo + ' 0 R >>'));
    kids.push(pageNo);
  }
  objects[catalogNo - 1] = Buffer.from('<< /Type /Catalog /Pages ' + pagesNo + ' 0 R >>');
  objects[pagesNo - 1] = Buffer.from('<< /Type /Pages /Kids [' + kids.map((k) => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>');

  const chunks = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  const offsets = [];
  let pos = chunks[0].length;
  objects.forEach((body, idx) => {
    offsets.push(pos);
    const head = Buffer.from((idx + 1) + ' 0 obj\n');
    const tail = Buffer.from('\nendobj\n');
    chunks.push(head, body, tail);
    pos += head.length + body.length + tail.length;
  });
  const xrefPos = pos;
  let xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (const o of offsets) xref += String(o).padStart(10, '0') + ' 00000 n \n';
  xref += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root ' + catalogNo + ' 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF\n';
  chunks.push(Buffer.from(xref));
  return Buffer.concat(chunks);
}

module.exports = { jpegsToPdf, jpegInfo };
