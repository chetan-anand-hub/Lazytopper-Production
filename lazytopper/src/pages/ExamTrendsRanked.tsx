import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  buildDesktopPracticePath,
  buildDesktopTopicHubPath,
  buildDesktopWorksheetPath,
  type DesktopStream,
  type DesktopSubject,
} from "../lib/desktop/navigation";
import {
  desktopTopicBySlug,
  desktopTopicsBySubject,
  type DesktopTopicSummary,
  type DesktopTrendTier,
} from "../lib/desktop/topics";
import {
  getHighlyProbableQuestions,
  type HPQStream,
  type HPQTopicBucket,
} from "../data/highlyProbableQuestions";

/**
 * ExamTrendsRanked — ONE responsive Exam Trends page (Option-B convergence).
 *
 * Source of truth (owner-held locked prototype):
 *   02_exam_trends_ranked_list.html — a ranked priority-LIST (not a card grid).
 *
 * This single component renders at every width (~360px → desktop) and RETIRES
 * both twins it replaced:
 *   - src/pages/desktop/DesktopExamTrendsPage.tsx (the old 2-col card grid)
 *   - src/pages/app/ExamTrends.tsx                (the old mobile tier list)
 * At desktop width it mounts inside DesktopShell (sidebar) exactly as the old
 * desktop page did (isDesktopShellRoute keeps "/exam-trends" shell-wrapped); at
 * mobile width it reflows fluidly via flex-wrap + min-width:0 ellipsis — NOT a
 * breakpoint swap to a different file.
 *
 * Design grammar is reused EXACTLY from the locked desktop pages (DesktopHome /
 * DesktopTopicHub / the old DesktopExamTrendsPage): the same green/text/border
 * tokens, the same Fraunces/Inter fonts, the same Toggle/Action button shapes,
 * inline styles + inline SVG (no Tailwind/shadcn/lucide), light theme only. ONLY
 * the Exam Trends *layout* changes (card grid → ranked list); the shared visual
 * language is byte-faithful so this page feels like the same product.
 *
 * Data honesty (doctrine):
 *   - Real production data only (desktopTopicsBySubject — all 28 topics, both
 *     subjects, working Science-stream filter). No fabricated "% likely".
 *   - Trend tier chips render High/Medium/Low — never a fake percentage.
 *   - HPQ counts come from getHighlyProbableQuestions only, matched by canonical
 *     topic name; if no bucket matches we render nothing (no invented number).
 *   - The prototype's optional "proofs" tag is OMITTED: production topic data
 *     carries no structured proof flag, and inventing which topics are "proof
 *     topics" would fabricate a UI signal. Surfaced to owner as a follow-up.
 *
 * Routing reuses the production routes the old page used — "Open" → Topic Hub;
 * the "⋯" secondary actions → existing Practice / Worksheet / Predicted routes;
 * every CTA preserves source=trends + returnTo=/exam-trends.
 */

// ─── Theme tokens (copied verbatim from the retired DesktopExamTrendsPage —
//     the shared desktop grammar; do NOT drift) ──────────────────────────────
const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const PRIMARY_GREEN_SOFT = "hsl(152, 55%, 95%)";
const PRIMARY_GREEN_DEEP = "hsl(152, 60%, 38%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const TEXT_TERTIARY = "hsl(220, 14%, 55%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";
const SURFACE_SOFT = "hsl(215, 28%, 96%)";

const TIER_COLOR: Record<DesktopTrendTier, { fg: string; bg: string }> = {
  high: { fg: "hsl(152, 60%, 32%)", bg: "hsl(152, 55%, 95%)" },
  medium: { fg: "hsl(35, 75%, 32%)", bg: "hsl(43, 90%, 94%)" },
  low: { fg: "hsl(220, 15%, 38%)", bg: "hsl(220, 14%, 94%)" },
};
const TIER_LABEL: Record<DesktopTrendTier, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
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

type SortMode = "weight" | "trend";

// ─── Inline SVG glyphs (same family as the retired page) ────────────────────
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
function IconClipboard({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
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
function IconBook({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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
function IconMore({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={ICON} aria-hidden>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </svg>
  );
}

// ─── Honest HPQ matching (lifted verbatim from the retired desktop page) ─────
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
    return t.startsWith(nameNorm) || nameNorm.startsWith(t);
  });
  if (!match) return 0;
  return match.questions.length;
}

// ─── Toggle button (reused pattern: active = green border + soft bg) ────────
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
        padding: "7px 13px",
        borderRadius: 999,
        fontFamily: FONT_BODY,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: "nowrap",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "background 160ms ease, border-color 160ms ease, color 160ms ease",
      }}
    >
      {children}
    </button>
  );
}

// ─── Action button (same shape/colors as the retired page) ──────────────────
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
        whiteSpace: "nowrap",
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

