import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import {
  buildDesktopCheckPath,
  buildDesktopPracticePath,
  buildDesktopWorksheetPath,
  type DesktopRouteContext,
  type DesktopSubject,
} from "../../lib/desktop/navigation";
import {
  desktopTopicBySlug,
  desktopTopicSlugFromName,
  type DesktopTopicSummary,
} from "../../lib/desktop/topics";
import {
  desktopTopicHubContentBySlug,
  type DesktopHubBlueprintSection,
  type DesktopHubHighlight,
  type DesktopHubResource,
  type DesktopTopicHubContent,
} from "../../lib/desktop/topicHubContent";
import {
  getHighlyProbableQuestions,
  type HPQQuestion,
  type HPQTopicBucket,
} from "../../data/highlyProbableQuestions";
import {
  getMistakeLogs,
  type MistakeLogEntry,
} from "../../services/mistakeLogService";
import { useAuth } from "../../context/AuthContext";

/**
 * DesktopTopicHubPage — desktop Topic Hub aligned with the locked
 * topic-focus-lite TopicHubPage prototype.
 *
 * Reference (locked prototype, external to this repo):
 *   chetan-anand-hub/topic-focus-lite — src/pages/TopicHubPage.tsx
 *   chetan-anand-hub/topic-focus-lite — src/components/BackToParent.tsx
 *   chetan-anand-hub/topic-focus-lite — src/components/MistakeIntelligencePanel.tsx
 *   chetan-anand-hub/topic-focus-lite — src/lib/topicHubContent.ts
 *   chetan-anand-hub/topic-focus-lite — src/lib/navigation.ts
 *   chetan-anand-hub/topic-focus-lite — src/lib/topics.ts
 *
 * Composition (matches the locked prototype):
 *   1. BackToParent — text return link to /exam-trends (or honour returnTo).
 *   2. Topic strip — subject/stream/class chips, serif topic name, blurb,
 *      trend tier chip, marks chip, weight visual.
 *   3. Compact action bar — Practice, Worksheet, Predicted Qs,
 *      Add to selection (page-local), More.
 *   4. Recommended next action — single highlighted CTA derived from real
 *      mistake logs for this topic when available, otherwise fallback to
 *      Predicted Qs / Practice based on HPQ availability and trend.
 *   5. Progressive sections (native <details>):
 *        - Board Essentials   — paper blueprint + reference resources.
 *        - How boards use it  — real HPQ rows or honest empty state.
 *        - Mistakes & next    — personal mistakes + board-prep highlights.
 *   6. Right rail — Topic snapshot, Quick hand (reference resources),
 *      Mistake Intelligence card.
 *
 * Data honesty:
 *   - HPQ rows/counts come ONLY from getHighlyProbableQuestions.
 *   - Personal mistakes come ONLY from getMistakeLogs(user.uid, 7).
 *   - topicHubContent is used for reference / blueprint / resources only —
 *     never presented as HPQ data or as personalised learner data.
 *   - Signed-out and no-data states are visible and labelled honestly.
 *   - No fake counts, scores, attempts, progress, or tutor output.
 *
 * Routing:
 *   - All CTAs preserve source=topicHub and returnTo=current topic hub URL
 *     (or the explicit returnTo query param when one is already present).
 *   - Uses production route helpers only; no /app/* React routes.
 *
 * Production constraints:
 *   - Inline styles only (no Tailwind, no shadcn classes).
 *   - Inline SVG only (no lucide-react).
 *   - Light theme tokens shared with DesktopShell + DesktopHome +
 *     DesktopPracticePage + DesktopExamTrendsPage.
 */

// ── Theme tokens ──────────────────────────────────────────────────────────
const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const PRIMARY_GREEN_DARK = "hsl(152, 55%, 32%)";
const PRIMARY_GREEN_SOFT = "hsl(152, 55%, 95%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const TEXT_SUBTLE = "hsl(220, 12%, 58%)";
const BORDER = "hsl(220, 18%, 90%)";
const BORDER_STRONG = "hsl(220, 18%, 82%)";
const CARD_BG = "#ffffff";
const MUTED_BG = "hsl(220, 16%, 96%)";
const SURFACE_TINT = "hsl(220, 30%, 98%)";

const WARNING_FG = "hsl(35, 80%, 35%)";
const WARNING_SOFT = "hsl(43, 90%, 92%)";
const WARNING_BORDER = "hsl(38, 75%, 78%)";

const ACCENT_BLUE = "hsl(212, 70%, 45%)";
const ACCENT_BLUE_SOFT = "hsl(212, 70%, 95%)";

const FONT_DISPLAY =
  '"Fraunces", "Source Serif Pro", Georgia, "Times New Roman", serif';
const FONT_BODY =
  '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

