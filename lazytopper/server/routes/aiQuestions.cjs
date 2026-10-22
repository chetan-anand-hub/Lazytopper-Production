'use strict';

/**
 * /api/ai-questions — RETIRED by MLT-MUTE-1 (owner ruling 2026-10-22).
 *
 * This route used to read and write the generated_questions cache for "More like this":
 *   GET  served cached AI-written questions to the client's practice-set builder;
 *   POST saved AI-written questions into that cache — with NO auth at all, so anyone on the
 *        internet could write rows that the next student's set (and its marking key, and
 *        Mistake Intelligence) would then serve.
 *
 * "More like this" now serves verified bank questions only (practiceQuestionBuilder.ts), so no
 * product caller remains. Both methods are refused outright with 410 and a short JSON body:
 * no flag, no body read, no pool read or write, no model call. A refusal costs nothing.
 *
 * The factory keeps its old name and signature so index.cjs wires it unchanged; it now uses
 * only `sendJson`. Pinned by aiQuestions.route.test.cjs over the REAL index.cjs.
 */

const AI_QUESTIONS_GONE_BODY = Object.freeze({
  ok: false,
  error: 'gone',
  message: 'This endpoint was retired. Practice sets serve verified bank questions only.',
});

function createAiQuestionsRoute({ sendJson }) {
  function refuse(_req, res) {
    return sendJson(res, 410, { ...AI_QUESTIONS_GONE_BODY });
  }
  return { handleGet: refuse, handlePost: refuse };
}

module.exports = { createAiQuestionsRoute, AI_QUESTIONS_GONE_BODY };
