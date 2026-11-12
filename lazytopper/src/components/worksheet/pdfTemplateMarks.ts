/**
 * SERVER-PDF-1 PR-A - the "template" render of a pack PDF and what it records.
 *
 * A pack file is made ONCE (in CI) with every buyer-specific mark left blank, and stamped per buyer later (PR-B). Three kinds of
 * buyer-specific ink exist today, and each is recorded here so the stamper puts it back in exactly today's place, size and font:
 *
 *   cover    the "Your copy" box (licence line, re-download date) and "Edition <date>" are RASTER text on page 1. In a template the
 *            same elements are laid out and measured but not painted (visibility: hidden).
 *   body     "Generated <date>" under each paper's title row is RASTER text on that paper's first body page (same treatment).
 *   footer   the licence line on every body page is jsPDF VECTOR text; a template simply does not draw it (geometry recorded).
 *
 * Nothing here runs on a buyer's device: the template option is only ever passed by scripts/packTemplates. The default render of
 * exportWorksheetPdf / exportWorksheetSetsPdf is byte-for-byte what it was (worksheetPdfExport.defaultRender.test.ts).
 */

/** The element attribute a template render puts on a blanked text, and the names the stamper looks for. */
export const STAMP_ATTR = "data-pdf-stamp";
/** `textcol` is the box's text column (its width is what the licence line wraps to); `box` the dashed frame; `boxlabel` the green "Your copy". */
export type StampName = "licence" | "redownload" | "edition" | "generated" | "box" | "boxlabel" | "textcol";

/** What the cover / body print the SAME size as the real text: the licence is a typical ONE-line buyer line (the box is one line tall, as today's). */
export const TEMPLATE_PLACEHOLDER = {
  /** A short licence: the cover box laid out for ONE line. */
  licence: "Licensed to Asha Rao · asha@x.in · Order order_Abc123 — personal use only",
  /** A typical full licence (full name, full e-mail, a real order id): the cover box laid out for TWO lines, as the browser build grows it. */
  licence2: "Licensed to Priya Venkataraman · priya.venkataraman.10b@gmail.com · Order order_RxkLm3ab9QzP1x — personal use only",
  redownload: "Download any time until 31 May 2027",
  edition: "25 Oct 2026",
  generated: "25 Oct 2026",
} as const;

export interface StampStyle {
  fontFamily: string;
  fontSizePx: number;
  fontWeight: string;
  color: string;
  lineHeightPx: number;
  letterSpacingPx: number;
  textTransform: string;
  textAlign: string;
}

/** One measured element. Pixels are CSS px relative to the measured root (the cover, or the body host); mm are on the A4 page. */
export interface StampBox {
  name: StampName;
  xPx: number;
  yPx: number;
  wPx: number;
  hPx: number;
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  /** Number of text lines the placeholder wrapped to (the stamper re-wraps real text to the same width). */
  lines: number;
  style: StampStyle;
  /** Which edge the real text is aligned to inside the box: "right" -> stamp it so its RIGHT edge is at `rightEdgeMm` (the edition). */
  anchor?: "left" | "right";
  rightEdgeMm?: number;
}

/**
 * How the stamper fits a real licence line (recorded in every manifest entry). A template carries TWO covers: page 1 laid out for a
 * one-line licence and a last page laid out for a two-line licence (`marks.cover` / `marks.cover2`), both exactly as the browser build's
 * CSS grows the box. The stamper measures the buyer's FULL line at the recorded size: it fits one line -> the one-line cover; else it
 * wraps (at spaces, like the CSS) to two lines -> the two-line cover; only if it still needs more does it shorten the name, then the
 * e-mail, with "..." (the footer line's fitLicensee rule). The order id and "personal use only" are never cut, and nothing is shortened
 * before two lines have been tried.
 */
export interface LicenceFitRule {
  maxLines: 2;
  shorten: "fitLicensee";
}
export const LICENCE_FIT_RULE: LicenceFitRule = { maxLines: 2, shorten: "fitLicensee" };

