import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { loadInsights } from "../services/practiceInsights";
import { getWeakAreas } from "../services/weakAreaAggregator";
import { getLatestMockScores } from "../services/mockScoreHistory";
import { getWeeklyFocus } from "../services/focusTracker";
import { useAuth } from "../context/AuthContext";
import ReturnContextBar from "../components/ux/ReturnContextBar";

function getStudyHoursThisWeek(): number {
  const weekly = getWeeklyFocus();
  const totalMs = weekly.reduce((s, r) => s + r.totalMs, 0);
  return Math.round((totalMs / 3600000) * 10) / 10;
}

function getFocusScoreThisWeek(): number {
  const weekly = getWeeklyFocus();
  const totalFocused = weekly.reduce((s, r) => s + r.focusedMs, 0);
  const totalSession = weekly.reduce((s, r) => s + r.totalMs, 0);
  return totalSession > 60000 ? Math.round((totalFocused / totalSession) * 100) : 0;
}

function getStreakFromStorage(): number {
  try {
    const raw = localStorage.getItem("lazytopper.studySessions");
    if (!raw) return 0;
    const sessions = JSON.parse(raw);
    if (!Array.isArray(sessions)) return 0;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const hasSession = sessions.some((s: { date?: string }) => s.date === key);
      if (hasSession) streak++;
      else if (i > 0) break;
    }
    return streak;
  } catch { return 0; }
}

export default function WeeklyDigestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentName = user?.displayName || "Student";

  const studyHours = useMemo(() => getStudyHoursThisWeek(), []);
  const focusScore = useMemo(() => getFocusScoreThisWeek(), []);
  const streak = useMemo(() => getStreakFromStorage(), []);
  const weakSummary = useMemo(() => getWeakAreas({ limit: 5 }), []);
  const mockScores = useMemo(() => getLatestMockScores(5), []);
  const insights = useMemo(() => loadInsights(), []);

  const attempts = insights.attempts || [];
  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeekAttempts = attempts.filter(a => a.timestamp >= weekAgo);
  const thisWeekCorrect = thisWeekAttempts.filter(a => a.correct).length;
  const thisWeekAccuracy = thisWeekAttempts.length > 0 ? Math.round((thisWeekCorrect / thisWeekAttempts.length) * 100) : 0;

  const topicsImproved = useMemo(() => {
    const byTopic = new Map<string, { old: number; recent: number; oldCount: number; recentCount: number }>();
    const midpoint = weekAgo + 3.5 * 86400000;
    for (const a of attempts.filter(att => att.timestamp >= weekAgo)) {
      const key = a.topicKey || "unknown";
      const entry = byTopic.get(key) || { old: 0, recent: 0, oldCount: 0, recentCount: 0 };
      if (a.timestamp < midpoint) {
        entry.oldCount++;
        if (a.correct) entry.old++;
      } else {
        entry.recentCount++;
        if (a.correct) entry.recent++;
      }
      byTopic.set(key, entry);
    }
    const improved: string[] = [];
    for (const [topic, data] of byTopic) {
      if (data.oldCount >= 2 && data.recentCount >= 2) {
        const oldAcc = data.old / data.oldCount;
        const recentAcc = data.recent / data.recentCount;
        if (recentAcc > oldAcc + 0.1) improved.push(topic);
      }
    }
    return improved;
  }, [attempts, weekAgo]);

  const shareText = `${studentName}'s Weekly Progress (LazyTopper):\n📚 ${studyHours}h studied\n🎯 ${thisWeekAccuracy}% accuracy\n🔥 ${streak}-day streak\n📝 ${mockScores.length} mock tests`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", paddingBottom: 80 }}>
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "16px 16px 32px" }}>
        <ReturnContextBar backTo="/dashboard" backLabel="Back to Dashboard" />

        <div style={{
          marginTop: 16, padding: "24px 20px", borderRadius: 20, textAlign: "center",
          background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.08))",
          border: "1px solid rgba(34,197,94,0.2)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>
            Weekly Progress Digest
          </h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            {studentName} — Week of {new Date(weekAgo).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} to {new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
          {[
            { label: "Hours Studied", value: `${studyHours}h`, icon: "📚", color: "#3b82f6" },
            { label: "Focus Score", value: `${focusScore}%`, icon: "🎯", color: focusScore >= 70 ? "#22c55e" : "#f97316" },
            { label: "Accuracy", value: `${thisWeekAccuracy}%`, icon: "✅", color: thisWeekAccuracy >= 70 ? "#22c55e" : "#ef4444" },
            { label: "Streak", value: `${streak} days`, icon: "🔥", color: "#f97316" },
          ].map((s) => (
            <div key={s.label} style={{
              padding: 16, borderRadius: 14, textAlign: "center",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div style={{ padding: 16, borderRadius: 14, textAlign: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📝</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#a855f7" }}>{thisWeekAttempts.length}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginTop: 2 }}>Questions This Week</div>
          </div>
          <div style={{ padding: 16, borderRadius: 14, textAlign: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📈</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e" }}>{topicsImproved.length}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginTop: 2 }}>Topics Improved</div>
          </div>
        </div>

        {mockScores.length > 0 && (
          <div style={{
            padding: "16px 18px", marginTop: 16, borderRadius: 16,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 10px", fontFamily: "'Space Grotesk', sans-serif" }}>
              Mock Test Scores
            </h3>
            {mockScores.map((m) => (
              <div key={m.id} style={{
                display: "flex", justifyContent: "space-between", padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{m.subject}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: m.percent >= 65 ? "#22c55e" : "#ef4444" }}>{m.percent}%</span>
              </div>
            ))}
          </div>
        )}

        {weakSummary.weakAreas.length > 0 && (
          <div style={{
            padding: "16px 18px", marginTop: 16, borderRadius: 16,
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 10px", fontFamily: "'Space Grotesk', sans-serif" }}>
              Weak Areas to Focus On
            </h3>
            {weakSummary.weakAreas.map((w) => (
              <div key={w.topicKey} style={{
                display: "flex", justifyContent: "space-between", padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{w.topicName} ({w.subject})</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#ef4444" }}>{w.accuracy}%</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 0", borderRadius: 12, border: "none", textDecoration: "none",
              background: "#25D366", color: "#fff", fontWeight: 800, fontSize: 14,
              fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            }}
          >
            Share via WhatsApp
          </a>
          <button
            onClick={() => navigate("/parent-dashboard", { state: { back: "/weekly-digest", backLabel: "Back to Digest" } })}
            style={{
              flex: 1, padding: "14px 0", borderRadius: 12,
              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
              color: "#60a5fa", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            Full Report
          </button>
        </div>
      </div>
    </div>
  );
}
