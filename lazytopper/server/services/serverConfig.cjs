const path = require('path');
const fs = require('fs');
const { resolveGradingModel } = require('../grading/modelConfig.cjs');

function loadDotEnvIfPresent() {
  const envPath = path.join(__dirname, '..', '.env');
  try {
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = String(line || '').trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (k && process.env[k] == null) process.env[k] = v;
    });
  } catch (e) {
    console.warn('[env] Failed to load server/.env:', e.message);
  }
}

/*
 * GRADING-JOBS-1 J3 (controller D71): background grading jobs are ON BY DEFAULT. GRADING_JOBS is
 * now only a KILL SWITCH, read trimmed and case-insensitively:
 *   unset / empty            → ON  (the default; no ENV_USED note)
 *   "0" | "off" | "false"    → OFF (every submit graded synchronously, byte-identical to before)
 *   "1" | "on"  | "true"     → ON
 *   anything else            → ON, plus an ENV_USED note naming it unrecognised. Fail-open is
 *                              deliberate: the code default is ON, so a typo must not silently
 *                              turn jobs off; only an explicit off value does.
 * Operators: DELETING the variable turns jobs ON. To turn them off, set GRADING_JOBS=0 and redeploy.
 */
const GRADING_JOBS_OFF_VALUES = new Set(['0', 'off', 'false']);
const GRADING_JOBS_ON_VALUES = new Set(['1', 'on', 'true']);

function describeGradingJobsSwitch(env = process.env) {
  const value = String((env && env.GRADING_JOBS) || '').trim().toLowerCase();
  if (!value) return { on: true, envNote: null };
  if (GRADING_JOBS_OFF_VALUES.has(value)) return { on: false, envNote: 'GRADING_JOBS=off' };
  if (GRADING_JOBS_ON_VALUES.has(value)) return { on: true, envNote: 'GRADING_JOBS=1' };
  return { on: true, envNote: 'GRADING_JOBS=1(unrecognised value; use 0/off/false to turn jobs off)' };
}

function resolveGradingJobsSwitch(env = process.env) {
  return describeGradingJobsSwitch(env).on;
}

