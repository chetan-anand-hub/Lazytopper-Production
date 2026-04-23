import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * DesktopMePage — locked desktop baseline Me / Progress surface.
 *
 * Source of truth: chetan-anand-hub/lazytopper-desktop-view-e1fc5df7
 *   src/pages/Me.tsx
 *
 * Composition (mirrors the locked baseline exactly):
 *
 *   1. PageHeader with back affordance, eyebrow "Me · Progress", title
 *      "Your study mirror.", description, and two header actions:
 *      "Start practice" (outline) + "Open Exam Trends" (accent CTA).
 *
 *   2. Top stats — 4-column grid of stat cards:
 *        - Avg. score (last 5 mocks)  72/100  +6
 *        - Accuracy this week         78%     +4%
 *        - Time on practice           9h 24m  +1h 12m
 *        - Mistake rate               22%    −5%
 *      Each card has a small leading glyph + label, large display value,
 *      and a coloured trend chip.
 *
 *   3. 12-col grid:
 *        LEFT (col-7):
 *          - "Where you lose marks" card with "Mistake breakdown · last
 *            30 days" subtitle + "Silly errors leading" warning chip.
 *          - 4 mistake bars (Silly / Conceptual / Calculation /
 *            Presentation) each with label, % of lost marks, coloured bar,
 *            and short note.
 *          - Recommended-next-move strip with sparkles glyph + "Run set"
 *            button.
 *        RIGHT (col-5):
 *          - "Weak areas" card with subtitle "Topics dragging your score"
 *            and 4 weak-topic rows (name + subject + accuracy % + arrow).
 *        FULL (col-12):
 *          - "Recent activity" card with 2-column grid of 6 activity rows
 *            (title + meta + relative timestamp + accent dot).
 *
 * Reuse — every CTA wires to existing production destinations:
 *   - "Start practice"             -> /practice
 *   - "Open Exam Trends"           -> /exam-trends
 *   - "Run set" (recommendation)   -> /practice
 *   - Weak-area row                -> /topic-hub
 *   - Activity rows                -> /practice, /practice/worksheets,
 *                                     /check-improve, /topic-hub
 *
 * The illustrative stat values, mistake breakdown, weak areas, and recent
 * activity entries mirror the locked baseline content exactly. This is a
 * desktop preview surface — the analytics backend / progress-calculation
 * systems are NOT touched. Mobile /me renders unchanged at <1024px.
 *
 * Production constraints respected:
 *   - Inline styles only (no Tailwind, no shadcn classes).
 *   - Inline SVG only (no lucide-react).
 *   - Light theme tokens shared with prior approved desktop pages.
 */

const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";
const MUTED_BG = "hsl(220, 20%, 97%)";
const SECONDARY_BG = "hsl(150, 35%, 94%)";

const ACCENT_FG = "hsl(152, 55%, 35%)";
const WARNING_FG = "hsl(35, 80%, 35%)";
const WARNING_SOFT = "hsl(43, 90%, 92%)";
const DANGER_FG = "hsl(0, 70%, 45%)";
const INFO_FG = "hsl(212, 70%, 42%)";

const FONT_DISPLAY =
  '"Source Serif Pro", "Source Serif 4", Georgia, "Times New Roman", serif';
const FONT_SANS =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/* ────────────────── inline SVG glyphs ────────────────── */

const glyphProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const AwardGlyph = () => (
  <svg {...glyphProps} width={16} height={16}>
    <circle cx="12" cy="8" r="6" />
    <polyline points="8.21 13.89 7 22 12 19 17 22 15.79 13.88" />
  </svg>
);

