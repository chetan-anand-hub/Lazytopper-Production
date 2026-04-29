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
  buildActionableDesktopTopicHubContent,
  type ActionableTopicHubContent,
  type BoardConcept,
  type FormulaUseCard,
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
 * DesktopTopicHubPage — desktop Topic Hub, locked-prototype parity (PR-I1).
 *
 * Reference (locked prototype, external to this repo):
 *   chetan-anand-hub/topic-focus-lite — src/pages/TopicHubPage.tsx
 *   chetan-anand-hub/topic-focus-lite — src/lib/topicHubContent.ts
 *
 * Composition (matches the locked prototype):
 *   1. BackToParent — honours an explicit returnTo query param when present;
 *      otherwise returns to Exam Trends.
 *   2. Topic strip — subject/stream/class chips, serif topic name, blurb,
 *      trend chip, marks chip, weight visual, sample-preview note when the
 *      actionable content is a sample-preview fallback.
 *   3. Compact action bar — Practice, Worksheet, Predicted Qs,
 *      Add to selection, More.
 *   4. More menu/panel — Chapter Test, Check answer, mistake-aware worksheet.
 *   5. Recommended next action — single highlighted CTA derived from real
 *      mistake logs (when signed in) → real HPQs → focused practice.
 *   6. Board Essentials — open by default. Concept rows from the actionable
 *      content with Practise-this CTAs and show-all behaviour over 3 rows.
 *   7. How boards use it — collapsed by default. Marquee formula/definition
 *      card + use cases + common trap + the rest of the formula-use map (when
 *      seeded) + an HPQ compact card driven only by real getHighlyProbableQuestions
 *      data (or an honest no-HPQ state).
 *   8. Mistakes & next action — collapsed by default. Reference common mistake
 *      and examiner warning + targeted drill/worksheet actions. Personal
 *      mistake rows appear only when getMistakeLogs returns rows for this
 *      exact topic.
 *   9. Right rail — Topic snapshot, Need a quick hand (three local support
 *      panels — Explain concept / Show visual / Mini check), Mistake
 *      Intelligence (real personal data only).
 *
 * Data honesty:
 *   - HPQ rows/counts come ONLY from getHighlyProbableQuestions.
 *   - Personal mistakes come ONLY from getMistakeLogs(user.uid, 7).
 *   - actionable content is reference / board-prep guidance only — never
 *     presented as HPQ data or as personalised learner data.
 *   - Sample-preview content (built from the topic blurb when a topic is not
 *     hand-seeded) is labelled clearly on screen.
 *   - Quick-hand support panels (Explain concept / Show visual / Mini check)
 *     are static reference content and are labelled as optional support —
 *     never presented as AI tutor output, generated practice, or personalised
 *     diagnosis.
 *
 * Routing:
 *   - All CTAs preserve source=topicHub and returnTo=current Topic Hub URL
 *     (or the explicit returnTo query param when one is already present).
 *   - Uses production route helpers only; no /app/* React routes.
 *   - Chapter Test routes to the existing /chapter-test/:grade/:subject/:topicKey
 *     React route used by DesktopPracticePage and the legacy mobile pages.
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
function IconBook({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M4 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H4z" />
      <path d="M20 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
function IconEye({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconQuestion({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M9 10a3 3 0 0 1 6 0c0 1.5-3 2-3 3" />
      <line x1="12" y1="15" x2="12" y2="15.1" />
    </svg>
  );
}
function IconClipboardList({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <rect x="6" y="4" width="12" height="18" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 11h6M9 15h6M9 19h4" />
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

function formulaCardKindLabel(kind: FormulaUseCard["kind"]): string {
  if (kind === "identity") return "Identity";
  if (kind === "definition") return "Definition";
  if (kind === "law") return "Law";
  if (kind === "process") return "Process";
  return "Formula";
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

function PlainButton({
  onClick,
  active,
  icon,
  children,
  title,
  ariaPressed,
}: {
  onClick: () => void;
  active?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  ariaPressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1,
        color: active ? PRIMARY_GREEN_DARK : TEXT_FG,
        background: active ? PRIMARY_GREEN_SOFT : CARD_BG,
        border: `1px solid ${active ? "hsl(152, 55%, 75%)" : BORDER_STRONG}`,
        borderRadius: 8,
        cursor: "pointer",
        fontFamily: FONT_BODY,
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
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

function SampleNoteChip() {
  return (
    <Chip bg={ACCENT_BLUE_SOFT} fg={ACCENT_BLUE} border={"hsl(212, 70%, 85%)"}>
      Sample preview
    </Chip>
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
function BackToParent({
  subject,
  explicitReturnTo,
}: {
  subject: DesktopSubject | null;
  explicitReturnTo: string | null;
}) {
  const target = explicitReturnTo && explicitReturnTo.length > 0
    ? explicitReturnTo
    : "/exam-trends";
  const label = explicitReturnTo
    ? "Back"
    : subject
      ? `Back to ${subject} on Exam Trends`
      : "Back to Exam Trends";
  return (
    <Link
      to={target}
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
  isSamplePreview,
}: {
  topic: DesktopTopicSummary;
  isSamplePreview: boolean;
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
        {isSamplePreview ? <SampleNoteChip /> : null}
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
          {topic.weight} pts · {topic.marks} blueprint band
        </span>
      </div>

      {isSamplePreview ? (
        <p style={{ margin: "12px 0 0", fontSize: 12, color: TEXT_SUBTLE, lineHeight: 1.5 }}>
          Reference outline derived from this topic&rsquo;s blurb. Hand-curated
          board guidance is not seeded for this topic yet.
        </p>
      ) : null}
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
      <PlainButton
        onClick={onToggleSelected}
        active={selected}
        ariaPressed={selected}
        icon={selected ? <IconCheck /> : <IconBookmark />}
        title="Mark this topic as part of your current focus selection (page-local)"
      >
        {selected ? "In selection" : "Add to selection"}
      </PlainButton>
      <div style={{ flex: 1 }} />
      <PlainButton
        onClick={onToggleMore}
        ariaPressed={moreOpen}
        icon={<IconChevron />}
      >
        More
      </PlainButton>
    </div>
  );
}

function MoreActionsPanel({
  topic,
  grade,
  routeContext,
}: {
  topic: DesktopTopicSummary;
  grade: string;
  routeContext: DesktopRouteContext;
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
  const chapterTestHref = buildChapterTestPath({
    grade,
    subject: topic.subject,
    topicSlug: topic.slug,
    routeContext,
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
        <ButtonLink to={chapterTestHref} variant="outline" icon={<IconClipboardList />}>
          Chapter Test
        </ButtonLink>
        <ButtonLink to={checkHref} variant="outline" icon={<IconCheck />}>
          Check answer
        </ButtonLink>
        <ButtonLink to={mistakeAwareHref} variant="outline" icon={<IconAlert />}>
          Mistake-aware worksheet
        </ButtonLink>
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 12, color: TEXT_SUBTLE, lineHeight: 1.5 }}>
        Chapter Test opens the existing /chapter-test engine on this topic.
        Check answer opens Check &amp; Improve scoped to {topic.name}.
        Mistake-aware worksheet uses your real Check &amp; Improve history when signed in.
      </p>
    </Card>
  );
}

// ── Recommended next action ───────────────────────────────────────────────
interface Recommendation {
  label: string;
  rationale: string;
  href: string;
  icon: React.ReactNode;
  variant: "primary" | "outline";
  honestNote?: string;
}

function buildRecommendation(args: {
  topic: DesktopTopicSummary;
  routeContext: DesktopRouteContext;
  predictedHref: string;
  hpqCount: number;
  topicMistakeCount: number;
  signedIn: boolean;
  mistakeLogsLoading: boolean;
}): Recommendation {
  const { topic, routeContext, predictedHref, hpqCount, topicMistakeCount, signedIn, mistakeLogsLoading } = args;
  const practiceHref = buildDesktopPracticePath({
    scope: "topic",
    subject: topic.subject,
    stream: topic.stream,
    topic: topic.slug,
    mode: "practice-set",
    ...routeContext,
  });
  const mistakeWorksheetHref = buildDesktopWorksheetPath({
    scope: "topic",
    subject: topic.subject,
    stream: topic.stream,
    topic: topic.slug,
    mistakeAware: true,
    ...routeContext,
  });

  if (signedIn && !mistakeLogsLoading && topicMistakeCount > 0) {
    return {
      label: "Run a mistake-aware worksheet",
      rationale: `You have ${topicMistakeCount} logged mistake${topicMistakeCount === 1 ? "" : "s"} on ${topic.name} in the last 7 days. Drill the exact patterns first.`,
      href: mistakeWorksheetHref,
      icon: <IconAlert />,
      variant: "primary",
    };
  }

  if (hpqCount > 0) {
    return {
      label: "Open Predicted Questions",
      rationale: `${hpqCount} highly probable board-style question${hpqCount === 1 ? "" : "s"} are mapped to ${topic.name}.`,
      href: predictedHref,
      icon: <IconSparkle />,
      variant: "primary",
    };
  }

  return {
    label: "Start focused practice",
    rationale: `${topic.name} doesn't have any matched HPQs yet. Begin with a focused practice set on this topic.`,
    href: practiceHref,
    icon: <IconDumbbell />,
    variant: "primary",
    honestNote: "No matched HPQs — falling back to topic-level practice.",
  };
}

function RecommendedNextAction({ rec }: { rec: Recommendation }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        padding: "14px 18px",
        background: PRIMARY_GREEN_SOFT,
        border: `1px solid hsl(152, 55%, 82%)`,
        borderRadius: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 280px", minWidth: 200 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: PRIMARY_GREEN_DARK,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Recommended next
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 14,
            fontWeight: 600,
            color: TEXT_FG,
            lineHeight: 1.4,
          }}
        >
          {rec.rationale}
        </div>
        {rec.honestNote ? (
          <div style={{ marginTop: 4, fontSize: 12, color: TEXT_SUBTLE }}>
            {rec.honestNote}
          </div>
        ) : null}
      </div>
      <ButtonLink to={rec.href} variant={rec.variant} icon={rec.icon}>
        {rec.label}
      </ButtonLink>
    </div>
  );
}

// ── Board Essentials section ──────────────────────────────────────────────
function BoardEssentialsPanel({
  topic,
  boardEssentials,
  isSamplePreview,
  practiceHref,
}: {
  topic: DesktopTopicSummary;
  boardEssentials: BoardConcept[];
  isSamplePreview: boolean;
  practiceHref: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? boardEssentials : boardEssentials.slice(0, 3);
  const hasMore = boardEssentials.length > 3;
  const subtitle = isSamplePreview
    ? `Reference outline based on the ${topic.name} blurb — sample preview.`
    : `Concept rows examiners come back to for ${topic.name}.`;

  return (
    <ProgressiveSection
      title="Board Essentials"
      subtitle={subtitle}
      defaultOpen
    >
      <div style={{ display: "grid", gap: 10 }}>
        {visible.map((concept, idx) => (
          <BoardConceptRow
            key={`${concept.name}-${idx}`}
            concept={concept}
            practiceHref={practiceHref}
          />
        ))}
      </div>
      {hasMore ? (
        <div style={{ marginTop: 12 }}>
          <PlainButton
            onClick={() => setShowAll((p) => !p)}
            icon={<IconChevron />}
          >
            {showAll
              ? "Show fewer concepts"
              : `Show all ${boardEssentials.length} concepts`}
          </PlainButton>
        </div>
      ) : null}
      {isSamplePreview ? (
        <p style={{ margin: "10px 0 0", fontSize: 12, color: TEXT_SUBTLE }}>
          Sample preview — confirm specific concepts from your textbook before relying on this list.
        </p>
      ) : null}
    </ProgressiveSection>
  );
}

function BoardConceptRow({
  concept,
  practiceHref,
}: {
  concept: BoardConcept;
  practiceHref: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "start",
        padding: "12px 14px",
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: TEXT_FG,
              lineHeight: 1.35,
            }}
          >
            {concept.name}
          </div>
          <Chip>{concept.marks} marks</Chip>
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            color: TEXT_MUTED,
            lineHeight: 1.5,
          }}
        >
          {concept.oneLineUse}
        </div>
      </div>
      <div style={{ alignSelf: "center" }}>
        <ButtonLink
          to={practiceHref}
          variant="outline"
          icon={<IconDumbbell />}
          title={`Practise this concept on ${concept.name}`}
        >
          Practise this
        </ButtonLink>
      </div>
    </div>
  );
}

// ── How boards use it section ─────────────────────────────────────────────
function HowBoardsUseItPanel({
  topic,
  formulaUsePreview,
  fullFormulaUseMap,
  hpqQuestions,
  predictedHref,
  isSamplePreview,
}: {
  topic: DesktopTopicSummary;
  formulaUsePreview: FormulaUseCard;
  fullFormulaUseMap: FormulaUseCard[];
  hpqQuestions: HPQQuestion[];
  predictedHref: string;
  isSamplePreview: boolean;
}) {
  const subtitle = `How ${topic.name} typically shows up in board questions, plus real predicted questions when available.`;

  return (
    <ProgressiveSection title="How boards use it" subtitle={subtitle}>
      <div style={{ display: "grid", gap: 16 }}>
        <FormulaCardView card={formulaUsePreview} marquee />

        {fullFormulaUseMap.length > 0 ? (
          <details
            style={{
              background: SURFACE_TINT,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <summary
              style={{
                listStyle: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 13,
                fontWeight: 600,
                color: TEXT_FG,
              }}
            >
              <span>Full formula-use map ({fullFormulaUseMap.length} more)</span>
              <IconChevron />
            </summary>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              {fullFormulaUseMap.map((card, idx) => (
                <FormulaCardView key={`${card.title}-${idx}`} card={card} />
              ))}
            </div>
          </details>
        ) : null}

        <HPQCompactCard
          topic={topic}
          hpqQuestions={hpqQuestions}
          predictedHref={predictedHref}
        />

        {isSamplePreview ? (
          <p style={{ margin: 0, fontSize: 12, color: TEXT_SUBTLE }}>
            Sample preview formula-use card — verify exact wording and conditions
            from your textbook.
          </p>
        ) : null}
      </div>
    </ProgressiveSection>
  );
}

function FormulaCardView({
  card,
  marquee = false,
}: {
  card: FormulaUseCard;
  marquee?: boolean;
}) {
  return (
    <div
      style={{
        background: marquee ? PRIMARY_GREEN_SOFT : CARD_BG,
        border: `1px solid ${marquee ? "hsl(152, 55%, 82%)" : BORDER}`,
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <Chip
          bg={marquee ? PRIMARY_GREEN : MUTED_BG}
          fg={marquee ? "#ffffff" : TEXT_MUTED}
          border={marquee ? PRIMARY_GREEN : BORDER}
        >
          {formulaCardKindLabel(card.kind)}
        </Chip>
        <h3
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 16,
            fontWeight: 600,
            color: TEXT_FG,
            lineHeight: 1.3,
          }}
        >
          {card.title}
        </h3>
      </div>
      <div>
        <h4
          style={{
            margin: "10px 0 6px",
            fontSize: 11,
            fontWeight: 700,
            color: TEXT_SUBTLE,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          When to use
        </h4>
        <ul style={{ margin: "0 0 8px", paddingInlineStart: 18, color: TEXT_MUTED, fontSize: 13, lineHeight: 1.55 }}>
          {card.whenToUse.map((u, idx) => (
            <li key={idx} style={{ marginBottom: 2 }}>{u}</li>
          ))}
        </ul>
      </div>
      {card.directUse ? (
        <FormulaSubField label="Direct use" value={card.directUse} />
      ) : null}
      {card.hiddenUse ? (
        <FormulaSubField label="Hidden / setup use" value={card.hiddenUse} />
      ) : null}
      {card.combinedUse ? (
        <FormulaSubField label="Combined use" value={card.combinedUse} />
      ) : null}
      <div
        style={{
          marginTop: 10,
          padding: "8px 10px",
          background: WARNING_SOFT,
          border: `1px solid ${WARNING_BORDER}`,
          borderRadius: 8,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: WARNING_FG, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Common trap
        </div>
        <div style={{ marginTop: 2, fontSize: 13, color: TEXT_FG, lineHeight: 1.5 }}>
          {card.commonTrap}
        </div>
      </div>
    </div>
  );
}

function FormulaSubField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_SUBTLE, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <div style={{ marginTop: 2, fontSize: 13, color: TEXT_FG, lineHeight: 1.5 }}>
        {value}
      </div>
    </div>
  );
}

function HPQCompactCard({
  topic,
  hpqQuestions,
  predictedHref,
}: {
  topic: DesktopTopicSummary;
  hpqQuestions: HPQQuestion[];
  predictedHref: string;
}) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <Chip bg={ACCENT_BLUE_SOFT} fg={ACCENT_BLUE} border={"hsl(212, 70%, 85%)"}>
          Predicted Questions
        </Chip>
        <h3
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 15,
            fontWeight: 600,
            color: TEXT_FG,
            lineHeight: 1.3,
          }}
        >
          Real HPQs mapped to {topic.name}
        </h3>
      </div>
      {hpqQuestions.length === 0 ? (
        <>
          <MutedNote>
            No matched HPQs yet for {topic.name}. Open Highly Probable Questions
            for the full subject list.
          </MutedNote>
          <div style={{ marginTop: 10 }}>
            <ButtonLink to={predictedHref} variant="outline" icon={<IconArrowRight />}>
              Open Highly Probable Questions
            </ButtonLink>
          </div>
        </>
      ) : (
        <>
          <MutedNote>
            {hpqQuestions.length} highly probable board-style question
            {hpqQuestions.length === 1 ? "" : "s"} mapped to {topic.name}. Showing
            the first {Math.min(3, hpqQuestions.length)}.
          </MutedNote>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {hpqQuestions.slice(0, 3).map((q, idx) => (
              <HPQRow key={q.id || `${idx}-${q.question.slice(0, 20)}`} q={q} />
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <ButtonLink to={predictedHref} variant="ghost" icon={<IconArrowRight />}>
              {hpqQuestions.length > 3
                ? `See all ${hpqQuestions.length} predicted questions`
                : "Open in Highly Probable Questions"}
            </ButtonLink>
          </div>
        </>
      )}
    </div>
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
        background: SURFACE_TINT,
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

// ── Mistakes & next action section ────────────────────────────────────────
function MistakesPanel({
  topic,
  commonMistake,
  examinerWarning,
  isSamplePreview,
  signedIn,
  mistakeLogsLoading,
  topicMistakes,
  mistakeAwareHref,
  practiceHref,
}: {
  topic: DesktopTopicSummary;
  commonMistake: string;
  examinerWarning: string;
  isSamplePreview: boolean;
  signedIn: boolean;
  mistakeLogsLoading: boolean;
  topicMistakes: MistakeLogEntry[];
  mistakeAwareHref: string;
  practiceHref: string;
}) {
  const personalSubtitle = (() => {
    if (!signedIn) return "Sign in to see personal mistake suggestions for this topic.";
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
        {/* Reference common mistake + examiner warning */}
        <div style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              padding: "12px 14px",
              background: WARNING_SOFT,
              border: `1px solid ${WARNING_BORDER}`,
              borderRadius: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: WARNING_FG,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Common mistake
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: TEXT_FG, lineHeight: 1.5 }}>
              {commonMistake}
            </div>
          </div>
          <div
            style={{
              padding: "12px 14px",
              background: ACCENT_BLUE_SOFT,
              border: `1px solid hsl(212, 70%, 85%)`,
              borderRadius: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: ACCENT_BLUE,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Examiner warning
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: TEXT_FG, lineHeight: 1.5 }}>
              {examinerWarning}
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: TEXT_SUBTLE, lineHeight: 1.5 }}>
            {isSamplePreview
              ? "Sample-preview reference content — not your personal data."
              : "Reference board-prep guidance — not your personal data."}
          </p>
        </div>

        {/* Targeted drill / worksheet actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <ButtonLink to={mistakeAwareHref} variant="primary" icon={<IconAlert />}>
            Drill these patterns
          </ButtonLink>
          <ButtonLink to={practiceHref} variant="outline" icon={<IconDumbbell />}>
            Open focused practice
          </ButtonLink>
        </div>

        {/* Personal mistake log */}
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
            </div>
          )}
        </div>
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
  topicSnapshot,
  isSamplePreview,
}: {
  topic: DesktopTopicSummary;
  topicSnapshot: { likelySection: string; examinerNotes: string };
  isSamplePreview: boolean;
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
      </div>
      <div style={{ marginTop: 14 }}>
        <h4
          style={{
            margin: "0 0 4px",
            fontSize: 11,
            fontWeight: 700,
            color: TEXT_SUBTLE,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Likely section
        </h4>
        <p style={{ margin: 0, fontSize: 13, color: TEXT_FG, lineHeight: 1.5 }}>
          {topicSnapshot.likelySection}
        </p>
      </div>
      <div style={{ marginTop: 12 }}>
        <h4
          style={{
            margin: "0 0 4px",
            fontSize: 11,
            fontWeight: 700,
            color: TEXT_SUBTLE,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Examiner notes
        </h4>
        <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED, lineHeight: 1.5 }}>
          {topicSnapshot.examinerNotes}
        </p>
      </div>
      {isSamplePreview ? (
        <p style={{ margin: "12px 0 0", fontSize: 11, color: TEXT_SUBTLE, lineHeight: 1.5 }}>
          Sample-preview snapshot — not curated board history.
        </p>
      ) : null}
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

// ── Right rail: Need a quick hand ─────────────────────────────────────────
type QuickHandPanel = "explain" | "visual" | "check" | null;

function QuickHandCard({
  topic,
  formulaUsePreview,
  boardEssentials,
  isSamplePreview,
}: {
  topic: DesktopTopicSummary;
  formulaUsePreview: FormulaUseCard;
  boardEssentials: BoardConcept[];
  isSamplePreview: boolean;
}) {
  const [open, setOpen] = useState<QuickHandPanel>(null);
  const toggle = useCallback(
    (panel: Exclude<QuickHandPanel, null>) => {
      setOpen((prev) => (prev === panel ? null : panel));
    },
    [],
  );

  const checkConcept = boardEssentials[0];

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
        Three optional reference panels for {topic.name}. Static reference
        content — not generated tutor output.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        <PlainButton
          onClick={() => toggle("explain")}
          active={open === "explain"}
          ariaPressed={open === "explain"}
          icon={<IconBook />}
        >
          {open === "explain" ? "Hide explain concept" : "Explain concept"}
        </PlainButton>
        <PlainButton
          onClick={() => toggle("visual")}
          active={open === "visual"}
          ariaPressed={open === "visual"}
          icon={<IconEye />}
        >
          {open === "visual" ? "Hide show visual" : "Show visual"}
        </PlainButton>
        <PlainButton
          onClick={() => toggle("check")}
          active={open === "check"}
          ariaPressed={open === "check"}
          icon={<IconQuestion />}
        >
          {open === "check" ? "Hide mini check" : "Mini check"}
        </PlainButton>
      </div>

      {open === "explain" ? (
        <QuickHandPanelView title="Explain concept · reference">
          <p style={{ margin: "0 0 6px", fontSize: 13, color: TEXT_FG, lineHeight: 1.5, fontWeight: 600 }}>
            {formulaUsePreview.title}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
            Use this card when:
          </p>
          <ul style={{ margin: "0 0 8px", paddingInlineStart: 16, fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
            {formulaUsePreview.whenToUse.slice(0, 3).map((u, idx) => (
              <li key={idx}>{u}</li>
            ))}
          </ul>
          <p style={{ margin: 0, fontSize: 12, color: TEXT_SUBTLE, lineHeight: 1.5 }}>
            Common trap: {formulaUsePreview.commonTrap}
          </p>
        </QuickHandPanelView>
      ) : null}

      {open === "visual" ? (
        <QuickHandPanelView title="Show visual · reference description">
          <p style={{ margin: "0 0 6px", fontSize: 13, color: TEXT_FG, lineHeight: 1.5 }}>
            <strong>{formulaUsePreview.title}</strong>
          </p>
          <p style={{ margin: 0, fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
            {formulaUsePreview.directUse
              ? formulaUsePreview.directUse
              : formulaUsePreview.whenToUse[0]}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: TEXT_SUBTLE, lineHeight: 1.5 }}>
            Static description of the typical board diagram for {topic.name}.
            See your textbook for the actual figure — we don&rsquo;t generate
            visuals here.
          </p>
        </QuickHandPanelView>
      ) : null}

      {open === "check" ? (
        <QuickHandPanelView title="Mini check · reference recall">
          <MiniCheckBlock concept={checkConcept} />
          <p style={{ margin: "8px 0 0", fontSize: 11, color: TEXT_SUBTLE, lineHeight: 1.5 }}>
            Static reference recall — not graded and not personalised.
          </p>
        </QuickHandPanelView>
      ) : null}

      {isSamplePreview ? (
        <p style={{ margin: "10px 0 0", fontSize: 11, color: TEXT_SUBTLE, lineHeight: 1.5 }}>
          Sample-preview support content — confirm specifics from your textbook.
        </p>
      ) : null}
    </Card>
  );
}

function QuickHandPanelView({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: "10px 12px",
        background: SURFACE_TINT,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: ACCENT_BLUE,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function MiniCheckBlock({ concept }: { concept: BoardConcept | undefined }) {
  const [revealed, setRevealed] = useState(false);
  if (!concept) {
    return (
      <MutedNote>No reference concept seeded for this topic yet.</MutedNote>
    );
  }
  return (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: 13, color: TEXT_FG, lineHeight: 1.5 }}>
        Quick recall: when does <strong>{concept.name}</strong> apply in a board question?
      </p>
      {revealed ? (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
          {concept.oneLineUse}
        </p>
      ) : (
        <PlainButton onClick={() => setRevealed(true)} icon={<IconChevron />}>
          Reveal reference answer
        </PlainButton>
      )}
    </div>
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

function buildChapterTestPath(args: {
  grade: string;
  subject: DesktopSubject;
  topicSlug: string;
  routeContext: DesktopRouteContext;
}): string {
  const { grade, subject, topicSlug, routeContext } = args;
  const params = new URLSearchParams();
  if (routeContext.source) params.set("source", routeContext.source);
  if (routeContext.returnTo) params.set("returnTo", routeContext.returnTo);
  const query = params.toString();
  const base = `/chapter-test/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}/${encodeURIComponent(topicSlug)}`;
  return query ? `${base}?${query}` : base;
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

  const actionable: ActionableTopicHubContent | undefined = useMemo(
    () => (topic ? buildActionableDesktopTopicHubContent(topic) : undefined),
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
  if (!topic || !actionable) {
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

  const practiceHref = buildDesktopPracticePath({
    scope: "topic",
    subject: topic.subject,
    stream: topic.stream,
    topic: topic.slug,
    mode: "practice-set",
    ...routeContext,
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
        <BackToParent subject={backSubject} explicitReturnTo={explicitReturnTo} />
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
          <TopicStrip topic={topic} isSamplePreview={actionable.isSamplePreview} />

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
              grade={grade}
              routeContext={routeContext}
            />
          ) : null}

          <RecommendedNextAction rec={recommendation} />

          <BoardEssentialsPanel
            topic={topic}
            boardEssentials={actionable.boardEssentials}
            isSamplePreview={actionable.isSamplePreview}
            practiceHref={practiceHref}
          />

          <HowBoardsUseItPanel
            topic={topic}
            formulaUsePreview={actionable.formulaUsePreview}
            fullFormulaUseMap={actionable.fullFormulaUseMap}
            hpqQuestions={hpqQuestions}
            predictedHref={predictedHref}
            isSamplePreview={actionable.isSamplePreview}
          />

          <MistakesPanel
            topic={topic}
            commonMistake={actionable.commonMistake}
            examinerWarning={actionable.examinerWarning}
            isSamplePreview={actionable.isSamplePreview}
            signedIn={Boolean(user?.uid)}
            mistakeLogsLoading={mistakeLogsLoading}
            topicMistakes={topicMistakes}
            mistakeAwareHref={mistakeAwareHref}
            practiceHref={practiceHref}
          />
        </div>

        {/* Right rail */}
        <aside style={{ display: "grid", gap: 16, minWidth: 0 }}>
          <TopicSnapshotCard
            topic={topic}
            topicSnapshot={actionable.topicSnapshot}
            isSamplePreview={actionable.isSamplePreview}
          />
          <QuickHandCard
            topic={topic}
            formulaUsePreview={actionable.formulaUsePreview}
            boardEssentials={actionable.boardEssentials}
            isSamplePreview={actionable.isSamplePreview}
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
