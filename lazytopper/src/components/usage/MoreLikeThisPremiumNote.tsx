/**
 * MoreLikeThisPremiumNote - ALL-AI-METERING-1 (DECISION 29d). Shown when a FREE signed-in student's
 * More-like-this top-up is refused (402 premium_required): a plan fact, not a limit, so no reset time
 * and no "fair use" eyebrow. The saved questions are already on screen. Internal route link only.
 */

import { Link } from "react-router-dom";
import { MORE_LIKE_THIS_PREMIUM_ONLY_COPY, START_TRIAL_LABEL } from "./fairUseGate";
import { PLANS_PATH } from "./FairUseLimitPanel";
import "./usage.css";

export default function MoreLikeThisPremiumNote({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <section className="lt-usage" role="status" aria-live="polite" data-testid="more-like-this-premium-note">
      <p className="lt-usage__lead">{MORE_LIKE_THIS_PREMIUM_ONLY_COPY}</p>
      <div className="lt-usage__actions">
        <Link to={PLANS_PATH} className="lt-usage__btn" data-testid="more-like-this-start-trial">
          {START_TRIAL_LABEL}
        </Link>
        {onDismiss ? (
          <button type="button" className="lt-usage__btn lt-usage__btn--ghost" onClick={onDismiss}>
            OK
          </button>
        ) : null}
      </div>
    </section>
  );
}
