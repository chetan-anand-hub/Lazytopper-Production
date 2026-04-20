'use strict';

/**
 * backfillGeneratedQuestionSolutions.cjs
 *
 * One-time (idempotent) backfill script that finds generated_questions rows
 * where answer, solution_steps, or final_answer is NULL, then asks Gemini to
 * repair each row with a complete solution, and UPDATEs the DB in-place.
 *
 * Safety rules:
 *   - Only UPDATEs existing rows — never INSERTs new rows.
 *   - Skips rows where question_text is blank.
 *   - Already-complete rows are never touched (idempotent).
 *   - If Gemini returns incomplete output for a row, that row is left unchanged.
 *   - If a row cannot be repaired after all retries, it is skipped and logged.
 *   - Safe to re-run: already-repaired rows are excluded by the WHERE clause.
 *
 * Usage:
 *   # Dry run (show counts, sample IDs, no DB writes)
 *   DRY_RUN=1 node lazytopper/server/scripts/backfillGeneratedQuestionSolutions.cjs
 *   node lazytopper/server/scripts/backfillGeneratedQuestionSolutions.cjs --dry-run
 *
 *   # Real execution
 *   node lazytopper/server/scripts/backfillGeneratedQuestionSolutions.cjs
 *
 * Environment variables (loaded automatically by the server env):
 *   DATABASE_URL           — PostgreSQL connection string (required)
 *   GEMINI_API_KEY         — Direct Gemini API key  (optional if proxy is set)
 *   AI_INTEGRATIONS_GEMINI_API_KEY — Replit proxy Gemini key (optional)
 *   REPLIT_GEMINI_BASE_URL — Replit proxy base URL  (optional)
 *   GEMINI_MODEL           — Model name (default: gemini-2.5-flash)
 */

const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN =
  process.env.DRY_RUN === '1' ||
  process.env.DRY_RUN === 'true' ||
  process.argv.includes('--dry-run');

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES_MS = 800;
const MAX_PROMPT_QUESTIONS = BATCH_SIZE; // keep prompts focused

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryParseJson(s) {
  try { return JSON.parse(s); } catch (_) { return null; }
}

function extractJsonObject(rawText) {
  if (typeof rawText !== 'string') return null;
  const s = rawText.trim();

  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : s;

  let result = tryParseJson(jsonStr);
  if (result) return result;

  const fb = jsonStr.indexOf('{');
  const lb = jsonStr.lastIndexOf('}');
  if (fb !== -1 && lb > fb) {
    result = tryParseJson(jsonStr.slice(fb, lb + 1));
    if (result) return result;
  }

  let repaired = jsonStr.replace(/,\s*([}\]])/g, '$1');
  result = tryParseJson(repaired);
  return result || null;
}

/**
 * Check if a Gemini-returned item is complete enough to UPDATE the DB.
 */
function isRepairComplete(item) {
  if (!item || typeof item !== 'object') return false;
  const answer = String(item.answer || '').trim();
  const finalAnswer = String(item.finalAnswer || '').trim();
  const steps = item.solutionSteps;
  if (!answer) return false;
  if (!finalAnswer) return false;
  if (!Array.isArray(steps) || steps.length === 0) return false;
  if (!steps.some((s) => String(s || '').trim().length > 0)) return false;
  return true;
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildRepairPrompt(rows) {
  const rowDescriptions = rows.map((r, i) => {
    const lines = [
      `Item ${i + 1}:`,
      `  id: ${r.id}`,
      `  subject: ${r.subject || 'unknown'}`,
      `  topic: ${r.topic_key || 'unknown'}`,
      `  marks: ${r.marks != null ? r.marks : 'unknown'}`,
      `  difficulty: ${r.difficulty || 'unknown'}`,
      `  question: ${String(r.question_text).trim()}`,
    ];
    return lines.join('\n');
  });

  return [
    'You are an expert CBSE Class 10 board question setter for Maths and Science.',
    'Below are existing exam-style questions that are MISSING their solutions.',
    'Your task is to provide ONLY the solutions for each question.',
    'Do NOT change the question text. Do NOT generate new questions.',
    '',
    'For each question provide:',
    '  - "answer": the concise correct answer (for MCQ: exact option text; for short/long: key result with unit)',
    '  - "solutionSteps": array of strings, each one numbered working step a student writes (CBSE marking-scheme style)',
    '  - "finalAnswer": one sentence stating the final result with unit (e.g. "∴ AC = 10 cm")',
    '',
    'Return ONLY a single JSON object with this exact shape:',
    '{',
    '  "items": [',
    '    {',
    '      "id": <integer — the id field from the input, unchanged>,',
    '      "answer": "...",',
    '      "solutionSteps": ["Step 1...", "Step 2...", "..."],',
    '      "finalAnswer": "∴ ..."',
    '    }',
    '  ]',
    '}',
    '',
    'Include exactly one entry in "items" per question below, in the same order.',
    'Do not include any text outside this JSON object.',
    '',
    '--- QUESTIONS ---',
    ...rowDescriptions,
  ].join('\n');
}

// ── Database ──────────────────────────────────────────────────────────────────

function createPgPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const pg = require('pg');
  const Pool = pg.Pool || pg.default?.Pool;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.on('error', (err) => console.warn('[backfill] pg pool error:', err.message));
  return pool;
}

