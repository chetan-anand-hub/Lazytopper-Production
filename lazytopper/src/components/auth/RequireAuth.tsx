import { useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { UpgradeModal } from "../UpgradeModal";
import PaywallActions from "../pricing/PaywallActions";
import { trackNamedEvent } from "../../analytics/analytics";
import { BasicFreeList, TRIAL_WORDING } from "../pricing/BasicFreeList";
import { isSafeInternalPath } from "../../utils/safeInternalPath";

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
    return <Navigate to="/login" replace state={{ from: loginFromFor(location) }} />;
  }

  if (!isPremium) {
    // Within !isPremium the tier is always "free" (isPremium covers premium AND trial),
    // so isTrialExpired is the whole discriminator: a never-trialled user (trialStartDate
    // null) sees the trial CTA; an EXPIRED-trial user (trialStartDate set, tier free) must
    // NOT — otherwise they restart the 7-day trial forever, so they get the plans path only.
    const neverTrialled = !isTrialExpired;
    // PAYWALL-PAY-1 — "Pay" goes where the old plans path went: /pricing's Pay buttons.
    const lockPayTo = `/pricing?source=lock&returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`;
    return (
      <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>🔒</div>
        <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>
          Premium Feature
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginBottom: 20, lineHeight: 1.5 }}>
          {/* START-HERE-1 (spec 2.5) — the lock is the conversion moment for a student who tapped
              "Ask the tutor" on a scorecard whose free week has ended. Copy only: the gate above
              is unchanged. */}
          {!neverTrialled && new URLSearchParams(location.search).get("source") === "scorecard"
            ? // FOLLOWUPS-1 A3 — copy only. `passEnd` is server-written (rules refuse client
              // writes) and set only for a PAID pass, so a non-premium status that carries one
              // held a pass that has lapsed; without it the lapsed entitlement was the trial.
              status.passEnd
              ? SCORECARD_LOCK_COPY_PAID
              : SCORECARD_LOCK_COPY
            : <>{featureLabel || "This feature"} is part of Premium.</>}
          {neverTrialled ? (
            <>
              <br />Try everything free for 7 days.
            </>
          ) : null}
        </p>
        {/* TRIAL-ON-SIGNUP-1 · T4 — under the lock's message: what stays free on Basic,
            from the one list Pricing renders. */}
        <BasicFreeList />
        {neverTrialled ? (
          <>
            <button
              type="button"
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
              {TRIAL_WORDING.shortFragment}
            </div>
            {/* PAYWALL-PAY-1 — under the trial (which stays first): Pay, Share QR code,
                Forward link to parents. Payments dark: the old "See plans instead". */}
            <PaywallActions
              surface="lock"
              payTo={lockPayTo}
              fallback={
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
              }
            />
          </>
        ) : (
          // Expired trial: the paywall actions (PAYWALL-PAY-1). Payments dark: the plans
          // path only, the existing button kept verbatim (not restyled).
          <PaywallActions
            surface="lock"
            payTo={lockPayTo}
            fallback={
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
            }
          />
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
