// src/components/worksheet/worksheetPdfExport.ts
//
// PR-E2a.2 FIX 1 — a real client-side PDF FILE download (Option B), replacing the
// broken window.print() path. No new dependency (html2canvas + jspdf already in
// package.json). The worksheet is rendered (math via MathText/KaTeX) into a
// DETACHED offscreen host, rasterised, paginated across A4, and saved as a file.
//
// CLEAN ISOLATION (the bug E2a.1 hit): html2canvas captures ONLY the offscreen
// host — which contains nothing but <WorksheetPrintDoc> — so the PDF can never
// include the surrounding LazyTopper page. We do NOT rely on print.css visibility
// hiding (which kept the whole app in the printed layout).
//
// Known trade-off (acceptable for a printable worksheet): the math in the PDF is a
// rasterised image, not selectable text. We render at scale 2 and wait for fonts
// so symbols are crisp and B&W-legible. A future server-side text PDF is logged as
// [FU-WORKSHEET-PDF-SERVERSIDE].

import { createElement, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { WorksheetPrintDoc } from "./WorksheetPrintDoc";
import { WorksheetGradedPrintDoc } from "./WorksheetGradedPrintDoc";
import { loadKatex } from "../question/MathText";
import type { RenderSolutionFigure } from "./printFigures";
import { planSlices, type Span } from "./worksheetPagination";
import {
  CheckImproveGradedPrintDoc,
  type CheckImproveGradedPrintDocProps,
} from "../checkimprove/CheckImproveGradedPrintDoc";
import { BRAND_MARK_SRC } from "../../config/brandMark";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import type { WorksheetGradeResponse } from "../../ai/aiClient";

type Doc = import("jspdf").jsPDF;

const HOST_WIDTH = 760; // px content width for the offscreen render

function slug(s: string): string {
  const out = (s || "worksheet")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  return out || "worksheet";
}

/**
 * FIX D — the unique worksheet CODE (e.g. `WS-M-MIX-04`) as a filename segment, so
 * every worksheet of a topic downloads under a DISTINCT name (slug(title) alone is
 * identical for every worksheet of a topic). The code is already filename-safe
 * (`[A-Za-z0-9-]`); case is preserved so it matches the code printed on the sheet.
 * Returns "" when no code is available so the download falls back to the old name
 * rather than crashing.
 */
function codeToken(code: string | undefined | null): string {
  if (!code) return "";
  const t = String(code).replace(/[^A-Za-z0-9-]+/g, "").replace(/(^-|-$)/g, "");
  return t ? `${t}-` : "";
}

/** FIGURES-ALL-SURFACES-1 PR-2 — html2canvas rasterises whatever is loaded at that instant, so every <img> in the
 *  host (official question / solution figures) must have loaded first. A broken or slow image is given up on after
 *  `timeoutMs` and the PDF is still produced (the figure is then missing, never the whole download). */
export async function waitForImages(host: HTMLElement, timeoutMs = 8000): Promise<void> {
  const pending = Array.from(host.querySelectorAll("img")).filter((img) => !(img.complete && img.naturalWidth > 0));
  if (pending.length === 0) return;
  await Promise.race([
    Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    ),
    new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);
}

/** html2canvas mis-places an inline <svg> that is sized only by CSS (width:100% + auto margins): the solution figures came
 *  out shifted right and cropped. A plain <img> it places correctly (the question figures are <img>s), so every figure <svg>
 *  in the host is swapped for an <img> of its own serialised markup at the size the browser laid it out at. A figure that
 *  cannot be converted is left as it is (never blocks the PDF). */
export async function svgsToImages(host: HTMLElement): Promise<void> {
  // Only the figures: KaTeX draws square roots and vector arrows as inline SVG that relies on its own CSS (absolute
  // position, 100% width), so those are left alone.
  const svgs = Array.from(host.querySelectorAll(".lt-pfig__fig svg"));
  await Promise.all(
    svgs.map(async (svg) => {
      try {
        const r = svg.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0)) return;
        const clone = svg.cloneNode(true) as SVGElement;
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("width", String(Math.round(r.width)));
        clone.setAttribute("height", String(Math.round(r.height)));
        const img = new Image();
        img.className = "lt-pfig__svgimg";
        img.alt = svg.getAttribute("aria-label") || "";
        img.width = Math.round(r.width);
        img.height = Math.round(r.height);
        const loaded = new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        });
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
        await loaded;
        if (img.naturalWidth > 0) svg.replaceWith(img);
      } catch {
        /* keep the live <svg> */
      }
    }),
  );
}

