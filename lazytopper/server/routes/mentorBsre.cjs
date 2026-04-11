function createMentorBsre(deps) {
  const { flattenToLower, trianglesRubricMap, telemetry } = deps;
let bsreEvaluatorInstance = null;

function getBsreEvaluator() {
  if (bsreEvaluatorInstance === false) {
    return null;
  }
  if (!bsreEvaluatorInstance) {
    try {
      const { BsreEvaluator } = require('../src/engine/bsre/evaluator.ts');
      bsreEvaluatorInstance = new BsreEvaluator();
    } catch (err) {
      telemetry.increment('bsre_eval_loader_failed');
      console.warn('[bsre] evaluator unavailable:', String(err?.message || err));
      bsreEvaluatorInstance = false;
      return null;
    }
  }
  return bsreEvaluatorInstance;
}

function determineBsreRubricId(payload) {
  const candidate = String(payload?.rubricId || '').trim();
  if (candidate && trianglesRubricMap.has(candidate)) return candidate;

  const hintText = flattenToLower(
    payload?.theoremFocus,
    payload?.focus,
    payload?.subSection,
    payload?.section,
    payload?.questionText,
    payload?.question,
    payload?.prompt,
    payload?.contextText
  );

  if (hintText.includes('bisector')) return 'angle_bisector_theorem';
  if (hintText.includes('basic proportionality') || (hintText.includes('parallel') && hintText.includes('ratio')) || hintText.includes('bpt')) {
    return 'midpoint_basic_proportionality_theorem';
  }
  if (hintText.includes('area ratio')) return 'similarity_proof_aa_sas_sss';
  if (hintText.includes('similar') && !hintText.includes('congruent')) return 'similarity_proof_aa_sas_sss';
  if (hintText.includes('congruent') || hintText.includes('prove triangles congruent')) {
    return 'congruence_proof_sss_sas_asa_rhs';
  }

  return 'prove_triangles_congruent_standard';
}

function normalizeNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

function buildBsreStructured(evaluation, payload) {
  const rubric = trianglesRubricMap.get(evaluation.rubricId);
  const rubricMarks = normalizeNumber(rubric?.totalMarks, 0);
  const payloadMarks = normalizeNumber(
    payload?.marks ?? payload?.totalMarks ?? payload?.total_marks,
    0
  );
  const stepTotal = (evaluation.stepResults || []).reduce(
    (sum, step) => sum + normalizeNumber(step?.marks, 0),
    0
  );
  const fallbackTotal = Math.max(rubricMarks, payloadMarks, stepTotal, 5);
  const totalMarks = Math.round(fallbackTotal) || 5;
  const lostMarks = Math.max(0, totalMarks - evaluation.score);

  const stepParts = (evaluation.stepResults || []).map((step) => {
    const mark = normalizeNumber(step?.marks, 0);
    const status = step?.passed ? '✓' : '✗';
    return `${step.stepId} (${mark}m ${status})`;
  });
  const breakdownLine = stepParts.length ? stepParts.join(' | ') : 'No step details provided.';
  const nextStep =
    String(evaluation.hintSuggestions?.[0] || evaluation.shortFeedback || '')
      .replace(/\s+/g, ' ')
      .trim() || 'Review the answer and try again.';
  const tutorLines = [
    `Score: ${evaluation.score}/${totalMarks}`,
    `Breakdown: ${breakdownLine}`,
    `Marks gained: ${evaluation.score}`,
    `Marks lost: ${lostMarks}`,
    `Next step: ${nextStep}`,
  ];

  return {
    kind: 'final',
    tutor: tutorLines.join('\n'),
    finalAnswer: `Score: ${evaluation.score}/${totalMarks}`,
  };
}

function runBsreEvaluation(payload, attempt, rubricIdOverride) {
  const studentAnswer = String(attempt || '').trim();
  if (!studentAnswer) {
    throw new Error('Student attempt is empty.');
  }

  const rubricId = String(rubricIdOverride || determineBsreRubricId(payload));
  const evaluator = getBsreEvaluator();
  if (!evaluator || typeof evaluator.evaluateAnswer !== 'function') {
    telemetry.increment('bsre_eval_unavailable');
    throw new Error('BSRE evaluator unavailable.');
  }
  telemetry.increment('bsre_eval_called');

  const evaluation = evaluator.evaluateAnswer(studentAnswer, rubricId);
  telemetry.increment('bsre_eval_completed');

  const confidence = evaluation?.confidence;
  if (typeof confidence === 'number' && confidence < 0.5) {
    telemetry.increment('bsre_eval_low_confidence');
  }

  return buildBsreStructured(evaluation, payload);
}

  return {
    getBsreEvaluator,
    determineBsreRubricId,
    normalizeNumber,
    buildBsreStructured,
    runBsreEvaluation,
  };
}
module.exports = { createMentorBsre };
