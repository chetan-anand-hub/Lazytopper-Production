import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loadInsights, type PracticeInsights } from "../services/practiceInsights";
import { loadTopicMasterySnapshot } from "../services/topicHubMastery";
import { getWeakAreas, type WeakAreaSummary } from "../services/weakAreaAggregator";
import { useSmartLearning } from "../engine/smartLearningStore";
import { useAuth } from "../context/AuthContext";
import { getLatestMockScores, type MockScoreEntry } from "../services/mockScoreHistory";
import { getWeeklyFocus } from "../services/focusTracker";
import { loadPaceProfile } from "../services/paceProfileService";

const TOPIC_NAMES: Record<string, string> = {
  "real-numbers": "Real Numbers", polynomials: "Polynomials",
  "pair-of-linear-equations": "Linear Equations", "quadratic-equations": "Quadratic Equations",
  "arithmetic-progression": "Arithmetic Progression", triangles: "Triangles",
  "coordinate-geometry": "Coordinate Geometry", circles: "Circles",
  "areas-related-to-circles": "Areas & Circles",
  "surface-areas-and-volumes": "Surface Area & Volumes", trigonometry: "Trigonometry",
  statistics: "Statistics", probability: "Probability",
  "chemical-reactions-equations": "Chemical Reactions", "acids-bases-salts": "Acids, Bases & Salts",
  "metals-non-metals": "Metals & Non-metals", "carbon-and-its-compounds": "Carbon Compounds",
  "life-processes": "Life Processes", "how-do-organisms-reproduce": "Reproduction",
  "human-eye-colourful-world": "Human Eye", electricity: "Electricity",
  "magnetic-effects-of-electric-current": "Magnetic Effects",
  "light-reflection-refraction": "Light & Refraction",
  "control-and-coordination": "Control & Coordination",
  "heredity-and-evolution": "Heredity & Evolution",
  "our-environment": "Our Environment",
};

const ALL_MATHS_TOPICS = [
  "real-numbers", "polynomials", "pair-of-linear-equations", "quadratic-equations",
  "arithmetic-progression", "triangles", "coordinate-geometry", "circles",
  "areas-related-to-circles", "surface-areas-and-volumes",
  "trigonometry", "statistics", "probability",
];

const ALL_SCIENCE_TOPICS = [
  "chemical-reactions-equations", "acids-bases-salts", "metals-non-metals",
  "carbon-and-its-compounds", "life-processes", "how-do-organisms-reproduce",
  "human-eye-colourful-world", "electricity", "magnetic-effects-of-electric-current",
  "light-reflection-refraction", "control-and-coordination", "heredity-and-evolution",
  "our-environment",
];

function getTopicMasteryPercent(topicKey: string): number {
  const snap = loadTopicMasterySnapshot(topicKey);
  if (!snap?.nodes) return 0;
  const nodes = Object.values(snap.nodes);
  if (nodes.length === 0) return 0;
  let score = 0;
  for (const n of nodes) {
    if (n.state === "mastered") score += 100;
    else if (n.state === "checkpoint_passed") score += 70;
    else if (n.state === "needs_practice") score += 40;
    else if (n.state === "learning") score += 20;
  }
  return Math.round(score / nodes.length);
}

function HeatmapCell({ value, label }: { value: number; label: string }) {
  const bg =
    value === 0 ? "var(--bg-card)" :
    value < 25 ? "rgba(239,68,68,0.15)" :
    value < 50 ? "rgba(245,158,11,0.15)" :
    value < 75 ? "rgba(34,197,94,0.15)" :
    "rgba(34,197,94,0.25)";
  const textColor = value === 0 ? "var(--text-muted)" : "var(--text)";

  return (
    <div
      style={{
        padding: "8px 4px",
        borderRadius: 8,
        background: bg,
        textAlign: "center",
        minWidth: 70,
      }}
      title={`${label}: ${value}%`}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: textColor }}>{value}%</div>
      <div style={{ fontSize: 9, fontWeight: 600, color: textColor, opacity: 0.7, marginTop: 2, lineHeight: 1.2 }}>
        {label}
      </div>
    </div>
  );
}

const CBSE_BENCHMARK_PERCENT = 65;

