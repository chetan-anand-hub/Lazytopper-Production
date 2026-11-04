const { createStepSolutionRoute, getOrCreateModelSolution } = require('./stepSolution.cjs');
const { createCheckSolutionRoute } = require('./checkSolution.cjs');

// SMALL-FIXES-1 · `answerSource` (provenance of a detect-derived MCQ key, MCQ-KEY-TRUST-1) belongs to
// the Answer Checker alone. Both Answer Checker paths send `X-Lazytopper-Surface: check-improve`; on a
// grade request carrying any other surface (or none) the field is dropped here, before the grader
// sees the body, so Worksheet / Chapter Test / Full Mock / Quick Practice requests behave byte-for-
// byte as before. Wired as a wrapper on `readJson` so checkSolution.cjs itself is untouched.
function isAnswerCheckerRequest(req) {
  const h = req && req.headers ? req.headers['x-lazytopper-surface'] : '';
  return String(h || '').trim().toLowerCase() === 'check-improve';
}
function dropAnswerSourceUnlessAnswerChecker(req, body) {
  if (!body || typeof body !== 'object' || isAnswerCheckerRequest(req)) return body;
  if ('answerSource' in body) delete body.answerSource;
  if (Array.isArray(body.questions)) {
    for (const q of body.questions) {
      if (q && typeof q === 'object' && 'answerSource' in q) delete q.answerSource;
    }
  }
  return body;
}
function withAnswerSourceFilter(deps) {
  if (!deps || typeof deps.readJson !== 'function') return deps;
  const readJson = deps.readJson;
  return { ...deps, readJson: async (req, ...rest) => dropAnswerSourceUnlessAnswerChecker(req, await readJson(req, ...rest)) };
}

function createQuestionRoutes(deps) {
  const { handleStepSolution } = createStepSolutionRoute(deps);
  // C&I PR-3: hand the grader the shared model-solution cache THROUGH deps —
  // checkSolution.cjs itself gains no import (its hooks are skipped whenever
  // this key is absent), and tests inject a stub the same way. The cache lives
  // in stepSolution.cjs (the ONE Postgres step_solutions cache — hash → read →
  // generate-from-question-only on miss → Gate-2a quality check → write-if-pass).
  const solutionCache = {
    getOrCreateModelSolution: (fields) => getOrCreateModelSolution(fields, deps),
  };
  const { handleCheckSolution, handleDetectQuestion, handleGradeWorksheet } = createCheckSolutionRoute({ ...withAnswerSourceFilter(deps), solutionCache });

  // MLT-RETIRE-1: handleMoreLikeThis is gone; POST /api/more-like-this is answered 410 by
  // routes/moreLikeThis.cjs, wired directly in index.cjs.
  return { handleStepSolution, handleCheckSolution, handleDetectQuestion, handleGradeWorksheet };
}

module.exports = { createQuestionRoutes, dropAnswerSourceUnlessAnswerChecker };
