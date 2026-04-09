import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const steps = [
  {
    icon: "📈",
    title: "See What Matters",
    desc: "AI-predicted exam trends show which topics carry the most marks.",
    color: "#22c55e",
  },
  {
    icon: "🧠",
    title: "Learn Smart",
    desc: "Ravi Sir teaches each concept with board-style examples & checkpoints.",
    color: "#3b82f6",
  },
  {
    icon: "⚡",
    title: "Practice Daily",
    desc: "Get a personalised daily mix — weighted by your weak areas.",
    color: "#f97316",
  },
  {
    icon: "📝",
    title: "Test Yourself",
    desc: "Full mock exams graded by CBSE marking scheme. Know where you stand.",
    color: "#a855f7",
  },
  {
    icon: "📊",
    title: "Track Progress",
    desc: "Your dashboard shows streaks, mastery, weak areas & realistic scores.",
    color: "#06b6d4",
  },
];

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#fff",
      fontFamily: "'Inter', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .glass-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      ` }} />

      <div style={{ width: "100%", maxWidth: 480, padding: "48px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            width: 88, height: 88, borderRadius: "50%", margin: "0 auto 24px",
            background: "linear-gradient(135deg, #22c55e, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 44, fontWeight: 900, color: "#000",
            boxShadow: "0 0 40px rgba(34,197,94,0.3)",
          }}>R</div>
          <h1 className="font-display" style={{
            fontSize: 40, fontWeight: 800, lineHeight: 1.2, marginBottom: 16,
          }}>
            Hey! I'm <span style={{ color: "#22c55e" }}>Ravi Sir</span>
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, maxWidth: 380 }}>
            Your AI tutor for CBSE Class 10 boards.<br/>
            Let me show you how we'll crack this together.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 48 }}>
          {steps.map((step, i) => (
            <div key={i} className="glass-card" style={{
              padding: "20px 22px", display: "flex", alignItems: "flex-start", gap: 16,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: `${step.color}15`, border: `1px solid ${step.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28,
              }}>{step.icon}</div>
              <div style={{ flex: 1, paddingTop: 2 }}>
                <span className="font-display" style={{ fontSize: 18, fontWeight: 700, display: "block", marginBottom: 6 }}>{step.title}</span>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: "20px", borderRadius: 16,
          background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
          textAlign: "center", marginBottom: 12,
        }}>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>
            <span style={{ color: "#22c55e", fontWeight: 700 }}>Free forever</span> — core features always available
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            Sign in to unlock your personalised study plan
          </p>
        </div>

        <button
          onClick={() => {
            if (user) {
              navigate("/onboarding");
            } else {
              navigate("/login", { state: { from: "/onboarding" } });
            }
          }}
          style={{
            width: "100%", padding: "18px 0", borderRadius: 14, border: "none",
            background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 18,
            fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            boxShadow: "0 0 30px rgba(34,197,94,0.3)", marginBottom: 12,
          }}
        >
          Set My Target →
        </button>

        <button
          onClick={() => navigate("/trends/10/Maths")}
          style={{
            width: "100%", padding: "16px 0", borderRadius: 14,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.55)", fontWeight: 600, fontSize: 16,
            fontFamily: "'Inter', sans-serif", cursor: "pointer",
          }}
        >
          Explore as Guest
        </button>
      </div>
    </div>
  );
}
