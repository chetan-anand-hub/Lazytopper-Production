import { getPremiumFeatureList } from "../services/featureGates";
import { useSubscription } from "../hooks/useSubscription";
import { useLocation, useNavigate } from "react-router-dom";
import { BasicFreeList } from "./pricing/BasicFreeList";

/**
 * FRICTION-FIX-1 · F3 (FU-UPGRADE-MODAL-NO-BASIC-EXIT) — the modal had ONE exit that was
 * not the corner ✕: "Choose Plan". It now also offers "Keep using Basic", which only
 * closes the modal, and shows what stays free (the shared BasicFreeList) under the
 * Premium list. Class-based styling for the new pieces (no new inline style objects).
 *
 * The modal card is a fixed LIGHT surface (#fff) in both themes, so the Basic list inside
 * it re-declares the light theme tokens for its own subtree — otherwise, in the dark
 * theme, BasicFreeList's token colours (white text) would land on this white card.
 */
const UPGRADE_CSS = `
.lt-upgrade__card {
  max-height: calc(100vh - 32px);
  overflow-y: auto;
}
.lt-upgrade__basic {
  --bg-card: #f8fafc;
  --bg-card-border: #e2e8f0;
  --text: #1e293b;
  --color-light-green: #15803d;
  margin-bottom: 4px;
}
.lt-upgrade__basic .lt-basic-free {
  max-width: none;
  margin: 0 0 16px;
}
.lt-upgrade__keep-basic {
  display: block;
  width: 100%;
  min-height: 44px;
  margin-top: 10px;
  padding: 12px 20px;
  border: 2px solid #e5e5e5;
  border-radius: 16px;
  background: #ffffff;
  color: #1a1a2e;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
}
.lt-upgrade__keep-basic:hover {
  background: #f5f5f5;
}
.lt-upgrade__keep-basic:focus-visible {
  outline: 3px solid #58cc02;
  outline-offset: 2px;
}
`;

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  featureLabel?: string;
}

export function UpgradeModal({ open, onClose, featureLabel }: UpgradeModalProps) {
  const { isTrialExpired, daysLeftInTrial, isTrialActive, tier } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const premiumFeatures = getPremiumFeatureList();

  if (!open) return null;

  const handleUpgrade = () => {
    onClose();
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    navigate(`/pricing?source=upgrade-modal&returnTo=${encodeURIComponent(returnTo)}`);
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
        className="lt-upgrade__card"
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
            Choose a Plan
          </h2>
          {featureLabel && (
            <p style={{ fontSize: "0.88rem", color: "#666", margin: 0 }}>
              <strong>{featureLabel}</strong> needs an active plan
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

        <style>{UPGRADE_CSS}</style>
        <div className="lt-upgrade__basic">
          <BasicFreeList />
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
          {tier === "free" && !isTrialExpired ? "View Plans" : "Choose Plan"}
        </button>

        <button
          type="button"
          className="lt-upgrade__keep-basic"
          onClick={onClose}
          data-testid="upgrade-modal-keep-basic"
        >
          Keep using Basic
        </button>

        <p style={{
          textAlign: "center", fontSize: "0.78rem", color: "#999",
          marginTop: 10,
        }}>
          {tier === "free" && !isTrialExpired
            ? "Your 7-day trial starts when you sign in. No credit card is required."
            : "Payment is not completed inside this modal."}
        </p>
      </div>
    </div>
  );
}
