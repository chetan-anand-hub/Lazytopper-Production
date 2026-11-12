'use strict';
// SERVER-PDF-1 PR-B - stamp ONE buyer's licence into a pack template (made once in CI by scripts/packTemplates, PR-A).
//
// What a template leaves blank, and where this puts it back (every position, size and style is read from the template's own
// recorded `marks`, never re-derived):
//   cover   licence line (Inter, the box's text column, ONE line: licenceFit), "Download again any time until <date>.",
//           "Edition <date>" right-anchored. The "Your copy" frame, "Please do not share or resell this file." are already ink.
//   body    "Generated <date>" under each paper's title row.
//   footer  "Licensed to <name> - <e-mail or masked phone> - Order <id> - personal use only" on every body page, with the SAME
//           fit ladder the browser build uses (fitLicensee: 10 -> 9.5 -> 9 pt, then shorten the name, then the e-mail; Latin-1 only).
//   bridge  pages 2-3 are swapped for the pack's bridge pages (with or without the Board Pass card); link annotations come along.
//
// The fonts are the SAME files the template was rendered with (manifest.fonts, sha256-verified): a stamped line is the same glyph
// shapes the raster would have drawn (as outlines - see drawOutlines). Pure of I/O except loadFonts (reads the pinned files).

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { PDFDocument, StandardFonts, rgb, pushGraphicsState, popGraphicsState, setCharacterSpacing } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const { redownloadUntilFor } = require('./packTerms.cjs');

/** The stamp could not be made COMPLETE (a mark, a page or a font is missing): the caller answers 503 not_ready, never an unstamped file. */
class StampIncomplete extends Error {
  constructor(detail) {
    super(`not_ready: ${detail}`);
    this.code = 'not_ready';
  }
}

