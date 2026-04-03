import { useState, useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { UpgradeModal } from "../UpgradeModal";

const MOCK_VIEW_KEY = "lazytopper.dailyMockViews";
const FREE_MOCK_LIMIT = 1;
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

function getDailyMockViews(uid: string | null): number {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(getScopedKey(uid));
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed?.date !== today) return 0;
    return parsed.count || 0;
  } catch {
    return 0;
  }
}

function incrementDailyMockViews(uid: string | null): void {
  const today = new Date().toISOString().slice(0, 10);
  const count = getDailyMockViews(uid) + 1;
  try {
    localStorage.setItem(getScopedKey(uid), JSON.stringify({ date: today, count }));
  } catch {}
}

export function MockViewGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isPremium } = useSubscription();
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
    if (incrementedRef.current) {
      setReady(true);
      return;
    }
    const views = getDailyMockViews(uid);
    if (views >= FREE_MOCK_LIMIT) {
      setLimitReached(true);
      setReady(true);
    } else {
      incrementDailyMockViews(uid);
      incrementedRef.current = true;
      setReady(true);
    }
  }, [loading, user, isPremium, uid]);

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

  if (!user && limitReached) {
    return (
      <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📄</div>
        <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>
          Sign in to View More
        </h2>
        <p style={{ color: "#888", fontSize: "0.92rem", marginBottom: 20, lineHeight: 1.5 }}>
          You've viewed your free sample mock paper. Sign in to unlock more.
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

  if (user && limitReached) {
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

  return <>{children}</>;
}
