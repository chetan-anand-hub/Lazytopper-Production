/**
 * boardPassOffer - the one offer every "make the ask" surface shows.
 *
 * PRICE-FIXED-1 (owner rulings, 31 Oct 2026): the Board Pass is a FIXED price ("one payment till your boards")
 * and the MONTH pass is hidden throughout the product. Every ask surface (trial-ended screen and banner,
 * trial countdown bar, upgrade sheet, walls, scorecard lines) therefore shows ONLY the Board Pass. This
 * REVERSES CHECKOUT-1's "month leads" rule. An account that already bought a month pass renews it inside
 * its own /pricing page and checkout only - nothing in this file ever names a monthly price.
 *
 * This module only READS config/pricing.ts: no price is typed here, and both the clock (`now`) and the
 * board date (`boardIso`; callers pass `predictCbseExamDate("10")`) are arguments.
 *
 * If the quote is unavailable (an unparseable board date) the offer has no price and says so by omission:
 * `priceDisplay` is null and the caller shows no figure rather than a guess.
 */
import { VALIDITY_SHORT } from "../../config/validity";
import { boardPassDeadlineLine, boardPassFoundingLabel, boardPassPriceDisplay, tillBoardsQuote } from "../../config/pricing";
import { predictCbseExamDate } from "../../services/cbseExamDate";

export interface BoardPassOffer {
  /** The offer's name. */
  title: "Board Pass";
  /** The fixed one-time price, or null when the board date cannot be read. */
  priceDisplay: string | null;
  /** "Pay once, valid till 28 Feb 2027" (VALIDITY-FEB27). */
  detail: string;
}

export function boardPassOffer(now: Date, boardIso: string): BoardPassOffer {
  const quote = tillBoardsQuote(now, boardIso);
  return {
    title: "Board Pass",
    priceDisplay: quote ? quote.priceDisplay : null,
    detail: `Pay once, ${quote ? quote.untilLabel : VALIDITY_SHORT}`,
  };
}

/** "Board Pass ₹… · valid till 28 Feb 2027" - the one-line form for the countdown bar. */
export function boardPassShortLine(offer: BoardPassOffer): string {
  return offer.priceDisplay ? `Board Pass ${offer.priceDisplay} \u00b7 ${VALIDITY_SHORT}` : `Board Pass, pay once \u00b7 ${VALIDITY_SHORT}`;
}

/** The Board Pass price ("₹…"), or null when it cannot be quoted. Fixed (PRICE-FIXED-1); `now` is kept for callers. */
export function boardPassPriceNow(now: Date = new Date()): string | null {
  return boardPassOffer(now, predictCbseExamDate("10")).priceDisplay;
}

/** "Board Pass ₹… →": the one CTA label every wall and banner uses; no figure when none can be quoted. */
export function boardPassCtaLabel(price: string | null = boardPassPriceNow()): string {
  return price ? `Board Pass ${price} →` : "Board Pass →";
}

/**
 * The trial-end / upgrade-sheet offer. Board Pass only (PRICE-FIXED-1): `title` is the offer, `priceDisplay` its
 * fixed price, `detail` what it buys, `second` the coverage line (no second option, no saving claim).
 */
export interface PremiumOffer {
  title: "Board Pass";
  priceDisplay: string;
  detail: string;
  /** VALIDITY-FEB27: "Everything unlocked, valid till 28 Feb 2027. No renewals." */
  second: string;
  /** "Founding member offer" before the deadline, else null (owner, 21:20 IST 31 Oct 2026). */
  foundingLabel: string | null;
  /** "Founding member offer ends 30 November. From 1 December: ₹2,499." before the deadline, else null. */
  deadline: string | null;
  boardPass: BoardPassOffer;
}

export function premiumOffer(now: Date, boardIso: string): PremiumOffer {
  const board = boardPassOffer(now, boardIso);
  const quote = tillBoardsQuote(now, boardIso);
  return {
    title: "Board Pass",
    priceDisplay: board.priceDisplay ?? boardPassPriceDisplay(),
    detail: `one payment, ${VALIDITY_SHORT}`,
    second: `Everything unlocked, ${quote ? quote.untilLabel : VALIDITY_SHORT}. No renewals.`,
    foundingLabel: boardPassFoundingLabel(now),
    deadline: boardPassDeadlineLine(now),
    boardPass: board,
  };
}

/** "Board Pass ₹… · valid till 28 Feb 2027" - the one-line form for the countdown bar. */
export function premiumShortLine(offer: PremiumOffer): string {
  return `Board Pass ${offer.priceDisplay} \u00b7 ${VALIDITY_SHORT}`;
}
