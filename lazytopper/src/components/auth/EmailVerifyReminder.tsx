import { useCallback, useEffect, useState } from "react";
import { reload, sendEmailVerification } from "firebase/auth";
import { useAuth, type AuthUser } from "../../context/AuthContext";
import { authClient } from "../../services/firebaseClient";

/**
 * ACTIVATION-1 · L1 — the NON-blocking replacement for the verify-your-email wall.
 *
 * A new email/password student used to be held on a verification step and never reached
 * the product (`sign_up` had already fired, so the account counted but was lost). They now
 * go straight to where they were headed, and this one-line strip asks them to verify.
 *
 * Shown ONLY to a signed-in email account whose address is known to be unverified —
 * never to Google, phone, a local session, or an account whose `emailVerified` is unknown.
 * Dismissal is remembered for this tab's session only. Nothing server-side reads
 * `emailVerified`, so this changes no entitlement.
 */

/** sessionStorage — the dismissal lives and dies with this tab. */
export const VERIFY_REMINDER_DISMISS_KEY = "lazytopper.emailVerifyReminder.dismissed.v1";

export const VERIFY_REMINDER_COPY = {
  text: "Verify your email to keep your account safe.",
  resend: "Resend link",
  sent: "Sent. It can take a minute to arrive.",
  failed: "Could not send it. Try again in a minute.",
  dismiss: "Dismiss",
} as const;

/** Same rule as Login's `needsEmailVerification` (kept local so this file does not import a page). */
export function isUnverifiedEmailAccount(user: AuthUser | null | undefined): boolean {
  if (!user || user.isLocalSession) return false;
  return Boolean(user.email) && user.emailVerified === false;
}

/**
 * Send the verification email to the signed-in user. Resolves true when it was sent.
 * Never throws: a failed FIRST send is recoverable from the reminder's Resend.
 */
export async function sendVerificationToCurrentUser(): Promise<boolean> {
  const current = authClient?.currentUser;
  if (!current) return false;
  try {
    await sendEmailVerification(current);
    return true;
  } catch {
    return false;
  }
}

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(VERIFY_REMINDER_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    window.sessionStorage.setItem(VERIFY_REMINDER_DISMISS_KEY, "1");
  } catch {
    /* no sessionStorage → it simply shows again on the next page */
  }
}

const REMINDER_CSS = `
  .lt-verify-reminder {
    display: flex; align-items: center; justify-content: center; flex-wrap: wrap;
    gap: 8px 12px; padding: 8px 14px; margin: 0 0 12px;
    border: 1px solid var(--bg-card-border, rgba(148,163,184,0.35));
    border-radius: 12px; background: var(--bg-card, rgba(255,255,255,0.06));
    color: var(--text, inherit); font-size: 0.82rem;
  }
  .lt-verify-reminder__text { font-weight: 700; }
  .lt-verify-reminder__note { color: var(--text-muted, inherit); }
  .lt-verify-reminder__btn {
    border: 0; background: transparent; color: var(--accent, #22c55e);
    font: inherit; font-weight: 800; cursor: pointer; padding: 4px 6px;
  }
  .lt-verify-reminder__btn:disabled { opacity: 0.6; cursor: default; }
`;

export default function EmailVerifyReminder() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const eligible = isUnverifiedEmailAccount(user);

  // Verification completes in the student's mail client, a different tab: the SPA is never
  // told. Ask once when they tab back, so the strip clears itself instead of lingering.
  const recheck = useCallback(async () => {
    const current = authClient?.currentUser;
    if (!current) return;
    try {
      await reload(current);
    } catch {
      return;
    }
    if (current.emailVerified) setVerified(true);
  }, []);

  useEffect(() => {
    if (!eligible || dismissed || verified) return;
    const onFocus = () => {
      void recheck();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [eligible, dismissed, verified, recheck]);

  if (!eligible || dismissed || verified) return null;

  const handleResend = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const ok = await sendVerificationToCurrentUser();
    setNote(ok ? VERIFY_REMINDER_COPY.sent : VERIFY_REMINDER_COPY.failed);
    setBusy(false);
  };

  const handleDismiss = () => {
    writeDismissed();
    setDismissed(true);
  };

  return (
    <div className="lt-verify-reminder" role="status" data-testid="email-verify-reminder">
      <style>{REMINDER_CSS}</style>
      <span className="lt-verify-reminder__text">{VERIFY_REMINDER_COPY.text}</span>
      <button
        type="button"
        className="lt-verify-reminder__btn"
        onClick={handleResend}
        disabled={busy}
      >
        {VERIFY_REMINDER_COPY.resend}
      </button>
      {note ? <span className="lt-verify-reminder__note">{note}</span> : null}
      <button
        type="button"
        className="lt-verify-reminder__btn"
        onClick={handleDismiss}
        aria-label={VERIFY_REMINDER_COPY.dismiss}
      >
        ✕
      </button>
    </div>
  );
}
