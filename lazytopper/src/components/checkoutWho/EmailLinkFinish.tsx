/**
 * EmailLinkFinish — PAY-ACCOUNT-1: finish a passwordless email sign-in on /login (signed out).
 *
 * The "Your LazyTopper account is ready" email's "Open LazyTopper" button and the thank-you screen's "Send me the sign-in
 * link" both return to `/login?finish=link&redirect=<My packs | Home>` with Firebase's one-time code. Nothing personal is
 * in that URL, and the address is NOT kept in storage (owner rule: no phone / email in URLs, analytics, localStorage or
 * logs), so this step asks the student to confirm it (the same "Confirm the email you opened the link from" prompt as the
 * CHECKOUT-WHO-2 add-email step), then `signInWithEmailLink`. Login's existing signed-in exit then takes them to the
 * `redirect` target through its safe-target guard. Lazy: never in the entry chunk.
 */
import { useState, type FormEvent } from "react";
import "../auth/linkEmailPanel.css";

export const FINISH_LINK_LABEL = "Confirm the email you opened the link from";

function describe(err: unknown): string {
  const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code?: unknown }).code || "") : "";
  switch (code) {
    case "auth/invalid-email":
      return "That isn't the email this link was sent to. Check it and try again.";
    case "auth/invalid-action-code":
    case "auth/expired-action-code":
      return "That link has expired or was already used. Sign in another way below.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    default:
      return "Couldn't sign you in just now. Please try again.";
  }
}

export default function EmailLinkFinish({ onCancel }: { onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const m = await import("../../services/linkSignInEmail");
      await m.completeSignInWithEmailLink(email);
      // Signed in: Login's own signed-in exit navigates to the safe `redirect` target.
    } catch (err) {
      setError(describe(err));
      setBusy(false);
    }
  }

  return (
    <div className="lt-lep" data-testid="email-link-finish">
      <h2 className="lt-login-stephead">Open LazyTopper</h2>
      <form className="lt-lep" onSubmit={(e) => void submit(e)} noValidate>
        <label className="lt-lep__label" htmlFor="lt-elf-email">{FINISH_LINK_LABEL}</label>
        <input
          id="lt-elf-email"
          className="lt-lep__input"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          disabled={busy}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="email-link-finish-input"
        />
        <button type="submit" className="lt-lep__primary" disabled={busy || !email.trim()} data-testid="email-link-finish-submit">
          {busy ? "Signing you in…" : "Sign in"}
        </button>
      </form>
      {error && (
        <p className="lt-lep__error" role="alert" data-testid="email-link-finish-error">
          {error}
        </p>
      )}
      <button type="button" className="lt-lep__secondary" disabled={busy} onClick={onCancel} data-testid="email-link-finish-other">
        Sign in another way
      </button>
    </div>
  );
}
