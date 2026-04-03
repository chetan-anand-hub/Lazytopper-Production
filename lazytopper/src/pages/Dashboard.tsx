import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useVibeMode } from "../context/vibeModeContext";
import { topicHubV2Content } from "../data/topicHubV2Full";
import { useSmartLearning } from "../engine/smartLearningStore";
import type { ChapterMeta } from "../engine/smartLearningTypes";
import { getAttempts } from "../services/practiceInsights";
import { getStrategyPlan, saveStrategyPlan, updateAndGetStreak } from "../services/planStorage";
import { generateMultiTopicDailyMix } from "../services/dailyMixGenerator";
import type { DailyMixItem } from "../services/dailyMixPlayback";
import type { StrategyPlan } from "../services/strategyEngine";
import { generateStrategyPlan } from "../services/strategyEngine";
import { normalizeTopicKey } from "../utils/topicResolver";
import {
  clearCbseExamDateAdminOverride,
  daysLeftFromIsoDate,
  fetchCbseExamDate,
  getCbseExamDateAdminOverride,
  setCbseExamDateAdminOverride,
} from "../services/cbseExamDate";
import { loadDashboardPrefs, saveDashboardPrefs } from "../services/studentCloudStore";

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
  try {
    return new Date().toLocaleDateString("en-US", { weekday: "long" });
  } catch {
    return "Today";
  }
}

