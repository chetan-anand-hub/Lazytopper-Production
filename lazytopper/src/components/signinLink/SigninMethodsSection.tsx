/**
 * SigninMethodsSection - LINK-SIGNIN-1: the permanent home. "Ways to sign in" in Settings: the linked methods (masked, from the
 * account's real credentials) and the same Add buttons. No unlink here. Hidden by VITE_SIGNIN_LINK_DISABLED.
 */
import AddSignInMethods from "./AddSignInMethods";
import { useLinkedMethods } from "./useLinkedMethods";
import { isSigninLinkDisabled, methodLabel } from "./signinLinkModel";
import "./signinLink.css";

export default function SigninMethodsSection({ headingId }: { headingId?: string }) {
  const { methods, refresh, signedIn } = useLinkedMethods();
  if (!signedIn || isSigninLinkDisabled()) return null;
  return (
    <section className="lt-sil__card lt-sil__card--plain" aria-labelledby={headingId} data-testid="signin-methods-section">
      <h3 className="lt-sil__h" id={headingId}>
        Ways to sign in
      </h3>
      {methods.length > 0 ? (
        <ul className="lt-sil__list" aria-label="Ways to sign in">
          {methods.map((m) => (
            <li key={m.kind} data-testid={`signin-method-${m.kind}`}>
              {methodLabel(m)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="lt-sil__p">No sign-in method is listed for this account.</p>
      )}
      <p className="lt-sil__p">Add a phone number or Google account and any of them opens this same account.</p>
      <AddSignInMethods methods={methods} onLinked={refresh} />
    </section>
  );
}