// ─── Page header ─────────────────────────────────────────────────────────────
function PageHeader() {
  return (
    <header style={{ marginBottom: 22 }}>
      <h1
        style={{
          margin: "0 0 6px 0",
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: TEXT_FG,
          lineHeight: 1.2,
        }}
      >
        Exam Trends
      </h1>
      <p
        style={{
          margin: 0,
          maxWidth: 640,
          fontFamily: FONT_BODY,
          fontSize: 13,
          lineHeight: 1.55,
          color: TEXT_MUTED,
        }}
      >
        What scores most in CBSE Class 10 — ranked. Tap a topic to learn or practise.
      </p>
    </header>
  );
}

// ─── Controls row (Subject + Science stream + Sort) — flex-wraps on phones ──
function ControlsRow({
  subject,
  stream,
  sortMode,
  onSubject,
  onStream,
  onSort,
}: {
  subject: DesktopSubject;
  stream: DesktopStream;
  sortMode: SortMode;
  onSubject: (s: DesktopSubject) => void;
  onStream: (s: DesktopStream) => void;
  onSort: (s: SortMode) => void;
}) {
  const scienceDisabled = subject !== "Science";
  const groupLabel: React.CSSProperties = {
    fontFamily: FONT_BODY,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: TEXT_MUTED,
    whiteSpace: "nowrap",
  };
  return (
    <section
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "12px 18px",
        marginBottom: 18,
      }}
    >
      {/* Subject toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <ToggleButton active={subject === "Maths"} onClick={() => onSubject("Maths")}>
          Maths
        </ToggleButton>
        <ToggleButton active={subject === "Science"} onClick={() => onSubject("Science")}>
          Science
        </ToggleButton>
      </div>

      {/* Science stream sub-filter — de-emphasised (disabled) for Maths */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          opacity: scienceDisabled ? 0.55 : 1,
        }}
      >
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

      {/* Sort */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={groupLabel}>Sort:</span>
        <ToggleButton active={sortMode === "weight"} onClick={() => onSort("weight")}>
          Marks weight
        </ToggleButton>
        <ToggleButton active={sortMode === "trend"} onClick={() => onSort("trend")}>
          Trend
        </ToggleButton>
      </div>
    </section>
  );
}

// ─── Selected-topic tray — multi-select secondary surface (honest, optional) ─
function SelectedTopicTray({
  selectedSlugs,
  subject,
  stream,
  onPractice,
  onWorksheet,
  onPredicted,
  onClear,
}: {
  selectedSlugs: string[];
  subject: DesktopSubject;
  stream: DesktopStream;
  onPractice: () => void;
  onWorksheet: () => void;
  onPredicted: () => void;
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
        padding: 16,
        marginBottom: 18,
        boxShadow: "0 6px 20px -14px rgba(15, 23, 42, 0.18)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
      }}
    >
      <div style={{ minWidth: 0, flex: "1 1 240px" }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: TEXT_MUTED,
          }}
        >
          Selected · {subjectLabel}
        </div>
        <div
          style={{
            marginTop: 5,
            fontFamily: FONT_DISPLAY,
            fontSize: 15,
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
          Practice selected
        </ActionButton>
        <ActionButton variant="secondary" icon={<IconClipboard />} onClick={onWorksheet}>
          Worksheet
        </ActionButton>
        <ActionButton variant="secondary" icon={<IconSparkles />} onClick={onPredicted}>
          Predicted Qs
        </ActionButton>
        <ActionButton variant="ghost" icon={<IconTrash />} onClick={onClear}>
          Clear
        </ActionButton>
      </div>
    </section>
  );
}

