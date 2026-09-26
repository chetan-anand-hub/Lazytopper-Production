import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { getDailyPracticeCount, incrementDailyPracticeCount } from "../../services/featureGates";
import { UpgradeModal } from "../UpgradeModal";
import { MONTHLY_INLINE } from "../../config/pricing";

const FREE_DAILY_LIMIT = 10;

interface PracticeLimitCtx {
  questionsUsed: number;
  canAskMore: boolean;
  recordQuestionAnswered: () => boolean;
}

const PracticeLimitContext = createContext<PracticeLimitCtx>({
  questionsUsed: 0,
  canAskMore: true,
  recordQuestionAnswered: () => true,
});

export function usePracticeLimit() {
  return useContext(PracticeLimitContext);
}

export function PracticeLimitGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isPremium } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    if (loading || !user || isPremium) return;
    const count = getDailyPracticeCount(user.uid);
    setQuestionsUsed(count);
    if (count >= FREE_DAILY_LIMIT) {
      setLimitReached(true);
    }
  }, [loading, user, isPremium]);

  const recordQuestionAnswered = useCallback(() => {
    if (!user || isPremium) return true;
    const newCount = incrementDailyPracticeCount(user.uid);
    setQuestionsUsed(newCount);
    if (newCount >= FREE_DAILY_LIMIT) {
      setLimitReached(true);
      return false;
    }
    return true;
  }, [user, isPremium]);

  if (loading) {
    return (
      <div className="lt-page">
        <div className="card">
          <h3>Loading...</h3>
        </div>
      </div>
    );
  }

  /**
   * ★ THERE IS DELIBERATELY NO SIGNED-OUT REDIRECT HERE (AUTH-GATE-MOVE-1).
   *
   * This gate used to `<Navigate to="/login">` every signed-out visitor before a single
   * question rendered. That put a login wall in front of content that costs nothing to
   * serve — the questions are static bank data already in the bundle — and it hid the
   * product's best pages from students who have not signed up and from every crawler.
   * The wall now sits where LazyTopper actually spends money: AI grading, gated inside
   * `SolutionChecker`. Serving a question is free; marking one is not.
   *
   * A signed-out visitor therefore falls through to the provider at the bottom of this
   * component with `questionsUsed: 0` and `canAskMore: true`. The effect above already
   * returns early when there is no `user`, and `recordQuestionAnswered` already returns
   * `true` for one, so no counter reads or writes a uid that does not exist.
   */

  if (isPremium) {
    return (
      <PracticeLimitContext.Provider
        value={{ questionsUsed: 0, canAskMore: true, recordQuestionAnswered: () => true }}
      >
        {children}
      </PracticeLimitContext.Provider>
    );
  }

  if (limitReached) {
    return (
      <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📝</div>
        <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>
          Daily Limit Reached
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginBottom: 8, lineHeight: 1.5 }}>
          You've used your {FREE_DAILY_LIMIT} free questions for today.
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: 20, lineHeight: 1.5 }}>
          Keep practising with Premium at {MONTHLY_INLINE}.
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
          Unlock Premium practice
        </button>
        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          featureLabel="Premium Practice"
        />
      </div>
    );
  }

  return (
    <PracticeLimitContext.Provider
      value={{ questionsUsed, canAskMore: questionsUsed < FREE_DAILY_LIMIT, recordQuestionAnswered }}
    >
      {children}
    </PracticeLimitContext.Provider>
  );
}
