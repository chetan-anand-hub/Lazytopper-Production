import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { UpgradeModal } from "../components/UpgradeModal";
import { useSmartLearning } from "../engine/smartLearningStore";
import { loadInsights } from "../services/practiceInsights";
import { loadTopicMasterySnapshot } from "../services/topicHubMastery";
import { hasParentPin, hashPin, saveParentPinHash, clearParentPin } from "../services/parentPinService";
import {
  loadPaceProfile,
  setManualOverride,
  clearManualOverride,
  getProfileConfig,
  type PaceProfileType,
  type StoredPaceProfile,
} from "../services/paceProfileService";
import { isFocusTrackingEnabled, setFocusTrackingEnabled } from "../services/focusTracker";
import { resetData as resetAllStudentData } from "../services/studentDataService";
import { getReferralData, getReferralLink, getWhatsAppShareUrl, generateQRDataUrl } from "../services/referralService";
import { useTheme, type AppTheme } from "../context/ThemeContext";
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

function MasteryRing({ level, size = 56 }: { level: MasteryLevel; size?: number }) {
  const color = MASTERY_COLORS[level];
  const fraction = MASTERY_RING_FRACTION[level];
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const filled = fraction * circ;
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
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
        y={size / 2 + 5}
        textAnchor="middle"
        fontSize={size < 50 ? 13 : 16}
        fontWeight={700}
        fill={color}
      >
        {MASTERY_ICONS[level]}
      </text>
    </svg>
  );
}

function getTopicMasteryLevel(topicKey: string, grade: string = "10", subject: string = "Maths"): MasteryLevel {
  const canonical = getChapterMasteryLevel(`${grade}-${subject}-${topicKey}`);
  if (canonical !== "not_started") return canonical;
  const snap = loadTopicMasterySnapshot(topicKey);
  if (!snap?.nodes) return "not_started";
  const nodes = Object.values(snap.nodes);
  if (nodes.length === 0) return "not_started";
  let score = 0;
  for (const n of nodes) {
    const st = (n as { state: string }).state;
    if (st === "mastered") score += 100;
    else if (st === "checkpoint_passed") score += 70;
    else if (st === "needs_practice") score += 40;
    else if (st === "learning") score += 20;
  }
  const percent = score / nodes.length;
  return masteryFromLegacyPercent(percent);
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

interface WeeklyDifficultyPoint {
  weekLabel: string;
  easyPct: number;
  medPct: number;
  hardPct: number;
}

function computeWeeklyDifficultyProgression(): WeeklyDifficultyPoint[] {
  const insights = loadInsights();
  const attempts = insights.attempts || [];
  if (attempts.length === 0) return [];

  const byWeek = new Map<string, { easy: number; med: number; hard: number; total: number }>();
  for (const a of attempts) {
    const d = new Date(a.timestamp);
    const ws = new Date(d);
    ws.setDate(d.getDate() - d.getDay());
    const key = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
    const e = byWeek.get(key) || { easy: 0, med: 0, hard: 0, total: 0 };
    e.total++;
    if (a.difficulty === "Easy") e.easy++;
    else if (a.difficulty === "Medium") e.med++;
    else if (a.difficulty === "Hard") e.hard++;
    byWeek.set(key, e);
  }

  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([k, v]) => ({
      weekLabel: k.slice(5),
      easyPct: v.total > 0 ? Math.round((v.easy / v.total) * 100) : 0,
      medPct: v.total > 0 ? Math.round((v.med / v.total) * 100) : 0,
      hardPct: v.total > 0 ? Math.round((v.hard / v.total) * 100) : 0,
    }));
}

function computeTotalTimeStudied(statsByChapter: Record<string, { totalTimeSeconds?: number }>): number {
  let total = 0;
  for (const s of Object.values(statsByChapter)) {
    total += s.totalTimeSeconds || 0;
  }
  return total;
}

function formatStudyTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

