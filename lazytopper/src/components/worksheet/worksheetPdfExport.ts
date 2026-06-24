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
    root.render(element);
    await waitForRenderReady();

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
    const totalPages = Math.max(1, Math.ceil(canvas.height / sliceHpx));

    for (let page = 0; page < totalPages; page += 1) {
      const yPx = page * sliceHpx;
      const hPx = Math.min(sliceHpx, canvas.height - yPx);
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

/**
 * Render + download one worksheet PDF (questions-only or answer-key) as a real
 * file. Returns the filename saved (handy for tests / telemetry).
 */
export async function exportWorksheetPdf(
  ws: PersistedWorksheet,
  kind: "questions" | "answers",
): Promise<string> {
  const suffix = kind === "answers" ? "answer-key" : "questions";
  const filename = `lazytopper-${slug(ws.title)}-${suffix}.pdf`;
  return renderElementToPdf(createElement(WorksheetPrintDoc, { ws, kind }), filename);
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
  const filename = `lazytopper-${slug(name || ws.title)}-graded.pdf`;
  return renderElementToPdf(
    createElement(WorksheetGradedPrintDoc, { ws, response, name, code, coaching }),
    filename,
  );
}
