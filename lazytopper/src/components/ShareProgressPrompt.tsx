import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { loadInsights } from "../services/practiceInsights";
import { getWeakAreas } from "../services/weakAreaAggregator";
import { getLatestMockScores } from "../services/mockScoreHistory";
import { getWeeklyFocus } from "../services/focusTracker";

const DISMISS_KEY = "lazytopper.sharePrompt.dismissed";

function isDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < 24 * 3600000;
  } catch { return false; }
}

function dismissPrompt(): void {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

function buildWeeklySnapshot() {
  const weekly = getWeeklyFocus();
  const studyHours = Math.round((weekly.reduce((s, r) => s + r.totalMs, 0) / 3600000) * 10) / 10;
  const totalFocused = weekly.reduce((s, r) => s + r.focusedMs, 0);
  const totalSession = weekly.reduce((s, r) => s + r.totalMs, 0);
  const focusScore = totalSession > 60000 ? Math.round((totalFocused / totalSession) * 100) : 0;

  let streak = 0;
  try {
    const raw = localStorage.getItem("lazytopper.studySessions");
    if (raw) {
      const sessions = JSON.parse(raw);
      if (Array.isArray(sessions)) {
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          if (sessions.some((s: { date?: string }) => s.date === key)) streak++;
          else if (i > 0) break;
        }
      }
    }
  } catch {}

  const insights = loadInsights();
  const attempts = insights.attempts || [];
  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeekAttempts = attempts.filter(a => a.timestamp >= weekAgo);
  const thisWeekCorrect = thisWeekAttempts.filter(a => a.correct).length;
  const accuracy = thisWeekAttempts.length > 0 ? Math.round((thisWeekCorrect / thisWeekAttempts.length) * 100) : 0;

  const mockScores = getLatestMockScores(5).map(m => ({ subject: m.subject, percent: m.percent, timestamp: m.timestamp }));
  const weakSummary = getWeakAreas({ limit: 5 });
  const weakAreas = weakSummary.weakAreas.map(w => ({ topicName: w.topicName, subject: w.subject, accuracy: w.accuracy }));

  return { studyHours, focusScore, accuracy, streak, questionsThisWeek: thisWeekAttempts.length, topicsImproved: 0, mockScores, weakAreas };
}

interface ShareProgressPromptProps {
  triggerType: "mock" | "milestone";
  score?: number;
  subject?: string;
  milestone?: string;
}

export default function ShareProgressPrompt({ triggerType, score, subject, milestone }: ShareProgressPromptProps) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(!isDismissedRecently());
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  if (!visible) return null;

  const handleDismiss = () => {
    dismissPrompt();
    setVisible(false);
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const studentName = user?.displayName || "Student";
      const snapshot = buildWeeklySnapshot();
      const res = await fetch("/api/share-token", {
        method: "POST",
        headers,
        body: JSON.stringify({ studentName, weeklySnapshot: snapshot }),
      });
      const data = await res.json();
      if (data.ok && data.token) {
        const shareUrl = `${window.location.origin}/weekly-digest?share=${encodeURIComponent(data.token)}`;
        const shareText = triggerType === "mock"
          ? `I scored ${score}% in ${subject || "my mock test"} on LazyTopper! Check my progress: ${shareUrl}`
          : `${milestone || "I reached a new milestone"} on LazyTopper! ${shareUrl}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, "_blank");
        setShared(true);
        dismissPrompt();
      }
    } catch {}
    setSharing(false);
  };

  const message = triggerType === "mock"
    ? `You scored ${score}% in ${subject || "your mock"}!`
    : milestone || "You reached a new milestone!";

  return (
    <div style={{
      padding: "14px 16px", marginBottom: 16, borderRadius: 14,
      background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.06))",
      border: "1px solid rgba(34,197,94,0.2)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{ fontSize: 28, flexShrink: 0 }}>🎉</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{message}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Share your progress with your parents?</div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={handleShare} disabled={sharing || shared} style={{
            padding: "6px 14px", borderRadius: 8, border: "none",
            background: shared ? "rgba(34,197,94,0.2)" : "#22c55e",
            color: shared ? "#4ade80" : "#000",
            fontWeight: 700, fontSize: 11, cursor: sharing ? "default" : "pointer",
          }}>{shared ? "Shared!" : sharing ? "Sharing..." : "Share via WhatsApp"}</button>
          <button onClick={handleDismiss} style={{
            padding: "6px 14px", borderRadius: 8, border: "1px solid var(--bg-card-border)",
            background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, cursor: "pointer",
          }}>Not Now</button>
        </div>
      </div>
    </div>
  );
}
