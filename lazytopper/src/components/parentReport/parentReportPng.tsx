import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import ParentReportCard from "./ParentReportCard";
import type { ParentReport } from "./parentReportModel";

/**
 * PARENT-REPORT-1 — draw the report card off-screen and return it as a 1080 x 1350 PNG. The same
 * pipeline as SHARE-SCORE-1's `renderSharePng` (html-to-image, imported only here, so it adds
 * nothing to the page that hosts the button): a dedicated card rendered from the allow-listed
 * model, never a screenshot of the live page.
 */
export const PARENT_REPORT_FILENAME = "lazytopper-weekly-report.png";

export async function renderParentReportPng(report: ParentReport): Promise<Blob> {
  const { toBlob } = await import("html-to-image");
  const host = document.createElement("div");
  host.className = "lt-prc-stage";
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<ParentReportCard report={report} />));
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) await fonts.ready;
    const node = host.querySelector<HTMLElement>(".lt-prc");
    if (!node) throw new Error("report card did not render");
    const blob = await toBlob(node, { width: 1080, height: 1350, pixelRatio: 1, backgroundColor: "#15233a" });
    if (!blob) throw new Error("report image is empty");
    return blob;
  } finally {
    root.unmount();
    host.remove();
  }
}
