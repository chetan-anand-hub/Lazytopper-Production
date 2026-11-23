/**
 * GRADE-PROGRESS-1 - kill switch for the honest waiting panel on a single-question Answer Checker grade.
 * VITE_GRADE_PROGRESS_DISABLED (any value but "", "0", "false") -> today's exact UI: the button text only.
 */
export function gradeProgressDisabled(): boolean {
  const v = import.meta.env?.VITE_GRADE_PROGRESS_DISABLED;
  if (typeof v !== "string") return false;
  const t = v.trim().toLowerCase();
  return t !== "" && t !== "0" && t !== "false";
}
