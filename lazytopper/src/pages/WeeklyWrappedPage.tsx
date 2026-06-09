// LEGACY-RETIRED 2026-06-08 - disconnected from product; safe to delete in clean-branch pass.
import { useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { getAttempts } from "../services/practiceInsights";
import { generateWeeklyWrapped, type WeeklyWrappedSummary } from "../services/weeklyWrappedGenerator";
import { WeeklyWrappedCarousel } from "../components/WeeklyWrappedCarousel";
import { shareNodeAsImage } from "../utils/shareImage";
import { computeGlobalStreak, getUnlockedBadge, getNextBadge } from "../services/streakService";
import type { StudySessionLog } from "../services/sessionLogger";

const SESSION_LOG_KEY = "lazytopper.sessionLogs.v1";

function loadSessionLogs(): StudySessionLog[] {
  try {
    const raw = localStorage.getItem(SESSION_LOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function formatDateRange(startDate: string, endDate: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

function buildShareText(summary: WeeklyWrappedSummary, streakDays: number): string {
  const lines = [
    "📊 My LazyTopper Weekly Wrapped",
    "",
    `🎯 ${summary.totalAttempts} questions attempted`,
    `✅ ${Math.round(summary.accuracy * 100)}% accuracy`,
    `📅 ${summary.activeDays}/7 active days`,
    `⏱️ ${summary.estimatedStudyMinutes} min studied`,
    `🔥 ${streakDays} day streak`,
  ];

  if (summary.biggestWinTopic) {
    const name = (summary.biggestWinTopic.topicName || summary.biggestWinTopic.topicKey).replace(/-/g, " ");
    lines.push(`🏆 Most improved: ${name} (+${Math.round(summary.biggestWinTopic.delta * 100)}%)`);
  }

  lines.push("", "#LazyTopper #CBSE #NoZeroDays");
  return lines.join("\n");
}

export default function WeeklyWrappedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTarget = navState?.back || "/dashboard";
  const captureRef = useRef<HTMLDivElement | null>(null);

  const [end] = useState(() => Date.now());
  const start = end - 7 * 24 * 60 * 60 * 1000;
  const isSunday = useMemo(() => new Date(end).getDay() === 0, [end]);
  const [showEarly, setShowEarly] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copying" | "copied" | "error">("idle");

  const attempts = useMemo(() => getAttempts({ start, end }), [start, end]);
  const summary = useMemo(
    () => generateWeeklyWrapped(attempts, { start, end }),
    [attempts, start, end]
  );

  const sessionLogs = useMemo(() => loadSessionLogs(), []);
  const streakDays = useMemo(() => computeGlobalStreak(sessionLogs), [sessionLogs]);
  const currentBadge = useMemo(() => getUnlockedBadge(streakDays), [streakDays]);
  const nextBadge = useMemo(() => getNextBadge(streakDays), [streakDays]);

  const focusArea = useMemo(() => {
    if (!summary.topics.length) return null;
    const weakest = [...summary.topics].sort((a, b) => a.accuracy - b.accuracy)[0];
    return weakest && weakest.accuracy < 0.8 ? weakest : null;
  }, [summary]);

  const handleClose = () => navigate(backTarget);

  const handleShare = async () => {
    setShareStatus("copying");

    const text = buildShareText(summary, streakDays);
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2500);
      return;
    } catch {}

    const res = await shareNodeAsImage(captureRef.current, {
      fileName: "lazytopper-weekly-wrapped.png",
      title: "LazyTopper Weekly Wrapped",
      text,
    });

    if (res.ok) {
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2500);
    } else {
      setShareStatus("error");
      setTimeout(() => setShareStatus("idle"), 2500);
    }
  };

  const shouldShow = summary.totalAttempts > 0 && (isSunday || showEarly);

  return (
    <div className="lt-page" style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 26, margin: 0 }}>Weekly Wrapped</h1>
          <p style={{ opacity: 0.65, fontSize: 13, marginTop: 4 }}>
            {formatDateRange(summary.startDate, summary.endDate)}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            background: streakDays > 0 ? "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.12))" : "var(--bg-card)",
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          <span>{streakDays > 0 ? "🔥" : "💤"}</span>
          <span>{streakDays} day{streakDays !== 1 ? "s" : ""}</span>
          {currentBadge && (
            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>
              {currentBadge.name}
            </span>
          )}
        </div>
      </div>

      {summary.totalAttempts === 0 ? (
        <div
          style={{
            marginTop: 24,
            padding: 32,
            textAlign: "center",
            background: "linear-gradient(135deg, var(--bg-card), var(--bg-card))",
            borderRadius: 20,
            border: "1px solid var(--bg-card-border)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <h2 style={{ fontWeight: 800, fontSize: 20, margin: 0 }}>No study data this week</h2>
          <p style={{ opacity: 0.7, fontSize: 14, marginTop: 8 }}>
            Complete some Daily Mix sessions or practice questions to see your weekly progress!
          </p>
          <button
            type="button"
            onClick={() => navigate(backTarget)}
            style={{
              marginTop: 16,
              padding: "10px 24px",
              background: "#1cb0f6",
              color: "var(--text)",
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Start Practicing
          </button>
        </div>
      ) : !shouldShow ? (
        <div
          style={{
            marginTop: 24,
            padding: 28,
            background: "linear-gradient(135deg, #58cc02, #46a302)",
            borderRadius: 20,
            color: "var(--text)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔒</div>
          <h2 style={{ fontWeight: 900, fontSize: 20, margin: 0 }}>Your Wrapped unlocks Sunday</h2>
          <p style={{ opacity: 0.85, fontSize: 14, marginTop: 8 }}>
            Keep studying — your complete weekly story is being prepared.
          </p>
          <div
            style={{
              marginTop: 16,
              padding: "12px 20px",
              background: "var(--text-muted)",
              borderRadius: 12,
              display: "inline-flex",
              gap: 16,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span>{summary.totalAttempts} questions so far</span>
            <span>{summary.activeDays} active days</span>
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setShowEarly(true)}
              style={{
                padding: "10px 24px",
                background: "var(--text-muted)",
                color: "var(--text)",
                border: "1px solid var(--text-muted)",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Preview Now
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 10,
            }}
          >
            {[
              { label: "Questions", value: summary.totalAttempts, icon: "🎯" },
              { label: "Accuracy", value: `${Math.round(summary.accuracy * 100)}%`, icon: "✅" },
              { label: "Active Days", value: `${summary.activeDays}/7`, icon: "📅" },
              { label: "Study Time", value: `${summary.estimatedStudyMinutes}m`, icon: "⏱️" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: "14px 12px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--bg-card-border)",
                  borderRadius: 14,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 20 }}>{stat.icon}</div>
                <div style={{ fontWeight: 900, fontSize: 20, marginTop: 4 }}>{stat.value}</div>
                <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div id="weekly-wrapped-capture" ref={captureRef} style={{ marginTop: 16 }}>
            <WeeklyWrappedCarousel
              summary={summary}
              onClose={handleClose}
              onShare={handleShare}
            />
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {focusArea && (
              <div
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: 16,
                  background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.15))",
                  borderRadius: 14,
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b" }}>🎯 Next Week's Focus</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, textTransform: "capitalize", color: "#f59e0b" }}>
                  {(focusArea.topicName || focusArea.topicKey).replace(/-/g, " ")}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4, color: "#f59e0b" }}>
                  {Math.round(focusArea.accuracy * 100)}% accuracy — extra practice here will pay off big!
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/practice/10/${focusArea.subject || "Maths"}?topic=${encodeURIComponent(focusArea.topicKey)}`, { state: { back: "/weekly-wrapped", backLabel: "Back to Weekly Wrapped" } })}
                  style={{
                    marginTop: 10,
                    padding: "6px 16px",
                    background: "#b86800",
                    color: "var(--text)",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Practice Now →
                </button>
              </div>
            )}

            {nextBadge && (
              <div
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: 16,
                  background: "linear-gradient(135deg, rgba(56,189,248,0.08), rgba(56,189,248,0.12))",
                  borderRadius: 14,
                  border: "1px solid rgba(56,189,248,0.2)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: "#38bdf8" }}>🔥 Streak Goal</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, color: "#38bdf8" }}>
                  {nextBadge.name}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4, color: "#38bdf8" }}>
                  {nextBadge.requiredDays - streakDays} more day{nextBadge.requiredDays - streakDays !== 1 ? "s" : ""} to unlock!
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleShare}
              disabled={shareStatus === "copying"}
              style={{
                padding: "10px 24px",
                background: shareStatus === "copied" ? "#58cc02" : "#1cb0f6",
                color: "var(--text)",
                border: "none",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: shareStatus === "copying" ? "default" : "pointer",
                transition: "background 0.3s ease",
              }}
            >
              {shareStatus === "copying" ? "Copying..." :
               shareStatus === "copied" ? "✓ Copied to Clipboard!" :
               shareStatus === "error" ? "Try Again" :
               "📋 Copy Summary"}
            </button>
          </div>
        </>
      )}

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <button
          type="button"
          onClick={() => navigate(backTarget)}
          style={{
            padding: "8px 20px",
            background: "transparent",
            border: "1px solid var(--bg-card-border)",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          {navState?.backLabel || "Back to Dashboard"}
        </button>
      </div>
    </div>
  );
}