// ── Inline SVG glyphs ─────────────────────────────────────────────────────
const IconStroke: React.CSSProperties = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function IconArrowLeft({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="11 6 5 12 11 18" />
    </svg>
  );
}
function IconArrowRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}
function IconDumbbell({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M6 4v16M2 8v8M18 4v16M22 8v8M6 12h12" />
    </svg>
  );
}
function IconClipboard({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <rect x="6" y="4" width="12" height="18" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}
function IconSparkle({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6z" />
    </svg>
  );
}
function IconAlert({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <line x1="12" y1="16.5" x2="12" y2="16.6" />
    </svg>
  );
}
function IconBookmark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  );
}
function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <polyline points="4 12 10 18 20 6" />
    </svg>
  );
}
function IconChevron({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconHelp({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 4.9.6c0 1.6-2.4 2-2.4 3.4" />
      <line x1="12" y1="17" x2="12" y2="17.1" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────
function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function prettify(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isValidSubject(value: string | undefined): value is DesktopSubject {
  return value === "Maths" || value === "Science";
}

/** Format a Date or ISO string as "DD MMM" relative label for recent mistakes. */
function formatRecentDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const month = d.toLocaleString("en-GB", { month: "short" });
    return `${d.getDate()} ${month}`;
  } catch {
    return "";
  }
}

function trendChipColors(tier: DesktopTopicSummary["trendTier"]): {
  bg: string;
  fg: string;
  border: string;
} {
  if (tier === "high") {
    return { bg: "hsl(0, 80%, 96%)", fg: "hsl(0, 70%, 38%)", border: "hsl(0, 70%, 86%)" };
  }
  if (tier === "medium") {
    return { bg: WARNING_SOFT, fg: WARNING_FG, border: WARNING_BORDER };
  }
  return { bg: MUTED_BG, fg: TEXT_MUTED, border: BORDER };
}

function trendLabel(tier: DesktopTopicSummary["trendTier"]): string {
  if (tier === "high") return "High trend";
  if (tier === "medium") return "Medium trend";
  return "Low trend";
}

// ── Small primitives ──────────────────────────────────────────────────────
function Chip({
  children,
  bg = MUTED_BG,
  fg = TEXT_MUTED,
  border = BORDER,
  size = "sm",
}: {
  children: React.ReactNode;
  bg?: string;
  fg?: string;
  border?: string;
  size?: "sm" | "md";
}) {
  const padding = size === "md" ? "4px 10px" : "2px 8px";
  const fontSize = size === "md" ? 12 : 11;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding,
        fontSize,
        fontWeight: 600,
        lineHeight: 1.2,
        color: fg,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function ButtonLink({
  to,
  variant = "outline",
  icon,
  children,
  title,
}: {
  to: string;
  variant?: "primary" | "outline" | "ghost";
  icon?: React.ReactNode;
  children: React.ReactNode;
  title?: string;
}) {
  const palette = (() => {
    if (variant === "primary") {
      return {
        bg: PRIMARY_GREEN,
        fg: "#ffffff",
        border: PRIMARY_GREEN,
      };
    }
    if (variant === "ghost") {
      return {
        bg: "transparent",
        fg: TEXT_FG,
        border: "transparent",
      };
    }
    return {
      bg: CARD_BG,
      fg: TEXT_FG,
      border: BORDER_STRONG,
    };
  })();

  return (
    <Link
      to={to}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1,
        color: palette.fg,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        textDecoration: "none",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

function Card({
  children,
  padding = 18,
  tint = false,
}: {
  children: React.ReactNode;
  padding?: number;
  tint?: boolean;
}) {
  return (
    <div
      style={{
        background: tint ? SURFACE_TINT : CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        fontFamily: FONT_DISPLAY,
        fontSize: 20,
        fontWeight: 600,
        color: TEXT_FG,
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </h2>
  );
}

function MutedNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 13,
        lineHeight: 1.5,
        color: TEXT_MUTED,
      }}
    >
      {children}
    </p>
  );
}

// ── Topic-not-found state ─────────────────────────────────────────────────
function TopicNotFound({ rawSlug }: { rawSlug: string }) {
  const display = rawSlug ? prettify(rawSlug) : "this topic";
  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "48px 32px 64px",
        fontFamily: FONT_BODY,
        color: TEXT_FG,
      }}
    >
      <Link
        to="/exam-trends"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 600,
          color: TEXT_MUTED,
          textDecoration: "none",
        }}
      >
        <IconArrowLeft />
        <span>Back to Exam Trends</span>
      </Link>

      <Card padding={28}>
        <h1
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 28,
            fontWeight: 600,
            color: TEXT_FG,
            letterSpacing: "-0.01em",
          }}
        >
          Topic not found
        </h1>
        <p
          style={{
            margin: "10px 0 18px",
            fontSize: 14,
            lineHeight: 1.6,
            color: TEXT_MUTED,
          }}
        >
          We couldn&rsquo;t find a curated desktop Topic Hub entry for{" "}
          <strong style={{ color: TEXT_FG }}>{display}</strong>. The desktop
          Topic Hub currently covers a focused set of board-priority topics.
          Use Exam Trends to browse the full board topic list and pick one
          that has a hub.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ButtonLink to="/exam-trends" variant="primary" icon={<IconArrowRight />}>
            Open Exam Trends
          </ButtonLink>
          <ButtonLink to="/practice-hub" variant="outline" icon={<IconDumbbell />}>
            Go to Practice Hub
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}

// ── BackToParent ──────────────────────────────────────────────────────────
function BackToParent({ subject }: { subject: DesktopSubject | null }) {
  const label = subject ? `Back to ${subject} on Exam Trends` : "Back to Exam Trends";
  return (
    <Link
      to="/exam-trends"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
        color: TEXT_MUTED,
        textDecoration: "none",
      }}
    >
      <IconArrowLeft />
      <span>{label}</span>
    </Link>
  );
}

