import React from "react";
import { useNavigate } from "react-router-dom";
import { useSubjectContext } from "../../hooks/useSubjectContext";

/**
 * DesktopPracticePage — locked desktop baseline Practice surface.
 *
 * Source of truth: chetan-anand-hub/lazytopper-desktop-view-e1fc5df7
 *   src/pages/Practice.tsx
 *
 * Composition (mirrors the locked baseline exactly):
 *   1. PageHeader  — eyebrow "Practice" / title "Build, drill, simulate." /
 *      description "Five practice modes — pick the one that matches your goal tonight."
 *   2. Featured Worksheet Generator hero — large card spanning the workspace
 *      width, gradient backdrop, large icon glyph, eyebrow chip, title,
 *      description, and a dark "Open generator →" call-to-action button.
 *   3. Two-column grid of four supporting practice mode cards:
 *        Practice Sets · Predicted Questions · Timed Practice · Mock Tests
 *
 * Routing reuse — wires CTAs to the existing production destinations exactly
 * as the mobile PracticeHome already does. No worksheet logic, no
 * data-hook, no mobile route is changed.
 *
 * Production constraints:
 *   - Inline styles only (no Tailwind, no shadcn classes).
 *   - Inline SVG only (no lucide-react).
 *   - Light theme tokens shared with DesktopShell + DesktopHome.
 */

const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const PRIMARY_GREEN_SOFT = "hsl(152, 55%, 95%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";
const ACCENT_SOFT = "hsl(43, 90%, 92%)";
const ACCENT_FG = "hsl(35, 80%, 35%)";

const FONT_DISPLAY =
  '"Fraunces", "Source Serif Pro", Georgia, "Times New Roman", serif';
const FONT_BODY =
  '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

// ── Inline SVG glyphs ──────────────────────────────────────────────────────
const IconStroke: React.CSSProperties = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function IconWorksheet({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}
function IconLayers({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function IconSparkles({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 15.8l-1.8-4.6L6 9.4l4.2-1.8z" />
      <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z" />
    </svg>
  );
}
function IconTimer({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <circle cx="12" cy="13" r="8" />
      <polyline points="12 9 12 13 15 15" />
      <line x1="9" y1="2" x2="15" y2="2" />
    </svg>
  );
}
function IconClipboard({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <rect x="6" y="4" width="12" height="18" rx="2" />
      <path d="M9 4V3a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
      <polyline points="9 13 11 15 15 11" />
    </svg>
  );
}
function IconArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ── PageHeader (locked baseline composition) ───────────────────────────────
function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: PRIMARY_GREEN,
          marginBottom: 12,
        }}
      >
        {eyebrow}
      </div>
      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: "2.4rem",
          fontWeight: 600,
          lineHeight: 1.1,
          color: TEXT_FG,
          margin: 0,
          marginBottom: 10,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.6,
          color: TEXT_MUTED,
          margin: 0,
          maxWidth: 720,
        }}
      >
        {description}
      </p>
    </div>
  );
}

// ── Supporting card ───────────────────────────────────────────────────────
type SupportingCard = {
  key: string;
  title: string;
  desc: string;
  cta: string;
  icon: React.ReactElement;
  onActivate: () => void;
};

