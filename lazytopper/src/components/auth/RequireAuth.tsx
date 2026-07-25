import { useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { UpgradeModal } from "../UpgradeModal";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="lt-page">
        <div className="card">
          <h3>Checking your session...</h3>
          <p>Please wait.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function RequirePremium({ children, featureLabel }: { children: ReactNode; featureLabel?: string }) {
  const { user, loading } = useAuth();
  const { isPremium, isTrialExpired, startTrial } = useSubscription();
  const location = useLocation();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (loading) {
    return (
      <div className="lt-page">
        <div className="card">
          <h3>Checking your session...</h3>
          <p>Please wait.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isPremium) {
    // Within !isPremium the tier is always "free" (isPremium covers premium AND trial),
    // so isTrialExpired is the whole discriminator: a never-trialled user (trialStartDate
    // null) sees the trial CTA; an EXPIRED-trial user (trialStartDate set, tier free) must
    // NOT — otherwise they restart the 7-day trial forever, so they get the plans path only.
    const neverTrialled = !isTrialExpired;
    return (
      <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>🔒</div>
        <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>
          Premium Feature
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginBottom: 20, lineHeight: 1.5 }}>
          {featureLabel || "This feature"} is part of Premium.
          {neverTrialled ? (
            <>
              <br />Try everything free for 7 days.
            </>
          ) : null}
        </p>
        {neverTrialled ? (
          <>
            <button
              type="button"
              onClick={() => startTrial()}
              style={{
                border: "none", borderRadius: 12, padding: "14px 28px",
                background: "var(--primary)", color: "#fff",
                fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                width: "100%", maxWidth: 300,
              }}
            >
              Start my free 7-day trial
            </button>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 9 }}>
              then free Basic, upgrade anytime
            </div>
            <button
              type="button"
              onClick={() => setShowUpgrade(true)}
              style={{
                display: "block", margin: "16px auto 0", background: "none",
                border: "none", color: "var(--text)", fontSize: 13, fontWeight: 600,
                textDecoration: "underline", cursor: "pointer",
              }}
            >
              See plans instead
            </button>
          </>
        ) : (
          // Expired trial: plans path only. Existing button kept verbatim (not restyled,
          // legacy palette not propagated to the new controls above).
          <button
            type="button"
            onClick={() => setShowUpgrade(true)}
            style={{
              border: "none", borderBottom: "4px solid #46a302", borderRadius: 16,
              padding: "14px 28px", background: "#58cc02", color: "var(--text)",
              fontSize: "1rem", fontWeight: 800, cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Unlock Full Access
          </button>
        )}
        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          featureLabel={featureLabel}
        />
      </div>
    );
  }

  return <>{children}</>;
}
