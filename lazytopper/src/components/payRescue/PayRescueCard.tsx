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
import { trackNamedEvent, trackPaywallAction } from "../../analytics/analytics";
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
  /** Test seams (pack hand-off). */
  nav?: ShareNavigator;
  origin?: string;
  openWindow?: (url: string, target: string) => { opener: unknown } | null | undefined;
}

function errorName(e: unknown): string {
  return e && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "";
}

function PayRescueBody({ kind, onRetry, onClose, packLabel, nav, origin, openWindow }: PayRescueCardProps) {
  const ref = useRef<HTMLElement | null>(null);
  const shown = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    trackNamedEvent("pay_rescue_shown");
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
        {PAY_RESCUE_HEADING}
      </h3>
      <p className="lt-pay-rescue__line">{PAY_RESCUE_LINE}</p>
      <div className="lt-pay-rescue__actions">
        {kind === "pass" ? (
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
  if (props.kind === "pass" && !isParentPayClientEnabled()) return null;
  return <PayRescueBody {...props} />;
}
