/**
 * warmQuestionPool.cjs
 *
 * Pre-fills the generated_questions pool for all CBSE Class 10 Maths and
 * Science chapter × marks × difficulty combinations so students never wait
 * for AI on the first "More like this" request.
 *
 * Topic keys are loaded dynamically from the canonical TypeScript source files
 * (class10TopicRegistry.ts and class10ScienceTopicTrends.ts). This ensures
 * coverage stays complete as chapters are added or removed without any manual
 * sync of hardcoded arrays.  Hardcoded lists are only used as a last-resort
 * fallback when the TS modules cannot be loaded.
 *
 * Usage (standalone):
 *   node lazytopper/server/services/warmQuestionPool.cjs
 *
 * Or require() it and call runWarmPool() programmatically (e.g. at server start).
 */

'use strict';

const path = require('path');
const { isCompleteVariant } = require('./questionCompleteness.cjs');
const { ensureGeneratedQuestionsTable } = require('../db/ensureGeneratedQuestionsTable.cjs');

// ---------------------------------------------------------------------------
// Fallback chapter lists (used only when canonical TS files cannot be loaded)
// ---------------------------------------------------------------------------
const FALLBACK_MATHS_TOPIC_KEYS = [
  'Real Numbers',
  'Polynomials',
  'Pair of Linear Equations',
  'Quadratic Equations',
  'Arithmetic Progression',
  'Triangles',
  'Coordinate Geometry',
  'Trigonometry',
  'Circles',
  'Areas Related to Circles',
  'Surface Areas and Volumes',
  'Statistics',
  'Probability',
];

const FALLBACK_SCIENCE_TOPIC_KEYS = [
  'ChemicalReactions',
  'AcidsBasesSalts',
  'MetalsNonMetals',
  'CarbonCompounds',
  'LifeProcesses',
  'ControlAndCoordination',
  'Reproduction',
  'HeredityEvolution',
  'Light',
  'HumanEyeAndColourfulWorld',
  'Electricity',
  'MagneticEffects',
];

/**
 * Load topic keys from canonical TypeScript source files.
 * Falls back to hardcoded arrays if the TS modules cannot be required (e.g.
 * TypeScript transpiler not yet registered, or standalone usage without setup).
 *
 * @returns {{ mathsTopicKeys: string[], scienceTopicKeys: string[] }}
 */
