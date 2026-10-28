import { useEffect } from "react";
import "./inAppSigninBanner.css";
import { trackOnboardingEvent } from "../../analytics/analytics";
import type { InAppBrowser } from "../../utils/inAppBrowser";
import { chromeIntentUrl, isAndroidUserAgent, isIosUserAgent } from "../../utils/inAppBrowserLinks";

/**
 * INAPP-SIGNIN-1 — a calm note above the Google button when the page is open inside
 * Instagram, Facebook or another app's browser, where Google sign-in is refused. Google is
 * not hidden (it works in some apps); the student is told what to do instead.
 */
interface Props {
  app: InAppBrowser;
  userAgent: string;
  href: string;
}

const APP_NAME: Record<InAppBrowser, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  "other-webview": "this app",
};

export default function InAppSigninBanner({ app, userAgent, href }: Props) {
  useEffect(() => {
    trackOnboardingEvent("inapp_signin_banner_shown", { app });
  }, [app]);

  const android = isAndroidUserAgent(userAgent);
  const ios = !android && isIosUserAgent(userAgent);
  const intent = android ? chromeIntentUrl(href) : null;
  const name = APP_NAME[app];

  return (
    <div className="lt-inapp" role="note" data-testid="inapp-signin-banner">
      <p className="lt-inapp-text">
        Google sign-in doesn't work inside {name}.{" "}
        {ios ? "Tap ⋯ → Open in Safari, or use your phone number below." : "Tap ⋯ → Open in browser, or use your phone number below."}
      </p>
      {intent ? (
        <a className="lt-inapp-btn" href={intent}>
          Open in Chrome
        </a>
      ) : null}
    </div>
  );
}
