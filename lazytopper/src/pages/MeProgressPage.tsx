import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { useSubscription } from "../hooks/useSubscription";
import {
  getWindowedProgress,
  getRecentSessions,
  getActivitySummary,
  getTopicTrendFromCloud,
  isShortSpan,
  type ProgressWindow,
  type WindowedProgress,
  type RungTrend,
  type ActivitySummary,
  type TopicCloudTrend,
} from "../services/progressStore";
import type { SessionRecord } from "../services/sessionRecords";
import { getMistakeLogs, type MistakeLogEntry } from "../services/mistakeLogService";
import { summarizeCareless, type CarelessInsight } from "../services/mistakeInsightsService";
import { getWrongConceptsForTopic } from "../services/adaptivePracticeEngine";
import { normalizeTopicKey } from "../utils/topicResolver";
import { desktopTopicForWeakAreaKey } from "../lib/desktop/topics";
import {
  buildDesktopTopicHubPath,
  buildDesktopConceptPracticePath,
  buildDesktopWorksheetPath,
  withQuery,
  type DesktopRouteContext,
  type DesktopStream,
  type DesktopSubject,
} from "../lib/desktop/navigation";
import {
  ProgressWindowArc,
  progressArcStateKind,
} from "../components/progress/ProgressWindowArc";
import { UpgradeSheet } from "../components/subscription/UpgradeSheet";
// ★ DPDP (SETTINGS-1). /me is the account surface — /settings was retired and /profile
// redirects here — so the student's export and erasure rights live on the one routed
// page a signed-in student can already reach from the nav.
import AccountDataControls from "../components/account/AccountDataControls";

/**
 * MeProgressPage — ONE responsive Me / Progress surface for every width.
 *
 * Replaces `pages/desktop/DesktopMePage.tsx` + `pages/mobile/MobileMePage.tsx`
 * (the Option-B convergence already shipped for Exam Trends and Worksheets).
 * Layout is driven by `useIsDesktop()` (1024px) — never by two page files.
 *
 * WHAT THIS SURFACE IS: presentation + wiring ONLY. It reads existing services;
 * it changes no counting rule, no store and no grader.
 *
 * HONEST-OR-SILENT (the product's moat):
 *   - A rung renders only when its read returns data. There is no sample data on
 *     this page. The prototype's "New student" preview cards are a DESIGN preview
 *     and are deliberately NOT shipped.
 *   - `silly` and `presentation` are CARELESS MARK-LOSS — exam technique. They are
 *     surfaced only in the careless card and are NEVER admitted to the weak-area or
 *     drill topic list.
 *   - The before→now hero is `ProgressWindowArc`, mounted (not re-implemented) so
 *     its empty / lopsided / short-span copy is reused BY IMPORT and cannot drift.
 *
 * BACK-NAV CONTRACT: every outbound CTA carries BOTH mechanisms —
 *   `?source=me&returnTo=/me` (HighlyProbableQuestions, ExamTrendsRanked, the
 *   buildDesktop* helpers) AND `state:{ back, backLabel }` (BackLink, ChapterTest,
 *   ExamSimulation, FullMock, navigateToPractice). Never a bare <a href>: a plain
 *   href drops location.state and those surfaces lose their Back button.
 *
 * TWO SEAMS, RENDERED HONESTLY RATHER THAN PAPERED OVER:
 *   - `getRecentSessions` is SYNCHRONOUS and DEVICE-LOCAL; the hero's
 *     `getWindowedProgress` is async and cross-device. A student on a second device
 *     therefore sees a real hero above an empty attempt history. The history section
 *     says so in words instead of implying the work is gone.
 *     [FU-ME-HISTORY-DEVICE-LOCAL]
 *   - Concept rungs from `getWindowedProgress` are keyed by SUBTOPIC ONLY and carry
 *     no topic reference, so they cannot be filtered to a topic after the fact. The
 *     per-topic concept read is a SCOPED RE-READ:
 *     `getWindowedProgress(uid, window, { topicKey })`.
 *
 * No new dependency, no Tailwind, inline SVG only. Styling is class-driven from one
 * injected stylesheet (CLAUDE.md §7 — no inline style objects in new components).
 */

const ROUTE_CTX: DesktopRouteContext = { source: "me", returnTo: "/me" };
const BACK_LABEL = "Back to Me / Progress";
const BACK_STATE = { back: "/me", backLabel: BACK_LABEL } as const;

const WINDOWS: Array<{ value: ProgressWindow; label: string }> = [
  { value: "week", label: "Week" },
  { value: "2wk", label: "2 weeks" },
  { value: "month", label: "Month" },
  { value: "4mo", label: "4 months" },
];

