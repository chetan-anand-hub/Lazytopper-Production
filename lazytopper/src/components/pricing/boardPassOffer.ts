/**
 * boardPassOffer — ASK-FIX-1, REVERSED by CHECKOUT-1 (owner, 31 Oct 2026).
 *
 * CHECKOUT-1: the MONTH pass ("₹599 for a month") now LEADS every "make the ask" surface (the
 * trial-ended screen and banner, the trial countdown bar, the upgrade sheet, /pricing) and the Board Pass
 * ("pay once, till boards") is the second option, its price unchanged. Why: Razorpay showed ten checkouts
 * opened and none attempted, six of them on the till-boards price; a student who is a minor closes a
 * four-figure sheet. This REVERSES the older "Board Pass leads every offer" rule. The `premiumOffer` /
 * `monthlyCtaLabel` / `premiumShortLine` helpers below are the month-first API. `boardPassOffer`,
 * `boardPassPriceNow`, `boardPassCtaLabel` and `boardPassShortLine` keep their ASK-FIX-1 meaning (the
 * till-boards offer) because surfaces outside this lane (e.g. LockedDetail, TutorErrorView, PaperCapAsk) still
 * read them with till-boards wording around the figure.
 *
 * This module only READS config/pricing.ts: no price is typed
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
import { predictCbseExamDate } from "../../services/cbseExamDate";

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

/** The Board Pass price for today ("₹…"), or null when it cannot be quoted. Reads the clock: call it at render. */
export function boardPassPriceNow(now: Date = new Date()): string | null {
  return boardPassOffer(now, predictCbseExamDate("10")).priceDisplay;
}

/** FIRST-OFFER-1 - "Board Pass ₹… →": the one CTA label every wall and banner uses; no figure when none can be quoted. */
export function boardPassCtaLabel(price: string | null = boardPassPriceNow()): string {
  return price ? `Board Pass ${price} →` : "Board Pass →";
}

/**
 * CHECKOUT-1 - the month-first offer. `lead` is "₹599 for a month" (the founding or list price, whichever
 * this clock charges); `second` is the Board Pass line, or the plain "Board Pass, pay once till your boards"
 * when no till-boards quote exists. Nothing here is typed: it reads config/pricing.ts.
 */
export interface PremiumOffer {
  title: "Premium";
  /** The month price, "₹…". Always available (it is a constant, not a quote). */
  priceDisplay: string;
  /** "for a month". */
  detail: string;
  /** "Or Board Pass ₹… - pay once till your boards (Feb 2027) · save 20%" (no figure when it cannot be quoted). */
  second: string;
  /** The Board Pass offer behind `second`, unchanged. */
  boardPass: BoardPassOffer;
}

export function premiumOffer(now: Date, boardIso: string): PremiumOffer {
  const board = boardPassOffer(now, boardIso);
  const price = foundingOfferOpen(now) ? PRICE_MONTHLY_FOUNDING_DISPLAY : PRICE_MONTHLY_LIST_DISPLAY;
  return {
    title: "Premium",
    priceDisplay: price,
    detail: "for a month",
    second: board.priceDisplay
      ? `Or Board Pass ${board.priceDisplay} - ${board.detail.charAt(0).toLowerCase()}${board.detail.slice(1)}`
      : "Or Board Pass - pay once, till your boards",
    boardPass: board,
  };
}

/** "Premium ₹… for a month" - the one-line form for the countdown bar. */
export function premiumShortLine(offer: PremiumOffer): string {
  return `Premium ${offer.priceDisplay} ${offer.detail}`;
}

/** The month price for today ("₹…"). Reads the clock: call it at render. */
export function monthlyPriceNow(now: Date = new Date()): string {
  return premiumOffer(now, predictCbseExamDate("10")).priceDisplay;
}

/** CHECKOUT-1 - "Premium ₹… for a month →": the CTA label the month-first walls and banners use. */
export function monthlyCtaLabel(price: string = monthlyPriceNow()): string {
  return `Premium ${price} for a month →`;
}
