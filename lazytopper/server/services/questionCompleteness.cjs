'use strict';

/**
 * Shared variant completeness predicate for all server-side save and serve paths.
 *
 * A variant is considered usable ONLY when ALL of the following are present
 * and non-empty after trimming:
 *   - text          (the question body)
 *   - answer        (concise correct answer)
 *   - solutionSteps (array with at least one non-empty step string)
 *   - finalAnswer   (one-sentence result statement)
 *
 * This predicate is the single source of truth for completeness on the server.
 * Require it anywhere a variant is saved to or read from generated_questions.
 *
 * @param {{ text?: *, answer?: *, solutionSteps?: *, finalAnswer?: * }} v
 * @returns {boolean}
 */
function isCompleteVariant(v) {
  if (!v || typeof v !== 'object') return false;
  const text = String(v.text || '').trim();
  const answer = String(v.answer || '').trim();
  const finalAnswer = String(v.finalAnswer || '').trim();
  const steps = v.solutionSteps;
  if (!text) return false;
  if (!answer) return false;
  if (!finalAnswer) return false;
  if (!Array.isArray(steps) || steps.length === 0) return false;
  if (!steps.some((s) => String(s || '').trim().length > 0)) return false;
  return true;
}

module.exports = { isCompleteVariant };
