import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getWeakAreas, type WeakArea, type WeakAreaSummary } from "../services/weakAreaAggregator";
import { getDueReviews, getSRStats, type SRConceptCard } from "../services/spacedRepetitionEngine";
import {
  generateLearningPath,
  generateAILearningPath,
  loadLearningPath,
  markDayCompleted,
  checkAndAdaptPath,
  type LearningPath,
} from "../services/learningPathGenerator";

type ViewTab = "weak-areas" | "learning-path" | "reviews";

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden", width: "100%" }}>
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

function WeakAreaCard({ area, onPractice }: { area: WeakArea; onPractice: (area: WeakArea) => void }) {
  const urgencyColor = area.confidenceScore >= 40 ? "#ef4444" : area.confidenceScore >= 20 ? "#f59e0b" : "#3b82f6";
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: `2px solid ${urgencyColor}20`,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{area.topicName}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{area.subject}</div>
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 20,
            background: `${urgencyColor}15`,
            color: urgencyColor,
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {area.confidenceScore >= 40 ? "Critical" : area.confidenceScore >= 20 ? "Needs Work" : "Review"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 12 }}>
        <div>
          <span style={{ color: "rgba(255,255,255,0.45)" }}>Accuracy: </span>
          <span style={{ fontWeight: 700 }}>{area.accuracy}%</span>
        </div>
        <div>
          <span style={{ color: "rgba(255,255,255,0.45)" }}>Mastery: </span>
          <span style={{ fontWeight: 700 }}>{area.masteryPercent}%</span>
        </div>
        <div>
          <span style={{ color: "rgba(255,255,255,0.45)" }}>Attempts: </span>
          <span style={{ fontWeight: 700 }}>{area.totalAttempts}</span>
        </div>
      </div>

      <ProgressBar value={area.masteryPercent} max={100} color={urgencyColor} />

      {area.weakConcepts.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {area.weakConcepts.map((c) => (
            <span
              key={c}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.45)",
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
          color: "#fff",
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
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
              {path.weakAreasAtStart} weak areas targeted
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#58cc02" }}>
              {Math.round((path.daysCompleted / path.totalDays) * 100)}%
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>complete</div>
          </div>
        </div>
        <ProgressBar value={path.daysCompleted} max={path.totalDays} color="#58cc02" />
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
              background: isCompleted ? "rgba(34,197,94,0.08)" : isToday ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)",
              border: isToday ? "2px solid #f59e0b" : "1px solid rgba(255,255,255,0.06)",
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
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{day.date} - {day.estimatedMinutes} min</div>
                </div>
              </div>
              {isToday && !isCompleted && (
                <button
                  onClick={() => {
                    markDayCompleted(idx);
                    if (day.topics.length > 0) {
                      const t = day.topics[0];
                      navigate(`/practice/10/${t.subject}?topic=${encodeURIComponent(t.topicKey)}&difficulty=${t.difficulty}&count=${t.targetQuestions}`);
                    }
                  }}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 20,
                    border: "none",
                    background: "#58cc02",
                    color: "#fff",
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
          border: "2px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          color: "rgba(255,255,255,0.85)",
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
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 8,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{card.conceptKey}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{card.topicKey} - {card.subject}</div>
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

  const [isGenerating, setIsGenerating] = useState(false);

  const handlePractice = (area: WeakArea) => {
    const diff = area.masteryPercent < 20 ? "Easy" : area.masteryPercent < 50 ? "Medium" : "Hard";
    navigate(`/practice/10/${area.subject}?topic=${encodeURIComponent(area.topicKey)}&count=12&difficulty=${diff}&weakMode=1`);
  };

  const handleStartTargetedSession = () => {
    if (!summary || summary.weakAreas.length === 0) return;
    const weakest = summary.weakAreas[0];
    navigate(`/practice/10/${weakest.subject}?topic=${encodeURIComponent(weakest.topicKey)}&count=15&difficulty=Easy&weakMode=1`);
  };

  const handleGeneratePath = async () => {
    setIsGenerating(true);
    const subj = subjectFilter === "All" ? undefined : subjectFilter;
    try {
      const path = await generateAILearningPath({ subject: subj, daysAvailable: 14, minutesPerDay: 60 });
      setLearningPath(path);
    } catch {
      const path = generateLearningPath({ subject: subj, daysAvailable: 14, minutesPerDay: 60 });
      setLearningPath(path);
    }
    setIsGenerating(false);
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
        onClick={() => navigate(navState?.back || "/dashboard")}
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
        &larr; Back
      </button>

      <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Fix My Weak Areas</h2>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 16 }}>
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

      {summary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div style={{ padding: "12px 8px", borderRadius: 12, background: "rgba(239,68,68,0.08)", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#ef4444" }}>{summary.totalWeak}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>Weak Areas</div>
          </div>
          <div style={{ padding: "12px 8px", borderRadius: 12, background: "rgba(34,197,94,0.08)", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#22c55e" }}>{summary.closedThisWeek}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>Closed This Week</div>
          </div>
          <div style={{ padding: "12px 8px", borderRadius: 12, background: "rgba(59,130,246,0.08)", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#3b82f6" }}>{summary.overallMasteryPercent}%</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>Overall Mastery</div>
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
              background: subjectFilter === s ? "#1cb0f6" : "rgba(255,255,255,0.06)",
              color: subjectFilter === s ? "#fff" : "rgba(255,255,255,0.85)",
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
          { id: "weak-areas" as ViewTab, label: "Weak Areas", count: summary?.totalWeak },
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
              border: tab === t.id ? "2px solid #58cc02" : "2px solid rgba(255,255,255,0.08)",
              background: tab === t.id ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
              color: tab === t.id ? "#22c55e" : "rgba(255,255,255,0.5)",
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
          {!summary || summary.weakAreas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>&#127881;</div>
              <h3 style={{ fontWeight: 800, fontSize: 18, color: "#22c55e" }}>No Weak Areas!</h3>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 8 }}>
                All your topics are looking strong. Keep practicing to maintain your skills.
              </p>
            </div>
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
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  marginBottom: 16,
                  boxShadow: "0 4px 12px rgba(255,150,0,0.3)",
                }}
              >
                Start Targeted Session — {summary.weakAreas[0]?.topicName} (15 questions, Easy → Hard)
              </button>
              {summary.weakAreas.map((area) => (
                <WeakAreaCard key={area.topicKey} area={area} onPractice={handlePractice} />
              ))}
            </>
          )}

          {summary && summary.weakAreas.length > 0 && (
            <button
              onClick={handleGeneratePath}
              disabled={isGenerating}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "14px 0",
                borderRadius: 14,
                border: "none",
                background: isGenerating ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #1cb0f6, #58cc02)",
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                cursor: isGenerating ? "wait" : "pointer",
              }}
            >
              {isGenerating ? "Generating AI Path..." : "Generate AI Learning Path"}
            </button>
          )}
        </div>
      )}

      {tab === "learning-path" && learningPath && (
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
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 8 }}>
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
                  <div key={s.label} style={{ padding: "10px 4px", borderRadius: 10, background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {dueReviews.length > 0 ? (
                dueReviews.map((card) => <ReviewCard key={`${card.topicKey}::${card.conceptKey}`} card={card} />)
              ) : (
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 14, padding: 20 }}>
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
