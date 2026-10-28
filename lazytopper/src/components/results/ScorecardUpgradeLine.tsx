import { useEffect, useState } from "react";
import { Link, useInRouterContext } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { loadSubscription, onSubscriptionHydrated, type SubscriptionStatus } from "../../services/subscriptionService";
import { trackScorecardUpgrade } from "../../analytics/analytics";
import UpgradeSheet from "../subscription/UpgradeSheet";
import { START_TRIAL_LABEL } from "../pricing/trialCta";
import { boardPassCtaLabel, boardPassPriceNow } from "../pricing/boardPassOffer";
import { CHAPTER_PACK_PRICE_INR, chapterFromLocation, packsHref } from "../../lib/packs/packEntry";
import { formatScoreNumber } from "./scoreNumber";
import type { ScorecardVariant } from "./scorecardVariants";

/**
 * ScorecardUpgradeLine — ASK-FIX-1. One calm line under a graded result, for a student who is not
 * on a paid Premium pass (trial and Basic), tied to the REAL result:
 *
 *   marks lost > 0      "You lost {N} marks here. Get every answer marked like this till your boards — Board Pass ₹{price} →"
 *   nothing lost        "Full marks! Keep every answer marked like this till your boards — Board Pass ₹{price} →"
 *   marks not known     "Get every answer marked like this till your boards — Board Pass ₹{price} →"
 * and a quiet second line, "or start with a ₹49 Chapter Pack →" (FIRST-OFFER-1; /packs?chapter=<slug> when known).
 *
 * "Not known" is every attempts-style score (Quick Practice has no marks total), any paper with an
 * ungraded question or an awaited sheet (a number there would be wrong), and an all-pending card
 * (nothing is shown at all). N is total - awarded from the scorecard's own score; never invented.
 * A tap opens the upgrade sheet (Board Pass first). Display only - no grade, mark or prompt is touched.
 *
 * Rendered by the ONE <ResultsScorecard> shell, so it reaches all six grading surfaces: Check &
 * Improve (single and multi-question), Worksheet, Chapter Test, Full Mock and Quick Practice.
 */

const TILL_BOARDS = "marked like this till your boards";

export type ScorecardUpgradeCopy = { text: string };

function marksWord(n: number): string {
  return n === 1 ? "mark" : "marks";
}

/** The owner-approved Quick Practice (objective) line, word for word. */
export function mcqLostCopy(lost: number, price: string | null = null): string {
  return `You lost ${formatScoreNumber(lost)} ${marksWord(lost)} here. Upload your working to find out if it was a slip or a concept gap — ${boardPassCtaLabel(price)}`;
}

/** The line's words for this scorecard, or null when it must say nothing. Pure. */
export function scorecardUpgradeCopy(
  variant: Pick<ScorecardVariant, "surface" | "score" | "pending" | "allPending" | "awaitingSheet" | "deferred">,
  price: string | null = null,
): ScorecardUpgradeCopy | null {
  const cta = boardPassCtaLabel(price);
  if (variant.deferred || variant.allPending) return null;
  const score = variant.score;
  // ASK-COPY-1 [FU-UPGRADE-LINE-MCQ-COPY] - Quick Practice MCQs are scored 0 or full on the answer
  // alone (CLAUDE.md objective invariant): there are no step marks to unlock. N is the MCQs checked
  // minus the MCQs right, one mark each - the scorecard's own counts, never invented.
  if (variant.surface === "quick-practice" && score.kind === "attempts") {
    const lostMcq = Math.max(0, score.mcqAnswered - score.mcqCorrect);
    if (lostMcq > 0) return { text: mcqLostCopy(lostMcq, price) };
  }
  const known =
    score.kind === "marks" &&
    !variant.pending &&
    !variant.awaitingSheet &&
    Number.isFinite(score.awarded) &&
    Number.isFinite(score.total) &&
    score.total > 0;
  if (!known || score.kind !== "marks") {
    return { text: `Get every answer ${TILL_BOARDS} — ${cta}` };
  }
  const lost = Math.max(0, Math.round((score.total - score.awarded) * 100) / 100);
  if (lost > 0) {
    return { text: `You lost ${formatScoreNumber(lost)} ${marksWord(lost)} here. Get every answer ${TILL_BOARDS} — ${cta}` };
  }
  return { text: `Full marks! Keep every answer ${TILL_BOARDS} — ${cta}` };
}

