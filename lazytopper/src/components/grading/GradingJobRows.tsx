// src/components/grading/GradingJobRows.tsx
//
// GRADING-JOBS-1 J2 — the rows of a background grade, question by question, as they land
// (contract v1.0 §4): a `final: true` row shows its mark (or its honest not-graded reason); a
// `final: false` row is PROVISIONAL and shows NO mark — it may change at done. No totals: they
// exist only at done (§4), and the surface's own scorecard shows them then. On an interruption
// (§6) the final rows stay and the rest are offered back as "Grade the remaining N".

import type { GradingJobInterruptedError, GradingJobProgress, GradingJobRow } from "../../ai/gradingJobs";
import { gradeRemainingLabel, isInterruptedRow } from "../../ai/gradingJobs";
import { gradeStateCopy, isGradedQuestion, NOT_GRADED_INTERRUPTED_COPY } from "../../lib/mistakeDisplay";
import "./gradingJobRows.css";

function rowValue(row: GradingJobRow): { text: string; muted: boolean; provisional: boolean } {
  if (!row.final) return { text: "still checking", muted: true, provisional: true };
  if (isInterruptedRow(row)) return { text: NOT_GRADED_INTERRUPTED_COPY, muted: true, provisional: false };
  if (isGradedQuestion(row)) {
    return { text: `${Number(row.marksAwarded) || 0} / ${Number(row.totalMarks) || 0}`, muted: false, provisional: false };
  }
  return { text: gradeStateCopy(row) ?? "Not graded", muted: true, provisional: false };
}

export interface GradingJobRowsProps {
  progress?: GradingJobProgress | null;
  interrupted?: GradingJobInterruptedError | null;
  /** Present → the "Grade the remaining N" button (the document is still on this device). */
  onGradeRemaining?: () => void;
  busy?: boolean;
}

export default function GradingJobRows({ progress, interrupted, onGradeRemaining, busy }: GradingJobRowsProps) {
  const rows = interrupted ? interrupted.rows : progress?.rows ?? [];
  if (!interrupted && !progress) return null;
  const total = interrupted ? interrupted.rows.length : progress?.total ?? 0;
  const done = interrupted ? interrupted.rows.length : progress?.done ?? 0;
  const remaining = interrupted ? interrupted.remaining.length : 0;
  return (
    <section className="lt-gj" aria-live="polite" data-testid="grading-job-rows">
      <p className="lt-gj__head">
        {interrupted ? "The check was interrupted" : total > 0 ? `Marked ${done} of ${total}` : "Marking your answers…"}
      </p>
      {interrupted ? (
        <p className="lt-gj__note">
          {remaining === 0
            ? "Every question that was marked is shown below."
            : `The marked questions are below. ${remaining === 1 ? "1 question was" : `${remaining} questions were`} not marked and you have not been charged for ${remaining === 1 ? "it" : "them"}.`}
        </p>
      ) : (
        <p className="lt-gj__note">Results land one by one. A provisional row may still change until the check finishes.</p>
      )}
      {rows.length > 0 && (
        <ul className="lt-gj__list">
          {rows.map((row) => {
            const v = rowValue(row);
            return (
              <li key={row.index} className="lt-gj__row" data-final={row.final ? "true" : "false"}>
                <span className="lt-gj__q">Q{row.qNumber}</span>
                <span className={v.muted ? "lt-gj__val lt-gj__val--muted" : "lt-gj__val"}>
                  {v.provisional ? <span className="lt-gj__prov">Provisional</span> : null} {v.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {interrupted && remaining > 0 ? (
        onGradeRemaining ? (
          <button type="button" className="lt-gj__btn" onClick={onGradeRemaining} disabled={busy}>
            {busy ? "Grading…" : gradeRemainingLabel(remaining)}
          </button>
        ) : (
          <p className="lt-gj__note">Upload your answers again to grade the remaining {remaining}.</p>
        )
      ) : null}
    </section>
  );
}
