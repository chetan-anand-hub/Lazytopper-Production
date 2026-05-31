import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import {
  getMistakeLogs,
  type MistakeLogEntry,
} from "../../services/mistakeLogService";
import {
  hasMeaningfulMemory,
  readLandingMemory,
  resolveResumeRoute,
  type LandingMemory,
} from "../../lib/desktop/landingMemory";
import { loginUrl, PRIMARY_CARDS } from "../../lib/desktop/homeDestinations";

/**
 * DesktopHome — PR-B2: locked prototype parity with topic-focus-lite/src/pages/HomePage.tsx.
 *
 * Section mapping (prototype → production):
 *   - prototype ContextBar       → inline ContextBar-style header
 *   - prototype memory strip     → memory strip backed by landingMemory.ts
 *   - prototype lastAttempt card → "Latest saved worksheet" card backed by
 *     readLandingMemory().lastAttempt (saved worksheet PLAN, not a graded score)
 *   - prototype 4 primary cards  → /practice-hub, /practice/worksheets,
 *     /exam-trends, /check-improve
 *   - prototype quick-generate   → /mock-builder/{grade}/Maths, /mock-builder/
 *     {grade}/Science, /exam-trends (predicted), /practice/worksheets
 *     (multi-topic)
 *   - prototype MistakeIntelligencePanel → inline panel with three real
 *     states (logged-out / no real bucket / has real bucket) backed by
 *     getMistakeLogs(uid, 7) aggregation. Does NOT import the PR #17-only
 *     symbols (aggregateErrorCategories, readLocalMistakeLogsSince,
 *     ErrorCategory).
 *
 * Honest copy contract:
 *   - No fake personalised greeting beyond a real Clerk display name.
 *   - Memory strip only renders when hasMeaningfulMemory() is true.
 *   - "Latest saved worksheet" never says "score" / "attempt" — saved
 *     worksheets capture the plan, not a graded result.
 *   - Mistake intelligence reads real entries via getMistakeLogs(uid, 7);
 *     anonymous sessions / no entries → empty-state copy, never invented
 *     counts.
 *   - Auth-required CTAs route through reason-aware /login URLs that
 *     match the PR-LANDING canonical reason set (start-trial,
 *     mistake-aware, mistake-aware-worksheet, open-progress, open-check,
 *     start-full-mock).
 *
 * Design constraints:
 *   - Inline styles only — no Tailwind / shadcn / Radix.
 *   - Inline SVG only — no lucide-react.
 *   - No new dependencies.
 */

// ── LOCKED BASELINE LIGHT TOKENS ────────────────────────────────
const SECTION_BG = "hsl(210, 33%, 98%)";   // --background
const CARD_BG = "hsl(0, 0%, 100%)";        // --card
const CARD_BORDER = "hsl(215, 25%, 90%)";  // --border
const TEXT = "hsl(220, 45%, 14%)";         // --foreground
const TEXT_MUTED = "hsl(220, 15%, 45%)";   // --muted-foreground
const ACCENT = "hsl(152, 55%, 45%)";       // --accent (teal-green)
const ACCENT_SOFT = "hsla(152, 55%, 45%, 0.10)";
const PRIMARY = "hsl(222, 47%, 24%)";      // --primary (deep navy)
const SHADOW_SM = "0 1px 2px hsla(222, 40%, 20%, 0.04)";
const SHADOW_MD = "0 12px 28px -12px hsla(222, 40%, 20%, 0.18)";

const FONT_DISPLAY = "'Fraunces', Georgia, serif";

// Source attribution param appended to every same-app navigation so the
// destination can render a correct back-button + log traffic source.
const HOME_QS = "source=home&returnTo=%2F";
const HOME_QS_LEAD = `?${HOME_QS}`;

// ── ICONS (inline SVG, no lucide) ───────────────────────────────
type IconProps = { size?: number };

function ClipboardListIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </svg>
  );
}
function ArrowRightIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
function SparklesIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}
function LockIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function TargetIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function RotateCcwIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <polyline points="3 3 3 8 8 8" />
    </svg>
  );
}

// ── MISTAKE BUCKET AGGREGATION (local — no PR #17 symbols) ──────
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

