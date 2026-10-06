// src/lib/cbq/CbqLabel.tsx
//
// CBQ-1 PR-1 (ruling 2) — the visible "CBQ" label. Rendered by the shared question card
// (PracticeQuestionCard) iff `isCbq(q)`, so every surface that renders that card shows it.
// Class-driven styling (CLAUDE.md §7: no inline style objects), navy / soft-white / green.

import { CBQ_ARIA_LABEL, CBQ_LABEL_TEXT, isCbq, type CbqRowLike } from "./cbqClassification";
import "./cbqLabel.css";

export interface CbqLabelProps {
  question: CbqRowLike;
}

/** "CBQ" chip for a competency-based question; renders nothing otherwise. */
export function CbqLabel({ question }: CbqLabelProps) {
  if (!isCbq(question)) return null;
  return (
    <span
      className="lt-cbq-label"
      data-testid="cbq-label"
      role="note"
      aria-label={CBQ_ARIA_LABEL}
      title={CBQ_ARIA_LABEL}
    >
      {CBQ_LABEL_TEXT}
    </span>
  );
}

export default CbqLabel;