type SubjectFilter = "All" | "Maths" | "Science";
const STREAMS: DesktopStream[] = ["All", "Physics", "Chemistry", "Biology"];

/** Careless buckets — exam technique, never a topic weakness. The moat. */
const CARELESS_TYPES = new Set(["silly", "presentation"]);

const MISTAKE_TONE: Record<string, string> = {
  conceptual: "hsl(215, 75%, 60%)",
  calculation: "hsl(38, 80%, 58%)",
  silly: "hsl(0, 70%, 62%)",
  presentation: "hsl(280, 55%, 62%)",
};

/* ────────────────── query helpers — BOTH nav mechanisms ────────────────── */

/** Appends the query half of the back-nav contract to a plain internal path. */
function withMeQuery(path: string): string {
  const params = new URLSearchParams();
  if (ROUTE_CTX.source) params.set("source", ROUTE_CTX.source);
  if (ROUTE_CTX.returnTo) params.set("returnTo", ROUTE_CTX.returnTo);
  return withQuery(path, params);
}

/* ────────────────── inline glyphs ────────────────── */

const glyph = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ChevronGlyph = () => (
  <svg {...glyph} width={16} height={16}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const LockGlyph = ({ size = 14 }: { size?: number }) => (
  <svg {...glyph} width={size} height={size}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const ArrowRightGlyph = ({ size = 15 }: { size?: number }) => (
  <svg {...glyph} width={size} height={size}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

/* ────────────────── derivation (real data only) ────────────────── */

interface DrillTopic {
  key: string;
  label: string;
  slug: string | null;
  subject: DesktopSubject | null;
  stream: DesktopStream | null;
  /** Recoverable wrong-answer count — shrinks as the topic is drilled correctly. */
  activeGaps: number;
  trend: RungTrend | null;
}

/**
 * The drill list. Sourced from the windowed topic rungs, resolved against the
 * canonical desktop registry so a topic that does not resolve can be routed
 * honestly rather than emitted as a broken path.
 */
function buildDrillTopics(topics: RungTrend[]): DrillTopic[] {
  const rows: DrillTopic[] = [];
  for (const rung of topics) {
    // Careless buckets can never enter the topic list — they are not topics.
    if (CARELESS_TYPES.has(rung.key.toLowerCase())) continue;
    const meta = desktopTopicForWeakAreaKey(rung.key);
    const canonical = normalizeTopicKey(rung.key) || rung.key;
    const activeGaps = getWrongConceptsForTopic(canonical).reduce(
      (sum, e) => sum + (Number(e.count) || 0),
      0,
    );
    rows.push({
      key: rung.key,
      label: meta?.name || rung.label || rung.key,
      slug: meta?.slug ?? null,
      subject: meta?.subject ?? null,
      stream: meta?.stream ?? null,
      activeGaps,
      trend: rung,
    });
  }
  // Weakest first: lowest current mark share, then most unresolved gaps.
  rows.sort((a, b) => {
    const an = a.trend?.now ?? 0;
    const bn = b.trend?.now ?? 0;
    if (an !== bn) return an - bn;
    return b.activeGaps - a.activeGaps;
  });
  return rows;
}

function surfaceLabel(surface: SessionRecord["surface"]): string {
  switch (surface) {
    case "worksheet":
      return "Worksheet";
    case "chapter-test":
      return "Chapter Test";
    case "full-mock":
      return "Full Mock";
    case "check-improve":
      return "Check & Improve";
    default:
      return "Practice";
  }
}

/**
 * Where an attempt-history row goes back to. A chapter test needs a REAL topic key;
 * without one we link to the surface that can show the work rather than a deep link
 * that would 404.
 */
function historyPathFor(r: SessionRecord): string {
  const topicKey = Array.isArray(r.topicKeys) && r.topicKeys.length === 1 ? r.topicKeys[0] : "";
  switch (r.surface) {
    case "full-mock":
      return withMeQuery(`/full-mock/10/${r.subject}`);
    case "chapter-test":
      return topicKey
        ? withMeQuery(`/chapter-test/10/${r.subject}/${encodeURIComponent(topicKey)}`)
        : withMeQuery("/practice-hub");
    case "worksheet":
      return withMeQuery("/practice/worksheets");
    case "check-improve":
      return withMeQuery("/check-improve");
    default:
      return withMeQuery("/practice-hub");
  }
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

/* ────────────────── atoms ────────────────── */

/**
 * LockedCta — the GATE-3 (#602) locked treatment, matched not re-derived:
 * a visibly disabled control that stays FOCUSABLE and is announced as
 * unavailable (`aria-disabled`, never the `disabled` attribute), with the
 * Premium badge adjacent, and TAPPING IT OPENS THE UPGRADE SHEET rather than
 * doing nothing.
 */
const LockedCta = ({
  label,
  onOpenPremium,
  testId,
}: {
  label: string;
  onOpenPremium: () => void;
  testId?: string;
}) => (
  <button
    type="button"
    className="lt-me__cta lt-me__cta--locked"
    aria-disabled="true"
    data-testid={testId}
    onClick={onOpenPremium}
  >
    <span className="lt-me__lock-icon" aria-hidden="true">
      <LockGlyph />
    </span>
    <span>{label}</span>
    <span className="lt-me__badge">Premium</span>
  </button>
);

/** An outbound CTA carrying BOTH back-nav mechanisms. Never a bare <a href>. */
const NavCta = ({
  to,
  label,
  variant = "outline",
  testId,
}: {
  to: string;
  label: string;
  variant?: "outline" | "accent";
  testId?: string;
}) => (
  <Link
    to={to}
    state={BACK_STATE}
    data-testid={testId}
    className={`lt-me__cta lt-me__cta--${variant}`}
  >
    <span>{label}</span>
    <ArrowRightGlyph />
  </Link>
);

const Rungs = ({ rows, emptyCopy }: { rows: RungTrend[]; emptyCopy: string }) => {
  if (rows.length === 0) {
    return <p className="lt-me__empty-body">{emptyCopy}</p>;
  }
  return (
    <ul className="lt-me__rungs">
      {rows.map((r) => (
        <li key={r.key} className="lt-me__rung">
          <span className="lt-me__rung-label">{r.label}</span>
          <span className="lt-me__rung-nums">
            <span className="lt-me__rung-before">{r.before}%</span>
            <span className="lt-me__rung-arrow" aria-hidden="true">
              →
            </span>
            <span className="lt-me__rung-now">{r.now}%</span>
            <span
              className={`lt-me__delta lt-me__delta--${
                r.delta > 0 ? "up" : r.delta < 0 ? "down" : "flat"
              }`}
            >
              {r.delta > 0 ? `+${r.delta}` : r.delta}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
};

/* ────────────────── page ────────────────── */

export default function MeProgressPage() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { user, loading, mistakeLogsHydrated } = useAuth();
  const { isPremium } = useSubscription();

  // The arc and every cross-device read need a REAL account. A local/browse session
  // has no server-side progress, and we say so rather than inventing one.
  const realUid = user && !user.isLocalSession ? user.uid : null;

  const [windowSel, setWindowSel] = useState<ProgressWindow>("month");
  const [subjectSel, setSubjectSel] = useState<SubjectFilter>("All");
  const [streamSel, setStreamSel] = useState<DesktopStream>("All");
  const [heroTab, setHeroTab] = useState<"overall" | "topic">("overall");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const [data, setData] = useState<WindowedProgress | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [topicTrend, setTopicTrend] = useState<TopicCloudTrend | null>(null);
  const [topicConcepts, setTopicConcepts] = useState<RungTrend[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [mistakeLogs, setMistakeLogs] = useState<MistakeLogEntry[]>([]);
  const [careless, setCareless] = useState<CarelessInsight>({
    sillyCount: 0,
    presentationCount: 0,
    count: 0,
    marksLost: 0,
    hasData: false,
  });
  const [premiumBlock, setPremiumBlock] = useState<string | null>(null);

  const openPremium = useCallback((feature: string) => {
    setPremiumBlock(feature);
  }, []);

  /* ── the cross-device windowed read (async) ── */
  useEffect(() => {
    let cancelled = false;
    setDataLoading(true);
    void (async () => {
      try {
        const next = await getWindowedProgress(realUid, windowSel);
        if (!cancelled) setData(next);
      } catch {
        // Honest degradation: no data beats a guessed number.
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [realUid, windowSel]);

  /* ── the per-topic trend + its SCOPED concept re-read ──
     Concept rungs are keyed by subtopic alone and carry no topic reference, so
     they cannot be filtered to a topic after the fact — the scope must go INTO
     the read. */
  useEffect(() => {
    if (!selectedTopic) {
      setTopicTrend(null);
      setTopicConcepts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [trend, scoped] = await Promise.all([
          getTopicTrendFromCloud(selectedTopic, windowSel, realUid),
          getWindowedProgress(realUid, windowSel, { topicKey: selectedTopic }),
        ]);
        if (cancelled) return;
        setTopicTrend(trend);
        setTopicConcepts(Array.isArray(scoped.concepts) ? scoped.concepts : []);
      } catch {
        if (!cancelled) {
          setTopicTrend(null);
          setTopicConcepts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTopic, windowSel, realUid]);

  /* ── device-local session history + activity counts (synchronous) ── */
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setActivity(null);
      return;
    }
    try {
      setSessions(getRecentSessions(user.uid, 8));
      setActivity(getActivitySummary(user.uid));
    } catch {
      setSessions([]);
      setActivity(null);
    }
  }, [user?.uid, mistakeLogsHydrated]);

  /* ── mistake logs → the careless insight ── */
  useEffect(() => {
    if (!user) {
      setMistakeLogs([]);
      setCareless({
        sillyCount: 0,
        presentationCount: 0,
        count: 0,
        marksLost: 0,
        hasData: false,
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const logs = await getMistakeLogs(user.uid, 30);
        if (cancelled) return;
        const arr = Array.isArray(logs) ? logs : [];
        setMistakeLogs(arr);
        setCareless(summarizeCareless(arr));
      } catch {
        if (!cancelled) {
          setMistakeLogs([]);
          setCareless({
            sillyCount: 0,
            presentationCount: 0,
            count: 0,
            marksLost: 0,
            hasData: false,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, mistakeLogsHydrated]);

  /* ── derived ── */

  const arcState = useMemo(() => progressArcStateKind(data), [data]);

  const drillTopics = useMemo(
    () => buildDrillTopics(data?.topics ?? []),
    [data],
  );

  const filteredTopics = useMemo(() => {
    return drillTopics.filter((t) => {
      if (subjectSel === "Maths" && t.subject !== "Maths") return false;
      if (subjectSel === "Science" && t.subject !== "Science") return false;
      // The Science stream sub-toggle narrows Science only; it never filters Maths
      // (every Maths topic carries stream "All" in the canonical registry).
      if (subjectSel === "Science" && streamSel !== "All" && t.stream !== streamSel) {
        return false;
      }
      return true;
    });
  }, [drillTopics, subjectSel, streamSel]);

  /**
   * The mistake mix. Careless buckets stay IN this card — it is the one place they
   * belong, because here they are named as exam technique. They never reach the
   * weak-area or drill lists.
   */
  const mistakeRungs = useMemo(() => data?.mistakeTypes ?? [], [data]);

  const weakestSection = useMemo(() => {
    const rows = data?.sections ?? [];
    if (rows.length === 0) return null;
    return rows.reduce((worst, r) => (r.now < worst.now ? r : worst), rows[0]);
  }, [data]);

  const shortSpan = useMemo(
    () => (data ? isShortSpan(windowSel, data.activitySpanDays) : false),
    [data, windowSel],
  );

  // "All" has no single subject to build a subject-scoped path from; Maths is the
  // existing DesktopMePage default and is preserved rather than re-derived.
  const drillSubject: DesktopSubject = subjectSel === "Science" ? "Science" : "Maths";

  const studentName =
    user?.displayName?.trim().split(" ")[0] || user?.email?.split("@")[0] || "";

  /* ── the signed-out locked hero ──
     NOTE, verified on trunk: `/me` is wrapped in <RequireAuth>, which redirects a
     user-less visitor to /login, so this branch is not reachable THROUGH THE ROUTE
     today. It is retained deliberately: it is the surface's honesty contract, it is
     the only correct render if the page is ever mounted outside RequireAuth, and
     deleting it would silently drop a locked-state guarantee. */
  if (!loading && !user) {
    return (
      <div className="lt-me lt-me--locked">
        <style>{ME_CSS}</style>
        <div className="lt-me__card lt-me__signin">
          <div className="lt-me__lock-badge" aria-hidden="true">
            <LockGlyph size={18} />
          </div>
          <div>
            <div className="lt-me__eyebrow">Sign in to see your progress</div>
            <h1 className="lt-me__signin-title">
              Your study mirror needs saved attempts.
            </h1>
            <p className="lt-me__empty-body">
              Sign in to save your practice attempts and graded answers. Accuracy,
              weak areas and your before&rarr;now trend all derive from real saved
              data &mdash; nothing is invented while you&rsquo;re signed out.
            </p>
            <button
              type="button"
              className="lt-me__cta lt-me__cta--accent"
              data-testid="me-login-cta"
              onClick={() =>
                navigate(
                  withQuery(
                    "/login",
                    new URLSearchParams({
                      reason: "open-progress",
                      redirect: "/me",
                    }),
                  ),
                )
              }
            >
              <span>Sign in to open progress</span>
              <ArrowRightGlyph />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`lt-me${isDesktop ? " lt-me--desktop" : " lt-me--mobile"}`}>
      <style>{ME_CSS}</style>

      {/* ── header ── */}
      <header className="lt-me__header">
        <div className="lt-me__eyebrow">Me &middot; Progress</div>
        <h1 className="lt-me__title">
          {studentName ? `Your journey, ${studentName}` : "Your journey"}
        </h1>
        <p className="lt-me__lede">
          Built only from your real saved work &mdash; nothing is guessed.
        </p>
      </header>

      {/* ── window tabs ── */}
      <div className="lt-me__windows" role="group" aria-label="Progress window">
        {WINDOWS.map((w) => (
          <button
            key={w.value}
            type="button"
            className={`lt-me__chip${windowSel === w.value ? " lt-me__chip--on" : ""}`}
            aria-pressed={windowSel === w.value}
            onClick={() => setWindowSel(w.value)}
          >
            {w.label}
          </button>
        ))}
      </div>

      {/* ── HERO ──
          Overall is ProgressWindowArc itself: mounting the shared component reuses
          its empty / lopsided / short-span copy BY IMPORT so it cannot drift. */}
      <section className="lt-me__section" aria-label="Are you improving?">
        <div className="lt-me__tabs" role="group" aria-label="Hero view">
          <button
            type="button"
            className={`lt-me__chip${heroTab === "overall" ? " lt-me__chip--on" : ""}`}
            aria-pressed={heroTab === "overall"}
            onClick={() => setHeroTab("overall")}
          >
            Overall
          </button>
          <button
            type="button"
            className={`lt-me__chip${heroTab === "topic" ? " lt-me__chip--on" : ""}`}
            aria-pressed={heroTab === "topic"}
            onClick={() => setHeroTab("topic")}
          >
            By topic
          </button>
        </div>

        {heroTab === "overall" ? (
          <div data-testid="me-hero-overall">
            <ProgressWindowArc uid={realUid} />
            {!dataLoading && arcState === "rungs" && (data?.subjects.length ?? 0) > 0 ? (
              <div className="lt-me__card">
                <div className="lt-me__eyebrow">Marks by subject</div>
                <Rungs
                  rows={data?.subjects ?? []}
                  emptyCopy="Your subject trend appears once there is graded work on both sides of this window."
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="lt-me__card" data-testid="me-hero-topic">
            <label className="lt-me__eyebrow" htmlFor="me-topic-select">
              Topic
            </label>
            {filteredTopics.length === 0 ? (
              <p className="lt-me__empty-body">
                A topic trajectory appears once you have graded work in a topic.
              </p>
            ) : (
              <>
                <select
                  id="me-topic-select"
                  className="lt-me__select"
                  value={selectedTopic ?? ""}
                  onChange={(e) => setSelectedTopic(e.target.value || null)}
                >
                  <option value="">Choose a topic&hellip;</option>
                  {filteredTopics.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {selectedTopic && topicTrend?.trend ? (
                  <>
                    <p className="lt-me__rung-nums">
                      <span className="lt-me__rung-before">
                        {topicTrend.trend.before}%
                      </span>
                      <span className="lt-me__rung-arrow" aria-hidden="true">
                        →
                      </span>
                      <span className="lt-me__rung-now">{topicTrend.trend.now}%</span>
                    </p>
                    <div className="lt-me__eyebrow">Concepts in this topic</div>
                    <Rungs
                      rows={topicConcepts}
                      emptyCopy="No per-concept marks for this topic in this window yet."
                    />
                  </>
                ) : selectedTopic ? (
                  <p className="lt-me__empty-body">
                    Not enough graded practice on this topic in this window yet. We
                    will never draw a guessed line.
                  </p>
                ) : null}
              </>
            )}
          </div>
        )}

        {shortSpan ? (
          <p className="lt-me__note" data-testid="me-short-span">
            Your practice in this window is concentrated in a short stretch &mdash;
            the trends above are your honest short-term movement, not the whole
            window.
          </p>
        ) : null}
      </section>

      {/* ── MISTAKE INTELLIGENCE ── */}
      <section className="lt-me__section" aria-label="Mistake Intelligence">
        <div className="lt-me__eyebrow">Where your marks go</div>
        <div className="lt-me__card">
          {mistakeRungs.length === 0 ? (
            <p className="lt-me__empty-body">
              Your mistake mix appears once a graded answer has a mistake to log.
              Nothing is shown until then.
            </p>
          ) : (
            <ul className="lt-me__rungs" data-testid="me-mistake-mix">
              {mistakeRungs.map((m) => (
                <li key={m.key} className="lt-me__rung">
                  <span className="lt-me__rung-label">
                    <span
                      className="lt-me__dot"
                      style={{ background: MISTAKE_TONE[m.key.toLowerCase()] }}
                      aria-hidden="true"
                    />
                    {m.label}
                  </span>
                  <span className="lt-me__rung-nums">
                    <span className="lt-me__rung-before">{m.before}%</span>
                    <span className="lt-me__rung-arrow" aria-hidden="true">
                      →
                    </span>
                    <span className="lt-me__rung-now">{m.now}%</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {careless.hasData ? (
            <div className="lt-me__careless" data-testid="me-careless">
              <div className="lt-me__eyebrow">Careless mark-loss</div>
              <div className="lt-me__careless-head">
                {careless.marksLost > 0
                  ? `${careless.marksLost} mark${careless.marksLost === 1 ? "" : "s"} lost to careless slips`
                  : `${careless.count} careless slip${careless.count === 1 ? "" : "s"}`}
              </div>
              <p className="lt-me__empty-body">
                {careless.sillyCount} silly &middot; {careless.presentationCount}{" "}
                presentation. These are exam-technique slips, not topic weaknesses
                &mdash; they are never counted as weak areas. Slow down on the final
                line, units and labels.
              </p>
              <NavCta
                to={withMeQuery(`/practice/10/${drillSubject}`)}
                label="Practise slowly and check every step"
                testId="me-cta-careless-practice"
              />
            </div>
          ) : mistakeLogs.length > 0 ? (
            <p className="lt-me__empty-body">
              No careless marks lost &mdash; your slips are concept or calculation
              based. That is a knowledge gap to close with practice, not
              carelessness.
            </p>
          ) : null}
        </div>
      </section>

      {/* ── DRILL: subject → stream → topic → concept ── */}
      <section className="lt-me__section" aria-label="Drill into a topic">
        <div className="lt-me__eyebrow">Where to work next</div>

        <div className="lt-me__filters" role="group" aria-label="Subject">
          {(["All", "Maths", "Science"] as SubjectFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`lt-me__chip${subjectSel === s ? " lt-me__chip--on" : ""}`}
              aria-pressed={subjectSel === s}
              onClick={() => {
                setSubjectSel(s);
                if (s !== "Science") setStreamSel("All");
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {subjectSel === "Science" ? (
          <div className="lt-me__filters" role="group" aria-label="Science stream">
            {STREAMS.map((s) => (
              <button
                key={s}
                type="button"
                className={`lt-me__chip${streamSel === s ? " lt-me__chip--on" : ""}`}
                aria-pressed={streamSel === s}
                data-testid={`me-stream-${s.toLowerCase()}`}
                onClick={() => setStreamSel(s)}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {filteredTopics.length === 0 ? (
          <div className="lt-me__card">
            <p className="lt-me__empty-body">
              Your topics appear here after you practise. We only name a topic once
              there is real graded work behind it.
            </p>
            <NavCta
              to={withMeQuery("/practice-hub")}
              label="Start practice"
              variant="accent"
              testId="me-cta-empty-practice"
            />
          </div>
        ) : (
          <ul className="lt-me__topics" data-testid="me-drill-topics">
            {filteredTopics.map((t) => {
              // An unresolved topic must never emit a broken route — Exam Trends is
              // the honest destination.
              const learnPath = t.slug
                ? buildDesktopTopicHubPath(t.slug, ROUTE_CTX)
                : withMeQuery("/exam-trends");
              const practisePath =
                t.slug && t.subject
                  ? buildDesktopConceptPracticePath({
                      subject: t.subject,
                      topic: t.slug,
                      backLabel: `Back to ${t.label}`,
                      ...ROUTE_CTX,
                    })
                  : withMeQuery("/exam-trends");
              return (
                <li key={t.key} className="lt-me__card lt-me__topic">
                  <div className="lt-me__topic-head">
                    <span className="lt-me__topic-name">{t.label}</span>
                    {t.activeGaps > 0 ? (
                      <span className="lt-me__gaps">
                        {t.activeGaps} gap{t.activeGaps === 1 ? "" : "s"} to clear
                      </span>
                    ) : null}
                  </div>
                  <div className="lt-me__topic-ctas">
                    {isPremium ? (
                      <NavCta
                        to={learnPath}
                        label="Learn"
                        testId={`me-cta-learn-${t.key}`}
                      />
                    ) : (
                      <LockedCta
                        label="Learn"
                        onOpenPremium={() => openPremium("Topic Hub")}
                        testId={`me-cta-learn-locked-${t.key}`}
                      />
                    )}
                    <NavCta
                      to={practisePath}
                      label="Practise"
                      variant="accent"
                      testId={`me-cta-practise-${t.key}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── CBSE SECTIONS ── */}
      <section className="lt-me__section" aria-label="CBSE sections">
        <div className="lt-me__eyebrow">CBSE sections</div>
        <div className="lt-me__card">
          {(data?.sections.length ?? 0) === 0 ? (
            <p className="lt-me__empty-body">
              Section-by-section marks appear after a worksheet, chapter test or full
              mock is graded.
            </p>
          ) : (
            <>
              <Rungs rows={data?.sections ?? []} emptyCopy="" />
              {weakestSection ? (
                <NavCta
                  to={buildDesktopWorksheetPath({
                    scope: "full-subject",
                    subject: drillSubject,
                    mistakeAware: true,
                    ...ROUTE_CTX,
                  })}
                  label={`Drill ${weakestSection.label} with a worksheet`}
                  testId="me-cta-worksheet"
                />
              ) : null}
            </>
          )}
        </div>
      </section>

      {/* ── FULL MOCK ── */}
      <section className="lt-me__section" aria-label="Full mock">
        <div className="lt-me__eyebrow">Full mock</div>
        <div className="lt-me__card">
          <p className="lt-me__empty-body">
            {activity && activity.fullMocks > 0
              ? `${activity.fullMocks} full mock${activity.fullMocks === 1 ? "" : "s"} completed.`
              : "A full mock is the closest thing to the real paper. Your count appears here after your first one."}
          </p>
          {isPremium ? (
            <NavCta
              to={withMeQuery(`/full-mock/10/${drillSubject}`)}
              label="Sit a full mock"
              variant="accent"
              testId="me-cta-full-mock"
            />
          ) : (
            <LockedCta
              label="Sit a full mock"
              onOpenPremium={() => openPremium("Full Mock")}
              testId="me-cta-full-mock-locked"
            />
          )}
        </div>
      </section>

      {/* ── ATTEMPT HISTORY ──
          Device-local by construction (getRecentSessions reads this device only)
          while the hero above is cross-device. We say so rather than let a student
          on a second device think their work was lost. */}
      <section className="lt-me__section" aria-label="Attempt history">
        <div className="lt-me__eyebrow">Your attempts</div>
        <div className="lt-me__card">
          {sessions.length === 0 ? (
            <p className="lt-me__empty-body" data-testid="me-history-empty">
              No graded sessions saved on this device yet. Your attempt history is
              stored per device, so work done on another device will not be listed
              here &mdash; your before&rarr;now trend above is the cross-device
              record.
            </p>
          ) : (
            <>
              <ul className="lt-me__history" data-testid="me-history">
                {sessions.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={historyPathFor(r)}
                      state={BACK_STATE}
                      className="lt-me__history-row"
                    >
                      <span className="lt-me__history-main">
                        <span className="lt-me__topic-name">{r.title}</span>
                        <span className="lt-me__empty-body">
                          {surfaceLabel(r.surface)} &middot; {r.marksAwarded}/
                          {r.marksTotal} &middot; {relativeTime(r.gradedAt)}
                        </span>
                      </span>
                      <ChevronGlyph />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="lt-me__note">
                Saved on this device. Work graded on another device appears in your
                before&rarr;now trend, not in this list.
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── DPDP: download my data / delete my account (SETTINGS-1) ──
          Last section on the page by design: it is a rarely-used, irreversible control
          and must not sit above the student's work. */}
      <AccountDataControls />

      <p className="lt-me__footer">
        Every number here comes from your saved attempts and graded answers. An empty
        card means there is no data yet &mdash; never a sample number.
      </p>

      {premiumBlock ? (
        <UpgradeSheet
          featureLabel={premiumBlock}
          trialEndedAt={null}
          onClose={() => setPremiumBlock(null)}
        />
      ) : null}
    </div>
  );
}

/* ────────────────── styles ──────────────────
   Class-driven (CLAUDE.md §7). One injected stylesheet, no new dependency, and the
   design grammar of DesktopHome / DesktopMePage reused verbatim. */

const ME_CSS = `
.lt-me {
  --me-bg: hsl(210, 33%, 96%);
  --me-card: #ffffff;
  --me-border: hsl(215, 25%, 90%);
  --me-fg: hsl(220, 45%, 14%);
  --me-muted: hsl(220, 15%, 45%);
  --me-accent: hsl(152, 55%, 45%);
  --me-navy: hsl(222, 47%, 24%);
  --me-display: 'Fraunces', Georgia, serif;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--me-bg);
  color: var(--me-fg);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  padding: 20px 16px 56px;
  /* The surface owns its background to the fold — without this the page tint
     stops at the content and leaves a white band above the mobile BottomNav. */
  min-height: 100vh;
}
.lt-me--desktop { max-width: 1180px; margin: 0 auto; padding: 32px 32px 64px; gap: 28px; }

.lt-me__header { display: flex; flex-direction: column; gap: 6px; }
.lt-me__eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: 0.13em;
  text-transform: uppercase; color: var(--me-muted);
}
.lt-me__title {
  font-family: var(--me-display);
  font-size: clamp(22px, 5vw, 32px); font-weight: 600;
  margin: 4px 0 0; letter-spacing: -0.01em; line-height: 1.2;
}
.lt-me__lede { margin: 0; font-size: 13px; color: var(--me-muted); line-height: 1.55; }

.lt-me__windows, .lt-me__tabs, .lt-me__filters {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.lt-me__chip {
  padding: 7px 13px; border-radius: 999px;
  border: 1px solid var(--me-border); background: var(--me-card);
  color: var(--me-muted); font-size: 12.5px; font-weight: 600; cursor: pointer;
}
.lt-me__chip--on {
  background: var(--me-navy); border-color: var(--me-navy); color: #fff;
}

.lt-me__section { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.lt-me__card {
  background: var(--me-card); border: 1px solid var(--me-border);
  border-radius: 14px; padding: 18px;
  display: flex; flex-direction: column; gap: 12px; min-width: 0;
}

.lt-me__rungs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.lt-me__rung {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
}
.lt-me__rung-label {
  font-size: 13.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;
  min-width: 0; overflow-wrap: anywhere;
}
.lt-me__dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.lt-me__rung-nums {
  display: inline-flex; align-items: baseline; gap: 6px;
  font-size: 13px; color: var(--me-muted); margin: 0; flex-shrink: 0;
}
.lt-me__rung-now { font-weight: 700; color: var(--me-fg); }
.lt-me__rung-arrow { color: var(--me-muted); }
.lt-me__delta { font-size: 12px; font-weight: 700; }
.lt-me__delta--up { color: hsl(152, 60%, 32%); }
.lt-me__delta--down { color: hsl(0, 62%, 45%); }
.lt-me__delta--flat { color: var(--me-muted); }

.lt-me__empty-body { margin: 0; font-size: 13px; color: var(--me-muted); line-height: 1.55; }
.lt-me__note {
  margin: 0; font-size: 12px; color: var(--me-muted);
  line-height: 1.5; font-style: italic;
}
.lt-me__footer {
  margin: 0; font-size: 11.5px; color: var(--me-muted);
  line-height: 1.55; text-align: center;
}

.lt-me__select {
  width: 100%; padding: 10px 12px; border-radius: 10px;
  border: 1px solid var(--me-border); background: var(--me-card);
  color: var(--me-fg); font-size: 13.5px; font-family: inherit;
}

.lt-me__careless {
  display: flex; flex-direction: column; gap: 8px;
  padding: 14px; border-radius: 11px; background: hsl(150, 35%, 96%);
}
.lt-me__careless-head { font-family: var(--me-display); font-weight: 600; font-size: 15px; }

.lt-me__topics { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.lt-me--desktop .lt-me__topics {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}
.lt-me__topic-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.lt-me__topic-name { font-size: 14px; font-weight: 600; color: var(--me-fg); overflow-wrap: anywhere; }
.lt-me__gaps { font-size: 11.5px; color: var(--me-muted); flex-shrink: 0; }
.lt-me__topic-ctas { display: flex; flex-wrap: wrap; gap: 8px; }

.lt-me__cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 9px 14px; border-radius: 9px; cursor: pointer;
  font-family: inherit; font-size: 13px; font-weight: 600;
  text-decoration: none; border: 1px solid var(--me-border);
  background: var(--me-card); color: var(--me-fg);
  max-width: 100%; text-align: left; overflow-wrap: anywhere;
  /* A CTA sizes to its label. Without this it is a stretch-aligned flex child of
     the card and renders as a full-bleed bar at desktop width. */
  align-self: flex-start;
}
.lt-me__cta--accent {
  background: var(--me-accent); border-color: var(--me-accent); color: #fff;
}
.lt-me__cta--locked {
  background: hsl(220, 20%, 96%); border-color: var(--me-border);
  color: var(--me-muted); cursor: pointer;
}
.lt-me__lock-icon { display: inline-flex; flex-shrink: 0; }
.lt-me__badge {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
  padding: 2px 7px; border-radius: 999px;
  background: var(--me-navy); color: #fff; flex-shrink: 0;
}

.lt-me__history { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.lt-me__history-row {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 12px; border-radius: 10px;
  border: 1px solid var(--me-border); background: var(--me-card);
  color: var(--me-fg); text-decoration: none;
}
.lt-me__history-main { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }

.lt-me__signin { flex-direction: row; align-items: flex-start; gap: 16px; }
.lt-me__lock-badge {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: hsl(150, 35%, 94%); color: hsl(152, 55%, 35%);
}
.lt-me__signin-title {
  font-family: var(--me-display); font-size: 20px; font-weight: 600;
  margin: 4px 0 8px; line-height: 1.3;
}
`;