// ── DATE FORMAT (saved-on label) ────────────────────────────────
function formatSavedOn(iso: string): string | null {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

// ── SHARED STYLES ───────────────────────────────────────────────
const cardBaseStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 14,
  boxShadow: SHADOW_SM,
};

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 999,
  background: "hsl(215, 28%, 95%)",
  border: `1px solid ${CARD_BORDER}`,
  color: TEXT_MUTED,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.02em",
};

const chipAccentStyle: React.CSSProperties = {
  ...chipStyle,
  background: ACCENT_SOFT,
  borderColor: "hsla(152, 55%, 45%, 0.30)",
  color: "hsl(152, 60%, 30%)",
};

// PRIMARY_CARDS + QuickCard + loginUrl now live in
// ../../lib/desktop/homeDestinations (single source of truth shared with the
// mobile Home variant). Render output is unchanged.

// ── COMPONENT ──────────────────────────────────────────────────
export default function DesktopHome() {
  const { user } = useAuth();
  const { isTrialActive, isPremium, isTrialExpired } = useSubscription();
  const isSignedIn = !!user;

  const [memory, setMemory] = useState<LandingMemory | null>(null);
  const [mistakes, setMistakes] = useState<MistakeLogEntry[]>([]);

  // Read landing memory once on mount — reflects state at arrival.
  useEffect(() => {
    setMemory(readLandingMemory());
  }, []);

  // Honest mistake intelligence: real entries (last 7 days) for the
  // signed-in uid only. Anonymous sessions never get categorised.
  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setMistakes([]);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      try {
        const entries = await getMistakeLogs(user.uid, 7);
        if (!cancelled) setMistakes(Array.isArray(entries) ? entries : []);
      } catch {
        if (!cancelled) setMistakes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const buckets = useMemo(() => aggregateBuckets(mistakes), [mistakes]);

  const meaningfulMemory = hasMeaningfulMemory(memory);
  const lastAttempt = memory?.lastAttempt ?? null;
  const memoryGrade = memory?.grade ?? null;
  const memorySubject = memory?.subject ?? null;
  const resumeRoute = resolveResumeRoute(memory);
  const resumeCtaLabel = lastAttempt
    ? "Continue worksheet plan"
    : memoryGrade && memorySubject
      ? "Resume with Exam Trends"
      : null;

  // Default subject for quick-generate predicted/multi-topic when no
  // memory exists. We never invent a subject in the visible label, but
  // we do need a target subject for the mock-builder URL — Maths is the
  // production catalogue default and is the safest neutral value.
  const fallbackSubject: "Maths" | "Science" =
    memorySubject === "Science" || lastAttempt?.subject === "Science"
      ? "Science"
      : "Maths";
  const fallbackGrade = memoryGrade && memoryGrade.trim() ? memoryGrade : "10";

  // Right-side header chip — truthful auth/trial state.
  const rightChip: React.ReactNode = !isSignedIn ? (
    <Link
      to={loginUrl("start-trial", "/onboarding")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: 10,
        background: PRIMARY,
        color: "#fff",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      Start free trial <ArrowRightIcon size={14} />
    </Link>
  ) : isTrialActive ? (
    <span style={chipAccentStyle}>Trial active</span>
  ) : isPremium ? (
    <span style={chipAccentStyle}>Premium</span>
  ) : isTrialExpired ? (
    <span style={chipStyle}>Trial expired</span>
  ) : (
    <span style={chipStyle}>Signed in</span>
  );

  return (
    <div
      style={{
        background: SECTION_BG,
        color: TEXT,
        padding: "32px 32px 48px",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* ── ContextBar-style header ──────────────────────────── */}
        <header>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span style={chipStyle}>Class {fallbackGrade}</span>
            {memorySubject && (
              <span style={chipStyle}>{memorySubject}</span>
            )}
            <span style={chipStyle}>
              Scope: {memorySubject ? `${memorySubject} workspace` : "Pick a path"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 28,
                  fontWeight: 600,
                  lineHeight: 1.15,
                  color: TEXT,
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Home
              </h1>
              <p
                style={{
                  color: TEXT_MUTED,
                  margin: "6px 0 0",
                  maxWidth: 640,
                  fontSize: 14,
                  lineHeight: 1.55,
                }}
              >
                Pick what to do now. LazyTopper softly suggests — never forces.
              </p>
            </div>
            {rightChip}
          </div>
        </header>

        {/* ── Memory strip (honest — only when meaningful) ─────── */}
        {isSignedIn && meaningfulMemory && memory && (
          <section
            style={{
              ...cardBaseStyle,
              padding: 16,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              borderColor: "hsla(152, 55%, 45%, 0.30)",
              background: "hsla(152, 55%, 45%, 0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: TEXT,
                fontSize: 14,
              }}
            >
              <span style={{ color: ACCENT, display: "inline-flex" }}>
                <RotateCcwIcon size={16} />
              </span>
              <div>
                <span style={{ fontWeight: 600 }}>Last time:</span>{" "}
                <span style={{ color: "hsl(220, 30%, 28%)" }}>
                  {memorySubject ?? "Workspace"}
                  {memoryGrade ? ` · Class ${memoryGrade}` : ""}
                  {lastAttempt ? ` • saved worksheet · ${lastAttempt.topicLabel}` : ""}
                </span>
              </div>
            </div>
            {resumeRoute && resumeRoute !== "/" && (
              <Link
                to={`${resumeRoute}${resumeRoute.includes("?") ? "&" : "?"}${HOME_QS}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: CARD_BG,
                  border: `1px solid ${CARD_BORDER}`,
                  color: TEXT,
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {resumeCtaLabel} <ArrowRightIcon size={14} />
              </Link>
            )}
          </section>
        )}

        {/* ── Latest saved worksheet (honest — plan, not score) ── */}
        {isSignedIn && lastAttempt && (
          <section
            style={{
              ...cardBaseStyle,
              padding: 24,
              display: "grid",
              gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)",
              gap: 24,
              alignItems: "center",
              boxShadow: SHADOW_MD,
              background:
                "linear-gradient(140deg, hsl(0,0%,100%), hsl(215, 28%, 97%))",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: TEXT_MUTED,
                }}
              >
                Latest saved worksheet
              </div>
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 22,
                  fontWeight: 600,
                  marginTop: 6,
                  lineHeight: 1.2,
                  color: TEXT,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {lastAttempt.topicLabel}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: TEXT_MUTED,
                  marginTop: 4,
                }}
              >
                {lastAttempt.subject}
                {formatSavedOn(lastAttempt.savedAt)
                  ? ` · saved ${formatSavedOn(lastAttempt.savedAt)}`
                  : ""}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: TEXT_MUTED,
                  marginTop: 6,
                  fontStyle: "italic",
                }}
              >
                Saved on this device — captures the plan, not a graded score.
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              {buckets.topRow ? (
                <>
                  <div style={{ fontSize: 13, color: TEXT }}>
                    <span style={{ fontWeight: 600 }}>Most-common slip this week:</span>{" "}
                    <span style={{ color: "hsl(220, 30%, 28%)" }}>{buckets.topRow.label}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <Link
                      to={`/practice/${encodeURIComponent(fallbackGrade)}/${encodeURIComponent(lastAttempt.subject)}?focus=mistakes&${HOME_QS}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: PRIMARY,
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <TargetIcon size={13} /> Targeted drill
                    </Link>
                    <Link
                      to={`/practice/worksheets?mistakeAware=1&subject=${encodeURIComponent(lastAttempt.subject)}&${HOME_QS}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: CARD_BG,
                        border: `1px solid ${CARD_BORDER}`,
                        color: TEXT,
                        textDecoration: "none",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <ClipboardListIcon size={13} /> Mistake-aware worksheet
                    </Link>
                    <Link
                      to={`/mock-builder/${encodeURIComponent(fallbackGrade)}/${encodeURIComponent(lastAttempt.subject)}?focus=mistakes&${HOME_QS}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "transparent",
                        color: TEXT,
                        textDecoration: "none",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Add weak-area to next mock
                    </Link>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: TEXT_MUTED,
                      marginTop: 8,
                    }}
                  >
                    Recommended, not required.
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: TEXT_MUTED }}>
                  Grade an answer in{" "}
                  <Link
                    to={`/check-improve${HOME_QS_LEAD}`}
                    style={{ color: ACCENT, textDecoration: "underline" }}
                  >
                    Check &amp; Improve
                  </Link>{" "}
                  to unlock mistake-aware suggestions.
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── 4 primary action cards ───────────────────────────── */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {PRIMARY_CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.label}
                to={c.to}
                style={{
                  ...cardBaseStyle,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: 20,
                  textDecoration: "none",
                  color: TEXT,
                  transition:
                    "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = SHADOW_MD;
                  e.currentTarget.style.borderColor =
                    "hsla(152, 55%, 45%, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = SHADOW_SM;
                  e.currentTarget.style.borderColor = CARD_BORDER;
                }}
              >
                <div style={{ color: ACCENT, display: "inline-flex" }}>
                  <Icon size={20} />
                </div>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 17,
                    fontWeight: 600,
                    color: TEXT,
                  }}
                >
                  {c.label}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: TEXT_MUTED,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {c.sub}
                </p>
              </Link>
            );
          })}
        </section>

        {/* ── Quick generate (2/3) + Mistake intelligence (1/3) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
            gap: 24,
          }}
        >
          {/* Quick generate ----------------------------------- */}
          <section
            style={{
              ...cardBaseStyle,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 17,
                  fontWeight: 600,
                  margin: 0,
                  color: TEXT,
                }}
              >
                Quick generate
              </h3>
              <Link
                to={`/practice-hub${HOME_QS_LEAD}`}
                style={{
                  fontSize: 12,
                  color: ACCENT,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                All practice modes →
              </Link>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {[
                {
                  to: isSignedIn
                    ? `/mock-builder/${encodeURIComponent(fallbackGrade)}/Maths?mode=full-mock&${HOME_QS}`
                    : loginUrl(
                        "start-full-mock",
                        `/mock-builder/${fallbackGrade}/Maths`,
                      ),
                  kicker: "Full mock",
                  title: "Maths · 80 marks",
                  detail: "Sections A–E · 3 hours",
                },
                {
                  to: isSignedIn
                    ? `/mock-builder/${encodeURIComponent(fallbackGrade)}/Science?mode=full-mock&${HOME_QS}`
                    : loginUrl(
                        "start-full-mock",
                        `/mock-builder/${fallbackGrade}/Science`,
                      ),
                  kicker: "Full mock",
                  title: "Science · 80 marks",
                  detail: "Phy + Chem + Bio · 3 hours",
                },
                {
                  to: `/exam-trends?subject=${encodeURIComponent(fallbackSubject)}&${HOME_QS}`,
                  kicker: "Predicted paper",
                  title: `${fallbackSubject} · what's likely`,
                  detail: "Tier-ranked topics → predicted breakdown",
                },
                {
                  to: `/practice/worksheets?scope=multi-topic&subject=${encodeURIComponent(fallbackSubject)}&${HOME_QS}`,
                  kicker: "Worksheet",
                  title: "Multi-topic worksheet",
                  detail: "Pick topics in scope builder",
                },
              ].map((tile) => (
                <Link
                  key={tile.title}
                  to={tile.to}
                  style={{
                    display: "block",
                    padding: 16,
                    borderRadius: 12,
                    background: "hsl(215, 28%, 96%)",
                    border: `1px solid ${CARD_BORDER}`,
                    color: TEXT,
                    textDecoration: "none",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "hsl(215, 28%, 93%)";
                    e.currentTarget.style.borderColor =
                      "hsla(152, 55%, 45%, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "hsl(215, 28%, 96%)";
                    e.currentTarget.style.borderColor = CARD_BORDER;
                  }}
                >
                  <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                    {tile.kicker}
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      marginTop: 2,
                      color: TEXT,
                    }}
                  >
                    {tile.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: TEXT_MUTED,
                      marginTop: 4,
                    }}
                  >
                    {tile.detail}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Mistake intelligence panel ------------------------ */}
          <MistakeIntelligencePanel
            isSignedIn={isSignedIn}
            buckets={buckets}
            fallbackSubject={fallbackSubject}
            fallbackGrade={fallbackGrade}
          />
        </div>
      </div>
    </div>
  );
}

// ── INLINE MISTAKE PANEL ───────────────────────────────────────
interface MistakePanelProps {
  isSignedIn: boolean;
  buckets: ReturnType<typeof aggregateBuckets>;
  fallbackSubject: "Maths" | "Science";
  fallbackGrade: string;
}

function MistakeIntelligencePanel({
  isSignedIn,
  buckets,
  fallbackSubject,
  fallbackGrade,
}: MistakePanelProps) {
  // Logged-out state — reason-aware login CTA, never shows fake data.
  if (!isSignedIn) {
    return (
      <aside
        style={{
          ...cardBaseStyle,
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
            gap: 8,
            color: TEXT_MUTED,
          }}
        >
          <LockIcon size={16} />
          <h3
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 15,
              fontWeight: 600,
              margin: 0,
              color: TEXT,
            }}
          >
            Mistake-aware practice
          </h3>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.55,
            color: TEXT_MUTED,
          }}
        >
          Mistake-aware practice needs saved attempts. Start a free trial to
          unlock targeted drills, mistake-aware worksheets, and weak-area
          mini-sections inside your mocks.
        </p>
        <Link
          to={loginUrl("mistake-aware", "/practice-hub")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            padding: "8px 12px",
            borderRadius: 8,
            background: PRIMARY,
            color: "#fff",
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <SparklesIcon size={13} /> Start free trial
        </Link>
        <div style={{ fontSize: 11, color: TEXT_MUTED }}>
          Recommended, not required.
        </div>
      </aside>
    );
  }

  // Signed-in but no real mistake bucket yet — honest empty state.
  if (!buckets.topRow) {
    return (
      <aside
        style={{
          ...cardBaseStyle,
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
            gap: 8,
            color: ACCENT,
          }}
        >
          <SparklesIcon size={14} />
          <h3
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 15,
              fontWeight: 600,
              margin: 0,
              color: TEXT,
            }}
          >
            Your mistake insights
          </h3>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.55,
            color: TEXT_MUTED,
          }}
        >
          Grade an answer in{" "}
          <Link
            to={`/check-improve${HOME_QS_LEAD}`}
            style={{ color: ACCENT, textDecoration: "underline" }}
          >
            Check &amp; Improve
          </Link>{" "}
          to unlock mistake-aware practice.
        </p>
        <div style={{ fontSize: 11, color: TEXT_MUTED }}>
          Recommended, not required.
        </div>
      </aside>
    );
  }

  // Signed-in with a real top weak-area bucket — actionable CTAs.
  const top = buckets.topRow;
  return (
    <aside
      style={{
        ...cardBaseStyle,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: ACCENT,
          }}
        >
          <SparklesIcon size={14} />
          <h3
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 15,
              fontWeight: 600,
              margin: 0,
              color: TEXT,
            }}
          >
            Your latest weak area
          </h3>
        </div>
        <span style={chipAccentStyle}>From last 7 days</span>
      </div>
      <div>
        <div style={{ fontSize: 13, color: TEXT }}>
          <span style={{ fontWeight: 600 }}>{top.label}</span>
          <span style={{ color: TEXT_MUTED }}>
            {" "}
            — {top.count} flagged{" "}
            {Math.round((top.count / buckets.total) * 100)}% of recent slips
          </span>
        </div>
        <ul
          style={{
            listStyle: "none",
            margin: "10px 0 0",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {buckets.rows
            .filter((r) => r.count > 0)
            .map((r) => {
              const pct = Math.round((r.count / buckets.total) * 100);
              return (
                <li key={r.key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: TEXT_MUTED,
                      marginBottom: 4,
                    }}
                  >
                    <span>{r.label}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {r.count} · {pct}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 999,
                      background: "hsl(215, 28%, 92%)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: ACCENT,
                      }}
                    />
                  </div>
                </li>
              );
            })}
        </ul>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Link
          to={`/practice/${encodeURIComponent(fallbackGrade)}/${encodeURIComponent(fallbackSubject)}?focus=mistakes&${HOME_QS}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 8,
            background: PRIMARY,
            color: "#fff",
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <TargetIcon size={13} /> Run targeted drill
        </Link>
        <Link
          to={`/practice/worksheets?mistakeAware=1&subject=${encodeURIComponent(fallbackSubject)}&${HOME_QS}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 8,
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            color: TEXT,
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <ClipboardListIcon size={13} /> Mistake-aware worksheet
        </Link>
        <Link
          to={`/check-improve${HOME_QS_LEAD}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 8,
            background: "transparent",
            color: TEXT,
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Open Check &amp; Improve
        </Link>
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED }}>
        Recommended, not required.
      </div>
    </aside>
  );
}
