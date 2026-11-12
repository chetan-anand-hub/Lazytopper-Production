/**
 * SigninLinkCard - LINK-SIGNIN v1.1 (owner 12 Nov 2026): after a signed-in purchase, "Who will use this?" with up to three choices:
 *   1. My child will sign in with my login   2. This is for me   3. Move it to my child's own phone or email (Part 2: hidden
 *   until it ships). One purchase = one account with at most one phone and one email login; no self-service swap or unlink.
 * Rendered only by SigninLinkCardLazy, i.e. only on a real paid outcome for a signed-in buyer; own lazy chunk. Choosing 1 or 2
 * is the answer: remembered per account on this device so the card does not come back.
 */
import { useEffect, useRef, useState } from "react";
import AddSignInMethods from "./AddSignInMethods";
import { useLinkedMethods } from "./useLinkedMethods";
import {
  CARD_TITLE,
  CHOICE_CHILD,
  CHOICE_ME,
  CHOICE_MOVE,
  childBody,
  currentSignInMasked,
  isDismissed,
  isMoveToOtherAvailable,
  meBody,
  rememberDismissed,
} from "./signinLinkModel";
import { trackSigninLinkShown } from "./signinLinkAnalytics";
import "./signinLink.css";

export default function SigninLinkCard() {
  const { uid, methods, refresh, signedIn } = useLinkedMethods();
  const [answered] = useState(() => (uid ? isDismissed(uid) : false));
  const [choice, setChoice] = useState<null | "child" | "me">(null);
  // The masked login is fixed at first sight, so the line does not change under the buyer once they add one.
  const [current] = useState(() => currentSignInMasked(methods));
  const shown = useRef(false);

  const visible = signedIn && (!answered || choice !== null);
  useEffect(() => {
    if (visible && !shown.current) {
      shown.current = true;
      trackSigninLinkShown();
    }
  }, [visible]);

  if (!visible) return null;
  const masked = current || currentSignInMasked(methods);
  const pick = (c: "child" | "me") => {
    rememberDismissed(uid);
    setChoice(c);
  };
  return (
    <section className="lt-sil__card" aria-label={CARD_TITLE} data-testid="signin-link-card">
      <h3 className="lt-sil__h">{CARD_TITLE}</h3>
      {choice === null ? (
        <div className="lt-sil__choices">
          <button type="button" className="lt-sil__btn lt-sil__btn--primary" onClick={() => pick("child")} data-testid="signin-choice-child">
            {CHOICE_CHILD}
          </button>
          <button type="button" className="lt-sil__btn" onClick={() => pick("me")} data-testid="signin-choice-me">
            {CHOICE_ME}
          </button>
          {isMoveToOtherAvailable() && (
            <button type="button" className="lt-sil__btn" data-testid="signin-choice-move">
              {CHOICE_MOVE}
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="lt-sil__p" data-testid="signin-choice-body">
            {choice === "child" ? childBody(masked) : meBody(masked)}
          </p>
          <AddSignInMethods methods={methods} onLinked={refresh} />
        </>
      )}
    </section>
  );
}
