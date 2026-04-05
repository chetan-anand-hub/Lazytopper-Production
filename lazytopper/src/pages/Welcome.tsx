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

      <div style={{ width: "100%", maxWidth: 480, padding: "40px 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 16px",
            background: "linear-gradient(135deg, #22c55e, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, fontWeight: 900, color: "#000",
            boxShadow: "0 0 40px rgba(34,197,94,0.3)",
          }}>R</div>
          <h1 className="font-display" style={{
            fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: 8,
          }}>
            Hey! I'm <span style={{ color: "#22c55e" }}>Ravi Sir</span>
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
            Your AI tutor for CBSE Class 10 boards.<br/>
            Let me show you how we'll crack this together.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
          {steps.map((step, i) => (
            <div key={i} className="glass-card" style={{
              padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `${step.color}15`, border: `1px solid ${step.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>{step.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                    background: `${step.color}20`, border: `1px solid ${step.color}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 800, color: step.color,
                  }}>{i + 1}</span>
                  <span className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>{step.title}</span>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: "20px", borderRadius: 16,
          background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
          textAlign: "center", marginBottom: 12,
        }}>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
            Start with a <span style={{ color: "#22c55e", fontWeight: 700 }}>7-day free trial</span> — no payment needed
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            Google or Phone login · All features unlocked
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
            width: "100%", padding: "15px 0", borderRadius: 14, border: "none",
            background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 16,
            fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            boxShadow: "0 0 30px rgba(34,197,94,0.3)", marginBottom: 10,
          }}
        >
          Set My Target →
        </button>

        <button
          onClick={() => navigate("/trends/10/Maths")}
          style={{
            width: "100%", padding: "13px 0", borderRadius: 14,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: 14,
            fontFamily: "'Inter', sans-serif", cursor: "pointer",
          }}
        >
          Explore as Guest
        </button>
      </div>
    </div>
  );
}
