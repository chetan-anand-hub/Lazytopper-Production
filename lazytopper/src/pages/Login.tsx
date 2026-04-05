import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { trackUxEvent } from "../services/uxTelemetry";

type LocationState = { from?: string };

function normalizePhone(raw: string): string {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (raw.trim().startsWith("+")) return raw.trim();
  return "";
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [authMode, setAuthMode] = useState<"choice" | "phone">("choice");

  const nextPath = useMemo(() => {
    const st = (location.state || {}) as LocationState;
    return st.from || "/dashboard";
  }, [location.state]);

  useEffect(() => {
    if (user) {
      navigate(nextPath, { replace: true });
    }
  }, [user, nextPath, navigate]);

  useEffect(() => {
    if (!firebaseReady) return;
    void initPhoneRecaptcha("firebase-recaptcha-container").catch(() => {});
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

  const handleSendOtp = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError("Enter a valid phone number (e.g. 98XXXXXXXX).");
      return;
    }
    setBusy(true);
    setError("");
    trackUxEvent("login_phone_send_otp", "login", { phone: normalized });
    try {
      await sendPhoneOtp(normalized, "firebase-recaptcha-container");
      setOtpSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send OTP.";
      if (message.includes("auth/too-many-requests")) {
        setError("Too many attempts. Wait a few minutes, then retry.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError("Enter the OTP sent to your phone.");
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

  const handleGuest = () => {
    trackUxEvent("login_guest_explore", "login", {});
    continueLocalSession();
    navigate(nextPath, { replace: true });
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0a",
      padding: 16,
    }}>
      <div style={{
        background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)",
        borderRadius: 20, maxWidth: 400, width: "100%",
        padding: "36px 28px", border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #22c55e, #3b82f6)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "#000", fontWeight: 900, fontSize: 22, marginBottom: 12,
            boxShadow: "0 0 30px rgba(34,197,94,0.3)",
          }}>
            LT
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "0 0 6px", color: "#fff", fontFamily: "'Space Grotesk', sans-serif" }}>
            LazyTopper
          </h1>
          <p style={{ fontSize: "0.92rem", color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.4 }}>
            CBSE Class 10 Board Exam Prep
          </p>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.25)", margin: "6px 0 0" }}>
            Maths & Science — AI-powered, exam-focused
          </p>
        </div>

        {!firebaseReady ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.4)", marginBottom: 16, lineHeight: 1.5 }}>
              Sign-in is currently unavailable. You can still explore the app as a guest.
            </p>
            <button
              type="button"
              onClick={handleGuest}
              style={{
                width: "100%", border: "none",
                borderRadius: 14, padding: "14px 20px",
                background: "#22c55e", color: "#000",
                fontSize: "1rem", fontWeight: 800, cursor: "pointer",
                textTransform: "uppercase", fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: "0 0 24px rgba(34,197,94,0.3)",
              }}
            >
              Explore as Guest
            </button>
          </div>
        ) : authMode === "choice" ? (
          <div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              style={{
                width: "100%", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                padding: "14px 20px", background: "rgba(255,255,255,0.05)", color: "#fff",
                fontSize: "0.95rem", fontWeight: 800, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                opacity: busy ? 0.6 : 1,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 33.5 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.7 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.5 18.8 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.7 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5 0 9.6-1.6 13.2-4.4l-6.1-5.2C29 36 26.6 36.8 24 36.8c-5.2 0-9.6-3.4-11.2-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.1 5.2C37 39.1 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              margin: "18px 0", color: "rgba(255,255,255,0.2)", fontSize: "0.82rem",
            }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
              <span>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            </div>

            <button
              type="button"
              onClick={() => setAuthMode("phone")}
              disabled={busy}
              style={{
                width: "100%", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                padding: "14px 20px", background: "rgba(255,255,255,0.05)", color: "#fff",
                fontSize: "0.95rem", fontWeight: 800, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>📱</span>
              Sign in with Phone
            </button>

            <button
              type="button"
              onClick={handleGuest}
              style={{
                width: "100%", marginTop: 16, border: "none",
                background: "transparent", color: "#22c55e",
                fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
                padding: "8px 0",
              }}
            >
              Explore as Guest →
            </button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => { setAuthMode("choice"); setOtpSent(false); setError(""); }}
              style={{
                background: "none", border: "none", color: "#22c55e",
                fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
                padding: 0, marginBottom: 16,
              }}
            >
              ← Back to sign-in options
            </button>

            {!otpSent ? (
              <div>
                <label style={{ fontSize: "0.88rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 6 }}>
                  Phone Number
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{
                    padding: "12px 14px", borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
                    fontWeight: 700, color: "rgba(255,255,255,0.6)", fontSize: "0.95rem",
                    display: "flex", alignItems: "center",
                  }}>
                    +91
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(""); }}
                    placeholder="98XXXXXXXX"
                    style={{
                      flex: 1, padding: "12px 14px", borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
                      fontSize: "1rem", fontWeight: 600, outline: "none", color: "#fff",
                    }}
                    maxLength={10}
                    autoFocus
                  />
                </div>
                <div id="firebase-recaptcha-container" style={{ marginTop: 12 }} />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={busy || phoneRecaptchaStatus === "idle"}
                  style={{
                    width: "100%", marginTop: 12, border: "none",
                    borderRadius: 14,
                    padding: "14px 20px", background: "#22c55e", color: "#000",
                    fontSize: "1rem", fontWeight: 800, cursor: "pointer",
                    textTransform: "uppercase", opacity: busy ? 0.6 : 1,
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxShadow: "0 0 24px rgba(34,197,94,0.3)",
                  }}
                >
                  {busy ? "Sending..." : "Send OTP"}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>
                  We sent a 6-digit code to your phone. Enter it below.
                </p>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value); setError(""); }}
                  placeholder="Enter 6-digit OTP"
                  style={{
                    width: "100%", padding: "14px", borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
                    fontSize: "1.2rem", fontWeight: 700, outline: "none",
                    textAlign: "center", letterSpacing: "0.3em", color: "#fff",
                  }}
                  maxLength={6}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={busy}
                  style={{
                    width: "100%", marginTop: 12, border: "none",
                    borderRadius: 14,
                    padding: "14px 20px", background: "#22c55e", color: "#000",
                    fontSize: "1rem", fontWeight: 800, cursor: "pointer",
                    textTransform: "uppercase", opacity: busy ? 0.6 : 1,
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxShadow: "0 0 24px rgba(34,197,94,0.3)",
                  }}
                >
                  {busy ? "Verifying..." : "Verify OTP"}
                </button>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtp(""); setError(""); }}
                  style={{
                    width: "100%", marginTop: 8, background: "none",
                    border: "none", color: "#22c55e", fontWeight: 700,
                    fontSize: "0.85rem", cursor: "pointer",
                  }}
                >
                  Resend OTP
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <p style={{
            marginTop: 14, padding: "10px 14px", borderRadius: 12,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            color: "#f87171", fontSize: "0.85rem", fontWeight: 600,
          }}>
            {error}
          </p>
        )}

        <p style={{
          textAlign: "center", marginTop: 20, fontSize: "0.75rem",
          color: "rgba(255,255,255,0.2)", lineHeight: 1.4,
        }}>
          By signing in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
