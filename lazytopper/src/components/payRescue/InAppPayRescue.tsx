/**
 * InAppPayRescue - INAPP-PAY-1. Inside Instagram / Facebook / another app's own browser the payment sheet often cannot hand over to a
 * UPI app (Razorpay: UPI intent in a WebView needs host-app setup; https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/webview/).
 * After the buyer closed the sheet (or a payment failed and they closed it) this offers the way out: the same checkout in a real browser.
 *   Android -> "Open in Chrome to pay" (an intent:// link: same host, path and query incl. ?buy= and utm / fbclid)
 *   iOS     -> "Tap the ••• menu, then Open in browser" + a Copy link button
 * Renders nothing in a normal browser or when VITE_INAPP_PAY_DISABLED=1. Nothing here touches prices, orders or verification.
 */
import { useEffect, useRef, useState } from "react";
import { trackOnboardingEvent } from "../../analytics/analytics";
import {
  currentInAppPay,
  inAppChromeIntent,
  inAppRescueUrl,
  type InAppBuyTarget,
  type InAppPayApp,
  type InAppPayPlatform,
} from "../../utils/inAppPay";
import "./payRescue.css";

export const INAPP_RESCUE_HEADING = "Payment not going through?";
export const INAPP_RESCUE_LINE_ANDROID = "Payments can fail inside this app's browser. Open this page in Chrome and pay there.";
export const INAPP_RESCUE_LINE_IOS = "Payments can fail inside this app's browser. Tap the ••• menu, then Open in browser, and pay there.";
export const INAPP_RESCUE_CHROME_LABEL = "Open in Chrome to pay";
export const INAPP_RESCUE_COPY_LABEL = "Copy link";
export const INAPP_RESCUE_COPIED = "Link copied. Paste it in your browser.";

export type InAppPayDetected = { app: InAppPayApp; platform: InAppPayPlatform };

export function inAppRescueLine(platform: InAppPayPlatform): string {
  return platform === "android" ? INAPP_RESCUE_LINE_ANDROID : INAPP_RESCUE_LINE_IOS;
}

/** What a sheet's item reopens in the real browser. */
export function buyTargetFromItem(item: { kind: "pass" | "pack"; sku?: string; target?: string }): InAppBuyTarget | undefined {
  if (item.kind === "pass") return { kind: "pass" };
  return item.sku ? { kind: "pack", sku: item.sku, ...(item.target ? { target: item.target } : {}) } : undefined;
}

/** The action buttons (Chrome link on Android, Copy link elsewhere) + a quiet notice. */
export function InAppPayActions({ inApp, buy, href, setNotice }: {
  inApp: InAppPayDetected;
  buy?: InAppBuyTarget;
  href?: string;
  setNotice: (s: string | null) => void;
}) {
  const pageHref = href ?? (typeof window !== "undefined" ? window.location.href : "");
  const chromeHref = inApp.platform === "android" ? inAppChromeIntent(pageHref, buy) : null;
  async function copyLink() {
    trackOnboardingEvent("inapp_pay_rescue_copy_link", { app: inApp.app });
    const link = inAppRescueUrl(pageHref, buy);
    try {
      if (link && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        setNotice(INAPP_RESCUE_COPIED);
        return;
      }
    } catch {
      /* fall through: show the link itself so it can be selected */
    }
    setNotice(link);
  }
  return (
    <>
      {chromeHref && (
        <a
          className="lt-pay-rescue__ask lt-pay-rescue__chrome"
          data-testid="pay-rescue-open-chrome"
          href={chromeHref}
          onClick={() => trackOnboardingEvent("inapp_pay_rescue_open_browser", { app: inApp.app })}
        >
          {INAPP_RESCUE_CHROME_LABEL}
        </a>
      )}
      {inApp.platform !== "android" && (
        <button type="button" className="lt-pay-rescue__ask" data-testid="pay-rescue-copy-link" onClick={() => void copyLink()}>
          {INAPP_RESCUE_COPY_LABEL}
        </button>
      )}
    </>
  );
}

/** Standalone card for the signed-out sheets (CheckoutSheet / GuestPaySheet): shown only in-app, only once a closed sheet is reported. */
export default function InAppPayRescue({ buy, inApp, href }: { buy?: InAppBuyTarget; inApp?: InAppPayDetected | null; href?: string }) {
  const [detected] = useState(() => (inApp !== undefined ? inApp : currentInAppPay()));
  const [notice, setNotice] = useState<string | null>(null);
  const shown = useRef(false);
  useEffect(() => {
    if (!detected || shown.current) return;
    shown.current = true;
    trackOnboardingEvent("inapp_pay_rescue_shown", { app: detected.app });
  }, [detected]);
  if (!detected) return null;
  return (
    <section className="lt-pay-rescue" aria-labelledby="lt-inapp-rescue-h" data-testid="inapp-pay-rescue">
      <h3 id="lt-inapp-rescue-h" className="lt-pay-rescue__h">
        {INAPP_RESCUE_HEADING}
      </h3>
      <p className="lt-pay-rescue__line">{inAppRescueLine(detected.platform)}</p>
      <div className="lt-pay-rescue__actions">
        <InAppPayActions inApp={detected} buy={buy} href={href} setNotice={setNotice} />
        {notice && (
          <p className="lt-pay-rescue__note" role="status" data-testid="pay-rescue-notice">
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}
