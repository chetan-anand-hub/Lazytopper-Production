'use strict';
// lib/schemeCache.cjs — GRADER-TYPE-1 E1 (owner ruling R3, 22 Nov 2026): the golden driver's REAL scheme step.
//
// Production grades a keyless subjective question WITH a model-generated solution (grading/core.cjs pre-phase ->
// routes/stepSolution.cjs getOrCreateModelSolution: hash -> cache read -> on a miss ONE model call -> quality gate ->
// write-if-pass). The golden driver used to stub that hook with `null`, so every paid golden run graded WITHOUT the scheme
// production adds.
//
// LIVE (createInMemorySchemeCache): the SAME generator (`generateModelSolution`, same quality gate, same renderer) behind an
// in-memory cache, on the GRADING model (never the --detect-model proxy), metered through the driver's `callGemini`. It can be
// PRELOADED from / PERSISTED to a scheme file, so a baseline and a candidate grade with the SAME frozen schemes. Concurrent misses
// for one question share one generation. The schemes a job used, and the raw texts of its generation calls, are collected per job
// (AsyncLocalStorage) and stored in the job's record.
// REPLAY (createReplaySchemeCache): serves exactly the schemes the record stored, with NO model call, so a replay of a scheme-ON
// run asks the stored pool for grading calls only.

const path = require('path');

const SERVER_DIR = path.join(__dirname, '..', '..', '..');
const S = require(path.join(SERVER_DIR, 'routes', 'stepSolution.cjs'));

const hashOf = (fields) => {
  const question = String((fields && fields.question) || '').trim();
  const marks = Number(fields && fields.marks) || 0;
  return question && marks >= 1 ? S.computeQuestionHash(question, marks) : null;
};

/**
 * @param {object} deps  callGemini (metered), GEMINI_MODEL, ACTIVE_PROVIDER, extractJsonObjectFromText.
 * @param {{ calls: number, generated: number, hits: number }} counters  mutated.
 * @param {{ als?: object, schemeModel?: string, preload?: object, onStore?: Function }} [opts]
 */
function createInMemorySchemeCache(deps, counters, opts = {}) {
  const store = new Map(Object.entries(opts.preload || {}));
  const inflight = new Map();
  const genDeps = {
    ...deps,
    ...(opts.schemeModel ? { GEMINI_MODEL: opts.schemeModel } : {}),
    callGemini: async (...a) => {
      const r = await deps.callGemini(...a);
      const st = opts.als && opts.als.getStore();
      if (st && r && typeof r.text === 'string') st.genTexts.push(r.text);
      return r;
    },
  };
  const touch = (hash, solution) => { const st = opts.als && opts.als.getStore(); if (st) st.used[hash] = solution; };
  const generate = async (fields, hash, marks) => {
    const isObj = fields.isObjective === true;
    const gen = await S.generateModelSolution({
      question: String(fields.question).trim(), marks, subject: fields.subject, topic: fields.topic, qType: fields.qType, section: fields.section,
      existingAnswer: '', existingExplanation: '', isObjective: isObj,
    }, genDeps);
    if (!gen) return null;
    counters.generated += 1;
    const quality = S.validateSolutionQuality(gen.solution, marks, isObj);
    // production serves a failing / non-cacheable solution ONCE and does not store it; so do we.
    if (gen.cacheable && quality.ok) { store.set(hash, gen.solution); if (opts.onStore) opts.onStore(hash, gen.solution, store); }
    return gen.solution;
  };
  return {
    size: () => store.size,
    snapshot: () => Object.fromEntries(store),
    getOrCreateModelSolution: async (fields) => {
      counters.calls += 1;
      try {
        const hash = hashOf(fields);
        if (!hash) return null;
        const marks = Number(fields.marks) || 0;
        let solution = store.get(hash);
        if (solution) counters.hits += 1;
        else {
          if (!inflight.has(hash)) inflight.set(hash, generate(fields, hash, marks).finally(() => inflight.delete(hash)));
          solution = await inflight.get(hash);
        }
        if (!solution) return null;
        touch(hash, solution);
        const schemeSteps = S.renderSolutionSchemeSteps(solution);
        return schemeSteps.length > 0 ? { schemeSteps, fromCache: store.has(hash), hash } : null;
      } catch {
        return null; // production never lets the cache block a grade
      }
    },
  };
}

/** @param {object} schemes  {hash: solution} stored in the job record. */
function createReplaySchemeCache(schemes, counters) {
  return {
    getOrCreateModelSolution: async (fields) => {
      counters.calls += 1;
      const hash = hashOf(fields);
      const solution = hash && schemes ? schemes[hash] : null;
      if (!solution) return null;
      counters.hits += 1;
      const schemeSteps = S.renderSolutionSchemeSteps(solution);
      return schemeSteps.length > 0 ? { schemeSteps, fromCache: true, hash } : null;
    },
  };
}

module.exports = { createInMemorySchemeCache, createReplaySchemeCache };
