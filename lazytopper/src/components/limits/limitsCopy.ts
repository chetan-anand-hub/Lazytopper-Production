/**
 * limitsCopy — LIMITS-1: every sentence a student reads about the download limit, as PURE
 * functions of numbers the SERVER sent. Plain, child-appropriate, no countdown, no seat count.
 * A number is never typed here: the limit, what is left and the time all arrive from the server.
 */
import { formatResetIst } from "../usage/fairUseGate";
import type { DownloadCounters } from "../../services/limitsClient";
import {
  BOARD_PASS_NAME,
  FOUNDING_OFFER_LAST_DAY_LABEL,
  PRICE_MONTHLY_FOUNDING_DISPLAY,
  foundingOfferOpen,
  monthlyInline,
  tillBoardsQuote,
} from "../../config/pricing";
import { predictCbseExamDate } from "../../services/cbseExamDate";

export const SIGNED_OUT_CHIP = "Sign up — your first download is free";
export const FIRST_FREE_CHIP = "Your first download is free.";

/** The chip beside a download button, or null when there is nothing honest to say. */
export function chipText(tier: string | null, d: DownloadCounters | null, nowMs: number = Date.now()): string | null {
  if (!d || !d.metered || d.limit === null) return null;
  if (d.firstFreeAvailable) return FIRST_FREE_CHIP;
  const left = d.remaining ?? Math.max(0, d.limit - d.used);
  if (left <= 0) {
    const when = d.resetAt ? formatResetIst(d.resetAt, nowMs) : "";
    return when ? `Next free download: ${when}` : "No free downloads left this week";
  }
  if (tier === "trial") return `${left} of ${d.limit} downloads left this week`;
  return `Free download: ${left} left this week`;
}

export interface DownloadWallCopy {
  title: string;
  body: string;
  keep: string;
}

export function blockedWallCopy(resetAt: string | null, nowMs: number = Date.now(), tier: string | null = null): DownloadWallCopy {
  const when = resetAt ? formatResetIst(resetAt, nowMs) : "";
  // A trial student has had more than one download; "Basic" and "the free download" would be wrong for them.
  if (tier === "trial") {
    return {
      title: "You've used this week's downloads",
      body:
        (when ? `Your next download opens ${when}. ` : "") +
        "Premium gives you unlimited downloads, graded practice sets and the full step-by-step breakdown.",
      keep: "Maybe later",
    };
  }
  return {
    title: "You've used this week's free download",
    body:
      (when ? `Your next free download opens ${when}. ` : "") +
      "Premium gives you unlimited downloads, graded practice sets and the full step-by-step breakdown.",
    keep: "Keep using Basic",
  };
}

/** The wall at the daily graded Quick Practice limit. Every day/time comes from the server. */
export function blockedPracticeCopy(resetAt: string | null, nowMs: number = Date.now(), tier: string | null = null): DownloadWallCopy {
  const when = resetAt ? formatResetIst(resetAt, nowMs) : "";
  return {
    title: tier === "trial" ? "You've used today's graded practice sets" : "That was today's free practice set",
    body:
      (when ? `Your next graded set opens ${when}. ` : "") +
      "Every question and solution is still here to read. Premium gives you unlimited graded practice sets and the full step-by-step breakdown.",
    keep: "Keep reading the set",
  };
}

export const SIGNED_OUT_WALL: DownloadWallCopy = {
  title: "Sign up — your first download is free",
  body: "Make a free account and download your first paper on us. You can keep reading every question and solution here.",
  keep: "Not now",
};

export const OFFLINE_WALL: DownloadWallCopy = {
  title: "Connect to download",
  body: "We need a connection to start your download. Try again once you are back online. Your paper is still here.",
  keep: "OK",
};

export interface WallOfferLines {
  /** The Board Pass, which LEADS (PRICING-1): "Board Pass ₹… till your boards (Mar 2027) · save 20%". Null when no quote. */
  boardPass: string | null;
  /** The monthly price, second: "₹599 for a month" (founding) or the list price once the offer has closed. */
  monthly: string;
  /** "Founding price ₹599 a month until 30 November." Only while the offer is open; null after the close. */
  founding: string | null;
}

/**
 * The wall's offer, from the SAME pricing helpers /pricing uses: no price, date or percentage is
 * typed here. PURE: the clock is an argument, so a test pins any day and the line disappears on
 * the day the founding offer closes.
 */
export function wallOfferLines(now: Date): WallOfferLines {
  const open = foundingOfferOpen(now);
  const quote = tillBoardsQuote(now, predictCbseExamDate("10"), open);
  return {
    boardPass: quote ? `${BOARD_PASS_NAME} ${quote.priceDisplay} ${quote.untilLabel} · ${quote.savingLabel}` : null,
    monthly: monthlyInline(open),
    founding: open ? `Founding price ${PRICE_MONTHLY_FOUNDING_DISPLAY} a month until ${FOUNDING_OFFER_LAST_DAY_LABEL}.` : null,
  };
}
