/**
 * GUIDE-1 §3D — Ziggy's reaction to the student's FIRST graded result. PURE.
 *
 * The numbers are the scorecard's OWN: a marks score uses `awarded / total` exactly as the
 * score hero shows them; an attempts score (Quick Practice) uses the MCQ counts the hero's
 * "x/y MCQs correct" line shows. Nothing is rounded up, invented or re-graded. A result with
 * no checkable number (no total, no checked MCQ) gets NO reaction — Ziggy stays away rather
 * than guess.
 *
 *   full marks → excited     "Full marks! Did you see that?!"
 *   ≥ 50%      → determined  "<got> out of <total>. <lost> to fix. I've got this."
 *   < 50%      → sad (melts) "Oh no... <got> out of <total>." → after ~2.5 s → determined
 *                            "Okay. Let's fix them one by one."
 */
import type { ScorecardScore } from "../results/scorecardVariants";
import type { ZiggyBand } from "../../analytics/analytics";
import type { Pose } from "./rig";

export type { ZiggyBand };

export interface ZiggyReaction {
  band: ZiggyBand;
  pose: Pose;
  line: string;
  /** The bounce-back (sad only). */
  after?: { pose: Pose; line: string };
}

/** A number as the scorecard prints it (no trailing ".0"). */
function n(x: number): string {
  return String(Math.round(x * 100) / 100);
}

export function ziggyReactionFor(score: ScorecardScore): ZiggyReaction | null {
  let got: number;
  let total: number;
  let unit: "marks" | "count";
  if (score.kind === "marks") {
    if (!Number.isFinite(score.total) || score.total <= 0 || !Number.isFinite(score.awarded) || score.awarded < 0) return null;
    got = score.awarded;
    total = score.total;
    unit = "marks";
  } else {
    if (!Number.isFinite(score.mcqAnswered) || score.mcqAnswered <= 0 || !Number.isFinite(score.mcqCorrect)) return null;
    got = score.mcqCorrect;
    total = score.mcqAnswered;
    unit = "count";
  }
  if (got >= total) return { band: "full", pose: "excited", line: "Full marks! Did you see that?!" };
  const lost = total - got;
  if (got / total >= 0.5) {
    const toFix = unit === "marks" ? `${n(lost)} mark${lost === 1 ? "" : "s"} to fix` : `${n(lost)} to fix`;
    return { band: "half_plus", pose: "determined", line: `${n(got)} out of ${n(total)}. ${toFix}. I've got this.` };
  }
  return {
    band: "under_half",
    pose: "sad",
    line: `Oh no... ${n(got)} out of ${n(total)}.`,
    after: { pose: "determined", line: "Okay. Let's fix them one by one." },
  };
}