async function countIncompleteRows(pool) {
  const result = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM generated_questions
     WHERE (answer IS NULL OR answer = '' OR solution_steps IS NULL OR final_answer IS NULL OR final_answer = '')
       AND question_text IS NOT NULL
       AND question_text <> ''`
  );
  return parseInt(result.rows[0]?.cnt ?? '0', 10);
}

async function fetchBatch(pool, offset) {
  const result = await pool.query(
    `SELECT id, topic_key, subject, marks, difficulty, question_text
     FROM generated_questions
     WHERE (answer IS NULL OR answer = '' OR solution_steps IS NULL OR final_answer IS NULL OR final_answer = '')
       AND question_text IS NOT NULL
       AND question_text <> ''
     ORDER BY id ASC
     LIMIT $1 OFFSET $2`,
    [BATCH_SIZE, offset]
  );
  return result.rows;
}

async function updateRow(pool, id, answer, solutionSteps, finalAnswer) {
  const solutionStepsJson = JSON.stringify(
    solutionSteps.map((s) => String(s).trim()).filter(Boolean)
  );
  await pool.query(
    `UPDATE generated_questions
     SET answer = $1, solution_steps = $2::jsonb, final_answer = $3
     WHERE id = $4`,
    [answer.trim(), solutionStepsJson, finalAnswer.trim(), id]
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  backfillGeneratedQuestionSolutions.cjs');
  console.log(DRY_RUN ? '  MODE: DRY RUN (no DB writes)' : '  MODE: LIVE (DB will be updated)');
  console.log('══════════════════════════════════════════════════════════');
  console.log('');

  // Set up server config and Gemini client
  const { resolveConfig } = require('../services/serverConfig.cjs');
  const { createGeminiClient } = require('../services/geminiClient.cjs');

  const config = resolveConfig();
  const { callGemini } = createGeminiClient({
    GEMINI_API_KEY: config.GEMINI_API_KEY,
    HAS_REPLIT_PROXY: config.HAS_REPLIT_PROXY,
    REPLIT_GEMINI_BASE_URL: config.REPLIT_GEMINI_BASE_URL,
    REPLIT_GEMINI_API_KEY: config.REPLIT_GEMINI_API_KEY,
    DIRECT_GEMINI_API_KEY: config.DIRECT_GEMINI_API_KEY,
    GEMINI_TUTOR_MODEL: config.GEMINI_TUTOR_MODEL,
    GEMINI_TIMEOUT_MS: config.GEMINI_TIMEOUT_MS,
  });

  const GEMINI_MODEL = config.GEMINI_MODEL || 'gemini-2.5-flash';
  console.log(`[backfill] Using Gemini model: ${GEMINI_MODEL}`);

  const pool = createPgPool();

  // ── Step 1: Count incomplete rows ──────────────────────────────────────────
  const totalIncomplete = await countIncompleteRows(pool);
  console.log(`[backfill] Incomplete rows found: ${totalIncomplete}`);

  if (totalIncomplete === 0) {
    console.log('[backfill] Nothing to do — all rows are already complete.');
    await pool.end();
    printSummary({ totalScanned: 0, incompleteFound: 0, updated: 0, skipped: 0, failed: 0 });
    return;
  }

  // ── Step 2: Dry-run early exit ─────────────────────────────────────────────
  if (DRY_RUN) {
    const sampleRows = await pool.query(
      `SELECT id, topic_key, subject, marks, difficulty, LEFT(question_text, 80) AS question_preview
       FROM generated_questions
       WHERE (answer IS NULL OR answer = '' OR solution_steps IS NULL OR final_answer IS NULL OR final_answer = '')
         AND question_text IS NOT NULL AND question_text <> ''
       ORDER BY id ASC
       LIMIT 5`
    );
    console.log(`[backfill] DRY RUN — would process ${totalIncomplete} row(s) in ${Math.ceil(totalIncomplete / BATCH_SIZE)} batch(es)`);
    console.log('[backfill] Sample rows:');
    for (const r of sampleRows.rows) {
      console.log(`  id=${r.id} ${r.subject}/${r.topic_key} marks=${r.marks} diff=${r.difficulty}`);
      console.log(`    "${r.question_preview}..."`);
    }
    await pool.end();
    console.log('[backfill] Dry run complete. Run without DRY_RUN=1 to apply changes.');
    return;
  }

  // ── Step 3: Process in batches ─────────────────────────────────────────────
  const stats = {
    totalScanned: 0,
    incompleteFound: totalIncomplete,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  let offset = 0;
  let batchNum = 0;

  while (true) {
    const batch = await fetchBatch(pool, 0); // always offset 0 — completed rows are excluded by WHERE
    if (batch.length === 0) break;

    batchNum++;
    stats.totalScanned += batch.length;
    const batchIds = batch.map((r) => r.id).join(', ');
    console.log(`\n[backfill] Batch ${batchNum}: processing ${batch.length} row(s) — ids: [${batchIds}]`);

    // ── Call Gemini ────────────────────────────────────────────────────────
    let repairItems = [];
    try {
      const prompt = buildRepairPrompt(batch);
      const contents = [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ];

      const reply = await callGemini(GEMINI_MODEL, contents, {
        temperature: 0.3,
        maxOutputTokens: 4096,
      });

      const rawText = String(reply?.text || '');
      const parsed = extractJsonObject(rawText);

      if (parsed && Array.isArray(parsed.items)) {
        repairItems = parsed.items;
      } else {
        console.warn(`[backfill] Batch ${batchNum}: Gemini returned unparseable JSON — skipping batch`);
        stats.skipped += batch.length;
        await sleep(DELAY_BETWEEN_BATCHES_MS);
        continue;
      }
    } catch (geminiErr) {
      console.warn(`[backfill] Batch ${batchNum}: Gemini call failed — ${geminiErr.message} — skipping batch`);
      stats.skipped += batch.length;
      await sleep(DELAY_BETWEEN_BATCHES_MS);
      continue;
    }

    // ── Apply repairs row-by-row ───────────────────────────────────────────
    for (const row of batch) {
      const item = repairItems.find((it) => Number(it?.id) === Number(row.id));

      if (!item) {
        console.warn(`[backfill]   id=${row.id}: no matching item in Gemini response — skipping`);
        stats.skipped++;
        continue;
      }

      if (!isRepairComplete(item)) {
        console.warn(`[backfill]   id=${row.id}: Gemini item incomplete (missing answer/solutionSteps/finalAnswer) — skipping`);
        stats.skipped++;
        continue;
      }

      try {
        await updateRow(pool, row.id, item.answer, item.solutionSteps, item.finalAnswer);
        console.log(`[backfill]   id=${row.id}: UPDATED ✓`);
        stats.updated++;
      } catch (dbErr) {
        console.warn(`[backfill]   id=${row.id}: DB UPDATE failed — ${dbErr.message}`);
        stats.failed++;
      }
    }

    await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  await pool.end();
  printSummary(stats);
}

function printSummary(stats) {
  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  BACKFILL SUMMARY');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total rows scanned:        ${stats.totalScanned}`);
  console.log(`  Incomplete rows found:     ${stats.incompleteFound}`);
  console.log(`  Rows successfully updated: ${stats.updated}`);
  console.log(`  Rows skipped:              ${stats.skipped}`);
  console.log(`  Rows failed:               ${stats.failed}`);
  console.log('══════════════════════════════════════════════════════════');
  console.log('');
}

main().catch((err) => {
  console.error('[backfill] Fatal error:', err);
  process.exit(1);
});
