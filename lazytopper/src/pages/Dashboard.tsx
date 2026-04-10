import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useVibeMode } from "../context/vibeModeContext";
import { topicHubV2Content } from "../data/topicHubV2Full";
import { useSmartLearning } from "../engine/smartLearningStore";
import type { ChapterMeta } from "../engine/smartLearningTypes";
import { getAttempts } from "../services/practiceInsights";
import { getStrategyPlan, updateAndGetStreak, wasStreakReset, dismissStreakReset } from "../services/planStorage";
import { ConfettiCelebration } from "../components/celebrations";
import { STREAK_BADGES } from "../services/streakService";
import { generateMultiTopicDailyMix } from "../services/dailyMixGenerator";
import type { DailyMixItem } from "../services/dailyMixPlayback";
import type { StrategyPlan } from "../services/strategyEngine";
import { normalizeTopicKey } from "../utils/topicResolver";
import {
  daysLeftFromIsoDate,
  fetchCbseExamDate,
} from "../services/cbseExamDate";
import { loadDashboardPrefs } from "../services/studentCloudStore";
import { isFocusTrackingEnabled } from "../services/focusTracker";
import { buildBadgeContext, evaluateBadges, BADGE_DEFINITIONS } from "../services/badgeEngine";
import {
  masteryFromLegacyPercent,
  getChapterMasteryLevel,
  type MasteryLevel,
} from "../services/masteryLevelService";
import {
  getGuidedJourneyState,
  initOrResumeGuidedChapter,
  advancePhase,
  clearDetour,
  getJourneyProgress,
  getPhaseRoute,
  getRaviMessage,
  type GuidedJourneyState,
  reconcileProfileTransition,
} from "../services/guidedJourneyService";
import {
  isMissionCompletedToday,
  getMissionResumeInfo,
} from "../services/dailyMissionService";
import { getSRStats, checkMasteryDemotions } from "../services/spacedRepetitionEngine";
import {
  checkAndUpdateProfile,
  loadPaceProfile,
  loadTransitionNotification,
  dismissTransitionNotification,
  getProfileConfig,
  getProfileSummary,
  type PaceTransitionNotification,
} from "../services/paceProfileService";
import { getLatestMockScores } from "../services/mockScoreHistory";
import ShareProgressPrompt from "../components/ShareProgressPrompt";
import { useTheme } from "../context/ThemeContext";
import {
  type SubjectTitle,
  type PerformanceRow,
  toTopicMetaLight,
  parseChapterId,
  displayTopic,
  subjectMaxWeightage,
  nowDayLabel,
  toPositiveNumber,
  formatTimeAgo,
  isWidgetUnseen,
  markWidgetSeen,
  isFirstDashboardVisit,
  markFirstVisitDone,
  useThemeColors,
  THEME_STYLES,
  FocusScoreCard,
  SprintDashboard,
  EmptyStateCard,
  FirstVisitOverlay,
  DashboardHeader,
  QuickAccessBar,
  StatsRow,
  DailyMixPreview,
  TopicMasteryGrid,
  StudyPlanSummary,
  WeakAreasPanel,
  RecentActivityList,
  BadgesSection,
  ExploreMorePanel,
  JourneyCard,
  PaceSelectorPanel,
  HeroActionCard,
} from "../components/dashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, strategy, loadingProfile } = useProfile();
  const navigate = useNavigate();
  const { mode } = useVibeMode();
  const { statsByChapter, getMatchScoreForChapter } = useSmartLearning();
  const { theme } = useTheme();
  const tc = useThemeColors();

  const [plannerSubject, setPlannerSubject] = useState<SubjectTitle>("Maths");
  const [examDate, setExamDate] = useState("");
  const [planRecord] = useState<StrategyPlan | null>(() => getStrategyPlan());
  const [streak] = useState<number>(() => updateAndGetStreak());
  const [showStreakReset, setShowStreakReset] = useState(() => wasStreakReset());
  const [streakMilestone, setStreakMilestone] = useState<typeof STREAK_BADGES[number] | null>(null);

  useEffect(() => {
    const SEEN_KEY = "lazytopper.streak_milestone_seen";
    const milestones = [3, 7, 14, 30, 60];
    if (milestones.includes(streak)) {
      try {
        const seen = Number(localStorage.getItem(SEEN_KEY) || 0);
        if (seen < streak) {
          const badge = STREAK_BADGES.find(b => b.requiredDays === streak);
          if (badge) {
            setStreakMilestone(badge);
            localStorage.setItem(SEEN_KEY, String(streak));
          }
        }
      } catch {}
    }
  }, [streak]);
  const attempts = getAttempts();
  const [paceProfile, setPaceProfile] = useState(() => loadPaceProfile());
  const [paceTransition, setPaceTransition] = useState<PaceTransitionNotification | null>(() => {
    const n = loadTransitionNotification();
    return n && !n.dismissed ? n : null;
  });
  const [showPaceSelector, setShowPaceSelector] = useState(false);
  const [srStats, setSrStats] = useState(() => getSRStats());
  useEffect(() => {
    checkMasteryDemotions();
    setSrStats(getSRStats());
  }, []);

  const [showFirstVisit, setShowFirstVisit] = useState(() => isFirstDashboardVisit());
  const handleDismissOverlay = () => {
    markFirstVisitDone();
    setShowFirstVisit(false);
  };

  const [newBadges, setNewBadges] = useState<Record<string, boolean>>(() => ({
    topicMastery: isWidgetUnseen("topicMastery"),
    recentActivity: isWidgetUnseen("recentActivity"),
    badges: isWidgetUnseen("badges"),
  }));

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
      const effectiveDate = profile?.examDate || dateResult.examDate;
      setExamDate(effectiveDate);
      const daysLeft = Math.max(1, daysLeftFromIsoDate(effectiveDate));
      const result = checkAndUpdateProfile(daysLeft);
      setPaceProfile(result.profile);
      if (result.transition && !result.transition.dismissed) {
        setPaceTransition(result.transition);
        reconcileProfileTransition(uid);
      }
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

  const missionDoneToday = useMemo(() => isMissionCompletedToday(subjectForQuickActions), [subjectForQuickActions]);

  const missionResumeInfo = useMemo(() => {
    for (const subj of ["Maths", "Science"] as const) {
      const info = getMissionResumeInfo(subj);
      if (info) return { ...info, subject: subj };
    }
    return null;
  }, []);

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

  const isWeekend = useMemo(() => { const d = new Date().getDay(); return d === 0 || d === 6; }, []);

  type HeroAction = { type: string; title: string; description: string; ctaLabel: string; onAction: () => void };
  const heroAction = useMemo<HeroAction>(() => {
    if (missionResumeInfo) {
      return {
        type: "resume_mission",
        title: "Resume Your Mission",
        description: `You have an incomplete mission (${missionResumeInfo.completedSegments}/${missionResumeInfo.totalSegments} segments done). Pick up where you left off!`,
        ctaLabel: `Resume Mission (${missionResumeInfo.remainingMinutes} min left)`,
        onAction: () => navigate(`/daily-mission/${gradeNum}/${missionResumeInfo.subject}`, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } }),
      };
    }
    if (!missionDoneToday) {
      const missionMinutes = isWeekend ? 60 : 30;
      return {
        type: "daily_mission",
        title: isWeekend ? `Weekend Mission` : `${nowDayLabel()} Mission`,
        description: isWeekend
          ? "Extended session: revision + concept + practice + exam + mock test + weak area drill. Build mastery!"
          : "4 segments: revision, concept, practice, exam. Complete all to maintain your streak!",
        ctaLabel: `Start ${isWeekend ? "Weekend" : "Daily"} Mission — ${missionMinutes} min`,
        onAction: () => navigate(`/daily-mission/${gradeNum}/${subjectForQuickActions}`, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } }),
      };
    }
    if (incompleteSession) {
      const kindLabel = incompleteSession.kind === "daily_mix" ? "Daily Mix" : "Study Session";
      return { type: "resume_session", title: `Continue Your ${kindLabel}`, description: `You have an incomplete ${kindLabel} (${incompleteSession.cursor}/${incompleteSession.total} done). Pick up where you left off!`, ctaLabel: `Resume ${kindLabel}`, onAction: () => navigate(`/daily-mix/${gradeNum}/${incompleteSession.subject}`, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } }) };
    }
    if (!dailyMixDoneToday) {
      return { type: "daily_mix", title: `Extra Practice`, description: `${dailyMixPreview.filter(i => i.type === "question").length} questions + concept + revision. Keep building momentum!`, ctaLabel: `Start Daily Mix — ${dailyMixMinutes} min`, onAction: () => navigate(`/daily-mix/${gradeNum}/${subjectForQuickActions}`, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } }) };
    }
    const weakRow = performanceRows.find(r => r.attempted >= 2 && r.accuracy < 50);
    if (weakRow) {
      return { type: "weak_topic", title: `Focus: ${weakRow.topicName}`, description: `Your accuracy on ${weakRow.topicName} is ${weakRow.accuracy}%. Practice to improve.`, ctaLabel: `Practice ${weakRow.topicName}`, onAction: () => navigate(`/practice/${gradeNum}/${weakRow.subject}?topic=${encodeURIComponent(weakRow.topicKey)}`, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } }) };
    }
    return { type: "daily_mission", title: "All done for today!", description: "Great work! Come back tomorrow for your next mission.", ctaLabel: "Start Extra Practice", onAction: () => navigate(`/daily-mix/${gradeNum}/${subjectForQuickActions}`, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } }) };
  }, [missionResumeInfo, missionDoneToday, isWeekend, incompleteSession, dailyMixDoneToday, dailyMixMinutes, dailyMixPreview, performanceRows, gradeNum, subjectForQuickActions, navigate]);

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
    navigate(getPhaseRoute(journeyState.currentChapter, gradeNum), { state: { back: "/dashboard", backLabel: "Back to Dashboard" } });
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

  const showTopicMastery = totalAttempted >= 10 && performanceRows.length > 0;
  const showRecentActivity = recentActivity.length > 0;
  const showBadges = badges.length > 0;

  useEffect(() => {
    if (showTopicMastery && newBadges.topicMastery) {
      markWidgetSeen("topicMastery");
      const t = setTimeout(() => setNewBadges(prev => ({ ...prev, topicMastery: false })), 5000);
      return () => clearTimeout(t);
    }
  }, [showTopicMastery, newBadges.topicMastery]);

  useEffect(() => {
    if (showRecentActivity && newBadges.recentActivity) {
      markWidgetSeen("recentActivity");
      const t = setTimeout(() => setNewBadges(prev => ({ ...prev, recentActivity: false })), 5000);
      return () => clearTimeout(t);
    }
  }, [showRecentActivity, newBadges.recentActivity]);

  useEffect(() => {
    if (showBadges && newBadges.badges) {
      markWidgetSeen("badges");
      const t = setTimeout(() => setNewBadges(prev => ({ ...prev, badges: false })), 5000);
      return () => clearTimeout(t);
    }
  }, [showBadges, newBadges.badges]);

  const autoDays = examDate ? Math.max(1, daysLeftFromIsoDate(examDate)) : profile?.daysLeft || 90;
  const targetPercentValue = toPositiveNumber(profile?.targetPercent || 0);
  const hoursPerDayValue = toPositiveNumber(profile?.hoursPerDay || 0);
  const daysLeftValue = toPositiveNumber(autoDays || profile?.daysLeft || 0);
  const hideCountdown = (() => {
    try {
      const stored = localStorage.getItem("lazytopper.hideCountdown");
      if (stored !== null) return stored === "1";
      return paceProfile ? (paceProfile.type === "crash" || paceProfile.type === "sprint") : false;
    } catch { return false; }
  })();

  if (loadingProfile) {
    return (
      <div className={`db-root theme-${theme}`}>
        <style dangerouslySetInnerHTML={{ __html: THEME_STYLES }} />
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
      <div className={`db-root theme-${theme}`}>
        <style dangerouslySetInnerHTML={{ __html: THEME_STYLES }} />
        {showFirstVisit && <FirstVisitOverlay onDismiss={handleDismissOverlay} />}
        <div style={{ padding: "20px 16px 100px", maxWidth: 430, margin: "0 auto" }}>

          <JourneyCard
            journeyState={journeyState}
            raviMessage={raviMessage}
            journeyProgress={journeyProgress}
            onContinue={handleContinueJourney}
            onComplete={handleCompleteChapter}
          />

          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
            {[
              { label: "Practice", icon: "✏️", path: `/practice/${gradeNum}/${subjectForQuickActions}` },
              { label: "Mock Tests", icon: "📝", path: "/predictive-papers" },
              { label: "Predicted Q's", icon: "🎯", path: `/highly-probable/${gradeNum}/${subjectForQuickActions}` },
              { label: "Daily Mix", icon: "🔥", path: `/daily-mix/${gradeNum}/${subjectForQuickActions}` },
              { label: "All Chapters", icon: "📚", path: `/topic-hub/${gradeNum}/${subjectForQuickActions}` },
            ].map((a) => (
              <button key={a.label} onClick={() => navigate(a.path, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } })} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "10px 14px", borderRadius: 12, border: `1px solid ${tc.cardBorder}`,
                background: tc.cardBg, color: tc.textPrimary, fontSize: 10, fontWeight: 600,
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
            <p style={{ fontSize: 13, color: tc.textSecondary, marginBottom: 16, lineHeight: 1.6 }}>
              Set your target score, study time, and exam date for a smarter experience.
            </p>
            <button onClick={() => navigate("/onboarding", { state: { back: "/dashboard", backLabel: "Back to Dashboard" } })} style={{
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
    <div className={`db-root theme-${theme}`}>
      <style dangerouslySetInnerHTML={{ __html: THEME_STYLES }} />
      {showFirstVisit && <FirstVisitOverlay onDismiss={handleDismissOverlay} />}
      <div style={{ padding: "16px 16px 100px", maxWidth: 430, margin: "0 auto" }}>

        <DashboardHeader
          user={user}
          streak={streak}
          xpEstimate={xpEstimate}
          paceProfile={paceProfile}
          onTogglePaceSelector={() => setShowPaceSelector((p) => !p)}
        />

        {paceProfile && (() => {
          const msgs: Record<string, string> = {
            marathon: "You're ahead — build strong foundations now.",
            sprint: "Smart focus — prioritize high-weightage chapters.",
            crash: "Every hour counts — let's make them count together.",
          };
          const msg = msgs[paceProfile.type];
          if (!msg) return null;
          return (
            <div style={{ fontSize: 12, color: tc.textSecondary, marginBottom: 12, paddingLeft: 2, fontStyle: "italic" }}>
              {msg}
            </div>
          );
        })()}

        {(() => {
          const recentMocks = getLatestMockScores(1);
          if (recentMocks.length > 0 && Date.now() - recentMocks[0].timestamp < 24 * 3600000) {
            return <ShareProgressPrompt triggerType="mock" score={recentMocks[0].percent} subject={recentMocks[0].subject} />;
          }
          if (totalAttempted > 0 && totalAttempted % 100 === 0) {
            return <ShareProgressPrompt triggerType="milestone" milestone={`${totalAttempted} questions completed!`} />;
          }
          if (avgAccuracy >= 80 && totalAttempted >= 50) {
            return <ShareProgressPrompt triggerType="milestone" milestone={`${avgAccuracy}% overall accuracy across ${totalAttempted} questions!`} />;
          }
          return null;
        })()}

        {daysLeftValue <= 1 && (
          <button type="button" onClick={() => navigate("/night-before")} style={{
            width: "100%", padding: "16px 20px", borderRadius: 16, marginBottom: 16,
            background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(59,130,246,0.08))",
            border: "1px solid rgba(34,197,94,0.3)", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 28 }}>🌙</span>
            <div style={{ textAlign: "left" }}>
              <div className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "#22c55e" }}>Night Before Exam</div>
              <div style={{ fontSize: 12, color: tc.textSecondary }}>Key formulas, top questions & exam tips</div>
            </div>
          </button>
        )}

        {daysLeftValue <= 7 && daysLeftValue > 1 && (
          <SprintDashboard daysLeft={daysLeftValue} navigate={navigate} gradeNum={gradeNum} />
        )}

        {daysLeftValue > 7 && daysLeftValue <= 30 && (
          <button type="button" onClick={() => navigate("/revision-calendar")} style={{
            width: "100%", padding: "14px 18px", borderRadius: 14, marginBottom: 16,
            background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <div style={{ textAlign: "left" }}>
              <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa" }}>30-Day Revision Calendar</div>
              <div style={{ fontSize: 11, color: tc.textMuted }}>Day-by-day topic plan weighted by board predictions</div>
            </div>
          </button>
        )}

        {showStreakReset && (
          <div className="glass-card" style={{ padding: 16, marginBottom: 16, border: "1px solid rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>👋</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#22c55e", marginBottom: 2 }}>Welcome back!</div>
                  <div style={{ fontSize: 12, color: tc.textSecondary, lineHeight: 1.4 }}>
                    Your progress is safe — all hours, accuracy gains and badges are still here. Start fresh today!
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => { dismissStreakReset(); setShowStreakReset(false); }} style={{
                background: "none", border: "none", color: tc.textMuted, cursor: "pointer",
                fontSize: 14, padding: "0 4px", flexShrink: 0,
              }}>✕</button>
            </div>
          </div>
        )}

        <ConfettiCelebration
          visible={!!streakMilestone}
          badge={streakMilestone ? {
            emoji: streakMilestone.tier === "Bronze" ? "🔥" : streakMilestone.tier === "Silver" ? "⚡" : streakMilestone.tier === "Gold" ? "💪" : streakMilestone.tier === "Platinum" ? "🏆" : "💎",
            title: streakMilestone.name,
            subtitle: streakMilestone.description,
          } : undefined}
          shareCard={streakMilestone ? {
            text: `I just hit a ${streak}-day streak on LazyTopper!`,
            onShare: () => {
              const text = encodeURIComponent(`🔥 I just hit a ${streak}-day study streak on LazyTopper! ${streakMilestone?.name} badge unlocked! 💪\n\nhttps://lazytopper.com`);
              window.open(`https://wa.me/?text=${text}`, "_blank");
            },
          } : undefined}
          onDone={() => setStreakMilestone(null)}
        />

        {daysLeftValue > 7 && <HeroActionCard heroAction={heroAction} />}

        {daysLeftValue > 7 && isFocusTrackingEnabled() && <FocusScoreCard />}

        {daysLeftValue > 7 && journeyState.currentChapter && (
          <JourneyCard
            journeyState={journeyState}
            raviMessage={raviMessage}
            journeyProgress={journeyProgress}
            onContinue={handleContinueJourney}
            onComplete={handleCompleteChapter}
          />
        )}

        {daysLeftValue > 7 && <QuickAccessBar gradeNum={gradeNum} subjectForQuickActions={subjectForQuickActions} navigate={navigate} />}

        {/* HERO ACTION — pace transition (kept visible in sprint) */}
        {paceTransition && (
          <div style={{
            padding: "14px 16px", marginBottom: 16, borderRadius: 16,
            background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#f97316", marginBottom: 4 }}>
                  {hideCountdown ? `Switching to ${getProfileConfig(paceTransition.to).label} mode` : `${paceTransition.daysLeft} days to boards — switching to ${getProfileConfig(paceTransition.to).label} mode`}
                </div>
                <p style={{ fontSize: 12, color: tc.textSecondary, margin: 0, lineHeight: 1.5 }}>
                  {hideCountdown ? `Switching to ${getProfileConfig(paceTransition.to).label} for the best results.` : getProfileSummary(paceTransition.to, paceTransition.daysLeft)}
                </p>
              </div>
              <button type="button" onClick={() => { dismissTransitionNotification(); setPaceTransition(null); }} style={{
                background: "none", border: "none", color: tc.textMuted, cursor: "pointer",
                fontSize: 16, padding: "0 4px", flexShrink: 0,
              }}>✕</button>
            </div>
          </div>
        )}

        {daysLeftValue > 7 && showPaceSelector && paceProfile && (
          <PaceSelectorPanel paceProfile={paceProfile} hideCountdown={hideCountdown} onUpdateProfile={setPaceProfile} />
        )}


        {daysLeftValue > 7 && totalAttempted === 0 && streak === 0 ? (
          <EmptyStateCard
            icon="🚀"
            title="Your journey starts here!"
            description="Answer your first questions to see your streak, XP, accuracy, and mastery stats light up."
            ctaLabel="Try your first 5 questions"
            onAction={() => navigate(`/daily-mix/${gradeNum}/${subjectForQuickActions}`, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } })}
            color="#22c55e"
          />
        ) : daysLeftValue > 7 && <StatsRow streak={streak} xpEstimate={xpEstimate} avgAccuracy={avgAccuracy} topicsMastered={topicsMastered} topicsStarted={topicsStarted} />}

        {daysLeftValue > 7 && srStats.dueToday > 0 && (
          <div
            onClick={() => navigate("/weak-area-practice", { state: { back: "/dashboard", backLabel: "Back to Dashboard" } })}
            style={{
              padding: "12px 16px", marginBottom: 16, borderRadius: 14,
              background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>🧠</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#a855f7" }}>
                  {srStats.dueToday} item{srStats.dueToday === 1 ? "" : "s"} due for review
                </div>
                <div style={{ fontSize: 11, color: tc.textSecondary }}>
                  ~{Math.max(5, srStats.dueToday * 2)} min estimated
                </div>
              </div>
            </div>
            <span style={{ color: tc.textFaint, fontSize: 16 }}>→</span>
          </div>
        )}

        {daysLeftValue > 7 && <DailyMixPreview items={dailyMixPreview} totalMinutes={dailyMixMinutes} gradeNum={gradeNum} subjectForQuickActions={subjectForQuickActions} navigate={navigate} />}

        {daysLeftValue > 7 && <WeakAreasPanel weakAreas={weakAreas} gradeNum={gradeNum} navigate={navigate} />}

        {daysLeftValue > 7 && totalAttempted >= 10 && performanceRows.length > 0 && (
          <TopicMasteryGrid
            mathsMastery={mathsMastery}
            scienceMastery={scienceMastery}
            gradeNum={gradeNum}
            showNewBadge={!!newBadges.topicMastery}
            navigate={navigate}
            getRowMasteryLevel={getRowMasteryLevel}
          />
        )}

        {daysLeftValue > 7 && <StudyPlanSummary targetPercent={targetPercentValue} hoursPerDay={hoursPerDayValue} daysLeft={daysLeftValue} hideCountdown={hideCountdown} strategy={strategy} />}

        {/* RECENT ACTIVITY — empty state when no activity */}
        {daysLeftValue > 7 && recentActivity.length === 0 && totalAttempted === 0 && (
          <EmptyStateCard
            icon="📖"
            title="No activity yet"
            description="Start practicing any topic and your recent activity will show up here."
            ctaLabel="Start Practicing"
            onAction={() => navigate(`/practice/${gradeNum}/${subjectForQuickActions}`, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } })}
            color="#3b82f6"
          />
        )}
        {daysLeftValue > 7 && recentActivity.length > 0 && (
          <RecentActivityList activities={recentActivity} showNewBadge={!!newBadges.recentActivity} />
        )}

        {/* BADGES — empty state when none earned, with "New!" badge */}
        {daysLeftValue > 7 && badges.length === 0 && totalAttempted > 0 && (
          <EmptyStateCard
            icon="🏆"
            title="Earn your first badge!"
            description="Keep practicing and complete challenges to unlock achievements. You're closer than you think!"
            ctaLabel="Start Earning Badges"
            onAction={() => navigate(`/daily-mix/${gradeNum}/${subjectForQuickActions}`, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } })}
            color="#a855f7"
          />
        )}
        {daysLeftValue > 7 && badges.length > 0 && (
          <BadgesSection badges={badges} showNewBadge={!!newBadges.badges} />
        )}

        {daysLeftValue > 7 && <ExploreMorePanel gradeNum={gradeNum} subjectForQuickActions={subjectForQuickActions} daysLeftValue={daysLeftValue} navigate={navigate} />}

      </div>
    </div>
  );
}
