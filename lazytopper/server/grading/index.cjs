'use strict';
// server/grading — the ONE grading core (GRADER-CORE-1 PR-2). See core.cjs.
//   rules.cjs        the one rule set + taxonomy + server-produced sentences
//   schema.cjs       the one response schema
//   fence.cjs        random per-request fences (C6)
//   prompt.cjs       the one prompt builder (three transports, one rulebook)
//   verify.cjs       deterministic arithmetic + final-answer checks (C4)
//   postprocess.cjs  the one post-processing path (C2, C3, C3b, C6 check, C7)
//   modelConfig.cjs  the grading-only model setting + fallback (D17)
//   core.cjs         gradeSet(): cache hook → prompt → model (+retry, +fallback) → normalise

module.exports = {
  ...require('./core.cjs'),
  ...require('./rules.cjs'),
  ...require('./schema.cjs'),
  ...require('./fence.cjs'),
  ...require('./verify.cjs'),
  ...require('./postprocess.cjs'),
  ...require('./modelConfig.cjs'),
};
