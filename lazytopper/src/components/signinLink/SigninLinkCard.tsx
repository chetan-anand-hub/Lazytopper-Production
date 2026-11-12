/**
 * SigninLinkCard - LINK-SIGNIN-1 (owner 12 Nov 2026): after a signed-in purchase, ask who else will sign in to use it and offer
 * to attach a phone number / Google account to THIS account. Rendered only by SigninLinkCardLazy, i.e. only on a real paid
 * outcome for a signed-in buyer; its own lazy chunk (nothing in the entry). "No, just me" is remembered per account, on this device.
 */
import { useEffect, useRef, useState } from "react";
import AddSignInMethods from "./AddSignInMethods";
import { useLinkedMethods } from "./useLinkedMethods";
import { BTN_JUST_ME, CARD_TITLE, cardBody, currentSignInMasked, hasKind, isDismissed, rememberDismissed } from "./signinLinkModel";
import { trackSigninLinkShown } from "./signinLinkAnalytics";
import "./signinLink.css";

export default function SigninLinkCard() {
  const { uid, methods, refresh, signedIn } = useLinkedMethods();
  const [dismissed, setDismissed] = useState(() => (uid ? isDismissed(uid) : false));
  // The masked "current sign-in" is fixed at first sight, so the line does not change under the buyer once they add one.
  const [current] = useState(() => currentSignInMasked(methods));
  const [linkedHere, setLinkedHere] = useState(false);
  const shown = useRef(false);

  const bothLinked = hasKind(methods, "phone") && hasKind(methods, "google");
  const visible = signedIn && !dismissed && (!bothLinked || linkedHere);
  useEffect(() => {
    if (visible && !shown.current) {
      shown.current = true;
      trackSigninLinkShown();
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <section className="lt-sil__card" aria-label={CARD_TITLE} data-testid="signin-link-card">
      <h3 className="lt-sil__h">{CARD_TITLE}</h3>
      {!linkedHere && <p className="lt-sil__p">{cardBody(current || currentSignInMasked(methods))}</p>}
      <AddSignInMethods
        methods={methods}
        onLinked={() => {
          setLinkedHere(true);
          refresh();
        }}
        extra={
          !linkedHere ? (
            <button
              type="button"
              className="lt-sil__btn lt-sil__btn--quiet"
              data-testid="signin-link-dismiss"
              onClick={() => {
                rememberDismissed(uid);
                setDismissed(true);
              }}
            >
              {BTN_JUST_ME}
            </button>
          ) : null
        }
      />
    </section>
  );
}
