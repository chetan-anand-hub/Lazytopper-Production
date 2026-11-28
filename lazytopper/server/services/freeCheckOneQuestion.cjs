/**
 * freeCheckOneQuestion.cjs - FREECHECK-ONEQ-1: a signed-out FREE CHECK grades ONE question.
 *
 * Owner ruling (21 Nov 2026): the free Answer Checker upload marks only the FIRST question of the
 * page; the rest are shown to the visitor ungraded (the 3-day free trial covers them). Before this,
 * a multi-question upload on /api/grade-worksheet graded every question for free.
 *
 * WHERE: index.cjs calls `apply` ONLY for an ADMITTED free check (freeCheckGate.admit passed) on
 * POST /api/grade-worksheet, after every gate and before the handler. It truncates the request body's
 * `questions` array in place (the pre-read body object the handler's readJson returns), so the handler
 * grades exactly one question through its UNCHANGED grading code. Nothing is refused: a cached old
 * client that still posts N questions simply gets 1 graded.
 *
 * WIRE CONTRACT: the 200 body of a truncated request carries
 *   freeCheckGradedOf: { graded: 1, total: N }      (N = the number of questions the body carried)
 * added by `fieldFor` in checkSolution.cjs's synchronous return. A body that carried one question, a
 * signed-in request, /api/check-solution and the kill-switched server never carry the field.
 *
 * KILL SWITCH: FREE_CHECK_ONE_QUESTION_DISABLED=1 -> `apply` does nothing; behaviour is byte-identical
 * to before this lane.
 *
 * It changes HOW MANY questions a signed-out free check sends to the grader, never HOW one is marked:
 * no prompt, mark rule, mistake type or objective clamp lives here.
 */

const truncations = new WeakMap(); // payload object -> { graded, total }

function isDisabled(env = process.env) {
  const v = String((env && env.FREE_CHECK_ONE_QUESTION_DISABLED) || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

/** The first question, in the body's own order, that the handler would keep (qNumber > 0 and text). */
function firstGradableIndex(questions) {
  const i = questions.findIndex((q) => q && Number(q.qNumber) > 0 && String(q.questionText || '').trim());
  return i < 0 ? 0 : i;
}

/**
 * Truncate a parsed grade-worksheet body to ONE question. Returns true when it truncated.
 * Mutates `payload.questions` in place and records { graded: 1, total } for `fieldFor`.
 */
function truncatePayload(payload, env = process.env) {
  if (isDisabled(env)) return false;
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.questions)) return false;
  const total = payload.questions.length;
  if (total <= 1) return false;
  payload.questions = [payload.questions[firstGradableIndex(payload.questions)]];
  truncations.set(payload, { graded: 1, total });
  return true;
}

/** index.cjs entry: `readBody` is the pre-read (cached) body reader. A bad body is left to the handler's own 400. */
async function apply(req, readBody, env = process.env) {
  if (isDisabled(env)) return false;
  let payload;
  try { payload = await readBody(req); } catch { return false; }
  return truncatePayload(payload, env);
}

/** The extra response field for a truncated payload, else {} (spread-safe). */
function fieldFor(payload) {
  const t = payload && typeof payload === 'object' ? truncations.get(payload) : null;
  return t ? { freeCheckGradedOf: { graded: t.graded, total: t.total } } : {};
}

module.exports = { apply, truncatePayload, fieldFor, isDisabled };
