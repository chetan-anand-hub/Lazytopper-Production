import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  buildDesktopPracticePath,
  buildDesktopTopicHubPath,
  buildDesktopWorksheetPath,
  type DesktopStream,
  type DesktopSubject,
} from "../../lib/desktop/navigation";
import {
  desktopTopicBySlug,
  desktopTopicsBySubject,
  type DesktopTopicSummary,
  type DesktopTrendTier,
} from "../../lib/desktop/topics";
import {
  getHighlyProbableQuestions,
  type HPQStream,
  type HPQTopicBucket,
} from "../../data/highlyProbableQuestions";

/**
 * DesktopExamTrendsPage — locked prototype parity build (PR-E).
 *
 * Source of truth (locked desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/pages/TrendsPage.tsx
 *   chetan-anand-hub/topic-focus-lite — src/components/ContextBar.tsx
 *   chetan-anand-hub/topic-focus-lite — src/components/TopicActions.tsx
 *
 * Composition (mirrors the prototype):
 *   1. ContextBar / page header — "Exam Trends" title, subtitle about
 *      tier-ranked topics + multi-select.
 *   2. Filter card — Subject toggle (Maths / Science) and Science stream
 *      toggle (All / Physics / Chemistry / Biology).  Stream toggle is
 *      disabled / de-emphasised when subject is Maths.
 *   3. Selected-topic tray — conditional, only when at least one topic is
 *      added; multi-topic action buttons + clear.
 *   4. Topic grid — two columns at desktop width; each card carries the
 *      topic name, blurb, subject/stream eyebrow, trend chip, marks chip,
 *      action row (Practice / Worksheet / Predicted Qs / Topic Hub) and
 *      an Add-to-selection toggle.
 *
 * Data honesty:
 *   - No fabricated "% likely" claims.  Trend tier chips render
 *     `High trend` / `Medium trend` / `Low trend`.
 *   - HPQ counts come from `getHighlyProbableQuestions` only and are
 *     matched by canonical normalised topic name; if no bucket matches
 *     we render `No matched HPQs yet` instead of inventing a number.
 *   - Mock / practice-paper CTA is honestly labelled
 *     `Open existing mock builder` because it routes to the older mock
 *     builder engine, which is not yet aligned to the locked prototype.
 *
 * Routing:
 *   Uses production routes only — `/practice-hub`, `/practice/worksheets`,
 *   `/highly-probable/:grade/:subject`, `/topic-hub/:topicSlug` and
 *   `/mock-builder/:grade/:subject`.  Every CTA preserves
 *   `source=trends` and `returnTo=/exam-trends`.
 *
 * Production constraints:
 *   - Inline styles only (no Tailwind, no shadcn classes).
 *   - Inline SVG only (no lucide-react).
 *   - Light theme tokens shared with DesktopShell + DesktopHome +
 *     DesktopPracticePage.
 */

// ─── Theme tokens (shared with DesktopHome / DesktopPracticePage) ──────────
const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const PRIMARY_GREEN_SOFT = "hsl(152, 55%, 95%)";
const PRIMARY_GREEN_DEEP = "hsl(152, 60%, 38%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";
const SURFACE_SOFT = "hsl(215, 28%, 96%)";

const TIER_COLOR: Record<DesktopTrendTier, { fg: string; bg: string }> = {
  high: { fg: "hsl(152, 60%, 32%)", bg: "hsl(152, 55%, 95%)" },
  medium: { fg: "hsl(35, 75%, 32%)", bg: "hsl(43, 90%, 94%)" },
  low: { fg: "hsl(220, 15%, 38%)", bg: "hsl(220, 14%, 94%)" },
};
const TIER_LABEL: Record<DesktopTrendTier, string> = {
  high: "High trend",
  medium: "Medium trend",
  low: "Low trend",
};
const TIER_SORT: Record<DesktopTrendTier, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const FONT_DISPLAY =
  '"Fraunces", "Source Serif Pro", Georgia, "Times New Roman", serif';
const FONT_BODY =
  '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

