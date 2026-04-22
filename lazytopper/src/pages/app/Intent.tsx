import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/mobile/MobileShell";

const MODES = [
  {
    key: "practice",
    title: "Practice",
    sub: "Worksheets, sets & mock tests",
    pill: "Most popular",
    color: "var(--mob-primary)",
    bg: "rgba(26,58,92,0.08)",
    route: "/app/practice",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
      </svg>
    ),
  },
  {
    key: "trends",
    title: "Exam Trends",
    sub: "9 years of board data visualised",
    pill: "Data-driven",
    color: "hsl(217,76%,45%)",
    bg: "rgba(59,130,246,0.08)",
    route: "/app/exam-trends",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    key: "check",
    title: "Check & Improve",
    sub: "Upload answers · AI examiner grades",
    pill: "AI-powered",
    color: "hsl(280,60%,50%)",
    bg: "rgba(139,92,246,0.08)",
    route: "/app/check-improve",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="13 2 13 9 20 9"/>
        <path d="m9 15 2 2 4-4"/>
      </svg>
    ),
  },
];

export default function Intent() {
  const navigate = useNavigate();

  return (
    <MobileShell
      title="What do you want to do?"
      subtitle="Pick one — you can switch anytime"
      showBack
      onBack={() => navigate("/welcome")}
      showNav={false}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MODES.map((m) => (
          <button
            key={m.key}
            className="card-soft tap"
            onClick={() => navigate(m.route)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 16px",
              cursor: "pointer",
              border: `1px solid var(--mob-card-border)`,
              background: "var(--mob-card)",
              color: "var(--mob-fg)",
              textAlign: "left",
            }}
          >
            {/* Icon chip */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: m.bg,
                color: m.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {m.icon}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "var(--mob-fg)" }}>
                  {m.title}
                </span>
                <span
                  className="pill"
                  style={{
                    background: m.bg,
                    color: m.color,
                    fontSize: "0.62rem",
                    padding: "2px 7px",
                    border: "none",
                  }}
                >
                  {m.pill}
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--mob-fg-muted)" }}>{m.sub}</div>
            </div>

            {/* ArrowRight */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mob-fg-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ))}

        {/* Just exploring? info box */}
        <div
          style={{
            marginTop: 8,
            padding: "14px 16px",
            borderRadius: 14,
            border: "1.5px dashed rgba(0,0,0,0.12)",
            background: "var(--mob-muted)",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "0.82rem", marginBottom: 4, color: "var(--mob-fg)" }}>Just exploring?</div>
          <div style={{ fontSize: "0.74rem", color: "var(--mob-fg-muted)", lineHeight: 1.5 }}>
            No sign-up needed to browse Exam Trends or try a practice set.
            Your progress saves once you create a free account.
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