/** Units a page cut must not split: a question line, an option, a step, a figure, a heading. Class names are the print
 *  document's own (.lt-wsp__*) plus the shared figure class (.lt-pfig__fig). A sheet with none of them (the Check & Improve graded
 *  sheet) has no atoms and is cut exactly as before; a graded worksheet / test sheet that has figures gets those figures kept whole.
 *  A heading is glued to the first line after it so it is never stranded at the foot of a page. */
const ATOM_SELECTOR = ".lt-wsp__qtext, .lt-wsp__opts li, .lt-wsp__step, .lt-wsp__final, .lt-wsp__solhead, .lt-wsp__sechead, .lt-wsp__instr, .lt-wsp__titlerow, .lt-wsp__src, .lt-wsp__cta, .lt-pfig__fig";

export function collectPrintAtoms(host: HTMLElement): Span[] {
  const top0 = host.getBoundingClientRect().top;
  const span = (el: Element): Span => {
    const r = el.getBoundingClientRect();
    return { top: r.top - top0, bottom: r.bottom - top0 };
  };
  const atoms: Span[] = Array.from(host.querySelectorAll(ATOM_SELECTOR)).map(span);
  const glue = (head: Element, nextSel: string, within: Element | null) => {
    const next = within?.querySelector(nextSel);
    if (next) atoms.push({ top: span(head).top, bottom: span(next).bottom });
  };
  host.querySelectorAll(".lt-wsp__solhead").forEach((h) => glue(h, ".lt-wsp__step, .lt-wsp__final, .lt-pfig__fig", h.parentElement));
  host.querySelectorAll(".lt-wsp__qtext").forEach((t) => glue(t, ".lt-pfig__fig", t.parentElement)); // "in the figure…" stays with its figure
  host.querySelectorAll(".lt-wsp__sechead").forEach((h) => glue(h, ".lt-wsp__qtext, .lt-wsp__solhead", h.nextElementSibling));
  return atoms;
}

async function waitForRenderReady(): Promise<void> {
  // Fonts (Inter / Fraunces / KaTeX) must be loaded so symbols rasterise crisply.
  try {
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown>; load?: (spec: string) => Promise<unknown> } }).fonts;
    const loadable = fonts as { load?: (spec: string) => Promise<unknown> } | undefined;
    // Ask for the faces the print docs use: `fonts.ready` alone only waits for faces already requested.
    if (loadable?.load) await Promise.all([loadable.load('600 28px "Fraunces"'), loadable.load('400 16px "Inter"')].map((p) => p.catch(() => undefined)));
    if (fonts?.ready) await fonts.ready;
  } catch {
    /* fonts API unavailable — proceed */
  }
  // Two rAFs + a short delay to ensure KaTeX spans have laid out and painted.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(resolve, 120)));
  });
}

/** What a caller may ask of the PDF (PACKS contract section 5). Existing callers pass nothing. */
export interface WorksheetPdfOptions {
  /** The buyer: printed in every page footer and on the cover; the tiled watermark is then not drawn. */
  licensee?: { name: string; email: string; orderId: string };
  /** A navy cover page, page 1 of the file. */
  cover?: { kicker: string; title: string; subtitle: string; stats: Array<{ value: string; label: string }> };
  /** Overrides the default saved file name. */
  filename?: string;
}

interface CoreOptions extends WorksheetPdfOptions {
  /** Printed on the cover as "Edition <date>": the sheet's own date, so the export never reads the clock. */
  edition?: string;
  /** Right-hand text of the running header drawn on every page after the first body page. */
  runningHeader?: string;
}

const BRAND_WORDMARK_SRC = BRAND_MARK_SRC.replace(/[^/]+$/, "lazytopper-wordmark.png");

/** The fingerprint tile and the script wordmark as data URLs for the jsPDF running header; null if they cannot be fetched
 *  (the header then falls back to the plain word). Never blocks the PDF. */
async function loadBrandDataUrls(): Promise<{ tile: string; wordmark: string } | null> {
  const toUrl = async (src: string): Promise<string> => {
    const res = await fetch(src);
    if (!res.ok) throw new Error("brand asset");
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("read"));
      r.readAsDataURL(blob);
    });
  };
  try {
    const [tile, wordmark] = await Promise.all([toUrl(BRAND_MARK_SRC), toUrl(BRAND_WORDMARK_SRC)]);
    return { tile, wordmark };
  } catch {
    return null;
  }
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 12;
const MARGIN_TOP = 15;
const FOOTER_H = 19;
const ACCENT_RGB: [number, number, number] = [63, 191, 130];
const NAVY_RGB: [number, number, number] = [21, 35, 58];
const MUTED_RGB: [number, number, number] = [58, 74, 96];

