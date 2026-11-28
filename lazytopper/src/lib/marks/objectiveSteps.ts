/**
 * OBJ-NO-STEPMARK-1 - an objective question (MCQ, Assertion-Reason, any 1-mark item) is scored 0 or FULL on the
 * answer alone (CLAUDE.md section 13). Its bank rows still carry per-step "[0.5 mark]" prefixes, so every DISPLAY
 * of a worked solution asks this helper: show ONE "1 mark" chip for the whole answer and the steps as plain
 * explanation with the prefixes removed.
 *
 * DISPLAY ONLY. Nothing here feeds the grader or edits a bank row.
 */

const MARK_NUM = String.raw`(\d+(?:\.\d+)?\s*½?|½|\d+\s*/\s*2)`;
const LEADING_MARK = new RegExp(String.raw`^\s*\[\s*${MARK_NUM}\s*marks?\s*\]\s*`, "i");
const TRAILING_MARK = new RegExp(String.raw`\s+\[\s*${MARK_NUM}\s*(?:marks?)?\s*\]\s*$`, "i");

export interface ObjectiveRowLike {
  options?: readonly unknown[] | null;
  marks?: number | string | null;
  format?: string | null;
}

/** MCQ / Assertion-Reason (by options or format) or a 1-mark item: the same rule SolutionsPage's `isObjectiveRow` uses, plus the format. */
export function isObjectiveSteps(q: ObjectiveRowLike | null | undefined): boolean {
  if (!q) return false;
  if (Array.isArray(q.options) && q.options.length > 0) return true;
  if (Number(q.marks) === 1) return true;
  return /^(mcq|assertion)/i.test(String(q.format ?? "").trim());
}

/** A step without its leading "[N mark]" or trailing "[N]" prefix. Brackets elsewhere in the step are left alone. */
export function stripStepMarks(step: string): string {
  const s = String(step ?? "");
  const lead = LEADING_MARK.exec(s);
  if (lead) return s.slice(lead[0].length);
  const trail = TRAILING_MARK.exec(s);
  return trail ? s.slice(0, trail.index) : s;
}

/** The steps of an objective row as plain explanation; any other row's steps are returned untouched. */
export function displaySteps<T extends string>(q: ObjectiveRowLike | null | undefined, steps: readonly T[]): string[] {
  return isObjectiveSteps(q) ? steps.map((s) => stripStepMarks(s)) : steps.map(String);
}
