/**
 * PayRescueCard - PAY-RESCUE-1 (owner ruling 1 Nov 2026).
 *
 * Production data: most orders opened at checkout were never attempted. A 15-16 year old taps Pay, the
 * Razorpay sheet opens, they have no UPI / card of their own, and they close it. Nothing used to happen next.
 * This card is what happens next: shown right where the checkout was, after the sheet was CLOSED (or after a
 * failed payment and then closed), it offers the parent hand-off.
 *
 *   Pass  -> the EXISTING CHECKOUT-1 action (PaywallActions, `askOnly`): the same server-minted parent link, the
 *            same `ask_parent_pay` event, the same share sheet / WhatsApp behaviour. Nothing new on the server.
 *   Pack  -> the parent-pay link only carries a Premium pass, so a pack cannot ride it. The closest honest option:
 *            share the packs page link with a plain WhatsApp text. No order, link token or payment is created.
 *
 * Nothing here decides money or access. It renders only after the caller saw a `dismissed` outcome.
 */
import { useEffect, useRef, useState } from "react";
import { trackNamedEvent, trackOnboardingEvent, trackPaywallAction } from "../../analytics/analytics";
import { currentInAppPay, type InAppBuyTarget } from "../../utils/inAppPay";
import { InAppPayActions, INAPP_RESCUE_HEADING, inAppRescueLine, type InAppPayDetected } from "./InAppPayRescue";
import { isParentPayClientEnabled } from "../../services/parentPay";
import PaywallActions from "../pricing/PaywallActions";
import { openWhatsAppLink, type ShareNavigator } from "../results/share/shareScore";
import "./payRescue.css";

export const PAY_RESCUE_HEADING = "Can't pay yourself?";
export const PAY_RESCUE_LINE = "Most parents pay for their child. Send them a link — they can pay on their phone.";
export const PAY_RESCUE_ASK_LABEL = "Forward link to parents";
export const PAY_RESCUE_RETRY_LABEL = "Try again";
export const PAY_RESCUE_CLOSE_LABEL = "Not now";
export const PAY_RESCUE_PACK_LINK_FAILED = "WhatsApp didn't open. Please try again.";

/** Where a parent can see the packs and prices. A fixed internal path (the same one /for-parents links to). */
export const PAY_RESCUE_PACKS_PATH = "/pricing?from=for_parents#packs";

export type PayRescueKind = "pass" | "pack";

/** The plain text a student sends a parent for a pack. No price is typed here: the page shows the live prices. */
export function buildPackAskMessage(url: string, packLabel?: string): string {
  const what = packLabel ? `the ${packLabel}` : "a practice PDF pack";
  return (
    `Hi! I'm preparing for my CBSE Class 10 boards on LazyTopper and I'd like ${what}. ` +
    `Can you help me pay for it? Open this on my phone and pay with your UPI or card:\n${url}`
  );
}

export interface PayRescueCardProps {
  kind: PayRescueKind;
  /** Re-open the same checkout. */
  onRetry: () => void;
  /** "Not now": hide the card. */
  onClose: () => void;
  /** Pack only: the pack's name for the message ("Chapter Pack"). */
  packLabel?: string;
  /** INAPP-PAY-1: what to reopen in the real browser (`?buy=`). Absent: the page as it is. */
  buy?: InAppBuyTarget;
  /** Test seams (in-app): the detected app/platform and this page's URL. Default: read from the browser. */
  inApp?: InAppPayDetected | null;
  href?: string;
  /** Test seam (pack hand-off). */
  nav?: ShareNavigator;
  origin?: string;
  openWindow?: (url: string, target: string) => { opener: unknown } | null | undefined;
}

function errorName(e: unknown): string {
  return e && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "";
}

