import "./unitDeductionNote.css";
import { UNIT_DEDUCTION_NOTE, isUnitDeductionNote } from "./unitDeduction";

/**
 * UNIT-LABEL-1 — the ONE small note shown beside a unit deduction, on every surface that shows
 * the grader's per-step / per-question line. Pass the annotation text the surface is already
 * rendering; it renders nothing unless that text is the grader's unit-deduction comment.
 * Styling is in unitDeductionNote.css (no inline style objects, CLAUDE.md section 7).
 */
export function UnitDeductionNote({ annotation, className }: { annotation: unknown; className?: string }) {
  if (!isUnitDeductionNote(annotation)) return null;
  return (
    <span className={`lt-unitnote${className ? ` ${className}` : ""}`} data-testid="unit-deduction-note">
      {UNIT_DEDUCTION_NOTE}
    </span>
  );
}

export default UnitDeductionNote;
