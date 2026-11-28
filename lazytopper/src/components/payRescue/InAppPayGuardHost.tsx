/**
 * InAppPayGuardHost - INAPP-GAP-1. The guard sheet for a signed-out Buy tap inside an in-app browser with no working hop to a real browser.
 * "Copy payment link" is primary; "Pay here anyway" is secondary and the only way Razorpay opens in the webview. Rendered through a portal
 * on document.body (above the pack pop-up, which is also portalled). Several hosts may be mounted on one page (the shop + the pass
 * checkout): the first mounted renders, and the next takes over when it unmounts. Focus moves into the sheet, Escape = "Not now", and
 * focus returns to the Buy that opened it. Nothing here touches price, order or verification.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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

// Host registry: the first entry renders; subscribers are told when the list changes so the next host takes over.
const hosts: symbol[] = [];
const hostListeners = new Set<() => void>();
const subscribeHosts = (cb: () => void) => {
  hostListeners.add(cb);
  return () => hostListeners.delete(cb);
};
const leaderNow = (): symbol | null => hosts[0] ?? null;
const notifyHosts = () => hostListeners.forEach((l) => l());

export default function InAppPayGuardHost() {
  const [id] = useState<symbol>(() => Symbol("guard-host"));
  useEffect(() => {
    hosts.push(id);
    notifyHosts();
    return () => {
      const i = hosts.indexOf(id);
      if (i >= 0) hosts.splice(i, 1);
      notifyHosts();
    };
  }, [id]);
  const leader = useSyncExternalStore(subscribeHosts, leaderNow, () => null) === id;
  const req = useSyncExternalStore(subscribeInAppGuard, currentInAppGuard, () => null);
  const [notice, setNotice] = useState<string | null>(null);
  const shownFor = useRef<unknown>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const open = leader && !!req;

  useEffect(() => {
    if (!open || shownFor.current === req) return;
    shownFor.current = req;
    setNotice(null);
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    trackOnboardingEvent("inapp_pay_guard_shown", { app: req!.app, platform: req!.platform, surface: req!.surface });
    sheetRef.current?.focus();
  }, [open, req]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissInAppGuard();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Back to the Buy that opened the guard once it closes.
  useEffect(() => {
    if (open) return;
    const el = opener.current;
    opener.current = null;
    shownFor.current = null;
    if (el && el.isConnected) el.focus();
  }, [open]);

  if (!open || !req) return null;
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

  return createPortal(
    <div className="lt-pay-guard" role="dialog" aria-modal="true" aria-labelledby="lt-pay-guard-h" data-testid="inapp-pay-guard">
      <div className="lt-pay-guard__sheet" ref={sheetRef} tabIndex={-1}>
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
    </div>,
    document.body,
  );
}
