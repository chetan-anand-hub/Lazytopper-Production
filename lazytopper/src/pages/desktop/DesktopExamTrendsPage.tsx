import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * DesktopExamTrendsPage — locked desktop baseline Exam Trends surface.
 *
 * Source of truth: chetan-anand-hub/lazytopper-desktop-view-e1fc5df7
 *   src/pages/ExamTrends.tsx
 *
 * Composition (mirrors the locked baseline exactly):
 *   1. PageHeader  — eyebrow "Exam Trends · Class 10 · 2026 board" /
 *      title "Priority board" /
 *      description "Built from 10 years of CBSE board papers + 2026 sample paper.
 *      Click any topic to open its Topic Hub."
 *   2. Three-column priority board:
 *        - Must Crack    (danger / red accent)
 *        - High ROI      (warning / amber accent)
 *        - Good to do    (info / blue accent)
 *      Each column header has an inline glyph, label, sub-line, and a
 *      count chip. Each column body is a vertical stack of topic cards
 *      with a strong left border in the column accent colour, subject
 *      eyebrow, topic name, "<n>% likely" rating on the right, marks
 *      footer, and "Open Topic Hub →" affordance.
 *
 * Routing reuse — topic cards link to the existing production
 * /topic-hub/:topicName route (the same destination the mobile baseline
 * uses). No prediction/data logic is touched. Topic Hub is intentionally
 * NOT shell-wrapped in this phase.
 *
 * Production constraints:
 *   - Inline styles only (no Tailwind, no shadcn classes).
 *   - Inline SVG only (no lucide-react).
 *   - Light theme tokens shared with DesktopShell + DesktopHome +
 *     DesktopPracticePage.
 */

const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";

const DANGER_FG = "hsl(0, 70%, 45%)";
const DANGER_SOFT = "hsl(0, 80%, 96%)";
const WARNING_FG = "hsl(35, 80%, 35%)";
const WARNING_SOFT = "hsl(43, 90%, 92%)";
const INFO_FG = "hsl(212, 70%, 42%)";
const INFO_SOFT = "hsl(212, 80%, 95%)";

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

function IconFlame({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M12 2c1 4 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-5 2 1 3 0 3-4z" />
      <path d="M12 22a6 6 0 0 0 6-6c0-3-2-4-3-6 0 3-2 4-3 4-1 0-2-1-2-3-2 2-4 3-4 6a6 6 0 0 0 6 5z" />
    </svg>
  );
}
function IconTrendingUp({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </svg>
  );
}
function IconSparkle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 15.8l-1.8-4.6L6 9.4l4.2-1.8z" />
      <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z" />
    </svg>
  );
}
function IconArrowRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ── PageHeader (matches DesktopHome / DesktopPracticePage) ─────────────────
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
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 10px",
          borderRadius: 999,
          background: "hsl(152, 55%, 95%)",
          color: PRIMARY_GREEN,
          fontFamily: FONT_BODY,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </div>
      <h1
        style={{
          margin: "14px 0 10px 0",
          fontFamily: FONT_DISPLAY,
          fontSize: 36,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: TEXT_FG,
          lineHeight: 1.1,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          margin: 0,
          maxWidth: 720,
          fontFamily: FONT_BODY,
          fontSize: 15,
          lineHeight: 1.55,
          color: TEXT_MUTED,
        }}
      >
        {description}
      </p>
    </div>
  );
}

// ── Locked baseline content (mirrors lazytopper-desktop-view-e1fc5df7) ─────
type Topic = {
  name: string;
  marks: string;
  prob: number;
  sub: string;
};

type Column = {
  id: "must" | "high" | "good";
  label: string;
  sub: string;
  Icon: React.FC<{ size?: number }>;
  accentFg: string;
  accentSoft: string;
  topics: Topic[];
};

const COLUMNS: Column[] = [
  {
    id: "must",
    label: "Must Crack",
    sub: "Appears in 9/10 board years. Don't skip.",
    Icon: IconFlame,
    accentFg: DANGER_FG,
    accentSoft: DANGER_SOFT,
    topics: [
      { name: "Quadratic Equations", marks: "12-14 marks", prob: 96, sub: "Maths" },
      { name: "Trigonometry & Heights", marks: "10-12 marks", prob: 94, sub: "Maths" },
      { name: "Light – Reflection & Refraction", marks: "8-10 marks", prob: 93, sub: "Science" },
      { name: "Electricity", marks: "10 marks", prob: 92, sub: "Science" },
    ],
  },
  {
    id: "high",
    label: "High ROI",
    sub: "Short syllabus, big mark return.",
    Icon: IconTrendingUp,
    accentFg: WARNING_FG,
    accentSoft: WARNING_SOFT,
    topics: [
      { name: "Probability", marks: "5-6 marks", prob: 81, sub: "Maths" },
      { name: "Statistics", marks: "5-6 marks", prob: 78, sub: "Maths" },
      { name: "Acids, Bases & Salts", marks: "6-8 marks", prob: 76, sub: "Science" },
      { name: "Heredity", marks: "4-5 marks", prob: 72, sub: "Science" },
    ],
  },
  {
    id: "good",
    label: "Good to do",
    sub: "Lower probability, polish-level.",
    Icon: IconSparkle,
    accentFg: INFO_FG,
    accentSoft: INFO_SOFT,
    topics: [
      { name: "Coordinate Geometry", marks: "3-4 marks", prob: 58, sub: "Maths" },
      { name: "Surface Areas & Volumes", marks: "3 marks", prob: 54, sub: "Maths" },
      { name: "Carbon & Compounds", marks: "4 marks", prob: 51, sub: "Science" },
      { name: "Our Environment", marks: "2-3 marks", prob: 42, sub: "Science" },
    ],
  },
];