/** jsPDF's built-in fonts hold Latin-1 only; anything else would print as garbage, so it is left out of the PDF line. */
function latin1(text: string): string {
  return text.replace(/[^\u0020-\u007e\u00a0-\u00ff]/g, "").replace(/\s+/g, " ").trim();
}

/** "Licensed to <name> - <email> - Order <id> - personal use only". `ascii` keeps only what the PDF font can print. */
export function licenseeLine(l: { name: string; email: string; orderId: string }, ascii = false): string {
  const clean = (v: string) => (ascii ? latin1(String(v ?? "")) : String(v ?? "").trim());
  const parts = [clean(l.name), clean(l.email)].filter(Boolean);
  const who = parts.join(" \u00b7 ");
  return `Licensed to ${who ? `${who} \u00b7 ` : ""}Order ${clean(l.orderId)} \u2014 personal use only`;
}

/** Fit the licensee line on one footer row: shrink 9pt down to 7pt, then shorten the name, then the e-mail. */
function fitLicensee(pdf: Doc, l: { name: string; email: string; orderId: string }, maxW: number): { text: string; size: number } {
  const measure = (t: string, size: number): number => {
    pdf.setFontSize(size);
    return typeof pdf.getTextWidth === "function" ? pdf.getTextWidth(t) : 0;
  };
  const base = { name: latin1(l.name), email: latin1(l.email), orderId: latin1(l.orderId) };
  const shorten = (v: string, drop: number): string => (drop <= 0 ? v : `${v.slice(0, Math.max(1, v.length - drop))}...`);
  // drop characters from the name first (down to one), then from the e-mail; the order id is never cut
  for (let drop = 0; drop <= base.name.length + base.email.length; drop += 1) {
    const nameDrop = Math.min(drop, Math.max(0, base.name.length - 1));
    const emailDrop = drop - nameDrop;
    const text = licenseeLine({ name: shorten(base.name, nameDrop), email: shorten(base.email, emailDrop), orderId: base.orderId }, true);
    for (let size = 10; size >= 9; size -= 0.5) {
      if (measure(text, size) <= maxW) return { text, size };
    }
  }
  return { text: licenseeLine({ name: "", email: "", orderId: base.orderId }, true), size: 9 };
}

/** Per-page chrome the raster does not carry: green top rule, running header (after the first body page) and footer. */
/** The trust line printed bottom right of every LazyTopper PDF (owner ruling 1 Nov 2026) - exact wording, no variants. */
export const PDF_TRUST_LINE = "Made by an IITian (IIT Kanpur) \u00b7 lazytopper.com";

/** Draws the right-hand footer text; drops to 9pt only if it could touch the left "Page N of M" at this width. */
function drawTrustLine(pdf: Doc, leftText: string, innerW: number, y: number): void {
  pdf.setFontSize(10);
  if (typeof pdf.getTextWidth === "function") {
    const gap = 6;
    if (pdf.getTextWidth(leftText) + gap + pdf.getTextWidth(PDF_TRUST_LINE) > innerW) pdf.setFontSize(9);
  }
  pdf.text(PDF_TRUST_LINE, PAGE_W - MARGIN_X, y, { align: "right" });
  pdf.setFontSize(10);
}

function drawChrome(pdf: Doc, page: number, total: number, bodyIndex: number, opts: CoreOptions, brand: { tile: string; wordmark: string } | null): void {
  const innerW = PAGE_W - MARGIN_X * 2;
  pdf.setFillColor(...ACCENT_RGB);
  pdf.rect(0, 0, PAGE_W, 1.6, "F");

  if (bodyIndex > 0) {
    if (brand) {
      pdf.addImage(brand.tile, "PNG", MARGIN_X, 3.6, 6.4, 6.4);
      pdf.addImage(brand.wordmark, "PNG", MARGIN_X + 8, 3.9, 21, 6);
    } else {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(...NAVY_RGB);
      pdf.text("LazyTopper", MARGIN_X, 8.5);
    }
    if (opts.runningHeader) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...MUTED_RGB);
      let h = latin1(opts.runningHeader);
      if (typeof pdf.getTextWidth === "function") {
        while (h.length > 4 && pdf.getTextWidth(h) > innerW - 44) h = `${h.slice(0, h.length - 4)}...`;
      }
      pdf.text(h, PAGE_W - MARGIN_X, 8.5, { align: "right" });
    }
    pdf.setDrawColor(216, 222, 230);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN_X, 11.5, PAGE_W - MARGIN_X, 11.5);
  }

  pdf.setDrawColor(216, 222, 230);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN_X, PAGE_H - 17, PAGE_W - MARGIN_X, PAGE_H - 17);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...MUTED_RGB);
  if (opts.licensee) {
    const fit = fitLicensee(pdf, opts.licensee, innerW);
    pdf.setFontSize(fit.size);
    pdf.text(fit.text, MARGIN_X, PAGE_H - 12.5);
    pdf.setFontSize(10);
    pdf.text(`Page ${page} of ${total}`, MARGIN_X, PAGE_H - 6.5);
    drawTrustLine(pdf, `Page ${page} of ${total}`, innerW, PAGE_H - 6.5);
  } else {
    pdf.setFontSize(10);
    pdf.text(`Page ${page} of ${total}`, MARGIN_X, PAGE_H - 10);
    drawTrustLine(pdf, `Page ${page} of ${total}`, innerW, PAGE_H - 10);
  }
}