function loadTopicKeys() {
  const dataDir = path.resolve(__dirname, '../../src/data');

  let mathsTopicKeys = null;
  try {
    const registry = require(path.join(dataDir, 'class10TopicRegistry.ts'));
    const list = registry.class10TopicRegistry;
    if (Array.isArray(list) && list.length > 0) {
      mathsTopicKeys = list.map((t) => t.topicKey).filter(Boolean);
    }
  } catch (_) {
    // TS transpiler not registered or file missing – use fallback below
  }

  let scienceTopicKeys = null;
  try {
    const scienceMod = require(path.join(dataDir, 'class10ScienceTopicTrends.ts'));
    const trends = scienceMod.class10ScienceTopicTrends;
    if (trends && trends.topics && typeof trends.topics === 'object') {
      scienceTopicKeys = Object.keys(trends.topics).filter(Boolean);
    }
  } catch (_) {
    // TS transpiler not registered or file missing – use fallback below
  }

  const resolvedMaths = mathsTopicKeys || FALLBACK_MATHS_TOPIC_KEYS;
  const resolvedScience = scienceTopicKeys || FALLBACK_SCIENCE_TOPIC_KEYS;

  if (!mathsTopicKeys) {
    console.warn('[warm] Could not load class10TopicRegistry.ts — using hardcoded Maths topic list.');
  }
  if (!scienceTopicKeys) {
    console.warn('[warm] Could not load class10ScienceTopicTrends.ts — using hardcoded Science topic list.');
  }

  return { mathsTopicKeys: resolvedMaths, scienceTopicKeys: resolvedScience };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MARKS_VALUES = [1, 2, 3, 5];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
// Minimum number of questions that must exist in the pool for a combo before it
// is considered "full".  Override with WARM_POOL_TARGET_COUNT env var.
const TARGET_COUNT = Math.max(1, Number(process.env.WARM_POOL_TARGET_COUNT || 20) || 20);
// Hard questions are scarcer in static banks so we pre-generate more of them.
// Override with WARM_POOL_HARD_TARGET_COUNT env var.
const HARD_TARGET_COUNT = Math.max(TARGET_COUNT, Number(process.env.WARM_POOL_HARD_TARGET_COUNT || 20) || 20);

// Number of combinations to process in parallel during a warm run.
// Keep this at 5 or below on Gemini free-tier to avoid rate-limit errors.
// Override with WARM_POOL_CONCURRENCY env var.
const CONCURRENCY = Math.max(1, Number(process.env.WARM_POOL_CONCURRENCY || 5) || 5);

/** Return the fill target for a given difficulty level. */
function targetForDifficulty(difficulty) {
  return String(difficulty).toLowerCase() === 'hard' ? HARD_TARGET_COUNT : TARGET_COUNT;
}

const QUESTIONS_PER_CALL = 5;
const MAX_RETRIES_PER_COMBO = 3;

// ---------------------------------------------------------------------------
// Boot gates — the ONLY thing standing between a deploy and an unattended
// Gemini generation run.
// ---------------------------------------------------------------------------
//
// ★★ WHAT WENT WRONG ON 2026-08-05, AND WHY THIS IS A NEW VARIABLE.
//
// `WARM_POOL_TOP_UP_INTERVAL_MS=0` was set FIRST, deliberately, as the brake.
// It reads as "off" — and it governs the RECURRING top-up ONLY. The one-time
// STARTUP pre-warm was never gated by it, was never gated by anything, and
// started a full chapter x marks x difficulty generation run within a minute
// of the deploy. The boot log said
//
//     [warm] Recurring pool top-up disabled (WARM_POOL_TOP_UP_INTERVAL_MS=0).
//     [warm] Starting pool warm run: ... combinations
//
// — it announced one gate holding while another fired. Widening the meaning of
// WARM_POOL_TOP_UP_INTERVAL_MS would have made the SAME name mean two
// different scopes depending on which deploy you were reading, and would have
// left an operator who has read the old logs believing `=0` had always meant
// "nothing runs". A variable that misleads is worse than one that does not
// exist, so the arming decision moves to a NEW, positively-phrased, default-OFF
// switch and the old variable keeps exactly the meaning it already had.
//
//   WARM_POOL_ENABLED            master arm for ALL unattended generation.
//                                UNSET / empty / 0 / false  =>  nothing runs.
//   WARM_POOL_TOP_UP_INTERVAL_MS second, independent brake on the recurring
//                                job only. Still means what it always meant.
//
// Both must be satisfied for the recurring job; only the master for the
// startup pre-warm. Neither can open the other.

/** One-time startup pre-warm delay, unchanged from the pre-gate behaviour. */
const STARTUP_PREWARM_DELAY_MS = 60_000;

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on', 'enabled']);

/** Explicit positive opt-in. Anything not on the allowlist is OFF. */
function isTruthyFlag(value) {
  return TRUTHY_VALUES.has(String(value ?? '').trim().toLowerCase());
}

/**
 * Decide, and be able to SAY, what is armed at boot.
 *
 * @param {{ env?: object, stubMode?: boolean, topUpIntervalMs?: number }} [options]
 * @returns {{
 *   optIn: boolean, databaseConfigured: boolean, stubMode: boolean,
 *   startupPrewarmArmed: boolean, recurringTopUpArmed: boolean,
 *   adminEndpointArmed: boolean, topUpIntervalMs: number,
 *   startupDelayMs: number, logLines: string[]
 * }}
 */
function resolveWarmPoolGates(options = {}) {
  const env = options.env || process.env;
  const stubMode = Boolean(options.stubMode);
  const topUpIntervalMs = Math.max(0, Number(options.topUpIntervalMs) || 0);

  const rawEnabled = env.WARM_POOL_ENABLED;
  const optIn = isTruthyFlag(rawEnabled);
  const databaseConfigured = Boolean(env.DATABASE_URL);
  const adminEndpointArmed = Boolean(env.WARM_POOL_ADMIN_SECRET);

  const startupPrewarmArmed = optIn && databaseConfigured && !stubMode;
  const recurringTopUpArmed = startupPrewarmArmed && topUpIntervalMs > 0;

  // The reason a path is closed, in the order the code checks it, so the log
  // never says "disabled" without saying which condition did it.
  let blockedBy = null;
  if (!optIn) blockedBy = 'WARM_POOL_ENABLED is not set to a truthy value (1/true/yes/on)';
  else if (stubMode) blockedBy = 'STUB_MODE is on (no Gemini credentials configured)';
  else if (!databaseConfigured) blockedBy = 'DATABASE_URL is not set';

  const rawLabel = rawEnabled === undefined || rawEnabled === null || rawEnabled === ''
    ? '(unset)'
    : String(rawEnabled);

  const logLines = [
    `[warm] gate WARM_POOL_ENABLED=${rawLabel} | DATABASE_URL=${databaseConfigured ? 'set' : 'unset'} | STUB_MODE=${stubMode ? 'on' : 'off'}`,
    `[warm] path startup-prewarm (one-time, ${STARTUP_PREWARM_DELAY_MS} ms after boot, full chapter x marks x difficulty Gemini generation run): ${
      startupPrewarmArmed ? `ARMED — WARM_POOL_ENABLED=${rawLabel}` : `DISABLED — ${blockedBy}`
    }`,
    `[warm] path recurring-top-up (WARM_POOL_TOP_UP_INTERVAL_MS=${topUpIntervalMs}): ${
      recurringTopUpArmed
        ? `ARMED — every ${topUpIntervalMs} ms`
        : `DISABLED — ${blockedBy || 'WARM_POOL_TOP_UP_INTERVAL_MS=0'}`
    }`,
    `[warm] path admin-endpoint POST /api/admin/warm-question-pool: ${
      adminEndpointArmed
        ? 'ARMED — WARM_POOL_ADMIN_SECRET is set; an authenticated admin request can start a full run'
        : 'DISABLED — WARM_POOL_ADMIN_SECRET is not set (endpoint answers 503)'
    }`,
  ];

  const armedPaths = [
    startupPrewarmArmed ? 'startup-prewarm' : null,
    recurringTopUpArmed ? 'recurring-top-up' : null,
  ].filter(Boolean);

  logLines.push(
    armedPaths.length === 0
      ? '[warm] no unattended question generation is scheduled'
      : `[warm] AI SPEND WARNING: unattended question generation is scheduled: ${armedPaths.join(', ')}`
  );

  return {
    optIn,
    databaseConfigured,
    stubMode,
    startupPrewarmArmed,
    recurringTopUpArmed,
    adminEndpointArmed,
    topUpIntervalMs,
    startupDelayMs: STARTUP_PREWARM_DELAY_MS,
    logLines,
  };
}

/**
 * Arm the timers the gates permit — and NOTHING when they permit nothing.
 *
 * Every dependency is injectable so the boot behaviour can be exercised for
 * real (real gate resolution, real runner, counted Gemini calls) without
 * standing up an HTTP server.
 *
 * @returns {{ startupTimer: any, topUpTimer: any }}
 */
function scheduleWarmPool(options = {}) {
  const {
    gates,
    runWarmPool,
    isRunning = () => false,
    setRunning = () => {},
    log = console.log,
    logError = console.error,
    setTimeoutFn = setTimeout,
    setIntervalFn = setInterval,
  } = options;

  const timers = { startupTimer: null, topUpTimer: null };
  if (!gates) return timers;

  const launch = (label) => {
    if (isRunning()) {
      log(`[warm] ${label} skipped — a warm run is already in progress.`);
      return;
    }
    log(`[warm] ${label} starting a pool warm run now.`);
    setRunning(true);
    Promise.resolve()
      .then(() => runWarmPool({ delayMs: 400 }))
      .catch((e) => logError(`[warm] ${label} runWarmPool error:`, e && e.message))
      .finally(() => setRunning(false));
  };

  if (gates.startupPrewarmArmed) {
    timers.startupTimer = setTimeoutFn(
      () => launch('startup-prewarm'),
      gates.startupDelayMs ?? STARTUP_PREWARM_DELAY_MS
    );
  }

  if (gates.recurringTopUpArmed) {
    timers.topUpTimer = setIntervalFn(() => launch('recurring-top-up'), gates.topUpIntervalMs);
    if (timers.topUpTimer && typeof timers.topUpTimer.unref === 'function') {
      timers.topUpTimer.unref();
    }
  }

  return timers;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------
function buildWarmPrompt(topicKey, subject, marks, difficulty) {
  const lines = [
    `We are building an exam-style practice set for CBSE Class 10 ${subject}.`,
    `Topic (chapter): ${topicKey}.`,
    '',
    `Generate ${QUESTIONS_PER_CALL} NEW CBSE board-style questions for this topic where:`,
    `- Each question is worth exactly ${marks} mark${marks !== 1 ? 's' : ''}.`,
    `- Every question MUST have difficulty: "${difficulty}". Do NOT vary difficulty.`,
    `  Difficulty rubric (CBSE Class 10 board standard):`,
    `  Easy: 1-mark MCQ or Assertion-Reasoning. Direct recall, single formula, plug-and-chug. Student only needs to remember a definition or fact. No multi-step working required.`,
    `  Medium: 2–3 marks. 2–3 steps of working. Student must apply a concept to a slightly varied scenario. Needs understanding beyond rote recall.`,
    `  Hard: 5 marks. Multi-step proof, derivation, or novel real-world application. Requires synthesis across two or more concepts. No single-step path to the answer. Student must plan the full solution strategy.`,
    '- Questions must be syllabus-aligned for CBSE Class 10.',
    '- Change numbers, scenarios, or wording so each variant is distinct.',
    '- Each variant must test a meaningfully different aspect or scenario.',
    '',
    'For EACH question you MUST also provide:',
    '  - "answer": the concise correct answer (for MCQ: the exact option text; for short/long: key result with unit)',
    '  - "solutionSteps": array of strings, each being one numbered working step a student writes (CBSE marking-scheme style)',
    '  - "finalAnswer": one sentence stating the final result with unit (e.g. "∴ AC = 10 cm")',
    '',
    'Return ONLY a single JSON object with this exact shape:',
    '{',
    '  "questions": [',
    '    {',
    '      "questionText": "...",',
    `      "marks": ${marks},`,
    `      "difficulty": "${difficulty}",`,
    '      "bloomSkill": "Remembering | Understanding | Applying | Analysing | Evaluating | Creating",',
    '      "answer": "...",',
    '      "solutionSteps": ["Step 1...", "Step 2...", "..."],',
    '      "finalAnswer": "∴ ..."',
    '    }',
    '  ]',
    '}',
    '',
    'Do not include any text outside this JSON.',
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// JSON extraction (mirrors logic in moreLikeThis.cjs)
// ---------------------------------------------------------------------------
function extractQuestionsFromReply(replyText) {
  if (!replyText) return [];
  const tryParse = (s) => { try { return JSON.parse(s); } catch (_) { return null; } };

  const fenceMatch = replyText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : replyText.trim();

  const repairAndParse = (s) => {
    let result = tryParse(s);
    if (result) return result;
    let repaired = s.replace(/,\s*([}\]])/g, '$1');
    result = tryParse(repaired);
    if (result) return result;
    const openBraces = (s.match(/\{/g) || []).length;
    const closeBraces = (s.match(/\}/g) || []).length;
    const openBrackets = (s.match(/\[/g) || []).length;
    const closeBrackets = (s.match(/\]/g) || []).length;
    let suffix = '';
    for (let i = 0; i < openBraces - closeBraces; i++) suffix += '}';
    for (let i = 0; i < openBrackets - closeBrackets; i++) suffix += ']';
    if (suffix) {
      let truncated = repaired.replace(/,\s*$/, '');
      const lastComma = truncated.lastIndexOf(',');
      const lastCloseBrace = truncated.lastIndexOf('}');
      if (lastComma > lastCloseBrace) truncated = truncated.slice(0, lastComma);
      result = tryParse(truncated + suffix);
      if (result) return result;
    }
    return null;
  };

  let obj = repairAndParse(jsonStr);
  if (!obj) {
    const fb = jsonStr.indexOf('{');
    const lb = jsonStr.lastIndexOf('}');
    if (fb !== -1 && lb > fb) obj = repairAndParse(jsonStr.slice(fb, lb + 1));
  }

  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === 'object' && Array.isArray(obj.questions)) return obj.questions;
  return [];
}

// ---------------------------------------------------------------------------
// Pool helpers
// ---------------------------------------------------------------------------
async function countInPool(pgPool, topicKey, subject, marks, difficulty) {
  try {
    const result = await pgPool.query(
      `SELECT COUNT(*) AS cnt
       FROM generated_questions
       WHERE topic_key  = $1
         AND subject    = $2
         AND marks      = $3
         AND difficulty = $4`,
      [
        String(topicKey).toLowerCase().trim(),
        String(subject).toLowerCase().trim(),
        Number(marks),
        String(difficulty).toLowerCase().trim(),
      ]
    );
    return parseInt(result.rows[0]?.cnt ?? '0', 10);
  } catch (e) {
    console.warn('[warm] countInPool error:', e.message);
    return 0;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Factory – call once with shared deps from the server.
 *
 * @param {{ callGemini: Function, saveToPool: Function, GEMINI_MODEL: string }} deps
 */
function createWarmPoolRunner(deps) {
  const { callGemini, saveToPool, GEMINI_MODEL } = deps;
  // Test seam: lets a suite drive the REAL runner over a fake Postgres and
  // count the Gemini calls it makes. Production passes nothing and gets pg.
  const createPgPool = deps.createPgPool || null;
  const ensureSchema = deps.ensureSchema || ensureGeneratedQuestionsTable;

  async function getPgPool() {
    if (createPgPool) return createPgPool();
    if (!process.env.DATABASE_URL) return null;
    try {
      const pg = require('pg');
      const Pool = pg.Pool || pg.default?.Pool;
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      pool.on('error', (err) => console.warn('[warm] pg pool error:', err.message));
      return pool;
    } catch (e) {
      console.warn('[warm] pg unavailable:', e.message);
      return null;
    }
  }

  /**
   * Perform one Gemini call and return parsed variants array.
   */
  async function generateVariants(topicKey, subject, marks, difficulty) {
    const userPrompt = buildWarmPrompt(topicKey, subject, marks, difficulty);
    const systemPrompt =
      'You are an expert CBSE Class 10 board question setter for Maths and Science. ' +
      'You strictly follow the CBSE exam blueprint, marks scheme and language style. ' +
      'You always generate high-quality board-style questions that are safe and syllabus-aligned.';

    const contents = [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
    ];

    const reply = await callGemini(GEMINI_MODEL, contents, {
      temperature: 0.7,
      maxOutputTokens: 4096,
    });

    const rawQuestions = extractQuestionsFromReply(String(reply?.text || ''));
    const mapped = rawQuestions
      .filter((q) => q && (q.questionText || q.text))
      .map((q) => ({
        text: String(q.questionText || q.text || '').trim(),
        marks,
        difficulty,
        bloomSkill: q.bloomSkill || null,
        answer: String(q.answer || '').trim() || null,
        solutionSteps: Array.isArray(q.solutionSteps) ? q.solutionSteps.map(s => String(s).trim()).filter(Boolean) : null,
        finalAnswer: String(q.finalAnswer || '').trim() || null,
      }));
    const complete = mapped.filter(isCompleteVariant);
    if (complete.length < mapped.length) {
      console.warn(`[warm] generateVariants: dropped ${mapped.length - complete.length} incomplete variant(s) for topic=${topicKey} marks=${marks} diff=${difficulty}`);
    }
    return complete;
  }

  /**
   * Warm a single (topicKey, subject, marks, difficulty) combo.
   *
   * Retries generation (up to MAX_RETRIES_PER_COMBO times) until the pool
   * reaches TARGET_COUNT for this combo, or until retries are exhausted.
   *
   * Returns the total number of questions newly saved across all retry attempts.
   */
  async function warmOne(pgPool, topicKey, subject, marks, difficulty) {
    const target = targetForDifficulty(difficulty);
    const initialCount = await countInPool(pgPool, topicKey, subject, marks, difficulty);
    if (initialCount >= target) {
      console.info(`[warm] SKIP  ${topicKey} ${subject} marks=${marks} diff=${difficulty} (${initialCount} already in pool)`);
      return 0;
    }

    let totalSaved = 0;

    for (let attempt = 1; attempt <= MAX_RETRIES_PER_COMBO; attempt++) {
      const currentCount = await countInPool(pgPool, topicKey, subject, marks, difficulty);
      if (currentCount >= target) break;

      let variants;
      try {
        variants = await generateVariants(topicKey, subject, marks, difficulty);
      } catch (e) {
        console.warn(`[warm] GEMINI ERROR (attempt ${attempt}) ${topicKey} ${subject} marks=${marks} diff=${difficulty}: ${e.message}`);
        break;
      }

      if (variants.length === 0) {
        console.warn(`[warm] NO VARIANTS parsed (attempt ${attempt}) ${topicKey} ${subject} marks=${marks} diff=${difficulty}`);
        break;
      }

      await saveToPool(topicKey, subject, marks, difficulty, variants);
      totalSaved += variants.length;
      console.info(`[warm] ${topicKey} ${subject} marks=${marks} diff=${difficulty} → ${variants.length} saved (attempt ${attempt})`);
    }

    const finalCount = await countInPool(pgPool, topicKey, subject, marks, difficulty);
    if (finalCount < target) {
      console.warn(`[warm] PARTIAL ${topicKey} ${subject} marks=${marks} diff=${difficulty}: pool has ${finalCount}/${target} after ${MAX_RETRIES_PER_COMBO} attempt(s)`);
    }

    return totalSaved;
  }

  /**
   * Run a full warm pass over all chapter × marks × difficulty combinations.
   *
   * Topic keys are loaded dynamically from the canonical TS source files so
   * coverage automatically includes any future chapters added there.
   *
   * @param {{ delayMs?: number, onProgress?: Function }} [options]
   * @returns {Promise<{ total: number, skipped: number, saved: number, errors: number }>}
   */
  async function runWarmPool(options = {}) {
    const { delayMs = 300, onProgress } = options;

    const pgPool = await getPgPool();
    if (!pgPool) {
      console.warn('[warm] No DATABASE_URL — aborting warm run.');
      return { total: 0, skipped: 0, saved: 0, errors: 0 };
    }

    // The table must exist before the first countInPool, or every combination
    // reports 0 in pool and the run generates the whole bank from scratch.
    // DDL only — this makes no Gemini call and schedules nothing.
    await ensureSchema(pgPool);

    // `topicKeys` is a test seam: production passes nothing and gets the
    // canonical registries.
    const { mathsTopicKeys, scienceTopicKeys } = options.topicKeys || loadTopicKeys();

    const combos = [];
    for (const topicKey of mathsTopicKeys) {
      for (const marks of MARKS_VALUES) {
        for (const difficulty of DIFFICULTIES) {
          combos.push({ topicKey, subject: 'maths', marks, difficulty });
        }
      }
    }
    for (const topicKey of scienceTopicKeys) {
      for (const marks of MARKS_VALUES) {
        for (const difficulty of DIFFICULTIES) {
          combos.push({ topicKey, subject: 'science', marks, difficulty });
        }
      }
    }

    const total = combos.length;
    let skipped = 0;
    let saved = 0;
    let errors = 0;
    let completed = 0;

    console.info(
      `[warm] Starting pool warm run: ${total} combinations ` +
      `(${mathsTopicKeys.length} maths + ${scienceTopicKeys.length} science chapters ` +
      `× ${MARKS_VALUES.length} marks × ${DIFFICULTIES.length} difficulties) ` +
      `concurrency=${CONCURRENCY}`
    );

    // Process combos in parallel batches of CONCURRENCY.
    // Promise.allSettled ensures one failing combo does not abort the whole batch.
    for (let batchStart = 0; batchStart < combos.length; batchStart += CONCURRENCY) {
      const batch = combos.slice(batchStart, batchStart + CONCURRENCY);

      const results = await Promise.allSettled(
        batch.map(async ({ topicKey, subject, marks, difficulty }, workerIndex) => {
          // Base delay + small per-worker jitter (0–200 ms) to spread burst within the batch.
          if (delayMs > 0 || workerIndex > 0) {
            await sleep(delayMs + workerIndex * 50 + Math.floor(Math.random() * 150));
          }
          const count = await warmOne(pgPool, topicKey, subject, marks, difficulty);
          return { topicKey, subject, marks, difficulty, count };
        })
      );

      for (const result of results) {
        completed++;
        if (result.status === 'fulfilled') {
          const { topicKey, subject, marks, difficulty, count } = result.value;
          if (count === 0) {
            skipped++;
          } else {
            saved += count;
          }
          if (onProgress) {
            onProgress({ index: completed, total, topicKey, subject, marks, difficulty });
          }
        } else {
          errors++;
          console.warn(`[warm] ERROR in batch: ${result.reason && result.reason.message}`);
          if (onProgress) {
            onProgress({ index: completed, total });
          }
        }
      }
    }

    try { await pgPool.end(); } catch (_) {}

    console.info(
      `[warm] Pool warm run complete: ${total} combos, ${saved} questions saved, ` +
      `${skipped} skipped, ${errors} errors`
    );
    return { total, skipped, saved, errors };
  }

  return { runWarmPool };
}

module.exports = {
  createWarmPoolRunner,
  loadTopicKeys,
  MARKS_VALUES,
  DIFFICULTIES,
  resolveWarmPoolGates,
  scheduleWarmPool,
  isTruthyFlag,
  STARTUP_PREWARM_DELAY_MS,
};

// ---------------------------------------------------------------------------
// Standalone mode: node warmQuestionPool.cjs
// ---------------------------------------------------------------------------
//
// DIRECT GEMINI KEY (bypass Replit proxy, pay Google at cost):
//   AI_PROVIDER=gemini API_KEY=<your-google-api-key> node warmQuestionPool.cjs
//
// This is recommended for bulk warm runs where token cost matters.
// Without these vars the script uses the Replit AI proxy (same Gemini model,
// but routed through Replit's billing at a small markup).
//
// Optional tuning env vars:
//   WARM_POOL_TARGET_COUNT      — questions per easy/medium combo (default 20)
//   WARM_POOL_HARD_TARGET_COUNT — questions per hard combo       (default 20)
//   WARM_POOL_CONCURRENCY       — parallel combos per batch      (default 5)
//
if (require.main === module) {
  // Set up TypeScript transpilation so we can require .ts files directly
  const fs = require('fs');
  let ts;
  try { ts = require('typescript'); } catch (_) { ts = null; }
  if (ts) {
    require.extensions['.ts'] = (module, filename) => {
      const source = fs.readFileSync(filename, 'utf8');
      const transpiled = ts.transpileModule(source, {
        compilerOptions: { module: 'CommonJS', target: 'ES2020', esModuleInterop: true },
        fileName: path.basename(filename),
      });
      module._compile(transpiled.outputText, filename);
    };
  }

  (async () => {
    const { resolveConfig } = require('./serverConfig.cjs');
    const { createGeminiClient } = require('./geminiClient.cjs');
    const { saveToPool } = require('./generatedQuestionPool.cjs');

    const config = resolveConfig();
    const geminiMod = createGeminiClient({
      GEMINI_API_KEY: config.GEMINI_API_KEY,
      HAS_REPLIT_PROXY: config.HAS_REPLIT_PROXY,
      REPLIT_GEMINI_BASE_URL: config.REPLIT_GEMINI_BASE_URL,
      REPLIT_GEMINI_API_KEY: config.REPLIT_GEMINI_API_KEY,
      DIRECT_GEMINI_API_KEY: config.DIRECT_GEMINI_API_KEY,
      GEMINI_TUTOR_MODEL: config.GEMINI_TUTOR_MODEL,
      GEMINI_TIMEOUT_MS: config.GEMINI_TIMEOUT_MS,
    });

    const { runWarmPool } = createWarmPoolRunner({
      callGemini: geminiMod.callGemini,
      saveToPool,
      GEMINI_MODEL: config.GEMINI_MODEL,
    });

    const result = await runWarmPool({ delayMs: 500 });
    console.log('[warm] Final result:', result);
    process.exit(0);
  })().catch((e) => {
    console.error('[warm] Fatal error:', e);
    process.exit(1);
  });
}
