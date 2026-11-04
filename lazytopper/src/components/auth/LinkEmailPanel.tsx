/**
 * LinkEmailPanel — CHECKOUT-WHO-2: add an EMAIL as a second way into THIS account, inside LinkSignInMethodModal.
 *
 * Offered after a claim of a "Who will use it?" purchase that named an email the account has no verified sign-in for
 * (`alsoMasked` is the server's MASKED echo), and on the return from the email link (`returning`). Two routes, both verified
 * BEFORE anything is linked (services/linkSignInEmail): Google (Google proves the address) or an email link opened from
 * that inbox. The typed address is held in memory only — never stored, never in a URL we build.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { alsoSignInLine } from "../../services/checkoutWhoFlag";
import "./linkEmailPanel.css";
import CodeSentTo from "./CodeSentTo";

type Step = "choose" | "email" | "sent" | "finish" | "done";

export default function LinkEmailPanel({ alsoMasked, returning = false }: { alsoMasked?: string; returning?: boolean }) {
  const [step, setStep] = useState<Step>(returning ? "finish" : "choose");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** CODE-WHERE-1: "Wrong email? Change it" -> back to the email box (kept), focused. */
  const emailRef = useRef<HTMLInputElement | null>(null);
  const focusEmailNext = useRef(false);
  useEffect(() => {
    if (step !== "email" || !focusEmailNext.current) return;
    focusEmailNext.current = false;
    emailRef.current?.focus();
  }, [step]);

  async function run(work: (m: typeof import("../../services/linkSignInEmail")) => Promise<void>, next: Step) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const m = await import("../../services/linkSignInEmail");
      try {
        await work(m);
        setStep(next);
      } catch (e) {
        setError(m.describeEmailLinkError(e));
      }
    } catch {
      setError("Couldn't add that email just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step === "email") void run((m) => m.sendEmailLinkForLinking(email), "sent");
    else if (step === "finish")
      void run(async (m) => {
        await m.completeEmailLink(email);
        m.clearEmailLinkFromUrl();
      }, "done");
  };

  return (
    <div className="lt-lep" data-testid="link-email-panel">
      {alsoMasked && step !== "done" && (
        <p className="lt-lep__lede" data-testid="link-also-signin">
          {alsoSignInLine(alsoMasked, "email")}
        </p>
      )}
      {step === "choose" && (
        <>
          <button type="button" className="lt-lep__primary" disabled={busy} data-testid="link-email-google" onClick={() => void run((m) => m.linkGoogleToCurrentAccount(), "done")}>
            Add it with Google
          </button>
          <button type="button" className="lt-lep__secondary" disabled={busy} data-testid="link-email-by-link" onClick={() => setStep("email")}>
            Email me a link instead
          </button>
        </>
      )}
      {(step === "email" || step === "finish") && (
        <form className="lt-lep" onSubmit={submit} noValidate>
          <label className="lt-lep__label" htmlFor="lt-lep-email">
            {step === "finish" ? "Confirm the email you opened the link from" : "Your email address"}
          </label>
          <input
            ref={emailRef}
            id="lt-lep-email"
            className="lt-lep__input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="link-email-input"
          />
          <button type="submit" className="lt-lep__primary" disabled={busy || !email.trim()} data-testid="link-email-submit">
            {step === "finish" ? "Add this email" : "Send the link"}
          </button>
        </form>
      )}
      {step === "sent" && (
        <div data-testid="link-email-sent">
          <CodeSentTo
            kind="email"
            what="link"
            to={email}
            onChange={() => {
              setError(null);
              focusEmailNext.current = true;
              setStep("email");
            }}
          />
          <p className="lt-lep__lede">Open it from that inbox on this device to finish. Nothing is added until you do.</p>
        </div>
      )}
      {step === "done" && (
        <p className="lt-lep__done" role="status" data-testid="link-email-done">
          ✓ Email added — use either to sign in.
        </p>
      )}
      {error && (
        <p className="lt-lep__error" role="alert" data-testid="link-email-error">
          {error}
        </p>
      )}
    </div>
  );
}
