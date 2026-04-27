import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import {
  ScopeBuilder,
  isDesktopScopeValueValid,
  type DesktopScopeValue,
} from "../../components/desktop/l2/ScopeBuilder";
import { PaperBlueprint } from "../../components/desktop/l2/PaperBlueprint";
import { ContextBar } from "../../components/desktop/l2/ContextBar";
import {
  buildDesktopCheckPath,
  buildDesktopMePath,
  buildDesktopWorksheetPath,
  withQuery,
  type DesktopActionSource,
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
 *           Quick Practice / Worksheet / Predicted-HPQs / Full Mock
 *        b. "More practice options" accordion (native <details>):
 *           Timed Drill / Chapter Test / Practice Paper
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
 *   - /exam-simulation                                — Full Mock
 *   - /chapter-test/:grade/:subject/:topicKey         — Chapter Test
 *   - /mock-builder/:grade/:subject                   — Practice Paper
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
function IconFileText({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
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
};

interface BackInfo {
  to: string;
  label: string;
}

function resolveBack(returnTo: string | null, source: string | null): BackInfo {
  // Whitelist returnTo so we never follow off-site URLs.
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
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
    </article>
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
          to={loginUrl("mistake-aware", "/practice-hub")}
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
          <IconLayers size={14} /> Add weak-area to mock
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

// ── Page ──────────────────────────────────────────────────────────────────
const RETURN_TO = "/practice-hub";
const SOURCE: DesktopActionSource = "practice";

type TabId = "topic" | "selected" | "full";

export default function DesktopPracticePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { grade, subject } = useSubjectContext();
  const isSignedIn = !!user;

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

  // Parity options (local UI checkboxes).
  const [worksheetMistakeMini, setWorksheetMistakeMini] = useState(false);
  const [mockWeakArea, setMockWeakArea] = useState(false);
  const [drillTargeted, setDrillTargeted] = useState(false);

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
  const buildLegacyPracticePath = (params: { timed?: boolean; topic?: string }): string => {
    const sp = new URLSearchParams();
    if (params.topic) sp.set("topic", params.topic);
    if (params.timed) sp.set("timed", "1");
    sp.set("source", SOURCE);
    sp.set("returnTo", RETURN_TO);
    return withQuery(`/practice/${grade}/${scope.subject}`, sp);
  };
  const buildPredictedPath = (): string => {
    const sp = new URLSearchParams();
    sp.set("source", SOURCE);
    sp.set("returnTo", RETURN_TO);
    if (scope.scope === "topic" && scope.topicSlug) sp.set("topic", scope.topicSlug);
    if (scope.scope === "multi-topic" && scope.selectedTopicSlugs.length)
      sp.set("topics", scope.selectedTopicSlugs.join(","));
    return withQuery(`/highly-probable/${grade}/${scope.subject}`, sp);
  };
  const buildExamSimulationPath = (mistakeMini?: boolean): string => {
    const sp = new URLSearchParams();
    sp.set("source", SOURCE);
    sp.set("returnTo", RETURN_TO);
    sp.set("subject", scope.subject);
    if (mistakeMini) sp.set("mistakeMini", "1");
    return withQuery(`/exam-simulation`, sp);
  };
  const buildChapterTestPath = (topicSlug: string): string => {
    const sp = new URLSearchParams();
    sp.set("source", SOURCE);
    sp.set("returnTo", RETURN_TO);
    return withQuery(
      `/chapter-test/${grade}/${scope.subject}/${encodeURIComponent(topicSlug)}`,
      sp,
    );
  };
  const buildMockBuilderPath = (mistakeMini?: boolean): string => {
    const sp = new URLSearchParams();
    sp.set("source", SOURCE);
    sp.set("returnTo", RETURN_TO);
    if (mistakeMini) sp.set("mistakeMini", "1");
    return withQuery(`/mock-builder/${grade}/${scope.subject}`, sp);
  };

  // Worksheet path — uses the real L2 helper that already targets
  // /practice/worksheets and forwards scope to that page.
  const worksheetPath = useMemo(() => {
    const baseCtx = { source: SOURCE, returnTo: RETURN_TO };
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
  }, [scope, worksheetMistakeMini]);

  // ── Card ROUTING with login fallbacks (PR-LANDING reasons) ─────────────
  const quickPracticePath: string | null = !validScope
    ? null
    : scope.scope === "topic" && scope.topicSlug
      ? buildLegacyPracticePath({ topic: scope.topicSlug })
      : buildLegacyPracticePath({});

  const fullMockPath: string = !isSignedIn
    ? loginUrl("start-full-mock", buildExamSimulationPath(mockWeakArea))
    : buildExamSimulationPath(mockWeakArea);

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

  const practicePaperPath: string = !isSignedIn
    ? loginUrl("start-full-mock", buildMockBuilderPath())
    : buildMockBuilderPath();

  // Quick-links paths — Check / Progress / Worksheet (sign-in-aware).
  const checkLinkPath = isSignedIn
    ? buildDesktopCheckPath(scope.topicSlug ?? undefined, {
        source: SOURCE,
        returnTo: RETURN_TO,
      })
    : loginUrl(
        "open-check",
        buildDesktopCheckPath(scope.topicSlug ?? undefined, {
          source: SOURCE,
          returnTo: RETURN_TO,
        }),
      );
  const meLinkPath = isSignedIn
    ? buildDesktopMePath({ source: SOURCE, returnTo: RETURN_TO })
    : loginUrl("open-progress", buildDesktopMePath({ source: SOURCE, returnTo: RETURN_TO }));

  // Mistake-aware-worksheet target for the right-rail panel — auth-aware.
  const mistakeAwareWorksheetPath = (() => {
    const baseCtx = { source: SOURCE, returnTo: RETURN_TO };
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
  const previewLine = (mode: "practice-set" | "worksheet" | "predicted" | "full-mock" | "timed" | "chapter-test" | "practice-paper"): string => {
    if (mode === "full-mock") {
      return `Full ${scope.subject} mock · 80 marks · Sections A–E${
        mockWeakArea && buckets.topRow ? ` · + weak-area mini-section (${buckets.topRow.label.toLowerCase()})` : ""
      }`;
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
    if (mockWeakArea) return "full mock (+ weak area)";
    return "intent-first";
  })();
  const chips = [
    { label: `Class ${grade}`, tone: "neutral" as const },
    {
      label:
        scope.subject === "Science" && scope.stream !== "All"
          ? `${scope.subject} · ${scope.stream}`
          : scope.subject,
      tone: "accent" as const,
    },
    { label: `Scope: ${scopeChipLabel}`, tone: "neutral" as const },
    { label: `Mode: ${modeChipLabel}`, tone: "info" as const },
  ];

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
  return (
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

        <ContextBar
          eyebrow="Practice"
          title="Practice"
          subtitle="Pick a scope, then choose what to do."
          chips={chips}
          compact
        />

        <ScopeBuilder
          topics={topics}
          value={scope}
          onChange={setScope}
          title="Study scope"
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 360px)",
            gap: 20,
            alignItems: "start",
          }}
        >
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <PrimaryCard
                  icon={<IconLayers />}
                  title="Quick Practice"
                  desc="A short, focused set of questions tuned to your scope."
                  preview={previewLine("practice-set")}
                  cta="Start quick practice"
                  to={quickPracticePath}
                  disabledHint="Pick a scope above first"
                  onActivate={(to) => navigate(to)}
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
                  desc="Highly probable questions for your scope."
                  preview={previewLine("predicted")}
                  cta="See predicted questions"
                  to={buildPredictedPath()}
                  onActivate={(to) => navigate(to)}
                />
                <PrimaryCard
                  icon={<IconGraduation />}
                  title="Full Mock"
                  desc={`Full ${scope.subject} mock · 80 marks.`}
                  preview={previewLine("full-mock")}
                  cta={`Generate ${scope.subject} full mock`}
                  to={fullMockPath}
                  lockChip={!isSignedIn ? "Sign in" : undefined}
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
                          ? "Adds a weak-area mini-section to your mock"
                          : "Available after you save a graded answer in Check & Improve"
                      }
                    >
                      <input
                        type="checkbox"
                        checked={mockWeakArea && !!buckets.topRow}
                        onChange={(e) => setMockWeakArea(e.target.checked)}
                        disabled={!buckets.topRow}
                        style={{ accentColor: PRIMARY_GREEN }}
                      />
                      Add weak-area mini-section
                    </label>
                  }
                />
              </div>
            </section>

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
                  Timed · Chapter Test · Practice Paper
                </span>
              </summary>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                  paddingTop: 12,
                  paddingBottom: 6,
                }}
              >
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
                  cta="Start chapter test"
                  to={chapterTestPath}
                  disabledHint="Pick a single topic above to enable"
                  onActivate={(to) => navigate(to)}
                  ctaTone="secondary"
                />
                <PrimaryCard
                  icon={<IconFileText />}
                  title="Practice Paper"
                  desc="Build a custom paper in the Mock Builder."
                  preview={previewLine("practice-paper")}
                  cta="Open Mock Builder"
                  to={practicePaperPath}
                  lockChip={!isSignedIn ? "Sign in" : "Premium"}
                  onActivate={(to) => navigate(to)}
                  ctaTone="secondary"
                />
              </div>
            </details>

            {/* PaperBlueprint — board-paper preview */}
            {blueprintContent ? (
              <PaperBlueprint
                title={
                  scope.scope === "full-subject"
                    ? `Paper blueprint · ${scope.subject} (preview from ${blueprintContent.topic.name})`
                    : `Paper blueprint · ${blueprintContent.topic.name}`
                }
                sections={blueprintContent.blueprint}
                totalMarks={blueprintContent.totalMarks}
              />
            ) : null}

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

              {/* Topic HPQs tab */}
              {tab === "topic" ? (
                selectedTopic && blueprintContent ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 13, color: TEXT_FG }}>
                      <strong>{selectedTopic.name}</strong> —{" "}
                      <span style={{ color: TEXT_MUTED }}>{selectedTopic.marks}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: PILL_FG, lineHeight: 1.5 }}>
                      {selectedTopic.blurb}
                    </p>
                    <ul
                      style={{
                        margin: 0,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: PILL_BG,
                        listStyle: "disc",
                        paddingLeft: 28,
                        fontSize: 12.5,
                        color: TEXT_FG,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      {blueprintContent.highlights.map((h) => (
                        <li key={h.id}>
                          <strong style={{ fontWeight: 600 }}>{h.label}.</strong>{" "}
                          <span style={{ color: TEXT_MUTED }}>{h.rationale}</span>
                        </li>
                      ))}
                    </ul>
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
                      <IconSparkles size={14} /> View predicted Qs for {selectedTopic.name}
                    </Link>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED }}>
                    Pick a single topic in the scope builder to see its
                    Highly Probable Questions.
                  </p>
                )
              ) : null}

              {/* Selected topics tab */}
              {tab === "selected" ? (
                scope.selectedTopicSlugs.length >= 2 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {scope.selectedTopicSlugs.map((slug) => {
                      const t = desktopTopicBySlug(slug);
                      const c = desktopTopicHubContentBySlug(slug);
                      if (!t) return null;
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
                          </div>
                          <p
                            style={{
                              margin: "4px 0 0 0",
                              fontSize: 12,
                              color: TEXT_MUTED,
                              lineHeight: 1.5,
                            }}
                          >
                            {t.blurb}
                          </p>
                          {c && c.highlights.length > 0 ? (
                            <ul
                              style={{
                                margin: "6px 0 0 0",
                                paddingLeft: 18,
                                fontSize: 12,
                                color: TEXT_FG,
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                              }}
                            >
                              {c.highlights.slice(0, 2).map((h) => (
                                <li key={h.id}>
                                  <strong style={{ fontWeight: 600 }}>{h.label}.</strong>{" "}
                                  <span style={{ color: TEXT_MUTED }}>{h.rationale}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
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
                      <IconSparkles size={14} /> View predicted Qs for selected topics
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

            {/* Sample preview — curated highlights from the chosen topic */}
            {samplePreview ? (
              <section
                style={{
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 16,
                  padding: 20,
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
                  <h3
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: "1.05rem",
                      fontWeight: 600,
                      color: TEXT_FG,
                      margin: 0,
                    }}
                  >
                    Sample preview
                  </h3>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px 10px",
                      borderRadius: 999,
                      background: INFO_SOFT,
                      color: INFO_FG,
                      border: `1px solid hsla(215, 65%, 32%, 0.18)`,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {samplePreview.topicName} · {samplePreview.marks}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED, lineHeight: 1.5 }}>
                  {samplePreview.blurb}
                </p>
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
                  {samplePreview.resources.map((r) => (
                    <li
                      key={r.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        padding: "8px 12px",
                        background: PILL_BG,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 10,
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: CARD_BG,
                          border: `1px solid ${BORDER}`,
                          fontSize: 11,
                          color: TEXT_MUTED,
                          fontWeight: 600,
                        }}
                      >
                        {r.kind === "concept-note"
                          ? "Concept"
                          : r.kind === "quick-refresher"
                            ? "Refresher"
                            : r.kind === "drill"
                              ? "Drill"
                              : r.kind === "previous-year"
                                ? "PYQ"
                                : "Video"}{" "}
                        · {r.estimatedMinutes}m
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_FG, lineHeight: 1.3 }}>
                          {r.label}
                        </div>
                        <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2, lineHeight: 1.45 }}>
                          {r.blurb}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                  Curated highlights from this topic — open the Highly Probable
                  page or the Topic Hub to see full content.
                </span>
              </section>
            ) : null}
          </div>

          {/* ───────────────────── ASIDE COLUMN ───────────────────── */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 20 }}>
            <MistakeIntelligencePanel
              isSignedIn={isSignedIn}
              loading={mistakesLoading && isSignedIn}
              buckets={buckets}
              weakTopic={weakTopic}
              drillTopicSlug={weakTopicSlug}
              grade={grade}
              subject={scope.subject}
              worksheetMistakeAwarePath={mistakeAwareWorksheetPath}
              mockPath={
                isSignedIn
                  ? buildExamSimulationPath(true)
                  : loginUrl("start-full-mock", buildExamSimulationPath(true))
              }
              checkPath={checkLinkPath}
              drillPath={drillFromMistakePath}
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

            {/* Honest disclaimer about the curated topic catalog */}
            <p
              style={{
                margin: 0,
                padding: "10px 14px",
                border: `1px dashed ${BORDER}`,
                background: PILL_BG,
                borderRadius: 10,
                fontSize: "0.78rem",
                lineHeight: 1.5,
                color: TEXT_MUTED,
              }}
            >
              Showing a starter set of high-yield topics from the desktop
              bridge — not the full chapter list. Use the existing chapter
              pages for anything outside this short list.
            </p>
          </aside>
        </div>

        {/* Inline keyframes — single shared rule, no global Tailwind */}
        <style>{`
          .lt-practice-fade-in { animation: lt-practice-fade 220ms ease-out; }
          @keyframes lt-practice-fade {
            from { opacity: 0; transform: translateY(2px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}

// Reference: keep DANGER_FG token live for future error states without
// triggering an unused-symbol lint until then.
void DANGER_FG;
