'use strict';
// server/grading/modelConfig.cjs — the GRADING-ONLY model setting (controller decision D17).
//
// WHY A SEPARATE SETTING: GEMINI_MODEL also drives question detection (which sends
// thinkingBudget 0 — a pro model rejects that with HTTP 400) and is the tutor's default.
// The grading model is chosen by DATA on the golden set and the owner picks it; it must move
// grading and nothing else.
//
// ★ THE CODE DEFAULT IS WHAT PRODUCTION RUNS. Railway sets no GRADING_MODEL, so the
// constants below ARE production's grading model. `GRADING_MODEL` / `GRADING_THINKING_BUDGET`
// in the environment override them (an emergency switch, never required).
//
// ⚠ PENDING THE OWNER'S CHOICE (PR-2 build, 2026-10-05). Until it is made the default stays
// on today's production model, so this file changes nothing in production by itself.
// Candidates measured in PR-1: gemini-2.5-flash (dynamic thinking) or gemini-3.1-pro-preview
// with thinkingBudget 2048.
const DEFAULT_GRADING_MODEL = 'gemini-2.5-flash';
const DEFAULT_GRADING_THINKING_BUDGET = null; // null = the model's dynamic thinking
// 'single' = every graded question goes to GRADING_MODEL. 'router' = the owner's routed
// configuration (c): an objective question whose pick is already known is scored with NO
// model call; 1–2-mark TYPED answers go to the light model; 3–5-mark answers, proofs and
// every photographed answer go to GRADING_MODEL. Routed per question, also inside papers.
const DEFAULT_GRADING_MODE = 'single';
const DEFAULT_GRADING_LIGHT_MODEL = 'gemini-2.5-flash';

// When the chosen model answers "not available / not permitted" (a preview model the
// production key cannot use), grading falls back to this — logged once per process and
// COUNTED on every fallback call (`grading.model_fallback`, /api/admin/token-telemetry).
const GRADING_FALLBACK_MODEL = 'gemini-2.5-flash';

/** Read the grading configuration from the environment, defaulting to the code constants. */
function resolveGradingModel(env = process.env) {
  const model = String(env.GRADING_MODEL || '').trim() || DEFAULT_GRADING_MODEL;
  const rawBudget = env.GRADING_THINKING_BUDGET;
  let thinkingBudget = DEFAULT_GRADING_THINKING_BUDGET;
  if (rawBudget != null && String(rawBudget).trim() !== '') {
    const n = Number(rawBudget);
    thinkingBudget = Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_GRADING_THINKING_BUDGET;
  }
  const rawMode = String(env.GRADING_MODE || '').trim().toLowerCase();
  const mode = rawMode === 'router' || rawMode === 'single' ? rawMode : DEFAULT_GRADING_MODE;
  const lightModel = String(env.GRADING_LIGHT_MODEL || '').trim() || DEFAULT_GRADING_LIGHT_MODEL;
  return { model, thinkingBudget, mode, lightModel };
}

/** A provider error that means "this model is not available to this key", not a bad request. */
function isModelUnavailable(err) {
  const status = Number(err && (err.status || err.statusCode));
  if (status === 403 || status === 404) return true;
  if (status === 400) {
    return /model|thinking|budget|not found|not supported|unsupported|no longer available|permission|not available/i.test(String((err && err.message) || ''));
  }
  return false;
}

module.exports = {
  DEFAULT_GRADING_MODEL,
  DEFAULT_GRADING_THINKING_BUDGET,
  DEFAULT_GRADING_MODE,
  DEFAULT_GRADING_LIGHT_MODEL,
  GRADING_FALLBACK_MODEL,
  resolveGradingModel,
  isModelUnavailable,
};