/** A detached offscreen host that holds ONLY the element handed in; always cleaned up. */
async function withHost<T>(width: number, element: ReactElement, run: (host: HTMLElement) => Promise<T>): Promise<T> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.position = "fixed";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.width = `${width}px`;
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    // LOW-END-1 (owner ruling 2): MathText fetches KaTeX on demand, and this capture runs
    // only ~2 frames after rendering - so the export ALWAYS waits for KaTeX first. Without
    // it a PDF could rasterise MathText's plain-text stand-in instead of the maths.
    await loadKatex();
    root.render(element);
    await waitForRenderReady();
    await waitForImages(host);
    await svgsToImages(host);
    return await run(host);
  } finally {
    root.unmount();
    if (host.parentNode) host.parentNode.removeChild(host);
  }
}

/**
 * Shared core: render a React element into a DETACHED offscreen host containing
 * ONLY that element, rasterise it, paginate across A4 with crisp jsPDF page chrome,
 * and save as `filename`. Every worksheet PDF (questions / answer-key / graded
 * sheet) goes through this one path - no per-variant PDF mechanism.
 */
async function renderElementToPdf(element: ReactElement, filename: string, opts: CoreOptions = {}): Promise<string> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // The cover (PDF-REBRAND-1) is its own full-bleed page; loaded only when asked for.
  let coverJpeg: string | null = null;
  if (opts.cover) {
    const { PrintCover, COVER_W } = await import("./PrintCover");
    const cover = opts.cover;
    coverJpeg = await withHost(COVER_W, createElement(PrintCover, {
      ...cover,
      licenseeLine: opts.licensee ? licenseeLine(opts.licensee) : undefined,
      edition: opts.edition,
    }), async (coverHost) => {
      const c = await html2canvas(coverHost, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false, windowWidth: COVER_W });
      return c.toDataURL("image/jpeg", 0.95);
    });
  }

  return withHost(HOST_WIDTH, element, async (host) => {
    // Where a page may be cut, measured now (the laid-out DOM) and converted to canvas pixels after the capture.
    const atomsCss = collectPrintAtoms(host);
    const hostH = host.getBoundingClientRect().height;

    const canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: HOST_WIDTH,
    });

    // 2. Paginate the tall raster across A4, leaving room for the crisp jsPDF page chrome.
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const imgW = PAGE_W - MARGIN_X * 2;
    const usableH = PAGE_H - MARGIN_TOP - FOOTER_H;
    const pxPerMm = canvas.width / imgW || 1;
    const sliceHpx = Math.max(1, Math.floor(usableH * pxPerMm));
    const yScale = hostH > 0 ? canvas.height / hostH : 1;
    const slices = planSlices(
      atomsCss.map((a) => ({ top: a.top * yScale, bottom: a.bottom * yScale })),
      canvas.height,
      sliceHpx,
    );
    const bodyPages = Math.max(1, slices.length);
    const offset = coverJpeg ? 1 : 0;
    const totalPages = bodyPages + offset;

    const brand = totalPages > 1 ? await loadBrandDataUrls() : null;
    if (coverJpeg) pdf.addImage(coverJpeg, "JPEG", 0, 0, PAGE_W, PAGE_H);

    for (let page = 0; page < bodyPages; page += 1) {
      // integer page edges taken from ONE rounding of each cut, so a page never drops or repeats a canvas pixel
      const yPx = page === 0 ? 0 : Math.round(slices[page].y);
      const nextY = page + 1 < slices.length ? Math.round(slices[page + 1].y) : canvas.height;
      const hPx = Math.max(1, Math.min(nextY, canvas.height) - yPx);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = hPx;
      const sctx = slice.getContext("2d");
      if (sctx) {
        sctx.fillStyle = "#ffffff";
        sctx.fillRect(0, 0, slice.width, slice.height);
        sctx.drawImage(canvas, 0, yPx, canvas.width, hPx, 0, 0, canvas.width, hPx);
      }
      if (page > 0 || coverJpeg) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", MARGIN_X, MARGIN_TOP, imgW, hPx / pxPerMm);
      drawChrome(pdf, page + 1 + offset, totalPages, page, opts, brand);
    }

    pdf.save(filename);
    return filename;
  });
}