function SupportingCard({ card }: { card: SupportingCard }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={card.onActivate}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        textAlign: "left",
        cursor: "pointer",
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        transition:
          "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hover
          ? "0 8px 24px -12px rgba(15, 23, 42, 0.18)"
          : "0 1px 2px rgba(15, 23, 42, 0.04)",
        borderColor: hover ? "hsl(220, 18%, 80%)" : BORDER,
        fontFamily: FONT_BODY,
        color: TEXT_FG,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: PRIMARY_GREEN_SOFT,
            color: PRIMARY_GREEN,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {card.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "1.18rem",
              fontWeight: 600,
              color: TEXT_FG,
              margin: 0,
              marginBottom: 6,
              letterSpacing: "-0.005em",
            }}
          >
            {card.title}
          </h3>
          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.55,
              color: TEXT_MUTED,
              margin: 0,
              marginBottom: 16,
            }}
          >
            {card.desc}
          </p>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.85rem",
              fontWeight: 600,
              color: PRIMARY_GREEN,
            }}
          >
            {card.cta}
            <IconArrowRight />
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Featured Worksheet Generator hero ─────────────────────────────────────
function WorksheetHero({ onOpen }: { onOpen: () => void }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      style={{
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, hsl(152, 55%, 96%) 0%, #ffffff 55%, #ffffff 100%)",
        border: `1px solid ${BORDER}`,
        borderRadius: 18,
        padding: "32px 36px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        gap: 28,
        transition:
          "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hover
          ? "0 18px 40px -22px rgba(15, 23, 42, 0.25)"
          : "0 2px 6px rgba(15, 23, 42, 0.04)",
        borderColor: hover ? "hsl(152, 40%, 78%)" : BORDER,
        fontFamily: FONT_BODY,
      }}
    >
      {/* Soft glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -60,
          right: -40,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, hsla(152, 55%, 45%, 0.10) 0%, hsla(152, 55%, 45%, 0) 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Large icon block */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          color: PRIMARY_GREEN,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
        }}
      >
        <IconWorksheet />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "inline-block",
            background: ACCENT_SOFT,
            color: ACCENT_FG,
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            marginBottom: 10,
          }}
        >
          ★ First-class path
        </span>
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "1.75rem",
            fontWeight: 600,
            color: TEXT_FG,
            margin: 0,
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          Worksheet Generator
        </h2>
        <p
          style={{
            fontSize: "0.95rem",
            lineHeight: 1.55,
            color: TEXT_MUTED,
            margin: 0,
            maxWidth: 620,
          }}
        >
          Mix MCQ / short / long, assertion-reasoning, competency-based and
          case-based. Match A/B/C/D/E board pattern. Download as PDF.
        </p>
      </div>

      {/* Dark CTA button */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 20px",
          borderRadius: 12,
          background: TEXT_FG,
          color: "#ffffff",
          fontSize: "0.92rem",
          fontWeight: 600,
          flexShrink: 0,
          boxShadow: "0 4px 12px -4px rgba(15, 23, 42, 0.3)",
        }}
      >
        Open generator
        <IconArrowRight />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function DesktopPracticePage() {
  const navigate = useNavigate();
  const { grade, subject } = useSubjectContext();

  // Reuse production routes, exactly as mobile PracticeHome wires them.
  const goWorksheets = () => navigate("/practice/worksheets");
  const goPracticeSets = () => navigate(`/practice/${grade}/${subject}`);
  const goPredicted = () => navigate(`/highly-probable/${grade}/${subject}`);
  const goTimed = () => navigate(`/practice/${grade}/${subject}?timed=1`);
  const goMock = () => navigate("/exam-simulation");

  const supportingCards: SupportingCard[] = [
    {
      key: "sets",
      title: "Practice Sets",
      desc: "Curated 10–20 question sets by chapter and difficulty.",
      cta: "Start a set",
      icon: <IconLayers />,
      onActivate: goPracticeSets,
    },
    {
      key: "predicted",
      title: "Predicted Questions",
      desc: "Most-likely board questions for 2026, ranked by probability.",
      cta: "View predicted Qs",
      icon: <IconSparkles />,
      onActivate: goPredicted,
    },
    {
      key: "timed",
      title: "Timed Practice",
      desc: "Beat the clock. Builds exam-day pace and pressure tolerance.",
      cta: "Start timer",
      icon: <IconTimer />,
      onActivate: goTimed,
    },
    {
      key: "mock",
      title: "Mock Tests",
      desc: "Full-length board pattern. Auto-graded with mistake breakdown.",
      cta: "Take a mock",
      icon: <IconClipboard />,
      onActivate: goMock,
    },
  ];

  return (
    <div
      style={{
        padding: "40px 32px 56px",
        maxWidth: 1180,
        margin: "0 auto",
        fontFamily: FONT_BODY,
        color: TEXT_FG,
      }}
    >
      <PageHeader
        eyebrow="Practice"
        title="Build, drill, simulate."
        description="Five practice modes — pick the one that matches your goal tonight."
      />

      <WorksheetHero onOpen={goWorksheets} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 20,
        }}
      >
        {supportingCards.map((c) => (
          <SupportingCard key={c.key} card={c} />
        ))}
      </div>
    </div>
  );
}
