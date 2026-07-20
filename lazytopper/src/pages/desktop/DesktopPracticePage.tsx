import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  getMistakeLogs,
  type MistakeLogEntry,
} from "../../services/mistakeLogService";
import { type PracticeQuestion } from "../../data/predictionDataService";
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
 *   (the v6 practice hub: a two-step "pick what, then pick how" flow with a
 *    Mistake-Intelligence rail.)
 *
 * Composition (top → bottom):
 *   1. BackToParent — uses ?returnTo / ?source from URL, falls back to "/".
 *   2. Page header — eyebrow / "What shall we practise?" / lede.
 *   3. Topic-Hub focus banner — only when arriving with ?focus / ?subtopicHint.
 *   4. Two-column grid (main + rail):
 *      MAIN
 *        Step 1 "What to work on" — the scope card: subject · stream · scope,
 *          then the topic picker as a DROPDOWN for both scopes (single-select
 *          radio / multi-select checklist + removable pills). The dropdown is a
 *          new INPUT for the SAME state the old chips wrote (topicSlug /
 *          selectedTopicSlugs), so every emitted URL is unchanged.
 *        Step 2 "How to practise" — four accent-coloured mode cards:
 *          Quick Practice (green, with the timer toggle) / Worksheet (sky, with
 *          the mistake-focus mini-section) / Predicted-HPQs (violet) / Full Test
 *          (rose). Desktop renders a 2x2 grid; mobile a full-width snap carousel
 *          with page dots. A card stays full-colour when no topic is picked —
 *          only its CTA is gated (an inert <span>, never a navigable button).
 *      RAIL
 *        MistakeIntelligencePanel — navy, three honest states:
 *             - logged-out → "Mistake-aware practice needs saved
 *               attempts" + start-trial CTA.
 *             - logged-in, no data → "Grade an answer in Check &
 *               Improve" pointer.
 *             - logged-in, has data → real 4-bucket aggregation from
 *               getMistakeLogs(uid, 7), the weak-area drill CTA, and a
 *               mistake-aware-worksheet secondary.
 *        MistakeTrendCard — DESKTOP ONLY. Real marks-lost-per-day from the SAME
 *          getMistakeLogs history; renders nothing when there is no honest
 *          series (fewer than two days with data is not a trend).
 *
 * Retired in the v6 rebuild (#492) — the ROUTES live on, only the render went:
 *   the ContextBar chips, the "More practice options" accordion (Timed Drill
 *   folded into Quick Practice as a toggle; Chapter Test lives on Topic Hub),
 *   the PaperBlueprint preview (FullMockPage owns it), the predicted-questions
 *   tabs (the HPQ mode card replaces them), the topic-reference panel, and the
 *   Quick-links aside.
 *
 * Routing reuse — every CTA points at an existing production route:
 *   - /practice/:grade/:subject (PracticePage)        — Quick Practice
 *                                                       (+ timed=1 when the
 *                                                        card's timer is on)
 *   - /practice/worksheets       (DesktopWorksheetsPage / mobile)
 *   - /highly-probable/:grade/:subject                — Predicted/HPQs
 *   - /full-mock/:grade/:subject                      — Full Test
 *   - /practice/:grade/:subject?topic=…               — MI weak-area drill
 *   - /check-improve / /me / /login (?reason=&redirect=)
 * All carry source=practice and returnTo=/practice-hub for back-nav.
 * The hub no longer emits /chapter-test — that card moved to Topic Hub in the
 * v6 rebuild. This contract is pinned by DesktopPracticePage.routingParity.test
 * .tsx, whose expected URLs were captured from trunk BEFORE the rebuild.
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
const SECTION_BG = "hsl(220, 20%, 97%)";
const PILL_BG = "hsl(210, 33%, 96%)";
const PILL_FG = "hsl(220, 25%, 22%)";
const DANGER_FG = "hsl(0, 65%, 42%)";

const FONT_DISPLAY =
  '"Fraunces", "Source Serif Pro", Georgia, "Times New Roman", serif';
const FONT_BODY =
  '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

// ── Inline SVG glyphs ─────────────────────────────────────────────────────
// Navy is a PRIMARY in the redesign: structure (step numbers, headings) and
// the Mistake-Intelligence surface. Green stays the ACTION colour (CTAs).
const NAVY = "hsl(222, 47%, 24%)";
const NAVY_DARK = "hsl(222, 47%, 16%)";
const NAVY_TINT = "hsl(222, 45%, 96%)";
const NAVY_LINE = "hsl(222, 35%, 84%)";

// Per-mode accents for the four "How to practise" cards.
type ModeAccent = "quick" | "worksheet" | "hpq" | "full";
const MODE_ACCENT: Record<
  ModeAccent,
  { accent: string; tint: string; line: string }
> = {
  quick: {
    accent: PRIMARY_GREEN,
    tint: "hsl(152, 55%, 92%)",
    line: "hsl(152, 50%, 80%)",
  },
  worksheet: {
    accent: "hsl(205, 70%, 52%)",
    tint: "hsl(205, 70%, 92%)",
    line: "hsl(205, 60%, 80%)",
  },
  hpq: {
    accent: "hsl(255, 50%, 58%)",
    tint: "hsl(255, 60%, 93%)",
    line: "hsl(255, 50%, 83%)",
  },
  full: {
    accent: "hsl(340, 62%, 56%)",
    tint: "hsl(340, 70%, 93%)",
    line: "hsl(340, 60%, 84%)",
  },
};

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
function IconChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false" style={IconStroke}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
function IconCheck({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false" style={IconStroke}>
      <path d="M20 6L9 17l-5-5" />
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

// ── TopicDropdown (page-local) ────────────────────────────────────────────
// ONE dropdown pattern for BOTH scopes — single-select (radio) and
// multi-select (checklist + removable pills). It is a new INPUT for the
// EXISTING state: it writes the same `topicSlug` / `selectedTopicSlugs` the
// chips wrote, so every downstream URL is unchanged.
//
// The panel renders INLINE (in normal flow, not absolutely positioned) so it
// can never be clipped by an ancestor's overflow — the hub's rail and the
// mobile carousel both clip.
interface TopicDropdownProps {
  topics: ReturnType<typeof desktopTopicsBySubject>;
  multi: boolean;
  /** Single-select: the chosen slug (or null). Ignored when `multi`. */
  topicSlug: string | null;
  /** Multi-select: the chosen slug SET. Ignored when not `multi`. */
  selectedSlugs: string[];
  onPickSingle: (slug: string) => void;
  onToggle: (slug: string) => void;
  label: string;
}
function TopicDropdown({
  topics,
  multi,
  topicSlug,
  selectedSlugs,
  onPickSingle,
  onToggle,
  label,
}: TopicDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on an outside click / Escape — the panel is inline, so it must not
  // linger once the learner moves on.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (topics.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: 12.5, color: TEXT_MUTED }}>
        No topics available for this subject/stream combination.
      </p>
    );
  }

  const selectedNames = topics
    .filter((t) => selectedSlugs.includes(t.slug))
    .map((t) => ({ slug: t.slug, name: t.name }));
  const buttonLabel = multi
    ? selectedSlugs.length > 0
      ? `${selectedSlugs.length} topic${selectedSlugs.length > 1 ? "s" : ""} selected`
      : label
    : topics.find((t) => t.slug === topicSlug)?.name ?? label;
  const hasValue = multi ? selectedSlugs.length > 0 : !!topicSlug;

  return (
    <div ref={wrapRef} style={{ position: "relative", maxWidth: 340 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          width: "100%",
          fontFamily: FONT_BODY,
          fontSize: 12.5,
          padding: "9px 13px",
          borderRadius: 9,
          border: `1px solid ${open ? NAVY : BORDER}`,
          background: CARD_BG,
          color: hasValue ? NAVY : TEXT_MUTED,
          fontWeight: hasValue ? 500 : 400,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {buttonLabel}
        </span>
        <IconChevronDown />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable={multi}
          style={{
            marginTop: 8,
            width: "100%",
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 11,
            boxShadow: "0 6px 18px rgba(20, 40, 80, 0.10)",
            padding: 6,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {topics.map((t) => {
            const on = multi ? selectedSlugs.includes(t.slug) : topicSlug === t.slug;
            return (
              <div
                key={t.slug}
                role="option"
                aria-selected={on}
                tabIndex={0}
                onClick={() => {
                  if (multi) {
                    onToggle(t.slug);
                  } else {
                    onPickSingle(t.slug);
                    setOpen(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  if (multi) {
                    onToggle(t.slug);
                  } else {
                    onPickSingle(t.slug);
                    setOpen(false);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "8px 10px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  cursor: "pointer",
                  color: TEXT_FG,
                }}
              >
                {multi ? (
                  <span
                    aria-hidden
                    style={{
                      width: 17,
                      height: 17,
                      borderRadius: 5,
                      border: `1.5px solid ${on ? NAVY : BORDER}`,
                      background: on ? NAVY : "transparent",
                      color: "#fff",
                      flex: "0 0 auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {on ? <IconCheck /> : null}
                  </span>
                ) : (
                  <span
                    aria-hidden
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: `1.5px solid ${on ? NAVY : BORDER}`,
                      flex: "0 0 auto",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {on ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: NAVY,
                          display: "block",
                        }}
                      />
                    ) : null}
                  </span>
                )}
                {t.name}
              </div>
            );
          })}
        </div>
      ) : null}

      {multi && selectedNames.length > 0 ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>
          {selectedNames.map((t) => (
            <span
              key={t.slug}
              style={{
                fontSize: 11,
                padding: "4px 9px",
                borderRadius: 7,
                background: NAVY_TINT,
                color: NAVY,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {t.name}
              <button
                type="button"
                aria-label={`Remove ${t.name}`}
                onClick={() => onToggle(t.slug)}
                style={{
                  appearance: "none",
                  WebkitAppearance: "none",
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  color: NAVY,
                  opacity: 0.6,
                  fontWeight: 600,
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                &#215;
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── StepHeader (page-local) ───────────────────────────────────────────────
function StepHeader({ n, title, aside }: { n: number; title: string; aside?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 12 }}>
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: NAVY,
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
        }}
      >
        {n}
      </span>
      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: "1.06rem",
          fontWeight: 600,
          color: NAVY_DARK,
          margin: 0,
        }}
      >
        {title}
      </h2>
      {aside ? (
        <span className="lt-step-aside" style={{ fontSize: 12, color: TEXT_MUTED, marginLeft: "auto" }}>
          {aside}
        </span>
      ) : null}
    </div>
  );
}

// ── ModeCard (page-local) ─────────────────────────────────────────────────
// One of the four "How to practise" cards. Accent-coloured, icon tile,
// hover-lift. It only RENDERS — the href it fires is computed by the frozen
// builders in the page component and handed in as `to`.
interface ModeCardProps {
  accent: ModeAccent;
  icon: React.ReactElement;
  title: string;
  desc: string;
  chips: string[];
  cta: string;
  to: string | null;
  disabledHint?: string;
  onActivate: (to: string) => void;
  extra?: React.ReactNode;
}
function ModeCard({
  accent,
  icon,
  title,
  desc,
  chips,
  cta,
  to,
  disabledHint,
  onActivate,
  extra,
}: ModeCardProps) {
  const [hover, setHover] = useState(false);
  const tone = MODE_ACCENT[accent];
  const disabled = !to;
  return (
    <article
      className="lt-mode-card"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        background: `linear-gradient(180deg, ${CARD_BG}, hsl(220, 25%, 99%))`,
        border: `1px solid ${hover ? tone.accent : tone.line}`,
        borderRadius: 16,
        padding: 18,
        overflow: "hidden",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hover
          ? "0 8px 22px rgba(20, 40, 80, 0.09)"
          : "0 2px 8px -4px hsla(220, 30%, 40%, 0.10)",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 5,
          height: "100%",
          background: tone.accent,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 9 }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: tone.tint,
            color: tone.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          {icon}
        </span>
        <h3
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "1.06rem",
            fontWeight: 600,
            color: NAVY_DARK,
            margin: 0,
          }}
        >
          {title}
        </h3>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          color: TEXT_MUTED,
          lineHeight: 1.5,
          minHeight: 38,
        }}
      >
        {desc}
      </p>
      {chips.length > 0 ? (
        <div style={{ marginTop: 11, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {chips.map((c) => (
            <span
              key={c}
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                padding: "4px 9px",
                borderRadius: 7,
                background: tone.tint,
                color: tone.accent,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      ) : null}
      {extra}
      <div style={{ marginTop: "auto", paddingTop: 13 }}>
        {disabled ? (
          <span
            aria-disabled
            title={disabledHint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: tone.accent,
              background: tone.tint,
              padding: "6px 12px",
              borderRadius: 9,
            }}
          >
            {disabledHint ?? cta}
            <IconArrowRight />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onActivate(to)}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              border: "none",
              background: "transparent",
              padding: 0,
              fontFamily: FONT_BODY,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: tone.accent,
              cursor: "pointer",
            }}
          >
            {cta}
            <IconArrowRight />
          </button>
        )}
      </div>
    </article>
  );
}

// ── PracticeScopeBuilder (page-local; subject / stream / scope + topic dropdown)
interface PracticeScopeBuilderProps {
  value: DesktopScopeValue;
  onChange: (next: DesktopScopeValue) => void;
  topics: ReturnType<typeof desktopTopicsBySubject>;
  summary: string;
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

function PracticeScopeBuilder({
  value,
  onChange,
  topics,
  summary,
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

  const fieldLabel: React.CSSProperties = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: TEXT_MUTED,
    marginBottom: 7,
  };

  return (
    <section
      style={{
        position: "relative",
        background: `linear-gradient(170deg, ${CARD_BG}, hsl(222, 40%, 99%))`,
        border: `1px solid ${NAVY_LINE}`,
        borderRadius: 16,
        padding: "18px 16px 16px",
        boxShadow: "0 6px 20px -10px hsla(222, 45%, 30%, 0.16)",
        overflow: "hidden",
      }}
      aria-label="What to work on"
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${NAVY}, ${PRIMARY_GREEN})`,
          opacity: 0.85,
        }}
      />

      <div style={{ marginBottom: 14 }}>
        <div style={fieldLabel}>Subject</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {SUBJECT_OPTIONS.map((s) => (
            <PillButton key={s} active={value.subject === s} onClick={() => setSubject(s)}>
              {s}
            </PillButton>
          ))}
        </div>
      </div>

      {value.subject === "Science" ? (
        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabel}>Stream</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {STREAM_OPTIONS.map((s) => (
              <PillButton key={s} active={value.stream === s} onClick={() => setStream(s)}>
                {s}
              </PillButton>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ marginBottom: 14 }}>
        <div style={fieldLabel}>Scope</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {SCOPE_OPTIONS.map((s) => (
            <PillButton key={s.value} active={value.scope === s.value} onClick={() => setScope(s.value)}>
              {s.label}
            </PillButton>
          ))}
        </div>
      </div>

      {value.scope === "topic" ? (
        <div>
          <div style={fieldLabel}>Pick a topic</div>
          <TopicDropdown
            topics={topics}
            multi={false}
            topicSlug={value.topicSlug}
            selectedSlugs={[]}
            onPickSingle={setSingleTopic}
            onToggle={setSingleTopic}
            label="Choose a topic"
          />
        </div>
      ) : null}

      {value.scope === "multi-topic" ? (
        <div>
          <div style={fieldLabel}>Pick topics</div>
          <TopicDropdown
            topics={topics}
            multi
            topicSlug={null}
            selectedSlugs={value.selectedTopicSlugs}
            onPickSingle={setSingleTopic}
            onToggle={toggleTopic}
            label="Select topics"
          />
          {value.selectedTopicSlugs.length < 2 ? (
            <p style={{ margin: "9px 0 0 0", fontSize: 11, color: TEXT_MUTED }}>
              Pick at least{" "}
              <strong style={{ color: TEXT_FG, fontWeight: 600 }}>2 topics</strong> to combine them.
            </p>
          ) : null}
        </div>
      ) : null}

      {value.scope === "full-subject" ? (
        <div>
          <div style={fieldLabel}>Scope</div>
          <p style={{ margin: 0, fontSize: 12.5, color: TEXT_MUTED, lineHeight: 1.5 }}>
            The whole subject &mdash; questions drawn across all{" "}
            {value.subject === "Science" && value.stream !== "All" ? `${value.stream} ` : ""}
            chapters in proportion to exam weight.
          </p>
        </div>
      ) : null}

      <p style={{ margin: "14px 0 0 0", fontSize: 11.5, color: TEXT_MUTED, lineHeight: 1.5 }}>
        {summary}
      </p>
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


// ── Mistake trend (real data — same getMistakeLogs history the buckets use) ─
// Marks lost per DAY across the 7-day window, oldest → newest. This is a
// straight read of `timestamp` + `marksLost` on real entries; nothing is
// interpolated or invented. Fewer than two days with data is not a trend, so
// we return null and the card does not render (honest empty state).
interface MistakeTrendPoint {
  day: string;
  marksLost: number;
}
interface MistakeTrend {
  points: MistakeTrendPoint[];
  /** Percent change first → last. null when the first day has no marks lost. */
  changePct: number | null;
}
function buildMistakeTrend(entries: MistakeLogEntry[]): MistakeTrend | null {
  const byDay = new Map<string, number>();
  for (const e of entries) {
    const raw = (e?.timestamp ?? "").trim();
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const lost =
      typeof e.marksLost === "number" && Number.isFinite(e.marksLost) && e.marksLost > 0
        ? e.marksLost
        : 0;
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + lost);
  }
  const points = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([day, marksLost]) => ({ day, marksLost }));
  if (points.length < 2) return null;
  const first = points[0].marksLost;
  const last = points[points.length - 1].marksLost;
  const changePct = first > 0 ? Math.round(((last - first) / first) * 100) : null;
  return { points, changePct };
}

/**
 * Marks (not mistake COUNTS) attributable to one bucket, read from real
 * `stepDetails`. Returns 0 when entries carry no step detail — the caller
 * then omits the "marks to reclaim" line rather than inventing a number.
 */
function marksLostForBucket(entries: MistakeLogEntry[], bucket: BucketKey): number {
  let total = 0;
  for (const e of entries) {
    for (const s of e?.stepDetails ?? []) {
      const type = (s?.mistakeType ?? "").toLowerCase();
      const marks = typeof s?.marksDeducted === "number" ? s.marksDeducted : 0;
      if (type.includes(bucket) && Number.isFinite(marks) && marks > 0) total += marks;
    }
  }
  return Math.round(total * 2) / 2;
}

// ── MistakeTrendCard — DESKTOP-ONLY rail card, real series only ───────────
function MistakeTrendCard({ trend }: { trend: MistakeTrend | null }) {
  if (!trend) return null;
  const { points, changePct } = trend;
  const W = 260;
  const H = 76;
  const PAD = 4;
  const max = Math.max(...points.map((p) => p.marksLost), 1);
  const coords = points.map((p, i) => ({
    x: PAD + (i * (W - PAD * 2)) / (points.length - 1),
    y: PAD + (1 - p.marksLost / max) * (H - PAD * 2 - 8),
  }));
  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${H} L${coords[0].x.toFixed(1)},${H} Z`;
  const improving = changePct !== null && changePct < 0;
  const headline =
    changePct === null
      ? "Marks lost per day"
      : improving
        ? "Marks lost — trending down"
        : changePct > 0
          ? "Marks lost — trending up"
          : "Marks lost — holding steady";

  return (
    <section
      className="lt-trend-card"
      aria-label="Mistake marks trend"
      style={{
        background: `linear-gradient(180deg, ${CARD_BG}, hsl(152, 30%, 99%))`,
        border: `1px solid ${improving ? "hsl(152, 50%, 82%)" : BORDER}`,
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 4px 14px -8px hsla(152, 45%, 30%, 0.14)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: NAVY_TINT,
            color: NAVY,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          <IconTarget />
        </span>
        <h3
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 14,
            fontWeight: 600,
            color: NAVY_DARK,
            margin: 0,
          }}
        >
          {headline}
        </h3>
      </div>
      <p style={{ margin: "0 0 12px 0", fontSize: 11.5, color: TEXT_MUTED }}>
        Your mistake-marks per day over the last {points.length}
        {changePct !== null ? (
          <>
            {" · "}
            <b style={{ color: improving ? PRIMARY_GREEN_DARK : TEXT_FG }}>
              {improving ? "down" : changePct > 0 ? "up" : "flat"}{" "}
              {Math.abs(changePct)}%
            </b>
          </>
        ) : null}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Marks lost across the last ${points.length} days with recorded mistakes`}
        style={{ width: "100%", height: 76, display: "block" }}
      >
        <defs>
          <linearGradient id="lt-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRIMARY_GREEN} stopOpacity="0.28" />
            <stop offset="100%" stopColor={PRIMARY_GREEN} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lt-trend-fill)" />
        <path
          d={line}
          fill="none"
          stroke="hsl(152, 55%, 42%)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={coords[0].x} cy={coords[0].y} r={3} fill="hsl(222, 47%, 40%)" />
        <circle
          cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r={4}
          fill="hsl(152, 55%, 42%)"
        />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: TEXT_MUTED, marginTop: 5 }}>
        <span>{points.length} days ago</span>
        <span>latest</span>
      </div>
    </section>
  );
}

// ── MistakeIntelligencePanel (3 honest states) ────────────────────────────
interface MistakePanelProps {
  isSignedIn: boolean;
  loading: boolean;
  buckets: ReturnType<typeof aggregateBuckets>;
  weakTopic: string | null;
  drillTopicSlug: string | null;
  /** Real marks attributable to the top bucket, or 0 when entries carry no
   *  step detail. 0 means the "marks to reclaim" line is omitted, never faked. */
  reclaimableMarks: number;
  worksheetMistakeAwarePath: string;
  checkPath: string;
  drillPath: string;
  /** Current Practice page URL (path + query). Used to preserve scope/focus
   *  on post-login redirect when a signed-out learner clicks the locked-state
   *  "Start free trial" CTA. */
  currentPracticeUrl: string;
}

/** Bar colours for the 4 buckets, in rank order (top bucket = green). */
const MI_BAR_COLOURS = [
  "linear-gradient(90deg, hsl(152, 60%, 55%), hsl(152, 55%, 45%))",
  "hsl(255, 60%, 70%)",
  "hsl(205, 70%, 62%)",
  "hsl(220, 15%, 60%)",
];

function MistakeIntelligencePanel({
  isSignedIn,
  loading,
  buckets,
  weakTopic,
  drillTopicSlug,
  reclaimableMarks,
  worksheetMistakeAwarePath,
  checkPath,
  drillPath,
  currentPracticeUrl,
}: MistakePanelProps) {
  // States 1 and 2 stay honest and unchanged in substance — a learner with no
  // saved attempts is told so, and never shown a fabricated weak area.
  if (!isSignedIn) {
    return (
      <section
        style={{
          background: CARD_BG,
          border: `1px solid ${NAVY_LINE}`,
          borderRadius: 16,
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
              background: NAVY_TINT,
              color: NAVY,
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
              color: NAVY_DARK,
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
        <div style={{ fontSize: 11, color: TEXT_MUTED }}>Recommended, not required.</div>
      </section>
    );
  }

  if (loading || !buckets.topRow) {
    return (
      <section
        style={{
          background: CARD_BG,
          border: `1px solid ${NAVY_LINE}`,
          borderRadius: 16,
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
              background: NAVY_TINT,
              color: NAVY,
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
              color: NAVY_DARK,
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
                style={{ color: PRIMARY_GREEN, fontWeight: 600, textDecoration: "none" }}
              >
                Check &amp; Improve
              </Link>{" "}
              to unlock mistake-aware practice.
            </>
          )}
        </p>
        <div style={{ fontSize: 11, color: TEXT_MUTED }}>Recommended, not required.</div>
      </section>
    );
  }

  // ── State 3 — signed in, real data. The navy intelligence surface.
  const total = buckets.total;
  const top = buckets.topRow;
  return (
    <section
      className="lt-mi-card"
      aria-label="Your latest weak area"
      style={{
        position: "relative",
        borderRadius: 18,
        background: `linear-gradient(165deg, ${NAVY} 0%, ${NAVY_DARK} 100%)`,
        padding: 18,
        color: "#fff",
        boxShadow: "0 12px 30px -8px hsla(222, 47%, 20%, 0.45)",
        overflow: "hidden",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 130,
          height: 130,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(152, 55%, 55%, 0.22), transparent 70%)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12, position: "relative" }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: `linear-gradient(135deg, ${PRIMARY_GREEN}, ${PRIMARY_GREEN_DARK})`,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 3px 10px hsla(152, 55%, 35%, 0.5)",
            flex: "0 0 auto",
          }}
        >
          <IconSparkles size={15} />
        </span>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 600, margin: 0 }}>
          Your latest weak area
        </h3>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 9,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "hsl(152, 55%, 80%)",
            background: "hsla(152, 55%, 55%, 0.16)",
            padding: "3px 8px",
            borderRadius: 6,
          }}
        >
          7 days
        </span>
      </div>

      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 19,
          fontWeight: 600,
          lineHeight: 1.15,
          marginBottom: 3,
          position: "relative",
        }}
      >
        {weakTopic ?? "Across your saved attempts"}{" "}
        <span style={{ color: "hsl(152, 60%, 68%)" }}>{top.label.toLowerCase()}</span>
      </div>
      <p
        style={{
          margin: "0 0 13px 0",
          fontSize: 12,
          color: "hsl(220, 25%, 80%)",
          lineHeight: 1.45,
          position: "relative",
        }}
      >
        {top.count} of {total} tagged mistake{total === 1 ? "" : "s"} in the last 7 days were
        classed as {top.label.toLowerCase()}.
      </p>

      {/* Only shown when real step-level marks exist — never a derived guess. */}
      {reclaimableMarks > 0 ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 5,
            background: "hsla(152, 55%, 55%, 0.16)",
            color: "hsl(152, 60%, 80%)",
            borderRadius: 8,
            padding: "6px 11px",
            fontSize: 11.5,
            marginBottom: 14,
            position: "relative",
          }}
        >
          <b style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: "#fff" }}>
            {reclaimableMarks} mark{reclaimableMarks === 1 ? "" : "s"}
          </b>{" "}
          lost to {top.label.toLowerCase()} slips
        </div>
      ) : null}

      <ul
        style={{
          listStyle: "none",
          margin: "0 0 14px 0",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 9,
          position: "relative",
        }}
      >
        {buckets.rows.map((r, i) => {
          const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
          return (
            <li key={r.key} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11.5 }}>
              <span className="lt-mi-bar-label" style={{ width: 78, color: "hsl(220, 20%, 86%)", flex: "0 0 auto" }}>
                {r.label}
              </span>
              <span
                style={{
                  flex: 1,
                  height: 7,
                  borderRadius: 4,
                  background: "hsla(220, 30%, 60%, 0.25)",
                  overflow: "hidden",
                  display: "block",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: 4,
                    background: MI_BAR_COLOURS[Math.min(i, MI_BAR_COLOURS.length - 1)],
                  }}
                />
              </span>
              <span
                style={{
                  width: 16,
                  textAlign: "right",
                  fontWeight: 700,
                  flex: "0 0 auto",
                  fontFamily: FONT_DISPLAY,
                  color: "#fff",
                }}
              >
                {r.count}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Hero action — the frozen weak-area drill URL. */}
      <Link
        to={drillPath}
        aria-label={drillTopicSlug ? "Run targeted drill on weak topic" : "Run targeted drill"}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          background: `linear-gradient(135deg, ${PRIMARY_GREEN}, ${PRIMARY_GREEN_DARK})`,
          color: "#fff",
          fontSize: 13.5,
          fontWeight: 600,
          padding: 12,
          borderRadius: 11,
          textDecoration: "none",
          boxShadow: "0 4px 14px hsla(152, 55%, 30%, 0.4)",
          position: "relative",
        }}
      >
        <IconTarget /> Run targeted drill
      </Link>

      {/* Quiet secondary — the mistake-aware worksheet keeps its home here. */}
      <Link
        to={worksheetMistakeAwarePath}
        style={{
          display: "block",
          textAlign: "center",
          marginTop: 10,
          fontSize: 11.5,
          fontWeight: 500,
          color: "hsl(220, 25%, 80%)",
          textDecoration: "none",
          position: "relative",
        }}
      >
        Or build a mistake-aware worksheet
      </Link>
    </section>
  );
}

// ── PR-C2.1 helpers — real-data resolution for in-page Quick Practice + HPQ tabs ──

const RETURN_TO = "/practice-hub";
const SOURCE: DesktopActionSource = "practice";


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

  // The retired "Timed Drill" card folds into Quick Practice as a toggle. It
  // adds `timed=1` to the SAME buildLegacyPracticePath the Quick Practice CTA
  // already uses, so the learner's chosen scope (topic= / topics= / focus) is
  // carried through — the old separate card dropped multi-topic and focus.
  const [timerOn, setTimerOn] = useState(false);

  // Mobile mode-card carousel — page dots track scroll position. Desktop
  // renders a 2x2 grid and never scrolls, so the index simply stays at 0.
  const modeScrollRef = useRef<HTMLDivElement | null>(null);
  const [modeIndex, setModeIndex] = useState(0);
  const handleModeScroll = () => {
    const el = modeScrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const perCard = el.scrollWidth / 4;
    setModeIndex(Math.max(0, Math.min(3, Math.round(el.scrollLeft / perCard))));
  };

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
  // Desktop rail trend — real per-day marks-lost series, or null (no card).
  const mistakeTrend = useMemo(() => buildMistakeTrend(mistakes), [mistakes]);
  // Real marks behind the top bucket; 0 when entries carry no step detail, in
  // which case the MI card omits the line rather than inventing a number.
  const reclaimableMarks = useMemo(
    () => (buckets.topRow ? marksLostForBucket(mistakes, buckets.topRow.key) : 0),
    [mistakes, buckets.topRow],
  );
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

  // Reset the Quick Practice panel whenever scope changes — stale questions
  // for a different topic would be misleading.
  useEffect(() => {
    setQuickPracticePanel(null);
    resetQuickPracticeRunState();
  }, [scope.subject, scope.stream, scope.scope, scope.topicSlug, scope.selectedTopicSlugs]);

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
          timed: timerOn || undefined,
        })
      : scope.scope === "full-subject"
        ? buildLegacyPracticePath({ timed: timerOn || undefined })
        : scope.scope === "multi-topic" && scope.selectedTopicSlugs.length >= 2
          ? buildLegacyPracticePath({
              // The full SET, not selectedTopicSlugs[0] — the old collapse was the
              // [FU-PRACTICEHUB-MULTITOPIC] gap. PracticePage fans out per topic.
              topics: scope.selectedTopicSlugs.join(","),
              timed: timerOn || undefined,
            })
          : scope.scope === "multi-topic" && scope.selectedTopicSlugs.length === 1
            ? buildLegacyPracticePath({
                topic: scope.selectedTopicSlugs[0],
                timed: timerOn || undefined,
              })
            : buildLegacyPracticePath({ timed: timerOn || undefined });

  // Quick-links paths — Check / Progress / Worksheet (sign-in-aware).
  // Check path — still used by the MI panel's no-data pointer.
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

  // Step-1 aside — a compact echo of the current scope.
  const scopeStepAside =
    scope.scope === "full-subject"
      ? `${scope.subject} · full subject`
      : scope.scope === "multi-topic"
        ? `${scope.subject} · ${scope.selectedTopicSlugs.length || "pick"} topic${
            scope.selectedTopicSlugs.length === 1 ? "" : "s"
          }`
        : `${scope.subject} · ${selectedTopic?.name ?? "pick a topic"}`;

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

        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: NAVY,
              fontWeight: 600,
            }}
          >
            Practice
          </div>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
              fontSize: "clamp(22px, 3vw, 30px)",
              margin: "4px 0 3px",
              letterSpacing: "-0.01em",
              color: NAVY_DARK,
            }}
          >
            What shall we practise?
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED }}>
            Pick what to work on, then choose how — a quick set, a worksheet, the
            predicted questions, or a full paper.
          </p>
        </div>

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

        <section>
          <StepHeader n={1} title="What to work on" aside={scopeStepAside} />
          <PracticeScopeBuilder
            value={scope}
            onChange={setScope}
            topics={topics}
            summary={scopeSummary}
          />
        </section>

        <div className="lt-practice-main-grid">
          {/* ───────────────────── MAIN COLUMN ───────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <section>
              <StepHeader n={2} title="How to practise" />
              <div
                className="lt-mode-grid"
                ref={modeScrollRef}
                onScroll={handleModeScroll}
              >
                <ModeCard
                  accent="quick"
                  icon={<IconLayers />}
                  title="Quick Practice"
                  desc="A short, focused set of real questions — presets or your own filters."
                  chips={["Presets", "Board mix"]}
                  cta="Start quick practice"
                  to={quickPracticeTarget}
                  disabledHint="Pick a topic to start"
                  onActivate={(to) => navigate(to)}
                  extra={
                    <label
                      style={{
                        marginTop: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 11.5,
                        color: TEXT_MUTED,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={timerOn}
                        onChange={(e) => setTimerOn(e.target.checked)}
                        style={{ accentColor: PRIMARY_GREEN }}
                      />
                      <IconTimer size={14} /> Add a timer
                    </label>
                  }
                />
                <ModeCard
                  accent="worksheet"
                  icon={<IconClipboard />}
                  title="Worksheet"
                  desc="A sectioned worksheet, ready for screen or print."
                  chips={["Printable", "Sectioned"]}
                  cta="Open worksheet builder"
                  to={worksheetPath}
                  disabledHint="Pick a topic to start"
                  onActivate={(to) => navigate(to)}
                  extra={
                    <label
                      style={{
                        marginTop: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 11.5,
                        color: buckets.topRow ? TEXT_MUTED : "hsl(220, 15%, 62%)",
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
                <ModeCard
                  accent="hpq"
                  icon={<IconSparkles />}
                  title="Predicted (HPQs)"
                  desc="The questions most likely to appear — from the highly-probable catalogue."
                  chips={["Most likely", "Board-pattern"]}
                  cta="Open highly probable"
                  to={buildPredictedPath()}
                  onActivate={(to) => navigate(to)}
                />
                <ModeCard
                  accent="full"
                  icon={<IconGraduation />}
                  title="Full Test"
                  desc="3-hour board paper · 80 marks."
                  chips={["3 hours", "80 marks"]}
                  cta="Open full test"
                  to={buildFullTestPath()}
                  onActivate={(to) => navigate(to)}
                />
              </div>
              {/* Mobile carousel page dots — desktop renders a 2×2 grid. */}
              <div className="lt-mode-dots" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: i === modeIndex ? 16 : 6,
                      height: 6,
                      borderRadius: i === modeIndex ? 3 : "50%",
                      background: i === modeIndex ? NAVY : BORDER,
                      transition: "all 200ms ease",
                      display: "block",
                    }}
                  />
                ))}
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

          </div>

          {/* ───────────────────── ASIDE COLUMN ───────────────────── */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <MistakeIntelligencePanel
              isSignedIn={isSignedIn}
              loading={mistakesLoading && isSignedIn}
              buckets={buckets}
              weakTopic={weakTopic}
              drillTopicSlug={weakTopicSlug}
              reclaimableMarks={reclaimableMarks}
              worksheetMistakeAwarePath={mistakeAwareWorksheetPath}
              checkPath={checkLinkPath}
              drillPath={drillFromMistakePath}
              currentPracticeUrl={currentPracticeUrl}
            />

            {/* Progress trend — DESKTOP ONLY (cramped and low-value at 390px).
                Reads the SAME real getMistakeLogs history the buckets do, and
                renders nothing at all when there is no honest series. */}
            {isDesktop ? <MistakeTrendCard trend={mistakeTrend} /> : null}
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
              grid-template-columns: minmax(0, 1fr) minmax(0, 300px);
            }
          }

          /* ── Step 2 mode cards ─────────────────────────────────────────
             Desktop/tablet: a 2x2 grid. Mobile: a true full-width swipe
             carousel with snap — one whole card in view, the next peeking
             just enough to invite the swipe (never a cut card). */
          .lt-mode-grid {
            display: flex;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            gap: 12px;
            margin: 0 -16px;
            padding: 2px 16px 12px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .lt-mode-grid::-webkit-scrollbar { height: 0; }
          .lt-mode-grid > .lt-mode-card {
            scroll-snap-align: center;
            flex: 0 0 calc(100% - 26px);
          }
          .lt-mode-dots {
            display: flex;
            justify-content: center;
            gap: 6px;
            margin-top: 2px;
          }
          @media (min-width: 768px) {
            .lt-mode-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14px;
              margin: 0;
              padding: 0;
              overflow-x: visible;
            }
            .lt-mode-grid > .lt-mode-card { flex: initial; }
            /* Dots belong to the carousel only. */
            .lt-mode-dots { display: none; }
          }
          @media (max-width: 767px) {
            /* The step-header aside is redundant beside the scope card. */
            .lt-step-aside { display: none; }
            /* Hard-constrain the MI card to the viewport — no horizontal cut. */
            .lt-mi-card,
            .lt-mi-card * {
              max-width: 100%;
              box-sizing: border-box;
            }
            .lt-mi-bar-label { width: 70px; }
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