interface WeeklyTimePerQ {
  weekLabel: string;
  avgSeconds: number;
}

function computeWeeklyTimePerQuestion(statsByChapter: Record<string, { totalTimeSeconds?: number; totalQuestionsAttempted?: number; lastPracticedAt?: string }>): WeeklyTimePerQ[] {
  const byWeek = new Map<string, { totalTime: number; totalQ: number }>();
  for (const s of Object.values(statsByChapter)) {
    if (!s.lastPracticedAt || !s.totalQuestionsAttempted) continue;
    const d = new Date(s.lastPracticedAt);
    const ws = new Date(d);
    ws.setDate(d.getDate() - d.getDay());
    const key = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
    const e = byWeek.get(key) || { totalTime: 0, totalQ: 0 };
    e.totalTime += s.totalTimeSeconds || 0;
    e.totalQ += s.totalQuestionsAttempted || 0;
    byWeek.set(key, e);
  }

  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([k, v]) => ({
      weekLabel: k.slice(5),
      avgSeconds: v.totalQ > 0 ? Math.round(v.totalTime / v.totalQ) : 0,
    }));
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
              <text x={x + barW / 2} y={chartH - h - 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="rgba(255,255,255,0.85)">
                {w.accuracy}%
              </text>
              <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.45)">
                {w.weekLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function OverviewTab({ milestones, subjectTab, setSubjectTab, grade }: {
  milestones: JourneyMilestone[];
  subjectTab: "Maths" | "Science";
  setSubjectTab: (s: "Maths" | "Science") => void;
  grade: string;
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
              background: subjectTab === s ? "#1cb0f6" : "rgba(255,255,255,0.06)",
              color: subjectTab === s ? "#fff" : "rgba(255,255,255,0.85)",
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
      {topics.every((tk) => getTopicMasteryLevel(tk, grade, subjectTab) === "not_started") ? (
        <div style={{ textAlign: "center", padding: "24px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🌱</div>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", margin: "0 0 4px" }}>No mastery data yet</p>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.5 }}>
            Practice any chapter to start filling in your mastery grid. Every question counts!
          </p>
        </div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
        {topics.map((tk) => {
          const level = getTopicMasteryLevel(tk, grade, subjectTab);
          return (
            <div
              key={tk}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "10px 6px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${level !== "not_started" ? MASTERY_COLORS[level] + "30" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <MasteryRing level={level} size={52} />
              <span style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: MASTERY_COLORS[level] }}>
                {MASTERY_LABELS[level]}
              </span>
              <span style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>{MASTERY_POINTS[level]}pts</span>
              <span style={{ marginTop: 2, fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.2, color: "rgba(255,255,255,0.6)" }}>
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
            <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 3, background: "linear-gradient(to bottom, #58cc02, #1cb0f6)", borderRadius: 4 }} />
            {milestones.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, position: "relative" }}>
                <div style={{ position: "absolute", left: -20, width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "3px solid #1cb0f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
                  {m.icon}
                </div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{m.label}</span>
                  {m.date && <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 8 }}>{m.date}</span>}
                </div>
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
                background: isEarned ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.06)",
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

function StatsTab({ badgeCtx, statsByChapter }: { badgeCtx: BadgeContext; statsByChapter: Record<string, { totalTimeSeconds?: number; totalQuestionsAttempted?: number; lastPracticedAt?: string }> }) {
  const weeklyData = useMemo(() => computeWeeklyAccuracy(), []);
  const diffProg = useMemo(() => computeDifficultyProgress(), []);
  const weeklyDiffProg = useMemo(() => computeWeeklyDifficultyProgression(), []);
  const totalTimeSec = useMemo(() => computeTotalTimeStudied(statsByChapter), [statsByChapter]);
  const timePerQTrend = useMemo(() => computeWeeklyTimePerQuestion(statsByChapter), [statsByChapter]);
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

  if (badgeCtx.totalQuestions === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 16px" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📊</div>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 6 }}>
          Your stats will appear here
        </h3>
        <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.45)", marginBottom: 16, lineHeight: 1.5 }}>
          Start practicing any topic to see your accuracy, streak, mastery progress, and badges.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign("/trends/10/Maths")}
          style={{
            padding: "10px 24px", borderRadius: 12,
            background: "#58cc02", border: "none", borderBottom: "3px solid #46a302",
            color: "#fff", fontWeight: 800, fontSize: "0.88rem", cursor: "pointer",
          }}
        >
          Start Practicing
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Questions Solved", value: String(badgeCtx.totalQuestions), color: "#1cb0f6" },
          { label: "Overall Accuracy", value: `${overallAccuracy}%`, color: overallAccuracy >= 70 ? "#34d399" : "#f87171" },
          { label: "Total Time Studied", value: formatStudyTime(totalTimeSec), color: "#ff9600" },
          { label: "Topics Mastered", value: String(badgeCtx.topicsMastered), color: "#f59e0b" },
          { label: "Current Streak", value: `${badgeCtx.streak} days`, color: "#ef4444" },
          { label: "Days Active", value: String(badgeCtx.daysActive), color: "#06b6d4" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "14px 12px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.7, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>Strongest Topic</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            {strongest ? (TOPIC_DISPLAY_NAMES[strongest[0]] || strongest[0]) : "Keep practicing!"}
          </div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
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

      <h3 style={{ fontWeight: 800, fontSize: 16, marginTop: 20, marginBottom: 8 }}>Difficulty Progression (Weekly)</h3>
      {weeklyDiffProg.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Week</th>
                <th style={{ textAlign: "center", padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#34d399" }}>Easy</th>
                <th style={{ textAlign: "center", padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#60a5fa" }}>Medium</th>
                <th style={{ textAlign: "center", padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#f87171" }}>Hard</th>
              </tr>
            </thead>
            <tbody>
              {weeklyDiffProg.map((w) => (
                <tr key={w.weekLabel}>
                  <td style={{ padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{w.weekLabel}</td>
                  <td style={{ textAlign: "center", padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{w.easyPct}%</td>
                  <td style={{ textAlign: "center", padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{w.medPct}%</td>
                  <td style={{ textAlign: "center", padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{w.hardPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ opacity: 0.5, fontSize: 14 }}>Solve more questions to see your difficulty progression.</p>
      )}

      <h3 style={{ fontWeight: 800, fontSize: 16, marginTop: 20, marginBottom: 8 }}>Time per Question (Weekly)</h3>
      {timePerQTrend.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <svg width={timePerQTrend.length * 52 + 20} height={150}>
            {timePerQTrend.map((w, i) => {
              const maxSec = Math.max(...timePerQTrend.map((t) => t.avgSeconds), 1);
              const h = (w.avgSeconds / maxSec) * 110;
              const x = i * 52 + 10;
              return (
                <g key={w.weekLabel}>
                  <rect x={x} y={110 - h} width={36} height={h} rx={4} fill="#ff9600" opacity={0.75} />
                  <text x={x + 18} y={110 - h - 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="rgba(255,255,255,0.85)">
                    {w.avgSeconds}s
                  </text>
                  <text x={x + 18} y={130} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.45)">
                    {w.weekLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <p style={{ opacity: 0.5, fontSize: 14 }}>Practice more to see your speed improvement.</p>
      )}

      <h3 style={{ fontWeight: 800, fontSize: 16, marginTop: 20, marginBottom: 8 }}>Overall Difficulty Mix</h3>
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "Easy", pct: diffProg.easy, color: "#34d399" },
          { label: "Medium", pct: diffProg.medium, color: "#60a5fa" },
          { label: "Hard", pct: diffProg.hard, color: "#f87171" },
        ].map((d) => (
          <div key={d.label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 4 }}>
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
  const location = useLocation();
  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const { profile } = useProfile();
  const { user, logout } = useAuth();
  const { statsByChapter } = useSmartLearning();
  const sub = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
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
        background: "linear-gradient(135deg, #58cc02 0%, #1cb0f6 100%)",
        borderRadius: 16,
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

      <div style={{
        borderRadius: 14, padding: "14px 16px", marginBottom: 20,
        border: "2px solid",
        borderColor: sub.tier === "premium" ? "#58cc02" : sub.isTrialActive ? "#1cb0f6" : "rgba(255,255,255,0.08)",
        background: sub.tier === "premium" ? "rgba(34,197,94,0.08)" : sub.isTrialActive ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.03)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "rgba(255,255,255,0.85)" }}>
            {sub.tier === "premium" ? "Premium" : sub.isTrialActive ? "Trial" : "Free Plan"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
            {sub.tier === "premium"
              ? "Full access to all features"
              : sub.isTrialActive
                ? `${sub.daysLeftInTrial} day${sub.daysLeftInTrial !== 1 ? "s" : ""} remaining in trial`
                : sub.isTrialExpired
                  ? "Trial ended — upgrade to continue"
                  : "Limited features available"}
          </div>
        </div>
        {sub.tier !== "premium" && (
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            style={{
              border: "none", borderBottom: "3px solid #46a302", borderRadius: 12,
              padding: "8px 16px", background: "#58cc02", color: "#fff",
              fontWeight: 800, fontSize: "0.82rem", cursor: "pointer",
              textTransform: "uppercase", whiteSpace: "nowrap",
            }}
          >
            {sub.isTrialExpired ? "Upgrade" : "Go Premium"}
          </button>
        )}
      </div>

      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

      <ReferralSection />

      <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 3 }}>
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
              background: tab === t ? "rgba(255,255,255,0.1)" : "transparent",
              fontWeight: tab === t ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              color: tab === t ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)",
              boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
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
          grade={String((studentClass || "").replace(/\D/g, "")) || "10"}
        />
      )}
      {tab === "achievements" && <AchievementsTab earned={earnedBadges} />}
      {tab === "stats" && <StatsTab badgeCtx={badgeCtx} statsByChapter={statsByChapter} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate("/weak-area-practice", { state: { back: "/profile", backLabel: "Back to Profile" } })}
            style={{
              flex: 1,
              padding: "12px 20px",
              borderRadius: 16,
              border: "none",
              background: "#ff9600",
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "0 3px 0 #cc7a00",
            }}
          >
            Fix My Weak Areas
          </button>
          <button
            type="button"
            onClick={() => navigate("/parent-dashboard", { state: { back: "/profile", backLabel: "Back to Profile" } })}
            style={{
              flex: 1,
              padding: "12px 20px",
              borderRadius: 16,
              border: "2px solid #1cb0f6",
              background: "rgba(255,255,255,0.03)",
              color: "#1cb0f6",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Share Report
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate(navState?.back || "/dashboard")}
          style={{
            flex: 1,
            padding: "10px 20px",
            borderRadius: 16,
            border: "none",
            background: "rgba(255,255,255,0.06)",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {navState?.backLabel || "Back to Dashboard"}
        </button>
        {user && (
          <button
            type="button"
            onClick={async () => {
              try {
                resetAllStudentData();
                await logout();
              } catch {}
              window.location.href = "/login";
            }}
            style={{
              padding: "10px 20px",
              borderRadius: 16,
              border: "2px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              color: "#ff4b4b",
            }}
          >
            Log out
          </button>
        )}
      </div>

      <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "2px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 6 }}>Study Mode</div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["beast", "zombie"] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem("vibeMode", m);
                  window.location.reload();
                } catch {}
              }}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 10, border: "none",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                background: (localStorage.getItem("vibeMode") || "") === m ? "#58cc02" : "rgba(255,255,255,0.08)",
                color: (localStorage.getItem("vibeMode") || "") === m ? "#fff" : "rgba(255,255,255,0.85)",
              }}
            >
              {m === "beast" ? "🔥 Challenge" : "😌 Relaxed"}
            </button>
          ))}
        </div>
      </div>

      <ThemeToggle />

      <FocusTrackingToggle />

      <CountdownToggle />

      <PaceProfileSelector />

      <NightBeforeLink />

      <ParentPinManager />

      <button
        type="button"
        onClick={() => navigate("/weekly-digest")}
        style={{
          width: "100%", marginTop: 16, padding: "14px 16px", borderRadius: 12,
          background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 18 }}>📊</span>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>Weekly Progress Digest</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>View and share your weekly summary</div>
        </div>
      </button>

      <MentalHealthResources />
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "2px solid rgba(255,255,255,0.08)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 6 }}>Appearance</div>
      <div style={{ display: "flex", gap: 8 }}>
        {([
          { value: "dark" as AppTheme, label: "Dark", icon: "🌙" },
          { value: "light" as AppTheme, label: "Light", icon: "☀️" },
        ]).map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 10, border: "none",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              background: theme === opt.value ? "#58cc02" : "rgba(255,255,255,0.08)",
              color: theme === opt.value ? "#fff" : "rgba(255,255,255,0.85)",
            }}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FocusTrackingToggle() {
  const [enabled, setEnabled] = useState(isFocusTrackingEnabled);
  return (
    <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "2px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>Focus Tracking</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Track active vs idle study time</div>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !enabled;
            setFocusTrackingEnabled(next);
            setEnabled(next);
          }}
          style={{
            width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
            background: enabled ? "#22c55e" : "rgba(255,255,255,0.15)",
            position: "relative", transition: "background 0.2s",
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: "50%", background: "#fff",
            position: "absolute", top: 3,
            left: enabled ? 25 : 3, transition: "left 0.2s",
          }} />
        </button>
      </div>
    </div>
  );
}

function PaceProfileSelector() {
  const [paceProfile, setPaceProfile] = useState<StoredPaceProfile | null>(() => loadPaceProfile());
  if (!paceProfile) return null;
  const profileColors: Record<string, string> = { marathon: "#3b82f6", sprint: "#f97316", crash: "#ef4444" };
  return (
    <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "2px solid rgba(255,255,255,0.08)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>Study Pace</div>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 10, lineHeight: 1.4 }}>
        {paceProfile.isManualOverride
          ? `Manual override active. Auto-detected: ${getProfileConfig(paceProfile.detectedType).label}.`
          : `Auto-detected from ${paceProfile.daysLeft} days until exam.`}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {(["marathon", "sprint", "crash"] as PaceProfileType[]).map((pt) => {
          const color = profileColors[pt];
          const cfg = getProfileConfig(pt);
          const isActive = paceProfile.type === pt;
          return (
            <button key={pt} type="button" onClick={() => {
              const updated = setManualOverride(pt);
              setPaceProfile(updated);
            }} style={{
              flex: 1, padding: "8px 4px", borderRadius: 10,
              border: isActive ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
              background: isActive ? `${color}15` : "rgba(255,255,255,0.08)",
              cursor: "pointer",
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: isActive ? color : "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
                {cfg.label}
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{cfg.tagline}</div>
            </button>
          );
        })}
      </div>
      {paceProfile.isManualOverride && (
        <button type="button" onClick={() => {
          const updated = clearManualOverride();
          if (updated) setPaceProfile(updated);
        }} style={{
          marginTop: 8, padding: "6px 12px", borderRadius: 8, border: "none",
          background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)",
          fontSize: 11, fontWeight: 600, cursor: "pointer", width: "100%",
        }}>
          Reset to auto-detect
        </button>
      )}
    </div>
  );
}

const COUNTDOWN_KEY = "lazytopper.hideCountdown";

function isCountdownHidden(): boolean {
  try {
    const stored = localStorage.getItem(COUNTDOWN_KEY);
    if (stored !== null) return stored === "1";
    const profile = loadPaceProfile();
    if (profile && (profile.type === "crash" || profile.type === "sprint")) return true;
    return false;
  } catch { return false; }
}

function CountdownToggle() {
  const [hidden, setHidden] = useState(isCountdownHidden);
  return (
    <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "2px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>Hide Countdown</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Hide "days left" from Dashboard</div>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !hidden;
            try { localStorage.setItem(COUNTDOWN_KEY, next ? "1" : "0"); } catch {}
            setHidden(next);
          }}
          style={{
            width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
            background: hidden ? "#22c55e" : "rgba(255,255,255,0.15)",
            position: "relative", transition: "background 0.2s",
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: "50%", background: "#fff",
            position: "absolute", top: 3,
            left: hidden ? 25 : 3, transition: "left 0.2s",
          }} />
        </button>
      </div>
    </div>
  );
}

function NightBeforeLink() {
  const navigate = useNavigate();
  return (
    <div style={{ marginTop: 16 }}>
      <button type="button" onClick={() => navigate("/night-before")} style={{
        width: "100%", padding: "14px 16px", borderRadius: 12, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 12,
        background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
      }}>
        <span style={{ fontSize: 20 }}>🌙</span>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>Night Before Exam</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Key formulas, top predicted questions & exam tips</div>
        </div>
      </button>
    </div>
  );
}

function ParentPinManager() {
  const { profile, setProfileAndCompute } = useProfile();
  const [hasPinState, setHasPinState] = useState(hasParentPin);
  const [editing, setEditing] = useState(false);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [saved, setSaved] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigit = (idx: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[idx] = value;
    setDigits(next);
    if (value && idx < 3) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  const handleSave = async () => {
    const full = digits.join("");
    if (full.length !== 4) return;
    const hash = await hashPin(full);
    saveParentPinHash(hash);
    if (profile) {
      setProfileAndCompute({ ...profile, parentPinHash: hash });
    }
    setHasPinState(true);
    setEditing(false);
    setDigits(["", "", "", ""]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRemove = () => {
    clearParentPin();
    if (profile) {
      const next = { ...profile };
      delete next.parentPinHash;
      setProfileAndCompute(next);
    }
    setHasPinState(false);
    setEditing(false);
  };

  return (
    <div style={{ marginTop: 16, padding: "14px 16px", background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "2px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🔑</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>Parent PIN</span>
        </div>
        {hasPinState && !editing && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "#22c55e" }}>Active</span>
        )}
      </div>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 10px", lineHeight: 1.4 }}>
        {hasPinState ? "Your parents can access progress at /parent using this PIN." : "Set a 4-digit PIN so parents can check your progress."}
      </p>
      {saved && <p style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, margin: "0 0 8px" }}>PIN saved!</p>}
      {editing ? (
        <div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
            {digits.map((d, i) => (
              <input key={i} ref={(el) => { refs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1}
                value={d} onChange={(e) => handleDigit(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)}
                style={{
                  width: 40, height: 44, textAlign: "center", fontSize: 20, fontWeight: 800,
                  borderRadius: 10, border: "2px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)", color: "#fff", outline: "none",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={handleSave} disabled={digits.join("").length !== 4} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
              background: digits.join("").length === 4 ? "#22c55e" : "rgba(255,255,255,0.06)",
              color: digits.join("").length === 4 ? "#000" : "rgba(255,255,255,0.3)",
              fontWeight: 700, fontSize: 11, cursor: "pointer",
            }}>Save PIN</button>
            <button type="button" onClick={() => { setEditing(false); setDigits(["", "", "", ""]); }} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent", color: "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: 11, cursor: "pointer",
            }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => setEditing(true)} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
            background: hasPinState ? "rgba(59,130,246,0.1)" : "#a855f7",
            color: hasPinState ? "#60a5fa" : "#fff",
            fontWeight: 700, fontSize: 11, cursor: "pointer",
          }}>{hasPinState ? "Change PIN" : "Set PIN"}</button>
          {hasPinState && (
            <button type="button" onClick={handleRemove} style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.06)", color: "#f87171",
              fontWeight: 600, fontSize: 11, cursor: "pointer",
            }}>Remove</button>
          )}
        </div>
      )}
    </div>
  );
}

function MentalHealthResources() {
  return (
    <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "2px solid rgba(255,255,255,0.08)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 8 }}>Feeling overwhelmed?</div>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, margin: "0 0 12px" }}>
        Board exams can be stressful — it's perfectly okay to ask for help.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <a href="tel:9152987821" style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
          borderRadius: 10, textDecoration: "none",
        }}>
          <span style={{ fontSize: 18 }}>📞</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa" }}>iCall — TISS</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>9152987821 · Mon–Sat 8am–10pm</div>
          </div>
        </a>
        <a href="tel:18602662345" style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)",
          borderRadius: 10, textDecoration: "none",
        }}>
          <span style={{ fontSize: 18 }}>💜</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#c084fc" }}>Vandrevala Foundation</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>1860-2662-345 · 24/7</div>
          </div>
        </a>
      </div>
    </div>
  );
}