function resolveConfig() {
  loadDotEnvIfPresent();

  const RAW_API_KEY = String(process.env.API_KEY || '').trim();
  const RAW_AI_PROVIDER = String(process.env.AI_PROVIDER || '').trim();
  const ENV_USED = [];

  const REPLIT_GEMINI_BASE_URL = String(process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || '').trim().replace(/\/+$/, '');
  const REPLIT_GEMINI_API_KEY = String(process.env.AI_INTEGRATIONS_GEMINI_API_KEY || '').trim();
  const HAS_REPLIT_PROXY = Boolean(REPLIT_GEMINI_BASE_URL && REPLIT_GEMINI_API_KEY);

  const REPLIT_ANTHROPIC_BASE_URL = String(process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || '').trim().replace(/\/+$/, '');
  const REPLIT_ANTHROPIC_API_KEY = String(process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || '').trim();
  const HAS_ANTHROPIC_PROXY = Boolean(REPLIT_ANTHROPIC_BASE_URL && REPLIT_ANTHROPIC_API_KEY);

  const CLAUDE_MODEL_SONNET = 'claude-sonnet-4-6';
  const CLAUDE_MODEL_HAIKU = 'claude-haiku-4-5';
  const ANTHROPIC_TIMEOUT_MS = Math.max(5000, Number(process.env.ANTHROPIC_TIMEOUT_MS || 60000) || 60000);

  if (HAS_REPLIT_PROXY) ENV_USED.push('AI_INTEGRATIONS_GEMINI (Replit proxy)');
  if (HAS_ANTHROPIC_PROXY) ENV_USED.push('AI_INTEGRATIONS_ANTHROPIC (Replit proxy)');
  if (RAW_API_KEY) ENV_USED.push('API_KEY');

  const HAS_API_KEY = Boolean(RAW_API_KEY);
  if (!RAW_AI_PROVIDER && (HAS_API_KEY || HAS_REPLIT_PROXY)) {
    process.env.AI_PROVIDER = 'gemini';
  } else if (RAW_AI_PROVIDER) {
    ENV_USED.push('AI_PROVIDER');
  }

  const PORT = process.env.PORT || 3001;
  const AI_PROVIDER = String(process.env.AI_PROVIDER || '').trim();
  const API_KEY = String(process.env.API_KEY || '').trim();
  const CORS_ORIGIN = String(process.env.CORS_ORIGIN || 'http://localhost:25246').trim();
  const AI_PROVIDER_NORMALIZED = AI_PROVIDER.toLowerCase();
  const HAS_DIRECT_KEY = AI_PROVIDER_NORMALIZED === 'gemini' && Boolean(API_KEY);
  const STUB_MODE = !HAS_REPLIT_PROXY && !HAS_DIRECT_KEY && !HAS_ANTHROPIC_PROXY;
  const ACTIVE_PROVIDER = STUB_MODE ? 'stub' : (HAS_DIRECT_KEY || HAS_REPLIT_PROXY ? 'gemini' : 'anthropic');
  const GEMINI_API_KEY = HAS_DIRECT_KEY ? API_KEY : (HAS_REPLIT_PROXY ? REPLIT_GEMINI_API_KEY : '');
  const DIRECT_GEMINI_API_KEY = HAS_DIRECT_KEY ? API_KEY : '';
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const GEMINI_TUTOR_MODEL = process.env.GEMINI_TUTOR_MODEL || GEMINI_MODEL;
  if (process.env.GEMINI_TUTOR_MODEL) ENV_USED.push(`GEMINI_TUTOR_MODEL=${GEMINI_TUTOR_MODEL}`);
  // GRADER-CORE-1 PR-2 (D17): the GRADING-ONLY model. Its code default lives in
  // server/grading/modelConfig.cjs and is what production runs (Railway sets no
  // GRADING_MODEL); GEMINI_MODEL keeps driving detection and the tutor.
  const { model: GRADING_MODEL, thinkingBudget: GRADING_THINKING_BUDGET, mode: GRADING_MODE, lightModel: GRADING_LIGHT_MODEL } = resolveGradingModel(process.env);
  if (process.env.GRADING_MODE) ENV_USED.push(`GRADING_MODE=${GRADING_MODE}`);
  if (process.env.GRADING_LIGHT_MODEL) ENV_USED.push(`GRADING_LIGHT_MODEL=${GRADING_LIGHT_MODEL}`);
  if (process.env.GRADING_MODEL) ENV_USED.push(`GRADING_MODEL=${GRADING_MODEL}`);
  if (process.env.GRADING_THINKING_BUDGET) ENV_USED.push(`GRADING_THINKING_BUDGET=${GRADING_THINKING_BUDGET}`);
  const GEMINI_TIMEOUT_MS = Math.max(5000, Number(process.env.GEMINI_TIMEOUT_MS || 55000) || 55000);
  // GRADER-CORE-1 PR-3 (C8, controller decision D15): GRADING has its own time budget and does
  // NOT read GEMINI_TIMEOUT_MS (which keeps governing detect, the tutor and every other
  // non-grading call). Code defaults in server/grading/timing.cjs are what production runs.
  const { resolveGradingTiming } = require('../grading/timing.cjs');
  const { deadlineMs: GRADING_DEADLINE_MS, chunkTimeoutMs: GRADING_CHUNK_TIMEOUT_MS, cacheBudgetMs: GRADING_CACHE_BUDGET_MS } = resolveGradingTiming(process.env);
  if (process.env.GRADING_DEADLINE_MS) ENV_USED.push(`GRADING_DEADLINE_MS=${GRADING_DEADLINE_MS}`);
  if (process.env.GRADING_CHUNK_TIMEOUT_MS) ENV_USED.push(`GRADING_CHUNK_TIMEOUT_MS=${GRADING_CHUNK_TIMEOUT_MS}`);
  if (process.env.GRADING_CACHE_BUDGET_MS) ENV_USED.push(`GRADING_CACHE_BUDGET_MS=${GRADING_CACHE_BUDGET_MS}`);
  // GRADING-JOBS-1 (owner ruling 7; J3 / D71): background grading jobs, ON by default. GRADING_JOBS
  // set to 0/off/false is the kill switch: off, a submit asking for one is graded synchronously.
  const { on: GRADING_JOBS, envNote: GRADING_JOBS_ENV_NOTE } = describeGradingJobsSwitch(process.env);
  if (GRADING_JOBS_ENV_NOTE) ENV_USED.push(GRADING_JOBS_ENV_NOTE);
  const IS_DEV = String(process.env.NODE_ENV || '').toLowerCase() !== 'production';
  const REPO_ROOT = process.cwd();
  const MAX_HISTORY_TURNS = 4;
  const FEEDBACK_DIR = path.join(REPO_ROOT, '.project_memory', 'ops', 'feedback');
  const FEEDBACK_FILE = path.join(FEEDBACK_DIR, 'triangles_feedback.jsonl');
  const TEACH_CACHE_TTL_MS = IS_DEV ? 90_000 : 60_000;
  const VISUALS_DIR = path.join(REPO_ROOT, 'public', 'visuals');
  const MANIFEST_PATH = path.join(VISUALS_DIR, 'manifest.json');

  // How often (ms) the background top-up job re-checks and fills the pool.
  // Default: 24 h.  Set WARM_POOL_TOP_UP_INTERVAL_MS=0 to disable recurring top-up.
  const WARM_POOL_TOP_UP_INTERVAL_MS = Math.max(
    0,
    Number(process.env.WARM_POOL_TOP_UP_INTERVAL_MS ?? 86_400_000) || 0
  );
  if (process.env.WARM_POOL_TOP_UP_INTERVAL_MS) ENV_USED.push(`WARM_POOL_TOP_UP_INTERVAL_MS=${WARM_POOL_TOP_UP_INTERVAL_MS}`);
  if (process.env.WARM_POOL_TARGET_COUNT) ENV_USED.push(`WARM_POOL_TARGET_COUNT=${process.env.WARM_POOL_TARGET_COUNT}`);
  if (process.env.WARM_POOL_HARD_TARGET_COUNT) ENV_USED.push(`WARM_POOL_HARD_TARGET_COUNT=${process.env.WARM_POOL_HARD_TARGET_COUNT}`);
  if (process.env.WARM_POOL_CONCURRENCY) ENV_USED.push(`WARM_POOL_CONCURRENCY=${process.env.WARM_POOL_CONCURRENCY}`);

  return {
    PORT, CORS_ORIGIN, ENV_USED,
    GEMINI_API_KEY, DIRECT_GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TUTOR_MODEL, GEMINI_TIMEOUT_MS,
    GRADING_MODEL, GRADING_THINKING_BUDGET, GRADING_MODE, GRADING_LIGHT_MODEL,
    GRADING_DEADLINE_MS, GRADING_CHUNK_TIMEOUT_MS, GRADING_CACHE_BUDGET_MS, GRADING_JOBS,
    HAS_REPLIT_PROXY, REPLIT_GEMINI_BASE_URL, REPLIT_GEMINI_API_KEY,
    HAS_ANTHROPIC_PROXY, REPLIT_ANTHROPIC_BASE_URL, REPLIT_ANTHROPIC_API_KEY,
    ANTHROPIC_TIMEOUT_MS,
    CLAUDE_MODEL_SONNET, CLAUDE_MODEL_HAIKU,
    STUB_MODE, ACTIVE_PROVIDER, HAS_DIRECT_KEY, IS_DEV,
    MAX_HISTORY_TURNS, TEACH_CACHE_TTL_MS,
    FEEDBACK_DIR, FEEDBACK_FILE,
    REPO_ROOT, VISUALS_DIR, MANIFEST_PATH,
    WARM_POOL_TOP_UP_INTERVAL_MS,
  };
}

module.exports = { resolveConfig, resolveGradingJobsSwitch, describeGradingJobsSwitch };
