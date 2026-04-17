import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SignUp } from "@clerk/react";
import { useAuth } from "../context/AuthContext";

type LocationState = { from?: string };

export default function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

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

  useEffect(() => {
    if (user) {
      navigate(nextPath, { replace: true });
    }
  }, [user, nextPath, navigate]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)",
      padding: 16,
    }}>
      <div style={{
        background: "var(--bg-card)", backdropFilter: "blur(16px)",
        borderRadius: 20, maxWidth: 420, width: "100%",
        padding: "36px 28px", border: "1px solid var(--bg-card-border)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #22c55e, #3b82f6)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "var(--text)", fontWeight: 900, fontSize: 22, marginBottom: 12,
            boxShadow: "0 0 30px rgba(34,197,94,0.3)",
          }}>
            LT
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "0 0 6px", color: "var(--text)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Create Account
          </h1>
          <p style={{ fontSize: "0.92rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
            CBSE Class 10 Board Exam Prep
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <SignUp
            routing="path"
            path={import.meta.env.BASE_URL + "sign-up"}
            signInUrl={import.meta.env.BASE_URL + "login"}
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
                  color: isLight ? "#ffffff" : "var(--text)",
                  fontWeight: 800,
                  borderRadius: "14px",
                  boxShadow: "0 0 24px rgba(34,197,94,0.3)",
                },
                footerActionLink: { color: "#22c55e" },
                dividerLine: { background: "var(--bg-card)" },
                dividerText: { color: "var(--text-muted)" },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
