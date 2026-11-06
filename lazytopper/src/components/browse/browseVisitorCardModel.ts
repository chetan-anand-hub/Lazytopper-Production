/**
 * BROWSE-VISITOR-CARD-1 - the small, dependency-free half of the /browse visitor card: what the card says (read from
 * the pricing config, never typed), where its links go, and the session-scoped memory of "dismissed" and "shown".
 *
 * Kept apart from the card so the lazy wrapper can ask "is it dismissed?" without loading the card's chunk.
 *
 * Every price, label and date comes from `boardPassOffer` / `config/pricing`, so after the founding deadline the card
 * shows the then-current price with no "founding" wording, and any later change to the shared price label (for
 * example GST-EXCL-1) reaches this card with no edit here.
 */
import { premiumOffer } from "../pricing/boardPassOffer";
import { BOARD_PASS_TICKS } from "../pricing/pricingPlansCopy";
import { BOARD_PASS_NAME } from "../../config/pricing";
import { predictCbseExamDate } from "../../services/cbseExamDate";

/** The one owner-worded credential line. */
export const BROWSE_CARD_IITIAN_LINE = "Made by an IITian (IIT Kanpur)";

/** Sign-up goes to the login page and comes back to /browse (the same encoding MobileSignUpButton uses). */
export const BROWSE_CARD_SIGNUP_PATH = `/login?redirect=${encodeURIComponent("/browse")}`;
export const BROWSE_CARD_PRICING_PATH = "/pricing?source=browse-card";

export const BROWSE_CARD_DISMISS_KEY = "lt.browseVisitorCard.dismissed";
export const BROWSE_CARD_SHOWN_KEY = "lt.browseVisitorCard.shown";

export interface BrowseVisitorCardCopy {
  /** The Board Pass benefit line, reused from the pricing page's first tick (Answer Checker). */
  benefit: string;
  /** "Board Pass ₹1,917" - the name and the price at `now`. */
  priceHead: string;
  /** "one payment till your boards". */
  priceDetail: string;
  /** "Founding member offer ends 30 November. From 1 December: ₹2,499." before the deadline, else null. */
  deadline: string | null;
}

export function browseVisitorCardCopy(now: Date = new Date()): BrowseVisitorCardCopy {
  const offer = premiumOffer(now, predictCbseExamDate("10"));
  const tick = BOARD_PASS_TICKS[0];
  return {
    benefit: tick ? `${tick.strong ?? ""}${tick.text}` : "",
    priceHead: `${BOARD_PASS_NAME} ${offer.priceDisplay}`,
    priceDetail: offer.detail,
    deadline: offer.deadline,
  };
}

/* ── Session memory. Storage can throw (private window, blocked data): then nothing is remembered and the card still works. ── */

export function isBrowseCardDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(BROWSE_CARD_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function markBrowseCardDismissed(): void {
  try {
    window.sessionStorage.setItem(BROWSE_CARD_DISMISS_KEY, "1");
  } catch {
    /* nothing to remember it with */
  }
}

let shownInMemory = false;

/** True the FIRST time it is called in a browser session (the caller then sends `browse_visitor_card_shown`), else false. */
export function takeBrowseCardShownOnce(): boolean {
  try {
    if (window.sessionStorage.getItem(BROWSE_CARD_SHOWN_KEY) === "1") return false;
    window.sessionStorage.setItem(BROWSE_CARD_SHOWN_KEY, "1");
    return true;
  } catch {
    if (shownInMemory) return false;
    shownInMemory = true;
    return true;
  }
}

/** Test seam: forget the in-memory fallback. */
export function resetBrowseCardForTests(): void {
  shownInMemory = false;
  try {
    window.sessionStorage.removeItem(BROWSE_CARD_DISMISS_KEY);
    window.sessionStorage.removeItem(BROWSE_CARD_SHOWN_KEY);
  } catch {
    /* ignore */
  }
}
