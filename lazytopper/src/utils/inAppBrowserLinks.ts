/** INAPP-SIGNIN-1 — platform and Chrome-intent helpers; used only by the lazy banner chunk. */

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
