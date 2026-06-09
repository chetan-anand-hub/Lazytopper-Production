// LEGACY-RETIRED 2026-06-08 - disconnected from product; safe to delete in clean-branch pass.
import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/mobile/MobileShell";
import { useSubjectContext } from "../../hooks/useSubjectContext";

const TILES = [
  {
    key: "sets",
    label: "Practice Sets",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
    color: "var(--mob-success)",
    bg: "var(--mob-success-soft)",
  },
  {
    key: "predicted",
    label: "Predicted Qs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    color: "var(--mob-warning)",
    bg: "var(--mob-warning-soft)",
  },
  {
    key: "timed",
    label: "Timed Practice",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    color: "hsl(217,76%,45%)",
    bg: "rgba(59,130,246,0.08)",
  },
  {
    key: "mock",
    label: "Mock Tests",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="9" y1="21" x2="9" y2="9"/>
      </svg>
    ),
    color: "hsl(280,60%,50%)",
    bg: "rgba(139,92,246,0.08)",
  },
];

export default function PracticeHome() {
  const navigate = useNavigate();
  const { subject } = useSubjectContext();

  function tileRoute(key: string) {
    if (key === "sets")      return `/practice/10/${subject}`;
    if (key === "predicted") return `/highly-probable/10/${subject}`;
    if (key === "timed")     return `/practice/10/${subject}?timed=1`;
    if (key === "mock")      return `/exam-simulation`;
    return "/practice-hub";
  }

  return (
    <MobileShell
      title="Practice"
      subtitle="Choose how you want to train"
      showNav
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Featured: Worksheet Generator ─────────────────────── */}
        <button
          className="tap"
          onClick={() => navigate("/practice/worksheets")}
          style={{
            display: "block",
            width: "100%",
            borderRadius: 20,
            background: "var(--mob-primary)",
            border: "none",
            padding: "20px 18px",
            cursor: "pointer",
            textAlign: "left",
            color: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle glow */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "rgba(34,197,94,0.18)",
              pointerEvents: "none",
            }}
          />

          <span
            className="pill"
            style={{
              background: "rgba(34,197,94,0.2)",
              color: "#22c55e",
              fontSize: "0.62rem",
              marginBottom: 12,
              display: "inline-block",
              border: "none",
            }}
          >
            New · Board-style
          </span>

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.4rem",
              lineHeight: 1.2,
              marginBottom: 6,
            }}
          >
            Worksheet Generator
          </div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", marginBottom: 14, lineHeight: 1.5 }}>
            Custom A–E question mixes, instant PDF, pick your topic and difficulty.
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "8px 16px",
              borderRadius: 10,
              background: "var(--mob-accent)",
              color: "#000",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "0.82rem",
            }}
          >
            Generate worksheet →
          </span>
        </button>

        {/* ── Other mode tiles ─────────────────────────────────── */}
        <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Other practice modes
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {TILES.map((t) => (
            <button
              key={t.key}
              className="card-soft tap"
              onClick={() => navigate(tileRoute(t.key))}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 10,
                padding: "16px 14px",
                cursor: "pointer",
                border: `1px solid var(--mob-card-border)`,
                background: "var(--mob-card)",
                color: "var(--mob-fg)",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: t.bg,
                  color: t.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {t.icon}
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--mob-fg)" }}>{t.label}</div>
            </button>
          ))}
        </div>

        {/* ── Recent worksheets info card ──────────────────────── */}
        <div className="card-soft" style={{ padding: "14px 16px" }}>
          <div style={{ fontWeight: 600, fontSize: "0.82rem", marginBottom: 4, color: "var(--mob-fg)" }}>Recent worksheets</div>
          <div style={{ fontSize: "0.74rem", color: "var(--mob-fg-muted)", lineHeight: 1.5 }}>
            Your generated worksheets appear here after your first download.
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
