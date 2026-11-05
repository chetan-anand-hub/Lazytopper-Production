import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { UpgradeModal } from "../UpgradeModal";
import TrialAsk from "../trial/TrialAsk";
import { boardPassCtaLabel } from "../pricing/boardPassOffer";
import { trialDayOneNoPayAsk } from "../trial/trialEndBannerModel";

const TRIAL_DAYS = 7;

/**
 * ASK-FIX-1 — the app-wide trial slot (App.tsx mounts this on every non-desktop main page). It now
 * hosts the trial-ended screen and the one-line countdown bar (trial day 4 on); the older strip
 * below keeps trial days 1-3 and the red "Trial ended" bar.
 */
export function TrialBanner() {
  return (
    <>
      <TrialAsk />
      <LegacyTrialBanner />
    </>
  );
}

function LegacyTrialBanner() {
  const { user } = useAuth();
  const { isTrialExpired, daysLeftInTrial, tier, status } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user) return null;
  if (tier === "premium") return null;
  const isTrialActive = tier === "trial";
  if (!isTrialActive && !isTrialExpired) return null;
  if (dismissed && !isTrialExpired && daysLeftInTrial > 2) return null;

  const currentDay = isTrialActive ? TRIAL_DAYS - daysLeftInTrial + 1 : TRIAL_DAYS;
  // ASK-FIX-1 - from trial day 4 the countdown bar speaks (it has the Board Pass and a real link).
  if (isTrialActive && currentDay >= 4) return null;
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
            {boardPassCtaLabel()}
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
  // EARLY-PAYWALL-1 (owner 5 Nov 2026, "Hide on day 1"): no Board Pass link on the first IST day of the trial.
  const dayOne = trialDayOneNoPayAsk(status?.trialStartDate, Date.now());

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

        {dayOne ? null : isUrgent ? (
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
            {boardPassCtaLabel()}
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
            {boardPassCtaLabel()}
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
