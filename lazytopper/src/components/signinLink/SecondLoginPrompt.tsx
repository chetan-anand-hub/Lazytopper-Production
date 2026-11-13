import { useEffect, useState } from "react";
import AddSignInMethods from "./AddSignInMethods";
import { useLinkedMethods } from "./useLinkedMethods";
import { canAddGoogle, canAddPhone } from "./signinLinkModel";
import { hasSeenSecondLoginPrompt, markSecondLoginPromptSeen } from "../../services/secondLoginPrompt";
import "./secondLoginPrompt.css";

/**
 * SecondLoginPrompt - SECOND-LOGIN-PROMPT-1: "Also sign in with your Gmail / phone?" - the existing add step (AddSignInMethods),
 * inline, dismissible, once per account per device. Says plainly that either login opens the same account. Shown only to a real
 * signed-in account that can still add a phone or a Google login; marked seen the moment it is shown (a reload never repeats it).
 */
export default function SecondLoginPrompt() {
  const { uid, methods, refresh, signedIn } = useLinkedMethods();
  const [open, setOpen] = useState<boolean | null>(null);
  const [added, setAdded] = useState(false);
  const addable = canAddPhone(methods) || canAddGoogle(methods);

  useEffect(() => {
    if (open !== null || !signedIn) return;
    if (hasSeenSecondLoginPrompt(uid) || !addable) {
      setOpen(false);
      return;
    }
    markSecondLoginPromptSeen(uid);
    setOpen(true);
  }, [open, signedIn, uid, addable]);

  if (!open) return null;
  const title = canAddPhone(methods) && canAddGoogle(methods) ? "Also sign in with your Gmail or phone?" : canAddPhone(methods) ? "Also sign in with your phone?" : "Also sign in with your Gmail?";
  return (
    <section className="lt-slp" role="dialog" aria-label={title} data-testid="second-login-prompt">
      <h3 className="lt-slp__h">{title}</h3>
      <p className="lt-slp__p">Either login opens the same account, with everything you bought.</p>
      <AddSignInMethods
        methods={methods}
        onLinked={() => {
          setAdded(true);
          refresh();
        }}
        extra={
          <button type="button" className="lt-sil__btn" onClick={() => setOpen(false)} data-testid="second-login-dismiss">
            {added ? "Done" : "Not now"}
          </button>
        }
      />
    </section>
  );
}