// ─── Inline SVG glyphs ─────────────────────────────────────────────────────
const ICON: React.CSSProperties = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function IconLayers({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function IconSparkles({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 15.8l-1.8-4.6L6 9.4l4.2-1.8z" />
      <path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7z" />
    </svg>
  );
}
function IconClipboard({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}
function IconBook({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function IconTimer({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M9 2h6" />
    </svg>
  );
}
function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ─── Honest HPQ matching ───────────────────────────────────────────────────
const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const STREAM_TO_HPQ: Record<DesktopStream, HPQStream | undefined> = {
  All: undefined,
  Physics: "Physics",
  Chemistry: "Chemistry",
  Biology: "Biology",
};

function countHPQForTopic(topic: DesktopTopicSummary): number {
  const stream = topic.subject === "Science" ? STREAM_TO_HPQ[topic.stream] : undefined;
  const buckets: HPQTopicBucket[] = getHighlyProbableQuestions(topic.subject, stream);
  if (buckets.length === 0) return 0;
  const slugNorm = normalize(topic.slug);
  const nameNorm = normalize(topic.name);
  const match = buckets.find((bucket) => {
    const t = normalize(bucket.topic);
    if (t === slugNorm || t === nameNorm) return true;
    // Looser match: prefix in either direction (covers minor naming differences
    // such as "Light – Reflection & Refraction" vs "Light Reflection Refraction").
    return t.startsWith(nameNorm) || nameNorm.startsWith(t);
  });
  if (!match) return 0;
  return match.questions.length;
}

// ─── Toggle button (used by filter card) ───────────────────────────────────
function ToggleButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: "none",
        border: `1px solid ${active ? PRIMARY_GREEN : BORDER}`,
        background: active ? PRIMARY_GREEN_SOFT : CARD_BG,
        color: disabled ? "hsl(220, 14%, 70%)" : active ? PRIMARY_GREEN_DEEP : TEXT_FG,
        padding: "8px 14px",
        borderRadius: 999,
        fontFamily: FONT_BODY,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "background 160ms ease, border-color 160ms ease, color 160ms ease",
      }}
    >
      {children}
    </button>
  );
}

// ─── Action button (per-card and tray actions) ─────────────────────────────
function ActionButton({
  variant,
  onClick,
  icon,
  children,
  fullWidth,
}: {
  variant: "primary" | "secondary" | "ghost";
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const palette = (() => {
    if (variant === "primary") {
      return {
        bg: hover ? PRIMARY_GREEN_DEEP : PRIMARY_GREEN,
        color: "#fff",
        border: hover ? PRIMARY_GREEN_DEEP : PRIMARY_GREEN,
      };
    }
    if (variant === "secondary") {
      return {
        bg: hover ? SURFACE_SOFT : CARD_BG,
        color: TEXT_FG,
        border: BORDER,
      };
    }
    return {
      bg: hover ? SURFACE_SOFT : "transparent",
      color: TEXT_MUTED,
      border: "transparent",
    };
  })();
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        appearance: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: 8,
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.color,
        fontFamily: FONT_BODY,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
        width: fullWidth ? "100%" : "auto",
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

// ─── Page header (visual cousin of DesktopHome / DesktopPracticePage) ─────
function PageHeader({
  subject,
  stream,
  selectedCount,
}: {
  subject: DesktopSubject;
  stream: DesktopStream;
  selectedCount: number;
}) {
  const scopeLabel =
    selectedCount > 0
      ? `${selectedCount} topic${selectedCount === 1 ? "" : "s"} selected`
      : "Browse by trend tier";
  const subjectLabel =
    subject === "Science" && stream !== "All" ? `Science · ${stream}` : subject;
  return (
    <header style={{ marginBottom: 28 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          "Class 10",
          subjectLabel,
          `Scope: ${scopeLabel}`,
        ].map((label) => (
          <span
            key={label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 10px",
              borderRadius: 999,
              background: SURFACE_SOFT,
              color: TEXT_MUTED,
              fontFamily: FONT_BODY,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
        ))}
      </div>
      <h1
        style={{
          margin: "0 0 8px 0",
          fontFamily: FONT_DISPLAY,
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: TEXT_FG,
          lineHeight: 1.1,
        }}
      >
        Exam Trends
      </h1>
      <p
        style={{
          margin: 0,
          maxWidth: 720,
          fontFamily: FONT_BODY,
          fontSize: 14,
          lineHeight: 1.55,
          color: TEXT_MUTED,
        }}
      >
        Tier-ranked topics. Select multiple to build practice, worksheet, predicted questions, or mock.
      </p>
    </header>
  );
}

// ─── Filter card ───────────────────────────────────────────────────────────
function FilterCard({
  subject,
  stream,
  onSubject,
  onStream,
}: {
  subject: DesktopSubject;
  stream: DesktopStream;
  onSubject: (s: DesktopSubject) => void;
  onStream: (s: DesktopStream) => void;
}) {
  const scienceDisabled = subject !== "Science";
  return (
    <section
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 18,
        marginBottom: 20,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: TEXT_MUTED,
          }}
        >
          Subject
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <ToggleButton active={subject === "Maths"} onClick={() => onSubject("Maths")}>
            Maths
          </ToggleButton>
          <ToggleButton active={subject === "Science"} onClick={() => onSubject("Science")}>
            Science
          </ToggleButton>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: scienceDisabled ? "hsl(220, 14%, 70%)" : TEXT_MUTED,
          }}
        >
          Science stream
        </span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["All", "Physics", "Chemistry", "Biology"] as DesktopStream[]).map((s) => (
            <ToggleButton
              key={s}
              active={!scienceDisabled && stream === s}
              disabled={scienceDisabled}
              onClick={() => onStream(s)}
            >
              {s}
            </ToggleButton>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Selected topic tray ───────────────────────────────────────────────────
function SelectedTopicTray({
  selectedSlugs,
  subject,
  stream,
  onPractice,
  onWorksheet,
  onPredicted,
  onMock,
  onClear,
}: {
  selectedSlugs: string[];
  subject: DesktopSubject;
  stream: DesktopStream;
  onPractice: () => void;
  onWorksheet: () => void;
  onPredicted: () => void;
  onMock: () => void;
  onClear: () => void;
}) {
  const names = selectedSlugs
    .map((slug) => desktopTopicBySlug(slug)?.name)
    .filter(Boolean) as string[];
  const subjectLabel =
    subject === "Science" && stream !== "All" ? `Science · ${stream}` : subject;
  return (
    <section
      style={{
        background: CARD_BG,
        border: `1px solid ${PRIMARY_GREEN}`,
        borderRadius: 14,
        padding: 18,
        marginBottom: 20,
        boxShadow: "0 6px 20px -14px rgba(15, 23, 42, 0.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 280px" }}>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: TEXT_MUTED,
            }}
          >
            Selected topics · {subjectLabel}
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: FONT_DISPLAY,
              fontSize: 16,
              fontWeight: 600,
              color: TEXT_FG,
              lineHeight: 1.4,
            }}
          >
            {names.join(" + ")}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <ActionButton variant="primary" icon={<IconLayers />} onClick={onPractice}>
            Practice selected topics
          </ActionButton>
          <ActionButton variant="secondary" icon={<IconClipboard />} onClick={onWorksheet}>
            Generate worksheet
          </ActionButton>
          <ActionButton variant="secondary" icon={<IconSparkles />} onClick={onPredicted}>
            Predicted Qs
          </ActionButton>
          <ActionButton variant="secondary" icon={<IconTimer />} onClick={onMock}>
            Open existing mock builder
          </ActionButton>
          <ActionButton variant="ghost" icon={<IconTrash />} onClick={onClear}>
            Clear
          </ActionButton>
        </div>
      </div>
    </section>
  );
}

