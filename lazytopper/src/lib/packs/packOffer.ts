/**
 * packOffer — PACK-LINKS-1: which pack a wall offers for the paper it refused. Kept out of packEntry.ts (that file
 * is in the entry chunk and must stay light); only the lazily loaded pack button and tests import this.
 */
import { CHAPTER_PACK_PRICE_INR, isPackChapterSlug, packsHref, type PackSubjectName } from "./packEntry";

/** Display price of one Mock Pack, copy only (pinned to the catalogue by a test, like the chapter price). */
export const MOCK_PACK_PRICE_INR = 99;

export interface PackOffer {
  /** "Chapter Pack ₹49 →", "Mock Pack ₹99 →" or "PDF packs from ₹49 →". */
  label: string;
  /** The price in the label: "₹49" / "₹99". */
  priceLabel: string;
  /** The deep link: /packs?chapter=<slug>, /packs?mock=<subject>, or plain /packs. */
  href: string;
}

/**
 * The pack a wall should offer for the paper it refused (PACK-LINKS-1). PURE. One valid chapter -> that
 * Chapter Pack; a subject with no single chapter (a Full Mock) -> that subject's Mock Pack; anything else
 * (several chapters, unknown, nothing) -> the plain /packs. `kind: "mock"` prefers the subject, any other
 * kind prefers the chapter, when both are given.
 */
export function packOfferFor(opts: { chapters?: readonly string[] | null; subject?: PackSubjectName | null; kind?: "mock" | "chapter" | null } = {}): PackOffer {
  const one = opts.chapters && opts.chapters.length === 1 && isPackChapterSlug(opts.chapters[0]) ? opts.chapters[0] : null;
  const subject = opts.subject === "maths" || opts.subject === "science" ? opts.subject : null;
  if (subject && (opts.kind === "mock" || (!one && !opts.chapters?.length))) {
    return { label: `Mock Pack ₹${MOCK_PACK_PRICE_INR} →`, priceLabel: `₹${MOCK_PACK_PRICE_INR}`, href: packsHref({ mock: subject }) };
  }
  if (one) return { label: `Chapter Pack ₹${CHAPTER_PACK_PRICE_INR} →`, priceLabel: `₹${CHAPTER_PACK_PRICE_INR}`, href: packsHref({ chapter: one }) };
  return { label: `PDF packs from ₹${CHAPTER_PACK_PRICE_INR} →`, priceLabel: `₹${CHAPTER_PACK_PRICE_INR}`, href: "/pricing#packs" };
}