export interface CoverMarks {
  licenceFit: LicenceFitRule;
  /** The cover is laid out at wPx x hPx CSS px and placed full-bleed on A4. */
  wPx: number;
  hPx: number;
  mmPerPx: number;
  stamps: StampBox[];
}

export interface BodyStamp extends StampBox {
  /** 1-based page of the file the element sits on, and the paper (set) it belongs to (0 for a single-paper file). */
  page: number;
  set: number;
}

export interface FooterMarks {
  /** Left edge and BASELINE of the licence line (mm from the left / top), the width it must fit, and the sizes tried in order. */
  xMm: number;
  baselineYMm: number;
  maxWidthMm: number;
  fontSizesPt: number[];
  colorRgb: [number, number, number];
  /** jsPDF "helvetica" normal: the standard Helvetica the file already uses. */
  font: "Helvetica";
  /** The licence line is stamped on pages firstPage..lastPage (1-based): every body page, never the cover or the bridge pages. */
  firstPage: number;
  lastPage: number;
  /** A question paper prints the paper QR at the bottom right: the line is narrower. */
  withQr: boolean;
}

export interface TemplateMarks {
  version: 1;
  pageWmm: number;
  pageHmm: number;
  pages: number;
  cover?: CoverMarks;
  /** The same cover laid out for a two-line licence: the LAST page of the template (pages = marks.pages + 1 when present). */
  cover2?: CoverMarks;
  footer?: FooterMarks;
  body: BodyStamp[];
}

/** Collects the measured marks of one render (the exporter fills it; the generator reads it). */
export interface TemplateOptions {
  marks: TemplateMarks;
}

export function newTemplateMarks(pageWmm: number, pageHmm: number): TemplateMarks {
  return { version: 1, pageWmm, pageHmm, pages: 0, body: [] };
}

function styleOf(el: Element): StampStyle {
  const cs = getComputedStyle(el);
  const px = (v: string): number => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const fs = px(cs.fontSize);
  return {
    fontFamily: cs.fontFamily,
    fontSizePx: fs,
    fontWeight: cs.fontWeight,
    color: cs.color,
    lineHeightPx: cs.lineHeight === "normal" ? fs * 1.2 : px(cs.lineHeight),
    letterSpacingPx: cs.letterSpacing === "normal" ? 0 : px(cs.letterSpacing),
    textTransform: cs.textTransform,
    textAlign: cs.textAlign,
  };
}

function round(n: number, d = 3): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * Measures every `[data-pdf-stamp]` inside `root`. `toMm(xPx, yPx)` maps a point in root-relative CSS px to its place on the A4 page
 * (and may add the page it lands on); `wMmPerPx` converts widths / heights.
 */
export function measureStamps(
  root: HTMLElement,
  place: (xPx: number, yPx: number) => { xMm: number; yMm: number; page?: number },
  mmPerPx: number,
): Array<StampBox & { page?: number }> {
  const origin = root.getBoundingClientRect();
  const out: Array<StampBox & { page?: number }> = [];
  root.querySelectorAll(`[${STAMP_ATTR}]`).forEach((el) => {
    const name = el.getAttribute(STAMP_ATTR) as StampName;
    const r = el.getBoundingClientRect();
    const xPx = r.left - origin.left;
    const yPx = r.top - origin.top;
    const style = styleOf(el);
    const p = place(xPx, yPx);
    const lines = style.lineHeightPx > 0 ? Math.max(1, Math.round(r.height / style.lineHeightPx)) : 1;
    out.push({
      name,
      xPx: round(xPx),
      yPx: round(yPx),
      wPx: round(r.width),
      hPx: round(r.height),
      xMm: round(p.xMm),
      yMm: round(p.yMm),
      wMm: round(r.width * mmPerPx),
      hMm: round(r.height * mmPerPx),
      lines,
      style,
      ...(p.page !== undefined ? { page: p.page } : {}),
    });
  });
  return out;
}
