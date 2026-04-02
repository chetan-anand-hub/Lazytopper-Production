import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import { useSmartLearning } from "../engine/smartLearningStore";
import { loadInsights } from "../services/practiceInsights";
import { loadTopicMasterySnapshot } from "../services/topicHubMastery";
import {
  buildBadgeContext,
  evaluateBadges,
  buildJourneyMilestones,
  syncBadgesToCloud,
  BADGE_DEFINITIONS,
  ALL_TOPICS_BY_SUBJECT,
  type EarnedBadge,
  type JourneyMilestone,
  type BadgeContext,
} from "../services/badgeEngine";
import { saveLearnerProgress } from "../services/studentProgressStore";

type ProfileTab = "overview" | "achievements" | "stats";

const TOPIC_DISPLAY_NAMES: Record<string, string> = {
  "real-numbers": "Real Numbers",
  "polynomials": "Polynomials",
  "pair-of-linear-equations": "Linear Equations",
  "quadratic-equations": "Quadratic Equations",
  "arithmetic-progression": "Arithmetic Progression",
  "triangles": "Triangles",
  "coordinate-geometry": "Coordinate Geometry",
  "circles": "Circles",
  "constructions": "Constructions",
  "areas-related-to-circles": "Areas & Circles",
  "surface-areas-and-volumes": "Surface Area & Vol",
  "trigonometry": "Trigonometry",
  "statistics": "Statistics",
  "probability": "Probability",
  "chemical-reactions-equations": "Chemical Reactions",
  "acids-bases-salts": "Acids, Bases & Salts",
  "metals-non-metals": "Metals & Non-metals",
  "carbon-and-its-compounds": "Carbon Compounds",
  "life-processes": "Life Processes",
  "how-do-organisms-reproduce": "Reproduction",
  "human-eye-colourful-world": "Human Eye",
  "electricity": "Electricity",
  "magnetic-effects-of-electric-current": "Magnetic Effects",
  "light-reflection-refraction": "Light & Refraction",
};

function MasteryRing({ percent, size = 56, color }: { percent: number; size?: number; color: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (percent / 100) * circ;
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8e8e8" strokeWidth={5} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fontSize={size < 50 ? 10 : 12}
        fontWeight={700}
        fill={color}
      >
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

function getMasteryColor(percent: number): string {
  if (percent === 0) return "#ccc";
  if (percent < 40) return "#60a5fa";
  if (percent < 70) return "#34d399";
  return "#f59e0b";
}

function getTopicMasteryPercent(topicKey: string): number {
  const snap = loadTopicMasterySnapshot(topicKey);
  if (!snap?.nodes) return 0;
  const nodes = Object.values(snap.nodes);
  if (nodes.length === 0) return 0;
  let score = 0;
  for (const n of nodes) {
    const st = (n as { state: string }).state;
    if (st === "mastered") score += 100;
    else if (st === "checkpoint_passed") score += 70;
    else if (st === "needs_practice") score += 40;
    else if (st === "learning") score += 20;
  }
  return score / nodes.length;
}

interface WeeklyAccuracy {
  weekLabel: string;
  accuracy: number;
  count: number;
}

function computeWeeklyAccuracy(): WeeklyAccuracy[] {
  const insights = loadInsights();
  const attempts = insights.attempts || [];
  if (attempts.length === 0) return [];

  const byWeek = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    const d = new Date(a.timestamp);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    const existing = byWeek.get(key) || { correct: 0, total: 0 };
    existing.total++;
    if (a.correct) existing.correct++;
    byWeek.set(key, existing);
  }

  const sorted = Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8);

  return sorted.map(([key, v]) => ({
    weekLabel: key.slice(5),
    accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
    count: v.total,
  }));
}

interface DifficultyProgress {
  easy: number;
  medium: number;
  hard: number;
}

function computeDifficultyProgress(): DifficultyProgress {
  const insights = loadInsights();
  const attempts = insights.attempts || [];
  let easy = 0;
  let medium = 0;
  let hard = 0;
  for (const a of attempts) {
    if (a.difficulty === "Easy") easy++;
    else if (a.difficulty === "Medium") medium++;
    else if (a.difficulty === "Hard") hard++;
  }
  const total = attempts.length || 1;
  return {
    easy: Math.round((easy / total) * 100),
    medium: Math.round((medium / total) * 100),
    hard: Math.round((hard / total) * 100),
  };
}