// ── Topic card ─────────────────────────────────────────────────────────────
function TopicCard({
  topic,
  accentFg,
  onOpen,
}: {
  topic: Topic;
  accentFg: string;
  onOpen: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderLeft: `4px solid ${accentFg}`,
        borderRadius: 14,
        padding: "18px 20px",
        cursor: "pointer",
        boxShadow: hover
          ? "0 8px 22px -12px rgba(15, 23, 42, 0.18)"
          : "0 1px 2px rgba(15, 23, 42, 0.04)",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        transition:
          "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        font: "inherit",
        color: "inherit",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: TEXT_MUTED,
            }}
          >
            {topic.sub}
          </div>
          <h4
            style={{
              margin: "6px 0 0 0",
              fontFamily: FONT_DISPLAY,
              fontSize: 16,
              fontWeight: 600,
              lineHeight: 1.3,
              color: TEXT_FG,
            }}
          >
            {topic.name}
          </h4>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 16,
              fontWeight: 700,
              color: TEXT_FG,
              lineHeight: 1,
            }}
          >
            {topic.prob}%
          </div>
          <div
            style={{
              marginTop: 2,
              fontFamily: FONT_BODY,
              fontSize: 10,
              color: TEXT_MUTED,
            }}
          >
            likely
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 16,
        }}
      >
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 12,
            color: TEXT_MUTED,
          }}
        >
          {topic.marks}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: hover ? 8 : 6,
            fontFamily: FONT_BODY,
            fontSize: 12,
            fontWeight: 600,
            color: PRIMARY_GREEN,
            transition: "gap 160ms ease",
          }}
        >
          Open Topic Hub <IconArrowRight />
        </span>
      </div>
    </button>
  );
}

// ── Column ─────────────────────────────────────────────────────────────────
function PriorityColumn({
  column,
  onOpenTopic,
}: {
  column: Column;
  onOpenTopic: (t: Topic) => void;
}) {
  const Icon = column.Icon;
  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 0,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: TEXT_FG,
          }}
        >
          <Icon size={16} />
          <h3
            style={{
              margin: 0,
              fontFamily: FONT_DISPLAY,
              fontSize: 18,
              fontWeight: 600,
              color: TEXT_FG,
              letterSpacing: "-0.005em",
            }}
          >
            {column.label}
          </h3>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 28,
            height: 22,
            padding: "0 8px",
            borderRadius: 999,
            background: column.accentSoft,
            color: column.accentFg,
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {column.topics.length}
        </span>
      </header>

      <p
        style={{
          margin: "0 4px",
          fontFamily: FONT_BODY,
          fontSize: 12,
          color: TEXT_MUTED,
        }}
      >
        {column.sub}
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 4,
        }}
      >
        {column.topics.map((topic) => (
          <TopicCard
            key={topic.name}
            topic={topic}
            accentFg={column.accentFg}
            onOpen={() => onOpenTopic(topic)}
          />
        ))}
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function DesktopExamTrendsPage() {
  const navigate = useNavigate();

  const openTopic = (topic: Topic) => {
    // Reuse existing production destination — the same Topic Hub route the
    // mobile baseline already uses. Topic Hub is intentionally NOT
    // shell-wrapped in this phase; a future phase will own that surface.
    navigate(`/topic-hub/${encodeURIComponent(topic.name)}`);
  };

  return (
    <div
      style={{
        maxWidth: 1500,
        padding: "32px 40px 56px 40px",
        fontFamily: FONT_BODY,
        color: TEXT_FG,
      }}
    >
      <PageHeader
        eyebrow="Exam Trends · Class 10 · 2026 board"
        title="Priority board"
        description="Built from 10 years of CBSE board papers + 2026 sample paper. Click any topic to open its Topic Hub."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 24,
        }}
      >
        {COLUMNS.map((column) => (
          <PriorityColumn key={column.id} column={column} onOpenTopic={openTopic} />
        ))}
      </div>
    </div>
  );
}
