import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getWeakAreas, type WeakArea, type WeakAreaSummary } from "../services/weakAreaAggregator";
import { useAuth } from "../context/AuthContext";
import {
  ME_DEFAULT_WINDOW,
  boardChapterKey,
  modelNamesWeakness,
  readStudyModel,
  rungNamesWeakness,
  subjectRungOf,
  type StudyReadModel,
} from "../services/progressReadModel";
import { getDueReviews, getSRStats, type SRConceptCard } from "../services/spacedRepetitionEngine";
import {
  generateLearningPath,
  loadLearningPath,
  markDayCompleted,
  checkAndAdaptPath,
  type LearningPath,
} from "../services/learningPathGenerator";
import "./WeakAreaPracticePage.css";

type ViewTab = "weak-areas" | "learning-path" | "reviews";

/*
 * ME-ENGINE-1 PR-2b — OWNER RULING 2026-10-06 (OWNER_RULINGS_B18_ME.md Round 2): "Mastery" is
 * retired; every mastery display is gone from this page. A weak area's Accuracy and Attempts now
 * come from the shared, synced read model (services/progressReadModel) — the same numbers on
 * every device, for Me's default window — and only above Me's honesty threshold
 * (`rungNamesWeakness`, the gate Me and the Tutor brief use): below it, NO number is shown. The
 * practice difficulty follows the student's GRADED MARKS LOST in that chapter (the graded stream
 * Me's "marks on the table" reads), not mastery.
 */

/** A weak area's evidence from the shared model, or null below Me's threshold (show no number). */
export interface AreaEvidence {
  /** Marks scored / marks available over the chapter's graded answers, as a whole percent. */
  accuracy: number;
  /** Graded answers in the chapter (measurable points, both halves of the window). */
  attempts: number;
  /** Graded marks lost in the chapter. */
  marksLost: number;
  /** marksLost / marks available, 0..1. */
  lostShare: number;
}

export function areaEvidence(model: StudyReadModel | null, topicKey: string): AreaEvidence | null {
  if (!model) return null;
  const key = boardChapterKey(topicKey);
  const rung = key ? model.progress.topics.find((r) => r.key === key) : undefined;
  if (!rungNamesWeakness(rung)) return null;
  const available = rung.marksAvailable;
  const lost = Math.max(0, available - rung.marksScored);
  return {
    accuracy: Math.round((rung.marksScored / available) * 100),
    attempts: (Number(rung.sampleBefore) || 0) + (Number(rung.sampleNow) || 0),
    marksLost: lost,
    lostShare: lost / available,
  };
}

/**
 * Practice difficulty from the graded marks lost in the chapter: losing most of the marks → start
 * Easy; about a third or more → Medium; little lost → Hard. No evidence above the threshold →
 * Easy (the targeted session's own start), never a guess from a retired figure.
 */
export function difficultyFromMarksLost(evidence: AreaEvidence | null): "Easy" | "Medium" | "Hard" {
  if (!evidence) return "Easy";
  if (evidence.lostShare >= 0.6) return "Easy";
  if (evidence.lostShare >= 0.3) return "Medium";
  return "Hard";
}

/**
 * ME-ENGINE-1 PR-2c — Me's gate for the paper ON SCREEN. A one-paper tab asks that paper's own
 * rung (`rungNamesWeakness`); "All" asks `modelNamesWeakness` (every paper with graded answers
 * must pass; none → false). No model (loading, signed out, failed read) → false.
 */
export function emptyListGateMet(model: StudyReadModel | null, subjectFilter: "All" | "Maths" | "Science"): boolean {
  if (!model) return false;
  if (subjectFilter === "All") return modelNamesWeakness(model);
  return rungNamesWeakness(subjectRungOf(model.progress, subjectFilter === "Maths" ? "maths" : "science"));
}

/**
 * ME-ENGINE-1 PR-2d [WEAKAREA-NAMES-BELOW-GATE] — the weak areas this tab may NAME. A topic is
 * named only when Me's gate for the paper on screen is met (`emptyListGateMet`) AND its own
 * paper's rung passes (`rungNamesWeakness`, imported, never copied); below it, none — the tab
 * shows the honest "Not Enough Graded Yet" state instead of a topic from one miss.
 */
export function namedWeakAreas(
  model: StudyReadModel | null,
  subjectFilter: "All" | "Maths" | "Science",
  areas: readonly WeakArea[],
): WeakArea[] {
  if (!model || !emptyListGateMet(model, subjectFilter)) return [];
  return areas.filter((a) => rungNamesWeakness(subjectRungOf(model.progress, a.subject === "Science" ? "science" : "maths")));
}

