import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import { useIsDesktop } from "../../hooks/useIsDesktop";
import MobileShell from "../../components/mobile/MobileShell";
import {
  isDesktopScopeValueValid,
  type DesktopScopeValue,
} from "../../components/desktop/l2/ScopeBuilder";
import {
  buildDesktopCheckPath,
  buildDesktopMePath,
  buildDesktopWorksheetPath,
  withQuery,
  type DesktopActionSource,
  type DesktopPaperScope,
  type DesktopStream,
  type DesktopSubject,
} from "../../lib/desktop/navigation";
import {
  desktopTopicsBySubject,
  desktopTopicBySlug,
  displayDesktopTopicNames,
} from "../../lib/desktop/topics";
import { desktopTopicHubContentBySlug } from "../../lib/desktop/topicHubContent";
import {
  getMistakeLogs,
  type MistakeLogEntry,
} from "../../services/mistakeLogService";
import { type PracticeQuestion } from "../../data/predictionDataService";
import {
  getHighlyProbableQuestions,
  type HPQTopicBucket,
  type HPQQuestion,
  type HPQStream,
} from "../../data/highlyProbableQuestions";
import { normalizeTopicKey } from "../../utils/topicResolver";
import {
  getRuntimeTopicCandidates,
  normalizeTopicSlug,
} from "../../data/syllabus/topicAliasMap";
import {
  LEARNING_SIGNAL_HONESTY_RULES,
  assertLearningSignalKindForMode,
  getLearningSignalPersistence,
  type LearningSignal,
  type LearningSignalKind,
  type LearningSignalMode,
} from "../../lib/desktop/learningSignals";

/**
 * DesktopPracticePage — Level 2 (PR-C2: locked-prototype parity).
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/pages/PracticePage.tsx
 *   (intent-first practice hub: BackToParent + ContextBar + ScopeBuilder
 *    + 4 primary cards + "More options" accordion + PaperBlueprint
 *    + predicted-questions tabs + sample preview, with a right-rail
 *    MistakeIntelligencePanel + Quick Links aside.)
 *
 * Composition (top → bottom):
 *   1. BackToParent — uses ?returnTo / ?source from URL, falls back to "/".
 *   2. ContextBar (compact + showMode) — Class 10 / Subject(+stream) / Scope
 *      / Mode chips, intent-first title.
 *   3. ScopeBuilder — subject · stream · scope · topic(s) selection.
 *   4. Two-column grid (main + aside):
 *      MAIN
 *        a. "Choose what to do" — 4 primary cards:
 *           Quick Practice / Worksheet / Predicted-HPQs / Full Test
 *        b. "More practice options" accordion (native <details>):
 *           Timed Drill / Chapter Test
 *        c. PaperBlueprint preview (when a topic is in scope or
 *           full-subject is chosen).
 *        d. Predicted questions — 3 tabs (Topic HPQs / Selected /
 *           Full subject).
 *        e. Sample preview (curated highlights from the chosen topic).
 *      ASIDE
 *        f. MistakeIntelligencePanel — three honest states:
 *             - logged-out → "Mistake-aware practice needs saved
 *               attempts" + start-trial CTA.
 *             - logged-in, no data → "Grade an answer in Check &
 *               Improve" pointer.
 *             - logged-in, has data → real 4-bucket aggregation from
 *               getMistakeLogs(uid, 7) + four targeted CTAs.
 *        g. Quick links — Open worksheet / Check / Progress.
 *
 * Routing reuse — every CTA points at an existing production route:
 *   - /practice/:grade/:subject (PracticePage)        — Quick / Timed
 *   - /practice/worksheets       (DesktopWorksheetsPage / mobile)
 *   - /highly-probable/:grade/:subject                — Predicted/HPQs
 *   - /full-mock/:grade/:subject                      — Full Test
 *   - /chapter-test/:grade/:subject/:topicKey         — Chapter Test
 *   - /check-improve / /me / /login (?reason=&redirect=)
 * All carry source=practice and returnTo=/practice-hub for back-nav.
 *
 * Production constraints:
 *   - Inline styles only (no Tailwind, no shadcn classes).
 *   - Inline SVG only (no lucide-react).
 *   - No new npm dependency.
 *   - Real data only — mistake intelligence reads getMistakeLogs(uid, 7)
 *     for the signed-in uid; anonymous sessions never get categorised.
 *   - No PR #17-only symbols (no aggregateErrorCategories /
 *     readLocalMistakeLogsSince / ErrorCategory). Local 4-bucket
 *     aggregation, mirroring DesktopHome.
 */

// ── Tokens ────────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const PRIMARY_GREEN_SOFT = "hsl(152, 55%, 95%)";
const PRIMARY_GREEN_RING = "hsla(152, 55%, 45%, 0.30)";
const PRIMARY_GREEN_DARK = "hsl(152, 60%, 30%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";
const SECTION_BG = "hsl(210, 40%, 98%)";
const PILL_BG = "hsl(210, 33%, 96%)";
const PILL_FG = "hsl(220, 25%, 22%)";
const ACCENT_SOFT = "hsl(43, 90%, 92%)";
const ACCENT_FG = "hsl(35, 80%, 35%)";
const INFO_SOFT = "hsl(215, 75%, 95%)";
const INFO_FG = "hsl(215, 65%, 32%)";
const DANGER_FG = "hsl(0, 65%, 42%)";

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

