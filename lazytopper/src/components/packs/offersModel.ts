/**
 * offersModel - OFFERS-V2. Pure rules for the ONE buying block shown after a result (or at a paper wall) to a student who has not paid:
 * which PDF-pack rows each surface shows, in what order, with what words, and where each button goes. No React, no I/O, no clock.
 *
 * Order (owner, 2 Nov 2026): Board Pass first (the block draws it), then the packs from the HIGHEST price down to the cheapest; a tie puts
 * the Subject Pack before the CBQ Pack. Prices are never typed here: they come from services/packs (PACK_PRICE_INR); the counts in the words
 * come from the pack catalogue (PACK_CHAPTER_SLUGS, MOCKS_PER_SUBJECT, BUNDLE_MOCKS), the same figures the pack pop-up states.
 *
 * Nothing is guessed: a row whose subject or chapter is not known is dropped. Ownership follows services/packs isAlreadyOwned (the Subject
 * Pack and the Bundle cover chapters and mocks; the Bundle does NOT include CBQ, so a CBQ row is only hidden by owning that CBQ Pack).
 */
import { BUNDLE_MOCKS, BUNDLE_NAME, MOCKS_PER_SUBJECT, packChapterLabel } from "../../lib/packs/packLabels";
import {
  PACK_CHAPTER_SLUGS,
  PACK_PRICE_INR,
  isAlreadyOwned,
  isValidPackTarget,
  packPriceLabel,
  subjectLabel,
  subjectOfChapter,
  type PackSku,
  type PackSubject,
} from "../../services/packs";

/** The surface the block belongs to: it decides which rows are offered. */
export type OfferKind = "full-mock" | "chapter-test" | "worksheet" | "check-improve" | "quick-practice" | "ladder";

export interface OfferContext {
  kind: OfferKind;
  subject?: PackSubject | null;
  /** A chapter slug (one of the 26 pack chapters); anything else is ignored. */
  chapterSlug?: string | null;
  /** The chapter's display name when the host knows it. */
  chapterName?: string | null;
}

export interface OfferRow {
  sku: PackSku;
  /** Chapter slug for a Chapter Pack; "maths" | "science" for a Subject / Mock / CBQ Pack; "" for the Bundle. */
  target: string;
  name: string;
  line: string;
  /** "₹299" etc. */
  price: string;
  priceInr: number;
  /** "BEST VALUE" on the Bundle only. */
  badge: string | null;
  /** The one-tap link: opens that pack's pop-up and starts checkout once (PacksShop readBuyResume). */
  buyHref: string;
  /** The existing pop-up link, WITHOUT buy. */
  insideHref: string;
}

export const BEST_VALUE_BADGE = "BEST VALUE";

/** Same price, Subject before CBQ; otherwise the price decides (descending). */
const TIE_ORDER: Readonly<Record<PackSku, number>> = { pack_bundle: 0, pack_subject: 1, pack_cbq: 2, pack_mock: 3, pack_chapter: 4 };

/** "/packs?buy=<sku>&t=<target>" (the Bundle has no t). */
export function buyHrefFor(sku: PackSku, target: string): string {
  const q = new URLSearchParams({ buy: sku });
  if (sku !== "pack_bundle") q.set("t", target);
  return `/packs?${q.toString()}`;
}

/** The existing pop-up link (packEntry contract), never carrying `buy`. */
export function insideHrefFor(sku: PackSku, target: string): string {
  switch (sku) {
    case "pack_chapter":
      return `/packs?chapter=${encodeURIComponent(target)}`;
    case "pack_mock":
      return `/packs?mock=${target}`;
    case "pack_subject":
      return `/packs?pack=subject&subject=${target}`;
    case "pack_cbq":
      return `/packs?pack=cbq&subject=${target}`;
    case "pack_bundle":
      return "/packs?pack=bundle";
  }
}

/** The subject the result is about: given, else that of the chapter. Null when neither is known. */
export function offerSubject(ctx: Pick<OfferContext, "subject" | "chapterSlug">): PackSubject | null {
  if (ctx.subject === "maths" || ctx.subject === "science") return ctx.subject;
  return ctx.chapterSlug ? subjectOfChapter(ctx.chapterSlug) : null;
}

function validChapter(slug: string | null | undefined): string | null {
  return slug && isValidPackTarget("pack_chapter", slug) ? slug : null;
}

function row(sku: PackSku, target: string, name: string, line: string, badge: string | null = null): OfferRow {
  return {
    sku,
    target,
    name,
    line,
    price: packPriceLabel(sku),
    priceInr: PACK_PRICE_INR[sku],
    badge,
    buyHref: buyHrefFor(sku, target),
    insideHref: insideHrefFor(sku, target),
  };
}

/** The honest one-liners (each checked against pages/PackDialog TITLES and lib/packs/packLabels). */
export const OFFER_LINES = {
  bundle: `All ${PACK_CHAPTER_SLUGS.length} chapters + ${BUNDLE_MOCKS} mocks, the whole year`,
  subject: (s: PackSubject) => `Every ${subjectLabel(s)} chapter, chapter-wise question bank`,
  cbq: "Competency questions of every type, chapter-wise",
  mock: `${MOCKS_PER_SUBJECT} full board mocks with step-marking keys`,
  chapter: "Important questions with answer keys",
} as const;

/** Every row this surface may offer, in the order shown (price high to low). Unknown subject / chapter drops the rows that need it. */
export function offerRows(ctx: OfferContext): OfferRow[] {
  const subject = offerSubject(ctx);
  const chapter = validChapter(ctx.chapterSlug);
  const bundle = row("pack_bundle", "", BUNDLE_NAME, OFFER_LINES.bundle, BEST_VALUE_BADGE);
  const subjectRow = subject ? row("pack_subject", subject, `${subjectLabel(subject)} Subject Pack`, OFFER_LINES.subject(subject)) : null;
  const cbq = subject ? row("pack_cbq", subject, `${subjectLabel(subject)} CBQ Pack`, OFFER_LINES.cbq) : null;
  const mock = subject ? row("pack_mock", subject, `${subjectLabel(subject)} Mock Pack`, OFFER_LINES.mock) : null;
  const chapterRow = chapter ? row("pack_chapter", chapter, `${ctx.chapterName?.trim() || packChapterLabel(chapter)} Chapter Pack`, OFFER_LINES.chapter) : null;
  let rows: Array<OfferRow | null>;
  switch (ctx.kind) {
    case "full-mock":
      rows = [bundle, cbq, mock];
      break;
    case "chapter-test":
    case "worksheet":
    case "ladder":
      rows = [bundle, cbq, chapterRow];
      break;
    case "check-improve":
      rows = [bundle, subjectRow, cbq, mock, chapterRow];
      break;
    case "quick-practice":
      rows = [bundle, cbq];
      break;
  }
  return rows
    .filter((r): r is OfferRow => r !== null)
    .sort((a, b) => b.priceInr - a.priceInr || TIE_ORDER[a.sku] - TIE_ORDER[b.sku]);
}

/** The rows the student does not already own. */
export function unownedRows(rows: readonly OfferRow[], owned: ReadonlyArray<{ packId: string }>): OfferRow[] {
  return rows.filter((r) => !isAlreadyOwned(owned, r.sku, r.target || undefined));
}

/** The analytics slug of a row (a pack SKU, e.g. "pack_cbq"), and of its "What's inside" link. */
export function rowOfferSlug(r: Pick<OfferRow, "sku">): string {
  return r.sku;
}
export function rowInsideSlug(r: Pick<OfferRow, "sku">): string {
  return `${r.sku}_inside`;
}
