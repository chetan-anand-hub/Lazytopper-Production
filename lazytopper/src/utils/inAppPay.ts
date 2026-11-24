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
export type InAppBuyTarget = { kind: "pass" } | { kind: "pack"; sku: string; target?: string; /** INAPP-PAY-FIRST-1b: the "Liked the sample?" buy keeps `from=sample` across the hop (the resumed checkout reports it). */ from?: "sample" };

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
    // Only /pricing and /board-pass host the Board Pass ?buy= arrival (PassCheckout). Any other page (e.g. /for-parents, which
    // mounts the sheet directly) hands over to /board-pass with every query param kept (utm, fbclid, gclid).
    if (buy.kind === "pass" && !/^\/(pricing|board-pass)\/?$/.test(url.pathname)) url.pathname = "/board-pass";
    url.searchParams.delete("buy");
    url.searchParams.delete("t");
    url.searchParams.set("buy", buy.kind === "pass" ? "board_pass" : buy.sku);
    if (buy.kind === "pack" && buy.target) url.searchParams.set("t", buy.target);
    if (buy.kind === "pack" && buy.from === "sample") url.searchParams.set("from", "sample");
  }
  return url.toString();
}

/** Android only: the Chrome intent for the rescue URL (fallback = the same https URL). */
export function inAppChromeIntent(href: string, buy?: InAppBuyTarget | null): string | null {
  const https = inAppRescueUrl(href, buy);
  return https ? chromeIntentUrl(https) : null;
}

/* ------------------------------------------------------------------------- *
 * INAPP-PAY-CHOICE-1 - an extra "Pay in Chrome / Safari" option UP FRONT, under the normal Buy / Pay button, in an in-app browser only.
 * Never replaces or blocks the normal button. Kill switch: VITE_INAPP_PAY_CHOICE_DISABLED=1 (also off when isInAppPayDisabled()).
 * ------------------------------------------------------------------------- */

export function isInAppPayChoiceDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_INAPP_PAY_CHOICE_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

/** The in-app browser the up-front option is for, or null (a normal browser, either kill switch on). */
export function currentInAppPayChoice(): { app: InAppPayApp; platform: InAppPayPlatform } | null {
  if (isInAppPayChoiceDisabled()) return null;
  return currentInAppPay();
}

/** iOS major version from the UA ("iPhone OS 17_1" / "CPU OS 17_1"), or null when it cannot be read. */
export function iosMajorVersion(userAgent: string | null | undefined): number | null {
  const m = /(?:iPhone OS|CPU OS|CPU iPhone OS) (\d{1,2})[_.]/i.exec(userAgent ?? "");
  return m ? Number(m[1]) : null;
}

/** x-safari-https:// opens Safari from another app on iOS 17+. Older / unreadable versions: no Safari button (copy only). */
export function iosSafariSupported(userAgent: string | null | undefined): boolean {
  const v = iosMajorVersion(userAgent);
  return v !== null && v >= 17;
}

/** Marker for our own funnel; `from` is already used by the shop, so a separate key. */
export const INAPP_CHOICE_MARKER = ["via", "inapp"] as const;

/** Only these first-touch keys may be added (attribution across the hop): utm_* and the lt_clk flag list. No click-id values, no PII. */
const CHOICE_SOURCE_KEYS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "lt_clk"]);

/**
 * The https URL the real browser opens (the page itself when `buy` is absent): inAppRescueUrl (this page's path + query incl. utm_* / fbclid / gclid, `?buy=` for the item)
 * + the stored first-touch utm_* when the URL lacks them + `via=inapp`. Null if href is not http(s).
 */
export function inAppChoiceUrl(
  href: string,
  buy?: InAppBuyTarget | null,
  sourceParams: ReadonlyArray<readonly [string, string]> = [],
): string | null {
  const base = inAppRescueUrl(href, buy);
  if (!base) return null;
  const url = new URL(base);
  // No item (/for-parents): the link is the page itself, never a checkout arrival; the parent taps Pay again in the real browser.
  if (!buy) {
    url.searchParams.delete("buy");
    url.searchParams.delete("t");
  }
  for (const [key, value] of sourceParams) {
    if (!CHOICE_SOURCE_KEYS.has(key) || url.searchParams.has(key)) continue;
    if (typeof value !== "string" || !/^[A-Za-z0-9_.\-{},]{1,64}$/.test(value)) continue;
    url.searchParams.set(key, value);
  }
  url.searchParams.set(INAPP_CHOICE_MARKER[0], INAPP_CHOICE_MARKER[1]);
  return url.toString();
}

export function inAppChoiceChromeIntent(href: string, buy?: InAppBuyTarget | null, sourceParams: ReadonlyArray<readonly [string, string]> = []): string | null {
  const https = inAppChoiceUrl(href, buy, sourceParams);
  return https ? chromeIntentUrl(https) : null;
}

/** iOS 17+: the same https URL with the x-safari-https scheme. Null for a non-https URL. */
export function inAppSafariUrl(httpsUrl: string): string | null {
  return /^https:\/\//i.test(httpsUrl) ? httpsUrl.replace(/^https:/i, "x-safari-https:") : null;
}
