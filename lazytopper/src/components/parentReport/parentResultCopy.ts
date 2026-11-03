/**
 * PARENT-REPORT-1 — every string the parent's result page adds, in one place, plus the small
 * decisions (which Mummy line, the date label). Tiny and bank-free: the page imports it;
 * Mummy's drawing code stays in the lazily loaded guide/mummy/mummyChunk.
 *
 * Copy rules (owner, 22 Oct 2026; pinned by ParentResultPage.test.tsx): never the word "Ask";
 * the Mummy lines and PARENT_RESULT_CTA_LABEL carry no price. PARENT-CARD-2 (owner, 31 Oct 2026) adds
 * the two pay buttons below - their prices come from config/pricing and the packs catalogue, never a literal.
 */
import { boardPassPriceDisplay, formatInr } from "../../config/pricing";
import { CHAPTER_PACK_PRICE_INR } from "../../lib/packs/packEntry";
import type { ParentResultKind } from "./parentResultLink";

/**
 * The `/u/:token` segment that names the parent's result page. A QR hand-off token is 256 random
 * bits and is never this word, so QrAnswerUploadPage can hand this one segment to the page.
 * Kept here (no runtime imports) so the QR page's chunk gains nothing but this string.
 */
export const PARENT_RESULT_SEGMENT = "report";

/** The shared result was tap-only (MCQ / objective) — the owner's EXACT line. */
export const MUMMY_LINE_OBJECTIVE =
  "Have your child write one answer on paper. One photo — and you'll see every step marked the way a CBSE examiner does, and exactly where marks were lost.";

/** The shared result was a written, step-marked one — the owner's EXACT line. */
export const MUMMY_LINE_WRITTEN =
  "This is how a CBSE examiner marks your child's answer — step by step. Every mark lost has a reason your child can fix.";

export const PARENT_RESULT_CTA_LABEL = "See how LazyTopper works";
export const PARENT_RESULT_CTA_HREF = "/for-parents";

export function mummyLineFor(kind: ParentResultKind): string {
  return kind === "objective" ? MUMMY_LINE_OBJECTIVE : MUMMY_LINE_WRITTEN;
}

/** "22 Oct 2026", in India time. */
export function resultDateLabel(ms: number): string {
  try {
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(
      new Date(ms),
    );
  } catch {
    return "";
  }
}

/** PARENT-CARD-2 - the two pay buttons. Prices are read from the pricing config / packs catalogue at render. */
export const PARENT_PRICING_HREF = "/pricing?utm_source=parent_share&utm_medium=result_page&utm_campaign=parent_report";
export const PARENT_PACKS_HREF = "/pricing?utm_source=parent_share&utm_medium=result_page&utm_campaign=parent_report#packs";

/** "Give Aarav full board prep — ₹1,917 till boards" (PRICE-FIXED-1: the Board Pass, a fixed price; the month price is hidden). */
export function parentPrimaryCtaLabel(firstName: string, _now: number = Date.now()): string {
  return `Give ${firstName || "your child"} full board prep \u2014 ${boardPassPriceDisplay()} till boards`;
}

/** "Or one PDF pack, from ₹49" - the cheapest pack in the catalogue. */
export function parentSecondaryCtaLabel(): string {
  return `Or one PDF pack, from ${formatInr(CHAPTER_PACK_PRICE_INR)}`;
}

export const PARENT_TRUST_LINE = "Secure payment via Razorpay \u00b7 Made by an IITian (IIT Kanpur)";

/** The page is read by the PARENT, so the shared student-facing "Where your marks went" is worded for them. */
export const PARENT_MARKS_HEADING = "Where the marks went";

/** PARENT-PAID-1: the parent of a PAID student is told, honestly, instead of being asked to buy. */
export function parentPaidLine(firstName: string): string {
  return `${firstName || "Your child"} already has LazyTopper Premium.`;
}
