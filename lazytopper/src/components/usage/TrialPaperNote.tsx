/**
 * TrialPaperNote — TRIAL-PAPER-1. Shown under a trial student's graded Check & Improve
 * paper when only its FIRST questions were graded (today's checks). Lists every question
 * after the cut as "Not graded" — no mark, no mistake chip — and carries an honest
 * upgrade note with a link to the EXISTING plans route (no payment, no activation).
 *
 * Renders ONLY what `trialPaperNoteCopy` returns. CSS classes only (usage.css).
 */

import { Link } from "react-router-dom";
import { PLANS_PATH } from "./FairUseLimitPanel";
import { trialPaperNoteCopy, type TrialPaperCut } from "./fairUseGate";
import "./usage.css";

export default function TrialPaperNote({
  cut,
  allowance,
  labels,
}: {
  cut: TrialPaperCut;
  /** The server's checksPerDay, or null when it did not say. */
  allowance: number | null | undefined;
  /** The paper's own label for each question ("Q6"), in paper order; the note shows those after the cut. */
  labels: string[];
}) {
  const copy = trialPaperNoteCopy(cut, allowance);
  return (
    <section className="lt-usage lt-usage--paper" role="status" aria-live="polite" data-testid="trial-paper-note">
      <div className="lt-usage__eyebrow">Free trial</div>
      <p className="lt-usage__lead">{copy.lead}</p>
      <p className="lt-usage__body">{copy.body}</p>
      <ul className="lt-usage__notgraded" aria-label="Questions not graded" data-testid="trial-paper-not-graded">
        {cut.notGradedIndices.map((i) => (
          <li key={i} className="lt-usage__notgraded-item" data-grade-state="not-graded">
            <span className="lt-usage__notgraded-q">{labels[i] ?? `Question ${i + 1}`}</span>
            <span className="lt-usage__notgraded-chip">Not graded</span>
          </li>
        ))}
      </ul>
      <p className="lt-usage__body">{copy.upgrade}</p>
      <div className="lt-usage__actions">
        <Link to={PLANS_PATH} className="lt-usage__btn" data-testid="trial-paper-see-plans">
          See plans
        </Link>
      </div>
    </section>
  );
}
