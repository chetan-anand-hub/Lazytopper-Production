import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loadInsights } from "../services/practiceInsights";
import { getWeakAreas } from "../services/weakAreaAggregator";
import { getLatestMockScores } from "../services/mockScoreHistory";
import { getWeeklyFocus } from "../services/focusTracker";
import { useAuth } from "../context/AuthContext";
import ReturnContextBar from "../components/ux/ReturnContextBar";

function getStudyHoursThisWeek(): number {
  const weekly = getWeeklyFocus();
  return Math.round((weekly.reduce((s, r) => s + r.totalMs, 0) / 3600000) * 10) / 10;
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
      if (sessions.some((s: { date?: string }) => s.date === key)) streak++;
      else if (i > 0) break;
    }
    return streak;
  } catch { return 0; }
}

interface WeeklySnapshotData {
  studentName: string;
  studyHours: number;
  focusScore: number;
  accuracy: number;
  streak: number;
  questionsThisWeek: number;
  topicsImproved: number;
  mockScores: { subject: string; percent: number; timestamp: number }[];
  weakAreas: { topicName: string; subject: string; accuracy: number }[];
}

async function fetchSharedDigest(token: string): Promise<WeeklySnapshotData | null> {
  try {
    const res = await fetch(`/api/verify-share-token?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (data.ok && data.weeklySnapshot) {
      const ws = data.weeklySnapshot;
      return {
        studentName: data.studentName || "Student",
        studyHours: ws.studyHours || 0,
        focusScore: ws.focusScore || 0,
        accuracy: ws.accuracy || 0,
        streak: ws.streak || 0,
        questionsThisWeek: ws.questionsThisWeek || 0,
        topicsImproved: ws.topicsImproved || 0,
        mockScores: Array.isArray(ws.mockScores) ? ws.mockScores : [],
        weakAreas: Array.isArray(ws.weakAreas) ? ws.weakAreas : [],
      };
    }
    if (data.ok && !data.weeklySnapshot) {
      return {
        studentName: data.studentName || "Student",
        studyHours: 0, focusScore: 0, accuracy: 0, streak: 0,
        questionsThisWeek: 0, topicsImproved: 0, mockScores: [], weakAreas: [],
      };
    }
  } catch {}
  return null;
}

function buildWeeklySnapshot(): {
  studyHours: number; focusScore: number; accuracy: number;
  streak: number; questionsThisWeek: number; topicsImproved: number;
  mockScores: { subject: string; percent: number; timestamp: number }[];
  weakAreas: { topicName: string; subject: string; accuracy: number }[];
} {
  const studyHours = getStudyHoursThisWeek();
  const focusScore = getFocusScoreThisWeek();
  const streak = getStreakFromStorage();
  const insights = loadInsights();
  const attempts = insights.attempts || [];
  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeekAttempts = attempts.filter(a => a.timestamp >= weekAgo);
  const thisWeekCorrect = thisWeekAttempts.filter(a => a.correct).length;
  const accuracy = thisWeekAttempts.length > 0 ? Math.round((thisWeekCorrect / thisWeekAttempts.length) * 100) : 0;

  const byTopic = new Map<string, { old: number; recent: number; oldCount: number; recentCount: number }>();
  const midpoint = weekAgo + 3.5 * 86400000;
  for (const a of thisWeekAttempts) {
    const key = a.topicKey || "unknown";
    const entry = byTopic.get(key) || { old: 0, recent: 0, oldCount: 0, recentCount: 0 };
    if (a.timestamp < midpoint) { entry.oldCount++; if (a.correct) entry.old++; }
    else { entry.recentCount++; if (a.correct) entry.recent++; }
    byTopic.set(key, entry);
  }
  const topicsImproved = Array.from(byTopic.values()).filter(d => d.oldCount >= 2 && d.recentCount >= 2 && d.recent / d.recentCount > d.old / d.oldCount + 0.1).length;

  const mockScores = getLatestMockScores(5).map(m => ({ subject: m.subject, percent: m.percent, timestamp: m.timestamp }));
  const weakSummary = getWeakAreas({ limit: 5 });
  const weakAreas = weakSummary.weakAreas.map(w => ({ topicName: w.topicName, subject: w.subject, accuracy: w.accuracy }));

  return { studyHours, focusScore, accuracy, streak, questionsThisWeek: thisWeekAttempts.length, topicsImproved, mockScores, weakAreas };
}

export default function WeeklyDigestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get("share");
  const { user } = useAuth();

  const [sharedData, setSharedData] = useState<WeeklySnapshotData | null>(null);
  const [shareError, setShareError] = useState(false);
  const [shareVerifying, setShareVerifying] = useState(!!shareToken);

  useEffect(() => {
    if (!shareToken) return;
    fetchSharedDigest(shareToken).then((result) => {
      if (result) setSharedData(result);
      else setShareError(true);
      setShareVerifying(false);
    });
  }, [shareToken]);

  const isShared = !!sharedData;
  const isLocal = !shareToken;
  const studentName = isShared ? sharedData.studentName : (user?.displayName || "Student");

  const localSnapshot = useMemo(() => isLocal ? buildWeeklySnapshot() : null, [isLocal]);

  const studyHours = isShared ? sharedData.studyHours : (localSnapshot?.studyHours || 0);
  const focusScore = isShared ? sharedData.focusScore : (localSnapshot?.focusScore || 0);
  const streak = isShared ? sharedData.streak : (localSnapshot?.streak || 0);
  const thisWeekAccuracy = isShared ? sharedData.accuracy : (localSnapshot?.accuracy || 0);
  const questionsThisWeek = isShared ? sharedData.questionsThisWeek : (localSnapshot?.questionsThisWeek || 0);
  const topicsImproved = isShared ? sharedData.topicsImproved : (localSnapshot?.topicsImproved || 0);
  const mockScores = isShared ? sharedData.mockScores : (localSnapshot?.mockScores || []);
  const weakAreas = isShared ? sharedData.weakAreas : (localSnapshot?.weakAreas || []);

  const weekAgo = Date.now() - 7 * 86400000;

  const [generatingLink, setGeneratingLink] = useState(false);
  const [shareLink, setShareLink] = useState("");

  const handleGenerateShareLink = async () => {
    setGeneratingLink(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const snapshot = buildWeeklySnapshot();
      const res = await fetch("/api/share-token", {
        method: "POST",
        headers,
        body: JSON.stringify({ studentName, weeklySnapshot: snapshot }),
      });
      const data = await res.json();
      if (data.ok && data.token) {
        const url = `${window.location.origin}/weekly-digest?share=${encodeURIComponent(data.token)}`;
        await navigator.clipboard?.writeText(url);
        setShareLink(url);
      }
    } catch {}
    setGeneratingLink(false);
  };

  const [whatsAppGenerating, setWhatsAppGenerating] = useState(false);

  const handleWhatsAppShare = async () => {
    let url = shareLink;
    if (!url && isLocal) {
      setWhatsAppGenerating(true);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const snapshot = buildWeeklySnapshot();
        const res = await fetch("/api/share-token", {
          method: "POST",
          headers,
          body: JSON.stringify({ studentName, weeklySnapshot: snapshot }),
        });
        const data = await res.json();
        if (data.ok && data.token) {
          url = `${window.location.origin}/weekly-digest?share=${encodeURIComponent(data.token)}`;
          setShareLink(url);
        }
      } catch {}
      setWhatsAppGenerating(false);
    }
    const shareText = `${studentName}'s Weekly Progress (LazyTopper):\n📚 ${studyHours}h studied\n🎯 ${thisWeekAccuracy}% accuracy\n🔥 ${streak}-day streak\n📝 ${mockScores.length} mock tests`;
    const fullText = url ? shareText + `\n\nView full report: ${url}` : shareText;
    window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, "_blank");
  };

  if (shareVerifying) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Loading digest...</p>
      </div>
    );
  }

  if (shareToken && shareError) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#ef4444", margin: "0 0 8px" }}>Invalid or Expired Link</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>This share link is no longer valid.</p>
        </div>
      </div>
    );
  }

  if (!isLocal && !isShared) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 8px" }}>Weekly Digest</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sign in to view your weekly progress.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 80 }}>
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "16px 16px 32px" }}>
        {isLocal && <ReturnContextBar backTo="/dashboard" backLabel="Back to Dashboard" />}

        <div style={{
          marginTop: isLocal ? 16 : 0, padding: "24px 20px", borderRadius: 20, textAlign: "center",
          background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.08))",
          border: "1px solid rgba(34,197,94,0.2)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>
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
              background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div style={{ padding: 16, borderRadius: 14, textAlign: "center", background: "var(--bg-card)", border: "1px solid var(--bg-card-border)" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📝</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#a855f7" }}>{questionsThisWeek}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginTop: 2 }}>Questions This Week</div>
          </div>
          <div style={{ padding: 16, borderRadius: 14, textAlign: "center", background: "var(--bg-card)", border: "1px solid var(--bg-card-border)" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📈</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e" }}>{topicsImproved}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginTop: 2 }}>Topics Improved</div>
          </div>
        </div>

        {mockScores.length > 0 && (
          <div style={{
            padding: "16px 18px", marginTop: 16, borderRadius: 16,
            background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 10px", fontFamily: "'Space Grotesk', sans-serif" }}>
              Mock Test Scores
            </h3>
            {mockScores.map((m, idx) => (
              <div key={idx} style={{
                display: "flex", justifyContent: "space-between", padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.subject}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: m.percent >= 65 ? "#22c55e" : "#ef4444" }}>{m.percent}%</span>
              </div>
            ))}
          </div>
        )}

        {weakAreas.length > 0 && (
          <div style={{
            padding: "16px 18px", marginTop: 16, borderRadius: 16,
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 10px", fontFamily: "'Space Grotesk', sans-serif" }}>
              Weak Areas to Focus On
            </h3>
            {weakAreas.map((w, idx) => (
              <div key={idx} style={{
                display: "flex", justifyContent: "space-between", padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{w.topicName} ({w.subject})</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#ef4444" }}>{w.accuracy}%</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            onClick={handleWhatsAppShare}
            disabled={whatsAppGenerating}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 0", borderRadius: 12, border: "none", cursor: "pointer",
              background: "#25D366", color: "#fff", fontWeight: 800, fontSize: 14,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {whatsAppGenerating ? "Generating Link..." : "Share via WhatsApp"}
          </button>
          {isLocal && (
            <button
              onClick={handleGenerateShareLink}
              disabled={generatingLink}
              style={{
                flex: 1, padding: "14px 0", borderRadius: 12,
                background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                color: "#60a5fa", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >
              {shareLink ? "Link Copied!" : generatingLink ? "Generating..." : "Copy Share Link"}
            </button>
          )}
        </div>

        {isLocal && (
          <button
            onClick={() => navigate("/parent-dashboard", { state: { back: "/weekly-digest", backLabel: "Back to Digest" } })}
            style={{
              width: "100%", marginTop: 8, padding: "12px 0", borderRadius: 12,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: 12, cursor: "pointer",
            }}
          >
            View Full Parent Report
          </button>
        )}
      </div>
    </div>
  );
}
