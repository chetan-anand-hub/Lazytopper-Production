/**
 * INAPP-SIGNIN-1 — is this page open inside an app's embedded browser?
 *
 * Google refuses OAuth sign-in inside embedded webviews ("disallowed_useragent"), and Login
 * uses a Google popup. Instagram and Facebook send us about 1,600 visitors a week, so the
 * Login page needs to know. Pure: a user-agent string in, a coarse label out. No storage,
 * no identity, nothing sent anywhere.
 *
 *   "instagram"      Instagram's in-app browser
 *   "facebook"       Facebook / Messenger in-app browser
 *   "other-webview"  LinkedIn, Snapchat, Line, or any Android WebView (`; wv)`)
 *   null             a normal browser (or no user agent)
 */
export type InAppBrowser = "instagram" | "facebook" | "other-webview";

export function inAppBrowser(userAgent: string | null | undefined): InAppBrowser | null {
  const ua = typeof userAgent === "string" ? userAgent : "";
  if (!ua) return null;
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A|Messenger/i.test(ua)) return "facebook";
  if (/LinkedInApp|Snapchat|\bLine\/|\bLIFF\b/i.test(ua)) return "other-webview";
  if (/Android/i.test(ua) && /;\s*wv\)/i.test(ua)) return "other-webview";
  return null;
}

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
