/**
 * TutorErrorView — extracted from TutorPage.tsx (PAYWALL-PAY-1) so the tutor's paywall states
 * can be tested without mounting the whole page. Behaviour unchanged apart from the
 * PaywallActions swap (payments dark: the old link, byte for byte).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { backAtLine, limitHeadline, type TutorErrorState } from "./tutorErrorState";
import PaywallActions from "../../components/pricing/PaywallActions";
import UpgradeSheet from "../../components/subscription/UpgradeSheet";
import TrialStartButton from "../../components/pricing/TrialStartButton";
import { boardPassOffer } from "../../components/pricing/boardPassOffer";
import { isTrialEligible, useOptionalUid } from "../../components/pricing/trialCta";
import { useSubscription } from "../../hooks/useSubscription";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import { cbqTutorBonusUsedLine, getCbqTutorBonus } from "../../ai/cbqTutorBonus";
import PackOwnerSlot from "../../components/packOwner/PackOwnerSlot";

/**
 * ASK-COPY-1 - the tutor's 402 card, owner-approved wording (25 Oct 2026, FU-TUTOR-PREMIUM-CARD-COPY).
 * The price is computed by the same helper /pricing's Board Pass uses (config/pricing tillBoardsQuote
 * via boardPassOffer), never typed; when it cannot be quoted the card says "the Board Pass, till your
 * boards" with no figure rather than a guess. The actions are the shared UpgradeSheet (Board Pass
 * first, Pay, Send to parent). A student who can still start the free week sees that first
 * (explicit tap only); on success the question is asked again.
 */
function PremiumCard({ selfHref, onRetry }: { selfHref: string; onRetry: () => void }) {
  const { status, hydrated } = useSubscription();
  const uid = useOptionalUid();
  const [sheetOpen, setSheetOpen] = useState(false);
  const price = boardPassOffer(new Date(), predictCbseExamDate("10")).priceDisplay;
  const eligible = Boolean(uid) && isTrialEligible(hydrated, status);
  const cbqUsedLine = uid ? cbqTutorBonusUsedLine(getCbqTutorBonus(uid)) : null;
  return (
    <div className="lt-tutor__upgrade" role="status" data-testid="tutor-error-premium">
      {/* PACK-OWNER-GATES-1 - a CBQ Pack owner whose bonus questions are spent (the server's count, 0) is told so first; a pack owner
          then reads the pack-owner line in place of the card's words. Unknown / none: today's words. The buttons are unchanged. */}
      {cbqUsedLine ? (
        <p className="lt-packowner__pre" data-testid="cbq-bonus-used">
          {cbqUsedLine}
        </p>
      ) : null}
      <PackOwnerSlot
        enabled={Boolean(uid) && hydrated && status.tier === "free"}
        uid={uid}
        tone="inherit"
        fallback={
          <>
            <p className="lt-tutor__upgrade-h">Want to know why you lost this mark?</p>
            <p className="lt-tutor__upgrade-p">
              {`The tutor walks you through this exact question, step by step. It comes with the Board Pass: ${
                price ? `${price} once, ` : ""
              }till your boards.`}
            </p>
          </>
        }
      />
      {eligible && <TrialStartButton uid={uid} returnTo={selfHref} className="lt-tutor__action" onStarted={onRetry} />}
      <button type="button" className="lt-tutor__action" data-testid="tutor-see-board-pass" onClick={() => setSheetOpen(true)}>
        See the Board Pass
      </button>
      {sheetOpen && <UpgradeSheet featureLabel="The AI tutor" onClose={() => setSheetOpen(false)} />}
    </div>
  );
}

/**
 * TUTOR-FIX-2 T7 — one typed failure, rendered as what it is:
 *   premium  → the Board Pass card (ASK-COPY-1; its actions are the shared UpgradeSheet), no retry;
 *   limit    → "You've used today's tutor messages. Back at <IST time>" / "Back tomorrow.", no retry;
 *   busy     → the same family ("very busy today", back at …), + "See plans" when the server said so;
 *   offline  → a connection line + "Try again";
 *   reauth / failed → the honest line + "Try again" (today's behaviour).
 * The UsageWarning above the stream is unchanged.
 */
export default function TutorErrorView({ state, onRetry, selfHref }: { state: TutorErrorState; onRetry: () => void; selfHref: string }) {
  const pricingHref = `/pricing?source=upgrade-sheet&returnTo=${encodeURIComponent(selfHref)}`;
  if (state.kind === "premium") return <PremiumCard selfHref={selfHref} onRetry={onRetry} />;
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
