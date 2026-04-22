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
    color: "hsl(142,71%,55%)",
    bg: "hsla(142,71%,45%,0.13)",
  },
  {
    key: "predicted",
    label: "Predicted Qs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    color: "hsl(38,92%,50%)",
    bg: "hsla(38,92%,50%,0.13)",
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
    color: "hsl(217,91%,60%)",
    bg: "hsla(217,91%,60%,0.13)",
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
    color: "hsl(280,70%,65%)",
    bg: "hsla(280,70%,65%,0.13)",
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
    return "/app/practice";
  }

  return (
    <MobileShell
      title="Practice"
      subtitle="Choose how you want to train"
      showNav
    >
      <div className="screen-pad animate-float-up">

        {/* ── Featured: Worksheet Generator ──────────────────────── */}
        <button
          className="tap shadow-elev"
          onClick={() => navigate("/app/practice/worksheets")}
          style={{
            display: "block",
            width: "100%",
            borderRadius: 20,
            background: "var(--bg-card)",
            border: "1px solid hsla(255,100%,100%,0.08)",
            padding: "20px 18px",
            cursor: "pointer",
            textAlign: "left",
            color: "var(--text)",
            position: "relative",
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          {/* Glow accent */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "radial-gradient(circle, hsla(142,71%,45%,0.25) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <span
            className="pill"
            style={{
              background: "hsla(142,71%,45%,0.16)",
              color: "hsl(142,71%,55%)",
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
              marginBottom: 8,
            }}
          >
            Worksheet Generator
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
            Custom A–E question mixes, instant PDF, pick your topic and difficulty.
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "8px 16px",
              borderRadius: 10,
              background: "hsl(142,71%,45%)",
              color: "#000",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "0.82rem",
            }}
          >
            Generate worksheet →
          </span>
        </button>

        {/* ── Other mode tiles ─────────────────────────────────────── */}
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 12, textTransform: "uppercase" }}>
          Other practice modes
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 20,
          }}
        >
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
                border: "none",
                background: "var(--bg-card)",
                color: "var(--text)",
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
              <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>{t.label}</div>
            </button>
          ))}
        </div>

        {/* ── Recent worksheets info card ─────────────────────────── */}
        <div
          className="card-soft"
          style={{ padding: "14px 16px" }}
        >
          <div style={{ fontWeight: 600, fontSize: "0.82rem", marginBottom: 4 }}>Recent worksheets</div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Your generated worksheets appear here after your first download.
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