// ── Topic strip ───────────────────────────────────────────────────────────
function TopicStrip({
  topic,
  totalMarks,
}: {
  topic: DesktopTopicSummary;
  totalMarks: number;
}) {
  const trendColors = trendChipColors(topic.trendTier);
  const weightPct = Math.max(4, Math.min(100, topic.weight * 5));

  const subjectLabel =
    topic.subject === "Science" && topic.stream !== "All"
      ? `${topic.subject} · ${topic.stream}`
      : topic.subject;

  return (
    <Card padding={22}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Chip bg={PRIMARY_GREEN_SOFT} fg={PRIMARY_GREEN_DARK} border={"hsl(152, 55%, 82%)"}>
          {subjectLabel}
        </Chip>
        <Chip>Class 10 · CBSE</Chip>
        <Chip
          bg={trendColors.bg}
          fg={trendColors.fg}
          border={trendColors.border}
        >
          {trendLabel(topic.trendTier)}
        </Chip>
        <Chip>{topic.marks}</Chip>
      </div>

      <h1
        style={{
          margin: 0,
          fontFamily: FONT_DISPLAY,
          fontSize: 32,
          fontWeight: 600,
          color: TEXT_FG,
          letterSpacing: "-0.01em",
          lineHeight: 1.15,
        }}
      >
        {topic.name}
      </h1>

      <p
        style={{
          margin: "10px 0 16px",
          fontSize: 14,
          lineHeight: 1.55,
          color: TEXT_MUTED,
          maxWidth: 720,
        }}
      >
        {topic.blurb}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: TEXT_SUBTLE,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Topic weight
        </span>
        <div
          style={{
            position: "relative",
            flex: "1 1 240px",
            minWidth: 180,
            maxWidth: 360,
            height: 8,
            background: MUTED_BG,
            borderRadius: 999,
            overflow: "hidden",
          }}
          aria-label={`Weight ${topic.weight} out of approx 20`}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${weightPct}%`,
              background: PRIMARY_GREEN,
              borderRadius: 999,
            }}
          />
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: TEXT_FG,
          }}
        >
          {topic.weight} pts · ~{totalMarks} marks blueprint
        </span>
      </div>
    </Card>
  );
}

// ── Compact action bar ────────────────────────────────────────────────────
function ActionBar({
  topic,
  routeContext,
  predictedHref,
  selected,
  onToggleSelected,
  onToggleMore,
  moreOpen,
}: {
  topic: DesktopTopicSummary;
  routeContext: DesktopRouteContext;
  predictedHref: string;
  selected: boolean;
  onToggleSelected: () => void;
  onToggleMore: () => void;
  moreOpen: boolean;
}) {
  const practiceHref = buildDesktopPracticePath({
    scope: "topic",
    subject: topic.subject,
    stream: topic.stream,
    topic: topic.slug,
    mode: "practice-set",
    ...routeContext,
  });
  const worksheetHref = buildDesktopWorksheetPath({
    scope: "topic",
    subject: topic.subject,
    stream: topic.stream,
    topic: topic.slug,
    ...routeContext,
  });

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        padding: "12px 16px",
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
      }}
    >
      <ButtonLink to={practiceHref} variant="primary" icon={<IconDumbbell />}>
        Practice this topic
      </ButtonLink>
      <ButtonLink to={worksheetHref} variant="outline" icon={<IconClipboard />}>
        Worksheet
      </ButtonLink>
      <ButtonLink to={predictedHref} variant="outline" icon={<IconSparkle />}>
        Predicted Qs
      </ButtonLink>
      <button
        type="button"
        onClick={onToggleSelected}
        aria-pressed={selected}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1,
          color: selected ? PRIMARY_GREEN_DARK : TEXT_FG,
          background: selected ? PRIMARY_GREEN_SOFT : CARD_BG,
          border: `1px solid ${selected ? "hsl(152, 55%, 75%)" : BORDER_STRONG}`,
          borderRadius: 8,
          cursor: "pointer",
          fontFamily: FONT_BODY,
        }}
        title="Mark this topic as part of your current focus selection (page-local)"
      >
        {selected ? <IconCheck /> : <IconBookmark />}
        <span>{selected ? "In selection" : "Add to selection"}</span>
      </button>
      <div style={{ flex: 1 }} />
      <button
        type="button"
        onClick={onToggleMore}
        aria-expanded={moreOpen}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1,
          color: TEXT_FG,
          background: CARD_BG,
          border: `1px solid ${BORDER_STRONG}`,
          borderRadius: 8,
          cursor: "pointer",
          fontFamily: FONT_BODY,
        }}
      >
        <span>More</span>
        <IconChevron />
      </button>
    </div>
  );
}

function MoreActionsPanel({
  topic,
  routeContext,
  predictedHref,
}: {
  topic: DesktopTopicSummary;
  routeContext: DesktopRouteContext;
  predictedHref: string;
}) {
  const checkHref = buildDesktopCheckPath(topic.slug, routeContext);
  const mistakeAwareHref = buildDesktopWorksheetPath({
    scope: "topic",
    subject: topic.subject,
    stream: topic.stream,
    topic: topic.slug,
    mistakeAware: true,
    ...routeContext,
  });

  return (
    <Card padding={14}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <ButtonLink to={checkHref} variant="outline" icon={<IconCheck />}>
          Check answer
        </ButtonLink>
        <ButtonLink to={mistakeAwareHref} variant="outline" icon={<IconAlert />}>
          Mistake-aware worksheet
        </ButtonLink>
        <ButtonLink to={predictedHref} variant="ghost" icon={<IconArrowRight />}>
          Open full HPQ list
        </ButtonLink>
      </div>
      <p
        style={{
          margin: "10px 0 0",
          fontSize: 12,
          lineHeight: 1.5,
          color: TEXT_SUBTLE,
        }}
      >
        Chapter Test and Mock Builder are part of the older downstream engines
        and stay on their existing surfaces — open them from Practice Hub.
      </p>
    </Card>
  );
}

// ── Recommended next action ───────────────────────────────────────────────
type Recommendation = {
  kind: "mistake-aware" | "predicted" | "practice";
  href: string;
  title: string;
  body: string;
  ctaLabel: string;
  honestNote?: string;
};

function buildRecommendation(args: {
  topic: DesktopTopicSummary;
  routeContext: DesktopRouteContext;
  predictedHref: string;
  hpqCount: number;
  topicMistakeCount: number;
  signedIn: boolean;
  mistakeLogsLoading: boolean;
}): Recommendation {
  const {
    topic,
    routeContext,
    predictedHref,
    hpqCount,
    topicMistakeCount,
    signedIn,
    mistakeLogsLoading,
  } = args;

  if (signedIn && !mistakeLogsLoading && topicMistakeCount > 0) {
    return {
      kind: "mistake-aware",
      href: buildDesktopWorksheetPath({
        scope: "topic",
        subject: topic.subject,
        stream: topic.stream,
        topic: topic.slug,
        mistakeAware: true,
        ...routeContext,
      }),
      title: "Run a mistake-aware worksheet on this topic",
      body: `You have ${topicMistakeCount} logged mistake${topicMistakeCount === 1 ? "" : "s"} on ${topic.name} in the last 7 days. Drill the patterns you actually got wrong.`,
      ctaLabel: "Start mistake-aware worksheet",
    };
  }

  if (hpqCount > 0) {
    return {
      kind: "predicted",
      href: predictedHref,
      title: "Open the predicted questions for this topic",
      body: `${hpqCount} highly probable board-style question${hpqCount === 1 ? "" : "s"} are mapped to ${topic.name}. Working through them is the highest-yield next step.`,
      ctaLabel: "Open predicted questions",
      honestNote: signedIn
        ? undefined
        : "Sign in to also see mistake-aware suggestions tailored to your work.",
    };
  }

  return {
    kind: "practice",
    href: buildDesktopPracticePath({
      scope: "topic",
      subject: topic.subject,
      stream: topic.stream,
      topic: topic.slug,
      mode: "practice-set",
      ...routeContext,
    }),
    title: "Start a focused practice set",
    body: `No predicted-question bucket is currently mapped to ${topic.name}. Begin with a focused practice set; we'll add HPQs and mistake-aware drills here as your data grows.`,
    ctaLabel: "Start practice set",
    honestNote: signedIn
      ? undefined
      : "Sign in to also see mistake-aware suggestions tailored to your work.",
  };
}

