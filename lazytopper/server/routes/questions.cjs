const { createStepSolutionRoute, getOrCreateModelSolution } = require('./stepSolution.cjs');
const { createCheckSolutionRoute } = require('./checkSolution.cjs');

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
  const { handleCheckSolution, handleDetectQuestion, handleGradeWorksheet } = createCheckSolutionRoute({ ...deps, solutionCache });

  // MLT-RETIRE-1: handleMoreLikeThis is gone; POST /api/more-like-this is answered 410 by
  // routes/moreLikeThis.cjs, wired directly in index.cjs.
  return { handleStepSolution, handleCheckSolution, handleDetectQuestion, handleGradeWorksheet };
}

module.exports = { createQuestionRoutes };
