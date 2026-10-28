/**
 * LockedDetail — LIMITS-1 PR-2: what a Basic student sees in place of the scorecard's per-answer
 * breakdown ("where you lost marks": step marks and the mistake type for each answer).
 *
 * The score, the lenses and "what to do next" stay on the card, and the Me/Progress mistake summary
 * stays open: only the answer-by-answer breakdown is held back. Calm, honest copy: no countdown, no
 * seat count; the score the student earned is stated first.
 */
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PaywallActions from "../pricing/PaywallActions";
import { boardPassPriceNow } from "../pricing/boardPassOffer";
import { trackNamedEvent } from "../../analytics/analytics";
import "./LockedDetail.css";

export interface LockedDetailProps {
  /** "11 of 20" (marks) or "7 of 10" (attempts) from the card's own numbers. */
  scoreLine: string;
}

export default function LockedDetail({ scoreLine }: LockedDetailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const here = `${location.pathname}${location.search}`;

  useEffect(() => {
    trackNamedEvent("scorecard_lock_shown");
  }, []);

  const price = boardPassPriceNow();
  const unlockLabel = price ? `Unlock with Board Pass ${price}` : "Unlock with Board Pass";
  const goPlans = () => navigate(`/pricing?source=scorecard-lock&returnTo=${encodeURIComponent(here)}`);

  return (
    <section className="lt-lockd" data-testid="scorecard-locked-detail" aria-label="Answer-by-answer breakdown">
      <h3 className="lt-lockd__title">You got {scoreLine}. See exactly where the rest went.</h3>
      <p className="lt-lockd__body">
        Premium opens every answer step by step, with the kind of mistake behind each lost mark. The mistake
        pattern above, and on your Progress page, stays free.
      </p>
      <div className="lt-lockd__acts">
        <PaywallActions
          surface="scorecard_lock"
          onPay={goPlans}
          fallback={
            <button type="button" className="lt-lockd__btn lt-lockd__btn--primary" onClick={goPlans}>
              {unlockLabel}
            </button>
          }
        />
      </div>
    </section>
  );
}
