import { trackOnboardingEvent } from "../analytics/analytics";
import { handoffSourceParams } from "../analytics/visitSource";
import { currentInAppPayChoice, inAppChoiceChromeIntent, type InAppBuyTarget } from "./inAppPay";

/**
 * INAPP-PAY-FIRST-1 - inside Instagram / Facebook on ANDROID, a SIGNED-OUT Buy tap goes straight to the Chrome intent for that exact item
 * (the URL the "Pay in Chrome" option builds, with `?buy=`) instead of creating an order and opening Razorpay in the webview, where UPI
 * apps do not open. No order is created before the hop (no orphan order, no InitiateCheckout). "Pay here instead" runs today's flow.
 * If the page is still visible ~2.5 s after the hop, the hop is treated as failed: the normal flow is restored and the existing
 * "Pay in Chrome / Safari" options show, so the visitor is never stuck.
 * Signed-in, iOS, desktop and normal browsers: never active. Kill switch: VITE_INAPP_PAY_FIRST_DISABLED=1 (today exactly).
 */
export const INAPP_PAY_FIRST_NOTE = "Opens Chrome — UPI apps work there";
export const INAPP_PAY_FIRST_HERE_LABEL = "Pay here instead";
export const INAPP_PAY_FIRST_STUCK_MS = 2500;

export function isInAppPayFirstDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_INAPP_PAY_FIRST_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

let bypass = false; // "Pay here instead" was chosen on this page view
let stuck = false; // a hop did not leave the page
const listeners = new Set<() => void>();
function notify(): void {
  listeners.forEach((l) => l());
}

/** Test seam. */
export function resetInAppPayFirst(): void {
  bypass = false;
  stuck = false;
  notify();
}

export function subscribeInAppPayFirst(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function inFacebookFamilyOnAndroid(): boolean {
  const d = currentInAppPayChoice();
  return !!d && d.platform === "android" && (d.app === "instagram" || d.app === "facebook");
}

/** True when a signed-out Buy tap should hop to Chrome now (and the note + "Pay here instead" show under the button). */
export function inAppPayFirstActive(signedIn: boolean): boolean {
  if (signedIn || bypass || stuck || isInAppPayFirstDisabled()) return false;
  return inFacebookFamilyOnAndroid();
}

/** The visitor chose "Pay here instead": today's normal flow from here on, for this page view. */
export function inAppPayFirstPayHere(): void {
  bypass = true;
  notify();
}

/** True once a hop failed to leave the page: the caller shows the existing choice options. */
export function inAppPayFirstStuck(): boolean {
  return stuck;
}

/**
 * The Buy-tap hook. Returns true when it navigated to Chrome (the caller must stop: no order, no checkout event); false = carry on
 * exactly as today. `buy` absent = the page itself (/for-parents).
 */
export function inAppPayFirstHop(opts: { signedIn: boolean; surface: string; sku?: string; buy?: InAppBuyTarget }): boolean {
  try {
    if (!inAppPayFirstActive(opts.signedIn) || typeof window === "undefined") return false;
    const intent = inAppChoiceChromeIntent(window.location.href, opts.buy, handoffSourceParams());
    if (!intent) return false;
    trackOnboardingEvent("inapp_pay_first_hop", { surface: opts.surface, sku: opts.sku ?? (opts.buy ? (opts.buy.kind === "pass" ? "board_pass" : opts.buy.sku) : "page") });
    window.location.href = intent;
    window.setTimeout(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        stuck = true;
        notify();
      }
    }, INAPP_PAY_FIRST_STUCK_MS);
    return true;
  } catch {
    return false;
  }
}
