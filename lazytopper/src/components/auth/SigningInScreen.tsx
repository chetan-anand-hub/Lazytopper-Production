import { useEffect, useState } from "react";
import "./signingInScreen.css";
import { BRAND_MARK_SRC } from "../../config/brandMark";

const SIGNING_IN_TEXT = "Signing you in…";

/**
 * SIGNIN-FLASH-1 — the calm full-screen state shown on the return trip from Google's page
 * (full-page redirect sign-in, GOOGLE-REDIRECT-1). Login renders this instead of its form while
 * the redirect result resolves, so the sign-in form no longer flashes before the student lands on
 * the page they were going to. No form, no offer, no data — only the brand, a spinner and one line.
 *
 * The polite live region is in the DOM (empty) before its text arrives, so screen readers announce
 * the text reliably (a region mounted already filled is often not read).
 *
 * ⚠ Login is in the entry chunk (PERF-3): keep this component tiny, with no further imports.
 */
export default function SigningInScreen() {
  const [message, setMessage] = useState("");
  useEffect(() => setMessage(SIGNING_IN_TEXT), []);
  return (
    <main className="lt-signing-in" aria-label="LazyTopper sign in">
      <div className="lt-signing-in__card">
        <img className="lt-signing-in__mark" src={BRAND_MARK_SRC} width={48} height={48} alt="" aria-hidden="true" />
        <span className="lt-signing-in__spinner" aria-hidden="true" />
        <p className="lt-signing-in__title" role="status" aria-live="polite">
          {message}
        </p>
        <p className="lt-signing-in__sub">Taking you back to where you were.</p>
      </div>
    </main>
  );
}