function PayRescueBody({ kind, onRetry, onClose, packLabel, nav, origin, openWindow, buy, inApp, href }: PayRescueCardProps) {
  const ref = useRef<HTMLElement | null>(null);
  const shown = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    trackNamedEvent("pay_rescue_shown");
    if (inApp) trackOnboardingEvent("inapp_pay_rescue_shown", { app: inApp.app });
    // Bring it into view above the bottom nav (`scroll-margin-bottom` in payRescue.css).
    try {
      ref.current?.scrollIntoView?.({ block: "nearest" });
    } catch {
      /* a missing scroll API must not matter */
    }
  }, []);

  async function askForPack() {
    trackNamedEvent("pay_rescue_parent");
    trackPaywallAction("ask", "pay_rescue");
    setNotice(null);
    const base = String(import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    const where = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
    const text = buildPackAskMessage(`${where}${base}${PAY_RESCUE_PACKS_PATH}`, packLabel);
    const n: ShareNavigator | undefined = nav ?? (typeof navigator !== "undefined" ? (navigator as unknown as ShareNavigator) : undefined);
    if (n && typeof n.share === "function") {
      try {
        await n.share({ text });
        return;
      } catch (e) {
        if (errorName(e) === "AbortError") return;
      }
    }
    const open = openWindow ?? ((u: string, t: string) => window.open(u, t));
    if (!openWhatsAppLink(text, open)) setNotice(PAY_RESCUE_PACK_LINK_FAILED);
  }

  return (
    <section ref={ref} className="lt-pay-rescue" aria-labelledby="lt-pay-rescue-h" data-testid="pay-rescue" data-kind={kind}>
      <h3 id="lt-pay-rescue-h" className="lt-pay-rescue__h">
        {inApp ? INAPP_RESCUE_HEADING : PAY_RESCUE_HEADING}
      </h3>
      <p className="lt-pay-rescue__line">
        {inApp ? inAppRescueLine(inApp.platform) : PAY_RESCUE_LINE}
      </p>
      <div className="lt-pay-rescue__actions">
        {inApp && <InAppPayActions inApp={inApp} buy={buy} href={href} setNotice={setNotice} />}
        {kind === "pass" && !isParentPayClientEnabled() ? null : kind === "pass" ? (
          <PaywallActions surface="pay_rescue" askOnly onAsk={() => trackNamedEvent("pay_rescue_parent")} />
        ) : (
          <button
            type="button"
            className="lt-pay-rescue__ask"
            data-testid="pay-rescue-ask-pack"
            onClick={() => void askForPack()}
          >
            {PAY_RESCUE_ASK_LABEL}
          </button>
        )}
        {notice && (
          <p className="lt-pay-rescue__note" role="status" data-testid="pay-rescue-notice">
            {notice}
          </p>
        )}
        <button
          type="button"
          className="lt-pay-rescue__retry"
          data-testid="pay-rescue-retry"
          onClick={() => {
            trackNamedEvent("pay_rescue_retry");
            onRetry();
          }}
        >
          {PAY_RESCUE_RETRY_LABEL}
        </button>
        <button type="button" className="lt-pay-rescue__close" data-testid="pay-rescue-close" onClick={onClose}>
          {PAY_RESCUE_CLOSE_LABEL}
        </button>
      </div>
    </section>
  );
}

/**
 * The card, or nothing. A Premium pass hand-off needs the parent-pay link (both build flags); without it there is
 * nothing honest to offer, so no "Can't pay yourself?" is shown. A pack hand-off needs only a share.
 */
export default function PayRescueCard(props: PayRescueCardProps) {
  // INAPP-PAY-1: detected once per card (null in a normal browser and when VITE_INAPP_PAY_DISABLED=1: exactly today's card).
  const [detected] = useState(() => (props.inApp !== undefined ? props.inApp : currentInAppPay()));
  // An in-app rescue is worth showing even when the parent hand-off is off; the parent action only joins when it exists.
  if (props.kind === "pass" && !isParentPayClientEnabled() && !detected) return null;
  return <PayRescueBody {...props} inApp={detected} />;
}
