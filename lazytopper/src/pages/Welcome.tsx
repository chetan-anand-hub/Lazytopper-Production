import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div
      className="dark-page animate-float-up"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "var(--bg)",
        paddingBottom: 40,
        boxSizing: "border-box",
      }}
    >
      {/* ── Hero panel ──────────────────────────────────────────── */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          padding: "56px 24px 48px",
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Background glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, hsla(142,71%,45%,0.16) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Logo chip */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "linear-gradient(135deg, hsl(142,71%,45%), #3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: 18,
            color: "#000",
            marginBottom: 20,
            boxShadow: "0 0 20px hsla(142,71%,45%,0.35)",
          }}
        >
          L
        </div>

        {/* CBSE pill */}
        <div style={{ marginBottom: 20 }}>
          <span
            className="pill"
            style={{
              background: "hsla(142,71%,45%,0.14)",
              color: "hsl(142,71%,55%)",
              border: "1px solid hsla(142,71%,45%,0.28)",
              fontSize: "0.68rem",
            }}
          >
            CBSE Class 10 · Board Exam Prep
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.9rem, 8vw, 2.5rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 16,
            color: "var(--text)",
          }}
        >
          Stop studying everything.{" "}
          <span style={{ color: "hsl(142,71%,55%)" }}>Crack what actually comes.</span>
        </h1>

        <p
          style={{
            fontSize: "0.93rem",
            color: "var(--text-muted)",
            lineHeight: 1.65,
            marginBottom: 32,
            maxWidth: 340,
          }}
        >
          AI-powered board prep trained on 9 years of CBSE papers —
          predicts real questions, grades your handwriting, and targets your weak spots.
        </p>

        {/* Primary CTA */}
        <button
          onClick={() => navigate("/app/intent")}
          style={{
            display: "block",
            width: "100%",
            height: 56,
            borderRadius: 16,
            border: "none",
            background: "hsl(142,71%,45%)",
            color: "#000",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "1.05rem",
            cursor: "pointer",
            boxShadow: "0 0 32px hsla(142,71%,45%,0.3)",
            marginBottom: 12,
          }}
        >
          Start preparing →
        </button>

        {/* Secondary CTA */}
        <button
          onClick={() => navigate("/app/intent")}
          style={{
            display: "block",
            width: "100%",
            height: 44,
            borderRadius: 12,
            border: "1px dashed hsla(255,100%,100%,0.12)",
            background: "transparent",
            color: "var(--text-muted)",
            fontFamily: "var(--font-body)",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          Explore without signing up →
        </button>
      </div>

      {/* ── 3-stat grid ──────────────────────────────────────────── */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: 24,
          boxSizing: "border-box",
        }}
      >
        {[
          { value: "12k+", label: "students prep" },
          { value: "9 yrs", label: "board data" },
          { value: "A–E", label: "all sections" },
        ].map(({ value, label }) => (
          <div
            key={label}
            className="card-soft"
            style={{ padding: "14px 10px", textAlign: "center" }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.25rem",
                color: "hsl(142,71%,55%)",
                marginBottom: 2,
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Preview cards ──────────────────────────────────────────── */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 24,
          boxSizing: "border-box",
        }}
      >
        <div className="card-soft tap" style={{ padding: "16px 14px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "hsla(142,71%,45%,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(142,71%,55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>Smart Practice</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>Board-style questions by chapter</div>
        </div>

        <div className="card-soft tap" style={{ padding: "16px 14px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "hsla(217,91%,60%,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(217,91%,60%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>Exam Trends</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>See what questions repeat</div>
        </div>
      </div>

      {/* ── How it works panel ──────────────────────────────────────── */}
      <div
        style={{
          width: "calc(100% - 48px)",
          maxWidth: 432,
          padding: "24px 20px",
          borderRadius: 20,
          background: "var(--bg-card)",
          border: "1px solid hsla(255,100%,100%,0.07)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1rem",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          How it works
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            { n: "1", t: "Spot high-probability chapters", d: "Browse 9 years of board trends to find what actually comes." },
            { n: "2", t: "Practice & generate worksheets", d: "Board-style questions graded A–E, auto-PDF in one tap." },
            { n: "3", t: "Upload your answers", d: "AI examiner checks your handwriting against the CBSE marking scheme." },
          ].map(({ n, t, d }) => (
            <div key={n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div
                style={{
                  minWidth: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "hsl(142,71%,45%)",
                  color: "#000",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {n}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 3 }}>{t}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
