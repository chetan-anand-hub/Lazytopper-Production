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
 *  out shifted right and cropped. A plain <img> it places correctly (the question figures are <img>s), so every <svg> in
 *  the host is swapped for an <img> of its own serialised markup at the size the browser laid it out at. A figure that
 *  cannot be converted is left as it is (never blocks the PDF). */
export async function svgsToImages(host: HTMLElement): Promise<void> {
  const svgs = Array.from(host.querySelectorAll("svg"));
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
 *  document's own; a document without them (the graded sheets) simply has no atoms and is cut as before. A heading is glued
 *  to the first line after it so it is never stranded at the foot of a page. */
const ATOM_SELECTOR = ".lt-wsp__qtext, .lt-wsp__opts li, .lt-wsp__step, .lt-wsp__final, .lt-wsp__solhead, .lt-wsp__sechead, .lt-wsp__instr, .lt-wsp__titlerow, .lt-pfig__fig";

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
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) await fonts.ready;
  } catch {
    /* fonts API unavailable — proceed */
  }
  // Two rAFs + a short delay to ensure KaTeX spans have laid out and painted.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(resolve, 120)));
  });
}

function drawFooter(pdf: Doc, page: number, total: number): void {
  const pageW = 210;
  const pageH = 297;
  const marginX = 12;
  pdf.setDrawColor(216, 216, 216);
  pdf.setLineWidth(0.2);
  pdf.line(marginX, pageH - 12, pageW - marginX, pageH - 12);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(85, 85, 85);
  pdf.text(`Page ${page} of ${total}`, marginX, pageH - 8);
  pdf.text("LazyTopper · lazytopper.com · © LazyTopper", pageW - marginX, pageH - 8, { align: "right" });
}

/**
 * Shared core: render a React element into a DETACHED offscreen host containing
 * ONLY that element, rasterise it, paginate across A4 with a crisp jsPDF footer,
 * and save as `filename`. Every worksheet PDF (questions / answer-key / graded
 * sheet) goes through this one path — no per-variant PDF mechanism.
 */
async function renderElementToPdf(element: ReactElement, filename: string): Promise<string> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // 1. Detached offscreen host containing ONLY the print doc.
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.position = "fixed";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.width = `${HOST_WIDTH}px`;
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    // LOW-END-1 (owner ruling 2): MathText fetches KaTeX on demand, and this capture runs
    // only ~2 frames after rendering — so the export ALWAYS waits for KaTeX first. Without
    // it a PDF could rasterise MathText's plain-text stand-in instead of the maths.
    await loadKatex();
    root.render(element);
    await waitForRenderReady();
    await waitForImages(host);
    await svgsToImages(host);

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

    // 2. Paginate the tall raster across A4, leaving room for a crisp jsPDF footer.
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const marginX = 12;
    const marginTop = 10;
    const footerH = 14;
    const imgW = pageW - marginX * 2;
    const usableH = pageH - marginTop - footerH;
    const pxPerMm = canvas.width / imgW || 1;
    const sliceHpx = Math.max(1, Math.floor(usableH * pxPerMm));
    const yScale = hostH > 0 ? canvas.height / hostH : 1;
    const slices = planSlices(
      atomsCss.map((a) => ({ top: a.top * yScale, bottom: a.bottom * yScale })),
      canvas.height,
      sliceHpx,
    );
    const totalPages = Math.max(1, slices.length);

    for (let page = 0; page < totalPages; page += 1) {
      const yPx = Math.round(slices[page].y);
      const hPx = Math.max(1, Math.min(Math.round(slices[page].h), canvas.height - yPx));
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = hPx;
      const sctx = slice.getContext("2d");
      if (sctx) {
        sctx.fillStyle = "#ffffff";
        sctx.fillRect(0, 0, slice.width, slice.height);
        sctx.drawImage(canvas, 0, yPx, canvas.width, hPx, 0, 0, canvas.width, hPx);
      }
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", marginX, marginTop, imgW, hPx / pxPerMm);
      drawFooter(pdf, page + 1, totalPages);
    }

    pdf.save(filename);
    return filename;
  } finally {
    root.unmount();
    if (host.parentNode) host.parentNode.removeChild(host);
  }
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
): Promise<string> {
  const suffix = kind === "answers" ? "answer-key" : "questions";
  const filename = `lazytopper-${slug(ws.title)}-${codeToken(code)}${suffix}.pdf`;
  const renderSolutionFigure = kind === "answers" ? await loadSolutionFigureRenderer() : undefined;
  return renderElementToPdf(createElement(WorksheetPrintDoc, { ws, kind, code, renderSolutionFigure }), filename);
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
}): Promise<string> {
  const { ws, response, name, code, coaching } = args;
  const filename = `lazytopper-${slug(name || ws.title)}-${codeToken(code)}graded.pdf`;
  return renderElementToPdf(
    createElement(WorksheetGradedPrintDoc, { ws, response, name, code, coaching, renderSolutionFigure: await loadSolutionFigureRenderer() }),
    filename,
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
  return renderElementToPdf(createElement(CheckImproveGradedPrintDoc, props), filename);
}
