/**
 * packSamples - the FREE SAMPLE PAGE of every PDF pack (PACK-SAMPLE-1, owner ruling 2 Nov 2026).
 *
 * LIGHT on purpose (no bank, no jsPDF): the pack tiles, the pack pop-up, the CBQ band and the tests import this. A sample is ONE
 * pre-generated A4 page, committed under `public/samples/`, so a visitor downloads it without signing up and the full paid PDFs
 * are never reachable from here. The files are produced by `scripts/samples/generatePackSamples.ts` through the SAME pipeline as
 * the paid PDF (buildPackFiles -> exportWorksheetPdf), see `packSampleBuild.ts`.
 *
 * One sample per pack kind and subject: `pack_chapter`, `pack_mock`, `pack_subject` and `pack_cbq` each have a Maths and a
 * Science sample; `pack_bundle` has one. Adding a pack sku without adding it to `PACK_SAMPLES` turns packSamples.test.ts red.
 */
import { PACK_SKUS, packPriceLabel, subjectLabel, subjectOfChapter, type PackSku, type PackSubject } from "../../services/packs";
import { BUNDLE_NAME } from "./packLabels";

export interface PackSampleSpec {
  /** File stem: `public/samples/<id>.pdf`. */
  id: string;
  sku: PackSku;
  /** "maths" | "science" for subject-scoped packs, "all" for the bundle. */
  target: PackSubject | "all";
  /** Which real file of the pack the page is taken from (see `pickSampleFile`). */
  chapterIndex: number;
  fileSuffix: string;
}

const spec = (sku: PackSku, target: PackSubject | "all", chapterIndex: number, fileSuffix: string): PackSampleSpec => ({
  id: `lazytopper-sample-${sku.replace("pack_", "")}${target === "all" ? "" : `-${target}`}`,
  sku,
  target,
  chapterIndex,
  fileSuffix,
});

/**
 * Every sample. `chapterIndex` is the chapter within the subject (0 = first); `fileSuffix` is the end of the pack file id,
 * so the page is the first page of that real file: a Chapter Test 1 paper, Full Mock 1, a Worksheet, the CBQ questions.
 */
export const PACK_SAMPLES: readonly PackSampleSpec[] = [
  spec("pack_chapter", "maths", 0, "ct1-questions"),
  spec("pack_chapter", "science", 0, "ct1-questions"),
  spec("pack_mock", "maths", 0, "mock-maths-1-questions"),
  spec("pack_mock", "science", 0, "mock-science-1-questions"),
  spec("pack_subject", "maths", 1, "worksheet-questions"),
  spec("pack_subject", "science", 1, "worksheet-questions"),
  spec("pack_bundle", "all", 2, "worksheet-questions"),
  spec("pack_cbq", "maths", 0, "cbq-1-questions"),
  spec("pack_cbq", "science", 0, "cbq-1-questions"),
];

export const SAMPLES_DIR = "/samples";

/** The sample of a pack tile: `target` is a subject, a chapter slug (chapter pack) or ignored (bundle). Null for anything unknown. */
export function packSampleFor(sku: PackSku, target?: string | null): PackSampleSpec | null {
  if (sku === "pack_bundle") return PACK_SAMPLES.find((s) => s.sku === sku) ?? null;
  let want: string | null = target ?? null;
  if (sku === "pack_chapter") {
    // a chapter slug -> its subject; a subject name (the tiles, which have no chapter yet) -> itself; nothing yet -> Maths
    want = !target ? "maths" : subjectOfChapter(target) ?? (target === "maths" || target === "science" ? target : null);
  }
  return PACK_SAMPLES.find((s) => s.sku === sku && s.target === want) ?? null;
}

export function packSampleHref(s: PackSampleSpec): string {
  return `${SAMPLES_DIR}/${s.id}.pdf`;
}

/** Where a sample link sits (the `surface` param of pack_sample_download). */
export type PackSampleSurface = "packs_tile" | "packs_dialog" | "packs_cbq" | "pricing_tile" | "pricing_cbq" | "cbq_hub" | "landing_cbq";

export const PACK_SAMPLE_LINK_TEXT = "Free sample page";

/** Every sku the catalogue lists must have a sample (used by the test that guards new skus). */
export function skusWithoutSample(): PackSku[] {
  return PACK_SKUS.filter((sku) => !PACK_SAMPLES.some((s) => s.sku === sku));
}

/** The pack's name as the sample's last line prints it. */
export function samplePackName(sku: PackSku, target: PackSubject | "all"): string {
  switch (sku) {
    case "pack_chapter":
      return "Chapter Pack";
    case "pack_mock":
      return "Mock Pack";
    case "pack_subject":
      return "Subject Pack";
    case "pack_bundle":
      return BUNDLE_NAME;
    case "pack_cbq":
      return `${subjectLabel(target === "science" ? "science" : "maths")} CBQ Pack`;
  }
}

/** The last line of the sample page. The price comes from the catalogue constant, never typed here. */
export function sampleLine(sku: PackSku, target: PackSubject | "all"): string {
  return `${samplePackName(sku, target)} ${packPriceLabel(sku)} \u00b7 Get the full pack at lazytopper.com/packs`;
}

/** The text the generator stores in the PDF's Subject field, so a test can read the printed price back without OCR. */
export function sampleMeta(sku: PackSku, target: PackSubject | "all", priceInr: number): string {
  return `${sku}:${target} price_inr=${priceInr}`;
}
