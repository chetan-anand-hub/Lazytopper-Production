import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { UpgradeModal } from "../UpgradeModal";
import PaywallActions from "../pricing/PaywallActions";
import { trackNamedEvent } from "../../analytics/analytics";
import { TRIAL_WORDING } from "../pricing/BasicFreeList";
import FounderBadge from "../brand/FounderBadge";
import BoardPassLockCard from "../lock/BoardPassLockCard";
import { CONTINUE_WITH_BASIC, LOCK_TRIAL_LINE, lockHeadline } from "../lock/lockCopy";
import "../lock/lockPage.css";
import { isSafeInternalPath } from "../../utils/safeInternalPath";
import { CBQ_GATE_WAIT_MS, useCbqTutorAllowance } from "../../hooks/useCbqTutorAllowance";
import { cbqTutorBonusUsedLine, getCbqTutorBonus } from "../../ai/cbqTutorBonus";
import PackOwnerSlot from "../packOwner/PackOwnerSlot";

/** CBQ-TUTOR-GATE-1 - the one gate label (set in App.tsx) that a CBQ Pack owner's bonus questions may open. */
export const TUTOR_GATE_LABEL = "Ask the tutor";

/** START-HERE-1 — the lock line for a student who came from a scorecard's tutor button. */
export const SCORECARD_LOCK_COPY = "Your free week has ended — upgrade to ask the tutor why you lost this mark.";
/** FOLLOWUPS-1 A3 — the same lock line for a student whose PAID pass has ended (not the trial). */
export const SCORECARD_LOCK_COPY_PAID = "Your Premium pass has ended — renew to ask the tutor why you lost this mark.";

/**
 * TUTOR-FIX-2 T12 — where /login returns a signed-out visitor: the protected page's pathname
 * AND query (a /tutor deep link's q / from / source / returnTo used to be dropped here). If the
 * full target would fail Login's same-origin guard (`isSafeInternalPath`), the pathname alone is
 * kept — exactly the old value — so this can never turn a working redirect into "/".
 */
// eslint-disable-next-line react-refresh/only-export-components
export function loginFromFor(location: { pathname: string; search?: string }): string {
  const full = `${location.pathname}${location.search || ""}`;
  return isSafeInternalPath(full) ? full : location.pathname;
}

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
    return <Navigate to="/login" replace state={{ from: loginFromFor(location) }} />;
  }

  return <>{children}</>;
}

