import { inAppBrowser } from "./inAppBrowser";
import { isSafeInternalPath } from "./safeInternalPath";

/**
 * INAPP-SIGNIN-1 — platform and Chrome-intent helpers. Used by the lazy banner chunk and, since
 * LOGIN-FIX-1, by the Login door (the Android in-app "Open in Chrome to continue with Google").
 */

export function isAndroidUserAgent(userAgent: string | null | undefined): boolean {
  return /Android/i.test(userAgent ?? "");
}

export function isIosUserAgent(userAgent: string | null | undefined): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent ?? "");
}

/**
 * An Android `intent://` link that opens the SAME path and query in Chrome. If Chrome is not
 * installed the intent falls back to the normal https URL. Returns null for anything that is
 * not an http(s) URL.
 */
export function chromeIntentUrl(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const scheme = url.protocol.slice(0, -1);
  const target = `${url.host}${url.pathname}${url.search}`;
  return (
    `intent://${target}#Intent;scheme=${scheme};package=com.android.chrome;` +
    `S.browser_fallback_url=${encodeURIComponent(url.toString())};end`
  );
}

/**
 * LOGIN-FIX-1 — an Android app's embedded browser (YouTube, Instagram, Facebook, Gmail, Google's
 * syndicated-search webviews, any `; wv)` WebView). There Google refuses OAuth
 * (disallowed_useragent) and the popup fails with auth/network-request-failed, so the Google door
 * hands the page to Chrome. A Chrome Custom Tab reports plain Chrome and is NOT matched.
 */
export function isAndroidInAppBrowser(userAgent: string | null | undefined, standalone = false): boolean {
  return isAndroidUserAgent(userAgent) && inAppBrowser(userAgent, standalone) !== null;
}

export function currentIsAndroidInAppBrowser(): boolean {
  try {
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { standalone?: boolean }) : null;
    return nav ? isAndroidInAppBrowser(nav.userAgent, nav.standalone === true) : false;
  } catch {
    return false;
  }
}

/**
 * LOGIN-FIX-1 — the Chrome intent for "continue with Google in Chrome": this page's own path and
 * query, plus `?redirect=<target>` when the page knows where the student was going but the URL does
 * not say so (router state does not survive the hop to Chrome). The target must be a safe internal
 * path; anything else is dropped, never carried. The Login page in Chrome re-checks `?redirect=`
 * on arrival exactly as it always does. Besides `redirect`, only the stored first-touch utm_* values
 * and the `lt_clk` click-id flags may be added (attribution across the hop): no phone number, no
 * router state, no click-id value.
 */
const HANDOFF_SOURCE_KEYS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_content", "lt_clk"]);

export function chromeSigninHandoffUrl(
  href: string,
  target: string | null | undefined,
  sourceParams: ReadonlyArray<readonly [string, string]> = [],
): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  // An unsafe ?redirect= already on the page (Login ignores it) is dropped, never handed on.
  if (url.searchParams.has("redirect") && !isSafeInternalPath(url.searchParams.get("redirect"))) {
    url.searchParams.delete("redirect");
  }
  if (!url.searchParams.has("redirect") && target && target !== "/" && isSafeInternalPath(target)) {
    url.searchParams.set("redirect", target.trim());
  }
  // The first touch (visitSource.handoffSourceParams: utm_* and the lt_clk flag list only), so the
  // sign-up in Chrome keeps its ad source. Only these keys, only when the URL lacks them.
  for (const [key, value] of sourceParams) {
    if (!HANDOFF_SOURCE_KEYS.has(key) || url.searchParams.has(key)) continue;
    if (typeof value !== "string" || !/^[A-Za-z0-9_.\-{},]{1,64}$/.test(value)) continue;
    url.searchParams.set(key, value);
  }
  return chromeIntentUrl(url.toString());
}
