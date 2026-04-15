import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SignIn } from "@clerk/react";
import { useAuth } from "../context/AuthContext";
import { trackUxEvent } from "../services/uxTelemetry";

type LocationState = { from?: string };

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, continueLocalSession } = useAuth();

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
    if (st.from) return st.from;
    const hasProfile = !!window.localStorage.getItem("lazytopper.profile.v2");
    return hasProfile ? "/dashboard" : "/onboarding";
  }, [location.state]);

  useEffect(() => {
    trackUxEvent("login_start", "login", {});
  }, []);

  useEffect(() => {
    if (user) {
      trackUxEvent("login_complete", "login", {});
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
      background: "var(--bg)",
      padding: 16,
    }}>
      <div style={{
        background: isLight ? "rgba(0,0,0,0.03)" : "var(--bg-card)",
        backdropFilter: "blur(16px)",
        borderRadius: 20, maxWidth: 420, width: "100%",
        padding: "36px 28px",
        border: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid var(--bg-card-border)",
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
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "0 0 6px", color: "var(--text)", fontFamily: "'Space Grotesk', sans-serif" }}>
            LazyTopper
          </h1>
          <p style={{ fontSize: "0.92rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
            CBSE Class 10 Board Exam Prep
          </p>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "6px 0 0" }}>
            Maths & Science — AI-powered, exam-focused
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/sign-up"
            appearance={{
              variables: {
                colorPrimary: "#22c55e",
                colorBackground: isLight ? "#ffffff" : "#0a0a0a",
                colorText: isLight ? "#111111" : "#ffffff",
                colorInputBackground: isLight ? "rgba(0,0,0,0.04)" : "var(--bg-card)",
                colorInputText: isLight ? "#111111" : "#ffffff",
                borderRadius: "12px",
              },
              elements: {
                rootBox: { width: "100%" },
                card: { background: "transparent", boxShadow: "none", border: "none", padding: 0 },
                headerTitle: { display: "none" },
                headerSubtitle: { display: "none" },
                socialButtonsBlockButton: {
                  background: isLight ? "rgba(0,0,0,0.05)" : "var(--bg-card)",
                  border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid var(--bg-card-border)",
                  color: isLight ? "#111111" : "var(--text)",
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
                dividerLine: { background: isLight ? "rgba(0,0,0,0.08)" : "var(--bg-card)" },
                dividerText: { color: "var(--text-muted)" },
              },
            }}
          />
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          margin: "0 0 16px", color: "var(--text-muted)", fontSize: "0.82rem",
        }}>
          <div style={{ flex: 1, height: 1, background: isLight ? "rgba(0,0,0,0.08)" : "var(--bg-card)" }} />
          <span>or</span>
          <div style={{ flex: 1, height: 1, background: isLight ? "rgba(0,0,0,0.08)" : "var(--bg-card)" }} />
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
          color: "var(--text-muted)", lineHeight: 1.4,
        }}>
          By signing in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
