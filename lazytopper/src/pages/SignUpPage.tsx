import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SignUp } from "@clerk/react";
import { useAuth } from "../context/AuthContext";

type LocationState = { from?: string };

export default function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

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
            Create Account
          </h1>
          <p style={{ fontSize: "0.92rem", color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.4 }}>
            CBSE Class 10 Board Exam Prep
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/login"
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
      </div>
    </div>
  );
}