function ReferralSection() {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const referral = useMemo(() => getReferralData(), []);
  const link = getReferralLink(referral.code);
  const whatsappUrl = getWhatsAppShareUrl(referral.code);

  useEffect(() => {
    generateQRDataUrl(link, 200).then(setQrDataUrl).catch(() => {});
  }, [link]);
  const progress = Math.min(referral.referrals.length, 3);
  const earned = referral.rewardWeeksEarned > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div style={{
      borderRadius: 14, padding: "16px", marginBottom: 20,
      background: "linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(59,130,246,0.06) 100%)",
      border: "1px solid rgba(168,85,247,0.15)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>🎁</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#c084fc" }}>Invite Friends</div>
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)" }}>
            Invite 3 friends, get 1 week Premium free!
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            flex: 1, height: 6, borderRadius: 999,
            background: i < progress ? "#a855f7" : "rgba(255,255,255,0.08)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>
      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
        {progress}/3 friends joined
        {earned && <span style={{ color: "#22c55e", marginLeft: 8 }}>🎉 {referral.rewardWeeksEarned} week{referral.rewardWeeksEarned > 1 ? "s" : ""} earned!</span>}
      </div>

      <div style={{
        padding: "8px 12px", borderRadius: 10,
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        fontFamily: "monospace", fontSize: "0.88rem", color: "#c084fc",
        fontWeight: 700, marginBottom: 10, textAlign: "center", letterSpacing: 2,
      }}>
        {referral.code}
      </div>

      {showQR && qrDataUrl && (
        <div style={{
          display: "flex", justifyContent: "center", marginBottom: 12,
          padding: 12, borderRadius: 10, background: "#fff",
        }}>
          <img src={qrDataUrl} alt="Referral QR Code" width={160} height={160} />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 12px", borderRadius: 10,
            background: "#25D366", border: "none",
            color: "#fff", fontWeight: 700, fontSize: "0.78rem",
            textDecoration: "none", cursor: "pointer",
          }}
        >
          WhatsApp
        </a>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: copied ? "#22c55e" : "rgba(255,255,255,0.7)",
            fontWeight: 700, fontSize: "0.78rem", cursor: "pointer",
          }}
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          type="button"
          onClick={() => setShowQR(q => !q)}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 12px", borderRadius: 10,
            background: showQR ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: showQR ? "#c084fc" : "rgba(255,255,255,0.7)",
            fontWeight: 700, fontSize: "0.78rem", cursor: "pointer",
          }}
        >
          QR Code
        </button>
      </div>
    </div>
  );
}