function IconLayers({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function IconClipboard({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <rect x="6" y="4" width="12" height="18" rx="2" />
      <path d="M9 4V3a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="14" x2="15" y2="14" />
      <line x1="9" y1="18" x2="13" y2="18" />
    </svg>
  );
}
function IconSparkles({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 15.8l-1.8-4.6L6 9.4l4.2-1.8z" />
      <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z" />
    </svg>
  );
}
function IconGraduation({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M22 10L12 4 2 10l10 6 10-6z" />
      <path d="M6 12v5c3 2 9 2 12 0v-5" />
    </svg>
  );
}
function IconTimer({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <circle cx="12" cy="13" r="8" />
      <polyline points="12 9 12 13 15 15" />
      <line x1="9" y1="2" x2="15" y2="2" />
    </svg>
  );
}
function IconScroll({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M8 3h11a2 2 0 0 1 2 2v3H8" />
      <path d="M3 8h13v11a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V8z" />
      <path d="M21 8v8a3 3 0 0 1-3 3" />
    </svg>
  );
}
function IconArrowLeft({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
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
function IconTarget({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IconLock({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// ── PR-LANDING login URL helper (reason-aware) ────────────────────────────
function loginUrl(reason: string, redirect: string): string {
  const p = new URLSearchParams();
  p.set("reason", reason);
  p.set("redirect", redirect);
  return `/login?${p.toString()}`;
}

// ── Mistake-bucket aggregation (local — no PR #17 symbols) ────────────────
type BucketKey = "conceptual" | "calculation" | "silly" | "presentation";
interface BucketRow {
  key: BucketKey;
  label: string;
  count: number;
}
const BUCKET_LABELS: Record<BucketKey, string> = {
  conceptual: "Conceptual",
  calculation: "Calculation",
  silly: "Silly",
  presentation: "Presentation",
};
function aggregateBuckets(entries: MistakeLogEntry[]): {
  total: number;
  rows: BucketRow[];
  topRow: BucketRow | null;
} {
  const totals: Record<BucketKey, number> = {
    conceptual: 0,
    calculation: 0,
    silly: 0,
    presentation: 0,
  };
  for (const e of entries) {
    const c = e?.mistakeCounts;
    if (!c) continue;
    if (typeof c.conceptual === "number") totals.conceptual += c.conceptual;
    if (typeof c.calculation === "number") totals.calculation += c.calculation;
    if (typeof c.silly === "number") totals.silly += c.silly;
    if (typeof c.presentation === "number") totals.presentation += c.presentation;
  }
  const rows: BucketRow[] = (Object.keys(totals) as BucketKey[])
    .map((key) => ({ key, label: BUCKET_LABELS[key], count: totals[key] }))
    .sort((a, b) => b.count - a.count);
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const topRow = total > 0 && rows[0].count > 0 ? rows[0] : null;
  return { total, rows, topRow };
}

/**
 * Derive a "weak topic" from real entries by counting topic mentions in the
 * last 7 days. Never invented — returns null when there is no signal.
 */
function topMistakeTopic(entries: MistakeLogEntry[]): string | null {
  if (!entries.length) return null;
  const counts = new Map<string, number>();
  for (const e of entries) {
    const t = (e?.topic ?? "").trim();
    if (!t) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let best: { topic: string; count: number } | null = null;
  for (const [topic, count] of counts) {
    if (!best || count > best.count) best = { topic, count };
  }
  return best?.topic ?? null;
}

// ── Static labels for back-nav resolver ───────────────────────────────────
const SOURCE_LABEL: Record<DesktopActionSource, string> = {
  home: "Back to Home",
  practice: "Back to Practice",
  trends: "Back to Exam Trends",
  topicHub: "Back to Topic Hub",
  worksheet: "Back to Worksheet",
  check: "Back to Check & Improve",
  me: "Back to Me",
  "full-mock": "Back to Full Mock",
};

interface BackInfo {
  to: string;
  label: string;
}

function resolveBack(returnTo: string | null, source: string | null): BackInfo {
  // Whitelist returnTo so we never follow off-site URLs.
  if (
    returnTo &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//") &&
    !returnTo.startsWith("/\\") &&
    !returnTo.startsWith("\\") &&
    !/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(returnTo)
  ) {
    const key = (source ?? "home") as DesktopActionSource;
    return {
      to: returnTo,
      label: SOURCE_LABEL[key] ?? "Back",
    };
  }
  if (source && source in SOURCE_LABEL) {
    const key = source as DesktopActionSource;
    const fallbackPath: Record<DesktopActionSource, string> = {
      home: "/",
      practice: "/practice-hub",
      trends: "/exam-trends",
      topicHub: "/topic-hub",
      worksheet: "/practice/worksheets",
      check: "/check-improve",
      me: "/me",
      "full-mock": "/full-mock/10/Maths",
    };
    return { to: fallbackPath[key], label: SOURCE_LABEL[key] };
  }
  return { to: "/", label: "Back to Home" };
}

// ── PrimaryCard — used for both main 4 and the accordion 3 ────────────────
interface PrimaryCardProps {
  icon: React.ReactElement;
  title: string;
  desc: string;
  preview: string;
  cta: string;
  to: string | null;
  ctaTone?: "primary" | "secondary";
  disabledHint?: string;
  extra?: React.ReactNode;
  onActivate?: (to: string) => void;
  external?: boolean; // honest "Premium" / "Sign-in" lock chip
  lockChip?: string;
  /**
   * Optional honest sub-line shown beneath the CTA, e.g. "Opens the
   * existing worksheet builder with this scope." Helps the learner know
   * whether the next click is locked-prototype parity or a hand-off to
   * an existing production engine.
   */
  honestNote?: string;
}
function PrimaryCard({
  icon,
  title,
  desc,
  preview,
  cta,
  to,
  ctaTone = "primary",
  disabledHint,
  extra,
  onActivate,
  lockChip,
  honestNote,
}: PrimaryCardProps) {
  const [hover, setHover] = useState(false);
  const disabled = !to;
  const handleClick = () => {
    if (!to) return;
    if (onActivate) onActivate(to);
  };
  const cardStyle: React.CSSProperties = {
    background: CARD_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 14,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    transition:
      "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
    transform: hover && !disabled ? "translateY(-2px)" : "translateY(0)",
    boxShadow:
      hover && !disabled
        ? "0 8px 24px -12px rgba(15, 23, 42, 0.18)"
        : "0 1px 2px rgba(15, 23, 42, 0.04)",
    borderColor: hover && !disabled ? "hsl(220, 18%, 80%)" : BORDER,
    opacity: disabled ? 0.65 : 1,
  };
  const ctaStyle: React.CSSProperties = {
    appearance: "none",
    WebkitAppearance: "none",
    background:
      ctaTone === "primary" ? PRIMARY_GREEN : "transparent",
    border:
      ctaTone === "primary"
        ? "1px solid transparent"
        : `1px solid ${BORDER}`,
    color: ctaTone === "primary" ? "#fff" : TEXT_FG,
    padding: "8px 14px",
    borderRadius: 10,
    fontSize: "0.83rem",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  };
  return (
    <article
      style={cardStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            display: "inline-flex",
            width: 28,
            height: 28,
            borderRadius: 8,
            background: PRIMARY_GREEN_SOFT,
            color: PRIMARY_GREEN,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <h3
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "1.02rem",
            fontWeight: 600,
            color: TEXT_FG,
            margin: 0,
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </h3>
        {lockChip ? (
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              background: ACCENT_SOFT,
              color: ACCENT_FG,
              border: `1px solid hsla(35, 80%, 35%, 0.25)`,
            }}
          >
            <IconLock /> {lockChip}
          </span>
        ) : null}
      </div>
      <p
        style={{
          fontSize: "0.79rem",
          lineHeight: 1.5,
          color: TEXT_MUTED,
          margin: 0,
        }}
      >
        {desc}
      </p>
      <div
        style={{
          fontSize: "0.78rem",
          color: PILL_FG,
          background: PILL_BG,
          borderRadius: 8,
          padding: "8px 10px",
          lineHeight: 1.45,
          flex: 1,
          minHeight: 32,
        }}
      >
        {preview}
      </div>
      {extra}
      {disabled ? (
        <span
          style={{
            ...ctaStyle,
            background: "transparent",
            border: `1px dashed ${BORDER}`,
            color: TEXT_MUTED,
            cursor: "not-allowed",
          }}
          aria-disabled
          title={disabledHint}
        >
          {disabledHint ?? cta}
        </span>
      ) : (
        <button type="button" onClick={handleClick} style={ctaStyle}>
          {cta}
          <IconArrowRight />
        </button>
      )}
      {honestNote ? (
        <span
          style={{
            fontSize: 11,
            color: TEXT_MUTED,
            lineHeight: 1.4,
            marginTop: -2,
          }}
        >
          {honestNote}
        </span>
      ) : null}
    </article>
  );
}

// ── PracticeContextBar (page-local; chips-first parity with prototype) ───
interface PracticeChip {
  label: string;
  tone: "neutral" | "accent" | "info";
}
interface PracticeContextBarProps {
  title: string;
  subtitle: string;
  chips: PracticeChip[];
}
function PracticeContextBar({ title, subtitle, chips }: PracticeContextBarProps) {
  const chipColor = (tone: PracticeChip["tone"]) => {
    if (tone === "accent") return { bg: ACCENT_SOFT, fg: ACCENT_FG };
    if (tone === "info") return { bg: INFO_SOFT, fg: INFO_FG };
    return { bg: PILL_BG, fg: TEXT_MUTED };
  };
  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginBottom: 4,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {chips.map((c, i) => {
          const { bg, fg } = chipColor(c.tone);
          return (
            <span
              key={`${c.label}-${i}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 500,
                background: bg,
                color: fg,
                whiteSpace: "nowrap",
              }}
            >
              {c.label}
            </span>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "1.65rem",
            fontWeight: 600,
            color: TEXT_FG,
            margin: 0,
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "0.86rem",
            color: TEXT_MUTED,
            maxWidth: 640,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      </div>
    </header>
  );
}

// ── PracticeScopeBuilder (page-local; compact 3-col selector + topic chips)
interface PracticeScopeBuilderProps {
  value: DesktopScopeValue;
  onChange: (next: DesktopScopeValue) => void;
  topics: ReturnType<typeof desktopTopicsBySubject>;
  summary: string;
  helper?: string;
}
const SCOPE_OPTIONS: { value: DesktopPaperScope; label: string }[] = [
  { value: "topic", label: "Single topic" },
  { value: "multi-topic", label: "Multiple topics" },
  { value: "full-subject", label: "Full subject" },
];
const SUBJECT_OPTIONS: DesktopSubject[] = ["Maths", "Science"];
const STREAM_OPTIONS: DesktopStream[] = ["All", "Physics", "Chemistry", "Biology"];

function PillButton({
  active,
  disabled,
  children,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: active ? PRIMARY_GREEN : CARD_BG,
        color: active ? "#fff" : disabled ? TEXT_MUTED : TEXT_FG,
        border: `1px solid ${active ? PRIMARY_GREEN : BORDER}`,
        padding: "6px 12px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        opacity: disabled ? 0.55 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function ChipToggle({
  active,
  multi,
  children,
  onClick,
}: {
  active: boolean;
  multi?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        cursor: "pointer",
        background: active ? (multi ? ACCENT_SOFT : PRIMARY_GREEN_SOFT) : CARD_BG,
        color: active ? (multi ? ACCENT_FG : PRIMARY_GREEN_DARK) : TEXT_FG,
        border: `1px solid ${active ? (multi ? "hsla(35, 80%, 35%, 0.35)" : PRIMARY_GREEN_RING) : BORDER}`,
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        whiteSpace: "nowrap",
      }}
    >
      {multi && active ? "✓ " : multi ? "+ " : ""}
      {children}
    </button>
  );
}

function PracticeScopeBuilder({
  value,
  onChange,
  topics,
  summary,
  helper,
}: PracticeScopeBuilderProps) {
  const setSubject = (subject: DesktopSubject) =>
    onChange({
      subject,
      stream: subject === "Maths" ? "All" : value.stream,
      scope: value.scope,
      topicSlug: null,
      selectedTopicSlugs: [],
    });
  const setStream = (stream: DesktopStream) => {
    if (value.subject !== "Science") return;
    onChange({ ...value, stream, topicSlug: null, selectedTopicSlugs: [] });
  };
  const setScope = (scope: DesktopPaperScope) =>
    onChange({
      ...value,
      scope,
      topicSlug: scope === "topic" ? value.topicSlug : null,
      selectedTopicSlugs: scope === "multi-topic" ? value.selectedTopicSlugs : [],
    });
  const setSingleTopic = (slug: string) => onChange({ ...value, topicSlug: slug });
  const toggleTopic = (slug: string) => {
    const exists = value.selectedTopicSlugs.includes(slug);
    onChange({
      ...value,
      selectedTopicSlugs: exists
        ? value.selectedTopicSlugs.filter((s) => s !== slug)
        : [...value.selectedTopicSlugs, slug],
    });
  };
  const clearSelected = () => onChange({ ...value, selectedTopicSlugs: [] });

  return (
    <section
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: TEXT_MUTED,
            }}
          >
            What do you want to work on?
          </div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "1.08rem",
              fontWeight: 600,
              color: TEXT_FG,
              marginTop: 2,
              letterSpacing: "-0.005em",
            }}
          >
            Choose subject, stream, scope
          </div>
        </div>
        <div
          style={{
            background: PILL_BG,
            color: TEXT_FG,
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 500,
            maxWidth: 360,
            lineHeight: 1.4,
          }}
        >
          {summary}
        </div>
      </div>

      <div className="lt-practice-scope-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: TEXT_MUTED,
            }}
          >
            Subject
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SUBJECT_OPTIONS.map((s) => (
              <PillButton
                key={s}
                active={value.subject === s}
                onClick={() => setSubject(s)}
              >
                {s}
              </PillButton>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: TEXT_MUTED,
            }}
          >
            Science stream
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STREAM_OPTIONS.map((s) => (
              <PillButton
                key={s}
                active={value.stream === s}
                disabled={value.subject !== "Science"}
                onClick={() => setStream(s)}
              >
                {s}
              </PillButton>
            ))}
          </div>
          {value.subject !== "Science" ? (
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>
              Streams apply only to Science.
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: TEXT_MUTED,
            }}
          >
            Scope
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SCOPE_OPTIONS.map((s) => (
              <PillButton
                key={s.value}
                active={value.scope === s.value}
                onClick={() => setScope(s.value)}
              >
                {s.label}
              </PillButton>
            ))}
          </div>
        </div>
      </div>

      {value.scope === "topic" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: TEXT_MUTED,
            }}
          >
            Pick a topic
          </div>
          {topics.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12.5, color: TEXT_MUTED }}>
              No topics available for this subject/stream combination.
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {topics.map((t) => (
                <ChipToggle
                  key={t.slug}
                  active={value.topicSlug === t.slug}
                  onClick={() => setSingleTopic(t.slug)}
                >
                  {t.name}
                </ChipToggle>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {value.scope === "multi-topic" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: TEXT_MUTED,
              }}
            >
              Combine topics (pick 2 or more)
            </div>
            {value.selectedTopicSlugs.length > 0 ? (
              <button
                type="button"
                onClick={clearSelected}
                style={{
                  appearance: "none",
                  WebkitAppearance: "none",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 11,
                  color: TEXT_MUTED,
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Clear all
              </button>
            ) : null}
          </div>
          {topics.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12.5, color: TEXT_MUTED }}>
              No topics available for this subject/stream combination.
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {topics.map((t) => (
                <ChipToggle
                  key={t.slug}
                  active={value.selectedTopicSlugs.includes(t.slug)}
                  multi
                  onClick={() => toggleTopic(t.slug)}
                >
                  {t.name}
                </ChipToggle>
              ))}
            </div>
          )}
          {value.selectedTopicSlugs.length < 2 ? (
            <p style={{ margin: 0, fontSize: 11, color: TEXT_MUTED }}>
              Pick at least <strong style={{ color: TEXT_FG, fontWeight: 600 }}>2 topics</strong> to enable multi-topic study.
            </p>
          ) : null}
        </div>
      ) : null}

      {value.scope === "full-subject" ? (
        <div
          style={{
            background: PILL_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12.5,
            color: TEXT_FG,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ fontWeight: 600 }}>Full {value.subject} subject</strong> — questions are drawn across all{" "}
          {value.subject === "Science" && value.stream !== "All" ? `${value.stream} ` : ""}topics in proportion to exam weight. Use this for full 80-mark mocks or full-subject predicted papers.
        </div>
      ) : null}

      {helper ? (
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: TEXT_MUTED,
            lineHeight: 1.5,
          }}
        >
          {helper}
        </p>
      ) : null}
    </section>
  );
}

// ── PracticePaperBlueprint (page-local; 5-section subject-level grid) ─────
interface PracticePaperBlueprintProps {
  subject: DesktopSubject;
  stream: DesktopStream;
}
function PracticePaperBlueprint({ subject, stream }: PracticePaperBlueprintProps) {
  const sections: { id: string; marks: number; hint: string }[] = [
    { id: "A", marks: 20, hint: "MCQ + Assertion-Reason (1m × 20)" },
    { id: "B", marks: 10, hint: "Short Answer I (2m × 5)" },
    { id: "C", marks: 18, hint: "Short Answer II (3m × 6)" },
    { id: "D", marks: 20, hint: "Long Answer (5m × 4)" },
    { id: "E", marks: 12, hint: "Case-based (4m × 3)" },
  ];
  const subjectLine =
    subject === "Maths"
      ? "All questions from CBSE Class 10 Maths topics."
      : stream && stream !== "All"
        ? `Questions from CBSE Class 10 ${stream} only.`
        : "Mix of Physics + Chemistry + Biology — proportional to exam weight.";
  return (
    <section
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            display: "inline-flex",
            width: 28,
            height: 28,
            borderRadius: 8,
            background: ACCENT_SOFT,
            color: ACCENT_FG,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconGraduation size={14} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "1.0rem",
              fontWeight: 600,
              color: TEXT_FG,
              letterSpacing: "-0.005em",
            }}
          >
            Paper blueprint preview
          </div>
          <div style={{ fontSize: 11.5, color: TEXT_MUTED, lineHeight: 1.4 }}>
            {subject} full mock · 80 marks · 3 hours · {subjectLine}
          </div>
        </div>
      </div>
      <div className="lt-practice-blueprint-grid">
        {sections.map((s) => (
          <div
            key={s.id}
            style={{
              background: PILL_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: 12,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: TEXT_MUTED,
              }}
            >
              Section {s.id}
            </div>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: "1.5rem",
                fontWeight: 600,
                color: TEXT_FG,
                lineHeight: 1.1,
              }}
            >
              {s.marks}
              <span style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 500 }}> m</span>
            </div>
            <div style={{ fontSize: 10, color: TEXT_MUTED, lineHeight: 1.35 }}>{s.hint}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 11,
          color: TEXT_MUTED,
          borderTop: `1px solid ${BORDER}`,
          paddingTop: 10,
        }}
      >
        Total: 80 marks · Duration: 3 hours · Reference blueprint, not a learner-specific paper.
      </div>
    </section>
  );
}

// ── BackToParent (PR-C2) ──────────────────────────────────────────────────
function BackToParent() {
  const [params] = useSearchParams();
  const back = useMemo(
    () => resolveBack(params.get("returnTo"), params.get("source")),
    [params],
  );
  return (
    <Link
      to={back.to}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: "0.78rem",
        color: TEXT_MUTED,
        textDecoration: "none",
        marginBottom: 4,
      }}
    >
      <IconArrowLeft /> {back.label}
    </Link>
  );
}

// ── MistakeIntelligencePanel (3 honest states) ────────────────────────────
interface MistakePanelProps {
  isSignedIn: boolean;
  loading: boolean;
  buckets: ReturnType<typeof aggregateBuckets>;
  weakTopic: string | null;
  drillTopicSlug: string | null;
  grade: string;
  subject: "Maths" | "Science";
  worksheetMistakeAwarePath: string;
  mockPath: string;
  checkPath: string;
  drillPath: string;
  /** Current Practice page URL (path + query). Used to preserve scope/focus
   *  on post-login redirect when a signed-out learner clicks the locked-state
   *  "Start free trial" CTA. */
  currentPracticeUrl: string;
}
function MistakeIntelligencePanel({
  isSignedIn,
  loading,
  buckets,
  weakTopic,
  drillTopicSlug,
  worksheetMistakeAwarePath,
  mockPath,
  checkPath,
  drillPath,
  currentPracticeUrl,
}: MistakePanelProps) {
  // ── State 1 — logged out
  if (!isSignedIn) {
    return (
      <section
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-flex",
              width: 28,
              height: 28,
              borderRadius: 8,
              background: PILL_BG,
              color: TEXT_MUTED,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconLock size={14} />
          </span>
          <h3
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "1.02rem",
              fontWeight: 600,
              color: TEXT_FG,
              margin: 0,
            }}
          >
            Mistake-aware practice
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: "0.85rem", color: TEXT_MUTED, lineHeight: 1.55 }}>
          Mistake-aware practice needs saved attempts. Start a free trial to
          unlock targeted drills, mistake-aware worksheets, and weak-area
          mini-sections inside your mocks.
        </p>
        <Link
          to={loginUrl("mistake-aware", currentPracticeUrl)}
          style={{
            alignSelf: "flex-start",
            background: PRIMARY_GREEN,
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 10,
            fontSize: "0.83rem",
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconSparkles size={14} /> Start free trial
        </Link>
        <div style={{ fontSize: 11, color: TEXT_MUTED }}>
          Recommended, not required.
        </div>
      </section>
    );
  }

  // ── State 2 — signed in, no data yet (or still loading)
  if (loading || !buckets.topRow) {
    return (
      <section
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-flex",
              width: 28,
              height: 28,
              borderRadius: 8,
              background: ACCENT_SOFT,
              color: ACCENT_FG,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconSparkles size={14} />
          </span>
          <h3
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "1.02rem",
              fontWeight: 600,
              color: TEXT_FG,
              margin: 0,
            }}
          >
            Your mistake insights
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: "0.85rem", color: TEXT_MUTED, lineHeight: 1.55 }}>
          {loading ? (
            "Reading your last 7 days of saved checks…"
          ) : (
            <>
              Grade an answer in{" "}
              <Link
                to={checkPath}
                style={{
                  color: PRIMARY_GREEN,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Check &amp; Improve
              </Link>{" "}
              to unlock mistake-aware practice.
            </>
          )}
        </p>
        <div style={{ fontSize: 11, color: TEXT_MUTED }}>
          Recommended, not required.
        </div>
      </section>
    );
  }

  // ── State 3 — signed in, has data
  const total = buckets.total;
  return (
    <section
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-flex",
              width: 28,
              height: 28,
              borderRadius: 8,
              background: ACCENT_SOFT,
              color: ACCENT_FG,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconSparkles size={14} />
          </span>
          <h3
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "1.02rem",
              fontWeight: 600,
              color: TEXT_FG,
              margin: 0,
            }}
          >
            Your latest weak area
          </h3>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            borderRadius: 999,
            background: ACCENT_SOFT,
            color: ACCENT_FG,
            border: `1px solid hsla(35, 80%, 35%, 0.25)`,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Last 7 days
        </span>
      </div>

      <div>
        <div style={{ fontSize: "0.92rem", color: TEXT_FG }}>
          <strong style={{ fontWeight: 700 }}>
            {weakTopic ?? "Across your saved attempts"}
          </strong>
          {" — "}
          <span style={{ color: PILL_FG }}>{buckets.topRow.label} mistakes</span>
        </div>
        <div style={{ fontSize: "0.78rem", color: TEXT_MUTED, marginTop: 4 }}>
          {buckets.topRow.count} of {total} tagged mistake
          {total === 1 ? "" : "s"} were classed as {buckets.topRow.label.toLowerCase()}.
        </div>
      </div>

      {/* 4-bucket distribution mini-bar — read straight from real entries */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {buckets.rows.map((r) => {
          const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
          return (
            <li key={r.key} style={{ display: "grid", gridTemplateColumns: "100px 1fr 36px", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: TEXT_FG, fontWeight: 500 }}>{r.label}</span>
              <span
                style={{
                  height: 6,
                  background: PILL_BG,
                  borderRadius: 999,
                  overflow: "hidden",
                  display: "block",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: `${pct}%`,
                    height: "100%",
                    background: PRIMARY_GREEN,
                    borderRadius: 999,
                  }}
                />
              </span>
              <span style={{ fontSize: 11, color: TEXT_MUTED, textAlign: "right" }}>
                {r.count}
              </span>
            </li>
          );
        })}
      </ul>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Link
          to={drillPath}
          style={{
            background: PRIMARY_GREEN,
            color: "#fff",
            padding: "7px 12px",
            borderRadius: 10,
            fontSize: "0.78rem",
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
          aria-label={drillTopicSlug ? "Run targeted drill on weak topic" : "Run targeted drill"}
        >
          <IconTarget /> Run targeted drill
        </Link>
        <Link
          to={worksheetMistakeAwarePath}
          style={{
            background: "transparent",
            color: TEXT_FG,
            padding: "7px 12px",
            borderRadius: 10,
            fontSize: "0.78rem",
            fontWeight: 600,
            textDecoration: "none",
            border: `1px solid ${BORDER}`,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconClipboard size={14} /> Mistake-aware worksheet
        </Link>
        <Link
          to={mockPath}
          style={{
            background: "transparent",
            color: TEXT_FG,
            padding: "7px 12px",
            borderRadius: 10,
            fontSize: "0.78rem",
            fontWeight: 600,
            textDecoration: "none",
            border: `1px solid ${BORDER}`,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconGraduation size={14} /> Open Full Test
        </Link>
        <Link
          to={checkPath}
          style={{
            background: "transparent",
            color: PRIMARY_GREEN_DARK,
            padding: "7px 12px",
            borderRadius: 10,
            fontSize: "0.78rem",
            fontWeight: 600,
            textDecoration: "none",
            border: `1px solid ${PRIMARY_GREEN_RING}`,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Open Check &amp; Improve
        </Link>
      </div>
    </section>
  );
}

// ── PR-C2.1 helpers — real-data resolution for in-page Quick Practice + HPQ tabs ──

/**
 * Build an ordered list of topic-key candidates to try against the
 * production question bank. Desktop starter slugs (e.g. "acids-bases-salts",
 * "trigonometry-heights-distances", "light-reflection-refraction") do not
 * always equal canonical hyphen slugs used by the unified bank. We try, in
 * order: canonical (`normalizeTopicKey`), runtime aliases, and finally the
 * raw slug — never invent a key. Order matters because
 * `generatePracticeQuestions` returns the first non-empty pool.
 */
function buildTopicKeyCandidates(rawSlug: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (key: string) => {
    const clean = (key ?? "").trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    out.push(clean);
  };
  push(normalizeTopicKey(rawSlug));
  for (const candidate of getRuntimeTopicCandidates(rawSlug)) push(candidate);
  push(normalizeTopicSlug(rawSlug));
  push(rawSlug);
  return out;
}

/**
 * Locate a real Highly-Probable-Questions bucket for a given desktop topic
 * slug, by matching the bucket's `topic` (display name) against the slug's
 * canonical / alias / normalized forms. Returns `null` when no bucket
 * matches — the UI then shows an honest empty state instead of repurposing
 * topicHubContent reference highlights as "predicted questions".
 */
function findHpqBucketForSlug(
  buckets: HPQTopicBucket[],
  rawSlug: string,
): HPQTopicBucket | null {
  if (!rawSlug) return null;
  const candidates = new Set<string>();
  for (const c of buildTopicKeyCandidates(rawSlug)) candidates.add(c);
  for (const b of buckets) {
    const bucketSlugs = [
      normalizeTopicSlug(b.topic),
      normalizeTopicKey(b.topic),
      ...buildTopicKeyCandidates(b.topic),
    ];
    if (bucketSlugs.some((s) => candidates.has(s))) return b;
  }
  return null;
}

/**
 * Map a `DesktopStream` ("All" | "Physics" | "Chemistry" | "Biology") onto
 * the HPQ stream filter (HPQ uses `undefined` for "no stream filter").
 */
function toHpqStream(stream: DesktopStream): HPQStream | undefined {
  if (stream === "Physics" || stream === "Chemistry" || stream === "Biology") {
    return stream;
  }
  return undefined;
}

// ── Page ──────────────────────────────────────────────────────────────────
const RETURN_TO = "/practice-hub";
const SOURCE: DesktopActionSource = "practice";

type TabId = "topic" | "selected" | "full";

const HAS_DURABLE_QUICK_PRACTICE_SIGNAL_PATH = false;

function getQuickPracticeSolutionParts(question: PracticeQuestion): string[] {
  const parts: string[] = [];

  if (Array.isArray(question.solutionSteps)) {
    parts.push(...question.solutionSteps.filter((step) => step.trim().length > 0));
  }

  if (question.explanation?.trim()) {
    parts.push(question.explanation.trim());
  }

  if (question.finalAnswer?.trim()) {
    parts.push(`Final answer: ${question.finalAnswer.trim()}`);
  } else if (question.answer?.trim()) {
    parts.push(`Answer: ${question.answer.trim()}`);
  }

  return parts;
}

export default function DesktopPracticePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { user } = useAuth();
  // C&I PR-2 item E — at mobile width, own the shared MobileShell header (avatar-
  // dropdown), retiring the old global brand bar. Desktop stays inside DesktopShell.
  const isDesktop = useIsDesktop();
  const { grade, subject } = useSubjectContext();
  const isSignedIn = !!user;
  const currentPracticeUrl = useMemo(
    () => `${location.pathname}${location.search}`,
    [location.pathname, location.search],
  );
  const returnTo = currentPracticeUrl || RETURN_TO;
  const sourceParam = params.get("source");
  const focusParam = (params.get("focus") || "").trim();
  const subtopicHintParam = (params.get("subtopicHint") || "").trim();

  // Map the legacy subject string from useSubjectContext onto the
  // L2 DesktopSubject union. Default to "Maths" when uncertain — this only
  // pre-fills ScopeBuilder; the user is free to change it.
  const initialSubject: DesktopScopeValue["subject"] =
    subject === "Science" ? "Science" : "Maths";

  const [scope, setScope] = useState<DesktopScopeValue>({
    subject: initialSubject,
    stream: "All",
    scope: "topic",
    topicSlug: null,
    selectedTopicSlugs: [],
  });

  // PR-K1B — Apply URL query parameters on mount to preselect context.
  // Supports: ?subject=Maths|Science &scope=topic|multi-topic|full-subject
  // &topic=slug (single topic) &topics=slug1,slug2 (multi-topic)
  // &stream=All|Physics|Chemistry|Biology (Science only).
  // Validates against production topic catalogue and falls back gracefully
  // to component defaults if any param is malformed.
  useEffect(() => {
    const urlSubject = params.get("subject");
    const urlScope = params.get("scope");
    const urlTopic = params.get("topic");
    const urlTopics = params.get("topics");
    const urlStream = params.get("stream");

    // Only proceed if there are URL params to process.
    if (!urlSubject && !urlScope && !urlTopic && !urlTopics && !urlStream) {
      return;
    }

    const parsedSubject = urlSubject === "Science" ? "Science" : "Maths";
    const parsedStream =
      parsedSubject === "Science" && ["Physics", "Chemistry", "Biology"].includes(urlStream ?? "")
        ? urlStream as DesktopStream
        : "All";

    let newScope: DesktopScopeValue = {
      subject: parsedSubject,
      stream: parsedStream,
      scope: "topic",
      topicSlug: null,
      selectedTopicSlugs: [],
    };

    // Normalize and validate scope kind.
    const scopeKind = urlScope as DesktopScopeValue["scope"] | undefined;
    if (scopeKind === "multi-topic" || scopeKind === "full-subject" || scopeKind === "topic") {
      newScope.scope = scopeKind;
    }

    // Handle single topic (scope=topic, topic=slug).
    if (newScope.scope === "topic" && urlTopic) {
      const resolvedTopic = desktopTopicBySlug(urlTopic);
      if (resolvedTopic && resolvedTopic.subject === parsedSubject) {
        newScope.topicSlug = resolvedTopic.slug;
      }
    }

    // Handle multi-topic (scope=multi-topic, topics=slug1,slug2).
    if (newScope.scope === "multi-topic" && urlTopics) {
      const topicSlugs = urlTopics
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const validSlugs: string[] = [];
      for (const slug of topicSlugs) {
        const resolved = desktopTopicBySlug(slug);
        if (resolved && resolved.subject === parsedSubject) {
          validSlugs.push(resolved.slug);
        }
      }
      if (validSlugs.length > 0) {
        newScope.selectedTopicSlugs = validSlugs;
      } else {
        // Fall back to single-topic scope if no valid topics found.
        newScope.scope = "topic";
      }
    }

    // full-subject scope requires no validation — just accept it.
    // Topic/stream mismatch: if a topic was passed for a different subject,
    // it stays null/empty (honest fallback).

    setScope(newScope);
  }, []); // Run once on mount to parse initial URL params.

  // Parity options (local UI checkboxes).
  const [worksheetMistakeMini, setWorksheetMistakeMini] = useState(false);
  const [drillTargeted, setDrillTargeted] = useState(false);

  // PR-C2.1 legacy in-page Quick Practice panel state. K2G routes the primary
  // "Start quick practice" CTA directly to the full Practice workspace, so
  // this remains null during the normal hub flow. If a future entry point
  // reuses the panel, question data must stay real (`generatePracticeQuestions`)
  // or honest empty - never fabricated.
  interface QuickPracticePanelState {
    subject: DesktopSubject;
    scopeKind: DesktopPaperScope;
    scopeLabel: string;
    sourceTopicSlug: string | null;
    sourceTopicName: string | null;
    matchedKey: string | null;
    triedKeys: string[];
    questions: PracticeQuestion[];
  }
  const [quickPracticePanel, setQuickPracticePanel] =
    useState<QuickPracticePanelState | null>(null);
  const [currentQuickPracticeIndex, setCurrentQuickPracticeIndex] = useState(0);
  const [quickPracticeAnswerDrafts, setQuickPracticeAnswerDrafts] = useState<
    Record<string, string>
  >({});
  const [quickPracticeAttemptedIds, setQuickPracticeAttemptedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [quickPracticeSolutionVisibleIds, setQuickPracticeSolutionVisibleIds] =
    useState<Set<string>>(() => new Set());
  const [quickPracticeSignals, setQuickPracticeSignals] = useState<LearningSignal[]>([]);

  const resetQuickPracticeRunState = () => {
    setCurrentQuickPracticeIndex(0);
    setQuickPracticeAnswerDrafts({});
    setQuickPracticeAttemptedIds(new Set());
    setQuickPracticeSolutionVisibleIds(new Set());
    setQuickPracticeSignals([]);
  };

  const appendQuickPracticeSignal = (
    kind: LearningSignalKind,
    mode: LearningSignalMode,
    question: PracticeQuestion | null,
  ) => {
    if (!assertLearningSignalKindForMode(mode, kind)) return;

    const authEligiblePersistence = getLearningSignalPersistence({
      isSignedIn: Boolean(user?.uid),
    });
    // PR-K1A has no durable save path. Do not mark a signal saved merely
    // because the learner is signed in; future persistence work must flip
    // HAS_DURABLE_QUICK_PRACTICE_SIGNAL_PATH only after a real save exists.
    const isLocalOnly =
      authEligiblePersistence === "local-only" ||
      !HAS_DURABLE_QUICK_PRACTICE_SIGNAL_PATH;
    const source: LearningSignal["source"] =
      kind === "solution_viewed" ? "solution" : "practice";

    setQuickPracticeSignals((prev) => [
      ...prev,
      {
        id: `${kind}-${question?.id ?? "run"}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        kind,
        source,
        evidenceType: kind === "next_action_clicked" ? "navigation" : "learner_action",
        isLocalOnly,
        createdAt: new Date().toISOString(),
        userId: user?.uid,
        subject: quickPracticePanel?.subject ?? scope.subject,
        topicSlug:
          quickPracticePanel?.sourceTopicSlug ?? scope.topicSlug ?? undefined,
        topicSlugs:
          scope.scope === "multi-topic" && scope.selectedTopicSlugs.length > 0
            ? scope.selectedTopicSlugs
            : undefined,
        mode,
        questionId: question?.id,
        marksAvailable: question?.marks,
        sourceRoute: "/practice-hub",
      },
    ]);
  };

  const handleQuickPracticeAttempted = (question: PracticeQuestion) => {
    const alreadyAttempted = quickPracticeAttemptedIds.has(question.id);
    setQuickPracticeAttemptedIds((prev) => {
      const next = new Set(prev);
      next.add(question.id);
      return next;
    });
    if (!alreadyAttempted) {
      appendQuickPracticeSignal("question_answered", "quick-practice", question);
    }
  };

  const handleQuickPracticeShowSolution = (question: PracticeQuestion) => {
    const solutionParts = getQuickPracticeSolutionParts(question);
    const alreadyVisible = quickPracticeSolutionVisibleIds.has(question.id);

    setQuickPracticeSolutionVisibleIds((prev) => {
      const next = new Set(prev);
      next.add(question.id);
      return next;
    });

    if (solutionParts.length > 0 && !alreadyVisible) {
      appendQuickPracticeSignal("solution_viewed", "solution-reveal", question);
    }
  };

  const handleQuickPracticeNext = (question: PracticeQuestion) => {
    appendQuickPracticeSignal("next_action_clicked", "quick-practice", question);
    setCurrentQuickPracticeIndex((prev) =>
      Math.min(prev + 1, Math.max(quickPracticePanel?.questions.length ?? 1, 1) - 1),
    );
  };

  const handleQuickPracticeExitRun = (question?: PracticeQuestion) => {
    if (question) {
      appendQuickPracticeSignal("next_action_clicked", "quick-practice", question);
    }
    setQuickPracticePanel(null);
    resetQuickPracticeRunState();
  };

  // Real mistake intelligence — last 7 days for the signed-in uid only.
  const [mistakes, setMistakes] = useState<MistakeLogEntry[]>([]);
  const [mistakesLoading, setMistakesLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setMistakes([]);
      setMistakesLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setMistakesLoading(true);
    void (async () => {
      try {
        const entries = await getMistakeLogs(user.uid, 7);
        if (!cancelled) {
          setMistakes(Array.isArray(entries) ? entries : []);
          setMistakesLoading(false);
        }
      } catch {
        if (!cancelled) {
          setMistakes([]);
          setMistakesLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const buckets = useMemo(() => aggregateBuckets(mistakes), [mistakes]);
  const weakTopic = useMemo(() => topMistakeTopic(mistakes), [mistakes]);
  // Best-effort slug for the targeted-drill CTA — only when the topic name
  // matches our curated catalogue. We never fabricate a topic.
  const weakTopicSlug = useMemo(
    () => (weakTopic ? desktopTopicBySlug(weakTopic)?.slug ?? null : null),
    [weakTopic],
  );

  // Derived scope state
  const topics = useMemo(
    () => desktopTopicsBySubject(scope.subject, scope.stream),
    [scope.subject, scope.stream],
  );
  const validScope = isDesktopScopeValueValid(scope);
  const selectedTopic = scope.topicSlug ? desktopTopicBySlug(scope.topicSlug) : undefined;

  // PR-C2.1 — Real HPQ buckets for the current subject + Science stream.
  // Recomputed only when subject/stream changes; small list, no perf risk.
  const hpqBuckets = useMemo<HPQTopicBucket[]>(
    () => getHighlyProbableQuestions(scope.subject, toHpqStream(scope.stream)),
    [scope.subject, scope.stream],
  );

  // Real HPQ bucket for the single-topic scope, when one matches the
  // production HPQ catalogue. Otherwise `null` — the UI shows an honest
  // empty state and never recycles topicHubContent highlights as HPQs.
  const selectedTopicHpqBucket = useMemo<HPQTopicBucket | null>(
    () =>
      scope.scope === "topic" && scope.topicSlug
        ? findHpqBucketForSlug(hpqBuckets, scope.topicSlug)
        : null,
    [hpqBuckets, scope.scope, scope.topicSlug],
  );

  // Reset the Quick Practice panel whenever scope changes — stale questions
  // for a different topic would be misleading.
  useEffect(() => {
    setQuickPracticePanel(null);
    resetQuickPracticeRunState();
  }, [scope.subject, scope.stream, scope.scope, scope.topicSlug, scope.selectedTopicSlugs]);

  // Blueprint preview source: chosen single topic, first selected topic of a
  // multi-mix, or the first catalogue topic of the subject for full-subject.
  const blueprintTopicSlug =
    scope.scope === "topic"
      ? scope.topicSlug
      : scope.scope === "multi-topic"
        ? scope.selectedTopicSlugs[0] ?? null
        : topics[0]?.slug ?? null;
  const blueprintContent = blueprintTopicSlug
    ? desktopTopicHubContentBySlug(blueprintTopicSlug)
    : undefined;

  // ── Path builders (every CTA → existing production route) ──────────────
  const buildLegacyPracticePath = (params: {
    timed?: boolean;
    topic?: string;
    /** Comma-joined slug SET for a multi-topic quick-practice set ([FU-PRACTICEHUB-MULTITOPIC]).
     *  Mirrors the HPQ sibling builder's `topics=` — PracticePage fans out per topic. */
    topics?: string;
    subtopicHint?: string;
    focus?: string;
    section?: string;
    difficulty?: string;
    count?: number;
    questionType?: string;
    pyqOnly?: boolean;
  }): string => {
    const sp = new URLSearchParams();
    if (params.topic) sp.set("topic", params.topic);
    // Multi-topic: emit the SET (reused convention). PracticePage keys `isMultiTopic` on
    // `topics=` having 2+ members and takes the fan-out branch; a single/absent `topics`
    // never engages it, so the single-topic path stays byte-identical.
    if (params.topics) sp.set("topics", params.topics);
    if (params.timed) sp.set("timed", "1");
    if (params.subtopicHint) sp.set("subtopicHint", params.subtopicHint);
    if (params.focus) sp.set("focus", params.focus);
    if (params.section) sp.set("section", params.section);
    if (params.difficulty) sp.set("difficulty", params.difficulty);
    if (params.count) sp.set("count", String(params.count));
    if (params.questionType && params.questionType !== "All") {
      sp.set("questionType", params.questionType);
    }
    if (params.pyqOnly) sp.set("pyq", "1");
    sp.set("source", SOURCE);
    sp.set("returnTo", returnTo);
    return withQuery(`/practice/${grade}/${scope.subject}`, sp);
  };
  const buildPredictedPath = (): string => {
    const sp = new URLSearchParams();
    sp.set("source", SOURCE);
    sp.set("returnTo", returnTo);
    if (scope.scope === "topic" && scope.topicSlug) sp.set("topic", scope.topicSlug);
    if (scope.scope === "multi-topic" && scope.selectedTopicSlugs.length)
      sp.set("topics", scope.selectedTopicSlugs.join(","));
    return withQuery(`/highly-probable/${grade}/${scope.subject}`, sp);
  };
  // Full Test — the NEW /full-mock surface. MockViewGate on the route is the
  // ONLY gate; entries navigate plainly (mirrors the Chapter Test card).
  const buildFullTestPath = (): string => {
    const sp = new URLSearchParams();
    sp.set("source", SOURCE);
    sp.set("returnTo", returnTo);
    return withQuery(`/full-mock/${grade}/${scope.subject}`, sp);
  };
  const buildChapterTestPath = (topicSlug: string): string => {
    const sp = new URLSearchParams();
    sp.set("source", SOURCE);
    sp.set("returnTo", returnTo);
    return withQuery(
      `/chapter-test/${grade}/${scope.subject}/${encodeURIComponent(topicSlug)}`,
      sp,
    );
  };
  // Worksheet path — uses the real L2 helper that already targets
  // /practice/worksheets and forwards scope to that page.
  const worksheetPath = useMemo(() => {
    const baseCtx = { source: SOURCE, returnTo };
    if (scope.scope === "topic" && scope.topicSlug) {
      return buildDesktopWorksheetPath({
        scope: "topic",
        subject: scope.subject,
        stream: scope.stream,
        topic: scope.topicSlug,
        mistakeAware: worksheetMistakeMini,
        ...baseCtx,
      });
    }
    if (scope.scope === "multi-topic" && scope.selectedTopicSlugs.length >= 2) {
      return buildDesktopWorksheetPath({
        scope: "multi-topic",
        subject: scope.subject,
        stream: scope.stream,
        topics: scope.selectedTopicSlugs,
        mistakeAware: worksheetMistakeMini,
        ...baseCtx,
      });
    }
    if (scope.scope === "full-subject") {
      return buildDesktopWorksheetPath({
        scope: "full-subject",
        subject: scope.subject,
        stream: scope.stream,
        mistakeAware: worksheetMistakeMini,
        ...baseCtx,
      });
    }
    return null;
  }, [scope, worksheetMistakeMini, returnTo]);

  // ── Card ROUTING with login fallbacks (PR-LANDING reasons) ─────────────
  const quickPracticePath: string | null = !validScope
    ? null
    : scope.scope === "topic" && scope.topicSlug
      ? buildLegacyPracticePath({
          topic: scope.topicSlug,
          subtopicHint: subtopicHintParam || undefined,
          focus: focusParam || undefined,
        })
      : scope.scope === "full-subject"
        ? buildLegacyPracticePath({})
        : scope.scope === "multi-topic" && scope.selectedTopicSlugs.length >= 2
          ? buildLegacyPracticePath({
              // The full SET, not selectedTopicSlugs[0] — the old collapse was the
              // [FU-PRACTICEHUB-MULTITOPIC] gap. PracticePage fans out per topic.
              topics: scope.selectedTopicSlugs.join(","),
            })
          : scope.scope === "multi-topic" && scope.selectedTopicSlugs.length === 1
            ? buildLegacyPracticePath({ topic: scope.selectedTopicSlugs[0] })
            : buildLegacyPracticePath({});

  const timedDrillPath: string | null = !validScope
    ? null
    : !isSignedIn && drillTargeted
      ? loginUrl(
          "mistake-aware",
          buildLegacyPracticePath({
            timed: true,
            topic:
              scope.scope === "topic" && scope.topicSlug ? scope.topicSlug : undefined,
          }),
        )
      : buildLegacyPracticePath({
          timed: true,
          topic:
            scope.scope === "topic" && scope.topicSlug ? scope.topicSlug : undefined,
        });

  const chapterTestPath: string | null = (() => {
    const topicForChapter =
      scope.scope === "topic" && scope.topicSlug
        ? scope.topicSlug
        : scope.scope === "multi-topic" && scope.selectedTopicSlugs[0]
          ? scope.selectedTopicSlugs[0]
          : null;
    if (!topicForChapter) return null;
    return buildChapterTestPath(topicForChapter);
  })();

  // Quick-links paths — Check / Progress / Worksheet (sign-in-aware).
  const checkLinkPath = isSignedIn
    ? buildDesktopCheckPath(scope.topicSlug ?? undefined, {
        source: SOURCE,
        returnTo,
      })
    : loginUrl(
        "open-check",
        buildDesktopCheckPath(scope.topicSlug ?? undefined, {
          source: SOURCE,
          returnTo,
        }),
      );
  const meLinkPath = isSignedIn
    ? buildDesktopMePath({ source: SOURCE, returnTo })
    : loginUrl("open-progress", buildDesktopMePath({ source: SOURCE, returnTo }));

  // Mistake-aware-worksheet target for the right-rail panel — auth-aware.
  const mistakeAwareWorksheetPath = (() => {
    const baseCtx = { source: SOURCE, returnTo };
    const target = scope.topicSlug
      ? buildDesktopWorksheetPath({
          scope: "topic",
          subject: scope.subject,
          stream: scope.stream,
          topic: scope.topicSlug,
          mistakeAware: true,
          ...baseCtx,
        })
      : buildDesktopWorksheetPath({
          scope: "full-subject",
          subject: scope.subject,
          stream: scope.stream,
          mistakeAware: true,
          ...baseCtx,
        });
    return isSignedIn ? target : loginUrl("mistake-aware-worksheet", target);
  })();
  const drillFromMistakePath = (() => {
    const target = buildLegacyPracticePath({
      timed: true,
      topic: weakTopicSlug ?? undefined,
    });
    return isSignedIn ? target : loginUrl("mistake-aware", target);
  })();

  // ── Preview lines ─────────────────────────────────────────────────────
  const selectedNames = displayDesktopTopicNames(scope.selectedTopicSlugs);
  const topicHubFocusContext =
    sourceParam === "topicHub" && (focusParam.length > 0 || subtopicHintParam.length > 0);
  // Quick Practice CTA target — when a signed-out learner arrived with focus
  // context (focus/subtopicHint from TopicHub), route through the reason-aware
  // login gate so the post-login redirect preserves the full focused URL.
  // Signed-in users and non-focused contexts continue navigating directly.
  const quickPracticeTarget: string | null =
    !isSignedIn && topicHubFocusContext && quickPracticePath
      ? loginUrl("start-focused-practice", currentPracticeUrl)
      : quickPracticePath;
  const previewLine = (mode: "practice-set" | "worksheet" | "predicted" | "full-mock" | "timed" | "chapter-test"): string => {
    if (mode === "practice-set" && topicHubFocusContext && focusParam) {
      return `practice set from ${selectedTopic?.name ?? scope.subject} - focus: ${focusParam}`;
    }
    if (mode === "full-mock") {
      return `Full ${scope.subject} board paper · 3 hours · 80 marks · Sections A–E`;
    }
    if (mode === "worksheet" && worksheetMistakeMini && buckets.topRow) {
      const scopePart =
        scope.scope === "full-subject"
          ? `${scope.subject} full-subject`
          : scope.scope === "multi-topic"
            ? "Selected-topic"
            : selectedTopic?.name ?? "—";
      return `${scopePart} worksheet · + mistake-focus mini-section`;
    }
    if (mode === "timed" && drillTargeted && buckets.topRow) {
      return `Targeted drill on ${weakTopic ?? "your last weak area"} · ${buckets.topRow.label.toLowerCase()} mistakes`;
    }
    const baseLabel = mode.replace(/-/g, " ");
    if (scope.scope === "full-subject") return `${scope.subject} full-subject ${baseLabel}`;
    if (scope.scope === "multi-topic") {
      return `${baseLabel} from ${selectedNames.join(" + ") || "selected topics"}`;
    }
    return `${baseLabel} from ${selectedTopic?.name ?? "—"}`;
  };

  // ── Tabs ───────────────────────────────────────────────────────────────
  const initialTab: TabId =
    scope.scope === "full-subject" ? "full" : scope.scope === "multi-topic" ? "selected" : "topic";
  const [tab, setTab] = useState<TabId>(initialTab);
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // ── Header chips (compact + showMode parity) ──────────────────────────
  const scopeChipLabel =
    scope.scope === "full-subject"
      ? `${scope.subject} full subject`
      : scope.scope === "multi-topic"
        ? `${scope.selectedTopicSlugs.length} topics selected`
        : selectedTopic?.name ?? "No topic";
  const modeChipLabel = (() => {
    // Mode is implied by the most-recent CTA the learner is set up for.
    if (drillTargeted) return "timed (targeted)";
    if (worksheetMistakeMini) return "worksheet (mistake-aware)";
    return "intent-first";
  })();
  const chips: PracticeChip[] = [
    { label: `Class ${grade}`, tone: "neutral" },
    {
      label:
        scope.subject === "Science" && scope.stream !== "All"
          ? `${scope.subject} · ${scope.stream}`
          : scope.subject,
      tone: "neutral",
    },
    { label: `Scope: ${scopeChipLabel}`, tone: "neutral" },
    { label: `Mode: ${modeChipLabel}`, tone: "info" },
  ];
  if (topicHubFocusContext && focusParam) {
    chips.push({ label: `Focus: ${focusParam}`, tone: "info" });
  }

  // ── ScopeBuilder summary (parity with prototype) ─────────────────────
  const scopeSummary = (() => {
    if (scope.scope === "full-subject") {
      if (scope.subject === "Maths") return "Maths full subject — 80 marks";
      if (scope.stream === "All")
        return "Science full subject — Physics + Chemistry + Biology, 80 marks";
      return `Science ${scope.stream} — full stream`;
    }
    if (scope.scope === "multi-topic") {
      const names = displayDesktopTopicNames(scope.selectedTopicSlugs);
      if (names.length === 0) return `${scope.subject} — pick topics to combine`;
      return `${scope.subject}${
        scope.subject === "Science" && scope.stream !== "All" ? ` ${scope.stream}` : ""
      } — ${names.join(" + ")}`;
    }
    return `${scope.subject}${
      scope.subject === "Science" && scope.stream !== "All" ? ` ${scope.stream}` : ""
    } — ${selectedTopic?.name ?? "pick a topic"}`;
  })();

  // ── Sample preview ─────────────────────────────────────────────────────
  const samplePreview = blueprintContent
    ? {
        topicName: blueprintContent.topic.name,
        marks: blueprintContent.topic.marks,
        blurb: blueprintContent.topic.blurb,
        highlights: blueprintContent.highlights,
        resources: blueprintContent.resources.slice(0, 3),
      }
    : null;

  // ── Render ─────────────────────────────────────────────────────────────
  const pageBody = (
    <div
      style={{
        background: SECTION_BG,
        padding: "28px 32px 56px",
        fontFamily: FONT_BODY,
        color: TEXT_FG,
        minHeight: "100%",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <BackToParent />

        <PracticeContextBar
          title="Practice"
          subtitle="Pick a scope, then choose what to do."
          chips={chips}
        />

        {topicHubFocusContext ? (
          <section
            style={{
              background: CARD_BG,
              border: `1px solid ${PRIMARY_GREEN_RING}`,
              borderRadius: 14,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
            aria-label="Topic Hub focus context"
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: PRIMARY_GREEN_DARK,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Focused from Topic Hub
            </div>
            <div style={{ fontSize: 13.5, color: TEXT_FG, lineHeight: 1.5 }}>
              Practice scope: <strong>{selectedTopic?.name ?? scope.subject}</strong>
              {focusParam ? (
                <>
                  {" "}
                  - Focus: <strong>{focusParam}</strong>
                </>
              ) : null}
              {subtopicHintParam ? (
                <>
                  <br />
                  Hint: {subtopicHintParam}
                </>
              ) : null}
            </div>
            <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
              We'll use this context where matching questions exist; exact concept-level filtering is not claimed here.
            </div>
          </section>
        ) : null}

        <PracticeScopeBuilder
          value={scope}
          onChange={setScope}
          topics={topics}
          summary={scopeSummary}
          helper="Showing a starter set of high-yield topics from the desktop bridge — not the full chapter list. Use the existing chapter pages for anything outside this short list."
        />

        <div className="lt-practice-main-grid">
          {/* ───────────────────── MAIN COLUMN ───────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Choose what to do — 4 primary cards */}
            <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <h2
                  style={{
                    fontFamily: FONT_DISPLAY,
                    margin: 0,
                    fontSize: "1.18rem",
                    fontWeight: 600,
                    color: TEXT_FG,
                    letterSpacing: "-0.005em",
                  }}
                >
                  Choose what to do
                </h2>
                <p
                  style={{
                    margin: "2px 0 0 0",
                    fontSize: "0.82rem",
                    color: TEXT_MUTED,
                  }}
                >
                  Every option routes to your existing production flows — nothing
                  generates a new paper on its own.
                </p>
              </div>
              <div className="lt-practice-card-grid">
                <PrimaryCard
                  icon={<IconLayers />}
                  title="Quick Practice"
                  desc="A short, focused set of real questions in the full Practice workspace."
                  preview={previewLine("practice-set")}
                  cta="Start quick practice"
                  to={quickPracticeTarget}
                  disabledHint="Pick a scope above first"
                  onActivate={(to) => navigate(to)}
                  honestNote="Opens the full Practice workspace with this scope."
                />
                <PrimaryCard
                  icon={<IconClipboard />}
                  title="Worksheet"
                  desc="Sectioned worksheet, ready for screen or print."
                  preview={previewLine("worksheet")}
                  cta="Open worksheet builder"
                  to={worksheetPath}
                  disabledHint="Pick a scope above first"
                  onActivate={(to) => navigate(to)}
                  honestNote="Opens the existing worksheet builder (/practice/worksheets) with this scope."
                  extra={
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        color: buckets.topRow ? TEXT_FG : TEXT_MUTED,
                        cursor: buckets.topRow ? "pointer" : "not-allowed",
                      }}
                      title={
                        buckets.topRow
                          ? "Adds a mini-section that targets your top mistake bucket"
                          : "Available after you save a graded answer in Check & Improve"
                      }
                    >
                      <input
                        type="checkbox"
                        checked={worksheetMistakeMini && !!buckets.topRow}
                        onChange={(e) => setWorksheetMistakeMini(e.target.checked)}
                        disabled={!buckets.topRow}
                        style={{ accentColor: PRIMARY_GREEN }}
                      />
                      Add mistake-focus mini-section
                    </label>
                  }
                />
                <PrimaryCard
                  icon={<IconSparkles />}
                  title="Predicted / HPQs"
                  desc="Highly probable questions for your scope, sourced from the production HPQ catalogue."
                  preview={previewLine("predicted")}
                  cta="Open Highly Probable Questions"
                  to={buildPredictedPath()}
                  onActivate={(to) => navigate(to)}
                  honestNote="Opens the existing /highly-probable page with this scope. Real matched HPQ rows are also previewed in the Predicted-questions tabs below."
                />
                <PrimaryCard
                  icon={<IconGraduation />}
                  title="Full Test"
                  desc="3-hour board paper · 80 marks."
                  preview={previewLine("full-mock")}
                  cta="Open Full Test"
                  to={buildFullTestPath()}
                  onActivate={(to) => navigate(to)}
                  honestNote={`Opens the Full Test — the full board-pattern ${scope.subject} paper (Sections A–E). The 3-hour clock starts on that page, not here.`}
                />
              </div>
            </section>

            {/* PR-C2.1 legacy generated quick practice panel.
                K2G's main Start quick practice CTA bypasses this panel.
                Renders real questions from the production unified bank via
                generatePracticeQuestions, or an honest empty state when no
                pool matches if a future entry point opts into it. */}
            {quickPracticePanel ? (
              <section
                aria-label="Generated quick practice"
                style={{
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: "1.05rem",
                        fontWeight: 600,
                        color: TEXT_FG,
                        margin: 0,
                      }}
                    >
                      Generated quick practice
                    </h3>
                    <p
                      style={{
                        margin: "2px 0 0 0",
                        fontSize: "0.8rem",
                        color: TEXT_MUTED,
                        lineHeight: 1.45,
                      }}
                    >
                      {quickPracticePanel.scopeLabel}
                      {quickPracticePanel.matchedKey ? (
                        <>
                          {" · matched topic key "}
                          <code
                            style={{
                              background: PILL_BG,
                              padding: "1px 6px",
                              borderRadius: 6,
                              fontSize: 11,
                              color: PILL_FG,
                            }}
                          >
                            {quickPracticePanel.matchedKey}
                          </code>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickPracticeExitRun()}
                    style={{
                      appearance: "none",
                      WebkitAppearance: "none",
                      border: `1px solid ${BORDER}`,
                      background: "transparent",
                      color: TEXT_MUTED,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                    aria-label="Hide generated quick practice panel"
                  >
                    Hide
                  </button>
                </div>

                {quickPracticePanel.questions.length > 0 ? (
                  (() => {
                    const activeQuestion =
                      quickPracticePanel.questions[
                        Math.min(
                          currentQuickPracticeIndex,
                          quickPracticePanel.questions.length - 1,
                        )
                      ] ?? quickPracticePanel.questions[0];

                    if (!activeQuestion) return null;

                    const answerDraft =
                      quickPracticeAnswerDrafts[activeQuestion.id] ?? "";
                    const attempted = quickPracticeAttemptedIds.has(activeQuestion.id);
                    const solutionVisible = quickPracticeSolutionVisibleIds.has(
                      activeQuestion.id,
                    );
                    const solutionParts = getQuickPracticeSolutionParts(activeQuestion);
                    const isLastQuestion =
                      currentQuickPracticeIndex >= quickPracticePanel.questions.length - 1;

                    return (
                      <div className="lt-practice-quick-grid">
                        <article
                          style={{
                            background: PILL_BG,
                            border: `1px solid ${BORDER}`,
                            borderRadius: 12,
                            padding: 14,
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: CARD_BG,
                                  border: `1px solid ${BORDER}`,
                                  fontSize: 10.5,
                                  color: TEXT_MUTED,
                                  fontWeight: 700,
                                  letterSpacing: "0.04em",
                                  textTransform: "uppercase",
                                }}
                              >
                                Question {currentQuickPracticeIndex + 1} of{" "}
                                {quickPracticePanel.questions.length}
                              </span>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: CARD_BG,
                                  border: `1px solid ${BORDER}`,
                                  fontSize: 10.5,
                                  color: TEXT_MUTED,
                                  fontWeight: 700,
                                  letterSpacing: "0.04em",
                                  textTransform: "uppercase",
                                }}
                              >
                                Section {activeQuestion.section} · {activeQuestion.marks}m
                              </span>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: CARD_BG,
                                  border: `1px solid ${BORDER}`,
                                  fontSize: 10.5,
                                  color: TEXT_MUTED,
                                  fontWeight: 600,
                                }}
                              >
                                {activeQuestion.format}
                              </span>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: CARD_BG,
                                  border: `1px solid ${BORDER}`,
                                  fontSize: 10.5,
                                  color: TEXT_MUTED,
                                  fontWeight: 600,
                                }}
                              >
                                {activeQuestion.difficulty}
                              </span>
                              {activeQuestion.subtopic ? (
                                <span
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    background: CARD_BG,
                                    border: `1px solid ${BORDER}`,
                                    fontSize: 10.5,
                                    color: TEXT_MUTED,
                                    fontWeight: 600,
                                  }}
                                >
                                  {activeQuestion.subtopic}
                                </span>
                              ) : null}
                            </div>
                            {attempted ? (
                              <span
                                style={{
                                  padding: "3px 9px",
                                  borderRadius: 999,
                                  background: PRIMARY_GREEN_SOFT,
                                  color: PRIMARY_GREEN_DARK,
                                  border: `1px solid ${PRIMARY_GREEN_RING}`,
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                Attempt marked
                              </span>
                            ) : null}
                          </div>

                          <div
                            style={{
                              fontSize: 14,
                              color: TEXT_FG,
                              lineHeight: 1.55,
                              background: CARD_BG,
                              border: `1px solid ${BORDER}`,
                              borderRadius: 10,
                              padding: 12,
                            }}
                          >
                            {activeQuestion.questionText}
                          </div>

                          {Array.isArray(activeQuestion.options) &&
                          activeQuestion.options.length > 0 ? (
                            <ul
                              style={{
                                margin: 0,
                                paddingLeft: 18,
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                                fontSize: 12.5,
                                color: TEXT_FG,
                              }}
                            >
                              {activeQuestion.options.map((option, optionIndex) => (
                                <li key={`${activeQuestion.id}-option-${optionIndex}`}>
                                  {option}
                                </li>
                              ))}
                            </ul>
                          ) : null}

                          <label
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              color: TEXT_FG,
                            }}
                          >
                            Your working
                            <textarea
                              value={answerDraft}
                              onChange={(event) =>
                                setQuickPracticeAnswerDrafts((prev) => ({
                                  ...prev,
                                  [activeQuestion.id]: event.target.value,
                                }))
                              }
                              placeholder="Type your working here. This stays local in PR-K1A."
                              rows={4}
                              style={{
                                width: "100%",
                                resize: "vertical",
                                border: `1px solid ${BORDER}`,
                                borderRadius: 10,
                                padding: 10,
                                fontFamily: FONT_BODY,
                                fontSize: 13,
                                color: TEXT_FG,
                                background: CARD_BG,
                                outline: "none",
                                boxSizing: "border-box",
                              }}
                            />
                          </label>

                          {solutionVisible ? (
                            solutionParts.length > 0 ? (
                              <div
                                style={{
                                  background: CARD_BG,
                                  border: `1px solid ${PRIMARY_GREEN_RING}`,
                                  borderRadius: 10,
                                  padding: 12,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 8,
                                }}
                              >
                                <strong style={{ fontSize: 12.5, color: TEXT_FG }}>
                                  Solution / explanation from the real question row
                                </strong>
                                <ol
                                  style={{
                                    margin: 0,
                                    paddingLeft: 18,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                    fontSize: 12.5,
                                    color: TEXT_FG,
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {solutionParts.map((part, partIndex) => (
                                    <li key={`${activeQuestion.id}-solution-${partIndex}`}>
                                      {part}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            ) : (
                              <div
                                style={{
                                  background: CARD_BG,
                                  border: `1px dashed ${BORDER}`,
                                  borderRadius: 10,
                                  padding: 12,
                                  fontSize: 12.5,
                                  color: TEXT_MUTED,
                                  lineHeight: 1.5,
                                }}
                              >
                                Solution is not available for this question yet.
                              </div>
                            )
                          ) : null}

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleQuickPracticeAttempted(activeQuestion)}
                              style={{
                                appearance: "none",
                                WebkitAppearance: "none",
                                border: "none",
                                background: PRIMARY_GREEN,
                                color: "#fff",
                                padding: "8px 12px",
                                borderRadius: 10,
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Mark as attempted
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickPracticeShowSolution(activeQuestion)}
                              style={{
                                appearance: "none",
                                WebkitAppearance: "none",
                                border: `1px solid ${BORDER}`,
                                background: CARD_BG,
                                color: TEXT_FG,
                                padding: "8px 12px",
                                borderRadius: 10,
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              {solutionVisible ? "Solution shown" : "Show solution"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickPracticeNext(activeQuestion)}
                              disabled={isLastQuestion}
                              style={{
                                appearance: "none",
                                WebkitAppearance: "none",
                                border: `1px solid ${BORDER}`,
                                background: isLastQuestion ? PILL_BG : CARD_BG,
                                color: isLastQuestion ? TEXT_MUTED : TEXT_FG,
                                padding: "8px 12px",
                                borderRadius: 10,
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                cursor: isLastQuestion ? "not-allowed" : "pointer",
                              }}
                            >
                              Next question
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickPracticeExitRun(activeQuestion)}
                              style={{
                                appearance: "none",
                                WebkitAppearance: "none",
                                border: `1px solid ${BORDER}`,
                                background: "transparent",
                                color: TEXT_MUTED,
                                padding: "8px 12px",
                                borderRadius: 10,
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Exit run
                            </button>
                          </div>
                        </article>

                        <aside
                          style={{
                            background: CARD_BG,
                            border: `1px solid ${BORDER}`,
                            borderRadius: 12,
                            padding: 14,
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            alignSelf: "start",
                          }}
                          aria-label="This practice run summary"
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color: PRIMARY_GREEN_DARK,
                              }}
                            >
                              This practice run
                            </div>
                            <h4
                              style={{
                                margin: "2px 0 0 0",
                                fontFamily: FONT_DISPLAY,
                                fontSize: "1rem",
                                color: TEXT_FG,
                              }}
                            >
                              Local activity summary
                            </h4>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              fontSize: 12,
                              color: TEXT_FG,
                              lineHeight: 1.45,
                            }}
                          >
                            <span>Signals in this run: {quickPracticeSignals.length}</span>
                            <span style={{ color: TEXT_MUTED }}>
                              Local-only · not saved yet · does not count as mastery.
                            </span>
                            <span style={{ color: TEXT_MUTED }}>
                              Quick Practice does not grade answers or log mistakes in PR-K1A.
                            </span>
                          </div>
                          {quickPracticeSignals.length > 0 ? (
                            <ul
                              style={{
                                margin: 0,
                                paddingLeft: 18,
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                                fontSize: 11.5,
                                color: TEXT_FG,
                                lineHeight: 1.45,
                              }}
                            >
                              {quickPracticeSignals.slice(-4).map((signal) => (
                                <li key={signal.id}>
                                  <strong>{signal.kind}</strong>
                                  <br />
                                  <span style={{ color: TEXT_MUTED }}>
                                    {LEARNING_SIGNAL_HONESTY_RULES[signal.kind].summary}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span
                              style={{
                                fontSize: 11.5,
                                color: TEXT_MUTED,
                                lineHeight: 1.45,
                              }}
                            >
                              Mark an attempt or reveal a real solution to create a local
                              signal.
                            </span>
                          )}
                        </aside>
                      </div>
                    );
                  })()
                ) : (
                  <div
                    style={{
                      background: PILL_BG,
                      border: `1px dashed ${BORDER}`,
                      borderRadius: 10,
                      padding: 14,
                      fontSize: 13,
                      color: TEXT_FG,
                      lineHeight: 1.5,
                    }}
                  >
                    <strong style={{ display: "block", marginBottom: 4 }}>
                      No generated questions for this scope yet.
                    </strong>
                    <span style={{ color: TEXT_MUTED }}>
                      The unified question bank doesn&apos;t have a pool for{" "}
                      <code
                        style={{
                          background: CARD_BG,
                          padding: "1px 5px",
                          borderRadius: 4,
                          fontSize: 11,
                          color: PILL_FG,
                        }}
                      >
                        {quickPracticePanel.sourceTopicSlug ?? "this scope"}
                      </code>
                      . Try a different topic, or continue in the full
                      practice engine which can fall back to broader sources.
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  {quickPracticeTarget ? (
                    <Link
                      to={quickPracticeTarget}
                      onClick={() =>
                        appendQuickPracticeSignal(
                          "next_action_clicked",
                          "quick-practice",
                          quickPracticePanel.questions[currentQuickPracticeIndex] ?? null,
                        )
                      }
                      style={{
                        background: PRIMARY_GREEN,
                        color: "#fff",
                        padding: "8px 14px",
                        borderRadius: 10,
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      Continue in full practice engine
                    </Link>
                  ) : null}
                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                    {isSignedIn
                      ? "Opens the existing /practice engine with this scope."
                      : "Quick Practice runs locally here. The full engine may ask you to sign in — signing in starts your free trial and saves future attempts to your profile."}
                  </span>
                </div>
              </section>
            ) : null}

            {/* More practice options — accordion (native <details>) */}
            <details
              style={{
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: "10px 16px",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  listStyle: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: TEXT_FG,
                  padding: "6px 0",
                }}
              >
                More practice options
                <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                  Timed · Chapter Test
                </span>
              </summary>
              <div className="lt-practice-more-grid">
                <PrimaryCard
                  icon={<IconTimer />}
                  title="Timed Drill"
                  desc="Short focused drill with a timer."
                  preview={previewLine("timed")}
                  cta={drillTargeted ? "Start targeted drill" : "Start timed drill"}
                  to={timedDrillPath}
                  disabledHint="Pick a scope above first"
                  onActivate={(to) => navigate(to)}
                  extra={
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        color: buckets.topRow ? TEXT_FG : TEXT_MUTED,
                        cursor: buckets.topRow ? "pointer" : "not-allowed",
                      }}
                      title={
                        buckets.topRow
                          ? "Routes the timer at your top mistake topic"
                          : "Available after you save a graded answer in Check & Improve"
                      }
                    >
                      <input
                        type="checkbox"
                        checked={drillTargeted && !!buckets.topRow}
                        onChange={(e) => setDrillTargeted(e.target.checked)}
                        disabled={!buckets.topRow}
                        style={{ accentColor: PRIMARY_GREEN }}
                      />
                      Make this a targeted drill
                    </label>
                  }
                />
                <PrimaryCard
                  icon={<IconScroll />}
                  title="Chapter Test"
                  desc="Single-chapter test on the topic you picked."
                  preview={previewLine("chapter-test")}
                  cta="Open existing chapter test"
                  to={chapterTestPath}
                  disabledHint="Pick a single topic above to enable"
                  onActivate={(to) => navigate(to)}
                  ctaTone="secondary"
                  honestNote="Opens the existing /chapter-test engine on the topic you picked."
                />
              </div>
            </details>

            {/* PaperBlueprint — 5-section board paper preview (subject-level) */}
            <PracticePaperBlueprint subject={scope.subject} stream={scope.stream} />

            {/* Predicted questions — 3 honest tabs */}
            <section
              style={{
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    color: TEXT_FG,
                    margin: 0,
                  }}
                >
                  Predicted questions
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: TEXT_MUTED }}>
                  Topic HPQs · Selected-topic predictions · Full-subject prediction.
                </p>
              </div>
              <div
                role="tablist"
                style={{
                  display: "inline-flex",
                  gap: 6,
                  background: PILL_BG,
                  padding: 4,
                  borderRadius: 10,
                  alignSelf: "flex-start",
                }}
              >
                {([
                  { id: "topic", label: "Topic HPQs" },
                  { id: "selected", label: "Selected topics" },
                  { id: "full", label: "Full subject" },
                ] as { id: TabId; label: string }[]).map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(t.id)}
                      style={{
                        appearance: "none",
                        WebkitAppearance: "none",
                        border: "none",
                        cursor: "pointer",
                        background: active ? CARD_BG : "transparent",
                        color: active ? TEXT_FG : TEXT_MUTED,
                        boxShadow: active
                          ? "0 1px 2px rgba(15, 23, 42, 0.10)"
                          : "none",
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: active ? 700 : 500,
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Topic HPQs tab — PR-C2.1: real HPQ rows from getHighlyProbableQuestions */}
              {tab === "topic" ? (
                selectedTopic ? (
                  selectedTopicHpqBucket && selectedTopicHpqBucket.questions.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 13, color: TEXT_FG }}>
                        <strong>{selectedTopic.name}</strong> —{" "}
                        <span style={{ color: TEXT_MUTED }}>
                          {selectedTopicHpqBucket.questions.length} highly-probable
                          question{selectedTopicHpqBucket.questions.length === 1 ? "" : "s"} from
                          the production catalogue
                        </span>
                      </div>
                      <ol
                        style={{
                          margin: 0,
                          padding: 0,
                          paddingLeft: 22,
                          listStyle: "decimal",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {selectedTopicHpqBucket.questions.slice(0, 5).map((q: HPQQuestion) => (
                          <li
                            key={q.id}
                            style={{
                              background: PILL_BG,
                              border: `1px solid ${BORDER}`,
                              borderRadius: 10,
                              padding: "10px 12px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                marginBottom: 6,
                              }}
                            >
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: CARD_BG,
                                  border: `1px solid ${BORDER}`,
                                  fontSize: 10.5,
                                  color: TEXT_MUTED,
                                  fontWeight: 700,
                                  letterSpacing: "0.04em",
                                  textTransform: "uppercase",
                                }}
                              >
                                Section {q.section} · {q.marks}m
                              </span>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: CARD_BG,
                                  border: `1px solid ${BORDER}`,
                                  fontSize: 10.5,
                                  color: TEXT_MUTED,
                                  fontWeight: 600,
                                }}
                              >
                                {q.type}
                              </span>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: CARD_BG,
                                  border: `1px solid ${BORDER}`,
                                  fontSize: 10.5,
                                  color: TEXT_MUTED,
                                  fontWeight: 600,
                                }}
                              >
                                {q.difficulty} · {q.likelihood}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: TEXT_FG,
                                lineHeight: 1.5,
                              }}
                            >
                              {q.question}
                            </div>
                          </li>
                        ))}
                      </ol>
                      <Link
                        to={buildPredictedPath()}
                        style={{
                          alignSelf: "flex-start",
                          background: PRIMARY_GREEN,
                          color: "#fff",
                          padding: "7px 12px",
                          borderRadius: 10,
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <IconSparkles size={14} /> Open full HPQ page for {selectedTopic.name}
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 13, color: TEXT_FG }}>
                        <strong>{selectedTopic.name}</strong> isn&apos;t in the
                        Highly-Probable-Questions catalogue yet.
                      </p>
                      <p style={{ margin: 0, fontSize: 12.5, color: TEXT_MUTED, lineHeight: 1.5 }}>
                        We don&apos;t fabricate predicted questions from
                        reference material — open the live HPQ page to see the
                        full ranked list across topics that are covered.
                      </p>
                      <Link
                        to={buildPredictedPath()}
                        style={{
                          alignSelf: "flex-start",
                          background: PRIMARY_GREEN,
                          color: "#fff",
                          padding: "7px 12px",
                          borderRadius: 10,
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <IconSparkles size={14} /> Open Highly Probable Questions
                      </Link>
                    </div>
                  )
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED }}>
                    Pick a single topic in the scope builder to see its
                    Highly Probable Questions from the live catalogue.
                  </p>
                )
              ) : null}

              {/* Selected topics tab — PR-C2.1: real HPQ rows per selected topic */}
              {tab === "selected" ? (
                scope.selectedTopicSlugs.length >= 2 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {scope.selectedTopicSlugs.map((slug) => {
                      const t = desktopTopicBySlug(slug);
                      if (!t) return null;
                      const bucket = findHpqBucketForSlug(hpqBuckets, slug);
                      const topQ = bucket?.questions[0];
                      return (
                        <div
                          key={slug}
                          style={{
                            background: PILL_BG,
                            border: `1px solid ${BORDER}`,
                            borderRadius: 10,
                            padding: 12,
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_FG }}>
                            {t.name}{" "}
                            <span style={{ color: TEXT_MUTED, fontWeight: 400 }}>
                              · {t.marks}
                            </span>
                            {bucket ? (
                              <span style={{ color: TEXT_MUTED, fontWeight: 400 }}>
                                {" "}· {bucket.questions.length} HPQ
                                {bucket.questions.length === 1 ? "" : "s"} in catalogue
                              </span>
                            ) : null}
                          </div>
                          {topQ ? (
                            <div style={{ marginTop: 6 }}>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 6,
                                  marginBottom: 4,
                                }}
                              >
                                <span
                                  style={{
                                    padding: "1px 7px",
                                    borderRadius: 999,
                                    background: CARD_BG,
                                    border: `1px solid ${BORDER}`,
                                    fontSize: 10,
                                    color: TEXT_MUTED,
                                    fontWeight: 700,
                                    letterSpacing: "0.04em",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Section {topQ.section} · {topQ.marks}m
                                </span>
                                <span
                                  style={{
                                    padding: "1px 7px",
                                    borderRadius: 999,
                                    background: CARD_BG,
                                    border: `1px solid ${BORDER}`,
                                    fontSize: 10,
                                    color: TEXT_MUTED,
                                    fontWeight: 600,
                                  }}
                                >
                                  {topQ.type} · {topQ.likelihood}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: 12.5,
                                  color: TEXT_FG,
                                  lineHeight: 1.5,
                                }}
                              >
                                {topQ.question}
                              </div>
                            </div>
                          ) : (
                            <p
                              style={{
                                margin: "4px 0 0 0",
                                fontSize: 12,
                                color: TEXT_MUTED,
                                lineHeight: 1.5,
                              }}
                            >
                              No HPQ catalogue match for this topic — open the
                              live page for ranked predictions across covered
                              topics.
                            </p>
                          )}
                        </div>
                      );
                    })}
                    <Link
                      to={buildPredictedPath()}
                      style={{
                        alignSelf: "flex-start",
                        background: PRIMARY_GREEN,
                        color: "#fff",
                        padding: "7px 12px",
                        borderRadius: 10,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <IconSparkles size={14} /> Open Highly Probable Questions
                    </Link>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED }}>
                    Switch scope to <strong style={{ color: TEXT_FG }}>Multi-topic</strong>{" "}
                    and pick 2 or more topics to compare predicted Qs side-by-side.
                  </p>
                )
              ) : null}

              {/* Full subject tab */}
              {tab === "full" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div
                    style={{
                      background: PILL_BG,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 10,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_FG }}>
                      {scope.subject} 80-mark predicted paper outline
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 18,
                        fontSize: 12,
                        color: TEXT_FG,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        lineHeight: 1.55,
                      }}
                    >
                      <li>
                        <strong>Section A</strong> (1m × 20): MCQ + Assertion-Reason from
                        high-trend topics
                      </li>
                      <li>
                        <strong>Section B</strong> (2m × 5): Short answers from
                        high-frequency chapters
                      </li>
                      <li>
                        <strong>Section C</strong> (3m × 6): Short reasoning + numerical
                        problems
                      </li>
                      <li>
                        <strong>Section D</strong> (5m × 4): Long-answer + diagram /
                        derivation problems
                      </li>
                      <li>
                        <strong>Section E</strong> (4m × 3): Case-based questions
                      </li>
                    </ul>
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                      Sample preview · the live{" "}
                      <Link
                        to={buildPredictedPath()}
                        style={{ color: PRIMARY_GREEN, textDecoration: "none", fontWeight: 600 }}
                      >
                        Highly Probable
                      </Link>{" "}
                      page generates the actual ranked list.
                    </span>
                  </div>
                  <Link
                    to={buildPredictedPath()}
                    style={{
                      alignSelf: "flex-start",
                      background: PRIMARY_GREEN,
                      color: "#fff",
                      padding: "7px 12px",
                      borderRadius: 10,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <IconSparkles size={14} /> View {scope.subject} full predicted paper
                  </Link>
                </div>
              ) : null}
            </section>

            {/* Topic reference — PR-C2.1: honestly labelled curated highlights.
                Previously called "Sample preview" with fabricated Section A/B/C
                chips that implied a paper layout. The chips are removed and the
                copy makes clear these are reference points (study cues), not
                generated questions. Real generated questions now open in the
                full Practice workspace or the Predicted-questions tabs above. */}
            {samplePreview && samplePreview.highlights.length > 0 ? (
              <section
                style={{
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: "1.0rem",
                        fontWeight: 600,
                        color: TEXT_FG,
                        margin: 0,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      Topic reference
                    </h3>
                    <p
                      style={{
                        margin: "2px 0 0 0",
                        fontSize: 11.5,
                        color: TEXT_MUTED,
                        lineHeight: 1.45,
                      }}
                    >
                      Curated study cues for this topic — not generated
                      questions. For real questions, use Quick Practice above
                      or the Predicted tabs.
                    </p>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px 10px",
                      borderRadius: 999,
                      background: PILL_BG,
                      color: PILL_FG,
                      border: `1px solid ${BORDER}`,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {samplePreview.topicName} · {samplePreview.marks}
                  </span>
                </div>
                {samplePreview.blurb ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12.5,
                      color: PILL_FG,
                      lineHeight: 1.5,
                    }}
                  >
                    {samplePreview.blurb}
                  </p>
                ) : null}
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {samplePreview.highlights.slice(0, 3).map((h) => (
                    <li
                      key={h.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        padding: "10px 12px",
                        background: PILL_BG,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 10,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: TEXT_FG,
                            lineHeight: 1.4,
                          }}
                        >
                          {h.label}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: TEXT_MUTED,
                            marginTop: 2,
                            lineHeight: 1.45,
                          }}
                        >
                          {h.rationale}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                  Reference cues only — no faux paper sections. The live{" "}
                  <Link
                    to={buildPredictedPath()}
                    style={{ color: PRIMARY_GREEN_DARK, textDecoration: "none", fontWeight: 600 }}
                  >
                    Highly Probable
                  </Link>{" "}
                  page produces the actual ranked questions for your scope.
                </span>
              </section>
            ) : null}
          </div>

          {/* ───────────────────── ASIDE COLUMN ───────────────────── */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <MistakeIntelligencePanel
              isSignedIn={isSignedIn}
              loading={mistakesLoading && isSignedIn}
              buckets={buckets}
              weakTopic={weakTopic}
              drillTopicSlug={weakTopicSlug}
              grade={grade}
              subject={scope.subject}
              worksheetMistakeAwarePath={mistakeAwareWorksheetPath}
              mockPath={buildFullTestPath()}
              checkPath={checkLinkPath}
              drillPath={drillFromMistakePath}
              currentPracticeUrl={currentPracticeUrl}
            />

            {/* Quick links */}
            <section
              style={{
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <h3
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: "1.02rem",
                  fontWeight: 600,
                  color: TEXT_FG,
                  margin: 0,
                  marginBottom: 4,
                }}
              >
                Quick links
              </h3>
              {worksheetPath ? (
                <Link
                  to={worksheetPath}
                  style={{
                    fontSize: 13,
                    color: PRIMARY_GREEN_DARK,
                    textDecoration: "none",
                    fontWeight: 500,
                    padding: "4px 0",
                  }}
                >
                  → Open worksheet with same scope
                </Link>
              ) : (
                <span
                  style={{
                    fontSize: 13,
                    color: TEXT_MUTED,
                    padding: "4px 0",
                  }}
                  title="Pick a scope above first"
                >
                  → Open worksheet with same scope
                </span>
              )}
              <Link
                to={checkLinkPath}
                style={{
                  fontSize: 13,
                  color: PRIMARY_GREEN_DARK,
                  textDecoration: "none",
                  fontWeight: 500,
                  padding: "4px 0",
                }}
              >
                → Check your own answer
              </Link>
              <Link
                to={meLinkPath}
                style={{
                  fontSize: 13,
                  color: PRIMARY_GREEN_DARK,
                  textDecoration: "none",
                  fontWeight: 500,
                  padding: "4px 0",
                }}
              >
                → See progress dashboard
              </Link>
            </section>
          </aside>
        </div>

        {/* Inline keyframes + responsive grid rules — no global Tailwind */}
        <style>{`
          .lt-practice-fade-in { animation: lt-practice-fade 220ms ease-out; }
          @keyframes lt-practice-fade {
            from { opacity: 0; transform: translateY(2px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .lt-practice-main-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 20px;
            align-items: start;
          }
          @media (min-width: 1024px) {
            .lt-practice-main-grid {
              grid-template-columns: minmax(0, 1fr) minmax(0, 340px);
            }
          }
          .lt-practice-card-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 12px;
          }
          @media (min-width: 768px) {
            .lt-practice-card-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
          .lt-practice-more-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 12px;
            padding-top: 12px;
            padding-bottom: 6px;
          }
          @media (min-width: 768px) {
            .lt-practice-more-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
          .lt-practice-scope-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 16px;
          }
          @media (min-width: 768px) {
            .lt-practice-scope-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 20px;
            }
          }
          .lt-practice-blueprint-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }
          @media (min-width: 768px) {
            .lt-practice-blueprint-grid {
              grid-template-columns: repeat(5, minmax(0, 1fr));
            }
          }
          .lt-practice-quick-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 14px;
          }
          @media (min-width: 768px) {
            .lt-practice-quick-grid {
              grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.8fr);
            }
          }

          /* ── PR-K2H-8b — Practice Filters Panel ─────────────── */
          .lt-pf-panel {
            border-radius: 16px;
            border: 1px solid var(--bg-card-border, hsl(220, 18%, 90%));
            background: var(--bg-card, #ffffff);
            padding: 16px 20px;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .lt-pf-toggle-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
          }
          .lt-pf-toggle {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 999px;
            border: 1px solid var(--bg-card-border, hsl(220, 18%, 90%));
            background: transparent;
            color: var(--text-muted, hsl(220, 15%, 42%));
            font-size: 0.78rem;
            font-weight: 700;
            cursor: pointer;
          }
          .lt-pf-toggle[data-active="true"] {
            border-color: rgba(22, 185, 106, 0.30);
            color: var(--lt-green-dark, hsl(152, 60%, 30%));
            background: rgba(22, 185, 106, 0.08);
          }
          .lt-pf-rows {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .lt-pf-row {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .lt-pf-label {
            min-width: 90px;
            font-size: 0.72rem;
            font-weight: 800;
            color: var(--text-muted, hsl(220, 15%, 42%));
            text-transform: uppercase;
            letter-spacing: 0.07em;
            flex-shrink: 0;
          }
          .lt-pf-chips {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
          }
          .lt-pf-chip {
            padding: 5px 12px;
            border-radius: 999px;
            border: 1px solid var(--bg-card-border, hsl(220, 18%, 90%));
            background: transparent;
            color: var(--text-muted, hsl(220, 15%, 42%));
            font-size: 0.76rem;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: border-color 0.15s, background 0.15s, color 0.15s;
          }
          .lt-pf-chip[data-active="true"] {
            border-color: rgba(22, 185, 106, 0.30);
            background: rgba(22, 185, 106, 0.12);
            color: var(--lt-green-dark, hsl(152, 60%, 30%));
            font-weight: 700;
          }
          .lt-pf-clear {
            align-self: flex-start;
            font-size: 0.74rem;
            font-weight: 700;
            color: var(--text-muted, hsl(220, 15%, 42%));
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            text-decoration: underline;
            text-underline-offset: 2px;
          }
          .lt-pf-active-summary {
            font-size: 0.74rem;
            color: var(--lt-green-dark, hsl(152, 60%, 30%));
            font-weight: 700;
          }
          @media (max-width: 1023px) {
            .lt-pf-panel { padding: 12px 14px; gap: 10px; }
            .lt-pf-label { min-width: 72px; font-size: 0.68rem; }
            .lt-pf-chip { font-size: 0.72rem; padding: 4px 10px; }
          }
        `}</style>
      </div>
    </div>
  );

  // Mobile: wrap in the shared header (avatar-dropdown). Desktop: bare — DesktopShell
  // provides the chrome (item E).
  return isDesktop ? (
    pageBody
  ) : (
    <MobileShell title="Practice" subtitle="Pick a scope, then choose what to do." showNav>
      {pageBody}
    </MobileShell>
  );
}

// Reference: keep DANGER_FG token live for future error states without
// triggering an unused-symbol lint until then.
void DANGER_FG;
