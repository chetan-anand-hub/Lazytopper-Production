import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useVibeMode } from "../context/vibeModeContext";
import { topicHubV2Content } from "../data/topicHubV2Full";
import { useSmartLearning } from "../engine/smartLearningStore";
import type { ChapterMeta } from "../engine/smartLearningTypes";
import { getAttempts } from "../services/practiceInsights";
import { getStrategyPlan, updateAndGetStreak } from "../services/planStorage";
import { generateMultiTopicDailyMix } from "../services/dailyMixGenerator";
import type { DailyMixItem } from "../services/dailyMixPlayback";
import type { StrategyPlan } from "../services/strategyEngine";
import { normalizeTopicKey } from "../utils/topicResolver";
import {
  daysLeftFromIsoDate,
  fetchCbseExamDate,
} from "../services/cbseExamDate";
import { loadDashboardPrefs } from "../services/studentCloudStore";
import { buildBadgeContext, evaluateBadges, BADGE_DEFINITIONS } from "../services/badgeEngine";
import {
  masteryFromLegacyPercent,
  getChapterMasteryLevel,
  MASTERY_LABELS,
  MASTERY_COLORS,
  MASTERY_ICONS,
  MASTERY_POINTS,
  MASTERY_RING_FRACTION,
  type MasteryLevel,
} from "../services/masteryLevelService";
import {
  getGuidedJourneyState,
  initOrResumeGuidedChapter,
  advancePhase,
  clearDetour,
  getJourneyProgress,
  getPhaseLabel,
  getPhaseProgressText,
  getPhaseRoute,
  getRaviMessage,
  type GuidedJourneyState,
  type JourneyPhase,
} from "../services/guidedJourneyService";

type SubjectTitle = "Maths" | "Science";

type PerformanceRow = {
  chapterId: string;
  subject: SubjectTitle;
  topicKey: string;
  topicName: string;
  attempted: number;
  correct: number;
  accuracy: number;
  matchScore: number;
  lastPracticedAt?: string;
  tier: string;
};

type TopicMetaLight = {
  topicName?: string;
  subject?: string;
  weightagePercent?: number;
  approxWeightage?: number;
  tier?: string;
};

function toTopicMetaLight(value: unknown): TopicMetaLight {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const rec = value as Record<string, unknown>;
  return {
    topicName: typeof rec.topicName === "string" ? rec.topicName : undefined,
    subject: typeof rec.subject === "string" ? rec.subject : undefined,
    weightagePercent: typeof rec.weightagePercent === "number" ? rec.weightagePercent : undefined,
    approxWeightage: typeof rec.approxWeightage === "number" ? rec.approxWeightage : undefined,
    tier: typeof rec.tier === "string" ? rec.tier : undefined,
  };
}

function parseChapterId(chapterId: string): { grade: string; subject: SubjectTitle; topicKey: string } {
  const raw = String(chapterId || "");
  const match = raw.match(/^(\d+)-([^-]+)-(.+)$/);
  if (!match) return { grade: "10", subject: "Maths", topicKey: normalizeTopicKey(raw) || "topic" };
  return {
    grade: String(match[1] || "10"),
    subject: String(match[2] || "Maths").toLowerCase().includes("science") ? "Science" : "Maths",
    topicKey: normalizeTopicKey(String(match[3] || "")) || "topic",
  };
}

