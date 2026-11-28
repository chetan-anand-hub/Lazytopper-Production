import { trackOnboardingEvent } from "../analytics/analytics";
import { handoffSourceParams, setOrderHopProvider, type OrderHop } from "../analytics/visitSource";
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
/** INAPP-STUCK-1: the line under the primary "Copy payment link" once Chrome did not open. */
export const INAPP_STUCK_COPY_NOTE = "Open Chrome, paste the link, and pay there.";

/** INAPP-STUCK-1 kill switch: VITE_INAPP_STUCK_COPY_DISABLED=1 restores the previous behaviour exactly. */
export function isInAppStuckCopyDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_INAPP_STUCK_COPY_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

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
let hopping = false; // a hop is in flight (a double tap makes ONE hop, one event, one timer)
let chromeTapStuck = false; // INAPP-STUCK-1: a "Pay in Chrome" tap left the page visible for 2.5 s
let stuckEventSent = false; // INAPP-STUCK-1: `inapp_pay_open_external_stuck` fires once per stuck detection
const listeners = new Set<() => void>();
function notify(): void {
  listeners.forEach((l) => l());
}

/** Test seam. */
export function resetInAppPayFirst(): void {
  bypass = false;
  stuck = false;
  hopping = false;
  chromeTapStuck = false;
  stuckEventSent = false;
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

/** INAPP-GAP-1: "Pay here instead" (or the guard's "Pay here anyway") was chosen on this page view. */
export function inAppPayFirstBypassed(): boolean {
  return bypass;
}

/** INAPP-GAP-1: the hop state recorded on an order created now: bypass | stuck | hopped (arrived through our own hop link) | none. */
export function inAppHopState(): OrderHop {
  if (bypass) return "bypass";
  if (stuck || chromeTapStuck) return "stuck";
  try {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("via") === "inapp") return "hopped";
  } catch {
    /* none */
  }
  return "none";
}
setOrderHopProvider(inAppHopState);

/** True once a hop failed to leave the page: the caller shows the existing choice options. */
export function inAppPayFirstStuck(): boolean {
  return stuck;
}

/** INAPP-STUCK-1: true once Chrome failed to open (the hop or a "Pay in Chrome" tap stayed visible 2.5 s): Android shows "Copy payment link" first. */
export function inAppStuckCopyActive(): boolean {
  return !isInAppStuckCopyDisabled() && (stuck || chromeTapStuck);
}

function reportStuck(surface: string): void {
  if (isInAppStuckCopyDisabled() || stuckEventSent) return;
  stuckEventSent = true;
  const d = currentInAppPayChoice();
  if (d) trackOnboardingEvent("inapp_pay_open_external_stuck", { app: d.app, platform: d.platform, surface });
}

/** INAPP-STUCK-1: call on a "Pay in Chrome" tap. If the page is still visible after 2.5 s, Chrome did not open: show the copy-link action. */
export function inAppWatchChromeTap(surface: string): void {
  if (isInAppStuckCopyDisabled() || typeof window === "undefined") return;
  window.setTimeout(() => {
    if (typeof document === "undefined" || document.visibilityState !== "visible") return;
    const wasActive = inAppStuckCopyActive();
    chromeTapStuck = true;
    reportStuck(surface);
    if (!wasActive) notify();
  }, INAPP_PAY_FIRST_STUCK_MS);
}

/**
 * The Buy-tap hook. Returns true when it navigated to Chrome (the caller must stop: no order, no checkout event); false = carry on
 * exactly as today. `buy` absent = the page itself (/for-parents).
 */
export function inAppPayFirstHop(opts: { signedIn: boolean; surface: string; sku?: string; buy?: InAppBuyTarget; /** An automatic ?buy= arrival or the Who-sheet's own continue: never a tap, never hops. */ automatic?: boolean }): boolean {
  try {
    if (opts.automatic || !inAppPayFirstActive(opts.signedIn) || typeof window === "undefined") return false;
    if (hopping) return true; // double tap: already on its way to Chrome
    const intent = inAppChoiceChromeIntent(window.location.href, opts.buy, handoffSourceParams());
    if (!intent) return false;
    trackOnboardingEvent("inapp_pay_first_hop", { surface: opts.surface, sku: opts.sku ?? (opts.buy ? (opts.buy.kind === "pass" ? "board_pass" : opts.buy.sku) : "page") });
    hopping = true;
    window.location.href = intent;
    window.setTimeout(() => {
      hopping = false;
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        stuck = true;
        reportStuck(opts.surface);
        notify();
      }
    }, INAPP_PAY_FIRST_STUCK_MS);
    return true;
  } catch {
    return false;
  }
}
