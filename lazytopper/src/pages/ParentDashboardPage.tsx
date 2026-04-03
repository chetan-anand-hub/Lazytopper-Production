import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { loadInsights } from "../services/practiceInsights";
import { loadTopicMasterySnapshot } from "../services/topicHubMastery";
import { getWeakAreas, type WeakAreaSummary } from "../services/weakAreaAggregator";
import { useSmartLearning } from "../engine/smartLearningStore";
import { useAuth } from "../context/AuthContext";
import { getLatestMockScores, type MockScoreEntry } from "../services/mockScoreHistory";
import { getActiveProgressUser } from "../services/studentProgressStore";

const TOPIC_NAMES: Record<string, string> = {
  "real-numbers": "Real Numbers", polynomials: "Polynomials",
  "pair-of-linear-equations": "Linear Equations", "quadratic-equations": "Quadratic Equations",
  "arithmetic-progression": "Arithmetic Progression", triangles: "Triangles",
  "coordinate-geometry": "Coordinate Geometry", circles: "Circles",
  constructions: "Constructions", "areas-related-to-circles": "Areas & Circles",
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
  "constructions", "areas-related-to-circles", "surface-areas-and-volumes",
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
    value === 0 ? "#f5f5f5" :
    value < 25 ? "#fee2e2" :
    value < 50 ? "#fef3c7" :
    value < 75 ? "#d1fae5" :
    "#bbf7d0";
  const textColor = value === 0 ? "#ccc" : "#333";

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
  if (scores.length === 0) return <p style={{ color: "#888", fontSize: 13 }}>No mock tests taken yet.</p>;
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
            <text x={x + barW / 2} y={chartH - h - 3} textAnchor="middle" fontSize={9} fontWeight={700} fill="#333">
              {d.percent}%
            </text>
            <text x={x + barW / 2} y={chartH + 12} textAnchor="middle" fontSize={7} fill="#888">
              {dateLabel}
            </text>
            <text x={x + barW / 2} y={chartH + 22} textAnchor="middle" fontSize={7} fill="#aaa">
              {d.subject.slice(0, 4)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function WeeklyChart({ data }: { data: { week: string; accuracy: number; count: number }[] }) {
  if (data.length === 0) return <p style={{ color: "#888", fontSize: 13 }}>No data available yet.</p>;
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
            <text x={x + barW / 2} y={chartH - h - 3} textAnchor="middle" fontSize={9} fontWeight={700} fill="#333">
              {d.accuracy}%
            </text>
            <text x={x + barW / 2} y={chartH + 12} textAnchor="middle" fontSize={8} fill="#888">
              {d.week}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ParentDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { statsByChapter } = useSmartLearning();
  const [subjectTab, setSubjectTab] = useState<"Maths" | "Science">("Maths");
  const [shareLink, setShareLink] = useState("");

  const weakSummary = useMemo<WeakAreaSummary>(() => getWeakAreas({ limit: 10 }), []);
  const mockScores = useMemo(() => getLatestMockScores(10), []);

  const insights = useMemo(() => loadInsights(), []);
  const attempts = insights.attempts || [];

  const overallStats = useMemo(() => {
    let correct = 0;
    let total = 0;
    let totalTimeSeconds = 0;
    for (const a of attempts) {
      total++;
      if (a.correct) correct++;
    }
    for (const s of Object.values(statsByChapter || {})) {
      totalTimeSeconds += (s as { totalTimeSeconds?: number }).totalTimeSeconds || 0;
    }
    return {
      totalQuestions: total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      studyTimeMinutes: Math.round(totalTimeSeconds / 60),
    };
  }, [attempts, statsByChapter]);

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

  const handleCopyLink = () => {
    const uid = getActiveProgressUser();
    const shareToken = btoa(`lt:${uid}:${Date.now()}`);
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareToken}&student=${encodeURIComponent(user?.displayName || "Student")}`;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setShareLink("Link copied!");
      setTimeout(() => setShareLink(""), 2000);
    }).catch(() => setShareLink(shareUrl));
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="lt-page" style={{ paddingTop: 8 }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: "none", border: "none", color: "#1cb0f6", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 8, padding: 0 }}
      >
        &larr; Back
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>Progress Report</h2>
          <p style={{ color: "#888", fontSize: 13, margin: "4px 0 0" }}>
            {user?.displayName || "Student"} - Class 10
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleCopyLink}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "2px solid #e5e5e5",
              background: "#fff",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              color: "#333",
            }}
          >
            {shareLink || "Share Link"}
          </button>
          <button
            onClick={handlePrintReport}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "2px solid #1cb0f6",
              background: "#eff6ff",
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        <div style={{ padding: 14, borderRadius: 14, background: "#eff6ff", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#3b82f6" }}>{overallStats.totalQuestions}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>Questions Solved</div>
        </div>
        <div style={{ padding: 14, borderRadius: 14, background: overallStats.accuracy >= 70 ? "#f0fdf4" : "#fef2f2", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: overallStats.accuracy >= 70 ? "#22c55e" : "#ef4444" }}>
            {overallStats.accuracy}%
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>Accuracy</div>
        </div>
        <div style={{ padding: 14, borderRadius: 14, background: "#fffbeb", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#f59e0b" }}>{weakSummary.overallMasteryPercent}%</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>Overall Mastery</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Accuracy Trend</h3>
        <div style={{ overflowX: "auto" }}>
          <WeeklyChart data={weeklyAccuracy} />
        </div>
      </div>

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
              background: aboveBenchmark ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${aboveBenchmark ? "#bbf7d0" : "#fecaca"}`,
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
                  background: subjectTab === s ? "#1cb0f6" : "#f0f0f0",
                  color: subjectTab === s ? "#fff" : "#333",
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
            <HeatmapCell key={tk} value={getTopicMasteryPercent(tk)} label={TOPIC_NAMES[tk] || tk} />
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
                background: "#fef2f2",
                border: "1px solid #fecaca",
                marginBottom: 6,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{w.topicName}</div>
                <div style={{ fontSize: 11, color: "#888" }}>
                  {w.subject} - Accuracy: {w.accuracy}% - Mastery: {w.masteryPercent}%
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 40, height: 6, borderRadius: 3, background: "#fee2e2",
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
          <div style={{ padding: 12, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#888" }}>Total Study Time</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
              {overallStats.studyTimeMinutes >= 60
                ? `${Math.floor(overallStats.studyTimeMinutes / 60)}h ${overallStats.studyTimeMinutes % 60}m`
                : `${overallStats.studyTimeMinutes}m`}
            </div>
          </div>
          <div style={{ padding: 12, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#888" }}>Weak Areas Remaining</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "#ef4444" }}>
              {weakSummary.totalWeak}
            </div>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 24 }}>
        Generated by LazyTopper - CBSE Class 10 Board Prep
      </p>
    </div>
  );
}
