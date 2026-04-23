import React from "react";
import { useNavigate, useParams } from "react-router-dom";

/**
 * DesktopTopicHubPage — locked desktop baseline Topic Hub surface.
 *
 * Source of truth: chetan-anand-hub/lazytopper-desktop-view-e1fc5df7
 *   src/pages/TopicHub.tsx
 *
 * Composition (mirrors the locked baseline exactly):
 *   1. PageHeader  — eyebrow "Topic Hub · <Subject> · Must Crack" /
 *      title (topic name, derived from URL params or fallback) /
 *      description "Everything for this topic — learn, practice, test and
 *      predicted questions, in one place." / right-aligned outline action
 *      "Add to study plan".
 *   2. Mistake Intelligence strip — warning-soft gradient card with a left
 *      border in the warning accent, alert glyph, weak-spot headline and
 *      sub-line, plus a "Run targeted drill" outline button on the right.
 *   3. Tabbed structure — pill-style tab bar with four locked baseline tabs:
 *        Learn · Practice · Test · Predicted Questions
 *      Each tab has its own desktop-composed content surface:
 *        - Learn: 3-col grid of 6 concept / video / examples cards.
 *        - Practice: 2-col grid of 4 set cards (warm-up, drill, challenge,
 *          mistake-aware).
 *        - Test: large topic-test card with stats grid and a dark
 *          "Start topic test" CTA.
 *        - Predicted Questions: vertical stack of 4 likely-question rows
 *          with probability, marks, and an arrow affordance.
 *
 * Routing reuse — every CTA wires into existing production destinations.
 * No prediction logic, no Topic Hub backend, no mobile route is changed.
 *   - Run targeted drill / Practice card / Test card  → /practice/:g/:s
 *   - Predicted Questions list                        → /highly-probable/:g/:s
 *   - Add to study plan                               → /planner/:g/:s
 *
 * Production constraints:
 *   - Inline styles only (no Tailwind, no shadcn classes).
 *   - Inline SVG only (no lucide-react).
 *   - Light theme tokens shared with DesktopShell + DesktopHome +
 *     DesktopPracticePage + DesktopExamTrendsPage.
 */

const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const PRIMARY_GREEN_SOFT = "hsl(152, 55%, 95%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";
const MUTED_BG = "hsl(220, 16%, 96%)";

const WARNING_FG = "hsl(35, 80%, 35%)";
const WARNING_SOFT = "hsl(43, 90%, 92%)";

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

function IconBookOpen({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z" />
      <path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
    </svg>
  );
}
function IconDumbbell({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M6 4v16M2 8v8M18 4v16M22 8v8M6 12h12" />
    </svg>
  );
}
function IconClipboard({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <rect x="6" y="4" width="12" height="18" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}
function IconSparkle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6z" />
      <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z" />
    </svg>
  );
}
function IconAlert({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <line x1="12" y1="16.5" x2="12" y2="16.6" />
    </svg>
  );
}
function IconArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}
function IconPlay({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconArrowLeft({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="11 6 5 12 11 18" />
    </svg>
  );
}

// ── PageHeader ─────────────────────────────────────────────────────────────
function PageHeader({
  eyebrow,
  title,
  description,
  onBack,
  onAddToPlan,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onBack: () => void;
  onAddToPlan: () => void;
}) {
  const [planHover, setPlanHover] = React.useState(false);
  const [backHover, setBackHover] = React.useState(false);
  return (
    <div style={{ marginBottom: 28 }}>
      <button
        type="button"
        onClick={onBack}
        onMouseEnter={() => setBackHover(true)}
        onMouseLeave={() => setBackHover(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px 6px 6px",
          marginBottom: 14,
          borderRadius: 8,
          border: "none",
          background: backHover ? MUTED_BG : "transparent",
          color: TEXT_MUTED,
          fontFamily: FONT_BODY,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          transition: "background 140ms ease",
        }}
      >
        <IconArrowLeft size={14} />
        Back
      </button>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 10px",
              borderRadius: 999,
              background: PRIMARY_GREEN_SOFT,
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
        <button
          type="button"
          onClick={onAddToPlan}
          onMouseEnter={() => setPlanHover(true)}
          onMouseLeave={() => setPlanHover(false)}
          style={{
            flexShrink: 0,
            padding: "10px 16px",
            borderRadius: 10,
            border: `1px solid ${BORDER}`,
            background: planHover ? MUTED_BG : CARD_BG,
            color: TEXT_FG,
            fontFamily: FONT_BODY,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 140ms ease",
          }}
        >
          Add to study plan
        </button>
      </div>
    </div>
  );
}

// ── Mistake Intelligence strip ─────────────────────────────────────────────
function MistakeIntelStrip({ onRunDrill }: { onRunDrill: () => void }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 20px",
        marginBottom: 24,
        borderRadius: 14,
        border: `1px solid ${BORDER}`,
        borderLeft: `4px solid ${WARNING_FG}`,
        background: `linear-gradient(90deg, ${WARNING_SOFT} 0%, ${CARD_BG} 55%, ${CARD_BG} 100%)`,
      }}
    >
      <div style={{ color: WARNING_FG, flexShrink: 0 }}>
        <IconAlert size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: 600,
            color: TEXT_FG,
            marginBottom: 2,
          }}
        >
          Your mistake pattern in this topic
        </div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            color: TEXT_MUTED,
            lineHeight: 1.45,
          }}
        >
          5 of last 8 errors here were sign mistakes when factoring. We&rsquo;ve
          prepared a targeted 6-Q drill.
        </div>
      </div>
      <button
        type="button"
        onClick={onRunDrill}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          flexShrink: 0,
          padding: "8px 14px",
          borderRadius: 8,
          border: `1px solid ${BORDER}`,
          background: hover ? MUTED_BG : CARD_BG,
          color: TEXT_FG,
          fontFamily: FONT_BODY,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 140ms ease",
        }}
      >
        Run targeted drill
      </button>
    </div>
  );
}

