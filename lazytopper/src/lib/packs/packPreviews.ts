/**
 * packPreviews - which REAL pages the pack pop-up previews for each pack (PACK-PREVIEW-1, [FU-PACK-PREVIEW-PER-SUBJECT]).
 *
 * LIGHT on purpose (no bank, no jsPDF): the lazy pop-up imports it. One preview set per pack kind and subject (the bundle has one).
 * Each set is three images made from the SAME pipeline as the paid PDF (`buildPackFiles`) by `scripts/packPreviews/generatePackPreviews.ts`:
 * the cover, the first question page, and the first page of the answer key of one representative file of that pack. Nothing is typed
 * into a page. To regenerate: `cd lazytopper && pnpm run gen:pack-previews` (needs Chrome and pdftoppm; see the script).
 *
 * The Science CBQ page is from chapter 2: the CBQ file of chapter 1 holds a question the syllabus guard flags.
 * Mock 2 is shown (not Mock 1) because Science Full Mock 1 holds a question the syllabus guard flags; the generator and the test both scan every preview.
 * The same spec drives the pop-up, the caption and the generator, so the caption can only name what the images show.
 */
import { packChapterLabel } from "./packLabels";
import { chaptersOfSubject, subjectLabel, subjectOfChapter, type PackSku, type PackSubject } from "../../services/packs";

export interface PackPreviewSpec {
  /** File stem under `public/packs/previews/`: `<id>-cover-480.webp`, `<id>-questions-...`, `<id>-answer-key-...`. */
  id: string;
  sku: PackSku;
  /** "all" for the bundle. */
  target: PackSubject | "all";
  /** The subject whose chapter the page comes from (the bundle's page is a Maths chapter). */
  subject: PackSubject;
  /** Chapter within the subject (0 = first). Mock Pack ignores it. */
  chapterIndex: number;
  /** End of the real pack-file id for the questions file and its answer key. */
  questionsSuffix: string;
  answersSuffix: string;
}

const p = (sku: PackSku, target: PackSubject | "all", chapterIndex: number, questionsSuffix: string, answersSuffix: string, subject?: PackSubject): PackPreviewSpec => {
  const s: PackSubject = subject ?? (target === "science" ? "science" : "maths");
  return { id: `${sku.replace("pack_", "")}${target === "all" ? "" : `-${target}`}`, sku, target, subject: s, chapterIndex, questionsSuffix, answersSuffix };
};

export const PACK_PREVIEWS: readonly PackPreviewSpec[] = [
  p("pack_chapter", "maths", 0, "sec-A-1-questions", "sec-A-1-answers"),
  p("pack_chapter", "science", 0, "sec-A-1-questions", "sec-A-1-answers"),
  p("pack_mock", "maths", 0, "mock-maths-2-questions", "mock-maths-2-answers"),
  p("pack_mock", "science", 0, "mock-science-2-questions", "mock-science-2-answers"),
  p("pack_subject", "maths", 1, "worksheet-questions", "worksheet-answers"),
  p("pack_subject", "science", 1, "worksheet-questions", "worksheet-answers"),
  p("pack_bundle", "all", 2, "worksheet-questions", "worksheet-answers", "maths"),
  p("pack_cbq", "maths", 0, "cbq-1-questions", "cbq-1-answers"),
  p("pack_cbq", "science", 1, "cbq-1-questions", "cbq-1-answers"),
];

export const PREVIEW_DIR = "/packs/previews";
export const PREVIEW_SIZES = [480, 827] as const;
/** Pixel size of the stored images (A4 at 827 wide). */
export const PREVIEW_W = 827;
export const PREVIEW_H = 1170;

/** The preview of a pack tile / pop-up. `subject` is the Maths/Science toggle; a chapter pack follows its picked chapter's subject. Null when there is none. */
export function packPreviewFor(sku: PackSku, subject: PackSubject, chapter?: string | null): PackPreviewSpec | null {
  if (sku === "pack_bundle") return PACK_PREVIEWS.find((s) => s.sku === sku) ?? null;
  const want: PackSubject = sku === "pack_chapter" && chapter ? subjectOfChapter(chapter) ?? subject : subject;
  return PACK_PREVIEWS.find((s) => s.sku === sku && s.target === want) ?? null;
}

/** The chapter slug the preview page is taken from (null for the Mock Pack). */
export function previewChapterSlug(spec: PackPreviewSpec): string | null {
  if (spec.sku === "pack_mock") return null;
  const list = chaptersOfSubject(spec.subject);
  return list[spec.chapterIndex] ?? list[0] ?? null;
}

/** What the pages are, in words: "Real Numbers, Section A". */
export function previewShows(spec: PackPreviewSpec): string {
  const slug = previewChapterSlug(spec);
  const ch = slug ? packChapterLabel(slug) : "";
  switch (spec.sku) {
    case "pack_chapter":
      return `${ch}, Section A`;
    case "pack_mock":
      return `Full Mock ${/-(\d+)-questions$/.exec(spec.questionsSuffix)?.[1] ?? ""}`.trim();
    case "pack_cbq":
      return `${ch} board CBQs`;
    default:
      return `${ch} worksheet`;
  }
}

/** The caption under the preview: names the pack's kind and subject and the file the pages come from. */
export function previewCaption(spec: PackPreviewSpec): string {
  const kind: Record<PackSku, string> = {
    pack_chapter: "Chapter Pack",
    pack_mock: "Mock Pack",
    pack_subject: "Subject Pack",
    pack_bundle: "Maths + Science Bundle",
    pack_cbq: "CBQ Pack",
  };
  const subj = spec.sku === "pack_bundle" ? "" : `${subjectLabel(spec.subject)} `;
  const of = spec.sku === "pack_bundle" ? "the " : "a ";
  return `Sample pages from ${of}${subj}${kind[spec.sku]} (${previewShows(spec)}) — your pack has the same layout`;
}

/** Shown when a pack has no preview set: honest, and no image is drawn. */
export const PREVIEW_FALLBACK_CAPTION = "Preview pages for this pack are not available yet";

export type PreviewPage = "cover" | "questions" | "answer-key";
export const PREVIEW_PAGES: readonly PreviewPage[] = ["cover", "questions", "answer-key"];

export function previewImage(spec: PackPreviewSpec, page: PreviewPage, size: (typeof PREVIEW_SIZES)[number]): string {
  return `${PREVIEW_DIR}/${spec.id}-${page}-${size}.webp`;
}
