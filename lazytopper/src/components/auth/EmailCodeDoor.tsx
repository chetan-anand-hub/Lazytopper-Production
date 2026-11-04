/**
 * EmailCodeDoor — EMAIL-CODE-1: the "Sign in with email code" door method on /login. Lazy and SELF-GATING (renders nothing
 * unless VITE_EMAIL_CODE_SIGNIN_ENABLED is on), so Login's entry-chunk cost is one lazy reference (PERF-3 budget).
 * No CSS of its own (the button is Login's own .lt-method), so the lazy reference carries no extra preload dep.
 * Tapping it opens the email-code step in a sheet over the door (EmailCodeSignIn `asSheet`); once signed in, Login's
 * existing signed-in exit takes the student to the safe `redirect` target (this component does not navigate).
 */
import { Suspense, lazy, useEffect, useState } from "react";
import { isEmailCodeSigninClientEnabled } from "../../services/emailCodeFlag";

const EmailCodeSignIn = lazy(() => import("./EmailCodeSignIn"));

export default function EmailCodeDoor() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!isEmailCodeSigninClientEnabled()) return null;
  return (
    <>
      <button type="button" className="lt-method" onClick={() => setOpen(true)} data-testid="lt-email-code-door">
        <span className="lt-method-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
            <path d="M7 12h1M11 12h1M15 12h1" />
          </svg>
        </span>
        Sign in with email code
      </button>
      {open && (
        <Suspense fallback={null}>
          <EmailCodeSignIn asSheet showHeading onCancel={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