// ─── Topic card ────────────────────────────────────────────────────────────
function TopicCard({
  topic,
  hpqCount,
  selected,
  onPractice,
  onWorksheet,
  onPredicted,
  onTopicHub,
  onToggleSelect,
}: {
  topic: DesktopTopicSummary;
  hpqCount: number;
  selected: boolean;
  onPractice: () => void;
  onWorksheet: () => void;
  onPredicted: () => void;
  onTopicHub: () => void;
  onToggleSelect: () => void;
}) {
  const tier = TIER_COLOR[topic.trendTier];
  const subjectLabel =
    topic.subject === "Science" && topic.stream !== "All"
      ? `Science · ${topic.stream}`
      : topic.subject;
  return (
    <article
      style={{
        background: CARD_BG,
        border: `1px solid ${selected ? PRIMARY_GREEN : BORDER}`,
        borderRadius: 14,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        transition: "border-color 160ms ease, box-shadow 160ms ease",
      }}
    >
      <header
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
            {subjectLabel}
          </div>
          <h3
            style={{
              margin: "6px 0 0 0",
              fontFamily: FONT_DISPLAY,
              fontSize: 18,
              fontWeight: 600,
              color: TEXT_FG,
              lineHeight: 1.25,
            }}
          >
            {topic.name}
          </h3>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            flexShrink: 0,
            padding: "4px 10px",
            borderRadius: 999,
            background: tier.bg,
            color: tier.fg,
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          {TIER_LABEL[topic.trendTier]}
        </span>
      </header>

      <p
        style={{
          margin: 0,
          fontFamily: FONT_BODY,
          fontSize: 13,
          lineHeight: 1.55,
          color: TEXT_MUTED,
        }}
      >
        {topic.blurb}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 10px",
            borderRadius: 999,
            background: SURFACE_SOFT,
            color: TEXT_FG,
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Approx. marks: {topic.marks}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 10px",
            borderRadius: 999,
            background: hpqCount > 0 ? "hsl(212, 80%, 95%)" : SURFACE_SOFT,
            color: hpqCount > 0 ? "hsl(212, 70%, 35%)" : TEXT_MUTED,
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {hpqCount > 0
            ? `${hpqCount} HPQ${hpqCount === 1 ? "" : "s"} available`
            : "No matched HPQs yet"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <ActionButton variant="primary" icon={<IconLayers />} onClick={onPractice}>
          Practice
        </ActionButton>
        <ActionButton variant="secondary" icon={<IconClipboard />} onClick={onWorksheet}>
          Worksheet
        </ActionButton>
        <ActionButton variant="secondary" icon={<IconSparkles />} onClick={onPredicted}>
          Predicted Qs
        </ActionButton>
        <ActionButton variant="secondary" icon={<IconBook />} onClick={onTopicHub}>
          Topic Hub
        </ActionButton>
      </div>

      <button
        type="button"
        onClick={onToggleSelect}
        style={{
          appearance: "none",
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 999,
          border: `1px solid ${selected ? PRIMARY_GREEN : BORDER}`,
          background: selected ? PRIMARY_GREEN_SOFT : CARD_BG,
          color: selected ? PRIMARY_GREEN_DEEP : TEXT_FG,
          fontFamily: FONT_BODY,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 160ms ease, border-color 160ms ease, color 160ms ease",
        }}
        aria-pressed={selected}
      >
        {selected ? <IconCheck /> : <IconPlus />}
        {selected ? "Added" : "Add to selection"}
      </button>
    </article>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function DesktopExamTrendsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [subject, setSubject] = useState<DesktopSubject>("Maths");
  const [stream, setStream] = useState<DesktopStream>("All");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const currentExamTrendsUrl = `${location.pathname}${location.search}`;

  // When the subject changes from Science → Maths the stream must reset to "All"
  // so the (disabled) stream toggle does not appear pre-selected on Physics
  // when the user toggles back later.
  const handleSubject = (next: DesktopSubject) => {
    setSubject(next);
    if (next === "Maths") setStream("All");
  };

  const sortedTopics = useMemo<DesktopTopicSummary[]>(() => {
    const list = desktopTopicsBySubject(subject, stream);
    return [...list].sort((a, b) => {
      const tierDiff = TIER_SORT[a.trendTier] - TIER_SORT[b.trendTier];
      if (tierDiff !== 0) return tierDiff;
      return b.weight - a.weight;
    });
  }, [subject, stream]);

  const hpqCounts = useMemo(() => {
    const map = new Map<string, number>();
    sortedTopics.forEach((topic) => map.set(topic.slug, countHPQForTopic(topic)));
    return map;
  }, [sortedTopics]);

  const toggleSelect = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const goPracticeTopic = (topic: DesktopTopicSummary) => {
    navigate(
      buildDesktopPracticePath({
        scope: "topic",
        subject: topic.subject,
        stream: topic.subject === "Science" ? topic.stream : undefined,
        topic: topic.slug,
        mode: "practice-set",
        source: "trends",
        returnTo: currentExamTrendsUrl,
      }),
    );
  };

  const goWorksheetTopic = (topic: DesktopTopicSummary) => {
    navigate(
      buildDesktopWorksheetPath({
        scope: "topic",
        subject: topic.subject,
        stream: topic.subject === "Science" ? topic.stream : undefined,
        topic: topic.slug,
        source: "trends",
        returnTo: currentExamTrendsUrl,
      }),
    );
  };

  const goPredictedTopic = (topic: DesktopTopicSummary) => {
    const params = new URLSearchParams();
    params.set("topic", topic.slug);
    params.set("source", "trends");
    params.set("returnTo", currentExamTrendsUrl);
    navigate(`/highly-probable/10/${topic.subject}?${params.toString()}`);
  };

  const goTopicHub = (topic: DesktopTopicSummary) => {
    navigate(
      buildDesktopTopicHubPath(topic.slug, {
        source: "trends",
        returnTo: currentExamTrendsUrl,
      }),
    );
  };

  const goPracticeSelected = () => {
    if (selectedSlugs.length === 0) return;
    navigate(
      buildDesktopPracticePath({
        scope: "multi-topic",
        subject,
        stream: subject === "Science" ? stream : undefined,
        topics: selectedSlugs,
        mode: "practice-set",
        source: "trends",
        returnTo: currentExamTrendsUrl,
      }),
    );
  };

  const goWorksheetSelected = () => {
    if (selectedSlugs.length === 0) return;
    navigate(
      buildDesktopWorksheetPath({
        scope: "multi-topic",
        subject,
        stream: subject === "Science" ? stream : undefined,
        topics: selectedSlugs,
        source: "trends",
        returnTo: currentExamTrendsUrl,
      }),
    );
  };

  const goPredictedSelected = () => {
    if (selectedSlugs.length === 0) return;
    const params = new URLSearchParams();
    params.set("topics", selectedSlugs.join(","));
    params.set("source", "trends");
    params.set("returnTo", currentExamTrendsUrl);
    navigate(`/highly-probable/10/${subject}?${params.toString()}`);
  };

  const goMockSelected = () => {
    const params = new URLSearchParams();
    if (selectedSlugs.length > 0) params.set("topics", selectedSlugs.join(","));
    if (subject === "Science" && stream !== "All") params.set("stream", stream);
    params.set("source", "trends");
    params.set("returnTo", currentExamTrendsUrl);
    navigate(`/mock-builder/10/${subject}?${params.toString()}`);
  };

  const clearSelection = () => setSelectedSlugs([]);

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "32px 32px 64px 32px",
        fontFamily: FONT_BODY,
        color: TEXT_FG,
      }}
    >
      <PageHeader subject={subject} stream={stream} selectedCount={selectedSlugs.length} />

      <FilterCard
        subject={subject}
        stream={stream}
        onSubject={handleSubject}
        onStream={setStream}
      />

      {selectedSlugs.length > 0 && (
        <SelectedTopicTray
          selectedSlugs={selectedSlugs}
          subject={subject}
          stream={stream}
          onPractice={goPracticeSelected}
          onWorksheet={goWorksheetSelected}
          onPredicted={goPredictedSelected}
          onMock={goMockSelected}
          onClear={clearSelection}
        />
      )}

      {sortedTopics.length === 0 ? (
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: 28,
            textAlign: "center",
            color: TEXT_MUTED,
            fontFamily: FONT_BODY,
            fontSize: 14,
          }}
        >
          No topics match this filter yet.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 18,
          }}
        >
          {sortedTopics.map((topic) => (
            <TopicCard
              key={topic.slug}
              topic={topic}
              hpqCount={hpqCounts.get(topic.slug) ?? 0}
              selected={selectedSlugs.includes(topic.slug)}
              onPractice={() => goPracticeTopic(topic)}
              onWorksheet={() => goWorksheetTopic(topic)}
              onPredicted={() => goPredictedTopic(topic)}
              onTopicHub={() => goTopicHub(topic)}
              onToggleSelect={() => toggleSelect(topic.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
