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

/**
 * PREEXIST-FIX-1 - "this device was signed in last time we looked", kept by THIS mount (set when auth settles with a user,
 * cleared when it settles signed out). Not account or premium state: it only decides whether to hold the card's space while
 * auth loads. Firebase's own localStorage / sessionStorage records (used when IndexedDB is unavailable) count too.
 */
export const BROWSE_SIGNED_IN_HINT_KEY = "lt.browse.signedInHint.v1";
const FIREBASE_USER_PREFIX = "firebase:authUser:";
const LOCAL_AUTH_KEY = "lazytopper.auth.local.v1";

export function likelySignedIn(): boolean {
  try {
    if (window.localStorage.getItem(BROWSE_SIGNED_IN_HINT_KEY) === "1") return true;
    if (window.localStorage.getItem(LOCAL_AUTH_KEY)) return true;
    for (const store of [window.localStorage, window.sessionStorage]) {
      for (let i = 0; i < store.length; i++) if (String(store.key(i)).startsWith(FIREBASE_USER_PREFIX)) return true;
    }
    return false;
  } catch {
    return true; // unreadable storage: behave as before (nothing while auth loads)
  }
}

export function writeSignedInHint(signedIn: boolean): void {
  try {
    if (signedIn) window.localStorage.setItem(BROWSE_SIGNED_IN_HINT_KEY, "1");
    else window.localStorage.removeItem(BROWSE_SIGNED_IN_HINT_KEY);
  } catch {
    /* storage blocked: the hint is only an optimisation */
  }
}
