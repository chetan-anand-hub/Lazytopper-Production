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

/**
 * PREBOARDS-BADGE-1: until the pre-board season ends the Bundle is sold as the "Pre-boards pick" (owner ruling 2 Nov 2026). ONE constant:
 * move this instant to move the season. Name, price and sku never change; after it every surface reverts to the plain copy by itself.
 */
export const PREBOARDS_PICK_UNTIL = "2026-12-20T23:59:59+05:30";
const PREBOARDS_PICK_UNTIL_MS = Date.parse(PREBOARDS_PICK_UNTIL);
/** Is the pre-boards badge on at `now`? PURE: the clock is an argument (default: the repo clock, `Date.now()`, which the test clock moves). */
export function isPreboardsSeason(now: Date | number = Date.now()): boolean {
  return (typeof now === "number" ? now : now.getTime()) <= PREBOARDS_PICK_UNTIL_MS;
}
export const PREBOARDS_PICK_BADGE = "Pre-boards pick";
/** The chapters the Bundle contains: our packs treat Trigonometry (Ch 8 + Ch 9) as one, so 26 (offersModel.test pins it to PACK_CHAPTER_SLUGS). */
export const BUNDLE_CHAPTERS = ALL_NCERT_CHAPTERS - 1;
export const PREBOARDS_PICK_LINE = `All ${BUNDLE_CHAPTERS} chapters + ${BUNDLE_MOCKS} board mocks \u2014 ready before your pre-boards`;

/**
 * PACK-TERMS-1 (owner ruling 3 Nov 2026): owned packs stay downloadable until this date (copy only; My packs keeps working regardless of
 * flags). Packs paid from PACK_TERMS_CUTOFF on: 31 March 2027 (CBSE's second board exam is in May; students who need May get a new offer then).
 * Packs paid BEFORE the cut-off keep the "31 May 2027" already printed on their covers - a promise already made is never shortened.
 */
export const REDOWNLOAD_UNTIL = "31 March 2027";
export const REDOWNLOAD_UNTIL_LEGACY = "31 May 2027";
/** 5 Nov 2026 00:00 IST - the same instant as server/services/packCredit.cjs PACK_CREDIT_CUTOFF_MS (the two terms change together). */
export const PACK_TERMS_CUTOFF = "2026-11-05T00:00:00+05:30";
export const PACK_TERMS_CUTOFF_MS = Date.parse(PACK_TERMS_CUTOFF);
/**
 * The re-download date for a pack paid at `paidAtMs`. PURE. Paid time unknown / unusable (missing, 0, NaN, not a number) -> the LEGACY
 * (later) date: never print an earlier date to someone who may have been promised May. Paid at or after the cut-off -> the new date.
 */
export function redownloadUntilFor(paidAtMs?: number | null): string {
  if (typeof paidAtMs !== "number" || !Number.isFinite(paidAtMs) || paidAtMs <= 0) return REDOWNLOAD_UNTIL_LEGACY;
  return paidAtMs >= PACK_TERMS_CUTOFF_MS ? REDOWNLOAD_UNTIL : REDOWNLOAD_UNTIL_LEGACY;
}
/**
 * REDOWNLOAD-ENFORCE-1: the LAST instant (end of the day, IST) each date allows a download. The SERVER enforces it
 * (server/services/packTerms.cjs, on its own clock); these are the client copy, pinned to the server's by
 * packTerms.serverParity.test.ts.
 */
export const REDOWNLOAD_ENDS_AT = "2027-03-31T23:59:59.999+05:30";
export const REDOWNLOAD_ENDS_AT_LEGACY = "2027-05-31T23:59:59.999+05:30";
/** The last ms a pack paid at `paidAtMs` may be downloaded (same rule as redownloadUntilFor). PURE. */
export function redownloadEndsMsFor(paidAtMs?: number | null): number {
  return Date.parse(redownloadUntilFor(paidAtMs) === REDOWNLOAD_UNTIL ? REDOWNLOAD_ENDS_AT : REDOWNLOAD_ENDS_AT_LEGACY);
}
/** "Download again any time until <date>" for a pack paid at `paidAtMs` (cover line). */
export function redownloadCopyFor(paidAtMs?: number | null): string {
  return `Download again any time until ${redownloadUntilFor(paidAtMs)}`;
}
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
