/**
 * EmailCodeSignIn — EMAIL-CODE-1 (owner 4 Nov 2026): sign in with a 6-digit code from email, typed on the same screen
 * (like the phone OTP). Used by /login ("Sign in with email code") and by the pay-first thank-you screen
 * (AccountReadyPanel: "It's for me — get a code"). Shown only while VITE_EMAIL_CODE_SIGNIN_ENABLED is on.
 *
 *   email -> "Send code" -> six boxes (ONE numeric input, autocomplete="one-time-code") -> signed in.
 *   "Send a new code" after 30 s. Clear errors: "That code didn't match — 4 tries left", "Code expired — send a new one".
 *
 * Signed in = Firebase signInWithCustomToken; every existing after-sign-in path (Login's safe redirect, AuthContext's claim,
 * the pay-first first sign-in) runs unchanged. The email and the code live in this component's memory only.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { maskEmail } from "../../services/checkoutWhoFlag";
import "./linkEmailPanel.css";
import "./emailCodeSignIn.css";

export const EMAIL_CODE_RESEND_SEC = 30;

type Phase = "email" | "sending" | "code" | "verifying" | "done";

export interface EmailCodeSignInProps {
  /** A FIXED address (the thank-you screen): no email box. Absent -> the student types it. */
  email?: string;
  /** Send the code as soon as this mounts (the thank-you screen's tap already asked for it). Needs `email`. */
  sendOnMount?: boolean;
  /** After a successful sign-in. */
  onSignedIn?: () => void;
  /** "Sign in another way" (Login). */
  onCancel?: () => void;
  /** Show the "Sign in with email code" heading (Login). */
  showHeading?: boolean;
  /** Test seams. */
  send?: (email: string) => Promise<void>;
  verify?: (email: string, code: string) => Promise<void>;
  describe?: (err: unknown) => string;
  resendAfterSec?: number;
  /** Render inside a modal sheet over the page (Login's EmailCodeDoor). */
  asSheet?: boolean;
}

async function defaultSend(email: string): Promise<void> {
  const m = await import("../../services/emailCode");
  await m.sendEmailCode(email);
}
async function defaultVerify(email: string, code: string): Promise<void> {
  const m = await import("../../services/emailCode");
  await m.signInWithEmailCode(email, code);
}
let describeImpl: ((err: unknown) => string) | null = null;
async function loadDescribe(): Promise<(err: unknown) => string> {
  if (!describeImpl) describeImpl = (await import("../../services/emailCode")).describeEmailCodeError;
  return describeImpl;
}

/** Errors after which the code boxes are no use: the student needs a NEW code. */
function needsNewCode(err: unknown): boolean {
  const kind = err && typeof err === "object" && "kind" in err ? String((err as { kind?: unknown }).kind) : "";
  return kind === "code_expired" || kind === "too_many_tries";
}

