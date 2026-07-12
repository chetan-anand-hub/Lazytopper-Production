// src/components/chaptertest/ChapterTestNavigator.tsx
//
// The in-test question navigator (spec §4): a tap-to-jump grid with FOUR states —
// answered (green) · not answered (grey) · flagged (amber) · to-upload/written (blue),
// the current question outlined. Flag state wins visually (it is the "come back here"
// signal); objective questions turn green once answered; every subjective question is
// "to upload" (written on paper). Pure/presentational — the page owns the state.

import type { PersistedWorksheetQuestion } from "../../services/worksheetSessionStore";

type NavState = "ans" | "not" | "flag" | "upl";

function stateOf(
  q: PersistedWorksheetQuestion,
  answers: Record<number, string>,
  flags: Set<number>,
): NavState {
  if (flags.has(q.qNumber)) return "flag";
  const objective = String(q.section).toUpperCase() === "A";
  if (!objective) return "upl";
  return answers[q.qNumber] != null && answers[q.qNumber] !== "" ? "ans" : "not";
}

export default function ChapterTestNavigator({
  questions,
  currentQNumber,
  answers,
  flags,
  onJump,
}: {
  questions: PersistedWorksheetQuestion[];
  currentQNumber: number;
  answers: Record<number, string>;
  flags: Set<number>;
  onJump: (qNumber: number) => void;
}) {
  return (
    <div className="lt-ct__nav">
      <div className="lt-ct__nav-h">Questions</div>
      <div className="lt-ct__qgrid">
        {questions.map((q) => {
          const st = stateOf(q, answers, flags);
          const cur = q.qNumber === currentQNumber ? " lt-ct__qn--cur" : "";
          return (
            <button
              key={q.qNumber}
              type="button"
              className={`lt-ct__qn lt-ct__qn--${st}${cur}`}
              onClick={() => onJump(q.qNumber)}
              aria-label={`Go to question ${q.qNumber}`}
              aria-current={q.qNumber === currentQNumber ? "true" : undefined}
            >
              {q.qNumber}
            </button>
          );
        })}
      </div>
      <div className="lt-ct__legend">
        <div className="lt-ct__legend-row"><span className="lt-ct__sw lt-ct__sw--ans" />Answered</div>
        <div className="lt-ct__legend-row"><span className="lt-ct__sw lt-ct__sw--not" />Not answered</div>
        <div className="lt-ct__legend-row"><span className="lt-ct__sw lt-ct__sw--flag" />Flagged</div>
        <div className="lt-ct__legend-row"><span className="lt-ct__sw lt-ct__sw--upl" />To upload (written)</div>
      </div>
    </div>
  );
}
