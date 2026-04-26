import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getMistakeLogs,
  type MistakeLogEntry,
} from "../../services/mistakeLogService";

/**
 * DesktopHome — PR-B Home Graduation: topic-focus-lite workspace Home.
 *
 * Honest copy contract:
 *   - No fake personalised greeting (we use the real Clerk display name only
 *     when present; otherwise a generic "Welcome back").
 *   - No fabricated saved-progress / streak / countdown text.
 *   - "Pick up where you left off" reads ONE real value from localStorage
 *     ("lazytopper.lastSubjectContext"); when nothing is set we render a
 *     truthful empty state instead of pretending the student has resumed
 *     anything.
 *   - Mistake Intelligence reads real entries via getMistakeLogs(uid, 7)
 *     and aggregates the four canonical buckets (conceptual / calculation
 *     / silly / presentation) locally inside this component. When the user
 *     has no entries (or no uid yet) we render the honest placeholder copy
 *     described in the PR-B brief — never invented counts.
 *
 * Design constraints:
 *   - Inline styles only — no Tailwind / shadcn / Radix.
 *   - Inline SVG only — no lucide-react / no icon libraries.
 *   - No new dependencies of any kind.
 *   - Self-contained against the PR-A-merged base; only imports symbols
 *     that exist at the truthful base SHA.
 */

// ── LOCKED BASELINE LIGHT TOKENS ────────────────────────────────
const SECTION_BG = "hsl(210, 33%, 98%)";   // --background
const CARD_BG = "hsl(0, 0%, 100%)";        // --card
const CARD_BORDER = "hsl(215, 25%, 90%)";  // --border
const TEXT = "hsl(220, 45%, 14%)";         // --foreground
const TEXT_MUTED = "hsl(220, 15%, 45%)";   // --muted-foreground
const ACCENT = "hsl(152, 55%, 45%)";       // --accent (teal-green)
const SHADOW_SM = "0 1px 2px hsla(222, 40%, 20%, 0.04)";
const SHADOW_MD = "0 12px 28px -12px hsla(222, 40%, 20%, 0.18)";

const FONT_DISPLAY = "'Fraunces', Georgia, serif";

// Source attribution param appended to every cross-surface CTA so the
// destination can render a correct back-button + log traffic source.
const HOME_QS = "?source=home&returnTo=%2F";

// ── ICONS (inline SVG, no lucide) ───────────────────────────────
function DumbbellIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.4 14.4 9.6 9.6" />
      <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
      <path d="m21.5 21.5-1.4-1.4" />
      <path d="M3.9 3.9 2.5 2.5" />
      <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
    </svg>
  );
}
function FileTextIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="14" y2="17" />
    </svg>
  );
}
function TrendingUpIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function ScanLineIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  );
}
function ArrowRightIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
function SparklesIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}
function BookmarkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

// ── HONEST LOCAL CONTEXT ────────────────────────────────────────
interface LastFocus {
  grade: string;
  subject: string;
}

/**
 * Read the student's most recent grade/subject pair *only if it was
 * actually written by the app at some point*. Returns null otherwise so
 * we render a truthful empty state instead of pretending the student has
 * resumed something they never started.
 */
function readLastFocusOrNull(): LastFocus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("lazytopper.lastSubjectContext");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.grade === "string" &&
      typeof parsed.subject === "string" &&
      parsed.grade.trim() &&
      parsed.subject.trim()
    ) {
      return { grade: parsed.grade.trim(), subject: parsed.subject.trim() };
    }
  } catch {
    /* localStorage inaccessible or malformed — treat as no focus yet */
  }
  return null;
}

// ── MISTAKE BUCKET AGGREGATION (local — Option A) ───────────────
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

/**
 * Aggregate the four canonical buckets from MistakeLogEntry.mistakeCounts
 * across all entries returned by getMistakeLogs. Returns the breakdown
 * sorted by count (desc) and total. Pure function, no I/O.
 */
function aggregateBuckets(entries: MistakeLogEntry[]): {
  total: number;
  rows: BucketRow[];
  topLabel: string | null;
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
  const topLabel = total > 0 && rows[0].count > 0 ? rows[0].label : null;
  return { total, rows, topLabel };
}