function RecommendedNextAction({ rec }: { rec: Recommendation }) {
  return (
    <Card padding={20} tint>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "2px 10px",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: PRIMARY_GREEN_DARK,
            background: PRIMARY_GREEN_SOFT,
            border: `1px solid hsl(152, 55%, 80%)`,
            borderRadius: 999,
          }}
        >
          <IconSparkle />
          Recommended next
        </span>
      </div>
      <h3
        style={{
          margin: 0,
          fontFamily: FONT_DISPLAY,
          fontSize: 18,
          fontWeight: 600,
          color: TEXT_FG,
        }}
      >
        {rec.title}
      </h3>
      <p
        style={{
          margin: "6px 0 14px",
          fontSize: 13,
          lineHeight: 1.55,
          color: TEXT_MUTED,
        }}
      >
        {rec.body}
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <ButtonLink to={rec.href} variant="primary" icon={<IconArrowRight />}>
          {rec.ctaLabel}
        </ButtonLink>
        {rec.honestNote ? (
          <span style={{ fontSize: 12, color: TEXT_SUBTLE }}>{rec.honestNote}</span>
        ) : null}
      </div>
    </Card>
  );
}

// ── Progressive section: Board Essentials ─────────────────────────────────
function BoardEssentialsPanel({
  blueprint,
  totalMarks,
  resources,
}: {
  blueprint: DesktopHubBlueprintSection[];
  totalMarks: number;
  resources: DesktopHubResource[];
}) {
  return (
    <ProgressiveSection
      title="Board Essentials"
      subtitle={`Reference paper blueprint and topic notes — ${totalMarks} marks total across ${blueprint.length} sections.`}
      defaultOpen
    >
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr" }}>
        <div>
          <h4
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              fontWeight: 700,
              color: TEXT_SUBTLE,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Paper blueprint (reference)
          </h4>
          <div style={{ display: "grid", gap: 8 }}>
            {blueprint.map((section) => (
              <div
                key={section.section}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: MUTED_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    fontSize: 13,
                    fontWeight: 700,
                    color: PRIMARY_GREEN_DARK,
                    background: PRIMARY_GREEN_SOFT,
                    border: `1px solid hsl(152, 55%, 80%)`,
                    borderRadius: 6,
                  }}
                >
                  {section.section}
                </span>
                <span style={{ fontSize: 13, color: TEXT_FG }}>{section.description}</span>
                <span style={{ fontSize: 12, color: TEXT_MUTED, fontVariantNumeric: "tabular-nums" }}>
                  {section.count} × {section.marksEach}m = {section.count * section.marksEach}m
                </span>
              </div>
            ))}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: TEXT_SUBTLE }}>
            Reference distribution scaled from this topic&rsquo;s board weight. Not a generated paper.
          </p>
        </div>

        <div>
          <h4
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              fontWeight: 700,
              color: TEXT_SUBTLE,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Topic reference resources
          </h4>
          <div style={{ display: "grid", gap: 8 }}>
            {resources.map((resource) => (
              <div
                key={resource.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "start",
                  gap: 12,
                  padding: "10px 12px",
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: TEXT_FG,
                      lineHeight: 1.35,
                    }}
                  >
                    {resource.label}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 12,
                      color: TEXT_MUTED,
                      lineHeight: 1.5,
                    }}
                  >
                    {resource.blurb}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: TEXT_SUBTLE,
                    whiteSpace: "nowrap",
                  }}
                >
                  ~{resource.estimatedMinutes} min
                </span>
              </div>
            ))}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: TEXT_SUBTLE }}>
            Reference resources only — not generated practice questions.
          </p>
        </div>
      </div>
    </ProgressiveSection>
  );
}

