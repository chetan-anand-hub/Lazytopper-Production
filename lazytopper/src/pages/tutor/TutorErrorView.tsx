/**
 * TutorErrorView — extracted from TutorPage.tsx (PAYWALL-PAY-1) so the tutor's paywall states
 * can be tested without mounting the whole page. Behaviour unchanged apart from the
 * PaywallActions swap (payments dark: the old link, byte for byte).
 */
import { Link } from "react-router-dom";
import { backAtLine, limitHeadline, type TutorErrorState } from "./tutorErrorState";
import PaywallActions from "../../components/pricing/PaywallActions";

/**
 * TUTOR-FIX-2 T7 — one typed failure, rendered as what it is:
 *   premium  → an upgrade card to the EXISTING pricing entry (UpgradeSheet's own URL), no retry;
 *   limit    → "You've used today's tutor messages. Back at <IST time>" / "Back tomorrow.", no retry;
 *   busy     → the same family ("very busy today", back at …), + "See plans" when the server said so;
 *   offline  → a connection line + "Try again";
 *   reauth / failed → the honest line + "Try again" (today's behaviour).
 * The UsageWarning above the stream is unchanged.
 */
export default function TutorErrorView({ state, onRetry, selfHref }: { state: TutorErrorState; onRetry: () => void; selfHref: string }) {
  const pricingHref = `/pricing?source=upgrade-sheet&returnTo=${encodeURIComponent(selfHref)}`;
  if (state.kind === "premium") {
    return (
      <div className="lt-tutor__upgrade" role="status" data-testid="tutor-error-premium">
        <p className="lt-tutor__upgrade-h">The tutor is part of Premium</p>
        <p className="lt-tutor__upgrade-p">{state.message}</p>
        {/* PAYWALL-PAY-1 — Pay / Share QR code / Forward link to parents; payments dark:
            "See Premium", unchanged. */}
        <PaywallActions
          surface="tutor"
          payTo={pricingHref}
          fallback={
            <Link to={pricingHref} className="lt-tutor__action">
              See Premium
            </Link>
          }
        />
      </div>
    );
  }
  if (state.kind === "limit" || state.kind === "busy") {
    return (
      <div className="lt-tutor__limit" role="status" data-testid={`tutor-error-${state.kind}`}>
        <span>
          {limitHeadline(state)} {backAtLine(state.resetAt)}
        </span>
        {/* PAYWALL-PAY-1 — the server sends `cta: "plans"` only when a NON-paying student is
            shed at the site-wide ceiling (paying students are not shed): a pay moment. */}
        {state.kind === "busy" && state.plans && (
          <PaywallActions
            surface="tutor"
            payTo={pricingHref}
            fallback={
              <Link to={pricingHref} className="lt-tutor__retry">
                See plans
              </Link>
            }
          />
        )}
      </div>
    );
  }
  const line =
    state.kind === "offline"
      ? "You seem to be offline. Check your connection and try again."
      : state.message;
  return (
    <div className="lt-tutor__err" data-testid={`tutor-error-${state.kind}`}>
      <span>{line}</span>
      <button type="button" className="lt-tutor__retry" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
