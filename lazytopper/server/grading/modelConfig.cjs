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
// CHOSEN BY DATA (GRADER-CORE-1 PR-2 live phase, 2026-10-05, owner model rule: the cheapest
// configuration that meets the bar within Rs 125 per student per month). Measured on a stratified
// 20-item subset under the new rules: (a) flash only, (b) gemini-3.1-pro-preview capped 2048,
// (c) the router. (b) ≈ Rs 174 and (c) ≈ Rs 156 per student-month are over the cap; (a) ≈ Rs 80.
// ⚠ (a) RUNS gemini-3.8-flash: the eval key's project is refused gemini-2.5-flash ("no longer
// available to new users … use models/gemini-3.8-flash", HTTP 404), so the provider-named
// successor was measured and is what ships. If production's key is refused it, grading falls
// back to gemini-2.5-flash (today's production model) — counted, logged once, header names it.
// Its list price doubles on 2027-01-01 ($0.75/$3.75 → $1.50/$7.50 per 1M): Rs 80 → Rs 160 per
// student-month at the reference usage — over Rs 125 from that date unless thinking is capped
// or the prompt is cached/trimmed (PR-2 report, owner decision).
const DEFAULT_GRADING_MODEL = 'gemini-3.8-flash';
// THINK-CAP-1 (GRADING-JOBS-1 ruling 7, "no paper ever times out"; decisions D50/D57/D58): a
// thinking CEILING on every grading call (singles and paper/job chunks). With dynamic thinking the
// same request swung 6-12x in thinking tokens, and single calls / 7-question job chunks ran into the
// 78 s / 120 s caps (A-17 R6-AB, J1-LIVE, GOLDEN-RERUN reports). Chosen by data on the eval key
// (THINK-CAP-1 report): the smallest ceiling that met every golden floor on the sample.
// GRADING_THINKING_BUDGET still overrides it: a number >= 0 sets the ceiling, "-1" / "dynamic"
// restores the model's dynamic thinking (no settings change needed to ship; one env var reverts).
const DEFAULT_GRADING_THINKING_BUDGET = 2048;
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
    const raw = String(rawBudget).trim().toLowerCase();
    const n = Number(raw);
    if (raw === 'dynamic' || n === -1) thinkingBudget = null; // explicit opt-out of the ceiling
    else thinkingBudget = Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_GRADING_THINKING_BUDGET;
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
