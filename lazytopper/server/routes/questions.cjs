const { createMoreLikeThisRoute, extractVariantsJson } = require('./moreLikeThis.cjs');
const { createStepSolutionRoute } = require('./stepSolution.cjs');
const { createCheckSolutionRoute } = require('./checkSolution.cjs');

function createQuestionRoutes(deps) {
  const { handleMoreLikeThis } = createMoreLikeThisRoute(deps);
  const { handleStepSolution } = createStepSolutionRoute(deps);
  const { handleCheckSolution, handleDetectQuestion, handleGradeWorksheet } = createCheckSolutionRoute(deps);

  return { handleMoreLikeThis, handleStepSolution, handleCheckSolution, handleDetectQuestion, handleGradeWorksheet };
}

module.exports = { createQuestionRoutes, extractVariantsJson };
