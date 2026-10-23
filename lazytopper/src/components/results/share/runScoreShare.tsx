import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  trackScorecardShare,
  type ScorecardShareChannel,
  type ScorecardSurface as AnalyticsScorecardSurface,
} from "../../../analytics/analytics";
import type { ScorecardSurface, ScorecardVariant } from "../scorecardVariants";
import ShareCard from "./ShareCard";
import {
  SHARE_SIZES,
  buildShareCardModel,
  formatShareDate,
  shareText,
  type ShareCardModel,
  type ShareSize,
} from "./shareCardModel";
import { downloadBlob, openWhatsAppLink, pickShareMethod, shareNative, shareFilename, type ShareNavigator } from "./shareScore";

/**
 * SHARE-CARD-1 - the LAZY half of the share flow. The scorecard's "Share result" button reaches
 * this module only through the share sheet's dynamic import, so it - the card, the mascot rig,
 * html-to-image and qrcode (both imported dynamically below) - adds nothing to the scorecard's
 * open.
 *
 * It draws the dedicated ShareCard off-screen (never the live scorecard DOM), waits for its fonts
 * and images, and turns it into a PNG at 1080 x 1920 (story) or 1080 x 1080 (square). The share
 * sheet renders the image BEFORE the student taps a channel, so the tap itself shares at once,
 * inside its own user activation.
 */

const ANALYTICS_SURFACE: Record<ScorecardSurface, AnalyticsScorecardSurface> = {
  worksheet: "worksheet",
  "quick-practice": "quick_practice",
  "chapter-test": "chapter_test",
  "full-mock": "full_mock",
  "check-improve": "check_improve",
};

/** `scorecard_share` {surface, size, channel} - only when a share actually went out (the sheet
 *  completed, wa.me opened, the story image was shared or saved, or the PNG was saved). Never
 *  on a cancel or a failure. */
export function reportScorecardShare(surface: ScorecardSurface, size: ShareSize, channel: ScorecardShareChannel): void {
  trackScorecardShare(ANALYTICS_SURFACE[surface], size, channel);
}

const FONT_FACES = ['700 64px "Fraunces"', '800 32px "Inter"', '700 32px "Inter"', '400 32px "Inter"'];

/** Fonts first (owner rule: never draw before the fonts are in), then every image decoded. */
async function waitForAssets(node: HTMLElement): Promise<void> {
  const fonts = (document as Document & { fonts?: { load?: (f: string) => Promise<unknown>; ready?: Promise<unknown> } }).fonts;
  if (fonts?.load) await Promise.all(FONT_FACES.map((f) => fonts.load!(f).catch(() => undefined)));
  if (fonts?.ready) await fonts.ready;
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => (typeof img.decode === "function" ? img.decode().catch(() => undefined) : Promise.resolve(undefined))),
  );
}

/** The QR for the public link, or null if it cannot be drawn (the link text still shows). */
export async function shareQrDataUrl(link: string): Promise<string | null> {
  try {
    const { generateQRDataUrl } = await import("../../../services/referralService");
    return await generateQRDataUrl(link, 320);
  } catch {
    return null;
  }
}

/** Draw the card off-screen and return it as a PNG blob at the model's size. */
export async function renderSharePng(model: ShareCardModel, qrDataUrl: string | null = null): Promise<Blob> {
  const { toBlob } = await import("html-to-image");
  const { width, height } = SHARE_SIZES[model.size];
  const host = document.createElement("div");
  host.className = "lt-share-stage";
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<ShareCard model={model} qrDataUrl={qrDataUrl} />));
    const node = host.querySelector<HTMLElement>(".lt-share");
    if (!node) throw new Error("share card did not render");
    await waitForAssets(node);
    const blob = await toBlob(node, { width, height, pixelRatio: 1, backgroundColor: "#10203a", cacheBust: false });
    if (!blob) throw new Error("share image is empty");
    return blob;
  } finally {
    root.unmount();
    host.remove();
  }
}

export interface ShareImageOptions {
  size: ShareSize;
  showMascots: boolean;
  firstName: string | null;
  /** Test seam: the date shown on the card (default: today). */
  dateLabel?: string;
  qrDataUrl?: string | null;
}

export interface ShareImage {
  model: ShareCardModel;
  blob: Blob;
  file: File;
  text: string;
}

/** Build the model and its PNG for one size, or null when the scorecard is not shareable. */
export async function makeShareImage(variant: ScorecardVariant, opts: ShareImageOptions): Promise<ShareImage | null> {
  const model = buildShareCardModel(variant, {
    dateLabel: opts.dateLabel ?? formatShareDate(new Date()),
    size: opts.size,
    showMascots: opts.showMascots,
    firstName: opts.firstName,
  });
  if (!model) return null;
  const blob = await renderSharePng(model, opts.qrDataUrl ?? null);
  const file = new File([blob], shareFilename(opts.size), { type: "image/png" });
  return { model, blob, file, text: shareText(model) };
}

export type ShareChannelOutcome = "shared" | "opened" | "downloaded" | "cancelled" | "needs-tap" | "failed";

export interface ShareChannelContext {
  surface: ScorecardSurface;
  image: ShareImage;
  nav?: ShareNavigator;
  open?: (url: string, target: string) => { opener: unknown } | null | undefined;
}

/**
 * One channel tap. Every browser call that needs the tap's user activation (navigator.share,
 * window.open) is made SYNCHRONOUSLY, before the first await, so call this straight from the
 * click handler with an image that is already drawn.
 *
 *   native     the OS sheet with the PNG + text (WhatsApp, Instagram, anything installed);
 *              a refusal that is not a cancel saves the PNG instead
 *   whatsapp   wa.me with the text + public link, and the PNG saved to attach
 *   instagram  the STORY image: the OS sheet where files can be shared, else saved to post
 *   download   the PNG saved
 */
export async function runShareChannel(channel: ScorecardShareChannel, ctx: ShareChannelContext): Promise<ShareChannelOutcome> {
  const { image, surface, nav } = ctx;
  const size = image.model.size;
  const save = (): ShareChannelOutcome => {
    downloadBlob(image.blob, image.file.name);
    return "downloaded";
  };

  if (channel === "whatsapp") {
    const opened = ctx.open ? openWhatsAppLink(image.text, ctx.open) : false;
    save();
    reportScorecardShare(surface, size, opened ? "whatsapp" : "download");
    return opened ? "opened" : "downloaded";
  }

  if (channel === "download") {
    save();
    reportScorecardShare(surface, size, "download");
    return "downloaded";
  }

  // native / instagram: the OS sheet when this browser can share THIS file.
  if (nav && pickShareMethod(nav, image.file) === "native") {
    const outcome = await shareNative(nav, image.file, image.text);
    if (outcome === "shared") {
      reportScorecardShare(surface, size, channel);
      return "shared";
    }
    if (outcome === "failed") {
      save();
      reportScorecardShare(surface, size, "download");
      return "downloaded";
    }
    return outcome;
  }
  // No file sharing here (desktop): save the image - for Instagram, the story image to post.
  save();
  reportScorecardShare(surface, size, channel === "instagram" ? "instagram" : "download");
  return "downloaded";
}