function MockScoreChart({ scores }: { scores: MockScoreEntry[] }) {
  if (scores.length === 0) return <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No mock tests taken yet.</p>;
  const sorted = [...scores].sort((a, b) => a.timestamp - b.timestamp).slice(-8);
  const barW = Math.min(36, Math.floor(280 / sorted.length));
  const chartH = 100;
  return (
    <svg width={sorted.length * (barW + 10) + 20} height={chartH + 28}>
      <line x1={0} y1={chartH - (CBSE_BENCHMARK_PERCENT / 100) * chartH} x2={sorted.length * (barW + 10) + 20} y2={chartH - (CBSE_BENCHMARK_PERCENT / 100) * chartH} stroke="#f59e0b" strokeDasharray="4,3" strokeWidth={1} />
      <text x={sorted.length * (barW + 10)} y={chartH - (CBSE_BENCHMARK_PERCENT / 100) * chartH - 3} fontSize={8} fill="#f59e0b">CBSE {CBSE_BENCHMARK_PERCENT}%</text>
      {sorted.map((d, i) => {
        const h = (d.percent / 100) * chartH;
        const x = i * (barW + 10) + 10;
        const color = d.percent >= CBSE_BENCHMARK_PERCENT ? "#22c55e" : d.percent >= 45 ? "#3b82f6" : "#ef4444";
        const dateLabel = new Date(d.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
        return (
          <g key={d.id}>
            <rect x={x} y={chartH - h} width={barW} height={h} rx={3} fill={color} opacity={0.8} />
            <text x={x + barW / 2} y={chartH - h - 3} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--text)">
              {d.percent}%
            </text>
            <text x={x + barW / 2} y={chartH + 12} textAnchor="middle" fontSize={7} fill="var(--text-muted)">
              {dateLabel}
            </text>
            <text x={x + barW / 2} y={chartH + 22} textAnchor="middle" fontSize={7} fill="var(--text-muted)">
              {d.subject.slice(0, 4)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DailyStudyChart() {
  const weekly = getWeeklyFocus();
  const last7: { day: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    const rec = weekly.find(r => r.date === key);
    last7.push({ day: label, minutes: rec ? Math.round(rec.totalMs / 60000) : 0 });
  }
  const maxMin = Math.max(...last7.map(d => d.minutes), 60);
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Daily Study Time (7 Days)</h3>
      <div style={{
        display: "flex", alignItems: "flex-end", gap: 6, height: 110, padding: 14, borderRadius: 14,
        background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
      }}>
        {last7.map((d) => {
          const h = maxMin > 0 ? Math.max(4, (d.minutes / maxMin) * 90) : 4;
          const color = d.minutes >= 60 ? "#22c55e" : d.minutes >= 30 ? "#3b82f6" : d.minutes > 0 ? "#f97316" : "var(--bg-card)";
          return (
            <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700 }}>{d.minutes > 0 ? `${d.minutes}m` : ""}</span>
              <div style={{ width: "100%", height: h, borderRadius: 4, background: color }} />
              <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ParentRecommendations({ weakAreas }: { weakAreas: { topicName: string; subject: string; accuracy: number }[] }) {
  const weekly = getWeeklyFocus();
  const avgMin = weekly.length > 0 ? Math.round(weekly.reduce((s, r) => s + r.totalMs, 0) / 60000 / 7) : 0;
  const recs: string[] = [];
  if (weakAreas.length > 0) {
    recs.push(`Encourage practice on "${weakAreas[0].topicName}" (${weakAreas[0].subject}) — accuracy is only ${weakAreas[0].accuracy}%.`);
  }
  if (weakAreas.length > 2) {
    recs.push(`There are ${weakAreas.length} weak areas. Focusing on one topic per day can help build momentum.`);
  }
  if (avgMin < 30) {
    recs.push("Study time is below 30 min/day this week. Encourage at least 1 hour of focused daily practice.");
  } else if (avgMin >= 90) {
    recs.push("Great consistency! Make sure breaks are being taken to avoid burnout.");
  }
  if (recs.length === 0) {
    recs.push("Your child is on track — keep encouraging consistent daily practice!");
  }
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>💡 Recommendations for You</h3>
      {recs.map((r, i) => (
        <div key={i} style={{
          padding: "10px 14px", marginBottom: 6, borderRadius: 10,
          background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
        }}>
          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, margin: 0 }}>{r}</p>
        </div>
      ))}
    </div>
  );
}

function FocusScoreTrend() {
  const weekly = getWeeklyFocus();
  const last7: { day: string; focusPct: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    const rec = weekly.find(r => r.date === key);
    const pct = rec && rec.totalMs > 60000 ? Math.round((rec.focusedMs / rec.totalMs) * 100) : 0;
    last7.push({ day: label, focusPct: pct });
  }
  const hasData = last7.some(d => d.focusPct > 0);
  if (!hasData) return null;

  const chartW = 260;
  const chartH = 80;
  const padL = 28;
  const padR = 8;
  const plotW = chartW - padL - padR;
  const stepX = plotW / 6;

  const points = last7.map((d, i) => ({
    x: padL + i * stepX,
    y: chartH - 4 - (d.focusPct / 100) * (chartH - 16),
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Focus Score Trend (7 Days)</h3>
      <div style={{
        padding: "12px 10px", borderRadius: 14,
        background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
        overflowX: "auto",
      }}>
        <svg width={chartW} height={chartH + 18} style={{ display: "block" }}>
          <line x1={padL} y1={chartH - 4 - 0.7 * (chartH - 16)} x2={chartW - padR} y2={chartH - 4 - 0.7 * (chartH - 16)} stroke="rgba(34,197,94,0.2)" strokeDasharray="3,3" strokeWidth={1} />
          <text x={padL - 4} y={chartH - 4 - 0.7 * (chartH - 16) + 3} textAnchor="end" fontSize={7} fill="rgba(34,197,94,0.5)">70%</text>
          <path d={linePath} fill="none" stroke="#a855f7" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3.5} fill={last7[i].focusPct >= 70 ? "#22c55e" : last7[i].focusPct >= 50 ? "#3b82f6" : "#f97316"} stroke="#0a0a0a" strokeWidth={1.5} />
              {last7[i].focusPct > 0 && (
                <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize={8} fontWeight={700} fill="var(--text)">{last7[i].focusPct}%</text>
              )}
              <text x={p.x} y={chartH + 12} textAnchor="middle" fontSize={7} fill="var(--text-muted)">{last7[i].day}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function getRecommendedDailyHours(): number {
  const pace = loadPaceProfile();
  if (!pace) return 2;
  if (pace.type === "crash") return 3;
  if (pace.type === "sprint") return 2;
  return 1.5;
}

function StudyHoursComparison() {
  const recommendedDailyHours = getRecommendedDailyHours();
  const pace = loadPaceProfile();
  const paceLabel = pace ? (pace.type === "crash" ? "Focus Mode" : pace.type === "sprint" ? "Focused Plan" : "Steady Plan") : "Default";
  const weekly = getWeeklyFocus();
  const last7: { day: string; actual: number; recommended: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    const rec = weekly.find(r => r.date === key);
    const hrs = rec ? Math.round((rec.totalMs / 3600000) * 10) / 10 : 0;
    last7.push({ day: label, actual: hrs, recommended: recommendedDailyHours });
  }
  const totalActual = last7.reduce((s, d) => s + d.actual, 0);
  const totalRecommended = last7.length * recommendedDailyHours;
  const pacePercent = totalRecommended > 0 ? Math.round((totalActual / totalRecommended) * 100) : 0;

  const maxH = Math.max(...last7.map(d => Math.max(d.actual, d.recommended)), recommendedDailyHours + 0.5);
  const barH = 70;

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Recommended vs Actual Study Hours</h3>
      <div style={{
        padding: "14px 10px", borderRadius: 14,
        background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: barH + 20 }}>
          {last7.map((d) => {
            const actualH = maxH > 0 ? Math.max(2, (d.actual / maxH) * barH) : 2;
            const recH = maxH > 0 ? (d.recommended / maxH) * barH : 0;
            return (
              <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative" }}>
                <span style={{ fontSize: 7, color: "var(--text-muted)", fontWeight: 700 }}>
                  {d.actual > 0 ? `${d.actual}h` : ""}
                </span>
                <div style={{ position: "relative", width: "100%" }}>
                  <div style={{
                    width: "100%", height: actualH, borderRadius: 3,
                    background: d.actual >= d.recommended ? "#22c55e" : d.actual > 0 ? "#f97316" : "var(--bg-card)",
                  }} />
                  <div style={{
                    position: "absolute", bottom: recH, left: 0, right: 0, height: 2,
                    background: "rgba(59,130,246,0.6)", borderRadius: 1,
                  }} />
                </div>
                <span style={{ fontSize: 7, color: "var(--text-muted)" }}>{d.day}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "#22c55e" }} />
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>Actual</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 2, background: "rgba(59,130,246,0.6)" }} />
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>Recommended ({recommendedDailyHours}h/day · {paceLabel})</span>
          </div>
        </div>
        <div style={{
          marginTop: 8, padding: "6px 10px", borderRadius: 8, textAlign: "center",
          background: pacePercent >= 80 ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
          border: `1px solid ${pacePercent >= 80 ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)"}`,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: pacePercent >= 80 ? "#22c55e" : "#f59e0b" }}>
            {pacePercent}% of recommended pace ({Math.round(totalActual * 10) / 10}h / {totalRecommended}h this week)
          </span>
        </div>
      </div>
    </div>
  );
}

function WeeklyFocusCard() {
  const weekly = getWeeklyFocus();
  if (weekly.length === 0) return null;
  const totalFocusedMs = weekly.reduce((s, r) => s + r.focusedMs, 0);
  const totalSessionMs = weekly.reduce((s, r) => s + r.totalMs, 0);
  if (totalSessionMs < 60_000) return null;
  const focusedHrs = (totalFocusedMs / 3_600_000).toFixed(1);
  const totalHrs = (totalSessionMs / 3_600_000).toFixed(1);
  const pct = Math.round((totalFocusedMs / totalSessionMs) * 100);
  const ringColor = pct >= 75 ? "#22c55e" : pct >= 50 ? "#3b82f6" : "#f97316";
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Focus This Week</h3>
      <div style={{
        display: "flex", alignItems: "center", gap: 16, padding: 16, borderRadius: 14,
        background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
      }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg width={52} height={52} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={26} cy={26} r={r} fill="none" stroke="var(--bg-card)" strokeWidth={4} />
            <circle cx={26} cy={26} r={r} fill="none" stroke={ringColor} strokeWidth={4}
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
          </svg>
          <span style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)", fontSize: 12, fontWeight: 800, color: ringColor,
          }}>{pct}%</span>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{focusedHrs} hrs active / {totalHrs} hrs total</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {pct >= 75 ? "Strong focus this week!" : pct >= 50 ? "Good effort — room to improve" : "Encourage fewer distractions during study"}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeeklyChart({ data }: { data: { week: string; accuracy: number; count: number }[] }) {
  if (data.length === 0) return <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No data available yet.</p>;
  const maxAcc = 100;
  const barW = Math.min(36, Math.floor(280 / data.length));
  const chartH = 100;
  return (
    <svg width={data.length * (barW + 10) + 20} height={chartH + 28}>
      {data.map((d, i) => {
        const h = (d.accuracy / maxAcc) * chartH;
        const x = i * (barW + 10) + 10;
        const color = d.accuracy >= 70 ? "#22c55e" : d.accuracy >= 50 ? "#3b82f6" : "#ef4444";
        return (
          <g key={d.week}>
            <rect x={x} y={chartH - h} width={barW} height={h} rx={3} fill={color} opacity={0.8} />
            <text x={x + barW / 2} y={chartH - h - 3} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--text)">
              {d.accuracy}%
            </text>
            <text x={x + barW / 2} y={chartH + 12} textAnchor="middle" fontSize={8} fill="var(--text-muted)">
              {d.week}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function parseShareParams(): { shareToken: string | null; studentName: string | null; sharedUid: string | null } {
  const params = new URLSearchParams(window.location.search);
  const shareToken = params.get("share");
  const studentName = params.get("student");
  return { shareToken, studentName, sharedUid: null };
}

interface SharedReportData {
  studentName: string;
  insights: PracticeInsights | null;
  mockScores: MockScoreEntry[];
  weakAreas: WeakAreaSummary | null;
  topicMastery: Record<string, number> | null;
}

async function fetchSharedReport(token: string): Promise<SharedReportData | null> {
  try {
    const res = await fetch(`/api/shared-report?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (data.ok) {
      return {
        studentName: data.studentName || "Student",
        insights: data.insights || null,
        mockScores: data.mockScores || [],
        weakAreas: data.weakAreas || null,
        topicMastery: data.topicMastery || null,
      };
    }
  } catch {}
  return null;
}

export default function ParentDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const { user } = useAuth();
  const { statsByChapter } = useSmartLearning();
  const [subjectTab, setSubjectTab] = useState<"Maths" | "Science">("Maths");
  const [shareLink, setShareLink] = useState("");

  const { shareToken } = parseShareParams();

  const [sharedReport, setSharedReport] = useState<SharedReportData | null>(null);
  const [shareVerified, setShareVerified] = useState(!shareToken);
  const [shareError, setShareError] = useState(false);

  useEffect(() => {
    if (!shareToken) return;
    fetchSharedReport(shareToken).then((result) => {
      if (result) {
        setSharedReport(result);
      } else {
        setShareError(true);
      }
      setShareVerified(true);
    });
  }, [shareToken]);

  const isSharedView = !!sharedReport;
  const displayName = isSharedView ? (sharedReport.studentName || "Student") : (user?.displayName || "Student");

  const weakSummary = useMemo<WeakAreaSummary>(() => {
    if (isSharedView) return sharedReport.weakAreas || { weakAreas: [], totalWeak: 0, closedThisWeek: 0, overallMasteryPercent: 0 };
    return getWeakAreas({ limit: 10 });
  }, [isSharedView, sharedReport]);

  const mockScores = useMemo(() => {
    if (isSharedView) return (sharedReport.mockScores || []).slice(0, 10);
    return getLatestMockScores(10);
  }, [isSharedView, sharedReport]);

  const insights = useMemo(() => {
    if (isSharedView) return sharedReport.insights || { attempts: [], totalCorrect: 0, totalAttempted: 0, subjects: {} } as PracticeInsights;
    return loadInsights();
  }, [isSharedView, sharedReport]);
  const attempts = insights.attempts || [];

  const sharedTopicMastery = isSharedView ? (sharedReport.topicMastery || {}) : null;

  const overallStats = useMemo(() => {
    let correct = 0;
    let total = 0;
    let totalTimeSeconds = 0;
    for (const a of attempts) {
      total++;
      if (a.correct) correct++;
    }
    if (!isSharedView) {
      for (const s of Object.values(statsByChapter || {})) {
        totalTimeSeconds += (s as { totalTimeSeconds?: number }).totalTimeSeconds || 0;
      }
    }
    return {
      totalQuestions: total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      studyTimeMinutes: Math.round(totalTimeSeconds / 60),
    };
  }, [attempts, statsByChapter, isSharedView]);

  const weeklyAccuracy = useMemo(() => {
    const byWeek = new Map<string, { correct: number; total: number }>();
    for (const a of attempts) {
      const d = new Date(a.timestamp);
      const ws = new Date(d);
      ws.setDate(d.getDate() - d.getDay());
      const key = `${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
      const e = byWeek.get(key) || { correct: 0, total: 0 };
      e.total++;
      if (a.correct) e.correct++;
      byWeek.set(key, e);
    }
    return Array.from(byWeek.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, v]) => ({
        week,
        accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
        count: v.total,
      }));
  }, [attempts]);

  const topicList = subjectTab === "Science" ? ALL_SCIENCE_TOPICS : ALL_MATHS_TOPICS;

  const buildSnapshotFromLocal = () => {
    const weekAgoTs = Date.now() - 7 * 86400000;
    const thisWeek = attempts.filter(a => a.timestamp >= weekAgoTs);
    const correct = thisWeek.filter(a => a.correct).length;
    const accuracy = thisWeek.length > 0 ? Math.round((correct / thisWeek.length) * 100) : 0;

    const focusData = getWeeklyFocus();
    const focusScore = focusData.length > 0
      ? Math.round(focusData.reduce((s, d) => s + (d.totalMs > 0 ? (d.focusedMs / d.totalMs) * 100 : 0), 0) / focusData.length)
      : 0;

    const studyRaw = localStorage.getItem("lazytopper.studyHoursThisWeek");
    const studyHours = studyRaw ? Math.round(Number(studyRaw) * 10) / 10 : 0;
    const streakRaw = localStorage.getItem("lazytopper.streak");
    let streak = 0;
    if (streakRaw) {
      try { streak = Number(JSON.parse(streakRaw)?.count || 0); } catch { streak = parseInt(streakRaw, 10) || 0; }
    }

    const byTopic = new Map<string, { old: number; recent: number; oldC: number; recC: number }>();
    const mid = weekAgoTs + 3.5 * 86400000;
    for (const a of thisWeek) {
      const k = a.topicKey || "unknown";
      const e = byTopic.get(k) || { old: 0, recent: 0, oldC: 0, recC: 0 };
      if (a.timestamp < mid) { e.oldC++; if (a.correct) e.old++; }
      else { e.recC++; if (a.correct) e.recent++; }
      byTopic.set(k, e);
    }
    const topicsImproved = Array.from(byTopic.values())
      .filter(d => d.oldC >= 2 && d.recC >= 2 && d.recent / d.recC > d.old / d.oldC + 0.1).length;

    return {
      studyHours, focusScore, accuracy, streak,
      questionsThisWeek: thisWeek.length, topicsImproved,
      mockScores: mockScores.slice(0, 5).map(m => ({ subject: m.subject, percent: m.percent, timestamp: m.timestamp })),
      weakAreas: (weakSummary.weakAreas || []).slice(0, 5).map(w => ({ topicName: TOPIC_NAMES[w.topicKey] || w.topicKey, subject: w.subject, accuracy: w.accuracy })),
    };
  };

  const handleCopyLink = async () => {
    const studentName = user?.displayName || "Student";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      const snapshot = buildSnapshotFromLocal();
      const res = await fetch("/api/share-token", {
        method: "POST",
        headers,
        body: JSON.stringify({ studentName, weeklySnapshot: snapshot }),
      });
      const data = await res.json();
      if (!data.ok || !data.token) {
        setShareLink("Failed to generate link");
        setTimeout(() => setShareLink(""), 2000);
        return;
      }
      const shareUrl = `${window.location.origin}/weekly-digest?share=${encodeURIComponent(data.token)}`;
      await navigator.clipboard?.writeText(shareUrl);
      setShareLink("Link copied!");
      setTimeout(() => setShareLink(""), 2000);
    } catch {
      setShareLink("Failed to generate link");
      setTimeout(() => setShareLink(""), 2000);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (!shareVerified) {
    return (
      <div className="lt-page" style={{ paddingTop: 40, textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 16 }}>Verifying share link...</p>
      </div>
    );
  }

  if (shareToken && shareError) {
    return (
      <div className="lt-page" style={{ paddingTop: 40, textAlign: "center" }}>
        <h2 style={{ color: "#e74c3c", fontWeight: 800 }}>Invalid or Expired Link</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>This share link is invalid or has expired. Please ask the student to generate a new one.</p>
      </div>
    );
  }

  return (
    <div className="lt-page" style={{ paddingTop: 8 }}>
      <button
        onClick={() => navigate(navState?.back || "/dashboard")}
        style={{ background: "none", border: "none", color: "#1cb0f6", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 8, padding: 0 }}
      >
        &larr; {navState?.backLabel || "Back"}
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>Progress Report</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "4px 0 0" }}>
            {displayName} - Class 10
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!isSharedView && (
            <button
              onClick={handleCopyLink}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "2px solid var(--bg-card-border)",
                background: "var(--bg-card)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                color: "var(--text)",
              }}
            >
              {shareLink || "Share Link"}
            </button>
          )}
          <button
            onClick={handlePrintReport}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "2px solid #1cb0f6",
              background: "rgba(59,130,246,0.08)",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              color: "#1cb0f6",
            }}
          >
            Print / PDF
          </button>
        </div>
      </div>

      {overallStats.totalQuestions === 0 && !isSharedView && (
        <div style={{ textAlign: "center", padding: "28px 16px", marginBottom: 20, background: "var(--bg-card-border)", borderRadius: 14, border: "1px solid var(--bg-card-border)" }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>📈</div>
          <h3 style={{ fontWeight: 800, fontSize: "1rem", margin: "0 0 4px" }}>No activity yet</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
            Once your child starts practicing, their accuracy trends, mock test scores, and chapter mastery will appear here.
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        <div style={{ padding: 14, borderRadius: 14, background: "rgba(59,130,246,0.08)", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#3b82f6" }}>{overallStats.totalQuestions}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Questions Solved</div>
        </div>
        <div style={{ padding: 14, borderRadius: 14, background: overallStats.accuracy >= 70 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: overallStats.accuracy >= 70 ? "#22c55e" : "#ef4444" }}>
            {overallStats.accuracy}%
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Accuracy</div>
        </div>
        <div style={{ padding: 14, borderRadius: 14, background: "rgba(245,158,11,0.08)", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#f59e0b" }}>{weakSummary.overallMasteryPercent}%</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Overall Mastery</div>
        </div>
      </div>

      <DailyStudyChart />

      <StudyHoursComparison />

      <FocusScoreTrend />

      <ParentRecommendations weakAreas={weakSummary.weakAreas} />

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Accuracy Trend</h3>
        <div style={{ overflowX: "auto" }}>
          <WeeklyChart data={weeklyAccuracy} />
        </div>
      </div>

      <WeeklyFocusCard />

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Mock Test Scores</h3>
        <div style={{ overflowX: "auto" }}>
          <MockScoreChart scores={mockScores} />
        </div>
        {mockScores.length > 0 && (() => {
          const avg = Math.round(mockScores.reduce((s, m) => s + m.percent, 0) / mockScores.length);
          const aboveBenchmark = avg >= CBSE_BENCHMARK_PERCENT;
          return (
            <div style={{
              marginTop: 10, padding: 10, borderRadius: 10,
              background: aboveBenchmark ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${aboveBenchmark ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: aboveBenchmark ? "#22c55e" : "#ef4444" }}>
                Average: {avg}% — {aboveBenchmark ? "Above" : "Below"} CBSE benchmark ({CBSE_BENCHMARK_PERCENT}%)
              </span>
            </div>
          );
        })()}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>Topic Mastery Heatmap</h3>
          <div style={{ display: "flex", gap: 6 }}>
            {(["Maths", "Science"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSubjectTab(s)}
                style={{
                  padding: "4px 12px", borderRadius: 16, border: "none",
                  background: subjectTab === s ? "#1cb0f6" : "var(--bg-card)",
                  color: subjectTab === s ? "#fff" : "var(--text)",
                  fontWeight: 600, fontSize: 11, cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 6 }}>
          {topicList.map((tk) => (
            <HeatmapCell key={tk} value={sharedTopicMastery ? (sharedTopicMastery[tk] ?? 0) : getTopicMasteryPercent(tk)} label={TOPIC_NAMES[tk] || tk} />
          ))}
        </div>
      </div>

      {weakSummary.weakAreas.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Weak Areas ({weakSummary.totalWeak})</h3>
          {weakSummary.weakAreas.slice(0, 5).map((w) => (
            <div
              key={w.topicKey}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                marginBottom: 6,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{w.topicName}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {w.subject} - Accuracy: {w.accuracy}% - Mastery: {w.masteryPercent}%
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 40, height: 6, borderRadius: 3, background: "rgba(239,68,68,0.1)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${w.masteryPercent}%`,
                      background: w.masteryPercent < 30 ? "#ef4444" : "#f59e0b",
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Study Summary</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ padding: 12, borderRadius: 12, background: "var(--bg-card-border)", border: "1px solid var(--bg-card-border)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Total Study Time</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
              {overallStats.studyTimeMinutes >= 60
                ? `${Math.floor(overallStats.studyTimeMinutes / 60)}h ${overallStats.studyTimeMinutes % 60}m`
                : `${overallStats.studyTimeMinutes}m`}
            </div>
          </div>
          <div style={{ padding: 12, borderRadius: 12, background: "var(--bg-card-border)", border: "1px solid var(--bg-card-border)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Weak Areas Remaining</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "#ef4444" }}>
              {weakSummary.totalWeak}
            </div>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 24 }}>
        Generated by LazyTopper - CBSE Class 10 Board Prep
      </p>
    </div>
  );
}