// ─── Topic row (.trow) — the ranked-list unit (replaces the old card) ───────
function TopicRow({
  topic,
  maxWeight,
  hpqCount,
  selected,
  expanded,
  isLast,
  onToggleExpand,
  onOpen,
  onPractice,
  onWorksheet,
  onPredicted,
  onToggleSelect,
}: {
  topic: DesktopTopicSummary;
  maxWeight: number;
  hpqCount: number;
  selected: boolean;
  expanded: boolean;
  isLast: boolean;
  onToggleExpand: () => void;
  onOpen: () => void;
  onPractice: () => void;
  onWorksheet: () => void;
  onPredicted: () => void;
  onToggleSelect: () => void;
}) {
  const tier = TIER_COLOR[topic.trendTier];
  const barPct = Math.min(100, (topic.weight / maxWeight) * 100);
  return (
    <div
      style={{
        borderBottom: isLast ? "none" : `1px solid ${BORDER}`,
        padding: "14px 16px",
        background: selected ? PRIMARY_GREEN_SOFT : CARD_BG,
        transition: "background 160ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        {/* Left block — flexes and truncates so long names never overflow */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: 14,
                fontWeight: 500,
                color: TEXT_FG,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {topic.name}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                flexShrink: 0,
                padding: "2px 8px",
                borderRadius: 999,
                background: tier.bg,
                color: tier.fg,
                fontFamily: FONT_BODY,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              {TIER_LABEL[topic.trendTier]}
            </span>
          </div>

          <div
            style={{
              marginTop: 4,
              fontFamily: FONT_BODY,
              fontSize: 11.5,
              lineHeight: 1.45,
              color: TEXT_TERTIARY,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {topic.blurb}
          </div>

          {/* Marks-weight bar + label */}
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 0,
                maxWidth: 190,
                height: 6,
                borderRadius: 999,
                background: SURFACE_SOFT,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${barPct}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: tier.fg,
                }}
              />
            </div>
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: 11,
                fontWeight: 600,
                color: TEXT_MUTED,
                whiteSpace: "nowrap",
              }}
            >
              ~{topic.weight} marks
              {hpqCount > 0 ? ` · ${hpqCount} HPQ${hpqCount === 1 ? "" : "s"}` : ""}
            </span>
          </div>
        </div>

        {/* Right block — Open + ⋯; stays reachable, may wrap under on narrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <ActionButton variant="primary" icon={<IconBook />} onClick={onOpen}>
            Open
          </ActionButton>
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            aria-label="More actions"
            style={{
              appearance: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 8,
              border: `1px solid ${expanded ? PRIMARY_GREEN : BORDER}`,
              background: expanded ? PRIMARY_GREEN_SOFT : CARD_BG,
              color: expanded ? PRIMARY_GREEN_DEEP : TEXT_MUTED,
              cursor: "pointer",
              transition: "background 160ms ease, border-color 160ms ease, color 160ms ease",
            }}
          >
            <IconMore />
          </button>
        </div>
      </div>

      {/* Inline secondary-action row — revealed by ⋯, wraps on narrow widths */}
      {expanded && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <ActionButton variant="secondary" icon={<IconLayers />} onClick={onPractice}>
            Practice
          </ActionButton>
          <ActionButton variant="secondary" icon={<IconClipboard />} onClick={onWorksheet}>
            Worksheet
          </ActionButton>
          <ActionButton variant="secondary" icon={<IconSparkles />} onClick={onPredicted}>
            Predicted Qs
          </ActionButton>
          <ActionButton
            variant={selected ? "primary" : "secondary"}
            icon={selected ? <IconCheck /> : <IconPlus />}
            onClick={onToggleSelect}
          >
            {selected ? "Added" : "Add to selection"}
          </ActionButton>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ExamTrendsRanked() {
  const navigate = useNavigate();
  const location = useLocation();
  const [subject, setSubject] = useState<DesktopSubject>("Maths");
  const [stream, setStream] = useState<DesktopStream>("All");
  const [sortMode, setSortMode] = useState<SortMode>("weight");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const currentExamTrendsUrl = `${location.pathname}${location.search}`;

  // Science → Maths resets the stream so the (disabled) toggle is never left
  // pre-selected on a stream when the user toggles back later.
  const handleSubject = (next: DesktopSubject) => {
    setSubject(next);
    if (next === "Maths") setStream("All");
  };

  const sortedTopics = useMemo<DesktopTopicSummary[]>(() => {
    const list = desktopTopicsBySubject(subject, stream);
    return [...list].sort((a, b) => {
      if (sortMode === "trend") {
        const tierDiff = TIER_SORT[a.trendTier] - TIER_SORT[b.trendTier];
        if (tierDiff !== 0) return tierDiff;
      }
      return b.weight - a.weight;
    });
  }, [subject, stream, sortMode]);

  const maxWeight = useMemo(
    () => sortedTopics.reduce((m, t) => Math.max(m, t.weight), 1),
    [sortedTopics],
  );

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

  const toggleExpand = (slug: string) => {
    setExpandedSlug((prev) => (prev === slug ? null : slug));
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

  const clearSelection = () => setSelectedSlugs([]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 880,
        margin: "0 auto",
        padding: "28px 16px 64px 16px",
        fontFamily: FONT_BODY,
        color: TEXT_FG,
        boxSizing: "border-box",
      }}
    >
      <PageHeader />

      <ControlsRow
        subject={subject}
        stream={stream}
        sortMode={sortMode}
        onSubject={handleSubject}
        onStream={setStream}
        onSort={setSortMode}
      />

      {selectedSlugs.length > 0 && (
        <SelectedTopicTray
          selectedSlugs={selectedSlugs}
          subject={subject}
          stream={stream}
          onPractice={goPracticeSelected}
          onWorksheet={goWorksheetSelected}
          onPredicted={goPredictedSelected}
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
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          }}
        >
          {sortedTopics.map((topic, idx) => (
            <TopicRow
              key={topic.slug}
              topic={topic}
              maxWeight={maxWeight}
              hpqCount={hpqCounts.get(topic.slug) ?? 0}
              selected={selectedSlugs.includes(topic.slug)}
              expanded={expandedSlug === topic.slug}
              isLast={idx === sortedTopics.length - 1}
              onToggleExpand={() => toggleExpand(topic.slug)}
              onOpen={() => goTopicHub(topic)}
              onPractice={() => goPracticeTopic(topic)}
              onWorksheet={() => goWorksheetTopic(topic)}
              onPredicted={() => goPredictedTopic(topic)}
              onToggleSelect={() => toggleSelect(topic.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
