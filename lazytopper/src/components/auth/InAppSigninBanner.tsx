import { useEffect } from "react";
import "./inAppSigninBanner.css";
import { trackOnboardingEvent } from "../../analytics/analytics";
import { inAppBrowser, type InAppBrowser } from "../../utils/inAppBrowser";
import { isAndroidUserAgent, isIosUserAgent } from "../../utils/inAppBrowserLinks";

/**
 * INAPP-SIGNIN-1 — a calm note above the Google button when the page is open inside
 * Instagram, Facebook, YouTube or another app's browser, where Google sign-in is refused. Google is
 * not hidden (it works in some apps); the student is told what to do instead.
 */
const APP_NAME: Record<InAppBrowser, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  "other-webview": "this app",
};

export default function InAppSignin() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const standalone =
    typeof navigator !== "undefined" && (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const app = inAppBrowser(ua, standalone);
  useEffect(() => {
    if (app) trackOnboardingEvent("inapp_signin_banner_shown", { app });
  }, [app]);
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

  return (
    <div className="lt-inapp lt-inapp-banner" role="note" data-testid="inapp-signin-banner">
      <p className="lt-inapp-text">
        Google sign-in doesn't work inside {where}. Use your phone number or email below, {wayOut}
      </p>
    </div>
  );
}
