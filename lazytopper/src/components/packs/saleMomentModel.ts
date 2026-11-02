/**
 * saleMomentModel - SALE-MOMENT-1. Pure rules for the ONE buying line shown at the moment of value (the one-minute ladder's
 * verdict, and the scorecards of the six grading surfaces) to a student who has not paid. Which pack is the most relevant for
 * what the student just did, where its tap goes, and the words. No React, no I/O, no clock.
 *
 * Prices are never typed here: the pack prices come from services/packs (PACK_PRICE_INR), the Board Pass price from
 * components/pricing/boardPassOffer. The server still charges its own amount; nothing here grants or unlocks anything.
 *
 * Which pack (most specific that is honestly known; nothing is guessed):
 *   1. a competency question (`cbq` true)          -> Board CBQ Pack (needs the subject for its pop-up; else the pop-up asks)
 *   2. the result names one chapter                 -> that chapter's Chapter Pack
 *   3. the result names only a subject              -> that subject's Subject Pack
 *   4. nothing known                                -> null (the caller keeps the plain "PDF packs from ₹49" line)
 */
import { chapterFromLocation } from "../../lib/packs/packEntry";
import {
  PACK_PRICE_INR,
  isAlreadyOwned,
  isValidPackTarget,
  packPriceLabel,
  subjectLabel,
  subjectOfChapter,
  type PackSku,
  type PackSubject,
} from "../../services/packs";

export type SaleMomentSku = Extract<PackSku, "pack_chapter" | "pack_subject" | "pack_cbq">;

export interface SaleMomentHint {
  /** The question just done is a competency-based question. Only a host that KNOWS passes true. */
  cbq?: boolean;
  /** A chapter slug (one of the 26 pack chapters); anything else is ignored. */
  chapterSlug?: string | null;
  subject?: PackSubject | null;
}

export interface SaleOffer {
  sku: SaleMomentSku;
  /** Chapter slug for a Chapter Pack; "maths" | "science" for a Subject / CBQ Pack. */
  target: string;
  /** The deep link into the shop: opens that pack's pop-up (PacksShop entry contract, packEntry.ts). */
  href: string;
  /** "₹49" etc, from the catalogue. */
  price: string;
}

function subjectFromHint(hint: SaleMomentHint): PackSubject | null {
  if (hint.subject === "maths" || hint.subject === "science") return hint.subject;
  const fromChapter = hint.chapterSlug ? subjectOfChapter(hint.chapterSlug) : null;
  return fromChapter;
}

/** The most relevant pack for this hint, or null when nothing specific is known. */
export function pickSaleOffer(hint: SaleMomentHint): SaleOffer | null {
  const subject = subjectFromHint(hint);
  if (hint.cbq) {
    const href = subject ? `/packs?pack=cbq&subject=${subject}` : "/packs?pack=cbq";
    // The CBQ Pack is per subject. Without a known subject the pop-up asks, so the offer carries no target to test.
    return { sku: "pack_cbq", target: subject ?? "", href, price: packPriceLabel("pack_cbq") };
  }
  if (hint.chapterSlug && isValidPackTarget("pack_chapter", hint.chapterSlug)) {
    return { sku: "pack_chapter", target: hint.chapterSlug, href: `/packs?chapter=${encodeURIComponent(hint.chapterSlug)}`, price: packPriceLabel("pack_chapter") };
  }
  if (subject) {
    return { sku: "pack_subject", target: subject, href: `/packs?pack=subject&subject=${subject}`, price: packPriceLabel("pack_subject") };
  }
  return null;
}

/** True when the student's owned packs already cover this offer (then the line is not shown). A CBQ offer with no subject: owning both subjects. */
export function offerIsOwned(owned: ReadonlyArray<{ packId: string }>, offer: SaleOffer): boolean {
  if (offer.sku === "pack_cbq" && !offer.target) {
    return isAlreadyOwned(owned, "pack_cbq", "maths") && isAlreadyOwned(owned, "pack_cbq", "science");
  }
  return isAlreadyOwned(owned, offer.sku, offer.target);
}

/** The words of the pack line. `chapterName` is the chapter's display name when the host knows it. */
export function saleOfferText(offer: SaleOffer, chapterName?: string | null): string {
  switch (offer.sku) {
    case "pack_chapter":
      return `${chapterName ? `${chapterName} Chapter Pack` : "This chapter's Chapter Pack"} ${offer.price} — printed questions with answer keys →`;
    case "pack_cbq":
      return `Board CBQ Pack ${offer.price} — printed competency questions with answer keys →`;
    case "pack_subject":
      return `${subjectLabel(offer.target as PackSubject)} Subject Pack ${offer.price} — every chapter, printed with answer keys →`;
  }
}

/**
 * What a result's practice route says about the chapter / subject, read from the host's OWN guide-target link (Quick Practice
 * `/practice/10/<subject>?topic=<slug>`, the C&I topic worksheet `/practice/worksheets?...topic=<slug>`, the chapter test route).
 * An unknown slug is dropped (never guessed): a mixed paper or a missing link gives an empty hint.
 */
export function saleHintFromTarget(to: string | null | undefined): SaleMomentHint {
  if (!to) return {};
  try {
    const u = new URL(to, "https://lazytopper.invalid");
    const chapterSlug = chapterFromLocation(u.pathname, u.search);
    const q = u.searchParams.get("subject")?.toLowerCase();
    const seg = u.pathname.toLowerCase().split("/").find((s) => s === "maths" || s === "science");
    const s = q === "maths" || q === "science" ? q : seg === "maths" || seg === "science" ? seg : null;
    return { chapterSlug, subject: s };
  } catch {
    return {};
  }
}

export { PACK_PRICE_INR };
