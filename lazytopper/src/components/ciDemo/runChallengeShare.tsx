import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { trackFriendChallenge } from "../../analytics/analytics";
import { downloadBlob, openWhatsAppLink, pickShareMethod, shareNative, type ShareNavigator } from "../results/share/shareScore";
import ChallengeCard from "./ChallengeCard";
import { CHALLENGE_FILENAME, challengeText, type ChallengeCardModel, type ChallengeChannel } from "./challengeModel";

/**
 * FRIEND-CHALLENGE-1 - the LAZY half of "Challenge a friend": draw the card off-screen, turn it into a
 * 1080 x 1920 PNG (html-to-image, imported dynamically like SHARE-CARD-1's), and run one channel tap.
 * Reuses the score share's browser plumbing (pickShareMethod / shareNative / openWhatsAppLink / downloadBlob).
 */

const W = 1080;
const H = 1920;
const FONT_FACES = ['800 64px "Fraunces"', '800 32px "Inter"', '700 32px "Inter"', '600 32px "Inter"'];

async function waitForAssets(node: HTMLElement): Promise<void> {
  const fonts = (document as Document & { fonts?: { load?: (f: string) => Promise<unknown>; ready?: Promise<unknown> } }).fonts;
  if (fonts?.load) await Promise.all(FONT_FACES.map((f) => fonts.load!(f).catch(() => undefined)));
  if (fonts?.ready) await fonts.ready;
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(imgs.map((img) => (typeof img.decode === "function" ? img.decode().catch(() => undefined) : Promise.resolve(undefined))));
}

/** Draw the card off-screen and return it as a PNG blob. */
export async function renderChallengePng(model: ChallengeCardModel): Promise<Blob> {
  const { toBlob } = await import("html-to-image");
  const host = document.createElement("div");
  host.className = "lt-share-stage";
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<ChallengeCard model={model} />));
    const node = host.querySelector<HTMLElement>(".lt-fc");
    if (!node) throw new Error("challenge card did not render");
    await waitForAssets(node);
    const blob = await toBlob(node, { width: W, height: H, pixelRatio: 1, backgroundColor: "#0b1430", cacheBust: false });
    if (!blob) throw new Error("challenge image is empty");
    return blob;
  } finally {
    root.unmount();
    host.remove();
  }
}

export interface ChallengeImage {
  model: ChallengeCardModel;
  blob: Blob;
  file: File;
  /** The message that travels with the image: lead + "Can you beat them?" + link. */
  text: string;
}

export async function makeChallengeImage(model: ChallengeCardModel): Promise<ChallengeImage> {
  const blob = await renderChallengePng(model);
  const file = new File([blob], CHALLENGE_FILENAME, { type: "image/png" });
  return { model, blob, file, text: challengeText(model.firstName, model.chapter, model.link) };
}

export type ChallengeOutcome = "shared" | "opened" | "downloaded" | "copied" | "cancelled" | "needs-tap" | "failed";

export interface ChallengeChannelContext {
  image: ChallengeImage;
  nav?: ShareNavigator & { clipboard?: unknown };
  open?: (url: string, target: string) => { opener: unknown } | null | undefined;
  writeClipboard?: (text: string) => Promise<void>;
}

/**
 * One channel tap (call it straight from the click: navigator.share / window.open run before the first await).
 *   native    the OS sheet with the PNG + text; a refusal that is not a cancel saves the PNG
 *   whatsapp  a phone that shares files: the PNG + text through the OS sheet; else wa.me with the text + link,
 *             and the PNG saved to attach
 *   copy      the link only goes to the clipboard
 *   download  the PNG saved
 * The `friend_challenge_share` event fires only when something actually went out.
 */
export async function runChallengeChannel(channel: ChallengeChannel, ctx: ChallengeChannelContext): Promise<ChallengeOutcome> {
  const { image, nav } = ctx;
  const done = (c: ChallengeChannel) => trackFriendChallenge("friend_challenge_share", { channel: c });

  if (channel === "copy") {
    try {
      if (!ctx.writeClipboard) return "failed";
      await ctx.writeClipboard(image.model.link);
      done("copy");
      return "copied";
    } catch {
      return "failed";
    }
  }
  if (channel === "download") {
    downloadBlob(image.blob, image.file.name);
    done("download");
    return "downloaded";
  }
  const canNative = !!nav && pickShareMethod(nav, image.file) === "native";
  if ((channel === "native" || channel === "whatsapp") && canNative && nav) {
    const outcome = await shareNative(nav, image.file, image.text);
    if (outcome === "shared") {
      done(channel);
      return "shared";
    }
    if (outcome === "cancelled" || outcome === "needs-tap") return outcome;
    if (channel === "native") {
      downloadBlob(image.blob, image.file.name);
      done("download");
      return "downloaded";
    }
    // whatsapp + a refusal that is not a cancel: fall through to the link below.
  }
  if (channel === "whatsapp") {
    const opened = ctx.open ? openWhatsAppLink(image.text, ctx.open) : false;
    downloadBlob(image.blob, image.file.name);
    done(opened ? "whatsapp" : "download");
    return opened ? "opened" : "downloaded";
  }
  // native with no file sharing here (desktop): the image is saved, logged honestly as a download.
  downloadBlob(image.blob, image.file.name);
  done("download");
  return "downloaded";
}

