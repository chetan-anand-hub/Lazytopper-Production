'use strict';
// lib/schemeCache.cjs — GRADER-TYPE-1 E1 (owner ruling R3, 22 Nov 2026): the golden driver's REAL scheme step.
//
// Production grades a keyless subjective question WITH a model-generated solution (grading/core.cjs pre-phase ->
// routes/stepSolution.cjs getOrCreateModelSolution: hash -> cache read -> on a miss ONE model call -> quality gate ->
// write-if-pass). The golden driver used to stub that hook with `null`, so every paid golden run graded WITHOUT the scheme
// production adds, and a prompt change measured that way is not measured under production conditions.
//
// This is the SAME function, minus the database: an IN-MEMORY cache (Map keyed by the production hash) in front of the
// SAME generator (`generateModelSolution`), the SAME quality gate and the SAME renderer. Every generation is a model call
// through the driver's metered `callGemini`, so it is metered, counted in the run's ledger, and recorded in the stored job
// record (replay serves it back). Nothing here touches a pool, the network or the clock.

const path = require('path');

const SERVER_DIR = path.join(__dirname, '..', '..', '..');
const S = require(path.join(SERVER_DIR, 'routes', 'stepSolution.cjs'));

/**
 * @param {object} deps  the same deps `generateModelSolution` takes: callGemini (metered), GEMINI_MODEL, ACTIVE_PROVIDER,
 *                       extractJsonObjectFromText.
 * @param {{ calls: number, generated: number, hits: number }} counters  mutated; the driver reads them.
 */
function createInMemorySchemeCache(deps, counters) {
  const store = new Map();
  return {
    size: () => store.size,
    getOrCreateModelSolution: async (fields) => {
      counters.calls += 1;
      try {
        const question = String((fields && fields.question) || '').trim();
        const marks = Number(fields && fields.marks) || 0;
        if (!question || marks < 1) return null;
        const hash = S.computeQuestionHash(question, marks);
        let solution = store.get(hash);
        if (solution) counters.hits += 1;
        else {
          const isObj = fields.isObjective === true;
          const gen = await S.generateModelSolution({
            question, marks, subject: fields.subject, topic: fields.topic, qType: fields.qType, section: fields.section,
            existingAnswer: '', existingExplanation: '', isObjective: isObj,
          }, deps);
          if (!gen) return null;
          counters.generated += 1;
          const quality = S.validateSolutionQuality(gen.solution, marks, isObj);
          // production serves a failing / non-cacheable solution ONCE and does not store it; so do we.
          if (gen.cacheable && quality.ok) store.set(hash, gen.solution);
          solution = gen.solution;
        }
        const schemeSteps = S.renderSolutionSchemeSteps(solution);
        return schemeSteps.length > 0 ? { schemeSteps, fromCache: store.has(hash), hash } : null;
      } catch {
        return null; // production never lets the cache block a grade
      }
    },
  };
}

module.exports = { createInMemorySchemeCache };