// ── Tab bar ────────────────────────────────────────────────────────────────
type TabId = "learn" | "practice" | "test" | "predicted";
type Tab = { id: TabId; label: string; Icon: React.FC<{ size?: number }> };

const TABS: Tab[] = [
  { id: "learn", label: "Learn", Icon: IconBookOpen },
  { id: "practice", label: "Practice", Icon: IconDumbbell },
  { id: "test", label: "Test", Icon: IconClipboard },
  { id: "predicted", label: "Predicted Questions", Icon: IconSparkle },
];

function TabBar({
  active,
  onSelect,
}: {
  active: TabId;
  onSelect: (id: TabId) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 6,
        marginBottom: 24,
        borderRadius: 12,
        border: `1px solid ${BORDER}`,
        background: CARD_BG,
      }}
    >
      {TABS.map((t) => {
        const isActive = active === t.id;
        return (
          <TabButton
            key={t.id}
            tab={t}
            isActive={isActive}
            onClick={() => onSelect(t.id)}
          />
        );
      })}
    </div>
  );
}

function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  const Icon = tab.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 16px",
        borderRadius: 8,
        border: "none",
        background: isActive
          ? PRIMARY_GREEN
          : hover
            ? MUTED_BG
            : "transparent",
        color: isActive ? "#ffffff" : TEXT_MUTED,
        fontFamily: FONT_BODY,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 140ms ease, color 140ms ease",
      }}
    >
      <Icon size={15} />
      {tab.label}
    </button>
  );
}

// ── Tab panels ─────────────────────────────────────────────────────────────
function LearnPanel() {
  const lessons = [
    { title: "1. What is a quadratic?", time: "4 min", type: "Concept video" },
    { title: "2. Factoring by splitting middle term", time: "6 min", type: "Worked examples" },
    { title: "3. Quadratic formula", time: "5 min", type: "Concept video" },
    { title: "4. Discriminant & nature of roots", time: "7 min", type: "Concept video" },
    { title: "5. Word problems setup", time: "9 min", type: "Worked examples" },
    { title: "6. Common board traps", time: "3 min", type: "Examiner tips" },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 18,
      }}
    >
      {lessons.map((l) => (
        <LearnCard key={l.title} {...l} />
      ))}
    </div>
  );
}

