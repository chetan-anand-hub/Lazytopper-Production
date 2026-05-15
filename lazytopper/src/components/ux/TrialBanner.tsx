import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { UpgradeModal } from "../UpgradeModal";

const TRIAL_DAYS = 7;

export function TrialBanner() {
  const { user } = useAuth();
  const { isTrialExpired, daysLeftInTrial, tier } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user) return null;
  if (tier === "premium") return null;
  const isTrialActive = tier === "trial";
  if (!isTrialActive && !isTrialExpired) return null;
  if (dismissed && !isTrialExpired && daysLeftInTrial > 2) return null;

  const currentDay = isTrialActive ? TRIAL_DAYS - daysLeftInTrial + 1 : TRIAL_DAYS;
  const progress = currentDay / TRIAL_DAYS;

  if (isTrialExpired) {
    return (
      <>
        <div style={{
          background: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06))",
          borderBottom: "1px solid rgba(239,68,68,0.2)",
          padding: "10px 16px",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontSize: "1rem" }}>⚠️</span>
            <span style={{
              fontWeight: 800, fontSize: "0.82rem", color: "#f87171",
            }}>
              Trial ended
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              - Choose a plan to keep premium tools available
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowUpgrade(true)}
            style={{
              border: "none", borderRadius: 10,
              padding: "5px 14px", background: "#ef4444", color: "var(--text)",
              fontSize: "0.78rem", fontWeight: 800, cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Choose plan
          </button>
        </div>
        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} featureLabel="Full Access" />
      </>
    );
  }

  const isLastDay = daysLeftInTrial <= 1;
  const isDay6 = daysLeftInTrial === 2;

  const accentColor = isLastDay ? "#ef4444" : isDay6 ? "#f59e0b" : "#22c55e";
  const bgGradient = isLastDay
    ? "linear-gradient(135deg, rgba(239,68,68,0.10), rgba(239,68,68,0.04))"
    : isDay6
    ? "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.04))"
    : "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(34,197,94,0.02))";
  const borderColor = isLastDay
    ? "rgba(239,68,68,0.15)"
    : isDay6
    ? "rgba(245,158,11,0.15)"
    : "rgba(34,197,94,0.08)";
  const isUrgent = isLastDay || isDay6;

  let message: string;
  let subMessage: string | null = null;
  if (isLastDay) {
    message = "Last day!";
    subMessage = "Choose a plan to keep premium tools available";
  } else if (isDay6) {
    message = "1 day left!";
    subMessage = "Choose a plan before trial access ends";
  } else {
    message = `Day ${currentDay} of ${TRIAL_DAYS} — Free Trial`;
  }

  return (
    <>
      <div style={{
        background: bgGradient,
        borderBottom: `1px solid ${borderColor}`,
        padding: "6px 16px",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 10, flexWrap: "wrap",
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ fontSize: "0.85rem" }}>{isLastDay ? "🔥" : isUrgent ? "⏳" : "✨"}</span>
          <span style={{
            fontWeight: 800, fontSize: "0.78rem", color: accentColor,
          }}>
            {message}
          </span>

          <div style={{
            width: 80, height: 5, borderRadius: 999,
            background: "var(--bg-card)", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 999,
              width: `${progress * 100}%`,
              background: accentColor,
              transition: "width 0.3s ease",
            }} />
          </div>

          {subMessage && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              — {subMessage}
            </span>
          )}
        </div>

        {isUrgent ? (
          <button
            type="button"
            onClick={() => setShowUpgrade(true)}
            style={{
              border: "none", borderRadius: 8,
              padding: "3px 10px", background: accentColor, color: "var(--text)",
              fontSize: "0.72rem", fontWeight: 800, cursor: "pointer",
              whiteSpace: "nowrap", opacity: 0.9,
            }}
          >
            Choose plan
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowUpgrade(true)}
            style={{
              background: "none", border: "none",
              color: accentColor, fontSize: "0.72rem", fontWeight: 700,
              cursor: "pointer", whiteSpace: "nowrap",
              textDecoration: "underline", textUnderlineOffset: 2,
            }}
          >
            Choose plan
          </button>
        )}

        {!isUrgent && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "var(--text-muted)",
              fontSize: "0.82rem", cursor: "pointer", padding: "2px 4px",
            }}
            title="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} featureLabel="Full Access" />
    </>
  );
}
