import { useEffect, useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { trackScorecardUpgrade } from "../../analytics/analytics";
import UpgradeSheet from "../subscription/UpgradeSheet";
import { formatScoreNumber } from "./scoreNumber";
import type { ScorecardVariant } from "./scorecardVariants";

/**
 * ScorecardUpgradeLine — ASK-FIX-1. One calm line under a graded result, for a student who is not
 * on a paid Premium pass (trial and Basic), tied to the REAL result:
 *
 *   marks lost > 0      "You lost {N} marks here. Unlock step-by-step marks on every answer and unlimited checks with the Board Pass →"
 *   nothing lost        "Full marks! Keep going with unlimited checks — Board Pass →"
 *   marks not known     "Unlock step-by-step marks on every answer — Board Pass →"
 *
 * "Not known" is every attempts-style score (Quick Practice has no marks total), any paper with an
 * ungraded question or an awaited sheet (a number there would be wrong), and an all-pending card
 * (nothing is shown at all). N is total - awarded from the scorecard's own score; never invented.
 * A tap opens the upgrade sheet (Board Pass first). Display only - no grade, mark or prompt is touched.
 *
 * Rendered by the ONE <ResultsScorecard> shell, so it reaches all six grading surfaces: Check &
 * Improve (single and multi-question), Worksheet, Chapter Test, Full Mock and Quick Practice.
 */

export const FULL_MARKS_COPY = "Full marks! Keep going with unlimited checks — Board Pass →";
export const UNKNOWN_COPY = "Unlock step-by-step marks on every answer — Board Pass →";

export type ScorecardUpgradeCopy = { text: string };

function marksWord(n: number): string {
  return n === 1 ? "mark" : "marks";
}

/** The line's words for this scorecard, or null when it must say nothing. Pure. */
export function scorecardUpgradeCopy(
  variant: Pick<ScorecardVariant, "score" | "pending" | "allPending" | "awaitingSheet" | "deferred">,
): ScorecardUpgradeCopy | null {
  if (variant.deferred || variant.allPending) return null;
  const score = variant.score;
  const known =
    score.kind === "marks" &&
    !variant.pending &&
    !variant.awaitingSheet &&
    Number.isFinite(score.awarded) &&
    Number.isFinite(score.total) &&
    score.total > 0;
  if (!known || score.kind !== "marks") {
    return { text: UNKNOWN_COPY };
  }
  const lost = Math.max(0, Math.round((score.total - score.awarded) * 100) / 100);
  if (lost > 0) {
    return { text: `You lost ${formatScoreNumber(lost)} ${marksWord(lost)} here. Unlock step-by-step marks on every answer and unlimited checks with the Board Pass →` };
  }
  return { text: FULL_MARKS_COPY };
}

const LINE_CSS = `
.lt-sc__up {
  display: block; width: 100%; box-sizing: border-box; min-height: 44px;
  margin: 12px 0 0; padding: 10px 14px; text-align: left; cursor: pointer;
  border-radius: 12px; border: 1px solid rgba(22, 185, 106, 0.28);
  background: rgba(22, 185, 106, 0.08); color: inherit;
  font: inherit; font-size: 0.88rem; font-weight: 600; line-height: 1.4;
}
.lt-sc__up:focus-visible { outline: 2px solid rgba(22, 185, 106, 0.8); outline-offset: 2px; }
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

function Line({ text, countShown }: { text: string; countShown: boolean }) {
  const sub = useSubscription();
  const [open, setOpen] = useState(false);
  // Premium (a paid pass or an admin grant) never sees the ask. A running trial still does.
  const show = sub.hydrated && sub.tier !== "premium";
  useEffect(() => {
    // A history re-open of an old result shows the line but is not counted as a fresh "shown".
    if (show && countShown) trackScorecardUpgrade("shown");
  }, [show, countShown]);
  if (!show) return null;
  return (
    <>
      <style>{LINE_CSS}</style>
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
      {open ? <UpgradeSheet featureLabel="Your full marks breakdown" onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export default function ScorecardUpgradeLine({ variant, countShown = true }: { variant: ScorecardVariant; countShown?: boolean }) {
  const uid = useOptionalUid();
  const copy = scorecardUpgradeCopy(variant);
  if (!uid || !copy) return null;
  return <Line text={copy.text} countShown={countShown} />;
}
