import { Link } from "react-router-dom";

/**
 * MistakeIntelCard — sidebar block in the locked desktop baseline AppShell.
 *
 * Source of truth (locked desktop baseline repo):
 *   chetan-anand-hub/lazytopper-desktop-view-e1fc5df7
 *   src/components/lt/AppShell.tsx (sidebar Mistake Intel block)
 *
 * This is the SIDEBAR variant (small accent block at the bottom of the
 * sidebar). The desktop Home page renders a separate, larger Mistake
 * Intelligence card in its content composition — that one lives in
 * pages/desktop/DesktopHome.tsx.
 *
 * Phase 1 scope: visual parity only. Numbers shown are baseline copy;
 * wiring to real mistake-intel data is reserved for later desktop phases.
 */
export function MistakeIntelCard() {
  return (
    <div
      style={{
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#22c55e",
        }}
      >
        {/* Sparkles icon (inline SVG — production has no lucide-react) */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
        </svg>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Mistake Intel
        </span>
      </div>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.45,
          color: "rgba(255,255,255,0.85)",
          margin: "8px 0 0",
        }}
      >
        You lose <span style={{ color: "#fff", fontWeight: 700 }}>38% marks</span>{" "}
        to silly errors in Maths.
      </p>
      <Link
        to="/me"
        style={{
          marginTop: 10,
          display: "inline-block",
          fontSize: 12,
          color: "#22c55e",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        See where →
      </Link>
    </div>
  );
}
