import { useEffect } from "react";
import "./inAppSigninBanner.css";
import { trackOnboardingEvent } from "../../analytics/analytics";
import { inAppSigninNote } from "./inAppSigninCopy";

/**
 * INAPP-SIGNIN-1 — a calm note above the Google button when the page is open inside
 * Instagram, Facebook, YouTube or another app's browser, where Google sign-in is refused. Google is
 * not hidden (it works in some apps); the student is told what to do instead.
 */
export default function InAppSignin() {
  // SPEED-SITE-1-fu2: the words come from inAppSigninCopy.ts, shared with Login's loading slot.
  const note = inAppSigninNote();
  const app = note?.app ?? null;
  useEffect(() => {
    if (app) trackOnboardingEvent("inapp_signin_banner_shown", { app });
  }, [app]);
  if (!note) return null;

  return (
    <div className="lt-inapp lt-inapp-banner" role="note" data-testid="inapp-signin-banner">
      <p className="lt-inapp-text">
        {note.text}
      </p>
    </div>
  );
}
