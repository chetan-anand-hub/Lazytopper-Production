/**
 * trialEarlyStripModel - TRIAL-SELL-1. The PURE half of the desktop trial strip for trial days 1-3.
 *
 * WHY. On desktop a trial student saw NOTHING about the trial on days 1-3: the old strip
 * (ux/TrialBanner) mounts on phones only, and the countdown bar (TrialCountdownBar) starts on day 4.
 * This strip fills exactly that gap and hands over to the bar on day 4 - both read the SAME IST
 * calendar-day model (trialEndBannerModel.trialBannerTiming), so they can never overlap or leave a hole.
 *
 * HONEST BY CONSTRUCTION. The day is the real IST trial day; the price comes from config/pricing
 * (`boardPassPriceDisplay`), and the founding note follows `foundingOfferOpen` with the date from
 * `FOUNDING_OFFER_LAST_DAY_LABEL` - no price or date is typed here. No countdown, no seat count.
 */
import { VALIDITY_SHORT } from "../../config/validity";
import { TRIAL_DAYS } from "../../services/subscriptionService";
import { boardPassPriceDisplay, foundingOfferOpen, FOUNDING_OFFER_LAST_DAY_LABEL } from "../../config/pricing";
import { TRIAL_BAR_FIRST_DAY, trialBannerTiming, trialBarFirstDay } from "./trialEndBannerModel";

/** The strip shows on trial days 1 .. (the bar's first day - 1); the countdown bar takes over after. Legacy 7-day trial: days 1-3; a 3-day trial (TRIAL-3DAY-1): day 1. */
export const TRIAL_STRIP_LAST_DAY = TRIAL_BAR_FIRST_DAY - 1;

/** The 1-based IST trial day when the strip applies, else null (no / future / ended trial, or day 4+). */
export function trialEarlyStripDay(trialStartIso: string | null | undefined, nowMs: number): number | null {
  const timing = trialBannerTiming(trialStartIso, nowMs, 1);
  if (!timing) return null;
  const lastDay = trialBarFirstDay(timing.trialDays) - 1;
  return timing.dayOfTrial >= 1 && timing.dayOfTrial <= lastDay ? timing.dayOfTrial : null;
}

/** "Trial: day 2 of 7" (a legacy trial) / "Trial: day 1 of 3". `trialDays` defaults to the current length. */
export function trialEarlyStripDayText(day: number, trialDays: number = TRIAL_DAYS): string {
  return `Trial: day ${day} of ${trialDays}`;
}

/** "Board Pass ₹1,917 · valid till 28 Feb 2027 (founding offer till 30 November)" - the note only while the offer is open. */
export function trialEarlyStripOfferText(nowMs: number): string {
  const price = boardPassPriceDisplay(nowMs);
  // PRICE-HOLD-1: no end date exists, so no "till <date>" note (only if a date is ever ruled again).
  const note = foundingOfferOpen(nowMs) && FOUNDING_OFFER_LAST_DAY_LABEL !== null ? ` (founding offer till ${FOUNDING_OFFER_LAST_DAY_LABEL})` : "";
  return `Board Pass ${price} \u00b7 ${VALIDITY_SHORT}${note}`;
}
