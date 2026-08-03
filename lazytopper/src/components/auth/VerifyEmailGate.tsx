import { useCallback, useEffect, useRef, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { authClient } from "../../services/firebaseClient";

/**
 * BLOCKING email verification for a first-time email/password student.
 *
 * ── WHY BLOCKING RATHER THAN A BANNER ─────────────────────────────────────
 * The one-door flow tries `signInWithEmailAndPassword` and, when that fails
 * ambiguously, CREATES the account. There is no dry run — Firebase's Email
 * Enumeration Protection makes "wrong password" and "no such account"
 * indistinguishable on the sign-in call, so the create attempt is the probe.
 *
 * That means a typo — `gmial` for `gmail` — silently creates a real account on
 * an address the student does not own. They cannot recover it: password reset
 * goes to an inbox that is not theirs and there is no email-change path once
 * they are locked out. They would build a week of attempts and Mistake
 * Intelligence, type the address correctly on another device, and find none of
 * it. THE HARM IS THE STUDENT LOSING THEIR OWN WORK, not a stranger squatting
 * an address — which is why this blocks rather than nags.
 *
 * ── HOW THE APP LEARNS VERIFICATION SUCCEEDED ─────────────────────────────
 * Verification completes on Firebase's HOSTED handler, in the student's mail
 * client — a different tab, often a different device. No event reaches this
 * SPA. `onAuthStateChanged` does NOT fire for it: it fires on sign-in, sign-out
 * and token refresh, and `reload()` mutates the `User` object in place without
 * re-emitting (the same trap `updateProfile` has in AuthContext's
 * `signUpWithEmailPassword`, and `confirm()` has in `confirmLinkPhoneOtp`).
 *
 * So the app has to ASK. Three triggers call the same `checkVerified`:
 *   1. window `focus`  — highest signal; the student tabs back from their mail.
 *   2. a 5s poll       — covers verifying on a PHONE while this tab stays focused.
 *   3. a manual button — the honest fallback when both miss, so the student is
 *                        never stranded staring at a screen that "should" advance.
 * None of them is load-bearing alone; the button alone would be enough to avoid
 * a dead end, and the other two just make it feel instant.
 *
 * ── NOT HERE ──────────────────────────────────────────────────────────────
 * No name prompt. Writing `displayName` needs a context key AuthContext does not
 * expose, which `AuthContext.passwordReset.test.tsx` pins by exact equality —
 * see [FU-AUTH-NAME-PROMPT], queued to the NAME+LINK lane.
 */

const RESEND_COOLDOWN_SECONDS = 60;
const POLL_INTERVAL_MS = 5000;

/** Copy the owner asked for by name — the sender domain is unfamiliar, so this is likely. */
export const SPAM_FOLDER_PROMPT =
  "Check your spam or junk folder — it sometimes lands there.";

function errorCode(err: unknown): string {
  return typeof err === "object" && err !== null && "code" in err
    ? String((err as { code?: unknown }).code || "")
    : "";
}

function describeChangeError(err: unknown): string {
  switch (errorCode(err)) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/email-already-in-use":
      return "That address is already used by another account. Try a different one.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/requires-recent-login":
      return "For your security, sign in again before changing your address.";
    default:
      return "Could not change the address. Please try again.";
  }
}

export type VerifyEmailGateProps = {
  /** The address the verification link was sent to. */
  email: string | null;
  /**
   * The password the student typed moments ago, when it is known.
   *
   * `verifyBeforeUpdateEmail` throws `auth/requires-recent-login` for a session
   * that is not fresh — a student who signed up yesterday, closed the tab and
   * came back. Because they have JUST re-entered their password on the door, we
   * can re-authenticate silently and retry rather than dead-ending them. When
   * it is not known (session restored without a password entry) the re-auth is
   * skipped and the honest "sign in again" message shows instead.
   */
  knownPassword?: string;
  /** Called once `reload()` reports `emailVerified`. */
  onVerified: () => void;
  /** Sign out and return to the door — the escape hatch from a wrong account. */
  onStartOver: () => void;
};

