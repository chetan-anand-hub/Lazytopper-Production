/**
 * packBridge - the facts behind pages 2 and 3 of every PURCHASED pack PDF (BRIDGE-PDF-1, owner rulings 8 Nov 2026 18:45-19:38:
 * "Get this paper marked like a CBSE examiner" + "What you get back, screen by screen"). PURE and tiny: no bank, no services.
 *
 * Who sees the pages: buyers only. They are added ONLY when the caller passes `bridge` in the build context (PacksShop's My packs
 * download), so the free sample pages and the shop previews, which run the same file builders, never carry them.
 *
 * The sample shown on both pages is ONE real paper, PK-M-RN-CT1, written by our team with deliberate mistakes and marked by the
 * product; it is labelled as such on the page (doctrine: no fake data). Only the header (the pack) and the example code change per pack.
 */
import type { PackSku, PackSubject } from "../../services/packs";
import { BUNDLE_NAME } from "./packLabels";

/** The full marked sample, hosted once (never embedded in a pack file). "See a marked sample" in the PDF and My packs open it. */
export const BRIDGE_SAMPLE_PDF_PATH = "/media/lazytopper-marked-sample-PK-M-RN-CT1.pdf";
/** The PDF link targets must be absolute (a PDF has no origin). */
export const BRIDGE_SITE = "https://www.lazytopper.com";
export const BRIDGE_SAMPLE_PDF_URL = `${BRIDGE_SITE}${BRIDGE_SAMPLE_PDF_PATH}`;
export const BRIDGE_PRICING_URL = `${BRIDGE_SITE}/pricing`;
// One link everywhere: My packs is the first thing an owner sees on /packs (#1645), so no hash (owner 9 Nov).
export const BRIDGE_PACKS_URL = `${BRIDGE_SITE}/packs`;

/** The sample scorecard images (crops of the real PK-M-RN-CT1 scorecard), served from public/media/pack-bridge/. */
export const BRIDGE_IMG = Object.freeze({
  total: "/media/pack-bridge/sample-total.jpg",
  q7: "/media/pack-bridge/q7-strip.jpg",
  views: [
    "/media/pack-bridge/view1-score.jpg",
    "/media/pack-bridge/view2-sections.jpg",
    "/media/pack-bridge/view3-where.jpg",
    "/media/pack-bridge/view4-q10.jpg",
    "/media/pack-bridge/view5-q11.jpg",
    "/media/pack-bridge/view6-q14.jpg",
  ] as readonly string[],
  next: "/media/pack-bridge/view7-next.jpg",
});

/** What the two pages print for one file. */
export interface BridgePagesData {
  /** Top-left header, e.g. "Real Numbers · Chapter Pack". */
  packLabel: string;
  /** A paper code from THIS pack (step 1: "e.g. PK-M-RN-CT1"); null -> the "e.g." clause is left out (a CBQ file before BRIDGE-CODES-1). */
  exampleCode: string | null;
  /** This file itself carries a paper code + QR (tests, worksheets, mocks, CBQ sets). False for question-bank sections (owner 9 Nov). */
  ownCode?: boolean;
  /** The Board Pass card on page 2. False for a student who already holds a paid Board Pass (they are not sold it again). */
  boardPassCard: boolean;
}

/** The build-context switch: present only on the real buyer download. */
export interface BridgeContext {
  /**
   * The student's PAID Board Pass (`isPaidPremium`), resolved before the build: true -> page 2 leaves the Board Pass box out (they have
   * it); null -> not known yet (a fresh device whose entitlement did not load) -> also left out; only false shows it.
   */
  paidBoardPass: boolean | null;
}

function subjectName(s: PackSubject | string): string {
  return s === "science" ? "Science" : "Maths";
}

/** The pack's own name, as the checkout names it (services/packs.ts packDescription), for the page header. */
export function bridgePackName(sku: PackSku, target: string): string {
  switch (sku) {
    case "pack_chapter":
      return "Chapter Pack";
    case "pack_mock":
      return "Mock Pack";
    case "pack_subject":
      return `${subjectName(target)} Subject Pack`;
    case "pack_bundle":
      return BUNDLE_NAME;
    case "pack_cbq":
      return `${subjectName(target)} CBQ Pack`;
  }
}

/**
 * "Real Numbers · Chapter Pack", "Maths · Mock Pack", "Real Numbers · Maths CBQ Pack". A Subject Pack and the Bundle are headed by the
 * pack's own title alone ("Maths Subject Pack", "Maths + Science Bundle"), as the checkout names them (review FU-10). `target` is the
 * pack's subject for subject / mock / CBQ packs.
 */
export function bridgePackLabel(scope: string, sku: PackSku, target: string): string {
  const name = bridgePackName(sku, target);
  if (sku === "pack_subject" || sku === "pack_bundle") return name;
  return name.startsWith(`${scope} `) ? name : `${scope} · ${name}`;
}

/**
 * The example code for a CBQ file that carries no code of its own (the "How examiners mark a CBQ" intro). A CBQ paper file shows its
 * OWN printed code once BRIDGE-CODES-1 (#1643) gives CBQ files one (buildPackFiles reads `spec.paper.code` first), with no change here.
 * Until then this is null and page 2 leaves the "e.g. <code>" clause out. After #1643 it can return `cbqPackExampleCode(subject)`.
 */
export function cbqBridgeExampleCode(_subject: PackSubject, _chapterSlug: string): string | null {
  return null;
}
