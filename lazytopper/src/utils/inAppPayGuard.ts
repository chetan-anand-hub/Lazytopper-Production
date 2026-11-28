import { currentInAppPay, type InAppBuyTarget } from "./inAppPay";
import { inAppPayFirstActive, inAppPayFirstBypassed, inAppPayFirstPayHere } from "./inAppPayFirst";

/**
 * INAPP-GAP-1 - a signed-out Buy tap inside an in-app browser where NO working hop to a real browser exists (iOS Instagram / Facebook,
 * the YouTube app's browser, other webviews, or Android after the hop got stuck) first shows a guard: "Copy payment link" primary,
 * "Pay here anyway" secondary. Razorpay opens in the webview only after "Pay here anyway".
 *   - Not for a signed-in buyer, an automatic ?buy= arrival / the Who-sheet's own continue, or a normal browser (byte-identical there).
 *   - Not while the Android hop is available (the hop runs first), and NOT again after an explicit bypass ("Pay here instead" or
 *     "Pay here anyway") on this page view: that choice was deliberate.
 * Touches no price, order, Razorpay option or verification. Kill switch: VITE_INAPP_GAP_DISABLED=1 (today exactly).
 */
export function isInAppGapDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_INAPP_GAP_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

export interface InAppGuardRequest {
  buy?: InAppBuyTarget;
  surface: string;
  app: "instagram" | "facebook" | "youtube" | "other";
  platform: "android" | "ios" | "other";
  proceed: () => void;
}

let request: InAppGuardRequest | null = null;
const listeners = new Set<() => void>();
function notify(): void {
  listeners.forEach((l) => l());
}
export function subscribeInAppGuard(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function currentInAppGuard(): InAppGuardRequest | null {
  return request;
}
/** Test seam. */
export function resetInAppGuard(): void {
  request = null;
  notify();
}

/** Pure decision: should this signed-out tap be guarded now? */
export function inAppPayGuardNeeded(signedIn: boolean): boolean {
  if (signedIn || isInAppGapDisabled() || inAppPayFirstBypassed()) return false;
  if (!currentInAppPay()) return false;
  return !inAppPayFirstActive(false); // the hop takes this tap when it is available
}

/** Returns true when the guard took the tap (the caller must stop); `proceed` re-runs the tap once the visitor chose "Pay here anyway". */
export function inAppPayGuard(opts: { signedIn: boolean; automatic?: boolean; surface: string; buy?: InAppBuyTarget; proceed: () => void }): boolean {
  try {
    if (opts.automatic || !inAppPayGuardNeeded(opts.signedIn)) return false;
    const d = currentInAppPay();
    if (!d) return false;
    request = { buy: opts.buy, surface: opts.surface, app: d.app, platform: d.platform, proceed: opts.proceed };
    notify();
    return true;
  } catch {
    return false;
  }
}

export function dismissInAppGuard(): void {
  request = null;
  notify();
}

/** "Pay here anyway": today's flow for this page view (no guard again), then the original tap runs. */
export function inAppGuardPayHere(): void {
  const r = request;
  request = null;
  inAppPayFirstPayHere();
  notify();
  r?.proceed();
}
