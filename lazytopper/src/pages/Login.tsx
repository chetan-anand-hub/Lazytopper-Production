import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useVibeMode } from "../context/vibeModeContext";
import { firebaseProjectId } from "../services/firebaseClient";
import { trackUxEvent } from "../services/uxTelemetry";
import { startSession } from "../services/sessionApi";

type LocationState = { from?: string };

const FIREBASE_ENV_TEMPLATE = `VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com`;

function normalizePhone(raw: string): string {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (raw.trim().startsWith("+")) return raw.trim();
  return "";
}

function isTruthyFlag(value: string): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useVibeMode();
  const {
    user,
    firebaseReady,
    phoneRecaptchaStatus,
    signInWithGoogle,
    initPhoneRecaptcha,
    sendPhoneOtp,
    verifyPhoneOtp,
    continueLocalSession,
  } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [realOtpOnly, setRealOtpOnly] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const showLocalQuickStart =
    Boolean(import.meta.env.DEV) &&
    isTruthyFlag(String(import.meta.env.VITE_ENABLE_LOCAL_SESSION_FALLBACK || ""));
  const nextPath = useMemo(() => {
    const st = (location.state || {}) as LocationState;
    return st.from || "/onboarding";
  }, [location.state]);

  useEffect(() => {
    if (user) navigate(nextPath, { replace: true });
  }, [user, nextPath, navigate]);

  useEffect(() => {
    if (!firebaseReady) return;
    void initPhoneRecaptcha("firebase-recaptcha-container").catch(() => {
      // keep login usable; error will surface during send if config/network is broken
    });
  }, [firebaseReady, initPhoneRecaptcha]);

  const handleGoogle = async () => {
    setBusy(true);
    setError("");
    trackUxEvent("login_google_click", "login", { nextPath });
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleLocalQuickStart = async () => {
    setBusy(true);
    setError("");
    trackUxEvent("login_google_click", "login", { nextPath, flow: "local_quick_start" });
    try {
      continueLocalSession();
      const started = await startSession({
        kind: "chapter",
        subjectId: "maths",
        chapterId: "real-numbers",
        vibe: mode === "zombie" ? "low" : "high",
      });
      navigate(`/play/${encodeURIComponent(started.sessionId)}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Local quick start failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError("Enter a valid phone number (e.g. +91XXXXXXXXXX).");
      return;
    }
    setBusy(true);
    setError("");
    trackUxEvent("login_phone_send_otp", "login", { phone: normalized, recaptchaStatus: phoneRecaptchaStatus });
    try {
      await sendPhoneOtp(normalized, "firebase-recaptcha-container");
      setOtpSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send OTP.";
      trackUxEvent("login_phone_error", "login", { stage: "send_otp", message });
      if (message.includes("auth/invalid-app-credential")) {
        setError(
          "Phone verification failed due to reCAPTCHA/app credential validation. Complete reCAPTCHA, then retry. If it still fails, continue with Email (Google)."
        );
      } else if (message.includes("auth/too-many-requests")) {
        setError("Too many attempts. Wait a few minutes, then retry or use Email (Google).");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError("Enter OTP.");
      return;
    }
    if (realOtpOnly && otp.trim() === "123456") {
      setError(
        "Test OTP detected. For real SMS OTP, remove testing numbers from Firebase Auth -> Phone provider."
      );
      return;
    }
    setBusy(true);
    setError("");
    trackUxEvent("login_phone_verify_otp", "login", { otpLength: otp.trim().length });
    try {
      await verifyPhoneOtp(otp.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lt-page">
      <h2 className="title center">Student Sign In</h2>
      <div className="card">
        <p className="subtitle">Use Gmail or phone OTP to create your personal dashboard.</p>
        <p className="subtitle" style={{ marginTop: 6 }}>
          After sign-in, you will continue to <strong>{nextPath}</strong>.
        </p>
        <p className="subtitle" style={{ marginTop: 6 }}>
          Connected Firebase project: <strong>{firebaseProjectId || "not-configured"}</strong>
        </p>
        <div style={{ marginTop: 10, marginBottom: 12 }}>
          <label style={{ fontWeight: 700 }}>Energy Level:</label>
          <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="pill-btn"
              style={{ background: mode === "zombie" ? "#1e293b" : undefined, color: mode === "zombie" ? "#fff" : undefined }}
              onClick={() => setMode("zombie")}
            >
              Low
            </button>
            <button
              type="button"
              className="pill-btn"
              style={{ background: mode === "beast" ? "#1e293b" : undefined, color: mode === "beast" ? "#fff" : undefined }}
              onClick={() => setMode("beast")}
            >
              High
            </button>
            <span style={{ fontSize: "0.86rem", opacity: 0.85 }}>
              {mode === "zombie"
                ? "Got it. Let's just do 10 mins of light revision today. No heavy lifting."
                : "Nice. Full-rigor mode is active for harder drills."}
            </span>
          </div>
        </div>

        {firebaseReady ? (
          <>
            <button className="cta-btn" onClick={handleGoogle} disabled={busy} data-testid="login-email-google">
              Sign in with Email (Google) - Recommended
            </button>
            {showLocalQuickStart ? (
              <button
                className="pill-btn"
                onClick={() => void handleLocalQuickStart()}
                disabled={busy}
                style={{ marginTop: 10 }}
              >
                Dev only: Continue in Local Session (no cloud save)
              </button>
            ) : null}

            <details style={{ marginTop: 14 }}>
              <summary style={{ cursor: "pointer", fontWeight: 800 }}>
                Use Phone OTP (advanced)
              </summary>
              <div style={{ marginTop: 10 }}>
                <label>Phone number (OTP)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setOtpSent(false);
                    setOtp("");
                  }}
                  placeholder="+91XXXXXXXXXX"
                />
                <p className="subtitle" style={{ marginTop: 6, marginBottom: 8 }}>
                  Step 1: solve reCAPTCHA. Step 2: click Send OTP. Step 3: enter OTP.
                </p>
                <p className="subtitle" style={{ marginTop: 0, marginBottom: 8 }}>
                  reCAPTCHA status: <strong>{phoneRecaptchaStatus}</strong>
                </p>
                <label style={{ display: "inline-flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={realOtpOnly}
                    onChange={(e) => setRealOtpOnly(e.target.checked)}
                  />
                  Require real SMS OTP
                </label>
                {!otpSent ? (
                  <button
                    className="pill-btn"
                    onClick={handleSendOtp}
                    disabled={busy || phoneRecaptchaStatus === "idle" || phoneRecaptchaStatus === "error"}
                  >
                    Send OTP
                  </button>
                ) : (
                  <>
                    <label style={{ marginTop: 8 }}>OTP</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit OTP"
                    />
                    <button className="pill-btn" onClick={handleVerifyOtp} disabled={busy}>
                      Verify OTP
                    </button>
                  </>
                )}
                <div id="firebase-recaptcha-container" style={{ marginTop: 10 }} />
              </div>
            </details>
          </>
        ) : (
          <>
            <p className="subtitle" style={{ marginTop: 8 }}>
              Firebase is not configured in this environment. Set `VITE_FIREBASE_*` env keys to enable Gmail/Phone auth.
            </p>
            <div style={{ marginTop: 8, background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, padding: 10 }}>
              <p style={{ margin: 0, fontWeight: 700 }}>Firebase setup (one-time)</p>
              <p style={{ marginTop: 6, marginBottom: 6, fontSize: "0.86rem" }}>
                1. Enable <strong>Google</strong> and <strong>Phone</strong> providers in Firebase Auth.
                2. Add your site domain to authorized domains.
                3. Create `.env.local` in project root with:
              </p>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: "0.8rem",
                  background: "#0f172a",
                  color: "#e2e8f0",
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                {FIREBASE_ENV_TEMPLATE}
              </pre>
            </div>
            <button className="pill-btn" onClick={() => void handleLocalQuickStart()} disabled={busy}>
              Continue in Local Session (no cloud save)
            </button>
          </>
        )}

        {error ? (
          <p style={{ marginTop: 12, color: "#b91c1c" }}>{error}</p>
        ) : null}
      </div>
    </div>
  );
}
