/**
 * InAppPayGuardHost - INAPP-GAP-1. The guard sheet for a signed-out Buy tap inside an in-app browser with no working hop to a real browser.
 * "Copy payment link" is primary; "Pay here anyway" is secondary and the only way Razorpay opens in the webview. Several hosts may be
 * mounted on one page (the shop + the pass checkout): only the first mounted one renders. Nothing here touches price, order or verification.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { trackOnboardingEvent } from "../../analytics/analytics";
import { handoffSourceParams } from "../../analytics/visitSource";
import { inAppChoiceUrl } from "../../utils/inAppPay";
import { INAPP_STUCK_COPY_NOTE } from "../../utils/inAppPayFirst";
import { currentInAppGuard, dismissInAppGuard, inAppGuardPayHere, subscribeInAppGuard } from "../../utils/inAppPayGuard";
import "./payRescue.css";

export const INAPP_GUARD_TITLE = "Pay in your phone's browser";
export const INAPP_GUARD_LINE = "UPI apps open more reliably in Chrome or Safari than inside this app.";
export const INAPP_GUARD_COPY_LABEL = "Copy payment link";
export const INAPP_GUARD_COPIED = "Link copied — open it in your browser";
export const INAPP_GUARD_HERE_LABEL = "Pay here anyway";
export const INAPP_GUARD_IOS_NOTE = "Open Safari, paste the link, and pay there.";

const hosts: symbol[] = [];

export default function InAppPayGuardHost() {
  const idRef = useRef<symbol>(Symbol("guard-host"));
  const [leader, setLeader] = useState(false);
  useEffect(() => {
    const id = idRef.current;
    hosts.push(id);
    setLeader(hosts[0] === id);
    return () => {
      const i = hosts.indexOf(id);
      if (i >= 0) hosts.splice(i, 1);
    };
  }, []);
  const req = useSyncExternalStore(subscribeInAppGuard, currentInAppGuard, () => null);
  const [notice, setNotice] = useState<string | null>(null);
  const shownFor = useRef<unknown>(null);
  useEffect(() => {
    if (!leader || !req || shownFor.current === req) return;
    shownFor.current = req;
    setNotice(null);
    trackOnboardingEvent("inapp_pay_guard_shown", { app: req.app, platform: req.platform, surface: req.surface });
  }, [leader, req]);
  if (!leader || !req) return null;
  const event = { app: req.app, platform: req.platform, surface: req.surface } as const;
  const link = inAppChoiceUrl(window.location.href, req.buy, handoffSourceParams());

  async function copy() {
    trackOnboardingEvent("inapp_pay_guard_copy", event);
    try {
      if (link && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        setNotice(INAPP_GUARD_COPIED);
        return;
      }
    } catch {
      /* fall through: show the link so it can be selected */
    }
    setNotice(link);
  }

  return (
    <div className="lt-pay-guard" role="dialog" aria-modal="true" aria-labelledby="lt-pay-guard-h" data-testid="inapp-pay-guard">
      <div className="lt-pay-guard__sheet">
        <h2 className="lt-pay-guard__h" id="lt-pay-guard-h">{INAPP_GUARD_TITLE}</h2>
        <p className="lt-pay-guard__line">{INAPP_GUARD_LINE}</p>
        {link && (
          <button type="button" className="lt-pay-choice__btn lt-pay-choice__btn--primary" data-testid="inapp-pay-guard-copy" onClick={() => void copy()}>
            {INAPP_GUARD_COPY_LABEL}
          </button>
        )}
        {link && <p className="lt-pay-choice__note" data-testid="inapp-pay-guard-note">{req.platform === "ios" ? INAPP_GUARD_IOS_NOTE : INAPP_STUCK_COPY_NOTE}</p>}
        {notice && <p className="lt-pay-choice__note" role="status" data-testid="inapp-pay-guard-notice">{notice}</p>}
        <button
          type="button"
          className="lt-pay-choice__btn"
          data-testid="inapp-pay-guard-here"
          onClick={() => {
            trackOnboardingEvent("inapp_pay_guard_payhere", event);
            inAppGuardPayHere();
          }}
        >
          {INAPP_GUARD_HERE_LABEL}
        </button>
        <button type="button" className="lt-pay-guard__close" data-testid="inapp-pay-guard-close" onClick={dismissInAppGuard}>
          Not now
        </button>
      </div>
    </div>
  );
}