// ── Progressive section: HPQs ─────────────────────────────────────────────
function HPQPanel({
  topic,
  hpqQuestions,
  predictedHref,
}: {
  topic: DesktopTopicSummary;
  hpqQuestions: HPQQuestion[];
  predictedHref: string;
}) {
  const subtitle =
    hpqQuestions.length > 0
      ? `${hpqQuestions.length} highly probable board-style question${hpqQuestions.length === 1 ? "" : "s"} mapped to ${topic.name}.`
      : `No matched HPQs found for ${topic.name} yet.`;

  return (
    <ProgressiveSection
      title="How boards use it · Predicted Questions"
      subtitle={subtitle}
      defaultOpen
    >
      {hpqQuestions.length === 0 ? (
        <Card tint padding={16}>
          <MutedNote>
            No matched HPQs found for this topic yet. Open Highly Probable
            Questions for the full subject list.
          </MutedNote>
          <div style={{ marginTop: 12 }}>
            <ButtonLink to={predictedHref} variant="outline" icon={<IconArrowRight />}>
              Open Highly Probable Questions
            </ButtonLink>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {hpqQuestions.slice(0, 5).map((q, idx) => (
            <HPQRow key={q.id || `${idx}-${q.question.slice(0, 20)}`} q={q} />
          ))}
          {hpqQuestions.length > 5 ? (
            <div style={{ marginTop: 4 }}>
              <ButtonLink to={predictedHref} variant="ghost" icon={<IconArrowRight />}>
                See all {hpqQuestions.length} predicted questions
              </ButtonLink>
            </div>
          ) : null}
        </div>
      )}
    </ProgressiveSection>
  );
}

function HPQRow({ q }: { q: HPQQuestion }) {
  const likelihoodColor = (() => {
    if (q.likelihood === "Very High") {
      return { bg: "hsl(0, 80%, 96%)", fg: "hsl(0, 70%, 38%)", border: "hsl(0, 70%, 86%)" };
    }
    if (q.likelihood === "High") {
      return { bg: WARNING_SOFT, fg: WARNING_FG, border: WARNING_BORDER };
    }
    if (q.likelihood === "Medium-High") {
      return { bg: ACCENT_BLUE_SOFT, fg: ACCENT_BLUE, border: "hsl(212, 70%, 85%)" };
    }
    return { bg: MUTED_BG, fg: TEXT_MUTED, border: BORDER };
  })();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "start",
        padding: "10px 12px",
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13,
            color: TEXT_FG,
            lineHeight: 1.45,
          }}
        >
          {q.question}
        </div>
        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {q.section ? <Chip>Section {q.section}</Chip> : null}
          {typeof q.marks === "number" ? <Chip>{q.marks} mark{q.marks === 1 ? "" : "s"}</Chip> : null}
          {q.difficulty ? <Chip>{q.difficulty}</Chip> : null}
          <Chip
            bg={likelihoodColor.bg}
            fg={likelihoodColor.fg}
            border={likelihoodColor.border}
          >
            {q.likelihood}
          </Chip>
        </div>
      </div>
    </div>
  );
}

// ── Progressive section: Mistakes & next action ───────────────────────────
function MistakesPanel({
  topic,
  highlights,
  signedIn,
  mistakeLogsLoading,
  topicMistakes,
  mistakeAwareHref,
}: {
  topic: DesktopTopicSummary;
  highlights: DesktopHubHighlight[];
  signedIn: boolean;
  mistakeLogsLoading: boolean;
  topicMistakes: MistakeLogEntry[];
  mistakeAwareHref: string;
}) {
  const personalSubtitle = (() => {
    if (!signedIn) return "Sign in to track and review your mistakes on this topic.";
    if (mistakeLogsLoading) return "Loading your last 7 days of mistakes…";
    if (topicMistakes.length === 0) {
      return `No mistakes logged on ${topic.name} in the last 7 days.`;
    }
    return `${topicMistakes.length} mistake${topicMistakes.length === 1 ? "" : "s"} logged on ${topic.name} in the last 7 days.`;
  })();

  return (
    <ProgressiveSection
      title="Mistakes &amp; next action"
      subtitle={personalSubtitle}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <h4
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              fontWeight: 700,
              color: TEXT_SUBTLE,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Your recent mistakes (last 7 days)
          </h4>
          {!signedIn ? (
            <Card tint padding={14}>
              <MutedNote>
                You&rsquo;re viewing this Topic Hub signed out. Sign in so we
                can show your real mistakes from the last 7 days here — we
                don&rsquo;t make up examples.
              </MutedNote>
              <div style={{ marginTop: 10 }}>
                <ButtonLink to="/login" variant="outline" icon={<IconArrowRight />}>
                  Sign in
                </ButtonLink>
              </div>
            </Card>
          ) : mistakeLogsLoading ? (
            <Card tint padding={14}>
              <MutedNote>Loading your mistake log…</MutedNote>
            </Card>
          ) : topicMistakes.length === 0 ? (
            <Card tint padding={14}>
              <MutedNote>
                You haven&rsquo;t logged any mistakes on {topic.name} in the
                last 7 days. Once you check answers in Practice or Worksheet,
                they&rsquo;ll appear here.
              </MutedNote>
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {topicMistakes.slice(0, 4).map((entry) => (
                <MistakeRow key={entry.id} entry={entry} />
              ))}
              <div style={{ marginTop: 4 }}>
                <ButtonLink to={mistakeAwareHref} variant="primary" icon={<IconAlert />}>
                  Drill these patterns
                </ButtonLink>
              </div>
            </div>
          )}
        </div>

        {highlights.length > 0 ? (
          <div>
            <h4
              style={{
                margin: "0 0 8px",
                fontSize: 12,
                fontWeight: 700,
                color: TEXT_SUBTLE,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Common board prep guidance
            </h4>
            <div style={{ display: "grid", gap: 8 }}>
              {highlights.map((h) => (
                <div
                  key={h.id}
                  style={{
                    padding: "10px 12px",
                    background: CARD_BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_FG }}>
                    {h.label}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: TEXT_MUTED,
                      lineHeight: 1.5,
                    }}
                  >
                    {h.rationale}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: TEXT_SUBTLE }}>
              Common guidance from board prep reference — not your personal mistakes.
            </p>
          </div>
        ) : null}
      </div>
    </ProgressiveSection>
  );
}

function MistakeRow({ entry }: { entry: MistakeLogEntry }) {
  const date = formatRecentDate(entry.timestamp);
  const dominant = (() => {
    const counts = entry.mistakeCounts;
    const entries: Array<[string, number]> = [
      ["conceptual", counts.conceptual],
      ["calculation", counts.calculation],
      ["silly", counts.silly],
      ["presentation", counts.presentation],
    ];
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][1] > 0 ? entries[0][0] : null;
  })();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "start",
        padding: "10px 12px",
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13,
            color: TEXT_FG,
            lineHeight: 1.45,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {entry.questionText || "Untitled question"}
        </div>
        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {date ? <Chip>{date}</Chip> : null}
          <Chip>
            -{entry.marksLost}/{entry.totalMarks} marks
          </Chip>
          {dominant ? <Chip>{dominant}</Chip> : null}
        </div>
      </div>
    </div>
  );
}