export function RequirePremium({ children, featureLabel }: { children: ReactNode; featureLabel?: string }) {
  const { user, loading } = useAuth();
  const { isPremium, isTrialExpired, startTrial, hydrated, status } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);
  // CBQ-TUTOR-GATE-1 - only the tutor gate, only a signed-in non-Premium student, only once the plan is known.
  const cbqAllowance = useCbqTutorAllowance(
    user?.uid || "",
    !loading && Boolean(user) && hydrated && !isPremium && featureLabel === TUTOR_GATE_LABEL,
  );

  // Bound the wait for subscription hydration on the tutor gate: if it never completes, fall back to the lock.
  const waitingForPlan = Boolean(user) && !loading && !hydrated && !isPremium && featureLabel === TUTOR_GATE_LABEL;
  const [planWaitExpired, setPlanWaitExpired] = useState(false);
  useEffect(() => {
    if (!waitingForPlan) return;
    const t = setTimeout(() => setPlanWaitExpired(true), CBQ_GATE_WAIT_MS);
    return () => clearTimeout(t);
  }, [waitingForPlan]);

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
    return <Navigate to="/login" replace state={{ from: loginFromFor(location) }} />;
  }

  // Plan not yet read for the tutor gate: wait, do not flash the lock at a student who may be a pack owner.
  if (!isPremium && featureLabel === TUTOR_GATE_LABEL && ((!hydrated && !planWaitExpired) || cbqAllowance === "loading")) {
    return (
      <div className="lt-page">
        <div className="card">
          <h3>Checking your session...</h3>
          <p>Please wait.</p>
        </div>
      </div>
    );
  }

  if (!isPremium && cbqAllowance === "allowed") {
    return <>{children}</>;
  }

  if (!isPremium) {
    // Within !isPremium the tier is always "free" (isPremium covers premium AND trial),
    // so isTrialExpired is the whole discriminator: a never-trialled user (trialStartDate
    // null) sees the trial CTA; an EXPIRED-trial user (trialStartDate set, tier free) must
    // NOT — otherwise they restart the 7-day trial forever, so they get the plans path only.
    const neverTrialled = !isTrialExpired;
    // PAYWALL-PAY-1 — "Pay" goes where the old plans path went: /pricing's Pay buttons.
    // PACK-OWNER-GATES-1 - only the tutor gate, only the server's own count (seeded by useCbqTutorAllowance).
    const cbqUsedLine = featureLabel === TUTOR_GATE_LABEL ? cbqTutorBonusUsedLine(getCbqTutorBonus(user.uid)) : null;
    const lockPayTo = `/pricing?source=lock&returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`;
    // LOCK-SELL-1 - the one quiet way out: back where the student came from inside the app, else Home (never off-site).
    const continueWithBasic = () => {
      const idx = (window.history.state as { idx?: unknown } | null)?.idx;
      if (typeof idx === "number" && idx > 0) navigate(-1);
      else navigate("/", { replace: true });
    };
    const fromScorecard = !neverTrialled && new URLSearchParams(location.search).get("source") === "scorecard";
    // START-HERE-1 / FOLLOWUPS-1 A3 - copy only. `passEnd` is server-written and set only for a PAID pass.
    const subLine = fromScorecard ? (status.passEnd ? SCORECARD_LOCK_COPY_PAID : SCORECARD_LOCK_COPY) : neverTrialled ? LOCK_TRIAL_LINE : null;
    return (
      <div className="lt-page">
        {/* LOCK-SELL-1 (owner, 4 Nov 2026) - the lock sells the Board Pass and its star features; Basic is one quiet link. */}
        <div className="lt-lock" data-testid="premium-lock">
          <div className="lt-lock__icon" aria-hidden="true">🔒</div>
          {/* PACK-OWNER-GATES-1 - CBQ-TUTOR-GATE-1's owner whose 3 bonus questions are spent (server count 0) is told so first. */}
          {cbqUsedLine ? (
            <p className="lt-packowner__pre" data-testid="cbq-bonus-used">
              {cbqUsedLine}
            </p>
          ) : null}
          {/* PACK-OWNER-GATES-1 - a student who bought a PDF pack is spoken to as a customer, on top. Unknown / none: nothing. */}
          <PackOwnerSlot enabled={hydrated} uid={user.uid} heading="p" center tone="inherit" />
          <h2 className="lt-lock__title" data-testid="lock-title">
            {lockHeadline(featureLabel)}
          </h2>
          {subLine ? (
            <p className="lt-lock__sub" data-testid="lock-sub">
              {subLine}
            </p>
          ) : null}
          <BoardPassLockCard>
            {neverTrialled ? (
              <>
                {/* The trial stays first where it shows today (explicit tap only); the paywall actions follow. */}
                <button
                  type="button"
                  className="lt-lock__primary"
                  onClick={() => {
                    // TRIAL-CTA-1 — the existing rule, guarded at the call site (see
                    // PricingPage): hydrated, not premium, never trialled.
                    // Only a call that takes effect is counted as trial_start.
                    if (!hydrated || status.tier === "premium" || status.trialStartDate) {
                      return;
                    }
                    startTrial();
                    trackNamedEvent("trial_start");
                  }}
                >
                  Start my free 7-day trial
                </button>
                <p className="lt-lock__trial-note">{TRIAL_WORDING.shortFragment}</p>
                {/* PAYWALL-PAY-1 — Pay, Pay by QR code, Ask a parent to pay. Payments dark: "See plans instead". */}
                <PaywallActions
                  surface="lock"
                  payTo={lockPayTo}
                  fallback={
                    <button type="button" className="lt-lock__plans" onClick={() => setShowUpgrade(true)}>
                      See plans instead
                    </button>
                  }
                />
              </>
            ) : (
              // Expired trial: the paywall actions (PAYWALL-PAY-1). Payments dark: the plans path only.
              <PaywallActions
                surface="lock"
                payTo={lockPayTo}
                fallback={
                  <button type="button" className="lt-lock__primary" onClick={() => setShowUpgrade(true)}>
                    Unlock Full Access
                  </button>
                }
              />
            )}
          </BoardPassLockCard>
          <FounderBadge tone="dark" />
          <button type="button" className="lt-lock__basic" data-testid="lock-continue-basic" onClick={continueWithBasic}>
            {CONTINUE_WITH_BASIC}
          </button>
        </div>
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