function displayTopic(topicKey: string): string {
  const rec = toTopicMetaLight((topicHubV2Content as Record<string, unknown>)[topicKey]);
  const topicName = String(rec.topicName || "").trim();
  if (topicName) return topicName;
  return String(topicKey || "topic")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function subjectMaxWeightage(subject: SubjectTitle): number {
  const values = Object.entries(topicHubV2Content)
    .map(([, rec]) => toTopicMetaLight(rec))
    .filter((rec) => String(rec.subject || "Maths") === subject)
    .map((rec) => Number(rec.weightagePercent ?? rec.approxWeightage ?? 0))
    .filter((v) => Number.isFinite(v) && v > 0);
  return values.length ? Math.max(...values) : 14;
}

function nowDayLabel(): string {
  try { return new Date().toLocaleDateString("en-US", { weekday: "long" }); } catch { return "Today"; }
}

function greetingLabel(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function toPositiveNumber(raw: string | number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function RingChart({ value, size = 48, strokeWidth = 3.5, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(value, 100) / 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

function ProgressBar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  return (
    <div style={{ width: "100%", height, borderRadius: height, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", borderRadius: height, background: color, transition: "width 0.6s ease" }} />
    </div>
  );
}

const DARK_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
  .db-root { min-height:100vh; background:#0a0a0a; color:#fff; font-family:'Inter',sans-serif; }
  .db-root .font-display { font-family:'Space Grotesk',sans-serif; }
  .db-root .glass-card { background:rgba(255,255,255,0.03); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.06); border-radius:16px; }
  .db-root .glass-accent { background:rgba(34,197,94,0.06); backdrop-filter:blur(16px); border:1px solid rgba(34,197,94,0.15); border-radius:16px; }
  .db-root .glass-blue { background:rgba(59,130,246,0.06); backdrop-filter:blur(16px); border:1px solid rgba(59,130,246,0.15); border-radius:16px; }
  .db-root .glass-warn { background:rgba(249,115,22,0.06); backdrop-filter:blur(16px); border:1px solid rgba(249,115,22,0.15); border-radius:16px; }
  .db-root * { box-sizing:border-box; }
  .db-root ::-webkit-scrollbar { height:4px; }
  .db-root ::-webkit-scrollbar-track { background:transparent; }
  .db-root ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
`;

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, strategy, loadingProfile } = useProfile();
  const navigate = useNavigate();
  const { mode } = useVibeMode();
  const { statsByChapter, getMatchScoreForChapter } = useSmartLearning();

  const [plannerSubject, setPlannerSubject] = useState<SubjectTitle>("Maths");
  const [examDate, setExamDate] = useState("");
  const [planRecord] = useState<StrategyPlan | null>(() => getStrategyPlan());
  const [streak] = useState<number>(() => updateAndGetStreak());
  const attempts = getAttempts();

  const subjectForQuickActions: SubjectTitle = planRecord?.subject === "Science" ? "Science" : plannerSubject;

  useEffect(() => {
    const uid = user?.uid;
    const studentClass = profile?.studentClass;
    if (!uid || !studentClass) return;
    let cancelled = false;
    void (async () => {
      const prefs = await loadDashboardPrefs(uid);
      if (cancelled) return;
      if (prefs?.plannerSubject) setPlannerSubject(prefs.plannerSubject);
      const dateResult = await fetchCbseExamDate(studentClass);
      if (cancelled) return;
      setExamDate(dateResult.examDate);
    })();
    return () => { cancelled = true; };
  }, [user?.uid, profile?.studentClass]);

  const dailyMixPreview = useMemo<DailyMixItem[]>(() => {
    const subject = planRecord?.subject === "Science" ? "Science" as const : plannerSubject;
    const d = new Date();
    const seedKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return generateMultiTopicDailyMix({ grade: 10, subject, seedKey, topicCount: 3, itemsPerTopic: 4, maxItems: 5, intensity: "normal" });
  }, [planRecord, plannerSubject]);

  const performanceRows = useMemo<PerformanceRow[]>(() => {
    const rows: PerformanceRow[] = [];
    const seen = new Set<string>();

    for (const [chapterId, stats] of Object.entries(statsByChapter || {})) {
      const parsed = parseChapterId(chapterId);
      const rec = toTopicMetaLight((topicHubV2Content as Record<string, unknown>)[parsed.topicKey]);
      const chapterMeta: ChapterMeta = {
        id: chapterId, grade: parsed.grade, subject: parsed.subject, topicKey: parsed.topicKey,
        name: displayTopic(parsed.topicKey),
        boardWeightage: Number(rec.weightagePercent ?? rec.approxWeightage ?? 0),
        tier: String(rec.tier || "high-roi") === "must-crack" ? "must-crack" : String(rec.tier || "high-roi") === "good-to-do" ? "good-to-do" : "high-roi",
      };
      const matchScore = getMatchScoreForChapter(chapterMeta, subjectMaxWeightage(parsed.subject));
      const attempted = Number(stats.totalQuestionsAttempted || 0);
      const correct = Number(stats.totalQuestionsCorrect || 0);
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
      rows.push({ chapterId, subject: parsed.subject, topicKey: parsed.topicKey, topicName: chapterMeta.name, attempted, correct, accuracy, matchScore, lastPracticedAt: stats.lastPracticedAt, tier: chapterMeta.tier });
      seen.add(`${parsed.subject}:${parsed.topicKey}`);
    }

    const attemptAgg = new Map<string, { attempted: number; correct: number; ts: number }>();
    for (const a of attempts) {
      const subject = String(a.subject || "maths").toLowerCase().includes("science") ? "Science" : "Maths";
      const topicKey = normalizeTopicKey(String(a.topicKey || a.topicName || "")) || "topic";
      const key = `${subject}:${topicKey}`;
      const prev = attemptAgg.get(key) || { attempted: 0, correct: 0, ts: 0 };
      prev.attempted += 1;
      if (a.correct) prev.correct += 1;
      prev.ts = Math.max(prev.ts, Number(a.timestamp || 0));
      attemptAgg.set(key, prev);
    }

    for (const [key, agg] of attemptAgg.entries()) {
      if (seen.has(key)) continue;
      const [subjectRaw, topicKey] = key.split(":");
      const subject = subjectRaw === "Science" ? "Science" : "Maths";
      const chapterId = `10-${subject}-${topicKey}`;
      const rec = toTopicMetaLight((topicHubV2Content as Record<string, unknown>)[topicKey]);
      const chapterMeta: ChapterMeta = {
        id: chapterId, grade: "10", subject, topicKey,
        name: displayTopic(topicKey),
        boardWeightage: Number(rec.weightagePercent ?? rec.approxWeightage ?? 0),
        tier: String(rec.tier || "high-roi") === "must-crack" ? "must-crack" : String(rec.tier || "high-roi") === "good-to-do" ? "good-to-do" : "high-roi",
      };
      const matchScore = getMatchScoreForChapter(chapterMeta, subjectMaxWeightage(subject));
      const accuracy = agg.attempted > 0 ? Math.round((agg.correct / agg.attempted) * 100) : 0;
      rows.push({ chapterId, subject, topicKey, topicName: chapterMeta.name, attempted: agg.attempted, correct: agg.correct, accuracy, matchScore, lastPracticedAt: agg.ts > 0 ? new Date(agg.ts).toISOString() : undefined, tier: chapterMeta.tier });
    }

    rows.sort((a, b) => { const byMatch = b.matchScore - a.matchScore; return byMatch !== 0 ? byMatch : b.attempted - a.attempted; });
    return rows.slice(0, 20);
  }, [statsByChapter, attempts, getMatchScoreForChapter]);

  const weakAreas = useMemo(() => {
    return performanceRows.filter(r => r.attempted >= 2 && r.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);
  }, [performanceRows]);

  const studentClass = profile?.studentClass || "";
  const gradeNum = String((studentClass || "").replace(/\D/g, "")) || "10";
  const dailyMixMinutes = mode === "zombie" ? 20 : 40;

  const dailyMixDoneToday = useMemo(() => {
    try {
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const raw = localStorage.getItem(`lazytopper.dailyMix.v1.${subjectForQuickActions}`);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed?.date === todayStr && parsed?.completed === true;
    } catch { return false; }
  }, [subjectForQuickActions]);

  const incompleteSession = useMemo<{ kind: string; subject: string; cursor: number; total: number } | null>(() => {
    try {
      for (const subj of ["Maths", "Science"] as const) {
        const raw = localStorage.getItem(`lazytopper.dailyMix.v1.${subj}`);
        if (!raw) continue;
        const saved = JSON.parse(raw) as { date?: string; items?: unknown[]; questionStates?: { submitted?: boolean }[]; completed?: boolean };
        if (!saved || saved.completed) continue;
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (saved.date !== todayStr) continue;
        const items = Array.isArray(saved.items) ? saved.items : [];
        const states = Array.isArray(saved.questionStates) ? saved.questionStates : [];
        const answered = states.filter((s) => s?.submitted).length;
        if (answered > 0 && answered < items.length) return { kind: "daily_mix", subject: subj, cursor: answered, total: items.length };
      }
    } catch {}
    return null;
  }, []);

  type HeroAction = { type: string; title: string; description: string; ctaLabel: string; onAction: () => void };
  const heroAction = useMemo<HeroAction>(() => {
    if (incompleteSession) {
      const kindLabel = incompleteSession.kind === "daily_mix" ? "Daily Mix" : "Study Session";
      return { type: "resume_session", title: `Continue Your ${kindLabel}`, description: `You have an incomplete ${kindLabel} (${incompleteSession.cursor}/${incompleteSession.total} done). Pick up where you left off!`, ctaLabel: `Resume ${kindLabel}`, onAction: () => navigate(`/daily-mix/${gradeNum}/${incompleteSession.subject}`) };
    }
    if (!dailyMixDoneToday) {
      return { type: "daily_mix", title: `Your ${nowDayLabel()} Mix`, description: `${dailyMixPreview.filter(i => i.type === "question").length} questions + concept + revision. Complete to keep your streak!`, ctaLabel: `Start Daily Mix — ${dailyMixMinutes} min`, onAction: () => navigate(`/daily-mix/${gradeNum}/${subjectForQuickActions}`) };
    }
    const weakRow = performanceRows.find(r => r.attempted >= 2 && r.accuracy < 50);
    if (weakRow) {
      return { type: "weak_topic", title: `Focus: ${weakRow.topicName}`, description: `Your accuracy on ${weakRow.topicName} is ${weakRow.accuracy}%. Practice to improve.`, ctaLabel: `Practice ${weakRow.topicName}`, onAction: () => navigate(`/practice/${gradeNum}/${weakRow.subject}?topic=${encodeURIComponent(weakRow.topicKey)}`) };
    }
    return { type: "daily_mix", title: "Start Your Study Session", description: "Begin with today's Daily Mix to build consistency.", ctaLabel: "Start Daily Mix", onAction: () => navigate(`/daily-mix/${gradeNum}/${subjectForQuickActions}`) };
  }, [incompleteSession, dailyMixDoneToday, dailyMixMinutes, dailyMixPreview, performanceRows, gradeNum, subjectForQuickActions, navigate]);

  const [journeyState, setJourneyState] = useState<GuidedJourneyState>(() => {
    const raw = getGuidedJourneyState(user?.uid);
    return raw.currentChapter ? raw : initOrResumeGuidedChapter(user?.uid);
  });

  useEffect(() => {
    const raw = getGuidedJourneyState(user?.uid);
    setJourneyState(raw.currentChapter ? raw : initOrResumeGuidedChapter(user?.uid));
  }, [user?.uid]);

  const journeyProgress = useMemo(() => getJourneyProgress(user?.uid), [user?.uid, journeyState]);
  const raviMessage = useMemo(() => getRaviMessage(journeyState), [journeyState]);

  const handleContinueJourney = useCallback(() => {
    if (!journeyState.currentChapter) return;
    if (journeyState.detour) {
      clearDetour(user?.uid);
      setJourneyState(getGuidedJourneyState(user?.uid));
    }
    navigate(getPhaseRoute(journeyState.currentChapter, gradeNum));
  }, [journeyState, user?.uid, gradeNum, navigate]);

  const handleCompleteChapter = useCallback(() => {
    const next = advancePhase("review", user?.uid);
    setJourneyState(next);
  }, [user?.uid]);

  const totalAttempted = performanceRows.reduce((s, r) => s + r.attempted, 0);
  const avgAccuracy = performanceRows.length > 0 ? Math.round(performanceRows.reduce((s, r) => s + r.accuracy, 0) / performanceRows.length) : 0;
  const topicsStarted = performanceRows.length;
  const getRowMasteryLevel = (r: PerformanceRow): MasteryLevel => {
    const canonical = getChapterMasteryLevel(`${gradeNum}-${r.subject}-${r.topicKey}`);
    return canonical !== "not_started" ? canonical : masteryFromLegacyPercent(r.accuracy);
  };
  const topicsMastered = performanceRows.filter(r => {
    const level = getRowMasteryLevel(r);
    return level === "mastered" || level === "proficient";
  }).length;
  const persistedXp = (() => { try { return Number(localStorage.getItem("lazytopper.xp") || 0); } catch { return 0; } })();
  const xpEstimate = Math.max(persistedXp, totalAttempted * 10 + streak * 25 + topicsMastered * 50);

  const mathsMastery = performanceRows.filter(r => r.subject === "Maths");
  const scienceMastery = performanceRows.filter(r => r.subject === "Science");

  const recentActivity = useMemo(() => {
    const items: { action: string; subject: string; time: string; icon: string }[] = [];
    const sorted = [...attempts].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, 5);
    for (const a of sorted) {
      const topic = displayTopic(normalizeTopicKey(String(a.topicKey || a.topicName || "")) || "topic");
      const subj = String(a.subject || "Maths");
      const ts = Number(a.timestamp || 0);
      const ago = ts > 0 ? formatTimeAgo(ts) : "";
      items.push({ action: `Practiced ${topic}`, subject: subj, time: ago, icon: a.correct ? "✅" : "📝" });
    }
    return items;
  }, [attempts]);

  const badges = useMemo(() => {
    try {
      const ctx = buildBadgeContext();
      const earned = evaluateBadges(ctx, []);
      const defMap = new Map<string, { name: string; icon: string }>();
      for (const def of BADGE_DEFINITIONS) defMap.set(def.id, { name: def.name, icon: def.icon });
      return earned.map(b => {
        const def = defMap.get(b.id);
        return { name: def?.name || b.id, icon: def?.icon || "🏆", unlocked: true };
      });
    } catch { return []; }
  }, []);

  const autoDays = examDate ? Math.max(1, daysLeftFromIsoDate(examDate)) : profile?.daysLeft || 90;
  const targetPercentValue = toPositiveNumber(profile?.targetPercent || 0);
  const hoursPerDayValue = toPositiveNumber(profile?.hoursPerDay || 0);
  const daysLeftValue = toPositiveNumber(autoDays || profile?.daysLeft || 0);

  if (loadingProfile) {
    return (
      <div className="db-root">
        <style dangerouslySetInnerHTML={{ __html: DARK_STYLES }} />
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <p className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile || !strategy) {
    return (
      <div className="db-root">
        <style dangerouslySetInnerHTML={{ __html: DARK_STYLES }} />
        <div style={{ padding: "20px 16px 100px", maxWidth: 430, margin: "0 auto" }}>

          {journeyState.currentChapter && (
            <div style={{ padding: 20, marginBottom: 16, background: "rgba(34,197,94,0.06)", backdropFilter: "blur(16px)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "linear-gradient(135deg, #22c55e, #3b82f6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: "#000", flexShrink: 0,
                }}>R</div>
                <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>Ravi Sir's Recommendation</span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 12 }}>
                "{raviMessage}"
              </p>
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{journeyState.currentChapter.title}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
                {(["learn", "practice", "mock", "review"] as JourneyPhase[]).map((p) => {
                  const isCurrent = journeyState.currentChapter!.phase === p;
                  const phaseIdx = ["learn", "practice", "mock", "review"].indexOf(p);
                  const currentIdx = ["learn", "practice", "mock", "review"].indexOf(journeyState.currentChapter!.phase);
                  const isDone = phaseIdx < currentIdx;
                  return (
                    <span key={p} style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                      background: isCurrent ? "rgba(34,197,94,0.2)" : isDone ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
                      color: isCurrent ? "#22c55e" : isDone ? "rgba(34,197,94,0.6)" : "rgba(255,255,255,0.3)",
                      border: isCurrent ? "1px solid rgba(34,197,94,0.4)" : "1px solid transparent",
                      textTransform: "uppercase", letterSpacing: 0.5,
                    }}>{isDone ? "✓ " : ""}{getPhaseLabel(p)}</span>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 600 }}>
                {getPhaseProgressText(journeyState.currentChapter!)}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ width: `${journeyProgress.percent}%`, height: "100%", borderRadius: 2, background: "#22c55e", transition: "width 0.6s ease" }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
                  {journeyProgress.completed} of {journeyProgress.total} chapters
                </span>
              </div>
              {journeyState.currentChapter?.phase === "review" ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleContinueJourney} style={{
                    flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid rgba(34,197,94,0.3)",
                    background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 800, fontSize: 14,
                    fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
                  }}>Open Review</button>
                  <button onClick={handleCompleteChapter} style={{
                    flex: 1, padding: "13px 0", borderRadius: 12, border: "none",
                    background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 14,
                    fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
                    boxShadow: "0 0 24px rgba(34,197,94,0.3)",
                  }}>Complete Chapter ✓</button>
                </div>
              ) : (
                <button onClick={handleContinueJourney} style={{
                  width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                  background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 15,
                  fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
                  boxShadow: "0 0 24px rgba(34,197,94,0.3)",
                }}>{journeyState.detour ? "Resume Learning" : "Continue Learning"}</button>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
            {[
              { label: "Practice", icon: "✏️", path: `/practice/${gradeNum}/${subjectForQuickActions}` },
              { label: "Mock Tests", icon: "📝", path: "/predictive-papers" },
              { label: "Predicted Q's", icon: "🎯", path: `/highly-probable/${gradeNum}/${subjectForQuickActions}` },
              { label: "Daily Mix", icon: "🔥", path: `/daily-mix/${gradeNum}/${subjectForQuickActions}` },
              { label: "All Chapters", icon: "📚", path: `/topic-hub/${gradeNum}/${subjectForQuickActions}` },
            ].map((a) => (
              <button key={a.label} onClick={() => navigate(a.path)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 10, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Inter', sans-serif", flexShrink: 0, minWidth: 72,
              }}>
                <span style={{ fontSize: 18 }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>

          <div className="glass-card" style={{ padding: 20, textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Personalise your study plan</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.6 }}>
              Set your target score, study time, and exam date for a smarter experience.
            </p>
            <button onClick={() => navigate("/onboarding")} style={{
              width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
              background: "rgba(59,130,246,0.15)", color: "#3b82f6", fontWeight: 700, fontSize: 14,
              fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            }}>Set Up My Study Plan</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="db-root">
      <style dangerouslySetInnerHTML={{ __html: DARK_STYLES }} />
      <div style={{ padding: "16px 16px 100px", maxWidth: 430, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg, #22c55e, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800, color: "#000",
            }}>{(user?.displayName || user?.email || "S").charAt(0).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>{greetingLabel()}</div>
              <div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>{user?.displayName || "Student"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)" }}>
              <span style={{ fontSize: 14 }}>🔥</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#fb923c" }}>{streak}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)" }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#c084fc" }}>{xpEstimate.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* RAVI SIR'S RECOMMENDATION */}
        {journeyState.currentChapter && (
          <div style={{ padding: 20, marginBottom: 16, background: "rgba(34,197,94,0.06)", backdropFilter: "blur(16px)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg, #22c55e, #3b82f6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, color: "#000", flexShrink: 0,
              }}>R</div>
              <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>Ravi Sir's Recommendation</span>
            </div>

            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 12, fontStyle: journeyState.detour ? "italic" : "normal" }}>
              "{raviMessage}"
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div className="font-display" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{journeyState.currentChapter.title}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(["learn", "practice", "mock", "review"] as JourneyPhase[]).map((p) => {
                    const isCurrent = journeyState.currentChapter!.phase === p;
                    const phaseIdx = ["learn", "practice", "mock", "review"].indexOf(p);
                    const currentIdx = ["learn", "practice", "mock", "review"].indexOf(journeyState.currentChapter!.phase);
                    const isDone = phaseIdx < currentIdx;
                    return (
                      <span key={p} style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                        background: isCurrent ? "rgba(34,197,94,0.2)" : isDone ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
                        color: isCurrent ? "#22c55e" : isDone ? "rgba(34,197,94,0.6)" : "rgba(255,255,255,0.3)",
                        border: isCurrent ? "1px solid rgba(34,197,94,0.4)" : "1px solid transparent",
                        textTransform: "uppercase", letterSpacing: 0.5,
                      }}>{isDone ? "✓ " : ""}{getPhaseLabel(p)}</span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 600 }}>
              {getPhaseProgressText(journeyState.currentChapter!)}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ width: `${journeyProgress.percent}%`, height: "100%", borderRadius: 2, background: "#22c55e", transition: "width 0.6s ease" }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
                {journeyProgress.completed} of {journeyProgress.total} chapters
              </span>
            </div>

            {journeyState.currentChapter?.phase === "review" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleContinueJourney} style={{
                  flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid rgba(34,197,94,0.3)",
                  background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 800, fontSize: 14,
                  fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
                }}>Open Review</button>
                <button onClick={handleCompleteChapter} style={{
                  flex: 1, padding: "13px 0", borderRadius: 12, border: "none",
                  background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 14,
                  fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
                  boxShadow: "0 0 24px rgba(34,197,94,0.3)",
                }}>Complete Chapter ✓</button>
              </div>
            ) : (
              <button onClick={handleContinueJourney} style={{
                width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 15,
                fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
                boxShadow: "0 0 24px rgba(34,197,94,0.3)",
              }}>{journeyState.detour ? "Resume Learning" : "Continue Learning"}</button>
            )}
          </div>
        )}

        {/* QUICK ACCESS */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
          {[
            { label: "Practice", icon: "✏️", path: `/practice/${gradeNum}/${subjectForQuickActions}` },
            { label: "Mock Tests", icon: "📝", path: "/predictive-papers" },
            { label: "Predicted Q's", icon: "🎯", path: `/highly-probable/${gradeNum}/${subjectForQuickActions}` },
            { label: "Daily Mix", icon: "🔥", path: `/daily-mix/${gradeNum}/${subjectForQuickActions}` },
            { label: "All Chapters", icon: "📚", path: `/topic-hub/${gradeNum}/${subjectForQuickActions}` },
          ].map((a) => (
            <button key={a.label} onClick={() => navigate(a.path)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 10, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Inter', sans-serif", flexShrink: 0, minWidth: 72,
            }}>
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>

        {/* HERO ACTION */}
        <div className="glass-accent" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>{heroAction.type === "resume_session" ? "⏩" : heroAction.type === "weak_topic" ? "⚠️" : "🎯"}</span>
            <span className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>{heroAction.title}</span>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, marginBottom: 14 }}>{heroAction.description}</p>
          <button onClick={heroAction.onAction} style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 15,
            fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            boxShadow: "0 0 24px rgba(34,197,94,0.3)",
          }}>{heroAction.ctaLabel}</button>
        </div>

        {/* STATS ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Streak", value: `${streak}d`, icon: "🔥", color: "#fb923c" },
            { label: "XP", value: xpEstimate.toLocaleString(), icon: "⚡", color: "#c084fc" },
            { label: "Accuracy", value: `${avgAccuracy}%`, color: "#3b82f6", ring: true, ringVal: avgAccuracy },
            { label: "Mastered", value: `${topicsMastered}/${topicsStarted}`, color: "#22c55e", ring: true, ringVal: topicsStarted > 0 ? (topicsMastered / topicsStarted) * 100 : 0 },
          ].map((s, i) => (
            <div key={i} className="glass-card" style={{ padding: "12px 8px", textAlign: "center" }}>
              {s.ring ? (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                  <div style={{ position: "relative", width: 40, height: 40 }}>
                    <RingChart value={s.ringVal || 0} size={40} strokeWidth={3} color={s.color} />
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: s.color }}>{s.value}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                </>
              )}
              <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.8 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* DAILY MIX PREVIEW */}
        {dailyMixPreview.length > 0 && (
          <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Today's Mix</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{dailyMixPreview.length} items · ~{dailyMixMinutes} min</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dailyMixPreview.map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
                  <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{item.type === "question" ? "✏️" : item.type === "video" ? "🎬" : "📖"}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)", flex: 1 }}>{item.title}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "2px 6px", borderRadius: 4,
                    background: item.type === "question" ? "rgba(59,130,246,0.12)" : "rgba(34,197,94,0.12)",
                    color: item.type === "question" ? "#60a5fa" : "#4ade80",
                  }}>{item.type}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate(`/daily-mix/${gradeNum}/${subjectForQuickActions}`)} style={{
              width: "100%", padding: "12px 0", borderRadius: 10, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)",
              color: "#60a5fa", fontWeight: 700, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", marginTop: 10,
            }}>Play Daily Mix</button>
          </div>
        )}

        {/* WEAK AREAS */}
        {weakAreas.length > 0 && (
          <div className="glass-warn" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Weak Areas</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {weakAreas.map((w) => (
                <div key={w.topicKey}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{w.topicName}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>{w.subject}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: w.accuracy < 50 ? "#ef4444" : "#fb923c" }}>{w.accuracy}%</span>
                      <button onClick={() => navigate(`/practice/${gradeNum}/${w.subject}?topic=${encodeURIComponent(w.topicKey)}`)} style={{
                        fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
                        background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)",
                        color: "#fb923c", cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.5,
                      }}>Practice</button>
                    </div>
                  </div>
                  <ProgressBar value={w.accuracy} color={w.accuracy < 50 ? "#ef4444" : "#fb923c"} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOPIC MASTERY */}
        {performanceRows.length > 0 && (
          <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
            <span className="font-display" style={{ fontSize: 14, fontWeight: 700, display: "block", marginBottom: 14 }}>Topic Mastery</span>

            {mathsMastery.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Maths</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: scienceMastery.length > 0 ? 16 : 0 }}>
                  {mathsMastery.map((t) => {
                    const level = getRowMasteryLevel(t);
                    return (
                      <div key={t.topicKey} style={{ textAlign: "center", cursor: "pointer" }} onClick={() => navigate(`/topic-hub/${gradeNum}/Maths/${encodeURIComponent(t.topicKey)}`)}>
                        <div style={{ position: "relative", width: 48, height: 48, margin: "0 auto 4px" }}>
                          <svg width={48} height={48} style={{ display: "block" }}>
                            <circle cx={24} cy={24} r={20} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
                            <circle cx={24} cy={24} r={20} fill="none" stroke={MASTERY_COLORS[level]} strokeWidth={4}
                              strokeDasharray={`${MASTERY_RING_FRACTION[level] * 2 * Math.PI * 20} ${(1 - MASTERY_RING_FRACTION[level]) * 2 * Math.PI * 20}`}
                              strokeDashoffset={2 * Math.PI * 20 / 4} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.5s ease" }} />
                            <text x={24} y={28} textAnchor="middle" fontSize={16} fill={MASTERY_COLORS[level]}>{MASTERY_ICONS[level]}</text>
                          </svg>
                        </div>
                        <div style={{ fontSize: 8, fontWeight: 700, color: MASTERY_COLORS[level], marginBottom: 1 }}>{MASTERY_LABELS[level]}</div>
                        <div style={{ fontSize: 7, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>{MASTERY_POINTS[level]}pts</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.5)", lineHeight: 1.2 }}>{t.topicName.length > 14 ? t.topicName.slice(0, 12) + "…" : t.topicName}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {scienceMastery.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Science</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {scienceMastery.map((t) => {
                    const level = getRowMasteryLevel(t);
                    return (
                      <div key={t.topicKey} style={{ textAlign: "center", cursor: "pointer" }} onClick={() => navigate(`/topic-hub/${gradeNum}/Science/${encodeURIComponent(t.topicKey)}`)}>
                        <div style={{ position: "relative", width: 48, height: 48, margin: "0 auto 4px" }}>
                          <svg width={48} height={48} style={{ display: "block" }}>
                            <circle cx={24} cy={24} r={20} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
                            <circle cx={24} cy={24} r={20} fill="none" stroke={MASTERY_COLORS[level]} strokeWidth={4}
                              strokeDasharray={`${MASTERY_RING_FRACTION[level] * 2 * Math.PI * 20} ${(1 - MASTERY_RING_FRACTION[level]) * 2 * Math.PI * 20}`}
                              strokeDashoffset={2 * Math.PI * 20 / 4} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.5s ease" }} />
                            <text x={24} y={28} textAnchor="middle" fontSize={16} fill={MASTERY_COLORS[level]}>{MASTERY_ICONS[level]}</text>
                          </svg>
                        </div>
                        <div style={{ fontSize: 8, fontWeight: 700, color: MASTERY_COLORS[level], marginBottom: 1 }}>{MASTERY_LABELS[level]}</div>
                        <div style={{ fontSize: 7, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>{MASTERY_POINTS[level]}pts</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.5)", lineHeight: 1.2 }}>{t.topicName.length > 14 ? t.topicName.slice(0, 12) + "…" : t.topicName}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* STUDY PLAN SUMMARY */}
        <div className="glass-blue" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <span className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Study Plan</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Target", value: `${targetPercentValue || "—"}%`, color: "#3b82f6" },
              { label: "Hours/day", value: `${hoursPerDayValue || "—"}h`, color: "#22c55e" },
              { label: "Days left", value: `${daysLeftValue || "—"}`, color: "#fb923c" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 10, background: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {strategy && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Realistic Score Range</div>
              <div className="font-display" style={{ fontSize: 20, fontWeight: 800 }}>
                <span style={{ color: "#3b82f6" }}>{strategy.realisticMin}%</span>
                <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 6px" }}>—</span>
                <span style={{ color: "#22c55e" }}>{strategy.realisticMax}%</span>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                {strategy.effortStatus === "high" ? "Strong effort — you can exceed your target." : strategy.effortStatus === "ok" ? "Plan is realistic with regular study." : "Increase hours or adjust target."}
              </div>
            </div>
          )}
        </div>

        {/* RECENT ACTIVITY */}
        {recentActivity.length > 0 && (
          <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
            <span className="font-display" style={{ fontSize: 14, fontWeight: 700, display: "block", marginBottom: 12 }}>Recent Activity</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentActivity.map((a, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                  borderBottom: i < recentActivity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", fontSize: 14, flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{a.action}</div>
                    {a.subject && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{a.subject}</div>}
                  </div>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BADGES */}
        {badges.length > 0 && (
          <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
            <span className="font-display" style={{ fontSize: 14, fontWeight: 700, display: "block", marginBottom: 12 }}>Badges & Achievements</span>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
              {badges.map((b, i) => (
                <div key={i} style={{ flexShrink: 0, width: 64, textAlign: "center", opacity: b.unlocked ? 1 : 0.3 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, margin: "0 auto 4px",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                    background: b.unlocked ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
                    border: b.unlocked ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(255,255,255,0.06)",
                  }}>{b.unlocked ? b.icon : "🔒"}</div>
                  <div style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.5)", lineHeight: 1.2 }}>{b.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPLORE MORE */}
        <div className="glass-card" style={{ padding: 16, marginBottom: 0 }}>
          <span className="font-display" style={{ fontSize: 14, fontWeight: 700, display: "block", marginBottom: 12 }}>Explore More</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Trends", icon: "📈", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", path: `/trends/${gradeNum}/${subjectForQuickActions}` },
              { label: "Chapter Hub", icon: "📚", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", path: `/topic-hub/${gradeNum}/${subjectForQuickActions}` },
              { label: "Mock Test", icon: "📝", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.2)", path: "/predictive-papers" },
              { label: "Weekly Wrapped", icon: "📊", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)", path: "/weekly-wrapped" },
            ].map((a) => (
              <button key={a.label} onClick={() => navigate(a.path)} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 12px", borderRadius: 12, border: `1px solid ${a.border}`,
                background: a.bg, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}>
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function formatTimeAgo(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}
