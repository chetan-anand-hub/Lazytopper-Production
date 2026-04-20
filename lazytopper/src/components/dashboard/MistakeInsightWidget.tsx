import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMistakeInsights, type MistakeInsights, type CheckerMistakeType } from "../../services/mistakeInsightsService";
import { useAuth } from "../../context/AuthContext";
import { useThemeColors } from "./dashboardUtils";

interface MistakeInsightWidgetProps {
  uid: string;
  gradeNum: string;
}

const MISTAKE_META: Record<CheckerMistakeType, { label: string; color: string; bg: string; emoji: string }> = {
  conceptual: { label: "Conceptual", color: "#ef4444", bg: "rgba(239,68,68,0.12)", emoji: "🧩" },
  calculation: { label: "Calculation", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", emoji: "🔢" },
  silly:       { label: "Silly",       color: "#f97316", bg: "rgba(249,115,22,0.12)", emoji: "⚠️" },
  presentation:{ label: "Presentation",color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  emoji: "✍️" },
};

const SUBJECT_ALIASES: Record<string, string> = {
  math: "Maths", mathematics: "Maths", maths: "Maths",
  science: "Science", sci: "Science",
};

function normalizeSubject(raw: string): string {
  return SUBJECT_ALIASES[raw.toLowerCase()] ?? raw;
}

export function MistakeInsightWidget({ uid, gradeNum }: MistakeInsightWidgetProps) {
  const { mistakeLogsHydrated } = useAuth();
  const tc = useThemeColors();
  const navigate = useNavigate();

  const [insights, setInsights] = useState<MistakeInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMistakeInsights(uid, 7)
      .then((data) => {
        if (!cancelled) {
          setInsights(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [uid, mistakeLogsHydrated]);

  if (loading || dismissed || !insights || !insights.hasEnoughData) return null;

  const { topMistakeType, totalMarksLost, topHotspot } = insights;
  if (!topMistakeType) return null;

  const meta = MISTAKE_META[topMistakeType];

  function handleFix() {
    if (topHotspot?.subject && topHotspot?.topic) {
      const subject = normalizeSubject(topHotspot.subject);
      navigate(
        `/practice/${gradeNum}/${subject}?topic=${encodeURIComponent(topHotspot.topic)}`,
        { state: { back: "/dashboard", backLabel: "Back to Dashboard" } }
      );
    } else {
      navigate("/profile", { state: { tab: "mistakes" } });
    }
  }

  return (
    <div
      style={{
        padding: "14px 16px",
        marginBottom: 16,
        borderRadius: 16,
        background: meta.bg,
        border: `1px solid ${meta.color}33`,
        position: "relative",
      }}
    >
      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "none",
          border: "none",
          color: tc.textMuted,
          cursor: "pointer",
          fontSize: 14,
          padding: "0 4px",
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>✏️</span>
        <span
          className="font-display"
          style={{ fontSize: 13, fontWeight: 800, color: meta.color, letterSpacing: 0.2 }}
        >
          Fix My Mistakes
        </span>
      </div>

      {/* Insight row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {/* Mistake type badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 9px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            background: meta.bg,
            color: meta.color,
            border: `1px solid ${meta.color}44`,
          }}
        >
          {meta.emoji} {meta.label}
        </span>

        {/* Marks lost */}
        {totalMarksLost > 0 && (
          <span style={{ fontSize: 12, color: tc.textSecondary }}>
            <span style={{ fontWeight: 700, color: tc.textPrimary }}>{totalMarksLost}</span>{" "}
            mark{totalMarksLost !== 1 ? "s" : ""} lost this week
          </span>
        )}

        {/* Hotspot topic */}
        {topHotspot?.topic && (
          <span
            style={{
              fontSize: 11,
              color: tc.textMuted,
              background: "rgba(0,0,0,0.06)",
              borderRadius: 8,
              padding: "2px 7px",
            }}
          >
            📍 {topHotspot.topic}
          </span>
        )}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleFix}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 16px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          background: meta.color,
          color: "#fff",
          border: "none",
          cursor: "pointer",
          letterSpacing: 0.1,
        }}
      >
        Fix this now →
      </button>
    </div>
  );
}
