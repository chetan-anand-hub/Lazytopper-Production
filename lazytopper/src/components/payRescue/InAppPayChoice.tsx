/**
 * InAppPayChoice - INAPP-PAY-CHOICE-1. Inside Instagram / Facebook / YouTube's own browser, an EXTRA secondary option right under the
 * normal Buy / Pay button (never replacing it, never blocking it): pay in the phone's real browser, where UPI apps open more reliably.
 *   Android -> "Pay in Chrome (UPI apps open more reliably)": the Chrome intent for this exact item (same checkout reopens at once)
 *   iOS 17+ -> "Pay in Safari" (x-safari-https) + "Copy payment link"; older iOS -> copy only
 *   other   -> "Copy payment link"
 * The link keeps the page's utm_* / fbclid / gclid, adds the stored first-touch utm_* and `via=inapp`. No personal data in it.
 * Callers render it for SIGNED-OUT visitors only (a signed-in buyer who hops to Chrome arrives signed out and loses account pricing).
 * Renders nothing in a normal browser, or with VITE_INAPP_PAY_CHOICE_DISABLED=1 / VITE_INAPP_PAY_DISABLED=1. Touches no price, order or verification.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { trackOnboardingEvent } from "../../analytics/analytics";
import { handoffSourceParams } from "../../analytics/visitSource";
import {
  currentInAppPayChoice,
  iosSafariSupported,
  inAppChoiceChromeIntent,
  inAppChoiceUrl,
  inAppSafariUrl,
  type InAppBuyTarget,
} from "../../utils/inAppPay";
import { INAPP_PAY_FIRST_HERE_LABEL, INAPP_PAY_FIRST_NOTE, inAppPayFirstActive, inAppPayFirstPayHere, subscribeInAppPayFirst } from "../../utils/inAppPayFirst";
import type { InAppPayDetected } from "./InAppPayRescue";
import "./payRescue.css";

export const INAPP_CHOICE_CHROME_LABEL = "Pay in Chrome (UPI apps open more reliably)";
export const INAPP_CHOICE_SAFARI_LABEL = "Pay in Safari";
export const INAPP_CHOICE_COPY_LABEL = "Copy payment link";
export const INAPP_CHOICE_COPIED_IOS = "Link copied — open it in Safari";
export const INAPP_CHOICE_COPIED_OTHER = "Link copied — open it in your browser";

/** A page slug for the events, from the path the option sits on. */
export function inAppChoiceSurface(pathname: string): string {
  const p = pathname.replace(/\/+$/, "").toLowerCase();
  if (p.endsWith("/cbq-packs")) return "cbq_packs";
  if (p.endsWith("/packs")) return "packs";
  if (p.endsWith("/test-series")) return "test_series";
  if (p.endsWith("/board-pass")) return "board_pass";
  if (p.endsWith("/pricing")) return "pricing";
  if (p.endsWith("/for-parents")) return "for_parents";
  return "other";
}

/** At most one `inapp_pay_choice_shown` per page view, however many buttons render the option. Test seam: reset. */
let choiceShownSent = false;
export function resetInAppPayChoiceShown(): void {
  choiceShownSent = false;
}

export interface InAppPayChoiceProps {
  /** The item this Buy / Pay is for: reopened by `?buy=` in the real browser. Absent (/for-parents): the link is the page itself, no `?buy=`. */
  buy?: InAppBuyTarget;
  surface?: string;
  /** Test seams: detected app/platform (null = normal browser), this page's URL, the UA and the stored first-touch params. */
  inApp?: InAppPayDetected | null;
  href?: string;
  userAgent?: string;
  sourceParams?: ReadonlyArray<readonly [string, string]>;
  /** INAPP-PAY-FIRST-1: runs today's in-webview Buy for this item ("Pay here instead"). Callers render this component for signed-out visitors only. */
  onPayHere?: () => void;
}