// ── INTENT CARDS ────────────────────────────────────────────────
type IntentIcon = (props: { size?: number }) => React.ReactElement;
interface Intent {
  to: string;
  icon: IntentIcon;
  label: string;
  sub: string;
}

const INTENTS: Intent[] = [
  {
    to: `/practice-hub${HOME_QS}`,
    icon: DumbbellIcon,
    label: "Practice",
    sub: "Sets, mocks & timed drills",
  },
  {
    to: `/practice/worksheets${HOME_QS}`,
    icon: FileTextIcon,
    label: "Worksheet",
    sub: "Printable, marks-aware",
  },
  {
    to: `/exam-trends${HOME_QS}`,
    icon: TrendingUpIcon,
    label: "Exam Trends",
    sub: "What's likely to come",
  },
  {
    to: `/check-improve${HOME_QS}`,
    icon: ScanLineIcon,
    label: "Check & Improve",
    sub: "Grade my answer",
  },
];

export default function DesktopHome() {
  const { user } = useAuth();
  const [lastFocus, setLastFocus] = useState<LastFocus | null>(null);
  const [mistakes, setMistakes] = useState<MistakeLogEntry[]>([]);

  // Honest local context: read once on mount. We deliberately do NOT
  // refetch on every render — the Home surface should reflect the
  // student's state at arrival, not flicker as background work writes.
  useEffect(() => {
    setLastFocus(readLastFocusOrNull());
  }, []);

  // Honest mistake intelligence: pull real entries (last 7 days) for the
  // signed-in uid only. We never invent counts and never categorise an
  // anonymous session.
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

  // Honest welcome — use the signed-in display name if present, else a
  // generic greeting. Never invent a name.
  const displayName = user?.displayName?.trim() || null;
  const welcomeTitle = displayName
    ? `Welcome back, ${displayName}.`
    : "Welcome back.";

  return (
    <div
      style={{
        background: SECTION_BG,
        color: TEXT,
        padding: "40px 32px 48px",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* ── PAGE HEADER (honest copy — no fake countdown / streak) ── */}
        <header style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: ACCENT,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 10,
            }}
          >
            Welcome back
          </div>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 34,
              fontWeight: 600,
              lineHeight: 1.15,
              color: TEXT,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {welcomeTitle}
          </h1>
          <p
            style={{
              color: TEXT_MUTED,
              marginTop: 12,
              maxWidth: 640,
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            Pick a path below, or jump back into your last focus area.
          </p>
        </header>

        {/* ── INTENT ROW (4 quick actions: workspace baseline) ───── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {INTENTS.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.label}
                to={c.to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 18,
                  borderRadius: 14,
                  background: CARD_BG,
                  border: `1px solid ${CARD_BORDER}`,
                  boxShadow: SHADOW_SM,
                  textDecoration: "none",
                  color: TEXT,
                  transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = SHADOW_MD;
                  e.currentTarget.style.borderColor = "hsla(152, 55%, 45%, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = SHADOW_SM;
                  e.currentTarget.style.borderColor = CARD_BORDER;
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: "hsl(215, 28%, 95%)",
                    display: "grid",
                    placeItems: "center",
                    color: ACCENT,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  <Icon size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1.25,
                      color: TEXT,
                    }}
                  >
                    {c.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: TEXT_MUTED,
                      marginTop: 2,
                    }}
                  >
                    {c.sub}
                  </div>
                </div>
                <span
                  style={{
                    color: TEXT_MUTED,
                    display: "inline-flex",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  <ArrowRightIcon size={16} />
                </span>
              </Link>
            );
          })}
        </div>

        {/* ── WORKSPACE GRID (continue + mistake intel) ─────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 24,
          }}
        >
          {/* ── PICK UP WHERE YOU LEFT OFF (honest) ───────────── */}
          <section
            style={{
              padding: 28,
              borderRadius: 16,
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              boxShadow: SHADOW_SM,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <h2
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 20,
                  fontWeight: 600,
                  margin: 0,
                  color: TEXT,
                }}
              >
                Pick up where you left off
              </h2>
              <Link
                to={`/me${HOME_QS}`}
                style={{
                  fontSize: 12,
                  color: TEXT_MUTED,
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                View activity →
              </Link>
            </div>

            {lastFocus ? (
              <Link
                to={`/topic-hub/${encodeURIComponent(lastFocus.grade)}/${encodeURIComponent(lastFocus.subject)}${HOME_QS}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: 16,
                  borderRadius: 12,
                  background: "hsl(215, 28%, 97%)",
                  border: `1px solid ${CARD_BORDER}`,
                  textDecoration: "none",
                  color: TEXT,
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "hsl(215, 28%, 95%)";
                  e.currentTarget.style.borderColor = "hsla(152, 55%, 45%, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "hsl(215, 28%, 97%)";
                  e.currentTarget.style.borderColor = CARD_BORDER;
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: CARD_BG,
                    border: `1px solid ${CARD_BORDER}`,
                    display: "grid",
                    placeItems: "center",
                    color: ACCENT,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  <BookmarkIcon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
                    Continue with {lastFocus.subject} · Class {lastFocus.grade}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                    Open your Topic Hub for this subject.
                  </div>
                </div>
                <span
                  style={{
                    color: ACCENT,
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  Resume →
                </span>
              </Link>
            ) : (
              <div
                style={{
                  padding: 24,
                  borderRadius: 12,
                  background: "hsl(215, 28%, 97%)",
                  border: `1px dashed ${CARD_BORDER}`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 14, color: TEXT, fontWeight: 500 }}>
                  Nothing in progress yet.
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: TEXT_MUTED,
                    marginTop: 6,
                    lineHeight: 1.5,
                  }}
                >
                  Pick a path above to start tracking your work — your last
                  subject and topic will appear here automatically.
                </div>
              </div>
            )}
          </section>

          {/* ── MISTAKE INTELLIGENCE (honest — real or empty) ─── */}
          <aside
            style={{
              padding: 24,
              borderRadius: 16,
              background:
                "linear-gradient(135deg, hsl(222, 55%, 13%), hsl(222, 50%, 18%))",
              color: "#fff",
              boxShadow: SHADOW_MD,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#22c55e",
              }}
            >
              <SparklesIcon size={14} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                Mistake Intelligence
              </span>
            </div>

            {buckets.total > 0 && buckets.topLabel ? (
              <>
                <h3
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 19,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    margin: "12px 0 0",
                    color: "#fff",
                  }}
                >
                  Most-common slip this week:{" "}
                  <span style={{ color: "#86efac" }}>{buckets.topLabel}</span>
                </h3>

                <ul
                  style={{
                    listStyle: "none",
                    margin: "16px 0 0",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {buckets.rows
                    .filter((r) => r.count > 0)
                    .map((r) => {
                      const pct = Math.round((r.count / buckets.total) * 100);
                      return (
                        <li
                          key={r.key}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 12,
                              color: "rgba(255,255,255,0.85)",
                            }}
                          >
                            <span>{r.label}</span>
                            <span style={{ fontVariantNumeric: "tabular-nums" }}>
                              {r.count} · {pct}%
                            </span>
                          </div>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.12)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                background: "#22c55e",
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                </ul>

                <Link
                  to={`/check-improve${HOME_QS}`}
                  style={{
                    marginTop: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#22c55e",
                    color: "hsl(222, 55%, 13%)",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    alignSelf: "flex-start",
                  }}
                >
                  Practice this pattern
                  <ArrowRightIcon size={14} />
                </Link>
              </>
            ) : (
              <>
                <h3
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 19,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    margin: "12px 0 0",
                    color: "#fff",
                  }}
                >
                  Check an answer to unlock mistake intelligence.
                </h3>
                <p
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  Your mistake patterns will appear here after checked answers.
                </p>
                <Link
                  to={`/check-improve${HOME_QS}`}
                  style={{
                    marginTop: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#22c55e",
                    color: "hsl(222, 55%, 13%)",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    alignSelf: "flex-start",
                  }}
                >
                  Check an answer
                  <ArrowRightIcon size={14} />
                </Link>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
