'use strict';

/**
 * POST /api/more-like-this — RETIRED by MLT-RETIRE-1 (owner ruling 2026-10-23).
 *
 * This route used to ask the model for "More like this" question variants (with a read and a
 * write of the generated_questions pool around it). MLT-MUTE-1 (#1295, 2026-10-22) stopped every
 * client call to it: practice sets serve verified bank questions only. The route itself stayed
 * live — authenticated, metered and able to reach the model — with no product caller.
 *
 * It is now refused outright with 410 and a short JSON body, exactly like /api/ai-questions
 * (routes/aiQuestions.cjs): no body read, no pool read or write, no model call. The path was
 * also removed from every metering / gate table (rateLimiter PAID_ENDPOINTS, fairUse AI_ROUTES,
 * entitlement AI_CALLER_ROUTES / AI_TIER_GATED_ROUTES), so the refusal costs nothing and writes
 * no usage-ledger row or trial counter. A stale cached client gets a clean 410, signed in or not.
 *
 * Pinned by moreLikeThis.route.test.cjs over the REAL index.cjs.
 */

const MORE_LIKE_THIS_GONE_BODY = Object.freeze({
  ok: false,
  error: 'gone',
  message: 'This endpoint was retired. Practice sets serve verified bank questions only.',
});

function createMoreLikeThisRoute({ sendJson }) {
  function handlePost(_req, res) {
    return sendJson(res, 410, { ...MORE_LIKE_THIS_GONE_BODY });
  }
  return { handlePost };
}

module.exports = { createMoreLikeThisRoute, MORE_LIKE_THIS_GONE_BODY };