const TargetGlyph = () => (
  <svg {...glyphProps} width={16} height={16}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const ClockGlyph = () => (
  <svg {...glyphProps} width={16} height={16}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const TrendingUpGlyph = ({ size = 16 }: { size?: number }) => (
  <svg {...glyphProps} width={size} height={size}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const SparklesGlyph = () => (
  <svg {...glyphProps} width={16} height={16}>
    <path d="M12 3l1.9 4.6L18 9l-4.1 1.4L12 15l-1.9-4.6L6 9l4.1-1.4z" />
    <path d="M19 14l.8 1.9L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" />
  </svg>
);

const AlertCircleGlyph = () => (
  <svg {...glyphProps} width={12} height={12}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const ArrowRightGlyph = () => (
  <svg {...glyphProps} width={16} height={16}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const ArrowLeftGlyph = () => (
  <svg {...glyphProps} width={14} height={14}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

/* ────────────────── shared style tokens ────────────────── */

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

const sectionEyebrow: React.CSSProperties = {
  fontFamily: FONT_SANS,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: TEXT_MUTED,
};

const buttonOutline: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: CARD_BG,
  color: TEXT_FG,
  fontFamily: FONT_SANS,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
};

const buttonAccent: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  border: `1px solid ${PRIMARY_GREEN}`,
  background: PRIMARY_GREEN,
  color: "#ffffff",
  fontFamily: FONT_SANS,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
};

const buttonSmallDark: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 8,
  border: `1px solid ${TEXT_FG}`,
  background: TEXT_FG,
  color: "#ffffff",
  fontFamily: FONT_SANS,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  flexShrink: 0,
};

/* ────────────────── data ────────────────── */

type Stat = {
  Icon: React.FC;
  label: string;
  value: string;
  trend: string;
  up: boolean;
};

const STATS: Stat[] = [
  { Icon: AwardGlyph, label: "Avg. score (last 5 mocks)", value: "72/100", trend: "+6", up: true },
  { Icon: TargetGlyph, label: "Accuracy this week", value: "78%", trend: "+4%", up: true },
  { Icon: ClockGlyph, label: "Time on practice", value: "9h 24m", trend: "+1h 12m", up: true },
  { Icon: () => <TrendingUpGlyph size={16} />, label: "Mistake rate", value: "22%", trend: "−5%", up: true },
];

const MISTAKE_BARS = [
  { label: "Silly", value: 38, color: DANGER_FG, note: "Missed units, sign mistakes, skipped 'therefore'" },
  { label: "Conceptual", value: 26, color: WARNING_FG, note: "Mixing up formulas in trigonometry" },
  { label: "Calculation", value: 22, color: INFO_FG, note: "Decimal & fraction handling" },
  { label: "Presentation", value: 14, color: ACCENT_FG, note: "Diagrams unlabelled, working unclear" },
];

const WEAK_AREAS = [
  { name: "Trigonometric Identities", subject: "Maths", accuracy: 48 },
  { name: "Electricity · Resistance", subject: "Science", accuracy: 54 },
  { name: "Quadratic word problems", subject: "Maths", accuracy: 58 },
  { name: "Heredity · Mendel's laws", subject: "Science", accuracy: 61 },
];

const RECENT_ACTIVITY = [
  { title: "Practice Set · Quadratic Equations", meta: "9 / 12 correct", time: "Today · 7:42 PM", to: "/practice-hub" },
  { title: "Worksheet generated · Maths Preset B", meta: "20 Qs · downloaded", time: "Today · 6:10 PM", to: "/practice/worksheets" },
  { title: "Answer uploaded · Trigonometry Q4", meta: "Graded 3/5", time: "Yesterday", to: "/check-improve" },
  { title: "Mock Test 03 · Maths", meta: "Score 64/80", time: "2 days ago", to: "/practice-hub" },
  { title: "Topic Hub · Light", meta: "Watched 3 lessons", time: "3 days ago", to: "/topic-hub" },
  { title: "Predicted Qs · Electricity", meta: "5 attempted", time: "4 days ago", to: "/practice-hub" },
];

/* ────────────────── page ────────────────── */

const DesktopMePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        maxWidth: 1500,
        margin: "0 auto",
        padding: "32px 32px 64px",
        fontFamily: FONT_SANS,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px 4px 6px",
              marginBottom: 10,
              border: "none",
              background: "transparent",
              color: TEXT_MUTED,
              fontFamily: FONT_SANS,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              borderRadius: 6,
            }}
          >
            <ArrowLeftGlyph /> Back
          </button>
          <div style={{ ...sectionEyebrow, marginBottom: 8 }}>Me · Progress</div>
          <h1
            style={{
              margin: 0,
              fontFamily: FONT_DISPLAY,
              fontSize: 30,
              fontWeight: 600,
              lineHeight: 1.2,
              color: TEXT_FG,
            }}
          >
            Your study mirror.
          </h1>
          <p
            style={{
              margin: "10px 0 0",
              fontFamily: FONT_SANS,
              fontSize: 14,
              lineHeight: 1.55,
              color: TEXT_MUTED,
              maxWidth: 720,
            }}
          >
            A clear-eyed view of what's improving, what's stuck, and what to do
            next.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0, paddingTop: 4 }}>
          <button
            type="button"
            style={buttonOutline}
            onClick={() => navigate("/practice-hub")}
          >
            Start practice
          </button>
          <button
            type="button"
            style={buttonAccent}
            onClick={() => navigate("/exam-trends")}
          >
            Open Exam Trends
          </button>
        </div>
      </div>

      {/* Top stats — 4-col */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {STATS.map((s, i) => {
          const Icon = s.Icon;
          return (
            <div key={i} style={{ ...cardStyle, padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: TEXT_MUTED,
                }}
              >
                <Icon />
                <span style={{ fontSize: 12 }}>{s.label}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  marginTop: 12,
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 28,
                    fontWeight: 600,
                    color: TEXT_FG,
                    lineHeight: 1.1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: s.up ? ACCENT_FG : DANGER_FG,
                    flexShrink: 0,
                  }}
                >
                  {s.trend}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 12-col grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)",
          gap: 24,
        }}
      >
        {/* LEFT — Where you lose marks */}
        <div style={{ ...cardStyle, padding: 24, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={sectionEyebrow}>Where You Lose Marks</div>
              <h2
                style={{
                  margin: "4px 0 0",
                  fontFamily: FONT_DISPLAY,
                  fontSize: 20,
                  fontWeight: 600,
                  color: TEXT_FG,
                  lineHeight: 1.3,
                }}
              >
                Mistake breakdown · last 30 days
              </h2>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 999,
                background: WARNING_SOFT,
                color: WARNING_FG,
                fontSize: 11,
                fontWeight: 600,
                border: `1px solid ${WARNING_SOFT}`,
                flexShrink: 0,
              }}
            >
              <AlertCircleGlyph /> Silly errors leading
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {MISTAKE_BARS.map((b) => (
              <div key={b.label}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontWeight: 600, color: TEXT_FG }}>
                    {b.label}
                  </span>
                  <span style={{ color: TEXT_MUTED }}>
                    {b.value}% of lost marks
                  </span>
                </div>
                <div
                  style={{
                    height: 10,
                    background: MUTED_BG,
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${b.value * 2}%`,
                      background: b.color,
                      borderRadius: 999,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: TEXT_MUTED,
                    marginTop: 6,
                  }}
                >
                  {b.note}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 24,
              borderRadius: 10,
              background: SECONDARY_BG,
              padding: 16,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div style={{ marginTop: 2, color: ACCENT_FG, flexShrink: 0 }}>
              <SparklesGlyph />
            </div>
            <div style={{ flex: 1, fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: TEXT_FG }}>
                Recommended next move
              </div>
              <div
                style={{
                  color: TEXT_MUTED,
                  fontSize: 12,
                  marginTop: 2,
                  lineHeight: 1.5,
                }}
              >
                10-Q targeted set on numerical questions with units. Estimated
                +4 marks lift.
              </div>
            </div>
            <button
              type="button"
              style={buttonSmallDark}
              onClick={() => navigate("/practice-hub")}
            >
              Run set
            </button>
          </div>
        </div>

        {/* RIGHT — Weak areas */}
        <div style={{ ...cardStyle, padding: 24, minWidth: 0 }}>
          <div style={sectionEyebrow}>Weak Areas</div>
          <h2
            style={{
              margin: "4px 0 20px",
              fontFamily: FONT_DISPLAY,
              fontSize: 20,
              fontWeight: 600,
              color: TEXT_FG,
              lineHeight: 1.3,
            }}
          >
            Topics dragging your score
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {WEAK_AREAS.map((w) => (
              <button
                key={w.name}
                type="button"
                onClick={() => navigate("/topic-hub")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: 12,
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: FONT_SANS,
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = MUTED_BG;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: TEXT_FG,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {w.name}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                    {w.subject}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: DANGER_FG,
                    }}
                  >
                    {w.accuracy}%
                  </div>
                  <div style={{ fontSize: 10, color: TEXT_MUTED }}>accuracy</div>
                </div>
                <div style={{ color: TEXT_MUTED, flexShrink: 0 }}>
                  <ArrowRightGlyph />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* FULL — Recent activity */}
        <div
          style={{
            ...cardStyle,
            padding: 24,
            gridColumn: "1 / -1",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              gap: 12,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: FONT_DISPLAY,
                fontSize: 20,
                fontWeight: 600,
                color: TEXT_FG,
              }}
            >
              Recent activity
            </h2>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                background: "transparent",
                border: "none",
                color: TEXT_MUTED,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: FONT_SANS,
              }}
            >
              Back to home →
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {RECENT_ACTIVITY.map((a, i) => (
              <button
                key={i}
                type="button"
                onClick={() => navigate(a.to)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: 12,
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: FONT_SANS,
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = MUTED_BG;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    height: 8,
                    width: 8,
                    borderRadius: "50%",
                    background: PRIMARY_GREEN,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: TEXT_FG,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {a.title}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                    {a.meta}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: TEXT_MUTED,
                    flexShrink: 0,
                  }}
                >
                  {a.time}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopMePage;
