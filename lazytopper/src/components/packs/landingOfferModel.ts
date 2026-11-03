/**
 * landingOfferModel - AD-LANDING-OFFER-1. Pure copy and links for the compact offer a SIGNED-OUT ad visitor sees near the top of the two
 * YouTube ad landings (/practice-hub?cbq=1 and /check-improve). No React, no I/O; the clock and the Board Pass price are arguments.
 *
 * Every link comes from an existing builder (offersModel buyHrefFor, boardPassBuy BOARD_PASS_BUY_PATH); every price from the pack
 * constants or the Board Pass quote; the CBQ count from packLabels CBQ_SUBJECT_CLAIM (the floor a CI test checks against the bank).
 * Google Ads policy (these are ad landing pages): no "answer", "solution", "hack", "trick", "crack" or "leak" in this copy.
 */
import { CBQ_SUBJECT_CLAIM } from "../../lib/packs/packLabels";
import { PACK_PRICE_INR, packPriceLabel, subjectLabel, type PackSubject } from "../../services/packs";
import { BOARD_PASS_BUY_PATH } from "../pricing/boardPassBuy";
import { buyHrefFor } from "./offersModel";

/** The analytics `surface` slug of each landing (sale_moment_shown / sale_moment_tap). */
export type LandingOfferSurface = "landing-practice-cbq" | "landing-check";

export const LANDING_SUBJECTS: readonly PackSubject[] = ["maths", "science"];

/** The cheapest pack's price ("₹49"), from the catalogue; null if the catalogue has none. */
export function cheapestPackLabel(prices: Readonly<Record<string, number>> = PACK_PRICE_INR): string | null {
  const values = Object.values(prices).filter((n) => Number.isFinite(n) && n > 0);
  return values.length ? `₹${Math.min(...values)}` : null;
}

/** "Want all 1,400+ CBQs per subject, chapter-wise?" */
export const CBQ_LANDING_TITLE = `Want all ${CBQ_SUBJECT_CLAIM} per subject, chapter-wise?`;
export const CBQ_LANDING_SUB = "Printable PDF with step-by-step explanations. One-time payment.";

/** "Maths CBQ Pack ₹199" */
export function cbqButtonLabel(subject: PackSubject): string {
  return `${subjectLabel(subject)} CBQ Pack ${packPriceLabel("pack_cbq")}`;
}

/** The one-tap CBQ checkout link (the OFFERS-V2 builder, never typed here). */
export function cbqLandingBuyHref(subject: PackSubject): string {
  return buyHrefFor("pack_cbq", subject);
}

/** The Board Pass one-tap checkout. */
export const LANDING_BOARD_PASS_HREF = BOARD_PASS_BUY_PATH;
/** The one-hop packs page (not /pricing#packs). */
export const LANDING_PACKS_HREF = "/packs";

/** "or the Board Pass ₹1,917 - step marking till boards" (no figure when none can be quoted). */
export function cbqBoardPassLine(price: string | null): string {
  return `or the Board Pass${price ? ` ${price}` : ""} — step marking till boards`;
}

/** "Get every question step-marked till your boards · Board Pass ₹1,917 →" */
export function checkBoardPassLine(price: string | null): string {
  return `Get every question step-marked till your boards · Board Pass${price ? ` ${price}` : ""} →`;
}

/** "Prefer practising on paper? PDF packs from ₹49 →" */
export function checkPacksLine(from: string | null = cheapestPackLabel()): string {
  return `Prefer practising on paper? PDF packs${from ? ` from ${from}` : ""} →`;
}

/** Words this copy must never contain (Google Ads policy for these landings). The product name "Answer Checker" is not part of it. */
export const LANDING_BANNED_WORDS = /\b(answers?|answer key|solutions?|hacks?|tricks?|crack|leaks?)\b/i;
