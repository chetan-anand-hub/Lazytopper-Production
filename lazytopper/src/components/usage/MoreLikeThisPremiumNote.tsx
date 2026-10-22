/**
 * MoreLikeThisPremiumNote - ALL-AI-METERING-1 (DECISION 29d, D78b). Shown when a FREE signed-in student's
 * More-like-this top-up is refused (402 premium_required): a plan fact, not a limit, so no reset time
 * and no "fair use" eyebrow. The saved questions are already on screen. Internal route link only.
 * `trialUsed` swaps the trial offer for "See plans": a trial the student cannot take is never offered.
 */

import { Link } from "react-router-dom";
import { MORE_LIKE_THIS_PREMIUM_ONLY_COPY, MORE_LIKE_THIS_PREMIUM_ONLY_TRIAL_USED_COPY, SEE_PLANS_LABEL, START_TRIAL_LABEL } from "./fairUseGate";
import { PLANS_PATH } from "./FairUseLimitPanel";
import PaywallActions from "../pricing/PaywallActions";
import "./usage.css";

export default function MoreLikeThisPremiumNote({ trialUsed = false, onDismiss }: { trialUsed?: boolean; onDismiss?: () => void }) {
  return (
    <section className="lt-usage" role="status" aria-live="polite" data-testid="more-like-this-premium-note">
      <p className="lt-usage__lead">{trialUsed ? MORE_LIKE_THIS_PREMIUM_ONLY_TRIAL_USED_COPY : MORE_LIKE_THIS_PREMIUM_ONLY_COPY}</p>
      <div className="lt-usage__actions">
        {/* PAYWALL-PAY-1 — trial used: Pay / Share QR code / Forward link to parents replace
            "See plans". Trial unused: "Start free trial" stays FIRST and the three follow.
            Payments dark: exactly the old single link either way. */}
        {trialUsed ? (
          <PaywallActions
            surface="more_like_this"
            payTo={PLANS_PATH}
            fallback={
              <Link to={PLANS_PATH} className="lt-usage__btn" data-testid="more-like-this-start-trial">
                {SEE_PLANS_LABEL}
              </Link>
            }
          />
        ) : (
          <>
            <Link to={PLANS_PATH} className="lt-usage__btn" data-testid="more-like-this-start-trial">
              {START_TRIAL_LABEL}
            </Link>
            <PaywallActions surface="more_like_this" payTo={PLANS_PATH} />
          </>
        )}
        {onDismiss ? (
          <button type="button" className="lt-usage__btn lt-usage__btn--ghost" onClick={onDismiss}>
            OK
          </button>
        ) : null}
      </div>
    </section>
  );
}
