/**
 * GRADE-PROGRESS-1 - an honest waiting panel for a ONE-question Answer Checker grade (~20 s typical, ~45 s
 * for the slowest tenth). No percentage, no "step X of Y": the one tick is "Question read", which is true
 * before Grade is pressed; the rotating line DESCRIBES what the examiner-grader does inside its single call
 * and never claims how far along it is. The "marking scheme ready" stage is deliberately absent: the
 * client cannot know a scheme was prepared. Reduced motion -> one static line, no rotation.
 */
import { useEffect, useState } from "react";
import { useReducedMotion } from "../celebrations/useReducedMotion";
import "./gradeProgress.css";

export const GRADE_PROGRESS_LINES: readonly string[] = [
  "Checking each step against the CBSE marking scheme…",
  "Looking for where marks were lost…",
  "Writing your feedback…",
];
export const GRADE_PROGRESS_ROTATE_MS = 8_000;
export const GRADE_PROGRESS_TYPICAL = "Most answers are marked in 20–45 seconds.";

interface Props {
  /** The existing "Taking a little longer than usual — still checking…" copy once the transport reports it; else null. */
  slowLabel?: string | null;
}

export default function GradeProgressPanel({ slowLabel = null }: Props) {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      // Calm, once through the three descriptions, then stay on the last: nothing loops like a progress meter.
      setIdx((i) => Math.min(i + 1, GRADE_PROGRESS_LINES.length - 1));
    }, GRADE_PROGRESS_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  const line = reduced ? GRADE_PROGRESS_LINES[0] : GRADE_PROGRESS_LINES[idx];

  return (
    <div className="lt-gp" data-testid="grade-progress-panel" aria-live="polite">
      <ul className="lt-gp__list">
        <li className="lt-gp__done" data-testid="grade-progress-read">
          <span aria-hidden="true">&#10003;</span> Question read
        </li>
        <li className="lt-gp__now" data-testid="grade-progress-line" key={reduced ? "static" : idx}>
          <span className="lt-gp__dot" aria-hidden="true" /> {line}
        </li>
      </ul>
      {slowLabel && (
        <p className="lt-gp__slow" data-testid="grade-progress-slow">{slowLabel}</p>
      )}
      <p className="lt-gp__note">{GRADE_PROGRESS_TYPICAL}</p>
    </div>
  );
}