// ── Progressive section primitive ─────────────────────────────────────────
function ProgressiveSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: "16px 20px",
      }}
    >
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 12,
          outline: "none",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <SectionTitle>{title}</SectionTitle>
          {subtitle ? (
            <div
              style={{
                marginTop: 2,
                fontSize: 12,
                color: TEXT_MUTED,
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            color: TEXT_MUTED,
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            background: MUTED_BG,
          }}
          aria-hidden
        >
          <IconChevron />
        </span>
      </summary>
      <div style={{ marginTop: 14 }}>{children}</div>
    </details>
  );
}

// ── Right rail: Topic snapshot ────────────────────────────────────────────
function TopicSnapshotCard({
  topic,
  totalMarks,
}: {
  topic: DesktopTopicSummary;
  totalMarks: number;
}) {
  const trendColors = trendChipColors(topic.trendTier);
  const subjectLabel =
    topic.subject === "Science" && topic.stream !== "All"
      ? `${topic.subject} · ${topic.stream}`
      : topic.subject;

  return (
    <Card padding={18}>
      <h3
        style={{
          margin: 0,
          fontFamily: FONT_DISPLAY,
          fontSize: 16,
          fontWeight: 600,
          color: TEXT_FG,
        }}
      >
        Topic snapshot
      </h3>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <SnapshotRow label="Subject" value={subjectLabel} />
        <SnapshotRow label="Trend" value={trendLabel(topic.trendTier)} valueColor={trendColors.fg} />
        <SnapshotRow label="Weight" value={`${topic.weight} pts`} />
        <SnapshotRow label="Marks band" value={topic.marks} />
        <SnapshotRow label="Blueprint" value={`${totalMarks} marks reference`} />
      </div>
      <p
        style={{
          margin: "12px 0 0",
          fontSize: 12,
          color: TEXT_SUBTLE,
          lineHeight: 1.5,
        }}
      >
        {topic.blurb}
      </p>
    </Card>
  );
}

function SnapshotRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        fontSize: 13,
      }}
    >
      <span style={{ color: TEXT_SUBTLE, fontWeight: 600 }}>{label}</span>
      <span style={{ color: valueColor ?? TEXT_FG, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ── Right rail: Quick hand ────────────────────────────────────────────────
function QuickHandCard({
  topic,
  resources,
  routeContext,
}: {
  topic: DesktopTopicSummary;
  resources: DesktopHubResource[];
  routeContext: DesktopRouteContext;
}) {
  const conceptResource = resources.find((r) => r.kind === "concept-note") ?? resources[0];
  const checkHref = buildDesktopCheckPath(topic.slug, routeContext);

  return (
    <Card padding={18}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: ACCENT_BLUE }}>
          <IconHelp />
        </span>
        <h3
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 16,
            fontWeight: 600,
            color: TEXT_FG,
          }}
        >
          Need a quick hand?
        </h3>
      </div>
      <p
        style={{
          margin: "8px 0 12px",
          fontSize: 13,
          lineHeight: 1.5,
          color: TEXT_MUTED,
        }}
      >
        {conceptResource
          ? `Skim the ${topic.name} reference notes, then bring a specific question to Check Answer for written feedback.`
          : `Bring a specific ${topic.name} question to Check Answer for written feedback.`}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {conceptResource ? (
          <span
            style={{
              fontSize: 12,
              color: TEXT_SUBTLE,
              padding: "8px 10px",
              background: MUTED_BG,
              border: `1px dashed ${BORDER_STRONG}`,
              borderRadius: 8,
            }}
            title="Reference resource preview only"
          >
            <strong style={{ color: TEXT_FG }}>{conceptResource.label}</strong>
            {" · "}
            ~{conceptResource.estimatedMinutes} min reference
          </span>
        ) : null}
        <ButtonLink to={checkHref} variant="outline" icon={<IconCheck />}>
          Open Check Answer
        </ButtonLink>
      </div>
    </Card>
  );
}

