/**
 * packLabels - the pack copy that several surfaces must agree on (PACKS-UX-1). PURE and tiny: no bank, no services,
 * so the page, the /pricing strip, the PDF cover and the tests can all import it without weight.
 */
import { desktopTopicBySlug } from "../desktop/topics";

/** The pack tiers' shared name for the both-subjects pack (the sku stays `pack_bundle`). */
export const BUNDLE_NAME = "Maths + Science Bundle";

/** NCERT chapter counts, CBSE 2026-27. Our `trigonometry` topic covers two of them (Ch 8 and Ch 9). */
export const MATHS_NCERT_CHAPTERS = 14;
export const SCIENCE_NCERT_CHAPTERS = 13;
export const ALL_NCERT_CHAPTERS = MATHS_NCERT_CHAPTERS + SCIENCE_NCERT_CHAPTERS;

/** Full board-pattern papers per subject in a Mock Pack. */
export const MOCKS_PER_SUBJECT = 8;
export const BUNDLE_MOCKS = MOCKS_PER_SUBJECT * 2;

/** Mock paper pattern shown for Maths (Standard, subject code 041). */
export const MATHS_MOCK_PATTERN = "Standard (041)";

/**
 * CBQ-PACK-1: the floors the CBQ pack copy promises ("1,400+ CBQs", "100+ in every chapter"). The copy and the test that runs the
 * real selection on the bank both read these, so the claim turns CI red if the bank ever drops below it.
 */
export const CBQ_MIN_PER_SUBJECT = 1400;
export const CBQ_MIN_PER_CHAPTER = 100;
export const CBQ_SUBJECT_CLAIM = `${CBQ_MIN_PER_SUBJECT.toLocaleString("en-IN")}+ CBQs`;
export const CBQ_CHAPTER_CLAIM = `${CBQ_MIN_PER_CHAPTER}+ in every chapter`;

/** Owned packs stay downloadable until this date (copy only; My packs keeps working regardless of flags). */
export const REDOWNLOAD_UNTIL = "31 May 2027";
export const REDOWNLOAD_COPY = `Download again any time until ${REDOWNLOAD_UNTIL}`;
/** The one-line terms under the tiles: "One-time payment · never renews · <this>". */
export const REDOWNLOAD_SHORT = `download again till ${REDOWNLOAD_UNTIL}`;

const LABEL_OVERRIDES: Readonly<Record<string, string>> = {
  trigonometry: "Trigonometry (Ch 8 + Ch 9)",
};

/** A chapter's display name in packs. */
export function packChapterLabel(slug: string): string {
  return LABEL_OVERRIDES[slug] ?? desktopTopicBySlug(slug)?.name ?? slug;
}
