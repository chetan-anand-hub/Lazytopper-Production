import { useState, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { UpgradeModal } from "../UpgradeModal";

const MOCK_VIEW_KEY = "lazytopper.dailyMockViews";
const FREE_MOCK_LIMIT = 1;

function getDailyMockViews(): number {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(MOCK_VIEW_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed?.date !== today) return 0;
    return parsed.count || 0;
  } catch {
    return 0;
  }
}

function incrementDailyMockViews(): void {
  const today = new Date().toISOString().slice(0, 10);
  const count = getDailyMockViews() + 1;
  try {
    localStorage.setItem(MOCK_VIEW_KEY, JSON.stringify({ date: today, count }));
  } catch {}
}

export function MockViewGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isPremium } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

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
    const views = getDailyMockViews();
    if (views >= FREE_MOCK_LIMIT) {
      return (
        <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📄</div>
          <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>
            Sign in to View More
          </h2>
          <p style={{ color: "#888", fontSize: "0.92rem", marginBottom: 20, lineHeight: 1.5 }}>
            You've viewed your free mock paper for today. Sign in to unlock more.
          </p>
          <a
            href="/login"
            style={{
              display: "inline-block", textDecoration: "none",
              border: "none", borderBottom: "4px solid #46a302", borderRadius: 16,
              padding: "14px 28px", background: "#58cc02", color: "#fff",
              fontSize: "1rem", fontWeight: 800, cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Sign In
          </a>
        </div>
      );
    }
    incrementDailyMockViews();
    return <>{children}</>;
  }

  if (isPremium) {
    return <>{children}</>;
  }

  const views = getDailyMockViews();
  if (views >= FREE_MOCK_LIMIT) {
    return (
      <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📄</div>
        <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>
          Mock Paper Limit Reached
        </h2>
        <p style={{ color: "#888", fontSize: "0.92rem", marginBottom: 8, lineHeight: 1.5 }}>
          Free users can view {FREE_MOCK_LIMIT} mock paper per day.
        </p>
        <p style={{ color: "#888", fontSize: "0.88rem", marginBottom: 20, lineHeight: 1.5 }}>
          Upgrade to Premium for unlimited mock tests.
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
          Unlock Unlimited Mocks
        </button>
        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          featureLabel="Unlimited Mock Tests"
        />
      </div>
    );
  }

  incrementDailyMockViews();
  return <>{children}</>;
}
