import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { creditPendingReferral } from "../services/referralService";
import { isSafeInternalPath } from "../lib/safeInternalPath";

type LocationState = { from?: string };

function describeAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code || "")
      : "";
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return ""; // user dismissed the Google popup — nothing to surface
    case "auth/email-already-in-use":
      return "An account with this email already exists — sign in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Choose a password with at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email sign-up is not enabled yet. Please try Google.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Could not create your account. Please try again.";
  }
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    signInWithGoogle,
    signUpWithEmailPassword,
    initPhoneRecaptcha,
    sendPhoneOtp,
    verifyPhoneOtp,
  } = useAuth();

  // DISTINCT from Login's "lt-login-recaptcha". Two pages now render a verifier
  // container, and they must never be the same element id — see the container
  // tracking in AuthContext.initPhoneRecaptcha.
  const RECAPTCHA_CONTAINER_ID = "lt-signup-recaptcha";

  const [isLight, setIsLight] = useState(
    () => document.documentElement.getAttribute("data-theme") === "light"
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const nextPath = useMemo(() => {
    // A new signup lands on the homepage unless a safe internal `st.from` was passed.
    // `st.from` is guarded by isSafeInternalPath (same semantics as Login.tsx) so an
    // off-site or scheme-carrying target can never reach navigate() — [FU-SIGNUP-UNSAFE-REDIRECT].
    const st = (location.state || {}) as LocationState;
    return isSafeInternalPath(st.from) ? st.from : "/";
  }, [location.state]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone sign-up. Firebase creates the account on first phone sign-in, so a
  // phone-only student COULD already register — but only by finding the Sign IN
  // page, which no new user would think to do. Technically met, practically
  // broken; this pane is the missing entry point.
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"number" | "otp">("number");

  // Warm the invisible reCAPTCHA when the Phone tab opens so the first "Send
  // OTP" doesn't pay the Google script-load latency.
  useEffect(() => {
    if (method !== "phone") return;
    void initPhoneRecaptcha(RECAPTCHA_CONTAINER_ID).catch(() => {
      // Surfaced on the actual send attempt; no honest state to show pre-action.
    });
  }, [method, initPhoneRecaptcha]);

  useEffect(() => {
    if (user) {
      // Referral crediting — see the matching call in Login.tsx. /sign-up is the
      // dedicated new-account path, so this is the post-signup moment for Google and
      // email/password signups. Self-idempotent and keyed on the real Firebase uid;
      // whichever of the two pages the student completes auth on credits exactly once.
      creditPendingReferral(user.uid);
      navigate(nextPath, { replace: true });
    }
  }, [user, nextPath, navigate]);

  const handleGoogle = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      // Navigation handled by the `user` effect once auth state updates.
    } catch (err) {
      setError(describeAuthError(err));
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    // The name is REQUIRED, not optional, and that is a deliberate call.
    // Google sign-in supplies `displayName`; email/password sign-up did not, so
    // `displayName` fell back to the raw email address across the shell
    // (App.tsx, DesktopShell, MobileAccountMenu, DashboardHeader,
    // ShareProgressPrompt) — a student's email rendered as their name.
    //
    // This is a ONE-WAY DOOR: an account created without a name cannot be
    // backfilled without asking the student again. An OPTIONAL field would
    // therefore close the defect only for the students who happened to fill it
    // in, and permanently re-create it for everyone who skipped — which is the
    // same bug with a smaller blast radius. One required field at the top of a
    // three-field form is the cheaper side of that trade, and Google sign-in
    // remains a one-click path for anyone who does not want to type it.
    if (!trimmedName) {
      setError("Enter your name.");
      return;
    }
    if (!trimmedEmail || !password) {
      setError("Enter an email and a password.");
      return;
    }
    if (password.length < 6) {
      setError("Choose a password with at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await signUpWithEmailPassword(trimmedEmail, password, trimmedName);
      // Navigation handled by the `user` effect once auth state updates.
    } catch (err) {
      setError(describeAuthError(err));
      setBusy(false);
    }
  };

  const handlePhoneSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (phoneStep === "number") {
      if (phone.length !== 10) {
        setError("Enter your 10-digit mobile number.");
        return;
      }
      setBusy(true);
      try {
        await sendPhoneOtp(`+91${phone}`, RECAPTCHA_CONTAINER_ID);
        setPhoneStep("otp");
      } catch (err) {
        setError(describeAuthError(err));
      } finally {
        setBusy(false);
      }
      return;
    }
    // phoneStep === "otp"
    if (otp.length !== 6) {
      setError("Enter the 6-digit code from the SMS.");
      return;
    }
    setBusy(true);
    try {
      await verifyPhoneOtp(otp);
      // Navigation handled by the `user` effect once auth state updates.
    } catch (err) {
      setError(describeAuthError(err));
      setBusy(false);
    }
  };

  const switchMethod = (next: "email" | "phone") => {
    if (busy || next === method) return;
    setError(null);
    setMethod(next);
  };

  const fieldStyle: CSSProperties = {
    width: "100%",
    minHeight: 44,
    border: isLight ? "1px solid rgba(7,26,61,0.16)" : "1px solid var(--bg-card-border)",
    borderRadius: 12,
    background: isLight ? "#ffffff" : "var(--bg-card)",
    color: "var(--text)",
    padding: "12px 14px",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: "0.95rem",
    outline: "none",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          backdropFilter: "blur(16px)",
          borderRadius: 20,
          maxWidth: 420,
          width: "100%",
          padding: "36px 28px",
          border: "1px solid var(--bg-card-border)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #16b96a, #0b8f50)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: 22,
              marginBottom: 12,
              boxShadow: "0 18px 38px rgba(22,185,106,0.28)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            LT
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              margin: "0 0 6px",
              color: "var(--text)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Create your account
          </h1>
          <p style={{ fontSize: "0.92rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
            CBSE Class 10 Board Exam Prep
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 11,
            background: "#ffffff",
            border: "1px solid #dbe3ee",
            borderRadius: 12,
            padding: 13,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: "0.95rem",
            fontWeight: 700,
            color: "#071a3d",
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          <span style={{ display: "inline-flex", width: 18, height: 18 }} aria-hidden="true">
            <svg viewBox="0 0 48 48" width="18" height="18">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
          </span>
          Continue with Google
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            margin: "18px 0 16px",
            color: "var(--text-muted)",
            fontSize: "0.8rem",
            fontWeight: 700,
          }}
        >
          <span style={{ flex: 1, height: 1, background: "var(--bg-card-border)" }} />
          or
          <span style={{ flex: 1, height: 1, background: "var(--bg-card-border)" }} />
        </div>

        <div
          role="tablist"
          aria-label="Sign-up method"
          style={{ display: "flex", gap: 8, marginBottom: 16 }}
        >
          {(["email", "phone"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={method === m}
              onClick={() => switchMethod(m)}
              style={{
                flex: 1,
                minHeight: 40,
                borderRadius: 10,
                border:
                  method === m
                    ? "1px solid #16b96a"
                    : "1px solid var(--bg-card-border)",
                background: method === m ? "rgba(22,185,106,0.12)" : "transparent",
                color: "var(--text)",
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: "0.88rem",
                fontWeight: 800,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {m === "email" ? "Email" : "Phone"}
            </button>
          ))}
        </div>

        {method === "email" ? (
        <form onSubmit={handleEmailSubmit} noValidate>
          <label
            htmlFor="lt-su-name"
            style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text)", marginBottom: 7 }}
          >
            Your name
          </label>
          <input
            id="lt-su-name"
            type="text"
            autoComplete="name"
            placeholder="Ananya Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ ...fieldStyle, marginBottom: 12 }}
          />
          <label
            htmlFor="lt-su-email"
            style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text)", marginBottom: 7 }}
          >
            Email address
          </label>
          <input
            id="lt-su-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...fieldStyle, marginBottom: 12 }}
          />
          <label
            htmlFor="lt-su-password"
            style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text)", marginBottom: 7 }}
          >
            Password
          </label>
          <input
            id="lt-su-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={fieldStyle}
          />
          {error ? (
            <p style={{ margin: "8px 0 0", color: "#c0362c", fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.4 }} role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              marginTop: 16,
              background: "#071a3d",
              color: "#ffffff",
              border: 0,
              borderRadius: 12,
              padding: 14,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: "0.98rem",
              fontWeight: 800,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.55 : 1,
            }}
          >
            {busy ? "Creating account..." : "Create account"}
          </button>
        </form>
        ) : (
        <form onSubmit={handlePhoneSubmit} noValidate>
          {phoneStep === "number" ? (
            <>
              <label
                htmlFor="lt-su-phone"
                style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text)", marginBottom: 7 }}
              >
                Mobile number
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <span
                  style={{
                    ...fieldStyle,
                    width: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    fontWeight: 700,
                  }}
                  aria-hidden="true"
                >
                  +91
                </span>
                <input
                  id="lt-su-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="10-digit number"
                  value={phone}
                  // Digits only, capped at 10 — the +91 prefix is fixed, so a
                  // pasted "+91..." or a spaced number cannot reach Firebase
                  // malformed.
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  style={fieldStyle}
                />
              </div>
            </>
          ) : (
            <>
              <label
                htmlFor="lt-su-otp"
                style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text)", marginBottom: 7 }}
              >
                Enter the 6-digit code
              </label>
              <input
                id="lt-su-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={fieldStyle}
              />
              <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {`Sent to +91${phone}`}
              </p>
            </>
          )}
          {error ? (
            <p style={{ margin: "8px 0 0", color: "#c0362c", fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.4 }} role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              marginTop: 16,
              background: "#071a3d",
              color: "#ffffff",
              border: 0,
              borderRadius: 12,
              padding: 14,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: "0.98rem",
              fontWeight: 800,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.55 : 1,
            }}
          >
            {phoneStep === "number"
              ? busy
                ? "Sending code..."
                : "Send OTP"
              : busy
                ? "Verifying..."
                : "Verify and create account"}
          </button>
        </form>
        )}

        {/* The invisible reCAPTCHA renders here. The id is DISTINCT from
            Login's, and AuthContext tracks which container the live verifier was
            rendered into so navigating between the two pages rebuilds rather
            than reusing a widget bound to an unmounted element. */}
        <div id={RECAPTCHA_CONTAINER_ID} />

        <p style={{ textAlign: "center", margin: "16px 0 0", fontSize: "0.86rem", color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--text)", fontWeight: 800, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
