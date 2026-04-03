import { useState, useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { getDailyPracticeCount, incrementDailyPracticeCount } from "../../services/featureGates";
import { UpgradeModal } from "../UpgradeModal";
import { Navigate } from "react-router-dom";

const FREE_DAILY_LIMIT = 3;

export function PracticeLimitGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isPremium } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const incrementedRef = useRef(false);

  useEffect(() => {
    if (loading || !user || isPremium || incrementedRef.current) return;
    const count = getDailyPracticeCount(user.uid);
    if (count >= FREE_DAILY_LIMIT) {
      setLimitReached(true);
    } else {
      incrementDailyPracticeCount(user.uid);
      incrementedRef.current = true;
    }
  }, [loading, user, isPremium]);

  if (loading) {
    return (
      <div className="lt-page">
        <div className="card">
          <h3>Loading...</h3>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isPremium) {
    return <>{children}</>;
  }

  if (limitReached) {
    return (
      <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📝</div>
        <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>
          Daily Limit Reached
        </h2>
        <p style={{ color: "#888", fontSize: "0.92rem", marginBottom: 8, lineHeight: 1.5 }}>
          You've completed {FREE_DAILY_LIMIT} practice sessions today.
        </p>
        <p style={{ color: "#888", fontSize: "0.88rem", marginBottom: 20, lineHeight: 1.5 }}>
          Upgrade to Premium for unlimited daily practice.
        </p>
        <button
          type="button"
          onClick={() => setShowUpgrade(true)}
          style={{
            border: "none", borderBottom: "4px solid #46a302", borderRadius: 16,
            padding: "14px 28px", background: "#58cc02", color: "#fff",
            fontSize: "1rem", fontWeight: 800, cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          Unlock Unlimited Practice
        </button>
        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          featureLabel="Unlimited Practice"
        />
      </div>
    );
  }

  return <>{children}</>;
}