// ── Right rail: Mistake Intelligence ──────────────────────────────────────
function MistakeIntelligenceCard({
  topic,
  signedIn,
  mistakeLogsLoading,
  topicMistakeCount,
  totalMistakeCount,
  mistakeAwareHref,
}: {
  topic: DesktopTopicSummary;
  signedIn: boolean;
  mistakeLogsLoading: boolean;
  topicMistakeCount: number;
  totalMistakeCount: number;
  mistakeAwareHref: string;
}) {
  const body: React.ReactNode = (() => {
    if (!signedIn) {
      return (
        <>
          <MutedNote>
            Mistake Intelligence reviews your last 7 days of checked answers.
            Sign in to see real, personalised guidance — we don&rsquo;t show
            sample mistakes here.
          </MutedNote>
          <div style={{ marginTop: 12 }}>
            <ButtonLink to="/login" variant="outline" icon={<IconArrowRight />}>
              Sign in
            </ButtonLink>
          </div>
        </>
      );
    }
    if (mistakeLogsLoading) {
      return <MutedNote>Loading your last 7 days of mistakes…</MutedNote>;
    }
    if (topicMistakeCount === 0) {
      return (
        <>
          <MutedNote>
            No mistakes logged on {topic.name} in the last 7 days
            {totalMistakeCount > 0
              ? ` (you have ${totalMistakeCount} on other topics).`
              : "."}
            {" "}When you check answers, your weak spots will surface here.
          </MutedNote>
          <div style={{ marginTop: 12 }}>
            <ButtonLink to={mistakeAwareHref} variant="outline" icon={<IconAlert />}>
              Try a mistake-aware worksheet
            </ButtonLink>
          </div>
        </>
      );
    }
    return (
      <>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.5,
            color: WARNING_FG,
            fontWeight: 600,
          }}
        >
          {topicMistakeCount} logged mistake{topicMistakeCount === 1 ? "" : "s"} on {topic.name} in the last 7 days.
        </p>
        <p style={{ margin: "6px 0 12px", fontSize: 12, color: TEXT_MUTED }}>
          Drill the exact patterns you got wrong. Real data from your check-answer history.
        </p>
        <ButtonLink to={mistakeAwareHref} variant="primary" icon={<IconAlert />}>
          Run targeted drill
        </ButtonLink>
      </>
    );
  })();

  return (
    <div
      style={{
        background: WARNING_SOFT,
        border: `1px solid ${WARNING_BORDER}`,
        borderLeft: `4px solid ${WARNING_FG}`,
        borderRadius: 12,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: WARNING_FG }}>
          <IconAlert />
        </span>
        <h3
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 16,
            fontWeight: 600,
            color: TEXT_FG,
          }}
        >
          Mistake Intelligence
        </h3>
      </div>
      {body}
    </div>
  );
}

// ── Topic resolution + URL helpers ────────────────────────────────────────
function resolveTopicSlug(args: {
  pathTopicKey?: string;
  pathTopicName?: string;
  queryTopic?: string;
}): string {
  const raw = args.pathTopicKey ?? args.pathTopicName ?? args.queryTopic ?? "";
  if (!raw) return "";
  return desktopTopicSlugFromName(raw);
}

function buildPredictedHref(args: {
  grade: string;
  subject: DesktopSubject;
  topicSlug: string;
  routeContext: DesktopRouteContext;
}): string {
  const { grade, subject, topicSlug, routeContext } = args;
  const params = new URLSearchParams();
  params.set("topic", topicSlug);
  if (routeContext.source) params.set("source", routeContext.source);
  if (routeContext.returnTo) params.set("returnTo", routeContext.returnTo);
  return `/highly-probable/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}?${params.toString()}`;
}

