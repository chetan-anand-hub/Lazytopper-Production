'use strict';
// server/grading/charge.cjs — WHAT A GRADE CHARGES (GRADER-CORE-1 PR-3, C9).
//
// The student's allowance (trial checks, and the paper-pass "graded" mark) is spent only for
// questions that were actually GRADED. A question that was not — could not be read, timed
// out, failed, an answer that does not match the question, an unread MCQ option, a grade
// withheld for citing an injected instruction, or an unattempted question — delivers no grade
// and costs nothing, with or without `acceptsV2` (owner addendum 2026-10-05; controller
// decision D25).
//
// WHY A SIDE CHANNEL, NOT THE BODY. The response body cannot tell fair use what was graded:
// a legacy answer-mismatch is an ordinary `ok:true` 0, and a legacy single couldNotRead is
// `200 { ok:false }`, the same shape as a parse failure. So the grading handler records the
// number of chargeable questions on `res` — a NON-ENUMERABLE symbol, invisible to every body,
// header and serialiser — BEFORE it sends. Fair use's existing `finish` hook commits exactly
// that count. When it is absent (any other route, any test rig that passes `res = {}`), fair
// use falls back to the requested count, exactly as before.
//
// Keyed on PR-2's `_reason` (non-enumerable, set by postprocess.normaliseQuestionResult on
// every result), NOT on `_graded`: a legacy answer-mismatch carries `_graded: true` (it is a
// real examiner 0 for the paper total) but is never charged.

const GRADED_COUNT = Symbol.for('lazytopper.grading.chargeableCount');

/** True when this normalised per-question result is a delivered grade the student pays for. */
function isChargeable(result) {
  if (!result || typeof result !== 'object') return false;
  if (result._reason !== 'graded') return false;
  // A legacy client still sees today's 0 for an MCQ whose pick could not be read (C7: the
  // honest "ungraded" is opt-in), but it is not a grade, so it is not charged.
  if (result._objectiveUnresolved === true) return false;
  return true;
}

/** The number of chargeable questions in a list of normalised results. */
function chargeableCount(results) {
  return (Array.isArray(results) ? results : []).filter(isChargeable).length;
}

/** Record the chargeable count on the response (non-enumerable; never throws). */
function setChargeableCount(res, n) {
  if (!res || (typeof res !== 'object' && typeof res !== 'function')) return;
  const v = Math.max(0, Math.floor(Number(n) || 0));
  try {
    Object.defineProperty(res, GRADED_COUNT, { value: v, enumerable: false, configurable: true, writable: true });
  } catch { /* a frozen test double: fair use then falls back to the requested count */ }
}

/** The recorded chargeable count, or undefined when the handler recorded none. */
function chargeableCountOf(res) {
  if (!res || (typeof res !== 'object' && typeof res !== 'function')) return undefined;
  const v = res[GRADED_COUNT];
  return Number.isFinite(v) && v >= 0 ? v : undefined;
}

module.exports = { GRADED_COUNT, isChargeable, chargeableCount, setChargeableCount, chargeableCountOf };
