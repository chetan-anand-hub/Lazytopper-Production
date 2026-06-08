import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
  const { user, signInWithGoogle, signUpWithEmailPassword } = useAuth();

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
    const st = (location.state || {}) as LocationState;
    return st.from || "/onboarding";
  }, [location.state]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
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
    const trimmedEmail = email.trim();
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
      await signUpWithEmailPassword(trimmedEmail, password);
      // Navigation handled by the `user` effect once auth state updates.
    } catch (err) {
      setError(describeAuthError(err));
      setBusy(false);
    }
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

        <form onSubmit={handleEmailSubmit} noValidate>
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