function toPositiveNumber(raw: string | number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatIsoDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "TBD";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, strategy, loadingProfile, setProfileAndCompute } = useProfile();
  const navigate = useNavigate();
  const { mode, setMode } = useVibeMode();
  const { statsByChapter, getMatchScoreForChapter } = useSmartLearning();

  const [plannerSubject, setPlannerSubject] = useState<SubjectTitle>("Maths");
  const [plannerTargetInput, setPlannerTargetInput] = useState("");
  const [plannerHoursInput, setPlannerHoursInput] = useState("");
  const [plannerDaysInput, setPlannerDaysInput] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examSource, setExamSource] = useState<"official" | "predicted">("predicted");
  const [examNote, setExamNote] = useState("");
  const [adminDateInput, setAdminDateInput] = useState("");
  const [adminNoteInput, setAdminNoteInput] = useState("Admin confirmed official CBSE date.");
  const [plannerMessage, setPlannerMessage] = useState("");

  const [planRecord, setPlanRecord] = useState<StrategyPlan | null>(() => getStrategyPlan());
  const [streak] = useState<number>(() => updateAndGetStreak());
  const attempts = getAttempts();

  const dailyMixPreview = useMemo<DailyMixItem[]>(() => {
    const subject = planRecord?.subject === "Science" ? "Science" as const : plannerSubject;
    const d = new Date();
    const seedKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return generateMultiTopicDailyMix({
      grade: 10,
      subject,
      seedKey,
      topicCount: 3,
      itemsPerTopic: 4,
      maxItems: 5,
      intensity: "normal",
    });
  }, [planRecord, plannerSubject]);

  useEffect(() => {
    const uid = user?.uid;
    const studentClass = profile?.studentClass;
    if (!uid || !studentClass) return;
    let cancelled = false;
    void (async () => {
      const prefs = await loadDashboardPrefs(uid);
      if (cancelled) return;
      if (prefs?.plannerSubject) setPlannerSubject(prefs.plannerSubject);
      if (prefs?.targetPercentOverride != null) setPlannerTargetInput(String(prefs.targetPercentOverride));
      if (prefs?.hoursPerDayOverride != null) setPlannerHoursInput(String(prefs.hoursPerDayOverride));
      if (prefs?.daysLeftOverride != null) setPlannerDaysInput(String(prefs.daysLeftOverride));

      const dateResult = await fetchCbseExamDate(studentClass);
      if (cancelled) return;
      setExamDate(dateResult.examDate);
      setExamSource(dateResult.source);
      setExamNote(String(dateResult.note || ""));
      const override = getCbseExamDateAdminOverride(studentClass);
      setAdminDateInput(override?.examDate || dateResult.examDate);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, profile?.studentClass]);

  const performanceRows = useMemo<PerformanceRow[]>(() => {
    const rows: PerformanceRow[] = [];
    const seen = new Set<string>();

    for (const [chapterId, stats] of Object.entries(statsByChapter || {})) {
      const parsed = parseChapterId(chapterId);
      const rec = toTopicMetaLight((topicHubV2Content as Record<string, unknown>)[parsed.topicKey]);
      const chapterMeta: ChapterMeta = {
        id: chapterId,
        grade: parsed.grade,
        subject: parsed.subject,
        topicKey: parsed.topicKey,
        name: displayTopic(parsed.topicKey),
        boardWeightage: Number(rec.weightagePercent ?? rec.approxWeightage ?? 0),
        tier:
          String(rec.tier || "high-roi") === "must-crack"
            ? "must-crack"
            : String(rec.tier || "high-roi") === "good-to-do"
              ? "good-to-do"
              : "high-roi",
      };
      const matchScore = getMatchScoreForChapter(chapterMeta, subjectMaxWeightage(parsed.subject));
      const attempted = Number(stats.totalQuestionsAttempted || 0);
      const correct = Number(stats.totalQuestionsCorrect || 0);
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
      rows.push({
        chapterId,
        subject: parsed.subject,
        topicKey: parsed.topicKey,
        topicName: chapterMeta.name,
        attempted,
        correct,
        accuracy,
        matchScore,
        lastPracticedAt: stats.lastPracticedAt,
      });
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
        id: chapterId,
        grade: "10",
        subject,
        topicKey,
        name: displayTopic(topicKey),
        boardWeightage: Number(rec.weightagePercent ?? rec.approxWeightage ?? 0),
        tier:
          String(rec.tier || "high-roi") === "must-crack"
            ? "must-crack"
            : String(rec.tier || "high-roi") === "good-to-do"
              ? "good-to-do"
              : "high-roi",
      };
      const matchScore = getMatchScoreForChapter(chapterMeta, subjectMaxWeightage(subject));
      const accuracy = agg.attempted > 0 ? Math.round((agg.correct / agg.attempted) * 100) : 0;
      rows.push({
        chapterId,
        subject,
        topicKey,
        topicName: chapterMeta.name,
        attempted: agg.attempted,
        correct: agg.correct,
        accuracy,
        matchScore,
        lastPracticedAt: agg.ts > 0 ? new Date(agg.ts).toISOString() : undefined,
      });
    }

    rows.sort((a, b) => {
      const byMatch = b.matchScore - a.matchScore;
      if (byMatch !== 0) return byMatch;
      return b.attempted - a.attempted;
    });
    return rows.slice(0, 14);
  }, [statsByChapter, attempts, getMatchScoreForChapter]);

  const weakestTopicKey = useMemo(() => {
    const candidates = performanceRows.filter((r) => r.attempted >= 2);
    if (!candidates.length) return normalizeTopicKey(String(planRecord?.dailyMix?.topicKey || "triangles")) || "triangles";
    const sorted = [...candidates].sort((a, b) => a.accuracy - b.accuracy);
    return sorted[0]?.topicKey || "triangles";
  }, [performanceRows, planRecord]);

  const studentClass = profile?.studentClass || "";
  const gradeNum = String((studentClass || "").replace(/\D/g, "")) || "10";
  const dailyMixMinutes = mode === "zombie" ? 20 : 40;
  const subjectForQuickActions: SubjectTitle = planRecord?.subject === "Science" ? "Science" : plannerSubject;

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
        const saved = JSON.parse(raw) as { date?: string; subject?: string; items?: unknown[]; questionStates?: { submitted?: boolean }[]; completed?: boolean };
        if (!saved || saved.completed) continue;
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (saved.date !== todayStr) continue;
        const items = Array.isArray(saved.items) ? saved.items : [];
        const states = Array.isArray(saved.questionStates) ? saved.questionStates : [];
        const answered = states.filter((s) => s?.submitted).length;
        if (answered > 0 && answered < items.length) {
          return { kind: "daily_mix", subject: subj, cursor: answered, total: items.length };
        }
      }

      const raw = localStorage.getItem("lazytopper.session.local.v1");
      if (raw) {
        const sessions = JSON.parse(raw) as Record<string, { kind?: string; subjectId?: string; completed?: boolean; cursor?: number; items?: unknown[] }>;
        if (sessions && typeof sessions === "object") {
          for (const [, s] of Object.entries(sessions)) {
            if (!s || s.completed) continue;
            const items = Array.isArray(s.items) ? s.items : [];
            const cursor = Number(s.cursor || 0);
            if (cursor >= 0 && cursor < items.length) {
              return {
                kind: String(s.kind || "daily_mix"),
                subject: String(s.subjectId || "maths") === "science" ? "Science" : "Maths",
                cursor,
                total: items.length,
              };
            }
          }
        }
      }
    } catch {}
    return null;
  }, []);

  type HeroAction = { type: string; title: string; description: string; ctaLabel: string; onAction: () => void };
  const heroAction = useMemo<HeroAction>(() => {
    if (incompleteSession) {
      const kindLabel = incompleteSession.kind === "daily_mix" ? "Daily Mix" : incompleteSession.kind === "hpq" ? "Predicted Q's" : "Study Session";
      const resumeRoute = incompleteSession.kind === "daily_mix"
        ? `/daily-mix/${gradeNum}/${incompleteSession.subject}`
        : incompleteSession.kind === "hpq"
          ? `/practice/${gradeNum}/${incompleteSession.subject}`
          : `/topic-hub/${gradeNum}/${incompleteSession.subject}`;
      return {
        type: "resume_session",
        title: `Continue Your ${kindLabel}`,
        description: `You have an incomplete ${kindLabel} (${incompleteSession.cursor}/${incompleteSession.total} items done). Pick up where you left off!`,
        ctaLabel: `Resume ${kindLabel}`,
        onAction: () => navigate(resumeRoute),
      };
    }
    if (!dailyMixDoneToday) {
      return {
        type: "daily_mix",
        title: `Your ${nowDayLabel()} Mix (${dailyMixMinutes} mins)`,
        description: `${dailyMixPreview.filter(i => i.type === "question").length} questions + concept + revision. Complete it to keep your streak going!`,
        ctaLabel: "Start Daily Mix",
        onAction: () => navigate(`/daily-mix/${gradeNum}/${subjectForQuickActions}`),
      };
    }
    const weakRow = performanceRows.find(r => r.attempted >= 2 && r.accuracy < 50);
    if (weakRow) {
      return {
        type: "weak_topic",
        title: `Focus: ${weakRow.topicName}`,
        description: `Your accuracy on ${weakRow.topicName} is ${weakRow.accuracy}%. Practice this topic to improve your score.`,
        ctaLabel: `Practice ${weakRow.topicName}`,
        onAction: () => navigate(`/practice/${gradeNum}/${weakRow.subject}?topic=${encodeURIComponent(weakRow.topicKey)}`),
      };
    }
    if (streak > 0) {
      return {
        type: "streak",
        title: `${streak} Day Streak! Keep it alive`,
        description: "You've done your daily mix. Keep momentum with a quick practice session or explore Chapter Hub.",
        ctaLabel: "Continue in Chapter Hub",
        onAction: () => navigate(`/topic-hub/${gradeNum}/${subjectForQuickActions}`),
      };
    }
    return {
      type: "daily_mix",
      title: "Start Your Study Session",
      description: "Begin with today's Daily Mix to build consistency and grow your streak.",
      ctaLabel: "Start Daily Mix",
      onAction: () => navigate(`/daily-mix/${gradeNum}/${subjectForQuickActions}`),
    };
  }, [incompleteSession, dailyMixDoneToday, dailyMixMinutes, dailyMixPreview, performanceRows, streak, gradeNum, subjectForQuickActions, navigate]);

  if (loadingProfile) {
    return (
      <div className="lt-page">
        <div className="card">
          <h3>Loading your dashboard...</h3>
        </div>
      </div>
    );
  }

  if (!profile || !strategy) {
    return (
      <div className="lt-page">
        <h2 className="title">Your Personal Dashboard</h2>
        <div className="card" style={{ textAlign: "center", padding: "32px 20px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🎯</div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: 6 }}>
            Let's set up your study plan!
          </h3>
          <p style={{ fontSize: "0.9rem", color: "#777", marginBottom: 16, lineHeight: 1.5 }}>
            Tell us your target score, available study time, and exam date. We'll create a personalised strategy just for you.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="cta-btn" onClick={() => navigate("/onboarding")}>
              Set Up My Study Plan
            </button>
            <button className="pill-btn" type="button" onClick={() => navigate("/daily-mix/10/Maths")}>
              Start Daily Mix
            </button>
          </div>
          <p style={{ marginTop: 14, opacity: 0.7, fontSize: "0.82rem" }}>
            Your progress tracking and personalised recommendations will appear here once you start.
          </p>
        </div>
      </div>
    );
  }

  const autoDays = examDate ? Math.max(1, daysLeftFromIsoDate(examDate)) : profile.daysLeft;
  const targetPercentValue = toPositiveNumber(plannerTargetInput || profile.targetPercent);
  const hoursPerDayValue = toPositiveNumber(plannerHoursInput || profile.hoursPerDay);
  const daysLeftValue = toPositiveNumber(plannerDaysInput || autoDays || profile.daysLeft);

  const { realisticMin, realisticMax, hoursPerDayRequired, effortStatus } = strategy;

  const effortMessage =
    effortStatus === "high"
      ? "You are putting in strong effort and can exceed your target with consistency."
      : effortStatus === "ok"
        ? "Your plan is realistic and achievable with regular study."
        : "Your daily effort is below what is needed. Increase hours or adjust target.";

  const handleGeneratePlanner = () => {
    if (!targetPercentValue || !hoursPerDayValue || !daysLeftValue) {
      setPlannerMessage("Set valid target %, hours/day, and days left first.");
      return;
    }
    const updatedProfile = {
      ...profile,
      daysLeft: daysLeftValue,
      targetPercent: targetPercentValue,
      hoursPerDay: hoursPerDayValue,
    };
    setProfileAndCompute(updatedProfile);

    const generated = generateStrategyPlan({
      grade: gradeNum,
      subject: plannerSubject,
      daysLeft: daysLeftValue,
      hoursPerDay: hoursPerDayValue,
      targetPercent: targetPercentValue,
      vibe: mode,
      weakChapters: [weakestTopicKey],
    });
    saveStrategyPlan(generated);
    setPlanRecord(generated);

    if (user?.uid) {
      void saveDashboardPrefs(user.uid, {
        plannerSubject,
        targetPercentOverride: targetPercentValue,
        hoursPerDayOverride: hoursPerDayValue,
        daysLeftOverride: daysLeftValue,
        examDate: examDate || undefined,
        examDateSource: examSource,
      });
    }

    setPlannerMessage("Planner updated. Opening your study plan.");
    navigate(`/study-plan/${gradeNum}/${plannerSubject}`, {
      state: {
        daysLeft: daysLeftValue,
        mathTargetPercent: plannerSubject === "Maths" ? targetPercentValue : profile.targetPercent,
        scienceTargetPercent: plannerSubject === "Science" ? targetPercentValue : profile.targetPercent,
        mathHoursPerDay: plannerSubject === "Maths" ? hoursPerDayValue : profile.hoursPerDay,
        scienceHoursPerDay: plannerSubject === "Science" ? hoursPerDayValue : profile.hoursPerDay,
        back: "/dashboard",
        backLabel: "Back to dashboard",
      },
    });
  };

  const handleSaveAdminOverride = () => {
    try {
      const override = setCbseExamDateAdminOverride(profile.studentClass, adminDateInput, adminNoteInput);
      setExamDate(override.examDate);
      setExamSource("official");
      setExamNote(String(override.note || ""));
      setPlannerMessage(`Admin override saved: ${override.examDate}`);
    } catch (err) {
      setPlannerMessage(err instanceof Error ? err.message : "Invalid override date.");
    }
  };

  const handleClearAdminOverride = async () => {
    clearCbseExamDateAdminOverride(profile.studentClass);
    const refreshed = await fetchCbseExamDate(profile.studentClass);
    setExamDate(refreshed.examDate);
    setExamSource(refreshed.source);
    setExamNote(String(refreshed.note || ""));
    setAdminDateInput(refreshed.examDate);
    setPlannerMessage("Admin override cleared.");
  };

  const openDailyMix = (subject: SubjectTitle) => {
    navigate(`/daily-mix/${gradeNum}/${subject}`);
  };

  const totalAttempted = performanceRows.reduce((s, r) => s + r.attempted, 0);
  const avgAccuracy = performanceRows.length > 0
    ? Math.round(performanceRows.reduce((s, r) => s + r.accuracy, 0) / performanceRows.length)
    : 0;
  const topicsStarted = performanceRows.length;
  const topicsMastered = performanceRows.filter(r => r.accuracy >= 80 && r.attempted >= 3).length;
  const persistedXp = (() => { try { return Number(localStorage.getItem("lazytopper.xp") || 0); } catch { return 0; } })();
  const xpEstimate = Math.max(persistedXp, totalAttempted * 10 + streak * 25 + topicsMastered * 50);

  return (
    <div className="lt-page">
      <h2 className="title" style={{ marginBottom: 8 }}>Your Dashboard</h2>

      {/* Gamification stats bar */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap",
      }}>
        <div style={{
          flex: "1 1 100px", background: "#fff7e6", border: "2px solid #ff9600",
          borderRadius: 16, padding: "14px 16px", textAlign: "center",
          boxShadow: "0 2px 0 rgba(255,150,0,0.3)",
        }}>
          <div style={{ fontSize: "1.6rem" }}>🔥</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#ff9600" }}>{streak}</div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#777", textTransform: "uppercase" }}>Day streak</div>
        </div>
        <div style={{
          flex: "1 1 100px", background: "#e6f9e0", border: "2px solid #58cc02",
          borderRadius: 16, padding: "14px 16px", textAlign: "center",
          boxShadow: "0 2px 0 rgba(88,204,2,0.3)",
        }}>
          <div style={{ fontSize: "1.6rem" }}>⚡</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#58cc02" }}>{xpEstimate}</div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#777", textTransform: "uppercase" }}>Total XP</div>
        </div>
        <div style={{
          flex: "1 1 100px", background: "#ddf4ff", border: "2px solid #1cb0f6",
          borderRadius: 16, padding: "14px 16px", textAlign: "center",
          boxShadow: "0 2px 0 rgba(28,176,246,0.3)",
        }}>
          <div style={{ position: "relative", display: "inline-block", width: 52, height: 52 }}>
            <svg viewBox="0 0 52 52" style={{ width: 52, height: 52, transform: "rotate(-90deg)" }}>
              <circle cx="26" cy="26" r="22" fill="none" stroke="#e5e5e5" strokeWidth="4" />
              <circle cx="26" cy="26" r="22" fill="none" stroke="#1cb0f6" strokeWidth="4"
                className="lt-progress-ring"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - avgAccuracy / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 900, color: "#1cb0f6" }}>{avgAccuracy}%</span>
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#777", textTransform: "uppercase", marginTop: 4 }}>Accuracy</div>
        </div>
        <div style={{
          flex: "1 1 100px", background: "#f3e8ff", border: "2px solid #ce82ff",
          borderRadius: 16, padding: "14px 16px", textAlign: "center",
          boxShadow: "0 2px 0 rgba(206,130,255,0.3)",
        }}>
          <div style={{ position: "relative", display: "inline-block", width: 52, height: 52 }}>
            <svg viewBox="0 0 52 52" style={{ width: 52, height: 52, transform: "rotate(-90deg)" }}>
              <circle cx="26" cy="26" r="22" fill="none" stroke="#e5e5e5" strokeWidth="4" />
              <circle cx="26" cy="26" r="22" fill="none" stroke="#ce82ff" strokeWidth="4"
                className="lt-progress-ring"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - (topicsStarted > 0 ? topicsMastered / topicsStarted : 0))}`}
                strokeLinecap="round"
              />
            </svg>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 900, color: "#ce82ff" }}>{topicsMastered}/{topicsStarted}</span>
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#777", textTransform: "uppercase", marginTop: 4 }}>Mastered</div>
        </div>
      </div>

      <div className="card" data-ux-priority-block="dashboard-next-best-actions" data-testid="dashboard-priority-block" style={{ background: "#e6f9e0", border: "2px solid #58cc02", borderRadius: 16, boxShadow: "0 2px 0 #46a302" }}>
        <h3 style={{ fontSize: "1.15rem", fontWeight: 900, color: "#3c3c3c" }}>{heroAction.title}</h3>
        <p style={{ marginTop: 6, color: "#777777" }}>{heroAction.description}</p>
        <div className="focus-cta-row" style={{ marginTop: 12 }}>
          <button
            className="cta-btn"
            data-ux-above-fold-cta="dashboard"
            style={{ fontWeight: 800, minWidth: 200 }}
            onClick={heroAction.onAction}
          >
            {heroAction.ctaLabel}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {heroAction.type !== "daily_mix" && (
            <button className="cta-btn small" onClick={() => openDailyMix(subjectForQuickActions)}>
              Start Daily Mix
            </button>
          )}
          {heroAction.type !== "weak_topic" && (
            <button
              className="cta-btn small"
              onClick={() => navigate(`/practice/${gradeNum}/${subjectForQuickActions}?topic=${encodeURIComponent(weakestTopicKey)}`)}
            >
              Practice Weakest Topic
            </button>
          )}
          <button className="cta-btn small" onClick={() => navigate(`/topic-hub/${gradeNum}/${subjectForQuickActions}`)}>
            Open Chapter Hub
          </button>
          <button className="cta-btn small" onClick={() => navigate("/weak-area-practice")} style={{ background: "#ff9600", border: "2px solid #e08600", boxShadow: "0 2px 0 #cc7a00" }}>
            Fix My Weak Areas
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Planner Mentor</h3>
        <p style={{ marginTop: 6, opacity: 0.85 }}>
          Board date source: <strong>{examSource}</strong>
          {examDate ? <> | Estimated exam start: <strong>{formatIsoDate(examDate)}</strong></> : null}
          {examNote ? <> | {examNote}</> : null}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
          <div>
            <label>Plan subject</label>
            <select value={plannerSubject} onChange={(e) => setPlannerSubject(e.target.value as SubjectTitle)}>
              <option value="Maths">Maths</option>
              <option value="Science">Science</option>
            </select>
          </div>
          <div>
            <label>Target %</label>
            <input
              type="number"
              value={plannerTargetInput || String(profile.targetPercent)}
              onChange={(e) => setPlannerTargetInput(e.target.value)}
            />
          </div>
          <div>
            <label>Hours/day</label>
            <input
              type="number"
              value={plannerHoursInput || String(profile.hoursPerDay)}
              onChange={(e) => setPlannerHoursInput(e.target.value)}
            />
          </div>
          <div>
            <label>Days left</label>
            <input
              type="number"
              value={plannerDaysInput || String(autoDays)}
              onChange={(e) => setPlannerDaysInput(e.target.value)}
            />
          </div>
        </div>

        {planRecord?.meta ? (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "#f7f7f7", border: "2px solid #e5e5e5" }}>
            <strong>Plan realism check</strong>
            <p style={{ marginTop: 6, fontSize: "0.9rem", opacity: 0.9 }}>
              Feasibility: <b>{planRecord.meta.feasibilityBand}</b> | Effective hours: <b>{planRecord.meta.effectiveHours}</b> |
              Core: <b>{planRecord.meta.coreHours}</b> | Revision: <b>{planRecord.meta.revisionHours}</b> | Mocks: <b>{planRecord.meta.mockHours}</b>
            </p>
            <p style={{ marginTop: 4, fontSize: "0.9rem", opacity: 0.9 }}>
              Expected mastery band: <b>{planRecord.meta.expectedMasteryRange[0]}% - {planRecord.meta.expectedMasteryRange[1]}%</b>
              {planRecord.meta.capacityGapHours > 0 ? <> | Gap to target: <b>{planRecord.meta.capacityGapHours} hrs</b></> : null}
            </p>
          </div>
        ) : null}

        <div style={{ marginTop: 12, padding: 10, borderRadius: 12, border: "2px dashed #e5e5e5" }}>
          <strong>Admin exam-date override</strong>
          <p style={{ marginTop: 6, fontSize: "0.85rem", opacity: 0.85 }}>
            Use this only after manually confirming official CBSE date sheet.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginTop: 8 }}>
            <div>
              <label>Official date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={adminDateInput}
                onChange={(e) => setAdminDateInput(e.target.value)}
              />
            </div>
            <div>
              <label>Note</label>
              <input
                type="text"
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="pill-btn" onClick={handleSaveAdminOverride}>
              Save official date override
            </button>
            <button type="button" className="pill-btn" onClick={() => void handleClearAdminOverride()}>
              Clear override
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="cta-btn small" onClick={handleGeneratePlanner}>
            Generate Study Plan
          </button>
          <button className="cta-btn small" onClick={() => navigate("/onboarding")}>
            Re-run onboarding
          </button>
        </div>
        {plannerMessage ? <p style={{ marginTop: 10, opacity: 0.88 }}>{plannerMessage}</p> : null}
      </div>

      {dailyMixPreview.length > 0 ? (
        <div className="card focus-card">
          <h3>Today's Mix Preview</h3>
          <ul className="mix-list">
            {dailyMixPreview.map((item) => (
              <li key={item.id}>
                <span style={{ fontWeight: 600 }}>{item.title}</span>
                {item.description ? <span style={{ opacity: 0.7, fontSize: "0.85rem" }}> - {item.description}</span> : null}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 10, fontSize: "0.9rem", opacity: 0.86 }}>
            <strong>Streak:</strong> {streak} day{streak === 1 ? "" : "s"}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700 }}>Energy Level:</span>
            <button
              type="button"
              className="lt-pill"
              onClick={() => setMode("zombie")}
              style={{ background: mode === "zombie" ? "#58cc02" : undefined, color: mode === "zombie" ? "#fff" : undefined }}
            >
              Relaxed
            </button>
            <button
              type="button"
              className="lt-pill"
              onClick={() => setMode("beast")}
              style={{ background: mode === "beast" ? "#58cc02" : undefined, color: mode === "beast" ? "#fff" : undefined }}
            >
              Challenge
            </button>
            <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
              {mode === "zombie" ? "Relaxed mode: short and lighter practice." : "Challenge mode: full rigor and harder drills."}
            </span>
          </div>
          <div className="focus-cta-row" style={{ marginTop: 12 }}>
            <button
              className="cta-btn"
              style={{ fontWeight: 800, minWidth: 220 }}
              onClick={() => openDailyMix(subjectForQuickActions)}
            >
              Play Daily Mix ({dailyMixMinutes} mins)
            </button>
          </div>
          <p style={{ marginTop: 10, fontSize: "0.84rem", opacity: 0.82 }}>
            Review long-term momentum in{" "}
            <button type="button" className="pill-btn" onClick={() => navigate(`/weekly-wrapped`)}>
              Weekly Wrapped
            </button>
            .
          </p>
        </div>
      ) : null}

      <div className="card">
        <h3>Profile Snapshot</h3>
        <p>
          Class: <strong>{studentClass}</strong> <br />
          Target: <strong>{profile.targetPercent}%</strong> <br />
          Days left: <strong>{profile.daysLeft}</strong> <br />
          Hours/day: <strong>{profile.hoursPerDay}</strong>
        </p>
      </div>

      <div className="card">
        <h3>Realistic Score Range</h3>
        <p>
          With your current pattern, you are heading toward:
          <br />
          <strong style={{ fontSize: "1.2rem" }}>
            {realisticMin}% - {realisticMax}%
          </strong>
        </p>
        <p className="subtitle">{effortMessage}</p>
        <p>
          To target <strong>{profile.targetPercent}%</strong>, you need about
          <br />
          <strong>{hoursPerDayRequired} hours/day</strong> on average.
        </p>
      </div>

      <div className="card" data-testid="performance-matrix-card">
        <h3>Performance Matrix</h3>
        <p style={{ marginTop: 6, opacity: 0.8 }}>Topic-wise view of attempts, accuracy, and Match score.</p>
        {performanceRows.length === 0 ? (
          <p style={{ marginTop: 10, opacity: 0.8 }}>
            No performance data yet. Attempt a few predicted questions or practice sets to unlock the matrix.
          </p>
        ) : (
          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Topic</th>
                  <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Subject</th>
                  <th style={{ textAlign: "right", padding: "8px 6px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Attempted</th>
                  <th style={{ textAlign: "right", padding: "8px 6px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Accuracy</th>
                  <th style={{ textAlign: "right", padding: "8px 6px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Match Score</th>
                  <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {performanceRows.map((row) => (
                  <tr key={row.chapterId}>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid rgba(0,0,0,0.04)", fontWeight: 600 }}>{row.topicName}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>{row.subject}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid rgba(0,0,0,0.04)", textAlign: "right" }}>{row.attempted}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid rgba(0,0,0,0.04)", textAlign: "right" }}>{row.accuracy}%</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid rgba(0,0,0,0.04)", textAlign: "right", fontWeight: 700 }}>
                      Match Score: {row.matchScore}%
                    </td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid rgba(0,0,0,0.04)", opacity: 0.8 }}>
                      {row.lastPracticedAt ? new Date(row.lastPracticedAt).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