export default function EmailCodeSignIn({ email: fixedEmail, sendOnMount = false, onSignedIn, onCancel, showHeading = false, send = defaultSend, verify = defaultVerify, describe, resendAfterSec = EMAIL_CODE_RESEND_SEC, asSheet = false }: EmailCodeSignInProps) {
  const [typedEmail, setTypedEmail] = useState("");
  const email = fixedEmail ?? typedEmail;
  const [phase, setPhase] = useState<Phase>(fixedEmail && sendOnMount ? "sending" : "email");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [hasSent, setHasSent] = useState(false);
  const sentOnce = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function say(err: unknown) {
    const fn = describe || (await loadDescribe());
    setError(fn(err));
  }

  async function requestCode() {
    setError(null);
    setPhase("sending");
    try {
      await send(email);
      setCode("");
      setWait(resendAfterSec);
      setHasSent(true);
      setPhase("code");
    } catch (err) {
      await say(err);
      setPhase(hasSent ? "code" : "email");
    }
  }

  useEffect(() => {
    if (fixedEmail && sendOnMount && !sentOnce.current) {
      sentOnce.current = true; // StrictMode runs effects twice: one send only
      void (async () => {
        try {
          await send(fixedEmail);
          setWait(resendAfterSec);
          setHasSent(true);
          setPhase("code");
        } catch (err) {
          await say(err);
          sentOnce.current = false;
          setPhase("email");
        }
      })();
    }
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  useEffect(() => {
    if (phase === "code") inputRef.current?.focus();
  }, [phase]);

  async function submitCode(value: string) {
    if (value.length !== 6 || phase === "verifying") return;
    setError(null);
    setPhase("verifying");
    try {
      await verify(email, value);
      setPhase("done");
      onSignedIn?.();
    } catch (err) {
      await say(err);
      setCode("");
      setPhase("code");
      if (needsNewCode(err)) setWait(0);
    }
  }

  function onEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || phase === "sending") return;
    void requestCode();
  }

  const digits = code.split("");
  const masked = maskEmail(email);

  const body = (
    <div className="lt-lep" data-testid="email-code">
      {showHeading && <h2 className="lt-login-stephead">Sign in with email code</h2>}
      {phase === "email" || (phase === "sending" && !hasSent) ? (
        fixedEmail ? (
          <>
            {phase === "sending" && <p className="lt-ecs__sent" role="status">Sending a code to {masked}…</p>}
            {phase === "email" && (
              <button type="button" className="lt-lep__primary" onClick={() => void requestCode()} data-testid="email-code-send">
                Send me a code
              </button>
            )}
          </>
        ) : (
          <form className="lt-lep" onSubmit={onEmailSubmit} noValidate>
            <label className="lt-lep__label" htmlFor="lt-ecs-email">Your email</label>
            <input
              id="lt-ecs-email"
              className="lt-lep__input"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={typedEmail}
              disabled={phase === "sending"}
              onChange={(e) => setTypedEmail(e.target.value)}
              data-testid="email-code-email"
            />
            <button type="submit" className="lt-lep__primary" disabled={phase === "sending" || !typedEmail.trim()} data-testid="email-code-send">
              {phase === "sending" ? "Sending…" : "Send code"}
            </button>
            <p className="lt-ecs__fine">We email you a 6-digit code. Type it here — no password needed.</p>
          </form>
        )
      ) : phase === "done" ? (
        <p className="lt-lep__done" role="status" data-testid="email-code-done">Signed in ✓</p>
      ) : (
        <form
          className="lt-lep"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submitCode(code);
          }}
        >
          <p className="lt-ecs__sent" role="status" data-testid="email-code-sent">
            We sent a 6-digit code to <strong>{masked}</strong>. It is valid for 10 minutes.
          </p>
          <label className="lt-lep__label" htmlFor="lt-ecs-code">Enter the code</label>
          <div className="lt-ecs__boxes">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={i === Math.min(digits.length, 5) ? "lt-ecs__box lt-ecs__box--active" : "lt-ecs__box"} aria-hidden="true">
                {digits[i] || ""}
              </span>
            ))}
            <input
              ref={inputRef}
              id="lt-ecs-code"
              className="lt-ecs__input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              disabled={phase === "verifying"}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
                if (v.length === 6) void submitCode(v);
              }}
              data-testid="email-code-input"
            />
          </div>
          <button type="submit" className="lt-lep__primary" disabled={phase === "verifying" || code.length !== 6} data-testid="email-code-verify">
            {phase === "verifying" ? "Signing you in…" : "Sign in"}
          </button>
          <div className="lt-ecs__row">
            <button type="button" className="lt-ecs__link" disabled={wait > 0 || phase !== "code"} onClick={() => void requestCode()} data-testid="email-code-resend">
              {wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
            </button>
          </div>
          <p className="lt-ecs__fine">Not in your inbox? Check Spam or Promotions.</p>
        </form>
      )}
      {error && (
        <p className="lt-lep__error" role="alert" data-testid="email-code-error">
          {error}
        </p>
      )}
      {onCancel && phase !== "done" && (
        <button type="button" className="lt-lep__secondary" disabled={phase === "verifying"} onClick={onCancel} data-testid="email-code-other">
          Sign in another way
        </button>
      )}
    </div>
  );
  if (!asSheet) return body;
  return (
    <div className="lt-ecs__sheet" role="dialog" aria-modal="true" aria-label="Sign in with email code">
      <div className="lt-ecs__card">{body}</div>
    </div>
  );
}