const PT_PER_MM = 72 / 25.4;
const MM_PER_PT = 25.4 / 72;
/** The repo root: server/services -> server -> lazytopper -> repo (manifest font paths are relative to it). */
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/** "25 Oct 2026" (en-GB), on the IST calendar day: the browser builds print the buyer's local date; buyers are in India. */
function dateLabel(ms) {
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/** The words after "Download again any time until " - the SAME rule as src/lib/packs/packLabels.ts (parity-tested). */
function redownloadCopy(paidAtMs) {
  return `Download again any time until ${redownloadUntilFor(paidAtMs)}`;
}

/** jsPDF's built-in fonts hold Latin-1 only (footer). Bullets of a masked phone become "*". Verbatim from worksheetPdfExport.latin1. */
function latin1(text) {
  return String(text ?? '').replace(/•/g, '*').replace(/[^ -~ -ÿ]/g, '').replace(/\s+/g, ' ').trim();
}

/** Verbatim from worksheetPdfExport.licenseeLine. */
function licenseeLine(l, ascii = false) {
  const clean = (v) => (ascii ? latin1(String(v ?? '')) : String(v ?? '').trim());
  const parts = [clean(l.name), clean(l.email)].filter(Boolean);
  const who = parts.join(' · ');
  return `Licensed to ${who ? `${who} · ` : ''}Order ${clean(l.orderId)} — personal use only`;
}

/**
 * Width in mm of `text` the way the BROWSER BUILD measured it: jsPDF's own Helvetica metrics (which differ from pdf-lib's AFM widths by
 * ~1% and kern differently). The footer fit decides with THIS, so the same line, at the same size, is chosen as the browser would have.
 */
let jspdfMeter = null;
function jspdfWidthMm(text, sizePt) {
  if (!jspdfMeter) {
    // eslint-disable-next-line global-require
    const { jsPDF } = require('jspdf');
    jspdfMeter = new jsPDF({ unit: 'mm', format: 'a4' });
    jspdfMeter.setFont('helvetica', 'normal');
  }
  jspdfMeter.setFontSize(sizePt);
  return jspdfMeter.getTextWidth(text);
}

/** Width in mm of `text` as pdf-lib's standard Helvetica draws it (a plain run, no kerning). */
function helveticaWidthMm(font, text, sizePt) {
  let w = 0;
  for (const ch of text) w += font.widthOfTextAtSize(ch, sizePt);
  return w * MM_PER_PT;
}

const shorten = (v, drop) => (drop <= 0 ? v : `${v.slice(0, Math.max(1, v.length - drop))}...`);

/** The same ladder as worksheetPdfExport.fitLicensee, with Helvetica metrics in mm. `widthMm(text, sizePt)` measures. */
function fitFooter(l, maxWidthMm, sizesPt, widthMm) {
  const base = { name: latin1(l.name), email: latin1(l.email), orderId: latin1(l.orderId) };
  for (let drop = 0; drop <= base.name.length + base.email.length; drop += 1) {
    const nameDrop = Math.min(drop, Math.max(0, base.name.length - 1));
    const emailDrop = drop - nameDrop;
    const text = licenseeLine({ name: shorten(base.name, nameDrop), email: shorten(base.email, emailDrop), orderId: base.orderId }, true);
    for (const size of sizesPt) {
      if (widthMm(text, size) <= maxWidthMm) return { text, size };
    }
  }
  return { text: licenseeLine({ name: '', email: '', orderId: base.orderId }, true), size: sizesPt[sizesPt.length - 1] };
}

function sha256Hex(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

/** Read and verify the pinned fonts the manifest names. {`${family}-${weight}`: Buffer}. Throws font_mismatch on a wrong hash. */
function loadFonts(manifestFonts, root = REPO_ROOT) {
  const out = {};
  for (const f of manifestFonts || []) {
    let bytes;
    try {
      bytes = fs.readFileSync(path.resolve(root, f.file));
    } catch {
      throw new StampIncomplete(`font file missing: ${f.file}`);
    }
    if (sha256Hex(bytes) !== f.sha256) throw new StampIncomplete(`font_mismatch: ${f.file}`);
    out[`${f.family}-${f.weight}`] = bytes;
  }
  return out;
}

function parseRgb(css) {
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(String(css || ''));
  return m ? rgb(Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255) : rgb(0.08, 0.14, 0.23);
}

/** Inter weight nearest the recorded one; Fraunces only has 700. */
function fontKeyFor(style, fonts) {
  if (/fraunces/i.test(style.fontFamily || '') && fonts['Fraunces-700']) return 'Fraunces-700';
  const want = Number(style.fontWeight) || (/bold/i.test(style.fontWeight || '') ? 700 : 400);
  const weights = Object.keys(fonts).filter((k) => k.startsWith('Inter-')).map((k) => Number(k.slice(6)));
  if (!weights.length) throw new StampIncomplete('no Inter font');
  const best = weights.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a));
  return `Inter-${best}`;
}

// ---- text as outlines -----------------------------------------------------------------------------------------------------
// The cover and "Generated" text were RASTER in today's file; here they are filled glyph OUTLINES from the same font file (laid out
// by fontkit with the font's own kerning). pdf-lib cannot subset a CFF (.otf) font validly, and embedding Inter whole would add ~1 MB
// to every file, so no font is embedded at all: the ink is the same shapes the browser drew, at the recorded size and place.
const parsed = new WeakMap();
function fontOf(bytes) {
  let f = parsed.get(bytes);
  if (!f) {
    f = fontkit.create(bytes);
    parsed.set(bytes, f);
  }
  return f;
}
/** Keep only what the font has a glyph for (a missing one would draw .notdef); it becomes "?". */
function safeText(font, text) {
  let out = '';
  for (const ch of String(text)) out += font.hasGlyphForCodePoint(ch.codePointAt(0)) ? ch : '?';
  return out;
}
/** Width of `text` at `sizePt`, in pt, with the font's kerning. */
function widthOf(font, text, sizePt) {
  return (font.layout(safeText(font, text)).advanceWidth / font.unitsPerEm) * sizePt;
}
/** Draw `text` with its baseline at (xPt, yPt) (PDF coordinates, y up) as filled outlines. */
function drawOutlines(page, font, text, xPt, yPt, sizePt, color) {
  const run = font.layout(safeText(font, text));
  const scale = sizePt / font.unitsPerEm;
  let pen = 0;
  run.glyphs.forEach((g, i) => {
    const pos = run.positions[i];
    const svg = g.path.transform(1, 0, 0, -1, pen + pos.xOffset, 0).toSVG();
    if (svg) page.drawSvgPath(svg, { x: xPt, y: yPt - pos.yOffset * scale, scale, color, borderWidth: 0 });
    pen += pos.xAdvance;
  });
}

