/**
 * boardPassOffer — ASK-FIX-1. The Board Pass ("pay once, till boards") is the LEAD offer and the
 * monthly pass the second, on every "make the ask" surface (the trial-ended screen, the trial
 * countdown bar, the upgrade sheet). This module only READS config/pricing.ts: no price is typed
 * here, and both the clock (`now`) and the board date (`boardIso`; callers pass
 * `predictCbseExamDate("10")`) are arguments, so this file reads no clock and a test pins any day.
 *
 * If the till-boards quote is unavailable (an unparseable board date) the lead has no price and
 * says so by omission: `priceDisplay` is null and the caller shows no figure rather than a guess.
 */
import {
  foundingOfferOpen,
  PRICE_MONTHLY_FOUNDING_DISPLAY,
  PRICE_MONTHLY_LIST_DISPLAY,
  tillBoardsQuote,
} from "../../config/pricing";

export interface BoardPassOffer {
  /** The lead offer's name. */
  title: "Board Pass";
  /** The one-time till-boards price, or null when it cannot be quoted. */
  priceDisplay: string | null;
  /** The struck-through monthly-times-months price, or null. */
  fullDisplay: string | null;
  /** "Pay once till your boards (Feb 2027) · save 20%" - or the plain "Pay once, till your boards". */
  detail: string;
  /** The second option: "₹… for a month". */
  monthlyLine: string;
}

export function boardPassOffer(now: Date, boardIso: string): BoardPassOffer {
  const quote = tillBoardsQuote(now, boardIso, foundingOfferOpen(now));
  const monthly = foundingOfferOpen(now) ? PRICE_MONTHLY_FOUNDING_DISPLAY : PRICE_MONTHLY_LIST_DISPLAY;
  return {
    title: "Board Pass",
    priceDisplay: quote ? quote.priceDisplay : null,
    fullDisplay: quote ? quote.fullDisplay : null,
    detail: quote ? `Pay once ${quote.untilLabel} · ${quote.savingLabel}` : "Pay once, till your boards",
    monthlyLine: `${monthly} for a month`,
  };
}

/** "Board Pass ₹… till boards" - the one-line form for the countdown bar. */
export function boardPassShortLine(offer: BoardPassOffer): string {
  return offer.priceDisplay ? `Board Pass ${offer.priceDisplay} till boards` : "Board Pass, pay once till boards";
}
