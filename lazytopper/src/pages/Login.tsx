import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SignIn } from "@clerk/react";
import { useAuth } from "../context/AuthContext";
import { trackUxEvent } from "../services/uxTelemetry";

type LocationState = { from?: string };

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, continueLocalSession } = useAuth();

  const nextPath = useMemo(() => {
    const st = (location.state || {}) as LocationState;
    return st.from || "/dashboard";
  }, [location.state]);

  useEffect(() => {
    if (user) {
      navigate(nextPath, { replace: true });
    }
  }, [user, nextPath, navigate]);

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
        borderRadius: 20, maxWidth: 420, width: "100%",
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

        {/* Clerk Sign-In widget */}
        {/* To update login providers, app branding, or OAuth settings use the Auth
            pane in the workspace toolbar. More information can be found in the Replit docs. */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <SignIn
            routing="path"
            path="/app/login"
            signUpUrl="/app/sign-up"
            appearance={{
              variables: {
                colorPrimary: "#22c55e",
                colorBackground: "#0a0a0a",
                colorText: "#fff",
                colorInputBackground: "rgba(255,255,255,0.05)",
                colorInputText: "#fff",
                borderRadius: "12px",
              },
              elements: {
                rootBox: { width: "100%" },
                card: { background: "transparent", boxShadow: "none", border: "none", padding: 0 },
                headerTitle: { display: "none" },
                headerSubtitle: { display: "none" },
                socialButtonsBlockButton: {
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  borderRadius: "14px",
                  fontWeight: 800,
                },
                formButtonPrimary: {
                  background: "#22c55e",
                  color: "#000",
                  fontWeight: 800,
                  borderRadius: "14px",
                  boxShadow: "0 0 24px rgba(34,197,94,0.3)",
                },
                footerActionLink: { color: "#22c55e" },
                dividerLine: { background: "rgba(255,255,255,0.08)" },
                dividerText: { color: "rgba(255,255,255,0.2)" },
              },
            }}
          />
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          margin: "0 0 16px", color: "rgba(255,255,255,0.2)", fontSize: "0.82rem",
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span>or</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        <button
          type="button"
          onClick={handleGuest}
          style={{
            width: "100%", border: "none",
            background: "transparent", color: "#22c55e",
            fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
            padding: "8px 0",
          }}
        >
          Explore as Guest →
        </button>

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