function findHpqBucketForTopic(
  topic: DesktopTopicSummary,
): HPQTopicBucket | undefined {
  const stream = topic.subject === "Science" && topic.stream !== "All" ? topic.stream : undefined;
  const buckets = getHighlyProbableQuestions(topic.subject, stream);
  const wantedSlug = topic.slug;
  return buckets.find((bucket) => {
    const bucketSlug = desktopTopicSlugFromName(bucket.topic);
    if (bucketSlug === wantedSlug) return true;
    return normalise(bucket.topic) === wantedSlug;
  });
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function DesktopTopicHubPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const params = useParams<{
    grade?: string;
    subject?: string;
    topicKey?: string;
    topicName?: string;
  }>();

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const topicSlug = useMemo(
    () =>
      resolveTopicSlug({
        pathTopicKey: params.topicKey,
        pathTopicName: params.topicName,
        queryTopic: queryParams.get("topic") ?? undefined,
      }),
    [params.topicKey, params.topicName, queryParams],
  );

  const topic = useMemo(() => (topicSlug ? desktopTopicBySlug(topicSlug) : undefined), [topicSlug]);

  const content: DesktopTopicHubContent | undefined = useMemo(
    () => (topic ? desktopTopicHubContentBySlug(topic.slug) : undefined),
    [topic],
  );

  // Build current URL for returnTo. Honour an explicit returnTo only if the
  // request is already in-flight from a different surface (we still default
  // to the current Topic Hub URL otherwise).
  const currentUrl = useMemo(() => `${location.pathname}${location.search}`, [location.pathname, location.search]);
  const explicitReturnTo = queryParams.get("returnTo");
  const returnTo = explicitReturnTo && explicitReturnTo.length > 0 ? explicitReturnTo : currentUrl;
  const routeContext: DesktopRouteContext = useMemo(
    () => ({ source: "topicHub", returnTo }),
    [returnTo],
  );

  const grade = params.grade && params.grade.length > 0 ? params.grade : "10";

  // ── Real HPQ lookup (empty array if no curated topic match) ────────────
  const hpqBucket = useMemo(() => (topic ? findHpqBucketForTopic(topic) : undefined), [topic]);
  const hpqQuestions = hpqBucket?.questions ?? [];

  // ── Real mistake-log lookup (signed-in users only) ─────────────────────
  const [mistakeLogs, setMistakeLogs] = useState<MistakeLogEntry[]>([]);
  const [mistakeLogsLoading, setMistakeLogsLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const uid = user?.uid;
    if (!uid) {
      setMistakeLogs([]);
      setMistakeLogsLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setMistakeLogsLoading(true);
    getMistakeLogs(uid, 7)
      .then((entries) => {
        if (cancelled) return;
        setMistakeLogs(entries);
      })
      .catch(() => {
        if (cancelled) return;
        setMistakeLogs([]);
      })
      .finally(() => {
        if (cancelled) return;
        setMistakeLogsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const topicMistakes = useMemo(() => {
    if (!topic) return [];
    const wanted = topic.slug;
    return mistakeLogs.filter((entry) => {
      const candidate = entry.topic ? desktopTopicSlugFromName(entry.topic) : "";
      if (candidate === wanted) return true;
      return entry.topic ? normalise(entry.topic) === wanted : false;
    });
  }, [mistakeLogs, topic]);

  // ── Page-local UI state (selection + more) ─────────────────────────────
  const [selected, setSelected] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const handleToggleSelected = useCallback(() => setSelected((prev) => !prev), []);
  const handleToggleMore = useCallback(() => setMoreOpen((prev) => !prev), []);

  // ── Topic-not-found gate ───────────────────────────────────────────────
  if (!topic || !content) {
    return (
      <TopicNotFound
        rawSlug={topicSlug || params.topicKey || params.topicName || queryParams.get("topic") || ""}
      />
    );
  }

  // Subject for back-link narrative (from URL params if valid, else topic).
  const backSubject: DesktopSubject =
    isValidSubject(params.subject) ? params.subject : topic.subject;

  const predictedHref = buildPredictedHref({
    grade,
    subject: topic.subject,
    topicSlug: topic.slug,
    routeContext,
  });

  const mistakeAwareHref = buildDesktopWorksheetPath({
    scope: "topic",
    subject: topic.subject,
    stream: topic.stream,
    topic: topic.slug,
    mistakeAware: true,
    ...routeContext,
  });

  const recommendation = buildRecommendation({
    topic,
    routeContext,
    predictedHref,
    hpqCount: hpqQuestions.length,
    topicMistakeCount: topicMistakes.length,
    signedIn: Boolean(user?.uid),
    mistakeLogsLoading,
  });

  // Suppress unused-warning for `navigate` (kept available for future routes).
  void navigate;

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "24px clamp(16px, 4vw, 32px) 64px",
        fontFamily: FONT_BODY,
        color: TEXT_FG,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <BackToParent subject={backSubject} />
      </div>

      {/* Two-column desktop layout collapses to single column under ~960px */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 320px)",
          gap: 24,
          alignItems: "start",
        }}
        className="desktop-topic-hub-grid"
      >
        {/* Main column */}
        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          <TopicStrip topic={topic} totalMarks={content.totalMarks} />

          <ActionBar
            topic={topic}
            routeContext={routeContext}
            predictedHref={predictedHref}
            selected={selected}
            onToggleSelected={handleToggleSelected}
            onToggleMore={handleToggleMore}
            moreOpen={moreOpen}
          />

          {moreOpen ? (
            <MoreActionsPanel
              topic={topic}
              routeContext={routeContext}
              predictedHref={predictedHref}
            />
          ) : null}

          <RecommendedNextAction rec={recommendation} />

          <BoardEssentialsPanel
            blueprint={content.blueprint}
            totalMarks={content.totalMarks}
            resources={content.resources}
          />

          <HPQPanel
            topic={topic}
            hpqQuestions={hpqQuestions}
            predictedHref={predictedHref}
          />

          <MistakesPanel
            topic={topic}
            highlights={content.highlights}
            signedIn={Boolean(user?.uid)}
            mistakeLogsLoading={mistakeLogsLoading}
            topicMistakes={topicMistakes}
            mistakeAwareHref={mistakeAwareHref}
          />
        </div>

        {/* Right rail */}
        <aside style={{ display: "grid", gap: 16, minWidth: 0 }}>
          <TopicSnapshotCard topic={topic} totalMarks={content.totalMarks} />
          <QuickHandCard
            topic={topic}
            resources={content.resources}
            routeContext={routeContext}
          />
          <MistakeIntelligenceCard
            topic={topic}
            signedIn={Boolean(user?.uid)}
            mistakeLogsLoading={mistakeLogsLoading}
            topicMistakeCount={topicMistakes.length}
            totalMistakeCount={mistakeLogs.length}
            mistakeAwareHref={mistakeAwareHref}
          />
        </aside>
      </div>

      {/* Narrow-viewport collapse: stack the right rail under the main column. */}
      <style>{`
        @media (max-width: 960px) {
          .desktop-topic-hub-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
