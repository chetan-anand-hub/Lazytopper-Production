/**
 * SPEED-SITE-1-fu2 — the in-app sign-in note's words, shared by the lazy banner (InAppSigninBanner.tsx) and the
 * invisible slot Login.tsx shows while that chunk loads. One function, so the slot is always exactly the banner's
 * size (an in-app WebView at 1280 px measured CLS 0.062 when the banner arrived after the doors had painted).
 */
import { inAppBrowser, type InAppBrowser } from "../../utils/inAppBrowser";
import { isAndroidUserAgent, isIosUserAgent } from "../../utils/inAppBrowserLinks";

const APP_NAME: Record<InAppBrowser, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  "other-webview": "this app",
};

/** The note for this browser, or null outside an in-app browser. Reads the live navigator by default. */
export function inAppSigninNote(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
  standalone: boolean = typeof navigator !== "undefined" &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true,
): { app: InAppBrowser; text: string } | null {
  const app = inAppBrowser(ua, standalone);
  if (!app) return null;
  const android = isAndroidUserAgent(ua);
  const ios = !android && isIosUserAgent(ua);
  const name = APP_NAME[app];
  // GOOGLE-REDIRECT-1 — phone first, then the way out of the app. Google is never redirected
  // from here: the redirect flow skips in-app browsers, which keep this note and phone-first.
  const where = app === "other-webview" ? name : `the ${name} app`;
  // LOGIN-FIX-1 — ONE message, ONE Chrome action. On Android the Google door itself is now
  // "Open in Chrome to continue with Google" (Login.tsx), so this note no longer carries its own
  // Open-in-Chrome button: it only says why, and points at phone / email first.
  const wayOut = android
    ? "or tap Open in Chrome to continue with Google."
    : ios
      ? "or tap ⋯ → Open in Safari."
      : "or tap ⋯ → Open in browser.";
  return { app, text: `Google sign-in doesn't work inside ${where}. Use your phone number or email below, ${wayOut}` };
}
