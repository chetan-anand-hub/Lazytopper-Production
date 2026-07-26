import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { UpgradeModal } from "../UpgradeModal";
import { MONTHLY_INLINE } from "../../config/pricing";

const MOCK_VIEW_KEY = "lazytopper.weeklyMockViews";
const FREE_WEEKLY_MOCK_LIMIT = 1;
const GUEST_SESSION_KEY = "lazytopper.guestSessionId";

function getGuestSessionId(): string {
  let id = sessionStorage.getItem(GUEST_SESSION_KEY);
  if (!id) {
    id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(GUEST_SESSION_KEY, id);
  }
  return id;
}

function getScopedKey(uid: string | null): string {
  const scope = uid || getGuestSessionId();
  return `${MOCK_VIEW_KEY}:${scope}`;
}

function getISOWeek(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum}`;
}

function getWeeklyMockViews(uid: string | null): number {
  try {
    const week = getISOWeek();
    const raw = localStorage.getItem(getScopedKey(uid));
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed?.week !== week) return 0;
    return parsed.count || 0;
  } catch {
    return 0;
  }
}

function incrementWeeklyMockViews(uid: string | null): void {
  const week = getISOWeek();
  const count = getWeeklyMockViews(uid) + 1;
  try {
    localStorage.setItem(getScopedKey(uid), JSON.stringify({ week, count }));
  } catch {}
}

export function MockViewGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isPremium, isTrialExpired } = useSubscription();
  const location = useLocation();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [ready, setReady] = useState(false);
  const incrementedRef = useRef(false);

  const uid = user?.uid || null;

  useEffect(() => {
    if (loading) return;
    if (user && isPremium) {
      setReady(true);
      return;
    }
    if (user && isTrialExpired) {
      setReady(true);
      return;
    }
    if (incrementedRef.current) {
      setReady(true);
      return;
    }
    const views = getWeeklyMockViews(uid);
    if (views >= FREE_WEEKLY_MOCK_LIMIT) {
      setLimitReached(true);
      setReady(true);
    } else {
      incrementWeeklyMockViews(uid);
      incrementedRef.current = true;
      setReady(true);
    }
  }, [loading, user, isPremium, isTrialExpired, uid]);

  if (loading || !ready) {
    return (
      <div className="lt-page">
        <div className="card">
          <h3>Loading...</h3>
        </div>
      </div>
    );
  }

  if (user && isPremium) {
    return <>{children}</>;
  }

  if (user && isTrialExpired) {
    return (
      <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>⏰</div>
        <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8, color: "var(--text)" }}>
          Your Free Trial Has Ended
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginBottom: 6, lineHeight: 1.5 }}>
          Mock tests were unlocked during your trial.
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 6, lineHeight: 1.6 }}>
          Upgrade now to keep access to:
        </p>
        <div style={{
          display: "inline-flex", flexDirection: "column", gap: 6,
          textAlign: "left", marginBottom: 20,
          background: "var(--bg-card)", borderRadius: 12, padding: "12px 20px",
          border: "1px solid var(--bg-card-border)",
        }}>
          {["Unlimited mock tests", "Your mastery progress & streak", "Practice history & weak-area insights"].map(item => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.84rem", color: "var(--text)" }}>
              <span style={{ color: "#22c55e", fontWeight: 800 }}>✓</span>
              {item}
            </div>
          ))}
        </div>
        <div>
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
            Upgrade to Premium
          </button>
        </div>
        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          featureLabel="Unlimited Mock Tests"
        />
      </div>
    );
  }

  if (!user && limitReached) {
    return (
      <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📄</div>
        <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>
          Sign in to View More
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginBottom: 20, lineHeight: 1.5 }}>
          You've viewed your free sample mock paper. Sign in to unlock more.
        </p>
        <Link
          to={`/login?reason=login&redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`}
          style={{
            display: "inline-block", textDecoration: "none",
            border: "none", borderBottom: "4px solid #46a302", borderRadius: 16,
            padding: "14px 28px", background: "#58cc02", color: "var(--text)",
            fontSize: "1rem", fontWeight: 800, cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (user && limitReached) {
    return (
      <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📄</div>
        <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>
          Mock Paper Limit Reached
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginBottom: 8, lineHeight: 1.5 }}>
          Free users can take {FREE_WEEKLY_MOCK_LIMIT} mock test per week.
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: 20, lineHeight: 1.5 }}>
          Unlock unlimited mock tests for {MONTHLY_INLINE}.
        </p>
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

  return <>{children}</>;
}
