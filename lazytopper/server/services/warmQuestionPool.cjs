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
const TARGET_COUNT = Math.max(1, Number(process.env.WARM_POOL_TARGET_COUNT || 5) || 5);
// Hard questions are scarcer in static banks so we pre-generate more of them.
// Override with WARM_POOL_HARD_TARGET_COUNT env var.
const HARD_TARGET_COUNT = Math.max(TARGET_COUNT, Number(process.env.WARM_POOL_HARD_TARGET_COUNT || 10) || 10);

/** Return the fill target for a given difficulty level. */
function targetForDifficulty(difficulty) {
  return String(difficulty).toLowerCase() === 'hard' ? HARD_TARGET_COUNT : TARGET_COUNT;
}

const QUESTIONS_PER_CALL = 5;
const MAX_RETRIES_PER_COMBO = 3;

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

  async function getPgPool() {
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
    return rawQuestions
      .filter((q) => q && (q.questionText || q.text))
      .map((q) => ({
        text: String(q.questionText || q.text || '').trim(),
        marks,
        difficulty,
        bloomSkill: q.bloomSkill || null,
        answer: String(q.answer || '').trim() || null,
        solutionSteps: Array.isArray(q.solutionSteps) ? q.solutionSteps.map(s => String(s).trim()).filter(Boolean) : null,
        finalAnswer: String(q.finalAnswer || '').trim() || null,
      }))
      .filter((v) => v.text.length > 0);
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

    const { mathsTopicKeys, scienceTopicKeys } = loadTopicKeys();

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

    console.info(
      `[warm] Starting pool warm run: ${total} combinations ` +
      `(${mathsTopicKeys.length} maths + ${scienceTopicKeys.length} science chapters ` +
      `× ${MARKS_VALUES.length} marks × ${DIFFICULTIES.length} difficulties)`
    );

    for (let i = 0; i < combos.length; i++) {
      const { topicKey, subject, marks, difficulty } = combos[i];
      try {
        const count = await warmOne(pgPool, topicKey, subject, marks, difficulty);
        if (count === 0) {
          skipped++;
        } else {
          saved += count;
        }
      } catch (e) {
        errors++;
        console.warn(`[warm] ERROR ${topicKey} ${subject} marks=${marks} diff=${difficulty}: ${e.message}`);
      }

      if (onProgress) {
        onProgress({ index: i + 1, total, topicKey, subject, marks, difficulty });
      }

      if (delayMs > 0 && i < combos.length - 1) {
        await sleep(delayMs);
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

module.exports = { createWarmPoolRunner, loadTopicKeys, MARKS_VALUES, DIFFICULTIES };

// ---------------------------------------------------------------------------
// Standalone mode: node warmQuestionPool.cjs
// ---------------------------------------------------------------------------
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