export type AreaStatus = "Critical" | "Needs Work" | "Review";

/**
 * ME-ENGINE-1 PR-2d [WEAKAREA-STATUS-DEVICE-LOCAL] — a weak area's status label from the SHARED,
 * synced read model only (the chapter's graded marks lost — the same figure on every device; the
 * same cut-offs that set the practice difficulty). The old label read `confidenceScore`, which
 * adds +15 when THIS device has no local attempts, so two devices disagreed. No evidence above
 * the gate → no status (null): never a device-only label.
 */
export function areaStatus(evidence: AreaEvidence | null): AreaStatus | null {
  if (!evidence) return null;
  if (evidence.lostShare >= 0.6) return "Critical";
  if (evidence.lostShare >= 0.3) return "Needs Work";
  return "Review";
}

const STATUS_COLOR: Record<AreaStatus, string> = { Critical: "#ef4444", "Needs Work": "#f59e0b", Review: "#3b82f6" };

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 8, background: "var(--bg-card-border)", borderRadius: 4, overflow: "hidden", width: "100%" }}>
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 4,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

function WeakAreaCard({
  area,
  evidence,
  onPractice,
}: {
  area: WeakArea;
  evidence: AreaEvidence | null;
  onPractice: (area: WeakArea) => void;
}) {
  const status = areaStatus(evidence);
  const urgencyColor = status ? STATUS_COLOR[status] : "#3b82f6";
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 14,
        background: "var(--bg-card)",
        border: `2px solid ${urgencyColor}20`,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{area.topicName}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{area.subject}</div>
        </div>
        {status ? (
          <div
            data-testid="weak-area-status"
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              background: `${urgencyColor}15`,
              color: urgencyColor,
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {status}
          </div>
        ) : null}
      </div>

      {evidence ? (
        <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 12 }} data-testid="weak-area-evidence">
          <div>
            <span style={{ color: "var(--text-muted)" }}>Accuracy: </span>
            <span style={{ fontWeight: 700 }}>{evidence.accuracy}%</span>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Attempts: </span>
            <span style={{ fontWeight: 700 }}>{evidence.attempts}</span>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 10, fontSize: 12, color: "var(--text-muted)" }} data-testid="weak-area-evidence-thin">
          Not enough graded answers yet to show accuracy.
        </div>
      )}

      {area.weakConcepts.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {area.weakConcepts.map((c) => (
            <span
              key={c}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 10,
                background: "var(--bg-card)",
                color: "var(--text-muted)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => onPractice(area)}
        style={{
          marginTop: 12,
          width: "100%",
          padding: "10px 0",
          borderRadius: 12,
          border: "none",
          background: "#58cc02",
          color: "var(--text)",
          fontWeight: 800,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Practice Now
      </button>
    </div>
  );
}

function LearningPathView({
  path,
  onRefresh,
}: {
  path: LearningPath;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div
        style={{
          padding: 16,
          borderRadius: 14,
          background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.04) 100%)",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {path.status === "completed" ? "Path Completed!" : `Day ${path.daysCompleted + 1} of ${path.totalDays}`}
            </div>
            {/* ME-ENGINE-1 PR-2d — no "0 weak areas targeted": the count shows only when the path
                was built from at least one weak area. */}
            {path.weakAreasAtStart > 0 ? (
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }} data-testid="wap-path-targeted">
                {path.weakAreasAtStart} weak area{path.weakAreasAtStart === 1 ? "" : "s"} targeted
              </div>
            ) : null}
          </div>
          {/* ME-ENGINE-1 PR-2d — no fake 0%: the percent and the bar appear only once a day is done. */}
          {path.daysCompleted > 0 ? (
            <div style={{ textAlign: "right" }} data-testid="wap-path-progress">
              <div style={{ fontSize: 28, fontWeight: 900, color: "#58cc02" }}>
                {Math.round((path.daysCompleted / path.totalDays) * 100)}%
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>complete</div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }} data-testid="wap-path-not-started">
              Not started yet
            </div>
          )}
        </div>
        {path.daysCompleted > 0 ? <ProgressBar value={path.daysCompleted} max={path.totalDays} color="#58cc02" /> : null}
      </div>

      {path.days.map((day, idx) => {
        const isCompleted = idx < path.daysCompleted;
        const isToday = day.date === today;
        const isFuture = day.date > today;

        return (
          <div
            key={day.day}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: isCompleted ? "rgba(34,197,94,0.08)" : isToday ? "rgba(245,158,11,0.08)" : "var(--bg-card)",
              border: isToday ? "2px solid #f59e0b" : "1px solid var(--bg-card-border)",
              marginBottom: 8,
              opacity: isFuture ? 0.6 : 1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>
                  {isCompleted ? "\u2705" : day.isMilestone ? "\uD83C\uDFC6" : isToday ? "\uD83D\uDCCD" : "\u25CB"}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Day {day.day}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{day.date} - {day.estimatedMinutes} min</div>
                </div>
              </div>
              {isToday && !isCompleted && (
                <button
                  onClick={() => {
                    markDayCompleted(idx);
                    if (day.topics.length > 0) {
                      const t = day.topics[0];
                      navigate(`/practice/10/${t.subject}?topic=${encodeURIComponent(t.topicKey)}&difficulty=${t.difficulty}&count=${t.targetQuestions}`, { state: { back: "/weak-area-practice", backLabel: "Back to Weak Areas" } });
                    }
                  }}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 20,
                    border: "none",
                    background: "#58cc02",
                    color: "var(--text)",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Start
                </button>
              )}
            </div>

            {day.topics.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {day.topics.map((t) => (
                  <span
                    key={t.topicKey}
                    style={{
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 10,
                      background: t.subject === "Science" ? "rgba(59,130,246,0.1)" : "rgba(245,158,11,0.1)",
                      fontWeight: 600,
                    }}
                  >
                    {t.topicName} ({t.difficulty})
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={onRefresh}
        style={{
          marginTop: 12,
          width: "100%",
          padding: "10px 0",
          borderRadius: 12,
          border: "2px solid var(--bg-card-border)",
          background: "var(--bg-card)",
          color: "var(--text)",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Regenerate Path
      </button>
    </div>
  );
}

function ReviewCard({ card }: { card: SRConceptCard }) {
  const stageColors: Record<string, string> = {
    new: "#3b82f6",
    learning: "#f59e0b",
    review: "#8b5cf6",
    mastered: "#22c55e",
  };
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        background: "var(--bg-card)",
        border: "1px solid var(--bg-card-border)",
        marginBottom: 8,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{card.conceptKey}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{card.topicKey} - {card.subject}</div>
      </div>
      <span
        style={{
          padding: "3px 10px",
          borderRadius: 10,
          background: `${stageColors[card.stage]}15`,
          color: stageColors[card.stage],
          fontWeight: 700,
          fontSize: 11,
          textTransform: "capitalize",
        }}
      >
        {card.stage}
      </span>
    </div>
  );
}

export default function WeakAreaPracticePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const [tab, setTab] = useState<ViewTab>("weak-areas");
  const [subjectFilter, setSubjectFilter] = useState<"All" | "Maths" | "Science">("All");
  const [summary, setSummary] = useState<WeakAreaSummary | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [model, setModel] = useState<StudyReadModel | null>(null);

  // The shared, synced read model — Me's default window, both papers. A failed read shows no
  // number (honest-or-silent), never a device-local stand-in.
  useEffect(() => {
    if (!uid) {
      setModel(null);
      return;
    }
    let cancelled = false;
    readStudyModel(uid, { window: ME_DEFAULT_WINDOW })
      .then((m) => {
        if (!cancelled) setModel(m);
      })
      .catch(() => {
        if (!cancelled) setModel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, refreshKey]);

  useEffect(() => {
    const subj = subjectFilter === "All" ? undefined : subjectFilter;
    setSummary(getWeakAreas({ subject: subj }));
    const adaptedPath = checkAndAdaptPath();
    setLearningPath(adaptedPath || loadLearningPath());
  }, [subjectFilter, refreshKey]);

  const dueReviews = useMemo(() => {
    const subj = subjectFilter === "All" ? undefined : subjectFilter;
    return getDueReviews({ subject: subj, limit: 20 });
  }, [subjectFilter, refreshKey]);

  const srStats = useMemo(() => getSRStats(), [refreshKey]);

  // ME-ENGINE-1 PR-2d — only what Me's gate lets this tab name (see `namedWeakAreas`).
  const gateMet = emptyListGateMet(model, subjectFilter);
  const shownAreas = useMemo(
    () => namedWeakAreas(model, subjectFilter, summary?.weakAreas ?? []),
    [model, subjectFilter, summary],
  );

  // No `isGenerating` state: `generateLearningPath` is synchronous, so React
  // batches any set-true/set-false pair inside one handler and no render ever
  // observes the flag. A spinner that provably cannot appear is a no-op, not a
  // safeguard, so the button stays plain rather than pretending to be busy.

  const handlePractice = (area: WeakArea) => {
    const diff = difficultyFromMarksLost(areaEvidence(model, area.topicKey));
    navigate(`/practice/10/${area.subject}?topic=${encodeURIComponent(area.topicKey)}&count=12&difficulty=${diff}&weakMode=1`, { state: { back: "/weak-area-practice", backLabel: "Back to Weak Areas" } });
  };

  const handleStartTargetedSession = () => {
    if (shownAreas.length === 0) return;
    const weakest = shownAreas[0];
    navigate(`/practice/10/${weakest.subject}?topic=${encodeURIComponent(weakest.topicKey)}&count=15&difficulty=Easy&weakMode=1`, { state: { back: "/weak-area-practice", backLabel: "Back to Weak Areas" } });
  };

  /**
   * The learning path is built LOCALLY and synchronously.
   *
   * A prior AI variant called `callMentor("plan")`, which posts to `/api/mentor`
   * — a route deleted by Retirement PR-2. Every click therefore paid one
   * guaranteed-failing network round trip before its `catch` fell back to
   * exactly the local call below. The fallback was the only branch that ever
   * produced a path, so it is now the only branch there is.
   */
  const handleGeneratePath = () => {
    const subj = subjectFilter === "All" ? undefined : subjectFilter;
    setLearningPath(generateLearningPath({ subject: subj, daysAvailable: 14, minutesPerDay: 60 }));
    setTab("learning-path");
  };

  useEffect(() => {
    if (summary && summary.closedThisWeek > 0) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [summary?.closedThisWeek]);

  return (
    <div className="lt-page" style={{ paddingTop: 8 }}>
      <button
        /* SEVER PR: back-default re-pointed off the retired /dashboard to live /practice-hub. */
        onClick={() => navigate(navState?.back || "/practice-hub")}
        style={{
          background: "none",
          border: "none",
          color: "#1cb0f6",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          marginBottom: 8,
          padding: 0,
        }}
      >
        &larr; {navState?.backLabel || "Back"}
      </button>

      <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Fix My Weak Areas</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16 }}>
        Targeted practice to close your gaps and boost your score.
      </p>

      {showCelebration && summary && summary.closedThisWeek > 0 && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(34,197,94,0.1) 100%)",
            border: "2px solid rgba(245,158,11,0.4)",
            marginBottom: 16,
            textAlign: "center",
            animation: "fadeIn 0.5s ease",
          }}
        >
          <div style={{ fontSize: 32 }}>&#127881;</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#f59e0b" }}>
            {summary.closedThisWeek} weak area{summary.closedThisWeek > 1 ? "s" : ""} closed this week!
          </div>
        </div>
      )}

      {/* ME-ENGINE-1 PR-2d — the counts show only above the gate (below it, "1 weak area" from one
          miss — or a "0" — would be a figure Me withholds). */}
      {summary && gateMet && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div style={{ padding: "12px 8px", borderRadius: 12, background: "rgba(239,68,68,0.08)", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#ef4444" }}>{shownAreas.length}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Weak Areas</div>
          </div>
          <div style={{ padding: "12px 8px", borderRadius: 12, background: "rgba(34,197,94,0.08)", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#22c55e" }}>{summary.closedThisWeek}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Closed This Week</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["All", "Maths", "Science"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSubjectFilter(s)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "none",
              background: subjectFilter === s ? "#1cb0f6" : "var(--bg-card)",
              color: subjectFilter === s ? "#fff" : "var(--text)",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
        {([
          { id: "weak-areas" as ViewTab, label: "Weak Areas", count: shownAreas.length },
          { id: "learning-path" as ViewTab, label: "Learning Path" },
          { id: "reviews" as ViewTab, label: "Reviews", count: srStats.dueToday },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === "learning-path" && !learningPath) {
                handleGeneratePath();
              } else {
                setTab(t.id);
              }
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 12,
              border: tab === t.id ? "2px solid #58cc02" : "2px solid var(--bg-card-border)",
              background: tab === t.id ? "rgba(34,197,94,0.08)" : "var(--bg-card)",
              color: tab === t.id ? "#22c55e" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span style={{ marginLeft: 4, fontSize: 11, color: "#ef4444" }}>({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {tab === "weak-areas" && (
        <div>
          {/* ME-ENGINE-1 PR-2c [WEAKAREA-EMPTY-PRAISE]: an empty list NEVER praises. The list comes
              from `getWeakAreas`, which still reads device-local practice data, so an empty list
              is not proof that no topic is weak (FU-B18-WEAKAREA-LOCAL-LIST). The copy follows the
              gate of the paper ON SCREEN (`emptyListGateMet`): below it — no graded answers in that
              paper, signed out, a failed read — "not enough graded yet"; above it, a neutral line. */}
          {shownAreas.length === 0 ? (
            gateMet ? (
              <div className="wap-empty" data-testid="weak-area-empty-none">
                <div className="wap-empty__icon" aria-hidden="true">&#128218;</div>
                <h3 className="wap-empty__title">No Topic to Suggest Right Now</h3>
                <p className="wap-empty__text">
                  Keep practising — this list updates as your answers are graded.
                </p>
                <button type="button" className="wap-empty__cta" onClick={() => navigate("/practice-hub")}>
                  Go to Practice
                </button>
              </div>
            ) : (
              <div className="wap-empty" data-testid="weak-area-empty-thin">
                <div className="wap-empty__icon" aria-hidden="true">&#128218;</div>
                <h3 className="wap-empty__title">Not Enough Graded Yet</h3>
                <p className="wap-empty__text">
                  Not enough of your answers have been graded yet to suggest a topic. Practise a few questions and check back.
                </p>
                <button type="button" className="wap-empty__cta" onClick={() => navigate("/practice-hub")}>
                  Go to Practice
                </button>
              </div>
            )
          ) : (
            <>
              <button
                onClick={handleStartTargetedSession}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: 14,
                  border: "none",
                  background: "linear-gradient(135deg, #ff9600, #ef4444)",
                  color: "var(--text)",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  marginBottom: 16,
                  boxShadow: "0 4px 12px rgba(255,150,0,0.3)",
                }}
              >
                Start Targeted Session — {shownAreas[0]?.topicName} (15 questions, Easy → Hard)
              </button>
              {shownAreas.map((area) => (
                <WeakAreaCard
                  key={area.topicKey}
                  area={area}
                  evidence={areaEvidence(model, area.topicKey)}
                  onPractice={handlePractice}
                />
              ))}
            </>
          )}

          {shownAreas.length > 0 && (
            <button
              onClick={handleGeneratePath}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "14px 0",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg, #1cb0f6, #58cc02)",
                color: "var(--text)",
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Generate Learning Path
            </button>
          )}
        </div>
      )}

      {/* ME-ENGINE-1 PR-2d — the path names topics, so below the gate it names none either. */}
      {tab === "learning-path" && !gateMet && (
        <div className="wap-empty" data-testid="wap-path-thin">
          <div className="wap-empty__icon" aria-hidden="true">&#128218;</div>
          <h3 className="wap-empty__title">Not Enough Graded Yet</h3>
          <p className="wap-empty__text">
            Your learning path appears once enough of your answers have been graded to suggest a topic.
          </p>
          <button type="button" className="wap-empty__cta" onClick={() => navigate("/practice-hub")}>
            Go to Practice
          </button>
        </div>
      )}

      {tab === "learning-path" && gateMet && learningPath && (
        <LearningPathView
          path={learningPath}
          onRefresh={() => {
            handleGeneratePath();
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {tab === "reviews" && (
        <div>
          {srStats.total === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>&#128218;</div>
              <h3 style={{ fontWeight: 800, fontSize: 18 }}>No Reviews Yet</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8 }}>
                Practice some topics and concepts will be added to your review schedule automatically.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "Due Today", value: srStats.dueToday, color: "#ef4444" },
                  { label: "Learning", value: srStats.learning, color: "#f59e0b" },
                  { label: "Review", value: srStats.review, color: "#8b5cf6" },
                  { label: "Mastered", value: srStats.mastered, color: "#22c55e" },
                ].map((s) => (
                  <div key={s.label} style={{ padding: "10px 4px", borderRadius: 10, background: "var(--bg-card-border)", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {dueReviews.length > 0 ? (
                dueReviews.map((card) => <ReviewCard key={`${card.topicKey}::${card.conceptKey}`} card={card} />)
              ) : (
                <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14, padding: 20 }}>
                  No reviews due today. Check back tomorrow!
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