/** "20 Jun 2026" from the sheet's ISO date; "" when it is missing or unreadable. */
function editionOf(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
}

/** The diagrams registry loads only when a PDF with solutions is actually produced. */
async function loadSolutionFigureRenderer(): Promise<RenderSolutionFigure | undefined> {
  try {
    return (await import("../../diagrams/printSolutionFigure")).renderPrintSolutionFigure;
  } catch {
    return undefined; // honest: no solution figures rather than no PDF
  }
}

/**
 * Render + download one worksheet PDF (questions-only or answer-key) as a real
 * file. Returns the filename saved (handy for tests / telemetry).
 */
export async function exportWorksheetPdf(
  ws: PersistedWorksheet,
  kind: "questions" | "answers",
  code?: string,
  opts?: WorksheetPdfOptions,
): Promise<string> {
  const suffix = kind === "answers" ? "answer-key" : "questions";
  const filename = opts?.filename || `lazytopper-${slug(ws.title)}-${codeToken(code)}${suffix}.pdf`;
  const renderSolutionFigure = kind === "answers" ? await loadSolutionFigureRenderer() : undefined;
  return renderElementToPdf(
    createElement(WorksheetPrintDoc, { ws, kind, code, renderSolutionFigure, watermark: !opts?.licensee }),
    filename,
    { ...opts, edition: editionOf(ws.createdAt), runningHeader: `${ws.subject} \u00b7 ${ws.title} \u00b7 ${kind === "answers" ? "Answer key" : "Questions"}` },
  );
}

/**
 * PR-A: render + download the BRANDED GRADED sheet. Renders the SAME grade
 * `response` already on screen (a snapshot, never a re-grade — honesty §2(3)) via
 * the shared html2canvas → jsPDF path. `name`/`code` are the worksheet's
 * nomenclature; `coaching` is the product-voice footer line.
 */
export async function exportGradedWorksheetPdf(args: {
  ws: PersistedWorksheet;
  response: WorksheetGradeResponse;
  name: string;
  code: string;
  coaching: string;
  /** QP-GRADED-SHEET-1 — optional header word ("Quick Practice"); absent ⇒ the doc's "Worksheet",
   *  so every existing caller renders exactly as before. */
  kindLabel?: string;
}): Promise<string> {
  const { ws, response, name, code, coaching, kindLabel } = args;
  const filename = `lazytopper-${slug(name || ws.title)}-${codeToken(code)}graded.pdf`;
  return renderElementToPdf(
    createElement(WorksheetGradedPrintDoc, {
      ws, response, name, code, coaching, renderSolutionFigure: await loadSolutionFigureRenderer(),
      ...(kindLabel ? { kindLabel } : {}),
    }),
    filename,
    { runningHeader: `${ws.subject} \u00b7 ${name || ws.title} \u00b7 Graded sheet` },
  );
}

/**
 * Render + download the branded Check & Improve GRADED solution sheet. Reuses the
 * SAME shared html2canvas → jsPDF core (`renderElementToPdf`) as the worksheet
 * export, so the two stay visually consistent (a bridge toward the Universal
 * <ResultsScorecard>). Renders the grade already on screen — a snapshot, never a
 * re-grade. Works for both the single-question and multi-question C&I paths (the
 * caller normalises either into `CheckImproveGradedPrintDocProps.questions`).
 */
export async function exportGradedCheckImprovePdf(
  props: CheckImproveGradedPrintDocProps,
): Promise<string> {
  const filename = `lazytopper-${slug(props.name || props.code || "check-improve")}-graded.pdf`;
  return renderElementToPdf(createElement(CheckImproveGradedPrintDoc, props), filename, {
    runningHeader: `Answer Checker \u00b7 ${props.name || props.code || "Graded sheet"}`,
  });
}
