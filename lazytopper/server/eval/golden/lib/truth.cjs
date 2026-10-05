'use strict';
// lib/truth.cjs — the DETERMINISTIC truth rules (truth/rules.json, check: "deterministic")
// and the grade-level consistency checks (S4 pipeline `gradeChecks`, ported).
// Zero model calls. Every function takes ONE normalised question result (the shape both
// graders return per question) plus the case's expectation, and returns failures.

const path = require('path');
const { SERVER_DIR } = require('./driver.cjs');
// GRADER-CORE-1 PR-2: one sentence PER departure kind (the fixed P11 sentence is retired).
// The historic two names are the different-problem pair; the maps carry every kind.
const {
  DEPARTURE_TEACHER_LINE,
  DEPARTURE_RETURN_TEACHER_LINE,
  DEPARTURE_LINES,
  DEPARTURE_RETURN_LINES,
} = require(path.join(SERVER_DIR, 'routes', 'checkSolution.cjs'));

const TYPES = ['conceptual', 'calculation', 'silly', 'presentation'];
const round2 = (n) => Math.round(n * 100) / 100;
const TICK = /^\s*(✓|✔|✓)/;
const CROSS = /^\s*(×|✗|✘|×|✗)/;
const WRONG_OPTION = /wrong option|incorrect option|chose the wrong|wrong choice|incorrect choice|answer is (wrong|incorrect)/i;
const NO_WORK = /no (work|working|answer)|not (shown|attempted)|\bblank\b|nothing (was )?written|has not provided/i;
const LEAK = /marking scheme (had|has|contained|contains) an error|stored (marking )?scheme|question text (was|is|appears) garbled|derived rubric/i;
const UNATTEMPTED_RE = /not attempted|no attempt|don'?t know|dont know|not answered|left blank|no work shown|did not attempt|not provided any work/i;

const FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75 };
function num(tok) {
  const t = String(tok).trim();
  if (FRAC[t] !== undefined) return FRAC[t];
  const m = t.match(/^(\d+)\s*½$/);
  if (m) return Number(m[1]) + 0.5;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** The rubric a note shows the student ('Marked against: item value, item value, ...'):
 *  the sum of its items' marks, or null when there is none. The list ends at the first
 *  sentence break; each comma/semicolon item's mark is its LAST numeric token (so a value
 *  inside the label, e.g. "4.0 A: 1 mark", is not counted). Replaces the S3j regex, which
 *  mis-read three of four real notes in the PR-1 baseline (e.g. a trailing "0.5." dropped,
 *  "4.0 A" counted). */
function rubricSum(text) {
  const i = text.indexOf('Marked against');
  if (i < 0) return null;
  let seg = text.slice(i + 'Marked against'.length).replace(/^\s*:?\s*/, '');
  seg = seg.split(/\.(?=\s*[A-Z][a-z])|\n/)[0];
  const tok = /(\d+\s*½|\d+(?:\.\d+)?|½|¼|¾)/g;
  const vals = [];
  for (const item of seg.split(/[,;]/)) {
    const all = item.match(tok);
    if (!all) continue;
    const v = num(all[all.length - 1]);
    if (v !== null && v <= 6) vals.push(v);
  }
  return vals.length ? round2(vals.reduce((a, b) => a + b, 0)) : null;
}

function commentText(result) {
  const steps = Array.isArray(result.annotatedSteps) ? result.annotatedSteps : [];
  return [String(result.teacherNote || ''), ...steps.map((s) => String(s.teacherAnnotation || ''))].join(' \n ');
}

/**
 * @param {object} result   one per-question grade (single-grader body, or one results[] entry)
 * @param {object} exp      { totalMarks, maxMarks, objective, objectiveExpectedMarks, wrongStepLocator (RegExp|null),
 *                            departureKind, departureReturns, illegible, mergedLocator (RegExp|null) }
 * @param {RegExp} citesInstruction
 * @returns {{ id: string, detail: string }[]}
 */
