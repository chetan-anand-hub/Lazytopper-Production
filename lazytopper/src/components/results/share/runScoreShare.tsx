import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { trackScoreShare, type ScorecardSurface as AnalyticsScorecardSurface } from "../../../analytics/analytics";
import type { ScorecardSurface, ScorecardVariant } from "../scorecardVariants";
import ShareCard from "./ShareCard";
import { buildShareCardModel, formatShareDate, shareText, type ShareCardModel } from "./shareCardModel";
import { SHARE_FILENAME, downloadBlob, shareNative, type NativeShareOutcome, type ShareMethod, type ShareNavigator } from "./shareScore";

/**
 * SHARE-SCORE-1 - the LAZY half of the share flow. ResultsScorecard reaches this module
 * only through `import("./share/runScoreShare")` inside the tap handler, so it - and
 * html-to-image, imported dynamically below - adds nothing to the scorecard's open.
 *
 * It draws the dedicated ShareCard off-screen (never the live scorecard DOM), turns it
 * into a 1080 x 1350 PNG, then either opens the OS share sheet (native) or saves the PNG
 * (the desktop fallback; wa.me was already opened synchronously by the button, inside the
 * tap's user activation).
 */

export type ScoreShareOutcome = NativeShareOutcome | "downloaded";

export interface ScoreShareResult {
  outcome: ScoreShareOutcome;
  /** Kept on "needs-tap" so the next tap shares at once, inside a fresh activation. */
  file?: File;
}

export interface RunScoreShareOptions {
  method: ShareMethod;
  nav?: ShareNavigator;
  /** Test seam: the date shown on the card (default: today). */
  dateLabel?: string;
}

const ANALYTICS_SURFACE: Record<ScorecardSurface, AnalyticsScorecardSurface> = {
  worksheet: "worksheet",
  "quick-practice": "quick_practice",
  "chapter-test": "chapter_test",
  "full-mock": "full_mock",
  "check-improve": "check_improve",
};

/** `score_share` {surface, method} - sent only when a share actually went out: the OS sheet
 *  completed (native), or wa.me was opened (whatsapp_link). Never on a cancel or a failure. */
export function reportScoreShare(surface: ScorecardSurface, method: ShareMethod): void {
  trackScoreShare(ANALYTICS_SURFACE[surface], method);
}

/** Draw the card off-screen and return it as a PNG blob. */
export async function renderSharePng(model: ShareCardModel): Promise<Blob> {
  const { toBlob } = await import("html-to-image");
  const host = document.createElement("div");
  host.className = "lt-share-stage";
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<ShareCard model={model} />));
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) await fonts.ready;
    const node = host.querySelector<HTMLElement>(".lt-share");
    if (!node) throw new Error("share card did not render");
    const blob = await toBlob(node, { width: 1080, height: 1350, pixelRatio: 1, backgroundColor: "#15233a" });
    if (!blob) throw new Error("share image is empty");
    return blob;
  } finally {
    root.unmount();
    host.remove();
  }
}

export async function runScoreShare(variant: ScorecardVariant, opts: RunScoreShareOptions): Promise<ScoreShareResult> {
  const model = buildShareCardModel(variant, opts.dateLabel ?? formatShareDate(new Date()));
  if (!model) return { outcome: "failed" };
  // Desktop: wa.me was opened by the button inside the tap - that IS the share.
  if (opts.method === "whatsapp_link") reportScoreShare(variant.surface, "whatsapp_link");
  let blob: Blob;
  try {
    blob = await renderSharePng(model);
  } catch {
    return { outcome: "failed" };
  }
  const file = new File([blob], SHARE_FILENAME, { type: "image/png" });
  if (opts.method === "native" && opts.nav) {
    const outcome = await shareNative(opts.nav, file, shareText(model));
    if (outcome === "shared") reportScoreShare(variant.surface, "native");
    if (outcome === "failed") {
      // The sheet refused for another reason: still give the student their image.
      downloadBlob(blob, SHARE_FILENAME);
      return { outcome: "downloaded" };
    }
    return outcome === "needs-tap" ? { outcome, file } : { outcome };
  }
  downloadBlob(blob, SHARE_FILENAME);
  return { outcome: "downloaded" };
}
