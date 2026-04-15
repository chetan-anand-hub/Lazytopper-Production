import { useThemeColors } from "./dashboardUtils";
import {
  getPhaseLabel,
  getPhaseProgressText,
  type GuidedJourneyState,
  type JourneyPhase,
} from "../../services/guidedJourneyService";

export interface JourneyCardProps {
  journeyState: GuidedJourneyState;
  raviMessage: string;
  journeyProgress: { percent: number; completed: number; total: number };
  onContinue: () => void;
  onComplete?: () => void;
}

export function JourneyCard({ journeyState, raviMessage, journeyProgress, onContinue, onComplete }: JourneyCardProps) {
  const tc = useThemeColors();
  if (!journeyState.currentChapter) return null;
  const chapter = journeyState.currentChapter;
  return (
    <div style={{ padding: 20, marginBottom: 16, background: tc.isDark ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.04)", border: `1px solid ${tc.isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.2)"}`, borderRadius: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #22c55e, #3b82f6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 800, color: "var(--text)", flexShrink: 0,
        }}>R</div>
        <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>Ravi Sir's Recommendation</span>
      </div>

      <p style={{ fontSize: 13, color: tc.textSecondary, lineHeight: 1.5, marginBottom: 12, fontStyle: journeyState.detour ? "italic" : "normal" }}>
        "{raviMessage}"
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div className="font-display" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: tc.textPrimary }}>{chapter.title}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(["learn", "practice", "mock", "review"] as JourneyPhase[]).map((p) => {
              const isCurrent = chapter.phase === p;
              const phaseIdx = ["learn", "practice", "mock", "review"].indexOf(p);
              const currentIdx = ["learn", "practice", "mock", "review"].indexOf(chapter.phase);
              const isDone = phaseIdx < currentIdx;
              return (
                <span key={p} style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                  background: isCurrent ? "rgba(34,197,94,0.2)" : isDone ? "rgba(34,197,94,0.08)" : tc.subtleBg,
                  color: isCurrent ? "#22c55e" : isDone ? "rgba(34,197,94,0.6)" : tc.textMuted,
                  border: isCurrent ? "1px solid rgba(34,197,94,0.4)" : "1px solid transparent",
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>{isDone ? "\u2713 " : ""}{getPhaseLabel(p)}</span>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: tc.textSecondary, marginBottom: 8, fontWeight: 600 }}>
        {getPhaseProgressText(chapter)}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: tc.ringTrack, overflow: "hidden" }}>
          <div style={{ width: `${journeyProgress.percent}%`, height: "100%", borderRadius: 2, background: "#22c55e", transition: "width 0.6s ease" }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: tc.textMuted, whiteSpace: "nowrap" }}>
          {journeyProgress.completed} of {journeyProgress.total} chapters
        </span>
      </div>

      {chapter.phase === "review" && onComplete ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onContinue} style={{
            flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid rgba(34,197,94,0.3)",
            background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 800, fontSize: 14,
            fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
          }}>Open Review</button>
          <button onClick={onComplete} style={{
            flex: 1, padding: "13px 0", borderRadius: 12, border: "none",
            background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 14,
            fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            boxShadow: "0 0 24px rgba(34,197,94,0.3)",
          }}>Complete Chapter {"\u2713"}</button>
        </div>
      ) : (
        <button onClick={onContinue} style={{
          width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 15,
          fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
          boxShadow: "0 0 24px rgba(34,197,94,0.3)",
        }}>{journeyState.detour ? "Resume Learning" : "Continue Learning"}</button>
      )}
    </div>
  );
}