const LINE_CSS = `
.lt-sc__up {
  display: block; width: 100%; box-sizing: border-box; min-height: 44px;
  margin: 12px 0 0; padding: 10px 14px; text-align: left; cursor: pointer;
  border-radius: 12px; border: 1px solid rgba(22, 185, 106, 0.28);
  background: rgba(22, 185, 106, 0.08); color: inherit;
  font: inherit; font-size: 0.88rem; font-weight: 600; line-height: 1.4;
}
.lt-sc__up--pack {
  display: block; margin: 6px 0 0; padding: 6px 4px; min-height: 44px; box-sizing: border-box;
  font-size: 0.8rem; font-weight: 500; opacity: 0.85; color: inherit; text-decoration: underline;
  text-underline-offset: 3px; overflow-wrap: anywhere;
}
.lt-sc__up:focus-visible, .lt-sc__up--pack:focus-visible { outline: 2px solid rgba(22, 185, 106, 0.8); outline-offset: 2px; }
`;

/** The signed-in uid, or "" when there is no AuthProvider (a bare scorecard render). */
function useOptionalUid(): string {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { user } = useAuth();
    return user && !user.isLocalSession ? user.uid : "";
  } catch {
    return "";
  }
}

/**
 * The student's entitlement for the ask, WITHOUT a Firestore read of its own: this device's cached
 * record, then whatever the app's shared hydration reports (onSubscriptionHydrated). The old
 * useSubscription() here hydrated from the cloud on every scorecard mount - a duplicate read per
 * result (it broke the Chapter Test pending-upload "exactly one snapshot lookup" pin). It only
 * decides whether to SHOW an ask, never what is unlocked; the server still gates every feature.
 */
function useCachedStatus(uid: string): [SubscriptionStatus, () => void] {
  const [status, setStatus] = useState<SubscriptionStatus>(() => loadSubscription(uid));
  useEffect(() => {
    setStatus(loadSubscription(uid));
    return onSubscriptionHydrated((hydratedFor, cloud) => {
      if (hydratedFor === uid) setStatus(cloud);
    });
  }, [uid]);
  return [status, () => setStatus(loadSubscription(uid))];
}

function Line({ variant, countShown, uid }: { variant: ScorecardVariant; countShown: boolean; uid: string }) {
  const copy = scorecardUpgradeCopy(variant, boardPassPriceNow());
  const text = copy ? copy.text : "";
  // FIRST-OFFER-1 - the Chapter Pack deep link: only a chapter the result itself names (its practice route); else plain /packs.
  const packHref = packsHref({ chapter: variant.guideTarget ? chapterFromLocation(variant.guideTarget.to.split("?")[0], variant.guideTarget.to.split("?")[1] ?? "") : null });
  const [status, refresh] = useCachedStatus(uid);
  // A scorecard can render outside the router (PDF/report renders, bare tests): fall back to a plain link.
  const inRouter = useInRouterContext();
  const [open, setOpen] = useState(false);
  // Premium (a paid pass or an admin grant) never sees the ask. A running trial still does.
  const show = status.tier !== "premium";
  // [FU-TRIAL-CTA-ON-ASK] - an account that never had a trial leads with the free week. This line
  // reads the cache only (no cloud read of its own), so the lead OPENS the sheet, whose button is
  // the one that starts the trial - and only once the record is known there. A tap never starts
  // it here, and a trial student (trialStartDate set) is never offered a second one.
  const trialLead = show && !status.trialStartDate;
  useEffect(() => {
    // A history re-open of an old result shows the line but is not counted as a fresh "shown".
    if (show && countShown) trackScorecardUpgrade("shown");
  }, [show, countShown]);
  if (!show) return null;
  return (
    <>
      <style>{LINE_CSS}</style>
      {trialLead ? (
        <button
          type="button"
          className="lt-sc__up"
          data-testid="scorecard-trial-lead"
          onClick={() => {
            trackScorecardUpgrade("click");
            setOpen(true);
          }}
        >
          {`${START_TRIAL_LABEL} →`}
        </button>
      ) : null}
      <button
        type="button"
        className="lt-sc__up"
        data-testid="scorecard-upgrade-line"
        onClick={() => {
          trackScorecardUpgrade("click");
          setOpen(true);
        }}
      >
        {text}
      </button>
      {inRouter ? (
        <Link className="lt-sc__up--pack" to={packHref} data-testid="scorecard-pack-line">
        {`or start with a ₹${CHAPTER_PACK_PRICE_INR} Chapter Pack →`}
      </Link>
      ) : (
        <a className="lt-sc__up--pack" href={packHref} data-testid="scorecard-pack-line">
        {`or start with a ₹${CHAPTER_PACK_PRICE_INR} Chapter Pack →`}
      </a>
      )}
      {open ? <UpgradeSheet
          featureLabel="Your full marks breakdown"
          onClose={() => {
            setOpen(false);
            refresh(); // a trial started from the sheet is on this device's record now
          }}
        /> : null}
    </>
  );
}

export default function ScorecardUpgradeLine({ variant, countShown = true }: { variant: ScorecardVariant; countShown?: boolean }) {
  const uid = useOptionalUid();
  const copy = scorecardUpgradeCopy(variant);
  if (!uid || !copy) return null;
  return <Line variant={variant} countShown={countShown} uid={uid} />;
}
