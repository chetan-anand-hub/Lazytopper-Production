import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="dark-page" style={{
      minHeight: "100vh",
      fontFamily: "'Inter', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      ` }} />

      <div style={{ width: "100%", maxWidth: 480, padding: "40px 24px 48px" }}>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
            background: "linear-gradient(135deg, #22c55e, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, fontWeight: 900, color: "var(--text)",
            boxShadow: "0 0 28px rgba(34,197,94,0.35)",
          }}>R</div>

          <h1 className="font-display" style={{
            fontSize: 36, fontWeight: 800, lineHeight: 1.15, marginBottom: 14,
          }}>
            Score higher in boards.<br />
            Without the grind.
          </h1>

          <p style={{
            fontSize: 15, color: "var(--text-muted)",
            lineHeight: 1.6, maxWidth: 340, margin: "0 auto",
          }}>
            AI-powered CBSE Class 10 prep that knows<br />
            exactly which questions are coming.
          </p>
        </div>

        <div style={{
          height: 1,
          background: "var(--bg-card)",
          marginBottom: 28,
        }} />

        <button
          onClick={() => {
            if (user) {
              navigate("/onboarding");
            } else {
              navigate("/login", { state: { from: "/onboarding" } });
            }
          }}
          style={{
            width: "100%", padding: "16px 0", height: 52, borderRadius: 14, border: "none",
            background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 18,
            fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            boxShadow: "0 0 30px rgba(34,197,94,0.3)", marginBottom: 16,
          }}
        >
          Get My Study Plan →
        </button>

        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <a
            href="/trends/10/Maths"
            onClick={(e) => { e.preventDefault(); navigate("/trends/10/Maths"); }}
            style={{
              fontSize: 13, color: "var(--text-muted)",
              textDecoration: "none", cursor: "pointer",
            }}
          >
            Explore topics first →
          </a>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            "Predict which chapters will come in your exam",
            "Ravi Sir explains, then you practice weak areas",
            "Full mock tests graded by CBSE marking scheme",
          ].map((line, i) => (
            <p key={i} style={{
              fontSize: 14, color: "var(--text-muted)",
              lineHeight: 1.5,
            }}>
              ✓&nbsp;&nbsp;{line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