/**
 * Greedy line wrap that breaks where today's cover CSS breaks (`overflow-wrap: anywhere`): at spaces, after "-" and after "/" (not before a
 * digit), and, as a last resort, inside a token wider than the column. Trailing spaces hang (never counted). Pure.
 */
function wrapLines(text, maxWidthPt, widthPt) {
  const units = [];
  let cur = '';
  const chars = Array.from(String(text).trim());
  chars.forEach((ch, i) => {
    cur += ch;
    const next = chars[i + 1];
    const soft = /\s/.test(ch) ? next !== undefined && !/\s/.test(next) : (ch === '-' || ch === '/') && next !== undefined && !/[\s\d]/.test(next);
    if (soft) {
      units.push(cur);
      cur = '';
    }
  });
  if (cur) units.push(cur);
  const fits = (t) => widthPt(t.replace(/\s+$/, '')) <= maxWidthPt;
  const lines = [];
  let line = '';
  const flush = () => {
    if (line) lines.push(line.replace(/\s+$/, ''));
    line = '';
  };
  for (const u of units) {
    if (!line || fits(line + u)) {
      if (!line && !fits(u)) {
        // a token wider than the column: break inside it
        for (const ch of Array.from(u)) {
          if (line && !fits(line + ch)) flush();
          line += ch;
        }
      } else line += u;
    } else {
      flush();
      if (fits(u)) line = u;
      else {
        for (const ch of Array.from(u)) {
          if (line && !fits(line + ch)) flush();
          line += ch;
        }
      }
    }
  }
  flush();
  return lines;
}

/**
 * The cover licence line, the way the browser build's cover prints it: the FULL line at the recorded size, wrapped like the CSS (spaces, after "-" and "/", inside a too-long token) to the
 * text column. One line -> variant 1 (the one-line cover); two -> variant 2 (the two-line cover). Only a line that needs MORE than two
 * lines is shortened (fitLicensee's rule: the name first, then the e-mail, with "..."; the order id and "personal use only" are never
 * cut), and never before two lines have been tried. Pure: `measure(text)` -> width in the same unit as `width`.
 * Returns {lines, variant}.
 */
function fitCoverLicence(l, width, measure) {
  const attempt = (text) => {
    const lines = wrapLines(text, width, measure);
    return lines.length >= 1 && lines.length <= 2 && lines.every((x) => measure(x) <= width + 0.01) ? { lines, variant: lines.length } : null;
  };
  const full = attempt(licenseeLine(l));
  if (full) return full;
  const name = String(l.name ?? '').trim();
  const email = String(l.email ?? '').trim();
  for (let drop = 1; drop <= name.length + email.length; drop += 1) {
    const nameDrop = Math.min(drop, Math.max(0, name.length - 1));
    const hit = attempt(licenseeLine({ name: shorten(name, nameDrop), email: shorten(email, drop - nameDrop), orderId: l.orderId }));
    if (hit) return hit;
  }
  const bare = wrapLines(licenseeLine({ name: '', email: '', orderId: l.orderId }), width, measure).slice(0, 2);
  return { lines: bare, variant: bare.length === 1 ? 1 : 2 };
}

/** Where a baseline goes in a one-line box of height hMm for a font (browser rule: half-leading around the content area). */
function baselineMm(box, fontSizeMm, ascent, descent, lineHMm) {
  const h = lineHMm != null ? lineHMm : box.hMm;
  return box.yMm + (h - (ascent + descent) * fontSizeMm) / 2 + ascent * fontSizeMm;
}