function commentFailures(result, exp, citesInstruction) {
  const out = [];
  const steps = Array.isArray(result.annotatedSteps) ? result.annotatedSteps : [];
  const total = Number(result.totalMarks) || exp.maxMarks;
  steps.forEach((s, i) => {
    const a = String(s.teacherAnnotation || '');
    const ded = Number(s.marksDeducted) || 0;
    if (TICK.test(a) && (s.status === 'incorrect' || s.status === 'missing' || ded > 0)) out.push({ id: 'T01-tick-not-on-loss', detail: 'step ' + (i + 1) + ': ' + a.slice(0, 80) });
    if (CROSS.test(a) && s.status === 'correct' && ded === 0) out.push({ id: 'T02-cross-not-on-correct', detail: 'step ' + (i + 1) + ': ' + a.slice(0, 80) });
  });
  const text = commentText(result);
  const rs = rubricSum(text);
  if (rs !== null && Math.abs(rs - total) > 0.01) out.push({ id: 'T03-rubric-sums-to-total', detail: 'rubric sums to ' + rs + ' on a ' + total + '-mark question' });
  if (exp.wrongStepLocator) {
    const lossMatch = steps.some((s) => isLoss(s) && exp.wrongStepLocator.test(stepText(s)));
    const praised = steps.some((s) => s.status === 'correct' && exp.wrongStepLocator.test(String(s.studentWork || '')));
    if (!lossMatch && praised) out.push({ id: 'T04-wrong-line-not-praised', detail: 'the examiner\'s wrong line is shown as a correct step' });
  }
  const note = String(result.teacherNote || '');
  // Each kind's sentence is true only on a case of THAT kind (a different-problem sentence on
  // an invalid-method case is as false as one on a slip); the return sentence only where the
  // expected departure returns.
  const lines = DEPARTURE_LINES || { 'different-problem': DEPARTURE_TEACHER_LINE };
  const returnLines = DEPARTURE_RETURN_LINES || { 'different-problem': DEPARTURE_RETURN_TEACHER_LINE };
  for (const [kind, line] of Object.entries(lines)) {
    if (note.includes(line) && exp.departureKind !== kind) {
      out.push({ id: 'T05-departure-sentence-only-for-its-kind', detail: kind + ' sentence on a case whose expected departureKind is ' + (exp.departureKind || 'none') });
    }
  }
  for (const [kind, line] of Object.entries(returnLines)) {
    if (note.includes(line) && (!exp.departureReturns || exp.departureKind !== kind)) {
      out.push({ id: 'T05-departure-sentence-only-for-its-kind', detail: kind + ' return sentence on a case with no ' + kind + ' departure that returns' });
    }
  }
  if (exp.objective && exp.objectiveExpectedMarks > 0 && WRONG_OPTION.test(text)) out.push({ id: 'T06-no-wrong-option-claim-on-correct-pick', detail: 'correct pick told the option is wrong' });
  if (exp.illegible && NO_WORK.test(text)) out.push({ id: 'T07-illegible-is-not-no-work', detail: 'illegible page described as no work' });
  if (exp.totalMarks !== null && exp.totalMarks === exp.maxMarks && !exp.objective) {
    const accused = steps.some((s) => s.status === 'incorrect' || s.status === 'partial' || CROSS.test(String(s.teacherAnnotation || '')));
    if (accused) out.push({ id: 'T08-no-accusation-on-a-full-marks-answer', detail: 'a step is called wrong on a full-marks answer' });
  }
  if (LEAK.test(text)) out.push({ id: 'T09-no-internal-leak', detail: (text.match(LEAK) || [''])[0] });
  if (citesInstruction && citesInstruction.test(text)) out.push({ id: 'T10-no-injected-instruction-cited', detail: (text.match(citesInstruction) || [''])[0] });
  if (exp.mergedLocator && steps.some((s) => exp.mergedLocator.test(String(s.studentWork || '')))) out.push({ id: 'T11-crossed-out-not-merged', detail: 'the struck line is merged into the answer' });
  return out;
}

function stepText(s) {
  return [s.studentWork, s.description, s.teacherAnnotation, s.correctedWorking].filter(Boolean).join(' || ');
}
function isLoss(s) {
  return Number(s.marksDeducted) > 0 || ['incorrect', 'partial', 'missing'].includes(s.status) || s.isDeparture === true;
}

/** S4 `questionFacts` + `gradeChecks`, ported (grade-level only; surface renderings are Lane B's). */
function consistencyFailures(result, opts = {}) {
  const out = [];
  const steps = Array.isArray(result.annotatedSteps) ? result.annotatedSteps : [];
  const total = Number(result.totalMarks) || 0;
  const awarded = Number(result.marksAwarded) || 0;
  const stepSum = round2(steps.reduce((s, x) => s + (Number(x.marksAwarded) || 0), 0));
  const deductSum = round2(steps.reduce((s, x) => s + (Number(x.marksDeducted) || 0), 0));
  const stepTypeCounts = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  let typedLost = 0;
  const unattemptedSteps = [];
  steps.forEach((s, i) => {
    const d = Number(s.marksDeducted) || 0;
    if (s.mistakeType && stepTypeCounts[s.mistakeType] !== undefined) { stepTypeCounts[s.mistakeType] += 1; typedLost += d; }
    if (UNATTEMPTED_RE.test(String(s.studentWork || '') + ' ' + String(s.teacherAnnotation || '')) && s.status !== 'unattempted') unattemptedSteps.push(i + 1);
  });
  const lost = round2(Math.max(0, total - awarded));
  const objective = result.objective === true;
  if (!(awarded >= 0 && awarded <= total && Math.round(awarded * 2) === awarded * 2)) out.push({ id: 'C01-bounds', detail: awarded + '/' + total });
  if (objective) {
    if (!(awarded === 0 || awarded === total)) out.push({ id: 'C02-objective-binary', detail: awarded + '/' + total });
  } else {
    if (Math.abs(stepSum - awarded) >= 0.01) out.push({ id: 'C03-score-equals-step-sum', detail: 'steps ' + stepSum + ' vs ' + awarded });
    if (Math.abs(deductSum - lost) >= 0.01) out.push({ id: 'C04-lost-equals-deductions', detail: 'deductions ' + deductSum + ' vs lost ' + lost });
    if (lost > 0 && round2(typedLost) + 0.01 < lost) out.push({ id: 'C05-every-lost-mark-has-a-type', detail: 'lost ' + lost + ', typed ' + round2(typedLost) });
  }
  const summary = result.mistakeSummary || {};
  const shownNotCarried = TYPES.filter((t) => (Number(summary[t]) || 0) > 0 && stepTypeCounts[t] === 0);
  if (shownNotCarried.length) out.push({ id: 'C06-no-type-shown-that-no-step-carries', detail: shownNotCarried.join(',') });
  if (lost === 0 && TYPES.some((t) => (Number(summary[t]) || 0) > 0)) out.push({ id: 'C07-no-type-on-full-marks', detail: JSON.stringify(summary) });
  if (opts.v2 && unattemptedSteps.length) out.push({ id: 'C08-unattempted-is-a-fourth-state', detail: 'steps ' + unattemptedSteps.join(',') });
  return out;
}

module.exports = { commentFailures, consistencyFailures, rubricSum, stepText, isLoss, TYPES };