function LearnCard({
  title,
  time,
  type,
}: {
  title: string;
  time: string;
  type: string;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 18,
        cursor: "pointer",
        boxShadow: hover
          ? "0 8px 22px -12px rgba(15, 23, 42, 0.18)"
          : "0 1px 2px rgba(15, 23, 42, 0.04)",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 160ms ease, box-shadow 160ms ease",
      }}
    >
      <div
        style={{
          aspectRatio: "16 / 9",
          marginBottom: 14,
          borderRadius: 10,
          background:
            "linear-gradient(135deg, hsl(152, 55%, 92%) 0%, hsl(43, 90%, 94%) 100%)",
          display: "grid",
          placeItems: "center",
          color: PRIMARY_GREEN,
        }}
      >
        <IconPlay size={36} />
      </div>
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
        {type}
      </div>
      <h4
        style={{
          margin: "6px 0 10px 0",
          fontFamily: FONT_DISPLAY,
          fontSize: 15,
          fontWeight: 600,
          color: TEXT_FG,
          lineHeight: 1.35,
        }}
      >
        {title}
      </h4>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 12,
          color: TEXT_MUTED,
        }}
      >
        {time}
      </div>
    </div>
  );
}

function PracticePanel({ onStart }: { onStart: () => void }) {
  const sets = [
    { title: "Easy warm-up · 10 Qs", meta: "MCQ + Short" },
    { title: "Medium drill · 15 Qs", meta: "Mixed types" },
    { title: "Hard challenge · 12 Qs", meta: "Long answer focus" },
    { title: "Mistake-aware set · 8 Qs", meta: "Built from your past errors" },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 18,
      }}
    >
      {sets.map((s) => (
        <PracticeCard key={s.title} {...s} onStart={onStart} />
      ))}
    </div>
  );
}

function PracticeCard({
  title,
  meta,
  onStart,
}: {
  title: string;
  meta: string;
  onStart: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onStart}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: "20px 22px",
        cursor: "pointer",
        boxShadow: hover
          ? "0 8px 22px -12px rgba(15, 23, 42, 0.18)"
          : "0 1px 2px rgba(15, 23, 42, 0.04)",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 160ms ease, box-shadow 160ms ease",
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
          <h4
            style={{
              margin: 0,
              fontFamily: FONT_DISPLAY,
              fontSize: 17,
              fontWeight: 600,
              color: TEXT_FG,
              lineHeight: 1.3,
            }}
          >
            {title}
          </h4>
          <div
            style={{
              marginTop: 6,
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: TEXT_MUTED,
            }}
          >
            {meta}
          </div>
        </div>
        <div
          style={{
            color: TEXT_MUTED,
            transform: hover ? "translateX(2px)" : "translateX(0)",
            transition: "transform 160ms ease",
          }}
        >
          <IconArrowRight size={16} />
        </div>
      </div>
    </button>
  );
}

function TestPanel({
  topicTitle,
  onStart,
}: {
  topicTitle: string;
  onStart: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  const stats = [
    { l: "Questions", v: "20" },
    { l: "Duration", v: "30 min" },
    { l: "Pattern", v: "Board · 2026" },
  ];
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: 28,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          fontWeight: 600,
          color: TEXT_FG,
        }}
      >
        Topic test · {topicTitle}
      </h3>
      <p
        style={{
          margin: "6px 0 0 0",
          fontFamily: FONT_BODY,
          fontSize: 14,
          color: TEXT_MUTED,
          lineHeight: 1.55,
        }}
      >
        20 questions · 30 minutes · Auto-graded with mistake breakdown.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 14,
          marginTop: 22,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.l}
            style={{
              borderRadius: 10,
              background: MUTED_BG,
              padding: "14px 16px",
            }}
          >
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
              {s.l}
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: FONT_DISPLAY,
                fontSize: 18,
                fontWeight: 600,
                color: TEXT_FG,
              }}
            >
              {s.v}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onStart}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          marginTop: 22,
          padding: "11px 18px",
          borderRadius: 10,
          border: "none",
          background: hover ? "hsl(220, 25%, 18%)" : TEXT_FG,
          color: "#ffffff",
          fontFamily: FONT_BODY,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          transition: "background 140ms ease",
        }}
      >
        Start topic test
        <IconArrowRight size={15} />
      </button>
    </div>
  );
}

function PredictedPanel({ onOpen }: { onOpen: () => void }) {
  const items = [
    { q: "If one root of 2x² − kx + 4 = 0 is 2, find k.", prob: 92, marks: 3 },
    { q: "Solve: x² − 3x − 10 = 0 by factorisation.", prob: 88, marks: 3 },
    {
      q: "Find the discriminant of 2x² − 4x + 3 and discuss the nature of roots.",
      prob: 84,
      marks: 4,
    },
    {
      q: "A train travels 360 km at uniform speed. If the speed had been 5 km/h more…",
      prob: 79,
      marks: 5,
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((p, i) => (
        <PredictedRow key={i} {...p} onOpen={onOpen} />
      ))}
    </div>
  );
}

