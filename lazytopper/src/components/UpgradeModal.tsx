import { getPremiumFeatureList } from "../services/featureGates";
import { useSubscription } from "../hooks/useSubscription";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  featureLabel?: string;
}

export function UpgradeModal({ open, onClose, featureLabel }: UpgradeModalProps) {
  const { isTrialExpired, daysLeftInTrial, isTrialActive, startTrial, upgradeToPremium, tier } = useSubscription();
  const premiumFeatures = getPremiumFeatureList();

  if (!open) return null;

  const handleUpgrade = () => {
    if (tier === "free" && !isTrialExpired) {
      startTrial();
    } else {
      upgradeToPremium();
    }
    onClose();
    window.location.reload();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 20, maxWidth: 420, width: "100%",
          padding: "28px 24px", position: "relative",
          border: "2px solid #e5e5e5", boxShadow: "0 4px 0 #e5e5e5",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute", top: 12, right: 14,
            background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999",
          }}
        >
          ✕
        </button>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🔓</div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 900, margin: "0 0 6px", color: "#1a1a2e" }}>
            Unlock Full Access
          </h2>
          {featureLabel && (
            <p style={{ fontSize: "0.88rem", color: "#666", margin: 0 }}>
              <strong>{featureLabel}</strong> is a premium feature
            </p>
          )}
        </div>

        {isTrialActive && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12,
            padding: "10px 14px", marginBottom: 16, textAlign: "center",
          }}>
            <span style={{ fontWeight: 700, color: "#16a34a", fontSize: "0.88rem" }}>
              Trial active — {daysLeftInTrial} day{daysLeftInTrial !== 1 ? "s" : ""} remaining
            </span>
          </div>
        )}

        {isTrialExpired && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12,
            padding: "10px 14px", marginBottom: 16, textAlign: "center",
          }}>
            <span style={{ fontWeight: 700, color: "#dc2626", fontSize: "0.88rem" }}>
              Your free trial has ended
            </span>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 800, fontSize: "0.92rem", marginBottom: 10, color: "#1a1a2e" }}>
            Premium includes:
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {premiumFeatures.map((f) => (
              <li
                key={f.id}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 0", fontSize: "0.88rem", color: "#3c3c3c",
                }}
              >
                <span style={{ color: "#58cc02", fontWeight: 800 }}>✓</span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={handleUpgrade}
          style={{
            width: "100%", border: "none", borderBottom: "4px solid #46a302",
            borderRadius: 16, padding: "14px 20px",
            background: "#58cc02", color: "var(--text)",
            fontSize: "1rem", fontWeight: 800, cursor: "pointer",
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}
        >
          {tier === "free" && !isTrialExpired
            ? "Start 7-Day Free Trial"
            : "Upgrade to Premium"}
        </button>

        <p style={{
          textAlign: "center", fontSize: "0.78rem", color: "#999",
          marginTop: 10,
        }}>
          {tier === "free" && !isTrialExpired
            ? "Full access for 7 days. No credit card required."
            : "Unlock all features instantly."}
        </p>
      </div>
    </div>
  );
}