/**
 * Stamp one buyer into a template.
 *   templateBytes  the template PDF
 *   marks          its recorded TemplateMarks (manifest.files[id].marks)
 *   buyer          {name, contact (e-mail or masked phone), orderId, paidAtMs}
 *   nowMs          the download day (Edition and Generated)
 *   fonts          loadFonts() result
 *   bridgeBytes    the 2-page bridge PDF to swap in for pages 2-3 (or undefined: leave the template's pages)
 * -> Uint8Array
 */
async function stampTemplate({ templateBytes, marks, buyer, nowMs, fonts, bridgeBytes, requireBridge }) {
  const doc = await PDFDocument.load(templateBytes);
  const need = (cond, detail) => {
    if (!cond) throw new StampIncomplete(detail);
  };
  // FAIL CLOSED: a pack file is never produced unwatermarked. Every mark the stamp needs must be there, and every one must be drawn.
  need(marks && marks.cover && marks.cover2 && marks.footer, 'template marks incomplete');
  need(doc.getPageCount() === marks.pages + 1, 'template page count does not match its marks');
  const stampOf = (cm, name) => cm.stamps.find((x) => x.name === name);
  for (const cm of [marks.cover, marks.cover2]) for (const n of ['textcol', 'licence', 'redownload', 'edition']) need(stampOf(cm, n), `cover has no ${n} mark`);

  const licensee = { name: buyer.name || '', email: buyer.contact || '', orderId: buyer.orderId || '' };

  /** One line of text in a recorded style: font, size (pt), colour, ascent/descent as fractions of the size. */
  const styled = (style, mmPerPx) => {
    const key = fontKeyFor(style, fonts);
    need(fonts && fonts[key], `font missing: ${key}`);
    const font = fontOf(fonts[key]);
    const fontSizeMm = style.fontSizePx * mmPerPx;
    return {
      font,
      fontSizeMm,
      sizePt: fontSizeMm * PT_PER_MM,
      asc: font.ascent / font.unitsPerEm,
      desc: Math.abs(font.descent) / font.unitsPerEm,
      color: parseRgb(style.color),
      upper: style.textTransform === 'uppercase',
    };
  };

  // ---- which cover: measure the buyer's FULL line at the recorded size ----
  const lic1 = stampOf(marks.cover, 'licence');
  const col1 = stampOf(marks.cover, 'textcol');
  const base = styled(lic1.style, marks.cover.mmPerPx);
  const fit = fitCoverLicence(licensee, col1.wMm * PT_PER_MM, (t) => widthOf(base.font, t, base.sizePt));
  const cover = fit.variant === 2 ? marks.cover2 : marks.cover;
  // the template's last page is the two-line cover: it becomes page 1, or is dropped
  const last = doc.getPage(doc.getPageCount() - 1);
  doc.removePage(doc.getPageCount() - 1);
  if (fit.variant === 2) {
    doc.removePage(0);
    doc.insertPage(0, last);
  }
  // pdf-lib keeps a page list cache that removePage alone does not refresh
  if (doc.pageCache && typeof doc.pageCache.invalidate === 'function') doc.pageCache.invalidate();

  // ---- bridge pages: 2 for 2, so every page index below is unchanged ----
  let bridged = false;
  if (bridgeBytes) {
    const bridge = await PDFDocument.load(bridgeBytes);
    need(bridge.getPageCount() === 2 && doc.getPageCount() >= 3, 'bridge pages do not fit the template');
    const copied = await doc.copyPages(bridge, [0, 1]);
    doc.removePage(1);
    doc.removePage(1);
    doc.insertPage(1, copied[0]);
    doc.insertPage(2, copied[1]);
    bridged = true;
  }
  need(!requireBridge || bridged, 'bridge pages missing');

  const pages = doc.getPages();
  need(pages.length === marks.pages, 'page count after the stamp');

  // ---- cover ----
  {
    const page = pages[0];
    const pageH = page.getHeight();
    const byName = (n) => stampOf(cover, n);
    const put = (st, text, xPt, baseMm) => drawOutlines(page, st.font, st.upper ? text.toUpperCase() : text, xPt, pageH - baseMm * PT_PER_MM, st.sizePt, st.color);

    const lic = byName('licence');
    const st = styled(lic.style, cover.mmPerPx);
    const lineMm = lic.style.lineHeightPx * cover.mmPerPx;
    need(fit.lines.length >= 1, 'no licence line');
    // the first line sits on the content-area top of the (inline) licence element; later lines follow the line height
    fit.lines.forEach((line, i) => put(st, line, lic.xMm * PT_PER_MM, lic.yMm + st.asc * st.fontSizeMm + i * lineMm));

    const red = byName('redownload');
    const rst = styled(red.style, cover.mmPerPx);
    const rtext = `${redownloadCopy(buyer.paidAtMs)}.`;
    put(rst, rtext, red.xMm * PT_PER_MM, baselineMm(red, rst.fontSizeMm, rst.asc, rst.desc));

    const ed = byName('edition');
    const etext = `Edition ${dateLabel(nowMs)}`;
    const est = styled(ed.style, cover.mmPerPx);
    const w = widthOf(est.font, etext, est.sizePt);
    const x = ed.anchor === 'right' && typeof ed.rightEdgeMm === 'number' ? ed.rightEdgeMm * PT_PER_MM - w : ed.xMm * PT_PER_MM;
    put(est, etext, x, baselineMm(ed, est.fontSizeMm, est.asc, est.desc));
  }

  // ---- "Generated <date>" under each paper's title ----
  for (const b of marks.body || []) {
    if (b.name !== 'generated') continue;
    const page = pages[b.page - 1];
    need(page, `no page ${b.page} for the Generated date`);
    const mmPerPx = marks.cover.mmPerPx || b.wMm / Math.max(1, b.wPx);
    const st = styled(b.style, mmPerPx);
    drawOutlines(page, st.font, `Generated ${dateLabel(nowMs)}`, b.xMm * PT_PER_MM, page.getHeight() - baselineMm(b, st.fontSizeMm, st.asc, st.desc) * PT_PER_MM, st.sizePt, st.color);
  }

  // ---- footer licence line on every body page ----
  const footer = marks.footer;
  let stamped = 0;
  {
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const fit = fitFooter(licensee, footer.maxWidthMm, footer.fontSizesPt, jspdfWidthMm);
    // jsPDF set this run ~1% differently from a plain Helvetica run; spread the difference so the printed line is as wide as the
    // browser build's (the recorded maxWidth is therefore honoured exactly, QR gap included).
    const chars = Array.from(fit.text).length;
    const spacingPt = chars ? ((jspdfWidthMm(fit.text, fit.size) - helveticaWidthMm(helv, fit.text, fit.size)) / MM_PER_PT) / chars : 0;
    const color = rgb(footer.colorRgb[0] / 255, footer.colorRgb[1] / 255, footer.colorRgb[2] / 255);
    need(footer.firstPage >= 2 && footer.lastPage >= footer.firstPage && footer.lastPage <= pages.length, 'footer page range');
    for (let p = footer.firstPage; p <= footer.lastPage; p += 1) {
      const page = pages[p - 1];
      need(page, `no page ${p} for the footer`);
      stamped += 1;
      page.pushOperators(pushGraphicsState(), setCharacterSpacing(spacingPt));
      page.drawText(fit.text, { x: footer.xMm * PT_PER_MM, y: page.getHeight() - footer.baselineYMm * PT_PER_MM, size: fit.size, font: helv, color });
      page.pushOperators(popGraphicsState());
    }
  }

  need(stamped === footer.lastPage - footer.firstPage + 1 && stamped >= 1, 'footer not on every body page');
  return doc.save();
}

module.exports = { StampIncomplete, stampTemplate, helveticaWidthMm, jspdfWidthMm, widthOf, fontOf, loadFonts, fitFooter, fitCoverLicence, licenseeLine, latin1, dateLabel, redownloadCopy, sha256Hex, REPO_ROOT };
