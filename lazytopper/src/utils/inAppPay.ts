import { inAppBrowser } from "./inAppBrowser";
import { chromeIntentUrl, isAndroidUserAgent, isIosUserAgent } from "./inAppBrowserLinks";

/**
 * INAPP-PAY-1 - payments inside Instagram / Facebook in-app browsers.
 *
 * Razorpay's own docs: web Standard Checkout inside a WebView is discouraged, and UPI intent there needs
 * host-app configuration we do not control (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/webview/).
 * So this module only DETECTS the situation and builds the hand-off to a real browser. It never changes
 * Razorpay's options, prices, orders or verification.
 *
 * Kill switch: build env VITE_INAPP_PAY_DISABLED=1 -> every function below reports "not in-app" (today's behaviour).
 */
export type InAppPayApp = "instagram" | "facebook" | "youtube" | "other";
export type InAppPayPlatform = "android" | "ios" | "other";

export function isInAppPayDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_INAPP_PAY_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

/** A coarse app slug when the page runs in an app's embedded browser, else null (also null when killed). */
export function inAppPayApp(userAgent: string | null | undefined, standalone = false): InAppPayApp | null {
  if (isInAppPayDisabled()) return null;
  const app = inAppBrowser(userAgent, standalone);
  if (app === null) return null;
  return app === "other-webview" ? "other" : app;
}

export function inAppPayPlatform(userAgent: string | null | undefined): InAppPayPlatform {
  return isAndroidUserAgent(userAgent) ? "android" : isIosUserAgent(userAgent) ? "ios" : "other";
}

export function currentInAppPay(): { app: InAppPayApp; platform: InAppPayPlatform } | null {
  try {
    if (typeof navigator === "undefined") return null;
    const nav = navigator as Navigator & { standalone?: boolean };
    const app = inAppPayApp(nav.userAgent, nav.standalone === true);
    return app ? { app, platform: inAppPayPlatform(nav.userAgent) } : null;
  } catch {
    return null;
  }
}

/** What the rescue should reopen: the Board Pass one-tap, or a pack (`/packs?buy=<sku>&t=<target>`). */
export type InAppBuyTarget = { kind: "pass" } | { kind: "pack"; sku: string; target?: string };

/**
 * The https URL a real browser should open: THIS page's own path and query (utm_*, fbclid, gclid ... all kept)
 * with `?buy=` set so the right checkout reopens at once (PassCheckout / PacksShop read it; signed out too).
 * Any `buy` / `t` already on the page is replaced, never duplicated. Null if href is not http(s).
 */
export function inAppRescueUrl(href: string, buy?: InAppBuyTarget | null): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (buy) {
    url.searchParams.delete("buy");
    url.searchParams.delete("t");
    url.searchParams.set("buy", buy.kind === "pass" ? "board_pass" : buy.sku);
    if (buy.kind === "pack" && buy.target) url.searchParams.set("t", buy.target);
  }
  return url.toString();
}

/** Android only: the Chrome intent for the rescue URL (fallback = the same https URL). */
export function inAppChromeIntent(href: string, buy?: InAppBuyTarget | null): string | null {
  const https = inAppRescueUrl(href, buy);
  return https ? chromeIntentUrl(https) : null;
}