export default function InAppPayChoice({ buy, surface, inApp, href, userAgent, sourceParams, onPayHere }: InAppPayChoiceProps) {
  const [detected] = useState(() => (inApp !== undefined ? inApp : currentInAppPayChoice()));
  const [notice, setNotice] = useState<string | null>(null);
  const shown = useRef(false);
  // INAPP-PAY-FIRST-1: while the Buy tap hops to Chrome (Instagram / Facebook on Android, signed out), this slot is the short note + "Pay here instead".
  const payFirst = useSyncExternalStore(subscribeInAppPayFirst, () => inAppPayFirstActive(false), () => false);
  const where = surface ?? (typeof window !== "undefined" ? inAppChoiceSurface(window.location.pathname) : "other");
  // INAPP-PAY-FIRST-1b: while the pay-first note is what shows, this is not a "choice shown" (keeps the PAY-CHOICE-1 funnel honest); it fires when the choice really appears.
  const noteShowing = payFirst && !!onPayHere;
  useEffect(() => {
    if (!detected || shown.current || noteShowing) return;
    shown.current = true;
    if (choiceShownSent) return;
    choiceShownSent = true;
    trackOnboardingEvent("inapp_pay_choice_shown", { app: detected.app, platform: detected.platform, surface: where });
  }, [detected, where, noteShowing]);
  if (!detected) return null;
  if (payFirst && onPayHere) {
    return (
      <div className="lt-pay-choice" data-testid="inapp-pay-first">
        <p className="lt-pay-choice__note" data-testid="inapp-pay-first-note">{INAPP_PAY_FIRST_NOTE}</p>
        <button
          type="button"
          className="lt-pay-choice__btn"
          data-testid="inapp-pay-first-here"
          onClick={() => {
            inAppPayFirstPayHere();
            onPayHere();
          }}
        >
          {INAPP_PAY_FIRST_HERE_LABEL}
        </button>
      </div>
    );
  }

  const pageHref = href ?? (typeof window !== "undefined" ? window.location.href : "");
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const source = () => sourceParams ?? handoffSourceParams();
  const android = detected.platform === "android";
  const ios = detected.platform === "ios";
  const httpsLink = inAppChoiceUrl(pageHref, buy, source());
  const chromeHref = android ? inAppChoiceChromeIntent(pageHref, buy, source()) : null;
  const safariHref = ios && iosSafariSupported(ua) && httpsLink ? inAppSafariUrl(httpsLink) : null;
  const event = { app: detected.app, platform: detected.platform, surface: where } as const;

  async function copyLink() {
    trackOnboardingEvent("inapp_pay_copy_link", event);
    try {
      if (httpsLink && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(httpsLink);
        setNotice(ios ? INAPP_CHOICE_COPIED_IOS : INAPP_CHOICE_COPIED_OTHER);
        return;
      }
    } catch {
      /* fall through: show the link itself so it can be selected */
    }
    setNotice(httpsLink);
  }

  if (!chromeHref && !safariHref && !httpsLink) return null;
  return (
    <div className="lt-pay-choice" data-testid="inapp-pay-choice">
      {chromeHref && (
        <a
          className="lt-pay-choice__btn"
          data-testid="inapp-pay-choice-chrome"
          href={chromeHref}
          onClick={() => trackOnboardingEvent("inapp_pay_open_external", event)}
        >
          {INAPP_CHOICE_CHROME_LABEL}
        </a>
      )}
      {safariHref && (
        <a
          className="lt-pay-choice__btn"
          data-testid="inapp-pay-choice-safari"
          href={safariHref}
          onClick={() => trackOnboardingEvent("inapp_pay_open_external", event)}
        >
          {INAPP_CHOICE_SAFARI_LABEL}
        </a>
      )}
      {!android && httpsLink && (
        <button type="button" className="lt-pay-choice__btn" data-testid="inapp-pay-choice-copy" onClick={() => void copyLink()}>
          {INAPP_CHOICE_COPY_LABEL}
        </button>
      )}
      {notice && (
        <p className="lt-pay-choice__note" role="status" data-testid="inapp-pay-choice-notice">
          {notice}
        </p>
      )}
    </div>
  );
}
