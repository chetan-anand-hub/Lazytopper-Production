/**
 * saleMomentModel - SALE-MOMENT-1. Pure rules for the ONE buying line shown at the moment of value (the one-minute ladder's
 * verdict, and the scorecards of the six grading surfaces) to a student who has not paid. Which pack is the most relevant for
 * what the student just did, where its tap goes, and the words. No React, no I/O, no clock.
 *
 * Prices are never typed here: the pack prices come from services/packs (PACK_PRICE_INR), the Board Pass price from
 * components/pricing/boardPassOffer. The server still charges its own amount; nothing here grants or unlocks anything.
 *
 * Which pack (most specific that is honestly known; nothing is guessed):
 *   0. a Full Mock result (`mock` true)             -> that subject's Mock Pack (8 board mocks; needs the subject, else falls through)
 *   1. a competency question (`cbq` true)          -> Board CBQ Pack (needs the subject for its pop-up; else the pop-up asks)
 *   2. the result names one chapter                 -> that chapter's Chapter Pack
 *   3. the result names only a subject              -> that subject's Subject Pack
 *   4. nothing known                                -> null (the caller keeps the plain "PDF packs from ₹49" line)
 */
import { chapterFromLocation } from "../../lib/packs/packEntry";
import { MOCKS_PER_SUBJECT } from "../../lib/packs/packLabels";
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

export type SaleMomentSku = Extract<PackSku, "pack_chapter" | "pack_mock" | "pack_subject" | "pack_cbq">;

export interface SaleMomentHint {
  /** The result is a Full Mock paper: the matching pack is that subject's Mock Pack. Needs `subject`; without one this rule is skipped. */
  mock?: boolean;
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
  if (hint.mock && subject) {
    return { sku: "pack_mock", target: subject, href: `/packs?mock=${subject}`, price: packPriceLabel("pack_mock") };
  }
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

export interface SaleOfferParts {
  /** Words before the price, the price ("₹49", shown bold), words after it. */
  before: string;
  price: string;
  after: string;
}

/** The words of the pack line in three parts, so the price can be drawn bold. `chapterName` is the chapter's display name when the host knows it. */
export function saleOfferParts(offer: SaleOffer, chapterName?: string | null): SaleOfferParts {
  switch (offer.sku) {
    case "pack_chapter":
      return {
        before: `${chapterName ? `${chapterName} Chapter Pack` : "This chapter's Chapter Pack"} `,
        price: offer.price,
        after: " \u2014 printed questions with answer keys \u2192",
      };
    case "pack_mock":
      return {
        before: `${subjectLabel(offer.target as PackSubject)} Mock Pack `,
        price: offer.price,
        after: ` \u2014 ${MOCKS_PER_SUBJECT} full board mocks, printed with answer keys \u2192`,
      };
    case "pack_cbq":
      return { before: "Board CBQ Pack ", price: offer.price, after: " \u2014 chapter-wise competency questions, explained step by step \u2192" };
    case "pack_subject":
      return {
        before: `${subjectLabel(offer.target as PackSubject)} Subject Pack `,
        price: offer.price,
        after: " \u2014 every chapter, printed with answer keys \u2192",
      };
  }
}

/** The words of the pack line, whole. */
export function saleOfferText(offer: SaleOffer, chapterName?: string | null): string {
  const p = saleOfferParts(offer, chapterName);
  return `${p.before}${p.price}${p.after}`;
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
