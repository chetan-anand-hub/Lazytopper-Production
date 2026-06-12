import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  loadInsights,
  type PracticeAttempt,
  type LTSubject,
} from "../../services/practiceInsights";
import {
  getMistakeLogs,
  type MistakeLogEntry,
} from "../../services/mistakeLogService";
import { summarizeCareless } from "../../services/mistakeInsightsService";
import {
  buildDesktopPracticePath,
  buildDesktopWorksheetPath,
  buildDesktopTopicHubPath,
  withQuery,
  type DesktopRouteContext,
  type DesktopSubject,
} from "../../lib/desktop/navigation";
import { desktopTopicBySlug } from "../../lib/desktop/topics";

/**
 * DesktopMePage — Me / Progress page wired to real saved-attempt and
 * mistake-log data, with honest signed-out and no-data states.
 *
 * Locked-prototype contract honoured (PR-H packet §6):
 *   - Signed-out state: explains progress needs saved attempts; CTA uses
 *     login reason `open-progress` and `redirect=/me`.
 *   - No-attempt state: honest empty state; preview cards are clearly
 *     labelled and never imply real numbers.
 *   - Saved-attempt state: every chart and number is derived from real
 *     `practiceInsights` attempts and `mistakeLogService` entries only.
 *
 * Real data sources (read-only — services are not edited in this PR):
 *   - useAuth().user                         — signed-in / local-session user
 *   - loadInsights().attempts                — saved practice attempts
 *   - getMistakeLogs(uid, 30)                — last-30-day mistake logs
 *
 * Honest gaps (no real data path, so omitted instead of faked):
 *   - "Time on practice" — no time field on PracticeAttempt
 *   - "Score (last 5 mocks)" — no mock-score concept on PracticeAttempt
 *   - Trend deltas like "+6", "+4%", "−5%" — no historical baseline
 *
 * Routing rules (PR-H packet §9):
 *   - All outbound CTAs carry source=me & returnTo=/me through the
 *     `lib/desktop/navigation` helpers.
 *   - Login CTA uses known reason `open-progress`, redirect `/me`.
 *   - Topic Hub CTA uses `buildDesktopTopicHubPath` only when a valid
 *     topic slug resolves; otherwise routes honestly to `/exam-trends`.
 *
 * Production constraints:
 *   - Inline styles only.
 *   - Inline SVG glyphs only.
 *   - No new dependencies.
 */

const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";
const MUTED_BG = "hsl(220, 20%, 97%)";
const SECONDARY_BG = "hsl(150, 35%, 94%)";

const ACCENT_FG = "hsl(152, 55%, 35%)";
const WARNING_FG = "hsl(35, 80%, 35%)";
const DANGER_FG = "hsl(0, 70%, 45%)";
const INFO_FG = "hsl(212, 70%, 42%)";

const FONT_DISPLAY =
  '"Source Serif Pro", "Source Serif 4", Georgia, "Times New Roman", serif';
const FONT_SANS =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const ROUTE_CTX: DesktopRouteContext = { source: "me", returnTo: "/me" };

/* ────────────────── inline SVG glyphs ────────────────── */

const glyphProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TargetGlyph = () => (
  <svg {...glyphProps} width={16} height={16}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const CheckCircleGlyph = () => (
  <svg {...glyphProps} width={16} height={16}>
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const TrendingUpGlyph = ({ size = 16 }: { size?: number }) => (
  <svg {...glyphProps} width={size} height={size}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const BookGlyph = () => (
  <svg {...glyphProps} width={16} height={16}>
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>
);

const SparklesGlyph = () => (
  <svg {...glyphProps} width={16} height={16}>
    <path d="M12 3l1.9 4.6L18 9l-4.1 1.4L12 15l-1.9-4.6L6 9l4.1-1.4z" />
    <path d="M19 14l.8 1.9L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" />
  </svg>
);

const AlertCircleGlyph = ({ size = 12 }: { size?: number }) => (
  <svg {...glyphProps} width={size} height={size}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const ArrowRightGlyph = ({ size = 16 }: { size?: number }) => (
  <svg {...glyphProps} width={size} height={size}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const ArrowLeftGlyph = () => (
  <svg {...glyphProps} width={14} height={14}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const LockGlyph = () => (
  <svg {...glyphProps} width={16} height={16}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const InboxGlyph = () => (
  <svg {...glyphProps} width={18} height={18}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
  </svg>
);

/* ────────────────── shared style tokens ────────────────── */

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

const sectionEyebrow: React.CSSProperties = {
  fontFamily: FONT_SANS,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: TEXT_MUTED,
};

const buttonOutline: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: CARD_BG,
  color: TEXT_FG,
  fontFamily: FONT_SANS,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
};

const buttonAccent: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  border: `1px solid ${PRIMARY_GREEN}`,
  background: PRIMARY_GREEN,
  color: "#ffffff",
  fontFamily: FONT_SANS,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
};

const buttonSmallDark: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 8,
  border: `1px solid ${TEXT_FG}`,
  background: TEXT_FG,
  color: "#ffffff",
  fontFamily: FONT_SANS,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  flexShrink: 0,
};

const previewChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "3px 9px",
  borderRadius: 999,
  background: MUTED_BG,
  color: TEXT_MUTED,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  border: `1px solid ${BORDER}`,
  flexShrink: 0,
};

/* ────────────────── derivation helpers (real data only) ────────────────── */

interface MistakeMix {
  conceptual: number;
  calculation: number;
  silly: number;
  presentation: number;
}

interface MistakeBar {
  key: keyof MistakeMix;
  label: string;
  count: number;
  pct: number;
  color: string;
  hint: string;
}

interface SubjectStat {
  subject: LTSubject;
  label: string;
  attempts: number;
  correct: number;
  accuracyPct: number;
}

interface WeakArea {
  topicKey: string;
  topicName: string;
  subjectLabel: string;
  attempts: number;
  accuracyPct: number;
  marksLost: number;
  hubSlug: string | null;
  hubSubject: DesktopSubject | null;
}

interface RecentRow {
  id: string;
  title: string;
  meta: string;
  timestamp: number;
  topicKey: string;
  hubSlug: string | null;
  hubSubject: DesktopSubject | null;
}

function ltSubjectLabel(s: LTSubject): string {
  return s === "maths" ? "Maths" : "Science";
}

function resolveTopicMeta(
  topicKey: string,
  fallbackName?: string
): { name: string; hubSlug: string | null; hubSubject: DesktopSubject | null } {
  const meta = desktopTopicBySlug(topicKey);
  if (meta) {
    return { name: meta.name, hubSlug: meta.slug, hubSubject: meta.subject };
  }
  return {
    name: fallbackName && fallbackName.trim() ? fallbackName : topicKey,
    hubSlug: null,
    hubSubject: null,
  };
}

function computeAccuracyPct(
  correct: number,
  total: number
): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

function computeSubjectStats(attempts: PracticeAttempt[]): SubjectStat[] {
  const buckets: Record<LTSubject, { attempts: number; correct: number }> = {
    maths: { attempts: 0, correct: 0 },
    science: { attempts: 0, correct: 0 },
  };
  for (const a of attempts) {
    if (a.subject !== "maths" && a.subject !== "science") continue;
    buckets[a.subject].attempts += 1;
    if (a.correct) buckets[a.subject].correct += 1;
  }
  return (["maths", "science"] as LTSubject[])
    .map((s) => ({
      subject: s,
      label: ltSubjectLabel(s),
      attempts: buckets[s].attempts,
      correct: buckets[s].correct,
      accuracyPct: computeAccuracyPct(buckets[s].correct, buckets[s].attempts),
    }))
    .filter((row) => row.attempts > 0);
}

function computeMistakeMix(logs: MistakeLogEntry[]): {
  totals: MistakeMix;
  total: number;
  bars: MistakeBar[];
} {
  const totals: MistakeMix = {
    conceptual: 0,
    calculation: 0,
    silly: 0,
    presentation: 0,
  };
  for (const log of logs) {
    const c = log.mistakeCounts;
    if (!c) continue;
    totals.conceptual += Number(c.conceptual) || 0;
    totals.calculation += Number(c.calculation) || 0;
    totals.silly += Number(c.silly) || 0;
    totals.presentation += Number(c.presentation) || 0;
  }
  const total =
    totals.conceptual +
    totals.calculation +
    totals.silly +
    totals.presentation;
  const bars: MistakeBar[] = [
    {
      key: "silly",
      label: "Silly",
      count: totals.silly,
      pct: total > 0 ? Math.round((totals.silly / total) * 100) : 0,
      color: DANGER_FG,
      hint: "Sign slips, dropped units, missing 'therefore'.",
    },
    {
      key: "conceptual",
      label: "Conceptual",
      count: totals.conceptual,
      pct: total > 0 ? Math.round((totals.conceptual / total) * 100) : 0,
      color: WARNING_FG,
      hint: "Wrong formula, wrong approach.",
    },
    {
      key: "calculation",
      label: "Calculation",
      count: totals.calculation,
      pct: total > 0 ? Math.round((totals.calculation / total) * 100) : 0,
      color: INFO_FG,
      hint: "Arithmetic, fraction or decimal slips.",
    },
    {
      key: "presentation",
      label: "Presentation",
      count: totals.presentation,
      pct: total > 0 ? Math.round((totals.presentation / total) * 100) : 0,
      color: ACCENT_FG,
      hint: "Unclear steps, unlabelled diagrams.",
    },
  ];
  return { totals, total, bars };
}

function computeWeakAreas(
  attempts: PracticeAttempt[],
  logs: MistakeLogEntry[]
): WeakArea[] {
  const map = new Map<
    string,
    {
      topicKey: string;
      topicName?: string;
      subject?: LTSubject;
      attempts: number;
      correct: number;
      marksLost: number;
    }
  >();

  for (const a of attempts) {
    const key = (a.topicKey || "").trim();
    if (!key) continue;
    const existing = map.get(key) || {
      topicKey: key,
      topicName: a.topicName,
      subject: a.subject,
      attempts: 0,
      correct: 0,
      marksLost: 0,
    };
    existing.attempts += 1;
    if (a.correct) existing.correct += 1;
    if (!existing.topicName && a.topicName) existing.topicName = a.topicName;
    if (!existing.subject) existing.subject = a.subject;
    map.set(key, existing);
  }

  for (const log of logs) {
    const key = (log.topic || "").trim();
    if (!key) continue;
    const existing = map.get(key) || {
      topicKey: key,
      topicName: log.topic,
      subject:
        log.subject?.toLowerCase() === "science" ? "science" : "maths",
      attempts: 0,
      correct: 0,
      marksLost: 0,
    };
    existing.marksLost += Number(log.marksLost) || 0;
    if (!existing.topicName) existing.topicName = log.topic;
    map.set(key, existing);
  }

  const rows: WeakArea[] = [];
  for (const entry of map.values()) {
    const meta = resolveTopicMeta(entry.topicKey, entry.topicName);
    const accuracyPct =
      entry.attempts > 0
        ? computeAccuracyPct(entry.correct, entry.attempts)
        : 0;
    const subjectLabel = entry.subject ? ltSubjectLabel(entry.subject) : "";
    rows.push({
      topicKey: entry.topicKey,
      topicName: meta.name,
      subjectLabel,
      attempts: entry.attempts,
      accuracyPct,
      marksLost: entry.marksLost,
      hubSlug: meta.hubSlug,
      hubSubject: meta.hubSubject,
    });
  }

  rows.sort((a, b) => {
    if (b.marksLost !== a.marksLost) return b.marksLost - a.marksLost;
    if (a.attempts > 0 && b.attempts > 0) return a.accuracyPct - b.accuracyPct;
    if (a.attempts > 0) return -1;
    if (b.attempts > 0) return 1;
    return 0;
  });

  return rows.slice(0, 4);
}

function computeRecent(attempts: PracticeAttempt[]): RecentRow[] {
  const sorted = [...attempts].sort(
    (a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)
  );
  return sorted.slice(0, 8).map((a, i) => {
    const meta = resolveTopicMeta(a.topicKey, a.topicName);
    return {
      id: a.id || `${a.questionId || "q"}-${i}`,
      title: meta.name,
      meta: `${ltSubjectLabel(a.subject)} · ${a.difficulty} · ${
        a.correct ? "Correct" : "Incorrect"
      }`,
      timestamp: Number(a.timestamp) || 0,
      topicKey: a.topicKey,
      hubSlug: meta.hubSlug,
      hubSubject: meta.hubSubject,
    };
  });
}

function relativeTime(ts: number): string {
  if (!ts || !Number.isFinite(ts)) return "";
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/* ────────────────── small UI atoms ────────────────── */

const StatCard: React.FC<{
  Icon: React.FC;
  label: string;
  value: string;
  sub?: string;
  unavailable?: boolean;
}> = ({ Icon, label, value, sub, unavailable }) => (
  <div style={{ ...cardStyle, padding: 20 }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: TEXT_MUTED,
      }}
    >
      <Icon />
      <span style={{ fontSize: 12 }}>{label}</span>
    </div>
    <div
      style={{
        marginTop: 12,
        fontFamily: FONT_DISPLAY,
        fontSize: 28,
        fontWeight: 600,
        color: unavailable ? TEXT_MUTED : TEXT_FG,
        lineHeight: 1.1,
      }}
    >
      {value}
    </div>
    {sub ? (
      <div
        style={{
          fontSize: 12,
          color: TEXT_MUTED,
          marginTop: 6,
          lineHeight: 1.4,
        }}
      >
        {sub}
      </div>
    ) : null}
  </div>
);

const EmptyState: React.FC<{
  Icon?: React.FC;
  title: string;
  body: string;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}> = ({ Icon, title, body, primary, secondary }) => (
  <div
    style={{
      padding: "20px 8px",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 10,
    }}
  >
    {Icon ? (
      <div style={{ color: TEXT_MUTED }}>
        <Icon />
      </div>
    ) : null}
    <div
      style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 16,
        fontWeight: 600,
        color: TEXT_FG,
      }}
    >
      {title}
    </div>
    <div
      style={{
        fontSize: 13,
        color: TEXT_MUTED,
        lineHeight: 1.55,
        maxWidth: 480,
      }}
    >
      {body}
    </div>
    {(primary || secondary) && (
      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
        {primary ? (
          <button type="button" style={buttonAccent} onClick={primary.onClick}>
            {primary.label}
          </button>
        ) : null}
        {secondary ? (
          <button
            type="button"
            style={buttonOutline}
            onClick={secondary.onClick}
          >
            {secondary.label}
          </button>
        ) : null}
      </div>
    )}
  </div>
);

/* ────────────────── page ────────────────── */

const DesktopMePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, mistakeLogsHydrated } = useAuth();

  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [mistakeLogs, setMistakeLogs] = useState<MistakeLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);

  // Saved attempts come from localStorage (synchronous), scoped per-uid by
  // the practiceInsights service via the active progress user.
  useEffect(() => {
    if (!user) {
      setAttempts([]);
      return;
    }
    try {
      const insights = loadInsights();
      setAttempts(
        Array.isArray(insights.attempts) ? insights.attempts : []
      );
    } catch {
      setAttempts([]);
    }
  }, [user?.uid, mistakeLogsHydrated]);

  // Mistake logs are fetched async (Firestore + localStorage merge).
  // We always degrade honestly: any failure leaves the no-data state in
  // place rather than fabricating numbers.
  useEffect(() => {
    if (!user) {
      setMistakeLogs([]);
      return;
    }
    let cancelled = false;
    setLogsLoading(true);
    void (async () => {
      try {
        const logs = await getMistakeLogs(user.uid, 30);
        if (!cancelled) setMistakeLogs(Array.isArray(logs) ? logs : []);
      } catch {
        if (!cancelled) setMistakeLogs([]);
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, mistakeLogsHydrated]);

  /* ────────────────── derived metrics (real data only) ────────────────── */

  const totalAttempts = attempts.length;
  const correctAttempts = useMemo(
    () => attempts.reduce((acc, a) => acc + (a.correct ? 1 : 0), 0),
    [attempts]
  );
  const overallAccuracyPct = useMemo(
    () => computeAccuracyPct(correctAttempts, totalAttempts),
    [correctAttempts, totalAttempts]
  );
  const subjectStats = useMemo(
    () => computeSubjectStats(attempts),
    [attempts]
  );
  const mistakeMix = useMemo(
    () => computeMistakeMix(mistakeLogs),
    [mistakeLogs]
  );
  // Careless (silly + presentation) marks — surfaced as a distinct insight,
  // deliberately kept out of weak-areas (those slips are exam-technique, not
  // knowledge gaps). Same Stream-1 logs, via the shared selector.
  const careless = useMemo(
    () => summarizeCareless(mistakeLogs),
    [mistakeLogs]
  );
  const weakAreas = useMemo(
    () => computeWeakAreas(attempts, mistakeLogs),
    [attempts, mistakeLogs]
  );
  const recent = useMemo(() => computeRecent(attempts), [attempts]);
  const topicsCovered = useMemo(() => {
    const set = new Set<string>();
    for (const a of attempts) if (a.topicKey) set.add(a.topicKey);
    return set.size;
  }, [attempts]);
  const totalMarksLost = useMemo(
    () => mistakeLogs.reduce((s, l) => s + (Number(l.marksLost) || 0), 0),
    [mistakeLogs]
  );

  /* ────────────────── routing helpers ────────────────── */

  const gotoLogin = () => {
    const params = new URLSearchParams({
      reason: "open-progress",
      redirect: "/me",
    });
    navigate(withQuery("/login", params));
  };

  const gotoPracticeBrowse = () => {
    const params = new URLSearchParams();
    if (ROUTE_CTX.source) params.set("source", ROUTE_CTX.source);
    if (ROUTE_CTX.returnTo) params.set("returnTo", ROUTE_CTX.returnTo);
    navigate(withQuery("/practice-hub", params));
  };

  const gotoPracticeForTopic = (
    subject: DesktopSubject,
    topicSlug: string
  ) => {
    navigate(
      buildDesktopPracticePath({
        scope: "topic",
        subject,
        topic: topicSlug,
        ...ROUTE_CTX,
      })
    );
  };

  const gotoWorksheetForTopic = (
    subject: DesktopSubject,
    topicSlug: string
  ) => {
    navigate(
      buildDesktopWorksheetPath({
        scope: "topic",
        subject,
        topic: topicSlug,
        mistakeAware: true,
        ...ROUTE_CTX,
      })
    );
  };

  const gotoTopicHubOrTrends = (
    hubSlug: string | null
  ) => {
    if (hubSlug) {
      navigate(buildDesktopTopicHubPath(hubSlug, ROUTE_CTX));
      return;
    }
    const params = new URLSearchParams();
    if (ROUTE_CTX.source) params.set("source", ROUTE_CTX.source);
    if (ROUTE_CTX.returnTo) params.set("returnTo", ROUTE_CTX.returnTo);
    navigate(withQuery("/exam-trends", params));
  };

  const gotoCheckImprove = () => {
    const params = new URLSearchParams();
    if (ROUTE_CTX.source) params.set("source", ROUTE_CTX.source);
    if (ROUTE_CTX.returnTo) params.set("returnTo", ROUTE_CTX.returnTo);
    navigate(withQuery("/check-improve", params));
  };

  const gotoExamTrends = () => {
    const params = new URLSearchParams();
    if (ROUTE_CTX.source) params.set("source", ROUTE_CTX.source);
    if (ROUTE_CTX.returnTo) params.set("returnTo", ROUTE_CTX.returnTo);
    navigate(withQuery("/exam-trends", params));
  };

  /* ────────────────── high-level render branches ────────────────── */

  const isSignedOut = !loading && !user;
  const hasAnyData =
    !!user && (attempts.length > 0 || mistakeLogs.length > 0);

  return (
    <div
      style={{
        maxWidth: 1500,
        margin: "0 auto",
        padding: "32px 32px 64px",
        fontFamily: FONT_SANS,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px 4px 6px",
              marginBottom: 10,
              border: "none",
              background: "transparent",
              color: TEXT_MUTED,
              fontFamily: FONT_SANS,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              borderRadius: 6,
            }}
          >
            <ArrowLeftGlyph /> Back
          </button>
          <div style={{ ...sectionEyebrow, marginBottom: 8 }}>Me · Progress</div>
          <h1
            style={{
              margin: 0,
              fontFamily: FONT_DISPLAY,
              fontSize: 30,
              fontWeight: 600,
              lineHeight: 1.2,
              color: TEXT_FG,
            }}
          >
            Your study mirror.
          </h1>
          <p
            style={{
              margin: "10px 0 0",
              fontFamily: FONT_SANS,
              fontSize: 14,
              lineHeight: 1.55,
              color: TEXT_MUTED,
              maxWidth: 720,
            }}
          >
            A clear-eyed view of your real saved attempts and mistakes — no
            invented numbers. Cards show data only when there's something real
            to show.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexShrink: 0,
            paddingTop: 4,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            style={buttonOutline}
            onClick={gotoPracticeBrowse}
          >
            Start practice
          </button>
          <button
            type="button"
            style={buttonAccent}
            onClick={gotoExamTrends}
          >
            Open Exam Trends
          </button>
        </div>
      </div>

      {/* Signed-out hero */}
      {isSignedOut ? (
        <div
          style={{
            ...cardStyle,
            padding: 28,
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 18,
            background: SECONDARY_BG,
            borderColor: "hsl(150, 35%, 80%)",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: ACCENT_FG,
              flexShrink: 0,
            }}
          >
            <LockGlyph />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={sectionEyebrow}>Sign in to see your progress</div>
            <h2
              style={{
                margin: "4px 0 8px",
                fontFamily: FONT_DISPLAY,
                fontSize: 22,
                fontWeight: 600,
                color: TEXT_FG,
                lineHeight: 1.3,
              }}
            >
              Your study mirror needs saved attempts.
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: TEXT_MUTED,
                lineHeight: 1.55,
                maxWidth: 640,
              }}
            >
              Sign in to save your practice attempts and graded answers.
              Accuracy, weak areas and recent activity all derive from real
              saved data — nothing is invented while you're signed out.
            </p>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 14,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                style={buttonAccent}
                onClick={gotoLogin}
                aria-label="Sign in to open your progress"
              >
                Sign in to open progress <ArrowRightGlyph size={14} />
              </button>
              <button
                type="button"
                style={buttonOutline}
                onClick={gotoPracticeBrowse}
              >
                Browse practice as guest
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Top stats — only honest, derivable values */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <StatCard
          Icon={CheckCircleGlyph}
          label="Saved attempts"
          value={isSignedOut ? "—" : String(totalAttempts)}
          sub={
            isSignedOut
              ? "Appears after you sign in and save attempts."
              : totalAttempts === 0
                ? "Appears after your first saved attempt."
                : "Across all subjects."
          }
          unavailable={isSignedOut || totalAttempts === 0}
        />
        <StatCard
          Icon={TargetGlyph}
          label="Accuracy"
          value={
            isSignedOut || totalAttempts === 0
              ? "—"
              : `${overallAccuracyPct}%`
          }
          sub={
            isSignedOut
              ? "Real accuracy across saved attempts only."
              : totalAttempts === 0
                ? "Appears after your first saved attempt."
                : `${correctAttempts} correct of ${totalAttempts} attempts.`
          }
          unavailable={isSignedOut || totalAttempts === 0}
        />
        <StatCard
          Icon={() => <TrendingUpGlyph size={16} />}
          label="Mistakes logged · last 30 days"
          value={
            isSignedOut
              ? "—"
              : logsLoading
                ? "…"
                : String(mistakeLogs.length)
          }
          sub={
            isSignedOut
              ? "Appears once a graded answer has a mistake to log."
              : logsLoading
                ? "Loading mistake logs…"
                : mistakeLogs.length === 0
                  ? "No mistakes logged in the last 30 days."
                  : `${totalMarksLost} marks lost across logged answers.`
          }
          unavailable={isSignedOut || (!logsLoading && mistakeLogs.length === 0)}
        />
        <StatCard
          Icon={BookGlyph}
          label="Topics covered"
          value={isSignedOut ? "—" : String(topicsCovered)}
          sub={
            isSignedOut
              ? "Appears after you save attempts in a topic."
              : topicsCovered === 0
                ? "Practise a topic to start the count."
                : "Distinct topics in your saved attempts."
          }
          unavailable={isSignedOut || topicsCovered === 0}
        />
      </div>

      {/* Mid grid — Mistake mix (LEFT) + Weak areas (RIGHT) */}
      <div
        data-pr-h-grid
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)",
          gap: 24,
          marginBottom: 24,
        }}
      >
        {/* LEFT — Mistake breakdown (real mistakeCounts) */}
        <div style={{ ...cardStyle, padding: 24, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={sectionEyebrow}>Where You Lose Marks</div>
              <h2
                style={{
                  margin: "4px 0 0",
                  fontFamily: FONT_DISPLAY,
                  fontSize: 20,
                  fontWeight: 600,
                  color: TEXT_FG,
                  lineHeight: 1.3,
                }}
              >
                Mistake breakdown · last 30 days
              </h2>
            </div>
            {isSignedOut || mistakeMix.total === 0 ? (
              <span style={previewChipStyle}>Preview</span>
            ) : null}
          </div>

          {isSignedOut ? (
            <EmptyState
              Icon={LockGlyph}
              title="Mistake mix needs saved graded answers."
              body="Sign in and grade an answer in Check & Improve. Your real mistake categories will appear here automatically."
              primary={{ label: "Sign in", onClick: gotoLogin }}
              secondary={{
                label: "Open Check & Improve",
                onClick: gotoCheckImprove,
              }}
            />
          ) : logsLoading ? (
            <div
              style={{
                fontSize: 13,
                color: TEXT_MUTED,
                padding: "12px 0",
              }}
            >
              Loading your real mistake logs…
            </div>
          ) : mistakeMix.total === 0 ? (
            <EmptyState
              Icon={InboxGlyph}
              title="No mistake logs yet."
              body="Use Check & Improve to grade an answer. Each graded answer adds to your real mistake mix — nothing is shown until then."
              primary={{
                label: "Open Check & Improve",
                onClick: gotoCheckImprove,
              }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {mistakeMix.bars.map((b) => (
                <div key={b.key}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: TEXT_FG }}>
                      {b.label}
                    </span>
                    <span style={{ color: TEXT_MUTED }}>
                      {b.count} of {mistakeMix.total} ({b.pct}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: 10,
                      background: MUTED_BG,
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(2, b.pct)}%`,
                        background: b.color,
                        borderRadius: 999,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: TEXT_MUTED,
                      marginTop: 6,
                    }}
                  >
                    {b.hint}
                  </div>
                </div>
              ))}

              {/* Careless mark-loss (silly + presentation) — a DISTINCT
                  exam-technique insight, explicitly NOT a topic weakness. */}
              {careless.hasData && (
                <div
                  style={{
                    borderRadius: 10,
                    background: SECONDARY_BG,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                    Careless mark-loss
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_FG }}>
                    {careless.marksLost > 0
                      ? `${careless.marksLost} mark${careless.marksLost === 1 ? "" : "s"} lost to careless slips`
                      : `${careless.count} careless slip${careless.count === 1 ? "" : "s"}`}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4, lineHeight: 1.5 }}>
                    {careless.sillyCount} silly · {careless.presentationCount} presentation. These are
                    exam-technique slips, not topic weaknesses — they are not counted as weak areas.
                    Slow down on the final line, units, and labels.
                  </div>
                </div>
              )}

              <div
                style={{
                  marginTop: 8,
                  borderRadius: 10,
                  background: SECONDARY_BG,
                  padding: 16,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div style={{ marginTop: 2, color: ACCENT_FG, flexShrink: 0 }}>
                  <SparklesGlyph />
                </div>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: TEXT_FG }}>
                    Practise where you actually lose marks
                  </div>
                  <div
                    style={{
                      color: TEXT_MUTED,
                      fontSize: 12,
                      marginTop: 2,
                      lineHeight: 1.5,
                    }}
                  >
                    Open a targeted practice set on your most-attempted topics.
                  </div>
                </div>
                <button
                  type="button"
                  style={buttonSmallDark}
                  onClick={gotoPracticeBrowse}
                >
                  Open practice
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Weak areas (real attempts + marks lost) */}
        <div style={{ ...cardStyle, padding: 24, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={sectionEyebrow}>Weak Areas</div>
              <h2
                style={{
                  margin: "4px 0 0",
                  fontFamily: FONT_DISPLAY,
                  fontSize: 20,
                  fontWeight: 600,
                  color: TEXT_FG,
                  lineHeight: 1.3,
                }}
              >
                Topics dragging your score
              </h2>
            </div>
            {isSignedOut || weakAreas.length === 0 ? (
              <span style={previewChipStyle}>Preview</span>
            ) : null}
          </div>

          {isSignedOut ? (
            <EmptyState
              Icon={LockGlyph}
              title="Weak areas come from real attempts."
              body="Sign in so your saved attempts and graded answers can surface the topics that actually drag your score."
              primary={{ label: "Sign in", onClick: gotoLogin }}
            />
          ) : weakAreas.length === 0 ? (
            <EmptyState
              Icon={InboxGlyph}
              title="No weak areas yet."
              body="Save a few practice attempts or grade an answer in Check & Improve. We'll only flag a topic once there's real data behind it."
              primary={{
                label: "Start practice",
                onClick: gotoPracticeBrowse,
              }}
              secondary={{
                label: "Open Check & Improve",
                onClick: gotoCheckImprove,
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {weakAreas.map((w) => {
                const showAccuracy = w.attempts > 0;
                const showMarksLost = w.marksLost > 0;
                return (
                  <button
                    key={w.topicKey}
                    type="button"
                    onClick={() => gotoTopicHubOrTrends(w.hubSlug)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: 12,
                      borderRadius: 10,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: FONT_SANS,
                      width: "100%",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = MUTED_BG;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: TEXT_FG,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {w.topicName}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: TEXT_MUTED,
                          marginTop: 2,
                        }}
                      >
                        {w.subjectLabel || "—"}
                        {showAccuracy
                          ? ` · ${w.attempts} attempt${w.attempts === 1 ? "" : "s"}`
                          : ""}
                        {showMarksLost
                          ? ` · ${w.marksLost} marks lost`
                          : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {showAccuracy ? (
                        <>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color:
                                w.accuracyPct < 60 ? DANGER_FG : TEXT_FG,
                            }}
                          >
                            {w.accuracyPct}%
                          </div>
                          <div style={{ fontSize: 10, color: TEXT_MUTED }}>
                            accuracy
                          </div>
                        </>
                      ) : showMarksLost ? (
                        <>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: WARNING_FG,
                            }}
                          >
                            −{w.marksLost}
                          </div>
                          <div style={{ fontSize: 10, color: TEXT_MUTED }}>
                            marks
                          </div>
                        </>
                      ) : null}
                    </div>
                    <div style={{ color: TEXT_MUTED, flexShrink: 0 }}>
                      <ArrowRightGlyph />
                    </div>
                  </button>
                );
              })}

              {/* Quick action for the top weak topic if it resolves to a real
                  hub slug; otherwise we silently omit the deep CTA. */}
              {weakAreas[0] && weakAreas[0].hubSlug && weakAreas[0].hubSubject ? (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    style={buttonOutline}
                    onClick={() =>
                      gotoPracticeForTopic(
                        weakAreas[0].hubSubject as DesktopSubject,
                        weakAreas[0].hubSlug as string
                      )
                    }
                  >
                    Practise {weakAreas[0].topicName}
                  </button>
                  <button
                    type="button"
                    style={buttonOutline}
                    onClick={() =>
                      gotoWorksheetForTopic(
                        weakAreas[0].hubSubject as DesktopSubject,
                        weakAreas[0].hubSlug as string
                      )
                    }
                  >
                    Mistake-aware worksheet
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Subject performance — derived from real attempts */}
      <div
        style={{
          ...cardStyle,
          padding: 24,
          marginBottom: 24,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            gap: 12,
          }}
        >
          <div>
            <div style={sectionEyebrow}>Subject Performance</div>
            <h2
              style={{
                margin: "4px 0 0",
                fontFamily: FONT_DISPLAY,
                fontSize: 20,
                fontWeight: 600,
                color: TEXT_FG,
              }}
            >
              Accuracy by subject
            </h2>
          </div>
          {isSignedOut || subjectStats.length === 0 ? (
            <span style={previewChipStyle}>Preview</span>
          ) : null}
        </div>

        {isSignedOut ? (
          <EmptyState
            Icon={LockGlyph}
            title="Subject accuracy needs saved attempts."
            body="Sign in so your real attempts in Maths and Science can be summarised here."
            primary={{ label: "Sign in", onClick: gotoLogin }}
          />
        ) : subjectStats.length === 0 ? (
          <EmptyState
            Icon={InboxGlyph}
            title="No saved attempts yet."
            body="Once you save a few attempts in either subject, accuracy bars will appear here. We don't show fake numbers."
            primary={{
              label: "Start practice",
              onClick: gotoPracticeBrowse,
            }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {subjectStats.map((s) => (
              <div key={s.subject}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontWeight: 600, color: TEXT_FG }}>
                    {s.label}
                  </span>
                  <span style={{ color: TEXT_MUTED }}>
                    {s.correct} of {s.attempts} correct ({s.accuracyPct}%)
                  </span>
                </div>
                <div
                  style={{
                    height: 10,
                    background: MUTED_BG,
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(2, s.accuracyPct)}%`,
                      background:
                        s.accuracyPct >= 75
                          ? PRIMARY_GREEN
                          : s.accuracyPct >= 50
                            ? INFO_FG
                            : DANGER_FG,
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity — real saved attempts only */}
      <div style={{ ...cardStyle, padding: 24, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            gap: 12,
          }}
        >
          <div>
            <div style={sectionEyebrow}>Recent Activity</div>
            <h2
              style={{
                margin: "4px 0 0",
                fontFamily: FONT_DISPLAY,
                fontSize: 20,
                fontWeight: 600,
                color: TEXT_FG,
              }}
            >
              Your last saved attempts
            </h2>
          </div>
          {isSignedOut || recent.length === 0 ? (
            <span style={previewChipStyle}>Preview</span>
          ) : (
            <button
              type="button"
              onClick={gotoPracticeBrowse}
              style={{
                background: "transparent",
                border: "none",
                color: TEXT_MUTED,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: FONT_SANS,
              }}
            >
              Open practice →
            </button>
          )}
        </div>

        {isSignedOut ? (
          <EmptyState
            Icon={LockGlyph}
            title="Activity comes from real saved attempts."
            body="Sign in to see your last attempts here, with timestamps and the actual topic each one covered."
            primary={{ label: "Sign in", onClick: gotoLogin }}
            secondary={{
              label: "Browse practice",
              onClick: gotoPracticeBrowse,
            }}
          />
        ) : recent.length === 0 ? (
          <EmptyState
            Icon={InboxGlyph}
            title="No recent attempts yet."
            body="Once you save a practice attempt, it shows up here with the real topic, difficulty and timestamp. We don't fabricate sample rows."
            primary={{
              label: "Start practice",
              onClick: gotoPracticeBrowse,
            }}
            secondary={{
              label: "Check an answer",
              onClick: gotoCheckImprove,
            }}
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {recent.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => gotoTopicHubOrTrends(row.hubSlug)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 12,
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                  background: CARD_BG,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: FONT_SANS,
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = MUTED_BG;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = CARD_BG;
                }}
              >
                <div
                  style={{
                    height: 8,
                    width: 8,
                    borderRadius: "50%",
                    background: row.meta.includes("Correct")
                      ? PRIMARY_GREEN
                      : DANGER_FG,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: TEXT_FG,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: TEXT_MUTED,
                      marginTop: 2,
                    }}
                  >
                    {row.meta}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: TEXT_MUTED,
                    flexShrink: 0,
                  }}
                >
                  {relativeTime(row.timestamp)}
                </div>
              </button>
            ))}
          </div>
        )}

        {!isSignedOut && hasAnyData ? (
          <div
            style={{
              marginTop: 16,
              fontSize: 11,
              color: TEXT_MUTED,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertCircleGlyph size={11} />
            Numbers above are computed from your saved attempts and graded
            answers only. Empty cards mean we don't have the data yet — never a
            placeholder.
          </div>
        ) : null}
      </div>

      {/* Narrow viewport — collapse the 7/5 grid to single column.
          Done via a media-query stylesheet injected once. */}
      <style>{`
        @media (max-width: 980px) {
          [data-pr-h-grid] { grid-template-columns: minmax(0, 1fr) !important; }
        }
      `}</style>
    </div>
  );
};

export default DesktopMePage;
