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
 *   "youtube"        the YouTube app's embedded browser
 *   "other-webview"  LinkedIn, Snapchat, Line, any Android WebView (`; wv)`) or any iOS
 *                    WKWebView (an iPhone/iPad user agent with no `Safari/` token)
 *   null             a normal browser (or no user agent)
 *
 * AUTH-SIGNAL-1 — user-agent evidence for the two additions (checked 2 Nov 2026):
 *   • YouTube: the app appends its own package token to the user agent of the web content it
 *     hosts — `com.google.android.youtube/<ver>` on Android, `com.google.ios.youtube/<ver>` on
 *     iOS (observed strings listed at https://whatmyuseragent.com/apps/youtube).
 *   • iOS WKWebView: a bare embedded web view sends `... AppleWebKit/x (KHTML, like Gecko)
 *     Mobile/<build>` with NO `Version/` and NO `Safari/` token, whereas Safari adds both
 *     (https://mobiforge.com/research-analysis/webviews-and-user-agent-strings, iOS examples).
 *     Chrome, Firefox and Edge on iOS (CriOS/FxiOS/EdgiOS) all keep `Safari/`, so they are not hit.
 *   • Android WebView: the `; wv)` marker is Chrome's documented WebView token
 *     (https://android-developers.googleblog.com/2024/12/user-agent-reduction-on-android-webview.html:
 *     reduced WebView UA still carries `wv`; sites may keep testing for it), already used.
 *
 * ⚠ Not detectable from the user agent: the YouTube app on Android normally opens ad links in a
 * Chrome Custom Tab, whose user agent is plain Chrome. Those visits classify as chrome_android in
 * `uaClass`, which is exactly what the login telemetry is there to size.
 */
export type InAppBrowser = "instagram" | "facebook" | "youtube" | "other-webview";

/** Coarse client class carried by the login_* events. No raw user agent ever leaves the device. */
export type UaClass =
  | "inapp_youtube"
  | "inapp_instagram"
  | "inapp_facebook"
  | "android_webview"
  | "ios_webview"
  | "chrome_android"
  | "desktop"
  | "other";

export function inAppBrowser(userAgent: string | null | undefined): InAppBrowser | null {
  const ua = typeof userAgent === "string" ? userAgent : "";
  if (!ua) return null;
  if (/com\.google\.(android|ios)\.youtube/i.test(ua)) return "youtube";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A|Messenger/i.test(ua)) return "facebook";
  if (/LinkedInApp|Snapchat|\bLine\/|\bLIFF\b/i.test(ua)) return "other-webview";
  if (/Android/i.test(ua) && /;\s*wv\)/i.test(ua)) return "other-webview";
  if (/\b(iPhone|iPad|iPod)\b/.test(ua) && /AppleWebKit/i.test(ua) && !/Safari\//i.test(ua)) return "other-webview";
  return null;
}

/** AUTH-SIGNAL-1 — the coarse class for telemetry. Pure; a user-agent string in, a label out. */
export function uaClass(userAgent: string | null | undefined): UaClass {
  const ua = typeof userAgent === "string" ? userAgent : "";
  if (!ua) return "other";
  const app = inAppBrowser(ua);
  if (app === "youtube") return "inapp_youtube";
  if (app === "instagram") return "inapp_instagram";
  if (app === "facebook") return "inapp_facebook";
  const android = /Android/i.test(ua);
  const ios = /\b(iPhone|iPad|iPod)\b/.test(ua);
  if (app === "other-webview") return android ? "android_webview" : ios ? "ios_webview" : "other";
  if (android) {
    // Plain Chrome (this is also what a Chrome Custom Tab reports). Other Android browsers
    // that carry a Chrome token are "other".
    return /Chrome\//.test(ua) && !/EdgA|OPR\/|SamsungBrowser|UCBrowser|Firefox|DuckDuckGo|Brave|YaBrowser|MiuiBrowser/i.test(ua)
      ? "chrome_android"
      : "other";
  }
  if (ios) return "other";
  return /Mobile|Tablet|Silk|Kindle/i.test(ua) ? "other" : "desktop";
}
