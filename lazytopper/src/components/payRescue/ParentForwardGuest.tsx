/**
 * ParentForwardGuest - PARENT-PAY-FIRST-1. The signed-out half: after a closed or failed Razorpay sheet, the first and largest action
 * is "Send to Mummy/Papa on WhatsApp" (the product page, tagged), then "Show QR for parent to scan" (the same URL). "Try paying
 * again" is the sheet's own Pay button below this panel. Renders nothing when VITE_PARENT_PAY_FIRST_DISABLED=1.
 * See ./parentForward for why a guest's message carries a page and not a per-account link.
 */
import { useEffect, useRef, useState } from "react";
import { openWhatsAppLink } from "../results/share/shareScore";
import { whatsAppShareUrl } from "../results/share/shareCardModel";
import {
  PARENT_FORWARD_HEADING,
  PARENT_FORWARD_LABEL,
  PARENT_FORWARD_LINE,
  PARENT_FORWARD_QR_ALT,
  PARENT_FORWARD_QR_FAILED,
  PARENT_FORWARD_QR_LABEL,
  PARENT_FORWARD_QR_NOTE,
  PARENT_FORWARD_WA_BLOCKED,
  PARENT_FORWARD_WA_FALLBACK,
  buildParentForwardMessage,
  forwardProductOf,
  isParentPayFirstDisabled,
  parentForwardUrl,
  quotablePrice,
  trackParentForward,
  type ParentForwardItem,
} from "./parentForward";
import "./payRescue.css";

export interface ParentForwardGuestProps {
  item: ParentForwardItem;
  /** "attach": the parent pays, then enters the child's number (CheckoutSheet). "number": number first (GuestPaySheet). */
  flow: "attach" | "number";
  /** Test seams. */
  origin?: string;
  now?: number;
  makeQr?: (url: string) => Promise<string>;
  openWindow?: (url: string, target: string) => { opener: unknown } | null | undefined;
}

async function defaultQr(url: string): Promise<string> {
  const { generateQRDataUrl } = await import("../../services/referralService");
  return generateQRDataUrl(url, 220);
}

export default function ParentForwardGuest({ item, flow, origin, now, makeQr = defaultQr, openWindow }: ParentForwardGuestProps) {
  const product = forwardProductOf(item);
  const [qr, setQr] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [waHref, setWaHref] = useState<string | null>(null);
  const shown = useRef(false);
  const off = isParentPayFirstDisabled();

  useEffect(() => {
    if (off || shown.current) return;
    shown.current = true;
    trackParentForward("shown", false, product);
  }, [off, product]);

  if (off) return null;

  function message(): string {
    const base = String(import.meta.env.BASE_URL || "/");
    const where = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
    const url = parentForwardUrl(item, where, base);
    return buildParentForwardMessage({ name: item.label, price: quotablePrice(item, now), url, flow });
  }

  function send() {
    trackParentForward("clicked", false, product);
    const text = message();
    const open = openWindow ?? ((u: string, t: string) => window.open(u, t));
    setWaHref(openWhatsAppLink(text, open) ? null : whatsAppShareUrl(text));
  }

  async function showQr() {
    if (qr) {
      setQr(null);
      return;
    }
    const base = String(import.meta.env.BASE_URL || "/");
    const where = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
    trackParentForward("qr_shown", false, product);
    try {
      setQr(await makeQr(parentForwardUrl(item, where, base)));
      setQrFailed(false);
    } catch {
      setQrFailed(true);
    }
  }

  return (
    <section className="lt-pf" aria-labelledby="lt-pf-h" data-testid="parent-forward" data-product={product}>
      <h3 id="lt-pf-h" className="lt-pf__h">
        {PARENT_FORWARD_HEADING}
      </h3>
      <p className="lt-pf__line">{PARENT_FORWARD_LINE}</p>
      <button type="button" className="lt-pf__send" data-testid="parent-forward-send" onClick={send}>
        {PARENT_FORWARD_LABEL}
      </button>
      {waHref && (
        <p className="lt-pf__note" role="status" data-testid="parent-forward-blocked">
          {PARENT_FORWARD_WA_BLOCKED}{" "}
          <a href={waHref} target="_blank" rel="noopener noreferrer" data-testid="parent-forward-wa">
            {PARENT_FORWARD_WA_FALLBACK}
          </a>
        </p>
      )}
      <button type="button" className="lt-pf__qrbtn" data-testid="parent-forward-qr" onClick={() => void showQr()}>
        {PARENT_FORWARD_QR_LABEL}
      </button>
      {qr && (
        <div className="lt-pf__qr" data-testid="parent-forward-qr-panel">
          <img src={qr} alt={PARENT_FORWARD_QR_ALT} width={220} height={220} />
          <p className="lt-pf__note">{PARENT_FORWARD_QR_NOTE}</p>
        </div>
      )}
      {qrFailed && (
        <p className="lt-pf__note" role="status" data-testid="parent-forward-qr-failed">
          {PARENT_FORWARD_QR_FAILED}
        </p>
      )}
    </section>
  );
}
