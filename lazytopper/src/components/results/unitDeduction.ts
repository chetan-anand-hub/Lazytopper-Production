/**
 * UNIT-LABEL-1 — recognising a unit deduction in a graded step, and the one honest line that
 * explains it. PURE (no React, no I/O).
 *
 * WHY. LazyTopper deducts ½ for a missing or wrong unit on the final answer of a quantity
 * (owner rule 6 Oct 2026, typed exam technique / presentation). The official CBSE marking schemes
 * generally do not, so wherever the student sees that deduction the app says so (owner ruling
 * 5 Nov 2026). No mark is changed here; this module only labels.
 *
 * DETECTION. The grader hands the client no structured flag (`_unitCharged` is server-internal and
 * stripped). What it does guarantee is one canonical comment, written deterministically by
 * `applyUnitRuling` (server/grading/postprocess.cjs) from `unitComment()` (rules.cjs):
 *     "−½: write the unit (<unit>) with your final answer."
 * The matcher is deliberately conservative: it requires that exact lead ("-1/2" sign, colon,
 * "write the unit", a bracketed unit). The two given-back lines ("No mark is lost for a unit
 * here ...", "The unit was already charged once ...") and free advice ("Remember to write the
 * unit ...") do NOT match, because no mark was taken there.
 */

/** The note shown beside a unit deduction. Final copy is owner-approved in the PR. */
export const UNIT_DEDUCTION_NOTE =
  "LazyTopper deducts ½ for a missing unit to build the habit — the CBSE board marking scheme may not.";

// minus sign: U+2212, hyphen-minus, en dash; half: U+00BD, "1/2" or "0.5"
const UNIT_DEDUCTION_COMMENT =
  /^\s*(?:[✓✔]\s*)?[−\-–]\s*(?:½|1\s*\/\s*2|0?\.5)\s*:\s*write the unit\s*\([^()]{1,24}\)/i;

/** True when `annotation` is the grader's canonical unit-deduction comment. */
export function isUnitDeductionNote(annotation: unknown): boolean {
  return typeof annotation === "string" && UNIT_DEDUCTION_COMMENT.test(annotation);
}