function AccuracyChart({ data }: { data: WeeklyAccuracy[] }) {
  if (data.length === 0) {
    return <p style={{ opacity: 0.5, fontSize: 14 }}>No practice data yet. Start solving to see your accuracy trend.</p>;
  }
  const maxAcc = 100;
  const barW = Math.min(40, Math.floor(280 / data.length));
  const chartH = 120;
  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={data.length * (barW + 12) + 20} height={chartH + 30}>
        {data.map((w, i) => {
          const h = (w.accuracy / maxAcc) * chartH;
          const x = i * (barW + 12) + 10;
          const color = w.accuracy >= 80 ? "#34d399" : w.accuracy >= 50 ? "#60a5fa" : "#f87171";
          return (
            <g key={w.weekLabel}>
              <rect x={x} y={chartH - h} width={barW} height={h} rx={4} fill={color} opacity={0.85} />
              <text x={x + barW / 2} y={chartH - h - 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="#333">
                {w.accuracy}%
              </text>
              <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={9} fill="#888">
                {w.weekLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function OverviewTab({ milestones, subjectTab, setSubjectTab }: {
  milestones: JourneyMilestone[];
  subjectTab: "Maths" | "Science";
  setSubjectTab: (s: "Maths" | "Science") => void;
}) {
  const topics = ALL_TOPICS_BY_SUBJECT[subjectTab] || [];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["Maths", "Science"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSubjectTab(s)}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              border: "none",
              background: subjectTab === s ? "#3b82f6" : "#f0f0f0",
              color: subjectTab === s ? "#fff" : "#333",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>Chapter Mastery</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
        {topics.map((tk) => {
          const pct = getTopicMasteryPercent(tk);
          const color = getMasteryColor(pct);
          return (
            <div
              key={tk}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "10px 6px",
                borderRadius: 12,
                background: "#fafafa",
                border: "1px solid #eee",
              }}
            >
              <MasteryRing percent={pct} size={52} color={color} />
              <span style={{ marginTop: 6, fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>
                {TOPIC_DISPLAY_NAMES[tk] || tk}
              </span>
            </div>
          );
        })}
      </div>

      {milestones.length > 0 && (
        <>
          <h3 style={{ fontWeight: 800, fontSize: 16, marginTop: 24, marginBottom: 12 }}>Your Journey</h3>
          <div style={{ position: "relative", paddingLeft: 24 }}>
            <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 3, background: "linear-gradient(to bottom, #3b82f6, #a78bfa)", borderRadius: 4 }} />
            {milestones.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, position: "relative" }}>
                <div style={{ position: "absolute", left: -20, width: 18, height: 18, borderRadius: "50%", background: "#fff", border: "3px solid #3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
                  {m.icon}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{m.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AchievementsTab({ earned }: { earned: EarnedBadge[] }) {
  const earnedIds = new Set(earned.map((b) => b.id));
  return (
    <div>
      <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>
        {earned.length} of {BADGE_DEFINITIONS.length} badges earned
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        {BADGE_DEFINITIONS.map((def) => {
          const isEarned = earnedIds.has(def.id);
          return (
            <div
              key={def.id}
              style={{
                padding: "14px 10px",
                borderRadius: 14,
                background: isEarned ? "#fffbeb" : "#f5f5f5",
                border: isEarned ? "2px solid #f59e0b" : "1px solid #e5e5e5",
                textAlign: "center",
                opacity: isEarned ? 1 : 0.5,
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 4 }}>{isEarned ? def.icon : "🔒"}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{def.name}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{def.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsTab({ badgeCtx }: { badgeCtx: BadgeContext }) {
  const weeklyData = useMemo(() => computeWeeklyAccuracy(), []);
  const diffProg = useMemo(() => computeDifficultyProgress(), []);
  const overallAccuracy = badgeCtx.totalQuestions > 0
    ? Math.round((badgeCtx.totalCorrect / badgeCtx.totalQuestions) * 100)
    : 0;

  const insights = loadInsights();
  const attempts = insights.attempts || [];

  const topicCounts: Record<string, { correct: number; total: number }> = {};
  for (const a of attempts) {
    const key = a.topicKey || "unknown";
    if (!topicCounts[key]) topicCounts[key] = { correct: 0, total: 0 };
    topicCounts[key].total++;
    if (a.correct) topicCounts[key].correct++;
  }

  const topicEntries = Object.entries(topicCounts).sort((a, b) => b[1].total - a[1].total);
  const strongest = topicEntries.find(([, v]) => v.total >= 3 && (v.correct / v.total) >= 0.7);
  const weakest = topicEntries.find(([, v]) => v.total >= 3 && (v.correct / v.total) < 0.5);

  const favSubject = (() => {
    let m = 0;
    let s = 0;
    for (const a of attempts) {
      if (a.subject === "maths") m++;
      else s++;
    }
    if (m === 0 && s === 0) return "N/A";
    return m >= s ? "Maths" : "Science";
  })();

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Questions Solved", value: String(badgeCtx.totalQuestions), color: "#3b82f6" },
          { label: "Overall Accuracy", value: `${overallAccuracy}%`, color: overallAccuracy >= 70 ? "#34d399" : "#f87171" },
          { label: "Topics Started", value: `${badgeCtx.topicsStarted} / ${badgeCtx.totalTopics}`, color: "#8b5cf6" },
          { label: "Topics Mastered", value: String(badgeCtx.topicsMastered), color: "#f59e0b" },
          { label: "Current Streak", value: `${badgeCtx.streak} days`, color: "#ef4444" },
          { label: "Days Active", value: String(badgeCtx.daysActive), color: "#06b6d4" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "14px 12px",
              borderRadius: 14,
              background: "#fafafa",
              border: "1px solid #eee",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.7, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>Strongest Topic</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            {strongest ? (TOPIC_DISPLAY_NAMES[strongest[0]] || strongest[0]) : "Keep practicing!"}
          </div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>Needs Work</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            {weakest ? (TOPIC_DISPLAY_NAMES[weakest[0]] || weakest[0]) : "Looking good!"}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 4 }}>Favorite Subject</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{favSubject}</div>
      </div>

      <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Weekly Accuracy</h3>
      <AccuracyChart data={weeklyData} />

      <h3 style={{ fontWeight: 800, fontSize: 16, marginTop: 20, marginBottom: 8 }}>Difficulty Breakdown</h3>
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "Easy", pct: diffProg.easy, color: "#34d399" },
          { label: "Medium", pct: diffProg.medium, color: "#60a5fa" },
          { label: "Hard", pct: diffProg.hard, color: "#f87171" },
        ].map((d) => (
          <div key={d.label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ height: 8, borderRadius: 4, background: "#eee", overflow: "hidden", marginBottom: 4 }}>
              <div style={{ height: "100%", width: `${d.pct}%`, background: d.color, borderRadius: 4, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: d.color }}>{d.pct}% {d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { statsByChapter } = useSmartLearning();
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [subjectTab, setSubjectTab] = useState<"Maths" | "Science">("Maths");

  const badgeCtx = useMemo(() => buildBadgeContext(), [statsByChapter]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const milestones = useMemo(() => buildJourneyMilestones(badgeCtx), [badgeCtx]);

  useEffect(() => {
    const uid = user?.uid || "";
    if (uid) {
      void syncBadgesToCloud(uid).then((badges) => {
        setEarnedBadges(badges);
        const ms = buildJourneyMilestones(badgeCtx);
        void saveLearnerProgress(uid, { badges, journeyMilestones: ms });
      });
    } else {
      const existing: EarnedBadge[] = [];
      try {
        const raw = localStorage.getItem("lazytopper.progress.snapshot.v1:anonymous");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed?.badges)) {
            existing.push(...parsed.badges);
          }
        }
      } catch {}
      const updated = evaluateBadges(badgeCtx, existing);
      setEarnedBadges(updated);
    }
  }, [badgeCtx, user?.uid]);

  const studentClass = profile?.studentClass || "10";
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Student";
  const examDate = (() => {
    try {
      const raw = localStorage.getItem(`lazytopper.cbseExamDate.official.${studentClass}`);
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.date) return p.date;
      }
    } catch {}
    return null;
  })();

  const daysLeft = examDate
    ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000))
    : profile?.daysLeft || 0;

  return (
    <div className="lt-page" style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{
        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
        borderRadius: 20,
        padding: "24px 20px",
        color: "#fff",
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 800,
          }}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{displayName}</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Class {studentClass} | Target: {profile?.targetPercent || "—"}%</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{badgeCtx.streak}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Day Streak</div>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{daysLeft}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Days to Exam</div>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{earnedBadges.length}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Badges</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "#f0f0f0", borderRadius: 12, padding: 3 }}>
        {(["overview", "achievements", "stats"] as ProfileTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 10,
              border: "none",
              background: tab === t ? "#fff" : "transparent",
              fontWeight: tab === t ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              color: tab === t ? "#333" : "#888",
              boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          milestones={milestones}
          subjectTab={subjectTab}
          setSubjectTab={setSubjectTab}
        />
      )}
      {tab === "achievements" && <AchievementsTab earned={earnedBadges} />}
      {tab === "stats" && <StatsTab badgeCtx={badgeCtx} />}

      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        style={{
          marginTop: 24,
          padding: "10px 20px",
          borderRadius: 20,
          border: "none",
          background: "#f0f0f0",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