export default function VerifyEmailGate({
  email,
  knownPassword,
  onVerified,
  onStartOver,
}: VerifyEmailGateProps) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changeBusy, setChangeBusy] = useState(false);
  const [changeSent, setChangeSent] = useState<string | null>(null);

  // React StrictMode double-invokes effects in dev; without this the student
  // gets two verification mails and the rate limit halves.
  const initialSendRef = useRef(false);
  // `onVerified` must fire exactly once — the poll and the focus listener can
  // both resolve in the same tick.
  const settledRef = useRef(false);

  const sendInitial = useCallback(async () => {
    const current = authClient?.currentUser;
    if (!current) return;
    try {
      await sendEmailVerification(current);
    } catch {
      // A failed FIRST send is recoverable with Resend, and surfacing an error
      // the student cannot act on above a screen that is already asking them to
      // wait would read as a failure of the sign-up itself. Resend reports.
    }
  }, []);

  useEffect(() => {
    if (initialSendRef.current) return;
    initialSendRef.current = true;
    void sendInitial();
  }, [sendInitial]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((n) => (n <= 1 ? 0 : n - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const checkVerified = useCallback(async (): Promise<boolean> => {
    const current = authClient?.currentUser;
    if (!current || settledRef.current) return false;
    try {
      await reload(current);
    } catch {
      return false;
    }
    // RE-CHECK after the await. The entry guard above is not enough: the poll
    // and the focus listener can both be in flight, and both would resume here
    // to find `emailVerified` true and fire `onVerified` twice — which navigates
    // twice. The guard has to be read on BOTH sides of the suspension point.
    if (settledRef.current) return false;
    if (current.emailVerified) {
      settledRef.current = true;
      onVerified();
      return true;
    }
    return false;
  }, [onVerified]);

  // Trigger 2 — the poll.
  useEffect(() => {
    const id = window.setInterval(() => {
      void checkVerified();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [checkVerified]);

  // Trigger 1 — the student tabs back from their mail client.
  useEffect(() => {
    const onFocus = () => {
      void checkVerified();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkVerified]);

  // Trigger 3 — the manual fallback.
  const handleCheckNow = async () => {
    if (checking) return;
    setError(null);
    setNotice(null);
    setChecking(true);
    const ok = await checkVerified();
    if (!ok) {
      setNotice("Not verified yet. Open the link in the email, then try again.");
    }
    setChecking(false);
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    const current = authClient?.currentUser;
    if (!current) return;
    setError(null);
    setNotice(null);
    try {
      await sendEmailVerification(current);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice("Sent again. It can take a minute to arrive.");
    } catch (err) {
      setError(
        errorCode(err) === "auth/too-many-requests"
          ? "Too many requests. Please wait a few minutes before trying again."
          : "Could not send the email. Please try again.",
      );
    }
  };

  const handleChangeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (changeBusy) return;
    const target = newEmail.trim();
    setError(null);
    setNotice(null);
    if (!target) {
      setError("Enter your email address.");
      return;
    }
    const current = authClient?.currentUser;
    if (!current) {
      setError("Sign in again before changing your address.");
      return;
    }
    setChangeBusy(true);
    try {
      try {
        await verifyBeforeUpdateEmail(current, target);
      } catch (err) {
        // The documented failure for a session that is not fresh. Because the
        // student re-entered their password on the door seconds ago we can
        // prove possession again without asking twice — then retry ONCE. A
        // second failure is reported, never retried again.
        if (errorCode(err) !== "auth/requires-recent-login" || !knownPassword || !current.email) {
          throw err;
        }
        await reauthenticateWithCredential(
          current,
          EmailAuthProvider.credential(current.email, knownPassword),
        );
        await verifyBeforeUpdateEmail(current, target);
      }
      // `verifyBeforeUpdateEmail` sends to the NEW address and only switches the
      // account over once that link is clicked — so a typo cannot strand the
      // student a second time.
      setChangeSent(target);
      setChangeOpen(false);
      setNewEmail("");
    } catch (err) {
      setError(describeChangeError(err));
    } finally {
      setChangeBusy(false);
    }
  };

  const shownAddress = changeSent || email;

  return (
    <div className="lt-verify" data-testid="lt-verify-gate">
      <h2 className="lt-verify-heading">Confirm your email address</h2>
      <p className="lt-verify-lede">
        {changeSent
          ? "We've sent a confirmation link to your new address. Your account switches over once you open it."
          : "We've sent you a link. Open it and your account is ready — this keeps your work reachable if you ever lose your password."}
      </p>

      <p className="lt-verify-address" data-testid="lt-verify-address">
        {shownAddress || "your email address"}
      </p>

      <p className="lt-verify-spam" data-testid="lt-verify-spam">
        <span aria-hidden="true">{"!"}</span>
        <span>{SPAM_FOLDER_PROMPT}</span>
      </p>

      {notice ? (
        <p className="lt-verify-notice" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="lt-login-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="lt-continue"
        onClick={handleCheckNow}
        disabled={checking}
      >
        {checking ? "Checking..." : "I've verified — continue"}{" "}
        <span aria-hidden="true">{"→"}</span>
      </button>

      <div className="lt-verify-actions">
        <button
          type="button"
          className="lt-login-linkbtn"
          onClick={handleResend}
          disabled={cooldown > 0}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend the email"}
        </button>
        <button
          type="button"
          className="lt-login-linkbtn"
          onClick={() => {
            setChangeOpen((open) => !open);
            setError(null);
            setNotice(null);
          }}
        >
          Wrong address? Change it
        </button>
      </div>

      {changeOpen ? (
        <form className="lt-verify-change" onSubmit={handleChangeSubmit} noValidate>
          <label className="lt-field-label" htmlFor="lt-verify-new-email">
            New email address
          </label>
          <div className="lt-field">
            <input
              id="lt-verify-new-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <p className="lt-login-note">
            We'll send the link to the new address and only switch your account over
            once you open it.
          </p>
          <button className="lt-continue" type="submit" disabled={changeBusy}>
            {changeBusy ? "Sending..." : "Send link to the new address"}{" "}
            <span aria-hidden="true">{"→"}</span>
          </button>
        </form>
      ) : null}

      <p className="lt-verify-startover">
        <button type="button" className="lt-login-linkbtn" onClick={onStartOver}>
          Use a different account
        </button>
      </p>
    </div>
  );
}