function PredictedRow({
  q,
  prob,
  marks,
  onOpen,
}: {
  q: string;
  prob: number;
  marks: number;
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
        display: "flex",
        alignItems: "center",
        gap: 18,
        width: "100%",
        textAlign: "left",
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: "16px 20px",
        cursor: "pointer",
        boxShadow: hover
          ? "0 8px 22px -12px rgba(15, 23, 42, 0.18)"
          : "0 1px 2px rgba(15, 23, 42, 0.04)",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 160ms ease, box-shadow 160ms ease",
        font: "inherit",
        color: "inherit",
      }}
    >
      <div style={{ width: 64, flexShrink: 0, textAlign: "center" }}>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 22,
            fontWeight: 600,
            color: PRIMARY_GREEN,
            lineHeight: 1,
          }}
        >
          {prob}%
        </div>
        <div
          style={{
            marginTop: 2,
            fontFamily: FONT_BODY,
            fontSize: 10,
            color: TEXT_MUTED,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          likely
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            color: TEXT_FG,
            lineHeight: 1.5,
          }}
        >
          {q}
        </div>
        <div
          style={{
            marginTop: 4,
            fontFamily: FONT_BODY,
            fontSize: 12,
            color: TEXT_MUTED,
          }}
        >
          {marks} marks · MCQ + working
        </div>
      </div>
      <div
        style={{
          color: TEXT_MUTED,
          flexShrink: 0,
          transform: hover ? "translateX(2px)" : "translateX(0)",
          transition: "transform 160ms ease",
        }}
      >
        <IconArrowRight size={16} />
      </div>
    </button>
  );
}

// ── Topic resolution helpers ───────────────────────────────────────────────
function prettifyTopic(raw: string | undefined): string {
  if (!raw) return "Topic Hub";
  try {
    const decoded = decodeURIComponent(raw);
    return decoded
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  } catch {
    return raw;
  }
}

function getStoredSubjectContext(): { grade: string; subject: string } {
  try {
    const raw = localStorage.getItem("lazytopper.lastSubjectContext");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.grade && parsed?.subject) {
        return { grade: String(parsed.grade), subject: String(parsed.subject) };
      }
    }
  } catch {}
  return { grade: "10", subject: "Maths" };
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function DesktopTopicHubPage() {
  const navigate = useNavigate();
  const params = useParams<{
    grade?: string;
    subject?: string;
    topicKey?: string;
    topicName?: string;
  }>();

  const [tab, setTab] = React.useState<TabId>("learn");

  const stored = React.useMemo(() => getStoredSubjectContext(), []);
  const grade = params.grade ?? stored.grade;
  const subject = params.subject ?? stored.subject;
  const rawTopic = params.topicKey ?? params.topicName;
  const topicTitle = prettifyTopic(rawTopic) || "Topic Hub";
  const eyebrow = `Topic Hub · ${subject} · Must Crack`;

  const goPractice = () => {
    const topicParam = rawTopic
      ? `?topic=${encodeURIComponent(rawTopic)}`
      : "";
    navigate(`/practice/${grade}/${subject}${topicParam}`);
  };
  const goPredicted = () => {
    navigate(`/highly-probable/${grade}/${subject}`);
  };
  const goPlanner = () => {
    navigate(`/planner/${grade}/${subject}`);
  };
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div
      style={{
        maxWidth: 1500,
        margin: "0 auto",
        padding: "32px 32px 64px 32px",
        fontFamily: FONT_BODY,
        color: TEXT_FG,
      }}
    >
      <PageHeader
        eyebrow={eyebrow}
        title={topicTitle}
        description="Everything for this topic — learn, practice, test and predicted questions, in one place."
        onBack={goBack}
        onAddToPlan={goPlanner}
      />

      <MistakeIntelStrip onRunDrill={goPractice} />

      <TabBar active={tab} onSelect={setTab} />

      {tab === "learn" && <LearnPanel />}
      {tab === "practice" && <PracticePanel onStart={goPractice} />}
      {tab === "test" && <TestPanel topicTitle={topicTitle} onStart={goPractice} />}
      {tab === "predicted" && <PredictedPanel onOpen={goPredicted} />}
    </div>
  );
}
